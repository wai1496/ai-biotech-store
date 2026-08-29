(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs=t=>String(t||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>`<p>${esc(x)}</p>`).join('');
const arr=v=>Array.isArray(v)?v.filter(Boolean):[];
const waitFrames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const cache=new Map();
async function load(name){
 const key=String(name||'').toUpperCase();if(cache.has(key))return cache.get(key);
 try{const r=await fetch('/api/ai-product-insight?name='+encodeURIComponent(name),{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Research enrichment unavailable');const d=await r.json();cache.set(key,d);return d}catch(e){cache.set(key,null);return null}
}
function list(items){return `<ul class="aibt-depth-list">${arr(items).map(x=>`<li>${esc(typeof x==='string'?x:(x?.text||x?.finding||''))}</li>`).join('')}</ul>`}
function cards(items){return `<div class="aibt-depth-grid">${arr(items).map(x=>`<div>${esc(typeof x==='string'?x:(x?.text||''))}</div>`).join('')}</div>`}
function faq(items){const q=arr(items).filter(x=>x&&typeof x==='object'&&x.question&&x.answer);return q.length?`<div class="aibt-depth-faq">${q.map(x=>`<details><summary>${esc(x.question)}</summary><p>${esc(x.answer)}</p></details>`).join('')}</div>`:''}
function section(title,body,cls=''){return body?`<section class="aibt-depth-section ${cls}"><h2>${title}</h2>${body}</section>`:''}
async function enrich(id){
 await waitFrames();
 const card=document.querySelector('#aibtDeepResearch.show .aibt-deep-card')||document.querySelector('#researchDetailCenter.show .rc-detail');
 if(!card||card.dataset.customerDepth==='1')return;
 const name=card.querySelector('h1')?.textContent?.trim();if(!name)return;
 const data=await load(name),p=data?.profile;if(!p)return;
 card.dataset.customerDepth='1';
 const why=arr(p.why_researchers_study_it), findings=arr(p.key_findings), comps=arr(p.comparison_points), limits=arr(p.known_limitations);
 const html=`<div class="aibt-customer-depth">
   <div class="aibt-depth-label">DEEP RESEARCH PROFILE</div>
   ${section('In simple terms',paragraphs(p.plain_language_summary))}
   ${why.length?section('Why researchers are studying it',cards(why)):''}
   ${findings.length?section('Key findings from the evidence',list(findings)):''}
   ${section('What human research shows',paragraphs(p.human_evidence),'human')}
   ${section('What preclinical research shows',paragraphs(p.preclinical_evidence),'preclinical')}
   ${section('Safety and tolerability signals in published research',paragraphs(p.safety_and_tolerability),'safety')}
   ${section('Regulatory and development context',paragraphs(p.regulatory_context),'regulatory')}
   ${comps.length?section('How researchers compare it with related compounds',list(comps)):''}
   ${limits.length?section('What is still uncertain',list(limits),'limits'):''}
   ${arr(p.common_questions).length?section('Common research questions',faq(p.common_questions),'faq'):''}
  </div>`;
 const target=[...card.querySelectorAll('section')].find(s=>/Catalog strengths|Research references|Research and literature links/i.test(s.querySelector('h2,h3')?.textContent||''));
 if(target)target.insertAdjacentHTML('beforebegin',html);else card.insertAdjacentHTML('beforeend',html);
}
function patch(){
 const current=window.openResearchDetailCenter;if(typeof current!=='function'||current.__aibtCustomerDepth)return false;
 const wrapped=async function(id){const r=await current(id);setTimeout(()=>enrich(id),30);return r};wrapped.__aibtCustomerDepth=true;window.openResearchDetailCenter=wrapped;window.openResearch=wrapped;return true;
}
function install(){if(patch())return;setTimeout(patch,300);setTimeout(patch,800);setTimeout(patch,1300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1200),{once:true});else setTimeout(install,1200);
})();