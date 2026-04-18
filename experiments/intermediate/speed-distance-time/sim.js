/* FILE: experiments/intermediate/speed-distance-time/sim.js
   ============================================================
   Speed = Distance / Time
   ============================================================
   Physics:
     v += a · dt    (semi-implicit Euler)
     x += v · dt
     When x > TRACK_LEN: wrap to 0 and count laps.

   Stopwatch markers:
     Mark A & Mark B: stored as canvas buttons injected via
     onEngineReady. Clicking "Mark A" records (x_A, t_A);
     clicking "Mark B" records (x_B, t_B).
     Average speed = |x_B − x_A| / (t_B − t_A).
   ============================================================ */

import { clamp, drawGrid } from '../../../js/utils.js';

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

const TRACK_LEN = 100;   // virtual metres
const G         = 9.81;

const sim = {
    name: 'Speed = Distance / Time',

    objective: 'What is the speed when distance and time are known?',
    defaults: {
        initSpeed:    15,    // m/s
        accel:        2,     // m/s²
        maxSpeed:     60,    // m/s — clamp
    },

    controls: [
        { type: 'slider', key: 'initSpeed', label: 'Initial Speed (m/s)',
          min: 0, max: 50, step: 1,
          tooltip: 'Speed when the simulation starts (or after Reset).' },
        { type: 'slider', key: 'accel',     label: 'Acceleration (m/s²)',
          min: -10, max: 20, step: 0.5,
          tooltip: 'Positive = speeding up; negative = braking.' },
        { type: 'slider', key: 'maxSpeed',  label: 'Max Speed (m/s)',
          min: 5, max: 120, step: 5,
          tooltip: 'Clamp speed to this maximum.' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Position (m) / Speed (m/s)',
        datasets: [
            { key: 'position', label: 'x (m)',   color: '#38bdf8' },
            { key: 'speed',    label: 'v (m/s)', color: '#f59e0b' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:       0,
    _x:       0,      // position (m)
    _v:       0,      // velocity (m/s)
    _lap:     0,      // lap count (wraps)
    _markA:   null,   // {x, t} or null
    _markB:   null,
    _engine:  null,
    _params:  null,
    // Stopwatch
    _stopElapsed: 0,  // elapsed time
    _stopRunning: false,

    reset(params) {
        this._params  = params;
        this._t       = 0;
        this._x       = 0;
        this._v       = params.initSpeed;
        this._lap     = 0;
        this._markA   = null;
        this._markB   = null;
        this._stopElapsed = 0;
        this._stopRunning = false;
    },

    onEngineReady(engine) {
        this._engine = engine;
    },

    initCanvas(canvas) {
        // Mark buttons drawn on canvas; clicks handled here
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const dpr  = window.devicePixelRatio || 1;
            const cx   = (e.clientX - rect.left) * dpr;
            const cy   = (e.clientY - rect.top)  * dpr;
            const w = canvas.width, h = canvas.height;

            // Mark A button area (bottom-left)
            const btnAx = 14, btnAy = h - 55, btnW = 80, btnH = 24;
            if (cx >= btnAx && cx <= btnAx + btnW && cy >= btnAy && cy <= btnAy + btnH) {
                this._markA = { x: this._x + this._lap * TRACK_LEN, t: this._t };
            }
            // Mark B button area
            const btnBx = 104, btnBy = h - 55;
            if (cx >= btnBx && cx <= btnBx + btnW && cy >= btnBy && cy <= btnBy + btnH) {
                this._markB = { x: this._x + this._lap * TRACK_LEN, t: this._t };
            }
            // Stopwatch button
            const swx = 194, swy = h - 55;
            if (cx >= swx && cx <= swx + 100 && cy >= swy && cy <= swy + btnH) {
                this._stopRunning = !this._stopRunning;
                // _stopElapsed is incremented each frame in update() while _stopRunning is true
                // No additional accumulation needed here
            }
        });
    },

    update(dt, params) {
        this._params = params;

        this._v = clamp(this._v + params.accel * dt, -params.maxSpeed, params.maxSpeed);
        if (this._v < 0) this._v = 0;  // no reverse

        this._x += this._v * dt;
        if (this._x > TRACK_LEN) { this._x -= TRACK_LEN; this._lap++; }
        this._t += dt;

        if (this._stopRunning) {
            this._stopElapsed = this._stopElapsed + dt;
        }

        return {
            t:        this._t,
            position: parseFloat(this._x.toFixed(2)),
            speed:    parseFloat(this._v.toFixed(2)),
            done:     false,
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        if (!this._params) return;

        const { maxSpeed } = this._params;
        const PPM    = (w * 0.80) / TRACK_LEN;   // pixels per metre
        const trackY = h * 0.48;
        const trackX0 = w * 0.08;
        const trackX1 = trackX0 + TRACK_LEN * PPM;

        // ── Track ──────────────────────────────────────────
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(trackX0, trackY, TRACK_LEN * PPM, 14);
        // lane markings
        ctx.strokeStyle = 'rgba(253,224,71,0.5)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([16, 10]);
        ctx.beginPath(); ctx.moveTo(trackX0, trackY + 7); ctx.lineTo(trackX1, trackY + 7); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 1;
        ctx.strokeRect(trackX0, trackY, TRACK_LEN * PPM, 14);

        // Ruler ticks (every 10 m)
        ctx.fillStyle = '#475569'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
        for (let m = 0; m <= TRACK_LEN; m += 10) {
            const tx = trackX0 + m * PPM;
            ctx.strokeStyle = 'rgba(100,116,139,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tx, trackY + 14); ctx.lineTo(tx, trackY + 20); ctx.stroke();
            ctx.fillText(`${m}m`, tx, trackY + 30);
        }
        ctx.textAlign = 'left';

        // ── Marker flags ──────────────────────────────────
        const drawFlag = (marker, label, color) => {
            if (!marker) return;
            const fx = trackX0 + (marker.x % TRACK_LEN) * PPM;
            ctx.strokeStyle = color; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(fx, trackY - 28); ctx.lineTo(fx, trackY); ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(fx, trackY - 28); ctx.lineTo(fx + 14, trackY - 22); ctx.lineTo(fx, trackY - 16); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Inter, sans-serif';
            ctx.fillText(label, fx + 2, trackY - 20);
        };
        drawFlag(this._markA, 'A', '#10b981');
        drawFlag(this._markB, 'B', '#f59e0b');

        // ── Moving car ────────────────────────────────────
        const carX  = trackX0 + this._x * PPM;
        const carW  = 36, carH = 20;
        const carY  = trackY - carH;

        const carGrd = ctx.createLinearGradient(carX - carW / 2, carY, carX - carW / 2, carY + carH);
        carGrd.addColorStop(0, '#7c3aed');
        carGrd.addColorStop(1, '#4c1d95');
        ctx.fillStyle = carGrd;
        rrect(ctx, carX - carW / 2, carY, carW, carH, 4);
        ctx.fill();
        ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1;
        ctx.stroke();

        // Wheels
        const wheelY = carY + carH;
        for (const wx of [carX - carW * 0.3, carX + carW * 0.3]) {
            ctx.beginPath(); ctx.arc(wx, wheelY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b'; ctx.fill();
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
        }

        // Speed trail
        ctx.strokeStyle = 'rgba(124,58,237,0.3)'; ctx.lineWidth = 3;
        if (this._v > 1) {
            ctx.beginPath();
            ctx.moveTo(carX - carW / 2, carY + carH / 2);
            ctx.lineTo(Math.max(trackX0, carX - carW / 2 - this._v * 1.5), carY + carH / 2);
            ctx.stroke();
        }

        // ── Speedometer gauge ─────────────────────────────
        const gaugeX  = w - 80;
        const gaugeY  = 55;
        const gaugeR  = 45;
        const minA    = Math.PI * 0.75;
        const maxA    = Math.PI * 2.25;
        const angRange = maxA - minA;
        const vFrac    = clamp(this._v / maxSpeed, 0, 1);

        ctx.strokeStyle = 'rgba(100,116,139,0.3)';
        ctx.lineWidth   = 8;
        ctx.beginPath(); ctx.arc(gaugeX, gaugeY, gaugeR, minA, maxA); ctx.stroke();

        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth   = 8;
        ctx.beginPath(); ctx.arc(gaugeX, gaugeY, gaugeR, minA, minA + vFrac * angRange); ctx.stroke();

        // Needle
        const needleA = minA + vFrac * angRange;
        ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gaugeX, gaugeY);
        ctx.lineTo(gaugeX + Math.cos(needleA) * (gaugeR - 6), gaugeY + Math.sin(needleA) * (gaugeR - 6));
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${this._v.toFixed(1)}`, gaugeX, gaugeY + 8);
        ctx.font = '9px Inter, sans-serif'; ctx.fillText('m/s', gaugeX, gaugeY + 20);
        ctx.textAlign = 'left';

        // ── Average speed readout ─────────────────────────
        ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(`v_inst = ${this._v.toFixed(2)} m/s`, 14, 28);

        if (this._markA && this._markB) {
            const dx = Math.abs(this._markB.x - this._markA.x);
            const dt_m = Math.abs(this._markB.t - this._markA.t);
            const avgV = dt_m > 0.001 ? dx / dt_m : 0;
            ctx.fillStyle = '#34d399'; ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(`v_avg (A→B) = ${avgV.toFixed(2)} m/s`, 14, 48);
            ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif';
            ctx.fillText(`Δx = ${dx.toFixed(2)} m   Δt = ${dt_m.toFixed(2)} s`, 14, 64);
        }

        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`lap = ${this._lap}   x = ${this._x.toFixed(1)} m`, 14, this._markA && this._markB ? 80 : 48);

        // ── Buttons drawn on canvas ────────────────────────
        const btnDefs = [
            { label: 'Mark A', x: 14 },
            { label: 'Mark B', x: 104 },
            { label: this._stopRunning ? '⏸ Stop' : '▶ Stopwatch', x: 194 },
        ];
        const btnY = h - 55, btnH2 = 24;
        for (const btn of btnDefs) {
            const bw = btn.x === 194 ? 100 : 80;
            ctx.fillStyle   = 'rgba(30,41,59,0.85)';
            ctx.strokeStyle = 'rgba(148,163,184,0.4)';
            ctx.lineWidth   = 1;
            rrect(ctx, btn.x, btnY, bw, btnH2, 4); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e2e8f0'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + bw / 2, btnY + 16);
        }
        ctx.textAlign = 'left';

        // Stopwatch display
        const sw_t = this._stopElapsed;
        ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`⏱ ${sw_t.toFixed(2)} s`, 304, h - 42);

        ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
        ctx.fillText(`t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24'; ctx.font = '10px monospace';
            ctx.fillText(`x=${this._x.toFixed(1)} v=${this._v.toFixed(1)} lap=${this._lap}`, 8, h - 30);
        }
    },
};

export default sim;
