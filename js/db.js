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
  SCHEDULES_KEY:   'sf_schedules',
  PLANNER_SETTINGS_KEY: 'sf_planner_settings',
  PLANNER_PREFS_KEY: 'sf_planner_prefs',
  ACTIVITY_LOG_KEY: 'sf_activity_log',
  ACTIVITY_DAYS_KEY: 'sf_activity_days',

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
    const pending = this._get('sf_pending_sync_stores');
    if (!pending.includes(key)) localStorage.setItem('sf_pending_sync_stores', JSON.stringify([...pending, key]));
    window.FirebaseSync?.queue?.(key);
    // The adaptive planner listens for this and re-plans automatically.
    try { window.dispatchEvent(new CustomEvent('sf:store-changed', { detail: { key } })); } catch {}
  },
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
  deleteAcademicEvent(id) { const rows=this._get(this.EVENTS_KEY),target=rows.find(e=>e.id===id),found=Boolean(target);if(!found)return false;
    // Removing a generated session means "I can't study then": remember the slot so the planner works around it.
    if(target.type==='study'&&(target.generatedPlanId||target.generatedWeek)&&target.date&&target.date>=this._dayKey(Date.now())&&!this.isCompleted(target.userId,`acad-${target.id}-${target.date}`)){const prefs=this.getPlannerPrefs(target.userId);this.savePlannerPrefs(target.userId,{dismissed:[...(prefs.dismissed||[]),{date:target.date,start:target.start,end:target.end}]});}
    this._set(this.EVENTS_KEY,this._get(this.EVENTS_KEY).filter(e=>e.id!==id));this._set(this.LAB_WEEKS_KEY,this._get(this.LAB_WEEKS_KEY).map(w=>({...w,events:(w.events||[]).filter(e=>e.id!==id)})));return true; },
  getSchedules(userId) { return this._get(this.SCHEDULES_KEY).filter(s=>s.userId===userId); },
  addSchedule(userId, schedule) {
    const rows=this._get(this.SCHEDULES_KEY), record={id:this._id(),userId,name:'Schedule',active:false,createdAt:Date.now(),...schedule};
    rows.push(record);this._set(this.SCHEDULES_KEY,rows);return record;
  },
  updateSchedule(id, patch) {
    const rows=this._get(this.SCHEDULES_KEY),i=rows.findIndex(s=>s.id===id);if(i<0)return null;
    rows[i]={...rows[i],...patch,updatedAt:Date.now()};this._set(this.SCHEDULES_KEY,rows);return rows[i];
  },
  deleteSchedule(id) {
    this._set(this.SCHEDULES_KEY,this._get(this.SCHEDULES_KEY).filter(s=>s.id!==id));
    this._set(this.EVENTS_KEY,this._get(this.EVENTS_KEY).filter(e=>e.scheduleId!==id));
  },
  getActiveSchedule(userId) { return this.getSchedules(userId).find(s=>s.active)||this.getSchedules(userId)[0]||null; },
  setActiveSchedule(userId,id) {
    const rows=this._get(this.SCHEDULES_KEY).map(s=>s.userId===userId?{...s,active:s.id===id}:s);this._set(this.SCHEDULES_KEY,rows);return rows.find(s=>s.id===id)||null;
  },
  getAvailability(userId) { return this._get(this.AVAILABILITY_KEY).find(a=>a.userId===userId)?.days || {}; },
  saveAvailability(userId, days) { const rows=this._get(this.AVAILABILITY_KEY),i=rows.findIndex(a=>a.userId===userId),value={userId,days,updatedAt:Date.now()};if(i<0)rows.push(value);else rows[i]=value;this._set(this.AVAILABILITY_KEY,rows);return days; },
  getLabWeek(userId, weekKey) { return this._get(this.LAB_WEEKS_KEY).find(w=>w.userId===userId&&w.weekKey===weekKey)||null; },
  saveLabWeek(userId, weekKey, events) { const rows=this._get(this.LAB_WEEKS_KEY),i=rows.findIndex(w=>w.userId===userId&&w.weekKey===weekKey),value={id:this._id(),userId,weekKey,events,confirmedAt:Date.now()};if(i<0)rows.push(value);else rows[i]=value;this._set(this.LAB_WEEKS_KEY,rows);return value; },
  // Everything on the calendar for one day (YYYY-MM-DD): classes, one-day activities, study sessions, lab-week overrides.
  // Same rules as the calendar page, so the dashboard and the calendar can never disagree.
  getDayAgenda(userId, dayKey) {
    const day = new Date(`${dayKey}T12:00:00`), weekday = day.getDay();
    const monday = new Date(day); monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
    const weekKey = this._dayKey(monday.getTime());
    const activeId = this.getActiveSchedule(userId)?.id;
    const labWeek = this.getLabWeek(userId, weekKey);
    const period = this.getPeriods(userId).find(p => p.suspendClasses && dayKey >= p.startDate && dayKey <= p.endDate);
    const mins = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
    const out = [];
    this.getAcademicEvents(userId).forEach(event => {
      if (event.scheduleId && event.scheduleId !== activeId) return;
      if (event.activeFrom && dayKey < event.activeFrom || event.activeUntil && dayKey > event.activeUntil) return;
      if (event.type === 'lab' && event.weekKey === weekKey) return;
      if (event.repeat === 'weekly') {
        if ((event.type !== 'study' && period) || Number(event.day) !== weekday) return;
        if (event.type === 'lab' && labWeek) return;
      } else if (event.date !== dayKey) return;
      const blockId = `acad-${event.id}-${dayKey}`;
      out.push({ blockId, title: event.title, type: event.type, start: event.start || '', end: event.end || '',
        durationMinutes: event.start && event.end ? Math.max(0, mins(event.end) - mins(event.start)) : 0,
        location: event.location || '', description: event.description || '', color: event.color || '', courseId: event.courseId || '',
        temporary: Boolean(event.temporary), completed: event.type === 'study' && this.isCompleted(userId, blockId) });
    });
    if (labWeek) (labWeek.events || []).forEach((event, index) => {
      if (event.date !== dayKey) return;
      out.push({ blockId: `lab-${labWeek.id}-${index}`, title: event.title, type: event.type || 'lab', start: event.start || '', end: event.end || '',
        durationMinutes: event.start && event.end ? Math.max(0, mins(event.end) - mins(event.start)) : 0,
        location: event.location || '', description: event.description || '', color: event.color || '', courseId: event.courseId || '', completed: false });
    });
    return out.sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'));
  },
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
    const row = this._get(this.STATS_KEY).find(s => s.userId === userId)
      || { userId, totalStudyHours: 0, streak: 0, lastStudyDate: null, studyScore: 0 };
    // The streak is derived from per-day records that merge across devices, never from a counter
    // that the last device to write would overwrite.
    return { ...row, streak: this.computeStreak(userId) };
  },
  updateStats(userId, patch) {
    const all = this._get(this.STATS_KEY);
    const idx = all.findIndex(s => s.userId === userId);
    if (idx >= 0) all[idx] = { ...all[idx], ...patch };
    else all.push({ userId, totalStudyHours: 0, streak: 0, lastStudyDate: null, studyScore: 0, ...patch });
    this._set(this.STATS_KEY, all);
  },
  getPlannerSettings(userId) {
    const defaults = {
      easy: { min: 5, max: 5 },
      medium: { min: 10, max: 10 },
      hard: { min: 20, max: 25 },
      'very-hard': { min: 30, max: 30 }
    };
    const saved = this._get(this.PLANNER_SETTINGS_KEY).find(row => row.userId === userId)?.targets || {};
    return Object.fromEntries(Object.entries(defaults).map(([difficulty, fallback]) => {
      const value = saved[difficulty] || {};
      const min = Math.max(1, Number(value.min ?? fallback.min) || fallback.min);
      const max = Math.max(min, Number(value.max ?? fallback.max) || fallback.max);
      return [difficulty, { min, max }];
    }));
  },
  savePlannerSettings(userId, targets) {
    const rows = this._get(this.PLANNER_SETTINGS_KEY);
    const value = { userId, targets, updatedAt: Date.now() };
    const index = rows.findIndex(row => row.userId === userId);
    if (index < 0) rows.push(value);
    else rows[index] = value;
    this._set(this.PLANNER_SETTINGS_KEY, rows);
    return this.getPlannerSettings(userId);
  },
  // ── ADAPTIVE PLANNER PREFERENCES ───────────────────────────
  // { auto, courseHours: { [courseId]: { boost, extraHours, weeklyHours } }, dismissed: [{date,start,end}], ...overrides }
  getPlannerPrefs(userId) {
    const saved = this._get(this.PLANNER_PREFS_KEY).find(row => row.userId === userId)?.prefs || {};
    return { courseHours: {}, dismissed: [], ...saved };
  },
  savePlannerPrefs(userId, patch) {
    const rows = this._get(this.PLANNER_PREFS_KEY);
    const index = rows.findIndex(row => row.userId === userId);
    const prefs = { ...this.getPlannerPrefs(userId), ...patch };
    const value = { userId, prefs, updatedAt: Date.now() };
    if (index < 0) rows.push(value); else rows[index] = value;
    this._set(this.PLANNER_PREFS_KEY, rows);
    return prefs;
  },
  setCourseHours(userId, courseId, patch) {
    const prefs = this.getPlannerPrefs(userId);
    const next = { ...(prefs.courseHours || {}) };
    next[courseId] = { ...(next[courseId] || {}), ...patch };
    return this.savePlannerPrefs(userId, { courseHours: next });
  },
  // One-day activity: blocks study time, disappears from the calendar after it ends, stays in the activity log.
  addTemporaryActivity(userId, activity) {
    return this.addAcademicEvent(userId, { type: 'other', repeat: 'once', color: '#94a3b8', location: '', ...activity, temporary: true });
  },
  getActivityLog(userId) {
    return this._get(this.ACTIVITY_LOG_KEY).filter(e => e.userId === userId).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  },
  // ── STREAK ─────────────────────────────────────────────────
  // Every day the student was active is its own record (id = userId_YYYY-MM-DD), so two devices
  // that both record "today" produce the same record, and records from both devices are merged.
  _dayKey(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  _resetAt(userId) {
    return Number(this._get(this.ACTIVITY_DAYS_KEY).find(r => r.id === `${userId}_reset`)?.resetAt) || 0;
  },
  _activeDays(userId) {
    const days = new Set();
    const rows = this._get(this.ACTIVITY_DAYS_KEY).filter(r => r.userId === userId);
    const resetAt = this._resetAt(userId);
    rows.forEach(r => { if (r.date && (Number(r.at) || 0) >= resetAt) days.add(r.date); });
    this._get(this.SESSIONS_KEY).forEach(r => { if (r.userId === userId && r.completedAt) days.add(this._dayKey(r.completedAt)); });
    this._get(this.COMPLETIONS_KEY).forEach(r => { if (r.userId === userId && r.completedAt) days.add(this._dayKey(r.completedAt)); });
    return days;
  },
  computeStreak(userId, now = Date.now()) {
    const days = this._activeDays(userId);
    const cursor = new Date(now); cursor.setHours(12, 0, 0, 0);
    // Today not recorded yet: the streak is still alive if yesterday was active.
    if (!days.has(this._dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(this._dayKey(cursor.getTime()))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return streak;
  },
  // One-time: turn the old stored counter (streak + lastStudyDate) into day records, so existing streaks survive.
  _migrateLegacyStreak(userId) {
    const flag = `sf_streak_days_${userId}`;
    try { if (localStorage.getItem(flag)) return; } catch { return; }
    const row = this._get(this.STATS_KEY).find(r => r.userId === userId);
    const rows = this._get(this.ACTIVITY_DAYS_KEY);
    const have = new Set(rows.filter(r => r.userId === userId).map(r => r.date));
    let added = false;
    if (row && row.lastStudyDate && Number(row.streak) > 0) {
      const cursor = new Date(row.lastStudyDate); cursor.setHours(12, 0, 0, 0);
      for (let i = 0; i < Math.min(Number(row.streak), 400); i++) {
        const key = this._dayKey(cursor.getTime());
        if (!have.has(key)) { rows.push({ id: `${userId}_${key}`, userId, date: key, at: cursor.getTime(), legacy: true }); added = true; }
        cursor.setDate(cursor.getDate() - 1);
      }
    }
    if (added) this._set(this.ACTIVITY_DAYS_KEY, rows);
    try { localStorage.setItem(flag, '1'); } catch {}
  },
  // "Clear all sessions": days before this moment no longer count (the marker merges across devices like any day).
  resetStreak(userId) {
    const rows = this._get(this.ACTIVITY_DAYS_KEY).filter(r => !(r.userId === userId && r.id === `${userId}_reset`));
    rows.push({ id: `${userId}_reset`, userId, resetAt: Date.now() });
    this._set(this.ACTIVITY_DAYS_KEY, rows);
  },
  recordActivity(userId) {
    this._migrateLegacyStreak(userId);
    const key = this._dayKey(Date.now());
    const rows = this._get(this.ACTIVITY_DAYS_KEY);
    const resetAt = this._resetAt(userId), existing = rows.find(r => r.userId === userId && r.date === key);
    if (!existing) { rows.push({ id: `${userId}_${key}`, userId, date: key, at: Date.now() }); this._set(this.ACTIVITY_DAYS_KEY, rows); }
    else if ((Number(existing.at) || 0) < resetAt) { existing.at = Date.now(); this._set(this.ACTIVITY_DAYS_KEY, rows); } // today again, after a reset
    const stats = this.getStats(userId);
    const row = this._get(this.STATS_KEY).find(r => r.userId === userId);
    // Keep the stored copy in step for older readers (export), but only write when it changed.
    if (!row || row.streak !== stats.streak) this.updateStats(userId, { streak: stats.streak, lastStudyDate: Date.now() });
    return stats;
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
    this.recordActivity(userId);

    this.updateStats(userId, {
      totalStudyHours: (stats.totalStudyHours || 0) + hoursAdded,
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
    this.recordActivity(userId);

    this.updateStats(userId, {
      totalStudyHours: (stats.totalStudyHours || 0) + hoursAdded,
      studyScore:      (stats.studyScore || 0) + scoreGain
    });
    return newSession;
  }
};

window.DB = DB;
const openedUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (openedUser?.id) DB.recordActivity(openedUser.id);
