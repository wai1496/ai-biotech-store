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

create or replace function public.get_public_feature_flag(p_feature_key text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare r public.feature_modules;
begin
  if p_feature_key <> 'ai_storefront_assistant' then
    return jsonb_build_object('feature_key',p_feature_key,'enabled',false,'status','unavailable');
  end if;
  select * into r from public.feature_modules where feature_key=p_feature_key;
  if not found then
    return jsonb_build_object('feature_key',p_feature_key,'enabled',false,'status','missing');
  end if;
  return jsonb_build_object('feature_key',r.feature_key,'enabled',r.enabled,'status',r.status,'version',r.version);
end
$$;

revoke all on function public.get_public_feature_flag(text) from public;
grant execute on function public.get_public_feature_flag(text) to anon, authenticated;
