/* FILE: experiments/advanced/electric-field/sim.js */
export default {
    name: 'electric-field',
    objective: 'What is the electric field around point charges?',
    controls: [
        { type: 'slider', key: 'q1', label: 'Charge 1 (µC)', min: -10, max: 10, step: 1, default: 5 },
        { type: 'slider', key: 'q2', label: 'Charge 2 (µC)', min: -10, max: 10, step: 1, default: -5 },
        { type: 'slider', key: 'q3', label: 'Charge 3 (µC)', min: -10, max: 10, step: 1, default: 0 },
        { type: 'toggle', key: 'showVectors', label: 'Vector Field' },
        { type: 'toggle', key: 'showPotential', label: 'Potential Map' }
    ],
    defaults: {
        q1: 5, q2: -5, q3: 0, showVectors: true, showPotential: false
    },
    params: { q1: 5, q2: -5, q3: 0, showVectors: true, showPotential: false },
    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'E Magnitude (V/m)',
        datasets: [{ key: 'e', label: 'E Field', color: '#10b981' }]
    },

    charges: [],
    probe: { x: 0, y: -2, isDragging: false },
    time: 0,
    pixelsPerMeter: 50,
    k: 8.987e9,

    onEngineReady(engine) {
        this.engine = engine;
        this.setupInteraction();
    },

    setupInteraction() {
        const canvas = this.engine.canvas;
        let draggingCharge = null;

        const getMousePos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = (clientX - rect.left - canvas.width / 2) / this.pixelsPerMeter;
            const y = (clientY - rect.top - canvas.height / 2) / this.pixelsPerMeter;
            return { x, y };
        };

        const onDown = (e) => {
            const { x, y } = getMousePos(e);
            
            // Check if probe is clicked
            if (Math.hypot(x - this.probe.x, y - this.probe.y) < 0.5) {
                this.probe.isDragging = true;
                if (e.touches && typeof this.engine.pause === 'function') this.engine.pause();
                return;
            }

            // Check if charge is clicked
            for (let i = 0; i < this.charges.length; i++) {
                if (Math.hypot(x - this.charges[i].x, y - this.charges[i].y) < 0.5) {
                    draggingCharge = this.charges[i];
                    return;
                }
            }
        };

        const onMove = (e) => {
            if (!this.probe.isDragging && !draggingCharge) return;
            e.preventDefault(); // Prevent scrolling
            const { x, y } = getMousePos(e);
            if (this.probe.isDragging) {
                this.probe.x = x;
                this.probe.y = y;
            } else if (draggingCharge) {
                draggingCharge.x = x;
                draggingCharge.y = y;
            }
            if(this.engine.status === 'paused') this.engine.draw();
        };

        const onUp = () => {
            this.probe.isDragging = false;
            draggingCharge = null;
        };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        
        canvas.addEventListener('touchstart', onDown, {passive: false});
        canvas.addEventListener('touchmove', onMove, {passive: false});
        window.addEventListener('touchend', onUp);
    },

    initFromControls(params) {
        this.params = params;
        if (this.charges.length >= 3) {
            this.charges[0].q = params.q1 * 1e-6;
            this.charges[1].q = params.q2 * 1e-6;
            this.charges[2].q = params.q3 * 1e-6;
        }
        if (this.engine && this.engine.status === 'paused') this.engine.draw();
    },

    start() { },

    pause() { },

    reset(params) {
        this.params = params;
        this.time = 0;
        this.charges = [
            { id: 1, x: -2, y: 0, q: params.q1 * 1e-6 },
            { id: 2, x: 2, y: 0, q: params.q2 * 1e-6 },
            { id: 3, x: 0, y: 2, q: params.q3 * 1e-6 }
        ];
        this.probe = { x: 0, y: -2, isDragging: false };
        if (this.engine) this.engine.graph.reset();
    },

    getEField(x, y) {
        let Ex = 0;
        let Ey = 0;
        for (const c of this.charges) {
            if (c.q === 0) continue;
            const dx = x - c.x;
            const dy = y - c.y;
            const r2 = dx * dx + dy * dy;
            if (r2 < 0.01) continue; // Avoid singularity
            const E = this.k * c.q / r2;
            const r = Math.sqrt(r2);
            Ex += E * dx / r;
            Ey += E * dy / r;
        }
        return { Ex, Ey, E: Math.hypot(Ex, Ey) };
    },
    
    getPotential(x, y) {
        let V = 0;
        for (const c of this.charges) {
            if (c.q === 0) continue;
            const dx = x - c.x;
            const dy = y - c.y;
            const r = Math.hypot(dx, dy);
            if (r < 0.01) continue;
            V += this.k * c.q / r;
        }
        return V;
    },

    update(dt) {
        this.time += dt;
        
        // Auto-wobble probe slightly to show live graph if user not dragging
        if (!this.probe.isDragging && dt > 0) {
            this.probe.x += Math.sin(this.time * 2) * 0.005;
        }

        const field = this.getEField(this.probe.x, this.probe.y);
        return { t: this.time, e: field.E };
    },

    draw(ctx, width, height) {
        const ppm = this.pixelsPerMeter;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Potential map (coarse grid)
        if (this.params.showPotential) {
            const step = 10; // pixels
            for (let y = -height/2; y < height/2; y += step) {
                for (let x = -width/2; x < width/2; x += step) {
                    const V = this.getPotential(x / ppm, y / ppm);
                    // Map V to color (-100k to +100k mostly)
                    let normalizedV = Math.max(-1, Math.min(1, V / 100000));
                    let r, g, b, a;
                    if (normalizedV > 0) {
                        r = 239; g = 68; b = 68; // Red
                        a = normalizedV * 0.5;
                    } else {
                        r = 56; g = 189; b = 248; // Blue
                        a = -normalizedV * 0.5;
                    }
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
                    ctx.fillRect(x, y, step, step);
                }
            }
        }
        
        // Vector field
        if (this.params.showVectors) {
            const step = 30; // pixels
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            
            for (let y = -height/2 + step/2; y < height/2; y += step) {
                for (let x = -width/2 + step/2; x < width/2; x += step) {
                    const field = this.getEField(x / ppm, y / ppm);
                    if (field.E === 0) continue;
                    
                    const MAX_LEN = 12;
                    // Logarithmic-like scaling for arrow length
                    const len = Math.min(MAX_LEN, Math.log10(field.E + 1) * 2);
                    if (len < 2) continue;
                    
                    const dx = (field.Ex / field.E) * len;
                    const dy = (field.Ey / field.E) * len;
                    
                    this.drawArrow(ctx, x, y, x + dx, y + dy);
                }
            }
        }
        
        // Draw probe
        const fieldAtProbe = this.getEField(this.probe.x, this.probe.y);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(this.probe.x * ppm, this.probe.y * ppm, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        // Probe arrow
        const ex = fieldAtProbe.Ex / fieldAtProbe.E || 0;
        const ey = fieldAtProbe.Ey / fieldAtProbe.E || 0;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        this.drawArrow(ctx, this.probe.x * ppm, this.probe.y * ppm, this.probe.x * ppm + ex * 30, this.probe.y * ppm + ey * 30);
        
        // Draw charges
        for (const c of this.charges) {
            if (c.q === 0) continue;
            ctx.beginPath();
            ctx.arc(c.x * ppm, c.y * ppm, 12, 0, Math.PI * 2);
            ctx.fillStyle = c.q > 0 ? '#ef4444' : '#38bdf8';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(c.q > 0 ? '+' : '-', c.x * ppm, c.y * ppm);
        }
        
        ctx.restore();
        
        // HUD
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Probe |E|: ${(fieldAtProbe.E).toExponential(2)} V/m`, 10, 20);
        ctx.fillText(`Probe V: ${this.getPotential(this.probe.x, this.probe.y).toExponential(2)} V`, 10, 40);
        ctx.fillText('Drag charges or probe to explore field', 10, this.engine.canvas.height - 10);
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
    }
};
