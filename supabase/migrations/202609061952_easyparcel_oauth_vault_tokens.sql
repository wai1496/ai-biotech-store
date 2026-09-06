create or replace function public.easyparcel_store_oauth_tokens(
  p_access_token text,
  p_refresh_token text default null,
  p_expires_at timestamptz default null,
  p_refresh_expires_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_access_id uuid;
  v_refresh_id uuid;
begin
  if coalesce(length(trim(p_access_token)),0)=0 then
    raise exception 'access token is required';
  end if;
  select id into v_access_id from vault.secrets where name='easyparcel_staging_access_token' limit 1;
  if v_access_id is null then
    v_access_id := vault.create_secret(p_access_token,'easyparcel_staging_access_token','EasyParcel staging OAuth access token');
  else
    perform vault.update_secret(v_access_id,p_access_token,'easyparcel_staging_access_token','EasyParcel staging OAuth access token');
  end if;
  if coalesce(length(trim(p_refresh_token)),0)>0 then
    select id into v_refresh_id from vault.secrets where name='easyparcel_staging_refresh_token' limit 1;
    if v_refresh_id is null then
      v_refresh_id := vault.create_secret(p_refresh_token,'easyparcel_staging_refresh_token','EasyParcel staging OAuth refresh token');
    else
      perform vault.update_secret(v_refresh_id,p_refresh_token,'easyparcel_staging_refresh_token','EasyParcel staging OAuth refresh token');
    end if;
  end if;
  update public.integration_configs
     set enabled=true, mode='sandbox', status='connected',
         config=coalesce(config,'{}'::jsonb) || jsonb_build_object(
           'oauth_connected',true,
           'oauth_token_storage','supabase_vault',
           'oauth_expires_at',p_expires_at,
           'oauth_refresh_expires_at',p_refresh_expires_at,
           'secrets_stored_client_side',false
         ),
         last_tested_at=now(), updated_at=now()
   where integration_key='easyparcel';
  return jsonb_build_object('stored',true,'access_secret_id',v_access_id,'refresh_secret_present',v_refresh_id is not null);
end;
$$;

create or replace function public.easyparcel_get_oauth_tokens()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select jsonb_build_object(
    'access_token',max(decrypted_secret) filter (where name='easyparcel_staging_access_token'),
    'refresh_token',max(decrypted_secret) filter (where name='easyparcel_staging_refresh_token')
  )
  from vault.decrypted_secrets
  where name in ('easyparcel_staging_access_token','easyparcel_staging_refresh_token');
$$;

revoke all on function public.easyparcel_store_oauth_tokens(text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.easyparcel_get_oauth_tokens() from public, anon, authenticated;
grant execute on function public.easyparcel_store_oauth_tokens(text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.easyparcel_get_oauth_tokens() to service_role;
