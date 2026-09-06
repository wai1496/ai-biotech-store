/* Shared storefront visual adapter.
   Real uploaded variant images keep highest priority. Placeholder composition is
   delegated to visual-renderer.js so Pen, Vial and Cartridge use one rule set. */
(function(){
  const CARTRIDGE_REFERENCE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co/storage/v1/object/public/catalog-media/masters/cartridge-master-admin.webp';
  const CARTRIDGE_BUNDLED_REFERENCE='/assets/cartridge-master-approved.webp';
  const CARTRIDGE_BLANK_MASTER='/assets/cartridge-master-blank-approved.webp';

  function isSharedMasterImage(url,form){
    const s=String(url||'').toLowerCase();
    if(!s)return false;
    if(form==='Cartridge')return s.includes('/catalog-media/masters/cartridge-master-admin');
    if(!s.includes('/catalog-media/masters/'))return false;
    if(form==='Vial')return s.includes('vial-master');
    if(form==='Pen')return s.includes('pen-master');
    return false;
  }
  function standardCartridgeSource(){return CARTRIDGE_REFERENCE_URL+'?v='+Date.now()}
  function bundledCartridgeSource(){return CARTRIDGE_BUNDLED_REFERENCE}
  function sharedMasterSource(p,v,form){
    const rr=real(p,v);
    if(form==='Cartridge')return CARTRIDGE_BLANK_MASTER;
    if(isSharedMasterImage(rr,form))return rr;
    return masters?.[form]||rr||'';
  }
  function renderImage(el,url,alt,fallback=''){
    if(!url){renderMissing(el,'IMAGE');return}
    const img=document.createElement('img');img.src=url;img.alt=alt||'AI BioTech product visual';
    if(fallback)img.onerror=()=>{img.onerror=null;img.src=fallback};
    el.innerHTML='';el.appendChild(img);
  }
  function renderMissing(el,form){el.innerHTML=`<div class="missing"><b>${form} MASTER NOT UPLOADED</b><br><small>Admin → Master Placeholders</small></div>`}
  function renderStandardCartridge(el,name){renderImage(el,standardCartridgeSource(),name||'AI BioTech peptide cartridge',bundledCartridgeSource())}
  function renderStaticFallback(el,p,v,form,src){
    if(form==='Cartridge'){renderStandardCartridge(el,p?.name);return}
    if(src){renderImage(el,src,p?.name||`${form} product visual`);return}
    renderMissing(el,form);
  }

  window.visual=function(p,v,el){
    const form=v?.form||v?.format||'Vial';
    const token=(el.__aibtVisualToken||0)+1;el.__aibtVisualToken=token;
    const rr=real(p,v),shared=isSharedMasterImage(rr,form);

    /* A genuine uploaded variant image always wins over placeholder composition. */
    if(rr&&!shared){renderImage(el,rr,p?.name||`${form} product visual`);return}

    const R=window.AIBTVisualRenderer;
    if(form==='Cartridge'){
      if(!R||R.cartridgeVisualMode(p?.name)!=='dynamic'){renderStandardCartridge(el,p?.name);return}
    }

    const src=sharedMasterSource(p,v,form);
    if(!R){renderStaticFallback(el,p,v,form,src);return}
    if(!src){renderStaticFallback(el,p,v,form,src);return}

    const strength=main(v?.strength||v?.strength_label||'');
    if(!String(p?.name||'').trim()||!String(strength||'').trim()){
      renderStaticFallback(el,p,v,form,src);return;
    }

    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1536;
    window.AIBTVisualRenderer.renderPreview({
      canvas,
      masterUrl:src,
      productName:p.name,
      strength,
      format:form,
      accent:color(p),
      cartridgeBlank:form==='Cartridge',
      vialCapMode:'white'
    }).then(result=>{
      if(el.__aibtVisualToken!==token)return;
      if(form==='Cartridge'&&result?.mode==='reference-only'){
        renderStandardCartridge(el,p.name);return;
      }
      el.innerHTML='';el.appendChild(canvas);
    }).catch(()=>{
      if(el.__aibtVisualToken!==token)return;
      renderStaticFallback(el,p,v,form,src);
    });
  };
})();

/* Responsive navigation/controller. */
(function(){
  function toast(message){let el=document.querySelector('.shell-toast');if(!el){el=document.createElement('div');el.className='shell-toast';document.body.appendChild(el)}el.textContent=message;el.hidden=false;clearTimeout(window.__shellToastTimer);window.__shellToastTimer=setTimeout(()=>{el.hidden=true},2200)}
  function closeMobileNav(){document.body.classList.remove('shell-nav-open');const b=document.querySelector('.shell-menu');if(b){b.setAttribute('aria-expanded','false');b.textContent='☰'}}
  function openAbout(){let back=document.querySelector('.shell-about-backdrop');if(!back){back=document.createElement('div');back.className='shell-about-backdrop';back.innerHTML='<div class="shell-about-card" role="dialog" aria-modal="true" aria-label="About AI BioTech"><button type="button" aria-label="Close">×</button><h2><span style="color:#18c9ff">AI</span> BioTech</h2><p>Precision peptide research catalog with category-based product organization, research information, cold-chain handling information and secure packaging guidance.</p><p>For research purposes only. Not for human consumption.</p></div>';document.body.appendChild(back);back.querySelector('button').addEventListener('click',()=>back.remove());back.addEventListener('click',e=>{if(e.target===back)back.remove()})}}
  function bind(){const actions=document.querySelector('.actions'),nav=document.querySelector('.nav');if(!actions||!nav)return;const actionButtons=[...actions.querySelectorAll('button')],currency=actionButtons.find(b=>(b.textContent||'').toUpperCase().includes('MYR')),admin=actionButtons.find(b=>(b.textContent||'').toUpperCase().includes('ADMIN')),cart=actionButtons.find(b=>(b.textContent||'').includes('🛒')||(b.textContent||'').toUpperCase().includes('CART'));if(currency){currency.onclick=null;currency.setAttribute('aria-label','Currency MYR');currency.addEventListener('click',()=>toast('Currency is set to MYR.'))}if(admin){admin.onclick=null;admin.addEventListener('click',()=>{if(typeof window.openAdmin==='function')window.openAdmin();else location.href='/admin.html'})}if(cart){cart.onclick=null;cart.addEventListener('click',()=>{if(typeof window.toggleCart==='function')window.toggleCart()})}if(!actions.querySelector('.shell-menu')){const menu=document.createElement('button');menu.type='button';menu.className='shell-menu';menu.textContent='☰';menu.setAttribute('aria-label','Open navigation');menu.setAttribute('aria-expanded','false');menu.addEventListener('click',()=>{const open=document.body.classList.toggle('shell-nav-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰'});actions.appendChild(menu)}[...nav.querySelectorAll('button')].forEach(btn=>{const text=(btn.textContent||'').replace(/[^A-Za-z ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();btn.onclick=null;let handler=null;if(text.includes('HOME'))handler=()=>window.scrollTo({top:0,behavior:'smooth'});else if(text.includes('CATALOG'))handler=()=>{try{showAll=true;category='All';if(typeof renderProducts==='function')renderProducts()}catch{}document.getElementById('catalog')?.scrollIntoView({behavior:'smooth',block:'start'})};else if(text.includes('PEPTIDES'))handler=()=>document.getElementById('cats')?.scrollIntoView({behavior:'smooth',block:'start'});else if(text.includes('RESEARCH'))handler=()=>{if(typeof window.openResearch==='function')window.openResearch();else toast('Research catalog is loading.')};else if(text.includes('GUIDES'))handler=()=>{if(typeof window.openGuides==='function')window.openGuides('home');else toast('Guides are loading.')};else if(text.includes('FAQ'))handler=()=>{if(typeof window.openFAQ==='function')window.openFAQ();else toast('FAQ is loading.')};else if(text.includes('CALCULATOR'))handler=()=>{location.href='/peptide-calculator.html'};else if(text.includes('ABOUT'))handler=openAbout;if(handler)btn.addEventListener('click',e=>{e.preventDefault();handler();closeMobileNav()})});document.querySelector('.hero .primary')?.addEventListener('click',()=>closeMobileNav());window.addEventListener('resize',()=>{if(innerWidth>=640)closeMobileNav()},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMobileNav();document.querySelector('.shell-about-backdrop')?.remove()}})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
