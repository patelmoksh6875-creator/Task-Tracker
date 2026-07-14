import { UIManager } from './ui.js';
import { initThemeEngine } from './utils.js';
import { initPaintbrushPalette } from './theme-palette.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeEngine();
    initPaintbrushPalette();
    UIManager.init();
});