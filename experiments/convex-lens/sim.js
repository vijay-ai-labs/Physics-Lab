/* FILE: experiments/convex-lens/sim.js
   ============================================================
   Geometric Optics (Convex Lens) — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - FIXED Ray 3 denominator bug: was `(cx - fPx - objX + cx)` =
         `2cx - fPx - objX` (wrong). Corrected to `(cx - fPx - objX)`.
         Ray 3 goes from object-top toward front focal point F, hits
         the lens at the corrected y-coordinate, then exits parallel
         to the principal axis. Added the missing second segment from
         the lens to imgTopY.
       - Replaced magic number 999 singularity guard with proper
         `Math.abs(u - f) < 0.5` check and "Image at ∞" message.
       - When v < 0 (virtual image, object inside focal length), Ray 1
         and Ray 2 extensions behind the lens are drawn dashed to show
         where the virtual image forms.
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';

const sim = {
    name: 'Geometric Optics — Convex Lens',


    objective: 'Where does the image form for a given object distance?',
    defaults: { focalLength: 15, objectDist: 30, objectHeight: 5 },

    controls: [
        { type: 'slider', key: 'focalLength', label: 'Focal Length (cm)', min: 5, max: 40, step: 1, tooltip: 'Focal length of the convex lens. Shorter focal length = stronger, more converging lens.' },
        { type: 'slider', key: 'objectDist', label: 'Object Distance (cm)', min: 5, max: 80, step: 1, tooltip: 'Distance of the object from the lens. Object inside focal length produces a virtual image.' },
        { type: 'slider', key: 'objectHeight', label: 'Object Height (cm)', min: 1, max: 15, step: 0.5, tooltip: 'Height of the object. Determines magnification scale of the formed image.' },
    ],

    graphConfig: {
        xAxis: 'Object Distance (cm)',
        yAxis: 'Image Distance (cm)',
        datasets: [
            { key: 'imageDist', label: 'Image Distance', color: '#ec4899' },
            { key: 'magnification', label: 'Magnification (×10)', color: '#6366f1' },
        ],
    },

    _t: 0,
    _params: { focalLength: 15, objectDist: 30, objectHeight: 5 },
    _plotStep: 0,
    _done: false,

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._plotStep = 5;
        this._done = false;
    },

    update(dt) {
        if (this._done) return null;
        this._t += dt;
        const { focalLength } = this._params;

        if (this._plotStep <= 80) {
            const u = this._plotStep;
            let imageDist, magnification;
            if (Math.abs(u - focalLength) < 0.5) {
                // Object at focal point → image at infinity; skip this point
                this._plotStep += 1;
                return null;
            }
            const v = (u * focalLength) / (u - focalLength);
            const m = -v / u;
            imageDist = Math.max(-200, Math.min(200, v)); // clamp for chart
            magnification = m * 10;
            const result = { t: u, x: u, imageDist, magnification, done: this._plotStep >= 80 };
            this._plotStep += 1;
            if (this._plotStep >= 80) this._done = true;
            return result;
        }
        return null;
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);

        const { focalLength, objectDist, objectHeight } = this._params;
        const cx = w * 0.45;
        const cy = h / 2;
        const scale = Math.min(w, h) / 120;

        // Principal axis
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, cy);
        ctx.lineTo(w - 20, cy);
        ctx.stroke();

        // Lens
        ctx.strokeStyle = hexToRgba('#38bdf8', 0.7);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h * 0.35);
        ctx.quadraticCurveTo(cx + 12, cy, cx, cy + h * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - h * 0.35);
        ctx.quadraticCurveTo(cx - 12, cy, cx, cy + h * 0.35);
        ctx.stroke();

        // Arrowheads on lens
        ctx.fillStyle = hexToRgba('#38bdf8', 0.7);
        ctx.beginPath();
        ctx.moveTo(cx, cy - h * 0.35);
        ctx.lineTo(cx - 8, cy - h * 0.35 + 12);
        ctx.lineTo(cx + 8, cy - h * 0.35 + 12);
        ctx.closePath();
        ctx.fill();

        // Focal points
        const fPx = focalLength * scale;
        ctx.fillStyle = '#f59e0b';
        ['F', 'F\''].forEach((label, i) => {
            const fx = i === 0 ? cx - fPx : cx + fPx;
            ctx.beginPath();
            ctx.arc(fx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(label, fx - 4, cy + 20);
            ctx.fillStyle = '#f59e0b';
        });

        // Object arrow
        const objX = cx - objectDist * scale;
        const objTopY = cy - objectHeight * scale;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(objX, cy);
        ctx.lineTo(objX, objTopY);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(objX, objTopY);
        ctx.lineTo(objX - 5, objTopY + 10);
        ctx.lineTo(objX + 5, objTopY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Object', objX - 18, cy + 16);

        // Image calculation
        const u = objectDist;
        const f = focalLength;
        if (Math.abs(u - f) < 0.5) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText('Object at focus — Image at infinity!', w / 2 - 130, 30);
        } else {
            const v = (u * f) / (u - f);
            const m = -v / u;
            const imgH = objectHeight * m;
            const imgX = cx + v * scale;
            const imgTopY = cy - imgH * scale;
            const isVirtual = v < 0;

            // ── Ray traces ─────────────────────────────────────────────────
            ctx.lineWidth = 1;

            // Ray 1: parallel to axis → refracted through F' (real) or extension (virtual)
            ctx.strokeStyle = hexToRgba('#ef4444', 0.55);
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(objX, objTopY);
            ctx.lineTo(cx, objTopY);         // to lens (parallel segment)
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(cx, objTopY);
            ctx.lineTo(imgX, imgTopY);       // from lens through F' to image
            ctx.stroke();
            if (isVirtual) {
                // dashed extension backward past lens
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = hexToRgba('#ef4444', 0.25);
                ctx.beginPath();
                ctx.moveTo(cx, objTopY);
                ctx.lineTo(cx - (imgX - cx), objTopY - (imgTopY - objTopY));
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Ray 2: through optical centre (undeviated)
            ctx.strokeStyle = hexToRgba('#10b981', 0.55);
            ctx.beginPath();
            ctx.moveTo(objX, objTopY);
            ctx.lineTo(imgX, imgTopY);
            ctx.stroke();
            if (isVirtual) {
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = hexToRgba('#10b981', 0.25);
                ctx.beginPath();
                ctx.moveTo(imgX, imgTopY);
                ctx.lineTo(imgX - (objX - imgX), imgTopY - (objTopY - imgTopY));
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Ray 3: from object top toward front focal point F, then exits parallel
            // y at lens (x=cx): parametric on ray from (objX, objTopY) toward (cx-fPx, cy)
            // t = (cx - objX) / (cx - fPx - objX)  → y_lens = objTopY + (cy - objTopY)*t
            const frontFocalDenom = (cx - fPx) - objX;  // correct denominator
            if (Math.abs(frontFocalDenom) > 0.1) {
                const tLens = (cx - objX) / frontFocalDenom;
                const yAtLens = objTopY + (cy - objTopY) * tLens;

                ctx.strokeStyle = hexToRgba('#f59e0b', 0.55);
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(objX, objTopY);
                ctx.lineTo(cx, yAtLens);     // segment toward F, hits lens
                ctx.stroke();
                ctx.setLineDash([]);
                // After lens: parallel to axis toward image
                ctx.beginPath();
                ctx.moveTo(cx, yAtLens);
                ctx.lineTo(imgX, yAtLens);   // exits parallel; meets at imgTopY if correct
                ctx.stroke();
            }

            ctx.setLineDash([]);

            // Image arrow
            const imgColor = isVirtual ? '#f472b6' : '#ec4899';
            ctx.strokeStyle = imgColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(imgX, cy);
            ctx.lineTo(imgX, imgTopY);
            ctx.stroke();
            ctx.fillStyle = imgColor;
            ctx.beginPath();
            ctx.moveTo(imgX, imgTopY);
            ctx.lineTo(imgX - 5, imgTopY + (imgH > 0 ? 10 : -10));
            ctx.lineTo(imgX + 5, imgTopY + (imgH > 0 ? 10 : -10));
            ctx.closePath();
            ctx.fill();

            ctx.font = '11px Inter, sans-serif';
            ctx.fillStyle = imgColor;
            ctx.fillText(isVirtual ? 'Virtual Image' : 'Image', imgX - 18, cy + 16);

            // Info
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter, sans-serif';
            const nature = isVirtual ? 'Virtual, Erect' : (m < 0 ? 'Real, Inverted' : 'Real, Erect');
            ctx.fillText(`v=${v.toFixed(1)}cm  m=${m.toFixed(2)}  ${nature}`, 12, h - 12);
        }
    },
};

export default sim;
