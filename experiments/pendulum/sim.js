/* FILE: experiments/pendulum/sim.js
   ============================================================
   Pendulum Motion — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - FIXED frame-rate-dependent damping: replaced per-frame
         `omega *= 0.9995` with `omega *= Math.exp(-gamma * dt)`
         (gamma = 0.018 /s gives very subtle, frame-rate-independent
         energy loss; at 60fps this ≈ the original 0.9995/frame).
       - Added phase space inset (θ vs ω) drawn in bottom-right of
         canvas; keeps 400-point trail.
       - Added simulated period measurement via zero-crossing detection
         (positive-slope θ crossings). Displays T_theory and T_sim
         side-by-side.
       - Added `omega` key to graphConfig datasets so angular velocity
         is recorded to the chart and exportable via CSV.
   ============================================================ */
import { degToRad, hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';
import { attachDrag, drawDragHandle } from '../../js/dragHelper.js';

// Damping coefficient (1/s).  exp(-gamma*dt) per step.
// 0.018 ≈ matches 0.9995^60 ≈ 0.9701 per second decay.
const GAMMA = 0.018;

const sim = {
    name: 'Pendulum Motion',


    objective: 'What is the time period for a given pendulum length?',
    defaults: { length: 1.5, angle: 30, gravity: 9.81, showVelocity: true, showGravity: true },

    controls: [
        { type: 'slider', key: 'length', label: 'Length (m)', min: 0.5, max: 3.0, step: 0.1, tooltip: 'Length of the pendulum string from pivot to bob (in meters)' },
        { type: 'slider', key: 'angle', label: 'Initial Angle (°)', min: 5, max: 80, step: 1, tooltip: 'Starting angle of the pendulum relative to the vertical rest position' },
        { type: 'slider', key: 'gravity', label: 'Gravity (m/s²)', min: 1, max: 20, step: 0.1, tooltip: 'Acceleration due to gravity — try different planetary values!' },
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
        vectorToggle('showGravity', 'Gravity', 'gravity'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Angle (°) / ω (rad/s)',
        datasets: [
            { key: 'angleDeg', label: 'θ (°)', color: '#8b5cf6' },
            { key: 'omega', label: 'ω (rad/s)', color: '#f59e0b' },
        ],
    },

    _theta: 0,
    _omega: 0,
    _t: 0,
    _trail: [],
    _phaseTrail: [],      // { x: theta, y: omega } for phase-space inset
    _L: 0,
    _g: 0,

    // Period measurement
    _prevTheta: 0,
    _lastCrossT: -1,
    _measuredT: null,

    // Drag state
    _isDragging: false,
    _bobPx: null,       // { x, y } updated each draw() for hit-test
    _pivotPx: null,     // { x, y } updated each draw()
    _engine: null,

    /** Called by ui.js after engine construction. */
    onEngineReady(engine) {
        this._engine = engine;
    },

    /** Called once by engine when canvas is ready. */
    initCanvas(canvas) {
        attachDrag(canvas, {
            hitRadius: 20,
            getCenter: () => this._bobPx || null,
            onDragStart: (pos) => {
                this._isDragging = true;
                this._omega = 0;
                this._trail = [];
                this._phaseTrail = [];
                // Pause physics while dragging so the bob follows the mouse precisely
                if (this._engine) this._engine.pause();
            },
            onDrag: (pos) => {
                if (!this._pivotPx) return;
                const dx = pos.x - this._pivotPx.x;
                const dy = pos.y - this._pivotPx.y;
                // atan2 with (dx, dy) because in canvas: right=+X, down=+Y,
                // and theta is measured from the downward vertical.
                const newTheta = Math.atan2(dx, dy);
                const clampedTheta = Math.max(-80 * Math.PI / 180, Math.min(80 * Math.PI / 180, newTheta));
                this._theta = clampedTheta;
                this._omega = 0;
            },
            onDragEnd: () => {
                this._isDragging = false;
                // Resume physics from the dragged angle
                if (this._engine) this._engine.start();
            },
        });
    },

    reset(params) {
        this._theta = degToRad(params.angle);
        this._omega = 0;
        this._t = 0;
        this._trail = [];
        this._phaseTrail = [];
        this._L = params.length;
        this._g = params.gravity;
        this._prevTheta = this._theta;
        this._lastCrossT = -1;
        this._measuredT = null;
    },

    update(dt) {
        // Semi-implicit (Euler-Cromer) integration: θ̈ = -(g/L)·sin(θ)
        const alpha = -(this._g / this._L) * Math.sin(this._theta);
        this._omega += alpha * dt;

        // Frame-rate-independent damping: e^(-γ·dt)
        this._omega *= Math.exp(-GAMMA * dt);

        this._theta += this._omega * dt;
        this._t += dt;

        // Detect positive-slope zero-crossings for period measurement
        if (this._prevTheta < 0 && this._theta >= 0 && this._omega > 0) {
            if (this._lastCrossT >= 0) {
                this._measuredT = this._t - this._lastCrossT;
            }
            this._lastCrossT = this._t;
        }
        this._prevTheta = this._theta;

        const angleDeg = this._theta * (180 / Math.PI);

        this._trail.push({ theta: this._theta, t: this._t });
        if (this._trail.length > 300) this._trail.shift();

        this._phaseTrail.push({ x: this._theta, y: this._omega });
        if (this._phaseTrail.length > 400) this._phaseTrail.shift();

        return { t: this._t, angleDeg, omega: this._omega, done: false };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const pivotX = w / 2;
        const pivotY = h * 0.15;
        const scale = Math.min(w, h) * 0.3;
        const bobX = pivotX + Math.sin(this._theta) * scale;
        const bobY = pivotY + Math.cos(this._theta) * scale;

        // Store for drag hit-test (in initCanvas callbacks)
        this._pivotPx = { x: pivotX, y: pivotY };
        this._bobPx = { x: bobX, y: bobY };

        // Faded trail
        if (this._trail.length > 1) {
            this._trail.forEach((p, i) => {
                const bx = pivotX + Math.sin(p.theta) * scale;
                const by = pivotY + Math.cos(p.theta) * scale;
                const a = (i / this._trail.length) * 0.3;
                ctx.beginPath();
                ctx.arc(bx, by, 3, 0, Math.PI * 2);
                ctx.fillStyle = hexToRgba('#8b5cf6', a);
                ctx.fill();
            });
        }

        // Pivot
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#475569';
        ctx.fill();

        // Rod
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bob glow
        const grad = ctx.createRadialGradient(bobX, bobY, 0, bobX, bobY, 25);
        grad.addColorStop(0, hexToRgba('#8b5cf6', 0.5));
        grad.addColorStop(1, hexToRgba('#8b5cf6', 0));
        ctx.beginPath();
        ctx.arc(bobX, bobY, 25, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bob
        ctx.beginPath();
        ctx.arc(bobX, bobY, 12, 0, Math.PI * 2);
        ctx.fillStyle = this._isDragging ? '#f59e0b' : '#a78bfa';
        ctx.fill();
        ctx.strokeStyle = this._isDragging ? '#fde68a' : '#c4b5fd';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Drag handle ring feedback
        drawDragHandle(ctx, bobX, bobY, 12, this._isDragging ? '#f59e0b' : '#a78bfa', this._isDragging, this._t);
        if (!this._isDragging) {
            ctx.fillStyle = 'rgba(167,139,250,0.45)';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText('drag', bobX + 16, bobY + 4);
        }

        // Angle arc
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 30, Math.PI / 2 - this._theta, Math.PI / 2, this._theta > 0);
        ctx.strokeStyle = hexToRgba('#f59e0b', 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Info text
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`θ = ${(this._theta * 180 / Math.PI).toFixed(1)}°`, pivotX + 40, pivotY + 10);

        // ── Vector Overlays ───────────────────────────────────────────────
        {
            // tangential velocity direction: perpendicular to the rod
            // rod direction: (sin θ, cos θ) in canvas coords → tangent is (cos θ, -sin θ)
            const vMag = Math.abs(this._omega) * scale; // magnitude in canvas px
            const vSign = this._omega >= 0 ? 1 : -1;
            // canvas tangent direction (no scale applied, we pass magnitude directly)
            const vtx = Math.cos(this._theta) * vSign;
            const vty = -Math.sin(this._theta) * vSign;
            const vecScale = 0.25 * scale; // px per rad/s

            if (this._params && this._params.showVelocity) {
                // velocity vector: tangential, magnitude = omega * L (in m/s)
                const velMag = Math.abs(this._omega) * this._L;
                drawVector(ctx, bobX, bobY, vtx * velMag, -vty * velMag, vecScale,
                    VECTOR_COLORS.velocity, `v ${velMag.toFixed(2)} m/s`, { invertY: false });
            }
            if (this._params && this._params.showGravity) {
                drawVector(ctx, bobX, bobY, 0, -this._g, 0.55 * scale / 10,
                    VECTOR_COLORS.gravity, `g ${this._g.toFixed(1)} m/s²`);
            }
        }

        const tTheory = 2 * Math.PI * Math.sqrt(this._L / this._g);
        ctx.fillText(`T_theory = ${tTheory.toFixed(3)} s`, 16, h - 32);
        if (this._measuredT !== null) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`T_sim    = ${this._measuredT.toFixed(3)} s`, 16, h - 16);
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillText('T_sim    = measuring…', 16, h - 16);
        }

        // ── Phase space inset (θ vs ω) ────────────────────────────────────
        if (this._phaseTrail.length > 1) {
            const iw = 130, ih = 100;
            const ix = w - iw - 12, iy = h - ih - 12;

            // Background
            ctx.fillStyle = hexToRgba('#0f172a', 0.88);
            ctx.fillRect(ix, iy, iw, ih);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(ix, iy, iw, ih);

            // Axis labels
            ctx.fillStyle = '#475569';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText('θ →', ix + iw - 20, iy + ih - 3);
            ctx.fillText('ω', ix + 3, iy + 10);

            // Find data range
            let tMin = Infinity, tMax = -Infinity, oMin = Infinity, oMax = -Infinity;
            this._phaseTrail.forEach(p => {
                if (p.x < tMin) tMin = p.x; if (p.x > tMax) tMax = p.x;
                if (p.y < oMin) oMin = p.y; if (p.y > oMax) oMax = p.y;
            });
            const tRange = Math.max(tMax - tMin, 0.01);
            const oRange = Math.max(oMax - oMin, 0.01);
            const margin = 8;

            const toX = v => ix + margin + ((v - tMin) / tRange) * (iw - margin * 2);
            const toY = v => iy + ih - margin - ((v - oMin) / oRange) * (ih - margin * 2);

            ctx.beginPath();
            ctx.strokeStyle = hexToRgba('#f59e0b', 0.8);
            ctx.lineWidth = 1;
            this._phaseTrail.forEach((p, i) => {
                if (i === 0) ctx.moveTo(toX(p.x), toY(p.y));
                else ctx.lineTo(toX(p.x), toY(p.y));
            });
            ctx.stroke();

            // Current position dot
            const last = this._phaseTrail[this._phaseTrail.length - 1];
            ctx.beginPath();
            ctx.arc(toX(last.x), toY(last.y), 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();

            // Title
            ctx.fillStyle = hexToRgba('#94a3b8', 0.7);
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText('Phase Space', ix + 4, iy + ih - 4 + 12 > h ? iy + 10 : iy + ih + 11 < h ? iy + ih + 10 : iy + 10);
        }
    },
};

export default sim;
