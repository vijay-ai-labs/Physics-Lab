/* FILE: experiments/advanced/magnetic-wire/sim.js */
export default {
    name: 'magnetic-wire',
    objective: 'What magnetic field forms around a current-carrying wire?',
    controls: [
        { type: 'slider', key: 'current', label: 'Current (A)', min: -10, max: 10, step: 0.1, default: 5 },
        { type: 'slider', key: 'probeDistance', label: 'Probe Distance (m)', min: 0.1, max: 5.0, step: 0.1, default: 2.0 },
        { type: 'toggle', key: 'isLoop', label: 'Wire Loop Mode' },
        { type: 'toggle', key: 'showVectors', label: 'Vector Arrow Field' }
    ],
    defaults: {
        current: 5, probeDistance: 2.0, isLoop: false, showVectors: true
    },
    params: { current: 5, probeDistance: 2.0, isLoop: false, showVectors: true },
    graphConfig: {
        xAxis: 'Distance (m)',
        yAxis: 'B Magnitude (µT)',
        datasets: [{ key: 'b', label: 'B Field', color: '#f59e0b' }]
    },

    time: 0,
    pixelsPerMeter: 50,
    mu0: 4 * Math.PI * 1e-7,
    recordedData: new Map(),

    onEngineReady(engine) {
        this.engine = engine;
    },

    initFromControls(params) {
        this.params = params;
        this.updateGraphData();
    },

    start() { },
    pause() { },

    reset(params) {
        this.params = params;
        this.time = 0;
        this.recordedData.clear();
        if (this.engine) this.engine.graph.reset();
    },

    getBField(x, y) {
        const I = this.params.current;
        let Bx = 0;
        let By = 0;
        
        if (!this.params.isLoop) {
            // Straight wire at origin, current along Z
            const r2 = x*x + y*y;
            if (r2 < 0.001) return { Bx: 0, By: 0, B: 0 };
            const r = Math.sqrt(r2);
            // B = u0 I / (2 pi r)
            const B = (this.mu0 * I) / (2 * Math.PI * r);
            // Direction is tangent to circle: (-y, x)
            Bx = -B * (y / r);
            By = B * (x / r);
        } else {
            // Loop mode: approximated as two straight wires at x=-2 and x=2
            // One wire has current +I, other has -I
            const wires = [
                {x: -1.5, y: 0, I: I},
                {x: 1.5, y: 0, I: -I}
            ];
            for (const w of wires) {
                const dx = x - w.x;
                const dy = y - w.y;
                const r2 = dx*dx + dy*dy;
                if (r2 < 0.001) continue;
                const r = Math.sqrt(r2);
                const B = (this.mu0 * w.I) / (2 * Math.PI * r);
                Bx += -B * (dy / r);
                By += B * (dx / r);
            }
        }
        return { Bx, By, B: Math.hypot(Bx, By) };
    },

    updateGraphData() {
        if (!this.engine) return;
        const d = this.params.probeDistance;
        // Probe is at (probeDistance, 0)
        const field = this.getBField(d, 0);
        const bMicro = field.B * 1e6;
        
        // We accumulate data points for the graph explicitly based on probe distance
        this.recordedData.set(d.toFixed(1), bMicro);
        
        const chart = this.engine.graph._chart;
        if (!chart) return;
        
        // Update line graph to plot B vs r
        const dataArr = Array.from(this.recordedData.entries()).map(([k, v]) => ({x: parseFloat(k), y: v}));
        dataArr.sort((a,b) => a.x - b.x);
        
        chart.data.datasets[0].data = dataArr;
        chart.update();
    },

    update(dt) {
        this.time += dt;
        // In this sim, state responds instantly to controls, no complex time integration
    },

    draw(ctx, width, height) {
        const ppm = this.pixelsPerMeter;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Draw Field Lines/Vectors
        if (this.params.showVectors) {
            const step = 30; // pixels
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            
            for (let y = -height/2 + step/2; y < height/2; y += step) {
                for (let x = -width/2 + step/2; x < width/2; x += step) {
                    const field = this.getBField(x / ppm, y / ppm);
                    const bMicro = field.B * 1e6;
                    if (bMicro < 0.05) continue;
                    
                    const MAX_LEN = 15;
                    // logarithmic scaling for arrow length
                    const len = Math.min(MAX_LEN, Math.log10(bMicro + 1) * 8);
                    if (len < 2) continue;
                    
                    const dx = (field.Bx / field.B) * len;
                    const dy = (field.By / field.B) * len;
                    
                    this.drawArrow(ctx, x, y, x + dx, y + dy);
                }
            }
        } else {
            // Draw continuous field circles for straight wire
            if (!this.params.isLoop && this.params.current !== 0) {
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1;
                for (let r = 0.5; r <= 5.0; r += 0.5) {
                    ctx.beginPath();
                    ctx.arc(0, 0, r * ppm, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        
        // Draw Wire(s)
        const current = this.params.current;
        if (!this.params.isLoop) {
            this.drawWireCrossSection(ctx, 0, 0, current);
        } else {
            this.drawWireCrossSection(ctx, -1.5 * ppm, 0, current);
            this.drawWireCrossSection(ctx, 1.5 * ppm, 0, -current);
        }
        
        // Draw Probe
        const px = this.params.probeDistance * ppm;
        const py = 0;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        ctx.restore();
        
        // Draw Right Hand Rule indicator
        this.drawRightHandRule(ctx, 20, height - 80, current);
        
        // HUD
        const fieldAtProbe = this.getBField(this.params.probeDistance, 0);
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Probe |B|: ${(fieldAtProbe.B * 1e6).toFixed(2)} µT`, 10, 20);
    },
    
    drawWireCrossSection(ctx, x, y, I) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (I > 0) {
            // Out of page (dot)
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (I < 0) {
            // Into page (cross)
            ctx.font = '16px monospace';
            ctx.fillText('×', x, y+1);
        }
    },
    
    drawArrow(ctx, fromX, fromY, toX, toY) {
        const headlen = 5;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    },
    
    drawRightHandRule(ctx, x, y, current) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        if (current === 0) return;
        const dir = current > 0 ? "Out of screen" : "Into screen";
        const bdir = current > 0 ? "Counter-clockwise" : "Clockwise";
        ctx.fillText(`Thumb (I): ${dir}`, x, y);
        ctx.fillText(`Fingers (B): ${bdir}`, x, y + 20);
    }
};
