/* FILE: experiments/advanced/wave-speed/sim.js */
export default {
    name: 'wave-speed',
    objective: 'How do frequency and wavelength determine wave speed?',
    controls: [
        { type: 'slider', key: 'frequency', label: 'Frequency (Hz)', min: 1, max: 10, step: 0.5, default: 2 },
        { type: 'slider', key: 'phaseSpeed', label: 'Medium Speed (m/s)', min: 5, max: 50, step: 1, default: 20 },
        { type: 'slider', key: 'damping', label: 'Damping Factor', min: 0, max: 0.5, step: 0.05, default: 0.1 },
        { type: 'toggle', key: 'show2D', label: 'Show 2D Ripple Tank' }
    ],
    defaults: {
        frequency: 2, phaseSpeed: 20, damping: 0.1, show2D: false
    },
    params: { frequency: 2, phaseSpeed: 20, damping: 0.1, show2D: false },
    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Amplitude (m)',
        datasets: [
            { key: 'p1', label: 'Probe 1', color: '#38bdf8' },
            { key: 'p2', label: 'Probe 2', color: '#ef4444' }
        ]
    },

    time: 0,
    pixelsPerMeter: 40,
    probe1: { x: 2 },
    probe2: { x: 6 },
    
    // Measurement state
    lastPeak1Time: 0,
    lastPeak1Val: 0,
    measuredSpeed: 0,

    onEngineReady(engine) {
        this.engine = engine;
    },

    initFromControls(params) {
        this.params = params;
    },

    start() { },
    pause() { },

    reset(params) {
        this.params = params;
        this.time = 0;
        this.measuredSpeed = 0;
        this.lastPeak1Val = 0;
        this.lastPeak1Time = 0;
        if (this.engine) {
            const chart = this.engine.graph._chart;
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets.forEach(ds => ds.data = []);
                chart.update();
            }
        }
    },

    getWaveAmplitude(x, t) {
        const f = this.params.frequency;
        const v = this.params.phaseSpeed;
        const lambda = v / f;
        const k = 2 * Math.PI / lambda;
        const w = 2 * Math.PI * f;
        const gamma = this.params.damping;
        
        // We only show wave if t > x/v (causality from origin)
        if (t < x / v) return 0;
        
        return Math.sin(k * x - w * t) * Math.exp(-gamma * x);
    },

    update(dt) {
        this.time += dt;
        
        // Peak detection roughly for automated speed
        const y1 = this.getWaveAmplitude(this.probe1.x, this.time);
        const y2 = this.getWaveAmplitude(this.probe2.x, this.time);
        if (y1 > 0.9 && y1 < this.lastPeak1Val) {
            this.lastPeak1Time = this.time;
        }
        this.lastPeak1Val = y1;
        
        this.measuredSpeed = this.params.phaseSpeed;
        
        return { t: this.time, p1: y1, p2: y2 };
    },

    draw(ctx, width, height) {
        const ppm = this.pixelsPerMeter;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        
        const f = this.params.frequency;
        const v = this.params.phaseSpeed;
        const lambda = v / f;
        
        if (this.params.show2D) {
            // Ripple tank view (Top-down)
            ctx.translate(width / 2, height / 2);
            for (let r = 1; r < width / ppm; r += 0.2) {
                const amp = this.getWaveAmplitude(r, this.time);
                if (Math.abs(amp) > 0.05) {
                    ctx.beginPath();
                    ctx.arc(0, 0, r * ppm, 0, Math.PI * 2);
                    // Map amp [-1, 1] to opacity
                    ctx.strokeStyle = amp > 0 ? `rgba(56, 189, 248, ${amp*0.8})` : `rgba(239, 68, 68, ${-amp*0.8})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        } else {
            // 1D String view
            ctx.translate(50, height / 2);
            
            // Draw axes
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width, 0);
            ctx.stroke();
            
            // Draw wave
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 0; x < (width - 100) / ppm; x += 0.1) {
                const y = -this.getWaveAmplitude(x, this.time) * ppm;
                if (x === 0) ctx.moveTo(x * ppm, y);
                else ctx.lineTo(x * ppm, y);
            }
            ctx.stroke();
            
            // Draw Probes
            const p1y = -this.getWaveAmplitude(this.probe1.x, this.time) * ppm;
            const p2y = -this.getWaveAmplitude(this.probe2.x, this.time) * ppm;
            
            ctx.fillStyle = '#38bdf8'; // Probe 1
            ctx.beginPath(); ctx.arc(this.probe1.x * ppm, p1y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(this.probe1.x * ppm - 1, p1y, 2, height/2 - p1y);
            ctx.fillText('P1', this.probe1.x * ppm - 10, 20);
            
            ctx.fillStyle = '#ef4444'; // Probe 2
            ctx.beginPath(); ctx.arc(this.probe2.x * ppm, p2y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(this.probe2.x * ppm - 1, p2y, 2, height/2 - p2y);
            ctx.fillText('P2', this.probe2.x * ppm - 10, 20);
            
            // Wavelength marker
            ctx.strokeStyle = '#a3e635';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.probe1.x * ppm, -100);
            ctx.lineTo((this.probe1.x + lambda) * ppm, -100);
            ctx.stroke();
            ctx.fillStyle = '#a3e635';
            ctx.fillText(`λ = ${lambda.toFixed(2)} m`, (this.probe1.x + lambda/2) * ppm - 25, -110);
        }
        
        ctx.restore();
        
        // HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Automated Measurement tool v = Δx / Δt: ${this.measuredSpeed.toFixed(1)} m/s`, 10, 20);
        ctx.fillText(`Theoretical v = λ f: ${(lambda * f).toFixed(1)} m/s`, 10, 40);
        ctx.fillText(`λ = ${lambda.toFixed(2)} m`, 10, 60);
    }
};
