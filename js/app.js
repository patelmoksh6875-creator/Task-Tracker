import { UIManager } from './ui.js';
import { initThemeEngine } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeEngine();
    UIManager.init();
});