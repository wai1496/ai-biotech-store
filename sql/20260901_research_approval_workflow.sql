-- AI BioTech research approval workflow
-- Additive schema migration: does not modify product, variant, inventory, order,
-- wallet, protocol, customer, or existing research-entry content.

alter table public.research_entries
  add column if not exists profile_json jsonb not null default '{}'::jsonb,
  add column if not exists published_version_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists verification_note text not null default '';

create table if not exists public.research_entry_versions (
  id uuid primary key default gen_random_uuid(),
  research_entry_id uuid not null references public.research_entries(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft','ai_reviewed','pending_admin_approval','published','rejected','superseded')),
  provider text not null default 'manual',
  model text not null default '',
  profile_json jsonb not null default '{}'::jsonb,
  sources_json jsonb not null default '[]'::jsonb,
  evidence_gate_json jsonb not null default '{}'::jsonb,
  change_summary_json jsonb not null default '{}'::jsonb,
  provider_metadata_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  rejection_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,version_number)
);

alter table public.research_entries
  drop constraint if exists research_entries_published_version_id_fkey;
alter table public.research_entries
  add constraint research_entries_published_version_id_fkey
  foreign key (published_version_id)
  references public.research_entry_versions(id)
  on delete set null;

create index if not exists research_entry_versions_entry_created_idx
  on public.research_entry_versions(research_entry_id,created_at desc);
create index if not exists research_entry_versions_product_status_idx
  on public.research_entry_versions(product_id,status,version_number desc);

alter table public.research_entry_versions enable row level security;

drop policy if exists public_research_versions_admin on public.research_entry_versions;
create policy public_research_versions_admin
on public.research_entry_versions
for all
to authenticated
using (public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]))
with check (public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]));

create or replace function public.guard_research_version_history()
returns trigger
language plpgsql
security invoker
set search_path=''
as $function$
begin
  if tg_op='DELETE' then
    if old.status in ('published','superseded') then
      raise exception 'Published research history is immutable';
    end if;
    return old;
  end if;

  if old.status='superseded' then
    raise exception 'Superseded research history is immutable';
  end if;

  if old.status='published' then
    if new.status<>'superseded'
       or new.profile_json<>old.profile_json
       or new.sources_json<>old.sources_json
       or new.evidence_gate_json<>old.evidence_gate_json
       or new.change_summary_json<>old.change_summary_json
       or new.provider_metadata_json<>old.provider_metadata_json
       or new.provider<>old.provider
       or new.model<>old.model
       or new.product_id<>old.product_id
       or new.research_entry_id<>old.research_entry_id
       or new.version_number<>old.version_number
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at
       or new.published_at is distinct from old.published_at
       or new.rejection_note<>old.rejection_note then
      raise exception 'Published research content is immutable';
    end if;
  end if;

  return new;
end
$function$;

drop trigger if exists trg_guard_research_version_history on public.research_entry_versions;
create trigger trg_guard_research_version_history
before update or delete on public.research_entry_versions
for each row execute function public.guard_research_version_history();

create or replace function public.admin_publish_research_version(
  p_version_id uuid,
  p_verification_note text default ''
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  uid uuid:=auth.uid();
  v public.research_entry_versions;
  gate_passed boolean:=false;
begin
  if uid is null or not public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]) then
    raise exception 'Admin authorization required';
  end if;

  select * into v
  from public.research_entry_versions
  where id=p_version_id
  for update;

  if not found then
    raise exception 'Research version not found';
  end if;

  if v.status not in ('pending_admin_approval','ai_reviewed','draft') then
    raise exception 'Research version is not publishable from status %',v.status;
  end if;

  if jsonb_typeof(v.profile_json)<>'object'
     or coalesce(btrim(v.profile_json->>'short_description'),'')=''
     or coalesce(btrim(v.profile_json->>'overview'),'')='' then
    raise exception 'Research version is missing required public profile content';
  end if;

  begin
    gate_passed:=coalesce((v.evidence_gate_json->>'passed')::boolean,false);
  exception when invalid_text_representation then
    gate_passed:=false;
  end;

  if not gate_passed and coalesce(btrim(p_verification_note),'')='' then
    raise exception 'Verification note required when evidence gate did not pass';
  end if;

  update public.research_entry_versions
     set status='superseded',updated_at=now()
   where product_id=v.product_id and status='published' and id<>v.id;

  update public.research_entry_versions
     set status='published',approved_by=uid,approved_at=now(),published_at=now(),updated_at=now()
   where id=v.id;

  update public.research_entries
     set short_summary=coalesce(v.profile_json->>'short_description',''),
         full_content=coalesce(v.profile_json->>'overview',''),
         references_json=v.sources_json,
         profile_json=v.profile_json,
         published=true,
         published_version_id=v.id,
         approved_by=uid,
         approved_at=now(),
         published_at=now(),
         verification_note=coalesce(p_verification_note,''),
         updated_at=now()
   where id=v.research_entry_id and product_id=v.product_id;

  if not found then
    raise exception 'Research entry projection missing';
  end if;

  return jsonb_build_object('version_id',v.id,'product_id',v.product_id);
end
$function$;

create or replace function public.admin_reject_research_version(
  p_version_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  uid uuid:=auth.uid();
  v public.research_entry_versions;
begin
  if uid is null or not public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]) then
    raise exception 'Admin authorization required';
  end if;

  if coalesce(btrim(p_reason),'')='' then
    raise exception 'Rejection reason required';
  end if;

  select * into v
  from public.research_entry_versions
  where id=p_version_id
  for update;

  if not found then
    raise exception 'Research version not found';
  end if;

  if v.status not in ('draft','ai_reviewed','pending_admin_approval') then
    raise exception 'Research version is not rejectable from status %',v.status;
  end if;

  update public.research_entry_versions
     set status='rejected',rejection_note=btrim(p_reason),updated_at=now()
   where id=v.id;

  return jsonb_build_object('version_id',v.id,'product_id',v.product_id,'status','rejected');
end
$function$;

revoke all on function public.admin_publish_research_version(uuid,text) from public;
revoke all on function public.admin_reject_research_version(uuid,text) from public;
grant execute on function public.admin_publish_research_version(uuid,text) to authenticated;
grant execute on function public.admin_reject_research_version(uuid,text) to authenticated;
