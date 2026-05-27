// ══════════════════════════════════════════════
// utils.js
// Shared utility functions used throughout the app:
//   - toast()          — bottom-right notification toasts
//   - confirmDialog()  — async modal confirm/delete dialog
//   - btnGuard()       — prevents double-submit on async buttons
//   - canWrite()       — RBAC write permission check
//   - nav()            — page navigation with skeleton loading states
//   - openM/closeM     — modal open/close helpers
//   - uid()            — unique ID generator
//   - fd/fds/dom/mos   — date formatting helpers
//   - isOv/isUp        — date comparison helpers
//   - aR()             — attendance rate calculator
//   - mB()             — member lookup by ID
//   - mOpts()          — member <select> option HTML builder
//   - evCS()           — event category badge style string
//   - pgc()            — progress color by percentage
//   - sbOpen/sbClose/sbToggle — responsive sidebar controls
// ══════════════════════════════════════════════
// ── TOAST ──
function toast(msg,type='info',duration=3000){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');
  t.className='toast '+type;t.textContent=msg;c.appendChild(t);
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{t.classList.add('show');});});
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),250);},duration);
}

// ── CONFIRM DIALOG ──
let _confirmResolve = null;
function confirmDialog(title, msg, okLabel = 'Delete', danger = true) {
  return new Promise(res => {
    _confirmResolve = res;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    const ok = document.getElementById('confirm-ok');
    ok.textContent = okLabel;
    ok.className = 'btn ' + (danger ? 'btn-d' : 'btn-p');
    ok.onclick = () => {
      document.getElementById('confirm-overlay').classList.remove('open');
      _confirmResolve = null;
      res(true);
    };
    document.getElementById('confirm-overlay').classList.add('open');
  });
}
function confirmCancel() {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (_confirmResolve) {
    _confirmResolve(false);
    _confirmResolve = null;
  }
}

// ── BUTTON GUARD (prevents double-submit) ──
// Usage: btnGuard(btn, async () => { ... });
async function btnGuard(btn, fn) {
  if (!btn || btn.disabled) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = '0.7';
  try {
    await fn();
  } catch(e) {
    toast('An unexpected error occurred.','error');
    console.warn('btnGuard caught:', e);
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.textContent = orig;
  }
}

// ── RBAC: can current user write/delete data? ──
function canWrite() {
  if (!CURRENT_USER) return false;
  // Viewer role is read-only
  if (CURRENT_USER.role === 'viewer') return false;
  return true;
}

// Close confirm dialog with Escape key; also close any open modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('confirm-overlay');
    if (overlay && overlay.classList.contains('open')) { confirmCancel(); return; }
    // Close topmost open modal
    const openModals = document.querySelectorAll('.mo.open');
    if (openModals.length) {
      openModals[openModals.length - 1].classList.remove('open');
    }
  }
});

function dRitualItems(){return[];}
function dVendors(){return[];}

function dM(){return[];}
function dE(){return[];}
function dT(){return[];}
function dG(){return[];}
function dN(){return[];}
function dC(){return[];}
function dSh(){return[];}
function dF(){return[];}
function dNO(){return[];}
function dCO(){return[];}
function dTR(){return[];}

const PT={dashboard:'Executive Dashboard',attendance:'Attendance',finance:'Finance',calendar:'Calendar',tasks:'Tasks & Goals',notes:'Meeting Notes',judicial:'Compliance Review',sober:'Event Safety Management',members:'Members',recruitment:'Recruitment CRM',academics:'Academics',committees:'Committees',analytics:'Analytics & Reporting',files:'Files & Documents',notifications:'Notifications',transition:'Officer Transition Hub',settings:'Settings',philanthropy:'Philanthropy & Service',alumni:'Alumni Relations',ritual:'Leadership Development',vendors:'Vendors & Contacts',healthscore:'Org Health Scorecard',playbooks:'SOPs & Playbooks'};

function mB(id){if(!id)return{name:'Unassigned',initials:'—'};return D.members.find(m=>m.id===id)||{name:'Unknown',initials:'??'};}
function fd(d){if(!d)return'—';try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}catch{return'—';}}
function fds(d){if(!d)return'—';try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}catch{return'—';}}
function dom(d){if(!d)return'';try{return new Date(d+'T12:00:00').getDate();}catch{return'';}}
function mos(d){if(!d)return'';try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short'});}catch{return'';}}
function isOv(d){if(!d)return false;try{return new Date(d+'T12:00:00')<new Date();}catch{return false;}}
function isUp(d){if(!d)return false;try{return new Date(d+'T12:00:00')>=new Date();}catch{return false;}}
function pc(c,t){return t?Math.round(c/t*100):0;}
function uid(){return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function pgc(p){return p>=80?'var(--gn)':p>=50?'var(--navy)':p>=25?'var(--am)':'var(--rd)';}

// Attendance rate: computed from real D.attendance data; falls back to seeded defaults for built-in members
function aR(memberId){
  const mandEvents=D.events.filter(e=>e.mandatory&&!isUp(e.date));
  if(!mandEvents.length){
    // No past mandatory events yet — use seeded defaults for officers, 80 for others
    // No attendance data yet — return 100% as neutral baseline until real events are marked
    return 100;
  }
  let present=0;
  mandEvents.forEach(ev=>{
    const rec=(D.attendance[ev.id]||{})[memberId];
    if(rec==='present'||rec==='excused')present++;
  });
  return Math.round(present/mandEvents.length*100);
}

function tM(id){const all=D.tasks.filter(t=>t.assignedTo===id);const dn=all.filter(t=>t.status==='done');return{total:all.length,done:dn.length,rate:all.length?Math.round(dn.length/all.length*100):0};}
function mOpts(){return D.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');}
function evCS(t){const m={chapter:'background:#e8eef7;color:#1a3a6b',exec:'background:#f0f0ee;color:#555',recruitment:'background:var(--gn-bg);color:var(--gn-tx)',philanthropy:'background:#fbeaf0;color:#993556','team-building':'background:var(--am-bg);color:var(--am-tx)',retreat:'background:var(--gn-bg);color:var(--gn-tx)',mandatory:'background:var(--rd-bg);color:var(--rd-tx)'};return m[t]||'background:#f0f0ee;color:#555';}

// ── SIDEBAR RESPONSIVE ──
function sbOpen(){
  document.getElementById('app-nav').classList.add('open');
  document.getElementById('sb-overlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function sbClose(){
  document.getElementById('app-nav').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
  document.body.style.overflow='';
}
function sbToggle(){
  const nav=document.getElementById('app-nav');
  nav.classList.contains('open')?sbClose():sbOpen();
}

function nav(page,el){
  // Lock judicial board when navigating away from it
  // No jbLock on nav — judicial access is role-based, not session-locked
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('page-'+page);if(pg)pg.classList.add('active');
  if(el)el.classList.add('active');
  else{const lbl=page.replace('-',' ');document.querySelectorAll('.ni').forEach(n=>{if(n.textContent.toLowerCase().trim().startsWith(lbl.substring(0,6)))n.classList.add('active');});}
  document.getElementById('pg-title').textContent=(page==='dashboard'&&CURRENT_USER)?('Good '+lgTimeOfDay()+', '+CURRENT_USER.name.split(' ')[0]):PT[page]||page;
  // Show skeleton for data-heavy pages
  const skMap={
    dashboard:[{id:'d-kpi',html:skKpi(4)},{id:'d-events',html:skRows2(3)},{id:'d-overdue',html:skRows2(3)}],
    attendance:[{id:'a-kpi',html:skKpi(4)},{id:'a-table',html:skRows(6,5)}],
    calendar:[{id:'cal-grid',html:skCalendar()}],
    notes:[{id:'notes-g',html:skCards(4)}],
    analytics:[{id:'an-kpi',html:skKpi(4)},{id:'an-eng',html:skRows(4,2)},{id:'an-officers',html:skRows(5,4)}],
    files:[{id:'fi-folders',html:Array(8).fill(0).map(()=>`<div class="sk-card" style="height:90px"></div>`).join('')}],
    committees:[{id:'co-grid',html:Array(3).fill(0).map(()=>`<div class="sk-card" style="height:110px"></div>`).join('')}],
    transition:[{id:'tr-folders',html:Array(6).fill(0).map(()=>`<div class="sk-card" style="height:100px"></div>`).join('')}],
  };
  if(skMap[page]){
    skMap[page].forEach(({id,html})=>{const e=document.getElementById(id);if(e)e.innerHTML=html;});
  }
  // Small timeout so skeleton flashes before render
  setTimeout(()=>{R[page]&&R[page]();},60);
  // Auto-close sidebar drawer on mobile/tablet
  if(window.innerWidth<=1100)sbClose();
}
function openM(id){
  const el=document.getElementById(id);
  el.querySelectorAll('select[id="nt-a"],select[id="nc-m"],select[id="ns-m"],select[id="nco-c"],select[id="ntr-o"]').forEach(s=>{
    const pre=s.id==='ns-m'?'<option value="">— Unassigned —</option>':'';
    s.innerHTML=pre+mOpts();
  });
  // Reset event modal to "New Event" mode
  if(id==='m-addevent'){
    const eid=document.getElementById('ne-edit-id');if(eid)eid.value='';
    const mt=el.querySelector('.md-t');if(mt&&mt.childNodes[0])mt.childNodes[0].textContent='New Event';
  }
  el.classList.add('open');
}
