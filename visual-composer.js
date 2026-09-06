/* Preview-only Product Visual Composer controller. Intentionally non-persistent. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const els={product:$('vcProduct'),strength:$('vcStrength'),format:$('vcFormat'),accent:$('vcAccent'),accentText:$('vcAccentText'),master:$('vcMaster'),canvas:$('vcCanvas'),status:$('vcStatus'),meta:$('vcMeta'),render:$('vcRender'),reset:$('vcReset'),message:$('vcMessage'),hint:$('vcMasterHint')};
  const defaults={product:'CAGRILINTIDE',strength:'5mg',format:'Pen',accent:'#f57c00',master:'',status:'Draft'};
  function setMessage(text,type=''){els.message.textContent=text||'';els.message.className='vc-message'+(type?' '+type:'')}
  function setMeta(values){const items=[['Product',values.product||'—'],['Strength',values.strength||'—'],['Format',values.format||'—'],['Mode',values.mode||'Not rendered']];els.meta.innerHTML=items.map(([k,v])=>`<span><b>${k}</b><i>${String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</i></span>`).join('')}
  function current(){return {productName:els.product.value.trim(),strength:els.strength.value.trim(),format:els.format.value,accent:els.accent.value,masterUrl:els.master.value.trim()}}
  function validate(v){if(!v.productName)return'Enter a product name.';if(!v.strength)return'Enter a strength.';if(!v.masterUrl)return'Choose or enter a master image URL.';return''}
  async function render(){
    const v=current(),problem=validate(v);if(problem){setMessage(problem,'error');return}
    els.render.disabled=true;setMessage('Rendering preview…');
    try{
      const result=await window.AIBTVisualRenderer.renderPreview({canvas:els.canvas,...v,cartridgeBlank:false});
      setMeta({product:v.productName,strength:v.strength,format:v.format,mode:result.mode});
      if(result.mode==='reference-only')setMessage('Cartridge is reference-only in Phase 1 until a verified blank master and field map are available.','ok');
      else setMessage('Preview rendered. Review placement, scale and category colour.','ok');
    }catch(error){setMessage(error?.message||'Preview failed.','error')}
    finally{els.render.disabled=false}
  }
  function reset(){els.product.value=defaults.product;els.strength.value=defaults.strength;els.format.value=defaults.format;els.accent.value=defaults.accent;els.accentText.value=defaults.accent.toUpperCase();els.master.value=defaults.master;els.status.value=defaults.status;const ctx=els.canvas.getContext('2d');ctx.clearRect(0,0,els.canvas.width,els.canvas.height);setMeta({});setMessage('Reset complete.')}
  els.accent.addEventListener('input',()=>{els.accentText.value=els.accent.value.toUpperCase()});
  document.querySelectorAll('[data-accent]').forEach(button=>button.addEventListener('click',()=>{els.accent.value=button.dataset.accent;els.accentText.value=button.dataset.accent.toUpperCase()}));
  els.format.addEventListener('change',()=>{els.hint.textContent=els.format.value==='Cartridge'?'Cartridge remains reference-only until a verified blank master and dynamic field map are available.':'Choose/load a blank Vial or Pen master. Product name and strength will be fitted into fixed print fields.'});
  els.render.addEventListener('click',render);els.reset.addEventListener('click',reset);setMeta({});
})();
