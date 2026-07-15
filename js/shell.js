/* OpsCore 2.0 — Global Shell: sidebar collapse, user popover, quick create,
   notifications, and the command-palette open/close wiring.
   Search filtering itself lives in search.js — untouched. */

// ── SIDEBAR COLLAPSE ──
function sbCollapseToggle(){
  document.getElementById('app-nav').classList.toggle('collapsed');
}

// ── SIDEBAR USER POPOVER ──
function sbPopoverToggle(e){
  if(e)e.stopPropagation();
  const pop=document.getElementById('sb-popover');
  const opening=!pop.classList.contains('open');
  closeAllShellDropdowns();
  if(opening){
    document.getElementById('pop-u-name').textContent=document.getElementById('u-name').textContent;
    pop.classList.add('open');
  }
}
function sbPopoverClose(){
  document.getElementById('sb-popover')?.classList.remove('open');
}

// ── QUICK CREATE ──
function tbQuickCreateToggle(e){
  if(e)e.stopPropagation();
  const dd=document.getElementById('qc-dd');
  const opening=!dd.classList.contains('open');
  closeAllShellDropdowns();
  if(opening){ renderQuickCreateMenu(); dd.classList.add('open'); }
}
function renderQuickCreateMenu(){
  const items=[];
  if(typeof canEditMembers==='function'&&canEditMembers()&&canAccess('members'))
    items.push({icon:'ti-user-plus',label:'Add member',action:"openM('m-addmember')"});
  if(canWrite()&&canAccess('tasks'))
    items.push({icon:'ti-checkbox',label:'New task',action:"openM('m-addtask')"});
  if(canWrite()&&canAccess('calendar'))
    items.push({icon:'ti-calendar-plus',label:'New event',action:"openM('m-addevent')"});
  if(canWrite()&&canAccess('judicial')&&typeof jbCanAccess==='function'&&jbCanAccess())
    items.push({icon:'ti-scale',label:'New judicial case',action:"openM('m-addcase')"});
  if(canAccess('reports'))
    items.push({icon:'ti-file-analytics',label:'Build a report',action:"rbacNav('reports',null)"});

  const dd=document.getElementById('qc-dd');
  if(!items.length){
    dd.innerHTML='<div class="notif-empty"><i class="ti ti-lock"></i>No quick actions available for your role</div>';
    return;
  }
  dd.innerHTML=items.map(it=>
    `<div class="tb-dd-item" onclick="tbQuickCreateToggle();${it.action}"><i class="ti ${it.icon}"></i>${it.label}</div>`
  ).join('');
}

// ── NOTIFICATIONS ──
function tbNotifToggle(e){
  if(e)e.stopPropagation();
  const dd=document.getElementById('notif-dd');
  const opening=!dd.classList.contains('open');
  closeAllShellDropdowns();
  if(opening){ renderNotifDropdown(); dd.classList.add('open'); }
}
function renderNotifDropdown(){
  const list=document.getElementById('notif-list');
  if(!list||typeof D==='undefined'||!D.members){ if(list)list.innerHTML=''; return; }
  const tot=D.members.length||1;
  const avg=Math.round(D.members.reduce((s,m)=>s+getAttendanceRate(m.id),0)/tot);
  const alerts=typeof computeChapterAlerts==='function'?computeChapterAlerts(avg):[];
  if(!alerts.length){
    list.innerHTML='<div class="notif-empty"><i class="ti ti-circle-check"></i>All clear — no active alerts</div>';
  } else {
    list.innerHTML=alerts.map(a=>
      `<div class="ni-item"><div class="ni-dot"></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;line-height:1.4">${a.title}</div><div style="font-size:10.5px;color:var(--mt);margin-top:2px">${a.body}</div></div></div>`
    ).join('');
  }
  updateNotifBellDot(alerts.length);
}
function updateNotifBellDot(count){
  document.getElementById('tb-bell-dot')?.classList.toggle('active', count>0);
}

// ── COMMAND PALETTE (search filtering logic lives in search.js, untouched) ──
function cmdkOpen(){
  document.getElementById('cmdk-overlay').classList.add('open');
  renderCmdkQuickAccess();
  const inp=document.getElementById('gs-input');
  if(inp){ inp.focus(); inp.select(); }
}
function cmdkClose(){
  document.getElementById('cmdk-overlay').classList.remove('open');
}

// ── COMMAND PALETTE: quick access (recent searches, recently viewed, quick actions) ──
// Session-only in-memory state — not persisted, not part of D{}.
let _gsRecentSearches=[];
let _gsRecentMembers=[];

function gsTrackRecentSearch(q){
  if(!q) return;
  _gsRecentSearches=[q,..._gsRecentSearches.filter(s=>s.toLowerCase()!==q.toLowerCase())].slice(0,5);
}
function gsTrackRecentMember(id,name){
  if(!id) return;
  _gsRecentMembers=[{id,name},..._gsRecentMembers.filter(m=>m.id!==id)].slice(0,4);
}
function gsJumpToMember(id){
  cmdkClose();
  rbacNav('members',null);
  setTimeout(()=>{ if(typeof openEditMember==='function') openEditMember(id); },150);
}
function gsRerun(q){
  const inp=document.getElementById('gs-input');
  if(!inp) return;
  inp.value=q;
  gsOnInput();
  inp.focus();
}

function cmdkQuickActionItems(){
  const items=[];
  if(typeof canEditMembers==='function'&&canEditMembers()&&canAccess('members'))
    items.push({icon:'ti-user-plus',label:'Add member',action:"cmdkClose();openM('m-addmember')"});
  if(canWrite()&&canAccess('tasks'))
    items.push({icon:'ti-checkbox',label:'Create task',action:"cmdkClose();openM('m-addtask')"});
  if(canWrite()&&canAccess('calendar'))
    items.push({icon:'ti-calendar-plus',label:'Add event',action:"cmdkClose();openM('m-addevent')"});
  if(canAccess('members'))
    items.push({icon:'ti-address-book',label:'View member directory',action:"cmdkClose();rbacNav('members',null)"});
  return items;
}

function renderCmdkQuickAccess(){
  const box=document.getElementById('cmdk-quick');
  if(!box||typeof CURRENT_USER==='undefined'||!CURRENT_USER) return;

  const hasRecentSearches=_gsRecentSearches.length>0;
  const hasRecentMembers=_gsRecentMembers.length>0;
  const actionItems=cmdkQuickActionItems();

  let html='';
  if(!hasRecentSearches&&!hasRecentMembers){
    html+=`<div class="cmdk-empty-lg">
      <div class="cmdk-empty-lg-ic"><i class="ti ti-search"></i></div>
      <div class="cmdk-empty-lg-title">Search Across OpsCore</div>
      <div class="cmdk-empty-lg-sub">Find members, attendance records, tasks, events, files, finances, recruitment data, and more.</div>
      <div class="cmdk-empty-lg-hint">Start typing to begin</div>
    </div>`;
  }
  if(hasRecentMembers){
    html+=`<div class="cmdk-qsec"><div class="cmdk-qsec-lbl">Recently Viewed</div><div class="cmdk-chip-row">${
      _gsRecentMembers.map(m=>`<div class="cmdk-chip" onclick="gsJumpToMember('${m.id}')"><i class="ti ti-user-circle"></i>${m.name}</div>`).join('')
    }</div></div>`;
  }
  if(hasRecentSearches){
    html+=`<div class="cmdk-qsec"><div class="cmdk-qsec-lbl">Recent Searches</div><div class="cmdk-chip-row">${
      _gsRecentSearches.map(s=>`<div class="cmdk-chip" onclick="gsRerun('${s.replace(/'/g,"\\'")}')"><i class="ti ti-clock"></i>${s}</div>`).join('')
    }</div></div>`;
  }
  if(actionItems.length){
    html+=`<div class="cmdk-qsec"><div class="cmdk-qsec-lbl">Quick Actions</div><div class="cmdk-actions-list">${
      actionItems.map(it=>`<div class="cmdk-action-item" onclick="${it.action}"><i class="ti ${it.icon}"></i>${it.label}</div>`).join('')
    }</div></div>`;
  }
  box.innerHTML=html;
}

// ── SHARED: close all shell dropdowns/popovers ──
function closeAllShellDropdowns(){
  document.getElementById('sb-popover')?.classList.remove('open');
  document.getElementById('qc-dd')?.classList.remove('open');
  document.getElementById('notif-dd')?.classList.remove('open');
}
document.addEventListener('click', e=>{
  if(!e.target.closest('.tb-dd-wrap')) closeAllShellDropdowns();
});
