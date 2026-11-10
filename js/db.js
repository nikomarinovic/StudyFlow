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
  COURSES_KEY:     'sf_courses',
  TASKS_KEY:       'sf_tasks',
  EVENTS_KEY:      'sf_academic_events',
  AVAILABILITY_KEY:'sf_availability',
  LAB_WEEKS_KEY:   'sf_lab_weeks',
  PERIODS_KEY:     'sf_academic_periods',
  RESOURCES_KEY:   'sf_resources',

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); window.FirebaseSync?.queue?.(key); },
  _id() { return Date.now().toString(36) + Math.random().toString(36).slice(2); },

  // Courses and coursework live alongside the original exam planner data.
  getCourses(userId) { return this._get(this.COURSES_KEY).filter(c => c.userId === userId); },
  addCourse(userId, course) {
    const rows = this._get(this.COURSES_KEY);
    const record = { id: this._id(), userId, name: '', abbreviation: '', ects: 0, color: '#3978c5', assessments: [], createdAt: Date.now(), ...course };
    rows.push(record); this._set(this.COURSES_KEY, rows); return record;
  },
  updateCourse(courseId, patch) {
    const rows = this._get(this.COURSES_KEY), index = rows.findIndex(c => c.id === courseId);
    if (index < 0) return null;
    rows[index] = { ...rows[index], ...patch, updatedAt: Date.now() }; this._set(this.COURSES_KEY, rows); return rows[index];
  },
  deleteCourse(courseId) {
    this._set(this.COURSES_KEY, this._get(this.COURSES_KEY).filter(c => c.id !== courseId));
    this._set(this.TASKS_KEY, this._get(this.TASKS_KEY).filter(t => t.courseId !== courseId));
    this._set(this.RESOURCES_KEY, this._get(this.RESOURCES_KEY).filter(r => r.courseId !== courseId));
    this._set(this.EVENTS_KEY, this._get(this.EVENTS_KEY).filter(e => e.courseId !== courseId));
  },
  getTasks(userId) { return this._get(this.TASKS_KEY).filter(t => t.userId === userId); },
  addTask(userId, task) {
    const rows = this._get(this.TASKS_KEY), record = { id: this._id(), userId, title: '', status: 'open', ...task, createdAt: Date.now() };
    rows.push(record); this._set(this.TASKS_KEY, rows); return record;
  },
  updateTask(taskId, patch) {
    const rows = this._get(this.TASKS_KEY), index = rows.findIndex(t => t.id === taskId);
    if (index < 0) return null;
    rows[index] = { ...rows[index], ...patch, updatedAt: Date.now() }; this._set(this.TASKS_KEY, rows); return rows[index];
  },
  deleteTask(taskId) { this._set(this.TASKS_KEY, this._get(this.TASKS_KEY).filter(t => t.id !== taskId)); },
  getProfile(userId) { return this._get('sf_profiles').find(p => p.userId === userId) || {}; },
  saveProfile(userId, patch) {
    const rows = this._get('sf_profiles'), i = rows.findIndex(p => p.userId === userId);
    if (i < 0) rows.push({ userId, ...patch, updatedAt: Date.now() });
    else rows[i] = { ...rows[i], ...patch, updatedAt: Date.now() };
    this._set('sf_profiles', rows); return this.getProfile(userId);
  },
  getAcademicEvents(userId) { return this._get(this.EVENTS_KEY).filter(e => e.userId === userId); },
  addAcademicEvent(userId, event) { const rows=this._get(this.EVENTS_KEY), record={id:this._id(),userId,type:'lecture',color:'#3978c5',...event,createdAt:Date.now()}; rows.push(record);this._set(this.EVENTS_KEY,rows);return record; },
  updateAcademicEvent(id, patch) { const rows=this._get(this.EVENTS_KEY),i=rows.findIndex(e=>e.id===id);if(i<0)return null;const previous=rows[i];rows[i]={...previous,...patch,updatedAt:Date.now()};this._set(this.EVENTS_KEY,rows);if(previous.weekKey||rows[i].weekKey){const weeks=this._get(this.LAB_WEEKS_KEY).map(w=>{if(w.weekKey!==previous.weekKey&&w.weekKey!==rows[i].weekKey)return w;const entries=(w.events||[]).filter(e=>e.id!==id);if(w.weekKey===rows[i].weekKey&&rows[i].type==='lab'&&rows[i].repeat==='once')entries.push(rows[i]);return {...w,events:entries};});this._set(this.LAB_WEEKS_KEY,weeks);}return rows[i]; },
  deleteAcademicEvent(id) { this._set(this.EVENTS_KEY,this._get(this.EVENTS_KEY).filter(e=>e.id!==id));this._set(this.LAB_WEEKS_KEY,this._get(this.LAB_WEEKS_KEY).map(w=>({...w,events:(w.events||[]).filter(e=>e.id!==id)}))); },
  getAvailability(userId) { return this._get(this.AVAILABILITY_KEY).find(a=>a.userId===userId)?.days || {}; },
  saveAvailability(userId, days) { const rows=this._get(this.AVAILABILITY_KEY),i=rows.findIndex(a=>a.userId===userId),value={userId,days,updatedAt:Date.now()};if(i<0)rows.push(value);else rows[i]=value;this._set(this.AVAILABILITY_KEY,rows);return days; },
  getLabWeek(userId, weekKey) { return this._get(this.LAB_WEEKS_KEY).find(w=>w.userId===userId&&w.weekKey===weekKey)||null; },
  saveLabWeek(userId, weekKey, events) { const rows=this._get(this.LAB_WEEKS_KEY),i=rows.findIndex(w=>w.userId===userId&&w.weekKey===weekKey),value={id:this._id(),userId,weekKey,events,confirmedAt:Date.now()};if(i<0)rows.push(value);else rows[i]=value;this._set(this.LAB_WEEKS_KEY,rows);return value; },
  getPeriods(userId) { return this._get(this.PERIODS_KEY).filter(p=>p.userId===userId); },
  addPeriod(userId, period) { const rows=this._get(this.PERIODS_KEY),value={id:this._id(),userId,suspendClasses:false,...period};rows.push(value);this._set(this.PERIODS_KEY,rows);return value; },
  deletePeriod(id) { this._set(this.PERIODS_KEY,this._get(this.PERIODS_KEY).filter(p=>p.id!==id)); },
  getResources(userId) { return this._get(this.RESOURCES_KEY).filter(r=>r.userId===userId); },
  addResource(userId, resource) { const rows=this._get(this.RESOURCES_KEY),value={id:this._id(),userId,category:'Additional resources',...resource,createdAt:Date.now()};rows.push(value);this._set(this.RESOURCES_KEY,rows);return value; },
  deleteResource(id) { this._set(this.RESOURCES_KEY,this._get(this.RESOURCES_KEY).filter(r=>r.id!==id)); },

  // ── USERS ──────────────────────────────────────────────────
  getUsers() { return this._get(this.USERS_KEY); },
  getUserByEmail(email) { return this.getUsers().find(u => (u.email || '').toLowerCase() === String(email).toLowerCase()) || null; },
  async _hashPassword(password, saltHex) {
    if (!globalThis.crypto?.subtle) throw new Error('Secure password storage requires HTTPS or localhost.');
    const bytes = saltHex ? Uint8Array.from(saltHex.match(/.{2}/g), b => parseInt(b,16)) : crypto.getRandomValues(new Uint8Array(16));
    const salt = saltHex || [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes,iterations:210000,hash:'SHA-256'},key,256);
    return {salt,hash:[...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('')};
  },
  async addUser(email, password, name) {
    const users = this.getUsers();
    const credentials = await this._hashPassword(password);
    const user = { id: this._id(), email: String(email).trim().toLowerCase(), passwordHash:credentials.hash, passwordSalt:credentials.salt, name, createdAt: Date.now() };
    users.push(user);
    this._set(this.USERS_KEY, users);
    this.initStats(user.id);
    return user;
  },
  async validateLogin(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return false;
    if (user.passwordHash && user.passwordSalt) return (await this._hashPassword(password,user.passwordSalt)).hash === user.passwordHash;
    if (user.password === password) {
      const credentials = await this._hashPassword(password);
      const rows = this.getUsers(), index = rows.findIndex(u=>u.id===user.id);
      if (index >= 0) { rows[index] = { ...rows[index], passwordHash:credentials.hash, passwordSalt:credentials.salt }; delete rows[index].password; this._set(this.USERS_KEY,rows); }
      return true;
    }
    return false;
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
