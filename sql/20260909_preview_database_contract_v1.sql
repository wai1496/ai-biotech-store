-- White Clean Core v1 Preview Database Contract.
-- Approved target: isolated Staging Supabase project rpnwssqvurpdennpzplx only.
-- This migration does not unlock Preview writes or provider calls.

create or replace function private.preview_digest_v1(p_value jsonb)
returns text
language sql
immutable
set search_path = ''
as $function$
  select encode(extensions.digest(convert_to(coalesce(p_value, 'null'::jsonb)::text, 'UTF8'), 'sha256'), 'hex')
$function$;

create or replace function private.normalize_shipping_address_v1(p_address jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $function$
declare
  normalized jsonb;
begin
  if p_address is null or jsonb_typeof(p_address) <> 'object' then
    raise exception 'Shipping address must be an object';
  end if;

  normalized := jsonb_build_object(
    'recipient_name', regexp_replace(lower(btrim(coalesce(p_address->>'recipient_name', ''))), '\s+', ' ', 'g'),
    'phone', regexp_replace(btrim(coalesce(p_address->>'phone', '')), '[^0-9+]', '', 'g'),
    'line1', regexp_replace(lower(btrim(coalesce(p_address->>'line1', ''))), '\s+', ' ', 'g'),
    'line2', regexp_replace(lower(btrim(coalesce(p_address->>'line2', ''))), '\s+', ' ', 'g'),
    'postcode', regexp_replace(btrim(coalesce(p_address->>'postcode', '')), '\s+', '', 'g'),
    'city', regexp_replace(lower(btrim(coalesce(p_address->>'city', ''))), '\s+', ' ', 'g'),
    'state', regexp_replace(lower(btrim(coalesce(p_address->>'state', ''))), '\s+', ' ', 'g'),
    'country', upper(btrim(coalesce(nullif(p_address->>'country', ''), 'MY')))
  );

  if coalesce(normalized->>'recipient_name', '') = ''
     or coalesce(normalized->>'phone', '') = ''
     or coalesce(normalized->>'line1', '') = ''
     or coalesce(normalized->>'city', '') = ''
     or coalesce(normalized->>'state', '') = ''
     or coalesce(normalized->>'postcode', '') !~ '^[0-9]{5}$'
     or normalized->>'country' <> 'MY' then
    raise exception 'Complete Malaysia shipping address required';
  end if;

  return normalized;
end
$function$;

create or replace function private.require_preview_service_role_v1()
returns void
language plpgsql
stable
set search_path = ''
as $function$
begin
  if coalesce(
       (select auth.jwt()->>'role'),
       current_setting('request.jwt.claim.role', true),
       ''
     ) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
end
$function$;

revoke execute on function private.preview_digest_v1(jsonb) from public, anon, authenticated, service_role;
revoke execute on function private.normalize_shipping_address_v1(jsonb) from public, anon, authenticated, service_role;
revoke execute on function private.require_preview_service_role_v1() from public, anon, authenticated, service_role;

alter table public.orders
  add column if not exists currency text not null default 'MYR',
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists payload_digest text,
  add column if not exists shipping_service_id text,
  add column if not exists shipping_rate_id text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status = any (array[
    'pending_payment'::text, 'paid'::text, 'processing'::text,
    'ready_to_ship'::text, 'shipped'::text, 'delivered'::text,
    'completed'::text, 'cancelled'::text, 'refunded'::text
  ]));

do $block$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'orders_currency_myr_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_currency_myr_check check (currency = 'MYR');
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'orders_payload_digest_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payload_digest_check
      check (payload_digest is null or payload_digest ~ '^[0-9a-f]{64}$');
  end if;
end
$block$;

create table if not exists public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'MYR' check (currency = 'MYR'),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_amount numeric(12,2) not null check (shipping_amount >= 0),
  destination jsonb not null,
  destination_digest text not null check (destination_digest ~ '^[0-9a-f]{64}$'),
  postcode text not null check (postcode ~ '^[0-9]{5}$'),
  state text not null,
  service_id text not null,
  rate_id text,
  courier_name text,
  service_name text,
  delivery text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_order_id uuid unique references public.orders(id) on delete restrict,
  consumed_at timestamptz,
  constraint shipping_quotes_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint shipping_quotes_consumption_pair_check
    check ((consumed_order_id is null) = (consumed_at is null))
);

create index if not exists shipping_quotes_user_created_idx
  on public.shipping_quotes(user_id, created_at desc);
create index if not exists shipping_quotes_open_expiry_idx
  on public.shipping_quotes(expires_at)
  where consumed_order_id is null;

create or replace function private.prepare_shipping_quote_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized jsonb;
begin
  if tg_op = 'INSERT' then
    normalized := private.normalize_shipping_address_v1(new.destination);
    new.destination := normalized;
    new.destination_digest := private.preview_digest_v1(normalized);
    new.postcode := normalized->>'postcode';
    new.state := normalized->>'state';
    new.currency := upper(btrim(coalesce(new.currency, 'MYR')));
    new.subtotal := round(new.subtotal, 2);
    new.shipping_amount := round(new.shipping_amount, 2);
    if new.expires_at > new.created_at + interval '10 minutes' then
      raise exception 'Shipping quote expiry exceeds ten minutes';
    end if;
    return new;
  end if;

  if old.consumed_order_id is not null then
    if new is distinct from old then
      raise exception 'Consumed shipping quote is immutable';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.currency is distinct from old.currency
     or new.subtotal is distinct from old.subtotal
     or new.shipping_amount is distinct from old.shipping_amount
     or new.destination is distinct from old.destination
     or new.destination_digest is distinct from old.destination_digest
     or new.postcode is distinct from old.postcode
     or new.state is distinct from old.state
     or new.service_id is distinct from old.service_id
     or new.rate_id is distinct from old.rate_id
     or new.courier_name is distinct from old.courier_name
     or new.service_name is distinct from old.service_name
     or new.delivery is distinct from old.delivery
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'Shipping quote details are immutable';
  end if;

  if (new.consumed_order_id is null) <> (new.consumed_at is null) then
    raise exception 'Shipping quote consumption fields must be written together';
  end if;
  return new;
end
$function$;

drop trigger if exists trg_prepare_shipping_quote_v1 on public.shipping_quotes;
create trigger trg_prepare_shipping_quote_v1
before insert or update on public.shipping_quotes
for each row execute function private.prepare_shipping_quote_v1();

revoke execute on function private.prepare_shipping_quote_v1() from public, anon, authenticated, service_role;

alter table public.orders add column if not exists shipping_quote_id uuid;

do $block$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'orders_shipping_quote_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_shipping_quote_id_fkey
      foreign key (shipping_quote_id) references public.shipping_quotes(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'orders_shipping_quote_id_key'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_shipping_quote_id_key unique (shipping_quote_id);
  end if;
end
$block$;

alter table public.shipping_quotes enable row level security;
drop policy if exists shipping_quotes_own_read_v1 on public.shipping_quotes;
create policy shipping_quotes_own_read_v1
on public.shipping_quotes for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.shipping_quotes from public, anon, authenticated, service_role;
grant select on table public.shipping_quotes to authenticated;
grant select, insert on table public.shipping_quotes to service_role;

create table if not exists public.order_contract_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null,
  event_digest text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (order_id, event_digest)
);

create index if not exists order_contract_events_order_created_idx
  on public.order_contract_events(order_id, created_at desc);
create index if not exists order_contract_events_actor_idx
  on public.order_contract_events(actor_user_id)
  where actor_user_id is not null;

alter table public.order_contract_events enable row level security;
revoke all on table public.order_contract_events from public, anon, authenticated, service_role;
grant select on table public.order_contract_events to service_role;

create or replace function public.create_order_with_shipping_quote(
  p_items jsonb,
  p_checkout_key text,
  p_shipping_quote_id uuid,
  p_voucher_code text default null,
  p_wallet_amount numeric default 0,
  p_shipping_address jsonb default '{}'::jsonb,
  p_billing_address jsonb default '{}'::jsonb,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  uid uuid := (select auth.uid());
  normalized_shipping jsonb;
  normalized_billing jsonb;
  normalized_items jsonb := '[]'::jsonb;
  payload_hash text;
  item jsonb;
  quote_row public.shipping_quotes%rowtype;
  existing_order public.orders%rowtype;
  settings_row public.commerce_settings%rowtype;
  quote_result jsonb;
  quoted_item jsonb;
  variant_ids text[] := array[]::text[];
  variant_id text;
  quantity_value integer;
  item_subtotal numeric(12,2);
  discount_value numeric(12,2);
  shipping_value numeric(12,2);
  wallet_value numeric(12,2);
  wallet_before numeric(12,2);
  before_wallet numeric(12,2);
  amount_due_value numeric(12,2);
  voucher_id_value uuid;
  order_id_value uuid;
  order_number_value text;
  invoice_number_value text;
  customer_email_value text;
  customer_phone_value text;
  canonical_shipping_note text;
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_checkout_key is null
     or length(btrim(p_checkout_key)) < 8
     or length(btrim(p_checkout_key)) > 200 then
    raise exception 'Invalid checkout key';
  end if;
  if p_shipping_quote_id is null then
    raise exception 'Verified shipping quote required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Cart contains too many lines';
  end if;
  if p_wallet_amount is null or p_wallet_amount < 0 or p_wallet_amount <> round(p_wallet_amount, 2) then
    raise exception 'Wallet amount must be a non-negative MYR cent value';
  end if;
  if length(coalesce(p_notes, '')) > 2000 then
    raise exception 'Order notes are too long';
  end if;

  normalized_shipping := private.normalize_shipping_address_v1(p_shipping_address);
  normalized_billing := private.normalize_shipping_address_v1(
    case
      when p_billing_address is null or p_billing_address = '{}'::jsonb then p_shipping_address
      else p_billing_address
    end
  );

  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'Invalid cart line';
    end if;
    variant_id := nullif(btrim(item->>'variant_id'), '');
    begin
      quantity_value := (item->>'quantity')::integer;
    exception when others then
      raise exception 'Invalid quantity';
    end;
    if variant_id is null or quantity_value <= 0 or quantity_value > 1000 then
      raise exception 'Invalid cart line';
    end if;
    if variant_id = any(variant_ids) then
      raise exception 'Duplicate variant in cart';
    end if;
    variant_ids := array_append(variant_ids, variant_id);
    normalized_items := normalized_items || jsonb_build_array(
      jsonb_build_object('variant_id', variant_id, 'quantity', quantity_value)
    );
  end loop;

  select coalesce(jsonb_agg(x.item order by x.item->>'variant_id'), '[]'::jsonb)
  into normalized_items
  from jsonb_array_elements(normalized_items) as x(item);

  payload_hash := private.preview_digest_v1(jsonb_build_object(
    'items', normalized_items,
    'shipping_quote_id', p_shipping_quote_id,
    'voucher_code', upper(btrim(coalesce(p_voucher_code, ''))),
    'wallet_amount', round(p_wallet_amount, 2),
    'shipping_address', normalized_shipping,
    'billing_address', normalized_billing,
    'notes', coalesce(p_notes, '')
  ));

  select * into existing_order
  from public.orders
  where user_id = uid and checkout_key = btrim(p_checkout_key)
  for update;

  if found then
    if existing_order.payload_digest is null or existing_order.payload_digest <> payload_hash then
      raise exception 'Checkout key conflicts with a different payload';
    end if;
    return existing_order.id;
  end if;

  select * into quote_row
  from public.shipping_quotes
  where id = p_shipping_quote_id
  for update;

  if not found
     or quote_row.user_id <> uid
     or quote_row.expires_at <= statement_timestamp()
     or quote_row.consumed_order_id is not null then
    raise exception 'Shipping quote is invalid, expired, consumed, or not owned by this account';
  end if;
  if quote_row.currency <> 'MYR'
     or quote_row.destination_digest <> private.preview_digest_v1(normalized_shipping)
     or quote_row.postcode <> normalized_shipping->>'postcode'
     or quote_row.state <> normalized_shipping->>'state'
     or nullif(btrim(quote_row.service_id), '') is null then
    raise exception 'Shipping quote does not match the checkout destination or service';
  end if;

  perform public.member_ensure_profile(null, null);

  select * into settings_row
  from public.commerce_settings
  where id = 'primary'
  for share;
  if not found or not coalesce(settings_row.checkout_enabled, true) then
    raise exception 'Checkout is currently disabled';
  end if;
  if settings_row.currency <> 'MYR' then
    raise exception 'Checkout currency must be MYR';
  end if;
  if p_wallet_amount > 0 and not coalesce(settings_row.wallet_enabled, true) then
    raise exception 'Wallet payment is disabled';
  end if;

  if nullif(btrim(p_voucher_code), '') is not null then
    perform 1 from public.vouchers
    where upper(code) = upper(btrim(p_voucher_code))
    for update;
    if not found then
      raise exception 'Voucher is invalid or inactive';
    end if;
  end if;

  perform v.id
  from public.variants v
  where v.id = any(variant_ids)
  order by v.id
  for update;

  if (select count(*) from public.variants v where v.id = any(variant_ids)) <> cardinality(variant_ids) then
    raise exception 'One or more variants are unavailable';
  end if;

  select balance into wallet_before
  from public.wallet_accounts
  where user_id = uid
  for update;
  wallet_before := coalesce(wallet_before, 0);

  quote_result := private.commerce_quote(uid, normalized_items, p_voucher_code, 0);
  item_subtotal := round((quote_result->>'subtotal')::numeric, 2);
  discount_value := round((quote_result->>'discount_total')::numeric, 2);
  shipping_value := round(quote_row.shipping_amount, 2);
  wallet_value := round(p_wallet_amount, 2);
  voucher_id_value := nullif(quote_result->>'voucher_id', '')::uuid;

  if item_subtotal <> quote_row.subtotal then
    raise exception 'Cart subtotal changed. Refresh the shipping quote.';
  end if;

  before_wallet := round(greatest(0, item_subtotal - discount_value + shipping_value), 2);
  if wallet_value > wallet_before or wallet_value > before_wallet then
    raise exception 'Wallet balance or amount is invalid';
  end if;
  amount_due_value := round(before_wallet - wallet_value, 2);

  select email, phone into customer_email_value, customer_phone_value
  from public.customer_profiles
  where user_id = uid;

  order_number_value := format(
    'STG-%s-%s',
    to_char(clock_timestamp(), 'YYYYMMDD'),
    lpad(nextval('public.staging_order_seq')::text, 5, '0')
  );
  canonical_shipping_note := format(
    '[EasyParcel] service_id=%s; rate_id=%s; courier=%s; service=%s; price=%s; delivery=%s',
    quote_row.service_id,
    coalesce(quote_row.rate_id, ''),
    coalesce(quote_row.courier_name, ''),
    coalesce(quote_row.service_name, ''),
    to_char(shipping_value, 'FM999999990.00'),
    coalesce(quote_row.delivery, '')
  );

  insert into public.orders(
    order_number, user_id, checkout_key, status, payment_status,
    subtotal, discount_total, shipping_fee, wallet_amount, grand_total, amount_due,
    voucher_code, shipping_address, billing_address, notes, currency,
    customer_email, customer_phone, payload_digest, shipping_quote_id,
    shipping_service_id, shipping_rate_id
  ) values (
    order_number_value, uid, btrim(p_checkout_key),
    'pending_payment',
    case when wallet_value > 0 then 'partial' else 'unpaid' end,
    item_subtotal, discount_value, shipping_value, wallet_value, amount_due_value, amount_due_value,
    nullif(quote_result->>'voucher_code', ''), p_shipping_address,
    case when p_billing_address is null or p_billing_address = '{}'::jsonb then p_shipping_address else p_billing_address end,
    canonical_shipping_note || case when nullif(btrim(coalesce(p_notes, '')), '') is null then '' else E'\n' || btrim(p_notes) end,
    'MYR', customer_email_value, customer_phone_value, payload_hash, quote_row.id,
    quote_row.service_id, quote_row.rate_id
  ) returning id into order_id_value;

  for quoted_item in select value from jsonb_array_elements(quote_result->'items')
  loop
    quantity_value := (quoted_item->>'quantity')::integer;
    if amount_due_value = 0 then
      update public.variants
      set stock_quantity = stock_quantity - quantity_value,
          sold_quantity = coalesce(sold_quantity, 0) + quantity_value,
          updated_at = now()
      where id = quoted_item->>'variant_id'
        and stock_quantity - reserved_quantity >= quantity_value;
    else
      update public.variants
      set reserved_quantity = coalesce(reserved_quantity, 0) + quantity_value,
          updated_at = now()
      where id = quoted_item->>'variant_id'
        and stock_quantity - reserved_quantity >= quantity_value;
    end if;
    if not found then
      raise exception 'Stock changed during checkout for %', quoted_item->>'sku';
    end if;

    insert into public.order_items(
      order_id, variant_id, product_id, product_name, strength_label,
      format, sku, unit_price, quantity, line_total
    ) values (
      order_id_value, quoted_item->>'variant_id', quoted_item->>'product_id',
      quoted_item->>'product_name', quoted_item->>'strength_label', quoted_item->>'format',
      quoted_item->>'sku', (quoted_item->>'unit_price')::numeric,
      quantity_value, (quoted_item->>'line_total')::numeric
    );
  end loop;

  if voucher_id_value is not null then
    insert into public.voucher_redemptions(voucher_id, user_id, order_id, discount_amount)
    values (voucher_id_value, uid, order_id_value, discount_value);
  end if;

  if wallet_value > 0 then
    update public.wallet_accounts
    set balance = balance - wallet_value,
        lifetime_debit = lifetime_debit + wallet_value,
        updated_at = now()
    where user_id = uid and balance >= wallet_value;
    if not found then
      raise exception 'Wallet balance changed. Refresh checkout.';
    end if;
    insert into public.wallet_transactions(
      user_id, order_id, transaction_type, amount, reason, reference
    ) values (
      uid, order_id_value, 'debit', -wallet_value,
      'Checkout wallet payment', order_number_value
    );
  end if;

  invoice_number_value := format(
    'STG-INV-%s-%s',
    to_char(clock_timestamp(), 'YYYYMMDD'),
    lpad(nextval('public.staging_invoice_seq')::text, 5, '0')
  );
  insert into public.invoices(order_id, invoice_number, status)
  values (order_id_value, invoice_number_value, 'issued');
  insert into public.shipments(order_id, status)
  values (order_id_value, 'not_booked');

  -- Order items must exist before the paid transition so the existing protocol
  -- entitlement trigger observes the complete order on wallet-only checkout.
  if amount_due_value = 0 then
    update public.orders
    set status = 'paid', payment_status = 'paid', updated_at = now()
    where id = order_id_value;
  end if;

  update public.shipping_quotes
  set consumed_order_id = order_id_value,
      consumed_at = now()
  where id = quote_row.id and consumed_order_id is null;
  if not found then
    raise exception 'Shipping quote was consumed concurrently';
  end if;

  insert into public.order_contract_events(
    order_id, event, event_digest, actor_user_id, details
  ) values (
    order_id_value,
    'order_created_with_shipping_quote',
    private.preview_digest_v1(jsonb_build_object('event', 'order_created', 'payload', payload_hash)),
    uid,
    jsonb_build_object(
      'shipping_quote_id', quote_row.id,
      'subtotal', item_subtotal,
      'discount_total', discount_value,
      'shipping_amount', shipping_value,
      'wallet_amount', wallet_value,
      'amount_due', amount_due_value,
      'currency', 'MYR'
    )
  );

  return order_id_value;
end
$function$;

revoke execute on function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  from public, anon, service_role;
grant execute on function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  to authenticated;

-- Close the authenticated no-shipping-quote checkout bypass. The service-role
-- grant is preserved for backward-compatible administrative recovery only.
revoke execute on function public.commerce_create_order(jsonb,text,text,numeric,jsonb,jsonb,text)
  from public, anon, authenticated;
revoke execute on function private.commerce_create_order(jsonb,text,text,numeric,jsonb,jsonb,text)
  from public, anon, authenticated;

alter table public.payments
  add column if not exists user_id uuid,
  add column if not exists gateway text,
  add column if not exists gateway_reference text,
  add column if not exists currency text not null default 'MYR',
  add column if not exists successful_transaction_id text,
  add column if not exists successful_at timestamptz;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status = any (array[
    'pending'::text, 'paid'::text, 'successful'::text, 'failed'::text,
    'cancelled'::text, 'refunded'::text
  ]));

do $block$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'payments_user_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'payments_gateway_reference_key'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_gateway_reference_key unique (gateway, gateway_reference);
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'payments_currency_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_currency_check check (currency = 'MYR');
  end if;
end
$block$;

create unique index if not exists payments_successful_transaction_key
  on public.payments(gateway, successful_transaction_id)
  where successful_transaction_id is not null;
create index if not exists payments_user_created_idx
  on public.payments(user_id, created_at desc)
  where user_id is not null;

create or replace function private.guard_payment_contract_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  order_row public.orders%rowtype;
begin
  if tg_op = 'INSERT' then
    new.gateway := nullif(lower(btrim(coalesce(new.gateway, ''))), '');
    if new.gateway is null and nullif(btrim(coalesce(new.provider, '')), '') is not null then
      new.gateway := lower(btrim(new.provider));
    end if;
    if new.gateway is not null and (new.provider is null or new.provider = 'manual') then
      new.provider := new.gateway;
    end if;
    new.currency := upper(btrim(coalesce(new.currency, 'MYR')));

    if new.gateway = 'toyyibpay' then
      select * into order_row from public.orders where id = new.order_id;
      if not found
         or new.user_id is null
         or new.user_id <> order_row.user_id
         or nullif(btrim(coalesce(new.gateway_reference, '')), '') is null
         or new.currency <> order_row.currency
         or round(new.amount, 2) <> round(order_row.grand_total, 2) then
        raise exception 'ToyyibPay attempt does not match its order';
      end if;
    end if;
    return new;
  end if;

  if new.order_id is distinct from old.order_id
     or new.user_id is distinct from old.user_id
     or new.provider is distinct from old.provider
     or new.gateway is distinct from old.gateway
     or new.provider_reference is distinct from old.provider_reference
     or new.gateway_reference is distinct from old.gateway_reference
     or new.amount is distinct from old.amount
     or new.currency is distinct from old.currency then
    raise exception 'Payment attempt association is immutable';
  end if;

  if old.status in ('paid', 'successful')
     and (new.status is distinct from old.status
          or new.successful_transaction_id is distinct from old.successful_transaction_id
          or new.successful_at is distinct from old.successful_at) then
    raise exception 'Successful payment identity is immutable';
  end if;
  return new;
end
$function$;

drop trigger if exists trg_guard_payment_contract_v1 on public.payments;
create trigger trg_guard_payment_contract_v1
before insert or update on public.payments
for each row execute function private.guard_payment_contract_v1();

revoke execute on function private.guard_payment_contract_v1() from public, anon, authenticated, service_role;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  gateway text not null,
  gateway_reference text not null,
  incoming_status text not null,
  resulting_payment_status text not null,
  resulting_order_status text not null,
  transaction_digest text not null,
  transaction_payload jsonb not null,
  requires_manual_review boolean not null default false,
  created_at timestamptz not null default now(),
  unique (payment_id, transaction_digest, incoming_status)
);

create index if not exists payment_events_order_created_idx
  on public.payment_events(order_id, created_at desc);
create index if not exists payment_events_gateway_reference_idx
  on public.payment_events(gateway, gateway_reference);

alter table public.payment_events enable row level security;
revoke all on table public.payment_events from public, anon, authenticated, service_role;
grant select on table public.payment_events to service_role;

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
      join (
        select oi.variant_id, sum(oi.quantity)::integer as quantity
        from public.order_items oi
        where oi.order_id = order_row.id
        group by oi.variant_id
      ) effect on effect.variant_id = v.id
      order by v.id
      for update;

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

create table if not exists public.shipping_booking_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  provider text not null default 'easyparcel' check (provider = 'easyparcel'),
  stage text not null default 'new' check (stage in (
    'new', 'submitting', 'submitted', 'paying', 'awaiting-awb', 'ready'
  )),
  provider_order_no text,
  lease_token uuid,
  lease_expires_at timestamptz,
  state_data jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_booking_lease_pair_check
    check ((lease_token is null) = (lease_expires_at is null)),
  constraint shipping_booking_provider_stage_check
    check (stage in ('new', 'submitting') or provider_order_no is not null)
);

create index if not exists shipping_booking_active_lease_idx
  on public.shipping_booking_intents(lease_expires_at)
  where lease_token is not null;

create table if not exists public.shipping_booking_events (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.shipping_booking_intents(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  event text not null,
  from_stage text,
  to_stage text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shipping_booking_events_intent_created_idx
  on public.shipping_booking_events(intent_id, created_at desc);
create index if not exists shipping_booking_events_order_created_idx
  on public.shipping_booking_events(order_id, created_at desc);

alter table public.shipping_booking_intents enable row level security;
alter table public.shipping_booking_events enable row level security;
revoke all on table public.shipping_booking_intents from public, anon, authenticated, service_role;
revoke all on table public.shipping_booking_events from public, anon, authenticated, service_role;
grant select on table public.shipping_booking_intents to service_role;
grant select on table public.shipping_booking_events to service_role;

create or replace function private.shipping_booking_state_v1(p_intent public.shipping_booking_intents)
returns jsonb
language sql
stable
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', p_intent.id,
    'orderId', p_intent.order_id,
    'stage', p_intent.stage,
    'providerOrderNo', p_intent.provider_order_no,
    'updatedAt', p_intent.updated_at
  ) || coalesce(p_intent.state_data, '{}'::jsonb)
$function$;

revoke execute on function private.shipping_booking_state_v1(public.shipping_booking_intents)
  from public, anon, authenticated, service_role;

create or replace function public.claim_shipping_booking_v1(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  order_row public.orders%rowtype;
  intent_row public.shipping_booking_intents%rowtype;
  new_token uuid;
  recovering_expired_lease boolean;
begin
  perform private.require_preview_service_role_v1();
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if order_row.status not in ('paid', 'ready_to_ship') then
    raise exception 'Only paid orders can be booked for shipment';
  end if;

  insert into public.shipping_booking_intents(order_id, history)
  values (
    order_row.id,
    jsonb_build_array(jsonb_build_object('event', 'created', 'at', now()))
  ) on conflict (order_id) do nothing;

  select * into intent_row
  from public.shipping_booking_intents
  where order_id = order_row.id
  for update;

  if intent_row.lease_token is not null and intent_row.lease_expires_at > now() then
    return jsonb_build_object(
      'acquired', false,
      'id', intent_row.id,
      'token', null,
      'state', private.shipping_booking_state_v1(intent_row)
    );
  end if;

  recovering_expired_lease := intent_row.lease_token is not null;
  new_token := gen_random_uuid();
  update public.shipping_booking_intents
  set lease_token = new_token,
      lease_expires_at = now() + interval '10 minutes',
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object(
        'event', case when recovering_expired_lease then 'expired_lease_recovered' else 'lease_acquired' end,
        'stage', stage,
        'at', now()
      ))
  where id = intent_row.id
  returning * into intent_row;

  insert into public.shipping_booking_events(intent_id, order_id, event, from_stage, to_stage)
  values (
    intent_row.id, intent_row.order_id,
    case when recovering_expired_lease then 'expired_lease_recovered' else 'lease_acquired' end,
    intent_row.stage, intent_row.stage
  );

  return jsonb_build_object(
    'acquired', true,
    'id', intent_row.id,
    'token', new_token,
    'state', private.shipping_booking_state_v1(intent_row)
  );
end
$function$;

create or replace function public.advance_shipping_booking_v1(
  p_intent_id uuid,
  p_lease uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  intent_row public.shipping_booking_intents%rowtype;
  prior_stage text;
  next_stage text;
  supplied_provider_no text;
begin
  perform private.require_preview_service_role_v1();
  if p_patch is null or jsonb_typeof(p_patch) <> 'object'
     or (p_patch - array['stage', 'providerOrderNo']) <> '{}'::jsonb then
    raise exception 'Invalid shipping booking patch';
  end if;

  select * into intent_row
  from public.shipping_booking_intents
  where id = p_intent_id
  for update;
  if not found
     or intent_row.lease_token is null
     or intent_row.lease_token <> p_lease
     or intent_row.lease_expires_at <= now() then
    raise exception 'Valid shipping booking lease required';
  end if;

  prior_stage := intent_row.stage;
  next_stage := coalesce(nullif(p_patch->>'stage', ''), prior_stage);
  supplied_provider_no := nullif(btrim(p_patch->>'providerOrderNo'), '');

  if intent_row.provider_order_no is not null
     and supplied_provider_no is not null
     and supplied_provider_no <> intent_row.provider_order_no then
    raise exception 'Provider order number is immutable';
  end if;

  if not (
    (prior_stage = 'new' and next_stage = 'submitting')
    or (prior_stage = 'submitting' and next_stage = 'submitted' and supplied_provider_no is not null)
    or (prior_stage = 'submitted' and next_stage = 'paying')
    or (prior_stage = 'paying' and next_stage = 'awaiting-awb')
    or (prior_stage = 'awaiting-awb' and next_stage = 'awaiting-awb')
  ) then
    raise exception 'Illegal shipping booking stage transition: % -> %', prior_stage, next_stage;
  end if;

  update public.shipping_booking_intents
  set stage = next_stage,
      provider_order_no = coalesce(provider_order_no, supplied_provider_no),
      state_data = state_data || (p_patch - array['stage', 'providerOrderNo']),
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object(
        'event', 'advanced', 'from', prior_stage, 'to', next_stage,
        'providerOrderNo', coalesce(provider_order_no, supplied_provider_no), 'at', now()
      ))
  where id = intent_row.id
  returning * into intent_row;

  insert into public.shipping_booking_events(
    intent_id, order_id, event, from_stage, to_stage, payload
  ) values (
    intent_row.id, intent_row.order_id, 'advanced', prior_stage, next_stage,
    jsonb_build_object('providerOrderNo', intent_row.provider_order_no)
  );

  return private.shipping_booking_state_v1(intent_row);
end
$function$;

create or replace function public.complete_shipping_booking_v1(
  p_intent_id uuid,
  p_lease uuid,
  p_parcel jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  intent_row public.shipping_booking_intents%rowtype;
  order_row public.orders%rowtype;
  shipment_row public.shipments%rowtype;
  awb_value text;
  prior_stage text;
begin
  perform private.require_preview_service_role_v1();
  if p_parcel is null or jsonb_typeof(p_parcel) <> 'object' then
    raise exception 'Parcel result required';
  end if;
  awb_value := btrim(coalesce(p_parcel->>'awb', ''));
  if awb_value = '' or awb_value ~* '(not available|pending|^null$)' then
    raise exception 'Usable AWB required';
  end if;

  select * into intent_row
  from public.shipping_booking_intents
  where id = p_intent_id
  for update;
  if not found
     or intent_row.lease_token is null
     or intent_row.lease_token <> p_lease
     or intent_row.lease_expires_at <= now()
     or intent_row.provider_order_no is null
     or intent_row.stage not in ('awaiting-awb', 'ready') then
    raise exception 'Valid awaiting-AWB shipping booking lease required';
  end if;
  prior_stage := intent_row.stage;
  if prior_stage = 'ready'
     and nullif(intent_row.state_data->>'awb', '') is distinct from awb_value then
    raise exception 'Completed shipping AWB is immutable';
  end if;

  select * into order_row
  from public.orders
  where id = intent_row.order_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;

  insert into public.shipments(
    order_id, provider, service_name, tracking_number, tracking_url,
    waybill_url, status, metadata, updated_at
  ) values (
    order_row.id, 'easyparcel', coalesce(nullif(order_row.shipping_service_id, ''), 'EasyParcel'),
    awb_value, nullif(p_parcel->>'trackingUrl', ''), nullif(p_parcel->>'awbLink', ''),
    case when order_row.status in ('cancelled', 'refunded') then 'cancelled' else 'booked' end,
    jsonb_build_object(
      'easyparcel_order_no', intent_row.provider_order_no,
      'easyparcel_parcel_no', nullif(p_parcel->>'parcelNo', ''),
      'ship_status', nullif(p_parcel->>'shipStatus', ''),
      'booking_intent_id', intent_row.id
    ), now()
  ) on conflict (order_id) do update
  set provider = excluded.provider,
      service_name = excluded.service_name,
      tracking_number = excluded.tracking_number,
      tracking_url = excluded.tracking_url,
      waybill_url = excluded.waybill_url,
      status = case
        when public.shipments.status = 'cancelled' then public.shipments.status
        else excluded.status
      end,
      metadata = coalesce(public.shipments.metadata, '{}'::jsonb) || excluded.metadata,
      updated_at = now()
  returning * into shipment_row;

  if order_row.status = 'paid' then
    update public.orders
    set status = 'ready_to_ship', updated_at = now()
    where id = order_row.id
    returning * into order_row;
  end if;

  update public.shipping_booking_intents
  set stage = 'ready',
      state_data = state_data || jsonb_build_object(
        'awb', awb_value,
        'awbLink', nullif(p_parcel->>'awbLink', ''),
        'trackingUrl', nullif(p_parcel->>'trackingUrl', ''),
        'parcelNo', nullif(p_parcel->>'parcelNo', ''),
        'shipStatus', nullif(p_parcel->>'shipStatus', '')
      ),
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object(
        'event', 'completed', 'from', stage, 'to', 'ready', 'awb', awb_value, 'at', now()
      ))
  where id = intent_row.id
  returning * into intent_row;

  insert into public.shipping_booking_events(
    intent_id, order_id, event, from_stage, to_stage, payload
  ) values (
    intent_row.id, intent_row.order_id, 'completed', prior_stage, 'ready',
    jsonb_build_object('awb', awb_value, 'shipment_id', shipment_row.id)
  );

  insert into public.order_contract_events(
    order_id, event, event_digest, actor_user_id, details
  ) values (
    order_row.id,
    'shipping_ready',
    private.preview_digest_v1(jsonb_build_object(
      'event', 'shipping_ready', 'intent_id', intent_row.id, 'awb', awb_value
    )),
    null,
    jsonb_build_object('intent_id', intent_row.id, 'shipment_id', shipment_row.id, 'awb', awb_value)
  ) on conflict (order_id, event_digest) do nothing;

  return private.shipping_booking_state_v1(intent_row)
    || jsonb_build_object('shipment', to_jsonb(shipment_row), 'orderStatus', order_row.status);
end
$function$;

create or replace function public.release_shipping_booking_v1(
  p_intent_id uuid,
  p_lease uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  released boolean;
begin
  perform private.require_preview_service_role_v1();
  update public.shipping_booking_intents
  set lease_token = null,
      lease_expires_at = null,
      updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object(
        'event', 'lease_released', 'stage', stage, 'at', now()
      ))
  where id = p_intent_id and lease_token = p_lease;
  released := found;
  return released;
end
$function$;

revoke execute on function public.claim_shipping_booking_v1(uuid)
  from public, anon, authenticated;
revoke execute on function public.advance_shipping_booking_v1(uuid,uuid,jsonb)
  from public, anon, authenticated;
revoke execute on function public.complete_shipping_booking_v1(uuid,uuid,jsonb)
  from public, anon, authenticated;
revoke execute on function public.release_shipping_booking_v1(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.claim_shipping_booking_v1(uuid) to service_role;
grant execute on function public.advance_shipping_booking_v1(uuid,uuid,jsonb) to service_role;
grant execute on function public.complete_shipping_booking_v1(uuid,uuid,jsonb) to service_role;
grant execute on function public.release_shipping_booking_v1(uuid,uuid) to service_role;

comment on table public.shipping_quotes is
  'White Clean v1 server-verified, owner-bound, ten-minute Preview shipping quotes.';
comment on table public.shipping_booking_intents is
  'White Clean v1 durable, leased EasyParcel booking state machine for Preview.';
comment on function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text) is
  'Authenticated atomic checkout using an exact owner/address/subtotal-bound shipping quote.';
comment on function public.reconcile_payment_attempt_v1(uuid,uuid,text,text,jsonb) is
  'Service-only exact ToyyibPay attempt reconciliation with terminal-success semantics.';
