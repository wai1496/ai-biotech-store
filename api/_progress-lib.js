const PROD_SUPABASE_URL = process.env.SUPABASE_URL || 'https://yjauxyvtrmdriwtmckkl.supabase.co';
const PROD_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
const REPO = process.env.AIBT_GITHUB_REPO || 'wai1496/ai-biotech-store';

function timeoutSignal(ms=5000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  return {signal:controller.signal,done:()=>clearTimeout(timer)};
}

async function fetchJson(url, options={}, timeout=5000){
  const t=timeoutSignal(timeout);
  try{
    const response=await fetch(url,{...options,signal:t.signal});
    let data=null;
    try{data=await response.json();}catch{data=null;}
    return {ok:response.ok,status:response.status,data};
  }catch(error){
    return {ok:false,status:0,data:null,error:error?.name==='AbortError'?'timeout':'network_error'};
  }finally{t.done();}
}

function bearer(req){
  const header=String(req.headers.authorization||'');
  return /^Bearer\s+(.+)$/i.test(header)?header.replace(/^Bearer\s+/i,'').trim():'';
}

async function authorizeAdmin(req){
  const token=bearer(req);
  if(!token)return {ok:false,status:401,error:'Admin sign-in required'};
  const headers={apikey:PROD_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`};
  const user=await fetchJson(`${PROD_SUPABASE_URL}/auth/v1/user`,{headers},5000);
  if(!user.ok||!user.data?.id)return {ok:false,status:401,error:'Invalid or expired admin session'};
  const admin=await fetchJson(`${PROD_SUPABASE_URL}/rest/v1/admin_users?select=role,active&user_id=eq.${encodeURIComponent(user.data.id)}&limit=1`,{headers:{...headers,Accept:'application/json'}},5000);
  const row=Array.isArray(admin.data)?admin.data[0]:null;
  if(!admin.ok||!row?.active)return {ok:false,status:403,error:'This account is not authorized for project controls'};
  return {ok:true,status:200,token,user:{id:user.data.id,email:user.data.email||null},role:row.role||'admin'};
}

function credentialMeta(){
  const yes=(...names)=>names.some(name=>Boolean(process.env[name]));
  return [
    {key:'GitHub access',configured:yes('GITHUB_TOKEN','GH_TOKEN'),required:false,purpose:'Richer GitHub API access; public repository reads can work without it.'},
    {key:'Vercel project telemetry',configured:yes('VERCEL_TOKEN')&&yes('VERCEL_PROJECT_ID','AIBT_VERCEL_PROJECT_ID'),required:false,purpose:'Detailed deployment history and project status.'},
    {key:'Supabase production',configured:Boolean(PROD_SUPABASE_URL&&PROD_SUPABASE_ANON_KEY),required:true,purpose:'Admin authorization and production health reads.'},
    {key:'Supabase staging',configured:yes('AIBT_STAGING_SUPABASE_URL')&&yes('AIBT_STAGING_SUPABASE_ANON_KEY'),required:false,purpose:'Staging database health and release comparison.'},
    {key:'OpenAI project chat',configured:yes('OPENAI_API_KEY'),required:false,purpose:'Free-form project-status chat. Deterministic status answers remain available without it.'},
    {key:'ToyyibPay',configured:yes('TOYYIBPAY_SECRET_KEY','TOYYIBPAY_CATEGORY_CODE','TOYYIBPAY_USER_SECRET_KEY'),required:false,purpose:'Wallet top-up/payment integration readiness.'},
    {key:'SPX',configured:yes('SPX_API_KEY','SPX_CLIENT_ID','SPX_SECRET'),required:false,purpose:'Automatic shipment/tracking integration readiness.'}
  ];
}

async function githubStatus(){
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
  const headers={'Accept':'application/vnd.github+json','User-Agent':'AI-BioTech-Progress'};
  if(token)headers.Authorization=`Bearer ${token}`;
  const [owner,name]=REPO.split('/');
  const base=`https://api.github.com/repos/${owner}/${name}`;
  const [branchesRes,issuesRes,repoRes]=await Promise.all([
    fetchJson(`${base}/branches?per_page=100`,{headers},6000),
    fetchJson(`${base}/issues?state=all&per_page=100&sort=updated&direction=desc`,{headers},6000),
    fetchJson(base,{headers},6000)
  ]);
  const branches=Array.isArray(branchesRes.data)?branchesRes.data.map(b=>({name:b.name,sha:b.commit?.sha||null,protected:Boolean(b.protected),classification:/^(backup|recovery)\//.test(b.name)?'checkpoint':b.name==='main'?'production':/^(staging|review)\//.test(b.name)?'integration':'work'})):[];
  const issues=Array.isArray(issuesRes.data)?issuesRes.data.filter(i=>!i.pull_request).map(i=>({id:i.number,title:i.title,state:i.state,labels:(i.labels||[]).map(l=>typeof l==='string'?l:l.name).filter(Boolean),updatedAt:i.updated_at,url:i.html_url,source:'github'})):[];
  return {available:branchesRes.ok||issuesRes.ok,authenticated:Boolean(token),defaultBranch:repoRes.data?.default_branch||'main',branches,issues,error:branchesRes.ok||issuesRes.ok?null:(branchesRes.error||issuesRes.error||`GitHub HTTP ${branchesRes.status||issuesRes.status}`)};
}

async function vercelStatus(){
  const token=process.env.VERCEL_TOKEN||'';
  const project=process.env.VERCEL_PROJECT_ID||process.env.AIBT_VERCEL_PROJECT_ID||'';
  const team=process.env.VERCEL_TEAM_ID||process.env.AIBT_VERCEL_TEAM_ID||'';
  if(!token||!project){
    const runtime=process.env.VERCEL_GIT_COMMIT_SHA?{
      id:null,url:process.env.VERCEL_URL||null,state:'READY',target:process.env.VERCEL_ENV||null,createdAt:null,branch:process.env.VERCEL_GIT_COMMIT_REF||null,sha:process.env.VERCEL_GIT_COMMIT_SHA||null,message:process.env.VERCEL_GIT_COMMIT_MESSAGE||null
    }:null;
    return {available:Boolean(runtime),detailed:false,deployments:runtime?[runtime]:[],error:runtime?null:'Vercel detailed history requires VERCEL_TOKEN and project configuration'};
  }
  const q=new URLSearchParams({projectId:project,limit:'20'});if(team)q.set('teamId',team);
  const result=await fetchJson(`https://api.vercel.com/v6/deployments?${q}`,{headers:{Authorization:`Bearer ${token}`}},6000);
  const deployments=Array.isArray(result.data?.deployments)?result.data.deployments.map(d=>({id:d.uid||d.id||null,url:d.url||null,state:d.state||d.readyState||'UNKNOWN',target:d.target||null,createdAt:d.createdAt||d.created||null,branch:d.meta?.githubCommitRef||null,sha:d.meta?.githubCommitSha||null,message:d.meta?.githubCommitMessage||null})):[];
  return {available:result.ok,detailed:true,deployments,error:result.ok?null:`Vercel telemetry unavailable (${result.status||'network'})`};
}

async function supabaseStatus(auth){
  const headers={apikey:PROD_SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.token}`,Prefer:'count=exact',Range:'0-0'};
  const tables=['products','variants','orders','customer_profiles','wallet_accounts','customer_protocols'];
  const counts={};
  let available=true;
  await Promise.all(tables.map(async table=>{
    const r=await fetchJson(`${PROD_SUPABASE_URL}/rest/v1/${table}?select=id`,{headers},5000);
    if(!r.ok){available=false;counts[table]=null;return;}
    // Supabase REST does not expose count in JSON body for headless fetch here; use row presence as connectivity and query exact counts below only when RPC is not required.
    const exact=await fetch(`${PROD_SUPABASE_URL}/rest/v1/${table}?select=id`,{headers:{...headers,Range:'0-0'}}).catch(()=>null);
    const range=exact?.headers?.get('content-range')||'';
    const n=Number(range.split('/')[1]);
    counts[table]=Number.isFinite(n)?n:null;
  }));
  return {available,project:'Ai BioTech Project',counts,error:available?null:'One or more production tables could not be read with the current admin session'};
}

function issueBucket(issue){
  const labels=(issue.labels||[]).map(x=>String(x).toLowerCase());
  if(issue.state==='closed')return 'resolved';
  if(labels.some(x=>/block|critical|security/.test(x)))return 'blocked';
  if(labels.some(x=>/progress|doing|active|wip/.test(x)))return 'in_progress';
  return 'pending';
}

function makeRoadmap(ctx){
  const g=ctx.github,s=ctx.supabase,v=ctx.vercel;
  const hasCheckpoint=g.branches.some(b=>b.classification==='checkpoint');
  const c=s.counts||{};
  const deployed=v.deployments.length>0;
  const nodes=[
    ['Backup',hasCheckpoint?'PASS':'WARNING',hasCheckpoint?'Recovery/backup branch detected.':'No checkpoint branch detected by GitHub telemetry.'],
    ['Discovery',g.available?'PASS':'WARNING',g.available?'Repository topology is reachable.':'GitHub telemetry unavailable.'],
    ['Database / Auth',s.available?'IN_PROGRESS':'BLOCKED',s.available?'Production Supabase is reachable with the current admin session.':'Supabase production health read failed.'],
    ['Products',(c.products||0)>0?'PASS':'UNKNOWN',(c.products||0)>0?`${c.products} products visible to admin.`:'Product count unavailable.'],
    ['Variants',(c.variants||0)>0?'PASS':'UNKNOWN',(c.variants||0)>0?`${c.variants} variants visible to admin.`:'Variant count unavailable.'],
    ['Inventory',(c.variants||0)>0?'IN_PROGRESS':'UNKNOWN','Inventory integrity still requires transaction-level acceptance testing.'],
    ['Cart','UNKNOWN','Awaiting end-to-end acceptance evidence.'],
    ['Checkout','UNKNOWN','Awaiting order + stock + wallet persistence acceptance evidence.'],
    ['Orders',(c.orders||0)>0?'IN_PROGRESS':'UNKNOWN',(c.orders||0)>0?`${c.orders} production orders exist; consistency QA remains.`:'Order count unavailable.'],
    ['Wallet / Payments',(c.wallet_accounts||0)>0?'IN_PROGRESS':'UNKNOWN','Wallet accounts exist when measurable; top-up and checkout flows still require acceptance evidence.'],
    ['Tracking','UNKNOWN','Requires order/member status consistency verification.'],
    ['Member Area',(c.customer_profiles||0)>0?'IN_PROGRESS':'UNKNOWN','Customer records exist when measurable; member flow QA remains.'],
    ['Invoice','UNKNOWN','Requires order-to-invoice acceptance verification.'],
    ['Protocol',(c.customer_protocols||0)>0?'IN_PROGRESS':'UNKNOWN','Protocol records exist when measurable; access and generation QA remains.'],
    ['Full QA','UNKNOWN','Release gate not yet proven.'],
    ['Production',deployed?'IN_PROGRESS':'UNKNOWN',deployed?'A Vercel deployment is visible; release-readiness evidence is still required.':'Detailed deployment telemetry unavailable.']
  ];
  return nodes.map(([name,status,detail],index)=>({id:index+1,name,status,detail}));
}

function overall(roadmap){
  const weight={PASS:1,IN_PROGRESS:.5,WARNING:.25,BLOCKED:0,FAILED:0,UNKNOWN:0};
  return Math.round(roadmap.reduce((sum,n)=>sum+(weight[n.status]||0),0)/roadmap.length*100);
}

function notificationsFrom(ctx,roadmap,credentials){
  const out=[];
  const add=(type,title,message,severity='info')=>out.push({id:`${type}-${out.length+1}`,type,title,message,severity,createdAt:new Date().toISOString()});
  credentials.filter(c=>c.required&&!c.configured).forEach(c=>add('credential_required',`${c.key} required`,c.purpose,'warning'));
  credentials.filter(c=>!c.required&&!c.configured&&/OpenAI|Vercel|SPX|ToyyibPay/.test(c.key)).forEach(c=>add('credential_required',`${c.key} not configured`,c.purpose,'info'));
  if(!ctx.github.available)add('source_warning','GitHub telemetry unavailable',ctx.github.error||'GitHub source could not be reached.','warning');
  if(!ctx.supabase.available)add('source_warning','Supabase health warning',ctx.supabase.error||'Production database health check failed.','warning');
  const failed=ctx.vercel.deployments.find(d=>/ERROR|FAILED|CANCELED/.test(String(d.state).toUpperCase()));
  if(failed)add('build_failed','Deployment failure detected',`${failed.branch||'Unknown branch'} · ${failed.state}`,'error');
  const blockers=roadmap.filter(n=>n.status==='BLOCKED');
  blockers.forEach(n=>add('blocker',`${n.name} blocked`,n.detail,'error'));
  if(ctx.github.branches.some(b=>b.classification==='checkpoint'))add('repair_completed','Recovery checkpoint available','GitHub recovery/backup branches are present.','success');
  return out.slice(0,20);
}

function deterministicAnswer(message,status){
  const q=String(message||'').toLowerCase();
  const blocked=status.roadmap.filter(x=>x.status==='BLOCKED');
  const pending=status.roadmap.filter(x=>['UNKNOWN','IN_PROGRESS','WARNING'].includes(x.status));
  if(/broken|block/.test(q))return blocked.length?`Current blockers: ${blocked.map(x=>`${x.name}: ${x.detail}`).join(' | ')}`:'No roadmap item is currently marked BLOCKED. Several items still need acceptance evidence.';
  if(/pending|next|remain/.test(q))return `Pending/in-progress areas: ${pending.slice(0,8).map(x=>x.name).join(', ')}${pending.length>8?'…':''}.`;
  if(/branch|active/.test(q)){const work=status.branches.filter(b=>b.classification==='work'||b.classification==='integration').slice(0,8);return `Visible active/integration branches: ${work.map(b=>b.name).join(', ')||'none available from GitHub telemetry'}.`;}
  if(/credential|key|api/.test(q)){const missing=status.credentials.filter(c=>!c.configured);return missing.length?`Not configured: ${missing.map(c=>c.key).join(', ')}. Secret values are intentionally never shown here.`:'All tracked credential readiness checks are currently configured.';}
  if(/changed|recent|build|deploy/.test(q)){const d=status.deployments[0];return d?`Latest visible deployment: ${d.branch||'unknown branch'} · ${d.state||'UNKNOWN'}${d.message?` · ${d.message}`:''}.`:'Detailed deployment history is not currently available.';}
  if(/production|release|ship/.test(q))return `Production readiness is ${status.health.overallPercent}% by roadmap weighting. Full QA must pass before release; ${blocked.length?`${blocked.length} blocker(s) remain.`:'no hard blocker is currently measured, but unknown/in-progress gates remain.'}`;
  return null;
}

async function getProgressStatus(req,auth){
  const [github,vercel,supabase]=await Promise.all([githubStatus(),vercelStatus(),supabaseStatus(auth)]);
  const credentials=credentialMeta();
  const ctx={github,vercel,supabase};
  const roadmap=makeRoadmap(ctx);
  const issues=(github.issues||[]).map(i=>({...i,bucket:issueBucket(i)}));
  const notifications=notificationsFrom(ctx,roadmap,credentials);
  const phase=roadmap.find(x=>x.status!=='PASS')?.name||'Production';
  return {
    generatedAt:new Date().toISOString(),
    health:{overallPercent:overall(roadmap),phase,status:roadmap.some(x=>x.status==='BLOCKED'||x.status==='FAILED')?'BLOCKED':'IN_PROGRESS'},
    roadmap,issues,branches:github.branches||[],deployments:vercel.deployments||[],notifications,credentials,
    sources:{github:{available:github.available,authenticated:github.authenticated,error:github.error||null},vercel:{available:vercel.available,detailed:vercel.detailed,error:vercel.error||null},supabase:{available:supabase.available,project:supabase.project,error:supabase.error||null}},
    counts:supabase.counts||{}
  };
}

module.exports={authorizeAdmin,getProgressStatus,deterministicAnswer,credentialMeta};