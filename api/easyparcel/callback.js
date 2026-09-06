import crypto from 'crypto';

const TOKEN_URL='https://api.easyparcel.com/oauth/token';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(process.env.VERCEL_ENV==='production')return res.status(403).json({ok:false,error:'EasyParcel staging OAuth is disabled in production'});
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});

  const {code,state,error,error_description}=req.query||{};
  if(error)return res.status(400).send(page('EasyParcel authorization was not completed',escapeHtml(error_description||error)));

  const stateSecret=process.env.EASYPARCEL_OAUTH_STATE_SECRET||process.env.EASYPARCEL_CLIENT_SECRET;
  const ready=Boolean(process.env.EASYPARCEL_CLIENT_ID&&process.env.EASYPARCEL_CLIENT_SECRET&&stateSecret&&process.env.STAGING_SUPABASE_URL&&process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY);
  if(!code)return res.status(200).json({ok:true,service:'easyparcel-oauth-callback',environment:process.env.VERCEL_ENV||'unknown',ready_for_registration:true,token_exchange_enabled:ready});
  if(!ready)return res.status(503).send(page('EasyParcel callback received','Server-side OAuth or staging token-storage configuration is incomplete. No authorization code was exchanged.'));

  const cookie=parseCookie(req.headers.cookie||'').aibt_ep_state||'';
  const dot=cookie.lastIndexOf('.');
  const cookieState=dot>0?cookie.slice(0,dot):'';
  const cookieSig=dot>0?cookie.slice(dot+1):'';
  const expectedSig=crypto.createHmac('sha256',stateSecret).update(cookieState).digest('base64url');
  if(!state||!cookieState||!cookieSig||!safeEqual(String(state),cookieState)||!safeEqual(cookieSig,expectedSig)){
    clearStateCookie(res);
    return res.status(400).send(page('EasyParcel authorization could not be verified','The OAuth state check failed or expired. Start the EasyParcel connection again from AI BioTech Admin.'));
  }

  const redirectUri=process.env.EASYPARCEL_REDIRECT_URI||`${requestOrigin(req)}/api/easyparcel/callback`;
  const body=new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('redirect_uri',redirectUri);
  body.set('code',String(code));
  body.set('state',String(state));
  const basic=Buffer.from(`${process.env.EASYPARCEL_CLIENT_ID}:${process.env.EASYPARCEL_CLIENT_SECRET}`).toString('base64');
  const tokenResponse=await fetch(TOKEN_URL,{method:'POST',headers:{Authorization: `Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body});
  let token;
  try{token=await tokenResponse.json()}catch{token=null}
  if(!tokenResponse.ok||!token?.access_token){
    clearStateCookie(res);
    console.error('EasyParcel OAuth token exchange failed',{status:tokenResponse.status,hasPayload:Boolean(token)});
    return res.status(502).send(page('EasyParcel connection was not completed','EasyParcel did not return a usable access token. No token was stored.'));
  }

  const expiresAt=token.expires_at||isoFromSeconds(token.expires_in);
  const refreshExpiresAt=token.refresh_token_expires_at||isoFromSeconds(token.refresh_token_expires_in);
  const store=await fetch(`${process.env.STAGING_SUPABASE_URL}/rest/v1/rpc/easyparcel_store_oauth_tokens`,{
    method:'POST',
    headers:{apikey:process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,authorization:`Bearer ${process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({p_access_token:token.access_token,p_refresh_token:token.refresh_token||null,p_expires_at:expiresAt,p_refresh_expires_at:refreshExpiresAt})
  });
  if(!store.ok){
    clearStateCookie(res);
    console.error('EasyParcel OAuth token persistence failed',{status:store.status});
    return res.status(502).send(page('EasyParcel connection needs attention','Authorization succeeded, but encrypted staging token storage failed. The token was not exposed to the browser.'));
  }

  clearStateCookie(res);
  return res.status(200).send(page('EasyParcel connected to AI BioTech staging','Authorization succeeded. The OAuth token is stored server-side in Supabase Vault. You can close this page and return to Admin.'));
}

function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
function parseCookie(header){return Object.fromEntries(String(header).split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
function clearStateCookie(res){res.setHeader('Set-Cookie','aibt_ep_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/easyparcel; Max-Age=0');}
function isoFromSeconds(seconds){const n=Number(seconds||0);return n>0?new Date(Date.now()+n*1000).toISOString():null;}
function requestOrigin(req){const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim(),host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();if(!host)throw new Error('Request host is unavailable');return `${proto}://${host}`;}
function page(title,message){return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><body style="font-family:system-ui;padding:32px;max-width:680px;margin:auto"><h1>${escapeHtml(title)}</h1><p>${message}</p></body>`;}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
