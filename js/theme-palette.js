/**
 * Global Paintbrush Palette
 * A persistent floating button (bottom-right, every page) that lets the user
 * live-edit the primary background, accent, and text tones. Changes apply
 * instantly via CSS custom properties and persist to localStorage so they
 * survive reloads and carry across every page in the app.
 */

const STORAGE_KEY = 'cs_theme_custom';

const DEFAULTS = {
    bg: '#cbd5e1',
    accent: '#475569',
    text: '#1e293b'
};

function applyTheme(cfg) {
    const root = document.documentElement.style;
    root.setProperty('--bg-main', cfg.bg);
    root.setProperty('--bg-canvas', cfg.bg);
    root.setProperty('--accent-color', cfg.accent);
    root.setProperty('--text-primary', cfg.text);
}

function loadSavedTheme() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && saved.bg && saved.accent && saved.text) return saved;
    } catch (e) { /* fall through to defaults on corrupt data */ }
    return { ...DEFAULTS };
}

export function initPaintbrushPalette() {
    // Guard against double-init if this ever gets called twice on one page.
    if (document.getElementById('paintbrush-toggle')) return;

    let current = loadSavedTheme();
    applyTheme(current);

    const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'paintbrush-toggle';
    fab.className = 'paintbrush-fab';
    fab.setAttribute('aria-label', 'Open theme palette');
    fab.textContent = '🎨';

    const panel = document.createElement('div');
    panel.id = 'paintbrush-panel';
    panel.className = 'paintbrush-panel paintbrush-closed';
    panel.innerHTML = `
        <span class="paintbrush-panel-label">Theme Palette</span>
        <label class="paintbrush-row">
            <span>Background</span>
            <input type="color" id="paintbrush-bg" value="${current.bg}">
        </label>
        <label class="paintbrush-row">
            <span>Accent</span>
            <input type="color" id="paintbrush-accent" value="${current.accent}">
        </label>
        <label class="paintbrush-row">
            <span>Text</span>
            <input type="color" id="paintbrush-text" value="${current.text}">
        </label>
        <button type="button" id="paintbrush-reset">Reset to Default</button>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('paintbrush-closed');
    });

    // Click-away closes the panel without touching the rest of the page.
    document.addEventListener('click', (e) => {
        if (!panel.classList.contains('paintbrush-closed') && !panel.contains(e.target) && e.target !== fab) {
            panel.classList.add('paintbrush-closed');
        }
    });

    const bgInput = panel.querySelector('#paintbrush-bg');
    const accentInput = panel.querySelector('#paintbrush-accent');
    const textInput = panel.querySelector('#paintbrush-text');
    const resetBtn = panel.querySelector('#paintbrush-reset');

    bgInput.addEventListener('input', (e) => {
        current.bg = e.target.value;
        applyTheme(current);
        persist();
    });

    accentInput.addEventListener('input', (e) => {
        current.accent = e.target.value;
        applyTheme(current);
        persist();
    });

    textInput.addEventListener('input', (e) => {
        current.text = e.target.value;
        applyTheme(current);
        persist();
    });

    resetBtn.addEventListener('click', () => {
        current = { ...DEFAULTS };
        applyTheme(current);
        bgInput.value = current.bg;
        accentInput.value = current.accent;
        textInput.value = current.text;
        localStorage.removeItem(STORAGE_KEY);
    });
}