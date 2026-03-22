const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

const DIFFICULTY_HOURS = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DAILY_LIMIT = 2;

let currentWeekStart = getStartOfWeek(new Date());
let selectedDate     = new Date();

// Cache for generated schedule (regenerated when needed)
let _scheduleCache   = null;

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0,0,0,0);
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
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const short    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (fmt === 'MMM d')      return `${months[d.getMonth()]} ${d.getDate()}`;
  if (fmt === 'MMM d, yyyy')return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (fmt === 'EEEE')       return weekdays[d.getDay()];
  if (fmt === 'EEE')        return short[d.getDay()];
  if (fmt === 'd')          return d.getDate().toString();
  return d.toDateString();
}

// ── Schedule generator ────────────────────────────────────────
function generateSchedule(items, sessions) {
  const scheduled = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const dailySlots = {};
  const START = 9 * 60;
  const BREAK = 15;

  // Only generate study sessions for exam-type items
  items.filter(i => i.type === 'exam').forEach(exam => {
    try {
      const dateKey  = exam.dueDate || exam.examDate || '';
      const examDate = new Date(dateKey + 'T12:00:00');
      examDate.setHours(0,0,0,0);
      const daysUntil = Math.ceil((examDate - today) / 86400000);
      if (daysUntil <= 0) return;

      const totalH   = DIFFICULTY_HOURS[exam.difficulty] || 10;
      const studiedH = sessions.filter(s => s.subject === exam.subject).reduce((sum, s) => sum + s.duration/60, 0);
      let hoursLeft  = Math.max(0, totalH - studiedH);
      if (hoursLeft <= 0) return;

      for (let i = 0; i < daysUntil && hoursLeft > 0; i++) {
        const day    = addDays(today, i);
        const dayKey = day.toISOString().split('T')[0];
        if (!dailySlots[dayKey]) dailySlots[dayKey] = START;

        const daysRemaining = daysUntil - i;
        let sessionH;
        if (daysRemaining === 1) sessionH = Math.min(DAILY_LIMIT, hoursLeft);
        else {
          const avg = hoursLeft / daysRemaining;
          sessionH = avg <= 1 ? Math.min(1, hoursLeft) : Math.min(DAILY_LIMIT, hoursLeft);
        }
        if (sessionH < 0.5) continue;

        const mins     = Math.round(sessionH * 60);
        const startMin = dailySlots[dayKey];
        const h = Math.floor(startMin/60).toString().padStart(2,'0');
        const m = (startMin%60).toString().padStart(2,'0');
        const blockId  = `sched-${exam.id}-${dayKey}`;
        const color    = exam.difficulty === 'very-hard' ? 'very-danger'
                       : exam.difficulty === 'hard'      ? 'danger'
                       : exam.difficulty === 'medium'    ? 'warning'
                                                         : 'success';

        scheduled.push({
          id: blockId, blockId,
          subject: exam.subject, topic: exam.topic,
          time: `${h}:${m}`, durationMinutes: mins,
          duration: `${mins} min`,
          color, type: 'scheduled',
          date: new Date(day),
          examId: exam.id
        });

        dailySlots[dayKey] = startMin + mins + BREAK;
        hoursLeft -= sessionH;
      }
    } catch(e) { console.error(e); }
  });

  // Add reminder/project "event" blocks on their due date and reminder-notify days
  items.filter(i => i.type !== 'exam').forEach(item => {
    try {
      const dateKey  = item.dueDate || item.examDate || '';
      const dueDate  = new Date(dateKey + 'T12:00:00');
      dueDate.setHours(0,0,0,0);
      if (dueDate < today) return;

      const color = item.type === 'project' ? 'project' : 'reminder';

      // Push event on due day
      scheduled.push({
        id: `event-${item.id}-due`,
        blockId: `event-${item.id}-due`,
        subject: item.subject, topic: item.topic,
        time: '—', durationMinutes: 0,
        duration: '—',
        color, type: item.type,
        date: new Date(dueDate),
        notes: item.notes || ''
      });

      // Reminder: also push a notify block N days before
      if (item.type === 'reminder' && item.reminderDaysBefore > 0) {
        const notifyDate = addDays(dueDate, -item.reminderDaysBefore);
        if (notifyDate >= today) {
          scheduled.push({
            id: `event-${item.id}-notify`,
            blockId: `event-${item.id}-notify`,
            subject: `Reminder: ${item.subject}`, topic: item.topic,
            time: '—', durationMinutes: 0,
            duration: '—',
            color: 'reminder-notify', type: 'reminder-notify',
            date: new Date(notifyDate),
            notes: item.notes || ''
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
  t.innerHTML = `+${points} pts <span style="font-size:.85em;opacity:.8">Study Score</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 2200);
}

// ── Toggle completion ──────────────────────────────────────────
function toggleComplete(blockId, subject, durationMinutes) {
  const alreadyDone = DB.isCompleted(currentUser.id, blockId);
  if (alreadyDone) {
    DB.uncompleteBlock(currentUser.id, blockId);
    refresh();
    return;
  }
  const gained = DB.completeBlock(currentUser.id, blockId, { subject, durationMinutes });
  if (gained) {
    const pts = Math.round(durationMinutes * 1.5);
    showScoreToast(pts);
    refresh();
  }
}

// ── Week nav ───────────────────────────────────────────────────
function renderWeekNav() {
  const end = addDays(currentWeekStart, 6);
  document.getElementById('weekRange').textContent =
    `${fmtDate(currentWeekStart,'MMM d')} – ${fmtDate(end,'MMM d, yyyy')}`;
}

// ── Week grid ──────────────────────────────────────────────────
function renderWeekGrid(items, sessions, scheduled) {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const date       = addDays(currentWeekStart, i);
    const daySessions = sessions.filter(s => isSameDay(new Date(s.completedAt), date)).map(s => ({...s, color:'success'}));
    const dayScheduled = scheduled.filter(s => isSameDay(s.date, date));
    const all = [...daySessions, ...dayScheduled];

    const cell = document.createElement('button');
    cell.className = 'day-cell';
    if (isSameDay(date, selectedDate)) cell.classList.add('selected');
    if (isSameDay(date, new Date()))   cell.classList.add('today');

    // Count completed vs total study blocks
    const studyBlocks = dayScheduled.filter(b => b.type === 'scheduled');
    const doneCount   = studyBlocks.filter(b => DB.isCompleted(currentUser.id, b.blockId)).length;

    cell.innerHTML = `
      <div class="day-name">${fmtDate(date,'EEE')}</div>
      <div class="day-number">${fmtDate(date,'d')}</div>
      <div class="day-indicators">
        ${all.slice(0,3).map(s => `<div class="indicator-bar ${s.color}"></div>`).join('')}
        ${all.length > 3 ? `<div class="more-indicator">+${all.length-3}</div>` : ''}
      </div>
      ${studyBlocks.length > 0 ? `<div class="day-prog-text">${doneCount}/${studyBlocks.length}</div>` : ''}`;

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

  const daySessions = sessions.filter(s => isSameDay(new Date(s.completedAt), selectedDate)).map(s => ({
    subject: s.subject || 'General Study',
    topic: 'Timer study session',
    time: new Date(s.completedAt).toTimeString().slice(0,5),
    durationMinutes: s.duration,
    duration: `${s.duration} min`,
    completed: true, type: 'session', blockId: null
  }));

  const dayScheduled = scheduled.filter(s => isSameDay(s.date, selectedDate));

  // Mark completions
  const enriched = dayScheduled.map(b => ({
    ...b,
    completed: b.type === 'scheduled' ? DB.isCompleted(currentUser.id, b.blockId) : false
  }));

  const all = [...enriched, ...daySessions].sort((a,b) => {
    if (a.type === 'exam' || a.type === 'project') return -1;
    if (b.type === 'exam' || b.type === 'project') return  1;
    const ta = a.time === '—' ? '00:00' : a.time;
    const tb = b.time === '—' ? '00:00' : b.time;
    return ta.localeCompare(tb);
  });

  document.getElementById('sessionCount').textContent = all.length;
  document.getElementById('sessionLabel').textContent  = all.length === 1 ? 'item' : 'items';

  const list = document.getElementById('sessionsList');
  if (all.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Nothing scheduled for this day</p></div>`;
    document.getElementById('daySummary').style.display = 'none';
    return;
  }

  list.innerHTML = all.map((s, idx) => {
    const isStudy = s.type === 'scheduled';
    const isDone  = s.completed;
    const scoreGain = isStudy ? Math.round((s.durationMinutes || 0) * 1.5) : 0;

    // Type label + icon
    let typeBadge = '';
    let typeIcon  = '';
    if (s.type === 'session') {
      typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
      typeBadge = '';
    } else if (s.type === 'scheduled') {
      typeIcon = isDone
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
      typeBadge = `<span class="session-badge scheduled">Study</span>`;
    } else if (s.type === 'project') {
      typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`;
      typeBadge = `<span class="session-badge" style="background:rgba(59,130,246,.12);color:hsl(221,83%,53%)">Project</span>`;
    } else if (s.type === 'reminder') {
      typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
      typeBadge = `<span class="session-badge" style="background:rgba(234,179,8,.12);color:hsl(38,80%,40%)">Reminder</span>`;
    } else if (s.type === 'reminder-notify') {
      typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
      typeBadge = `<span class="session-badge" style="background:rgba(239,68,68,.12);color:var(--destructive)">Notify</span>`;
    }

    const checkBtn = isStudy ? `
      <button class="cal-check-btn ${isDone ? 'done' : ''}"
        onclick="toggleComplete('${s.blockId}','${(s.subject||'').replace(/'/g,"\\'")}',${s.durationMinutes||0})"
        title="${isDone ? 'Mark incomplete' : 'Mark complete'}">
        ${isDone
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
        }
        ${isDone ? 'Done' : 'Mark done'}
      </button>` : '';

    const scoreTag = isStudy && !isDone
      ? `<div class="cal-score-tag">+${scoreGain} pts on complete</div>`
      : isDone ? `<div class="cal-score-tag done">✓ +${scoreGain} pts earned</div>` : '';

    return `
      <div class="session-item ${isDone ? 'completed' : s.type === 'session' ? 'completed' : 'scheduled-item'}" style="animation-delay:${idx*.05}s">
        <div class="session-content">
          <div class="session-left">
            <div class="session-icon ${isDone ? 'completed' : s.type}">${typeIcon}</div>
            <div class="session-info">
              <div class="session-subject">${s.subject}${typeBadge}</div>
              <div class="session-topic">${s.topic}</div>
              ${s.notes ? `<div style="font-size:.72rem;color:var(--muted-foreground);margin-top:.15rem;font-style:italic">${s.notes}</div>` : ''}
              ${scoreTag}
            </div>
          </div>
          <div class="session-right">
            <div class="session-time">${s.time}</div>
            ${s.duration !== '—' ? `<div class="session-duration"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${s.duration}</div>` : ''}
            ${checkBtn}
          </div>
        </div>
      </div>`;
  }).join('');

  const studyItems = all.filter(s => s.type === 'scheduled' || s.type === 'session');
  const totalMins  = studyItems.reduce((sum, s) => sum + (s.durationMinutes || parseInt(s.duration) || 0), 0);
  const h = Math.floor(totalMins/60), m = totalMins%60;
  document.getElementById('totalTime').textContent    = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('completedCount').textContent =
    `${all.filter(s => s.completed).length} / ${studyItems.length}`;
  document.getElementById('daySummary').style.display = 'block';
}

// ── Full refresh ───────────────────────────────────────────────
function refresh() {
  const items    = DB.getItems(currentUser.id);
  const exams    = DB.getExams(currentUser.id);  // legacy compat
  // Merge legacy exams not already in items
  const itemIds  = new Set(items.map(i => i.id));
  const allItems = [...items, ...exams.filter(e => !itemIds.has(e.id)).map(e => ({...e, type:'exam', dueDate: e.examDate}))];
  const sessions = DB.getSessions(currentUser.id);
  const scheduled = generateSchedule(allItems, sessions);

  renderWeekNav();
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
}

document.addEventListener('DOMContentLoaded', init);

} // end else