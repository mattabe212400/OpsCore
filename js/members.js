/* OpsCore 2.0 Demo — Members, Academics, Judicial, Sober, Analytics, Files, Transition */

function canEditSober(){
  if(!CURRENT_USER) return false;
  if(CURRENT_USER.role==='admin') return true;
  return ['President','Vice President','Risk Manager'].includes(CURRENT_USER.title);
}

function canEditMembers(){
  if(!CURRENT_USER) return false;
  if(CURRENT_USER.role==='admin') return true;
  return ['President','Vice President','Secretary'].includes(CURRENT_USER.title);
}
function renderJudicial(){
  if(!jbCanAccess()){
    // Show access denied instead of password gate
    document.getElementById('jb-gate').style.display='block';
    document.getElementById('jb-content').style.display='none';
    return;
  }
  JB_UNLOCKED=true;
  document.getElementById('jb-gate').style.display='none';
  document.getElementById('jb-content').style.display='block';
  renderJudicialContent();
}

function renderJudicialContent(){
  const open=D.cases.filter(c=>!['resolved','dismissed'].includes(c.status));
  const res=D.cases.filter(c=>['resolved','dismissed'].includes(c.status));
  const hearingSoon=open.filter(c=>c.hearingDate&&!isOverdue(c.hearingDate)&&(new Date(c.hearingDate+'T12:00:00')-new Date())<7*86400000).length;

  // KPIs
  document.getElementById('j-kpi').innerHTML=
    kpi('Open cases',open.length,open.length>0?'Requires attention':'All clear',open.length?'down':'neutral')+
    kpi('Hearings this week',hearingSoon,hearingSoon?'Scheduled':'None upcoming','neutral')+
    kpi('Resolved',res.length,'This semester','neutral')+
    kpi('Case types',D.cases.length?[...new Set(D.cases.map(c=>c.type))].length+' categories':'—','All types','neutral');

  // Type and status label maps
  const tl={conduct:'Conduct Violation',attendance:'Attendance',academic:'Academic Violation',financial:'Financial',hazing:'Hazing',risk:'Risk Management',other:'Other'};
  const sl={open:'Open',scheduled:'Hearing Scheduled',pending:'Pending Review',resolved:'Resolved',appealed:'Appealed',dismissed:'Dismissed'};
  const sc={open:'br2',scheduled:'ba2',pending:'bb2',resolved:'bg2',appealed:'bb2',dismissed:'bm2'};
  const dotCol={open:'var(--rd)',scheduled:'var(--am)',pending:'var(--bl)',resolved:'var(--gn)',appealed:'var(--bl)',dismissed:'#ccc'};

  // Active case cards
  const openCards=document.getElementById('j-open-cards');
  const openEmpty=document.getElementById('j-open-empty');
  if(open.length){
    openEmpty.style.display='none';
    openCards.style.display='flex';
    openCards.innerHTML=open.map(c=>`
      <div class="jb-case-card">
        <div class="case-header">
          <div>
            <div class="case-num">${c.caseNum}</div>
            <div class="case-name">${getMember(c.member).name}</div>
          </div>
          <span class="badge ${sc[c.status]||'bm2'}">${sl[c.status]||c.status}</span>
        </div>
        <div class="case-meta">
          <span><i class="ti ti-tag" style="font-size:11px"></i> ${tl[c.type]||c.type}</span>
          ${c.hearingDate?`<span><i class="ti ti-calendar" style="font-size:11px"></i> Hearing: ${formatDate(c.hearingDate)}</span>`:''}
          <span><i class="ti ti-user" style="font-size:11px"></i> Filed by ${getMember(c.filedBy).name}</span>
        </div>
        <div class="case-desc">${c.desc}</div>
        <div class="case-actions">
          <button class="btn btn-p" style="height:26px;font-size:11px" onclick="openResolveCase('${c.id}')"><i class="ti ti-gavel"></i>Resolve</button>
          <button class="btn" style="height:26px;font-size:11px" onclick="jbEditStatus('${c.id}')"><i class="ti ti-edit"></i>Update Status</button>
          <button class="btn btn-d" style="height:26px;font-size:11px" onclick="deleteCase('${c.id}')"><i class="ti ti-trash"></i>Delete</button>
        </div>
      </div>`).join('');
  } else {
    openEmpty.style.display='block';
    openEmpty.innerHTML=es('ti-circle-check','green','No active cases','All clear — no open judicial cases this semester.',`<button class="btn btn-p" onclick="openM('m-addcase')"><i class="ti ti-plus"></i>File a Case</button>`);
    openCards.style.display='none';
    openCards.innerHTML='';
  }

  // Pipeline: status breakdown
  const statuses=['open','scheduled','pending','resolved','dismissed','appealed'];
  const counts=statuses.map(s=>({s,label:sl[s],n:D.cases.filter(c=>c.status===s).length,col:dotCol[s]}));
  document.getElementById('j-pipeline').innerHTML=counts.filter(x=>x.n>0||x.s==='open').map(x=>`
    <div class="pipeline-row">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="pipeline-dot" style="background:${x.col}"></div>
        <span style="font-size:12.5px">${x.label}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:80px;height:5px;background:var(--surf2);border-radius:99px;overflow:hidden">
          <div style="height:100%;border-radius:99px;background:${x.col};width:${D.cases.length?Math.round(x.n/D.cases.length*100):0}%"></div>
        </div>
        <span style="font-size:12px;font-weight:500;width:20px;text-align:right">${x.n}</span>
      </div>
    </div>`).join('')||'<div style="color:var(--ht);font-size:12px;padding:16px 0;text-align:center">No cases filed yet.</div>';

  // Resolved table
  document.getElementById('j-res').innerHTML=`<thead><tr><th>Case #</th><th>Type</th><th>Member</th><th>Resolution</th><th>Outcome</th><th></th></tr></thead><tbody>${res.length?res.map(c=>`<tr><td class="cn">${c.caseNum}</td><td>${tl[c.type]||c.type}</td><td style="font-weight:500">${getMember(c.member).name}</td><td style="color:var(--mt);max-width:220px;white-space:normal;line-height:1.4">${c.resolution||'—'}</td><td><span class="badge ${sc[c.status]||'bm2'}">${sl[c.status]||c.status}</span></td><td><button class="btn btn-d" style="height:23px;font-size:10px;padding:0 7px" onclick="deleteCase('${c.id}')"><i class="ti ti-trash"></i></button></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--mt);padding:18px">No resolved cases this semester</td></tr>'}</tbody>`;

  updateBadges();
}

function jbEditStatus(id){
  // Reuse the resolve modal for quick status updates too
  openResolveCase(id);
}

// renderSober() and its shift-CRUD helpers now live in js/sober.js — D.shifts moved from a
// flat array of individual shifts to a weekly weekend/day/slot grid (mirrors the chapter's
// real sober-monitor spreadsheet) so a whole weekend's Thu/Fri/Sat coverage is one record.

function renderMembers(){
  const canEdit=canEditMembers();
  const addBtn=document.getElementById('members-add-btn');
  const impBtn=document.getElementById('members-import-btn');
  if(addBtn) addBtn.style.display=canEdit?'':'none';
  if(impBtn) impBtn.style.display=canEdit?'':'none';

  const newMemberCount=D.members.filter(m=>(m.memberStatus||'Active')==='New Member').length;
  document.getElementById('m-kpi').innerHTML=kpi('Active members',D.members.length,getSemester(),'neutral')+kpi('Live-in',D.members.filter(m=>m.liveIn).length,'Chapter house','neutral')+kpi('New Members',newMemberCount,'This semester','neutral')+kpi('Graduating',D.members.filter(m=>m.year===2027).length,'Class of 2027','neutral');
  const editCol=canEdit?'<th></th>':'';
  const q=(document.getElementById('m-search')||{value:''}).value.toLowerCase();
  const statusFlt=(document.getElementById('m-filter-status')||{value:''}).value;
  const rows=sortedMembers().filter(m=>{
    if(statusFlt&&(m.memberStatus||'Active')!==statusFlt)return false;
    if(q&&!(m.name||'').toLowerCase().includes(q))return false;
    return true;
  });
  document.getElementById('m-table').innerHTML=`<thead><tr><th>Member</th><th>Grad Year</th><th>Class</th><th>Status</th><th>Role</th><th>Attendance</th><th>Live-in</th><th>Engagement</th>${editCol}</tr></thead><tbody>${rows.map(m=>{const r=getAttendanceRate(m.id);const dots=[...Array(5)].map((_,i)=>`<div class="edot ${i<Math.round(r/20)?'f':'e'}"></div>`).join('');const status=m.memberStatus||'Active';const editCell=canEdit?`<td><button class="btn" style="height:23px;font-size:10.5px" onclick="event.stopPropagation();openEditMember('${m.id}')"><i class="ti ti-pencil"></i></button></td>`:'';return`<tr style="cursor:pointer" onclick="openMemberDrawer('${m.id}')"><td><div style="display:flex;align-items:center;gap:7px"><div class="sh-av" style="width:25px;height:25px;font-size:8.5px">${m.initials}</div><span style="font-weight:500">${m.name}</span></div></td><td style="color:var(--mt)">${m.year}</td><td>${m.classYear}</td><td><span class="badge ${status==='New Member'?'bb2':'bm2'}">${status}</span></td><td><span class="badge ${m.role!=='Member'?'bb2':'bm2'}">${m.role}</span></td><td style="font-weight:500;color:${r>=85?'var(--gn)':r>=75?'var(--gold)':r>=65?'var(--am)':'var(--rd)'}">${r}%</td><td>${m.liveIn?'Yes':'—'}</td><td><div class="edots">${dots}</div></td>${editCell}</tr>`;}).join('')||`<tr><td colspan="9" style="text-align:center;color:var(--mt);padding:18px">No members found.</td></tr>`}</tbody>`;
}

// ── MEMBER PROFILE DRAWER (view-only; Edit button hands off to the existing edit modal) ──
function openMemberDrawer(id){
  const m=D.members.find(x=>x.id===id);if(!m)return;
  const r=getAttendanceRate(id);
  const ts=getTaskMetrics(id);

  document.getElementById('mdw-av').textContent=m.initials;
  document.getElementById('mdw-name').textContent=m.name;
  document.getElementById('mdw-sub').textContent=`${m.role} · ${m.classYear}`;

  const stats=[{v:r+'%',l:'Attendance'},{v:`${ts.done}/${ts.total}`,l:'Tasks Done'}];
  if(canAccess('academics')){
    const g=(D.academics.gpas[id]||{}).cumulativeGpa;
    stats.push({v:g?(+g).toFixed(2):'—',l:'Cumulative GPA'});
  }
  if(canAccess('finance')){
    const status=(D.finance.dues[id]||{}).status||'Partial';
    stats.push({v:status,l:'Dues Status'});
  }

  const status=m.memberStatus||'Active';
  const detailRows=[['Status',status],['Grad Year',m.year],['Class',m.classYear],['Live-in',m.liveIn?'Yes':'No']];

  const pastEvents=D.events.filter(e=>e.mandatory&&!isUpcoming(e.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const attMap={present:['Present','bg2'],excused:['Excused','bb2'],unexcused:['Unexcused Miss','br2']};
  const attRows=pastEvents.map(ev=>{
    const rec=(D.attendance[ev.id]||{})[id];
    const [label,cls]=attMap[rec]||['Not marked','bm2'];
    const d=new Date(ev.date+'T12:00:00');
    return`<div class="ev-row"><div class="ev-dt"><div class="ev-day">${d.getDate()}</div><div class="ev-mo">${d.toLocaleString('en-US',{month:'short'})}</div></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.title}</div><div style="font-size:10.5px;color:var(--mt)">${formatDateShort(ev.date)}</div></div><span class="badge ${cls}">${label}</span></div>`;
  }).join('')||`<div class="es-inline"><i class="ti ti-calendar-off"></i>No past mandatory events yet</div>`;

  const canEdit=canEditMembers();
  document.getElementById('mdw-body').innerHTML=`
    <div class="drawer-stats">${stats.map(s=>`<div class="drawer-stat"><div class="drawer-stat-v">${s.v}</div><div class="drawer-stat-l">${s.l}</div></div>`).join('')}</div>
    <div class="drawer-section-t">Details</div>
    <div style="display:flex;flex-direction:column;gap:8px">${detailRows.map(([l,v])=>`<div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="color:var(--mt)">${l}</span><span style="font-weight:500;color:var(--tx)">${v}</span></div>`).join('')}</div>
    <div class="drawer-section-t">Recent Attendance</div>
    <div>${attRows}</div>
    ${canEdit?`<div style="margin-top:18px"><button class="btn btn-p" style="width:100%;justify-content:center" onclick="closeMemberDrawer();openEditMember('${id}')"><i class="ti ti-pencil"></i>Edit Member</button></div>`:''}
  `;
  document.getElementById('member-drawer-overlay').classList.add('open');
}
function closeMemberDrawer(){
  document.getElementById('member-drawer-overlay').classList.remove('open');
}

function renderCommittees(){
  const canEdit=canEditMembers();
  const addBtn=document.getElementById('comm-add-btn');
  if(addBtn) addBtn.style.display=canEdit?'':'none';

  const editBtn=(id)=>canEdit?`<button class="btn" style="height:22px;font-size:10px;padding:0 7px" onclick="openEditComm('${id}')"><i class="ti ti-pencil"></i></button>`:'';
  document.getElementById('co-cnt').textContent=D.committees.length+' committees this semester';
  document.getElementById('co-grid').innerHTML=D.committees.map(c=>`<div class="card" style="transition:border-color .1s" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--bdr)'"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px"><span style="font-size:13px;font-weight:500">${c.name}</span><div style="display:flex;align-items:center;gap:6px"><span style="font-size:10.5px;color:var(--mt)">${(c.members||[]).length} members</span>${editBtn(c.id)}</div></div><p style="font-size:11.5px;color:var(--mt);line-height:1.5;margin-bottom:9px">${c.desc||'No description'}</p><div style="font-size:11px;color:var(--ht);border-top:1px solid var(--bdr);padding-top:8px;display:flex;justify-content:space-between"><span>Chair:</span><span style="font-weight:500;color:var(--tx)">${c.chair?getMember(c.chair).name:'Unassigned'}</span></div></div>`).join('')||`<div style="grid-column:1/-1">${es('ti-sitemap','blue','No committees','Create committees to organize chapter working groups.',canEdit?`<button class="btn btn-p" onclick="openM('m-addcomm')"><i class="ti ti-plus"></i>New Committee</button>`:'')}</div>`;
}


// ── FILE STORAGE: store base64 content in memory (not localStorage — too large)
const FI_STORE = {}; // id -> {name, type, size, base64, mediaType, text}

function fiDragOver(e){e.preventDefault();const t=e.currentTarget;t.style.borderColor='var(--gold)';t.style.background='#f0f4ff';}
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
      saveData();renderFiles();
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
  {name:'President',icon:'👑',color:'var(--sky-tx)',bg:'var(--sky-bg)'},
  {name:'Vice President',icon:'⭐',color:'#185fa5',bg:'#e6f1fb'},
  {name:'Treasurer',icon:'💰',color:'var(--gn-tx)',bg:'var(--gn-bg)'},
  {name:'Risk Manager',icon:'🛡️',color:'var(--rd-tx)',bg:'var(--rd-bg)'},
  {name:'Secretary',icon:'📋',color:'var(--am-tx)',bg:'var(--am-bg)'},
  {name:'Chaplain',icon:'✝️',color:'#555',bg:'var(--surf2)'},
  {name:'New Member Educator',icon:'🎓',color:'#185fa5',bg:'#e6f1fb'},
  {name:'Recruitment Chair',icon:'🤝',color:'var(--gn-tx)',bg:'var(--gn-bg)'},
  {name:'Social Chair',icon:'🎉',color:'var(--am-tx)',bg:'var(--am-bg)'},
  {name:'Philanthropy Chair',icon:'❤️',color:'var(--rd-tx)',bg:'var(--rd-bg)'},
  {name:'Scholarship Chair',icon:'📚',color:'#185fa5',bg:'#e6f1fb'},
  {name:'Alumni Relations Chair',icon:'🏛️',color:'var(--sky-tx)',bg:'var(--sky-bg)'},
  {name:'Public Relations Officer',icon:'📣',color:'var(--am-tx)',bg:'var(--am-bg)'},
  {name:'Community Service Chair',icon:'🌱',color:'var(--gn-tx)',bg:'var(--gn-bg)'},
  {name:'General',icon:'📁',color:'#555',bg:'var(--surf2)'},
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

function renderFiles(){
  const iconMap={pdf:'ti-file-type-pdf',xlsx:'ti-file-spreadsheet',xls:'ti-file-spreadsheet',csv:'ti-file-spreadsheet',docx:'ti-file-type-doc',doc:'ti-file-type-doc',txt:'ti-file-text',png:'ti-photo',jpg:'ti-photo',jpeg:'ti-photo'};
  const colorMap={pdf:'color:var(--rd)',xlsx:'color:var(--gn)',xls:'color:var(--gn)',csv:'color:var(--gn)',docx:'color:var(--bl)',doc:'color:var(--bl)',txt:'color:var(--mt)',png:'color:var(--am)',jpg:'color:var(--am)',jpeg:'color:var(--am)'};

  function fileCard(f){
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    const icon=iconMap[ext]||'ti-file';const col=colorMap[ext]||'color:var(--ht)';const hasMem=!!FI_STORE[f.id];
    return`<div class="card" style="padding:10px 13px;display:flex;align-items:center;gap:10px">
      <i class="ti ${icon}" style="font-size:20px;flex-shrink:0;${col}"></i>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
        <div style="font-size:10.5px;color:var(--mt);margin-top:1px">${f.folder} · ${f.size} · ${formatDateShort(f.date)}</div>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        ${hasMem?`<button class="btn" style="height:25px;font-size:11px" onclick="fiOpenDoc('${f.id}')"><i class="ti ti-robot"></i>Ask AI</button>`:'<span style="font-size:10.5px;color:var(--ht);padding:0 4px">session only</span>'}
        <button class="btn btn-d" style="height:25px;font-size:11px;padding:0 8px" onclick="fiDelete('${f.id}')"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }

  if(FI_CURRENT_FOLDER){
    // Folder detail view
    const folderFiles=D.files.filter(f=>f.folder===FI_CURRENT_FOLDER);
    const list=document.getElementById('fi-list');
    const empty=document.getElementById('fi-empty');
    const cnt=document.getElementById('fi-folder-count');
    if(cnt)cnt.textContent=folderFiles.length+' file'+(folderFiles.length!==1?'s':'');
    if(list)list.innerHTML=folderFiles.map(fileCard).join('');
    if(empty){empty.innerHTML=folderFiles.length?'':es('ti-cloud-upload','slate','No files in this folder','Upload documents, spreadsheets, or PDFs to this position folder.',``);empty.style.display=folderFiles.length?'none':'block';}
  } else {
    // Root view: show folder cards + general files
    const _ff=getFileFolders();
    const allFolderNames=_ff.map(f=>f.name);
    D.files.forEach(f=>{if(!allFolderNames.includes(f.folder))allFolderNames.push(f.folder);});

    const folderCards=_ff.map(folder=>{
      const count=D.files.filter(f=>f.folder===folder.name).length;
      return`<div class="folder-card" style="position:relative">
        <div onclick="fiOpenFolder('${folder.name.replace(/'/g,"\\'")}')">
          <div class="folder-icon" style="background:${folder.bg};color:${folder.color}">${folder.icon}</div>
          <div>
            <div class="folder-name">${folder.name}</div>
            <div class="folder-meta">${count} file${count!==1?'s':''}</div>
          </div>
        </div>
        <button class="ib" style="position:absolute;top:6px;right:6px;width:20px;height:20px;font-size:11px;color:var(--ht)" onclick="event.stopPropagation();fiDeleteFolder('${folder.name.replace(/'/g,"\\'")}')"><i class="ti ti-x"></i></button>
      </div>`;
    });
    const foldersEl=document.getElementById('fi-folders');
    if(foldersEl)foldersEl.innerHTML=folderCards.join('');

    // General / uncategorized files in root
    const generalFiles=D.files.filter(f=>f.folder==='General'||!_ff.find(fl=>fl.name===f.folder));
    const totalFiles=D.files.length;
    const cntEl=document.getElementById('fi-count');
    if(cntEl)cntEl.textContent=totalFiles+' file'+(totalFiles!==1?'s':'')+' total';
    const rootList=document.getElementById('fi-list-root');
    const rootEmpty=document.getElementById('fi-empty-root');
    if(rootList)rootList.innerHTML=generalFiles.map(fileCard).join('');
    if(rootEmpty){rootEmpty.innerHTML=generalFiles.length?'':es('ti-files','slate','No general files yet','Drag and drop files here, or click to upload.',``);rootEmpty.style.display=generalFiles.length?'none':'block';}
  }
}

async function fiClearAll(){
  if(!canWrite()){toast('You do not have permission to clear files.','error');return;}
  if(!D.files.length)return;
  const ok=await confirmDialog('Clear All Files','Remove all '+D.files.length+' file(s)? This cannot be undone.');
  if(!ok)return;
  D.files=[];Object.keys(FI_STORE).forEach(k=>delete FI_STORE[k]);
  saveData();renderFiles();toast('All files removed','info');
}
function fiOpenAddFolder(){
  document.getElementById('fi-folder-name').value='';
  document.getElementById('fi-folder-icon').value='📁';
  document.getElementById('m-fi-addfolder').classList.add('open');
}
function fiAddFolder(){
  if(!canWrite()){toast('You do not have permission to create folders.','error');return;}
  const name=document.getElementById('fi-folder-name').value.trim();
  if(!name){toast('Folder name is required','error');return;}
  const folders=getFileFolders();
  if(folders.find(f=>f.name.toLowerCase()===name.toLowerCase())){toast('A folder with that name already exists','error');return;}
  const icon=document.getElementById('fi-folder-icon').value.trim()||'📁';
  if(!D.settings.fileFolders)D.settings.fileFolders=[...DEFAULT_FILE_FOLDERS];
  D.settings.fileFolders.push({name,icon,color:'#555',bg:'var(--surf2)'});
  saveData();closeM(null,document.getElementById('m-fi-addfolder'));renderFiles();toast('Folder created','success');
}
async function fiDeleteFolder(folderName){
  if(!canWrite()){toast('You do not have permission to delete folders.','error');return;}
  const count=D.files.filter(f=>f.folder===folderName).length;
  const ok=await confirmDialog('Delete Folder','Delete "'+folderName+'"?'+(count?' This folder has '+count+' file(s) that will be moved to General.':''),'Delete',true);
  if(!ok)return;
  D.files.forEach(f=>{if(f.folder===folderName)f.folder='General';});
  if(!D.settings.fileFolders)D.settings.fileFolders=[...DEFAULT_FILE_FOLDERS];
  D.settings.fileFolders=D.settings.fileFolders.filter(f=>f.name!==folderName);
  saveData();renderFiles();toast('Folder deleted','info');
}

function renderNotifications(){
  const visNotifs=D.notifs.filter(n=>n.type!=='judicial');
  const unr=visNotifs.filter(n=>!n.read).length;
  document.getElementById('no-cnt').textContent='Notifications'+(unr?' — '+unr+' new':'');
  const ic={attendance:'ti-alert-circle',task:'ti-clock',warning:'ti-alert-triangle',judicial:'ti-scale',sober:'ti-shield-check',general:'ti-bell',deadline:'ti-clock',finance:'ti-cash',info:'ti-info-circle'};
  const co={attendance:'background:var(--rd-bg);color:var(--rd-tx)',task:'background:var(--am-bg);color:var(--am-tx)',warning:'background:var(--am-bg);color:var(--am-tx)',judicial:'background:var(--bl-bg);color:var(--bl-tx)',sober:'background:var(--gn-bg);color:var(--gn-tx)',finance:'background:var(--gn-bg);color:var(--gn-tx)',info:'background:var(--bl-bg);color:var(--bl-tx)'};
  const visibleNotifs=D.notifs.filter(n=>n.type!=='judicial');
  document.getElementById('no-list').innerHTML=visibleNotifs.map(n=>{
    const linkClick=n.link?`onclick="nRead('${n.id}');rbacNav('${n.link}',null)"`:(`onclick="nRead('${n.id}')"`);
    return`<div class="ni-item ${n.read?'':'unread'}" ${linkClick} style="cursor:${n.link?'pointer':'default'}">
      <div class="al-ic" style="${co[n.type]||'background:var(--surf2);color:var(--mt)'}"><i class="ti ${ic[n.type]||'ti-bell'}" style="font-size:13px"></i></div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:${n.read?400:500}">${n.title}${n.autoKey?'<span style="font-size:9px;color:var(--ht);margin-left:6px;font-weight:400">auto</span>':''}</div>
        <div style="font-size:11px;color:var(--mt);margin-top:2px">${n.body}</div>
        <div style="font-size:10px;color:var(--ht);margin-top:3px">${n.date||n.time||''}</div>
      </div>
      ${!n.read?'<div class="ni-dot"></div>':''}
    </div>`;
  }).join('')||es('ti-bell-off','slate','All caught up','No new notifications right now.','');
  updateBadges();
}

// ── EXEC POSITION FOLDERS ──
const EXEC_POSITIONS=[
  {role:'President',          icon:'👑', color:'var(--sky-tx)', bg:'var(--sky-bg)',
   responsibilities:['Lead chapter operations and exec team','Chair all chapter and exec meetings','Represent chapter to ISU, IFC, and ATO national','Manage judicial board and standards enforcement','Final approval on all major chapter decisions'],
   recurringTasks:['Weekly exec check-ins (Monday)','Monthly report to ATO national advisor','Semester goal-setting with exec team','Sign all chapter contracts and official documents','IFC President meetings (bi-weekly)'],
   wishIKnew:'The job is 80% communication and follow-up. Your exec team will only move as fast as you hold them accountable. Set clear weekly expectations and never let a deadline slip twice.'},
  {role:'Vice President',     icon:'⭐', color:'#185fa5', bg:'#e6f1fb',
   responsibilities:['Run chapter meetings and set agendas','Track officer accountability and task completion','Serve as President backup at all events','Coordinate committee chairs and their reports','Manage chapter calendar and event scheduling'],
   recurringTasks:['Weekly VP checklist (see Playbooks)','Monday agenda prep and officer check-ins','Send weekly chapter digest email','Attendance follow-up for members below 75%','Coordinate with Secretary on meeting minutes'],
   wishIKnew:'Agenda discipline makes or breaks chapter meetings. Send the agenda 24 hours out, stick to time limits, and never let open forum run more than 5 minutes. Brothers appreciate efficiency.'},
  {role:'Treasurer',          icon:'💰', color:'var(--gn-tx)', bg:'var(--gn-bg)',
   responsibilities:['Manage all chapter finances and bank accounts','Collect and track semester dues','Approve all chapter expenditures','Maintain semester budget and financial reports','File all required financial reports with IFC and nationals'],
   recurringTasks:['Weekly dues reminder to unpaid members','Monthly budget vs. actuals report to exec','IFC financial reporting (semester deadlines)','Annual audit with chapter advisor','Semester budget planning before each semester'],
   wishIKnew:'Chase dues early and often. The first 3 weeks of the semester set the tone. Members who don\'t pay by Week 4 rarely pay voluntarily. Know exactly what IFC requires and when — late filings are a big deal.'},
  {role:'Secretary',          icon:'📋', color:'var(--am-tx)', bg:'var(--am-bg)',
   responsibilities:['Record and publish all chapter meeting minutes','Maintain official chapter roster and member records','Handle chapter correspondence and official communications','Track and submit all required reports to nationals','Manage chapter calendar accuracy'],
   recurringTasks:['Minutes published within 24 hours of each meeting','Roster update at start of each semester','Monthly report to ATO national (online portal)','Attendance records kept current in platform','Email archive maintained for the semester'],
   wishIKnew:'The national portal deadlines sneak up on you. Build calendar reminders for every reporting deadline on Day 1. Keep the chapter roster obsessively up to date — everything else in the platform depends on it.'},
  {role:'Recruitment Chair',  icon:'🤝', color:'var(--gn-tx)', bg:'var(--gn-bg)',
   responsibilities:['Plan and execute all rush events each semester','Manage the recruitment CRM and rushee pipeline','Coordinate bid day and new member onboarding','Lead the recruitment committee','Track and report recruitment metrics'],
   recurringTasks:['Weekly CRM review and rushee follow-ups','Rush event debrief within 24 hours','Recruiter leaderboard and accountability tracking','IFC recruitment registration and compliance','Post-rush debrief report at end of each semester'],
   wishIKnew:'Relationships close bids, not events. Your brothers who personally invite rushees and follow up 1-on-1 are worth more than any event. Train every brother on how to have a conversation, not just a sales pitch.'},
  {role:'Risk Manager',       icon:'🛡️', color:'var(--rd-tx)', bg:'var(--rd-bg)',
   responsibilities:['Enforce all risk management policies at events','Schedule and manage social monitor rotations','Conduct event safety walkthroughs','Handle incident documentation and reporting','Liaise with ISU and ATO national on risk matters'],
   recurringTasks:['Social monitor schedule filled 1 week in advance','Event approval sign-off for every social event','Weekly check of social monitor confirmations','Risk policy review at start of each semester','Post-event incident reports (if applicable)'],
   wishIKnew:'The social monitor schedule is your most important recurring task. Never let it go unfilled. One incident without documentation ruins the chapter. Get your FIPG training done in the first week and make sure exec knows the policy cold.'},
  {role:'Social Chair',       icon:'🎉', color:'var(--am-tx)', bg:'var(--am-bg)',
   responsibilities:['Plan and execute all chapter social events','Coordinate with co-host organizations','Manage event budgets in coordination with Treasurer','Ensure all socials are approved by Risk Manager','Build and maintain vendor relationships'],
   recurringTasks:['Submit event proposals to exec 2 weeks in advance','Confirm venue, catering, and transportation 1 week out','Brief brothers on event logistics 48 hours before','Post-event debrief and vendor rating update','Semester event calendar submitted Week 1'],
   wishIKnew:'Book popular venues in the first week of the semester or they\'ll be gone. Always have a backup plan for venue and catering. Your vendor list in the platform is gold — update it after every event while details are fresh.'},
  {role:'Philanthropy Chair', icon:'❤️', color:'var(--rd-tx)', bg:'var(--rd-bg)',
   responsibilities:['Organize all chapter philanthropy and service events','Track and report individual and chapter service hours','Meet IFC and national service hour requirements','Build relationships with nonprofit partners','Run the philanthropy committee'],
   recurringTasks:['Service hour log updated within 24 hours of each event','IFC service hours reported each semester','At least 1 philanthropy event per month during semester','Chapter service hour goal tracked in platform','Thank-you notes sent to partner orgs within 48 hours'],
   wishIKnew:'IFC has a minimum hours requirement that can affect your chapter standing. Know the number on Day 1 and set your semester goal above it. Brothers participate more when you make it easy — transportation is usually the bottleneck.'},
  {role:'Scholarship Chair',  icon:'📚', color:'#185fa5', bg:'#e6f1fb',
   responsibilities:['Track and report all member GPAs each semester','Identify and support members on academic probation','Run the scholarship committee and study programs','Submit GPA reports to IFC and ATO national','Coordinate academic support resources with ISU'],
   recurringTasks:['GPA collection within first 3 weeks of semester','Academic probation check-ins (weekly)','Study hours tracking if chapter policy requires','IFC GPA report (end of semester deadline)','Chapter GPA award at end-of-semester recognition night'],
   wishIKnew:'Collecting GPAs is harder than it sounds. Send a platform link and make it part of the first chapter meeting. Members on probation often hide it — check in with them privately, not in front of the chapter.'},
  {role:'House Manager',      icon:'🏠', color:'#555', bg:'var(--surf2)',
   responsibilities:['Manage chapter house maintenance and repairs','Coordinate with house corporation on major repairs','Enforce house rules and cleanliness standards','Manage room assignments and live-in rosters','Handle vendor relationships for house services'],
   recurringTasks:['Weekly house walkthrough and maintenance log','Monthly report to house corporation','Room assignment updates at semester start','Utilities and vendor payments tracked with Treasurer','Move-in and move-out inspection checklists'],
   wishIKnew:'Build a relationship with the house corporation contact in Week 1. Keep a running maintenance log — it protects you when something goes wrong. Never pay for a repair out of pocket without exec approval and documentation.'},
  {role:'New Member Educator',icon:'🎓', color:'#185fa5', bg:'#e6f1fb',
   responsibilities:['Design and run the semester new member education program','Track new member progress through all milestones','Coordinate with Chaplain on ritual components','Ensure NME program is compliant with ATO standards','Oversee Peer Mentor Program group assignments'],
   recurringTasks:['Weekly NME session planning and facilitation','New member progress tracked in Ritual & Education section','Peer Mentor Program groups finalized by Week 4','Standards tests administered and graded','Initiation logistics coordinated with Chaplain and President'],
   wishIKnew:'The new member experience sets the tone for how brothers engage with the chapter for their entire time here. Take it seriously. The ritual section in the platform helps track every milestone — use it every week, not just at initiation.'},
  {role:'Chaplain',           icon:'✝️', color:'#555', bg:'var(--surf2)',
   responsibilities:['Lead chapter in ritual and spiritual life','Coordinate all formal ritual ceremonies','Maintain ritual materials and ensure their security','Run the brother of the week and chapter prayer traditions','Support members through personal challenges'],
   recurringTasks:['Chapter opening and closing ritual at every meeting','Coordinate initiation ceremony logistics with NME','Brother of the Week nomination at every chapter meeting','Ritual equipment inventory at start of each semester','Support member wellness — connect struggling brothers to resources'],
   wishIKnew:'The ritual materials are your most important responsibility. Know where they are at all times. Initiation coordination with the NME takes 3-4 weeks of planning — start early. Your informal role supporting brothers personally matters more than most execs realize.'},
];

// Role contacts stored in D.transitions per role — no hardcoded defaults

const TR_ROLE_DEADLINES = [
  {id:'trd1',title:'Submit chapter roster to IFC',owner:'Secretary',when:'Week 1 of every semester',priority:'high',notes:'Late submission results in fines.'},
  {id:'trd2',title:'IFC dues payment',owner:'Treasurer',when:'Week 2 of every semester',priority:'high',notes:'Amount varies — check IFC invoice.'},
  {id:'trd3',title:'ATO national member report',owner:'Secretary',when:'Week 3 of every semester',priority:'high',notes:'Submit via myATO portal.'},
  {id:'trd4',title:'GPA collection from all members',owner:'Scholarship Chair',when:'Weeks 2-4 each semester',priority:'high',notes:'Needed for IFC and national reporting.'},
  {id:'trd5',title:'IFC GPA report submission',owner:'Scholarship Chair',when:'End of each semester',priority:'high',notes:'Submit to IFC by their posted deadline.'},
  {id:'trd6',title:'Philanthropy hours report to IFC',owner:'Philanthropy Chair',when:'End of each semester',priority:'medium',notes:'IFC minimum threshold required.'},
  {id:'trd7',title:'Semester budget submission',owner:'Treasurer',when:'Week 1 of every semester',priority:'high',notes:'Full budget presented at first exec meeting.'},
  {id:'trd8',title:'Risk management event pre-approvals',owner:'Risk Manager',when:'Before every social event',priority:'high',notes:'No event runs without signed RM approval.'},
  {id:'trd9',title:'Officer transition documents complete',owner:'Vice President',when:'Final 2 weeks of each semester',priority:'high',notes:'All outgoing officers must complete before changeover.'},
  {id:'trd10',title:'House inspection with house corporation',owner:'House Manager',when:'Start and end of each semester',priority:'medium',notes:'Document all damage with photos before move-in.'},
];

let TR_CURRENT = null;

function trGetTransData(){
  if(!D.transitionHub)D.transitionHub={deadlines:[],issues:[],archive:[]};
  if(!D.transitionHub.issues)D.transitionHub.issues=[];
  if(!D.transitionHub.archive)D.transitionHub.archive=[];
  if(!D.transitionHub.deadlines)D.transitionHub.deadlines=[];
  return D.transitionHub;
}

function renderTransition(){
  trGetTransData();
  const comp=D.transitions.filter(t=>t.status==='complete').length;
  const tot=Math.max(D.transitions.length,EXEC_POSITIONS.length);
  const pct=Math.round(comp/tot*100);
  document.getElementById('tr-bar').style.width=pct+'%';
  document.getElementById('tr-pct-label').textContent=pct+'%';
  document.getElementById('tr-sub').textContent=comp+' of '+EXEC_POSITIONS.length+' roles marked complete — all outgoing officers should finish before end of semester.';
  trNavRoot();
}

function trNavRoot(){
  TR_CURRENT=null;
  document.getElementById('tr-root-view').style.display='';
  document.getElementById('tr-folder-view').style.display='none';

  const hub=trGetTransData();
  const sl={not_started:'br2',in_progress:'bb2',review:'ba2',complete:'bg2'};
  const sn={not_started:'Not Started',in_progress:'In Progress',review:'In Review',complete:'Complete'};

  // Role cards
  const allRoles=[...EXEC_POSITIONS.map(p=>p.role)];
  D.transitions.forEach(t=>{if(!allRoles.includes(t.role))allRoles.push(t.role);});

  document.getElementById('tr-folders').innerHTML=allRoles.map(role=>{
    const pos=EXEC_POSITIONS.find(p=>p.role===role);
    const tr=D.transitions.find(t=>t.role===role);
    const icon=pos?pos.icon:'📁';
    const bg=pos?pos.bg:'var(--surf2)';
    const col=pos?pos.color:'#555';
    const status=tr?tr.status:'not_started';
    const out=tr&&tr.outgoing?getMember(tr.outgoing).name:'—';
    const inc=tr&&tr.incoming?getMember(tr.incoming).name:'TBD';
    const fileCount=D.files.filter(f=>f.folder===role).length;
    return`<div class="folder-card" style="gap:9px" onclick="trOpenFolder('${encodeURIComponent(role)}')">
      <div style="display:flex;align-items:center;gap:9px">
        <div class="folder-icon" style="background:${bg};color:${col};width:34px;height:34px;font-size:17px">${icon}</div>
        <div style="min-width:0"><div class="folder-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${role}</div>
          <span class="folder-status ${sl[status]||'bm2'}" style="margin-top:3px">${sn[status]||status}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--mt);padding-top:6px;border-top:1px solid var(--bdr)">
        <span title="Outgoing → Incoming"><i class="ti ti-arrow-right" style="font-size:10px"></i> ${out.split(' ')[0]} → ${inc.split(' ')[0]}</span>
        <span><i class="ti ti-file" style="font-size:10px"></i> ${fileCount}</span>
      </div>
    </div>`;
  }).join('');

  // Deadlines table
  trRenderDeadlines();

  // Open Issues
  trRenderIssues();

  // Archive
  trRenderArchive();
}

function trRenderDeadlines(){
  const hub=trGetTransData();
  const dl=hub.deadlines||[];
  const priColor={high:'br2',medium:'ba2',low:'bm2'};
  document.getElementById('tr-deadlines-table').innerHTML=`<thead><tr><th>Deadline / Task</th><th>Owner</th><th>When</th><th>Priority</th><th>Notes</th><th></th></tr></thead>
    <tbody>${dl.length?dl.map(d=>`<tr>
      <td style="font-weight:500">${d.title}</td>
      <td style="color:var(--mt)">${d.owner}</td>
      <td style="color:var(--mt)">${d.when}</td>
      <td><span class="badge ${priColor[d.priority]||'bm2'}">${d.priority}</span></td>
      <td style="color:var(--mt);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.notes||'—'}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn" style="height:23px;font-size:10px" onclick="trEditDeadline('${d.id}')"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-d" style="height:23px;font-size:10px;padding:0 6px" onclick="trDeleteDeadline('${d.id}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join(''):`<tr><td colspan="6" style="text-align:center;color:var(--ht);padding:22px">No deadlines yet. Add recurring semester deadlines here.</td></tr>`}</tbody>`;
}

function trRenderIssues(){
  const hub=trGetTransData();
  const issues=hub.issues||[];
  const priColor={urgent:'br2',high:'br2',medium:'ba2',low:'bm2'};
  const stColor={open:'br2',in_progress:'bb2',resolved:'bg2'};
  const stLabel={open:'Open',in_progress:'In Progress',resolved:'Resolved'};
  const el=document.getElementById('tr-issues-list');
  if(!issues.length){el.innerHTML=`<div class="card"><div style="padding:18px;text-align:center;color:var(--ht);font-size:12px"><i class="ti ti-circle-check" style="color:var(--gn);font-size:20px;display:block;margin:0 auto 6px"></i>No open issues — clean handoff!</div></div>`;return;}
  el.innerHTML=`<div class="card" style="padding:0;overflow:hidden"><div class="tw"><table class="tbl"><thead><tr><th>Issue</th><th>Owner</th><th>Priority</th><th>Status</th><th>Notes</th><th></th></tr></thead><tbody>
    ${issues.map(iss=>`<tr>
      <td style="font-weight:500">${iss.title}</td>
      <td style="color:var(--mt)">${iss.owner||'—'}</td>
      <td><span class="badge ${priColor[iss.priority]||'bm2'}">${iss.priority}</span></td>
      <td><span class="badge ${stColor[iss.status]||'bm2'}">${stLabel[iss.status]||iss.status}</span></td>
      <td style="color:var(--mt);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${iss.notes||'—'}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn" style="height:23px;font-size:10px" onclick="trEditIssue('${iss.id}')"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-d" style="height:23px;font-size:10px;padding:0 6px" onclick="trDeleteIssue('${iss.id}')"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join('')}
  </tbody></table></div></div>`;
}

function trRenderArchive(){
  const hub=trGetTransData();
  const arc=hub.archive||[];
  const el=document.getElementById('tr-archive-list');
  if(!arc.length){el.innerHTML=`<div class="card"><div style="padding:14px 15px;font-size:12px;color:var(--ht)">No archived semesters yet. Use "Archive Current Semester" at the end of each semester.</div></div>`;return;}
  el.innerHTML=arc.map(a=>`<div class="card" style="margin-bottom:9px">
    <div class="card-hd"><span class="card-t" style="font-size:12.5px;font-weight:600">${a.semester}</span><span style="font-size:10.5px;color:var(--mt)">Archived ${formatDateShort(a.date)}</span></div>
    <div style="display:flex;gap:18px;font-size:11.5px;color:var(--mt);margin-top:5px;flex-wrap:wrap">
      <span><i class="ti ti-users" style="font-size:11px;margin-right:3px"></i>${a.memberCount} members</span>
      <span><i class="ti ti-checkbox" style="font-size:11px;margin-right:3px"></i>${a.completedRoles} roles complete</span>
      <span><i class="ti ti-cash" style="font-size:11px;margin-right:3px"></i>${a.notes||'—'}</span>
    </div>
  </div>`).join('');
}

function trShowSection(id){
  const el=document.getElementById(id);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}

function trOpenFolder(encodedRole){
  const role=decodeURIComponent(encodedRole);
  TR_CURRENT=role;
  document.getElementById('tr-root-view').style.display='none';
  document.getElementById('tr-folder-view').style.display='';
  document.getElementById('tr-bc-name').textContent=role;

  const pos=EXEC_POSITIONS.find(p=>p.role===role);
  const tr=D.transitions.find(t=>t.role===role);
  const sl={not_started:'Not Started',in_progress:'In Progress',review:'In Review',complete:'Complete'};
  const sc={not_started:'bm2',in_progress:'bb2',review:'ba2',complete:'bg2'};
  const status=tr?tr.status:'not_started';
  const badge=document.getElementById('tr-role-status-badge');
  badge.className='badge '+sc[status];badge.textContent=sl[status];

  const memberFiles=D.files.filter(f=>f.folder===role);
  const iconMap={pdf:'ti-file-type-pdf',xlsx:'ti-file-spreadsheet',xls:'ti-file-spreadsheet',csv:'ti-file-spreadsheet',docx:'ti-file-type-doc',doc:'ti-file-type-doc',txt:'ti-file-text',png:'ti-photo',jpg:'ti-photo',jpeg:'ti-photo'};
  const colorMap={pdf:'color:var(--rd)',xlsx:'color:var(--gn)',xls:'color:var(--gn)',csv:'color:var(--gn)',docx:'color:var(--bl)',doc:'color:var(--bl)',txt:'color:var(--mt)',png:'color:var(--am)',jpg:'color:var(--am)',jpeg:'color:var(--am)'};

  // Build contacts list from stored transitions data
  const roleContacts=(tr&&tr.contacts)||[];
  const contactsHtml=roleContacts.length?roleContacts.map((c,ci)=>`<div class="sh-row">
    <div class="sh-av" style="background:var(--sky-bg);color:var(--sky-tx);font-size:9px;font-weight:700">${c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:500">${c.name}</div>
      <div style="font-size:10.5px;color:var(--mt)">${c.role||''}${c.email?' · '+c.email:''}${c.phone?' · '+c.phone:''}</div>
    </div>
    <button class="ib" style="width:22px;height:22px;font-size:11px;color:var(--rd)" onclick="trDeleteContact('${encodeURIComponent(role)}',${ci})" title="Remove"><i class="ti ti-x"></i></button>
  </div>`).join(''):`<div style="font-size:11.5px;color:var(--ht);padding:8px 0">No contacts added yet.</div>`;

  const posData=pos||{responsibilities:[],recurringTasks:[],wishIKnew:''};
  // Prefer stored user data over template defaults
  const responsibilities=(tr&&tr.responsibilities&&tr.responsibilities.length)?tr.responsibilities:posData.responsibilities;
  const recurringTasks=(tr&&tr.recurringTasks&&tr.recurringTasks.length)?tr.recurringTasks:posData.recurringTasks;

  document.getElementById('tr-folder-body').innerHTML=`
    <!-- Row 1: Outgoing/Incoming + Key Responsibilities -->
    <div class="g2" style="margin-bottom:13px">
      <!-- Handoff Details -->
      <div class="card">
        <div class="card-hd"><span class="card-t"><i class="ti ti-arrow-right-circle" style="font-size:12px;color:var(--sky-tx);margin-right:4px"></i>Handoff Details</span>
          <button class="btn" style="height:24px;font-size:10.5px" onclick="openEditTransCurrent()"><i class="ti ti-pencil"></i>Edit</button>
        </div>
        ${tr?`
        <div style="display:flex;flex-direction:column;gap:0">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bdr)">
            <span style="font-size:11.5px;color:var(--mt)">Outgoing Officer</span>
            <span style="font-size:12.5px;font-weight:600;color:var(--tx)">${tr.outgoing?getMember(tr.outgoing).name:'Not assigned'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bdr)">
            <span style="font-size:11.5px;color:var(--mt)">Incoming Officer</span>
            <span style="font-size:12.5px;font-weight:600;color:${tr.incoming?'var(--tx)':'var(--ht)'}">${tr.incoming?getMember(tr.incoming).name:'TBD'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bdr)">
            <span style="font-size:11.5px;color:var(--mt)">Status</span>
            <span class="badge ${sc[status]}">${sl[status]}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0">
            <span style="font-size:11.5px;color:var(--mt)">Notes / Docs</span>
            <span class="badge ${tr.content?'bg2':'br2'}">${tr.content?'Complete':'Missing'}</span>
          </div>
        </div>
        ${tr.content?`<div style="margin-top:11px;padding:10px 12px;background:#f8f8f7;border-radius:8px;font-size:12px;color:var(--tx);line-height:1.6;white-space:pre-wrap">${tr.content}</div>`:''}
        `:`<div style="padding:14px 0;font-size:12px;color:var(--mt)">No handoff doc created yet.</div>
        <button class="btn btn-p" onclick="openNewTransFor('${encodeURIComponent(role)}')"><i class="ti ti-plus"></i>Create Handoff Doc</button>`}
      </div>

      <!-- Key Responsibilities -->
      <div class="card">
        <div class="card-hd"><span class="card-t"><i class="ti ti-list" style="font-size:12px;color:var(--sky-tx);margin-right:4px"></i>Key Responsibilities</span>
          <button class="btn" style="height:24px;font-size:10.5px" onclick="trEditList('${encodeURIComponent(role)}','responsibilities')"><i class="ti ti-pencil"></i>Edit</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${responsibilities.map((r,i)=>`<div style="display:flex;align-items:flex-start;gap:9px;padding:7px 0;border-bottom:${i<responsibilities.length-1?'1px solid var(--bdr)':'none'}">
            <div style="width:20px;height:20px;border-radius:50%;background:var(--sky-bg);color:var(--sky-tx);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${i+1}</div>
            <div style="font-size:12px;line-height:1.5;color:var(--tx)">${r}</div>
          </div>`).join('')||'<div style="font-size:12px;color:var(--ht);padding:8px 0">No responsibilities defined. Click Edit to add.</div>'}
        </div>
      </div>
    </div>

    <!-- Row 2: Recurring Tasks + Wish I Knew -->
    <div class="g2" style="margin-bottom:13px">
      <!-- Recurring Tasks -->
      <div class="card">
        <div class="card-hd"><span class="card-t"><i class="ti ti-refresh" style="font-size:12px;color:var(--sky-tx);margin-right:4px"></i>Important Recurring Tasks</span>
          <button class="btn" style="height:24px;font-size:10.5px" onclick="trEditList('${encodeURIComponent(role)}','recurringTasks')"><i class="ti ti-pencil"></i>Edit</button>
        </div>
        ${recurringTasks.map(t=>`<div class="tk-row" style="padding:7px 0">
          <div class="tc" style="background:var(--gn);border-color:var(--gn);color:#fff;width:15px;height:15px;flex-shrink:0"><i class="ti ti-check" style="font-size:9px"></i></div>
          <span style="font-size:12px;color:var(--tx);line-height:1.5">${t}</span>
        </div>`).join('')||'<div style="font-size:12px;color:var(--ht);padding:8px 0">No recurring tasks defined. Click Edit to add.</div>'}
      </div>

      <!-- What I Wish I Knew -->
      <div class="card" style="background:linear-gradient(135deg,#f8f9ff 0%,#eef1fb 100%);border-color:#d0d8f0">
        <div class="card-hd"><span class="card-t" style="color:var(--sky-tx)"><i class="ti ti-bulb" style="font-size:12px;color:#f5a623;margin-right:4px"></i>What I Wish I Knew</span>
          <button class="btn" style="height:24px;font-size:10.5px" onclick="trEditWishIKnew('${encodeURIComponent(role)}')"><i class="ti ti-pencil"></i>Edit</button>
        </div>
        <p id="tr-wish-text-${role.replace(/\s+/g,'_')}" style="font-size:13px;line-height:1.8;color:var(--tx);font-style:${tr&&tr.wishIKnew?'normal':'italic'}">${(tr&&tr.wishIKnew)||posData.wishIKnew||'No advice written yet. Click Edit to add wisdom for your successor.'}</p>
      </div>
    </div>

    <!-- Row 3: Important Contacts + Key Documents -->
    <div class="g2" style="margin-bottom:13px">
      <!-- Important Contacts -->
      <div class="card">
        <div class="card-hd"><span class="card-t"><i class="ti ti-address-book" style="font-size:12px;color:var(--sky-tx);margin-right:4px"></i>Important Contacts</span>
          <button class="btn" style="height:24px;font-size:10.5px" onclick="trOpenAddContact('${encodeURIComponent(role)}')"><i class="ti ti-plus"></i>Add</button>
        </div>
        ${contactsHtml}
      </div>

      <!-- Key Documents / Files -->
      <div class="card">
        <div class="card-hd"><span class="card-t"><i class="ti ti-files" style="font-size:12px;color:var(--sky-tx);margin-right:4px"></i>Key Documents</span><span style="font-size:10.5px;color:var(--mt)">${memberFiles.length} file${memberFiles.length!==1?'s':''}</span></div>
        ${memberFiles.length?memberFiles.map(f=>{const ext=(f.name.split('.').pop()||'').toLowerCase();const icon=iconMap[ext]||'ti-file';const col=colorMap[ext]||'color:var(--ht)';return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr)">
          <i class="ti ${icon}" style="font-size:16px;${col};flex-shrink:0"></i>
          <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div><div style="font-size:10px;color:var(--mt)">${f.size} · ${formatDateShort(f.date)}</div></div>
          <button class="btn btn-d" style="height:22px;font-size:10px;padding:0 6px" onclick="fiDelete('${f.id}')"><i class="ti ti-trash"></i></button>
        </div>`;}).join(''):`<div style="font-size:11.5px;color:var(--ht);padding:8px 0">No files uploaded to this role folder.</div>`}
        <div style="margin-top:9px;border:2px dashed var(--bdr);border-radius:8px;padding:12px;text-align:center;cursor:pointer" onclick="rbacNav('files',null);fiOpenFolderUpload('${encodeURIComponent(role)}')">
          <i class="ti ti-upload" style="font-size:14px;color:var(--ht);display:block;margin-bottom:3px"></i>
          <div style="font-size:11px;color:var(--mt)">Upload to this folder</div>
        </div>
      </div>
    </div>
  `;
}

function trEditWishIKnew(encodedRole){
  const role=decodeURIComponent(encodedRole);
  let tr=D.transitions.find(t=>t.role===role);
  const pos=EXEC_POSITIONS.find(p=>p.role===role);
  const current=(tr&&tr.wishIKnew)||(pos&&pos.wishIKnew)||'';
  const newVal=prompt('Edit "What I Wish I Knew" for '+role+':\n(This advice will be shown to your successor)',current);
  if(newVal===null)return;
  if(!tr){tr={id:uid(),role,outgoing:CURRENT_USER?CURRENT_USER.mid:null,incoming:null,content:'',status:'in_progress',wishIKnew:newVal};D.transitions.push(tr);}
  else tr.wishIKnew=newVal;
  saveData();trOpenFolder(encodedRole);toast('Advice saved','success');
}

function trEditList(encodedRole, field){
  const role=decodeURIComponent(encodedRole);
  let tr=D.transitions.find(t=>t.role===role);
  const pos=EXEC_POSITIONS.find(p=>p.role===role);
  const posData=pos||{responsibilities:[],recurringTasks:[]};
  const current=tr&&tr[field]&&tr[field].length?tr[field]:posData[field]||[];
  const label=field==='responsibilities'?'Key Responsibilities':'Recurring Tasks';
  document.getElementById('tr-list-role-enc').value=encodedRole;
  document.getElementById('tr-list-field').value=field;
  document.getElementById('tr-list-modal-title').textContent='Edit '+label;
  document.getElementById('tr-list-textarea').value=current.join('\n');
  document.getElementById('tr-list-hint').textContent='One item per line.';
  document.getElementById('m-tr-list').classList.add('open');
}
function trSaveList(){
  const encodedRole=document.getElementById('tr-list-role-enc').value;
  const role=decodeURIComponent(encodedRole);
  const field=document.getElementById('tr-list-field').value;
  const lines=document.getElementById('tr-list-textarea').value.split('\n').map(l=>l.trim()).filter(Boolean);
  let tr=D.transitions.find(t=>t.role===role);
  if(!tr){tr={id:uid(),role,outgoing:CURRENT_USER?CURRENT_USER.mid:null,incoming:null,content:'',status:'not_started'};D.transitions.push(tr);}
  tr[field]=lines;
  saveData();closeM(null,document.getElementById('m-tr-list'));trOpenFolder(encodedRole);toast('Saved','success');
}
function trOpenAddContact(encodedRole){
  const role=decodeURIComponent(encodedRole);
  document.getElementById('tr-contact-role-enc').value=encodedRole;
  ['tr-c-name','tr-c-role','tr-c-email','tr-c-phone'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('m-tr-contact').classList.add('open');
}
function trSaveContact(){
  const encodedRole=document.getElementById('tr-contact-role-enc').value;
  const role=decodeURIComponent(encodedRole);
  const name=document.getElementById('tr-c-name').value.trim();
  if(!name){toast('Name is required','error');return;}
  let tr=D.transitions.find(t=>t.role===role);
  if(!tr){tr={id:uid(),role,outgoing:CURRENT_USER?CURRENT_USER.mid:null,incoming:null,content:'',status:'not_started',contacts:[]};D.transitions.push(tr);}
  if(!tr.contacts)tr.contacts=[];
  tr.contacts.push({name,role:document.getElementById('tr-c-role').value.trim(),email:document.getElementById('tr-c-email').value.trim(),phone:document.getElementById('tr-c-phone').value.trim()});
  saveData();closeM(null,document.getElementById('m-tr-contact'));trOpenFolder(encodedRole);toast('Contact added','success');
}
async function trDeleteContact(encodedRole,idx){
  if(!canWrite()){toast('You do not have permission to remove contacts.','error');return;}
  const ok=await confirmDialog('Remove Contact','Remove this contact from the role?');
  if(!ok)return;
  const role=decodeURIComponent(encodedRole);
  const tr=D.transitions.find(t=>t.role===role);
  if(tr&&tr.contacts){tr.contacts.splice(idx,1);saveData();trOpenFolder(encodedRole);toast('Contact removed','info');}
}
function trOpenAddDeadline(){
  document.getElementById('tr-dl-id').value='';
  document.getElementById('tr-dl-modal-title').textContent='Add Recurring Deadline';
  ['tr-dl-title','tr-dl-owner','tr-dl-when','tr-dl-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('tr-dl-pri').value='medium';
  document.getElementById('m-tr-deadline').classList.add('open');
}
function trEditDeadline(id){
  const hub=trGetTransData();
  const d=hub.deadlines.find(x=>x.id===id);if(!d)return;
  document.getElementById('tr-dl-id').value=id;
  document.getElementById('tr-dl-modal-title').textContent='Edit Deadline';
  document.getElementById('tr-dl-title').value=d.title;
  document.getElementById('tr-dl-owner').value=d.owner;
  document.getElementById('tr-dl-when').value=d.when;
  document.getElementById('tr-dl-pri').value=d.priority;
  document.getElementById('tr-dl-notes').value=d.notes||'';
  document.getElementById('m-tr-deadline').classList.add('open');
}
function trSaveDeadline(){
  const title=document.getElementById('tr-dl-title').value.trim();
  if(!title){toast('Title required','error');return;}
  const hub=trGetTransData();
  const id=document.getElementById('tr-dl-id').value;
  const data={title,owner:document.getElementById('tr-dl-owner').value.trim(),when:document.getElementById('tr-dl-when').value.trim(),priority:document.getElementById('tr-dl-pri').value,notes:document.getElementById('tr-dl-notes').value.trim()};
  if(id){const d=hub.deadlines.find(x=>x.id===id);if(d)Object.assign(d,data);}
  else hub.deadlines.push({id:uid(),...data});
  saveData();closeM(null,document.getElementById('m-tr-deadline'));trRenderDeadlines();toast('Deadline saved','success');
}
async function trDeleteDeadline(id){
  if(!canWrite()){toast('You do not have permission to delete deadlines.','error');return;}
  const ok=await confirmDialog('Delete Deadline','Remove this recurring deadline?','Delete',true);
  if(!ok)return;
  const hub=trGetTransData();hub.deadlines=hub.deadlines.filter(d=>d.id!==id);
  saveData();trRenderDeadlines();toast('Deleted','info');
}

function trOpenAddIssue(){
  document.getElementById('tr-iss-id').value='';
  document.getElementById('tr-iss-modal-title').textContent='Add Open Issue';
  ['tr-iss-title','tr-iss-owner','tr-iss-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('tr-iss-pri').value='medium';
  document.getElementById('tr-iss-status').value='open';
  document.getElementById('m-tr-issue').classList.add('open');
}
function trEditIssue(id){
  const hub=trGetTransData();
  const iss=hub.issues.find(x=>x.id===id);if(!iss)return;
  document.getElementById('tr-iss-id').value=id;
  document.getElementById('tr-iss-modal-title').textContent='Edit Issue';
  document.getElementById('tr-iss-title').value=iss.title;
  document.getElementById('tr-iss-owner').value=iss.owner||'';
  document.getElementById('tr-iss-pri').value=iss.priority;
  document.getElementById('tr-iss-status').value=iss.status;
  document.getElementById('tr-iss-notes').value=iss.notes||'';
  document.getElementById('m-tr-issue').classList.add('open');
}
function trSaveIssue(){
  const title=document.getElementById('tr-iss-title').value.trim();
  if(!title){toast('Issue title required','error');return;}
  const hub=trGetTransData();
  const id=document.getElementById('tr-iss-id').value;
  const data={title,owner:document.getElementById('tr-iss-owner').value.trim(),priority:document.getElementById('tr-iss-pri').value,status:document.getElementById('tr-iss-status').value,notes:document.getElementById('tr-iss-notes').value.trim()};
  if(id){const iss=hub.issues.find(x=>x.id===id);if(iss)Object.assign(iss,data);}
  else hub.issues.push({id:uid(),...data});
  saveData();closeM(null,document.getElementById('m-tr-issue'));trRenderIssues();toast('Issue saved','success');
}
async function trDeleteIssue(id){
  if(!canWrite()){toast('You do not have permission to delete issues.','error');return;}
  const ok=await confirmDialog('Delete Issue','Remove this open issue?','Delete',true);
  if(!ok)return;
  const hub=trGetTransData();hub.issues=hub.issues.filter(i=>i.id!==id);
  saveData();trRenderIssues();toast('Deleted','info');
}

async function trArchiveSemester(){
  if(!canWrite()){toast('You do not have permission to archive semesters.','error');return;}
  const sem=getSemester();
  const ok=await confirmDialog('Archive Semester','Archive '+sem+'? A snapshot of current transition progress will be saved. You can still edit everything after archiving.','Archive',false);
  if(!ok)return;
  const hub=trGetTransData();
  hub.archive.unshift({id:uid(),semester:sem,date:new Date().toISOString().split('T')[0],memberCount:D.members.length,completedRoles:D.transitions.filter(t=>t.status==='complete').length,notes:''});
  saveData();trRenderArchive();toast(sem+' archived','success');
}

function trPrintRole(){
  if(!TR_CURRENT)return;
  const role=TR_CURRENT;
  const pos=EXEC_POSITIONS.find(p=>p.role===role);
  const tr=D.transitions.find(t=>t.role===role);
  const posData=pos||{responsibilities:[],recurringTasks:[],wishIKnew:''};
  const w=window.open('','_blank','width=800,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>${role} Transition Doc</title><style>
    body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:32px;font-size:13px;color:#1a1a18;line-height:1.6;max-width:720px}
    .header{background:#0c1d56;color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px}
    h1{font-size:20px;font-weight:700;margin:0 0 5px}
    .meta{font-size:11px;opacity:.75;display:flex;gap:16px;flex-wrap:wrap}
    h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b6b68;margin:0 0 8px;border-top:1px solid #e5e5e3;padding-top:12px}
    li{margin-bottom:4px;line-height:1.5}
    .box{background:#f8f8f7;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;line-height:1.7}
    @media print{body{padding:16px}}
  </style></head><body>
  <div class="header">
    <h1>${role} — Transition Document</h1>
    <div class="meta">
      <span>Outgoing: ${tr&&tr.outgoing?getMember(tr.outgoing).name:'—'}</span>
      <span>Incoming: ${tr&&tr.incoming?getMember(tr.incoming).name:'TBD'}</span>
      <span>Semester: ${getSemester()}</span>
    </div>
  </div>
  <h3>Key Responsibilities</h3><ul>${posData.responsibilities.map(r=>`<li>${r}</li>`).join('')}</ul>
  <h3>Recurring Tasks</h3><ul>${posData.recurringTasks.map(t=>`<li>${t}</li>`).join('')}</ul>
  ${tr&&tr.content?`<h3>Handoff Notes</h3><div class="box">${tr.content}</div>`:''}
  <h3>What I Wish I Knew</h3><div class="box">${(tr&&tr.wishIKnew)||posData.wishIKnew||'No advice written.'}</div>
  <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e5e5e3;font-size:10px;color:#aaa">ATO Beta Chapter · Printed ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
  </body></html>`);
  w.document.close();setTimeout(()=>w.print(),400);
}

function openNewTransFor(encodedRole){
  const role=decodeURIComponent(encodedRole);
  document.getElementById('ntr-r').value=role;
  const o=document.getElementById('ntr-o');o.innerHTML='<option value="">— Unassigned —</option>'+memberSelectOptions();
  document.getElementById('m-addtrans').classList.add('open');
}
function openEditTransCurrent(){
  if(!TR_CURRENT)return;
  const tr=D.transitions.find(t=>t.role===TR_CURRENT);
  if(tr)openEditTrans(tr.id);
  else openNewTransFor(encodeURIComponent(TR_CURRENT));
}


// ── ACADEMICS ──
function gpaColor(gpa){
  if(gpa===null||gpa===undefined||gpa==='')return'gpa-none';
  const g=parseFloat(gpa);
  if(g>=3.5)return'gpa-high';
  if(g>=3.0)return'gpa-good';
  if(g>=2.75)return'gpa-warn';
  return'gpa-risk';
}
function gpaTrend(gpa){
  const g=parseFloat(gpa);
  if(isNaN(g))return'';
  if(g>=3.5)return'<span style="color:var(--gn);font-size:10px">Dean\'s List</span>';
  if(g>=3.0)return'<span style="color:var(--bl);font-size:10px">Good Standing</span>';
  if(g>=2.75)return'<span style="color:var(--am);font-size:10px">Watch</span>';
  return'<span style="color:var(--rd);font-size:10px;font-weight:600">Academic Warning</span>';
}

function openUpdateGpa(){
  const sem=document.getElementById('gpa-semester');
  if(sem)sem.value=getSemester();
  filterGpaModal();
  openM('m-updategpa');
}

function gpaVal(id,field){
  const rec=D.academics.gpas[id]||{};
  return rec[field]||'';
}

function filterGpaModal(){
  const q=(document.getElementById('gpa-search')||{value:''}).value.toLowerCase();
  const cls=(document.getElementById('gpa-class-filter')||{value:'all'}).value;
  const members=D.members.filter(m=>{
    if(cls!=='all'&&m.classYear!==cls)return false;
    return m.name.toLowerCase().includes(q)||m.role.toLowerCase().includes(q);
  }).sort((a,b)=>a.name.localeCompare(b.name));
  const list=document.getElementById('gpa-modal-list');
  if(!list)return;

  function inp(id,field,label){
    const v=gpaVal(id,field);
    return`<input type="number" id="gpa-${field}-${id}" step="0.01" min="0" max="4" value="${v}" placeholder="—"
      title="${label}"
      style="width:68px;height:28px;padding:0 6px;border:1px solid var(--bdr);border-radius:6px;font-size:11.5px;font-family:inherit;text-align:center;outline:none;transition:border .1s"
      onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='var(--bdr)'">`;
  }

  list.innerHTML=members.map(m=>{
    const cumV=gpaVal(m.id,'cumulativeGpa');
    const priV=gpaVal(m.id,'priorGpa');
    // Warning flag: use semester GPA if present, else cumulative
    const isWarn=cumV&&parseFloat(cumV)<2.75||priV&&parseFloat(priV)<2.75;
    return`<div style="display:grid;grid-template-columns:1fr 68px 68px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--bdr);${isWarn?'background:var(--rd-bg);margin:0 -2px;padding:6px 4px;border-radius:5px;':''}">
      <div style="display:flex;align-items:center;gap:8px;min-width:0">
        <div class="sh-av" style="width:24px;height:24px;font-size:8.5px;flex-shrink:0">${m.initials}</div>
        <div style="min-width:0">
          <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div>
          <div style="font-size:10px;color:var(--mt)">${m.classYear}</div>
        </div>
      </div>
      ${inp(m.id,'cumulativeGpa','Cumulative GPA')}
      ${inp(m.id,'priorGpa','Last Semester GPA')}
    </div>`;
  }).join('');
}

function saveGPAs(){
  if(!D.academics)D.academics={gpas:{},history:[]};
  const members=D.members;
  let changed=0;

  function parseGpa(v){
    if(!v||v.trim()==='')return null;
    const g=parseFloat(v);
    if(isNaN(g)||g<0||g>4)return 'err';
    return(Math.round(g*100)/100).toString();
  }

  for(const m of members){
    const cumV=parseGpa((document.getElementById('gpa-cumulativeGpa-'+m.id)||{value:''}).value);
    const priV=parseGpa((document.getElementById('gpa-priorGpa-'+m.id)||{value:''}).value);
    if(cumV==='err'||priV==='err'){toast('Invalid GPA for '+m.name+': must be 0.00–4.00','error');return;}
    const cur=D.academics.gpas[m.id]||{};
    const updated={
      semesterGpa:'',
      cumulativeGpa: cumV!==null?cumV:(cur.cumulativeGpa||''),
      priorGpa: priV!==null?priV:(cur.priorGpa||''),
    };
    if(JSON.stringify(cur)!==JSON.stringify(updated)){changed++;D.academics.gpas[m.id]=updated;}
  }

  // Snapshot: chapter GPA = avg of LAST SEMESTER GPAs
  const priorGpas=members.map(m=>(D.academics.gpas[m.id]||{}).priorGpa).filter(v=>v&&v!=='').map(v=>parseFloat(v)).filter(g=>!isNaN(g));
  const useGpas=priorGpas;

  if(useGpas.length){
    const avg=(useGpas.reduce((a,b)=>a+b,0)/useGpas.length).toFixed(3);
    const sem=(document.getElementById('gpa-semester')||{value:getSemester()}).value||getSemester();
    const cumGpas=members.map(m=>(D.academics.gpas[m.id]||{}).cumulativeGpa).filter(v=>v&&v!=='').map(v=>parseFloat(v)).filter(g=>!isNaN(g));
    const cumAvg=cumGpas.length?(cumGpas.reduce((a,b)=>a+b,0)/cumGpas.length).toFixed(3):null;
    const existing=D.academics.history.findIndex(h=>h.semester===sem);
    const entry={semester:sem,chapterGpa:avg,cumulativeChapterGpa:cumAvg,memberCount:useGpas.length,date:new Date().toISOString().split('T')[0]};
    if(existing>=0)D.academics.history[existing]=entry;
    else D.academics.history.unshift(entry);
  }

  saveData();
  closeM(null,document.getElementById('m-updategpa'));
  renderAcademics();
  toast('GPAs updated for '+changed+' member'+(changed!==1?'s':'')+(changed===0?' (no changes)':''),changed?'success':'info');
}

function filterAc(){
  const q=(document.getElementById('ac-search')||{value:''}).value.toLowerCase();
  const cls=(document.getElementById('ac-filter')||{value:'all'}).value;
  document.querySelectorAll('#ac-table tbody tr').forEach(tr=>{
    const matchQ=(tr.dataset.name||'').toLowerCase().includes(q);
    const matchC=cls==='all'||(tr.dataset.class||'')===cls;
    tr.style.display=(matchQ&&matchC)?'':'none';
  });
}

function acCanAccess(){
  if(!CURRENT_USER) return false;
  if(CURRENT_USER.role==='admin') return true;
  return ['President','Vice President','Scholarship Chair','Risk Manager'].includes(CURRENT_USER.title);
}

function renderAcademics(){
  const gate=document.getElementById('ac-gate');
  const content=document.getElementById('ac-content');
  if(!acCanAccess()){
    if(gate) gate.style.display='block';
    if(content) content.style.display='none';
    return;
  }
  if(gate) gate.style.display='none';
  if(content) content.style.display='';
  if(!D.academics)D.academics={gpas:{},history:[]};

  // Build member GPA objects with all three values
  function getMemberGpas(m){
    const rec=D.academics.gpas[m.id]||{};
    const sem=rec.semesterGpa&&rec.semesterGpa!==''?parseFloat(rec.semesterGpa):null;
    const cum=rec.cumulativeGpa&&rec.cumulativeGpa!==''?parseFloat(rec.cumulativeGpa):null;
    const pri=rec.priorGpa&&rec.priorGpa!==''?parseFloat(rec.priorGpa):null;
    return{m,sem,cum,pri,hasAny:sem!==null||cum!==null||pri!==null};
  }
  const allMemberGpas=D.members.map(getMemberGpas);
  const withAny=allMemberGpas.filter(x=>x.hasAny);

  // Chapter GPA = prior semester avg (per spec); fallback to semester avg
  const hist=D.academics.history;
  const latestHist=hist[0]||null;
  const chapterGpaDisplay=latestHist?parseFloat(latestHist.chapterGpa).toFixed(2):null;

  // For KPIs: use semester GPA if present for warnings/deans list (current standing)
  const withCum=allMemberGpas.filter(x=>x.cum!==null);
  const withPri=allMemberGpas.filter(x=>x.pri!==null);
  const deansList=withCum.filter(x=>x.cum>=3.5).length;
  const goodStand=withCum.filter(x=>x.cum>=3.0&&x.cum<3.5).length;
  // Warning: flag by cumulative, or last semester if no cumulative
  const warnMembers=withAny.filter(x=>{
    const check=x.cum!==null?x.cum:(x.pri!==null?x.pri:null);
    return check!==null&&check<2.75;
  });

  // KPIs
  document.getElementById('ac-kpi').innerHTML=
    kpi('Chapter GPA',chapterGpaDisplay||'—',latestHist?'Prior semester · '+latestHist.semester:'No history yet — save GPAs to record','neutral')+
    kpi("Dean's List",deansList,'3.50 and above (cumulative)',deansList>0?'up':'neutral')+
    kpi('Good Standing',goodStand,'3.00 – 3.49 (cumulative)','neutral')+
    kpi('Academic Warnings',warnMembers.length,'Below 2.75',warnMembers.length>0?'down':'neutral');

  // Sort by cumulative GPA descending for ranking, then semester, then prior
  const ranked=[...withAny].sort((a,b)=>{
    const ag=a.cum??a.pri??0;
    const bg=b.cum??b.pri??0;
    return bg-ag;
  });
  const noGpa=allMemberGpas.filter(x=>!x.hasAny);

  // Main table
  document.getElementById('ac-table').innerHTML=`<thead><tr>
    <th>#</th><th>Member</th><th>Class</th>
    <th style="text-align:center">Cumulative GPA</th>
    <th style="text-align:center">Last Semester</th>
    <th>Status</th>
  </tr></thead><tbody>${[
    ...ranked.map((x,i)=>({...x,rank:i+1})),
    ...noGpa.map(x=>({...x,rank:null}))
  ].map(row=>{
    const warn=(row.cum!==null&&row.cum<2.75)||(row.cum===null&&row.pri!==null&&row.pri<2.75);
    const statusGpa=row.cum??row.pri??null;
    return`<tr data-name="${row.m.name}" data-class="${row.m.classYear}"${warn?' style="background:var(--rd-bg)"':''}>
      <td style="color:var(--ht);font-size:11px">${row.rank||'—'}</td>
      <td><div style="display:flex;align-items:center;gap:7px">
        <div class="sh-av" style="width:24px;height:24px;font-size:8.5px${warn?';background:var(--rd);color:#fff':''}">${row.m.initials}</div>
        <span style="font-weight:500">${row.m.name}</span>
      </div></td>
      <td style="color:var(--mt)">${row.m.classYear}</td>
      <td style="text-align:center"><span class="gpa-badge ${gpaColor(row.cum)}">${row.cum!==null?row.cum.toFixed(2):'—'}</span></td>
      <td style="text-align:center"><span class="gpa-badge ${gpaColor(row.pri)}">${row.pri!==null?row.pri.toFixed(2):'—'}</span></td>
      <td>${gpaTrend(statusGpa)}</td>
    </tr>`;
  }).join('')}</tbody>`;

  // Top 5 by cumulative GPA
  const top=ranked.slice(0,5);
  document.getElementById('ac-top').innerHTML=top.length?top.map((x,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bdr)">
      <div class="ac-rank ac-rank-${i+1}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500">${x.m.name}</div>
        <div style="font-size:10px;color:var(--mt)">${x.m.classYear}</div>
      </div>
      <div style="text-align:right">
        ${x.cum!==null?`<span class="gpa-badge gpa-high" style="display:block;margin-bottom:2px">${x.cum.toFixed(2)} cum</span>`:''}
        ${x.pri!==null?`<span class="gpa-badge gpa-good" style="display:block">${x.pri.toFixed(2)} last sem</span>`:''}
      </div>
    </div>`).join(''):'<div style="color:var(--ht);font-size:12px;padding:8px 0;text-align:center">No GPAs entered yet</div>';

  // Warnings panel
  const warnEl=document.getElementById('ac-warn');
  const warnEmpty=document.getElementById('ac-warn-empty');
  if(warnMembers.length){
    warnEmpty.style.display='none';
    warnEl.innerHTML=warnMembers.sort((a,b)=>{
      const ag=a.cum??a.pri??4;const bg=b.cum??b.pri??4;return ag-bg;
    }).map(x=>`
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bdr)">
        <div class="sh-av" style="width:24px;height:24px;font-size:8.5px;background:var(--rd);color:#fff">${x.m.initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500">${x.m.name}</div>
          <div style="font-size:10px;color:var(--mt)">${x.m.classYear}</div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:2px">
          ${x.cum!==null?`<span class="gpa-badge gpa-risk" style="font-size:9px">${x.cum.toFixed(2)} cum</span>`:''}
          ${x.pri!==null?`<span class="gpa-badge ${gpaColor(x.pri)}" style="font-size:9px">${x.pri.toFixed(2)} last sem</span>`:''}
        </div>
      </div>`).join('');
  } else {
    warnEmpty.style.display='block';
    warnEmpty.innerHTML=es('ti-circle-check','green','All in good standing','No members below the 2.75 GPA threshold.','');
    warnEl.innerHTML='';
  }

  // Distribution (based on semester GPA; fallback to cumulative)
  const distGpas=withAny.map(x=>x.cum??x.pri??null).filter(g=>g!==null);
  const buckets=[
    {label:"3.50 – 4.00 (Dean's List)",min:3.5,max:4.01,color:'var(--gn)'},
    {label:'3.00 – 3.49 (Good Standing)',min:3.0,max:3.5,color:'var(--bl)'},
    {label:'2.75 – 2.99 (Watch)',min:2.75,max:3.0,color:'var(--am)'},
    {label:'Below 2.75 (Warning)',min:0,max:2.75,color:'var(--rd)'},
  ];
  document.getElementById('ac-dist').innerHTML=buckets.map(b=>{
    const n=distGpas.filter(g=>g>=b.min&&g<b.max).length;
    const pct=distGpas.length?Math.round(n/distGpas.length*100):0;
    return`<div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span style="color:var(--mt)">${b.label}</span><span style="font-weight:500">${n}</span>
      </div>
      <div class="pb"><div class="pf" style="width:${pct}%;background:${b.color}"></div></div>
    </div>`;
  }).join('');

  // History table
  const histEl=document.getElementById('ac-history');
  const histEmpty=document.getElementById('ac-history-empty');
  if(hist.length){
    histEmpty.style.display='none';
    histEl.innerHTML=`<div class="tw"><table class="tbl">
      <thead><tr>
        <th>Semester</th>
        <th style="text-align:center">Chapter GPA<br><span style="font-weight:400;font-size:9px;color:var(--ht)">(last sem avg)</span></th>
        <th style="text-align:center">Cumulative Avg</th>
        <th>Members</th><th>Updated</th><th>vs Prior</th>
      </tr></thead>
      <tbody>${hist.map((h,i)=>{
        const prior=hist[i+1];
        let delta='';
        if(prior){const d=(parseFloat(h.chapterGpa)-parseFloat(prior.chapterGpa));delta=`<span style="color:${d>=0?'var(--gn)':'var(--rd)'}">${d>=0?'↑':'↓'}${Math.abs(d).toFixed(3)}</span>`;}
        return`<tr>
          <td style="font-weight:500">${h.semester}</td>
          <td style="text-align:center"><span class="gpa-badge ${gpaColor(h.chapterGpa)}">${parseFloat(h.chapterGpa).toFixed(2)}</span></td>
          <td style="text-align:center">${h.cumulativeChapterGpa?`<span class="gpa-badge ${gpaColor(h.cumulativeChapterGpa)}">${parseFloat(h.cumulativeChapterGpa).toFixed(2)}</span>`:'<span style="color:var(--ht)">—</span>'}</td>
          <td style="color:var(--mt)">${h.memberCount}</td>
          <td style="color:var(--ht)">${formatDateShort(h.date)}</td>
          <td>${delta||'<span style="color:var(--ht)">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  } else {
    histEmpty.style.display='block';
    histEmpty.innerHTML=es('ti-chart-line','blue','No GPA history yet','Use "Update GPAs" each semester to build a historical record of chapter academic performance.','');
    histEl.innerHTML='';
  }
}

// ═══════════════════════════════════════════
// RECRUITMENT CRM
// ═══════════════════════════════════════════

