-- White Clean Core v1 Preview Database Contract payment lock correction.
-- Approved target: isolated Staging Supabase project rpnwssqvurpdennpzplx only.
-- This migration does not unlock Preview writes or provider calls.
--
-- PostgreSQL rejects FOR UPDATE on the previous outer query because it joined
-- an aggregate subquery. Lock the affected variant rows directly and in stable
-- primary-key order before applying the grouped inventory effects.

create or replace function public.reconcile_payment_attempt_v1(
  p_order_id uuid,
  p_attempt_id uuid,
  p_bill_code text,
  p_status text,
  p_transaction jsonb
)
returns table(payment_status text, order_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  payment_row public.payments%rowtype;
  order_row public.orders%rowtype;
  inventory_effect record;
  normalized_status text := lower(btrim(coalesce(p_status, '')));
  resulting_payment text;
  transaction_hash text;
  transaction_identity text;
  transaction_amount numeric;
  requires_review boolean := false;
  was_successful boolean;
begin
  perform private.require_preview_service_role_v1();
  if p_order_id is null or p_attempt_id is null or nullif(btrim(p_bill_code), '') is null then
    raise exception 'Exact payment attempt reference required';
  end if;
  if normalized_status not in ('pending', 'failed', 'successful') then
    raise exception 'Unknown payment status';
  end if;
  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then
    raise exception 'Verified provider transaction required';
  end if;

  select * into payment_row
  from public.payments
  where id = p_attempt_id
  for update;
  if not found then
    raise exception 'Payment attempt not found';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if payment_row.order_id <> order_row.id
     or payment_row.user_id is null
     or payment_row.user_id <> order_row.user_id
     or payment_row.gateway <> 'toyyibpay'
     or payment_row.gateway_reference <> btrim(p_bill_code)
     or payment_row.currency <> 'MYR'
     or order_row.currency <> 'MYR'
     or round(payment_row.amount, 2) <> round(order_row.grand_total, 2) then
    raise exception 'Payment attempt association, amount, or currency conflicts with the order';
  end if;

  if coalesce(p_transaction->>'billExternalReferenceNo', '') <> order_row.id::text then
    raise exception 'Provider transaction order reference conflicts';
  end if;
  if nullif(p_transaction->>'billCode', '') is not null
     and p_transaction->>'billCode' <> payment_row.gateway_reference then
    raise exception 'Provider transaction bill reference conflicts';
  end if;
  begin
    transaction_amount := (p_transaction->>'billpaymentAmount')::numeric;
  exception when others then
    raise exception 'Provider transaction amount is invalid';
  end;
  if transaction_amount is null
     or round(transaction_amount, 2) <> round(payment_row.amount, 2) then
    raise exception 'Provider transaction amount conflicts';
  end if;
  if (p_transaction->>'billpaymentStatus' = '1' and normalized_status <> 'successful')
     or (p_transaction->>'billpaymentStatus' = '3' and normalized_status <> 'failed')
     or (p_transaction->>'billpaymentStatus' in ('2', '4') and normalized_status <> 'pending')
     or coalesce(p_transaction->>'billpaymentStatus', '') not in ('1', '2', '3', '4') then
    raise exception 'Provider transaction status conflicts';
  end if;

  transaction_hash := private.preview_digest_v1(jsonb_build_object(
    'gateway', payment_row.gateway,
    'gateway_reference', payment_row.gateway_reference,
    'transaction', p_transaction
  ));
  transaction_identity := coalesce(
    nullif(p_transaction->>'billpaymentInvoiceNo', ''),
    nullif(p_transaction->>'billpaymentRef', ''),
    nullif(p_transaction->>'transaction_id', ''),
    'sha256:' || transaction_hash
  );
  was_successful := payment_row.status in ('paid', 'successful');

  if was_successful then
    resulting_payment := payment_row.status;
  elsif normalized_status = 'successful' then
    resulting_payment := 'successful';
  elsif payment_row.status = 'failed' and normalized_status = 'pending' then
    resulting_payment := 'failed';
  else
    resulting_payment := normalized_status;
  end if;

  if not was_successful and resulting_payment = 'successful' then
    update public.payments
    set status = 'successful',
        successful_transaction_id = transaction_identity,
        successful_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'bill_code', payment_row.gateway_reference,
          'last_verified_transaction', p_transaction,
          'transaction_digest', transaction_hash
        ),
        updated_at = now()
    where id = payment_row.id
    returning * into payment_row;

    if order_row.status = 'pending_payment' then
      perform v.id
      from public.variants v
      where exists (
        select 1
        from public.order_items oi
        where oi.order_id = order_row.id
          and oi.variant_id = v.id
      )
      order by v.id
      for update of v;

      if not exists (select 1 from public.order_items where order_id = order_row.id) then
        raise exception 'Paid order has no inventory lines';
      end if;

      for inventory_effect in
        select oi.variant_id, sum(oi.quantity)::integer as quantity
        from public.order_items oi
        where oi.order_id = order_row.id
        group by oi.variant_id
        order by oi.variant_id
      loop
        update public.variants
        set stock_quantity = stock_quantity - inventory_effect.quantity,
            reserved_quantity = reserved_quantity - inventory_effect.quantity,
            sold_quantity = coalesce(sold_quantity, 0) + inventory_effect.quantity,
            updated_at = now()
        where id = inventory_effect.variant_id
          and stock_quantity >= inventory_effect.quantity
          and reserved_quantity >= inventory_effect.quantity;
        if not found then
          raise exception 'Reserved inventory is inconsistent for paid order';
        end if;
      end loop;

      update public.orders
      set status = 'paid', payment_status = 'paid', updated_at = now()
      where id = order_row.id
      returning * into order_row;

      insert into public.order_contract_events(
        order_id, event, event_digest, actor_user_id, details
      ) values (
        order_row.id,
        'payment_successful',
        private.preview_digest_v1(jsonb_build_object(
          'event', 'payment_successful', 'payment_id', payment_row.id,
          'transaction', transaction_hash
        )),
        null,
        jsonb_build_object('payment_id', payment_row.id, 'transaction_digest', transaction_hash)
      ) on conflict (order_id, event_digest) do nothing;
    else
      requires_review := order_row.status in ('cancelled', 'refunded')
        or order_row.status not in ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed');
    end if;
  elsif not was_successful and resulting_payment <> payment_row.status then
    update public.payments
    set status = resulting_payment,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'bill_code', payment_row.gateway_reference,
          'last_verified_transaction', p_transaction,
          'transaction_digest', transaction_hash
        ),
        updated_at = now()
    where id = payment_row.id
    returning * into payment_row;
  end if;

  insert into public.payment_events(
    payment_id, order_id, gateway, gateway_reference, incoming_status,
    resulting_payment_status, resulting_order_status, transaction_digest,
    transaction_payload, requires_manual_review
  ) values (
    payment_row.id, order_row.id, payment_row.gateway, payment_row.gateway_reference,
    normalized_status, payment_row.status, order_row.status, transaction_hash,
    p_transaction, requires_review
  ) on conflict (payment_id, transaction_digest, incoming_status) do nothing;

  return query select payment_row.status, order_row.status;
end
$function$;

revoke execute on function public.reconcile_payment_attempt_v1(uuid,uuid,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_payment_attempt_v1(uuid,uuid,text,text,jsonb)
  to service_role;

comment on function public.reconcile_payment_attempt_v1(uuid,uuid,text,text,jsonb) is
  'Service-only exact payment reconciliation with stable direct variant row locking.';
