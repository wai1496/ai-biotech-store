(()=>{
  'use strict';
  const cfg=window.AIBT_CONFIG||{};
  if(cfg.environment!=='staging'||cfg.checkoutEnabled===true)return;
  const block=()=>{
    const button=document.getElementById('placeOrderBtn');
    if(button){button.disabled=true;button.textContent='STAGING CHECKOUT LOCKED';}
    const message=document.getElementById('checkoutMessage');
    if(message)message.textContent='Checkout writes are locked in staging until server-side staging payment and shipping configuration is verified.';
  };
  window.placeOrder=async function(){block();throw new Error('Staging checkout writes are disabled.');};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(block,0),{once:true});else setTimeout(block,0);
  setTimeout(block,300);
})();
