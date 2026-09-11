// Staging-only QA bootstrap; Preview branch secret changes require a fresh deployment.
const {previewSafety}=require('../lib/preview-safety');
const {requireServiceRuntime}=require('../lib/runtime-supabase');

const BRANCH_ALIAS='ai-biotech-store-git-integration-white-clean-core-v1-rk-cd1c.vercel.app';
function isAllowedHost(host){host=String(host||'').split(':')[0].toLowerCase();return host===BRANCH_ALIAS||(host.startsWith('ai-biotech-store-')&&host.endsWith('-rk-cd1c.vercel.app')&&host!=='ai-biotech-store.vercel.app'&&host!=='ai-biotech-store-git-main-rk-cd1c.vercel.app');}
function qaMarker(value){return /^AIBT_QA_[A-Za-z0-9_-]{8,100}$/.test(String(value||''));}
function qaEmail(value){return /^[^@+\s]+\+aibtqa-[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(String(value||''));}
function safeUpstreamCode(data){return String(data?.code||data?.error_code||data?.error||'').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,80);}
function safeUpstreamMessage(data){return String(data?.msg||data?.message||data?.error_description||'').replace(/[^A-Za-z0-9 _.,:;()/-]/g,'').replace(/\s+/g,' ').trim().slice(0,180);}
async function authFetch(path,{method='GET',body}={}){
  const runtime=requireServiceRuntime();
  const response=await fetch(`${runtime.url}${path}`,{method,headers:{apikey:runtime.serviceKey,Authorization:`Bearer ${runtime.serviceKey}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={message:'Non-JSON upstream response'}}
  if(!response.ok){const error=new Error('Supabase admin request failed.');error.status=response.status;error.upstreamCode=safeUpstreamCode(data);error.upstreamMessage=safeUpstreamMessage(data);throw error;}
  return data;
}
module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(!isAllowedHost(req.headers?.host))return res.status(403).json({error:'Protected integration Preview host required.'});
    if(req.method==='POST'){
      const email=String(req.body?.email||'').trim().toLowerCase();
      const password=String(req.body?.password||'');
      const marker=String(req.body?.marker||'').trim();
      if(!qaEmail(email)||!qaMarker(marker)||password.length<20)return res.status(400).json({error:'Invalid disposable QA identity.'});
      const user=await authFetch('/auth/v1/admin/users',{method:'POST',body:{email,password,email_confirm:true,user_metadata:{name:marker,qa:true}}});
      if(!user?.id)return res.status(502).json({error:'Disposable QA user was not created.'});
      return res.status(201).json({id:user.id});
    }
    if(req.method==='DELETE'){
      const userId=String(req.body?.userId||'').trim();
      const marker=String(req.body?.marker||'').trim();
      if(!/^[0-9a-f-]{36}$/i.test(userId)||!qaMarker(marker))return res.status(400).json({error:'Invalid disposable QA cleanup request.'});
      const user=await authFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
      if(user?.user_metadata?.name!==marker||user?.user_metadata?.qa!==true)return res.status(409).json({error:'Refusing to delete a non-QA user.'});
      await authFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'DELETE'});
      return res.status(200).json({deleted:true});
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(error){
    console.error('Preview QA user bootstrap failed',JSON.stringify({status:error?.status||500,upstreamCode:error?.upstreamCode||'',upstreamMessage:error?.upstreamMessage||''}));
    return res.status(error?.status||500).json({error:'Disposable QA user bootstrap failed.'});
  }
};
