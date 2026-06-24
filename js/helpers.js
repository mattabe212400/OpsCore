/* OpsCore 2.0 Demo — Helpers & Utilities */
function toast(msg,type='info',duration=3000){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');
  t.className='toast '+type;t.textContent=msg;c.appendChild(t);
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{t.classList.add('show');});});
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),250);},duration);
}

// ── CONFIRM DIALOG ──
let _confirmResolve = null;
function confirmDialog(title, msg, okLabel = 'Delete', danger = true) {
  return new Promise(res => {
    _confirmResolve = res;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    const ok = document.getElementById('confirm-ok');
    ok.textContent = okLabel;
    ok.className = 'btn ' + (danger ? 'btn-d' : 'btn-p');
    ok.onclick = () => {
      document.getElementById('confirm-overlay').classList.remove('open');
      _confirmResolve = null;
      res(true);
    };
    document.getElementById('confirm-overlay').classList.add('open');
  });
}
function confirmCancel() {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (_confirmResolve) {
    _confirmResolve(false);
    _confirmResolve = null;
  }
}

// ── BUTTON GUARD (prevents double-submit) ──
// Usage: btnGuard(btn, async () => { ... });
async function btnGuard(btn, fn) {
  if (!btn || btn.disabled) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = '0.7';
  try {
    await fn();
  } catch(e) {
    toast('An unexpected error occurred.','error');
    console.warn('btnGuard caught:', e);
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.textContent = orig;
  }
}

// ── RBAC: can current user write/delete data? ──
function canWrite() {
  if (!CURRENT_USER) return false;
  // Viewer role is read-only
  if (CURRENT_USER.role === 'viewer') return false;
  return true;
}

// Close confirm dialog with Escape key; also close any open modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('confirm-overlay');
    if (overlay && overlay.classList.contains('open')) { confirmCancel(); return; }
    // Close topmost open modal
    const openModals = document.querySelectorAll('.mo.open');
    if (openModals.length) {
      openModals[openModals.length - 1].classList.remove('open');
    }
  }
});

const PAGE_TITLES={dashboard:'Executive Dashboard',attendance:'Attendance',finance:'Finance',calendar:'Calendar',tasks:'Tasks & Goals',notes:'Meeting Notes',judicial:'Judicial Board',sober:'Sober Bro Management',members:'Members',recruitment:'Recruitment CRM',academics:'Academics',committees:'Committees',analytics:'Analytics & Reporting',files:'Files & Documents',notifications:'Notifications',transition:'Officer Transition Hub',settings:'Settings',philanthropy:'Philanthropy & Service',alumni:'Alumni Relations',ritual:'Ritual & Education',vendors:'Vendors & Contacts',healthscore:'Chapter Health Scorecard',playbooks:'SOPs & Playbooks',reports:'Reports'};

function getMember(id){if(!id)return{name:'Unassigned',initials:'—'};return D.members.find(m=>m.id===id)||{name:'Unknown',initials:'??'};}
function formatDate(d){if(!d)return'—';try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}catch{return'—';}}
function formatDateShort(d){if(!d)return'—';try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}catch{return'—';}}
function dayOfMonth(d){if(!d)return'';try{return new Date(d+'T12:00:00').getDate();}catch{return'';}}
function monthShort(d){if(!d)return'';try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short'});}catch{return'';}}
function isOverdue(d){if(!d)return false;try{return new Date(d+'T12:00:00')<new Date();}catch{return false;}}
function isUpcoming(d){if(!d)return false;try{return new Date(d+'T12:00:00')>=new Date();}catch{return false;}}
function percent(count,total){return total?Math.round(count/total*100):0;}
function uid(){return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function progressColor(p){return p>=80?'var(--gn)':p>=50?'var(--navy)':p>=25?'var(--am)':'var(--rd)';}

// Attendance rate: computed from real D.attendance data
function getAttendanceRate(memberId){
  const mandEvents=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date));
  if(!mandEvents.length){
    // No past mandatory events yet — use seeded defaults for officers, 80 for others
    // No attendance data yet — return 100% as neutral baseline until real events are marked
    return 100;
  }
  let present=0;
  mandEvents.forEach(ev=>{
    const rec=(D.attendance[ev.id]||{})[memberId];
    if(rec==='present'||rec==='excused')present++;
  });
  return Math.round(present/mandEvents.length*100);
}

function getAttendanceTrend(memberId){
  const mandPast=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
  if(mandPast.length<3)return'stable';
  const series=mandPast.map(ev=>{const rec=(D.attendance[ev.id]||{})[memberId];return(rec==='present'||rec==='excused')?1:0;});
  const mid=Math.floor(series.length/2);
  const avgFirst=series.slice(0,mid).reduce((a,b)=>a+b,0)/mid;
  const avgLast=series.slice(-mid).reduce((a,b)=>a+b,0)/mid;
  const delta=avgLast-avgFirst;
  if(delta>0.1)return'improving';
  if(delta<-0.1)return'declining';
  return'stable';
}
function getTaskMetrics(id){const all=D.tasks.filter(t=>t.assignedTo===id);const dn=all.filter(t=>t.status==='done');return{total:all.length,done:dn.length,rate:all.length?Math.round(dn.length/all.length*100):0};}
function memberSelectOptions(){return D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');}
function eventCategoryStyle(t){const m={chapter:'background:#e8eef7;color:#1a3a6b',exec:'background:#f0f0ee;color:#555',recruitment:'background:var(--gn-bg);color:var(--gn-tx)',philanthropy:'background:#fbeaf0;color:#993556',brotherhood:'background:var(--am-bg);color:var(--am-tx)',retreat:'background:var(--gn-bg);color:var(--gn-tx)',mandatory:'background:var(--rd-bg);color:var(--rd-tx)'};return m[t]||'background:#f0f0ee;color:#555';}

// ── SIDEBAR RESPONSIVE ──
function sbOpen(){
  document.getElementById('app-nav').classList.add('open');
  document.getElementById('sb-overlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function sbClose(){
  document.getElementById('app-nav').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
  document.body.style.overflow='';
}
function sbToggle(){
  const nav=document.getElementById('app-nav');
  nav.classList.contains('open')?sbClose():sbOpen();
}

function nav(page,el){
  // Lock judicial board when navigating away from it
  // No jbLock on nav — judicial access is role-based, not session-locked
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('page-'+page);if(pg)pg.classList.add('active');
  if(el)el.classList.add('active');
  else{const lbl=page.replace('-',' ');document.querySelectorAll('.ni').forEach(n=>{if(n.textContent.toLowerCase().trim().startsWith(lbl.substring(0,6)))n.classList.add('active');});}
  document.getElementById('pg-title').textContent=(page==='dashboard'&&CURRENT_USER)?('Good '+getTimeOfDay()+', '+CURRENT_USER.name.split(' ')[0]):PAGE_TITLES[page]||page;
  // Show skeleton for data-heavy pages
  const skMap={
    dashboard:[{id:'d-kpi',html:skKpi(4)},{id:'d-events',html:skRows2(3)},{id:'d-overdue',html:skRows2(3)}],
    attendance:[{id:'a-kpi',html:skKpi(4)},{id:'a-table',html:skRows(6,5)}],
    calendar:[{id:'cal-grid',html:skCalendar()}],
    notes:[{id:'notes-g',html:skCards(4)}],
    analytics:[{id:'an-kpi',html:skKpi(4)},{id:'an-eng',html:skRows(4,2)},{id:'an-officers',html:skRows(5,4)}],
    files:[{id:'fi-folders',html:Array(8).fill(0).map(()=>`<div class="sk-card" style="height:90px"></div>`).join('')}],
    committees:[{id:'co-grid',html:Array(3).fill(0).map(()=>`<div class="sk-card" style="height:110px"></div>`).join('')}],
    transition:[{id:'tr-folders',html:Array(6).fill(0).map(()=>`<div class="sk-card" style="height:100px"></div>`).join('')}],
  };
  if(skMap[page]){
    skMap[page].forEach(({id,html})=>{const e=document.getElementById(id);if(e)e.innerHTML=html;});
  }
  // Small timeout so skeleton flashes before render
  setTimeout(()=>{R[page]&&R[page]();},60);
  // Auto-close sidebar drawer on mobile/tablet
  if(window.innerWidth<=1100)sbClose();
}
function openM(id){
  const el=document.getElementById(id);
  el.querySelectorAll('select[id="nt-a"],select[id="nc-m"],select[id="ns-m"],select[id="nco-c"],select[id="ntr-o"]').forEach(s=>{
    const pre=s.id==='ns-m'?'<option value="">— Unassigned —</option>':'';
    s.innerHTML=pre+memberSelectOptions();
  });
  // Reset event modal to "New Event" mode
  if(id==='m-addevent'){
    const eid=document.getElementById('ne-edit-id');if(eid)eid.value='';
    const mt=el.querySelector('.md-t');if(mt&&mt.childNodes[0])mt.childNodes[0].textContent='New Event';
  }
  el.classList.add('open');
}
function closeM(e,el){if(e&&e.target!==el)return;el.classList.remove('open');}

async function addMem(){
  if(!canWrite()){toast('You do not have permission to add members.','error');return;}
  const name=document.getElementById('nm-n').value.trim();
  if(!name){toast('Name is required','error');return;}
  const ini=name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const member={id:uid(),name,year:+document.getElementById('nm-y').value,classYear:document.getElementById('nm-c').value,liveIn:document.getElementById('nm-l').value==='1',role:'Member',initials:ini};
  D.members.push(member);
  try{
    await saveData();
    closeM(null,document.getElementById('m-addmember'));document.getElementById('nm-n').value='';renderMembers();toast('Member added','success');
  }catch(e){
    D.members=D.members.filter(m=>m.id!==member.id);
    toast('Failed to add member. Please try again.','error');
  }
}
async function addEv(){
  if(!canWrite()){toast('You do not have permission to add events.','error');return;}
  const title=document.getElementById('ne-t').value.trim();
  if(!title){toast('Title is required','error');return;}
  const editId=document.getElementById('ne-edit-id')?.value;
  if(editId){
    const ev=D.events.find(e=>e.id===editId);
    if(!ev){toast('Event not found.','error');return;}
    // Snapshot for rollback
    const prev={title:ev.title,type:ev.type,date:ev.date,start:ev.start,location:ev.location,mandatory:ev.mandatory};
    ev.title=title;ev.type=document.getElementById('ne-tp').value;ev.date=document.getElementById('ne-d').value;ev.start=document.getElementById('ne-st').value;ev.location=document.getElementById('ne-l').value;ev.mandatory=document.getElementById('ne-m').value==='1';
    document.getElementById('ne-edit-id').value='';
    try{
      await saveData();
      closeM(null,document.getElementById('m-addevent'));renderCalendar();renderAttendance();renderDash();toast('Event updated','success');
    }catch(e){
      Object.assign(ev,prev);document.getElementById('ne-edit-id').value=editId;
      toast('Failed to save event. Please try again.','error');
    }
    return;
  }
  const ev={id:uid(),title,type:document.getElementById('ne-tp').value,date:document.getElementById('ne-d').value,start:document.getElementById('ne-st').value,location:document.getElementById('ne-l').value,mandatory:document.getElementById('ne-m').value==='1'};
  D.events.push(ev);
  try{
    await saveData();
    closeM(null,document.getElementById('m-addevent'));document.getElementById('ne-t').value='';renderCalendar();renderAttendance();renderDash();toast('Event created','success');
  }catch(e){
    D.events=D.events.filter(x=>x.id!==ev.id);
    toast('Failed to create event: '+(e.code||e.message||'unknown'),'error',8000);
  }
}
function openEditEvent(id){
  const ev=D.events.find(e=>e.id===id);if(!ev)return;
  if(!canWrite()){toast('You do not have permission to edit events.','error');return;}
  const m=document.getElementById('m-addevent');
  m.querySelector('.md-t').childNodes[0].textContent='Edit Event';
  document.getElementById('ne-t').value=ev.title;
  document.getElementById('ne-tp').value=ev.type||'chapter';
  document.getElementById('ne-d').value=ev.date;
  document.getElementById('ne-st').value=ev.start||'';
  document.getElementById('ne-l').value=ev.location||'';
  document.getElementById('ne-m').value=ev.mandatory?'1':'0';
  if(document.getElementById('ne-edit-id'))document.getElementById('ne-edit-id').value=id;
  m.classList.add('open');
}
async function deleteEvent(id){
  if(!canWrite()){toast('You do not have permission to delete events.','error');return;}
  const ok=await confirmDialog('Delete Event','Delete this event? Attendance records for it will also be removed.');
  if(!ok)return;
  const removed=D.events.find(e=>e.id===id);
  const removedAtt=D.attendance[id];
  D.events=D.events.filter(e=>e.id!==id);
  delete D.attendance[id];
  try{
    await saveData();
    document.getElementById('cal-detail').style.display='none';
    renderCalendar();renderAttendance();renderDash();toast('Event deleted','info');
  }catch(e){
    if(removed)D.events.push(removed);
    if(removedAtt)D.attendance[id]=removedAtt;
    toast('Failed to delete event. Please try again.','error');
  }
}
async function addTask(){
  if(!canWrite()){toast('You do not have permission to add tasks.','error');return;}
  const title=document.getElementById('nt-t').value.trim();
  if(!title){toast('Title is required','error');return;}
  const task={id:uid(),title,assignedTo:document.getElementById('nt-a').value,priority:document.getElementById('nt-p').value,status:document.getElementById('nt-s').value,dueDate:document.getElementById('nt-d').value,desc:document.getElementById('nt-ds').value};
  D.tasks.push(task);
  try{
    await saveData();
    closeM(null,document.getElementById('m-addtask'));document.getElementById('nt-t').value='';renderTasks();renderDash();toast('Task created','success');
  }catch(e){
    D.tasks=D.tasks.filter(t=>t.id!==task.id);
    toast('Failed to create task. Please try again.','error');
  }
}
async function addGoal(){
  if(!canWrite()){toast('You do not have permission to add goals.','error');return;}
  const title=document.getElementById('ng-t').value.trim();
  if(!title){toast('Title is required','error');return;}
  const goal={id:uid(),title,category:document.getElementById('ng-c').value,target:+document.getElementById('ng-tg').value,current:+document.getElementById('ng-cu').value,unit:document.getElementById('ng-u').value};
  D.goals.push(goal);
  try{
    await saveData();
    closeM(null,document.getElementById('m-addgoal'));document.getElementById('ng-t').value='';renderTasks();toast('Goal added','success');
  }catch(e){
    D.goals=D.goals.filter(g=>g.id!==goal.id);
    toast('Failed to add goal. Please try again.','error');
  }
}
function exportNote(id){
  const n=(D.notes||[]).find(x=>x.id===id);
  if(!n){toast('Note not found','error');return;}
  const w=window.open('','_blank','width=900,height=800');
  w.document.write(_buildExportHtml([n],false));
  w.document.close();
  setTimeout(()=>w.print(),600);
}

function _buildExportHtml(notes,withCover){
  const tn={chapter:'Chapter',exec:'Executive',committee:'Committee',judicial:'Judicial',retreat:'Retreat'};
  const bc={chapter:'#0c1d56',exec:'#4f46e5',committee:'#d97706',judicial:'#dc2626',retreat:'#16a34a'};
  const today=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const eh=s=>s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):'';

  function secHtml(label,text){
    if(!text)return'';
    const lines=text.split('\n').filter(Boolean);
    return`<div class="sec-t">${label}</div><div class="sec-b">${lines.map(l=>`<div class="bl">${l.startsWith('•')||l.startsWith('-')?eh(l):'• '+eh(l)}</div>`).join('')}</div>`;
  }

  function noteHtml(n,isLast){
    const typeName=tn[n.type]||n.type||'Chapter';
    const badgeColor=bc[n.type]||'#0c1d56';
    const dateStr=n.date?new Date(n.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'';
    const offs=(n.officerReports||[]).filter(r=>r.notes);
    const honors=[];
    if(n.ooh)honors.push({icon:'🏆',label:'OOH of the Week',val:n.ooh});
    if(n.botw)honors.push({icon:'⭐',label:'Brother of the Week',val:n.botw});
    if(n.buffon)honors.push({icon:'🤡',label:'Buffon of the Week',val:n.buffon});
    return`<div class="nd${isLast?'':' pb'}">
      <div class="nh">
        <span class="nb" style="background:${badgeColor}">${typeName} Meeting</span>
        <div class="nt">${eh(n.title)}</div>
        <div class="nm">${dateStr?`<span>📅 ${dateStr}</span>`:''}${n.chapter?`<span>🏠 ${eh(n.chapter)}</span>`:''}</div>
      </div>
      ${offs.length?`<div class="sec-t">Officer Reports</div><table class="ot">${offs.map(r=>`<tr><td class="or">${eh(r.role)}</td><td class="on">${r.notes.split('\n').map(l=>`<div class="bl">${l.startsWith('•')||l.startsWith('-')?eh(l):'• '+eh(l)}</div>`).join('')}</td></tr>`).join('')}</table>`:''}
      ${secHtml('Announcements',n.announcements)}
      ${secHtml('Old Business',n.oldBusiness)}
      ${secHtml('New Business',n.newBusiness)}
      ${honors.length?`<div class="sec-t">Weekly Honors</div><div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${honors.map(h=>`<div style="border:1px solid #e5e5e3;border-radius:8px;padding:8px 14px;font-size:12px"><div style="font-size:16px;margin-bottom:2px">${h.icon}</div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b6b68;margin-bottom:3px">${h.label}</div><div style="font-weight:600">${eh(h.val)}</div></div>`).join('')}</div>`:''}
    </div>`;
  }

  const cover=withCover?`<div style="background:#0c1d56;color:#fff;padding:48px 56px;margin-bottom:32px;border-radius:12px;page-break-after:always">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;opacity:.6;margin-bottom:12px">OpsCore — Meeting Notes Export</div>
    <div style="font-size:30px;font-weight:700;line-height:1.2;margin-bottom:10px">${notes.length} Meeting Note${notes.length!==1?'s':''}</div>
    <div style="opacity:.75;font-size:13px">Exported ${today}</div>
  </div>`:'';

  return`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Meeting Notes</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Georgia,serif;margin:0;padding:48px 56px;font-size:13px;color:#1a1a18;line-height:1.65;background:#fff;max-width:860px;margin:0 auto}
    .nd{margin-bottom:40px}.pb{page-break-after:always}
    .nh{background:#0c1d56;color:#fff;padding:24px 28px;border-radius:10px;margin-bottom:20px}
    .nb{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.2);margin-bottom:10px}
    .nt{font-size:22px;font-weight:700;line-height:1.2;margin-bottom:8px}
    .nm{display:flex;gap:18px;font-size:11px;opacity:.8;flex-wrap:wrap}
    .sec-t{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b6b68;margin-top:20px;margin-bottom:8px;border-top:1px solid #e5e5e3;padding-top:14px}
    .sec-b{margin-bottom:4px}.bl{margin-bottom:3px;padding-left:4px}
    .ot{width:100%;border-collapse:collapse;margin-bottom:4px}
    .or{font-size:10.5px;font-weight:700;color:#444;padding:5px 10px 5px 0;vertical-align:top;white-space:nowrap;width:140px;border-bottom:1px solid #f0f0ee}
    .on{padding:5px 0;font-size:11.5px;border-bottom:1px solid #f0f0ee;vertical-align:top}
    @media print{body{padding:24px}@page{margin:.75in}}
  </style></head><body>
  ${cover}${notes.map((n,i)=>noteHtml(n,i===notes.length-1)).join('')}
  </body></html>`;
}

function openAddNote(){
  // Populate officer reports list from current exec members
  const officers=D.members.filter(m=>m.role!=='Member');
  document.getElementById('mn-officers-list').innerHTML=officers.map(o=>`
    <div style="display:flex;align-items:flex-start;gap:8px">
      <div style="flex-shrink:0;padding-top:2px">
        <div class="sh-av" style="width:24px;height:24px;font-size:8px">${o.initials}</div>
      </div>
      <div style="flex:1">
        <div style="font-size:11.5px;font-weight:500;margin-bottom:3px">${o.role} — ${o.name}</div>
        <textarea id="mn-off-${o.id}" style="width:100%;height:36px;padding:5px 8px;border:1px solid var(--bdr);border-radius:6px;font-size:11.5px;font-family:inherit;resize:vertical;outline:none;transition:border .1s" placeholder="• Report notes..." onfocus="this.style.borderColor='var(--navy)'" onblur="this.style.borderColor='var(--bdr)'"></textarea>
      </div>
    </div>`).join('');
  openM('m-addnote');
}

async function addNote(){
  if(!canWrite()){toast('You do not have permission to add meeting notes.','error');return;}
  const title=document.getElementById('mn-t').value.trim();
  if(!title){toast('Meeting title is required','error');return;}
  const authorId=CURRENT_USER?CURRENT_USER.mid:null;
  const date=document.getElementById('mn-d').value||new Date().toISOString().split('T')[0];
  const chapter=document.getElementById('mn-chapter').value.trim()||'Alpha Tau Omega - Beta Chapter Chapter';

  // Collect officer reports
  const officers=D.members.filter(m=>m.role!=='Member');
  const officerReports=officers.map(o=>{
    const el=document.getElementById('mn-off-'+o.id);
    return{role:o.role,name:o.name,notes:el?el.value.trim():''};
  });

  const note={
    id:uid(),
    title,
    type:document.getElementById('mn-tp').value,
    date,
    chapter,
    officerReports,
    announcements:document.getElementById('mn-announcements').value.trim(),
    oldBusiness:document.getElementById('mn-oldbiz').value.trim(),
    newBusiness:document.getElementById('mn-newbiz').value.trim(),
    ooh:document.getElementById('mn-ooh').value.trim(),
    botw:document.getElementById('mn-botw').value.trim(),
    buffon:document.getElementById('mn-buffon').value.trim(),
    actions:document.getElementById('mn-a').value.split('\n').filter(Boolean),
    author:authorId,
    // Legacy body field — generated from structured data for compatibility
    body:''
  };
  note.body=buildNoteBody(note);

  D.notes.unshift(note);
  try{
    await saveData();
    closeM(null,document.getElementById('m-addnote'));
    ['mn-t','mn-announcements','mn-oldbiz','mn-newbiz','mn-ooh','mn-botw','mn-buffon','mn-a'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('mn-chapter').value='Alpha Tau Omega - Beta Chapter Chapter';
    renderNotes();
    toast('Meeting note saved','success');
  }catch(e){
    D.notes=D.notes.filter(n=>n.id!==note.id);
    toast('Failed to save note. Please try again.','error');
  }
}

function buildNoteBody(note){
  // Build a plain-text summary for preview/search purposes
  let parts=[];
  if(note.announcements)parts.push('Announcements: '+note.announcements);
  if(note.oldBusiness)parts.push('Old Business: '+note.oldBusiness);
  if(note.newBusiness)parts.push('New Business: '+note.newBusiness);
  if(note.ooh)parts.push('OOH: '+note.ooh);
  if(note.botw)parts.push('Brother of the Week: '+note.botw);
  if(note.buffon)parts.push('Buffon: '+note.buffon);
  return parts.join(' | ');
}
function addCase(){
  const desc=document.getElementById('nc-d').value.trim();
  if(!desc){toast('Description is required','error');return;}
  const filedBy=CURRENT_USER?CURRENT_USER.mid:null;
  D.cases.push({id:uid(),caseNum:'CASE-0'+String(D.cases.length+10),type:document.getElementById('nc-t').value,member:document.getElementById('nc-m').value,desc,status:document.getElementById('nc-s').value,hearingDate:document.getElementById('nc-h').value,resolution:'',filedBy});
  saveData();closeM(null,document.getElementById('m-addcase'));document.getElementById('nc-d').value='';renderJudicial();toast('Case filed','success');
}
function addShift(){
  if(!canEditSober()){toast('Only the President, Vice President, and Risk Manager can add shifts.','error');return;}
  const ev=document.getElementById('ns-e').value.trim();
  if(!ev){toast('Event name is required','error');return;}
  D.shifts.push({id:uid(),event:ev,date:document.getElementById('ns-d').value,start:document.getElementById('ns-st').value,end:document.getElementById('ns-en').value,memberId:document.getElementById('ns-m').value||null,confirmed:false,noShow:false});
  saveData();closeM(null,document.getElementById('m-addshift'));document.getElementById('ns-e').value='';renderSober();toast('Shift added','success');
}
function addComm(){
  if(!canEditMembers()){toast('Only the President, Vice President, and Secretary can add committees.','error');return;}
  const name=document.getElementById('nco-n').value.trim();
  if(!name){toast('Name is required','error');return;}
  D.committees.push({id:uid(),name,desc:document.getElementById('nco-d').value,chair:document.getElementById('nco-c').value,members:[]});
  saveData();closeM(null,document.getElementById('m-addcomm'));document.getElementById('nco-n').value='';renderCommittees();toast('Committee created','success');
}
function addTrans(){
  const role=document.getElementById('ntr-r').value.trim();
  if(!role){toast('Role is required','error');return;}
  D.transitions.push({id:uid(),role,outgoing:document.getElementById('ntr-o').value||null,incoming:null,content:document.getElementById('ntr-c').value,status:document.getElementById('ntr-s').value});
  saveData();closeM(null,document.getElementById('m-addtrans'));document.getElementById('ntr-r').value='';renderTransition();toast('Transition doc added','success');
}
function toggleTask(id){if(!canWrite()){toast('You do not have permission to update tasks.','error');return;}const t=D.tasks.find(t=>t.id===id);if(t){t.status=t.status==='done'?'todo':'done';saveData();renderDash();renderTasks();}}

// ── EDIT TASK ──
function openEditTask(id){
  const t=D.tasks.find(t=>t.id===id);if(!t)return;
  const el=document.getElementById('m-edittask');
  el.querySelectorAll('select[id="et-a"]').forEach(s=>{s.innerHTML=memberSelectOptions();});
  document.getElementById('et-id').value=id;
  document.getElementById('et-t').value=t.title;
  document.getElementById('et-a').value=t.assignedTo;
  document.getElementById('et-p').value=t.priority;
  document.getElementById('et-d').value=t.dueDate||'';
  document.getElementById('et-s').value=t.status;
  document.getElementById('et-ds').value=t.desc||'';
  el.classList.add('open');
}
async function saveTask(){
  if(!canWrite()){toast('You do not have permission to edit tasks.','error');return;}
  const id=document.getElementById('et-id').value;
  const t=D.tasks.find(t=>t.id===id);if(!t)return;
  const title=document.getElementById('et-t').value.trim();
  if(!title){toast('Title is required','error');return;}
  const prev={title:t.title,assignedTo:t.assignedTo,priority:t.priority,dueDate:t.dueDate,status:t.status,desc:t.desc};
  t.title=title;t.assignedTo=document.getElementById('et-a').value;
  t.priority=document.getElementById('et-p').value;t.dueDate=document.getElementById('et-d').value;
  t.status=document.getElementById('et-s').value;t.desc=document.getElementById('et-ds').value;
  try{
    await saveData();
    closeM(null,document.getElementById('m-edittask'));renderTasks();renderDash();toast('Task saved','success');
  }catch(e){
    Object.assign(t,prev);
    toast('Failed to save task. Please try again.','error');
  }
}
async function deleteTask(id){
  if(!canWrite()){toast('You do not have permission to delete tasks.','error');return;}
  const ok=await confirmDialog('Delete Task','Are you sure you want to delete this task? This cannot be undone.');
  if(!ok)return;
  const removed=D.tasks.find(t=>t.id===id);
  D.tasks=D.tasks.filter(t=>t.id!==id);
  try{
    await saveData();
    closeM(null,document.getElementById('m-edittask'));renderTasks();renderDash();toast('Task deleted','info');
  }catch(e){
    if(removed)D.tasks.push(removed);
    toast('Failed to delete task. Please try again.','error');
  }
}

// ── EDIT MEMBER ──
function openEditMember(id){
  const m=D.members.find(m=>m.id===id);if(!m)return;
  const el=document.getElementById('m-editmember');
  document.getElementById('em-id').value=id;
  document.getElementById('em-n').value=m.name;
  // email/phone not shown in UI for privacy
  document.getElementById('em-y').value=m.year;
  document.getElementById('em-c').value=m.classYear;
  document.getElementById('em-l').value=m.liveIn?'1':'0';
  document.getElementById('em-r').value=m.role;
  el.classList.add('open');
}
async function saveMember(){
  if(!canEditMembers()){toast('Only the President, Vice President, and Secretary can edit members.','error');return;}
  const id=document.getElementById('em-id').value;
  const m=D.members.find(m=>m.id===id);if(!m)return;
  const name=document.getElementById('em-n').value.trim();
  if(!name){toast('Name is required','error');return;}
  const prev={name:m.name,year:m.year,classYear:m.classYear,liveIn:m.liveIn,role:m.role,initials:m.initials};
  m.name=name;m.year=+document.getElementById('em-y').value;
  m.classYear=document.getElementById('em-c').value;m.liveIn=document.getElementById('em-l').value==='1';
  m.role=document.getElementById('em-r').value;
  m.initials=name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  try{
    await saveData();
    closeM(null,document.getElementById('m-editmember'));renderMembers();toast('Member saved','success');
  }catch(e){
    Object.assign(m,prev);
    toast('Failed to save member. Please try again.','error');
  }
}
async function deleteMember(id){
  if(!canEditMembers()){toast('Only the President, Vice President, and Secretary can remove members.','error');return;}
  const ok=await confirmDialog('Remove Member','Are you sure you want to remove this member? This cannot be undone.');
  if(!ok)return;
  const removed=D.members.find(m=>m.id===id);
  D.members=D.members.filter(m=>m.id!==id);
  try{
    await saveData();
    closeM(null,document.getElementById('m-editmember'));renderMembers();toast('Member removed','info');
  }catch(e){
    if(removed)D.members.push(removed);
    toast('Failed to remove member. Please try again.','error');
  }
}

// ── RESOLVE CASE ──
function openResolveCase(id){
  const c=D.cases.find(c=>c.id===id);if(!c)return;
  document.getElementById('rc-id').value=id;
  document.getElementById('rc-r').value=c.resolution||'';
  document.getElementById('rc-s').value=c.status==='resolved'||c.status==='dismissed'?c.status:'resolved';
  document.getElementById('m-resolvecase').classList.add('open');
}
function resolveCase(){
  if(!canWrite()){toast('You do not have permission to resolve cases.','error');return;}
  const id=document.getElementById('rc-id').value;
  const c=D.cases.find(c=>c.id===id);if(!c)return;
  const res=document.getElementById('rc-r').value.trim();
  if(!res){toast('Resolution is required','error');return;}
  c.resolution=res;c.status=document.getElementById('rc-s').value;
  saveData();closeM(null,document.getElementById('m-resolvecase'));renderJudicial();toast('Case resolved','success');
}

// ── MARK ATTENDANCE ──
let _attTmp={};
function openMarkAttEv(evId){
  if(!canEditAttendance()){toast('Only the President, Vice President, and Secretary can mark attendance.','error');return;}
  const ev=D.events.find(e=>e.id===evId);if(!ev)return;
  document.getElementById('ma-evid').value=evId;
  document.getElementById('ma-title').textContent='Mark Attendance — '+ev.title+' ('+formatDateShort(ev.date)+')';
  _attTmp={...(D.attendance[evId]||{})};
  renderAttList();
  document.getElementById('m-markatt').classList.add('open');
}
function openMarkAtt(){
  if(!canEditAttendance()){toast('Only the President, Vice President, and Secretary can mark attendance.','error');return;}
  const past=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!past.length){toast('No past mandatory events to mark attendance for','info');return;}
  openMarkAttEv(past[0].id);
}
function renderAttList(){
  const evId=document.getElementById('ma-evid').value;
  document.getElementById('ma-list').innerHTML=D.members.map(m=>{
    const st=_attTmp[m.id]||'';
    const cls=st==='present'?'att-check present':st==='absent'?'att-check absent':st==='excused'?'att-check excused':'att-check';
    const lbl=st==='present'?'✓':st==='absent'?'✗':st==='excused'?'E':'';
    return`<div style="display:flex;align-items:center;gap:7px;padding:4px 0;cursor:pointer" onclick="cycleAtt('${m.id}')">
      <div class="${cls}" id="ac-${m.id}">${lbl}</div>
      <span style="font-size:12px">${m.name}</span>
    </div>`;
  }).join('');
}
function cycleAtt(mid){
  const cur=_attTmp[mid]||'';
  const next=cur===''?'present':cur==='present'?'absent':cur==='absent'?'excused':'';
  if(next==='')delete _attTmp[mid];else _attTmp[mid]=next;
  const el=document.getElementById('ac-'+mid);
  if(el){el.className=next==='present'?'att-check present':next==='absent'?'att-check absent':next==='excused'?'att-check excused':'att-check';el.textContent=next==='present'?'✓':next==='absent'?'✗':next==='excused'?'E':'';}
}
function saveAttendance(){
  if(!canEditAttendance()){toast('Only the President, Vice President, and Secretary can mark attendance.','error');return;}
  const evId=document.getElementById('ma-evid').value;
  if(!evId){toast('No event selected.','error');return;}
  if(!D.attendance)D.attendance={};
  D.attendance[evId]=_attTmp;
  saveData();closeM(null,document.getElementById('m-markatt'));renderAttendance();renderDash();toast('Attendance saved','success');
}

// ── EDIT COMMITTEE ──
function openEditComm(id){
  const c=D.committees.find(c=>c.id===id);if(!c)return;
  const el=document.getElementById('m-editcomm');
  document.getElementById('eco-id').value=id;
  document.getElementById('eco-n').value=c.name;
  document.getElementById('eco-d').value=c.desc||'';
  const msel=document.getElementById('eco-c');msel.innerHTML=memberSelectOptions();msel.value=c.chair;
  document.getElementById('eco-members').innerHTML=D.members.map(m=>`<label style="display:flex;align-items:center;gap:5px;font-size:12px;padding:2px 0;cursor:pointer"><input type="checkbox" value="${m.id}" ${(c.members||[]).includes(m.id)?'checked':''}>${m.name}</label>`).join('');
  el.classList.add('open');
}
function saveComm(){
  if(!canEditMembers()){toast('Only the President, Vice President, and Secretary can edit committees.','error');return;}
  const id=document.getElementById('eco-id').value;
  const c=D.committees.find(c=>c.id===id);if(!c)return;
  const name=document.getElementById('eco-n').value.trim();
  if(!name){toast('Name is required','error');return;}
  c.name=name;c.desc=document.getElementById('eco-d').value;c.chair=document.getElementById('eco-c').value;
  c.members=[...document.getElementById('eco-members').querySelectorAll('input:checked')].map(cb=>cb.value);
  saveData();closeM(null,document.getElementById('m-editcomm'));renderCommittees();toast('Committee saved','success');
}
async function deleteComm(id){
  if(!canEditMembers()){toast('Only the President, Vice President, and Secretary can delete committees.','error');return;}
  const ok=await confirmDialog('Delete Committee','Are you sure you want to delete this committee?');
  if(!ok)return;
  D.committees=D.committees.filter(c=>c.id!==id);
  saveData();closeM(null,document.getElementById('m-editcomm'));renderCommittees();toast('Committee deleted','info');
}

// ── EDIT TRANSITION ──
function openEditTrans(id){
  const t=D.transitions.find(t=>t.id===id);if(!t)return;
  const el=document.getElementById('m-edittrans');
  document.getElementById('etr-id').value=id;
  document.getElementById('etr-r').value=t.role;
  document.getElementById('etr-c').value=t.content||'';
  document.getElementById('etr-s').value=t.status;
  const o=document.getElementById('etr-o');o.innerHTML='<option value="">— Unassigned —</option>'+memberSelectOptions();o.value=t.outgoing||'';
  const i=document.getElementById('etr-i');i.innerHTML='<option value="">— TBD —</option>'+memberSelectOptions();i.value=t.incoming||'';
  el.classList.add('open');
}
function saveTrans(){
  if(!canWrite()){toast('You do not have permission to edit transition documents.','error');return;}
  const id=document.getElementById('etr-id').value;
  const t=D.transitions.find(t=>t.id===id);if(!t)return;
  const role=document.getElementById('etr-r').value.trim();
  if(!role){toast('Role is required','error');return;}
  t.role=role;t.outgoing=document.getElementById('etr-o').value||null;
  t.incoming=document.getElementById('etr-i').value||null;
  t.content=document.getElementById('etr-c').value;t.status=document.getElementById('etr-s').value;
  saveData();closeM(null,document.getElementById('m-edittrans'));renderTransition();toast('Transition doc saved','success');
}

// ── DELETE FILE WITH CONFIRM ──
async function fiDelete(id){
  if(!canWrite()){toast('You do not have permission to delete files.','error');return;}
  const ok=await confirmDialog('Delete File','Are you sure you want to remove this file?');
  if(!ok)return;
  D.files=D.files.filter(f=>f.id!==id);
  delete FI_STORE[id];
  saveData();renderFiles();
  toast('File removed','info');
}

// ── UPDATE NOTIFICATION BADGES ──
function updateBadges(){
  const attendBadge=document.getElementById('attend-sb-badge');
  const jbBadge=document.getElementById('judicial-sb-badge');
  if(attendBadge){const lowAtt=D.members.filter(m=>getAttendanceRate(m.id)<75).length;attendBadge.textContent=lowAtt;attendBadge.style.display=lowAtt?'':'none';}
  if(jbBadge){const oc=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;jbBadge.textContent=oc;jbBadge.style.display=oc?'':'none';}
  autoGenerateNotifs();
}

// Auto-generate smart notifications from live data
function autoGenerateNotifs(){
  if(!D.notifs)D.notifs=[];
  const today=new Date().toISOString().split('T')[0];
  const existing=new Set(D.notifs.map(n=>n.autoKey||''));

  function pushAuto(autoKey,title,body,type='info',link=''){
    if(existing.has(autoKey))return;
    D.notifs.unshift({id:uid(),autoKey,title,body,type,link,read:false,date:today});
    existing.add(autoKey);
  }

  // Attendance: members below 75%
  const lowAtt=D.members.filter(m=>getAttendanceRate(m.id)<75);
  if(lowAtt.length){
    pushAuto('att_low_'+today,'Attendance Warning',`${lowAtt.length} member${lowAtt.length>1?'s':''} below 75%: ${lowAtt.slice(0,3).map(m=>m.name.split(' ')[0]).join(', ')}${lowAtt.length>3?'...':''}. Review required.`,'warning','attendance');
  }

  // Overdue tasks
  const ovT=D.tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='done');
  if(ovT.length){
    const top=ovT.sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]||2)-({urgent:0,high:1,medium:2,low:3}[b.priority]||2))[0];
    pushAuto('tasks_ov_'+today,'Overdue Tasks',`${ovT.length} task${ovT.length>1?'s':''} are past their due date. Highest priority: "${top.title}" (${top.priority}).`,'warning','tasks');
  }

  // Unassigned sober shifts
  const unassigned=D.shifts.filter(s=>isUpcoming(s.date)&&!s.memberId);
  if(unassigned.length){
    pushAuto('sober_unassigned_'+today,'Unassigned Sober Shifts',`${unassigned.length} upcoming shift${unassigned.length>1?'s':''} have no sober bro assigned. Next: ${formatDateShort(unassigned[0].date)}.`,'warning','sober');
  }

  // Open judicial cases
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status));
  if(openCases.length){
    pushAuto('jb_open_'+today,'Open Judicial Cases',`${openCases.length} case${openCases.length>1?'s':''} require attention. Access the Judicial Board to review.`,'info','judicial');
  }

  // Dues: unpaid members
  const dues=D.finance.dues||{};
  const unpaidCount=D.members.filter(m=>(dues[m.id]?.status||'Partial')!=='Paid').length;
  if(unpaidCount>D.members.length*0.3){
    pushAuto('dues_unpaid_'+today,'Dues Collection Alert',`${unpaidCount} members (${Math.round(unpaidCount/D.members.length*100)}%) have not paid semester dues. Follow up required.`,'warning','finance');
  }

  // Upcoming mandatory events (within 3 days)
  const soon=D.events.filter(e=>e.mandatory&&isUpcoming(e.date)).filter(e=>{const d=Math.round((new Date(e.date+'T12:00:00')-new Date())/86400000);return d<=3&&d>=0;});
  soon.forEach(e=>{
    const days=Math.round((new Date(e.date+'T12:00:00')-new Date())/86400000);
    pushAuto('ev_soon_'+e.id,'Mandatory Event Soon',`"${e.title}" is ${days===0?'today':days===1?'tomorrow':'in '+days+' days'}${e.location?' at '+e.location:''}.`,'info','calendar');
  });

  // Trim auto-notifs older than 14 days to prevent bloat
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-14);
  D.notifs=D.notifs.filter(n=>!n.autoKey||new Date(n.date+'T12:00:00')>cutoff);

  // Keep max 50 notifs total
  if(D.notifs.length>50)D.notifs=D.notifs.slice(0,50);
  saveData();
}

function confirmShift(id){if(!canWrite()){toast('You do not have permission to confirm shifts.','error');return;}const s=D.shifts.find(s=>s.id===id);if(s){s.confirmed=!s.confirmed;saveData();renderSober();}}
function markRead(){if(!D.notifs)return;D.notifs.forEach(n=>n.read=true);saveData();renderNotifications();}
function nRead(id){const n=D.notifs&&D.notifs.find(n=>n.id===id);if(n){n.read=true;saveData();renderNotifications();}}
function saveProf(){
  if(!canWrite()){toast('You do not have permission to edit settings.','error');return;}
  D.settings.name=document.getElementById('se-name').value;
  D.settings.year=+document.getElementById('se-year').value;
  D.settings.classYear=document.getElementById('se-class').value;
  saveData();
  const ini=D.settings.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('u-name').textContent=D.settings.name;
  document.getElementById('u-av').textContent=ini;document.getElementById('tb-av').textContent=ini;
  toast('Profile saved','success');
}
function toggleSetting(k,el){D.settings[k]=!D.settings[k];el.className='tgl '+(D.settings[k]?'on':'off');saveData();}
function handleSI(input){
  if(!canWrite()){toast('You do not have permission to import shifts.','error');return;}
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=function(e){
    const lines=e.target.result.split('\n').filter(Boolean);
    let added=0;
    lines.slice(1).forEach(line=>{
      const cols=line.split(',').map(s=>s.trim().replace(/^"|"$/g,''));
      if(cols.length>=4&&cols[0]&&cols[1]){
        const memberMatch=D.members.find(m=>m.name.toLowerCase().includes((cols[4]||'').toLowerCase())&&cols[4]);
        D.shifts.push({id:uid(),event:cols[0],date:cols[1],start:cols[2]||'22:00',end:cols[3]||'02:00',memberId:memberMatch?memberMatch.id:null,confirmed:false,noShow:false});
        added++;
      }
    });
    if(added){saveData();renderSober();toast(added+' shift'+(added>1?'s':'')+' imported','success');closeM(null,document.getElementById('m-simport'));}
    else{document.getElementById('si-prev').innerHTML=`<div class="bnr danger"><i class="ti ti-alert-circle" style="font-size:13px"></i>Could not parse file. Expected columns: Event, Date, Start, End, Member</div>`;}
  };
  reader.readAsText(f);
}
function filterA(){const q=document.getElementById('a-search').value.toLowerCase();document.querySelectorAll('#a-table tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none');}
function filterN(){const q=document.getElementById('n-search').value.toLowerCase();document.querySelectorAll('#notes-g>div').forEach(el=>el.style.display=el.textContent.toLowerCase().includes(q)?'':'none');}
function filterM(){const q=document.getElementById('m-search').value.toLowerCase();document.querySelectorAll('#m-table tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none');}
function xport(type){
  let data='',fn='export.csv';
  if(type==='members'){data='Name,Class Year,Grad Year,Role,Live-In\n';D.members.forEach(m=>{data+=m.name+','+m.classYear+','+m.year+','+m.role+','+(m.liveIn?'Yes':'No')+'\n';});fn='members.csv';}
  else if(type==='attendance'){data='Member,Attendance Rate\n';D.members.forEach(m=>{data+=m.name+','+getAttendanceRate(m.id)+'%\n';});fn='attendance.csv';}
  else if(type==='finance'){
    const dues=D.finance.dues||{};
    data='Member,Class,Amount Owed,Paid,Balance,Status\n';
    D.members.forEach(m=>{const d=dues[m.id]||{};const owed=d.semesterDues||getSemDues(m.id);const paid=d.paid||0;data+=`"${m.name}",${m.classYear},${owed},${paid},${owed-paid},${d.status||'Partial'}\n`;});
    fn='dues.csv';
  }
  else if(type==='academics'){
    data='Member,Class,Cumulative GPA,Last Semester GPA\n';
    D.members.forEach(m=>{const g=D.academics.gpas[m.id]||{};data+=`"${m.name}",${m.classYear},${g.cumulativeGpa||''},${g.priorGpa||''}\n`;});
    fn='academics.csv';
  }
  else if(type==='recruitment'){
    data='Name,Stage,Major,Hometown,Bid Score,Last Contact,Recruiter\n';
    (D.recruitment.rushees||[]).forEach(r=>{const rec=getMember(r.recruiter);data+=`"${r.name}","${r.stage}","${r.major||''}","${r.hometown||''}",${r.bidScore||0},${r.lastContact||''},"${rec.name||''}"\n`;});
    fn='recruitment.csv';
  }
  else if(type==='all'){const blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ato_ops_data.json';a.click();return;}
  const blob=new Blob([data],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;a.click();
}

function kpi(label,val,sub,trend){
  const up=trend==='up',dn=trend==='down';
  const c=up?'var(--gn)':dn?'var(--rd)':'var(--mt)';
  const ico=up?'<i class="ti ti-trending-up" style="font-size:10px"></i>':dn?'<i class="ti ti-trending-down" style="font-size:10px"></i>':'';
  const border=up?'border-top:2px solid var(--gn)':dn?'border-top:2px solid var(--rd)':'border-top:2px solid transparent';
  return`<div class="card" style="${border}"><div class="kl">${label}</div><div class="kv">${val}</div><div class="ks" style="color:${c}">${ico}${ico?' ':''}<span>${sub}</span></div></div>`;
}

// ── SKELETON & EMPTY STATE HELPERS ──
function skKpi(n=4){return Array(n).fill(0).map(()=>`<div class="sk-kpi"><div class="sk sk-line w50"></div><div class="sk sk-kpi-val"></div><div class="sk sk-line w30"></div></div>`).join('');}
function skRows(n=5,cols=4){const cw=cols===4?'2fr 1fr 1fr 1fr':cols===3?'2fr 1fr 1fr':'2fr 1fr';return`<div style="padding:6px 0">${Array(n).fill(0).map(()=>`<div class="sk-table-row" style="grid-template-columns:${cw}">${Array(cols).fill(0).map((c,i)=>`<div class="sk sk-line ${i===0?'w90':i===1?'w70':i===2?'w50':'w30'}"></div>`).join('')}</div>`).join('')}</div>`;}
function skCards(n=3){return Array(n).fill(0).map(()=>`<div class="sk-card"><div class="sk sk-line w60" style="height:13px;margin-bottom:9px"></div><div class="sk sk-line w90"></div><div class="sk sk-line w70"></div></div>`).join('');}
function skCalendar(){const cells=Array(35).fill(0).map(()=>`<div class="sk-cal-cell"><div class="sk sk-line w30" style="height:9px;margin-bottom:5px"></div>${Math.random()>.6?`<div class="sk sk-cal-pip sk w80"></div>`:''}${Math.random()>.75?`<div class="sk sk-cal-pip sk w60"></div>`:''}</div>`).join('');return`<div style="display:grid;grid-template-columns:repeat(7,1fr)">${cells}</div>`;}
function skRows2(n=4){return Array(n).fill(0).map(()=>`<div class="sk-row"><div class="sk sk-av"></div><div style="flex:1"><div class="sk sk-line w70"></div><div class="sk sk-line w40" style="margin-top:5px"></div></div></div>`).join('');}

function es(icon,iconClass,title,sub,btnHtml=''){
  return`<div class="es"><div class="es-icon ${iconClass}"><i class="ti ${icon}"></i></div><div class="es-title">${title}</div><div class="es-sub">${sub}</div>${btnHtml}</div>`;
}

function withSkeleton(containerId,skHtml,renderFn,delay=0){
  const el=document.getElementById(containerId);
  if(el&&!el._hasData){el.innerHTML=skHtml;}
  if(delay){setTimeout(()=>{renderFn();if(el)el._hasData=true;},delay);}
  else{renderFn();if(el)el._hasData=true;}
}

function showPageSkeleton(pageId,slots){
  slots.forEach(({id,html})=>{const el=document.getElementById(id);if(el&&!el._hasData)el.innerHTML=html;});
}

