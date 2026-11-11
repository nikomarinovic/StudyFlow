const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

const DIFFICULTY_HOURS = { easy: 5, medium: 10, hard: 15, 'very-hard': 20 };
const DAILY_LIMIT      = 2;
const CIRCUMFERENCE    = 2 * Math.PI * 22; // for 52×52 SVG ring r=22 → ~138.2

let currentWeekStart = getStartOfWeek(new Date());
let selectedDate     = new Date();
let miniMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let calendarView = localStorage.getItem('sf_calendar_view') || 'week';
let calendarFilters = {timetable:true,study:true,exams:true,deadlines:true};
try { calendarFilters={...calendarFilters,...JSON.parse(localStorage.getItem('sf_calendar_filters')||'{}')}; } catch {}
if(!['day','week','month'].includes(calendarView))calendarView='week';

// ── Utilities ─────────────────────────────────────────────────
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function fmtDate(date, fmt) {
  const d = new Date(date);
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekdays= ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const short   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (fmt==='MMM d')       return `${months[d.getMonth()]} ${d.getDate()}`;
  if (fmt==='MMM d, yyyy') return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (fmt==='EEEE')        return weekdays[d.getDay()];
  if (fmt==='EEE')         return short[d.getDay()];
  if (fmt==='d')           return d.getDate().toString();
  if (fmt==='MMMM yyyy')   return `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`;
  return d.toDateString();
}
function diffColor(difficulty) {
  if (difficulty==='very-hard') return 'very-danger';
  if (difficulty==='hard')      return 'danger';
  if (difficulty==='medium')    return 'warning';
  return 'success';
}
function calendarEscape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ── Schedule generator ────────────────────────────────────────
function generateSchedule(items, sessions) {
  const scheduled  = [];
  const today      = new Date(); today.setHours(0,0,0,0);
  const dailySlots = {};
  const START      = 9 * 60;
  const BREAK      = 15;

  items.filter(i => i.type === 'exam').forEach(exam => {
    try {
      const dateKey  = exam.dueDate || exam.examDate || '';
      const examDate = new Date(dateKey + 'T12:00:00');
      examDate.setHours(0,0,0,0);
      const daysUntil = Math.ceil((examDate - today) / 86400000);
      const color     = diffColor(exam.difficulty);

      // Exam-day marker
      scheduled.push({
        id: `examday-${exam.id}`, blockId: `examday-${exam.id}`,
        subject: exam.subject, topic: [exam.examKind==='midterm'?'Midterm / kolokvij':exam.examKind==='final'?'Final examination':'',exam.topic].filter(Boolean).join(' · '),
        time: exam.startTime || '—', location:exam.location||'', durationMinutes: 0, duration: '—',
        color: 'exam-day', type: 'exam-day',
        date: new Date(examDate), examId: exam.id,
        difficulty: exam.difficulty
      });

      if (daysUntil <= 0 || exam.courseId && DB.getCourses(currentUser.id).some(c=>c.id===exam.courseId)) return;

      const totalH   = DIFFICULTY_HOURS[exam.difficulty] || 10;
      const studiedH = sessions.filter(s => s.subject === exam.subject)
                               .reduce((sum,s) => sum + s.duration/60, 0);
      let hoursLeft  = Math.max(0, totalH - studiedH);
      if (hoursLeft <= 0) return;

      const daysNeeded   = Math.ceil(hoursLeft / DAILY_LIMIT);
      const daysToUse    = Math.min(daysNeeded, daysUntil);
      const scheduleFrom = addDays(examDate, -daysToUse);
      scheduleFrom.setHours(0,0,0,0);
      const startFrom  = scheduleFrom < today ? today : scheduleFrom;
      const actualDays = Math.ceil((examDate - startFrom) / 86400000);
      if (actualDays <= 0) return;

      for (let i = 0; i < actualDays && hoursLeft > 0; i++) {
        const day    = addDays(startFrom, i);
        const dayKey = day.toISOString().split('T')[0];
        if (!dailySlots[dayKey]) dailySlots[dayKey] = START;

        const daysRemaining = actualDays - i;
        const sessionH = Math.min(DAILY_LIMIT, Math.ceil((hoursLeft / daysRemaining) * 2) / 2);
        if (sessionH < 0.5) { hoursLeft = 0; break; }

        const mins     = Math.round(sessionH * 60);
        const startMin = dailySlots[dayKey];
        const h = Math.floor(startMin/60).toString().padStart(2,'0');
        const m = (startMin%60).toString().padStart(2,'0');
        const blockId  = `sched-${exam.id}-${dayKey}`;

        scheduled.push({
          id: blockId, blockId,
          subject: exam.subject, topic: exam.topic,
          time: `${h}:${m}`, durationMinutes: mins,
          duration: `${mins} min`,
          color, type: 'scheduled',
          date: new Date(day), examId: exam.id,
          difficulty: exam.difficulty
        });

        dailySlots[dayKey] = startMin + mins + BREAK;
        hoursLeft -= sessionH;
      }
    } catch(e) { console.error(e); }
  });

  items.filter(i => i.type !== 'exam').forEach(item => {
    try {
      const dateKey = item.dueDate || item.examDate || '';
      const dueDate = new Date(dateKey + 'T12:00:00');
      dueDate.setHours(0,0,0,0);
      if (dueDate < today) return;
      const color = item.type === 'project' ? 'project' : 'reminder';

      scheduled.push({
        id: `event-${item.id}-due`, blockId: `event-${item.id}-due`,
        subject: item.subject, topic: item.topic,
        time: '—', durationMinutes: 0, duration: '—',
        color, type: item.type,
        date: new Date(dueDate), notes: item.notes || ''
      });

      if (item.type === 'reminder' && item.reminderDaysBefore > 0) {
        const notifyDate = addDays(dueDate, -item.reminderDaysBefore);
        if (notifyDate >= today) {
          scheduled.push({
            id: `event-${item.id}-notify`, blockId: `event-${item.id}-notify`,
            subject: `Reminder: ${item.subject}`, topic: item.topic,
            time: '—', durationMinutes: 0, duration: '—',
            color: 'reminder-notify', type: 'reminder-notify',
            date: new Date(notifyDate), notes: item.notes || ''
          });
        }
      }
    } catch(e) { console.error(e); }
  });

  // Add the student's weekly timetable, one-off activities, generated plan,
  // and coursework to the existing calendar view.
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const visibleDays=calendarView==='month'?42:calendarView==='day'?1:7;
  const firstDay=calendarView==='month'?getStartOfWeek(currentMonth):calendarView==='day'?new Date(selectedDate):getStartOfWeek(currentWeekStart);
  for (let offset = 0; offset < visibleDays; offset++) {
    const day = addDays(firstDay, offset), dayKey = iso(day), weekday = day.getDay(), weekKey=iso(getStartOfWeek(day));
    const labWeek = DB.getLabWeek?.(currentUser.id, weekKey);
    const period = DB.getPeriods?.(currentUser.id).find(p => p.suspendClasses && dayKey >= p.startDate && dayKey <= p.endDate);
    DB.getAcademicEvents?.(currentUser.id).forEach(event => {
      if (event.type === 'lab' && event.weekKey === weekKey) return;
      if (event.repeat === 'weekly') {
        if ((event.type !== 'study' && period) || Number(event.day) !== weekday) return;
        if (event.type === 'lab' && labWeek) return;
      } else if (event.date !== dayKey) return;
      const durationMinutes=event.type==='study'&&event.start&&event.end?Math.max(0,(Number(event.end.slice(0,2))*60+Number(event.end.slice(3)))-(Number(event.start.slice(0,2))*60+Number(event.start.slice(3)))):0;
      scheduled.push({ id:`acad-${event.id}-${dayKey}`, blockId:`acad-${event.id}-${dayKey}`, subject:event.title, topic:[event.type,event.location,event.description].filter(Boolean).join(' · '), time:event.start||'—', end:event.end||'', durationMinutes, duration:durationMinutes?`${durationMinutes} min`:'—', color:event.color||'academic-event', type:event.type==='study'?'scheduled':'academic', date:new Date(day), courseId:event.courseId, eventId:event.id, location:event.location||'' });
    });
    if (labWeek?.weekKey === weekKey) (labWeek.events||[]).forEach((event,index) => {
      if (event.date !== dayKey) return;
      scheduled.push({ id:`lab-${labWeek.id}-${index}`, blockId:`lab-${labWeek.id}-${index}`, subject:event.title, topic:[event.type,event.location,event.description].filter(Boolean).join(' · '), time:event.start||'—', end:event.end||'', durationMinutes:0, duration:'—', color:event.color||'academic-event', type:'academic', date:new Date(day), courseId:event.courseId, eventId:event.id, location:event.location||'' });
    });
  }
  DB.getTasks?.(currentUser.id).filter(task => task.status !== 'done' && task.dueDate).forEach(task => {
    const due = new Date(`${task.dueDate}T12:00:00`);
    scheduled.push({ id:`task-${task.id}`, blockId:`task-${task.id}`, subject:task.title, topic:[DB.getCourses?.(currentUser.id).find(c=>c.id===task.courseId)?.name,task.dueTime].filter(Boolean).join(' · '), time:task.dueTime||'—', durationMinutes:0, duration:'—', color:'assignment', type:'assignment', date:due, notes:task.description||'' });
  });

  return scheduled;
}

// ── Score toast ────────────────────────────────────────────────
function showScoreToast(points) {
  const t = document.createElement('div');
  t.className = 'cal-score-toast';
  t.innerHTML = `+${points} pts <span style="font-size:.85em;opacity:.75">Study Score</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 2400);
}

// ── Toggle completion ──────────────────────────────────────────
function toggleComplete(blockId, subject, durationMinutes) {
  if (DB.isCompleted(currentUser.id, blockId)) {
    DB.uncompleteBlock(currentUser.id, blockId);
  } else {
    const gained = DB.completeBlock(currentUser.id, blockId, { subject, durationMinutes });
    if (gained) showScoreToast(Math.round(durationMinutes * 1.5));
  }
  refresh();
}

// ── Week nav ───────────────────────────────────────────────────
function renderWeekNav() {
  const end = addDays(currentWeekStart, 6);
  document.getElementById('weekRange').textContent = calendarView==='month'
    ? fmtDate(currentMonth,'MMMM yyyy') : calendarView==='day'
      ? fmtDate(selectedDate,'MMM d, yyyy') : `${fmtDate(currentWeekStart,'MMM d')} – ${fmtDate(end,'MMM d, yyyy')}`;
}

// ── Week progress + summary ────────────────────────────────────
function renderWeekProgress(scheduled) {
  // Build set of ISO date strings for the current week
  const weekDays = new Set();
  const visibleDays=calendarView==='month'?42:calendarView==='day'?1:7;
  const firstDay=calendarView==='month'?getStartOfWeek(currentMonth):calendarView==='day'?new Date(selectedDate):currentWeekStart;
  for (let i = 0; i < visibleDays; i++) weekDays.add(addDays(firstDay, i).toISOString().split('T')[0]);

  const inWeek = s => weekDays.has(new Date(s.date).toISOString().split('T')[0]);

  const studyBlocks   = scheduled.filter(s => s.type === 'scheduled' && inWeek(s));
  const total         = studyBlocks.length;
  const completed     = studyBlocks.filter(s => DB.isCompleted(currentUser.id, s.blockId)).length;
  const pct           = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalMins     = studyBlocks.reduce((sum,s) => sum + (s.durationMinutes||0), 0);
  const examsThisWeek = scheduled.filter(s => s.type === 'exam-day' && inWeek(s)).length;

  document.getElementById('weekProgressFill').style.width = pct + '%';
  document.getElementById('weekProgressPct').textContent  = pct + '%';
  document.getElementById('weekProgressLabel').textContent =
    `${calendarView==='month'?'Month':calendarView==='day'?'Day':'Week'} progress — ${completed} of ${total} sessions done`;

  document.getElementById('wssCompleted').textContent = completed;
  document.getElementById('wssTotal').textContent     = total;
  const h = Math.floor(totalMins/60), m = totalMins%60;
  document.getElementById('wssHours').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('wssExams').textContent  = examsThisWeek;
  document.querySelector('.wss-exams-label')?.replaceChildren(document.createTextNode(calendarView==='month'?'exams this month':calendarView==='day'?'exams today':'exams this week'));
}

// ── Week grid ──────────────────────────────────────────────────
function renderWeekGrid(items, sessions, scheduled) {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  grid.className = 'week-grid';
  if (calendarView !== 'month') {
    renderTimeGrid(grid, scheduled);
    return;
  }
  const visibleDays=calendarView==='month'?42:calendarView==='day'?1:7;
  const firstDay=calendarView==='month'?getStartOfWeek(currentMonth):calendarView==='day'?new Date(selectedDate):currentWeekStart;
  grid.dataset.view=calendarView;
  const CIRC_SMALL = 2 * Math.PI * 9; // r=9 for the small day-cell rings

  for (let i = 0; i < visibleDays; i++) {
    const date        = addDays(firstDay, i);
    const dayScheduled = scheduled.filter(s => isSameDay(s.date, date));
    const studyBlocks  = dayScheduled.filter(b => b.type === 'scheduled');
    const doneCount    = studyBlocks.filter(b => DB.isCompleted(currentUser.id, b.blockId)).length;
    const hasExam      = dayScheduled.some(b => b.type === 'exam-day');
    const pct          = studyBlocks.length > 0 ? doneCount / studyBlocks.length : 0;
    const offset       = CIRC_SMALL - pct * CIRC_SMALL;
    const ringColor    = pct === 1 ? 'var(--success)' : 'var(--primary)';

    const cell = document.createElement('button');
    cell.className = 'day-cell';
    if (isSameDay(date, selectedDate)) cell.classList.add('selected');
    if (isSameDay(date, new Date()))   cell.classList.add('today');
    if (calendarView==='month'&&date.getMonth()!==currentMonth.getMonth()) cell.classList.add('other-month-day');
    if (hasExam)                       cell.classList.add('exam-day-cell');

    const indicators = dayScheduled.slice(0,3).map(s =>
      `<div class="indicator-bar ${/^#[0-9a-f]{6}$/i.test(s.color||'')?'custom':''}" ${/^#[0-9a-f]{6}$/i.test(s.color||'')?`style="background:${s.color}"`:''}></div>`).join('') +
      (dayScheduled.length > 3 ? `<div class="more-indicator">+${dayScheduled.length-3}</div>` : '');

    const ringHtml = studyBlocks.length > 0 ? `
      <div class="day-ring-wrap">
        <svg viewBox="0 0 22 22">
          <circle class="day-ring-bg"   cx="11" cy="11" r="9"/>
          <circle class="day-ring-fill" cx="11" cy="11" r="9"
            stroke="${hasExam ? 'rgba(255,255,255,.7)' : ringColor}"
            stroke-dasharray="${CIRC_SMALL.toFixed(1)}"
            stroke-dashoffset="${offset.toFixed(1)}"/>
        </svg>
      </div>` : '';

    cell.innerHTML = `
      ${ringHtml}
      <div class="day-name">${fmtDate(date,'EEE')}</div>
      <div class="day-number">${fmtDate(date,'d')}</div>
      <div class="day-indicators">${indicators}</div>
      ${hasExam
        ? `<div class="exam-day-pill">Exam</div>`
        : studyBlocks.length > 0
          ? `<div class="day-prog-text">${doneCount}/${studyBlocks.length}</div>`
          : ''}`;

    cell.addEventListener('click', () => {
      selectedDate = date;
      if(calendarView==='month'&&date.getMonth()!==currentMonth.getMonth()){currentMonth=new Date(date.getFullYear(),date.getMonth(),1);currentWeekStart=getStartOfWeek(currentMonth);refresh();return;}
      if(calendarView==='day')currentWeekStart=getStartOfWeek(date);
      renderWeekGrid(items, sessions, scheduled);
      renderDayDetails(items, sessions, scheduled);
    });
    grid.appendChild(cell);
  }
}

function renderTimeGrid(grid, scheduled) {
  const firstDay = calendarView === 'day' ? new Date(selectedDate) : currentWeekStart;
  const count = calendarView === 'day' ? 1 : 7;
  const days = Array.from({length:count}, (_, index) => addDays(firstDay, index));
  const startHour = 7, endHour = 22, hourHeight = 56;
  grid.className = 'week-grid calendar-time-view';
  grid.innerHTML = `<div class="calendar-time-header"><span></span>${days.map(date=>`<button type="button" class="calendar-day-heading${isSameDay(date,new Date())?' is-today':''}" data-calendar-day="${calendarDateKey(date)}"><span>${fmtDate(date,'EEE')}</span><strong>${fmtDate(date,'d')}</strong></button>`).join('')}</div>
    <div class="calendar-time-body"><div class="calendar-time-labels">${Array.from({length:endHour-startHour},(_,i)=>`<span>${String(startHour+i).padStart(2,'0')}:00</span>`).join('')}</div>
    ${days.map(date=>`<div class="calendar-time-column" data-date="${calendarDateKey(date)}">${Array.from({length:endHour-startHour},(_,i)=>`<button type="button" class="calendar-time-slot" data-hour="${startHour+i}" aria-label="Add event ${fmtDate(date,'EEEE')} ${startHour+i}:00"></button>`).join('')}
      ${scheduled.filter(event=>isSameDay(event.date,date)).map(event=>{
        const timed=/^\d{2}:\d{2}$/.test(event.time||'');
        if(!timed)return `<button type="button" class="calendar-all-day-event" data-calendar-event="${calendarEscape(event.eventId||'')}" data-date="${calendarDateKey(date)}" style="--event-color:${/^#[0-9a-f]{6}$/i.test(event.color||'')?event.color:'#4285f4'}">${calendarEscape(event.subject)}${event.eventId?'<span> · Edit</span>':''}</button>`;
        const [hour,minute]=event.time.split(':').map(Number);
        const minutes=hour*60+minute;
        const duration=Math.max(30,Number(event.durationMinutes)||(/^\d{2}:\d{2}$/.test(event.end||'')?((Number(event.end.slice(0,2))*60+Number(event.end.slice(3)))-minutes):60));
        const top=(minutes-startHour*60)/60*hourHeight;
        const height=Math.max(26,duration/60*hourHeight);
        if(top+height<0||top>(endHour-startHour)*hourHeight)return '';
        return `<button type="button" class="calendar-timed-event${event.completed?' is-completed':''}" data-calendar-event="${calendarEscape(event.eventId||'')}" data-date="${calendarDateKey(date)}" style="--event-color:${/^#[0-9a-f]{6}$/i.test(event.color||'')?event.color:event.type==='exam-day'?'#d93025':event.type==='scheduled'?'#188038':event.type==='assignment'?'#f9ab00':'#4285f4'};top:${Math.max(0,top)}px;height:${Math.min(height,(endHour-startHour)*hourHeight-Math.max(0,top))}px"><strong>${calendarEscape(event.subject)}</strong><span>${calendarEscape(event.time)}${event.end?' – '+calendarEscape(event.end):''}</span></button>`;
      }).join('')}</div>`).join('')}</div>`;
  grid.style.setProperty('--calendar-hour-height',`${hourHeight}px`);
  grid.style.setProperty('--calendar-hours',String(endHour-startHour));
  grid.style.setProperty('--calendar-days',String(count));
  grid.querySelectorAll('[data-calendar-day]').forEach(button=>button.addEventListener('click',()=>{selectedDate=new Date(`${button.dataset.calendarDay}T12:00:00`);miniMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);renderMiniCalendar();refresh();}));
  grid.querySelectorAll('.calendar-time-slot').forEach(slot=>slot.addEventListener('click',()=>{
    const date=slot.closest('.calendar-time-column').dataset.date;
    const hour=String(Number(slot.dataset.hour)).padStart(2,'0');
    openCalendarEvent(null,{date,start:`${hour}:00`,end:`${String(Number(hour)+1).padStart(2,'0')}:00`});
  }));
  grid.querySelectorAll('[data-calendar-event]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.calendarEvent;
    if(id){const record=DB.getAcademicEvents(currentUser.id).find(item=>item.id===id);if(record)openCalendarEvent(record);return;}
    selectedDate=new Date(`${button.dataset.date}T12:00:00`);refresh();
  }));
}

function renderMiniCalendar() {
  const title=document.getElementById('miniMonthTitle'),grid=document.getElementById('miniCalendarGrid');
  if(!title||!grid)return;
  title.textContent=fmtDate(miniMonth,'MMMM yyyy');
  const first=getStartOfWeek(new Date(miniMonth.getFullYear(),miniMonth.getMonth(),1));
  grid.innerHTML=Array.from({length:42},(_,index)=>{
    const date=addDays(first,index),key=calendarDateKey(date);
    const inMonth=date.getMonth()===miniMonth.getMonth();
    return `<button type="button" class="mini-calendar-day${inMonth?'':' is-outside'}${isSameDay(date,selectedDate)?' is-selected':''}${isSameDay(date,new Date())?' is-today':''}" data-mini-date="${key}">${date.getDate()}</button>`;
  }).join('');
  grid.querySelectorAll('[data-mini-date]').forEach(button=>button.addEventListener('click',()=>{
    selectedDate=new Date(`${button.dataset.miniDate}T12:00:00`);
    currentWeekStart=getStartOfWeek(selectedDate);
    miniMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
    currentMonth=new Date(miniMonth);
    refresh();
  }));
}

// ── Day details ────────────────────────────────────────────────
function renderDayDetails(items, sessions, scheduled) {
  document.getElementById('selectedDayName').textContent = fmtDate(selectedDate,'EEEE');
  document.getElementById('selectedDayDate').textContent = fmtDate(selectedDate,'MMM d, yyyy');

  const daySessions = sessions
    .filter(() => calendarFilters.study)
    .filter(s => isSameDay(new Date(s.completedAt), selectedDate))
    .map(s => ({
      subject: s.subject || 'General Study',
      topic: 'Timer study session',
      time: new Date(s.completedAt).toTimeString().slice(0,5),
      durationMinutes: s.duration,
      duration: `${s.duration} min`,
      completed: true, type: 'session', blockId: null, color: 'success'
    }));

  const dayScheduled = scheduled.filter(s => isSameDay(s.date, selectedDate));
  const enriched     = dayScheduled.map(b => ({
    ...b,
    completed: b.type === 'scheduled' ? DB.isCompleted(currentUser.id, b.blockId) : false
  }));

  const all = [...enriched, ...daySessions].sort((a,b) => {
    if (a.type === 'exam-day') return -1;
    if (b.type === 'exam-day') return  1;
    if (a.type === 'project')  return -1;
    if (b.type === 'project')  return  1;
    const ta = a.time === '—' ? '00:00' : a.time;
    const tb = b.time === '—' ? '00:00' : b.time;
    return ta.localeCompare(tb);
  });

  document.getElementById('sessionCount').textContent = all.length;
  document.getElementById('sessionLabel').textContent  = all.length === 1 ? 'item' : 'items';

  // Update completion ring — only count actual study blocks
  const studyAll = all.filter(s => s.type === 'scheduled' || s.type === 'session');
  const doneAll  = studyAll.filter(s => s.completed).length;
  const ringPct  = studyAll.length > 0 ? doneAll / studyAll.length : 0;
  const dcrFill  = document.getElementById('dcrFill');
  const dcrText  = document.getElementById('dcrText');
  const circ     = 2 * Math.PI * 22; // matches r=22 in the SVG
  dcrFill.setAttribute('stroke-dasharray',  circ.toFixed(1));
  dcrFill.setAttribute('stroke-dashoffset', (circ - ringPct * circ).toFixed(1));
  dcrFill.style.stroke = ringPct === 1 ? 'var(--success)' : 'var(--primary)';
  dcrText.textContent  = Math.round(ringPct * 100) + '%';

  const list = document.getElementById('sessionsList');
  if (all.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Nothing scheduled for this day</p>
      </div>`;
    document.getElementById('daySummary').style.display = 'none';
    return;
  }

  list.innerHTML = all.map((s, idx) => {
    const isStudy  = s.type === 'scheduled';
    const isDone   = s.completed;
    const scoreGain = isStudy ? Math.round((s.durationMinutes||0) * 1.5) : 0;

    // ── Exam day banner ─────────────────────────────────────
    if (s.type === 'exam-day') {
      return `
        <div class="exam-day-block" style="animation-delay:${idx*.05}s">
          <div class="exam-day-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              <polyline points="10 2 10 10 13 7 16 10 16 2"/>
            </svg>
          </div>
          <div>
            <div class="exam-day-label">Exam Today</div>
            <div>${calendarEscape(s.subject)}${s.topic ? ' — ' + calendarEscape(s.topic) : ''}${s.time&&s.time!=='—'?` · ${calendarEscape(s.time)}`:''}${s.location?` · ${calendarEscape(s.location)}`:''}</div>
          </div>
        </div>`;
    }

    if (s.type === 'academic') {
      return `<article class="calendar-academic-event" style="--event-color:${/^#[0-9a-f]{6}$/i.test(s.color||'')?s.color:'#3978c5'}"><div class="calendar-academic-time">${calendarEscape(s.time)}${s.end?`–${calendarEscape(s.end)}`:''}</div><div class="calendar-academic-copy"><strong>${calendarEscape(s.subject)}</strong><p>${calendarEscape(s.topic||'Academic activity')}</p></div>${calendarEventActions(s)}</article>`;
    }
    if (s.type === 'assignment') {
      return `<article class="calendar-assignment"><span>ASSIGNMENT DUE</span><strong>${calendarEscape(s.subject)}</strong><p>${calendarEscape(s.topic||'')}</p><a href="courses.html">Open coursework →</a></article>`;
    }

    // ── Project card ─────────────────────────────────────────
    if (s.type === 'project') {
      return `
        <div class="event-card event-card--project" style="animation-delay:${idx*.05}s">
          <div class="event-card__accent"></div>
          <div class="event-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <div class="event-card__body">
            <div class="event-card__label">Project Due</div>
            <div class="event-card__subject">${s.subject}</div>
            ${s.topic ? `<div class="event-card__topic">${s.topic}</div>` : ''}
            ${s.notes ? `<div class="event-card__notes">${s.notes}</div>` : ''}
          </div>
          <div class="event-card__badge">DUE</div>
        </div>`;
    }

    // ── Reminder card ────────────────────────────────────────
    if (s.type === 'reminder') {
      return `
        <div class="event-card event-card--reminder" style="animation-delay:${idx*.05}s">
          <div class="event-card__accent"></div>
          <div class="event-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="event-card__body">
            <div class="event-card__label">Reminder</div>
            <div class="event-card__subject">${s.subject}</div>
            ${s.topic ? `<div class="event-card__topic">${s.topic}</div>` : ''}
            ${s.notes ? `<div class="event-card__notes">${s.notes}</div>` : ''}
          </div>
          <div class="event-card__badge">TODAY</div>
        </div>`;
    }

    // ── Reminder notify card ─────────────────────────────────
    if (s.type === 'reminder-notify') {
      return `
        <div class="event-card event-card--notify" style="animation-delay:${idx*.05}s">
          <div class="event-card__accent"></div>
          <div class="event-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="event-card__body">
            <div class="event-card__label">Upcoming Reminder</div>
            <div class="event-card__subject">${s.subject.replace('Reminder: ','')}</div>
            ${s.topic ? `<div class="event-card__topic">${s.topic}</div>` : ''}
            ${s.notes ? `<div class="event-card__notes">${s.notes}</div>` : ''}
          </div>
          <div class="event-card__badge">SOON</div>
        </div>`;
    }

    // ── Study session / timer session ────────────────────────
    let typeIcon = '';
    if (s.type === 'session') {
      typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
    } else {
      typeIcon = isDone
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    }

    const diffDot = isStudy && s.color
      ? `<span class="diff-dot ${s.color}"></span>` : '';

    const typeBadge = s.type === 'scheduled'
      ? `<span class="session-badge scheduled">Study</span>` : '';

    const checkBtn = isStudy ? `
      <button class="cal-check-btn ${isDone?'done':''}"
        onclick="toggleComplete('${s.blockId}','${(s.subject||'').replace(/'/g,"\\'")}',${s.durationMinutes||0})"
        title="${isDone?'Mark incomplete':'Mark complete'}">
        ${isDone
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`}
        ${isDone ? 'Done' : 'Mark done'}
      </button>` : '';

    const scoreTag = isStudy && !isDone
      ? `<div class="cal-score-tag"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>+${scoreGain} pts on complete</div>`
      : isDone
        ? `<div class="cal-score-tag done"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>+${scoreGain} pts earned</div>`
        : '';

    const cardClass = isDone ? 'completed'
      : s.type === 'session' ? 'completed' : 'scheduled-item';

    return `
      <div class="session-item ${cardClass}" data-color="${s.color||''}" style="animation-delay:${idx*.05}s">
        <div class="session-content">
          <div class="session-left">
            <div class="session-icon ${isDone?'completed':s.type}">${typeIcon}</div>
            <div class="session-info">
              <div class="session-subject">${diffDot}${calendarEscape(s.subject)}${typeBadge}</div>
              <div class="session-topic">${calendarEscape(s.topic||'')}</div>
              ${scoreTag}
            </div>
          </div>
          <div class="session-right">
            <div class="session-time">${calendarEscape(s.time)}</div>
            ${s.duration!=='—' ? `<div class="session-duration"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${calendarEscape(s.duration)}</div>` : ''}
            ${checkBtn}
            ${calendarEventActions(s)}
          </div>
        </div>
      </div>`;
  }).join('');

  const studyItems = all.filter(s => s.type==='scheduled' || s.type==='session');
  const totalMins  = studyItems.reduce((sum,s) => sum + (s.durationMinutes || parseInt(s.duration)||0), 0);
  const h = Math.floor(totalMins/60), m = totalMins%60;
  document.getElementById('totalTime').textContent =
    h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('completedCount').textContent =
    `${all.filter(s => s.completed).length} / ${studyItems.length}`;
  document.getElementById('daySummary').style.display = 'block';
}

// ── Full refresh ───────────────────────────────────────────────
function refresh() {
  const items    = DB.getItems(currentUser.id);
  const exams    = DB.getExams(currentUser.id);
  const itemIds  = new Set(items.map(i => i.id));
  const allItems = [...items, ...exams.filter(e => !itemIds.has(e.id))
                                       .map(e => ({...e, type:'exam', dueDate: e.examDate}))];
  const sessions  = DB.getSessions(currentUser.id);
  let scheduled = generateSchedule(allItems, sessions);
  scheduled=scheduled.filter(item=>{
    if(item.type==='academic')return calendarFilters.timetable;
    if(item.type==='scheduled'||item.type==='session')return calendarFilters.study;
    if(item.type==='exam-day')return calendarFilters.exams;
    if(['project','reminder','reminder-notify','assignment'].includes(item.type))return calendarFilters.deadlines;
    return true;
  });

  renderWeekNav();
  renderMiniCalendar();
  renderWeekProgress(scheduled);
  renderWeekGrid(allItems, sessions, scheduled);
  renderDayDetails(allItems, sessions, scheduled);
}

function calendarEventActions(event) {
  if (!event.eventId) return '';
  return `<div class="calendar-event-actions"><button type="button" data-calendar-edit="${calendarEscape(event.eventId)}" aria-label="Edit event">Edit</button><button type="button" data-calendar-delete="${calendarEscape(event.eventId)}" aria-label="Delete event">Delete</button></div>`;
}

function openCalendarEvent(event, defaults = {}) {
  const form = document.getElementById('calendarEventForm');
  const title = document.getElementById('calendarEventTitle');
  const courseSelect = form.elements.courseId;
  const courses = DB.getCourses(currentUser.id);
  courseSelect.innerHTML = '<option value="">Personal / other</option>' +
    courses.map(course => `<option value="${calendarEscape(course.id)}">${calendarEscape(course.name)}</option>`).join('');
  form.reset();
  form.elements.id.value = event?.id || '';
  form.elements.title.value = event?.title || '';
  form.elements.courseId.value = event?.courseId || '';
  form.elements.type.value = event?.type || 'lecture';
  form.elements.repeat.value = event?.repeat || 'once';
  const eventDate = event?.date || defaults.date || calendarDateKey(selectedDate);
  form.elements.date.value = eventDate;
  form.elements.day.value = String(event?.day ?? new Date(`${eventDate}T12:00:00`).getDay());
  form.elements.start.value = event?.start || defaults.start || '09:00';
  form.elements.end.value = event?.end || defaults.end || '10:00';
  form.elements.location.value = event?.location || '';
  form.elements.color.value = /^#[0-9a-f]{6}$/i.test(event?.color || '') ? event.color : '#3978c5';
  form.elements.description.value = event?.description || '';
  title.textContent = event ? 'Edit event' : 'Add event';
  form.elements.repeat.dispatchEvent(new Event('change'));
  document.getElementById('calendarEventDialog').showModal();
}

function calendarDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function init() {
  document.getElementById('calendarView').value=calendarView;
  miniMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  const filterLabels={timetable:'Classes & labs',study:'Study sessions',exams:'Exams',deadlines:'Assignments & reminders'};
  document.getElementById('calendarFilters').innerHTML=Object.entries(filterLabels).map(([key,label])=>`<label><input type="checkbox" data-calendar-filter="${key}" ${calendarFilters[key]?'checked':''}> ${label}</label>`).join('');
  document.querySelectorAll('.calendar-sidebar-section [data-calendar-filter]').forEach(input=>{input.checked=calendarFilters[input.dataset.calendarFilter];});
  refresh();

  document.getElementById('calendarView').addEventListener('change',e=>{calendarView=e.target.value;localStorage.setItem('sf_calendar_view',calendarView);currentWeekStart=getStartOfWeek(selectedDate);currentMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);refresh();});
  const updateFilter=e=>{const key=e.target.dataset.calendarFilter;if(!key)return;calendarFilters[key]=e.target.checked;document.querySelectorAll(`[data-calendar-filter="${key}"]`).forEach(input=>input.checked=e.target.checked);localStorage.setItem('sf_calendar_filters',JSON.stringify(calendarFilters));refresh();};
  document.getElementById('calendarFilters').addEventListener('change',updateFilter);
  document.querySelector('.calendar-sidebar-section').addEventListener('change',updateFilter);
  document.getElementById('miniPrevMonth').addEventListener('click',()=>{miniMonth.setMonth(miniMonth.getMonth()-1);renderMiniCalendar();});
  document.getElementById('miniNextMonth').addEventListener('click',()=>{miniMonth.setMonth(miniMonth.getMonth()+1);renderMiniCalendar();});
  const movePeriod=amount=>{if(calendarView==='day'){selectedDate=addDays(selectedDate,amount);currentWeekStart=getStartOfWeek(selectedDate);}else if(calendarView==='month'){currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+amount,1);currentWeekStart=getStartOfWeek(currentMonth);selectedDate=new Date(currentMonth);}else{currentWeekStart=addDays(currentWeekStart,amount*7);selectedDate=addDays(selectedDate,amount*7);}miniMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);refresh();};

  document.getElementById('prevWeek').addEventListener('click', () => {
    movePeriod(-1);
  });
  document.getElementById('nextWeek').addEventListener('click', () => {
    movePeriod(1);
  });
  document.getElementById('jumpToday').addEventListener('click', () => {
    currentWeekStart = getStartOfWeek(new Date());
    selectedDate     = new Date();
    miniMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
    if(calendarView==='month'){currentMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);currentWeekStart=getStartOfWeek(currentMonth);}
    refresh();
  });

  const eventDialog = document.getElementById('calendarEventDialog');
  const eventForm = document.getElementById('calendarEventForm');
  document.getElementById('addCalendarEvent').addEventListener('click', () => openCalendarEvent());
  eventForm.elements.repeat.addEventListener('change', () => {
    const weekly = eventForm.elements.repeat.value === 'weekly';
    document.querySelector('.calendar-repeat-date').hidden = weekly;
    document.querySelector('.calendar-repeat-day').hidden = !weekly;
    eventForm.elements.date.required = !weekly;
  });
  eventForm.elements.date.addEventListener('change', () => {
    const value = eventForm.elements.date.value;
    if (value) eventForm.elements.day.value = String(new Date(`${value}T12:00:00`).getDay());
  });
  eventForm.elements.courseId.addEventListener('change', () => {
    const course = DB.getCourses(currentUser.id).find(item => item.id === eventForm.elements.courseId.value);
    if (course && !eventForm.elements.title.value) eventForm.elements.title.value = course.name;
  });
  eventForm.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.end <= values.start) {
      eventForm.elements.end.setCustomValidity('End time must be after start time.');
      eventForm.elements.end.reportValidity();
      eventForm.elements.end.setCustomValidity('');
      return;
    }
    const id = values.id;
    delete values.id;
    values.day = Number(values.day);
    values.weekKey = values.type === 'lab' && values.repeat === 'once'
      ? calendarDateKey(getStartOfWeek(new Date(`${values.date}T12:00:00`)))
      : '';
    const saved = id ? DB.updateAcademicEvent(id, values) : DB.addAcademicEvent(currentUser.id, values);
    if (!saved) {
      console.error(`Could not save calendar event${id ? ` ${id}` : ''}.`);
      alert('This calendar event could not be saved. Please try again.');
      return;
    }
    if (values.type === 'lab' && values.repeat === 'once') {
      const week = DB.getLabWeek(currentUser.id, values.weekKey);
      const events = (week?.events || []).filter(item => item.id !== id);
      DB.saveLabWeek(currentUser.id, values.weekKey, [...events, saved]);
    }
    eventDialog.close();
    refresh();
  });
  eventDialog.querySelectorAll('[data-calendar-close]').forEach(button => button.addEventListener('click', () => eventDialog.close()));
  eventDialog.addEventListener('click', event => {
    if (event.target === eventDialog) eventDialog.close();
  });
  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-calendar-edit]');
    if (edit) {
      const record = DB.getAcademicEvents(currentUser.id).find(item => item.id === edit.dataset.calendarEdit);
      if (record) openCalendarEvent(record);
      return;
    }
    const remove = event.target.closest('[data-calendar-delete]');
    if (remove) {
      DB.deleteAcademicEvent(remove.dataset.calendarDelete);
      refresh();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

} // end else
