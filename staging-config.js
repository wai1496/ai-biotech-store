window.AIBT_CONFIG = Object.freeze({
  environment: 'staging',
  label: 'STAGING PREVIEW — NO PRODUCTION WRITES',
  supabaseUrl: 'https://rpnwssqvurpdennpzplx.supabase.co',
  supabaseKey: 'sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh',
  checkoutEnabled: true,
  memberEnabled: true
});

window.toast = window.toast || function(message){
  let el = document.getElementById('toast');
  if(!el){
    el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el);
  }
  el.textContent = String(message || '');
  el.classList.add('show');
  clearTimeout(window.__aibtToastTimer);
  window.__aibtToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
};

(function loadStorefrontAssistant(){
  const path=String(location.pathname||'').toLowerCase();
  if(path.includes('/ops')||path.includes('/admin')) return;
  if(!document.querySelector('link[data-aibt-assistant]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='/ai-assistant.css?v=20260829a';link.dataset.aibtAssistant='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-aibt-assistant]')){
    const script=document.createElement('script');
    script.src='/ai-assistant.js?v=20260829a';script.async=true;script.dataset.aibtAssistant='1';
    document.head.appendChild(script);
  }
  if(!document.querySelector('link[data-aibt-final-polish]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='/storefront-polish-20260830.css?v=20260830c';link.dataset.aibtFinalPolish='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-aibt-final-polish]')){
    const script=document.createElement('script');
    script.src='/storefront-polish-20260830.js?v=20260830c';script.async=true;script.dataset.aibtFinalPolish='1';
    document.head.appendChild(script);
  }
  if(!document.querySelector('script[data-aibt-final-hero]')){
    const script=document.createElement('script');
    script.src='/hero-final-20260830.js?v=20260830c';script.async=true;script.dataset.aibtFinalHero='1';
    document.head.appendChild(script);
  }
  if(!document.querySelector('link[data-aibt-research-depth]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='/research-customer-depth-v2.css?v=20260830e';link.dataset.aibtResearchDepth='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-aibt-research-depth]')){
    const script=document.createElement('script');
    script.src='/research-customer-depth-v2.js?v=20260830e';script.async=true;script.dataset.aibtResearchDepth='1';
    document.head.appendChild(script);
  }
})();
