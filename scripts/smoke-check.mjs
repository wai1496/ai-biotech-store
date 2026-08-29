import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const warnings=[];
const required=[
  'index.html','admin.html','member.html','checkout.html','peptide-calculator.html',
  'product.html','research-insight.html','vercel.json'
];

for(const file of required){
  if(!fs.existsSync(path.join(root,file)))failures.push(`Missing required route file: ${file}`);
}

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));else out.push(full);
  }
  return out;
}

const files=walk(root);
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const cssFiles=files.filter(f=>f.endsWith('.css'));
const webTextFiles=files.filter(f=>/\.(?:html|js|css|json)$/.test(f));

function localTarget(raw,source){
  if(!raw)return null;
  const value=raw.trim();
  if(!value||/^(?:https?:|\/\/|#|mailto:|tel:|data:|blob:|javascript:)/i.test(value))return null;
  const clean=value.split('#')[0].split('?')[0];
  if(!clean)return null;
  if(clean==='/'||clean==='.')return path.join(root,'index.html');
  if(/^\/(?:product\/[^/]+|api\/)/.test(clean))return null;
  if(clean.startsWith('/'))return path.join(root,clean.slice(1));
  return path.resolve(path.dirname(source),clean);
}

for(const file of htmlFiles){
  const text=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file);
  const refs=[];
  for(const match of text.matchAll(/\b(?:src|href)=(["'])(.*?)\1/gi))refs.push(match[2]);
  for(const raw of refs){
    const target=localTarget(raw,file);
    if(!target)continue;
    if(!fs.existsSync(target))failures.push(`${rel}: missing local asset/route ${raw}`);
  }
  const scripts=[...text.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/gi)].map(m=>m[2].split('?')[0]);
  const duplicates=[...new Set(scripts.filter((x,i,a)=>a.indexOf(x)!==i))];
  for(const src of duplicates)failures.push(`${rel}: duplicate script include ${src}`);
}

for(const file of cssFiles){
  const text=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file);
  for(const match of text.matchAll(/url\((['"]?)(.*?)\1\)/gi)){
    const target=localTarget(match[2],file);
    if(target&&!fs.existsSync(target))failures.push(`${rel}: missing CSS asset ${match[2]}`);
  }
}

const forbiddenHost='ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app';
for(const file of webTextFiles){
  const text=fs.readFileSync(file,'utf8');
  if(text.includes(forbiddenHost))failures.push(`${path.relative(root,file)}: still depends on protected legacy deployment`);
}

for(const file of ['index.html','admin.html','member.html','checkout.html','research-insight.html']){
  const full=path.join(root,file);
  if(fs.existsSync(full)&&fs.readFileSync(full,'utf8').includes('/plain.html'))failures.push(`${file}: customer/admin navigation still points to legacy /plain.html`);
}

const vercelPath=path.join(root,'vercel.json');
if(fs.existsSync(vercelPath)){
  try{
    const config=JSON.parse(fs.readFileSync(vercelPath,'utf8'));
    const rewrites=Array.isArray(config.rewrites)?config.rewrites:[];
    const redirects=Array.isArray(config.redirects)?config.redirects:[];
    const headers=Array.isArray(config.headers)?config.headers:[];
    if(!rewrites.some(r=>r.source==='/product/:id'&&r.destination==='/?product=:id'))failures.push('vercel.json: clean product permalink rewrite is missing');
    if(!redirects.some(r=>r.source==='/plain.html'&&r.destination==='/'))warnings.push('vercel.json: legacy /plain.html is not redirected to the main store');
    const allHeaders=headers.flatMap(rule=>rule.headers||[]).map(h=>String(h.key||'').toLowerCase());
    for(const key of ['x-content-type-options','referrer-policy','permissions-policy'])if(!allHeaders.includes(key))warnings.push(`vercel.json: recommended ${key} header is missing`);
  }catch(error){failures.push(`vercel.json is invalid JSON: ${error.message}`)}
}

// Staging-specific release gate: clean storefront assets, isolation and inline handler wiring.
const stagingConfigPath=path.join(root,'staging-config.js');
if(fs.existsSync(stagingConfigPath)){
  for(const file of ['clean-store.css','clean-store.js','staging-config.js']){
    if(!fs.existsSync(path.join(root,file)))failures.push(`Staging: missing required clean storefront file ${file}`);
  }
  const stagingConfig=fs.readFileSync(stagingConfigPath,'utf8');
  if(!stagingConfig.includes("environment: 'staging'"))failures.push('Staging: environment flag is not set to staging');
  if(!stagingConfig.includes('rpnwssqvurpdennpzplx.supabase.co'))failures.push('Staging: storefront is not configured for the isolated staging Supabase project');
  if(stagingConfig.includes('yjauxyvtrmdriwtmckkl.supabase.co'))failures.push('Staging: staging config points at production Supabase');

  const indexPath=path.join(root,'index.html');
  const indexText=fs.readFileSync(indexPath,'utf8');
  if(!/noindex\s*,?\s*nofollow/i.test(indexText))failures.push('Staging: preview page must remain noindex,nofollow');
  if(indexText.includes('biotech-animated-background.js'))failures.push('Staging: dark animated DNA script is loaded in the default clean theme');
  if(!indexText.includes('/clean-store.css')||!indexText.includes('/clean-store.js'))failures.push('Staging: clean storefront assets are not loaded');

  const localScripts=[...indexText.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/gi)]
    .map(m=>m[2].split('?')[0])
    .filter(src=>src.startsWith('/'))
    .map(src=>path.join(root,src.slice(1)))
    .filter(src=>fs.existsSync(src));
  const jsText=localScripts.map(file=>fs.readFileSync(file,'utf8')).join('\n');
  const onclickNames=[...indexText.matchAll(/\bonclick=(["'])\s*([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[2]);
  const uniqueHandlers=[...new Set(onclickNames)];
  for(const name of uniqueHandlers){
    const exported=new RegExp(`window\\.${name}\\s*=`).test(jsText);
    if(!exported)failures.push(`Staging: inline control calls ${name}() but no global window.${name} handler is exported`);
  }

  const requiredHandlers=['scrollToId','showAllProducts','toggleMobileMenu','openStageAccount','openCart','setCategory','openGuide','toast','closeCart','stageCheckout','closeModal','closeMobileMenu'];
  for(const name of requiredHandlers){
    if(!new RegExp(`window\\.${name}\\s*=`).test(jsText))failures.push(`Staging: critical interaction handler window.${name} is missing`);
  }
}

if(failures.length){
  console.error('\nSite smoke check FAILED:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log(`Site smoke check passed: ${htmlFiles.length} HTML files and ${cssFiles.length} CSS files inspected.`);
if(warnings.length)console.warn('Warnings:\n- '+warnings.join('\n- '));
