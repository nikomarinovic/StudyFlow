/* ═══════════════════════════════════════════
   StudyFlow — js/config.js
   Site-wide feature flags & maintenance mode.
   ═══════════════════════════════════════════ */
const SITE_CONFIG = {
  // ── Set to true to lock the entire site to the maintenance page ──
  maintenance:       false,

  // ── Mobile redirect (redirects small screens to a mobile-not-ready page) ──
  mobileRedirect:    false,
  mobileBreakpoint:  768,

  // ── Disable right-click context menu ──
  disableRightClick: false,

  // ── Page paths ──
  pages: {
    maintenance: '/public/dev/maintenance.html',
    mobileWall:  '/public/dev/mobile-not-ready.html',
    home:        '/index.html',
    dashboard:   '/dashboard.html',
    auth:        '/auth.html',
  },

  // ── Pages that are exempt from maintenance redirect ──
  // (maintenance page itself must always be exempt)
  maintenanceExempt: [
    '/public/dev/maintenance.html',
    '/public/dev/mobile-not-ready.html',
  ],
};

/* ─────────────────────────────────────────
   DO NOT EDIT BELOW THIS LINE
───────────────────────────────────────── */
(function () {
  const cfg  = SITE_CONFIG;
  const path = window.location.pathname;

  function isExempt() {
    return cfg.maintenanceExempt.some(p => path.endsWith(p));
  }

  // ── Maintenance mode ──────────────────────────────────────────
  if (cfg.maintenance && !isExempt()) {
    window.location.replace(cfg.pages.maintenance);
    return;
  }

  // ── If maintenance is OFF but someone lands on the maintenance page, send home ──
  if (!cfg.maintenance && path.endsWith(cfg.pages.maintenance)) {
    window.location.replace(cfg.pages.home);
    return;
  }

  // ── Mobile redirect ───────────────────────────────────────────
  if (cfg.mobileRedirect && !isExempt()) {
    const bypassed = sessionStorage.getItem('mobileBypass') === 'true';
    if (!bypassed) {
      const isMobile =
        window.innerWidth < cfg.mobileBreakpoint ||
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.replace(cfg.pages.mobileWall);
        return;
      }
    }
  }

  // ── Disable right-click ───────────────────────────────────────
  if (cfg.disableRightClick) {
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }
})();