const crypto=require('crypto');
const {runtimeSupabase,requireServiceRuntime}=require('../../lib/runtime-supabase');
const {previewSafety}=require('../../lib/preview-safety');

const LOGIN_URL='https://api.easyparcel.com/oauth/login';

module.exports=async function handler(req,res){
  try{
    previewSafety();
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});

    const clientId=String(process.env.EASYPARCEL_CLIENT_ID||'').trim();
    const clientSecret=String(process.env.EASYPARCEL_CLIENT_SECRET||'').trim();
    const stateSecret=String(process.env.EASYPARCEL_OAUTH_STATE_SECRET||clientSecret).trim();
    if(!clientId||!stateSecret)return res.status(503).json({ok:false,error:'EasyParcel OAuth server configuration is incomplete'});

    const auth=String(req.headers?.authorization||'');
    const m=/^Bearer\s+(.+)$/i.exec(auth);
    if(!m)return res.status(401).json({ok:false,error:'Authenticated staging admin required'});
    const sb=runtimeSupabase();
    const userRes=await fetch(`${sb.url}/auth/v1/user`,{headers:{apikey:sb.publishableKey,Authorization:`Bearer ${m[1]}`}});
    const user=await userRes.json().catch(()=>null);
    if(!userRes.ok||!user?.id)return res.status(401).json({ok:false,error:'Invalid staging admin session'});
    const service=requireServiceRuntime().serviceKey;
    const adminRes=await fetch(`${sb.url}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=role&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
    const admins=await adminRes.json().catch(()=>null);
    if(!adminRes.ok||!admins?.[0])return res.status(403).json({ok:false,error:'Staging admin permission required'});

    const state=crypto.randomBytes(32).toString('base64url');
    const signature=crypto.createHmac('sha256',stateSecret).update(state).digest('base64url');
    const redirectUri=String(process.env.EASYPARCEL_REDIRECT_URI||`${requestOrigin(req)}/api/easyparcel/callback`).trim();
    res.setHeader('Set-Cookie',`aibt_ep_state=${state}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/api/easyparcel; Max-Age=600`);
    const url=new URL(LOGIN_URL);
    url.searchParams.set('client_id',clientId);
    url.searchParams.set('redirect_uri',redirectUri);
    url.searchParams.set('state',state);
    return res.status(200).json({ok:true,authorization_url:url.toString(),redirect_uri:redirectUri});
  }catch(e){
    console.error('EasyParcel connect failed',e?.message||e);
    return res.status(e?.status||500).json({ok:false,error:e?.message||'EasyParcel connection could not be started'});
  }
};

function requestOrigin(req){
  const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(!host)throw new Error('Request host is unavailable');
  return `${proto}://${host}`;
}
