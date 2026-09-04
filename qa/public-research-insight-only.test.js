const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const insight=read('research-insight.js');
const html=read('research-insight.html');

assert.doesNotMatch(insight,/api\/ai-product-insight/,'public Research Insight must not call the quota-limited AI endpoint');
assert.doesNotMatch(insight,/localStorage/,'public Research Insight must not depend on cached AI drafts');
assert.match(insight,/research_entries/,'public Research Insight must read approved research_entries');
assert.match(insight,/published_version_id/,'public Research Insight must require an approved published version');
assert.match(insight,/profile_json/,'public Research Insight must render the approved profile');
for(const raw of ['GEMINI_API_KEY','OPENAI_API_KEY','AI_QUOTA_EXHAUSTED','Vercel environment']){
  assert.ok(!insight.includes(raw)&&!html.includes(raw),`public Research UI must not expose ${raw}`);
}
assert.match(insight,/Research profile is being prepared/,'unpublished research should have a safe prepared-state message');
assert.match(insight,/temporarily unavailable/i,'read failures should have a safe temporary-unavailable message');
console.log('public Research Insight contract passed');
