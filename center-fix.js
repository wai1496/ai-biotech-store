/* Fine alignment override for dynamic master templates.
   Uses the actual glyph bounding box, not only text advance width, so names such as
   TIRZEPATIDE sit visually in the exact centre of the printed frame. */
(function(){
  function fitOptical(ctx,text,cx,cy,maxW,start,weight,fill,minSize=18){
    text=String(text||'');
    ctx.textBaseline='middle';
    ctx.fillStyle=fill;
    let size=start, m;
    for(;size>minSize;size-=2){
      ctx.font=`${weight} ${size}px Arial`;
      m=ctx.measureText(text);
      const ink=(m.actualBoundingBoxRight||m.width)-(m.actualBoundingBoxLeft||0);
      if(ink<=maxW) break;
    }
    m=ctx.measureText(text);
    const left=m.actualBoundingBoxLeft||0;
    const right=m.actualBoundingBoxRight||m.width;
    const ink=right-left;
    ctx.textAlign='left';
    const drawX=cx-(ink/2)-left;
    ctx.fillText(text,drawX,cy);
  }

  window.visual = function(p,v,el){
    const rr=real(p,v);
    if(rr){el.innerHTML=`<img src="${rr}" alt="${p.name}">`;return}
    const form=v?.form||'Vial',src=masters[form];
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

/* Load the shared Knowledge Centre FAQ without rebuilding the storefront. */
(function(){
  const css=document.createElement('link');css.rel='stylesheet';css.href='/faq.css';document.head.appendChild(css);
  const s=document.createElement('script');s.src='/faq.js';s.onload=()=>{
    document.querySelectorAll('button').forEach(btn=>{
      const t=(btn.textContent||'').trim().toUpperCase();
      if(t.includes('FAQ')||t.includes('KNOWLEDGE CENTRE')){
        btn.addEventListener('click',e=>{e.preventDefault();if(window.openFAQ)window.openFAQ()});
      }
    });
  };document.body.appendChild(s);
})();

/* Premium animated DNA background layer. Kept separate from storefront logic so it cannot affect catalog, cart, member or admin functions. */
(function(){
  if(document.querySelector('link[href="/dna-motion.css"]'))return;
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/dna-motion.css';
  document.head.appendChild(css);
})();
