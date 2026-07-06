/* OpsCore 2.0 Demo — Chapter Intelligence Center (Analytics & Reporting) */
// Single home for chapter-wide analytics, structured as category tabs (Overview/Attendance/
// Academics/Finance/Recruitment/Community Service/Social/Accountability) rather than one long
// scroll. The condensed health score here is just a link to the full Health Scorecard page —
// showing the full breakdown in both places would be redundant, and computeHealthDims() (in
// js/operations.js) is the single source of truth so the two pages can never disagree.

// ── SHARED CALCULATIONS ──
function calcAttendanceTrend(n){
  const tot=D.members.length||1;
  const mandPast=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
  if(mandPast.length<2) return [];
  return mandPast.slice(-n).map(ev=>{
    const att=D.attendance[ev.id]||{};
    const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;
    return {date:ev.date, label:monthShort(ev.date)+' '+dayOfMonth(ev.date), title:ev.title, val:Math.round(pres/tot*100)};
  });
}
function attTier(pct){
  if(pct>=85) return {label:'Good', color:'var(--gn)', badge:'bg2'};
  if(pct>=75) return {label:'On Track', color:'var(--navy)', badge:'bb2'};
  if(pct>=65) return {label:'At Risk', color:'var(--am)', badge:'ba2'};
  return {label:'Warning', color:'var(--rd)', badge:'br2'};
}
function calcFinanceCollectionRate(){
  const dues=D.finance?.dues||{};
  const tot=D.members.length||1;
  const paidCount=D.members.filter(m=>(dues[m.id]?.status||'Partial')==='Paid').length;
  return {rate:Math.round(paidCount/tot*100), paidCount, total:tot};
}
function calcRecruitmentFunnel(){
  const rushees=D.recruitment?.rushees||[];
  const total=rushees.length;
  const counts=RC_STAGES.map((s,i)=>({stage:s, count:rushees.filter(r=>r.stage===s).length, col:RC_STAGE_COLORS[i]}));
  const accepted=rushees.filter(r=>r.stage==='Accepted').length;
  const bidReadyPlus=rushees.filter(r=>['Bid Ready','Bid Extended','Accepted'].includes(r.stage)).length;
  const conversionRate=total?Math.round(bidReadyPlus/total*100):0;
  const acceptRate=total?Math.round(accepted/total*100):0;
  return {total, counts, conversionRate, acceptRate, accepted};
}
function calcRecruiterPerformance(){
  const rushees=D.recruitment?.rushees||[];
  const byRecruiter={};
  rushees.forEach(r=>{
    if(!r.recruiter)return;
    if(!byRecruiter[r.recruiter])byRecruiter[r.recruiter]={total:0,bidReadyPlus:0};
    byRecruiter[r.recruiter].total++;
    if(['Bid Ready','Bid Extended','Accepted'].includes(r.stage))byRecruiter[r.recruiter].bidReadyPlus++;
  });
  return Object.entries(byRecruiter).map(([mid,v])=>({member:getMember(mid),...v,rate:v.total?Math.round(v.bidReadyPlus/v.total*100):0})).sort((a,b)=>b.bidReadyPlus-a.bidReadyPlus);
}

// ── GLOBAL FILTER STATE ──
function ciDateStr(d){ return (d||new Date()).toISOString().split('T')[0]; }
let CI_FILTER={ start:ciDateStr(new Date(Date.now()-90*86400000)), end:ciDateStr(), allTime:false, classYear:'all' };
let CI_ACTIVE_TAB='ci-overview';
function ciInDateRange(dateStr){
  if(CI_FILTER.allTime||!dateStr)return true;
  return dateStr>=CI_FILTER.start && dateStr<=CI_FILTER.end;
}
function ciFilterMembers(){
  return CI_FILTER.classYear==='all' ? D.members : D.members.filter(m=>m.classYear===CI_FILTER.classYear);
}
function ciSetFilter(){
  CI_FILTER.allTime=document.getElementById('ci-f-alltime').checked;
  CI_FILTER.start=document.getElementById('ci-f-start').value||CI_FILTER.start;
  CI_FILTER.end=document.getElementById('ci-f-end').value||CI_FILTER.end;
  CI_FILTER.classYear=document.getElementById('ci-f-class').value;
  ciRenderFilterBar();
  ciRenderActiveTab();
}
function ciResetFilter(){
  CI_FILTER={ start:ciDateStr(new Date(Date.now()-90*86400000)), end:ciDateStr(), allTime:false, classYear:'all' };
  ciRenderFilterBar();
  ciRenderActiveTab();
}

// ── MAIN ──
function renderAnalytics(){
  ciRenderFilterBar();
  ciRenderActiveTab();
}
function ciTab(btn, tabId){
  document.querySelectorAll('#page-analytics .fin-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.querySelectorAll('#page-analytics .ci-panel').forEach(p=>{p.style.display = p.id===tabId ? '' : 'none';});
  CI_ACTIVE_TAB=tabId;
  ciRenderActiveTab();
}
function ciRenderActiveTab(){
  if(CI_ACTIVE_TAB==='ci-overview') ciRenderOverview();
  else if(CI_ACTIVE_TAB==='ci-tab-attendance') ciRenderAttendanceTab();
  else if(CI_ACTIVE_TAB==='ci-tab-academics') ciRenderAcademicsTab();
  else if(CI_ACTIVE_TAB==='ci-tab-finance') ciRenderFinanceTab();
  else if(CI_ACTIVE_TAB==='ci-tab-recruitment') ciRenderRecruitmentTab();
  else if(CI_ACTIVE_TAB==='ci-tab-cs') ciRenderCommunityServiceTab();
  else if(CI_ACTIVE_TAB==='ci-tab-social') ciRenderSocialTab();
  else if(CI_ACTIVE_TAB==='ci-tab-accountability') ciRenderAccountabilityTab();
}

function ciRenderFilterBar(){
  const startEl=document.getElementById('ci-f-start'), endEl=document.getElementById('ci-f-end'), classEl=document.getElementById('ci-f-class'), atEl=document.getElementById('ci-f-alltime');
  if(startEl && !startEl.value) startEl.value=CI_FILTER.start;
  if(endEl && !endEl.value) endEl.value=CI_FILTER.end;
  if(atEl) atEl.checked=CI_FILTER.allTime;
  if(classEl && !classEl._init){
    const years=[...new Set(D.members.map(m=>m.classYear))].filter(Boolean).sort();
    classEl.innerHTML='<option value="all">All Class Years</option>'+years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
    classEl._init=true;
  }
  if(classEl) classEl.value=CI_FILTER.classYear;
  const activeEl=document.getElementById('ci-f-active');
  if(activeEl){
    const parts=[];
    if(!CI_FILTER.allTime) parts.push(formatDateShort(CI_FILTER.start)+' – '+formatDateShort(CI_FILTER.end));
    if(CI_FILTER.classYear!=='all') parts.push(CI_FILTER.classYear);
    activeEl.textContent = parts.length ? 'Active: '+parts.join(' · ') : 'No filters applied';
  }
  const accBtn=document.getElementById('ci-tab-accountability-btn');
  if(accBtn) accBtn.style.display = (typeof jbCanAccess==='function' && jbCanAccess()) ? '' : 'none';
}

// ── OVERVIEW ──
function ciRenderOverview(){
  ciRenderKpiRow();
  ciRenderHealthLink();
  ciRenderOperationalComparison();
}
function ciRenderKpiRow(){
  const {score}=computeHealthDims();
  const avgAtt=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/(D.members.length||1));
  const dn=D.tasks.filter(t=>t.status==='done').length;
  const taskPct=D.tasks.length?Math.round(dn/D.tasks.length*100):null;
  const fin=calcFinanceCollectionRate();
  const rec=calcRecruitmentFunnel();
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;

  const now=new Date(); const d30=ciDateStr(new Date(now-30*86400000)); const d60=ciDateStr(new Date(now-60*86400000));
  const recentAtt=calcAttendanceTrend(200).filter(p=>p.date>=d30);
  const priorAtt=calcAttendanceTrend(200).filter(p=>p.date>=d60&&p.date<d30);
  const attTrend = recentAtt.length&&priorAtt.length ? Math.round(recentAtt.reduce((s,p)=>s+p.val,0)/recentAtt.length) - Math.round(priorAtt.reduce((s,p)=>s+p.val,0)/priorAtt.length) : null;
  const recentPay=(D.finance?.payments||[]).filter(p=>p.date>=d30).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const priorPay=(D.finance?.payments||[]).filter(p=>p.date>=d60&&p.date<d30).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);

  document.getElementById('ci-kpi').innerHTML=
    kpi('Chapter Health Score',score+'/100',score>=80?'Strong standing':score>=65?'Stable — some gaps':'Needs attention',score>=80?'up':score>=50?'neutral':'down')+
    kpi('Attendance Rate',avgAtt+'%',attTrend===null?'No 30d comparison yet':(attTrend>=0?'+':'')+attTrend+'pts vs prior 30d',attTrend===null?'neutral':attTrend>=0?'up':'down')+
    kpi('Task Completion',taskPct===null?'—':taskPct+'%',taskPct===null?'No tasks yet':dn+' of '+D.tasks.length+' done','neutral')+
    kpi('Financial Collection',fin.rate+'%',recentPay||priorPay?'$'+Math.round(recentPay).toLocaleString()+' collected last 30d ('+(recentPay>=priorPay?'+':'')+Math.round(recentPay-priorPay).toLocaleString()+' vs prior)':fin.paidCount+' / '+fin.total+' paid','neutral')+
    kpi('Recruitment Conversion',rec.total?rec.conversionRate+'%':'—',rec.total?rec.total+' rushees tracked':'No rushees yet','neutral')+
    kpi('Open Accountability Cases',openCases,openCases?'Requires attention':'All clear',openCases?'down':'up');
}
function ciRenderHealthLink(){
  const {score,dims}=computeHealthDims();
  const grade=score>=80?'A':score>=65?'B':score>=50?'C':'F';
  const color=score>=80?'var(--gn)':score>=65?'var(--navy)':score>=50?'var(--am)':'var(--rd)';
  const weak=dims.filter(d=>d.v<d.target).sort((a,b)=>a.v-b.v).slice(0,2);
  const el=document.getElementById('ci-health-link'); if(!el)return;
  el.innerHTML=`<div style="display:flex;align-items:center;gap:14px;cursor:pointer" onclick="rbacNav('healthscore',null)">
    <div style="font-size:26px;font-weight:700;color:${color}">${score}<span style="font-size:13px;color:var(--ht);font-weight:500">/100</span></div>
    <div style="flex:1">
      <div style="font-size:12.5px;font-weight:600">Grade ${grade}${weak.length?' — needs attention on '+weak.map(d=>esc(d.k)).join(', '):' — no dimension currently below target'}</div>
      <div style="font-size:10.5px;color:var(--ht)">Full breakdown, trend, and action items on the Health Scorecard page →</div>
    </div>
    <i class="ti ti-arrow-right" style="color:var(--ht)"></i>
  </div>`;
}
function ciRenderOperationalComparison(){
  const {dims}=computeHealthDims();
  const el=document.getElementById('ci-opcompare'); if(!el)return;
  const sorted=[...dims].sort((a,b)=>b.v-a.v);
  el.innerHTML=sorted.map(d=>`<div class="pr"><span class="pl" style="width:130px">${esc(d.k)}</span><div class="pb"><div class="pf" style="width:${d.v}%;background:${d.color}"></div></div><span class="pv">${d.v}%</span></div>`).join('');
}

// ── ATTENDANCE DEEP DIVE ──
function ciRenderAttendanceTab(){
  const trendEl=document.getElementById('ci-att-trend');
  if(trendEl){
    const pts=calcAttendanceTrend(20).filter(p=>ciInDateRange(p.date));
    trendEl.innerHTML = pts.length>=2 ? ciMiniLineChart(pts) : `<div style="color:var(--ht);font-size:11.5px;padding:10px 0">Not enough mandatory-event history in this range yet.</div>`;
  }
  const cls=CI_FILTER.classYear;
  const members=ciFilterMembers();
  const tot=members.length||1;
  const tiers=[
    {label:'Good (85%+)',min:85,c:'var(--gn)'},
    {label:'On Track (75–84%)',min:75,max:85,c:'var(--navy)'},
    {label:'At Risk (65–74%)',min:65,max:75,c:'var(--am)'},
    {label:'Warning (<65%)',min:0,max:65,c:'var(--rd)'},
  ];
  const counts=tiers.map(t=>({...t,n:members.filter(m=>{const r=getAttendanceRate(m.id);return r>=t.min&&(t.max===undefined||r<t.max);}).length}));
  const barsEl=document.getElementById('ci-engagement-tiers');
  if(barsEl) barsEl.innerHTML=counts.map(c=>`<div class="pr"><span class="pl">${c.label}</span><div class="pb"><div class="pf" style="width:${Math.round(c.n/tot*100)}%;background:${c.c}"></div></div><span class="pv">${c.n}</span></div>`).join('');
  const riskEl=document.getElementById('ci-engagement-risk');
  if(riskEl){
    const risk=members.map(m=>({m,r:getAttendanceRate(m.id)})).filter(x=>x.r<85).sort((a,b)=>memberNameCompare(a.m,b.m)).slice(0,8);
    riskEl.innerHTML = risk.length ? risk.map(({m,r})=>{const t=attTier(r);return `<div class="sh-row"><div class="sh-av" style="width:22px;height:22px;font-size:8px">${esc(m.initials)}</div><div style="flex:1;min-width:0;font-size:11.5px">${esc(m.name)}</div><span class="badge ${t.badge}">${r}%</span></div>`;}).join('') : es('ti-circle-check','green','Everyone above target','','');
  }
  const classEl=document.getElementById('ci-engagement-class');
  if(classEl){
    const years=[...new Set(D.members.map(m=>m.classYear))].filter(Boolean).sort();
    classEl.innerHTML=years.map(yr=>{
      const mems=D.members.filter(m=>m.classYear===yr);
      const avg=mems.length?Math.round(mems.reduce((s,m)=>s+getAttendanceRate(m.id),0)/mems.length):0;
      const t=attTier(avg);
      return `<div class="pr"><span class="pl">${esc(yr)} (${mems.length})</span><div class="pb"><div class="pf" style="width:${avg}%;background:${t.color}"></div></div><span class="pv">${avg}%</span></div>`;
    }).join('');
  }
  const tableEl=document.getElementById('ci-att-table');
  if(tableEl){
    tableEl.innerHTML = members.length ? `<thead><tr><th>Member</th><th>Class</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${
      [...members].sort(memberNameCompare).map(m=>{const r=getAttendanceRate(m.id);const t=attTier(r);return `<tr><td style="font-weight:500">${esc(m.name)}</td><td>${esc(m.classYear)}</td><td style="color:${t.color};font-weight:600">${r}%</td><td><span class="badge ${t.badge}">${t.label}</span></td></tr>`;}).join('')
    }</tbody>` : `<tbody><tr><td colspan="4" style="text-align:center;color:var(--ht);padding:14px">No members${cls!=='all'?' in '+esc(cls):''}.</td></tr></tbody>`;
  }
}

// ── ACADEMICS DEEP DIVE ──
function ciRenderAcademicsTab(){
  const trendEl=document.getElementById('ci-ac-trend');
  if(trendEl){
    const hist=D.academics?.history||[];
    trendEl.innerHTML = hist.length ? hist.map(h=>`<div class="pr"><span class="pl" style="width:110px">${esc(h.semester)}</span><div class="pb"><div class="pf" style="width:${Math.min(100,parseFloat(h.chapterGpa)/4*100)}%;background:var(--bl)"></div></div><span class="pv">${h.chapterGpa}</span></div>`).join('') : `<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No semester GPA snapshots yet — created when officers save GPAs in Academics.</div>`;
  }
  const members=ciFilterMembers();
  const gpaOf=m=>{const rec=D.academics?.gpas?.[m.id]||{};const v=rec.cumulativeGpa||rec.priorGpa||'';return v?parseFloat(v):null;};
  const distEl=document.getElementById('ci-ac-dist');
  if(distEl){
    const gpas=members.map(gpaOf).filter(g=>g!==null&&!isNaN(g));
    const buckets=[
      {label:"3.50+ (Dean's List)",min:3.5,max:4.01,c:'#22C55E'},
      {label:'3.00–3.49 (Good)',min:3.0,max:3.5,c:'#4FB6EC'},
      {label:'2.75–2.99 (Watch)',min:2.75,max:3.0,c:'#F5A623'},
      {label:'Below 2.75 (Warning)',min:0,max:2.75,c:'#F0554A'},
    ];
    distEl.innerHTML = gpas.length ? buckets.map(b=>{const n=gpas.filter(g=>g>=b.min&&g<b.max).length;const pct=Math.round(n/gpas.length*100);return `<div class="pr"><span class="pl" style="width:150px">${b.label}</span><div class="pb"><div class="pf" style="width:${pct}%;background:${b.c}"></div></div><span class="pv">${n}</span></div>`;}).join('') : `<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No GPA data yet.</div>`;
  }
  const tableEl=document.getElementById('ci-ac-table');
  if(tableEl){
    const withGpa=[...members].sort(memberNameCompare).map(m=>({m,cum:D.academics?.gpas?.[m.id]?.cumulativeGpa||'',sem:D.academics?.gpas?.[m.id]?.semesterGpa||''}));
    tableEl.innerHTML = withGpa.length ? `<thead><tr><th>Member</th><th>Class</th><th>Cumulative GPA</th><th>Semester GPA</th></tr></thead><tbody>${
      withGpa.map(({m,cum,sem})=>`<tr><td style="font-weight:500">${esc(m.name)}</td><td>${esc(m.classYear)}</td><td>${esc(cum)||'—'}</td><td>${esc(sem)||'—'}</td></tr>`).join('')
    }</tbody>` : `<tbody><tr><td colspan="4" style="text-align:center;color:var(--ht);padding:14px">No members in this filter.</td></tr></tbody>`;
  }
}

// ── FINANCE DEEP DIVE ──
function ciRenderFinanceTab(){
  const fin=calcFinanceCollectionRate();
  const members=ciFilterMembers();
  const owed=members.reduce((s,m)=>{const d=(D.finance?.dues||{})[m.id];return s+((d?.semesterDues||0)-(d?.paid||0));},0);
  const kpiEl=document.getElementById('ci-fin-kpi');
  if(kpiEl) kpiEl.innerHTML=
    kpi('Collection Rate',fin.rate+'%',fin.paidCount+' / '+fin.total+' paid (all members)',fin.rate>=85?'up':fin.rate>=70?'neutral':'down')+
    kpi('Outstanding Balance','$'+Math.max(0,Math.round(owed)).toLocaleString(),CI_FILTER.classYear==='all'?'Across all members':'Across '+esc(CI_FILTER.classYear),owed>2000?'down':'neutral');
  const budEl=document.getElementById('ci-fin-budget');
  if(budEl && typeof FIN_BUDGET_CATS!=='undefined'){
    const cats=FIN_BUDGET_CATS.filter(cat=>{const spent=(D.finance.expenses||[]).filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0);return (D.finance.budget[cat]||0)>0||spent>0;});
    budEl.innerHTML = cats.length ? cats.map(cat=>{
      const spent=(D.finance.expenses||[]).filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0);
      const bud=D.finance.budget[cat]||0; const pct=bud?Math.min(100,Math.round(spent/bud*100)):0;
      return `<div class="pr" style="cursor:pointer" onclick="rbacNav('finance',null)"><span class="pl" style="width:120px">${esc(cat)}</span><div class="pb"><div class="pf" style="width:${pct}%;background:${pct>=90?'var(--rd)':pct>=70?'var(--am)':'var(--gn)'}"></div></div><span class="pv">$${spent}/$${bud}</span></div>`;
    }).join('') : `<div style="color:var(--ht);font-size:11.5px;padding:8px 0">No budget allocated yet.</div>`;
  }
  const trendEl=document.getElementById('ci-fin-trend');
  if(trendEl){
    const payments=(D.finance?.payments||[]).filter(p=>ciInDateRange(p.date));
    const byWeek={};
    payments.forEach(p=>{if(!p.date)return;const d=new Date(p.date+'T12:00:00');const ws=new Date(d);ws.setDate(d.getDate()-d.getDay());const key=ciDateStr(ws);byWeek[key]=(byWeek[key]||0)+(parseFloat(p.amount)||0);});
    const wks=Object.keys(byWeek).sort().slice(-10);
    trendEl.innerHTML = wks.length ? miniBarChart(wks.map(w=>({label:monthShort(w)+' '+dayOfMonth(w),val:byWeek[w]})),v=>'$'+Math.round(v).toLocaleString()) : `<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No payments in this range.</div>`;
  }
  const tableEl=document.getElementById('ci-fin-table');
  if(tableEl){
    const dues=D.finance?.dues||{};
    tableEl.innerHTML = members.length ? `<thead><tr><th>Member</th><th>Class</th><th>Owed</th><th>Paid</th><th>Status</th></tr></thead><tbody>${
      [...members].sort(memberNameCompare).map(m=>{const d=dues[m.id]||{};const owedM=(d.semesterDues||0)-(d.paid||0);const status=d.status||'Partial';const badgeMap={Paid:'bg2',Partial:'ba2',Overdue:'br2',Unpaid:'br2','Payment Plan':'bb2'};return `<tr><td style="font-weight:500">${esc(m.name)}</td><td>${esc(m.classYear)}</td><td>$${Math.max(0,owedM).toLocaleString()}</td><td>$${(d.paid||0).toLocaleString()}</td><td><span class="badge ${badgeMap[status]||'bm2'}">${esc(status)}</span></td></tr>`;}).join('')
    }</tbody>` : `<tbody><tr><td colspan="5" style="text-align:center;color:var(--ht);padding:14px">No members in this filter.</td></tr></tbody>`;
  }
}

// ── RECRUITMENT DEEP DIVE ──
function ciRenderRecruitmentTab(){
  const f=calcRecruitmentFunnel();
  const kpiEl=document.getElementById('ci-rec-kpi');
  if(kpiEl) kpiEl.innerHTML=
    kpi('Total Rushees',f.total,'In pipeline','neutral')+
    kpi('Conversion Rate',f.conversionRate+'%','Bid-ready or further','neutral')+
    kpi('Accepted',f.accepted,f.total?Math.round(f.acceptRate)+'% of pipeline':'—','up');
  const funnelEl=document.getElementById('ci-rec-funnel');
  if(funnelEl) funnelEl.innerHTML = f.total ? f.counts.map(c=>`<div class="pr" style="cursor:pointer" onclick="rbacNav('recruitment',null)"><span class="pl">${esc(c.stage)}</span><div class="pb"><div class="pf" style="width:${f.total?Math.round(c.count/f.total*100):0}%;background:${c.col}"></div></div><span class="pv">${c.count}</span></div>`).join('') : es('ti-user-plus','blue','No rushees tracked yet','','');
  const recEl=document.getElementById('ci-rec-recruiters');
  if(recEl){
    const perf=calcRecruiterPerformance();
    recEl.innerHTML = perf.length ? perf.map(p=>`<div class="sh-row"><div class="sh-av" style="width:22px;height:22px;font-size:8px">${esc(p.member.initials)}</div><div style="flex:1;min-width:0;font-size:11.5px">${esc(p.member.name)}</div><span style="font-size:11px;color:var(--mt)">${p.bidReadyPlus}/${p.total} (${p.rate}%)</span></div>`).join('') : es('ti-users','blue','No recruiter assignments yet','','');
  }
  const tableEl=document.getElementById('ci-rec-table');
  if(tableEl){
    const rushees=D.recruitment?.rushees||[];
    tableEl.innerHTML = rushees.length ? `<thead><tr><th>Name</th><th>Stage</th><th>Recruiter</th><th>Bid Score</th></tr></thead><tbody>${
      [...rushees].sort((a,b)=>(b.bidScore||0)-(a.bidScore||0)).map(r=>`<tr><td style="font-weight:500">${esc(r.name)}</td><td>${esc(r.stage)}</td><td>${r.recruiter?esc(getMember(r.recruiter).name):'—'}</td><td>${r.bidScore??'—'}</td></tr>`).join('')
    }</tbody>` : `<tbody><tr><td colspan="4" style="text-align:center;color:var(--ht);padding:14px">No rushees tracked yet.</td></tr></tbody>`;
  }
}

// ── COMMUNITY SERVICE DEEP DIVE ──
function ciRenderCommunityServiceTab(){
  const logs=D.communityService?.hours||[];
  const members=ciFilterMembers();
  const totalHrs=logs.reduce((s,h)=>s+(parseFloat(h.hours)||0),0);
  const goal=D.communityService?.goals?.totalHrs||500;
  const kpiEl=document.getElementById('ci-cs-kpi');
  if(kpiEl) kpiEl.innerHTML=
    kpi('Total Hours Logged',Math.round(totalHrs),'Toward '+goal+' hr goal',totalHrs>=goal?'up':'neutral')+
    kpi('Goal Progress',Math.min(100,Math.round(totalHrs/goal*100))+'%','','neutral')+
    kpi('Members Logging Hours',new Set(logs.map(l=>l.memberId)).size,'Of '+D.members.length+' total','neutral');
  const trendEl=document.getElementById('ci-cs-trend');
  if(trendEl){
    const filtered=logs.filter(h=>ciInDateRange(h.date));
    const byWeek={};
    filtered.forEach(h=>{if(!h.date)return;const d=new Date(h.date+'T12:00:00');const ws=new Date(d);ws.setDate(d.getDate()-d.getDay());const key=ciDateStr(ws);byWeek[key]=(byWeek[key]||0)+(parseFloat(h.hours)||0);});
    const wks=Object.keys(byWeek).sort().slice(-10);
    trendEl.innerHTML = wks.length ? miniBarChart(wks.map(w=>({label:monthShort(w)+' '+dayOfMonth(w),val:byWeek[w]})),v=>Math.round(v)+' hrs') : `<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No hours logged in this range.</div>`;
  }
  const tableEl=document.getElementById('ci-cs-table');
  if(tableEl){
    const byMember=members.map(m=>({m,hrs:logs.filter(h=>h.memberId===m.id).reduce((s,h)=>s+(parseFloat(h.hours)||0),0)})).filter(x=>x.hrs>0).sort((a,b)=>memberNameCompare(a.m,b.m));
    tableEl.innerHTML = byMember.length ? `<thead><tr><th>Member</th><th>Class</th><th>Hours</th></tr></thead><tbody>${
      byMember.map(({m,hrs})=>`<tr><td style="font-weight:500">${esc(m.name)}</td><td>${esc(m.classYear)}</td><td>${hrs}</td></tr>`).join('')
    }</tbody>` : `<tbody><tr><td colspan="3" style="text-align:center;color:var(--ht);padding:14px">No hours logged${CI_FILTER.classYear!=='all'?' for '+esc(CI_FILTER.classYear):''} yet.</td></tr></tbody>`;
  }
}

// ── SOCIAL DEEP DIVE ──
function ciRenderSocialTab(){
  if(typeof socEvents!=='function') return;
  const events=socEvents();
  const now=ciDateStr();
  const upcoming=events.filter(e=>e.date>=now && socPlan(e.id).status!=='cancelled');
  let totalBudget=0,totalActual=0,readinessSum=0,readinessN=0,needsAction=0;
  events.forEach(e=>{
    const plan=socPlan(e.id); plan._eventId=e.id;
    const tot=socBudgetTotals(plan); totalBudget+=tot.est; totalActual+=tot.actual;
    if(plan.status!=='cancelled'){ const r=socReadiness(plan); readinessSum+=r.score; readinessN++; if(e.date>=now&&plan.status!=='completed'&&r.missing.length)needsAction++; }
  });
  const avgReadiness=readinessN?Math.round(readinessSum/readinessN):null;
  const completed=events.filter(e=>socPlan(e.id).actualAttendance!=null);
  const totalAttendees=completed.reduce((s,e)=>s+(socPlan(e.id).actualAttendance||0),0);
  const costPerAttendee=totalAttendees?Math.round(totalActual/totalAttendees):null;
  const kpiEl=document.getElementById('ci-soc-kpi');
  if(kpiEl) kpiEl.innerHTML=
    kpi('Upcoming Events',upcoming.length,'On the calendar','neutral')+
    kpi('Budget vs Actual','$'+Math.round(totalActual).toLocaleString()+' / $'+Math.round(totalBudget).toLocaleString(),totalActual>totalBudget?'Over budget':'Within budget',totalActual>totalBudget?'down':'up')+
    kpi('Avg Readiness',avgReadiness===null?'—':avgReadiness+'%','Across active events','neutral')+
    kpi('Cost / Attendee',costPerAttendee===null?'—':'$'+costPerAttendee,completed.length?'From '+completed.length+' completed event(s)':'No completed events yet','neutral');
  const alertEl=document.getElementById('ci-soc-alerts');
  if(alertEl) alertEl.innerHTML = needsAction ? `<div style="cursor:pointer" onclick="rbacNav('social',null)">${kpi('Events Needing Attention',needsAction,'Click to review in Social Events','down')}</div>` : es('ti-circle-check','green','All upcoming events on track','','');
  const trendEl=document.getElementById('ci-soc-trend');
  if(trendEl){
    const withAtt=events.filter(e=>ciInDateRange(e.date)).filter(e=>socPlan(e.id).actualAttendance!=null).sort((a,b)=>a.date.localeCompare(b.date));
    trendEl.innerHTML = withAtt.length ? miniBarChart(withAtt.map(e=>({label:monthShort(e.date)+' '+dayOfMonth(e.date),val:socPlan(e.id).actualAttendance})),v=>v) : `<div style="color:var(--ht);font-size:11.5px;padding:10px 0">No completed events with recorded attendance in this range yet.</div>`;
  }
  const bycatEl=document.getElementById('ci-soc-bycat');
  if(bycatEl){
    const byCat={};
    events.forEach(e=>{const cat=socPlan(e.id).eventCategory||'other';byCat[cat]=(byCat[cat]||0)+1;});
    const catEntries=Object.entries(byCat);
    bycatEl.innerHTML = catEntries.length ? catEntries.map(([cat,n])=>`<div class="pr"><span class="pl">${esc(socCatLabel(cat))}</span><div class="pb"><div class="pf" style="width:${Math.round(n/events.length*100)}%;background:var(--sky)"></div></div><span class="pv">${n}</span></div>`).join('') : `<div style="color:var(--ht);font-size:11.5px;padding:8px 0">No events yet.</div>`;
  }
  const tableEl=document.getElementById('ci-soc-table');
  if(tableEl){
    tableEl.innerHTML = events.length ? `<thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Status</th><th>Readiness</th></tr></thead><tbody>${
      [...events].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const plan=socPlan(e.id);const r=socReadiness(plan);return `<tr style="cursor:pointer" onclick="rbacNav('social',null)"><td style="font-weight:500">${esc(e.title)}</td><td>${esc(socCatLabel(plan.eventCategory))}</td><td>${formatDateShort(e.date)}</td><td><span class="badge ${socStatusClass(plan.status)}">${socStatusLabel(plan.status)}</span></td><td>${r.score}%</td></tr>`;}).join('')
    }</tbody>` : `<tbody><tr><td colspan="5" style="text-align:center;color:var(--ht);padding:14px">No social events yet.</td></tr></tbody>`;
  }
}

// ── ACCOUNTABILITY DEEP DIVE (Judicial Board leads only — same gate as the Judicial Board page) ──
function ciRenderAccountabilityTab(){
  const allowed = typeof jbCanAccess==='function' && jbCanAccess();
  const gate=document.getElementById('ci-acc-gate'), content=document.getElementById('ci-acc-content');
  if(gate) gate.style.display = allowed ? 'none' : 'block';
  if(content) content.style.display = allowed ? '' : 'none';
  if(!allowed) return;
  const cases=D.cases||[];
  const open=cases.filter(c=>!['resolved','dismissed'].includes(c.status));
  const byType={};
  cases.forEach(c=>{byType[c.type||'other']=(byType[c.type||'other']||0)+1;});
  const kpiEl=document.getElementById('ci-acc-kpi');
  if(kpiEl) kpiEl.innerHTML=
    kpi('Open Cases',open.length,open.length?'Requires attention':'All clear',open.length?'down':'up')+
    kpi('Total Cases (All Time)',cases.length,'','neutral')+
    kpi('Most Common Type',Object.keys(byType).length?Object.entries(byType).sort((a,b)=>b[1]-a[1])[0][0]:'—','','neutral');
  const tableEl=document.getElementById('ci-acc-table');
  if(tableEl){
    tableEl.innerHTML = cases.length ? `<thead><tr><th>Case #</th><th>Type</th><th>Status</th><th>Filed By</th></tr></thead><tbody>${
      cases.map(c=>`<tr><td style="font-weight:500">${esc(c.caseNum||c.id)}</td><td>${esc(c.type)}</td><td><span class="badge ${c.status==='open'?'br2':c.status==='resolved'?'bg2':'bm2'}">${esc(c.status)}</span></td><td>${c.filedBy?esc(getMember(c.filedBy).name):'—'}</td></tr>`).join('')
    }</tbody>` : `<tbody><tr><td colspan="4" style="text-align:center;color:var(--ht);padding:14px">No cases on record.</td></tr></tbody>`;
  }
}

// ── SHARED MINI-CHART HELPER (colored by attendance tier — distinct from the flat-color
// miniBarChart() in js/helpers.js used elsewhere) ──
function ciMiniLineChart(pts){
  const vals=pts.map(p=>p.val); const mn=Math.min(...vals,60), mx=Math.max(...vals,100);
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:60px">${pts.map(p=>{const h=Math.max(4,Math.round((p.val-mn)/((mx-mn)||1)*100));return `<div style="flex:1;height:${h}%;background:${attTier(p.val).color};border-radius:2px 2px 0 0" title="${esc(p.label)}: ${p.val}%"></div>`;}).join('')}</div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--ht);margin-top:3px">${pts.filter((_,i)=>i%Math.ceil(pts.length/6)===0).map(p=>`<span>${esc(p.label)}</span>`).join('')}</div>`;
}
