(()=>{
'use strict';
const CARTRIDGE='/assets/cartridge-master-v2.svg';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function patchCartStorage(){
 try{
  const key='aibt_staging_cart',cart=JSON.parse(localStorage.getItem(key)||'[]');let changed=false;
  cart.forEach(x=>{if(x?.format==='Cartridge'&&x.image!==CARTRIDGE){x.image=CARTRIDGE;changed=true}});
  if(changed)localStorage.setItem(key,JSON.stringify(cart));
 }catch{}
}
function decorateInfo(){
 const layout=document.querySelector('#modalBody .info-layout');
 if(!layout||layout.querySelector('.info-visual'))return;
 const img=layout.querySelector(':scope > img');
 const h3=layout.querySelector('h3');
 const title=document.getElementById('modalTitle')?.textContent?.trim()||'';
 if(!img||!h3)return;
 const parts=h3.textContent.split('·').map(x=>x.trim());
 const strength=parts[0]||'';
 const format=parts[1]||'Vial';
 if(format==='Cartridge')img.src=CARTRIDGE;
 const color=layout.querySelector('.category-badge')?.style?.background||'#1477ff';
 const box=document.createElement('div');
 box.className='info-visual';box.dataset.format=format;box.style.setProperty('--cat',color);
 img.replaceWith(box);box.appendChild(img);
 const label=document.createElement('div');label.className='info-dynamic-label';
 label.innerHTML=`<div class="name">${esc(title)}</div><div class="strength">${esc(strength)}</div>`;
 box.appendChild(label);
}
const original=window.openProductInfo;
if(typeof original==='function')window.openProductInfo=function(id){original(id);requestAnimationFrame(()=>requestAnimationFrame(decorateInfo));};
function normalizeCards(){
 const hero=document.getElementById('heroCartridge');if(hero&&hero.getAttribute('src')!==CARTRIDGE)hero.src=CARTRIDGE;
 document.querySelectorAll('.product-card').forEach(card=>{
  const format=card.dataset.format||'';
  const img=card.querySelector('.product-media img');
  if(format==='Cartridge'&&img&&img.getAttribute('src')!==CARTRIDGE)img.src=CARTRIDGE;
  const label=card.querySelector('.dynamic-label');if(label&&!label.dataset.aibtNormalized)label.dataset.aibtNormalized='1';
 });
 document.querySelectorAll('.cart-item').forEach(item=>{
  const meta=item.querySelector('small')?.textContent||'';const img=item.querySelector('img');
  if(/Cartridge/i.test(meta)&&img&&img.getAttribute('src')!==CARTRIDGE)img.src=CARTRIDGE;
 });
}
function ensureFaq(){
 if(!document.getElementById('aibtFullFaqScript')){const s=document.createElement('script');s.id='aibtFullFaqScript';s.src='/faq.js?v=20260830b';s.defer=true;document.body.appendChild(s)}
 const section=document.getElementById('faq');if(!section||section.querySelector('.full-faq-launch'))return;
 const box=document.createElement('div');box.className='full-faq-launch';box.style.margin='18px 0 0';
 const b=document.createElement('button');b.type='button';b.className='btn blue';b.textContent='Open Full FAQ & Knowledge Centre →';b.addEventListener('click',()=>{if(typeof window.openFAQ==='function')window.openFAQ();else setTimeout(()=>window.openFAQ?.(),120)});box.appendChild(b);section.insertBefore(box,section.querySelector('.faq-grid'));
}
function patchResearchNavigation(){
 const originalDetail=window.openResearchDetailCenter;
 if(typeof originalDetail!=='function'||originalDetail.__aibtLightPatched)return;
 const wrapped=async function(id){
  const modalWrap=document.getElementById('modalWrap');
  if(modalWrap?.classList.contains('show')){
   if(typeof window.closeModal==='function')window.closeModal();
   else modalWrap.classList.remove('show');
  }
  await originalDetail(id);
  const back=document.getElementById('researchDetailCenter');
  if(back?.classList.contains('show')){
   document.body.style.overflow='hidden';
   const close=back.querySelector('.rc-detail-close');
   if(close)close.setAttribute('onclick','closeResearchDetailCenter()');
  }
 };
 wrapped.__aibtLightPatched=true;
 window.openResearchDetailCenter=wrapped;
 window.openResearch=id=>wrapped(id);
 window.closeResearchDetailCenter=function(){
  document.getElementById('researchDetailCenter')?.classList.remove('show');
  if(!document.querySelector('#researchCenterPage.show'))document.body.style.overflow='';
 };
}
function patchModalClose(){
 const wrap=document.getElementById('modalWrap');
 if(wrap&&!wrap.dataset.aibtBackdropClose){
  wrap.dataset.aibtBackdropClose='1';
  wrap.addEventListener('click',e=>{if(e.target===wrap&&typeof window.closeModal==='function')window.closeModal()});
 }
 if(!document.documentElement.dataset.aibtEscClose){
  document.documentElement.dataset.aibtEscClose='1';
  document.addEventListener('keydown',e=>{
   if(e.key!=='Escape')return;
   if(document.querySelector('#researchDetailCenter.show'))return window.closeResearchDetailCenter?.();
   if(document.querySelector('#researchCenterPage.show'))return window.closeResearchCenter?.();
   if(document.querySelector('#modalWrap.show'))return window.closeModal?.();
   if(document.querySelector('#cartOverlay.show'))return window.closeCart?.();
  });
 }
}
const mo=new MutationObserver(()=>normalizeCards());
const heroMo=new MutationObserver(()=>normalizeCards());
function init(){
 patchCartStorage();normalizeCards();ensureFaq();patchResearchNavigation();patchModalClose();
 const grid=document.getElementById('productGrid');if(grid)mo.observe(grid,{childList:true,subtree:true});
 const cart=document.getElementById('cartItems');if(cart)mo.observe(cart,{childList:true,subtree:true});
 const hero=document.getElementById('heroCartridge');if(hero)heroMo.observe(hero,{attributes:true,attributeFilter:['src']});
 setTimeout(normalizeCards,250);setTimeout(normalizeCards,900);setTimeout(normalizeCards,1800);
 setTimeout(patchResearchNavigation,150);setTimeout(patchResearchNavigation,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();