/* OpsCore 2.0 Demo — Auth & RBAC */
const TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours
let CURRENT_USER = null;
let _fbAuth = null;
let _inactTimer;

// ── ROLE ACCESS MAP ──
const ALL_PAGES = ['dashboard','attendance','calendar','tasks','notes','finance','judicial','sober','members','recruitment','academics','committees','analytics','files','transition','settings','philanthropy','alumni','ritual','healthscore','reports'];

const ROLE_ACCESS = {
  'admin':                  ALL_PAGES,
  'exec':                   ALL_PAGES,
  'President':              ALL_PAGES,
  'Vice President':         ALL_PAGES,
  'Treasurer':              ['dashboard','finance','tasks','files','settings','analytics','reports'],
  'Risk Manager':           ['dashboard','sober','calendar','files','settings','analytics','academics'],
  'Secretary':              ['dashboard','notes','attendance','calendar','files','settings','reports'],
  'Scholarship Chair':      ['dashboard','academics','members','files','settings','analytics','reports'],
  'Recruitment Chair':      ['dashboard','recruitment','calendar','members','committees','files','settings','reports'],
  'Chaplain':               ['dashboard','ritual','members','committees','files','settings'],
  'Community Service Chair':['dashboard','philanthropy','committees','calendar','files','settings'],
  'Philanthropy Chair':     ['dashboard','philanthropy','committees','calendar','files','settings'],
  'Alumni Relations Chair': ['dashboard','alumni','members','files','settings'],
  'New Member Educator':    ['dashboard','ritual','members','committees','calendar','files','settings'],
  'Social Chair':           ['dashboard','sober','calendar','files','settings'],
  'viewer':                 ['dashboard','attendance','calendar','analytics','files','settings'],
  '_default_chair':         ['dashboard','committees','calendar','files','settings','philanthropy','ritual'],
};

function getRoleAccess(role){
  if(!role) return ROLE_ACCESS['viewer'];
  // Direct match first
  if(ROLE_ACCESS[role]) return ROLE_ACCESS[role];
  // Case-insensitive match
  const lower = role.toLowerCase();
  const match = Object.keys(ROLE_ACCESS).find(k => k.toLowerCase() === lower);
  if(match) return ROLE_ACCESS[match];
  // Pattern match for common exec roles
  if(/president|vice.?pres|vp/i.test(role)) return ALL_PAGES;
  if(/admin/i.test(role)) return ALL_PAGES;
  if(/exec|officer/i.test(role)) return ALL_PAGES;
  if(/treasurer/i.test(role)) return ROLE_ACCESS['Treasurer'];
  if(/secretary/i.test(role)) return ROLE_ACCESS['Secretary'];
  if(/risk/i.test(role)) return ROLE_ACCESS['Risk Manager'];
  if(/recruitment/i.test(role)) return ROLE_ACCESS['Recruitment Chair'];
  if(/scholarship|academic/i.test(role)) return ROLE_ACCESS['Scholarship Chair'];
  if(/chaplain/i.test(role)) return ROLE_ACCESS['Chaplain'];
  if(/philanthropy/i.test(role)) return ROLE_ACCESS['Philanthropy Chair'];
  if(/alumni/i.test(role)) return ROLE_ACCESS['Alumni Relations Chair'];
  if(/educator|nme|new.?member/i.test(role)) return ROLE_ACCESS['New Member Educator'];
  if(/social/i.test(role)) return ROLE_ACCESS['Social Chair'];
  if(/chair|officer|educator|chaplain/i.test(role)) return ROLE_ACCESS['_default_chair'];
  // Unknown role — give reasonable read-only exec access (not just dashboard+settings)
  return ROLE_ACCESS['viewer'];
}

function canAccess(page){
  if(!CURRENT_USER) return false;
  // Try role first, then title as fallback
  const roleKey = CURRENT_USER.role||'';
  const titleKey = CURRENT_USER.title||'';
  const allowed = getRoleAccess(roleKey) || getRoleAccess(titleKey) || ROLE_ACCESS['viewer'];
  return allowed.includes(page);
}

function rbacApplySidebar(){
  if(!CURRENT_USER) return;
  const roleKey = CURRENT_USER.role||'';
  const titleKey = CURRENT_USER.title||'';
  const allowed = getRoleAccess(roleKey) || getRoleAccess(titleKey) || ROLE_ACCESS['viewer'];
  document.querySelectorAll('.ni[data-page]').forEach(el=>{
    const pg = el.getAttribute('data-page');
    el.classList.toggle('nav-hidden', !allowed.includes(pg));
  });
  document.querySelectorAll('.ns[data-section]').forEach(section=>{
    const items = section.querySelectorAll('.ni[data-page]');
    const anyVisible = [...items].some(i=>!i.classList.contains('nav-hidden'));
    section.style.display = anyVisible ? '' : 'none';
  });
}

function rbacNav(page, el){
  if(!canAccess(page)){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
    const denied = document.getElementById('page-access-denied');
    if(denied){
      denied.classList.add('active');
      document.getElementById('pg-title').textContent = 'Access Restricted';
      document.getElementById('ad-role').textContent = PAGE_TITLES[page]||page;
    }
    return;
  }
  nav(page, el);
}

// ── LOGIN WITH FIREBASE EMAIL/PASSWORD ──
async function handleLogin(){
  const email = document.getElementById('lg-user').value.trim();
  const password = document.getElementById('lg-pass').value;
  const err = document.getElementById('lg-err');
  const btn = document.getElementById('lg-btn');
  err.textContent = '';
  if(!email||!password){err.textContent='Please enter your email and password.';return;}
  if(!window._fbAuth||!window._fbFns){err.textContent='Auth not ready. Please wait a moment and try again.';return;}
  btn.textContent='Signing in…';btn.disabled=true;
  try{
    await window._fbFns.signInWithEmailAndPassword(window._fbAuth, email, password);
    // onAuthStateChanged will handle the rest
  } catch(e){
    btn.textContent='Sign In';btn.disabled=false;
    const codeMap={
      'auth/user-not-found':'No account found for this email.',
      'auth/wrong-password':'Incorrect password.',
      'auth/invalid-email':'Please enter a valid email address.',
      'auth/too-many-requests':'Too many attempts. Please wait and try again.',
      'auth/invalid-credential':'Invalid email or password.',
      'auth/network-request-failed':'Network error. Check your connection.',
    };
    err.textContent = codeMap[e.code] || 'Sign-in failed: '+e.message;
    document.getElementById('lg-pass').value='';
    document.getElementById('lg-pass').focus();
  }
}

// ── APPLY LOGGED-IN USER ──
async function applyAuthenticatedUser(firebaseUser){
  // Load user profile from Firestore users/{uid}
  let userProfile = null;
  let profileExists = false;
  try{
    if(_db && _fbFns){
      const {doc,getDoc} = _fbFns;
      const snap = await getDoc(doc(_db,'users',firebaseUser.uid));
      if(snap.exists()){
        userProfile = snap.data();
        profileExists = true;
      }
    }
  } catch(e){console.warn('Could not load user profile:',e.message);}

  // Block access if no users/{uid} doc exists in Firestore
  if(!profileExists){
    await window._fbFns.signOut(window._fbAuth);
    const gate = document.getElementById('login-gate');
    gate.style.display = 'flex';
    document.querySelectorAll('.lg-fld').forEach(el=>el.style.display='');
    const btn = document.getElementById('lg-btn');
    if(btn){btn.style.display='block';btn.textContent='Sign In';btn.disabled=false;}
    document.getElementById('lg-err').textContent =
      'Your account is not authorized. Contact the chapter admin to be granted access.';
    return;
  }

  // Role comes strictly from Firestore — no unsafe default
  const role = userProfile.role || 'viewer';
  const displayName = userProfile.name || firebaseUser.displayName || firebaseUser.email.split('@')[0];
  const title = userProfile.title || (role==='admin'?'President':role==='exec'?'Officer':'Member');

  CURRENT_USER = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: displayName,
    title,
    role,
    mid: userProfile.memberId || null,
    lastLogin: userProfile.lastLogin || null,
  };

  // Update last login in Firestore (non-critical — silent on failure)
  try{
    if(_db && _fbFns){
      const {doc,setDoc} = _fbFns;
      await setDoc(doc(_db,'users',firebaseUser.uid),
        {lastLogin:new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})},
        {merge:true});
    }
  }catch(e){ /* non-critical */ }

  // Show the app
  const appNav=document.getElementById('app-nav');
  const appMain=document.getElementById('app-main');
  if(appNav) appNav.style.display='flex';
  if(appMain) appMain.style.display='flex';

  // Update sidebar user display
  const ini = displayName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'?';
  document.getElementById('u-av').textContent = ini;
  document.getElementById('u-name').textContent = displayName;
  document.getElementById('u-role').textContent = title;
  document.getElementById('tb-av').textContent = ini;

  rbacApplySidebar();
}

// ── LOGOUT ──
async function handleLogout(){
  _unsubs.forEach(u=>u());_unsubs=[];
  if(window._fbAuth && window._fbFns){
    try{ await window._fbFns.signOut(window._fbAuth); }catch(e){}
  }
  CURRENT_USER = null;
  location.reload();
}

// ── INACTIVITY TIMEOUT ──
function resetInactivityTimer(){
  if(!CURRENT_USER) return;
  clearTimeout(_inactTimer);
  _inactTimer = setTimeout(()=>{
    handleLogout();
  }, TIMEOUT_MS);
}
['mousemove','keydown','click','scroll'].forEach(ev=>document.addEventListener(ev,resetInactivityTimer,{passive:true}));

function getTimeOfDay(){
  const h = new Date().getHours();
  if(h < 12) return 'morning';
  if(h < 17) return 'afternoon';
  return 'evening';
}

function getSemester(){
  const m=new Date().getMonth();
  return m>=7&&m<=11?'Fall '+new Date().getFullYear():'Spring '+new Date().getFullYear();
}

// ── SETTINGS: show Firebase users from Firestore ──
async function renderUserSettings(){
  const el=document.getElementById('se-users');if(!el)return;
  el.innerHTML=`<div style="font-size:11.5px;color:var(--mt);padding:9px 0">Logged in as <strong>${CURRENT_USER?.email||'—'}</strong><br>Role: <strong>${CURRENT_USER?.role||'—'}</strong> · ${CURRENT_USER?.title||'—'}</div>
  <div style="font-size:11px;color:var(--ht);margin-top:6px">User accounts are managed in Firebase Authentication. Roles are stored in Firestore users/{uid}.</div>`;
}

// ── OFFLINE DETECTION ──
window.addEventListener('online', ()=>{
  document.getElementById('offline-banner').classList.remove('show');
  toast('Back online — syncing changes…','success',3000);
  // Re-save to flush any locally-cached changes
  saveData();
});
window.addEventListener('offline', ()=>{
  document.getElementById('offline-banner').classList.add('show');
});
// Set initial state on load
if(!navigator.onLine){
  document.getElementById('offline-banner').classList.add('show');
}

// ── INIT ──
// ══════════════════════════════════════════════
