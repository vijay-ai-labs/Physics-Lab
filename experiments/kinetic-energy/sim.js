/* ============================================================
   Kinetic Energy: Mass & Velocity Factors — sim.js
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';

const sim = {
    name: 'Kinetic Energy',


    objective: 'How much kinetic energy does a moving object have?',
    defaults: { mass: 10, velocity: 5, showVelocity: true },

    controls: [
        { type: 'slider', key: 'mass', label: 'Mass (kg)', min: 1, max: 50, step: 1, tooltip: 'Mass of the moving object. Kinetic energy scales linearly with mass.' },
        { type: 'slider', key: 'velocity', label: 'Velocity (m/s)', min: 1, max: 30, step: 1, tooltip: 'Speed of the object. KE = ½mv² — energy grows with the square of velocity.' },
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Energy (J)',
        datasets: [
            { key: 'ke', label: 'Kinetic Energy', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: { mass: 10, velocity: 5 },
    _x: 0,
    _trail: [],

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._x = -150;
        this._trail = [];
    },

    update(dt) {
        this._t += dt;
        const { mass, velocity } = this._params;
        this._x += velocity * dt * 5; // Scale velocity for visibility
        if (this._x > 200) this._x = -200; // Loop

        this._trail.push({ x: this._x, t: this._t });
        if (this._trail.length > 50) this._trail.shift();

        const ke = 0.5 * mass * velocity * velocity;
        return { t: this._t, ke, done: false };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { mass, velocity } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        // Ground line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, cy + 30);
        ctx.lineTo(w - 20, cy + 30);
        ctx.stroke();

        // Draw trail
        if (this._trail.length > 1) {
            ctx.strokeStyle = hexToRgba('#f59e0b', 0.4);
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx + this._trail[0].x, cy);
            for (let i = 1; i < this._trail.length; i++) {
                ctx.lineTo(cx + this._trail[i].x, cy);
            }
            ctx.stroke();
        }

        // Draw object (box)
        const size = 20 + Math.sqrt(mass) * 4;
        const bx = cx + this._x;
        const by = cy + 30 - size / 2;

        ctx.fillStyle = hexToRgba('#f59e0b', 0.2);
        ctx.fillRect(bx - size / 2, by - size / 2, size, size);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - size / 2, by - size / 2, size, size);

        // Velocity vector
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx + size / 2 + 5, cy);
        ctx.lineTo(bx + size / 2 + 5 + velocity * 2, cy);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(bx + size / 2 + 5 + velocity * 2, cy);
        ctx.lineTo(bx + size / 2 + velocity * 2 - 5, cy - 5);
        ctx.lineTo(bx + size / 2 + velocity * 2 - 5, cy + 5);
        ctx.fill();

        // Labels
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`m = ${mass} kg`, bx - 25, by + size / 2 + 20);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`v = ${velocity} m/s`, bx + size / 2 + 10, cy - 10);

        // Dashboard
        const ke = 0.5 * mass * velocity * velocity;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`KE = ½mv² = 0.5 × ${mass} × ${velocity}²`, 20, 30);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText(`Kinetic Energy: ${ke.toFixed(0)} Joules`, 20, 55);

        // ── Vector Overlays ───────────────────────────────────────────────
        if (this._params.showVelocity) {
            drawVector(ctx, bx, by - size / 2 - 8, velocity, 0, 3.5,
                VECTOR_COLORS.velocity, `v ${velocity} m/s`, { invertY: false });
        }
    },
};

export default sim;
