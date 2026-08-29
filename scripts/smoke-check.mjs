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
    if(!rewrites.some(r=>r.source==='/product/:slug'&&r.destination==='/product.html?product=:slug'))warnings.push('vercel.json: clean product permalink rewrite was not detected');
  }catch(error){failures.push(`vercel.json is invalid JSON: ${error.message}`)}
}

if(failures.length){
  console.error('\nSite smoke check FAILED:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log(`Site smoke check passed: ${htmlFiles.length} HTML files and ${cssFiles.length} CSS files inspected.`);
if(warnings.length)console.warn('Warnings:\n- '+warnings.join('\n- '));
