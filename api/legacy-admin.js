export default async function handler(req,res){
  const target='https://ai-biotech-store-5bzil4acc-rk-cd1c.vercel.app/admin.js';
  try{
    const r=await fetch(target,{headers:{'user-agent':'AI-BioTech-Admin-Proxy/1.0'}});
    if(!r.ok){res.status(r.status).setHeader('content-type','text/plain').send('// legacy admin unavailable');return}
    const js=await r.text();
    res.setHeader('content-type','application/javascript; charset=utf-8');
    res.setHeader('cache-control','public, max-age=300, s-maxage=300');
    res.status(200).send(js);
  }catch(e){res.status(502).setHeader('content-type','text/plain').send('// proxy error');}
}
