/* FILE: experiments/wave-interference/sim.js
   ============================================================
   Wave Interference — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - FIXED physics bug: spatial term now uses correct wavenumber
         k = 2π·f / v_wave instead of the incorrect `freq * x`.
         Assumed wave speed v_wave = 200 (canvas px/s) — this gives
         dimensionally consistent ω·t − k·x travelling-wave equations.
       - Added `phase2` parameter (0–360°): phase offset applied to
         wave 2, allowing constructive/destructive interference demo.
       - Added `showHeatmap` toggle (0 = waveform rows, 1 = 2D
         intensity heatmap). The heatmap treats two point sources
         and renders I = |A1·sin(ω1·t−k1·r1) + A2·sin(ω2·t−k2·r2+φ2)|²
         via ctx.putImageData with a blue→white colormap.
         Below the heatmap a 1D intensity slice at y=h/2 is drawn.
   ============================================================ */
import { degToRad, hexToRgba, drawGrid } from '../../js/utils.js';
import { attachDrag, drawDragHandle } from '../../js/dragHelper.js';

// Assumed wave propagation speed in canvas-pixel units per second.
const V_WAVE = 200;

const sim = {
    name: 'Wave Interference',


    objective: 'What pattern forms when two waves overlap?',
    defaults: { freq1: 2, freq2: 3, amp1: 1.0, amp2: 1.0, phase2: 0, showHeatmap: 0 },

    controls: [
        { type: 'slider', key: 'freq1', label: 'Frequency 1 (Hz)', min: 0.5, max: 10, step: 0.1, tooltip: 'Frequency of the first wave in Hertz. Higher frequency = more oscillations per second.' },
        { type: 'slider', key: 'freq2', label: 'Frequency 2 (Hz)', min: 0.5, max: 10, step: 0.1, tooltip: 'Frequency of the second wave. Beat frequency = |f1 − f2|.' },
        { type: 'slider', key: 'amp1', label: 'Amplitude 1', min: 0.1, max: 2.0, step: 0.1, tooltip: 'Amplitude (peak displacement) of wave 1. Larger amplitude = more intense wave.' },
        { type: 'slider', key: 'amp2', label: 'Amplitude 2', min: 0.1, max: 2.0, step: 0.1, tooltip: 'Amplitude (peak displacement) of wave 2.' },
        { type: 'slider', key: 'phase2', label: 'Phase 2 Offset (°)', min: 0, max: 360, step: 5, tooltip: 'Phase offset of wave 2 in degrees. 180° = fully out of phase (destructive interference).' },
        { type: 'slider', key: 'showHeatmap', label: 'View: 0=Waves  1=Heatmap', min: 0, max: 1, step: 1, tooltip: 'Toggle between the waveform view (0) and a 2D interference heatmap showing point-source patterns (1).' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Amplitude',
        datasets: [
            { key: 'y1', label: 'Wave 1', color: '#6366f1' },
            { key: 'y2', label: 'Wave 2', color: '#10b981' },
            { key: 'yS', label: 'Superposition', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: {},

    // Draggable source positions (normalised 0-1 of canvas dimensions)
    // Updated to canvas-px coords in _drawHeatmap each frame
    _s1x: -1, _s1y: -1,   // -1 = use default until first draw()
    _s2x: -1, _s2y: -1,
    _s1Dragging: false,
    _s2Dragging: false,
    _canvasW: 0, _canvasH: 0,  // last known canvas logical size

    /** Called once by engine when canvas is ready. */
    initCanvas(canvas) {
        const HIT = 18;
        const heatFrac = 0.72;  // same as _drawHeatmap

        attachDrag(canvas, {
            hitRadius: HIT,
            getCenter: () => this._s1x < 0 ? null : { x: this._s1x, y: this._s1y },
            onDragStart: () => { this._s1Dragging = true; },
            onDrag: (pos) => {
                const heatH = Math.round(this._canvasH * heatFrac);
                // Clamp inside heatmap area
                this._s1x = Math.max(HIT, Math.min(this._canvasW - HIT, pos.x));
                this._s1y = Math.max(HIT, Math.min(heatH - HIT, pos.y));
            },
            onDragEnd: () => { this._s1Dragging = false; },
        });

        attachDrag(canvas, {
            hitRadius: HIT,
            getCenter: () => this._s2x < 0 ? null : { x: this._s2x, y: this._s2y },
            onDragStart: () => { this._s2Dragging = true; },
            onDrag: (pos) => {
                const heatH = Math.round(this._canvasH * heatFrac);
                this._s2x = Math.max(HIT, Math.min(this._canvasW - HIT, pos.x));
                this._s2y = Math.max(HIT, Math.min(heatH - HIT, pos.y));
            },
            onDragEnd: () => { this._s2Dragging = false; },
        });
    },

    reset(params) {
        this._t = 0;
        this._params = { ...params };
        // Reset source positions to defaults when params change
        this._s1x = -1; this._s1y = -1;
        this._s2x = -1; this._s2y = -1;
    },

    update(dt, params) {
        this._t += dt;
        // Accept live slider changes
        if (params) this._params = { ...params };
        const { freq1, freq2, amp1, amp2, phase2 } = this._params;
        const phi2 = degToRad(phase2 || 0);
        const y1 = amp1 * Math.sin(2 * Math.PI * freq1 * this._t);
        const y2 = amp2 * Math.sin(2 * Math.PI * freq2 * this._t + phi2);
        const yS = y1 + y2;
        return { t: this._t, y1, y2, yS, done: false };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);

        const { freq1, freq2, amp1, amp2, phase2, showHeatmap } = this._params;
        const phi2 = degToRad(phase2 || 0);
        const t = this._t;

        if (showHeatmap >= 0.5) {
            this._drawHeatmap(ctx, w, h, freq1, freq2, amp1, amp2, phi2, t);
        } else {
            this._drawWaveforms(ctx, w, h, freq1, freq2, amp1, amp2, phi2, t);
        }
    },

    _drawWaveforms(ctx, w, h, freq1, freq2, amp1, amp2, phi2, t) {
        drawGrid(ctx, w, h, 40);

        const rowH = h / 3;
        const labels = ['Wave 1', 'Wave 2', 'Superposition'];
        const colors = ['#6366f1', '#10b981', '#f59e0b'];

        // Wavenumbers: k = 2πf / v_wave  (rad/px)
        const k1 = (2 * Math.PI * freq1) / V_WAVE;
        const k2 = (2 * Math.PI * freq2) / V_WAVE;

        for (let row = 0; row < 3; row++) {
            const cy = rowH * row + rowH / 2;
            const scale = rowH * 0.35;

            // Separator
            if (row > 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, rowH * row); ctx.lineTo(w, rowH * row);
                ctx.stroke();
            }

            // Centre line (dashed)
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, cy); ctx.lineTo(w, cy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Travelling wave: A·sin(ωt − k·x + optional phase)
            const maxAmp = row === 2 ? (amp1 + amp2) : Math.max(amp1, amp2, 1);
            ctx.beginPath();
            ctx.strokeStyle = colors[row];
            ctx.lineWidth = 2.5;
            for (let px = 0; px < w; px++) {
                let y;
                if (row === 0)
                    y = amp1 * Math.sin(2 * Math.PI * freq1 * t - k1 * px);
                else if (row === 1)
                    y = amp2 * Math.sin(2 * Math.PI * freq2 * t - k2 * px + phi2);
                else
                    y = amp1 * Math.sin(2 * Math.PI * freq1 * t - k1 * px)
                        + amp2 * Math.sin(2 * Math.PI * freq2 * t - k2 * px + phi2);

                const py = cy - (y / maxAmp) * scale;
                if (px === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Row label
            ctx.fillStyle = hexToRgba(colors[row], 0.8);
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.fillText(labels[row], 12, rowH * row + 22);
        }

        // Beat frequency annotation
        const beatHz = Math.abs(freq1 - freq2);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`Beat freq = |f1−f2| = ${beatHz.toFixed(2)} Hz`, 12, h - 6);
    },

    _drawHeatmap(ctx, w, h, freq1, freq2, amp1, amp2, phi2, t) {
        const heatH = Math.round(h * 0.72);
        const sliceH = h - heatH - 4;

        // Store canvas size for drag clamping in initCanvas handlers
        this._canvasW = w;
        this._canvasH = h;

        // Source positions — use dragged values or default on first draw
        if (this._s1x < 0) { this._s1x = w * 0.3; this._s1y = heatH / 2; }
        if (this._s2x < 0) { this._s2x = w * 0.7; this._s2y = heatH / 2; }
        const s1x = this._s1x, s1y = this._s1y;
        const s2x = this._s2x, s2y = this._s2y;

        const k1 = (2 * Math.PI * freq1) / V_WAVE;
        const k2 = (2 * Math.PI * freq2) / V_WAVE;
        const omega1 = 2 * Math.PI * freq1;
        const omega2 = 2 * Math.PI * freq2;

        // Compute intensities (two passes: build, then normalise)
        const intensities = new Float32Array(w * heatH);
        let maxI = 0;
        for (let py = 0; py < heatH; py++) {
            for (let px = 0; px < w; px++) {
                const r1 = Math.sqrt((px - s1x) ** 2 + (py - s1y) ** 2) || 0.1;
                const r2 = Math.sqrt((px - s2x) ** 2 + (py - s2y) ** 2) || 0.1;
                const v = amp1 * Math.sin(omega1 * t - k1 * r1)
                    + amp2 * Math.sin(omega2 * t - k2 * r2 + phi2);
                const I = v * v;
                intensities[py * w + px] = I;
                if (I > maxI) maxI = I;
            }
        }

        // Write ImageData with blue→white colormap
        const imgData = ctx.createImageData(w, heatH);
        const pixels = imgData.data;
        const invMax = maxI > 0 ? 1 / maxI : 1;
        for (let i = 0; i < w * heatH; i++) {
            const norm = intensities[i] * invMax;
            const base = i * 4;
            pixels[base] = Math.round(norm * 255);
            pixels[base + 1] = Math.round(norm * 200 + (1 - norm) * 30);
            pixels[base + 2] = Math.round(norm * 155 + (1 - norm) * 200);
            pixels[base + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        // Source markers with drag feedback
        [[s1x, s1y, '#6366f1', 'S1', this._s1Dragging], [s2x, s2y, '#10b981', 'S2', this._s2Dragging]]
            .forEach(([sx, sy, c, lbl, isDragging]) => {
                ctx.save();
                // Pulsing ring hint or active drag ring
                drawDragHandle(ctx, sx, sy, 7, c, isDragging, t);

                // Dot
                ctx.beginPath();
                ctx.arc(sx, sy, 7, 0, Math.PI * 2);
                ctx.fillStyle = isDragging ? c : 'transparent';
                ctx.strokeStyle = c;
                ctx.lineWidth = isDragging ? 3 : 2;
                ctx.shadowColor = c;
                ctx.shadowBlur = isDragging ? 16 : 6;
                ctx.fill();
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Label
                ctx.fillStyle = c;
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.fillText(lbl, sx + 12, sy - 8);
                ctx.restore();
            });

        // Drag hint text
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('Drag S1 / S2 to reposition sources', 8, 14);

        // 1D intensity slice (equatorial line)
        if (sliceH > 10) {
            const sliceY0 = heatH + 2;
            ctx.fillStyle = hexToRgba('#0f172a', 0.9);
            ctx.fillRect(0, sliceY0, w, sliceH);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.strokeRect(0, sliceY0, w, sliceH);

            const midRow = Math.round(heatH / 2);
            ctx.beginPath();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            for (let px = 0; px < w; px++) {
                const I = intensities[midRow * w + px] * invMax;
                const py = sliceY0 + sliceH - 2 - I * (sliceH - 4);
                if (px === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('Intensity — mid-line slice', 8, sliceY0 + 11);
        }

        ctx.fillStyle = hexToRgba('#94a3b8', 0.7);
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('2D interference heatmap (two point sources)', 8, heatH - 6);
    },
};

export default sim;
