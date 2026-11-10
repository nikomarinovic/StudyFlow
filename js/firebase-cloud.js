import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, updateProfile, onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, writeBatch, getDocs } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const COLLECTIONS = {
  sf_sessions:'sessions',sf_exams:'exams',sf_items:'items',sf_stats:'stats',sf_completions:'completions',
  sf_courses:'courses',sf_tasks:'tasks',sf_academic_events:'academicEvents',sf_availability:'availability',
  sf_lab_weeks:'labWeeks',sf_academic_periods:'academicPeriods',sf_resources:'resources',sf_profiles:'profiles'
};
const idOf = (store,row) => String(row.id || row.userId || row.blockId || `${store}_${Math.random().toString(36).slice(2)}`);
const event = (name,detail={}) => window.dispatchEvent(new CustomEvent(name,{detail}));
const current = () => { try{return JSON.parse(localStorage.getItem('sf_current_user')||'null')}catch{return null} };

export async function connect(config) {
  const app=initializeApp(config), auth=getAuth(app), firestore=getFirestore(app);
  const firstAuth=await new Promise(resolve=>{const unsub=onAuthStateChanged(auth,user=>{unsub();resolve(user)});});
  let activeUid=null, unsubscribe=null, initialSnapshot=false, pending=new Map(), flushTimer=null;
  const sendStatus=(message,state='syncing')=>event('sf:sync-status',{message,state});
  const localRows=store=>{try{return JSON.parse(localStorage.getItem(store)||'[]')}catch{return []}};
  const safeWriteCache=(store,rows)=>localStorage.setItem(store,JSON.stringify(rows));
  const docId=(store,row)=>`${COLLECTIONS[store]}__${idOf(store,row)}`;

  async function flushStore(store) {
    if(!activeUid||!initialSnapshot||!COLLECTIONS[store])return;
    const ref=collection(firestore,'users',activeUid,'records');
    const remote=await getDocs(ref), prefix=`${COLLECTIONS[store]}__`, existing=new Map();
    remote.forEach(s=>{if(s.id.startsWith(prefix))existing.set(s.id,s.ref)});
    const local=localRows(store).filter(row=>row.userId===activeUid), keep=new Set(local.map(row=>docId(store,row)));
    const ops=[];
    local.forEach(row=>ops.push({type:'set',ref:doc(firestore,'users',activeUid,'records',docId(store,row)),data:{userId:activeUid,store,value:row}}));
    existing.forEach((ref,id)=>{if(!keep.has(id))ops.push({type:'delete',ref});});
    for(let offset=0;offset<ops.length;offset+=450){const batch=writeBatch(firestore);ops.slice(offset,offset+450).forEach(op=>op.type==='set'?batch.set(op.ref,op.data):batch.delete(op.ref));await batch.commit();}
  }
  function queueStore(store) {
    if(!activeUid||!initialSnapshot||!COLLECTIONS[store])return;
    sendStatus('Saving changes to the cloud…','syncing');
    pending.set(store,true);clearTimeout(flushTimer);
    flushTimer=setTimeout(async()=>{const stores=[...pending.keys()];pending.clear();try{for(const key of stores)await flushStore(key);sendStatus('Synced across devices','synced')}catch(error){console.error('Firestore write failed:',error);sendStatus('Could not sync · changes remain on this device','error')}},250);
  }
  async function startSync(uid) {
    if(unsubscribe)unsubscribe(); activeUid=uid;initialSnapshot=false;pending.clear();
    sendStatus('Loading your cloud data…','syncing');
    return new Promise((resolve,reject)=>{
      unsubscribe=onSnapshot(collection(firestore,'users',uid,'records'),async snapshot=>{
        const cloud={};Object.keys(COLLECTIONS).forEach(k=>cloud[k]=[]);
        snapshot.forEach(s=>{const data=s.data();if(data.userId===uid&&cloud[data.store]&&data.value)cloud[data.store].push(data.value)});
        if(snapshot.empty){
          Object.keys(COLLECTIONS).forEach(store=>{if(localRows(store).some(row=>row.userId===uid))pending.set(store,true)});
          initialSnapshot=true;clearTimeout(flushTimer);flushTimer=setTimeout(async()=>{const stores=[...pending.keys()];pending.clear();try{for(const store of stores)await flushStore(store);sendStatus('Cloud backup ready','synced')}catch(error){console.error(error);sendStatus('Could not sync · changes remain on this device','error')}},0);
        } else {
          let changed=false;
          Object.keys(COLLECTIONS).forEach(store=>{
            const all=localRows(store),others=all.filter(row=>row.userId!==uid),local=all.filter(row=>row.userId===uid),next=cloud[store];
            const migrating=localStorage.getItem('sf_pending_migration_uid')===uid;
            const merged=migrating?[...new Map([...next,...local].map(row=>[idOf(store,row),row])).values()]:next;
            const stable=rows=>JSON.stringify([...rows].sort((a,b)=>idOf(store,a).localeCompare(idOf(store,b))));
            if(stable(local)!==stable(merged))changed=true;
            safeWriteCache(store,[...others,...merged]);
            if(migrating)pending.set(store,true);
          });
          const migrating=localStorage.getItem('sf_pending_migration_uid')===uid;
          if(migrating)localStorage.removeItem('sf_pending_migration_uid');
          initialSnapshot=true;
          if(migrating){const stores=[...pending.keys()];pending.clear();try{for(const store of stores)await flushStore(store);}catch(error){sendStatus('Could not sync migrated data · changes remain on this device','error');}}
          sendStatus('Synced across devices','synced');
          if(changed)event('sf:data-sync',{userId:uid});
        }
        resolve();
      },error=>{sendStatus('Could not load cloud data · check your connection','error');reject(error)});
    });
  }
  async function adoptLocalRecords(email,uid) {
    const users=localRows('sf_users'), old=users.find(u=>(u.email||'').toLowerCase()===String(email).toLowerCase());
    const previous=current();const oldId=old?.id||previous?.id;
    if(oldId&&oldId!==uid){let found=false;Object.keys(COLLECTIONS).forEach(store=>{const prior=localRows(store);if(prior.some(row=>row.userId===oldId))found=true;const rows=prior.map(row=>row.userId===oldId?{...row,userId:uid}:row);safeWriteCache(store,rows)});if(found)localStorage.setItem('sf_pending_migration_uid',uid);}
    if(old){safeWriteCache('sf_users',users.filter(u=>u.id!==old.id));const profile=localRows('sf_profiles').find(p=>p.userId===old.id);if(profile){const all=localRows('sf_profiles').filter(p=>p.userId!==old.id);all.push({...profile,userId:uid});safeWriteCache('sf_profiles',all);}}
  }
  if(firstAuth){const saved=current();await startSync(firstAuth.uid);const profile=window.DB?.getProfile(firstAuth.uid)||{},name=firstAuth.displayName||saved?.name||firstAuth.email?.split('@')[0]||'Student';localStorage.setItem('sf_current_user',JSON.stringify({id:firstAuth.uid,email:firstAuth.email,name,firebaseUser:true,...profile}));const users=window.DB?._get('sf_users')||[];if(!users.some(u=>u.id===firstAuth.uid)){users.push({id:firstAuth.uid,email:firstAuth.email,name,createdAt:Date.now()});window.DB?._set('sf_users',users);}}
  else {sendStatus('Sign in to sync your academic data','local');const saved=current();if(saved?.firebaseUser){localStorage.removeItem('sf_current_user');if(!location.pathname.endsWith('auth.html'))location.replace('auth.html?mode=signin');}}

  return {
    enabled:true, auth, firestore,
    signUp:async(email,password,name)=>{const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:name});return result.user},
    signIn:async(email,password)=>{const result=await signInWithEmailAndPassword(auth,email,password);return result.user},
    signOut:async()=>{if(unsubscribe)unsubscribe();activeUid=null;await firebaseSignOut(auth)},
    resetPassword:email=>sendPasswordResetEmail(auth,email),
    deleteAccount:async password=>{const user=auth.currentUser;if(!user)throw new Error('Sign in again before deleting this account.');await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,password));const snap=await getDocs(collection(firestore,'users',user.uid,'records'));const refs=[];snap.forEach(s=>refs.push(s.ref));for(let i=0;i<refs.length;i+=450){const batch=writeBatch(firestore);refs.slice(i,i+450).forEach(ref=>batch.delete(ref));await batch.commit();}if(unsubscribe)unsubscribe();await deleteUser(user);activeUid=null;},
    adoptLocalRecords,
    startSync,
    queue:queueStore
  };
}
