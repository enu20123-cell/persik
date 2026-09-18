// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.querySelector('.main-nav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    mainNav.style.display = open ? 'flex' : '';
    if (open) {
      mainNav.style.position = 'absolute';
      mainNav.style.top = '72px';
      mainNav.style.left = '0';
      mainNav.style.right = '0';
      mainNav.style.flexDirection = 'column';
      mainNav.style.background = '#0e1422';
      mainNav.style.padding = '20px 24px';
      mainNav.style.borderBottom = '1px solid #253046';
    }
  });
  mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mainNav.classList.remove('open');
    mainNav.style.display = '';
    navToggle.setAttribute('aria-expanded', 'false');
  }));
}

// Reveal-on-scroll for sections/cards
const revealTargets = document.querySelectorAll(
  '.card, .metric-card, .strategy-card, .journey li, .hero-visual, .quote-block'
);
revealTargets.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach(el => io.observe(el));

// Animated stat counters
const statNums = document.querySelectorAll('.stat-num');
const statIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.count, 10) || 0;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const tick = () => {
      current += step;
      if (current >= target) {
        el.textContent = target;
      } else {
        el.textContent = current;
        requestAnimationFrame(tick);
      }
    };
    tick();
    statIO.unobserve(el);
  });
}, { threshold: 0.4 });

statNums.forEach(el => statIO.observe(el));

// Animate risk/return bars once visible
const rrBars = document.querySelectorAll('.rr-bar > span');
const rrIO = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const target = entry.target;
      const finalWidth = target.style.width;
      target.style.width = '0%';
      requestAnimationFrame(() => {
        target.style.width = finalWidth;
      });
      rrIO.unobserve(target);
    }
  });
}, { threshold: 0.3 });

rrBars.forEach(el => rrIO.observe(el));
