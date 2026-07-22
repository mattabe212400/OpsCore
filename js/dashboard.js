/* OpsCore 2.0 Demo — Dashboard */
function renderDash(){
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const openT=D.tasks.filter(t=>t.status!=='done').length;
  const ovT=D.tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='done').length;
  const cas=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;
  const dn=D.tasks.filter(t=>t.status==='done').length;
  const taskPct=D.tasks.length?Math.round(dn/D.tasks.length*100):0;

  // ── KPIs ──
  document.getElementById('d-kpi').innerHTML=
    kpi('Chapter Attendance',avg+'%',avg>=85?'Above 85% target':'Below 85% target',avg>=85?'up':'down')+
    kpi('Active Members',tot,getSemester()+' roster','neutral')+
    kpi('Open Tasks',openT,ovT>0?ovT+' overdue':'All on track',ovT>0?'down':'neutral')+
    kpi('Active Cases',cas,cas>0?'Requires attention':'No open cases',cas?'down':'neutral');

  // ── ANNOUNCEMENTS ──
  dashRenderAnnouncements();

  // ── INTELLIGENCE ALERTS ──
  dashBuildAlerts(avg);

  // ── OVERDUE TASKS ──
  dashBuildOverdue();

  // ── ATTENDANCE RISK ──
  dashBuildAttRisk();

  // ── UPCOMING EVENTS WITH COUNTDOWN ──
  dashBuildEvents();

  // ── SOBER BROS ──
  const ws=sbFlatSlots().filter(s=>isUpcoming(s.date)).slice(0,4);
  document.getElementById('d-sober').innerHTML=ws.map(s=>{const m=s.memberId?getMember(s.memberId):null;return`<div class="sh-row"><div class="sh-av">${m?m.initials:'??'}</div><div style="flex:1"><div style="font-size:12px;font-weight:500;color:${m?'var(--tx)':'var(--rd)'}">${m?m.name:'Unassigned'}</div><div style="font-size:10.5px;color:var(--ht)">${formatDateShort(s.date)} · ${s.label}</div></div><span class="dot ${!m?'dr':'dg'}"></span></div>`;}).join('')||es('ti-shield-check','green','No shifts scheduled','Shifts appear here.',`<button class="btn" onclick="rbacNav('sober',null)">View schedule</button>`);

  // ── OFFICER ACCOUNTABILITY TABLE (legacy hidden) ──
  const offs=D.members.filter(m=>m.role!=='Member');
  document.getElementById('d-officers').innerHTML=`<thead><tr><th>Officer</th><th>Role</th><th>Tasks</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${offs.map(m=>{const ts=getTaskMetrics(m.id);const att=getAttendanceRate(m.id);const s=ts.rate>=80&&att>=85?['On track','bg2']:ts.rate>=60||att>=75?['Behind','ba2']:['At risk','br2'];return`<tr><td style="font-weight:500">${m.name}</td><td style="color:var(--mt)">${m.role}</td><td>${ts.done}/${ts.total}</td><td style="font-weight:500;color:${att>=85?'var(--gn)':att>=75?'var(--gold)':'var(--rd)'}">${att}%</td><td><span class="badge ${s[1]}">${s[0]}</span></td></tr>`;}).join('')}</tbody>`;

  // ── OFFICER KPI CARDS (new visual design) ──
  const offV2=document.getElementById('d-officers-v2');
  if(offV2){
    if(!offs.length){
      offV2.innerHTML=`<div style="padding:16px;text-align:center;color:var(--ht);font-size:11.5px">No officers found. Assign roles in Members.</div>`;
    } else {
      offV2.innerHTML=offs.map(m=>{
        const ts=getTaskMetrics(m.id);const att=getAttendanceRate(m.id);
        const s=ts.rate>=80&&att>=85?['On track','bg2','var(--gn)']:ts.rate>=60||att>=75?['Behind','ba2','var(--am)']:['At risk','br2','var(--rd)'];
        const attColor=att>=85?'var(--gn)':att>=75?'var(--gold)':att>=65?'var(--am)':'var(--rd)';
        return`<div class="d2-off-card">
          <div><div class="d2-off-name">${m.name}</div><div class="d2-off-role">${m.role}</div></div>
          <div class="d2-off-stat">
            <div class="d2-off-stat-val" style="color:${attColor}">${att}%</div>
            <div class="d2-off-stat-lbl">Attend</div>
          </div>
          <div class="d2-off-stat">
            <div class="d2-off-stat-val">${ts.done}/${ts.total}</div>
            <div class="d2-off-stat-lbl">Tasks</div>
          </div>
          <div class="d2-off-status"><span class="badge ${s[1]}">${s[0]}</span></div>
        </div>`;
      }).join('');
    }
  }

  // ── ATTENDANCE BAR CHART ──
  const mandPast=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);
  const chartEl=document.getElementById('d-chart');
  const labEl=document.getElementById('d-chart-labels');
  if(mandPast.length>=2){
    const chartData=mandPast.map(ev=>{const att=D.attendance[ev.id]||{};const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;return tot?Math.round(pres/tot*100):0;});
    const chartLabels=mandPast.map(ev=>monthShort(ev.date)+' '+dayOfMonth(ev.date));
    const mx=Math.max(...chartData,1);
    if(chartEl)chartEl.innerHTML=chartData.map((v,i)=>`<div class="mb" style="flex:1;height:${Math.round(v/mx*100)}%;background:${v<75?'var(--rd)':v<85?'var(--am)':i===chartData.length-1?'var(--gold)':'#dde5f0'};border-radius:3px 3px 0 0;transition:height .4s ease" title="${chartLabels[i]}: ${v}%"></div>`).join('');
    if(labEl)labEl.innerHTML=chartLabels.map(l=>`<span>${l}</span>`).join('');
  } else {
    if(chartEl)chartEl.innerHTML=`<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ht)">No attendance data yet</div>`;
    if(labEl)labEl.innerHTML='';
  }
  const r=24,cv=2*Math.PI*r;
  const rc=document.getElementById('ring-c');if(rc){rc.style.strokeDasharray=cv;rc.style.strokeDashoffset=cv*(1-avg/100);}
  const rv=document.getElementById('ring-v');if(rv)rv.textContent=avg+'%';
  const rv2=document.getElementById('ring-v2');if(rv2)rv2.textContent=avg+'%';
  const rs=document.getElementById('ring-s');if(rs)rs.textContent=Math.round(tot*avg/100)+' / '+tot+' members';

  // ── GOALS ──
  document.getElementById('d-goals').innerHTML=D.goals.map(g=>{const p=Math.min(percent(g.current,g.target),100);return`<div class="pr"><span class="pl">${g.title}</span><div class="pb"><div class="pf" style="width:${p}%;background:${progressColor(p)}"></div></div><span class="pv">${p}%</span></div>`;}).join('')||'<div style="color:var(--ht);font-size:12px;padding:8px 0">No goals yet.</div>';

  // ── NOTES ──
  const notesEl=document.getElementById('d-notes');
  if(notesEl)notesEl.innerHTML=D.notes.slice(0,3).map(n=>`<div style="padding:7px 0;border-bottom:1px solid var(--bdr);cursor:pointer" onclick="rbacNav('notes',null)"><div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${n.title}</span><span style="font-size:10px;color:var(--ht);flex-shrink:0">${formatDateShort(n.date)}</span></div><div style="font-size:10.5px;color:var(--mt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(n.body||'').slice(0,80)}</div></div>`).join('')||es('ti-notes','slate','No meeting notes','Chapter meeting notes will appear here.','');

  updateBadges();
}

// ── CHAPTER HEALTH SCORE ──
function dashDrawHealth(avgAtt,taskPct,openCases){
  const tot=D.members.length||1;
  const gpas=D.members.map(m=>{const rec=D.academics?.gpas?.[m.id]||{};const v=rec.cumulativeGpa||rec.priorGpa||'';return v?parseFloat(v):null;}).filter(g=>g!==null&&!isNaN(g));
  const avgGpa=gpas.length?(gpas.reduce((a,b)=>a+b,0)/gpas.length):0;
  const gpaScore=avgGpa?Math.round((avgGpa/4)*100):50;
  const upEvt=D.events.filter(e=>isUpcoming(e.date)&&e.mandatory).length;
  const evtScore=Math.min(100,upEvt*14);
  const caseScore=Math.max(0,100-openCases*18);

  const dims=[
    {k:'Attendance',v:avgAtt,w:.30,c:'var(--gold)'},
    {k:'Tasks',v:taskPct,w:.25,c:'var(--gn)'},
    {k:'GPA',v:gpaScore,w:.20,c:'var(--bl)'},
    {k:'Events',v:evtScore,w:.15,c:'var(--am)'},
    {k:'Accountability',v:caseScore,w:.10,c:caseScore>=80?'var(--gn)':'var(--rd)'},
  ];
  const score=Math.round(dims.reduce((s,d)=>s+d.v*d.w,0));
  const scoreColor=score>=80?'var(--gn)':score>=65?'var(--gold)':score>=50?'var(--am)':'var(--rd)';

  const valEl=document.getElementById('d-health-val');
  const ringEl=document.getElementById('d-health-ring');
  if(valEl){valEl.textContent=score;valEl.style.color=scoreColor;}
  if(ringEl){
    const C=2*Math.PI*28;
    ringEl.style.stroke=scoreColor;
    ringEl.style.strokeDasharray=C;
    setTimeout(()=>{ringEl.style.strokeDashoffset=C*(1-score/100);},80);
  }
  const dimsEl=document.getElementById('d-health-dims');
  if(dimsEl){
    dimsEl.innerHTML=dims.map(d=>`<div class="d2-dim">
      <span class="d2-dim-lbl">${d.k}</span>
      <div class="d2-dim-bar"><div class="d2-dim-fill" style="width:0%" data-w="${d.v}"></div></div>
      <span class="d2-dim-val">${d.v}%</span>
    </div>`).join('');
    setTimeout(()=>{dimsEl.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';});},100);
  }
}

// ── INTELLIGENCE ALERTS ──
function dashBuildAlerts(avg){
  const alerts=computeChapterAlerts(avg);
  if(typeof updateNotifBellDot==='function')updateNotifBellDot(alerts.length);
  document.getElementById('d-alerts-card')?.classList.toggle('risk-alert-card',alerts.length>0);

  const dotEl=document.getElementById('d-alerts-dot');
  if(dotEl){
    dotEl.style.background=alerts.length?'var(--rd)':'var(--gn)';
    if(alerts.length)dotEl.classList.add('active'); else dotEl.classList.remove('active');
  }

  const el=document.getElementById('d-alerts');
  if(!el)return;
  if(!alerts.length){
    el.innerHTML=`<div class="es-inline ok"><i class="ti ti-circle-check"></i>All clear — no active alerts</div>`;
    return;
  }
  el.innerHTML=alerts.slice(0,4).map(a=>`<div class="d-alert-row"><div class="d-alert-icon" style="${a.bg}"><i class="ti ${a.icon}" style="${a.ic}"></i></div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:500;line-height:1.4">${a.title}</div><div style="font-size:10.5px;color:var(--mt);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.body}</div></div></div>`).join('');
}

// Pure alert computation, shared by the dashboard alerts card and the topbar notifications dropdown.
function computeChapterAlerts(avg){
  const alerts=[];
  const ovT=D.tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='done');
  if(ovT.length){
    const top=ovT.sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]||2)-({urgent:0,high:1,medium:2,low:3}[b.priority]||2))[0];
    alerts.push({type:'task',icon:'ti-clock',bg:'background:var(--am-bg)',ic:'color:var(--am-tx)',title:`${ovT.length} overdue task${ovT.length>1?'s':''}`,body:`Highest: "${top.title}" — ${getMember(top.assignedTo).name.split(' ')[0]}`});
  }
  const lowAtt=D.members.filter(m=>getAttendanceRate(m.id)<70);
  if(lowAtt.length){
    alerts.push({type:'attendance',icon:'ti-alert-circle',bg:'background:var(--rd-bg)',ic:'color:var(--rd-tx)',title:`${lowAtt.length} member${lowAtt.length>1?'s':''} below 70% attendance`,body:`${lowAtt.slice(0,2).map(m=>m.name.split(' ')[0]).join(', ')}${lowAtt.length>2?` +${lowAtt.length-2} more`:''}`});
  }
  const probation=D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=65&&r<75;});
  if(probation.length){
    alerts.push({type:'attendance',icon:'ti-alert-triangle',bg:'background:var(--am-bg)',ic:'color:var(--am-tx)',title:`${probation.length} member${probation.length>1?'s':''} nearing probation threshold`,body:probation.slice(0,2).map(m=>m.name.split(' ')[0]).join(', ')+(probation.length>2?' +'+(probation.length-2)+' more':'')+' — between 65–75%'});
  }
  const unassigned=sbFlatSlots().filter(s=>isUpcoming(s.date)&&!s.memberId);
  if(unassigned.length){
    alerts.push({type:'sober',icon:'ti-shield-exclamation',bg:'background:var(--bl-bg)',ic:'color:var(--bl-tx)',title:`${unassigned.length} unassigned sober bro shift${unassigned.length>1?'s':''}`,body:`Next: ${formatDateShort(unassigned[0].date)} · Needs coverage`});
  }
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status));
  if(openCases.length&&jbCanAccess&&jbCanAccess()){
    alerts.push({type:'judicial',icon:'ti-scale',bg:'background:var(--rd-bg)',ic:'color:var(--rd-tx)',title:`${openCases.length} open Judicial Board case${openCases.length>1?'s':''}`,body:'Review required — view J-Board for details'});
  }
  if(avg<85){
    alerts.push({type:'attendance',icon:'ti-trending-down',bg:'background:#f5f5f3',ic:'color:var(--mt)',title:`Chapter attendance at ${avg}% — below 85% target`,body:'Update attendance records to stay accurate'});
  }

  return alerts;
}

// ── OVERDUE TASKS ──
function dashBuildOverdue(){
  const el=document.getElementById('d-overdue');if(!el)return;
  const ov=D.tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=='done')
    .sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]||2)-({urgent:0,high:1,medium:2,low:3}[b.priority]||2));
  if(!ov.length){
    el.innerHTML=`<div class="es-inline ok"><i class="ti ti-circle-check"></i>No overdue tasks</div>`;
    return;
  }
  const pcl={urgent:'var(--rd)',high:'var(--rd)',medium:'var(--am)',low:'var(--mt)'};
  el.innerHTML=ov.slice(0,4).map(t=>{
    const daysOv=Math.round((new Date()-new Date(t.dueDate+'T12:00:00'))/(1000*86400));
    return`<div class="d-overdue-card" onclick="openEditTask('${t.id}')" style="cursor:pointer">
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;font-weight:600;color:var(--rd-tx);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
        <div style="font-size:10.5px;color:var(--rd-tx);opacity:.75">${daysOv}d overdue · ${getMember(t.assignedTo).name.split(' ')[0]} · <span style="font-weight:600;text-transform:capitalize">${t.priority}</span></div>
      </div>
      <button class="btn btn-d" style="height:23px;font-size:10px;padding:0 7px;flex-shrink:0" onclick="event.stopPropagation();toggleTask('${t.id}')"><i class="ti ti-check"></i>Done</button>
    </div>`;
  }).join('');
  if(ov.length>4)el.innerHTML+=`<div style="font-size:11px;color:var(--mt);text-align:center;padding:7px 0;cursor:pointer" onclick="rbacNav('tasks',null)">+${ov.length-4} more overdue tasks →</div>`;
}

// ── ATTENDANCE RISK ──
function dashBuildAttRisk(){
  const el=document.getElementById('d-att-risk');if(!el)return;
  const risk=D.members.map(m=>({m,r:getAttendanceRate(m.id)})).filter(x=>x.r<80).sort((a,b)=>a.r-b.r);
  if(!risk.length){
    el.innerHTML=`<div class="es-inline ok"><i class="ti ti-circle-check"></i>All members above 80%</div>`;
    return;
  }
  const cat=r=>r<65?{label:'Warning',bg:'var(--rd-bg)',tc:'var(--rd-tx)'}:r<70?{label:'At Risk',bg:'var(--rd-bg)',tc:'var(--rd-tx)'}:r<75?{label:'Watch',bg:'var(--am-bg)',tc:'var(--am-tx)'}:{label:'Monitor',bg:'#f5f5f3',tc:'var(--mt)'};
  const decliningCount=risk.filter(({m})=>getAttendanceTrend(m.id)==='declining').length;
  el.innerHTML=`<div style="font-size:10px;color:var(--mt);margin-bottom:8px">${risk.length} member${risk.length>1?'s':''} below 80%${decliningCount>0?` · <span style="color:var(--rd);font-weight:500">${decliningCount} declining ↓</span>`:''}</div>`+
    risk.slice(0,6).map(({m,r})=>{const c=cat(r);const trend=getAttendanceTrend(m.id);const tA=trend==='declining'?'<span style="font-size:9px;font-weight:700;color:var(--rd)"> ↓</span>':trend==='improving'?'<span style="font-size:9px;font-weight:700;color:var(--gn)"> ↑</span>':'';return`<div class="d-risk-row">
      <div class="sh-av" style="width:24px;height:24px;font-size:8px;background:${c.bg};color:${c.tc}">${m.initials}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:50px;height:5px;background:var(--surf2);border-radius:99px;overflow:hidden"><div style="height:100%;width:${r}%;background:${r<70?'var(--rd)':'var(--am)'};border-radius:99px"></div></div>
        <span style="font-size:11px;font-weight:700;color:${r<70?'var(--rd)':'var(--am-tx)'}">${r}%${tA}</span>
      </div>
    </div>`;}).join('');
  if(risk.length>6)el.innerHTML+=`<div style="font-size:11px;color:var(--mt);text-align:center;padding:7px 0;cursor:pointer" onclick="rbacNav('attendance',null)">+${risk.length-6} more →</div>`;
}

// ── UPCOMING EVENTS WITH COUNTDOWN ──
function dashBuildEvents(){
  const el=document.getElementById('d-events');if(!el)return;
  const ups=D.events.filter(e=>isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  if(!ups.length){el.innerHTML=es('ti-calendar-off','blue','No upcoming events','Add events to the calendar.',`<button class="btn" onclick="openM('m-addevent')"><i class="ti ti-plus"></i>Add Event</button>`);return;}
  el.innerHTML=ups.map(e=>{
    const days=Math.max(0,Math.round((new Date(e.date+'T12:00:00')-new Date())/(1000*86400)));
    const cls=days===0?'urgent':days<=3?'soon':'';
    const cdLabel=days===0?'Today':days===1?'Tomorrow':`${days}d`;
    return`<div class="ev-row">
      <div class="ev-dt"><div class="ev-day">${dayOfMonth(e.date)}</div><div class="ev-mo">${monthShort(e.date)}</div></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</div>
        <div style="font-size:10.5px;color:var(--mt);margin-top:1px">${to12h(e.start)||'TBD'}${e.location?' · '+e.location:''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">
        <span class="d-countdown ${cls}"><i class="ti ti-clock" style="font-size:9px"></i>${cdLabel}</span>
        ${e.mandatory?'<span class="badge br2" style="font-size:8.5px">Required</span>':''}
      </div>
    </div>`;
  }).join('');
}

// ── ACTIVITY FEED ──
function dashBuildFeed(){
  const el=document.getElementById('d-feed');if(!el)return;
  // Build activity from data — most recent first
  const activities=[];

  // Recent notes
  D.notes.slice(0,3).forEach(n=>{
    activities.push({time:n.date,icon:'ti-notes',color:'var(--bl)',text:`<strong>${getMember(n.author).name.split(' ')[0]}</strong> recorded meeting notes`,sub:n.title,page:'notes'});
  });

  // Recent completed tasks
  D.tasks.filter(t=>t.status==='done').slice(0,3).forEach(t=>{
    activities.push({time:t.dueDate||'',icon:'ti-checkbox',color:'var(--gn)',text:`<strong>${getMember(t.assignedTo).name.split(' ')[0]}</strong> completed a task`,sub:t.title,page:'tasks'});
  });

  // Recent events added
  D.events.slice(0,2).forEach(e=>{
    activities.push({time:e.date,icon:'ti-calendar-plus',color:'var(--am)',text:`Event scheduled`,sub:e.title,page:'calendar'});
  });

  // Recent shifts
  sbFlatSlots().filter(s=>s.memberId).slice(0,2).forEach(s=>{
    const m=getMember(s.memberId);
    activities.push({time:s.date,icon:'ti-shield-check',color:'var(--gn)',text:`<strong>${m.name.split(' ')[0]}</strong> assigned to sober bro shift`,sub:formatDateShort(s.date)+' · '+s.label,page:'sober'});
  });

  if(!activities.length){
    el.innerHTML=`<div style="padding:16px;text-align:center;color:var(--ht);font-size:11.5px"><i class="ti ti-activity" style="font-size:18px;display:block;margin:0 auto 5px;opacity:.3"></i>Activity will appear as officers use the platform</div>`;
    return;
  }

  // Sort by date desc, take top 6
  activities.sort((a,b)=>(b.time||'').localeCompare(a.time||'')).slice(0,6);

  el.innerHTML=activities.slice(0,6).map(a=>`<div class="d-feed-row" style="cursor:pointer" onclick="rbacNav('${a.page}',null)">
    <div class="d-feed-av" style="background:${a.color}22;color:${a.color}"><i class="ti ${a.icon}" style="font-size:11px"></i></div>
    <div style="flex:1;min-width:0">
      <div style="font-size:11.5px;line-height:1.4">${a.text}</div>
      <div style="font-size:10px;color:var(--ht);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">${a.sub}</div>
    </div>
    <div style="font-size:9.5px;color:var(--ht);flex-shrink:0">${a.time?formatDateShort(a.time):''}</div>
  </div>`).join('');
}

// ══════════════════════════════════════════════
// ANNOUNCEMENTS — lead-posted, shown on the Dashboard (the one page every role has, viewer
// included), so a time-sensitive broadcast is guaranteed to actually be seen. Not a page of its
// own — a widget, since the whole point is nobody has to go looking for it.
// ══════════════════════════════════════════════
function annIsLead(){ return !!CURRENT_USER && ['President','Vice President','admin'].includes(CURRENT_USER.role); }
function annVisible(){
  const today=new Date().toISOString().split('T')[0];
  return (D.announcements||[]).filter(a=>!a.expiresAt||a.expiresAt>=today).sort((a,b)=>{
    if(!!a.pinned!==!!b.pinned) return a.pinned?-1:1;
    return b.postedAt.localeCompare(a.postedAt);
  });
}
function dashRenderAnnouncements(){
  const el=document.getElementById('d-announcements'); if(!el)return;
  const canEdit=annIsLead();
  const addBtn=document.getElementById('d-ann-add-btn'); if(addBtn)addBtn.style.display=canEdit?'':'none';
  const all=annVisible();
  const viewAllBtn=document.getElementById('d-ann-viewall-btn'); if(viewAllBtn)viewAllBtn.style.display=all.length>3?'':'none';
  const top=all.slice(0,3);
  if(!top.length){
    el.innerHTML=es('ti-speakerphone','blue','No announcements','Nothing posted right now.','');
    return;
  }
  el.innerHTML=top.map(a=>`
    <div class="al-row">
      <div class="al-ic" style="background:${a.pinned?'var(--am-bg)':'var(--bl-bg)'};color:${a.pinned?'var(--am-tx)':'var(--bl-tx)'}"><i class="ti ${a.pinned?'ti-pin':'ti-speakerphone'}"></i></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:12.5px;font-weight:600">${esc(a.title)}</div>
          ${a.pinned?'<span class="badge ba2" style="font-size:8.5px">Pinned</span>':''}
        </div>
        <div style="font-size:11px;color:var(--mt);margin-top:2px;white-space:pre-wrap">${esc((a.body||'').slice(0,140))}${(a.body||'').length>140?'…':''}</div>
        <div style="font-size:10px;color:var(--ht);margin-top:3px">${esc(a.postedByName||'—')} · ${formatDateShort(a.postedAt.split('T')[0])}</div>
      </div>
      ${canEdit?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="ib" style="width:22px;height:22px;font-size:11px" onclick="annOpenEdit('${a.id}')" aria-label="Edit"><i class="ti ti-pencil"></i></button>
        <button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="annDelete('${a.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button>
      </div>`:''}
    </div>`).join('');
}
function annOpenAdd(){
  if(!annIsLead()){toast('Only the President or Vice President can post announcements.','error');return;}
  ['ann-title','ann-body'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('ann-pinned').checked=false;
  document.getElementById('ann-expires').value='';
  document.getElementById('ann-id').value='';
  document.getElementById('m-announcement').querySelector('.md-t').childNodes[0].textContent='New Announcement';
  document.getElementById('m-announcement').classList.add('open');
}
function annOpenEdit(id){
  if(!annIsLead())return;
  const a=D.announcements.find(x=>x.id===id); if(!a)return;
  document.getElementById('ann-title').value=a.title;
  document.getElementById('ann-body').value=a.body;
  document.getElementById('ann-pinned').checked=!!a.pinned;
  document.getElementById('ann-expires').value=a.expiresAt||'';
  document.getElementById('ann-id').value=id;
  document.getElementById('m-announcement').querySelector('.md-t').childNodes[0].textContent='Edit Announcement';
  document.getElementById('m-announcement').classList.add('open');
}
async function annSave(){
  if(!annIsLead())return;
  const title=document.getElementById('ann-title').value.trim();
  const body=document.getElementById('ann-body').value.trim();
  if(!title||!body){toast('Title and message are required','error');return;}
  const editId=document.getElementById('ann-id').value;
  const pinned=document.getElementById('ann-pinned').checked;
  const expiresAt=document.getElementById('ann-expires').value||null;
  let isNew=false, ann;
  if(editId){
    ann=D.announcements.find(a=>a.id===editId);
    if(ann)Object.assign(ann,{title,body,pinned,expiresAt});
  } else {
    isNew=true;
    ann={id:uid(),title,body,postedBy:CURRENT_USER?.mid||null,postedByName:CURRENT_USER?.name||CURRENT_USER?.email||'Officer',postedAt:new Date().toISOString(),pinned,expiresAt};
    D.announcements.unshift(ann);
  }
  await saveData();
  closeM(null,document.getElementById('m-announcement'));
  dashRenderAnnouncements();
  toast(isNew?'Announcement posted':'Announcement updated','success');
}
async function annDelete(id){
  if(!annIsLead())return;
  const ok=await confirmDialog('Delete Announcement','Remove this announcement for everyone?');
  if(!ok)return;
  D.announcements=D.announcements.filter(a=>a.id!==id);
  await saveData();
  dashRenderAnnouncements();
  toast('Announcement deleted','info');
}
function annOpenAll(){
  const canEdit=annIsLead();
  const all=[...(D.announcements||[])].sort((a,b)=>{
    if(!!a.pinned!==!!b.pinned) return a.pinned?-1:1;
    return b.postedAt.localeCompare(a.postedAt);
  });
  const today=new Date().toISOString().split('T')[0];
  document.getElementById('ann-all-list').innerHTML = all.length ? all.map(a=>{
    const expired = a.expiresAt && a.expiresAt<today;
    return `<div class="al-row" style="${expired?'opacity:.55':''}">
      <div class="al-ic" style="background:${a.pinned?'var(--am-bg)':'var(--bl-bg)'};color:${a.pinned?'var(--am-tx)':'var(--bl-tx)'}"><i class="ti ${a.pinned?'ti-pin':'ti-speakerphone'}"></i></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:600">${esc(a.title)}${expired?' <span style="font-size:9.5px;color:var(--ht);font-weight:400">(expired)</span>':''}</div>
        <div style="font-size:11px;color:var(--mt);margin-top:2px;white-space:pre-wrap">${esc(a.body||'')}</div>
        <div style="font-size:10px;color:var(--ht);margin-top:3px">${esc(a.postedByName||'—')} · ${formatDateShort(a.postedAt.split('T')[0])}${a.expiresAt?' · Expires '+formatDateShort(a.expiresAt):''}</div>
      </div>
      ${canEdit?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="ib" style="width:22px;height:22px;font-size:11px" onclick="closeM(null,document.getElementById('m-ann-all'));annOpenEdit('${a.id}')" aria-label="Edit"><i class="ti ti-pencil"></i></button>
        <button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="annDelete('${a.id}')" aria-label="Delete"><i class="ti ti-trash"></i></button>
      </div>`:''}
    </div>`;
  }).join('') : `<div style="text-align:center;color:var(--ht);padding:20px;font-size:12px">No announcements yet.</div>`;
  document.getElementById('m-ann-all').classList.add('open');
}


