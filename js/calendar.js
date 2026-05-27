// ══════════════════════════════════════════════
// calendar.js
// Full-month calendar: renders a 7-column grid with event pips and task due-date dots.
// Supports category filters, month navigation, and a day-detail panel on cell click.
// calPrev / calNext / calToday update CAL_MONTH/CAL_YEAR state and re-render.
// ══════════════════════════════════════════════
// ── CALENDAR STATE ──
let CAL_YEAR=new Date().getFullYear(), CAL_MONTH=new Date().getMonth();
let CAL_FILTER='all';

function calPrev(){CAL_MONTH--;if(CAL_MONTH<0){CAL_MONTH=11;CAL_YEAR--;}renderCalendar();}
function calNext(){CAL_MONTH++;if(CAL_MONTH>11){CAL_MONTH=0;CAL_YEAR++;}renderCalendar();}
function calToday(){CAL_YEAR=new Date().getFullYear();CAL_MONTH=new Date().getMonth();renderCalendar();}

function renderCalendar(){
  const now=new Date();
  const firstDay=new Date(CAL_YEAR,CAL_MONTH,1);
  const lastDay=new Date(CAL_YEAR,CAL_MONTH+1,0);
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent=monthNames[CAL_MONTH]+' '+CAL_YEAR;

  // Filter buttons
  const types=['all','chapter','exec','recruitment','philanthropy','team-building','mandatory'];
  document.getElementById('cal-filt').innerHTML=types.map(t=>`<button class="btn${CAL_FILTER===t?' btn-p':''}" style="height:27px;font-size:11px" onclick="calSetFilter('${t}')">${t==='all'?'All':t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('');

  // Build grid
  const startDow=firstDay.getDay(); // 0=Sun
  const totalDays=lastDay.getDate();
  const cells=[];

  // Prev month padding
  const prevLast=new Date(CAL_YEAR,CAL_MONTH,0).getDate();
  for(let i=startDow-1;i>=0;i--){
    cells.push({day:prevLast-i,cur:false,date:null});
  }
  // Current month
  for(let d=1;d<=totalDays;d++){
    const dateStr=`${CAL_YEAR}-${String(CAL_MONTH+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({day:d,cur:true,date:dateStr});
  }
  // Next month padding
  let next=1;
  while(cells.length%7!==0)cells.push({day:next++,cur:false,date:null});

  // Get events and tasks for this month
  const eventsForMonth=D.events.filter(e=>{
    if(!e.date)return false;
    const d=new Date(e.date+'T12:00:00');
    return d.getFullYear()===CAL_YEAR&&d.getMonth()===CAL_MONTH;
  }).filter(e=>CAL_FILTER==='all'||e.type===CAL_FILTER);

  const tasksForMonth=D.tasks.filter(t=>{
    if(!t.dueDate||t.status==='done')return false;
    const d=new Date(t.dueDate+'T12:00:00');
    return d.getFullYear()===CAL_YEAR&&d.getMonth()===CAL_MONTH;
  });

  // Group by date
  const evByDate={};
  eventsForMonth.forEach(e=>{if(!evByDate[e.date])evByDate[e.date]=[];evByDate[e.date].push(e);});
  const tkByDate={};
  tasksForMonth.forEach(t=>{if(!tkByDate[t.dueDate])tkByDate[t.dueDate]=[];tkByDate[t.dueDate].push(t);});

  const todayStr=now.toISOString().split('T')[0];

  document.getElementById('cal-grid').innerHTML=cells.map(cell=>{
    const isToday=cell.date===todayStr;
    const isOther=!cell.cur;
    const evs=cell.date?evByDate[cell.date]||[]:[];
    const tks=cell.date?tkByDate[cell.date]||[]:[];
    const maxShow=3;
    const allItems=[...evs.map(e=>({kind:'ev',e})),...tks.map(t=>({kind:'tk',t}))];
    const shown=allItems.slice(0,maxShow);
    const more=allItems.length-maxShow;
    const pips=shown.map(item=>{
      if(item.kind==='ev'){
        const e=item.e;
        return`<div class="cal-pip ${e.type||'chapter'}" title="${e.title}${e.start?' · '+e.start:''}">${e.title}</div>`;
      } else {
        const t=item.t;
        return`<div class="cal-pip task" title="Task: ${t.title}">${t.title}</div>`;
      }
    }).join('');
    const moreHtml=more>0?`<div class="cal-more" onclick="calShowDay('${cell.date}',event)">+${more} more</div>`:'';
    return`<div class="cal-cell${isOther?' other-month':''}${isToday?' today':''}" onclick="calShowDay('${cell.date||''}',event)">
      <div class="cal-day-num">${cell.day}</div>
      ${pips}${moreHtml}
    </div>`;
  }).join('');
}

function calSetFilter(f){CAL_FILTER=f;renderCalendar();}

function calShowDay(dateStr,e){
  if(!dateStr)return;
  e.stopPropagation();
  const evs=D.events.filter(ev=>ev.date===dateStr);
  const tks=D.tasks.filter(t=>t.dueDate===dateStr&&t.status!=='done');
  const detail=document.getElementById('cal-detail');
  const body=document.getElementById('cal-detail-body');
  const title=document.getElementById('cal-detail-title');
  if(!evs.length&&!tks.length){detail.style.display='none';return;}
  const d=new Date(dateStr+'T12:00:00');
  title.textContent=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const pcl={urgent:'br2',high:'br2',medium:'ba2',low:'bm2'};
  body.innerHTML=(evs.length?'<div style="font-size:10px;font-weight:500;color:var(--mt);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Events</div>'+evs.map(ev=>`<div class="ev-row"><div class="ev-dt"><div class="ev-day">${dom(ev.date)}</div><div class="ev-mo">${mos(ev.date)}</div></div><div style="flex:1"><div style="font-size:12.5px;font-weight:500">${ev.title}</div><div style="font-size:10.5px;color:var(--mt)">${ev.start||'TBD'} · ${ev.location||'—'}</div></div><span class="badge" style="${evCS(ev.type)}">${ev.type}</span>${ev.mandatory?'<span class="badge br2" style="margin-left:4px">Req</span>':''}<div style="display:flex;gap:3px;margin-left:6px;flex-shrink:0"><button class="btn" style="height:22px;font-size:10px;padding:0 6px" onclick="openEditEvent('${ev.id}')"><i class="ti ti-pencil"></i></button><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="deleteEvent('${ev.id}')"><i class="ti ti-trash"></i></button></div></div>`).join(''):'')
  +(tks.length?'<div style="font-size:10px;font-weight:500;color:var(--mt);text-transform:uppercase;letter-spacing:.06em;margin:11px 0 7px">Tasks Due</div>'+tks.map(t=>`<div class="tk-row" onclick="openEditTask('${t.id}')"><div class="tc ${t.status==='done'?'done':''}" onclick="event.stopPropagation();toggleTask('${t.id}')">${t.status==='done'?'<i class="ti ti-check" style="font-size:9px"></i>':''}</div><div style="flex:1"><div style="font-size:11.5px">${t.title}</div><div style="font-size:10px;color:var(--ht)">${mB(t.assignedTo).name}</div></div><span class="badge ${pcl[t.priority]||'bm2'}" style="font-size:9px">${t.priority}</span></div>`).join(''):'');
  detail.style.display='block';
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}


