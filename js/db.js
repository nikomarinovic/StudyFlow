// ============================================================
// StudyFlow - localStorage Storage Layer (v2)
// ============================================================

const DB = {
  USERS_KEY:       'sf_users',
  SESSIONS_KEY:    'sf_sessions',
  EXAMS_KEY:       'sf_exams',
  ITEMS_KEY:       'sf_items',
  STATS_KEY:       'sf_stats',
  COMPLETIONS_KEY: 'sf_completions',

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  _id() { return Date.now().toString(36) + Math.random().toString(36).slice(2); },

  // ── USERS ──────────────────────────────────────────────────
  getUsers() { return this._get(this.USERS_KEY); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email === email) || null; },
  addUser(email, password, name) {
    const users = this.getUsers();
    const user = { id: this._id(), email, password, name, createdAt: Date.now() };
    users.push(user);
    this._set(this.USERS_KEY, users);
    this.initStats(user.id);
    return user;
  },
  validateLogin(email, password) {
    const user = this.getUserByEmail(email);
    return user && user.password === password;
  },

  // ── STATS ──────────────────────────────────────────────────
  initStats(userId) {
    const all = this._get(this.STATS_KEY);
    if (!all.find(s => s.userId === userId)) {
      all.push({ userId, totalStudyHours: 0, streak: 0, lastStudyDate: null, studyScore: 0 });
      this._set(this.STATS_KEY, all);
    }
  },
  getStats(userId) {
    return this._get(this.STATS_KEY).find(s => s.userId === userId)
      || { userId, totalStudyHours: 0, streak: 0, lastStudyDate: null, studyScore: 0 };
  },
  updateStats(userId, patch) {
    const all = this._get(this.STATS_KEY);
    const idx = all.findIndex(s => s.userId === userId);
    if (idx >= 0) all[idx] = { ...all[idx], ...patch };
    else all.push({ userId, totalStudyHours: 0, streak: 0, lastStudyDate: null, studyScore: 0, ...patch });
    this._set(this.STATS_KEY, all);
  },

  // ── EXAMS (legacy — proxies to items) ──────────────────────
  getExams(userId) {
    const legacy   = this._get(this.EXAMS_KEY).filter(e => e.userId === userId);
    const newItems = this.getItems(userId).filter(i => i.type === 'exam');
    const seen     = new Set(newItems.map(i => i.id));
    return [...newItems, ...legacy.filter(e => !seen.has(e.id))];
  },
  addExam(userId, exam) { return this.addItem(userId, { ...exam, type: 'exam' }); },
  deleteExam(examId)    { this.deleteItem(examId); },

  // ── ITEMS ──────────────────────────────────────────────────
  getItems(userId) {
    return this._get(this.ITEMS_KEY).filter(i => i.userId === userId);
  },
  addItem(userId, item) {
    const items  = this._get(this.ITEMS_KEY);
    const newItem = {
      id: this._id(), userId,
      type: 'exam', subject: '', topic: '',
      dueDate: '', difficulty: 'medium',
      reminderDaysBefore: 3, color: null,
      ...item,
      createdAt: Date.now()
    };
    items.push(newItem);
    this._set(this.ITEMS_KEY, items);
    return newItem;
  },
  updateItem(itemId, patch) {
    const items = this._get(this.ITEMS_KEY);
    const idx   = items.findIndex(i => i.id === itemId);
    if (idx >= 0) { items[idx] = { ...items[idx], ...patch }; this._set(this.ITEMS_KEY, items); }
  },
  deleteItem(itemId) {
    this._set(this.ITEMS_KEY, this._get(this.ITEMS_KEY).filter(i => i.id !== itemId));
    this._set(this.EXAMS_KEY, this._get(this.EXAMS_KEY).filter(i => i.id !== itemId));
  },

  // ── CALENDAR COMPLETIONS ────────────────────────────────────
  getCompletions(userId) {
    return this._get(this.COMPLETIONS_KEY).filter(c => c.userId === userId);
  },
  isCompleted(userId, blockId) {
    return this.getCompletions(userId).some(c => c.blockId === blockId);
  },

  // Completes a scheduled block. Updates stats ONLY — does NOT write to sf_sessions.
  // This prevents calendar blocks from re-appearing as "timer sessions" in the day list.
  completeBlock(userId, blockId, { subject, durationMinutes }) {
    const completions = this._get(this.COMPLETIONS_KEY);
    if (completions.find(c => c.userId === userId && c.blockId === blockId)) return false;
    completions.push({ userId, blockId, subject, durationMinutes, completedAt: Date.now() });
    this._set(this.COMPLETIONS_KEY, completions);

    const hoursAdded = (durationMinutes || 0) / 60;
    const scoreGain  = Math.round((durationMinutes || 0) * 1.5);
    const stats      = this.getStats(userId);
    const today      = new Date().toDateString();
    const lastStudy  = stats.lastStudyDate ? new Date(stats.lastStudyDate).toDateString() : null;
    const yesterday  = new Date(Date.now() - 86400000).toDateString();
    let streak = stats.streak || 0;
    if      (lastStudy === today)     { /* same day — no streak change */ }
    else if (lastStudy === yesterday) { streak += 1; }
    else                              { streak = 1; }

    this.updateStats(userId, {
      totalStudyHours: (stats.totalStudyHours || 0) + hoursAdded,
      streak,
      lastStudyDate:   Date.now(),
      studyScore:      (stats.studyScore || 0) + scoreGain
    });

    return true;
  },

  uncompleteBlock(userId, blockId) {
    const completions = this._get(this.COMPLETIONS_KEY);
    const entry = completions.find(c => c.userId === userId && c.blockId === blockId);
    if (!entry) return;
    this._set(this.COMPLETIONS_KEY, completions.filter(c => !(c.userId === userId && c.blockId === blockId)));

    const hoursAdded = (entry.durationMinutes || 0) / 60;
    const scoreGain  = Math.round((entry.durationMinutes || 0) * 1.5);
    const stats      = this.getStats(userId);
    this.updateStats(userId, {
      totalStudyHours: Math.max(0, (stats.totalStudyHours || 0) - hoursAdded),
      studyScore:      Math.max(0, (stats.studyScore      || 0) - scoreGain)
    });
  },

  // ── SESSIONS (timer sessions only — never written by completeBlock) ──
  getSessions(userId) {
    return this._get(this.SESSIONS_KEY).filter(s => s.userId === userId);
  },
  addSession(userId, session) {
    const sessions   = this._get(this.SESSIONS_KEY);
    const newSession = { id: this._id(), userId, ...session, completedAt: Date.now() };
    sessions.push(newSession);
    this._set(this.SESSIONS_KEY, sessions);

    const hoursAdded = (session.duration || 0) / 60;
    const scoreGain  = Math.round((session.duration || 0) * 1.5);
    const stats      = this.getStats(userId);
    const today      = new Date().toDateString();
    const lastStudy  = stats.lastStudyDate ? new Date(stats.lastStudyDate).toDateString() : null;
    const yesterday  = new Date(Date.now() - 86400000).toDateString();
    let streak = stats.streak || 0;
    if      (lastStudy === today)     { /* same day */ }
    else if (lastStudy === yesterday) { streak += 1; }
    else                              { streak = 1; }

    this.updateStats(userId, {
      totalStudyHours: (stats.totalStudyHours || 0) + hoursAdded,
      streak,
      lastStudyDate:   Date.now(),
      studyScore:      (stats.studyScore || 0) + scoreGain
    });
    return newSession;
  }
};

window.DB = DB;