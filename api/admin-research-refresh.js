const {verifyResearchAdmin,ResearchAuthError,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}=require('./_research-auth');
const {generateResearchDraft,ResearchProviderError}=require('./_research-providers');

async function restGet(path,token){
  const response=await fetch(`${SUPABASE_URL}${path}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`}});
  let body=null;try{body=await response.json()}catch{}
  if(!response.ok){const error=new Error('Supabase read failed');error.status=response.status;throw error;}
  return body;
}

module.exports=async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({code:'METHOD_NOT_ALLOWED',message:'POST required'});return;}
  try{
    const admin=await verifyResearchAdmin(req);
    const productId=String(req.body?.product_id||'').trim();
    if(!/^[a-zA-Z0-9_-]{1,120}$/.test(productId)){res.status(400).json({code:'INVALID_PRODUCT',message:'Valid product required'});return;}

    const productPath=`/rest/v1/products?select=id,name,published,status,archived_at&id=eq.${encodeURIComponent(productId)}&published=eq.true&archived_at=is.null&limit=1`;
    const products=await restGet(productPath,admin.token);const product=Array.isArray(products)?products[0]:null;
    if(!product){res.status(404).json({code:'PRODUCT_NOT_FOUND',message:'Published product not found'});return;}

    const researchPath=`/rest/v1/research_entries?select=id,product_id,profile_json,references_json,published_version_id,published_at&product_id=eq.${encodeURIComponent(productId)}&limit=1`;
    const entries=await restGet(researchPath,admin.token);const currentPublished=Array.isArray(entries)?entries[0]||null:null;
    const draft=await generateResearchDraft({product,currentPublished});
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({product_id:product.id,research_entry_id:currentPublished?.id||null,...draft});
  }catch(error){
    if(error instanceof ResearchAuthError){res.status(error.status).json({code:error.code,message:error.message});return;}
    if(error instanceof ResearchProviderError){console.error('Admin research provider unavailable',{provider:error.provider,code:error.code,status:error.status});res.status(503).json({code:'AI_RESEARCH_UNAVAILABLE',message:'AI research is temporarily unavailable. Existing published research is unchanged.'});return;}
    console.error('Admin research refresh failed',{name:error?.name,status:error?.status||500});
    res.status(500).json({code:'RESEARCH_REFRESH_FAILED',message:'Research refresh could not be completed. Existing published research is unchanged.'});
  }
};
