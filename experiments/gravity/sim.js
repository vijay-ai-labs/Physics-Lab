/* ============================================================
   Gravity Simulator — sim.js
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';

const sim = {
    name: 'Gravity Simulator',


    objective: 'What is the gravitational force between two masses?',
    defaults: { m1: 1000, m2: 10, distance: 150, showForce: true, showVelocity: true },

    controls: [
        { type: 'slider', key: 'm1', label: 'Mass 1 (10²⁴ kg)', min: 100, max: 2000, step: 100, tooltip: 'Mass of the central body (e.g. a star). Larger mass increases gravitational pull.' },
        { type: 'slider', key: 'm2', label: 'Mass 2 (10²⁴ kg)', min: 1, max: 100, step: 1, tooltip: 'Mass of the orbiting body (e.g. a planet). Affects orbital mechanics.' },
        { type: 'slider', key: 'distance', label: 'Initial Distance (Gm)', min: 50, max: 300, step: 10, tooltip: 'Starting distance between the two bodies. Gravitational force decreases with the square of this distance.' },
        vectorToggle('showForce', 'Gravity Force', 'gravity'),
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
    ],

    graphConfig: {
        xAxis: 'Time (days)',
        yAxis: 'Force (10²⁰ N)',
        datasets: [
            { key: 'force', label: 'Gravitational Force', color: '#10b981' },
        ],
    },

    _t: 0,
    _params: { m1: 1000, m2: 10, distance: 150 },
    _x1: 0, _y1: 0, _vx1: 0, _vy1: 0,
    _x2: 150, _y2: 0, _vx2: 0, _vy2: 8, // orbital velocity approx
    _trail: [],
    _done: false,

    // G constant scaled up for visual simulation speed
    _G: 10,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._x1 = 0;
        this._y1 = 0;
        this._x2 = params.distance;
        this._y2 = 0;

        // Setup initial orbital velocity for mass 2 to create orbit
        // v = sqrt(G*M/r)
        const v_orbit = Math.sqrt(this._G * params.m1 / params.distance);
        this._vx2 = 0;
        this._vy2 = v_orbit;

        // Counter-velocity for center of mass stability (optional, let m1 drift slightly)
        this._vx1 = 0;
        this._vy1 = -(params.m2 / params.m1) * v_orbit;

        this._trail = [];
        this._done = false;
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { m1, m2 } = this._params;

        const dx = this._x2 - this._x1;
        const dy = this._y2 - this._y1;
        const r2 = dx * dx + dy * dy;
        const r = Math.sqrt(r2);

        // F = G * m1 * m2 / r^2
        const fmag = (this._G * m1 * m2) / r2;

        // Force components
        const fx = fmag * (dx / r);
        const fy = fmag * (dy / r);

        // a = F/m
        const ax1 = fx / m1;
        const ay1 = fy / m1;
        const ax2 = -fx / m2;
        const ay2 = -fy / m2;

        this._vx1 += ax1 * dt * 20;
        this._vy1 += ay1 * dt * 20;
        this._vx2 += ax2 * dt * 20;
        this._vy2 += ay2 * dt * 20;

        this._x1 += this._vx1 * dt * 20;
        this._y1 += this._vy1 * dt * 20;
        this._x2 += this._vx2 * dt * 20;
        this._y2 += this._vy2 * dt * 20;

        this._trail.push({ x: this._x2, y: this._y2 });
        if (this._trail.length > 200) this._trail.shift();

        // Check collision
        if (r < (Math.sqrt(m1) / 2 + Math.sqrt(m2) / 2)) {
            this._done = true;
        }

        return { t: this._t, force: fmag, done: this._done };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a'; // Space background
        ctx.fillRect(0, 0, w, h);

        // Draw subtle starfield instead of grid
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 50; i++) {
            const sx = (Math.sin(i * 7.1) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * 13.3) * 0.5 + 0.5) * h;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        const { m1, m2 } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        // Draw trail
        if (this._trail.length > 1) {
            ctx.strokeStyle = hexToRgba('#38bdf8', 0.4);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx + this._trail[0].x, cy + this._trail[0].y);
            for (let i = 1; i < this._trail.length; i++) {
                ctx.lineTo(cx + this._trail[i].x, cy + this._trail[i].y);
            }
            ctx.stroke();
        }

        // Object 1 (Heavy)
        const bx1 = cx + this._x1;
        const by1 = cy + this._y1;
        const r1 = Math.min(40, Math.max(15, Math.sqrt(m1) * 0.8));

        const grad1 = ctx.createRadialGradient(bx1, by1, 0, bx1, by1, r1);
        grad1.addColorStop(0, '#fde047');
        grad1.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad1;
        ctx.beginPath(); ctx.arc(bx1, by1, r1, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 20; ctx.shadowColor = '#f59e0b'; ctx.fill(); ctx.shadowBlur = 0;

        // Object 2 (Lighter)
        const bx2 = cx + this._x2;
        const by2 = cy + this._y2;
        const rad2 = Math.min(15, Math.max(4, Math.sqrt(m2) * 1.5));

        const grad2 = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, rad2);
        grad2.addColorStop(0, '#bae6fd');
        grad2.addColorStop(1, '#0284c7');
        ctx.fillStyle = grad2;
        ctx.beginPath(); ctx.arc(bx2, by2, rad2, 0, Math.PI * 2); ctx.fill();

        // Distance line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
        ctx.setLineDash([]);

        // Force Vectors (via shared renderer)
        const dx = bx2 - bx1, dy = by2 - by1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const forceDisplay = (this._G * m1 * m2) / (dist * dist);
        const fScale = Math.min(dist / 2, forceDisplay * 0.5); // Cap vector visual length

        const nx = dx / dist, ny = dy / dist;

        // F1 on 2 (attractive, points toward m1)
        if (this._params.showForce) {
            drawVector(ctx, bx2, by2, -nx * fScale, -ny * fScale, 1,
                VECTOR_COLORS.gravity, `F ${forceDisplay.toFixed(1)}`, { invertY: false });
            drawVector(ctx, bx1, by1, nx * fScale, ny * fScale, 1,
                VECTOR_COLORS.gravity, null, { invertY: false });
        }

        // Velocity vector for m2 (orbiting body)
        if (this._params.showVelocity) {
            const vSpd = Math.sqrt(this._vx2 * this._vx2 + this._vy2 * this._vy2);
            if (vSpd > 0.05)
                drawVector(ctx, bx2, by2, this._vx2, this._vy2, 1.5,
                    VECTOR_COLORS.velocity, `v ${vSpd.toFixed(1)}`, { invertY: false });
        }

        // Text
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`M = ${m1}`, bx1 - 20, by1 + r1 + 15);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`m = ${m2}`, bx2 + rad2 + 5, by2);

        // UI Dashboard
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`Newton's Law of Universal Gravitation`, 12, 30);
        ctx.fillText(`F = G(m₁m₂)/r²`, 12, 50);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(`Gravitational Force: ${forceDisplay.toFixed(1)} x 10²⁰ N`, 12, 75);
        ctx.fillText(`Distance (r): ${dist.toFixed(1)} Gm`, 12, 95);

        if (this._done) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.fillText(`💥 COLLISION!`, cx - 70, cy - 50);
        }
    },

    _drawArrow(ctx, x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const hl = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hl * Math.cos(angle - 0.4), y2 - hl * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - hl * Math.cos(angle + 0.4), y2 - hl * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
    }
};

export default sim;
