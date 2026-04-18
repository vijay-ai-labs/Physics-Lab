/* ============================================================
   utils.js — Math helpers, physical constants, unit formatting
   ============================================================ */

// ---- Physical Constants ----
export const CONSTANTS = {
    g: 9.81,          // gravitational acceleration (m/s²)
    G: 6.674e-11,     // gravitational constant (N·m²/kg²)
    c: 3e8,           // speed of light (m/s)
    PI: Math.PI,
    TAU: Math.PI * 2,
    e: 1.602e-19,    // electron charge (C)
};

// ---- Angle Conversions ----
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

// ---- Numeric Helpers ----
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function map(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

// ---- Formatting ----
export function formatUnit(value, unit, precision = 2) {
    return `${value.toFixed(precision)} ${unit}`;
}

export function formatTime(seconds) {
    return `${seconds.toFixed(2)}s`;
}

// ---- Color Helpers ----
export function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hsl(h, s, l, a = 1) {
    return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
}

// ---- Canvas Helpers ----
export function clearCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
}

export function drawGrid(ctx, w, h, step = 40, color = 'rgba(255,255,255,0.04)') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
}
