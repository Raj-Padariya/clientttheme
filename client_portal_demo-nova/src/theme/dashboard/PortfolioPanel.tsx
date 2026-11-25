'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
import type { FundsFlowPeriod } from '@/core/types';
import { cx } from '../lib/cx';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

export function trendChange(series: number[]): number {
  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? 0;
  return first === 0 ? 0 : ((last - first) / first) * 100;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const CHART_PAD_X = 8;
const CHART_PAD_TOP = 26;
const CHART_PAD_BOTTOM = 4;
const DAY_MS = 86_400_000;
const AXIS_TICKS = [1, 2 / 3, 1 / 3, 0];
const AXIS_DAY_LABELS = 5;
const PILLAR_WIDTH_RATIO = 0.42;
const PILLAR_MIN_WIDTH = 2;
const PILLAR_STAGGER_MS = 18;
// Tags closer than this to a chart edge are aligned to that edge so they never spill out.
const EDGE_PERCENT = 12;

const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

interface Point {
  x: number;
  y: number;
}

interface ActivePoint {
  index: number;
  date: string;
}

// Catmull-Rom spline through every point, written as cubic Béziers, so the curve passes through the real values.
function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  const segments = points.slice(0, -1).map((current, index) => {
    const previous = points[index - 1] ?? current;
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const control1 = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 };
    const control2 = { x: next.x - (afterNext.x - current.x) / 6, y: next.y - (afterNext.y - current.y) / 6 };
    return `C${control1.x.toFixed(1)} ${control1.y.toFixed(1)} ${control2.x.toFixed(1)} ${control2.y.toFixed(1)} ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  });
  return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ${segments.join(' ')}`;
}

function edgeAlign(percent: number): string {
  if (percent < EDGE_PERCENT) return 'translate-x-0';
  if (percent > 100 - EDGE_PERCENT) return '-translate-x-full';
  return '-translate-x-1/2';
}

interface PulseChartProps {
  series: number[];
  /** Days between the last point and today (0 when the range ends today). */
  endDaysAgo: number;
  currency: string;
}

/**
 * "Pulse" chart: a pillar per day (gold on up days, red on down days), the balance ribbon over them,
 * the area above the starting level tinted gold and below it red, plus High / Low tags and a day-by-day scrubber.
 */
  function PulseChart({ series, endDaysAgo, currency }: PulseChartProps) {
  const id = useId();
  const [active, setActive] = useState<ActivePoint | null>(null);

  if (series.length === 0) {
    return <EmptyState icon="inbox" title={translate('home.noDataInRange')} />;
  }

  const yMin = Math.min(...series);
  const yMax = Math.max(...series);
  const yRange = yMax - yMin || 1;

  // Chart dimensions
  const chartWidth = 640;
  const chartHeight = 280;
  const leftPad = 60;
  const rightPad = 20;
  const topPad = 30;
  const bottomPad = 40;

  const plotWidth = chartWidth - leftPad - rightPad;
  const plotHeight = chartHeight - topPad - bottomPad;

  // Calculate point positions
  const points = series.map((value, index) => {
    const x = leftPad + (index / (series.length - 1 || 1)) * plotWidth;
    const y = topPad + plotHeight - ((value - yMin) / yRange) * plotHeight;
    const intensity = (value - yMin) / yRange; // 0 to 1
    return { x, y, value, intensity };
  });

  // Generate date labels
  const now = new Date();
  const startDate = new Date(now.getTime() - (series.length - 1 + endDaysAgo) * DAY_MS);

  // Y-axis labels
  const yLabels = [yMin, yMin + yRange * 0.5, yMax];

  // X-axis labels (first, middle, last)
  const xLabelIndices = [0, Math.floor(series.length / 2), series.length - 1];
  const xLabels = xLabelIndices.map((idx) => {
    const date = new Date(startDate.getTime() + idx * DAY_MS);
    return { idx, label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` };
  });

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" role="img" aria-label={translate('home.balanceActivity')}>
        <defs>
          <radialGradient id={`${id}-dot-gradient`} cx="30%" cy="30%">
            <stop offset="0%" stopColor="var(--orbit-gleam)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--orbit-violet)" stopOpacity="0.95" />
          </radialGradient>
        </defs>

        {/* Y-axis gridlines and labels */}
        {yLabels.map((label, i) => {
          const y = topPad + plotHeight - ((label - yMin) / yRange) * plotHeight;
          return (
            <g key={`y-${i}`}>
              <line x1={leftPad} y1={y} x2={chartWidth - rightPad} y2={y} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" vectorEffect="non-scaling-stroke" />
              <text x={leftPad - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--fg-muted)" fontFamily="inherit">
                {formatMoney(label, currency)}
              </text>
            </g>
          );
        })}

        {/* X-axis line */}
        <line x1={leftPad} y1={chartHeight - bottomPad} x2={chartWidth - rightPad} y2={chartHeight - bottomPad} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

        {/* X-axis labels */}
        {xLabels.map(({ idx, label }) => {
          const x = leftPad + (idx / (series.length - 1 || 1)) * plotWidth;
          return (
            <text key={`x-${idx}`} x={x} y={chartHeight - 12} textAnchor="middle" fontSize="11" fill="var(--fg-muted)" fontFamily="inherit">
              {label}
            </text>
          );
        })}

        {/* Bubble dots for each day */}
        {points.map((point, i) => {
          // Size based on intensity: 5-10px radius
          const radius = 4 + point.intensity * 5;
          const opacity = 0.4 + point.intensity * 0.6; // 0.4 to 1.0

          return (
            <g key={`bubble-${i}`}>
              {/* Background glow */}
              <circle cx={point.x} cy={point.y} r={radius + 1} fill={`rgba(139, 92, 246, ${opacity * 0.3})`} />
              {/* Main bubble */}
              <circle
                cx={point.x}
                cy={point.y}
                r={radius}
                fill={`url(#${id}-dot-gradient)`}
                opacity={opacity}
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => {
                  const date = new Date(startDate.getTime() + i * DAY_MS);
                  setActive({ index: i, date: `${dayFormat.format(date).split(',')[0]} · ${formatMoney(point.value, currency)}` });
                }}
                onPointerLeave={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {active && (
        <div className="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 pb-2">
          <div className="whitespace-nowrap rounded-lg border border-line bg-bg-secondary px-3 py-2 text-sm font-medium text-fg shadow-lg backdrop-blur">
            {active.date}
          </div>
        </div>
      )}
    </div>
  );
}


function EquityOrbit({ ratio, children }: { ratio: number; children: ReactNode }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 140 140" className="size-28">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--orbit-violet)" />
          <stop offset="100%" stopColor="var(--orbit-violet-dark)" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="70" r="65" fill="var(--bg-secondary)" stroke="var(--line)" strokeWidth="0.5" />
      <circle
        cx="70"
        cy="70"
        r="65"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeDasharray={`${ratio * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dasharray 0.3s ease' }}
      />
      <g textAnchor="middle" dominantBaseline="central">
        {children}
      </g>
    </svg>
  );
}

interface PortfolioPanelProps {
  series?: number[];
  endDaysAgo?: number;
  balance?: number;
  equity?: number;
  currency: string;
  monthly?: FundsFlowPeriod[];
  yearly?: FundsFlowPeriod[];
  periodLabel?: string;
  bare?: boolean;
  className?: string;
}

export function PortfolioPanel({ series, endDaysAgo = 0, balance, equity, currency, bare = false, className }: PortfolioPanelProps) {
  const isReady = series !== undefined && balance !== undefined && equity !== undefined;
  const hasPoints = isReady && series.length > 0;
  const change = hasPoints ? trendChange(series) : 0;
  const isUp = change >= 0;

  let chart;
  if (!isReady) {
    chart = <Skeleton className="h-64 w-full sm:h-80" />;
  } else if (!hasPoints) {
    chart = <EmptyState icon="inbox" title={translate('home.noDataInRange')} />;
  } else {
    chart = <PulseChart key={`${series.length}-${endDaysAgo}`} series={series} endDaysAgo={endDaysAgo} currency={currency} />;
  }

  return (
    <section
      aria-labelledby="portfolio-title"
      className={cx(
        'flex min-w-0 flex-col gap-5',
        !bare && 'orbit-card animate-rise overflow-hidden p-5 motion-reduce:animate-none sm:p-6',
        className,
      )}
    >
      {/* Header */}
      {isReady && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-fg-muted">{translate('home.totalBalance')}</p>
            <p className="orbit-text mt-1 truncate text-3xl font-light tracking-[-0.02em] tabular-nums sm:text-4xl">
              {formatMoney(balance, currency)}
              <span className="ml-1.5 text-sm font-normal tracking-normal text-fg-subtle">{currency}</span>
            </p>
          </div>

          <EquityOrbit ratio={balance > 0 ? Math.min(Math.max(equity / balance, 0), 1) : 0}>
            {hasPoints ? (
              <tspan className={cx('text-base font-semibold tabular-nums', isUp ? 'fill-success' : 'fill-danger')}>
                {formatPercent(change)}
              </tspan>
            ) : (
              <circle cx="0" cy="0" r="8" fill="var(--fg-subtle)" />
            )}
          </EquityOrbit>
        </div>
      )}

      {/* Chart */}
      <div className="mt-auto">{chart}</div>
    </section>
  );
}
