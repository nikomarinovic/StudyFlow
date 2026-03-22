// Auth guard — redirect and stop cleanly
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateReadable(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateStats(stats, sessions) {
  const studyScore = Math.floor((stats.totalStudyHours || 0) * 100);
  document.getElementById('studyScore').textContent = studyScore;
  document.getElementById('streak').textContent = stats.streak || 0;

  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === today);
  const todayHours = todaySessions.reduce((sum, s) => sum + (s.duration / 60), 0);
  document.getElementById('todayHours').textContent = todayHours.toFixed(1);

  const weekStart = getWeekStart();
  const weekSessions = sessions.filter(s => new Date(s.completedAt) >= weekStart);
  const weekHours = weekSessions.reduce((sum, s) => sum + (s.duration / 60), 0);
  const weeklyGoal = Math.min(100, Math.floor((weekHours / 20) * 100));
  document.getElementById('goalPercentage').textContent = weeklyGoal + '%';
  document.getElementById('progressFill').style.width = weeklyGoal + '%';
}

function updateSchedule(exams, sessions) {
  const scheduleList = document.getElementById('scheduleList');
  const todaySchedule = [];
  const today = new Date().toDateString();
  const todayISO = formatDate(new Date());

  const todayExams = exams.filter(e => e.examDate === todayISO).map(e => ({
    time: '09:00', subject: e.subject, topic: e.topic, duration: '2 hours', type: 'exam'
  }));
  todaySchedule.push(...todayExams);

  const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === today).map(s => ({
    time: new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    subject: s.subject || 'General Study',
    topic: 'Study session',
    duration: `${s.duration} min`,
    type: 'completed'
  }));
  todaySchedule.push(...todaySessions);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let currentSlot = 9 * 60;
  exams.forEach(exam => {
    const examDate = new Date(exam.examDate + 'T12:00:00');
    examDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((examDate - now) / 86400000);
    if (daysUntil <= 0) return;
    const diffHours = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
    const totalH = diffHours[exam.difficulty] || 10;
    const studiedH = sessions.filter(s => s.subject === exam.subject).reduce((sum, s) => sum + s.duration / 60, 0);
    const remaining = Math.max(0, totalH - studiedH);
    if (remaining <= 0) return;
    const sessionH = daysUntil === 1 ? Math.min(2, remaining) : Math.min(2, remaining / Math.min(daysUntil, 7));
    if (sessionH < 0.5) return;
    const mins = Math.round(sessionH * 60);
    const h = Math.floor(currentSlot / 60).toString().padStart(2, '0');
    const m = (currentSlot % 60).toString().padStart(2, '0');
    currentSlot += mins + 15;
    todaySchedule.push({ time: `${h}:${m}`, subject: exam.subject, topic: exam.topic, duration: `${mins} min`, type: 'scheduled' });
  });

  todaySchedule.sort((a, b) => {
    if (a.type === 'exam') return -1;
    if (b.type === 'exam') return 1;
    return a.time.localeCompare(b.time);
  });

  if (todaySchedule.length === 0) {
    scheduleList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
        <p>No activities scheduled for today</p>
        <a href="timer.html" class="btn-outline btn-sm">Start a study session</a>
      </div>`;
  } else {
    scheduleList.innerHTML = todaySchedule.map(item => `
      <div class="schedule-item ${item.type}">
        <div class="schedule-time">${item.time}</div>
        <div class="schedule-indicator ${item.type}"></div>
        <div class="schedule-content">
          <div class="schedule-subject">
            ${item.subject}
            ${item.type === 'exam' ? '<span class="schedule-badge exam">EXAM</span>' : ''}
            ${item.type === 'scheduled' ? '<span class="schedule-badge scheduled">Scheduled</span>' : ''}
          </div>
          <div class="schedule-topic">${item.topic}</div>
        </div>
        <div class="schedule-duration">${item.duration}</div>
      </div>`).join('');
  }
}

function updateExams(exams) {
  const examsList = document.getElementById('examsList');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = exams
    .filter(e => new Date(e.examDate + 'T12:00:00') >= today)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
    .slice(0, 5);

  if (upcoming.length === 0) {
    examsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
        <p>No upcoming exams</p>
      </div>`;
  } else {
    examsList.innerHTML = upcoming.map(exam => {
      const daysLeft = Math.ceil((new Date(exam.examDate + 'T12:00:00') - today) / 86400000);
      return `
        <div class="exam-item">
          <div class="exam-header">
            <span class="exam-subject">${exam.subject}</span>
            <span class="exam-badge">${daysLeft}d left</span>
          </div>
          <div class="exam-topic">${exam.topic}</div>
          <div class="exam-date">${formatDateReadable(exam.examDate)}</div>
        </div>`;
    }).join('');
  }
}

function updateChart(sessions) {
  const chart = document.getElementById('weeklyChart');
  const weekStart = getWeekStart();
  const weekData = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = day.toDateString();
    const daySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === dayStr);
    const hours = daySessions.reduce((sum, s) => sum + s.duration / 60, 0);
    weekData.push({ day: day.toLocaleDateString('en-US', { weekday: 'short' }), hours, isToday: dayStr === new Date().toDateString() });
  }
  const maxHours = Math.max(...weekData.map(d => d.hours), 4);
  chart.innerHTML = weekData.map(day => {
    const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
    return `
      <div class="chart-bar">
        <div class="chart-bar-inner">
          <div class="chart-bar-fill ${day.isToday ? 'today' : ''}" style="height:${Math.max(height, day.hours > 0 ? 5 : 3)}%" title="${day.hours.toFixed(1)} hours"></div>
        </div>
        <div class="chart-bar-label">${day.day}</div>
        ${day.isToday ? '<div class="chart-bar-indicator"></div>' : ''}
      </div>`;
  }).join('');
  const total = weekData.reduce((sum, d) => sum + d.hours, 0);
  document.getElementById('weeklyTotal').textContent = total.toFixed(1) + ' hours';
}

function init() {
  const stats = DB.getStats(currentUser.id);
  const exams = DB.getExams(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);
  updateStats(stats, sessions);
  updateSchedule(exams, sessions);
  updateExams(exams);
  updateChart(sessions);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('greeting').textContent = `${getTimeGreeting()}, ${currentUser.name}!`;

  document.getElementById('signOutBtn').addEventListener('click', () => {
    localStorage.removeItem('sf_current_user');
    window.location.href = 'index.html';
  });

  init();
});

} // end else