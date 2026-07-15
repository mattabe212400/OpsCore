/* OpsCore 2.0 Demo — Social Events & Formal Planning */
// Events live in the shared D.events calendar (type:'social'), same pattern as Philanthropy —
// so Social always matches what's on the Calendar, not a separate copy.
// Rich planning data (venue/transportation/budget/checklist/etc.) lives in D.social.planning,
// keyed by the same event id. RSVPs live in D.social.rsvps (a plain array, since this demo has
// no real per-user backend to enforce a member-writes-only-their-own-doc rule).

function socFull(){ return !!CURRENT_USER && CURRENT_USER.role!=='viewer'; }
function socEvents(){ return (D.events||[]).filter(e=>e.type==='social'); }
function socToday(){ return new Date().toISOString().split('T')[0]; }

const SOC_EVENT_CATEGORIES = [
  {v:'date_party',  l:'Date Party'},
  {v:'exchange',     l:'Exchange'},
  {v:'mixer',        l:'Mixer'},
  {v:'formal',       l:'Formal'},
  {v:'semi_formal',  l:'Semi-Formal'},
  {v:'brotherhood',  l:'Brotherhood Event'},
  {v:'other',        l:'Other'},
];
const SOC_STATUSES = [
  {v:'idea',        l:'Idea',        c:'bm2'},
  {v:'planning',    l:'Planning',    c:'ba2'},
  {v:'confirmed',   l:'Confirmed',   c:'bb2'},
  {v:'rsvp_open',   l:'RSVP Open',   c:'bb2'},
  {v:'ready',       l:'Ready',       c:'bg2'},
  {v:'completed',   l:'Completed',   c:'bm2'},
  {v:'cancelled',   l:'Cancelled',   c:'br2'},
];
function socStatusLabel(v){ return (SOC_STATUSES.find(s=>s.v===v)||{}).l || v; }
function socStatusClass(v){ return (SOC_STATUSES.find(s=>s.v===v)||{}).c || 'bm2'; }
function socCatLabel(v){ return (SOC_EVENT_CATEGORIES.find(c=>c.v===v)||{}).l || v; }
function socIsFormalCat(cat){ return cat==='formal'||cat==='semi_formal'; }

// General members only see events that have actually opened up — not early-stage planning,
// which may still contain costs/vendor names not meant for the whole chapter yet.
const SOC_MEMBER_VISIBLE_STATUSES = ['rsvp_open','ready','completed'];

function socDefaultPlan(){
  return {
    status:'idea', eventCategory:'other',
    expectedAttendance:null, capacity:null, rsvpDeadline:null, actualAttendance:null,
    venue:{name:'',address:'',contact:'',phone:'',deposit:0,totalCost:0,confirmed:false,contractStatus:'not_started',notes:''},
    transportation:{required:false,provider:'',contact:'',pickupLocation:'',departureTime:'',returnTime:'',vehicleCount:0,capacity:0,cost:0,confirmed:false,notes:''},
    lodging:{required:false,hotel:'',contact:'',roomCount:0,bookingStatus:'not_started',cost:0,notes:''},
    catering:{provider:'',contact:'',serviceType:'',cost:0,confirmed:false,dietaryNotes:''},
    entertainment:{provider:'',contact:'',cost:0,confirmed:false,equipmentNeeds:'',notes:''},
    security:{provider:'',contact:'',staffCount:0,cost:0,confirmed:false,notes:''},
    checklist:[], budgetItems:[],
  };
}
// Always returns a fully-shaped plan (deep-merges saved data over the defaults) so a
// partially-saved or freshly-created event never crashes a render on a missing sub-object.
function socPlan(eventId){
  const saved = D.social.planning[eventId]||{};
  const base = socDefaultPlan();
  const merged = {...base, ...saved};
  ['venue','transportation','lodging','catering','entertainment','security'].forEach(k=>{ merged[k]={...base[k],...(saved[k]||{})}; });
  merged.checklist = saved.checklist||[];
  merged.budgetItems = saved.budgetItems||[];
  return merged;
}
function socSetPlan(eventId, updater){
  const cur = socPlan(eventId);
  D.social.planning[eventId] = updater(cur) || cur;
}

// ── READINESS SCORE ──
// Only counts checks that actually apply to this event (e.g. Transportation is excluded
// entirely, not penalized, if the event doesn't need it) — never a single opaque number
// without the list of what's actually missing.
function socReadiness(plan){
  const checks=[]; const missing=[];
  checks.push(plan.venue.confirmed?1:0); if(!plan.venue.confirmed) missing.push('Venue confirmation');
  const hasBudget = plan.budgetItems.length>0;
  checks.push(hasBudget?1:0); if(!hasBudget) missing.push('Budget approved (add at least one budget line)');
  if(plan.transportation.required){ checks.push(plan.transportation.confirmed?1:0); if(!plan.transportation.confirmed) missing.push('Transportation confirmation'); }
  if(plan.catering.provider){ checks.push(plan.catering.confirmed?1:0); if(!plan.catering.confirmed) missing.push('Catering confirmation'); }
  if(plan.checklist.length){
    const done=plan.checklist.filter(c=>c.done).length;
    checks.push(done/plan.checklist.length);
    if(done<plan.checklist.length) missing.push((plan.checklist.length-done)+' checklist item'+(plan.checklist.length-done!==1?'s':'')+' incomplete');
  }
  if(plan.status==='completed' && plan.actualAttendance==null) missing.push('Final attendance count');
  const score = checks.length ? Math.round(100*checks.reduce((a,b)=>a+b,0)/checks.length) : 0;
  return {score, missing};
}

// ── BUDGET TOTALS ──
function socBudgetTotals(plan){
  const est = plan.budgetItems.reduce((s,b)=>s+(parseFloat(b.estCost)||0),0);
  const actualPlanned = plan.budgetItems.reduce((s,b)=>s+(parseFloat(b.actualCost)||0),0);
  const actualLogged = (D.finance?.expenses||[]).filter(e=>e.eventId===plan._eventId).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  return {est, actualPlanned, actualLogged, actual: actualLogged||actualPlanned};
}

// ══════════════════════════════════════════════
// MAIN RENDER — branches by role
// ══════════════════════════════════════════════
let SOC_CURRENT_EVENT_ID = null;

function renderSocial(){
  const full = socFull();
  const fullEl = document.getElementById('soc-full-view');
  const memberEl = document.getElementById('soc-member-view');
  if(fullEl) fullEl.style.display = full ? '' : 'none';
  if(memberEl) memberEl.style.display = full ? 'none' : '';
  if(full){
    socShowList();
  } else {
    socRenderMemberView();
  }
}

// ── LIST / OVERVIEW ──
function socShowList(){
  document.getElementById('soc-list-view').style.display='';
  document.getElementById('soc-detail-view').style.display='none';
  socRenderKpis();
  socRenderAlerts();
  socRenderEventList();
  socRenderVendorsTable();
}

function socRenderKpis(){
  const events = socEvents();
  const now = socToday();
  const upcoming = events.filter(e=>e.date>=now && socPlan(e.id).status!=='cancelled');
  const thisTermCount = events.length;
  let totalBudget=0, totalRemaining=0, attSum=0, attN=0, needsAction=0;
  events.forEach(e=>{
    const plan = socPlan(e.id); plan._eventId=e.id;
    const tot = socBudgetTotals(plan);
    totalBudget += tot.est;
    totalRemaining += Math.max(0, tot.est - tot.actual);
    if(plan.actualAttendance!=null){ attSum+=plan.actualAttendance; attN++; }
    const r = socReadiness(plan);
    if(e.date>=now && plan.status!=='cancelled' && plan.status!=='completed' && r.missing.length) needsAction++;
  });
  document.getElementById('soc-kpi').innerHTML =
    kpi('Upcoming Events', upcoming.length, 'On the calendar', 'neutral') +
    kpi('Events This Term', thisTermCount, 'All social events', 'neutral') +
    kpi('Total Planned Budget', '$'+Math.round(totalBudget).toLocaleString(), 'Across all events', 'neutral') +
    kpi('Budget Remaining', '$'+Math.round(totalRemaining).toLocaleString(), 'Not yet spent', totalRemaining<0?'down':'neutral') +
    kpi('Avg Attendance', attN?Math.round(attSum/attN):'—', attN?'Completed events':'No completed events yet', 'neutral') +
    kpi('Needs Action', needsAction, needsAction?'Missing required planning items':'All caught up', needsAction?'down':'up');
}

function socRenderAlerts(){
  const el = document.getElementById('soc-alerts'); if(!el) return;
  const now = socToday();
  const alerts = [];
  socEvents().forEach(e=>{
    if(e.date<now) return;
    const plan = socPlan(e.id); plan._eventId=e.id;
    if(plan.status==='cancelled'||plan.status==='completed') return;
    if(!plan.venue.name) alerts.push({e,text:'Venue not selected',icon:'ti-map-pin'});
    else if(!plan.venue.confirmed) alerts.push({e,text:'Venue not confirmed',icon:'ti-map-pin'});
    if(plan.transportation.required && !plan.transportation.confirmed) alerts.push({e,text:'Transportation not confirmed',icon:'ti-bus'});
    const tot = socBudgetTotals(plan);
    if(tot.actual > tot.est && tot.est>0) alerts.push({e,text:'Budget exceeded',icon:'ti-alert-triangle'});
    if(plan.rsvpDeadline){ const days=Math.round((new Date(plan.rsvpDeadline+'T12:00:00')-new Date())/86400000); if(days>=0&&days<=3) alerts.push({e,text:'RSVP deadline in '+days+' day'+(days!==1?'s':''),icon:'ti-clock'}); }
    if(plan.checklist.length){ const undone=plan.checklist.filter(c=>!c.done).length; if(undone && e.date<=socToday()) alerts.push({e,text:undone+' checklist item'+(undone!==1?'s':'')+' incomplete, event is soon',icon:'ti-list-check'}); }
  });
  if(!alerts.length){ el.innerHTML = es('ti-circle-check','green','No planning alerts','Every upcoming event is on track.',''); return; }
  el.innerHTML = alerts.slice(0,8).map(a=>`<div class="al-row"><div class="al-ic" style="background:var(--am-bg);color:var(--am-tx)"><i class="ti ${a.icon}"></i></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">${esc(a.e.title)}</div><div style="font-size:11px;color:var(--mt)">${esc(a.text)}</div></div><button class="btn" style="height:24px;font-size:10.5px" onclick="socOpenDetail('${a.e.id}')">View</button></div>`).join('');
}

function socRenderEventList(){
  const el = document.getElementById('soc-events-table'); if(!el) return;
  const canEdit = socFull();
  const events = [...socEvents()].sort((a,b)=>a.date.localeCompare(b.date));
  if(!events.length){
    el.innerHTML = `<tbody><tr><td colspan="7">${es('ti-confetti','pink','No social events yet','Add a date party, mixer, or formal to start planning.', canEdit?`<button class="btn btn-p" onclick="socOpenAddEvent()"><i class="ti ti-plus"></i>Add Event</button>`:'')}</td></tr></tbody>`;
    return;
  }
  el.innerHTML = `<thead><tr><th>Event</th><th>Type</th><th>Date</th><th>Location</th><th>Status</th><th>Budget</th><th>Readiness</th></tr></thead><tbody>${
    events.map(e=>{
      const plan=socPlan(e.id); plan._eventId=e.id;
      const r = socReadiness(plan);
      const tot = socBudgetTotals(plan);
      return `<tr style="cursor:pointer" onclick="socOpenDetail('${e.id}')">
        <td style="font-weight:500">${esc(e.title)}</td>
        <td style="color:var(--mt)">${socCatLabel(plan.eventCategory)}</td>
        <td>${formatDateShort(e.date)}</td>
        <td style="color:var(--mt)">${esc(e.location)||'—'}</td>
        <td><span class="badge ${socStatusClass(plan.status)}">${socStatusLabel(plan.status)}</span></td>
        <td style="color:var(--mt)">$${Math.round(tot.actual).toLocaleString()} / $${Math.round(tot.est).toLocaleString()}</td>
        <td><div style="display:flex;align-items:center;gap:6px"><div style="width:50px;height:5px;background:var(--surf2);border-radius:99px;overflow:hidden"><div style="height:100%;width:${r.score}%;background:${progressColor(r.score)}"></div></div><span style="font-size:10.5px;color:var(--mt)">${r.score}%</span></div></td>
      </tr>`;
    }).join('')
  }</tbody>`;
}

// ── EVENT CREATE / EDIT ──
function socOpenAddEvent(){
  if(!socFull()){toast('Only officers with Social Events access can add events.','error');return;}
  ['soc-ev-title','soc-ev-date','soc-ev-start','soc-ev-location'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('soc-ev-cat').value='mixer';
  document.getElementById('soc-ev-id').value='';
  document.getElementById('m-soc-addevent').querySelector('.md-t').childNodes[0].textContent='New Social Event';
  document.getElementById('m-soc-addevent').classList.add('open');
}
function socOpenEditEventBasic(id){
  if(!socFull()){toast('Only officers with Social Events access can edit events.','error');return;}
  const e = D.events.find(x=>x.id===id); if(!e) return;
  const plan = socPlan(id);
  document.getElementById('soc-ev-title').value=e.title;
  document.getElementById('soc-ev-date').value=e.date;
  document.getElementById('soc-ev-start').value=e.start||'';
  document.getElementById('soc-ev-location').value=e.location||'';
  document.getElementById('soc-ev-cat').value=plan.eventCategory;
  document.getElementById('soc-ev-id').value=id;
  document.getElementById('m-soc-addevent').querySelector('.md-t').childNodes[0].textContent='Edit Social Event';
  document.getElementById('m-soc-addevent').classList.add('open');
}
async function socSaveEvent(){
  if(!socFull())return;
  const title=document.getElementById('soc-ev-title').value.trim();
  if(!title){toast('Event name is required','error');return;}
  const date=document.getElementById('soc-ev-date').value;
  if(!date){toast('Date is required','error');return;}
  const editId=document.getElementById('soc-ev-id').value;
  const cat=document.getElementById('soc-ev-cat').value;
  const fields={title,date,start:document.getElementById('soc-ev-start').value,location:document.getElementById('soc-ev-location').value.trim()};
  let ev, isNew=false;
  if(editId){
    ev=D.events.find(x=>x.id===editId);
    if(ev) Object.assign(ev,fields);
  } else {
    isNew=true;
    ev={id:uid(),type:'social',mandatory:false,...fields};
    D.events.push(ev);
  }
  socSetPlan(ev.id, p=>({...p, eventCategory:cat}));
  await saveData();
  closeM(null,document.getElementById('m-soc-addevent'));
  if(typeof renderCalendar==='function') renderCalendar();
  socShowList();
  toast(isNew?'Event added':'Event updated','success');
}
async function socDeleteEvent(id){
  if(!socFull())return;
  const ok = await confirmDialog('Delete Social Event','Delete this event and all of its planning data (venue, budget, checklist, vendor associations)? This cannot be undone.');
  if(!ok) return;
  D.events = D.events.filter(e=>e.id!==id);
  if(D.social.planning) delete D.social.planning[id];
  D.social.rsvps = D.social.rsvps.filter(r=>r.eventId!==id);
  await saveData();
  socShowList();
  if(typeof renderCalendar==='function') renderCalendar();
  toast('Event deleted','info');
}

// ══════════════════════════════════════════════
// EVENT DETAIL WORKSPACE
// ══════════════════════════════════════════════
function socOpenDetail(eventId){
  SOC_CURRENT_EVENT_ID = eventId;
  document.getElementById('soc-list-view').style.display='none';
  document.getElementById('soc-detail-view').style.display='';
  document.querySelectorAll('.soc-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  const plan = socPlan(eventId);
  const formalTab = document.getElementById('soc-tab-formal');
  if(formalTab) formalTab.style.display = socIsFormalCat(plan.eventCategory) ? '' : 'none';
  socTab(document.querySelector('.soc-tab'), 'soc-overview');
}
function socBackToList(){ SOC_CURRENT_EVENT_ID=null; socShowList(); }
function socTab(btn, tabId){
  document.querySelectorAll('.soc-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.querySelectorAll('#soc-detail-view > .soc-panel').forEach(p=>{p.style.display = p.id===tabId ? '' : 'none';});
  const id = SOC_CURRENT_EVENT_ID; if(!id) return;
  if(tabId==='soc-overview') socRenderDetailOverview();
  else if(tabId==='soc-checklist') socRenderChecklist();
  else if(tabId==='soc-budget') socRenderBudget();
  else if(tabId==='soc-vendors') socRenderEventVendors();
  else if(tabId==='soc-formal') socRenderFormal();
  else if(tabId==='soc-rsvp') socRenderRsvpPanel();
}

function socRenderDetailOverview(){
  const id = SOC_CURRENT_EVENT_ID; const e = D.events.find(x=>x.id===id); if(!e) return;
  const plan = socPlan(id); plan._eventId=id;
  const canEdit = socFull();
  const r = socReadiness(plan);
  const days = Math.round((new Date(e.date+'T12:00:00')-new Date())/86400000);
  document.getElementById('soc-detail-title').textContent = e.title;
  document.getElementById('soc-detail-sub').textContent = `${socCatLabel(plan.eventCategory)} · ${formatDateShort(e.date)}${e.location?' · '+e.location:''}`;
  document.getElementById('soc-detail-edit-btn').style.display = canEdit?'':'none';
  document.getElementById('soc-overview').innerHTML = `
    <div class="g3" style="margin-bottom:13px">
      ${kpi('Countdown', days>=0?days+' day'+(days!==1?'s':''):'Past', days>=0?'Until event':'Event date has passed', 'neutral')}
      ${kpi('Readiness', r.score+'%', r.missing.length?r.missing.length+' item(s) missing':'Fully ready', r.score>=80?'up':r.score>=50?'neutral':'down')}
      ${kpi('Status', socStatusLabel(plan.status), 'Current planning stage', 'neutral')}
    </div>
    ${r.missing.length?`<div class="bnr warn"><i class="ti ti-alert-triangle" style="font-size:13px"></i><div><strong>Missing to be fully ready:</strong> ${r.missing.map(esc).join(', ')}</div></div>`:''}
    <div class="card" style="margin-bottom:13px">
      <div class="card-hd"><span class="card-t">Status &amp; Attendance</span></div>
      <div class="fr c2">
        <div class="fld"><label>Status</label><select id="soc-ov-status" ${canEdit?'':'disabled'} onchange="socUpdateStatus()">${SOC_STATUSES.map(s=>`<option value="${s.v}"${plan.status===s.v?' selected':''}>${s.l}</option>`).join('')}</select></div>
        <div class="fld"><label>RSVP Deadline</label><input id="soc-ov-rsvpdl" type="date" value="${plan.rsvpDeadline||''}" ${canEdit?'':'disabled'} onchange="socUpdateOverviewField('rsvpDeadline',this.value)"></div>
      </div>
      <div class="fr c3">
        <div class="fld"><label>Expected Attendance</label><input id="soc-ov-exp" type="number" min="0" value="${plan.expectedAttendance??''}" ${canEdit?'':'disabled'} onchange="socUpdateOverviewField('expectedAttendance',this.value===''?null:+this.value)"></div>
        <div class="fld"><label>Capacity</label><input id="soc-ov-cap" type="number" min="0" value="${plan.capacity??''}" ${canEdit?'':'disabled'} onchange="socUpdateOverviewField('capacity',this.value===''?null:+this.value)"></div>
        <div class="fld"><label>Actual Attendance</label><input id="soc-ov-act" type="number" min="0" value="${plan.actualAttendance??''}" ${canEdit?'':'disabled'} onchange="socUpdateOverviewField('actualAttendance',this.value===''?null:+this.value)"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">RSVPs</span><button class="card-a" onclick="socTab(document.querySelector('[data-tab=soc-rsvp]'),'soc-rsvp')">View all →</button></div>
      <div id="soc-ov-rsvp-summary" style="font-size:12px;color:var(--mt)"></div>
    </div>`;
  socLoadRsvpSummaryInto('soc-ov-rsvp-summary');
}
async function socUpdateStatus(){
  if(!socFull())return;
  const v=document.getElementById('soc-ov-status').value;
  await socUpdateOverviewField('status',v);
}
async function socUpdateOverviewField(field,val){
  if(!socFull())return;
  const id=SOC_CURRENT_EVENT_ID;
  socSetPlan(id,p=>({...p,[field]:val}));
  await saveData();
  socRenderDetailOverview(); socRenderEventList();
}

// ── CHECKLIST ──
function socRenderChecklist(){
  const id=SOC_CURRENT_EVENT_ID; const plan=socPlan(id); const canEdit=socFull();
  const el=document.getElementById('soc-checklist-list'); if(!el) return;
  const addRow = canEdit?`<div class="fr c3" style="margin-bottom:11px">
      <div class="fld"><label>New item</label><input id="soc-cl-label" placeholder="e.g. Venue contract signed"></div>
      <div class="fld"><label>Assigned to</label><select id="soc-cl-assignee"><option value="">— Unassigned —</option>${memberSelectOptions()}</select></div>
      <div class="fld"><label>Due date</label><input id="soc-cl-due" type="date"></div>
    </div>
    <div style="display:flex;gap:7px;margin-bottom:14px"><label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--mt)"><input type="checkbox" id="soc-cl-linktask"> Also create a linked task</label><button class="btn btn-p" style="margin-left:auto" onclick="socAddChecklistItem()"><i class="ti ti-plus"></i>Add Item</button></div>`:'';
  if(!plan.checklist.length){
    el.innerHTML = addRow + es('ti-list-check','blue','No checklist items yet','Break planning into trackable steps.','');
    return;
  }
  const done=plan.checklist.filter(c=>c.done).length;
  el.innerHTML = addRow + `<div style="font-size:11px;color:var(--mt);margin-bottom:8px">${done}/${plan.checklist.length} complete</div>` + plan.checklist.map(c=>`
    <div class="tk-row">
      <div class="tc ${c.done?'done':''}" style="cursor:${canEdit?'pointer':'default'}" ${canEdit?`onclick="socToggleChecklistItem('${c.id}')"`:''}>${c.done?'<i class="ti ti-check" style="font-size:9px"></i>':''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;${c.done?'text-decoration:line-through;color:var(--ht)':''}">${esc(c.label)}${c.linkedTaskId?' <i class="ti ti-link" title="Linked to a task" style="font-size:10px;color:var(--sky-tx)"></i>':''}</div>
        <div style="font-size:10.5px;color:var(--ht)">${c.assignedTo?esc(getMember(c.assignedTo).name):'Unassigned'}${c.dueDate?' · Due '+formatDateShort(c.dueDate):''}</div>
      </div>
      ${canEdit?`<button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="socDeleteChecklistItem('${c.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button>`:''}
    </div>`).join('');
}
async function socAddChecklistItem(){
  if(!socFull())return;
  const label=document.getElementById('soc-cl-label').value.trim();
  if(!label){toast('Item description is required','error');return;}
  const assignedTo=document.getElementById('soc-cl-assignee').value;
  const dueDate=document.getElementById('soc-cl-due').value;
  const linkTask=document.getElementById('soc-cl-linktask').checked;
  const id=SOC_CURRENT_EVENT_ID;
  let linkedTaskId=null;
  if(linkTask){
    const task={id:uid(),title:label,assignedTo,priority:'medium',status:'todo',dueDate,desc:'Linked to social event checklist.'};
    D.tasks.push(task); linkedTaskId=task.id;
  }
  const item={id:uid(),label,assignedTo,dueDate,done:false,linkedTaskId};
  socSetPlan(id,p=>({...p,checklist:[...p.checklist,item]}));
  await saveData();
  document.getElementById('soc-cl-label').value='';
  socRenderChecklist();
  if(typeof renderDash==='function') renderDash();
  toast('Checklist item added'+(linkTask?' with linked task':''),'success');
}
async function socToggleChecklistItem(itemId){
  if(!socFull())return;
  const id=SOC_CURRENT_EVENT_ID; const plan=socPlan(id);
  const item=plan.checklist.find(c=>c.id===itemId); if(!item) return;
  const newDone=!item.done;
  socSetPlan(id,p=>({...p,checklist:p.checklist.map(c=>c.id===itemId?{...c,done:newDone}:c)}));
  if(item.linkedTaskId){ const t=D.tasks.find(x=>x.id===item.linkedTaskId); if(t) t.status = newDone?'done':'todo'; }
  await saveData();
  socRenderChecklist(); socRenderDetailOverview();
}
async function socDeleteChecklistItem(itemId){
  if(!socFull())return;
  const id=SOC_CURRENT_EVENT_ID;
  socSetPlan(id,p=>({...p,checklist:p.checklist.filter(c=>c.id!==itemId)}));
  await saveData();
  socRenderChecklist();
}

// ── BUDGET ──
function socRenderBudget(){
  const id=SOC_CURRENT_EVENT_ID; const plan=socPlan(id); plan._eventId=id; const canEdit=socFull();
  const el=document.getElementById('soc-budget-body'); if(!el) return;
  const tot=socBudgetTotals(plan);
  const kpiHtml = `<div class="g3" style="margin-bottom:13px">
    ${kpi('Planned Budget','$'+Math.round(tot.est).toLocaleString(),'Sum of estimates','neutral')}
    ${kpi('Actual Spend','$'+Math.round(tot.actual).toLocaleString(),tot.actualLogged?'From logged expenses':'From planning estimates','neutral')}
    ${kpi('Variance','$'+Math.round(tot.est-tot.actual).toLocaleString(),tot.actual>tot.est?'Over budget':'Remaining',tot.actual>tot.est?'down':'up')}
  </div>`;
  const addRow = canEdit?`<div class="fr c3" style="margin-bottom:8px">
      <div class="fld"><label>Category</label><select id="soc-bg-cat"><option>Venue</option><option>Transportation</option><option>Lodging</option><option>Catering</option><option>Entertainment</option><option>Security/Staffing</option><option>Decorations</option><option>Other</option></select></div>
      <div class="fld"><label>Description</label><input id="soc-bg-desc" placeholder="What is this for?"></div>
      <div class="fld"><label>Vendor</label><input id="soc-bg-vendor" placeholder="Optional"></div>
    </div>
    <div class="fr c3" style="margin-bottom:11px">
      <div class="fld"><label>Estimated Cost</label><input id="soc-bg-est" type="number" min="0" step="0.01" value="0"></div>
      <div class="fld"><label>Actual Cost</label><input id="soc-bg-act" type="number" min="0" step="0.01" value="0"></div>
      <div class="fld"><label>Payment Status</label><select id="soc-bg-status"><option value="not_due">Not Due</option><option value="deposit_due">Deposit Due</option><option value="deposit_paid">Deposit Paid</option><option value="payment_due">Payment Due</option><option value="paid">Paid</option></select></div>
    </div>
    <button class="btn btn-p" style="margin-bottom:14px" onclick="socAddBudgetItem()"><i class="ti ti-plus"></i>Add Budget Line</button>`:'';
  if(!plan.budgetItems.length){
    el.innerHTML = kpiHtml + addRow + es('ti-cash','amber','No budget lines yet','Add estimated costs by category to track this event\'s spend.','');
    return;
  }
  const statusBadge={not_due:'bm2',deposit_due:'ba2',deposit_paid:'bb2',payment_due:'ba2',paid:'bg2'};
  const statusLabel={not_due:'Not Due',deposit_due:'Deposit Due',deposit_paid:'Deposit Paid',payment_due:'Payment Due',paid:'Paid'};
  el.innerHTML = kpiHtml + addRow + `<div class="tw"><table class="tbl"><thead><tr><th>Category</th><th>Description</th><th>Vendor</th><th>Est.</th><th>Actual</th><th>Status</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    plan.budgetItems.map(b=>`<tr><td style="font-weight:500">${esc(b.category)}</td><td>${esc(b.description)||'—'}</td><td style="color:var(--mt)">${esc(b.vendor)||'—'}</td><td>$${(+b.estCost||0).toLocaleString()}</td><td>$${(+b.actualCost||0).toLocaleString()}</td><td><span class="badge ${statusBadge[b.paymentStatus]||'bm2'}">${statusLabel[b.paymentStatus]||b.paymentStatus}</span></td>${canEdit?`<td><button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="socDeleteBudgetItem('${b.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody></table></div>
  ${canEdit?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--bdr)"><div style="font-size:11.5px;color:var(--mt);margin-bottom:8px">When money actually moves, log it against the chapter's <strong>Events Social</strong> Finance category so it shows up in Finance too:</div><button class="btn" onclick="socOpenLogExpense()"><i class="ti ti-receipt"></i>Log Actual Expense to Finance</button></div>`:''}`;
}
async function socAddBudgetItem(){
  if(!socFull())return;
  const description=document.getElementById('soc-bg-desc').value.trim();
  const item={id:uid(),category:document.getElementById('soc-bg-cat').value,description,vendor:document.getElementById('soc-bg-vendor').value.trim(),estCost:parseFloat(document.getElementById('soc-bg-est').value)||0,actualCost:parseFloat(document.getElementById('soc-bg-act').value)||0,paymentStatus:document.getElementById('soc-bg-status').value,notes:''};
  const id=SOC_CURRENT_EVENT_ID;
  socSetPlan(id,p=>({...p,budgetItems:[...p.budgetItems,item]}));
  await saveData();
  socRenderBudget(); toast('Budget line added','success');
}
async function socDeleteBudgetItem(itemId){
  if(!socFull())return;
  const id=SOC_CURRENT_EVENT_ID;
  socSetPlan(id,p=>({...p,budgetItems:p.budgetItems.filter(b=>b.id!==itemId)}));
  await saveData();
  socRenderBudget();
}
// Bridges to Finance: logs a real, dated expense under the existing 'Events Social' category,
// tagged with this event's id so socBudgetTotals() can show real confirmed spend.
function socOpenLogExpense(){
  if(!socFull()){toast('You do not have permission to log expenses.','error');return;}
  document.getElementById('soc-exp-desc').value='';
  document.getElementById('soc-exp-amount').value='';
  document.getElementById('soc-exp-date').value=socToday();
  const sel=document.getElementById('soc-exp-officer');
  sel.innerHTML=memberSelectOptions();
  if(CURRENT_USER?.mid) sel.value=CURRENT_USER.mid;
  document.getElementById('m-soc-logexpense').classList.add('open');
}
async function socLogExpenseToFinance(){
  if(!socFull())return;
  const amount=parseFloat(document.getElementById('soc-exp-amount').value);
  const desc=document.getElementById('soc-exp-desc').value.trim();
  if(!amount||amount<=0||!desc){toast('Description and a valid amount are required','error');return;}
  if(!D.finance.expenses) D.finance.expenses=[];
  const expense={id:'ex'+uid(),category:'Events Social',desc,amount,officer:document.getElementById('soc-exp-officer').value,date:document.getElementById('soc-exp-date').value||socToday(),eventId:SOC_CURRENT_EVENT_ID};
  D.finance.expenses.unshift(expense);
  await saveData();
  closeM(null,document.getElementById('m-soc-logexpense'));
  socRenderBudget();
  toast('Expense of $'+amount+' logged to Finance','success');
}

// ── VENDORS (chapter-wide directory, associated to events) ──
function socRenderVendorsTable(){
  const el=document.getElementById('soc-vendors-table'); if(!el) return;
  const canEdit=socFull();
  const vendors=D.social.vendors||[];
  if(!vendors.length){ el.innerHTML=`<tbody><tr><td colspan="4">${es('ti-truck-delivery','blue','No vendors yet','Track venues, transportation providers, caterers, and other vendors here.',canEdit?`<button class="btn btn-p" onclick="socOpenAddVendor()"><i class="ti ti-plus"></i>Add Vendor</button>`:'')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Name</th><th>Type</th><th>Contact</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    vendors.map(v=>`<tr><td style="font-weight:500">${esc(v.name)}</td><td style="color:var(--mt)">${esc((SOC_EVENT_CATEGORIES.find(c=>c.v===v.type)||{}).l||v.type)}</td><td style="color:var(--mt)">${esc(v.contactName)||'—'}${v.phone?' · '+esc(v.phone):''}</td>${canEdit?`<td><button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="socDeleteVendor('${v.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}
function socOpenAddVendor(){
  if(!socFull()){toast('Only officers with Social Events access can add vendors.','error');return;}
  ['soc-vd-name','soc-vd-contact','soc-vd-phone','soc-vd-email','soc-vd-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-soc-addvendor').classList.add('open');
}
async function socAddVendor(){
  if(!socFull())return;
  const name=document.getElementById('soc-vd-name').value.trim();
  if(!name){toast('Vendor name is required','error');return;}
  const vendor={id:uid(),name,type:document.getElementById('soc-vd-type').value,contactName:document.getElementById('soc-vd-contact').value.trim(),phone:document.getElementById('soc-vd-phone').value.trim(),email:document.getElementById('soc-vd-email').value.trim(),notes:document.getElementById('soc-vd-notes').value.trim(),associatedEventIds:[]};
  D.social.vendors.push(vendor);
  await saveData();
  closeM(null,document.getElementById('m-soc-addvendor'));
  socRenderVendorsTable();
  if(SOC_CURRENT_EVENT_ID) socRenderEventVendors();
  toast('Vendor added','success');
}
async function socDeleteVendor(id){
  if(!socFull())return;
  const ok=await confirmDialog('Remove Vendor','Remove this vendor from the directory?'); if(!ok) return;
  D.social.vendors=D.social.vendors.filter(v=>v.id!==id);
  await saveData();
  socRenderVendorsTable();
  if(SOC_CURRENT_EVENT_ID) socRenderEventVendors();
  toast('Vendor removed','info');
}
function socRenderEventVendors(){
  const id=SOC_CURRENT_EVENT_ID; const canEdit=socFull();
  const el=document.getElementById('soc-event-vendors'); if(!el) return;
  const vendors=D.social.vendors||[];
  if(!vendors.length){ el.innerHTML=es('ti-truck-delivery','blue','No vendors in the directory yet','Add vendors from the main Social Events list, then associate them here.',''); return; }
  el.innerHTML = vendors.map(v=>{
    const assoc = (v.associatedEventIds||[]).includes(id);
    return `<div class="sh-row"><div class="sh-av" style="width:28px;height:28px;font-size:9.5px">${esc(v.name.slice(0,2).toUpperCase())}</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">${esc(v.name)}</div><div style="font-size:10.5px;color:var(--ht)">${esc((SOC_EVENT_CATEGORIES.find(c=>c.v===v.type)||{}).l||v.type)}</div></div>${canEdit?`<label style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--mt)"><input type="checkbox" ${assoc?'checked':''} onchange="socToggleVendorAssoc('${v.id}')"> For this event</label>`:(assoc?'<span class="badge bb2">Booked</span>':'')}</div>`;
  }).join('');
}
async function socToggleVendorAssoc(vendorId){
  if(!socFull())return;
  const eventId=SOC_CURRENT_EVENT_ID;
  const v=D.social.vendors.find(x=>x.id===vendorId); if(!v) return;
  if(!v.associatedEventIds) v.associatedEventIds=[];
  const has=v.associatedEventIds.includes(eventId);
  v.associatedEventIds = has ? v.associatedEventIds.filter(id=>id!==eventId) : [...v.associatedEventIds,eventId];
  await saveData();
}

// ── FORMAL PLANNING (venue/transportation/lodging/catering/entertainment/security) ──
function socRenderFormal(){
  const id=SOC_CURRENT_EVENT_ID; const plan=socPlan(id); const canEdit=socFull();
  const el=document.getElementById('soc-formal-body'); if(!el) return;
  const dis = canEdit?'':'disabled';
  el.innerHTML = `
    <div class="card" style="margin-bottom:11px"><div class="card-hd"><span class="card-t">Venue</span></div>
      <div class="fr c2"><div class="fld"><label>Venue Name</label><input id="soc-f-venue-name" ${dis} value="${esc(plan.venue.name)}"></div><div class="fld"><label>Contact</label><input id="soc-f-venue-contact" ${dis} value="${esc(plan.venue.contact)}"></div></div>
      <div class="fr c2"><div class="fld"><label>Address</label><input id="soc-f-venue-address" ${dis} value="${esc(plan.venue.address)}"></div><div class="fld"><label>Phone</label><input id="soc-f-venue-phone" ${dis} value="${esc(plan.venue.phone)}"></div></div>
      <div class="fr c3">
        <div class="fld"><label>Deposit</label><input id="soc-f-venue-deposit" type="number" min="0" step="0.01" ${dis} value="${plan.venue.deposit||0}"></div>
        <div class="fld"><label>Total Cost</label><input id="soc-f-venue-total" type="number" min="0" step="0.01" ${dis} value="${plan.venue.totalCost||0}"></div>
        <div class="fld"><label>Contract Status</label><select id="soc-f-venue-contract" ${dis}><option value="not_started"${plan.venue.contractStatus==='not_started'?' selected':''}>Not Started</option><option value="sent"${plan.venue.contractStatus==='sent'?' selected':''}>Sent</option><option value="signed"${plan.venue.contractStatus==='signed'?' selected':''}>Signed</option></select></div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:6px 0"><input type="checkbox" id="soc-f-venue-confirmed" ${dis} ${plan.venue.confirmed?'checked':''}> Venue confirmed</label>
      <div class="fld"><label>Notes</label><textarea id="soc-f-venue-notes" ${dis} style="height:60px">${esc(plan.venue.notes)}</textarea></div>
      ${canEdit?`<button class="btn btn-p" style="margin-top:8px" onclick="socSaveFormalSection('venue')">Save Venue</button>`:''}
    </div>
    <div class="card" style="margin-bottom:11px"><div class="card-hd"><span class="card-t">Transportation</span></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:8px"><input type="checkbox" id="soc-f-trans-required" ${dis} ${plan.transportation.required?'checked':''}> Transportation required for this event</label>
      <div class="fr c2"><div class="fld"><label>Provider</label><input id="soc-f-trans-provider" ${dis} value="${esc(plan.transportation.provider)}"></div><div class="fld"><label>Contact</label><input id="soc-f-trans-contact" ${dis} value="${esc(plan.transportation.contact)}"></div></div>
      <div class="fr c2"><div class="fld"><label>Pickup Location</label><input id="soc-f-trans-pickup" ${dis} value="${esc(plan.transportation.pickupLocation)}"></div><div class="fld"><label>Cost</label><input id="soc-f-trans-cost" type="number" min="0" step="0.01" ${dis} value="${plan.transportation.cost||0}"></div></div>
      <div class="fr c3">
        <div class="fld"><label>Departure Time</label><input id="soc-f-trans-depart" type="time" ${dis} value="${plan.transportation.departureTime||''}"></div>
        <div class="fld"><label>Return Time</label><input id="soc-f-trans-return" type="time" ${dis} value="${plan.transportation.returnTime||''}"></div>
        <div class="fld"><label>Vehicles / Capacity</label><div style="display:flex;gap:6px"><input id="soc-f-trans-vcount" type="number" min="0" placeholder="Vehicles" ${dis} value="${plan.transportation.vehicleCount||0}"><input id="soc-f-trans-vcap" type="number" min="0" placeholder="Capacity" ${dis} value="${plan.transportation.capacity||0}"></div></div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:6px 0"><input type="checkbox" id="soc-f-trans-confirmed" ${dis} ${plan.transportation.confirmed?'checked':''}> Transportation confirmed</label>
      <div class="fld"><label>Notes</label><textarea id="soc-f-trans-notes" ${dis} style="height:50px">${esc(plan.transportation.notes)}</textarea></div>
      ${canEdit?`<button class="btn btn-p" style="margin-top:8px" onclick="socSaveFormalSection('transportation')">Save Transportation</button>`:''}
    </div>
    <div class="card" style="margin-bottom:11px"><div class="card-hd"><span class="card-t">Lodging</span></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:8px"><input type="checkbox" id="soc-f-lodge-required" ${dis} ${plan.lodging.required?'checked':''}> Lodging required for this event</label>
      <div class="fr c2"><div class="fld"><label>Hotel</label><input id="soc-f-lodge-hotel" ${dis} value="${esc(plan.lodging.hotel)}"></div><div class="fld"><label>Contact</label><input id="soc-f-lodge-contact" ${dis} value="${esc(plan.lodging.contact)}"></div></div>
      <div class="fr c3">
        <div class="fld"><label>Room Count</label><input id="soc-f-lodge-rooms" type="number" min="0" ${dis} value="${plan.lodging.roomCount||0}"></div>
        <div class="fld"><label>Cost</label><input id="soc-f-lodge-cost" type="number" min="0" step="0.01" ${dis} value="${plan.lodging.cost||0}"></div>
        <div class="fld"><label>Booking Status</label><select id="soc-f-lodge-status" ${dis}><option value="not_started"${plan.lodging.bookingStatus==='not_started'?' selected':''}>Not Started</option><option value="booked"${plan.lodging.bookingStatus==='booked'?' selected':''}>Booked</option><option value="paid"${plan.lodging.bookingStatus==='paid'?' selected':''}>Paid</option></select></div>
      </div>
      <div class="fld"><label>Notes</label><textarea id="soc-f-lodge-notes" ${dis} style="height:50px">${esc(plan.lodging.notes)}</textarea></div>
      ${canEdit?`<button class="btn btn-p" style="margin-top:8px" onclick="socSaveFormalSection('lodging')">Save Lodging</button>`:''}
    </div>
    <div class="card" style="margin-bottom:11px"><div class="card-hd"><span class="card-t">Catering</span></div>
      <div class="fr c2"><div class="fld"><label>Provider</label><input id="soc-f-cater-provider" ${dis} value="${esc(plan.catering.provider)}"></div><div class="fld"><label>Contact</label><input id="soc-f-cater-contact" ${dis} value="${esc(plan.catering.contact)}"></div></div>
      <div class="fr c2"><div class="fld"><label>Service Type</label><input id="soc-f-cater-type" ${dis} value="${esc(plan.catering.serviceType)}" placeholder="e.g. plated, buffet"></div><div class="fld"><label>Cost</label><input id="soc-f-cater-cost" type="number" min="0" step="0.01" ${dis} value="${plan.catering.cost||0}"></div></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:6px 0"><input type="checkbox" id="soc-f-cater-confirmed" ${dis} ${plan.catering.confirmed?'checked':''}> Catering confirmed</label>
      <div class="fld"><label>Dietary Notes</label><textarea id="soc-f-cater-dietary" ${dis} style="height:50px">${esc(plan.catering.dietaryNotes)}</textarea></div>
      ${canEdit?`<button class="btn btn-p" style="margin-top:8px" onclick="socSaveFormalSection('catering')">Save Catering</button>`:''}
    </div>
    <div class="card" style="margin-bottom:11px"><div class="card-hd"><span class="card-t">Entertainment</span></div>
      <div class="fr c2"><div class="fld"><label>Provider (DJ/Band)</label><input id="soc-f-ent-provider" ${dis} value="${esc(plan.entertainment.provider)}"></div><div class="fld"><label>Contact</label><input id="soc-f-ent-contact" ${dis} value="${esc(plan.entertainment.contact)}"></div></div>
      <div class="fr c2"><div class="fld"><label>Cost</label><input id="soc-f-ent-cost" type="number" min="0" step="0.01" ${dis} value="${plan.entertainment.cost||0}"></div><div class="fld"><label>Equipment Needs</label><input id="soc-f-ent-equip" ${dis} value="${esc(plan.entertainment.equipmentNeeds)}"></div></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:6px 0"><input type="checkbox" id="soc-f-ent-confirmed" ${dis} ${plan.entertainment.confirmed?'checked':''}> Entertainment confirmed</label>
      <div class="fld"><label>Notes</label><textarea id="soc-f-ent-notes" ${dis} style="height:50px">${esc(plan.entertainment.notes)}</textarea></div>
      ${canEdit?`<button class="btn btn-p" style="margin-top:8px" onclick="socSaveFormalSection('entertainment')">Save Entertainment</button>`:''}
    </div>
    <div class="card"><div class="card-hd"><span class="card-t">Security / Staffing</span></div>
      <div class="fr c2"><div class="fld"><label>Provider</label><input id="soc-f-sec-provider" ${dis} value="${esc(plan.security.provider)}"></div><div class="fld"><label>Contact</label><input id="soc-f-sec-contact" ${dis} value="${esc(plan.security.contact)}"></div></div>
      <div class="fr c2"><div class="fld"><label>Staff Count</label><input id="soc-f-sec-count" type="number" min="0" ${dis} value="${plan.security.staffCount||0}"></div><div class="fld"><label>Cost</label><input id="soc-f-sec-cost" type="number" min="0" step="0.01" ${dis} value="${plan.security.cost||0}"></div></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:6px 0"><input type="checkbox" id="soc-f-sec-confirmed" ${dis} ${plan.security.confirmed?'checked':''}> Security/staffing confirmed</label>
      <div class="fld"><label>Notes</label><textarea id="soc-f-sec-notes" ${dis} style="height:50px">${esc(plan.security.notes)}</textarea></div>
      ${canEdit?`<button class="btn btn-p" style="margin-top:8px" onclick="socSaveFormalSection('security')">Save Security</button>`:''}
    </div>`;
}
async function socSaveFormalSection(section){
  if(!socFull())return;
  const id=SOC_CURRENT_EVENT_ID;
  const g=(elId)=>document.getElementById(elId);
  const sections = {
    venue: ()=>({name:g('soc-f-venue-name').value.trim(),contact:g('soc-f-venue-contact').value.trim(),address:g('soc-f-venue-address').value.trim(),phone:g('soc-f-venue-phone').value.trim(),deposit:parseFloat(g('soc-f-venue-deposit').value)||0,totalCost:parseFloat(g('soc-f-venue-total').value)||0,contractStatus:g('soc-f-venue-contract').value,confirmed:g('soc-f-venue-confirmed').checked,notes:g('soc-f-venue-notes').value.trim()}),
    transportation: ()=>({required:g('soc-f-trans-required').checked,provider:g('soc-f-trans-provider').value.trim(),contact:g('soc-f-trans-contact').value.trim(),pickupLocation:g('soc-f-trans-pickup').value.trim(),cost:parseFloat(g('soc-f-trans-cost').value)||0,departureTime:g('soc-f-trans-depart').value,returnTime:g('soc-f-trans-return').value,vehicleCount:parseFloat(g('soc-f-trans-vcount').value)||0,capacity:parseFloat(g('soc-f-trans-vcap').value)||0,confirmed:g('soc-f-trans-confirmed').checked,notes:g('soc-f-trans-notes').value.trim()}),
    lodging: ()=>({required:g('soc-f-lodge-required').checked,hotel:g('soc-f-lodge-hotel').value.trim(),contact:g('soc-f-lodge-contact').value.trim(),roomCount:parseFloat(g('soc-f-lodge-rooms').value)||0,cost:parseFloat(g('soc-f-lodge-cost').value)||0,bookingStatus:g('soc-f-lodge-status').value,notes:g('soc-f-lodge-notes').value.trim()}),
    catering: ()=>({provider:g('soc-f-cater-provider').value.trim(),contact:g('soc-f-cater-contact').value.trim(),serviceType:g('soc-f-cater-type').value.trim(),cost:parseFloat(g('soc-f-cater-cost').value)||0,confirmed:g('soc-f-cater-confirmed').checked,dietaryNotes:g('soc-f-cater-dietary').value.trim()}),
    entertainment: ()=>({provider:g('soc-f-ent-provider').value.trim(),contact:g('soc-f-ent-contact').value.trim(),cost:parseFloat(g('soc-f-ent-cost').value)||0,equipmentNeeds:g('soc-f-ent-equip').value.trim(),confirmed:g('soc-f-ent-confirmed').checked,notes:g('soc-f-ent-notes').value.trim()}),
    security: ()=>({provider:g('soc-f-sec-provider').value.trim(),contact:g('soc-f-sec-contact').value.trim(),staffCount:parseFloat(g('soc-f-sec-count').value)||0,cost:parseFloat(g('soc-f-sec-cost').value)||0,confirmed:g('soc-f-sec-confirmed').checked,notes:g('soc-f-sec-notes').value.trim()}),
  };
  const newVal = sections[section]();
  socSetPlan(id,p=>({...p,[section]:newVal}));
  await saveData();
  socRenderDetailOverview(); socRenderEventList();
  toast(section.charAt(0).toUpperCase()+section.slice(1)+' saved','success');
}

// ══════════════════════════════════════════════
// RSVP — stored locally in D.social.rsvps (this demo has no real per-user backend)
// ══════════════════════════════════════════════
function socMyRsvp(eventId, memberId){ return D.social.rsvps.find(r=>r.eventId===eventId&&r.memberId===memberId); }
async function socRsvpSet(eventId, status){
  const memberId = CURRENT_USER?.mid; if(!memberId) return false;
  const existing = socMyRsvp(eventId, memberId);
  if(existing){ existing.status=status; existing.respondedAt=new Date().toISOString(); }
  else D.social.rsvps.push({id:uid(),eventId,memberId,status,respondedAt:new Date().toISOString()});
  await saveData();
  return true;
}
function socRsvpsForEvent(eventId){ return D.social.rsvps.filter(r=>r.eventId===eventId); }
function socLoadRsvpSummaryInto(elId){
  const el=document.getElementById(elId); if(!el) return;
  const eventId=SOC_CURRENT_EVENT_ID; if(!eventId) return;
  const rsvps = socRsvpsForEvent(eventId);
  const yes=rsvps.filter(r=>r.status==='yes').length, no=rsvps.filter(r=>r.status==='no').length, maybe=rsvps.filter(r=>r.status==='maybe').length;
  el.innerHTML = `<div style="display:flex;gap:16px"><span><strong style="color:var(--gn)">${yes}</strong> Yes</span><span><strong style="color:var(--am-tx)">${maybe}</strong> Maybe</span><span><strong style="color:var(--rd)">${no}</strong> No</span><span style="color:var(--ht)">${rsvps.length} responded</span></div>`;
}
function socRenderRsvpPanel(){
  const el=document.getElementById('soc-rsvp-body'); if(!el) return;
  const eventId=SOC_CURRENT_EVENT_ID;
  const rsvps = socRsvpsForEvent(eventId);
  const yes=rsvps.filter(r=>r.status==='yes'), maybe=rsvps.filter(r=>r.status==='maybe'), no=rsvps.filter(r=>r.status==='no');
  const list=(arr,label,color)=>`<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:${color};margin-bottom:6px">${label} (${arr.length})</div>${arr.length?arr.map(r=>`<div style="font-size:12px;padding:3px 0">${esc(getMember(r.memberId).name)}</div>`).join(''):'<div style="font-size:11.5px;color:var(--ht)">None yet</div>'}</div>`;
  el.innerHTML = `<div class="g3">${kpi('Yes',yes.length,'Attending','up')}${kpi('Maybe',maybe.length,'Unsure','neutral')}${kpi('No',no.length,'Not attending','neutral')}</div><div style="margin-top:14px" class="g3">${list(yes,'Yes','var(--gn-tx)')}${list(maybe,'Maybe','var(--am-tx)')}${list(no,'No','var(--rd-tx)')}</div>`;
}

// ── MEMBER-FACING RESTRICTED VIEW ──
function socRenderMemberView(){
  const el = document.getElementById('soc-member-events'); if(!el) return;
  const now = socToday();
  const events = socEvents().filter(e=>{
    const plan=socPlan(e.id);
    return e.date>=now && SOC_MEMBER_VISIBLE_STATUSES.includes(plan.status);
  }).sort((a,b)=>a.date.localeCompare(b.date));
  if(!events.length){ el.innerHTML = es('ti-confetti','pink','No upcoming social events','Check back soon — nothing has opened for RSVP yet.',''); return; }
  const myId = CURRENT_USER?.mid;
  el.innerHTML = events.map(e=>{
    const plan=socPlan(e.id);
    const mine = myId ? (socMyRsvp(e.id, myId)||{}).status : null;
    return `<div class="card" style="margin-bottom:11px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><div style="font-size:14px;font-weight:600">${esc(e.title)}</div><div style="font-size:11.5px;color:var(--mt)">${socCatLabel(plan.eventCategory)} · ${formatDateShort(e.date)}${e.start?' · '+to12h(e.start):''}${e.location?' · '+esc(e.location):''}</div></div>
        <span class="badge ${socStatusClass(plan.status)}">${socStatusLabel(plan.status)}</span>
      </div>
      ${plan.rsvpDeadline?`<div style="font-size:11px;color:var(--ht);margin-top:6px">RSVP by ${formatDateShort(plan.rsvpDeadline)}</div>`:''}
      <div style="display:flex;gap:7px;margin-top:11px">
        <button class="btn ${mine==='yes'?'btn-p':''}" onclick="socMemberRsvp('${e.id}','yes')">Yes</button>
        <button class="btn ${mine==='maybe'?'btn-p':''}" onclick="socMemberRsvp('${e.id}','maybe')">Maybe</button>
        <button class="btn ${mine==='no'?'btn-p':''}" onclick="socMemberRsvp('${e.id}','no')">No</button>
      </div>
    </div>`;
  }).join('');
}
async function socMemberRsvp(eventId, status){
  const ok = await socRsvpSet(eventId, status);
  if(ok){ toast('RSVP saved: '+status.charAt(0).toUpperCase()+status.slice(1),'success'); socRenderMemberView(); }
}
