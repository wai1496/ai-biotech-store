/* Live storefront catalog bridge. Supabase is the source of truth; localStorage remains cart/session only. */
(function(){
  'use strict';
  const LIVE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
  const LIVE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
  const db=window.supabase?.createClient(LIVE_URL,LIVE_KEY);
  if(!db){window.dispatchEvent(new CustomEvent('aibt:catalog-error',{detail:'Supabase client unavailable'}));return;}

  const formRank={Vial:0,Pen:1,Cartridge:2};
  const strengthNumber=value=>{
    const match=String(value||'').match(/([0-9]+(?:\.[0-9]+)?)/);
    return match?Number(match[1]):Number.POSITIVE_INFINITY;
  };
  const unique=values=>[...new Set(values.filter(Boolean))];

  function categoryKey(row){
    const name=String(row?.categories?.name||'').toLowerCase();
    const c=String(row?.categories?.color||'').toUpperCase();
    const byColor={
      '#F57C00':'Metabolism','#2EAA61':'Regeneration','#E63C3C':'Healing','#8052B5':'Brain & Sleep',
      '#FF4F9A':'Bonding','#D6A928':'Longevity','#F4E04D':'Hormone','#64D5F4':'Special Blend','#2F7BFF':'Solvent'
    };
    if(byColor[c])return byColor[c];
    if(/skin|hair|tissue/.test(name))return 'Regeneration';
    if(/healing|immune|repair/.test(name))return 'Healing';
    if(/brain|sleep|cognitive/.test(name))return 'Brain & Sleep';
    if(/sexual|bonding/.test(name))return 'Bonding';
    if(/longevity|cellular|anti-aging/.test(name))return 'Longevity';
    if(/growth|endocrine|hormone/.test(name))return 'Hormone';
    if(/special|blend/.test(name))return 'Special Blend';
    if(/solvent|base/.test(name))return 'Solvent';
    return 'Metabolism';
  }

  function mapProduct(p){
    const vv=(p.variants||[])
      .filter(v=>v.active!==false&&!v.archived_at)
      .sort((a,b)=>strengthNumber(a.strength_label)-strengthNumber(b.strength_label)||String(a.strength_label).localeCompare(String(b.strength_label))||(formRank[a.format]??99)-(formRank[b.format]??99));
    const strengths=unique(vv.map(v=>v.strength_label)).sort((a,b)=>strengthNumber(a)-strengthNumber(b)||String(a).localeCompare(String(b)));
    const forms=unique(vv.map(v=>v.format)).sort((a,b)=>(formRank[a]??99)-(formRank[b]??99)||String(a).localeCompare(String(b)));
    const category=categoryKey(p);
    return {
      id:p.id,name:p.name,slug:p.slug,featured:!!p.featured,
      description:p.short_description||'',short_description:p.short_description||'',long_description:p.long_description||'',
      productImage:p.main_image_url||null,main_image_url:p.main_image_url||null,
      masterCategory:category,category,
      strengths,forms,
      variants:vv.map(v=>({
        id:v.id,strength:v.strength_label,strength_label:v.strength_label,form:v.format,format:v.format,
        price:Number(v.price||0),stock:Number(v.stock_quantity||0),reserved:Number(v.reserved_quantity||0),
        sku:v.sku||'',image:v.image_url||null,image_url:v.image_url||null,
        available:v.active!==false&&Number(v.stock_quantity||0)-Number(v.reserved_quantity||0)>0,
        status:(v.active!==false&&Number(v.stock_quantity||0)-Number(v.reserved_quantity||0)>0)?'IN STOCK':'OUT OF STOCK'
      }))
    };
  }

  function reconcileCart(liveProducts){
    try{
      const lookup=new Map();
      for(const p of liveProducts)for(const v of p.variants||[])lookup.set(v.id,{p,v});
      cart=(Array.isArray(cart)?cart:[]).map(item=>{
        const hit=lookup.get(item.variantId);
        if(!hit)return {...item,unavailable:true};
        const available=Math.max(0,Number(hit.v.stock||0)-Number(hit.v.reserved||0));
        const qty=available>0?Math.min(Math.max(1,Number(item.qty||1)),available):Math.max(1,Number(item.qty||1));
        return {...item,id:hit.p.id,name:hit.p.name,strength:hit.v.strength,form:hit.v.form,price:Number(hit.v.price||0),qty,unavailable:available<=0};
      });
      if(typeof save==='function')save();
    }catch(error){console.warn('Cart reconciliation skipped',error);}
  }

  async function loadLiveCatalog(){
    try{
      const {data,error}=await db.from('products').select('id,name,slug,status,featured,published,main_image_url,short_description,long_description,category_id,categories(name,color),variants(id,strength,strength_unit,strength_label,format,sku,price,stock_quantity,reserved_quantity,image_url,active,archived_at)').eq('published',true).eq('status','active');
      if(error)throw error;
      const live=(data||[]).map(mapProduct).filter(p=>p.variants.length);
      if(!live.length)throw new Error('No published products were returned');
      live.sort((a,b)=>Number(b.featured)-Number(a.featured)||String(a.name).localeCompare(String(b.name)));
      products=live;
      reconcileCart(live);
      try{localStorage.removeItem('aibt_products');}catch(_){ }
      if(typeof renderCats==='function')renderCats();
      if(typeof renderProducts==='function')renderProducts();
      if(typeof renderCart==='function')renderCart();
      window.dispatchEvent(new CustomEvent('aibt:catalog-loaded',{detail:{products:live.length,variants:live.reduce((n,p)=>n+p.variants.length,0)}}));
      const queryRequested=new URLSearchParams(location.search).get('product');
      const pathMatch=String(location.pathname||'').match(/^\/product\/([^/?#]+)/i);
      let pathRequested='';
      try{pathRequested=pathMatch?.[1]?decodeURIComponent(pathMatch[1]):''}catch(_){pathRequested=pathMatch?.[1]||''}
      const requested=queryRequested||pathRequested;
      if(requested){
        const p=products.find(x=>x.id===requested||x.slug===requested||String(x.name).toLowerCase()===requested.toLowerCase());
        if(p&&typeof openProduct==='function')setTimeout(()=>openProduct(p.id),0);
      }
    }catch(error){
      console.error('Live catalog load failed',error);
      window.dispatchEvent(new CustomEvent('aibt:catalog-error',{detail:error?.message||String(error)}));
    }
  }
  loadLiveCatalog();
})();