import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[];
const req=['storefront-control.js','storefront-control.css','ops-control.js','ops-control.css','ops-intelligence.js','ops-intelligence.css','api/staging-ai-product.js','staging-config.js','ops.html'];
for(const f of req)if(!fs.existsSync(path.join(root,f)))fail.push(`missing ${f}`);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
if(fs.existsSync(path.join(root,'vercel.json'))){const v=JSON.parse(read('vercel.json'));if(v?.git?.deploymentEnabled?.['staging/master-build']!==false)fail.push('staging/master-build must not auto-deploy to Vercel');}
const control=read('ops-control.js'),intel=read('ops-intelligence.js'),store=read('storefront-control.js'),api=read('api/staging-ai-product.js'),opsHtml=read('ops.html');
for(const [name,text] of [['ops-control.js',control],['ops-intelligence.js',intel]])for(const bad of ['prompt(','confirm('])if(text.includes(bad))fail.push(`${name} contains forbidden native ${bad.slice(0,-1)} dialog`);
for(const rpc of ['ops_save_site_control','ops_save_page','ops_save_menu_item','ops_save_media_template','ops_toggle_feature','ops_save_integration'])if(!control.includes(rpc))fail.push(`ops-control.js missing controlled RPC ${rpc}`);
if(!intel.includes("ops_update_product")||!intel.includes("p_source:'ai'"))fail.push('Product Intelligence must write via ops_update_product with AI source attribution');
if(!intel.includes('/api/staging-ai-product'))fail.push('Product Intelligence is not wired to staging-only AI endpoint');
for(const table of ['site_control','menu_items','content_pages'])if(!store.includes(`from('${table}')`))fail.push(`storefront-control.js is not reading ${table}`);
for(const token of ["process.env.VERCEL_ENV==='production'",'rpnwssqvurpdennpzplx.supabase.co','admin_users','GEMINI_API_KEY','Authenticated staging admin required'])if(!api.includes(token))fail.push(`staging AI endpoint missing protection/config token: ${token}`);
if(api.includes('yjauxyvtrmdriwtmckkl.supabase.co'))fail.push('staging AI endpoint references production Supabase');
for(const asset of ['/ops-control.js','/ops-intelligence.js','/ops-control.css','/ops-intelligence.css'])if(!opsHtml.includes(asset))fail.push(`ops.html missing ${asset}`);
for(const view of ['pages','media','themes','features','integrations','intelligence'])if(!opsHtml.includes(`data-view="${view}"`))fail.push(`ops.html missing working navigation entry ${view}`);
if(fail.length){console.error('Staging control check FAILED:\n- '+fail.join('\n- '));process.exit(1)}
console.log('Staging control check passed: audited controls, AI isolation, Vercel throttling guard and module wiring verified.');
