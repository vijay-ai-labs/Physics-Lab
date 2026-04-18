/* FILE: experiments/intermediate/mirror-image-formation/sim.js
   ============================================================
   Mirror Image Formation — Ray Tracing
   ============================================================
   Physics (real-is-positive sign convention):
     Mirror equation:  1/f = 1/v + 1/u  →  v = u·f / (u − f)
     Magnification:    m = −v / u
     Plane mirror:     f → ∞  →  v = −u,  m = 1

   Canvas layout:
     Principal axis is horizontal at y = h×0.45.
     Mirror is a vertical line at x = mirrorX.
     Object is to the left at x = mirrorX − u×PPM.

   Ray construction (2 principal rays, from object tip):
     Ray 1 (parallel): horizontal → reflects through focus F.
     Ray 2 (vertex):   through mirror vertex → equal-angle reflection.
   ============================================================ */

import { clamp, degToRad, drawGrid } from '../../../js/utils.js';

const PPM = 60;  // pixels per meter (optics scale)

// Draw an arrowhead at (x,y) pointing in direction (dx,dy)
function arrowHead(ctx, x, y, dx, dy, size = 8) {
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    const ux = dx / len, uy = dy / len;
    const lx = -uy * size * 0.5, ly = ux * size * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ux * size + lx, y - uy * size + ly);
    ctx.lineTo(x - ux * size - lx, y - uy * size - ly);
    ctx.closePath();
    ctx.fill();
}

const sim = {
    name: 'Mirror Image Formation',

    objective: 'Where does the image form in a curved mirror?',
    defaults: {
        mirrorType:  0,     // 0=plane, 1=concave, 2=convex
        objDist:     3.0,   // u (m) — object distance in front of mirror
        focalLen:    2.0,   // f (m) — focal length (only for curved mirrors)
        objHeight:   1.0,   // m — object height
    },

    controls: [
        { type: 'slider', key: 'mirrorType',  label: 'Mirror Type (0=Plane 1=Concave 2=Convex)',
          min: 0, max: 2, step: 1,
          tooltip: '0: flat; 1: converging (concave); 2: diverging (convex).' },
        { type: 'slider', key: 'objDist',     label: 'Object Distance u (m)',
          min: 0.3, max: 8, step: 0.1,
          tooltip: 'Distance from object to mirror. Try moving near focal length for concave.' },
        { type: 'slider', key: 'focalLen',    label: 'Focal Length f (m)',
          min: 0.5, max: 5, step: 0.1,
          tooltip: 'Focal length for concave/convex mirrors. Ignored for plane mirrors.' },
        { type: 'slider', key: 'objHeight',   label: 'Object Height (m)',
          min: 0.2, max: 3, step: 0.1,
          tooltip: 'Height of the object arrow.' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Image dist v (m) / Magnification m',
        datasets: [
            { key: 'v',  label: 'v image dist (m)',   color: '#38bdf8' },
            { key: 'm',  label: 'm magnification',    color: '#fde047' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:      0,
    _bob:    0,  // gentle vertical bob of object for animation
    _params: null,

    reset(params) {
        this._params = params;
        this._t      = 0;
        this._bob    = 0;
    },

    update(dt, params) {
        this._params = params;
        this._t     += dt;
        this._bob    = Math.sin(this._t * 0.6) * 0.06;  // very slight bob

        const { mirrorType, objDist: u, focalLen: f } = params;
        const type = Math.round(mirrorType);

        let v, m;
        if (type === 0) {
            // Plane mirror
            v = -u;
            m = 1;
        } else {
            const f_eff = type === 2 ? -Math.abs(f) : Math.abs(f);
            const denom = u - f_eff;
            v = Math.abs(denom) < 0.01 ? 9999 : u * f_eff / denom;
            m = Math.abs(u) < 0.001 ? 0 : -v / u;
        }

        return {
            t:    this._t,
            v:    parseFloat(v.toFixed(3)),
            m:    parseFloat(m.toFixed(3)),
            done: false,
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        if (!this._params) return;
        const { mirrorType, objDist: u, focalLen: f_raw, objHeight: hObj } = this._params;
        const type  = Math.round(mirrorType);
        const f_eff = type === 2 ? -Math.abs(f_raw) : Math.abs(f_raw);

        // Compute image
        let v, m;
        if (type === 0) {
            v = -u; m = 1;
        } else {
            const denom = u - f_eff;
            v = Math.abs(denom) < 0.01 ? null : u * f_eff / denom;
            m = (v !== null && Math.abs(u) > 0.001) ? -v / u : 0;
        }

        // Canvas layout
        const axisY   = h * 0.48;
        const mirrorX = w * 0.60;   // mirror sits at 60% of canvas width
        const mirrorH = h * 0.36;

        // ── Principal axis ────────────────────────────────
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, axisY); ctx.lineTo(w, axisY); ctx.stroke();
        ctx.setLineDash([]);

        // ── Mirror surface ─────────────────────────────────
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth   = 3;
        if (type === 0) {
            // Flat line
            ctx.beginPath();
            ctx.moveTo(mirrorX, axisY - mirrorH / 2);
            ctx.lineTo(mirrorX, axisY + mirrorH / 2);
            ctx.stroke();
        } else {
            // Arc indicating curvature
            const arcR  = Math.abs(f_eff) * PPM * 2;
            const sweep = 0.45;
            const cx0   = type === 1
                ? mirrorX - arcR            // concave center to left
                : mirrorX + arcR;           // convex center to right
            const startA = type === 1 ? Math.PI - sweep : -sweep;
            const endA   = type === 1 ? Math.PI + sweep : sweep;
            ctx.beginPath();
            ctx.arc(cx0, axisY, arcR, startA, endA);
            ctx.stroke();
        }

        // Focal point(s)
        const drawFP = (fx, label) => {
            ctx.beginPath();
            ctx.arc(fx, axisY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.fillStyle = '#94a3b8';
            ctx.font      = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, fx, axisY + 16);
            ctx.textAlign = 'left';
        };
        if (type !== 0) {
            const f_px = f_eff * PPM;
            drawFP(mirrorX - f_px, 'F');        // front focus
            drawFP(mirrorX - 2 * f_px, 'C');    // center of curvature
            if (type === 2) drawFP(mirrorX + Math.abs(f_px), 'F*'); // virtual focus behind
        }

        // ── Object ────────────────────────────────────────
        const objX   = mirrorX - u * PPM;
        const objH   = (hObj + this._bob) * PPM;
        const drawArrow = (ax, ay_base, ay_tip, color, dashed) => {
            if (dashed) ctx.setLineDash([5, 4]);
            ctx.strokeStyle = color; ctx.fillStyle = color;
            ctx.lineWidth   = 2;
            ctx.beginPath(); ctx.moveTo(ax, ay_base); ctx.lineTo(ax, ay_tip); ctx.stroke();
            ctx.setLineDash([]);
            arrowHead(ctx, ax, ay_tip, 0, Math.sign(ay_tip - ay_base), 8);
            // base tick
            ctx.beginPath(); ctx.moveTo(ax - 4, ay_base); ctx.lineTo(ax + 4, ay_base); ctx.stroke();
        };

        drawArrow(objX, axisY, axisY - objH, '#10b981', false);

        // ── Image ────────────────────────────────────────
        if (v !== null && isFinite(v)) {
            const imgX  = mirrorX - v * PPM;  // v>0: real (left of mirror), v<0: virtual (right)
            const imgH  = m * objH;
            const isReal   = v > 0;
            const isVirtual = !isReal;

            drawArrow(imgX, axisY, axisY - imgH, isReal ? '#38bdf8' : '#818cf8', isVirtual);

            // Behind-mirror region shading
            if (isVirtual && imgX > mirrorX - 2) {
                ctx.fillStyle = 'rgba(30,41,59,0.35)';
                ctx.fillRect(mirrorX, axisY - mirrorH / 2, w - mirrorX, mirrorH);
            }

            // ── Ray 1: parallel ray ────────────────────────
            const tipY   = axisY - objH;
            const hitX1  = mirrorX;
            const hitY1  = tipY;  // parallel → hits at same height

            const drawRay = (x1, y1, x2, y2, xEnd, color, dashed) => {
                if (dashed) ctx.setLineDash([5, 4]);
                ctx.strokeStyle = color; ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.moveTo(x1, y1);
                ctx.lineTo(xEnd !== undefined ? xEnd : x2, y2);
                ctx.stroke();
                ctx.setLineDash([]);
            };

            if (type === 0) {
                // Plane mirror rays
                const midY = (tipY + (axisY - imgH)) / 2;
                // Ray: object tip → mirror at same height → image tip
                drawRay(objX, tipY, mirrorX, tipY, mirrorX, '#7c3aed', false);
                drawRay(mirrorX, tipY, mirrorX, tipY, imgX, '#7c3aed', true);
            } else {
                // Curved mirror: ray 1 (parallel → through/from F)
                const f_px = f_eff * PPM;
                const fX   = mirrorX - f_px;
                drawRay(objX, tipY, mirrorX, tipY, mirrorX, '#6366f1', false);
                if (isReal) {
                    // Reflected ray: from (hitX1, hitY1) through F to image tip
                    drawRay(mirrorX, hitY1, imgX, axisY - imgH, undefined, '#6366f1', false);
                } else {
                    // Virtual: extend backward from mirror
                    drawRay(mirrorX, hitY1, mirrorX + 80, hitY1, undefined, '#6366f1', true);
                    drawRay(mirrorX, hitY1, imgX, axisY - imgH, undefined, '#6366f1', false);
                }

                // Ray 2: vertex ray (through mirror vertex at axisY)
                drawRay(objX, tipY, mirrorX, axisY, mirrorX, '#f59e0b', false);
                if (isReal) {
                    drawRay(mirrorX, axisY, imgX, axisY - imgH, undefined, '#f59e0b', false);
                } else {
                    drawRay(mirrorX, axisY, imgX, axisY - imgH, undefined, '#f59e0b', true);
                    const extX2 = mirrorX + (mirrorX - imgX) * 0.6;
                    const extY2 = axisY + (axisY - (axisY - imgH)) * 0.6;
                    drawRay(mirrorX, axisY, extX2, extY2, undefined, '#f59e0b', false);
                }
            }
        }

        // ── Labels ────────────────────────────────────────
        const typeNames = ['Plane', 'Concave', 'Convex'];
        ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(`Mirror: ${typeNames[type]}`, 14, 26);
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`u = ${u.toFixed(2)} m`, 14, 44);
        if (type !== 0) ctx.fillText(`f = ${f_eff.toFixed(2)} m`, 14, 60);
        if (v !== null && isFinite(v)) {
            ctx.fillText(`v = ${v.toFixed(2)} m  (${v > 0 ? 'real' : 'virtual'})`, 14, type !== 0 ? 76 : 60);
            ctx.fillText(`m = ${m.toFixed(2)}  (${m > 0 ? 'upright' : 'inverted'})`, 14, type !== 0 ? 92 : 76);
        } else {
            ctx.fillText('No image (object at focus)', 14, 76);
        }

        ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
        ctx.fillText(`t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24'; ctx.font = '10px monospace';
            ctx.fillText(`v=${v?.toFixed(2)} m=${m?.toFixed(2)}`, 8, h - 30);
        }
    },
};

export default sim;
