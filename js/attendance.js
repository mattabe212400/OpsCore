/* OpsCore 2.0 Demo — Attendance Analytics */

function canEditAttendance(){
  if(!CURRENT_USER) return false;
  if(CURRENT_USER.role==='admin') return true;
  return ['President','Vice President','Secretary'].includes(CURRENT_USER.title);
}

function _attUpdateToolbar(){
  const canEdit=canEditAttendance();
  const newEv=document.getElementById('att-new-event-btn');
  const markBtn=document.getElementById('att-mark-btn');
  if(newEv) newEv.style.display=canEdit?'':'none';
  if(markBtn) markBtn.style.display=canEdit?'':'none';
}

function renderAttendance(){
  _attUpdateToolbar();
  const tot=D.members.length;const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const excused=Object.values(D.attendance||{}).reduce((s,ev)=>s+Object.values(ev).filter(v=>v==='excused').length,0);
  const absent=Object.values(D.attendance||{}).reduce((s,ev)=>s+Object.values(ev).filter(v=>v==='absent').length,0);
  const attHd=document.getElementById('att-hd');if(attHd)attHd.textContent='Member Attendance — '+getSemester();
  document.getElementById('a-kpi').innerHTML=kpi('Semester avg',avg+'%',getSemester(),avg>=85?'up':'down')+kpi('Excused Misses',excused,'Semester total','neutral')+kpi('Unexcused Misses',absent,'Semester total',absent>20?'down':'neutral')+kpi('Warnings issued',D.members.filter(m=>getAttendanceRate(m.id)<75).length,'Below 75%',D.members.filter(m=>getAttendanceRate(m.id)<75).length>0?'down':'neutral');
  document.getElementById('a-table').innerHTML=`<thead><tr><th>Member</th><th>Class</th><th>Attendance Rate</th><th>Status</th><th></th></tr></thead><tbody>${D.members.map(m=>{const r=getAttendanceRate(m.id);const s=r>=85?['Good','bg2']:r>=75?['Good','bg2']:r>=65?['At risk','ba2']:['Warning','br2'];return`<tr><td style="font-weight:500">${m.name}</td><td>${m.classYear}</td><td style="font-weight:500;color:${r>=85?'var(--gn)':r>=75?'var(--navy)':r>=65?'var(--am)':'var(--rd)'}">${r}%</td><td><span class="badge ${s[1]}">${s[0]}</span></td><td><button class="btn" style="height:23px;font-size:10.5px" onclick="openEditMember('${m.id}')"><i class="ti ti-pencil"></i></button></td></tr>`;}).join('')}</tbody>`;
  document.getElementById('a-events').innerHTML=`<thead><tr><th>Event</th><th>Type</th><th>Date</th><th>Mandatory</th><th></th></tr></thead><tbody>${D.events.map(e=>`<tr><td style="font-weight:500">${e.title}</td><td><span class="badge" style="${eventCategoryStyle(e.type)}">${e.type}</span></td><td>${formatDate(e.date)}</td><td>${e.mandatory?'<span class="badge br2">Required</span>':'—'}</td><td>${e.mandatory&&!isUpcoming(e.date)?`<button class="btn" style="height:23px;font-size:10.5px" onclick="openMarkAttEv('${e.id}')"><i class="ti ti-checkbox"></i>Mark</button>`:'—'}</td></tr>`).join('')}</tbody>`;
  attRenderAnalytics();
  updateBadges();
}

// ── TAB SWITCHER ──
function attTab(btn,tabId){
  document.querySelectorAll('.att-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  ['att-analytics','att-members','att-events'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=id===tabId?'':'none';
  });
  if(tabId==='att-analytics')attRenderAnalytics();
}

// ── ANALYTICS RENDER ORCHESTRATOR ──
function attRenderAnalytics(){
  attDrawTrend();
  attDrawDonut();
  attDrawEventBars();
  attDrawClassYear();
  attDrawRiskGrid();
}

// ── TREND LINE CHART ──
function attDrawTrend(){
  const svg=document.getElementById('att-line');
  const tooltip=document.getElementById('att-line-tooltip');
  const xaxis=document.getElementById('att-line-xaxis');
  const lbl=document.getElementById('att-trend-lbl');
  if(!svg)return;

  const tot=D.members.length||1;
  const mandPast=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
  if(lbl)lbl.textContent=mandPast.length+' mandatory events';

  if(mandPast.length<2){
    svg.innerHTML=`<text x="50%" y="75" text-anchor="middle" fill="#6B7280" font-family="Satoshi,system-ui,sans-serif" font-size="12">Mark attendance for mandatory events to see the trend.</text>`;
    if(xaxis)xaxis.innerHTML='';return;
  }

  const pts=mandPast.slice(-12).map(ev=>{
    const att=D.attendance[ev.id]||{};
    const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;
    return{label:monthShort(ev.date)+' '+dayOfMonth(ev.date),val:Math.round(pres/tot*100),title:ev.title};
  });

  const W=svg.parentElement?svg.parentElement.clientWidth||520:520;
  svg.setAttribute('viewBox',`0 0 ${W} 140`);
  const H=140,PAD={t:12,r:20,b:8,l:34};
  const CW=W-PAD.l-PAD.r,CH=H-PAD.t-PAD.b;
  const vals=pts.map(p=>p.val);
  const minV=Math.max(0,Math.min(...vals)-15),maxV=Math.min(100,Math.max(...vals)+15);
  const xS=i=>PAD.l+i*(CW/(pts.length-1));
  const yS=v=>PAD.t+CH-(v-minV)/(maxV-minV||1)*CH;

  let html='';
  // Grid lines
  [0,25,50,75,100].forEach(g=>{
    if(g<minV-5||g>maxV+5)return;
    const y=yS(g);
    html+=`<line x1="${PAD.l}" y1="${y}" x2="${PAD.l+CW}" y2="${y}" stroke="#e5e5e3" stroke-width="1"/>`;
    html+=`<text x="${PAD.l-5}" y="${y+4}" text-anchor="end" fill="#6B7280" font-size="9" font-family="Satoshi,system-ui,sans-serif">${g}%</text>`;
  });
  // 85% target
  if(85>=minV&&85<=maxV){
    const y=yS(85);
    html+=`<line x1="${PAD.l}" y1="${y}" x2="${PAD.l+CW}" y2="${y}" stroke="#e24b4a" stroke-width="1.5" stroke-dasharray="5 4" opacity=".5"/>`;
    html+=`<text x="${PAD.l+CW+4}" y="${y+3.5}" fill="#e24b4a" font-size="8.5" font-family="Satoshi,system-ui,sans-serif" opacity=".8">85%</text>`;
  }
  // Area fill
  const areaPath=pts.map((p,i)=>(i===0?`M${xS(i)},${yS(p.val)}`:`L${xS(i)},${yS(p.val)}`)).join(' ')+` L${xS(pts.length-1)},${PAD.t+CH} L${xS(0)},${PAD.t+CH} Z`;
  html+=`<path d="${areaPath}" fill="var(--navy)" opacity=".06"/>`;
  // Line
  const linePath=pts.map((p,i)=>(i===0?`M${xS(i)},${yS(p.val)}`:`L${xS(i)},${yS(p.val)}`)).join(' ');
  html+=`<path d="${linePath}" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  // Dots
  pts.forEach((p,i)=>{
    const cx=xS(i),cy=yS(p.val);
    const col=p.val<75?'var(--rd)':p.val<85?'var(--am)':'var(--gn)';
    html+=`<circle class="an-line-dot" cx="${cx}" cy="${cy}" r="4" fill="${col}" stroke="#fff" stroke-width="1.5"
      onmouseenter="attLineTooltip(event,${cx},${cy},'${p.label}: ${p.val}%')"
      onmouseleave="document.getElementById('att-line-tooltip').style.display='none'"/>`;
  });

  svg.innerHTML=html;
  if(xaxis){
    const step=Math.ceil(pts.length/6);
    const shown=pts.filter((_,i)=>i%step===0||i===pts.length-1);
    const positions=pts.map((_,i)=>i).filter(i=>i%step===0||i===pts.length-1);
    xaxis.innerHTML=`<div style="display:flex;justify-content:space-between;width:100%;">`+
      positions.map(i=>`<span style="font-size:9px;color:var(--ht);flex:1;text-align:center">${pts[i].label}</span>`).join('')+`</div>`;
  }
}

function attLineTooltip(e,cx,cy,text){
  const t=document.getElementById('att-line-tooltip');
  if(!t)return;
  t.textContent=text;t.style.display='block';
  const rect=t.parentElement.getBoundingClientRect();
  t.style.left=(cx-t.offsetWidth/2)+'px';
  t.style.top=(cy-32)+'px';
}

// ── DONUT DISTRIBUTION ──
function attDrawDonut(){
  const svg=document.getElementById('att-donut');
  const pctEl=document.getElementById('att-donut-pct');
  const legend=document.getElementById('att-donut-legend');
  if(!svg)return;

  const tiers=[
    {label:'Good (85%+)',min:85,c:'#1d9e75'},
    {label:'On Track (75–85%)',min:75,c:'#378add'},
    {label:'At Risk (65–75%)',min:65,c:'#ef9f27'},
    {label:'Warning (<65%)',min:0,c:'#e24b4a'},
  ];
  const counts=tiers.map(t=>({...t,n:D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=t.min&&(t.min===0||true)&&r< (tiers[tiers.indexOf(t)-1]?.min||101)}).length}));
  // Recompute cleanly
  const good=D.members.filter(m=>getAttendanceRate(m.id)>=85).length;
  const onT=D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=75&&r<85;}).length;
  const risk=D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=65&&r<75;}).length;
  const warn=D.members.filter(m=>getAttendanceRate(m.id)<65).length;
  const segs=[
    {label:'Good (85%+)',n:good,c:'#1d9e75'},
    {label:'On Track (75–84%)',n:onT,c:'#378add'},
    {label:'At Risk (65–74%)',n:risk,c:'#ef9f27'},
    {label:'Warning (<65%)',n:warn,c:'#e24b4a'},
  ].filter(s=>s.n>0);

  const tot=D.members.length||1;
  if(pctEl)pctEl.textContent=good+onT>0?Math.round((good+onT)/tot*100)+'%':'—';

  const R=42,CX=55,CY=55,CIRC=2*Math.PI*R,SW=16;
  let offset=0;
  let paths=segs.length===0?`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f0f0ee" stroke-width="${SW}"/>`:'';
  segs.forEach(s=>{
    const dash=(s.n/tot)*CIRC;
    const off=CIRC-(offset/tot*CIRC);
    paths+=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${s.c}" stroke-width="${SW}"
      stroke-dasharray="${dash} ${CIRC}" stroke-dashoffset="${off}"
      style="transform:rotate(-90deg);transform-origin:${CX}px ${CY}px;transition:stroke-dashoffset .7s ease"/>`;
    offset+=s.n;
  });
  svg.innerHTML=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f5f5f3" stroke-width="${SW}"/>${paths}`;

  if(legend){
    legend.innerHTML=[{label:'Good (85%+)',n:good,c:'#1d9e75'},{label:'On Track (75–84%)',n:onT,c:'#378add'},{label:'At Risk (65–74%)',n:risk,c:'#ef9f27'},{label:'Warning (<65%)',n:warn,c:'#e24b4a'}]
      .map(s=>`<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
        <div style="width:9px;height:9px;border-radius:50%;background:${s.c};flex-shrink:0"></div>
        <span style="font-size:10.5px;color:var(--mt);flex:1">${s.label}</span>
        <span style="font-size:11px;font-weight:600">${s.n}</span>
      </div>`).join('');
  }
}

// ── EVENT BARS ──
function attDrawEventBars(){
  const el=document.getElementById('att-events-chart');if(!el)return;
  const tot=D.members.length||1;
  const mandPast=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  if(!mandPast.length){
    el.innerHTML=`<div style="padding:24px;text-align:center;color:var(--ht);font-size:12px">No past mandatory events yet.</div>`;return;
  }
  el.innerHTML=mandPast.map(ev=>{
    const att=D.attendance[ev.id]||{};
    const pres=Object.values(att).filter(v=>v==='present'||v==='excused').length;
    const pct=Math.round(pres/tot*100);
    const col=pct>=85?'#1d9e75':pct>=75?'#378add':pct>=65?'#ef9f27':'#e24b4a';
    return`<div class="att-ev-bar">
      <span class="att-ev-label" title="${ev.title} · ${formatDate(ev.date)}">${ev.title}</span>
      <div class="att-ev-track"><div class="att-ev-fill" style="width:0%;background:${col}" data-w="${pct}"></div></div>
      <span class="att-ev-pct" style="color:${col}">${pct}%</span>
    </div>`;
  }).join('');
  setTimeout(()=>el.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';}),80);
}

// ── CLASS YEAR BREAKDOWN ──
function attDrawClassYear(){
  const el=document.getElementById('att-class-chart');if(!el)return;
  const years=[...new Set(D.members.map(m=>m.classYear))].sort();
  if(!years.length){el.innerHTML=`<div style="color:var(--ht);font-size:12px;padding:8px 0;text-align:center">No members yet.</div>`;return;}
  el.innerHTML=years.map(yr=>{
    const mems=D.members.filter(m=>m.classYear===yr);
    const avg=mems.length?Math.round(mems.reduce((s,m)=>s+getAttendanceRate(m.id),0)/mems.length):0;
    const col=avg>=85?'var(--gn)':avg>=75?'var(--navy)':avg>=65?'var(--am)':'var(--rd)';
    return`<div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <span style="font-size:12px;font-weight:500">${yr}</span>
        <span style="font-size:11px;color:var(--mt)">${mems.length} member${mems.length!==1?'s':''}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:8px;background:#f0f0ee;border-radius:99px;overflow:hidden">
          <div style="height:100%;border-radius:99px;background:${col};width:0%;transition:width .65s ease" data-w="${avg}"></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${col};width:32px;text-align:right">${avg}%</span>
      </div>
    </div>`;
  }).join('');
  setTimeout(()=>el.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';}),80);
}

// ── RISK STRATIFICATION GRID ──
function attDrawRiskGrid(){
  const el=document.getElementById('att-risk-grid');
  const sumEl=document.getElementById('att-risk-summary');
  if(!el)return;

  const tiers=[
    {label:'Critical',sub:'Below 65%',min:0,max:65,border:'var(--rd)',lc:'var(--rd-tx)',bg:'var(--rd-bg)'},
    {label:'At Risk',sub:'65% – 75%',min:65,max:75,border:'var(--am)',lc:'var(--am-tx)',bg:'var(--am-bg)'},
    {label:'Watch',sub:'75% – 85%',min:75,max:85,border:'var(--bl)',lc:'var(--bl-tx)',bg:'var(--bl-bg)'},
  ];

  const riskCount=D.members.filter(m=>getAttendanceRate(m.id)<85).length;
  if(sumEl)sumEl.textContent=riskCount>0?`${riskCount} member${riskCount>1?'s':''} below 85% target`:'All members above 85%';

  const tierCards=tiers.map(t=>{
    const mems=D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=t.min&&r<t.max;}).sort((a,b)=>getAttendanceRate(a.id)-getAttendanceRate(b.id));
    return`<div class="att-risk-tier" style="border-color:${t.border}22">
      <div class="att-risk-tier-hd">
        <span class="att-risk-tier-lbl" style="color:${t.lc}">${t.label}</span>
        <span style="font-size:10px;color:var(--mt)">${t.sub}</span>
        <span class="badge" style="background:${t.bg};color:${t.lc};font-size:10px">${mems.length}</span>
      </div>
      ${mems.length?mems.slice(0,8).map(m=>{const r=getAttendanceRate(m.id);const trend=getAttendanceTrend(m.id);const tA=trend==='improving'?'↑':trend==='declining'?'↓':'→';const tC=trend==='improving'?'var(--gn)':trend==='declining'?'var(--rd)':'var(--ht)';return`<div class="att-risk-member">
        <div class="sh-av" style="width:22px;height:22px;font-size:7.5px;background:${t.bg};color:${t.lc};flex-shrink:0">${m.initials}</div>
        <div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div><div style="font-size:10px;color:var(--ht)">${m.classYear}</div></div>
        <div style="display:flex;align-items:center;gap:3px"><span style="font-size:11px;font-weight:700;color:${t.lc}">${r}%</span><span style="font-size:10px;font-weight:700;color:${tC}" title="${trend}">${tA}</span></div>
      </div>`;}).join('')+(mems.length>8?`<div style="font-size:10.5px;color:var(--mt);text-align:center;padding:5px 0;cursor:pointer" onclick="attTab(document.querySelector('.att-tab:nth-child(2)'),\\'att-members\\')">+${mems.length-8} more →</div>`:'')
      :`<div style="padding:14px 0;text-align:center;color:var(--ht);font-size:11.5px">None in this tier</div>`}
    </div>`;
  }).join('');

  const trendingDown=D.members.filter(m=>{const r=getAttendanceRate(m.id);return r>=75&&r<85&&getAttendanceTrend(m.id)==='declining';}).sort((a,b)=>getAttendanceRate(a.id)-getAttendanceRate(b.id));
  const trendPanel=`<div style="grid-column:1/-1;border:1px solid #f0c87a44;border-radius:10px;background:var(--am-bg);padding:12px 14px">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:${trendingDown.length?'8':'0'}px">
      <i class="ti ti-trending-down" style="font-size:13px;color:var(--am-tx)"></i>
      <span style="font-size:12px;font-weight:600;color:var(--am-tx)">Trending to Warning</span>
      <span style="font-size:10px;color:var(--mt);margin-left:4px">Currently 75–85% but declining</span>
      <span class="badge" style="background:#f0c87a44;color:var(--am-tx);font-size:10px;margin-left:auto">${trendingDown.length}</span>
    </div>
    ${trendingDown.length===0?`<div style="font-size:11px;color:var(--ht);padding:2px 0"><i class="ti ti-circle-check" style="color:var(--gn);margin-right:5px"></i>No members trending toward the warning threshold</div>`:trendingDown.map(m=>{const r=getAttendanceRate(m.id);return`<div class="att-risk-member">
      <div class="sh-av" style="width:22px;height:22px;font-size:7.5px;background:#f0c87a44;color:var(--am-tx);flex-shrink:0">${m.initials}</div>
      <div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div><div style="font-size:10px;color:var(--ht)">${m.classYear}</div></div>
      <div style="display:flex;align-items:center;gap:3px"><span style="font-size:11px;font-weight:700;color:var(--am-tx)">${r}%</span><span style="font-size:10px;font-weight:700;color:var(--rd)">↓</span></div>
    </div>`;}).join('')}
  </div>`;

  el.innerHTML=tierCards+trendPanel;
}

// ── CALENDAR STATE ──
