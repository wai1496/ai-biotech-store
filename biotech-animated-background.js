/* AI BioTech — BiotechAnimatedBackground (performance edition)
   Fixed Canvas background, no dependencies, pointer-events:none.
   Tuned for smooth mobile/tablet/desktop rendering.
*/
(function(){
'use strict';
if(window.__AIBioTechAnimatedBackground)return;
window.__AIBioTechAnimatedBackground=true;

const TAU=Math.PI*2;
const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const mobile=Math.min(innerWidth,innerHeight)<760;
const lowPower=!!((navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4));
const targetFPS=reduced?1:(mobile||lowPower?24:30);
const frameInterval=1000/targetFPS;
const dprCap=mobile||lowPower?1:1.25;
let seed=0xA1B10EEC;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

let canvas,ctx,w=1,h=1,dpr=1,running=false,raf=0,lastFrame=0,nextArc=0;
let particles=[],molecules=[],arcs=[];

function install(){
  canvas=document.createElement('canvas');
  canvas.className='biotech-animated-background';
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block;contain:strict;';
  document.body.insertBefore(canvas,document.body.firstChild);
  ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  const s=document.createElement('style');
  s.id='biotech-animated-background-style';
  s.textContent='html{background:#050812!important}body{background:transparent!important;overflow-x:hidden;isolation:isolate}.scene{display:none!important}.biotech-animated-background{background:#050812}';
  document.head.appendChild(s);
}

function resize(){
  w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);dpr=Math.min(devicePixelRatio||1,dprCap);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  build();
}

function build(){
  particles=[];molecules=[];arcs=[];
  const pc=mobile?28:(lowPower?38:56);
  for(let i=0;i<pc;i++)particles.push({x:rnd(),y:rnd(),r:.5+rnd()*1.5,s:.4+rnd()*.8,p:rnd()*TAU,c:rnd()>.84?'p':rnd()>.55?'v':'c'});
  const mc=mobile?4:(lowPower?5:7);
  for(let i=0;i<mc;i++)molecules.push({x:rnd(),y:rnd(),z:.8+rnd()*1.5,scale:.06+rnd()*.06,rx:rnd()*TAU,ry:rnd()*TAU,spd:(rnd()-.5)*.00035,phase:rnd()*TAU});
  nextArc=performance.now()+1400+rnd()*2200;
}

function background(){
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#050812');g.addColorStop(.55,'#070b17');g.addColorStop(1,'#040710');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const spots=[[.78,.2,.44,'0,170,255',.11],[.16,.78,.36,'118,62,255',.09]];
  for(const s of spots){const r=Math.max(w,h)*s[2],rg=ctx.createRadialGradient(w*s[0],h*s[1],0,w*s[0],h*s[1],r);rg.addColorStop(0,`rgba(${s[3]},${s[4]})`);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(w*s[0]-r,h*s[1]-r,r*2,r*2)}
}

function drawHelix(t,idx){
  const cfg=mobile?
    [{cx:.72,cy:.28,scale:1.34,turns:2.15,phase:.4,speed:.000045,tilt:.20},{cx:.18,cy:.82,scale:.92,turns:1.75,phase:2.8,speed:-.000032,tilt:-.18}]:
    [{cx:.72,cy:.28,scale:1.18,turns:2.2,phase:.4,speed:.000040,tilt:.18},{cx:.20,cy:.80,scale:.84,turns:1.8,phase:2.7,speed:-.000030,tilt:-.16},{cx:1.03,cy:.70,scale:.62,turns:1.5,phase:4.5,speed:.000024,tilt:.24}];
  const o=cfg[idx],S=Math.min(w,h)*o.scale,cx=w*o.cx+Math.sin(t*.00002+o.phase)*w*.025,cy=h*o.cy+Math.cos(t*.000017+o.phase)*h*.025;
  const n=mobile?34:44,phase=t*o.speed*TAU+o.phase,A=[],B=[];
  for(let i=0;i<=n;i++){
    const u=i/n,a=u*o.turns*TAU+phase,x=(u-.5)*2.05*S,r=.23*S;
    const y1=Math.cos(a)*r,z1=Math.sin(a)*r,y2=-y1,z2=-z1;
    const rot=o.tilt,ca=Math.cos(rot),sa=Math.sin(rot);
    const px=x*ca-z1*sa,pz=x*sa+z1*ca,px2=x*ca-z2*sa,pz2=x*sa+z2*ca;
    const k1=1/(1.25+pz/S),k2=1/(1.25+pz2/S);
    A.push({x:cx+px*k1,y:cy+y1*k1,k:k1});B.push({x:cx+px2*k2,y:cy+y2*k2,k:k2});
  }
  function rail(arr,color){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';for(let i=1;i<arr.length;i++){const p=arr[i-1],q=arr[i],k=(p.k+q.k)/2;ctx.strokeStyle=color==='c'?`rgba(88,221,255,${.20+.25*k})`:`rgba(163,105,255,${.16+.22*k})`;ctx.lineWidth=1.2+2.2*k;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}ctx.restore()}
  rail(A,'c');rail(B,'v');
  ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<=n;i+=5){const p=A[i],q=B[i];ctx.strokeStyle='rgba(185,244,255,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}ctx.restore();
}

function drawParticles(t){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const p of particles){const x=(p.x*w+Math.sin(t*.00005+p.p)*12*p.s+w)%w,y=(p.y*h+Math.cos(t*.00004+p.p)*10*p.s+h)%h,a=.05+.09*(.5+.5*Math.sin(t*.0005+p.p)),rgb=p.c==='p'?'255,80,195':p.c==='v'?'160,110,255':'75,220,255';ctx.fillStyle=`rgba(${rgb},${a})`;ctx.beginPath();ctx.arc(x,y,p.r,0,TAU);ctx.fill()}
  ctx.restore();
}

function drawMolecules(t){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const m of molecules){const cx=(m.x*w+Math.sin(t*.00003+m.phase)*18+w)%w,cy=(m.y*h+Math.cos(t*.000025+m.phase)*16+h)%h,s=Math.min(w,h)*m.scale,a=m.rx+t*m.spd;const pts=[];for(let i=0;i<5;i++){const ang=a+i*TAU/5,rr=s*(.28+(i%2)*.12);pts.push({x:cx+Math.cos(ang)*rr,y:cy+Math.sin(ang)*rr})}ctx.strokeStyle='rgba(94,185,255,.13)';ctx.lineWidth=1;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}for(const p of pts){ctx.fillStyle='rgba(130,230,255,.32)';ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,TAU);ctx.fill()}}
  ctx.restore();
}

function spawnArc(t){
  const a={x:rnd()*w,y:rnd()*h},b={x:rnd()*w,y:rnd()*h};
  if(Math.hypot(b.x-a.x,b.y-a.y)<90)return;
  arcs.push({a,b,start:t,dur:500+rnd()*650,v:rnd()>.55,seed:Math.floor(rnd()*1e9)});
}
function drawArc(o,t){
  const p=clamp((t-o.start)/o.dur,0,1),fade=Math.sin(Math.PI*p);let s=o.seed>>>0;const R=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
  const dx=o.b.x-o.a.x,dy=o.b.y-o.a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,n=7,pts=[];
  for(let i=0;i<=n;i++){const u=i/n,j=(i===0||i===n)?0:(R()-.5)*18*Math.sin(Math.PI*u);pts.push({x:o.a.x+dx*u+nx*j,y:o.a.y+dy*u+ny*j})}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=o.v?`rgba(185,120,255,${.70*fade})`:`rgba(150,245,255,${.78*fade})`;ctx.lineWidth=1.2;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.restore();
}

function frame(t){
  if(!running)return;
  if(t-lastFrame<frameInterval){raf=requestAnimationFrame(frame);return}
  lastFrame=t;
  background();drawParticles(t);
  const helixCount=mobile?2:3;for(let i=0;i<helixCount;i++)drawHelix(t,i);
  drawMolecules(t);
  if(!reduced&&t>=nextArc){spawnArc(t);nextArc=t+1700+rnd()*3000}
  for(let i=arcs.length-1;i>=0;i--){const o=arcs[i];if(t-o.start>o.dur){arcs.splice(i,1);continue}drawArc(o,t)}
  raf=requestAnimationFrame(frame);
}
function start(){if(running)return;running=true;lastFrame=0;raf=requestAnimationFrame(frame)}
function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0}
function boot(){install();resize();if(reduced){running=true;frame(performance.now());stop()}else start();addEventListener('resize',()=>{clearTimeout(window.__bioResizeTimer);window.__bioResizeTimer=setTimeout(resize,180)},{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stop():(!reduced&&start()))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();