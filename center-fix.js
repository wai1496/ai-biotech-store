/* Fine alignment override for dynamic master templates.
   Shared Vial/Pen master assets are composited to canvas so the product name and
   strength read as part of the printed artwork instead of floating HTML text. */
(function(){
  const PEN_FIELDS={
    name:{x:720,y:674,w:362,h:122,pad:18,max:44,min:16,weight:900},
    strength:{x:1128,y:680,w:126,h:118,pad:12,max:28,min:14,weight:900}
  };
  function fitOptical(ctx,text,cx,cy,maxW,start,weight,fill,minSize=18){
    text=String(text||'');ctx.textBaseline='middle';ctx.fillStyle=fill;let size=start,m;
    for(;size>minSize;size-=2){ctx.font=`${weight} ${size}px Arial`;m=ctx.measureText(text);const ink=(m.actualBoundingBoxRight||m.width)-(m.actualBoundingBoxLeft||0);if(ink<=maxW)break}
    m=ctx.measureText(text);const left=m.actualBoundingBoxLeft||0,right=m.actualBoundingBoxRight||m.width,ink=right-left;ctx.textAlign='left';ctx.fillText(text,cx-(ink/2)-left,cy);
  }
  function printField(ctx,text,field,fill){
    text=String(text||'').trim();if(!text)return;
    const maxW=Math.max(1,field.w-field.pad*2),maxH=Math.max(1,field.h-field.pad*2);
    let size=Math.min(field.max,maxH),m;
    ctx.save();ctx.beginPath();ctx.rect(field.x,field.y,field.w,field.h);ctx.clip();ctx.textBaseline='middle';ctx.fillStyle=fill;
    for(;size>field.min;size--){ctx.font=`${field.weight} ${size}px Arial`;m=ctx.measureText(text);const ink=(m.actualBoundingBoxRight||m.width)-(m.actualBoundingBoxLeft||0);const asc=m.actualBoundingBoxAscent||size*.75,desc=m.actualBoundingBoxDescent||size*.25;if(ink<=maxW&&asc+desc<=maxH)break}
    m=ctx.measureText(text);const left=m.actualBoundingBoxLeft||0,right=m.actualBoundingBoxRight||m.width,ink=right-left;const cx=field.x+field.w/2,cy=field.y+field.h/2;ctx.textAlign='left';ctx.fillText(text,cx-(ink/2)-left,cy);ctx.restore();
  }
  function isSharedMasterImage(url,form){const s=String(url||'').toLowerCase();if(!s||!s.includes('/catalog-media/masters/'))return false;if(form==='Vial')return s.includes('vial-master');if(form==='Pen')return s.includes('pen-master');return false}
  function masterImageSource(p,v,form){const rr=real(p,v);if(isSharedMasterImage(rr,form))return rr;return masters?.[form]||rr||''}
  window.visual=function(p,v,el){
    const form=v?.form||v?.format||'Vial';
    if(form==='Cartridge'){const live='https://yjauxyvtrmdriwtmckkl.supabase.co/storage/v1/object/public/catalog-media/masters/cartridge-master-admin.webp?v='+Date.now();el.innerHTML=`<img src="${live}" alt="AI BioTech peptide cartridge" onerror="this.onerror=null;this.src='/assets/cartridge-master-approved.webp'">`;return}
    const rr=real(p,v),shared=isSharedMasterImage(rr,form);if(rr&&!shared){el.innerHTML=`<img src="${rr}" alt="${p.name}">`;return}
    const src=masterImageSource(p,v,form);if(!src){el.innerHTML=`<div class="missing"><b>${form} MASTER NOT UPLOADED</b><br><small>Admin → Master Placeholders</small></div>`;return}
    const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{
      const c=document.createElement('canvas'),x=c.getContext('2d');c.width=1536;c.height=1536;x.clearRect(0,0,1536,1536);const sc=Math.min(1536/im.width,1536/im.height),w=im.width*sc,h=im.height*sc,ox=(1536-w)/2,oy=(1536-h)/2;x.drawImage(im,ox,oy,w,h);try{recolorOrange(x,color(p))}catch(_){ }
      const nm=String(p.name||'').replace(/\s+\d+(?:\.\d+)?\s*(MG|ML)$/i,'').trim();
      if(form==='Vial'){try{tintNeutral(x,459,49,616,150,color(p),.94)}catch(_){ }fitOptical(x,nm,768,820,430,66,900,color(p),20);fitOptical(x,main(v?.strength||v?.strength_label||''),768,977,230,58,900,'#111',20)}
      else{printField(x,nm,PEN_FIELDS.name,color(p));printField(x,main(v?.strength||v?.strength_label||''),PEN_FIELDS.strength,'#111')}
      el.innerHTML='';el.appendChild(c)
    };im.onerror=()=>{el.innerHTML=`<img src="${src}" alt="${p.name}">`};im.src=src;
  };
})();

/* Responsive navigation/controller. */
(function(){
  function toast(message){let el=document.querySelector('.shell-toast');if(!el){el=document.createElement('div');el.className='shell-toast';document.body.appendChild(el)}el.textContent=message;el.hidden=false;clearTimeout(window.__shellToastTimer);window.__shellToastTimer=setTimeout(()=>{el.hidden=true},2200)}
  function closeMobileNav(){document.body.classList.remove('shell-nav-open');const b=document.querySelector('.shell-menu');if(b){b.setAttribute('aria-expanded','false');b.textContent='☰'}}
  function openAbout(){let back=document.querySelector('.shell-about-backdrop');if(!back){back=document.createElement('div');back.className='shell-about-backdrop';back.innerHTML='<div class="shell-about-card" role="dialog" aria-modal="true" aria-label="About AI BioTech"><button type="button" aria-label="Close">×</button><h2><span style="color:#18c9ff">AI</span> BioTech</h2><p>Precision peptide research catalog with category-based product organization, research information, cold-chain handling information and secure packaging guidance.</p><p>For research purposes only. Not for human consumption.</p></div>';document.body.appendChild(back);back.querySelector('button').addEventListener('click',()=>back.remove());back.addEventListener('click',e=>{if(e.target===back)back.remove()})}}
  function bind(){const actions=document.querySelector('.actions'),nav=document.querySelector('.nav');if(!actions||!nav)return;const actionButtons=[...actions.querySelectorAll('button')],currency=actionButtons.find(b=>(b.textContent||'').toUpperCase().includes('MYR')),admin=actionButtons.find(b=>(b.textContent||'').toUpperCase().includes('ADMIN')),cart=actionButtons.find(b=>(b.textContent||'').includes('🛒')||(b.textContent||'').toUpperCase().includes('CART'));if(currency){currency.onclick=null;currency.setAttribute('aria-label','Currency MYR');currency.addEventListener('click',()=>toast('Currency is set to MYR.'))}if(admin){admin.onclick=null;admin.addEventListener('click',()=>{if(typeof window.openAdmin==='function')window.openAdmin();else location.href='/admin.html'})}if(cart){cart.onclick=null;cart.addEventListener('click',()=>{if(typeof window.toggleCart==='function')window.toggleCart()})}if(!actions.querySelector('.shell-menu')){const menu=document.createElement('button');menu.type='button';menu.className='shell-menu';menu.textContent='☰';menu.setAttribute('aria-label','Open navigation');menu.setAttribute('aria-expanded','false');menu.addEventListener('click',()=>{const open=document.body.classList.toggle('shell-nav-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰'});actions.appendChild(menu)}[...nav.querySelectorAll('button')].forEach(btn=>{const text=(btn.textContent||'').replace(/[^A-Za-z ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();btn.onclick=null;let handler=null;if(text.includes('HOME'))handler=()=>window.scrollTo({top:0,behavior:'smooth'});else if(text.includes('CATALOG'))handler=()=>{try{showAll=true;category='All';if(typeof renderProducts==='function')renderProducts()}catch{}document.getElementById('catalog')?.scrollIntoView({behavior:'smooth',block:'start'})};else if(text.includes('PEPTIDES'))handler=()=>document.getElementById('cats')?.scrollIntoView({behavior:'smooth',block:'start'});else if(text.includes('RESEARCH'))handler=()=>{if(typeof window.openResearch==='function')window.openResearch();else toast('Research catalog is loading.')};else if(text.includes('GUIDES'))handler=()=>{if(typeof window.openGuides==='function')window.openGuides('home');else toast('Guides are loading.')};else if(text.includes('FAQ'))handler=()=>{if(typeof window.openFAQ==='function')window.openFAQ();else toast('FAQ is loading.')};else if(text.includes('CALCULATOR'))handler=()=>{location.href='/peptide-calculator.html'};else if(text.includes('ABOUT'))handler=openAbout;if(handler)btn.addEventListener('click',e=>{e.preventDefault();handler();closeMobileNav()})});document.querySelector('.hero .primary')?.addEventListener('click',()=>closeMobileNav());window.addEventListener('resize',()=>{if(innerWidth>=640)closeMobileNav()},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMobileNav();document.querySelector('.shell-about-backdrop')?.remove()}})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();