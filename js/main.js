/* ============================================================
   main.js — Landing page: render category nav + experiment grid
   ============================================================ */
import { initTheme, createThemeToggle } from './theme.js';
import { experiments, CATEGORIES } from './categories.js';
import { registerServiceWorker } from './ui.js';

// Apply saved theme ASAP (prevents FOUC)
initTheme();

// Register PWA service worker (no-op on non-secure contexts)
registerServiceWorker();

/** SVG icons for each difficulty level */
const LEVEL_ICONS = {
    basic: `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="6" stroke="currentColor" stroke-width="1.8"/>
      <path d="M18 4v4M18 28v4M4 18h4M28 18h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M8.69 8.69l2.83 2.83M24.48 24.48l2.83 2.83M8.69 27.31l2.83-2.83M24.48 11.52l2.83-2.83" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
    intermediate: `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M4 24 Q10 10 18 18 Q26 26 32 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      <path d="M4 28 Q10 14 18 22 Q26 30 32 16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".45"/>
    </svg>`,
    advanced: `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <polygon points="18,4 22,14 33,14 24,21 27,32 18,25 9,32 12,21 3,14 14,14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    </svg>`,
};

/** Render the three level cards into #category-nav */
function renderCategoryButtons() {
    const nav = document.getElementById('category-nav');
    if (!nav) return;
    nav.classList.add('ux-level-nav');

    Object.entries(CATEGORIES).forEach(([key, meta]) => {
        const expCount = meta.ids.length;
        const card = document.createElement('a');
        card.href = `pages/${key}.html`;
        card.className = `ux-level-card ux-level-card--${key}`;
        card.setAttribute('aria-label', `Browse ${meta.label} experiments — ${expCount} simulations`);

        card.innerHTML = `
      <div class="ux-level-icon ux-level-icon--${key}" aria-hidden="true">${LEVEL_ICONS[key]}</div>
      <h3 class="ux-level-title">${meta.label}</h3>
      <p class="ux-level-desc">${meta.description}</p>
      <div class="ux-level-footer">
        <span class="card-badge ${meta.badgeClass}">${meta.label}</span>
        <span class="ux-level-count">${expCount} Experiments</span>
      </div>
    `;
        nav.appendChild(card);
    });
}

/** Render all 33 experiment cards into #experiments-grid */
function renderCards() {
    const grid = document.getElementById('experiments-grid');
    if (!grid) return;

    experiments.forEach(exp => {
        const card = document.createElement('a');
        card.href = exp.path ?? `experiments/${exp.id}/index.html`;
        card.className = 'experiment-card';
        card.setAttribute('aria-label', `${exp.title} — ${exp.badge} experiment`);

        card.innerHTML = `
      <div class="card-icon ${exp.iconClass}" aria-hidden="true">${exp.icon}</div>
      <h3 class="card-title">${exp.title}</h3>
      <p class="card-description">${exp.description}</p>
      <span class="card-badge ${exp.badgeClass}">${exp.badge}</span>
    `;

        grid.appendChild(card);
    });
}

renderCategoryButtons();
renderCards();

// Inject theme toggle into landing page navbar
const navbarContainer = document.querySelector('.navbar .container');
if (navbarContainer) {
    navbarContainer.appendChild(createThemeToggle());
}
