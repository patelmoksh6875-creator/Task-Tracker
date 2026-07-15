/**
 * Utility functions for Focus Checklist
 */

export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

// Theme Engine Handler (7 AM - 7 PM criteria)
export function initThemeEngine() {
    const updateTheme = () => {
        const hour = new Date().getHours();
        const isDaytime = hour >= 7 && hour < 19;
        document.documentElement.setAttribute('data-theme', isDaytime ? 'light' : 'dark');
    };
    
    updateTheme();
    setInterval(updateTheme, 60000);
}

// Generate secure simple tracking IDs
export function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}