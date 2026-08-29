(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
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
 const color=layout.querySelector('.category-badge')?.style?.background||'#1477ff';
 const box=document.createElement('div');
 box.className='info-visual';box.dataset.format=format;box.style.setProperty('--cat',color);
 img.replaceWith(box);box.appendChild(img);
 const label=document.createElement('div');label.className='info-dynamic-label';
 label.innerHTML=`<div class="name">${esc(title)}</div><div class="strength">${esc(strength)}</div>`;
 box.appendChild(label);
}
const original=window.openProductInfo;
if(typeof original==='function'){
 window.openProductInfo=function(id){
   original(id);
   requestAnimationFrame(()=>requestAnimationFrame(decorateInfo));
 };
}
function normalizeCards(){
 document.querySelectorAll('.product-card').forEach(card=>{
  const label=card.querySelector('.dynamic-label');
  if(label&&!label.dataset.aibtNormalized){label.dataset.aibtNormalized='1';}
 });
}
const mo=new MutationObserver(()=>normalizeCards());
function init(){normalizeCards();const grid=document.getElementById('productGrid');if(grid)mo.observe(grid,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();