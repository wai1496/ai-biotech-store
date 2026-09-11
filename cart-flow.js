(()=>{
'use strict';
function showCartToast(message){
  let toast=document.getElementById('cartToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='cartToast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    Object.assign(toast.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:'250',maxWidth:'calc(100vw - 32px)',padding:'12px 18px',borderRadius:'12px',background:'rgba(5,25,38,.96)',border:'1px solid #18c9ff',color:'#fff',fontWeight:'800',boxShadow:'0 12px 36px rgba(0,0,0,.45)',opacity:'0',transition:'opacity .18s ease'});
    document.body.appendChild(toast);
  }
  toast.textContent=message;
  toast.style.opacity='1';
  clearTimeout(showCartToast.timer);
  showCartToast.timer=setTimeout(()=>{toast.style.opacity='0'},1800);
}
function continueShopping(){
  (document.getElementById('cartOverlay')||document.getElementById('drawer'))?.classList.remove('show');
}
function installCartFlow(){
  if(document.getElementById('cartOverlay')){
    window.continueShopping=continueShopping;
    const footer=document.querySelector('#cartOverlay .drawer-footer');
    if(footer&&!document.getElementById('continueShoppingBtn')){const b=document.createElement('button');b.id='continueShoppingBtn';b.className='btn';b.textContent='Continue Shopping';b.onclick=continueShopping;footer.appendChild(b);}
    return;
  }
  const drawer=document.getElementById('drawer');
  const checkout=document.getElementById('checkoutCartBtn');
  if(drawer&&checkout&&!document.getElementById('continueShoppingBtn')){
    const button=document.createElement('button');
    button.id='continueShoppingBtn';
    button.type='button';
    button.className='option';
    button.textContent='CONTINUE SHOPPING';
    button.style.cssText='width:100%;margin-top:10px';
    button.onclick=continueShopping;
    drawer.insertBefore(button,checkout);
  }
  window.showCartToast=showCartToast;
  window.continueShopping=continueShopping;
  window.addCart=function(){
    const p=products.find(x=>x.id===current),v=vfind(p,ms.value,mf.value);
    if(!v||Number(v.stock)<=0||v.available===false)return;
    if(!window.AIBTCore)return;
    if(!window.AIBTCore.cart.add(p,{...v,format:v.form,strength_label:v.strength,stock_quantity:v.stock,active:v.available!==false}))return;
    cart=window.AIBTCore.cart.get();
    save();
    closeOverlay('productOverlay');
    renderCart();
    showCartToast(`${p.name} · ${v.strength} · ${v.form} added to cart`);
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCartFlow,{once:true});else installCartFlow();
setTimeout(installCartFlow,0);
})();
