/* OpsCore 2.0 Demo — Demo Mode: seed data, auto-login, no-op persistence */
// DEMO MODE OVERRIDES
// All Firebase/persistence replaced with in-memory seed data.
// Nothing is saved, nothing is loaded from a server.
// ══════════════════════════════════════════════

// No-op all persistence
async function saveData(){ return; }
async function loadData(){ return; }
function saveToLocalStorage(){}
function loadFromLocalStorage(){ initDataDefaults(); }
function startRealtimeSync(){}
async function resetData(){ toast('Reset disabled in demo mode','info'); }

// ── SEED DATA ──
function loadDemoData(){
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const past = n => fmt(new Date(today - n*86400000));
  const future = n => fmt(new Date(today.getTime() + n*86400000));
  const uid = () => 'demo_' + Math.random().toString(36).slice(2,10);

  // ── MEMBERS (18 fake members) ──
  const members = [
    {id:'m01',name:'James Mitchell',initials:'JM',role:'President',classYear:'Senior',year:2025,liveIn:true},
    {id:'m02',name:'Ryan Torres',initials:'RT',role:'Vice President',classYear:'Senior',year:2025,liveIn:true},
    {id:'m03',name:'Connor Walsh',initials:'CW',role:'Treasurer',classYear:'Junior',year:2026,liveIn:false},
    {id:'m04',name:'Daniel Park',initials:'DP',role:'Secretary',classYear:'Junior',year:2026,liveIn:true},
    {id:'m05',name:'Alex Rivera',initials:'AR',role:'Recruitment Chair',classYear:'Junior',year:2026,liveIn:false},
    {id:'m06',name:'Marcus Bell',initials:'MB',role:'Risk Manager',classYear:'Senior',year:2025,liveIn:true},
    {id:'m07',name:'Tyler Brooks',initials:'TB',role:'Scholarship Chair',classYear:'Sophomore',year:2027,liveIn:false},
    {id:'m08',name:'Jordan Hayes',initials:'JH',role:'Philanthropy Chair',classYear:'Junior',year:2026,liveIn:false},
    {id:'m09',name:'Nathan Scott',initials:'NS',role:'Social Chair',classYear:'Sophomore',year:2027,liveIn:true},
    {id:'m10',name:'Ethan Cole',initials:'EC',role:'Member',classYear:'Sophomore',year:2027,liveIn:false},
    {id:'m11',name:'Logan Price',initials:'LP',role:'Member',classYear:'Sophomore',year:2027,liveIn:false},
    {id:'m12',name:'Blake Foster',initials:'BF',role:'Member',classYear:'Freshman',year:2028,liveIn:false},
    {id:'m13',name:'Owen Reed',initials:'OR',role:'Member',classYear:'Freshman',year:2028,liveIn:false},
    {id:'m14',name:'Caleb Hughes',initials:'CH',role:'Member',classYear:'Junior',year:2026,liveIn:true},
    {id:'m15',name:'Brody Clark',initials:'BC',role:'Member',classYear:'Senior',year:2025,liveIn:false},
    {id:'m16',name:'Mason Evans',initials:'ME',role:'New Member Educator',classYear:'Senior',year:2025,liveIn:true},
    {id:'m17',name:'Hunter James',initials:'HJ',role:'Chaplain',classYear:'Junior',year:2026,liveIn:false},
    {id:'m18',name:'Drew Santos',initials:'DS',role:'Alumni Relations Chair',classYear:'Senior',year:2025,liveIn:false},
  ];

  // ── EVENTS (past mandatory + upcoming) ──
  const events = [
    {id:'e01',title:'Chapter Meeting',type:'chapter',date:past(42),start:'7:00 PM',location:'Chapter House',mandatory:true},
    {id:'e02',title:'Chapter Meeting',type:'chapter',date:past(28),start:'7:00 PM',location:'Chapter House',mandatory:true},
    {id:'e03',title:'Chapter Meeting',type:'chapter',date:past(14),start:'7:00 PM',location:'Chapter House',mandatory:true},
    {id:'e04',title:'Chapter Meeting',type:'chapter',date:past(7),start:'7:00 PM',location:'Chapter House',mandatory:true},
    {id:'e05',title:'Risk Management Workshop',type:'mandatory',date:past(35),start:'6:00 PM',location:'Student Union',mandatory:true},
    {id:'e06',title:'New Member Education',type:'chapter',date:past(21),start:'8:00 PM',location:'Chapter House',mandatory:true},
    {id:'e07',title:'Philanthropy 5K Run',type:'philanthropy',date:past(10),start:'9:00 AM',location:'Campus Rec',mandatory:false},
    {id:'e08',title:'Brotherhood Retreat',type:'brotherhood',date:past(5),start:'10:00 AM',location:'State Park',mandatory:false},
    {id:'e09',title:'Chapter Meeting',type:'chapter',date:future(7),start:'7:00 PM',location:'Chapter House',mandatory:true},
    {id:'e10',title:'Spring Formal',type:'brotherhood',date:future(14),start:'7:00 PM',location:'Grand Ballroom',mandatory:false},
    {id:'e11',title:'Recruitment Kickoff',type:'recruitment',date:future(3),start:'5:00 PM',location:'Chapter House',mandatory:false},
    {id:'e12',title:'Alumni Golf Outing',type:'chapter',date:future(21),start:'8:00 AM',location:'Riverside Golf Club',mandatory:false},
    {id:'e13',title:'IFC Philanthropy Walk',type:'philanthropy',date:future(28),start:'11:00 AM',location:'Main Quad',mandatory:false},
    {id:'e14',title:'Exec Meeting',type:'exec',date:future(2),start:'6:00 PM',location:'Chapter House',mandatory:false},
  ];

  // ── ATTENDANCE (realistic — some members miss events) ──
  const mandEvIds = ['e01','e02','e03','e04','e05','e06'];
  const attendance = {};
  const attRates = {m01:1,m02:1,m03:.83,m04:1,m05:.83,m06:1,m07:.67,m08:.83,m09:.5,m10:.67,m11:.83,m12:.5,m13:.33,m14:1,m15:.67,m16:1,m17:.83,m18:.67};
  mandEvIds.forEach(evId=>{
    attendance[evId]={};
    members.forEach(m=>{
      const r = attRates[m.id] || 0.75;
      attendance[evId][m.id] = Math.random() < r ? 'present' : (Math.random() < .3 ? 'excused' : 'absent');
    });
    // Ensure officers always present at first 3
    if(['e01','e02','e03'].includes(evId)){
      ['m01','m02','m03','m04'].forEach(id=>{ attendance[evId][id]='present'; });
    }
  });

  // ── TASKS ──
  const tasks = [
    {id:'t01',title:'Submit IFC compliance report',assignedTo:'m02',priority:'urgent',status:'todo',dueDate:future(2),desc:'Annual IFC safety and risk management compliance report due to Greek Life office.'},
    {id:'t02',title:'Update chapter budget spreadsheet',assignedTo:'m03',priority:'high',status:'in_progress',dueDate:future(5),desc:'Q2 budget vs actuals — include Spring Formal expenses.'},
    {id:'t03',title:'Draft recruitment email sequence',assignedTo:'m05',priority:'high',status:'in_progress',dueDate:future(4),desc:'3-email outreach sequence for Fall rush prospects.'},
    {id:'t04',title:'Book venue for Spring Formal',assignedTo:'m09',priority:'high',status:'done',dueDate:past(3),desc:''},
    {id:'t05',title:'Collect outstanding dues — 4 members',assignedTo:'m03',priority:'medium',status:'in_progress',dueDate:future(7),desc:''},
    {id:'t06',title:'Schedule new member education sessions',assignedTo:'m16',priority:'medium',status:'todo',dueDate:future(10),desc:''},
    {id:'t07',title:'Coordinate with philanthropy partner',assignedTo:'m08',priority:'medium',status:'done',dueDate:past(7),desc:''},
    {id:'t08',title:'Update chapter website',assignedTo:'m04',priority:'low',status:'todo',dueDate:future(14),desc:''},
    {id:'t09',title:'Prepare scholarship report for nationals',assignedTo:'m07',priority:'high',status:'todo',dueDate:past(2),desc:'Overdue — GPA data needs to be compiled and submitted.'},
    {id:'t10',title:'Book DJ for Spring Formal',assignedTo:'m09',priority:'medium',status:'done',dueDate:past(5),desc:''},
    {id:'t11',title:'Post chapter meeting minutes',assignedTo:'m04',priority:'medium',status:'done',dueDate:past(6),desc:''},
    {id:'t12',title:'Alumni newsletter draft',assignedTo:'m18',priority:'low',status:'in_progress',dueDate:future(12),desc:''},
  ];

  // ── GOALS ──
  const goals = [
    {id:'g01',title:'Chapter Attendance Rate',current:82,target:90,unit:'%'},
    {id:'g02',title:'New Members This Semester',current:14,target:20,unit:'members'},
    {id:'g03',title:'Dues Collection Rate',current:87,target:95,unit:'%'},
    {id:'g04',title:'Service Hours',current:312,target:500,unit:'hours'},
    {id:'g05',title:'GPA Above Chapter Average',current:11,target:18,unit:'members'},
  ];

  // ── NOTES ──
  const notes = [
    {id:'n01',title:'Chapter Meeting — Week 8',type:'chapter',date:past(7),author:'m04',
     announcements:'Spring Formal tickets on sale. Brotherhood retreat debrief shared.\nIFC compliance deadline is next week — VP following up.',
     oldBusiness:'Dues collection at 87%. Treasurer sending final reminder this week.',
     newBusiness:'Recruitment kickoff event approved for '+future(3)+'. Risk Manager to file event approval.',
     actions:['VP to submit IFC compliance report by '+future(2),'Treasurer to finalize dues list','Recruitment Chair to send kickoff invitations'],
     ooh:'Alex Rivera',botw:'Connor Walsh',buffon:'Logan Price',
     officerReports:[
       {role:'President',name:'James Mitchell',notes:'Met with Greek Life advisor. Chapter in good standing. Nationals visit scheduled for next month.'},
       {role:'VP',name:'Ryan Torres',notes:'IFC compliance report in progress. Due '+future(2)+'. Risk workshop attendance was 94%.'},
       {role:'Treasurer',name:'Connor Walsh',notes:'Budget is on track. 4 members still owe semester dues. Spring Formal deposit paid.'},
       {role:'Recruitment Chair',name:'Alex Rivera',notes:'14 rushees in pipeline. 6 are bid-ready. Kickoff event planning underway.'},
     ]},
    {id:'n02',title:'Exec Meeting — Spring Formal Planning',type:'exec',date:past(14),author:'m01',
     announcements:'Venue confirmed. Budget approved at $4,200.',
     oldBusiness:'DJ booked. Catering quotes received.',
     newBusiness:'Ticket pricing set at $35/person. Sales start Monday.',
     actions:['Social Chair to open ticket sales','Treasurer to track ticket revenue'],
     officerReports:[]},
    {id:'n03',title:'Chapter Meeting — Week 6',type:'chapter',date:past(21),author:'m04',
     announcements:'Philanthropy 5K registration open. Brotherhood retreat details shared.',
     oldBusiness:'New member education program on track. 3 sessions completed.',
     newBusiness:'Alumni golf outing scheduled for '+future(21)+'. Alumni Relations Chair coordinating.',
     actions:['All members to register for 5K by end of week','Alumni Chair to send golf outing invitations'],
     ooh:'Marcus Bell',botw:'Tyler Brooks',
     officerReports:[]},
  ];

  // ── JUDICIAL CASES ──
  const cases = [
    {id:'jc01',caseNum:'JB-2024-001',member:'m13',type:'attendance',status:'open',
     desc:'Member has missed 4 of 6 mandatory events this semester without submitting excused absence requests. Pattern of non-engagement.',
     filedBy:'m04',hearingDate:future(5)},
    {id:'jc02',caseNum:'JB-2024-002',member:'m10',type:'financial',status:'scheduled',
     desc:'Member is 45 days overdue on semester dues with no payment plan in place.',
     filedBy:'m03',hearingDate:future(3)},
    {id:'jc03',caseNum:'JB-2023-008',member:'m15',type:'conduct',status:'resolved',
     desc:'Conduct violation at chapter event. Member completed 10 hours community service as agreed.',
     filedBy:'m01',resolution:'10 hours community service completed. Case closed.',hearingDate:past(30)},
  ];

  // ── SOBER SHIFTS ──
  const shifts = [
    {id:'sh01',event:'Spring Formal',date:future(14),start:'7:00 PM',end:'12:00 AM',memberId:'m06',confirmed:true,noShow:false},
    {id:'sh02',event:'Spring Formal',date:future(14),start:'7:00 PM',end:'12:00 AM',memberId:'m10',confirmed:true,noShow:false},
    {id:'sh03',event:'Recruitment Kickoff',date:future(3),start:'5:00 PM',end:'10:00 PM',memberId:'m14',confirmed:true,noShow:false},
    {id:'sh04',event:'Recruitment Kickoff',date:future(3),start:'5:00 PM',end:'10:00 PM',memberId:null,confirmed:false,noShow:false},
    {id:'sh05',event:'IFC Philanthropy Walk',date:future(28),start:'10:00 AM',end:'2:00 PM',memberId:'m11',confirmed:false,noShow:false},
  ];

  // ── ACADEMICS ──
  const gpas = {
    m01:{cumulativeGpa:'3.72',priorGpa:'3.81',semesterGpa:'3.65'},
    m02:{cumulativeGpa:'3.45',priorGpa:'3.50',semesterGpa:'3.40'},
    m03:{cumulativeGpa:'3.88',priorGpa:'3.92',semesterGpa:'3.85'},
    m04:{cumulativeGpa:'3.21',priorGpa:'3.18',semesterGpa:'3.30'},
    m05:{cumulativeGpa:'3.05',priorGpa:'2.98',semesterGpa:'3.15'},
    m06:{cumulativeGpa:'2.89',priorGpa:'2.75',semesterGpa:'3.00'},
    m07:{cumulativeGpa:'3.94',priorGpa:'3.90',semesterGpa:'3.97'},
    m08:{cumulativeGpa:'3.33',priorGpa:'3.40',semesterGpa:'3.28'},
    m09:{cumulativeGpa:'2.71',priorGpa:'2.65',semesterGpa:'2.78'},
    m10:{cumulativeGpa:'2.55',priorGpa:'2.60',semesterGpa:'2.50'},
    m11:{cumulativeGpa:'3.10',priorGpa:'3.05',semesterGpa:'3.20'},
    m12:{cumulativeGpa:'3.62',priorGpa:'',semesterGpa:'3.62'},
    m13:{cumulativeGpa:'2.40',priorGpa:'',semesterGpa:'2.40'},
    m14:{cumulativeGpa:'3.55',priorGpa:'3.48',semesterGpa:'3.60'},
    m15:{cumulativeGpa:'2.95',priorGpa:'3.00',semesterGpa:'2.88'},
    m16:{cumulativeGpa:'3.78',priorGpa:'3.82',semesterGpa:'3.74'},
    m17:{cumulativeGpa:'3.15',priorGpa:'3.10',semesterGpa:'3.22'},
    m18:{cumulativeGpa:'3.40',priorGpa:'3.35',semesterGpa:'3.45'},
  };

  // ── FINANCE ──
  const semDues = 425;
  const dues = {};
  members.forEach((m,i)=>{
    const paid = i < 14 ? semDues : (i===14 ? 200 : (i===15 ? 0 : semDues));
    dues[m.id]={semesterDues:semDues,paid,status:paid>=semDues?'Paid':paid>0?'Partial':'Unpaid',fineCount:0};
  });
  const expenses = [
    {id:'ex01',desc:'Spring Formal venue deposit',category:'Social',amount:1200,date:past(18)},
    {id:'ex02',desc:'DJ booking — Spring Formal',category:'Social',amount:650,date:past(10)},
    {id:'ex03',desc:'Philanthropy 5K supplies',category:'Philanthropy',amount:280,date:past(12)},
    {id:'ex04',desc:'Chapter house cleaning supplies',category:'House',amount:95,date:past(8)},
    {id:'ex05',desc:'New member welcome gifts',category:'Brotherhood',amount:340,date:past(20)},
    {id:'ex06',desc:'IFC dues payment',category:'Operations',amount:500,date:past(25)},
    {id:'ex07',desc:'Recruitment event supplies',category:'Recruitment',amount:175,date:past(3)},
  ];
  const fines = [
    {id:'fi01',memberId:'m09',amount:25,reason:'Missed mandatory event without excuse',date:past(6),paid:false},
    {id:'fi02',memberId:'m13',amount:50,reason:'Missed 3+ mandatory events',date:past(4),paid:false},
  ];

  // ── RECRUITMENT ──
  const rushees = [
    {id:'r01',name:'Jake Morrison',stage:'Bid Ready',major:'Business',hometown:'Chicago, IL',bidScore:88,recruiter:'m05',lastContact:past(1),eventsAttended:4,tags:['Leadership','Good Fit'],notes:'Strong candidate. President of high school student council. Great cultural fit.'},
    {id:'r02',name:'Tyler Nguyen',stage:'Bid Ready',major:'Engineering',hometown:'Dallas, TX',bidScore:82,recruiter:'m05',lastContact:past(2),eventsAttended:3,tags:['Academics','Good Fit']},
    {id:'r03',name:'Sam Elliott',stage:'Interviewed',major:'Finance',hometown:'Columbus, OH',bidScore:76,recruiter:'m14',lastContact:past(1),eventsAttended:3,tags:['Leadership']},
    {id:'r04',name:'Chris Patel',stage:'Bid Ready',major:'Pre-Med',hometown:'Atlanta, GA',bidScore:91,recruiter:'m05',lastContact:past(0),eventsAttended:5,tags:['Hot Prospect','Academics']},
    {id:'r05',name:'Derek Wilson',stage:'Active Rush',major:'Marketing',hometown:'Denver, CO',bidScore:65,recruiter:'m14',lastContact:past(3),eventsAttended:2,tags:['Social Fit']},
    {id:'r06',name:'Austin Lee',stage:'Active Rush',major:'Kinesiology',hometown:'Phoenix, AZ',bidScore:71,recruiter:'m05',lastContact:past(2),eventsAttended:2,tags:['Athlete','Good Fit']},
    {id:'r07',name:'Nate Cooper',stage:'Attended Event',major:'Computer Science',hometown:'Seattle, WA',bidScore:58,recruiter:'m14',lastContact:past(5),eventsAttended:1,tags:['Academics']},
    {id:'r08',name:'Josh Kim',stage:'Attended Event',major:'Communications',hometown:'Miami, FL',bidScore:54,recruiter:null,lastContact:past(7),eventsAttended:1,tags:[]},
    {id:'r09',name:'Will Patterson',stage:'Contacted',major:'Political Science',hometown:'Boston, MA',bidScore:45,recruiter:null,lastContact:past(6),eventsAttended:0,tags:[]},
    {id:'r10',name:'Ryan Chen',stage:'New Lead',major:'Accounting',hometown:'Portland, OR',bidScore:38,recruiter:null,lastContact:null,eventsAttended:0,tags:[]},
    {id:'r11',name:'Ben Harris',stage:'Bid Extended',major:'Architecture',hometown:'Nashville, TN',bidScore:84,recruiter:'m05',lastContact:past(1),eventsAttended:4,tags:['Good Fit','Leadership']},
    {id:'r12',name:'Cole Martinez',stage:'Accepted',major:'Business',hometown:'Austin, TX',bidScore:94,recruiter:'m14',lastContact:past(0),eventsAttended:6,tags:['Hot Prospect','Legacy']},
    {id:'r13',name:'Ian Foster',stage:'Accepted',major:'Finance',hometown:'St. Louis, MO',bidScore:87,recruiter:'m05',lastContact:past(0),eventsAttended:5,tags:['Good Fit']},
    {id:'r14',name:'Max Thompson',stage:'Active Rush',major:'Sports Management',hometown:'Indianapolis, IN',bidScore:68,recruiter:'m14',lastContact:past(4),eventsAttended:2,tags:['Athlete']},
  ];
  const rcEvents = [
    {id:'re01',name:'Meet the Brothers',date:future(3),time:'5:00 PM',location:'Chapter House',type:'Social',rsvp:28,recruiters:['m05','m14']},
    {id:'re02',name:'Philanthropy Service Day',date:future(10),time:'10:00 AM',location:'Food Bank',type:'Service',rsvp:12,recruiters:['m05']},
    {id:'re03',name:'Bid Night',date:future(17),time:'7:00 PM',location:'Chapter House',type:'Bid Night',rsvp:null,recruiters:['m05','m14','m01']},
    {id:'re04',name:'Sports Night',date:past(8),time:'6:00 PM',location:'Rec Center',type:'Social',rsvp:22,recruiters:['m05','m14']},
    {id:'re05',name:'Coffee Chat Series — Week 1',date:past(15),time:'3:00 PM',location:'Campus Coffee Shop',type:'Informal',rsvp:8,recruiters:['m14']},
  ];

  // ── COMMITTEES ──
  const committees = [
    {id:'com01',name:'Risk Management Committee',desc:'Oversees event safety, sober brother scheduling, and policy compliance.',chair:'m06',members:['m06','m01','m02','m09']},
    {id:'com02',name:'Recruitment Committee',desc:'Plans and executes all rush events and manages the prospect pipeline.',chair:'m05',members:['m05','m14','m11','m12']},
    {id:'com03',name:'Philanthropy Committee',desc:'Organizes service events and manages fundraising initiatives.',chair:'m08',members:['m08','m10','m13','m17']},
    {id:'com04',name:'Scholarship Committee',desc:'Monitors academic standing and supports members on academic probation.',chair:'m07',members:['m07','m04','m16']},
  ];

  // ── PHILANTHROPY ──
  const phEvents = [
    {id:'ph01',title:'5K Charity Run',kind:'philanthropy',date:past(10),description:'Annual 5K benefiting local food bank.',hours:3,participants:14,fundsGoal:1000},
    {id:'ph02',title:'Food Bank Volunteer Day',kind:'service',date:past(25),description:'Monthly volunteering at the campus-adjacent food bank.',hours:4,participants:10},
    {id:'ph03',title:'Spring Fundraiser Gala',kind:'fundraiser',date:future(30),description:'Annual gala raising funds for chapter scholarship.',hours:4,participants:0,fundsGoal:2000},
  ];
  const phHours = members.slice(0,12).map(m=>({id:uid(),memberId:m.id,eventId:'ph01',hours:3,date:past(10)}));
  const phFunds = [
    {id:uid(),amount:840,memberId:null,date:past(10),eventId:'ph01',notes:'5K registration fees'},
    {id:uid(),amount:250,memberId:'m08',date:past(8),eventId:null,notes:'Individual donor'},
  ];

  // ── ALUMNI ──
  const alumni = {
    contacts:[
      {id:'al01',name:'Michael Thompson',gradYear:2019,employer:'Goldman Sachs',industry:'Finance',location:'New York, NY',engagement:'Active',email:'m.thompson@example.com'},
      {id:'al02',name:'David Chen',gradYear:2021,employer:'Google',industry:'Technology',location:'San Francisco, CA',engagement:'Active',email:'d.chen@example.com'},
      {id:'al03',name:'Kevin Murphy',gradYear:2017,employer:'McKinsey & Co',industry:'Consulting',location:'Chicago, IL',engagement:'Occasional'},
      {id:'al04',name:'Scott Williams',gradYear:2020,employer:'Deloitte',industry:'Consulting',location:'Dallas, TX',engagement:'Active'},
      {id:'al05',name:'Brian Rodriguez',gradYear:2022,employer:'JP Morgan',industry:'Finance',location:'New York, NY',engagement:'Occasional'},
    ],
    events:[
      {id:'alev01',title:'Alumni Golf Outing',date:future(21),type:'Social',location:'Riverside Golf Club',notes:'Annual alumni event. 24 RSVPs so far.'},
      {id:'alev02',title:'Homecoming Alumni Reception',date:past(60),type:'Networking',location:'Alumni Center',notes:'35 alumni attended. Great turnout.'},
    ],
    outreach:[
      {id:'alout01',alumniId:'al01',method:'LinkedIn',date:past(5),byId:'m18',notes:'Connected re: career panel for actives. He agreed to speak in April.'},
      {id:'alout02',alumniId:'al02',method:'Email',date:past(12),byId:'m18',notes:'Invited to golf outing. Confirmed attendance.'},
      {id:'alout03',alumniId:'al04',method:'Phone',date:past(20),byId:'m01',notes:'Discussed chapter update. Alumni gift pending.'},
    ],
  };

  // ── SETTINGS ──
  const settings = {
    name:'James Mitchell',year:2025,classYear:'Senior',
    notifAttendance:true,notifTasks:true,notifSober:true,notifWeekly:true,
    chapterName:'Beta Chapter',university:'State University',
    chapterSize:'18',chapterFounded:'1987',
  };

  // ── ASSEMBLE D ──
  // ── TRANSITION HUB (15 roles) ──
  const transitions = [
    {id:'tr01',role:'President',outgoing:'m01',incoming:'m02',status:'in_progress',
     content:'Key priorities for incoming President:\n• Rebuild relationship with Greek Life advisor — schedule meeting in Week 1\n• The exec team responds to consistent accountability. Weekly 1-on-1s matter more than chapter meetings.\n• ATO national visit is in October. Make sure all compliance docs are current by September.',
     wishIKnew:'The job is 80% communication and follow-up. Set clear weekly expectations and never let a deadline slip twice. Your exec team will only move as fast as you hold them accountable.',
     contacts:[{name:'Dr. Sarah Kim',role:'Greek Life Advisor',email:'skim@university.edu',phone:'555-0101'},{name:'National Field Officer',role:'Nationals',email:'fieldofficer@ato.org',phone:'555-0199'}]},
    {id:'tr02',role:'Vice President',outgoing:'m02',incoming:'m05',status:'in_progress',
     content:'VP runs chapter meetings and tracks officer accountability. Key things:\n• Agenda template is saved in Files — use it every week\n• The weekly exec check-in on Monday is non-negotiable\n• Attendance warnings go through you before they go to JBoard',
     wishIKnew:'Agenda discipline makes or breaks chapter meetings. Send it 24 hours out, stick to time limits, never let open forum run more than 5 minutes.',
     contacts:[{name:'IFC Vice President',role:'IFC Executive',email:'ifc@university.edu',phone:'555-0102'}]},
    {id:'tr03',role:'Treasurer',outgoing:'m03',incoming:null,status:'review',
     content:'Budget spreadsheet is pinned in Files. Key handoff items:\n• IFC dues payment is due Week 2 — do not miss it, late fees compound\n• 4 members still on partial payment plans; see finance tracker\n• Semester budget is at 73% spent with 4 weeks remaining',
     wishIKnew:'Chase dues early and often. The first 3 weeks set the tone. Members who don\'t pay by Week 4 rarely pay voluntarily.',
     contacts:[{name:'IFC Treasurer',role:'IFC',email:'treasurer@ifc.edu',phone:'555-0103'}]},
    {id:'tr04',role:'Secretary',outgoing:'m04',incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr05',role:'Risk Manager',outgoing:'m06',incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr06',role:'Recruitment Chair',outgoing:'m05',incoming:null,status:'complete',
     content:'Full rushee CRM is live in the platform. Key handoff items:\n• 14 current rushees — 3 accepted, 3 bid-ready. Follow up before semester ends.\n• Rush event debrief doc is in Files\n• Recruiter performance data is in the Recruitment CRM → Overview tab',
     wishIKnew:'Relationships close bids, not events. Train every brother on how to have a conversation, not just a pitch.',
     contacts:[{name:'IFC Recruitment Director',role:'IFC',email:'recruitment@ifc.edu',phone:'555-0104'}]},
    {id:'tr07',role:'Scholarship Chair',outgoing:'m07',incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr08',role:'Philanthropy Chair',outgoing:'m08',incoming:null,status:'complete',
     content:'Semester philanthropy wrap-up complete. Final hours: 312 chapter hours logged.\n• Food bank partnership renewed for next semester\n• 5K run raised $1,090 — surpassed $1,000 goal\n• IFC hours report submitted on time',
     wishIKnew:'Know the IFC minimum hours requirement on Day 1 and set your goal above it. Transportation is usually the biggest barrier to participation.',
     contacts:[{name:'Campus Food Bank',role:'Partner Org',email:'volunteer@foodbank.org',phone:'555-0150'}]},
    {id:'tr09',role:'Social Chair',outgoing:'m09',incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr10',role:'Chaplain',outgoing:'m17',incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr11',role:'New Member Educator',outgoing:'m16',incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr12',role:'Alumni Relations Chair',outgoing:'m18',incoming:null,status:'in_progress',
     content:'Alumni golf outing is in 3 weeks — venue and catering are confirmed.\n• 24 alumni RSVPs so far. Call list for non-responders is in Files.\n• LinkedIn alumni network has 47 connected — keep it updated after every outreach.',
     wishIKnew:'Alumni engagement compounds over time. A direct message from you beats a mass email every time. Stay personal.',
     contacts:[{name:'Alumni Association',role:'University',email:'alumni@university.edu',phone:'555-0200'}]},
    {id:'tr13',role:'Community Service Chair',outgoing:null,incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr14',role:'Public Relations',outgoing:null,incoming:null,status:'not_started',
     content:'',wishIKnew:'',contacts:[]},
    {id:'tr15',role:'House Manager',outgoing:'m14',incoming:null,status:'review',
     content:'House inspection checklist is in Files. Outstanding items:\n• HVAC unit in east wing needs service — contact Mark Briggs at house corp\n• Deck railing repair scheduled for spring break week\n• Room assignments for next semester need to be finalized by April 15',
     wishIKnew:'Build a relationship with house corp in Week 1. Keep a running maintenance log — it protects you when something goes wrong.',
     contacts:[{name:'Mark Briggs',role:'House Corporation',email:'mbriggs@housecorp.org',phone:'555-0300'}]},
  ];

  const transitionHub = {
    deadlines: [
      {id:'thd1',title:'Submit chapter roster to IFC',owner:'Secretary',when:'Week 1 of every semester',priority:'high',notes:'Late submission results in chapter fines.',done:false},
      {id:'thd2',title:'IFC dues payment',owner:'Treasurer',when:'Week 2 of every semester',priority:'high',notes:'Check IFC invoice for exact amount.',done:false},
      {id:'thd3',title:'ATO national member report',owner:'Secretary',when:'Week 3 of every semester',priority:'high',notes:'Submit via myATO portal.',done:true},
      {id:'thd4',title:'GPA collection from all members',owner:'Scholarship Chair',when:'Weeks 2–4 each semester',priority:'high',notes:'Needed for IFC and national reporting.',done:false},
      {id:'thd5',title:'Semester budget submission',owner:'Treasurer',when:'Week 1 of every semester',priority:'high',notes:'Full budget presented at first exec meeting.',done:true},
      {id:'thd6',title:'Officer transition documents complete',owner:'Vice President',when:'Final 2 weeks of semester',priority:'high',notes:'All outgoing officers must complete before changeover.',done:false},
    ],
    issues: [
      {id:'thi1',title:'Chapter house HVAC needs inspection',priority:'high',notes:'Unit in east wing hasn\'t been serviced in 18 months. House corp contact is Mark Briggs. Get this done before summer.',owner:'House Manager',open:true},
      {id:'thi2',title:'IFC late filing from last semester — $150 fine outstanding',priority:'medium',notes:'Treasurer needs to pay this before new semester starts or it compounds.',owner:'Treasurer',open:true},
      {id:'thi3',title:'Two members on academic probation — need follow-up plan',priority:'high',notes:'Owen Reed and Ethan Cole. Both below 2.6 GPA. Scholarship Chair to meet with them individually in first 2 weeks.',owner:'Scholarship Chair',open:true},
    ],
    archive: [
      {id:'tha1',semester:'Fall 2023',summary:'Strong recruitment semester — 16 new members. Attendance averaged 88%. Spring Formal budget came in under by $400.',date:'2024-01-10'},
    ],
  };

  D = {
    members, events, attendance, tasks, goals, notes,
    cases, shifts, transitions,
    academics: { gpas, history: [{semester:'Fall 2023',chapterGpa:'3.24'},{semester:'Spring 2023',chapterGpa:'3.31'}] },
    finance: {
      dues, fines, expenses, plans: [],
      payments: [
        {id:'pay01',memberId:'m02',amount:425,type:'Semester Dues',method:'Venmo',date:past(2)},
        {id:'pay02',memberId:'m07',amount:425,type:'Semester Dues',method:'Check',date:past(4)},
        {id:'pay03',memberId:'m10',amount:425,type:'Semester Dues',method:'Zelle',date:past(5)},
        {id:'pay04',memberId:'m12',amount:425,type:'Semester Dues',method:'Venmo',date:past(7)},
        {id:'pay05',memberId:'m17',amount:425,type:'Semester Dues',method:'Cash',date:past(9)},
        {id:'pay06',memberId:'m15',amount:200,type:'Partial Dues',method:'Venmo',date:past(11)},
      ],
      nationalDues: {}, nationalPayments: [],
      budget: {Social:2500,Recruitment:1500,Philanthropy:800,House:600,Brotherhood:500,Operations:700,Risk:300},
    },
    recruitment: { rushees: rcEvents.concat([]).filter(()=>false).concat([]), events: rcEvents, goal: {target:20,label:'New Members This Semester'} },
    committees, philanthropy: {events:phEvents, hours:phHours, funds:phFunds, goals:[
      {id:'phg1',label:'Total Service Hours',target:500,unit:'hrs'},
      {id:'phg2',label:'Service Events',target:6,unit:'events'},
      {id:'phg3',label:'Avg Hours / Member',target:4,unit:'hrs'},
      {id:'phg4',label:'Philanthropy Events',target:4,unit:'events'},
      {id:'phg5',label:'Total Funds Raised',target:2000,unit:'$'},
    ]},
    alumni, ritual: {items:[],sessions:[],nmProgress:{}},
    vendors: [], playbooks: [], files: [],
    transitionHub,
    notifs: [], agenda: {items:[],archived:[]},
    settings,
  };
  // fix recruitment rushees
  D.recruitment.rushees = rushees;
}

// ── DEMO INIT (replaces Firebase init completely) ──
async function init(){
  // Load seed data into D
  loadDemoData();

  // Hide auth loading spinner immediately
  const authLoading = document.getElementById('auth-loading');
  if(authLoading){ authLoading.classList.add('hidden'); setTimeout(()=>authLoading.remove(),400); }

  // Auto-login as President — no credentials needed
  CURRENT_USER = {
    uid: 'demo_user',
    email: 'president@ato-demo.edu',
    mid: 'm01',
    name: 'James Mitchell',
    role: 'President',
    title: 'Chapter President',
  };

  // Hide login gate, show app
  const gate = document.getElementById('login-gate');
  if(gate){ gate.style.display='none'; }
  const appNav = document.getElementById('app-nav');
  const appMain = document.getElementById('app-main');
  if(appNav) appNav.style.display='';
  if(appMain) appMain.style.display='';

  // Set topbar / sidebar user info
  document.getElementById('u-av').textContent = 'JM';
  document.getElementById('u-name').textContent = 'James Mitchell';
  document.getElementById('u-role').textContent = 'President';
  document.getElementById('tb-av').textContent = 'JM';

  // Set date + semester
  const now = new Date();
  document.getElementById('tb-date').textContent =
    now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) + ' · ' + getSemester();
  const sbSem = document.getElementById('sb-sem');
  if(sbSem) sbSem.textContent = 'State University · ' + getSemester();
  const ned = document.getElementById('ne-d');
  if(ned) ned.value = now.toISOString().split('T')[0];
  const mnd = document.getElementById('mn-d');
  if(mnd) mnd.value = now.toISOString().split('T')[0];

  // Apply RBAC sidebar (President sees everything)
  rbacApplySidebar();
  resetInactivityTimer();

  // Render dashboard
  renderDash();
  updateBadges();
}

// ── DEMO ROLE SWITCHER ──
function switchDemoRole(role) {
  if (!CURRENT_USER || !role) return;
  // Both role and title must be set — canEditX() functions check CURRENT_USER.title
  CURRENT_USER.role = role;
  CURRENT_USER.title = role;
  const avatarMap = {
    ‘President’:’JM’,’Vice President’:’RT’,’Treasurer’:’CW’,’Secretary’:’DP’,
    ‘Risk Manager’:’MB’,’Recruitment Chair’:’AR’,’Scholarship Chair’:’TB’,
    ‘Chaplain’:’HJ’,’Philanthropy Chair’:’JH’,’Community Service Chair’:’JH’,
    ‘Alumni Relations Chair’:’DS’,’New Member Educator’:’ME’,’Social Chair’:’NS’,
    ‘House Manager’:’CH’,’Public Relations’:’LP’,’viewer’:’??’,
  };
  const nameMap = {
    ‘President’:’James Mitchell’,’Vice President’:’Ryan Torres’,’Treasurer’:’Connor Walsh’,
    ‘Secretary’:’Daniel Park’,’Risk Manager’:’Marcus Bell’,’Recruitment Chair’:’Alex Rivera’,
    ‘Scholarship Chair’:’Tyler Brooks’,’Chaplain’:’Hunter James’,’Philanthropy Chair’:’Jordan Hayes’,
    ‘Community Service Chair’:’Jordan Hayes’,’Alumni Relations Chair’:’Drew Santos’,
    ‘New Member Educator’:’Mason Evans’,’Social Chair’:’Nathan Scott’,
    ‘House Manager’:’Caleb Hughes’,’Public Relations’:’Logan Price’,’viewer’:’Guest User’,
  };
  const av = avatarMap[role]||role.slice(0,2).toUpperCase();
  const name = nameMap[role]||role;
  document.getElementById(‘u-av’).textContent = av;
  document.getElementById(‘u-name’).textContent = name;
  document.getElementById(‘u-role’).textContent = role;
  document.getElementById(‘tb-av’).textContent = av;
  rbacApplySidebar();
  const label = document.getElementById(‘demo-role-label’);
  if (label) label.textContent = role;
  const sel = document.getElementById(‘demo-role-switcher’);
  if (sel) sel.selectedIndex = 0;
  nav(‘dashboard’, null);
  toast(`Now viewing as ${role} — sidebar and edit controls reflect this role`, ‘info’, 3500);
}

init();
