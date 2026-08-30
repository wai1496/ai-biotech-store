(()=>{
'use strict';
const cfg=window.AIBT_CONFIG||{};
const sb=window.getAIBTSupabase?.();
const visualApi=window.AIBT_PRODUCT_VISUALS;
if(!visualApi)throw new Error('AI BioTech product visual resolver is unavailable.');
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const money=v=>'RM'+Number(v||0).toFixed(0);
const NEUTRAL_VISUAL='/assets/product-image-unavailable.svg';
const configuredMasterRows=Object.entries(cfg.masterAssets||{}).map(([format,master_image_url])=>({format,master_image_url}));
let masterVisuals=visualApi.buildMasterMap(configuredMasterRows,{neutral:NEUTRAL_VISUAL});
let products=[],categories=[],research=[],cart=JSON.parse(localStorage.getItem('aibt_staging_cart')||'[]');
let featuredOnly=true,selectedCategory='All',selectedFormat='All',stockFilter='All',sortMode='Featured';
const selections=new Map();
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});closeMobileMenu()}
window.scrollToId=scrollToId;
function categoryColor(p){return p.categories?.color||'#1477ff'}
function strengthNumber(v){const m=String(v||'').match(/([0-9]+(?:\.[0-9]+)?)/);return m?Number(m[1]):999999}
function byStrength(a,b){return strengthNumber(a)-strengthNumber(b)||String(a).localeCompare(String(b))}
function productSelection(p){
 let s=selections.get(p.id);
 const active=(p.variants||[]).filter(v=>v.active!==false);
 const strengths=[...new Set(active.map(v=>v.strength_label))].sort(byStrength);
 if(!s||!strengths.includes(s.strength)){const first=active.find(v=>v.format==='Vial')||active[0];s={strength:first?.strength_label||strengths[0],format:first?.format||'Vial'};selections.set(p.id,s)}
 let compatible=active.filter(v=>v.strength_label===s.strength);
 if(!compatible.some(v=>v.format===s.format)){s.format=(compatible.find(v=>v.format==='Vial')||compatible[0])?.format||s.format}
 return s;
}
function selectedVariant(p){const s=productSelection(p);return (p.variants||[]).find(v=>v.strength_label===s.strength&&v.format===s.format&&v.active!==false)||null}
function available(v){return !!v&&v.active!==false&&Number(v.stock_quantity||0)-Number(v.reserved_quantity||0)>0}
function isStagingOwnedAsset(value){
 if(!visualApi.isSafeAssetUrl(value))return false;
 const url=String(value).trim();
 if(url.startsWith('/')&&!url.startsWith('//'))return true;
 try{
  const assetOrigin=new URL(url,location.origin).origin;
  const stagingOrigin=new URL(cfg.supabaseUrl).origin;
  return assetOrigin===location.origin||assetOrigin===stagingOrigin;
 }catch{return false}
}
function visualFor(v){return visualApi.resolveProductVisual({variant:v||{},masters:masterVisuals,neutralFallback:NEUTRAL_VISUAL})}
function imageFor(v){return visualFor(v).url}
function saveCart(){localStorage.setItem('aibt_staging_cart',JSON.stringify(cart));renderCartCount();renderCart()}
function renderCartCount(){const n=cart.reduce((s,x)=>s+x.qty,0);$$('[data-cart-count]').forEach(x=>x.textContent=n)}
function loadSkeleton(){const g=$('#productGrid');g.innerHTML=Array.from({length:8},()=>'<div class="skeleton"></div>').join('')}
async function loadData(){
 if(!sb){$('#productGrid').innerHTML='<div class="empty">Staging database connection is unavailable.</div>';return}
 loadSkeleton();
 const [pr,cr,rr,mr]=await Promise.all([
   sb.from('products').select('id,name,slug,featured,published,status,short_description,long_description,category_id,categories(id,name,slug,color,description),variants(id,strength,strength_unit,strength_label,format,sku,price,stock_quantity,reserved_quantity,image_url,active)').eq('published',true).eq('status','active'),
   sb.from('categories').select('id,name,slug,color,description,status').eq('status','active').order('name'),
   sb.from('research_entries').select('id,product_id,title,category,short_summary,full_content,references_json,published').eq('published',true),
   sb.from('media_templates').select('format,master_image_url,version')
 ]);
 if(pr.error){$('#productGrid').innerHTML='<div class="empty">Catalog could not be loaded: '+esc(pr.error.message)+'</div>';return}
 if(!mr.error){
  const stagingRows=(mr.data||[]).filter(m=>isStagingOwnedAsset(m?.master_image_url));
  const databaseMasters=visualApi.buildMasterMap(stagingRows,{neutral:NEUTRAL_VISUAL});
  masterVisuals={...masterVisuals,...databaseMasters};
 }
 products=(pr.data||[]).map(p=>({...p,variants:(p.variants||[]).sort((a,b)=>byStrength(a.strength_label,b.strength_label)||['Vial','Cartridge','Pen'].indexOf(a.format)-['Vial','Cartridge','Pen'].indexOf(b.format))}));
 categories=cr.data||[];research=rr.data||[];
 renderCategories();renderProducts();renderResearch();renderHeroAssets();renderCartCount();
 $('#catalogSummary').textContent=`${products.length} products · ${products.reduce((n,p)=>n+p.variants.filter(v=>v.active!==false).length,0)} active catalog variants in staging`;
}
function renderHeroAssets(){
 const map=[['heroVial','Vial'],['heroPen','Pen'],['heroCartridge','Cartridge']];
 for(const [id,format] of map){
  const el=document.getElementById(id),visual=visualFor({format});
  if(el&&visual.url){el.src=visual.url;el.dataset.visualSource=visual.source;el.dataset.visualFormat=format}
 }
}
function renderCategories(){
 const all=[{name:'All',color:'#0d2e63'},...categories];
 $('#categoryChips').innerHTML=all.map(c=>`<button class="chip ${selectedCategory===c.name?'active':''}" onclick="setCategory('${esc(c.name)}')">${esc(c.name)}</button>`).join('');
 $('#sideCategories').innerHTML=all.map(c=>`<button class="side-cat ${selectedCategory===c.name?'active':''}" onclick="setCategory('${esc(c.name)}')"><span class="dot" style="background:${c.color||'#0d2e63'}"></span>${esc(c.name)}</button>`).join('');
 const sel=$('#categoryFilter');sel.innerHTML=all.map(c=>`<option ${selectedCategory===c.name?'selected':''}>${esc(c.name)}</option>`).join('');
}
window.setCategory=name=>{selectedCategory=name;featuredOnly=false;renderCategories();renderProducts();scrollToId('catalog')};
function filtered(){
 const q=($('#searchInput')?.value||'').trim().toLowerCase();
 let a=products.filter(p=>{
   const variants=(p.variants||[]).filter(v=>v.active!==false);
   const cat=selectedCategory==='All'||p.categories?.name===selectedCategory;
   const form=selectedFormat==='All'||variants.some(v=>v.format===selectedFormat);
   const stock=stockFilter==='All'||(stockFilter==='In Stock'?variants.some(available):!variants.some(available));
   const text=!q||[p.name,p.slug,p.categories?.name,...variants.map(v=>`${v.strength_label} ${v.format} ${v.sku}`)].join(' ').toLowerCase().includes(q);
   return cat&&form&&stock&&text&&(!featuredOnly||p.featured);
 });
 if(sortMode==='Name')a.sort((x,y)=>x.name.localeCompare(y.name));
 else if(sortMode==='Price Low')a.sort((x,y)=>Math.min(...x.variants.filter(v=>v.active).map(v=>Number(v.price)))-Math.min(...y.variants.filter(v=>v.active).map(v=>Number(v.price))));
 else a.sort((x,y)=>Number(y.featured)-Number(x.featured)||x.name.localeCompare(y.name));
 return a;
}
function productCard(p){
 const s=productSelection(p),v=selectedVariant(p),act=(p.variants||[]).filter(x=>x.active!==false),strengths=[...new Set(act.map(x=>x.strength_label))].sort(byStrength),forms=[...new Set(act.filter(x=>x.strength_label===s.strength).map(x=>x.format))];
 const cat=categoryColor(p),ok=available(v),visual=visualFor(v),image=visual.url;
 const dynamicLabel=visual.overlayAllowed?`<div class="dynamic-label"><div class="name">${esc(p.name)}</div><div class="strength">${esc(v?.strength_label||'')}</div></div>`:'';
 return `<article class="product-card" id="card-${esc(p.id)}" data-format="${esc(v?.format||'Vial')}" data-visual-source="${esc(visual.source)}" style="--cat:${cat}">
 <div class="product-media"><span class="category-badge">${esc(p.categories?.name||'Research')}</span><span class="format-badge">${esc(v?.format||'—')}</span>${image?`<img src="${esc(image)}" alt="${esc(p.name+' '+(v?.strength_label||'')+' '+(v?.format||''))}" loading="lazy">`:''}${dynamicLabel}</div>
 <div class="product-body"><div><div class="product-name">${esc(p.name)}</div><div class="product-category">${esc(p.categories?.description||p.categories?.name||'Research product')}</div></div>
 <div class="variant-row"><div><div class="mini-label">Strength</div><select class="select" onchange="changeStrength('${esc(p.id)}',this.value)">${strengths.map(x=>`<option ${x===s.strength?'selected':''}>${esc(x)}</option>`).join('')}</select></div><div><div class="mini-label">Format</div><select class="select" onchange="changeFormat('${esc(p.id)}',this.value)">${forms.map(x=>`<option ${x===s.format?'selected':''}>${esc(x)}</option>`).join('')}</select></div></div>
 <div class="price-row"><div class="price">${v?money(v.price):'—'}</div><div class="stock ${ok?'':'out'}">${ok?'● In Stock':'● Sold Out'}</div></div>
 <div class="card-actions"><button class="add-btn" ${ok?'':'disabled'} onclick="addToCart('${esc(p.id)}')">${ok?'Add to Cart':'Sold Out'}</button><button class="info-btn" title="Product information" aria-label="Product information" onclick="openProductInfo('${esc(p.id)}')">ⓘ</button></div>
 <button class="research-link" onclick="openResearch('${esc(p.id)}')">Research Insight →</button></div></article>`;
}
function renderProducts(){
 const a=filtered();$('#catalogTitle').textContent=featuredOnly?'Featured Products':selectedCategory==='All'?'All Products':selectedCategory;
 $('#resultCount').textContent=`${a.length} product${a.length===1?'':'s'}`;
 $('#productGrid').innerHTML=a.length?a.map(productCard).join(''):'<div class="empty">No products match these filters.</div>';
 $('#viewAllBtn').hidden=!featuredOnly;
}
window.changeStrength=(id,strength)=>{const p=products.find(x=>x.id===id);if(!p)return;const s=productSelection(p);s.strength=strength;const compatible=p.variants.filter(v=>v.active!==false&&v.strength_label===strength);if(!compatible.some(v=>v.format===s.format))s.format=(compatible.find(v=>v.format==='Vial')||compatible[0])?.format||s.format;renderProducts()};
window.changeFormat=(id,format)=>{const p=products.find(x=>x.id===id);if(!p)return;productSelection(p).format=format;renderProducts()};
window.showAllProducts=()=>{featuredOnly=false;renderProducts();scrollToId('catalog')};
window.applyFilters=()=>{selectedCategory=$('#categoryFilter').value;selectedFormat=$('#formatFilter').value;stockFilter=$('#stockFilter').value;sortMode=$('#sortFilter').value;featuredOnly=false;renderCategories();renderProducts()};
window.searchCatalog=()=>{featuredOnly=false;renderProducts()};
window.addToCart=id=>{const p=products.find(x=>x.id===id),v=p&&selectedVariant(p);if(!p||!available(v))return toast('This variant is currently unavailable.');const hit=cart.find(x=>x.variantId===v.id);const max=Math.max(0,Number(v.stock_quantity||0)-Number(v.reserved_quantity||0));if(hit){if(hit.qty>=max)return toast('Maximum available stock already in cart.');hit.qty++}else cart.push({variantId:v.id,productId:p.id,name:p.name,strength:v.strength_label,format:v.format,price:Number(v.price),image:imageFor(v),qty:1,max});saveCart();toast(`${p.name} ${v.strength_label} ${v.format} added to cart`)};
function renderCart(){const host=$('#cartItems');if(!host)return;host.innerHTML=cart.length?cart.map((x,i)=>`<div class="cart-item">${x.image?`<img src="${esc(x.image)}" alt="${esc(x.name)}">`:''}<div><b>${esc(x.name)}</b><small>${esc(x.strength)} · ${esc(x.format)} · ${money(x.price)}</small><div class="qty"><button onclick="cartQty(${i},-1)">−</button><b>${x.qty}</b><button onclick="cartQty(${i},1)">+</button></div></div><button class="close-btn" aria-label="Remove item" onclick="removeCart(${i})">×</button></div>`).join(''):'<div class="empty">Your staging cart is empty.</div>';$('#cartTotal').textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0))}
window.cartQty=(i,d)=>{const x=cart[i];if(!x)return;x.qty=Math.max(1,Math.min(x.max||99,x.qty+d));saveCart()};window.removeCart=i=>{cart.splice(i,1);saveCart()};
window.openCart=()=>{$('#cartOverlay').classList.add('show');renderCart();document.body.style.overflow='hidden'};window.closeCart=()=>{$('#cartOverlay').classList.remove('show');document.body.style.overflow=''};
function modal(title,body){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modalWrap').classList.add('show');document.body.style.overflow='hidden'}window.closeModal=()=>{$('#modalWrap').classList.remove('show');document.body.style.overflow=''};
window.openProductInfo=id=>{const p=products.find(x=>x.id===id),v=p&&selectedVariant(p);if(!p||!v)return;const visual=visualFor(v),src=visual.url;modal(p.name,`<div class="info-layout" data-visual-source="${esc(visual.source)}">${src?`<img src="${esc(src)}" alt="${esc(p.name)}">`:''}<div><span class="category-badge" style="position:static;display:inline-block;background:${categoryColor(p)}">${esc(p.categories?.name||'Research')}</span><h3>${esc(v.strength_label)} · ${esc(v.format)}</h3><p>${esc(p.short_description||'Product information is being prepared in the staging content workflow.')}</p><p>${esc(p.long_description||'This staging preview preserves the live catalog while the AI-assisted product content module is being added. All generated content will remain manually editable and approval-controlled.')}</p><div class="info-meta"><div class="meta-box"><small>SKU</small><b>${esc(v.sku)}</b></div><div class="meta-box"><small>Price</small><b>${money(v.price)}</b></div><div class="meta-box"><small>Stock</small><b>${Math.max(0,Number(v.stock_quantity||0)-Number(v.reserved_quantity||0))}</b></div><div class="meta-box"><small>Environment</small><b>Staging</b></div></div><div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn blue" onclick="addToCart('${esc(p.id)}');closeModal()">Add to Cart</button><button class="btn" onclick="openResearch('${esc(p.id)}')">Research Insight</button></div></div></div>`)};
window.openResearch=id=>{const p=products.find(x=>x.id===id),r=research.find(x=>x.product_id===id);if(!p)return;modal(`Research Insight — ${p.name}`,`<span class="category-badge" style="position:static;display:inline-block;background:${categoryColor(p)}">${esc(r?.category||p.categories?.name||'Research')}</span><h3>${esc(r?.title||p.name)}</h3><p>${esc(r?.short_summary||'Research summary is being prepared.')}</p><p>${esc(r?.full_content||'No additional published research content is available in the current source dataset.')}</p><div class="meta-box"><small>Source visibility</small><b>Public staging Research Insight · provenance remains managed separately</b></div><p style="font-size:12px;color:#6b7a90;margin-top:14px">Research information only. Public citations will be shown only when approved in the Source Visibility workflow.</p>`)};
function renderResearch(){const host=$('#researchGrid');if(!host)return;host.innerHTML=research.slice(0,9).map(r=>{const p=products.find(x=>x.id===r.product_id);return `<article class="research-card" style="--cat:${p?categoryColor(p):'#1477ff'}"><h3>${esc(r.title)}</h3><p>${esc(r.short_summary)}</p><button class="btn" onclick="openResearch('${esc(r.product_id)}')">Open Research Insight</button></article>`}).join('')}
window.openStageAccount=()=>location.href='/member.html';
window.stageCheckout=()=>location.href='/checkout.html';
window.openGuide=type=>{const labels={cold:'Cold Chain & Receiving',pen:'Pen Usage',vial:'Vial / Reconstitution',cartridge:'Cartridge Guide'};modal(labels[type]||'Guide',`<p>This guide route is active in staging and will be populated from the approved guide assets/content module.</p><div class="meta-box"><small>Guide</small><b>${esc(labels[type]||type)}</b></div><p>The final guide will remain editable from the Operations Control Center rather than hard-coded into the storefront.</p>`)};
window.toggleMobileMenu=()=>$('#mobileMenu').classList.toggle('show');function closeMobileMenu(){$('#mobileMenu').classList.remove('show')}window.closeMobileMenu=closeMobileMenu;
function bind(){
 $('#searchInput')?.addEventListener('input',searchCatalog);$('#categoryFilter')?.addEventListener('change',applyFilters);$('#formatFilter')?.addEventListener('change',applyFilters);$('#stockFilter')?.addEventListener('change',applyFilters);$('#sortFilter')?.addEventListener('change',applyFilters);
 $('#cartOverlay')?.addEventListener('click',e=>{if(e.target.id==='cartOverlay')closeCart()});$('#modalWrap')?.addEventListener('click',e=>{if(e.target.id==='modalWrap')closeModal()});$('#mobileMenu')?.addEventListener('click',e=>{if(e.target.id==='mobileMenu')closeMobileMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();closeModal();closeMobileMenu()}});
}
document.addEventListener('DOMContentLoaded',()=>{bind();renderCartCount();loadData()});
})();