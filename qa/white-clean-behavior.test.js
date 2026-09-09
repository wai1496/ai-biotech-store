const assert=require('assert'),fs=require('fs'),vm=require('vm');
const {fixture,storage}=require('./helpers/offline-page');
const product={id:'p1',name:'Compound',slug:'compound',featured:true,categories:{name:'Research',color:'#1477ff'},variants:[{id:'v1',strength_label:'5mg',format:'Vial',price:12.5,stock_quantity:1,reserved_quantity:0,active:true},{id:'archived',strength_label:'99mg',format:'Pen',price:10,stock_quantity:3,active:true,archived_at:'2026-01-01'}]};
(async()=>{
  const f=fixture(fs.readFileSync('index.html','utf8'),{rows:{products:[product],categories:[],media_templates:[],research_entries:[]},storage:storage({aibt_cart:'[{"variantId":"production","qty":2}]',aibt_staging_cart:'[]'})});
  f.load();f.context.AIBTVisualRenderer.renderPreview=async()=>({mode:'dynamic-preview'});await f.boot();
  assert(f.document.getElementById('productGrid').innerHTML.includes('RM 12.50'));
  assert(!f.document.getElementById('productGrid').innerHTML.includes('99mg'));
  f.context.addToCart('p1');f.context.addToCart('p1');
  assert.equal(f.context.AIBTCore.cart.get()[0].qty,1,'stock-one repeated add must not exceed stock');
  assert.equal(f.document.getElementById('cartTotal').textContent,'RM 12.50');
  assert(f.document.getElementById('cartItems').innerHTML.includes('× 1'));
  assert(!f.document.getElementById('cartOverlay').classList.contains('show'),'add must not force drawer open');
  f.context.openCart();await f.document.getElementById('continueShoppingBtn').dispatch('click');assert(!f.document.getElementById('cartOverlay').classList.contains('show'));
  f.context.stageCheckout();assert.equal(f.context.location.href,'/checkout.html');
  f.context.openStageAccount();assert.equal(f.context.location.href,'/member.html');
  assert.equal(JSON.parse(f.storage.getItem('aibt_cart'))[0].variantId,'production','unscoped production cart must be untouched');
  const reload=fixture('',{storage:f.storage});reload.run('storefront-core.js');assert.equal(reload.context.AIBTCore.cart.get()[0].qty,1);
  f.context.removeCart(0);assert.equal(f.context.AIBTCore.cart.get().length,0);
  for(const kind of ['pen','vial','coldchain','cartridge']){f.context.openGuides(kind);const page=f.document.getElementById('guidesPage');assert(page.classList.contains('show'));assert(page.innerHTML.toLowerCase().includes(kind==='coldchain'?'cold chain':kind));}
  for(const slug of ['contact','terms','privacy']){await f.context.openPublishedPage(slug);assert(!f.document.getElementById('sharedContent').hidden);assert(!f.context.location.href.endsWith(slug+'.html'));}
  f.context.location.search='?product=compound';f.context.resolveStoreDeepLink();assert.equal(f.document.getElementById('sharedContent').getAttribute('aria-label'),'Compound');
  f.context.location.search='?guide=vial';f.context.resolveStoreDeepLink();assert(f.document.getElementById('guidesPage').innerHTML.includes('Vial Set'));
  f.context.openProductResearch('p1');assert.equal(f.context.location.href,'/research-insight.html?product=p1');
  for(const file of ['admin.html','member.html','checkout.html','payment-return.html']){
    for(const omit of [[],['staging-config.js']]){
      const page=fixture(fs.readFileSync(file,'utf8'));page.load(omit);await page.boot();
      assert.equal(page.calls.filter(c=>c.client).length,0,file+' must not initialize a production or authenticated client');
      const denied=await page.context.AIBTRuntime.createClient().rpc('test_write');assert(denied.error);
      if(file==='checkout.html')assert.equal(page.document.getElementById('placeOrderBtn').disabled,true);
    }
  }
  for(const url of [undefined,'https://YJAUXYVTRMDRIWTMCKKL.supabase.co/','https://evil.example','broken']){
    const p=fixture();p.context.AIBT_CONFIG={environment:'staging',supabaseUrl:url,supabaseKey:'fixture-not-secret'};p.run('client-runtime-bridge.js');p.context.AIBTRuntime.createClient({access:'catalog'});assert.equal(p.calls.length,0);
  }
  for(const file of ['research-insight.html','visual-composer.html']){const page=fixture(fs.readFileSync(file,'utf8'));page.load();await page.boot();assert(page.calls.filter(c=>c.client).every(c=>c.client==='https://rpnwssqvurpdennpzplx.supabase.co'));}
  // A missing bridge itself cannot fall through to legacy hard-coded construction.
  const missing=fixture(fs.readFileSync('checkout.html','utf8'));assert.throws(()=>missing.load(['client-runtime-bridge.js']));assert.equal(missing.calls.length,0);
  console.log('white-clean behavior: final script order, cart, content, entrypoint locks PASS (offline DOM; not browser layout)');
})().catch(e=>{console.error(e);process.exitCode=1;});
