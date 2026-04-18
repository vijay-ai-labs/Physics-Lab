/* ============================================================
   Photoelectric Effect — sim.js
   ============================================================ */
import { hexToRgba, drawGrid } from '../../js/utils.js';

const sim = {
    name: 'Photoelectric Effect',


    objective: 'Are electrons ejected when light frequency changes?',
    defaults: { wavelength: 400, intensity: 50, workFunction: 2.1 }, // 2.1eV is approx Potassium

    controls: [
        { type: 'slider', key: 'wavelength', label: 'Wavelength (nm)', min: 100, max: 800, step: 10, tooltip: 'Wavelength of the incident light. Shorter wavelength = higher photon energy (E = hc/λ). Violet/UV light ejects electrons; red/IR may not.' },
        { type: 'slider', key: 'intensity', label: 'Light Intensity (%)', min: 0, max: 100, step: 1, tooltip: 'Intensity of the light source. Affects the number of photons (and thus electrons emitted) but NOT their kinetic energy.' },
        { type: 'slider', key: 'workFunction', label: 'Work Function (eV)', min: 1.0, max: 5.0, step: 0.1, tooltip: 'Minimum energy needed to eject an electron from the metal surface. Potassium ≈2.1 eV, Gold ≈5.1 eV.' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Photocurrent (mA) / Max KE (eV)',
        datasets: [
            { key: 'current', label: 'Photocurrent', color: '#10b981' },
            { key: 'ke', label: 'Max Kinetic Energy', color: '#f59e0b' },
        ],
    },

    _t: 0,
    _params: { wavelength: 400, intensity: 50, workFunction: 2.1 },
    _photons: [],
    _electrons: [],
    _done: false,

    // Constants
    _h: 4.135667696e-15, // eV*s
    _c: 299792458,       // m/s

    reset(params) {
        this._params = { ...params };
        this._t = 0;
        this._photons = [];
        this._electrons = [];
        this._done = false;
    },

    update(dt) {
        this._t += dt;
        const { wavelength, intensity, workFunction } = this._params;

        // Physics calculations
        const wavelengthMeters = wavelength * 1e-9;
        const photonEnergyEv = (this._h * this._c) / wavelengthMeters;
        const maxKeEv = photonEnergyEv - workFunction;
        const current = maxKeEv > 0 ? intensity * 0.1 : 0; // Simplified relationship

        // Spawn photons
        if (Math.random() < intensity / 100 * 0.5) {
            this._photons.push({ x: -10, y: Math.random() * 80 - 40 });
        }

        // Update photons
        for (let i = this._photons.length - 1; i >= 0; i--) {
            const p = this._photons[i];
            p.x += dt * 300; // Photon speed
            if (p.x > 0 && maxKeEv > 0) { // Hits plate
                this._photons.splice(i, 1);
                // Emission chance
                if (Math.random() < 0.3) {
                    this._electrons.push({
                        x: 0,
                        y: p.y,
                        vx: Math.max(10, Math.sqrt(maxKeEv) * 50),
                        vy: (Math.random() - 0.5) * 20
                    });
                }
            } else if (p.x > 150) {
                this._photons.splice(i, 1);
            }
        }

        // Update electrons
        for (let i = this._electrons.length - 1; i >= 0; i--) {
            const e = this._electrons[i];
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            if (e.x > 200 || Math.abs(e.y) > 100) {
                this._electrons.splice(i, 1);
            }
        }

        return {
            t: this._t,
            current,
            ke: Math.max(0, maxKeEv),
            done: false
        };
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);
        drawGrid(ctx, w, h, 40);

        const { wavelength, workFunction } = this._params;
        const cx = w / 2;
        const cy = h / 2;

        const photonEnergyEv = (this._h * this._c) / (wavelength * 1e-9);

        // Convert wavelength to RGB color for photons
        const photonColor = this._wavelengthToRgb(wavelength);

        // Plates
        ctx.fillStyle = '#64748b'; // Emitter plate
        ctx.fillRect(cx, cy - 60, 10, 120);
        ctx.fillStyle = '#94a3b8'; // Collector plate
        ctx.fillRect(cx + 200, cy - 60, 10, 120);

        // Photons
        ctx.fillStyle = photonColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = photonColor;
        for (const p of this._photons) {
            ctx.beginPath();
            // Draw sine wave packet
            ctx.moveTo(cx - 100 + p.x, cy + p.y);
            ctx.lineTo(cx - 120 + p.x, cy + p.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - 100 + p.x, cy + p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Electrons
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        for (const e of this._electrons) {
            ctx.beginPath();
            ctx.arc(cx + 10 + e.x, cy + 60 + e.y, 4, 0, Math.PI * 2); // adjusted y offset
            ctx.arc(cx + 5 + e.x, cy + e.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Info Display
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`Photon Energy (E = hc/λ): ${photonEnergyEv.toFixed(2)} eV`, 12, 30);
        ctx.fillText(`Work Function (Φ): ${workFunction.toFixed(2)} eV`, 12, 50);

        if (photonEnergyEv > workFunction) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`Max KE: ${(photonEnergyEv - workFunction).toFixed(2)} eV  —  Emission Occurring`, 12, 75);
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`E < Φ : No Emission`, 12, 75);
        }
    },

    // Simple wavelength to RGB approximation
    _wavelengthToRgb(wavelength) {
        let r, g, b;
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0;
            b = 1;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0;
            g = (wavelength - 440) / (490 - 440);
            b = 1;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0;
            g = 1;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1;
            b = 0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1;
            g = -(wavelength - 645) / (645 - 580);
            b = 0;
        } else if (wavelength >= 645 && wavelength <= 780) {
            r = 1;
            g = 0;
            b = 0;
        } else {
            r = 0; g = 0; b = 0;
            if (wavelength < 380) return '#c084fc'; // UV
            if (wavelength > 780) return '#7f1d1d'; // IR
        }

        let factor;
        if (wavelength >= 380 && wavelength < 420) {
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        } else if (wavelength >= 420 && wavelength < 701) {
            factor = 1.0;
        } else if (wavelength >= 701 && wavelength <= 780) {
            factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
        } else {
            factor = 1.0;
        }

        return `rgb(${Math.round(255 * (r * factor))}, ${Math.round(255 * (g * factor))}, ${Math.round(255 * (b * factor))})`;
    }
};

export default sim;
