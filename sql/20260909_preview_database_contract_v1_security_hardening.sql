-- Follow-up hardening from the first Staging advisor pass.
-- Keep the privileged checkout implementation outside the exposed schema and
-- make service-only tables explicitly deny browser roles at the RLS layer.

alter function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  set schema private;

revoke execute on function private.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  from public, anon, service_role;
grant execute on function private.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  to authenticated;

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
language sql
security invoker
set search_path = ''
as $function$
  select private.create_order_with_shipping_quote(
    p_items,
    p_checkout_key,
    p_shipping_quote_id,
    p_voucher_code,
    p_wallet_amount,
    p_shipping_address,
    p_billing_address,
    p_notes
  )
$function$;

revoke execute on function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  from public, anon, service_role;
grant execute on function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text)
  to authenticated;

drop policy if exists order_contract_events_browser_deny_v1 on public.order_contract_events;
create policy order_contract_events_browser_deny_v1
on public.order_contract_events as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists payment_events_browser_deny_v1 on public.payment_events;
create policy payment_events_browser_deny_v1
on public.payment_events as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists shipping_booking_intents_browser_deny_v1 on public.shipping_booking_intents;
create policy shipping_booking_intents_browser_deny_v1
on public.shipping_booking_intents as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists shipping_booking_events_browser_deny_v1 on public.shipping_booking_events;
create policy shipping_booking_events_browser_deny_v1
on public.shipping_booking_events as restrictive for all to anon, authenticated
using (false) with check (false);

comment on function public.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text) is
  'Authenticated invoker wrapper for the private atomic shipping-quote checkout implementation.';
comment on function private.create_order_with_shipping_quote(jsonb,text,uuid,text,numeric,jsonb,jsonb,text) is
  'Fixed-path privileged implementation for owner-bound atomic checkout; not exposed through the Data API.';
