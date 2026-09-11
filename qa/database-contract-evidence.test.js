/* Specification fixture only. NOT evidence of installed SQL, RLS or grants. */
const assert=require('assert');
const evidence=require('../docs/contracts/preview-database-evidence.json');
const {previewSafety}=require('../lib/preview-safety');
function contractFixture(){
 const state={quote:{id:'q1',owner:'u1',address:'MY|43000|Selangor|Street 1',subtotal:1250,expires:100,consumed:false},orders:new Map(),effects:0,payment:{a1:'pending',a2:'pending'},orderStatus:'pending_payment'};
 return {state,consume({owner='u1',address=state.quote.address,subtotal=1250,now=0,key='k1',fail=false,role='authenticated'}={}){
  if(role!=='authenticated')throw new Error('EXECUTE denied');
  if(state.orders.has(owner+key))return state.orders.get(owner+key);
  if(owner!==state.quote.owner||address!==state.quote.address||subtotal!==state.quote.subtotal||now>=state.quote.expires||state.quote.consumed)throw new Error('Quote rejected');
  if(fail)throw new Error('Transaction rollback');
  const order='order1';state.orders.set(owner+key,order);state.quote.consumed=true;state.effects++;return order;
 },reconcile({attempt='a1',event='successful',role='service',fail=false}={}){
  if(role!=='service')throw new Error('EXECUTE denied');
  const current=state.payment[attempt];
  const nextPayment=current==='successful'?'successful':current==='failed'&&event==='pending'?'failed':event;
  const nextOrder=nextPayment==='successful'&&state.orderStatus==='pending_payment'?'paid':state.orderStatus;
  if(fail)throw new Error('Transaction rollback');
  if(nextOrder!==state.orderStatus)state.effects++;
  state.payment[attempt]=nextPayment;state.orderStatus=nextOrder;return {payment:nextPayment,order:nextOrder};
 }};
}
for(const bad of [{owner:'u2'},{address:'MY|43000|Selangor|Other Street'},{subtotal:1},{now:100},{role:'anon'}]){const db=contractFixture();assert.throws(()=>db.consume(bad));assert.equal(db.state.orders.size,0);assert.equal(db.state.effects,0);}
const quote=contractFixture();assert.throws(()=>quote.consume({fail:true}));assert(!quote.state.quote.consumed);assert.equal(quote.consume(),quote.consume());assert.throws(()=>quote.consume({key:'k2'}));assert.equal(quote.state.orders.size,1);assert.equal(quote.state.effects,1);
for(const status of ['paid','ready_to_ship','shipped','delivered','completed','cancelled','refunded']){const db=contractFixture();db.state.orderStatus=status;db.reconcile();assert.equal(db.state.orderStatus,status);db.reconcile({event:'failed'});db.reconcile({event:'pending'});assert.equal(db.state.payment.a1,'successful');assert.equal(db.state.payment.a2,'pending');assert.equal(db.state.effects,0);}
const payment=contractFixture();assert.throws(()=>payment.reconcile({fail:true}));assert.equal(payment.state.payment.a1,'pending');assert.equal(payment.state.orderStatus,'pending_payment');assert.equal(payment.state.effects,0);payment.reconcile();payment.reconcile();assert.equal(payment.state.effects,1);assert.throws(()=>payment.reconcile({role:'authenticated'}));
assert.equal(evidence.status,'unverified');assert.equal(evidence.installedSchemaDigest,null);assert.throws(previewSafety,'offline reference fixtures must never unlock provider work');
console.log('database contract specification cases PASS; installed database/RLS/grants/atomicity UNVERIFIED, unlock gate CLOSED');
