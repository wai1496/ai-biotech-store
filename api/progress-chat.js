const {authorizeAdmin,getProgressStatus,deterministicAnswer}=require('./_progress-lib');

function extractResponseText(data){
  if(typeof data?.output_text==='string')return data.output_text.trim();
  const out=Array.isArray(data?.output)?data.output:[];
  return out.flatMap(item=>Array.isArray(item?.content)?item.content:[]).map(part=>part?.text||part?.value||'').filter(Boolean).join('\n').trim();
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    res.status(405).json({error:'Method not allowed'});
    return;
  }
  const auth=await authorizeAdmin(req);
  if(!auth.ok){res.status(auth.status).json({error:auth.error});return;}
  const message=String(req.body?.message||'').trim();
  if(!message||message.length>1200){res.status(400).json({error:'Message must be between 1 and 1200 characters.'});return;}

  let status;
  try{status=await getProgressStatus(req,auth);}catch(error){
    console.error('Progress chat status lookup failed',error?.message||error);
    res.status(500).json({error:'Current project status is unavailable.'});return;
  }

  const deterministic=deterministicAnswer(message,status);
  if(deterministic){res.status(200).json({answer:deterministic,mode:'status',generatedAt:new Date().toISOString()});return;}

  const key=process.env.OPENAI_API_KEY;
  if(!key){
    res.status(200).json({answer:'I can answer current status questions such as what is pending, blocked, recently deployed, which branches are active, or which credentials are missing. Free-form project chat requires OPENAI_API_KEY to be configured server-side.',mode:'credential_required',generatedAt:new Date().toISOString()});
    return;
  }

  const compact={
    health:status.health,
    roadmap:status.roadmap.map(x=>({name:x.name,status:x.status,detail:x.detail})),
    issues:status.issues.slice(0,25).map(x=>({id:x.id,title:x.title,state:x.state,bucket:x.bucket,labels:x.labels})),
    branches:status.branches.slice(0,25).map(x=>({name:x.name,classification:x.classification,sha:x.sha?.slice(0,12)})),
    deployments:status.deployments.slice(0,10).map(x=>({branch:x.branch,state:x.state,target:x.target,message:x.message})),
    credentials:status.credentials.map(x=>({key:x.key,configured:x.configured,required:x.required,purpose:x.purpose})),
    sources:status.sources
  };

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const upstream=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      signal:controller.signal,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
      body:JSON.stringify({
        model:process.env.AIBT_PROGRESS_CHAT_MODEL||'gpt-5.6-luna',
        input:[
          {role:'system',content:[{type:'input_text',text:'You are the AI BioTech engineering project status assistant. Answer only about the supplied project status. Be concise, operational, and explicit about unknowns. Never claim a fix, deployment, test, or credential exists unless shown in the status. Never request or reveal secret values. If the user asks to make changes, explain what is currently known and state that this read-only control center cannot execute production mutations.'}]},
          {role:'user',content:[{type:'input_text',text:`Current project status JSON:\n${JSON.stringify(compact)}\n\nQuestion: ${message}`}]} 
        ],
        max_output_tokens:500
      })
    });
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      console.error('Progress chat upstream error',upstream.status,data?.error?.type||data?.error?.code||'unknown');
      res.status(200).json({answer:'The AI project assistant is temporarily unavailable. The live status dashboard remains available.',mode:'ai_unavailable',generatedAt:new Date().toISOString()});
      return;
    }
    const answer=extractResponseText(data)||'The AI assistant returned no readable status summary.';
    res.status(200).json({answer,mode:'ai',generatedAt:new Date().toISOString()});
  }catch(error){
    const timedOut=error?.name==='AbortError';
    console.error('Progress chat request failed',timedOut?'timeout':error?.message||error);
    res.status(200).json({answer:timedOut?'The AI project assistant timed out. Please use the live dashboard status for now.':'The AI project assistant is temporarily unavailable. The live dashboard remains available.',mode:'ai_unavailable',generatedAt:new Date().toISOString()});
  }finally{clearTimeout(timer);}
};