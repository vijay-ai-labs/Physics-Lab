/* FILE: experiments/intermediate/doppler-moving-source-observer/sim.js
   ============================================================
   Doppler Effect — Moving Source & Observer
   ============================================================
   Physics:
     Both source (S) and observer (O) move along a track.
     Wavefronts emitted by S expand as circles at speed v_sound.
     Each stored wavefront: { xEmit, tEmit }.
     Radius at current time t: r = v_sound * (t - tEmit)

     Observed frequency (both moving rightward):
       f_obs = f_src * (v_sound - v_obs) / (v_sound - v_src)
     When v_src ≥ v_sound: Mach ≥ 1 → sonic-boom indicator.

     WebAudio: OscillatorNode at f_obs, enabled by toggle.
   ============================================================ */

import { clamp, drawGrid } from '../../../js/utils.js';

const MAX_WAVEFRONTS = 80;   // cap older rings to avoid memory growth
const EMIT_INTERVAL  = 0.04; // emit a new wavefront every N seconds (visual cadence)
const PPM            = 50;   // pixels per virtual "meter" on track

// ── WebAudio state (module-level) ──────────────────────────
let _audioCtx   = null;
let _oscillator = null;
let _gainNode   = null;

function _ensureAudio() {
    if (_audioCtx) return;
    try {
        _audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
        _gainNode  = _audioCtx.createGain();
        _gainNode.gain.value = 0.08;
        _gainNode.connect(_audioCtx.destination);
    } catch (e) { _audioCtx = null; }
}
function _startOscillator(freq) {
    _ensureAudio();
    if (!_audioCtx) return;
    if (_oscillator) return;
    // Resume context if suspended (browser autoplay policy)
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    _oscillator = _audioCtx.createOscillator();
    _oscillator.type = 'sine';
    _oscillator.frequency.value = clamp(freq, 20, 4000);
    _oscillator.connect(_gainNode);
    _oscillator.start();
}
function _stopOscillator() {
    if (!_oscillator) return;
    try { _oscillator.stop(); } catch (_) {}
    _oscillator.disconnect();
    _oscillator = null;
}
function _setOscFreq(freq) {
    if (!_oscillator || !_audioCtx) return;
    _oscillator.frequency.setTargetAtTime(clamp(freq, 20, 4000), _audioCtx.currentTime, 0.05);
}

// ── Simulation module ──────────────────────────────────────
const sim = {
    name: 'Doppler Effect',

    objective: 'What frequency does the observer hear?',
    defaults: {
        srcSpeed:    80,      // m/s (source moves right)
        obsSpeed:    0,       // m/s (observer moves right)
        freqSrc:     440,     // Hz — emitted frequency
        vSound:      343,     // m/s — speed of sound in medium
        audioOn:     false,
        showBoom:    true,
    },

    controls: [
        { type: 'slider', key: 'srcSpeed',  label: 'Source Speed (m/s)',
          min: 0, max: 500, step: 5,
          tooltip: 'Speed of the wave source moving rightward. Above 343 m/s = supersonic.' },
        { type: 'slider', key: 'obsSpeed',  label: 'Observer Speed (m/s)',
          min: 0, max: 400, step: 5,
          tooltip: 'Speed of the observer moving rightward.' },
        { type: 'slider', key: 'freqSrc',   label: 'Emitted Frequency (Hz)',
          min: 100, max: 2000, step: 10,
          tooltip: 'Frequency emitted by the source. The observer hears a different frequency.' },
        { type: 'slider', key: 'vSound',    label: 'Sound Speed (m/s)',
          min: 100, max: 1000, step: 10,
          tooltip: 'Speed of sound in the medium. 343 m/s = air at 20 °C.' },
        { type: 'toggle', key: 'audioOn',   label: '🔉 Play Audio',
          tooltip: 'Plays the observed pitch via the browser Web Audio API.' },
        { type: 'toggle', key: 'showBoom',  label: '⚡ Mach Cone' },
    ],

    graphConfig: {
        xAxis: 'Time (s)',
        yAxis: 'Frequency (Hz)',
        datasets: [
            { key: 'fObs',  label: 'f_obs (Hz)',  color: '#38bdf8' },
            { key: 'fSrc',  label: 'f_src (Hz)',  color: '#fbbf24' },
        ],
    },

    // ── Private state ──────────────────────────────────────
    _t:          0,
    _xSrc:       0,   // source x in "meters"
    _xObs:       0,   // observer x in "meters"
    _wavefronts: [],  // [{xEmit, tEmit}]
    _nextEmit:   0,
    _fObs:       440,
    _params:     null,
    _graphInterval: 0, // throttle graph updates

    reset(params) {
        this._params     = { ...params };
        this._t          = 0;
        this._xSrc       = 0;
        this._xObs       = 8; // observer starts 8m ahead
        this._wavefronts = [];
        this._nextEmit   = 0;
        this._fObs       = params.freqSrc;
        this._graphInterval = 0;
        _stopOscillator();
    },

    update(dt, params) {
        this._params = params;
        const { srcSpeed: vs, obsSpeed: vo, freqSrc: fs, vSound: v, audioOn } = params;

        // Advance positions
        this._xSrc += vs * dt;
        this._xObs += vo * dt;
        this._t    += dt;

        // Keep observer always ahead of source with minimum gap
        const minGap = 6;
        if (this._xObs <= this._xSrc + minGap) {
            this._xObs = this._xSrc + minGap;
        }

        // Emit new wavefront
        if (this._t >= this._nextEmit) {
            this._wavefronts.push({ xEmit: this._xSrc, tEmit: this._t });
            this._nextEmit = this._t + EMIT_INTERVAL;
            if (this._wavefronts.length > MAX_WAVEFRONTS) this._wavefronts.shift();
        }

        // Prune old wavefronts that have expanded beyond useful display range
        const maxAge = 1.8; // seconds — shorter to keep rings tight and visible
        this._wavefronts = this._wavefronts.filter(wf => (this._t - wf.tEmit) < maxAge);

        // Compute observed frequency (both moving right, source behind observer)
        const denom = v - vs;
        if (Math.abs(denom) < 1) {
            // At or very near sonic speed — frequency approaches infinity
            this._fObs = fs * 20; // cap display
        } else {
            this._fObs = fs * (v - vo) / denom;
        }
        // Clamp to reasonable audio/display range
        this._fObs = clamp(this._fObs, 1, 20000);

        // WebAudio
        if (audioOn) {
            if (!_oscillator) _startOscillator(this._fObs);
            else _setOscFreq(this._fObs);
        } else {
            _stopOscillator();
        }

        // Throttle graph updates: ~20 per second max to avoid chart overload
        this._graphInterval += dt;
        if (this._graphInterval < 0.05) return null;
        this._graphInterval = 0;

        return {
            t:    parseFloat(this._t.toFixed(2)),
            fObs: parseFloat(this._fObs.toFixed(1)),
            fSrc: fs,
            done: false,
        };
    },

    draw(ctx, w, h) {
        if (!this._params) return;
        const { srcSpeed: vs, obsSpeed: vo, freqSrc: fs, vSound: v, showBoom } = this._params;

        // ── Background — dark gradient ────────────────────────
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#070b16');
        bgGrad.addColorStop(1, '#0c1225');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Subtle grid
        ctx.strokeStyle = 'rgba(100,120,180,0.06)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < w; gx += 40) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
        }
        for (let gy = 0; gy < h; gy += 40) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }

        // ── Layout: track at 55% height ───────────────────────
        const trackY  = h * 0.55;

        // Camera tracks so both Source and Observer are well-framed
        // Place source at 30% from left, observer at 70% from left
        const srcFrac = 0.3;
        const obsFrac = 0.7;
        const physDist = Math.max(this._xObs - this._xSrc, 1);
        const usableW = (obsFrac - srcFrac) * w; // pixels between 30% and 70%
        const dynamicPPM = Math.min(PPM, usableW / physDist); // scale down if they're far apart
        const srcCX = w * srcFrac;
        const obsCX = srcCX + physDist * dynamicPPM;
        const offset = srcCX - this._xSrc * dynamicPPM;
        const toCanvasX = (xPhys) => offset + xPhys * dynamicPPM;
        const effectivePPM = dynamicPPM;

        // ── Ground track ──────────────────────────────────────
        // Track line with glow
        ctx.shadowColor = 'rgba(100,116,139,0.3)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.moveTo(0, trackY); ctx.lineTo(w, trackY); ctx.stroke();
        ctx.shadowBlur = 0;

        // Distance markers
        ctx.strokeStyle = 'rgba(100,116,139,0.15)';
        ctx.lineWidth   = 1;
        for (let mx = (offset % PPM + PPM) % PPM; mx < w; mx += PPM) {
            ctx.beginPath(); ctx.moveTo(mx, trackY - 5); ctx.lineTo(mx, trackY + 5); ctx.stroke();
        }

        // ── Wavefronts ───────────────────────────────────────
        const mach    = vs / Math.max(v, 1);
        const isMach1 = mach >= 1;

        for (const wf of this._wavefronts) {
            const r   = v * (this._t - wf.tEmit) * effectivePPM;
            const cx  = toCanvasX(wf.xEmit);
            const age = this._t - wf.tEmit;
            const alpha = Math.max(0, 1 - age * 0.6);
            if (r < 2 || alpha < 0.02) continue;

            // Skip wavefronts entirely off-canvas
            if (cx + r < -10 || cx - r > w + 10) continue;
            if (trackY + r < -10 || trackY - r > h + 10) continue;

            ctx.beginPath();
            ctx.arc(cx, trackY, r, 0, Math.PI * 2);

            if (isMach1) {
                ctx.strokeStyle = `rgba(251,113,133,${alpha * 0.65})`;
            } else {
                // Gradient color based on age: cyan → blue
                const g = Math.round(189 - age * 40);
                const b2 = Math.round(248 - age * 20);
                ctx.strokeStyle = `rgba(56,${clamp(g, 100, 189)},${clamp(b2, 200, 248)},${alpha * 0.7})`;
            }
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ── Sonic-boom (Mach) cone ────────────────────────────
        if (showBoom && isMach1) {
            const sinTheta = 1 / mach;
            const cosTheta = Math.sqrt(Math.max(0, 1 - sinTheta * sinTheta));
            const boomLen  = h * 0.7;
            const bx = -cosTheta * boomLen;
            const by =  sinTheta * boomLen;

            ctx.strokeStyle = 'rgba(251,113,133,0.7)';
            ctx.lineWidth   = 2.5;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.moveTo(srcCX, trackY);
            ctx.lineTo(srcCX + bx, trackY - by);
            ctx.moveTo(srcCX, trackY);
            ctx.lineTo(srcCX + bx, trackY + by);
            ctx.stroke();
            ctx.setLineDash([]);

            // Shockwave label
            ctx.save();
            ctx.fillStyle = 'rgba(251,113,133,0.9)';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText('SHOCKWAVE', srcCX + bx / 2 - 30, trackY - by / 2 - 8);
            ctx.restore();
        }

        // ── Source (speaker icon) ─────────────────────────────
        if (srcCX > -30 && srcCX < w + 30) {
            // Glow behind source
            ctx.shadowColor = isMach1 ? 'rgba(251,113,133,0.5)' : 'rgba(124,58,237,0.5)';
            ctx.shadowBlur = 14;

            // Circle body
            ctx.beginPath();
            ctx.arc(srcCX, trackY, 16, 0, Math.PI * 2);
            const srcGrad = ctx.createRadialGradient(srcCX - 3, trackY - 3, 2, srcCX, trackY, 16);
            srcGrad.addColorStop(0, isMach1 ? '#fda4af' : '#a78bfa');
            srcGrad.addColorStop(1, isMach1 ? '#e11d48' : '#6d28d9');
            ctx.fillStyle = srcGrad;
            ctx.fill();
            ctx.strokeStyle = isMach1 ? '#fecdd3' : '#c4b5fd';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Speaker icon inside
            ctx.fillStyle = '#fff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔊', srcCX, trackY);

            // Speed label
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#c4b5fd';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(`${vs} m/s →`, srcCX, trackY - 24);
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Source', srcCX, trackY + 30);
            ctx.textAlign = 'left';
        }

        // ── Observer (ear icon) ──────────────────────────────
        if (obsCX > -30 && obsCX < w + 30) {
            ctx.shadowColor = 'rgba(16,185,129,0.4)';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.arc(obsCX, trackY, 16, 0, Math.PI * 2);
            const obsGrad = ctx.createRadialGradient(obsCX - 3, trackY - 3, 2, obsCX, trackY, 16);
            obsGrad.addColorStop(0, '#6ee7b7');
            obsGrad.addColorStop(1, '#047857');
            ctx.fillStyle = obsGrad;
            ctx.fill();
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Ear icon inside
            ctx.fillStyle = '#fff';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👂', obsCX, trackY);

            // Speed label
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#6ee7b7';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(`${vo} m/s →`, obsCX, trackY - 24);
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Observer', obsCX, trackY + 30);
            ctx.textAlign = 'left';
        }

        // ── Connecting line between S and O ───────────────────
        if (srcCX < w + 30 && obsCX > -30) {
            const distMeters = Math.abs(this._xObs - this._xSrc);
            ctx.setLineDash([4, 6]);
            ctx.strokeStyle = 'rgba(148,163,184,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(srcCX + 18, trackY);
            ctx.lineTo(obsCX - 18, trackY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Distance label
            const midCXLine = (srcCX + obsCX) / 2;
            ctx.fillStyle = 'rgba(148,163,184,0.5)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${distMeters.toFixed(1)} m`, midCXLine, trackY - 6);
            ctx.textAlign = 'left';
        }

        // ── Info overlay (top-left) ──────────────────────────
        const panelX = 14, panelY = 18;

        // Semi-transparent background for readability
        ctx.fillStyle = 'rgba(7,11,22,0.7)';
        ctx.beginPath();
        ctx.roundRect(panelX - 6, panelY - 14, 220, 80, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,116,139,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font      = 'bold 14px Inter, sans-serif';
        ctx.fillText(`f_src = ${fs} Hz`, panelX, panelY + 2);

        // Color the observed frequency based on shift direction
        const fShift = this._fObs - fs;
        const fColor = fShift > 5 ? '#38bdf8' : fShift < -5 ? '#fb923c' : '#e2e8f0';
        ctx.fillStyle = fColor;
        ctx.fillText(`f_obs = ${this._fObs.toFixed(1)} Hz`, panelX, panelY + 22);

        // Shift direction indicator
        const shiftLabel = fShift > 5 ? '▲ Blue shift' : fShift < -5 ? '▼ Red shift' : '● No shift';
        ctx.fillStyle = fColor;
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(shiftLabel, panelX, panelY + 40);

        ctx.fillStyle = '#64748b';
        ctx.font      = '11px Inter, sans-serif';
        ctx.fillText(`Mach = ${mach.toFixed(2)}`, panelX + 130, panelY + 22);

        // ── Mach status (bottom-left) ────────────────────────
        if (showBoom) {
            let label, statusColor;
            if (mach >= 1) {
                label = `⚡ SUPERSONIC  M = ${mach.toFixed(2)}`;
                statusColor = '#fb7185';
            } else if (mach >= 0.8) {
                label = `⚠ Transonic  M = ${mach.toFixed(2)}`;
                statusColor = '#fbbf24';
            } else {
                label = `✓ Subsonic  M = ${mach.toFixed(2)}`;
                statusColor = '#34d399';
            }
            ctx.fillStyle = statusColor;
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(label, 14, h - 14);
        }

        // ── Bottom-right info ────────────────────────────────
        ctx.fillStyle = '#475569';
        ctx.font      = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`v_sound = ${v} m/s    t = ${this._t.toFixed(1)} s`, w - 10, h - 10);
        ctx.textAlign = 'left';
    },

    // Cleanup audio on experiment exit
    destroy() {
        _stopOscillator();
        if (_audioCtx) {
            try { _audioCtx.close(); } catch (_) {}
            _audioCtx = null;
            _gainNode = null;
        }
    },
};

export default sim;
