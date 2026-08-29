module.exports=async function handler(req,res){
  if(process.env.VERCEL_ENV==='production'){res.status(404).json({error:'Not available in production'});return;}
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  const auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer ')){res.status(401).json({error:'Authenticated staging admin required'});return;}
  const token=auth.slice(7);
  const sbUrl='https://rpnwssqvurpdennpzplx.supabase.co';
  const sbKey='sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh';
  try{
    const u=await fetch(sbUrl+'/auth/v1/user',{headers:{apikey:sbKey,Authorization:'Bearer '+token}});
    const user=await u.json();if(!u.ok||!user?.id){res.status(401).json({error:'Invalid staging session'});return;}
    const a=await fetch(sbUrl+`/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role`,{headers:{apikey:sbKey,Authorization:'Bearer '+token,Accept:'application/json'}});
    const admins=await a.json();if(!a.ok||!Array.isArray(admins)||!admins.length){res.status(403).json({error:'Staging admin access required'});return;}
    const key=process.env.GEMINI_API_KEY;
    if(!key){res.status(503).json({code:'AI_PROVIDER_NOT_CONFIGURED',error:'AI provider is not configured on this Vercel project yet. The Product Intelligence workspace remains usable manually.'});return;}
    const name=String(req.body?.name||'').trim(),category=String(req.body?.category||'').trim(),research=String(req.body?.research_summary||'').trim().slice(0,3500);
    if(!name||name.length>120){res.status(400).json({error:'Valid product name required'});return;}
    const prompt=`Create a research-only ecommerce content draft for the catalog item ${name}. Category: ${category||'unspecified'}. Existing public research context: ${research||'none supplied'}. Use Google Search grounding. Do not provide dosing, administration, treatment recommendations, individualized medical advice, or imply catalog material is equivalent to an approved medicine. Clearly distinguish established facts, investigational evidence, preclinical evidence and uncertainty. Output ONLY valid JSON with keys short_description, long_description, seo_title, seo_description, tags (array of short strings), research_summary, evidence_context. Keep descriptions neutral, concise, scientific and suitable for admin review before publication.`;
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:.2,responseMimeType:'application/json'}})});
    const raw=await r.json();if(!r.ok)throw new Error(raw?.error?.message||'AI provider request failed');
    const candidate=raw?.candidates?.[0],text=candidate?.content?.parts?.map(p=>p.text||'').join('')||'{}';
    let draft;try{draft=JSON.parse(text)}catch{draft={short_description:'',long_description:text,seo_title:`${name} Research Overview | AI BioTech`,seo_description:`Research-focused overview of ${name}.`,tags:[],research_summary:'',evidence_context:''}}
    const chunks=candidate?.groundingMetadata?.groundingChunks||[],sources=[];for(const c of chunks){const w=c.web;if(w?.uri&&!sources.some(s=>s.url===w.uri))sources.push({title:w.title||w.uri,url:w.uri});if(sources.length>=8)break;}
    res.setHeader('Cache-Control','no-store');res.status(200).json({name,draft,sources,generated_at:new Date().toISOString(),provider:'gemini-search-grounded'});
  }catch(e){res.status(500).json({error:e.message||String(e)});}
};
