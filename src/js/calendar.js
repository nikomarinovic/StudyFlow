// Data arrays 
const MOCK_EXAMS = [];
const MOCK_SESSIONS = [];

// Constants
const DIFFICULTY_HOURS = {
  easy: 5,
  medium: 10,
  hard: 15,
  'very-hard': 20
};

const DAILY_STUDY_LIMIT = 2; // Max 2 hours per day

// State
let currentWeekStart = getStartOfWeek(new Date());
let selectedDate = new Date();
let scheduledSessions = [];

// Date utilities
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date, format) {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  if (format === 'MMM d') {
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } else if (format === 'MMM d, yyyy') {
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } else if (format === 'EEEE') {
    return days[d.getDay()];
  } else if (format === 'EEE') {
    return days[d.getDay()].substring(0, 3);
  } else if (format === 'd') {
    return d.getDate().toString();
  }
  return d.toDateString();
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function differenceInDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1 - d2;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function eachDayOfInterval(start, end) {
  const days = [];
  let current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
}

// Generate study schedule
function generateStudySchedule(exams, existingSessions) {
  const scheduled = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyTimeSlots = {};
  const START_TIME = 9 * 60; // 9:00 AM in minutes
  const BREAK_DURATION = 15; // 15 minute break

  exams.forEach(exam => {
    try {
      const examDate = new Date(exam.examDate);
      examDate.setHours(0, 0, 0, 0);
      
      const daysUntilExam = differenceInDays(examDate, today);
      
      if (daysUntilExam <= 0) return;

      const totalHours = DIFFICULTY_HOURS[exam.difficulty] || 10;
      
      const studiedHours = existingSessions
        .filter(s => s.subject === exam.subject)
        .reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
      
      const remainingHours = Math.max(0, totalHours - studiedHours);
      
      if (remainingHours <= 0) return;
      
      const studyInterval = eachDayOfInterval(today, examDate);
      const availableDays = studyInterval.slice(0, -1);
      
      if (availableDays.length === 0) return;
      
      let hoursLeft = remainingHours;
      
      availableDays.forEach((day, index) => {
        if (hoursLeft <= 0) return;
        
        const dayKey = day.toISOString().split('T')[0];
        
        if (!dailyTimeSlots[dayKey]) {
          dailyTimeSlots[dayKey] = START_TIME;
        }
        
        const daysRemaining = availableDays.length - index;
        let sessionHours;
        
        if (daysRemaining === 1) {
          sessionHours = Math.min(DAILY_STUDY_LIMIT, hoursLeft);
        } else {
          const avgNeeded = hoursLeft / daysRemaining;
          if (avgNeeded <= 1) {
            sessionHours = Math.min(1, hoursLeft);
          } else if (avgNeeded <= 1.5) {
            sessionHours = index % 2 === 0 ? Math.min(2, hoursLeft) : Math.min(1, hoursLeft);
          } else {
            sessionHours = Math.min(DAILY_STUDY_LIMIT, hoursLeft);
          }
        }
        
        if (sessionHours >= 0.5) {
          const sessionMinutes = Math.round(sessionHours * 60);
          const startMinute = dailyTimeSlots[dayKey];
          
          const hours = Math.floor(startMinute / 60);
          const mins = startMinute % 60;
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          
          const sessionId = `scheduled-${exam.id}-${dayKey}`;
          
          const colorClass = exam.difficulty === 'very-hard' ? 'very-danger' :
                           exam.difficulty === 'hard' ? 'danger' :
                           exam.difficulty === 'medium' ? 'warning' : 'success';
          
          scheduled.push({
            id: sessionId,
            subject: exam.subject,
            topic: exam.topic,
            time: timeStr,
            duration: `${sessionMinutes} min`,
            completed: false,
            color: colorClass,
            type: 'scheduled',
            date: day
          });
          
          dailyTimeSlots[dayKey] = startMinute + sessionMinutes + BREAK_DURATION;
          hoursLeft -= sessionHours;
        }
      });
    } catch (e) {
      console.error('Error scheduling exam:', e);
    }
  });

  return scheduled;
}

// Render functions
function renderWeekNavigation() {
  const weekEnd = addDays(currentWeekStart, 6);
  const rangeText = `${formatDate(currentWeekStart, 'MMM d')} - ${formatDate(weekEnd, 'MMM d, yyyy')}`;
  document.getElementById('weekRange').textContent = rangeText;
}

function renderWeekGrid() {
  const weekGrid = document.getElementById('weekGrid');
  weekGrid.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeekStart, i);
    const dayKey = date.toDateString();
    
    // Get sessions for this day
    const daySessions = MOCK_SESSIONS.filter(s => {
      const sessionDate = new Date(s.completedAt);
      return isSameDay(sessionDate, date);
    }).map(s => ({ ...s, type: 'session', color: 'success' }));

    const dayScheduled = scheduledSessions.filter(s => isSameDay(s.date, date));
    
    const dayExams = MOCK_EXAMS.filter(ex => {
      const examDate = new Date(ex.examDate);
      return isSameDay(examDate, date);
    }).map(ex => ({ ...ex, type: 'exam', color: 'danger' }));

    const allSessions = [...daySessions, ...dayScheduled, ...dayExams];

    const dayCell = document.createElement('button');
    dayCell.className = 'day-cell';
    
    if (isSameDay(date, selectedDate)) {
      dayCell.classList.add('selected');
    }
    if (isSameDay(date, new Date())) {
      dayCell.classList.add('today');
    }

    dayCell.innerHTML = `
      <div class="day-name">${formatDate(date, 'EEE')}</div>
      <div class="day-number">${formatDate(date, 'd')}</div>
      <div class="day-indicators">
        ${allSessions.slice(0, 3).map(s => 
          `<div class="indicator-bar ${s.color}"></div>`
        ).join('')}
        ${allSessions.length > 3 ? `<div class="more-indicator">+${allSessions.length - 3} more</div>` : ''}
      </div>
    `;

    dayCell.addEventListener('click', () => {
      selectedDate = date;
      renderWeekGrid();
      renderDayDetails();
    });

    weekGrid.appendChild(dayCell);
  }
}

function renderDayDetails() {
  const dayName = formatDate(selectedDate, 'EEEE');
  const dayDate = formatDate(selectedDate, 'MMM d, yyyy');
  
  document.getElementById('selectedDayName').textContent = dayName;
  document.getElementById('selectedDayDate').textContent = dayDate;

  // Get sessions for selected day
  const daySessions = MOCK_SESSIONS.filter(s => {
    const sessionDate = new Date(s.completedAt);
    return isSameDay(sessionDate, selectedDate);
  }).map(s => ({
    id: s.id,
    subject: s.subject,
    topic: s.examId,
    time: new Date(s.completedAt).toTimeString().slice(0, 5),
    duration: `${s.duration} min`,
    completed: true,
    type: 'session'
  }));

  const dayScheduled = scheduledSessions.filter(s => isSameDay(s.date, selectedDate));

  const dayExams = MOCK_EXAMS.filter(ex => {
    const examDate = new Date(ex.examDate);
    return isSameDay(examDate, selectedDate);
  }).map(ex => ({
    id: `exam-${ex.id}`,
    subject: ex.subject,
    topic: ex.topic,
    time: 'Exam Day',
    duration: '2h',
    completed: false,
    type: 'exam'
  }));

  const allSessions = [...dayExams, ...dayScheduled, ...daySessions].sort((a, b) => {
    if (a.type === 'exam') return -1;
    if (b.type === 'exam') return 1;
    return a.time.localeCompare(b.time);
  });

  // Update session count
  document.getElementById('sessionCount').textContent = allSessions.length;
  document.getElementById('sessionLabel').textContent = allSessions.length === 1 ? 'session' : 'sessions';

  // Render sessions list
  const sessionsList = document.getElementById('sessionsList');
  
  if (allSessions.length === 0) {
    sessionsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <p>No sessions scheduled for this day</p>
      </div>
    `;
  } else {
    sessionsList.innerHTML = allSessions.map((session, index) => {
      const iconSvg = session.type === 'exam' 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>`
        : session.completed
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
          </svg>`;

      const itemClass = session.type === 'exam' ? 'exam' : session.completed ? 'completed' : '';
      const iconClass = session.type === 'exam' ? 'exam' : session.completed ? 'completed' : 'scheduled';

      return `
        <div class="session-item ${itemClass}" style="animation-delay: ${index * 0.05}s">
          <div class="session-content">
            <div class="session-left">
              <div class="session-icon ${iconClass}">
                ${iconSvg}
              </div>
              <div class="session-info">
                <div class="session-subject">
                  ${session.subject}
                  ${session.type === 'exam' ? '<span class="session-badge exam">EXAM</span>' : ''}
                  ${session.type === 'scheduled' ? '<span class="session-badge scheduled">Scheduled</span>' : ''}
                </div>
                <div class="session-topic">${session.topic}</div>
              </div>
            </div>
            <div class="session-right">
              <div class="session-time">${session.time}</div>
              <div class="session-duration">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                ${session.duration}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update summary
  if (allSessions.length > 0) {
    const totalMinutes = allSessions
      .filter(s => s.type !== 'exam')
      .reduce((sum, s) => {
        const mins = parseInt(s.duration);
        return sum + (isNaN(mins) ? 0 : mins);
      }, 0);

    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const timeStr = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

    const completed = allSessions.filter(s => s.completed).length;
    const total = allSessions.filter(s => s.type !== 'exam').length;

    document.getElementById('totalTime').textContent = timeStr;
    document.getElementById('completedCount').textContent = `${completed} / ${total}`;
    document.getElementById('daySummary').style.display = 'block';
  } else {
    document.getElementById('daySummary').style.display = 'none';
  }
}

// Initialize
function init() {
  // Generate schedule
  scheduledSessions = generateStudySchedule(MOCK_EXAMS, MOCK_SESSIONS);
  
  // Event listeners
  document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderWeekNavigation();
    renderWeekGrid();
  });

  document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderWeekNavigation();
    renderWeekGrid();
  });

  // Initial render
  renderWeekNavigation();
  renderWeekGrid();
  renderDayDetails();
}

// Start app
document.addEventListener('DOMContentLoaded', init);