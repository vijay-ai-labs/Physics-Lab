/* ============================================================
   Heat Flow Rate — sim.js
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';

const sim = {
    name: 'Heat Flow Rate',


    objective: 'How fast does heat transfer between two temperatures?',
    defaults: { dt: 50, k: 0.5, a: 1.0, L: 0.5 },

    controls: [
        { type: 'slider', key: 'dt', label: 'Temp Difference (ΔT in °C)', min: 10, max: 200, step: 10, tooltip: 'Temperature difference between the hot and cold sides. Larger ΔT means faster heat flow.' },
        { type: 'slider', key: 'k', label: "Thermal Conductivity (k in W/m*K)", min: 0.05, max: 400, step: 0.05, tooltip: 'How well the material conducts heat. Copper ~400, Glass ~1, Air ~0.025 W/m·K.' },
        { type: 'slider', key: 'a', label: 'Cross Sectional Area (A in m²)', min: 0.1, max: 2.0, step: 0.1, tooltip: 'Cross-sectional area of the conducting material. Larger area allows more heat to flow.' },
        { type: 'slider', key: 'L', label: 'Thickness (L in m)', min: 0.1, max: 2.0, step: 0.1, tooltip: 'Thickness of the material. Thicker material slows heat transfer (Q/t = k·A·ΔT / L).' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Heat Transfer Rate (W)',
        datasets: [
            { key: 'q', label: 'Rate of Heat Flow (Q/t)', color: '#ef4444' },
        ],
    },

    _t: 0,
    _params: { dt: 50, k: 0.5, a: 1.0, L: 0.5 },
    _particles: [],

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._particles = [];
    },

    update(dt) {
        this._t += dt;
        const { dt: deltaT, k, a, L } = this._params;

        // Fourier's law of heat conduction: Q/t = k * A * ΔT / L
        const heatRate = (k * a * deltaT) / L;

        // Visual particle emission rate based on heatRate
        const particleSpawnChance = Math.min(1.0, heatRate / 500 * dt * 30);

        if (Math.random() < particleSpawnChance) {
            this._particles.push({
                x: 0,
                y: (Math.random() - 0.5) * a * 100, // Spread based on area
                vx: 50 + Math.random() * 50,
                life: 1.0
            });
        }

        // Update particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p.vx * dt;
            p.life -= dt * 0.5;

            // Particles fade as they cross the thickness L
            if (p.x > L * 200 || p.life <= 0) {
                this._particles.splice(i, 1);
            }
        }

        return { t: this._t, q: heatRate, done: false };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { dt: deltaT, k, a, L } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        const visualThickness = Math.max(20, L * 200);
        const visualHeight = Math.max(40, a * 100);

        // Heat source (Hot side)
        ctx.fillStyle = hexToRgba('#ef4444', 0.2); // Translucent Red
        ctx.fillRect(cx - visualThickness / 2 - 100, cy - visualHeight / 2, 100, visualHeight);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('HOT', cx - visualThickness / 2 - 80, cy);

        // Heat sink (Cold side)
        ctx.fillStyle = hexToRgba('#38bdf8', 0.2); // Translucent Blue
        ctx.fillRect(cx + visualThickness / 2, cy - visualHeight / 2, 100, visualHeight);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('COLD', cx + visualThickness / 2 + 30, cy);

        // The material
        const kRatio = k / 400; // Max conductivity roughly 400 (Copper)
        // Material color varies from insulator (gray) to conductor (orange/red hint)
        const matColor = `rgba(${100 + kRatio * 150}, ${100 + kRatio * 50}, 100, 0.4)`;

        ctx.fillStyle = matColor;
        ctx.fillRect(cx - visualThickness / 2, cy - visualHeight / 2, visualThickness, visualHeight);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - visualThickness / 2, cy - visualHeight / 2, visualThickness, visualHeight);

        // Draw heat flow particles
        for (const p of this._particles) {
            ctx.fillStyle = `rgba(239, 68, 68, ${p.life})`; // Red to transparent
            ctx.beginPath();
            ctx.arc(cx - visualThickness / 2 + p.x, cy + p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dashboard
        const heatRate = (k * a * deltaT) / L;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`Fourier's Law: Q/t = (k * A * ΔT) / L`, 20, 30);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(`Heat Transfer Rate = ${heatRate.toFixed(1)} Joules/sec (W)`, 20, 55);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`ΔT = ${deltaT} °C`, 20, 75);
    },
};

export default sim;
