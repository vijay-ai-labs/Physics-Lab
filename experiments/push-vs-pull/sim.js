/* FILE: experiments/push-vs-pull/sim.js
   ============================================================
   Push vs Pull — Physics Simulation
   ============================================================
   Physics:
     - Block on flat surface, horizontal force applied.
     - Push mode:  force arrow enters from behind the block (left side).
     - Pull mode:  force arrow exits from front of block (right side, rope).
     - Net force:  F_net = F_applied − F_friction
     - Static friction holds if |F_applied| ≤ μ_s · m · g
     - Kinetic friction once moving: f_k = μ_k · m · g (opposes velocity)
     - Euler integration: v += (F_net / m) · dt,  x += v · dt
     - Block wraps horizontally when it exits the canvas.

   Formulas:
     F_net = F_applied − sign(v) · μ_k · m · g   (while moving)
     a     = F_net / m
     v(t)  = v + a · dt
     x(t)  = x + v · dt

   Dev mode: set window.uxDev = true to see numeric readout.
   ============================================================ */

import { clamp, hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS } from '../../js/vectorRenderer.js';

// pixels per Newton for force arrow scaling
const FORCE_SCALE = 2.5;
// pixels per (m/s) for velocity arrow
const VEL_SCALE   = 18;

const sim = {
    name: 'Push vs Pull',

    objective: 'How does applied force affect motion of an object?',
    defaults: {
        force:     10,    // Applied force magnitude (N)
        mass:      5,     // Mass of block (kg)
        mu:        0.3,   // Kinetic friction coefficient
        friction:  true,  // Friction enabled
        mode:      1,     // 1 = Push, 0 = Pull (toggle)
    },

    controls: [
        {
            type: 'slider', key: 'force', label: 'Applied Force (N)',
            min: 0, max: 50, step: 0.5,
            tooltip: 'Magnitude of the push or pull force in Newtons',
        },
        {
            type: 'slider', key: 'mass', label: 'Mass (kg)',
            min: 0.5, max: 20, step: 0.5,
            tooltip: 'Mass of the block — heavier blocks need more force to accelerate',
        },
        {
            type: 'slider', key: 'mu', label: 'Friction Coeff μ',
            min: 0, max: 1, step: 0.01,
            tooltip: 'Kinetic friction coefficient (μ). 0 = frictionless, 1 = very high friction',
        },
        {
            type: 'toggle', key: 'friction', label: '🔒 Friction On',
            tooltip: 'Toggle surface friction on or off',
        },
        {
            type: 'toggle', key: 'mode', label: '↔ Push / Pull',
            tooltip: 'Toggle between Push (force from behind) and Pull (rope from front)',
        },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Net Force (N) / Velocity (m/s)',
        datasets: [
            { key: 'netForce', label: 'Net Force (N)', color: '#10b981' },
            { key: 'velocity', label: 'Velocity (m/s)', color: '#38bdf8' },
        ],
    },

    // ── Internal state ──────────────────────────────────────────
    _t:       0,
    _x:       0,      // block center x in meters
    _v:       0,      // velocity (m/s)
    _params:  null,
    _g:       9.81,

    reset(params) {
        this._params = params;
        this._t = 0;
        this._v = 0;
        this._x = 0;
    },

    update(dt, params) {
        this._params = params;
        const { force, mass, mu, friction, mode } = params;
        const g = this._g;

        const F_applied = force; 
        const mu_s = friction ? clamp(mu + 0.05, 0, 1) : 0;
        const mu_k = friction ? mu : 0;
        const f_max_static = mu_s * mass * g;

        let F_net;
        let old_v_sign = Math.abs(this._v) > 0.001 ? Math.sign(this._v) : 0;

        if (Math.abs(this._v) < 0.001 && F_applied <= f_max_static) {
            F_net = 0;
            this._v = 0;
        } else {
            const f_kinetic = mu_k * mass * g;
            const motionSign = Math.abs(this._v) > 0.001 ? Math.sign(this._v) : Math.sign(F_applied);
            F_net = F_applied - motionSign * f_kinetic;
        }

        let accel = F_net / mass;
        this._v += accel * dt;

        // Post-update: if the block was moving but friction reversed its direction, and applied force isn't strong enough
        if (old_v_sign !== 0 && Math.sign(this._v) !== old_v_sign && F_applied <= f_max_static) {
            this._v = 0;
            F_net = 0;
        }

        this._x += this._v * dt;
        this._t += dt;

        return {
            t:        this._t,
            netForce: F_net,
            velocity: this._v,
            done:     false,
        };
    },

    _drawPerson(ctx, cx, cy, isPush) {
        ctx.save();
        ctx.translate(cx, cy);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(-10, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(15, 0); ctx.stroke();
        
        // Body (leaning forward if push)
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 14;
        ctx.beginPath();
        if (isPush) {
            ctx.moveTo(8, -65); ctx.lineTo(0, -35); 
        } else {
            ctx.moveTo(-5, -60); ctx.lineTo(0, -35); 
        }
        ctx.stroke();

        // Arms reaching to crate or rope
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (isPush) {
            ctx.moveTo(3, -60); ctx.lineTo(25, -45); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -55); ctx.lineTo(20, -40); ctx.stroke();
        } else {
            // pulling on the left side of his body
            ctx.moveTo(-5, -55); ctx.lineTo(-25, -50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-5, -55); ctx.lineTo(-20, -40); ctx.stroke();
        }

        // Head
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        if (isPush) {
            ctx.arc(12, -78, 12, 0, Math.PI * 2); 
        } else {
            ctx.arc(-8, -75, 12, 0, Math.PI * 2); 
        }
        ctx.fill();
        
        ctx.restore();
    },

    _drawCrate(ctx, bx, by, blockW, blockH) {
        ctx.save();
        ctx.fillStyle = '#b45309'; // Base wood color
        ctx.fillRect(bx, by, blockW, blockH);
        
        // Crate boards
        ctx.strokeStyle = '#78350f'; // Darker wood lines
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, blockW, blockH);
        
        ctx.beginPath();
        ctx.moveTo(bx, by + blockH/3); ctx.lineTo(bx + blockW, by + blockH/3);
        ctx.moveTo(bx, by + 2*blockH/3); ctx.lineTo(bx + blockW, by + 2*blockH/3);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(bx + blockW, by + blockH);
        ctx.moveTo(bx + blockW, by); ctx.lineTo(bx, by + blockH);
        ctx.stroke();
        
        // Border nails
        ctx.fillStyle = '#451a03';
        const m = 4;
        ctx.beginPath(); ctx.arc(bx + m, by + m, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + blockW - m, by + m, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + m, by + blockH - m, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + blockW - m, by + blockH - m, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const params  = this._params || {};
        const { force = 10, mass = 5, mu = 0.3, friction = true, mode = 1 } = params;
        const g = this._g;
        const isPush = Boolean(mode);

        const groundY  = h * 0.62;
        const PPM      = w * 0.06;

        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.strokeStyle = 'rgba(100,116,139,0.6)';
        ctx.lineWidth   = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(100,116,139,0.25)';
        ctx.lineWidth   = 1;
        for (let gx = 0; gx < w; gx += 20) {
            ctx.beginPath();
            ctx.moveTo(gx, groundY);
            ctx.lineTo(gx - 10, groundY + 12);
            ctx.stroke();
        }

        const blockW   = clamp(45 + mass * 4, 55, 110);
        const blockH   = blockW * 0.7;
        const xWrapped = ((this._x * PPM % w) + w) % w;
        const bx       = xWrapped;
        const by       = groundY - blockH;

        const leftBox  = bx - blockW / 2;
        const rightBox = bx + blockW / 2;
        
        // Draw person & rope
        if (isPush) {
            const pX = leftBox - 20; 
            this._drawPerson(ctx, pX, groundY, true);
        } else {
            const pX = rightBox + 40;
            // Draw rope
            ctx.strokeStyle = '#d7b789';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(rightBox, by + blockH/2);
            ctx.lineTo(pX - 20, by + blockH/2);
            ctx.stroke();
            
            this._drawPerson(ctx, pX, groundY, false);
        }

        // Draw Crate
        this._drawCrate(ctx, leftBox, by, blockW, blockH);

        // Mass label
        ctx.fillStyle = '#fef3c7';
        ctx.font      = `bold ${clamp(Math.round(blockH * 0.3), 10, 18)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mass} kg`, bx, by + blockH * 0.8);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Arrows
        const blockCY = by + blockH / 2;
        const fColor = isPush ? VECTOR_COLORS.force : '#f59e0b';
        const fLabel = isPush ? `F_push ${force.toFixed(1)} N` : `F_pull ${force.toFixed(1)} N`;

        if (isPush) {
            drawVector(ctx, leftBox, blockCY, force, 0, 2.5, fColor, fLabel, { invertY: false });
        } else {
            drawVector(ctx, rightBox, blockCY, force, 0, 2.5, fColor, fLabel, { invertY: false });
        }

        if (friction && Math.abs(this._v) > 0.01) {
            const f_kinetic = mu * mass * g;
            const frDir     = -Math.sign(this._v);
            drawVector(ctx, bx, blockCY, frDir * f_kinetic, 0, 2.5,
                VECTOR_COLORS.gravity, `f_k ${f_kinetic.toFixed(1)} N`, { invertY: false });
        }

        if (Math.abs(this._v) > 0.05) {
            drawVector(ctx, bx, by - 8, this._v, 0, 18,
                VECTOR_COLORS.velocity, `v ${this._v.toFixed(2)} m/s`, { invertY: false });
        }

        // Mode label
        ctx.fillStyle = isPush ? VECTOR_COLORS.force : '#f59e0b';
        ctx.font      = 'bold 13px Inter, sans-serif';
        ctx.fillText(isPush ? 'PUSH' : 'PULL', 16, 28);

        ctx.fillStyle = friction ? '#10b981' : '#64748b';
        ctx.font      = '12px Inter, sans-serif';
        ctx.fillText(friction ? `μ = ${mu.toFixed(2)}` : 'Frictionless', 16, 46);

        ctx.fillStyle = '#64748b';
        ctx.font      = '12px Inter, sans-serif';
        ctx.fillText(`v = ${this._v.toFixed(3)} m/s`, w - 130, h - 16);
        ctx.fillText(`t = ${this._t.toFixed(2)} s`,   w - 130, h - 32);

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            const F_net = force - (friction ? mu * mass * g * Math.sign(this._v || 1) : 0);
            ctx.fillText(`F_net=${F_net.toFixed(2)} a=${(F_net/mass).toFixed(3)} v=${this._v.toFixed(3)} x=${this._x.toFixed(2)}`, 8, h - 48);
        }
    },
};

export default sim;
