/* ============================================================
   engine.js — Core Simulation Engine (rAF loop + plugin API)
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - dt cap raised from 33ms to 50ms per spec (prevents physics
         explosion on tab-switch while allowing slightly larger steps)
       - Added try/catch around experiment.update() and draw() so a
         single broken module cannot crash the entire RAF loop
       - Added `engine.dev` flag (default false); when true, logs dt
         and state to console.debug every frame
       - Added optional `initCanvas(canvas)` plugin hook call in
         constructor so experiment modules can register canvas mouse
         listeners for measurement tools without breaking the API
       - Exposed engine as window.__engine when dev=true for console
         inspection
   ============================================================ */

export class SimulationEngine {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} experiment        — duck-typed plugin with update/draw/reset
     * @param {object} [graphController] — optional GraphController instance
     */
    constructor(canvas, experiment, graphController = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.experiment = experiment;
        this.graph = graphController;

        this._running = false;
        this._paused = false;
        this._lastTime = 0;
        this._rafId = null;
        this._params = { ...experiment.defaults };
        this._onStatusChange = null;

        /** Set to true to enable verbose console.debug logging */
        this.dev = false;

        // Ensure canvas is crisp on HiDPI
        this._resizeCanvas();
        this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
        this._resizeObserver.observe(this.canvas.parentElement);

        // Optional hook: let experiments register canvas event listeners
        // (e.g. measurement tools). Called once at construction time.
        if (typeof experiment.initCanvas === 'function') {
            experiment.initCanvas(canvas);
        }
    }

    // ---- Public API ----

    start() {
        if (this._running && !this._paused) return;
        if (!this._running) {
            try { this.experiment.reset(this._params); } catch (e) { console.error('[engine] reset error:', e); }
            if (this.graph) this.graph.reset();
        }
        this._running = true;
        this._paused = false;
        this._lastTime = performance.now();
        this._fireStatus('running');
        if (this.dev) {
            console.debug('[engine] start — params:', this._params);
            window.__engine = this;
        }
        this._loop(this._lastTime);
    }

    pause() {
        this._paused = true;
        this._fireStatus('paused');
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }

    reset(newParams = null) {
        this._running = false;
        this._paused = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (newParams) this._params = { ...this._params, ...newParams };
        try { this.experiment.reset(this._params); } catch (e) { console.error('[engine] reset error:', e); }
        if (this.graph) this.graph.reset();
        this._drawFrame(); // draw initial state
        this._fireStatus('idle');
    }

    step() {
        if (!this._running) {
            this._running = true;
            try { this.experiment.reset(this._params); } catch (e) { console.error('[engine] reset error:', e); }
            if (this.graph) this.graph.reset();
        }
        this._advanceFrame(1 / 60);
        this._paused = true;
        this._fireStatus('paused');
    }

    setParams(params) {
        this._params = { ...this._params, ...params };
    }

    getParams() {
        return { ...this._params };
    }

    onStatusChange(callback) {
        this._onStatusChange = callback;
    }

    destroy() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._resizeObserver.disconnect();
    }

    // ---- Internal ----

    _loop(timestamp) {
        if (!this._running || this._paused) return;

        let dt = (timestamp - this._lastTime) / 1000;
        this._lastTime = timestamp;

        // Cap dt to 50ms to prevent physics explosion on tab-switch
        dt = Math.min(dt, 0.05);

        if (this.dev) console.debug('[engine] dt:', dt.toFixed(4));

        this._advanceFrame(dt);

        this._rafId = requestAnimationFrame((t) => this._loop(t));
    }

    _advanceFrame(dt) {
        let result;
        try {
            result = this.experiment.update(dt, this._params);
        } catch (e) {
            console.error('[engine] update error:', e);
            result = null;
        }

        this._drawFrame();

        if (result && this.graph) {
            this.graph.addPoint(result);
        }

        if (result && result.done) {
            this._running = false;
            this._paused = false;
            if (this._rafId) cancelAnimationFrame(this._rafId);
            this._fireStatus('done');
        }
    }

    _drawFrame() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        this.ctx.clearRect(0, 0, w, h);
        try {
            this.experiment.draw(this.ctx, w, h);
        } catch (e) {
            console.error('[engine] draw error:', e);
        }
    }

    _resizeCanvas() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (w === 0 || h === 0) return;
        const dpr = window.devicePixelRatio || 1;
        const newW = Math.round(w * dpr);
        const newH = Math.round(h * dpr);
        // Skip if nothing changed to prevent feedback loop
        if (this.canvas.width === newW && this.canvas.height === newH) return;
        this.canvas.width = newW;
        this.canvas.height = newH;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (this.experiment) this._drawFrame();
    }

    _fireStatus(status) {
        if (this._onStatusChange) this._onStatusChange(status);
    }
}
