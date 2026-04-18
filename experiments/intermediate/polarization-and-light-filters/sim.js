/* FILE: experiments/intermediate/polarization-and-light-filters/sim.js
   ============================================================
   Polarization & Light Filters — Physics Simulation
   ============================================================
   Physics:
     Malus's Law:  I = I₀ · cos²θ
     With N polarizers in series:
       I_n = I₀ · Π cos²(θ_k − θ_{k-1})
     where θ_0 = incident polarization angle (linear).

     Wavelength (nm) → approximate RGB for beam color.
   ============================================================ */

import { degToRad, clamp, drawGrid } from '../../../js/utils.js';

// ── Wavelength to approximate visible RGB ──────────────────
function wavelengthToRgb(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; g = 0; b = 1; }
    else if (nm < 490)         { r = 0; g = (nm - 440) / 50; b = 1; }
    else if (nm < 510)         { r = 0; g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580)         { r = (nm - 510) / 70; g = 1; b = 0; }
    else if (nm < 645)         { r = 1; g = -(nm - 645) / 65; b = 0; }
    else if (nm <= 700)        { r = 1; g = 0; b = 0; }
    const f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40
            : nm > 700 ? 0.3
            : nm > 645 ? 0.3 + 0.7 * (700 - nm) / 55
            : 1.0;
    return {
        r: Math.round(255 * Math.pow(r * f, 0.8)),
        g: Math.round(255 * Math.pow(g * f, 0.8)),
        b: Math.round(255 * Math.pow(b * f, 0.8)),
    };
}

const sim = {
    name: 'Polarization & Light Filters',

    objective: 'How much light passes through polarizing filters?',
    defaults: {
        pol1Angle:    45,   // degrees — first polarizer axis
        pol2Angle:    90,   // degrees — second polarizer axis
        incidentAngle: 0,   // degrees — incident linear polarization angle
        wavelength:   550,  // nm (550 = green)
        twoPolarizers: false,
    },

    controls: [
        { type: 'slider', key: 'incidentAngle', label: 'Incident Polarization (°)',
          min: 0, max: 180, step: 1,
          tooltip: 'Orientation of the incoming linearly polarized E-field (0° = horizontal).' },
        { type: 'slider', key: 'pol1Angle', label: 'Polarizer 1 Angle (°)',
          min: 0, max: 180, step: 1,
          tooltip: 'Transmission axis of the first polarizer. θ=90° from incident → complete blocking.' },
        { type: 'slider', key: 'pol2Angle', label: 'Polarizer 2 Angle (°)',
          min: 0, max: 180, step: 1,
          tooltip: 'Transmission axis of the second polarizer (only active when enabled below).' },
        { type: 'slider', key: 'wavelength', label: 'Wavelength (nm)',
          min: 380, max: 700, step: 5,
          tooltip: 'Wavelength determines the visible color of the light beam.' },
        { type: 'toggle', key: 'twoPolarizers', label: 'Enable 2nd Polarizer' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Transmitted Intensity (0–1)',
        datasets: [
            { key: 'I1', label: 'After Pol 1',  color: '#38bdf8' },
            { key: 'I2', label: 'After Pol 2',  color: '#f87171' },
            { key: 'I0', label: 'Incident (1)', color: '#475569' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:     0,
    _phase: 0,   // wave phase for animation
    _params: null,

    reset(params) {
        this._params = params;
        this._t      = 0;
        this._phase  = 0;
    },

    update(dt, params) {
        this._params  = params;
        this._t      += dt;
        this._phase  += dt * 3.0;  // wave animation speed

        const { incidentAngle, pol1Angle, pol2Angle, twoPolarizers } = params;
        const dTheta1 = degToRad(pol1Angle - incidentAngle);
        const I1      = Math.cos(dTheta1) ** 2;
        const dTheta2 = degToRad(pol2Angle - pol1Angle);
        const I2      = twoPolarizers ? I1 * Math.cos(dTheta2) ** 2 : I1;

        return {
            t:    this._t,
            I0:   1.0,
            I1:   parseFloat(I1.toFixed(4)),
            I2:   parseFloat(I2.toFixed(4)),
            done: false,
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        if (!this._params) return;
        const { incidentAngle, pol1Angle, pol2Angle, wavelength, twoPolarizers } = this._params;

        const rgb      = wavelengthToRgb(wavelength);
        const beamY    = h * 0.45;
        const beamH    = 44;
        const nPol     = twoPolarizers ? 2 : 1;

        // Positions of beam segments and polarizers
        const margin   = 40;
        const polW     = 18;
        const pol1X    = margin + (w - 2 * margin) * (nPol === 1 ? 0.45 : 0.32);
        const pol2X    = margin + (w - 2 * margin) * 0.65;
        const srcX     = margin;
        const endX     = w - margin;

        // Compute intensities
        const dTheta1 = degToRad(pol1Angle - incidentAngle);
        const I1      = Math.cos(dTheta1) ** 2;
        const dTheta2 = degToRad(pol2Angle - pol1Angle);
        const I2      = twoPolarizers ? I1 * Math.cos(dTheta2) ** 2 : I1;

        // ── Draw beam segments ─────────────────────────────
        const segments = twoPolarizers
            ? [{ x1: srcX, x2: pol1X, I: 1.0 }, { x1: pol1X, x2: pol2X, I: I1 }, { x1: pol2X, x2: endX, I: I2 }]
            : [{ x1: srcX, x2: pol1X, I: 1.0 }, { x1: pol1X, x2: endX, I: I1 }];

        for (const seg of segments) {
            const bright = clamp(seg.I, 0, 1);
            const bH     = Math.max(4, beamH * Math.sqrt(bright));
            const alpha  = 0.15 + bright * 0.65;
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
            ctx.fillRect(seg.x1, beamY - bH / 2, seg.x2 - seg.x1, bH);

            // animated wave crests
            if (bright > 0.05) {
                const waveLen = 28;
                ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${bright * 0.9})`;
                ctx.lineWidth   = 1;
                ctx.beginPath();
                for (let x = seg.x1; x <= seg.x2; x += 2) {
                    const y = beamY + Math.sin((x / waveLen) * Math.PI * 2 - this._phase) * (bH / 2 - 2) * bright;
                    x === seg.x1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }

        // ── Draw polarizer discs ───────────────────────────
        const drawPolarizer = (px, angle, label, intensity) => {
            // Disc
            ctx.beginPath();
            ctx.ellipse(px, beamY, polW / 2, beamH * 0.75, 0, 0, Math.PI * 2);
            ctx.fillStyle   = `rgba(30,41,59,0.85)`;
            ctx.fill();
            ctx.strokeStyle = `rgba(148,163,184,0.7)`;
            ctx.lineWidth   = 2;
            ctx.stroke();

            // Transmission axis tick
            const rad = degToRad(angle);
            const tx  = Math.cos(rad) * beamH * 0.55;
            const ty  = -Math.sin(rad) * beamH * 0.55;
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth   = 2.5;
            ctx.beginPath();
            ctx.moveTo(px - tx, beamY - ty);
            ctx.lineTo(px + tx, beamY + ty);
            ctx.stroke();

            // Label
            ctx.fillStyle = '#94a3b8';
            ctx.font      = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, px, beamY + beamH * 0.75 + 16);
            ctx.fillText(`${angle}°`, px, beamY + beamH * 0.75 + 28);
            ctx.textAlign = 'left';
        };

        drawPolarizer(pol1X, pol1Angle, 'Polarizer 1', I1);
        if (twoPolarizers) drawPolarizer(pol2X, pol2Angle, 'Polarizer 2', I2);

        // Source indicator
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
        ctx.beginPath(); ctx.arc(srcX, beamY, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, sans-serif';
        ctx.fillText('Source', srcX - 16, beamY + beamH * 0.75 + 28);

        // Incident E-field direction arrow
        const rad0 = degToRad(incidentAngle);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(srcX + 20, beamY - Math.sin(rad0) * 22);
        ctx.lineTo(srcX + 20, beamY + Math.sin(rad0) * 22);
        ctx.stroke();

        // ── Intensity readout ──────────────────────────────
        ctx.fillStyle = '#e2e8f0';
        ctx.font      = 'bold 13px Inter, sans-serif';
        ctx.fillText(`I₀ = 1.000`, 14, 26);
        ctx.fillText(`I₁ = ${I1.toFixed(3)}  (after Pol 1)`, 14, 46);
        if (twoPolarizers) ctx.fillText(`I₂ = ${I2.toFixed(3)}  (after Pol 2)`, 14, 66);

        const finalI = twoPolarizers ? I2 : I1;
        ctx.fillStyle = '#475569';
        ctx.font      = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`λ = ${wavelength} nm    t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';

        // ── Final intensity bar ────────────────────────────
        const barX = 14, barY = h * 0.78, barW = 160, barH2 = 12;
        ctx.fillStyle = 'rgba(30,41,59,0.6)';
        ctx.fillRect(barX, barY, barW, barH2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
        ctx.fillRect(barX, barY, barW * finalI, barH2);
        ctx.strokeStyle = 'rgba(148,163,184,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH2);
        ctx.fillStyle = '#94a3b8';
        ctx.font      = '10px Inter, sans-serif';
        ctx.fillText(`Transmitted: ${(finalI * 100).toFixed(1)}%`, barX, barY - 4);

        if (window.uxDev) {
            ctx.fillStyle = '#fbbf24';
            ctx.font      = '10px monospace';
            ctx.fillText(`I1=${I1.toFixed(3)} I2=${I2.toFixed(3)} phase=${this._phase.toFixed(2)}`, 8, h - 30);
        }
    },
};

export default sim;
