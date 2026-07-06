/* OpsCore 2.0 Demo — Otis AI Assistant Widget
   Fully simulated: no network requests, no Firebase, no real AI backend.
   Replies are generated locally from canned templates + live demo data in D. */

let otisHistory = [];
let otisLoading = false;

// ── Inject widget HTML into <body> ──
function otisInit(user) {
  if (document.getElementById('otis-widget')) return;

  const firstName = (user?.name || 'there').split(' ')[0];

  document.body.insertAdjacentHTML('beforeend', `
    <div id="otis-widget">
      <div id="otis-panel" aria-hidden="true">
        <div id="otis-header">
          <div class="otis-hd-left">
            <div class="otis-avatar-sm">O</div>
            <div>
              <div class="otis-title">Otis</div>
              <div class="otis-sub">Chapter Assistant (Demo)</div>
            </div>
          </div>
          <button class="otis-close" onclick="otisToggle()" aria-label="Close">✕</button>
        </div>
        <div id="otis-msgs">
          <div class="otis-msg ai">
            Hey ${firstName}! I'm Otis, your chapter operations assistant. Ask me about your chapter's tasks, events, recruitment, or click a quick prompt below.
          </div>
        </div>
        <div id="otis-quick-prompts" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 4px;border-top:1px solid var(--bdr);">
          <button class="otis-qp" onclick="otisQuickSend('Give me 5 rush event ideas for this semester')" style="background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;color:var(--tx)">Rush ideas</button>
          <button class="otis-qp" onclick="otisQuickSend('Suggest a philanthropy event we could run this month')" style="background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;color:var(--tx)">Philo event</button>
          <button class="otis-qp" onclick="otisQuickSend('Give me brotherhood event ideas that would bring the chapter together')" style="background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;color:var(--tx)">Brotherhood</button>
          <button class="otis-qp" onclick="otisQuickSend('Suggest a community service project for the chapter')" style="background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;color:var(--tx)">Service project</button>
          <button class="otis-qp" onclick="otisQuickSend('Give me new member programming event ideas')" style="background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;color:var(--tx)">NME ideas</button>
          <button class="otis-qp" onclick="otisQuickSend('Help me draft a chapter-wide announcement')" style="background:var(--surf);border:1px solid var(--bdr);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap;color:var(--tx)">Draft announcement</button>
        </div>
        <div id="otis-input-wrap">
          <textarea id="otis-input" placeholder="Ask Otis anything…" rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();otisSend();}"
            oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
          <button id="otis-send-btn" onclick="otisSend()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div id="otis-powered">Demo mode — simulated responses generated locally, no data leaves your browser</div>
      </div>
      <button id="otis-bubble" onclick="otisToggle()" aria-label="Open Otis AI">
        <span class="otis-bubble-o">O</span>
        <span class="otis-bubble-label">Otis</span>
      </button>
    </div>
  `);
}

// ── Reset greeting (used when the demo role switcher changes the active user) ──
function otisGreet(name) {
  const msgs = document.getElementById('otis-msgs');
  if (!msgs) return;
  const firstName = (name || 'there').split(' ')[0];
  msgs.innerHTML = `<div class="otis-msg ai">Hey ${firstName}! I'm Otis, your chapter operations assistant. Ask me about your chapter's tasks, events, recruitment, or click a quick prompt below.</div>`;
  otisHistory = [];
}

// ── Toggle chat panel ──
function otisToggle() {
  const panel  = document.getElementById('otis-panel');
  const bubble = document.getElementById('otis-bubble');
  if (!panel) return;

  const isOpen = panel.classList.toggle('open');
  panel.setAttribute('aria-hidden', String(!isOpen));
  bubble.classList.toggle('active', isOpen);

  if (isOpen) {
    setTimeout(() => document.getElementById('otis-input')?.focus(), 160);
  }
}

// ── Quick prompt shortcut ──
function otisQuickSend(text) {
  const input = document.getElementById('otis-input');
  if (input) {
    input.value = text;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  }
  otisSend();
}

// ── Build live chapter context from D + CURRENT_USER (local use only — never transmitted) ──
function otisGetContext() {
  const activePage = document.querySelector('.page.active');
  const pageId = activePage ? activePage.id.replace('page-', '') : 'dashboard';
  const today = new Date().toISOString().split('T')[0];

  const upcomingEventsArr = (D.events || []).filter(e => (e.date || '') >= today);

  let unpaidCount = 0;
  if (D.members?.length && D.finance?.dues) {
    D.members.forEach(m => {
      if ((D.finance.dues[m.id]?.status || 'Partial') !== 'Paid') unpaidCount++;
    });
  }

  const openCasesArr = (D.cases || []).filter(c => {
    const s = (c.status || '').toLowerCase();
    return !['resolved', 'dismissed', 'closed'].includes(s);
  });

  const openTasksArr = (D.tasks || []).filter(t => {
    const s = (t.status || '').toLowerCase();
    return !['done', 'complete', 'completed'].includes(s);
  });

  return {
    chapter:     D.settings?.chapterName || 'Beta Chapter',
    currentPage: pageId,
    semester:    typeof getSemester === 'function' ? getSemester() : 'Current Semester',
    memberCount: (D.members || []).length,
    openTasks:   openTasksArr,
    upcomingEvents: upcomingEventsArr,
    unpaidCount,
    openCases:   openCasesArr,
    rushees:     D.recruitment?.rushees || [],
    philanthropy: D.philanthropy || null,
    communityService: D.communityService || null,
    academics:   D.academics || null,
  };
}

// ── Append a message bubble ──
function otisAddMsg(text, role) {
  const msgs = document.getElementById('otis-msgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `otis-msg ${role}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── Typing indicator ──
function otisShowTyping() {
  const msgs = document.getElementById('otis-msgs');
  if (!msgs || document.getElementById('otis-typing')) return;
  const el = document.createElement('div');
  el.id = 'otis-typing';
  el.className = 'otis-msg ai otis-typing-wrap';
  el.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function otisHideTyping() {
  document.getElementById('otis-typing')?.remove();
}

// ── Canned idea banks for the quick-prompt categories ──
const OTIS_IDEAS = {
  rush: [
    'Donut & coffee meet-and-greet on the quad — low pressure, high foot traffic',
    'Resume workshop co-hosted with a business fraternity to widen your draw',
    '3-on-3 basketball tournament with pizza after — shows brotherhood, not just sales pitches',
    'Casual house tour + game night for top-tier prospects in week 2',
    'Bid day cookout with families invited — great for the photos you\'ll use next semester',
  ],
  philo: [
    'Partner with a local food bank for a Saturday morning sorting shift',
    'Campus-wide blood drive hosted at the house, co-sponsored with Panhellenic',
    '5K fun run with proceeds going to your national philanthropy partner',
    'Adopt-a-highway cleanup day, then BBQ back at the house',
    'Letter-writing night for a local children\'s hospital',
  ],
  brotherhood: [
    'Intramural league kickoff with a chapter draft night',
    'Cabin retreat weekend — unplugged, just the chapter',
    'Big/little reveal with a themed banquet',
    'Game truck or bowling night, split into mixed-class teams to force new connections',
    'Alumni vs. actives flag football game',
  ],
  service: [
    'Habitat for Humanity build day — high visibility, great photos for recruitment',
    'Tutoring program partnership with a nearby high school',
    'Campus move-in day volunteer crew for incoming freshmen',
    'Park cleanup with the city parks department',
    'Holiday gift drive for a local shelter',
  ],
  nme: [
    'Chapter history scavenger hunt across campus landmarks',
    'Officer shadow day — each new member pairs with an exec for a week',
    'Etiquette dinner with alumni mentors',
    'Values workshop facilitated by your chaplain or risk manager',
    'New member talent show / open mic night',
  ],
};

function otisIdeaReply(category, label) {
  const list = OTIS_IDEAS[category] || [];
  const picks = list.slice(0, 5).map((idea, i) => `${i + 1}. ${idea}`).join('\n');
  return `Here are a few ${label} ideas:\n\n${picks}\n\nWant me to help draft an announcement for one of these?`;
}

// ── Locally generate a reply — no network calls, no AI backend ──
function otisGenerateReply(msg) {
  const m = msg.toLowerCase();
  const ctx = otisGetContext();

  if (m.includes('rush') && (m.includes('idea') || m.includes('event'))) return otisIdeaReply('rush', 'rush event');
  if (m.includes('philanthrop') && m.includes('event')) return otisIdeaReply('philo', 'philanthropy event');
  if (m.includes('brotherhood')) return otisIdeaReply('brotherhood', 'brotherhood event');
  if (m.includes('service') || m.includes('community')) return otisIdeaReply('service', 'community service');
  if (m.includes('new member') || m.includes('nme') || m.includes('pledge')) return otisIdeaReply('nme', 'new member programming');

  if (m.includes('draft') && (m.includes('announcement') || m.includes('email') || m.includes('message'))) {
    return `Here's a draft you can edit:\n\n"Hey ${ctx.chapter}! Quick update — we've got ${ctx.upcomingEvents.length} events on the calendar this month and ${ctx.openTasks.length} open action items across exec. Make sure you're checked in on attendance and reach out to your officer if you have questions. Let's keep the momentum going this ${ctx.semester}!"\n\nWant me to adjust the tone or add specific event details?`;
  }

  if (m.includes('task')) {
    if (!ctx.openTasks.length) return 'Nice — there are no open tasks right now. Everything is checked off.';
    const top = ctx.openTasks.slice(0, 5).map(t => `• ${t.title || t.name || 'Untitled task'}${t.assignee ? ' — ' + t.assignee : ''}`).join('\n');
    return `There are ${ctx.openTasks.length} open tasks right now. Top of the list:\n\n${top}`;
  }

  if (m.includes('event') || m.includes('calendar')) {
    if (!ctx.upcomingEvents.length) return 'There\'s nothing on the calendar right now — might be a good time to plan something.';
    const top = ctx.upcomingEvents.slice(0, 5).map(e => `• ${e.name} — ${e.date}`).join('\n');
    return `You've got ${ctx.upcomingEvents.length} upcoming events. Next up:\n\n${top}`;
  }

  if (m.includes('due') || m.includes('finance') || m.includes('budget')) {
    return ctx.unpaidCount
      ? `${ctx.unpaidCount} member${ctx.unpaidCount === 1 ? '' : 's'} still owe dues this semester. Worth a reminder in the next chapter digest.`
      : 'Everyone is paid up on dues — nice work, Treasurer.';
  }

  if (m.includes('gpa') || m.includes('academic')) {
    if (!ctx.academics) return 'I don\'t have academic data loaded for this view.';
    const chapterGpa = ctx.academics.gpas?.chapter;
    return chapterGpa ? `Current chapter GPA is sitting at ${chapterGpa}. Want me to flag anyone below the academic probation threshold?` : 'Academic data is available but no chapter GPA is on file yet.';
  }

  if (m.includes('case') || m.includes('judicial')) {
    return ctx.openCases.length
      ? `There ${ctx.openCases.length === 1 ? 'is' : 'are'} ${ctx.openCases.length} open J-Board case${ctx.openCases.length === 1 ? '' : 's'}. Check the Judicial Board page for details.`
      : 'No open J-Board cases right now.';
  }

  if (m.includes('rush') || m.includes('recruit')) {
    const total = ctx.rushees.length;
    return total
      ? `Your recruitment pipeline has ${total} prospects tracked right now. Check the Recruitment CRM for a stage-by-stage breakdown.`
      : 'No rushees in the pipeline yet — might be worth planning a kickoff event.';
  }

  if (m.includes('member') && (m.includes('how many') || m.includes('count'))) {
    return `${ctx.chapter} currently has ${ctx.memberCount} members on the roster.`;
  }

  if (m.includes('hello') || m.includes('hi ') || m === 'hi' || m.includes('hey')) {
    return `Hey! I'm Otis — ask me about events, tasks, recruitment, finance, or academics, or try one of the quick prompts above.`;
  }

  return `I'm a simulated assistant for this demo, so my answers are templated rather than fully generative — but I can help brainstorm events, summarize chapter stats (tasks, events, dues, recruitment, academics), or draft an announcement. Try asking "what tasks are open?" or click a quick prompt above.`;
}

// ── "Send" a message — fully local, no fetch/network/Firebase ──
function otisSend() {
  if (otisLoading) return;
  const input = document.getElementById('otis-input');
  const msg   = input?.value.trim();
  if (!msg) return;

  input.value = '';
  input.style.height = 'auto';

  otisAddMsg(msg, 'user');
  otisHistory.push({ role: 'user', content: msg });

  otisLoading = true;
  const sendBtn = document.getElementById('otis-send-btn');
  if (sendBtn) sendBtn.disabled = true;
  otisShowTyping();

  // Simulate a short thinking delay so the typing indicator reads naturally
  const delay = 450 + Math.random() * 550;
  setTimeout(() => {
    const reply = otisGenerateReply(msg);
    otisHideTyping();
    otisAddMsg(reply, 'ai');
    otisHistory.push({ role: 'assistant', content: reply });
    otisLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    document.getElementById('otis-input')?.focus();
  }, delay);
}
