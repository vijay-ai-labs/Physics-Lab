/* FILE: experiments/ohms-law/sim.js
   ============================================================
   Ohm's Law Circuit — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - Added Resistance (Ω) row to the meter overlay panel so all
         four quantities (V, I, R, P) are shown simultaneously.
       - Clarified electron animation speed comment: the 0.04 factor
         is a visual scale only; actual drift velocity is ~mm/h.
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';

const sim = {
    name: "Ohm's Law Circuit",
    objective: 'What is the current (I) when voltage and resistance change?',

    defaults: { voltage: 12, resistance: 10 },

    controls: [
        { type: 'slider', key: 'voltage', label: 'Voltage (V)', min: 1, max: 50, step: 1, tooltip: 'Electrical potential difference across the circuit (in Volts). Higher voltage drives more current.' },
        { type: 'slider', key: 'resistance', label: 'Resistance (Ω)', min: 1, max: 100, step: 1, tooltip: 'Opposition to current flow in Ohms. Current = Voltage ÷ Resistance.' },
    ],

    graphConfig: {
        xAxis: 'Voltage (V)',
        yAxis: 'Current (A)',
        datasets: [
            { key: 'current', label: 'Current', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: {},
    _electrons: [],
    _plotted: new Set(),

    reset(params) {
        this._t = 0;
        this._params = { ...params };
        this._electrons = [];
        this._plotted = new Set();
        // Create electron particles along the circuit path
        for (let i = 0; i < 20; i++) {
            this._electrons.push({ progress: i / 20 });
        }
    },

    update(dt) {
        this._t += dt;
        const { voltage, resistance } = this._params;
        const current = voltage / resistance;

        // Move electrons — speed is a visual scale factor proportional to current.
        // (Real electron drift velocity is ~mm/h; this is purely for animation.)
        const speed = current * 0.04;
        this._electrons.forEach(e => {
            e.progress += speed * dt;
            if (e.progress > 1) e.progress -= 1;
        });

        // We plot V vs I step-by-step
        const vStep = Math.floor(this._t * 5);
        if (vStep <= 50 && !this._plotted.has(vStep)) {
            this._plotted.add(vStep);
            const plotV = vStep;
            return { t: plotV, x: plotV, current: plotV / resistance, done: vStep >= 50 };
        }

        return null; // no new data point this frame
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);

        const { voltage, resistance } = this._params;
        const current = voltage / resistance;
        const power = voltage * current;

        // Circuit path — rectangle
        const pad = 60;
        const cx = pad, cy = pad;
        const cw = w - pad * 2, ch = h - pad * 2;

        // Wire
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx, cy, cw, ch);

        // Battery (top side, left)
        const batX = cx + cw * 0.2;
        const batY = cy;
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(batX - 20, batY - 12, 40, 24);
        // Battery symbol
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(batX - 8, batY - 10);
        ctx.lineTo(batX - 8, batY + 10);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(batX + 4, batY - 6);
        ctx.lineTo(batX + 4, batY + 6);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`${voltage}V`, batX - 10, batY - 16);
        ctx.fillText('+  −', batX - 14, batY + 28);

        // Resistor (bottom side)
        const resX = cx + cw * 0.5;
        const resY = cy + ch;
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(resX - 30, resY - 12, 60, 24);
        // Zigzag resistor symbol
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(resX - 25, resY);
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(resX - 20 + i * 10, resY + (i % 2 === 0 ? -8 : 8));
        }
        ctx.lineTo(resX + 25, resY);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`${resistance}Ω`, resX - 12, resY - 18);

        // Electron flow
        const path = this._getCircuitPath(cx, cy, cw, ch);
        this._electrons.forEach(e => {
            const pos = this._getPointOnPath(path, e.progress);
            // Glow
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 10);
            grad.addColorStop(0, hexToRgba('#38bdf8', 0.8));
            grad.addColorStop(1, hexToRgba('#38bdf8', 0));
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            // Dot
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#7dd3fc';
            ctx.fill();
        });

        // Current direction arrow
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('I →', cx + cw + 8, cy + ch / 2);

        // Readout panel — displays V, I, R, P together
        ctx.fillStyle = hexToRgba('#1a1f36', 0.9);
        ctx.fillRect(w - 180, 12, 168, 100);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(w - 180, 12, 168, 100);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Voltage:  ${voltage.toFixed(1)} V`, w - 168, 34);
        ctx.fillText(`Current:  ${current.toFixed(3)} A`, w - 168, 52);
        ctx.fillText(`Resistance: ${resistance.toFixed(1)} Ω`, w - 168, 70);
        ctx.fillText(`Power:    ${power.toFixed(2)} W`, w - 168, 88);
        ctx.fillStyle = hexToRgba('#64748b', 0.7);
        ctx.fillText('V = I × R', w - 168, 106);
    },

    _getCircuitPath(x, y, w, h) {
        return [
            { x: x, y: y },                 // top-left
            { x: x + w, y: y },             // top-right
            { x: x + w, y: y + h },         // bottom-right
            { x: x, y: y + h },             // bottom-left
        ];
    },

    _getPointOnPath(path, progress) {
        const totalSegments = path.length;
        const segment = Math.floor(progress * totalSegments) % totalSegments;
        const segProgress = (progress * totalSegments) - segment;
        const p1 = path[segment];
        const p2 = path[(segment + 1) % totalSegments];
        return {
            x: p1.x + (p2.x - p1.x) * segProgress,
            y: p1.y + (p2.y - p1.y) * segProgress,
        };
    },
};

export default sim;
