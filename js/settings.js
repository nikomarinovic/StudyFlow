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
    'This will permanently delete your account, courses, assignments, sessions, exams, and stats. This cannot be undone.',
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
async function doDeleteAccount() {
  if(currentUser.firebaseUser){
    const password=prompt('Confirm your Firebase password to permanently delete this account.');
    if(password===null)return false;
    const sync=await window.FirebaseSyncReady;
    if(!sync?.enabled)throw new Error('Firebase is not available. No account data was deleted.');
    await sync.deleteAccount(password);
  }
  [DB.SESSIONS_KEY, DB.EXAMS_KEY, DB.ITEMS_KEY, DB.STATS_KEY, DB.COMPLETIONS_KEY, DB.COURSES_KEY, DB.TASKS_KEY, DB.EVENTS_KEY, DB.AVAILABILITY_KEY, DB.LAB_WEEKS_KEY, DB.PERIODS_KEY, DB.RESOURCES_KEY, DB.SCHEDULES_KEY, 'sf_profiles'].forEach(key => {
    DB._set(key, DB._get(key).filter(r => r.userId !== currentUser.id));
  });
  DB._set(DB.USERS_KEY, DB.getUsers().filter(u => u.id !== currentUser.id));
  localStorage.removeItem('sf_current_user');
  window.location.href = 'index.html';
}
async function signOut() {
  const sync=await window.FirebaseSyncReady;if(sync?.enabled)await sync.signOut();
  localStorage.removeItem('sf_current_user');
  window.location.href = 'index.html';
}

// ── EXPORT ─────────────────────────────────────────────────────
function exportData() {
  const payload = {
    exportedAt:  new Date().toISOString(),
    exportedBy:  currentUser.email,
    version:     4,
    items:       DB.getItems(currentUser.id),
    sessions:    DB.getSessions(currentUser.id),
    completions: DB.getCompletions(currentUser.id),
    stats:       DB.getStats(currentUser.id),
    courses:     DB.getCourses(currentUser.id),
    tasks:       DB.getTasks(currentUser.id),
    academicEvents: DB.getAcademicEvents(currentUser.id),
    schedules: DB.getSchedules(currentUser.id),
    availability: DB._get(DB.AVAILABILITY_KEY).filter(x=>x.userId===currentUser.id),
    labWeeks: DB._get(DB.LAB_WEEKS_KEY).filter(x=>x.userId===currentUser.id),
    academicPeriods: DB.getPeriods(currentUser.id),
    resources: DB.getResources(currentUser.id),
    profile: DB.getProfile(currentUser.id),
    localePreferences: SFLocale.get(),
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
            `This will replace all your current exams, projects, reminders, sessions and stats with the backup from ${data.exportedAt ? SFLocale.date(data.exportedAt) : 'unknown date'}. This cannot be undone.`,
            'Yes, Override',
            () => doImport(data, 'override')
          );
        } else {
          openDialog(
            'Merge backup data?',
            `This will add items from the backup that don't already exist in your account. Your current data won't be deleted. Backup from ${data.exportedAt ? SFLocale.date(data.exportedAt) : 'unknown date'}.`,
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
  const specs=[
    [DB.ITEMS_KEY,'items'],[DB.SESSIONS_KEY,'sessions'],[DB.COMPLETIONS_KEY,'completions'],
    [DB.COURSES_KEY,'courses'],[DB.TASKS_KEY,'tasks'],[DB.EVENTS_KEY,'academicEvents'],
    [DB.AVAILABILITY_KEY,'availability'],[DB.LAB_WEEKS_KEY,'labWeeks'],[DB.PERIODS_KEY,'academicPeriods'],[DB.RESOURCES_KEY,'resources'],[DB.SCHEDULES_KEY,'schedules']
  ];
  let count=0, skipped=0;
  specs.forEach(([key,field])=>{
    const incoming=(data[field]||[]).map(row=>({...row,userId:currentUser.id}));
    const all=DB._get(key), others=all.filter(row=>row.userId!==currentUser.id), existing=all.filter(row=>row.userId===currentUser.id);
    if(mode==='override') { DB._set(key,[...others,...incoming]);count+=incoming.length;return; }
    const id=row=>row.id||row.blockId||row.userId;
    const ids=new Set(existing.map(id));const additions=incoming.filter(row=>!ids.has(id(row)));
    count+=additions.length;skipped+=incoming.length-additions.length;DB._set(key,[...all,...additions]);
  });
  if(data.stats&&mode==='override')DB.updateStats(currentUser.id,{...data.stats,userId:currentUser.id});
  if(data.profile){if(mode==='override'||!Object.keys(DB.getProfile(currentUser.id)).length)DB.saveProfile(currentUser.id,data.profile);}
  if(data.localePreferences && mode==='override') SFLocale.save(data.localePreferences);
  showToast(mode==='override'?`Override complete — ${count} records imported`:`Merged — ${count} new records added${skipped?`, ${skipped} duplicates skipped`:''}`);

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
  const profile = DB.getProfile(currentUser.id);
  if (profile.institution || profile.faculty) set('sEmail', [currentUser.email, profile.institution, profile.faculty].filter(Boolean).join(' · '));
  set('rowName',  name);
  set('rowEmail', currentUser.email || '—');

  const user = DB.getUserByEmail(currentUser.email);
  if (user?.createdAt) {
    set('rowMember', SFLocale.date(user.createdAt));
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

function initLocaleSettings() {
  const preferences = SFLocale.get();
  const dateOrder = document.getElementById('localeDateOrder');
  const timeFormat = document.getElementById('localeTimeFormat');
  if (!dateOrder || !timeFormat) return;
  dateOrder.value = preferences.dateOrder;
  timeFormat.value = preferences.time24 ? '24' : '12';
  const update = () => {
    const saved = SFLocale.save({ dateOrder: dateOrder.value, time24: timeFormat.value === '24' });
    document.documentElement.lang = saved.dateOrder === 'mdy' ? 'en-US' : 'en-GB';
    showToast('Regional format updated');
  };
  dateOrder.addEventListener('change', update);
  timeFormat.addEventListener('change', update);
}

document.addEventListener('DOMContentLoaded', () => {
  const profileDialog = document.getElementById('academicProfileDialog');
  document.getElementById('editAcademicProfile')?.addEventListener('click', () => {
    const profile = DB.getProfile(currentUser.id), form = document.getElementById('academicProfileForm');
    ['studentType','institution','faculty','studyProgram','academicYear','institutionEmail'].forEach(k => { if (form.elements[k]) form.elements[k].value = profile[k] || (k === 'studentType' ? 'university' : ''); });
    profileDialog.showModal();
  });
  document.getElementById('cancelAcademicProfile')?.addEventListener('click', () => profileDialog.close());
  document.getElementById('academicProfileForm')?.addEventListener('submit', e => {
    e.preventDefault(); const patch = Object.fromEntries(new FormData(e.currentTarget));
    const institution = patch.institution || '';
    patch.institutionBrand = /FER|Faculty of Electrical Engineering and Computing/i.test(institution) ? 'fer' : /Harvard/i.test(institution) ? 'harvard' : /MIT|Massachusetts Institute/i.test(institution) ? 'mit' : 'default';
    DB.saveProfile(currentUser.id, patch); Object.assign(currentUser, patch); localStorage.setItem('sf_current_user', JSON.stringify(currentUser)); profileDialog.close(); init(); showToast('Student profile updated');
  });
  document.getElementById('dialogConfirmBtn')?.addEventListener('click', () => {
    if (pendingAction) Promise.resolve(pendingAction()).then(result=>{if(result!==false)closeDialog();}).catch(error=>showToast(error.message||'The action could not be completed.','error'));
  });
  document.getElementById('confirmDialog')?.addEventListener('click', e => {
    if (e.target === document.getElementById('confirmDialog')) closeDialog();
  });
  initLocaleSettings();
  init();
});

} // end else
