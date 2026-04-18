/* FILE: experiments/intermediate/work-done/sim.js
   ============================================================
   Work Done — Physics Simulation
   ============================================================
   Physics:
     Force modes:
       0 = Constant:    F(x) = F0
       1 = Linear:      F(x) = k · x  (k = F0 / trackLen)
       2 = Sinusoidal:  F(x) = F0 · sin(2π x / wavelength)

     Net force along track:
       F_net = F(x)·cos(θ) − μ·m·g

     Semi-implicit Euler:
       a  = F_net / m
       v += a · dt
       x += v · dt

     Work accumulation (Riemann sum):
       dW = F(x) · cos(θ) · dx
       W  += dW

     Instantaneous power: P = F(x)·cos(θ) · v
   ============================================================ */

import { degToRad, clamp, drawGrid } from '../../../js/utils.js';
import { drawVector, VECTOR_COLORS } from '../../../js/vectorRenderer.js';

// Cross-browser rounded rectangle path (replaces ctx.roundRect which needs Chrome 99+)
function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,       y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x,     y,     x + r,   y,         r);
    ctx.closePath();
}

const TRACK_LEN = 8.0;   // metres — virtual track length
const G         = 9.81;

function computeForce(x, params) {
    const { forceMode, forceMag, mass } = params;
    const k = forceMag / TRACK_LEN;
    switch (Math.round(forceMode)) {
        case 1: return k * x;                                     // linear
        case 2: return forceMag * Math.sin(2 * Math.PI * x / 2); // sinusoidal λ=2m
        default: return forceMag;                                  // constant
    }
}

const sim = {
    name: 'Work Done',

    objective: 'How much work is done by a force over a distance?',
    defaults: {
        forceMag:   20,    // N
        forceMode:  0,     // 0=constant, 1=linear, 2=sinusoidal
        forceAngle: 0,     // degrees (angle between force and displacement)
        mass:       5,     // kg
        friction:   0.1,   // kinetic friction coefficient
    },

    controls: [
        { type: 'slider', key: 'forceMag',   label: 'Force Magnitude (N)',
          min: 0, max: 100, step: 1,
          tooltip: 'Peak magnitude of the applied force.' },
        { type: 'slider', key: 'forceMode',  label: 'Force Mode (0=const 1=linear 2=sin)',
          min: 0, max: 2, step: 1,
          tooltip: '0: constant force; 1: F=kx (linear spring-like); 2: sinusoidal.' },
        { type: 'slider', key: 'forceAngle', label: 'Force Angle θ (°)',
          min: 0, max: 89, step: 1,
          tooltip: 'Angle between the force vector and the direction of motion. 0°=aligned, 90°=no work.' },
        { type: 'slider', key: 'mass',       label: 'Mass (kg)',
          min: 0.5, max: 50, step: 0.5,
          tooltip: 'Mass of the block.' },
        { type: 'slider', key: 'friction',   label: 'Friction Coefficient μ',
          min: 0, max: 0.8, step: 0.02,
          tooltip: 'Kinetic friction coefficient between block and track.' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Work (J) / Power (W)',
        datasets: [
            { key: 'work',  label: 'W (J)',  color: '#34d399' },
            { key: 'power', label: 'P (W)',  color: '#f59e0b' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:       0,
    _x:       0,     // position (m)
    _v:       0,     // velocity (m/s)
    _W:       0,     // cumulative work (J)
    _fxHist:  [],    // [{x, F_applied}] for F-x chart
    _params:  null,

    reset(params) {
        this._params = params;
        this._t      = 0;
        this._x      = 0;
        this._v      = 0;
        this._W      = 0;
        this._fxHist = [];
    },

    update(dt, params) {
        this._params = params;
        const { forceAngle, mass, friction } = params;
        const cosTheta = Math.cos(degToRad(forceAngle));

        const F_app   = computeForce(this._x, params);
        const F_along = F_app * cosTheta;
        const F_fric  = friction * mass * G * Math.sign(this._v || 1);
        const F_net   = F_along - F_fric;

        const a       = F_net / mass;
        this._v      += a * dt;
        const dx      = this._v * dt;
        this._x      += dx;
        this._W      += F_along * dx;    // Riemann sum
        this._t      += dt;

        const P = F_along * this._v;

        // Record F-x history (cap at 400 samples)
        this._fxHist.push({ x: this._x, F: F_along });
        if (this._fxHist.length > 400) this._fxHist.shift();

        // Wrap position at track end
        if (this._x > TRACK_LEN) { this._x = 0; this._v = 0; }
        if (this._x < 0)         { this._x = 0; this._v = 0; }

        return {
            t:     this._t,
            work:  parseFloat(this._W.toFixed(3)),
            power: parseFloat(P.toFixed(2)),
            done:  false,
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        if (!this._params) return;
        const { forceMag, forceMode, forceAngle, mass, friction } = this._params;
        const cosTheta = Math.cos(degToRad(forceAngle));
        const PPM      = (w * 0.76) / TRACK_LEN;  // pixels per meter

        // Layout
        const trackY  = h * 0.50;
        const trackX0 = w * 0.10;
        const trackX1 = trackX0 + TRACK_LEN * PPM;
        const blockW  = 40, blockH = 28;

        // ── F-x chart area (bottom 30%) ───────────────────
        const chartY0 = h * 0.68;
        const chartH  = h * 0.26;
        const chartX0 = trackX0;
        const chartXW = trackX1 - trackX0;

        ctx.fillStyle = 'rgba(15,23,42,0.6)';
        ctx.fillRect(chartX0, chartY0, chartXW, chartH);
        ctx.strokeStyle = 'rgba(100,116,139,0.25)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(chartX0, chartY0, chartXW, chartH);

        // Axis labels
        ctx.fillStyle = '#64748b';
        ctx.font      = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('x (m)', chartX0 + chartXW / 2, chartY0 + chartH + 12);
        ctx.save();
        ctx.translate(chartX0 - 12, chartY0 + chartH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('F (N)', 0, 0);
        ctx.restore();
        ctx.textAlign = 'left';

        // Draw F(x) curve
        const F_max = forceMag || 1;
        const yScale = (chartH * 0.42) / Math.max(F_max, 1);
        const axisY  = chartY0 + chartH / 2;

        // Shaded area
        if (this._fxHist.length > 1) {
            ctx.beginPath();
            ctx.moveTo(chartX0, axisY);
            for (const p of this._fxHist) {
                const px = chartX0 + (p.x / TRACK_LEN) * chartXW;
                const py = axisY - p.F * yScale;
                ctx.lineTo(px, py);
            }
            const lastPX = chartX0 + (this._fxHist[this._fxHist.length - 1].x / TRACK_LEN) * chartXW;
            ctx.lineTo(lastPX, axisY);
            ctx.closePath();
            ctx.fillStyle = 'rgba(52,211,153,0.18)';
            ctx.fill();

            // F(x) line
            ctx.beginPath();
            for (let i = 0; i < this._fxHist.length; i++) {
                const p  = this._fxHist[i];
                const px = chartX0 + (p.x / TRACK_LEN) * chartXW;
                const py = axisY - p.F * yScale;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        // Zero axis
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(chartX0, axisY); ctx.lineTo(chartX0 + chartXW, axisY); ctx.stroke();

        // Work label inside chart
        ctx.fillStyle = '#34d399';
        ctx.font      = '10px Inter, sans-serif';
        ctx.fillText(`W = ${this._W.toFixed(2)} J`, chartX0 + 4, chartY0 + 12);

        // ── Track ─────────────────────────────────────────
        ctx.fillStyle   = '#1e293b';
        ctx.fillRect(trackX0, trackY, TRACK_LEN * PPM, 10);
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(trackX0, trackY, TRACK_LEN * PPM, 10);

        // Track ruler ticks
        for (let m = 0; m <= TRACK_LEN; m++) {
            const tx = trackX0 + m * PPM;
            ctx.strokeStyle = 'rgba(100,116,139,0.4)';
            ctx.lineWidth   = 1;
            ctx.beginPath(); ctx.moveTo(tx, trackY + 10); ctx.lineTo(tx, trackY + 16); ctx.stroke();
            ctx.fillStyle = '#475569'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`${m}`, tx, trackY + 25);
        }
        ctx.textAlign = 'left';

        // ── Block ─────────────────────────────────────────
        const blockX = trackX0 + this._x * PPM - blockW / 2;
        const blockY = trackY - blockH;
        const blkGrd = ctx.createLinearGradient(blockX, blockY, blockX, blockY + blockH);
        blkGrd.addColorStop(0, '#6d28d9');
        blkGrd.addColorStop(1, '#4c1d95');
        ctx.fillStyle   = blkGrd;
        rrect(ctx, blockX, blockY, blockW, blockH, 4); ctx.fill();
        ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.5; ctx.stroke();

        // Mass label
        ctx.fillStyle = '#e2e8f0'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${mass}kg`, blockX + blockW / 2, blockY + blockH / 2 + 4);
        ctx.textAlign = 'left';

        // ── Force vector ──────────────────────────────────
        const F_cur    = computeForce(this._x, this._params);
        const F_scale  = 0.25;
        const arrowLen = Math.abs(F_cur * cosTheta) * F_scale;
        const arrowAngle = degToRad(forceAngle);
        drawVector(ctx,
            blockX + blockW / 2, blockY + blockH / 2,
            F_cur * cosTheta, -F_cur * Math.sin(arrowAngle),
            F_scale, VECTOR_COLORS.force,
            `F=${F_cur.toFixed(1)} N`,
            { invertY: false, minPx: 5 }
        );

        // ── Info overlay ──────────────────────────────────
        const modeNames = ['Constant', 'Linear', 'Sinusoidal'];
        ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(`Mode: ${modeNames[Math.round(this._params.forceMode)]}`, 14, 26);
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`θ = ${forceAngle}°   cos θ = ${cosTheta.toFixed(2)}   μ = ${friction}`, 14, 44);
        ctx.fillText(`x = ${this._x.toFixed(2)} m   v = ${this._v.toFixed(2)} m/s`, 14, 60);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`P = ${(F_cur * cosTheta * this._v).toFixed(1)} W`, 14, 76);

        ctx.fillStyle = '#475569'; ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24'; ctx.font = '10px monospace';
            ctx.fillText(`x=${this._x.toFixed(2)} v=${this._v.toFixed(2)} W=${this._W.toFixed(2)}`, 8, h - 30);
        }
    },
};

export default sim;
