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
