/* FILE: experiments/newtons-second-law/sim.js
   ============================================================
   Newton's Second Law — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - FIXED floating-point equality: `this._v === 0` → `Math.abs(this._v) < 0.001`
         for reliable static-friction check.
       - FIXED incoherent friction cap: removed the mathematically wrong
         `Math.max(-fFric, -this._v * mass / dt)` line. Replaced with a
         clean post-update velocity clamp: if the net force is negative
         (friction > applied) and velocity would cross zero, clamp v=0, a=0.
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';

const sim = {
    name: "Newton's Second Law",
    objective: 'What acceleration does a force produce on a mass?',

    defaults: { force: 50, mass: 10, friction: 0.2, showVelocity: true, showAcceleration: true, showForce: true },

    controls: [
        { type: 'slider', key: 'force', label: 'Applied Force (N)', min: 0, max: 200, step: 5, tooltip: 'Horizontal force applied to the mass in Newtons (F = ma)' },
        { type: 'slider', key: 'mass', label: 'Mass (kg)', min: 1, max: 50, step: 1, tooltip: 'Mass of the object — higher mass means lower acceleration for the same force' },
        { type: 'slider', key: 'friction', label: 'Friction Coefficient (μ)', min: 0, max: 0.8, step: 0.05, tooltip: 'Coefficient of kinetic friction between the object and the surface (dimensionless)' },
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
        vectorToggle('showAcceleration', 'Acceleration', 'acceleration'),
        vectorToggle('showForce', 'Force', 'force'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Velocity (m/s) / Acceleration (m/s²)',
        datasets: [
            { key: 'v', label: 'Velocity', color: '#38bdf8' },
            { key: 'a', label: 'Acceleration', color: '#ef4444' },
        ],
    },

    _t: 0,
    _params: { force: 50, mass: 10, friction: 0.2 },
    _x: 0,
    _v: 0,
    _a: 0,
    _done: false,
    _g: 9.81,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._x = -150;
        this._v = 0;
        this._a = 0;
        this._done = false;
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { force, mass, friction } = this._params;

        // F_net = F_app - F_fric
        const fFric = friction * mass * this._g;
        let netForce = force - fFric;

        // Static friction: if effectively stationary and applied force can't overcome friction
        if (Math.abs(this._v) < 0.001 && force <= fFric) {
            netForce = 0;
        }

        this._a = netForce / mass;
        this._v += this._a * dt;

        // Post-update clamp: friction cannot reverse motion — if object slows to zero, stop it
        if (this._v < 0 && netForce < 0) {
            this._v = 0;
            this._a = 0;
        }

        this._x += this._v * dt * 10; // visual scaling

        if (this._x > 200) {
            this._done = true;
        }

        if (this._t > 15) this._done = true;

        return { t: this._t, v: this._v, a: this._a, done: this._done };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { force, mass, friction } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        // Ground
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(20, cy + 40);
        ctx.lineTo(w - 20, cy + 40);
        ctx.stroke();

        const boxSize = 20 + Math.sqrt(mass) * 5;
        const bx = cx + this._x;
        const by = cy + 40 - boxSize / 2;

        // Draw Box
        ctx.fillStyle = hexToRgba('#a8a29e', 0.9);
        ctx.fillRect(bx - boxSize / 2, by - boxSize / 2, boxSize, boxSize);
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - boxSize / 2, by - boxSize / 2, boxSize, boxSize);

        const fFric = friction * mass * this._g;

        // Force Vectors
        if (force > 0) {
            this._drawArrow(ctx, bx + boxSize / 2 + 5, cy, bx + boxSize / 2 + 5 + force, cy, '#10b981'); // Applied
            ctx.fillStyle = '#10b981';
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText(`F_app = ${force} N`, bx + boxSize / 2 + 10, cy - 10);
        }

        if (friction > 0 && (this._v > 0 || force > 0)) {
            const actualFriction = this._v > 0 ? fFric : Math.min(force, fFric);
            this._drawArrow(ctx, bx - boxSize / 2 - 5, cy + boxSize / 2 - 5, bx - boxSize / 2 - 5 - actualFriction, cy + boxSize / 2 - 5, '#ef4444'); // Friction
            ctx.fillStyle = '#ef4444';
            ctx.fillText(`F_fric = ${actualFriction.toFixed(1)} N`, bx - boxSize / 2 - actualFriction - 60, cy + boxSize / 2 + 10);
        }

        // Info Display
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`Equation: ΣF = m * a`, 12, 30);
        ctx.fillText(`a = (F_app - F_fric) / m`, 12, 50);

        const netForce = this._v > 0 ? force - fFric : (force > fFric ? force - fFric : 0);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(`Net Force = ${netForce.toFixed(1)} N`, 12, 75);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Acceleration = ${this._a.toFixed(2)} m/s²`, 12, 95);
        ctx.fillText(`Velocity = ${this._v.toFixed(2)} m/s`, 12, 115);

        // ── Vector Overlays ───────────────────────────────────────────────
        {
            const vecScale = 1.8;
            const boxTop = by - boxSize / 2;

            if (this._params.showVelocity && Math.abs(this._v) > 0.05) {
                drawVector(ctx, bx, boxTop - 10, this._v, 0, vecScale,
                    VECTOR_COLORS.velocity, `v ${this._v.toFixed(2)} m/s`, { invertY: false });
            }
            if (this._params.showAcceleration && Math.abs(this._a) > 0.01) {
                drawVector(ctx, bx, boxTop - 28, this._a, 0, vecScale,
                    VECTOR_COLORS.acceleration, `a ${this._a.toFixed(2)} m/s²`, { invertY: false });
            }
            if (this._params.showForce && force > 0) {
                const netF = this._params.force - fFric > 0 ? this._params.force - fFric : 0;
                drawVector(ctx, bx, boxTop - 46, netF, 0, vecScale,
                    VECTOR_COLORS.force, `F ${netF.toFixed(1)} N`, { invertY: false });
            }
        }
    },

    _drawArrow(ctx, x1, y1, x2, y2, color) {
        const dx = x2 - x1;
        if (Math.abs(dx) < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
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
    }
};

export default sim;
