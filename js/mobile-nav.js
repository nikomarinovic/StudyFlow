/**
 * StudyFlow — Mobile Navigation v2
  * - Navigation across Home, Courses, Calendar, Planner, Exams, Awards, and Settings
 * - Always visible on <= 768px
 * - Auto-marks active page
 * Include: <script src="js/mobile-nav.js"></script> at bottom of <body>
 * on every app page (dashboard, calendar, exams, achievements, settings).
 */
(function () {
  'use strict';

  var path    = window.location.pathname.replace(/.*\//, '');
  var current = {
    'dashboard.html':    'dashboard',
    'courses.html':      'courses',
    'academic.html':     'academic',
    'calendar.html':     'calendar',
    'exams.html':        'exams',
    'achievements.html': 'achievements',
    'settings.html':     'settings',
  }[path] || '';

  // Primary destinations stay visible; secondary pages live in one compact menu.
  var navItems = [
    {id:'dashboard',href:'dashboard.html',label:'Home',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>'},
    {id:'courses',href:'courses.html',label:'Courses',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 0-2.5-2.5z"/><path d="M8 7h8M8 11h8"/></svg>'},
    {id:'calendar',href:'calendar.html',label:'Calendar',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'},
    {id:'academic',href:'academic.html',label:'Plan',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'}
  ];
  var moreItems = [
    {id:'exams',href:'exams.html',label:'Exams',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v17H4zM8 8h8M8 12h8M8 16h5"/></svg>'},
    {id:'achievements',href:'achievements.html',label:'Achievements',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8m-4-4v4M7 4h10v6a5 5 0 0 1-10 0zM7 7H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4"/></svg>'},
    {id:'settings',href:'settings.html',label:'Settings',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'}
  ];

  var logoIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';

  var appPages = ['dashboard','courses','academic','calendar','exams','achievements','settings'];
  var isApp    = appPages.indexOf(current) !== -1;

  // ── Build top header ────────────────────────────────────────
  function buildHeader() {
    var el = document.createElement('div');
    el.className = 'mob-header';
    el.innerHTML =
      '<a href="dashboard.html" class="mob-header-logo">' +
        '<div class="mob-header-logo-icon">' + logoIcon + '</div>' +
        '<span class="mob-header-logo-text">StudyFlow</span>' +
      '</a>' +
      '<div class="mob-header-action"></div>';
    return el;
  }

  // ── Build bottom nav ────────────────────────────────────────
  function buildNav() {
    var nav=document.createElement('nav');
    nav.className='mob-nav';
    nav.setAttribute('aria-label','Main navigation');
    var inner=document.createElement('div');
    inner.className='mob-nav-inner';
    navItems.forEach(function(item){
      var a=document.createElement('a');
      a.href=item.href;
      a.className='mob-nav-item'+(item.id===current?' active':'');
      if(item.id===current)a.setAttribute('aria-current','page');
      a.setAttribute('aria-label',item.label);
      a.innerHTML=item.icon+'<span>'+item.label+'</span><i class="mob-nav-pip" aria-hidden="true"></i>';
      inner.appendChild(a);
    });
    var moreActive=moreItems.some(function(item){return item.id===current;});
    var more=document.createElement('button');
    more.type='button';
    more.className='mob-nav-item mob-nav-more'+(moreActive?' active':'');
    more.setAttribute('aria-label','More pages');
    more.setAttribute('aria-haspopup','menu');
    more.setAttribute('aria-expanded','false');
    more.dataset.moreToggle='true';
    more.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg><span>More</span><i class="mob-nav-pip" aria-hidden="true"></i>';
    inner.appendChild(more);
    var menu=document.createElement('div');
    menu.className='mob-more-menu';
    menu.setAttribute('role','menu');
    menu.hidden=true;
    moreItems.forEach(function(item){
      var a=document.createElement('a');
      a.href=item.href;
      a.className='mob-more-link'+(item.id===current?' active':'');
      a.setAttribute('role','menuitem');
      a.innerHTML=item.icon+'<span>'+item.label+'</span>';
      menu.appendChild(a);
    });
    nav.appendChild(inner);
    nav.appendChild(menu);
    more.addEventListener('click',function(){
      menu.hidden=!menu.hidden;
      more.setAttribute('aria-expanded',String(!menu.hidden));
    });
    document.addEventListener('click',function(e){
      if(!nav.contains(e.target)){menu.hidden=true;more.setAttribute('aria-expanded','false');}
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){menu.hidden=true;more.setAttribute('aria-expanded','false');}
    });
    return nav;
  }

  // ── Inject ──────────────────────────────────────────────────
  function inject() {
    if (!isApp) return;

    // Calendar and timer have page-specific mobile headers.
    var skipHeader = ['calendar'];
    if (skipHeader.indexOf(current) === -1) {
      document.body.insertBefore(buildHeader(), document.body.firstChild);
    }

    if (skipHeader.indexOf(current) === -1) document.body.appendChild(buildNav());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // ── Calendar: just add bottom nav ─────────────────────────
  if (current === 'calendar') {
    function injectCalNav() {
      // cal-header already handles the top; just add the bottom tab bar
      document.body.appendChild(buildNav());
      // But we also need to shift cal-header below the sync-bar if on index
      // On calendar page there's no sync bar, so cal-header stays at top:0
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectCalNav);
    } else {
      injectCalNav();
    }
  }

})();
