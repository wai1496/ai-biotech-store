const assert=require('assert');
const fs=require('fs');
const path=require('path');
const sqlPath=path.join(__dirname,'..','sql','20260901_research_approval_workflow.sql');
assert.ok(fs.existsSync(sqlPath),'research approval migration must exist');
const sql=fs.readFileSync(sqlPath,'utf8');
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
console.log('research approval schema contract passed');
