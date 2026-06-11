/* OpsCore 2.0 Demo — Recruitment CRM */
const RC_STAGES=['New Lead','Contacted','Attended Event','Active Rush','Interviewed','Bid Ready','Bid Extended','Accepted'];
const RC_STAGE_COLORS=['#9eb5d8','#378add','#ef9f27','#1d9e75','#7b5ea7','#e24b4a','#0c1d56','#1d9e75'];
const RC_TAGS=['Athlete','Legacy','Leadership','Good Fit','Needs Follow-up','Academics','Social Fit','Hot Prospect','Greek Life','Community'];
const RC_TAG_CLASSES={Athlete:'athlete',Legacy:'legacy',Leadership:'leader','Hot Prospect':'hot','Good Fit':'active','Needs Follow-up':'dnb'};

let RC_DRAG_ID=null;
let RC_ACTIVE_TAB='rc-overview';

// Recruitment uses real data only — no seeded demo rushees or events

// ── BID SCORE HELPERS ──
function rcScoreBadge(score){
  if(score>=85)return{cls:'hot',label:'Strong Bid'};
  if(score>=70)return{cls:'good',label:'Possible Bid'};
  if(score>=50)return{cls:'mid',label:'Needs Eval'};
  if(score>=30)return{cls:'low',label:'Monitor'};
  return{cls:'dnb',label:'Do Not Bid'};
}
function rcScoreEl(score){const b=rcScoreBadge(score);return`<span class="rc-score ${b.cls}">${score}</span>`;}
function rcStageColor(stage){const i=RC_STAGES.indexOf(stage);return RC_STAGE_COLORS[i]||'#aaa';}
function rcStageBadgeStyle(stage){return`background:${rcStageColor(stage)}22;color:${rcStageColor(stage)};font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:99px`;}

// ── TAB SWITCHER ──
function rcTab(btn,tabId){
  document.querySelectorAll('.rc-tab').forEach(t=>{
    t.style.color='var(--mt)';t.style.borderBottom='none';t.style.marginBottom='0';
  });
  if(btn){btn.style.color='var(--navy)';btn.style.borderBottom='2px solid var(--navy)';btn.style.marginBottom='-2px';}
  document.querySelectorAll('#page-recruitment > div[id^="rc-"]').forEach(d=>{
    if(d.id==='rc-tabs-bar')return; // never hide the tab bar
    d.style.display='none';
  });
  const el=document.getElementById(tabId);if(el)el.style.display='block';
  RC_ACTIVE_TAB=tabId;
  if(tabId==='rc-overview')rcRenderOverview();
  if(tabId==='rc-rushees')rcRenderTable();
  if(tabId==='rc-pipeline')rcRenderKanban();
  if(tabId==='rc-events')rcRenderEvents();
}

// ── MAIN RENDER ──
function renderRecruitment(){
  // Reset to overview tab
  document.querySelectorAll('.rc-tab').forEach((t,i)=>{
    t.style.color=i===0?'var(--navy)':'var(--mt)';
    t.style.borderBottom=i===0?'2px solid var(--navy)':'none';
    t.style.marginBottom=i===0?'-2px':'0';
  });
  document.querySelectorAll('#page-recruitment > div[id^="rc-"]').forEach(d=>{
    if(d.id==='rc-tabs-bar')return;
    d.style.display=d.id==='rc-overview'?'block':'none';
  });
  RC_ACTIVE_TAB='rc-overview';
  rcRenderOverview();
}

// ── OVERVIEW ──
function rcRenderOverview(){
  const rushees=D.recruitment.rushees||[];
  const hot=rushees.filter(r=>r.bidScore>=70).length;
  const bidReady=rushees.filter(r=>['Bid Ready','Bid Extended','Accepted'].includes(r.stage)).length;
  const totalEvAtt=rushees.reduce((s,r)=>s+r.eventsAttended,0);
  const RCG=D.recruitment.goal||{target:20,label:'New Members This Semester'};
  document.getElementById('rc-kpi').innerHTML=
    kpi('Total Rushees',rushees.length,`${rushees.length} of ${RCG.target} goal`,rushees.length>=RCG.target?'up':'neutral')+
    kpi('Hot Prospects',hot,'Score 70+',hot>0?'up':'neutral')+
    kpi('Event Attendances',totalEvAtt,'Across all rushees','neutral')+
    kpi('Bid Ready',bidReady,'Ready to extend',bidReady>0?'up':'neutral');

  rcDrawFunnel(rushees);
  rcDrawConversion(rushees);
  rcDrawAlerts(rushees);
  rcDrawUpcomingEvents();
  rcDrawLeaderboard(rushees);
  rcDrawQuality(rushees);
  rcDrawGoal(rushees, RCG);
}

// ── FUNNEL: horizontal SVG ──
function rcDrawFunnel(rushees){
  const el=document.getElementById('rc-funnel-wrap');
  const totEl=document.getElementById('rc-funnel-total');
  if(!el)return;
  const stageCounts=RC_STAGES.map((s,i)=>({stage:s,count:rushees.filter(r=>r.stage===s).length,col:RC_STAGE_COLORS[i]}));
  if(totEl)totEl.textContent=rushees.length+' total rushees';

  // Build visual funnel as stacked horizontal bars with stage labels
  const total=rushees.length||1;
  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:4px;padding:4px 0">
    ${stageCounts.map((s,i)=>{
      const pct=Math.round(s.count/total*100);
      const prev=i>0?stageCounts[i-1].count:null;
      const convRate=prev&&prev>0?Math.round(s.count/prev*100):null;
      const barW=Math.max(10,Math.round(s.count/total*100));
      return`<div class="rc-hfunnel-row" onclick="rcFilterToStage('${s.stage}')" title="${s.stage}: ${s.count} rushees">
        <div class="rc-hfunnel-label">${s.stage}</div>
        <div class="rc-hfunnel-track">
          <div class="rc-hfunnel-fill" style="width:0%;background:${s.col}" data-w="${barW}">
            <span class="rc-hfunnel-count">${s.count}</span>
          </div>
        </div>
        <div class="rc-hfunnel-meta">
          ${convRate!==null?`<span class="rc-hfunnel-conv" style="color:${convRate>=50?'var(--gn-tx)':convRate>=25?'var(--am-tx)':'var(--rd-tx)'}">↓ ${convRate}%</span>`:'<span style="font-size:9.5px;color:var(--ht)">—</span>'}
          <span class="rc-hfunnel-pct">${pct}%</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
  setTimeout(()=>el.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';}),60);
}

// ── STAGE CONVERSION RATES ──
function rcDrawConversion(rushees){
  const el=document.getElementById('rc-conversion');if(!el)return;
  if(!rushees.length){el.innerHTML=`<div style="color:var(--ht);font-size:12px;padding:14px 0;text-align:center">No rushees yet.</div>`;return;}
  const pairs=[];
  for(let i=0;i<RC_STAGES.length-1;i++){
    const from=rushees.filter(r=>RC_STAGES.indexOf(r.stage)>=i).length;
    const to=rushees.filter(r=>RC_STAGES.indexOf(r.stage)>=i+1).length;
    if(from===0)continue;
    const rate=Math.round(to/from*100);
    pairs.push({from:RC_STAGES[i],to:RC_STAGES[i+1],rate,fromN:from,toN:to});
  }
  el.innerHTML=pairs.map(p=>{
    const col=p.rate>=60?'var(--gn)':p.rate>=35?'var(--am)':'var(--rd)';
    return`<div style="display:flex;align-items:center;gap:7px;padding:3px 0">
      <div style="font-size:10px;color:var(--mt);width:80px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${p.from} → ${p.to}">${p.from} <i class="ti ti-arrow-right" style="font-size:9px"></i></div>
      <div style="flex:1;height:12px;background:#f0f0ee;border-radius:3px;overflow:hidden">
        <div style="height:100%;background:${col};border-radius:3px;width:0%;transition:width .65s ease" data-w="${p.rate}"></div>
      </div>
      <span style="font-size:10.5px;font-weight:700;color:${col};width:28px;text-align:right">${p.rate}%</span>
    </div>`;
  }).join('');
  setTimeout(()=>el.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';}),80);
}

// ── ALERTS ──
function rcDrawAlerts(rushees){
  const alertsEl=document.getElementById('rc-alerts');if(!alertsEl)return;
  const alerts=[];
  const stale=rushees.filter(r=>{if(!r.lastContact)return r.stage!=='New Lead';const days=Math.round((new Date()-new Date(r.lastContact+'T12:00:00'))/(86400000));return days>5&&!['Accepted','Bid Extended'].includes(r.stage);});
  if(stale.length)alerts.push({icon:'ti-clock',bg:'background:var(--am-bg)',ic:'color:var(--am-tx)',title:`${stale.length} not contacted in 5+ days`,body:stale.slice(0,2).map(r=>r.name).join(', ')+(stale.length>2?` +${stale.length-2} more`:'')});
  const br=rushees.filter(r=>r.stage==='Bid Ready');
  if(br.length)alerts.push({icon:'ti-star',bg:'background:var(--gn-bg)',ic:'color:var(--gn-tx)',title:`${br.length} rushee${br.length>1?'s':''} Bid Ready`,body:br.map(r=>r.name).join(', ')});
  const nextEv=(D.recruitment.events||[]).filter(e=>isUp(e.date)).sort((a,b)=>a.date.localeCompare(b.date))[0];
  if(nextEv){const days=Math.round((new Date(nextEv.date+'T12:00:00')-new Date())/86400000);if(days<=2)alerts.push({icon:'ti-calendar-event',bg:'background:var(--bl-bg)',ic:'color:var(--bl-tx)',title:`"${nextEv.name}" ${days===0?'is today':days===1?'is tomorrow':'in '+days+' days'}`,body:nextEv.time+(nextEv.location?' · '+nextEv.location:'')});}
  const newNoContact=rushees.filter(r=>r.stage==='New Lead'&&!r.lastContact);
  if(newNoContact.length)alerts.push({icon:'ti-user-question',bg:'background:var(--rd-bg)',ic:'color:var(--rd-tx)',title:`${newNoContact.length} new lead${newNoContact.length>1?'s':''} never contacted`,body:'Assign recruiters and start conversations'});
  alertsEl.innerHTML=alerts.length?alerts.map(a=>`<div class="d-alert-row"><div class="d-alert-icon" style="${a.bg}"><i class="ti ${a.icon}" style="${a.ic}"></i></div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:500;line-height:1.4">${a.title}</div><div style="font-size:10.5px;color:var(--mt);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.body}</div></div></div>`).join(''):`<div style="padding:16px;text-align:center;color:var(--mt);font-size:11.5px"><i class="ti ti-circle-check" style="color:var(--gn);font-size:18px;display:block;margin:0 auto 5px"></i>No urgent alerts</div>`;
}

// ── UPCOMING EVENTS ──
function rcDrawUpcomingEvents(){
  const upEvEl=document.getElementById('rc-upcoming-events');if(!upEvEl)return;
  const upEv=(D.recruitment.events||[]).filter(e=>isUp(e.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  upEvEl.innerHTML=upEv.length?upEv.map(e=>{const days=Math.max(0,Math.round((new Date(e.date+'T12:00:00')-new Date())/86400000));const cls=days===0?'urgent':days<=3?'soon':'';return`<div class="ev-row"><div class="ev-dt"><div class="ev-day">${dom(e.date)}</div><div class="ev-mo">${mos(e.date)}</div></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</div><div style="font-size:10.5px;color:var(--mt)">${e.time}${e.location?' · '+e.location:''}</div></div><span class="d-countdown ${cls}"><i class="ti ti-clock" style="font-size:9px"></i>${days===0?'Today':days===1?'Tomorrow':days+'d'}</span></div>`;}).join(''):es('ti-calendar-off','blue','No rush events scheduled','Add upcoming rush events.',`<button class="btn" onclick="rcOpenAddEvent()"><i class="ti ti-plus"></i>Add Event</button>`);
}

// ── RECRUITER PERFORMANCE SCORECARDS ──
function rcDrawLeaderboard(rushees){
  const ldrEl=document.getElementById('rc-leaderboard');if(!ldrEl)return;
  const RECRUITERS=D.members.filter(m=>m.role==='Recruitment Chair'||m.role==='Recruitment');
  if(!RECRUITERS.length){
    ldrEl.innerHTML=`<div style="padding:16px;text-align:center;color:var(--ht);font-size:12px">Assign "Recruitment Chair" role to members to track performance here.</div>`;
    return;
  }
  const data=RECRUITERS.map(m=>{
    const assigned=rushees.filter(r=>r.recruiter===m.id).length;
    const active=rushees.filter(r=>r.recruiter===m.id&&!['Accepted','New Lead'].includes(r.stage)).length;
    const bids=rushees.filter(r=>r.recruiter===m.id&&['Bid Ready','Bid Extended','Accepted'].includes(r.stage)).length;
    const convRate=assigned>0?Math.round(bids/assigned*100):0;
    const avgScore=assigned>0?Math.round(rushees.filter(r=>r.recruiter===m.id).reduce((s,r)=>s+(r.bidScore||0),0)/assigned):0;
    return{m,assigned,active,bids,convRate,avgScore};
  }).sort((a,b)=>b.convRate-a.convRate);

  ldrEl.innerHTML=data.map((d,i)=>`
    <div class="rc-scorecard">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
        <div class="sh-av" style="width:30px;height:30px;font-size:10px;background:${i===0?'var(--navy)':'#e8eef7'};color:${i===0?'#fff':'var(--navy)'};">${d.m.initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.m.name}</div>
          <div style="font-size:10px;color:var(--mt)">${d.assigned} assigned · avg score ${d.avgScore}</div>
        </div>
        ${i===0?'<span class="badge bb2" style="font-size:9px">Top</span>':''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="text-align:center;background:#f8f8f7;border-radius:7px;padding:6px 4px">
          <div style="font-size:15px;font-weight:700;color:var(--navy)">${d.assigned}</div>
          <div style="font-size:9px;color:var(--ht);text-transform:uppercase;letter-spacing:.05em">Total</div>
        </div>
        <div style="text-align:center;background:#f8f8f7;border-radius:7px;padding:6px 4px">
          <div style="font-size:15px;font-weight:700;color:var(--gn)">${d.bids}</div>
          <div style="font-size:9px;color:var(--ht);text-transform:uppercase;letter-spacing:.05em">Bid Ready</div>
        </div>
        <div style="text-align:center;background:#f8f8f7;border-radius:7px;padding:6px 4px">
          <div style="font-size:15px;font-weight:700;color:${d.convRate>=40?'var(--gn)':d.convRate>=20?'var(--am)':'var(--rd)'}">${d.convRate}%</div>
          <div style="font-size:9px;color:var(--ht);text-transform:uppercase;letter-spacing:.05em">Conv.</div>
        </div>
      </div>
      <div style="height:5px;background:#f0f0ee;border-radius:99px;overflow:hidden">
        <div style="height:100%;background:${d.convRate>=40?'var(--gn)':d.convRate>=20?'var(--am)':'var(--rd)'};border-radius:99px;width:0%;transition:width .65s ease" data-w="${d.convRate}"></div>
      </div>
    </div>`).join('');
  setTimeout(()=>ldrEl.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';}),80);
}

// ── PROSPECT QUALITY: BID SCORE DISTRIBUTION ──
function rcDrawQuality(rushees){
  const el=document.getElementById('rc-quality');if(!el)return;
  if(!rushees.length){el.innerHTML=`<div style="color:var(--ht);font-size:12px;padding:14px 0;text-align:center">No rushees yet.</div>`;return;}
  const tiers=[
    {label:'Strong Bid',sub:'85+',min:85,c:'#1d9e75'},
    {label:'Possible Bid',sub:'70–84',min:70,c:'#378add'},
    {label:'Needs Eval',sub:'50–69',min:50,c:'#ef9f27'},
    {label:'Monitor',sub:'30–49',min:30,c:'#9b59b6'},
    {label:'Do Not Bid',sub:'<30',min:0,c:'#e24b4a'},
  ];
  const tot=rushees.length;
  const avgScore=Math.round(rushees.reduce((s,r)=>s+(r.bidScore||0),0)/tot);
  el.innerHTML=`<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:11px">
    <span style="font-size:24px;font-weight:700;color:var(--navy)">${avgScore}</span>
    <span style="font-size:11px;color:var(--mt)">avg bid score</span>
  </div>`+tiers.map(t=>{
    const n=rushees.filter(r=>{const s=r.bidScore||0;return s>=t.min&&(t===tiers[tiers.length-1]||s<tiers[tiers.indexOf(t)-1]?.min+100);}).length;
    // Recompute cleanly by building buckets
    return{t,n};
  }).map(({t})=>{
    const maxMin=tiers[tiers.indexOf(t)-1]?.min||101;
    const n=rushees.filter(r=>{const s=r.bidScore||0;return s>=t.min&&s<maxMin;}).length;
    const pct=Math.round(n/tot*100);
    return`<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:11px;font-weight:500">${t.label} <span style="font-size:9.5px;color:var(--ht)">${t.sub}</span></span>
        <span style="font-size:10.5px;font-weight:600;color:${t.c}">${n}</span>
      </div>
      <div style="height:7px;background:#f0f0ee;border-radius:99px;overflow:hidden">
        <div style="height:100%;background:${t.c};border-radius:99px;width:0%;transition:width .6s ease" data-w="${pct}"></div>
      </div>
    </div>`;
  }).join('');
  setTimeout(()=>el.querySelectorAll('[data-w]').forEach(b=>{b.style.width=b.dataset.w+'%';}),80);
}

// ── GOAL PANEL ──
function rcDrawGoal(rushees, RCG){
  const el=document.getElementById('rc-goal-panel');if(!el)return;
  const accepted=rushees.filter(r=>r.stage==='Accepted').length;
  const bidExt=rushees.filter(r=>r.stage==='Bid Extended').length;
  const bidReady=rushees.filter(r=>r.stage==='Bid Ready').length;
  const pct=Math.min(100,Math.round(rushees.length/RCG.target*100));
  const closePct=Math.min(100,Math.round((accepted+bidExt)/RCG.target*100));

  el.innerHTML=`
    <div style="text-align:center;margin-bottom:14px;padding:12px;background:linear-gradient(135deg,var(--navy) 0%,#1a3a8c 100%);border-radius:10px;color:#fff">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.7;margin-bottom:4px">${RCG.label}</div>
      <div style="font-size:32px;font-weight:700;line-height:1">${rushees.length}<span style="font-size:14px;opacity:.6"> / ${RCG.target}</span></div>
      <div style="height:5px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden;margin:8px 0 5px">
        <div style="height:100%;background:#fff;border-radius:99px;width:${pct}%;transition:width .7s ease"></div>
      </div>
      <div style="font-size:10px;opacity:.75">${pct}% of goal · ${Math.max(0,RCG.target-rushees.length)} to go</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${[
        {label:'Accepted',n:accepted,c:'var(--gn)',icon:'ti-check'},
        {label:'Bid Extended',n:bidExt,c:'var(--bl)',icon:'ti-mail'},
        {label:'Bid Ready',n:bidReady,c:'var(--am)',icon:'ti-star'},
      ].map(s=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;background:#f8f8f7;border-radius:7px">
        <div style="width:24px;height:24px;border-radius:6px;background:${s.c}22;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ${s.icon}" style="font-size:11px;color:${s.c}"></i></div>
        <span style="flex:1;font-size:12px;color:var(--tx)">${s.label}</span>
        <span style="font-size:14px;font-weight:700;color:${s.c}">${s.n}</span>
      </div>`).join('')}
    </div>`;
}

// ── RUSHEE TABLE ──
function rcFilterToStage(stage){
  rcTab(document.querySelector('[data-tab="rc-rushees"]'),'rc-rushees');
  setTimeout(()=>{document.getElementById('rc-filter-status').value=stage;rcFilterRushees();},50);
}

function rcRenderTable(){
  const rushees=rcGetFiltered();
  const el=document.getElementById('rc-table');
  if(!el)return;
  el.innerHTML=`<thead><tr><th>Name</th><th>Year</th><th>Major</th><th>Recruiter</th><th>Stage</th><th>Events</th><th>Score</th><th>Last Contact</th><th></th></tr></thead><tbody>${rushees.map(r=>{
    const recName=r.recruiter?mB(r.recruiter).name.split(' ')[0]:'—';
    const daysSince=r.lastContact?Math.round((new Date()-new Date(r.lastContact+'T12:00:00'))/86400000):null;
    const contactColor=daysSince===null?'var(--ht)':daysSince>7?'var(--rd)':daysSince>4?'var(--am)':'var(--gn)';
    return`<tr style="cursor:pointer" onclick="rcOpenProfile('${r.id}')">
      <td><div style="display:flex;align-items:center;gap:7px"><div class="sh-av" style="width:24px;height:24px;font-size:8.5px">${r.initials}</div><span style="font-weight:500">${r.name}</span></div></td>
      <td style="color:var(--mt)">${r.year}</td>
      <td style="color:var(--mt);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.major}</td>
      <td style="color:var(--mt)">${recName}</td>
      <td><span style="${rcStageBadgeStyle(r.stage)}">${r.stage}</span></td>
      <td style="text-align:center">${r.eventsAttended}</td>
      <td>${rcScoreEl(r.bidScore)}</td>
      <td style="color:${contactColor};font-size:11px">${r.lastContact?daysSince+'d ago':'Never'}</td>
      <td style="white-space:nowrap"><button class="btn" style="height:23px;font-size:10px;padding:0 7px;margin-right:3px" onclick="event.stopPropagation();rcOpenProfile('${r.id}')"><i class="ti ti-eye"></i></button><button class="btn btn-d" style="height:23px;font-size:10px;padding:0 7px" onclick="event.stopPropagation();deleteRushee('${r.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" style="text-align:center;padding:22px;color:var(--mt)">No rushees found</td></tr>'}</tbody>`;
}

function rcGetFiltered(){
  const q=(document.getElementById('rc-search')||{value:''}).value.toLowerCase();
  const st=(document.getElementById('rc-filter-status')||{value:''}).value;
  const sort=(document.getElementById('rc-sort')||{value:'score'}).value;
  let rushees=[...(D.recruitment.rushees||[])];
  if(q)rushees=rushees.filter(r=>r.name.toLowerCase().includes(q)||r.major.toLowerCase().includes(q)||r.hometown.toLowerCase().includes(q));
  if(st)rushees=rushees.filter(r=>r.stage===st);
  if(sort==='score')rushees.sort((a,b)=>b.bidScore-a.bidScore);
  else if(sort==='name')rushees.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='last')rushees.sort((a,b)=>(b.lastContact||'').localeCompare(a.lastContact||''));
  else if(sort==='events')rushees.sort((a,b)=>b.eventsAttended-a.eventsAttended);
  return rushees;
}

function rcFilterRushees(){rcRenderTable();}

// ── KANBAN ──
function rcRenderKanban(){
  const KANBAN_STAGES=['New Lead','Contacted','Active Rush','Interviewed','Bid Ready','Bid Extended'];
  const kanban=document.getElementById('rc-kanban');
  if(!kanban)return;
  const stageColors={};
  RC_STAGES.forEach((s,i)=>{stageColors[s]=RC_STAGE_COLORS[i];});
  kanban.innerHTML=KANBAN_STAGES.map(stage=>{
    const rushees=(D.recruitment.rushees||[]).filter(r=>r.stage===stage);
    const col=stageColors[stage]||'#aaa';
    return`<div class="rc-col">
      <div class="rc-col-head" style="border-top-color:${col}">
        <span style="font-size:11.5px;font-weight:500">${stage}</span>
        <span style="font-size:10.5px;color:var(--mt)">${rushees.length}</span>
      </div>
      <div class="rc-col-body rc-col-drop" id="kd-${stage.replace(/ /g,'_')}"
        ondragover="event.preventDefault();this.classList.add('drag-over')"
        ondragleave="this.classList.remove('drag-over')"
        ondrop="rcDrop(event,'${stage}')">
        ${rushees.map(r=>`<div class="rc-card" draggable="true" id="kc-${r.id}"
          ondragstart="rcDragStart('${r.id}')"
          ondragend="document.querySelectorAll('.rc-col-drop').forEach(c=>c.classList.remove('drag-over'))"
          onclick="rcOpenProfile('${r.id}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:5px">
            <div style="display:flex;align-items:center;gap:6px">
              <div class="sh-av" style="width:22px;height:22px;font-size:8px;flex-shrink:0">${r.initials}</div>
              <span style="font-size:12px;font-weight:500;line-height:1.3">${r.name}</span>
            </div>
            ${rcScoreEl(r.bidScore)}
          </div>
          <div style="font-size:10.5px;color:var(--mt);margin-bottom:5px">${r.year} · ${r.major}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-size:10px;color:var(--ht)">${r.eventsAttended} event${r.eventsAttended!==1?'s':''} · ${r.recruiter?mB(r.recruiter).name.split(' ')[0]:'Unassigned'}</div>
            ${r.tags.length?`<span class="rc-tag ${RC_TAG_CLASSES[r.tags[0]]||''}" style="font-size:9px">${r.tags[0]}</span>`:''}
          </div>
        </div>`).join('')||`<div style="padding:14px;text-align:center;font-size:11px;color:var(--ht)">Drop here</div>`}
      </div>
    </div>`;
  }).join('');
}

function rcDragStart(id){RC_DRAG_ID=id;}
function rcDrop(event,stage){
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if(!RC_DRAG_ID)return;
  const r=D.recruitment.rushees.find(x=>x.id===RC_DRAG_ID);
  if(r&&r.stage!==stage){
    r.stage=stage;
    // Recalculate bid score when moving stages
    const baseScores={'New Lead':10,'Contacted':25,'Attended Event':45,'Active Rush':60,'Interviewed':72,'Bid Ready':82,'Bid Extended':88,'Accepted':92};
    if(baseScores[stage])r.bidScore=Math.max(r.bidScore,baseScores[stage]);
    r.lastContact=new Date().toISOString().split('T')[0];
    saveD();rcRenderKanban();
    toast(r.name+' moved to '+stage,'success');
  }
  RC_DRAG_ID=null;
}

// ── RUSH EVENTS ──
function rcRenderEvents(){
  const events=D.recruitment.events||[];
  const total=events.length;
  const upcoming=events.filter(e=>isUp(e.date)).length;
  const past=events.filter(e=>!isUp(e.date)).length;
  document.getElementById('rc-event-kpi').innerHTML=
    kpi('Total Events',total,'This semester','neutral')+
    kpi('Upcoming',upcoming,'Scheduled','neutral')+
    kpi('Completed',past,'Past events','neutral');
  const typeColors={'Open House':'var(--bl)','Brotherhood Event':'var(--gn)','Invite Only':'var(--navy)','Philanthropy':'var(--rd)','Athletics':'var(--am)','Study Event':'var(--mt)','Rush Dinner':'var(--navy)'};
  document.getElementById('rc-events-table').innerHTML=`<thead><tr><th>Event</th><th>Type</th><th>Date</th><th>Time</th><th>Location</th><th>RSVP</th><th>Recruiters</th></tr></thead><tbody>${events.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<tr><td style="font-weight:500">${e.name}</td><td><span class="badge" style="background:${typeColors[e.type]||'#f0f0ee'}22;color:${typeColors[e.type]||'var(--mt)'}">${e.type}</span></td><td>${fd(e.date)}</td><td style="color:var(--mt)">${e.time}</td><td style="color:var(--mt)">${e.location||'—'}</td><td style="text-align:center">${e.rsvp||'—'}</td><td style="color:var(--mt)">${e.recruiters.map(id=>mB(id).name.split(' ')[0]).join(', ')||'—'}</td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:22px;color:var(--mt)">No events yet</td></tr>'}</tbody>`;
}

// ── RUSHEE PROFILE ──
function rcOpenProfile(id){
  const r=D.recruitment.rushees.find(x=>x.id===id);
  if(!r)return;
  const modal=document.getElementById('m-rc-profile');
  document.getElementById('rcp-av').textContent=r.initials;
  document.getElementById('rcp-name').textContent=r.name;
  document.getElementById('rcp-sub').textContent=r.year+' · '+r.major+(r.hometown?' · '+r.hometown:'');
  const sb=document.getElementById('rcp-stage-badge');
  sb.textContent=r.stage;sb.style.cssText=rcStageBadgeStyle(r.stage);
  const scoreEl=document.getElementById('rcp-score-badge');
  const bd=rcScoreBadge(r.bidScore);
  scoreEl.textContent=r.bidScore+' — '+bd.label;scoreEl.className='rc-score '+bd.cls;

  const recName=r.recruiter?mB(r.recruiter).name:'Unassigned';
  const daysSince=r.lastContact?Math.round((new Date()-new Date(r.lastContact+'T12:00:00'))/86400000):null;
  const rcEvents=(D.recruitment.events||[]).filter(e=>!isUp(e.date)).slice(0,r.eventsAttended);

  document.getElementById('rcp-body').innerHTML=`
    <div class="rc-profile-grid" style="margin-bottom:16px">
      <!-- Left: Info + scoring -->
      <div>
        <div class="card-t" style="margin-bottom:8px">Basic Info</div>
        <div class="rc-stat"><span style="color:var(--mt)">Year</span><span style="font-weight:500">${r.year}</span></div>
        <div class="rc-stat"><span style="color:var(--mt)">Major</span><span style="font-weight:500">${r.major}</span></div>
        <div class="rc-stat"><span style="color:var(--mt)">Hometown</span><span style="font-weight:500">${r.hometown||'—'}</span></div>
        <div class="rc-stat"><span style="color:var(--mt)">Interests</span><span style="font-weight:500;font-size:11px">${r.interests||'—'}</span></div>
        <div class="rc-stat"><span style="color:var(--mt)">Recruiter</span><span style="font-weight:500">${recName}</span></div>
        <div class="rc-stat"><span style="color:var(--mt)">Last Contact</span><span style="font-weight:500;color:${daysSince===null?'var(--ht)':daysSince>7?'var(--rd)':'var(--tx)'}">${daysSince===null?'Never':daysSince+'d ago'}</span></div>
        <div style="margin-top:11px"><div class="card-t" style="margin-bottom:7px">Tags</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${(r.tags||[]).map(t=>`<span class="rc-tag ${RC_TAG_CLASSES[t]||''}">${t}</span>`).join('')||'<span style="font-size:11px;color:var(--ht)">No tags</span>'}
            <button class="rc-tag" onclick="rcAddTag('${r.id}')"><i class="ti ti-plus" style="font-size:9px"></i></button>
          </div>
        </div>
      </div>
      <!-- Right: Scoring breakdown -->
      <div>
        <div class="card-t" style="margin-bottom:8px">Bid Score Breakdown</div>
        <div style="text-align:center;margin-bottom:11px">
          <div style="font-size:32px;font-weight:700;color:${rcStageColor(r.stage)}">${r.bidScore}</div>
          <div style="font-size:11px;color:var(--mt)">${rcScoreBadge(r.bidScore).label}</div>
        </div>
        ${[
          {l:'Event Attendance',v:Math.min(100,r.eventsAttended*20)},
          {l:'Engagement',v:Math.min(100,(r.notes||[]).length*25)},
          {l:'Stage Progress',v:Math.round(RC_STAGES.indexOf(r.stage)/RC_STAGES.length*100)},
        ].map(x=>`<div class="pr"><span class="pl" style="width:120px">${x.l}</span><div class="pb"><div class="pf" style="width:${x.v}%;background:${rcStageColor(r.stage)}"></div></div><span class="pv">${x.v}%</span></div>`).join('')}
        <div style="margin-top:13px">
          <select id="rcp-stage-sel" style="width:100%;height:29px;padding:0 9px;border:1px solid var(--bdr);border-radius:7px;font-size:12px;font-family:inherit;background:var(--surf);color:var(--tx);outline:none;margin-bottom:6px" onchange="rcUpdateStage('${r.id}',this.value)">
            ${RC_STAGES.map(s=>`<option value="${s}"${s===r.stage?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <!-- Events attended -->
    <div style="margin-bottom:14px">
      <div class="card-t" style="margin-bottom:8px">Event Attendance (${r.eventsAttended})</div>
      ${rcEvents.length?rcEvents.map(e=>`<div class="d-feed-row"><div class="d-feed-av" style="background:var(--bl-bg);color:var(--bl)"><i class="ti ti-calendar-check" style="font-size:11px"></i></div><div style="flex:1"><div style="font-size:11.5px;font-weight:500">${e.name}</div><div style="font-size:10px;color:var(--ht)">${fd(e.date)} · ${e.type}</div></div></div>`).join(''):`<div style="font-size:11.5px;color:var(--ht)">No events attended yet</div>`}
    </div>
    <!-- Notes -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="card-t">Conversation Notes</div>
        <button class="btn" style="height:24px;font-size:10.5px" onclick="rcAddNote('${r.id}')"><i class="ti ti-plus"></i>Add Note</button>
      </div>
      <div id="rcp-notes">${(r.notes||[]).length?(r.notes||[]).slice().reverse().map(n=>`<div class="rc-note" style="margin-bottom:7px"><div class="rc-note-meta"><span>${mB(n.by).name}</span><span>${fds(n.date)}</span></div>${n.text}</div>`).join(''):`<div style="font-size:11.5px;color:var(--ht)">No notes yet — add your first observation.</div>`}
      </div>
    </div>`;

  modal.classList.add('open');
}

function rcUpdateStage(id,stage){
  const r=D.recruitment.rushees.find(x=>x.id===id);
  if(!r)return;
  r.stage=stage;r.lastContact=new Date().toISOString().split('T')[0];
  saveD();
  // Update badge in modal header
  const sb=document.getElementById('rcp-stage-badge');
  if(sb){sb.textContent=stage;sb.style.cssText=rcStageBadgeStyle(stage);}
  toast(r.name+' stage updated to '+stage,'success');
  if(RC_ACTIVE_TAB==='rc-rushees')rcRenderTable();
  if(RC_ACTIVE_TAB==='rc-pipeline')rcRenderKanban();
}

function rcAddNote(rusheeId){
  const text=prompt('Add note for this rushee:');
  if(!text||!text.trim())return;
  const r=D.recruitment.rushees.find(x=>x.id===rusheeId);
  if(!r)return;
  if(!r.notes)r.notes=[];
  r.notes.push({text:text.trim(),by:CURRENT_USER?CURRENT_USER.mid:null,date:new Date().toISOString().split('T')[0]});
  r.lastContact=new Date().toISOString().split('T')[0];
  saveD();rcOpenProfile(rusheeId);toast('Note added','success');
}

function rcAddTag(rusheeId){
  const r=D.recruitment.rushees.find(x=>x.id===rusheeId);
  if(!r)return;
  const available=RC_TAGS.filter(t=>!(r.tags||[]).includes(t));
  if(!available.length){toast('All tags already added','info');return;}
  const tag=prompt('Add tag:\n'+available.join(', '));
  if(!tag||!available.includes(tag)){toast('Invalid tag','error');return;}
  if(!r.tags)r.tags=[];
  r.tags.push(tag);saveD();rcOpenProfile(rusheeId);
}

// ── ADD RUSHEE ──
function rcOpenAdd(){
  const sel=document.getElementById('rca-rec');
  // Only Recruitment Chairs are recruiters
  const recruiters=D.members.filter(m=>m.role==='Recruitment Chair'||m.role==='President'||m.role==='Vice President');
  sel.innerHTML='<option value="">Unassigned</option>'+recruiters.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  const tagsEl=document.getElementById('rca-tags');
  tagsEl.innerHTML=RC_TAGS.map(t=>`<span class="rc-tag" onclick="this.classList.toggle('active')" data-tag="${t}">${t}</span>`).join('');
  ['rca-name','rca-major','rca-home','rca-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-rc-add').classList.add('open');
}

function rcAddRushee(){
  if(!canWrite()){toast('You do not have permission to add rushees.','error');return;}
  const name=document.getElementById('rca-name').value.trim();
  if(!name){toast('Name is required','error');return;}
  const tags=[...document.getElementById('rca-tags').querySelectorAll('.rc-tag.active')].map(t=>t.dataset.tag);
  const ini=name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const stage=document.getElementById('rca-stage').value;
  const scoreMap={'New Lead':10,'Contacted':25,'Attended Event':45,'Active Rush':60,'Interviewed':72,'Bid Ready':82,'Bid Extended':88,'Accepted':92};
  D.recruitment.rushees.push({id:'r'+uid(),name,firstName:name.split(' ')[0],lastName:name.split(' ').slice(1).join(' '),initials:ini,year:document.getElementById('rca-year').value,major:document.getElementById('rca-major').value,hometown:document.getElementById('rca-home').value,stage,recruiter:document.getElementById('rca-rec').value,eventsAttended:0,bidScore:scoreMap[stage]||10,lastContact:'',notes:document.getElementById('rca-notes').value.trim()?[{text:document.getElementById('rca-notes').value.trim(),by:CURRENT_USER?CURRENT_USER.mid:null,date:new Date().toISOString().split('T')[0]}]:[],tags,interests:''});
  saveD();closeM(null,document.getElementById('m-rc-add'));
  if(RC_ACTIVE_TAB==='rc-rushees')rcRenderTable();
  else if(RC_ACTIVE_TAB==='rc-pipeline')rcRenderKanban();
  else rcRenderOverview();
  toast(name+' added to recruitment pipeline','success');
}

// ── ADD RUSH EVENT ──
function rcOpenAddEvent(){
  const dateEl=document.getElementById('rce-date');if(dateEl)dateEl.value=new Date().toISOString().split('T')[0];
  ['rce-name','rce-time','rce-loc','rce-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-rc-event').classList.add('open');
}

function rcAddEvent(){
  if(!canWrite()){toast('You do not have permission to add rush events.','error');return;}
  const name=document.getElementById('rce-name').value.trim();
  if(!name){toast('Event name is required','error');return;}
  D.recruitment.events.push({id:'re'+uid(),name,type:document.getElementById('rce-type').value,date:document.getElementById('rce-date').value,time:document.getElementById('rce-time').value,location:document.getElementById('rce-loc').value,rsvp:parseInt(document.getElementById('rce-rsvp').value)||0,notes:document.getElementById('rce-notes').value,recruiters:[CURRENT_USER?CURRENT_USER.mid:null],attendees:[]});
  saveD();closeM(null,document.getElementById('m-rc-event'));
  if(RC_ACTIVE_TAB==='rc-events')rcRenderEvents();
  else rcRenderOverview();
  toast('Rush event added','success');
}

// ═══════════════════════════════════════════
// FINANCE & DUES MANAGEMENT
// ═══════════════════════════════════════════

