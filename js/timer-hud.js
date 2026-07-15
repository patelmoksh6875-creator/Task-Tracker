/**
 * Global Timer HUD
 * A single active timer, persisted as an absolute end-timestamp so it stays
 * accurate across page navigations (this is a multi-page app — each page
 * load re-reads the same stored timestamp) and across a backgrounded tab
 * (setInterval gets throttled while hidden, so a visibilitychange listener
 * forces an immediate recheck the moment the tab becomes visible again).
 */

const TIMER_KEY = 'cs_active_timer';

function getActiveTimer() {
    try {
        return JSON.parse(localStorage.getItem(TIMER_KEY));
    } catch (e) {
        return null;
    }
}

function setActiveTimer(timer) {
    if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    else localStorage.removeItem(TIMER_KEY);
}

// One shared AudioContext, created lazily on first use and reused for every
// beep after that — the alert repeats every couple seconds once a timer
// expires, and spinning up a brand new AudioContext on every single repeat
// is wasteful and, on some browsers, will eventually hit a hard cap on how
// many contexts can exist at once.
let sharedAudioCtx = null;
function getAudioContext() {
    if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
}

// A fuller, louder alarm chime — two tones layered together (not just one
// thin sine beep) so it actually cuts through if you're focused on
// something in another tab. Still capped well under full gain so it isn't
// painful, just clearly noticeable.
function playAlarmChime() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        [0, 0.32, 0.64].forEach(offset => {
            [880, 1108].forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = now + offset;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.32);
            });
        });
    } catch (e) {
        // Web Audio unavailable (e.g. autoplay policy blocked it before any
        // user gesture) — fail silently, the HUD's pulsing state still shows.
    }
}

// Repeats the chime every 2.5s once a timer expires, until dismissed —
// idempotent, so calling it repeatedly from renderHUD() while already
// alerting doesn't stack multiple intervals.
let alertRepeatId = null;
function startAlertRepeat() {
    if (alertRepeatId) return;
    playAlarmChime();
    alertRepeatId = setInterval(playAlarmChime, 2500);
}
function stopAlertRepeat() {
    if (alertRepeatId) {
        clearInterval(alertRepeatId);
        alertRepeatId = null;
    }
}

function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Call from a task's timer button. Prompts for a duration in minutes and
 * starts the global timer. Only one timer can run at a time — if one's
 * already ticking, this confirms before replacing it.
 */
export function requestStartTimer(taskId, taskTitle) {
    const existing = getActiveTimer();
    if (existing && existing.endTimestamp > Date.now()) {
        const ok = window.confirm(`A timer is already running for "${existing.title}". Replace it with a new timer for "${taskTitle}"?`);
        if (!ok) return;
    }

    const input = window.prompt(`Set a timer for "${taskTitle}" — minutes:`, '25');
    if (input === null) return;
    const minutes = parseFloat(input);
    if (!minutes || minutes <= 0) return;

    // Starting a timer is a real click, so this is the safe place to unlock
    // audio for the alert that fires later, possibly while backgrounded.
    getAudioContext();
    stopAlertRepeat();

    setActiveTimer({
        taskId,
        title: taskTitle,
        endTimestamp: Date.now() + minutes * 60000,
        alerted: false
    });
    renderHUD();
}

let hudEl = null;

function ensureHUD() {
    if (hudEl) return hudEl;
    hudEl = document.createElement('div');
    hudEl.id = 'timer-hud';
    hudEl.className = 'timer-hud timer-hud-hidden';
    hudEl.innerHTML = `
        <span class="timer-hud-label"></span>
        <span class="timer-hud-time"></span>
        <button type="button" class="timer-hud-dismiss" aria-label="Stop timer">×</button>
    `;
    document.body.appendChild(hudEl);
    hudEl.querySelector('.timer-hud-dismiss').addEventListener('click', () => {
        stopAlertRepeat();
        setActiveTimer(null);
        renderHUD();
    });
    return hudEl;
}

function renderHUD() {
    const el = ensureHUD();
    const timer = getActiveTimer();
    const btn = el.querySelector('.timer-hud-dismiss');

    if (!timer) {
        stopAlertRepeat();
        el.classList.add('timer-hud-hidden');
        el.classList.remove('timer-hud-alert');
        return;
    }

    const remaining = timer.endTimestamp - Date.now();
    el.classList.remove('timer-hud-hidden');
    el.querySelector('.timer-hud-label').textContent = timer.title;

    if (remaining <= 0) {
        el.querySelector('.timer-hud-time').textContent = "Time's up";
        el.classList.add('timer-hud-alert');
        btn.textContent = 'End Timer';
        btn.classList.add('timer-hud-end-btn');
        btn.setAttribute('aria-label', 'End timer and stop the alert');
        startAlertRepeat(); // safe to call every tick — it no-ops if already running
        if (!timer.alerted) {
            timer.alerted = true;
            setActiveTimer(timer);
        }
    } else {
        el.querySelector('.timer-hud-time').textContent = formatRemaining(remaining);
        el.classList.remove('timer-hud-alert');
        btn.textContent = '×';
        btn.classList.remove('timer-hud-end-btn');
        btn.setAttribute('aria-label', 'Stop timer');
        stopAlertRepeat();
    }
}

export function initTimerHUD() {
    renderHUD();
    setInterval(renderHUD, 1000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) renderHUD();
    });
}