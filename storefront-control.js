(()=>{
'use strict';
const cfg=window.AIBT_CONFIG||{};
const db=window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseKey);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
let site=null,menu=[],pages=[];

function storeToast(text){if(typeof window.toast==='function')return window.toast(text);const t=document.getElementById('toast');if(!t)return;t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function runMenu(item){
 if(!item)return;
 if(item.target_type==='section'){
   if(item.target==='catalog'&&typeof window.showAllProducts==='function')return window.showAllProducts();
   return window.scrollToId?.(item.target);
 }
 if(item.target_type==='page')return window.openPublishedPage(item.target);
 if(item.target_type==='url'){
   try{const u=new URL(item.target,location.origin);if(!['http:','https:'].includes(u.protocol))throw new Error('Unsupported URL');window.open(u.href,u.origin===location.origin?'_self':'_blank',u.origin===location.origin?'':'noopener,noreferrer')}catch{return storeToast('This menu URL is invalid.')}
   return;
 }
 if(item.target_type==='action'){
   const actions={shop:()=>window.showAllProducts?.(),account:()=>window.openStageAccount?.(),cart:()=>window.openCart?.(),research:()=>window.scrollToId?.('research')};
   return actions[item.target]?.()||storeToast('This menu action is not available yet.');
 }
}
window.runStoreMenu=index=>runMenu(menu[index]);

function applyBrand(){
 const name=site?.store_name||'AI BioTech',tag=site?.tagline||'Precision Peptide Research';
 document.querySelectorAll('.brand strong').forEach(el=>{const parts=name.trim().split(/\s+/);const first=parts.shift()||'AI';el.innerHTML=`<span>${esc(first)}</span> ${esc(parts.join(' ')||'BioTech')}`});
 document.querySelectorAll('.brand small').forEach(el=>el.textContent=tag.toUpperCase());
 document.body.dataset.theme=site?.theme_key||'clean-store';document.body.dataset.siteMode=site?.site_mode||'staging';document.body.dataset.safeMode=String(site?.safe_mode!==false);
 const old=document.getElementById('storeAnnouncement');if(old)old.remove();
 if(String(site?.announcement||'').trim()){
   const bar=document.createElement('div');bar.id='storeAnnouncement';bar.className='store-announcement';bar.textContent=site.announcement;document.querySelector('.stagebar')?.insertAdjacentElement('afterend',bar);
 }
}
function navButton(item,index){return `<button onclick="runStoreMenu(${index})">${esc(item.label)}</button>`}
function applyMenus(){
 const main=menu.filter(x=>x.menu_group==='main'&&x.active).sort((a,b)=>a.sort_order-b.sort_order);
 if(!main.length)return;
 const desktop=document.querySelector('.desktop-nav');if(desktop)desktop.innerHTML=main.map((m,i)=>navButton(m,menu.indexOf(m))).join('');
 const panel=document.querySelector('#mobileMenu .mobile-panel');if(panel){
   const brand=panel.querySelector('.brand'),close=panel.querySelector('.close-btn');
   [...panel.children].filter(x=>x!==brand&&x!==close).forEach(x=>x.remove());
   main.forEach(m=>{const b=document.createElement('button');b.textContent=m.label;b.onclick=()=>{runMenu(m);window.closeMobileMenu?.()};panel.appendChild(b)});
   const account=document.createElement('button');account.textContent='Account';account.onclick=()=>{window.openStageAccount?.();window.closeMobileMenu?.()};panel.appendChild(account);
   const cart=document.createElement('button');cart.innerHTML='Cart (<span data-cart-count>0</span>)';cart.onclick=()=>{window.openCart?.();window.closeMobileMenu?.()};panel.appendChild(cart);
   const count=document.querySelector('.mobile-sticky-cart [data-cart-count]')?.textContent||'0';panel.querySelector('[data-cart-count]')?.replaceChildren(document.createTextNode(count));
 }
}
function publishedPage(slug){return pages.find(p=>p.slug===slug&&p.published)}
window.openPublishedPage=slug=>{
 const p=publishedPage(slug);
 if(!p)return storeToast('This page is not published yet.');
 const title=document.getElementById('modalTitle'),body=document.getElementById('modalBody'),wrap=document.getElementById('modalWrap');
 if(!title||!body||!wrap)return;
 title.textContent=p.title;body.innerHTML=`<article class="published-page"><div class="page-copy">${esc(p.content).replace(/\n/g,'<br>')}</div><div class="page-status">Published staging page · /${esc(p.slug)}</div></article>`;wrap.classList.add('show');document.body.style.overflow='hidden';
};
function applyFooterPages(){
 const target=[...document.querySelectorAll('.footer-inner>div')].find(x=>x.querySelector('h4')?.textContent.includes('Contact'));
 if(!target)return;const visible=pages.filter(p=>p.published&&p.show_in_footer).sort((a,b)=>a.sort_order-b.sort_order);
 target.innerHTML='<h4>Contact & Policies</h4>'+(visible.length?visible.map(p=>`<button onclick="openPublishedPage('${esc(p.slug)}')">${esc(p.title)}</button>`).join(''):`<button onclick="openPublishedPage('contact')">Contact</button><button onclick="openPublishedPage('terms')">Terms & Conditions</button><button onclick="openPublishedPage('privacy')">Privacy & Cookies</button>`);
}
async function load(){
 if(!db)return;
 const [s,m,p]=await Promise.all([
   db.from('site_control').select('theme_key,site_mode,safe_mode,store_name,tagline,announcement').eq('id','primary').maybeSingle(),
   db.from('menu_items').select('id,menu_group,label,target_type,target,active,sort_order').eq('active',true).order('sort_order'),
   db.from('content_pages').select('id,slug,title,content,published,show_in_footer,sort_order').eq('published',true).order('sort_order')
 ]);
 if(s.error||m.error||p.error){console.warn('Storefront control layer skipped',s.error||m.error||p.error);return}
 site=s.data;menu=m.data||[];pages=p.data||[];applyBrand();applyMenus();applyFooterPages();
}
document.addEventListener('DOMContentLoaded',load);
})();
