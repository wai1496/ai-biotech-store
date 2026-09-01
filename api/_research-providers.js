const HIGH_DOMAINS=new Set([
  'pubmed.ncbi.nlm.nih.gov','ncbi.nlm.nih.gov','clinicaltrials.gov',
  'fda.gov','www.fda.gov','ema.europa.eu','www.ema.europa.eu','who.int','www.who.int'
]);

const PUBLIC_PROFILE_KEYS=['short_description','overview','molecular_identity','mechanism','research_areas','evidence_context','cautions','source_notes'];

const profileSchema={
  type:'object',additionalProperties:false,
  required:['short_description','overview','molecular_identity','mechanism','research_areas','evidence_context','cautions','source_notes','evidence_assessment'],
  properties:{
    short_description:{type:'string'},overview:{type:'string'},molecular_identity:{type:'string'},mechanism:{type:'string'},
    research_areas:{type:'array',items:{type:'string'},maxItems:10},evidence_context:{type:'string'},cautions:{type:'string'},source_notes:{type:'string'},
    evidence_assessment:{type:'object',additionalProperties:false,
      required:['exact_product_evidence','human_evidence','preclinical_evidence','contradictions_found','warnings'],
      properties:{
        exact_product_evidence:{type:'string',enum:['direct','component_only','limited','none']},
        human_evidence:{type:'string',enum:['direct','indirect','none']},
        preclinical_evidence:{type:'string',enum:['present','not_identified']},
        contradictions_found:{type:'boolean'},warnings:{type:'array',items:{type:'string'},maxItems:10}
      }
    }
  }
};

const RESEARCH_SYSTEM_PROMPT=`You are the evidence-research assistant for AI BioTech's administrator. Research only the named compound or blend. Prefer high-authority primary/official sources first: pubmed.ncbi.nlm.nih.gov, ncbi.nlm.nih.gov, clinicaltrials.gov, fda.gov, ema.europa.eu, and who.int. Follow primary studies and trial registry records when useful, resolve contradictions where possible, and clearly report uncertainty. For blends, never present component-level evidence as proof of the exact combination; classify exact-product evidence accurately. Distinguish direct human evidence, indirect human evidence, preclinical evidence, mechanistic evidence, and absence of evidence. Do not provide dosing, dosage schedules, administration instructions, injection technique, reconstitution instructions, treatment recommendations, diagnosis, individualized medical advice, or unsupported equivalence between research material and an approved medicine. Keep claims neutral and source-backed. Do not place URLs or markdown citations inside profile fields; references are captured separately. Return only the requested structured object.`;

class ResearchProviderError extends Error{
  constructor(provider,code,message,status){super(message);this.name='ResearchProviderError';this.provider=provider;this.code=code;this.status=status||503;}
}

function safeJsonParse(text){try{return JSON.parse(text)}catch{return null}}
function hostnameOf(url){try{return new URL(url).hostname.toLowerCase()}catch{return ''}}
function isHighDomain(host){if(HIGH_DOMAINS.has(host))return true;return [...HIGH_DOMAINS].some(d=>host.endsWith(`.${d}`));}
function stripResearchCitations(value){
  return String(value??'')
    .replace(/\s*\(\s*\[[^\]]*\]\(https?:\/\/[^)]+\)\s*\)/gi,'')
    .replace(/\s*\[[^\]]*\]\(https?:\/\/[^)]+\)/gi,'')
    .replace(/\s{2,}/g,' ')
    .replace(/\s+([.,;:!?])/g,'$1')
    .trim();
}
function normalizeSources(rawSources){
  const now=new Date().toISOString(),out=[],seen=new Set();
  for(const source of rawSources||[]){
    const url=String(source?.url||source?.uri||'').trim();
    if(!/^https?:\/\//i.test(url)||seen.has(url))continue;
    seen.add(url);const domain=hostnameOf(url);if(!domain)continue;
    out.push({title:String(source?.title||domain).slice(0,500),url,domain,tier:isHighDomain(domain)?'high':'standard',supports:Array.isArray(source?.supports)?source.supports.slice(0,8):[],retrieved_at:now});
    if(out.length>=16)break;
  }
  return out;
}
function defaultAssessment(){return {exact_product_evidence:'none',human_evidence:'none',preclinical_evidence:'not_identified',contradictions_found:false,warnings:[]};}
function cleanAssessment(value){
  const base=defaultAssessment(),v=value&&typeof value==='object'?value:{};
  const exact=['direct','component_only','limited','none'].includes(v.exact_product_evidence)?v.exact_product_evidence:base.exact_product_evidence;
  const human=['direct','indirect','none'].includes(v.human_evidence)?v.human_evidence:base.human_evidence;
  const pre=['present','not_identified'].includes(v.preclinical_evidence)?v.preclinical_evidence:base.preclinical_evidence;
  return {exact_product_evidence:exact,human_evidence:human,preclinical_evidence:pre,contradictions_found:v.contradictions_found===true,warnings:Array.isArray(v.warnings)?v.warnings.map(String).slice(0,10):[]};
}
function cleanProfile(raw){
  const v=raw&&typeof raw==='object'?raw:{};const profile={};
  for(const key of PUBLIC_PROFILE_KEYS){
    if(key==='research_areas')profile[key]=Array.isArray(v[key])?v[key].map(stripResearchCitations).filter(Boolean).slice(0,10):[];
    else profile[key]=stripResearchCitations(v[key]);
  }
  if(!profile.short_description||!profile.overview)throw new ResearchProviderError('validation','INVALID_PROFILE','Research provider returned incomplete profile',502);
  return {profile,assessment:cleanAssessment(v.evidence_assessment)};
}
function buildEvidenceGate(sources,assessment){
  const high=sources.filter(s=>s.tier==='high');
  const unique=new Set(sources.map(s=>s.domain).filter(Boolean));
  const warnings=[...(assessment.warnings||[])];
  if(high.length<2)warnings.push('Fewer than two high-quality sources were identified.');
  if(unique.size<2)warnings.push('Research sources did not span at least two independent domains.');
  if(assessment.exact_product_evidence!=='direct')warnings.push(`Exact-product evidence: ${assessment.exact_product_evidence}.`);
  const passed=high.length>=2&&unique.size>=2&&assessment.contradictions_found===false;
  return {passed,high_quality_source_count:high.length,unique_domain_count:unique.size,exact_product_evidence:assessment.exact_product_evidence,human_evidence:assessment.human_evidence,preclinical_evidence:assessment.preclinical_evidence,contradictions_found:assessment.contradictions_found,warnings:[...new Set(warnings)].slice(0,20)};
}
function buildChangeSummary(currentPublished,nextProfile,nextSources=[]){
  const current=currentPublished?.profile_json&&typeof currentPublished.profile_json==='object'?currentPublished.profile_json:{};
  const changed_fields=PUBLIC_PROFILE_KEYS.filter(k=>JSON.stringify(current[k]??(k==='research_areas'?[]:''))!==JSON.stringify(nextProfile[k]??(k==='research_areas'?[]:'')));
  const previousSourceCount=Array.isArray(currentPublished?.references_json)?currentPublished.references_json.length:0;
  return {changed_fields,previous_source_count:previousSourceCount,next_source_count:nextSources.length,source_count_delta:nextSources.length-previousSourceCount};
}
function openAIText(raw){
  for(const item of raw?.output||[]){if(item?.type==='message')for(const part of item.content||[])if(part?.type==='output_text'&&part.text)return part.text;}
  return typeof raw?.output_text==='string'?raw.output_text:'';
}
function openAISources(raw){
  const out=[];
  for(const item of raw?.output||[]){
    if(item?.type==='web_search_call')for(const s of item.action?.sources||[])out.push({title:s.title,url:s.url||s.uri});
    if(item?.type==='message')for(const part of item.content||[])for(const a of part.annotations||[])if(a?.type==='url_citation')out.push({title:a.title,url:a.url});
  }
  return out;
}
async function generateWithOpenAI(product){
  const key=process.env.OPENAI_API_KEY;if(!key)throw new ResearchProviderError('openai','NOT_CONFIGURED','OpenAI not configured',503);
  const model=process.env.OPENAI_RESEARCH_MODEL||'gpt-5.6-luna';
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({model,store:false,reasoning:{effort:'low'},max_output_tokens:3200,tools:[{type:'web_search_preview',search_context_size:'medium'}],include:['web_search_call.action.sources'],text:{format:{type:'json_schema',name:'aibt_research_profile',strict:true,schema:profileSchema}},input:[{role:'system',content:[{type:'input_text',text:RESEARCH_SYSTEM_PROMPT}]},{role:'user',content:[{type:'input_text',text:`Research product: ${product.name}`}]}]})
  });
  let raw={};try{raw=await response.json()}catch{}
  if(!response.ok){
    const code=response.status===429?'QUOTA_OR_RATE_LIMIT':response.status>=500?'UPSTREAM_UNAVAILABLE':'UPSTREAM_ERROR';
    throw new ResearchProviderError('openai',code,'OpenAI research request unavailable',response.status);
  }
  const parsed=safeJsonParse(openAIText(raw));if(!parsed)throw new ResearchProviderError('openai','INVALID_OUTPUT','OpenAI research output was not valid JSON',502);
  const {profile,assessment}=cleanProfile(parsed);
  return {profile,assessment,rawSources:openAISources(raw),provider:'openai',model,provider_metadata:{response_id:raw.id||null,usage:raw.usage||null}};
}
function geminiPrompt(product){return `${RESEARCH_SYSTEM_PROMPT}\n\nResearch product: ${product.name}\nReturn JSON keys: short_description, overview, molecular_identity, mechanism, research_areas, evidence_context, cautions, source_notes, evidence_assessment. evidence_assessment must contain exact_product_evidence, human_evidence, preclinical_evidence, contradictions_found, warnings.`;}
async function generateWithGemini(product){
  const key=process.env.GEMINI_API_KEY;if(!key)throw new ResearchProviderError('gemini','NOT_CONFIGURED','Gemini not configured',503);
  const model='gemini-3.7-flash';
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({contents:[{parts:[{text:geminiPrompt(product)}]}],tools:[{google_search:{}}],generationConfig:{temperature:.2,responseMimeType:'application/json'}})
  });
  let raw={};try{raw=await response.json()}catch{}
  if(!response.ok){const code=response.status===429?'QUOTA_OR_RATE_LIMIT':response.status>=500?'UPSTREAM_UNAVAILABLE':'UPSTREAM_ERROR';throw new ResearchProviderError('gemini',code,'Gemini research request unavailable',response.status);}
  const candidate=raw?.candidates?.[0];const text=(candidate?.content?.parts||[]).map(p=>p.text||'').join('');const parsed=safeJsonParse(text);
  if(!parsed)throw new ResearchProviderError('gemini','INVALID_OUTPUT','Gemini research output was not valid JSON',502);
  const {profile,assessment}=cleanProfile(parsed);const rawSources=[];
  for(const chunk of candidate?.groundingMetadata?.groundingChunks||[]){const w=chunk?.web;if(w?.uri)rawSources.push({title:w.title,url:w.uri});}
  return {profile,assessment,rawSources,provider:'gemini',model,provider_metadata:{usage:raw?.usageMetadata||null}};
}
function logProviderFailure(error){
  if(!(error instanceof ResearchProviderError))return;
  console.error('Research provider attempt failed',{provider:error.provider,code:error.code,status:error.status});
}
async function generateResearchDraft({product,currentPublished}){
  let generated,lastError;
  try{generated=await generateWithOpenAI(product);}catch(error){lastError=error;if(!(error instanceof ResearchProviderError))throw error;logProviderFailure(error);}
  if(!generated){try{generated=await generateWithGemini(product);}catch(error){lastError=error;if(!(error instanceof ResearchProviderError))throw error;logProviderFailure(error);}}
  if(!generated)throw new ResearchProviderError('all','AI_RESEARCH_UNAVAILABLE',lastError?.message||'AI research unavailable',503);
  const sources=normalizeSources(generated.rawSources),evidence_gate=buildEvidenceGate(sources,generated.assessment),change_summary=buildChangeSummary(currentPublished,generated.profile,sources);
  return {profile:generated.profile,sources,evidence_gate,change_summary,provider:generated.provider,model:generated.model,generated_at:new Date().toISOString(),provider_metadata:generated.provider_metadata};
}
module.exports={generateResearchDraft,normalizeSources,buildEvidenceGate,buildChangeSummary,stripResearchCitations,ResearchProviderError,profileSchema,HIGH_DOMAINS};
