(()=>{
'use strict';

const VIAL_LAYER_ROOT='/product-visuals/layers';
const VIAL_BASE=`${VIAL_LAYER_ROOT}/base/aibiotech-vial-base-master.webp`;
const PEN_BASE=`${VIAL_LAYER_ROOT}/base/aibiotech-pen-base-master.webp`;
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
const PRODUCT_CATEGORY_HEX=Object.freeze({
 'retatrutide':'#F57C00','cagrilintide':'#F57C00','semaglutide':'#F57C00','tirzepatide':'#F57C00','aod-9604':'#F57C00','mots-c':'#F57C00','slu-pp-332':'#F57C00','retatrutide-cagrilintide':'#F57C00','semaglutide-cagrilintide':'#F57C00','5-amino-1mq':'#F57C00',
 'ghk-cu':'#2EAA61','ahk-cu':'#2EAA61','snap-8':'#2EAA61','l-glutathione':'#2EAA61',
 'bpc-157':'#E63C3C','tb-500':'#E63C3C','kpv':'#E63C3C','ll-37':'#E63C3C','ara-290':'#E63C3C','bpc-157-tb-500':'#E63C3C',
 'semax':'#8052B5','selank':'#8052B5','dsip':'#8052B5','pinealon':'#8052B5',
 'pt-141':'#FF4FA0','oxytocin':'#FF4FA0','kisspeptin-10':'#FF4FA0',
 'nad-plus':'#D4AF37','epithalon':'#D4AF37','ss-31':'#D4AF37',
 'tesamorelin':'#E0B300','ipamorelin':'#E0B300','cjc-1295':'#E0B300','cjc-1295-ipamorelin':'#E0B300',
 'glow':'#38BDF8','klow':'#38BDF8','bacteriostatic-water':'#2563EB'
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
 const img=document.createElement('img');img.src=src;img.className=`aibt-product-layer ${cls}`;img.alt=alt;img.setAttribute('aria-hidden',alt?'false':'true');
 Object.assign(img.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',objectPosition:'center',display:'block',pointerEvents:'none'});
 return img;
}
function selectedStrength(card){
 const selects=[...card.querySelectorAll('.variant-row select')];
 const explicit=card.querySelector('select[data-role="strength"],select[name="strength"],.strength-select');
 if(explicit)return explicit.value?.trim()||'';
 const candidate=selects.find(el=>!/vial|pen|cartridge/i.test(String(el.value||'')));
 return candidate?.value?.trim()||selects[0]?.value?.trim()||'';
}
function layerSpec(card,stage){
 const cssColor=getComputedStyle(card).getPropertyValue('--cat').trim()||getComputedStyle(stage).getPropertyValue('--visual-category').trim();
 const hex=normalHex(cssColor);
 return {hex,spec:CATEGORY_BY_HEX[hex]};
}
function applyLayeredFormat(root,format,base,prefix){
 root.querySelectorAll('.product-card').forEach(card=>{
  const stage=card.querySelector(`.product-visual-stage[data-format="${format}"]`);
  if(!stage)return;
  const name=card.querySelector('.product-name')?.textContent?.trim()||'';
  const strength=selectedStrength(card);
  const {hex,spec}=layerSpec(card,stage);
  if(!spec||!name||!strength)return;
  const signature=`${slugName(name)}|${slugStrength(strength)}|${hex}|${format}`;
  if(stage.dataset.aibtLayered===signature)return;
  stage.dataset.aibtLayered=signature;
  stage.dataset.overlayMode='none';
  stage.querySelectorAll('.product-visual-image,.product-visual-overlay,.aibt-product-layer,.aibt-vial-layer,.aibt-pen-layer').forEach(el=>el.remove());
  stage.appendChild(layerImage(base,`aibt-${prefix}-base`,`${name} ${strength} ${format}`));
  stage.appendChild(layerImage(`${VIAL_LAYER_ROOT}/templates/aibiotech-${prefix}-template-${spec.template}.webp`,`aibt-${prefix}-category`));
  stage.appendChild(layerImage(`${VIAL_LAYER_ROOT}/names/aibiotech-${prefix}-name-${slugName(name)}.webp`,`aibt-${prefix}-name`));
  stage.appendChild(layerImage(`${VIAL_LAYER_ROOT}/strengths/aibiotech-${prefix}-strength-${slugStrength(strength)}-${spec.strength}.webp`,`aibt-${prefix}-strength`));
 });
}
function applyVialLayers(root=document){applyLayeredFormat(root,'Vial',VIAL_BASE,'vial')}
function applyPenLayers(root=document){applyLayeredFormat(root,'Pen',PEN_BASE,'pen')}
function applyProductLayers(root=document){applyVialLayers(root);applyPenLayers(root)}
function scheduleProductLayers(){requestAnimationFrame(()=>requestAnimationFrame(()=>applyProductLayers()))}

function itemCategoryHex(item){
 const explicit=normalHex(item?.categoryHex||item?.categoryColor||'');
 if(CATEGORY_BY_HEX[explicit])return explicit;
 return PRODUCT_CATEGORY_HEX[slugName(item?.name)]||'#2563EB';
}
function buildLayeredItemVisual(item,className='aibt-cart-product-visual',size=68){
 const format=String(item?.format||'').trim();
 const box=document.createElement('div');
 box.className=className;
 box.dataset.format=format;
 box.dataset.name=String(item?.name||'');
 box.dataset.strength=String(item?.strength||'');
 Object.assign(box.style,{position:'relative',width:`${size}px`,height:`${size}px`,minWidth:`${size}px`,overflow:'hidden',borderRadius:'10px',background:'#f6f8fb'});
 if(format==='Cartridge'){
  if(item?.image)box.appendChild(layerImage(item.image,'aibt-cartridge-direct',String(item?.name||'Cartridge')));
  return box;
 }
 const prefix=format==='Vial'?'vial':format==='Pen'?'pen':'';
 if(!prefix){if(item?.image)box.appendChild(layerImage(item.image,'aibt-direct-fallback',String(item?.name||'')));return box}
 const hex=itemCategoryHex(item),spec=CATEGORY_BY_HEX[hex];
 if(!spec){if(item?.image)box.appendChild(layerImage(item.image,'aibt-direct-fallback',String(item?.name||'')));return box}
 const base=prefix==='vial'?VIAL_BASE:PEN_BASE;
 box.dataset.categoryHex=hex;
 box.appendChild(layerImage(base,`aibt-${prefix}-base`,`${item?.name||''} ${item?.strength||''} ${format}`));
 box.appendChild(layerImage(`${VIAL_LAYER_ROOT}/templates/aibiotech-${prefix}-template-${spec.template}.webp`,`aibt-${prefix}-category`));
 box.appendChild(layerImage(`${VIAL_LAYER_ROOT}/names/aibiotech-${prefix}-name-${slugName(item?.name)}.webp`,`aibt-${prefix}-name`));
 box.appendChild(layerImage(`${VIAL_LAYER_ROOT}/strengths/aibiotech-${prefix}-strength-${slugStrength(item?.strength)}-${spec.strength}.webp`,`aibt-${prefix}-strength`));
 return box;
}
function decorateItemRow(row,item,className,size){
 if(!row||!item)return;
 const signature=[item.variantId||'',item.name||'',item.strength||'',item.format||'',itemCategoryHex(item),item.image||''].join('|');
 const existing=row.querySelector(`.${className}`);
 if(existing?.dataset.signature===signature)return;
 row.querySelectorAll(`:scope > img,:scope > .${className}`).forEach(el=>el.remove());
 const node=buildLayeredItemVisual(item,className,size);node.dataset.signature=signature;
 row.insertBefore(node,row.firstChild);
}
function readStagingCart(){try{return JSON.parse(localStorage.getItem('aibt_staging_cart')||'[]')}catch{return []}}
function decorateCartVisuals(){
 const items=readStagingCart();
 document.querySelectorAll('#cartItems .cart-item').forEach((row,index)=>decorateItemRow(row,items[index],'aibt-cart-product-visual',68));
}
function scheduleCartVisuals(){requestAnimationFrame(()=>requestAnimationFrame(decorateCartVisuals));setTimeout(decorateCartVisuals,80)}
function persistCartCategory(productId){
 const card=document.getElementById(`card-${productId}`);
 const hex=normalHex(card?getComputedStyle(card).getPropertyValue('--cat').trim():'');
 if(!CATEGORY_BY_HEX[hex])return;
 const rows=readStagingCart();let changed=false;
 rows.forEach(item=>{if(item.productId===productId&&item.categoryHex!==hex){item.categoryHex=hex;changed=true}});
 if(changed)localStorage.setItem('aibt_staging_cart',JSON.stringify(rows));
}
window.AIBT_LAYER_VISUALS=Object.freeze({
  categoryByHex:CATEGORY_BY_HEX,
  categoryHex:itemCategoryHex,
  buildVisual:buildLayeredItemVisual,
  decorateRow:decorateItemRow,
  decorateCart:decorateCartVisuals
});

function wrapRenderAction(name){
 const original=window[name];if(typeof original!=='function'||original.__aibtLayerPatched)return;
 const wrapped=function(...args){const result=original.apply(this,args);scheduleProductLayers();setTimeout(scheduleProductLayers,80);return result};
 wrapped.__aibtLayerPatched=true;window[name]=wrapped;
}
function bindProductLayerActions(){
 ['changeStrength','changeFormat','showAllProducts','setCategory','applyFilters','searchCatalog'].forEach(wrapRenderAction);
 applyProductLayers();
 [120,350,800,1600].forEach(ms=>setTimeout(()=>{applyProductLayers();bindProductLayerActions()},ms));
}
function patchCartActions(){
 const add=window.addToCart;
 if(typeof add==='function'&&!add.__aibtCartLayerPatched){
  const wrapped=function(id,...args){const result=add.call(this,id,...args);persistCartCategory(id);scheduleCartVisuals();return result};
  wrapped.__aibtCartLayerPatched=true;window.addToCart=wrapped;
 }
 ['openCart','cartQty','removeCart'].forEach(name=>{
  const original=window[name];if(typeof original!=='function'||original.__aibtCartLayerPatched)return;
  const wrapped=function(...args){const result=original.apply(this,args);scheduleCartVisuals();return result};
  wrapped.__aibtCartLayerPatched=true;window[name]=wrapped;
 });
 decorateCartVisuals();
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
   scheduleProductLayers();
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
 bindProductLayerActions();
 patchCartActions();
 setTimeout(patchProductInfoVisual,150);
 setTimeout(patchResearchNavigation,150);
 setTimeout(patchResearchNavigation,700);
 [150,500,1200].forEach(ms=>setTimeout(patchCartActions,ms));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
