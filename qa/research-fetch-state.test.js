const assert=require('assert');
const path=require('path');
const mod=require(path.join(__dirname,'..','research-fetch-state.js'));

const validProfile={short_description:'Summary',overview:'Overview'};

const strong=mod.classifyResearchRefresh({
  ok:true,
  jsonValid:true,
  body:{profile:validProfile,sources:[{url:'https://pubmed.ncbi.nlm.nih.gov/1'}],evidence_gate:{passed:true,high_quality_source_count:2}}
});
assert.strictEqual(strong.kind,'ready');
assert.strictEqual(strong.status,'pending_admin_approval');
assert.strictEqual(strong.message,'Research draft created');

const insufficient=mod.classifyResearchRefresh({
  ok:true,
  jsonValid:true,
  body:{profile:validProfile,sources:[{url:'https://fda.gov/example'}],evidence_gate:{passed:false,high_quality_source_count:1,warnings:['Insufficient high-authority evidence.']}}
});
assert.strictEqual(insufficient.kind,'insufficient_evidence');
assert.strictEqual(insufficient.status,'draft');
assert.match(insufficient.message,/insufficient high-authority evidence/i);

const apiError=mod.classifyResearchRefresh({
  ok:false,
  jsonValid:true,
  body:{message:'upstream unavailable'}
});
assert.strictEqual(apiError.kind,'api_error');
assert.match(apiError.message,/temporarily unavailable/i);

const malformed=mod.classifyResearchRefresh({ok:true,jsonValid:false,body:null});
assert.strictEqual(malformed.kind,'malformed_response');
assert.match(malformed.message,/invalid response/i);

(async()=>{
  let released=false;
  try{
    await mod.withTimeout(new Promise(()=>{}),10,'TEST_TIMEOUT');
  }catch(error){
    released=error.code==='TEST_TIMEOUT';
  }
  assert.ok(released,'stalled promise must terminate through timeout');
  console.log('research fetch terminal-state contract passed');
})().catch(error=>{console.error(error);process.exit(1)});
