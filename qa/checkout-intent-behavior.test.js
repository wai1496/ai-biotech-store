const assert=require('assert');const {fixture,storage}=require('./helpers/offline-page');
(async()=>{
 const disk=storage(),first=fixture('',{storage:disk});first.run('storefront-core.js');let creates=0,pays=0,prepares=0;
 const options={prepare:async()=>{prepares++;return {quote:'q1'};},createOrder:async()=>{creates++;return 'order-1';},startPayment:async id=>{assert.equal(id,'order-1');pays++;throw new Error('provider unavailable');}};
 await assert.rejects(first.context.AIBTCore.checkoutIntent.run(options));
 const reload=fixture('',{storage:disk});reload.run('storefront-core.js');
 await assert.rejects(reload.context.AIBTCore.checkoutIntent.run(options));assert.equal(creates,1);assert.equal(prepares,1);assert.equal(pays,2);
 const second=fixture();second.run('storefront-core.js');const orders=new Map();let lost=true;
 const retry={prepare:async()=>({quote:'same-quote'}),createOrder:async(key,payload)=>{assert.equal(payload.quote,'same-quote');if(!orders.has(key))orders.set(key,'order-2');if(lost){lost=false;throw new Error('lost RPC response');}return orders.get(key);},startPayment:async id=>id};
 await assert.rejects(second.context.AIBTCore.checkoutIntent.run(retry));
 await Promise.all([second.context.AIBTCore.checkoutIntent.run(retry),second.context.AIBTCore.checkoutIntent.run(retry)]);assert.equal(orders.size,1);
 const p={id:'p',name:'P'},v={id:'v',price:12.5,format:'Pen',stock_quantity:3};second.context.AIBTCore.cart.add(p,v);second.context.AIBTCore.cart.add(p,v);assert.equal(second.context.AIBTCore.cart.get()[0].qty,2);second.context.AIBTCore.cart.clear();assert.equal(second.context.AIBTCore.cart.get().length,0);
 console.log('checkout intent behavior: provider failure, refresh, lost response, repeated clicks PASS; DB idempotency remains evidence-gated');
})().catch(e=>{console.error(e);process.exitCode=1;});
