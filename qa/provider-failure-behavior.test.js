const assert=require('assert'),fs=require('fs'),vm=require('vm');
const {resumeBooking}=require('../lib/shipping-booking-flow');
const {verifyTransaction}=require('../lib/toyyibpay');
const {fixture}=require('./helpers/offline-page');
(async()=>{
 const order={id:'o1',grand_total:12.5,currency:'MYR',status:'ready_to_ship'},attempt={id:'a1',order_id:'o1',gateway_reference:'b1',amount:12.5,currency:'MYR'},tx={billExternalReferenceNo:'o1',billpaymentStatus:'1',billpaymentAmount:'12.50'};
 assert.equal(verifyTransaction(order,attempt,'b1',[tx]),tx);
 for(const bad of [{...tx,billExternalReferenceNo:''},{...tx,billExternalReferenceNo:'o2'},{...tx,billCode:'foreign'},{...tx,billpaymentAmount:'12.51'}])assert.throws(()=>verifyTransaction(order,attempt,'b1',[bad]));
 assert.throws(()=>verifyTransaction(order,attempt,'foreign',[tx]));assert.throws(()=>verifyTransaction(order,attempt,'b1',[tx,tx]));
 assert.throws(()=>verifyTransaction(order,{...attempt,currency:'USD'},'b1',[tx]));assert.throws(()=>verifyTransaction(order,{...attempt,amount:12.51},'b1',[tx]));
 // Exercise the persistence boundary: exactly one atomic RPC, never REST PATCH.
 const requests=[];const ctx={module:{exports:{}},exports:{},require:name=>name==='./runtime-supabase'?{runtimeSupabase:()=>({url:'https://rpnwssqvurpdennpzplx.supabase.co',publishableKey:'offline-fixture'})}:name==='./preview-safety'?{previewSafety(){}}:require(name),process:{env:{TOYYIBPAY_MODE:'sandbox',TOYYIBPAY_SECRET_KEY:'offline-fixture',TOYYIBPAY_CATEGORY_CODE:'offline-fixture',SUPABASE_SERVICE_ROLE_KEY:'offline-fixture'}},URL,URLSearchParams,Buffer,console,fetch:async(url,options)=>{requests.push({url,...options});assert(url.endsWith('/rpc/reconcile_payment_attempt_v1'));return {ok:true,text:async()=>JSON.stringify({payment_status:'successful',order_status:'ready_to_ship'})};}};
 vm.runInNewContext(fs.readFileSync('lib/toyyibpay.js','utf8'),ctx);
 const persisted=await ctx.module.exports.persistVerifiedTransaction(order,'b1',tx,attempt);
 assert.equal(persisted.order,'ready_to_ship');assert.equal(requests.length,1);assert.equal(requests[0].method,'POST');assert.equal(JSON.parse(requests[0].body).p_attempt_id,'a1');
 ctx.fetch=async()=>{throw new Error('atomic RPC unavailable');};await assert.rejects(ctx.module.exports.persistVerifiedTransaction(order,'b1',tx,attempt));
 function setup(fault={}){
   let state={stage:'new'},held=false,submits=0,pays=0,checks=0;
   const deps={store:{claim:async()=>{if(held)return {acquired:false};held=true;return {acquired:true,id:'intent-1',token:'lease',state:{...state}};},advance:async(_,patch)=>{if(fault.saveProvider&&patch.providerOrderNo)throw new Error('save failed');state={...state,...patch};return {...state};},complete:async(_,parcel)=>{assert(parcel.awb);if(fault.complete)throw new Error('complete failed');state={...state,stage:'ready',awb:parcel.awb};return {...state};},release:async()=>{held=false;}},submit:async()=>{submits++;if(fault.submit)throw new Error('submit timeout');return 'ep1';},pay:async n=>{assert.equal(n,'ep1');pays++;if(fault.pay)throw new Error('pay timeout');return {awb:fault.noAwb?'':'AWB-1'};},status:async n=>{assert.equal(n,'ep1');checks++;return {awb:fault.noAwb?'':'AWB-1'};},parcelFrom:x=>x};
   return {deps,get:()=>({state,submits,pays,checks}),fault};
 }
 const normal=setup();const both=await Promise.allSettled([resumeBooking('o',normal.deps),resumeBooking('o',normal.deps)]);assert.equal(both.filter(x=>x.status==='fulfilled').length,1);await resumeBooking('o',normal.deps);assert.equal(normal.get().submits,1);assert.equal(normal.get().pays,1);
 for(const kind of ['submit','saveProvider']){const f=setup({[kind]:true});await assert.rejects(resumeBooking('o',f.deps));f.fault[kind]=false;await assert.rejects(resumeBooking('o',f.deps),/unknown/);assert.equal(f.get().submits,1);assert.equal(f.get().pays,0);}
 const pay=setup({pay:true});await assert.rejects(resumeBooking('o',pay.deps));await resumeBooking('o',pay.deps);assert.equal(pay.get().pays,1);assert.equal(pay.get().submits,1);
 const noAwb=setup({noAwb:true});await resumeBooking('o',noAwb.deps);await resumeBooking('o',noAwb.deps);assert.equal(noAwb.get().state.stage,'awaiting-awb');assert.equal(noAwb.get().pays,1);assert.equal(noAwb.get().submits,1);
 const failedSave=setup({complete:true});await assert.rejects(resumeBooking('o',failedSave.deps));failedSave.fault.complete=false;await resumeBooking('o',failedSave.deps);assert.equal(failedSave.get().pays,1);assert.equal(failedSave.get().submits,1);
 const label=fixture('<div id="content"><div id="grid"><table><tr><th>ID</th><th>Actions</th></tr><tr><td>s1</td><td></td></tr></table></div></div>');
 const url='https://labels.example/awb.pdf?x="quoted"&y=1',opened=[];Object.assign(label.context,{current:'shipments',rows:[{id:'s1',tracking_url:url}],renderGeneric(){},flash(){},open:(...args)=>opened.push(args)});
 label.run('admin-shipping.js');label.context.renderGeneric();await label.boot();const b=label.document.querySelector('.aibt-ship-actions button');assert.equal(b.textContent,'Print Label');assert.equal(b.getAttribute('onclick'),null);await b.dispatch('click');assert.equal(opened[0][0],new URL(url).href);label.context.aibtPrintLabel('javascript:alert(1)');assert.equal(opened.length,1);
 console.log('provider failure behavior: bound transactions, atomic RPC boundary, serialized/resumable booking, AWB and safe label DOM PASS; real DB atomicity unverified');
})().catch(e=>{console.error(e);process.exitCode=1;});
