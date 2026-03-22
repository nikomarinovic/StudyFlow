// ── Auth guard ────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

// ── State ──────────────────────────────────────────────────────
let selectedDifficulty = 'easy';
let currentFilter = 'all';

// Difficulty → required study hours
const DIFF_HOURS  = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', 'very-hard': 'Very Hard' };

// ── Helpers ────────────────────────────────────────────────────
function getDaysLeft(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDay = new Date(dateStr + 'T12:00:00');
  return Math.round((examDay - today) / 86400000);
}

function getStudiedHours(exam, sessions) {
  const subjectLower = (exam.subject || '').toLowerCase().trim();
  return sessions
    .filter(s => (s.subject || '').toLowerCase().trim() === subjectLower)
    .reduce((sum, s) => sum + (Number(s.duration) || 0) / 60, 0);
}

function getProgressPct(exam, sessions) {
  const required = DIFF_HOURS[exam.difficulty] || 10;
  const done = getStudiedHours(exam, sessions);
  return Math.min(100, Math.round((done / required) * 100));
}

function getProgressColor(diff) {
  return {
    easy:       'var(--success)',
    medium:     'var(--warning)',
    hard:       'var(--destructive)',
    'very-hard':'hsl(8,75%,48%)'
  }[diff] || 'var(--primary)';
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `ex-toast ${type}`;
  const icon = type === 'success'
    ? '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>';
  t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>${msg}`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'all .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 320);
  }, 3000);
}

// ── Add exam panel ─────────────────────────────────────────────
function toggleAddPanel() {
  const body    = document.getElementById('addBody');
  const chevron = document.getElementById('addChevron');
  if (!body || !chevron) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
  if (!isOpen) {
    const dateInput = document.getElementById('examDate');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
    setTimeout(() => {
      const subj = document.getElementById('examSubject');
      if (subj) subj.focus();
    }, 350);
  }
}

// ── Difficulty chip selection ──────────────────────────────────
function selectDiff(btn) {
  document.querySelectorAll('.ex-diff-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDifficulty = btn.dataset.val;
}

// ── Filter tabs ────────────────────────────────────────────────
function setFilter(btn) {
  document.querySelectorAll('.ex-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderExams();
}

// ── Submit new exam ────────────────────────────────────────────
function submitExam(e) {
  e.preventDefault();
  const subject  = (document.getElementById('examSubject')?.value || '').trim();
  const topic    = (document.getElementById('examTopic')?.value   || '').trim();
  const examDate = document.getElementById('examDate')?.value;

  if (!subject || !topic || !examDate) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  if (getDaysLeft(examDate) < 0) {
    showToast('Exam date must be today or in the future', 'error');
    return;
  }

  DB.addExam(currentUser.id, { subject, topic, examDate, difficulty: selectedDifficulty });

  document.getElementById('examForm')?.reset();
  selectedDifficulty = 'easy';
  document.querySelectorAll('.ex-diff-chip').forEach(c => c.classList.remove('selected'));
  document.querySelector('.ex-diff-chip.easy')?.classList.add('selected');

  toggleAddPanel();
  showToast('Exam added! Your study schedule has been updated', 'success');
  renderAll();
}

// ── Delete exam ────────────────────────────────────────────────
function deleteExam(id, name) {
  if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;
  DB.deleteExam(id);
  showToast('Exam deleted', 'success');
  renderAll();
}

// ── Summary stats bar ──────────────────────────────────────────
function updateSummary(exams, sessions) {
  const upcoming = exams.filter(e => getDaysLeft(e.examDate) >= 0);
  const urgent   = upcoming.filter(e => getDaysLeft(e.examDate) <= 7);

  const hoursLeft = upcoming.reduce((sum, e) => {
    const required = DIFF_HOURS[e.difficulty] || 10;
    const done     = getStudiedHours(e, sessions);
    return sum + Math.max(0, required - done);
  }, 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sumTotal',    exams.length);
  set('sumUpcoming', upcoming.length);
  set('sumUrgent',   urgent.length);
  set('sumHours',    Math.ceil(hoursLeft) + 'h');
}

// ── Render exam cards ──────────────────────────────────────────
function renderExams() {
  const exams    = DB.getExams(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);
  const grid     = document.getElementById('examsGrid');
  if (!grid) return;

  let filtered = [...exams].sort((a, b) => getDaysLeft(a.examDate) - getDaysLeft(b.examDate));

  if (currentFilter === 'upcoming') filtered = filtered.filter(e => getDaysLeft(e.examDate) >= 0);
  if (currentFilter === 'past')     filtered = filtered.filter(e => getDaysLeft(e.examDate) < 0);

  const counts = {
    all:      exams.length,
    upcoming: exams.filter(e => getDaysLeft(e.examDate) >= 0).length,
    past:     exams.filter(e => getDaysLeft(e.examDate) < 0).length,
  };
  const titleMap = { all: 'All', upcoming: 'Upcoming', past: 'Past' };
  const listTitle = document.getElementById('listTitle');
  if (listTitle) listTitle.textContent = `${titleMap[currentFilter]} Exams (${counts[currentFilter]})`;

  if (filtered.length === 0) {
    const emptyMsg = currentFilter === 'past'
      ? { title: 'No past exams', sub: 'Switch to "All" or "Upcoming" to see your exams.' }
      : currentFilter === 'upcoming'
      ? { title: 'No upcoming exams', sub: 'Add an exam using the panel above.' }
      : { title: 'No exams yet', sub: 'Open the "Add New Exam" panel above to get started.' };

    grid.innerHTML = `
      <div class="ex-empty">
        <div class="ex-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
        </div>
        <div class="ex-empty-title">${emptyMsg.title}</div>
        <div class="ex-empty-sub">${emptyMsg.sub}</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((exam, idx) => {
    const daysLeft = getDaysLeft(exam.examDate);
    const pct      = getProgressPct(exam, sessions);
    const isPast   = daysLeft < 0;
    const isToday  = daysLeft === 0;
    const isUrgent = !isPast && daysLeft <= 3;
    const isSoon   = !isPast && !isUrgent && daysLeft <= 7;

    const daysClass = isPast ? 'past' : isUrgent ? 'urgent' : isSoon ? 'soon' : 'ok';
    const daysText  = isPast  ? `${Math.abs(daysLeft)}d ago`
                    : isToday ? 'Today!'
                    : `${daysLeft}`;
    const daysLabel = isPast  ? 'days ago'
                    : isToday ? 'exam day'
                    : 'days left';

    const dateStr = new Date(exam.examDate + 'T12:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const studiedH  = getStudiedHours(exam, sessions);
    const requiredH = DIFF_HOURS[exam.difficulty] || 10;
    const safeName  = exam.subject.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `
      <div class="ex-card" style="animation-delay:${idx * 0.05}s">
        <div class="ex-card-accent ${exam.difficulty}"></div>
        <div class="ex-card-body">
          <div class="ex-card-top">
            <span class="ex-card-name">${exam.subject}</span>
            <span class="ex-card-topic">${exam.topic}</span>
          </div>
          <div class="ex-card-meta">
            <span class="ex-badge ex-badge-${exam.difficulty}">${DIFF_LABELS[exam.difficulty] || exam.difficulty}</span>
            <span class="ex-badge ex-badge-date">${dateStr}</span>
            ${isUrgent && !isPast ? '<span class="ex-badge ex-badge-urgent">Urgent</span>' : ''}
            ${isToday ? '<span class="ex-badge ex-badge-urgent">Today</span>' : ''}
          </div>
          ${!isPast ? `
          <div class="ex-card-progress">
            <div class="ex-prog-label">
              <span>Study progress</span>
              <span>${studiedH.toFixed(1)}h / ${requiredH}h &nbsp;(${pct}%)</span>
            </div>
            <div class="ex-prog-bar">
              <div class="ex-prog-fill" style="width:${pct}%; background:${getProgressColor(exam.difficulty)};"></div>
            </div>
          </div>` : ''}
        </div>
        <div class="ex-card-right">
          <div class="ex-days-left ${daysClass}">${daysText}</div>
          <div class="ex-days-lbl">${daysLabel}</div>
          <button class="ex-delete-btn" title="Delete exam"
            onclick="deleteExam('${exam.id}', '${safeName}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Full re-render ─────────────────────────────────────────────
function renderAll() {
  const exams    = DB.getExams(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);
  updateSummary(exams, sessions);
  renderExams();
}

// ── Init ───────────────────────────────────────────────────────
renderAll();

} // end else