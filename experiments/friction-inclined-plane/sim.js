/* FILE: experiments/friction-inclined-plane/sim.js
   ============================================================
   Friction & Inclined Plane — Physics Simulation
   ============================================================
   Physics (block on inclined surface):
     Coordinate:  s = position along the slope (0 = top, + = down)
     Forces along slope:
       F_gravity_parallel = m · g · sin(θ)    (down the slope)
       F_normal           = m · g · cos(θ)    (perpendicular to slope)
       F_friction_static  = −F_gravity_parallel  (if |F_grav| ≤ f_s_max)
       F_friction_kinetic = μ_k · F_normal · (−sign(v))  (when moving)
     Slip condition: m·g·sin(θ) > μ_s · m·g·cos(θ)  →  tan(θ) > μ_s
     Acceleration: a = g·(sin(θ) − μ_k·cos(θ))  (when sliding)

   Block resets to top of slope when it reaches the bottom.
   Dev mode: window.uxDev = true shows numeric overlay.
   ============================================================ */

import { degToRad, clamp, hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS } from '../../js/vectorRenderer.js';

const sim = {
    name: 'Friction & Inclined Plane',

    objective: 'What net force moves a block on an inclined plane?',
    defaults: {
        angle:       30,    // Slope angle (degrees)
        mass:        5,     // Block mass (kg)
        muStatic:    0.4,   // Static friction coefficient
        muKinetic:   0.3,   // Kinetic friction coefficient
        frictionless: false, // Ignore friction entirely
        gravity:     9.81,  // m/s²
    },

    controls: [
        {
            type: 'slider', key: 'angle', label: 'Slope Angle (°)',
            min: 0, max: 85, step: 1,
            tooltip: 'Inclination angle of the ramp. Higher angles increase the gravity component along the slope.',
        },
        {
            type: 'slider', key: 'mass', label: 'Mass (kg)',
            min: 0.5, max: 20, step: 0.5,
            tooltip: 'Mass of the block. Heavier blocks have more weight but also more normal force and friction.',
        },
        {
            type: 'slider', key: 'muStatic', label: 'μ_static',
            min: 0, max: 1, step: 0.01,
            tooltip: 'Static friction coefficient. Block holds still when tan(θ) ≤ μ_static.',
        },
        {
            type: 'slider', key: 'muKinetic', label: 'μ_kinetic',
            min: 0, max: 0.9, step: 0.01,
            tooltip: 'Kinetic friction coefficient (once sliding). Usually slightly less than μ_static.',
        },
        {
            type: 'slider', key: 'gravity', label: 'Gravity (m/s²)',
            min: 1, max: 20, step: 0.1,
            tooltip: 'Gravitational acceleration.',
        },
        {
            type: 'toggle', key: 'frictionless', label: '⚡ Frictionless',
            tooltip: 'Remove all friction so the block always slides.',
        },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Acceleration (m/s²) / Normal Force (N)',
        datasets: [
            { key: 'acceleration',  label: 'Acceleration (m/s²)', color: '#f59e0b' },
            { key: 'normalForce',   label: 'Normal Force (N)',     color: '#10b981' },
        ],
    },

    // ── Internal state ──────────────────────────────────────────
    _t:       0,
    _s:       0,      // position along slope (0 = start at top, + = toward bottom)
    _v:       0,      // velocity along slope (m/s, + = down)
    _slipping: false,
    _params:  null,
    _slopeLen: 5,     // total slope length in meters

    reset(params) {
        this._params  = params;
        this._t       = 0;
        this._s       = 0;
        this._v       = 0;
        this._slipping = false;
        this._slopeLen = 5;
    },

    update(dt, params) {
        this._params  = params;
        const { angle, mass, muStatic, muKinetic, frictionless, gravity } = params;
        const g       = gravity;
        const theta   = degToRad(angle);

        const F_grav_para  = mass * g * Math.sin(theta);  // along slope, downward
        const F_normal     = mass * g * Math.cos(theta);
        const f_static_max = frictionless ? 0 : muStatic  * F_normal;
        const f_kinetic    = frictionless ? 0 : muKinetic * F_normal;

        // Determine slip
        let accel = 0;
        if (Math.abs(this._v) > 0.001 || this._slipping) {
            // Already moving
            this._slipping = true;
            accel = g * Math.sin(theta) - f_kinetic / mass;
            // Removed Math.max(0) so it can decelerate if friction > gravity component
        } else if (F_grav_para > f_static_max) {
            // Starts sliding
            this._slipping = true;
            accel = (F_grav_para - f_kinetic) / mass;
        } else {
            // Static — held by friction
            this._slipping = false;
            accel = 0;
        }

        this._v += accel * dt;
        
        // Post-update: if decelerating and crossed zero, snap to 0
        if (this._v < 0 && accel <= 0) {
            this._v = 0;
            this._slipping = false;
        }

        this._s += this._v * dt;
        this._t += dt;

        // Reset when block reaches bottom of slope
        if (this._s >= this._slopeLen) {
            this._s        = 0;
            this._v        = 0;
            this._slipping = false;
        }

        return {
            t:            this._t,
            acceleration: accel,
            normalForce:  F_normal,
            done:         false,
        };
    },

    _drawCrate(ctx, w, h) {
        const hW = w / 2, hH = h / 2;
        ctx.fillStyle = '#b45309'; 
        ctx.fillRect(-hW, -hH, w, h);
        
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.strokeRect(-hW, -hH, w, h);
        
        ctx.beginPath();
        ctx.moveTo(-hW, -hH + h / 3); ctx.lineTo(hW, -hH + h / 3);
        ctx.moveTo(-hW, -hH + 2 * h / 3); ctx.lineTo(hW, -hH + 2 * h / 3);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-hW, -hH); ctx.lineTo(hW, hH);
        ctx.moveTo(hW, -hH); ctx.lineTo(-hW, hH);
        ctx.stroke();
        
        ctx.fillStyle = '#451a03';
        const m = 4;
        ctx.beginPath(); ctx.arc(-hW + m, -hH + m, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hW - m, -hH + m, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-hW + m, hH - m, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hW - m, hH - m, 2, 0, Math.PI * 2); ctx.fill();
    },

    draw(ctx, w, h) {
        // ── Background ────────────────────────────────────────────
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const params  = this._params || {};
        const { angle = 30, mass = 5, muStatic = 0.4, muKinetic = 0.3, frictionless = false, gravity = 9.81 } = params;
        const g       = gravity;
        const theta   = degToRad(angle);

        // ── Slope geometry ────────────────────────────────────────
        const slopeLen  = this._slopeLen;
        const PPM       = Math.min(w, h) * 0.09;  // pixels per meter
        const baseX     = w * 0.12;
        const baseY     = h * 0.82;
        const tipX      = baseX + slopeLen * PPM * Math.cos(theta);
        const tipY      = baseY - slopeLen * PPM * Math.sin(theta);

        // Slope fill
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX, baseY);
        ctx.closePath();
        ctx.fillStyle   = 'rgba(51,65,85,0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,116,139,0.8)';
        ctx.lineWidth   = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.rotate(-theta);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 0, slopeLen * PPM, 6);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 0, slopeLen * PPM, 4);
        ctx.restore();

        // Ground line
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        ctx.lineTo(w, baseY);
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Angle arc label
        const arcR = 36;
        ctx.beginPath();
        ctx.arc(tipX, baseY, arcR, Math.PI, Math.PI + theta, false);
        ctx.strokeStyle = 'rgba(245,158,11,0.6)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font      = '12px Inter, sans-serif';
        ctx.fillText(`${angle}°`, tipX - arcR - 28, baseY - 10);

        // ── Block position ────────────────────────────────────────
        // s = 0 at tip, increases toward base
        const sClamp = clamp(this._s, 0, slopeLen - 0.3);
        const bCX    = tipX - sClamp * PPM * Math.cos(theta) + 0.25 * PPM * Math.sin(theta);
        const bCY    = tipY + sClamp * PPM * Math.sin(theta) + 0.25 * PPM * Math.cos(theta);

        ctx.save();
        ctx.translate(bCX, bCY);
        ctx.rotate(-theta);

        const bW = 0.4 * PPM;
        const bH = 0.4 * PPM;
        this._drawCrate(ctx, bW, bH);

        // Mass label
        ctx.fillStyle    = 'rgba(0,0,0,0.7)';
        ctx.font         = `bold ${clamp(Math.round(bH * 0.35), 8, 14)}px Inter, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mass}kg`, 0, 0);
        ctx.restore();

        // ── Force arrows ──────────────────────────────────────────
        const vecScale     = PPM * 0.012;
        const F_grav_total = mass * g;
        const F_normal     = mass * g * Math.cos(theta);
        const F_para       = mass * g * Math.sin(theta);
        const F_friction   = frictionless ? 0 : (this._slipping ? muKinetic * F_normal : Math.min(muStatic * F_normal, F_para));

        // Gravity (vertically down)
        drawVector(ctx, bCX, bCY, 0, F_grav_total, vecScale,
            VECTOR_COLORS.gravity, `W ${F_grav_total.toFixed(1)} N`, { invertY: false });

        // Normal force (perpendicular to slope = rotated gravity direction)
        const nx =  Math.sin(theta) * F_normal;
        const ny = -Math.cos(theta) * F_normal;
        drawVector(ctx, bCX, bCY, nx, ny, vecScale,
            VECTOR_COLORS.force, `N ${F_normal.toFixed(1)} N`, { invertY: false });

        // Friction (along slope upward if sliding)
        if (F_friction > 0.01 && this._slipping) {
            const fx =  Math.cos(theta) * F_friction;
            const fy = -Math.sin(theta) * F_friction;
            drawVector(ctx, bCX, bCY, fx, fy, vecScale,
                '#ef4444', `f_k ${F_friction.toFixed(1)} N`, { invertY: false });
        }

        // ── Status labels ─────────────────────────────────────────
        const critAngleDeg = frictionless ? 0 : Math.atan(muStatic) * 180 / Math.PI;
        ctx.fillStyle = this._slipping ? '#f87171' : '#10b981';
        ctx.font      = 'bold 13px Inter, sans-serif';
        ctx.fillText(this._slipping ? '▼ SLIDING' : '■ STATIC', 16, 28);

        ctx.fillStyle = '#64748b';
        ctx.font      = '12px Inter, sans-serif';
        if (!frictionless) {
            ctx.fillText(`Critical angle: ${critAngleDeg.toFixed(1)}°`, 16, 46);
        } else {
            ctx.fillText('Frictionless mode', 16, 46);
        }

        // Acceleration readout
        const accel   = this._slipping ? g * (Math.sin(theta) - muKinetic * Math.cos(theta)) : 0;
        ctx.fillText(`a = ${accel.toFixed(3)} m/s²  v = ${this._v.toFixed(3)} m/s`, w - 210, h - 16);
        ctx.fillText(`N = ${F_normal.toFixed(2)} N`, w - 210, h - 32);

        // ── Dev mode ─────────────────────────────────────────────
        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            ctx.fillText(`s=${this._s.toFixed(3)} v=${this._v.toFixed(3)} slip=${this._slipping} a=${accel.toFixed(3)}`, 8, h - 52);
        }
    },
};

export default sim;
