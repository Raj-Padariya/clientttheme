'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { masterSeriesAt, type MasterDashboard, type MasterPeriod, type MasterSeriesKey } from '@/core/mock/masterDashboard';
import { useMasterDashboard } from '@/core/pages/useMasterDashboard';
import { cx } from '../lib/cx';
import { axisMoney, axisStamp, buildPeriodWindow, niceStep, parseLocal, signedPercent, type PeriodWindow } from '../lib/timeWindow';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const COLUMN_COUNT = 48;
const ROI_RANGE = 20;
const ROI_MARKS = [-20, -10, 0, 10, 20];
const COPIER_BEADS = 50;
const COPIER_PIXELS = 24;
const PIXEL_ROWS = 6;
const rangeFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const RED = 'var(--zenith-red)';
const panelClass = 'orbit-card relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
// Floating readouts over the chart: a dark chip that reads on both themes.
const tipClass = 'bg-app/95 text-fg ring-1 ring-line-strong shadow-[0_14px_30px_-16px_rgb(0_0_0/0.9)] backdrop-blur-md';

const periods: { id: MasterPeriod; label: string }[] = [
  { id: 'today', label: translate('masterDash.today') },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

// Lines share the main plot; Net P&L gets its own pixel strip under it.
const seriesConfig: { key: MasterSeriesKey; labelKey: MessageKey; color: string; kind: 'line' | 'pixels'; dashed?: boolean; area?: boolean }[] = [
  { key: 'equity', labelKey: 'masterDash.equity', color: 'var(--color-fg)', kind: 'line', area: true },
  { key: 'aum', labelKey: 'masterDash.aum', color: RED, kind: 'line' },
  { key: 'netPl', labelKey: 'masterDash.netPl', color: 'var(--color-fg)', kind: 'pixels' },
  { key: 'benchmark', labelKey: 'masterDash.benchmark', color: 'var(--color-fg-subtle)', kind: 'line', dashed: true },
];

/* ───────────── Helpers ───────────── */

function staggerStyle(index: number, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * 90}ms` };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function percentOf(value: number, max: number): number {
  return max <= 0 ? 0 : Math.min(100, Math.max(4, (Math.abs(value) / max) * 100));
}

function buildWindow(data: MasterDashboard, period: MasterPeriod): PeriodWindow {
  return buildPeriodWindow(data.windowEnd, period === 'today' ? 1 : data.periodDays[period]);
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

/* ───────────── Shared bits ───────────── */

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

// Capsule track: a translucent tube with a fill that grows in from the left and an optional light scanning across it.
function CapsuleTrack({ percent, red = false, scan = false, delayMs = 0 }: { percent: number; red?: boolean; scan?: boolean; delayMs?: number }) {
  return (
    <span aria-hidden="true" className="relative block h-3 overflow-hidden rounded-full bg-fg/10">
      <span
        style={{ width: `${percent}%`, animationDelay: `${delayMs}ms`, background: red ? RED : undefined }}
        className={cx('zenith-capsule absolute inset-y-0 left-0 origin-left rounded-full', !red && 'bg-fg')}
      >
        {scan && <span className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-white/45" />}
      </span>
    </span>
  );
}

function EmptyNote({ icon, children, className }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-4 py-6 text-center', className)}>
      <span className="relative grid size-16 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span aria-hidden="true" style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
        <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
          <Icon name={icon} size={16} />
        </span>
      </span>
      <p className="mt-3 text-sm text-fg-muted">{children}</p>
    </div>
  );
}

function PanelHead({ icon, title, aside }: { icon: IconName; title: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-fg">
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name={icon} size={15} />
        </span>
        {title}
      </h2>
      {aside}
    </header>
  );
}

// "View all" has nowhere to go while the list is empty, so it stays visible but disabled.
function ViewAllButton({ hasItems, withChevron = false }: { hasItems: boolean; withChevron?: boolean }) {
  return (
    <button
      type="button"
      disabled={!hasItems}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line transition-[box-shadow,opacity] hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {translate('masterDash.viewAll')}
      {withChevron && <Icon name="chevronRight" size={12} />}
    </button>
  );
}

// Day pills: separate capsules, the active one solid white with a red dot.
function PeriodTabs({ value, onChange }: { value: MasterPeriod; onChange: (period: MasterPeriod) => void }) {
  return (
    <div role="radiogroup" aria-label={translate('masterDash.range')} className="flex flex-wrap gap-1.5">
      {periods.map((period) => {
        const isActive = period.id === value;
        return (
          <button
            key={period.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(period.id)}
            className={cx(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none sm:text-xs',
              isActive ? 'bg-fg text-app shadow-[0_10px_20px_-12px_rgb(0_0_0/0.9)]' : 'text-fg-subtle ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            {period.label}
            {isActive && <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Title ───────────── */

function PageTitle({ chartWindow }: { chartWindow: PeriodWindow }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isRefreshing) return;
    const timer = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(timer);
  }, [isRefreshing]);

  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <RedDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMasterDashboard')}</h2>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {/* Date range: start and end joined by a dashed route with a red bead running along it. */}
        <p className="inline-flex items-center gap-3 text-xs font-semibold text-fg tabular-nums">
          <Icon name="calendar" size={13} className="text-fg-muted" />
          <span>{rangeFormatter.format(chartWindow.start)}</span>
          <span aria-hidden="true" className="relative w-14 border-t border-dashed border-line-strong sm:w-20">
            <span style={{ background: RED }} className="zenith-route absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </span>
          <span>{rangeFormatter.format(chartWindow.end)}</span>
        </p>
        <button
          type="button"
          onClick={() => setIsRefreshing(true)}
          disabled={isRefreshing}
          className="group/refresh inline-flex h-10 items-center gap-2 rounded-full bg-fg pr-1.5 pl-4 text-xs font-bold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-80 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-live="polite">{translate(isRefreshing ? 'masterDash.refreshing' : 'masterDash.refresh')}</span>
          <span aria-hidden="true" style={{ background: RED }} className="grid size-7 place-items-center rounded-full text-white">
            <Icon name="refresh" size={13} className={cx('transition-transform duration-500 group-hover/refresh:rotate-180', isRefreshing && 'animate-spin motion-reduce:animate-none')} />
          </span>
        </button>
      </div>
    </header>
  );
}

/* ───────────── Open AUM band ───────────── */

function SummaryFrost({ data }: { data: MasterDashboard }) {
  const shownAum = useAnimatedNumber(data.totalAum, 700);
  const { active, paused, stopped } = data.copiers;
  const copierTotal = active + paused + stopped;
  const litPixels = copierTotal === 0 ? 0 : Math.round((active / copierTotal) * COPIER_PIXELS);
  const payoutDate = rangeFormatter.format(parseLocal(data.nextPayout.date));
  const stats: { icon: IconName; label: string; value: string; hint: string; meter: ReactNode }[] = [
    {
      icon: 'user',
      label: translate('masterDash.activeCopiers'),
      value: String(data.activeCopiers),
      hint: translate('masterDash.activeCopiersHint', { count: String(data.netNewCopiers) }),
      // Active share of all copiers, as lit pixels; idle cells twinkle while there are none.
      meter: (
        <span aria-hidden="true" className="grid grid-cols-12 gap-1">
          {Array.from({ length: COPIER_PIXELS }, (_, index) => {
            const isLit = index < litPixels;
            return (
              <span
                key={index}
                style={{ animationDelay: `${isLit ? 300 + index * 30 : (index * 173) % 1600}ms` }}
                className={cx('h-3 rounded-[3px]', isLit ? 'zenith-pixel bg-fg' : 'zenith-twinkle bg-fg/15')}
              />
            );
          })}
        </span>
      ),
    },
    {
      icon: 'crypto',
      label: translate('masterDash.myEarnings'),
      value: formatMoney(data.earnings, data.currency),
      hint: translate('masterDash.myEarningsHint', { amount: formatMoney(data.nextPayout.amount, data.currency), date: payoutDate }),
      // Route from today to the next payout date.
      meter: (
        <span aria-hidden="true" className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full bg-fg" />
          <span className="relative flex-1 border-t-2 border-dashed border-line-strong">
            <span style={{ background: RED }} className="zenith-route absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] text-fg-muted ring-1 ring-line tabular-nums">
            <Icon name="calendar" size={10} />
            {payoutDate}
          </span>
        </span>
      ),
    },
  ];

  return (
    <section className="zenith-tile grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {translate('masterDash.totalAum')}
        </p>
        <p className="mt-4 truncate text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">{formatMoney(shownAum, data.currency)}</p>
        <p className="mt-2 text-sm text-fg-muted">{translate('masterDash.totalAumHint')}</p>
      </div>

      <dl className="grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line">
        {stats.map((stat, index) => (
          <div key={stat.label} style={staggerStyle(index, 300)} className="group/stat zenith-tile flex min-w-0 flex-col gap-3 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <dt className={cx(captionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-fg/10 text-fg ring-1 ring-line transition-transform duration-300 group-hover/stat:-rotate-12">
                <Icon name={stat.icon} size={14} />
              </span>
              <span aria-hidden="true" className="font-mono">
                {stepNumber(index)}
              </span>
              <span className="truncate">{stat.label}</span>
            </dt>
            <dd className="truncate text-3xl font-black tracking-tight text-fg tabular-nums">{stat.value}</dd>
            <dd className="truncate text-[11px] text-fg-muted">{stat.hint}</dd>
            <dd>{stat.meter}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Performance: white + red lines over an area, Net P&L as a pixel strip ───────────── */

interface ChartPoint {
  time: number;
  values: Record<MasterSeriesKey, number>;
}

// Catmull-Rom through the column centres, written out as cubic Béziers.
function smoothPath(coords: [number, number][]) {
  if (coords.length === 0) return '';
  let path = `M${coords[0][0]},${coords[0][1]}`;
  for (let index = 0; index < coords.length - 1; index += 1) {
    const before = coords[index - 1] ?? coords[index];
    const from = coords[index];
    const to = coords[index + 1];
    const after = coords[index + 2] ?? to;
    const c1x = round2(from[0] + (to[0] - before[0]) / 6);
    const c1y = round2(from[1] + (to[1] - before[1]) / 6);
    const c2x = round2(to[0] - (after[0] - from[0]) / 6);
    const c2y = round2(to[1] - (after[1] - from[1]) / 6);
    path += ` C${c1x},${c1y} ${c2x},${c2y} ${to[0]},${to[1]}`;
  }
  return path;
}

function SeriesSwatch({ series, isOn }: { series: (typeof seriesConfig)[number]; isOn: boolean }) {
  if (series.kind === 'pixels') {
    return (
      <span className="grid grid-cols-2 gap-0.5">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={cx('size-1.5 rounded-[1.5px]', isOn ? 'bg-fg' : 'bg-line-strong')} />
        ))}
      </span>
    );
  }
  return (
    <span
      style={{ borderColor: isOn ? series.color : undefined }}
      className={cx('w-4 border-t-[3px]', series.dashed && 'border-dashed', !isOn && 'border-line-strong')}
    />
  );
}

function PerformancePanel({ data, period, onPeriod, chartWindow }: { data: MasterDashboard; period: MasterPeriod; onPeriod: (period: MasterPeriod) => void; chartWindow: PeriodWindow }) {
  const plotRef = useRef<HTMLDivElement>(null);
  const areaId = `zenith-area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [hidden, setHidden] = useState<MasterSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const span = chartWindow.end - chartWindow.start;
  const points: ChartPoint[] = Array.from({ length: COLUMN_COUNT }, (_, index) => {
    const time = chartWindow.start + (span * index) / (COLUMN_COUNT - 1);
    return { time, values: masterSeriesAt(time) };
  });
  const visibleSeries = seriesConfig.filter((series) => !hidden.includes(series.key));
  const lineSeries = visibleSeries.filter((series) => series.kind === 'line');
  const pixelSeries = visibleSeries.find((series) => series.kind === 'pixels');
  const allValues = lineSeries.flatMap((series) => points.map((point) => point.values[series.key]));
  const rawLow = allValues.length ? Math.min(...allValues) : 0;
  const rawHigh = allValues.length ? Math.max(...allValues) : 1;
  const step = niceStep(Math.max((rawHigh - rawLow) / 5, 1));
  const low = Math.floor(rawLow / step) * step;
  const high = Math.max(Math.ceil(rawHigh / step) * step, low + step);
  const yTicks: number[] = [];
  for (let tick = high; tick >= low - step / 1000; tick -= step) yTicks.push(tick);

  const slot = 100 / COLUMN_COUNT;
  const toY = (value: number) => round2(((high - value) / (high - low)) * 100);
  // Every timestamp maps onto the centre of its column, so labels, lines and pixels share one x-scale.
  const toX = (time: number) => round2((((time - chartWindow.start) / span) * (COLUMN_COUNT - 1) + 0.5) * slot);
  const leadLine = lineSeries[0];
  const lastIndex = COLUMN_COUNT - 1;
  const pixelMax = pixelSeries ? Math.max(1, ...points.map((point) => Math.abs(point.values[pixelSeries.key]))) : 1;

  function toggle(key: MasterSeriesKey) {
    setHidden((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(0.9999, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.floor(ratio * COLUMN_COUNT));
  }

  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  const hoverX = hoverPoint === null ? 0 : toX(hoverPoint.time);

  return (
    <section style={staggerStyle(1, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5 sm:p-6')}>
      <PanelHead icon="areaChart" title={translate('masterDash.performance')} aside={<PeriodTabs value={period} onChange={onPeriod} />} />

      {/* Series switches on one hairline rail: each toggles its series and shows its latest value. */}
      <div className="mt-5 flex flex-wrap gap-2 border-y border-line py-3">
        {seriesConfig.map((series) => {
          const isOn = !hidden.includes(series.key);
          return (
            <button
              key={series.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(series.key)}
              className={cx(
                'group/series inline-flex items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-3 text-left transition-[box-shadow,opacity,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isOn ? 'bg-fg/[0.05] ring-1 ring-line-strong' : 'border border-dashed border-line-strong opacity-50 hover:opacity-100',
              )}
            >
              <span aria-hidden="true" className="grid w-4 place-items-center">
                <SeriesSwatch series={series} isOn={isOn} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-semibold text-fg-muted">{translate(series.labelKey)}</span>
                <span className="block truncate font-mono text-xs font-bold text-fg tabular-nums">{formatMoney(points[lastIndex].values[series.key], data.currency)}</span>
              </span>
              <span aria-hidden="true" className={cx('ml-1 grid size-6 place-items-center rounded-full', isOn ? 'bg-fg text-app' : 'text-transparent ring-1 ring-line-strong')}>
                <Icon name="check" size={11} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col">
        <div className="flex gap-3">
          <div
            ref={plotRef}
            role="img"
            aria-label={translate('masterDash.performance')}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            className="relative h-64 min-w-0 flex-1 touch-none sm:h-72"
          >
            {yTicks.map((tick) => (
              <span key={tick} aria-hidden="true" style={{ top: `${toY(tick)}%` }} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" />
            ))}

            {hoverPoint !== null && <span aria-hidden="true" style={{ left: `${hoverX}%` }} className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-fg/40" />}

            {lineSeries.length > 0 && (
              <svg key={period} aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full animate-fade-quick overflow-visible text-fg motion-reduce:animate-none">
                <defs>
                  <linearGradient id={areaId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[...lineSeries].reverse().map((series) => {
                  const coords = points.map((point): [number, number] => [toX(point.time), toY(point.values[series.key])]);
                  const path = smoothPath(coords);
                  return (
                    <g key={series.key}>
                      {series.area && <path d={`${path} L${coords[coords.length - 1][0]},100 L${coords[0][0]},100 Z`} fill={`url(#${areaId})`} />}
                      <path
                        d={path}
                        fill="none"
                        stroke={series.color}
                        strokeWidth={series.area ? 2.75 : 2}
                        strokeLinecap="round"
                        strokeDasharray={series.dashed ? '6 5' : undefined}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Live marker on the newest point of the lead line: white core, red ring, red ripple. */}
            {leadLine && hoverPoint === null && (
              <span
                aria-hidden="true"
                style={{ left: `${toX(points[lastIndex].time)}%`, top: `${toY(points[lastIndex].values[leadLine.key])}%` }}
                className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2"
              >
                <span style={{ borderColor: RED }} className="col-start-1 row-start-1 size-8 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
                <span className="col-start-1 row-start-1 size-3.5 place-self-center rounded-full bg-fg ring-[3px] ring-[var(--zenith-red)]" />
              </span>
            )}

            {hoverPoint !== null && (
              <>
                {lineSeries.map((series) => (
                  <span
                    key={series.key}
                    aria-hidden="true"
                    style={{ left: `${hoverX}%`, top: `${toY(hoverPoint.values[series.key])}%`, background: series.color }}
                    className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-app"
                  />
                ))}
                <div
                  style={{ left: `${hoverX}%` }}
                  className={cx('pointer-events-none absolute top-2 z-10 w-52 animate-fade-quick rounded-2xl p-3 motion-reduce:animate-none', tipClass, hoverX > 60 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5')}
                >
                  <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-fg-muted tabular-nums">
                    <Icon name="clock" size={11} />
                    {axisStamp(hoverPoint.time)}
                  </p>
                  <ul className="mt-2 space-y-1.5 border-t border-line pt-2">
                    {visibleSeries.map((series) => (
                      <li key={series.key} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 text-fg-muted">
                          <span aria-hidden="true" className="grid w-4 place-items-center">
                            <SeriesSwatch series={series} isOn />
                          </span>
                          {translate(series.labelKey)}
                        </span>
                        <span className="font-mono font-bold tabular-nums">{formatMoney(hoverPoint.values[series.key], data.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Value scale on the right edge. */}
          <div aria-hidden="true" className="relative h-64 w-14 shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums sm:h-72">
            {yTicks.map((tick) => (
              <span key={tick} style={{ top: `${toY(tick)}%` }} className="absolute left-0 flex -translate-y-1/2 items-center gap-1.5 leading-none">
                <span className="size-1 rounded-full bg-line-strong" />
                {axisMoney(tick)}
              </span>
            ))}
          </div>
        </div>

        {/* Net P&L strip: one pixel column per time slot, height by size, white for profit and red for loss. */}
        {pixelSeries && (
          <div className="mt-3 flex gap-3 border-t border-line pt-3">
            <div key={period} aria-hidden="true" className="flex min-w-0 flex-1 items-end gap-[2px]">
              {points.map((point, index) => {
                const value = point.values[pixelSeries.key];
                const litRows = Math.max(1, Math.round((Math.abs(value) / pixelMax) * PIXEL_ROWS));
                const isDimmed = hoverIndex !== null && hoverIndex !== index;
                return (
                  <span key={point.time} className={cx('flex min-w-0 flex-1 flex-col-reverse gap-[2px] transition-opacity duration-200', isDimmed && 'opacity-30')}>
                    {Array.from({ length: PIXEL_ROWS }, (_, row) => {
                      const isLit = row < litRows;
                      return (
                        <span
                          key={row}
                          style={isLit ? { animationDelay: `${index * 14 + row * 40}ms`, background: value < 0 ? RED : undefined } : undefined}
                          className={cx('h-1.5 w-full rounded-[1.5px]', isLit ? cx('zenith-pixel', value >= 0 && 'bg-fg') : 'bg-fg/[0.06]')}
                        />
                      );
                    })}
                  </span>
                );
              })}
            </div>
            <p className="flex w-14 shrink-0 flex-col justify-end text-[9.5px] leading-tight font-semibold tracking-[0.1em] text-fg-subtle uppercase">{translate(pixelSeries.labelKey)}</p>
          </div>
        )}

        <div className="mt-2 flex gap-3">
          <div aria-hidden="true" className="relative h-5 min-w-0 flex-1 font-mono text-[10px] text-fg-subtle tabular-nums">
            {chartWindow.ticks.map((tick, index) => {
              const isFirst = index === 0;
              const isLast = index === chartWindow.ticks.length - 1;
              return (
                <span
                  key={tick}
                  style={{ left: `${toX(tick)}%` }}
                  className={cx(
                    'absolute px-1.5 py-0.5 whitespace-nowrap',
                    isFirst ? 'translate-x-0' : isLast ? '-translate-x-full' : '-translate-x-1/2',
                    // Tick 1 sits too close to the left-aligned first label, so it never gets one.
                    !isFirst && !isLast && (index === 1 ? 'hidden' : index % 2 === 1 ? 'max-xl:hidden' : 'max-md:hidden'),
                  )}
                >
                  {axisStamp(tick)}
                </span>
              );
            })}
          </div>
          <span aria-hidden="true" className="w-14 shrink-0" />
        </div>
      </div>
    </section>
  );
}

/* ───────────── Instruments: ROI · copier health · risk ───────────── */

function roiPosition(value: number) {
  const clamped = Math.max(-ROI_RANGE, Math.min(ROI_RANGE, value));
  return round2(((clamped + ROI_RANGE) / (2 * ROI_RANGE)) * 100);
}

// Capsule scale from -20% to +20%: the fill grows from zero to the ROI, a bead slides in, the red tick marks the benchmark.
function RoiGauge({ roi, benchmark }: { roi: number; benchmark: number }) {
  const isMounted = useMounted();
  const roiAt = roiPosition(roi);
  const benchAt = roiPosition(benchmark);
  const isGain = roi >= 0;
  const fillWidth = Math.abs(roiAt - 50);
  const fillStyle: CSSProperties = {
    width: `${isMounted ? fillWidth : 0}%`,
    transition: 'width 1200ms cubic-bezier(.2,.8,.2,1) 300ms',
    ...(isGain ? { left: '50%' } : { right: '50%', background: RED }),
  };

  return (
    <section style={staggerStyle(2, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5')}>
      <PanelHead icon="trendUp" title={translate('masterDash.masterRoi')} />
      <p className={cx('mt-5 font-mono text-5xl font-black tracking-tight tabular-nums', isGain ? 'text-fg' : 'text-[var(--zenith-red)]')}>{signedPercent(roi)}</p>

      <div aria-hidden="true" className="relative mt-4 pt-6 pb-6">
        <span style={{ left: `${benchAt}%` }} className="absolute top-0 -translate-x-1/2 font-mono text-[9px] font-bold text-[var(--zenith-red)]">
          {signedPercent(benchmark)}
        </span>
        <span className="relative block h-5 rounded-full bg-fg/[0.06] ring-1 ring-line">
          <span className="absolute inset-0 rounded-full [background-image:repeating-linear-gradient(90deg,transparent_0_9px,var(--color-line)_9px_10px)]" />
          <span style={fillStyle} className={cx('absolute inset-y-1 rounded-full', isGain && 'bg-fg')} />
          <span className="absolute -inset-y-1.5 left-1/2 w-px bg-fg/50" />
          <span style={{ left: `${benchAt}%`, background: RED }} className="absolute -inset-y-2 w-0.5 -translate-x-1/2 rounded-full" />
          <span
            style={{ left: `${isMounted ? roiAt : 50}%`, transition: 'left 1400ms cubic-bezier(.2,.9,.3,1.25) 300ms' }}
            className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center"
          >
            <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
            <span className="size-4 rounded-full bg-fg ring-4 ring-app" />
          </span>
        </span>
        {ROI_MARKS.map((mark, index) => (
          <span
            key={mark}
            style={{ left: `${roiPosition(mark)}%` }}
            className={cx(
              'absolute bottom-0 font-mono text-[9px] text-fg-subtle',
              index === 0 ? 'translate-x-0' : index === ROI_MARKS.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
            )}
          >
            {mark > 0 ? '+' : ''}
            {mark}%
          </span>
        ))}
      </div>

      <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-fg-muted">
        <span aria-hidden="true" style={{ background: RED }} className="h-2.5 w-0.5 rounded-full" />
        {translate('masterDash.masterRoiHint', { value: signedPercent(benchmark) })}
      </p>
    </section>
  );
}

type CopierStatus = 'active' | 'paused' | 'stopped';

const statusCell: Record<CopierStatus, string> = { active: 'bg-fg', paused: 'bg-fg/35', stopped: 'bg-[var(--zenith-red)]' };

function CopierHealth({ data }: { data: MasterDashboard }) {
  const { active, paused, stopped, newInWindow, churned, avgAgeDays, retentionPercent } = data.copiers;
  const total = active + paused + stopped;
  const segments: { status: CopierStatus; labelKey: MessageKey; count: number }[] = [
    { status: 'active', labelKey: 'masterDash.active', count: active },
    { status: 'paused', labelKey: 'masterDash.paused', count: paused },
    { status: 'stopped', labelKey: 'masterDash.stopped', count: stopped },
  ];
  // Each of the 50 pixels is 2% of copiers; a pixel takes the status whose share covers its midpoint.
  const cells = Array.from({ length: COPIER_BEADS }, (_, index): CopierStatus | null => {
    if (total === 0) return null;
    const position = ((index + 0.5) / COPIER_BEADS) * total;
    let reached = 0;
    for (const segment of segments) {
      reached += segment.count;
      if (position < reached) return segment.status;
    }
    return segments[segments.length - 1].status;
  });
  const footer = [
    { labelKey: 'masterDash.newWindow' as const, value: String(newInWindow) },
    { labelKey: 'masterDash.churned' as const, value: String(churned) },
    { labelKey: 'masterDash.avgAge' as const, value: `${avgAgeDays}d` },
  ];

  return (
    <section style={staggerStyle(3, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5')}>
      <PanelHead icon="user" title={translate('masterDash.copierHealth')} />

      <div className="mt-5 flex items-end justify-between gap-3">
        {total === 0 ? (
          <p className="text-sm font-semibold text-fg-muted">{translate('masterDash.noCopiers')}</p>
        ) : (
          <p className="font-mono text-5xl leading-none font-black text-fg tabular-nums">{total}</p>
        )}
        <RedDot />
      </div>

      {/* Pixel matrix: 50 cells coloured by copier status; idle cells twinkle while there are no copiers. */}
      <div aria-hidden="true" className="mt-4 grid grid-cols-10 gap-1.5">
        {cells.map((status, index) => (
          <span
            key={index}
            style={{ animationDelay: status ? `${index * 18}ms` : `${(index * 137) % 1600}ms` }}
            className={cx('h-4 rounded-[4px]', status ? cx('zenith-pixel', statusCell[status]) : 'zenith-twinkle bg-fg/10')}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {segments.map((segment) => (
          <li key={segment.labelKey} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs text-fg-muted ring-1 ring-line">
            <span aria-hidden="true" className={cx('size-2 rounded-[2px]', statusCell[segment.status])} />
            {translate(segment.labelKey)}
            <span className="font-mono font-bold text-fg tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
        {footer.map((item, index) => (
          <div key={item.labelKey} className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
              {stepNumber(index)}
            </span>
            <dt className="truncate text-fg-muted">{translate(item.labelKey)}</dt>
            <span aria-hidden="true" className="flex-1 border-t border-dashed border-line" />
            <dd className="font-mono font-bold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
              04
            </span>
            <dt className="flex-1 truncate text-fg-muted">{translate('masterDash.retention')}</dt>
            <dd className="font-mono font-bold text-fg tabular-nums">{retentionPercent}%</dd>
          </div>
          <dd>
            <CapsuleTrack percent={Math.min(100, Math.max(0, retentionPercent))} scan delayMs={400} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function RiskWatch({ data }: { data: MasterDashboard }) {
  return (
    <section style={staggerStyle(4, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5')}>
      <PanelHead icon="alert" title={translate('masterDash.riskAlerts')} />
      {data.riskAlerts.length === 0 ? (
        <div className="flex flex-1 items-center gap-5 py-4">
          {/* Scanner: dashed rings, a white sweep and a ripple around the check while everything is healthy. */}
          <span className="relative grid size-24 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-line-strong" />
            <span aria-hidden="true" className="absolute inset-4 rounded-full border border-dashed border-line-strong" />
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin overflow-hidden rounded-full motion-reduce:hidden">
              <span className="absolute inset-0 bg-[conic-gradient(from_0deg,rgb(255_255_255/0.22),transparent_22%)]" />
            </span>
            <span aria-hidden="true" className="absolute inset-6 animate-ring-ripple rounded-full border border-success/70 motion-reduce:hidden" />
            <span className={cx(beadClass, 'relative size-10')}>
              <Icon name="checkCircle" size={18} />
            </span>
          </span>
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-success ring-1 ring-success/40">
            <span aria-hidden="true" className="size-2 animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
            {translate('masterDash.healthy')}
          </p>
        </div>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {data.riskAlerts.map((alert, index) => (
            <li key={alert.id} style={staggerStyle(index, 200)} className="flex animate-feed-in items-start gap-3 rounded-[20px] bg-fg/[0.03] p-3 text-sm text-fg ring-1 ring-line motion-reduce:animate-none">
              <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
                <span aria-hidden="true" style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden" />
                <span style={{ background: RED }} className="relative grid size-7 place-items-center rounded-full text-white">
                  <Icon name="alert" size={13} />
                </span>
              </span>
              {alert.message}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ───────────── Payout ledger ───────────── */

function PayoutTrack({
  index,
  title,
  items,
  emptyText,
  currency,
  aside,
}: {
  index: number;
  title: string;
  items: { id: string; amount: number; date: string }[];
  emptyText: string;
  currency: string;
  aside?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className="font-mono">
            {stepNumber(index)}
          </span>
          {title}
        </p>
        {aside}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 rounded-full border border-dashed border-line-strong px-4 py-2.5 text-center text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ol className="relative mt-3 flex flex-col gap-2 pl-6">
          <span aria-hidden="true" className="absolute top-3 bottom-3 left-[9px] border-l border-dashed border-line-strong" />
          {items.map((payout, payoutIndex) => (
            <li key={payout.id} style={staggerStyle(payoutIndex, 200)} className="relative flex animate-feed-in items-center gap-3 py-1.5 text-sm motion-reduce:animate-none">
              <span
                aria-hidden="true"
                style={payoutIndex === 0 ? { background: RED } : undefined}
                className={cx('absolute top-1/2 -left-[22px] size-3 -translate-y-1/2 rounded-full ring-2 ring-app', payoutIndex !== 0 && 'bg-fg')}
              />
              <span className="text-fg-muted tabular-nums">{rangeFormatter.format(parseLocal(payout.date))}</span>
              <span aria-hidden="true" className="flex-1 border-t border-dashed border-line" />
              <span className="font-mono font-bold text-fg tabular-nums">{formatMoney(payout.amount, currency)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PayoutLedger({ data }: { data: MasterDashboard }) {
  const { earned, pending, upcoming, recent } = data.payouts;

  return (
    <section style={staggerStyle(5, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col gap-5 p-5')}>
      <PanelHead icon="crypto" title={translate('masterDash.payouts')} />

      <div className="relative overflow-hidden rounded-[26px] bg-fg p-4 text-app">
        <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-16 bg-white/25 motion-reduce:hidden" />
        <p className="relative flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">
          <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-full" />
          {translate('masterDash.earnedWindow')}
        </p>
        <p className="relative mt-1 truncate font-mono text-3xl font-black tracking-tight tabular-nums">{formatMoney(earned, data.currency)}</p>
      </div>

      <div className="flex items-center gap-3 rounded-full bg-fg/[0.03] p-1.5 pr-4 text-sm ring-1 ring-line">
        <span aria-hidden="true" style={{ background: RED }} className="grid size-8 shrink-0 place-items-center rounded-full text-white">
          <Icon name="clock" size={13} className="animate-rim-spin [animation-duration:8s] motion-reduce:animate-none" />
        </span>
        <p className={captionClass}>{translate('masterDash.pending')}</p>
        <span aria-hidden="true" className="flex-1" />
        <p className="font-mono text-lg font-black text-fg tabular-nums">{formatMoney(pending, data.currency)}</p>
      </div>

      <div className="flex flex-col gap-5 border-t border-line pt-5">
        <PayoutTrack index={0} title={translate('masterDash.upcoming')} items={upcoming} emptyText={translate('masterDash.noUpcoming')} currency={data.currency} />
        <PayoutTrack
          index={1}
          title={translate('masterDash.recent')}
          items={recent}
          emptyText={translate('masterDash.noPayouts')}
          currency={data.currency}
          aside={<ViewAllButton hasItems={recent.length > 0} withChevron />}
        />
      </div>
    </section>
  );
}

/* ───────────── Plans / trades ───────────── */

function PlanLeaderboard({ data }: { data: MasterDashboard }) {
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={staggerStyle(6, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5')}>
      <PanelHead icon="trendUp" title={translate('masterDash.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <EmptyNote icon="trendUp" className="flex-1">
          {translate('masterDash.noPlans')}
        </EmptyNote>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {data.plans.map((plan, index) => {
            const isGain = plan.roiPercent >= 0;
            return (
              <li key={plan.id} style={staggerStyle(index, 200)} className="flex animate-feed-in flex-col gap-2 motion-reduce:animate-none">
                <div className="flex items-center gap-3">
                  <span className={cx('font-mono text-xl leading-none font-black tabular-nums', index === 0 ? 'text-[var(--zenith-red)]' : 'text-fg/25')}>{stepNumber(index)}</span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{plan.name}</p>
                  <span className={cx('rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums ring-1', isGain ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
                    {signedPercent(plan.roiPercent)}
                  </span>
                </div>
                <CapsuleTrack percent={percentOf(plan.roiPercent, topRoi)} red={!isGain} scan={index === 0} delayMs={200 + index * 120} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function TradeTape({ data }: { data: MasterDashboard }) {
  const cycle = { '--cycle': `${data.autoRefreshSeconds}s` } as CSSProperties;
  return (
    <section style={staggerStyle(7, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5 sm:p-6')}>
      <PanelHead
        icon="bolt"
        title={translate('masterDash.recentTrades')}
        aside={
          <span className="inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-semibold text-fg ring-1 ring-line">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 -rotate-90">
              <circle cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" className="stroke-line" />
              <circle
                cx="10"
                cy="10"
                r="7"
                fill="none"
                stroke={RED}
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                style={cycle}
                className="[animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
              />
            </svg>
            {translate('masterDash.autoRefresh', { seconds: String(data.autoRefreshSeconds) })}
          </span>
        }
      />
      {data.trades.length === 0 ? (
        <EmptyNote icon="bolt" className="flex-1">
          {translate('masterDash.noTrades')}
        </EmptyNote>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {data.trades.map((trade, index) => {
            const isBuy = trade.side === 'buy';
            return (
              <li
                key={trade.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 text-sm ring-1 ring-line motion-reduce:animate-none"
              >
                <span
                  style={isBuy ? undefined : { background: RED }}
                  className={cx('inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold uppercase', isBuy ? 'bg-fg text-app' : 'text-white')}
                >
                  <Icon name={isBuy ? 'trendUp' : 'trendDown'} size={12} />
                  {trade.side}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-semibold text-fg">{trade.symbol}</span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">{trade.volume}</span>
                </span>
                <span className={cx('font-mono font-bold tabular-nums', trade.profit >= 0 ? 'text-success' : 'text-danger')}>{formatMoney(trade.profit, data.currency)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ───────────── Page ───────────── */

export default function MasterDashboardPage() {
  const { data } = useMasterDashboard();
  const [chosenPeriod, setChosenPeriod] = useState<MasterPeriod | null>(null);

  if (!data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[34rem] rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
      </div>
    );
  }

  const period = chosenPeriod ?? data.defaultPeriod;
  const chartWindow = buildWindow(data, period);

  // Skeleton: open header, open AUM band, chart beside an instrument rail, a row of three panels, then the trade tape.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle chartWindow={chartWindow} />
      <SummaryFrost data={data} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <PerformancePanel data={data} period={period} onPeriod={setChosenPeriod} chartWindow={chartWindow} />
        <div className="grid gap-6 md:grid-cols-2 xl:flex xl:flex-col">
          <RoiGauge roi={data.roiPercent} benchmark={data.benchmarkPercent} />
          <RiskWatch data={data} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <CopierHealth data={data} />
        <PayoutLedger data={data} />
        <PlanLeaderboard data={data} />
      </div>

      <TradeTape data={data} />
    </div>
  );
}
