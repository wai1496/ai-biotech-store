(()=>{
'use strict';

const NAME_ALIAS=Object.freeze({
 'glow-70mg':'glow',
 'oxytocin-acetate':'oxytocin',
 'cjc-1295-with-dac':'cjc-1295',
 'cjc-1295-without-dac':'cjc-1295',
 'cjc-1295-without-dac-ipamorelin':'cjc-1295-ipamorelin'
});
const FALLBACK_HEX=Object.freeze({
 orange:'#F57C00',green:'#2EAA61',red:'#E63C3C',purple:'#8052B5',pink:'#FF4FA0',gold:'#D4AF37',yellow:'#E0B300','light-blue':'#38BDF8',blue:'#2563EB'
});

function slugName(value){
 const raw=String(value||'').trim().toLowerCase();
 if(raw==='nad+')return 'nad-plus';
 const slug=raw.replace(/\+/g,'-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-+/g,'-');
 return NAME_ALIAS[slug]||slug;
}
function slugStrength(value){
 const raw=String(value||'').trim().toLowerCase();
 const lead=raw.match(/^\s*(\d+(?:\.\d+)?)\s*(mg|ml)/i);
 if(lead)return `${lead[1]}${lead[2].toLowerCase()}`;
 return raw.replace(/\s+/g,'').replace(/[^a-z0-9.]/g,'');
}
function visibleTextFromStage(stage,kind){
 const card=stage.closest('.product-card');
 if(kind==='name')return card?.querySelector('.product-name')?.textContent?.trim()||stage.dataset.name||'';
 const explicit=card?.querySelector('select[data-role="strength"],select[name="strength"],.strength-select');
 if(explicit?.value)return explicit.value;
 const selects=[...(card?.querySelectorAll('.variant-row select')||[])];
 const candidate=selects.find(el=>!/vial|pen|cartridge/i.test(String(el.value||'')));
 return candidate?.value||stage.dataset.strength||'';
}
function colorFromSrc(src){
 const m=String(src||'').match(/-(orange|green|red|purple|pink|gold|yellow|light-blue|blue)\.webp/i);
 return m?FALLBACK_HEX[m[1].toLowerCase()]:'#1477ff';
}
function addFallback(img,kind,text){
 if(!img?.parentElement||img.dataset.aibtFallbackBound==='1')return;
 img.dataset.aibtFallbackBound='1';
 img.addEventListener('error',()=>{
   img.style.display='none';
   const stage=img.parentElement;
   if(stage.querySelector(`.aibt-layer-fallback[data-kind="${kind}"]`))return;
   const el=document.createElement('div');
   const color=colorFromSrc(img.getAttribute('src')||'');
   el.className='aibt-layer-fallback';
   el.dataset.kind=kind;
   el.dataset.categoryColor=color;
   el.textContent=kind==='strength'?String(text||'').split('(')[0].trim():String(text||'').trim();
   Object.assign(el.style,{position:'absolute',left:'50%',transform:'translateX(-50%)',width:'72%',textAlign:'center',fontFamily:'Arial,sans-serif',fontWeight:'800',pointerEvents:'none',zIndex:'8',color});
   if(kind==='name')Object.assign(el.style,{top:'48%',fontSize:'clamp(9px,1.6vw,18px)',lineHeight:'1.05'});
   else Object.assign(el.style,{top:'61%',fontSize:'clamp(8px,1.25vw,15px)',lineHeight:'1',padding:'3px 6px',borderRadius:'6px',background:'rgba(255,255,255,.94)',border:`1px solid ${color}33`});
   stage.appendChild(el);
 });
}
function repairLayer(img){
 const src=img.getAttribute('src')||'';
 const stage=img.closest('.product-visual-stage,.aibt-cart-product-visual,.aibt-checkout-product-visual,.aibt-product-visual');
 if(!stage)return;
 const kind=/-name-/.test(src)?'name':/-strength-/.test(src)?'strength':'';
 if(!kind)return;
 if(kind==='name'){
   const text=visibleTextFromStage(stage,'name')||stage.dataset.name||'';
   const slug=slugName(text);
   img.src=src.replace(/(aibiotech-(?:vial|pen)-name-)[^.]+(\.webp(?:\?.*)?)$/i,`$1${slug}$2`);
   addFallback(img,'name',text);
 } else {
   const text=visibleTextFromStage(stage,'strength')||stage.dataset.strength||'';
   const slug=slugStrength(text);
   img.src=src.replace(/(aibiotech-(?:vial|pen)-strength-)[^-]+(-(?:orange|green|red|purple|pink|gold|yellow|light-blue|blue)\.webp(?:\?.*)?)$/i,`$1${slug}$2`);
   addFallback(img,'strength',text);
 }
}
function repair(root=document){
 root.querySelectorAll('img.aibt-product-layer').forEach(repairLayer);
}
let queued=false;
function schedule(){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;repair()}));
}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
document.addEventListener('DOMContentLoaded',schedule);
[100,300,700,1400].forEach(ms=>setTimeout(schedule,ms));
window.AIBT_LAYER_COVERAGE_FIX=Object.freeze({slugName,slugStrength,repair,colorFromSrc});
})();
