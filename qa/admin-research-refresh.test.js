const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const file of ['api/_research-auth.js','api/_research-providers.js','api/admin-research-refresh.js'])
  assert.ok(fs.existsSync(path.join(root,file)),`${file} must exist`);
const endpoint=read('api/admin-research-refresh.js');
const providers=read('api/_research-providers.js');
const auth=read('api/_research-auth.js');
const providerModule=require(path.join(root,'api/_research-providers.js'));
assert.match(endpoint,/verifyResearchAdmin/);
assert.match(endpoint,/product_id/);
assert.doesNotMatch(endpoint,/research_entries[^\n]*update/i,'refresh endpoint must not publish directly');
assert.match(providers,/OPENAI_API_KEY/);
assert.match(providers,/OPENAI_RESEARCH_MODEL/);
assert.match(providers,/gpt-5\.6-luna/);
assert.match(providers,/GEMINI_API_KEY/);
assert.ok(providers.indexOf('OPENAI_API_KEY')<providers.indexOf('GEMINI_API_KEY'),'OpenAI must be primary');
assert.match(providers,/pubmed\.ncbi\.nlm\.nih\.gov/);
assert.match(providers,/clinicaltrials\.gov/);
assert.match(providers,/fda\.gov/);
assert.match(providers,/no dosing|dosing/i);
assert.match(providers,/store['"]?\s*:\s*false/);
assert.match(providers,/Research provider attempt failed/,'provider failures must emit safe server-side diagnostic logs');
assert.match(providers,/provider:error\.provider/,'diagnostic logging must identify the failed provider without logging credentials');
assert.strictEqual(typeof providerModule.stripResearchCitations,'function','provider must expose citation sanitizer');
assert.strictEqual(
  providerModule.stripResearchCitations('Human evidence is absent. ([low quality](https://example.com/path?utm_source=openai)) Next sentence.'),
  'Human evidence is absent. Next sentence.'
);
assert.strictEqual(
  providerModule.stripResearchCitations('Mechanism summary [PubMed](https://pubmed.ncbi.nlm.nih.gov/123/?utm_source=openai).'),
  'Mechanism summary.'
);
assert.match(auth,/authorization/i);
assert.match(auth,/admin_users/);
console.log('admin research refresh contract passed');
