(function(){
  // Dashboard enhancement loader only. Authentication is handled directly by admin.html.
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(src);s.onerror=()=>reject(new Error('Failed to load '+src));document.head.appendChild(s)})}
  async function bootDashboard(){
    try{
      // Load the legacy dashboard through the current deployment so mobile browsers do not depend on an old Vercel hostname.
      await load('/api/legacy-admin');
      Promise.allSettled([
        load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/invoice-render.js'),
        load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/protocol-document.js'),
        load('/admin-enhancements.js')
      ]).then(results=>results.forEach(r=>{if(r.status==='rejected')console.warn(r.reason)}));
      if(typeof window.boot==='function'){
        const {data}=await window.supabase.createClient('https://yjauxyvtrmdriwtmckkl.supabase.co','sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF').auth.getSession();
        if(data?.session)window.boot();
      }
    }catch(e){console.warn('Dashboard script unavailable:',e)}
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bootDashboard,{once:true});else bootDashboard();
})();
