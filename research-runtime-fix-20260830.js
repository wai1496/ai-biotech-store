(()=>{
'use strict';
// Capture the complete local Research Center renderer before later storefront polish replaces it.
const baseResearch=window.openResearchDetailCenter;
if(typeof baseResearch==='function'&&!window.AIBTBaseResearchDetail)window.AIBTBaseResearchDetail=baseResearch;

const twoFrames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

function closeDeep(){
 const deep=document.getElementById('aibtDeepResearch');
 deep?.classList.remove('show');
 const rc=document.getElementById('researchCenterPage');
 document.body.style.overflow=rc?.classList.contains('show')?'hidden':'';
}

async function replaceWithCompleteLocalProfile(id){
 const base=window.AIBTBaseResearchDetail;
 if(typeof base!=='function')return;
 const deep=document.getElementById('aibtDeepResearch');
 if(!deep?.classList.contains('show'))return;
 try{
  await base(id);
  await twoFrames();
  const sourceBack=document.getElementById('researchDetailCenter');
  const source=sourceBack?.querySelector('.rc-detail');
  if(!source)return;
  const clone=source.cloneNode(true);
  const accent=source.style.getPropertyValue('--rc')||'#1477ff';
  clone.classList.add('aibt-deep-card','aibt-complete-local-research');
  clone.style.setProperty('--research-accent',accent);
  clone.querySelector('.rc-detail-close')?.remove();
  const close=document.createElement('button');
  close.type='button';close.className='aibt-deep-close';close.setAttribute('aria-label','Close');close.textContent='×';
  close.addEventListener('click',closeDeep);
  clone.prepend(close);
  deep.replaceChildren(clone);
  sourceBack.classList.remove('show');
  document.body.style.overflow='hidden';
 }catch(err){console.warn('Complete research fallback skipped',err)}
}

function patchFinalResearch(){
 const current=window.openResearchDetailCenter;
 if(typeof current!=='function'||current===window.AIBTBaseResearchDetail||current.__aibtCompleteResearch)return false;
 const wrapped=async function(id){
  const result=await current(id);
  // The AI endpoint is enrichment only. Always replace a thin/empty response with the complete local profile.
  const card=document.querySelector('#aibtDeepResearch .aibt-deep-card');
  const sectionCount=card?.querySelectorAll('section').length||0;
  const text=card?.textContent||'';
  if(sectionCount<6||!/Molecular|Mechanism|Research areas|Evidence/i.test(text))await replaceWithCompleteLocalProfile(id);
  return result;
 };
 wrapped.__aibtCompleteResearch=true;
 window.openResearchDetailCenter=wrapped;
 window.openResearch=wrapped;
 return true;
}

function install(){
 if(patchFinalResearch())return;
 setTimeout(patchFinalResearch,250);
 setTimeout(patchFinalResearch,700);
 setTimeout(patchFinalResearch,1150);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900),{once:true});
else setTimeout(install,900);
})();
