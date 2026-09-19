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

// Tabbed sections instead of one long scroll
const tabPanels = document.querySelectorAll('.tab-panel');
const tabControls = document.querySelectorAll('[data-tab]');

function activateTab(id, { scroll = true } = {}) {
  if (!id || !document.getElementById(id)) return;
  tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === id));
  tabControls.forEach(el => {
    const isActive = el.dataset.tab === id;
    el.classList.toggle('active', isActive);
    if (el.classList.contains('tab-btn')) el.setAttribute('aria-selected', String(isActive));
  });
  history.replaceState(null, '', '#tab-' + id);
  if (scroll) {
    const anchor = document.querySelector('.tabbar-wrap') || document.getElementById(id);
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

if (tabPanels.length) {
  tabControls.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab(el.dataset.tab);
    });
  });

  const requestedId = location.hash.replace(/^#(tab-)?/, '');
  const initialId = [...tabPanels].some(p => p.id === requestedId)
    ? requestedId
    : tabPanels[0].id;
  activateTab(initialId, { scroll: false });
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

// AI analysis demo (calls local Flask + Gemini backend)
const ANALYZE_URL = '/api/analyze';
const analyzeForm = document.getElementById('analyzeForm');
const demoResult = document.getElementById('demoResult');
const analyzeBtn = document.getElementById('analyzeBtn');

const ASSET_LABELS = {
  core: 'Базовый актив',
  growth: 'Актив роста',
  high_yield: 'Высокодоходный актив',
  hedge: 'Защитный актив',
};

function renderAssets(assets) {
  if (!Array.isArray(assets)) return '';
  return assets.map(a => `
    <div class="demo-asset type-${a.type || 'core'}">
      <div class="demo-asset-head">
        <b>${escapeHtml(a.name || '—')}</b>
        <span>${ASSET_LABELS[a.type] || a.type || ''}</span>
      </div>
      <p>${escapeHtml(a.reason || '')}</p>
      <div class="rr-meter">
        <div class="rr-row"><span>Риск</span><div class="rr-bar"><span style="width:${clampPct(a.risk)}%"></span></div></div>
        <div class="rr-row"><span>ROE</span><div class="rr-bar"><span style="width:${clampPct(a.roe)}%"></span></div></div>
      </div>
    </div>
  `).join('');
}

function clampPct(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

const PERSIK_PER_USD = 1 / 50;
const PERSIK_PER_ACHIEVEMENT = 120;
const WIN_RATE_STORAGE_KEY = 'eduPortfolioPrevWinRate';

function parseBudgetToUsd(budgetStr) {
  const digits = String(budgetStr || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function computePersiks(budgetStr, achievements) {
  const budgetUsd = parseBudgetToUsd(budgetStr);
  const fromBudget = Math.round(budgetUsd * PERSIK_PER_USD);
  const fromAchievements = Math.max(0, Math.round(Number(achievements) || 0)) * PERSIK_PER_ACHIEVEMENT;
  return { total: fromBudget + fromAchievements, fromBudget, fromAchievements };
}

function readPrevWinRate() {
  try {
    const raw = localStorage.getItem(WIN_RATE_STORAGE_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function storeWinRate(winRate) {
  try {
    localStorage.setItem(WIN_RATE_STORAGE_KEY, String(winRate));
  } catch {
    // localStorage unavailable (private mode, blocked storage) — trend just resets each visit
  }
}

function getWinRateTrend(winRate) {
  const prev = readPrevWinRate();
  storeWinRate(winRate);
  if (prev === null || Number.isNaN(prev)) {
    return { trend: 'flat', text: 'Первый анализ — точка отсчёта для будущих сравнений.' };
  }
  if (winRate > prev) {
    return { trend: 'up', text: `Твои акции растут: Win Rate вырос на ${winRate - prev}% с прошлого анализа.` };
  }
  if (winRate < prev) {
    return { trend: 'down', text: `Просадка: Win Rate снизился на ${prev - winRate}% с прошлого анализа.` };
  }
  return { trend: 'flat', text: 'Без изменений с прошлого анализа.' };
}

const TREND_ARROW_SVG = '<svg viewBox="0 0 24 24"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"></path></svg>';

if (analyzeForm) {
  analyzeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(analyzeForm);
    const profile = Object.fromEntries(formData.entries());

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Анализирую…';
    demoResult.innerHTML = '<p class="demo-placeholder">Gemini считает риск и доходность портфеля…</p>';

    try {
      const res = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Ошибка сервера (${res.status})`);
      }

      const winRate = clampPct(data.win_rate);
      const achievements = Number(profile.achievements) || 0;
      const persiks = computePersiks(profile.budget, achievements);
      const { trend, text: trendText } = getWinRateTrend(winRate);

      demoResult.innerHTML = `
        <div class="demo-block">
          <div class="demo-block-icon">🧭</div>
          <div>
            <p class="demo-block-label">Диагноз портфеля</p>
            <p class="demo-diagnosis">${escapeHtml(data.diagnosis || '')}</p>
          </div>
        </div>
        <div class="demo-winrate-block">
          <div class="demo-winrate-ring" style="--pct:${winRate}"><span>${winRate}%</span></div>
          <div>
            <p class="demo-block-label">Win Rate портфеля</p>
            <p class="demo-winrate-sub">Вероятность успеха по модели активов</p>
          </div>
        </div>
        <div class="demo-block persik-block">
          <div class="demo-block-icon">🍑</div>
          <div>
            <p class="demo-block-label">Персик-баланс</p>
            <p class="persik-amount">${persiks.total}<span>Персиков</span></p>
            <p class="persik-breakdown">${persiks.fromBudget} от бюджета + ${persiks.fromAchievements} за ${achievements} достиж.</p>
          </div>
        </div>
        <div class="demo-block trend-block">
          <span class="trend-arrow trend-${trend}" aria-hidden="true">${TREND_ARROW_SVG}</span>
          <div>
            <p class="demo-block-label">Динамика акций</p>
            <p class="trend-text">${escapeHtml(trendText)}</p>
          </div>
        </div>
        <p class="demo-section-title">Портфель активов</p>
        <div class="demo-assets">${renderAssets(data.assets)}</div>
        ${data.next_step ? `<div class="demo-next">🎯 <strong>Ближайший шаг:</strong> ${escapeHtml(data.next_step)}</div>` : ''}
      `;
      demoResult.querySelectorAll('.rr-bar > span').forEach(el => {
        const w = el.style.width;
        el.style.width = '0%';
        requestAnimationFrame(() => { el.style.width = w; });
      });
    } catch (err) {
      demoResult.innerHTML = `
        <p class="demo-error">
          Не удалось получить анализ: ${escapeHtml(err.message)}.<br>
          Убедитесь, что backend запущен (<code>python backend/app.py</code>) и в <code>.env</code> указан GEMINI_API_KEY.
        </p>`;
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Проанализировать портфель';
    }
  });
}
