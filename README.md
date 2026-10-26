				🕰️ ساعة الدواء - Arabic Pill Reminder Clock

<p align="center">
  <strong>⚡ AI-Orchestrated &nbsp;·&nbsp; 🎯 Problem-led &nbsp;·&nbsp; 🚀 Shipped</strong>
</p>

> An elderly-friendly, Arabic-first Progressive Web App that tells the user
> **what time of day it is** and reminds them to take their medication  -
> designed for people living with Alzheimer's and their caregivers.
>
> **This project was built through AI orchestration.** I brought the
> problem, the judgment, and the testing. The AI brought the code. The
> result is a working product that runs on my father's bedside tablet.

---

Why this exists

My father has Alzheimer's. Every afternoon he wakes up from a nap
disoriented - the light outside looks like morning, the room is quiet, and
he genuinely believes it's a new day. He starts the day over: breakfast
again, questions again, confusion again.

What he needed was a **very simple clock** that tells him, at a glance,
**what part of the day it is** - not just the time. Something that would
say "مساءً" in huge letters on a distinct purple background so that even
mid-nap-confusion, his eyes would tell him it's evening.

I searched for an app that did this. I found plenty of dementia clocks -
but **none of them were Arabic**. None of them understood that Arabic
readers want Arabic phase words (`صباحاً`, `ظهراً`, `بعد الظهر`, `مساءً`,
`ليلاً`), RTL layout as a first-class citizen, and medicine names displayed
in Arabic.

So I built one. This is it.

-----

How this was built

This is not a developer's project that happened to use AI. It is a
**product that exists because AI orchestration is now possible**.

Here is how the work actually split:

| What I brought | What the AI brought |
|---|---|
| The problem  - a real one, in my own home | JavaScript, HTML, and CSS |
| The constraints  - Arabic-only, elderly-first, offline, on-device | File structure and architecture |
| Every feature decision  - meal buttons, fallback times, phase colors | Implementation of every feature I specified |
| Testing  - on my phone, on my father's tablet, in real conditions | Iteration on bugs I found |
| Judgment  - Switching numerals; enlarging the phase label | Refactors, cleanups, and technical trade-offs I could not have made myself |
| The decision to ship | The code that ships |

I am **not a software developer**. I have never written a JavaScript
function by hand. What I *am* is an orchestrator: I can define a problem
precisely, direct an AI assistant through dozens of iterations, test
against reality, and know when a design is wrong.

This repository is proof of that role. It is not a claim that I can code.
It is a claim that **I can build**.

---

What it does

For the patient

- **A giant clock** with Western digits  - universally readable, no
  Arabic-Indic ٢/٣ confusion for low-vision users.
- **A time-of-day label in huge type**  - صباحاً، ظهراً، بعد الظهر، مساءً،
  ليلاً  - that changes automatically as the day progresses.
- **A background color that shifts with the phase**  - clear blue in the
  morning, warm sand at noon, terracotta in the afternoon, deep purple
  in the evening, near-black navy at night. The color alone tells the
  user where they are in the day, from across the room.
- **A next-dose line** describing the next medicine in plain Arabic:
  "💊 حبة الضغط  - الساعة ٨:٠٠ صباحاً".
- **Big meal buttons** (فطور / غداء / عشاء / نوم) so a caregiver or the
  patient can log when meals happen.
- **Full-screen pill alerts** with beep, vibration, and Arabic speech
  when it's time for a dose.

For the caregiver

- **Setup screen** to add medicines by time or by meal-event
  (before/after breakfast, lunch, dinner, or bed).
- **Per-pill fallback time** in case nobody logs a meal  - the pill still
  fires as a safety net.
- **Hidden admin menu** (long-press the clock for 3 seconds) with
  settings, reset actions, and a built-in Arabic user manual.
- **Everything stays on the device**  - no accounts, no cloud, no
  tracking, **no network calls at all** after first load.

PWA  - installable and offline

- Installable on Android, iOS, and desktop as a standalone app.
- Works fully offline after first load.
- Screen Wake Lock keeps the clock visible on a bedside tablet.

---

Project structure

pill-clock/
├── index.html # Screens: setup, clock, alert, admin
├── styles.css # All styling, phase themes, responsive layout
├── app.js # All logic: scheduling, alerts, meal buttons
├── sw.js # Service worker (offline cache)
├── manifest.json # PWA metadata
├── icon.svg # Vector app icon
├── help.html # Printable Arabic user manual
└── docs/ # Screenshots (optional)


Six files. That's the whole app.

---

Running it locally

Any static web server will do. The service worker requires `http://localhost`
or HTTPS  a plain `file://` open will not register it.

Python (built-in on macOS/Linux)

```bash
cd pill-clock
python3 -m http.server 8080
Then open http://localhost:8080

Node
npx serve .

VS Code

Install the Live Server extension, right-click index.html,
and choose Open with Live Server.

Installing it as an app (PWA)

Once served over HTTPS (or localhost):

Android / Chrome  tap the install icon in the address bar, or
menu → Install app.
iOS / Safari  Share → Add to Home Screen.
Desktop / Chrome, Edge  install icon in the address bar.
After install, the app launches full-screen with no browser UI.

Configuring medicines

Open the app and use the setup screen:

＋ إضافة دواء  - add a medicine.
اسم الدواء  - required. This is what the user sees.
نوع الموعد  - choose:
	موعد محدد  - a fixed time (e.g. 08:00).
	قبل / بعد الفطور، الغداء، العشاء  - tied to a meal event.
	قبل النوم  - fires when the caregiver taps 🛏️ نوم.
	التأخير  - for meal-anchored pills, how many minutes after the
		meal the dose is due (default 30).
	الوقت الاحتياطي  - a fallback time if the meal isn't logged. Ensures
		the pill isn't missed.
	حفظ وبدء الساعة  - save and switch to the clock screen.

Hidden admin menu

Long-press anywhere on the clock for 3 seconds. A blue bar fills at
the bottom of the screen, then the admin menu opens:

Action	Purpose
⚙️ الإعدادات		Edit pills
🔄 إعادة ضبط جرعات اليوم	Clear today's fired doses
🍽️ حذف سجل وجبات اليوم	Clear today's meal log
📖 دليل الاستخدام		Open the printable Arabic manual
✖ إغلاق			Close the menu

Tips for daily use

Place the device in a fixed, visible location  - kitchen or living
room, where the patient sees it constantly.

Don't hide it. The clock itself is part of the therapy, even
without alarms.

Tell the caregiver about the hidden admin menu. Don't tell the
patient  - they might fiddle with settings.

Don't turn the device off. The alerts only fire while the app is
running.

The app doesn't need internet. After the first load, it works
entirely offline.


Privacy

No analytics. No tracking. No accounts. No network calls at all.All data lives in the browser's localStorage on the device.Works fully offline.

Accessibility notes

This app was designed specifically for people with low vision and moderate
cognitive impairment:
Minimum tap target: 44×44 px (WCAG AAA).
Very high color contrast between text and background in every phase.
No small text anywhere on the main screen.
No timers or countdowns that require mental arithmetic.
No hidden gestures required for core use.
prefers-reduced-motion is honored  - pulses and transitions are
disabled if the user has that setting on.

Project origin

This project is a personal one. My father needed it; nothing like it
existed in Arabic; I made it.

It's also a demonstration of AI-orchestrated software development  -
the app was designed, built, and iterated in collaboration with an AI
assistant. Every file, every decision, every iteration came from a
conversation about what would actually help a man in his eighties
remember to take his pills. The engineering discipline is real; so is
the reason behind it.

What's next

Real-world iteration  - the app is running on my father's tablet. The next phase is living with it and adjusting to what actually happens.

About me

I am not a developer. I am a builder in the AI era.

I work in an environment where a person with no formal software training
can still ship a real, usable, safe product  - if they can define the
problem clearly and orchestrate the tools. My father's Alzheimer's
diagnosis was the problem. AI orchestration was the tool. This app is the
artifact.

If you know someone who could use this, please share it. It's free,
it's open, and it will always be.

Contributing

Bug reports and pull requests are welcome. Please:
Test on a real device if possible (a phone or tablet).
Keep changes dependency-free  - no npm packages, no frameworks.
Preserve the accessibility constraints above.
If you add UI text, please provide Arabic in the same style.