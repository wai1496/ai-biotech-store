(()=>{
'use strict';
const SEEDS=['/','/admin.html','/member.html','/peptide-calculator.html'];
const IGNORE=/^(mailto:|tel:|javascript:|data:|#)/i;
const maxPages=60;

function card(html){const d=document.createElement('div');d.className='card';d.innerHTML=html;return d}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function sameOrigin(u){try{return new URL(u,location.origin).origin===location.origin}catch{return false}}
function clean(u){try{const x=new URL(u,location.origin);x.hash='';return x.pathname+x.search}catch{return null}}
async function check(path){
  const started=performance.now();
  try{
    let r=await fetch(path,{method:'HEAD',cache:'no-store',redirect:'follow'});
    if(r.status===405||r.status===501)r=await fetch(path,{method:'GET',cache:'no-store',redirect:'follow'});
    return {path,status:r.status,ok:r.ok,final:new URL(r.url).pathname,ms:Math.round(performance.now()-started),type:r.headers.get('content-type')||''};
  }catch(e){return {path,status:0,ok:false,final:path,ms:Math.round(performance.now()-started),error:e.message}}
}
async function discover(){
  const queue=[...SEEDS],seen=new Set(),links=new Set(SEEDS),pages=[];
  while(queue.length&&seen.size<maxPages){
    const path=queue.shift();if(seen.has(path))continue;seen.add(path);
    let r;try{r=await fetch(path,{cache:'no-store',redirect:'follow'})}catch{continue}
    const type=r.headers.get('content-type')||'';if(!r.ok||!type.includes('text/html'))continue;
    pages.push(path);
    const text=await r.text(),doc=new DOMParser().parseFromString(text,'text/html');
    for(const el of doc.querySelectorAll('[href],[src],form[action]')){
      const raw=el.getAttribute('href')||el.getAttribute('src')||el.getAttribute('action');
      if(!raw||IGNORE.test(raw)||!sameOrigin(raw))continue;
      const p=clean(raw);if(!p)continue;links.add(p);
      if(!seen.has(p)&&!queue.includes(p)&&/\.html(?:\?|$)|\/$/.test(p))queue.push(p);
    }
  }
  return {links:[...links].slice(0,250),pages};
}
function renderResults(host,results,meta){
  const broken=results.filter(x=>!x.ok),redirected=results.filter(x=>x.ok&&x.final!==new URL(x.path,location.origin).pathname),ok=results.filter(x=>x.ok&&!redirected.includes(x));
  host.innerHTML=`<div class="card"><h2>Website Auto Scan</h2><p class="muted">Scans internal pages, links, scripts, styles and permalink targets on the live site. Missing local files are automatically repaired by the legacy fallback route when a working copy exists.</p><div class="toolbar"><button class="btn primary" id="siteAuditRun">Scan website now</button><button class="btn" id="siteAuditBroken">Show broken only</button></div><div class="member-stats" style="margin-top:14px"><article><small>Checked</small><b>${results.length}</b></article><article><small>Healthy</small><b>${ok.length}</b></article><article><small>Auto-repaired / redirected</small><b>${redirected.length}</b></article><article><small>Still broken</small><b>${broken.length}</b></article></div><p class="muted">Pages crawled: ${meta.pages.length}. Last scan: ${new Date().toLocaleString()}</p><div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Path</th><th>Status</th><th>Result</th><th>ms</th></tr></thead><tbody id="siteAuditRows">${results.map(x=>`<tr data-broken="${x.ok?'0':'1'}"><td style="padding:8px">${esc(x.path)}</td><td>${x.status||'ERR'}</td><td>${x.ok?(x.final!==new URL(x.path,location.origin).pathname?'AUTO-FIXED':'OK'):'BROKEN'}</td><td>${x.ms}</td></tr>`).join('')}</tbody></table></div></div>`;
  host.querySelector('#siteAuditRun').onclick=()=>run(host);
  host.querySelector('#siteAuditBroken').onclick=e=>{const only=e.currentTarget.dataset.only!=='1';e.currentTarget.dataset.only=only?'1':'0';e.currentTarget.textContent=only?'Show all':'Show broken only';host.querySelectorAll('#siteAuditRows tr').forEach(tr=>tr.hidden=only&&tr.dataset.broken!=='1')};
}
async function run(host){
  host.innerHTML='<div class="notice">Scanning website links and permalinks…</div>';
  const meta=await discover();
  const results=[];
  for(let i=0;i<meta.links.length;i+=8){results.push(...await Promise.all(meta.links.slice(i,i+8).map(check)))}
  results.sort((a,b)=>Number(a.ok)-Number(b.ok)||a.path.localeCompare(b.path));
  renderResults(host,results,meta);
}
function openAudit(){const host=document.getElementById('content');if(!host)return;const title=document.getElementById('title');if(title)title.textContent='Website Scan';run(host)}
function install(){
  const nav=document.getElementById('nav');if(!nav)return false;
  if(nav.querySelector('[data-site-audit]'))return true;
  const b=document.createElement('button');b.type='button';b.dataset.siteAudit='1';b.textContent='Website Scan';b.onclick=openAudit;nav.appendChild(b);return true;
}
let tries=0;const t=setInterval(()=>{if(install()||++tries>80)clearInterval(t)},250);
window.aibtWebsiteAudit={run:openAudit};
})();
