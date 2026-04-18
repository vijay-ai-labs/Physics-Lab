/* FILE: experiments/momentum/sim.js
   ============================================================
   Momentum Conservation (Collision) — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - FIXED collision detection: replaced the boolean `_collided` flag
         (which permanently blocked all subsequent collisions) with a
         `_lastCollisionT` timestamp cooldown. A new collision is allowed
         only when:
           1. balls are overlapping (|x1-x2| <= r1+r2),
           2. they are approaching (v1 > v2), AND
           3. at least 200ms have elapsed since the last collision.
         This allows multiple bounces (e.g. balls reflecting off walls)
         to be correctly processed while preventing double-counting of
         a single impact.
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';

const sim = {
    name: 'Momentum Conservation',


    objective: 'Is momentum conserved after a collision?',
    defaults: { m1: 5, m2: 3, v1: 8, v2: -3, restitution: 1.0, showVelocity: true },

    controls: [
        { type: 'slider', key: 'm1', label: 'Mass 1 (kg)', min: 1, max: 20, step: 0.5, tooltip: 'Mass of the first ball in kilograms. Heavier balls carry more momentum.' },
        { type: 'slider', key: 'm2', label: 'Mass 2 (kg)', min: 1, max: 20, step: 0.5, tooltip: 'Mass of the second ball in kilograms.' },
        { type: 'slider', key: 'v1', label: 'Velocity 1 (m/s)', min: -15, max: 15, step: 0.5, tooltip: 'Initial velocity of ball 1. Negative values move it to the left.' },
        { type: 'slider', key: 'v2', label: 'Velocity 2 (m/s)', min: -15, max: 15, step: 0.5, tooltip: 'Initial velocity of ball 2. Negative values move it to the left.' },
        { type: 'slider', key: 'restitution', label: 'Elasticity (e)', min: 0, max: 1, step: 0.05, tooltip: 'Coefficient of restitution (e). 1 = perfectly elastic, 0 = perfectly inelastic collision.' },
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Momentum (kg·m/s)',
        datasets: [
            { key: 'p1', label: 'p₁', color: '#6366f1' },
            { key: 'p2', label: 'p₂', color: '#10b981' },
            { key: 'pTotal', label: 'Total', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: { m1: 5, m2: 3, v1: 8, v2: -3, restitution: 1.0 },
    _x1: 0, _x2: 0,
    _v1: 0, _v2: 0,
    _lastCollisionT: -Infinity,   // replaces boolean _collided flag
    _collisionCount: 0,
    _trail1: [], _trail2: [],
    _done: false,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._v1 = params.v1;
        this._v2 = params.v2;
        this._x1 = -60;
        this._x2 = 60;
        this._lastCollisionT = -Infinity;
        this._collisionCount = 0;
        this._trail1 = [];
        this._trail2 = [];
        this._done = false;
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { m1, m2, restitution } = this._params;

        // Check collision — use cooldown instead of a one-shot boolean flag
        const r1 = 10 + m1 * 1.5;
        const r2 = 10 + m2 * 1.5;
        const cooldownOk = (this._t - this._lastCollisionT) > 0.2; // 200ms cooldown
        if (cooldownOk && Math.abs(this._x1 - this._x2) <= r1 + r2 && this._v1 > this._v2) {
            const e = restitution;
            const newV1 = ((m1 - e * m2) * this._v1 + (1 + e) * m2 * this._v2) / (m1 + m2);
            const newV2 = ((m2 - e * m1) * this._v2 + (1 + e) * m1 * this._v1) / (m1 + m2);
            this._v1 = newV1;
            this._v2 = newV2;
            this._lastCollisionT = this._t;
            this._collisionCount++;
        }

        this._x1 += this._v1 * dt * 20;
        this._x2 += this._v2 * dt * 20;

        this._trail1.push({ t: this._t, x: this._x1 });
        this._trail2.push({ t: this._t, x: this._x2 });
        if (this._trail1.length > 500) this._trail1.shift();
        if (this._trail2.length > 500) this._trail2.shift();

        if (this._t > 8) this._done = true;

        const p1 = m1 * this._v1;
        const p2 = m2 * this._v2;
        return { t: this._t, p1, p2, pTotal: p1 + p2, done: this._done };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { m1, m2 } = this._params;
        const cx = w / 2;
        const cy = h / 2;
        const r1 = 10 + m1 * 1.5;
        const r2 = 10 + m2 * 1.5;

        // Track line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, cy);
        ctx.lineTo(w - 40, cy);
        ctx.stroke();

        // Ball 1
        const bx1 = cx + this._x1;
        const by1 = cy;
        const grad1 = ctx.createRadialGradient(bx1, by1, 0, bx1, by1, r1 * 1.5);
        grad1.addColorStop(0, hexToRgba('#6366f1', 0.5));
        grad1.addColorStop(1, hexToRgba('#6366f1', 0));
        ctx.beginPath();
        ctx.arc(bx1, by1, r1 * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = grad1;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx1, by1, r1, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ball 2
        const bx2 = cx + this._x2;
        const by2 = cy;
        const grad2 = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, r2 * 1.5);
        grad2.addColorStop(0, hexToRgba('#10b981', 0.5));
        grad2.addColorStop(1, hexToRgba('#10b981', 0));
        ctx.beginPath();
        ctx.arc(bx2, by2, r2 * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = grad2;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx2, by2, r2, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Velocity arrows
        this._drawArrow(ctx, bx1, by1 - r1 - 10, bx1 + this._v1 * 5, by1 - r1 - 10, '#818cf8');
        this._drawArrow(ctx, bx2, by2 - r2 - 10, bx2 + this._v2 * 5, by2 - r2 - 10, '#34d399');

        // Labels
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillStyle = '#a5b4fc';
        ctx.fillText(`m₁=${m1}kg`, bx1 - 20, by1 + r1 + 22);
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText(`m₂=${m2}kg`, bx2 - 20, by2 + r2 + 22);

        ctx.fillStyle = '#818cf8';
        ctx.fillText(`v₁=${this._v1.toFixed(1)} m/s`, bx1 - 30, by1 - r1 - 18);
        ctx.fillStyle = '#34d399';
        ctx.fillText(`v₂=${this._v2.toFixed(1)} m/s`, bx2 - 30, by2 - r2 - 18);

        // Collision indicator
        if (this._collisionCount > 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`Collision${this._collisionCount > 1 ? 's' : ''}: ${this._collisionCount}`, cx - 45, 30);
        }

        // Total momentum display
        const pTotal = m1 * this._v1 + m2 * this._v2;
        ctx.fillStyle = '#f59e0b';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Total Momentum: ${pTotal.toFixed(2)} kg·m/s`, 12, h - 16);

        // ── Vector Overlays ───────────────────────────────────────────────
        if (this._params.showVelocity) {
            const vecScale = 4;
            if (Math.abs(this._v1) > 0.1)
                drawVector(ctx, bx1, by1, this._v1, 0, vecScale,
                    VECTOR_COLORS.velocity, `v₁ ${this._v1.toFixed(1)} m/s`, { invertY: false });
            if (Math.abs(this._v2) > 0.1)
                drawVector(ctx, bx2, by2, this._v2, 0, vecScale,
                    VECTOR_COLORS.momentum, `v₂ ${this._v2.toFixed(1)} m/s`, { invertY: false });
        }
    },

    _drawArrow(ctx, x1, y1, x2, y2, color) {
        const dx = x2 - x1;
        if (Math.abs(dx) < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const hl = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hl * Math.cos(angle - 0.4), y2 - hl * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - hl * Math.cos(angle + 0.4), y2 - hl * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
    },
};

export default sim;
