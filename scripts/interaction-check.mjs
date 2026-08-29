import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[],warn=[];
const pages=['index.html','member.html','checkout.html','ops.html'];
const builtins=new Set(['open','focus','scrollIntoView','reload','print','close','showModal']);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const prodHost='yjauxyvtrmdriwtmckkl.supabase.co';
function hasProductionDataRef(text){
  const safeAsset=new RegExp(`https:\\/\\/${prodHost.replaceAll('.','\\.')}\\/storage\\/v1\\/object\\/public\\/[^'\"\\s)]+`,'g');
  return String(text||'').replace(safeAsset,'').includes(prodHost);
}
function localScripts(html){return [...html.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/gi)].map(m=>m[2].split('?')[0]).filter(x=>x.startsWith('/')).map(x=>x.slice(1)).filter(x=>fs.existsSync(path.join(root,x)));}
function exported(name,js){return new RegExp(`window\\.${name}\\s*=|window\\[(["'])${name}\\1\\]\\s*=|function\\s+${name}\\s*\\(`).test(js)}
for(const page of pages){
 if(!fs.existsSync(path.join(root,page))){fail.push(`${page}: missing`);continue}
 const html=read(page),scripts=localScripts(html),js=scripts.map(read).join('\n');
 const actionables=[...html.matchAll(/<(button|a)\b([^>]*)>/gi)];
 for(const m of actionables){const tag=m[1].toLowerCase(),attrs=m[2];
   const onclick=(attrs.match(/\bonclick=(["'])(.*?)\1/i)||[])[2]||'';
   const href=(attrs.match(/\bhref=(["'])(.*?)\1/i)||[])[2]||'';
   const type=(attrs.match(/\btype=(["'])(.*?)\1/i)||[])[2]||'';
   if(tag==='button'&&!onclick&&!/submit/i.test(type))warn.push(`${page}: button without inline action/submit contract: <button${attrs.slice(0,90)}>`);
   if(tag==='a'&&(!href||href==='#'||/^javascript:/i.test(href)))fail.push(`${page}: dead/placeholder link detected: ${href||'(no href)'}`);
   for(const fn of onclick.matchAll(/(?<!\.)\b([A-Za-z_$][\w$]*)\s*\(/g)){
     const name=fn[1];if(builtins.has(name)||['if','for','while','return'].includes(name))continue;
     if(!exported(name,js))fail.push(`${page}: ${name}() is called by a visible control but is not exported by its loaded local scripts`);
   }
 }
 const internal=[...html.matchAll(/\bhref=(["'])(\/[^"'#?]*)(?:[?#][^"']*)?\1/gi)].map(m=>m[2]);
 for(const href of internal){if(href==='/'||href.startsWith('/product/'))continue;const candidate=href.replace(/^\//,'');if(candidate&&!fs.existsSync(path.join(root,candidate)))fail.push(`${page}: internal route target does not exist: ${href}`)}
 for(const src of scripts){const text=read(src);if(/\b(prompt|confirm|alert)\s*\(/.test(text))fail.push(`${src}: native browser dialog is forbidden in active staging UI`);if(hasProductionDataRef(text))fail.push(`${src}: active staging script references a production Supabase data/auth/API endpoint`)}
}
if(fail.length){console.error('Interaction contract check FAILED:\n- '+[...new Set(fail)].join('\n- '));process.exit(1)}
console.log(`Interaction contract check passed for ${pages.length} active staging surfaces.`);
if(warn.length)console.warn('Interaction warnings:\n- '+[...new Set(warn)].join('\n- '));
