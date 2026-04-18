/* FILE: experiments/shadow-length-change/sim.js
   ============================================================
   Shadow Length Change — Physics Simulation
   ============================================================
   Physics (similar triangles / ray geometry):
     A point light source at (Lx, Ly) above a flat ground plane.
     A vertical opaque object (pole) at x = Ox, height = h_obj.
     The shadow of the pole tip falls where the ray from the light
     through (Ox, h_obj) intersects y = 0 (ground).

     Line equation through (Lx, Ly) and (Ox, h_obj):
       parametric:  P = L + t·(O_top − L)
       at y=0:      t = Ly / (Ly − h_obj)   (requires Ly > h_obj)
       Sx = Lx + (Ox − Lx) · t

     Shadow length = |Sx − Ox|

     Tangent formula (when light is directly above and to the side):
       shadow_length = h_obj / tan(θ)
       where θ = elevation angle of the sun above horizon.

   "Animate sun" mode sweeps the sun angle from 80° → 5° over 20 s,
   simulating morning → noon → evening.

   Dev mode: window.uxDev = true shows computed values.
   ============================================================ */

import { degToRad, clamp, hexToRgba, drawGrid } from '../../js/utils.js';

// Pixels per meter for scene rendering
const PPM = 40;

const sim = {
    name: 'Shadow Length Change',

    objective: 'How does shadow length change with sun angle?',
    defaults: {
        objHeight:    3,     // Object (pole) height in meters
        lightAngle:   45,    // Sun elevation angle in degrees (from horizon)
        lightDist:    20,    // Horizontal distance of light from object (m)
        animateSun:   false, // Animate sun sweep
    },

    controls: [
        {
            type: 'slider', key: 'objHeight', label: 'Object Height (m)',
            min: 0.5, max: 10, step: 0.1,
            tooltip: 'Height of the vertical pole casting a shadow.',
        },
        {
            type: 'slider', key: 'lightAngle', label: 'Sun Elevation (°)',
            min: 5, max: 85, step: 1,
            tooltip: 'Elevation angle of the light source above the horizon. Low angle → long shadow.',
        },
        {
            type: 'slider', key: 'lightDist', label: 'Light Distance (m)',
            min: 5, max: 50, step: 0.5,
            tooltip: 'Horizontal distance between the light source and the base of the pole.',
        },
        {
            type: 'toggle', key: 'animateSun', label: '🌅 Animate Sun',
            tooltip: 'Sweep sun elevation angle to animate the shadow changing through the day.',
        },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Shadow Length (m)',
        datasets: [
            { key: 'shadowLength', label: 'Shadow Length (m)', color: '#f59e0b' },
        ],
    },

    // ── Internal state ──────────────────────────────────────────
    _t:            0,
    _currentAngle: 45,   // live angle (modified during animation)
    _params:       null,

    reset(params) {
        this._params       = params;
        this._t            = 0;
        this._currentAngle = params.lightAngle;
    },

    update(dt, params) {
        this._params = params;
        this._t     += dt;

        if (params.animateSun) {
            // Sweep angle from 80° down to 5° over 20 s, then repeat
            const cycle = this._t % 20;
            this._currentAngle = 80 - (75 * cycle / 20);
        } else {
            this._currentAngle = params.lightAngle;
        }

        const shadow = this._computeShadow(params);
        return {
            t:            this._t,
            shadowLength: shadow.length,
            done:         false,
        };
    },

    /** Compute shadow geometry given current params + angle.
     *  Returns { Lx, Ly, Ox, Sx, shadowLength } in meters. */
    _computeShadow(params) {
        const h    = params.objHeight;
        const dist = params.lightDist;
        const ang  = degToRad(this._currentAngle);

        // Light is to the LEFT of the object (sun in the east = morning)
        const Ox = 0;          // object x (ground reference)
        // Light position: elevated at angle from horizontal
        const Lx = -dist;      // left of object
        const Ly = dist * Math.tan(ang);  // height of light

        let shadowLength = 0;
        let Sx = Ox;

        if (Ly > h + 0.001) {
            // Ray from (Lx, Ly) through (Ox, h) to y=0
            // t_param = Ly / (Ly - h)
            const t_param = Ly / (Ly - h);
            Sx = Lx + (Ox - Lx) * t_param;
            shadowLength = Math.max(0, Sx - Ox);   // shadow extends to the right
        } else {
            // Light below object top: shadow is infinitely long (cap visually)
            shadowLength = 999;
            Sx = Ox + 999;
        }

        return { Lx, Ly, Ox, Sx: clamp(Sx, Ox, Ox + 100), shadowLength: clamp(shadowLength, 0, 100) };
    },

    draw(ctx, w, h) {
        // ── Background ────────────────────────────────────────────
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const params  = this._params || {};
        const { objHeight = 3, lightDist = 20 } = params;

        // ── Sky gradient ──────────────────────────────────────────
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
        skyGrad.addColorStop(0, 'rgba(15,23,42,0.9)');
        skyGrad.addColorStop(1, 'rgba(30,41,59,0.4)');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.65);

        const groundY = h * 0.65;    // pixel y for ground level
        const originX = w * 0.45;    // pixel x for pole base

        // ── Ground ────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(51,65,85,0.6)';
        ctx.fillRect(0, groundY, w, h - groundY);
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.strokeStyle = 'rgba(100,116,139,0.5)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        // ── Compute geometry ──────────────────────────────────────
        const shadow  = this._computeShadow(params);
        const { Lx, Ly } = shadow;

        // Convert meters → pixels  (PPM=40 px/m, origin at [originX, groundY])
        const mToPx = (mx, my) => ({
            x: originX + mx * PPM,
            y: groundY - my * PPM,
        });

        const poleBase  = mToPx(0, 0);
        const poleTop   = mToPx(0, objHeight);
        const lightPx   = mToPx(Lx, Ly);
        const shadowTip = mToPx(shadow.Sx, 0);

        // ── Shadow on ground ──────────────────────────────────────
        if (shadow.shadowLength < 90) {
            ctx.beginPath();
            ctx.moveTo(poleBase.x, poleBase.y);
            ctx.lineTo(Math.min(shadowTip.x, w), groundY);
            ctx.strokeStyle = 'rgba(15,23,42,0.85)';
            ctx.lineWidth   = 8;
            ctx.stroke();

            // Shadow label
            ctx.fillStyle = 'rgba(245,158,11,0.8)';
            ctx.font      = '11px Inter, sans-serif';
            const midSX   = (poleBase.x + Math.min(shadowTip.x, w)) / 2;
            ctx.fillText(`${shadow.shadowLength.toFixed(2)} m`, midSX - 14, groundY + 18);
        } else {
            ctx.fillStyle = '#f87171';
            ctx.font      = '11px Inter, sans-serif';
            ctx.fillText('Shadow extends off-screen', originX + 10, groundY + 18);
        }

        // ── Light ray (dashed) ────────────────────────────────────
        if (lightPx.x >= 0 && lightPx.x < w && lightPx.y > 0 && shadow.shadowLength < 90) {
            ctx.beginPath();
            ctx.setLineDash([6, 4]);
            ctx.moveTo(lightPx.x, lightPx.y);
            ctx.lineTo(poleTop.x, poleTop.y);
            ctx.lineTo(Math.min(shadowTip.x, w), groundY);
            ctx.strokeStyle = 'rgba(253,224,71,0.55)';
            ctx.lineWidth   = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // ── Pole ─────────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(poleBase.x, poleBase.y);
        ctx.lineTo(poleTop.x, poleTop.y);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth   = 4;
        ctx.stroke();

        // Pole height annotation
        ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(poleTop.x + 14, poleTop.y); ctx.lineTo(poleBase.x + 14, poleBase.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`h = ${objHeight.toFixed(1)} m`, poleTop.x + 18, (poleTop.y + poleBase.y) / 2);

        // ── Sun / Light source ────────────────────────────────────
        const sunInFrame = lightPx.x > 10 && lightPx.x < w - 10 && lightPx.y > 10;
        if (sunInFrame) {
            const grad = ctx.createRadialGradient(lightPx.x, lightPx.y, 0, lightPx.x, lightPx.y, 30);
            grad.addColorStop(0, 'rgba(253,224,71,0.9)');
            grad.addColorStop(0.4, 'rgba(251,191,36,0.5)');
            grad.addColorStop(1, 'rgba(251,191,36,0)');
            ctx.beginPath();
            ctx.arc(lightPx.x, lightPx.y, 30, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(lightPx.x, lightPx.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#fde047';
            ctx.fill();
            // Angle label
            ctx.fillStyle = '#fde047';
            ctx.font      = '11px Inter, sans-serif';
            ctx.fillText(`${this._currentAngle.toFixed(1)}°`, lightPx.x + 14, lightPx.y - 8);
        } else {
            // Draw arrow indicating off-screen sun direction
            const ang = degToRad(this._currentAngle);
            const ex  = Math.max(10, originX - lightDist * PPM * 0.3);
            ctx.fillStyle = '#fde047';
            ctx.font      = '11px Inter, sans-serif';
            ctx.fillText(`☀ ${this._currentAngle.toFixed(1)}° (off-screen ←)`, 12, 30);
        }

        // ── Info overlay ──────────────────────────────────────────
        ctx.fillStyle = 'rgba(100,116,139,0.8)';
        ctx.font      = '12px Inter, sans-serif';
        const shadowStr = shadow.shadowLength < 90
            ? `Shadow = ${shadow.shadowLength.toFixed(2)} m`
            : 'Shadow = ∞';
        ctx.fillText(shadowStr, 14, h - 32);
        ctx.fillText(`Angle = ${this._currentAngle.toFixed(1)}°  t = ${this._t.toFixed(1)} s`, 14, h - 16);

        // ── Dev mode ─────────────────────────────────────────────
        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            ctx.fillText(`Lx=${Lx.toFixed(1)} Ly=${Ly.toFixed(1)} Sx=${shadow.Sx.toFixed(2)} len=${shadow.shadowLength.toFixed(2)}`, 8, h - 52);
        }
    },
};

export default sim;
