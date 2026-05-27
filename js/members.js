// ══════════════════════════════════════════════
// members.js
// Members directory, Committees, Analytics & Reporting, and Sober Schedule pages.
// Includes: member table with search/filter, committee cards, the full analytics
// module (attendance trend chart, task donut, GPA distribution, officer engagement
// matrix, member engagement tiers, and health scorecard), plus Event Safety schedule
// and all their respective render functions.
// ══════════════════════════════════════════════
function renderSober(){
  const today=new Date().toISOString().split('T')[0];
  const ups=D.shifts.filter(s=>s.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
  const hist=D.shifts.filter(s=>s.date<today).sort((a,b)=>b.date.localeCompare(a.date));
  const una=ups.filter(s=>!s.memberId).length;const ns=D.shifts.filter(s=>s.noShow).length;
  document.getElementById('s-kpi').innerHTML=kpi('Upcoming shifts',ups.length,'Next 2 weeks','neutral')+kpi('Unassigned',una,una>0?'Need coverage':'All covered',una>0?'down':'neutral')+kpi('Total this semester',D.shifts.length,getSemester(),'neutral')+kpi('No-shows YTD',ns,ns>0?'Flag for JBoard':'Clean record',ns>0?'down':'neutral');
  document.getElementById('s-alert').innerHTML=una>0?`<div class="bnr danger"><i class="ti ti-alert-circle" style="font-size:13px"></i>${una} shift${una>1?'s':''} need${una===1?'s':''} coverage before the event.</div>`:'';
  document.getElementById('s-table').innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Member</th><th>Status</th><th></th></tr></thead><tbody>${ups.map(s=>{const m=s.memberId?mB(s.memberId):null;return`<tr><td style="font-weight:500">${s.event}</td><td style="color:var(--mt)">${fd(s.date)}</td><td style="font-family:'DM Mono',monospace;font-size:11px">${s.start}–${s.end}</td><td>${m?`<span style="font-weight:500">${m.name}</span>`:'<span style="color:var(--rd);font-weight:500">Unassigned</span>'}</td><td>${!m?'<span class="badge br2">Needed</span>':s.confirmed?'<span class="badge bg2">Confirmed</span>':'<span class="badge ba2">Pending</span>'}</td><td style="white-space:nowrap">${m&&!s.confirmed?`<button class="btn" style="height:23px;font-size:10.5px;margin-right:4px" onclick="confirmShift('${s.id}')">Confirm</button>`:''}<button class="btn btn-d" style="height:23px;font-size:10.5px;padding:0 7px" onclick="deleteShift('${s.id}')"><i class="ti ti-trash"></i></button></td></tr>`;}).join('')||`<tr><td colspan="6"><div style="padding:8px">${es('ti-shield-check','green','No upcoming sober shifts','Add shifts for upcoming events to track coverage.',`<button class="btn btn-p" onclick="openM('m-addshift')"><i class="ti ti-plus"></i>Add Shift</button>`)}</div></td></tr>`}</tbody>`;
  document.getElementById('s-hist').innerHTML=`<thead><tr><th>Event</th><th>Date</th><th>Member</th><th>Outcome</th></tr></thead><tbody>${hist.map(s=>{const m=s.memberId?mB(s.memberId):null;return`<tr><td>${s.event}</td><td style="color:var(--mt)">${fds(s.date)}</td><td style="font-weight:500">${m?m.name:'Unassigned'}</td><td>${s.noShow?'<span class="badge br2">No-show</span>':s.confirmed?'<span class="badge bg2">Completed</span>':'—'}</td></tr>`;}).join('')}</tbody>`;
}

function renderMembers(){
  document.getElementById('m-kpi').innerHTML=kpi('Active members',D.members.length,getSemester(),'neutral')+kpi('Live-in',D.members.filter(m=>m.liveIn).length,'Chapter house','neutral')+kpi('Graduating',D.members.filter(m=>m.year===2027).length,'Class of 2027','neutral');
  document.getElementById('m-table').innerHTML=`<thead><tr><th>Member</th><th>Grad Year</th><th>Class</th><th>Role</th><th>Attendance</th><th>Live-in</th><th>Engagement</th><th></th></tr></thead><tbody>${D.members.map(m=>{const r=aR(m.id);const dots=[...Array(5)].map((_,i)=>`<div class="edot ${i<Math.round(r/20)?'f':'e'}"></div>`).join('');return`<tr><td><div style="display:flex;align-items:center;gap:7px"><div class="sh-av" style="width:25px;height:25px;font-size:8.5px">${m.initials}</div><span style="font-weight:500">${m.name}</span></div></td><td style="color:var(--mt)">${m.year}</td><td>${m.classYear}</td><td><span class="badge ${m.role!=='Member'?'bb2':'bm2'}">${m.role}</span></td><td style="font-weight:500;color:${r>=85?'var(--gn)':r>=75?'var(--navy)':r>=65?'var(--am)':'var(--rd)'}">${r}%</td><td>${m.liveIn?'Yes':'—'}</td><td><div class="edots">${dots}</div></td><td><button class="btn" style="height:23px;font-size:10.5px" onclick="openEditMember('${m.id}')"><i class="ti ti-pencil"></i></button></td></tr>`;}).join('')}</tbody>`;
}

function renderCommittees(){
  document.getElementById('co-cnt').textContent=D.committees.length+' committees this semester';
  document.getElementById('co-grid').innerHTML=D.committees.map(c=>`<div class="card" style="cursor:pointer;transition:border-color .1s" onmouseover="this.style.borderColor='var(--navy)'" onmouseout="this.style.borderColor='var(--bdr)'"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px"><span style="font-size:13px;font-weight:500">${c.name}</span><div style="display:flex;align-items:center;gap:6px"><span style="font-size:10.5px;color:var(--mt)">${(c.members||[]).length} members</span><button class="btn" style="height:22px;font-size:10px;padding:0 7px" onclick="openEditComm('${c.id}')"><i class="ti ti-pencil"></i></button></div></div><p style="font-size:11.5px;color:var(--mt);line-height:1.5;margin-bottom:9px">${c.desc||'No description'}</p><div style="font-size:11px;color:var(--ht);border-top:1px solid var(--bdr);padding-top:8px;display:flex;justify-content:space-between"><span>Chair:</span><span style="font-weight:500;color:var(--tx)">${c.chair?mB(c.chair).name:'Unassigned'}</span></div></div>`).join('')||`<div style="grid-column:1/-1">${es('ti-sitemap','blue','No committees','Create committees to organize chapter working groups.',`<button class="btn btn-p" onclick="openM('m-addcomm')"><i class="ti ti-plus"></i>New Committee</button>`)}</div>`;
}

function renderAnalytics(){
  const tot=D.members.length;
  const avg=tot?Math.round(D.members.reduce((s,m)=>s+aR(m.id),0)/tot):0;
  const dn=D.tasks.filter(t=>t.status==='done').length;
  const ip=D.tasks.filter(t=>t.status==='in_progress').length;
  const ov=D.tasks.filter(t=>isOv(t.dueDate)&&t.status!=='done').length;
  const td=D.tasks.filter(t=>t.status==='todo'&&!isOv(t.dueDate)).length;
  const onT=D.goals.filter(g=>pc(g.current,g.target)>=50).length;
  const openCases=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status)).length;

  // ── KPIs ──
  document.getElementById('an-kpi').innerHTML=
    kpi('Org Attendance',avg+'%',avg>=85?'Above target':'Below 85% target',avg>=85?'up':'down')+
    kpi('Task Completion',D.tasks.length?Math.round(dn/D.tasks.length*100)+'%':'—',dn+'/'+(D.tasks.length||0)+' complete',dn>0?'up':'neutral')+
    kpi('Goals On Track',onT+'/'+D.goals.length,'At or above 50%',onT>0?'up':'neutral')+
    kpi('Open Cases',openCases,openCases?'Requires attention':'No open cases',openCases?'down':'neutral');

  // ── ATTENDANCE TREND LINE CHART ──
  anDrawLine();

  // ── CHAPTER HEALTH SCORECARD ──
  anDrawHealth(avg,dn,openCases);

  // ── TASK DONUT CHART ──
  anDrawDonut(dn,ip,ov,td);

  // ── GPA DISTRIBUTION ──
  anDrawGpa();

  // ── OFFICER ENGAGEMENT MATRIX ──
  anDrawOfficers();

  // ── MEMBER ENGAGEMENT TIERS ──
  const hi=D.members.filter(m=>aR(m.id)>=90).length;
  const go2=D.members.filter(m=>{const r=aR(m.id);return r>=75&&r<90;}).length;
  const ri=D.members.filter(m=>{const r=aR(m.id);return r>=60&&r<75;}).length;
  const lo=D.members.filter(m=>aR(m.id)<60).length;
  document.getElementById('an-eng').innerHTML=[
    {l:'Highly engaged (90%+)',v:hi,c:'var(--gn)'},
    {l:'Good standing (75–90%)',v:go2,c:'var(--navy)'},
    {l:'At risk (60–75%)',v:ri,c:'var(--am)'},
    {l:'Disengaged (<60%)',v:lo,c:'var(--rd)'}
  ].map(r=>`<div class="pr"><span class="pl">${r.l}</span><div class="pb"><div class="pf" style="width:${tot?Math.round(r.v/tot*100):0}%;background:${r.c}"></div></div><span class="pv">${r.v}</span></div>`).join('');

  // ── SEMESTER GOALS ──
  document.getElementById('an-goals').innerHTML=D.goals.map(g=>{
    const p=Math.min(pc(g.current,g.target),100);
    return`<div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:500">${g.title}</span><span style="font-size:11px;color:var(--mt)">${g.current}/${g.target} ${g.unit}</span></div><div class="pb" style="height:5px"><div class="pf" style="width:${p}%;background:${pgc(p)}"></div></div></div>`;
  }).join('')||'<div style="color:var(--ht);font-size:12px;padding:8px 0">No goals set.</div>';
}

// ── ATTENDANCE TREND LINE CHART ──
function anDrawLine(){
  const svg=document.getElementById('an-line-chart');
  if(!svg)return;
  const tooltip=document.getElementById('an-line-tooltip');
  const xaxis=document.getElementById('an-line-xaxis');

  // Build weekly data from mandatory past events
  const mandPast=D.events.filter(e=>e.mandatory&&!isUp(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const tot=D.members.length||1;

  let points=[];
  if(mandPast.length>=2){
    points=mandPast.slice(-10).map(ev=>{
      const att=D.attendance[ev.id]||{};
      const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;
      return{label:mos(ev.date)+' '+dom(ev.date),val:Math.round(pres/tot*100)};
    });
  }

  if(points.length<2){svg.innerHTML=`<text x="50%" y="75" text-anchor="middle" fill="#a0a09d" font-size="12">No attendance data yet — mark attendance for mandatory events to see the trend.</text>`;if(xaxis)xaxis.innerHTML='';const lbl=document.getElementById('an-trend-label');if(lbl)lbl.textContent='0 events tracked';return;}

  const W=svg.clientWidth||520,H=140,PAD={t:12,r:16,b:8,l:32};
  const CW=W-PAD.l-PAD.r,CH=H-PAD.t-PAD.b;
  const vals=points.map(p=>p.val);
  const minV=Math.max(0,Math.min(...vals)-10),maxV=Math.min(100,Math.max(...vals)+10);
  const xS=i=>PAD.l+i*(CW/(points.length-1));
  const yS=v=>PAD.t+CH-(v-minV)/(maxV-minV)*CH;

  // Grid lines
  let html='';
  [0,25,50,75,100].forEach(g=>{
    if(g<minV||g>maxV)return;
    const y=yS(g);
    html+=`<line x1="${PAD.l}" y1="${y}" x2="${PAD.l+CW}" y2="${y}" stroke="#e5e5e3" stroke-width="1"/>`;
    html+=`<text x="${PAD.l-4}" y="${y+3.5}" text-anchor="end" fill="#a0a09d" font-size="9">${g}%</text>`;
  });

  // Target line at 85%
  if(85>=minV&&85<=maxV){
    const y=yS(85);
    html+=`<line x1="${PAD.l}" y1="${y}" x2="${PAD.l+CW}" y2="${y}" stroke="#e24b4a" stroke-width="1" stroke-dasharray="4 3" opacity=".5"/>`;
    html+=`<text x="${PAD.l+CW+3}" y="${y+3}" fill="#e24b4a" font-size="8.5" opacity=".7">85%</text>`;
  }

  // Filled area under line
  const linePoints=points.map((p,i)=>`${xS(i)},${yS(p.val)}`).join(' ');
  const areaPath=`M ${xS(0)},${H-PAD.b} L ${points.map((p,i)=>`${xS(i)},${yS(p.val)}`).join(' L ')} L ${xS(points.length-1)},${H-PAD.b} Z`;
  html+=`<defs><linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0c1d56" stop-opacity=".18"/><stop offset="100%" stop-color="#0c1d56" stop-opacity="0"/></linearGradient></defs>`;
  html+=`<path d="${areaPath}" fill="url(#lineGrad)"/>`;

  // Smooth line using SVG path with curves
  let d=`M ${xS(0)} ${yS(points[0].val)}`;
  for(let i=1;i<points.length;i++){
    const x0=xS(i-1),y0=yS(points[i-1].val),x1=xS(i),y1=yS(points[i].val);
    const cpx=(x0+x1)/2;
    d+=` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
  }
  html+=`<path d="${d}" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round"/>`;

  // Dots with hover
  points.forEach((p,i)=>{
    const x=xS(i),y=yS(p.val);
    const color=p.val>=85?'var(--gn)':p.val>=75?'var(--navy)':'var(--rd)';
    html+=`<circle class="an-line-dot" cx="${x}" cy="${y}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5"
      onmouseenter="anLineHover(event,'${p.label}: ${p.val}%',${x},${y})"
      onmouseleave="document.getElementById('an-line-tooltip').style.display='none'"/>`;
  });

  svg.innerHTML=html;
  svg.setAttribute('height',H);

  // X axis labels
  if(xaxis){xaxis.innerHTML=points.map(p=>`<span>${p.label}</span>`).join('');}
  const lbl=document.getElementById('an-trend-label');
  if(lbl)lbl.textContent=points.length+' events tracked';
}

function anLineHover(e,text,cx,cy){
  const t=document.getElementById('an-line-tooltip');
  const svg=document.getElementById('an-line-chart');
  if(!t||!svg)return;
  const rect=svg.getBoundingClientRect();
  const x=e.clientX-rect.left,y=e.clientY-rect.top;
  t.textContent=text;
  t.style.display='block';
  t.style.left=Math.min(x+10,rect.width-120)+'px';
  t.style.top=Math.max(0,y-28)+'px';
}

// ── CHAPTER HEALTH SCORECARD ──
function anDrawHealth(avgAtt,dnTasks,openCases){
  const tot=D.members.length||1;
  const taskPct=D.tasks.length?Math.round(dnTasks/D.tasks.length*100):0;
  const upcomingEvt=D.events.filter(e=>isUp(e.date)).length;
  const evtScore=Math.min(100,upcomingEvt*12);
  const gpas=D.members.map(m=>{const r=D.academics?.gpas?.[m.id];return r?(parseFloat(r.cumulativeGpa||r.priorGpa||0)):0;}).filter(g=>g>0);
  const avgGpa=gpas.length?(gpas.reduce((a,b)=>a+b,0)/gpas.length):0;
  const gpaScore=avgGpa?Math.round((avgGpa/4)*100):50;
  const caseScore=Math.max(0,100-openCases*15);

  const items=[
    {label:'Attendance',val:avgAtt,target:85,icon:'ti-users',color:'var(--navy)'},
    {label:'Task Completion',val:taskPct,target:70,icon:'ti-checkbox',color:'var(--gn)'},
    {label:'GPA Score',val:gpaScore,target:75,icon:'ti-school',color:'var(--bl)'},
    {label:'Event Activity',val:evtScore,target:60,icon:'ti-calendar',color:'var(--am)'},
    {label:'Compliance Board Status',val:caseScore,target:90,icon:'ti-scale',color:caseScore>=85?'var(--gn)':'var(--rd)'},
  ];

  const overallScore=Math.round(items.reduce((s,x)=>s+(x.val*{Attendance:.30,'Task Completion':.25,'GPA Score':.20,'Event Activity':.15,'Compliance Board Status':.10}[x.label]),0));
  // Health score elements removed from Analytics page — now lives exclusively in Health Scorecard page
}

// ── TASK DONUT CHART ──
function anDrawDonut(dn,ip,ov,td){
  const svg=document.getElementById('an-donut');
  const legend=document.getElementById('an-donut-legend');
  const pctEl=document.getElementById('an-donut-pct');
  if(!svg||!legend||!pctEl)return;

  const total=dn+ip+ov+td;
  const pct=total?Math.round(dn/total*100):0;
  pctEl.textContent=pct+'%';

  const segs=[
    {label:'Complete',v:dn,c:'#1d9e75'},
    {label:'In Progress',v:ip,c:'#378add'},
    {label:'To Do',v:td,c:'#d0d0ce'},
    {label:'Overdue',v:ov,c:'#e24b4a'},
  ].filter(s=>s.v>0);

  const R=42,CX=55,CY=55,CIRC=2*Math.PI*R,SW=14;
  let offset=0;
  let paths='';

  if(total===0){
    paths=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f0f0ee" stroke-width="${SW}"/>`;
  } else {
    segs.forEach((s,i)=>{
      const dash=(s.v/total)*CIRC;
      paths+=`<circle class="an-seg" cx="${CX}" cy="${CY}" r="${R}" fill="none"
        stroke="${s.c}" stroke-width="${SW}" stroke-linecap="round"
        stroke-dasharray="${dash} ${CIRC}"
        stroke-dashoffset="${-(offset*CIRC/CIRC*CIRC - CIRC/4)}"
        style="transform:rotate(-90deg);transform-origin:${CX}px ${CY}px;stroke-dashoffset:${CIRC-(offset/total*CIRC)};transition:stroke-dashoffset .7s cubic-bezier(.4,0,.2,1) ${i*80}ms"
        data-final="${CIRC-(offset/total*CIRC)}"/>`;
      offset+=s.v;
    });
  }
  svg.innerHTML=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f5f5f3" stroke-width="${SW}"/>${paths}`;

  // Animate
  svg.querySelectorAll('.an-seg').forEach(seg=>{
    seg.style.strokeDashoffset=CIRC;
    setTimeout(()=>{seg.style.strokeDashoffset=seg.getAttribute('data-final');},60);
  });

  legend.innerHTML=segs.map(s=>`<div style="display:flex;align-items:center;gap:6px">
    <div class="an-legend-dot" style="background:${s.c}"></div>
    <span style="font-size:11.5px;color:var(--mt);flex:1">${s.label}</span>
    <span style="font-size:11.5px;font-weight:600">${s.v}</span>
  </div>`).join('');
}

// ── GPA DISTRIBUTION ──
function anDrawGpa(){
  const el=document.getElementById('an-gpa-chart');
  const cntEl=document.getElementById('an-gpa-count');
  if(!el)return;

  const gpas=D.members.map(m=>{
    const rec=D.academics?.gpas?.[m.id]||{};
    const v=rec.cumulativeGpa||rec.priorGpa||'';
    return v?parseFloat(v):null;
  }).filter(g=>g!==null&&!isNaN(g));

  if(cntEl)cntEl.textContent=gpas.length+' members tracked';

  const buckets=[
    {label:'3.50 – 4.00',sublabel:"Dean's List",min:3.5,max:4.01,c:'#1d9e75'},
    {label:'3.00 – 3.49',sublabel:'Good Standing',min:3.0,max:3.5,c:'#378add'},
    {label:'2.75 – 2.99',sublabel:'Watch',min:2.75,max:3.0,c:'#ef9f27'},
    {label:'2.00 – 2.74',sublabel:'Warning',min:2.0,max:2.75,c:'#e24b4a'},
    {label:'Below 2.00',sublabel:'Critical',min:0,max:2.0,c:'#a32d2d'},
  ];

  if(!gpas.length){
    el.innerHTML=`<div style="color:var(--ht);font-size:12px;padding:12px 0;text-align:center">No GPAs entered yet — update GPAs in Academics.</div>`;
    return;
  }

  const max=Math.max(...buckets.map(b=>gpas.filter(g=>g>=b.min&&g<b.max).length),1);
  el.innerHTML=buckets.map(b=>{
    const n=gpas.filter(g=>g>=b.min&&g<b.max).length;
    const pct=Math.round(n/max*100);
    const pctOfTotal=gpas.length?Math.round(n/gpas.length*100):0;
    return`<div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <div><span style="font-size:11.5px;font-weight:500">${b.label}</span><span style="font-size:10px;color:var(--ht);margin-left:5px">${b.sublabel}</span></div>
        <div style="font-size:11px;color:var(--mt)">${n} <span style="color:var(--ht)">(${pctOfTotal}%)</span></div>
      </div>
      <div class="an-bar-bg"><div class="an-bar-fill" style="background:${b.c};width:0%" data-w="${pct}"></div></div>
    </div>`;
  }).join('');

  // Animate bars
  setTimeout(()=>{el.querySelectorAll('.an-bar-fill').forEach(b=>{b.style.width=b.dataset.w+'%';});},80);
}

// ── OFFICER ENGAGEMENT MATRIX ──
function anDrawOfficers(){
  const el=document.getElementById('an-officers');
  if(!el)return;

  const officers=D.members.filter(m=>m.role!=='Member');
  if(!officers.length){el.innerHTML='<div style="color:var(--ht);font-size:12px;padding:12px 0">No officers found.</div>';return;}

  // Header
  let html=`<div class="an-off-row" style="border-bottom:2px solid var(--bdr)">
    <div style="font-size:9px;font-weight:600;color:var(--ht);text-transform:uppercase;letter-spacing:.07em">Officer</div>
    <div style="font-size:9px;font-weight:600;color:var(--ht);text-transform:uppercase;letter-spacing:.07em">Attendance</div>
    <div style="font-size:9px;font-weight:600;color:var(--ht);text-transform:uppercase;letter-spacing:.07em">Tasks</div>
    <div style="font-size:9px;font-weight:600;color:var(--ht);text-transform:uppercase;letter-spacing:.07em">Meeting Notes</div>
  </div>`;

  html+=officers.map(m=>{
    const att=aR(m.id);
    const ts=tM(m.id);
    // Meeting participation: count notes where this officer had a report
    const noteCount=D.notes.filter(n=>n.officerReports&&n.officerReports.some(r=>r.name===m.name&&r.notes)).length;
    const noteMax=Math.max(D.notes.length,1);
    const notePct=Math.min(100,Math.round(noteCount/noteMax*100));

    function miniBar(pct,color){
      return`<div style="display:flex;align-items:center;gap:7px">
        <div style="flex:1;height:8px;background:#f0f0ee;border-radius:3px;overflow:hidden">
          <div class="an-mini-bar" style="background:${color};width:0%" data-w="${pct}"></div>
        </div>
        <span style="font-size:11px;font-weight:500;width:28px;text-align:right;color:${pct>=85?'var(--gn)':pct>=65?'var(--navy)':'var(--rd)'}">${pct}%</span>
      </div>`;
    }

    return`<div class="an-off-row">
      <div style="min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name.split(' ')[0]} ${m.name.split(' ').slice(1).join(' ')}</div>
        <div style="font-size:9.5px;color:var(--ht);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.role}</div>
      </div>
      ${miniBar(att,'var(--navy)')}
      ${miniBar(ts.rate,'var(--gn)')}
      ${miniBar(notePct,'var(--am)')}
    </div>`;
  }).join('');

  el.innerHTML=html;

  // Animate all mini bars
  setTimeout(()=>{el.querySelectorAll('.an-mini-bar').forEach(b=>{b.style.width=b.dataset.w+'%';});},80);
}


// ── FILE STORAGE: store base64 content in memory (not localStorage — too large)
const FI_STORE = {}; // id -> {name, type, size, base64, mediaType, text}

function fiDragOver(e){e.preventDefault();const t=e.currentTarget;t.style.borderColor='var(--navy)';t.style.background='#f0f4ff';}
function fiDragLeave(e){const t=e.currentTarget;t.style.borderColor='var(--bdr)';t.style.background='transparent';}
function fiDrop(e){e.preventDefault();fiDragLeave(e);const files=e.dataTransfer.files;if(files.length)fiProcessFiles(files,'General');}

function handleFU(inp,folder){
  const f=folder||FI_CURRENT_FOLDER||'General';
  if(inp.files.length)fiProcessFiles(inp.files,f);
  inp.value='';
}

function fiProcessFiles(files,folder){
  const targetFolder=folder||FI_CURRENT_FOLDER||'General';
  Array.from(files).forEach(file=>{
    const id='f'+Date.now()+Math.random().toString(36).slice(2,6);
    const reader=new FileReader();
    reader.onload=function(e){
      const b64=e.target.result.split(',')[1];
      const mt=file.type||'application/octet-stream';
      FI_STORE[id]={name:file.name,type:file.type,size:file.size,base64:b64,mediaType:mt};
      if(mt.includes('text')||mt.includes('csv')||file.name.endsWith('.csv')||file.name.endsWith('.txt')){
        FI_STORE[id].text=atob(b64);
      }
      const sizeStr=file.size>1048576?(file.size/1048576).toFixed(1)+' MB':(file.size/1024).toFixed(0)+' KB';
      const uploadedBy=CURRENT_USER?CURRENT_USER.mid:null;
      D.files.unshift({id,name:file.name,folder:targetFolder,size:sizeStr,date:new Date().toISOString().split('T')[0],uploadedBy});
      saveD();renderFiles();
      fiOpenDoc(id);
    };
    reader.readAsDataURL(file);
  });
}

function fiGuessFolder(name){
  const n=name.toLowerCase();
  if(n.includes('budget')||n.includes('finance')||n.includes('dues'))return'Budget & Finance';
  if(n.includes('bylaw')||n.includes('constitution'))return'Bylaws & Governance';
  if(n.includes('note')||n.includes('minutes')||n.includes('meeting'))return'Meeting Notes';
  if(n.includes('recruit')||n.includes('rush')||n.includes('bid'))return'Recruitment';
  if(n.includes('risk')||n.includes('sober'))return'Risk Management';
  if(n.includes('schedul')||n.includes('calendar'))return'Schedules';
  return'General';
}



// ── FILES FOLDER STATE ──
let FI_CURRENT_FOLDER=null; // null = root view

const DEFAULT_FILE_FOLDERS=[
  {name:'President',icon:'👑',color:'#1a3a6b',bg:'#e8eef7'},
  {name:'Vice President',icon:'⭐',color:'#185fa5',bg:'#e6f1fb'},
  {name:'Treasurer',icon:'💰',color:'#3b6d11',bg:'#eaf3de'},
  {name:'Risk Manager',icon:'🛡️',color:'#a32d2d',bg:'#fcebeb'},
  {name:'Secretary',icon:'📋',color:'#854f0b',bg:'#faeeda'},
  {name:'Chaplain',icon:'✝️',color:'#555',bg:'#f0f0ee'},
  {name:'New Member Educator',icon:'🎓',color:'#185fa5',bg:'#e6f1fb'},
  {name:'Recruitment Chair',icon:'🤝',color:'#3b6d11',bg:'#eaf3de'},
  {name:'Social Chair',icon:'🎉',color:'#854f0b',bg:'#faeeda'},
  {name:'Philanthropy Chair',icon:'❤️',color:'#a32d2d',bg:'#fcebeb'},
  {name:'Scholarship Chair',icon:'📚',color:'#185fa5',bg:'#e6f1fb'},
  {name:'Alumni Relations Chair',icon:'🏛️',color:'#1a3a6b',bg:'#e8eef7'},
  {name:'Public Relations Officer',icon:'📣',color:'#854f0b',bg:'#faeeda'},
  {name:'Community Service Chair',icon:'🌱',color:'#3b6d11',bg:'#eaf3de'},
  {name:'General',icon:'📁',color:'#555',bg:'#f0f0ee'},
];
function getFileFolders(){
  if(!D.settings)return DEFAULT_FILE_FOLDERS;
  if(!D.settings.fileFolders)D.settings.fileFolders=[...DEFAULT_FILE_FOLDERS];
  return D.settings.fileFolders;
}

function fiNavRoot(){
  FI_CURRENT_FOLDER=null;
  document.getElementById('fi-root-view').style.display='block';
  document.getElementById('fi-folder-view').style.display='none';
  document.getElementById('fi-bc-folder').style.display='none';
  document.getElementById('fi-back-btn').style.display='none';
  renderFiles();
}

function fiOpenFolder(folderName){
  FI_CURRENT_FOLDER=folderName;
  document.getElementById('fi-root-view').style.display='none';
  document.getElementById('fi-folder-view').style.display='block';
  document.getElementById('fi-bc-folder').style.display='inline';
  document.getElementById('fi-bc-name').textContent=folderName;
  document.getElementById('fi-back-btn').style.display='flex';
  document.getElementById('fi-drop-label').textContent='Upload to '+folderName+' folder';
  // Update file input to use this folder
  document.getElementById('fi-input').onchange=function(){handleFU(this,folderName);};
  renderFiles();
}

function fiOpenFolderUpload(encodedFolder){
  fiOpenFolder(decodeURIComponent(encodedFolder));
}

function fiDropFolder(e){e.preventDefault();fiDragLeave(e);const files=e.dataTransfer.files;if(files.length)fiProcessFiles(files,FI_CURRENT_FOLDER||'General');}

