/* FILE: experiments/intermediate/pressure-vs-area-bed-of-nails/sim.js
   ============================================================
   Pressure vs Area — Bed of Nails Concept
   ============================================================
   Physics:
     P = F / A_total = F / (numNails × A_tip)
     A_tip = 1e-4 m²  (1 cm² per nail tip, fixed)
     F = mass × g  (weight of person/block)
     Force can also be set directly.

   Visual:
     Grid of nails drawn on a board. Each nail tip is colored
     blue (low P) → red (high P) using HSL interpolation.
     A block/person sits above, pressing down.
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

const A_TIP = 1e-4;   // m² per nail tip (1 cm²) — fixed
const G     = 9.81;

// Pressure color: blue (safe) → yellow → red (dangerous)
// safe < 50 kPa, danger > 300 kPa
function pressureColor(P_kPa) {
    const t = clamp(P_kPa / 300, 0, 1);
    const h = Math.round(240 - t * 240); // 240=blue, 0=red
    const s = 80 + t * 20;
    const l = 35 + (1 - t) * 25;
    return `hsl(${h},${s}%,${l}%)`;
}

const sim = {
    name: 'Pressure vs Area (Bed of Nails)',

    objective: 'How does contact area affect pressure on a surface?',
    defaults: {
        force:      686,   // N (≈ 70 kg person)
        personMass: 70,    // kg — used to compute weight
        numNails:   100,   // integer
        useMass:    true,  // derive force from mass if true
    },

    controls: [
        { type: 'slider', key: 'personMass', label: 'Person Mass (kg)',
          min: 10, max: 200, step: 5,
          tooltip: 'Mass of the person lying on the nails. Weight = mass × g.' },
        { type: 'slider', key: 'force', label: 'Applied Force (N)',
          min: 10, max: 2000, step: 10,
          tooltip: 'Direct force override (used when "Use Mass" toggle is off).' },
        { type: 'slider', key: 'numNails', label: 'Number of Nails',
          min: 1, max: 500, step: 1,
          tooltip: 'Total nails in the board. More nails → lower pressure per tip.' },
        { type: 'toggle', key: 'useMass', label: 'Derive Force from Mass' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Pressure (kPa)',
        datasets: [
            { key: 'pressureKPa', label: 'P per nail (kPa)',  color: '#f87171' },
            { key: 'totalAreaCm2', label: 'Total area (cm²)', color: '#38bdf8' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:      0,
    _params: null,
    _bobY:   0,   // small animation offset for pressing action

    reset(params) {
        this._params = params;
        this._t      = 0;
        this._bobY   = 0;
    },

    update(dt, params) {
        this._params = params;
        this._t     += dt;
        this._bobY   = Math.sin(this._t * 1.2) * 3; // gentle breathing animation

        const F    = params.useMass ? params.personMass * G : params.force;
        const n    = Math.max(1, Math.round(params.numNails));
        const P    = F / (n * A_TIP);      // Pa
        const P_kPa = P / 1000;
        const A_cm2 = n * A_TIP * 1e4;    // cm²

        return {
            t:            this._t,
            pressureKPa:  parseFloat(P_kPa.toFixed(2)),
            totalAreaCm2: parseFloat(A_cm2.toFixed(1)),
            done:         false,
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        if (!this._params) return;
        const { personMass, force, numNails, useMass } = this._params;
        const F   = useMass ? personMass * G : force;
        const n   = Math.max(1, Math.round(numNails));
        const P   = F / (n * A_TIP);
        const P_kPa = P / 1000;

        // ── Layout ────────────────────────────────────────
        const boardX  = w * 0.08;
        const boardW  = w * 0.84;
        const boardY  = h * 0.55;
        const boardH  = 18;
        const nailLen = 32;

        // ── Person / block above ──────────────────────────
        const blockW  = boardW * 0.6;
        const blockH  = 50;
        const blockX  = boardX + (boardW - blockW) / 2;
        const blockY  = boardY - nailLen - blockH - 8 + this._bobY;

        // person silhouette (simple rectangle body)
        const grd = ctx.createLinearGradient(blockX, blockY, blockX, blockY + blockH);
        grd.addColorStop(0, '#334155');
        grd.addColorStop(1, '#1e293b');
        ctx.fillStyle = grd;
        rrect(ctx, blockX, blockY, blockW, blockH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.3)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Person icon (simple head + body lines)
        const cx = blockX + blockW / 2;
        ctx.fillStyle = '#94a3b8';
        ctx.font      = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧍', cx, blockY + 38);
        ctx.textAlign = 'left';

        // Force arrow
        const arrowX = blockX + blockW + 12;
        ctx.fillStyle   = '#ef4444';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(arrowX, blockY + 6);
        ctx.lineTo(arrowX, blockY + blockH - 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrowX - 5, blockY + blockH - 10);
        ctx.lineTo(arrowX, blockY + blockH - 2);
        ctx.lineTo(arrowX + 5, blockY + blockH - 10);
        ctx.fill();
        ctx.fillStyle = '#f87171';
        ctx.font      = '10px Inter, sans-serif';
        ctx.fillText(`F=${F.toFixed(0)} N`, arrowX + 8, blockY + blockH / 2 + 4);

        // ── Board ─────────────────────────────────────────
        ctx.fillStyle = '#334155';
        ctx.fillRect(boardX, boardY, boardW, boardH);
        ctx.strokeStyle = 'rgba(148,163,184,0.2)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(boardX, boardY, boardW, boardH);

        // ── Nails ─────────────────────────────────────────
        const cols   = Math.min(n, 40);   // display max 40 columns
        const rows   = Math.ceil(n / cols);
        const nail_dx = boardW / (cols + 1);
        const nail_dy = nailLen / Math.max(rows, 1);

        for (let i = 0; i < n && i < cols * rows; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const nx  = boardX + nail_dx * (col + 1);
            const nailTopY = boardY - nailLen + row * nail_dy;

            // Nail shaft
            ctx.strokeStyle = 'rgba(148,163,184,0.7)';
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(nx, boardY);
            ctx.lineTo(nx, boardY - nailLen);
            ctx.stroke();

            // Nail tip (color-coded by pressure)
            ctx.beginPath();
            ctx.arc(nx, boardY - nailLen, 3, 0, Math.PI * 2);
            ctx.fillStyle = pressureColor(P_kPa);
            ctx.fill();
        }

        // ── Pressure heatmap bar on board ─────────────────
        const heatGrd = ctx.createLinearGradient(boardX, 0, boardX + boardW, 0);
        heatGrd.addColorStop(0,   pressureColor(P_kPa));
        heatGrd.addColorStop(0.5, pressureColor(P_kPa * 0.95));
        heatGrd.addColorStop(1,   pressureColor(P_kPa));
        ctx.fillStyle = heatGrd;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(boardX, boardY, boardW, boardH);
        ctx.globalAlpha = 1;

        // ── Pressure color scale legend ────────────────────
        const legX = w - 30, legY = h * 0.25, legH = h * 0.35;
        for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            ctx.fillStyle = pressureColor(t * 300);
            ctx.fillRect(legX, legY + legH * (1 - t) - 2, 14, legH / 30 + 2);
        }
        ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(legX, legY, 14, legH);
        ctx.fillStyle = '#94a3b8';
        ctx.font      = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('300 kPa', legX + 18, legY + 6);
        ctx.fillText('150 kPa', legX + 18, legY + legH / 2 + 4);
        ctx.fillText('0 kPa',   legX + 18, legY + legH + 4);

        // ── Info overlay ──────────────────────────────────
        ctx.fillStyle = '#e2e8f0';
        ctx.font      = 'bold 14px Inter, sans-serif';
        ctx.fillText(`P = ${P_kPa.toFixed(1)} kPa per nail`, 14, 28);
        ctx.fillStyle = '#64748b';
        ctx.font      = '12px Inter, sans-serif';
        ctx.fillText(`F = ${F.toFixed(0)} N   n = ${n}   A = ${(n * A_TIP * 1e4).toFixed(0)} cm²`, 14, 48);

        const safe = P_kPa < 100;
        ctx.fillStyle = safe ? '#34d399' : P_kPa < 300 ? '#fbbf24' : '#f87171';
        ctx.font      = 'bold 11px Inter, sans-serif';
        ctx.fillText(safe ? '✓ SAFE' : P_kPa < 300 ? '⚠ CAUTION' : '✗ DANGEROUS', 14, 68);

        ctx.fillStyle = '#475569';
        ctx.font      = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            ctx.fillText(`P=${P_kPa.toFixed(1)}kPa n=${n} F=${F.toFixed(0)}N`, 8, h - 30);
        }
    },
};

export default sim;
