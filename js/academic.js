const user=JSON.parse(localStorage.getItem('sf_current_user')||'null');if(!user)location.replace('auth.html');else{
const $=s=>document.querySelector(s), days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), color=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#3978c5', courses=()=>DB.getCourses(user.id), schedules=()=>DB.getSchedules(user.id), activeSchedule=()=>DB.getActiveSchedule(user.id), events=()=>{const active=activeSchedule()?.id;return DB.getAcademicEvents(user.id).filter(e=>!e.scheduleId||e.scheduleId===active);}, now=new Date();
function weekStart(d=new Date()){const x=new Date(d),day=x.getDay();x.setDate(x.getDate()-(day===0?6:day-1));x.setHours(0,0,0,0);return x;}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function currentWeekKey(){return dateKey(weekStart());}
function courseName(id){return courses().find(c=>c.id===id)?.name||'Personal';}
function normalizeName(value){return String(value||'').toLocaleLowerCase('hr-HR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function findCourse(name){const wanted=normalizeName(name);return courses().find(c=>normalizeName(c.name)===wanted);}
const timetableColors=['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899'];
function ensureSchedule(){
  let schedule=activeSchedule();
  if(!schedule&&DB.getAcademicEvents(user.id).some(e=>e.repeat==='weekly'&&!e.scheduleId))schedule=DB.addSchedule(user.id,{name:'Schedule 1',active:true});
  if(!schedule)return null;
  const legacy=DB.getAcademicEvents(user.id).filter(e=>e.repeat==='weekly'&&!e.scheduleId);
  legacy.forEach(e=>DB.updateAcademicEvent(e.id,{scheduleId:schedule.id}));
  return schedule;
}
function renderScheduleControls(){
  const select=$('#scheduleSelect');if(!select)return;
  const list=schedules();select.innerHTML=list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.active?' · Active':''}</option>`).join('');
  const current=activeSchedule();if(current)select.value=current.id;
}
function importTimetable(){
  const source='studyflow-default-timetable-v1';
  if(events().some(e=>e.source===source)){
    const importedIds=[...new Set(events().filter(e=>e.source===source).map(e=>e.courseId).filter(Boolean))];
    importedIds.forEach((id,index)=>{const course=courses().find(c=>c.id===id);if(!course)return;const nextColor=timetableColors[index%timetableColors.length];if(course.color==='#3978c5'){DB.updateCourse(id,{color:nextColor});}events().filter(e=>e.source===source&&e.courseId===id).forEach(e=>{if(e.color==='#3978c5')DB.updateAcademicEvent(e.id,{color:nextColor});});});
    render();alert('Raspored je već unesen; boje kolegija su osvježene.');return;
  }
  const courseDefinitions=[
    {name:'Digitalna logika',lecturer:'Marko Čupić',ects:6,passPercent:50,semester:'Zimski semestar',assessments:[
      {name:'Laboratorijske vježbe',weight:15,minimumPercent:50,maxPoints:100,mandatory:true},
      {name:'Domaće zadaće',weight:10,minimumPercent:0,maxPoints:100},
      {name:'Kratke provjere znanja',weight:5,minimumPercent:0,maxPoints:100},
      {name:'Međuispit: Pismeni',weight:30,minimumPercent:0,maxPoints:100},
      {name:'Završni ispit: Pismeni',weight:40,minimumPercent:40,maxPoints:100,mandatory:true}
    ]},
    {name:'Linearna algebra',lecturer:'Domagoj Vlah',ects:5,passPercent:45,semester:'Zimski semestar',assessments:[
      {name:'Domaće zadaće',weight:0,minimumPercent:0,maxPoints:100},
      {name:'Prisutnost',weight:0,minimumPercent:0,maxPoints:100},
      {name:'Međuispit: Pismeni',weight:50,minimumPercent:0,maxPoints:100},
      {name:'Završni ispit: Pismeni',weight:50,minimumPercent:0,maxPoints:100}
    ]},
    {name:'Uvod u programiranje',lecturer:'Igor Mekterović',ects:7,passPercent:50,semester:'Zimski semestar',assessments:[
      {name:'Laboratorijske vježbe',weight:30,minimumPercent:0,maxPoints:100},
      {name:'Međuispit: Pismeni',weight:30,minimumPercent:0,maxPoints:100},
      {name:'Završni ispit: Pismeni',weight:40,minimumPercent:40,maxPoints:100,mandatory:true}
    ]},
    {name:'Vještine komuniciranja',lecturer:'Juraj Petrović',ects:4,passPercent:60,semester:'Zimski semestar',assessments:[
      {name:'Domaće zadaće',weight:35,minimumPercent:50,maxPoints:100,mandatory:true},
      {name:'Kratke provjere znanja',weight:10,minimumPercent:50,maxPoints:100,mandatory:true},
      {name:'Sudjelovanje u nastavi',weight:10,minimumPercent:50,maxPoints:100,mandatory:true},
      {name:'Seminar/Projekt',weight:25,minimumPercent:50,maxPoints:100,mandatory:true},
      {name:'Međuispit: Pismeni',weight:1,minimumPercent:0,maxPoints:100},
      {name:'Završni ispit: Pismeni',weight:19,minimumPercent:0,maxPoints:100}
    ]},
    {name:'Tjelesna i znanstvena kultura',ects:0,passPercent:12,description:'Za prolaz je potrebno ostvariti 12 dolazaka.'}
  ];
  const imported={};
  courseDefinitions.forEach((def,index)=>{
    const existing=findCourse(def.name);
    const course=existing||DB.addCourse(user.id,{...def,color:timetableColors[index]});
    if(course.color==='#3978c5'){DB.updateCourse(course.id,{color:timetableColors[index]});course.color=timetableColors[index];}
    imported[normalizeName(def.name)]=course;
  });
  const analysis=findCourse('Matematička analiza 1');
  if(!analysis){alert('Raspored nije unesen jer kolegij Matematička analiza 1 nije pronađen.');return;}
  imported[normalizeName(analysis.name)]=analysis;
  if(analysis.color==='#3978c5'){DB.updateCourse(analysis.id,{color:timetableColors[5]});analysis.color=timetableColors[5];}
  const eventDefinitions=[
    ['Matematička analiza 1',1,'08:00','10:00','D1','lecture'],
    ['Matematička analiza 1',1,'10:00','11:00','D1','seminar'],
    ['Uvod u programiranje',1,'11:00','13:00','D1','lecture'],
    ['Linearna algebra',2,'08:00','10:00','D1','lecture'],
    ['Digitalna logika',2,'10:00','12:00','D2','lecture'],
    ['Digitalna logika',2,'12:00','13:00','D2','seminar'],
    ['Matematička analiza 1',3,'08:00','10:00','D1','lecture'],
    ['Uvod u programiranje',3,'10:00','12:00','D1','lecture'],
    ['Tjelesna i znanstvena kultura',3,'13:00','14:00','Cedevita Velesajam','other'],
    ['Vještine komuniciranja',4,'08:00','10:00','D1','lecture'],
    ['Linearna algebra',4,'10:00','12:00','D1','lecture'],
    ['Linearna algebra',4,'12:00','13:00','D1','seminar'],
    ['Matematička analiza 1',5,'08:00','10:00','D1','lecture'],
    ['Matematička analiza 1',5,'10:00','11:00','D1','seminar'],
    ['Digitalna logika',5,'11:00','13:00','D2','lecture']
  ];
  eventDefinitions.forEach(([title,day,start,end,location,type])=>{
    const course=imported[normalizeName(title)];
    DB.addAcademicEvent(user.id,{source,title,courseId:course.id,type,repeat:'weekly',day,start,end,location,color:course.color,scheduleId:ensureSchedule().id,description:type==='lecture'?'Predavanje':type==='seminar'?'Auditorne vježbe':type==='lab'?'Laboratorijske vježbe':'',activeFrom:'2026-11-07',activeUntil:'2027-01-29'});
  });
  [
    {title:'Nema nastave — 18.11.',startDate:'2026-11-18',endDate:'2026-11-18'},
    {title:'Ispitni period',startDate:'2026-11-23',endDate:'2026-12-06'},
    {title:'Božićni praznici',startDate:'2026-12-24',endDate:'2027-01-06'}
  ].forEach(period=>DB.addPeriod(user.id,{...period,suspendClasses:true,studyStart:'09:00',studyEnd:'18:00',source}));
  render();
  alert('Raspored, kolegiji i periodi su uspješno uneseni.');
}
function render(){ensureSchedule();renderScheduleControls();const wk=currentWeekKey(),answer=DB.getLabWeek(user.id,wk);const prompt=$('#labPrompt');prompt.hidden=false;prompt.innerHTML=answer?`<div><strong>Laboratory schedule confirmed for this week.</strong><p>${answer.events.length?`${answer.events.length} lab session${answer.events.length===1?'':'s'} saved.`:'You marked that there are no labs this week.'} Your regular timetable stays saved; this request stays here until next week.</p></div><button class="btn-outline" id="answerLabs">Edit this week’s labs</button>`:`<div><strong>What do your lab sessions look like this week?</strong><p>Confirm this week’s lab times so the planner blocks the correct hours. Your regular timetable stays saved; this request stays pending until you answer.</p></div><button class="btn-primary" id="answerLabs">Set this week’s labs</button><button class="btn-outline" id="noLabs">No labs this week</button>`;
const list=events().filter(e=>e.type!=='study'&&!e.temporary), groups=[], grouped=new Map();
list.forEach(event=>{const key=event.scheduleGroupId||`${event.courseId}|${event.title}|${event.start}|${event.end}|${event.location}|${event.repeat}`;if(!grouped.has(key)){const group={...event,ids:[],days:[]};grouped.set(key,group);groups.push(group);}const group=grouped.get(key);group.ids.push(event.id);if(event.repeat==='weekly'&&!group.days.includes(Number(event.day)))group.days.push(Number(event.day));});
const dayLabel=day=>days[((Number(day)+6)%7)].slice(0,3);
$('#eventList').innerHTML=groups.length?groups.map(e=>`<div class="task-row timetable-row" style="--course-color:${color(e.color)}"><div><span class="task-title">${esc(e.title)}</span><span class="task-meta">${esc(courseName(e.courseId))} · ${e.repeat==='weekly'?(e.days.length?e.days.sort((a,b)=>a-b).map(dayLabel).join(', '):'Every week'):SFLocale.date(e.date)} ${e.weekKey?' · this week':''} · ${esc(e.location||e.type)}${e.description?` · ${esc(e.description)}`:''}</span></div><span class="task-due">${esc(SFLocale.time(e.start))}–${esc(SFLocale.time(e.end))}</span><button class="tiny-btn" data-edit-group="${esc(e.ids[0])}">Edit</button><button class="tiny-btn" data-delete-group="${esc(e.ids.join(','))}">×</button></div>`).join(''):'<p class="empty">Add lectures and labs to make them unavailable to the study planner.</p>';
const avail=DB.getAvailability(user.id);$('#availabilityForm').innerHTML=days.map((d,i)=>{const x=avail[i]||{};return `<label class="availability-day"><span class="availability-name">${d}</span><input aria-label="${d} available from" class="military-time" type="text" inputmode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" placeholder="16:00" data-day="${i}" data-part="start" value="${esc(x.start||'16:00')}"><span class="availability-to">to</span><input aria-label="${d} available until" class="military-time" type="text" inputmode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" placeholder="20:00" data-day="${i}" data-part="end" value="${esc(x.end||'20:00')}"><input aria-label="${d} study day enabled" type="checkbox" data-day="${i}" data-part="enabled" ${x.enabled===false?'':'checked'}></label>`}).join('');
const periods=DB.getPeriods(user.id);$('#periodList').innerHTML=periods.length?periods.map(p=>`<div class="task-row"><div><span class="task-title">${esc(p.title)}</span><span class="task-meta">${esc(p.startDate)} to ${esc(p.endDate)} · ${p.suspendClasses?'Classes suspended':'Regular timetable active'}</span></div><span class="task-due">${esc(p.studyStart)}–${esc(p.studyEnd)}</span><button class="tiny-btn" data-delete-period="${esc(p.id)}">×</button></div>`).join(''):'<p class="empty">If lectures pause during exams, add the dates here to free the timetable for study.</p>';
const plans=events().filter(e=>e.type==='study'&&e.date>=dateKey(new Date())).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,60);$('#planList').innerHTML=plans.length?plans.map(e=>`<div class="task-row"><div><span class="task-title">${esc(e.title)}</span><span class="task-meta">${SFLocale.date(e.date)} · ${esc(courseName(e.courseId))}</span></div><span class="task-due">${esc(SFLocale.time(e.start))}–${esc(SFLocale.time(e.end))}</span><button type="button" class="tiny-btn" data-edit-event="${esc(e.id)}">Edit</button><button type="button" class="tiny-btn" data-delete-event="${esc(e.id)}">Remove</button></div>`).join(''):'<p class="empty">Nothing planned yet. Save your availability and add exams or assignments; the plan builds itself.</p>';renderPlannerPanels();}
function openEvent(arg=false){const f=$('#eventForm'),editing=typeof arg==='object';f.reset();f.elements.courseId.innerHTML='<option value="">Personal / other</option>'+courses().map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('#eventDialogTitle').textContent=editing?'Edit academic activity':'Add academic activity';if(editing){Object.keys(arg).forEach(k=>{if(f.elements[k])f.elements[k].value=arg[k]??'';});}else if(arg){f.elements.type.value='lab';f.elements.repeat.value='once';f.elements.date.value=currentWeekKey();}f.elements.repeat.dispatchEvent(new Event('change'));$('#eventDialog').showModal();}
function fillCourseOptions(form){form.elements.courseId.innerHTML=courses().map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');}
function groupForEvent(id){const all=events(),target=all.find(e=>e.id===id);if(!target)return[];const key=target.scheduleGroupId||`${target.courseId}|${target.title}|${target.start}|${target.end}|${target.location}|${target.repeat}`;return all.filter(e=>(target.scheduleGroupId?e.scheduleGroupId===target.scheduleGroupId:`${e.courseId}|${e.title}|${e.start}|${e.end}|${e.location}|${e.repeat}`===key));}
function scheduleDate(value){if(!value)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!match)return '';const [first,second,year]=match.slice(1);return SFLocale.get().dateOrder==='mdy'?`${year}-${first}-${second}`:`${year}-${second}-${first}`;}
function renderDayTimes(){const form=$('#timetableBlockForm'),rows=$('#timetableDayTimes'),selected=[...form.querySelectorAll('[name="day"]:checked')];rows.hidden=form.elements.sameTime.checked||!selected.length;rows.innerHTML=selected.map(input=>`<label class="day-time-row"><span>${days[(Number(input.value)+6)%7]}</span><input data-day-start="${input.value}" class="military-time" inputmode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" value="${esc(input.dataset.start||form.elements.start.value)}"><input data-day-end="${input.value}" class="military-time" inputmode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" value="${esc(input.dataset.end||form.elements.end.value)}"></label>`).join('');renderSchedulePreview();}
function renderSchedulePreview(){const form=$('#timetableBlockForm'),preview=$('#schedulePreview');if(!form||!preview)return;const selected=[...form.querySelectorAll('[name="day"]:checked')];const same=form.elements.sameTime.checked;preview.innerHTML=selected.map(input=>{const start=same?form.elements.start.value:form.querySelector(`[data-day-start="${input.value}"]`)?.value||form.elements.start.value;const end=same?form.elements.end.value:form.querySelector(`[data-day-end="${input.value}"]`)?.value||form.elements.end.value;return `<div class="schedule-preview-row"><strong>${days[(Number(input.value)+6)%7].slice(0,3)}</strong><span>${esc(start)}–${esc(end)}</span></div>`}).join('')||'<span class="hint">Select days to preview the schedule.</span>';}
function openTimetableBlock(existing=null){const form=$('#timetableBlockForm');if(!activeSchedule()){const schedule=DB.addSchedule(user.id,{name:'Schedule 1',active:true});DB.setActiveSchedule(user.id,schedule.id);renderScheduleControls();}form.reset();form.dataset.ids=existing?groupForEvent(existing.id).map(e=>e.id).join(','):'';form.querySelectorAll('[name="day"]').forEach(input=>{delete input.dataset.start;delete input.dataset.end;});fillCourseOptions(form);$('#timetableBlockTitle').textContent=existing?'Edit schedule block':'Add schedule block';const group=existing?groupForEvent(existing.id):[];const first=group[0];if(first){form.elements.courseId.value=first.courseId;form.elements.type.value=first.type;form.elements.start.value=first.start;form.elements.end.value=first.end;form.elements.location.value=first.location||'';form.elements.color.value=color(first.color);form.elements.activeFrom.value=first.activeFrom||'';form.elements.activeUntil.value=first.activeUntil||'';const same=group.every(e=>e.start===first.start&&e.end===first.end);form.elements.sameTime.checked=same;form.querySelectorAll('[name="day"]').forEach(input=>{const day=group.find(e=>Number(e.day)===Number(input.value));input.checked=Boolean(day);if(day){input.dataset.start=day.start;input.dataset.end=day.end;}});}else{const course=courses()[0];if(course){form.elements.color.value=color(course.color);}}renderDayTimes();form.querySelectorAll('[name="day"],[name="sameTime"],[name="start"],[name="end"]').forEach(input=>input.onchange=renderDayTimes);form.querySelectorAll('input,select').forEach(input=>input.oninput=renderSchedulePreview);$('#timetableBlockDialog').showModal();}
$('#addEvent').onclick=()=>openEvent();$('#eventForm').elements.repeat.onchange=e=>{$('.repeat-day').hidden=e.target.value!=='weekly';$('.once-date').hidden=e.target.value!=='once';$('#eventForm').elements.date.required=e.target.value==='once';};$('#eventForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.end)){alert('Use 24-hour time in HH:MM format, for example 08:00.');return;}if(d.end<=d.start){alert('End time must be after start time.');return;}const id=d.id;delete d.id;const targetDate=new Date((d.date||currentWeekKey())+'T12:00:00'),record={...d,day:Number(d.day),weekKey:d.repeat==='once'&&d.type==='lab'?dateKey(weekStart(targetDate)):''};const savedRecord=id?DB.updateAcademicEvent(id,record):DB.addAcademicEvent(user.id,record);if(d.type==='lab'&&d.repeat==='once'){const targetWeek=record.weekKey,saved=DB.getLabWeek(user.id,targetWeek);const entries=(saved?.events||[]).filter(x=>x.id!==id);DB.saveLabWeek(user.id,targetWeek,[...entries,savedRecord]);}$('#eventDialog').close();render();});
$('#addTimetableBlock').onclick=()=>openTimetableBlock();$('#timetableBlockForm').elements.courseId.onchange=e=>{const course=courses().find(c=>c.id===e.target.value);if(course)$('#timetableBlockForm').elements.color.value=color(course.color);renderSchedulePreview();};
$('#timetableBlockForm').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget,d=Object.fromEntries(new FormData(form)),selected=[...form.querySelectorAll('[name="day"]:checked')],same=form.elements.sameTime.checked;d.activeFrom=scheduleDate(d.activeFrom);d.activeUntil=scheduleDate(d.activeUntil);if(!selected.length){alert('Choose at least one day.');return;}if((form.elements.activeFrom.value&&!d.activeFrom)||(form.elements.activeUntil.value&&!d.activeUntil)){alert('Use DD/MM/YYYY for dates.');return;}if(d.activeFrom&&d.activeUntil&&d.activeUntil<d.activeFrom){alert('Active until must be on or after active from.');return;}const times=selected.map(input=>({day:Number(input.value),start:same?d.start:form.querySelector(`[data-day-start="${input.value}"]`).value,end:same?d.end:form.querySelector(`[data-day-end="${input.value}"]`).value}));if(times.some(item=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.end))){alert('Use 24-hour time in HH:MM format, for example 08:00.');return;}if(times.some(item=>item.end<=item.start)){alert('End time must be after start time.');return;}const course=courses().find(c=>c.id===d.courseId),schedule=activeSchedule();if(!course||!schedule){alert('Add a course and active schedule first.');return;}const ids=(form.dataset.ids||'').split(',').filter(Boolean),old=ids.map(id=>DB.getAcademicEvents(user.id).find(e=>e.id===id)).filter(Boolean),groupId=old[0]?.scheduleGroupId||`schedule-${Date.now().toString(36)}`,description=d.type==='lecture'?'Predavanje':d.type==='seminar'?'Auditorne vježbe':d.type==='lab'?'Laboratorijske vježbe':'';
old.filter(item=>!times.some(time=>time.day===Number(item.day))).forEach(item=>DB.deleteAcademicEvent(item.id));
times.forEach(time=>{const existing=old.find(item=>Number(item.day)===time.day),payload={title:course.name,courseId:course.id,type:d.type,repeat:'weekly',day:time.day,start:time.start,end:time.end,location:d.location,color:d.color,description,scheduleGroupId:groupId,scheduleId:schedule.id,activeFrom:d.activeFrom,activeUntil:d.activeUntil};if(existing)DB.updateAcademicEvent(existing.id,payload);else DB.addAcademicEvent(user.id,payload);});$('#timetableBlockDialog').close();render();});
$('#scheduleSelect').onchange=e=>{DB.setActiveSchedule(user.id,e.target.value);render();};
$('#newSchedule').onclick=()=>{const name=prompt('Schedule name','Schedule '+(schedules().length+1));if(!name?.trim())return;const schedule=DB.addSchedule(user.id,{name:name.trim(),active:true});DB.setActiveSchedule(user.id,schedule.id);render();};
$('#renameSchedule').onclick=()=>{const schedule=activeSchedule();if(!schedule)return;const name=prompt('Schedule name',schedule.name);if(name?.trim()){DB.updateSchedule(schedule.id,{name:name.trim()});render();}};
$('#deleteSchedule').onclick=()=>{const list=schedules(),schedule=activeSchedule();if(!schedule)return;if(!confirm(`Delete ${schedule.name} and its weekly blocks?`))return;DB.deleteSchedule(schedule.id);const replacement=list.find(s=>s.id!==schedule.id);if(replacement)DB.setActiveSchedule(user.id,replacement.id);render();};
$('#exportSchedule').onclick=()=>{const schedule=activeSchedule();if(!schedule)return;const payload={version:1,schedule:{name:schedule.name},events:DB.getAcademicEvents(user.id).filter(e=>e.scheduleId===schedule.id)};const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));link.download=`${schedule.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'schedule'}.json`;link.click();URL.revokeObjectURL(link.href);};
$('#importSchedule').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const payload=JSON.parse(String(reader.result)),name=String(payload.schedule?.name||file.name.replace(/\.json$/i,'')).trim()||'Imported schedule',schedule=DB.addSchedule(user.id,{name,active:true});DB.setActiveSchedule(user.id,schedule.id);(Array.isArray(payload.events)?payload.events:[]).forEach(item=>{const copy={...item};delete copy.id;delete copy.userId;DB.addAcademicEvent(user.id,{...copy,scheduleId:schedule.id});});render();}catch(error){console.error('Schedule import failed:',error);alert('The schedule file could not be imported.');}e.target.value='';};reader.readAsText(file);};
document.addEventListener('click',e=>{if(e.target.closest('#answerLabs'))openEvent(true);if(e.target.closest('#noLabs')){events().filter(x=>x.type==='lab'&&x.weekKey===currentWeekKey()).forEach(x=>DB.deleteAcademicEvent(x.id));DB.saveLabWeek(user.id,currentWeekKey(),[]);render();}});
$('#saveAvailability').onclick=()=>{const out={},timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;let invalid=false;document.querySelectorAll('[data-day][data-part]').forEach(el=>{const d=el.dataset.day;out[d]||={};out[d][el.dataset.part]=el.type==='checkbox'?el.checked:el.value;if(el.type==='text'&&el.value&&!timePattern.test(el.value))invalid=true;});if(invalid){alert('Use 24-hour time in HH:MM format, for example 16:00.');return;}for(const day of Object.values(out)){if(day.start&&day.end&&day.end<=day.start){alert('Available until must be after available from.');return;}}DB.saveAvailability(user.id,out);render();};
$('#addPeriod').onclick=()=>$('#periodDialog').showModal();$('#periodForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));d.suspendClasses=d.suspendClasses==='true';if(d.endDate<d.startDate){alert('Resume date must be on or after the start date.');return;}DB.addPeriod(user.id,d);$('#periodDialog').close();render();});
// ── Adaptive planner UI ───────────────────────────────────────
// The plan is built by js/planner.js and re-computed automatically; this section only shows it.
const boostOptions=[[0.5,'Much less'],[0.75,'Less'],[1,'Normal'],[1.25,'More'],[1.5,'Much more'],[2,'Maximum']];
const hoursText=min=>`${(Math.round(min/6)/10).toString()}h`;
function renderPlannerPanels(){
  const status=$('#planStatus');if(!status)return;
  const prefs=DB.getPlannerPrefs(user.id),report=Planner.getReport(user.id),auto=prefs.auto!==false,toggle=$('#autoPlanToggle');
  if(toggle)toggle.checked=auto;
  const hasAvailability=Object.keys(DB.getAvailability(user.id)).length>0,warnings=(report?.warnings||[]).filter(w=>w.minutes>=30);
  let headline,detail='';
  if(!hasAvailability)headline='Save your weekly availability and the planner starts on its own.';
  else if(!auto)headline='Auto-planning is paused.';
  else if(!report)headline='Planning your week…';
  else if(!report.totalPlannedMin)headline='Nothing to plan yet. Add an exam date, an assignment, or ECTS for your courses.';
  else{const f=report.firstSession;headline=`Auto-planning is on · ${hoursText(report.totalPlannedMin)} planned · first session ${SFLocale.date(f.date)} at ${SFLocale.time(f.start)}`;}
  if(report?.stretched)detail+='<p class="hint">Some days run longer than usual so everything fits before your exams.</p>';
  if(warnings.length)detail+=`<ul>${warnings.slice(0,5).map(w=>`<li><strong>${esc(w.title||w.name)}</strong> is short by ${hoursText(w.minutes)} before ${SFLocale.date(w.due)}. Free up hours (availability, a one-day activity) or lower another subject.</li>`).join('')}</ul>`;
  status.className=`plan-status${warnings.length?' is-warning':''}`;
  status.innerHTML=`<strong>${esc(headline)}</strong>${detail}`;

  const rows=report?.courses||[];
  $('#planHealth').innerHTML=rows.length?rows.map(r=>{const c=courses().find(x=>x.id===r.courseId),late=r.shortfallMin>=30;return `<div class="plan-health-row" style="--course-color:${color(c?.color)}"><span class="plan-dot"></span><span class="name">${esc(r.name)}</span><span class="meta">${hoursText(r.doneMin)} done · ${hoursText(r.plannedMin)} planned of ${hoursText(r.targetMin)}${r.nextDue?` · due ${SFLocale.date(r.nextDue)}`:''}</span>${late?`<span class="plan-badge">short ${hoursText(r.shortfallMin)}</span>`:'<span class="plan-badge ok">on track</span>'}</div>`;}).join(''):'';

  const hoursBox=$('#courseHours'),list=courses().filter(c=>Number(c.ects)>0||prefs.courseHours?.[c.id]);
  hoursBox.innerHTML=list.length?list.map(c=>{const h=prefs.courseHours?.[c.id]||{},boost=Number(h.boost)||1,row=rows.find(r=>r.courseId===c.id);return `<div class="hours-row" style="--course-color:${color(c.color)}"><span class="plan-dot"></span><span class="name">${esc(c.name)}</span><span class="meta">${row?`${hoursText(row.plannedMin)} planned of ${hoursText(row.targetMin)}`:'no exam date yet'}</span><label>Amount<select data-hours-course="${esc(c.id)}" data-hours-field="boost">${boostOptions.map(([v,l])=>`<option value="${v}" ${Math.abs(v-boost)<.001?'selected':''}>${l}</option>`).join('')}${boostOptions.some(([v])=>Math.abs(v-boost)<.001)?'':`<option value="${boost}" selected>×${boost.toFixed(2)}</option>`}</select></label><label>+ extra hours<input type="number" step="0.5" min="-10" max="60" data-hours-course="${esc(c.id)}" data-hours-field="extraHours" value="${Number(h.extraHours)||0}"></label></div>`;}).join(''):'<p class="empty">Add courses with ECTS to tune hours per subject.</p>';

  const today=dateKey(new Date()),temps=events().filter(e=>e.temporary&&e.date>=today).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  $('#tempList').innerHTML=temps.length?temps.map(e=>`<div class="task-row"><div><span class="task-title">${esc(e.title)}</span><span class="task-meta">${SFLocale.date(e.date)} · removed automatically after it ends</span></div><span class="task-due">${esc(SFLocale.time(e.start))}–${esc(SFLocale.time(e.end))}</span><button type="button" class="tiny-btn" data-delete-event="${esc(e.id)}">×</button></div>`).join(''):'<p class="empty">Driving lesson, appointment, a trip? Add it and study time moves around it. It disappears from your calendar when it is over.</p>';
  const log=DB.getActivityLog(user.id).slice(0,6);
  $('#activityLog').innerHTML=log.length?`<p class="eyebrow">RECENTLY FINISHED</p>${log.map(e=>`<div class="task-row"><div><span class="task-title">${esc(e.title)}</span><span class="task-meta">${SFLocale.date(e.date)}</span></div><span class="task-due">${esc(SFLocale.time(e.start))}–${esc(SFLocale.time(e.end))}</span></div>`).join('')}`:'';
}
function replanNow(){
  if(!Object.keys(DB.getAvailability(user.id)).length){alert('Set and save your weekly availability first.');return null;}
  DB.savePlannerPrefs(user.id,{auto:true});
  const result=Planner.sync({force:true});render();return result;
}
$('#tempForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),ok=/^([01]\d|2[0-3]):[0-5]\d$/;if(!ok.test(d.start)||!ok.test(d.end)){alert('Use 24-hour time in HH:MM format, for example 17:00.');return;}if(d.end<=d.start){alert('End time must be after start time.');return;}DB.addTemporaryActivity(user.id,{title:d.title.trim(),date:d.date,start:d.start,end:d.end});$('#tempDialog').close();render();});
$('#addTemp').onclick=()=>{const f=$('#tempForm');f.reset();f.elements.date.value=dateKey(new Date());$('#tempDialog').showModal();};
document.addEventListener('change',e=>{const el=e.target.closest('[data-hours-course]');if(!el)return;const field=el.dataset.hoursField,value=Number(el.value);DB.setCourseHours(user.id,el.dataset.hoursCourse,{[field]:Number.isFinite(value)?value:(field==='boost'?1:0)});render();});
window.addEventListener('sf:planner-updated',e=>{if(e.detail?.changed||!Planner.getReport(user.id))render();else renderPlannerPanels();});
// ── Assistant ─────────────────────────────────────────────────
const assistantState={action:null,fields:{}};
const pad2=v=>String(v).padStart(2,'0');
const wordRe=(source,flags='giu')=>new RegExp(`(?<!\\p{L})(?:${source})(?!\\p{L})`,flags);
const weekdayWords=[[0,'nedjelj\\p{L}*|sunday'],[1,'ponedjelj\\p{L}*|monday'],[2,'utor\\p{L}*|tuesday'],[3,'srijed\\p{L}*|wednesday'],[4,'[cč]etvrt\\p{L}*|thursday'],[5,'petak|petk\\p{L}*|friday'],[6,'subot\\p{L}*|saturday']];
function assistantWeekday(text){const hit=weekdayWords.find(([,re])=>wordRe(re,'iu').test(String(text)));return hit?hit[0]:null;}
function assistantDate(text,fallback=''){
  const lower=normalizeName(text),base=new Date();base.setHours(12,0,0,0);
  if(/\b(prekosutra|day after tomorrow)\b/.test(lower)){base.setDate(base.getDate()+2);return dateKey(base);}
  if(/\b(sutra|tomorrow)\b/.test(lower)){base.setDate(base.getDate()+1);return dateKey(base);}
  if(/\b(danas|today)\b/.test(lower))return dateKey(base);
  const match=lower.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\.?(?![\d:])/);
  if(match&&Number(match[2])>=1&&Number(match[2])<=12&&Number(match[1])>=1&&Number(match[1])<=31){
    let year=Number(match[3]||base.getFullYear());if(year<100)year+=2000;
    let found=new Date(year,Number(match[2])-1,Number(match[1]),12);
    if(!match[3]&&found<new Date(new Date().setHours(0,0,0,0)))found=new Date(year+1,Number(match[2])-1,Number(match[1]),12);
    return dateKey(found);
  }
  const weekday=assistantWeekday(text);
  if(weekday!=null){let add=(weekday-base.getDay()+7)%7;if(add===0)add=7;base.setDate(base.getDate()+add);return dateKey(base);}
  return fallback;
}
function assistantCourse(text){
  const lower=normalizeName(text);
  return courses().find(item=>normalizeName(item.name)===lower)||courses().find(item=>normalizeName(item.name).split(/\s+/).some(word=>word.length>3&&lower.includes(word.slice(0,Math.max(4,word.length-2)))));
}
function assistantTime(text){
  const s=String(text),hm=[...s.matchAll(/(?<![\d.])([01]?\d|2[0-3])(?:([:h])([0-5]\d)|\.([0-5]\d)(?![\d.]))/g)].filter(m=>{if(m[2])return true;const minutes=Number(m[4]),cue=/(?:\bod|\bfrom|\bu|\bat|\boko)\s*$/i.test(s.slice(0,m.index));return !(minutes>=1&&minutes<=12)||cue;}).map(m=>`${pad2(m[1])}:${m[3]||m[4]}`);
  if(hm.length)return {start:hm[0]||'',end:hm[1]||''};
  let m=s.match(/(?:\bod|\bfrom)\s*(\d{1,2})\s*(?:h|sati?)?\s*(?:do|to|-|–|until)\s*(\d{1,2})(?!\d)/i)||s.match(/(?<![\d.])(\d{1,2})\s*(?:-|–|do|to)\s*(\d{1,2})\s*h\b/i);
  if(m&&Number(m[1])<24&&Number(m[2])<=24&&Number(m[2])>Number(m[1]))return {start:`${pad2(m[1])}:00`,end:Number(m[2])===24?'23:59':`${pad2(m[2])}:00`};
  m=s.match(/(?:\bod|\bfrom|\bu|\bat|\boko)\s*(\d{1,2})\s*(?:h|sati?)?(?![\d:.]|\s*(?:sat|sata|minut|min|hour|hrs?))/i);
  if(m&&Number(m[1])<24)return {start:`${pad2(m[1])}:00`,end:''};
  return {start:'',end:''};
}
function assistantTitle(text){
  let t=String(text).replace(/^(ej|hej|bok)[,!.\s]*/i,'');
  t=t.replace(/(?<![\d.])([01]?\d|2[0-3])(?::|[.h])[0-5]\d(?!\d)/g,'').replace(/(?:\bod|\bfrom)\s*\d{1,2}\s*(?:h|sati?)?\s*(?:do|to|-|–|until)\s*\d{1,2}\s*h?/ig,'').replace(/\d{1,2}\s*(?:-|–|do|to)\s*\d{1,2}\s*h\b/ig,'').replace(/(?:\bod|\bfrom|\bu|\bat)\s*\d{1,2}\s*h?(?![\d:])/ig,'');
  t=t.replace(/\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\.?/g,'');
  weekdayWords.forEach(([,re])=>{t=t.replace(wordRe(re),' ');});
  t=t.replace(wordRe('dodaj|add|schedule|put|stavi|napravi|create|raspored|calendar|kalendar|termin|event|activity|imam|trebam|i have|prekosutra|sutra|tomorrow|danas|today|svaki|svake|svaki tjedan|every|every week|tjedno|weekly|mi|me|u|na|od|do|in|on|at|from|to|the|a'),' ');
  t=t.replace(/\s+/g,' ').trim();
  const known=[[/autoskol/,'Autoškola'],[/trening|teretan/,'Trening'],[/doktor|lijecnik/,'Liječnik'],[/zubar/,'Zubar'],[/sastanak|meeting/,'Sastanak'],[/posao|\bwork\b/,'Posao']].find(([re])=>re.test(normalizeName(text)));
  if(known)return known[1];
  return t?t.charAt(0).toUpperCase()+t.slice(1):'';
}
const busyWords=/\b(autoskol\w*|doktor\w*|lijecnik\w*|zubar\w*|trening\w*|teretan\w*|sastanak|meeting|appointment|posao|putovanje|trip|rodjendan|birthday)\b/;
function assistantIntent(text){
  const lower=normalizeName(text),time=assistantTime(text),hasDay=assistantDate(text)||assistantWeekday(text)!=null;
  if(/\b(novi|new|create|make|add|dodaj|napravi|kreiraj)\b.*\b(course|kolegij|kolegija|predmet)\b|\b(course|kolegij|predmet)\b.*\b(novi|new|create|add|dodaj)\b/.test(lower))return 'course';
  if(/\b(replan|re-plan)\b|\b(ponovno|opet|again|obnovi|osvjezi|slozi)\b.*\b(raspored|plan|schedule)\b/.test(lower))return 'replan';
  if(/\b(ne mogu|cannot|can't|cant|mogu|can)\b/.test(lower)&&/\b(ucit|ucim|uciti|study|learn)\b/.test(lower)&&assistantWeekday(text)!=null)return 'availability';
  if(assistantCourse(text)&&/\b(vise|more|povecaj|increase|manje|less|smanji|reduce|tjedno|weekly|per week|na tjedan)\b/.test(lower)&&!(time.start&&time.end))return 'boost';
  if(/\b(assignment|task|homework|project|priprem\w*|zadatak|zadatk\w*|zadac\w*|domac\w*|domacu|labos)\b/.test(lower)&&!(time.start&&time.end&&hasDay))return 'assignment';
  if(/\b(schedule|calendar|calendaru|raspored|termin|event|activity|blok|block|lecture|predavanje|lab|vjezbe)\b/.test(lower)||busyWords.test(lower)||(time.start&&hasDay))return 'schedule';
  return 'unknown';
}
function parseBoost(text){
  const lower=normalizeName(text),less=/\b(manje|less|smanji|reduce)\b/.test(lower);
  const weekly=lower.match(/(\d+(?:[.,]\d+)?)\s*(?:h|sat|sata|sati|hours?)?\s*(?:tjedno|weekly|per week|na tjedan)/);
  if(weekly)return {mode:'weekly',value:Number(weekly[1].replace(',','.'))};
  const pct=lower.match(/(\d+)\s*%/);if(pct)return {mode:'boost',factor:less?1-Number(pct[1])/100:1+Number(pct[1])/100,absolute:true};
  const times=lower.match(/\bx\s*(\d+(?:[.,]\d+)?)\b|\b(\d+(?:[.,]\d+)?)\s*x\b/);if(times)return {mode:'boost',factor:Number((times[1]||times[2]).replace(',','.')),absolute:true};
  const hours=lower.match(/(\d+(?:[.,]\d+)?)\s*(?:h|sat|sata|sati|hours?)\b/);if(hours){const n=Number(hours[1].replace(',','.'));return {mode:'extra',value:less?-n:n};}
  if(/\b(puno|much|max|dosta|znatno)\b/.test(lower))return {mode:'boost',factor:less?0.6:1.5};
  return {mode:'boost',factor:less?0.8:1.25};
}
function parseAssistantRequest(input){
  const text=String(input||'').trim(),lower=normalizeName(text),intent=assistantIntent(text);
  if(intent==='course'){
    const name=text.replace(/^(ej|hej|bok)[,!.\s]*/i,'').replace(/\b(novi|new|create|make|add|dodaj|napravi|kreiraj)\b/ig,'').replace(/\b(course|kolegij|kolegija|predmet)\b/ig,'').replace(/^(a|an|the|novi|new)\s+/i,'').replace(/\s+/g,' ').trim();
    return {action:'course',name:name.replace(/^(za|for)\s+/i,'').trim()};
  }
  if(intent==='replan')return {action:'replan'};
  if(intent==='availability'){
    const time=assistantTime(text),off=/\b(ne mogu|cannot|can't|cant)\b/.test(lower);
    if(!off&&!time.start)return {error:'Od kada možeš učiti? / From what time can you study? Npr. "u nedjelju mogu učiti od 10 do 18".'};
    return {action:'availability',day:assistantWeekday(text),off,start:time.start,end:time.end};
  }
  if(intent==='boost')return {action:'boost',course:assistantCourse(text),...parseBoost(text)};
  const durationMatch=lower.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours|sat|sata|min|minute|minutes)/);
  const durationMinutes=durationMatch?Math.round(Number(durationMatch[1].replace(',','.'))*(/min|minute/.test(durationMatch[0])?1:60)):0;
  const date=assistantDate(text),time=assistantTime(text);
  if(intent==='schedule'){
    const weekday=assistantWeekday(text),recurring=/\b(svaki|svake|every|tjedno|weekly)\b/.test(lower)&&weekday!=null;
    return {action:'schedule',title:assistantTitle(text),date:recurring?'':date,start:time.start,end:time.end,course:assistantCourse(text),repeat:recurring?'weekly':'once',day:recurring?weekday:null};
  }
  if(intent==='assignment'){
    if(!durationMinutes)return {error:'Koliko vremena treba? / How long will it take? Napiši npr. 2h ili 90 minuta.'};
    if(!date)return {error:'Koji je rok? / What is the due date? Napiši danas, sutra ili datum poput 18.11.'};
    const course=assistantCourse(text),cleaned=text.replace(/^(ej|hej|bok)[,!.\s]*/i,'').replace(/\b(?:sutra|tomorrow|danas|today)\b/ig,'').replace(/\b\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hour|hours|sat|sata|min|minute|minutes)\b/ig,'').replace(/\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\.?/g,'').replace(wordRe('do|rok|until|by|due'),' ').replace(/^(imam|i have|trebam|i need|moram|i must|napravi|napraviti|make)\s+/i,'').replace(/\s+za to\s+mi\s+trebati\s*$/i,'').replace(/\s+/g,' ').trim();
    const title=cleaned.replace(/\s+/g,' ').trim()||'Novi assignment';
    return {action:'assignment',title:title.charAt(0).toUpperCase()+title.slice(1),course,dueDate:date,durationMinutes};
  }
  return {error:'Mogu: dodati kolegij, zadaću (s rokom i trajanjem), jednokratnu ili tjednu obvezu (npr. "autoškola utorak od 17 do 18"), promijeniti sate za predmet (npr. "više sati za linearnu algebru"), ili tvoju dostupnost (npr. "u nedjelju mogu učiti od 10"). / I can add a course, assignment, activity, change hours per subject, or your availability.'};
}
function addAssistantMessage(text,type='bot'){const messages=$('#assistantMessages');if(!messages)return;const item=document.createElement('div');item.className=`assistant-message assistant-message-${type}`;item.textContent=text;messages.appendChild(item);messages.scrollTop=messages.scrollHeight;}
function planSummary(result){
  const r=result?.report;if(!r)return '';if(r.needsAvailability)return ' Spremi prvo dostupne sate da ga mogu složiti.';
  const f=r.firstSession,short=(r.warnings||[]).filter(w=>w.minutes>=30);
  return f?` Raspored je složen: ${hoursText(r.totalPlannedMin)} ukupno, prva sesija ${SFLocale.date(f.date)} u ${SFLocale.time(f.start)}.${short.length?` Pazi: ${short[0].title||short[0].name} fali ${hoursText(short[0].minutes)}.`:''}`:' Trenutno nema što planirati.';
}
function handleAssistantRequest(event){
  event?.preventDefault();const input=$('#assistantInput'),text=input.value.trim();if(!text)return;addAssistantMessage(text,'user');
  if(assistantState.action&&/\b(odustani|cancel|stop|nista|ne treba)\b/.test(normalizeName(text))){assistantState.action=null;assistantState.fields={};input.value='';addAssistantMessage('U redu, odustajem. / Okay, cancelled.');return;}
  if(assistantState.action==='schedule'){const fresh=assistantIntent(text);if(!['unknown','schedule'].includes(fresh)&&!assistantTime(text).start){assistantState.action=null;assistantState.fields={};}}
  let parsed;
  if(assistantState.action==='course') parsed={action:'course',name:text};
  else if(assistantState.action==='schedule'){
    const time=assistantTime(text),prior=assistantState.fields;
    parsed={action:'schedule',...prior,title:prior.title||'',date:prior.repeat==='weekly'?'':assistantDate(text,prior.date||''),start:time.start||prior.start||'',end:time.end||prior.end||''};
    if(!parsed.title&&!(parsed.date&&parsed.start)&&!time.start)parsed.title=text;
  } else parsed=parseAssistantRequest(text);
  if(parsed.error){addAssistantMessage(parsed.error);return;}
  if(parsed.action==='course'&&!parsed.name){assistantState.action='course';assistantState.fields={};addAssistantMessage('Kako se zove course? / What is the course name?');return;}
  if(parsed.action==='schedule'&&(!parsed.title||(!parsed.date&&parsed.repeat!=='weekly')||!parsed.start||!parsed.end)){
    assistantState.action='schedule';assistantState.fields={...parsed};const missing=!parsed.title?'naziv termina / event title':(!parsed.date&&parsed.repeat!=='weekly')?'datum / date':'vrijeme od-do / start and end time (npr. 17:00-18:00)';
    addAssistantMessage(`Treba mi još: ${missing}.`);input.value='';return;
  }
  if(parsed.action==='boost'&&!parsed.course){addAssistantMessage('Za koji predmet? / Which course?');return;}
  let result=null;
  if(parsed.action==='course'){const course=DB.addCourse(user.id,{name:parsed.name.trim(),ects:0,assessments:[]});addAssistantMessage(`Course "${course.name}" je dodan. / Course "${course.name}" was created.`);}
  else if(parsed.action==='schedule'){
    if(parsed.repeat==='weekly'){const schedule=ensureSchedule(),record=DB.addAcademicEvent(user.id,{title:parsed.title.trim(),courseId:parsed.course?.id||'',type:'other',repeat:'weekly',day:parsed.day,start:parsed.start,end:parsed.end,location:'',description:'Added by the StudyFlow assistant.',scheduleId:schedule?.id||''});result=Planner.sync({force:true});addAssistantMessage(`Dodano svaki tjedan: ${record.title} · ${days[(parsed.day+6)%7]} · ${record.start}–${record.end}. Učenje se miče oko toga.${planSummary(result)}`);}
    else{const record=DB.addTemporaryActivity(user.id,{title:parsed.title.trim(),courseId:parsed.course?.id||'',date:parsed.date,start:parsed.start,end:parsed.end,description:'Added by the StudyFlow assistant.'});result=Planner.sync({force:true});addAssistantMessage(`Dodano samo za taj dan: ${record.title} · ${SFLocale.date(record.date)} · ${record.start}–${record.end}. Nestaje s rasporeda kad završi, a ostaje u zapisniku.${planSummary(result)}`);}
  }
  else if(parsed.action==='assignment'){const task=DB.addTask(user.id,{title:parsed.title,courseId:parsed.course?.id||'',dueDate:parsed.dueDate,dueTime:'',status:'open',planningMinutes:parsed.durationMinutes,description:'Added by the StudyFlow assistant.'});const hasAvailability=Object.keys(DB.getAvailability(user.id)).length>0;if(hasAvailability)result=Planner.sync({force:true});addAssistantMessage(`Dodano: ${task.title} · ${SFLocale.date(task.dueDate)} · ${Math.round(task.planningMinutes/60*10)/10}h.${hasAvailability?planSummary(result):' Spremi prvo svoje dostupne sate da ga mogu ubaciti u raspored.'}`);}
  else if(parsed.action==='boost'){
    const current=DB.getPlannerPrefs(user.id).courseHours?.[parsed.course.id]||{};let label='';
    if(parsed.mode==='weekly'){DB.setCourseHours(user.id,parsed.course.id,{weeklyHours:parsed.value});label=`${parsed.value}h tjedno`;}
    else if(parsed.mode==='extra'){const extra=Math.max(-10,Math.min(60,(Number(current.extraHours)||0)+parsed.value));DB.setCourseHours(user.id,parsed.course.id,{extraHours:extra});label=`${extra>=0?'+':''}${extra}h dodatno`;}
    else{const boost=Math.max(0.4,Math.min(3,parsed.absolute?parsed.factor:(Number(current.boost)||1)*parsed.factor));DB.setCourseHours(user.id,parsed.course.id,{boost:Math.round(boost*100)/100});label=`×${(Math.round(boost*100)/100)}`;}
    result=Planner.sync({force:true});addAssistantMessage(`${parsed.course.name}: ${label}.${planSummary(result)}`);
  }
  else if(parsed.action==='availability'){
    const avail={...DB.getAvailability(user.id)},index=(parsed.day+6)%7,existing=avail[index]||{start:'16:00',end:'20:00',enabled:true};
    if(parsed.off){avail[index]={...existing,enabled:false};DB.saveAvailability(user.id,avail);result=Planner.sync({force:true});addAssistantMessage(`${days[index]}: bez učenja.${planSummary(result)}`);}
    else{let end=parsed.end||existing.end||'20:00';if(end<=parsed.start)end=parsed.start<'18:00'?'20:00':'23:00';avail[index]={...existing,start:parsed.start,end,enabled:true};DB.saveAvailability(user.id,avail);result=Planner.sync({force:true});addAssistantMessage(`${days[index]}: možeš učiti ${parsed.start}–${end}. Prva sesija kreće od ${parsed.start}.${planSummary(result)}`);}
  }
  else if(parsed.action==='replan'){result=replanNow();addAssistantMessage(`Ponovno složeno.${planSummary(result)}`);}
  assistantState.action=null;assistantState.fields={};input.value='';render();
}
$('#generatePlan').onclick=()=>{const r=replanNow();if(r&&r.report?.needsAvailability)alert('Set and save your weekly availability first.');};
$('#autoPlanToggle').onchange=e=>{DB.savePlannerPrefs(user.id,{auto:e.target.checked});if(e.target.checked)Planner.sync({force:true});render();};
$('#toggleStudyPlan').onclick=()=>{const panel=$('#studyPlanPanel'),collapsed=panel.classList.toggle('is-collapsed'),button=$('#toggleStudyPlan');button.textContent=collapsed?'Expand':'Collapse';button.setAttribute('aria-expanded',String(!collapsed));};
$('#clearStudyPlan').onclick=()=>{if(!confirm('Pause auto-planning and remove all generated study sessions? Sessions you completed stay.'))return;DB.savePlannerPrefs(user.id,{auto:false});const removed=Planner.clearGenerated(user.id);addAssistantMessage(removed?`Removed ${removed} generated sessions. Auto-planning is paused.`:'Auto-planning is paused.');render();};
$('#assistantForm').addEventListener('submit',handleAssistantRequest);
$('#assistantToggle').onclick=()=>{$('#assistantDrawer').classList.add('is-open');$('#assistantDrawer').setAttribute('aria-hidden','false');$('#assistantInput').focus();};
$('#assistantClose').onclick=()=>{$('#assistantDrawer').classList.remove('is-open');$('#assistantDrawer').setAttribute('aria-hidden','true');};
document.addEventListener('click',e=>{const editGroup=e.target.closest('[data-edit-group]');if(editGroup){openTimetableBlock(events().find(x=>x.id===editGroup.dataset.editGroup));return;}const edit=e.target.closest('[data-edit-event]');if(edit){const event=events().find(x=>x.id===edit.dataset.editEvent);if(event)openEvent(event);return;}const del=e.target.closest('[data-delete-event]');if(del){if(!DB.deleteAcademicEvent(del.dataset.deleteEvent))console.error(`Could not remove study plan event ${del.dataset.deleteEvent}.`);render();return;}const group=e.target.closest('[data-delete-group]');if(group){group.dataset.deleteGroup.split(',').forEach(id=>DB.deleteAcademicEvent(id));render();}const p=e.target.closest('[data-delete-period]');if(p){DB.deletePeriod(p.dataset.deletePeriod);render();}const a=e.target.closest('[data-close]');if(a)document.getElementById(a.dataset.close).close();});$('#signOutBtn')?.addEventListener('click',async()=>{const sync=await window.FirebaseSyncReady;if(sync?.enabled)await sync.signOut();localStorage.removeItem('sf_current_user');location.href='auth.html?mode=signin';});
render();}
