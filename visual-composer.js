/* Preview-only Product Visual Composer controller. Intentionally non-persistent. */
(function(){
  'use strict';
  const LIVE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
  const LIVE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
  const db=window.supabase?.createClient(LIVE_URL,LIVE_KEY)||null;
  const $=id=>document.getElementById(id);
  const els={product:$('vcProduct'),productList:$('vcProductList'),catalogHint:$('vcCatalogHint'),strength:$('vcStrength'),format:$('vcFormat'),accent:$('vcAccent'),accentText:$('vcAccentText'),master:$('vcMaster'),canvas:$('vcCanvas'),status:$('vcStatus'),meta:$('vcMeta'),render:$('vcRender'),reset:$('vcReset'),message:$('vcMessage'),hint:$('vcMasterHint')};
  const defaults={product:'CAGRILINTIDE',strength:'5mg',format:'Pen',accent:'#f57c00',master:'',status:'Draft'};
  let publishedProducts=[],masterTemplates=new Map();
  function setMessage(text,type=''){els.message.textContent=text||'';els.message.className='vc-message'+(type?' '+type:'')}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function setMeta(values){const items=[['Product',values.product||'—'],['Strength',values.strength||'—'],['Format',values.format||'—'],['Mode',values.mode||'Not rendered']];els.meta.innerHTML=items.map(([k,v])=>`<span><b>${k}</b><i>${esc(v)}</i></span>`).join('')}
  function current(){return {productName:els.product.value.trim(),strength:els.strength.value.trim(),format:els.format.value,accent:els.accent.value,masterUrl:els.master.value.trim()}}
  function validate(v){if(!v.productName)return'Enter a product name.';if(!v.strength)return'Enter a strength.';if(!v.masterUrl)return'Choose or enter a master image URL.';return''}
  function findProduct(){const q=els.product.value.trim().toLowerCase();return publishedProducts.find(p=>String(p.name||'').toLowerCase()===q||String(p.id||'').toLowerCase()===q||String(p.slug||'').toLowerCase()===q)}
  function variantsOf(p){return Array.isArray(p?.variants)?p.variants.filter(v=>v.active!==false&&!v.archived_at):[]}
  function chooseVariant(p){const vv=variantsOf(p),form=els.format.value,str=els.strength.value.trim().toLowerCase();return vv.find(v=>String(v.format||'')===form&&String(v.strength_label||'').toLowerCase()===str)||vv.find(v=>String(v.format||'')===form)||vv[0]||null}
  function applyCatalogSelection(){
    const p=findProduct();if(!p)return;
    const variant=chooseVariant(p);if(variant){els.strength.value=variant.strength_label||els.strength.value;if(variant.format)els.format.value=variant.format}
    const categoryColor=String(p.categories?.color||'').trim();if(/^#[0-9a-f]{6}$/i.test(categoryColor)){els.accent.value=categoryColor;els.accentText.value=categoryColor.toUpperCase()}
    const master=masterTemplates.get(els.format.value);const suggested=master?.master_image_url||variant?.image_url||'';
    if(suggested){els.master.value=suggested;els.master.dataset.auto='1'}
    updateFormatHint();
  }
  function updateFormatHint(){els.hint.textContent=els.format.value==='Cartridge'?'Cartridge remains reference-only until a verified blank master and dynamic field map are available.':'Blank '+els.format.value+' master + fixed print field. Long names shrink automatically; short names stay larger and centered.'}
  async function loadPublishedProducts(){
    if(!db){els.catalogHint.textContent='Read-only catalog lookup unavailable; manual input remains available.';return}
    try{
      const {data,error}=await db.from('products').select('id,name,slug,published,status,categories(name,color),variants(id,strength_label,format,image_url,active,archived_at)').eq('published',true).eq('status','active');
      if(error)throw error;publishedProducts=data||[];els.productList.innerHTML=publishedProducts.map(p=>`<option value="${esc(p.name)}"></option>`).join('');els.catalogHint.textContent=`Read-only catalog suggestions loaded (${publishedProducts.length} products). Manual input remains available.`;applyCatalogSelection();
    }catch(error){els.catalogHint.textContent='Read-only catalog lookup failed; manual input remains available.'}
  }
  async function loadMasters(){
    if(!db)return;
    try{
      const {data,error}=await db.from('media_templates').select('format,master_image_url,version,label_config');
      if(error)throw error;for(const row of data||[])if(row?.format&&row?.master_image_url)masterTemplates.set(row.format,row);applyCatalogSelection();
    }catch(_){/* manual master input remains available */}
  }
  async function render(){
    const v=current(),problem=validate(v);if(problem){setMessage(problem,'error');return}
    els.render.disabled=true;setMessage('Rendering preview…');
    try{
      const result=await window.AIBTVisualRenderer.renderPreview({canvas:els.canvas,...v,cartridgeBlank:false});
      setMeta({product:v.productName,strength:v.strength,format:v.format,mode:result.mode});
      if(result.mode==='reference-only')setMessage('Cartridge is reference-only in Phase 1 until a verified blank master and field map are available.','ok');
      else setMessage('Preview rendered. Review name fit, strength fit, category colour, scale and framing.','ok');
    }catch(error){setMessage(error?.message||'Preview failed.','error')}
    finally{els.render.disabled=false}
  }
  function reset(){els.product.value=defaults.product;els.strength.value=defaults.strength;els.format.value=defaults.format;els.accent.value=defaults.accent;els.accentText.value=defaults.accent.toUpperCase();els.master.value=defaults.master;els.status.value=defaults.status;delete els.master.dataset.auto;const ctx=els.canvas.getContext('2d');ctx.clearRect(0,0,els.canvas.width,els.canvas.height);setMeta({});setMessage('Reset complete.');applyCatalogSelection()}
  els.accent.addEventListener('input',()=>{els.accentText.value=els.accent.value.toUpperCase()});
  document.querySelectorAll('[data-accent]').forEach(button=>button.addEventListener('click',()=>{els.accent.value=button.dataset.accent;els.accentText.value=button.dataset.accent.toUpperCase()}));
  els.product.addEventListener('change',applyCatalogSelection);els.product.addEventListener('blur',applyCatalogSelection);
  els.strength.addEventListener('change',applyCatalogSelection);els.format.addEventListener('change',applyCatalogSelection);els.master.addEventListener('input',()=>{delete els.master.dataset.auto});
  els.render.addEventListener('click',render);els.reset.addEventListener('click',reset);setMeta({});updateFormatHint();loadPublishedProducts();loadMasters();
})();
