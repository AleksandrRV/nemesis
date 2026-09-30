import React from 'react';
import { MAGNITUDE_BAR, seriesFill, seriesStroke, seriesSwatch } from './chartPalette';

export const StatTile: React.FC<{ label: string; value: string; hint?: string; accent?: boolean }> = ({
  label,
  value,
  hint,
  accent = false,
}) => (
  <div
    className={`rounded-xl border p-3 ${accent ? 'border-cyan-700/70 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/70'}`}
  >
    <div className="text-[11px] text-slate-400">{label}</div>
    <div className={`mt-0.5 font-heading text-2xl tracking-wide ${accent ? 'text-cyan-100' : 'text-white'}`}>
      {value}
    </div>
    {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
  </div>
);

export interface LegendItem {
  key: string;
  label: string;
  swatch: string;
  icon?: React.ReactNode;
}

export const Legend: React.FC<{ items: readonly LegendItem[] }> = ({ items }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
    {items.map((item) => (
      <li key={item.key} className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-sm ${item.swatch}`} />
        {item.icon}
        {item.label}
      </li>
    ))}
  </ul>
);

export const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
    <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
    {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Текст у конца полосы: по умолчанию — само значение. */
  display?: string;
  /** Подсказка при наведении. */
  hint?: string;
}

/** Горизонтальные полосы одной серии: длина — величина, значение — у конца полосы. */
export const BarList: React.FC<{ rows: readonly BarRow[]; max?: number; empty?: string }> = ({
  rows,
  max,
  empty = 'Нет данных',
}) => {
  if (rows.length === 0) return <p className="text-xs text-slate-500">{empty}</p>;
  const peak = Math.max(...rows.map((row) => row.value));
  const scale = max ?? (peak > 0 ? peak : 1);
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li
          key={row.key}
          title={row.hint ?? `${row.label}: ${row.display ?? row.value}`}
          className="grid grid-cols-[minmax(6rem,14rem)_1fr] items-center gap-2 text-xs"
        >
          <span className="truncate text-slate-300">{row.label}</span>
          <span className="flex items-center gap-2">
            <span
              className={`h-2.5 rounded-r-[4px] ${MAGNITUDE_BAR} motion-safe:transition-[width] motion-safe:duration-700`}
              style={{ width: `${Math.max(1, (row.value / scale) * 85)}%` }}
            />
            <span className="shrink-0 tabular-nums text-slate-200">{row.display ?? row.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

export interface Column {
  key: string;
  label: string;
  value: number;
}

/** Колонки одной серии (гистограмма): высота — величина; значения — в подсказке и по оси. */
export const ColumnChart: React.FC<{ columns: readonly Column[]; unit: string }> = ({ columns, unit }) => {
  if (columns.length === 0) return <p className="text-xs text-slate-500">Нет данных</p>;
  const max = Math.max(...columns.map((column) => column.value), 1);
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex w-6 flex-col justify-between text-right text-[10px] tabular-nums text-slate-500">
        <span>{max}</span>
        <span>0</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-32 items-end gap-[2px] border-b border-slate-700">
          {columns.map((column) => (
            <div
              key={column.key}
              title={`${column.label}: ${column.value} ${unit}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center"
            >
              <div
                className={`w-full max-w-6 rounded-t-[4px] ${MAGNITUDE_BAR} motion-safe:transition-[height] motion-safe:duration-700`}
                style={{ height: `${(column.value / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[10px] text-slate-500">
          {columns.map((column) => (
            <span key={column.key} className="min-w-0 flex-1 truncate text-center">
              {column.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  swatch: string;
  icon: React.ReactNode;
}

/** Доли целого одной полосой: сегменты разделены зазором, подпись и значок — в легенде. */
export const StackedBar: React.FC<{ segments: readonly StackSegment[] }> = ({ segments }) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-[4px] bg-slate-800">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              key={segment.key}
              title={`${segment.label}: ${segment.value}`}
              className={`${segment.swatch} motion-safe:transition-[width] motion-safe:duration-700`}
              style={{ width: `${(segment.value / Math.max(total, 1)) * 100}%` }}
            />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-sm ${segment.swatch}`} />
            {segment.icon}
            {segment.label}
            <b className="tabular-nums text-white">{segment.value}</b>
            <span className="text-slate-500">({total === 0 ? 0 : Math.round((segment.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineSeries {
  key: string;
  label: string;
  points: readonly LinePoint[];
  /** Индекс категориального слота: цвет закреплён за участником, а не за порядком на графике. */
  slot: number;
}

const PLOT = { height: 200, left: 34, right: 12, top: 10, bottom: 24 } as const;
const MIN_PLOT_WIDTH = 240;

/** Ширина контейнера в пикселях: график рисуется 1:1, подписи не раздуваются вместе с SVG. */
function useElementWidth(fallback: number): [React.RefObject<HTMLDivElement>, number] {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(MIN_PLOT_WIDTH, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Линии по раундам на одной оси: 2px, точки с кольцом цвета поверхности, подсказка у каждой точки. */
export const LineChart: React.FC<{
  series: readonly LineSeries[];
  yMin: number;
  yMax: number;
  yTicks: readonly number[];
  xLabel: string;
}> = ({ series, yMin, yMax, yTicks, xLabel }) => {
  const [container, plotWidth] = useElementWidth(560);
  const xs = series.flatMap((line) => line.points.map((point) => point.x));
  const xMin = Math.min(...xs, 1);
  const xMax = Math.max(...xs, xMin + 1);
  const innerWidth = plotWidth - PLOT.left - PLOT.right;
  const innerHeight = PLOT.height - PLOT.top - PLOT.bottom;
  const px = (x: number) => PLOT.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
  const py = (y: number) => PLOT.top + (1 - (y - yMin) / (yMax - yMin)) * innerHeight;
  const xTicks = Array.from({ length: xMax - xMin + 1 }, (_, index) => xMin + index);
  return (
    <div ref={container}>
      <svg viewBox={`0 0 ${plotWidth} ${PLOT.height}`} className="h-auto w-full" role="img" aria-label={xLabel}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PLOT.left}
              x2={plotWidth - PLOT.right}
              y1={py(tick)}
              y2={py(tick)}
              className={tick === 0 ? 'stroke-slate-600' : 'stroke-slate-800'}
              strokeWidth={1}
            />
            <text x={PLOT.left - 6} y={py(tick) + 3} textAnchor="end" className="fill-slate-500 text-[10px]">
              {tick}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={tick} x={px(tick)} y={PLOT.height - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {tick}
          </text>
        ))}
        {series.map((line) => (
          <g key={line.key}>
            <polyline
              points={line.points.map((point) => `${px(point.x)},${py(point.y)}`).join(' ')}
              className={`fill-none ${seriesStroke(line.slot)}`}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {line.points.map((point) => (
              <g key={point.x}>
                <circle
                  cx={px(point.x)}
                  cy={py(point.y)}
                  r={4}
                  className={`stroke-slate-950 ${seriesFill(line.slot)}`}
                  strokeWidth={2}
                />
                <circle cx={px(point.x)} cy={py(point.y)} r={10} className="fill-transparent">
                  <title>{`${line.label} · ${xLabel} ${point.x}: ${point.y}`}</title>
                </circle>
              </g>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <Legend
          items={series.map((line) => ({
            key: line.key,
            label: line.label,
            swatch: seriesSwatch(line.slot),
          }))}
        />
      )}
    </div>
  );
};
