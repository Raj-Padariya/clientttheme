'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { masterSeriesAt, type MasterDashboard, type MasterPeriod, type MasterSeriesKey } from '@/core/mock/masterDashboard';
import { useMasterDashboard } from '@/core/pages/useMasterDashboard';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { axisMoney, axisStamp, buildPeriodWindow, niceStep, parseLocal, signedPercent, type PeriodWindow } from '../lib/timeWindow';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const COLUMN_COUNT = 48;
const ROI_RANGE = 20;
const ROI_MARKS = [-20, -10, 0, 10, 20];
const COPIER_BEADS = 50;
const rangeFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

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
  { key: 'aum', labelKey: 'masterDash.aum', color: 'var(--color-fg)' },
  { key: 'netPl', labelKey: 'masterDash.netPl', color: 'var(--color-success)' },
  { key: 'benchmark', labelKey: 'masterDash.benchmark', color: 'var(--color-warning)', dashed: true },
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

function EmptyNote({ icon, children, className }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-4 py-6 text-center', className)}>
      <span className="relative grid size-16 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />
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

function PeriodTabs({ value, onChange }: { value: MasterPeriod; onChange: (period: MasterPeriod) => void }) {
  const activeIndex = periods.findIndex((period) => period.id === value);
  return (
    <div role="radiogroup" aria-label={translate('masterDash.range')} className="relative grid w-full grid-cols-6 rounded-full border border-line bg-surface-2/40 p-1 backdrop-blur-xl sm:w-80">
      {/* Silver pill sliding with a small overshoot. */}
      <span
        aria-hidden="true"
        style={{ width: 'calc((100% - 8px) / 6)', transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute top-1 bottom-1 left-1 rounded-full bg-fg shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1.2)] motion-reduce:transition-none"
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
              'relative h-8 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:text-xs',
              isActive ? 'text-app' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {period.label}
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
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className={captionClass}>{translate('nav.copyTrading')}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.copyMasterDashboard')}</h2>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={cx(chipClass, 'tabular-nums')}>
          <Icon name="calendar" size={13} />
          {rangeFormatter.format(chartWindow.start)} → {rangeFormatter.format(chartWindow.end)}
        </span>
        <button
          type="button"
          onClick={() => setIsRefreshing(true)}
          disabled={isRefreshing}
          className="group/refresh inline-flex h-8 items-center gap-1.5 rounded-full bg-fg px-3.5 text-xs font-bold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-80 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Icon name="refresh" size={13} className={cx('transition-transform duration-500 group-hover/refresh:rotate-180', isRefreshing && 'animate-spin motion-reduce:animate-none')} />
          <span aria-live="polite">{translate(isRefreshing ? 'masterDash.refreshing' : 'masterDash.refresh')}</span>
        </button>
      </div>
    </header>
  );
}

/* ───────────── Frost summary ───────────── */

function SummaryFrost({ data }: { data: MasterDashboard }) {
  const shownAum = useAnimatedNumber(data.totalAum, 700);
  const stats = [
    {
      icon: 'user' as const,
      label: translate('masterDash.activeCopiers'),
      value: String(data.activeCopiers),
      hint: translate('masterDash.activeCopiersHint', { count: String(data.netNewCopiers) }),
    },
    {
      icon: 'crypto' as const,
      label: translate('masterDash.myEarnings'),
      value: formatMoney(data.earnings, data.currency),
      hint: translate('masterDash.myEarningsHint', {
        amount: formatMoney(data.nextPayout.amount, data.currency),
        date: rangeFormatter.format(parseLocal(data.nextPayout.date)),
      }),
    },
  ];

  return (
    <FrostCard className="h-full">
      <div className={cx('flex h-full flex-col justify-between gap-6 sm:p-1', inkClass)}>
        <div>
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name="wallet" size={14} />
            </span>
            {translate('masterDash.totalAum')}
          </p>
          <p className="mt-3 truncate text-4xl font-black tracking-tight tabular-nums sm:text-5xl">{formatMoney(shownAum, data.currency)}</p>
          <p className={cx('mt-1 text-sm', inkMutedClass)}>{translate('masterDash.totalAumHint')}</p>
        </div>

        <dl className="flex flex-col gap-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={staggerStyle(index, 300)}
              className="group/stat flex animate-rise items-center gap-3 rounded-2xl bg-white/50 p-3.5 ring-1 ring-white/80 backdrop-blur-md transition-colors hover:bg-white/70 motion-reduce:animate-none"
            >
              <span aria-hidden="true" className={cx('grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover/stat:-rotate-12', frostChipClass)}>
                <Icon name={stat.icon} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className={cx(inkCaptionClass, 'flex items-center gap-1.5')}>
                  <span aria-hidden="true" className="font-mono">{stepNumber(index)}</span>
                  <span className="truncate">{stat.label}</span>
                </dt>
                <dd className="truncate text-2xl font-black tabular-nums">{stat.value}</dd>
                <dd className={cx('truncate text-[11px]', inkMutedClass)}>{stat.hint}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </FrostCard>
  );
}

/* ───────────── Performance: dot-matrix columns with curve overlays ───────────── */

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

function PerformancePanel({ data, period, onPeriod, chartWindow }: { data: MasterDashboard; period: MasterPeriod; onPeriod: (period: MasterPeriod) => void; chartWindow: PeriodWindow }) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<MasterSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const span = chartWindow.end - chartWindow.start;
  const points: ChartPoint[] = Array.from({ length: COLUMN_COUNT }, (_, index) => {
    const time = chartWindow.start + (span * index) / (COLUMN_COUNT - 1);
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

  const slot = 100 / COLUMN_COUNT;
  const toY = (value: number) => round2(((high - value) / (high - low)) * 100);
  // Every timestamp maps onto the centre of its column, so labels, columns and curves share one x-scale.
  const toX = (time: number) => round2((((time - chartWindow.start) / span) * (COLUMN_COUNT - 1) + 0.5) * slot);
  // Columns grow from zero when the range crosses it, otherwise from the floor of the plot.
  const baseY = low < 0 && high > 0 ? toY(0) : 100;
  // The first visible series (Equity by default) is drawn as dot columns; the rest ride on top as curves.
  const leadSeries = visibleSeries[0];
  const curveSeries = visibleSeries.slice(1);
  const lastIndex = COLUMN_COUNT - 1;

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
    <section style={staggerStyle(1, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6')}>
      <PanelHead icon="areaChart" title={translate('masterDash.performance')} aside={<PeriodTabs value={period} onChange={onPeriod} />} />

      {/* Series switches: each pill toggles its series and shows its latest value. */}
      <div className="mt-5 flex flex-wrap gap-2">
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
                'group/series inline-flex items-center gap-2.5 rounded-full py-1.5 pr-3 pl-1.5 text-left transition-[box-shadow,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isOn ? 'bg-surface ring-1 ring-line-strong' : 'border border-dashed border-line-strong opacity-50 hover:opacity-100',
              )}
            >
              <span aria-hidden="true" className="relative grid size-7 shrink-0 place-items-center rounded-full bg-surface-2/60">
                {isLead && isOn ? (
                  <span className="grid grid-cols-2 gap-0.5">
                    {Array.from({ length: 4 }, (_, index) => (
                      <span key={index} style={{ background: series.color }} className="size-1 rounded-full" />
                    ))}
                  </span>
                ) : (
                  <span
                    style={{ background: isOn ? series.color : undefined }}
                    className={cx('size-3 rounded-full transition-transform duration-300 group-hover/series:scale-125', !isOn && 'bg-line-strong', series.dashed && 'ring-2 ring-surface ring-offset-1')}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-semibold text-fg-muted">{translate(series.labelKey)}</span>
                <span className="block truncate font-mono text-xs font-bold text-fg tabular-nums">{formatMoney(points[lastIndex].values[series.key], data.currency)}</span>
              </span>
              <span aria-hidden="true" className={cx('ml-1 grid size-5 place-items-center rounded-full text-[10px]', isOn ? 'bg-fg text-app' : 'ring-1 ring-line-strong text-transparent')}>
                <Icon name="check" size={11} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex h-80 flex-1 gap-3 sm:min-h-[22rem]">
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={plotRef}
            role="img"
            aria-label={translate('masterDash.performance')}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            className="relative flex-1 touch-none border-b border-dotted border-line-strong"
          >
            {yTicks.map((tick) => (
              <span key={tick} aria-hidden="true" style={{ top: `${toY(tick)}%` }} className="pointer-events-none absolute inset-x-0 border-t border-dotted border-line" />
            ))}

            {hoverPoint !== null && (
              <span aria-hidden="true" style={{ left: `${(hoverIndex ?? 0) * slot}%`, width: `${slot}%` }} className="pointer-events-none absolute inset-y-0 rounded-full bg-fg/[0.06]" />
            )}

            {leadSeries && (
              <div key={`${period}-${leadSeries.key}`} aria-hidden="true" className="pointer-events-none absolute inset-0">
                {points.map((point, index) => {
                  const valueY = toY(point.values[leadSeries.key]);
                  const isAboveBase = valueY <= baseY;
                  const isHovered = hoverIndex === index;
                  const isDimmed = hoverIndex !== null && !isHovered;
                  const columnStyle: CSSProperties = {
                    left: `${round2(index * slot)}%`,
                    width: `${round2(slot)}%`,
                    top: `${Math.min(valueY, baseY)}%`,
                    height: `${round2(Math.abs(baseY - valueY))}%`,
                    animationDelay: `${index * 16}ms`,
                  };
                  // A column of dots anchored on the base line, so every column reads like a dot-matrix stack.
                  const dotStyle: CSSProperties = {
                    backgroundImage: `radial-gradient(circle, ${leadSeries.color} 1.9px, transparent 2.4px)`,
                    backgroundSize: '100% 7px',
                    backgroundPosition: isAboveBase ? 'center bottom' : 'center top',
                  };
                  return (
                    <span key={point.time} style={columnStyle} className="absolute origin-bottom animate-rise motion-reduce:animate-none">
                      <span style={dotStyle} className={cx('block size-full transition-opacity duration-200', isDimmed ? 'opacity-25' : isHovered ? 'opacity-100' : 'opacity-70')} />
                      <span
                        style={{ background: leadSeries.color }}
                        className={cx('absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full ring-2 ring-surface', isAboveBase ? '-top-1' : '-bottom-1', isDimmed && 'opacity-30')}
                      />
                    </span>
                  );
                })}
              </div>
            )}

            {curveSeries.length > 0 && (
              <svg key={period} aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full animate-fade-quick overflow-visible motion-reduce:animate-none">
                {[...curveSeries].reverse().map((series) => {
                  const path = smoothPath(points.map((point) => [toX(point.time), toY(point.values[series.key])]));
                  return (
                    <path
                      key={series.key}
                      d={path}
                      fill="none"
                      stroke={series.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray={series.dashed ? '6 5' : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
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
                <span className="col-start-1 row-start-1 size-7 animate-ring-ripple rounded-full border border-fg/50 motion-reduce:hidden" />
                <span className="nova-gloss col-start-1 row-start-1 size-3.5 place-self-center rounded-full ring-2 ring-surface" />
              </span>
            )}

            {hoverPoint !== null && (
              <>
                {curveSeries.map((series) => (
                  <span
                    key={series.key}
                    aria-hidden="true"
                    style={{ left: `${hoverX}%`, top: `${toY(hoverPoint.values[series.key])}%`, background: series.color }}
                    className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                  />
                ))}
                <div
                  style={{ left: `${hoverX}%` }}
                  className={cx('pointer-events-none absolute top-2 z-10 w-52 animate-fade-quick rounded-2xl p-3 motion-reduce:animate-none', frostChipClass, hoverX > 60 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5')}
                >
                  <p className={cx('flex items-center gap-1.5 font-mono text-[10.5px] tabular-nums', inkMutedClass)}>
                    <Icon name="clock" size={11} />
                    {axisStamp(hoverPoint.time)}
                  </p>
                  <ul className="mt-2 space-y-1.5 border-t border-dotted border-[#0a1220]/25 pt-2">
                    {visibleSeries.map((series) => (
                      <li key={series.key} className="flex items-center justify-between gap-2 text-xs">
                        <span className={cx('flex items-center gap-1.5', inkMutedClass)}>
                          <span aria-hidden="true" style={{ background: series.color }} className="size-2 rounded-full ring-1 ring-[#0a1220]/20" />
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

          <div aria-hidden="true" className="relative mt-2 h-5 font-mono text-[10px] text-fg-subtle tabular-nums">
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
        </div>

        {/* Value scale on the right edge. */}
        <div aria-hidden="true" className="relative mb-7 w-14 shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">
          {yTicks.map((tick) => (
            <span key={tick} style={{ top: `${toY(tick)}%` }} className="absolute left-0 flex -translate-y-1/2 items-center gap-1.5 leading-none">
              <span className="size-1 rounded-full bg-line-strong" />
              {axisMoney(tick)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Instruments: ROI · copier health · risk ───────────── */

const GAUGE = { cx: 100, cy: 104, radius: 78 };

function gaugePoint(value: number, radius = GAUGE.radius) {
  const clamped = Math.max(-ROI_RANGE, Math.min(ROI_RANGE, value));
  const angle = Math.PI - ((clamped + ROI_RANGE) / (2 * ROI_RANGE)) * Math.PI;
  return { x: round2(GAUGE.cx + Math.cos(angle) * radius), y: round2(GAUGE.cy - Math.sin(angle) * radius) };
}

// Half-ring gauge from -20% to +20%: the arc fills from zero to the ROI, the needle swings in, the amber tick marks the benchmark.
function RoiGauge({ roi, benchmark }: { roi: number; benchmark: number }) {
  const isMounted = useMounted();
  const top = gaugePoint(0);
  const end = gaugePoint(roi);
  const fillPath = `M${top.x},${top.y} A${GAUGE.radius},${GAUGE.radius} 0 0 ${roi >= 0 ? 1 : 0} ${end.x},${end.y}`;
  const needleDeg = round2((Math.max(-ROI_RANGE, Math.min(ROI_RANGE, roi)) / ROI_RANGE) * 90);
  const benchInner = gaugePoint(benchmark, GAUGE.radius - 13);
  const benchOuter = gaugePoint(benchmark, GAUGE.radius + 13);
  const benchLabel = gaugePoint(benchmark, GAUGE.radius + 24);

  return (
    <section style={staggerStyle(2, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <PanelHead icon="trendUp" title={translate('masterDash.masterRoi')} />
      <div className="relative mt-4">
        <svg aria-hidden="true" viewBox="0 0 200 124" className="w-full overflow-visible">
          <path d={`M${GAUGE.cx - GAUGE.radius},${GAUGE.cy} A${GAUGE.radius},${GAUGE.radius} 0 0 1 ${GAUGE.cx + GAUGE.radius},${GAUGE.cy}`} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-line" />
          <path
            d={`M${GAUGE.cx - GAUGE.radius + 16},${GAUGE.cy} A${GAUGE.radius - 16},${GAUGE.radius - 16} 0 0 1 ${GAUGE.cx + GAUGE.radius - 16},${GAUGE.cy}`}
            fill="none"
            strokeWidth="1"
            strokeDasharray="1 5"
            strokeLinecap="round"
            className="stroke-fg-subtle"
          />
          <path
            d={fillPath}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            style={{ strokeDashoffset: isMounted ? 0 : 1, transition: 'stroke-dashoffset 1200ms cubic-bezier(.2,.8,.2,1) 300ms' }}
            className={roi >= 0 ? 'stroke-primary' : 'stroke-danger'}
          />
          <line x1={benchInner.x} y1={benchInner.y} x2={benchOuter.x} y2={benchOuter.y} strokeWidth="2.5" strokeLinecap="round" className="stroke-warning" />
          <text x={benchLabel.x} y={benchLabel.y} textAnchor="middle" dominantBaseline="middle" className="fill-warning font-mono text-[9px] font-bold">
            {signedPercent(benchmark)}
          </text>
          {ROI_MARKS.map((mark) => {
            const point = gaugePoint(mark, GAUGE.radius - 28);
            return (
              <text key={mark} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" className="fill-fg-subtle font-mono text-[8.5px]">
                {mark > 0 ? '+' : ''}
                {mark}%
              </text>
            );
          })}
          <g style={{ transform: `rotate(${isMounted ? needleDeg : -90}deg)`, transformOrigin: `${GAUGE.cx}px ${GAUGE.cy}px`, transition: 'transform 1400ms cubic-bezier(.2,.9,.3,1.25) 300ms' }}>
            <line x1={GAUGE.cx} y1={GAUGE.cy} x2={GAUGE.cx} y2={GAUGE.cy - GAUGE.radius + 8} strokeWidth="2.5" strokeLinecap="round" className="stroke-fg" />
          </g>
          <circle cx={GAUGE.cx} cy={GAUGE.cy} r="7" className="fill-fg" />
          <circle cx={GAUGE.cx} cy={GAUGE.cy} r="3" className="fill-app" />
        </svg>
      </div>
      <p className="mt-3 text-center font-mono text-4xl font-black tracking-tight text-fg tabular-nums">{signedPercent(roi)}</p>
      <p className="mt-auto flex items-center justify-center gap-1.5 pt-3 text-xs text-fg-muted">
        <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-warning" />
        {translate('masterDash.masterRoiHint', { value: signedPercent(benchmark) })}
      </p>
    </section>
  );
}

type CopierStatus = 'active' | 'paused' | 'stopped';

const statusFill: Record<CopierStatus, string> = { active: 'fill-success', paused: 'fill-warning', stopped: 'fill-danger' };

function CopierHealth({ data }: { data: MasterDashboard }) {
  const { active, paused, stopped, newInWindow, churned, avgAgeDays, retentionPercent } = data.copiers;
  const total = active + paused + stopped;
  const segments: { status: CopierStatus; labelKey: MessageKey; count: number; dot: string }[] = [
    { status: 'active', labelKey: 'masterDash.active', count: active, dot: 'bg-success' },
    { status: 'paused', labelKey: 'masterDash.paused', count: paused, dot: 'bg-warning' },
    { status: 'stopped', labelKey: 'masterDash.stopped', count: stopped, dot: 'bg-danger' },
  ];
  // Each of the 50 beads is 2% of copiers; a bead takes the status whose share covers its midpoint.
  const beads = Array.from({ length: COPIER_BEADS }, (_, index): CopierStatus | null => {
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
    <section style={staggerStyle(3, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <PanelHead icon="user" title={translate('masterDash.copierHealth')} />

      {/* Bead ring: 50 beads around a core, coloured by copier status. */}
      <div className="relative mx-auto mt-4 grid size-44 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong [animation-duration:24s] motion-reduce:animate-none" />
        <svg aria-hidden="true" viewBox="0 0 160 160" className="absolute inset-0 size-full">
          {beads.map((status, index) => {
            const angle = (index / COPIER_BEADS) * Math.PI * 2 - Math.PI / 2;
            const x = round2(80 + Math.cos(angle) * 66);
            const y = round2(80 + Math.sin(angle) * 66);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={status ? 3.6 : 2.6}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${index * 18}ms` }}
                className={cx('animate-dot-pop motion-reduce:animate-none', status ? statusFill[status] : 'fill-none stroke-line-strong')}
              />
            );
          })}
        </svg>
        <div className={cx(beadClass, 'size-24 flex-col gap-0.5 text-center')}>
          {total === 0 ? (
            <span className="px-3 text-[11px] leading-tight font-semibold text-fg-muted">{translate('masterDash.noCopiers')}</span>
          ) : (
            <span className="font-mono text-3xl font-black tabular-nums">{total}</span>
          )}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {segments.map((segment) => (
          <li key={segment.labelKey} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs text-fg-muted ring-1 ring-line">
            <span aria-hidden="true" className={cx('size-2 rounded-full', segment.dot)} />
            {translate(segment.labelKey)}
            <span className="font-mono font-bold text-fg tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 flex flex-col gap-2 border-t border-dotted border-line-strong pt-4 text-sm">
        {footer.map((item, index) => (
          <div key={item.labelKey} className="flex items-center gap-3">
            <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</span>
            <dt className="truncate text-fg-muted">{translate(item.labelKey)}</dt>
            <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
            <dd className="font-mono font-bold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">04</span>
          <dt className="truncate text-fg-muted">{translate('masterDash.retention')}</dt>
          <dd aria-hidden="true" className="relative h-1 flex-1 rounded-full bg-line">
            <span style={{ width: `${retentionPercent}%` }} className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-success motion-reduce:animate-none" />
          </dd>
          <dd className="font-mono font-bold text-success tabular-nums">{retentionPercent}%</dd>
        </div>
      </dl>
    </section>
  );
}

function RiskWatch({ data }: { data: MasterDashboard }) {
  return (
    <section style={staggerStyle(4, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <PanelHead icon="alert" title={translate('masterDash.riskAlerts')} />
      {data.riskAlerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
          {/* Sonar: dashed rings, a sweeping wedge and a ripple around a green check while everything is healthy. */}
          <span className="relative grid size-36 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-line-strong" />
            <span aria-hidden="true" className="absolute inset-5 rounded-full border border-dashed border-line-strong" />
            <span aria-hidden="true" className="absolute inset-10 animate-ring-ripple rounded-full border border-success/70 motion-reduce:hidden" />
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin overflow-hidden rounded-full motion-reduce:hidden">
              <span className="absolute inset-0 bg-[conic-gradient(from_0deg,rgb(127_166_220/0.3),transparent_22%)]" />
            </span>
            <span className={cx(beadClass, 'relative size-12 text-success ring-2 ring-success/40')}>
              <Icon name="checkCircle" size={20} />
            </span>
          </span>
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-success ring-1 ring-success/40">
            <span aria-hidden="true" className="size-2 animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
            {translate('masterDash.healthy')}
          </p>
        </div>
      ) : (
        <ol className="mt-4 flex flex-col">
          {data.riskAlerts.map((alert, index) => (
            <li key={alert.id} style={staggerStyle(index, 200)} className="flex animate-feed-in items-start gap-3 border-b border-dotted border-line-strong py-3 text-sm text-fg last:border-b-0 motion-reduce:animate-none">
              <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
                <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
                <span className="relative grid size-7 place-items-center rounded-full bg-warning text-app">
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
          <span aria-hidden="true" className="font-mono">{stepNumber(index)}</span>
          {title}
        </p>
        {aside}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-line-strong px-3 py-3 text-center text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ol className="relative mt-3 flex flex-col gap-2 pl-6">
          <span aria-hidden="true" className="absolute top-3 bottom-3 left-[9px] border-l border-dashed border-line-strong" />
          {items.map((payout, payoutIndex) => (
            <li key={payout.id} style={staggerStyle(payoutIndex, 200)} className="relative flex animate-feed-in items-center gap-3 py-1.5 text-sm motion-reduce:animate-none">
              <span aria-hidden="true" className="nova-gloss absolute top-1/2 -left-[22px] size-3 -translate-y-1/2 rounded-full ring-2 ring-surface" />
              <span className="text-fg-muted tabular-nums">{rangeFormatter.format(parseLocal(payout.date))}</span>
              <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
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
    <section style={staggerStyle(5, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 motion-reduce:animate-none')}>
      <PanelHead icon="crypto" title={translate('masterDash.payouts')} />

      <div className="relative overflow-hidden rounded-[22px] bg-fg p-4 text-app">
        <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/20 to-transparent motion-reduce:hidden" />
        <p className="relative text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">{translate('masterDash.earnedWindow')}</p>
        <p className="relative mt-1 truncate font-mono text-3xl font-black tracking-tight tabular-nums">{formatMoney(earned, data.currency)}</p>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
          <Icon name="clock" size={13} className="animate-rim-spin [animation-duration:8s] motion-reduce:animate-none" />
        </span>
        <p className={captionClass}>{translate('masterDash.pending')}</p>
        <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
        <p className="font-mono text-lg font-black text-fg tabular-nums">{formatMoney(pending, data.currency)}</p>
      </div>

      <div className="flex flex-col gap-5 border-t border-dotted border-line-strong pt-5">
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

const PLAN_RING_RADIUS = 15;

function PlanRing({ share, isGain }: { share: number; isGain: boolean }) {
  const isMounted = useMounted();
  const circumference = 2 * Math.PI * PLAN_RING_RADIUS;
  return (
    <svg viewBox="0 0 38 38" aria-hidden="true" className="size-10 shrink-0 -rotate-90">
      <circle cx="19" cy="19" r={PLAN_RING_RADIUS} fill="none" strokeWidth="3" className="stroke-line" />
      <circle
        cx="19"
        cy="19"
        r={PLAN_RING_RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={round2(circumference)}
        style={{ strokeDashoffset: round2(circumference * (1 - (isMounted ? share : 0))), transition: 'stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1) 300ms' }}
        className={isGain ? 'stroke-primary' : 'stroke-danger'}
      />
    </svg>
  );
}

function PlanLeaderboard({ data }: { data: MasterDashboard }) {
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={staggerStyle(6, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <PanelHead icon="trendUp" title={translate('masterDash.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <EmptyNote icon="trendUp" className="flex-1">
          {translate('masterDash.noPlans')}
        </EmptyNote>
      ) : (
        <ol className="mt-3 flex flex-col">
          {data.plans.map((plan, index) => {
            const isGain = plan.roiPercent >= 0;
            return (
              <li key={plan.id} style={staggerStyle(index, 200)} className="flex animate-feed-in items-center gap-3 border-b border-dotted border-line-strong py-3 last:border-b-0 motion-reduce:animate-none">
                <span className="relative grid size-10 shrink-0 place-items-center">
                  <PlanRing share={Math.abs(plan.roiPercent) / topRoi} isGain={isGain} />
                  <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-bold text-fg tabular-nums">{stepNumber(index)}</span>
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{plan.name}</p>
                <span className={cx('rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums ring-1', isGain ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
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
    <section style={staggerStyle(7, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none')}>
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
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                style={cycle}
                className="stroke-fg [animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
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
        <ul className="mt-3 flex flex-col">
          {data.trades.map((trade, index) => {
            const isBuy = trade.side === 'buy';
            return (
              <li
                key={trade.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="flex animate-feed-in items-center gap-3 border-b border-dotted border-line-strong py-3 text-sm last:border-b-0 motion-reduce:animate-none"
              >
                <span aria-hidden="true" className={cx('grid size-8 shrink-0 place-items-center rounded-full ring-1', isBuy ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
                  <Icon name={isBuy ? 'trendUp' : 'trendDown'} size={13} />
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={cx('text-[10px] font-bold uppercase', isBuy ? 'text-success' : 'text-danger')}>{trade.side}</span>
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle chartWindow={chartWindow} />

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <SummaryFrost data={data} />
        <PerformancePanel data={data} period={period} onPeriod={setChosenPeriod} chartWindow={chartWindow} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <RoiGauge roi={data.roiPercent} benchmark={data.benchmarkPercent} />
        <CopierHealth data={data} />
        <RiskWatch data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1fr)]">
        <PayoutLedger data={data} />
        <PlanLeaderboard data={data} />
        <TradeTape data={data} />
      </div>
    </div>
  );
}
