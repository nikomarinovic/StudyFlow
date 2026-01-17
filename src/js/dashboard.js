// Check if user is logged in
const userEmail = sessionStorage.getItem('userEmail');
const userName = sessionStorage.getItem('userName');

if (!userEmail) {
    window.location.href = '/auth.html';
}

// Determine time-of-day greeting
function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

// Set user name in header
const greetingEl = document.getElementById('userName');
const greetingText = getTimeGreeting();
greetingEl.textContent = userName ? `${greetingText}, ${userName}` : `${greetingText}, there`;

// Global state
let currentUserId = null;
let stats = null;
let exams = [];
let sessions = [];

// Initialize dashboard
async function initDashboard() {
    try {
        // Get user
        const user = await getUserByEmail(userEmail);
        if (!user) {
            window.location.href = '/auth.html';
            return;
        }
        
        currentUserId = user.id;
        
        // Load data
        await loadDashboardData();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Get stats
        stats = await getStats(currentUserId);
        
        // Get exams
        exams = await getExams(currentUserId);
        
        // Get sessions
        sessions = await getSessions(currentUserId);
        
        // Update UI
        updateStats();
        updateSchedule();
        updateExams();
        updateWeeklyChart();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update stats cards
function updateStats() {
    // Calculate study score (based on total hours * 100)
    const studyScore = Math.floor(stats.totalStudyHours * 100);
    document.getElementById('studyScore').textContent = studyScore;
    
    // Set streak
    document.getElementById('streak').textContent = stats.streak;
    
    // Calculate today's hours
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === today);
    const todayHours = todaySessions.reduce((sum, s) => sum + (s.duration / 60), 0);
    document.getElementById('todayHours').textContent = todayHours.toFixed(1);
    
    // Calculate weekly goal progress (based on 20 hours target)
    const weekStart = getWeekStart();
    const weekSessions = sessions.filter(s => new Date(s.completedAt) >= weekStart);
    const weekHours = weekSessions.reduce((sum, s) => sum + (s.duration / 60), 0);
    const weeklyGoal = Math.min(100, Math.floor((weekHours / 20) * 100));
    document.getElementById('goalPercentage').textContent = weeklyGoal + '%';
    document.getElementById('progressFill').style.width = weeklyGoal + '%';
}

// Update today's schedule
function updateSchedule() {
    const scheduleList = document.getElementById('scheduleList');
    const todaySchedule = [];
    const today = new Date().toDateString();
    const todayISO = formatDate(new Date());
    
    // Add exams happening today
    const todayExams = exams.filter(e => e.examDate === todayISO).map(e => ({
        time: '09:00',
        subject: e.subject,
        topic: e.topic,
        duration: '2 hours',
        type: 'exam'
    }));
    
    todaySchedule.push(...todayExams);
    
    // Add completed sessions from today
    const todaySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === today).map(s => ({
        time: new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject: s.subject,
        topic: s.examId ? 'Study session' : 'General study',
        duration: `${s.duration} min`,
        type: 'completed'
    }));
    
    todaySchedule.push(...todaySessions);
    
    // Add scheduled sessions for today
    const scheduled = getScheduledSessions();
    todaySchedule.push(...scheduled);
    
    // Sort by time and type
    todaySchedule.sort((a, b) => {
        if (a.type === 'exam') return -1;
        if (b.type === 'exam') return 1;
        if (a.type === 'scheduled' && b.type === 'completed') return -1;
        if (a.type === 'completed' && b.type === 'scheduled') return 1;
        return a.time.localeCompare(b.time);
    });
    
    // Render schedule
    if (todaySchedule.length === 0) {
        scheduleList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                    <line x1="16" x2="16" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="2" y2="6"></line>
                    <line x1="3" x2="21" y1="10" y2="10"></line>
                </svg>
                <p>No activities scheduled for today</p>
                <a href="/timer.html" class="btn-outline btn-sm">Start a study session</a>
            </div>
        `;
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
            </div>
        `).join('');
    }
}

// Get scheduled sessions for today
function getScheduledSessions() {
    const scheduled = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentTimeSlot = 9 * 60; // 9:00 AM in minutes
    const BREAK_DURATION = 15;
    
    exams.forEach(exam => {
        const examDate = new Date(exam.examDate);
        examDate.setHours(0, 0, 0, 0);
        
        const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 0) return;
        
        // Calculate hours needed
        const difficultyHours = {
            easy: 5,
            medium: 10,
            hard: 15,
            'very-hard': 20
        };
        
        const totalHours = difficultyHours[exam.difficulty] || 10;
        
        // Get hours already studied
        const studiedHours = sessions
            .filter(s => s.subject === exam.subject)
            .reduce((sum, s) => sum + (s.duration / 60), 0);
        
        const remainingHours = Math.max(0, totalHours - studiedHours);
        
        if (remainingHours <= 0) return;
        
        // Calculate session hours for today
        let sessionHours;
        if (daysUntil === 1) {
            sessionHours = Math.min(2, remainingHours);
        } else {
            const avgNeeded = remainingHours / daysUntil;
            if (avgNeeded <= 1) {
                sessionHours = Math.min(1, remainingHours);
            } else {
                sessionHours = Math.min(2, remainingHours);
            }
        }
        
        if (sessionHours >= 0.5) {
            const sessionMinutes = Math.round(sessionHours * 60);
            
            const hours = Math.floor(currentTimeSlot / 60);
            const mins = currentTimeSlot % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            
            currentTimeSlot += sessionMinutes + BREAK_DURATION;
            
            scheduled.push({
                time: timeStr,
                subject: exam.subject,
                topic: exam.topic,
                duration: `${sessionMinutes} min`,
                type: 'scheduled'
            });
        }
    });
    
    return scheduled;
}

// Update exams list
function updateExams() {
    const examsList = document.getElementById('examsList');
    
    // Get upcoming exams (future dates only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingExams = exams
        .filter(e => new Date(e.examDate) >= today)
        .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
        .slice(0, 5);
    
    if (upcomingExams.length === 0) {
        examsList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                </svg>
                <p>No upcoming exams</p>
            </div>
        `;
    } else {
        examsList.innerHTML = upcomingExams.map(exam => {
            const daysLeft = Math.ceil((new Date(exam.examDate) - today) / (1000 * 60 * 60 * 24));
            return `
                <div class="exam-item">
                    <div class="exam-header">
                        <span class="exam-subject">${exam.subject}</span>
                        <span class="exam-badge">${daysLeft}d left</span>
                    </div>
                    <div class="exam-topic">${exam.topic}</div>
                    <div class="exam-date">${formatDateReadable(exam.examDate)}</div>
                </div>
            `;
        }).join('');
    }
}

// Update weekly activity chart
function updateWeeklyChart() {
    const chart = document.getElementById('weeklyChart');
    const weekStart = getWeekStart();
    const weekData = [];
    
    // Get data for each day of the week
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const dayStr = day.toDateString();
        
        const daySessions = sessions.filter(s => new Date(s.completedAt).toDateString() === dayStr);
        const hours = daySessions.reduce((sum, s) => sum + (s.duration / 60), 0);
        
        weekData.push({
            day: day.toLocaleDateString('en-US', { weekday: 'short' }),
            hours: hours,
            isToday: dayStr === new Date().toDateString()
        });
    }
    
    const maxHours = Math.max(...weekData.map(d => d.hours), 4);
    
    // Render chart
    chart.innerHTML = weekData.map(day => {
        const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
        return `
            <div class="chart-bar">
                <div class="chart-bar-inner">
                    <div class="chart-bar-fill ${day.isToday ? 'today' : ''}" 
                         style="height: ${Math.max(height, day.hours > 0 ? 5 : 3)}%"
                         title="${day.hours.toFixed(1)} hours">
                    </div>
                </div>
                <div class="chart-bar-label">${day.day}</div>
                ${day.isToday ? '<div class="chart-bar-indicator"></div>' : ''}
            </div>
        `;
    }).join('');
    
    // Update total
    const totalHours = weekData.reduce((sum, d) => sum + d.hours, 0);
    document.getElementById('weeklyTotal').textContent = totalHours.toFixed(1) + ' hours';
}

// Helper functions
function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateReadable(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Sign out handler
document.getElementById('signOutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    window.location.href = '/';
});

// Initialize dashboard on load
initDashboard();