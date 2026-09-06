(()=>{
'use strict';

const VIAL_LAYER_ROOT='/product-visuals/layers';
const VIAL_BASE=`${VIAL_LAYER_ROOT}/base/aibiotech-vial-base-master.webp`;
const CATEGORY_BY_HEX=Object.freeze({
 '#F57C00':{template:'metabolism-orange',strength:'orange'},
 '#2EAA61':{template:'regeneration-green',strength:'green'},
 '#E63C3C':{template:'healing-red',strength:'red'},
 '#7E57C2':{template:'brain-sleep-purple',strength:'purple'},
 '#8052B5':{template:'brain-sleep-purple',strength:'purple'},
 '#FF4FA0':{template:'bonding-pink',strength:'pink'},
 '#D4AF37':{template:'longevity-gold',strength:'gold'},
 '#E0B300':{template:'hormone-yellow',strength:'yellow'},
 '#38BDF8':{template:'special-blend-light-blue',strength:'light-blue'},
 '#2563EB':{template:'solvent-blue',strength:'blue'}
});
function normalHex(value){
 const v=String(value||'').trim().toUpperCase();
 if(/^#[0-9A-F]{6}$/.test(v))return v;
 const m=v.match(/RGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
 return m?'#'+[m[1],m[2],m[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase():v;
}
function slugName(value){
 const raw=String(value||'').trim().toLowerCase();
 if(raw==='nad+')return 'nad-plus';
 return raw.replace(/\+/g,'-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-+/g,'-');
}
function slugStrength(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9.]/g,'')}
function layerImage(src,cls,alt=''){
 const img=document.createElement('img');img.src=src;img.className=`aibt-vial-layer ${cls}`;img.alt=alt;img.setAttribute('aria-hidden',alt?'false':'true');
 Object.assign(img.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',objectPosition:'center',display:'block',pointerEvents:'none'});
 return img;
}
function applyVialLayers(root=document){
 root.querySelectorAll('.product-card').forEach(card=>{
  const stage=card.querySelector('.product-visual-stage[data-format="Vial"]');
  if(!stage)return;
  const name=card.querySelector('.product-name')?.textContent?.trim()||'';
  const strength=card.querySelector('.variant-row select')?.value?.trim()||'';
  const cssColor=getComputedStyle(card).getPropertyValue('--cat').trim()||getComputedStyle(stage).getPropertyValue('--visual-category').trim();
  const hex=normalHex(cssColor),spec=CATEGORY_BY_HEX[hex];
  if(!spec||!name||!strength)return;
  const signature=`${slugName(name)}|${slugStrength(strength)}|${hex}`;
  if(stage.dataset.aibtVialLayered===signature)return;
  stage.dataset.aibtVialLayered=signature;
  stage.dataset.overlayMode='none';
  stage.querySelectorAll('.product-visual-image,.product-visual-overlay,.aibt-vial-layer').forEach(el=>el.remove());
  stage.appendChild(layerImage(VIAL_BASE,'aibt-vial-base',`${name} ${strength} Vial`));
  stage.appendChild(layerImage(`${VIAL_LAYER_ROOT}/templates/aibiotech-vial-template-${spec.template}.webp`,'aibt-vial-category'));
  stage.appendChild(layerImage(`${VIAL_LAYER_ROOT}/names/aibiotech-vial-name-${slugName(name)}.webp`,'aibt-vial-name'));
  stage.appendChild(layerImage(`${VIAL_LAYER_ROOT}/strengths/aibiotech-vial-strength-${slugStrength(strength)}-${spec.strength}.webp`,'aibt-vial-strength'));
 });
}
function scheduleVialLayers(){requestAnimationFrame(()=>requestAnimationFrame(()=>applyVialLayers()))}
function wrapRenderAction(name){
 const original=window[name];if(typeof original!=='function'||original.__aibtVialLayerPatched)return;
 const wrapped=function(...args){const result=original.apply(this,args);scheduleVialLayers();setTimeout(scheduleVialLayers,80);return result};
 wrapped.__aibtVialLayerPatched=true;window[name]=wrapped;
}
function bindVialLayerActions(){
 ['changeStrength','changeFormat','showAllProducts','setCategory','applyFilters','searchCatalog'].forEach(wrapRenderAction);
 applyVialLayers();
 [120,350,800,1600].forEach(ms=>setTimeout(()=>{applyVialLayers();bindVialLayerActions()},ms));
}

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
 bindVialLayerActions();
 setTimeout(patchProductInfoVisual,150);
 setTimeout(patchResearchNavigation,150);
 setTimeout(patchResearchNavigation,700);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
