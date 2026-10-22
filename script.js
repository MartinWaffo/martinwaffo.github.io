const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
  }));
}

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.publication').forEach(pub => {
      pub.classList.toggle('hidden', filter !== 'all' && pub.dataset.type !== filter);
    });
    document.querySelectorAll('.pub-group').forEach(group => {
      const visible = [...group.querySelectorAll('.publication')].some(p => !p.classList.contains('hidden'));
      group.style.display = visible ? '' : 'none';
    });
  });
});

document.getElementById('year').textContent = new Date().getFullYear();

// Animated network: a lightweight illustration of evolving communities.
(() => {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const communities = [
    {x:.26,y:.42, color:'#207a92'},
    {x:.69,y:.34, color:'#d58a32'},
    {x:.55,y:.73, color:'#648b55'}
  ];
  const nodes = Array.from({length:24}, (_,i) => ({
    home:i%3,
    phase:(i*1.91)%6.28,
    ring: .055 + (i%5)*.014,
    size: 3.7 + (i%4)*.55
  }));
  let w=0,h=0,dpr=1;
  function resize(){
    const r=canvas.getBoundingClientRect();
    dpr=Math.min(window.devicePixelRatio||1,2);
    w=Math.max(1,r.width); h=Math.max(1,r.height);
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function pos(n,t){
    const c=communities[n.home];
    const driftX=Math.sin(t*.00042+n.home*2.1)*.025;
    const driftY=Math.cos(t*.00036+n.home*1.5)*.020;
    let cx=c.x+driftX, cy=c.y+driftY;
    // Two bridge nodes periodically move toward a neighbouring community,
    // suggesting changing memberships without turning the graphic into a literal model.
    if(n===4 || n===17){
      const target=communities[(n.home+1)%3];
      const mix=(Math.sin(t*.00032+n.phase)+1)/2*.48;
      cx=cx*(1-mix)+target.x*mix;
      cy=cy*(1-mix)+target.y*mix;
    }
    const a=n.phase+t*.00017*(1+(n.home*.08));
    return {x:(cx+Math.cos(a)*n.ring)*w, y:(cy+Math.sin(a*1.08)*n.ring*.86)*h};
  }
  function draw(time=0){
    ctx.clearRect(0,0,w,h);
    const p=nodes.map(n=>pos(n,time));
    // soft community envelopes
    communities.forEach((c,j)=>{
      const gx=(c.x+Math.sin(time*.00042+j*2.1)*.025)*w;
      const gy=(c.y+Math.cos(time*.00036+j*1.5)*.020)*h;
      const grad=ctx.createRadialGradient(gx,gy,2,gx,gy,w*.18);
      const alpha=j===0?'32,122,146':j===1?'213,138,50':'100,139,85';
      grad.addColorStop(0,`rgba(${alpha},.13)`);grad.addColorStop(1,`rgba(${alpha},0)`);
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(gx,gy,w*.18,0,Math.PI*2);ctx.fill();
    });
    // intra-community links
    ctx.lineWidth=1;
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const same=nodes[i].home===nodes[j].home;
      const dx=p[i].x-p[j].x,dy=p[i].y-p[j].y,dist=Math.hypot(dx,dy);
      if((same && dist<w*.145) || (!same && ((i+j)%19===0) && dist<w*.34)){
        ctx.strokeStyle=same?'rgba(45,87,111,.22)':'rgba(45,87,111,.10)';
        ctx.beginPath();ctx.moveTo(p[i].x,p[i].y);ctx.lineTo(p[j].x,p[j].y);ctx.stroke();
      }
    }
    // a higher-order interaction pulse
    const tri=[2,8,14].map(i=>p[i]);
    ctx.fillStyle='rgba(93,93,155,.045)';ctx.strokeStyle='rgba(93,93,155,.18)';ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(tri[0].x,tri[0].y);ctx.lineTo(tri[1].x,tri[1].y);ctx.lineTo(tri[2].x,tri[2].y);ctx.closePath();ctx.fill();ctx.stroke();
    // nodes
    p.forEach((q,i)=>{
      ctx.beginPath();ctx.arc(q.x,q.y,nodes[i].size,0,Math.PI*2);
      ctx.fillStyle=communities[nodes[i].home].color;ctx.globalAlpha=.93;ctx.fill();ctx.globalAlpha=1;
      ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=1.2;ctx.stroke();
    });
  }
  function frame(t){draw(t);if(!reduceMotion)requestAnimationFrame(frame)}
  resize();
  if(reduceMotion) draw(1400); else requestAnimationFrame(frame);
  new ResizeObserver(()=>{resize(); if(reduceMotion) draw(1400)}).observe(canvas);
})();
