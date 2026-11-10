/* Shared desktop sidebar used across StudyFlow pages. */
(function () {
  'use strict';
  var map = {
    'index.html': 'dashboard', 'dashboard.html': 'dashboard', 'calendar.html': 'calendar',
    'courses.html': 'courses', 'academic.html': 'academic', 'timer.html': 'timer',
    'exams.html': 'exams', 'achievements.html': 'achievements', 'settings.html': 'settings'
  };
  var current = map[location.pathname.split('/').pop()] || '';
  var icon = {
    logo: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 0-2.5-2.5z"/><path d="M8 7h8M8 11h8"/>',
    dashboard: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    courses: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 0-2.5-2.5z"/><path d="M8 7h8M8 11h8"/>',
    academic: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    timer: '<circle cx="12" cy="14" r="8"/><path d="M10 2h4M12 6v2m3 6-3 3"/>',
    exams: '<path d="M4 4h16v17H4zM8 8h8M8 12h8M8 16h5"/>',
    achievements: '<path d="M8 21h8m-4-4v4M7 4h10v6a5 5 0 0 1-10 0zM7 7H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4"/>',
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2z"/>',
    signout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>'
  };
  function svg(name) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icon[name] + '</svg>'; }
  var nav = [
    ['dashboard','dashboard.html','Dashboard'],['calendar','calendar.html','Calendar'],['courses','courses.html','Courses'],
    ['academic','academic.html','Academic Planner'],['timer','timer.html','Study Timer'],['exams','exams.html','Exams'],['achievements','achievements.html','Achievements']
  ];
  var aside = document.querySelector('.sidebar, #achSidenav, #exSidenav, #sSidebar');
  if (!aside) {
    aside = document.createElement('aside');
    aside.className = 'sidebar';
    document.body.insertBefore(aside, document.body.firstChild);
  }
  aside.className = 'sidebar';
  aside.setAttribute('aria-label','Main navigation');
  aside.innerHTML = '<a href="dashboard.html" class="sidebar-logo"><span class="sidebar-icon">' + svg('logo') + '</span><span class="sidebar-text">StudyFlow</span></a>' +
    '<nav class="sidebar-nav" aria-label="Main">' + nav.map(function (item) {
      return '<a href="' + item[1] + '" class="nav-item' + (current === item[0] ? ' active' : '') + '"' + (current === item[0] ? ' aria-current="page"' : '') + '>' + svg(item[0]) + '<span>' + item[2] + '</span></a>';
    }).join('') + '</nav>' +
    '<div class="sidebar-bottom"><a href="settings.html" class="nav-item' + (current === 'settings' ? ' active' : '') + '"' + (current === 'settings' ? ' aria-current="page"' : '') + '>' + svg('settings') + '<span>Settings</span></a><button id="signOutBtn" class="nav-item">' + svg('signout') + '<span>Sign Out</span></button></div>';
  if (['calendar','timer','exams','achievements','settings'].indexOf(current) !== -1) {
    document.getElementById('signOutBtn').addEventListener('click', async function () {
      var sync = await window.FirebaseSyncReady;
      if (sync && sync.enabled) await sync.signOut();
      localStorage.removeItem('sf_current_user');
      location.href = 'auth.html?mode=signin';
    });
  }
})();
