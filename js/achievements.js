const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

// ── Achievement definitions ────────────────────────────────────────────────
// Each achievement has: id, title, desc, icon (SVG path data), color, category, check(data) → bool, progress(data) → {val, max}
const ACHIEVEMENTS = [
  // ── STREAK ────────────────────────────
  {
    id: 'streak_3',
    title: 'Hat Trick',
    desc: 'Study 3 days in a row',
    icon: 'flame',
    color: 'orange',
    category: 'streak',
    check: d => d.streak >= 3,
    progress: d => ({ val: Math.min(d.streak, 3), max: 3 }),
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    desc: 'Maintain a 7-day streak',
    icon: 'flame',
    color: 'orange',
    category: 'streak',
    check: d => d.streak >= 7,
    progress: d => ({ val: Math.min(d.streak, 7), max: 7 }),
  },
  {
    id: 'streak_14',
    title: 'Two Week Grind',
    desc: 'Maintain a 14-day streak',
    icon: 'flame',
    color: 'red',
    category: 'streak',
    check: d => d.streak >= 14,
    progress: d => ({ val: Math.min(d.streak, 14), max: 14 }),
  },
  {
    id: 'streak_30',
    title: 'Unstoppable',
    desc: 'Maintain a 30-day streak',
    icon: 'flame',
    color: 'red',
    category: 'streak',
    check: d => d.streak >= 30,
    progress: d => ({ val: Math.min(d.streak, 30), max: 30 }),
  },

  // ── HOURS ─────────────────────────────
  {
    id: 'hours_1',
    title: 'First Hour',
    desc: 'Complete your first hour of studying',
    icon: 'clock',
    color: 'blue',
    category: 'hours',
    check: d => d.totalHours >= 1,
    progress: d => ({ val: Math.min(d.totalHours, 1), max: 1 }),
  },
  {
    id: 'hours_10',
    title: 'Dedicated',
    desc: 'Log 10 total study hours',
    icon: 'clock',
    color: 'blue',
    category: 'hours',
    check: d => d.totalHours >= 10,
    progress: d => ({ val: Math.min(d.totalHours, 10), max: 10 }),
  },
  {
    id: 'hours_50',
    title: 'Scholar',
    desc: 'Log 50 total study hours',
    icon: 'clock',
    color: 'purple',
    category: 'hours',
    check: d => d.totalHours >= 50,
    progress: d => ({ val: Math.min(d.totalHours, 50), max: 50 }),
  },
  {
    id: 'hours_100',
    title: 'Centurion',
    desc: 'Log 100 total study hours',
    icon: 'star',
    color: 'gold',
    category: 'hours',
    check: d => d.totalHours >= 100,
    progress: d => ({ val: Math.min(d.totalHours, 100), max: 100 }),
  },
  {
    id: 'hours_500',
    title: 'Grandmaster',
    desc: 'Log 500 total study hours',
    icon: 'trophy',
    color: 'gold',
    category: 'hours',
    check: d => d.totalHours >= 500,
    progress: d => ({ val: Math.min(d.totalHours, 500), max: 500 }),
  },

  // ── SESSIONS ──────────────────────────
  {
    id: 'sessions_1',
    title: 'Getting Started',
    desc: 'Complete your first study session',
    icon: 'play',
    color: 'green',
    category: 'sessions',
    check: d => d.totalSessions >= 1,
    progress: d => ({ val: Math.min(d.totalSessions, 1), max: 1 }),
  },
  {
    id: 'sessions_10',
    title: 'Building Habits',
    desc: 'Complete 10 study sessions',
    icon: 'play',
    color: 'green',
    category: 'sessions',
    check: d => d.totalSessions >= 10,
    progress: d => ({ val: Math.min(d.totalSessions, 10), max: 10 }),
  },
  {
    id: 'sessions_50',
    title: 'In the Zone',
    desc: 'Complete 50 study sessions',
    icon: 'zap',
    color: 'green',
    category: 'sessions',
    check: d => d.totalSessions >= 50,
    progress: d => ({ val: Math.min(d.totalSessions, 50), max: 50 }),
  },
  {
    id: 'sessions_100',
    title: 'Centurion Sessions',
    desc: 'Complete 100 study sessions',
    icon: 'zap',
    color: 'purple',
    category: 'sessions',
    check: d => d.totalSessions >= 100,
    progress: d => ({ val: Math.min(d.totalSessions, 100), max: 100 }),
  },

  // ── EXAMS / PLANNER ──────────────────
  {
    id: 'exam_1',
    title: 'On the Books',
    desc: 'Add your first exam',
    icon: 'book',
    color: 'purple',
    category: 'planner',
    check: d => d.totalExams >= 1,
    progress: d => ({ val: Math.min(d.totalExams, 1), max: 1 }),
  },
  {
    id: 'exam_5',
    title: 'Exam Season',
    desc: 'Add 5 exams',
    icon: 'book',
    color: 'purple',
    category: 'planner',
    check: d => d.totalExams >= 5,
    progress: d => ({ val: Math.min(d.totalExams, 5), max: 5 }),
  },
  {
    id: 'project_1',
    title: 'Project Kickoff',
    desc: 'Add your first project',
    icon: 'monitor',
    color: 'blue',
    category: 'planner',
    check: d => d.totalProjects >= 1,
    progress: d => ({ val: Math.min(d.totalProjects, 1), max: 1 }),
  },
  {
    id: 'calendar_1',
    title: 'Checked Off',
    desc: 'Complete your first calendar block',
    icon: 'check',
    color: 'green',
    category: 'planner',
    check: d => d.totalCompletions >= 1,
    progress: d => ({ val: Math.min(d.totalCompletions, 1), max: 1 }),
  },
  {
    id: 'calendar_10',
    title: 'On Schedule',
    desc: 'Complete 10 calendar study blocks',
    icon: 'check',
    color: 'green',
    category: 'planner',
    check: d => d.totalCompletions >= 10,
    progress: d => ({ val: Math.min(d.totalCompletions, 10), max: 10 }),
  },

  // ── SCORE ─────────────────────────────
  {
    id: 'score_500',
    title: 'Rising Star',
    desc: 'Reach 500 Study Score',
    icon: 'star',
    color: 'yellow',
    category: 'score',
    check: d => d.studyScore >= 500,
    progress: d => ({ val: Math.min(d.studyScore, 500), max: 500 }),
  },
  {
    id: 'score_2500',
    title: 'High Achiever',
    desc: 'Reach 2,500 Study Score',
    icon: 'star',
    color: 'yellow',
    category: 'score',
    check: d => d.studyScore >= 2500,
    progress: d => ({ val: Math.min(d.studyScore, 2500), max: 2500 }),
  },
  {
    id: 'score_10000',
    title: 'Legend',
    desc: 'Reach 10,000 Study Score',
    icon: 'trophy',
    color: 'gold',
    category: 'score',
    check: d => d.studyScore >= 10000,
    progress: d => ({ val: Math.min(d.studyScore, 10000), max: 10000 }),
  },

  // ── SPECIAL ───────────────────────────
  {
    id: 'multi_subject',
    title: 'Renaissance Student',
    desc: 'Study 3 or more different subjects',
    icon: 'layers',
    color: 'teal',
    category: 'special',
    check: d => d.uniqueSubjects >= 3,
    progress: d => ({ val: Math.min(d.uniqueSubjects, 3), max: 3 }),
  },
  {
    id: 'long_session',
    title: 'Deep Work',
    desc: 'Complete a session of 90+ minutes',
    icon: 'zap',
    color: 'teal',
    category: 'special',
    check: d => d.longestSession >= 90,
    progress: d => ({ val: Math.min(d.longestSession, 90), max: 90 }),
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    desc: 'Start a study session before 8am',
    icon: 'sun',
    color: 'yellow',
    category: 'special',
    check: d => d.hasEarlySession,
    progress: d => ({ val: d.hasEarlySession ? 1 : 0, max: 1 }),
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    desc: 'Start a study session after 10pm',
    icon: 'moon',
    color: 'purple',
    category: 'special',
    check: d => d.hasLateSession,
    progress: d => ({ val: d.hasLateSession ? 1 : 0, max: 1 }),
  },
];

// ── Icon SVG paths ─────────────────────────────────────────────────────────
function getIconSVG(name, size = 22) {
  const paths = {
    flame:   `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
    clock:   `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
    star:    `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
    trophy:  `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>`,
    play:    `<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>`,
    zap:     `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
    book:    `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><line x1="8" x2="16" y1="7" y2="7"/><line x1="8" x2="14" y1="11" y2="11"/>`,
    monitor: `<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>`,
    check:   `<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>`,
    layers:  `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
    sun:     `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`,
    moon:    `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.star}</svg>`;
}

// ── Color palette per achievement color ────────────────────────────────────
const COLOR_MAP = {
  orange: { bg: 'rgba(249,115,22,.12)', icon: 'hsl(24,95%,50%)', border: 'rgba(249,115,22,.25)' },
  red:    { bg: 'rgba(239,68,68,.12)',  icon: 'hsl(8,75%,55%)',  border: 'rgba(239,68,68,.25)' },
  blue:   { bg: 'rgba(59,130,246,.1)',  icon: 'hsl(221,83%,53%)',border: 'rgba(59,130,246,.2)' },
  purple: { bg: 'rgba(132,34,209,.1)',  icon: 'hsl(270,74%,42%)',border: 'rgba(132,34,209,.2)' },
  green:  { bg: 'rgba(22,163,74,.1)',   icon: 'hsl(158,64%,40%)',border: 'rgba(22,163,74,.2)'  },
  gold:   { bg: 'rgba(234,179,8,.12)',  icon: 'hsl(45,93%,47%)', border: 'rgba(234,179,8,.3)'  },
  yellow: { bg: 'rgba(234,179,8,.1)',   icon: 'hsl(45,80%,45%)', border: 'rgba(234,179,8,.25)' },
  teal:   { bg: 'rgba(20,184,166,.1)',  icon: 'hsl(175,60%,40%)',border: 'rgba(20,184,166,.2)' },
};

// ── Compute user data from DB ──────────────────────────────────────────────
function computeUserData() {
  const stats       = DB.getStats(currentUser.id);
  const sessions    = DB.getSessions(currentUser.id);
  const items       = DB.getItems(currentUser.id);
  const completions = DB.getCompletions(currentUser.id);

  const totalHours    = stats.totalStudyHours || 0;
  const streak        = stats.streak || 0;
  const studyScore    = stats.studyScore || 0;
  const totalSessions = sessions.length;
  const totalExams    = items.filter(i => i.type === 'exam').length;
  const totalProjects = items.filter(i => i.type === 'project').length;
  const totalReminders= items.filter(i => i.type === 'reminder').length;
  const totalCompletions = completions.length;

  const uniqueSubjects = new Set(sessions.map(s => (s.subject||'').toLowerCase().trim()).filter(Boolean)).size;
  const longestSession = sessions.reduce((m, s) => Math.max(m, s.duration || 0), 0);

  const hasEarlySession = sessions.some(s => {
    const h = new Date(s.completedAt).getHours();
    return h < 8;
  });
  const hasLateSession = sessions.some(s => {
    const h = new Date(s.completedAt).getHours();
    return h >= 22;
  });

  // Subject breakdown
  const subjectMap = {};
  sessions.forEach(s => {
    const sub = (s.subject || 'General').trim();
    subjectMap[sub] = (subjectMap[sub] || 0) + (s.duration || 0);
  });
  const subjectBreakdown = Object.entries(subjectMap)
    .map(([name, mins]) => ({ name, hours: +(mins / 60).toFixed(1) }))
    .sort((a, b) => b.hours - a.hours);

  // Daily activity for heatmap (last 12 weeks)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const heatmap = {};
  sessions.forEach(s => {
    const d = new Date(s.completedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split('T')[0];
    heatmap[key] = (heatmap[key] || 0) + (s.duration || 0);
  });

  // Weekly hours for last 8 weeks
  const weeklyData = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7 + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const hrs = sessions
      .filter(s => { const d = new Date(s.completedAt); return d >= weekStart && d < weekEnd; })
      .reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
    weeklyData.push({ label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), hours: +hrs.toFixed(1) });
  }

  return {
    totalHours, streak, studyScore, totalSessions,
    totalExams, totalProjects, totalReminders, totalCompletions,
    uniqueSubjects, longestSession, hasEarlySession, hasLateSession,
    subjectBreakdown, heatmap, weeklyData, sessions, items,
    memberSince: currentUser.createdAt || Date.now(),
  };
}

// ── Render ─────────────────────────────────────────────────────────────────
function fmt(n, dec = 1) { return n % 1 === 0 ? n.toString() : n.toFixed(dec); }

function renderPage() {
  const d = computeUserData();

  // ── Hero stats ─────────────────────
  document.getElementById('statScore').textContent   = d.studyScore.toLocaleString();
  document.getElementById('statHours').textContent   = fmt(d.totalHours);
  document.getElementById('statStreak').textContent  = d.streak;
  document.getElementById('statSessions').textContent = d.totalSessions;

  // member since
  const ms = new Date(d.memberSince);
  document.getElementById('memberSince').textContent =
    ms.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Achievements ──────────────────
  const unlocked = ACHIEVEMENTS.filter(a => a.check(d));
  const locked   = ACHIEVEMENTS.filter(a => !a.check(d));
  document.getElementById('achUnlocked').textContent = unlocked.length;
  document.getElementById('achTotal').textContent    = ACHIEVEMENTS.length;

  // progress ring
  const pct = ACHIEVEMENTS.length > 0 ? (unlocked.length / ACHIEVEMENTS.length) * 100 : 0;
  document.querySelector('.ach-ring-fill').style.setProperty('--pct', pct + '%');
  document.querySelector('.ach-ring-pct').textContent = Math.round(pct) + '%';

  renderAchievements(d, unlocked, locked);

  // ── Subject breakdown ─────────────
  renderSubjectChart(d.subjectBreakdown);

  // ── Heatmap ───────────────────────
  renderHeatmap(d.heatmap);

  // ── Weekly chart ──────────────────
  renderWeeklyChart(d.weeklyData);

  // ── Planner stats ─────────────────
  document.getElementById('statExams').textContent    = d.totalExams;
  document.getElementById('statProjects').textContent = d.totalProjects;
  document.getElementById('statReminders').textContent= d.totalReminders;
  document.getElementById('statCompletions').textContent = d.totalCompletions;
}

function renderAchievements(d, unlocked, locked) {
  const grid = document.getElementById('achGrid');

  // categories
  const cats = ['all', 'streak', 'hours', 'sessions', 'planner', 'score', 'special'];
  const active = grid.dataset.filter || 'all';

  const all = [...unlocked.map(a => ({ ...a, earned: true })), ...locked.map(a => ({ ...a, earned: false }))];
  const filtered = active === 'all' ? all : all.filter(a => a.category === active);

  grid.innerHTML = filtered.map((a, i) => {
    const c   = COLOR_MAP[a.color] || COLOR_MAP.purple;
    const prog = a.progress(d);
    const pct  = Math.min(100, Math.round((prog.val / prog.max) * 100));
    const icon = getIconSVG(a.icon, 20);

    return `
      <div class="ach-card ${a.earned ? 'earned' : 'locked'}" style="animation-delay:${i * .04}s">
        <div class="ach-icon-wrap" style="background:${a.earned ? c.bg : 'var(--muted)'}; border-color:${a.earned ? c.border : 'var(--border)'}">
          <span style="color:${a.earned ? c.icon : 'var(--muted-foreground)'}; opacity:${a.earned ? 1 : .45}">${icon}</span>
        </div>
        <div class="ach-body">
          <div class="ach-title ${a.earned ? '' : 'dim'}">${a.title}${a.earned ? ` <span class="ach-earned-dot"></span>` : ''}</div>
          <div class="ach-desc">${a.desc}</div>
          <div class="ach-prog-wrap">
            <div class="ach-prog-bar">
              <div class="ach-prog-fill" style="width:${pct}%; background:${a.earned ? c.icon : 'var(--muted-foreground)'}; opacity:${a.earned ? 1 : .35}"></div>
            </div>
            <span class="ach-prog-label">${prog.val % 1 === 0 ? prog.val : prog.val.toFixed(1)} / ${prog.max % 1 === 0 ? prog.max : prog.max.toFixed(1)}</span>
          </div>
        </div>
        ${a.earned ? `<div class="ach-badge-check">${getIconSVG('check', 12)}</div>` : ''}
      </div>`;
  }).join('');
}

function setFilter(btn) {
  document.querySelectorAll('.ach-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('achGrid').dataset.filter = btn.dataset.filter;
  const d = computeUserData();
  const unlocked = ACHIEVEMENTS.filter(a => a.check(d));
  const locked   = ACHIEVEMENTS.filter(a => !a.check(d));
  renderAchievements(d, unlocked, locked);
}

function renderSubjectChart(subjects) {
  const el = document.getElementById('subjectChart');
  if (!subjects.length) {
    el.innerHTML = `<div class="chart-empty">No sessions recorded yet</div>`;
    return;
  }
  const max = subjects[0].hours;
  const COLORS = ['hsl(270,74%,42%)','hsl(221,83%,53%)','hsl(158,64%,40%)','hsl(38,80%,45%)','hsl(8,75%,55%)','hsl(175,60%,40%)'];
  el.innerHTML = subjects.slice(0, 6).map((s, i) => {
    const pct = max > 0 ? (s.hours / max) * 100 : 0;
    return `
      <div class="subj-row">
        <div class="subj-name">${s.name}</div>
        <div class="subj-bar-wrap">
          <div class="subj-bar-fill" style="width:${pct}%; background:${COLORS[i % COLORS.length]}"></div>
        </div>
        <div class="subj-hours">${s.hours}h</div>
      </div>`;
  }).join('');
}

function renderHeatmap(heatmap) {
  const el = document.getElementById('heatmap');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const WEEKS = 15;
  const days  = WEEKS * 7;

  // Start from the nearest past Monday
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  startDay.setDate(startDay.getDate() - (WEEKS - 1) * 7);

  let cells = '';
  const maxMins = Math.max(...Object.values(heatmap), 1);

  for (let i = 0; i < days; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key  = d.toISOString().split('T')[0];
    const mins = heatmap[key] || 0;
    const hrs  = (mins / 60).toFixed(1);
    const intensity = mins > 0 ? Math.max(.2, mins / maxMins) : 0;
    const isToday = d.toDateString() === today.toDateString();

    let bg = 'var(--muted)';
    if (mins > 0) {
      const alpha = (.15 + intensity * .75).toFixed(2);
      bg = `rgba(132,34,209,${alpha})`;
    }
    cells += `<div class="hm-cell ${isToday ? 'hm-today' : ''}" style="background:${bg}" title="${key}: ${hrs}h"></div>`;
  }

  // Month labels
  const monthLabels = [];
  let lastMonth = -1;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ col: Math.floor(i / 7) + 1, label: d.toLocaleDateString('en-US', { month: 'short' }) });
      lastMonth = d.getMonth();
    }
  }

  const labelsHtml = monthLabels.map(m =>
    `<span style="grid-column:${m.col}">${m.label}</span>`
  ).join('');

  el.innerHTML = `
    <div class="hm-month-row">${labelsHtml}</div>
    <div class="hm-grid">${cells}</div>
    <div class="hm-legend">
      <span>Less</span>
      <div class="hm-leg-cell" style="background:var(--muted)"></div>
      <div class="hm-leg-cell" style="background:rgba(132,34,209,.25)"></div>
      <div class="hm-leg-cell" style="background:rgba(132,34,209,.5)"></div>
      <div class="hm-leg-cell" style="background:rgba(132,34,209,.75)"></div>
      <div class="hm-leg-cell" style="background:rgba(132,34,209,.9)"></div>
      <span>More</span>
    </div>`;
}

function renderWeeklyChart(weeklyData) {
  const el  = document.getElementById('weeklyChart');
  const max = Math.max(...weeklyData.map(w => w.hours), 1);
  el.innerHTML = weeklyData.map((w, i) => {
    const h = max > 0 ? Math.max((w.hours / max) * 100, w.hours > 0 ? 4 : 2) : 2;
    const isLast = i === weeklyData.length - 1;
    return `
      <div class="wk-bar-col">
        <div class="wk-bar-inner">
          <div class="wk-bar-fill ${isLast ? 'current' : ''}" style="height:${h}%" title="${w.hours}h"></div>
        </div>
        <div class="wk-bar-label">${w.label}</div>
      </div>`;
  }).join('');
  const total = weeklyData.reduce((s, w) => s + w.hours, 0);
  document.getElementById('weeklyTotal').textContent = fmt(total) + ' total hours';
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userName').textContent = currentUser.name;
  renderPage();
});

} // end else