/* OpsCore 2.0 Demo — New Member Education + Peer Mentor Program */

// Uses the explicit m.memberStatus field, NOT class year — a Freshman may already be an
// initiated active brother, and a Sophomore/Junior can be a brand-new member (transfer,
// spring bid, etc.), so class year can never stand in for membership status.
function nmeGetClass(){
  return sortedMembers().filter(m=>(m.memberStatus||'Active')==='New Member');
}
function nmeReqDone(memberId,reqId){
  return !!(D.newMemberEducation.progress[memberId]&&D.newMemberEducation.progress[memberId][reqId]);
}
function nmeProgressPct(memberId){
  const requirements=D.newMemberEducation.requirements||[];
  if(!requirements.length)return 0;
  const done=requirements.filter(r=>nmeReqDone(memberId,r.id)).length;
  return Math.round(done/requirements.length*100);
}

function renderNewMemberEducation(){
  const editActions=document.getElementById('nme-edit-actions');
  if(editActions)editActions.style.display=canWrite()?'':'none';
  const nme=D.newMemberEducation;
  const sessions=nme.sessions||[];
  const requirements=nme.requirements||[];
  const newMembers=nmeGetClass();
  const today=new Date().toISOString().split('T')[0];
  const completedSessions=sessions.filter(s=>s.date&&s.date<today).length;
  const progressPcts=newMembers.map(m=>nmeProgressPct(m.id));
  const avgProgress=progressPcts.length?Math.round(progressPcts.reduce((a,b)=>a+b,0)/progressPcts.length):0;
  const atRisk=newMembers.filter(m=>nmeProgressPct(m.id)<50).length;
  const reqCompletedTotal=newMembers.reduce((s,m)=>s+requirements.filter(r=>nmeReqDone(m.id,r.id)).length,0);

  document.getElementById('nme-kpi').innerHTML=
    kpi('New Members',newMembers.length,'In program','neutral')+
    kpi('Sessions Scheduled',sessions.length,completedSessions+' completed','neutral')+
    kpi('Sessions Completed',completedSessions,sessions.length+' total','neutral')+
    kpi('Avg Progress',avgProgress+'%','Across new members',avgProgress>=75?'up':avgProgress>=50?'neutral':'down')+
    kpi('At-Risk Members',atRisk,atRisk?'Below 50% progress':'All on track',atRisk?'down':'up')+
    kpi('Requirements Completed',reqCompletedTotal,'Across all new members','neutral');

  nmeRenderProgress();
  nmeRenderRisk();
  nmeRenderSessions();
  nmeRenderRequirements();
  pmpRenderAll();
}

function nmeRenderProgress(){
  const requirements=D.newMemberEducation.requirements||[];
  const newMembers=nmeGetClass();
  const canEdit=canWrite();
  const el=document.getElementById('nme-progress-table');
  if(!el)return;
  if(!newMembers.length){ el.innerHTML=`<tbody><tr><td>${es('ti-school','blue','No new members','Members with Member Status set to "New Member" (on the Members page) appear here.','')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Member</th><th>Class</th><th>Progress</th><th>Requirements</th><th>Status</th></tr></thead><tbody>${
    newMembers.map(m=>{
      const done=requirements.filter(r=>nmeReqDone(m.id,r.id)).length;
      const pct=nmeProgressPct(m.id);
      const status=pct>=100?['On Track','bg2']:pct>=50?['In Progress','ba2']:['At Risk','br2'];
      return `<tr style="${canEdit?'cursor:pointer':''}" ${canEdit?`onclick="nmeOpenProgress('${m.id}')"`:''}>
        <td style="font-weight:500">${esc(m.name)}</td><td style="color:var(--mt)">${esc(m.classYear)}</td>
        <td><div class="pb" style="width:70px;display:inline-block;vertical-align:middle"><div class="pf" style="width:${pct}%;background:${progressColor(pct)}"></div></div> <span style="font-size:11px">${pct}%</span></td>
        <td>${done}/${requirements.length}</td><td><span class="badge ${status[1]}">${status[0]}</span></td>
      </tr>`;
    }).join('')
  }</tbody>`;
}

function nmeRenderRisk(){
  const newMembers=nmeGetClass();
  const el=document.getElementById('nme-risk-table');
  if(!el)return;
  const risk=newMembers.filter(m=>nmeProgressPct(m.id)<50);
  if(!risk.length){ el.innerHTML=`<tbody><tr><td>${es('ti-circle-check','green','No members at risk','Everyone is on track.','')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Member</th><th>Progress</th></tr></thead><tbody>${
    [...risk].sort(memberNameCompare).map(m=>`<tr><td style="font-weight:500">${esc(m.name)}</td><td style="color:var(--rd)">${nmeProgressPct(m.id)}%</td></tr>`).join('')
  }</tbody>`;
}

function nmeRenderSessions(){
  const sessions=D.newMemberEducation.sessions||[];
  const canEdit=canWrite();
  const el=document.getElementById('nme-sessions-table');
  if(!el)return;
  if(!sessions.length){ el.innerHTML=`<tbody><tr><td>${es('ti-calendar','blue','No sessions yet','Schedule your first education session.',canEdit?`<button class="btn btn-p" onclick="nmeOpenAddSession()">Add Session</button>`:'')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Session</th><th>Date</th><th>Facilitator</th><th>Attendance</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    [...sessions].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<tr><td style="font-weight:500">${esc(s.title)}</td><td>${formatDateShort(s.date)}</td><td style="color:var(--mt)">${s.facilitatorId?esc(getMember(s.facilitatorId).name):'—'}</td><td>${(s.attendance||[]).length} present</td>${canEdit?`<td style="display:flex;gap:4px;justify-content:flex-end"><button class="btn" style="height:22px;font-size:10px;padding:0 6px" onclick="nmeOpenAttendance('${s.id}')" aria-label="Attendance"><i class="ti ti-user-check"></i></button><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="nmeDeleteSession('${s.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}

function nmeRenderRequirements(){
  const requirements=D.newMemberEducation.requirements||[];
  const newMembers=nmeGetClass();
  const canEdit=canWrite();
  const el=document.getElementById('nme-requirements-table');
  if(!el)return;
  if(!requirements.length){ el.innerHTML=`<tbody><tr><td>${es('ti-list-check','blue','No requirements yet','Add requirements new members must complete.',canEdit?`<button class="btn btn-p" onclick="nmeOpenAddRequirement()">Add Requirement</button>`:'')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Requirement</th><th>Due</th><th>Completed</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    requirements.map(r=>{
      const done=newMembers.filter(m=>nmeReqDone(m.id,r.id)).length;
      return `<tr><td style="font-weight:500">${esc(r.title)}</td><td>${r.due?formatDateShort(r.due):'—'}</td><td>${done}/${newMembers.length}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="nmeDeleteRequirement('${r.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`;
    }).join('')
  }</tbody>`;
}

// ── SESSIONS ──
function nmeOpenAddSession(){
  if(!canWrite()){toast('Only officers with New Member Education access can add sessions.','error');return;}
  document.getElementById('nmes-id').value='';
  document.getElementById('nmes-title').value='';
  document.getElementById('nmes-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('nmes-facilitator').innerHTML='<option value="">— None —</option>'+memberSelectOptions();
  document.getElementById('nmes-type').value='education';
  document.getElementById('nmes-notes').value='';
  document.getElementById('m-nme-addsession').classList.add('open');
}
async function nmeAddSession(){
  if(!canWrite())return;
  const title=document.getElementById('nmes-title').value.trim();
  if(!title){toast('Session title is required','error');return;}
  const session={id:uid(),title,date:document.getElementById('nmes-date').value||new Date().toISOString().split('T')[0],facilitatorId:document.getElementById('nmes-facilitator').value||null,type:document.getElementById('nmes-type').value,notes:document.getElementById('nmes-notes').value.trim(),attendance:[]};
  D.newMemberEducation.sessions.push(session);
  await saveData();
  closeM(null,document.getElementById('m-nme-addsession'));
  renderNewMemberEducation();
  toast('Session added','success');
}
async function nmeDeleteSession(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Delete Session','Delete this session and its attendance record?');
  if(!ok)return;
  D.newMemberEducation.sessions=D.newMemberEducation.sessions.filter(s=>s.id!==id);
  await saveData();
  renderNewMemberEducation();
  toast('Session deleted','info');
}

// ── ATTENDANCE ──
function nmeOpenAttendance(sessionId){
  if(!canWrite()){toast('Only officers with New Member Education access can mark attendance.','error');return;}
  const session=D.newMemberEducation.sessions.find(s=>s.id===sessionId);
  if(!session)return;
  document.getElementById('nmea-session-id').value=sessionId;
  const attendance=session.attendance||[];
  const newMembers=nmeGetClass();
  const el=document.getElementById('nmea-list');
  if(!newMembers.length){ el.innerHTML=es('ti-school','blue','No new members','No new members to mark attendance for.',''); }
  else{
    el.innerHTML=newMembers.map(m=>`
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr);cursor:pointer">
        <input type="checkbox" value="${m.id}" ${attendance.includes(m.id)?'checked':''}>
        <span style="font-size:12.5px">${esc(m.name)}</span>
      </label>`).join('');
  }
  document.getElementById('m-nme-attendance').classList.add('open');
}
async function nmeSaveAttendance(){
  if(!canWrite())return;
  const sessionId=document.getElementById('nmea-session-id').value;
  const session=D.newMemberEducation.sessions.find(s=>s.id===sessionId);
  if(!session)return;
  const checked=[...document.querySelectorAll('#nmea-list input[type=checkbox]:checked')].map(c=>c.value);
  session.attendance=checked;
  await saveData();
  closeM(null,document.getElementById('m-nme-attendance'));
  renderNewMemberEducation();
  toast('Attendance saved','success');
}

// ── REQUIREMENTS ──
function nmeOpenAddRequirement(){
  if(!canWrite()){toast('Only officers with New Member Education access can add requirements.','error');return;}
  document.getElementById('nmereq-title').value='';
  document.getElementById('nmereq-due').value='';
  document.getElementById('nmereq-desc').value='';
  document.getElementById('m-nme-addreq').classList.add('open');
}
async function nmeAddRequirement(){
  if(!canWrite())return;
  const title=document.getElementById('nmereq-title').value.trim();
  if(!title){toast('Requirement title is required','error');return;}
  const req={id:uid(),title,due:document.getElementById('nmereq-due').value||null,desc:document.getElementById('nmereq-desc').value.trim()};
  D.newMemberEducation.requirements.push(req);
  await saveData();
  closeM(null,document.getElementById('m-nme-addreq'));
  renderNewMemberEducation();
  toast('Requirement added','success');
}
async function nmeDeleteRequirement(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Delete Requirement','Delete this requirement? Progress toward it will be lost.');
  if(!ok)return;
  D.newMemberEducation.requirements=D.newMemberEducation.requirements.filter(r=>r.id!==id);
  await saveData();
  renderNewMemberEducation();
  toast('Requirement deleted','info');
}

// ── PER-MEMBER PROGRESS ──
function nmeOpenProgress(memberId){
  if(!canWrite())return;
  const m=getMember(memberId);
  document.getElementById('nmep-member-id').value=memberId;
  document.getElementById('nmep-title').childNodes[0].textContent=m.name+' — Progress';
  const requirements=D.newMemberEducation.requirements||[];
  const el=document.getElementById('nmep-list');
  if(!requirements.length){ el.innerHTML=es('ti-list-check','blue','No requirements yet','Add requirements first.',''); }
  else{
    el.innerHTML=requirements.map(r=>`
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr);cursor:pointer">
        <input type="checkbox" ${nmeReqDone(memberId,r.id)?'checked':''} onchange="nmeToggleProgress('${memberId}','${r.id}',this.checked)">
        <span style="font-size:12.5px">${esc(r.title)}</span>
      </label>`).join('');
  }
  document.getElementById('m-nme-progress').classList.add('open');
}
async function nmeToggleProgress(memberId,reqId,checked){
  if(!canWrite())return;
  if(!D.newMemberEducation.progress[memberId])D.newMemberEducation.progress[memberId]={};
  D.newMemberEducation.progress[memberId][reqId]=checked;
  await saveData();
  renderNewMemberEducation();
}

function nmeExport(){
  const requirements=D.newMemberEducation.requirements||[];
  const newMembers=nmeGetClass();
  let csv='Member,Class Year,Progress %,Requirements Completed\n';
  newMembers.forEach(m=>{
    const done=requirements.filter(r=>nmeReqDone(m.id,r.id)).length;
    csv+=`${m.name},${m.classYear},${nmeProgressPct(m.id)},${done}/${requirements.length}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='new_member_education_progress.csv';a.click();
}

// ══════════════════════════════════════════════
// PEER MENTOR PROGRAM
// ══════════════════════════════════════════════
// Lives inside D.newMemberEducation (same object, same saveData() pattern) rather than a new
// top-level key. Mentors are drawn from active members (memberStatus!=='New Member'), new
// members from nmeGetClass() — both real, already-correct fields, not a separate flag.

function pmpCanEdit(){ return canWrite(); }
function pmpGroups(){ return D.newMemberEducation.mentorGroups||[]; }

// memberId -> the name of whichever group already holds them (excluding excludeGroupId, so a
// group being edited doesn't flag its own current new members as "assigned elsewhere").
function pmpAssignedNmMap(excludeGroupId){
  const map={};
  pmpGroups().forEach(g=>{
    if(g.id===excludeGroupId)return;
    (g.newMemberIds||[]).forEach(id=>{ if(!(id in map)) map[id]=g.name; });
  });
  return map;
}

function pmpRenderAll(){
  const addWrap=document.getElementById('pmp-add-group-wrap');
  if(addWrap)addWrap.style.display=pmpCanEdit()?'':'none';
  pmpRenderOverview();
  pmpRenderGroups();
  pmpRenderUnassigned();
  pmpRenderAgenda();
  pmpRenderAnalytics();
}

// ── WEEKLY AGENDA (imported via CSV — see js/import.js) ──
function pmpRenderAgenda(){
  const actionsWrap=document.getElementById('pmp-agenda-actions');
  if(actionsWrap)actionsWrap.style.display=pmpCanEdit()?'':'none';
  const el=document.getElementById('pmp-agenda-table');
  if(!el)return;
  const agenda=[...(D.newMemberEducation.mentorProgramAgenda||[])].sort((a,b)=>(a.week||0)-(b.week||0));
  const canEdit=pmpCanEdit();
  if(!agenda.length){
    el.innerHTML=`<tbody><tr><td>${es('ti-calendar-event','pink','No agenda uploaded yet','Import a week-by-week curriculum so every mentor knows what to cover.',canEdit?`<button class="btn btn-p" onclick="openImportModal('mentorAgenda')">Import Agenda</button>`:'')}</td></tr></tbody>`;
    return;
  }
  el.innerHTML=`<thead><tr><th style="width:60px">Week</th><th>Topic</th><th>Discussion Points</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    agenda.map(a=>`<tr><td style="font-weight:600">${a.week}</td><td style="font-weight:500">${esc(a.topic)}</td><td style="color:var(--mt)">${esc(a.notes||'—')}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="pmpDeleteAgendaWeek('${a.id}')" aria-label="Delete Week ${a.week}"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}
async function pmpDeleteAgendaWeek(id){
  if(!pmpCanEdit())return;
  const ok=await confirmDialog('Delete Week','Remove this week from the agenda?');
  if(!ok)return;
  D.newMemberEducation.mentorProgramAgenda=D.newMemberEducation.mentorProgramAgenda.filter(a=>a.id!==id);
  await saveData();
  pmpRenderAgenda();
  toast('Week removed','info');
}

// ── OVERVIEW KPIs ──
function pmpRenderOverview(){
  const el=document.getElementById('pmp-kpi');
  if(!el)return;
  const groups=pmpGroups();
  const mentorSet=new Set(); groups.forEach(g=>(g.mentorIds||[]).forEach(id=>mentorSet.add(id)));
  const nmAssignedSet=new Set(); groups.forEach(g=>(g.newMemberIds||[]).forEach(id=>nmAssignedSet.add(id)));
  const totalNewMembers=nmeGetClass().length;
  const unassigned=Math.max(0,totalNewMembers-nmAssignedSet.size);
  const avgPerGroup=groups.length?Math.round((nmAssignedSet.size/groups.length)*10)/10:0;
  el.innerHTML=
    kpi('Peer Mentor Groups',groups.length,'Active groups','neutral')+
    kpi('Peer Mentors',mentorSet.size,'Unique active members','neutral')+
    kpi('New Members Assigned',nmAssignedSet.size,totalNewMembers+' total new members','neutral')+
    kpi('Unassigned New Members',unassigned,unassigned?'Need a group':'All assigned',unassigned?'down':'up')+
    kpi('Avg New Members / Group',avgPerGroup,groups.length?'Per group':'No groups yet','neutral');
}

// ── GROUP CARDS ──
function pmpRenderGroups(){
  const el=document.getElementById('pmp-groups');
  if(!el)return;
  const groups=[...pmpGroups()].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const canEdit=pmpCanEdit();
  if(!groups.length){
    el.innerHTML=es('ti-users-group','pink','No mentor groups yet','Create a group to start assigning mentors and new members.',canEdit?`<button class="btn btn-p" onclick="pmpOpenAddGroup()"><i class="ti ti-plus"></i>Create Group</button>`:'');
    return;
  }
  el.innerHTML=groups.map(g=>{
    const mentors=(g.mentorIds||[]).map(id=>getMember(id));
    const nms=(g.newMemberIds||[]).map(id=>getMember(id));
    const size=mentors.length+nms.length;
    return `<div class="card" style="padding:13px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:9px;gap:8px">
        <div style="min-width:0"><div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.name)}</div><div style="font-size:10.5px;color:var(--mt)">${mentors.length} mentor${mentors.length!==1?'s':''} · ${nms.length} new member${nms.length!==1?'s':''} · ${size} total</div></div>
        ${canEdit?`<div style="display:flex;gap:5px;flex-shrink:0"><button class="btn" style="height:24px;font-size:10.5px;padding:0 7px" onclick="pmpOpenEditGroup('${g.id}')" aria-label="Edit ${esc(g.name)}"><i class="ti ti-edit"></i></button><button class="btn btn-d" style="height:24px;font-size:10.5px;padding:0 7px" onclick="pmpDeleteGroup('${g.id}')" aria-label="Delete ${esc(g.name)}"><i class="ti ti-trash"></i></button></div>`:''}
      </div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--navy);margin-bottom:5px">Peer Mentors</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${mentors.length?mentors.map(m=>`<div style="display:flex;align-items:center;gap:5px;background:var(--am-bg);border-radius:99px;padding:3px 9px 3px 3px;max-width:100%"><div class="sh-av" style="width:20px;height:20px;font-size:7.5px;flex-shrink:0">${esc(m.initials)}</div><span style="font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span></div>`).join(''):'<span style="font-size:11px;color:var(--ht)">No mentors assigned</span>'}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mt);margin-bottom:5px">New Members</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${nms.length?nms.map(m=>`<div style="display:flex;align-items:center;gap:5px;background:var(--surf2);border-radius:99px;padding:3px 9px 3px 3px;max-width:100%"><div class="sh-av" style="width:20px;height:20px;font-size:7.5px;flex-shrink:0">${esc(m.initials)}</div><span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span></div>`).join(''):'<span style="font-size:11px;color:var(--ht)">No new members assigned</span>'}</div>
    </div>`;
  }).join('');
}

// ── UNASSIGNED NEW MEMBERS ──
function pmpRenderUnassigned(){
  const el=document.getElementById('pmp-unassigned');
  if(!el)return;
  const nmAssignedSet=new Set(); pmpGroups().forEach(g=>(g.newMemberIds||[]).forEach(id=>nmAssignedSet.add(id)));
  const unassigned=nmeGetClass().filter(m=>!nmAssignedSet.has(m.id));
  const canEdit=pmpCanEdit();
  if(!unassigned.length){
    el.innerHTML=es('ti-circle-check','green','All new members assigned',nmeGetClass().length?'Every new member is in a Peer Mentor Group.':'No new members enrolled yet.','');
    return;
  }
  const hasGroups=pmpGroups().length>0;
  el.innerHTML=unassigned.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr)">
    <div class="sh-av" style="width:22px;height:22px;font-size:8px;flex-shrink:0">${esc(m.initials)}</div>
    <div style="flex:1;min-width:0;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</div>
    ${canEdit?(hasGroups?`<button class="btn" style="height:22px;font-size:10px;padding:0 8px;flex-shrink:0" onclick="pmpOpenQuickAssign('${m.id}')">Assign</button>`:`<span style="font-size:10px;color:var(--ht);flex-shrink:0">Create a group first</span>`):''}
  </div>`).join('');
}

// ── ANALYTICS ──
function pmpRenderAnalytics(){
  const kpiEl=document.getElementById('pmp-analytics-kpi');
  const chartEl=document.getElementById('pmp-analytics-chart');
  if(!kpiEl&&!chartEl)return;
  const groups=pmpGroups();
  if(!groups.length){
    if(kpiEl)kpiEl.innerHTML='';
    if(chartEl)chartEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No mentor groups yet — analytics will appear once groups are created.</div>`;
    return;
  }
  const sizes=groups.map(g=>({g,n:(g.newMemberIds||[]).length}));
  const largest=[...sizes].sort((a,b)=>b.n-a.n)[0];
  const smallest=[...sizes].sort((a,b)=>a.n-b.n)[0];
  const totalNm=nmeGetClass().length;
  const nmAssignedSet=new Set(); groups.forEach(g=>(g.newMemberIds||[]).forEach(id=>nmAssignedSet.add(id)));
  const completionPct=totalNm?Math.round(nmAssignedSet.size/totalNm*100):100;
  const avgSize=groups.length?Math.round((nmAssignedSet.size/groups.length)*10)/10:0;
  if(kpiEl)kpiEl.innerHTML=
    kpi('Largest Group',esc(largest.g.name)+' ('+largest.n+')','New members','neutral')+
    kpi('Smallest Group',esc(smallest.g.name)+' ('+smallest.n+')','New members','neutral')+
    kpi('Avg Group Size',avgSize,'New members per group','neutral')+
    kpi('Assignment Completion',completionPct+'%',nmAssignedSet.size+'/'+totalNm+' new members placed',completionPct>=90?'up':completionPct>=60?'neutral':'down');
  if(chartEl)chartEl.innerHTML=miniBarChart(sizes.map(s=>({label:s.g.name,val:s.n})),v=>v+' new member'+(v!==1?'s':''));
}

// ── GROUP CREATE/EDIT ──
let PMP_EDIT_ID=null;
let PMP_EDIT_MENTOR_IDS=new Set();
let PMP_EDIT_NM_IDS=new Set();

function pmpOpenAddGroup(){
  if(!pmpCanEdit()){toast('Only officers with New Member Education access can create mentor groups.','error');return;}
  PMP_EDIT_ID=null;
  PMP_EDIT_MENTOR_IDS=new Set();
  PMP_EDIT_NM_IDS=new Set();
  document.getElementById('pmp-group-title').childNodes[0].textContent='Create Peer Mentor Group';
  document.getElementById('pmp-name').value='';
  document.getElementById('pmp-mentor-search').value='';
  document.getElementById('pmp-nm-search').value='';
  pmpRenderMentorPicker();
  pmpRenderNmPicker();
  document.getElementById('m-pmp-group').classList.add('open');
}
function pmpOpenEditGroup(id){
  if(!pmpCanEdit())return;
  const g=pmpGroups().find(x=>x.id===id);
  if(!g)return;
  PMP_EDIT_ID=id;
  PMP_EDIT_MENTOR_IDS=new Set(g.mentorIds||[]);
  PMP_EDIT_NM_IDS=new Set(g.newMemberIds||[]);
  document.getElementById('pmp-group-title').childNodes[0].textContent='Edit Peer Mentor Group';
  document.getElementById('pmp-name').value=g.name;
  document.getElementById('pmp-mentor-search').value='';
  document.getElementById('pmp-nm-search').value='';
  pmpRenderMentorPicker();
  pmpRenderNmPicker();
  document.getElementById('m-pmp-group').classList.add('open');
}
function pmpFilterMentors(){ pmpRenderMentorPicker(); }
function pmpFilterNm(){ pmpRenderNmPicker(); }
function pmpToggleMentor(id,checked){ if(checked)PMP_EDIT_MENTOR_IDS.add(id); else PMP_EDIT_MENTOR_IDS.delete(id); }
function pmpToggleNm(id,checked){ if(checked)PMP_EDIT_NM_IDS.add(id); else PMP_EDIT_NM_IDS.delete(id); }

function pmpRenderMentorPicker(){
  const q=(document.getElementById('pmp-mentor-search')?.value||'').toLowerCase();
  const el=document.getElementById('pmp-mentor-list');
  if(!el)return;
  const pool=sortedMembers().filter(m=>(m.memberStatus||'Active')!=='New Member').filter(m=>!q||m.name.toLowerCase().includes(q));
  if(!pool.length){ el.innerHTML=`<div style="padding:10px;text-align:center;color:var(--ht);font-size:11.5px">No active members found.</div>`; return; }
  el.innerHTML=pool.map(m=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid var(--bdr);cursor:pointer">
    <input type="checkbox" value="${m.id}" ${PMP_EDIT_MENTOR_IDS.has(m.id)?'checked':''} onchange="pmpToggleMentor('${m.id}',this.checked)">
    <div class="sh-av" style="width:20px;height:20px;font-size:7.5px;flex-shrink:0">${esc(m.initials)}</div>
    <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span>
  </label>`).join('');
}
function pmpRenderNmPicker(){
  const q=(document.getElementById('pmp-nm-search')?.value||'').toLowerCase();
  const el=document.getElementById('pmp-nm-list');
  if(!el)return;
  const assignedMap=pmpAssignedNmMap(PMP_EDIT_ID);
  const pool=nmeGetClass().filter(m=>!q||m.name.toLowerCase().includes(q));
  if(!pool.length){ el.innerHTML=`<div style="padding:10px;text-align:center;color:var(--ht);font-size:11.5px">No new members found.</div>`; return; }
  el.innerHTML=pool.map(m=>{
    const elsewhereGroup=assignedMap[m.id];
    const disabled=!!elsewhereGroup;
    return `<label style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid var(--bdr);cursor:${disabled?'not-allowed':'pointer'};opacity:${disabled?'.5':'1'}">
      <input type="checkbox" value="${m.id}" ${PMP_EDIT_NM_IDS.has(m.id)?'checked':''} ${disabled?'disabled':''} onchange="pmpToggleNm('${m.id}',this.checked)">
      <div class="sh-av" style="width:20px;height:20px;font-size:7.5px;flex-shrink:0">${esc(m.initials)}</div>
      <span style="font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span>
      ${disabled?`<span style="font-size:9.5px;color:var(--ht);flex-shrink:0">In ${esc(elsewhereGroup)}</span>`:''}
    </label>`;
  }).join('');
}

async function pmpSaveGroup(){
  if(!pmpCanEdit())return;
  const name=document.getElementById('pmp-name').value.trim();
  if(!name){toast('Group name is required','error');return;}
  const mentorIds=[...PMP_EDIT_MENTOR_IDS];
  const newMemberIds=[...PMP_EDIT_NM_IDS];
  const editId=PMP_EDIT_ID;
  if(editId){
    const g=D.newMemberEducation.mentorGroups.find(x=>x.id===editId);
    if(!g)return;
    g.name=name; g.mentorIds=mentorIds; g.newMemberIds=newMemberIds; g.updatedAt=Date.now();
  }else{
    D.newMemberEducation.mentorGroups.push({id:uid(),name,mentorIds,newMemberIds,createdBy:CURRENT_USER?CURRENT_USER.mid:null,createdAt:Date.now(),updatedAt:Date.now()});
  }
  await saveData();
  closeM(null,document.getElementById('m-pmp-group'));
  renderNewMemberEducation();
  toast(editId?'Group updated':'Group created','success');
}
async function pmpDeleteGroup(id){
  if(!pmpCanEdit())return;
  const g=pmpGroups().find(x=>x.id===id);
  if(!g)return;
  const nmCount=(g.newMemberIds||[]).length;
  const ok=await confirmDialog('Delete Group','Delete "'+g.name+'"? '+(nmCount?nmCount+' new member'+(nmCount!==1?'s':'')+' will become unassigned.':'This cannot be undone.'));
  if(!ok)return;
  D.newMemberEducation.mentorGroups=D.newMemberEducation.mentorGroups.filter(x=>x.id!==id);
  await saveData();
  renderNewMemberEducation();
  toast('Group deleted','info');
}

// ── QUICK ASSIGN (from Unassigned New Members list) ──
function pmpOpenQuickAssign(memberId){
  if(!pmpCanEdit())return;
  const groups=pmpGroups();
  if(!groups.length){toast('Create a mentor group first','error');return;}
  document.getElementById('pmp-qa-member-id').value=memberId;
  document.getElementById('pmp-qa-member-name').textContent=getMember(memberId).name;
  document.getElementById('pmp-qa-group').innerHTML=[...groups].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(g=>`<option value="${g.id}">${esc(g.name)} (${(g.newMemberIds||[]).length} new members)</option>`).join('');
  document.getElementById('m-pmp-quickassign').classList.add('open');
}
async function pmpQuickAssign(){
  if(!pmpCanEdit())return;
  const memberId=document.getElementById('pmp-qa-member-id').value;
  const groupId=document.getElementById('pmp-qa-group').value;
  const g=D.newMemberEducation.mentorGroups.find(x=>x.id===groupId);
  if(!g||!memberId)return;
  if(!g.newMemberIds)g.newMemberIds=[];
  if(g.newMemberIds.includes(memberId)){toast('Already in that group','error');return;}
  g.newMemberIds.push(memberId);
  g.updatedAt=Date.now();
  await saveData();
  closeM(null,document.getElementById('m-pmp-quickassign'));
  renderNewMemberEducation();
  toast('Assigned to '+g.name,'success');
}
