import { UIManager } from './ui.js';
import { initThemeEngine } from './utils.js';
import { initPaintbrushPalette } from './theme-palette.js';
import { initTimerHUD } from './timer-hud.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeEngine();
    initPaintbrushPalette();
    initTimerHUD();
    UIManager.init();
});