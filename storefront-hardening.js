(()=>{
'use strict';
try{ localStorage.removeItem('aibt_products'); }catch(_){ }

// Supabase is the catalog source of truth. Keep browser storage for cart/session only.
try{
  products=[];
  save=function(){
    try{ localStorage.setItem('aibt_cart',JSON.stringify(cart)); }catch(_){ }
  };
}catch(_){ }

// Never expose an internal "master not uploaded" message to shoppers.
try{
  visual=function(p,v,el){
    if(!el)return;
    const image=(v&&v.image)||p?.productImage||p?.main_image_url||null;
    if(image){
      el.innerHTML=`<img src="${image}" alt="${String(p?.name||'AI BioTech product').replace(/"/g,'&quot;')}" loading="lazy">`;
      return;
    }
    const fmt=v?.form||'Product';
    const strength=v?.strength||p?.strengths?.[0]||'';
    el.innerHTML=`<div class="aibt-clean-placeholder" style="min-height:220px;display:grid;place-items:center;text-align:center;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(8,20,38,.72)"><div><small style="opacity:.65">AI BIOTECH</small><h3 style="margin:8px 0">${p?.name||'Research Product'}</h3><div style="opacity:.8">${strength}${strength&&fmt?' · ':''}${fmt}</div></div></div>`;
  };
}catch(_){ }

function installCustomerNavigation(){
  const actions=document.querySelector('.actions');
  if(actions && !document.getElementById('memberNavBtn')){
    const b=document.createElement('button');
    b.id='memberNavBtn';
    b.textContent='👤 MEMBER';
    b.onclick=()=>location.href='/member.html';
    const admin=[...actions.querySelectorAll('button')].find(x=>/ADMIN/.test(x.textContent||''));
    if(admin) actions.insertBefore(b,admin); else actions.prepend(b);
  }
  const drawer=document.getElementById('drawer');
  if(drawer && !document.getElementById('checkoutCartBtn')){
    const b=document.createElement('button');
    b.id='checkoutCartBtn';
    b.className='primary';
    b.style.cssText='width:100%;margin-top:12px';
    b.textContent='CHECKOUT';
    b.onclick=()=>location.href='/checkout.html';
    drawer.appendChild(b);
  }
  const hero=document.querySelector('.hero-copy p');
  if(hero)hero.textContent='Premium research products with live category colours, variant-specific inventory and professional Vial, Pen and Cartridge options.';
}

document.addEventListener('DOMContentLoaded',()=>{
  try{ renderProducts(); renderCart(); }catch(_){ }
  installCustomerNavigation();
});
})();
