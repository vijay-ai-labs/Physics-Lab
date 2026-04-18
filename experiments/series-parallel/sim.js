/* ============================================================
   Current in Series & Parallel Circuits — sim.js
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';

const sim = {
    name: 'Series & Parallel Circuits',


    objective: 'What is the total resistance in series vs parallel?',
    defaults: { voltage: 12, r1: 10, r2: 20, r3: 30, mode: 0 },

    controls: [
        { type: 'slider', key: 'voltage', label: 'Voltage (V)', min: 1, max: 50, step: 1, tooltip: 'Supply voltage of the battery driving the circuit (in Volts).' },
        { type: 'slider', key: 'r1', label: 'R₁ (Ω)', min: 1, max: 100, step: 1, tooltip: 'Resistance of the first resistor in Ohms.' },
        { type: 'slider', key: 'r2', label: 'R₂ (Ω)', min: 1, max: 100, step: 1, tooltip: 'Resistance of the second resistor in Ohms.' },
        { type: 'slider', key: 'r3', label: 'R₃ (Ω)', min: 1, max: 100, step: 1, tooltip: 'Resistance of the third resistor in Ohms.' },
        { type: 'slider', key: 'mode', label: 'Mode (0=Series, 1=Parallel)', min: 0, max: 1, step: 1, tooltip: 'Switch between series (0) and parallel (1) configuration. In series, R_total = R1+R2+R3. In parallel, 1/R_total = 1/R1+1/R2+1/R3.' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Current (A)',
        datasets: [
            { key: 'current', label: 'Total Current', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: { voltage: 12, r1: 10, r2: 20, r3: 30, mode: 0 },
    _electrons: [],
    _done: false,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._electrons = [];
        this._done = false;
        for (let i = 0; i < 20; i++) {
            this._electrons.push({ pos: Math.random(), branch: Math.floor(Math.random() * 3) });
        }
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { voltage, r1, r2, r3, mode } = this._params;

        let rTotal, current;
        if (mode === 0) {
            rTotal = r1 + r2 + r3;
        } else {
            rTotal = 1 / (1 / r1 + 1 / r2 + 1 / r3);
        }
        current = voltage / rTotal;

        // Animate electrons
        const speed = current * 0.02;
        this._electrons.forEach(e => {
            e.pos += speed * dt;
            if (e.pos > 1) e.pos -= 1;
        });

        if (this._t > 10) this._done = true;
        return { t: this._t, current, done: this._done };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { voltage, r1, r2, r3, mode } = this._params;
        const isSeries = mode === 0;

        if (isSeries) {
            this._drawSeriesCircuit(ctx, w, h, voltage, r1, r2, r3);
        } else {
            this._drawParallelCircuit(ctx, w, h, voltage, r1, r2, r3);
        }

        // Info panel
        let rTotal, current;
        if (isSeries) {
            rTotal = r1 + r2 + r3;
        } else {
            rTotal = 1 / (1 / r1 + 1 / r2 + 1 / r3);
        }
        current = voltage / rTotal;

        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Mode: ${isSeries ? 'SERIES' : 'PARALLEL'}`, 12, h - 50);
        ctx.fillText(`R_total = ${rTotal.toFixed(2)}Ω   |   I = ${current.toFixed(3)}A   |   V = ${voltage}V`, 12, h - 30);
        ctx.fillText(`P = ${(voltage * current).toFixed(2)}W`, 12, h - 12);
    },

    _drawSeriesCircuit(ctx, w, h, V, r1, r2, r3) {
        const cx = w / 2, cy = h / 2;
        const boxW = w * 0.7, boxH = h * 0.5;
        const left = cx - boxW / 2, top = cy - boxH / 2;
        const right = cx + boxW / 2, bottom = cy + boxH / 2;

        // Main wire loop
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.lineTo(left, top);
        ctx.stroke();

        // Battery (top-left)
        this._drawBattery(ctx, left + 30, top, V);

        // 3 resistors on top wire
        const spacing = boxW / 4;
        this._drawResistor(ctx, left + spacing, top, `R₁=${r1}Ω`, '#ef4444');
        this._drawResistor(ctx, left + spacing * 2, top, `R₂=${r2}Ω`, '#f59e0b');
        this._drawResistor(ctx, left + spacing * 3, top, `R₃=${r3}Ω`, '#10b981');

        // Electrons
        const rTotal = r1 + r2 + r3;
        const current = V / rTotal;
        ctx.fillStyle = hexToRgba('#38bdf8', 0.9);
        this._electrons.forEach(e => {
            const p = e.pos;
            let ex, ey;
            const perim = 2 * (boxW + boxH);
            const d = p * perim;
            if (d < boxW) { ex = left + d; ey = top; }
            else if (d < boxW + boxH) { ex = right; ey = top + (d - boxW); }
            else if (d < 2 * boxW + boxH) { ex = right - (d - boxW - boxH); ey = bottom; }
            else { ex = left; ey = bottom - (d - 2 * boxW - boxH); }
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    _drawParallelCircuit(ctx, w, h, V, r1, r2, r3) {
        const cx = w / 2, cy = h / 2;
        const boxW = w * 0.6, boxH = h * 0.6;
        const left = cx - boxW / 2, right = cx + boxW / 2;
        const topY = cy - boxH / 2, bottomY = cy + boxH / 2;
        const midX = cx;

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;

        // Left main wire
        ctx.beginPath();
        ctx.moveTo(left, topY); ctx.lineTo(left, bottomY); ctx.stroke();
        // Right main wire
        ctx.beginPath();
        ctx.moveTo(right, topY); ctx.lineTo(right, bottomY); ctx.stroke();
        // Top wire
        ctx.beginPath();
        ctx.moveTo(left, topY); ctx.lineTo(right, topY); ctx.stroke();
        // Bottom wire
        ctx.beginPath();
        ctx.moveTo(left, bottomY); ctx.lineTo(right, bottomY); ctx.stroke();

        // Battery on left
        this._drawBattery(ctx, left, cy, V);

        // 3 parallel branches
        const branchY = [topY + boxH * 0.2, cy, topY + boxH * 0.8];
        const colors = ['#ef4444', '#f59e0b', '#10b981'];
        const resistances = [r1, r2, r3];
        const labels = ['R₁', 'R₂', 'R₃'];

        branchY.forEach((by, i) => {
            ctx.strokeStyle = hexToRgba(colors[i], 0.4);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(left, by);
            ctx.lineTo(right, by);
            ctx.stroke();
            this._drawResistor(ctx, midX, by, `${labels[i]}=${resistances[i]}Ω`, colors[i]);
        });

        // Electrons
        ctx.fillStyle = hexToRgba('#38bdf8', 0.9);
        this._electrons.forEach(e => {
            const by = branchY[e.branch % 3];
            const ex = left + e.pos * (right - left);
            ctx.beginPath();
            ctx.arc(ex, by, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    _drawBattery(ctx, x, y, V) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`${V}V`, x - 8, y - 18);
    },

    _drawResistor(ctx, x, y, label, color) {
        const rw = 40, rh = 14;
        ctx.fillStyle = hexToRgba(color, 0.15);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x - rw / 2, y - rh / 2, rw, rh, 4);
        ctx.fill();
        ctx.stroke();
        // Zigzag
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const steps = 6;
        const sw = rw / steps;
        for (let i = 0; i < steps; i++) {
            const sx = x - rw / 2 + i * sw;
            ctx.lineTo(sx + sw / 2, y + (i % 2 === 0 ? -4 : 4));
        }
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(label, x - 25, y + rh / 2 + 14);
    },
};

export default sim;
