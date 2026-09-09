/* Shared read-only content destinations; never fabricate policy URLs. */
(()=>{
  const db=window.AIBTRuntime.createClient({access:'catalog'});
  function panel(title){
    let host=document.getElementById('sharedContent');
    if(!host){host=document.createElement('section');host.id='sharedContent';host.className='shared-content';document.body.appendChild(host);}
    host.replaceChildren();host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label',title);
    const close=document.createElement('button');close.textContent='Close';close.className='btn';close.onclick=()=>{host.hidden=true;};host.appendChild(close);
    const h=document.createElement('h2');h.textContent=title;host.appendChild(h);host.hidden=false;close.focus();return host;
  }
  function paragraph(host,text){const p=document.createElement('p');p.textContent=text;host.appendChild(p);}
  window.openPublishedPage=async slug=>{
    if(!['contact','terms','privacy'].includes(slug))return;
    const host=panel({contact:'Contact',terms:'Terms & Conditions',privacy:'Privacy & Cookies'}[slug]);
    const {data,error}=await db.from('pages').select('*').eq('slug',slug).eq('published',true).maybeSingle();
    if(error||!data){paragraph(host,'This published page is unavailable in the isolated preview. No production page or policy is substituted.');return;}
    paragraph(host,data.content||data.body||'Published content is not available in this preview.');
  };
  window.openProductDetail=id=>{
    const data=window.AIBTStoreData,p=data?.products.find(p=>p.id===id||p.slug===id);
    const host=panel(p?.name||'Product unavailable');
    if(!p){paragraph(host,'This product is not in the current published catalog.');return;}
    const v=data.selectedVariant(p),img=document.createElement('img');img.className='shared-product-image';host.appendChild(img);window.AIBTProductVisual.render(p,v,img);
    paragraph(host,[v?.strength_label,v?.format,window.AIBTCore.money(v?.price)].filter(Boolean).join(' · '));
    paragraph(host,window.AIBTCore.usableStock(v)>0?'In stock':'Unavailable');
    const research=document.createElement('button');research.className='btn';research.textContent='Research Insights';research.onclick=()=>window.openProductResearch(p.id);host.appendChild(research);
  };
  window.openProductResearch=productId=>{location.href='/research-insight.html?product='+encodeURIComponent(productId);};
  window.resolveStoreDeepLink=()=>{
    const query=new URLSearchParams(location.search),path=location.pathname.match(/^\/product\/([^/]+)\/?$/);
    const product=query.get('product')||(path?decodeURIComponent(path[1]):null),guide=query.get('guide')||query.get('guides');
    if(product)window.openProductDetail(product);else if(guide||location.hash==='#guides')window.openGuides(guide||'home');
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const host=document.getElementById('sharedContent');if(host)host.hidden=true;window.closeGuides?.();}});
})();
