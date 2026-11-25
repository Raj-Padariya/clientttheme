'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
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
  const aboveClipId = `${id}-above`;
  const belowClipId = `${id}-below`;
  const gainFillId = `${id}-gain`;
  const lossFillId = `${id}-loss`;
  const [active, setActive] = useState<ActivePoint | null>(null);

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const lastIndex = series.length - 1;
  const start = series[0];
  const plotWidth = CHART_WIDTH - CHART_PAD_X * 2;
  const plotHeight = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const step = plotWidth / Math.max(lastIndex, 1);
  const pillarWidth = Math.max(step * PILLAR_WIDTH_RATIO, PILLAR_MIN_WIDTH);
  const xFor = (index: number) => (lastIndex === 0 ? CHART_WIDTH / 2 : CHART_PAD_X + index * step);
  const yFor = (value: number) => CHART_PAD_TOP + plotHeight - ((value - min) / range) * plotHeight;
  const startY = yFor(start);
  const line = smoothPath(series.map((value, index) => ({ x: xFor(index), y: yFor(value) })));
  const area = `${line} L${xFor(lastIndex).toFixed(1)} ${startY.toFixed(1)} L${xFor(0).toFixed(1)} ${startY.toFixed(1)} Z`;
  const leftPercent = (index: number) => (xFor(index) / CHART_WIDTH) * 100;
  const topPercent = (index: number) => (yFor(series[index] ?? min) / CHART_HEIGHT) * 100;
  const daysAgo = (index: number) => endDaysAgo + (lastIndex - index);
  const axisMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
  const dayIndexes = [...new Set(Array.from({ length: AXIS_DAY_LABELS }, (_, tick) => Math.round((tick / (AXIS_DAY_LABELS - 1)) * lastIndex)))];
  const highIndex = series.indexOf(max);
  const lowIndex = series.indexOf(min);
  const hasExtremes = max !== min;

  // The date is resolved in event handlers only, so the prerendered markup never depends on the clock.
  const pointFor = (index: number): ActivePoint => ({ index, date: dayFormat.format(new Date(Date.now() - daysAgo(index) * DAY_MS)) });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
    const index = Math.round(((ratio * CHART_WIDTH - CHART_PAD_X) / plotWidth) * lastIndex);
    const clamped = Math.min(Math.max(index, 0), lastIndex);
    if (active?.index !== clamped) setActive(pointFor(clamped));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -1 : 1;
    const index = Math.min(Math.max((active?.index ?? lastIndex + 1) + delta, 0), lastIndex);
    setActive(pointFor(index));
  };

  const dayLabel = (index: number) => {
    const ago = daysAgo(index);
    return ago === 0 ? translate('home.chartToday') : translate('home.chartDaysAgo', { days: ago });
  };

  const activeValue = active ? series[active.index] : 0;
  const activeDelta = active ? activeValue - (series[active.index - 1] ?? activeValue) : 0;
  const activeFromStart = start === 0 ? 0 : ((activeValue - start) / start) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
        <div
          role="group"
          tabIndex={0}
          aria-label={translate('home.balanceActivity')}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={handleKeyDown}
          className="relative cursor-crosshair touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="animate-reveal motion-reduce:animate-none">
            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="h-56 w-full sm:h-64">
              <defs>
                <clipPath id={aboveClipId}>
                  <rect x="0" y="0" width={CHART_WIDTH} height={startY} />
                </clipPath>
                <clipPath id={belowClipId}>
                  <rect x="0" y={startY} width={CHART_WIDTH} height={CHART_HEIGHT - startY} />
                </clipPath>
                <linearGradient id={gainFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id={lossFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {AXIS_TICKS.map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  x2={CHART_WIDTH}
                  y1={CHART_PAD_TOP + plotHeight * (1 - ratio)}
                  y2={CHART_PAD_TOP + plotHeight * (1 - ratio)}
                  stroke="var(--border)"
                  strokeDasharray="2 8"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {series.map((value, index) => {
                const isUp = value >= (series[index - 1] ?? value);
                const isActive = active?.index === index;
                const top = yFor(value);
                return (
                  <rect
                    key={index}
                    x={xFor(index) - pillarWidth / 2}
                    y={top}
                    width={pillarWidth}
                    height={CHART_HEIGHT - top}
                    fill={isUp ? 'var(--brand-primary)' : 'var(--danger)'}
                    fillOpacity={isActive ? 0.85 : isUp ? 0.14 : 0.24}
                    className="origin-bottom animate-bar-rise transition-[fill-opacity] duration-200 [transform-box:fill-box] motion-reduce:animate-none"
                    style={{ animationDelay: `${index * PILLAR_STAGGER_MS}ms` }}
                  />
                );
              })}

              <path d={area} fill={`url(#${gainFillId})`} clipPath={`url(#${aboveClipId})`} />
              <path d={area} fill={`url(#${lossFillId})`} clipPath={`url(#${belowClipId})`} />

              <line x1="0" x2={CHART_WIDTH} y1={startY} y2={startY} stroke="var(--brand-primary)" strokeOpacity="0.55" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />

              <path
                d={line}
                fill="none"
                stroke="var(--brand-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--brand-primary) 70%, transparent))' }}
              />
            </svg>
          </div>

          <span
            aria-hidden="true"
            className="absolute left-0 -translate-y-1/2 rounded-full border border-primary/40 bg-surface/90 px-1.5 py-px text-[9px] font-semibold tracking-[0.14em] text-primary uppercase"
            style={{ top: `${(startY / CHART_HEIGHT) * 100}%` }}
          >
            {translate('home.chartStart')}
          </span>

          {hasExtremes &&
            [
              { index: highIndex, label: translate('home.chartHigh'), icon: 'trendUp' as const, tone: 'text-primary ring-primary/40' },
              { index: lowIndex, label: translate('home.chartLow'), icon: 'trendDown' as const, tone: 'text-danger ring-danger/40' },
            ].map((tag, tagIndex) => (
              <span
                key={tag.label}
                aria-hidden="true"
                className={cx(
                  'pointer-events-none absolute flex -translate-y-[calc(100%+10px)] animate-pop-in items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-pop ring-1 motion-reduce:animate-none',
                  edgeAlign(leftPercent(tag.index)),
                  tag.tone,
                )}
                style={{ left: `${leftPercent(tag.index)}%`, top: `${topPercent(tag.index)}%`, animationDelay: `${600 + tagIndex * 120}ms` }}
              >
                <Icon name={tag.icon} size={11} />
                {tag.label}
                <span className="font-mono text-fg tabular-nums">{formatMoney(series[tag.index], currency)}</span>
              </span>
            ))}

          <span
            aria-hidden="true"
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${leftPercent(lastIndex)}%`, top: `${topPercent(lastIndex)}%` }}
          >
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/50 motion-reduce:hidden" />
            <span className="absolute inset-0 rounded-full bg-primary ring-4 ring-primary-soft" />
          </span>

          {active && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-linear-to-b from-transparent via-primary to-transparent"
                style={{ left: `${leftPercent(active.index)}%` }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-primary shadow-[0_0_12px_var(--brand-primary)]"
                style={{ left: `${leftPercent(active.index)}%`, top: `${topPercent(active.index)}%` }}
              />
              <div
                role="status"
                className={cx(
                  'pointer-events-none absolute bottom-2 z-10 min-w-[150px] rounded-xl border border-line bg-elevated/95 px-3 py-2.5 whitespace-nowrap shadow-pop backdrop-blur',
                  leftPercent(active.index) > 60 ? '-ml-3 -translate-x-full' : 'ml-3',
                )}
                style={{ left: `${leftPercent(active.index)}%` }}
              >
                <p className="text-[11px] text-fg-muted">{active.date}</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-fg tabular-nums">{formatMoney(activeValue, currency)}</p>
                <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[11px]">
                  <dt className="text-fg-subtle">{translate('home.chartDayChange')}</dt>
                  <dd className={cx('text-right font-semibold tabular-nums', activeDelta >= 0 ? 'text-success' : 'text-danger')}>
                    {activeDelta >= 0 ? '+' : '−'}
                    {formatMoney(Math.abs(activeDelta), currency)}
                  </dd>
                  <dt className="text-fg-subtle">{translate('home.chartFromStart')}</dt>
                  <dd className={cx('text-right font-semibold tabular-nums', activeFromStart >= 0 ? 'text-primary' : 'text-danger')}>{formatPercent(activeFromStart)}</dd>
                </dl>
              </div>
            </>
          )}
        </div>

        <div aria-hidden="true" className="relative w-12 text-right text-[11px] text-fg-subtle tabular-nums">
          {AXIS_TICKS.map((ratio) => (
            <span key={ratio} className="absolute right-0 -translate-y-1/2" style={{ top: `${((CHART_PAD_TOP + plotHeight * (1 - ratio)) / CHART_HEIGHT) * 100}%` }}>
              {axisMoney.format(min + range * ratio)}
            </span>
          ))}
        </div>

        <div aria-hidden="true" className="relative mt-2 h-4 text-[11px] text-fg-subtle">
          {dayIndexes.map((index) => (
            <span
              key={index}
              className={cx('absolute top-0 whitespace-nowrap', index === 0 ? 'left-0' : index === lastIndex ? 'right-0' : '-translate-x-1/2')}
              style={index === 0 || index === lastIndex ? undefined : { left: `${leftPercent(index)}%` }}
            >
              {dayLabel(index)}
            </span>
          ))}
        </div>
      </div>

      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-primary/70" />
          {translate('home.chartUpDay')}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-danger/70" />
          {translate('home.chartDownDay')}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-primary" />
          {translate('home.chartStart')}
        </li>
      </ul>
    </div>
  );
}

interface PortfolioPanelProps {
  series?: number[];
  /** Days between the last point of `series` and today; 0 when the series ends today. */
  endDaysAgo?: number;
  balance?: number;
  equity?: number;
  currency: string;
  /** Replaces the default "last 30 days" caption, e.g. with the active date filter. */
  periodLabel?: string;
  /** Rendered inside another card (the dashboard's performance stage): no own glass chrome, visually hidden title. */
  bare?: boolean;
  className?: string;
}

export function PortfolioPanel({ series, endDaysAgo = 0, balance, equity, currency, periodLabel, bare = false, className }: PortfolioPanelProps) {
  const isReady = series !== undefined && balance !== undefined && equity !== undefined;
  const hasPoints = isReady && series.length > 0;
  const change = hasPoints ? trendChange(series) : 0;
  const isUp = change >= 0;

  let chart;
  if (!isReady) chart = <Skeleton className="h-56 w-full sm:h-64" />;
  else if (!hasPoints) chart = <EmptyState icon="inbox" title={translate('home.noDataInRange')} />;
  else chart = <PulseChart key={`${series.length}-${endDaysAgo}`} series={series} endDaysAgo={endDaysAgo} currency={currency} />;

  return (
    <section
      aria-labelledby="portfolio-title"
      className={cx(
        'flex min-w-0 flex-col gap-5',
        !bare && 'glass glass-strong animate-rise overflow-hidden rounded-[28px] p-5 motion-reduce:animate-none sm:p-6',
        className,
      )}
    >
      <div className={cx('flex flex-wrap items-center justify-between gap-3', bare && 'justify-end')}>
        <h2 id="portfolio-title" className={cx('text-xl font-medium tracking-tight text-fg sm:text-2xl', bare && 'sr-only')}>
          {translate('home.balanceActivity')}
        </h2>
        {!bare && <span className="text-xs text-fg-muted">{periodLabel ?? translate('home.trendLabel')}</span>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">{translate('home.totalBalance')}</p>
          {isReady ? (
            <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums sm:text-4xl">
              {formatMoney(balance, currency)}
              <span className="ml-1.5 text-sm font-normal tracking-normal text-fg-subtle">{currency}</span>
            </p>
          ) : (
            <Skeleton className="mt-2 h-10 w-56" />
          )}
        </div>

        {isReady && (
          <dl className="flex flex-col items-end gap-1.5 text-right">
            {hasPoints && (
              <div>
                <dt className="sr-only">{periodLabel ?? translate('home.trendLabel')}</dt>
                <dd
                  className={cx(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                    isUp ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
                  )}
                >
                  <Icon name={isUp ? 'trendUp' : 'trendDown'} size={14} />
                  {formatPercent(change)}
                </dd>
              </div>
            )}
            <div className="text-xs text-fg-muted">
              <dt className="inline">{translate('home.equity')} </dt>
              <dd className="inline font-mono font-semibold text-fg tabular-nums">{formatMoney(equity, currency)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-auto">{chart}</div>
    </section>
  );
}
