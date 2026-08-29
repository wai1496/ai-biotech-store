(()=>{
'use strict';
const VIAL='https://yjauxyvtrmdriwtmckkl.supabase.co/storage/v1/object/public/catalog-media/masters/vial-master?v=1787940592891';
const PEN='https://yjauxyvtrmdriwtmckkl.supabase.co/storage/v1/object/public/catalog-media/masters/pen-master?v=1787940669584';
const CART='/assets/cartridge-master-v2.svg';
function fill(){
  const b=document.querySelector('.aibt-hero-banner');
  if(!b||b.dataset.built==='1')return false;
  b.dataset.built='1';
  b.removeAttribute('role'); b.removeAttribute('aria-label');
  b.innerHTML=`<div class="aibt-hero-copy">
      <div class="aibt-hero-kicker">AI BIOTECH RESEARCH CATALOG</div>
      <h1>Precision Peptide<br><span>Research Products</span></h1>
      <p>Professional research catalog with accurate strength and format selection, trusted product presentation, and clean biotech design.</p>
      <div class="aibt-hero-actions"><button type="button" class="aibt-shop-btn">Shop Products</button><button type="button" class="aibt-research-btn">Explore Research</button></div>
    </div>
    <div class="aibt-hero-science" aria-hidden="true"></div>
    <div class="aibt-hero-products" aria-label="AI BioTech product formats">
      <div class="aibt-hero-vial aibt-hero-product"><img src="${VIAL}" alt="AI BioTech vial"><div class="aibt-hero-vial-name">Retatrutide</div><div class="aibt-hero-vial-strength">10mg</div></div>
      <div class="aibt-hero-cartridge aibt-hero-product"><img src="${CART}" alt="AI BioTech cartridge"></div>
      <div class="aibt-hero-pen aibt-hero-product"><img src="${PEN}" alt="AI BioTech peptide pen"><div class="aibt-hero-pen-name">RETATRUTIDE</div><div class="aibt-hero-pen-strength">10mg</div></div>
      <div class="aibt-hero-platform"></div>
    </div>
    <div class="aibt-hero-trust">
      <div><span>❄</span><p><b>Cold Chain Packaging</b><small>Heat exposure reduction</small></p></div>
      <div><span>▣</span><p><b>Secure &amp; Discreet</b><small>Professional packaging</small></p></div>
      <div><span>⚗</span><p><b>Research Use Only</b><small>For laboratory research</small></p></div>
      <div><span>✓</span><p><b>Variant Accurate</b><small>Live price and stock selection</small></p></div>
    </div>`;
  b.querySelector('.aibt-shop-btn')?.addEventListener('click',()=>window.showAllProducts?.());
  b.querySelector('.aibt-research-btn')?.addEventListener('click',()=>window.openResearchCenter?.());
  return true;
}
function init(){
  if(fill())return;
  const hero=document.querySelector('.hero');
  if(!hero)return;
  const mo=new MutationObserver(()=>{if(fill())mo.disconnect()});
  mo.observe(hero,{childList:true,subtree:true});
  setTimeout(()=>{fill();mo.disconnect()},1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,260),{once:true});else setTimeout(init,260);
})();