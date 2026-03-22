// Auth guard — redirect and stop cleanly
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

// ── Shared constants (must match calendar.js) ─────────────────
const DIFFICULTY_HOURS = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DAILY_LIMIT      = 2; // max study hours per day

// ── Helpers ────────────────────────────────────────────────────
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
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ── Core schedule generator (mirrors calendar.js logic exactly) ─
// Returns all scheduled blocks for ALL days. Caller filters to today.
function generateAllScheduled(items, sessions) {
  const scheduled = [];
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const dailySlots = {};
  const START      = 9 * 60; // 09:00 in minutes
  const BREAK      = 15;     // minutes between sessions

  items.filter(i => i.type === 'exam').forEach(exam => {
    try {
      const dateKey  = exam.dueDate || exam.examDate || '';
      const examDate = new Date(dateKey + 'T12:00:00');
      examDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((examDate - today) / 86400000);

      // Always push an exam-day marker
      scheduled.push({
        subject: exam.subject,
        topic:   exam.topic || '',
        type:    'exam-day',
        date:    new Date(examDate),
      });

      if (daysUntil <= 0) return;

      const totalH   = DIFFICULTY_HOURS[exam.difficulty] || 10;
      const studiedH = sessions
        .filter(s => s.subject === exam.subject)
        .reduce((sum, s) => sum + s.duration / 60, 0);
      let hoursLeft  = Math.max(0, totalH - studiedH);
      if (hoursLeft <= 0) return;

      // Work backwards: exactly as many consecutive days as needed
      const daysNeeded   = Math.ceil(hoursLeft / DAILY_LIMIT);
      const daysToUse    = Math.min(daysNeeded, daysUntil);
      const idealStart   = new Date(examDate);
      idealStart.setDate(idealStart.getDate() - daysToUse);
      idealStart.setHours(0, 0, 0, 0);
      const startFrom    = idealStart < today ? today : idealStart;
      const actualDays   = Math.ceil((examDate - startFrom) / 86400000);
      if (actualDays <= 0) return;

      for (let i = 0; i < actualDays && hoursLeft > 0; i++) {
        const day    = new Date(startFrom);
        day.setDate(day.getDate() + i);
        const dayKey = day.toISOString().split('T')[0];
        if (!dailySlots[dayKey]) dailySlots[dayKey] = START;

        const daysRemaining = actualDays - i;
        const sessionH = Math.min(
          DAILY_LIMIT,
          Math.ceil((hoursLeft / daysRemaining) * 2) / 2
        );
        if (sessionH < 0.5) { hoursLeft = 0; break; }

        const mins     = Math.round(sessionH * 60);
        const startMin = dailySlots[dayKey];
        const hh = Math.floor(startMin / 60).toString().padStart(2, '0');
        const mm = (startMin % 60).toString().padStart(2, '0');

        scheduled.push({
          subject:         exam.subject,
          topic:           exam.topic || '',
          time:            `${hh}:${mm}`,
          durationMinutes: mins,
          duration:        `${mins} min`,
          type:            'scheduled',
          date:            new Date(day),
          examId:          exam.id,
        });

        dailySlots[dayKey] = startMin + mins + BREAK;
        hoursLeft -= sessionH;
      }
    } catch (e) { console.error(e); }
  });

  return scheduled;
}

// ── Stats ──────────────────────────────────────────────────────
function updateStats(stats, sessions) {
  // Study score is stored directly on stats (incremented by both timer & calendar blocks)
  document.getElementById('studyScore').textContent = stats.studyScore || 0;
  document.getElementById('streak').textContent     = stats.streak || 0;

  const today     = new Date().toDateString();
  const weekStart = getWeekStart();

  // Timer sessions
  const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === today);
  const weekSessions  = sessions.filter(s => new Date(s.completedAt) >= weekStart);

  // Calendar block completions (checked off in calendar.js)
  const completions      = DB.getCompletions(currentUser.id);
  const todayCompletions = completions.filter(c => new Date(c.completedAt).toDateString() === today);
  const weekCompletions  = completions.filter(c => new Date(c.completedAt) >= weekStart);

  // Studied Today = timer minutes + calendar block minutes
  const todayMins =
    todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0) +
    todayCompletions.reduce((sum, c) => sum + (c.durationMinutes || 0), 0);
  document.getElementById('todayHours').textContent = (todayMins / 60).toFixed(1);

  // Weekly Goal = timer hours + calendar block hours
  const weekMins =
    weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0) +
    weekCompletions.reduce((sum, c) => sum + (c.durationMinutes || 0), 0);
  const weeklyGoal = Math.min(100, Math.floor((weekMins / 60 / 20) * 100));
  document.getElementById('goalPercentage').textContent = weeklyGoal + '%';
  document.getElementById('progressFill').style.width   = weeklyGoal + '%';
}

// ── Today's schedule ───────────────────────────────────────────
function updateSchedule(items, sessions) {
  const scheduleList = document.getElementById('scheduleList');
  const today        = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr     = today.toDateString();

  // Generate full schedule and filter to today
  const allScheduled = generateAllScheduled(items, sessions);
  const isSameDay    = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  const todayItems = [];

  // 1. Exam day marker for today
  allScheduled
    .filter(s => s.type === 'exam-day' && isSameDay(s.date, today))
    .forEach(s => todayItems.push({
      time:     '—',
      subject:  s.subject,
      topic:    s.topic,
      duration: '—',
      type:     'exam-day',
    }));

  // 2. Generated study sessions for today
  allScheduled
    .filter(s => s.type === 'scheduled' && isSameDay(s.date, today))
    .forEach(s => todayItems.push({
      time:     s.time,
      subject:  s.subject,
      topic:    s.topic,
      duration: s.duration,
      type:     'scheduled',
    }));

  // 3. Completed timer sessions from today
  sessions
    .filter(s => new Date(s.completedAt).toDateString() === todayStr)
    .forEach(s => todayItems.push({
      time:     new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subject:  s.subject || 'General Study',
      topic:    'Study session',
      duration: `${s.duration} min`,
      type:     'completed',
    }));

  // Sort: exam-day first, then by time
  todayItems.sort((a, b) => {
    if (a.type === 'exam-day') return -1;
    if (b.type === 'exam-day') return  1;
    const ta = a.time === '—' ? '00:00' : a.time;
    const tb = b.time === '—' ? '00:00' : b.time;
    return ta.localeCompare(tb);
  });

  if (todayItems.length === 0) {
    scheduleList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
        <p>No activities scheduled for today</p>
        <a href="timer.html" class="btn-outline btn-sm">Start a study session</a>
      </div>`;
    return;
  }

  scheduleList.innerHTML = todayItems.map(item => {
    if (item.type === 'exam-day') {
      return `
        <div class="schedule-item exam-day">
          <div class="schedule-time">Today</div>
          <div class="schedule-indicator exam-day" style="background:#111"></div>
          <div class="schedule-content">
            <div class="schedule-subject">
              ${item.subject}
              <span class="schedule-badge exam" style="background:#111;color:#fff;border-color:#111">EXAM DAY</span>
            </div>
            <div class="schedule-topic">${item.topic}</div>
          </div>
          <div class="schedule-duration">—</div>
        </div>`;
    }
    return `
      <div class="schedule-item ${item.type}">
        <div class="schedule-time">${item.time}</div>
        <div class="schedule-indicator ${item.type}"></div>
        <div class="schedule-content">
          <div class="schedule-subject">
            ${item.subject}
            ${item.type === 'scheduled' ? '<span class="schedule-badge scheduled">Study</span>' : ''}
          </div>
          <div class="schedule-topic">${item.topic}</div>
        </div>
        <div class="schedule-duration">${item.duration}</div>
      </div>`;
  }).join('');
}

// ── Upcoming exams ─────────────────────────────────────────────
function updateExams(items) {
  const examsList = document.getElementById('examsList');
  const today     = new Date(); today.setHours(0, 0, 0, 0);

  const upcoming = items
    .filter(i => i.type === 'exam' && new Date((i.dueDate || i.examDate) + 'T12:00:00') >= today)
    .sort((a, b) => new Date(a.dueDate || a.examDate) - new Date(b.dueDate || b.examDate))
    .slice(0, 5);

  if (upcoming.length === 0) {
    examsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
        <p>No upcoming exams</p>
      </div>`;
    return;
  }

  examsList.innerHTML = upcoming.map(exam => {
    const dateStr  = exam.dueDate || exam.examDate;
    const daysLeft = Math.ceil((new Date(dateStr + 'T12:00:00') - today) / 86400000);
    return `
      <div class="exam-item">
        <div class="exam-header">
          <span class="exam-subject">${exam.subject}</span>
          <span class="exam-badge">${daysLeft}d left</span>
        </div>
        <div class="exam-topic">${exam.topic}</div>
        <div class="exam-date">${formatDateReadable(dateStr)}</div>
      </div>`;
  }).join('');
}

// ── Weekly chart ───────────────────────────────────────────────
function updateChart(sessions) {
  const chart       = document.getElementById('weeklyChart');
  const weekStart   = getWeekStart();
  const completions = DB.getCompletions(currentUser.id);
  const weekData    = [];

  for (let i = 0; i < 7; i++) {
    const day    = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = day.toDateString();

    // Timer session minutes + calendar block completion minutes
    const sessionMins    = sessions.filter(s => new Date(s.completedAt).toDateString() === dayStr)
                                   .reduce((sum, s) => sum + (s.duration || 0), 0);
    const completionMins = completions.filter(c => new Date(c.completedAt).toDateString() === dayStr)
                                      .reduce((sum, c) => sum + (c.durationMinutes || 0), 0);
    const hours = (sessionMins + completionMins) / 60;

    weekData.push({
      day:     day.toLocaleDateString('en-US', { weekday: 'short' }),
      hours,
      isToday: dayStr === new Date().toDateString(),
    });
  }

  const maxHours = Math.max(...weekData.map(d => d.hours), 4);
  chart.innerHTML = weekData.map(day => {
    const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
    return `
      <div class="chart-bar">
        <div class="chart-bar-inner">
          <div class="chart-bar-fill ${day.isToday ? 'today' : ''}"
            style="height:${Math.max(height, day.hours > 0 ? 5 : 3)}%"
            title="${day.hours.toFixed(1)} hours"></div>
        </div>
        <div class="chart-bar-label">${day.day}</div>
        ${day.isToday ? '<div class="chart-bar-indicator"></div>' : ''}
      </div>`;
  }).join('');

  const total = weekData.reduce((sum, d) => sum + d.hours, 0);
  document.getElementById('weeklyTotal').textContent = total.toFixed(1) + ' hours';
}

// ── Init ───────────────────────────────────────────────────────
function init() {
  const rawItems = DB.getItems ? DB.getItems(currentUser.id) : [];
  const rawExams = DB.getExams(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);

  // Merge legacy exams into items list
  const itemIds  = new Set(rawItems.map(i => i.id));
  const allItems = [
    ...rawItems,
    ...rawExams
      .filter(e => !itemIds.has(e.id))
      .map(e => ({ ...e, type: 'exam', dueDate: e.examDate })),
  ];

  const stats = DB.getStats(currentUser.id);
  updateStats(stats, sessions);
  updateSchedule(allItems, sessions);
  updateExams(allItems);
  updateChart(sessions);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('greeting').textContent =
    `${getTimeGreeting()}, ${currentUser.name}!`;

  document.getElementById('signOutBtn').addEventListener('click', () => {
    localStorage.removeItem('sf_current_user');
    window.location.href = 'index.html';
  });

  init();
});

} // end else