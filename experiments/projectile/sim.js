/* FILE: experiments/projectile/sim.js
   ============================================================
   Projectile Motion — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - Added analytic trajectory prediction overlay: dashed parabola
         drawn from (0,0) to landing point before the live trail, with
         labelled markers for max height and range.
       - Added click-drag measurement ruler via initCanvas() hook:
         mousedown sets point 1, mousemove updates point 2, mouseup
         finalises. Both points are converted to physics metres using
         the live scale factor. Distance (m) and angle (°) are shown
         as an overlay in draw(). Right-click clears the measurement.
       - Added `dev` flag: when true, initial params are logged to
         console.debug on reset and a live numeric readout (t, x, y,
         vx, vy) is drawn on the canvas.
   ============================================================ */
import { degToRad, drawGrid, hexToRgba } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';
import { attachDrag, drawDragHandle } from '../../js/dragHelper.js';

const sim = {
    name: 'Projectile Motion',
    objective: 'What is the range, max height & flight time?',

    defaults: { velocity: 50, angle: 45, showVelocity: true, showGravity: true },

    controls: [
        { type: 'slider', key: 'velocity', label: 'Initial Velocity (m/s)', min: 10, max: 100, step: 1, tooltip: 'Initial speed of the projectile in meters per second' },
        { type: 'slider', key: 'angle', label: 'Launch Angle (°)', min: 5, max: 85, step: 1, tooltip: 'Launch angle relative to the horizontal (in degrees)' },
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
        vectorToggle('showGravity', 'Gravity', 'gravity'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Height (m)',
        datasets: [
            { key: 'y', label: 'Height', color: '#6366f1' },
            { key: 'x', label: 'Distance', color: '#10b981' },
        ],
    },

    // Internal state
    _t: 0,
    _trail: [],
    _g: 9.81,
    _theta: 0,
    _v0: 0,
    _done: false,
    _scale: 1,    // px/m — computed in draw, used by ruler overlay
    _params: { velocity: 50, angle: 45, showVelocity: true, showGravity: true },

    // Measurement tool state
    _mP1: null,   // { canvasX, canvasY } in logical pixels
    _mP2: null,
    _measuring: false,
    _canvas: null,

    // Drag-launch state
    _isDraggingLaunch: false,
    _launchDragPos: null,
    _launchPad: 50,
    _launchGroundY: 0,
    _engine: null,

    /** Optional dev mode flag — set engine.dev=true or sim.dev=true */
    dev: false,

    /** Called by ui.js after engine construction — gives sim access to engine */
    onEngineReady(engine) {
        this._engine = engine;
    },

    reset(params) {
        this._params = { ...params };
        this._v0 = params.velocity;
        this._theta = degToRad(params.angle);
        this._t = 0;
        this._trail = [];
        this._done = false;
        if (this.dev) console.debug('[projectile] reset — v0:', this._v0, 'theta_deg:', params.angle);
    },

    /** Called once by engine constructor when a canvas element is available. */
    initCanvas(canvas) {
        this._canvas = canvas;
        // Use a single persistent handler object so we can cleanly remove it
        this._onMouseDown = (e) => {
            if (e.button !== 0) { this._mP1 = null; this._mP2 = null; return; } // right-click clears
            const r = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const scaleX = (canvas.width / dpr) / r.width;
            const scaleY = (canvas.height / dpr) / r.height;
            this._mP1 = { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
            this._mP2 = { ...this._mP1 };
            this._measuring = true;
        };
        this._onMouseMove = (e) => {
            if (!this._measuring) return;
            const r = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const scaleX = (canvas.width / dpr) / r.width;
            const scaleY = (canvas.height / dpr) / r.height;
            this._mP2 = { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
        };
        this._onMouseUp = () => { this._measuring = false; };
        this._onContextMenu = (e) => {
            e.preventDefault();
            this._mP1 = null; this._mP2 = null;
        };
        canvas.addEventListener('mousedown', this._onMouseDown);
        canvas.addEventListener('mousemove', this._onMouseMove);
        canvas.addEventListener('mouseup', this._onMouseUp);
        canvas.addEventListener('contextmenu', this._onContextMenu);

        // ── Drag to set launch velocity ───────────────────────────────────
        // Drag originates from the launch handle at (pad, groundY).
        // Direction → angle, distance → velocity.
        attachDrag(canvas, {
            hitRadius: 22,
            getCenter: () => ({ x: this._launchPad, y: this._launchGroundY }),
            onDragStart: (pos) => {
                this._isDraggingLaunch = true;
                this._launchDragPos = pos;
                // Reset and pause so user sees the preview update live
                if (this._engine) {
                    this._engine.reset(this._params);
                }
            },
            onDrag: (pos) => {
                this._launchDragPos = pos;
                const pad = this._launchPad;
                const groundY = this._launchGroundY;
                const dx = pos.x - pad;
                const dy = groundY - pos.y; // Y-up
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 5) return; // ignore tiny moves

                // Map drag length to velocity: 1px ≈ scale factor, max 100
                const scaleRef = this._scale || 1;
                const newVelocity = Math.max(10, Math.min(100, dist / scaleRef * 10));
                const newAngleDeg = Math.max(5, Math.min(85,
                    Math.atan2(dy, dx) * (180 / Math.PI)));

                this._params.velocity = newVelocity;
                this._params.angle = newAngleDeg;
                this._v0 = newVelocity;
                this._theta = degToRad(newAngleDeg);
                this._trail = [];
                this._done = false;
                if (this._engine) this._engine.setParams(this._params);
            },
            onDragEnd: () => {
                this._isDraggingLaunch = false;
                this._launchDragPos = null;
                // Reset so user can see the full new trajectory
                if (this._engine) this._engine.reset(this._params);
            },
        });
    },

    update(dt) {
        if (this._done) return { t: this._t, x: 0, y: 0, done: true };

        this._t += dt;
        const t = this._t;
        const x = this._v0 * Math.cos(this._theta) * t;
        let y = this._v0 * Math.sin(this._theta) * t - 0.5 * this._g * t * t;

        if (y <= 0 && t > 0.01) {
            y = 0;
            this._done = true;
        }

        this._trail.push({ x, y });
        if (this._trail.length > 600) this._trail.shift();

        return { t, x, y, done: this._done };
    },

    draw(ctx, w, h) {
        // Coordinate system: origin at bottom-left, with padding
        const pad = 50;
        const gw = w - pad * 2;
        const gh = h - pad * 2;

        // Background
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        // Compute auto-scale from max range & height
        const maxRange = (this._v0 * this._v0 * Math.sin(2 * this._theta)) / this._g;
        const maxHeight = (this._v0 * this._v0 * Math.sin(this._theta) * Math.sin(this._theta)) / (2 * this._g);
        const sx = gw / Math.max(maxRange * 1.15, 1);
        const sy = gh / Math.max(maxHeight * 1.3, 1);
        const scale = Math.min(sx, sy);
        this._scale = scale;   // store for ruler conversion

        const groundY = h - pad;
        this._launchPad = pad;
        this._launchGroundY = groundY;

        // Ground line
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, groundY);
        ctx.lineTo(w - pad, groundY);
        ctx.stroke();

        // ── Trajectory prediction overlay (analytic, dashed) ──────────────
        {
            const steps = 120;
            const tFlight = (2 * this._v0 * Math.sin(this._theta)) / this._g;
            ctx.beginPath();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = hexToRgba('#6366f1', 0.3);
            ctx.lineWidth = 1.5;
            for (let i = 0; i <= steps; i++) {
                const tf = (i / steps) * tFlight;
                const px = pad + this._v0 * Math.cos(this._theta) * tf * scale;
                const py = groundY - (this._v0 * Math.sin(this._theta) * tf - 0.5 * this._g * tf * tf) * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Peak marker
            const tPeak = this._v0 * Math.sin(this._theta) / this._g;
            const peakX = pad + this._v0 * Math.cos(this._theta) * tPeak * scale;
            const peakY = groundY - maxHeight * scale;
            ctx.beginPath();
            ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba('#818cf8', 0.7);
            ctx.fill();
            ctx.fillStyle = '#818cf8';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(`H=${maxHeight.toFixed(1)}m`, peakX + 6, peakY - 4);

            // Landing marker
            const landX = pad + maxRange * scale;
            ctx.beginPath();
            ctx.arc(landX, groundY, 4, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba('#10b981', 0.7);
            ctx.fill();
            ctx.fillStyle = '#10b981';
            ctx.fillText(`R=${maxRange.toFixed(1)}m`, landX - 18, groundY + 16);
        }

        // ── Trail ─────────────────────────────────────────────────────────
        if (this._trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = hexToRgba('#6366f1', 0.5);
            ctx.lineWidth = 2;
            this._trail.forEach((p, i) => {
                const px = pad + p.x * scale;
                const py = groundY - p.y * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Glow dots every 15 points
            this._trail.forEach((p, i) => {
                if (i % 15 !== 0) return;
                const px = pad + p.x * scale;
                const py = groundY - p.y * scale;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fillStyle = hexToRgba('#818cf8', 0.6);
                ctx.fill();
            });
        }

        // ── Current ball ──────────────────────────────────────────────────
        const last = this._trail[this._trail.length - 1];
        if (last) {
            const bx = pad + last.x * scale;
            const by = groundY - last.y * scale;

            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 20);
            grad.addColorStop(0, hexToRgba('#6366f1', 0.6));
            grad.addColorStop(1, hexToRgba('#6366f1', 0));
            ctx.beginPath();
            ctx.arc(bx, by, 20, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(bx, by, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#818cf8';
            ctx.fill();
            ctx.strokeStyle = '#c7d2fe';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // ── Axis labels ───────────────────────────────────────────────────
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('Distance →', w / 2, h - 12);
        ctx.save();
        ctx.translate(14, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Height →', 0, 0);
        ctx.restore();

        // ── Ruler / measurement overlay ───────────────────────────────────
        if (this._mP1 && this._mP2) {
            const p1 = this._mP1, p2 = this._mP2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const pxDist = Math.sqrt(dx * dx + dy * dy);
            // Convert px → metres (both axes use same scale)
            const mDist = pxDist / scale;
            // dy is inverted (canvas y down = physics y up)
            const angleDeg = Math.atan2(-dy, dx) * (180 / Math.PI);

            // Ruler line
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Endpoint dots
            [p1, p2].forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#fbbf24';
                ctx.fill();
            });

            // Label at midpoint
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const label = `${mDist.toFixed(2)}m  ${angleDeg.toFixed(1)}°`;
            ctx.font = 'bold 12px Inter, sans-serif';
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = hexToRgba('#0a0e1a', 0.75);
            ctx.fillRect(mx - tw / 2 - 4, my - 18, tw + 8, 20);
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(label, mx - tw / 2, my - 4);
        }

        // Hint text (only when no measurement active)
        if (!this._mP1) {
            ctx.fillStyle = hexToRgba('#64748b', 0.5);
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('Click-drag to measure  |  Right-click to clear', pad, h - 28);
        }

        // ── Launch Handle (drag to set angle + velocity) ──────────────────────
        {
            ctx.save();
            // Handle dot at launch origin
            ctx.beginPath();
            ctx.arc(pad, groundY, 8, 0, Math.PI * 2);
            ctx.fillStyle = this._isDraggingLaunch ? '#f59e0b' : '#38bdf8';
            ctx.shadowColor = this._isDraggingLaunch ? '#f59e0b' : '#38bdf8';
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (this._isDraggingLaunch && this._launchDragPos) {
                // Live drag line from origin to mouse
                const dp = this._launchDragPos;
                ctx.beginPath();
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.moveTo(pad, groundY);
                ctx.lineTo(dp.x, dp.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Arrowhead at drag point
                const ang = Math.atan2(dp.y - groundY, dp.x - pad);
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(dp.x + Math.cos(ang) * 8, dp.y + Math.sin(ang) * 8);
                ctx.lineTo(dp.x + Math.cos(ang + 2.5) * 6, dp.y + Math.sin(ang + 2.5) * 6);
                ctx.lineTo(dp.x + Math.cos(ang - 2.5) * 6, dp.y + Math.sin(ang - 2.5) * 6);
                ctx.closePath();
                ctx.fill();

                // Live angle + speed label
                const ddx = dp.x - pad;
                const ddy = groundY - dp.y;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                const scaleRef = this._scale || 1;
                const dispV = Math.max(10, Math.min(100, dist / scaleRef * 10)).toFixed(1);
                const dispA = Math.max(5, Math.min(85, Math.atan2(ddy, ddx) * 180 / Math.PI)).toFixed(1);
                ctx.font = 'bold 12px Inter, sans-serif';
                const lbl = `${dispA}°  ${dispV} m/s`;
                const lw = ctx.measureText(lbl).width;
                const lx = Math.min(dp.x + 10, w - lw - 10);
                const ly = Math.max(dp.y - 8, 16);
                ctx.fillStyle = hexToRgba('#0a0e1a', 0.8);
                ctx.fillRect(lx - 4, ly - 14, lw + 8, 18);
                ctx.fillStyle = '#f59e0b';
                ctx.fillText(lbl, lx, ly);
            } else {
                // Pulsing ring hint
                drawDragHandle(ctx, pad, groundY, 8, '#38bdf8', false, this._t);
                // Small "drag" hint label
                ctx.fillStyle = hexToRgba('#38bdf8', 0.5);
                ctx.font = '10px Inter, sans-serif';
                ctx.fillText('drag to aim', pad + 14, groundY + 4);
            }
            ctx.restore();
        }

        // ── Vector Overlays ───────────────────────────────────────────────
        if (last) {
            const bx = pad + last.x * scale;
            const by = groundY - last.y * scale;
            const vx = this._v0 * Math.cos(this._theta);
            const vy = this._v0 * Math.sin(this._theta) - this._g * this._t;
            const vecScale = scale * 0.12; // tune so vectors are visually comfortable

            if (this._params && this._params.showVelocity) {
                drawVector(ctx, bx, by, vx, vy, vecScale, VECTOR_COLORS.velocity, `v ${Math.sqrt(vx * vx + vy * vy).toFixed(1)} m/s`);
            }
            if (this._params && this._params.showGravity) {
                // gravity always points straight down
                drawVector(ctx, bx, by, 0, -this._g, vecScale, VECTOR_COLORS.gravity, `g ${this._g.toFixed(1)} m/s²`);
            }
        }

        // ── Dev overlay ───────────────────────────────────────────────────
        if (this.dev && last) {
            const vx = this._v0 * Math.cos(this._theta);
            const vy = this._v0 * Math.sin(this._theta) - this._g * this._t;
            ctx.fillStyle = hexToRgba('#0a0e1a', 0.7);
            ctx.fillRect(w - 190, 10, 178, 80);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px "Courier New", monospace';
            ctx.fillText(`t  = ${this._t.toFixed(3)} s`, w - 182, 28);
            ctx.fillText(`x  = ${last.x.toFixed(2)} m`, w - 182, 44);
            ctx.fillText(`y  = ${last.y.toFixed(2)} m`, w - 182, 60);
            ctx.fillText(`vx = ${vx.toFixed(2)} m/s`, w - 182, 76);
            ctx.fillText(`vy = ${vy.toFixed(2)} m/s`, w - 182, 92);
        }
    },
};

export default sim;
