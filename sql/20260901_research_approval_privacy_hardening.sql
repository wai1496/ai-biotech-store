-- Keep approval identity and review notes in private research version history.
-- Public research_entries remains the customer-readable projection only.

alter table public.research_entry_versions
  add column if not exists verification_note text not null default '';

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
       or new.verification_note<>old.verification_note
       or new.rejection_note<>old.rejection_note then
      raise exception 'Published research content is immutable';
    end if;
  end if;

  return new;
end
$function$;

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
     set status='published',
         approved_by=uid,
         approved_at=now(),
         published_at=now(),
         verification_note=coalesce(p_verification_note,''),
         updated_at=now()
   where id=v.id;

  update public.research_entries
     set short_summary=coalesce(v.profile_json->>'short_description',''),
         full_content=coalesce(v.profile_json->>'overview',''),
         references_json=v.sources_json,
         profile_json=v.profile_json,
         published=true,
         published_version_id=v.id,
         approved_by=null,
         approved_at=now(),
         published_at=now(),
         verification_note='',
         updated_at=now()
   where id=v.research_entry_id and product_id=v.product_id;

  if not found then
    raise exception 'Research entry projection missing';
  end if;

  return jsonb_build_object('version_id',v.id,'product_id',v.product_id);
end
$function$;

-- Defensive cleanup in case this hardening runs after any prior test approval.
update public.research_entries
set approved_by=null,
    verification_note=''
where approved_by is not null
   or verification_note<>'';

-- Defense in depth: anonymous users must not be able to invoke approval RPCs at all.
revoke all on function public.admin_publish_research_version(uuid,text) from public;
revoke all on function public.admin_reject_research_version(uuid,text) from public;
revoke execute on function public.admin_publish_research_version(uuid,text) from anon;
revoke execute on function public.admin_reject_research_version(uuid,text) from anon;
grant execute on function public.admin_publish_research_version(uuid,text) to authenticated;
grant execute on function public.admin_reject_research_version(uuid,text) to authenticated;
