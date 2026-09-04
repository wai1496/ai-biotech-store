(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AIBTResearchFetch=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const TEMPORARY_MESSAGE='AI research is temporarily unavailable. Existing published research is unchanged.';
  const MALFORMED_MESSAGE='Research service returned an invalid response. No draft was saved.';
  const INSUFFICIENT_MESSAGE='Research draft created — insufficient high-authority evidence. Manual review required.';

  function validProfile(profile){
    return !!(profile&&typeof profile==='object'&&String(profile.short_description||'').trim()&&String(profile.overview||'').trim());
  }

  function classifyResearchRefresh({ok,jsonValid,body}){
    if(!ok)return {kind:'api_error',status:null,message:TEMPORARY_MESSAGE};
    if(!jsonValid||!body||typeof body!=='object'||!validProfile(body.profile)||!Array.isArray(body.sources)||!body.evidence_gate||typeof body.evidence_gate!=='object'||typeof body.evidence_gate.passed!=='boolean'){
      return {kind:'malformed_response',status:null,message:MALFORMED_MESSAGE};
    }
    if(body.evidence_gate.passed){
      return {kind:'ready',status:'pending_admin_approval',message:'Research draft created'};
    }
    return {kind:'insufficient_evidence',status:'draft',message:INSUFFICIENT_MESSAGE};
  }

  function withTimeout(promise,ms,code='RESEARCH_TIMEOUT'){
    let timer;
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        const error=new Error('Research operation timed out');
        error.code=code;
        reject(error);
      },ms);
    });
    return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
  }

  return {classifyResearchRefresh,withTimeout,TEMPORARY_MESSAGE,MALFORMED_MESSAGE,INSUFFICIENT_MESSAGE};
});
