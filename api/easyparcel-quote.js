const {requireUser,quoteRates}=require('../lib/easyparcel');
const {previewSafety}=require('../lib/preview-safety');

const SUPABASE_URL=process.env.SUPABASE_URL||'https://yjauxyvtrmdriwtmckkl.supabase.co';
const SERVICE_KEY=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();

async function parseResponse(r){
  const text=await r.text();
  let body;try{body=JSON.parse(text)}catch{body=text}
  if(!r.ok){const e=new Error(body?.message||`Upstream request failed (${r.status}).`);e.status=r.status>=400&&r.status<500?r.status:502;e.body=body;throw e;}
  return body;
}

async function insertQuote(row){
  if(!SERVICE_KEY){const e=new Error('Server database key is not configured.');e.status=503;throw e;}
  const r=await fetch(`${SUPABASE_URL}/rest/v1/shipping_quotes`,{
    method:'POST',
    headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},
    body:JSON.stringify(row)
  });
  const body=await parseResponse(r);
  return Array.isArray(body)?body[0]:body;
}

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    const user=await requireUser(req);
    const postcode=String(req.body?.postcode||'').trim();
    const state=String(req.body?.state||'').trim();
    const subtotal=Number(req.body?.subtotal||0);
    const serviceId=String(req.body?.serviceId||'').trim();
    if(!/^\d{5}$/.test(postcode)||!state)return res.status(400).json({error:'A valid Malaysia postcode and state are required.'});
    if(!Number.isFinite(subtotal)||subtotal<0)return res.status(400).json({error:'Valid cart subtotal is required.'});
    if(!serviceId)return res.status(400).json({error:'EasyParcel serviceId is required.'});

    const {mode,rates}=await quoteRates({postcode,state,parcelValue:subtotal});
    const rate=rates.find(x=>x.serviceId===serviceId);
    if(!rate)return res.status(409).json({error:'The selected EasyParcel service is no longer available. Please refresh shipping rates.'});

    const quote=await insertQuote({
      user_id:user.id,
      subtotal:Number(subtotal.toFixed(2)),
      shipping_amount:Number(Number(rate.price||0).toFixed(2)),
      postcode,
      state,
      service_id:rate.serviceId,
      rate_id:rate.rateId||null,
      courier_name:rate.courierName||null,
      service_name:rate.serviceName||null,
      delivery:rate.delivery||null
    });

    return res.status(200).json({
      mode,
      quoteId:quote?.id,
      expiresAt:quote?.expires_at,
      rate
    });
  }catch(e){
    console.error('EasyParcel quote creation failed',e?.code||e?.message||e);
    return res.status(e?.status||502).json({error:e?.message||'Could not create EasyParcel shipping quote.',code:e?.code||'EASYPARCEL_QUOTE_FAILED'});
  }
};
