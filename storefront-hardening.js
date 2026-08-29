(()=>{
'use strict';
try{ localStorage.removeItem('aibt_products'); }catch(_){ }

const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalogReady=false;

// Supabase is the catalog source of truth. Keep browser storage for cart/session only.
try{
  products=[];
  save=function(){
    try{ localStorage.setItem('aibt_cart',JSON.stringify(cart)); }catch(_){ }
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
function availableStock(v){return Math.max(0,Number(v?.stock||0)-Number(v?.reserved||0))}

window.aibtCartQty=function(index,delta){
  const item=cart[index];if(!item)return;
  const live=findLiveVariant(item),max=availableStock(live);
  if(catalogReady&&(!live||max<=0))return;
  const next=Math.max(1,Math.min(catalogReady?max:Number.MAX_SAFE_INTEGER,Number(item.qty||1)+Number(delta||0)));
  item.qty=next;save();renderCart();
};
window.aibtCartRemove=function(index){cart.splice(index,1);save();renderCart()};

try{
  addCart=function(){
    const p=products.find(x=>x.id===current),v=p&&vfind(p,ms.value,mf.value);
    const max=availableStock(v);
    if(!v||max<=0||v.available===false)return;
    const e=cart.find(x=>x.variantId===v.id);
    if(e){
      if(Number(e.qty||0)>=max){alert(`Only ${max} available for this variant.`);return}
      e.qty++;
    }else cart.push({id:p.id,variantId:v.id,name:p.name,strength:v.strength,form:v.form,price:Number(v.price),qty:1});
    save();closeOverlay('productOverlay');renderCart();drawer.classList.add('show');
  };

  renderCart=function(){
    const n=cart.reduce((s,x)=>s+Number(x.qty||0),0),total=cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0);
    if(window.cartCount)cartCount.textContent=n;
    if(window.headerTotal)headerTotal.textContent='RM'+total.toFixed(2);
    let blocked=false;
    if(window.cartItems)cartItems.innerHTML=cart.length?cart.map((x,i)=>{
      const live=findLiveVariant(x),max=availableStock(live),unavailable=catalogReady&&(!live||max<=0),over=catalogReady&&live&&Number(x.qty||1)>max;
      if(unavailable||over)blocked=true;
      const status=!catalogReady?'Checking live stock…':unavailable?'This variant is unavailable or out of stock.':over?`Only ${max} available. Reduce the quantity.`:'';
      return `<div class="cartitem"><b>${h(x.name)}</b><br><small>${h(x.strength)} · ${h(x.form)}</small><div style="margin-top:7px">RM ${Number(x.price||0).toFixed(2)}</div><div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button type="button" onclick="aibtCartQty(${i},-1)" ${Number(x.qty||1)<=1?'disabled':''}>−</button><b>${Number(x.qty||1)}</b><button type="button" onclick="aibtCartQty(${i},1)" ${!catalogReady||unavailable||Number(x.qty||1)>=max?'disabled':''}>+</button><button type="button" onclick="aibtCartRemove(${i})" style="margin-left:auto">Remove</button></div>${status?`<small class="${unavailable||over?'stock-out':''}">${h(status)}</small>`:''}</div>`;
    }).join(''):'Your cart is empty.';
    if(window.cartTotal)cartTotal.textContent='RM '+total.toFixed(2);
    const checkout=document.getElementById('checkoutCartBtn');
    if(checkout){checkout.disabled=!cart.length||!catalogReady||blocked;checkout.title=!catalogReady?'Waiting for live stock':blocked?'Resolve unavailable cart items before checkout':''}
  };
}catch(_){ }

function installCustomerNavigation(){
  const actions=document.querySelector('.actions');
  if(actions&&!document.getElementById('memberNavBtn')){
    const b=document.createElement('button');b.id='memberNavBtn';b.type='button';b.textContent='👤 MEMBER';b.onclick=()=>location.href='/member.html';
    const admin=[...actions.querySelectorAll('button')].find(x=>/ADMIN/.test(x.textContent||''));if(admin)actions.insertBefore(b,admin);else actions.prepend(b);
  }
  const drawer=document.getElementById('drawer');
  if(drawer&&!document.getElementById('checkoutCartBtn')){
    const b=document.createElement('button');b.id='checkoutCartBtn';b.type='button';b.className='primary';b.style.cssText='width:100%;margin-top:12px';b.textContent='CHECKOUT';b.onclick=()=>location.href='/checkout.html';drawer.appendChild(b);
  }
  const hero=document.querySelector('.hero-copy p');if(hero)hero.textContent='Premium research products with live category colours, variant-specific inventory and professional Vial, Pen and Cartridge options.';
}

window.addEventListener('aibt:catalog-loaded',()=>{catalogReady=true;try{renderCart()}catch(_){ }});
window.addEventListener('aibt:catalog-error',()=>{catalogReady=false;try{renderCart()}catch(_){ }});
document.addEventListener('DOMContentLoaded',()=>{try{renderProducts()}catch(_){ }installCustomerNavigation();try{renderCart()}catch(_){ }});
})();
