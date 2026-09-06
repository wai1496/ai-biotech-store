import crypto from 'crypto';

const LOGIN_URL='https://api.easyparcel.com/oauth/login';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(process.env.VERCEL_ENV==='production')return res.status(403).json({ok:false,error:'EasyParcel staging OAuth is disabled in production'});
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});

  const clientId=process.env.EASYPARCEL_CLIENT_ID;
  const stateSecret=process.env.EASYPARCEL_OAUTH_STATE_SECRET;
  if(!clientId||!stateSecret)return res.status(503).json({ok:false,error:'EasyParcel OAuth server configuration is incomplete'});

  const state=crypto.randomBytes(32).toString('base64url');
  const signature=crypto.createHmac('sha256',stateSecret).update(state).digest('base64url');
  const redirectUri=process.env.EASYPARCEL_REDIRECT_URI||`${requestOrigin(req)}/api/easyparcel/callback`;
  const secure=process.env.VERCEL_ENV?'; Secure':'';
  res.setHeader('Set-Cookie',`aibt_ep_state=${state}.${signature}; HttpOnly${secure}; SameSite=Lax; Path=/api/easyparcel; Max-Age=600`);

  const u=new URL(LOGIN_URL);
  u.searchParams.set('client_id',clientId);
  u.searchParams.set('redirect_uri',redirectUri);
  u.searchParams.set('state',state);
  return res.status(200).json({ok:true,authorization_url:u.toString(),redirect_uri:redirectUri});
}

function requestOrigin(req){
  const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(!host)throw new Error('Request host is unavailable');
  return `${proto}://${host}`;
}
