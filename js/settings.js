// ── Auth guard ─────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

// ── Pending confirm action ─────────────────────────────────────
let pendingAction = null;

// ── Safe DOM helper — never throws on missing elements ─────────
function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const wrap = document.getElementById('sToasts');
  if (!wrap) return;
  const icon = type === 'success'
    ? '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>';
  const t = document.createElement('div');
  t.className = `s-toast ${type}`;
  t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
    stroke-linejoin="round">${icon}</svg>${msg}`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 320);
  }, 3500);
}

// ── Confirm dialog ─────────────────────────────────────────────
function confirmClear() {
  set('dialogTitle', 'Clear all study sessions?');
  set('dialogSub', 'This will delete all session history and reset your streak and score. This cannot be undone.');
  set('dialogConfirmBtn', 'Clear Data');
  pendingAction = doClearSessions;
  document.getElementById('confirmDialog')?.classList.add('show');
}

function confirmDeleteAccount() {
  set('dialogTitle', 'Delete your account?');
  set('dialogSub', 'This will permanently delete your account, all sessions, exams, and stats. This cannot be undone.');
  set('dialogConfirmBtn', 'Delete Account');
  pendingAction = doDeleteAccount;
  document.getElementById('confirmDialog')?.classList.add('show');
}

function closeDialog() {
  document.getElementById('confirmDialog')?.classList.remove('show');
  pendingAction = null;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dialogConfirmBtn')?.addEventListener('click', () => {
    if (pendingAction) { pendingAction(); closeDialog(); }
  });
  document.getElementById('confirmDialog')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmDialog')) closeDialog();
  });
});

// ── Clear sessions ─────────────────────────────────────────────
function doClearSessions() {
  const allSessions = DB._get(DB.SESSIONS_KEY);
  DB._set(DB.SESSIONS_KEY, allSessions.filter(s => s.userId !== currentUser.id));
  DB.updateStats(currentUser.id, { totalStudyHours: 0, streak: 0, lastStudyDate: null });
  showToast('All sessions cleared', 'success');
  init();
}

// ── Delete account ─────────────────────────────────────────────
function doDeleteAccount() {
  const allSessions = DB._get(DB.SESSIONS_KEY);
  DB._set(DB.SESSIONS_KEY, allSessions.filter(s => s.userId !== currentUser.id));
  const allExams = DB._get(DB.EXAMS_KEY);
  DB._set(DB.EXAMS_KEY, allExams.filter(e => e.userId !== currentUser.id));
  const allStats = DB._get(DB.STATS_KEY);
  DB._set(DB.STATS_KEY, allStats.filter(s => s.userId !== currentUser.id));
  const allUsers = DB.getUsers();
  DB._set(DB.USERS_KEY, allUsers.filter(u => u.id !== currentUser.id));
  localStorage.removeItem('sf_current_user');
  window.location.href = 'index.html';
}

// ── Sign out ───────────────────────────────────────────────────
function signOut() {
  localStorage.removeItem('sf_current_user');
  window.location.href = 'index.html';
}

// ── Main init — populate all data ──────────────────────────────
function init() {
  const name = (currentUser.name || '').trim() || 'Student';

  const avatar = document.getElementById('sAvatar');
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
  set('sName',  name);
  set('sEmail', currentUser.email || '—');
  set('rowName',  name);
  set('rowEmail', currentUser.email || '—');

  const user = DB.getUserByEmail(currentUser.email);
  if (user?.createdAt) {
    set('rowMember', new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  } else {
    set('rowMember', 'Mar 2026');
  }

  const stats    = DB.getStats(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);
  const exams    = DB.getExams(currentUser.id);

  const totalHrs = parseFloat((stats.totalStudyHours || 0).toFixed(1));
  const streak   = stats.streak || 0;
  const score    = Math.floor(totalHrs * 100);

  set('sTotalHrs', totalHrs + 'h');
  set('sStreak',   streak);
  set('sScore',    score);
  set('sExams',    exams.length);
  set('rowSessions', sessions.length);
  set('rowHours',    totalHrs + ' hrs');
  set('rowStreak',   streak + ' days');
  set('rowExams',    exams.length);
}

// ── Boot ───────────────────────────────────────────────────────
init();

} // end else