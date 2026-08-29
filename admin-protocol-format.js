(()=>{
'use strict';

const FORMAT_NOTE='AI BioTech format-aware handling';

function exactVariantFromForm(){
  const f=window.editForm?.elements;
  if(!f?.protocol_variant)return null;
  return (window.protocolVariants||[]).find(v=>v.id===f.protocol_variant.value)||null;
}
function isPenLike(v){return ['Pen','Cartridge'].includes(String(v?.format||''));}
function numericStrength(v){const n=Number(v?.strength);if(Number.isFinite(n)&&n>0)return n;const m=String(v?.strength_label||'').match(/([0-9]+(?:\.[0-9]+)?)/);return m?Number(m[1]):null;}
function stripFormatBlock(text){
  const s=String(text||'');
  const marker='\n\n'+FORMAT_NOTE+'\n';
  const i=s.indexOf(marker);
  return (i>=0?s.slice(0,i):s).trim();
}
function penHandling(v){
  const format=v?.format==='Cartridge'?'Cartridge':'Pen';
  return `${FORMAT_NOTE}\nFormat: ${format}\n• Keep the verified dosage schedule unchanged.\n• Prepare the ${format.toLowerCase()} according to the device instructions after the final fill volume is confirmed.\n• Attach/use a new sterile compatible needle for each administration.\n• Prime only according to the device instructions or the verified priming setting shown in this protocol; priming is not part of the scheduled dose.\n• Dial/set only the calculated units corresponding to the verified mg dose.\n• If the final volume changes, use the recalculated concentration and units shown by this builder before administration.\n• Do not manually add priming units to the calculated scheduled dose.`;
}
function applyFormatAwareness(){
  const f=window.editForm?.elements,v=exactVariantFromForm();
  if(!f||!v)return;
  if(isPenLike(v)){
    if(f.preparation){
      const base=stripFormatBlock(f.preparation.value);
      f.preparation.value=[base,penHandling(v)].filter(Boolean).join('\n\n');
    }
  }
  installLiveCalculation();
}
function parseScheduleLines(){
  const f=window.editForm?.elements;
  return String(f?.schedule?.value||'').split('\n').map(x=>x.trim()).filter(Boolean).map((line,i)=>{
    const parts=line.split('|').map(x=>x.trim());
    const amount=Number(parts[1]);
    return {stage:parts[0]||`Stage ${i+1}`,amount:Number.isFinite(amount)&&amount>0?amount:null,frequency:parts[2]||'',notes:parts.slice(3).join(' | ')};
  });
}
function ensureCalcBox(){
  const f=window.editForm?.elements;
  if(!f?.schedule)return null;
  let box=document.getElementById('aibtDoseCalculationPreview');
  if(box)return box;
  box=document.createElement('section');
  box.id='aibtDoseCalculationPreview';
  box.className='wide notice';
  const scheduleLabel=f.schedule.closest('label');
  if(scheduleLabel?.parentNode)scheduleLabel.parentNode.insertBefore(box,scheduleLabel.nextSibling);
  return box;
}
function recalcProtocol(){
  const f=window.editForm?.elements,v=exactVariantFromForm();
  if(!f||!v)return;
  const total=numericStrength(v),volume=Number(f.fill_volume?.value),box=ensureCalcBox();
  if(!box)return;
  if(!(total>0)&&f.concentration?.value){
    box.innerHTML='<b>Dosage remains locked.</b><br>Unable to determine total peptide strength for automatic concentration calculation.';
    return;
  }
  if(!(volume>0)){
    if(f.concentration)f.concentration.value='';
    box.innerHTML='<b>Dosage remains locked.</b><br>Enter Final volume (mL) to recalculate concentration and U-100 units.';
    return;
  }
  const concentration=total/volume;
  if(f.concentration)f.concentration.value=Number(concentration.toFixed(6));
  const rows=parseScheduleLines();
  const body=rows.map(r=>{
    if(!(r.amount>0))return `<tr><td>${esc(r.stage)}</td><td>Review required</td><td>—</td><td>${esc(r.frequency)}</td></tr>`;
    const units=r.amount/concentration*100;
    return `<tr><td>${esc(r.stage)}</td><td><b>${r.amount} mg</b></td><td><b>${Number(units.toFixed(2))} units</b></td><td>${esc(r.frequency||'—')}</td></tr>`;
  }).join('');
  box.innerHTML=`<b>Live calculation — verified dosage is locked</b><br>Total peptide: ${total} mg · Final volume: ${volume} mL · Concentration: ${Number(concentration.toFixed(4))} mg/mL${rows.length?`<div class="wrap" style="margin-top:8px"><table><thead><tr><th>Stage</th><th>Verified dose</th><th>Calculated U-100</th><th>Frequency</th></tr></thead><tbody>${body}</tbody></table></div>`:'<br>No dosage rows available yet.'}`;
}
function installLiveCalculation(){
  const f=window.editForm?.elements;
  if(!f?.protocol_variant)return;
  if(f.fill_volume&&!f.fill_volume.dataset.aibtCalc){
    f.fill_volume.dataset.aibtCalc='1';
    f.fill_volume.addEventListener('input',()=>{recalcProtocol();applyFormatAwareness();});
  }
  if(f.schedule&&!f.schedule.dataset.aibtCalc){
    f.schedule.dataset.aibtCalc='1';
    f.schedule.addEventListener('input',recalcProtocol);
  }
  if(f.protocol_variant&&!f.protocol_variant.dataset.aibtFormat){
    f.protocol_variant.dataset.aibtFormat='1';
    f.protocol_variant.addEventListener('change',()=>setTimeout(()=>{applyFormatAwareness();recalcProtocol();},0));
  }
  recalcProtocol();
}

const observer=new MutationObserver(()=>{
  const title=window.editTitle?.textContent||'';
  if(/protocol/i.test(title)&&window.editForm?.elements?.protocol_variant){
    applyFormatAwareness();
    installLiveCalculation();
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>{applyFormatAwareness();installLiveCalculation();});
})();
