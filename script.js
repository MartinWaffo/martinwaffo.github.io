(() => {
  // Navigation, publication filters and footer year
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const filters = [...document.querySelectorAll('.filter')];
  const pubs = [...document.querySelectorAll('.publication')];
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.filter;
    pubs.forEach(pub => pub.classList.toggle('hidden', type !== 'all' && pub.dataset.type !== type));
  }));

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Dynamic-community hero animation.
  // The animation is deliberately deterministic-ish and lightweight: no library, no data collection.
  const canvas = document.querySelector('#community-network');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  const palette = [
    {fill:'#168a90', glow:'rgba(35,154,154,.23)', edge:'rgba(35,154,154,.33)'},
    {fill:'#d95b42', glow:'rgba(230,107,79,.20)', edge:'rgba(230,107,79,.31)'},
    {fill:'#cf941c', glow:'rgba(225,167,46,.22)', edge:'rgba(225,167,46,.32)'},
    {fill:'#4779c7', glow:'rgba(71,121,199,.14)', edge:'rgba(71,121,199,.20)'}
  ];

  const nodes = [];
  const edges = [];
  const counts = [11, 10, 9];

  function rand(min, max) { return min + Math.random() * (max - min); }
  function build() {
    nodes.length = 0; edges.length = 0;
    counts.forEach((count, community) => {
      for (let i=0;i<count;i++) {
        nodes.push({
          community,
          baseCommunity: community,
          angle: rand(0, Math.PI*2),
          radius: rand(35, 120),
          speed: rand(.00012,.00028) * (Math.random()>.5?1:-1),
          phase: rand(0, Math.PI*2),
          size: rand(3.8, 7.2),
          x:0,y:0,
          bridge: false
        });
      }
    });
    // A few semantic bridge/overlap nodes.
    [5, 13, 24].forEach((idx, j) => { if(nodes[idx]) { nodes[idx].bridge = true; nodes[idx].size += 2; nodes[idx].bridgeTo=(j+1)%3; } });

    // Dense within-community edges + sparse inter-community bridges.
    for (let i=0;i<nodes.length;i++) {
      for (let j=i+1;j<nodes.length;j++) {
        const same = nodes[i].community === nodes[j].community;
        const p = same ? 0.28 : 0.018;
        if (Math.random() < p) edges.push({a:i,b:j,cross:!same,phase:rand(0,Math.PI*2)});
      }
    }
    // Guarantee bridges that tell the overlapping-community story.
    [[5,13],[13,24],[5,24]].forEach(([a,b]) => edges.push({a,b,cross:true,phase:rand(0,Math.PI*2),special:true}));
  }
  build();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize', resize, {passive:true});

  function centers(t) {
    const right = w > 900 ? 0.76 : 0.58;
    const spread = Math.min(w,h);
    return [
      {x:w*(right-.16)+Math.sin(t*.00016)*spread*.035, y:h*.36+Math.cos(t*.00018)*spread*.045},
      {x:w*(right+.10)+Math.cos(t*.00014)*spread*.045, y:h*.37+Math.sin(t*.00017)*spread*.04},
      {x:w*(right-.01)+Math.sin(t*.00013+2)*spread*.04, y:h*.68+Math.cos(t*.00015+1)*spread*.038}
    ];
  }

  function nodePosition(n, t, cs) {
    const c = cs[n.baseCommunity];
    const pulse = 1 + .10*Math.sin(t*.0007+n.phase);
    let x = c.x + Math.cos(n.angle + t*n.speed)*n.radius*pulse;
    let y = c.y + Math.sin(n.angle + t*n.speed*1.18)*n.radius*.68*pulse;

    // Bridge nodes smoothly drift toward a second community and back.
    if (n.bridge) {
      const other = cs[n.bridgeTo];
      const mix = .26 + .20*(.5+.5*Math.sin(t*.00042+n.phase));
      x = x*(1-mix)+other.x*mix;
      y = y*(1-mix)+other.y*mix;
    }
    n.x=x; n.y=y;
  }

  function drawHull(c, color, rx, ry) {
    const g = ctx.createRadialGradient(c.x,c.y,5,c.x,c.y,rx);
    g.addColorStop(0,color.glow.replace(/\.\d+\)$/,'.19)'));
    g.addColorStop(.62,color.glow);
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.save(); ctx.translate(c.x,c.y); ctx.scale(1,ry/rx); ctx.beginPath(); ctx.arc(0,0,rx,0,Math.PI*2); ctx.restore(); ctx.fillStyle=g; ctx.fill();
  }

  function animate(t) {
    ctx.clearRect(0,0,w,h);
    const cs = centers(t);

    // Soft community regions make the community structure legible at a glance.
    const r = Math.max(105, Math.min(175, h*.25));
    cs.forEach((c,i)=>drawHull(c,palette[i],r,r*.74));

    nodes.forEach(n=>nodePosition(n,t,cs));

    // Edges
    ctx.lineCap='round';
    edges.forEach(e => {
      const a=nodes[e.a], b=nodes[e.b];
      const dist=Math.hypot(a.x-b.x,a.y-b.y);
      if (dist > 240 && !e.special) return;
      const pulse=.72+.28*Math.sin(t*.0012+e.phase);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
      if(e.cross){
        ctx.strokeStyle=e.special?`rgba(74,91,115,${.27*pulse})`:`rgba(88,112,132,${.13*pulse})`;
        ctx.lineWidth=e.special?1.7:1.0;
      } else {
        const ca=(a.bridge && (.5+.5*Math.sin(t*.00042+a.phase))>.62)?a.bridgeTo:a.baseCommunity;
         ctx.strokeStyle=palette[ca].edge;
        ctx.lineWidth=1.25;
      }
      ctx.stroke();
    });

    // Nodes, with colored cores and white rim for clarity.
    nodes.forEach(n => {
      const p=palette[n.baseCommunity];
      const breathe=1+.11*Math.sin(t*.001+n.phase);
      const rr=n.size*breathe;
      ctx.beginPath(); ctx.arc(n.x,n.y,rr+4,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,.83)'; ctx.fill();
      ctx.beginPath(); ctx.arc(n.x,n.y,rr,0,Math.PI*2); ctx.fillStyle=p.fill; ctx.fill();
      ctx.lineWidth=n.bridge?2.2:1.25; ctx.strokeStyle=n.bridge?'rgba(255,255,255,.98)':'rgba(255,255,255,.82)'; ctx.stroke();
      if(n.bridge){
        ctx.beginPath(); ctx.arc(n.x,n.y,rr+7+2*Math.sin(t*.0012+n.phase),0,Math.PI*2); ctx.strokeStyle='rgba(15,61,100,.42)'; ctx.lineWidth=1.2; ctx.stroke();
      }
    });

    // Tiny moving event pulses along two bridge edges: a visual cue for link-stream activity.
    [[5,13],[13,24]].forEach(([ia,ib],k)=>{
      const a=nodes[ia],b=nodes[ib];
      const q=(t*.00015+k*.43)%1;
      const x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q;
      ctx.beginPath();ctx.arc(x,y,3.1,0,Math.PI*2);ctx.fillStyle='rgba(15,61,100,.94)';ctx.fill();
    });

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();


// Interactive coauthor graph (bibliography-backed, no external libraries or network requests).
(() => {
  const people = [{"name": "Christophe Demko", "url": "https://scholar.google.com/citations?user=2yxJAEYAAAAJ", "topic": "Network science / FCA", "institution": "L3i · La Rochelle", "works": ["Fuzzy and Overlapping Communities Detection (2024)", "Détection de Communautés Floues et Chevauchantes (2024)", "Dynamic and Overlapping Community Detection in Link Streams (2025)", "From Non-overlapping to Overlapping Communities (2025)", "Reduced Subcontext Completion (2025)", "Stable Concepts from Communities and Communities from Concepts (2026)", "HyFALO: Detecting Communities in Hypergraphs (2026)", "Shapley-Based Community Deception (2026)", "Garde alternée dans les graphes (2026)", "h-ABCD+o²: Hypergraph Benchmark (accepted, 2026)"]}, {"name": "Jean-Loup Guillaume", "url": "https://scholar.google.com/citations?user=khOMuc0AAAAJ", "topic": "Network science / hypergraphs", "institution": "L3i · La Rochelle", "works": ["Fuzzy and Overlapping Communities Detection (2024)", "Détection de Communautés Floues et Chevauchantes (2024)", "Dynamic and Overlapping Community Detection in Link Streams (2025)", "From Non-overlapping to Overlapping Communities (2025)", "Stable Concepts from Communities and Communities from Concepts (2026)", "HyFALO: Detecting Communities in Hypergraphs (2026)", "Shapley-Based Community Deception (2026)", "Garde alternée dans les graphes (2026)", "h-ABCD+o²: Hypergraph Benchmark (accepted, 2026)", "Rethinking the Local-Move–Aggregate Hierarchy (accepted, 2026)"]}, {"name": "Karell Bertet", "url": "https://scholar.google.com/citations?user=HYPEcjkAAAAJ", "topic": "Formal Concept Analysis", "institution": "L3i · La Rochelle", "works": ["Fuzzy and Overlapping Communities Detection (2024)", "Détection de Communautés Floues et Chevauchantes (2024)", "Dynamic and Overlapping Community Detection in Link Streams (2025)", "From Non-overlapping to Overlapping Communities (2025)", "Reduced Subcontext Completion (2025)", "Stable Concepts from Communities and Communities from Concepts (2026)", "HyFALO: Detecting Communities in Hypergraphs (2026)", "Shapley-Based Community Deception (2026)", "Garde alternée dans les graphes (2026)", "h-ABCD+o²: Hypergraph Benchmark (accepted, 2026)"]}, {"name": "Antoine Huchet", "url": "https://scholar.google.com/scholar?q=Antoine%20Huchet", "topic": "Overlapping communities", "institution": "Research collaborations", "works": ["From Non-overlapping to Overlapping Communities (2025)", "Garde alternée dans les graphes (2026)"]}, {"name": "Dhorasso Temfack", "url": "https://scholar.google.com/scholar?q=Dhorasso%20Temfack", "topic": "Hypergraph communities", "institution": "Research collaborations", "works": ["HyFALO: Detecting Communities in Hypergraphs (2026)"]}, {"name": "Rokia Missaoui", "url": "https://scholar.google.com/citations?user=2LHBipkAAAAJ", "topic": "Hypergraph benchmarks", "institution": "UQO · Québec", "works": ["h-ABCD+o²: Hypergraph Benchmark (accepted, 2026)"]}, {"name": "Etienne Tajeuna", "url": "https://scholar.google.com/citations?user=KMJ0lxsAAAAJ", "topic": "Hypergraph benchmarks", "institution": "UQO · Québec", "works": ["h-ABCD+o²: Hypergraph Benchmark (accepted, 2026)"]}, {"name": "Charles Kamhoua", "url": "https://scholar.google.com/citations?user=61aQqBEAAAAJ", "topic": "Cyberdeception / attack graphs", "institution": "Research collaborations", "works": ["Shapley Value to Rank Vulnerabilities on Attack Graphs (2026)"]}, {"name": "Serge Olivier Tsemogne Kamguia", "url": "https://scholar.google.com/citations?user=xuGXsysAAAAJ", "topic": "Game theory / security", "institution": "Research collaborations", "works": ["Shapley Value to Rank Vulnerabilities on Attack Graphs (2026)"]}, {"name": "Blaise Blériot Koguep Njionou", "url": "https://scholar.google.com/citations?user=iYbPlkEAAAAJ", "topic": "Cooperative games / FCA", "institution": "University of Dschang", "works": ["Shapley Values in Classification Problems (2024)", "Cooperative Games with Fuzzy Characteristic Functions (2025)"]}, {"name": "Dmitry Ignatov", "url": "https://scholar.google.com/citations?user=iExWnWsAAAAJ", "topic": "Formal Concept Analysis", "institution": "Research collaborations", "works": ["Shapley Values in Classification Problems (2024)", "Cooperative Games with Fuzzy Characteristic Functions (2025)"]}, {"name": "Léonard Kwuida", "url": "https://scholar.google.com/citations?user=nO1I3s0AAAAJ", "topic": "Lattice theory / FCA", "institution": "Research collaborations", "works": ["Shapley Values in Classification Problems (2024)", "Cooperative Games with Fuzzy Characteristic Functions (2025)"]}, {"name": "Jérémy Richard", "url": "https://scholar.google.com/scholar?q=J%C3%A9r%C3%A9my%20Richard", "topic": "Concept lattices", "institution": "Research collaborations", "works": ["Reduced Subcontext Completion (2025)"]}, {"name": "Cyril Faucher", "url": "https://scholar.google.com/scholar?q=Cyril%20Faucher", "topic": "Concept lattices", "institution": "Research collaborations", "works": ["Reduced Subcontext Completion (2025)"]}];
  const svg = document.getElementById('coauthor-network');
  const list = document.getElementById('coauthor-list');
  const detail = document.getElementById('coauthor-detail');
  if (!svg || !list || !detail) return;
  const NS='http://www.w3.org/2000/svg', cx=330,cy=262;
  const el=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e;};
  const edges=[],nodes=[],buttons=[];
  const setInfo=(index)=>{
    const person=people[index];
    edges.forEach((e,i)=>e.classList.toggle('active',i===index));
    nodes.forEach((e,i)=>e.classList.toggle('active',i===index));
    buttons.forEach((e,i)=>{e.classList.toggle('active',i===index);e.setAttribute('aria-pressed',String(i===index));});
    detail.replaceChildren();
    const heading=document.createElement('h3');heading.textContent=person.name;detail.append(heading);
    const topic=document.createElement('p');topic.textContent=person.topic;detail.append(topic);
    const count=document.createElement('p');count.textContent=person.works.length+' shared publication'+(person.works.length===1?'':'s')+' listed on this website';detail.append(count);
    const ul=document.createElement('ul');person.works.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.append(li);});detail.append(ul);
    const a=document.createElement('a');a.href=person.url;a.target='_blank';a.rel='noopener noreferrer';a.className='coauthor-scholar';a.textContent=person.url.includes('/scholar?')?'Find on Google Scholar ↗':'Google Scholar profile ↗';detail.append(a);
  };
  people.forEach((person,i)=>{
    const angle=(-Math.PI/2)+(i*2*Math.PI/people.length);
    const x=cx+243*Math.cos(angle),y=cy+196*Math.sin(angle);
    const edge=el('line',{x1:cx,y1:cy,x2:x,y2:y,class:'coauthor-edge'},svg);edges.push(edge);
    const g=el('g',{class:'coauthor-node',tabindex:'0',role:'button','aria-label':'Explore shared publications with '+person.name},svg);
    el('circle',{cx:x,cy:y,r:27},g);
    const first=person.name.split(' ')[0];const last=person.name.split(' ').slice(-1)[0];
    const t=el('text',{x,y:y-34},g);t.textContent=last.length>12?last.slice(0,11)+'…':last;
    const title=el('title',{},g);title.textContent=person.name+' — '+person.works.length+' shared publications';
    g.addEventListener('click',()=>setInfo(i));g.addEventListener('mouseenter',()=>setInfo(i));g.addEventListener('focus',()=>setInfo(i));
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setInfo(i);}});
    nodes.push(g);
    const b=document.createElement('button');b.type='button';b.className='coauthor-btn';b.textContent=person.name;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>setInfo(i));b.addEventListener('mouseenter',()=>setInfo(i));list.append(b);buttons.push(b);
  });
  const center=el('g',{class:'coauthor-center'},svg);el('circle',{cx,cy,r:66},center);
  const one=el('text',{x:cx,y:cy-10},center);one.textContent='Martin Waffo';
  const two=el('text',{x:cx,y:cy+11},center);two.textContent='Kemgne';
  const three=el('text',{x:cx,y:cy+31,style:'font-size:10px;font-weight:500;opacity:.85'},center);three.textContent='14 coauthors';
  setInfo(0);
})();
