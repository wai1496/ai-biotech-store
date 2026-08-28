(()=>{
'use strict';

function modalShell(title, subtitle, body, actions=''){
  const d=document.createElement('dialog');
  d.className='aibt-modal';
  d.innerHTML=`<form method="dialog"><h2>${esc(title)}</h2><p class="sub">${esc(subtitle||'')}</p>${body}<footer>${actions}</footer></form>`;
  document.getElementById('aibtModalHost')?.appendChild(d);
  d.addEventListener('close',()=>setTimeout(()=>d.remove(),0),{once:true});
  d.showModal();
  return d;
}

function stockReasonDialog(changes){
  return new Promise(resolve=>{
    const first=changes[0]||{};
    const rows=changes.map(x=>`<div><small>${esc(x.name||'Variant')}</small><b>${esc(x.old)} → ${esc(x.next)} (${x.delta>0?'+':''}${esc(x.delta)})</b></div>`).join('');
    const d=modalShell('Confirm stock change','A reason is required and the change will be recorded.',`<div class="summary">${rows}</div><label>Reason for Stock Change<select name="reason"><option value="">Choose a reason</option><option>New stock received</option><option>Manual stock count</option><option>Damaged stock</option><option>Expired / removed stock</option><option>Order correction</option><option>Returned stock</option><option>Sample / internal use</option><option>Inventory adjustment</option><option>Other</option></select></label><label>Internal note<textarea name="note" placeholder="Optional details"></textarea></label>`,`<button class="btn" value="cancel">Cancel</button><button type="button" class="btn primary" data-confirm>Confirm Stock Update</button>`);
    const f=d.querySelector('form'),reason=f.elements.reason,note=f.elements.note;
    d.querySelector('[data-confirm]').onclick=()=>{
      const r=reason.value.trim(),n=note.value.trim();
      if(!r)return flash('Choose a stock-change reason');
      if(r==='Other'&&n.length<3)return flash('Please explain the reason');
      d.returnValue='ok';d.close();resolve({reason:r,note:n,combined:n?`${r} — ${n}`:r});
    };
    d.addEventListener('cancel',()=>resolve(null),{once:true});
    d.querySelector('[value="cancel"]').addEventListener('click',()=>resolve(null),{once:true});
  });
}

const originalSaveProductEditor=saveProductEditor;
saveProductEditor=async function(e,r){
  e.preventDefault();
  const f=editForm.elements,variants=readVariantRows();
  if(variants.some(v=>!v.strength_label||!v.strength||!v.format))return flash('Every variant needs strength, label and format');
  if(variants.some(v=>Number(v.stock_quantity)<0))return flash('Stock cannot be negative');
  const changes=variants.filter(v=>Number(v.stock_quantity)!==Number(v._oldStock)).map(v=>({name:`${v.strength_label} / ${v.format}`,old:Number(v._oldStock||0),next:Number(v.stock_quantity||0),delta:Number(v.stock_quantity||0)-Number(v._oldStock||0)}));
  let stockReason=null;
  if(changes.length){
    const result=await stockReasonDialog(changes);
    if(!result)return flash('Stock update cancelled');
    stockReason=result.combined;
  }
  const product={name:f.p_name.value,slug:f.p_slug.value,category_id:f.p_category_id.value||null,product_type:f.p_product_type.value,status:f.p_status.value,featured:f.p_featured.checked,published:f.p_published.checked,main_image_url:f.p_main_image_url.value||null,short_description:f.p_short_description.value,long_description:f.p_long_description.value,seo_title:f.p_seo_title.value||null,seo_description:f.p_seo_description.value||null,tags:f.p_tags.value.split(',').map(x=>x.trim()).filter(Boolean)};
  saveEdit.disabled=true;
  const {error}=await sb.rpc('admin_save_product',{p_product_id:r.id,p_product:product,p_variants:variants,p_stock_reason:stockReason});
  saveEdit.disabled=false;
  if(error)return flash(error.message);
  editor.close();editor.classList.remove('product-editor');fields.className='fields';flash('Product and variants saved');table('products');
};

stock=async function(i){
  const r=rows[i],old=Number(r.stock_quantity||0);
  const d=modalShell('Adjust inventory',`${r.strength_label||r.id} / ${r.format||''}`,`<div class="summary"><div><small>Current stock</small><b>${old}</b></div><div><small>SKU</small><b>${esc(r.sku||'—')}</b></div></div><label>New stock quantity<input name="qty" type="number" min="0" step="1" value="${old}" required></label><label>Reason<select name="reason"><option value="">Choose a reason</option><option>New stock received</option><option>Manual stock count</option><option>Damaged stock</option><option>Expired / removed stock</option><option>Order correction</option><option>Returned stock</option><option>Sample / internal use</option><option>Inventory adjustment</option><option>Other</option></select></label><label>Internal note<textarea name="note"></textarea></label>`,`<button class="btn" value="cancel">Cancel</button><button type="button" class="btn primary" data-confirm>Confirm Stock Update</button>`);
  d.querySelector('[data-confirm]').onclick=async()=>{
    const f=d.querySelector('form').elements,n=Number(f.qty.value),reason=f.reason.value.trim(),note=f.note.value.trim();
    if(!Number.isInteger(n)||n<0)return flash('Enter a valid non-negative stock quantity');
    if(n===old){d.close();return flash('Stock quantity did not change')}
    if(!reason)return flash('Choose a reason');
    if(reason==='Other'&&note.length<3)return flash('Please explain the reason');
    d.querySelector('[data-confirm]').disabled=true;
    const {error}=await sb.rpc('adjust_inventory',{p_variant_id:r.id,p_new_stock:n,p_reason:note?`${reason} — ${note}`:reason});
    if(error){d.querySelector('[data-confirm]').disabled=false;return flash(error.message)}
    d.close();flash('Stock adjusted with history');table(current);
  };
};

function deleteVariantDialog(v,index){
  if(!v.id){productVariants.splice(index,1);renderVariantRows();return}
  const d=modalShell('Delete Product Variant','The variant will be archived so historical orders, invoices and stock records remain intact.',`<div class="summary"><div><small>Variant</small><b>${esc(v.strength_label||'—')} / ${esc(v.format||'—')}</b></div><div><small>SKU</small><b>${esc(v.sku||'—')}</b></div></div><label>Reason<input name="reason" placeholder="Required reason for removal" required></label><p class="sub">This removes the variant from normal storefront availability without deleting historical records.</p>`,`<button class="btn" value="cancel">Cancel</button><button type="button" class="btn danger" data-delete>Delete Variant</button>`);
  d.querySelector('[data-delete]').onclick=async()=>{
    const reason=d.querySelector('[name="reason"]').value.trim();
    if(reason.length<3)return flash('A reason is required');
    const btn=d.querySelector('[data-delete]');btn.disabled=true;
    const {error}=await sb.from('variants').update({active:false,archived_at:new Date().toISOString()}).eq('id',v.id);
    if(error){btn.disabled=false;return flash(error.message)}
    try{
      const {data:{user}}=await sb.auth.getUser();
      await sb.from('audit_logs').insert({admin_user_id:user?.id||null,entity_type:'variant',entity_id:v.id,action:`archived: ${reason}`,created_at:new Date().toISOString()});
    }catch(_){ }
    productVariants.splice(index,1);d.close();renderVariantRows();flash('Variant archived; historical records preserved');
  };
}

const originalRenderVariantRows=renderVariantRows;
renderVariantRows=function(){
  originalRenderVariantRows();
  document.querySelectorAll('.variant-card').forEach((card,i)=>{
    const header=card.querySelector('header');if(!header||header.querySelector('.variant-delete'))return;
    const actions=document.createElement('div');actions.className='variant-actions';
    const del=document.createElement('button');del.type='button';del.className='btn variant-delete';del.textContent='Delete variant';del.onclick=()=>deleteVariantDialog(productVariants[i],i);
    const active=header.querySelector('.check');if(active)actions.appendChild(active);actions.appendChild(del);header.appendChild(actions);
  });
};

function peptideNameFromEditor(){
  const f=editForm.elements;
  return (f.p_name?.value||'').trim();
}
function peptideStrengthsFromEditor(){
  try{return readVariantRows().map(v=>v.strength_label).filter(Boolean)}catch{return[]}
}
function cleanText(s){return String(s||'').replace(/\s+/g,' ').trim()}
async function fetchPubMed(term){
  const es=await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=6&sort=relevance&term=${encodeURIComponent(term+' peptide')}`);
  if(!es.ok)throw new Error('PubMed search failed');
  const ids=(await es.json()).esearchresult?.idlist||[];if(!ids.length)return[];
  const ef=await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(',')}`);
  if(!ef.ok)throw new Error('PubMed detail fetch failed');
  const xml=new DOMParser().parseFromString(await ef.text(),'text/xml');
  return [...xml.querySelectorAll('PubmedArticle')].map((a,idx)=>{
    const id=ids[idx]||cleanText(a.querySelector('PMID')?.textContent),title=cleanText(a.querySelector('ArticleTitle')?.textContent),journal=cleanText(a.querySelector('Journal Title')?.textContent||a.querySelector('ISOAbbreviation')?.textContent),date=cleanText(a.querySelector('PubDate')?.textContent),abstract=cleanText([...a.querySelectorAll('AbstractText')].map(x=>x.textContent).join(' '));
    return {title,publisher:journal||'PubMed indexed journal',date,url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,type:'Peer-reviewed / PubMed',abstract};
  }).filter(x=>x.title);
}
async function fetchClinicalTrials(term){
  try{
    const r=await fetch(`https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(term)}&pageSize=5&format=json`);if(!r.ok)return[];
    const j=await r.json();
    return (j.studies||[]).map(s=>{const p=s.protocolSection||{},id=p.identificationModule?.nctId,title=p.identificationModule?.briefTitle,status=p.statusModule?.overallStatus,date=p.statusModule?.studyFirstPostDateStruct?.date||'';return {title:cleanText(title),publisher:'ClinicalTrials.gov',date,url:id?`https://clinicaltrials.gov/study/${id}`:'https://clinicaltrials.gov/',type:`Clinical trial registry${status?' · '+status:''}`,abstract:cleanText(p.descriptionModule?.briefSummary)}}).filter(x=>x.title);
  }catch{return[]}
}
function keywordsFromSources(name,sources){
  const stop=new Set(('the and for with from into using study studies effects effect role peptide peptides human humans mice mouse rat rats evaluation analysis potential treatment clinical trial randomized of in on to a an is are was were by as at its').split(' '));
  const counts={};
  for(const s of sources)for(const w of (s.title||'').toLowerCase().replace(/[^a-z0-9- ]/g,' ').split(/\s+/)){if(w.length<4||stop.has(w)||w===name.toLowerCase())continue;counts[w]=(counts[w]||0)+1}
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7).map(x=>x[0]);
}
function buildDraft(field,name,sources){
  const keys=keywordsFromSources(name,sources),areas=keys.length?keys.slice(0,4).join(', '):'current biomedical research';
  const human=sources.some(x=>x.type.includes('Clinical trial')||/human|patient|participants/i.test(x.title+' '+x.abstract));
  const caution=`The available literature includes ${human?'human/clinical and preclinical':'primarily preclinical or early-stage'} evidence; findings should not be presented as established efficacy unless supported by the cited study.`;
  if(field==='p_short_description')return `${name} is a research compound investigated in scientific literature relating to ${areas}. ${caution}`;
  if(field==='p_seo_title')return `${name} Research Overview | AI BioTech`;
  if(field==='p_seo_description')return `Research-focused overview of ${name}, including current scientific literature, study context and source references.`;
  if(field==='p_tags')return [name,...keys].join(', ');
  const studies=sources.slice(0,6).map((s,i)=>`${i+1}. ${s.title}${s.publisher?' — '+s.publisher:''}${s.date?' ('+s.date+')':''}`).join('\n');
  return `${name} — Research Overview\n\n${name} appears in current scientific literature across research areas including ${areas}. ${caution}\n\nCurrent source set\n${studies}\n\nResearch note\nThis content summarizes source discovery for research information only. Review each source before publishing and keep preclinical, animal, observational and human evidence clearly distinguished.`;
}
function sourceCards(sources){return sources.map(s=>`<article class="peptides-ai-source"><span class="aibt-badge">${esc(s.type)}</span><h4>${esc(s.title)}</h4><p>${esc(s.publisher||'')} ${s.date?'· '+esc(s.date):''}</p>${s.abstract?`<p>${esc(s.abstract.slice(0,420))}${s.abstract.length>420?'…':''}</p>`:''}<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">View Source ↗</a></article>`).join('')}
async function openPeptidesAI(field){
  const name=peptideNameFromEditor();if(!name)return flash('Enter the peptide/product name first');
  const target=editForm.elements[field];if(!target)return flash('This field is unavailable');
  const d=modalShell('✨ Peptides AI',`${name}${peptideStrengthsFromEditor().length?' · '+peptideStrengthsFromEditor().join(', '):''}`,`<div class="peptides-ai-panel"><div class="peptides-ai-status" data-status>Searching PubMed and ClinicalTrials.gov for current source material…</div><textarea class="peptides-ai-output" data-output placeholder="Generated draft will appear here"></textarea><div class="peptides-ai-actions"><button type="button" class="btn" data-refresh>Refresh Sources</button><button type="button" class="btn" data-shorter>Make Shorter</button><button type="button" class="btn" data-detailed>More Detailed</button></div><section data-sources></section></div>`,`<button class="btn" value="cancel">Cancel</button><button type="button" class="btn primary" data-insert>Insert</button>`);
  const status=d.querySelector('[data-status]'),out=d.querySelector('[data-output]'),src=d.querySelector('[data-sources]');
  let sources=[];
  async function research(){
    status.textContent='Searching credible scientific sources…';src.innerHTML='';
    try{
      const results=await Promise.allSettled([fetchPubMed(name),fetchClinicalTrials(name)]);
      sources=results.flatMap(x=>x.status==='fulfilled'?x.value:[]).filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i);
      if(!sources.length)throw new Error('No reliable sources were returned for this query');
      out.value=buildDraft(field,name,sources);src.innerHTML=sourceCards(sources);status.textContent=`${sources.length} sources found · fetched ${new Date().toLocaleString()}. Review before inserting.`;
    }catch(err){status.textContent=`Unable to fetch reliable sources: ${err.message}. No text was inserted.`}
  }
  d.querySelector('[data-refresh]').onclick=research;
  d.querySelector('[data-shorter]').onclick=()=>{out.value=out.value.split(/\n\n/).slice(0,2).join('\n\n')};
  d.querySelector('[data-detailed]').onclick=()=>{if(sources.length)out.value=buildDraft('p_long_description',name,sources)};
  d.querySelector('[data-insert]').onclick=()=>{if(!out.value.trim())return flash('Nothing to insert');target.value=out.value.trim();target.dispatchEvent(new Event('input',{bubbles:true}));d.close();flash('Peptides AI draft inserted for your review')};
  await research();
}

function installPeptidesButtons(){
  const supported=['p_short_description','p_long_description','p_seo_title','p_seo_description','p_tags'];
  for(const name of supported){
    const el=editForm.elements[name];if(!el)continue;const label=el.closest('label');if(!label||label.querySelector(`[data-ai-for="${name}"]`))continue;
    const b=document.createElement('button');b.type='button';b.className='peptides-ai-btn';b.dataset.aiFor=name;b.textContent='✨ Peptides AI';b.onclick=()=>openPeptidesAI(name);label.appendChild(b);
  }
}
const originalEditProduct=editProduct;
editProduct=async function(i){await originalEditProduct(i);installPeptidesButtons()};
new MutationObserver(()=>{if(editor?.open)installPeptidesButtons()}).observe(document.body,{childList:true,subtree:true});

console.info('AI BioTech admin enhancements loaded: stock modal, variant archive, Peptides AI');
})();
