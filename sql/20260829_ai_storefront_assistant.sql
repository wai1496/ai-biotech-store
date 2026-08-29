insert into public.feature_modules (
  feature_key, display_name, category, enabled, version, status, config, permissions, updated_at, updated_by
)
values (
  'ai_storefront_assistant',
  'Storefront AI Peptide Assistant',
  'AI',
  false,
  '0.1.0',
  'staging',
  jsonb_build_object(
    'launcher','star',
    'welcome','Hi, I am your AI BioTech Assistant. You can ask me anything about peptides.',
    'idle_close_seconds',180,
    'dock_after_idle',true,
    'default_mode','normal',
    'modes',jsonb_build_array('normal','deep_search','evidence_first'),
    'onboarding',jsonb_build_array('condition','language','age','weight','height','medical_history','target'),
    'health_profile_persistence',false,
    'private_source_priority',jsonb_build_array('peptidedosages.com','mypeptidematch.com','peptidedosingprotocols.com/protocols','peptidedosingprotocols.com/stacks','mypeptidedosages.com/library'),
    'public_source_policy','authoritative_only'
  ),
  jsonb_build_object('public_chat',true,'read_catalog',true,'read_research',true,'database_write',false,'order_write',false,'wallet_write',false,'store_health_profile',false),
  now(), null
)
on conflict (feature_key) do update
set display_name=excluded.display_name,
    category=excluded.category,
    version=excluded.version,
    status=case when public.feature_modules.status='disabled' then 'staging' else public.feature_modules.status end,
    config=excluded.config,
    permissions=excluded.permissions,
    updated_at=now();

create table if not exists public.public_feature_flags (
  feature_key text primary key,
  enabled boolean not null default false,
  status text not null default 'disabled',
  version text not null default '0.1.0',
  updated_at timestamptz not null default now()
);

alter table public.public_feature_flags enable row level security;

drop policy if exists public_feature_flags_read on public.public_feature_flags;
create policy public_feature_flags_read
on public.public_feature_flags
for select
to anon, authenticated
using (feature_key='ai_storefront_assistant');

revoke all on table public.public_feature_flags from anon, authenticated;
grant select on table public.public_feature_flags to anon, authenticated;

insert into public.public_feature_flags(feature_key,enabled,status,version,updated_at)
select feature_key,enabled,status,version,now()
from public.feature_modules
where feature_key='ai_storefront_assistant'
on conflict(feature_key) do update
set enabled=excluded.enabled,
    status=excluded.status,
    version=excluded.version,
    updated_at=excluded.updated_at;

drop function if exists public.get_public_feature_flag(text);

create or replace function private.ops_toggle_feature(p_feature_key text, p_enabled boolean, p_status text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare oldr public.feature_modules; newr public.feature_modules; b uuid;
begin
 if not private.staging_is_admin() then raise exception 'Admin access required'; end if;
 select * into oldr from public.feature_modules where feature_key=p_feature_key for update; if not found then raise exception 'Feature not found'; end if;
 update public.feature_modules set enabled=p_enabled,status=coalesce(nullif(p_status,''),status),updated_at=now(),updated_by=auth.uid() where feature_key=p_feature_key returning * into newr;
 if p_feature_key='ai_storefront_assistant' then
   insert into public.public_feature_flags(feature_key,enabled,status,version,updated_at)
   values(newr.feature_key,newr.enabled,newr.status,newr.version,now())
   on conflict(feature_key) do update set enabled=excluded.enabled,status=excluded.status,version=excluded.version,updated_at=excluded.updated_at;
 end if;
 b:=private.record_control_change('feature_modules',p_feature_key,'toggle',to_jsonb(oldr),to_jsonb(newr),p_reason,'manual');
 return jsonb_build_object('batch_id',b,'record',to_jsonb(newr));
end $function$;
