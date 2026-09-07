const SUPABASE_URL=process.env.SUPABASE_URL||'https://yjauxyvtrmdriwtmckkl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';

const STATE_CODES={
  'Johor':'jhr','Kedah':'kdh','Kelantan':'ktn','Melaka':'mlk','Negeri Sembilan':'nsn','Pahang':'phg','Penang':'png','Perak':'prk','Perlis':'pls','Sabah':'sbh','Sarawak':'srw','Selangor':'sgr','Terengganu':'trg','Kuala Lumpur':'kul','Labuan':'lbn','Putrajaya':'pjy'
};

function config(){
  const mode=String(process.env.EASYPARCEL_MODE||'demo').trim().toLowerCase();
  const apiKey=String(process.env.EASYPARCEL_API_KEY||'').trim();
  const pickPostcode=String(process.env.EASYPARCEL_PICK_POSTCODE||'').trim();
  const pickStateRaw=String(process.env.EASYPARCEL_PICK_STATE||'').trim();
  const pickState=STATE_CODES[pickStateRaw]||pickStateRaw.toLowerCase();
  const weight=Math.max(0.1,Number(process.env.EASYPARCEL_DEFAULT_WEIGHT_KG||0.5));
  const base=mode==='live'?'https://connect.easyparcel.my/':'https://demo.connect.easyparcel.my/';
  return {mode,apiKey,pickPostcode,pickState,weight,base};
}

async function requireUser(req){
  const auth=String(req.headers?.authorization||'');
  if(!/^Bearer\s+.+/i.test(auth)){const e=new Error('Sign in required.');e.status=401;throw e;}
  const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:auth}});
  const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}
  if(!r.ok){const e=new Error(body?.message||'Could not verify member session.');e.status=r.status;throw e;}
  return body;
}

function requireConfig(){
  const cfg=config();
  if(!cfg.apiKey||!cfg.pickPostcode||!cfg.pickState){const e=new Error('EasyParcel is not configured yet.');e.code='EASYPARCEL_NOT_CONFIGURED';e.status=503;throw e;}
  return cfg;
}

function stateCode(name){return STATE_CODES[String(name||'').trim()]||String(name||'').trim().toLowerCase()}

async function quoteRates({postcode,state,parcelValue=0,weight}){
  const cfg=requireConfig();
  const sendState=stateCode(state);
  if(!/^\d{5}$/.test(String(postcode||''))||!sendState){const e=new Error('A valid Malaysia postcode and state are required.');e.status=400;throw e;}
  const params=new URLSearchParams();
  params.set('api',cfg.apiKey);
  params.set('bulk[0][pick_code]',cfg.pickPostcode);
  params.set('bulk[0][pick_state]',cfg.pickState);
  params.set('bulk[0][pick_country]','MY');
  params.set('bulk[0][send_code]',String(postcode));
  params.set('bulk[0][send_state]',sendState);
  params.set('bulk[0][send_country]','MY');
  params.set('bulk[0][weight]',String(Math.max(0.1,Number(weight||cfg.weight))));
  params.set('bulk[0][width]','0');params.set('bulk[0][length]','0');params.set('bulk[0][height]','0');
  if(Number(parcelValue)>0)params.set('bulk[0][parcel_value]',Number(parcelValue).toFixed(2));
  params.append('exclude_fields[]','rates.*.dropoff_point');
  params.append('exclude_fields[]','rates.*.pickup_point');
  const r=await fetch(`${cfg.base}?ac=EPRateCheckingBulk`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});
  const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}
  if(!r.ok){const e=new Error(`EasyParcel request failed (${r.status}).`);e.status=502;e.body=body;throw e;}
  if(body?.api_status!=='Success'){const e=new Error(body?.error_remark||'EasyParcel rate check failed.');e.status=502;e.body=body;throw e;}
  const first=Array.isArray(body?.result)?body.result[0]:null;
  if(!first||first.status!=='Success'){const e=new Error(first?.remarks||'No EasyParcel rates available.');e.status=502;e.body=body;throw e;}
  const rates=(Array.isArray(first.rates)?first.rates:[]).map(x=>({
    rateId:String(x.rate_id||''),serviceId:String(x.service_id||''),serviceName:String(x.service_name||''),courierName:String(x.courier_name||''),courierLogo:String(x.courier_logo||''),delivery:String(x.delivery||''),serviceDetail:String(x.service_detail||''),price:Number(x.price||x.shipment_price||0),shipmentPrice:Number(x.shipment_price||x.price||0),codAvailable:Boolean(x.cod_service_available)
  })).filter(x=>x.serviceId&&Number.isFinite(x.price)&&x.price>=0).sort((a,b)=>a.price-b.price);
  return {mode:cfg.mode,rates};
}

module.exports={requireUser,requireConfig,quoteRates,stateCode};
