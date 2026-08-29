(()=>{
'use strict';

function findDoseTable(tables){
  return (tables||[]).find(t=>Array.isArray(t)&&t.length>1&&t.some(r=>Array.isArray(r)&&r.some(c=>/dose|dosage|phase|week|schedule|frequency/i.test(String(c)))) ) || (tables||[])[0] || [];
}
function parseFetchedSchedule(table, defaultFrequency=''){
  if(!Array.isArray(table)||table.length<2)return [];
  const header=(table[0]||[]).map(x=>String(x||'').toLowerCase());
  const stageIdx=header.findIndex(x=>/week|phase|stage|period|schedule/.test(x));
  const doseIdx=header.findIndex(x=>/dose/.test(x)&&!/unit|volume/.test(x));
  const freqIdx=header.findIndex(x=>/frequency|timing/.test(x));
  return table.slice(1).map((r,i)=>{
    const cells=(r||[]).map(x=>String(x||'').trim());
    if(!cells.some(Boolean))return null;
    const joined=cells.join(' ');
    const doseCell=(doseIdx>=0?cells[doseIdx]:'')||joined;
    const amount=doseCell.match(/([0-9]+(?:\.[0-9]+)?)\s*mg\b/i) || joined.match(/([0-9]+(?:\.[0-9]+)?)\s*mg\b/i);
    if(!amount)return null;
    const stage=(stageIdx>=0?cells[stageIdx]:'') || cells.find(c=>/week|phase|start|increase|maint|titr|day|month/i.test(c)) || `Stage ${i+1}`;
    const frequency=(freqIdx>=0?cells[freqIdx]:'') || defaultFrequency || '';
    const notes=cells.filter((_,idx)=>![stageIdx,doseIdx,freqIdx].includes(idx)).filter(Boolean).join(' · ');
    return [stage,amount[1],frequency,notes].join(' | ');
  }).filter(Boolean);
}
function sectionText(data,key){
  return (data.sections||[]).filter(s=>s?.key===key).map(s=>`${s.heading}\n${s.content}`).join('\n\n').trim();
}
function compact(text,max=260){
  const s=String(text||'').replace(/\s+/g,' ').trim();
  if(!s)return '';
  return s.length>max?s.slice(0,max-1).trimEnd()+'…':s;
}
function formatLabel(v){
  const f=String(v?.format||'Vial');
  if(/^pen$/i.test(f))return 'Pen';
  if(/^cartridge$/i.test(f))return 'Cartridge';
  return 'Vial';
}
function formatPreparation(v,sourcePrep){
  const format=formatLabel(v),base=compact(sourcePrep,360);
  if(format==='Vial')return base||'Follow the source-supported vial preparation / reconstitution instructions for this exact strength.';
  const device=format==='Cartridge'?'cartridge':'pen';
  const prefix=`${format} preparation: Prepare the solution using the source-supported final volume and concentration for this exact strength. Load/use the prepared ${device} according to the device instructions. Prime separately if required; priming is not part of the scheduled dose.`;
  return [prefix,base].filter(Boolean).join('\n');
}
function formatTiming(v,sourceTiming,sourceCfg){
  const format=formatLabel(v),parts=[];
  if(sourceTiming)parts.push(compact(sourceTiming,220));
  if(sourceCfg?.frequency)parts.push(`Frequency: ${sourceCfg.frequency}`);
  if(format==='Pen')parts.push('Administration: use the pen setting calculated from the verified mg dose and current concentration.');
  if(format==='Cartridge')parts.push('Administration: use the cartridge/pen-device setting calculated from the verified mg dose and current concentration.');
  if(format==='Vial'&&sourceCfg?.route)parts.push(`Route: ${sourceCfg.route}`);
  return parts.join('\n');
}
function reviewFallback(label){return `REVIEW REQUIRED — ${label} was not clearly identified in the exact reference page.`;}
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
  const format=formatLabel(v),btn=document.getElementById('aibtProtocolFetchFill'),old=btn?.textContent;
  if(btn){btn.disabled=true;btn.textContent='Fetching & filling…'}
  try{
    const {data,error}=await sb.functions.invoke('protocol-reference-fetch',{body:{product:v.products?.name||v.product_id,strength:v.strength_label,format:v.format}});
    if(error)throw error;
    if(!data?.found)throw new Error(data?.message||data?.error||'No exact reference page was found');
    const sourceCfg=data.reconstitution||{};
    const table=findDoseTable(data.tables||[]),schedule=parseFetchedSchedule(table,sourceCfg.frequency||'');
    const prep=sectionText(data,'preparation');
    const timing=sectionText(data,'timing');
    const duration=sectionText(data,'duration');
    const sourceNotes=sectionText(data,'notes');
    const cfg=protocolConfigs?.[v.id];

    if(f.source_url)f.source_url.value=data.source_url||'';
    if(f.source_product)f.source_product.value=v.products?.name||v.product_id||'';
    if(f.source_strength)f.source_strength.value=v.strength_label||'';
    if(f.protocol_title)f.protocol_title.value=`${v.products?.name||v.product_id} ${v.strength_label} ${format} Protocol`;
    if(f.schedule)f.schedule.value=schedule.length?schedule.join('\n'):reviewFallback('dosage schedule');
    if(f.preparation)f.preparation.value=formatPreparation(v,prep);
    if(f.timing)f.timing.value=formatTiming(v,timing,sourceCfg)||reviewFallback('timing / frequency');
    if(f.duration)f.duration.value=compact(duration,180)||reviewFallback('duration / cycle');

    if(f.fill_volume){
      if(cfg?.fill_volume_ml!=null)f.fill_volume.value=cfg.fill_volume_ml;
      else if(sourceCfg.fill_volume_ml!=null)f.fill_volume.value=sourceCfg.fill_volume_ml;
      else f.fill_volume.value='';
    }
    if(f.concentration){
      if(cfg?.concentration_mg_ml!=null)f.concentration.value=cfg.concentration_mg_ml;
      else if(sourceCfg.concentration_mg_ml!=null)f.concentration.value=sourceCfg.concentration_mg_ml;
      else f.concentration.value='';
    }
    if(f.priming_units){
      if(format==='Vial')f.priming_units.value='';
      else if(cfg?.priming_units!=null)f.priming_units.value=cfg.priming_units;
      else if(sourceCfg.priming_units!=null)f.priming_units.value=sourceCfg.priming_units;
      else f.priming_units.value='';
    }
    if(f.config_status)f.config_status.value=cfg?.configuration_status==='verified'?'verified':'review_required';
    if(f.protocol_status)f.protocol_status.value='review_required';
    if(f.protocol_notes)f.protocol_notes.value=compact(sourceNotes,220)||'Review exact dosage, concentration and calculated units before publishing.';

    f.fill_volume?.dispatchEvent(new Event('input',{bubbles:true}));
    flash(`${format} template filled from the exact reference. Dosage remains source-locked; review before saving.`);
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
