module.exports = async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  const key=process.env.GEMINI_API_KEY;
  if(!key){res.status(503).json({error:'AI research is not configured yet.'});return;}
  const name=String((req.method==='POST'?req.body?.name:req.query?.name)||'').trim();
  if(!name||name.length>120){res.status(400).json({error:'Valid product name required'});return;}
  const prompt=`Research the compound/product name: ${name}. Use Google Search grounding and prefer primary literature, clinical trial registries, regulator pages, peer-reviewed reviews, official prescribing/regulatory material where relevant, and reputable academic sources. Build a deep but readable research-only profile for an AI BioTech customer Research Insight page. Do not provide dosing, administration instructions, treatment recommendations, individualized medical advice, or imply that catalog material is equivalent to an approved medicine. Clearly separate established facts, human clinical evidence, preclinical evidence, mechanistic hypotheses, uncertainty, and formulation-specific limitations. When a blend/stack is searched, distinguish evidence for the individual components from evidence for the exact combination. Output ONLY valid JSON with these keys: short_description (2-3 friendly sentences), plain_language_summary (3-5 sentences explaining what it is and why researchers study it), overview (6-10 substantial paragraphs separated by double newlines), molecular_identity, molecular_class, mechanism (3-6 detailed paragraphs), targets_and_pathways (array), why_researchers_study_it (array of 4-8 substantial points), research_areas (array of 6-12 short strings), key_findings (array of 4-10 evidence-aware findings, each clearly worded), human_evidence (2-5 paragraphs; explicitly say if little or none exists), preclinical_evidence (2-5 paragraphs; explicitly say if not applicable), evidence_context (2-4 paragraphs summarizing strength and quality of evidence), safety_and_tolerability (2-5 paragraphs summarizing only evidence-supported reported signals and uncertainty, not medical advice), development_status, regulatory_context (2-4 sentences, distinguish approved medicines from research material), known_limitations (array of 4-10 items), comparison_points (array of 3-8 concise comparisons with scientifically related compounds where appropriate), common_questions (array of 4-8 objects with question and answer, educational only, no dosing), cautions (2-4 sentences), source_notes (brief explanation of what the cited literature supports). Keep the tone neutral, scientific, customer-friendly, readable, and source-backed. Avoid unnecessary jargon; explain specialist terms briefly.`;
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:.12,responseMimeType:'application/json'}})
    });
    const raw=await r.json();
    if(!r.ok)throw new Error(raw?.error?.message||'Gemini request failed');
    const candidate=raw?.candidates?.[0];
    const text=candidate?.content?.parts?.map(p=>p.text||'').join('')||'{}';
    let profile;
    try{profile=JSON.parse(text)}catch{profile={short_description:'Research profile generated.',overview:text,research_areas:[],targets_and_pathways:[],why_researchers_study_it:[],key_findings:[],known_limitations:[],comparison_points:[],common_questions:[]}}
    const chunks=candidate?.groundingMetadata?.groundingChunks||[];
    const sources=[];
    for(const c of chunks){
      const w=c.web;
      if(w?.uri&&!sources.some(s=>s.url===w.uri))sources.push({title:w.title||'Research source',url:w.uri});
      if(sources.length>=20)break;
    }
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=604800');
    res.status(200).json({name,profile,sources,source_count:sources.length,generated_at:new Date().toISOString()});
  }catch(e){res.status(500).json({error:e.message||String(e)});}
}