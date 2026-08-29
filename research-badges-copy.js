(()=>{
'use strict';
function apply(){
  const spans=[...document.querySelectorAll('#researchCenterPage .rc-stats span')];
  if(spans.length<4)return false;
  const labels=['39 Catalog Products','Category Colour Coded','Source-Reviewed Research','Human vs Preclinical Evidence'];
  spans.slice(0,4).forEach((el,i)=>el.textContent=labels[i]);
  return true;
}
function patch(){
  const original=window.openResearchCenter;
  if(typeof original!=='function'||original.__aibtBadgeCopy)return false;
  const wrapped=async function(){const r=await original.apply(this,arguments);requestAnimationFrame(apply);setTimeout(apply,120);return r;};
  wrapped.__aibtBadgeCopy=true;
  window.openResearchCenter=wrapped;
  return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{patch();setTimeout(patch,500);},{once:true});else{patch();setTimeout(patch,500);}
})();
