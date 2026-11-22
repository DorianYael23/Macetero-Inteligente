import { useMemo } from 'react';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { Line } from 'react-chartjs-2';
import '../../lib/chartSetup';
import type { HistoryPoint } from '../../types/telemetry';
import { hexToRgba } from '../../utils/color';
import styles from './HistoryChart.module.css';

interface HistoryChartProps {
  title: string;
  unit: string;
  /** Color en formato #rrggbb */
  color: string;
  points: HistoryPoint[];
  field: 'temperatura' | 'humedadSuelo' | 'humedadAire';
  /** Límites fijos del eje Y (opcional) */
  min?: number;
  max?: number;
  /** Nivel horizontal punteado de referencia (ej. umbral de IA) */
  threshold?: number | null;
  thresholdLabel?: string;
}

const MUTED = '#8a9bb4';
const THRESHOLD_COLOR = '#34d399';

export function HistoryChart({
  title,
  unit,
  color,
  points,
  field,
  min,
  max,
  threshold = null,
  thresholdLabel = 'Umbral IA',
}: HistoryChartProps) {
  const hasThreshold = threshold !== null && Number.isFinite(threshold);

  const data = useMemo<ChartData<'line'>>(() => {
    const datasets: ChartData<'line'>['datasets'] = [
      {
        label: title,
        data: points.map((p) => p[field]),
        borderColor: color,
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        // Degradado que se desvanece hacia abajo
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const { chart } = ctx;
          const area = chart.chartArea;
          if (!area) return hexToRgba(color, 0.15);
          const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          gradient.addColorStop(0, hexToRgba(color, 0.35));
          gradient.addColorStop(1, hexToRgba(color, 0));
          return gradient;
        },
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#0b1120',
        pointHoverBorderWidth: 2,
      },
    ];

    if (hasThreshold) {
      datasets.push({
        label: thresholdLabel,
        data: points.map(() => threshold),
        borderColor: THRESHOLD_COLOR,
        borderWidth: 1.8,
        borderDash: [6, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
      });
    }

    return {
      labels: points.map((p) => p.time),
      datasets,
    };
  }, [points, field, title, color, hasThreshold, threshold, thresholdLabel]);

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b1120',
          borderColor: '#233047',
          borderWidth: 1,
          titleColor: '#e6edf7',
          bodyColor: '#e6edf7',
          padding: 10,
          displayColors: hasThreshold,
          callbacks: {
            label: (ctx) =>
              hasThreshold
                ? `${ctx.dataset.label}: ${ctx.formattedValue} ${unit}`
                : `${ctx.formattedValue} ${unit}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: MUTED, maxTicksLimit: 5, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          min,
          max,
          grace: '8%',
          ticks: { color: MUTED, maxTicksLimit: 5 },
          grid: { color: 'rgba(148, 163, 184, 0.12)' },
          border: { display: false },
        },
      },
    }),
    [unit, min, max, hasThreshold],
  );

  return (
    <article className={styles.card} data-reveal>
      <header className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.swatch} style={{ background: color }} />
          {title}
        </h3>
        {hasThreshold && (
          <span className={styles.thresholdBadge}>
            <span className={styles.thresholdLine} />
            {thresholdLabel}: {threshold}
            {unit}
          </span>
        )}
      </header>
      <div className={styles.canvas}>
        <Line data={data} options={options} />
      </div>
    </article>
  );
}
