/* AI BioTech preview-only visual renderer. No persistence or production mutations. */
(function(global){
  'use strict';
  const SIZE=1536;
  const PEN_FIELDS={
    name:{x:720,y:674,w:362,h:122,pad:18,max:44,min:16,weight:900},
    strength:{x:1128,y:680,w:126,h:118,pad:12,max:28,min:14,weight:900}
  };
  const VIAL_FIELDS={
    name:{cx:768,cy:820,maxW:430,max:66,min:20,weight:900},
    strength:{cx:768,cy:977,maxW:230,max:58,min:20,weight:900}
  };
  /* Label mask deliberately reaches the lower accent wave but never the top hardware. */
  const VIAL_LABEL_MASKS=[{x:390,y:600,w:760,h:650}];
  const VIAL_CAP_REGION={x:390,y:35,w:760,h:175};
  const VIAL_CAP_MASK=VIAL_CAP_REGION;
  function normalizeLabel(v){return String(v??'').replace(/\s+\d+(?:\.\d+)?\s*(?:MG|ML)$/i,'').trim()}
  function normalizeStrength(v){return String(v??'').trim().replace(/\s+/g,'')}
  function fieldMaxWidth(field){const span=field.w||field.maxW||1;return Math.max(1,span-((field.pad||0)*2))}
  function fitFontSize(measure,text,field){const maxW=fieldMaxWidth(field);for(let size=field.max;size>field.min;size--){if(measure(String(text||''),size)<=maxW)return size}return field.min}
  function fitTextLayout(measure,text,field){const value=String(text||''),size=fitFontSize(measure,value,field),maxW=fieldMaxWidth(field),measured=Math.max(0,Number(measure(value,size))||0);const scaleX=measured>maxW&&measured>0?Math.max(.55,maxW/measured):1;return {size,scaleX,maxW,measured}}
  function cssRgb(hex){const s=String(hex||'#18c9ff').trim();if(/^#[0-9a-f]{6}$/i.test(s))return [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];if(/^#[0-9a-f]{3}$/i.test(s))return [1,2,3].map(i=>parseInt(s[i]+s[i],16));return [24,201,255]}
  function readableAccent(hex){
    const raw=String(hex||'#18c9ff').toUpperCase();
    const known={'#F4E04D':'#8A7200','#FFD60A':'#8A6700','#F5D84A':'#8A7000'};
    if(known[raw])return known[raw];
    const [r,g,b]=cssRgb(raw),lum=.2126*r+.7152*g+.0722*b;
    if(lum<185)return raw;
    const factor=.62;
    const toHex=n=>Math.max(0,Math.min(255,Math.round(n*factor))).toString(16).padStart(2,'0').toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function recolorRegion(ctx,accent,rect,predicate){try{const img=ctx.getImageData(rect.x,rect.y,rect.w,rect.h),d=img.data,[ar,ag,ab]=cssRgb(accent);for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];if(a<12||!predicate(r,g,b,a))continue;const lum=Math.max(.36,Math.min(1.16,(r+g+b)/(255*2.1)));d[i]=Math.min(255,ar*lum);d[i+1]=Math.min(255,ag*lum);d[i+2]=Math.min(255,ab*lum)}ctx.putImageData(img,rect.x,rect.y)}catch(_){ }}
  function isOrange(r,g,b){return r>145&&g>45&&g<190&&b<95&&r>g*1.15}
  function isCapWhite(r,g,b){const hi=Math.max(r,g,b),lo=Math.min(r,g,b);return hi>170&&(hi-lo)<34}
  function recolorOrangePixels(ctx,accent){recolorRegion(ctx,accent,{x:0,y:0,w:SIZE,h:SIZE},isOrange)}
  function recolorLabelAccents(ctx,accent){for(const rect of VIAL_LABEL_MASKS)recolorRegion(ctx,accent,rect,isOrange)}
  function recolorVialCap(ctx,accent){recolorRegion(ctx,accent,VIAL_CAP_REGION,isCapWhite)}
  function measureWidth(ctx,text,size,weight){ctx.font=`${weight} ${size}px Arial`;const m=ctx.measureText(String(text||''));return (m.actualBoundingBoxRight||m.width)-(m.actualBoundingBoxLeft||0)}
  function printField(ctx,text,field,fill){text=String(text||'').trim();if(!text)return;const layout=fitTextLayout((t,s)=>measureWidth(ctx,t,s,field.weight),text,field),cx=field.x+field.w/2,cy=field.y+field.h/2;ctx.save();ctx.beginPath();ctx.rect(field.x,field.y,field.w,field.h);ctx.clip();ctx.font=`${field.weight} ${layout.size}px Arial`;ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.textAlign='center';ctx.translate(cx,cy);ctx.scale(layout.scaleX,1);ctx.fillText(text,0,0);ctx.restore()}
  function printCenteredField(ctx,text,field,fill){text=String(text||'').trim();if(!text)return;const layout=fitTextLayout((t,s)=>measureWidth(ctx,t,s,field.weight),text,field);ctx.save();ctx.font=`${field.weight} ${layout.size}px Arial`;ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.textAlign='center';ctx.translate(field.cx,field.cy);ctx.scale(layout.scaleX,1);ctx.fillText(text,0,0);ctx.restore()}
  function loadImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not load master image'));im.src=url})}
  function drawContained(ctx,img){const sc=Math.min(SIZE/img.width,SIZE/img.height),w=img.width*sc,h=img.height*sc;ctx.drawImage(img,(SIZE-w)/2,(SIZE-h)/2,w,h)}
  async function renderPreview({canvas,masterUrl,productName,strength,format,accent='#18c9ff',cartridgeBlank=false,vialCapMode='white'}){
    if(!canvas||typeof canvas.getContext!=='function')throw new Error('Preview canvas is required');if(!masterUrl)throw new Error('Master image URL is required');if(!String(productName||'').trim())throw new Error('Product name is required');if(!String(strength||'').trim())throw new Error('Strength is required');
    const form=String(format||'Vial'),capMode=vialCapMode;canvas.width=SIZE;canvas.height=SIZE;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,SIZE,SIZE);const im=await loadImage(masterUrl);drawContained(ctx,im);if(form==='Cartridge'&&!cartridgeBlank)return {mode:'reference-only',format:form};
    const name=normalizeLabel(productName),dose=normalizeStrength(strength),nameColor=readableAccent(accent);
    if(form==='Pen'){recolorOrangePixels(ctx,accent);printField(ctx,name,PEN_FIELDS.name,nameColor);printField(ctx,dose,PEN_FIELDS.strength,'#111');return {mode:'dynamic-preview',format:form}}
    if(form==='Vial'){recolorLabelAccents(ctx,accent);if(capMode==='category')recolorVialCap(ctx,accent);printCenteredField(ctx,name,VIAL_FIELDS.name,nameColor);printCenteredField(ctx,dose,VIAL_FIELDS.strength,'#111');return {mode:'dynamic-preview',format:form,capMode}}
    if(form==='Cartridge'&&cartridgeBlank)return {mode:'blank-master-awaiting-field-map',format:form};throw new Error(`Unsupported format: ${form}`)
  }
  global.AIBTVisualRenderer={SIZE,PEN_FIELDS,VIAL_FIELDS,VIAL_LABEL_MASKS,VIAL_CAP_REGION,VIAL_CAP_MASK,normalizeLabel,normalizeStrength,fitFontSize,fitTextLayout,readableAccent,recolorLabelAccents,recolorVialCap,renderPreview};
})(typeof window!=='undefined'?window:globalThis);
