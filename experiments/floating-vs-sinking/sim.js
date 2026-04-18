/* FILE: experiments/floating-vs-sinking/sim.js
   ============================================================
   Floating vs Sinking — Physics Simulation
   ============================================================
   Physics (1D vertical settling):
     Object dropped from above fluid surface.
     While above fluid:   F_net = −m·g  (free fall)
     While in fluid:      F_net = F_buoyancy − Weight
                          F_b = ρ_fluid · V_submerged · g
                          V_submerged = V · clamp(depth / h_obj, 0, 1)
                          where depth = how far below surface the top is

     Equilibrium float depth:
         ρ_obj · V · g = ρ_fluid · V_sub · g
         V_sub / V = ρ_obj / ρ_fluid
         float_depth = h_obj · (ρ_obj / ρ_fluid)   (if ρ_obj < ρ_fluid)

     Drag damping (water resistance): F_drag = −k · v (linear Stokes drag)
     so the object settles to equilibrium instead of oscillating forever.

   Integration: Semi-implicit Euler  (v += a·dt,  y += v·dt)
   Dev mode: window.uxDev = true shows numeric overlay.
   ============================================================ */

import { clamp, hexToRgba, drawGrid } from '../../js/utils.js';
import { drawVector, VECTOR_COLORS } from '../../js/vectorRenderer.js';

// Visual scale: pixels per meter
const PPM = 120;
// Linear drag coefficient in fluid (N·s/m) — keeps settling smooth
const FLUID_DRAG = 8;

const sim = {
    name: 'Floating vs Sinking',

    objective: 'Will an object float or sink based on its density?',
    defaults: {
        rhoObj:    500,    // Object density (kg/m³)
        rhoFluid:  1000,   // Fluid density (kg/m³)  — water ≈ 1000
        volume:    0.01,   // Object volume (m³)
        gravity:   9.81,   // Gravity (m/s²)
    },

    controls: [
        {
            type: 'slider', key: 'rhoObj', label: 'Object Density (kg/m³)',
            min: 100, max: 3000, step: 10,
            tooltip: 'Density of the object. Less than fluid density → floats; greater → sinks.',
        },
        {
            type: 'slider', key: 'rhoFluid', label: 'Fluid Density (kg/m³)',
            min: 800, max: 1400, step: 10,
            tooltip: 'Density of the fluid. Pure water ≈ 1000, seawater ≈ 1025, honey ≈ 1400.',
        },
        {
            type: 'slider', key: 'volume', label: 'Object Volume (m³)',
            min: 0.001, max: 0.1, step: 0.001,
            tooltip: 'Volume of the object. Larger objects experience greater buoyant force.',
        },
        {
            type: 'slider', key: 'gravity', label: 'Gravity (m/s²)',
            min: 1, max: 20, step: 0.1,
            tooltip: 'Gravitational acceleration. Try Moon gravity (1.62) or Jupiter (24.8)!',
        },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Force (N) / Depth (m)',
        datasets: [
            { key: 'buoyantForce', label: 'Buoyant Force (N)', color: '#818cf8' },
            { key: 'depth',        label: 'Submerged Depth (m)', color: '#38bdf8' },
        ],
    },

    // ── Internal state ──────────────────────────────────────────
    _t:      0,
    _y:      0,      // y position of object CENTER in meters (0 = fluid surface, + = below)
    _v:      0,      // vertical velocity (m/s, positive = downward)
    _params: null,

    // Derived geometry
    _h_obj:  0,      // object side length (cube root of volume) in meters
    _mass:   0,

    reset(params) {
        this._params = params;
        this._t      = 0;
        this._v      = 0;
        // Start object above the fluid surface
        const vol    = params.volume;
        this._h_obj  = Math.cbrt(vol);
        this._mass   = params.rhoObj * vol;
        // Start so that the bottom of object is 1 m above fluid surface
        this._y      = -(this._h_obj / 2 + 1.0);
    },

    update(dt, params) {
        this._params = params;
        const { rhoObj, rhoFluid, volume, gravity } = params;
        const g = gravity;

        const h_obj   = Math.cbrt(volume);
        const mass    = rhoObj * volume;
        this._h_obj   = h_obj;
        this._mass    = mass;
        const weight  = mass * g;

        // How far the BOTTOM of the object is below the fluid surface
        // _y is center position; positive = below surface
        const bottomDepth = this._y + h_obj / 2;   // depth of bottom edge
        const submergedH  = clamp(bottomDepth, 0, h_obj);  // submerged height (0..h_obj)
        const V_sub       = volume * (submergedH / h_obj);

        const F_buoy = rhoFluid * V_sub * g;
        const F_drag = (submergedH > 0) ? -FLUID_DRAG * this._v : 0;
        const F_net  = F_buoy - weight + F_drag;

        const a    = F_net / mass;
        this._v   += a * dt;
        this._y   += this._v * dt;

        // Hard floor at 5 m below surface
        const floorDepth = 4.5;
        if (this._y > floorDepth) {
            this._y = floorDepth;
            this._v = 0;
        }

        this._t += dt;

        // depth reported = how many meters of object are submerged
        const subDepth = clamp(this._y + h_obj / 2, 0, h_obj);

        return {
            t:            this._t,
            buoyantForce: F_buoy,
            depth:        subDepth,
            done:         false,
        };
    },

    draw(ctx, w, h) {
        // ── Background ────────────────────────────────────────────
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const params = this._params || {};
        const { rhoObj = 500, rhoFluid = 1000, volume = 0.01, gravity = 9.81 } = params;

        const surfaceY = h * 0.38;   // pixel y for fluid surface
        const floorY   = h * 0.88;   // pixel y for tank floor
        const tankH    = floorY - surfaceY;  // pixels of fluid column

        // ── Fluid ─────────────────────────────────────────────────
        // Color gradient: lighter blue at surface, deeper below
        const grad = ctx.createLinearGradient(0, surfaceY, 0, floorY);
        grad.addColorStop(0, 'rgba(56,189,248,0.28)');
        grad.addColorStop(1, 'rgba(15,23,42,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(w * 0.1, surfaceY, w * 0.8, tankH);

        // Tank border
        ctx.strokeStyle = 'rgba(56,189,248,0.4)';
        ctx.lineWidth   = 2;
        ctx.strokeRect(w * 0.1, surfaceY, w * 0.8, tankH);

        // Surface wave shimmer
        ctx.beginPath();
        ctx.moveTo(w * 0.1, surfaceY);
        for (let sx = w * 0.1; sx <= w * 0.9; sx += 4) {
            const wave = Math.sin(sx * 0.08 + this._t * 2) * 2;
            ctx.lineTo(sx, surfaceY + wave);
        }
        ctx.lineTo(w * 0.9, surfaceY);
        ctx.strokeStyle = 'rgba(125,211,252,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fluid label
        ctx.fillStyle = 'rgba(125,211,252,0.55)';
        ctx.font      = '11px Inter, sans-serif';
        ctx.fillText(`ρ_fluid = ${rhoFluid} kg/m³`, w * 0.12, surfaceY + 18);

        // ── Depth ruler ───────────────────────────────────────────
        const rulerX = w * 0.88;
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.lineWidth = 1;
        for (let d = 0; d <= 4; d++) {
            const ry = surfaceY + (d / 4.5) * tankH;
            ctx.beginPath(); ctx.moveTo(rulerX - 5, ry); ctx.lineTo(rulerX + 5, ry); ctx.stroke();
            ctx.fillStyle = 'rgba(100,116,139,0.7)';
            ctx.font = '9px Inter, sans-serif';
            ctx.fillText(`${d}m`, rulerX + 7, ry + 4);
        }

        // ── Object ────────────────────────────────────────────────
        const h_obj   = this._h_obj || Math.cbrt(volume);
        const objPxH  = h_obj * PPM;
        const objPxW  = objPxH;
        // _y = center depth below surface (negative = above)
        const objCY   = surfaceY + this._y * PPM;
        const objTop  = objCY - objPxH / 2;
        const objLeft = w / 2 - objPxW / 2;

        // Object color shifts with density ratio
        const ratio   = rhoObj / rhoFluid;
        // ratio < 1 (floats) → cyan; ratio > 1 (sinks) → orange-red
        const hue     = ratio < 1 ? 195 : 15;
        const sat     = 70 + Math.abs(ratio - 1) * 40;
        const lit     = 55 + (1 - clamp(ratio, 0, 2)) * 15;
        ctx.fillStyle   = `hsl(${hue},${sat}%,${lit}%)`;
        ctx.strokeStyle = `hsl(${hue},${sat}%,${lit + 20}%)`;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.roundRect(objLeft, objTop, objPxW, objPxH, 4);
        ctx.fill();
        ctx.stroke();

        // Density label on object
        ctx.fillStyle    = 'rgba(0,0,0,0.7)';
        ctx.font         = `bold ${clamp(Math.round(objPxH * 0.3), 8, 14)}px Inter, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rhoObj}`, w / 2, objCY);
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        // ── Force arrows ──────────────────────────────────────────
        const mass       = this._mass || rhoObj * volume;
        const weight     = mass * gravity;
        const bottomDepth = this._y + h_obj / 2;
        const subH       = clamp(bottomDepth, 0, h_obj);
        const V_sub      = volume * (subH / h_obj);
        const F_buoy     = rhoFluid * V_sub * gravity;
        const arrowScale = 0.015;

        // Weight arrow (downward from center)
        if (weight > 0.1) {
            drawVector(ctx, w / 2, objCY, 0, weight, arrowScale,
                VECTOR_COLORS.gravity, `W ${weight.toFixed(1)} N`, { invertY: false });
        }
        // Buoyancy arrow (upward)
        if (F_buoy > 0.1) {
            drawVector(ctx, w / 2, objCY, 0, -F_buoy, arrowScale,
                VECTOR_COLORS.buoyancy, `F_b ${F_buoy.toFixed(1)} N`, { invertY: false });
        }

        // ── Status label ──────────────────────────────────────────
        const equilibriumDepth = ratio < 1 ? h_obj * ratio : h_obj;
        const statusText       = ratio < 1 ? `Floating (${(ratio * 100).toFixed(0)}% submerged)` : 'Sinking / Resting on floor';
        ctx.fillStyle = ratio < 1 ? '#10b981' : '#f87171';
        ctx.font      = 'bold 13px Inter, sans-serif';
        ctx.fillText(statusText, 16, 28);

        ctx.fillStyle = '#64748b';
        ctx.font      = '11px Inter, sans-serif';
        ctx.fillText(`Equilibrium depth: ${equilibriumDepth.toFixed(3)} m`, 16, 46);
        ctx.fillText(`v = ${this._v.toFixed(3)} m/s`, w - 130, h - 16);

        // ── Dev mode ─────────────────────────────────────────────
        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            ctx.fillText(`y=${this._y.toFixed(3)} v=${this._v.toFixed(3)} Fb=${F_buoy.toFixed(2)} W=${weight.toFixed(2)} subH=${subH.toFixed(3)}`, 8, h - 48);
        }
    },
};

export default sim;
