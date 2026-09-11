const crypto=require('crypto');
const {runtimeSupabase,requireServiceRuntime}=require('../../lib/runtime-supabase');
const {previewSafety}=require('../../lib/preview-safety');

const TOKEN_URL='https://api.easyparcel.com/oauth/token';

module.exports=async function handler(req,res){
  try{
    previewSafety();
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});

    const {code,state,error,error_description}=req.query||{};
    if(error)return res.status(400).send(page('EasyParcel authorization was not completed',escapeHtml(error_description||error)));

    const clientId=String(process.env.EASYPARCEL_CLIENT_ID||'').trim();
    const clientSecret=String(process.env.EASYPARCEL_CLIENT_SECRET||'').trim();
    const stateSecret=String(process.env.EASYPARCEL_OAUTH_STATE_SECRET||clientSecret).trim();
    const ready=Boolean(clientId&&clientSecret&&stateSecret&&process.env.SUPABASE_SERVICE_ROLE_KEY);
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

    const redirectUri=String(process.env.EASYPARCEL_REDIRECT_URI||`${requestOrigin(req)}/api/easyparcel/callback`).trim();
    const body=new URLSearchParams({grant_type:'authorization_code',redirect_uri:redirectUri,code:String(code),state:String(state)});
    const basic=Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse=await fetch(TOKEN_URL,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body});
    const token=await tokenResponse.json().catch(()=>null);
    if(!tokenResponse.ok||!token?.access_token){
      clearStateCookie(res);
      console.error('EasyParcel OAuth token exchange failed',{status:tokenResponse.status,hasPayload:Boolean(token)});
      return res.status(502).send(page('EasyParcel connection was not completed','EasyParcel did not return a usable access token. No token was stored.'));
    }

    const sb=runtimeSupabase();
    const service=requireServiceRuntime().serviceKey;
    const store=await fetch(`${sb.url}/rest/v1/rpc/easyparcel_store_oauth_tokens`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:JSON.stringify({p_access_token:token.access_token,p_refresh_token:token.refresh_token||null,p_expires_at:token.expires_at||isoFromSeconds(token.expires_in),p_refresh_expires_at:token.refresh_token_expires_at||isoFromSeconds(token.refresh_token_expires_in)})});
    if(!store.ok){
      clearStateCookie(res);
      console.error('EasyParcel OAuth token persistence failed',{status:store.status});
      return res.status(502).send(page('EasyParcel connection needs attention','Authorization succeeded, but encrypted staging token storage failed. The token was not exposed to the browser.'));
    }

    clearStateCookie(res);
    return res.status(200).send(page('EasyParcel connected to AI BioTech staging','Authorization succeeded. The OAuth token is stored server-side in Supabase Vault. You can close this page and return to Admin.'));
  }catch(e){
    console.error('EasyParcel callback failed',e?.message||e);
    return res.status(e?.status||500).send(page('EasyParcel connection needs attention',escapeHtml(e?.message||'Unexpected callback failure.')));
  }
};

function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function parseCookie(header){return Object.fromEntries(String(header).split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
function clearStateCookie(res){res.setHeader('Set-Cookie','aibt_ep_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/easyparcel; Max-Age=0')}
function isoFromSeconds(seconds){const n=Number(seconds||0);return n>0?new Date(Date.now()+n*1000).toISOString():null}
function requestOrigin(req){const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim(),host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();if(!host)throw new Error('Request host is unavailable');return `${proto}://${host}`}
function page(title,message){return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><body style="font-family:system-ui;padding:32px;max-width:680px;margin:auto"><h1>${escapeHtml(title)}</h1><p>${message}</p></body>`}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
