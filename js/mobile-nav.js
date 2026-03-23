/**
 * StudyFlow — Mobile Navigation v2
 * - 6 tabs: Home, Calendar, Timer, Planner, Awards, Settings
 * - Always visible on <= 768px
 * - Auto-marks active page
 * Include: <script src="js/mobile-nav.js"></script> at bottom of <body>
 * on every app page (dashboard, calendar, timer, exams, achievements, settings).
 */
(function () {
  'use strict';

  var path    = window.location.pathname.replace(/.*\//, '');
  var current = {
    'dashboard.html':    'dashboard',
    'calendar.html':     'calendar',
    'timer.html':        'timer',
    'exams.html':        'exams',
    'achievements.html': 'achievements',
    'settings.html':     'settings',
  }[path] || '';

  // ── 6-tab config ────────────────────────────────────────────
  var navItems = [
    {
      id: 'dashboard',
      href: 'dashboard.html',
      label: 'Home',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>'
    },
    {
      id: 'calendar',
      href: 'calendar.html',
      label: 'Calendar',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>'
    },
    {
      id: 'timer',
      href: 'timer.html',
      label: 'Timer',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>'
    },
    {
      id: 'exams',
      href: 'exams.html',
      label: 'Planner',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>'
    },
    {
      id: 'achievements',
      href: 'achievements.html',
      label: 'Awards',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>'
    },
    {
      id: 'settings',
      href: 'settings.html',
      label: 'Settings',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'
    },
  ];

  var logoIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
  var timerIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>';

  var appPages = ['dashboard','calendar','timer','exams','achievements','settings'];
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
      '<div class="mob-header-action">' +
        '<a href="timer.html" class="mob-header-study-btn">' + timerIcon + ' Study</a>' +
      '</div>';
    return el;
  }

  // ── Build bottom nav ────────────────────────────────────────
  function buildNav() {
    var nav   = document.createElement('nav');
    nav.className = 'mob-nav';
    nav.setAttribute('aria-label', 'Main navigation');

    var inner = document.createElement('div');
    inner.className = 'mob-nav-inner';

    navItems.forEach(function (item) {
      var a = document.createElement('a');
      a.href      = item.href;
      a.className = 'mob-nav-item' + (item.id === current ? ' active' : '');
      a.setAttribute('aria-label', item.label);
      a.innerHTML =
        item.icon +
        '<span>' + item.label + '</span>' +
        '<div class="mob-nav-pip"></div>';
      inner.appendChild(a);
    });

    nav.appendChild(inner);
    return nav;
  }

  // ── Inject ──────────────────────────────────────────────────
  function inject() {
    if (!isApp) return;

    // Top header — skip on calendar (has its own) and timer (uses mode strip)
    var skipHeader = ['calendar', 'timer'];
    if (skipHeader.indexOf(current) === -1) {
      document.body.insertBefore(buildHeader(), document.body.firstChild);
    }

    document.body.appendChild(buildNav());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // ── Timer page: inject mode strip + bottom nav ─────────────
  if (current === 'timer') {
    function injectTimerStrip() {
      if (window.innerWidth > 1079) return;

      // Top header for timer
      document.body.insertBefore(buildHeader(), document.body.firstChild);

      // Mode strip
      var strip = document.createElement('div');
      strip.id = 'timerMobStrip';
      Object.assign(strip.style, {
        position: 'fixed',
        top: '3.25rem',
        left: '0',
        right: '0',
        zIndex: '188',
        background: 'rgba(255,253,250,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(228,221,211,0.5)',
        padding: '0.45rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      });

      var modes = [
        { min: 25, label: '🍅 25m' },
        { min: 50, label: '🧠 50m' },
        { min: 90, label: '⚡ 90m' },
        { min: 5,  label: '☕ 5m'  },
        { min: 15, label: '🌿 15m' },
      ];

      // Subject clone
      var origSel = document.getElementById('subjectSel');
      if (origSel) {
        var clone = origSel.cloneNode(true);
        clone.id = 'subjectSelMob';
        Object.assign(clone.style, {
          flexShrink: '0',
          maxWidth: '135px',
          padding: '.3rem .6rem',
          border: '1px solid hsl(40,20%,86%)',
          borderRadius: '.5rem',
          fontSize: '.72rem',
          background: 'white',
          fontFamily: 'inherit',
          color: 'hsl(20,20%,15%)',
        });
        clone.addEventListener('change', function () {
          origSel.value = clone.value;
          origSel.dispatchEvent(new Event('change'));
        });
        origSel.addEventListener('change', function () { clone.value = origSel.value; });
        strip.appendChild(clone);
      }

      modes.forEach(function (m, i) {
        var btn = document.createElement('button');
        btn.textContent = m.label;
        btn.setAttribute('data-min', m.min);
        Object.assign(btn.style, {
          flexShrink: '0',
          padding: '.28rem .65rem',
          borderRadius: '999px',
          border: '1px solid hsl(40,20%,86%)',
          background: i === 0 ? 'hsl(270,74%,32%)' : 'white',
          color: i === 0 ? '#fff' : 'hsl(20,10%,45%)',
          fontSize: '.72rem',
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all .18s',
        });

        btn.addEventListener('click', function () {
          document.querySelectorAll('.mode-btn').forEach(function (sb) {
            if (parseInt(sb.getAttribute('data-min')) === m.min) sb.click();
          });
          strip.querySelectorAll('button').forEach(function (b) {
            b.style.background = 'white';
            b.style.color = 'hsl(20,10%,45%)';
          });
          btn.style.background = 'hsl(270,74%,32%)';
          btn.style.color = '#fff';
        });

        strip.appendChild(btn);
      });

      document.body.insertBefore(strip, document.body.childNodes[1]);

      // Push main area below both bars (3.25 header + ~2.25 strip)
      var mainArea = document.getElementById('mainArea');
      if (mainArea) mainArea.style.paddingTop = '7.75rem';

      document.body.appendChild(buildNav());
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectTimerStrip);
    } else {
      injectTimerStrip();
    }
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