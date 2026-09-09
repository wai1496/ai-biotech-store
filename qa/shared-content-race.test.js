const assert=require('assert');
const {fixture}=require('./helpers/offline-page');

function deferred(){
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  return {promise,resolve};
}

(async()=>{
  const f=fixture();
  const requests=new Map();
  f.context.AIBTRuntime={createClient:()=>({
    from:()=>{
      const query={slug:null};
      query.select=()=>query;
      query.eq=(column,value)=>{if(column==='slug')query.slug=value;return query;};
      query.maybeSingle=()=>{
        const request=deferred();
        requests.set(query.slug,request);
        return request.promise;
      };
      return query;
    }
  })};

  f.run('shared-content.js');
  const privacy=f.context.openPublishedPage('privacy');
  const terms=f.context.openPublishedPage('terms');

  requests.get('terms').resolve({data:{content:'Current terms content'},error:null});
  await terms;
  requests.get('privacy').resolve({data:{content:'Stale privacy content'},error:null});
  await privacy;

  const host=f.document.getElementById('sharedContent');
  assert.equal(host.getAttribute('aria-label'),'Terms & Conditions');
  assert.deepEqual(
    Array.from(host.querySelectorAll('p'),node=>node.textContent),
    ['Current terms content'],
    'an older policy response must not append into the current dialog'
  );
  console.log('shared content: stale policy responses are ignored PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
