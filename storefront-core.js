/* Theme-independent cart, product validity, money, and checkout intent. */
(function(root){
  'use strict';
  const storage=root.localStorage,scope=root.AIBTRuntime?.scope||'preview-rpnwssqvurpdennpzplx';
  const key='aibt_cart:'+scope,intentKey='aibt_checkout_intent:'+scope;
  const read=k=>{try{return JSON.parse(storage.getItem(k)||'null')}catch{return null}};
  const validVariant=v=>!!v&&v.active!==false&&!v.archived_at;
  const usableStock=v=>validVariant(v)?Math.max(0,Math.floor(Number(v.stock_quantity||0)-Number(v.reserved_quantity||0))):0;
  const money=v=>'RM '+Number(v||0).toFixed(2);
  const normalize=items=>(Array.isArray(items)?items:[]).filter(x=>x?.variantId&&Number.isFinite(Number(x.qty))&&Number(x.qty)>0).map(x=>({...x,form:x.form||x.format,qty:Math.floor(Number(x.qty))}));
  let items=normalize(read(key));
  // Never import the unscoped production cart. Migrate staging only, once;
  // preserve its original bytes as a recoverable backup, not a second cart.
  if(storage.getItem(key)===null){items=normalize(read('aibt_staging_cart'));storage.setItem(key,JSON.stringify(items));if(storage.getItem('aibt_staging_cart')!==null){storage.setItem(key+':legacy-backup',storage.getItem('aibt_staging_cart'));storage.removeItem('aibt_staging_cart');}}
  const limits=new Map();
  const save=()=>storage.setItem(key,JSON.stringify(items));
  const cart={
    key,get:()=>items.map(x=>({...x})),replace(next){items=normalize(next);save();},
    add(p,v){const max=usableStock(v);limits.set(v.id,max);const hit=items.find(x=>x.variantId===v.id);if(!max||(hit?.qty||0)>=max)return false;if(hit)hit.qty++;else items.push({variantId:v.id,productId:p.id,name:p.name,strength:v.strength_label,form:v.format,price:Number(v.price),image:v.image_url||'',qty:1});save();return true;},
    setVariants(variants){const map=new Map(variants.map(v=>[v.id,v]));for(const v of variants)limits.set(v.id,usableStock(v));items=items.map(item=>{const v=map.get(item.variantId),stock=usableStock(v);return v?{...item,price:Number(v.price),form:v.format,strength:v.strength_label,qty:stock?Math.min(item.qty,stock):item.qty,unavailable:!stock}:{...item,unavailable:true};});save();},
    change(id,delta){const x=items.find(x=>x.variantId===id);if(!x)return false;const qty=x.qty+delta;if(qty<=0){this.remove(id);return true;}if(delta>0&&(!limits.has(id)||qty>limits.get(id)))return false;x.qty=qty;save();return true;},
    remove(id){items=items.filter(x=>x.variantId!==id);save();},clear(){items=[];save();storage.removeItem('aibt_staging_cart');}
  };
  let busy=null;
  const checkoutIntent={
    get:()=>read(intentKey),clear:()=>storage.removeItem(intentKey),
    async run({prepare,createOrder,startPayment}){
      if(busy)return busy;
      busy=(async()=>{
        let intent=read(intentKey);
        if(!intent){intent={key:'web-'+root.crypto.randomUUID(),orderId:null,payload:await prepare()};storage.setItem(intentKey,JSON.stringify(intent));}
        if(!intent.orderId){intent.orderId=await createOrder(intent.key,intent.payload);if(typeof intent.orderId!=='string'||!intent.orderId)throw new Error('Order response is missing; retry this saved checkout intent.');storage.setItem(intentKey,JSON.stringify(intent));}
        return startPayment(intent.orderId);
      })();
      try{return await busy;}finally{busy=null;}
    }
  };
  root.AIBTCore={validVariant,usableStock,money,cart,checkoutIntent};
})(typeof window==='undefined'?globalThis:window);
