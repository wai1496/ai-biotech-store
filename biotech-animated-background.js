/* AI BioTech — BiotechAnimatedBackground
   Global reusable animated biotech background for live website pages.
   Fixed Canvas, no dependencies, no pointer events, no page-layout mutation.
   Reuse with: <script src="/biotech-animated-background.js" defer></script>
*/
(function(){
'use strict';
if(window.__AIBioTechAnimatedBackground)return;
window.__AIBioTechAnimatedBackground=true;

const TAU=Math.PI*2;
const reduced=!!(matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const mobile=Math.min(innerWidth,innerHeight)<760;
const weak=!!((navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4));
const quality=reduced?0.34:((mobile||weak)?0.62:1);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let seed=0xA1B10EEC;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}

let canvas,ctx,w=1,h=1,dpr=1,running=false,raf=0,nextArc=0;
const helices=[],molecules=[],particles=[],anchors=[],arcs=[],pulses=[];

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
  w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);
  dpr=Math.min(devicePixelRatio||1,quality<.8?1.25:1.65);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);build();
}

function build(){
  helices.length=molecules.length=particles.length=anchors.length=arcs.length=pulses.length=0;
  const cfg=mobile?[
    {cx:.66,cy:.24,s:1.42,turns:2.3,yaw:.44,pitch:-.2,roll:.1,z:1.10,spd:.000045,phase:.4,drift:.05},
    {cx:.15,cy:.80,s:.97,turns:1.85,yaw:-.4,pitch:.27,roll:-.2,z:1.55,spd:-.000033,phase:2.6,drift:.04}
  ]:[
    {cx:.69,cy:.24,s:1.22,turns:2.35,yaw:.38,pitch:-.21,roll:.08,z:1.08,spd:.000041,phase:.4,drift:.045},
    {cx:.18,cy:.78,s:.91,turns:1.9,yaw:-.42,pitch:.25,roll:-.19,z:1.52,spd:-.000032,phase:2.5,drift:.035},
    {cx:1.02,cy:.72,s:.70,turns:1.55,yaw:.62,pitch:.1,roll:.25,z:1.85,spd:.000026,phase:4.7,drift:.03}
  ];
  cfg.forEach(x=>helices.push(x));

  const mc=Math.max(5,Math.round((mobile?7:11)*quality));
  for(let i=0;i<mc;i++){
    const atoms=[],n=4+Math.floor(rnd()*4),bonds=[];
    for(let j=0;j<n;j++)atoms.push({x:(rnd()-.5)*1.7,y:(rnd()-.5)*1.35,z:(rnd()-.5)*1.4,v:rnd()>.72});
    for(let j=1;j<n;j++)bonds.push([j-1,j]);if(n>5)bonds.push([0,Math.floor(n/2)]);
    molecules.push({x:rnd(),y:rnd(),z:.75+rnd()*1.9,scale:(mobile?.13:.09)+rnd()*(mobile?.13:.11),vx:(rnd()-.5)*.0000027,vy:(rnd()-.5)*.0000023,rx:rnd()*TAU,ry:rnd()*TAU,rz:rnd()*TAU,sx:(rnd()-.5)*.000045,sy:(rnd()-.5)*.00005,sz:(rnd()-.5)*.00004,phase:rnd()*TAU,atoms,bonds});
  }

  const pc=Math.max(44,Math.round((mobile?82:150)*quality));
  for(let i=0;i<pc;i++)particles.push({x:rnd(),y:rnd(),z:rnd(),r:.4+rnd()*2.1,vx:(rnd()-.5)*.0000035,vy:(rnd()-.5)*.0000027,phase:rnd()*TAU,h:rnd()>.86?'p':(rnd()>.55?'v':'c')});
  nextArc=performance.now()+700+rnd()*1100;
}

function rot(p,ax,ay,az){let{x,y,z}=p,c=Math.cos(ax),s=Math.sin(ax);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ay);s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(az);s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];return{x,y,z}}
function proj(p,cx,cy,S,depth){const f=S*2.25,zz=p.z+depth*S,k=f/Math.max(f*.28,f+zz);return{x:cx+p.x*k,y:cy+p.y*k,k}}

function atmosphere(){
  let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#050812');g.addColorStop(.52,'#070c19');g.addColorStop(1,'#040710');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(const q of [[.78,.18,.50,'0,180,255',.13],[.18,.76,.42,'112,52,255',.11],[.57,.52,.35,'38,70,160',.07]]){const r=Math.max(w,h)*q[2],rg=ctx.createRadialGradient(w*q[0],h*q[1],0,w*q[0],h*q[1],r);rg.addColorStop(0,`rgba(${q[3]},${q[4]})`);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(w*q[0]-r,h*q[1]-r,r*2,r*2)}
  const m=ctx.createRadialGradient(w*.5,h*.46,0,w*.5,h*.46,Math.max(w,h)*.58);m.addColorStop(0,'rgba(1,5,14,.46)');m.addColorStop(.55,'rgba(1,5,14,.18)');m.addColorStop(1,'rgba(0,0,0,.47)');ctx.fillStyle=m;ctx.fillRect(0,0,w,h);
}

function dust(t){ctx.save();ctx.globalCompositeOperation='lighter';for(const p of particles){p.x=(p.x+p.vx*16+1)%1;p.y=(p.y+p.vy*16+1)%1;const x=(p.x*w+Math.sin(t*.00007+p.phase)*18*(.5+p.z)+w)%w,y=(p.y*h+Math.cos(t*.00005+p.phase)*14*(.5+p.z)+h)%h,r=p.r*(.7+p.z*1.5),a=.035+.13*p.z*(.5+.5*Math.sin(t*.0009+p.phase)),rgb=p.h==='p'?'255,74,196':(p.h==='v'?'157,101,255':'68,216,255');ctx.fillStyle=`rgba(${rgb},${a})`;ctx.shadowColor=`rgba(${rgb},.45)`;ctx.shadowBlur=r*5;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}ctx.restore()}

function helix(o,t,index){
  const S=Math.min(w,h)*o.s,cx=w*o.cx+Math.sin(t*.000035+o.phase)*w*o.drift,cy=h*o.cy+Math.cos(t*.000028+o.phase)*h*o.drift,phase=t*o.spd*TAU+o.phase,n=Math.max(56,Math.round(94*quality)),A=[],B=[];
  for(let i=0;i<=n;i++){const u=i/n,a=u*o.turns*TAU+phase,x=(u-.5)*2.25*S,r=.24*S*(.92+.08*Math.sin(u*TAU*2+o.phase)),ax=o.pitch+.05*Math.sin(t*.000018),ay=o.yaw+.04*Math.cos(t*.000015);A.push(proj(rot({x,y:Math.cos(a)*r,z:Math.sin(a)*r},ax,ay,o.roll),cx,cy,S,o.z));B.push(proj(rot({x,y:Math.cos(a+Math.PI)*r,z:Math.sin(a+Math.PI)*r},ax,ay,o.roll),cx,cy,S,o.z))}
  function rail(arr,v){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';for(let i=1;i<arr.length;i++){const p=arr[i-1],q=arr[i],d=clamp((p.k+q.k)*.5,.35,1.35),a=.18+.34*d;ctx.strokeStyle=v?`rgba(170,119,255,${a*.78})`:`rgba(106,230,255,${a})`;ctx.shadowColor=v?'#955eff':'#35dfff';ctx.shadowBlur=13*d;ctx.lineWidth=1.25+2.9*d;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}ctx.restore()}
  rail(A,false);rail(B,true);
  ctx.save();ctx.globalCompositeOperation='lighter';const step=Math.max(5,Math.round(7/quality));for(let i=0;i<=n;i+=step){const p=A[i],q=B[i],a=.09+.26*clamp((p.k+q.k)*.5,.35,1.35);ctx.strokeStyle=`rgba(182,244,255,${a})`;ctx.shadowColor='#55e8ff';ctx.shadowBlur=8;ctx.lineWidth=1.1+1.2*p.k;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();for(const d of[p,q]){ctx.fillStyle='rgba(225,253,255,.70)';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(d.x,d.y,1.6+3.2*d.k,0,TAU);ctx.fill()}if(i%(step*2)===0)anchors.push({x:(p.x+q.x)/2,y:(p.y+q.y)/2,type:'d',index})}ctx.restore();
}

function molecule(m,t,index){
  m.x=(m.x+m.vx*16+1.16)%1.16;m.y=(m.y+m.vy*16+1.16)%1.16;
  const cx=(m.x-.08)*w+Math.sin(t*.000045+m.phase)*28,cy=(m.y-.08)*h+Math.cos(t*.000038+m.phase)*22,S=Math.min(w,h)*m.scale*(.82+.18*Math.sin(t*.00012+m.phase)),assemble=.64+.36*(.5+.5*Math.sin(t*.00021+m.phase)),pts=m.atoms.map(a=>({...proj(rot({x:a.x*S*assemble,y:a.y*S*assemble,z:a.z*S*assemble},m.rx+t*m.sx,m.ry+t*m.sy,m.rz+t*m.sz),cx,cy,S,m.z),a}));
  ctx.save();ctx.globalCompositeOperation='lighter';for(const b of m.bonds){const p=pts[b[0]],q=pts[b[1]];ctx.strokeStyle='rgba(116,206,255,.15)';ctx.shadowColor='#556dff';ctx.shadowBlur=7;ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}
  for(let i=0;i<pts.length;i++){const p=pts[i],r=(4+8*p.k)*(mobile?.9:1),g=ctx.createRadialGradient(p.x-r*.25,p.y-r*.25,0,p.x,p.y,r);g.addColorStop(0,'rgba(245,254,255,.96)');g.addColorStop(.3,p.a.v?'rgba(177,113,255,.85)':'rgba(64,225,255,.86)');g.addColorStop(1,'rgba(20,40,105,.03)');ctx.fillStyle=g;ctx.shadowColor=p.a.v?'#a155ff':'#32dfff';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();if(i===0||i===pts.length-1)anchors.push({x:p.x,y:p.y,type:'m',index})}ctx.restore();
}

function edge(){const s=Math.floor(rnd()*4);if(s===0)return{x:rnd()*w,y:4,type:'e'};if(s===1)return{x:w-4,y:rnd()*h,type:'e'};if(s===2)return{x:rnd()*w,y:h-4,type:'e'};return{x:4,y:rnd()*h,type:'e'}}
function spawn(t){if(anchors.length<4)return;const D=anchors.filter(a=>a.type==='d'),M=anchors.filter(a=>a.type==='m');let a,b,r=rnd();if(r<.48&&D.length&&M.length){a=M[Math.floor(rnd()*M.length)];b=D[Math.floor(rnd()*D.length)]}else if(r<.72&&M.length>1){a=M[Math.floor(rnd()*M.length)];b=M[Math.floor(rnd()*M.length)]}else if(r<.88){a=anchors[Math.floor(rnd()*anchors.length)];b=edge()}else{a=anchors[Math.floor(rnd()*anchors.length)];b=anchors[Math.floor(rnd()*anchors.length)]}if(!a||!b)return;const dist=Math.hypot(b.x-a.x,b.y-a.y);if(dist<70||dist>Math.max(w,h)*.82)return;const duration=700+rnd()*1250;arcs.push({a:{...a},b:{...b},start:t,duration,seed:Math.floor(rnd()*1e9),v:rnd()>.58});pulses.push({x:a.x,y:a.y,start:t,duration:900,c:rnd()>.55?'v':'c'});pulses.push({x:b.x,y:b.y,start:t+duration*.42,duration:950,c:rnd()>.55?'v':'c'})}

function arc(o,t){const p=clamp((t-o.start)/o.duration,0,1),fade=Math.sin(Math.PI*p);let s=o.seed>>>0;const R=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296},dx=o.b.x-o.a.x,dy=o.b.y-o.a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,n=10+Math.floor(L/70),pts=[];for(let i=0;i<=n;i++){const u=i/n,j=(i===0||i===n)?0:(R()-.5)*(13+L*.035)*Math.sin(Math.PI*u);pts.push({x:o.a.x+dx*u+nx*j,y:o.a.y+dy*u+ny*j})}ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';for(const l of[[6,.07],[2.3,.35],[.72,.95]]){ctx.strokeStyle=o.v?`rgba(183,120,255,${l[1]*fade})`:`rgba(149,243,255,${l[1]*fade})`;ctx.shadowColor=o.v?'#a45dff':'#58eaff';ctx.shadowBlur=l[0]>3?20:10;ctx.lineWidth=l[0];ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke()}if(pts.length>5){const m=pts[2+Math.floor(R()*(pts.length-4))],len=22+R()*50,ang=Math.atan2(dy,dx)+(R()>.5?1:-1)*(1+R()*.7);ctx.lineWidth=.8;ctx.strokeStyle=o.v?`rgba(210,171,255,${.65*fade})`:`rgba(198,250,255,${.68*fade})`;ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x+Math.cos(ang)*len,m.y+Math.sin(ang)*len);ctx.stroke()}ctx.restore()}
function pulse(q,t){const p=clamp((t-q.start)/q.duration,0,1),a=Math.sin(Math.PI*p),r=8+p*28;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=q.c==='v'?`rgba(184,120,255,${a*.46})`:`rgba(112,237,255,${a*.52})`;ctx.shadowColor=q.c==='v'?'#a65cff':'#44e7ff';ctx.shadowBlur=14;ctx.lineWidth=1.35;ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.stroke();ctx.restore()}

function frame(t){if(!running)return;anchors.length=0;atmosphere();dust(t);helices.forEach((x,i)=>helix(x,t,i));molecules.forEach((x,i)=>molecule(x,t,i));if(!reduced&&t>=nextArc){spawn(t);nextArc=t+900+rnd()*2300}for(let i=arcs.length-1;i>=0;i--){const o=arcs[i];if(t-o.start>o.duration){arcs.splice(i,1);continue}arc(o,t)}for(let i=pulses.length-1;i>=0;i--){const q=pulses[i];if(t-q.start>q.duration){pulses.splice(i,1);continue}pulse(q,t)}raf=requestAnimationFrame(frame)}
function start(){if(running)return;running=true;raf=requestAnimationFrame(frame)}
function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0}
function boot(){install();resize();if(reduced){running=true;frame(performance.now());stop()}else start();addEventListener('resize',()=>{clearTimeout(window.__bioResizeTimer);window.__bioResizeTimer=setTimeout(resize,150)},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(!reduced)start()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
