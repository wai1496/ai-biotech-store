import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const html=fs.readFileSync(path.join(root,'ops.html'),'utf8');
const scriptPaths=[...html.matchAll(/<script\b[^>]*\bsrc=["'](\/[^"']+)["']/gi)]
  .map(m=>m[1].split('?')[0].replace(/^\//,''))
  .filter(p=>fs.existsSync(path.join(root,p)));
const scripts=scriptPaths.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
const views=[...new Set([...html.matchAll(/data-view=["']([^"']+)["']/gi)].map(m=>m[1]))];
const failures=[];

for(const view of views){
  const quoted=new RegExp(`["']${view.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`);
  if(!quoted.test(scripts)) failures.push(`No loaded Operations script claims or references nav view: ${view}`);
}

for(const fn of ['opsSignIn','opsCreateAccount','opsResetPassword','opsSignOut','openOpsView','toggleOpsSidebar','closeOpsDialog']){
  const re=new RegExp(`window\\.${fn}\\s*=|function\\s+${fn}\\s*\\(`);
  if(!re.test(scripts)) failures.push(`Operations control is missing exported handler: ${fn}`);
}

for(const required of ['products','inventory','customers','orders','shipping','pages','media','integrations','protocols','health','recovery']){
  if(!views.includes(required)) failures.push(`Required Operations navigation view missing from ops.html: ${required}`);
}

if(!/STAGING OPERATIONS CONTROL CENTER — NO PRODUCTION WRITES/.test(html)) failures.push('Operations staging safety banner is missing');
if(!/Protected Administration/.test(html)) failures.push('Operations protected login surface is missing');

if(failures.length){
  console.error('Operations navigation contract FAILED:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log(`Operations navigation contract passed for ${views.length} nav views across ${scriptPaths.length} loaded local scripts.`);
