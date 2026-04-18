/* ============================================================
   Archimedes Principle — sim.js
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';

const sim = {
    name: 'Archimedes Principle',


    objective: 'What buoyant force acts on a submerged object?',
    defaults: { mass: 2, volume: 1.5, fluidDensity: 1000, showGravity: true, showForce: true },

    controls: [
        { type: 'slider', key: 'mass', label: 'Object Mass (kg)', min: 0.5, max: 5, step: 0.1, tooltip: 'Mass of the object being submerged. Determines the downward weight force (Fg = mg).' },
        { type: 'slider', key: 'volume', label: 'Object Volume (L)', min: 0.5, max: 5, step: 0.1, tooltip: 'Volume of the object in litres. Larger volume displaces more fluid and increases buoyancy.' },
        { type: 'slider', key: 'fluidDensity', label: 'Fluid Density (kg/m³)', min: 500, max: 2000, step: 10, tooltip: 'Density of the fluid. Water ≈ 1000, Mercury ≈ 13600, Seawater ≈ 1025 kg/m³.' },
        vectorToggle('showGravity', 'Gravity (Weight)', 'gravity'),
        vectorToggle('showForce', 'Buoyancy', 'force'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Forces (N)',
        datasets: [
            { key: 'gravity', label: 'Weight (Fg)', color: '#ef4444' },
            { key: 'buoyancy', label: 'Buoyancy (Fb)', color: '#38bdf8' },
            { key: 'netForce', label: 'Net Force', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: { mass: 2, volume: 1.5, fluidDensity: 1000 },
    _y: 0,
    _vy: 0,
    _done: false,
    _g: 9.81,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._y = -100; // Start above water
        this._vy = 0;
        this._done = false;
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { mass, volume, fluidDensity } = this._params;

        const volM3 = volume / 1000; // Convert L to m³
        const objDensity = mass / volM3;

        // Calculate submerged volume (0 to max volume)
        // Assume object is a 10cm x 10cm x 10V cm cube for simplicity of partial submersion
        // Actually, let's simplify: if y > 0, it's partially or fully submerged

        let submergedRatio = 0;
        const objHeight = 40; // visual height mapping
        if (this._y > -objHeight / 2) {
            submergedRatio = (this._y + objHeight / 2) / objHeight;
            if (submergedRatio > 1) submergedRatio = 1;
        }

        const Fg = mass * this._g;
        const Fb = fluidDensity * (volM3 * submergedRatio) * this._g;

        // Damping when in fluid
        const damping = submergedRatio > 0 ? 0.95 : 0.999;

        const netForce = Fg - Fb;
        const a = netForce / mass;

        this._vy += a * dt;
        this._vy *= damping;
        this._y += this._vy * dt * 50; // visual scale

        // Floor collision
        if (this._y > 150) {
            this._y = 150;
            if (this._vy > 0) this._vy *= -0.3; // bounce
        }

        if (this._t > 15) this._done = true;

        return { t: this._t, gravity: Fg, buoyancy: Fb, netForce, done: this._done };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { mass, volume, fluidDensity } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        const objHeight = 40;
        const objSize = Math.max(30, volume * 15);

        // Water
        ctx.fillStyle = hexToRgba('#0284c7', 0.25);
        ctx.fillRect(0, cy, w, h / 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        for (let x = 0; x < w; x += 20) {
            ctx.lineTo(x, cy + Math.sin(this._t * 5 + x * 0.05) * 3);
        }
        ctx.stroke();

        // Object
        const bx = cx - objSize / 2;
        const by = cy + this._y - objHeight / 2;

        ctx.fillStyle = hexToRgba('#a8a29e', 0.9);
        ctx.fillRect(bx, by, objSize, objHeight);
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, objSize, objHeight);

        // Compute forces for labels and vectors
        const volM3 = volume / 1000;
        let submergedRatio = 0;
        if (this._y > -objHeight / 2) {
            submergedRatio = (this._y + objHeight / 2) / objHeight;
            if (submergedRatio > 1) submergedRatio = 1;
        }
        const Fg = mass * this._g;
        const Fb = fluidDensity * (volM3 * submergedRatio) * this._g;

        // Vectors (use shared renderer)
        if (this._params.showGravity) {
            drawVector(ctx, cx, by + objHeight / 2, 0, -Fg, 2.2, VECTOR_COLORS.gravity,
                `Fg ${Fg.toFixed(1)} N`);
        }
        if (this._params.showForce && Fb > 0) {
            drawVector(ctx, cx, by + objHeight / 2, 0, Fb, 2.2, VECTOR_COLORS.force,
                `Fb ${Fb.toFixed(1)} N`);
        }

        // Info
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`Fg = ${Fg.toFixed(1)} N`, cx + 20, by + objHeight / 2 + 30);

        if (Fb > 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Fb = ${Fb.toFixed(1)} N`, cx + 20, by - 10);
        }

        const density = mass / volM3;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`Object Density: ${density.toFixed(0)} kg/m³`, 20, 30);
        ctx.fillText(`Fluid Density: ${fluidDensity} kg/m³`, 20, 50);

        let stateStr = '';
        if (density > fluidDensity) stateStr = 'Sinking';
        else if (density < fluidDensity) stateStr = 'Floating';
        else stateStr = 'Neutrally Buoyant';

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(stateStr, 20, 75);
    },

    _drawArrow(ctx, x1, y1, x2, y2, color) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (Math.abs(dy) < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const hl = 10;
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
