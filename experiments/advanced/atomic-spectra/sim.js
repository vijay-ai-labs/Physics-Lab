/* FILE: experiments/advanced/atomic-spectra/sim.js */
export default {
    name: 'atomic-spectra',
    objective: 'What wavelengths of light does an atom emit?',
    controls: [
        { type: 'slider', key: 'elementZ', label: 'Element (1=H, 2=He+, 3=Li2+)', min: 1, max: 3, step: 1, default: 1 },
        { type: 'slider', key: 'temperature', label: 'Temperature (K)', min: 300, max: 10000, step: 100, default: 3000 },
        { type: 'slider', key: 'resolution', label: 'Instrument Resolution (nm)', min: 0.1, max: 10.0, step: 0.1, default: 2.0 },
        { type: 'toggle', key: 'logScale', label: 'Log Scale Graph' }
    ],
    defaults: {
        elementZ: 1,
        temperature: 3000,
        resolution: 2.0,
        logScale: false
    },
    params: { elementZ: 1, temperature: 3000, resolution: 2.0, logScale: false },
    graphConfig: {
        xAxis: 'Wavelength (nm)',
        yAxis: 'Intensity',
        datasets: [{ key: 'i', label: 'Emission', color: '#ffffff' }]
    },

    transitions: [],
    photons: [],
    time: 0,
    updateTimer: 0,

    onEngineReady(engine) {
        this.engine = engine;
    },

    initFromControls(params) {
        const oldScale = this.params && this.params.logScale;
        this.params = params;
        
        if (this.engine && this.engine.graph && oldScale !== params.logScale) {
            this.engine.graph._chart.options.scales.y.type = params.logScale ? 'logarithmic' : 'linear';
            this.engine.graph._chart.update();
        }
        
        this.calculateTransitions();
    },

    start() { },

    pause() { },

    reset(params) {
        this.params = params;
        this.time = 0;
        this.photons = [];
        this.calculateTransitions();
    },
    
    calculateTransitions() {
        this.transitions = [];
        const Z = this.params.elementZ;
        const R = 1.097e7; // Rydberg constant m^-1
        
        // n from 1 to 6
        for (let ni = 1; ni <= 5; ni++) {
            for (let nf = ni + 1; nf <= 6; nf++) {
                // 1/lambda = R * Z^2 * (1/ni^2 - 1/nf^2)
                const invLambda = R * Z * Z * (1.0 / (ni * ni) - 1.0 / (nf * nf));
                const lambdaNm = 1e9 / invLambda;
                
                // Boltzman probability factor approx (simplified)
                const E_nf = -13.6 * Z * Z / (nf * nf);
                const kT = 8.617e-5 * this.params.temperature; // in eV
                const pop = Math.exp(-(-13.6*Z*Z/(nf*nf) - (-13.6*Z*Z)) / kT);
                // Just weight it heavily by transition nf->ni
                const intensity = (1 / Math.pow(nf, 3)) * pop * 1e6; 
                
                if (lambdaNm > 100 && lambdaNm < 2000) {
                    this.transitions.push({
                        ni, nf, lambda: lambdaNm, intensity,
                        color: this.nmToRGB(lambdaNm)
                    });
                }
            }
        }
        // Normalize intensity
        let maxI = 1e-10;
        this.transitions.forEach(t => maxI = Math.max(maxI, t.intensity));
        this.transitions.forEach(t => t.intensity = (t.intensity / maxI) * 100);
        
        this.updateGraph();
    },

    updateGraph() {
        if (!this.engine) return;
        
        // Create spectrum array 300nm to 800nm
        const spectrum = [];
        const T = this.params.temperature;
        const res = this.params.resolution;
        const mass = this.params.elementZ; // roughly 1, 4, 7 amu
        
        for (let wl = 300; wl <= 800; wl += 2) {
            let intensity = 0;
            this.transitions.forEach(t => {
                // Doppler broadening sigma = lambda * sqrt(k T / m c^2)
                // approximate:
                const doppler = t.lambda * Math.sqrt(T / (mass * 1e11)); 
                const sigma = Math.max(res, doppler); 
                
                // Gaussian profile
                const val = t.intensity * Math.exp(-0.5 * Math.pow((wl - t.lambda) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
                intensity += val;
            });
            spectrum.push({ x: wl, y: Math.max(0.1, intensity) });
        }
        
        // Override dataset
        const chart = this.engine.graph._chart;
        if (chart) {
            chart.data.datasets[0].data = spectrum;
            // Color gradient for the line
            chart.data.datasets[0].borderColor = '#fff';
            chart.update();
        }
    },

    update(dt) {
        this.time += dt;
        this.updateTimer += dt;
        
        if (this.updateTimer > 1.0) {
            this.updateTimer = 0;
            this.updateGraph(); // Refresh if temp changed slowly
        }
        
        // Randomly emit photons based on intensities
        this.transitions.forEach(t => {
            if (Math.random() < t.intensity * dt * 0.1 && t.lambda >= 380 && t.lambda <= 750) {
                this.photons.push({
                    x: Math.random() * 800 - 400,
                    y: 200,
                    vy: -200 - Math.random() * 100,
                    color: t.color,
                    age: 0,
                    lambda: t.lambda
                });
            }
        });
        
        for (let i = this.photons.length - 1; i >= 0; i--) {
            const p = this.photons[i];
            p.y += p.vy * dt;
            p.age += dt;
            if (p.age > 2) this.photons.splice(i, 1);
        }
    },

    draw(ctx, width, height) {
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Draw energy levels schematically
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Element Z = ${this.params.elementZ}`, -width/2 + 20, -height/2 + 30);
        
        const Z = this.params.elementZ;
        for (let n = 1; n <= 5; n++) {
            const E = -13.6 * Z * Z / (n * n);
            const y = -E * 15 - 50; 
            ctx.beginPath();
            ctx.moveTo(-150, y);
            ctx.lineTo(150, y);
            ctx.strokeStyle = '#475569';
            ctx.stroke();
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`n=${n} (${E.toFixed(1)} eV)`, 160, y + 4);
        }
        
        // Draw falling photons
        for (const p of this.photons) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Tail
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y - p.vy * 0.1);
            ctx.strokeStyle = p.color;
            ctx.stroke();
        }
        
        // Draw continuous spectrum bar at bottom
        const barY = height / 2 - 40;
        for (let x = -width/2; x < width/2; x+=2) {
            // Map x to 380-750nm
            const wl = 380 + (x + width/2) / width * (750 - 380);
            let intensity = 0;
            this.transitions.forEach(t => {
                if(Math.abs(wl - t.lambda) < this.params.resolution * 2) {
                    intensity += t.intensity / 50;
                }
            });
            intensity = Math.min(1, intensity + 0.05); // Background + lines
            ctx.fillStyle = this.nmToRGB(wl, intensity);
            ctx.fillRect(x, barY, 2, 40);
        }
        
        ctx.restore();
    },
    
    nmToRGB(wavelength, alpha=1) {
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
        }
        let factor = 1;
        if (wavelength >= 380 && wavelength < 420) {
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        } else if (wavelength >= 645 && wavelength <= 780) {
            factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 645);
        }
        const rgbArray = [
            Math.round(r * factor * 255),
            Math.round(g * factor * 255),
            Math.round(b * factor * 255)
        ];
        return `rgba(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]}, ${alpha})`;
    }
};
