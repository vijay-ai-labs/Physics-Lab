/* FILE: experiments/advanced/fluid-dynamics/sim.js */
export default {
    name: 'fluid-dynamics',
    objective: 'How does fluid velocity change with pipe diameter?',
    controls: [
        { type: 'slider', key: 'flowSpeed', label: 'Flow Speed (m/s)', min: 0.1, max: 5.0, step: 0.1, default: 1.0, tooltip: 'Undisturbed free-stream velocity.' },
        { type: 'slider', key: 'viscosity', label: 'Kinematic Viscosity (x10^-4 m²/s)', min: 0.1, max: 20.0, step: 0.1, default: 2.0, tooltip: 'Fluid viscosity.' },
        { type: 'slider', key: 'objectSize', label: 'Object Size (m)', min: 0.5, max: 4.0, step: 0.1, default: 1.0, tooltip: 'Diameter or characteristic length.' },
        { type: 'slider', key: 'shape', label: 'Object Shape (1=Cyl, 2=Sq, 3=Stream)', min: 1, max: 3, step: 1, default: 1 },
        { type: 'toggle', key: 'dye', label: 'Dye Injection' },
        { type: 'toggle', key: 'showVortices', label: 'Show Vortices' }
    ],
    defaults: {
        flowSpeed: 1.0,
        viscosity: 2.0,
        shape: 1,
        dye: true,
        showVortices: false
    },
    params: { flowSpeed: 1.0, viscosity: 2.0, objectSize: 1.0, shape: 1, dye: true, showVortices: false },
    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Re',
        datasets: [
            { key: 're', label: 'Reynolds Number', color: '#38bdf8' }
        ]
    },

    particles: [],
    vortices: [],
    time: 0,
    shedTimer: 0,
    metrics: { reynolds: 0, regime: 'Laminar' },
    pixelsPerMeter: 50,

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
        this.particles = [];
        this.vortices = [];
        this.time = 0;
        this.shedTimer = 0;
        if (this.engine) {
            this.engine.graph.reset();
        }
        // Initial populate
        for (let i = 0; i < 400; i++) {
            this.addParticle(Math.random() * 10 - 5, Math.random() * 6 - 3, false);
        }
    },

    addParticle(x, y, isDye) {
        this.particles.push({
            x, y,
            age: 0,
            isDye
        });
    },

    getVelocity(x, y) {
        const U = this.params.flowSpeed;
        const R = this.params.objectSize / 2;
        let u = U;
        let v = 0;

        // Ideal flow around cylinder (simplified approximation for all shapes for now)
        const r2 = x * x + y * y;
        if (r2 > R * R && r2 < 100) {
            const r4 = r2 * r2;
            u = U * (1 - R * R * (x * x - y * y) / r4);
            v = -U * (R * R * 2 * x * y / r4);
        } else if (r2 <= R * R) {
            return { u: 0, v: 0 }; // Inside object
        }

        // Add vortices
        this.vortices.forEach(vortex => {
            const dx = x - vortex.x;
            const dy = y - vortex.y;
            const dist2 = dx * dx + dy * dy;
            // Rankine vortex
            const coreR = R * 0.5;
            const coreR2 = coreR * coreR;
            let vel = 0;
            if (dist2 < coreR2) {
                vel = vortex.strength * Math.sqrt(dist2) / coreR2; // rigid body
            } else if (dist2 > 0) {
                vel = vortex.strength / Math.sqrt(dist2); // irrotational
            }
            // Add vortex velocity
            if (dist2 > 0) {
                u -= vel * (dy / Math.sqrt(dist2));
                v += vel * (dx / Math.sqrt(dist2));
            }
        });

        // Add some noise if turbulent
        if (this.metrics.reynolds > 2000) {
            const turb = Math.min((this.metrics.reynolds - 2000) / 2000, 1) * U * 0.2;
            u += (Math.random() - 0.5) * turb;
            v += (Math.random() - 0.5) * turb;
        }

        return { u, v };
    },

    update(dt) {
        this.time += dt;

        // Calculate Reynolds Number: Re = (U * D) / (nu * 10^-4)
        const nu = this.params.viscosity * 1e-4;
        this.metrics.reynolds = (this.params.flowSpeed * this.params.objectSize) / nu;
        
        if (this.metrics.reynolds < 100) this.metrics.regime = 'Laminar Strict';
        else if (this.metrics.reynolds < 2000) this.metrics.regime = 'Laminar (Vortex Shedding)';
        else this.metrics.regime = 'Turbulent';

        // Vortex shedding
        const U = this.params.flowSpeed;
        const D = this.params.objectSize;
        const St = 0.2; // Strouhal number
        const f = U === 0 ? 0.01 : St * U / D;
        const shedPeriod = 1 / f;

        if (this.metrics.reynolds > 100 && this.metrics.reynolds < 500000) {
            this.shedTimer += dt;
            if (this.shedTimer > shedPeriod / 2) {
                this.shedTimer -= shedPeriod / 2;
                // Sign alternates
                const sign = this.vortices.length % 2 === 0 ? 1 : -1;
                // Spawn behind cylinder
                const spawnX = D;
                const spawnY = sign * (D / 2);
                this.vortices.push({
                    x: spawnX,
                    y: spawnY,
                    strength: sign * U * D * 0.5,
                    age: 0
                });
            }
        }

        // Update vortices (move them downstream)
        this.vortices.forEach(v => {
            v.x += U * 0.8 * dt; // Wake moves slightly slower than freestream
            v.age += dt;
            // Decay
            v.strength *= Math.pow(0.9, dt);
        });
        // Remove old vortices
        this.vortices = this.vortices.filter(v => v.age < 10 / U);

        // Inject particles
        const numToInject = Math.floor(U * dt * 200);
        for (let i = 0; i < numToInject; i++) {
            const y = Math.random() * 6 - 3;
            const isDye = this.params.dye && Math.abs(y % 0.5) < 0.05;
            this.addParticle(-5, y, isDye);
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const vel = this.getVelocity(p.x, p.y);
            p.x += vel.u * dt;
            p.y += vel.v * dt;
            p.age += dt;

            // Remove if out of bounds (approx x > 8)
            if (p.x > 8 || Math.abs(p.y) > 4) {
                this.particles.splice(i, 1);
            }
        }

        // Max particles constraint
        if (this.particles.length > 3000) {
            this.particles.splice(0, this.particles.length - 3000);
        }

        if (this.engine && this.time % 0.2 < dt) {
            this.engine.graph.addDataPoint(this.time, this.metrics.reynolds);
        }
    },

    draw(ctx, width, height) {
        const ppm = this.pixelsPerMeter;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 3, height / 2);

        // Draw Object
        ctx.fillStyle = '#475569';
        const PSize = this.params.objectSize * ppm;
        if (this.params.shape === 1) {
            // Cylinder
            ctx.beginPath();
            ctx.arc(0, 0, PSize / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.params.shape === 2) {
            // Square
            ctx.fillRect(-PSize / 2, -PSize / 2, PSize, PSize);
        } else if (this.params.shape === 3) {
            // Streamlined (Airfoil-ish)
            ctx.beginPath();
            ctx.ellipse(0, 0, PSize, PSize / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw particles
        ctx.globalAlpha = 0.6;
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x * ppm, p.y * ppm, p.isDye ? 2 : 1.5, 0, Math.PI * 2);
            if (p.isDye) {
                ctx.fillStyle = '#ef4444'; // Red dye
            } else {
                ctx.fillStyle = '#bae6fd'; // Light blue fluid
            }
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Draw vortices if toggled
        if (this.params.showVortices) {
            ctx.lineWidth = 1.5;
            for (const v of this.vortices) {
                ctx.beginPath();
                ctx.arc(v.x * ppm, v.y * ppm, Math.abs(v.strength) * 20, 0, Math.PI * 2);
                ctx.strokeStyle = v.strength > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(56, 189, 248, 0.5)';
                ctx.stroke();
            }
        }

        ctx.restore();

        // Draw HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Reynolds Number (Re): ${Math.round(this.metrics.reynolds)}`, 10, 20);
        ctx.fillText(`Regime: ${this.metrics.regime}`, 10, 40);
        
        ctx.fillStyle = this.metrics.reynolds > 2000 ? '#ef4444' : (this.metrics.reynolds > 100 ? '#f59e0b' : '#10b981');
        ctx.beginPath();
        ctx.arc(10 + ctx.measureText(`Regime: ${this.metrics.regime}`).width + 15, 35, 6, 0, Math.PI * 2);
        ctx.fill();
    }
};
