const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

const DIFFICULTY_HOURS = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DAILY_LIMIT      = 2;
const CIRCUMFERENCE    = 2 * Math.PI * 22; // for 52×52 SVG ring r=22 → ~138.2

let currentWeekStart = getStartOfWeek(new Date());
let selectedDate     = new Date();

// ── Utilities ─────────────────────────────────────────────────
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function fmtDate(date, fmt) {
  const d = new Date(date);
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekdays= ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const short   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (fmt==='MMM d')       return `${months[d.getMonth()]} ${d.getDate()}`;
  if (fmt==='MMM d, yyyy') return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (fmt==='EEEE')        return weekdays[d.getDay()];
  if (fmt==='EEE')         return short[d.getDay()];
  if (fmt==='d')           return d.getDate().toString();
  if (fmt==='MMMM yyyy')   return `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`;
  return d.toDateString();
}
function diffColor(difficulty) {
  if (difficulty==='very-hard') return 'very-danger';
  if (difficulty==='hard')      return 'danger';
  if (difficulty==='medium')    return 'warning';
  return 'success';
}

// ── Schedule generator ────────────────────────────────────────
function generateSchedule(items, sessions) {
  const scheduled  = [];
  const today      = new Date(); today.setHours(0,0,0,0);
  const dailySlots = {};
  const START      = 9 * 60;
  const BREAK      = 15;

  items.filter(i => i.type === 'exam').forEach(exam => {
    try {
      const dateKey  = exam.dueDate || exam.examDate || '';
      const examDate = new Date(dateKey + 'T12:00:00');
      examDate.setHours(0,0,0,0);
      const daysUntil = Math.ceil((examDate - today) / 86400000);
      const color     = diffColor(exam.difficulty);

      // Exam-day marker
      scheduled.push({
        id: `examday-${exam.id}`, blockId: `examday-${exam.id}`,
        subject: exam.subject, topic: exam.topic || '',
        time: '—', durationMinutes: 0, duration: '—',
        color: 'exam-day', type: 'exam-day',
        date: new Date(examDate), examId: exam.id,
        difficulty: exam.difficulty
      });

      if (daysUntil <= 0) return;

      const totalH   = DIFFICULTY_HOURS[exam.difficulty] || 10;
      const studiedH = sessions.filter(s => s.subject === exam.subject)
                               .reduce((sum,s) => sum + s.duration/60, 0);
      let hoursLeft  = Math.max(0, totalH - studiedH);
      if (hoursLeft <= 0) return;

      const daysNeeded   = Math.ceil(hoursLeft / DAILY_LIMIT);
      const daysToUse    = Math.min(daysNeeded, daysUntil);
      const scheduleFrom = addDays(examDate, -daysToUse);
      scheduleFrom.setHours(0,0,0,0);
      const startFrom  = scheduleFrom < today ? today : scheduleFrom;
      const actualDays = Math.ceil((examDate - startFrom) / 86400000);
      if (actualDays <= 0) return;

      for (let i = 0; i < actualDays && hoursLeft > 0; i++) {
        const day    = addDays(startFrom, i);
        const dayKey = day.toISOString().split('T')[0];
        if (!dailySlots[dayKey]) dailySlots[dayKey] = START;

        const daysRemaining = actualDays - i;
        const sessionH = Math.min(DAILY_LIMIT, Math.ceil((hoursLeft / daysRemaining) * 2) / 2);
        if (sessionH < 0.5) { hoursLeft = 0; break; }

        const mins     = Math.round(sessionH * 60);
        const startMin = dailySlots[dayKey];
        const h = Math.floor(startMin/60).toString().padStart(2,'0');
        const m = (startMin%60).toString().padStart(2,'0');
        const blockId  = `sched-${exam.id}-${dayKey}`;

        scheduled.push({
          id: blockId, blockId,
          subject: exam.subject, topic: exam.topic,
          time: `${h}:${m}`, durationMinutes: mins,
          duration: `${mins} min`,
          color, type: 'scheduled',
          date: new Date(day), examId: exam.id,
          difficulty: exam.difficulty
        });

        dailySlots[dayKey] = startMin + mins + BREAK;
        hoursLeft -= sessionH;
      }
    } catch(e) { console.error(e); }
  });

  items.filter(i => i.type !== 'exam').forEach(item => {
    try {
      const dateKey = item.dueDate || item.examDate || '';
      const dueDate = new Date(dateKey + 'T12:00:00');
      dueDate.setHours(0,0,0,0);
      if (dueDate < today) return;
      const color = item.type === 'project' ? 'project' : 'reminder';

      scheduled.push({
        id: `event-${item.id}-due`, blockId: `event-${item.id}-due`,
        subject: item.subject, topic: item.topic,
        time: '—', durationMinutes: 0, duration: '—',
        color, type: item.type,
        date: new Date(dueDate), notes: item.notes || ''
      });

      if (item.type === 'reminder' && item.reminderDaysBefore > 0) {
        const notifyDate = addDays(dueDate, -item.reminderDaysBefore);
        if (notifyDate >= today) {
          scheduled.push({
            id: `event-${item.id}-notify`, blockId: `event-${item.id}-notify`,
            subject: `Reminder: ${item.subject}`, topic: item.topic,
            time: '—', durationMinutes: 0, duration: '—',
            color: 'reminder-notify', type: 'reminder-notify',
            date: new Date(notifyDate), notes: item.notes || ''
          });
        }
      }
    } catch(e) { console.error(e); }
  });

  return scheduled;
}

// ── Score toast ────────────────────────────────────────────────
function showScoreToast(points) {
  const t = document.createElement('div');
  t.className = 'cal-score-toast';
  t.innerHTML = `+${points} pts <span style="font-size:.85em;opacity:.75">Study Score</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 2400);
}

// ── Toggle completion ──────────────────────────────────────────
function toggleComplete(blockId, subject, durationMinutes) {
  if (DB.isCompleted(currentUser.id, blockId)) {
    DB.uncompleteBlock(currentUser.id, blockId);
  } else {
    const gained = DB.completeBlock(currentUser.id, blockId, { subject, durationMinutes });
    if (gained) showScoreToast(Math.round(durationMinutes * 1.5));
  }
  refresh();
}

// ── Week nav ───────────────────────────────────────────────────
function renderWeekNav() {
  const end = addDays(currentWeekStart, 6);
  document.getElementById('weekRange').textContent =
    `${fmtDate(currentWeekStart,'MMM d')} – ${fmtDate(end,'MMM d, yyyy')}`;
}

// ── Week progress + summary ────────────────────────────────────
function renderWeekProgress(scheduled) {
  // Build set of ISO date strings for the current week
  const weekDays = new Set();
  for (let i = 0; i < 7; i++) weekDays.add(addDays(currentWeekStart, i).toISOString().split('T')[0]);

  const inWeek = s => weekDays.has(new Date(s.date).toISOString().split('T')[0]);

  const studyBlocks   = scheduled.filter(s => s.type === 'scheduled' && inWeek(s));
  const total         = studyBlocks.length;
  const completed     = studyBlocks.filter(s => DB.isCompleted(currentUser.id, s.blockId)).length;
  const pct           = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalMins     = studyBlocks.reduce((sum,s) => sum + (s.durationMinutes||0), 0);
  const examsThisWeek = scheduled.filter(s => s.type === 'exam-day' && inWeek(s)).length;

  document.getElementById('weekProgressFill').style.width = pct + '%';
  document.getElementById('weekProgressPct').textContent  = pct + '%';
  document.getElementById('weekProgressLabel').textContent =
    `Week progress — ${completed} of ${total} sessions done`;

  document.getElementById('wssCompleted').textContent = completed;
  document.getElementById('wssTotal').textContent     = total;
  const h = Math.floor(totalMins/60), m = totalMins%60;
  document.getElementById('wssHours').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('wssExams').textContent  = examsThisWeek;
}

// ── Week grid ──────────────────────────────────────────────────
function renderWeekGrid(items, sessions, scheduled) {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  const CIRC_SMALL = 2 * Math.PI * 9; // r=9 for the small day-cell rings

  for (let i = 0; i < 7; i++) {
    const date        = addDays(currentWeekStart, i);
    const dayScheduled = scheduled.filter(s => isSameDay(s.date, date));
    const studyBlocks  = dayScheduled.filter(b => b.type === 'scheduled');
    const doneCount    = studyBlocks.filter(b => DB.isCompleted(currentUser.id, b.blockId)).length;
    const hasExam      = dayScheduled.some(b => b.type === 'exam-day');
    const pct          = studyBlocks.length > 0 ? doneCount / studyBlocks.length : 0;
    const offset       = CIRC_SMALL - pct * CIRC_SMALL;
    const ringColor    = pct === 1 ? 'var(--success)' : 'var(--primary)';

    const cell = document.createElement('button');
    cell.className = 'day-cell';
    if (isSameDay(date, selectedDate)) cell.classList.add('selected');
    if (isSameDay(date, new Date()))   cell.classList.add('today');
    if (hasExam)                       cell.classList.add('exam-day-cell');

    const indicators = dayScheduled.slice(0,3).map(s =>
      `<div class="indicator-bar ${s.color}"></div>`).join('') +
      (dayScheduled.length > 3 ? `<div class="more-indicator">+${dayScheduled.length-3}</div>` : '');

    const ringHtml = studyBlocks.length > 0 ? `
      <div class="day-ring-wrap">
        <svg viewBox="0 0 22 22">
          <circle class="day-ring-bg"   cx="11" cy="11" r="9"/>
          <circle class="day-ring-fill" cx="11" cy="11" r="9"
            stroke="${hasExam ? 'rgba(255,255,255,.7)' : ringColor}"
            stroke-dasharray="${CIRC_SMALL.toFixed(1)}"
            stroke-dashoffset="${offset.toFixed(1)}"/>
        </svg>
      </div>` : '';

    cell.innerHTML = `
      ${ringHtml}
      <div class="day-name">${fmtDate(date,'EEE')}</div>
      <div class="day-number">${fmtDate(date,'d')}</div>
      <div class="day-indicators">${indicators}</div>
      ${hasExam
        ? `<div class="exam-day-pill">Exam</div>`
        : studyBlocks.length > 0
          ? `<div class="day-prog-text">${doneCount}/${studyBlocks.length}</div>`
          : ''}`;

    cell.addEventListener('click', () => {
      selectedDate = date;
      renderWeekGrid(items, sessions, scheduled);
      renderDayDetails(items, sessions, scheduled);
    });
    grid.appendChild(cell);
  }
}

// ── Day details ────────────────────────────────────────────────
function renderDayDetails(items, sessions, scheduled) {
  document.getElementById('selectedDayName').textContent = fmtDate(selectedDate,'EEEE');
  document.getElementById('selectedDayDate').textContent = fmtDate(selectedDate,'MMM d, yyyy');

  const daySessions = sessions
    .filter(s => isSameDay(new Date(s.completedAt), selectedDate))
    .map(s => ({
      subject: s.subject || 'General Study',
      topic: 'Timer study session',
      time: new Date(s.completedAt).toTimeString().slice(0,5),
      durationMinutes: s.duration,
      duration: `${s.duration} min`,
      completed: true, type: 'session', blockId: null, color: 'success'
    }));

  const dayScheduled = scheduled.filter(s => isSameDay(s.date, selectedDate));
  const enriched     = dayScheduled.map(b => ({
    ...b,
    completed: b.type === 'scheduled' ? DB.isCompleted(currentUser.id, b.blockId) : false
  }));

  const all = [...enriched, ...daySessions].sort((a,b) => {
    if (a.type === 'exam-day') return -1;
    if (b.type === 'exam-day') return  1;
    if (a.type === 'project')  return -1;
    if (b.type === 'project')  return  1;
    const ta = a.time === '—' ? '00:00' : a.time;
    const tb = b.time === '—' ? '00:00' : b.time;
    return ta.localeCompare(tb);
  });

  document.getElementById('sessionCount').textContent = all.length;
  document.getElementById('sessionLabel').textContent  = all.length === 1 ? 'item' : 'items';

  // Update completion ring — only count actual study blocks
  const studyAll = all.filter(s => s.type === 'scheduled' || s.type === 'session');
  const doneAll  = studyAll.filter(s => s.completed).length;
  const ringPct  = studyAll.length > 0 ? doneAll / studyAll.length : 0;
  const dcrFill  = document.getElementById('dcrFill');
  const dcrText  = document.getElementById('dcrText');
  const circ     = 2 * Math.PI * 22; // matches r=22 in the SVG
  dcrFill.setAttribute('stroke-dasharray',  circ.toFixed(1));
  dcrFill.setAttribute('stroke-dashoffset', (circ - ringPct * circ).toFixed(1));
  dcrFill.style.stroke = ringPct === 1 ? 'var(--success)' : 'var(--primary)';
  dcrText.textContent  = Math.round(ringPct * 100) + '%';

  const list = document.getElementById('sessionsList');
  if (all.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Nothing scheduled for this day</p>
      </div>`;
    document.getElementById('daySummary').style.display = 'none';
    return;
  }

  list.innerHTML = all.map((s, idx) => {
    const isStudy  = s.type === 'scheduled';
    const isDone   = s.completed;
    const scoreGain = isStudy ? Math.round((s.durationMinutes||0) * 1.5) : 0;

    // ── Exam day banner ─────────────────────────────────────
    if (s.type === 'exam-day') {
      return `
        <div class="exam-day-block" style="animation-delay:${idx*.05}s">
          <div class="exam-day-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              <polyline points="10 2 10 10 13 7 16 10 16 2"/>
            </svg>
          </div>
          <div>
            <div class="exam-day-label">Exam Today</div>
            <div>${s.subject}${s.topic ? ' — ' + s.topic : ''}</div>
          </div>
        </div>`;
    }

    // ── Project card ─────────────────────────────────────────
    if (s.type === 'project') {
      return `
        <div class="event-card event-card--project" style="animation-delay:${idx*.05}s">
          <div class="event-card__accent"></div>
          <div class="event-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <div class="event-card__body">
            <div class="event-card__label">Project Due</div>
            <div class="event-card__subject">${s.subject}</div>
            ${s.topic ? `<div class="event-card__topic">${s.topic}</div>` : ''}
            ${s.notes ? `<div class="event-card__notes">${s.notes}</div>` : ''}
          </div>
          <div class="event-card__badge">DUE</div>
        </div>`;
    }

    // ── Reminder card ────────────────────────────────────────
    if (s.type === 'reminder') {
      return `
        <div class="event-card event-card--reminder" style="animation-delay:${idx*.05}s">
          <div class="event-card__accent"></div>
          <div class="event-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="event-card__body">
            <div class="event-card__label">Reminder</div>
            <div class="event-card__subject">${s.subject}</div>
            ${s.topic ? `<div class="event-card__topic">${s.topic}</div>` : ''}
            ${s.notes ? `<div class="event-card__notes">${s.notes}</div>` : ''}
          </div>
          <div class="event-card__badge">TODAY</div>
        </div>`;
    }

    // ── Reminder notify card ─────────────────────────────────
    if (s.type === 'reminder-notify') {
      return `
        <div class="event-card event-card--notify" style="animation-delay:${idx*.05}s">
          <div class="event-card__accent"></div>
          <div class="event-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="event-card__body">
            <div class="event-card__label">Upcoming Reminder</div>
            <div class="event-card__subject">${s.subject.replace('Reminder: ','')}</div>
            ${s.topic ? `<div class="event-card__topic">${s.topic}</div>` : ''}
            ${s.notes ? `<div class="event-card__notes">${s.notes}</div>` : ''}
          </div>
          <div class="event-card__badge">SOON</div>
        </div>`;
    }

    // ── Study session / timer session ────────────────────────
    let typeIcon = '';
    if (s.type === 'session') {
      typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
    } else {
      typeIcon = isDone
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    }

    const diffDot = isStudy && s.color
      ? `<span class="diff-dot ${s.color}"></span>` : '';

    const typeBadge = s.type === 'scheduled'
      ? `<span class="session-badge scheduled">Study</span>` : '';

    const checkBtn = isStudy ? `
      <button class="cal-check-btn ${isDone?'done':''}"
        onclick="toggleComplete('${s.blockId}','${(s.subject||'').replace(/'/g,"\\'")}',${s.durationMinutes||0})"
        title="${isDone?'Mark incomplete':'Mark complete'}">
        ${isDone
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`}
        ${isDone ? 'Done' : 'Mark done'}
      </button>` : '';

    const scoreTag = isStudy && !isDone
      ? `<div class="cal-score-tag"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>+${scoreGain} pts on complete</div>`
      : isDone
        ? `<div class="cal-score-tag done"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>+${scoreGain} pts earned</div>`
        : '';

    const cardClass = isDone ? 'completed'
      : s.type === 'session' ? 'completed' : 'scheduled-item';

    return `
      <div class="session-item ${cardClass}" data-color="${s.color||''}" style="animation-delay:${idx*.05}s">
        <div class="session-content">
          <div class="session-left">
            <div class="session-icon ${isDone?'completed':s.type}">${typeIcon}</div>
            <div class="session-info">
              <div class="session-subject">${diffDot}${s.subject}${typeBadge}</div>
              <div class="session-topic">${s.topic||''}</div>
              ${scoreTag}
            </div>
          </div>
          <div class="session-right">
            <div class="session-time">${s.time}</div>
            ${s.duration!=='—' ? `<div class="session-duration"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${s.duration}</div>` : ''}
            ${checkBtn}
          </div>
        </div>
      </div>`;
  }).join('');

  const studyItems = all.filter(s => s.type==='scheduled' || s.type==='session');
  const totalMins  = studyItems.reduce((sum,s) => sum + (s.durationMinutes || parseInt(s.duration)||0), 0);
  const h = Math.floor(totalMins/60), m = totalMins%60;
  document.getElementById('totalTime').textContent =
    h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('completedCount').textContent =
    `${all.filter(s => s.completed).length} / ${studyItems.length}`;
  document.getElementById('daySummary').style.display = 'block';
}

// ── Full refresh ───────────────────────────────────────────────
function refresh() {
  const items    = DB.getItems(currentUser.id);
  const exams    = DB.getExams(currentUser.id);
  const itemIds  = new Set(items.map(i => i.id));
  const allItems = [...items, ...exams.filter(e => !itemIds.has(e.id))
                                       .map(e => ({...e, type:'exam', dueDate: e.examDate}))];
  const sessions  = DB.getSessions(currentUser.id);
  const scheduled = generateSchedule(allItems, sessions);

  renderWeekNav();
  renderWeekProgress(scheduled);
  renderWeekGrid(allItems, sessions, scheduled);
  renderDayDetails(allItems, sessions, scheduled);
}

function init() {
  refresh();

  document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    refresh();
  });
  document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    refresh();
  });
  document.getElementById('jumpToday').addEventListener('click', () => {
    currentWeekStart = getStartOfWeek(new Date());
    selectedDate     = new Date();
    refresh();
  });
}

document.addEventListener('DOMContentLoaded', init);

} // end else