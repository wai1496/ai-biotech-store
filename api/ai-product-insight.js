module.exports = async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  const key=process.env.GEMINI_API_KEY;
  if(!key){res.status(503).json({error:'AI research is not configured yet. Add GEMINI_API_KEY in Vercel project environment variables.'});return;}
  const name=String((req.method==='POST'?req.body?.name:req.query?.name)||'').trim();
  if(!name||name.length>120){res.status(400).json({error:'Valid product name required'});return;}
  const prompt=`Research the compound/product name: ${name}. Use Google Search grounding. Return a concise research-only product profile suitable for an ecommerce Research Insight page. Do not give dosing, administration, treatment recommendations, individualized medical advice, or claims that a research product is equivalent to an approved medicine. Clearly distinguish established facts, investigational evidence, preclinical evidence, and uncertainty. Output ONLY valid JSON with keys: short_description (1-2 sentences), overview (2-4 paragraphs), molecular_identity, mechanism, research_areas (array of short strings), evidence_context, cautions, source_notes. Keep it neutral, scientific, and source-backed.`;
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:.2,responseMimeType:'application/json'}})
    });
    const raw=await r.json();
    if(!r.ok)throw new Error(raw?.error?.message||'Gemini request failed');
    const candidate=raw?.candidates?.[0];
    const text=candidate?.content?.parts?.map(p=>p.text||'').join('')||'{}';
    let profile;try{profile=JSON.parse(text)}catch{profile={short_description:'Research profile generated.',overview:text,research_areas:[]}}
    const chunks=candidate?.groundingMetadata?.groundingChunks||[];
    const sources=[];
    for(const c of chunks){const w=c.web;if(w?.uri&&!sources.some(s=>s.url===w.uri))sources.push({title:w.title||w.uri,url:w.uri});if(sources.length>=8)break;}
    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({name,profile,sources,generated_at:new Date().toISOString()});
  }catch(e){res.status(500).json({error:e.message||String(e)});}
}