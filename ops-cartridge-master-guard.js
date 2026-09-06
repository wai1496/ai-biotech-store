(()=>{
'use strict';
let cartridgeEdit=false;
const originalEdit=window.editMediaTemplate;
const originalPreview=window.previewMediaTemplate;
if(typeof originalEdit!=='function'||typeof originalPreview!=='function')return;

function enforceCartridgeConfig(){
  const box=document.getElementById('ctlMediaJson');
  if(!box)return;
  let cfg={};
  try{cfg=JSON.parse(box.value||'{}')}catch{}
  cfg.dynamic_product_name=false;
  cfg.dynamic_strength=false;
  cfg.dynamic_cap_color=false;
  cfg.dynamic_stopper_color=false;
  cfg.cartridge_no_overlay=true;
  box.value=JSON.stringify(cfg,null,2);
  box.readOnly=true;
  box.setAttribute('aria-readonly','true');
  if(!document.getElementById('cartridgeMasterGuardNote')){
    const note=document.createElement('div');
    note.id='cartridgeMasterGuardNote';
    note.className='policy-note';
    note.style.marginTop='10px';
    note.innerHTML='<b>Cartridge Master protection:</b> product-name, strength, cap and stopper overlays are locked OFF. Replace only the approved fixed Cartridge master image.';
    box.closest('label')?.insertAdjacentElement('afterend',note);
  }
}

window.editMediaTemplate=function(id){
  originalEdit(id);
  const title=document.getElementById('dialogTitle')?.textContent||'';
  cartridgeEdit=/cartridge/i.test(title);
  if(cartridgeEdit)enforceCartridgeConfig();
};

window.previewMediaTemplate=function(){
  if(cartridgeEdit)enforceCartridgeConfig();
  return originalPreview();
};
})();
