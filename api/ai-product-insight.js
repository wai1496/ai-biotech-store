module.exports = async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  const key=process.env.GEMINI_API_KEY;
  if(!key){res.status(503).json({error:'AI research is not configured yet.'});return;}
  const name=String((req.method==='POST'?req.body?.name:req.query?.name)||'').trim();
  if(!name||name.length>120){res.status(400).json({error:'Valid product name required'});return;}
  const prompt=`Research the compound/product name: ${name}. Use Google Search grounding and prefer primary literature, clinical trial registries, regulator pages, review articles, and reputable academic sources. Build a detailed research-only profile suitable for an AI BioTech Research Insight page. Do not provide dosing, administration instructions, treatment recommendations, individualized medical advice, or imply that catalog material is equivalent to an approved medicine. Clearly distinguish established facts, investigational findings, preclinical evidence, uncertainty, and formulation-specific limitations. Output ONLY valid JSON with these keys: short_description (2-3 sentences), overview (5-8 substantial paragraphs separated by double newlines), molecular_identity, molecular_class, mechanism (detailed), targets_and_pathways (array), research_areas (array of 5-10 short strings), evidence_context (2-4 paragraphs), development_status, known_limitations (array), cautions (2-4 sentences), source_notes (brief explanation of what the cited literature supports). Keep the tone neutral, scientific, readable, and source-backed.`;
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:.15,responseMimeType:'application/json'}})
    });
    const raw=await r.json();
    if(!r.ok)throw new Error(raw?.error?.message||'Gemini request failed');
    const candidate=raw?.candidates?.[0];
    const text=candidate?.content?.parts?.map(p=>p.text||'').join('')||'{}';
    let profile;
    try{profile=JSON.parse(text)}catch{profile={short_description:'Research profile generated.',overview:text,research_areas:[],targets_and_pathways:[],known_limitations:[]}}
    const chunks=candidate?.groundingMetadata?.groundingChunks||[];
    const sources=[];
    for(const c of chunks){
      const w=c.web;
      if(w?.uri&&!sources.some(s=>s.url===w.uri))sources.push({title:w.title||'Research source',url:w.uri});
      if(sources.length>=12)break;
    }
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=604800');
    res.status(200).json({name,profile,sources,source_count:sources.length,generated_at:new Date().toISOString()});
  }catch(e){res.status(500).json({error:e.message||String(e)});}
}