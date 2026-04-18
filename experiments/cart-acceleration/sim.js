/* FILE: experiments/cart-acceleration/sim.js
   ============================================================
   Cart Acceleration Simulation: Speed-Time Analysis — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - FIXED floating-point equality: `this._v === 0` → `Math.abs(this._v) < 0.001`
         for reliable static-friction check (same class of bug as Newton's 2nd Law).
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS, vectorToggle } from '../../js/vectorRenderer.js';

const sim = {
    name: 'Cart Acceleration Simulation',


    objective: 'How does net force affect cart acceleration?',
    defaults: { mass: 2, pullForce: 10, friction: 0, showVelocity: true, showAcceleration: true, showForce: true },

    controls: [
        { type: 'slider', key: 'mass', label: 'Cart Mass (kg)', min: 0.5, max: 10, step: 0.5, tooltip: 'Total mass of the cart. Heavier carts accelerate more slowly for the same pull force.' },
        { type: 'slider', key: 'pullForce', label: 'Pulling Force (N)', min: 0, max: 50, step: 1, tooltip: 'Horizontal force pulling the cart along the track (in Newtons).' },
        { type: 'slider', key: 'friction', label: 'Surface Friction (μk)', min: 0, max: 0.5, step: 0.05, tooltip: 'Kinetic friction coefficient between the cart wheels and the track surface.' },
        vectorToggle('showVelocity', 'Velocity', 'velocity'),
        vectorToggle('showAcceleration', 'Acceleration', 'acceleration'),
        vectorToggle('showForce', 'Force', 'force'),
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Velocity (m/s)',
        datasets: [
            { key: 'v', label: 'Velocity v(t)', color: '#10b981' },
            { key: 'a', label: 'Acceleration a(t)', color: '#ef4444' },
        ],
    },

    _t: 0,
    _params: { mass: 2, pullForce: 10, friction: 0 },
    _x: 0,
    _v: 0,
    _a: 0,
    _done: false,
    _g: 9.81,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._x = -150;
        this._v = 0;
        this._a = 0;
        this._done = false;
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { mass, pullForce, friction } = this._params;

        const fFric = friction * mass * this._g;
        let netForce = pullForce - fFric;

        if (Math.abs(this._v) < 0.001 && pullForce <= fFric) {
            netForce = 0;
        }

        this._a = netForce / mass;
        this._v += this._a * dt;

        if (this._v < 0 && pullForce <= fFric) {
            this._v = 0;
            this._a = 0;
        }

        // visual speed scaling
        this._x += this._v * dt * 10;

        // Stop recording when cart hits end of track
        if (this._x > 200) {
            this._x = 200;
            this._v = 0;
            this._done = true;
        }

        if (this._t > 15) this._done = true;

        return { t: this._t, v: this._v, a: this._a, done: this._done };
    },

    _drawPerson(ctx, cx, cy, isPullingRight) {
        ctx.save();
        ctx.translate(cx, cy);
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(-10, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(15, 0); ctx.stroke();
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 14;
        ctx.beginPath();  ctx.moveTo(5, -60); ctx.lineTo(0, -35); ctx.stroke();

        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(5, -55); ctx.lineTo(-20, -50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -55); ctx.lineTo(-15, -40); ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(10, -75, 12, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    _drawCartAndBlocks(ctx, bx, by, cartW, cartH, mass, distance) {
        ctx.save();
        
        // Spoked Wheels
        const r = 10;
        const wheelY = by + cartH;
        const w1x = bx - cartW / 2 + 15;
        const w2x = bx + cartW / 2 - 15;
        
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(w1x, wheelY, r, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(w2x, wheelY, r, 0, Math.PI*2); ctx.stroke();
        for (let i=0; i<4; i++) {
            const angle = (i * Math.PI) / 4 + distance * 0.1; // rotate wheels based on x!
            const dx = Math.cos(angle) * r;
            const dy = Math.sin(angle) * r;
            ctx.beginPath(); ctx.moveTo(w1x - dx, wheelY - dy); ctx.lineTo(w1x + dx, wheelY + dy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w2x - dx, wheelY - dy); ctx.lineTo(w2x + dx, wheelY + dy); ctx.stroke();
        }

        // Cart Body
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.roundRect(bx - cartW / 2, by, cartW, cartH, 4);
        ctx.fill();
        
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(bx - cartW / 2, by, cartW, 6);

        // Blocks based on mass
        const blockW = 20;
        const blockH = 20;
        let blocksToDraw = Math.ceil(mass);
        let startX = bx - cartW/2 + 5;
        let startY = by - blockH + 2;
        
        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        
        for (let i = 0; i < blocksToDraw; i++) {
            let cx = startX + (i % 3) * (blockW + 2);
            let cy = startY - Math.floor(i / 3) * (blockH + 2);
            ctx.fillRect(cx, cy, blockW, blockH);
            ctx.strokeRect(cx, cy, blockW, blockH);
        }
        ctx.restore();
    },
    
    _drawFlag(ctx, fx, fy) {
        ctx.save();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(fx, fy - 40); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(fx, fy - 40); ctx.lineTo(fx + 20, fy - 30); ctx.lineTo(fx, fy - 20); ctx.fill();
        ctx.restore();
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { mass, pullForce, friction } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        // Track line
        const groundY = cy + 35;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(10, groundY);
        ctx.lineTo(w - 10, groundY);
        ctx.stroke();
        
        // Track hatches
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        for(let gx = 20; gx < w - 20; gx += 30) {
            ctx.beginPath();
            ctx.moveTo(gx, groundY - 3);
            ctx.lineTo(gx - 5, groundY + 8);
            ctx.stroke();
        }

        // Cart setup
        const cartW = 80;
        const cartH = 25;
        const bx = cx + this._x;
        const by = groundY - 10 - cartH;

        // Draw finishes & markers
        const finishX = cx + 200 + cartW/2;
        this._drawFlag(ctx, finishX, groundY);

        // Distance marker text
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`0m`, cx - 150, groundY + 25);
        ctx.fillText(`Finish`, finishX - 15, groundY + 25);
        ctx.beginPath(); ctx.moveTo(cx - 150, groundY); ctx.lineTo(cx - 150, groundY + 10); ctx.stroke();

        // Draw Person pulling at end of screen
        const stringEndX = Math.max(bx + cartW / 2 + 50, Math.min(w - 50, finishX + 60));
        if (pullForce > 0 || this._v > 0) {
            this._drawPerson(ctx, stringEndX, groundY, true);
        }

        // String
        if (pullForce > 0) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(bx + cartW / 2, by + cartH / 2); 
            // String connects to Person's hand
            ctx.lineTo(stringEndX - 20, by + cartH * 0.2); 
            ctx.stroke();

            this._drawArrow(ctx, bx + cartW / 2 + 10, by - 15, bx + cartW / 2 + 10 + pullForce, by - 15, '#10b981');
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(`F_pull = ${pullForce}N`, bx + cartW / 2 + 15, by - 25);
        }

        // The Cart
        this._drawCartAndBlocks(ctx, bx, by, cartW, cartH, mass, this._x);

        const fFric = friction * mass * this._g;
        if (friction > 0 && (this._v > 0 || pullForce > 0)) {
            const actFric = this._v > 0 ? fFric : Math.min(pullForce, fFric);
            this._drawArrow(ctx, bx - cartW / 2 - 10, groundY - 10, bx - cartW / 2 - 10 - actFric, groundY - 10, '#ef4444');
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(`F_fric = ${actFric.toFixed(1)}N`, bx - cartW / 2 - actFric - 80, groundY - 5);
        }

        // Info Display
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        const netF = this._v > 0 ? pullForce - fFric : Math.max(0, pullForce - fFric);
        ctx.fillText(`F_net = ${netF.toFixed(1)} N`, 12, 30);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(`Acceleration (Slope of v-t) = ${this._a.toFixed(2)} m/s²`, 12, 55);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Speed (v) = ${this._v.toFixed(2)} m/s`, 12, 75);

        // ── Vector Overlays ───────────────────────────────────────────────
        {
            const vy0 = by - 20; 
            const vecScale = 2.5; 

            if (this._params.showVelocity && Math.abs(this._v) > 0.05) {
                drawVector(ctx, bx, vy0 - 18, this._v, 0, vecScale,
                    VECTOR_COLORS.velocity, `v ${this._v.toFixed(2)} m/s`, { invertY: false });
            }
            if (this._params.showAcceleration && Math.abs(this._a) > 0.01) {
                drawVector(ctx, bx, vy0 - 36, this._a, 0, vecScale,
                    VECTOR_COLORS.acceleration, `a ${this._a.toFixed(2)} m/s²`, { invertY: false });
            }
            if (this._params.showForce && pullForce > 0) {
                const netF = this._v > 0 ? pullForce - fFric : Math.max(0, pullForce - fFric);
                drawVector(ctx, bx, vy0 - 54, netF, 0, vecScale,
                    VECTOR_COLORS.force, `F ${netF.toFixed(1)} N`, { invertY: false });
            }
        }
    },

    _drawArrow(ctx, x1, y1, x2, y2, color) {
        const dx = x2 - x1;
        if (Math.abs(dx) < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
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
