/* AI BioTech — BiotechAnimatedBackground
   Global fixed animated biotech atmosphere for live website pages.
   Optimized Canvas, no dependencies, pointer-events:none.
   Reuse on any page with: <script src="/biotech-animated-background.js" defer></script>
*/
(function(){
  'use strict';
  if (window.__AIBioTechAnimatedBackground) return;
  window.__AIBioTechAnimatedBackground = true;

  const TAU = Math.PI * 2;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 760;
  const weakDevice = !!((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  const quality = reduceMotion ? 0.35 : ((isMobile || weakDevice) ? 0.62 : 1);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

  let seed = 0xA1B10EEC;
  function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  let canvas, ctx, w=1, h=1, dpr=1, running=false, raf=0, nextArcAt=0;
  const helices=[], molecules=[], particles=[], anchors=[], arcs=[], pulses=[];

  function install(){
    canvas = document.createElement('canvas');
    canvas.className = 'biotech-animated-background';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none;display:block;contain:strict;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d', {alpha:false, desynchronized:true});

    const style = document.createElement('style');
    style.id = 'biotech-animated-background-style';
    style.textContent = `
      html{background:#050812!important}
      body{background:transparent!important;overflow-x:hidden}
      .scene{display:none!important}
      .biotech-animated-background{background:#050812}
      .frame,.utility,.top,.nav,.hero,.benefits,.cats,.section,.panels,.footer,.legal,.overlay,.drawer,main,header,nav,section,aside,dialog{position:relative;z-index:2}
    `;
    document.head.appendChild(style);
  }

  function resize(){
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, quality < 0.8 ? 1.25 : 1.65);
    canvas.width = Math.round(w*dpr);
    canvas.height = Math.round(h*dpr);
    canvas.style.width = w+'px';
    canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    buildScene();
  }

  function buildScene(){
    helices.length=0; molecules.length=0; particles.length=0; anchors.length=0; arcs.length=0; pulses.length=0;

    const configs = isMobile ? [
      {cx:.66,cy:.23,size:1.40,turns:2.25,yaw:.43,pitch:-.21,roll:.10,depth:1.12,speed:.000047,phase:.4,drift:.045},
      {cx:.15,cy:.79,size:.96,turns:1.85,yaw:-.40,pitch:.27,roll:-.19,depth:1.55,speed:-.000035,phase:2.6,drift:.035}
    ] : [
      {cx:.69,cy:.24,size:1.20,turns:2.35,yaw:.38,pitch:-.21,roll:.08,depth:1.10,speed:.000042,phase:.4,drift:.042},
      {cx:.18,cy:.77,size:.90,turns:1.90,yaw:-.42,pitch:.25,roll:-.19,depth:1.52,speed:-.000033,phase:2.5,drift:.033},
      {cx:1.02,cy:.72,size:.70,turns:1.55,yaw:.62,pitch:.10,roll:.25,depth:1.85,speed:.000027,phase:4.7,drift:.028}
    ];
    configs.forEach(c=>helices.push(c));

    const moleculeCount = Math.max(5, Math.round((isMobile ? 7 : 11) * quality));
    for(let i=0;i<moleculeCount;i++){
      const atoms=[];
      const n=4+Math.floor(rnd()*4);
      for(let j=0;j<n;j++) atoms.push({x:(rnd()-.5)*1.7,y:(rnd()-.5)*1.35,z:(rnd()-.5)*1.4,violet:rnd()>.72});
      const bonds=[];
      for(let j=1;j<n;j++) bonds.push([j-1,j]);
      if(n>5) bonds.push([0,Math.floor(n/2)]);
      molecules.push({
        x:rnd(), y:rnd(), z:.75+rnd()*1.9,
        scale:(isMobile?.13:.09)+rnd()*(isMobile?.13:.11),
        vx:(rnd()-.5)*.0000027, vy:(rnd()-.5)*.0000023,
        rx:rnd()*TAU, ry:rnd()*TAU, rz:rnd()*TAU,
        sx:(rnd()-.5)*.000045, sy:(rnd()-.5)*.000050, sz:(rnd()-.5)*.000040,
        phase:rnd()*TAU, atoms, bonds
      });
    }

    const particleCount = Math.max(44, Math.round((isMobile ? 82 : 150) * quality));
    for(let i=0;i<particleCount;i++) particles.push({
      x:rnd(), y:rnd(), z:rnd(), r:.4+rnd()*2.1,
      vx:(rnd()-.5)*.0000035, vy:(rnd()-.5)*.0000027,
      phase:rnd()*TAU, hue:rnd()>.86?'pink':(rnd()>.55?'violet':'cyan')
    });
    nextArcAt = performance.now() + 700 + rnd()*1100;
  }

  function rotate3(p, ax, ay, az){
    let x=p.x,y=p.y,z=p.z,c=Math.cos(ax),s=Math.sin(ax);
    [y,z]=[y*c-z*s,y*s+z*c];
    c=Math.cos(ay);s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];
    c=Math.cos(az);s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];
    return {x,y,z};
  }
  function project(p,cx,cy,scale,depth){
    const f=scale*2.25, zz=p.z+depth*scale, k=f/Math.max(f*.28,f+zz);
    return {x:cx+p.x*k,y:cy+p.y*k,k};
  }

  function drawAtmosphere(){
    let g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#050812'); g.addColorStop(.52,'#070c19'); g.addColorStop(1,'#040710');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

    const spots=[
      [.78,.18,.50,'0,180,255',.13],
      [.18,.76,.42,'112,52,255',.11],
      [.57,.52,.35,'38,70,160',.07]
    ];
    for(const s of spots){
      const r=Math.max(w,h)*s[2];
      const rg=ctx.createRadialGradient(w*s[0],h*s[1],0,w*s[0],h*s[1],r);
      rg.addColorStop(0,`rgba(${s[3]},${s[4]})`); rg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rg; ctx.fillRect(w*s[0]-r,h*s[1]-r,r*2,r*2);
    }

    /* readability mask keeps the content-heavy center dark */
    const mask=ctx.createRadialGradient(w*.5,h*.46,0,w*.5,h*.46,Math.max(w,h)*.58);
    mask.addColorStop(0,'rgba(1,5,14,.44)'); mask.addColorStop(.55,'rgba(1,5,14,.18)'); mask.addColorStop(1,'rgba(0,0,0,.47)');
    ctx.fillStyle=mask; ctx.fillRect(0,0,w,h);
  }

  function drawParticles(t){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(const p of particles){
      p.x=(p.x+p.vx*16+1)%1; p.y=(p.y+p.vy*16+1)%1;
      const x=(p.x*w+Math.sin(t*.00007+p.phase)*18*(.5+p.z)+w)%w;
      const y=(p.y*h+Math.cos(t*.00005+p.phase)*14*(.5+p.z)+h)%h;
      const r=p.r*(.7+p.z*1.5), a=.035+.13*p.z*(.5+.5*Math.sin(t*.0009+p.phase));
      const rgb=p.hue==='pink'?'255,74,196':(p.hue==='violet'?'157,101,255':'68,216,255');
      ctx.fillStyle=`rgba(${rgb},${a})`; ctx.shadowColor=`rgba(${rgb},.45)`; ctx.shadowBlur=r*5;
      ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  function drawHelix(o,t,index){
    const S=Math.min(w,h)*o.size;
    const cx=w*o.cx+Math.sin(t*.000035+o.phase)*w*o.drift;
    const cy=h*o.cy+Math.cos(t*.000028+o.phase)*h*o.drift;
    const phase=t*o.speed*TAU+o.phase;
    const n=Math.max(56,Math.round(94*quality)), A=[], B=[];

    for(let i=0;i<=n;i++){
      const u=i/n, angle=u*o.turns*TAU+phase, x=(u-.5)*2.25*S;
      const radius=.24*S*(.92+.08*Math.sin(u*TAU*2+o.phase));
      const ax=o.pitch+.05*Math.sin(t*.000018), ay=o.yaw+.04*Math.cos(t*.000015);
      const a=rotate3({x,y:Math.cos(angle)*radius,z:Math.sin(angle)*radius},ax,ay,o.roll);
      const b=rotate3({x,y:Math.cos(angle+Math.PI)*radius,z:Math.sin(angle+Math.PI)*radius},ax,ay,o.roll);
      A.push(project(a,cx,cy,S,o.depth)); B.push(project(b,cx,cy,S,o.depth));
    }

    function rail(arr,violet){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
      for(let i=1;i<arr.length;i++){
        const p=arr[i-1],q=arr[i],d=clamp((p.k+q.k)*.5,.35,1.35),alpha=.18+.34*d;
        ctx.strokeStyle=violet?`rgba(170,119,255,${alpha*.78})`:`rgba(106,230,255,${alpha})`;
        ctx.shadowColor=violet?'#955eff':'#35dfff';ctx.shadowBlur=13*d;ctx.lineWidth=1.25+2.9*d;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      }
      ctx.restore();
    }
    rail(A,false); rail(B,true);

    ctx.save();ctx.globalCompositeOperation='lighter';
    const step=Math.max(5,Math.round(7/quality));
    for(let i=0;i<=n;i+=step){
      const p=A[i],q=B[i],alpha=.09+.26*clamp((p.k+q.k)*.5,.35,1.35);
      ctx.strokeStyle=`rgba(182,244,255,${alpha})`;ctx.shadowColor='#55e8ff';ctx.shadowBlur=8;ctx.lineWidth=1.1+1.2*p.k;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      for(const d of [p,q]){ctx.fillStyle='rgba(225,253,255,.70)';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(d.x,d.y,1.6+3.2*d.k,0,TAU);ctx.fill();}
      if(i%(step*2)===0) anchors.push({x:(p.x+q.x)/2,y:(p.y+q.y)/2,type:'dna',helix:index});
    }
    ctx.restore();
  }

  function drawMolecule(m,t,index){
    m.x=(m.x+m.vx*16+1.16)%1.16; m.y=(m.y+m.vy*16+1.16)%1.16;
    const cx=(m.x-.08)*w+Math.sin(t*.000045+m.phase)*28;
    const cy=(m.y-.08)*h+Math.cos(t*.000038+m.phase)*22;
    const S=Math.min(w,h)*m.scale*(.82+.18*Math.sin(t*.00012+m.phase));
    const assemble=.64+.36*(.5+.5*Math.sin(t*.00021+m.phase));
    const pts=m.atoms.map(a=>{
      const r=rotate3({x:a.x*S*assemble,y:a.y*S*assemble,z:a.z*S*assemble},m.rx+t*m.sx,m.ry+t*m.sy,m.rz+t*m.sz);
      return {...project(r,cx,cy,S,m.z),atom:a};
    });

    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const b of m.bonds){
      const p=pts[b[0]],q=pts[b[1]];
      ctx.strokeStyle='rgba(116,206,255,.15)';ctx.shadowColor='#556dff';ctx.shadowBlur=7;ctx.lineWidth=1.15;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    }
    for(let i=0;i<pts.length;i++){
      const p=pts[i],r=(4+8*p.k)*(isMobile?.9:1);
      const gr=ctx.createRadialGradient(p.x-r*.25,p.y-r*.25,0,p.x,p.y,r);
      gr.addColorStop(0,'rgba(245,254,255,.96)');
      gr.addColorStop(.30,p.atom.violet?'rgba(177,113,255,.85)':'rgba(64,225,255,.86)');
      gr.addColorStop(1,'rgba(20,40,105,.03)');
      ctx.fillStyle=gr;ctx.shadowColor=p.atom.violet?'#a155ff':'#32dfff';ctx.shadowBlur=15;
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
      if(i===0||i===pts.length-1) anchors.push({x:p.x,y:p.y,type:'molecule',molecule:index});
    }
    ctx.restore();
  }

  function edgeAnchor(){
    const side=Math.floor(rnd()*4);
    if(side===0)return{x:rnd()*w,y:4,type:'edge'};
    if(side===1)return{x:w-4,y:rnd()*h,type:'edge'};
    if(side===2)return{x:rnd()*w,y:h-4,type:'edge'};
    return{x:4,y:rnd()*h,type:'edge'};
  }

  function spawnArc(t){
    if(anchors.length<4)return;
    const dna=anchors.filter(a=>a.type==='dna'), mol=anchors.filter(a=>a.type==='molecule');
    let a,b,r=rnd();
    if(r<.48&&dna.length&&mol.length){a=mol[Math.floor(rnd()*mol.length)];b=dna[Math.floor(rnd()*dna.length)];}
    else if(r<.72&&mol.length>1){a=mol[Math.floor(rnd()*mol.length)];b=mol[Math.floor(rnd()*mol.length)];}
    else if(r<.88){a=anchors[Math.floor(rnd()*anchors.length)];b=edgeAnchor();}
    else {a=anchors[Math.floor(rnd()*anchors.length)];b=anchors[Math.floor(rnd()*anchors.length)];}
    if(!a||!b)return;
    const dist=Math.hypot(b.x-a.x,b.y-a.y);
    if(dist<70||dist>Math.max(w,h)*.82)return;
    const duration=700+rnd()*1250;
    arcs.push({a:{...a},b:{...b},start:t,duration,seed:Math.floor(rnd()*1e9),violet:rnd()>.58});
    pulses.push({x:a.x,y:a.y,start:t,duration:900,color:rnd()>.55?'violet':'cyan'});
    pulses.push({x:b.x,y:b.y,start:t+duration*.42,duration:950,color:rnd()>.55?'violet':'cyan'});
  }

  function drawArc(o,t){
    const progress=clamp((t-o.start)/o.duration,0,1), fade=Math.sin(Math.PI*progress);
    let s=o.seed>>>0;const R=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
    const dx=o.b.x-o.a.x,dy=o.b.y-o.a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
    const n=10+Math.floor(L/70), pts=[];
    for(let i=0;i<=n;i++){
      const u=i/n, jitter=(i===0||i===n)?0:(R()-.5)*(13+L*.035)*Math.sin(Math.PI*u);
      pts.push({x:o.a.x+dx*u+nx*jitter,y:o.a.y+dy*u+ny*jitter});
    }
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
    for(const layer of [[6,.07],[2.3,.35],[.72,.95]]){
      ctx.strokeStyle=o.violet?`rgba(183,120,255,${layer[1]*fade})`:`rgba(149,243,255,${layer[1]*fade})`;
      ctx.shadowColor=o.violet?'#a45dff':'#58eaff';ctx.shadowBlur=layer[0]>3?20:10;ctx.lineWidth=layer[0];
      ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    }
    if(pts.length>5){
      const mid=pts[2+Math.floor(R()*(pts.length-4))],len=22+R()*50,ang=Math.atan2(dy,dx)+(R()>.5?1:-1)*(1+R()*.7);
      ctx.lineWidth=.8;ctx.strokeStyle=o.violet?`rgba(210,171,255,${.65*fade})`:`rgba(198,250,255,${.68*fade})`;
      ctx.beginPath();ctx.moveTo(mid.x,mid.y);ctx.lineTo(mid.x+Math.cos(ang)*len,mid.y+Math.sin(ang)*len);ctx.stroke();
    }
    ctx.restore();
  }

  function drawPulse(q,t){
    const p=clamp((t-q.start)/q.duration,0,1), a=Math.sin(Math.PI*p), r=8+p*28;
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle=q.color==='violet'?`rgba(184,120,255,${a*.46})`:`rgba(112,237,255,${a*.52})`;
    ctx.shadowColor=q.color==='violet'?'#a65cff':'#44e7ff';ctx.shadowBlur=14;ctx.lineWidth=1.35;
    ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.stroke();ctx.restore();
  }

  function drawFrame(t){
    if(!running)return;
    anchors.length=0;
    drawAtmosphere();drawParticles(t);
    helices.forEach((x,i)=>drawHelix(x,t,i));
    molecules.forEach((x,i)=>drawMolecule(x,t,i));

    if(!reduceMotion&&t>=nextArcAt){spawnArc(t);nextArcAt=t+900+rnd()*2300;}
    for(let i=arcs.length-1;i>=0;i--){const o=arcs[i];if(t-o.start>o.duration){arcs.splice(i,1);continue;}drawArc(o,t);}
    for(let i=pulses.length-1;i>=0;i--){const q=pulses[i];if(t-q.start>q.duration){pulses.splice(i,1);continue;}drawPulse(q,t);}
    raf=requestAnimationFrame(drawFrame);
  }

  function start(){if(running)return;running=true;raf=requestAnimationFrame(drawFrame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;}

  function boot(){
    install();resize();
    if(reduceMotion){running=true;drawFrame(performance.now());stop();}
    else start();
    window.addEventListener('resize',()=>{clearTimeout(window.__bioResizeTimer);window.__bioResizeTimer=setTimeout(resize,150);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(!reduceMotion)start();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
