/* OpsCore 2.0 Demo — CSV Import (Members, Grades, Tasks)
   Client-side only: parses the file in the browser and merges rows straight into the
   in-memory demo store D. No network calls, no Firebase — saveData() is a demo no-op. */

let _importType = null; // 'members' | 'grades' | 'tasks'
let _importRows = [];   // parsed rows staged for commit
let _lastCsvText = null; // cached for update-mode toggle re-parse

function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// ── ENTRY POINTS ──

function openImportModal(type) {
  const allowed = type === 'members' ? canEditMembers()
    : type === 'grades' ? acCanAccess()
    : canWrite();
  if (!allowed) { toast('You do not have permission to import this data.', 'error'); return; }
  _importType = type;
  _importRows = [];
  const titles = { members: 'Import Members', grades: 'Import Grades', tasks: 'Import Tasks', mentorAgenda: 'Import Mentor Program Agenda' };
  const instructions = {
    members: `Upload a CSV with these columns (header row required):<br><strong>Name</strong> (required), <em>Grad Year</em>, <em>Class Year</em>, <em>Role</em>, <em>Live In</em>, <em>Major</em>, <em>Email</em>, <em>Phone</em>, <em>Hometown</em><br><span style="color:var(--ht)">Toggle "Update existing members" below to overwrite info for names already in the roster.</span>`,
    grades:  `Upload a CSV with these columns (header row required):<br><strong>Name</strong> (required), <em>Cumulative GPA</em>, <em>Semester GPA</em><br><span style="color:var(--ht)">Members must already exist in the roster. Unmatched names are skipped.</span>`,
    tasks:   `Upload a CSV with these columns (header row required):<br><strong>Title</strong> (required), <em>Assigned To</em>, <em>Priority</em>, <em>Due Date</em>, <em>Description</em><br><span style="color:var(--ht)">Tasks with matching titles already on the board are skipped. "Assigned To" must match a member name.</span>`,
    mentorAgenda: `Upload a CSV with these columns (header row required):<br><strong>Week</strong> (required), <strong>Topic</strong> (required), <em>Discussion Points</em><br><span style="color:var(--ht)">This replaces the entire existing agenda — it's meant for uploading the full week-by-week curriculum at once, not appending single weeks.</span>`,
  };
  document.getElementById('imp-title').textContent = titles[type] || 'Import';
  document.getElementById('imp-instructions').innerHTML = instructions[type] || '';
  document.getElementById('imp-preview').innerHTML = '';
  document.getElementById('imp-commit').style.display = 'none';
  document.getElementById('imp-file').value = '';
  document.getElementById('imp-fname').textContent = '';
  _lastCsvText = null;
  const toggleDiv = document.getElementById('imp-update-toggle');
  if (toggleDiv) toggleDiv.style.display = type === 'members' ? '' : 'none';
  const updateCb = document.getElementById('imp-update-mode');
  if (updateCb) updateCb.checked = false;
  openM('m-import');
}

// ── FILE INPUT HANDLER ──

function impHandleFile(input) {
  const file = input.files[0];
  if (!file) return;
  const fnEl = document.getElementById('imp-fname');
  if (fnEl) fnEl.textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => { _lastCsvText = e.target.result; impPreview(_lastCsvText); };
  reader.readAsText(file);
}

// ── CSV PARSING ──

function impParseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = impSplitLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z ]/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = impSplitLine(lines[i]);
    if (vals.every(v => !v.trim())) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

function impSplitLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function impCol(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

function impNormClassYear(val) {
  const v = (val || '').trim().toLowerCase();
  if (v.startsWith('se')) return 'Senior';
  if (v.startsWith('ju')) return 'Junior';
  if (v.startsWith('so')) return 'Sophomore';
  if (v.startsWith('fr')) return 'Freshman';
  return 'Junior';
}

function impClassYearFromGradYear(gradYear) {
  const yr = parseInt(gradYear);
  if (!yr) return 'Junior';
  const now = new Date().getFullYear();
  const diff = yr - now;
  if (diff <= 1) return 'Senior';
  if (diff === 2) return 'Junior';
  if (diff === 3) return 'Sophomore';
  return 'Freshman';
}

// ── PREVIEW ──

function impPreview(text) {
  const { rows } = impParseCSV(text);
  const preview = document.getElementById('imp-preview');
  const commitBtn = document.getElementById('imp-commit');

  if (!rows.length) {
    preview.innerHTML = `<div style="color:var(--rd);font-size:12px;padding:8px 0">No data rows found. Make sure the file has a header row and at least one data row.</div>`;
    commitBtn.style.display = 'none';
    return;
  }

  _importRows = _importType === 'members' ? impBuildMemberRows(rows, preview)
    : _importType === 'tasks' ? impBuildTaskRows(rows, preview)
    : _importType === 'mentorAgenda' ? impBuildMentorAgendaRows(rows, preview)
    : impBuildGradeRows(rows, preview);

  if (_importRows.length > 0) {
    commitBtn.style.display = '';
    commitBtn.textContent = `Import ${_importRows.length} Record${_importRows.length !== 1 ? 's' : ''}`;
  } else {
    commitBtn.style.display = 'none';
  }
}

function impToggleUpdate() {
  if (_lastCsvText) impPreview(_lastCsvText);
}

function impBuildMemberRows(rows, previewEl) {
  const updateMode = document.getElementById('imp-update-mode')?.checked;
  const toAdd = [], toUpdate = [], skipped = [];

  rows.forEach(row => {
    const name = impCol(row, 'name', 'full name', 'member name');
    if (!name) { skipped.push('(blank name)'); return; }
    const existing = D.members.find(m => m.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (existing && !updateMode) { skipped.push(name + ' — already in roster'); return; }
    const gradYearRaw = impCol(row, 'grad year', 'graduation year', 'grad', 'graduation');
    const classYearRaw = impCol(row, 'class year', 'class', 'year in school', 'standing', 'academic year');
    const classYear = classYearRaw ? impNormClassYear(classYearRaw)
      : (gradYearRaw ? impClassYearFromGradYear(gradYearRaw) : existing ? existing.classYear : 'Junior');
    const role = impCol(row, 'role', 'position', 'title', 'officer') || (existing ? existing.role : 'Member');
    const liveInRaw = impCol(row, 'live in', 'lives in', 'livein', 'house resident', 'in house');
    const liveIn = liveInRaw ? /^(yes|true|1|y)$/i.test(liveInRaw.trim()) : (existing ? existing.liveIn : false);
    const major = impCol(row, 'major', 'field of study', 'program', 'concentration') || (existing ? existing.major||'' : '');
    const email = impCol(row, 'email', 'email address', 'e-mail') || (existing ? existing.email||'' : '');
    const phone = impCol(row, 'phone', 'phone number', 'cell', 'mobile', 'telephone') || (existing ? existing.phone||'' : '');
    const hometown = impCol(row, 'hometown', 'home town', 'home city', 'city', 'from') || (existing ? existing.hometown||'' : '');
    const ini = name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
    const gradYear = gradYearRaw ? +gradYearRaw : (existing ? existing.year : new Date().getFullYear() + 2);
    if (existing) {
      toUpdate.push({ _update: true, id: existing.id, name, year: gradYear, classYear, liveIn, role, initials: ini, major, email, phone, hometown });
    } else {
      toAdd.push({ id: uid(), name, year: gradYear, classYear, liveIn, role, initials: ini, major, email, phone, hometown });
    }
  });

  const th = `<thead><tr style="background:var(--surf2)"><th style="padding:5px 8px;text-align:left">Name</th><th style="padding:5px 8px;text-align:left">Major</th><th style="padding:5px 8px;text-align:left">Email</th><th style="padding:5px 8px;text-align:left">Class</th><th style="padding:5px 8px;text-align:left">Role</th></tr></thead>`;
  let html = '';
  if (toUpdate.length) {
    html += `<div style="font-size:12px;font-weight:600;color:var(--gold);margin-bottom:6px">${toUpdate.length} member${toUpdate.length !== 1 ? 's' : ''} to update:</div>`;
    html += `<div style="max-height:150px;overflow-y:auto;border:1px solid var(--bdr);border-radius:7px;margin-bottom:10px"><table style="width:100%;border-collapse:collapse;font-size:11.5px">${th}<tbody>`;
    toUpdate.forEach((m, i) => {
      const bg = i % 2 === 0 ? 'var(--surf)' : 'var(--surf2)';
      html += `<tr style="background:${bg}"><td style="padding:5px 8px">${esc(m.name)}</td><td style="padding:5px 8px">${esc(m.major||'—')}</td><td style="padding:5px 8px;font-size:10.5px">${esc(m.email||'—')}</td><td style="padding:5px 8px">${esc(m.classYear)}</td><td style="padding:5px 8px">${esc(m.role)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  if (toAdd.length) {
    html += `<div style="font-size:12px;font-weight:600;color:var(--gn);margin-bottom:6px">${toAdd.length} new member${toAdd.length !== 1 ? 's' : ''} to add:</div>`;
    html += `<div style="max-height:150px;overflow-y:auto;border:1px solid var(--bdr);border-radius:7px"><table style="width:100%;border-collapse:collapse;font-size:11.5px">${th}<tbody>`;
    toAdd.forEach((m, i) => {
      const bg = i % 2 === 0 ? 'var(--surf)' : 'var(--surf2)';
      html += `<tr style="background:${bg}"><td style="padding:5px 8px">${esc(m.name)}</td><td style="padding:5px 8px">${esc(m.major||'—')}</td><td style="padding:5px 8px;font-size:10.5px">${esc(m.email||'—')}</td><td style="padding:5px 8px">${esc(m.classYear)}</td><td style="padding:5px 8px">${esc(m.role)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  if (skipped.length) {
    html += `<div style="font-size:11.5px;color:var(--ht);margin-top:8px"><strong>${skipped.length} skipped:</strong> ${skipped.map(s => esc(s)).join('; ')}</div>`;
  }
  previewEl.innerHTML = html;
  return [...toUpdate, ...toAdd];
}

function impBuildGradeRows(rows, previewEl) {
  const toUpdate = [], skipped = [];
  const membersByName = {};
  D.members.forEach(m => { membersByName[m.name.toLowerCase().trim()] = m; });

  rows.forEach(row => {
    const name = impCol(row, 'name', 'full name', 'member name', 'member');
    if (!name) { skipped.push('(blank name)'); return; }
    const member = membersByName[name.toLowerCase().trim()];
    if (!member) { skipped.push(name + ' — not in roster'); return; }
    const cumRaw = impCol(row, 'cumulative gpa', 'cumulative', 'cum gpa', 'gpa', 'overall gpa', 'cgpa');
    const semRaw = impCol(row, 'semester gpa', 'semester', 'sem gpa', 'prior gpa', 'term gpa', 'last semester', 'sgpa');
    const cumGpa = cumRaw ? parseFloat(cumRaw) : NaN;
    const semGpa = semRaw ? parseFloat(semRaw) : NaN;
    if (isNaN(cumGpa) && isNaN(semGpa)) { skipped.push(name + ' — no valid GPA values'); return; }
    toUpdate.push({ member, cumGpa: isNaN(cumGpa) ? null : cumGpa, semGpa: isNaN(semGpa) ? null : semGpa });
  });

  let html = '';
  if (toUpdate.length) {
    html += `<div style="font-size:12px;font-weight:600;color:var(--gn);margin-bottom:6px">${toUpdate.length} member${toUpdate.length !== 1 ? 's' : ''} to update:</div>`;
    html += `<div style="max-height:180px;overflow-y:auto;border:1px solid var(--bdr);border-radius:7px"><table style="width:100%;border-collapse:collapse;font-size:11.5px">`;
    html += `<thead><tr style="background:var(--surf2)"><th style="padding:5px 8px;text-align:left">Name</th><th style="padding:5px 8px;text-align:left">Cumulative GPA</th><th style="padding:5px 8px;text-align:left">Semester GPA</th></tr></thead><tbody>`;
    toUpdate.forEach((u, i) => {
      const bg = i % 2 === 0 ? 'var(--surf)' : 'var(--surf2)';
      html += `<tr style="background:${bg}"><td style="padding:5px 8px">${esc(u.member.name)}</td><td style="padding:5px 8px">${u.cumGpa !== null ? u.cumGpa.toFixed(2) : '—'}</td><td style="padding:5px 8px">${u.semGpa !== null ? u.semGpa.toFixed(2) : '—'}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  if (skipped.length) {
    html += `<div style="font-size:11.5px;color:var(--ht);margin-top:8px"><strong>${skipped.length} skipped:</strong> ${skipped.map(s => esc(s)).join('; ')}</div>`;
  }
  previewEl.innerHTML = html;
  return toUpdate;
}

function impBuildTaskRows(rows, previewEl) {
  const toAdd = [], skipped = [];
  const existingTitles = new Set(D.tasks.map(t => t.title.toLowerCase().trim()));
  const membersByName = {};
  D.members.forEach(m => { membersByName[m.name.toLowerCase().trim()] = m; });

  function impNormPriority(val) {
    const v = (val || '').toLowerCase().trim();
    if (v.startsWith('h') || v === '1') return 'high';
    if (v.startsWith('l') || v === '3') return 'low';
    return 'medium';
  }

  function impNormStatus(val) {
    const v = (val || '').toLowerCase().trim();
    if (v.includes('progress') || v === 'in progress' || v === 'wip') return 'in_progress';
    if (v.startsWith('done') || v.startsWith('complet') || v === 'finished') return 'done';
    return 'todo';
  }

  function impNormDate(val) {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    return '';
  }

  rows.forEach(row => {
    const title = impCol(row, 'title', 'task', 'task name', 'action item', 'action');
    if (!title) { skipped.push('(blank title)'); return; }
    if (existingTitles.has(title.toLowerCase().trim())) { skipped.push(title + ' — already exists'); return; }
    const ownerRaw = impCol(row, 'assigned to', 'owner', 'assignee', 'responsible', 'member', 'assigned');
    const owner = ownerRaw ? (membersByName[ownerRaw.toLowerCase().trim()] || null) : null;
    if (ownerRaw && !owner) skipped.push(title + ' — "' + ownerRaw + '" not in roster, importing unassigned');
    const priority = impNormPriority(impCol(row, 'priority', 'importance', 'urgency'));
    const status = impNormStatus(impCol(row, 'status', 'state', 'progress'));
    const dueDate = impNormDate(impCol(row, 'due date', 'due', 'deadline', 'date'));
    const desc = impCol(row, 'description', 'desc', 'notes', 'details', 'note');
    toAdd.push({ id: uid(), title, assignedTo: owner ? owner.id : '', priority, status, dueDate, desc });
  });

  let html = '';
  if (toAdd.length) {
    html += `<div style="font-size:12px;font-weight:600;color:var(--gn);margin-bottom:6px">${toAdd.length} task${toAdd.length !== 1 ? 's' : ''} to import:</div>`;
    html += `<div style="max-height:200px;overflow-y:auto;border:1px solid var(--bdr);border-radius:7px"><table style="width:100%;border-collapse:collapse;font-size:11.5px">`;
    html += `<thead><tr style="background:var(--surf2)"><th style="padding:5px 8px;text-align:left">Title</th><th style="padding:5px 8px;text-align:left">Assigned To</th><th style="padding:5px 8px;text-align:left">Priority</th><th style="padding:5px 8px;text-align:left">Due Date</th></tr></thead><tbody>`;
    toAdd.forEach((t, i) => {
      const bg = i % 2 === 0 ? 'var(--surf)' : 'var(--surf2)';
      const ownerName = t.assignedTo ? (D.members.find(m => m.id === t.assignedTo) || {}).name || '—' : '—';
      const priColor = t.priority === 'high' ? 'var(--rd)' : t.priority === 'low' ? 'var(--ht)' : 'var(--am)';
      html += `<tr style="background:${bg}"><td style="padding:5px 8px;font-weight:500">${esc(t.title)}</td><td style="padding:5px 8px;color:var(--mt)">${esc(ownerName)}</td><td style="padding:5px 8px;font-weight:600;color:${priColor}">${t.priority}</td><td style="padding:5px 8px;color:var(--mt)">${t.dueDate||'—'}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  if (skipped.length) {
    html += `<div style="font-size:11.5px;color:var(--ht);margin-top:8px"><strong>${skipped.length} skipped/noted:</strong> ${skipped.map(s => esc(s)).join('; ')}</div>`;
  }
  previewEl.innerHTML = html;
  return toAdd;
}

function impBuildMentorAgendaRows(rows, previewEl) {
  const toAdd = [], skipped = [];
  rows.forEach(row => {
    const weekRaw = impCol(row, 'week', 'week #', 'week number');
    const topic = impCol(row, 'topic', 'title', 'subject');
    const week = parseInt(weekRaw);
    if (!week || !topic) { skipped.push('(missing week or topic)'); return; }
    const notes = impCol(row, 'discussion points', 'discussion', 'notes', 'details');
    toAdd.push({ id: uid(), week, topic, notes });
  });
  toAdd.sort((a, b) => a.week - b.week);

  let html = '';
  if (toAdd.length) {
    html += `<div style="font-size:12px;font-weight:600;color:var(--gn);margin-bottom:6px">${toAdd.length} week${toAdd.length !== 1 ? 's' : ''} to import — this replaces the entire existing agenda:</div>`;
    html += `<div style="max-height:220px;overflow-y:auto;border:1px solid var(--bdr);border-radius:7px"><table style="width:100%;border-collapse:collapse;font-size:11.5px">`;
    html += `<thead><tr style="background:var(--surf2)"><th style="padding:5px 8px;text-align:left;width:50px">Week</th><th style="padding:5px 8px;text-align:left">Topic</th><th style="padding:5px 8px;text-align:left">Discussion Points</th></tr></thead><tbody>`;
    toAdd.forEach((a, i) => {
      const bg = i % 2 === 0 ? 'var(--surf)' : 'var(--surf2)';
      html += `<tr style="background:${bg}"><td style="padding:5px 8px;font-weight:600">${a.week}</td><td style="padding:5px 8px;font-weight:500">${esc(a.topic)}</td><td style="padding:5px 8px;color:var(--mt)">${esc(a.notes||'—')}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  if (skipped.length) {
    html += `<div style="font-size:11.5px;color:var(--ht);margin-top:8px"><strong>${skipped.length} skipped:</strong> ${skipped.map(s => esc(s)).join('; ')}</div>`;
  }
  previewEl.innerHTML = html;
  return toAdd;
}

// ── COMMIT ──

async function doImport() {
  if (!_importRows.length) return;
  const commitBtn = document.getElementById('imp-commit');
  commitBtn.disabled = true;
  commitBtn.textContent = 'Importing…';
  try {
    if (_importType === 'members') {
      const toAdd = _importRows.filter(m => !m._update);
      const toUpdate = _importRows.filter(m => m._update);
      toAdd.forEach(m => D.members.push(m));
      toUpdate.forEach(u => {
        const ex = D.members.find(m => m.id === u.id);
        if (ex) { const {_update, ...fields} = u; Object.assign(ex, fields); }
      });
      saveData();
      renderMembers();
      const parts = []; if (toAdd.length) parts.push(`${toAdd.length} added`); if (toUpdate.length) parts.push(`${toUpdate.length} updated`);
      toast(`Members: ${parts.join(', ')} (demo — not persisted)`, 'success');
    } else if (_importType === 'tasks') {
      if (!D.tasks) D.tasks = [];
      _importRows.forEach(t => D.tasks.push(t));
      saveData();
      renderTasks();
      renderDash();
      toast(`${_importRows.length} task${_importRows.length !== 1 ? 's' : ''} imported (demo — not persisted)`, 'success');
    } else if (_importType === 'mentorAgenda') {
      D.newMemberEducation.mentorProgramAgenda = _importRows;
      saveData();
      if (typeof renderNewMemberEducation === 'function') renderNewMemberEducation();
      toast(`Agenda imported: ${_importRows.length} week${_importRows.length !== 1 ? 's' : ''} (demo — not persisted)`, 'success');
    } else {
      if (!D.academics) D.academics = {};
      if (!D.academics.gpas) D.academics.gpas = {};
      _importRows.forEach(u => {
        const existing = D.academics.gpas[u.member.id] || {};
        if (u.cumGpa !== null) existing.cumulativeGpa = u.cumGpa;
        if (u.semGpa !== null) existing.priorGpa = u.semGpa;
        D.academics.gpas[u.member.id] = existing;
      });
      saveData();
      renderAcademics();
      toast(`Grades updated for ${_importRows.length} member${_importRows.length !== 1 ? 's' : ''} (demo — not persisted)`, 'success');
    }
    closeM(null, document.getElementById('m-import'));
  } catch(e) {
    toast('Import failed. Please try again.', 'error');
    commitBtn.disabled = false;
    commitBtn.textContent = `Import ${_importRows.length} Record${_importRows.length !== 1 ? 's' : ''}`;
  }
}

// ── TEMPLATE DOWNLOAD ──

function impDownloadTemplate(type) {
  let csv, filename;
  if (type === 'members') {
    csv = 'Name,Grad Year,Class Year,Role,Live In,Major,Email,Phone,Hometown\nSam Rivera,2027,Junior,Member,Yes,Finance,srivera@example.edu,555-0101,"Des Moines, IA"\nJordan Blake,2028,Freshman,Member,No,Marketing,jblake@example.edu,555-0102,"Ames, IA"';
    filename = 'members_template.csv';
  } else if (type === 'tasks') {
    csv = 'Title,Assigned To,Priority,Due Date,Description\nPlan Fall Kickoff,Sam Rivera,high,2026-09-01,Coordinate venue and activities with Social Chair\nOrder Chapter T-Shirts,Jordan Blake,medium,2026-08-20,Use size chart from last year';
    filename = 'tasks_template.csv';
  } else if (type === 'mentorAgenda') {
    csv = 'Week,Topic,Discussion Points\n'
      + '1,Welcome & Expectations,Icebreakers; why you joined; set expectations for the semester\n'
      + '2,Fraternity History & Founding Values,Review founding principles and what brotherhood means to you\n'
      + '3,Time Management & Academic Success,Study habits; campus resources; balancing classes and chapter life\n'
      + '4,Brotherhood & Building Relationships,Getting to know brothers outside your pledge class\n'
      + '5,Risk Management & Personal Responsibility,Chapter risk policies; making smart decisions\n'
      + '6,Community Service & Philanthropy,Upcoming service opportunities; why philanthropy matters\n'
      + '7,Financial Responsibility,Dues; budgeting; the chapter\'s finances\n'
      + '8,Leadership & Getting Involved,Committees and ways to get involved beyond new member status\n'
      + '9,Alumni Relations,Staying connected after graduation\n'
      + '10,Reflection & Initiation Prep,Reflect on the semester; what full membership means';
    filename = 'mentor_program_agenda_template.csv';
  } else {
    csv = 'Name,Cumulative GPA,Semester GPA\nSam Rivera,3.45,3.20\nJordan Blake,2.89,3.10';
    filename = 'grades_template.csv';
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
