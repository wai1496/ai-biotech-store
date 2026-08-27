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
    /* Put the centre of the actual visible letters exactly on cx. */
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
        /* Master vial frame centres. */
        fitOptical(x,nm,768,820,430,66,900,color(p),20);
        fitOptical(x,main(v.strength),768,977,230,58,900,'#111',20);
      }else{
        /* Master pen name panel + strength window. */
        fitOptical(x,nm,901,735,330,48,900,color(p),18);
        fitOptical(x,main(v.strength),1191,741,84,32,900,'#111',16);
      }
      el.innerHTML='';el.appendChild(c);
    };
    im.src=src;
  };
})();
