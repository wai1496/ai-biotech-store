(function(){
  // Dashboard enhancement loader only. Authentication is handled directly by admin.html.
  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(src);s.onerror=()=>reject(new Error('Failed to load '+src));document.head.appendChild(s)})}
  async function bootDashboard(){
    try{
      // Do not write dashboard loading failures into the login/authentication message area.
      await load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/admin.js');
      Promise.allSettled([
        load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/invoice-render.js'),
        load('https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/protocol-document.js'),
        load('/admin-enhancements.js')
      ]).then(results=>results.forEach(r=>{if(r.status==='rejected')console.warn(r.reason)}));
    }catch(e){console.warn('Optional legacy dashboard script unavailable:',e)}
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bootDashboard,{once:true});else bootDashboard();
})();
