(()=>{
'use strict';

function protocolFormActive(){
  const f=window.editForm?.elements;
  return !!(f?.protocol_variant && f?.protocol_status && window.editor?.open);
}
function exactStrength(v){
  const n=Number(v?.strength);
  if(Number.isFinite(n)&&n>0)return n;
  const m=String(v?.strength_label||'').match(/([0-9]+(?:\.[0-9]+)?)/);
  return m?Number(m[1]):null;
}
function inlineSaveMessage(msg,ok=false){
  let el=document.getElementById('aibtProtocolSaveMessage');
  if(!el){
    el=document.createElement('div');
    el.id='aibtProtocolSaveMessage';
    el.className='notice wide';
    const f=window.fields;
    if(f)f.appendChild(el);
  }
  el.textContent=msg;
  el.style.borderColor=ok?'#2eaa61':'#e63c3c';
}
async function resolveVariant(id){
  let v=(window.protocolVariants||[]).find(x=>x.id===id);
  if(v)return v;
  const {data,error}=await sb.from('variants').select('id,product_id,strength,strength_label,format,products(name)').eq('id',id).maybeSingle();
  if(error||!data)return null;
  v=data;
  try{ if(Array.isArray(window.protocolVariants))window.protocolVariants.push(v); }catch(_){ }
  return v;
}
async function saveProtocolSafely(ev){
  if(!protocolFormActive())return;
  ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
  const f=editForm.elements;
  const variantId=f.protocol_variant.value;
  const v=await resolveVariant(variantId);
  if(!v)return inlineSaveMessage(`Variant ${variantId||'(missing)'} could not be loaded. Refresh the page and try again.`);

  let schedule;
  try{ schedule=window.parseSchedule?parseSchedule(f.schedule.value):[]; }
  catch(err){ return inlineSaveMessage(err?.message||'Schedule format is invalid.'); }

  const status=f.protocol_status.value;
  const volume=Number(f.fill_volume.value);
  const strength=exactStrength(v);
  if(volume>0 && strength>0){
    const exact=strength/volume;
    f.concentration.value=Number(exact.toFixed(6));
  }

  if(['verified','published'].includes(status)){
    if(!(volume>0))return inlineSaveMessage('Verified protocols require Final volume (mL).');
    if(!(Number(f.concentration.value)>0))return inlineSaveMessage('Verified protocols require a valid concentration.');
    if(!schedule.length)return inlineSaveMessage('Verified protocols require at least one valid dosage row.');
    f.config_status.value='verified';
  }

  if(!f.source_url.value.trim()||!f.source_product.value.trim()||!f.source_strength.value.trim()){
    return inlineSaveMessage('Source URL, Source product and Source strength are required before saving.');
  }

  saveEdit.disabled=true;
  saveEdit.textContent='Saving…';
  inlineSaveMessage('Saving protocol…',true);
  const currentId=(window.rows||[]).find(r=>r.variant_id===variantId && (r.title===f.protocol_title.value || r.id===window.__aibtEditingProtocolId))?.id||window.__aibtEditingProtocolId||null;
  const {data,error}=await sb.rpc('admin_save_protocol',{
    p_protocol_id:currentId,
    p_variant_id:variantId,
    p_source_url:f.source_url.value.trim()||null,
    p_source_product:f.source_product.value.trim(),
    p_source_strength:f.source_strength.value.trim(),
    p_source_data:{captured_by:'admin_review',format:v.format},
    p_fill_volume_ml:f.fill_volume.value?Number(f.fill_volume.value):null,
    p_concentration_mg_ml:f.concentration.value?Number(f.concentration.value):null,
    p_unit_scale:'U-100',
    p_priming_units:Number(f.priming_units.value||0),
    p_configuration_status:f.config_status.value,
    p_title:f.protocol_title.value.trim(),
    p_schedule_data:schedule,
    p_preparation_text:f.preparation.value.trim(),
    p_duration_text:f.duration.value.trim(),
    p_timing_text:f.timing.value.trim(),
    p_notes_text:f.protocol_notes.value.trim(),
    p_source_mapping_note:'',
    p_status:status
  });
  saveEdit.disabled=false;saveEdit.textContent='Save';
  if(error)return inlineSaveMessage(error.message||'Protocol could not be saved.');
  inlineSaveMessage('Protocol saved successfully.',true);
  flash('Protocol saved');
  setTimeout(()=>{try{editor.close()}catch{}; if(window.protocolAdminPage)protocolAdminPage();},350);
}

document.addEventListener('click',ev=>{
  if(ev.target===window.saveEdit && protocolFormActive())saveProtocolSafely(ev);
},true);
})();
