/* ============================================================
   dragHelper.js — Reusable Drag Interaction Utility
   ============================================================
   Provides pointer-event based drag attachment for canvas
   simulation objects. Uses Pointer Events API for unified
   mouse/touch/pen support and correct pointer capture.

   Design:
     - Zero physics side-effects; only handles input + cursor.
     - DPR-aware coordinate conversion.
     - pointer* events don't conflict with existing mouse* listeners.
   ============================================================ */

/**
 * Convert a PointerEvent / MouseEvent to logical (DPR-aware)
 * canvas coordinates.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {PointerEvent|MouseEvent} e
 * @returns {{ x: number, y: number }}
 */
export function getCanvasPos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // CSS pixels → logical canvas pixels
    const scaleX = (canvas.width / dpr) / rect.width;
    const scaleY = (canvas.height / dpr) / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}

/**
 * Attach a drag handler to a canvas for a single draggable object.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {number}   opts.hitRadius   — px radius around centre that counts as a hit
 * @param {function} opts.getCenter   — () => {x, y}  returns current object centre in canvas px
 * @param {function} [opts.onDragStart] — ({x, y}) called when drag begins
 * @param {function} opts.onDrag      — ({x, y}) called each move while dragging
 * @param {function} [opts.onDragEnd]  — () called when drag finishes
 * @returns {function} detach — call to remove all listeners
 */
export function attachDrag(canvas, { hitRadius = 20, getCenter, onDragStart, onDrag, onDragEnd }) {
    let dragging = false;
    let activePointerId = null;

    function onPointerDown(e) {
        if (e.button !== 0) return; // left button only
        const pos = getCanvasPos(canvas, e);
        const center = getCenter();
        if (!center) return;

        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        if (Math.sqrt(dx * dx + dy * dy) > hitRadius) return;

        dragging = true;
        activePointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';

        if (onDragStart) onDragStart(pos);
        e.preventDefault();
        e.stopPropagation();
    }

    function onPointerMove(e) {
        if (!dragging || e.pointerId !== activePointerId) {
            // Hover feedback: change cursor when near the object
            if (!dragging) {
                const pos = getCanvasPos(canvas, e);
                const center = getCenter();
                if (center) {
                    const dx = pos.x - center.x;
                    const dy = pos.y - center.y;
                    // Only update cursor if not already in grabbing mode from another handler
                    if (canvas.style.cursor !== 'grabbing') {
                        canvas.style.cursor = Math.sqrt(dx * dx + dy * dy) <= hitRadius
                            ? 'grab' : '';
                    }
                }
            }
            return;
        }
        const pos = getCanvasPos(canvas, e);
        onDrag(pos);
        e.preventDefault();
    }

    function onPointerUp(e) {
        if (!dragging || e.pointerId !== activePointerId) return;
        dragging = false;
        activePointerId = null;
        canvas.style.cursor = '';
        if (onDragEnd) onDragEnd();
        e.preventDefault();
    }

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', onPointerUp, { passive: false });

    return function detach() {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
    };
}

/**
 * Draw a pulsing "grab me" ring around a draggable object.
 * Call from within the sim's draw() for visual feedback.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx       — canvas X
 * @param {number} cy       — canvas Y
 * @param {number} radius   — base ring radius
 * @param {string} color    — CSS colour
 * @param {boolean} isDragging — true = solid bright ring, false = pulsing hint ring
 * @param {number}  t          — current sim time (for pulse animation)
 */
export function drawDragHandle(ctx, cx, cy, radius, color, isDragging, t = 0) {
    ctx.save();
    if (isDragging) {
        // Bright solid ring + crosshairs
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair lines
        ctx.shadowBlur = 0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - radius - 14, cy); ctx.lineTo(cx + radius + 14, cy);
        ctx.moveTo(cx, cy - radius - 14); ctx.lineTo(cx, cy + radius + 14);
        ctx.stroke();
        ctx.setLineDash([]);
    } else {
        // Pulsing hint ring using sin wave on time
        const pulse = 0.45 + 0.35 * Math.sin(t * 3.0);
        ctx.strokeStyle = color;
        ctx.globalAlpha = pulse;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}
