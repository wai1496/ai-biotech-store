/* AI BioTech — Lightweight BiotechAnimatedBackground
   Fixed low-cost canvas background. Preserves the large DNA / molecular / electric look
   while prioritising smooth scrolling and responsive interaction performance.
*/
(function(){
'use strict';
if(window.__AIBioTechAnimatedBackground)return;
window.__AIBioTechAnimatedBackground=true;

const TAU=Math.PI*2;
const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const mobile=Math.min(innerWidth,innerHeight)<760;
const weak=!!((navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4));
const fps=reduced?1:(mobile||weak?18:24);
const frameMs=1000/fps;
const scale=mobile||weak?0.50:0.62;
let c,ctx,w=1,h=1,last=0,raf=0,running=false,nextArc=0,seed=0xA1B10EEC;
const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const dust=[],mols=[],arcs=[];

function install(){
 c=document.createElement('canvas');c.className='biotech-animated-background';c.setAttribute('aria-hidden','true');
 c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block;contain:strict;transform:translateZ(0);';
 document.body.insertBefore(c,document.body.firstChild);
 ctx=c.getContext('2d',{alpha:false,desynchronized:true});
 const s=document.createElement('style');s.id='biotech-animated-background-style';
 s.textContent='html{background:#050812!important}body{background:transparent!important;overflow-x:hidden;isolation:isolate}.scene{display:none!important}.biotech-animated-background{background:#050812}';
 document.head.appendChild(s);
}
function resize(){
 w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);
 c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
 ctx.setTransform(scale,0,0,scale,0,0);build();
}
function build(){
 dust.length=0;mols.length=0;arcs.length=0;
 const pc=mobile?22:36;for(let i=0;i<pc;i++)dust.push({x:rnd(),y:rnd(),r:.6+rnd()*1.6,p:rnd()*TAU,v:rnd()>.83?2:rnd()>.55?1:0});
 const mc=mobile?4:6;for(let i=0;i<mc;i++){const n=4+Math.floor(rnd()*3),a=[];for(let j=0;j<n;j++)a.push({x:(rnd()-.5)*1.5,y:(rnd()-.5)*1.1});mols.push({x:rnd(),y:rnd(),s:.045+rnd()*.055,p:rnd()*TAU,spin:(rnd()-.5)*.00012,a});}
 nextArc=performance.now()+1800+rnd()*2200;
}
function background(){
 ctx.fillStyle='#050812';ctx.fillRect(0,0,w,h);
 let g=ctx.createRadialGradient(w*.78,h*.18,0,w*.78,h*.18,Math.max(w,h)*.48);g.addColorStop(0,'rgba(0,145,255,.12)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 g=ctx.createRadialGradient(w*.16,h*.76,0,w*.16,h*.76,Math.max(w,h)*.38);g.addColorStop(0,'rgba(110,55,220,.10)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='rgba(2,5,15,.24)';ctx.fillRect(w*.18,h*.12,w*.64,h*.76);
}
function particles(t){
 for(const p of dust){const x=(p.x*w+Math.sin(t*.00006+p.p)*16+w)%w,y=(p.y*h+Math.cos(t*.00005+p.p)*12+h)%h,a=.08+.08*Math.sin(t*.0008+p.p),col=p.v===2?'255,82,202':p.v===1?'168,110,255':'79,218,255';ctx.fillStyle=`rgba(${col},${Math.max(.025,a)})`;ctx.beginPath();ctx.arc(x,y,p.r,0,TAU);ctx.fill();}
}
function helix(t,cx,cy,S,turns,phase,tilt,alpha){
 const n=mobile?34:44,A=[],B=[];phase+=t*.000055;for(let i=0;i<=n;i++){const u=i/n,a=u*turns*TAU+phase,x=(u-.5)*2.25*S,r=.22*S,y1=Math.cos(a)*r,y2=-y1,z1=Math.sin(a),z2=-z1;const ct=Math.cos(tilt),st=Math.sin(tilt);A.push({x:cx+x*ct-y1*st,y:cy+x*st+y1*ct,z:z1});B.push({x:cx+x*ct-y2*st,y:cy+x*st+y2*ct,z:z2});}
 ctx.lineCap='round';ctx.lineJoin='round';
 function rail(arr,col){ctx.beginPath();for(let i=0;i<arr.length;i++){const p=arr[i];i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle=col;ctx.lineWidth=2.1;ctx.stroke();}
 rail(A,`rgba(84,224,255,${alpha})`);rail(B,`rgba(170,108,255,${alpha*.88})`);
 for(let i=0;i<=n;i+=4){const p=A[i],q=B[i];ctx.strokeStyle=`rgba(182,244,255,${alpha*.45})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillStyle=`rgba(220,253,255,${alpha*.75})`;ctx.beginPath();ctx.arc(p.x,p.y,1.5+(p.z+1)*.7,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(q.x,q.y,1.5+(q.z+1)*.7,0,TAU);ctx.fill();}
}
function molecules(t){
 for(const m of mols){const cx=(m.x*w+Math.sin(t*.00004+m.p)*22+w)%w,cy=(m.y*h+Math.cos(t*.000035+m.p)*16+h)%h,S=Math.min(w,h)*m.s,ang=t*m.spin+m.p,ca=Math.cos(ang),sa=Math.sin(ang),pts=m.a.map(a=>({x:cx+(a.x*ca-a.y*sa)*S,y:cy+(a.x*sa+a.y*ca)*S}));ctx.strokeStyle='rgba(103,196,255,.15)';ctx.lineWidth=1;for(let i=1;i<pts.length;i++){ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();}for(let i=0;i<pts.length;i++){ctx.fillStyle=i%3===0?'rgba(178,111,255,.50)':'rgba(74,225,255,.58)';ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,2.5,0,TAU);ctx.fill();}}
}
function makeArc(t){
 const side=rnd();let ax,ay,bx,by;if(side<.55){ax=rnd()*w;ay=rnd()*h;bx=rnd()*w;by=rnd()*h;}else{ax=rnd()<.5?4:w-4;ay=rnd()*h;bx=w*(.25+rnd()*.5);by=h*(.2+rnd()*.6);}const d=Math.hypot(bx-ax,by-ay);if(d<90||d>Math.max(w,h)*.75)return;arcs.push({ax,ay,bx,by,start:t,dur:700+rnd()*800,v:rnd()>.55,seed:Math.floor(rnd()*1e7)});
}
function electric(a,t){
 const p=(t-a.start)/a.dur;if(p<0||p>1)return;const fade=Math.sin(Math.PI*p);let s=a.seed>>>0;const R=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};const dx=a.bx-a.ax,dy=a.by-a.ay,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,n=8,pts=[];for(let i=0;i<=n;i++){const u=i/n,j=(i===0||i===n)?0:(R()-.5)*(10+L*.025);pts.push({x:a.ax+dx*u+nx*j,y:a.ay+dy*u+ny*j});}
 for(const [lw,al] of [[3.6,.12],[1.1,.78]]){ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.strokeStyle=a.v?`rgba(181,119,255,${al*fade})`:`rgba(150,244,255,${al*fade})`;ctx.lineWidth=lw;ctx.stroke();}
}
function draw(t){
 if(!running)return;raf=requestAnimationFrame(draw);if(t-last<frameMs)return;last=t;
 background();particles(t);
 const s=Math.min(w,h);helix(t,w*.72+Math.sin(t*.000025)*w*.025,h*.27,s*(mobile?1.25:1.08),2.2,.5,-.18,.48);helix(t,w*.13+Math.cos(t*.000019)*w*.02,h*.82,s*(mobile?.88:.78),1.75,2.4,.22,.25);if(!mobile&&!weak)helix(t,w*1.02,h*.70,s*.60,1.4,4.2,-.08,.16);
 molecules(t);
 if(!reduced&&t>=nextArc){makeArc(t);nextArc=t+2200+rnd()*3200;}
 for(let i=arcs.length-1;i>=0;i--){if(t-arcs[i].start>arcs[i].dur){arcs.splice(i,1);continue;}electric(arcs[i],t);}
}
function start(){if(running)return;running=true;last=0;raf=requestAnimationFrame(draw)}function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0}
function boot(){install();resize();if(reduced){running=true;draw(performance.now());stop()}else start();addEventListener('resize',()=>{clearTimeout(window.__bioResizeTimer);window.__bioResizeTimer=setTimeout(resize,180)},{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stop():(!reduced&&start()));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();