/* =====================================================================
   Pill Clock PWA — app.js
   (added skip button logic)
   ===================================================================== */

/* ---------- Storage keys ---------- */
const STORAGE = {
  SCHEDULE: 'pillSchedule',
  FIRED:    'firedDoses',
  MEALS:    'mealLog',
  CONFIG:   'configExists',
};

/* ---------- Arabic digits ---------- */
const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArabicDigits(str) {
  return String(str).replace(/\d/g, d => AR_DIGITS[+d]);
}

/* ---------- Constants ---------- */
const MEAL_LATE_HOURS = {
  breakfast: 10.5,
  lunch:     14.5,
  dinner:    20.5,
  bed:       23.5,
};

const GRACE_MS         = 10 * 60 * 1000;
const LONG_PRESS_MS    = 3000;
const MEAL_CONFIRM_MS  = 3000;
const MEAL_UNDO_MS     = 60000;
const DEFAULT_DELAY    = 30;

const HINT_BAR_TEXT    = '🍽️ اضغط عند بدء الوجبة';
const NO_PILLS_TEXT    = 'لا توجد أدوية قادمة اليوم';
const DEFAULT_PILL_WORD= 'دواء';

/* ---------- Day phases ---------- */
function getDayPhase(hour) {
  if (hour >= 4  && hour < 12) return { key: 'morning',   label: 'صباحاً'   };
  if (hour >= 12 && hour < 15) return { key: 'noon',      label: 'ظهراً'    };
  if (hour >= 15 && hour < 18) return { key: 'afternoon', label: 'بعد الظهر' };
  if (hour >= 18 && hour < 22) return { key: 'evening',   label: 'مساءً'    };
  return                              { key: 'night',     label: 'ليلاً'    };
}

/* ---------- Pill type definitions ---------- */
const PILL_TYPES = [
  { value: 'fixed',            label: 'موعد محدد',    kind: 'fixed' },
  { value: 'before_breakfast', label: 'قبل الفطور',   kind: 'meal', meal: 'breakfast', offset: 'before' },
  { value: 'after_breakfast',  label: 'بعد الفطور',   kind: 'meal', meal: 'breakfast', offset: 'after'  },
  { value: 'before_lunch',     label: 'قبل الغداء',   kind: 'meal', meal: 'lunch',     offset: 'before' },
  { value: 'after_lunch',      label: 'بعد الغداء',   kind: 'meal', meal: 'lunch',     offset: 'after'  },
  { value: 'before_dinner',    label: 'قبل العشاء',   kind: 'meal', meal: 'dinner',    offset: 'before' },
  { value: 'after_dinner',     label: 'بعد العشاء',   kind: 'meal', meal: 'dinner',    offset: 'after'  },
  { value: 'before_bed',       label: 'قبل النوم',    kind: 'meal', meal: 'bed',       offset: 'before' },
];

const MEAL_LABELS = {
  breakfast: 'الفطور',
  lunch:     'الغداء',
  dinner:    'العشاء',
  bed:       'النوم',
};

/* ---------- State ---------- */
let schedule   = [];
let firedDoses = {};
let mealLog    = {};
let clockTimer = null;
let beepCtx    = null;
let beeping    = false;
let beepInterval = null;

let mealConfirmTimer = null;
let mealUndoTimer    = null;
let lastMealTapped   = null;

/* ---------- DOM ---------- */
const setupScreen     = document.getElementById('setupScreen');
const clockScreen     = document.getElementById('clockScreen');
const timesList       = document.getElementById('timesList');
const addTimeBtn      = document.getElementById('addTimeBtn');
const saveBtn         = document.getElementById('saveBtn');
const skipBtn         = document.getElementById('skipBtn');
const backBtn         = document.getElementById('backBtn');
const setupError      = document.getElementById('setupError');

const clockTimeEl     = document.getElementById('clockTime');
const dateLineEl      = document.getElementById('dateLine');
const phaseLabelEl    = document.getElementById('phaseLabel');
const nextPillEl      = document.getElementById('nextPill');
const pressBarEl      = document.getElementById('pressBar');

const mealRowEl       = document.getElementById('mealRow');
const mealFeedbackEl  = document.getElementById('mealFeedback');
const mealFeedbackText= document.getElementById('mealFeedbackText');
const mealUndoBtn     = document.getElementById('mealUndoBtn');

const alertOverlay    = document.getElementById('alertOverlay');
const alertTimeEl     = document.getElementById('alertTime');
const alertLabelEl    = document.getElementById('alertLabel');
const dismissAlertBtn = document.getElementById('dismissAlertBtn');

const adminMenu       = document.getElementById('adminMenu');
const adminStatus     = document.getElementById('adminStatus');

/* =====================================================================
   Storage helpers
   ===================================================================== */
function loadConfig() {
  try {
    schedule   = JSON.parse(localStorage.getItem(STORAGE.SCHEDULE) || '[]');
    firedDoses = JSON.parse(localStorage.getItem(STORAGE.FIRED) || '{}');
    mealLog    = JSON.parse(localStorage.getItem(STORAGE.MEALS) || '{}');
  } catch (e) {
    schedule = []; firedDoses = {}; mealLog = {};
  }
  return localStorage.getItem(STORAGE.CONFIG) === 'true';
}

function saveConfig() {
  localStorage.setItem(STORAGE.SCHEDULE, JSON.stringify(schedule));
  localStorage.setItem(STORAGE.CONFIG, 'true');
}

function saveFired() {
  localStorage.setItem(STORAGE.FIRED, JSON.stringify(firedDoses));
}

function saveMeals() {
  localStorage.setItem(STORAGE.MEALS, JSON.stringify(mealLog));
}

/* =====================================================================
   Setup screen
   ===================================================================== */
function addTimeRow(pill = {}) {
  const type     = pill.type     || 'fixed';
  const time     = pill.time     || '08:00';
  const label    = pill.label    || '';
  const delay    = pill.delay    != null ? pill.delay    : DEFAULT_DELAY;
  const fallback = pill.fallback || '14:00';

  const row = document.createElement('div');
  row.className = 'pill-row';
  row.dataset.type = type;

  row.innerHTML = `
    <div class="pill-row-top">
      <select class="type-select" aria-label="نوع الموعد">
        ${PILL_TYPES.map(t =>
          `<option value="${t.value}"${t.value === type ? ' selected' : ''}>${t.label}</option>`
        ).join('')}
      </select>
      <input type="text" class="label-input" placeholder="اسم الدواء (إلزامي)" value="${label}" />
      <button type="button" class="remove-btn" aria-label="حذف">✕</button>
    </div>

    <div class="pill-row-fixed">
      <label class="mini-label">الساعة</label>
      <input type="time" class="time-input" value="${time}" />
    </div>

    <div class="pill-row-meal">
      <label class="mini-label">التأخير (دقائق)</label>
      <input type="number" class="delay-input" min="1" max="180" value="${delay}" />
      <label class="mini-label">الوقت الاحتياطي</label>
      <input type="time" class="fallback-input" value="${fallback}" />
    </div>
  `;

  const typeSelect = row.querySelector('.type-select');
  const updateVisibility = () => {
    const t = PILL_TYPES.find(x => x.value === typeSelect.value);
    row.dataset.type = typeSelect.value;
    row.querySelector('.pill-row-fixed').style.display = t.kind === 'fixed' ? 'flex' : 'none';
    row.querySelector('.pill-row-meal').style.display  = t.kind === 'meal'  ? 'flex' : 'none';
  };
  typeSelect.addEventListener('change', updateVisibility);
  updateVisibility();

  row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
  timesList.appendChild(row);
}

function renderSetup() {
  timesList.innerHTML = '';
  if (schedule.length) {
    schedule.forEach(p => addTimeRow(p));
  } else {
    addTimeRow({ type: 'fixed', time: '08:00' });
  }
  setupError.classList.add('hidden');
}

addTimeBtn.addEventListener('click', () => addTimeRow({ type: 'fixed', time: '08:00' }));

saveBtn.addEventListener('click', () => {
  const rows = timesList.querySelectorAll('.pill-row');
  const newSchedule = [];

  rows.forEach(r => r.querySelector('.label-input').classList.remove('is-empty'));

  let hasEmptyName = false;

  for (const row of rows) {
    const type = row.querySelector('.type-select').value;
    const nameInput = row.querySelector('.label-input');
    const label = nameInput.value.trim();
    const t = PILL_TYPES.find(x => x.value === type);

    if (!label) {
      nameInput.classList.add('is-empty');
      hasEmptyName = true;
    }

    if (t.kind === 'fixed') {
      const time = row.querySelector('.time-input').value;
      if (time && label) newSchedule.push({ type, kind: 'fixed', time, label });
    } else {
      const delay = parseInt(row.querySelector('.delay-input').value, 10) || DEFAULT_DELAY;
      const fallback = row.querySelector('.fallback-input').value || '14:00';
      if (label) {
        newSchedule.push({
          type,
          kind: 'meal',
          meal: t.meal,
          offset: t.offset,
          delay,
          fallback,
          label,
        });
      }
    }
  }

  if (hasEmptyName) {
    showSetupError('الرجاء إدخال اسم الدواء لكل دواء.');
    return;
  }

  if (newSchedule.length === 0) {
    showSetupError('الرجاء إضافة دواء واحد على الأقل.');
    return;
  }

  newSchedule.sort((a, b) => {
    if (a.kind === 'fixed' && b.kind === 'fixed') return a.time.localeCompare(b.time);
    if (a.kind === 'fixed') return -1;
    if (b.kind === 'fixed') return 1;
    return 0;
  });

  schedule = newSchedule;
  saveConfig();
  goToClock();
});

skipBtn.addEventListener('click', () => {
  schedule = [];
  saveConfig(); // Saves an empty schedule so it doesn't ask again on reload
  goToClock();
});

function showSetupError(msg) {
  setupError.textContent = msg;
  setupError.classList.remove('hidden');
}

backBtn.addEventListener('click', () => {
  backBtn.classList.add('hidden');
  goToClock();
});

/* =====================================================================
   Screen routing
   ===================================================================== */
function goToSetup(returning = false) {
  renderSetup();
  clockScreen.classList.add('hidden');
  setupScreen.classList.remove('hidden');
  backBtn.classList.toggle('hidden', !returning);
  stopClock();
}

function goToClock() {
  setupScreen.classList.add('hidden');
  clockScreen.classList.remove('hidden');
  startClock();
  requestWakeLock();
}

/* =====================================================================
   Helpers
   ===================================================================== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function arabicDate(d) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(d);
  } catch { return d.toDateString(); }
}

function format12Hour(date) {
  const h24 = date.getHours();
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = pad(date.getMinutes());
  return `${h12}:${mm}`;
}

function formatTimeString(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format12Hour(d);
}

function phaseLabelForHour(hour) {
  return getDayPhase(hour).label;
}

function doseKey(pill, mealTs = null) {
  if (pill.kind === 'fixed') return pill.time;
  return `${pill.type}:${mealTs || 'fallback'}`;
}

function describeNextPill(next, now) {
  if (!next) return { text: NO_PILLS_TEXT, empty: true };

  const pill = next.pill;
  const name = pill.label || DEFAULT_PILL_WORD;

  if (pill.kind === 'fixed') {
    const timeStr = formatTimeString(pill.time);
    const phase   = phaseLabelForHour(Number(pill.time.split(':')[0]));
    return {
      text: `💊 ${name} — الساعة ${timeStr} ${phase}`,
      empty: false,
    };
  }

  const mealAr = MEAL_LABELS[pill.meal] || pill.meal;
  const offAr  = pill.offset === 'before' ? 'قبل' : 'بعد';

  const today  = todayKey();
  const meals  = mealLog[today] || {};
  const mealTs = meals[pill.meal];

  if (mealTs) {
    const timeStr = formatTimeString(pill.fallback);
    const phase   = phaseLabelForHour(Number(pill.fallback.split(':')[0]));
    return {
      text: `💊 ${name} — ${offAr} ${mealAr}، حوالي الساعة ${timeStr} ${phase}`,
      empty: false,
    };
  }

  return {
    text: `💊 ${name} — ${offAr} ${mealAr}`,
    empty: false,
  };
}

/* =====================================================================
   Day phase application
   ===================================================================== */
let currentPhaseKey = null;

function applyDayPhase(date) {
  const { key, label } = getDayPhase(date.getHours());
  if (key !== currentPhaseKey) {
    document.body.classList.remove(
      'phase-morning', 'phase-noon', 'phase-afternoon', 'phase-evening', 'phase-night'
    );
    document.body.classList.add('phase-' + key);
    currentPhaseKey = key;
    if (phaseLabelEl) phaseLabelEl.textContent = label;
  }
}

/* =====================================================================
   Meal button visual state
   ===================================================================== */
function updateMealButtonStates(now) {
  const today = todayKey();
  const meals = mealLog[today] || {};

  const h = now.getHours();
  let nextMeal;
  if (h >= 4  && h < 10) nextMeal = 'breakfast';
  else if (h >= 10 && h < 14) nextMeal = 'lunch';
  else if (h >= 14 && h < 20) nextMeal = 'dinner';
  else                          nextMeal = 'bed';

  const decimalHour = now.getHours() + now.getMinutes() / 60;

  const hintTextEl = document.getElementById('mealHintText');
  if (hintTextEl) hintTextEl.textContent = HINT_BAR_TEXT;

  const buttons = document.querySelectorAll('.meal-btn');
  buttons.forEach(btn => {
    const mealName = btn.dataset.meal;
    const isLogged = !!meals[mealName];

    if (mealName === nextMeal && !isLogged) {
      btn.classList.add('is-next');
    } else {
      btn.classList.remove('is-next');
    }

    if (isLogged) {
      btn.classList.add('is-logged');
      btn.classList.remove('is-late');
    } else {
      btn.classList.remove('is-logged');

      const threshold = MEAL_LATE_HOURS[mealName];
      if (decimalHour >= threshold) {
        btn.classList.add('is-late');
      } else {
        btn.classList.remove('is-late');
      }
    }
  });
}

/* =====================================================================
   Clock
   ===================================================================== */
function startClock() {
  stopClock();
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
}

function stopClock() {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
}

function tickClock() {
  const now = new Date();
  applyDayPhase(now);
  clockTimeEl.textContent = format12Hour(now);
  dateLineEl.textContent = arabicDate(now);

  const next = getNextPill(now);
  const { text, empty } = describeNextPill(next, now);
  nextPillEl.textContent = text;
  nextPillEl.classList.toggle('is-empty', !!empty);

  updateMealButtonStates(now);
  checkPillTimes(now);
}

/* =====================================================================
   Compute the next pill time
   ===================================================================== */
function getNextPill(now) {
  if (!schedule.length) return null;
  const today = todayKey();
  const fired = firedDoses[today] || [];
  const meals = mealLog[today] || {};
  let best = null;

  for (const pill of schedule) {
    let when = null;
    let key  = null;

    if (pill.kind === 'fixed') {
      key = doseKey(pill);
      if (fired.includes(key)) continue;
      const [h, m] = pill.time.split(':').map(Number);
      const t = new Date(now);
      t.setHours(h, m, 0, 0);
      when = t;
    } else {
      const mealTs = meals[pill.meal];
      if (pill.offset === 'before') {
        if (!mealTs) {
          const [h, m] = pill.fallback.split(':').map(Number);
          const t = new Date(now);
          t.setHours(h, m, 0, 0);
          when = t;
          key  = doseKey(pill, 'fallback');
        } else {
          continue;
        }
      } else {
        if (mealTs) {
          key = doseKey(pill, mealTs);
          if (fired.includes(key)) continue;
          when = new Date(mealTs + pill.delay * 60000);
        } else {
          const [h, m] = pill.fallback.split(':').map(Number);
          const t = new Date(now);
          t.setHours(h, m, 0, 0);
          when = t;
          key  = doseKey(pill, 'fallback');
        }
      }
    }

    if (when && when > now && (!best || when < best.when)) {
      best = { when, pill, key };
    }
  }
  return best;
}

/* =====================================================================
   Pill logic
   ===================================================================== */
function checkPillTimes(now) {
  if (!schedule.length) return;
  const today = todayKey();
  const fired = firedDoses[today] || [];
  const meals = mealLog[today] || {};

  for (const pill of schedule) {
    let dueAt = null;
    let key   = null;

    if (pill.kind === 'fixed') {
      key = doseKey(pill);
      if (fired.includes(key)) continue;
      const [h, m] = pill.time.split(':').map(Number);
      const t = new Date(now);
      t.setHours(h, m, 0, 0);
      dueAt = t;
    } else {
      const mealTs = meals[pill.meal];

      if (pill.offset === 'before') {
        if (!mealTs) continue;
        key = doseKey(pill, mealTs);
        if (fired.includes(key)) continue;
        if (now - mealTs <= 5 * 60000) {
          dueAt = new Date(mealTs);
        } else {
          fired.push(key);
          firedDoses[today] = fired;
          saveFired();
          continue;
        }
      } else {
        if (mealTs) {
          key = doseKey(pill, mealTs);
          if (fired.includes(key)) continue;
          dueAt = new Date(mealTs + pill.delay * 60000);
        } else {
          key = doseKey(pill, 'fallback');
          if (fired.includes(key)) continue;
          const [h, m] = pill.fallback.split(':').map(Number);
          const t = new Date(now);
          t.setHours(h, m, 0, 0);
          dueAt = t;
        }
      }
    }

    if (!dueAt) continue;

    const diff = now - dueAt;
    if (diff >= 0 && diff <= GRACE_MS) {
      fired.push(key);
      firedDoses[today] = fired;
      saveFired();
      triggerAlert(pill, dueAt);
      break;
    }
  }
}

/* =====================================================================
   Meal buttons
   ===================================================================== */
function recordMeal(mealName) {
  const today = todayKey();
  if (!mealLog[today]) mealLog[today] = {};
  const ts = Date.now();
  mealLog[today][mealName] = ts;
  saveMeals();

  lastMealTapped = mealName;

  showMealConfirmation(mealName);

  updateMealButtonStates(new Date());
  checkPillTimes(new Date());
}

function showMealConfirmation(mealName) {
  if (mealConfirmTimer) clearTimeout(mealConfirmTimer);
  if (mealUndoTimer)    clearTimeout(mealUndoTimer);

  mealFeedbackText.textContent = `✅ تم تسجيل ${MEAL_LABELS[mealName]}`;
  mealFeedbackEl.classList.remove('hidden');
  mealUndoBtn.classList.remove('hidden');

  mealConfirmTimer = setTimeout(() => {
    mealFeedbackEl.classList.add('hidden');
  }, MEAL_CONFIRM_MS);

  mealUndoTimer = setTimeout(() => {
    mealUndoBtn.classList.add('hidden');
    lastMealTapped = null;
  }, MEAL_UNDO_MS);
}

mealUndoBtn.addEventListener('click', () => {
  const today = todayKey();

  if (lastMealTapped && mealLog[today] && mealLog[today][lastMealTapped]) {
    delete mealLog[today][lastMealTapped];
    saveMeals();
  }

  lastMealTapped = null;
  mealFeedbackEl.classList.add('hidden');
  mealUndoBtn.classList.add('hidden');
  if (mealConfirmTimer) clearTimeout(mealConfirmTimer);
  if (mealUndoTimer)    clearTimeout(mealUndoTimer);

  updateMealButtonStates(new Date());
});

mealRowEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.meal-btn');
  if (!btn) return;
  const mealName = btn.dataset.meal;
  if (mealName) recordMeal(mealName);
});

/* =====================================================================
   Alert
   ===================================================================== */
function triggerAlert(pill, dueAt) {
  let timeText = '';

  if (pill.kind === 'fixed') {
    timeText = formatTimeString(pill.time);
  } else {
    timeText = format12Hour(dueAt);
  }

  alertTimeEl.textContent  = timeText;
  alertLabelEl.textContent = pill.label || '';
  alertOverlay.classList.remove('hidden');

  startBeeping();
  vibrate();
  speak('حان وقت الدواء');
}

dismissAlertBtn.addEventListener('click', () => {
  alertOverlay.classList.add('hidden');
  stopBeeping();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
});

/* =====================================================================
   Beep / vibrate / speech
   ===================================================================== */
function startBeeping() {
  beeping = true;
  beep();
  beepInterval = setInterval(beep, 2500);
}

function stopBeeping() {
  beeping = false;
  if (beepInterval) { clearInterval(beepInterval); beepInterval = null; }
}

function beep() {
  if (!beeping) return;
  try {
    if (!beepCtx) beepCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = beepCtx.createOscillator();
    const g = beepCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, beepCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, beepCtx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + 0.6);
    o.connect(g).connect(beepCtx.destination);
    o.start();
    o.stop(beepCtx.currentTime + 0.65);
  } catch (e) {}
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
}

function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* =====================================================================
   Long-press → admin menu
   ===================================================================== */
let pressStart = 0;
let pressRAF   = null;

function beginPress(e) {
  if (!clockScreen || clockScreen.classList.contains('hidden')) return;
  if (e.target.closest('.overlay')) return;
  if (e.target.closest('.meal-btn')) return;
  if (e.target.closest('.meal-feedback')) return;
  if (e.target.closest('.meal-hint-bar')) return;

  pressStart = performance.now();
  pressBarEl.style.width = '0%';

  const loop = () => {
    const elapsed = performance.now() - pressStart;
    pressBarEl.style.width = Math.min(100, (elapsed / LONG_PRESS_MS) * 100) + '%';
    if (elapsed >= LONG_PRESS_MS) { endPress(); openAdmin(); return; }
    pressRAF = requestAnimationFrame(loop);
  };
  pressRAF = requestAnimationFrame(loop);
}

function endPress() {
  pressStart = 0;
  pressBarEl.style.width = '0%';
  if (pressRAF) { cancelAnimationFrame(pressRAF); pressRAF = null; }
}

clockScreen.addEventListener('pointerdown',  beginPress);
clockScreen.addEventListener('pointerup',    endPress);
clockScreen.addEventListener('pointercancel', endPress);
clockScreen.addEventListener('pointerleave',  endPress);
clockScreen.addEventListener('contextmenu', e => e.preventDefault());

function openAdmin() {
  adminStatus.textContent = '';
  adminMenu.classList.remove('hidden');
}

adminMenu.addEventListener('click', async (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  if (action === 'close')    { adminMenu.classList.add('hidden'); return; }
  if (action === 'settings') { adminMenu.classList.add('hidden'); goToSetup(true); return; }
  if (action === 'help')     { window.open('./help.html', '_blank'); return; }

  if (action === 'resync') {
    delete firedDoses[todayKey()];
    saveFired();
    adminStatus.textContent = '🔄 تمت إعادة ضبط جرعات اليوم.';
    return;
  }

  if (action === 'resetmeals') {
    delete mealLog[todayKey()];
    saveMeals();
    updateMealButtonStates(new Date());
    adminStatus.textContent = '🍽️ تم حذف سجل وجبات اليوم.';
    return;
  }
});

/* =====================================================================
   Wake Lock
   ===================================================================== */
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wakeLock) {
    if (!clockScreen.classList.contains('hidden')) requestWakeLock();
  }
});

/* =====================================================================
   Service Worker registration
   ===================================================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* =====================================================================
   Boot
   ===================================================================== */
function init() {
  const hasConfig = loadConfig();
  if (hasConfig && schedule.length) {
    goToClock();
  } else if (hasConfig) {
    // User clicked "Skip" previously. Go straight to clock.
    goToClock();
  } else {
    goToSetup(false);
  }
}
init();