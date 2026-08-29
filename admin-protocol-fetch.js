(()=>{
'use strict';

function findDoseTable(tables){
  return (tables||[]).find(t=>Array.isArray(t)&&t.length>1&&t.some(r=>Array.isArray(r)&&r.some(c=>/dose|dosage|phase|week|schedule|frequency/i.test(String(c)))) ) || (tables||[])[0] || [];
}
function parseFetchedSchedule(table){
  if(!Array.isArray(table)||table.length<2)return [];
  return table.slice(1).map((r,i)=>{
    const cells=(r||[]).map(x=>String(x||'').trim()).filter(Boolean);
    if(!cells.length)return null;
    const joined=cells.join(' ');
    const amount=joined.match(/([0-9]+(?:\.[0-9]+)?)\s*mg\b/i);
    if(!amount)return null;
    const stage=cells.find(c=>/week|phase|start|increase|maint|titr|day|month/i.test(c))||`Stage ${i+1}`;
    const frequency=cells.find(c=>/daily|weekly|every\s+\d+|once|twice|monthly|per\s+day|per\s+week/i.test(c))||'';
    return [stage,amount[1],frequency,joined].join(' | ');
  }).filter(Boolean);
}
function sectionText(data,key){
  return (data.sections||[]).filter(s=>s?.key===key).map(s=>`${s.heading}\n${s.content}`).join('\n\n').trim();
}
function reviewFallback(label,data){
  const headings=(data.headings||[]).slice(0,10).join(' · ');
  return `REVIEW REQUIRED — ${label} was not clearly identified in the fetched exact reference page.${headings?` Page sections detected: ${headings}`:''}`;
}
function addFetchButton(){
  const f=window.editForm?.elements;
  if(!f?.protocol_variant || document.getElementById('aibtProtocolFetchFill'))return;
  const title=window.editTitle?.textContent||'';
  if(!/protocol/i.test(title))return;
  const button=document.createElement('button');
  button.type='button';
  button.id='aibtProtocolFetchFill';
  button.className='btn primary';
  button.textContent='Fetch Reference & Fill All';
  button.style.marginBottom='10px';
  button.onclick=fetchProtocolIntoForm;
  const first=window.fields?.firstElementChild;
  window.fields?.insertBefore(button,first||null);
}
async function fetchProtocolIntoForm(){
  const f=editForm.elements;
  const v=(protocolVariants||[]).find(x=>x.id===f.protocol_variant.value);
  if(!v)return flash('Choose the exact product / strength / format first');
  const btn=document.getElementById('aibtProtocolFetchFill');
  const old=btn?.textContent;
  if(btn){btn.disabled=true;btn.textContent='Fetching & filling…'}
  try{
    const {data,error}=await sb.functions.invoke('protocol-reference-fetch',{body:{product:v.products?.name||v.product_id,strength:v.strength_label,format:v.format}});
    if(error)throw error;
    if(!data?.found)throw new Error(data?.message||data?.error||'No exact reference page was found');
    const table=findDoseTable(data.tables||[]),schedule=parseFetchedSchedule(table);
    const prep=sectionText(data,'preparation');
    const timing=sectionText(data,'timing');
    const duration=sectionText(data,'duration');
    const sourceNotes=sectionText(data,'notes');
    const cfg=protocolConfigs?.[v.id];

    if(f.source_url)f.source_url.value=data.source_url||'';
    if(f.source_product)f.source_product.value=v.products?.name||v.product_id||'';
    if(f.source_strength)f.source_strength.value=v.strength_label||'';
    if(f.protocol_title)f.protocol_title.value=`AI BioTech Product Guide — ${v.products?.name||v.product_id} ${v.strength_label} ${v.format}`;
    if(f.schedule)f.schedule.value=schedule.length?schedule.join('\n'):reviewFallback('dosage schedule',data);
    if(f.preparation)f.preparation.value=prep||reviewFallback('preparation / reconstitution',data);
    if(f.timing)f.timing.value=timing||reviewFallback('timing',data);
    if(f.duration)f.duration.value=duration||reviewFallback('duration / cycle',data);

    if(f.fill_volume){
      if(cfg?.fill_volume_ml!=null)f.fill_volume.value=cfg.fill_volume_ml;
      else f.fill_volume.value='';
    }
    if(f.concentration){
      if(cfg?.concentration_mg_ml!=null)f.concentration.value=cfg.concentration_mg_ml;
      else f.concentration.value='';
    }
    if(f.priming_units){
      if(cfg?.priming_units!=null)f.priming_units.value=cfg.priming_units;
      else f.priming_units.value='';
    }
    if(f.config_status)f.config_status.value=cfg?.configuration_status==='verified'?'verified':'review_required';
    if(f.protocol_status)f.protocol_status.value='review_required';

    const auditNote=`FETCHED DRAFT — ${new Date(data.retrieved_at||Date.now()).toLocaleString()}\nSource: ${data.source_title||data.source_url}\nExact variant: ${v.products?.name||v.product_id} / ${v.strength_label} / ${v.format}\n${schedule.length?`${schedule.length} dosage rows parsed from the source table.`:'Dosage table requires manual review; no reliable mg rows were parsed.'}\n${cfg?.configuration_status==='verified'?'Existing verified calculation configuration was retained.':'Calculation configuration still requires review; no numeric values were invented.'}\nReview every populated field before changing status to verified/published.`;
    if(f.protocol_notes)f.protocol_notes.value=[sourceNotes||reviewFallback('source notes / cautions',data),auditNote].filter(Boolean).join('\n\n');

    flash('Fetched and filled all reviewable protocol fields. Please review before saving or publishing.');
  }catch(e){
    flash(`Fetch failed: ${e?.message||String(e)}`);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=old||'Fetch Reference & Fill All'}
  }
}

const observer=new MutationObserver(()=>addFetchButton());
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',addFetchButton);
})();
