-- AI BioTech Staging project rpnwssqvurpdennpzplx only.
-- Create the authenticated caller's missing member rows without changing any
-- existing profile or wallet state.

create or replace function public.ensure_my_customer_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_phone text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select
    email,
    left(nullif(btrim(raw_user_meta_data ->> 'name'), ''), 200),
    left(nullif(btrim(raw_user_meta_data ->> 'phone'), ''), 50)
  into v_email, v_name, v_phone
  from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'Authenticated user is unavailable.' using errcode = '42501';
  end if;

  insert into public.customer_profiles (user_id, email, name, phone)
  values (v_user_id, v_email, v_name, v_phone)
  on conflict (user_id) do nothing;

  insert into public.wallet_accounts (user_id, balance, lifetime_credit, lifetime_debit)
  values (v_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  return v_user_id;
end
$function$;

revoke all on function public.ensure_my_customer_profile() from public, anon, authenticated, service_role;
grant execute on function public.ensure_my_customer_profile() to authenticated;

comment on function public.ensure_my_customer_profile() is
  'Idempotently creates only the authenticated user own missing customer profile and zero-balance wallet.';
