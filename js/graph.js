/* ============================================================
   graph.js — Chart.js Wrapper (create / update / reset / export)
   ============================================================
   CHANGELOG:
     v1.1 — 2026-03-06
       - Added downloadCSV(filename) method: serialises all recorded
         dataset data to a CSV file and triggers a browser download.
         Header row = "time,<dataset1_label>,<dataset2_label>,...".
         Each row = time value + one column per dataset ('' if no
         point recorded at that time step).
   ============================================================ */

export class GraphController {
    /**
     * @param {string} canvasId — ID of the <canvas> element for the chart
     * @param {object} config   — { xAxis, yAxis, datasets: [{ key, label, color }] }
     * @param {number} [maxPoints=500]
     */
    constructor(canvasId, config, maxPoints = 500) {
        this.canvasEl = document.getElementById(canvasId);
        this.config = config;
        this.maxPoints = maxPoints;
        this._chart = null;
        this._init();
    }

    _init() {
        const datasets = this.config.datasets.map(ds => ({
            label: ds.label,
            data: [],
            borderColor: ds.color,
            backgroundColor: ds.color + '20',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: ds.fill || false,
        }));

        this._chart = new Chart(this.canvasEl, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,          // disable for realtime performance
                parsing: false,            // data is pre-formatted { x, y }
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: this.config.xAxis,
                            color: '#94a3b8',
                            font: { family: "'Inter', sans-serif", size: 12 },
                        },
                        ticks: { color: '#64748b', font: { size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                    },
                    y: {
                        title: {
                            display: true,
                            text: this.config.yAxis,
                            color: '#94a3b8',
                            font: { family: "'Inter', sans-serif", size: 12 },
                        },
                        ticks: { color: '#64748b', font: { size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                    },
                },
                plugins: {
                    legend: {
                        display: this.config.datasets.length > 1,
                        labels: {
                            color: '#94a3b8',
                            font: { family: "'Inter', sans-serif", size: 12 },
                            usePointStyle: true,
                            pointStyle: 'circle',
                        },
                    },
                    decimation: {
                        enabled: true,
                        algorithm: 'lttb',
                        samples: this.maxPoints,
                    },
                },
            },
        });
    }

    /**
     * Add a data point from the experiment result.
     * @param {object} result — must contain a 't' key for x-axis
     *                          plus keys matching each dataset's `key`
     */
    addPoint(result) {
        if (!this._chart || result.done) return;

        const t = result.t ?? result.x ?? 0;

        this.config.datasets.forEach((ds, i) => {
            const value = result[ds.key];
            if (value !== undefined) {
                const data = this._chart.data.datasets[i].data;
                data.push({ x: t, y: value });

                // Enforce max points for memory safety
                if (data.length > this.maxPoints) {
                    data.splice(0, data.length - this.maxPoints);
                }
            }
        });

        this._chart.update('none');   // skip animation for speed
    }

    reset() {
        if (!this._chart) return;
        this._chart.data.datasets.forEach(ds => { ds.data = []; });
        this._chart.update();
    }

    /**
     * Download all recorded data as a CSV file.
     * @param {string} [filename='data.csv']
     */
    downloadCSV(filename = 'data.csv') {
        if (!this._chart) return;

        const datasets = this._chart.data.datasets;
        const labels = this.config.datasets.map(ds => ds.label);

        // Collect all unique x (time) values across all datasets
        const xSet = new Set();
        datasets.forEach(ds => ds.data.forEach(pt => xSet.add(pt.x)));
        const xValues = Array.from(xSet).sort((a, b) => a - b);

        if (xValues.length === 0) {
            console.warn('[graph] No data to export.');
            return;
        }

        // Build lookup maps: dataset index → Map<x, y>
        const maps = datasets.map(ds => {
            const m = new Map();
            ds.data.forEach(pt => m.set(pt.x, pt.y));
            return m;
        });

        // Header row
        const header = [this.config.xAxis, ...labels].join(',');

        // Data rows
        const rows = xValues.map(x => {
            const cols = maps.map(m => {
                const v = m.get(x);
                return v !== undefined ? v.toFixed(6) : '';
            });
            return [x.toFixed(6), ...cols].join(',');
        });

        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    destroy() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    }
}
