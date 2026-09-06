(()=>{
'use strict';

function readCart(){
  try{return JSON.parse(localStorage.getItem('aibt_staging_cart')||'[]')}catch{return []}
}
function decorateCheckoutVisuals(){
  const api=window.AIBT_LAYER_VISUALS;
  const host=document.getElementById('checkoutItems');
  if(!api||!host)return;
  const items=readCart();
  host.querySelectorAll('.checkout-item').forEach((row,index)=>{
    api.decorateRow(row,items[index],'aibt-checkout-product-visual',76);
  });
}
function scheduleCheckoutVisuals(){
  requestAnimationFrame(()=>requestAnimationFrame(decorateCheckoutVisuals));
  setTimeout(decorateCheckoutVisuals,80);
}
function init(){
  const host=document.getElementById('checkoutItems');
  if(!host)return;
  const observer=new MutationObserver(scheduleCheckoutVisuals);
  observer.observe(host,{childList:true,subtree:false});
  scheduleCheckoutVisuals();
  [200,600,1200].forEach(ms=>setTimeout(scheduleCheckoutVisuals,ms));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
