import crypto from 'crypto';

const LOGIN_URL='https://api.easyparcel.com/oauth/login';

export default async function handler(req,res){
  try{
    res.setHeader('Cache-Control','no-store');
    if(process.env.VERCEL_ENV==='production')return res.status(403).json({ok:false,error:'EasyParcel staging OAuth is disabled in production'});
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});

    const sbUrl=process.env.STAGING_SUPABASE_URL;
    const pub=process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
    const service=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    if(!sbUrl||!pub||!service)return res.status(503).json({ok:false,error:'Staging Supabase server environment is not configured'});
    const h=String(req.headers.authorization||''),m=/^Bearer\s+(.+)$/i.exec(h);
    if(!m)return res.status(401).json({ok:false,error:'Authenticated staging admin required'});
    const ur=await fetch(`${sbUrl}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${m[1]}`}}),u=await ur.json();
    if(!ur.ok||!u?.id)return res.status(401).json({ok:false,error:'Invalid staging admin session'});
    const ar=await fetch(`${sbUrl}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(u.id)}&active=eq.true&select=role`,{headers:{apikey:service,authorization:`Bearer ${service}`}}),admins=await ar.json();
    if(!ar.ok||!admins?.[0])return res.status(403).json({ok:false,error:'Staging admin permission required'});

    const clientId=process.env.EASYPARCEL_CLIENT_ID;
    const stateSecret=process.env.EASYPARCEL_OAUTH_STATE_SECRET||process.env.EASYPARCEL_CLIENT_SECRET;
    if(!clientId||!stateSecret)return res.status(503).json({ok:false,error:'EasyParcel OAuth server configuration is incomplete'});

    const state=crypto.randomBytes(32).toString('base64url');
    const signature=crypto.createHmac('sha256',stateSecret).update(state).digest('base64url');
    const redirectUri=process.env.EASYPARCEL_REDIRECT_URI||`${requestOrigin(req)}/api/easyparcel/callback`;
    const secure=process.env.VERCEL_ENV?'; Secure':'';
    res.setHeader('Set-Cookie',`aibt_ep_state=${state}.${signature}; HttpOnly${secure}; SameSite=Lax; Path=/api/easyparcel; Max-Age=600`);

    const url=new URL(LOGIN_URL);
    url.searchParams.set('client_id',clientId);
    url.searchParams.set('redirect_uri',redirectUri);
    url.searchParams.set('state',state);
    return res.status(200).json({ok:true,authorization_url:url.toString(),redirect_uri:redirectUri});
  }catch(e){console.error('EasyParcel connect failed',e);return res.status(500).json({ok:false,error:'EasyParcel connection could not be started'});}
}

function requestOrigin(req){
  const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(!host)throw new Error('Request host is unavailable');
  return `${proto}://${host}`;
}
