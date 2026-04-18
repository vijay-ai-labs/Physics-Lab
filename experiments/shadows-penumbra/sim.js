/* FILE: experiments/shadows-penumbra/sim.js
   ============================================================
   Shadows & Penumbra — Physics Simulation
   ============================================================
   Physics (geometric ray sampling):
     An extended circular light source (radius r_src) sits above an
     opaque circular occluder. A screen is placed further away.

     For each pixel column on the screen we sample N_SAMPLES points
     distributed across the source disc. A sample point is "blocked"
     if the line from that sample to the screen point passes through
     the occluder disc. The intensity at that screen point equals
     the fraction of unblocked samples.

     intensity(x) = (# unblocked samples) / N_SAMPLES

     Umbra:    intensity = 0   (all samples blocked)
     Penumbra: 0 < intensity < 1  (partial blockage)
     Full lit: intensity = 1   (no samples blocked)

   Geometry (2-D side view, y-axis = height):
     Source center:   (sx, sy)  sy determined by sourceHeight param
     Occluder center: (ox, oy)  oy = sourceHeight / 2 (midpoint)
     Screen:          x = screenX

   Performance:
     N_SAMPLES = 32 per screen column
     Screen columns computed analytically, not pixel by pixel
     Result cached per frame; only recomputed when params change.

   Dev mode: window.uxDev = true
   ============================================================ */

import { clamp, hexToRgba, drawGrid } from '../../js/utils.js';

// Number of ray samples across the source disc per screen point
const N_SAMPLES = 32;
// Number of screen columns to compute
const N_COLS = 80;

const sim = {
    name: 'Shadows & Penumbra',

    objective: 'How do umbra and penumbra form with extended light sources?',
    defaults: {
        sourceRadius:   1.0,   // Light source radius (m)
        sourceHeight:   8,     // Height of source above ground (m)
        occluderRadius: 1.5,   // Occluder (ball) radius (m)
        screenDist:     12,    // Distance from source to screen (m)
        numSources:     1,     // Number of light sources (1–3)
    },

    controls: [
        {
            type: 'slider', key: 'sourceRadius', label: 'Source Radius (m)',
            min: 0.1, max: 5, step: 0.1,
            tooltip: 'Radius of the extended light source. Larger sources create bigger penumbra.',
        },
        {
            type: 'slider', key: 'sourceHeight', label: 'Source Height (m)',
            min: 2, max: 20, step: 0.5,
            tooltip: 'Height of the light source center above the ground.',
        },
        {
            type: 'slider', key: 'occluderRadius', label: 'Occluder Radius (m)',
            min: 0.2, max: 5, step: 0.1,
            tooltip: 'Radius of the opaque object casting the shadow.',
        },
        {
            type: 'slider', key: 'screenDist', label: 'Screen Distance (m)',
            min: 2, max: 20, step: 0.5,
            tooltip: 'Horizontal distance from the source to the projection screen.',
        },
        {
            type: 'slider', key: 'numSources', label: 'Number of Sources',
            min: 1, max: 3, step: 1,
            tooltip: 'Add more light sources offset horizontally. Their shadow patterns overlap.',
        },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Centerline Intensity (0–1)',
        datasets: [
            { key: 'intensity', label: 'Center Intensity', color: '#fde047' },
        ],
    },

    // ── Internal state ──────────────────────────────────────────
    _t:          0,
    _params:     null,
    _intensityBuf: new Float32Array(N_COLS),  // cached intensity values

    reset(params) {
        this._params = params;
        this._t      = 0;
        this._intensityBuf.fill(0);
    },

    update(dt, params) {
        this._params = params;
        this._t     += dt;
        this._computeIntensity(params);
        // Report centerline intensity for graph
        const midIdx = Math.floor(N_COLS / 2);
        return {
            t:         this._t,
            intensity: this._intensityBuf[midIdx],
            done:      false,
        };
    },

    /** Compute intensity at N_COLS positions across the screen.
     *  Uses geometric ray sampling. Results stored in _intensityBuf. */
    _computeIntensity(params) {
        const { sourceRadius, sourceHeight, occluderRadius, screenDist, numSources } = params;

        // Scene layout:
        // Source(s) on the LEFT: x = 0, y = sourceHeight ± offsets
        // Occluder in the MIDDLE: x = screenDist * 0.45, y = sourceHeight / 2
        // Screen on the RIGHT:   x = screenDist

        const occX = screenDist * 0.45;
        const occY = sourceHeight / 2;

        // Screen spans vertically from 0 to sourceHeight * 1.2
        const screenX = screenDist;
        const screenYmin = 0;
        const screenYmax = sourceHeight * 1.4;

        // Source offsets for multiple sources (horizontal spread)
        const srcOffsets = [0, -sourceRadius * 1.8, sourceRadius * 1.8].slice(0, numSources);

        for (let col = 0; col < N_COLS; col++) {
            const screenY = screenYmin + (col / (N_COLS - 1)) * (screenYmax - screenYmin);

            let totalUnblocked = 0;

            for (const xOff of srcOffsets) {
                const srcX = xOff;
                const srcY = sourceHeight;

                // Sample N_SAMPLES points uniformly across the source disc
                for (let s = 0; s < N_SAMPLES; s++) {
                    // Sample angle + radius on source disc (uniform disc sampling)
                    const angle  = (s / N_SAMPLES) * Math.PI * 2;
                    const frac   = Math.sqrt((s + 0.5) / N_SAMPLES);
                    const sampX  = srcX + frac * sourceRadius * Math.cos(angle);
                    const sampY  = srcY + frac * sourceRadius * Math.sin(angle);

                    // Ray from (sampX, sampY) to (screenX, screenY)
                    // Check if it intersects the occluder disc centered at (occX, occY)
                    const blocked = this._rayIntersectCircle(
                        sampX, sampY, screenX, screenY, occX, occY, occluderRadius
                    );
                    if (!blocked) totalUnblocked++;
                }
            }

            this._intensityBuf[col] = totalUnblocked / (N_SAMPLES * srcOffsets.length);
        }
    },

    /** Returns true if the line segment from (x1,y1) to (x2,y2) intersects
     *  the circle centered at (cx,cy) with radius r. */
    _rayIntersectCircle(x1, y1, x2, y2, cx, cy, r) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;
        const a  = dx * dx + dy * dy;
        const b  = 2 * (fx * dx + fy * dy);
        const c  = fx * fx + fy * fy - r * r;
        let disc = b * b - 4 * a * c;
        if (disc < 0) return false;
        disc = Math.sqrt(disc);
        const t1 = (-b - disc) / (2 * a);
        const t2 = (-b + disc) / (2 * a);
        // Only block if intersection is between the two endpoints
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    },

    draw(ctx, w, h) {
        // ── Background ────────────────────────────────────────────
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, w, h);

        const params = this._params || {};
        const { sourceRadius = 1, sourceHeight = 8, occluderRadius = 1.5, screenDist = 12, numSources = 1 } = params;

        // ── Scene layout in pixels ────────────────────────────────
        // Map scene: x=[0..screenDist], y=[0..sourceHeight*1.4] → canvas
        const margin   = 32;
        const sceneW   = w - margin * 2;
        const sceneH   = h * 0.72;
        const sceneTop = h * 0.06;

        const sceneYMax = sourceHeight * 1.4;
        const mx = (sx) => margin + (sx / screenDist) * sceneW;
        const my = (sy) => sceneTop + sceneH - (sy / sceneYMax) * sceneH;

        const occX = screenDist * 0.45;
        const occY = sourceHeight / 2;

        // ── Screen with intensity gradient ────────────────────────
        const screenPX  = mx(screenDist);
        const screenW   = 14;

        for (let col = 0; col < N_COLS; col++) {
            const frac      = col / (N_COLS - 1);
            const sceneY    = frac * sceneYMax;
            const py        = my(sceneY);
            const nextPY    = my((col + 1) / (N_COLS - 1) * sceneYMax);
            const intensity = this._intensityBuf[col];
            const bright    = Math.round(intensity * 255);
            ctx.fillStyle   = `rgb(${bright},${bright},${Math.round(bright * 0.85)})`;
            ctx.fillRect(screenPX - screenW / 2, Math.min(py, nextPY), screenW, Math.abs(nextPY - py) + 1);
        }

        // Screen border
        ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(screenPX - screenW / 2, sceneTop, screenW, sceneH);
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font      = '10px Inter, sans-serif';
        ctx.fillText('Screen', screenPX - 18, sceneTop - 4);

        // ── Occluder ──────────────────────────────────────────────
        const occPX = mx(occX);
        const occPY = my(occY);
        const occPR = (occluderRadius / sceneYMax) * sceneH;

        ctx.beginPath();
        ctx.arc(occPX, occPY, occPR, 0, Math.PI * 2);
        ctx.fillStyle   = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.6)';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font      = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Occluder', occPX, occPY + occPR + 14);
        ctx.textAlign = 'left';

        // ── Light sources ─────────────────────────────────────────
        const srcOffsets = [0, -sourceRadius * 1.8, sourceRadius * 1.8].slice(0, numSources);
        const srcColors  = ['#fde047', '#fb923c', '#a78bfa'];

        srcOffsets.forEach((xOff, idx) => {
            const srcX = xOff;
            const srcY = sourceHeight;
            const spx  = mx(0) + (xOff / sceneYMax) * sceneH * 0.5;  // approximate px offset
            const spy  = my(srcY);
            const spr  = Math.max(4, (sourceRadius / sceneYMax) * sceneH);

            const grd = ctx.createRadialGradient(spx, spy, 0, spx, spy, spr * 2.5);
            grd.addColorStop(0, srcColors[idx]);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.arc(spx, spy, spr * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(spx, spy, spr, 0, Math.PI * 2);
            ctx.fillStyle = srcColors[idx];
            ctx.fill();

            // Draw edge rays to occluder boundary for visual explanation
            [occluderRadius, -occluderRadius].forEach(ro => {
                ctx.beginPath();
                ctx.setLineDash([4, 5]);
                ctx.moveTo(spx, spy);
                const oPX = occPX;
                const oPY = my(occY + ro * (sceneH / sceneYMax) / (sceneH / sceneYMax));
                const adj = (ro / sceneYMax) * sceneH;
                ctx.lineTo(oPX, occPY + adj);
                ctx.lineTo(screenPX, my(occY + ro * 2.2));
                ctx.strokeStyle = hexToRgba(srcColors[idx], 0.2);
                ctx.lineWidth   = 1;
                ctx.stroke();
                ctx.setLineDash([]);
            });
        });

        // ── Umbra / penumbra labels on intensity map ──────────────
        // Find umbra and penumbra boundaries in intensity buffer
        let umbraStart = -1, umbraEnd = -1, penStart = -1, penEnd = -1;
        for (let i = 0; i < N_COLS; i++) {
            const v = this._intensityBuf[i];
            if (v < 0.02 && umbraStart < 0) umbraStart = i;
            if (v < 0.02) umbraEnd = i;
            if (v < 0.98 && v > 0.02 && penStart < 0) penStart = i;
            if (v < 0.98 && v > 0.02) penEnd = i;
        }

        const toScreenPY = (idx) => {
            const sceneY = (idx / (N_COLS - 1)) * sceneYMax;
            return my(sceneY);
        };

        if (umbraStart >= 0) {
            const uy1 = toScreenPY(umbraStart);
            const uy2 = toScreenPY(umbraEnd);
            ctx.fillStyle = '#ef4444';
            ctx.font      = '9px Inter, sans-serif';
            ctx.fillText('Umbra', screenPX + screenW / 2 + 4, (uy1 + uy2) / 2 + 4);
        }
        if (penStart >= 0) {
            const py1 = toScreenPY(penStart);
            ctx.fillStyle = '#94a3b8';
            ctx.font      = '9px Inter, sans-serif';
            ctx.fillText('Penumbra', screenPX + screenW / 2 + 4, py1 + 4);
        }

        // ── Intensity profile graph (bottom strip) ────────────────
        const profTop = sceneTop + sceneH + 12;
        const profH   = h - profTop - 28;
        if (profH > 20) {
            ctx.fillStyle = 'rgba(15,23,42,0.7)';
            ctx.fillRect(margin, profTop, sceneW, profH);
            ctx.strokeStyle = 'rgba(100,116,139,0.3)';
            ctx.lineWidth   = 1;
            ctx.strokeRect(margin, profTop, sceneW, profH);

            ctx.fillStyle = 'rgba(100,116,139,0.5)';
            ctx.font      = '9px Inter, sans-serif';
            ctx.fillText('Intensity profile →', margin + 2, profTop - 2);

            ctx.beginPath();
            for (let col = 0; col < N_COLS; col++) {
                const px = margin + (col / (N_COLS - 1)) * sceneW;
                const py2 = profTop + profH - this._intensityBuf[col] * (profH - 4) - 2;
                if (col === 0) ctx.moveTo(px, py2);
                else ctx.lineTo(px, py2);
            }
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        // ── Info readout ──────────────────────────────────────────
        ctx.fillStyle = '#64748b';
        ctx.font      = '11px Inter, sans-serif';
        const midI = this._intensityBuf[Math.floor(N_COLS / 2)];
        ctx.fillText(`Center intensity: ${(midI * 100).toFixed(0)}%  t = ${this._t.toFixed(1)} s`, 14, h - 8);

        // ── Dev mode ─────────────────────────────────────────────
        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            ctx.fillText(`N_SAMPLES=${N_SAMPLES} N_COLS=${N_COLS} numSrc=${numSources}`, 8, sceneTop + 12);
        }
    },
};

export default sim;
