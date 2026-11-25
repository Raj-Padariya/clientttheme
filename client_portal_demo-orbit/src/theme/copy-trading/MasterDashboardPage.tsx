'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { masterSeriesAt, type MasterDashboard, type MasterPeriod, type MasterSeriesKey } from '@/core/mock/masterDashboard';
import { useMasterDashboard } from '@/core/pages/useMasterDashboard';
import { cx } from '../lib/cx';
import { axisMoney, axisStamp, buildPeriodWindow, niceStep, parseLocal, signedPercent, type PeriodWindow } from '../lib/timeWindow';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const BAR_COUNT = 48;
const ROI_RANGE = 20;
const ROI_MARKS = [-20, -10, 0, 10, 20];
const WAFFLE_CELLS = 50;
const cardClass = 'orbit-card';
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
  { key: 'aum', labelKey: 'masterDash.aum', color: 'var(--orbit-violet)' },
  { key: 'netPl', labelKey: 'masterDash.netPl', color: 'var(--color-success)' },
  { key: 'benchmark', labelKey: 'masterDash.benchmark', color: 'var(--color-warning)', dashed: true },
];

/* ───────────── Helpers ───────────── */

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
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
        <span className="grid size-8 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
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

function PeriodTabs({ value, onChange }: { value: MasterPeriod; onChange: (period: MasterPeriod) => void }) {
  const activeIndex = periods.findIndex((period) => period.id === value);
  return (
    <div role="radiogroup" aria-label={translate('masterDash.range')} className="relative grid w-full grid-cols-6 border-b border-line sm:w-80">
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute -bottom-px left-0 h-0.5 w-1/6 rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
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
              'h-9 text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:text-xs',
              isActive ? 'text-fg' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Performance stage: column chart with curve overlays ───────────── */

function StageStat({ icon, label, value, hint }: { icon: IconName; label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0">
      <p className={cx(eyebrow, 'flex items-center gap-1.5 text-fg-subtle')}>
        <Icon name={icon} size={12} className="text-primary" />
        {label}
      </p>
      <p className="mt-1.5 font-mono text-2xl font-semibold text-fg tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-fg-muted">{hint}</p>
    </div>
  );
}

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

function PerformanceStage({
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
  const plotRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<MasterSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const shownAum = useAnimatedNumber(data.totalAum, 700);

  useEffect(() => {
    if (!isRefreshing) return;
    const timer = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(timer);
  }, [isRefreshing]);

  const span = chartWindow.end - chartWindow.start;
  const points: ChartPoint[] = Array.from({ length: BAR_COUNT }, (_, index) => {
    const time = chartWindow.start + (span * index) / (BAR_COUNT - 1);
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

  const slot = 100 / BAR_COUNT;
  const toY = (value: number) => round2(((high - value) / (high - low)) * 100);
  // Every timestamp maps onto the centre of its column, so labels, bars and curves share one x-scale.
  const toX = (time: number) => round2((((time - chartWindow.start) / span) * (BAR_COUNT - 1) + 0.5) * slot);
  // Columns grow from zero when the range crosses it, otherwise from the floor of the plot.
  const baseY = low < 0 && high > 0 ? toY(0) : 100;
  // The first visible series (Equity by default) is drawn as columns; the rest ride on top as curves.
  const leadSeries = visibleSeries[0];
  const curveSeries = visibleSeries.slice(1);
  const lastIndex = BAR_COUNT - 1;

  function toggle(key: MasterSeriesKey) {
    setHidden((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(0.9999, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.floor(ratio * BAR_COUNT));
  }

  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  const hoverX = hoverPoint === null ? 0 : toX(hoverPoint.time);

  return (
    <section className={cx(cardClass, 'relative isolate min-w-0 animate-rise overflow-hidden motion-reduce:animate-none')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-linear-to-t from-primary/[0.07] to-transparent" />

      {/* Header band: AUM, the two KPIs and the controls in one row. */}
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end lg:divide-x lg:divide-line lg:[&>*]:pl-6 lg:[&>*:first-child]:pl-0">
        <div className="min-w-0">
          <p className={cx(eyebrow, 'flex items-center gap-2 text-fg-subtle')}>
            <span className="grid size-6 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
              <Icon name="wallet" size={12} />
            </span>
            {translate('masterDash.totalAum')}
          </p>
          <p className="orbit-text mt-2 truncate font-mono text-5xl font-semibold tracking-tight tabular-nums">{formatMoney(shownAum, data.currency)}</p>
          <p className="mt-1 text-sm text-fg-muted">{translate('masterDash.totalAumHint')}</p>
        </div>
        <StageStat
          icon="user"
          label={translate('masterDash.activeCopiers')}
          value={String(data.activeCopiers)}
          hint={translate('masterDash.activeCopiersHint', { count: String(data.netNewCopiers) })}
        />
        <StageStat
          icon="crypto"
          label={translate('masterDash.myEarnings')}
          value={formatMoney(data.earnings, data.currency)}
          hint={translate('masterDash.myEarningsHint', {
            amount: formatMoney(data.nextPayout.amount, data.currency),
            date: rangeFormatter.format(parseLocal(data.nextPayout.date)),
          })}
        />
        <div className="flex flex-col gap-3">
          <PeriodTabs value={period} onChange={onPeriod} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted tabular-nums">
              <Icon name="calendar" size={13} className="text-primary" />
              {rangeFormatter.format(chartWindow.start)} → {rangeFormatter.format(chartWindow.end)}
            </span>
            <button
              type="button"
              onClick={() => setIsRefreshing(true)}
              disabled={isRefreshing}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-fg transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
            >
              <Icon name="refresh" size={13} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
              <span aria-live="polite">{translate(isRefreshing ? 'masterDash.refreshing' : 'masterDash.refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-line p-5 sm:p-6">
        <CardHead icon="areaChart" title={translate('masterDash.performance')} />

        {/* Series switchboard: each tile toggles its series and shows its latest value. */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {seriesConfig.map((series) => {
            const isOn = !hidden.includes(series.key);
            const isLead = series === leadSeries;
            return (
              <button
                key={series.key}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(series.key)}
                className={cx(
                  'relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition-[background-color,border-color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                  isOn ? 'border-fg/10 bg-fg/[0.04] hover:border-primary/40' : 'border-dashed border-line opacity-55 hover:opacity-100',
                )}
              >
                <span aria-hidden="true" style={{ background: isOn ? series.color : undefined }} className={cx('absolute inset-x-0 top-0 h-0.5', !isOn && 'bg-line-strong')} />
                <span aria-hidden="true" className="grid h-7 w-5 shrink-0 place-items-end">
                  {isLead ? (
                    <span className="flex h-full items-end gap-0.5">
                      <span style={{ background: series.color }} className="h-2/5 w-1 rounded-t-sm" />
                      <span style={{ background: series.color }} className="h-4/5 w-1 rounded-t-sm" />
                      <span style={{ background: series.color }} className="h-3/5 w-1 rounded-t-sm" />
                    </span>
                  ) : (
                    <span
                      style={{ borderColor: isOn ? series.color : undefined }}
                      className={cx('mb-2 h-3 w-5 rounded-[50%] border-t-2', series.dashed ? 'border-dashed' : 'border-solid', !isOn && 'border-line-strong')}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-fg-muted">{translate(series.labelKey)}</span>
                  <span className="block truncate font-mono text-sm font-semibold text-fg tabular-nums">{formatMoney(points[lastIndex].values[series.key], data.currency)}</span>
                </span>
                <span aria-hidden="true" className={cx('relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-300', isOn ? 'border-primary/40 bg-primary/25' : 'border-line bg-fg/[0.04]')}>
                  <span className={cx('absolute top-0.5 size-3.5 rounded-full transition-[left] duration-300 motion-reduce:transition-none', isOn ? 'left-[18px] bg-primary' : 'left-0.5 bg-fg-subtle')} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex h-80 gap-3 sm:h-[22rem]">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              ref={plotRef}
              role="img"
              aria-label={translate('masterDash.performance')}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
              className="relative flex-1 touch-none border-b border-line-strong"
            >
              {hoverPoint !== null && (
                <span aria-hidden="true" style={{ left: `${(hoverIndex ?? 0) * slot}%`, width: `${slot}%` }} className="pointer-events-none absolute inset-y-0 rounded-lg bg-primary/[0.09]" />
              )}

              {leadSeries && (
                <div key={period} aria-hidden="true" className="pointer-events-none absolute inset-0">
                  {points.map((point, index) => {
                    const valueY = toY(point.values[leadSeries.key]);
                    const isHovered = hoverIndex === index;
                    const isDimmed = hoverIndex !== null && !isHovered;
                    const barStyle: CSSProperties = {
                      left: `${round2(index * slot)}%`,
                      width: `${round2(slot)}%`,
                      top: `${Math.min(valueY, baseY)}%`,
                      height: `${round2(Math.abs(baseY - valueY))}%`,
                      animationDelay: `${index * 14}ms`,
                    };
                    const fillStyle: CSSProperties = isHovered
                      ? { background: leadSeries.color, boxShadow: `0 0 18px -2px ${leadSeries.color}` }
                      : { background: `linear-gradient(to top, color-mix(in oklab, ${leadSeries.color} 12%, transparent), color-mix(in oklab, ${leadSeries.color} 65%, transparent))` };
                    return (
                      <span key={point.time} style={barStyle} className="absolute animate-rise px-[1.5px] motion-reduce:animate-none sm:px-[2.5px]">
                        <span style={fillStyle} className={cx('block size-full rounded-t-[5px] transition-opacity duration-200', isDimmed && 'opacity-35')} />
                      </span>
                    );
                  })}
                </div>
              )}

              {curveSeries.length > 0 && (
                <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                  {[...curveSeries].reverse().map((series) => {
                    const path = smoothPath(points.map((point) => [toX(point.time), toY(point.values[series.key])]));
                    return (
                      <g key={series.key}>
                        <path d={path} fill="none" stroke={series.color} strokeOpacity={0.18} strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        <path
                          d={path}
                          fill="none"
                          stroke={series.color}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeDasharray={series.dashed ? '6 5' : undefined}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Live marker on the newest column. */}
              {leadSeries && hoverPoint === null && (
                <span
                  aria-hidden="true"
                  style={{ left: `${toX(points[lastIndex].time)}%`, top: `${toY(points[lastIndex].values[leadSeries.key])}%` }}
                  className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2"
                >
                  <span style={{ background: leadSeries.color }} className="col-start-1 row-start-1 size-3 animate-ping rounded-full opacity-60 motion-reduce:hidden" />
                  <span style={{ background: leadSeries.color }} className="col-start-1 row-start-1 size-3 rounded-full ring-2 ring-surface" />
                </span>
              )}

              {hoverPoint !== null && (
                <>
                  {curveSeries.map((series) => (
                    <span
                      key={series.key}
                      aria-hidden="true"
                      style={{ left: `${hoverX}%`, top: `${toY(hoverPoint.values[series.key])}%`, background: series.color }}
                      className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] ring-2 ring-surface"
                    />
                  ))}
                  <div
                    style={{ left: `${hoverX}%` }}
                    className={cx(
                      'pointer-events-none absolute top-2 z-10 w-52 rounded-2xl border border-primary/30 bg-surface/90 p-3 text-fg shadow-pop backdrop-blur-xl',
                      hoverX > 60 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5',
                    )}
                  >
                    <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-fg-muted tabular-nums">
                      <Icon name="clock" size={11} className="text-primary" />
                      {axisStamp(hoverPoint.time)}
                    </p>
                    <ul className="mt-2 space-y-1.5 border-t border-line pt-2">
                      {visibleSeries.map((series) => (
                        <li key={series.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 text-fg-muted">
                            <span aria-hidden="true" style={{ background: series.color }} className={cx('size-2', series === leadSeries ? 'rounded-[2px]' : 'rotate-45 rounded-[1px]')} />
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

            <div aria-hidden="true" className="relative mt-2 h-5 font-mono text-[10px] text-fg-subtle tabular-nums">
              {chartWindow.ticks.map((tick, index) => {
                const isFirst = index === 0;
                const isLast = index === chartWindow.ticks.length - 1;
                return (
                  <span
                    key={tick}
                    style={{ left: `${toX(tick)}%` }}
                    className={cx(
                      'absolute rounded-md bg-fg/[0.04] px-1.5 py-0.5 whitespace-nowrap',
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

          {/* Value scale on the right edge, as tagged pills. */}
          <div aria-hidden="true" className="relative mb-7 w-14 shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">
            {yTicks.map((tick) => (
              <span key={tick} style={{ top: `${toY(tick)}%` }} className="absolute left-0 flex -translate-y-1/2 items-center gap-1 leading-none">
                <span className="h-px w-1.5 bg-line-strong" />
                <span className="rounded-md bg-fg/[0.05] px-1.5 py-0.5">{axisMoney(tick)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Instrument strip: ROI · copier health · risk ───────────── */

// Horizontal ROI scale from -20% to +20%: the fill runs from zero to the ROI, the amber pin marks the benchmark.
function RoiInstrument({ roi, benchmark }: { roi: number; benchmark: number }) {
  const toLeft = (value: number) => round2(((Math.max(-ROI_RANGE, Math.min(ROI_RANGE, value)) + ROI_RANGE) / (2 * ROI_RANGE)) * 100);
  const roiLeft = toLeft(roi);
  const benchmarkLeft = toLeft(benchmark);

  return (
    <div className="flex min-w-0 flex-col p-5">
      <CardHead icon="trendUp" title={translate('masterDash.masterRoi')} />
      <p className="orbit-text mt-4 font-mono text-5xl font-semibold tracking-tight tabular-nums">{signedPercent(roi)}</p>

      <div aria-hidden="true" className="relative mt-8 mb-6">
        <div style={{ left: `${benchmarkLeft}%` }} className="absolute -top-6 flex -translate-x-1/2 flex-col items-center transition-[left] duration-700 motion-reduce:transition-none">
          <span className="font-mono text-[10px] font-semibold text-warning tabular-nums">{signedPercent(benchmark)}</span>
          <span className="h-3 w-0.5 rounded-full bg-warning" />
        </div>
        <div className="relative h-3 rounded-full bg-fg/[0.06]">
          <span className="absolute inset-y-[-4px] left-1/2 w-px bg-fg/30" />
          <span
            style={{ left: `${Math.min(roiLeft, 50)}%`, width: `${round2(Math.abs(roiLeft - 50))}%` }}
            className={cx('absolute inset-y-0 rounded-full transition-[left,width] duration-700 motion-reduce:transition-none', roi >= 0 ? 'bg-primary shadow-[0_0_14px_-2px_var(--brand-primary)]' : 'bg-danger')}
          />
          <span
            style={{ left: `${roiLeft}%` }}
            className={cx('absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface transition-[left] duration-700 motion-reduce:transition-none', roi >= 0 ? 'bg-primary' : 'bg-danger')}
          />
        </div>
        {ROI_MARKS.map((mark) => (
          <span key={mark} style={{ left: `${toLeft(mark)}%` }} className="absolute top-5 -translate-x-1/2 font-mono text-[10px] text-fg-subtle tabular-nums">
            {mark > 0 ? '+' : ''}
            {mark}%
          </span>
        ))}
      </div>

      <p className="mt-auto flex items-center gap-1.5 text-xs text-fg-muted">
        <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-warning" />
        {translate('masterDash.masterRoiHint', { value: signedPercent(benchmark) })}
      </p>
    </div>
  );
}

function CopierInstrument({ data }: { data: MasterDashboard }) {
  const { active, paused, stopped, newInWindow, churned, avgAgeDays, retentionPercent } = data.copiers;
  const total = active + paused + stopped;
  const segments = [
    { labelKey: 'masterDash.active' as const, count: active, dot: 'bg-success', cell: 'bg-success/80 shadow-[0_0_8px_-2px_var(--color-success)]' },
    { labelKey: 'masterDash.paused' as const, count: paused, dot: 'bg-warning', cell: 'bg-warning/80' },
    { labelKey: 'masterDash.stopped' as const, count: stopped, dot: 'bg-danger', cell: 'bg-danger/80' },
  ];
  // Each of the 50 cells is 2% of copiers; a cell takes the status whose share covers its midpoint.
  const cells = Array.from({ length: WAFFLE_CELLS }, (_, index) => {
    if (total === 0) return null;
    const position = ((index + 0.5) / WAFFLE_CELLS) * total;
    let reached = 0;
    for (const segment of segments) {
      reached += segment.count;
      if (position < reached) return segment.cell;
    }
    return segments[segments.length - 1].cell;
  });
  const footer = [
    { labelKey: 'masterDash.newWindow' as const, value: String(newInWindow) },
    { labelKey: 'masterDash.churned' as const, value: String(churned) },
    { labelKey: 'masterDash.avgAge' as const, value: `${avgAgeDays}d` },
  ];

  return (
    <div className="flex min-w-0 flex-col p-5">
      <CardHead
        icon="user"
        title={translate('masterDash.copierHealth')}
        aside={
          total === 0 ? (
            <span className="text-xs font-medium text-fg-muted">{translate('masterDash.noCopiers')}</span>
          ) : (
            <span className="font-mono text-2xl font-semibold text-fg tabular-nums">{total}</span>
          )
        }
      />

      <div aria-hidden="true" className="mt-4 grid grid-cols-10 gap-1">
        {cells.map((cell, index) => (
          <span
            key={index}
            style={{ animationDelay: `${index * 14}ms` }}
            className={cx('aspect-square animate-rise rounded-[4px] motion-reduce:animate-none', cell ?? 'border border-dashed border-fg/15 bg-fg/[0.02]')}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {segments.map((segment) => (
          <li key={segment.labelKey} className="inline-flex items-center gap-2 rounded-full border border-fg/[0.08] bg-fg/[0.03] px-2.5 py-1 text-xs text-fg-muted">
            <span aria-hidden="true" className={cx('size-2 rounded-[3px]', segment.dot)} />
            {translate(segment.labelKey)}
            <span className="font-mono font-semibold text-fg tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-dashed border-line pt-3">
        {footer.map((item) => (
          <div key={item.labelKey} className="min-w-0">
            <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate(item.labelKey)}</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate('masterDash.retention')}</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-success tabular-nums">{retentionPercent}%</dd>
          <dd aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-fg/[0.06]">
            <span style={{ width: `${retentionPercent}%` }} className="block h-full origin-left animate-grow rounded-full bg-success motion-reduce:animate-none" />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RiskInstrument({ data }: { data: MasterDashboard }) {
  return (
    <div className="flex min-w-0 flex-col p-5">
      <CardHead icon="alert" title={translate('masterDash.riskAlerts')} />
      {data.riskAlerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
          {/* Radar beacon: rings pulse out from a green core while everything is healthy. */}
          <span className="relative grid size-28 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full border border-success/20" />
            <span aria-hidden="true" className="absolute inset-4 rounded-full border border-success/25" />
            <span aria-hidden="true" className="absolute inset-8 animate-pulse-ring rounded-full border border-success motion-reduce:hidden" />
            <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin rounded-full bg-[conic-gradient(from_0deg,color-mix(in_srgb,var(--color-success)_30%,transparent),transparent_25%)] motion-reduce:hidden" />
            <span className="relative grid size-11 place-items-center rounded-full border border-success/40 bg-success-soft text-success shadow-[0_0_20px_-4px_var(--color-success)]">
              <Icon name="checkCircle" size={18} />
            </span>
          </span>
          <p className="rounded-full border border-success/30 bg-success-soft px-3 py-1 text-sm font-medium text-success">{translate('masterDash.healthy')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.riskAlerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-fg">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-warning" />
              {alert.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InstrumentStrip({ data }: { data: MasterDashboard }) {
  return (
    <section
      style={riseDelay(1)}
      className={cx(cardClass, 'grid min-w-0 animate-rise divide-y divide-line overflow-hidden motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)] lg:divide-x lg:divide-y-0')}
    >
      <RoiInstrument roi={data.roiPercent} benchmark={data.benchmarkPercent} />
      <CopierInstrument data={data} />
      <RiskInstrument data={data} />
    </section>
  );
}

/* ───────────── Payout ticket ───────────── */

function PayoutTrack({
  title,
  items,
  emptyText,
  currency,
  aside,
}: {
  title: string;
  items: { id: string; amount: number; date: string }[];
  emptyText: string;
  currency: string;
  aside?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{title}</p>
        {aside}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ol className="relative mt-3 flex flex-col gap-2 pl-5">
          <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-px bg-linear-to-b from-primary/60 to-primary/10" />
          {items.map((payout) => (
            <li key={payout.id} className="relative flex items-center justify-between gap-2 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm">
              <span aria-hidden="true" className="absolute top-1/2 -left-[19px] size-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-primary" />
              <span className="text-fg-muted tabular-nums">{rangeFormatter.format(parseLocal(payout.date))}</span>
              <span className="font-mono font-semibold text-fg tabular-nums">{formatMoney(payout.amount, currency)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Payouts as a tall ticket: settled amount on the stub, pending under the tear line, then the schedule.
function PayoutTicket({ data }: { data: MasterDashboard }) {
  const { earned, pending, upcoming, recent } = data.payouts;

  return (
    <section style={riseDelay(2)} className={cx(cardClass, 'relative flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
      <div className="relative isolate overflow-hidden rounded-t-[inherit] bg-primary/[0.08] p-5">
        <span aria-hidden="true" className="absolute inset-0 -z-10 animate-sheen bg-linear-to-r from-transparent via-primary/10 to-transparent motion-reduce:hidden" />
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-16 -right-16 -z-10 size-44 animate-orbit-spin motion-reduce:animate-none" />
        <CardHead icon="crypto" title={translate('masterDash.payouts')} />
        <p className={cx(eyebrow, 'mt-5 text-fg-subtle')}>{translate('masterDash.earnedWindow')}</p>
        <p className="orbit-text mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(earned, data.currency)}</p>
      </div>

      <div aria-hidden="true" className="relative flex items-center">
        <span className="-ml-3 size-6 shrink-0 rounded-full bg-app ring-1 ring-line" />
        <span className="flex-1 border-t-2 border-dashed border-line" />
        <span className="-mr-3 size-6 shrink-0 rounded-full bg-app ring-1 ring-line" />
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3">
          <p className={cx(eyebrow, 'flex items-center gap-1.5 text-fg-subtle')}>
            <Icon name="clock" size={11} />
            {translate('masterDash.pending')}
          </p>
          <p className="font-mono text-lg font-semibold text-fg tabular-nums">{formatMoney(pending, data.currency)}</p>
        </div>
        <PayoutTrack title={translate('masterDash.upcoming')} items={upcoming} emptyText={translate('masterDash.noUpcoming')} currency={data.currency} />
        <PayoutTrack
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
    <section style={riseDelay(3)} className={cx(cardClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="trendUp" title={translate('masterDash.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <EmptyNote icon="trendUp" className="flex-1">
          {translate('masterDash.noPlans')}
        </EmptyNote>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {data.plans.map((plan, index) => {
            const isGain = plan.roiPercent >= 0;
            return (
              <li key={plan.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2.5">
                <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{plan.name}</p>
                  <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-fg/[0.06]">
                    <span
                      style={{ width: `${(Math.abs(plan.roiPercent) / topRoi) * 100}%` }}
                      className={cx('block h-full origin-left animate-grow rounded-full motion-reduce:animate-none', isGain ? 'bg-primary' : 'bg-danger')}
                    />
                  </div>
                </div>
                <span className={cx('rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums', isGain ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                  {signedPercent(plan.roiPercent)}
                </span>
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
    <section style={riseDelay(4)} className={cx(cardClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead
        icon="bolt"
        title={translate('masterDash.recentTrades')}
        aside={
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 py-1 pr-3 pl-1 text-xs font-semibold text-primary">
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
        <ul className="mt-4 flex flex-col gap-2">
          {data.trades.map((trade, index) => {
            const isBuy = trade.side === 'buy';
            return (
              <li
                key={trade.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="relative flex animate-feed-in items-center justify-between gap-3 overflow-hidden rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2.5 pr-3 pl-4 text-sm motion-reduce:animate-none"
              >
                <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', isBuy ? 'bg-success' : 'bg-danger')} />
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', isBuy ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{trade.side}</span>
                  <span className="truncate font-semibold text-fg">{trade.symbol}</span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">{trade.volume}</span>
                </span>
                <span className={cx('font-mono font-semibold tabular-nums', trade.profit >= 0 ? 'text-success' : 'text-danger')}>{formatMoney(trade.profit, data.currency)}</span>
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

  return (
    <div className="flex flex-col gap-5">
      <PerformanceStage data={data} period={period} onPeriod={setChosenPeriod} window={chartWindow} />
      <InstrumentStrip data={data} />
      <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <PayoutTicket data={data} />
        <div className="grid gap-5 md:grid-cols-2">
          <PlanLeaderboard data={data} />
          <TradeTape data={data} />
        </div>
      </div>
    </div>
  );
}
