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
  if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el);}
  el.textContent = String(message || '');
  el.classList.add('show');
  clearTimeout(window.__aibtToastTimer);
  window.__aibtToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
};

(function loadStorefrontLayers(){
  const path=String(location.pathname||'').toLowerCase();
  if(path.includes('/ops')||path.includes('/admin')) return;
  const loadBadgeCopy=()=>{
    if(!document.querySelector('script[data-aibt-research-badges]')){
      const script=document.createElement('script');script.src='/research-badges-copy.js?v=20260830h';script.dataset.aibtResearchBadges='1';document.head.appendChild(script);
    }
  };
  const loadCoverage2=()=>{
    if(!document.querySelector('script[data-pd-source-coverage2]')){
      const script=document.createElement('script');script.src='/research-source-coverage-2.js?v=20260830i';script.dataset.pdSourceCoverage2='1';document.head.appendChild(script);
    }
  };
  const loadSourceOnly=()=>{
    if(!document.querySelector('link[data-pd-source-only]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='/research-source-only.css?v=20260830g';link.dataset.pdSourceOnly='1';document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-pd-source-only]')){
      const script=document.createElement('script');script.src='/research-source-only.js?v=20260830g';script.dataset.pdSourceOnly='1';script.onload=()=>{setTimeout(loadCoverage2,70);setTimeout(loadBadgeCopy,120)};document.head.appendChild(script);
    }else{setTimeout(loadCoverage2,70);setTimeout(loadBadgeCopy,120)}
  };
  if(!document.querySelector('link[data-aibt-assistant]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='/ai-assistant.css?v=20260829a';link.dataset.aibtAssistant='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-aibt-assistant]')){
    const script=document.createElement('script');script.src='/ai-assistant.js?v=20260829a';script.async=true;script.dataset.aibtAssistant='1';document.head.appendChild(script);
  }
  if(!document.querySelector('link[data-aibt-final-polish]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='/storefront-polish-20260830.css?v=20260830c';link.dataset.aibtFinalPolish='1';document.head.appendChild(link);
  }
  let polish=document.querySelector('script[data-aibt-final-polish]');
  if(!polish){
    polish=document.createElement('script');polish.src='/storefront-polish-20260830.js?v=20260830c';polish.dataset.aibtFinalPolish='1';polish.onload=()=>setTimeout(loadSourceOnly,80);document.head.appendChild(polish);
  }else if(polish.dataset.loaded==='1')setTimeout(loadSourceOnly,80);else polish.addEventListener('load',()=>setTimeout(loadSourceOnly,80),{once:true});
  polish.addEventListener('load',()=>{polish.dataset.loaded='1'},{once:true});
  if(!document.querySelector('script[data-aibt-final-hero]')){
    const script=document.createElement('script');script.src='/hero-final-20260830.js?v=20260830c';script.async=true;script.dataset.aibtFinalHero='1';document.head.appendChild(script);
  }
  setTimeout(loadSourceOnly,1800);
  setTimeout(loadCoverage2,2200);
  setTimeout(loadBadgeCopy,2400);
})();
