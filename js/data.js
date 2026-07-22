/* OpsCore 2.0 Demo — Data Layer */
// ══════════════════════════════════════════════
// FIREBASE DATA LAYER
// ══════════════════════════════════════════════

const LS_CACHE = 'ato_v8_cache'; // localStorage key for offline cache only
let D = {}; // in-memory data store — always the truth for renders
let _db = null;   // Firestore instance (set after firebase-ready)
let _fbFns = null; // Firestore functions
let _unsubs = []; // active onSnapshot unsubscribers

// ── Default structure for empty collections ──
function initDataDefaults(){
  if(!D.members)D.members=[];
  if(!D.events)D.events=[];
  if(!D.tasks)D.tasks=[];
  if(!D.goals)D.goals=[];
  if(!D.notes)D.notes=[];
  if(!D.cases)D.cases=[];
  // D.shifts is a weekly weekend/day/slot grid ({pledgeShadowStart, weekends:[...]}), not a flat
  // shift array — see js/sober.js's sbEnsureDefaults(), which also migrates any legacy array shape.
  if(!D.shifts||Array.isArray(D.shifts))D.shifts={pledgeShadowStart:'',weekends:[]};
  if(!D.files)D.files=[];
  if(!D.notifs)D.notifs=[];
  if(!D.committees)D.committees=[];
  if(!D.transitions)D.transitions=[];
  if(!D.announcements)D.announcements=[];
  if(!D.attendance)D.attendance={};
  if(!D.academics)D.academics={gpas:{},history:[]};
  if(!D.finance)D.finance={dues:{},fines:[],expenses:[],plans:[],payments:[],nationalDues:{},nationalPayments:[],budget:{Social:0,Recruitment:0,Philanthropy:0,House:0,Brotherhood:0,Operations:0,Risk:0}};
  if(!D.finance.budget)D.finance.budget={};
  if(!D.finance.nationalDues)D.finance.nationalDues={};
  if(!D.finance.nationalPayments)D.finance.nationalPayments=[];
  if(!D.recruitment)D.recruitment={rushees:[],events:[],goal:{target:20,label:'New Members This Semester'}};
  if(!D.recruitment.rushees)D.recruitment.rushees=[];
  if(!D.recruitment.events)D.recruitment.events=[];
  if(!D.recruitment.goal)D.recruitment.goal={target:20,label:'New Members This Semester'};
  // Philanthropy (fundraising) — events live on the shared D.events calendar (type:'philanthropy'
  // or 'fundraiser'); this object only holds fundraising logs, orgs, vendors/donors, and goals.
  if(!D.philanthropy)D.philanthropy={funds:[],organizations:[],vendors:[],goals:{events:4,funds:2000}};
  if(!D.philanthropy.funds)D.philanthropy.funds=[];
  if(!D.philanthropy.organizations)D.philanthropy.organizations=[];
  if(!D.philanthropy.vendors)D.philanthropy.vendors=[];
  if(!D.philanthropy.goals)D.philanthropy.goals={events:4,funds:2000};
  // Community Service — events live on the shared D.events calendar (type:'service'); this
  // object holds hour logs, service locations, and goals.
  if(!D.communityService)D.communityService={hours:[],locations:[],goals:{totalHrs:500,events:6,avgHrs:4}};
  if(!D.communityService.hours)D.communityService.hours=[];
  if(!D.communityService.locations)D.communityService.locations=[];
  if(!D.communityService.goals)D.communityService.goals={totalHrs:500,events:6,avgHrs:4};
  if(!D.agenda)D.agenda={items:[],archived:[]};
  if(!D.alumni)D.alumni={contacts:[],events:[],outreach:[]};
  // Ritual — narrowed to the ceremony/administrative checklist only; sessions/progress now
  // live in D.newMemberEducation, and brotherhood/Bible study planning lives in D.chaplainHub.
  if(!D.ritual)D.ritual={items:[]};
  // 'events'/'tasks' were the old separate Chaplain Hub lists — brotherhood events now live on
  // the shared D.events calendar (type:'brotherhood') and Pending Actions was removed. Kept out
  // of the default shape entirely; chBibleStudies() still reads .bibleStudies for the member
  // view's legacy "Next Bible Study" card.
  if(!D.chaplainHub)D.chaplainHub={bibleStudies:[],devotionals:[]};
  if(!D.chaplainHub.devotionals)D.chaplainHub.devotionals=[];
  if(!D.newMemberEducation)D.newMemberEducation={sessions:[],requirements:[],progress:{},mentorGroups:[],mentorProgramAgenda:[]};
  if(!D.social)D.social={planning:{},vendors:[]};
  if(!D.social.planning)D.social.planning={};
  if(!D.social.vendors)D.social.vendors=[];
  if(!D.vendors)D.vendors=[];
  if(!D.transitionHub)D.transitionHub={deadlines:[],issues:[],archive:[]};
  if(!D.settings)D.settings={name:'',year:'',classYear:'Senior',notifAttendance:true,notifTasks:true,notifSober:true,notifWeekly:true,chapterName:'Beta Chapter',university:'State University',chapterSize:'',chapterFounded:''};
}

// ── COLLECTION-BASED SAVE ──
// Collections stored as Firestore documents under a single chapter doc for simplicity.
// Layout: /settings/chapter (big doc with simple scalars),
//         /members/{id}, /events/{id}, /tasks/{id}, etc.

const FLAT_COLLECTIONS = [
  'members','events','tasks','goals','notes','attendance_data',
  'judicial_cases','sober_bros','recruitment','academics','committees',
  'philanthropy','alumni','ritual','files','transition','finance','notifs'
];

// Save entire D to localStorage as offline cache
function saveToLocalStorage(){
  try{localStorage.setItem(LS_CACHE,JSON.stringify(D));}catch(e){}
}

// Load D from localStorage cache (used before Firestore loads)
function loadFromLocalStorage(){
  try{const c=localStorage.getItem(LS_CACHE);if(c){D=JSON.parse(c);}}catch{D={};}
  initDataDefaults();
}

// ── FIRESTORE: Save whole D as a single document per collection key ──
// We store everything in /chapters/beta_chapter_demo/{key} documents for simplicity.
// This avoids sub-collection complexity while supporting onSnapshot.
const FS_PATH = 'chapters';
const FS_ID = 'beta_chapter_demo';

let _saveDPending = false;
let _saveDTimer = null;
let _saveDResolvers = [];
const _appStartTime = Date.now();
let _firebaseConfirmed = false; // set true once auth state resolves — errors before this are suppressed

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION-ONLY REFERENCE CODE — never runs in this demo build.
// js/demo.js loads last (index.html script order) and redeclares saveData/loadData/
// saveToLocalStorage/loadFromLocalStorage/startRealtimeSync/resetData as no-ops — in plain
// <script> tags the last declaration of a given function name wins, so every call site in this
// app is actually invoking demo.js's stub, not the real Firestore logic below. Kept in the repo
// on purpose, as the reference for what the production build's persistence layer looks like —
// see README.md's "Demo vs. Production" section.
// ═══════════════════════════════════════════════════════════════════════════
async function saveData(){
  saveToLocalStorage(); // write to localStorage immediately, always

  // If no Firebase, resolve right away — offline/cache-only mode
  if(!_db || !_fbFns){
    return Promise.resolve();
  }

  // Return a promise that settles when the next Firestore write completes
  return new Promise((resolve, reject) => {
    _saveDResolvers.push({resolve, reject});

    // Debounce: cancel any pending timer and restart it
    // All resolvers queued so far will be flushed together in one write
    clearTimeout(_saveDTimer);
    _saveDTimer = setTimeout(_saveDFlush, 150);
  });
}

async function _saveDFlush(){
  // If a write is already in flight, reschedule — don't drop resolvers
  if(_saveDPending){
    clearTimeout(_saveDTimer);
    _saveDTimer = setTimeout(_saveDFlush, 200);
    return;
  }

  // Grab all waiting callers atomically
  const waiting = _saveDResolvers.splice(0);
  if(!waiting.length) return;

  _saveDPending = true;
  _saveInFlight = true;

  const {doc, setDoc} = _fbFns;
  try{
    await setDoc(doc(_db, FS_PATH, FS_ID), {
      members:      D.members||[],
      events:       D.events||[],
      tasks:        D.tasks||[],
      goals:        D.goals||[],
      notes:        D.notes||[],
      attendance:   D.attendance||{},
      cases:        D.cases||[],
      shifts:       D.shifts||{pledgeShadowStart:'',weekends:[]},
      files:        D.files||[],
      notifs:       D.notifs||[],
      committees:   D.committees||[],
      transitions:  D.transitions||[],
      announcements:D.announcements||[],
      academics:    D.academics||{gpas:{},history:[]},
      finance:      D.finance||{},
      recruitment:  D.recruitment||{rushees:[],events:[]},
      philanthropy: D.philanthropy||{funds:[],organizations:[],vendors:[],goals:{events:4,funds:2000}},
      communityService: D.communityService||{hours:[],locations:[],goals:{totalHrs:500,events:6,avgHrs:4}},
      agenda:       D.agenda||{items:[],archived:[]},
      alumni:       D.alumni||{contacts:[],events:[],outreach:[]},
      ritual:       D.ritual||{items:[]},
      chaplainHub:  D.chaplainHub||{bibleStudies:[],events:[],tasks:[]},
      newMemberEducation: D.newMemberEducation||{sessions:[],requirements:[],progress:{},mentorGroups:[],mentorProgramAgenda:[]},
      social:       D.social||{planning:{},vendors:[],rsvps:[]},
      vendors:      D.vendors||[],
      transitionHub:D.transitionHub||{deadlines:[],issues:[],archive:[]},
      settings:     D.settings||{},
      updatedAt:    Date.now()
    });
    waiting.forEach(r => r.resolve());
  } catch(e){
    console.error('Firestore saveD error:', e.code, e.message);
    if(_firebaseConfirmed && (!_saveDLastErrToast || Date.now()-_saveDLastErrToast > 60000)){
      _saveDLastErrToast = Date.now();
      toast('Save failed: ' + (e.code || e.message || 'unknown error'), 'error', 8000);
    }
    waiting.forEach(r => r.reject(e));
  } finally {
    _saveDPending = false;
    setTimeout(()=>{ _saveInFlight = false; }, 800);
  }
}
let _saveDLastErrToast = 0;

async function loadData(){
  loadFromLocalStorage(); // show cached data immediately
  if(!_db||!_fbFns) return;
  const {doc,getDoc} = _fbFns;
  try{
    const snap = await getDoc(doc(_db, FS_PATH, FS_ID));
    if(snap.exists()){
      const fd = snap.data();
      // Merge Firestore data into D
      Object.assign(D, fd);
      initDataDefaults();
      saveToLocalStorage();
    } else {
      // First time — initialize with defaults and push to Firestore
      initDataDefaults();
      await saveData();
    }
  } catch(e){
    console.warn('Firestore loadD error:', e.message);
    initDataDefaults();
    if(_firebaseConfirmed){
      toast('Could not reach the server — showing cached data. Changes will sync when reconnected.','error',6000);
    }
  }
}

// ── REAL-TIME LISTENER ──
let _saveInFlight = false; // true while our own saveD is writing
let _remoteRenderTimer = null;

function startRealtimeSync(){
  if(!_db||!_fbFns) return;
  const {doc,onSnapshot} = _fbFns;
  // Stop any existing listeners
  _unsubs.forEach(u=>u());_unsubs=[];
  const unsub = onSnapshot(doc(_db, FS_PATH, FS_ID), (snap)=>{
    if(!snap.exists()) return;
    // Skip re-render if this snapshot was triggered by our own saveData()
    if(_saveInFlight) return;
    const fd = snap.data();
    Object.assign(D, fd);
    initDataDefaults();
    saveToLocalStorage();
    // Debounce remote re-renders to avoid rapid flicker from multi-field writes
    clearTimeout(_remoteRenderTimer);
    _remoteRenderTimer = setTimeout(()=>{
      const activePage = document.querySelector('.page.active');
      if(activePage){
        const pid = activePage.id.replace('page-','');
        if(R&&R[pid]) R[pid]();
      }
      updateBadges();
    }, 300);
  }, (err)=>{
    console.warn('onSnapshot error:', err.message);
    if(_firebaseConfirmed){
      toast('Real-time sync disconnected. Refresh to reconnect.','error',5000);
    }
  });
  _unsubs.push(unsub);
}

async function resetData(){
  if(!_db||!_fbFns){localStorage.removeItem(LS_CACHE);location.reload();return;}
  const {doc,deleteDoc} = _fbFns;
  try{
    await deleteDoc(doc(_db, FS_PATH, FS_ID));
  }catch(e){
    console.warn(e);
    toast('Reset failed — please try again.','error');
    return;
  }
  localStorage.removeItem(LS_CACHE);
  location.reload();
}
// ═══════ END PRODUCTION-ONLY REFERENCE CODE ═══════

// Wire up Firebase once ready
document.addEventListener('firebase-ready', ()=>{
  _db = window._fbDb;
  _fbFns = window._fbFns;
});

// ── TOAST ──
