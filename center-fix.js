/* Fine alignment override for dynamic master templates.
   Uses the actual glyph bounding box, not only text advance width, so names such as
   TIRZEPATIDE sit visually in the exact centre of the printed frame. */
(function(){
  function fitOptical(ctx,text,cx,cy,maxW,start,weight,fill,minSize=18){
    text=String(text||'');
    ctx.textBaseline='middle';
    ctx.fillStyle=fill;
    let size=start,m;
    for(;size>minSize;size-=2){
      ctx.font=`${weight} ${size}px Arial`;
      m=ctx.measureText(text);
      const ink=(m.actualBoundingBoxRight||m.width)-(m.actualBoundingBoxLeft||0);
      if(ink<=maxW)break;
    }
    m=ctx.measureText(text);
    const left=m.actualBoundingBoxLeft||0;
    const right=m.actualBoundingBoxRight||m.width;
    const ink=right-left;
    ctx.textAlign='left';
    ctx.fillText(text,cx-(ink/2)-left,cy);
  }
  window.visual=function(p,v,el){
    const form=v?.form||'Vial';
    if(form==='Cartridge'){
      el.innerHTML=`<img src="/assets/cartridge-master-approved.webp" alt="AI BioTech peptide cartridge">`;
      return;
    }
    const rr=real(p,v);
    if(rr){el.innerHTML=`<img src="${rr}" alt="${p.name}">`;return}
    const src=masters[form];
    if(!src){el.innerHTML=`<div class="missing"><b>${form} MASTER NOT UPLOADED</b><br><small>Admin → Master Placeholders</small></div>`;return}
    const im=new Image();
    im.onload=()=>{
      const c=document.createElement('canvas'),x=c.getContext('2d');
      c.width=1536;c.height=1536;
      x.fillStyle='#000';x.fillRect(0,0,1536,1536);
      const sc=Math.min(1536/im.width,1536/im.height),w=im.width*sc,h=im.height*sc,ox=(1536-w)/2,oy=(1536-h)/2;
      x.drawImage(im,ox,oy,w,h);
      recolorOrange(x,color(p));
      const nm=String(p.name||'').replace(/\s+\d+(?:\.\d+)?\s*(MG|ML)$/i,'').trim();
      if(form==='Vial'){
        tintNeutral(x,459,49,616,150,color(p),.94);
        fitOptical(x,nm,768,820,430,66,900,color(p),20);
        fitOptical(x,main(v.strength),768,977,230,58,900,'#111',20);
      }else{
        fitOptical(x,nm,901,735,330,48,900,color(p),18);
        fitOptical(x,main(v.strength),1191,741,84,32,900,'#111',16);
      }
      el.innerHTML='';el.appendChild(c);
    };
    im.src=src;
  };
})();

/* Responsive navigation/controller. */
(function(){
  function toast(message){
    let el=document.querySelector('.shell-toast');
    if(!el){el=document.createElement('div');el.className='shell-toast';document.body.appendChild(el)}
    el.textContent=message;el.hidden=false;
    clearTimeout(window.__shellToastTimer);
    window.__shellToastTimer=setTimeout(()=>{el.hidden=true},2200);
  }
  function closeMobileNav(){document.body.classList.remove('shell-nav-open');const b=document.querySelector('.shell-menu');if(b){b.setAttribute('aria-expanded','false');b.textContent='☰'}}
  function openAbout(){
    let back=document.querySelector('.shell-about-backdrop');
    if(!back){
      back=document.createElement('div');back.className='shell-about-backdrop';back.innerHTML='<div class="shell-about-card" role="dialog" aria-modal="true" aria-label="About AI BioTech"><button type="button" aria-label="Close">×</button><h2><span style="color:#18c9ff">AI</span> BioTech</h2><p>Precision peptide research catalog with category-based product organization, research information, cold-chain handling information and secure packaging guidance.</p><p>For research purposes only. Not for human consumption.</p></div>';
      document.body.appendChild(back);
      back.querySelector('button').addEventListener('click',()=>back.remove());
      back.addEventListener('click',e=>{if(e.target===back)back.remove()});
    }
  }
  function bind(){
    const actions=document.querySelector('.actions'),nav=document.querySelector('.nav');
    if(!actions||!nav)return;
    const actionButtons=[...actions.querySelectorAll('button')];
    const currency=actionButtons.find(b=>(b.textContent||'').toUpperCase().includes('MYR'));
    const admin=actionButtons.find(b=>(b.textContent||'').toUpperCase().includes('ADMIN'));
    const cart=actionButtons.find(b=>(b.textContent||'').includes('🛒')||(b.textContent||'').toUpperCase().includes('CART'));
    if(currency){currency.onclick=null;currency.setAttribute('aria-label','Currency MYR');currency.addEventListener('click',()=>toast('Currency is set to MYR.'))}
    if(admin){admin.onclick=null;admin.addEventListener('click',()=>{if(typeof window.openAdmin==='function')window.openAdmin();else location.href='/admin.html'})}
    if(cart){cart.onclick=null;cart.addEventListener('click',()=>{if(typeof window.toggleCart==='function')window.toggleCart()})}
    if(!actions.querySelector('.shell-menu')){
      const menu=document.createElement('button');menu.type='button';menu.className='shell-menu';menu.textContent='☰';menu.setAttribute('aria-label','Open navigation');menu.setAttribute('aria-expanded','false');
      menu.addEventListener('click',()=>{const open=document.body.classList.toggle('shell-nav-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰'});
      actions.appendChild(menu);
    }
    [...nav.querySelectorAll('button')].forEach(btn=>{
      const text=(btn.textContent||'').replace(/[^A-Za-z ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
      btn.onclick=null;
      let handler=null;
      if(text.includes('HOME'))handler=()=>window.scrollTo({top:0,behavior:'smooth'});
      else if(text.includes('CATALOG'))handler=()=>{try{showAll=true;category='All';if(typeof renderProducts==='function')renderProducts()}catch{}document.getElementById('catalog')?.scrollIntoView({behavior:'smooth',block:'start'})};
      else if(text.includes('PEPTIDES'))handler=()=>document.getElementById('cats')?.scrollIntoView({behavior:'smooth',block:'start'});
      else if(text.includes('RESEARCH'))handler=()=>{if(typeof window.openResearch==='function')window.openResearch();else toast('Research catalog is loading.')};
      else if(text.includes('GUIDES'))handler=()=>{if(typeof window.openGuides==='function')window.openGuides('home');else toast('Guides are loading.')};
      else if(text.includes('FAQ'))handler=()=>{if(typeof window.openFAQ==='function')window.openFAQ();else toast('FAQ is loading.')};
      else if(text.includes('CALCULATOR'))handler=()=>{location.href='/peptide-calculator.html'};
      else if(text.includes('ABOUT'))handler=openAbout;
      if(handler)btn.addEventListener('click',e=>{e.preventDefault();handler();closeMobileNav()});
    });
    document.querySelector('.hero .primary')?.addEventListener('click',()=>closeMobileNav());
    window.addEventListener('resize',()=>{if(innerWidth>=640)closeMobileNav()},{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMobileNav();document.querySelector('.shell-about-backdrop')?.remove()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
