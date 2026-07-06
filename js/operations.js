/* OpsCore 2.0 Demo — Operations: Philanthropy, Alumni, Ritual, Vendors, Health Score, Playbooks, Settings */
// ══════════════════════════════════════════════════
// PHILANTHROPY (fundraising)
// ══════════════════════════════════════════════════
// Events live on the shared D.events calendar (type:'philanthropy' or 'fundraiser') so
// Philanthropy's event list always matches what's on the Calendar page, not a separate copy.
function phEvents(){ return (D.events||[]).filter(e=>e.type==='philanthropy'||e.type==='fundraiser'); }

function renderPhilanthropy(){
  const ph=D.philanthropy;
  const events=phEvents();
  const funds=ph.funds||[];
  const totalRaised=Math.round(funds.reduce((s,f)=>s+parseFloat(f.amount||0),0)*100)/100;
  const avgPerEvent=events.length?Math.round(totalRaised/events.length*100)/100:0;
  const goal=ph.goals||{events:4,funds:2000};
  const goalProgress=goal.funds?Math.min(Math.round(totalRaised/goal.funds*100),999):0;

  document.getElementById('ph-kpi').innerHTML=
    kpi('Total Funds Raised','$'+totalRaised.toLocaleString(),getSemester(),'neutral')+
    kpi('Philanthropy Events',events.length,events.length>=goal.events?'Goal met':'Toward '+goal.events+' events',events.length>=goal.events?'up':'neutral')+
    kpi('Avg Raised / Event','$'+avgPerEvent.toLocaleString(),'Per event','neutral')+
    kpi('Goal Progress',goalProgress+'%','Toward $'+goal.funds.toLocaleString(),goalProgress>=75?'up':'neutral');

  const btn=document.getElementById('ph-goal-edit-btn'); if(btn)btn.style.display=canWrite()?'':'none';
  const addEvBtn=document.getElementById('ph-add-event-btn'); if(addEvBtn)addEvBtn.style.display=canWrite()?'':'none';
  const logFundsBtn=document.getElementById('ph-log-funds-btn'); if(logFundsBtn)logFundsBtn.style.display=canWrite()?'':'none';

  phRenderGoalBars();
  phRenderChart();
  phRenderEventRank();
  phRenderEvents();
  phRenderFundsLog();
  phRenderOrgs();
  phRenderVendors();
}

function phRenderGoalBars(){
  const ph=D.philanthropy;
  const goal=ph.goals||{events:4,funds:2000};
  const totalRaised=(ph.funds||[]).reduce((s,f)=>s+parseFloat(f.amount||0),0);
  const eventsCount=phEvents().length;
  const bars=[
    {title:'Funds Raised',cur:Math.round(totalRaised),tgt:goal.funds,prefix:'$'},
    {title:'Events',cur:eventsCount,tgt:goal.events,prefix:''},
  ];
  document.getElementById('ph-goal-bars').innerHTML=bars.map(b=>{
    const p=Math.min(Math.round(b.cur/b.tgt*100)||0,100);
    return `<div class="pr"><span class="pl">${b.title} (${b.prefix}${b.cur.toLocaleString()}/${b.prefix}${b.tgt.toLocaleString()})</span><div class="pb"><div class="pf" style="width:${p}%;background:${progressColor(p)}"></div></div><span class="pv">${p}%</span></div>`;
  }).join('');
}
function phOpenGoalEdit(){
  if(!canWrite()){toast('Only officers with Philanthropy access can edit goals.','error');return;}
  const goal=D.philanthropy.goals||{events:4,funds:2000};
  document.getElementById('phg-funds').value=goal.funds||'';
  document.getElementById('phg-events').value=goal.events||'';
  document.getElementById('m-ph-goal').classList.add('open');
}
async function phSaveGoal(){
  if(!canWrite())return;
  const funds=parseFloat(document.getElementById('phg-funds').value)||0;
  const events=parseFloat(document.getElementById('phg-events').value)||0;
  D.philanthropy.goals={funds,events};
  await saveData();
  closeM(null,document.getElementById('m-ph-goal'));
  renderPhilanthropy();
  toast('Goals updated','success');
}

function phRenderChart(){
  const funds=D.philanthropy.funds||[];
  const chartEl=document.getElementById('ph-chart');
  if(!chartEl)return;
  if(!funds.length){ chartEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No funds logged yet.</div>`; return; }
  const byWeek={};
  funds.forEach(f=>{
    if(!f.date)return;
    const d=new Date(f.date+'T12:00:00');
    const weekStart=new Date(d); weekStart.setDate(d.getDate()-d.getDay());
    const key=weekStart.toISOString().split('T')[0];
    byWeek[key]=(byWeek[key]||0)+parseFloat(f.amount||0);
  });
  const weeks=Object.keys(byWeek).sort().slice(-8);
  chartEl.innerHTML=miniBarChart(weeks.map(w=>({label:new Date(w+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}),val:byWeek[w]})),v=>'$'+Math.round(v).toLocaleString());
}

function phRenderEventRank(){
  const events=phEvents();
  const funds=D.philanthropy.funds||[];
  const el=document.getElementById('ph-event-rank');
  if(!el)return;
  const totals=events.map(e=>({e,total:funds.filter(f=>f.eventId===e.id).reduce((s,f)=>s+parseFloat(f.amount||0),0)})).sort((a,b)=>b.total-a.total).slice(0,6);
  if(!totals.length){ el.innerHTML=es('ti-trophy','pink','No events yet','Add an event and log funds to see rankings.',''); return; }
  const mx=Math.max(...totals.map(t=>t.total),1);
  el.innerHTML=totals.map(({e,total})=>`
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span style="font-weight:500">${esc(e.title)}</span><span style="color:var(--mt)">$${total.toLocaleString()}</span></div>
      <div class="pb"><div class="pf" style="width:${Math.round(total/mx*100)}%;background:#c0345a"></div></div>
    </div>`).join('');
}

function phRenderEvents(){
  const events=phEvents();
  const canEdit=canWrite();
  const el=document.getElementById('ph-events-table');
  if(!el)return;
  if(!events.length){ el.innerHTML=`<tbody><tr><td>${es('ti-heart','pink','No philanthropy events','Add an event to get started.',canEdit?`<button class="btn btn-p" onclick="phOpenAddEvent()">Add Event</button>`:'')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Org</th><th>Fund Goal</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    [...events].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<tr><td style="font-weight:500">${esc(e.title)}</td><td>${formatDateShort(e.date)}</td><td style="color:var(--mt)">${esc(e.org)||'—'}</td><td>${e.fundGoal?'$'+Number(e.fundGoal).toLocaleString():'—'}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="deletePhEvent('${e.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}

function phRenderFundsLog(){
  const funds=D.philanthropy.funds||[];
  const canEdit=canWrite();
  const el=document.getElementById('ph-funds-log');
  if(!el)return;
  if(!funds.length){ el.innerHTML=es('ti-coin','pink','No funds logged','Log money raised to track fundraising progress.',''); return; }
  el.innerHTML=[...funds].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(f=>{
    const donor=f.memberId?getMember(f.memberId).name:'External / Chapter';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bdr)">
      <div><div style="font-size:12px;font-weight:500">${esc(donor)}</div><div style="font-size:10.5px;color:var(--ht)">${formatDateShort(f.date)}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;font-weight:600;color:#c0345a">+$${Number(f.amount||0).toLocaleString()}</span>
        ${canEdit?`<button class="btn btn-d" style="height:20px;font-size:9px;padding:0 5px" onclick="deletePhFunds('${f.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button>`:''}
      </div>
    </div>`;
  }).join('');
}

function phRenderOrgs(){
  const orgs=D.philanthropy.organizations||[];
  const canEdit=canWrite();
  const el=document.getElementById('ph-orgs-table');
  if(!el)return;
  if(!orgs.length){ el.innerHTML=`<tbody><tr><td>${es('ti-building-community','pink','No organizations yet','Add the causes/organizations this chapter supports.','')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Organization</th><th>Contact</th><th>Notes</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    orgs.map(o=>`<tr><td style="font-weight:500">${esc(o.name)}</td><td style="color:var(--mt)">${esc(o.contact)||'—'}</td><td style="color:var(--mt)">${esc(o.notes)||'—'}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="phDeleteOrg('${o.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}

function phRenderVendors(){
  const vendors=D.philanthropy.vendors||[];
  const canEdit=canWrite();
  const el=document.getElementById('ph-vendors-table');
  if(!el)return;
  if(!vendors.length){ el.innerHTML=`<tbody><tr><td>${es('ti-truck-delivery','pink','No vendors or donors yet','Track who is donating or providing what for your events.','')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Name</th><th>Contact</th><th>Contribution</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${
    vendors.map(v=>`<tr><td style="font-weight:500">${esc(v.name)}</td><td style="color:var(--mt)">${esc(v.contact)||'—'}</td><td style="color:var(--mt)">${esc(v.contribution)||'—'}</td>${canEdit?`<td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="phDeleteVendor('${v.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button></td>`:''}</tr>`).join('')
  }</tbody>`;
}

// ── ACTIONS ──
function phOpenAddEvent(){
  if(!canWrite()){toast('Only officers with Philanthropy access can add events.','error');return;}
  ['ph-ev-title','ph-ev-date','ph-ev-goal','ph-ev-org','ph-ev-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('ph-ev-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('m-ph-addevent').classList.add('open');
}
async function phAddEvent(){
  if(!canWrite())return;
  const title=document.getElementById('ph-ev-title').value.trim();
  if(!title){toast('Event name is required','error');return;}
  const event={id:uid(),title,type:document.getElementById('ph-ev-type').value,date:document.getElementById('ph-ev-date').value||new Date().toISOString().split('T')[0],fundGoal:parseFloat(document.getElementById('ph-ev-goal').value)||0,org:document.getElementById('ph-ev-org').value.trim(),notes:document.getElementById('ph-ev-notes').value.trim(),mandatory:false};
  D.events.push(event);
  await saveData();
  closeM(null,document.getElementById('m-ph-addevent'));
  renderPhilanthropy();
  if(typeof renderCalendar==='function')renderCalendar();
  toast('Event added','success');
}
function phOpenLogFunds(){
  if(!canWrite()){toast('Only officers with Philanthropy access can log funds.','error');return;}
  const memberSel=document.getElementById('pf-member');
  memberSel.innerHTML='<option value="">— Chapter / External —</option>'+memberSelectOptions();
  const eventSel=document.getElementById('pf-event');
  eventSel.innerHTML='<option value="">-- General --</option>'+phEvents().map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('');
  document.getElementById('pf-amount').value='';
  document.getElementById('pf-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('pf-notes').value='';
  document.getElementById('m-ph-logfunds').classList.add('open');
}
async function phLogFunds(){
  if(!canWrite())return;
  const amount=parseFloat(document.getElementById('pf-amount').value);
  if(!amount||amount<=0){toast('Enter a valid amount','error');return;}
  const log={id:uid(),amount,memberId:document.getElementById('pf-member').value||null,date:document.getElementById('pf-date').value||new Date().toISOString().split('T')[0],eventId:document.getElementById('pf-event').value||null,notes:document.getElementById('pf-notes').value.trim()};
  D.philanthropy.funds.push(log);
  await saveData();
  closeM(null,document.getElementById('m-ph-logfunds'));
  renderPhilanthropy();
  toast('$'+amount.toLocaleString()+' logged','success');
}
function phOpenAddOrg(){
  if(!canWrite()){toast('Only officers with Philanthropy access can add organizations.','error');return;}
  ['ph-org-name','ph-org-contact','ph-org-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-ph-addorg').classList.add('open');
}
async function phAddOrg(){
  if(!canWrite())return;
  const name=document.getElementById('ph-org-name').value.trim();
  if(!name){toast('Organization name is required','error');return;}
  const org={id:uid(),name,contact:document.getElementById('ph-org-contact').value.trim(),notes:document.getElementById('ph-org-notes').value.trim()};
  D.philanthropy.organizations.push(org);
  await saveData();
  closeM(null,document.getElementById('m-ph-addorg'));
  renderPhilanthropy();
  toast('Organization added','success');
}
async function phDeleteOrg(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Remove Organization','Remove this organization?');
  if(!ok)return;
  D.philanthropy.organizations=D.philanthropy.organizations.filter(o=>o.id!==id);
  await saveData();
  renderPhilanthropy();
  toast('Organization removed','info');
}
function phOpenAddVendor(){
  if(!canWrite()){toast('Only officers with Philanthropy access can add vendors.','error');return;}
  ['ph-vd-name','ph-vd-contact','ph-vd-contribution','ph-vd-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-ph-addvendor').classList.add('open');
}
async function phAddVendor(){
  if(!canWrite())return;
  const name=document.getElementById('ph-vd-name').value.trim();
  if(!name){toast('Vendor/donor name is required','error');return;}
  const vendor={id:uid(),name,contact:document.getElementById('ph-vd-contact').value.trim(),contribution:document.getElementById('ph-vd-contribution').value.trim(),notes:document.getElementById('ph-vd-notes').value.trim()};
  D.philanthropy.vendors.push(vendor);
  await saveData();
  closeM(null,document.getElementById('m-ph-addvendor'));
  renderPhilanthropy();
  toast('Vendor added','success');
}
async function phDeleteVendor(id){
  if(!canWrite())return;
  const ok=await confirmDialog('Remove Vendor','Remove this vendor/donor?');
  if(!ok)return;
  D.philanthropy.vendors=D.philanthropy.vendors.filter(v=>v.id!==id);
  await saveData();
  renderPhilanthropy();
  toast('Vendor removed','info');
}
function phExport(){
  const funds=D.philanthropy.funds||[];
  const events=phEvents();
  let csv='Donor,Amount,Event,Date,Notes\n';
  funds.forEach(f=>{
    const ev=events.find(e=>e.id===f.eventId);
    const donor=f.memberId?getMember(f.memberId).name:'External / Chapter';
    csv+=`${donor},${f.amount},${ev?ev.title:'General'},${f.date},${(f.notes||'').replace(/,/g,';')}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='philanthropy_fundraising.csv';a.click();
}


// ══════════════════════════════════════════════════
// ALUMNI RELATIONS
// ══════════════════════════════════════════════════
function renderAlumni(){
  const al=D.alumni;
  const active=al.contacts.filter(a=>a.engagement==='Active').length;
  const recent=al.outreach.filter(o=>{if(!o.date)return false;return(new Date()-new Date(o.date+'T12:00:00'))<30*86400000;}).length;
  document.getElementById('al-kpi').innerHTML=
    kpi('Total Alumni',al.contacts.length,'In directory','neutral')+
    kpi('Active',active,'Engaged alumni','neutral')+
    kpi('Recent Contacts',recent,'Last 30 days','neutral')+
    kpi('Alumni Events',al.events.length,'On record','neutral');
  alRenderDirectory();
}
function alTab(el,tab){
  document.querySelectorAll('[data-tab^="al-"]').forEach(b=>b.className='btn');
  el.className='btn btn-p';
  ['al-directory','al-events','al-outreach'].forEach(t=>{const e=document.getElementById(t);if(e)e.style.display=t===tab?'':'none';});
  const addBtn=document.getElementById('al-add-btn');
  if(addBtn){if(tab==='al-directory'){addBtn.textContent=''; addBtn.innerHTML='<i class="ti ti-plus"></i> Add Alumni';addBtn.onclick=alOpenAdd;}
  else if(tab==='al-events'){addBtn.innerHTML='<i class="ti ti-plus"></i> Add Event';addBtn.onclick=alOpenAddEvent;}
  else{addBtn.innerHTML='<i class="ti ti-plus"></i> Log Contact';addBtn.onclick=alOpenLogContact;}}
  if(tab==='al-directory')alRenderDirectory();
  else if(tab==='al-events')alRenderEvents();
  else alRenderOutreach();
}
function alFilter(){alRenderDirectory();}
function alRenderDirectory(){
  const q=document.getElementById('al-search')?.value?.toLowerCase()||'';
  let rows=D.alumni.contacts;
  if(q)rows=rows.filter(a=>a.name.toLowerCase().includes(q)||(a.employer||'').toLowerCase().includes(q)||(a.location||'').toLowerCase().includes(q));
  const engColor={Active:'bg2',Occasional:'ba2',Inactive:'bm2'};
  document.getElementById('al-table').innerHTML=`<thead><tr><th>Name</th><th>Class</th><th>Employer</th><th>Industry</th><th>Location</th><th>Engagement</th><th></th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td style="font-weight:500">${a.name}</td><td>${a.gradYear||'—'}</td><td>${a.employer||'—'}</td><td style="color:var(--mt)">${a.industry||'—'}</td><td style="color:var(--mt)">${a.location||'—'}</td><td><span class="badge ${engColor[a.engagement]||'bm2'}">${a.engagement||'Unknown'}</span></td><td><button class="btn btn-d" style="height:23px;font-size:10px;padding:0 7px" onclick="deleteAlumni('${a.id}')"><i class="ti ti-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--ht);padding:24px">No alumni in directory yet. Add the first one!</td></tr>'}</tbody>`;
}
function alRenderEvents(){
  const ev=D.alumni.events;
  document.getElementById('al-events-table').innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Type</th><th>Location</th><th>Notes</th></tr></thead><tbody>${ev.length?ev.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<tr><td style="font-weight:500">${e.title}</td><td>${formatDateShort(e.date)}</td><td><span class="badge bb2">${e.type}</span></td><td style="color:var(--mt)">${e.location||'—'}</td><td style="color:var(--mt);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.notes||'—'}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ht);padding:24px">No alumni events yet.</td></tr>'}</tbody>`;
}
function alRenderOutreach(){
  const log=[...D.alumni.outreach].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const methIcon={Email:'ti-mail',Phone:'ti-phone',Text:'ti-message','In Person':'ti-user-check',LinkedIn:'ti-brand-linkedin'};
  document.getElementById('al-outreach-list').innerHTML=log.length?log.map(o=>{
    const al=D.alumni.contacts.find(a=>a.id===o.alumniId)||{name:'Unknown'};
    const by=getMember(o.byId)||{name:'Unknown'};
    return`<div class="al-row"><div class="al-ic" style="background:var(--bl-bg);color:var(--bl-tx)"><i class="ti ${methIcon[o.method]||'ti-mail'}"></i></div><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:500">${al.name}</div><div style="font-size:10.5px;color:var(--mt);margin-top:1px">${o.method} · ${formatDateShort(o.date)} · by ${by.name.split(' ')[0]}</div>${o.notes?`<div style="font-size:11px;color:var(--tx);margin-top:4px;line-height:1.5">${o.notes}</div>`:''}</div></div>`;
  }).join(''):es('ti-phone-off','blue','No outreach logged','Log alumni contacts to track your outreach.','');
}
function alOpenAdd(){
  ['al-name','al-email','al-phone','al-employer','al-location','al-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('al-gradyear').value='';
  document.getElementById('m-al-add').classList.add('open');
}
function alAddAlumni(){
  const name=document.getElementById('al-name').value.trim();
  if(!name){toast('Name is required','error');return;}
  D.alumni.contacts.push({id:uid(),name,gradYear:document.getElementById('al-gradyear').value||'',email:document.getElementById('al-email').value.trim(),phone:document.getElementById('al-phone').value.trim(),employer:document.getElementById('al-employer').value.trim(),industry:document.getElementById('al-industry').value,location:document.getElementById('al-location').value.trim(),engagement:document.getElementById('al-engage').value,notes:document.getElementById('al-notes').value.trim()});
  saveData();closeM(null,document.getElementById('m-al-add'));renderAlumni();toast('Alumni added','success');
}
function alOpenAddEvent(){
  document.getElementById('ale-date').value=new Date().toISOString().split('T')[0];
  ['ale-title','ale-location','ale-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('m-al-addevent').classList.add('open');
}
function alAddEvent(){
  const title=document.getElementById('ale-title').value.trim();
  if(!title){toast('Event name is required','error');return;}
  D.alumni.events.push({id:uid(),title,date:document.getElementById('ale-date').value,type:document.getElementById('ale-type').value,location:document.getElementById('ale-location').value.trim(),notes:document.getElementById('ale-notes').value.trim()});
  saveData();closeM(null,document.getElementById('m-al-addevent'));alRenderEvents();toast('Event added','success');
}
function alOpenLogContact(){
  const asel=document.getElementById('alc-alumni');asel.innerHTML=D.alumni.contacts.map(a=>`<option value="${a.id}">${a.name} ('${(a.gradYear||'??').toString().slice(-2)})</option>`).join('');
  if(!D.alumni.contacts.length){toast('Add alumni to the directory first','info');return;}
  const bsel=document.getElementById('alc-by');bsel.innerHTML=memberSelectOptions();if(CURRENT_USER)bsel.value=CURRENT_USER.mid;
  document.getElementById('alc-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('alc-notes').value='';
  document.getElementById('m-al-contact').classList.add('open');
}
function alLogContact(){
  const alumniId=document.getElementById('alc-alumni').value;
  if(!alumniId){toast('Select an alumni','error');return;}
  D.alumni.outreach.push({id:uid(),alumniId,date:document.getElementById('alc-date').value,method:document.getElementById('alc-method').value,byId:document.getElementById('alc-by').value,notes:document.getElementById('alc-notes').value.trim()});
  // Update last contact on alumni record
  const al=D.alumni.contacts.find(a=>a.id===alumniId);if(al)al.lastContact=document.getElementById('alc-date').value;
  saveData();closeM(null,document.getElementById('m-al-contact'));alRenderOutreach();toast('Contact logged','success');
}

// ══════════════════════════════════════════════════
// CHAPLAIN HUB (page key stays 'ritual') — Bible study, brotherhood events, ritual checklist
// ══════════════════════════════════════════════════
// Anyone who can access this page can edit it — matches how this page already worked (no
// separate edit-tier existed here before), so viewer is the only role that gets a restricted,
// read-only view (approved/upcoming events + next Bible study only, no costs/owner/notes).
function chFull(){ return !!CURRENT_USER && CURRENT_USER.role!=='viewer'; }
function chBibleStudies(){ return D.chaplainHub.bibleStudies||[]; }
function chEvents(){ return D.chaplainHub.events||[]; }
function chTasks(){ return D.chaplainHub.tasks||[]; }
function chDaysAgo(dateStr){ if(!dateStr)return Infinity; return (Date.now()-new Date(dateStr+'T12:00:00').getTime())/86400000; }

const CH_EVENT_TYPES=[{v:'movie',l:'Movie Night'},{v:'golf',l:'Golf'},{v:'bags',l:'Bags Tournament'},{v:'meal',l:'Brotherhood Meal'},{v:'sports',l:'Sports/Rec'},{v:'retreat',l:'Retreat'},{v:'custom',l:'Other'}];
function chEventTypeLabel(v){ return (CH_EVENT_TYPES.find(t=>t.v===v)||{}).l||v||'Other'; }
const CH_PLANNING_STATUSES=[{v:'idea',l:'Idea',c:'bm2'},{v:'planning',l:'Planning',c:'ba2'},{v:'scheduled',l:'Scheduled',c:'bb2'},{v:'completed',l:'Completed',c:'bg2'}];
function chStatusLabel(v){ return (CH_PLANNING_STATUSES.find(s=>s.v===v)||{}).l||v; }
function chStatusClass(v){ return (CH_PLANNING_STATUSES.find(s=>s.v===v)||{}).c||'bm2'; }
const CH_BS_STATUSES=[{v:'planned',l:'Planned',c:'bb2'},{v:'completed',l:'Completed',c:'bg2'},{v:'canceled',l:'Canceled',c:'br2'}];
function chBsStatusLabel(v){ return (CH_BS_STATUSES.find(s=>s.v===v)||{}).l||v; }
function chBsStatusClass(v){ return (CH_BS_STATUSES.find(s=>s.v===v)||{}).c||'bm2'; }
const CH_MEMBER_VISIBLE_EVENT_STATUSES=['scheduled','completed'];
const CH_QUICK_TASKS=['Confirm venue','Create signup form','Announce event','Collect RSVPs','Follow up with members','Record attendance','Add reflection notes'];

function renderRitual(){
  const full=chFull();
  const fullEl=document.getElementById('ch-full-view');
  const memberEl=document.getElementById('ch-member-view');
  const actionsEl=document.getElementById('ch-full-actions');
  if(fullEl)fullEl.style.display=full?'':'none';
  if(memberEl)memberEl.style.display=full?'none':'';
  if(actionsEl)actionsEl.style.display=full?'':'none';
  if(full){
    chRenderKpis();
    chRenderBibleStudies();
    chRenderEvents();
    chRenderKanban();
    chRenderAnalytics();
    chRenderTasks();
    riRenderProgram();
  }else{
    chRenderMemberView();
  }
}

function chRenderKpis(){
  const today=new Date().toISOString().split('T')[0];
  const events=chEvents(); const studies=chBibleStudies();
  const upcomingEvents=events.filter(e=>e.date>=today && e.planningStatus!=='completed');
  const activeEventPlans=events.filter(e=>['idea','planning','scheduled'].includes(e.planningStatus));
  const completedEvents=events.filter(e=>e.planningStatus==='completed');
  const rated=completedEvents.filter(e=>e.rating!=null);
  const avgRating=rated.length?(rated.reduce((s,e)=>s+Number(e.rating),0)/rated.length).toFixed(1):null;
  const recentStudies=studies.filter(s=>s.status==='completed' && s.attendanceCount!=null && chDaysAgo(s.date)<=90);
  const bsAvgAtt=recentStudies.length?Math.round(recentStudies.reduce((s,x)=>s+Number(x.attendanceCount),0)/recentStudies.length):null;
  const roster=D.members.length||1;
  const engagementSamples=[...recentStudies.map(s=>Number(s.attendanceCount)),...completedEvents.filter(e=>e.actualAttendance!=null && chDaysAgo(e.date)<=90).map(e=>Number(e.actualAttendance))];
  const engagementPct=engagementSamples.length?Math.round((engagementSamples.reduce((a,b)=>a+b,0)/engagementSamples.length)/roster*100):null;
  document.getElementById('ri-kpi').innerHTML=
    kpi('Upcoming Brotherhood Events',upcomingEvents.length,'On the calendar','neutral')+
    kpi('Bible Study Attendance',bsAvgAtt!=null?bsAvgAtt:'—',bsAvgAtt!=null?'Avg, last 90 days':'No completed studies yet','neutral')+
    kpi('Active Event Plans',activeEventPlans.length,'Idea + Planning + Scheduled','neutral')+
    kpi('Member Engagement',engagementPct!=null?engagementPct+'%':'—',engagementPct!=null?'Of roster, last 90 days':'No recent data yet',engagementPct!=null?(engagementPct>=50?'up':'down'):'neutral')+
    kpi('Past Events Completed',completedEvents.length,'All-time','neutral')+
    kpi('Avg Event Rating',avgRating!=null?avgRating+'/5':'—',rated.length?rated.length+' rated event'+(rated.length!==1?'s':''):'No ratings yet','neutral');
}

function chRenderBibleStudies(){
  const el=document.getElementById('ch-bs-table'); if(!el)return;
  const list=[...chBibleStudies()].sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){ el.innerHTML=`<tbody><tr><td>${es('ti-book-2','pink','No Bible studies yet','Plan your first Bible study session.','<button class="btn btn-p" onclick="chOpenAddBibleStudy()">Add Bible Study</button>')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Date</th><th>Topic</th><th>Scripture</th><th>Attendance</th><th>Status</th><th></th></tr></thead><tbody>${
    list.map(s=>`<tr>
      <td>${formatDateShort(s.date)}${s.time?' '+to12h(s.time):''}</td>
      <td style="font-weight:500">${s.topic||'—'}</td>
      <td>${s.scripture||'—'}</td>
      <td>${s.attendanceCount!=null?s.attendanceCount:'—'}</td>
      <td><span class="badge ${chBsStatusClass(s.status)}">${chBsStatusLabel(s.status)}</span></td>
      <td style="white-space:nowrap"><button class="btn" style="height:22px;font-size:10px;padding:0 6px" onclick="chOpenEditBibleStudy('${s.id}')"><i class="ti ti-edit"></i></button> <button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="chDeleteBibleStudy('${s.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`).join('')
  }</tbody>`;
}
function chOpenAddBibleStudy(){
  document.getElementById('ch-bs-id').value='';
  document.getElementById('ch-bs-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('ch-bs-time').value='';document.getElementById('ch-bs-topic').value='';document.getElementById('ch-bs-scripture').value='';
  document.getElementById('ch-bs-questions').value='';document.getElementById('ch-bs-attendance').value='';document.getElementById('ch-bs-notes').value='';
  document.getElementById('ch-bs-status').value='planned';
  document.getElementById('m-ch-biblestudy').classList.add('open');
}
function chOpenEditBibleStudy(id){
  const s=chBibleStudies().find(x=>x.id===id); if(!s)return;
  document.getElementById('ch-bs-id').value=s.id;
  document.getElementById('ch-bs-date').value=s.date||'';document.getElementById('ch-bs-time').value=s.time||'';
  document.getElementById('ch-bs-topic').value=s.topic||'';document.getElementById('ch-bs-scripture').value=s.scripture||'';
  document.getElementById('ch-bs-questions').value=s.discussionQuestions||'';
  document.getElementById('ch-bs-attendance').value=s.attendanceCount!=null?s.attendanceCount:'';
  document.getElementById('ch-bs-notes').value=s.notes||'';document.getElementById('ch-bs-status').value=s.status||'planned';
  document.getElementById('m-ch-biblestudy').classList.add('open');
}
async function chSaveBibleStudy(){
  const id=document.getElementById('ch-bs-id').value;
  const date=document.getElementById('ch-bs-date').value;
  const topic=document.getElementById('ch-bs-topic').value.trim();
  if(!date||!topic){toast('Date and topic are required','error');return;}
  const fields={date,time:document.getElementById('ch-bs-time').value,topic,scripture:document.getElementById('ch-bs-scripture').value.trim(),discussionQuestions:document.getElementById('ch-bs-questions').value.trim(),attendanceCount:document.getElementById('ch-bs-attendance').value===''?null:parseInt(document.getElementById('ch-bs-attendance').value),notes:document.getElementById('ch-bs-notes').value.trim(),status:document.getElementById('ch-bs-status').value};
  if(id){const s=chBibleStudies().find(x=>x.id===id);if(s)Object.assign(s,fields);}
  else D.chaplainHub.bibleStudies.push({id:uid(),...fields});
  await saveData();closeM(null,document.getElementById('m-ch-biblestudy'));renderRitual();toast(id?'Bible study updated':'Bible study added','success');
}
async function chDeleteBibleStudy(id){
  const ok=await confirmDialog('Delete Bible Study','Delete this Bible study?');if(!ok)return;
  D.chaplainHub.bibleStudies=D.chaplainHub.bibleStudies.filter(x=>x.id!==id);
  await saveData();renderRitual();toast('Bible study deleted','info');
}

function chRenderEvents(){
  const el=document.getElementById('ch-events-table'); if(!el)return;
  const list=[...chEvents()].sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){ el.innerHTML=`<tbody><tr><td>${es('ti-users-group','pink','No brotherhood events yet','Plan a movie night, golf outing, or other morale event.','<button class="btn btn-p" onclick="chOpenAddEvent()">Add Event</button>')}</td></tr></tbody>`; return; }
  el.innerHTML=`<thead><tr><th>Name</th><th>Type</th><th>Date</th><th>Location</th><th>Est. Cost</th><th>Attendance</th><th>Status</th><th>Rating</th><th></th></tr></thead><tbody>${
    list.map(e=>`<tr>
      <td style="font-weight:500">${e.name}</td><td>${chEventTypeLabel(e.type)}</td><td>${formatDateShort(e.date)}</td><td>${e.location||'—'}</td>
      <td>${e.estCost!=null?'$'+Number(e.estCost).toLocaleString():'—'}</td>
      <td>${e.actualAttendance!=null?e.actualAttendance:(e.expectedAttendance!=null?'~'+e.expectedAttendance+' exp.':'—')}</td>
      <td><span class="badge ${chStatusClass(e.planningStatus)}">${chStatusLabel(e.planningStatus)}</span></td>
      <td>${e.rating!=null?e.rating+'/5':'—'}</td>
      <td style="white-space:nowrap"><button class="btn" style="height:22px;font-size:10px;padding:0 6px" onclick="chOpenEditEvent('${e.id}')"><i class="ti ti-edit"></i></button> <button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="chDeleteEvent('${e.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`).join('')
  }</tbody>`;
}
function chEventTypeOptions(sel){ return CH_EVENT_TYPES.map(t=>`<option value="${t.v}" ${sel===t.v?'selected':''}>${t.l}</option>`).join(''); }
function chStatusOptions(sel){ return CH_PLANNING_STATUSES.map(s=>`<option value="${s.v}" ${sel===s.v?'selected':''}>${s.l}</option>`).join(''); }
function chToggleEventCompletedFields(){
  const wrap=document.getElementById('ch-ev-completed-fields');
  if(wrap)wrap.style.display=document.getElementById('ch-ev-status').value==='completed'?'':'none';
}
function chOpenAddEvent(){
  document.getElementById('ch-ev-id').value='';document.getElementById('ch-ev-name').value='';
  document.getElementById('ch-ev-type').innerHTML=chEventTypeOptions('movie');
  document.getElementById('ch-ev-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('ch-ev-time').value='';document.getElementById('ch-ev-location').value='';
  document.getElementById('ch-ev-cost').value='';document.getElementById('ch-ev-expected').value='';document.getElementById('ch-ev-actual').value='';
  document.getElementById('ch-ev-status').innerHTML=chStatusOptions('idea');
  document.getElementById('ch-ev-owner').innerHTML='<option value="">Unassigned</option>'+sortedMembers().map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('ch-ev-notes').value='';document.getElementById('ch-ev-rating').value='';document.getElementById('ch-ev-reflection').value='';
  chToggleEventCompletedFields();
  document.getElementById('m-ch-event').classList.add('open');
}
function chOpenEditEvent(id){
  const e=chEvents().find(x=>x.id===id); if(!e)return;
  document.getElementById('ch-ev-id').value=e.id;document.getElementById('ch-ev-name').value=e.name;
  document.getElementById('ch-ev-type').innerHTML=chEventTypeOptions(e.type);
  document.getElementById('ch-ev-date').value=e.date||'';document.getElementById('ch-ev-time').value=e.time||'';
  document.getElementById('ch-ev-location').value=e.location||'';
  document.getElementById('ch-ev-cost').value=e.estCost!=null?e.estCost:'';
  document.getElementById('ch-ev-expected').value=e.expectedAttendance!=null?e.expectedAttendance:'';
  document.getElementById('ch-ev-actual').value=e.actualAttendance!=null?e.actualAttendance:'';
  document.getElementById('ch-ev-status').innerHTML=chStatusOptions(e.planningStatus);
  document.getElementById('ch-ev-owner').innerHTML='<option value="">Unassigned</option>'+sortedMembers().map(m=>`<option value="${m.id}" ${e.owner===m.id?'selected':''}>${m.name}</option>`).join('');
  document.getElementById('ch-ev-notes').value=e.notes||'';
  document.getElementById('ch-ev-rating').value=e.rating!=null?e.rating:'';document.getElementById('ch-ev-reflection').value=e.reflection||'';
  chToggleEventCompletedFields();
  document.getElementById('m-ch-event').classList.add('open');
}
async function chSaveEvent(){
  const id=document.getElementById('ch-ev-id').value;
  const name=document.getElementById('ch-ev-name').value.trim();
  const date=document.getElementById('ch-ev-date').value;
  if(!name||!date){toast('Name and date are required','error');return;}
  const fields={name,type:document.getElementById('ch-ev-type').value,date,time:document.getElementById('ch-ev-time').value,location:document.getElementById('ch-ev-location').value.trim(),estCost:document.getElementById('ch-ev-cost').value===''?null:parseFloat(document.getElementById('ch-ev-cost').value),expectedAttendance:document.getElementById('ch-ev-expected').value===''?null:parseInt(document.getElementById('ch-ev-expected').value),actualAttendance:document.getElementById('ch-ev-actual').value===''?null:parseInt(document.getElementById('ch-ev-actual').value),planningStatus:document.getElementById('ch-ev-status').value,owner:document.getElementById('ch-ev-owner').value||null,notes:document.getElementById('ch-ev-notes').value.trim(),rating:document.getElementById('ch-ev-rating').value===''?null:parseInt(document.getElementById('ch-ev-rating').value),reflection:document.getElementById('ch-ev-reflection').value.trim()};
  if(id){const e=chEvents().find(x=>x.id===id);if(e)Object.assign(e,fields);}
  else D.chaplainHub.events.push({id:uid(),...fields});
  await saveData();closeM(null,document.getElementById('m-ch-event'));renderRitual();toast(id?'Event updated':'Event added','success');
}
async function chDeleteEvent(id){
  const ok=await confirmDialog('Delete Event','Delete this brotherhood event?');if(!ok)return;
  D.chaplainHub.events=D.chaplainHub.events.filter(x=>x.id!==id);
  await saveData();renderRitual();toast('Event deleted','info');
}

let CH_DRAG_ID=null;
function chRenderKanban(){
  const kanban=document.getElementById('ch-kanban'); if(!kanban)return;
  kanban.innerHTML=CH_PLANNING_STATUSES.map(stage=>{
    const items=chEvents().filter(e=>e.planningStatus===stage.v);
    return `<div class="rc-col">
      <div class="rc-col-head" style="border-top-color:${stage.v==='completed'?'var(--gn)':stage.v==='scheduled'?'var(--sky)':stage.v==='planning'?'var(--am)':'#9CA3AF'}">
        <span style="font-size:11.5px;font-weight:500">${stage.l}</span><span style="font-size:10.5px;color:var(--mt)">${items.length}</span>
      </div>
      <div class="rc-col-body rc-col-drop" id="chkd-${stage.v}" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="chDrop(event,'${stage.v}')">
        ${items.map(e=>`<div class="rc-card" draggable="true" id="chkc-${e.id}" ondragstart="chDragStart('${e.id}')" ondragend="document.querySelectorAll('.rc-col-drop').forEach(c=>c.classList.remove('drag-over'))" onclick="chOpenEditEvent('${e.id}')">
          <div style="font-size:12px;font-weight:500;margin-bottom:4px">${e.name}</div>
          <div style="font-size:10.5px;color:var(--mt)">${chEventTypeLabel(e.type)} · ${formatDateShort(e.date)}</div>
          <div style="font-size:10px;color:var(--ht);margin-top:3px">${e.owner?getMember(e.owner).name.split(' ')[0]:'Unassigned'}</div>
        </div>`).join('')||`<div style="padding:14px;text-align:center;font-size:11px;color:var(--ht)">Drop here</div>`}
      </div>
    </div>`;
  }).join('');
}
function chDragStart(id){ CH_DRAG_ID=id; }
async function chDrop(event,stage){
  event.preventDefault(); event.currentTarget.classList.remove('drag-over');
  if(!CH_DRAG_ID)return;
  const e=chEvents().find(x=>x.id===CH_DRAG_ID); CH_DRAG_ID=null;
  if(!e||e.planningStatus===stage)return;
  e.planningStatus=stage;
  await saveData();renderRitual();toast(e.name+' moved to '+chStatusLabel(stage),'success');
}

function chRenderAnalytics(){
  const byTypeEl=document.getElementById('ch-chart-type');
  if(byTypeEl){
    const withAtt=chEvents().filter(e=>e.actualAttendance!=null);
    const types=[...new Set(withAtt.map(e=>e.type))];
    if(!types.length){byTypeEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No completed events with recorded attendance yet.</div>`;}
    else{const pts=types.map(t=>{const inT=withAtt.filter(e=>e.type===t);return{label:chEventTypeLabel(t),val:Math.round(inT.reduce((s,e)=>s+Number(e.actualAttendance),0)/inT.length)};});byTypeEl.innerHTML=miniBarChart(pts,v=>v+' avg');}
  }
  const bsTrendEl=document.getElementById('ch-chart-bstrend');
  if(bsTrendEl){
    const withAtt=chBibleStudies().filter(s=>s.status==='completed'&&s.attendanceCount!=null).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);
    if(!withAtt.length){bsTrendEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No completed Bible studies with recorded attendance yet.</div>`;}
    else{bsTrendEl.innerHTML=miniBarChart(withAtt.map(s=>({label:formatDateShort(s.date),val:Number(s.attendanceCount)})),v=>v);}
  }
  const byMonthEl=document.getElementById('ch-chart-month');
  if(byMonthEl){
    const completed=chEvents().filter(e=>e.planningStatus==='completed');
    if(!completed.length){byMonthEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No completed events yet.</div>`;}
    else{const byMonth={};completed.forEach(e=>{const mo=(e.date||'').slice(0,7);if(!mo)return;byMonth[mo]=(byMonth[mo]||0)+1;});const months=Object.keys(byMonth).sort();byMonthEl.innerHTML=miniBarChart(months.map(mo=>({label:new Date(mo+'-01T12:00:00').toLocaleDateString('en-US',{month:'short'}),val:byMonth[mo]})),v=>v+' event'+(v!==1?'s':''));}
  }
  const engTrendEl=document.getElementById('ch-chart-engagement');
  if(engTrendEl){
    const roster=D.members.length||1;
    const samples=[...chBibleStudies().filter(s=>s.status==='completed'&&s.attendanceCount!=null).map(s=>({date:s.date,val:Number(s.attendanceCount)})),...chEvents().filter(e=>e.planningStatus==='completed'&&e.actualAttendance!=null).map(e=>({date:e.date,val:Number(e.actualAttendance)}))];
    if(samples.length<2){engTrendEl.innerHTML=`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">Not enough attendance history yet.</div>`;}
    else{const byMonth={};samples.forEach(s=>{const mo=(s.date||'').slice(0,7);if(!mo)return;if(!byMonth[mo])byMonth[mo]=[];byMonth[mo].push(s.val);});const months=Object.keys(byMonth).sort();const pts=months.map(mo=>({label:new Date(mo+'-01T12:00:00').toLocaleDateString('en-US',{month:'short'}),val:Math.min(100,Math.round((byMonth[mo].reduce((a,b)=>a+b,0)/byMonth[mo].length)/roster*100))}));engTrendEl.innerHTML=miniBarChart(pts,v=>v+'%');}
  }
}

function chRenderTasks(){
  const chipsEl=document.getElementById('ch-quick-chips');
  if(chipsEl && !chipsEl._built){chipsEl.innerHTML=CH_QUICK_TASKS.map(l=>`<span class="rc-tag" onclick="chQuickAddTask('${l.replace(/'/g,"\\'")}')" style="cursor:pointer">+ ${l}</span>`).join('');chipsEl._built=true;}
  const el=document.getElementById('ch-tasks-list'); if(!el)return;
  const list=chTasks();
  if(!list.length){el.innerHTML=es('ti-list-check','pink','No pending actions','Add a follow-up task or use a quick-add chip below.','');return;}
  const sorted=[...list].sort((a,b)=>(a.done===b.done?0:a.done?1:-1)||(a.dueDate||'').localeCompare(b.dueDate||''));
  el.innerHTML=sorted.map(t=>{
    const linked=t.linkedType==='event'?chEvents().find(x=>x.id===t.linkedId):t.linkedType==='bibleStudy'?chBibleStudies().find(x=>x.id===t.linkedId):null;
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bdr)">
      <div class="tc ${t.done?'done':''}" onclick="chToggleTask('${t.id}')">${t.done?'<i class="ti ti-check" style="font-size:9px"></i>':''}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;${t.done?'text-decoration:line-through;color:var(--mt)':''}">${t.label}${linked?' <span style="color:var(--ht);font-weight:400">— '+(t.linkedType==='event'?linked.name:linked.topic||'Bible Study')+'</span>':''}</div>
      <div style="font-size:10px;color:var(--ht)">${t.assignedTo?getMember(t.assignedTo).name:'Unassigned'}${t.dueDate?' · Due '+formatDateShort(t.dueDate):''}</div></div>
      <button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="chDeleteTask('${t.id}')"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');
}
async function chQuickAddTask(label){
  D.chaplainHub.tasks.push({id:uid(),label,linkedType:null,linkedId:null,assignedTo:null,dueDate:null,done:false});
  await saveData();chRenderTasks();toast('Task added','success');
}
function chOpenAddTask(){
  document.getElementById('ch-tk-label').value='';
  const linkSel=document.getElementById('ch-tk-linked');
  linkSel.innerHTML='<option value="">None</option>'+chEvents().map(e=>`<option value="event:${e.id}">Event — ${e.name}</option>`).join('')+chBibleStudies().map(s=>`<option value="bibleStudy:${s.id}">Bible Study — ${s.topic||formatDateShort(s.date)}</option>`).join('');
  document.getElementById('ch-tk-assigned').innerHTML='<option value="">Unassigned</option>'+sortedMembers().map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('ch-tk-due').value='';
  document.getElementById('m-ch-task').classList.add('open');
}
async function chSaveTask(){
  const label=document.getElementById('ch-tk-label').value.trim();
  if(!label){toast('Task label is required','error');return;}
  const linkedRaw=document.getElementById('ch-tk-linked').value;
  const [linkedType,linkedId]=linkedRaw?linkedRaw.split(':'):[null,null];
  D.chaplainHub.tasks.push({id:uid(),label,linkedType:linkedType||null,linkedId:linkedId||null,assignedTo:document.getElementById('ch-tk-assigned').value||null,dueDate:document.getElementById('ch-tk-due').value||null,done:false});
  await saveData();closeM(null,document.getElementById('m-ch-task'));chRenderTasks();toast('Task added','success');
}
async function chToggleTask(id){
  const t=chTasks().find(x=>x.id===id); if(!t)return;
  t.done=!t.done; await saveData();chRenderTasks();
}
async function chDeleteTask(id){
  D.chaplainHub.tasks=D.chaplainHub.tasks.filter(x=>x.id!==id);
  await saveData();chRenderTasks();
}

function chRenderMemberView(){
  const el=document.getElementById('ch-member-content'); if(!el)return;
  const today=new Date().toISOString().split('T')[0];
  const nextStudy=[...chBibleStudies()].filter(s=>s.status==='planned'&&s.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const visibleEvents=[...chEvents()].filter(e=>CH_MEMBER_VISIBLE_EVENT_STATUSES.includes(e.planningStatus)).sort((a,b)=>a.date.localeCompare(b.date));
  el.innerHTML=`
    <div class="card" style="margin-bottom:11px">
      <div class="card-hd"><span class="card-t">Next Bible Study</span></div>
      ${nextStudy?`<div style="font-size:13px;font-weight:500">${nextStudy.topic||'Bible Study'}</div><div style="font-size:11px;color:var(--mt)">${formatDateShort(nextStudy.date)}${nextStudy.time?' at '+to12h(nextStudy.time):''}</div>`:es('ti-book-2','pink','Nothing scheduled yet','Check back soon for the next Bible study.','')}
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Upcoming &amp; Recent Brotherhood Events</span></div>
      ${visibleEvents.length?visibleEvents.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bdr)">
        <div><div style="font-size:12px;font-weight:500">${e.name}</div><div style="font-size:10.5px;color:var(--ht)">${chEventTypeLabel(e.type)} · ${formatDateShort(e.date)}${e.location?' · '+e.location:''}</div></div>
        <span class="badge ${chStatusClass(e.planningStatus)}">${chStatusLabel(e.planningStatus)}</span>
      </div>`).join(''):es('ti-users-group','pink','No events yet','Check back soon for brotherhood events.','')}
    </div>`;
}
function riRenderProgram(){
  const items=D.ritual.items;const done=items.filter(i=>i.done).length;
  const pct=items.length?Math.round(done/items.length*100):0;
  const pctEl=document.getElementById('ri-prog-pct');if(pctEl)pctEl.textContent=pct+'% complete';
  const catColors={ritual:'background:#fbeaf0;color:#993556',education:'background:var(--bl-bg);color:var(--bl-tx)',brotherhood:'background:var(--am-bg);color:var(--am-tx)',service:'background:var(--gn-bg);color:var(--gn-tx)',administrative:'background:#f0f0ee;color:var(--mt)'};
  const grouped={};items.forEach(item=>{const c=item.category||'education';if(!grouped[c])grouped[c]=[];grouped[c].push(item);});
  const listEl=document.getElementById('ri-program-list');
  if(!listEl)return;
  if(!items.length){listEl.innerHTML=`<div class="es"><div class="es-icon blue"><i class="ti ti-list-check"></i></div><div class="es-title">No program items yet</div><div class="es-sub">Add milestones and requirements to the new member education program.</div></div>`;const statsEl=document.getElementById('ri-class-stats');if(statsEl)statsEl.innerHTML='';return;}
  listEl.innerHTML=Object.entries(grouped).map(([cat,its])=>`
    <div style="margin-bottom:11px">
      <div style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--mt);margin-bottom:6px">${cat.charAt(0).toUpperCase()+cat.slice(1)}</div>
      ${its.map(item=>`<div class="tk-row" style="align-items:flex-start">
        <div class="tc ${item.done?'done':''}" style="cursor:pointer;margin-top:2px" onclick="riToggle('${item.id}')">${item.done?'<i class="ti ti-check" style="font-size:9px"></i>':''}</div>
        <div style="flex:1;min-width:0;cursor:pointer" onclick="riToggle('${item.id}')">
          <div style="font-size:11.5px;color:${item.done?'var(--ht)':'var(--tx)'};${item.done?'text-decoration:line-through':''}">${item.title}${item.required?'<span style="font-size:8.5px;font-weight:600;color:var(--rd-tx);margin-left:5px">REQ</span>':''}</div>
          ${item.desc?`<div style="font-size:10px;color:var(--ht)">${item.desc.slice(0,80)}${item.desc.length>80?'…':''}</div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-top:1px">
          <span style="font-size:10px;color:var(--ht)">Wk ${item.week||'?'}</span>
          <button class="ib" style="width:22px;height:22px;font-size:12px" onclick="riOpenEditItem('${item.id}')" title="Edit"><i class="ti ti-pencil"></i></button>
          <button class="ib" style="width:22px;height:22px;font-size:12px;color:var(--rd)" onclick="riDeleteItem('${item.id}')" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join('')}
    </div>`).join('');
  const statsEl=document.getElementById('ri-class-stats');if(statsEl){
    const cats=Object.keys(grouped);
    statsEl.innerHTML=cats.map(cat=>{const its=grouped[cat];const d=its.filter(i=>i.done).length;const p=its.length?Math.round(d/its.length*100):0;return`<div class="pr"><span class="pl" style="text-transform:capitalize">${cat}</span><div class="pb"><div class="pf" style="width:${p}%;background:${progressColor(p)}"></div></div><span class="pv">${p}%</span></div>`;}).join('');
  }
}
function riToggle(id){const item=D.ritual.items.find(i=>i.id===id);if(item){item.done=!item.done;saveData();riRenderProgram();}}
function riOpenEditItem(id){
  const item=D.ritual.items.find(i=>i.id===id);if(!item)return;
  document.getElementById('ri-item-title').value=item.title;
  document.getElementById('ri-item-cat').value=item.category||'education';
  document.getElementById('ri-item-week').value=item.week||'';
  document.getElementById('ri-item-req').value=item.required?'1':'0';
  document.getElementById('ri-item-desc').value=item.desc||'';
  document.getElementById('ri-item-id').value=id;
  document.getElementById('m-ri-additem').querySelector('.md-t').childNodes[0].textContent='Edit Program Item';
  document.getElementById('m-ri-additem').classList.add('open');
}
async function riDeleteItem(id){
  const ok=await confirmDialog('Delete Program Item','Remove this item from the program? This cannot be undone.');
  if(!ok)return;
  D.ritual.items=D.ritual.items.filter(i=>i.id!==id);
  saveData();riRenderProgram();renderRitual();toast('Item removed','info');
}
function riOpenAddItem(){
  ['ri-item-title','ri-item-desc'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('ri-item-week').value='';
  document.getElementById('ri-item-id').value='';
  document.getElementById('m-ri-additem').querySelector('.md-t').childNodes[0].textContent='Add Program Item';
  document.getElementById('m-ri-additem').classList.add('open');
}
function riAddItem(){
  const title=document.getElementById('ri-item-title').value.trim();
  if(!title){toast('Title is required','error');return;}
  const editId=document.getElementById('ri-item-id').value;
  const data={title,category:document.getElementById('ri-item-cat').value,week:parseInt(document.getElementById('ri-item-week').value)||null,required:document.getElementById('ri-item-req').value==='1',desc:document.getElementById('ri-item-desc').value.trim()};
  if(editId){const item=D.ritual.items.find(i=>i.id===editId);if(item)Object.assign(item,data);}
  else D.ritual.items.push({id:uid(),...data,done:false});
  saveData();closeM(null,document.getElementById('m-ri-additem'));renderRitual();toast(editId?'Item updated':'Item added','success');
}

// ══════════════════════════════════════════════════
// VENDORS / CONTACTS
// ══════════════════════════════════════════════════
function renderVendors(){
  const vn=D.vendors;
  const cats=new Set(vn.map(v=>v.category)).size;
  const topRated=vn.filter(v=>v.rating>=4).length;
  document.getElementById('vn-kpi').innerHTML=
    kpi('Total Vendors',vn.length,'In directory','neutral')+
    kpi('Categories',cats,'Covered','neutral')+
    kpi('Top Rated',topRated,'4+ stars','neutral')+
    kpi('Recently Used',vn.filter(v=>v.lastUsed).length,'Have usage history','neutral');
  vnRenderGrid();
}
function vnFilter(){vnRenderGrid();}
function vnRenderGrid(){
  const q=document.getElementById('vn-search')?.value?.toLowerCase()||'';
  const cat=document.getElementById('vn-cat-filter')?.value||'';
  let vns=D.vendors;
  if(q)vns=vns.filter(v=>v.name.toLowerCase().includes(q)||(v.contact||'').toLowerCase().includes(q)||(v.notes||'').toLowerCase().includes(q));
  if(cat)vns=vns.filter(v=>v.category===cat);
  const catIcon={'Catering / Food':'ti-tools-kitchen-2','Photography / Video':'ti-camera','Venue':'ti-building','Printing / Apparel':'ti-shirt','Entertainment / DJ':'ti-music','Transportation':'ti-car','Alcohol / Beverages':'ti-glass','Flowers / Decor':'ti-leaf','Other':'ti-package'};
  const catColors={'Catering / Food':'background:#fbeaf0;color:#993556','Photography / Video':'background:var(--bl-bg);color:var(--bl-tx)','Venue':'background:var(--am-bg);color:var(--am-tx)','Printing / Apparel':'background:var(--gn-bg);color:var(--gn-tx)','Entertainment / DJ':'background:#f0f0ee;color:var(--mt)','Transportation':'background:#e8eef7;color:#1a3a6b','Other':'background:#f0f0ee;color:var(--mt)'};
  const grid=document.getElementById('vn-grid');const empty=document.getElementById('vn-empty');
  if(!vns.length){grid.style.display='none';empty.style.display='';empty.innerHTML=es('ti-building-store','slate','No vendors found','Add your first vendor or clear filters.','');return;}
  grid.style.display='grid';empty.style.display='none';
  grid.innerHTML=vns.map(v=>{
    const stars='★'.repeat(v.rating||3)+'☆'.repeat(5-(v.rating||3));
    return`<div class="folder-card" style="position:relative">
      <div onclick="vnOpenEdit('${v.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:7px">
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:36px;height:36px;border-radius:9px;background:var(--sky-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ${catIcon[v.category]||'ti-package'}" style="font-size:17px;color:var(--sky-tx)"></i></div>
          <div><div class="folder-name">${v.name}</div><span class="badge" style="${catColors[v.category]||'background:#f0f0ee;color:var(--mt)'};font-size:9px">${v.category||'Other'}</span></div>
        </div>
        <div style="font-size:12px;color:#f5a623;white-space:nowrap;flex-shrink:0">${stars}</div>
      </div>
      ${v.contact?`<div style="font-size:11px;color:var(--mt)"><i class="ti ti-user" style="font-size:10px;margin-right:3px"></i>${v.contact}</div>`:''}
      ${v.phone?`<div style="font-size:11px;color:var(--mt)"><i class="ti ti-phone" style="font-size:10px;margin-right:3px"></i>${v.phone}</div>`:''}
      ${v.cost?`<div style="font-size:11px;font-weight:500;color:var(--sky-tx)">${v.cost}</div>`:''}
      ${v.notes?`<div style="font-size:10.5px;color:var(--ht);line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${v.notes}</div>`:''}
      ${v.lastUsed?`<div style="font-size:9.5px;color:var(--ht)">Last used: ${v.lastUsed}</div>`:''}
      </div>
      <button class="ib" style="position:absolute;top:6px;right:6px;width:20px;height:20px;font-size:11px;color:var(--ht)" onclick="event.stopPropagation();vnDelete('${v.id}')" title="Delete vendor"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');
}
function vnOpenAdd(){
  document.getElementById('vn-edit-id').value='';
  document.getElementById('vn-modal-title').textContent='Add Vendor';
  ['vn-name','vn-contact','vn-phone','vn-email','vn-website','vn-cost','vn-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('vn-cat').value='';
  document.getElementById('vn-rating').value='3';
  document.getElementById('m-vn-add').classList.add('open');
}
function vnOpenEdit(id){
  const v=D.vendors.find(v=>v.id===id);if(!v)return;
  document.getElementById('vn-edit-id').value=id;
  document.getElementById('vn-modal-title').textContent='Edit Vendor';
  document.getElementById('vn-name').value=v.name;
  document.getElementById('vn-cat').value=v.category||'';
  document.getElementById('vn-contact').value=v.contact||'';
  document.getElementById('vn-phone').value=v.phone||'';
  document.getElementById('vn-email').value=v.email||'';
  document.getElementById('vn-website').value=v.website||'';
  document.getElementById('vn-rating').value=v.rating||3;
  document.getElementById('vn-cost').value=v.cost||'';
  document.getElementById('vn-notes').value=v.notes||'';
  document.getElementById('m-vn-add').classList.add('open');
}
function vnSave(){
  const name=document.getElementById('vn-name').value.trim();
  if(!name){toast('Vendor name is required','error');return;}
  const id=document.getElementById('vn-edit-id').value;
  const data={name,category:document.getElementById('vn-cat').value,contact:document.getElementById('vn-contact').value.trim(),phone:document.getElementById('vn-phone').value.trim(),email:document.getElementById('vn-email').value.trim(),website:document.getElementById('vn-website').value.trim(),rating:parseInt(document.getElementById('vn-rating').value)||3,cost:document.getElementById('vn-cost').value.trim(),notes:document.getElementById('vn-notes').value.trim()};
  if(id){const v=D.vendors.find(v=>v.id===id);if(v)Object.assign(v,data);}
  else D.vendors.push({id:uid(),...data});
  saveData();closeM(null,document.getElementById('m-vn-add'));renderVendors();toast(id?'Vendor updated':'Vendor added','success');
}
async function vnDelete(id){
  const ok=await confirmDialog('Delete Vendor','Remove this vendor from the directory?');
  if(!ok)return;
  D.vendors=D.vendors.filter(v=>v.id!==id);
  saveData();renderVendors();toast('Vendor deleted','info');
}

// ══════════════════════════════════════════════════
// CHAPTER HEALTH SCORECARD
// ══════════════════════════════════════════════════
// Single source of truth for the health score — used by this page's own scorecard AND by the
// Chapter Intelligence Center's Overview tab, so the two pages can never disagree on the number.
function computeHealthDims(){
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const doneT=D.tasks.filter(t=>t.status==='done').length;
  const taskPct=D.tasks.length?Math.round(doneT/D.tasks.length*100):50;
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;
  const caseScore=Math.max(0,100-openCases*18);
  const gpas=D.members.map(m=>{const rec=D.academics?.gpas?.[m.id]||{};const v=rec.cumulativeGpa||rec.priorGpa||'';return v?parseFloat(v):null;}).filter(g=>g!==null&&!isNaN(g));
  const avgGpa=gpas.length?(gpas.reduce((a,b)=>a+b,0)/gpas.length):0;
  const gpaScore=avgGpa?Math.round((avgGpa/4)*100):50;
  const finDues=D.finance?.dues||{};
  const paidCount=D.members.filter(m=>(finDues[m.id]?.status||'Partial')==='Paid').length;
  const finScore=D.members.length?Math.round(paidCount/D.members.length*100):50;
  const rushees=D.recruitment?.rushees||[];
  const recruitScore=Math.min(100,Math.round((rushees.length/30)*100));
  const phHrs=D.communityService?.hours?.reduce((s,h)=>s+parseFloat(h.hours||0),0)||0;
  const phScore=Math.min(100,Math.round((phHrs/500)*100));
  const alumCount=D.alumni?.contacts?.length||0;
  const alumScore=Math.min(100,Math.round((alumCount/20)*100));

  const dims=[
    {k:'Attendance',icon:'ti-users',v:avg,w:.22,desc:'Average member attendance rate',target:85,color:'var(--navy)'},
    {k:'Task Completion',icon:'ti-checkbox',v:taskPct,w:.18,desc:doneT+' of '+D.tasks.length+' tasks done',target:80,color:'var(--gn)'},
    {k:'Academics',icon:'ti-school',v:gpaScore,w:.15,desc:avgGpa?('Avg GPA '+avgGpa.toFixed(2)):'No GPA data yet',target:90,color:'var(--bl)'},
    {k:'Accountability',icon:'ti-scale',v:caseScore,w:.13,desc:openCases+' open J-Board case'+(openCases!==1?'s':''),target:90,color:caseScore>=80?'var(--gn)':'var(--rd)'},
    {k:'Finances',icon:'ti-cash',v:finScore,w:.12,desc:paidCount+' / '+D.members.length+' members paid',target:85,color:'var(--am)'},
    {k:'Recruitment',icon:'ti-user-plus',v:recruitScore,w:.08,desc:rushees.length+' rushees tracked',target:80,color:'#7c5cfc'},
    {k:'Philanthropy',icon:'ti-heart',v:phScore,w:.07,desc:phHrs.toFixed(0)+' service hours logged',target:75,color:'#e05fa0'},
    {k:'Alumni',icon:'ti-users-group',v:alumScore,w:.05,desc:alumCount+' alumni in directory',target:70,color:'#0ea5a0'},
  ];
  const score=Math.round(dims.reduce((s,d)=>s+d.v*d.w,0));
  return {score, dims, avg, doneT, openCases, taskPct, finScore, paidCount, phHrs, alumCount};
}

function renderHealthScore(){
  const {score, dims, avg, doneT, openCases, taskPct, finScore, paidCount, phHrs, alumCount}=computeHealthDims();
  const scoreColor=score>=80?'var(--gn)':score>=65?'var(--navy)':score>=50?'var(--am)':'var(--rd)';
  const grade=score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F';
  const gradeStyle=score>=80?'background:var(--gn-bg);color:var(--gn-tx)':score>=65?'background:var(--bl-bg);color:var(--bl-tx)':score>=50?'background:var(--am-bg);color:var(--am-tx)':'background:var(--rd-bg);color:var(--rd-tx)';

  document.getElementById('hs-kpi').innerHTML=
    kpi('Health Score',score+' / 100',grade+' Grade',score>=80?'up':score>=65?'neutral':'down')+
    kpi('Attendance',avg+'%',avg>=85?'On target':'Below 85% goal',avg>=85?'up':'down')+
    kpi('Open Cases',openCases,openCases?'Needs attention':'All clear',openCases?'down':'up')+
    kpi('Tasks Done',taskPct+'%',doneT+' of '+D.tasks.length+' complete',taskPct>=75?'up':'neutral');

  // Ring — new SVG uses r=33, C=2π×33=207.3, stroke is always white (on navy bg)
  const ring=document.getElementById('hs-ring');
  const C=207.3;
  if(ring){setTimeout(()=>{ring.style.strokeDashoffset=C*(1-score/100);},100);}
  const sv=document.getElementById('hs-score-val');if(sv)sv.textContent=score;
  const gd=document.getElementById('hs-grade');
  if(gd){const gradeLabel={A:'A — Excellent',B:'B — Good',C:'C — Developing',D:'D — At Risk',F:'F — Critical'}[grade]||grade;gd.textContent=gradeLabel;}
  const sm=document.getElementById('hs-summary');if(sm)sm.textContent=score>=80?'Chapter is in strong health across all dimensions.':score>=65?'Good standing — a few areas need attention.':score>=50?'Several dimensions below target. Exec focus needed.':'Chapter is at risk. Immediate action required.';
  document.getElementById('hs-updated').textContent='Updated '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});

  // Dimension bars
  document.getElementById('hs-dims').innerHTML=dims.map(d=>{
    const p=d.v;const hit=p>=d.target;
    return`<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:6px"><i class="ti ${d.icon}" style="font-size:12px;color:${d.color}"></i><span style="font-size:12px;font-weight:500">${d.k}</span><span style="font-size:9.5px;color:var(--ht)">${d.desc}</span></div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><span style="font-size:11.5px;font-weight:700;color:${hit?'var(--gn)':'var(--rd)'}">${p}%</span><span style="font-size:9px;color:var(--ht)">/ ${d.target}%</span></div>
      </div>
      <div style="height:6px;background:#f0f0ee;border-radius:99px;overflow:hidden;position:relative">
        <div style="height:100%;border-radius:99px;background:${d.color};width:${p}%;transition:width .7s ease"></div>
        <div style="position:absolute;top:0;bottom:0;left:${d.target}%;width:2px;background:#d0d0ce;border-radius:1px"></div>
      </div>
    </div>`;
  }).join('');

  // Strengths / improvements / actions
  const strong=dims.filter(d=>d.v>=d.target).sort((a,b)=>b.v-a.v);
  const weak=dims.filter(d=>d.v<d.target).sort((a,b)=>a.v-b.v);
  document.getElementById('hs-strengths').innerHTML=strong.length?strong.map(d=>`<div class="al-row"><div class="al-ic" style="background:var(--gn-bg);color:var(--gn-tx)"><i class="ti ${d.icon}"></i></div><div><div style="font-size:12px;font-weight:500">${d.k}</div><div style="font-size:10.5px;color:var(--mt)">${d.v}% — ${d.v-d.target}pts above target</div></div></div>`).join(''):es('ti-mood-happy','green','All areas at target!','Keep it up.','');
  document.getElementById('hs-improvements').innerHTML=weak.length?weak.map(d=>`<div class="al-row"><div class="al-ic" style="background:var(--rd-bg);color:var(--rd-tx)"><i class="ti ${d.icon}"></i></div><div><div style="font-size:12px;font-weight:500">${d.k}</div><div style="font-size:10.5px;color:var(--mt)">${d.v}% — needs ${d.target-d.v}pts to hit target</div></div></div>`).join(''):es('ti-circle-check','green','All dimensions on target!','','');
  const actions=[];
  if(avg<85)actions.push({icon:'ti-users',txt:'Mark attendance for recent mandatory events to improve tracking accuracy.'});
  if(taskPct<75)actions.push({icon:'ti-checkbox',txt:'Review overdue tasks with officers. Consider reassigning stalled items.'});
  if(openCases>2)actions.push({icon:'ti-scale',txt:'Schedule J-Board hearings for the '+openCases+' open cases.'});
  if(finScore<70)actions.push({icon:'ti-cash',txt:'Send dues reminder to '+((D.members.length)-paidCount)+' members with outstanding balances.'});
  if(phHrs<200)actions.push({icon:'ti-heart',txt:'Schedule a service event — chapter is behind on service hour goals.'});
  if(alumCount<10)actions.push({icon:'ti-users-group',txt:'Reach out to known alumni and add them to the directory.'});
  if(!actions.length)actions.push({icon:'ti-sparkles',txt:'Chapter is in strong shape! Focus on maintaining momentum into finals.'});
  document.getElementById('hs-actions').innerHTML=actions.map(a=>`<div class="al-row"><div class="al-ic" style="background:var(--bl-bg);color:var(--bl-tx)"><i class="ti ${a.icon}"></i></div><div style="font-size:11.5px;line-height:1.5">${a.txt}</div></div>`).join('');

  // History chart (generate plausible weekly data)
  hsRenderHistory(score);
}
function hsRenderHistory(currentScore){
  // Use real mandatory past events for history — compute score at each point
  const mandPast=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);
  const tot=D.members.length||1;
  let data=[],labels=[];
  if(mandPast.length>=2){
    data=mandPast.map(ev=>{
      const att=D.attendance[ev.id]||{};
      const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;
      return Math.round(pres/tot*100);
    });
    labels=mandPast.map(ev=>monthShort(ev.date)+' '+dayOfMonth(ev.date));
  } else {
    // Not enough data
    document.getElementById('hs-history-chart').innerHTML=`<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11.5px;color:rgba(255,255,255,.5)">No historical data yet — mark attendance to build history.</div>`;
    document.getElementById('hs-history-labels').innerHTML='';
    return;
  }
  const mx=Math.max(...data,1);
  document.getElementById('hs-history-chart').innerHTML=data.map((v,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="font-size:9px;color:rgba(255,255,255,.6)">${v}%</div><div style="flex:1;width:100%;background:${i===data.length-1?'rgba(255,255,255,.9)':v>=85?'rgba(29,158,117,.7)':v>=70?'rgba(255,255,255,.4)':'rgba(226,75,74,.6)'};border-radius:3px 3px 0 0;min-height:4px;height:${Math.round(v/mx*100)}%" title="${labels[i]}: ${v}%"></div></div>`).join('');
  document.getElementById('hs-history-labels').innerHTML=labels.map(l=>`<span style="color:rgba(255,255,255,.5)">${l}</span>`).join('');
}


function rcOpenGoalEdit(){
  const g=D.recruitment.goal||{target:20,label:'New Members This Semester'};
  document.getElementById('rcg-label').value=g.label||'New Members This Semester';
  document.getElementById('rcg-target').value=g.target||20;
  document.getElementById('m-rc-goal').classList.add('open');
}
function rcSaveGoal(){
  const target=parseInt(document.getElementById('rcg-target').value);
  const label=document.getElementById('rcg-label').value.trim()||'New Members This Semester';
  if(!target||target<1){toast('Enter a valid target','error');return;}
  if(!D.recruitment.goal)D.recruitment.goal={};
  D.recruitment.goal.target=target;
  D.recruitment.goal.label=label;
  saveData();
  closeM(null,document.getElementById('m-rc-goal'));
  renderRecruitment();
  toast('Recruitment goal updated','success');
}
// ══════════════════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════════════════
