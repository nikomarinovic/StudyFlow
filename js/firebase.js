(() => {
  const config = window.STUDYFLOW_FIREBASE_CONFIG || {};
  const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  function showStatus(message, state='local') {
    const paint = () => {
      let el = document.getElementById('sfSyncStatus');
      if (!el) { el=document.createElement('div'); el.id='sfSyncStatus'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); document.body.appendChild(el); }
      el.dataset.state=state; el.textContent=message;
      if(configured){
        const title=document.getElementById('settingsSyncTitle'),description=document.getElementById('settingsSyncDescription'),badge=document.getElementById('settingsSyncBadge');
        if(title)title.textContent=state==='synced'?'Cross-device sync active':state==='error'?'Sync needs attention':'Connecting to cloud';
        if(description)description.textContent=message;
        if(badge)badge.textContent=state==='synced'?'Synced':state==='error'?'Needs attention':'Connecting';
        const dashboard=document.getElementById('dashboardSyncNotice');if(dashboard)dashboard.textContent=message;
        document.querySelectorAll('.sync-notice-text,.sync-bar-mobile span').forEach(node=>node.textContent=message);
      }
    };
    if (document.body) paint(); else document.addEventListener('DOMContentLoaded',paint,{once:true});
  }
  window.addEventListener('online',()=>window.FirebaseSync?.enabled&&showStatus('Online · syncing changes','syncing'));
  window.addEventListener('offline',()=>showStatus('Offline · changes stay on this device until you reconnect','offline'));
  if (!configured) {
    window.FirebaseSyncReady=Promise.resolve(null);
    showStatus('Device only · Firebase setup needed');
    return;
  }
  showStatus('Connecting to Firebase…','syncing');
  window.FirebaseSyncReady=import('./firebase-cloud.js').then(module=>module.connect(config)).then(sync=>{
    window.FirebaseSync=sync;
    return sync;
  }).catch(error=>{
    console.error('StudyFlow Firebase initialization failed:',error);
    showStatus('Sync unavailable · check Firebase setup','error');
    window.dispatchEvent(new CustomEvent('sf:sync-error',{detail:error}));
    return null;
  });
  window.addEventListener('sf:sync-status',event=>showStatus(event.detail.message,event.detail.state));
  window.addEventListener('sf:data-sync',()=>{if(document.visibilityState==='visible'&&!location.pathname.endsWith('auth.html'))setTimeout(()=>location.reload(),80);});
})();
