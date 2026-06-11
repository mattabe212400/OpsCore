/* OpsCore 2.0 Demo — Tasks, Goals & Notes */
function renderTasks(){
  const dn=D.tasks.filter(t=>t.status==='done').length;const ov=D.tasks.filter(t=>isOv(t.dueDate)&&t.status!=='done').length;
  const tot=D.tasks.length;
  document.getElementById('t-kpi').innerHTML=kpi('Total tasks',tot,'This semester','neutral')+kpi('Complete',dn,(tot?Math.round(dn/tot*100):0)+'% rate',dn>0?'up':'neutral')+kpi('In progress',D.tasks.filter(t=>t.status==='in_progress').length,'Active','neutral')+kpi('Overdue',ov,ov>0?'Action needed':'None',ov>0?'down':'neutral');
  document.getElementById('t-goals').innerHTML=D.goals.map(g=>{const p=Math.min(pc(g.current,g.target),100);return`<div style="position:relative"><div style="display:flex;justify-content:space-between;margin-bottom:4px;padding-right:22px"><span style="font-size:12px;font-weight:500">${g.title}</span><span style="font-size:11px;color:var(--mt)">${g.current}/${g.target} ${g.unit}</span></div><div class="pb" style="height:5px"><div class="pf" style="width:${p}%;background:${pgc(p)}"></div></div><button class="ib" style="position:absolute;top:0;right:0;width:20px;height:20px;font-size:10px;color:var(--ht)" onclick="deleteGoal('${g.id}')" title="Delete goal"><i class="ti ti-x"></i></button></div>`;}).join('')||es('ti-target','amber','No goals yet','Set semester goals to track your chapter\'s progress.',`<button class="btn" onclick="openM('m-addgoal')"><i class="ti ti-plus"></i>Add Goal</button>`);
  const pcl={urgent:'br2',high:'br2',medium:'ba2',low:'bm2'};const pln={urgent:'Urgent',high:'High',medium:'Med',low:'Low'};
  const cols=[{id:'todo',l:'To Do',k:'k1'},{id:'in_progress',l:'In Progress',k:'k2'},{id:'blocked',l:'Blocked',k:'k3'},{id:'done',l:'Done',k:'k4'}];
  document.getElementById('t-kb').innerHTML=cols.map(col=>{const items=D.tasks.filter(t=>t.status===col.id);return`<div class="kc"><div class="kh ${col.k}"><span style="font-size:12px;font-weight:500">${col.l}</span><span style="font-size:10.5px;color:var(--mt)">${items.length}</span></div><div class="kb2">${items.map(t=>`<div class="tk-card" onclick="openEditTask('${t.id}')"><div class="tk-ct">${t.title}</div><div class="tk-cm"><span class="badge ${pcl[t.priority]||'bm2'}">${pln[t.priority]||t.priority}</span>${t.dueDate?`<span style="font-size:9.5px;color:${isOv(t.dueDate)&&t.status!=='done'?'var(--rd)':'var(--ht)'}">${fds(t.dueDate)}</span>`:''}</div><div style="margin-top:5px;font-size:10px;color:var(--ht)">${mB(t.assignedTo).name}</div></div>`).join('')||'<div style="font-size:11px;color:var(--ht);text-align:center;padding:18px 0">Empty</div>'}</div></div>`;}).join('');
}

function renderNotes(){
  const tc={chapter:'bb2',exec:'bm2',committee:'ba2',judicial:'br2',retreat:'bg2'};
  const tn={chapter:'Chapter',exec:'Executive',committee:'Committee',judicial:'Judicial',retreat:'Retreat'};
  const notes=D.notes;
  if(!notes.length){
    document.getElementById('notes-g').innerHTML=`<div style="grid-column:1/-1">${es('ti-notes','blue','No meeting notes yet','Record your first chapter or exec meeting to get started.',`<button class="btn btn-p" onclick="openAddNote()"><i class="ti ti-plus"></i>New Note</button>`)}</div>`;
    return;
  }
  document.getElementById('notes-g').innerHTML=notes.map(n=>{
    const hasStructure=n.officerReports&&n.officerReports.length;
    const reportedOfficers=hasStructure?n.officerReports.filter(r=>r.notes):[];
    const highlights=[];
    if(n.ooh)highlights.push({icon:'🏆',label:'OOH',val:n.ooh});
    if(n.botw)highlights.push({icon:'⭐',label:'Brother',val:n.botw});
    if(n.buffon)highlights.push({icon:'🤡',label:'Buffon',val:n.buffon});
    return`<div class="card note-card" style="position:relative">
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:3px">
        <button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="event.stopPropagation();deleteNote('${n.id}')" title="Delete note"><i class="ti ti-trash"></i></button>
      </div>
      <div style="cursor:pointer" onclick="openNoteDetail('${n.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <span class="badge ${tc[n.type]||'bm2'}">${tn[n.type]||n.type}</span>
        <span style="font-size:10.5px;color:var(--ht);margin-right:22px">${fds(n.date)}</span>
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px;line-height:1.3">${n.title}</div>
      ${n.chapter?`<div style="font-size:10.5px;color:var(--mt);margin-bottom:9px">${n.chapter}</div>`:''}
      ${hasStructure?`<div style="font-size:10.5px;color:var(--mt);margin-bottom:8px;display:flex;align-items:center;gap:5px"><i class="ti ti-users" style="font-size:11px"></i>${n.officerReports.length} officer reports</div>`:''}
      ${highlights.length?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px">${highlights.map(h=>`<div style="background:#f5f5f3;border-radius:6px;padding:3px 8px;font-size:10.5px"><span style="margin-right:4px">${h.icon}</span><span style="color:var(--mt)">${h.label}:</span> <span style="font-weight:500">${h.val}</span></div>`).join('')}</div>`:''}
      ${n.announcements?`<div style="font-size:11px;color:var(--mt);line-height:1.5;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${n.announcements}</div>`:''}
      <div style="font-size:10px;color:var(--ht);border-top:1px solid var(--bdr);padding-top:7px;display:flex;justify-content:space-between;align-items:center">
        <span>${mB(n.author).name}</span>
        <span>${n.actions&&n.actions.length?n.actions.length+' action item'+(n.actions.length!==1?'s':''):''}</span>
      </div>
      </div>
    </div>`;
  }).join('');
}

async function deleteNote(id){
  if(!canWrite()){toast('You do not have permission to delete notes.','error');return;}
  const ok=await confirmDialog('Delete Note','Delete this meeting note? This cannot be undone.');
  if(!ok)return;
  const removed=D.notes.find(n=>n.id===id);
  D.notes=D.notes.filter(n=>n.id!==id);
  try{await saveD();renderNotes();toast('Note deleted','info');}
  catch(e){if(removed)D.notes.unshift(removed);toast('Failed to delete note. Please try again.','error');}
}
async function deleteGoal(id){
  if(!canWrite()){toast('You do not have permission to delete goals.','error');return;}
  const ok=await confirmDialog('Delete Goal','Remove this goal?');
  if(!ok)return;
  const removed=D.goals.find(g=>g.id===id);
  D.goals=D.goals.filter(g=>g.id!==id);
  try{await saveD();renderTasks();toast('Goal removed','info');}
  catch(e){if(removed)D.goals.push(removed);toast('Failed to remove goal. Please try again.','error');}
}
async function deleteShift(id){
  if(!canWrite()){toast('You do not have permission to delete shifts.','error');return;}
  const ok=await confirmDialog('Delete Shift','Remove this sober bro shift?');
  if(!ok)return;
  const removed=D.shifts.find(s=>s.id===id);
  D.shifts=D.shifts.filter(s=>s.id!==id);
  try{await saveD();renderSober();renderDash();toast('Shift removed','info');}
  catch(e){if(removed)D.shifts.push(removed);toast('Failed to remove shift. Please try again.','error');}
}
async function deleteCase(id){
  if(!canWrite()){toast('You do not have permission to delete cases.','error');return;}
  const ok=await confirmDialog('Delete Case','Permanently delete this judicial case?');
  if(!ok)return;
  const removed=D.cases.find(c=>c.id===id);
  D.cases=D.cases.filter(c=>c.id!==id);
  try{await saveD();renderJudicialContent();updateBadges();toast('Case deleted','info');}
  catch(e){if(removed)D.cases.push(removed);toast('Failed to delete case. Please try again.','error');}
}
async function deleteAlumni(id){
  if(!canWrite()){toast('You do not have permission to remove alumni.','error');return;}
  const ok=await confirmDialog('Remove Alumni','Remove this alumni from the directory?');
  if(!ok)return;
  const removed=D.alumni.contacts.find(a=>a.id===id);
  D.alumni.contacts=D.alumni.contacts.filter(a=>a.id!==id);
  try{await saveD();renderAlumni();toast('Alumni removed','info');}
  catch(e){if(removed)D.alumni.contacts.push(removed);toast('Failed to remove alumni. Please try again.','error');}
}
async function deleteRushee(id){
  if(!canWrite()){toast('You do not have permission to remove rushees.','error');return;}
  const ok=await confirmDialog('Remove Rushee','Remove this rushee from the CRM?');
  if(!ok)return;
  const removed=D.recruitment.rushees.find(r=>r.id===id);
  D.recruitment.rushees=D.recruitment.rushees.filter(r=>r.id!==id);
  try{await saveD();renderRecruitment();toast('Rushee removed','info');}
  catch(e){if(removed)D.recruitment.rushees.push(removed);toast('Failed to remove rushee. Please try again.','error');}
}
async function deletePhEvent(id){
  if(!canWrite()){toast('You do not have permission to delete philanthropy events.','error');return;}
  const ok=await confirmDialog('Delete Event','Delete this event?');
  if(!ok)return;
  const removed=D.philanthropy.events.find(e=>e.id===id);
  D.philanthropy.events=D.philanthropy.events.filter(e=>e.id!==id);
  try{await saveD();renderPhilanthropy();toast('Event deleted','info');}
  catch(e){if(removed)D.philanthropy.events.push(removed);toast('Failed to delete event. Please try again.','error');}
}
async function deletePhFunds(id){
  if(!canWrite()){toast('You do not have permission to delete fundraising entries.','error');return;}
  const ok=await confirmDialog('Delete Entry','Remove this fundraising entry?');
  if(!ok)return;
  const removed=(D.philanthropy.funds||[]).find(f=>f.id===id);
  D.philanthropy.funds=(D.philanthropy.funds||[]).filter(f=>f.id!==id);
  try{await saveD();renderPhilanthropy();toast('Entry removed','info');}
  catch(e){if(removed){if(!D.philanthropy.funds)D.philanthropy.funds=[];D.philanthropy.funds.push(removed);}toast('Failed to remove entry. Please try again.','error');}
}
async function deleteFineFn(id){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can delete fines.','error');return;}
  const ok=await confirmDialog('Delete Fine','Remove this fine record?');
  if(!ok)return;
  const fine=D.finance.fines.find(f=>f.id===id);
  const prevCount=fine&&D.finance.dues[fine.memberId]?D.finance.dues[fine.memberId].fineCount:null;
  if(fine&&D.finance.dues[fine.memberId])D.finance.dues[fine.memberId].fineCount=Math.max(0,(D.finance.dues[fine.memberId].fineCount||1)-1);
  D.finance.fines=D.finance.fines.filter(f=>f.id!==id);
  try{await saveD();finRenderFines();toast('Fine deleted','info');}
  catch(e){
    if(fine)D.finance.fines.unshift(fine);
    if(fine&&D.finance.dues[fine.memberId]&&prevCount!==null)D.finance.dues[fine.memberId].fineCount=prevCount;
    toast('Failed to delete fine. Please try again.','error');
  }
}
async function deleteExpense(id){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can delete expenses.','error');return;}
  const ok=await confirmDialog('Delete Expense','Remove this expense from the log?');
  if(!ok)return;
  const removed=D.finance.expenses.find(e=>e.id===id);
  D.finance.expenses=D.finance.expenses.filter(e=>e.id!==id);
  try{await saveD();finRenderBudget();finRenderOverview();toast('Expense deleted','info');}
  catch(e){if(removed)D.finance.expenses.unshift(removed);toast('Failed to delete expense. Please try again.','error');}
}
async function deletePlan(id){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can delete payment plans.','error');return;}
  const ok=await confirmDialog('Delete Plan','Remove this payment plan?');
  if(!ok)return;
  const removed=D.finance.plans.find(p=>p.id===id);
  D.finance.plans=D.finance.plans.filter(p=>p.id!==id);
  try{await saveD();finRenderPlans();toast('Plan deleted','info');}
  catch(e){if(removed)D.finance.plans.push(removed);toast('Failed to delete plan. Please try again.','error');}
}

function openNoteDetail(id){
  const n=D.notes.find(x=>x.id===id);
  const tc={chapter:'bb2',exec:'bm2',committee:'ba2',judicial:'br2',retreat:'bg2'};
  const tn={chapter:'Chapter',exec:'Executive',committee:'Committee',judicial:'Judicial',retreat:'Retreat'};
  const el=document.getElementById('m-notedetail');
  const body=document.getElementById('nd-body');

  function sec(title,content){
    if(!content)return'';
    const lines=content.split('\n').filter(Boolean);
    return`<div class="nd-section">
      <div class="nd-sec-title">${title}</div>
      <div class="nd-sec-body">${lines.map(l=>`<div class="nd-bullet">${l.startsWith('•')||l.startsWith('-')?l:'• '+l}</div>`).join('')}</div>
    </div>`;
  }

  let html=`
    <!-- Header -->
    <div class="nd-header">
      <div style="font-size:11px;color:var(--mt);margin-bottom:4px">${n.chapter||'Alpha Tau Omega - Beta Chapter Chapter'}</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">${n.title}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge ${tc[n.type]||'bm2'}">${tn[n.type]||n.type}</span>
        <span style="font-size:11px;color:var(--mt)">${fd(n.date)}</span>
        <span style="font-size:11px;color:var(--mt)">Recorded by ${mB(n.author).name}</span>
      </div>
    </div>`;

  // Officer Reports
  if(n.officerReports&&n.officerReports.length){
    html+=`<div class="nd-section">
      <div class="nd-sec-title">Officer Reports</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${n.officerReports.map(r=>`<div style="display:flex;gap:10px;align-items:flex-start">
          <div style="min-width:160px;max-width:160px;flex-shrink:0">
            <div style="font-size:11.5px;font-weight:600">${r.role}</div>
            <div style="font-size:10.5px;color:var(--mt)">${r.name}</div>
          </div>
          <div style="flex:1;font-size:11.5px;color:${r.notes?'var(--tx)':'var(--ht)'};line-height:1.6">${r.notes?r.notes.split('\n').map(l=>`<div>${l.startsWith('•')||l.startsWith('-')?l:'• '+l}</div>`).join(''):'<span style="font-style:italic">No report</span>'}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  html+=sec('Announcements',n.announcements);
  html+=sec('Old Business',n.oldBusiness);
  html+=sec('New Business',n.newBusiness);

  // Weekly Honors
  const honors=[];
  if(n.ooh)honors.push({icon:'🏆',label:'OOH of the Week',val:n.ooh});
  if(n.botw)honors.push({icon:'⭐',label:'Brother of the Week',val:n.botw});
  if(n.buffon)honors.push({icon:'🤡',label:'Buffon of the Week',val:n.buffon});
  if(honors.length){
    html+=`<div class="nd-section">
      <div class="nd-sec-title">Weekly Honors</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${honors.map(h=>`<div style="background:#f8f8f7;border-radius:8px;padding:11px;text-align:center">
          <div style="font-size:22px;margin-bottom:5px">${h.icon}</div>
          <div style="font-size:10px;font-weight:500;color:var(--mt);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">${h.label}</div>
          <div style="font-size:13px;font-weight:600">${h.val}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // Action Items
  if(n.actions&&n.actions.length){
    html+=`<div class="nd-section">
      <div class="nd-sec-title">Action Items</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${n.actions.map((a,i)=>`<div style="display:flex;align-items:flex-start;gap:8px">
          <div style="width:18px;height:18px;border:1.5px solid var(--bdr);border-radius:4px;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--mt)">${i+1}</div>
          <div style="font-size:12px;line-height:1.5">${a}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  body.innerHTML=html;
  el.classList.add('open');
}

// ── JUDICIAL BOARD PASSWORD ──
const JB_PW_HASH = ''; // password gate removed — access controlled by role/email
let JB_UNLOCKED = false;

// Judicial Board access: admin role OR explicitly allowed emails
// Add Lou's email to this list
const JB_ALLOWED_EMAILS = [
  'demo@example.com',   // Matt
  'demo2@example.com',   // Lou
];

function jbCanAccess(){
  if(!CURRENT_USER) return false;
  if(CURRENT_USER.role === 'admin' || CURRENT_USER.role === 'exec') return true;
  if(CURRENT_USER.role === 'President' || CURRENT_USER.role === 'Vice President') return true;
  if(JB_ALLOWED_EMAILS.includes((CURRENT_USER.email||'').toLowerCase())) return true;
  return false;
}

async function hashStr(s){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function jbUnlock(){
  // No-op — kept for any legacy HTML references
}

function jbLock(){
  JB_UNLOCKED=false;
  document.getElementById('jb-gate').style.display='block';
  document.getElementById('jb-content').style.display='none';
}

