(() => {
  const apply=()=>{
    document.documentElement.dataset.theme='light';
    document.body?.classList.remove('dark-mode');
    if(localStorage.getItem('sf_theme')!=='light')localStorage.setItem('sf_theme','light');
  };
  apply();
  window.addEventListener('storage',e=>{if(e.key==='sf_theme')apply();});
  document.addEventListener('DOMContentLoaded',apply);
})();
