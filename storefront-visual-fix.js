(()=>{
'use strict';

function ensureFaq(){
 if(!document.getElementById('aibtFullFaqScript')){
  const script=document.createElement('script');
  script.id='aibtFullFaqScript';
  script.src='/faq.js?v=20260830b';
  script.defer=true;
  document.body.appendChild(script);
 }
 const section=document.getElementById('faq');
 if(!section||section.querySelector('.full-faq-launch'))return;
 const box=document.createElement('div');
 box.className='full-faq-launch';
 box.style.margin='18px 0 0';
 const button=document.createElement('button');
 button.type='button';
 button.className='btn blue';
 button.textContent='Open Full FAQ & Knowledge Centre →';
 button.addEventListener('click',()=>{
  if(typeof window.openFAQ==='function')window.openFAQ();
  else setTimeout(()=>window.openFAQ?.(),120);
 });
 box.appendChild(button);
 section.insertBefore(box,section.querySelector('.faq-grid'));
}

function patchProductInfoVisual(){
 const original=window.openProductInfo;
 if(typeof original!=='function'||original.__aibtInfoVisualPatched)return;
 const wrapped=function(id){
  const result=original(id);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const layout=document.querySelector('#modalWrap.show .info-layout');
   if(!layout||layout.querySelector(':scope > .info-visual'))return;
   const stage=layout.querySelector(':scope > .product-visual-stage');
   if(!stage)return;
   const visual=document.createElement('div');
   visual.className='info-visual';
   visual.dataset.format=stage.dataset.format||'';
   visual.dataset.overlayMode=stage.dataset.overlayMode||'none';
   layout.insertBefore(visual,stage);
   visual.appendChild(stage);
   window.fitVisualText?.(visual);
  }));
  return result;
 };
 wrapped.__aibtInfoVisualPatched=true;
 window.openProductInfo=wrapped;
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
  const detail=document.getElementById('researchDetailCenter');
  if(detail?.classList.contains('show')){
   document.body.style.overflow='hidden';
   const close=detail.querySelector('.rc-detail-close');
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
  wrap.addEventListener('click',event=>{
   if(event.target===wrap&&typeof window.closeModal==='function')window.closeModal();
  });
 }
 if(!document.documentElement.dataset.aibtEscClose){
  document.documentElement.dataset.aibtEscClose='1';
  document.addEventListener('keydown',event=>{
   if(event.key!=='Escape')return;
   if(document.querySelector('#researchDetailCenter.show'))return window.closeResearchDetailCenter?.();
   if(document.querySelector('#researchCenterPage.show'))return window.closeResearchCenter?.();
   if(document.querySelector('#modalWrap.show'))return window.closeModal?.();
   if(document.querySelector('#cartOverlay.show'))return window.closeCart?.();
  });
 }
}

function init(){
 ensureFaq();
 patchProductInfoVisual();
 patchResearchNavigation();
 patchModalClose();
 setTimeout(patchProductInfoVisual,150);
 setTimeout(patchResearchNavigation,150);
 setTimeout(patchResearchNavigation,700);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
