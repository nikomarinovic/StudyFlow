const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

const DIFFICULTY_HOURS = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DAILY_LIMIT = 2;

let currentWeekStart = getStartOfWeek(new Date());
let selectedDate = new Date();

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function fmtDate(date, fmt) {
  const d = new Date(date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (fmt === 'MMM d') return `${months[d.getMonth()]} ${d.getDate()}`;
  if (fmt === 'MMM d, yyyy') return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (fmt === 'EEEE') return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  if (fmt === 'EEE') return days[d.getDay()];
  if (fmt === 'd') return d.getDate().toString();
  return d.toDateString();
}

function generateSchedule(exams, sessions) {
  const scheduled = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dailySlots = {};
  const START = 9 * 60;
  const BREAK = 15;

  exams.forEach(exam => {
    try {
      const examDate = new Date(exam.examDate + 'T12:00:00');
      examDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((examDate - today) / 86400000);
      if (daysUntil <= 0) return;

      const totalH = DIFFICULTY_HOURS[exam.difficulty] || 10;
      const studiedH = sessions.filter(s => s.subject === exam.subject).reduce((sum, s) => sum + s.duration / 60, 0);
      let hoursLeft = Math.max(0, totalH - studiedH);
      if (hoursLeft <= 0) return;

      for (let i = 0; i < daysUntil && hoursLeft > 0; i++) {
        const day = addDays(today, i);
        const dayKey = day.toISOString().split('T')[0];
        if (!dailySlots[dayKey]) dailySlots[dayKey] = START;

        const daysRemaining = daysUntil - i;
        let sessionH;
        if (daysRemaining === 1) {
          sessionH = Math.min(DAILY_LIMIT, hoursLeft);
        } else {
          const avg = hoursLeft / daysRemaining;
          sessionH = avg <= 1 ? Math.min(1, hoursLeft) : Math.min(DAILY_LIMIT, hoursLeft);
        }
        if (sessionH < 0.5) continue;

        const mins = Math.round(sessionH * 60);
        const startMin = dailySlots[dayKey];
        const h = Math.floor(startMin / 60).toString().padStart(2, '0');
        const m = (startMin % 60).toString().padStart(2, '0');
        const colorClass = exam.difficulty === 'very-hard' ? 'very-danger' : exam.difficulty === 'hard' ? 'danger' : exam.difficulty === 'medium' ? 'warning' : 'success';

        scheduled.push({
          id: `sched-${exam.id}-${dayKey}`,
          subject: exam.subject, topic: exam.topic,
          time: `${h}:${m}`, duration: `${mins} min`,
          completed: false, color: colorClass, type: 'scheduled', date: new Date(day)
        });

        dailySlots[dayKey] = startMin + mins + BREAK;
        hoursLeft -= sessionH;
      }
    } catch(e) { console.error(e); }
  });
  return scheduled;
}

function renderWeekNav() {
  const end = addDays(currentWeekStart, 6);
  document.getElementById('weekRange').textContent = `${fmtDate(currentWeekStart, 'MMM d')} – ${fmtDate(end, 'MMM d, yyyy')}`;
}

function renderWeekGrid(exams, sessions, scheduled) {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeekStart, i);
    const daySessions = sessions.filter(s => isSameDay(new Date(s.completedAt), date)).map(s => ({ ...s, color: 'success' }));
    const dayScheduled = scheduled.filter(s => isSameDay(s.date, date));
    const dayExams = exams.filter(e => isSameDay(new Date(e.examDate + 'T12:00:00'), date)).map(e => ({ ...e, color: 'danger' }));
    const all = [...daySessions, ...dayScheduled, ...dayExams];

    const cell = document.createElement('button');
    cell.className = 'day-cell';
    if (isSameDay(date, selectedDate)) cell.classList.add('selected');
    if (isSameDay(date, new Date())) cell.classList.add('today');

    cell.innerHTML = `
      <div class="day-name">${fmtDate(date, 'EEE')}</div>
      <div class="day-number">${fmtDate(date, 'd')}</div>
      <div class="day-indicators">
        ${all.slice(0, 3).map(s => `<div class="indicator-bar ${s.color}"></div>`).join('')}
        ${all.length > 3 ? `<div class="more-indicator">+${all.length - 3}</div>` : ''}
      </div>`;

    cell.addEventListener('click', () => {
      selectedDate = date;
      renderWeekGrid(exams, sessions, scheduled);
      renderDayDetails(exams, sessions, scheduled);
    });
    grid.appendChild(cell);
  }
}

function renderDayDetails(exams, sessions, scheduled) {
  document.getElementById('selectedDayName').textContent = fmtDate(selectedDate, 'EEEE');
  document.getElementById('selectedDayDate').textContent = fmtDate(selectedDate, 'MMM d, yyyy');

  const daySessions = sessions.filter(s => isSameDay(new Date(s.completedAt), selectedDate)).map(s => ({
    subject: s.subject || 'General Study', topic: 'Study session',
    time: new Date(s.completedAt).toTimeString().slice(0, 5),
    duration: `${s.duration} min`, completed: true, type: 'session'
  }));
  const dayScheduled = scheduled.filter(s => isSameDay(s.date, selectedDate));
  const dayExams = exams.filter(e => isSameDay(new Date(e.examDate + 'T12:00:00'), selectedDate)).map(e => ({
    subject: e.subject, topic: e.topic, time: 'Exam Day', duration: '2h', completed: false, type: 'exam'
  }));

  const all = [...dayExams, ...dayScheduled, ...daySessions].sort((a, b) => {
    if (a.type === 'exam') return -1;
    if (b.type === 'exam') return 1;
    return a.time.localeCompare(b.time);
  });

  document.getElementById('sessionCount').textContent = all.length;
  document.getElementById('sessionLabel').textContent = all.length === 1 ? 'session' : 'sessions';

  const list = document.getElementById('sessionsList');
  if (all.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>No sessions for this day</p></div>`;
    document.getElementById('daySummary').style.display = 'none';
    return;
  }

  list.innerHTML = all.map((s, idx) => {
    const iconClass = s.type === 'exam' ? 'exam' : s.completed ? 'completed' : 'scheduled';
    const itemClass = s.type === 'exam' ? 'exam' : s.completed ? 'completed' : 'scheduled-item';
    const icon = s.type === 'exam'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
      : s.completed
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    return `
      <div class="session-item ${itemClass}" style="animation-delay:${idx*0.05}s">
        <div class="session-content">
          <div class="session-left">
            <div class="session-icon ${iconClass}">${icon}</div>
            <div class="session-info">
              <div class="session-subject">${s.subject}${s.type==='exam'?'<span class="session-badge exam">EXAM</span>':''}${s.type==='scheduled'?'<span class="session-badge scheduled">Scheduled</span>':''}</div>
              <div class="session-topic">${s.topic}</div>
            </div>
          </div>
          <div class="session-right">
            <div class="session-time">${s.time}</div>
            <div class="session-duration"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${s.duration}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  const totalMins = all.filter(s => s.type !== 'exam').reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0);
  const h = Math.floor(totalMins / 60), m = totalMins % 60;
  document.getElementById('totalTime').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('completedCount').textContent = `${all.filter(s => s.completed).length} / ${all.filter(s => s.type !== 'exam').length}`;
  document.getElementById('daySummary').style.display = 'block';
}

function init() {
  const exams = DB.getExams(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);
  const scheduled = generateSchedule(exams, sessions);

  renderWeekNav();
  renderWeekGrid(exams, sessions, scheduled);
  renderDayDetails(exams, sessions, scheduled);

  document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderWeekNav();
    renderWeekGrid(exams, sessions, scheduled);
  });
  document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderWeekNav();
    renderWeekGrid(exams, sessions, scheduled);
  });
}

document.addEventListener('DOMContentLoaded', init);

} // end else