// ─── Auth guard ──────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

// ─── Constants ───────────────────────────────────────────────
const RADIUS = 130;
const CIRC   = 2 * Math.PI * RADIUS; // ≈816.8

// ─── State ───────────────────────────────────────────────────
let totalSec   = 25 * 60;
let remaining  = totalSec;
let interval   = null;
let running    = false;
let currentMin = 25;

// ─── DOM refs ────────────────────────────────────────────────
const shell   = document.getElementById('shell');
const rFill   = document.getElementById('rFill');
const rDot    = document.getElementById('rDot');
const timeDis = document.getElementById('timeDis');
const phaseL  = document.getElementById('phaseL');
const segBars = document.getElementById('segBars');
const quoteEl = document.getElementById('quoteEl');

// ─── Ring init ───────────────────────────────────────────────
rFill.style.strokeDasharray  = CIRC;
rFill.style.strokeDashoffset = CIRC;

// ─── Decorative tick marks ───────────────────────────────────
(function buildTicks() {
  const g = document.getElementById('ticksG');
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const r1 = 152, r2 = r1 + (major ? 11 : 5);
    const rad = ((i / 60) * 360 - 90) * Math.PI / 180;
    const x1 = 164 + r1 * Math.cos(rad), y1 = 164 + r1 * Math.sin(rad);
    const x2 = 164 + r2 * Math.cos(rad), y2 = 164 + r2 * Math.sin(rad);
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1);
    l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    l.setAttribute('stroke', major ? 'hsl(270,35%,50%)' : 'hsl(40,12%,68%)');
    l.setAttribute('stroke-width', major ? '1.5' : '1');
    l.setAttribute('stroke-linecap', 'round');
    g.appendChild(l);
  }
})();

// ─── Segment bars ────────────────────────────────────────────
function buildBars() {
  segBars.innerHTML = '';
  const n = Math.min(currentMin, 12);
  for (let i = 0; i < n; i++) {
    segBars.innerHTML += `<div class="seg-bar"><div class="seg-fill" id="sf${i}"></div></div>`;
  }
}

// ─── Quotes ──────────────────────────────────────────────────
const QUOTES = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"Study hard what interests you in the most undisciplined, irreverent manner." — R. Feynman',
  '"It always seems impossible until it\'s done." — Nelson Mandela',
  '"The beautiful thing about learning is nobody can take it away from you." — B.B. King',
  '"Genius is ninety-nine percent perspiration." — Thomas Edison',
  '"Live as if you were to die tomorrow. Learn as if you were to live forever." — Gandhi',
  '"The mind is not a vessel to be filled, but a fire to be kindled." — Plutarch',
  '"Success is the sum of small efforts, repeated day in and day out." — Robert Collier',
  '"Talent is a flame. Genius is a fire." — Bernard Williams',
];

function rotateQuote() {
  quoteEl.classList.add('fade');
  setTimeout(() => {
    quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteEl.classList.remove('fade');
  }, 500);
}

// ─── Helpers ─────────────────────────────────────────────────
function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function updateRing() {
  const progress = (totalSec - remaining) / totalSec;
  rFill.style.strokeDashoffset = CIRC * (1 - progress);

  const rad = (progress * 360 - 90) * Math.PI / 180;
  rDot.setAttribute('cx', 144 + RADIUS * Math.cos(rad));
  rDot.setAttribute('cy', 144 + RADIUS * Math.sin(rad));

  const n = segBars.querySelectorAll('.seg-fill').length;
  const perSeg = totalSec / n;
  const elapsed = totalSec - remaining;
  for (let i = 0; i < n; i++) {
    const el = document.getElementById('sf' + i);
    if (!el) continue;
    const start = i * perSeg, end = (i + 1) * perSeg;
    el.style.width = elapsed >= end ? '100%'
      : elapsed > start ? ((elapsed - start) / perSeg * 100) + '%'
      : '0%';
  }

  document.title = `${fmt(remaining)} · StudyFlow`;
}

function updateDisplay() {
  const cur = fmt(remaining);
  if (timeDis.textContent !== cur) {
    timeDis.classList.add('tick');
    timeDis.textContent = cur;
    setTimeout(() => timeDis.classList.remove('tick'), 80);
  }
  updateRing();
}

// ─── Mode selection ──────────────────────────────────────────
function setMode(btn) {
  if (running) return;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentMin = parseInt(btn.dataset.min);
  totalSec   = currentMin * 60;
  remaining  = totalSec;
  phaseL.textContent = 'Ready to focus';
  rFill.style.strokeDashoffset = CIRC;
  rDot.setAttribute('cx', 144);
  rDot.setAttribute('cy', 14);
  rDot.style.opacity = '0';
  timeDis.textContent = fmt(remaining);
  document.title = 'StudyFlow — Focus Timer';
  buildBars();
}

// ─── Timer controls ──────────────────────────────────────────
function toggleTimer() {
  running ? pauseTimer() : startTimer();
}

function startTimer() {
  running = true;
  shell.classList.add('running');
  rDot.style.opacity = '1';
  phaseL.textContent = currentMin <= 15 ? 'Break time' : 'Deep focus';
  interval = setInterval(() => {
    remaining--;
    updateDisplay();
    if (remaining <= 0) {
      clearInterval(interval);
      running = false;
      shell.classList.remove('running');
      onComplete();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(interval);
  running = false;
  shell.classList.remove('running');
  phaseL.textContent = 'Paused';
}

function resetTimer() {
  clearInterval(interval);
  running   = false;
  remaining = totalSec;
  shell.classList.remove('running');
  phaseL.textContent = 'Ready to focus';
  rDot.style.opacity = '0';
  updateDisplay();
  document.title = 'StudyFlow — Focus Timer';
}

function skipSession() {
  if (!confirm('Skip this session? It will not be saved.')) return;
  resetTimer();
}

// ─── Session complete ────────────────────────────────────────
function onComplete() {
  document.title = 'Done · StudyFlow';
  rDot.style.opacity = '0';

  if (currentMin >= 10) {
    const subj = document.getElementById('subjectSel').value || 'General Study';
    DB.addSession(currentUser.id, { subject: subj, duration: currentMin, mode: currentMin });
    updateStats();
    renderRecent();
  }

  document.getElementById('cMins').textContent = currentMin;
  const sub = document.getElementById('subjectSel').value;
  document.getElementById('cSubj').textContent = sub ? `Studying ${sub}` : 'General Study session';
  document.getElementById('modal').classList.add('open');
  showToast('Session saved!', `${currentMin} minutes logged.`);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  resetTimer();
}

function closeModalStart() {
  document.getElementById('modal').classList.remove('open');
  remaining = totalSec;
  updateDisplay();
  startTimer();
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(title, msg) {
  const el = document.getElementById('toast');
  document.getElementById('toastT').textContent = title;
  document.getElementById('toastM').textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4500);
}

// ─── Today's stats (uses DB) ─────────────────────────────────
function updateStats() {
  const sessions = DB.getSessions(currentUser.id);
  const today    = new Date().toDateString();
  const ts       = sessions.filter(s => new Date(s.completedAt).toDateString() === today);
  const mins     = ts.reduce((a, s) => a + s.duration, 0);
  countTo('statSessions', ts.length);
  countTo('statMins', mins);
  const stats = DB.getStats(currentUser.id);
  document.getElementById('statStreak').textContent = stats.streak || 0;
}

function countTo(id, target) {
  const el    = document.getElementById(id);
  const start = parseInt(el.textContent) || 0;
  let step = 0;
  const t = setInterval(() => {
    step++;
    el.textContent = Math.round(start + (target - start) * (step / 18));
    if (step >= 18) { el.textContent = target; clearInterval(t); }
  }, 600 / 18);
}

// ─── Recent sessions (uses DB) ───────────────────────────────
function renderRecent() {
  const sessions = DB.getSessions(currentUser.id);
  const list     = document.getElementById('recentList');
  const recent   = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 8);

  if (!recent.length) {
    list.innerHTML = '<div style="text-align:center;padding:1.5rem 0;color:var(--fg3);font-size:.75rem;">No sessions yet — start the timer.</div>';
    return;
  }

  list.innerHTML = recent.map((s, i) => {
    const time  = new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date  = new Date(s.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const today = new Date(s.completedAt).toDateString() === new Date().toDateString();
    return `<div class="session-row" style="animation-delay:${i * .04}s">
      <div class="session-dot"></div>
      <div class="session-info">
        <div class="session-subj">${s.subject || 'General Study'}</div>
        <div class="session-meta">${today ? 'Today' : date} · ${time}</div>
      </div>
      <div class="session-dur">${s.duration}m</div>
    </div>`;
  }).join('');
}

// ─── Populate subject dropdown from exams (uses DB) ──────────
function populateSubjects() {
  const sel     = document.getElementById('subjectSel');
  const exams   = DB.getExams(currentUser.id);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = exams.filter(e => new Date(e.examDate + 'T12:00:00') >= today);

  sel.innerHTML = '<option value="">— General Study —</option>';
  upcoming.forEach(e => {
    const opt = document.createElement('option');
    opt.value       = e.subject;
    opt.textContent = `${e.subject} · ${e.topic}`;
    sel.appendChild(opt);
  });
}

// ─── Keyboard shortcuts ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); toggleTimer(); }
  if (e.key.toLowerCase() === 'r') resetTimer();
  if (e.key.toLowerCase() === 's') skipSession();
});

// ─── Init ────────────────────────────────────────────────────
quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
setInterval(rotateQuote, 22000);
buildBars();
updateDisplay();
updateStats();
renderRecent();
populateSubjects();

} // end else