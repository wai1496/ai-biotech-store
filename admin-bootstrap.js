(function(){
  const errEl=()=>document.getElementById('loginError');
  function show(msg){const el=errEl();if(el)el.textContent=msg;console.error(msg)}
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(src);s.onerror=()=>reject(new Error('Failed to load '+src));document.head.appendChild(s)})}
  async function ensureSupabase(){
    if(window.supabase?.createClient)return;
    const cdns=[
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
      'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
    ];
    let last;
    for(const src of cdns){try{await load(src);if(window.supabase?.createClient)return}catch(e){last=e}}
    throw last||new Error('Supabase library could not be loaded');
  }
  async function boot(){
    try{
      await ensureSupabase();
      await load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/invoice-render.js');
      await load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/protocol-document.js');
      await load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/admin.js');
      try{await load('/admin-enhancements.js')}catch(e){console.warn(e)}
      if(typeof window.signIn!=='function')throw new Error('Admin login script did not initialize');
    }catch(e){show('Admin scripts failed to load. Please refresh once. '+(e.message||e));}
  }
  window.addEventListener('DOMContentLoaded',boot,{once:true});
})();
