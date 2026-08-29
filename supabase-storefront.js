/* Live storefront catalog bridge. Supabase is the source of truth; localStorage remains cart/session only. */
(function(){
  const LIVE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
  const LIVE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
  const db=window.supabase?.createClient(LIVE_URL,LIVE_KEY);
  if(!db)return;

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
    const vv=(p.variants||[]).filter(v=>v.active!==false&&!v.archived_at);
    const strengths=[...new Set(vv.map(v=>v.strength_label).filter(Boolean))];
    const forms=[...new Set(vv.map(v=>v.format).filter(Boolean))];
    return {
      id:p.id,name:p.name,slug:p.slug,featured:!!p.featured,description:p.short_description||'',
      productImage:p.main_image_url||null,main_image_url:p.main_image_url||null,masterCategory:categoryKey(p),category:categoryKey(p),
      strengths,forms,variants:vv.map(v=>({
        id:v.id,strength:v.strength_label,form:v.format,price:Number(v.price||0),stock:Number(v.stock_quantity||0),
        sku:v.sku||'',image:v.image_url||null,available:v.active!==false&&Number(v.stock_quantity||0)>0,
        status:(v.active!==false&&Number(v.stock_quantity||0)>0)?'IN STOCK':'OUT OF STOCK'
      }))
    };
  }
  async function loadLiveCatalog(){
    const {data,error}=await db.from('products').select('id,name,slug,status,featured,published,main_image_url,short_description,long_description,category_id,categories(name,color),variants(id,strength,strength_unit,strength_label,format,sku,price,stock_quantity,image_url,active,archived_at)').eq('published',true);
    if(error){console.error('Live catalog load failed',error);return;}
    const live=(data||[]).filter(p=>p.status!=='archived').map(mapProduct).filter(p=>p.variants.length);
    if(!live.length)return;
    products=live;
    try{localStorage.removeItem('aibt_products');}catch{}
    if(typeof renderCats==='function')renderCats();
    if(typeof renderProducts==='function')renderProducts();
    const requested=new URLSearchParams(location.search).get('product');
    if(requested){
      const p=products.find(x=>x.id===requested||x.slug===requested||String(x.name).toLowerCase()===requested.toLowerCase());
      if(p&&typeof openProduct==='function')setTimeout(()=>openProduct(p.id),0);
    }
  }
  loadLiveCatalog();
})();
