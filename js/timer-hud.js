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

// Three short synthesized beeps via a Web Audio oscillator — no external
// sound file needed, and audio scheduling isn't throttled the way JS
// timers are, so this fires reliably even from a backgrounded tab.
function playBeepSequence() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.35, 0.7].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 880;
            const t = ctx.currentTime + offset;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    } catch (e) {
        // Web Audio unavailable (e.g. autoplay policy blocked it before any
        // user gesture) — fail silently, the HUD's pulsing state still shows.
    }
}

function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Call from a task's ⏱ button. Prompts for a duration in minutes and starts
 * the global timer. Only one timer can run at a time — if one's already
 * ticking, this confirms before replacing it.
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
        <button type="button" class="timer-hud-dismiss" aria-label="Dismiss timer">×</button>
    `;
    document.body.appendChild(hudEl);
    hudEl.querySelector('.timer-hud-dismiss').addEventListener('click', () => {
        setActiveTimer(null);
        renderHUD();
    });
    return hudEl;
}

function renderHUD() {
    const el = ensureHUD();
    const timer = getActiveTimer();

    if (!timer) {
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
        if (!timer.alerted) {
            playBeepSequence();
            timer.alerted = true;
            setActiveTimer(timer);
        }
    } else {
        el.querySelector('.timer-hud-time').textContent = formatRemaining(remaining);
        el.classList.remove('timer-hud-alert');
    }
}

export function initTimerHUD() {
    renderHUD();
    setInterval(renderHUD, 1000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) renderHUD();
    });
}