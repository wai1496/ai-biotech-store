function bearer(req){
  const header=String(req.headers.authorization||'');
  return /^Bearer\s+(.+)$/i.test(header)?header.replace(/^Bearer\s+/i,'').trim():'';
}
function decodeJwtPayload(token){
  try{
    const part=String(token||'').split('.')[1];
    if(!part)return null;
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    return JSON.parse(Buffer.from(padded,'base64').toString('utf8'));
  }catch{return null;}
}
function requireAal2(req){
  const payload=decodeJwtPayload(bearer(req));
  if(!payload)return {ok:false,status:401,error:'Invalid admin session'};
  if(payload.aal!=='aal2')return {ok:false,status:403,error:'Two-factor authentication required',code:'MFA_AAL2_REQUIRED'};
  return {ok:true,payload};
}
module.exports={requireAal2};