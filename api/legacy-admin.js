export default async function handler(req,res){
  const target='https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/admin.js';
  try{
    const r=await fetch(target,{headers:{'user-agent':'AI-BioTech-Admin-Proxy/1.0'}});
    if(!r.ok){res.status(r.status).setHeader('content-type','application/javascript; charset=utf-8');res.send("console.error('Legacy admin unavailable');");return}
    let js=await r.text();
    // The legacy bundle declares top-level lexical bindings (sb, role, current, rows, page, boot).
    // A previous inline login shim used the same names and caused the entire dashboard bundle to fail parsing.
    // Rename only the legacy Supabase client binding so the bundle can execute safely alongside the auth shim.
    js=js.replace(/^const sb=/,'const adminSb=')
         .replace(/\bsb\./g,'adminSb.');
    res.setHeader('content-type','application/javascript; charset=utf-8');
    res.setHeader('cache-control','no-store, max-age=0');
    res.status(200).send(js);
  }catch(e){res.status(502).setHeader('content-type','application/javascript; charset=utf-8');res.send("console.error('Admin proxy error');");}
}
