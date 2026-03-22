// ============================================================
// StudyFlow - localStorage Storage Layer
// ============================================================

const DB = {
  // Keys
  USERS_KEY: 'sf_users',
  SESSIONS_KEY: 'sf_sessions',
  EXAMS_KEY: 'sf_exams',
  STATS_KEY: 'sf_stats',

  // Helper
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  // ---- USERS ----
  getUsers() { return this._get(this.USERS_KEY); },
  getUserByEmail(email) {
    return this.getUsers().find(u => u.email === email) || null;
  },
  addUser(email, password, name) {
    const users = this.getUsers();
    const user = { id: this._id(), email, password, name, createdAt: Date.now() };
    users.push(user);
    this._set(this.USERS_KEY, users);
    // Init stats for user
    this.initStats(user.id);
    return user;
  },
  validateLogin(email, password) {
    const user = this.getUserByEmail(email);
    return user && user.password === password;
  },

  // ---- STATS ----
  initStats(userId) {
    const allStats = this._get(this.STATS_KEY);
    if (!allStats.find(s => s.userId === userId)) {
      allStats.push({ userId, totalStudyHours: 0, streak: 0, lastStudyDate: null });
      this._set(this.STATS_KEY, allStats);
    }
  },
  getStats(userId) {
    const allStats = this._get(this.STATS_KEY);
    return allStats.find(s => s.userId === userId) || { userId, totalStudyHours: 0, streak: 0, lastStudyDate: null };
  },
  updateStats(userId, patch) {
    const allStats = this._get(this.STATS_KEY);
    const idx = allStats.findIndex(s => s.userId === userId);
    if (idx >= 0) {
      allStats[idx] = { ...allStats[idx], ...patch };
    } else {
      allStats.push({ userId, totalStudyHours: 0, streak: 0, lastStudyDate: null, ...patch });
    }
    this._set(this.STATS_KEY, allStats);
  },

  // ---- EXAMS ----
  getExams(userId) {
    return this._get(this.EXAMS_KEY).filter(e => e.userId === userId);
  },
  addExam(userId, exam) {
    const exams = this._get(this.EXAMS_KEY);
    const newExam = { id: this._id(), userId, ...exam, createdAt: Date.now() };
    exams.push(newExam);
    this._set(this.EXAMS_KEY, exams);
    return newExam;
  },
  deleteExam(examId) {
    const exams = this._get(this.EXAMS_KEY).filter(e => e.id !== examId);
    this._set(this.EXAMS_KEY, exams);
  },

  // ---- SESSIONS ----
  getSessions(userId) {
    return this._get(this.SESSIONS_KEY).filter(s => s.userId === userId);
  },
  addSession(userId, session) {
    const sessions = this._get(this.SESSIONS_KEY);
    const newSession = { id: this._id(), userId, ...session, completedAt: Date.now() };
    sessions.push(newSession);
    this._set(this.SESSIONS_KEY, sessions);

    // Update stats
    const stats = this.getStats(userId);
    const hoursAdded = (session.duration || 0) / 60;
    const today = new Date().toDateString();
    const lastStudy = stats.lastStudyDate ? new Date(stats.lastStudyDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let newStreak = stats.streak || 0;
    if (lastStudy === today) {
      // same day, no streak change
    } else if (lastStudy === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    this.updateStats(userId, {
      totalStudyHours: (stats.totalStudyHours || 0) + hoursAdded,
      streak: newStreak,
      lastStudyDate: Date.now()
    });

    return newSession;
  }
};

// Expose globally
window.DB = DB;