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

const CHART_POINTS = 121;
const ROI_GAUGE_RANGE = 20;
const graphite = 'bg-[#18181b]';
const cardClass = 'rounded-[28px] border border-line bg-surface shadow-card';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const rangeFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const periods: { id: MasterPeriod; label: string }[] = [
  { id: 'today', label: translate('masterDash.today') },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

const seriesConfig: { key: MasterSeriesKey; labelKey: MessageKey; color: string; dashed?: boolean }[] = [
  { key: 'equity', labelKey: 'masterDash.equity', color: 'var(--brand-primary)' },
  { key: 'aum', labelKey: 'masterDash.aum', color: '#38bdf8' },
  { key: 'netPl', labelKey: 'masterDash.netPl', color: '#34d399' },
  { key: 'benchmark', labelKey: 'masterDash.benchmark', color: '#a78bfa', dashed: true },
];

/* ───────────── Helpers ───────────── */

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

type ChartWindow = PeriodWindow;

function buildWindow(data: MasterDashboard, period: MasterPeriod): ChartWindow {
  return buildPeriodWindow(data.windowEnd, period === 'today' ? 1 : data.periodDays[period]);
}

/* ───────────── Shared bits ───────────── */

function EmptyNote({ icon, children, className }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-4 py-6 text-center', className)}>
      <span className="relative grid size-14 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border border-dashed border-primary/40 [animation-duration:16s] motion-reduce:animate-none" />
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon name={icon} size={15} />
        </span>
      </span>
      <p className="mt-2.5 text-sm text-fg-muted">{children}</p>
    </div>
  );
}

function CardHead({ icon, title, aside }: { icon: IconName; title: string; aside?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-fg">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
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
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {translate('masterDash.viewAll')}
      {withChevron && <Icon name="chevronRight" size={12} />}
    </button>
  );
}

/* ───────────── Hero console ───────────── */

function PeriodRail({ value, onChange }: { value: MasterPeriod; onChange: (period: MasterPeriod) => void }) {
  const activeIndex = periods.findIndex((period) => period.id === value);
  return (
    <div role="radiogroup" aria-label={translate('masterDash.range')} className="relative grid w-full max-w-sm grid-cols-6 rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10 sm:w-auto">
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className={cx('absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/6)] rounded-full shadow-[0_6px_18px_-8px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none', goldFill)}
      />
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
              'relative z-10 h-8 rounded-full px-1 text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:px-3 sm:text-xs',
              isActive ? 'text-[#18181b]' : 'text-white/60 hover:text-white',
            )}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}

function RoiGauge({ roi, benchmark }: { roi: number; benchmark: number }) {
  const clampShare = (value: number) => Math.max(-1, Math.min(1, value / ROI_GAUGE_RANGE));
  const share = clampShare(roi);
  const needleAngle = share * 90;
  const benchmarkAngle = clampShare(benchmark) * 90;
  // Highlight runs from the top (0%) towards the needle, so the arc's dash starts at its midpoint.
  const fillLength = Math.abs(share) / 2;
  const fillOffset = share >= 0 ? -0.5 : -(0.5 - fillLength);

  return (
    <div className="flex flex-col items-center">
      <p className={cx(eyebrow, 'self-start text-white/45 lg:self-center')}>{translate('masterDash.masterRoi')}</p>
      <div className="relative mt-2 w-48">
        <svg aria-hidden="true" viewBox="0 0 100 56" className="w-full overflow-visible">
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-white/10" />
          {[-60, -30, 0, 30, 60].map((angle) => (
            <line key={angle} x1="50" y1="4" x2="50" y2="8" transform={`rotate(${angle} 50 50)`} className="stroke-white/25" strokeWidth="1" />
          ))}
          <path
            d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${fillLength} 1`}
            strokeDashoffset={fillOffset}
            style={{ stroke: roi >= 0 ? 'var(--brand-gleam)' : '#f87171' }}
          />
          <line x1="50" y1="12" x2="50" y2="18" transform={`rotate(${benchmarkAngle} 50 50)`} stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
          <g transform={`rotate(${needleAngle} 50 50)`} className="transition-transform duration-700 motion-reduce:transition-none">
            <line x1="50" y1="50" x2="50" y2="17" strokeWidth="2" strokeLinecap="round" style={{ stroke: 'var(--brand-gleam)' }} />
          </g>
          <circle cx="50" cy="50" r="4.5" className="fill-[#18181b]" strokeWidth="2" style={{ stroke: 'var(--brand-gleam)' }} />
        </svg>
      </div>
      <p className={cx('-mt-1 font-mono text-2xl font-semibold tabular-nums', goldText)}>{signedPercent(roi)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
        <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-[#a78bfa]" />
        {translate('masterDash.masterRoiHint', { value: signedPercent(benchmark) })}
      </p>
    </div>
  );
}

function HeroStat({ icon, label, value, hint, index }: { icon: IconName; label: string; value: string; hint: string; index: number }) {
  return (
    <div style={riseDelay(index)} className="group flex animate-rise items-center gap-3 rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/[0.08] motion-reduce:animate-none">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-(--brand-gleam) ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0">
        <span className={cx(eyebrow, 'block text-white/45')}>{label}</span>
        <span className="block font-mono text-xl font-semibold text-white tabular-nums">{value}</span>
        <span className="block truncate text-[11px] text-white/50">{hint}</span>
      </span>
    </div>
  );
}

function HeroConsole({
  data,
  period,
  onPeriod,
  window: chartWindow,
}: {
  data: MasterDashboard;
  period: MasterPeriod;
  onPeriod: (period: MasterPeriod) => void;
  window: ChartWindow;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const shownAum = useAnimatedNumber(data.totalAum, 700);

  useEffect(() => {
    if (!isRefreshing) return;
    const timer = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(timer);
  }, [isRefreshing]);

  return (
    <section className={cx('relative isolate animate-rise overflow-hidden rounded-[28px] p-5 text-white ring-1 ring-white/10 sm:p-6 motion-reduce:animate-none', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 -z-10 size-96 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_26%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top_right,#000,transparent_70%)]" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodRail value={period} onChange={onPeriod} />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 tabular-nums">
            <Icon name="calendar" size={13} className="text-(--brand-gleam)" />
            {rangeFormatter.format(chartWindow.start)} → {rangeFormatter.format(chartWindow.end)}
          </span>
          <button
            type="button"
            onClick={() => setIsRefreshing(true)}
            disabled={isRefreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 hover:ring-primary/60 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
          >
            <Icon name="refresh" size={13} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
            <span aria-live="polite">{translate(isRefreshing ? 'masterDash.refreshing' : 'masterDash.refresh')}</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]">
        <div>
          <p className={cx(eyebrow, 'flex items-center gap-2 text-white/45')}>
            <span className={cx('grid size-6 place-items-center rounded-lg text-[#18181b]', goldFill)}>
              <Icon name="wallet" size={12} />
            </span>
            {translate('masterDash.totalAum')}
          </p>
          <p className={cx('mt-2 font-mono text-5xl font-semibold tracking-tight tabular-nums', goldText)}>{formatMoney(shownAum, data.currency)}</p>
          <p className="mt-1 text-sm text-white/55">{translate('masterDash.totalAumHint')}</p>
        </div>

        <div className="grid gap-3">
          <HeroStat
            index={1}
            icon="user"
            label={translate('masterDash.activeCopiers')}
            value={String(data.activeCopiers)}
            hint={translate('masterDash.activeCopiersHint', { count: String(data.netNewCopiers) })}
          />
          <HeroStat
            index={2}
            icon="crypto"
            label={translate('masterDash.myEarnings')}
            value={formatMoney(data.earnings, data.currency)}
            hint={translate('masterDash.myEarningsHint', {
              amount: formatMoney(data.nextPayout.amount, data.currency),
              date: rangeFormatter.format(parseLocal(data.nextPayout.date)),
            })}
          />
        </div>

        <RoiGauge roi={data.roiPercent} benchmark={data.benchmarkPercent} />
      </div>
    </section>
  );
}

/* ───────────── Performance chart ───────────── */

interface ChartPoint {
  time: number;
  values: Record<MasterSeriesKey, number>;
}

function PerformanceChart({ data, window: chartWindow, period }: { data: MasterDashboard; window: ChartWindow; period: MasterPeriod }) {
  const safeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `md-clip-${safeId}`;
  const areaId = `md-area-${safeId}`;
  const plotRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<MasterSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const span = chartWindow.end - chartWindow.start;
  const points: ChartPoint[] = Array.from({ length: CHART_POINTS }, (_, index) => {
    const time = chartWindow.start + (span * index) / (CHART_POINTS - 1);
    return { time, values: masterSeriesAt(time) };
  });
  const visibleSeries = seriesConfig.filter((series) => !hidden.includes(series.key));
  const allValues = visibleSeries.flatMap((series) => points.map((point) => point.values[series.key]));
  const rawLow = allValues.length ? Math.min(...allValues) : 0;
  const rawHigh = allValues.length ? Math.max(...allValues) : 1;
  const step = niceStep(Math.max((rawHigh - rawLow) / 5, 1));
  const low = Math.floor(rawLow / step) * step;
  const high = Math.max(Math.ceil(rawHigh / step) * step, low + step);
  const yTicks: number[] = [];
  for (let tick = high; tick >= low - step / 1000; tick -= step) yTicks.push(tick);

  const toY = (value: number) => ((high - value) / (high - low)) * 100;
  const toX = (time: number) => ((time - chartWindow.start) / span) * 100;
  const linePath = (key: MasterSeriesKey) => points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.time)},${toY(point.values[key])}`).join(' ');
  // The first visible series (Equity by default) gets the soft area fill and the live end dot.
  const leadSeries = visibleSeries[0];
  const lastPoint = points[points.length - 1];

  function toggle(key: MasterSeriesKey) {
    setHidden((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (CHART_POINTS - 1)));
  }

  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  const hoverX = hoverPoint === null ? 0 : toX(hoverPoint.time);

  return (
    <section style={riseDelay(1)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardHead icon="areaChart" title={translate('masterDash.performance')} />
        <div className="flex flex-wrap gap-1.5">
          {seriesConfig.map((series) => {
            const isOn = !hidden.includes(series.key);
            return (
              <button
                key={series.key}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(series.key)}
                className={cx(
                  'inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold ring-1 transition-[background-color,color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  isOn ? 'bg-surface-2 text-fg ring-line-strong' : 'text-fg-subtle opacity-60 ring-line hover:opacity-100',
                )}
              >
                <span aria-hidden="true" style={{ background: isOn ? series.color : undefined }} className={cx('h-1 w-3.5 rounded-full transition-colors', !isOn && 'bg-line-strong')} />
                {translate(series.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex min-h-72 flex-1 gap-3">
        <div aria-hidden="true" className="relative mb-6 w-12 shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">
          {yTicks.map((tick) => (
            <span key={tick} style={{ top: `${toY(tick)}%` }} className="absolute right-0 -translate-y-1/2 leading-none">
              {axisMoney(tick)}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={plotRef}
            role="img"
            aria-label={translate('masterDash.performance')}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            className="relative flex-1 touch-none"
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <defs>
                <clipPath id={clipId}>
                  <rect key={period} x="0" y="-5" width="100" height="110" className="origin-left animate-grow [transform-box:fill-box] motion-reduce:animate-none" />
                </clipPath>
                {leadSeries && (
                  <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: leadSeries.color, stopOpacity: 0.22 }} />
                    <stop offset="100%" style={{ stopColor: leadSeries.color, stopOpacity: 0 }} />
                  </linearGradient>
                )}
              </defs>
              {yTicks.map((tick) => (
                <line key={tick} x1="0" x2="100" y1={toY(tick)} y2={toY(tick)} vectorEffect="non-scaling-stroke" className={cx(Math.abs(tick) < step / 1000 ? 'stroke-line-strong' : 'stroke-line')} strokeWidth="1" />
              ))}
              {chartWindow.ticks.map((tick) => (
                <line key={tick} y1="0" y2="100" x1={toX(tick)} x2={toX(tick)} vectorEffect="non-scaling-stroke" className="stroke-line/60" strokeWidth="1" strokeDasharray="2 4" />
              ))}
              <g clipPath={`url(#${clipId})`}>
                {leadSeries && <path d={`${linePath(leadSeries.key)} L100,100 L0,100 Z`} fill={`url(#${areaId})`} />}
                {[...visibleSeries].reverse().map((series) => (
                  <path
                    key={series.key}
                    d={linePath(series.key)}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={series === leadSeries ? 2.5 : 1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={series.dashed ? '6 5' : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            </svg>

            {/* Live end point of the lead series. */}
            {leadSeries && hoverPoint === null && (
              <span aria-hidden="true" style={{ left: '100%', top: `${toY(lastPoint.values[leadSeries.key])}%` }} className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2">
                <span style={{ background: leadSeries.color }} className="col-start-1 row-start-1 size-3 animate-ping rounded-full opacity-60 motion-reduce:hidden" />
                <span style={{ background: leadSeries.color }} className="col-start-1 row-start-1 size-3 rounded-full ring-2 ring-surface" />
              </span>
            )}

            {hoverPoint !== null && (
              <>
                <span aria-hidden="true" style={{ left: `${hoverX}%` }} className="pointer-events-none absolute inset-y-0 w-px bg-primary/60" />
                {visibleSeries.map((series) => (
                  <span
                    key={series.key}
                    aria-hidden="true"
                    style={{ left: `${hoverX}%`, top: `${toY(hoverPoint.values[series.key])}%`, borderColor: series.color }}
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface"
                  />
                ))}
                <div
                  style={{ left: `${hoverX}%` }}
                  className={cx(
                    'pointer-events-none absolute top-2 z-10 w-52 rounded-2xl p-3 text-white shadow-pop ring-1 ring-white/10',
                    graphite,
                    hoverX > 60 ? '-translate-x-[calc(100%+10px)]' : 'translate-x-2.5',
                  )}
                >
                  <p className="font-mono text-[10.5px] text-white/55 tabular-nums">{axisStamp(hoverPoint.time)}</p>
                  <ul className="mt-1.5 space-y-1">
                    {visibleSeries.map((series) => (
                      <li key={series.key} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 text-white/70">
                          <span aria-hidden="true" style={{ background: series.color }} className="size-2 rounded-full" />
                          {translate(series.labelKey)}
                        </span>
                        <span className="font-mono font-semibold tabular-nums">{formatMoney(hoverPoint.values[series.key], data.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div aria-hidden="true" className="relative mt-2 h-4 font-mono text-[10px] text-fg-subtle tabular-nums">
            {chartWindow.ticks.map((tick, index) => {
              const isFirst = index === 0;
              const isLast = index === chartWindow.ticks.length - 1;
              return (
                <span
                  key={tick}
                  style={{ left: `${toX(tick)}%` }}
                  className={cx(
                    'absolute whitespace-nowrap',
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
        </div>
      </div>
    </section>
  );
}

/* ───────────── Copier health / risk ───────────── */

function CopierHealth({ data }: { data: MasterDashboard }) {
  const { active, paused, stopped, newInWindow, churned, avgAgeDays, retentionPercent } = data.copiers;
  const total = active + paused + stopped;
  const segments = [
    { labelKey: 'masterDash.active' as const, count: active, color: '#34d399', dot: 'bg-emerald-400' },
    { labelKey: 'masterDash.paused' as const, count: paused, color: '#fbbf24', dot: 'bg-amber-400' },
    { labelKey: 'masterDash.stopped' as const, count: stopped, color: '#f87171', dot: 'bg-red-400' },
  ];
  const segmentStarts = segments.map((_, index) => segments.slice(0, index).reduce((sum, segment) => sum + segment.count, 0) / (total || 1));
  const footer = [
    { labelKey: 'masterDash.newWindow' as const, value: String(newInWindow) },
    { labelKey: 'masterDash.churned' as const, value: String(churned) },
    { labelKey: 'masterDash.avgAge' as const, value: `${avgAgeDays}d` },
  ];

  return (
    <section style={riseDelay(2)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="user" title={translate('masterDash.copierHealth')} />
      <div className="mt-4 flex items-center gap-5">
        <span className="relative grid size-28 shrink-0 place-items-center">
          {total === 0 ? (
            <span aria-hidden="true" className="absolute inset-1 animate-orbit rounded-full border-[6px] border-dashed border-line [animation-duration:30s] motion-reduce:animate-none" />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              {segments.map((segment, index) => (
                <circle
                  key={segment.labelKey}
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="9"
                  pathLength={1}
                  strokeDasharray={`${segment.count / total} 1`}
                  strokeDashoffset={-segmentStarts[index]}
                  stroke={segment.color}
                />
              ))}
            </svg>
          )}
          <span className="relative px-3 text-center">
            {total === 0 ? (
              <span className="block text-[11px] leading-tight font-medium text-fg-muted">{translate('masterDash.noCopiers')}</span>
            ) : (
              <span className="block font-mono text-2xl font-semibold text-fg tabular-nums">{total}</span>
            )}
          </span>
        </span>
        <ul className="min-w-0 flex-1 space-y-2">
          {segments.map((segment) => (
            <li key={segment.labelKey} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2 ring-1 ring-line">
              <span className="flex items-center gap-2 text-sm text-fg-muted">
                <span aria-hidden="true" className={cx('size-2.5 rounded-full', segment.dot)} />
                {translate(segment.labelKey)}
              </span>
              <span className="font-mono text-sm font-semibold text-fg tabular-nums">{segment.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-dashed border-line pt-4 sm:grid-cols-4">
        {footer.map((item) => (
          <div key={item.labelKey} className="min-w-0">
            <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate(item.labelKey)}</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate('masterDash.retention')}</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-emerald-500 tabular-nums">{retentionPercent}%</dd>
          <dd aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
            <span style={{ width: `${retentionPercent}%` }} className="block h-full origin-left animate-grow rounded-full bg-emerald-500 motion-reduce:animate-none" />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function RiskAlerts({ data }: { data: MasterDashboard }) {
  return (
    <section style={riseDelay(3)} className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <CardHead icon="alert" title={translate('masterDash.riskAlerts')} />
      {data.riskAlerts.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/30">
          <span className="relative grid size-9 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-emerald-500 motion-reduce:hidden" />
            <span className="grid size-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Icon name="checkCircle" size={16} />
            </span>
          </span>
          <p className="text-sm font-medium text-emerald-500">{translate('masterDash.healthy')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.riskAlerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-fg ring-1 ring-amber-500/30">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-amber-500" />
              {alert.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───────────── Plans / payouts / trades ───────────── */

function PlanPerformance({ data }: { data: MasterDashboard }) {
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={riseDelay(4)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="trendUp" title={translate('masterDash.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <EmptyNote icon="trendUp" className="flex-1">
          {translate('masterDash.noPlans')}
        </EmptyNote>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.plans.map((plan) => (
            <li key={plan.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-fg">{plan.name}</span>
                <span className={cx('font-mono font-semibold tabular-nums', plan.roiPercent >= 0 ? 'text-emerald-500' : 'text-red-500')}>{signedPercent(plan.roiPercent)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span style={{ width: `${(Math.abs(plan.roiPercent) / topRoi) * 100}%` }} className={cx('block h-full origin-left animate-grow rounded-full motion-reduce:animate-none', goldFill)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Payouts({ data }: { data: MasterDashboard }) {
  const { earned, pending, upcoming, recent } = data.payouts;
  const payoutRow = (payout: { id: string; amount: number; date: string }) => (
    <li key={payout.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-sm ring-1 ring-line">
      <span className="text-fg-muted">{rangeFormatter.format(parseLocal(payout.date))}</span>
      <span className="font-mono font-semibold text-fg tabular-nums">{formatMoney(payout.amount, data.currency)}</span>
    </li>
  );

  return (
    <section style={riseDelay(5)} className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <CardHead icon="crypto" title={translate('masterDash.payouts')} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className={cx('relative isolate overflow-hidden rounded-2xl p-3.5 text-white ring-1 ring-white/10', graphite)}>
          <span aria-hidden="true" className="absolute inset-0 -z-10 animate-wallet-shine bg-linear-to-r from-transparent via-white/[0.07] to-transparent motion-reduce:hidden" />
          <p className={cx(eyebrow, 'text-white/45')}>{translate('masterDash.earnedWindow')}</p>
          <p className={cx('mt-1 font-mono text-lg font-semibold tabular-nums', goldText)}>{formatMoney(earned, data.currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface-2/60 p-3.5 ring-1 ring-line">
          <p className={cx(eyebrow, 'flex items-center gap-1.5 text-fg-subtle')}>
            <Icon name="clock" size={11} />
            {translate('masterDash.pending')}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-fg tabular-nums">{formatMoney(pending, data.currency)}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('masterDash.upcoming')}</p>
        {upcoming.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-fg-muted">{translate('masterDash.noUpcoming')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">{upcoming.map(payoutRow)}</ul>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('masterDash.recent')}</p>
          <ViewAllButton hasItems={recent.length > 0} withChevron />
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-fg-muted">{translate('masterDash.noPayouts')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">{recent.map(payoutRow)}</ul>
        )}
      </div>
    </section>
  );
}

function RecentTrades({ data }: { data: MasterDashboard }) {
  const cycle = { '--cycle': `${data.autoRefreshSeconds}s` } as CSSProperties;
  return (
    <section style={riseDelay(6)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead
        icon="bolt"
        title={translate('masterDash.recentTrades')}
        aside={
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 py-1 pr-3 pl-1 text-xs font-semibold text-primary ring-1 ring-primary/25">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 -rotate-90">
              <circle cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" className="stroke-primary/20" />
              <circle
                cx="10"
                cy="10"
                r="7"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                style={cycle}
                className="stroke-primary [animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
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
        <ul className="mt-4 divide-y divide-line">
          {data.trades.map((trade) => (
            <li key={trade.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex items-center gap-2.5">
                <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', trade.side === 'buy' ? 'bg-emerald-500/12 text-emerald-500' : 'bg-red-500/12 text-red-500')}>{trade.side}</span>
                <span className="font-semibold text-fg">{trade.symbol}</span>
                <span className="font-mono text-xs text-fg-subtle tabular-nums">{trade.volume}</span>
              </span>
              <span className={cx('font-mono font-semibold tabular-nums', trade.profit >= 0 ? 'text-emerald-500' : 'text-red-500')}>{formatMoney(trade.profit, data.currency)}</span>
            </li>
          ))}
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
        <Skeleton className="h-64 rounded-[28px]" />
        <Skeleton className="h-96 rounded-[28px]" />
      </div>
    );
  }

  const period = chosenPeriod ?? data.defaultPeriod;
  const chartWindow = buildWindow(data, period);

  return (
    <div className="space-y-5">
      <HeroConsole data={data} period={period} onPeriod={setChosenPeriod} window={chartWindow} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <PerformanceChart data={data} window={chartWindow} period={period} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[minmax(0,1fr)_auto]">
          <CopierHealth data={data} />
          <RiskAlerts data={data} />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <PlanPerformance data={data} />
        <Payouts data={data} />
        <RecentTrades data={data} />
      </div>
    </div>
  );
}
