const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const f of ['admin-research.js','admin-research.css','research-staging-target.js'])assert.ok(fs.existsSync(path.join(root,f)),`${f} missing`);
const js=read('admin-research.js'),html=read('admin.html'),css=read('admin-research.css'),target=read('research-staging-target.js');
for(const text of ['Fetch New Research','Review Draft','Version History','Manual Draft','Published','Draft','Evidence Gate','High-quality sources','Warnings','verification_note','admin_publish_research_version','admin_reject_research_version','Approve & Publish','Reject'])assert.match(js,new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`missing admin research contract: ${text}`);
assert.match(js,/research_entry_versions/);
assert.match(js,/Authorization/);
assert.match(js,/window\.view/,'research module must safely wrap the existing admin navigation');
assert.doesNotMatch(js,/\.from\(['"]research_entries['"]\)\.update\(/i,'admin UI must publish through RPC only');
assert.match(target,/rpnwssqvurpdennpzplx/,'preview target must use AI BioTech Staging Supabase');
assert.ok(target.includes('git-(?:feature|review|staging)-'),'preview/staging host detection must be explicit');
assert.match(target,/createClient/,'preview target must intercept Supabase client creation');
assert.match(html,/research-staging-target\.js/,'admin must load staging Supabase target shim');
assert.ok(html.indexOf('research-staging-target.js')<html.indexOf('/admin.js'),'staging target shim must load before admin.js');
assert.match(html,/admin-research\.css/);
assert.match(html,/admin-research\.js/);
assert.match(css,/\.ar-modal-card\{[^}]*color:\s*#(?:1e293b|0f172a|243447)/i,'research modal must set an explicit readable dark text color');
assert.match(css,/\.ar-field\{[^}]*line-height:\s*(?:1\.5|1\.6|1\.65|1\.7)/i,'research review fields must use readable line height');
assert.match(css,/\.ar-product-card h3\{[^}]*color:\s*#(?:0f172a|1e293b|243447)/i,'research product names must set an explicit readable dark text color');

// Mobile Review Draft UX contract: compact evidence, collapsible long sections, and safe sticky actions.
for(const marker of ['ar-review-section','ar-review-summary','ar-review-content','ar-approval-actions'])assert.match(js,new RegExp(marker),`missing mobile review structure: ${marker}`);
assert.match(js,/<details[^>]*class=\"ar-review-section/i,'long review sections must use native collapsible details blocks');
assert.ok(js.indexOf('verification_note')<js.indexOf('data-ar-publish'),'verification note must stay before publish controls');
assert.match(css,/@media\(max-width:720px\)[\s\S]*\.ar-approval\{[^}]*position:\s*sticky/i,'mobile approval panel must remain sticky');
assert.match(css,/@media\(max-width:720px\)[\s\S]*\.ar-approval-actions[^}]*gap:\s*(?:10px|12px|14px|16px)/i,'mobile action buttons must have safe spacing');
assert.match(css,/@media\(max-width:720px\)[\s\S]*\.ar-approval-actions\s+\.btn[^}]*min-height:\s*(?:44px|46px|48px|50px|52px)/i,'mobile action buttons must have Android-safe touch height');
assert.match(css,/@media\(max-width:720px\)[\s\S]*\.ar-modal-card\{[^}]*max-height:\s*(?:96dvh|97dvh|98dvh|100dvh)/i,'mobile review modal must use more of the viewport');
console.log('admin research UI contract passed');
