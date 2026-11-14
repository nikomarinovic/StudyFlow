// ============================================================
// StudyFlow - Adaptive study planner (v2)
//
// Replaces the manual "Generate study plan" button. The plan is
// recomputed automatically whenever anything it depends on changes
// (timetable, availability, exams, assignments, one-day activities,
// periods, per-subject hours, completed sessions) and as time passes.
//
// - computePlan(input)  pure function, no DOM / storage (unit-testable)
// - sync()              reads DB, plans, writes generated sessions
// ============================================================
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Planner = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PLAN_ID = 'adaptive-v2';
  const GENERATED_IDS = [PLAN_ID, 'exam-horizon'];

  const DEFAULT_PREFS = {
    auto: true,
    minBlock: 45,          // shortest study block (minutes)
    maxBlock: 120,         // longest single block
    breakMin: 15,          // gap between two blocks
    bufferMin: 10,         // breathing room around classes / activities
    leadMin: 10,           // how soon after "now" a session may start
    maxSubjectsPerDay: 2,  // grouping: at most this many subjects per day
    maxTasksPerDay: 1,
    dailyMax: 240,         // study minutes on a day with classes
    dailyMaxFree: 360,     // study minutes on a free day / weekend / exam period
    stretchMin: 90,        // extra minutes/day allowed when otherwise behind
    ongoingHoursPerEcts: 0.5, // weekly self-study per ECTS when no exam is near
    midtermFactor: 0.7,
    fillThreshold: 0.5,    // fill free time when demand/capacity is above this
    courseHours: {},       // { [courseId]: { boost, extraHours, weeklyHours } }
    dismissed: []          // [{ date, start, end }] slots the student removed
  };

  const DEFAULT_TARGETS = {
    easy: { min: 5, max: 5 }, medium: { min: 10, max: 10 },
    hard: { min: 20, max: 25 }, 'very-hard': { min: 30, max: 30 }
  };

  // ── date / time helpers ─────────────────────────────────────
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = key => new Date(`${key}T12:00:00`);
  const addKey = (key, n) => { const d = dateOf(key); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);
  const toMin = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
    return m ? +m[1] * 60 + +m[2] : NaN;
  };
  const toTime = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const ceil5 = m => Math.ceil(m / 5) * 5;
  const floor5 = m => Math.floor(m / 5) * 5;
  const norm = s => String(s || '').toLocaleLowerCase('hr-HR').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const weekStartKey = key => { const d = dateOf(key); const w = d.getDay(); d.setDate(d.getDate() - (w === 0 ? 6 : w - 1)); return keyOf(d); };
  const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);

  function mergeIntervals(list) {
    const sorted = list.filter(x => x[1] > x[0]).sort((a, b) => a[0] - b[0]);
    const out = [];
    sorted.forEach(([a, b]) => {
      const last = out[out.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b); else out.push([a, b]);
    });
    return out;
  }
  function subtract(window, busy) {
    const free = [];
    let pointer = window[0];
    busy.forEach(([a, b]) => {
      if (b <= pointer || a >= window[1]) return;
      if (a > pointer) free.push([pointer, a]);
      pointer = Math.max(pointer, b);
    });
    if (pointer < window[1]) free.push([pointer, window[1]]);
    return free;
  }

  function courseForExam(exam, courses) {
    if (exam.courseId) { const byId = courses.find(c => c.id === exam.courseId); if (byId) return byId; }
    const n = norm(exam.subject);
    return n ? courses.find(c => norm(c.name) === n) || null : null;
  }

  function courseRisk(course) {
    const pass = Number(course.passPercent || 50);
    const earned = (course.assessments || []).reduce((total, a) => {
      const score = a.score === '' || a.score == null ? 0 : Number(a.score) || 0;
      return total + Math.min(score, Number(a.maxPoints) || 0) / Math.max(Number(a.maxPoints) || 1, 1) * (Number(a.weight) || 0);
    }, 0);
    return Math.max(0, (pass - earned) / Math.max(1, pass));
  }

  function phaseFor(daysToExam) {
    if (daysToExam <= 2) return { name: 'Final review', note: 'Go over formulas, mistakes and past exam tasks. Keep it light, sleep well.' };
    if (daysToExam <= 7) return { name: 'Practice', note: 'Solve past exam tasks under time pressure.' };
    if (daysToExam <= 14) return { name: 'Learn + practice', note: 'Finish the material, start solving tasks.' };
    return { name: 'Learn', note: 'Work through the lectures and understand the material.' };
  }

  // ── the planner ─────────────────────────────────────────────
  function computePlan(input) {
    const now = input.now || new Date();
    const prefs = { ...DEFAULT_PREFS, ...(input.prefs || {}) };
    const todayKey = keyOf(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const courses = input.courses || [];
    const courseById = new Map(courses.map(c => [c.id, c]));
    const targets = input.targets || DEFAULT_TARGETS;
    const availability = input.availability || {};
    const periods = input.periods || [];
    const report = { warnings: [], courses: [], needsAvailability: false, stretched: false, tight: false };

    if (!Object.keys(availability).length) {
      report.needsAvailability = true;
      return { events: [], report };
    }

    const courseHours = id => {
      const p = (prefs.courseHours || {})[id] || {};
      return {
        boost: Number(p.boost) > 0 ? Number(p.boost) : 1,
        extra: Number(p.extraHours) || 0,
        weekly: p.weeklyHours === '' || p.weeklyHours == null ? null : Number(p.weeklyHours)
      };
    };
    const doneMin = (match, sinceKey) => sum((input.done || []).filter(d => match(d) && d.date >= sinceKey), d => d.minutes);

    // ── 1. demands: what has to be studied, and by when ──────
    const exams = (input.exams || [])
      .map(e => ({ ...e, dueDate: e.dueDate || e.examDate || '' }))
      .filter(e => e.dueDate && e.dueDate >= todayKey && (!e.type || e.type === 'exam'));
    const examDays = new Map();
    exams.forEach(e => { if (!examDays.has(e.dueDate)) examDays.set(e.dueDate, []); examDays.get(e.dueDate).push(e); });

    const examsByCourse = new Map();
    exams.filter(e => e.dueDate > todayKey).forEach(e => {
      const c = courseForExam(e, courses);
      if (!c) return;
      if (!examsByCourse.has(c.id)) examsByCourse.set(c.id, []);
      examsByCourse.get(c.id).push(e);
    });

    const lookback = addKey(todayKey, -90);
    const demands = [];

    examsByCourse.forEach((list, courseId) => {
      list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const course = courseById.get(courseId);
      const ects = Number(course.ects) || 0;
      const ectsFactor = ects > 0 ? Math.min(1.4, Math.max(0.8, 0.6 + ects * 0.08)) : 1;
      const { boost, extra, weekly } = courseHours(courseId);
      list.forEach((exam, i) => {
        const base = (targets[exam.difficulty] || targets.medium || { max: 10 }).max;
        const kindFactor = exam.examKind === 'midterm' ? prefs.midtermFactor : 1;
        const sinceKey = i === 0 ? lookback : addKey(list[i - 1].dueDate, 1);
        const startKey = i === 0 ? todayKey : (sinceKey > todayKey ? sinceKey : todayKey);
        // An explicit "X hours per week" wins over the difficulty-based target.
        const targetMin = weekly != null
          ? Math.round(weekly * 60 * Math.max(1, diffDays(startKey, exam.dueDate)) / 7)
          : Math.round((base * ectsFactor * kindFactor * boost + (i === 0 ? extra : 0)) * 60);
        const done = doneMin(d => d.courseId === courseId && !d.taskId, sinceKey);
        demands.push({
          id: `exam:${exam.id}`, group: courseId, courseId, kind: 'exam', examId: exam.id,
          examKind: exam.examKind || '', due: exam.dueDate, startKey, targetMin,
          remaining0: Math.max(0, targetMin - done), done
        });
      });
    });

    (input.tasks || []).filter(t => t.status !== 'done' && t.dueDate && t.dueDate >= todayKey && Number(t.planningMinutes) > 0).forEach(t => {
      const targetMin = Number(t.planningMinutes);
      const done = doneMin(d => d.taskId === t.id, lookback);
      demands.push({
        id: `task:${t.id}`, group: `task:${t.id}`, courseId: t.courseId || '', kind: 'task', taskId: t.id,
        title: t.title, due: addKey(t.dueDate, 1), startKey: todayKey, targetMin,
        remaining0: Math.max(0, targetMin - done), done
      });
    });

    const lastHardDue = demands.reduce((m, d) => d.due > m ? d.due : m, todayKey);
    const hasHard = demands.length > 0;
    const ongoingEnd = addKey(todayKey, hasHard ? 27 : 13);

    courses.forEach(course => {
      if (examsByCourse.has(course.id)) return;
      const ects = Number(course.ects) || 0;
      const { boost, extra, weekly } = courseHours(course.id);
      const weeklyHours = weekly != null ? weekly : (ects * prefs.ongoingHoursPerEcts * boost + extra);
      if (!(weeklyHours > 0)) return;
      for (let ws = weekStartKey(todayKey); ws <= ongoingEnd; ws = addKey(ws, 7)) {
        const start = ws > todayKey ? ws : todayKey;
        const due = addKey(ws, 7);
        const daysInWeek = diffDays(start, due);
        const targetMin = Math.round(weeklyHours * 60 * daysInWeek / 7);
        const done = doneMin(d => d.courseId === course.id && !d.taskId, ws);
        demands.push({
          id: `ongoing:${course.id}:${ws}`, group: course.id, courseId: course.id, kind: 'ongoing',
          due, startKey: start, targetMin, remaining0: Math.max(0, targetMin - done), done
        });
      }
    });

    // Manually pinned future sessions already cover part of the demand.
    (input.fixedStudy || []).filter(e => e.date >= todayKey && !e.completed).forEach(e => {
      let minutes = toMin(e.end) - toMin(e.start);
      if (!(minutes > 0)) return;
      demands.filter(d => (e.taskId ? d.taskId === e.taskId : d.courseId === e.courseId && d.kind !== 'task') && e.date < d.due && e.date >= d.startKey)
        .sort((a, b) => a.due.localeCompare(b.due))
        .forEach(d => { const take = Math.min(minutes, d.remaining0); d.remaining0 -= take; minutes -= take; });
    });

    const horizonEnd = (() => {
      let end = addKey(lastHardDue, -1);
      if (end < todayKey) end = todayKey;
      if (demands.some(d => d.kind === 'ongoing') && ongoingEnd > end) end = ongoingEnd;
      const cap = addKey(todayKey, 210);
      return end > cap ? cap : end;
    })();

    // ── 2. days: when can I study? ───────────────────────────
    const labWeeks = input.labWeeks || {};
    const days = [];
    const idxOf = new Map();
    const inRange = (e, key) => !(e.activeFrom && key < e.activeFrom || e.activeUntil && key > e.activeUntil);

    for (let key = todayKey; key <= horizonEnd; key = addKey(key, 1)) {
      const dow = dateOf(key).getDay();
      const setting = availability[(dow + 6) % 7]; // availability is stored Monday = 0
      const period = periods.find(p => p.suspendClasses && key >= p.startDate && key <= p.endDate);
      const day = { key, dow, skip: false, free: [], freeTotal: 0, limit: 0, fixedMin: 0, hasClasses: false };
      days.push(day); idxOf.set(key, days.length - 1);

      if (!setting || setting.enabled === false) { day.skip = true; continue; }
      let start = toMin(period ? (period.studyStart || '09:00') : (setting.start || '16:00'));
      let end = toMin(period ? (period.studyEnd || '18:00') : (setting.end || '20:00'));
      if (key === todayKey) start = Math.max(start, ceil5(nowMin + prefs.leadMin));
      if (!(end > start)) { day.skip = true; continue; }

      const busy = [];
      const expand = (a, b) => busy.push([a - prefs.bufferMin, b + prefs.bufferMin]);
      const weekKey = weekStartKey(key);
      const labWeek = labWeeks[weekKey];

      (input.events || []).forEach(e => {
        if (e.type === 'study') return;
        const a = toMin(e.start), b = toMin(e.end);
        if (!(b > a)) return;
        if (e.repeat === 'weekly') {
          if (Number(e.day) !== dow || !inRange(e, key) || period) return;
          if (e.type === 'lab' && labWeek) return; // this week's labs were confirmed explicitly
          expand(a, b); day.hasClasses = true;
        } else if (e.date === key) {
          expand(a, b); if (!e.temporary) day.hasClasses = true;
        }
      });
      (labWeek?.events || []).filter(e => e.date === key).forEach(e => {
        const a = toMin(e.start), b = toMin(e.end);
        if (b > a) { expand(a, b); day.hasClasses = true; }
      });

      (examDays.get(key) || []).forEach(e => {
        const t = toMin(e.startTime);
        // Unknown start: assume the exam and recovery take the morning, keep the afternoon for other subjects.
        if (Number.isNaN(t)) busy.push([0, 14 * 60]); else busy.push([t - 60, t + 180]);
      });

      (input.fixedStudy || []).filter(e => e.date === key).forEach(e => {
        const a = toMin(e.start), b = toMin(e.end);
        if (b > a) { busy.push([a, b]); day.fixedMin += b - a; }
      });
      (prefs.dismissed || []).filter(s => s.date === key).forEach(s => busy.push([toMin(s.start), toMin(s.end)]));
      if (period && end - start >= 360) busy.push([12 * 60, 13 * 60]);

      day.free = subtract([start, end], mergeIntervals(busy)).filter(([a, b]) => b - a >= 30);
      day.freeTotal = sum(day.free, ([a, b]) => b - a);
      day.limit = period ? prefs.dailyMaxFree + 60 : day.hasClasses ? prefs.dailyMax : prefs.dailyMaxFree;
    }

    // ── 3. simulate day by day ───────────────────────────────
    const weight = (j, dueIdx, kind) => {
      if (kind !== 'exam') return 1;
      const before = dueIdx - j;
      return before === 1 ? 2.2 : 1 + Math.max(0, 1 - before / 21); // ramp up towards the exam
    };

    function simulate(bonus) {
      const ds = demands.map(d => ({ ...d, remaining: d.remaining0, owed: 0 }));
      const capOf = day => day.skip ? 0 : Math.max(0, Math.min(day.freeTotal, day.limit + bonus - day.fixedMin));
      const capDays = days.map(day => capOf(day) >= 30);
      const dueIdxFor = d => idxOf.has(d.due) ? idxOf.get(d.due) : days.length;
      // How full is the next two weeks? Decides whether to spread out or to use every free hour.
      const pressureAt = i => {
        const lim = Math.min(days.length, i + 14);
        const cap = sum(days.slice(i, lim), capOf);
        const need = sum(ds.filter(d => d.remaining > 0 && d.kind !== 'ongoing' && dueIdxFor(d) <= lim), d => d.remaining);
        return cap > 0 ? need / cap : (need > 0 ? 9 : 0);
      };
      const tight = pressureAt(0) > prefs.fillThreshold;
      const lastStudied = new Map();
      const events = [];
      const dueIdxOf = d => idxOf.has(d.due) ? idxOf.get(d.due) : days.length;

      const quota = (d, i) => {
        const dueIdx = dueIdxOf(d);
        let total = 0;
        for (let j = i; j < dueIdx && j < days.length; j++) if (capDays[j]) total += weight(j, dueIdx, d.kind);
        return total > 0 ? d.remaining * weight(i, dueIdx, d.kind) / total : 0;
      };

      days.forEach((day, i) => {
        if (!capDays[i]) return;
        const key = day.key;
        const free = day.free.map(x => x.slice());
        const budget = Math.max(0, Math.min(day.freeTotal, day.limit + bonus - day.fixedMin));

        const pressure = pressureAt(i), fill = pressure > prefs.fillThreshold;
        const active = ds.filter(d => d.remaining > 0 && key >= d.startKey && key < d.due);
        active.forEach(d => { d.owed = Math.min(d.remaining, d.owed + quota(d, i)); });

        const groups = new Map();
        active.forEach(d => { if (!groups.has(d.group)) groups.set(d.group, []); groups.get(d.group).push(d); });

        const cands = [...groups.entries()].map(([group, list]) => {
          list.sort((a, b) => a.due.localeCompare(b.due));
          const first = list[0];
          const isTask = first.kind === 'task';
          const course = courseById.get(first.courseId);
          const remaining = sum(list, d => d.remaining);
          const owed = sum(list, d => d.owed);
          const daysToDue = diffDays(key, first.due);
          let capLeft = 0;
          for (let j = i; j < dueIdxOf(first) && j < days.length; j++) if (capDays[j]) capLeft++;
          const since = lastStudied.has(group) ? i - lastStudied.get(group) : 3;
          const urgency = remaining / Math.max(1, capLeft) * (daysToDue <= 3 ? 1.8 : daysToDue <= 7 ? 1.35 : 1)
            * (1 + 0.5 * (course ? courseRisk(course) : 0)) + 4 * Math.min(since, 10);
          const minB = isTask ? Math.min(30, ceil5(remaining)) : prefs.minBlock;
          const eligible = owed >= minB - 5 || (isTask && daysToDue <= 2) || (first.kind === 'exam' && daysToDue === 1);
          return { group, list, first, isTask, course, remaining, owed, daysToDue, urgency, minB, eligible,
            score: urgency + (isTask && daysToDue <= 2 ? 1000 : 0),
            cap: daysToDue <= 3 || pressure > 0.8 ? Math.min(180, Math.round(prefs.maxBlock * 1.5)) : prefs.maxBlock };
        });

        const byScore = (a, b) => b.score - a.score;
        const maxSubjects = pressure > 0.85 ? prefs.maxSubjectsPerDay + 1 : prefs.maxSubjectsPerDay;
        const chosen = [
          ...cands.filter(c => c.isTask && c.eligible).sort(byScore).slice(0, prefs.maxTasksPerDay),
          ...cands.filter(c => !c.isTask && c.eligible).sort(byScore).slice(0, maxSubjects)
        ];
        // The subject whose exam is tomorrow always gets its final review, even above the daily subject limit.
        cands.filter(c => c.first.kind === 'exam' && c.daysToDue === 1 && !chosen.includes(c)).sort(byScore).slice(0, 1).forEach(c => chosen.push(c));
        chosen.sort(byScore);

        const wantOf = c => Math.max(5, Math.min(ceil5(c.remaining), c.cap, Math.max(c.minB, ceil5(c.owed))));
        chosen.forEach(c => { c.want = wantOf(c); });

        let total = sum(chosen, c => c.want);
        for (let k = chosen.length - 1; k >= 0 && total > budget; k--) { // shrink the least important first
          const give = Math.min(chosen[k].want - chosen[k].minB, total - budget);
          if (give > 0) { chosen[k].want -= give; total -= give; }
        }
        while (chosen.length && total > budget) { const dropped = chosen.pop(); total -= dropped.want; }
        if (!chosen.length && budget >= 30) { // nothing eligible fits: use what is left for the most urgent demand
          const c = cands.filter(x => x.minB <= budget).sort(byScore)[0];
          if (c && c.eligible) { c.want = Math.min(c.cap, floor5(budget), ceil5(c.remaining)); chosen.push(c); total = c.want; }
        }

        if (fill && total < budget) { // busy period: use the free time instead of leaving gaps
          chosen.forEach(c => {
            const room = Math.min(c.cap, ceil5(c.remaining)) - c.want, add = Math.min(room, budget - total);
            if (add >= 5) { c.want += floor5(add); total += floor5(add); }
          });
          const subjects = () => chosen.filter(c => !c.isTask).length;
          cands.filter(c => !c.isTask && !chosen.includes(c)).sort(byScore).forEach(c => {
            if (subjects() >= maxSubjects) return;
            const w = Math.min(c.cap, ceil5(c.remaining), floor5(budget - total));
            if (w >= prefs.minBlock) { c.want = w; chosen.push(c); total += w; }
          });
          chosen.sort(byScore);
        }

        // place sequentially, earliest free time first
        chosen.forEach(c => {
          let left = c.want, placed = 0;
          for (let f = 0; f < free.length && left >= 5; f++) {
            while (left >= 5) {
              const [a, b] = free[f];
              const len = b - a;
              if (len < Math.min(c.minB, left)) break;
              let chunk = Math.min(len, left, prefs.maxBlock);
              const rest = left - chunk;
              if (rest > 0 && rest < c.minB && Math.min(len, left) <= Math.round(prefs.maxBlock * 1.25)) chunk = Math.min(len, left);
              chunk = floor5(chunk);
              if (chunk < Math.min(c.minB, 30)) break;
              const course = c.course;
              const phase = c.first.kind === 'exam' ? phaseFor(c.daysToDue) : null;
              events.push({
                title: c.isTask ? `Task · ${c.first.title}` : `Study · ${course ? course.name : 'Study'}`,
                courseId: c.first.courseId || '', taskId: c.isTask ? c.first.taskId : '',
                type: 'study', repeat: 'once', date: key, start: toTime(a), end: toTime(a + chunk),
                color: course?.color || (c.isTask ? '#64748b' : '#3978c5'),
                generatedPlanId: PLAN_ID, generatedWeek: weekStartKey(key),
                phase: phase ? phase.name : '', planGroup: `${key}:${c.group}`,
                description: c.isTask ? 'Scheduled time for your assignment.'
                  : phase ? `${phase.name} · ${c.first.examKind === 'midterm' ? 'midterm' : 'exam'} on ${c.first.due}. ${phase.note}`
                    : 'Regular weekly study.'
              });
              left -= chunk; placed += chunk;
              free[f] = [a + chunk + prefs.breakMin, b];
              if (free[f][1] - free[f][0] < 30) break;
            }
          }
          if (placed > 0) {
            let take = placed;
            c.list.forEach(d => { // nearest deadline first
              const t = Math.min(take, d.remaining); d.remaining -= t; d.owed = Math.max(0, d.owed - t); take -= t;
            });
            lastStudied.set(c.group, i);
          }
        });
      });
      return { events, ds, tight };
    }

    const shortfall = r => sum(r.ds.filter(d => d.kind !== 'ongoing'), d => d.remaining);
    let result = simulate(0);
    if (shortfall(result) > 0) {
      const stretched = simulate(prefs.stretchMin);
      if (shortfall(stretched) < shortfall(result)) { result = stretched; report.stretched = true; }
    }
    report.tight = result.tight;

    // ── 4. report ────────────────────────────────────────────
    const minutesOf = e => toMin(e.end) - toMin(e.start);
    const perCourse = new Map();
    const row = id => {
      if (!perCourse.has(id)) {
        const c = courseById.get(id);
        perCourse.set(id, { courseId: id, name: c ? c.name : 'Other', targetMin: 0, plannedMin: 0, doneMin: 0, shortfallMin: 0, nextDue: '', firstSession: null });
      }
      return perCourse.get(id);
    };
    result.ds.forEach(d => {
      const r = row(d.courseId || d.group);
      r.targetMin += d.targetMin; r.doneMin += d.done;
      if (d.kind !== 'ongoing') {
        r.shortfallMin += d.remaining;
        if (!r.nextDue || d.due < r.nextDue) r.nextDue = d.due;
        if (d.remaining >= 30) report.warnings.push({ type: 'shortfall', courseId: d.courseId, name: r.name, minutes: d.remaining, due: d.due, kind: d.kind, title: d.title || '' });
      }
    });
    result.events.forEach(e => {
      const r = row(e.courseId || e.planGroup.split(':')[1]);
      r.plannedMin += minutesOf(e);
      if (!r.firstSession || (e.date + e.start) < (r.firstSession.date + r.firstSession.start)) r.firstSession = { date: e.date, start: e.start };
    });
    report.courses = [...perCourse.values()].sort((a, b) => (a.nextDue || '9').localeCompare(b.nextDue || '9'));
    report.firstSession = result.events.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0] || null;
    report.totalPlannedMin = sum(result.events, minutesOf);

    return { events: result.events, report };
  }

  // ── storage glue (browser only) ─────────────────────────────
  const api = { PLAN_ID, DEFAULT_PREFS, computePlan, courseForExam, norm, keyOf, _busy: false };

  function currentUserId() {
    try { return JSON.parse(localStorage.getItem('sf_current_user') || 'null')?.id || null; } catch { return null; }
  }
  const isGenerated = e => GENERATED_IDS.includes(e.generatedPlanId) || Boolean(e.generatedWeek);

  function classifyStudy(userId, now) {
    const events = DB.getAcademicEvents(userId).filter(e => e.type === 'study');
    const todayKey = keyOf(now), nowMin = now.getHours() * 60 + now.getMinutes();
    const removable = [], fixed = [];
    events.forEach(e => {
      const completed = DB.isCompleted(userId, `acad-${e.id}-${e.date}`);
      const future = e.date > todayKey || (e.date === todayKey && toMin(e.start) >= nowMin);
      if (isGenerated(e) && !e.locked && !e.updatedAt && !completed && future) removable.push(e);
      else fixed.push({ ...e, completed });
    });
    return { removable, fixed };
  }

  function archiveTemporary(userId, now) {
    const todayKey = keyOf(now), nowMin = now.getHours() * 60 + now.getMinutes();
    const all = DB._get(DB.EVENTS_KEY);
    const expired = all.filter(e => e.userId === userId && e.temporary && e.date && (e.date < todayKey || (e.date === todayKey && toMin(e.end) <= nowMin)));
    if (!expired.length) return 0;
    const log = DB._get(DB.ACTIVITY_LOG_KEY);
    expired.forEach(e => { if (!log.some(x => x.id === e.id)) log.push({ ...e, archivedAt: Date.now() }); });
    DB._set(DB.ACTIVITY_LOG_KEY, log);
    const ids = new Set(expired.map(e => e.id));
    DB._set(DB.EVENTS_KEY, all.filter(e => !ids.has(e.id)));
    return expired.length;
  }

  function gather(userId, now, prefs) {
    const activeId = DB.getActiveSchedule(userId)?.id;
    const all = DB.getAcademicEvents(userId);
    const evById = new Map(all.map(e => [e.id, e]));
    const courses = DB.getCourses(userId);
    const byName = name => { const n = norm(String(name || '').replace(/^(Study|Task) · /, '')); return n ? courses.find(c => norm(c.name) === n) : null; };
    const done = [];
    DB.getCompletions(userId).forEach(c => {
      const m = /^acad-(.+)-(\d{4}-\d{2}-\d{2})$/.exec(c.blockId || '');
      const ev = m && evById.get(m[1]);
      if (ev) { done.push({ courseId: ev.courseId || '', taskId: ev.taskId || '', date: m[2], minutes: Number(c.durationMinutes) || 0 }); return; }
      const course = byName(c.subject);
      if (course) done.push({ courseId: course.id, taskId: '', date: keyOf(new Date(c.completedAt || Date.now())), minutes: Number(c.durationMinutes) || 0 });
    });
    DB.getSessions(userId).forEach(s => {
      const course = byName(s.subject);
      if (course) done.push({ courseId: course.id, taskId: '', date: keyOf(new Date(s.completedAt || Date.now())), minutes: Number(s.duration) || 0 });
    });
    const labWeeks = {};
    DB._get(DB.LAB_WEEKS_KEY).filter(w => w.userId === userId).forEach(w => { labWeeks[w.weekKey] = w; });
    const { fixed } = classifyStudy(userId, now);
    const todayKey = keyOf(now);
    return {
      now, prefs: { ...prefs, dismissed: (prefs.dismissed || []).filter(s => s.date >= todayKey) },
      courses, events: all.filter(e => e.type !== 'study' && (!e.scheduleId || e.scheduleId === activeId)),
      fixedStudy: fixed, labWeeks, periods: DB.getPeriods(userId),
      exams: DB.getExams(userId).map(e => ({ ...e, dueDate: e.dueDate || e.examDate })),
      tasks: DB.getTasks(userId), availability: DB.getAvailability(userId),
      targets: DB.getPlannerSettings(userId), done
    };
  }

  function commit(userId, now, events) {
    const { removable } = classifyStudy(userId, now);
    const keyFor = e => `${e.date}|${e.start}|${e.end}|${e.courseId || ''}|${e.taskId || ''}`;
    const existing = new Map(removable.map(e => [keyFor(e), e]));
    const keep = new Set(), additions = [];
    events.forEach(e => {
      const k = keyFor(e);
      if (existing.has(k) && !keep.has(existing.get(k).id)) keep.add(existing.get(k).id);
      else additions.push({ id: DB._id(), userId, createdAt: Date.now(), ...e });
    });
    const dropIds = new Set(removable.filter(e => !keep.has(e.id)).map(e => e.id));
    const staleKey = addKey(keyOf(now), -14);
    const all = DB._get(DB.EVENTS_KEY);
    const stale = all.filter(e => e.userId === userId && e.type === 'study' && isGenerated(e) && e.date < staleKey && !DB.isCompleted(userId, `acad-${e.id}-${e.date}`));
    stale.forEach(e => dropIds.add(e.id));
    if (!dropIds.size && !additions.length) return false;
    DB._set(DB.EVENTS_KEY, [...all.filter(e => !dropIds.has(e.id)), ...additions]);
    return true;
  }

  function sync(opts = {}) {
    const userId = opts.userId || currentUserId();
    if (!userId || typeof DB === 'undefined' || api._busy) return null;
    const prefs = { ...DEFAULT_PREFS, ...DB.getPlannerPrefs(userId) };
    if (prefs.auto === false && !opts.force) return null;
    api._busy = true;
    try {
      const now = opts.now || new Date();
      const archived = archiveTemporary(userId, now);
      const { events, report } = computePlan(gather(userId, now, prefs));
      const changed = commit(userId, now, events) || archived > 0;
      try { localStorage.setItem(`sf_planner_report_${userId}`, JSON.stringify({ ...report, at: Date.now() })); } catch {}
      window.dispatchEvent(new CustomEvent('sf:planner-updated', { detail: { changed, report } }));
      return { changed, report };
    } catch (error) {
      console.error('Planner failed:', error);
      return null;
    } finally { api._busy = false; }
  }

  function getReport(userId) {
    try { return JSON.parse(localStorage.getItem(`sf_planner_report_${userId || currentUserId()}`) || 'null'); } catch { return null; }
  }
  function clearGenerated(userId) {
    const all = DB._get(DB.EVENTS_KEY);
    const ids = new Set(all.filter(e => e.userId === userId && e.type === 'study' && isGenerated(e) && !DB.isCompleted(userId, `acad-${e.id}-${e.date}`)).map(e => e.id));
    if (ids.size) DB._set(DB.EVENTS_KEY, all.filter(e => !ids.has(e.id)));
    return ids.size;
  }

  Object.assign(api, { sync, getReport, archiveTemporary, clearGenerated, isGenerated });

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const WATCHED = new Set(['sf_academic_events', 'sf_tasks', 'sf_availability', 'sf_academic_periods', 'sf_courses', 'sf_items',
      'sf_exams', 'sf_schedules', 'sf_lab_weeks', 'sf_completions', 'sf_sessions', 'sf_planner_prefs', 'sf_planner_settings']);
    let timer = null;
    const schedule = (delay = 350) => { clearTimeout(timer); timer = setTimeout(() => api.sync(), delay); };
    window.addEventListener('sf:store-changed', e => { if (!api._busy && WATCHED.has(e.detail?.key)) schedule(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(100); });
    setInterval(() => { if (document.visibilityState === 'visible') api.sync(); }, 5 * 60 * 1000);
    document.addEventListener('DOMContentLoaded', () => schedule(0));
  }

  return api;
});
