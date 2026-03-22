// ── Auth guard ────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

// ── State ──────────────────────────────────────────────────────
let selectedDifficulty = 'medium';
let selectedType       = 'exam';
let currentFilter      = 'all';

const DIFF_HOURS  = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', 'very-hard': 'Very Hard' };

const TYPE_ICONS = {
  exam:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><line x1="8" x2="16" y1="7" y2="7"/><line x1="8" x2="14" y1="11" y2="11"/></svg>`,
  project:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  reminder: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
};
const TYPE_LABELS = { exam: 'Exam', project: 'Project', reminder: 'Reminder' };

// ── Helpers ────────────────────────────────────────────────────
function getDaysLeft(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(dateStr + 'T12:00:00') - today) / 86400000);
}

// Total studied hours for a subject:
// combines timer sessions + calendar block completions for the same subject.
function getStudiedHours(item, sessions, completions) {
  const sub = (item.subject || '').toLowerCase().trim();

  const sessionMins = sessions
    .filter(s => (s.subject || '').toLowerCase().trim() === sub)
    .reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  const completionMins = (completions || [])
    .filter(c => (c.subject || '').toLowerCase().trim() === sub)
    .reduce((sum, c) => sum + (Number(c.durationMinutes) || 0), 0);

  return (sessionMins + completionMins) / 60;
}

function getProgressPct(item, sessions, completions) {
  if (item.type !== 'exam') return null;
  const req = DIFF_HOURS[item.difficulty] || 10;
  return Math.min(100, Math.round((getStudiedHours(item, sessions, completions) / req) * 100));
}

function getProgressColor(diff) {
  return {
    easy:        'var(--success)',
    medium:      'var(--warning)',
    hard:        'var(--destructive)',
    'very-hard': 'hsl(8,75%,48%)',
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
    t.style.opacity    = '0';
    t.style.transform  = 'translateY(8px)';
    setTimeout(() => t.remove(), 320);
  }, 3000);
}

// ── Type selector ──────────────────────────────────────────────
function selectType(btn) {
  document.querySelectorAll('.ex-type-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  selectedType = btn.dataset.val;

  const examFields = document.getElementById('examOnlyFields');
  const remFields  = document.getElementById('reminderOnlyFields');
  if (examFields) examFields.style.display = selectedType === 'exam'     ? '' : 'none';
  if (remFields)  remFields.style.display  = selectedType === 'reminder' ? '' : 'none';

  const dateLabel = document.getElementById('dueDateLabel');
  if (dateLabel) dateLabel.textContent =
    selectedType === 'exam'     ? 'Exam Date *'    :
    selectedType === 'project'  ? 'Deadline *'     : 'Reminder Date *';
}

// ── Difficulty chip ────────────────────────────────────────────
function selectDiff(btn) {
  document.querySelectorAll('.ex-diff-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDifficulty = btn.dataset.val;
}

// ── Add panel toggle ───────────────────────────────────────────
function toggleAddPanel() {
  const body    = document.getElementById('addBody');
  const chevron = document.getElementById('addChevron');
  if (!body || !chevron) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
  if (!isOpen) {
    const di = document.getElementById('examDate');
    if (di) di.min = new Date().toISOString().split('T')[0];
    setTimeout(() => { const s = document.getElementById('examSubject'); if (s) s.focus(); }, 350);
  }
}

// ── Filter ────────────────────────────────────────────────────
function setFilter(btn) {
  document.querySelectorAll('.ex-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderItems();
}

// ── Submit ────────────────────────────────────────────────────
function submitExam(e) {
  e.preventDefault();
  const subject = (document.getElementById('examSubject')?.value || '').trim();
  const topic   = (document.getElementById('examTopic')?.value   || '').trim();
  const dueDate = document.getElementById('examDate')?.value;
  const notes   = (document.getElementById('itemNotes')?.value   || '').trim();
  const remDays = parseInt(document.getElementById('reminderDays')?.value || '3', 10);

  if (!subject || !topic || !dueDate) { showToast('Please fill in all required fields', 'error'); return; }
  if (getDaysLeft(dueDate) < 0)       { showToast('Date must be today or in the future', 'error'); return; }

  DB.addItem(currentUser.id, {
    type:               selectedType,
    subject, topic, dueDate,
    examDate:           dueDate,
    difficulty:         selectedType === 'exam' ? selectedDifficulty : 'medium',
    notes,
    reminderDaysBefore: selectedType === 'reminder' ? remDays : 0,
  });

  document.getElementById('examForm')?.reset();
  selectedDifficulty = 'medium';
  document.querySelectorAll('.ex-diff-chip').forEach(c => c.classList.remove('selected'));
  document.querySelector('.ex-diff-chip[data-val="medium"]')?.classList.add('selected');

  toggleAddPanel();
  showToast(`${TYPE_LABELS[selectedType]} added — schedule updated`, 'success');
  renderAll();
}

// ── Delete ────────────────────────────────────────────────────
function deleteExam(id, name) {
  if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;
  DB.deleteItem(id);
  showToast('Item deleted', 'success');
  renderAll();
}

// ── Summary ───────────────────────────────────────────────────
function updateSummary(items, sessions, completions) {
  const upcoming  = items.filter(i => getDaysLeft(i.dueDate || i.examDate) >= 0);
  const urgent    = upcoming.filter(i => getDaysLeft(i.dueDate || i.examDate) <= 7);
  const hoursLeft = upcoming.filter(i => i.type === 'exam').reduce((sum, e) => {
    return sum + Math.max(0, (DIFF_HOURS[e.difficulty] || 10) - getStudiedHours(e, sessions, completions));
  }, 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('sumTotal',    items.length);
  set('sumUpcoming', upcoming.length);
  set('sumUrgent',   urgent.length);
  set('sumHours',    Math.ceil(hoursLeft) + 'h');
}

// ── Render cards ──────────────────────────────────────────────
function renderItems() {
  const items       = DB.getItems(currentUser.id);
  const sessions    = DB.getSessions(currentUser.id);
  const completions = DB.getCompletions(currentUser.id);
  const grid        = document.getElementById('examsGrid');
  if (!grid) return;

  let filtered = [...items].sort((a, b) =>
    getDaysLeft(a.dueDate || a.examDate) - getDaysLeft(b.dueDate || b.examDate)
  );

  if (currentFilter === 'upcoming') filtered = filtered.filter(i => getDaysLeft(i.dueDate || i.examDate) >= 0);
  if (currentFilter === 'past')     filtered = filtered.filter(i => getDaysLeft(i.dueDate || i.examDate) <  0);
  if (currentFilter === 'exam')     filtered = filtered.filter(i => i.type === 'exam');
  if (currentFilter === 'project')  filtered = filtered.filter(i => i.type === 'project');
  if (currentFilter === 'reminder') filtered = filtered.filter(i => i.type === 'reminder');

  const labelMap = { all:'All', upcoming:'Upcoming', past:'Past', exam:'Exams', project:'Projects', reminder:'Reminders' };
  const listTitle = document.getElementById('listTitle');
  if (listTitle) listTitle.textContent = `${labelMap[currentFilter] || 'All'} (${filtered.length})`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="ex-empty">
        <div class="ex-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
        </div>
        <div class="ex-empty-title">Nothing here yet</div>
        <div class="ex-empty-sub">Add an item using the panel above to get started.</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((item, idx) => {
    const dateKey  = item.dueDate || item.examDate || '';
    const daysLeft = getDaysLeft(dateKey);
    const isPast   = daysLeft < 0;
    const isToday  = daysLeft === 0;
    const isUrgent = !isPast && daysLeft <= 3;
    const isSoon   = !isPast && !isUrgent && daysLeft <= 7;

    const daysClass = isPast ? 'past' : isUrgent ? 'urgent' : isSoon ? 'soon' : 'ok';
    const daysText  = isPast   ? `${Math.abs(daysLeft)}d ago` : isToday ? 'Today!' : `${daysLeft}`;
    const daysLabel = isPast   ? 'days ago' : isToday ? 'due today' : 'days left';

    const dateStr  = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const safeName = item.subject.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    const accentClass = item.type === 'exam' ? (item.difficulty || 'medium') : item.type;
    const pct         = getProgressPct(item, sessions, completions);
    const studiedH    = item.type === 'exam' ? getStudiedHours(item, sessions, completions) : 0;
    const requiredH   = DIFF_HOURS[item.difficulty] || 10;
    const typeIcon    = TYPE_ICONS[item.type] || TYPE_ICONS.exam;
    const typeLabel   = TYPE_LABELS[item.type] || 'Item';

    let reminderNote = '';
    if (item.type === 'reminder' && item.reminderDaysBefore > 0 && !isPast) {
      const notifyIn = daysLeft - item.reminderDaysBefore;
      reminderNote = notifyIn > 0
        ? `<span class="ex-badge" style="background:rgba(234,179,8,.12);color:hsl(38,80%,40%)">Notify in ${notifyIn}d</span>`
        : `<span class="ex-badge ex-badge-urgent">Notify now</span>`;
    }

    return `
      <div class="ex-card" style="animation-delay:${idx * .05}s">
        <div class="ex-card-accent ${accentClass}"></div>
        <div class="ex-card-body">
          <div class="ex-card-top">
            <span class="ex-card-name">${item.subject}</span>
            <span class="ex-card-topic">${item.topic}</span>
          </div>
          <div class="ex-card-meta">
            <span class="ex-badge ex-badge-type-${item.type}">${typeIcon} ${typeLabel}</span>
            ${item.type === 'exam' ? `<span class="ex-badge ex-badge-${item.difficulty}">${DIFF_LABELS[item.difficulty] || item.difficulty}</span>` : ''}
            <span class="ex-badge ex-badge-date">${dateStr}</span>
            ${isUrgent && !isPast ? '<span class="ex-badge ex-badge-urgent">Urgent</span>' : ''}
            ${isToday ? '<span class="ex-badge ex-badge-urgent">Today</span>' : ''}
            ${reminderNote}
          </div>
          ${item.notes ? `<div style="margin-top:.45rem;font-size:.78rem;color:var(--muted-foreground);font-style:italic">${item.notes}</div>` : ''}
          ${item.type === 'exam' && !isPast && pct !== null ? `
          <div class="ex-card-progress">
            <div class="ex-prog-label">
              <span>Study progress</span>
              <span>${studiedH.toFixed(1)}h / ${requiredH}h &nbsp;(${pct}%)</span>
            </div>
            <div class="ex-prog-bar">
              <div class="ex-prog-fill" style="width:${pct}%; background:${getProgressColor(item.difficulty)};"></div>
            </div>
          </div>` : ''}
        </div>
        <div class="ex-card-right">
          <div class="ex-days-left ${daysClass}">${daysText}</div>
          <div class="ex-days-lbl">${daysLabel}</div>
          <button class="ex-delete-btn" title="Delete" onclick="deleteExam('${item.id}','${safeName}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Full re-render ────────────────────────────────────────────
function renderAll() {
  const items       = DB.getItems(currentUser.id);
  const sessions    = DB.getSessions(currentUser.id);
  const completions = DB.getCompletions(currentUser.id);
  updateSummary(items, sessions, completions);
  renderItems();
}

renderAll();

} // end else