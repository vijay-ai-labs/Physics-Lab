/* FILE: experiments/refraction/sim.js
   ============================================================
   Refraction of Light — sim.js
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - Added Snell's law verification box (top-right): displays
         θ₁, θ₂, n₁·sin(θ₁) and n₂·sin(θ₂) so students can
         confirm n₁·sin(θ₁) = n₂·sin(θ₂) numerically at a glance.
       - Critical angle row always shown (N/A when n₁ < n₂).
   ============================================================ */
import { degToRad, radToDeg, hexToRgba, drawGrid } from '../../js/utils.js';

const sim = {
    name: 'Refraction of Light',


    objective: 'How does light bend when entering a different medium?',
    defaults: { n1: 1.0, n2: 1.5, incidentAngle: 30 },

    controls: [
        { type: 'slider', key: 'n1', label: 'n₁ (Medium 1)', min: 1.0, max: 2.5, step: 0.05, tooltip: 'Refractive index of the first medium. Air = 1.0, Water = 1.33, Glass = 1.5.' },
        { type: 'slider', key: 'n2', label: 'n₂ (Medium 2)', min: 1.0, max: 2.5, step: 0.05, tooltip: 'Refractive index of the second medium. Higher index bends light more strongly.' },
        { type: 'slider', key: 'incidentAngle', label: 'Angle of Incidence (°)', min: 0, max: 89, step: 1, tooltip: 'Angle of the incoming light ray measured from the surface normal. Increase past critical angle to see total internal reflection.' },
    ],

    graphConfig: {
        xAxis: 'Incident Angle (°)',
        yAxis: 'Refracted Angle (°)',
        datasets: [
            { key: 'refractedAngle', label: 'θ₂', color: '#ec4899' },
        ],
    },

    _t: 0,
    _params: { n1: 1.0, n2: 1.5, incidentAngle: 30 },
    _plotted: new Set(),

    reset(params) {
        this._t = 0;
        this._params = { ...params };
        this._plotted = new Set();
    },

    update(dt) {
        this._t += dt;
        const { n1, n2, incidentAngle } = this._params;

        // Plot the θ₁ → θ₂ curve point by point
        const step = Math.floor(this._t * 30);
        if (step <= 89 && !this._plotted.has(step)) {
            this._plotted.add(step);
            const theta1 = step;
            const sinTheta2 = (n1 / n2) * Math.sin(degToRad(theta1));
            const refractedAngle = sinTheta2 <= 1 ? radToDeg(Math.asin(sinTheta2)) : 90;
            return { t: theta1, x: theta1, refractedAngle, done: step >= 89 };
        }
        return null;
    },

    draw(ctx, w, h) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, w, h);

        const { n1, n2, incidentAngle } = this._params;
        const theta1Rad = degToRad(incidentAngle);
        const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
        const totalInternalReflection = sinTheta2 > 1;
        const theta2Rad = totalInternalReflection ? Math.PI / 2 : Math.asin(sinTheta2);

        const midX = w / 2;
        const midY = h / 2;
        const rayLen = Math.min(w, h) * 0.38;

        // Interface line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();

        // Media labels
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = hexToRgba('#818cf8', 0.8);
        ctx.fillText(`Medium 1 (n₁ = ${n1.toFixed(2)})`, 12, midY - 16);
        ctx.fillStyle = hexToRgba('#34d399', 0.8);
        ctx.fillText(`Medium 2 (n₂ = ${n2.toFixed(2)})`, 12, midY + 30);

        // Medium fill
        ctx.fillStyle = hexToRgba('#6366f1', 0.04);
        ctx.fillRect(0, 0, w, midY);
        ctx.fillStyle = hexToRgba('#10b981', 0.06);
        ctx.fillRect(0, midY, w, h - midY);

        // Normal (dashed)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, midY - rayLen * 1.2);
        ctx.lineTo(midX, midY + rayLen * 1.2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Normal', midX + 6, midY - rayLen * 1.1);

        // Incident ray (comes from top-left area towards midpoint)
        const incStartX = midX - Math.sin(theta1Rad) * rayLen;
        const incStartY = midY - Math.cos(theta1Rad) * rayLen;
        this._drawRay(ctx, incStartX, incStartY, midX, midY, '#f59e0b', 3);

        // Angle arc for incident
        this._drawArc(ctx, midX, midY, 35, -Math.PI / 2, -Math.PI / 2 + theta1Rad, '#f59e0b');
        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px Inter, sans-serif';
        const arcLabelRadius = 50;
        ctx.fillText(`θ₁=${incidentAngle}°`,
            midX + Math.sin(theta1Rad / 2) * arcLabelRadius - 20,
            midY - Math.cos(theta1Rad / 2) * arcLabelRadius);

        // Reflected ray (mirrors incident angle)
        const refStartX = midX + Math.sin(theta1Rad) * rayLen * 0.7;
        const refStartY = midY - Math.cos(theta1Rad) * rayLen * 0.7;
        this._drawRay(ctx, midX, midY, refStartX, refStartY, '#64748b', 1.5);

        // Refracted ray
        if (!totalInternalReflection) {
            const refractEndX = midX + Math.sin(theta2Rad) * rayLen;
            const refractEndY = midY + Math.cos(theta2Rad) * rayLen;
            this._drawRay(ctx, midX, midY, refractEndX, refractEndY, '#ec4899', 3);

            // Angle arc for refracted
            this._drawArc(ctx, midX, midY, 35, Math.PI / 2 - theta2Rad, Math.PI / 2, '#ec4899');
            const theta2Deg = radToDeg(theta2Rad);
            ctx.fillStyle = '#f472b6';
            ctx.fillText(`θ₂=${theta2Deg.toFixed(1)}°`,
                midX + Math.sin(theta2Rad / 2) * arcLabelRadius - 20,
                midY + Math.cos(theta2Rad / 2) * arcLabelRadius + 12);
        } else {
            // Total internal reflection — brighter reflected ray, no refracted
            const tirRefX = midX + Math.sin(theta1Rad) * rayLen;
            const tirRefY = midY - Math.cos(theta1Rad) * rayLen;
            this._drawRay(ctx, midX, midY, tirRefX, tirRefY, '#ef4444', 3);

            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText('Total Internal Reflection!', midX + 40, midY - 60);
        }

        // Critical angle (bottom-left)
        const critAngle = n1 <= n2 ? 'N/A' : `${radToDeg(Math.asin(n2 / n1)).toFixed(1)}°`;
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Critical Angle: ${critAngle}`, 12, h - 16);

        // ── Snell's law verification box (top-right) ──────────────────────
        {
            const bw = 190, bh = totalInternalReflection ? 70 : 90;
            const bx = w - bw - 10, by = 10;
            ctx.fillStyle = hexToRgba('#0f172a', 0.88);
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.strokeRect(bx, by, bw, bh);

            const theta2Deg = totalInternalReflection ? 90 : radToDeg(theta2Rad);
            const lhs = n1 * Math.sin(theta1Rad);
            const rhs = totalInternalReflection ? n2 : n2 * Math.sin(theta2Rad);

            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Snell\'s Law Verification', bx + 8, by + 16);
            ctx.font = '11px Inter, sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`θ₁ = ${incidentAngle}°`, bx + 8, by + 32);
            if (!totalInternalReflection) {
                ctx.fillStyle = '#f472b6';
                ctx.fillText(`θ₂ = ${theta2Deg.toFixed(2)}°`, bx + 8, by + 48);
            }
            ctx.fillStyle = '#818cf8';
            ctx.fillText(`n₁·sin(θ₁) = ${lhs.toFixed(4)}`, bx + 8, by + (totalInternalReflection ? 48 : 64));
            ctx.fillStyle = '#34d399';
            ctx.fillText(`n₂·sin(θ₂) = ${rhs.toFixed(4)}`, bx + 8, by + (totalInternalReflection ? 64 : 80));
        }
    },

    _drawRay(ctx, x1, y1, x2, y2, color, width) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - 0.3), y2 - headLen * Math.sin(angle - 0.3));
        ctx.lineTo(x2 - headLen * Math.cos(angle + 0.3), y2 - headLen * Math.sin(angle + 0.3));
        ctx.closePath();
        ctx.fill();
    },

    _drawArc(ctx, cx, cy, radius, startAngle, endAngle, color) {
        ctx.strokeStyle = hexToRgba(color, 0.5);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.stroke();
    },
};

export default sim;
