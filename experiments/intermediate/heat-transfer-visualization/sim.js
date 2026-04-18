/* FILE: experiments/intermediate/heat-transfer-visualization/sim.js
   ============================================================
   Heat Transfer Visualization — 1-D Conduction
   ============================================================
   Physics:
     Explicit finite-difference heat equation:
       T[i]^{n+1} = T[i]^n + α·dt_sub/dx² · (T[i+1]-2T[i]+T[i-1])
     α = k_norm × 1e-3  (normalized thermal diffusivity m²/s)
     Boundary conditions: T[0]=T_left, T[N-1]=T_right (fixed ends)
     Stability: dt_sub ≤ 0.49·dx²/α  → auto-substepping

   Interaction:
     Click on rod to drop a hot spot (set local T to hotSpotT).
   ============================================================ */

import { clamp, hsl, drawGrid } from '../../../js/utils.js';

const N  = 80;        // grid points
const L  = 1.0;       // rod length (m)
const DX = L / (N - 1);

// Temperature → colour: blue (cold) → cyan → yellow → red (hot)
function tempColor(T, T_min, T_max) {
    const t = clamp((T - T_min) / Math.max(T_max - T_min, 1), 0, 1);
    // hue: 240 (blue) → 0 (red) as t goes 0→1
    const hue = Math.round(240 - t * 240);
    const sat = 75 + t * 20;
    const lig = 28 + t * 38;
    return hsl(hue, sat, lig);
}

const sim = {
    name: 'Heat Transfer Visualization',

    objective: 'How does heat spread through different materials?',
    defaults: {
        conductivity: 5,      // k_norm (1–20); maps to α = k×1e-3 m²/s
        T_left:       100,    // °C — left boundary temperature
        T_right:      20,     // °C — right boundary temperature
        timeScale:    5,      // simulation speed multiplier
        hotSpotT:     200,    // °C — temperature of dropped hot spot
    },

    controls: [
        { type: 'slider', key: 'conductivity', label: 'Conductivity k (norm)',
          min: 1, max: 20, step: 0.5,
          tooltip: 'Normalized thermal conductivity. Higher → faster heat spread.' },
        { type: 'slider', key: 'T_left',  label: 'Left Boundary T (°C)',
          min: -50, max: 500, step: 5,
          tooltip: 'Fixed temperature at the left end of the rod.' },
        { type: 'slider', key: 'T_right', label: 'Right Boundary T (°C)',
          min: -50, max: 500, step: 5,
          tooltip: 'Fixed temperature at the right end of the rod.' },
        { type: 'slider', key: 'timeScale', label: 'Time Scale (×)',
          min: 1, max: 20, step: 1,
          tooltip: 'Speed up the simulation to see long-term diffusion.' },
        { type: 'slider', key: 'hotSpotT', label: 'Hotspot Temperature (°C)',
          min: -50, max: 600, step: 10,
          tooltip: 'Temperature injected when you click on the rod.' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Temperature (°C)',
        datasets: [
            { key: 'T_mid',   label: 'T at midpoint (°C)',  color: '#f59e0b' },
            { key: 'T_left_out', label: 'T at x=0.1m (°C)', color: '#38bdf8' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:     0,
    _T:     new Float64Array(N),
    _params: null,
    _canvas: null,
    _rodX0: 0, _rodX1: 0, _rodY0: 0, _rodY1: 0, // canvas coords of rod

    reset(params) {
        this._params = params;
        this._t      = 0;
        // Linear initial condition between T_left and T_right
        for (let i = 0; i < N; i++) {
            this._T[i] = params.T_left + (params.T_right - params.T_left) * (i / (N - 1));
        }
    },

    initCanvas(canvas) {
        this._canvas = canvas;
        canvas.addEventListener('click', (e) => {
            if (!this._params) return;
            const rect = canvas.getBoundingClientRect();
            const dpr  = window.devicePixelRatio || 1;
            const cx   = (e.clientX - rect.left) * dpr;
            const cy   = (e.clientY - rect.top)  * dpr;
            const w    = canvas.width;
            const h    = canvas.height;
            const rodX0 = w * 0.08;
            const rodW  = w * 0.84;
            const rodY0 = h * 0.38;
            const rodH  = h * 0.18;

            if (cx >= rodX0 && cx <= rodX0 + rodW && cy >= rodY0 && cy <= rodY0 + rodH) {
                const frac = (cx - rodX0) / rodW;
                const idx  = Math.round(frac * (N - 1));
                const span = 4; // nodes to set
                for (let di = -span; di <= span; di++) {
                    const ii = clamp(idx + di, 1, N - 2);
                    this._T[ii] = this._params.hotSpotT;
                }
            }
        });
    },

    update(dt, params) {
        this._params = params;
        const alpha   = params.conductivity * 1e-3;
        const dt_phys = dt * params.timeScale;
        const r_max   = 0.49;
        const dt_max  = r_max * DX * DX / alpha;
        const n_steps = Math.max(1, Math.ceil(dt_phys / dt_max));
        const dt_sub  = dt_phys / n_steps;
        const r       = alpha * dt_sub / (DX * DX);  // ≤ 0.49 by construction

        for (let step = 0; step < n_steps; step++) {
            const T_new = new Float64Array(N);
            for (let i = 1; i < N - 1; i++) {
                T_new[i] = this._T[i] + r * (this._T[i + 1] - 2 * this._T[i] + this._T[i - 1]);
            }
            // Enforce boundary conditions
            T_new[0]     = params.T_left;
            T_new[N - 1] = params.T_right;
            this._T      = T_new;
        }

        this._t += dt;

        return {
            t:           this._t,
            T_mid:       parseFloat(this._T[Math.floor(N / 2)].toFixed(2)),
            T_left_out:  parseFloat(this._T[Math.round(N * 0.1)].toFixed(2)),
            done:        false,
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        if (!this._params) return;
        const { T_left, T_right } = this._params;
        const T_min = Math.min(...this._T, T_left, T_right) - 5;
        const T_max = Math.max(...this._T, T_left, T_right) + 5;

        const rodX0 = w * 0.08;
        const rodW  = w * 0.84;
        const rodH  = h * 0.18;
        const rodY0 = h * 0.38;

        // ── Rod: colored segments ──────────────────────────
        const segW = rodW / (N - 1);
        for (let i = 0; i < N - 1; i++) {
            const T_avg = (this._T[i] + this._T[i + 1]) / 2;
            ctx.fillStyle = tempColor(T_avg, T_min, T_max);
            ctx.fillRect(rodX0 + i * segW, rodY0, segW + 1, rodH);
        }
        ctx.strokeStyle = 'rgba(148,163,184,0.3)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(rodX0, rodY0, rodW, rodH);

        // ── Temperature profile curve ──────────────────────
        const profileY0 = rodY0 - 8;
        const profileH  = rodH + 16;
        const yScale    = (profileH - 8) / Math.max(T_max - T_min, 1);

        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const px = rodX0 + (i / (N - 1)) * rodW;
            const py = rodY0 + rodH - (this._T[i] - T_min) * yScale * 0.4;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(253,224,71,0.8)';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // ── Heat flux arrows ──────────────────────────────
        const arrowY = rodY0 + rodH + 22;
        for (let i = 2; i < N - 2; i += 8) {
            const dT   = this._T[i + 1] - this._T[i - 1];  // forward difference ×2
            const flux = -dT / (2 * DX);   // proportional to heat flux (right = positive)
            const px   = rodX0 + (i / (N - 1)) * rodW;
            const len  = clamp(flux * 2.5, -24, 24);
            if (Math.abs(len) < 2) continue;

            const color = flux > 0 ? '#f87171' : '#38bdf8';
            ctx.strokeStyle = color;
            ctx.fillStyle   = color;
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(px, arrowY);
            ctx.lineTo(px + len, arrowY);
            ctx.stroke();
            // arrowhead
            const d = Math.sign(len);
            ctx.beginPath();
            ctx.moveTo(px + len, arrowY);
            ctx.lineTo(px + len - d * 5, arrowY - 3);
            ctx.lineTo(px + len - d * 5, arrowY + 3);
            ctx.fill();
        }

        // ── Axis labels (x position) ───────────────────────
        ctx.fillStyle = '#64748b'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('x = 0', rodX0, rodY0 + rodH + 52);
        ctx.fillText(`x = ${L} m`, rodX0 + rodW, rodY0 + rodH + 52);
        ctx.textAlign = 'left';

        // Boundary temp labels
        ctx.fillStyle = tempColor(T_left, T_min, T_max);
        ctx.font      = 'bold 11px Inter, sans-serif';
        ctx.fillText(`${T_left}°C`, rodX0 - 2, rodY0 - 6);
        ctx.fillStyle = tempColor(T_right, T_min, T_max);
        ctx.textAlign = 'right';
        ctx.fillText(`${T_right}°C`, rodX0 + rodW + 2, rodY0 - 6);
        ctx.textAlign = 'left';

        // ── Colour scale legend ────────────────────────────
        const legX = w - 28, legY = h * 0.06, legH = h * 0.28;
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            ctx.fillStyle = hsl(Math.round(240 - t * 240), 85, 45);
            ctx.fillRect(legX, legY + legH * (1 - t) - 1, 12, legH / 40 + 2);
        }
        ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(legX, legY, 12, legH);
        ctx.fillStyle = '#94a3b8'; ctx.font = '9px Inter, sans-serif';
        ctx.fillText(`${T_max.toFixed(0)}°`, legX + 16, legY + 6);
        ctx.fillText(`${T_min.toFixed(0)}°`, legX + 16, legY + legH + 4);

        // ── Info overlay ──────────────────────────────────
        ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(`T_mid = ${this._T[Math.floor(N / 2)].toFixed(1)} °C`, 14, 28);
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`k_norm = ${this._params.conductivity}   ×${this._params.timeScale} speed`, 14, 46);
        ctx.fillText(`Click on rod to drop a hot spot`, 14, h - 14);

        ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
        ctx.fillText(`t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24'; ctx.font = '10px monospace';
            ctx.fillText(`T[0]=${this._T[0].toFixed(1)} T[mid]=${this._T[40].toFixed(1)} T[N]=${this._T[N-1].toFixed(1)}`, 8, h - 30);
        }
    },
};

export default sim;
