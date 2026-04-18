/* ============================================================
   ui.js — Reusable UI helpers (sliders, buttons, toast, theory)
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - initExperimentPage now accepts optional `dev` flag; when true
         it sets engine.dev = true (verbose dt logging + window.__engine).
       - Added "⬇ CSV" export button to the standard button group.
         Calls graph.downloadCSV('<experiment-name>.csv') and shows a
         toast if no data has been recorded yet.
     v1.2 — 2026-03-07
       - Integrates theme.js: initTheme() applied immediately; toggle
         injected into .navbar .container in initExperimentPage.
   ============================================================ */

import { initTheme, createThemeToggle } from './theme.js';

// Apply saved theme immediately (prevents flash of unstyled content)
initTheme();

/**
 * Build controls from an experiment's `controls` array.
 * @param {HTMLElement} container
 * @param {Array} controls — [{ type, key, label, min, max, step, default }]
 * @param {object} params  — current params object (will be mutated)
 * @param {function} onChange — called with (key, value) on change
 */
export function buildControls(container, controls, params, onChange) {
    // Separate toggles so they render in a compact group at the bottom
    const sliders = controls.filter(c => c.type === 'slider');
    const toggles = controls.filter(c => c.type === 'toggle');

    sliders.forEach(ctrl => {
        const group = createSlider(
            ctrl.label,
            ctrl.min,
            ctrl.max,
            ctrl.step || 1,
            params[ctrl.key],
            (val) => {
                params[ctrl.key] = val;
                if (onChange) onChange(ctrl.key, val);
            },
            ctrl.tooltip || ''
        );
        group.dataset.key = ctrl.key;
        container.appendChild(group);
    });

    if (toggles.length > 0) {
        const toggleSection = document.createElement('div');
        toggleSection.className = 'vector-toggle-group';

        const sectionLabel = document.createElement('div');
        sectionLabel.className = 'control-label';
        sectionLabel.style.marginBottom = '6px';
        sectionLabel.textContent = 'Vector Overlays';
        toggleSection.appendChild(sectionLabel);

        const btnRow = document.createElement('div');
        btnRow.className = 'vector-toggle-row';
        toggleSection.appendChild(btnRow);

        toggles.forEach(ctrl => {
            const btn = document.createElement('button');
            btn.className = 'vector-toggle-btn' + (params[ctrl.key] ? ' active' : '');
            btn.dataset.colorKey = ctrl.colorKey || '';
            btn.textContent = ctrl.label;
            if (ctrl.colorKey) {
                const colorMap = {
                    velocity: '#38bdf8', acceleration: '#f59e0b',
                    force: '#10b981', gravity: '#ef4444',
                    buoyancy: '#818cf8', momentum: '#a78bfa',
                };
                const c = colorMap[ctrl.colorKey];
                if (c) {
                    btn.style.setProperty('--vtc', c);
                }
            }
            btn.addEventListener('click', () => {
                params[ctrl.key] = !params[ctrl.key];
                btn.classList.toggle('active', params[ctrl.key]);
                if (onChange) onChange(ctrl.key, params[ctrl.key]);
            });
            btnRow.appendChild(btn);
        });

        container.appendChild(toggleSection);
    }
}

let _sliderIdCounter = 0;

/**
 * Create a styled slider control.
 * @param {string} labelTextStr
 * @param {number} min
 * @param {number} max
 * @param {number} step
 * @param {number} defaultVal
 * @param {function} onChange
 * @param {string} [tooltip=''] — optional description shown on hover
 * @returns {HTMLElement}
 */
export function createSlider(labelTextStr, min, max, step, defaultVal, onChange, tooltip = '') {
    const group = document.createElement('div');
    group.className = 'control-group';

    const sliderId = `slider-ctrl-${_sliderIdCounter++}`;

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';

    const labelLeft = document.createElement('label');
    labelLeft.className = 'control-label-left';
    labelLeft.setAttribute('for', sliderId);

    const labelText = document.createElement('span');
    labelText.textContent = labelTextStr;
    labelLeft.appendChild(labelText);

    // Tooltip icon (only rendered when tooltip text is provided)
    if (tooltip) {
        const tipWrap = document.createElement('span');
        tipWrap.className = 'slider-tooltip-wrap';

        const icon = document.createElement('span');
        icon.className = 'slider-tooltip-icon';
        icon.textContent = 'ⓘ';
        icon.setAttribute('aria-label', tooltip);
        icon.setAttribute('role', 'tooltip');

        const tipBox = document.createElement('span');
        tipBox.className = 'slider-tooltip-box';
        tipBox.textContent = tooltip;

        tipWrap.appendChild(icon);
        tipWrap.appendChild(tipBox);
        labelLeft.appendChild(tipWrap);
    }

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = defaultVal;
    valueSpan.setAttribute('aria-live', 'polite');

    labelRow.appendChild(labelLeft);
    labelRow.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.id = sliderId;
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = defaultVal;

    // ARIA Slider properties
    input.setAttribute('role', 'slider');
    input.setAttribute('aria-valuemin', min);
    input.setAttribute('aria-valuemax', max);
    input.setAttribute('aria-valuenow', defaultVal);
    // Accessibility: label the input explicitly if the <label> is not enough for some screen readers
    input.setAttribute('aria-label', labelTextStr);

    input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        valueSpan.textContent = val;
        input.setAttribute('aria-valuenow', val);
        if (onChange) onChange(val);
    });

    group.appendChild(labelRow);
    group.appendChild(input);
    return group;
}

/**
 * Create a themed button.
 * @param {string} label
 * @param {function} onClick
 * @param {'primary'|'secondary'|'danger'|'success'} [variant='primary']
 * @param {string} [icon='']
 * @returns {HTMLButtonElement}
 */
export function createButton(label, onClick, variant = 'primary', icon = '') {
    const btn = document.createElement('button');
    btn.className = `btn btn-${variant}`;
    btn.innerHTML = icon ? `<span>${icon}</span> ${label}` : label;
    btn.addEventListener('click', onClick);
    return btn;
}

/**
 * Non-blocking toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 * @param {number} [duration=3000]
 */
export function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Simple Markdown-ish renderer for theory sections.
 * Handles headers, paragraphs, bold, italic, code, equations.
 * @param {string} md — markdown text
 * @returns {string} — HTML string
 */
export function renderMarkdown(md) {
    // Normalize line endings to \n
    md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return md
        .split(/\n\n+/)
        .map(block => {
            block = block.trim();
            if (!block) return '';

            // Headers
            if (block.startsWith('### ')) return `<h3>${inline(block.slice(4))}</h3>`;
            if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
            if (block.startsWith('# ')) return `<h2>${inline(block.slice(2))}</h2>`;

            // Equation blocks (lines starting with $$)
            if (block.startsWith('$$')) {
                const eq = block.replace(/\$\$/g, '').trim();
                return `<div class="equation">${eq}</div>`;
            }

            // Bullet lists
            if (block.match(/^[-*] /m)) {
                const items = block.split('\n')
                    .filter(l => l.trim())
                    .map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`)
                    .join('');
                return `<ul>${items}</ul>`;
            }

            // Multi-line paragraph: join lines with spaces
            return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
        })
        .join('\n');
}

function inline(text) {
    return text
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * Fetch and render a theory .md file into a container.
 * @param {string} url
 * @param {HTMLElement} container
 */
export async function loadTheory(url, container) {
    try {
        const res = await fetch(url);
        const md = await res.text();
        container.innerHTML = renderMarkdown(md);
    } catch (e) {
        container.innerHTML = '<p>Theory content could not be loaded.</p>';
    }
}

/**
 * Wire up the standard experiment page.
 * @param {object} sim          — experiment plugin module
 * @param {string} chartCanvasId — ID of the chart canvas
 * @param {string} simCanvasId   — ID of the simulation canvas
 * @param {string} controlsId    — ID of the controls container
 * @param {string} theoryUrl     — relative path to theory.md
 * @param {string} theoryId      — ID of the theory container
 */
export async function initExperimentPage({
    sim,
    chartCanvasId = 'graph-canvas',
    simCanvasId = 'sim-canvas',
    controlsId = 'controls-body',
    theoryUrl = './theory.md',
    theoryId = 'theory-content',
    dev = false,
}) {
    try {
        // ── Inject theme toggle into navbar ──
        const navbarContainer = document.querySelector('.navbar .container');
        if (navbarContainer && !navbarContainer.querySelector('.theme-toggle')) {
            navbarContainer.appendChild(createThemeToggle());
        }

        const { SimulationEngine } = await import('./engine.js');
        const { GraphController } = await import('./graph.js');

        const simCanvas = document.getElementById(simCanvasId);
        const controlsBody = document.getElementById(controlsId);
        const theoryContainer = document.getElementById(theoryId);

        // Build graph
        const graph = new GraphController(chartCanvasId, sim.graphConfig);

        // Build engine
        const engine = new SimulationEngine(simCanvas, sim, graph);
        if (dev) engine.dev = true;

        // Optional hook: let the sim access the engine for pause/resume in drag handlers
        if (typeof sim.onEngineReady === 'function') {
            sim.onEngineReady(engine);
        }

        // ── Inject Objective Badge into simulation canvas ──
        if (sim.objective && simCanvas.parentElement) {
            const badge = document.createElement('div');
            badge.className = 'experiment-objective-badge';
            badge.innerHTML = `
                <span class="badge-icon">🎯</span>
                <span class="badge-content">
                    <span class="badge-label">Finding</span>
                    <span class="badge-text">${sim.objective}</span>
                </span>
            `;
            simCanvas.parentElement.appendChild(badge);
        }

        // Build controls wrapper for mobile accordion
        const accordionToggle = document.createElement('button');
        accordionToggle.className = 'mobile-accordion-toggle';
        accordionToggle.innerHTML = '<span>⚙️ Simulation Controls</span><span class="chevron">▼</span>';
        accordionToggle.setAttribute('aria-expanded', 'false');
        accordionToggle.addEventListener('click', () => {
            controlsBody.classList.toggle('expanded');
            accordionToggle.setAttribute('aria-expanded', controlsBody.classList.contains('expanded'));
        });
        controlsBody.appendChild(accordionToggle);

        const controlsInner = document.createElement('div');
        controlsInner.className = 'controls-inner';
        controlsBody.appendChild(controlsInner);

        // Build controls from plugin descriptor
        const params = { ...sim.defaults };
        buildControls(controlsInner, sim.controls, params, (key, val) => {
            engine.setParams({ [key]: val });
        });

        // Action buttons
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        btnGroup.style.marginTop = '16px';

        btnGroup.appendChild(createButton('▶ Start', () => engine.start(), 'primary'));
        btnGroup.appendChild(createButton('⏸ Pause', () => engine.pause(), 'secondary'));
        btnGroup.appendChild(createButton('↺ Reset', () => engine.reset(params), 'danger'));

        // CSV export button — downloads all recorded graph data
        btnGroup.appendChild(createButton('⬇ CSV', () => {
            const datasets = graph._chart && graph._chart.data.datasets;
            const hasData = datasets && datasets.some(ds => ds.data.length > 0);
            if (!hasData) {
                showToast('Run the simulation first to record data.', 'info');
                return;
            }
            const name = (sim.name || 'data').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            graph.downloadCSV(`${name}.csv`);
            showToast('CSV downloaded.', 'success', 2000);
        }, 'secondary'));

        controlsInner.appendChild(btnGroup);

        // Status bar
        const statusBar = document.createElement('div');
        statusBar.className = 'status-bar';
        statusBar.innerHTML = '<span class="status-dot" id="status-dot"></span><span id="status-text">Ready</span>';
        controlsInner.appendChild(statusBar);

        engine.onStatusChange(status => {
            const dot = document.getElementById('status-dot');
            const text = document.getElementById('status-text');
            dot.className = 'status-dot ' + (status === 'running' ? 'running' : status === 'paused' ? 'paused' : '');
            const labels = { idle: 'Ready', running: 'Running', paused: 'Paused', done: 'Completed' };
            text.textContent = labels[status] || status;
        });

        // Draw initial state
        engine.reset(params);

        // Load theory
        if (theoryContainer) loadTheory(theoryUrl, theoryContainer);
    } catch (err) {
        console.error('initExperimentPage error:', err);
        const controlsBody = document.getElementById(controlsId);
        if (controlsBody) {
            controlsBody.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;">Error loading experiment: ${err.message}</p>`;
        }
    }
}

/* ============================================================
   PWA — Service Worker Registration
   ============================================================ */

/* ============================================================
   ux-reveal — Scroll-triggered entrance animation for homepage.
   Attaches to elements with class .ux-observe on DOMContentLoaded.
   Uses IntersectionObserver; no-ops gracefully if unsupported.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(
        (entries) => entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('ux-reveal');
                obs.unobserve(entry.target);
            }
        }),
        { threshold: 0.12 }
    );
    document.querySelectorAll('.ux-observe').forEach(el => obs.observe(el));
});

/**
 * Register /sw.js as a service worker, scoped to the site root.
 * Safe to call from any page — silently skips if SW is unsupported
 * or the page is served over HTTP (non-secure context).
 *
 * Call this once per page entry-point (main.js, category-page.js,
 * and inside initExperimentPage via experiment index.html).
 */
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // Defer registration until after page load to avoid competing
        // with the initial render and simulation startup.
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then(reg => {
                    console.log('[PWA] Service worker registered. Scope:', reg.scope);
                })
                .catch(err => {
                    // Non-fatal — site still works without SW
                    console.warn('[PWA] Service worker registration failed:', err);
                });
        });
    }
}
