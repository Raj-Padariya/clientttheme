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
import '../promotion/market.css';
import '../pamm/desk.css';

const COLUMN_COUNT = 48;
const ROI_RANGE = 20;
const ROI_MARKS = [-20, -10, 0, 10, 20];
const COPIER_BARS = 50;
const SIGNAL_BARS = 24;
const TRACK_SEGMENTS = 20;
const rangeFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const SAGE = 'var(--hero-buy)';
const CLAY = 'var(--aurora-cta-from)';
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-xl bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
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

type SeriesKind = 'spectrum' | 'dots' | 'line' | 'mirror';

// Equity is a sage spectrum of hairline columns, AUM a flowing dotted signal, benchmark a dashed line; Net P&L gets its own mirror strip.
const seriesConfig: { key: MasterSeriesKey; labelKey: MessageKey; color: string; kind: SeriesKind }[] = [
  { key: 'equity', labelKey: 'masterDash.equity', color: SAGE, kind: 'spectrum' },
  { key: 'aum', labelKey: 'masterDash.aum', color: CLAY, kind: 'dots' },
  { key: 'netPl', labelKey: 'masterDash.netPl', color: 'var(--color-fg)', kind: 'mirror' },
  { key: 'benchmark', labelKey: 'masterDash.benchmark', color: 'var(--color-fg-subtle)', kind: 'line' },
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

function ClayDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

// Segment track: a row of small blocks that rise in one by one up to the share, with an optional glare sweeping across.
function SegmentTrack({ percent, loss = false, scan = false, delayMs = 0 }: { percent: number; loss?: boolean; scan?: boolean; delayMs?: number }) {
  const litSegments = Math.round((percent / 100) * TRACK_SEGMENTS);
  return (
    <span aria-hidden="true" className="relative flex h-3 gap-[3px] overflow-hidden">
      {Array.from({ length: TRACK_SEGMENTS }, (_, index) => {
        const isLit = index < litSegments;
        return (
          <span
            key={index}
            style={isLit ? ({ '--candle-delay': `${delayMs + index * 35}ms` } as CSSProperties) : undefined}
            className={cx('flex-1 rounded-[2px]', isLit ? cx('mkt-candle', loss ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)') : 'bg-fg/10')}
          />
        );
      })}
      {scan && <span className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/35" />}
    </span>
  );
}

// Empty state: the icon as a transmitter with signal rings radiating out, waiting for the first signal.
function EmptyNote({ icon, children, className }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-4 py-6 text-center', className)}>
      <span className="relative grid size-20 place-items-center">
        {[0, 1, 2].map((ring) => (
          <span
            key={ring}
            aria-hidden="true"
            style={{ animationDelay: `${ring * 0.6}s` }}
            className="absolute inset-0 animate-ring-ripple rounded-full border border-(--hero-buy)/60 motion-reduce:hidden"
          />
        ))}
        <span className={cx(beadClass, 'relative size-11')}>
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
      className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line transition-[box-shadow,opacity] hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {translate('masterDash.viewAll')}
      {withChevron && <Icon name="chevronRight" size={12} />}
    </button>
  );
}

// Timeframe toolbar like a chart's: mono labels, the active one tinted sage with an underline and a blinking dot.
function PeriodTabs({ value, onChange }: { value: MasterPeriod; onChange: (period: MasterPeriod) => void }) {
  return (
    <div role="radiogroup" aria-label={translate('masterDash.range')} className="flex flex-wrap gap-0.5 rounded-lg bg-fg/[0.04] p-1 ring-1 ring-line">
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
              'relative inline-flex h-7 items-center rounded-md px-2.5 font-mono text-[11px] font-bold whitespace-nowrap transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-(--hero-buy)/12 text-(--hero-buy)' : 'text-fg-subtle hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            {period.label}
            {isActive && (
              <>
                <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-(--hero-buy)" />
                <span aria-hidden="true" className="mkt-blink absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-(--aurora-cta-from)" />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Title ───────────── */

// Relay: the master node broadcasts down three dashed routes, signal packets travel to the copier terminals.
const RELAY_TARGETS = [12, 40, 68];

function relayRoute(targetY: number) {
  return `M36 40 C 100 40, 116 ${targetY}, 178 ${targetY}`;
}

function SignalRelay() {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 80" className="h-20 w-full max-w-[15rem] shrink-0 overflow-visible">
      {RELAY_TARGETS.map((targetY, index) => (
        <g key={targetY}>
          <path d={relayRoute(targetY)} fill="none" strokeWidth={1.5} strokeDasharray="4 5" className="mkt-march stroke-(--hero-buy)/50" />
          <g className="motion-reduce:hidden">
            <circle r={3} className="fill-(--hero-buy)">
              <animateMotion dur="2.1s" begin={`${-index * 0.7}s`} repeatCount="indefinite" path={relayRoute(targetY)} />
            </circle>
          </g>
          <rect x={178} y={targetY - 8} width={34} height={16} rx={4} strokeWidth={1} className="fill-app stroke-line-strong" />
          {[0, 1, 2, 3].map((bar) => (
            <rect
              key={bar}
              x={184 + bar * 6}
              y={targetY + 4 - (3 + ((bar + index) % 3) * 2)}
              width={3}
              height={3 + ((bar + index) % 3) * 2}
              rx={0.5}
              className={bar % 3 === 1 ? 'fill-(--aurora-cta-from)' : 'fill-(--hero-buy)'}
            />
          ))}
        </g>
      ))}
      <g className="motion-reduce:hidden">
        <circle cx={22} cy={40} r={14} fill="none" strokeWidth={1.5} className="stroke-(--hero-buy)">
          <animate attributeName="r" values="14;30" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </g>
      <circle cx={22} cy={40} r={14} strokeWidth={1.5} className="fill-(--hero-buy)/15 stroke-(--hero-buy)" />
      <circle cx={22} cy={40} r={6} className="fill-(--hero-buy)" />
    </svg>
  );
}

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
          <ClayDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMasterDashboard')}</h2>
      </div>
      <div className="flex shrink-0 flex-col gap-3 lg:items-end">
        <SignalRelay />
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range as a tick tape with a clay diamond running from start to end. */}
          <p className="inline-flex items-center gap-3 font-mono text-xs font-semibold text-fg tabular-nums">
            <Icon name="calendar" size={13} className="text-fg-muted" />
            <span>{rangeFormatter.format(chartWindow.start)}</span>
            <span aria-hidden="true" className="relative h-2.5 w-14 [background-image:repeating-linear-gradient(90deg,var(--color-line-strong)_0_1px,transparent_1px_5px)] sm:w-20">
              <span className="zenith-route absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-(--aurora-cta-from)" />
            </span>
            <span>{rangeFormatter.format(chartWindow.end)}</span>
          </p>
          <button
            type="button"
            onClick={() => setIsRefreshing(true)}
            disabled={isRefreshing}
            className="group/refresh inline-flex h-10 items-center gap-2 rounded-full bg-(--hero-buy) pr-1.5 pl-4 text-xs font-bold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-80 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-live="polite">{translate(isRefreshing ? 'masterDash.refreshing' : 'masterDash.refresh')}</span>
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-(--aurora-cta-from) text-[#062520]">
              <Icon name="refresh" size={13} className={cx('transition-transform duration-500 group-hover/refresh:rotate-180', isRefreshing && 'animate-spin motion-reduce:animate-none')} />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ───────────── Master signal panel: AUM + copiers + earnings ───────────── */

function SummaryFrost({ data }: { data: MasterDashboard }) {
  const shownAum = useAnimatedNumber(data.totalAum, 700);
  const { active, paused, stopped } = data.copiers;
  const copierTotal = active + paused + stopped;
  const litBars = copierTotal === 0 ? 0 : Math.round((active / copierTotal) * SIGNAL_BARS);
  const payoutDate = rangeFormatter.format(parseLocal(data.nextPayout.date));
  const stats: { icon: IconName; label: string; value: string; hint: string; meter: ReactNode }[] = [
    {
      icon: 'user',
      label: translate('masterDash.activeCopiers'),
      value: String(data.activeCopiers),
      hint: translate('masterDash.activeCopiersHint', { count: String(data.netNewCopiers) }),
      // Active share of all copiers as signal-strength bars; idle bars pulse while there are none.
      meter: (
        <span aria-hidden="true" className="flex h-7 items-end gap-[3px]">
          {Array.from({ length: SIGNAL_BARS }, (_, index) => {
            const isLit = index < litBars;
            const height = 25 + (index / (SIGNAL_BARS - 1)) * 75;
            const motion = isLit ? { '--candle-delay': `${300 + index * 30}ms` } : { '--vol-delay': `${(index % 6) * 0.15}s` };
            return (
              <span
                key={index}
                style={{ height: `${height}%`, ...motion } as CSSProperties}
                className={cx('flex-1 rounded-[2px]', isLit ? 'mkt-candle bg-(--hero-buy)' : 'mkt-vol bg-fg/15')}
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
      // Tick tape from today to the next payout date, a clay diamond running along it.
      meter: (
        <span aria-hidden="true" className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm bg-(--hero-buy)" />
          <span className="relative h-3 flex-1 [background-image:repeating-linear-gradient(90deg,var(--color-line-strong)_0_1px,transparent_1px_6px)]">
            <span className="zenith-route absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-(--aurora-cta-from)" />
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] text-fg-muted ring-1 ring-line tabular-nums">
            <Icon name="calendar" size={10} />
            {payoutDate}
          </span>
        </span>
      ),
    },
  ];

  return (
    <section className={cx(panelClass, 'zenith-tile grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end')}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-(--hero-buy) to-(--hero-buy)/0" />
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {translate('masterDash.totalAum')}
          <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-(--hero-buy)" />
        </p>
        <p className="mt-4 truncate font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">{formatMoney(shownAum, data.currency)}</p>
        <p className="mt-2 text-sm text-fg-muted">{translate('masterDash.totalAumHint')}</p>
      </div>

      <dl className="grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line">
        {stats.map((stat, index) => (
          <div key={stat.label} style={staggerStyle(index, 300)} className="group/stat zenith-tile flex min-w-0 flex-col gap-3 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <dt className={cx(captionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-fg/10 text-fg ring-1 ring-line transition-transform duration-300 group-hover/stat:-rotate-12">
                <Icon name={stat.icon} size={14} />
              </span>
              <span aria-hidden="true" className="font-mono">
                {stepNumber(index)}
              </span>
              <span className="truncate">{stat.label}</span>
            </dt>
            <dd className="truncate font-mono text-3xl font-black tracking-tight text-fg tabular-nums">{stat.value}</dd>
            <dd className="truncate text-[11px] text-fg-muted">{stat.hint}</dd>
            <dd>{stat.meter}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Performance: equity spectrum, dotted AUM signal, benchmark, Net P&L mirror strip ───────────── */

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
  const tone = isOn ? undefined : 'var(--color-line-strong)';
  if (series.kind === 'spectrum') {
    return (
      <span className="flex h-3 items-end gap-0.5">
        {[50, 100, 75].map((height) => (
          <span key={height} style={{ height: `${height}%`, background: tone ?? series.color }} className="w-1 rounded-[1px]" />
        ))}
      </span>
    );
  }
  if (series.kind === 'dots') {
    return (
      <span className="flex gap-0.5">
        {[0, 1, 2].map((dot) => (
          <span key={dot} style={{ background: tone ?? series.color }} className="size-1 rounded-full" />
        ))}
      </span>
    );
  }
  if (series.kind === 'mirror') {
    return (
      <span className="flex h-3 flex-col justify-center gap-px">
        <span className={cx('ml-0.5 h-1.5 w-1', isOn ? 'bg-(--hero-buy)' : 'bg-line-strong')} />
        <span className={cx('ml-2 h-1 w-1', isOn ? 'bg-(--aurora-cta-from)' : 'bg-line-strong')} />
      </span>
    );
  }
  return <span style={{ borderColor: tone ?? series.color }} className="w-4 border-t-2 border-dashed" />;
}

function PerformancePanel({ data, period, onPeriod, chartWindow }: { data: MasterDashboard; period: MasterPeriod; onPeriod: (period: MasterPeriod) => void; chartWindow: PeriodWindow }) {
  const plotRef = useRef<HTMLDivElement>(null);
  const spectrumId = `aurora-spectrum-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [hidden, setHidden] = useState<MasterSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const span = chartWindow.end - chartWindow.start;
  const points: ChartPoint[] = Array.from({ length: COLUMN_COUNT }, (_, index) => {
    const time = chartWindow.start + (span * index) / (COLUMN_COUNT - 1);
    return { time, values: masterSeriesAt(time) };
  });
  const visibleSeries = seriesConfig.filter((series) => !hidden.includes(series.key));
  const plotSeries = visibleSeries.filter((series) => series.kind !== 'mirror');
  const mirrorSeries = visibleSeries.find((series) => series.kind === 'mirror');
  const allValues = plotSeries.flatMap((series) => points.map((point) => point.values[series.key]));
  const rawLow = allValues.length ? Math.min(...allValues) : 0;
  const rawHigh = allValues.length ? Math.max(...allValues) : 1;
  const step = niceStep(Math.max((rawHigh - rawLow) / 5, 1));
  const low = Math.floor(rawLow / step) * step;
  const high = Math.max(Math.ceil(rawHigh / step) * step, low + step);
  const yTicks: number[] = [];
  for (let tick = high; tick >= low - step / 1000; tick -= step) yTicks.push(tick);

  const slot = 100 / COLUMN_COUNT;
  const toY = (value: number) => round2(((high - value) / (high - low)) * 100);
  // Every timestamp maps onto the centre of its column, so labels, columns, dots and mirror bars share one x-scale.
  const toX = (time: number) => round2((((time - chartWindow.start) / span) * (COLUMN_COUNT - 1) + 0.5) * slot);
  const leadLine = plotSeries[0];
  const lastIndex = COLUMN_COUNT - 1;
  const mirrorMax = mirrorSeries ? Math.max(1, ...points.map((point) => Math.abs(point.values[mirrorSeries.key]))) : 1;

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

      {/* Series switches as quote cells: each toggles its series and shows its latest value. */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {seriesConfig.map((series) => {
          const isOn = !hidden.includes(series.key);
          return (
            <button
              key={series.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(series.key)}
              className={cx(
                'relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg px-3 py-2 text-left transition-[box-shadow,opacity,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isOn ? 'bg-fg/[0.05] ring-1 ring-line-strong' : 'border border-dashed border-line-strong opacity-50 hover:opacity-100',
              )}
            >
              {isOn && <span aria-hidden="true" style={{ background: series.color }} className="absolute inset-x-0 top-0 h-0.5" />}
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[10.5px] font-semibold text-fg-muted">{translate(series.labelKey)}</span>
                <span aria-hidden="true" className="grid w-4 shrink-0 place-items-center">
                  <SeriesSwatch series={series} isOn={isOn} />
                </span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs font-bold text-fg tabular-nums">{formatMoney(points[lastIndex].values[series.key], data.currency)}</span>
                <span aria-hidden="true" className={cx('grid size-4 shrink-0 place-items-center rounded', isOn ? 'bg-(--hero-buy) text-[#062520]' : 'text-transparent ring-1 ring-line-strong')}>
                  <Icon name="check" size={10} />
                </span>
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

            {plotSeries.length > 0 && (
              <svg key={period} aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs>
                  <linearGradient id={spectrumId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="100">
                    <stop offset="0%" stopColor={SAGE} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={SAGE} stopOpacity="0.06" />
                  </linearGradient>
                </defs>
                {[...plotSeries].reverse().map((series) => {
                  const coords = points.map((point): [number, number] => [toX(point.time), toY(point.values[series.key])]);
                  if (series.kind === 'spectrum') {
                    return (
                      <g key={series.key}>
                        {coords.map(([x, y], index) => (
                          <line
                            key={x}
                            x1={x}
                            x2={x}
                            y1={100}
                            y2={y}
                            stroke={`url(#${spectrumId})`}
                            strokeWidth={4}
                            vectorEffect="non-scaling-stroke"
                            style={{ '--candle-delay': `${index * 18}ms` } as CSSProperties}
                            className={cx('mkt-candle origin-bottom [transform-box:fill-box] transition-opacity duration-200', hoverIndex !== null && hoverIndex !== index && 'opacity-40')}
                          />
                        ))}
                        <path d={smoothPath(coords)} pathLength={1} fill="none" stroke={series.color} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="mkt-draw" />
                      </g>
                    );
                  }
                  return (
                    <path
                      key={series.key}
                      d={smoothPath(coords)}
                      fill="none"
                      stroke={series.color}
                      strokeWidth={series.kind === 'dots' ? 4 : 1.5}
                      strokeLinecap="round"
                      strokeDasharray={series.kind === 'dots' ? '0.1 8' : '6 5'}
                      vectorEffect="non-scaling-stroke"
                      className={series.kind === 'dots' ? 'mkt-march' : undefined}
                    />
                  );
                })}
              </svg>
            )}

            {/* Live marker on the newest point of the lead series: sage core, clay ring, clay ripple. */}
            {leadLine && hoverPoint === null && (
              <span
                aria-hidden="true"
                style={{ left: `${toX(points[lastIndex].time)}%`, top: `${toY(points[lastIndex].values[leadLine.key])}%` }}
                className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2"
              >
                <span className="col-start-1 row-start-1 size-8 animate-ring-ripple rounded-full border-2 border-(--aurora-cta-from) motion-reduce:hidden" />
                <span className="col-start-1 row-start-1 size-3.5 place-self-center rounded-full bg-(--hero-buy) ring-[3px] ring-(--aurora-cta-from)" />
              </span>
            )}

            {hoverPoint !== null && (
              <>
                {plotSeries.map((series) => (
                  <span
                    key={series.key}
                    aria-hidden="true"
                    style={{ left: `${hoverX}%`, top: `${toY(hoverPoint.values[series.key])}%`, background: series.color }}
                    className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-app"
                  />
                ))}
                <div
                  style={{ left: `${hoverX}%` }}
                  className={cx('pointer-events-none absolute top-2 z-10 w-52 animate-fade-quick rounded-xl p-3 motion-reduce:animate-none', tipClass, hoverX > 60 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5')}
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

          {/* Value scale on the right edge, as price tags. */}
          <div aria-hidden="true" className="relative h-64 w-14 shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums sm:h-72">
            {yTicks.map((tick) => (
              <span key={tick} style={{ top: `${toY(tick)}%` }} className="absolute left-0 flex -translate-y-1/2 items-center gap-1 leading-none">
                <span className="w-1.5 border-t border-line-strong" />
                {axisMoney(tick)}
              </span>
            ))}
          </div>
        </div>

        {/* Net P&L mirror strip: one bar per time slot off a centre axis, sage above for profit, clay below for loss. */}
        {mirrorSeries && (
          <div className="mt-3 flex gap-3 border-t border-line pt-3">
            <div key={period} aria-hidden="true" className="relative flex h-16 min-w-0 flex-1 gap-[2px]">
              <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-line-strong" />
              {points.map((point, index) => {
                const value = point.values[mirrorSeries.key];
                const size = Math.max(6, (Math.abs(value) / mirrorMax) * 48);
                const isDimmed = hoverIndex !== null && hoverIndex !== index;
                return (
                  <span key={point.time} className={cx('relative min-w-0 flex-1 transition-opacity duration-200', isDimmed && 'opacity-30')}>
                    <span
                      style={{ height: `${size}%`, '--candle-delay': `${index * 14}ms` } as CSSProperties}
                      className={cx('mkt-candle absolute inset-x-0 rounded-[2px]', value < 0 ? 'top-1/2 bg-(--aurora-cta-from)' : 'bottom-1/2 bg-(--hero-buy)')}
                    />
                  </span>
                );
              })}
            </div>
            <p className="flex w-14 shrink-0 flex-col justify-center text-[9.5px] leading-tight font-semibold tracking-[0.1em] text-fg-subtle uppercase">{translate(mirrorSeries.labelKey)}</p>
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

// Vertical price axis from -20% to +20%: the column grows from zero to the ROI while its price tag rides up, the clay line marks the benchmark.
function RoiGauge({ roi, benchmark }: { roi: number; benchmark: number }) {
  const isMounted = useMounted();
  const roiAt = roiPosition(roi);
  const benchAt = roiPosition(benchmark);
  const isGain = roi >= 0;
  const fillStyle: CSSProperties = {
    height: `${isMounted ? Math.abs(roiAt - 50) : 0}%`,
    transition: 'height 1200ms cubic-bezier(.2,.8,.2,1) 300ms',
    ...(isGain ? { bottom: '50%' } : { top: '50%' }),
  };

  return (
    <section style={staggerStyle(2, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5')}>
      <PanelHead icon="trendUp" title={translate('masterDash.masterRoi')} />
      <div className="mt-5 flex flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className={cx('font-mono text-5xl font-black tracking-tight tabular-nums', isGain ? 'text-(--hero-buy)' : 'text-(--aurora-cta-from)')}>{signedPercent(roi)}</p>
          <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-fg-muted">
            <span aria-hidden="true" className="w-3 shrink-0 border-t-2 border-dashed border-(--aurora-cta-from)" />
            {translate('masterDash.masterRoiHint', { value: signedPercent(benchmark) })}
          </p>
        </div>

        <div aria-hidden="true" className="relative my-2 h-40 w-32 shrink-0">
          <span className="absolute inset-y-0 left-2 w-3 overflow-hidden rounded-md bg-fg/[0.06] ring-1 ring-line">
            <span style={fillStyle} className={cx('absolute inset-x-0.5 rounded-sm', isGain ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')} />
          </span>
          {ROI_MARKS.map((mark) => (
            <span key={mark} style={{ bottom: `${roiPosition(mark)}%` }} className="absolute left-6 flex translate-y-1/2 items-center gap-1 font-mono text-[9px] text-fg-subtle">
              <span className={cx('border-t', mark === 0 ? 'w-2.5 border-fg/60' : 'w-1.5 border-line-strong')} />
              {mark > 0 ? '+' : ''}
              {mark}%
            </span>
          ))}
          <span style={{ bottom: `${benchAt}%` }} className="absolute right-0 left-0 flex translate-y-1/2 items-center justify-end">
            <span className="flex-1 border-t border-dashed border-(--aurora-cta-from)/70" />
            <span className="rounded bg-(--aurora-cta-from)/15 px-1 py-px font-mono text-[9px] font-bold text-(--aurora-cta-from)">{signedPercent(benchmark)}</span>
          </span>
          <span
            style={{ bottom: `${isMounted ? roiAt : 50}%`, transition: 'bottom 1400ms cubic-bezier(.2,.9,.3,1.25) 300ms' }}
            className="absolute right-0 flex translate-y-1/2 items-center"
          >
            <span className="size-0 border-y-[5px] border-r-[6px] border-y-transparent border-r-(--hero-buy)" />
            <span className="relative rounded-md bg-(--hero-buy) px-1.5 py-0.5 font-mono text-[10px] font-black text-[#062520] tabular-nums">
              <span className="absolute inset-0 animate-ping-soft rounded-md bg-(--hero-buy)/40 motion-reduce:hidden" />
              <span className="relative">{signedPercent(roi)}</span>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

type CopierStatus = 'active' | 'paused' | 'stopped';

const statusCell: Record<CopierStatus, string> = { active: 'bg-(--hero-buy)', paused: 'bg-fg/35', stopped: 'bg-(--aurora-cta-from)' };

function CopierHealth({ data }: { data: MasterDashboard }) {
  const { active, paused, stopped, newInWindow, churned, avgAgeDays, retentionPercent } = data.copiers;
  const total = active + paused + stopped;
  const segments: { status: CopierStatus; labelKey: MessageKey; count: number }[] = [
    { status: 'active', labelKey: 'masterDash.active', count: active },
    { status: 'paused', labelKey: 'masterDash.paused', count: paused },
    { status: 'stopped', labelKey: 'masterDash.stopped', count: stopped },
  ];
  // Each of the 50 bars is 2% of copiers; a bar takes the status whose share covers its midpoint.
  const cells = Array.from({ length: COPIER_BARS }, (_, index): CopierStatus | null => {
    if (total === 0) return null;
    const position = ((index + 0.5) / COPIER_BARS) * total;
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
        <ClayDot />
      </div>

      {/* Copier volume profile: 50 bars coloured by status; idle bars bounce like volume while there are no copiers. */}
      <div aria-hidden="true" className="mt-4 flex h-16 items-end gap-[3px] rounded-lg bg-fg/[0.03] p-2 ring-1 ring-line">
        {cells.map((status, index) => {
          const height = 40 + ((index * 37) % 60);
          return status ? (
            <span
              key={index}
              style={{ height: `${height}%`, '--candle-delay': `${index * 18}ms` } as CSSProperties}
              className={cx('mkt-candle flex-1 rounded-[2px]', statusCell[status])}
            />
          ) : (
            <span key={index} style={{ height: `${height}%`, '--vol-delay': `${(index % 10) * 0.12}s` } as CSSProperties} className="mkt-vol flex-1 rounded-[2px] bg-fg/12" />
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {segments.map((segment) => (
          <li key={segment.labelKey} className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs text-fg-muted ring-1 ring-line">
            <span aria-hidden="true" className={cx('h-2.5 w-1 rounded-[1px]', statusCell[segment.status])} />
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
            <SegmentTrack percent={Math.min(100, Math.max(0, retentionPercent))} scan delayMs={400} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

// Heartbeat of the account inside its risk band: a steady line with two small beats.
const HEARTBEAT = 'M0 30 H48 L56 22 L62 38 L68 16 L74 34 L80 30 H128 L136 24 L142 36 L148 30 H200';

function RiskWatch({ data }: { data: MasterDashboard }) {
  return (
    <section style={staggerStyle(4, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5')}>
      <PanelHead icon="alert" title={translate('masterDash.riskAlerts')} />
      {data.riskAlerts.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center gap-4 py-4">
          {/* Risk monitor: the heartbeat stays inside the dashed clay limits while a sage pulse runs along it. */}
          <svg aria-hidden="true" viewBox="0 0 200 60" className="h-16 w-full overflow-visible">
            <rect x={0} y={8} width={200} height={44} rx={4} className="fill-(--hero-buy)/[0.06]" />
            {[8, 52].map((y) => (
              <line key={y} x1={0} x2={200} y1={y} y2={y} strokeDasharray="4 4" className="stroke-(--aurora-cta-from)/50" />
            ))}
            <path d={HEARTBEAT} pathLength={1} fill="none" strokeWidth={2} strokeLinejoin="round" className="mkt-draw stroke-(--hero-buy)" />
            <g className="motion-reduce:hidden">
              <circle r={4} className="fill-(--hero-buy)">
                <animateMotion dur="3s" repeatCount="indefinite" path={HEARTBEAT} />
              </circle>
            </g>
          </svg>
          <p className="inline-flex items-center gap-2 self-start rounded-md px-3 py-1.5 text-sm font-semibold text-success ring-1 ring-success/40">
            <span aria-hidden="true" className="size-2 animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
            {translate('masterDash.healthy')}
          </p>
        </div>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {data.riskAlerts.map((alert, index) => (
            <li key={alert.id} style={staggerStyle(index, 200)} className="relative flex animate-feed-in items-start gap-3 overflow-hidden rounded-lg bg-(--aurora-cta-from)/[0.06] p-3 pl-4 text-sm text-fg ring-1 ring-(--aurora-cta-from)/30 motion-reduce:animate-none">
              <span aria-hidden="true" className="desk-stripes absolute inset-y-0 left-0 w-1.5 bg-(--aurora-cta-from)" />
              <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
                <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-lg bg-(--aurora-cta-from)/40 motion-reduce:hidden" />
                <span className="relative grid size-7 place-items-center rounded-lg bg-(--aurora-cta-from) text-[#062520]">
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
        <p className="mt-2 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-center text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-dashed divide-line rounded-lg ring-1 ring-line">
          {items.map((payout, payoutIndex) => (
            <li key={payout.id} style={staggerStyle(payoutIndex, 200)} className="flex animate-feed-in items-center gap-3 px-3 py-2 text-sm motion-reduce:animate-none">
              <span aria-hidden="true" className={cx('size-2 shrink-0 rotate-45', payoutIndex === 0 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)')} />
              <span className="font-mono text-xs text-fg-muted tabular-nums">{rangeFormatter.format(parseLocal(payout.date))}</span>
              <span aria-hidden="true" className="flex-1" />
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

      {/* Settlement ticket: sage slip with a perforated stub and a glare passing over it. */}
      <div className="relative flex overflow-hidden rounded-xl bg-(--hero-buy) text-[#062520]">
        <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-16 -skew-x-12 bg-white/30" />
        <div className="relative min-w-0 flex-1 p-4">
          <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">
            <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-[#062520]" />
            {translate('masterDash.earnedWindow')}
          </p>
          <p className="mt-1 truncate font-mono text-3xl font-black tracking-tight tabular-nums">{formatMoney(earned, data.currency)}</p>
        </div>
        <span aria-hidden="true" className="relative grid w-12 shrink-0 place-items-center border-l-2 border-dashed border-[#062520]/30">
          <Icon name="check" size={16} />
        </span>
      </div>

      <div className="relative flex items-center gap-3 overflow-hidden rounded-lg bg-(--aurora-cta-from)/[0.06] p-1.5 pr-4 text-sm ring-1 ring-(--aurora-cta-from)/30">
        <span aria-hidden="true" className="desk-stripes absolute inset-y-0 right-0 w-24 opacity-40 [mask-image:linear-gradient(to_left,#000,transparent)]" />
        <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center rounded-md bg-(--aurora-cta-from) text-[#062520]">
          <Icon name="clock" size={13} className="animate-rim-spin [animation-duration:8s] motion-reduce:animate-none" />
        </span>
        <p className={cx(captionClass, 'relative')}>{translate('masterDash.pending')}</p>
        <span aria-hidden="true" className="flex-1" />
        <p className="relative font-mono text-lg font-black text-fg tabular-nums">{formatMoney(pending, data.currency)}</p>
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
                  <span className={cx('font-mono text-xl leading-none font-black tabular-nums', index === 0 ? 'text-(--hero-buy)' : 'text-fg/25')}>{stepNumber(index)}</span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{plan.name}</p>
                  <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums ring-1', isGain ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
                    <Icon name={isGain ? 'trendUp' : 'trendDown'} size={11} />
                    {signedPercent(plan.roiPercent)}
                  </span>
                </div>
                <SegmentTrack percent={percentOf(plan.roiPercent, topRoi)} loss={!isGain} scan={index === 0} delayMs={200 + index * 120} />
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
          <span className="inline-flex items-center gap-2 rounded-md py-1 pr-3 pl-1 text-xs font-semibold text-fg ring-1 ring-line">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 -rotate-90">
              <circle cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" className="stroke-line" />
              <circle
                cx="10"
                cy="10"
                r="7"
                fill="none"
                stroke={CLAY}
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
                className="grid animate-feed-in grid-cols-[auto_minmax(0,1fr)_3rem_auto] items-center gap-3 rounded-lg bg-fg/[0.03] py-1.5 pr-3 pl-1.5 text-sm ring-1 ring-line motion-reduce:animate-none"
              >
                <span
                  className={cx(
                    'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[10px] font-bold uppercase text-[#062520]',
                    isBuy ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)',
                  )}
                >
                  <Icon name={isBuy ? 'trendUp' : 'trendDown'} size={12} />
                  {trade.side}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold text-fg">{trade.symbol}</span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">{trade.volume}</span>
                </span>
                {/* Copy relay: the trade flowing from the master to the copiers. */}
                <svg aria-hidden="true" viewBox="0 0 48 6" className="h-1.5 w-12">
                  <line x1={0} x2={48} y1={3} y2={3} strokeWidth={2} strokeDasharray="3 4" strokeLinecap="round" className="mkt-march stroke-fg/40" />
                </svg>
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
