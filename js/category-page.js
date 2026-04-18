/* ============================================================
   category-page.js — Filtered experiment grid for category pages
   Used by: pages/basic.html, pages/intermediate.html, pages/advanced.html
   ============================================================ */
import { initTheme, createThemeToggle } from './theme.js';
import { experimentsByCategory } from './categories.js';
import { registerServiceWorker } from './ui.js';

// Apply saved theme immediately (prevents FOUC)
initTheme();

// Register PWA service worker
registerServiceWorker();

/**
 * Render experiment cards for the current category.
 * Category key is read from data-category attribute on #experiments-grid.
 */
function renderFilteredCards() {
    const grid = document.getElementById('experiments-grid');
    if (!grid) return;

    const categoryKey = grid.dataset.category;
    if (!categoryKey) return;

    const exps = experimentsByCategory(categoryKey);

    exps.forEach(exp => {
        const card = document.createElement('a');
        // Category pages live at pages/<name>.html → experiments are one level up from root
        card.href = exp.path ? `../${exp.path}` : `../experiments/${exp.id}/index.html`;
        card.className = 'experiment-card';
        card.setAttribute('aria-label', `Launch ${exp.title} — ${exp.badge} experiment`);

        card.innerHTML = `
      <div class="card-icon ${exp.iconClass}" aria-hidden="true">${exp.icon}</div>
      <h3 class="card-title">${exp.title}</h3>
      <p class="card-description">${exp.description}</p>
      <span class="card-badge ${exp.badgeClass}">${exp.badge}</span>
    `;

        grid.appendChild(card);
    });
}

renderFilteredCards();

// Inject theme toggle into navbar (guard prevents double-injection)
const navbarContainer = document.querySelector('.navbar .container');
if (navbarContainer && !navbarContainer.querySelector('.theme-toggle')) {
    navbarContainer.appendChild(createThemeToggle());
}
