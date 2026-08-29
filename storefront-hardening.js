(()=>{
'use strict';
try{ localStorage.removeItem('aibt_products'); }catch(_){ }

const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
      el.innerHTML=`<img src="${image}" alt="${h(p?.name||'AI BioTech product')}" loading="lazy">`;
      return;
    }
    const fmt=v?.form||'Product';
    const strength=v?.strength||p?.strengths?.[0]||'';
    el.innerHTML=`<div class="aibt-clean-placeholder" style="min-height:220px;display:grid;place-items:center;text-align:center;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(8,20,38,.72)"><div><small style="opacity:.65">AI BIOTECH</small><h3 style="margin:8px 0">${h(p?.name||'Research Product')}</h3><div style="opacity:.8">${h(strength)}${strength&&fmt?' · ':''}${h(fmt)}</div></div></div>`;
  };
}catch(_){ }

function findLiveVariant(item){
  try{
    for(const p of products||[]){
      const v=(p.variants||[]).find(x=>x.id===item.variantId);
      if(v)return v;
    }
  }catch(_){ }
  return null;
}

window.aibtCartQty=function(index,delta){
  const item=cart[index]; if(!item)return;
  const live=findLiveVariant(item),max=Math.max(0,Number(live?.stock||item.qty||1));
  const next=Math.max(1,Math.min(max||1,Number(item.qty||1)+delta));
  item.qty=next; save(); renderCart();
};
window.aibtCartRemove=function(index){
  cart.splice(index,1); save(); renderCart();
};

try{
  addCart=function(){
    const p=products.find(x=>x.id===current),v=vfind(p,ms.value,mf.value);
    if(!v||Number(v.stock)<=0||v.available===false)return;
    const e=cart.find(x=>x.variantId===v.id),max=Number(v.stock||0);
    if(e){
      if(Number(e.qty||0)>=max){ alert(`Only ${max} in stock for this variant.`); return; }
      e.qty++;
    }else cart.push({id:p.id,variantId:v.id,name:p.name,strength:v.strength,form:v.form,price:Number(v.price),qty:1});
    save();closeOverlay('productOverlay');renderCart();drawer.classList.add('show');
  };

  renderCart=function(){
    const n=cart.reduce((s,x)=>s+Number(x.qty||0),0),total=cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0);
    if(window.cartCount)cartCount.textContent=n;
    if(window.headerTotal)headerTotal.textContent='RM'+total.toFixed(2);
    if(window.cartItems)cartItems.innerHTML=cart.length?cart.map((x,i)=>{
      const live=findLiveVariant(x),max=Number(live?.stock||0),soldOut=live&&max<=0;
      return `<div class="cartitem"><b>${h(x.name)}</b><br><small>${h(x.strength)} · ${h(x.form)}</small><div style="margin-top:7px">RM ${Number(x.price||0).toFixed(2)}</div><div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button onclick="aibtCartQty(${i},-1)" ${x.qty<=1?'disabled':''}>−</button><b>${Number(x.qty||1)}</b><button onclick="aibtCartQty(${i},1)" ${soldOut||(!max?false:x.qty>=max)?'disabled':''}>+</button><button onclick="aibtCartRemove(${i})" style="margin-left:auto">Remove</button></div>${soldOut?'<small class="stock-out">This variant is now out of stock.</small>':''}</div>`;
    }).join(''):'Your cart is empty.';
    if(window.cartTotal)cartTotal.textContent='RM '+total.toFixed(2);
    const checkout=document.getElementById('checkoutCartBtn');
    if(checkout)checkout.disabled=!cart.length;
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
  try{ renderProducts(); }catch(_){ }
  installCustomerNavigation();
  try{ renderCart(); }catch(_){ }
});
})();
