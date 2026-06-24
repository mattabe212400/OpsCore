/* OpsCore 2.0 Demo — Finance */
const FIN_SEMESTER_DUES_DEFAULT = 0; // No default — must be set by Treasurer
const FIN_BUDGET_CATS = ['Housing Rent','Housing Upper Crust','Housing Mike','Housing Miscellaneous','Utilities Electric','Utilities Alliant Energy','Utilities Waste Management','Administrative IFC Dues','Administrative YouTube/TV','Events Greek Week','Events House Maintenance','Events Social','Events Chaplain','Events Philanthropy','Events Moms Day','Events Alumni','Scholarship','Miscellaneous'];
const FIN_CAT_COLORS = {'Housing Rent':'var(--navy)','Housing Upper Crust':'var(--navy)','Housing Mike':'var(--navy)','Housing Miscellaneous':'var(--navy)','Utilities Electric':'var(--am)','Utilities Alliant Energy':'var(--am)','Utilities Waste Management':'var(--am)','Administrative IFC Dues':'var(--mt)','Administrative YouTube/TV':'var(--mt)','Events Greek Week':'var(--bl)','Events House Maintenance':'var(--bl)','Events Social':'var(--bl)','Events Chaplain':'var(--bl)','Events Philanthropy':'var(--rd)','Events Moms Day':'var(--bl)','Events Alumni':'var(--bl)','Scholarship':'var(--gn)','Miscellaneous':'var(--ht)'};
const FIN_CAT_ICONS = {'Housing Rent':'ti-home','Housing Upper Crust':'ti-home','Housing Mike':'ti-home','Housing Miscellaneous':'ti-home','Utilities Electric':'ti-bolt','Utilities Alliant Energy':'ti-flame','Utilities Waste Management':'ti-recycle','Administrative IFC Dues':'ti-building','Administrative YouTube/TV':'ti-device-tv','Events Greek Week':'ti-trophy','Events House Maintenance':'ti-tool','Events Social':'ti-confetti','Events Chaplain':'ti-book','Events Philanthropy':'ti-heart','Events Moms Day':'ti-heart-handshake','Events Alumni':'ti-users-group','Scholarship':'ti-school','Miscellaneous':'ti-dots'};
let FIN_ACTIVE_TAB = 'fin-overview';
let FIN_CAN_EDIT = false;
// Dynamic dues — reads from D.settings based on member type (inHouse / outOfHouse / pledge)
function getSemDues(memberId){
  const m = memberId ? D.members.find(x=>x.id===memberId) : null;
  const s = D.settings||{};
  // Per-member override takes priority
  const override = D.finance?.dues?.[memberId]?.customDues;
  if(override) return override;
  // Determine type: pledge = Freshman, inHouse = liveIn, outOfHouse = !liveIn
  if(m) {
    if(m.classYear==='Freshman') return s.duesPledge||0;
    if(m.liveIn) return s.duesInHouse||0;
    return s.duesOutOfHouse||0;
  }
  // Fallback for overview: use in-house as representative
  return s.duesInHouse||s.duesOutOfHouse||s.duesPledge||0;
}
function getSemDuesDisplay(){
  const s=D.settings||{};
  const ih=s.duesInHouse||0; const oh=s.duesOutOfHouse||0; const pl=s.duesPledge||0;
  if(!ih&&!oh&&!pl) return 'Not set';
  return `In: $${ih} / Out: $${oh} / Pledge: $${pl}`;
}

// ── PERMISSION CHECK ──
function finCheckPerms(){
  if(!CURRENT_USER)return false;
  return['President','Vice President','Treasurer'].includes(CURRENT_USER.title);
}

// Finance uses real data only — no seeded demo content

// ── TAB SWITCHER ──
function finTab(btn,tabId){
  document.querySelectorAll('.fin-tab').forEach(t=>{t.classList.remove('active');});
  if(btn){btn.classList.add('active');}
  document.querySelectorAll('#page-finance > div[id^="fin-"]').forEach(d=>{
    if(d.id==='fin-tabs-bar')return; // never hide the tab bar
    d.style.display='none';
  });
  const el=document.getElementById(tabId);if(el)el.style.display='block';
  FIN_ACTIVE_TAB=tabId;
  const map={
    'fin-overview':finRenderOverview,
    'fin-dues':finRenderDues,
    'fin-national':finRenderNational,
    'fin-fines':finRenderFines,
    'fin-budget':finRenderBudget,
    'fin-plans':finRenderPlans,
    'fin-settings':finRenderSettings,
  };
  if(map[tabId])map[tabId]();
  // Show/hide edit controls based on permission
  ['fin-add-payment-btn','fin-add-fine-btn','fin-add-expense-btn','fin-add-plan-btn'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display=finCheckPerms()?'':'none';
  });
}

// ── MAIN RENDER ──
function renderFinance(){
  // Initialize empty collections — no seeded fake data
  if(!D.finance.dues)D.finance.dues={};
  if(!D.finance.fines)D.finance.fines=[];
  if(!D.finance.expenses)D.finance.expenses=[];
  if(!D.finance.payments)D.finance.payments=[];
  if(!D.finance.plans)D.finance.plans=[];
  // Reset tabs
  document.querySelectorAll('.fin-tab').forEach((t,i)=>{t.classList.toggle('active',i===0);});
  document.querySelectorAll('#page-finance > div[id^="fin-"]:not(#fin-tabs-bar)').forEach((d,i)=>d.style.display=i===0?'block':'none');
  FIN_ACTIVE_TAB='fin-overview';
  finRenderOverview();
}

// ── OVERVIEW ──
function finRenderOverview(){
  const dues=D.finance.dues||{};
  const members=D.members;
  const totalOwe=members.reduce((s,m)=>s+((dues[m.id]?.semesterDues||getSemDues(m.id))-(dues[m.id]?.paid||0)),0);
  const paidCount=members.filter(m=>(dues[m.id]?.status||'Partial')==='Paid').length;
  const paidPct=members.length?Math.round(paidCount/members.length*100):0;
  const totalFines=(D.finance.fines||[]).filter(f=>f.status==='Unpaid').reduce((s,f)=>s+f.amount,0);
  const totalCollected=members.reduce((s,m)=>s+(dues[m.id]?.paid||0),0);
  const budgetSpent=(D.finance.expenses||[]).reduce((s,e)=>s+e.amount,0);
  const totalBudget=Object.values(D.finance.budget||{}).reduce((a,b)=>a+b,0);
  const cashFlow=totalCollected-budgetSpent;

  document.getElementById('fin-kpi').innerHTML=
    kpi('Outstanding Dues','$'+totalOwe.toLocaleString(),members.length-paidCount+' members unpaid',totalOwe>2000?'down':'neutral')+
    kpi('Collection Rate',paidPct+'%',paidCount+' / '+members.length+' paid',paidPct>=85?'up':paidPct>=70?'neutral':'down')+
    kpi('Chapter Cash Flow','$'+cashFlow.toLocaleString(),'Collected minus spent',cashFlow>=0?'up':'down')+
    kpi('Outstanding Fines','$'+totalFines.toLocaleString(),(D.finance.fines||[]).filter(f=>f.status==='Unpaid').length+' unpaid fines',totalFines>200?'down':'neutral');

  // Health
  const healthEl=document.getElementById('fin-health');
  const health=paidPct>=80&&totalFines<500?{cls:'healthy',icon:'ti-circle-check',ic:'color:var(--gn)',label:'Healthy',desc:`${paidPct}% dues collected · Fines under control`}:paidPct>=60?{cls:'warning',icon:'ti-alert-triangle',ic:'color:var(--am-tx)',label:'Warning',desc:`${100-paidPct}% of members still owe dues · Monitor closely`}:{cls:'critical',icon:'ti-alert-circle',ic:'color:var(--rd)',label:'Critical',desc:`Low collection rate · Immediate action required`};
  healthEl.innerHTML=`<div class="fin-health ${health.cls}"><i class="ti ${health.icon}" style="${health.ic};font-size:18px"></i><div><div style="font-size:13px;font-weight:600">${health.label}</div><div style="font-size:11px;margin-top:2px">${health.desc}</div></div></div>`;

  // Alerts
  const alertsEl=document.getElementById('fin-alerts');
  const alerts=[];
  const overdue=members.filter(m=>dues[m.id]?.status==='Overdue');
  if(overdue.length)alerts.push({icon:'ti-alert-circle',bg:'background:var(--rd-bg)',ic:'color:var(--rd-tx)',title:`${overdue.length} member${overdue.length>1?'s':''} overdue on dues`,body:overdue.slice(0,2).map(m=>m.name.split(' ')[0]).join(', ')+(overdue.length>2?` +${overdue.length-2} more`:'')});
  const unpaidFines=(D.finance.fines||[]).filter(f=>f.status==='Unpaid');
  if(unpaidFines.length)alerts.push({icon:'ti-gavel',bg:'background:var(--am-bg)',ic:'color:var(--am-tx)',title:`$${unpaidFines.reduce((s,f)=>s+f.amount,0)} in unpaid fines`,body:`${unpaidFines.length} fine${unpaidFines.length>1?'s':''} outstanding`});
  const nearLimit=FIN_BUDGET_CATS.filter(cat=>{const sp=(D.finance.expenses||[]).filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0);const bud=D.finance.budget[cat]||0;return bud>0&&sp/bud>.85;});
  if(nearLimit.length)alerts.push({icon:'ti-chart-pie',bg:'background:var(--bl-bg)',ic:'color:var(--bl-tx)',title:`${nearLimit.join(', ')} budget${nearLimit.length>1?'s':''} near limit`,body:'Over 85% of budget spent'});
  alertsEl.innerHTML=alerts.length?alerts.map(a=>`<div class="d-alert-row"><div class="d-alert-icon" style="${a.bg}"><i class="ti ${a.icon}" style="${a.ic}"></i></div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:500">${a.title}</div><div style="font-size:10.5px;color:var(--mt);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.body}</div></div></div>`).join(''):`<div style="padding:14px;text-align:center;color:var(--mt);font-size:11.5px"><i class="ti ti-circle-check" style="color:var(--gn);font-size:17px;display:block;margin:0 auto 4px"></i>Finances in good shape</div>`;

  // Budget overview
  const budEl=document.getElementById('fin-budget-overview');
  budEl.innerHTML=FIN_BUDGET_CATS.map(cat=>{
    const spent=(D.finance.expenses||[]).filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0);
    const bud=D.finance.budget[cat]||0;
    const pct=bud?Math.min(100,Math.round(spent/bud*100)):0;
    const col=pct>=90?'var(--rd)':pct>=70?'var(--am)':FIN_CAT_COLORS[cat]||'var(--navy)';
    return`<div class="pr"><span class="pl" style="width:110px"><i class="ti ${FIN_CAT_ICONS[cat]} " style="font-size:11px;color:var(--ht);margin-right:4px"></i>${cat}</span><div class="pb"><div class="pf" style="width:${pct}%;background:${col}"></div></div><span style="font-size:10.5px;color:var(--mt);width:80px;text-align:right;flex-shrink:0">$${spent} / $${bud}</span></div>`;
  }).join('');

  // Recent payments feed
  const feedEl=document.getElementById('fin-feed');
  const payments=[...(D.finance.payments||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  feedEl.innerHTML=payments.length?payments.map(p=>`<div class="fin-pay-row"><div class="fin-pay-icon" style="background:var(--gn-bg)"><i class="ti ti-cash" style="color:var(--gn)"></i></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">${getMember(p.memberId).name.split(' ')[0]} paid $${p.amount} <span style="font-weight:400;color:var(--mt)">(${p.type})</span></div><div style="font-size:10px;color:var(--ht)">${formatDateShort(p.date)} · via ${p.method}</div></div><span style="font-size:11px;font-weight:600;color:var(--gn)">+$${p.amount}</span></div>`).join(''):`<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No payments recorded yet.</div>`;

  // Deadlines
  const dlEl=document.getElementById('fin-deadlines');
  const deadlines=[
    {label:'Fall Dues Deadline',date:'2026-10-01',type:'dues'},
    {label:'House Rent Payment',date:'2026-10-05',type:'house'},
    {label:'National Dues Remittance',date:'2026-10-15',type:'national'},
    {label:'Payment Plans Due',date:'2026-09-30',type:'plan'},
  ];
  dlEl.innerHTML=deadlines.map(d=>{
    const days=Math.max(0,Math.round((new Date(d.date+'T12:00:00')-new Date())/86400000));
    const cls=days===0?'urgent':days<=3?'soon':'';
    const icons={dues:'ti-cash',house:'ti-home',national:'ti-building-bank',plan:'ti-calendar'};
    return`<div class="ev-row"><div class="ev-dt"><div class="ev-day">${dayOfMonth(d.date)}</div><div class="ev-mo">${monthShort(d.date)}</div></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">${d.label}</div><div style="font-size:10.5px;color:var(--mt)">${formatDate(d.date)}</div></div><span class="d-countdown ${cls}"><i class="ti ti-clock" style="font-size:9px"></i>${days===0?'Today':days+'d'}</span></div>`;
  }).join('');

  // Who Owes What — quick view
  const whoOwesEl=document.getElementById('fin-who-owes');
  if(whoOwesEl){
    const unpaid=members.filter(m=>(dues[m.id]?.status||'Partial')!=='Paid').sort((a,b)=>{
      const balA=(dues[a.id]?.semesterDues||getSemDues(a.id))-(dues[a.id]?.paid||0);
      const balB=(dues[b.id]?.semesterDues||getSemDues(b.id))-(dues[b.id]?.paid||0);
      return balB-balA;
    });
    if(!unpaid.length){whoOwesEl.innerHTML=`<div style="padding:14px;text-align:center;font-size:11.5px;color:var(--mt)"><i class="ti ti-circle-check" style="color:var(--gn);font-size:17px;display:block;margin:0 auto 4px"></i>All dues collected!</div>`;return;}
    whoOwesEl.innerHTML=unpaid.slice(0,12).map(m=>{
      const d=dues[m.id]||{};
      const owed=(d.semesterDues||getSemDues(m?.id||memberId))-(d.paid||0);
      const pct=Math.round((d.paid||0)/(d.semesterDues||getSemDues(m?.id||memberId))*100);
      const stat=d.status||'Partial';
      const sc={Overdue:'var(--rd)',Partial:'var(--am)',Paid:'var(--gn)','Payment Plan':'var(--bl)'}[stat]||'var(--mt)';
      return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bdr)">
        <div class="sh-av" style="width:23px;height:23px;font-size:8px">${m.initials}</div>
        <div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div></div>
        <div style="width:50px;height:4px;background:#f0f0ee;border-radius:99px;overflow:hidden;flex-shrink:0"><div style="height:100%;width:${pct}%;background:${sc};border-radius:99px"></div></div>
        <span style="font-size:11px;font-weight:700;color:${sc};width:36px;text-align:right;flex-shrink:0">$${owed}</span>
        <button class="btn" style="height:22px;font-size:10px;padding:0 7px;flex-shrink:0" onclick="finOpenProfile('${m.id}')"><i class="ti ti-edit"></i></button>
      </div>`;
    }).join('')+(unpaid.length>12?`<div style="font-size:11px;color:var(--mt);text-align:center;padding:7px 0;cursor:pointer" onclick="finTab(document.querySelector('[data-tab=fin-dues]'),'fin-dues')">+${unpaid.length-12} more → View all dues</div>`:'');
  }
}

// ── MEMBER DUES TABLE ──
function finRenderDues(){
  const dues=D.finance.dues||{};
  const paid=D.members.filter(m=>(dues[m.id]?.status||'Partial')==='Paid').length;
  const ov=D.members.filter(m=>dues[m.id]?.status==='Overdue').length;
  const total=D.members.reduce((s,m)=>s+(dues[m.id]?.paid||0),0);
  document.getElementById('fin-dues-kpi').innerHTML=
    kpi('Collected','$'+total.toLocaleString(),paid+' fully paid','neutral')+
    kpi('Outstanding','$'+D.members.reduce((s,m)=>s+((dues[m.id]?.semesterDues||getSemDues(m.id))-(dues[m.id]?.paid||0)),0).toLocaleString(),'Still owed','neutral')+
    kpi('Overdue',ov,'Past deadline',ov?'down':'neutral')+
    kpi('On Payment Plan',(D.finance.plans||[]).filter(p=>p.status!=='Completed').length,'Active plans','neutral');
  finFilterDues();
}

function finFilterDues(){
  const q=(document.getElementById('fin-search')||{value:''}).value.toLowerCase();
  const st=(document.getElementById('fin-filter-pay')||{value:''}).value;
  const dues=D.finance.dues||{};
  const statusBadge={Paid:'bg2',Partial:'ba2',Overdue:'br2','Payment Plan':'bb2'};
  let rows=D.members.filter(m=>{
    if(q&&!m.name.toLowerCase().includes(q))return false;
    if(st&&(dues[m.id]?.status||'Partial')!==st)return false;
    return true;
  });
  const tbl=document.getElementById('fin-dues-table');
  if(!tbl)return;
  tbl.innerHTML=`<thead><tr><th>Member</th><th>Class</th><th>Semester Dues</th><th>Paid</th><th>Balance</th><th>Status</th><th>Last Payment</th><th>Fines</th><th></th></tr></thead><tbody>${rows.map(m=>{
    const d=dues[m.id]||{semesterDues:getSemDues(m.id),paid:0,status:'Partial',lastPayment:'',fineCount:0};
    const bal=d.semesterDues-d.paid;
    const st=d.status||'Partial';
    return`<tr class="fin-member-row" onclick="finOpenProfile('${m.id}')">
      <td><div style="display:flex;align-items:center;gap:7px"><div class="sh-av" style="width:24px;height:24px;font-size:8.5px">${m.initials}</div><span style="font-weight:500">${m.name}</span></div></td>
      <td style="color:var(--mt)">${m.classYear}</td>
      <td>$${d.semesterDues}</td>
      <td style="color:var(--gn);font-weight:500">$${d.paid}</td>
      <td style="color:${bal>0?'var(--rd)':'var(--gn)'};font-weight:600">$${bal}</td>
      <td><span class="badge ${statusBadge[st]||'bm2'}">${st}</span></td>
      <td style="color:var(--mt)">${d.lastPayment?formatDateShort(d.lastPayment):'Never'}</td>
      <td style="text-align:center">${d.fineCount>0?`<span class="badge br2">${d.fineCount}</span>`:'—'}</td>
      <td><button class="btn" style="height:23px;font-size:10px;padding:0 7px" onclick="event.stopPropagation();finOpenProfile('${m.id}')"><i class="ti ti-eye"></i></button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" style="text-align:center;padding:22px;color:var(--mt)">No members found</td></tr>'}</tbody>`;
}

// ── FINES TABLE ──
function finRenderFines(){
  const fines=D.finance.fines||[];
  const unpaid=fines.filter(f=>f.status==='Unpaid');
  const total=fines.reduce((s,f)=>s+f.amount,0);
  const outstanding=unpaid.reduce((s,f)=>s+f.amount,0);
  document.getElementById('fin-fines-kpi').innerHTML=
    kpi('Total Fines',fines.length,'Issued this semester','neutral')+
    kpi('Outstanding','$'+outstanding,'Unpaid',outstanding?'down':'neutral')+
    kpi('Collected','$'+(total-outstanding),'Paid','neutral');
  const statusBadge={Paid:'bg2',Unpaid:'br2'};
  const typeColors={'Attendance':'var(--am)','Late Payment':'var(--rd)','Damage':'var(--rd)','Judicial':'var(--navy)','Other':'var(--mt)'};
  document.getElementById('fin-fines-table').innerHTML=`<thead><tr><th>Member</th><th>Type</th><th>Amount</th><th>Reason</th><th>Date Issued</th><th>Status</th><th></th></tr></thead><tbody>${fines.sort((a,b)=>b.date.localeCompare(a.date)).map(f=>{
    const m=getMember(f.memberId);
    return`<tr><td><div style="display:flex;align-items:center;gap:6px"><div class="sh-av" style="width:22px;height:22px;font-size:8px">${m.initials}</div><span style="font-weight:500">${m.name}</span></div></td>
    <td><span style="font-size:10px;font-weight:500;color:${typeColors[f.type]||'var(--mt)'}">${f.type}</span></td>
    <td style="font-weight:600;color:var(--rd)">$${f.amount}</td>
    <td style="color:var(--mt)">${f.reason}</td>
    <td style="color:var(--mt)">${formatDateShort(f.date)}</td>
    <td><span class="badge ${statusBadge[f.status]||'bm2'}">${f.status}</span></td>
    <td style="white-space:nowrap">${f.status==='Unpaid'&&finCheckPerms()?`<button class="btn" style="height:22px;font-size:10px;padding:0 7px;margin-right:3px" onclick="finMarkFinePaid('${f.id}')"><i class="ti ti-check"></i>Paid</button>`:''}${finCheckPerms()?`<button class="btn btn-d" style="height:22px;font-size:10px;padding:0 7px" onclick="deleteFineFn('${f.id}')"><i class="ti ti-trash"></i></button>`:''}</td></tr>`;
  }).join('')||'<tr><td colspan="7" style="text-align:center;padding:22px;color:var(--mt)">No fines issued</td></tr>'}</tbody>`;
}

// ── BUDGET ──
function finRenderBudget(){
  const budEl=document.getElementById('fin-budget-cards');
  budEl.innerHTML=`<div style="display:flex;flex-direction:column;gap:9px">${FIN_BUDGET_CATS.map(cat=>{
    const spent=(D.finance.expenses||[]).filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0);
    const bud=D.finance.budget[cat]||0;
    const pct=bud?Math.min(100,Math.round(spent/bud*100)):0;
    const rem=bud-spent;
    const col=pct>=90?'var(--rd)':pct>=70?'var(--am)':FIN_CAT_COLORS[cat]||'var(--navy)';
    return`<div class="card" style="padding:11px 13px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:7px"><i class="ti ${FIN_CAT_ICONS[cat]}" style="color:${col};font-size:14px"></i><span style="font-size:12.5px;font-weight:500">${cat}</span></div>
        <div style="font-size:11px;color:var(--mt)">$${spent} <span style="color:var(--ht)">/ $${bud}</span></div>
      </div>
      <div class="fin-budget-bar"><div class="fin-budget-fill" style="width:${pct}%;background:${col}"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:10.5px">
        <span style="color:${pct>=90?'var(--rd)':'var(--mt)'}">${pct}% spent</span>
        <span style="color:${rem<0?'var(--rd)':'var(--gn)'};font-weight:600">$${rem} remaining</span>
      </div>
    </div>`;
  }).join('')}</div>`;

  // Expense log
  const exp=[...(D.finance.expenses||[])].sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('fin-expense-log').innerHTML=`<thead><tr><th>Category</th><th>Description</th><th>Amount</th><th>Officer</th><th>Date</th><th></th></tr></thead><tbody>${exp.map(e=>`<tr><td><span style="font-size:10px;font-weight:600;color:${FIN_CAT_COLORS[e.category]||'var(--mt)'}">${e.category}</span></td><td style="font-weight:500">${e.desc}</td><td style="color:var(--rd);font-weight:600">$${e.amount}</td><td style="color:var(--mt)">${getMember(e.officer).name.split(' ')[0]}</td><td style="color:var(--mt)">${formatDateShort(e.date)}</td><td>${finCheckPerms()?`<button class="btn btn-d" style="height:22px;font-size:10px;padding:0 7px" onclick="deleteExpense('${e.id}')"><i class="ti ti-trash"></i></button>`:''}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--mt)">No expenses logged</td></tr>'}</tbody>`;
}

// ── FINANCE SETTINGS ──
function finRenderSettings(){
  if(!D.settings)D.settings={};
  const s=D.settings;
  // In-House
  const ih=document.getElementById('fin-dues-inhouse');if(ih)ih.value=s.duesInHouse||'';
  const ihd=document.getElementById('fin-dues-inhouse-date');if(ihd)ihd.value=s.duesInHouseDate||'';
  // Out-of-House
  const oh=document.getElementById('fin-dues-outofhouse');if(oh)oh.value=s.duesOutOfHouse||'';
  const ohd=document.getElementById('fin-dues-outofhouse-date');if(ohd)ohd.value=s.duesOutOfHouseDate||'';
  // Pledge
  const pl=document.getElementById('fin-dues-pledge');if(pl)pl.value=s.duesPledge||'';
  const pld=document.getElementById('fin-dues-pledge-date');if(pld)pld.value=s.duesPledgeDate||'';
  // National
  const na=document.getElementById('fin-dues-national');if(na)na.value=s.duesNational||'';
  const nad=document.getElementById('fin-dues-national-date');if(nad)nad.value=s.duesNationalDate||'';

  const statusEl=document.getElementById('fin-dues-status');
  if(statusEl){
    const ih=s.duesInHouse||0, oh=s.duesOutOfHouse||0, pl=s.duesPledge||0, na=s.duesNational||0;
    if(!ih&&!oh&&!pl){
      statusEl.textContent='Dues not yet configured. Set amounts above then click Save.';
      statusEl.style.color='var(--am-tx)';
    } else {
      statusEl.textContent=`In-House: $${ih} · Out-of-House: $${oh} · Pledge: $${pl} · National: $${na?'$'+na:'Not set'}`;
      statusEl.style.color='var(--gn-tx)';
    }
  }
  const budInputs=document.getElementById('fin-budget-inputs');
  if(budInputs){
    budInputs.innerHTML=FIN_BUDGET_CATS.map(cat=>`
      <div style="display:flex;align-items:center;gap:9px">
        <i class="ti ${FIN_CAT_ICONS[cat]||'ti-cash'}" style="font-size:13px;color:${FIN_CAT_COLORS[cat]||'var(--mt)'};width:16px;flex-shrink:0"></i>
        <label style="font-size:12px;font-weight:500;flex:1">${cat}</label>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:12px;color:var(--mt)">$</span>
          <input type="number" id="fin-bud-${cat.replace(/\s+/g,'-')}" value="${(D.finance.budget||{})[cat]||0}" min="0" step="50"
            style="width:90px;height:28px;padding:0 7px;border:1px solid var(--bdr);border-radius:6px;font-size:12px;font-family:inherit;color:var(--tx);outline:none;text-align:right"
            oninput="finUpdateBudgetTotal()" onfocus="this.style.borderColor='var(--navy)'" onblur="this.style.borderColor='var(--bdr)'">
        </div>
      </div>`).join('');
    finUpdateBudgetTotal();
  }
}
function finUpdateBudgetTotal(){
  const totalEl=document.getElementById('fin-budget-total');if(!totalEl)return;
  const total=FIN_BUDGET_CATS.reduce((s,cat)=>{const el=document.getElementById('fin-bud-'+cat.replace(/\s+/g,'-'));return s+(el?parseFloat(el.value)||0:0);},0);
  totalEl.textContent='Total: $'+total.toLocaleString();
}
function finSaveDuesSettings(){
  if(!D.settings)D.settings={};
  D.settings.duesInHouse=parseFloat(document.getElementById('fin-dues-inhouse')?.value)||0;
  D.settings.duesInHouseDate=document.getElementById('fin-dues-inhouse-date')?.value||'';
  D.settings.duesOutOfHouse=parseFloat(document.getElementById('fin-dues-outofhouse')?.value)||0;
  D.settings.duesOutOfHouseDate=document.getElementById('fin-dues-outofhouse-date')?.value||'';
  D.settings.duesPledge=parseFloat(document.getElementById('fin-dues-pledge')?.value)||0;
  D.settings.duesPledgeDate=document.getElementById('fin-dues-pledge-date')?.value||'';
  D.settings.duesNational=parseFloat(document.getElementById('fin-dues-national')?.value)||0;
  D.settings.duesNationalDate=document.getElementById('fin-dues-national-date')?.value||'';
  saveData();finRenderSettings();toast('Dues settings saved','success');
}
function finApplyDuesToAll(){
  const s=D.settings||{};
  if(!s.duesInHouse&&!s.duesOutOfHouse&&!s.duesPledge){toast('Set dues amounts first then click Apply','error');return;}
  if(!D.finance.dues)D.finance.dues={};
  D.members.forEach(m=>{
    const amount=getSemDues(m.id);
    if(!D.finance.dues[m.id])D.finance.dues[m.id]={paid:0,status:'Partial',lastPayment:'',fineCount:0,notes:'',restriction:'None'};
    D.finance.dues[m.id].semesterDues=amount;
    const paid=D.finance.dues[m.id].paid||0;
    D.finance.dues[m.id].status=paid>=amount?'Paid':paid>0?'Partial':'Partial';
  });
  saveData();finRenderSettings();toast('Dues applied to all '+D.members.length+' members based on member type','success');
}
function finSaveBudget(){
  if(!D.finance.budget)D.finance.budget={};
  FIN_BUDGET_CATS.forEach(cat=>{const el=document.getElementById('fin-bud-'+cat.replace(/\s+/g,'-'));if(el)D.finance.budget[cat]=parseFloat(el.value)||0;});
  saveData();finRenderSettings();toast('Budget saved','success');
}

// ── NATIONAL DUES ──
function finRenderNational(){
  if(!D.finance.nationalDues)D.finance.nationalDues={};
  const natAmt=D.settings?.duesNational||0;
  const dues=D.finance.nationalDues;
  const paid=D.members.filter(m=>dues[m.id]?.status==='Paid').length;
  const total=D.members.length;
  const totalOwed=D.members.reduce((s,m)=>s+(natAmt-(dues[m.id]?.paid||0)),0);
  document.getElementById('fin-natl-kpi').innerHTML=
    kpi('National Dues Rate',natAmt?'$'+natAmt:'Not set','Per member this semester','neutral')+
    kpi('Paid',paid,paid+' / '+total+' members',paid===total&&total>0?'up':'neutral')+
    kpi('Outstanding','$'+Math.max(0,totalOwed).toLocaleString(),(total-paid)+' members unpaid',totalOwed>0?'down':'neutral')+
    kpi('Total Collected','$'+D.members.reduce((s,m)=>s+(dues[m.id]?.paid||0),0).toLocaleString(),'National dues received','neutral');
  finFilterNational();
}
function finFilterNational(){
  const q=(document.getElementById('fin-natl-search')||{value:''}).value.toLowerCase();
  const flt=(document.getElementById('fin-natl-filter')||{value:''}).value;
  const natAmt=D.settings?.duesNational||0;
  if(!D.finance.nationalDues)D.finance.nationalDues={};
  const dues=D.finance.nationalDues;
  let rows=D.members.map(m=>{
    const d=dues[m.id]||{paid:0,status:'Unpaid',lastPayment:''};
    return {m,d,owed:Math.max(0,natAmt-(d.paid||0)),status:d.paid>=(natAmt||Infinity)&&natAmt>0?'Paid':d.paid>0?'Partial':'Unpaid'};
  });
  if(q)rows=rows.filter(r=>r.m.name.toLowerCase().includes(q));
  if(flt)rows=rows.filter(r=>r.status===flt);
  const canEdit=finCheckPerms();
  const tbl=document.getElementById('fin-natl-table');if(!tbl)return;
  tbl.innerHTML=`<thead><tr><th>Member</th><th>Class</th><th>National Dues</th><th>Paid</th><th>Balance</th><th>Status</th><th>Last Payment</th>${canEdit?'<th></th>':''}</tr></thead>
  <tbody>${rows.map(({m,d,owed,status})=>`<tr>
    <td><div style="display:flex;align-items:center;gap:6px"><div class="sh-av" style="width:22px;height:22px;font-size:8px">${m.initials}</div><span style="font-weight:500">${m.name}</span></div></td>
    <td style="color:var(--mt)">${m.classYear}</td>
    <td style="color:var(--mt)">$${natAmt}</td>
    <td style="color:var(--gn);font-weight:500">$${d.paid||0}</td>
    <td style="color:${owed>0?'var(--rd)':'var(--gn)'};font-weight:600">$${owed}</td>
    <td><span class="badge ${status==='Paid'?'bg2':status==='Partial'?'ba2':'bm2'}">${status}</span></td>
    <td style="color:var(--ht)">${d.lastPayment?formatDateShort(d.lastPayment):'—'}</td>
    ${canEdit?`<td><button class="btn btn-p" style="height:22px;font-size:10px;padding:0 7px" onclick="finOpenNationalPaymentFor('${m.id}')"><i class="ti ti-plus"></i>Pay</button></td>`:''}
  </tr>`).join('')||`<tr><td colspan="8" style="text-align:center;padding:18px;color:var(--ht)">No members found.</td></tr>`}
  </tbody>`;
}
function finOpenNationalPayment(){
  const sel=document.getElementById('fnatl-member');if(!sel)return;
  sel.innerHTML=D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('fnatl-amount').value='';
  document.getElementById('fnatl-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('fnatl-notes').value='';
  document.getElementById('m-fin-national').classList.add('open');
}
function finOpenNationalPaymentFor(memberId){
  finOpenNationalPayment();
  const sel=document.getElementById('fnatl-member');if(sel)sel.value=memberId;
}
function finRecordNationalPayment(){
  const memberId=document.getElementById('fnatl-member').value;
  const amount=parseFloat(document.getElementById('fnatl-amount').value);
  if(!memberId||isNaN(amount)||amount<=0){toast('Member and amount are required','error');return;}
  const date=document.getElementById('fnatl-date').value||new Date().toISOString().split('T')[0];
  const notes=document.getElementById('fnatl-notes').value.trim();
  const natAmt=D.settings?.duesNational||0;
  if(!D.finance.nationalDues)D.finance.nationalDues={};
  if(!D.finance.nationalDues[memberId])D.finance.nationalDues[memberId]={paid:0,status:'Unpaid',lastPayment:''};
  D.finance.nationalDues[memberId].paid=(D.finance.nationalDues[memberId].paid||0)+amount;
  D.finance.nationalDues[memberId].lastPayment=date;
  D.finance.nationalDues[memberId].status=D.finance.nationalDues[memberId].paid>=natAmt&&natAmt>0?'Paid':D.finance.nationalDues[memberId].paid>0?'Partial':'Unpaid';
  if(notes)D.finance.nationalDues[memberId].notes=notes;
  if(!D.finance.nationalPayments)D.finance.nationalPayments=[];
  D.finance.nationalPayments.unshift({id:uid(),memberId,amount,date,notes});
  saveData();closeM(null,document.getElementById('m-fin-national'));
  toast('National dues payment of $'+amount+' recorded for '+getMember(memberId).name.split(' ')[0],'success');
  finRenderNational();
}

// ── PAYMENT PLANS ──
function finRenderPlans(){
  const plans=D.finance.plans||[];
  const active=plans.filter(p=>p.status!=='Completed');
  const tbl=document.getElementById('fin-plans-table');
  if(!tbl)return;
  tbl.innerHTML=`<thead><tr><th>Member</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Next Due</th><th>Status</th><th>Progress</th><th></th></tr></thead><tbody>${plans.length?plans.map(p=>{
    const m=getMember(p.memberId);
    const rem=p.total-p.paid;
    const pct=Math.round(p.paid/p.total*100);
    const status=p.paid>=p.total?'complete':isOverdue(p.nextDue)?'late':'on-track';
    const labels={'on-track':'On Track','late':'Late','complete':'Completed'};
    return`<tr><td><div style="display:flex;align-items:center;gap:6px"><div class="sh-av" style="width:22px;height:22px;font-size:8px">${m.initials}</div><span style="font-weight:500">${m.name}</span></div></td>
    <td>$${p.total}</td><td style="color:var(--gn);font-weight:500">$${p.paid}</td>
    <td style="color:${rem>0?'var(--rd)':'var(--gn)'};font-weight:600">$${rem}</td>
    <td style="color:var(--mt)">${p.nextDue?formatDateShort(p.nextDue):'—'}</td>
    <td><span class="fin-plan-badge ${status}">${labels[status]}</span></td>
    <td><div style="width:80px;height:5px;background:#f0f0ee;border-radius:99px;overflow:hidden"><div style="height:100%;background:var(--gn);width:${pct}%;border-radius:99px"></div></div></td>
    <td>${finCheckPerms()?`<button class="btn btn-d" style="height:22px;font-size:10px;padding:0 7px" onclick="deletePlan('${p.id}')"><i class="ti ti-trash"></i></button>`:''}</td></tr>`;
  }).join(''):''}</tbody>${!plans.length?`<tfoot><tr><td colspan="8">${es('ti-calendar-dollar','blue','No payment plans','Create a plan for members who need installments.',finCheckPerms()?`<button class="btn btn-p" onclick="finOpenAddPlan()"><i class="ti ti-plus"></i>Create Plan</button>`:'')}</td></tr></tfoot>`:''} `;
}

// ── MEMBER FINANCIAL PROFILE ──
function finOpenProfile(memberId){
  const m=D.members.find(x=>x.id===memberId);
  if(!m)return;
  const dues=D.finance.dues||{};
  const d=dues[memberId]||{semesterDues:getSemDues(memberId),paid:0,status:'Partial',lastPayment:'',fineCount:0,notes:'',restriction:'None'};
  const fines=(D.finance.fines||[]).filter(f=>f.memberId===memberId);
  const payments=(D.finance.payments||[]).filter(p=>p.memberId===memberId);
  const plan=(D.finance.plans||[]).find(p=>p.memberId===memberId&&p.status!=='Completed');
  const statusBadge={Paid:'bg2',Partial:'ba2',Overdue:'br2','Payment Plan':'bb2'};
  const modal=document.getElementById('m-fin-profile');
  document.getElementById('fmp-av').textContent=m.initials;
  document.getElementById('fmp-name').textContent=m.name;
  document.getElementById('fmp-role').textContent=m.classYear+' · '+m.role;
  const sb=document.getElementById('fmp-status-badge');
  const st=d.status||'Partial';
  sb.textContent=st;sb.className='badge '+(statusBadge[st]||'bm2');
  const bal=d.semesterDues-d.paid;
  const canEdit=finCheckPerms();
  document.getElementById('fmp-body').innerHTML=`
    <div class="fin-profile-grid" style="margin-bottom:14px">
      <div>
        <div class="card-t" style="margin-bottom:8px">Current Semester</div>
        <div class="fin-stat"><span style="color:var(--mt)">Semester Dues</span><span style="font-weight:500">$${d.semesterDues}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Amount Paid</span><span style="font-weight:600;color:var(--gn)">$${d.paid}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Balance Due</span><span style="font-weight:700;color:${bal>0?'var(--rd)':'var(--gn)'}">$${bal}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Status</span><span class="badge ${statusBadge[st]||'bm2'}">${st}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Last Payment</span><span>${d.lastPayment?formatDateShort(d.lastPayment):'Never'}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Restriction</span><span style="color:${d.restriction&&d.restriction!=='None'?'var(--rd)':'var(--mt)'};font-weight:500">${d.restriction||'None'}</span></div>
        ${canEdit?`<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-p" style="height:26px;font-size:11px" onclick="finOpenPaymentFor('${memberId}')"><i class="ti ti-plus"></i>Record Payment</button>
          <button class="btn" style="height:26px;font-size:11px" onclick="finOpenFineFor('${memberId}')"><i class="ti ti-gavel"></i>Add Fine</button>
        </div>`:''}
      </div>
      <div>
        <div class="card-t" style="margin-bottom:8px">Outstanding Fines (${fines.filter(f=>f.status==='Unpaid').length})</div>
        ${fines.length?fines.map(f=>`<div class="fin-fine-row"><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">${f.type} — $${f.amount}</div><div style="font-size:10px;color:var(--ht)">${formatDateShort(f.date)} · ${f.reason}</div></div><span class="badge ${f.status==='Paid'?'bg2':'br2'}">${f.status}</span></div>`).join(''):`<div style="font-size:11.5px;color:var(--ht);padding:8px 0">No fines</div>`}
        ${plan?`<div class="card-t" style="margin-top:11px;margin-bottom:8px">Payment Plan</div>
        <div class="fin-stat"><span style="color:var(--mt)">Total</span><span>$${plan.total}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Paid</span><span style="color:var(--gn);font-weight:500">$${plan.paid}</span></div>
        <div class="fin-stat"><span style="color:var(--mt)">Next Due</span><span>${plan.nextDue?formatDateShort(plan.nextDue):'—'}</span></div>`:''}
      </div>
    </div>
    <div>
      <div class="card-t" style="margin-bottom:8px">Payment History (${payments.length})</div>
      ${payments.length?payments.map(p=>`<div class="fin-pay-row"><div class="fin-pay-icon" style="background:var(--gn-bg)"><i class="ti ti-cash" style="color:var(--gn)"></i></div><div style="flex:1"><div style="font-size:12px;font-weight:500">$${p.amount} — ${p.type}</div><div style="font-size:10px;color:var(--ht)">${formatDateShort(p.date)} · ${p.method}${p.notes?' · '+p.notes:''}</div></div><span style="font-size:11px;font-weight:600;color:var(--gn)">+$${p.amount}</span></div>`).join(''):`<div style="font-size:11.5px;color:var(--ht);padding:6px 0">No payment history</div>`}
    </div>`;
  modal.classList.add('open');
}

// ── RECORD PAYMENT ──
function finOpenPayment(){
  const sel=document.getElementById('fpay-member');
  sel.innerHTML=D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('fpay-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('fpay-amount').value='';
  document.getElementById('m-fin-payment').classList.add('open');
}
function finOpenPaymentFor(memberId){
  finOpenPayment();
  const sel=document.getElementById('fpay-member');if(sel)sel.value=memberId;
}

async function finRecordPayment(){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can record payments.','error');return;}
  const memberId=document.getElementById('fpay-member').value;
  const amount=parseFloat(document.getElementById('fpay-amount').value);
  if(!memberId||isNaN(amount)||amount<=0){toast('Member and amount are required','error');return;}
  const date=document.getElementById('fpay-date').value||new Date().toISOString().split('T')[0];
  const type=document.getElementById('fpay-type').value;
  const method=document.getElementById('fpay-method').value;
  const notes=document.getElementById('fpay-notes').value.trim();
  const payment={id:'py'+uid(),memberId,amount,type,method,date,notes,by:CURRENT_USER?CURRENT_USER.mid:'m3'};
  D.finance.payments.unshift(payment);
  if(!D.finance.dues[memberId])D.finance.dues[memberId]={semesterDues:getSemDues(memberId),paid:0,status:'Partial',lastPayment:'',fineCount:0,notes:'',restriction:'None'};
  const prevPaid=D.finance.dues[memberId].paid;
  const prevLastPayment=D.finance.dues[memberId].lastPayment;
  const prevStatus=D.finance.dues[memberId].status;
  D.finance.dues[memberId].paid=Math.min(D.finance.dues[memberId].semesterDues,D.finance.dues[memberId].paid+amount);
  D.finance.dues[memberId].lastPayment=date;
  D.finance.dues[memberId].status=D.finance.dues[memberId].paid>=D.finance.dues[memberId].semesterDues?'Paid':'Partial';
  try{
    await saveData();
    closeM(null,document.getElementById('m-fin-payment'));
    toast('Payment of $'+amount+' recorded for '+getMember(memberId).name.split(' ')[0],'success');
    if(FIN_ACTIVE_TAB==='fin-dues')finRenderDues();
    else if(FIN_ACTIVE_TAB==='fin-overview')finRenderOverview();
  }catch(e){
    D.finance.payments=D.finance.payments.filter(p=>p.id!==payment.id);
    D.finance.dues[memberId].paid=prevPaid;
    D.finance.dues[memberId].lastPayment=prevLastPayment;
    D.finance.dues[memberId].status=prevStatus;
    toast('Failed to record payment. Please try again.','error');
  }
}

// ── ADD FINE ──
function finOpenAddFine(){
  const sel=document.getElementById('ffine-member');
  sel.innerHTML=D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('ffine-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('ffine-amount').value='';
  document.getElementById('ffine-reason').value='';
  document.getElementById('m-fin-fine').classList.add('open');
}
function finOpenFineFor(memberId){
  finOpenAddFine();
  const sel=document.getElementById('ffine-member');if(sel)sel.value=memberId;
}

async function finAddFine(){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can issue fines.','error');return;}
  const memberId=document.getElementById('ffine-member').value;
  const amount=parseFloat(document.getElementById('ffine-amount').value);
  if(!memberId||isNaN(amount)||amount<=0){toast('Member and amount are required','error');return;}
  const fine={id:'fn'+uid(),memberId,type:document.getElementById('ffine-type').value,amount,reason:document.getElementById('ffine-reason').value.trim()||'Fine issued',date:document.getElementById('ffine-date').value||new Date().toISOString().split('T')[0],status:'Unpaid',paidDate:''};
  D.finance.fines.unshift(fine);
  if(!D.finance.dues[memberId])D.finance.dues[memberId]={semesterDues:getSemDues(memberId),paid:0,status:'Partial',lastPayment:'',fineCount:0,notes:'',restriction:'None'};
  const prevCount=D.finance.dues[memberId].fineCount||0;
  D.finance.dues[memberId].fineCount=prevCount+1;
  try{
    await saveData();
    closeM(null,document.getElementById('m-fin-fine'));
    toast('Fine of $'+amount+' issued to '+getMember(memberId).name.split(' ')[0],'success');
    if(FIN_ACTIVE_TAB==='fin-fines')finRenderFines();
    else if(FIN_ACTIVE_TAB==='fin-overview')finRenderOverview();
  }catch(e){
    D.finance.fines=D.finance.fines.filter(f=>f.id!==fine.id);
    D.finance.dues[memberId].fineCount=prevCount;
    toast('Failed to issue fine. Please try again.','error');
  }
}

async function finMarkFinePaid(fineId){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can mark fines paid.','error');return;}
  const f=D.finance.fines.find(x=>x.id===fineId);
  if(!f)return;
  const prevStatus=f.status;const prevDate=f.paidDate;
  f.status='Paid';f.paidDate=new Date().toISOString().split('T')[0];
  try{await saveData();finRenderFines();toast('Fine marked as paid','success');}
  catch(e){f.status=prevStatus;f.paidDate=prevDate;toast('Failed to update fine. Please try again.','error');}
}

// ── LOG EXPENSE ──
function finOpenAddExpense(){
  document.getElementById('fexp-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('fexp-amount').value='';
  document.getElementById('fexp-desc').value='';
  const sel=document.getElementById('fexp-officer');
  sel.innerHTML=D.members.filter(m=>m.role!=='Member').map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  if(CURRENT_USER)sel.value=CURRENT_USER.mid;
  document.getElementById('m-fin-expense').classList.add('open');
}

async function finLogExpense(){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can log expenses.','error');return;}
  const cat=document.getElementById('fexp-cat').value;
  const amount=parseFloat(document.getElementById('fexp-amount').value);
  const desc=document.getElementById('fexp-desc').value.trim();
  if(!cat||isNaN(amount)||amount<=0||!desc){toast('Category, amount, and description are required','error');return;}
  const expense={id:'ex'+uid(),category:cat,desc,amount,officer:document.getElementById('fexp-officer').value,date:document.getElementById('fexp-date').value||new Date().toISOString().split('T')[0]};
  D.finance.expenses.unshift(expense);
  try{
    await saveData();
    closeM(null,document.getElementById('m-fin-expense'));
    toast('Expense of $'+amount+' logged under '+cat,'success');
    if(FIN_ACTIVE_TAB==='fin-budget')finRenderBudget();
    else if(FIN_ACTIVE_TAB==='fin-overview')finRenderOverview();
  }catch(e){
    D.finance.expenses=D.finance.expenses.filter(x=>x.id!==expense.id);
    toast('Failed to log expense. Please try again.','error');
  }
}

// ── PAYMENT PLAN ──
function finOpenAddPlan(){
  const sel=document.getElementById('fplan-member');
  sel.innerHTML=D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('fplan-start').value=new Date().toISOString().split('T')[0];
  document.getElementById('fplan-total').value='';
  document.getElementById('fplan-notes').value='';
  document.getElementById('m-fin-plan').classList.add('open');
}

async function finCreatePlan(){
  if(!canWrite()||!finCheckPerms()){toast('Only Treasurer, President, or VP can create payment plans.','error');return;}
  const memberId=document.getElementById('fplan-member').value;
  const total=parseFloat(document.getElementById('fplan-total').value);
  if(!memberId||isNaN(total)||total<=0){toast('Member and total are required','error');return;}
  const inst=parseInt(document.getElementById('fplan-inst').value);
  const startDate=new Date(document.getElementById('fplan-start').value+'T12:00:00');
  const nextDue=startDate.toISOString().split('T')[0];
  const plan={id:'pl'+uid(),memberId,total,paid:0,installments:inst,installmentAmt:Math.round(total/inst*100)/100,nextDue,notes:document.getElementById('fplan-notes').value.trim(),status:'Active',createdDate:new Date().toISOString().split('T')[0]};
  D.finance.plans.push(plan);
  const prevDuesStatus=D.finance.dues[memberId]?.status;
  if(D.finance.dues[memberId])D.finance.dues[memberId].status='Payment Plan';
  try{
    await saveData();
    closeM(null,document.getElementById('m-fin-plan'));
    toast('Payment plan created for '+getMember(memberId).name.split(' ')[0],'success');
    if(FIN_ACTIVE_TAB==='fin-plans')finRenderPlans();
  }catch(e){
    D.finance.plans=D.finance.plans.filter(p=>p.id!==plan.id);
    if(D.finance.dues[memberId]&&prevDuesStatus!==undefined)D.finance.dues[memberId].status=prevDuesStatus;
    toast('Failed to create payment plan. Please try again.','error');
  }
}

// ── EXPORT ──
function finExport(){
  const dues=D.finance.dues||{};
  let csv='Name,Class Year,Semester Dues,Paid,Balance,Status,Last Payment,Fine Count\n';
  D.members.forEach(m=>{
    const d=dues[m.id]||{semesterDues:getSemDues(m.id),paid:0,status:'Partial',lastPayment:'',fineCount:0};
    csv+=`${m.name},${m.classYear},$${d.semesterDues},$${d.paid},$${d.semesterDues-d.paid},${d.status||'Partial'},${d.lastPayment||''},${d.fineCount||0}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dues_report.csv';a.click();
}


// ── EXECUTIVE WEEKLY SNAPSHOT ──
function renderSnapshot(){
  const el=document.getElementById('d-snapshot-grid');
  const dateEl=document.getElementById('d-snapshot-date');
  if(!el)return;
  if(dateEl)dateEl.textContent='Week of '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  const now=new Date();
  const weekEnd=new Date(now);weekEnd.setDate(weekEnd.getDate()+7);

  // ── Mandatory events this week ──
  const thisWeekEvs=D.events.filter(e=>{
    if(!e.mandatory)return false;
    const d=new Date(e.date+'T12:00:00');
    return d>=now&&d<=weekEnd;
  }).sort((a,b)=>a.date.localeCompare(b.date));

  // ── Overdue tasks ──
  const overdue=D.tasks.filter(t=>t.status!=='done'&&isOverdue(t.dueDate))
    .sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]||2)-({urgent:0,high:1,medium:2,low:3}[b.priority]||2))
    .slice(0,5);

  // ── Attendance concerns (below 75%) ──
  const attRisk=D.members.filter(m=>getAttendanceRate(m.id)<75)
    .sort((a,b)=>getAttendanceRate(a.id)-getAttendanceRate(b.id)).slice(0,5);

  // ── Dues concerns ──
  const dues=D.finance?.dues||{};
  const unpaid=D.members.filter(m=>{const d=dues[m.id];return !d||d.status==='Partial'||d.status==='Unpaid';})
    .slice(0,5);

  // ── Recruitment follow-ups (not contacted in 5+ days) ──
  const rushees=D.recruitment?.rushees||[];
  const stale=rushees.filter(r=>{
    if(['Accepted','Bid Extended'].includes(r.stage))return false;
    if(!r.lastContact)return r.stage!=='New Lead';
    return Math.round((now-new Date(r.lastContact+'T12:00:00'))/86400000)>5;
  }).slice(0,5);

  // ── Upcoming task deadlines (next 7 days) ──
  const deadlines=D.tasks.filter(t=>{
    if(t.status==='done'||!t.dueDate)return false;
    const d=new Date(t.dueDate+'T12:00:00');
    return d>=now&&d<=weekEnd;
  }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5);

  function snapCard(icon,color,title,count,countLabel,items,emptyMsg,pageLink){
    const statusColor=count===0?'var(--gn)':color;
    return`<div class="card" style="border:1px solid var(--bdr);padding:12px 13px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:28px;height:28px;border-radius:8px;background:${statusColor}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="ti ${icon}" style="font-size:13px;color:${statusColor}"></i>
          </div>
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--mt)">${title}</span>
        </div>
        <span style="font-size:18px;font-weight:700;color:${statusColor};line-height:1">${count}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${items.length?items.map(row=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:7px;padding:4px 0;border-bottom:1px solid var(--bdr)">
          <span style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${row.label}</span>
          ${row.badge?`<span style="font-size:9.5px;font-weight:600;padding:1px 6px;border-radius:99px;flex-shrink:0;${row.badgeStyle}">${row.badge}</span>`:''}
        </div>`).join(''):`<div style="padding:6px 0;font-size:11px;color:var(--ht);display:flex;align-items:center;gap:5px"><i class="ti ti-circle-check" style="color:var(--gn);font-size:13px"></i>${emptyMsg}</div>`}
      </div>
      ${pageLink?`<div style="margin-top:8px"><button class="card-a" onclick="rbacNav('${pageLink}',null)" style="font-size:10.5px">${count>0?'View all →':'Open →'}</button></div>`:''}
    </div>`;
  }

  const cards=[
    snapCard(
      'ti-calendar-event','var(--navy)','This Week\u2019s Events',thisWeekEvs.length,'mandatory events',
      thisWeekEvs.map(e=>{const days=Math.max(0,Math.round((new Date(e.date+'T12:00:00')-now)/86400000));return{label:e.title,badge:days===0?'Today':days===1?'Tomorrow':formatDateShort(e.date),badgeStyle:'background:var(--bl-bg);color:var(--bl-tx)'};}),'No mandatory events this week','calendar'
    ),
    snapCard(
      'ti-clock','var(--rd)','Overdue Tasks',overdue.length,'tasks',
      overdue.map(t=>{const m=getMember(t.assignedTo);return{label:t.title,badge:m.name.split(' ')[0],badgeStyle:'background:#f0f0ee;color:var(--mt)'};}),'All tasks on track','tasks'
    ),
    snapCard(
      'ti-user-exclamation','var(--am)','Attendance Concerns',attRisk.length,'members',
      attRisk.map(m=>({label:m.name,badge:getAttendanceRate(m.id)+'%',badgeStyle:`background:var(--rd-bg);color:var(--rd-tx)`})),'All members above 75%','attendance'
    ),
    snapCard(
      'ti-cash','var(--am)','Dues Outstanding',unpaid.length,'members',
      unpaid.map(m=>{const d=dues[m.id];const bal=d?(d.semesterDues||0)-(d.paid||0):null;return{label:m.name,badge:bal?'$'+bal:'Unpaid',badgeStyle:'background:var(--am-bg);color:var(--am-tx)'};}),'All dues collected','finance'
    ),
    snapCard(
      'ti-user-plus','var(--bl)','Recruitment Follow-Ups',stale.length,'rushees',
      stale.map(r=>{const days=r.lastContact?Math.round((now-new Date(r.lastContact+'T12:00:00'))/86400000):null;return{label:r.name,badge:days?days+'d ago':'No contact',badgeStyle:'background:var(--rd-bg);color:var(--rd-tx)'};}),'All rushees recently contacted','recruitment'
    ),
    snapCard(
      'ti-hourglass','var(--navy)','Upcoming Deadlines',deadlines.length,'tasks due this week',
      deadlines.map(t=>{const d=new Date(t.dueDate+'T12:00:00');const days=Math.max(0,Math.round((d-now)/86400000));return{label:t.title,badge:days===0?'Today':days===1?'Tomorrow':formatDateShort(t.dueDate),badgeStyle:'background:var(--bl-bg);color:var(--bl-tx)'};}),'No deadlines this week','tasks'
    ),
  ];

  el.innerHTML=cards.join('');
}


function renderSettings(){
  // Ensure all settings fields exist
  if(!D.settings.chapterName)D.settings.chapterName='Beta Chapter';
  if(!D.settings.university)D.settings.university='State University';

  document.getElementById('se-name').value=D.settings.name||'';
  document.getElementById('se-year').value=D.settings.year||'';
  document.getElementById('se-class').value=D.settings.classYear||'Senior';

  // Chapter info editable fields
  const chInfEl=document.getElementById('se-chapter-info');
  if(chInfEl){
    chInfEl.innerHTML=`
      <div class="fr c2">
        <div class="fld"><label>Chapter Name</label><input id="se-ch-name" value="${D.settings.chapterName||''}" placeholder="e.g. Beta Chapter"></div>
        <div class="fld"><label>University</label><input id="se-ch-uni" value="${D.settings.university||''}" placeholder="e.g. State University"></div>
      </div>
      <div class="fr c2">
        <div class="fld"><label>Founded Year</label><input id="se-ch-founded" value="${D.settings.chapterFounded||''}" placeholder="e.g. 1948" type="number"></div>
        <div class="fld"><label>IFC Chapter Email</label><input id="se-ch-email" value="${D.settings.chapterEmail||''}" placeholder="president@ato-demo.edu"></div>
      </div>
      <button class="btn btn-p" onclick="saveChapterInfo()"><i class="ti ti-device-floppy"></i>Save Chapter Info</button>
    `;
  }

  // System info (read-only)
  const lastLoginDisplay=CURRENT_USER&&CURRENT_USER.lastLogin?CURRENT_USER.lastLogin:'First session';
  document.getElementById('se-info').innerHTML=[
    ['Chapter',D.settings.chapterName||'Beta Chapter'],
    ['University',D.settings.university||'State University'],
    ['Semester',getSemester()],
    ['Active members',D.members.length],
    ['Your role',CURRENT_USER?CURRENT_USER.title:'—'],
    ['Last login',lastLoginDisplay]
  ].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bdr);font-size:12.5px"><span style="color:var(--mt)">${l}</span><span style="font-weight:500">${v}</span></div>`).join('');

  // User management table
  renderUserSettings();
}

function saveChapterInfo(){
  D.settings.chapterName=document.getElementById('se-ch-name')?.value.trim()||D.settings.chapterName;
  D.settings.university=document.getElementById('se-ch-uni')?.value.trim()||D.settings.university;
  D.settings.chapterFounded=document.getElementById('se-ch-founded')?.value||D.settings.chapterFounded;
  D.settings.chapterEmail=document.getElementById('se-ch-email')?.value.trim()||D.settings.chapterEmail;
  saveData();renderSettings();toast('Chapter info saved','success');
}

// renderUserSettings is defined in auth.js


// ══════════════════════════════════════════════════
// PHILANTHROPY & SERVICE (SPLIT SCREEN)
// ══════════════════════════════════════════════════
