/* OpsCore 2.0 Demo — Dashboard */
function renderDash(){
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+aR(m.id),0)/tot);
  const openT=D.tasks.filter(t=>t.status!=='done').length;
  const ovT=D.tasks.filter(t=>isOv(t.dueDate)&&t.status!=='done').length;
  const cas=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;
  const dn=D.tasks.filter(t=>t.status==='done').length;
  const taskPct=D.tasks.length?Math.round(dn/D.tasks.length*100):0;

  // ── KPIs ──
  document.getElementById('d-kpi').innerHTML=
    kpi('Chapter Attendance',avg+'%',avg>=85?'Above 85% target':'Below 85% target',avg>=85?'up':'down')+
    kpi('Active Members',tot,getSemester()+' roster','neutral')+
    kpi('Open Tasks',openT,ovT>0?ovT+' overdue':'All on track',ovT>0?'down':'neutral')+
    kpi('Active Cases',cas,cas>0?'Requires attention':'No open cases',cas?'down':'neutral');

  // ── INTELLIGENCE ALERTS ──
  dashBuildAlerts(avg);

  // ── OVERDUE TASKS ──
  dashBuildOverdue();

  // ── ATTENDANCE RISK ──
  dashBuildAttRisk();

  // ── UPCOMING EVENTS WITH COUNTDOWN ──
  dashBuildEvents();

  // ── SOBER BROS ──
  const ws=D.shifts.filter(s=>isUp(s.date)).slice(0,4);
  document.getElementById('d-sober').innerHTML=ws.map(s=>{const m=s.memberId?mB(s.memberId):null;return`<div class="sh-row"><div class="sh-av">${m?m.initials:'??'}</div><div style="flex:1"><div style="font-size:12px;font-weight:500;color:${m?'var(--tx)':'var(--rd)'}">${m?m.name:'Unassigned'}</div><div style="font-size:10.5px;color:var(--ht)">${fds(s.date)} · ${s.start}</div></div><span class="dot ${!m?'dr':s.confirmed?'dg':'da'}"></span></div>`;}).join('')||es('ti-shield-check','green','No shifts scheduled','Shifts appear here.',`<button class="btn" onclick="rbacNav('sober',null)">View schedule</button>`);

  // ── OFFICER ACCOUNTABILITY TABLE (legacy hidden) ──
  const offs=D.members.filter(m=>m.role!=='Member');
  document.getElementById('d-officers').innerHTML=`<thead><tr><th>Officer</th><th>Role</th><th>Tasks</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${offs.map(m=>{const ts=tM(m.id);const att=aR(m.id);const s=ts.rate>=80&&att>=85?['On track','bg2']:ts.rate>=60||att>=75?['Behind','ba2']:['At risk','br2'];return`<tr><td style="font-weight:500">${m.name}</td><td style="color:var(--mt)">${m.role}</td><td>${ts.done}/${ts.total}</td><td style="font-weight:500;color:${att>=85?'var(--gn)':att>=75?'var(--navy)':'var(--rd)'}">${att}%</td><td><span class="badge ${s[1]}">${s[0]}</span></td></tr>`;}).join('')}</tbody>`;

  // ── OFFICER KPI CARDS (new visual design) ──
  const offV2=document.getElementById('d-officers-v2');
  if(offV2){
    if(!offs.length){
      offV2.innerHTML=`<div style="padding:16px;text-align:center;color:var(--ht);font-size:11.5px">No officers found. Assign roles in Members.</div>`;
    } else {
      offV2.innerHTML=offs.map(m=>{
        const ts=tM(m.id);const att=aR(m.id);
        const s=ts.rate>=80&&att>=85?['On track','bg2','var(--gn)']:ts.rate>=60||att>=75?['Behind','ba2','var(--am)']:['At risk','br2','var(--rd)'];
        const attColor=att>=85?'var(--gn)':att>=75?'var(--navy)':att>=65?'var(--am)':'var(--rd)';
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
  const mandPast=D.events.filter(e=>e.mandatory&&!isUp(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);
  const chartEl=document.getElementById('d-chart');
  const labEl=document.getElementById('d-chart-labels');
  if(mandPast.length>=2){
    const chartData=mandPast.map(ev=>{const att=D.attendance[ev.id]||{};const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;return tot?Math.round(pres/tot*100):0;});
    const chartLabels=mandPast.map(ev=>mos(ev.date)+' '+dom(ev.date));
    const mx=Math.max(...chartData,1);
    if(chartEl)chartEl.innerHTML=chartData.map((v,i)=>`<div class="mb" style="flex:1;height:${Math.round(v/mx*100)}%;background:${v<75?'var(--rd)':v<85?'var(--am)':i===chartData.length-1?'var(--navy)':'#dde5f0'};border-radius:3px 3px 0 0;transition:height .4s ease" title="${chartLabels[i]}: ${v}%"></div>`).join('');
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
  document.getElementById('d-goals').innerHTML=D.goals.map(g=>{const p=Math.min(pc(g.current,g.target),100);return`<div class="pr"><span class="pl">${g.title}</span><div class="pb"><div class="pf" style="width:${p}%;background:${pgc(p)}"></div></div><span class="pv">${p}%</span></div>`;}).join('')||'<div style="color:var(--ht);font-size:12px;padding:8px 0">No goals yet.</div>';

  // ── NOTES ──
  const notesEl=document.getElementById('d-notes');
  if(notesEl)notesEl.innerHTML=D.notes.slice(0,3).map(n=>`<div style="padding:7px 0;border-bottom:1px solid var(--bdr);cursor:pointer" onclick="rbacNav('notes',null)"><div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${n.title}</span><span style="font-size:10px;color:var(--ht);flex-shrink:0">${fds(n.date)}</span></div><div style="font-size:10.5px;color:var(--mt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(n.body||'').slice(0,80)}</div></div>`).join('')||es('ti-notes','slate','No meeting notes','Chapter meeting notes will appear here.','');

  updateBadges();
}

// ── CHAPTER HEALTH SCORE ──
function dashDrawHealth(avgAtt,taskPct,openCases){
  const tot=D.members.length||1;
  const gpas=D.members.map(m=>{const rec=D.academics?.gpas?.[m.id]||{};const v=rec.cumulativeGpa||rec.priorGpa||'';return v?parseFloat(v):null;}).filter(g=>g!==null&&!isNaN(g));
  const avgGpa=gpas.length?(gpas.reduce((a,b)=>a+b,0)/gpas.length):0;
  const gpaScore=avgGpa?Math.round((avgGpa/4)*100):50;
  const upEvt=D.events.filter(e=>isUp(e.date)&&e.mandatory).length;
  const evtScore=Math.min(100,upEvt*14);
  const caseScore=Math.max(0,100-openCases*18);

  const dims=[
    {k:'Attendance',v:avgAtt,w:.30,c:'var(--navy)'},
    {k:'Tasks',v:taskPct,w:.25,c:'var(--gn)'},
    {k:'GPA',v:gpaScore,w:.20,c:'var(--bl)'},
    {k:'Events',v:evtScore,w:.15,c:'var(--am)'},
    {k:'Accountability',v:caseScore,w:.10,c:caseScore>=80?'var(--gn)':'var(--rd)'},
  ];
  const score=Math.round(dims.reduce((s,d)=>s+d.v*d.w,0));
  const scoreColor=score>=80?'var(--gn)':score>=65?'var(--navy)':score>=50?'var(--am)':'var(--rd)';

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
  const alerts=[];
  const ovT=D.tasks.filter(t=>isOv(t.dueDate)&&t.status!=='done');
  if(ovT.length){
    const top=ovT.sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]||2)-({urgent:0,high:1,medium:2,low:3}[b.priority]||2))[0];
    alerts.push({type:'task',icon:'ti-clock',bg:'background:var(--am-bg)',ic:'color:var(--am-tx)',title:`${ovT.length} overdue task${ovT.length>1?'s':''}`,body:`Highest: "${top.title}" — ${mB(top.assignedTo).name.split(' ')[0]}`});
  }
  const lowAtt=D.members.filter(m=>aR(m.id)<70);
  if(lowAtt.length){
    alerts.push({type:'attendance',icon:'ti-alert-circle',bg:'background:var(--rd-bg)',ic:'color:var(--rd-tx)',title:`${lowAtt.length} member${lowAtt.length>1?'s':''} below 70% attendance`,body:`${lowAtt.slice(0,2).map(m=>m.name.split(' ')[0]).join(', ')}${lowAtt.length>2?` +${lowAtt.length-2} more`:''}`});
  }
  const probation=D.members.filter(m=>{const r=aR(m.id);return r>=65&&r<75;});
  if(probation.length){
    alerts.push({type:'attendance',icon:'ti-alert-triangle',bg:'background:var(--am-bg)',ic:'color:var(--am-tx)',title:`${probation.length} member${probation.length>1?'s':''} nearing probation threshold`,body:probation.slice(0,2).map(m=>m.name.split(' ')[0]).join(', ')+(probation.length>2?' +'+(probation.length-2)+' more':'')+' — between 65–75%'});
  }
  const unassigned=D.shifts.filter(s=>isUp(s.date)&&!s.memberId);
  if(unassigned.length){
    alerts.push({type:'sober',icon:'ti-shield-exclamation',bg:'background:var(--bl-bg)',ic:'color:var(--bl-tx)',title:`${unassigned.length} unassigned sober bro shift${unassigned.length>1?'s':''}`,body:`Next: ${fds(unassigned[0].date)} · Needs coverage`});
  }
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status));
  if(openCases.length&&jbCanAccess&&jbCanAccess()){
    alerts.push({type:'judicial',icon:'ti-scale',bg:'background:var(--rd-bg)',ic:'color:var(--rd-tx)',title:`${openCases.length} open Judicial Board case${openCases.length>1?'s':''}`,body:'Review required — view J-Board for details'});
  }
  if(avg<85){
    alerts.push({type:'attendance',icon:'ti-trending-down',bg:'background:#f5f5f3',ic:'color:var(--mt)',title:`Chapter attendance at ${avg}% — below 85% target`,body:'Update attendance records to stay accurate'});
  }

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

// ── OVERDUE TASKS ──
function dashBuildOverdue(){
  const el=document.getElementById('d-overdue');if(!el)return;
  const ov=D.tasks.filter(t=>isOv(t.dueDate)&&t.status!=='done')
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
        <div style="font-size:10.5px;color:var(--rd-tx);opacity:.75">${daysOv}d overdue · ${mB(t.assignedTo).name.split(' ')[0]} · <span style="font-weight:600;text-transform:capitalize">${t.priority}</span></div>
      </div>
      <button class="btn btn-d" style="height:23px;font-size:10px;padding:0 7px;flex-shrink:0" onclick="event.stopPropagation();toggleTask('${t.id}')"><i class="ti ti-check"></i>Done</button>
    </div>`;
  }).join('');
  if(ov.length>4)el.innerHTML+=`<div style="font-size:11px;color:var(--mt);text-align:center;padding:7px 0;cursor:pointer" onclick="rbacNav('tasks',null)">+${ov.length-4} more overdue tasks →</div>`;
}

// ── ATTENDANCE RISK ──
function dashBuildAttRisk(){
  const el=document.getElementById('d-att-risk');if(!el)return;
  const risk=D.members.map(m=>({m,r:aR(m.id)})).filter(x=>x.r<80).sort((a,b)=>a.r-b.r);
  if(!risk.length){
    el.innerHTML=`<div class="es-inline ok"><i class="ti ti-circle-check"></i>All members above 80%</div>`;
    return;
  }
  const cat=r=>r<65?{label:'Warning',bg:'var(--rd-bg)',tc:'var(--rd-tx)'}:r<70?{label:'At Risk',bg:'var(--rd-bg)',tc:'var(--rd-tx)'}:r<75?{label:'Watch',bg:'var(--am-bg)',tc:'var(--am-tx)'}:{label:'Monitor',bg:'#f5f5f3',tc:'var(--mt)'};
  el.innerHTML=`<div style="font-size:10px;color:var(--mt);margin-bottom:8px">${risk.length} member${risk.length>1?'s':''} below 80% — ${risk.filter(x=>x.r<70).length} require attention</div>`+
    risk.slice(0,6).map(({m,r})=>{const c=cat(r);return`<div class="d-risk-row">
      <div class="sh-av" style="width:24px;height:24px;font-size:8px;background:${c.bg};color:${c.tc}">${m.initials}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:50px;height:5px;background:#f0f0ee;border-radius:99px;overflow:hidden"><div style="height:100%;width:${r}%;background:${r<70?'var(--rd)':'var(--am)'};border-radius:99px"></div></div>
        <span style="font-size:11px;font-weight:700;color:${r<70?'var(--rd)':'var(--am-tx)'};width:28px;text-align:right">${r}%</span>
      </div>
    </div>`;}).join('');
  if(risk.length>6)el.innerHTML+=`<div style="font-size:11px;color:var(--mt);text-align:center;padding:7px 0;cursor:pointer" onclick="rbacNav('attendance',null)">+${risk.length-6} more →</div>`;
}

// ── UPCOMING EVENTS WITH COUNTDOWN ──
function dashBuildEvents(){
  const el=document.getElementById('d-events');if(!el)return;
  const ups=D.events.filter(e=>isUp(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  if(!ups.length){el.innerHTML=es('ti-calendar-off','blue','No upcoming events','Add events to the calendar.',`<button class="btn" onclick="openM('m-addevent')"><i class="ti ti-plus"></i>Add Event</button>`);return;}
  el.innerHTML=ups.map(e=>{
    const days=Math.max(0,Math.round((new Date(e.date+'T12:00:00')-new Date())/(1000*86400)));
    const cls=days===0?'urgent':days<=3?'soon':'';
    const cdLabel=days===0?'Today':days===1?'Tomorrow':`${days}d`;
    return`<div class="ev-row">
      <div class="ev-dt"><div class="ev-day">${dom(e.date)}</div><div class="ev-mo">${mos(e.date)}</div></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</div>
        <div style="font-size:10.5px;color:var(--mt);margin-top:1px">${e.start||'TBD'}${e.location?' · '+e.location:''}</div>
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
    activities.push({time:n.date,icon:'ti-notes',color:'var(--bl)',text:`<strong>${mB(n.author).name.split(' ')[0]}</strong> recorded meeting notes`,sub:n.title,page:'notes'});
  });

  // Recent completed tasks
  D.tasks.filter(t=>t.status==='done').slice(0,3).forEach(t=>{
    activities.push({time:t.dueDate||'',icon:'ti-checkbox',color:'var(--gn)',text:`<strong>${mB(t.assignedTo).name.split(' ')[0]}</strong> completed a task`,sub:t.title,page:'tasks'});
  });

  // Recent events added
  D.events.slice(0,2).forEach(e=>{
    activities.push({time:e.date,icon:'ti-calendar-plus',color:'var(--am)',text:`Event scheduled`,sub:e.title,page:'calendar'});
  });

  // Recent shifts
  D.shifts.filter(s=>s.confirmed).slice(0,2).forEach(s=>{
    const m=s.memberId?mB(s.memberId):null;
    if(m)activities.push({time:s.date,icon:'ti-shield-check',color:'var(--gn)',text:`<strong>${m.name.split(' ')[0]}</strong> confirmed sober bro shift`,sub:fds(s.date)+' · '+s.event,page:'sober'});
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
    <div style="font-size:9.5px;color:var(--ht);flex-shrink:0">${a.time?fds(a.time):''}</div>
  </div>`).join('');
}


