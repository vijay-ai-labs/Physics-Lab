/* ============================================================
   vectorRenderer.js — Reusable Vector Arrow Drawing Module
   ============================================================
   Provides a single drawVector() function and VECTOR_COLORS
   constants for use across all physics experiment canvases.

   Design principles:
     - Zero side-effects: wraps every call in save/restore.
     - No physics: only draws what the caller passes in.
     - Performance: no loops, no heap allocations per call.
     - Minimum length threshold to skip trivially small vectors.
   ============================================================ */

/**
 * Named colour constants for common physical vector types.
 * Use these for visual consistency across all experiments.
 */
export const VECTOR_COLORS = {
    velocity: '#38bdf8', // sky blue
    acceleration: '#f59e0b', // amber
    force: '#10b981', // emerald
    gravity: '#ef4444', // red
    buoyancy: '#818cf8', // indigo
    momentum: '#a78bfa', // violet
};

/**
 * Draw a vector arrow from (x, y) in direction (vx, vy).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x        — origin X in canvas logical pixels
 * @param {number} y        — origin Y in canvas logical pixels
 * @param {number} vx       — vector X component (physics units)
 * @param {number} vy       — vector Y component (physics units, Y-up)
 * @param {number} scale    — px per physics unit (controls arrow length)
 * @param {string} color    — CSS colour string
 * @param {string} [label]  — optional label drawn near the arrowhead
 * @param {object} [opts]
 * @param {number} [opts.lineWidth=2.5]   — shaft line width
 * @param {number} [opts.headLength=12]   — arrowhead length in px
 * @param {number} [opts.headAngle=0.42]  — half-angle of arrowhead (rad)
 * @param {number} [opts.minPx=6]         — minimum arrow length in px; skip if smaller
 * @param {number} [opts.labelOffset=5]   — extra px beyond arrowhead for label
 * @param {boolean} [opts.invertY=true]   — when true, vy is flipped so physics Y-up
 *                                          maps to canvas Y-down correctly
 */
export function drawVector(ctx, x, y, vx, vy, scale, color, label = '', opts = {}) {
    const {
        lineWidth = 2.5,
        headLength = 12,
        headAngle = 0.42,
        minPx = 6,
        labelOffset = 5,
        invertY = true,
    } = opts;

    // Physics Y-up → canvas Y-down conversion
    const cvx = vx * scale;
    const cvy = (invertY ? -vy : vy) * scale;

    const lenPx = Math.sqrt(cvx * cvx + cvy * cvy);
    if (lenPx < minPx) return; // skip trivially small vectors

    const tx = x + cvx;
    const ty = y + cvy;
    const angle = Math.atan2(cvy, cvx);

    ctx.save();

    // ── Glow halo ───────────────────────────────────────────────
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    // ── Shaft ───────────────────────────────────────────────────
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // ── Arrowhead ───────────────────────────────────────────────
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(
        tx - headLength * Math.cos(angle - headAngle),
        ty - headLength * Math.sin(angle - headAngle),
    );
    ctx.lineTo(
        tx - headLength * Math.cos(angle + headAngle),
        ty - headLength * Math.sin(angle + headAngle),
    );
    ctx.closePath();
    ctx.fill();

    // ── Origin dot ──────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // ── Label ───────────────────────────────────────────────────
    if (label) {
        ctx.shadowBlur = 0;
        const lx = tx + (labelOffset + 2) * Math.cos(angle);
        const ly = ty + (labelOffset + 2) * Math.sin(angle);
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Pill background for readability
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(10,14,26,0.75)';
        ctx.fillRect(lx - tw / 2 - 3, ly - 8, tw + 6, 16);
        ctx.fillStyle = color;
        ctx.fillText(label, lx, ly);
    }

    ctx.restore();
}

/**
 * Build a vector-toggle control descriptor for an experiment's controls array.
 * Usage:  vectorToggle('showVelocity',     'Velocity',     'velocity')
 *
 * @param {string} key      — key on sim.defaults / sim object
 * @param {string} label    — human-readable label
 * @param {string} colorKey — key in VECTOR_COLORS
 * @returns {object}  control descriptor compatible with ui.js buildControls()
 */
export function vectorToggle(key, label, colorKey) {
    return { type: 'toggle', key, label: `⟶ ${label}`, colorKey };
}
