const assert=require('assert');
const fs=require('fs');
const path=require('path');
const sqlPath=path.join(__dirname,'..','sql','20260901_research_approval_workflow.sql');
const privacyPath=path.join(__dirname,'..','sql','20260901_research_approval_privacy_hardening.sql');
assert.ok(fs.existsSync(sqlPath),'research approval migration must exist');
assert.ok(fs.existsSync(privacyPath),'research approval privacy hardening migration must exist');
const sql=fs.readFileSync(sqlPath,'utf8');
const privacy=fs.readFileSync(privacyPath,'utf8');
for(const token of [
  'create table if not exists public.research_entry_versions',
  'profile_json jsonb',
  'published_version_id uuid',
  'evidence_gate_json jsonb',
  'change_summary_json jsonb',
  'provider_metadata_json jsonb',
  'admin_publish_research_version',
  'admin_reject_research_version',
  'enable row level security',
  'public_research_versions_admin',
  'pending_admin_approval',
  'superseded'
]) assert.match(sql,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`missing SQL contract: ${token}`);
assert.doesNotMatch(sql,/policy\s+.*anon.*research_entry_versions.*select/is,'versions must not have anonymous SELECT policy');
for(const token of ['add column if not exists verification_note text','admin_publish_research_version','approved_by=null'])
  assert.match(privacy,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`missing privacy contract: ${token}`);
assert.match(privacy,/research_entry_versions[\s\S]*verification_note=coalesce\(p_verification_note,''\)/i,'private version history must store the verification note');
assert.match(privacy,/research_entries[\s\S]*approved_by=null[\s\S]*verification_note=''[\s\S]*updated_at=now\(\)/i,'public projection must not store private approval identity or verification note');
console.log('research approval schema contract passed');
