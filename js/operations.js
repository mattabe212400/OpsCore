/* OpsCore 2.0 Demo — Operations: Philanthropy, Alumni, Ritual, Vendors, Health Score, Playbooks, Settings */
function renderPhilanthropy(){
  if(!D.philanthropy.funds)D.philanthropy.funds=[];
  const ph=D.philanthropy;
  const serviceHrs=ph.hours.filter(h=>!h.kind||h.kind==='service').reduce((s,h)=>s+parseFloat(h.hours||0),0);
  const philoHrs=ph.hours.filter(h=>h.kind==='philanthropy').reduce((s,h)=>s+parseFloat(h.hours||0),0);
  const totalHrs=serviceHrs+philoHrs;
  const svcEvs=ph.events.filter(e=>!e.kind||e.kind==='service').length;
  const phEvs=ph.events.filter(e=>e.kind==='philanthropy'||e.kind==='fundraiser').length;
  const totalFunds=ph.funds.reduce((s,f)=>s+parseFloat(f.amount||0),0);
  const mbrCount=new Set(ph.hours.map(h=>h.memberId)).size;

  document.getElementById('ph-kpi').innerHTML=
    kpi('Total Service Hours',serviceHrs.toFixed(1),'Community service',serviceHrs>0?'up':'neutral')+
    kpi('Service Events',svcEvs,'This semester','neutral')+
    kpi('Members Participated',mbrCount,'Logged at least one hour','neutral')+
    kpi('Funds Raised','$'+totalFunds.toLocaleString(),'Philanthropy fundraising',totalFunds>0?'up':'neutral');

  // Community Service side
  phRenderServiceGoals();
  phRenderServiceLeaderboard();
  phRenderServiceEvents();
  csFilterHours();

  // Philanthropy side
  phRenderPhiloGoals();
  phRenderPhiloLeaderboard();
  phRenderPhiloEvents();
  phRenderFundsLog();
}

function phRenderServiceGoals(){
  const ph=D.philanthropy;
  const totalHrs=ph.hours.filter(h=>!h.kind||h.kind==='service').reduce((s,h)=>s+parseFloat(h.hours||0),0);
  const evCount=ph.events.filter(e=>!e.kind||e.kind==='service').length;
  const mbrCount=D.members.length||1;
  // Load stored targets or use defaults
  if(!ph.serviceTargets)ph.serviceTargets={totalHrs:500,events:6,avgHrs:4};
  const t=ph.serviceTargets;
  const goals=[
    {id:'phg1',label:'Total Service Hours',target:t.totalHrs||500,unit:'hrs',val:totalHrs,key:'totalHrs'},
    {id:'phg2',label:'Service Events',target:t.events||6,unit:'events',val:evCount,key:'events'},
    {id:'phg3',label:'Avg Hours / Member',target:t.avgHrs||4,unit:'hrs',val:Math.round(totalHrs/mbrCount*10)/10,key:'avgHrs'},
  ];
  const el=document.getElementById('cs-goal-bars');if(!el)return;
  el.innerHTML=goals.map(g=>{const p=Math.min(Math.round(g.val/g.target*100),100);
    return`<div class="pr"><span class="pl">${g.label}</span><div class="pb"><div class="pf" style="width:${p}%;background:${progressColor(p)}"></div></div><span class="pv">${p}%</span></div>
    <div style="display:flex;align-items:center;gap:6px;margin:-6px 0 8px 148px">
      <span style="font-size:10px;color:var(--mt)">${g.val} / </span>
      <input type="number" value="${g.target}" min="1" style="width:52px;height:18px;padding:0 4px;border:1px solid var(--bdr);border-radius:4px;font-size:10px;font-family:inherit;color:var(--tx);outline:none" onchange="phUpdateServiceTarget('${g.key}',+this.value)">
      <span style="font-size:10px;color:var(--ht)">${g.unit}</span>
    </div>`;
  }).join('');
}
function phUpdateServiceTarget(key,val){
  if(!D.philanthropy.serviceTargets)D.philanthropy.serviceTargets={totalHrs:500,events:6,avgHrs:4};
  D.philanthropy.serviceTargets[key]=val;
  saveData();phRenderServiceGoals();
}

function phRenderPhiloGoals(){
  const ph=D.philanthropy;
  const phEvs=ph.events.filter(e=>e.kind==='philanthropy'||e.kind==='fundraiser').length;
  const totalFunds=ph.funds.reduce((s,f)=>s+parseFloat(f.amount||0),0);
  if(!ph.philoTargets)ph.philoTargets={events:4,funds:2000};
  const t=ph.philoTargets;
  const goals=[
    {label:'Philanthropy Events',target:t.events||4,unit:'events',val:phEvs,key:'events'},
    {label:'Funds Raised',target:t.funds||2000,unit:'$',val:totalFunds,key:'funds'},
  ];
  const el=document.getElementById('ph-goal-bars2');if(!el)return;
  el.innerHTML=goals.map(g=>{const p=Math.min(Math.round(g.val/g.target*100),100);
    return`<div class="pr"><span class="pl">${g.label}</span><div class="pb"><div class="pf" style="width:${p}%;background:${progressColor(p)}"></div></div><span class="pv">${p}%</span></div>
    <div style="display:flex;align-items:center;gap:6px;margin:-6px 0 8px 148px">
      <span style="font-size:10px;color:var(--mt)">${g.unit==='$'?'$'+Math.round(g.val):g.val} / </span>
      <input type="number" value="${g.target}" min="1" style="width:52px;height:18px;padding:0 4px;border:1px solid var(--bdr);border-radius:4px;font-size:10px;font-family:inherit;color:var(--tx);outline:none" onchange="phUpdatePhiloTarget('${g.key}',+this.value)">
      <span style="font-size:10px;color:var(--ht)">${g.unit}</span>
    </div>`;
  }).join('');
}
function phUpdatePhiloTarget(key,val){
  if(!D.philanthropy.philoTargets)D.philanthropy.philoTargets={events:4,funds:2000};
  D.philanthropy.philoTargets[key]=val;
  saveData();phRenderPhiloGoals();
}

function phRenderServiceLeaderboard(){
  const hoursMap={};D.philanthropy.hours.filter(h=>!h.kind||h.kind==='service').forEach(h=>{hoursMap[h.memberId]=(hoursMap[h.memberId]||0)+parseFloat(h.hours||0);});
  const sorted=Object.entries(hoursMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total=Object.values(hoursMap).reduce((a,b)=>a+b,0);
  const el=document.getElementById('cs-leaderboard');if(!el)return;
  const tot=document.getElementById('cs-total-hrs');if(tot)tot.textContent=total.toFixed(1)+' hrs total';
  el.innerHTML=sorted.length?sorted.map(([mid,hrs],i)=>{const m=getMember(mid);
    return`<div class="sh-row"><div class="sh-av" style="background:${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#cd7f32':'var(--gn-bg)'};color:${i<3?'#555':'var(--gn-tx)'};font-size:10px;font-weight:700">${i+1}</div><div style="flex:1"><div style="font-size:12px;font-weight:500">${m.name}</div></div><span style="font-size:13px;font-weight:600;color:var(--gn)">${hrs.toFixed(1)}<span style="font-size:9.5px;font-weight:400;color:var(--ht)"> hrs</span></span></div>`;
  }).join(''):es('ti-trophy','green','No service hours logged','Log hours to see the leaderboard.','');
}

function phRenderPhiloLeaderboard(){
  const hoursMap={};D.philanthropy.hours.filter(h=>h.kind==='philanthropy').forEach(h=>{hoursMap[h.memberId]=(hoursMap[h.memberId]||0)+parseFloat(h.hours||0);});
  const sorted=Object.entries(hoursMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total=Object.values(hoursMap).reduce((a,b)=>a+b,0);
  const el=document.getElementById('ph-leaderboard2');if(!el)return;
  const tot=document.getElementById('ph-total-hrs');if(tot)tot.textContent=total.toFixed(1)+' hrs total';
  el.innerHTML=sorted.length?sorted.map(([mid,hrs],i)=>{const m=getMember(mid);
    return`<div class="sh-row"><div class="sh-av" style="background:${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#cd7f32':'#fbeaf0'};color:${i<3?'#555':'#c0345a'};font-size:10px;font-weight:700">${i+1}</div><div style="flex:1"><div style="font-size:12px;font-weight:500">${m.name}</div></div><span style="font-size:13px;font-weight:600;color:#c0345a">${hrs.toFixed(1)}<span style="font-size:9.5px;font-weight:400;color:var(--ht)"> hrs</span></span></div>`;
  }).join(''):es('ti-heart','red','No philanthropy hours logged','Log hours to see the leaderboard.','');
}

function phRenderServiceEvents(){
  const ev=D.philanthropy.events.filter(e=>!e.kind||e.kind==='service').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const el=document.getElementById('cs-events-table');if(!el)return;
  el.innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Org</th><th>Goal</th><th></th></tr></thead><tbody>${ev.length?ev.map(e=>`<tr><td style="font-weight:500">${e.title}</td><td>${formatDateShort(e.date)}</td><td style="color:var(--mt)">${e.org||'—'}</td><td>${e.hourGoal?e.hourGoal+' hrs':'—'}</td><td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 7px" onclick="deletePhEvent('${e.id}')"><i class="ti ti-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ht);padding:20px">No service events yet.</td></tr>'}</tbody>`;
}

function phRenderPhiloEvents(){
  const ev=D.philanthropy.events.filter(e=>e.kind==='philanthropy'||e.kind==='fundraiser').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const el=document.getElementById('ph-events-table2');if(!el)return;
  el.innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Type</th><th>Org</th><th></th></tr></thead><tbody>${ev.length?ev.map(e=>`<tr><td style="font-weight:500">${e.title}</td><td>${formatDateShort(e.date)}</td><td><span class="badge bb2">${e.kind||'philanthropy'}</span></td><td style="color:var(--mt)">${e.org||'—'}</td><td><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 7px" onclick="deletePhEvent('${e.id}')"><i class="ti ti-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ht);padding:20px">No philanthropy events yet.</td></tr>'}</tbody>`;
}

function phRenderFundsLog(){
  const el=document.getElementById('ph-funds-log');if(!el)return;
  const funds=[...(D.philanthropy.funds||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!funds.length){el.innerHTML=`<div style="padding:12px;text-align:center;font-size:11.5px;color:var(--ht)">No fundraising logged yet. Click "+ Log" to add.</div>`;return;}
  const total=funds.reduce((s,f)=>s+parseFloat(f.amount||0),0);

  // Per-member donor map
  const donorMap={};
  funds.forEach(f=>{
    if(f.memberId){donorMap[f.memberId]=(donorMap[f.memberId]||0)+parseFloat(f.amount||0);}
  });
  const topDonors=Object.entries(donorMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  let html=`<div style="font-size:11px;font-weight:600;color:var(--gn-tx);margin-bottom:8px">Total Raised: $${total.toLocaleString()}</div>`;

  // Member donor leaderboard
  if(topDonors.length){
    html+=`<div style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--mt);margin-bottom:5px">Top Member Donors</div>`;
    html+=topDonors.map(([mid,amt],i)=>{const m=getMember(mid);return`<div class="sh-row"><div class="sh-av" style="background:${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#cd7f32':'#fbeaf0'};color:${i<3?'#555':'#c0345a'};font-size:9px;font-weight:700">${i+1}</div><div style="flex:1"><div style="font-size:12px;font-weight:500">${m.name}</div></div><span style="font-size:13px;font-weight:600;color:#c0345a">$${amt.toLocaleString()}</span></div>`;}).join('');
    html+=`<div style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--mt);margin-top:11px;margin-bottom:5px">All Donations</div>`;
  }

  html+=funds.slice(0,30).map(f=>{
    const donor=f.memberId?getMember(f.memberId).name:'Chapter / External';
    return`<div class="fin-pay-row"><div class="fin-pay-icon" style="background:#fbeaf0"><i class="ti ti-coin" style="color:#c0345a"></i></div><div style="flex:1"><div style="font-size:12px;font-weight:500">$${parseFloat(f.amount).toLocaleString()} <span style="font-size:10px;font-weight:400;color:var(--mt)">— ${donor}</span></div><div style="font-size:10.5px;color:var(--mt)">${formatDateShort(f.date)}${f.notes?' · '+f.notes:''}</div></div><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 7px" onclick="deletePhFunds('${f.id}')"><i class="ti ti-trash"></i></button></div>`;
  }).join('');
  el.innerHTML=html;
}

function csFilterHours(){
  const q=(document.getElementById('cs-search')||{value:''}).value.toLowerCase();
  const hoursMap={};D.philanthropy.hours.filter(h=>!h.kind||h.kind==='service').forEach(h=>{hoursMap[h.memberId]=(hoursMap[h.memberId]||0)+parseFloat(h.hours||0);});
  let rows=D.members.map(m=>({m,hrs:hoursMap[m.id]||0}));
  if(q)rows=rows.filter(r=>r.m.name.toLowerCase().includes(q));
  rows.sort((a,b)=>b.hrs-a.hrs);
  const el=document.getElementById('cs-hours-table');if(!el)return;
  el.innerHTML=`<thead><tr><th>Member</th><th>Class</th><th>Hours</th><th>vs Goal (4h)</th></tr></thead><tbody>${rows.map(({m,hrs})=>{const p=Math.min(Math.round(hrs/4*100),100);return`<tr><td style="font-weight:500">${m.name}</td><td style="color:var(--mt)">${m.classYear}</td><td style="font-weight:600;color:${hrs>=4?'var(--gn)':hrs>0?'var(--navy)':'var(--ht)'}">${hrs.toFixed(1)} hrs</td><td><div style="display:flex;align-items:center;gap:7px"><div style="width:60px;height:5px;background:#f0f0ee;border-radius:99px;overflow:hidden"><div style="height:100%;border-radius:99px;background:${progressColor(p)};width:${p}%"></div></div><span style="font-size:10.5px;color:var(--mt)">${p}%</span></div></td></tr>`;}).join('')}</tbody>`;
}

function phOpenAddEvent(kind='service'){
  document.getElementById('ph-ev-kind').value=kind;
  document.getElementById('ph-addevent-title').childNodes[0].textContent=kind==='service'?'Add Service Event':'Add Philanthropy Event';
  document.getElementById('ph-ev-type').value=kind==='service'?'service':'philanthropy';
  document.getElementById('ph-ev-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('ph-ev-title').value='';
  document.getElementById('ph-ev-goal').value='';
  document.getElementById('ph-ev-org').value='';
  document.getElementById('ph-ev-notes').value='';
  document.getElementById('m-ph-addevent').classList.add('open');
}
function phAddEvent(){
  const title=document.getElementById('ph-ev-title').value.trim();
  if(!title){toast('Event name is required','error');return;}
  const kind=document.getElementById('ph-ev-kind').value;
  D.philanthropy.events.push({id:uid(),title,date:document.getElementById('ph-ev-date').value||new Date().toISOString().split('T')[0],kind,type:document.getElementById('ph-ev-type').value,hourGoal:parseFloat(document.getElementById('ph-ev-goal').value)||0,org:document.getElementById('ph-ev-org').value.trim(),notes:document.getElementById('ph-ev-notes').value.trim()});
  saveData();closeM(null,document.getElementById('m-ph-addevent'));renderPhilanthropy();toast('Event created','success');
}
function phOpenLogHours(kind='service'){
  document.getElementById('ph-log-kind').value=kind;
  document.getElementById('ph-loghours-title').childNodes[0].textContent=kind==='service'?'Log Service Hours':'Log Philanthropy Hours';
  const sel=document.getElementById('ph-log-member');sel.innerHTML=memberSelectOptions();
  const esel=document.getElementById('ph-log-event');
  const evs=D.philanthropy.events.filter(e=>kind==='service'?(!e.kind||e.kind==='service'):e.kind==='philanthropy'||e.kind==='fundraiser');
  esel.innerHTML='<option value="">-- General / Other --</option>'+evs.map(e=>`<option value="${e.id}">${e.title} (${formatDateShort(e.date)})</option>`).join('');
  document.getElementById('ph-log-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('ph-log-hours').value='';
  document.getElementById('ph-log-notes').value='';
  document.getElementById('m-ph-loghours').classList.add('open');
}
function phLogHours(){
  const mid=document.getElementById('ph-log-member').value;
  const hrs=parseFloat(document.getElementById('ph-log-hours').value);
  const kind=document.getElementById('ph-log-kind').value;
  if(!mid||isNaN(hrs)||hrs<=0){toast('Member and valid hours are required','error');return;}
  D.philanthropy.hours.push({id:uid(),memberId:mid,hours:hrs,kind,eventId:document.getElementById('ph-log-event').value||null,date:document.getElementById('ph-log-date').value,notes:document.getElementById('ph-log-notes').value.trim()});
  saveData();closeM(null,document.getElementById('m-ph-loghours'));renderPhilanthropy();toast(hrs+' hrs logged for '+getMember(mid).name.split(' ')[0],'success');
}
function phOpenLogFunds(){
  document.getElementById('pf-amount').value='';
  document.getElementById('pf-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('pf-notes').value='';
  const msel=document.getElementById('pf-member');
  if(msel)msel.innerHTML='<option value="">— Chapter / External —</option>'+D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  const esel=document.getElementById('pf-event');
  const phEvs=D.philanthropy.events.filter(e=>e.kind==='philanthropy'||e.kind==='fundraiser');
  esel.innerHTML='<option value="">-- General --</option>'+phEvs.map(e=>`<option value="${e.id}">${e.title}</option>`).join('');
  document.getElementById('m-ph-logfunds').classList.add('open');
}
function phLogFunds(){
  const amt=parseFloat(document.getElementById('pf-amount').value);
  if(isNaN(amt)||amt<=0){toast('Enter a valid amount','error');return;}
  if(!D.philanthropy.funds)D.philanthropy.funds=[];
  const memberId=document.getElementById('pf-member')?.value||null;
  D.philanthropy.funds.push({id:uid(),amount:amt,memberId:memberId||null,date:document.getElementById('pf-date').value,eventId:document.getElementById('pf-event').value||null,notes:document.getElementById('pf-notes').value.trim()});
  saveData();closeM(null,document.getElementById('m-ph-logfunds'));renderPhilanthropy();toast('$'+amt.toLocaleString()+' logged','success');
}
// Legacy stubs for old code references
function phTab(){}
function renderPhOverview(){}
function renderPhEvents(){}
function renderPhHours(){}
function phFilterHours(){}
function phOpenAdd(){phOpenAddEvent('service');}


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
// RITUAL & EDUCATION
// ══════════════════════════════════════════════════
function renderRitual(){
  const ri=D.ritual;
  const total=ri.items.length;const done=ri.items.filter(i=>i.done).length;
  const required=ri.items.filter(i=>i.required);const reqDone=required.filter(i=>i.done).length;
  const sessions=ri.sessions.length;
  document.getElementById('ri-kpi').innerHTML=
    kpi('Ritual Items',total,done+' completed','neutral')+
    kpi('Required',required.length,reqDone+' / '+required.length+' done',reqDone===required.length&&required.length>0?'up':'neutral')+
    kpi('Sessions',sessions,'Scheduled','neutral')+
    kpi('New Members',D.members.filter(m=>m.classYear==='Freshman'||m.classYear==='New Member').length,'In program','neutral');
  riRenderProgram();
  riRenderMembers();
  riRenderSchedule();
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
function riRenderMembers(){
  const nms=D.members.filter(m=>m.classYear==='Sophomore'||m.classYear==='Freshman');
  const req=D.ritual.items.filter(i=>i.required);
  const el=document.getElementById('ri-members-table');if(!el)return;
  el.innerHTML=`<thead><tr><th>Member</th><th>Class</th><th>Required Items</th><th>Status</th></tr></thead><tbody>${nms.length?nms.map(m=>{const prog=D.ritual.nmProgress[m.id]||{};const done=req.filter(i=>prog[i.id]).length;const pct=req.length?Math.round(done/req.length*100):0;return`<tr><td style="font-weight:500">${m.name}</td><td>${m.classYear}</td><td><div style="display:flex;align-items:center;gap:7px"><div style="width:80px;height:5px;background:#f0f0ee;border-radius:99px;overflow:hidden"><div style="height:100%;background:${progressColor(pct)};border-radius:99px;width:${pct}%"></div></div><span style="font-size:10.5px">${done}/${req.length}</span></div></td><td><span class="badge ${pct===100?'bg2':pct>=50?'ba2':'bm2'}">${pct===100?'Complete':pct>=50?'In Progress':'Not Started'}</span></td></tr>`;}).join(''):'<tr><td colspan="4" style="text-align:center;color:var(--ht);padding:24px">No new members found. Members with class year Sophomore or Freshman appear here.</td></tr>'}</tbody>`;
}
function riRenderSchedule(){
  const sess=D.ritual.sessions;
  const el=document.getElementById('ri-schedule-table');if(!el)return;
  if(!sess.length){el.innerHTML=`<thead><tr><th>Session</th><th>Date</th><th>Type</th><th>Facilitator</th><th>Notes</th><th></th></tr></thead><tbody><tr><td colspan="6" style="text-align:center;color:var(--ht);padding:24px">No sessions scheduled. Add one to get started.</td></tr></tbody>`;return;}
  el.innerHTML=`<thead><tr><th>Session</th><th>Date</th><th>Type</th><th>Facilitator</th><th>Notes</th><th></th></tr></thead><tbody>${sess.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{const fac=getMember(s.facilitatorId);return`<tr><td style="font-weight:500">${s.title}</td><td>${formatDateShort(s.date)}</td><td><span class="badge ${s.type==='ritual'?'br2':s.type==='test'?'ba2':'bb2'}">${s.type}</span></td><td>${fac.name}</td><td style="color:var(--mt);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.notes||'—'}</td><td style="white-space:nowrap"><button class="btn" style="height:24px;font-size:11px;padding:0 7px;margin-right:4px" onclick="riOpenEditSession('${s.id}')"><i class="ti ti-pencil"></i></button><button class="btn btn-d" style="height:24px;font-size:11px;padding:0 7px" onclick="riDeleteSession('${s.id}')"><i class="ti ti-trash"></i></button></td></tr>`;}).join('')}</tbody>`;
}
function riOpenEditSession(id){
  const s=D.ritual.sessions.find(x=>x.id===id);if(!s)return;
  const fsel=document.getElementById('ris-facilitator');fsel.innerHTML=D.members.map(m=>`<option value="${m.id}">${m.name}${m.role!=='Member'?' — '+m.role:''}</option>`).join('');
  document.getElementById('ris-title').value=s.title;
  document.getElementById('ris-date').value=s.date;
  document.getElementById('ris-type').value=s.type;
  fsel.value=s.facilitatorId;
  document.getElementById('ris-notes').value=s.notes||'';
  document.getElementById('ris-id').value=id;
  document.getElementById('m-ri-addsession').querySelector('.md-t').childNodes[0].textContent='Edit Session';
  document.getElementById('m-ri-addsession').classList.add('open');
}
async function riDeleteSession(id){
  const ok=await confirmDialog('Delete Session','Remove this session from the schedule?');
  if(!ok)return;
  D.ritual.sessions=D.ritual.sessions.filter(s=>s.id!==id);
  saveData();riRenderSchedule();renderRitual();toast('Session removed','info');
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
function riOpenAddSession(){
  const fsel=document.getElementById('ris-facilitator');fsel.innerHTML=D.members.filter(m=>m.role!=='Member').map(m=>`<option value="${m.id}">${m.name} — ${m.role}</option>`).join('');
  document.getElementById('ris-date').value=new Date().toISOString().split('T')[0];
  ['ris-title','ris-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('ris-id').value='';
  document.getElementById('m-ri-addsession').querySelector('.md-t').childNodes[0].textContent='Add Education Session';
  document.getElementById('m-ri-addsession').classList.add('open');
}
function riAddSession(){
  const title=document.getElementById('ris-title').value.trim();
  if(!title){toast('Title is required','error');return;}
  const editId=document.getElementById('ris-id').value;
  const data={title,date:document.getElementById('ris-date').value,type:document.getElementById('ris-type').value,facilitatorId:document.getElementById('ris-facilitator').value,notes:document.getElementById('ris-notes').value.trim()};
  if(editId){const s=D.ritual.sessions.find(x=>x.id===editId);if(s)Object.assign(s,data);}
  else D.ritual.sessions.push({id:uid(),...data});
  saveData();closeM(null,document.getElementById('m-ri-addsession'));riRenderSchedule();renderRitual();toast(editId?'Session updated':'Session added','success');
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
function renderHealthScore(){
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const openT=D.tasks.filter(t=>t.status!=='done').length;
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
  const phHrs=D.philanthropy?.hours?.reduce((s,h)=>s+parseFloat(h.hours||0),0)||0;
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
