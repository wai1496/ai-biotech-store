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
function addFetchButton(){
  const f=window.editForm?.elements;
  if(!f?.protocol_variant || document.getElementById('aibtProtocolFetchFill'))return;
  const title=window.editTitle?.textContent||'';
  if(!/protocol/i.test(title))return;
  const button=document.createElement('button');
  button.type='button';
  button.id='aibtProtocolFetchFill';
  button.className='btn primary';
  button.textContent='Fetch Reference & Fill';
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
  if(btn){btn.disabled=true;btn.textContent='Fetching…'}
  try{
    const {data,error}=await sb.functions.invoke('protocol-reference-fetch',{body:{product:v.products?.name||v.product_id,strength:v.strength_label,format:v.format}});
    if(error)throw error;
    if(!data?.found)throw new Error(data?.message||data?.error||'No exact reference page was found');
    const table=findDoseTable(data.tables||[]),schedule=parseFetchedSchedule(table);
    if(f.source_url)f.source_url.value=data.source_url||'';
    if(f.source_product)f.source_product.value=v.products?.name||v.product_id||'';
    if(f.source_strength)f.source_strength.value=v.strength_label||'';
    if(f.protocol_title && !f.protocol_title.value.trim())f.protocol_title.value=`AI BioTech Product Guide — ${v.products?.name||v.product_id} ${v.strength_label} ${v.format}`;
    if(f.schedule && schedule.length)f.schedule.value=schedule.join('\n');
    if(f.config_status)f.config_status.value='review_required';
    if(f.protocol_status)f.protocol_status.value='review_required';
    const cfg=protocolConfigs?.[v.id];
    if(f.fill_volume && !f.fill_volume.value && cfg?.fill_volume_ml!=null)f.fill_volume.value=cfg.fill_volume_ml;
    if(f.concentration && !f.concentration.value && cfg?.concentration_mg_ml!=null)f.concentration.value=cfg.concentration_mg_ml;
    if(f.priming_units && !f.priming_units.value && cfg?.priming_units!=null)f.priming_units.value=cfg.priming_units;
    const note=`Fetched ${new Date(data.retrieved_at||Date.now()).toLocaleString()} from the exact reference page. Review every dosage row, timing, duration, preparation instruction, concentration and calculated unit before changing status to verified/published.`;
    if(f.protocol_notes)f.protocol_notes.value=[f.protocol_notes.value.trim(),note].filter(Boolean).join('\n\n');
    if(!schedule.length)flash('Reference found, but no dosage rows could be parsed automatically. Source fields were filled for manual review.');
    else flash(`${schedule.length} dosage row${schedule.length===1?'':'s'} fetched into the draft. Review before saving.`);
  }catch(e){
    flash(`Fetch failed: ${e?.message||String(e)}`);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=old||'Fetch Reference & Fill'}
  }
}

const observer=new MutationObserver(()=>addFetchButton());
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',addFetchButton);
})();
