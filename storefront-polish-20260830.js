(()=>{
'use strict';
const cfg=window.AIBT_CONFIG||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb=window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey);
const cache=new Map();

function installHero(){
  const hero=document.querySelector('.hero');
  if(!hero||hero.dataset.aibtFinalHero==='1')return;
  hero.dataset.aibtFinalHero='1';
  hero.innerHTML=`<div class="aibt-hero-banner" role="img" aria-label="AI BioTech Precision Peptide Research Products banner with vial, cartridge and peptide pen">
    <button type="button" class="aibt-hero-hotspot aibt-hero-shop" aria-label="Shop Products"></button>
    <button type="button" class="aibt-hero-hotspot aibt-hero-research" aria-label="Explore Research"></button>
    <div class="aibt-sr-only"><h1>Precision Peptide Research Products</h1><p>Professional research catalog with accurate strength and format selection, trusted product presentation, and clean biotech design.</p></div>
  </div>`;
  hero.querySelector('.aibt-hero-shop')?.addEventListener('click',()=>window.showAllProducts?.());
  hero.querySelector('.aibt-hero-research')?.addEventListener('click',()=>window.openResearchCenter?.());
}

async function loadProduct(id){
  if(cache.has('p:'+id))return cache.get('p:'+id);
  if(!sb)throw new Error('Research database unavailable');
  const [pRes,rRes]=await Promise.all([
    sb.from('products').select('id,name,slug,short_description,long_description,category_id,categories(id,name,color,description),variants(id,strength_label,format,sku,price,stock_quantity,reserved_quantity,image_url,active)').eq('id',id).single(),
    sb.from('research_entries').select('title,category,short_summary,full_content,references_json,published').eq('product_id',id).maybeSingle()
  ]);
  if(pRes.error)throw pRes.error;
  const out={product:pRes.data,research:rRes.data||null};
  cache.set('p:'+id,out);
  return out;
}

async function loadGrounded(name){
  const key='ai:'+name.toUpperCase();
  if(cache.has(key))return cache.get(key);
  let data=null;
  try{
    const r=await fetch('/api/ai-product-insight?name='+encodeURIComponent(name),{headers:{Accept:'application/json'}});
    if(r.ok)data=await r.json();
  }catch{}
  cache.set(key,data);
  return data;
}

function paragraphs(text){
  const parts=String(text||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  return parts.map(x=>`<p>${esc(x)}</p>`).join('');
}
function pills(items){
  const a=Array.isArray(items)?items.filter(Boolean):[];
  return a.length?`<div class="aibt-research-pills">${a.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'';
}
function normalizeRefs(refs){
  if(!Array.isArray(refs))return [];
  return refs.map((x,i)=>{
    if(typeof x==='string')return {title:'Stored research reference '+(i+1),url:x};
    if(x&&typeof x==='object')return {title:x.title||x.name||x.source||('Stored research reference '+(i+1)),url:x.url||x.href||x.link||''};
    return null;
  }).filter(x=>x&&x.url);
}
function mergeRefs(stored,grounded){
  const out=[];
  for(const x of [...normalizeRefs(stored),...(Array.isArray(grounded)?grounded:[])]){
    const url=String(x?.url||'').trim(); if(!url||out.some(y=>y.url===url))continue;
    out.push({title:String(x?.title||'Research source'),url});
    if(out.length>=16)break;
  }
  return out;
}
function fallbackRefs(name){
  const q=encodeURIComponent(name);
  return [
    {title:'PubMed literature search',url:'https://pubmed.ncbi.nlm.nih.gov/?term='+q},
    {title:'ClinicalTrials.gov study search',url:'https://clinicaltrials.gov/search?term='+q},
    {title:'NIH / PMC full-text search',url:'https://pmc.ncbi.nlm.nih.gov/?term='+q},
    {title:'Google Scholar literature search',url:'https://scholar.google.com/scholar?q='+q}
  ];
}
function refsHtml(refs){
  return `<div class="aibt-source-grid">${refs.map((s,i)=>`<a href="${esc(s.url)}" target="_blank" rel="nofollow noreferrer"><b>${esc(s.title||('Research source '+(i+1)))}</b><small>Open source ↗</small></a>`).join('')}</div>`;
}
function detailShell(){
  let back=document.getElementById('aibtDeepResearch');
  if(back)return back;
  back=document.createElement('div');
  back.id='aibtDeepResearch'; back.className='aibt-deep-research';
  back.innerHTML='<article class="aibt-deep-card"><div class="aibt-research-loading">Loading detailed research profile and references…</div></article>';
  document.body.appendChild(back);
  back.addEventListener('click',e=>{if(e.target===back)closeDeepResearch();});
  return back;
}
function closeDeepResearch(){
  const back=document.getElementById('aibtDeepResearch');
  back?.classList.remove('show');
  const rc=document.getElementById('researchCenterPage');
  document.body.style.overflow=rc?.classList.contains('show')?'hidden':'';
}
window.closeDeepResearch=closeDeepResearch;

async function openDeepResearch(id){
  window.closeModal?.();
  const back=detailShell();
  back.innerHTML='<article class="aibt-deep-card"><button class="aibt-deep-close" type="button" aria-label="Close">×</button><div class="aibt-research-loading">Loading detailed research profile and references…</div></article>';
  back.querySelector('.aibt-deep-close')?.addEventListener('click',closeDeepResearch);
  back.classList.add('show'); document.body.style.overflow='hidden'; back.scrollTop=0;
  try{
    const base=await loadProduct(id); const p=base.product, r=base.research;
    const ai=await loadGrounded(p.name); const prof=ai?.profile||{};
    let refs=mergeRefs(r?.references_json,ai?.sources);
    if(!refs.length)refs=fallbackRefs(p.name);
    const cat=p.categories?.name||r?.category||'Research';
    const color=p.categories?.color||'#1477ff';
    const strengths=[...new Set((p.variants||[]).filter(v=>v.active!==false).map(v=>v.strength_label))];
    const summary=prof.short_description||((r?.short_summary&&!/research profile$/i.test(r.short_summary))?r.short_summary:'')||p.short_description||`${p.name} research overview.`;
    const overview=prof.overview||((r?.full_content&&!/research information linked to the active store product/i.test(r.full_content))?r.full_content:'');
    const identity=prof.molecular_identity||'';
    const klass=prof.molecular_class||'';
    const mechanism=prof.mechanism||'';
    const targets=prof.targets_and_pathways||[];
    const areas=prof.research_areas||[];
    const evidence=prof.evidence_context||'';
    const status=prof.development_status||'';
    const limits=prof.known_limitations||[];
    const cautions=prof.cautions||'';
    const sourceNotes=prof.source_notes||'';
    back.innerHTML=`<article class="aibt-deep-card" style="--research-accent:${esc(color)}">
      <button class="aibt-deep-close" type="button" aria-label="Close">×</button>
      <div class="aibt-deep-badge">${esc(cat)}</div>
      <h1>${esc(p.name)}</h1>
      <p class="aibt-deep-lead">${esc(summary)}</p>
      ${(klass||identity)?`<section><h2>Molecular identity</h2>${klass?`<div class="aibt-fact"><span>Molecular class</span><b>${esc(klass)}</b></div>`:''}${identity?`<p>${esc(identity)}</p>`:''}</section>`:''}
      ${mechanism?`<section><h2>Mechanism and pathways</h2>${paragraphs(mechanism)}${pills(targets)}</section>`:''}
      ${overview?`<section><h2>Research overview</h2>${paragraphs(overview)}</section>`:''}
      ${areas.length?`<section><h2>Research areas</h2>${pills(areas)}</section>`:''}
      ${evidence?`<section><h2>Evidence context</h2>${paragraphs(evidence)}</section>`:''}
      ${status?`<section><h2>Development status</h2><p>${esc(status)}</p></section>`:''}
      ${limits.length?`<section><h2>Known limitations and open questions</h2><ul>${limits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}
      <section><h2>Catalog strengths</h2>${pills(strengths.length?strengths:['See live catalog'])}</section>
      <section><div class="aibt-source-title"><div><h2>Research references</h2><p>${refs.length} source${refs.length===1?'':'s'} connected to this research view.</p></div></div>${refsHtml(refs)}${sourceNotes?`<p class="aibt-source-note">${esc(sourceNotes)}</p>`:''}</section>
      ${cautions?`<div class="aibt-research-caution"><b>Research context</b><p>${esc(cautions)}</p></div>`:''}
      <div class="aibt-research-disclaimer">Research reference only. This content summarizes molecule-level scientific context and does not establish identity, purity, equivalence, safety, efficacy or regulatory status of a specific supplied batch.</div>
    </article>`;
    back.querySelector('.aibt-deep-close')?.addEventListener('click',closeDeepResearch);
  }catch(err){
    back.innerHTML=`<article class="aibt-deep-card"><button class="aibt-deep-close" type="button">×</button><div class="aibt-research-loading">Research detail could not load. ${esc(err?.message||'Please try again.')}</div></article>`;
    back.querySelector('.aibt-deep-close')?.addEventListener('click',closeDeepResearch);
  }
}

function installOverrides(){
  installHero();
  window.openResearch=openDeepResearch;
  window.openResearchDetailCenter=openDeepResearch;
  const originalInfo=window.openProductInfo;
  if(typeof originalInfo==='function'&&!originalInfo.__aibtFinal){
    const wrapped=function(id){originalInfo(id);setTimeout(()=>{const ps=[...document.querySelectorAll('#modalBody .info-layout p')];ps.forEach(p=>{if(/staging content workflow|staging preview preserves/i.test(p.textContent||''))p.remove()});const col=document.querySelector('#modalBody .info-layout>div:last-child');if(col&&!col.querySelector('.aibt-info-note')){const n=document.createElement('p');n.className='aibt-info-note';n.textContent='Open Research Insight for the detailed molecular profile, evidence context and research references.';col.insertBefore(n,col.querySelector('.info-meta'));}},80)};
    wrapped.__aibtFinal=true; window.openProductInfo=wrapped;
  }
  const mo=new MutationObserver(()=>installHero());
  mo.observe(document.body,{childList:true,subtree:true});
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('aibtDeepResearch')?.classList.contains('show'))closeDeepResearch()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installOverrides,180),{once:true});else setTimeout(installOverrides,180);
})();