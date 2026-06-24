/* OpsCore 2.0 Demo — Reports */
let RP_ACTIVE = 'weekly';

function renderReports(){
  const semEl=document.getElementById('rp-semester-lbl');
  if(semEl)semEl.textContent=getSemester();
  rpGenerate(RP_ACTIVE);
}

function rpSelect(el, type){
  document.querySelectorAll('.rp-item').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
  RP_ACTIVE=type;
  const titles={weekly:'Weekly Exec Summary',attendance:'Attendance Report',recruitment:'Recruitment Report',finance:'Finance Snapshot',academics:'Academic Standing',full:'Full Chapter Report'};
  const t=document.getElementById('rp-preview-title');
  if(t)t.textContent=titles[type]||type;
  rpGenerate(type);
}

function rpGenerate(type){
  const el=document.getElementById('rp-preview');
  if(!el)return;
  const fns={weekly:rpWeekly,attendance:rpAttendance,recruitment:rpRecruitment,finance:rpFinance,academics:rpAcademics,full:rpFull};
  el.innerHTML=(fns[type]||rpWeekly)();
}

// ── HELPERS ──
function rpHeader(title, subtitle){
  const now=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  return`<div class="rp-doc-header">
    <div class="rp-doc-title">${title}</div>
    <div class="rp-doc-meta">
      <span>ATO Beta Chapter · State University</span>
      <span>${getSemester()}</span>
      <span>Generated ${now}</span>
    </div>
    ${subtitle?`<div style="font-size:11.5px;opacity:.75;margin-top:6px">${subtitle}</div>`:''}
  </div>`;
}
function rpSection(icon, title, html){
  return`<div class="rp-section">
    <div class="rp-section-title"><i class="ti ${icon}"></i>${title}</div>
    ${html}
  </div>`;
}
function rpKpis(items){
  return`<div class="rp-kpi-row">${items.map(k=>`<div class="rp-kpi">
    <div class="rp-kpi-val" style="color:${k.color||'var(--tx)'}">${k.val}</div>
    <div class="rp-kpi-lbl">${k.label}</div>
  </div>`).join('')}</div>`;
}
function rpTable(heads, rows){
  return`<table class="rp-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

// ── WEEKLY EXEC SUMMARY ──
function rpWeekly(){
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const dn=D.tasks.filter(t=>t.status==='done').length;
  const openT=D.tasks.filter(t=>t.status!=='done').length;
  const ovT=D.tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='done').length;
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;
  const upEvents=D.events.filter(e=>isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const overdue=D.tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='done').sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]||2)-({urgent:0,high:1,medium:2,low:3}[b.priority]||2));
  const lowAtt=D.members.filter(m=>getAttendanceRate(m.id)<75);
  const unassignedShifts=D.shifts.filter(s=>isUpcoming(s.date)&&!s.memberId).length;

  return rpHeader('Weekly Executive Summary','Officer briefing — key metrics, action items, and upcoming events')+
  rpSection('ti-chart-bar','Chapter Pulse',rpKpis([
    {label:'Attendance Avg',val:avg+'%',color:avg>=85?'var(--gn)':avg<75?'var(--rd)':'var(--am)'},
    {label:'Open Tasks',val:openT,color:ovT>0?'var(--rd)':'var(--tx)'},
    {label:'Tasks Overdue',val:ovT,color:ovT>0?'var(--rd)':'var(--gn)'},
    {label:'Open J-Board Cases',val:openCases,color:openCases>0?'var(--rd)':'var(--gn)'},
  ]))+
  rpSection('ti-alert-triangle','Action Items Required',
    (()=>{
      const items=[];
      if(ovT>0)items.push({icon:'ti-clock',text:`${ovT} overdue task${ovT>1?'s':''} — assign ownership and set new deadlines`,color:'var(--rd-bg)',ic:'var(--rd-tx)'});
      if(lowAtt.length)items.push({icon:'ti-user-x',text:`${lowAtt.length} member${lowAtt.length>1?'s':''} below 75% attendance: ${lowAtt.slice(0,3).map(m=>m.name.split(' ')[0]).join(', ')}${lowAtt.length>3?` +${lowAtt.length-3} more`:''}`,color:'var(--am-bg)',ic:'var(--am-tx)'});
      if(unassignedShifts>0)items.push({icon:'ti-shield-exclamation',text:`${unassignedShifts} sober bro shift${unassignedShifts>1?'s':''} unassigned — needs coverage before next event`,color:'var(--bl-bg)',ic:'var(--bl-tx)'});
      if(openCases>0)items.push({icon:'ti-scale',text:`${openCases} open Judicial Board case${openCases>1?'s':''} — schedule hearings and follow up`,color:'var(--rd-bg)',ic:'var(--rd-tx)'});
      if(!items.length)return`<div style="color:var(--gn);font-size:12px;padding:10px 0">✓ No urgent action items — chapter is in good standing.</div>`;
      return items.map(i=>`<div class="rp-alert-row"><i class="ti ${i.icon}" style="color:${i.ic};font-size:13px;flex-shrink:0;margin-top:1px"></i><span>${i.text}</span></div>`).join('');
    })()
  )+
  rpSection('ti-calendar-event','Upcoming Events',
    upEvents.length?rpTable(['Event','Date','Type','Location','Required'],upEvents.map(e=>[
      `<strong>${e.title}</strong>`,formatDate(e.date),e.type||'—',e.location||'—',e.mandatory?'<span style="color:var(--rd);font-weight:600">Yes</span>':'No'
    ])):(`<div style="color:var(--mt);font-size:12px">No upcoming events scheduled.</div>`)
  )+
  rpSection('ti-checkbox','Overdue Tasks',
    overdue.length?rpTable(['Task','Assignee','Priority','Days Overdue'],overdue.slice(0,8).map(t=>{
      const daysOv=Math.round((new Date()-new Date(t.dueDate+'T12:00:00'))/(1000*86400));
      const pc={urgent:'var(--rd)',high:'var(--rd)',medium:'var(--am)',low:'var(--mt)'};
      return[`<strong>${t.title}</strong>`,getMember(t.assignedTo).name,`<span style="color:${pc[t.priority]||'var(--mt)'};">${t.priority}</span>`,`<span style="color:var(--rd)">${daysOv}d</span>`];
    })):(`<div style="color:var(--gn);font-size:12px">No overdue tasks — all on track.</div>`)
  )+
  rpSection('ti-users','Officer Accountability',
    (()=>{
      const offs=D.members.filter(m=>m.role!=='Member');
      if(!offs.length)return`<div style="color:var(--mt);font-size:12px">No officers found. Assign roles in Members.</div>`;
      return rpTable(['Officer','Role','Tasks Done','Attendance','Status'],offs.map(m=>{
        const ts=getTaskMetrics(m.id);const att=getAttendanceRate(m.id);
        const s=ts.rate>=80&&att>=85?['On Track','var(--gn)']:ts.rate>=60||att>=75?['Behind','var(--am)']:['At Risk','var(--rd)'];
        return[`<strong>${m.name}</strong>`,m.role,`${ts.done}/${ts.total}`,`<span style="color:${att>=85?'var(--gn)':att>=75?'var(--navy)':att<75?'var(--rd)':'var(--am)'}">${att}%</span>`,`<span style="color:${s[1]}">${s[0]}</span>`];
      }));
    })()
  );
}

// ── ATTENDANCE REPORT ──
function rpAttendance(){
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const good=D.members.filter(m=>getAttendanceRate(m.id)>=85).length;
  const risk=D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=65&&r<85;}).length;
  const warn=D.members.filter(m=>getAttendanceRate(m.id)<65).length;
  const mandEvents=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date));
  const sorted=[...D.members].sort((a,b)=>getAttendanceRate(a.id)-getAttendanceRate(b.id));

  return rpHeader('Attendance Report',`${mandEvents.length} mandatory events tracked this semester`)+
  rpSection('ti-chart-bar','Summary',rpKpis([
    {label:'Chapter Avg',val:avg+'%',color:avg>=85?'var(--gn)':avg<75?'var(--rd)':'var(--am)'},
    {label:'Good Standing (85%+)',val:good,color:'var(--gn)'},
    {label:'At Risk (65–84%)',val:risk,color:'var(--am)'},
    {label:'Warning (<65%)',val:warn,color:warn>0?'var(--rd)':'var(--gn)'},
  ]))+
  rpSection('ti-alert-triangle','Members Requiring Attention',
    (()=>{
      const atRisk=sorted.filter(m=>getAttendanceRate(m.id)<80);
      if(!atRisk.length)return`<div style="color:var(--gn);font-size:12px">✓ All members above 80% — no attendance concerns.</div>`;
      return rpTable(['Member','Class','Rate','Status'],atRisk.map(m=>{
        const r=getAttendanceRate(m.id);
        const s=r<65?['Warning','var(--rd)']:r<75?['At Risk','var(--rd)']:['Watch','var(--am)'];
        return[`<strong>${m.name}</strong>`,m.classYear,`<span style="color:${s[1]};font-weight:700">${r}%</span>`,`<span style="color:${s[1]}">${s[0]}</span>`];
      }));
    })()
  )+
  rpSection('ti-users','Full Member Attendance',
    rpTable(['Member','Class','Role','Attendance Rate','Status'],[...D.members].sort((a,b)=>getAttendanceRate(b.id)-getAttendanceRate(a.id)).map(m=>{
      const r=getAttendanceRate(m.id);
      const s=r>=85?['Good','var(--gn)']:r>=75?['Good','var(--navy)']:r>=65?['At Risk','var(--am)']:['Warning','var(--rd)'];
      return[m.name,m.classYear,m.role||'Member',`<span style="font-weight:600;color:${s[1]}">${r}%</span>`,`<span style="color:${s[1]}">${s[0]}</span>`];
    }))
  )+
  rpSection('ti-calendar-check','Mandatory Events This Semester',
    mandEvents.length?rpTable(['Event','Date','Present','Absent','Rate'],mandEvents.sort((a,b)=>b.date.localeCompare(a.date)).map(ev=>{
      const att=D.attendance[ev.id]||{};
      const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;
      const abs=Object.values(att).filter(v=>v==='absent').length;
      const rate=Math.round(pres/tot*100);
      return[`<strong>${ev.title}</strong>`,formatDate(ev.date),pres,abs,`<span style="color:${rate>=85?'var(--gn)':rate>=75?'var(--navy)':'var(--rd)'};font-weight:600">${rate}%</span>`];
    })):(`<div style="color:var(--mt);font-size:12px">No mandatory events marked yet.</div>`)
  );
}

// ── RECRUITMENT REPORT ──
function rpRecruitment(){
  const rushees=D.recruitment.rushees||[];
  const RCG=D.recruitment.goal||{target:20};
  const accepted=rushees.filter(r=>r.stage==='Accepted').length;
  const bidReady=rushees.filter(r=>['Bid Ready','Bid Extended','Accepted'].includes(r.stage)).length;
  const hot=rushees.filter(r=>r.bidScore>=70).length;
  const stale=rushees.filter(r=>{if(!r.lastContact)return true;return Math.round((new Date()-new Date(r.lastContact+'T12:00:00'))/(86400000))>5&&!['Accepted','Bid Extended'].includes(r.stage);});

  return rpHeader('Recruitment Report',`${rushees.length} rushees in pipeline · ${getSemester()}`)+
  rpSection('ti-chart-bar','Pipeline Summary',rpKpis([
    {label:'Total Rushees',val:rushees.length,color:'var(--navy)'},
    {label:'Bid Ready / Accepted',val:bidReady,color:'var(--gn)'},
    {label:'Hot Prospects (70+)',val:hot,color:'var(--am-tx)'},
    {label:'Goal Progress',val:Math.round(rushees.length/(RCG.target||20)*100)+'%',color:'var(--bl)'},
  ]))+
  rpSection('ti-filter','Stage Breakdown',
    rpTable(['Stage','Count','% of Total'],RC_STAGES.map(s=>{
      const n=rushees.filter(r=>r.stage===s).length;
      const pct=rushees.length?Math.round(n/rushees.length*100):0;
      return[s,n,`${pct}%`];
    }))
  )+
  rpSection('ti-alert-circle','Needs Attention',
    (()=>{
      const items=[];
      if(stale.length)items.push(`${stale.length} rushee${stale.length>1?'s':''} not contacted in 5+ days: ${stale.slice(0,4).map(r=>r.name).join(', ')}${stale.length>4?' ...':''}`);
      const newNoContact=rushees.filter(r=>r.stage==='New Lead'&&!r.lastContact);
      if(newNoContact.length)items.push(`${newNoContact.length} new lead${newNoContact.length>1?'s':''} never contacted: ${newNoContact.slice(0,3).map(r=>r.name).join(', ')}`);
      if(!items.length)return`<div style="color:var(--gn);font-size:12px">✓ All rushees recently contacted — recruitment on track.</div>`;
      return items.map(i=>`<div class="rp-alert-row"><i class="ti ti-clock" style="color:var(--am-tx);font-size:13px;flex-shrink:0"></i><span>${i}</span></div>`).join('');
    })()
  )+
  rpSection('ti-users','Full Rushee List',
    rushees.length?rpTable(['Name','Stage','Bid Score','Recruiter','Last Contact'],
      [...rushees].sort((a,b)=>(b.bidScore||0)-(a.bidScore||0)).map(r=>{
        const sc=r.bidScore>=85?'var(--gn)':r.bidScore>=70?'var(--bl)':r.bidScore>=50?'var(--am)':'var(--rd)';
        return[`<strong>${r.name}</strong>`,r.stage,`<span style="font-weight:700;color:${sc}">${r.bidScore||0}</span>`,getMember(r.recruiter).name||'—',r.lastContact?formatDateShort(r.lastContact):'<span style="color:var(--rd)">Never</span>'];
      })):`<div style="color:var(--mt);font-size:12px">No rushees in the pipeline yet.</div>`
  );
}

// ── FINANCE SNAPSHOT ──
function rpFinance(){
  const fin=D.finance||{};
  const dues=fin.dues||{};
  const budget=fin.budget||{semesterBudget:0,allocated:0};
  const totalOwed=D.members.reduce((s,m)=>{const d=dues[m.id]||{};return s+(d.semesterDues||getSemDues(m.id));},0);
  const totalPaid=D.members.reduce((s,m)=>{const d=dues[m.id]||{};return s+(d.paid||0);},0);
  const outstanding=totalOwed-totalPaid;
  const collRate=totalOwed>0?Math.round(totalPaid/totalOwed*100):0;
  const unpaid=D.members.filter(m=>{const d=dues[m.id]||{};const owed=d.semesterDues||getSemDues(m.id);return(d.paid||0)<owed;});
  const expenses=fin.expenses||[];
  const totalExp=expenses.reduce((s,e)=>s+(e.amount||0),0);

  return rpHeader('Finance Snapshot',`Dues collection and budget status · ${getSemester()}`)+
  rpSection('ti-chart-bar','Financial Summary',rpKpis([
    {label:'Total Owed',val:'$'+totalOwed.toLocaleString(),color:'var(--navy)'},
    {label:'Collected',val:'$'+totalPaid.toLocaleString(),color:'var(--gn)'},
    {label:'Outstanding',val:'$'+outstanding.toLocaleString(),color:outstanding>0?'var(--rd)':'var(--gn)'},
    {label:'Collection Rate',val:collRate+'%',color:collRate>=80?'var(--gn)':collRate>=60?'var(--am)':'var(--rd)'},
  ]))+
  rpSection('ti-alert-circle','Overdue Dues',
    unpaid.length?rpTable(['Member','Class','Owed','Paid','Balance','Status'],unpaid.map(m=>{
      const d=dues[m.id]||{};const owed=d.semesterDues||getSemDues(m.id);const paid=d.paid||0;
      return[`<strong>${m.name}</strong>`,m.classYear,`$${owed}`,`$${paid}`,`<span style="color:var(--rd);font-weight:600">$${owed-paid}</span>`,d.status||'Partial'];
    })):(`<div style="color:var(--gn);font-size:12px">✓ All members current on dues.</div>`)
  )+
  rpSection('ti-receipt','Recent Expenses',
    expenses.length?rpTable(['Description','Category','Amount','Date'],
      [...expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,10).map(e=>[
        e.desc||e.description||'—',e.category||'—',`$${(e.amount||0).toLocaleString()}`,e.date?formatDateShort(e.date):'—'
      ])):(`<div style="color:var(--mt);font-size:12px">No expenses logged yet.</div>`)
  );
}

// ── ACADEMIC STANDING ──
function rpAcademics(){
  if(!D.academics)D.academics={gpas:{},history:[]};
  const withGpa=D.members.map(m=>{const g=D.academics.gpas[m.id]||{};const cum=g.cumulativeGpa?parseFloat(g.cumulativeGpa):null;const pri=g.priorGpa?parseFloat(g.priorGpa):null;return{m,cum,pri};}).filter(x=>x.cum!==null||x.pri!==null);
  const gpas=withGpa.map(x=>x.cum??x.pri??0);
  const avgGpa=gpas.length?(gpas.reduce((a,b)=>a+b,0)/gpas.length).toFixed(2):'—';
  const deans=withGpa.filter(x=>(x.cum??0)>=3.5).length;
  const warn=withGpa.filter(x=>(x.cum??x.pri??4)<2.75).length;

  return rpHeader('Academic Standing Report',`Chapter GPA and individual member academic status · ${getSemester()}`)+
  rpSection('ti-chart-bar','Academic Summary',rpKpis([
    {label:'Chapter Avg GPA',val:avgGpa,color:'var(--navy)'},
    {label:"Dean's List (3.5+)",val:deans,color:'var(--gn)'},
    {label:'Members Tracked',val:withGpa.length+'/'+D.members.length,color:'var(--bl)'},
    {label:'Academic Warnings (<2.75)',val:warn,color:warn>0?'var(--rd)':'var(--gn)'},
  ]))+
  (warn>0?rpSection('ti-alert-triangle','Academic Warnings',
    rpTable(['Member','Class','Cumulative GPA','Last Semester','Status'],withGpa.filter(x=>(x.cum??x.pri??4)<2.75).sort((a,b)=>(a.cum??a.pri??4)-(b.cum??b.pri??4)).map(({m,cum,pri})=>[
      `<strong>${m.name}</strong>`,m.classYear,
      cum!==null?`<span style="color:var(--rd);font-weight:700">${cum.toFixed(2)}</span>`:'—',
      pri!==null?pri.toFixed(2):'—',
      '<span style="color:var(--rd)">Warning</span>'
    ]))
  ):'')+
  rpSection('ti-list','Full Academic Rankings',
    withGpa.length?rpTable(['Rank','Member','Class','Cumulative GPA','Last Semester','Status'],
      [...withGpa].sort((a,b)=>(b.cum??b.pri??0)-(a.cum??a.pri??0)).map(({m,cum,pri},i)=>{
        const g=cum??pri??0;
        const status=g>=3.5?"Dean's List":g>=3.0?'Good Standing':g>=2.75?'Watch':'Warning';
        const sc=g>=3.5?'var(--gn)':g>=3.0?'var(--bl)':g>=2.75?'var(--am)':'var(--rd)';
        return[i+1,m.name,m.classYear,cum!==null?`<span style="font-weight:700;color:${sc}">${cum.toFixed(2)}</span>`:'—',pri!==null?pri.toFixed(2):'—',`<span style="color:${sc}">${status}</span>`];
      })):`<div style="color:var(--mt);font-size:12px">No GPA data entered yet. Add GPAs in the Academics page.</div>`
  );
}

// ── FULL CHAPTER REPORT ──
function rpFull(){
  return rpHeader('Full Chapter Report','Comprehensive semester overview — all operational areas')+
  `<div class="rp-section"><div class="rp-section-title"><i class="ti ti-layout-dashboard"></i>Section 1 — Operations Overview</div>${rpWeekly().replace(/<div class="rp-doc-header">[\s\S]*?<\/div>\s*/,'')}</div>`+
  `<div class="rp-divider"></div>`+
  `<div style="margin-top:14px;font-size:11px;color:var(--mt);font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Section 2 — Attendance</div>${rpAttendance().replace(/<div class="rp-doc-header">[\s\S]*?<\/div>\s*/,'')}`+
  `<div class="rp-divider"></div>`+
  `<div style="margin-top:14px;font-size:11px;color:var(--mt);font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Section 3 — Recruitment</div>${rpRecruitment().replace(/<div class="rp-doc-header">[\s\S]*?<\/div>\s*/,'')}`;
}

// ── PRINT ──
function rpPrint(){
  const content=document.getElementById('rp-preview')?.innerHTML||'';
  const title=document.getElementById('rp-preview-title')?.textContent||'Chapter Report';
  const w=window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>${title} — ATO Beta Chapter</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',system-ui,sans-serif;font-size:12.5px;color:#1a1a18;line-height:1.6;padding:28px 32px;max-width:860px;margin:0 auto}
    .rp-doc-header{background:linear-gradient(135deg,#0c1d56 0%,#1a3a8c 100%);color:#fff;padding:18px 22px;border-radius:10px;margin-bottom:18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .rp-doc-title{font-size:20px;font-weight:700;margin-bottom:4px}
    .rp-doc-meta{font-size:11px;opacity:.75;display:flex;flex-wrap:wrap;gap:14px}
    .rp-section{margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #e5e5e3}
    .rp-section:last-child{border-bottom:none}
    .rp-section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#6b6b68;margin-bottom:10px}
    .rp-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:0}
    .rp-kpi{background:#f8f8f7;border-radius:8px;padding:10px 12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .rp-kpi-val{font-size:20px;font-weight:700;line-height:1;margin-bottom:2px}
    .rp-kpi-lbl{font-size:9px;color:#6b6b68;text-transform:uppercase;letter-spacing:.05em}
    .rp-table{width:100%;border-collapse:collapse;font-size:11.5px}
    .rp-table th{text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b6b68;padding:5px 7px;border-bottom:2px solid #e5e5e3}
    .rp-table td{padding:5px 7px;border-bottom:1px solid #e5e5e3}
    .rp-alert-row{display:flex;align-items:flex-start;gap:8px;padding:7px 10px;background:#f8f8f7;border-radius:7px;margin-bottom:5px;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .rp-divider{height:1px;background:#e5e5e3;margin:14px 0}
    @media print{body{padding:16px 20px}.rp-doc-header{-webkit-print-color-adjust:exact}}
  </style></head><body>${content}</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),400);
}

// ── COPY TEXT ──
function rpCopy(){
  const el=document.getElementById('rp-preview');
  if(!el)return;
  const text=el.innerText||el.textContent||'';
  navigator.clipboard.writeText(text).then(()=>toast('Report copied to clipboard','success')).catch(()=>{
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('Report copied to clipboard','success');
  });
}

