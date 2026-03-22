// ── Auth guard ─────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('sf_current_user') || 'null');
if (!currentUser) { window.location.replace('auth.html'); }

else {

let pendingAction = null;

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
  setTimeout(() => { t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(() => t.remove(), 320); }, 3500);
}

// ── Confirm dialog ─────────────────────────────────────────────
function openDialog(title, sub, confirmLabel, action) {
  set('dialogTitle', title);
  set('dialogSub', sub);
  set('dialogConfirmBtn', confirmLabel);
  pendingAction = action;
  document.getElementById('confirmDialog')?.classList.add('show');
}
function closeDialog() {
  document.getElementById('confirmDialog')?.classList.remove('show');
  pendingAction = null;
}
function confirmClear() {
  openDialog(
    'Clear all study sessions?',
    'This will delete all session history and reset your streak and score. This cannot be undone.',
    'Clear Data',
    doClearSessions
  );
}
function confirmDeleteAccount() {
  openDialog(
    'Delete your account?',
    'This will permanently delete your account, all sessions, exams, and stats. This cannot be undone.',
    'Delete Account',
    doDeleteAccount
  );
}

// ── Danger actions ─────────────────────────────────────────────
function doClearSessions() {
  DB._set(DB.SESSIONS_KEY, DB._get(DB.SESSIONS_KEY).filter(s => s.userId !== currentUser.id));
  DB._set(DB.COMPLETIONS_KEY, DB._get(DB.COMPLETIONS_KEY).filter(c => c.userId !== currentUser.id));
  DB.updateStats(currentUser.id, { totalStudyHours: 0, streak: 0, lastStudyDate: null, studyScore: 0 });
  showToast('All sessions cleared');
  init();
}
function doDeleteAccount() {
  [DB.SESSIONS_KEY, DB.EXAMS_KEY, DB.ITEMS_KEY, DB.STATS_KEY, DB.COMPLETIONS_KEY].forEach(key => {
    DB._set(key, DB._get(key).filter(r => r.userId !== currentUser.id));
  });
  DB._set(DB.USERS_KEY, DB.getUsers().filter(u => u.id !== currentUser.id));
  localStorage.removeItem('sf_current_user');
  window.location.href = 'index.html';
}
function signOut() {
  localStorage.removeItem('sf_current_user');
  window.location.href = 'index.html';
}

// ── EXPORT ─────────────────────────────────────────────────────
function exportData() {
  const payload = {
    exportedAt:  new Date().toISOString(),
    exportedBy:  currentUser.email,
    version:     2,
    items:       DB.getItems(currentUser.id),
    sessions:    DB.getSessions(currentUser.id),
    completions: DB.getCompletions(currentUser.id),
    stats:       DB.getStats(currentUser.id),
  };

  const json     = JSON.stringify(payload, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  const dateStr  = new Date().toISOString().split('T')[0];
  a.href         = url;
  a.download     = `studyflow-backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully');
}

// ── IMPORT ─────────────────────────────────────────────────────
function triggerImport(mode) {
  // mode: 'merge' | 'override'
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.version || !Array.isArray(data.items)) {
          showToast('Invalid backup file', 'error');
          return;
        }
        if (mode === 'override') {
          openDialog(
            'Override your data?',
            `This will replace all your current exams, projects, reminders, sessions and stats with the backup from ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : 'unknown date'}. This cannot be undone.`,
            'Yes, Override',
            () => doImport(data, 'override')
          );
        } else {
          openDialog(
            'Merge backup data?',
            `This will add items from the backup that don't already exist in your account. Your current data won't be deleted. Backup from ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : 'unknown date'}.`,
            'Yes, Merge',
            () => doImport(data, 'merge')
          );
        }
      } catch {
        showToast('Could not read file \u2014 make sure it is a valid StudyFlow backup', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function doImport(data, mode) {
  if (mode === 'override') {
    // Wipe current user's data
    DB._set(DB.ITEMS_KEY,       DB._get(DB.ITEMS_KEY).filter(i => i.userId !== currentUser.id));
    DB._set(DB.SESSIONS_KEY,    DB._get(DB.SESSIONS_KEY).filter(s => s.userId !== currentUser.id));
    DB._set(DB.COMPLETIONS_KEY, DB._get(DB.COMPLETIONS_KEY).filter(c => c.userId !== currentUser.id));

    // Write backup data re-stamped with current userId
    const items       = (data.items       || []).map(i => ({ ...i, userId: currentUser.id }));
    const sessions    = (data.sessions    || []).map(s => ({ ...s, userId: currentUser.id }));
    const completions = (data.completions || []).map(c => ({ ...c, userId: currentUser.id }));

    DB._set(DB.ITEMS_KEY,       [...DB._get(DB.ITEMS_KEY),       ...items]);
    DB._set(DB.SESSIONS_KEY,    [...DB._get(DB.SESSIONS_KEY),    ...sessions]);
    DB._set(DB.COMPLETIONS_KEY, [...DB._get(DB.COMPLETIONS_KEY), ...completions]);

    // Override stats (keep userId)
    if (data.stats) {
      DB.updateStats(currentUser.id, { ...data.stats, userId: currentUser.id });
    }

    const total = items.length + sessions.length;
    showToast(`Override complete — ${total} records imported`);

  } else {
    // Merge: only add items whose id doesn't already exist
    const existingItems    = new Set(DB.getItems(currentUser.id).map(i => i.id));
    const existingSessions = new Set(DB.getSessions(currentUser.id).map(s => s.id));
    const existingComps    = new Set(DB.getCompletions(currentUser.id).map(c => c.blockId));

    const newItems       = (data.items       || []).filter(i => !existingItems.has(i.id))
                            .map(i => ({ ...i, userId: currentUser.id }));
    const newSessions    = (data.sessions    || []).filter(s => !existingSessions.has(s.id))
                            .map(s => ({ ...s, userId: currentUser.id }));
    const newCompletions = (data.completions || []).filter(c => !existingComps.has(c.blockId))
                            .map(c => ({ ...c, userId: currentUser.id }));

    DB._set(DB.ITEMS_KEY,       [...DB._get(DB.ITEMS_KEY),       ...newItems]);
    DB._set(DB.SESSIONS_KEY,    [...DB._get(DB.SESSIONS_KEY),    ...newSessions]);
    DB._set(DB.COMPLETIONS_KEY, [...DB._get(DB.COMPLETIONS_KEY), ...newCompletions]);

    const added = newItems.length + newSessions.length;
    const skipped = (data.items?.length || 0) + (data.sessions?.length || 0) - added;
    showToast(`Merged — ${added} new records added${skipped > 0 ? `, ${skipped} duplicates skipped` : ''}`);
  }

  init();
  updateExportPreview();
}

// ── Export preview ─────────────────────────────────────────────
function updateExportPreview() {
  const items       = DB.getItems(currentUser.id);
  const sessions    = DB.getSessions(currentUser.id);
  const completions = DB.getCompletions(currentUser.id);

  set('previewExams',      items.filter(i => i.type === 'exam').length);
  set('previewProjects',   items.filter(i => i.type === 'project').length);
  set('previewReminders',  items.filter(i => i.type === 'reminder').length);
  set('previewSessions',   sessions.length);
  set('previewCompletions',completions.length);

  // Rough file size estimate
  const rough = JSON.stringify({ items, sessions, completions }).length;
  const kb    = (rough / 1024).toFixed(1);
  set('previewSize', kb + ' KB');
}

// ── Init ───────────────────────────────────────────────────────
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
    set('rowMember', '—');
  }

  const stats    = DB.getStats(currentUser.id);
  const sessions = DB.getSessions(currentUser.id);
  const exams    = DB.getExams(currentUser.id);

  const totalHrs = parseFloat((stats.totalStudyHours || 0).toFixed(1));
  const streak   = stats.streak || 0;
  const score    = stats.studyScore || 0;

  set('sTotalHrs', totalHrs + 'h');
  set('sStreak',   streak);
  set('sScore',    score);
  set('sExams',    exams.length);
  set('rowSessions', sessions.length);
  set('rowHours',    totalHrs + ' hrs');
  set('rowStreak',   streak + ' days');
  set('rowExams',    exams.length);

  updateExportPreview();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dialogConfirmBtn')?.addEventListener('click', () => {
    if (pendingAction) { pendingAction(); closeDialog(); }
  });
  document.getElementById('confirmDialog')?.addEventListener('click', e => {
    if (e.target === document.getElementById('confirmDialog')) closeDialog();
  });
  init();
});

} // end else