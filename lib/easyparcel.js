const {runtimeSupabase,requireServiceRuntime}=require('./runtime-supabase');

const STATE_CODES={'Johor':'jhr','Kedah':'kdh','Kelantan':'ktn','Melaka':'mlk','Negeri Sembilan':'nsn','Pahang':'phg','Penang':'png','Perak':'prk','Perlis':'pls','Sabah':'sbh','Sarawak':'srw','Selangor':'sgr','Terengganu':'trg','Kuala Lumpur':'kul','Labuan':'lbn','Putrajaya':'pjy'};

function config(){
  const mode=String(process.env.EASYPARCEL_MODE||'demo').trim().toLowerCase();
  const apiKey=String(process.env.EASYPARCEL_API_KEY||'').trim();
  const pickStateRaw=String(process.env.EASYPARCEL_PICK_STATE||'').trim();
  return {
    mode,apiKey,base:mode==='live'?'https://connect.easyparcel.my/':'https://demo.connect.easyparcel.my/',
    weight:Math.max(0.1,Number(process.env.EASYPARCEL_DEFAULT_WEIGHT_KG||0.5)),
    pickName:String(process.env.EASYPARCEL_PICK_NAME||'AI BioTech').trim(),
    pickCompany:String(process.env.EASYPARCEL_PICK_COMPANY||'AI BioTech').trim(),
    pickContact:String(process.env.EASYPARCEL_PICK_CONTACT||'').trim(),
    pickMobile:String(process.env.EASYPARCEL_PICK_MOBILE||'').trim(),
    pickAddr1:String(process.env.EASYPARCEL_PICK_ADDR1||'').trim(),
    pickAddr2:String(process.env.EASYPARCEL_PICK_ADDR2||'').trim(),
    pickCity:String(process.env.EASYPARCEL_PICK_CITY||'').trim(),
    pickPostcode:String(process.env.EASYPARCEL_PICK_POSTCODE||'').trim(),
    pickState:STATE_CODES[pickStateRaw]||pickStateRaw.toLowerCase()
  };
}
function stateCode(name){return STATE_CODES[String(name||'').trim()]||String(name||'').trim().toLowerCase()}
async function jsonFetch(url,options={}){const r=await fetch(url,options);const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}if(!r.ok){const e=new Error(`Request failed (${r.status}).`);e.status=502;e.body=body;throw e}return body}
async function requireUser(req){require('./preview-safety').previewSafety();const auth=String(req.headers?.authorization||'');if(!/^Bearer\s+.+/i.test(auth)){const e=new Error('Sign in required.');e.status=401;throw e}const r=await fetch(`${runtimeSupabase().url}/auth/v1/user`,{headers:{apikey:runtimeSupabase().publishableKey,Authorization:auth}});const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}if(!r.ok){const e=new Error(body?.message||'Could not verify member session.');e.status=r.status;throw e}return body}
function requireConfig(full=false){require('./preview-safety').previewSafety();const cfg=config();if(!cfg.apiKey||!cfg.pickPostcode||!cfg.pickState){const e=new Error('EasyParcel is not configured yet.');e.code='EASYPARCEL_NOT_CONFIGURED';e.status=503;throw e}if(full&&(!cfg.pickContact||!cfg.pickAddr1||!cfg.pickCity)){const e=new Error('EasyParcel pickup profile is incomplete.');e.code='EASYPARCEL_PICKUP_INCOMPLETE';e.status=503;throw e}return cfg}
async function serviceRest(path,{method='GET',body,prefer}={}){require('./preview-safety').previewSafety();requireServiceRuntime();const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();if(!key){const e=new Error('Server database key is not configured.');e.status=503;throw e}const headers={apikey:key,Authorization:`Bearer ${key}`};if(body!==undefined)headers['Content-Type']='application/json';if(prefer)headers.Prefer=prefer;return jsonFetch(`${runtimeSupabase().url}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
async function requireAdmin(req){const user=await requireUser(req);const rows=await serviceRest(`admin_users?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=user_id,role,active`);if(!Array.isArray(rows)||!rows.length){const e=new Error('Administrator access required.');e.status=403;throw e}return {user,admin:rows[0]}}
async function easyPost(action,params){const cfg=requireConfig();const body=params instanceof URLSearchParams?params:new URLSearchParams(params);body.set('api',cfg.apiKey);const out=await jsonFetch(`${cfg.base}?ac=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});if(out?.api_status!=='Success'){const e=new Error(out?.error_remark||`EasyParcel ${action} failed.`);e.status=502;e.body=out;throw e}return out}
async function quoteRates({postcode,state,parcelValue=0,weight}){const cfg=requireConfig();const sendState=stateCode(state);if(!/^\d{5}$/.test(String(postcode||''))||!sendState){const e=new Error('A valid Malaysia postcode and state are required.');e.status=400;throw e}const p=new URLSearchParams();p.set('bulk[0][pick_code]',cfg.pickPostcode);p.set('bulk[0][pick_state]',cfg.pickState);p.set('bulk[0][pick_country]','MY');p.set('bulk[0][send_code]',String(postcode));p.set('bulk[0][send_state]',sendState);p.set('bulk[0][send_country]','MY');p.set('bulk[0][weight]',String(Math.max(0.1,Number(weight||cfg.weight))));p.set('bulk[0][width]','0');p.set('bulk[0][length]','0');p.set('bulk[0][height]','0');if(Number(parcelValue)>0)p.set('bulk[0][parcel_value]',Number(parcelValue).toFixed(2));p.append('exclude_fields[]','rates.*.dropoff_point');p.append('exclude_fields[]','rates.*.pickup_point');const body=await easyPost('EPRateCheckingBulk',p);const first=Array.isArray(body?.result)?body.result[0]:null;if(!first||first.status!=='Success'){const e=new Error(first?.remarks||'No EasyParcel rates available.');e.status=502;throw e}const rates=(Array.isArray(first.rates)?first.rates:[]).map(x=>({rateId:String(x.rate_id||''),serviceId:String(x.service_id||''),serviceName:String(x.service_name||''),courierName:String(x.courier_name||''),courierLogo:String(x.courier_logo||''),delivery:String(x.delivery||''),serviceDetail:String(x.service_detail||''),price:Number(x.price||x.shipment_price||0),shipmentPrice:Number(x.shipment_price||x.price||0),codAvailable:Boolean(x.cod_service_available)})).filter(x=>x.serviceId&&Number.isFinite(x.price)&&x.price>=0).sort((a,b)=>a.price-b.price);return {mode:cfg.mode,rates}}
function selectedServiceFromNotes(notes){const m=String(notes||'').match(/EasyParcel\s+service=([^;\]]+);\s*rate=([^;\]]*);\s*courier=([^;\]]*);\s*price=([0-9.]+)/i);return m?{serviceId:m[1].trim(),rateId:m[2].trim(),courierName:m[3].trim(),price:Number(m[4])}:null}
async function getOrderForShipping(orderId){const rows=await serviceRest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,status,grand_total,subtotal,shipping_fee,shipping_address,customer_email,customer_phone,notes`);const order=Array.isArray(rows)?rows[0]:null;if(!order){const e=new Error('Order not found.');e.status=404;throw e}return order}
async function bookAndPayOrder(order){return require('./easyparcel-fulfillment').bookPaidOrder(order.id);}

async function trackAwb(awb){const p=new URLSearchParams();p.set('bulk[0][awb_no]',String(awb));const body=await easyPost('EPTrackingBulk',p);const first=Array.isArray(body?.result)?body.result[0]:null;return {awb:String(awb),status:String(first?.status||first?.ship_status||first?.remarks||''),raw:first||null}}
module.exports={requireUser,requireAdmin,requireConfig,quoteRates,stateCode,serviceRest,getOrderForShipping,bookAndPayOrder,trackAwb,selectedServiceFromNotes};
