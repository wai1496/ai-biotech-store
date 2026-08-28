/* Storefront production bridge: live Supabase catalog + proper Admin routing */
window.openAdmin=()=>{window.location.href='/admin.html'};

async function loadProductionCatalog(){
  const base='https://yjauxyvtrmdriwtmckkl.supabase.co/rest/v1/';
  const key='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
  const headers={apikey:key,Authorization:'Bearer '+key};
  try{
    const [pr,vr,cr,mr]=await Promise.all([
      fetch(base+'products?select=*',{headers}),
      fetch(base+'variants?select=*&active=eq.true&archived_at=is.null',{headers}),
      fetch(base+'categories?select=*',{headers}),
      fetch(base+'media_assets?select=asset_type,public_url&archived=eq.false&asset_type=in.(master_pen,master_vial,master_cartridge)',{headers})
    ]);
    if(!pr.ok||!vr.ok||!cr.ok) throw new Error('Live catalog unavailable');
    const [pp,vv,cc]=await Promise.all([pr.json(),vr.json(),cr.json()]);
    const catsById=new Map(cc.map(c=>[c.id,c]));
    const localById=new Map((products||[]).map(p=>[p.id,p]));
    if(pp.length){
      products=pp.filter(p=>p.status!=='archived').map(p=>{
        const vs=vv.filter(v=>v.product_id===p.id);
        const local=localById.get(p.id)||{};
        const cat=catsById.get(p.category_id);
        const forms=[...new Set(vs.map(v=>v.format))];
        const strengths=[...new Set(vs.map(v=>v.strength_label))];
        return {...local,
          id:p.id,
          name:p.name,
          featured:!!p.featured,
          description:p.short_description||'',
          productImage:p.main_image_url||null,
          masterCategory:cat?.name||local.masterCategory,
          strengths,
          forms,
          variants:vs.map(v=>({
            id:v.id,
            strength:v.strength_label,
            form:v.format,
            price:Number(v.price||0),
            stock:Math.max(0,Number(v.stock_quantity||0)-Number(v.reserved_quantity||0)),
            status:(Number(v.stock_quantity||0)-Number(v.reserved_quantity||0))>0?'IN STOCK':'OUT OF STOCK',
            sku:v.sku||'',
            image:v.image_url||null,
            available:!!v.active&&(Number(v.stock_quantity||0)-Number(v.reserved_quantity||0))>0
          }))
        };
      });
    }
    if(mr.ok){
      const assets=await mr.json();
      masters=masters||{};
      for(const a of assets){
        const f={master_pen:'Pen',master_vial:'Vial',master_cartridge:'Cartridge'}[a.asset_type];
        if(f&&a.public_url) masters[f]=a.public_url;
      }
    }
    if(typeof renderCats==='function') renderCats();
    if(typeof renderProducts==='function') renderProducts();
    if(typeof renderCart==='function') renderCart();
  }catch(e){
    console.warn('Production catalog bridge:',e.message);
  }
}

function installImageFallbacks(){
  document.addEventListener('error',e=>{
    const img=e.target;
    if(!(img instanceof HTMLImageElement)||!img.closest('.visual')) return;
    const box=img.closest('.visual');
    if(box.dataset.imageFailed) return;
    box.dataset.imageFailed='1';
    box.innerHTML='<div class="missing"><b>IMAGE TEMPORARILY UNAVAILABLE</b><br><small>Please refresh this page.</small></div>';
  },true);
}

installImageFallbacks();
loadProductionCatalog();
