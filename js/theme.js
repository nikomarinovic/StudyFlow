/* StudyFlow theme: light / dark / system. Loaded in <head> so the theme is applied before first paint. */
(() => {
  const KEY = 'sf_theme';
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const get = () => { try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'system' ? v : 'light'; } catch (e) { return 'light'; } };
  const resolve = pref => pref === 'system' ? (media && media.matches ? 'dark' : 'light') : pref;
  const apply = () => {
    const theme = resolve(get());
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.body?.classList.toggle('dark-mode', theme === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#101a1b' : '#ffffff');
  };
  const set = pref => { try { localStorage.setItem(KEY, pref); } catch (e) {} apply(); };
  window.SFTheme = { get, set, apply };
  apply();
  window.addEventListener('storage', e => { if (e.key === KEY) apply(); });
  if (media) (media.addEventListener ? media.addEventListener('change', apply) : media.addListener(apply));
  document.addEventListener('DOMContentLoaded', apply);
})();
