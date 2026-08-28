(function(){
  const errEl=()=>document.getElementById('loginError');
  function show(msg){const el=errEl();if(el)el.textContent=msg;console.error(msg)}
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(src);s.onerror=()=>reject(new Error('Failed to load '+src));document.head.appendChild(s)})}
  async function ensureSupabase(){
    if(window.supabase?.createClient)return;
    const cdns=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'];
    let last;for(const src of cdns){try{await load(src);if(window.supabase?.createClient)return}catch(e){last=e}}throw last||new Error('Supabase library could not be loaded');
  }
  async function boot(){
    try{
      await ensureSupabase();
      // Login/admin core is required. Invoice/protocol helpers are optional and must never block authentication.
      await load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/admin.js');
      Promise.allSettled([
        load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/invoice-render.js'),
        load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/protocol-document.js'),
        load('/admin-enhancements.js')
      ]).then(results=>results.forEach(r=>{if(r.status==='rejected')console.warn(r.reason)}));
      if(typeof window.signIn!=='function')throw new Error('Admin login script did not initialize');
      show('');
    }catch(e){show('Admin login failed to initialize. '+(e.message||e));}
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
