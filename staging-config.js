window.AIBT_CONFIG = Object.freeze({
  environment: 'staging',
  label: 'STAGING PREVIEW — NO PRODUCTION WRITES',
  supabaseProjectRef: 'rpnwssqvurpdennpzplx',
  supabaseUrl: 'https://rpnwssqvurpdennpzplx.supabase.co',
  supabaseKey: 'sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh',
  checkoutEnabled: true,
  memberEnabled: true,
  operationsPath: '/ops.html',
  masterAssets: Object.freeze({
    Vial: '/assets/vial-master-v4.svg?masterv=4',
    Pen: '/assets/pen-master-v4.svg?masterv=4',
    Cartridge: '/assets/cartridge-master-v5.svg?masterv=5'
  }),
  mediaPolicy: Object.freeze({
    allowLegacyVariantImages: false,
    missingVisualBehavior: 'neutral-placeholder'
  })
});

window.getAIBTSupabase = window.getAIBTSupabase || function(){
  const cfg=window.AIBT_CONFIG;
  if(!cfg||cfg.environment!=='staging') throw new Error('AI BioTech staging configuration is unavailable.');
  if(!String(cfg.supabaseUrl||'').includes(cfg.supabaseProjectRef)) throw new Error('AI BioTech staging Supabase project mismatch.');
  if(!window.supabase?.createClient) throw new Error('Supabase client library is unavailable.');
  if(!window.AIBT_SUPABASE) window.AIBT_SUPABASE=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  return window.AIBT_SUPABASE;
};

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
  if(path.endsWith('/progress.html')){
    if(!document.querySelector('script[data-aibt-progress-credentials]')){
      const script=document.createElement('script');
      script.src='/progress-credentials.js?v=20260831a';
      script.dataset.aibtProgressCredentials='1';
      document.head.appendChild(script);
    }
    return;
  }
  if(path.includes('/ops')||path.includes('/admin')) return;
  if(!document.querySelector('link[data-aibt-mobile-final]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='/storefront-mobile-final-20260830.css?v=20260830k';link.dataset.aibtMobileFinal='1';document.head.appendChild(link);
  }
  const loadBadgeCopy=()=>{
    if(!document.querySelector('script[data-aibt-research-badges]')){
      const script=document.createElement('script');script.src='/research-badges-copy.js?v=20260830h';script.dataset.aibtResearchBadges='1';document.head.appendChild(script);
    }
  };
  const loadCoverage3=()=>{
    if(!document.querySelector('script[data-pd-source-coverage3]')){
      const script=document.createElement('script');script.src='/research-source-coverage-3.js?v=20260830j';script.dataset.pdSourceCoverage3='1';document.head.appendChild(script);
    }
  };
  const loadCoverage2=()=>{
    if(!document.querySelector('script[data-pd-source-coverage2]')){
      const script=document.createElement('script');script.src='/research-source-coverage-2.js?v=20260830i';script.dataset.pdSourceCoverage2='1';script.onload=()=>setTimeout(loadCoverage3,80);document.head.appendChild(script);
    }else setTimeout(loadCoverage3,80);
  };
  const loadSourceOnly=()=>{
    if(!document.querySelector('link[data-pd-source-only]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='/research-source-only.css?v=20260830g';link.dataset.pdSourceOnly='1';document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-pd-source-only]')){
      const script=document.createElement('script');script.src='/research-source-only.js?v=20260830g';script.dataset.pdSourceOnly='1';script.onload=()=>{setTimeout(loadCoverage2,70);setTimeout(loadBadgeCopy,180)};document.head.appendChild(script);
    }else{setTimeout(loadCoverage2,70);setTimeout(loadBadgeCopy,180)}
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
    const script=document.createElement('script');script.src='/hero-final-20260830.js?v=20260830k';script.async=true;script.dataset.aibtFinalHero='1';document.head.appendChild(script);
  }
  setTimeout(loadSourceOnly,1800);
  setTimeout(loadCoverage2,2200);
  setTimeout(loadCoverage3,2450);
  setTimeout(loadBadgeCopy,2600);
})();
