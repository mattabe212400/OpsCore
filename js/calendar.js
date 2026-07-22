/* OpsCore 2.0 Demo — Calendar */
let CAL_YEAR=new Date().getFullYear(), CAL_MONTH=new Date().getMonth();
let CAL_FILTER='all';

// Multi-day events (e.g. a 2-day Formal) stay ONE event record with date/endDate — this expands
// that range into each "YYYY-MM-DD" day it spans, inclusive, so the calendar grid and day-detail
// panel can show the same event on every day it covers instead of requiring a separate event
// record per day.
function evDateRangeDays(start,end){
  const days=[];
  let cur=new Date(start+'T12:00:00');
  const last=new Date((end||start)+'T12:00:00');
  while(cur<=last){
    days.push(cur.getFullYear()+'-'+String(cur.getMonth()+1).padStart(2,'0')+'-'+String(cur.getDate()).padStart(2,'0'));
    cur=new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()+1);
  }
  return days;
}
function evSpansDate(e,dateStr){
  if(!e.date)return false;
  return dateStr>=e.date&&dateStr<=(e.endDate||e.date);
}

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
  const types=['all','chapter','exec','committee','recruitment','philanthropy','service','brotherhood','social','mandatory'];
  const typeLabels={all:'All',chapter:'Chapter',exec:'Exec Event',committee:'Committee Meeting',recruitment:'Recruitment',philanthropy:'Philanthropy',service:'Service',brotherhood:'Brotherhood',social:'Social',mandatory:'Mandatory'};
  document.getElementById('cal-filt').innerHTML=types.map(t=>`<button class="btn${CAL_FILTER===t?' btn-p':''}" style="height:27px;font-size:11px;flex-shrink:0;white-space:nowrap" onclick="calSetFilter('${t}')">${typeLabels[t]||t}</button>`).join('');

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
  const monthCellDates=new Set(cells.filter(c=>c.date).map(c=>c.date));
  const eventsForMonth=D.events.filter(e=>{
    if(!e.date)return false;
    // A multi-day event only needs to overlap the visible grid, not start inside it — a Fri/Sat
    // Formal starting the last day of the prior month must still show on this month's cells.
    return evDateRangeDays(e.date,e.endDate||e.date).some(d=>monthCellDates.has(d));
  }).filter(e=>CAL_FILTER==='all'||e.type===CAL_FILTER);

  const tasksForMonth=D.tasks.filter(t=>{
    if(!t.dueDate||t.status==='done')return false;
    const d=new Date(t.dueDate+'T12:00:00');
    return d.getFullYear()===CAL_YEAR&&d.getMonth()===CAL_MONTH;
  });

  // Group by date — a ranged event is registered under every day it spans, not just its start.
  const evByDate={};
  eventsForMonth.forEach(e=>{
    evDateRangeDays(e.date,e.endDate||e.date).forEach(d=>{
      if(!monthCellDates.has(d))return;
      if(!evByDate[d])evByDate[d]=[];
      evByDate[d].push(e);
    });
  });
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
        const rangeTitle=e.endDate&&e.endDate!==e.date?' ('+formatDateShort(e.date)+'–'+formatDateShort(e.endDate)+')':'';
        return`<div class="cal-pip ${e.type||'chapter'}" title="${e.title}${rangeTitle}${e.start?' · '+to12h(e.start):''}">${e.title}</div>`;
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
  const evs=D.events.filter(ev=>evSpansDate(ev,dateStr));
  const tks=D.tasks.filter(t=>t.dueDate===dateStr&&t.status!=='done');
  const detail=document.getElementById('cal-detail');
  const body=document.getElementById('cal-detail-body');
  const title=document.getElementById('cal-detail-title');
  if(!evs.length&&!tks.length){detail.style.display='none';return;}
  const d=new Date(dateStr+'T12:00:00');
  title.textContent=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const pcl={urgent:'br2',high:'br2',medium:'ba2',low:'bm2'};
  body.innerHTML=(evs.length?'<div style="font-size:10px;font-weight:500;color:var(--mt);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Events</div>'+evs.map(ev=>{
    const isRanged=ev.endDate&&ev.endDate!==ev.date;
    const rangeNote=isRanged?' · '+formatDateShort(ev.date)+'–'+formatDateShort(ev.endDate):'';
    return`<div class="ev-row"><div class="ev-dt"><div class="ev-day">${dayOfMonth(dateStr)}</div><div class="ev-mo">${monthShort(dateStr)}</div></div><div style="flex:1"><div style="font-size:12.5px;font-weight:500">${ev.title}</div><div style="font-size:10.5px;color:var(--mt)">${to12h(ev.start)||'TBD'} · ${ev.location||'—'}${rangeNote}</div></div><span class="badge" style="${eventCategoryStyle(ev.type)}">${ev.type}</span>${ev.mandatory?'<span class="badge br2" style="margin-left:4px">Req</span>':''}<div style="display:flex;gap:3px;margin-left:6px;flex-shrink:0"><button class="btn" style="height:22px;font-size:10px;padding:0 6px" onclick="openEditEvent('${ev.id}')"><i class="ti ti-pencil"></i></button><button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="deleteEvent('${ev.id}')"><i class="ti ti-trash"></i></button></div></div>`;
  }).join(''):'')
  +(tks.length?'<div style="font-size:10px;font-weight:500;color:var(--mt);text-transform:uppercase;letter-spacing:.06em;margin:11px 0 7px">Tasks Due</div>'+tks.map(t=>`<div class="tk-row" onclick="openEditTask('${t.id}')"><div class="tc ${t.status==='done'?'done':''}" onclick="event.stopPropagation();toggleTask('${t.id}')">${t.status==='done'?'<i class="ti ti-check" style="font-size:9px"></i>':''}</div><div style="flex:1"><div style="font-size:11.5px">${t.title}</div><div style="font-size:10px;color:var(--ht)">${getMember(t.assignedTo).name}</div></div><span class="badge ${pcl[t.priority]||'bm2'}" style="font-size:9px">${t.priority}</span></div>`).join(''):'');
  detail.style.display='block';
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}


