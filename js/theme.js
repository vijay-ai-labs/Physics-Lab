/* ============================================================
   theme.js — Dark / Light mode controller
   ============================================================
   Public API:
     initTheme()         — Read localStorage, apply theme to <html>
     createThemeToggle() — Build & return the toggle button element
   ============================================================ */

const STORAGE_KEY = 'physicslab-theme';
const DARK = 'dark';
const LIGHT = 'light';

/** Return the currently active theme ('dark' | 'light'). */
function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || DARK;
}

/** Apply a theme by setting data-theme on <html>. */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Must be called early (before DOMContentLoaded) to prevent FOUC.
 * Safe to call multiple times.
 */
export function initTheme() {
    applyTheme(getTheme());
}

/* ── SVG icon strings ───────────────────────────────────────── */
const SUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1"  x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1"  y1="12" x2="3"  y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
  <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
</svg>`;

const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
  fill="currentColor" aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

/**
 * Build and return a polished theme toggle switch element.
 * Implemented as a <button role="switch"> for reliable keyboard + touch support.
 * Attach it wherever you like in the DOM.
 * @returns {HTMLElement}
 */
export function createThemeToggle() {
    const isDark = getTheme() === DARK;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    // Track (pill)
    const track = document.createElement('span');
    track.className = 'theme-toggle-track';
    track.setAttribute('aria-hidden', 'true');

    // Thumb with embedded icon
    const thumb = document.createElement('span');
    thumb.className = 'theme-toggle-thumb';
    thumb.innerHTML = isDark ? MOON_SVG : SUN_SVG;

    track.appendChild(thumb);

    // Mode label (e.g. "Dark" / "Light")
    const modeLabel = document.createElement('span');
    modeLabel.className = 'theme-toggle-label';
    modeLabel.textContent = isDark ? 'Dark' : 'Light';
    modeLabel.setAttribute('aria-hidden', 'true');

    btn.appendChild(track);
    btn.appendChild(modeLabel);

    // Toggle handler
    btn.addEventListener('click', () => {
        const current = getTheme();
        const next = current === DARK ? LIGHT : DARK;
        applyTheme(next);

        const nowDark = next === DARK;
        btn.setAttribute('aria-checked', nowDark ? 'false' : 'true');
        btn.setAttribute('aria-label', nowDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.title = nowDark ? 'Switch to light mode' : 'Switch to dark mode';
        thumb.innerHTML = nowDark ? MOON_SVG : SUN_SVG;
        modeLabel.textContent = nowDark ? 'Dark' : 'Light';
    });

    return btn;
}
