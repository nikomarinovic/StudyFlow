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
  disableRightClick: true,

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

window.SFLocale = (() => {
  const KEY = 'sf_locale_preferences';
  const defaults = { dateOrder: 'dmy', time24: true };
  function get() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...defaults }; }
  }
  function save(patch) { const next={...get(),...patch};localStorage.setItem(KEY,JSON.stringify(next));return next; }
  function pad(value) { return String(value).padStart(2,'0'); }
  function date(value) {
    const raw=String(value||'').slice(0,10), parts=raw.split('-');
    if(parts.length===3&&parts.every(Boolean)) {
      const [year,month,day]=parts;
      return get().dateOrder==='mdy'?`${month}/${day}/${year}`:`${day}/${month}/${year}`;
    }
    const d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime()))return '—';
    const day=pad(d.getDate()),month=pad(d.getMonth()+1),year=d.getFullYear();
    return get().dateOrder==='mdy'?`${month}/${day}/${year}`:`${day}/${month}/${year}`;
  }
  function time(value) {
    if(value instanceof Date)return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
    const match=String(value||'').match(/(\d{1,2}):(\d{2})/);
    if(!match)return '—';
    const hour=Number(match[1]),minute=match[2];
    if(get().time24)return `${pad(hour)}:${minute}`;
    const suffix=hour>=12?'PM':'AM',display=hour%12||12;
    return `${display}:${minute} ${suffix}`;
  }
  const preferences = get();
  document.documentElement.lang = preferences.dateOrder === 'mdy' ? 'en-US' : 'en-GB';
  return { defaults, get, save, date, time };
})();

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