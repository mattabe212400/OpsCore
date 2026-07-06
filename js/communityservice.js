/* OpsCore 2.0 Demo — Community Service */
// Events live on the shared D.events calendar (type:'service') so Community Service's event
// list always matches what's on the Calendar page, not a separate copy.
function csEvents(){ return (D.events||[]).filter(e=>e.type==='service'); }

function renderCommunityService(){
  const cs=D.communityService;
  const events=csEvents();
  const hours=cs.hours||[];
  const totalHrs=Math.round(hours.reduce((s,h)=>s+parseFloat(h.hours||0),0)*10)/10;
  const memberHrsMap={};
  hours.forEach(h=>{ memberHrsMap[h.memberId]=(memberHrsMap[h.memberId]||0)+parseFloat(h.hours||0); });
  const participants=Object.keys(memberHrsMap).length;
  const avgHrs=participants?Math.round(totalHrs/participants*10)/10:0;
  const today=new Date().toISOString().split('T')[0];
  const eventsCompleted=events.filter(e=>e.date<today).length;
  const goal=cs.goals||{totalHrs:500,events:6,avgHrs:4};
  const goalProgress=goal.totalHrs?Math.min(Math.round(totalHrs/goal.totalHrs*100),999):0;
  const underReq=goal.avgHrs?D.members.filter(m=>(memberHrsMap[m.id]||0)<goal.avgHrs):[];

  document.getElementById('cs-kpi').innerHTML=
    kpi('Total Service Hours',totalHrs,getSemester(),'neutral')+
    kpi('Members Participated',participants,D.members.length+' total members','neutral')+
    kpi('Avg Hours / Member',avgHrs,'Per participant','neutral')+
    kpi('Events Completed',eventsCompleted,events.length+' total events','neutral')+
    kpi('Goal Progress',goalProgress+'%',goalProgress>=100?'Goal met':'Toward '+goal.totalHrs+' hrs',goalProgress>=75?'up':'neutral')+
    kpi('Below Requirement',underReq.length,underReq.length?'Need '+goal.avgHrs+'+ hrs':'All on track',underReq.length?'down':'up');

  const logBtn=document.getElementById('cs-log-hours-btn'); if(logBtn)logBtn.style.display=canWrite()?'':'none';
  const addBtn=document.getElementById('cs-add-event-btn'); if(addBtn)addBtn.style.display=canWrite()?'':'none';

  csRenderGoalBars();
  csRenderChart();
  csRenderLeaderboard();
  csRenderEvents();
  csFilterHours();
  csRenderMissing();
  csRenderLocations();
}

function csRenderGoalBars(){
  const cs=D.communityService;
  const goal=cs.goals||{totalHrs:500,events:6,avgHrs:4};
  const totalHrs=(cs.hours||[]).reduce((s,h)=>s+parseFloat(h.hours||0),0);
  const eventsCount=csEvents().length;
  const bars=[
    {title:'Total Hours',cur:Math.round(totalHrs*10)/10,tgt:goal.totalHrs},
    {title:'Events',cur:eventsCount,tgt:goal.events},
  ];
  document.getElementById('cs-goal-bars').innerHTML=bars.map(b=>{
    const p=Math.min(Math.round(b.cur/b.tgt*100)||0,100);
    return `<div class="pr"><span class="pl">${b.title} (${b.cur}/${b.tgt})</span><div class="pb"><div class="pf" style="width:${p}%;background:${progressColor(p)}"></div></div><span class="pv">${p}%</span></div>`;
  }).join('');
}
function csOpenGoalEdit(){
  if(!canWrite()){toast('Only officers with Community Service access can edit goals.','error');return;}
  const goal=D.communityService.goals||{totalHrs:500,events:6,avgHrs:4};
  document.getElementById('csg-hours').value=goal.totalHrs||'';
  document.getElementById('csg-events').value=goal.events||'';
  document.getElementById('csg-avg').value=goal.avgHrs||'';
  document.getElementById('m-cs-goal').classList.add('open');
}
async function csSaveGoal(){
  if(!canWrite())return;
  const totalHrs=parseFloat(document.getElementById('csg-hours').value)||0;
  const events=parseFloat(document.getElementById('csg-events').value)||0;
  const avgHrs=parseFloat(document.getElementById('csg-avg').value)||0;
  D.communityService.goals={totalHrs,events,avgHrs};
  await saveData();
  closeM(null,document.getElementById('m-cs-goal'));
  renderCommunityService();
  toast('Goals updated','success');
}

function csRenderChart(){
  const hours=D.communityService.hours||[];
  const chartEl=document.getElementById('cs-chart');
  if(!chartEl)return;
  if(!hours.length){ chartEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No hours logged yet.</div>`; return; }
  const byWeek={};
  hours.forEach(h=>{
    if(!h.date)return;
    const d=new Date(h.date+'T12:00:00');
    const weekStart=new Date(d); weekStart.setDate(d.getDate()-d.getDay());
    const key=weekStart.toISOString().split('T')[0];
    byWeek[key]=(byWeek[key]||0)+parseFloat(h.hours||0);
  });
  const weeks=Object.keys(byWeek).sort().slice(-8);
  chartEl.innerHTML=miniBarChart(weeks.map(w=>({label:new Date(w+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}),val:byWeek[w]})),v=>v+' hrs');
}

function csRenderLeaderboard(){
  const hours=D.communityService.hours||[];
  const memberHrsMap={};
  hours.forEach(h=>{ memberHrsMap[h.memberId]=(memberHrsMap[h.memberId]||0)+parseFloat(h.hours||0); });
  const totalHrs=Math.round(hours.reduce((s,h)=>s+parseFloat(h.hours||0),0)*10)/10;
  const totalEl=document.getElementById('cs-total-hrs');
  if(totalEl)totalEl.textContent=totalHrs+' total hrs';
  const top=Object.entries(memberHrsMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const el=document.getElementById('cs-leaderboard');
  if(!el)return;
  if(!top.length){ el.innerHTML=es('ti-trophy','green','No hours yet','Log service hours to see top volunteers.',''); return; }
  el.innerHTML=top.map(([id,hrs],i)=>{
    const m=getMember(id);
    return `<div class="sh-row"><div class="sh-av" style="width:24px;height:24px;font-size:9px;background:${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#cd7f32':'var(--gn-bg)'};color:${i<3?'#555':'var(--gn-tx)'}">${i+1}</div><span style="flex:1;font-size:12px;font-weight:500">${esc(m.name)}</span><span style="font-size:12px;font-weight:600;color:var(--gn)">${(Math.round(hrs*10)/10)}<span style="font-size:9.5px;font-weight:400;color:var(--ht)"> hrs</span></span></div>`;
  }).join('');
}

function csRenderEvents(){
  const events=csEvents();
  const canEdit=canWrite();
  const el=document.getElementById('cs-events-table');
  if(!el)return;
  if(!events.length){ el.innerHTML=`<tbody><tr><td>${es('ti-calendar','green','No service events','Add an event to get started.',canEdit?`<button class="btn btn-p" onclick="csOpenAddEvent()">Add Event</button>`:'')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Org</th><th>Hour Goal</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    [...events].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<tr><td style="font-weight:500">${esc(e.title)}</td><td>${formatDateShort(e.date)}</td><td style="color:var(--mt)">${esc(e.org)||'—'}</td><td>${e.hourGoal||'—'}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="csDeleteEvent('${e.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}

function csFilterHours(){
  const q=(document.getElementById('cs-search')?.value||'').toLowerCase();
  const hours=D.communityService.hours||[];
  const canEdit=canWrite();
  const rows=hours.filter(h=>getMember(h.memberId).name.toLowerCase().includes(q));
  const el=document.getElementById('cs-hours-table');
  if(!el)return;
  if(!rows.length){ el.innerHTML=`<tbody><tr><td>${es('ti-clock','blue','No hours logged','Log hours to track member participation.','')}</td></tr></tbody>`; return; }
  const events=csEvents();
  el.innerHTML=`<thead><tr><th>Member</th><th>Hours</th><th>Event</th><th>Date</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    [...rows].sort((a,b)=>b.date.localeCompare(a.date)).map(h=>{
      const ev=events.find(e=>e.id===h.eventId);
      return `<tr><td style="font-weight:500">${esc(getMember(h.memberId).name)}</td><td>${h.hours}</td><td style="color:var(--mt)">${ev?esc(ev.title):'General'}</td><td>${formatDateShort(h.date)}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="csDeleteHours('${h.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`;
    }).join('')
  }</tbody>`;
}

function csRenderMissing(){
  const hours=D.communityService.hours||[];
  const goal=D.communityService.goals||{avgHrs:4};
  const req=goal.avgHrs||0;
  const memberHrsMap={};
  hours.forEach(h=>{ memberHrsMap[h.memberId]=(memberHrsMap[h.memberId]||0)+parseFloat(h.hours||0); });
  const missing=req?D.members.filter(m=>(memberHrsMap[m.id]||0)<req):[];
  const el=document.getElementById('cs-missing-table');
  if(!el)return;
  if(!req||!missing.length){ el.innerHTML=`<tbody><tr><td>${es('ti-circle-check','green','Everyone on track','No per-member hour requirement set, or everyone meets it.','')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Member</th><th>Hours</th><th>Needed</th></tr></thead><tbody>${
    [...missing].sort(memberNameCompare).map(m=>`<tr><td style="font-weight:500">${esc(m.name)}</td><td>${Math.round((memberHrsMap[m.id]||0)*10)/10}</td><td style="color:var(--rd)">${(req-(memberHrsMap[m.id]||0)).toFixed(1)}</td></tr>`).join('')
  }</tbody>`;
}

function csRenderLocations(){
  const locations=D.communityService.locations||[];
  const canEdit=canWrite();
  const el=document.getElementById('cs-locations-table');
  if(!el)return;
  if(!locations.length){ el.innerHTML=`<tbody><tr><td>${es('ti-map-pin','green','No service locations yet','Track where the chapter volunteers and who to contact.','')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Location</th><th>Address</th><th>Contact</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    locations.map(l=>`<tr><td style="font-weight:500">${esc(l.name)}</td><td style="color:var(--mt)">${esc(l.address)||'—'}</td><td style="color:var(--mt)">${esc([l.contactName,l.contactInfo].filter(Boolean).join(' · '))||'—'}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="csDeleteLocation('${l.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}

// ── ACTIONS ──
function csOpenAddEvent(){
  if(!canWrite()){toast('Only officers with Community Service access can add events.','error');return;}
  ['cs-ev-title','cs-ev-date','cs-ev-goal','cs-ev-org','cs-ev-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('cs-ev-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('m-cs-addevent').classList.add('open');
}
async function csAddEvent(){
  if(!canWrite())return;
  const title=document.getElementById('cs-ev-title').value.trim();
  if(!title){toast('Event name is required','error');return;}
  const event={id:uid(),title,type:'service',date:document.getElementById('cs-ev-date').value||new Date().toISOString().split('T')[0],hourGoal:parseFloat(document.getElementById('cs-ev-goal').value)||0,org:document.getElementById('cs-ev-org').value.trim(),notes:document.getElementById('cs-ev-notes').value.trim(),mandatory:false};
  D.events.push(event);
  await saveData();
  closeM(null,document.getElementById('m-cs-addevent'));
  renderCommunityService();
  if(typeof renderCalendar==='function')renderCalendar();
  toast('Event added','success');
}
async function csDeleteEvent(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Delete Event','Delete this event? Attendance records for it will also be removed.');
  if(!ok)return;
  D.events=D.events.filter(e=>e.id!==id);
  delete D.attendance[id];
  await saveData();
  renderCommunityService();
  if(typeof renderCalendar==='function')renderCalendar();
  toast('Event deleted','info');
}

function csOpenLogHours(){
  if(!canWrite()){toast('Only officers with Community Service access can log hours.','error');return;}
  const memberSel=document.getElementById('cs-log-member');
  memberSel.innerHTML=memberSelectOptions();
  const eventSel=document.getElementById('cs-log-event');
  eventSel.innerHTML='<option value="">-- General / Other --</option>'+csEvents().map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('');
  document.getElementById('cs-log-hours').value='';
  document.getElementById('cs-log-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('cs-log-notes').value='';
  document.getElementById('m-cs-loghours').classList.add('open');
}
async function csLogHours(){
  if(!canWrite())return;
  const memberId=document.getElementById('cs-log-member').value;
  const hrs=parseFloat(document.getElementById('cs-log-hours').value);
  if(!memberId||!hrs||hrs<=0){toast('Member and hours are required','error');return;}
  const log={id:uid(),memberId,hours:hrs,eventId:document.getElementById('cs-log-event').value||null,date:document.getElementById('cs-log-date').value||new Date().toISOString().split('T')[0],notes:document.getElementById('cs-log-notes').value.trim()};
  D.communityService.hours.push(log);
  await saveData();
  closeM(null,document.getElementById('m-cs-loghours'));
  renderCommunityService();
  toast('Hours logged','success');
}
async function csDeleteHours(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Remove Log','Remove this hours log entry?');
  if(!ok)return;
  D.communityService.hours=D.communityService.hours.filter(h=>h.id!==id);
  await saveData();
  renderCommunityService();
  toast('Log removed','info');
}

function csOpenAddLocation(){
  if(!canWrite()){toast('Only officers with Community Service access can add locations.','error');return;}
  ['cs-loc-name','cs-loc-address','cs-loc-contact-name','cs-loc-contact-info','cs-loc-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-cs-addlocation').classList.add('open');
}
async function csAddLocation(){
  if(!canWrite())return;
  const name=document.getElementById('cs-loc-name').value.trim();
  if(!name){toast('Location name is required','error');return;}
  const location={id:uid(),name,address:document.getElementById('cs-loc-address').value.trim(),contactName:document.getElementById('cs-loc-contact-name').value.trim(),contactInfo:document.getElementById('cs-loc-contact-info').value.trim(),notes:document.getElementById('cs-loc-notes').value.trim()};
  D.communityService.locations.push(location);
  await saveData();
  closeM(null,document.getElementById('m-cs-addlocation'));
  renderCommunityService();
  toast('Location added','success');
}
async function csDeleteLocation(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Remove Location','Remove this service location?');
  if(!ok)return;
  D.communityService.locations=D.communityService.locations.filter(l=>l.id!==id);
  await saveData();
  renderCommunityService();
  toast('Location removed','info');
}

function csExport(){
  const hours=D.communityService.hours||[];
  const events=csEvents();
  let csv='Member,Hours,Event,Date,Notes\n';
  hours.forEach(h=>{
    const ev=events.find(e=>e.id===h.eventId);
    csv+=`${getMember(h.memberId).name},${h.hours},${ev?ev.title:'General'},${h.date},${(h.notes||'').replace(/,/g,';')}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='community_service_hours.csv';a.click();
}
