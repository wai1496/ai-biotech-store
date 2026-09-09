const assert=require('assert'),fs=require('fs');
const {runtimeSupabase}=require('../lib/runtime-supabase');
(async()=>{
 const previous={...process.env},originalFetch=global.fetch;let requests=0;global.fetch=async()=>{requests++;throw new Error('Network must never be reached');};
 try{
  process.env.SUPABASE_PUBLISHABLE_KEY='offline-fixture';process.env.VERCEL_ENV='preview';
  for(const url of ['', 'https://YJAUXYVTRMDRIWTMCKKL.supabase.co/','https://yjauxyvtrmdriwtmckkl.supabase.co','https://other.supabase.co/','invalid']){process.env.SUPABASE_URL=url;assert.throws(runtimeSupabase);}
  process.env.SUPABASE_URL='https://RPNWSSQVURPDENNPZPLX.supabase.co/';assert.equal(runtimeSupabase().url,'https://rpnwssqvurpdennpzplx.supabase.co');
  for(const env of ['', 'production','test']){process.env.VERCEL_ENV=env;assert.throws(runtimeSupabase);}process.env.VERCEL_ENV='development';assert(runtimeSupabase());process.env.VERCEL_ENV='preview';
  for(const file of fs.readdirSync('api').filter(f=>/^(toyyibpay|easyparcel).*\.js$/.test(f))){
   for(const method of ['GET','POST']){
    const response={status(code){this.code=code;return this;},json(body){this.body=body;return this;},send(body){this.body=body;return this;}};
    await require('../api/'+file)({method,headers:{},body:{orderId:'o',billCode:'b'}},response);
    assert([405,410,503].includes(response.code),file+' unexpectedly unlocked: '+response.code);
   }
  }
  assert.equal(requests,0);console.log('preview route locks: all provider entrypoints and diagnostics make zero external calls PASS');
 }finally{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
})().catch(e=>{console.error(e);process.exitCode=1;});
