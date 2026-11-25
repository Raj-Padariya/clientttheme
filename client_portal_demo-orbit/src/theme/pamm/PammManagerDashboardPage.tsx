'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { pammSeriesAt, type PammManagerDashboard, type PammPeriod, type PammSeriesKey } from '@/core/mock/pammManager';
import { usePammManager } from '@/core/pages/usePammManager';
import { cx } from '../lib/cx';
import { axisMoney, axisStamp, buildPeriodWindow, niceStep, signedPercent, type PeriodWindow } from '../lib/timeWindow';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const CREATE_PLAN_HREF = '/pamm/become-manager';
const CHART_POINTS = 90;

// Main lines use the top of the plot; Net P&L bars get their own band underneath.
const MAIN_BOTTOM = 66;
const BAND_TOP = 74;
const graphite = 'orbit-card';
const cardClass = 'orbit-card';
const goldFill = '[background-image:var(--brand-gradient)]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const rangeFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const periods: { id: PammPeriod; label: string }[] = [
  { id: 'today', label: translate('pammMgr.today') },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: translate('pammMgr.allTime') },
];

const seriesConfig: { key: PammSeriesKey; labelKey: MessageKey; color: string }[] = [
  { key: 'netEquity', labelKey: 'pammMgr.netEquity', color: 'var(--brand-primary)' },
  { key: 'aum', labelKey: 'pammMgr.aum', color: 'var(--orbit-violet)' },
  { key: 'netPl', labelKey: 'pammMgr.netPl', color: 'var(--color-success)' },
];

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

function periodLabel(period: PammPeriod): string {
  return periods.find((item) => item.id === period)?.label ?? period;
}

function buildWindow(data: PammManagerDashboard, period: PammPeriod): PeriodWindow {
  return buildPeriodWindow(data.windowEnd, period === 'today' ? 1 : data.periodDays[period]);
}

function signedMoney(value: number, currency: string): string {
  return `${value > 0 ? '+' : ''}${formatMoney(value, currency)}`;
}

/* ───────────── Shared bits ───────────── */

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
function ViewAllButton({ hasItems }: { hasItems: boolean }) {
  return (
    <button
      type="button"
      disabled={!hasItems}
      className="group inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {translate('pammMgr.viewAll')}
      <Icon name="arrowRight" size={12} className="transition-transform duration-300 group-enabled:group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </button>
  );
}

function CreatePlanLink({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <Link
      href={CREATE_PLAN_HREF}
      className={cx(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold text-on-primary transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'md' ? 'h-11 px-5 text-sm' : 'h-9 px-4 text-xs',
        goldFill,
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
      <Icon name="plus" size={size === 'md' ? 15 : 13} className="relative transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
      <span className="relative">{translate('pammMgr.createPlan')}</span>
    </Link>
  );
}

/* ───────────── Command deck ───────────── */

function PeriodTabs({ value, onChange }: { value: PammPeriod; onChange: (period: PammPeriod) => void }) {
  const activeIndex = periods.findIndex((period) => period.id === value);
  return (
    <div role="radiogroup" aria-label={translate('pammMgr.range')} className="relative grid w-full max-w-md grid-cols-6 rounded-full border border-fg/10 bg-fg/[0.04] p-1 backdrop-blur-xl">
      {/* Selection pill: one sixth of the inner track wide, slid by whole columns. */}
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/6)] rounded-full border border-primary/40 bg-primary/25 shadow-[0_8px_20px_-12px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
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
              'relative h-8 rounded-full px-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:px-1 sm:text-xs',
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

function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isRefreshing) return;
    const timer = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(timer);
  }, [isRefreshing]);

  return (
    <button
      type="button"
      onClick={() => setIsRefreshing(true)}
      disabled={isRefreshing}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-surface-2/70 px-4 text-sm font-semibold text-fg ring-1 ring-line transition-[box-shadow,color] hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
    >
      <Icon name="refresh" size={14} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
      <span aria-live="polite">{translate(isRefreshing ? 'pammMgr.refreshing' : 'pammMgr.refresh')}</span>
    </button>
  );
}

// Reactor: counter-rotating orbits around the live investor count.
function InvestorReactor({ investors }: { investors: number }) {
  const shownInvestors = useAnimatedNumber(investors, 700);
  return (
    <div className="relative mx-auto size-52 shrink-0">
      <span aria-hidden="true" className="absolute inset-6 rounded-full bg-primary/20 blur-2xl animate-ring-breathe motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
        <span className={cx('absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />
      </span>
      <span aria-hidden="true" className="absolute inset-5 animate-orbit-spin-rev rounded-full border border-dashed border-primary/25 motion-reduce:animate-none">
        <span className="absolute top-1/2 -left-1 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
      </span>
      <span aria-hidden="true" className="absolute inset-10 rounded-full border border-fg/10 bg-surface-2/50 shadow-[inset_0_2px_14px_rgba(0,0,0,0.35)] backdrop-blur-md" />
      <div className="absolute inset-10 flex flex-col items-center justify-center px-3 text-center">
        <Icon name="user" size={15} className="text-primary" />
        <span className="mt-1 font-mono text-3xl font-semibold text-fg tabular-nums">{Math.round(shownInvestors)}</span>
        <span className="text-[9.5px] leading-tight tracking-[0.12em] text-fg-subtle uppercase">{translate('pammMgr.activeInvestors')}</span>
      </div>
    </div>
  );
}

function CommandDeck({
  data,
  period,
  onPeriod,
  window: chartWindow,
}: {
  data: PammManagerDashboard;
  period: PammPeriod;
  onPeriod: (period: PammPeriod) => void;
  window: PeriodWindow;
}) {
  const shownAum = useAnimatedNumber(data.totalAum, 700);
  const stats: { icon: IconName; labelKey: MessageKey; value: string }[] = [
    { icon: 'crypto', labelKey: 'pammMgr.commission', value: formatMoney(data.commissionEarned, data.currency) },
    { icon: 'trendUp', labelKey: 'pammMgr.roiWindow', value: signedPercent(data.roiPercent) },
  ];

  return (
    <section className={cx(cardClass, 'relative isolate animate-rise overflow-hidden p-5 sm:p-7 motion-reduce:animate-none')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_0%_50%,color-mix(in_srgb,var(--brand-primary)_16%,transparent),transparent_65%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_left,#000,transparent_60%)]" />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <PeriodTabs value={period} onChange={onPeriod} />
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-subtle tabular-nums">
            <Icon name="calendar" size={13} className="text-primary" />
            {rangeFormatter.format(chartWindow.start)} → {rangeFormatter.format(chartWindow.end)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton />
          <CreatePlanLink />
        </div>
      </header>

      <div className="mt-7 grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
        <InvestorReactor investors={data.activeInvestors} />

        <div className="min-w-0">
          <p className={cx(eyebrow, 'flex items-center gap-2 text-fg-subtle')}>
            <span className={cx('grid size-6 place-items-center rounded-lg text-on-primary', goldFill)}>
              <Icon name="wallet" size={12} />
            </span>
            {translate('pammMgr.totalAum')}
          </p>
          <p className="mt-2 truncate bg-clip-text font-mono text-5xl font-semibold tracking-tight text-transparent tabular-nums [background-image:linear-gradient(180deg,var(--orbit-ink-top,#ffffff)_0%,var(--orbit-ink-mid,#e4dcff)_55%,var(--brand-primary)_100%)] sm:text-6xl">
            {formatMoney(shownAum, data.currency)}
          </p>
          <p className="mt-1 text-xs text-fg-muted">{translate('pammMgr.noData')}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {stats.map((stat, index) => (
              <div key={stat.labelKey} style={riseDelay(index + 1)} className="flex min-w-0 animate-rise items-center gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-4 motion-reduce:animate-none">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <Icon name={stat.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate(stat.labelKey)}</dt>
                  <dd className="mt-0.5 truncate font-mono text-xl font-semibold text-fg tabular-nums">{stat.value}</dd>
                  <dd className="text-[11px] text-fg-subtle">{translate('pammMgr.noData')}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {data.approvedPlans === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.06] px-4 py-3">
          <span aria-hidden="true" className="relative grid size-9 shrink-0 place-items-center">
            <span className="absolute inset-0 rounded-full border border-primary/30 animate-ring-ripple motion-reduce:animate-none" />
            <span className={cx('grid size-7 place-items-center rounded-full text-on-primary', goldFill)}>
              <Icon name="plus" size={13} />
            </span>
          </span>
          <p className="text-sm font-semibold text-fg">{translate('pammMgr.noApproved')}</p>
        </div>
      )}
    </section>
  );
}

/* ───────────── Performance (readout rail + plot) ───────────── */

interface ChartPoint {
  time: number;
  values: Record<PammSeriesKey, number>;
}

function PerformancePanel({ data, window: chartWindow, period }: { data: PammManagerDashboard; window: PeriodWindow; period: PammPeriod }) {
  const safeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `pm-clip-${safeId}`;
  const areaId = `pm-area-${safeId}`;
  const plotRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<PammSeriesKey[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const span = chartWindow.end - chartWindow.start;
  const points: ChartPoint[] = Array.from({ length: CHART_POINTS }, (_, index) => {
    const time = chartWindow.start + (span * index) / (CHART_POINTS - 1);
    return { time, values: pammSeriesAt(time) };
  });
  const isOn = (key: PammSeriesKey) => !hidden.includes(key);
  const lineKeys = (['aum', 'netEquity'] as const).filter(isOn);
  const showBars = isOn('netPl');
  const hasAnything = lineKeys.length > 0 || showBars;

  const lineValues = lineKeys.flatMap((key) => points.map((point) => point.values[key]));
  const rawLow = lineValues.length ? Math.min(...lineValues) : 0;
  const rawHigh = lineValues.length ? Math.max(...lineValues) : 1;
  const step = niceStep(Math.max((rawHigh - rawLow) / 4, 1));
  const low = Math.floor(rawLow / step) * step;
  const high = Math.max(Math.ceil(rawHigh / step) * step, low + step);
  const yTicks: number[] = [];
  for (let tick = high; tick >= low - step / 1000; tick -= step) yTicks.push(tick);
  const plMax = Math.max(1, ...points.map((point) => Math.abs(point.values.netPl)));
  const bandMid = (BAND_TOP + 100) / 2;
  const bandHalf = (100 - BAND_TOP) / 2;

  const toX = (time: number) => ((time - chartWindow.start) / span) * 100;
  const toY = (value: number) => ((high - value) / (high - low)) * MAIN_BOTTOM;
  const toBarY = (value: number) => bandMid - (value / plMax) * bandHalf;
  const linePath = (key: PammSeriesKey) => points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.time)},${toY(point.values[key])}`).join(' ');
  const barWidth = (100 / CHART_POINTS) * 0.62;

  function toggle(key: PammSeriesKey) {
    setHidden((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (CHART_POINTS - 1)));
  }

  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  // The rail reads the hovered moment, or the latest point when the pointer is away.
  const readPoint = hoverPoint ?? points[points.length - 1];
  const hoverX = hoverPoint ? toX(hoverPoint.time) : 0;

  return (
    <section style={riseDelay(2)} className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <CardHead icon="areaChart" title={translate('pammMgr.performance')} />

      {/* Readouts sit in a row above the plot so the chart gets the card's full width. */}
      <div className="mt-5 flex flex-col gap-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-fg-subtle tabular-nums sm:col-span-3">
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', hoverPoint ? 'bg-primary' : 'animate-pulse bg-emerald-500 motion-reduce:animate-none')} />
            {axisStamp(readPoint.time)}
          </p>
          {seriesConfig.map((series) => {
            const on = isOn(series.key);
            const isPl = series.key === 'netPl';
            const value = readPoint.values[series.key];
            return (
              <button
                key={series.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(series.key)}
                className={cx(
                  'rounded-2xl px-4 py-3 text-left ring-1 transition-[background-color,opacity,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  on ? 'bg-surface-2/70 ring-line-strong hover:ring-primary/40' : 'opacity-55 ring-line hover:opacity-90',
                )}
              >
                <span className="flex items-center justify-between gap-2 text-xs font-semibold text-fg-muted">
                  {translate(series.labelKey)}
                  <span
                    aria-hidden="true"
                    style={{ background: on ? series.color : undefined }}
                    className={cx(isPl ? 'h-3 w-1.5 rounded-sm' : 'h-1 w-4 rounded-full', !on && 'bg-line-strong')}
                  />
                </span>
                <span
                  className={cx(
                    'mt-1 block truncate font-mono text-lg font-semibold tabular-nums',
                    !on ? 'text-fg-subtle' : isPl ? (value >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-fg',
                  )}
                >
                  {!on ? '—' : isPl ? signedMoney(value, data.currency) : formatMoney(value, data.currency)}
                </span>
              </button>
            );
          })}
        </div>

        {!hasAnything ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line px-4 text-center lg:h-80">
            <span className="relative grid size-16 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border-2 border-dashed border-primary/40 [animation-duration:16s] motion-reduce:animate-none" />
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon name="areaChart" size={17} />
              </span>
            </span>
            <p className="mt-3 text-sm font-semibold text-fg">{translate('pammMgr.noActivity')}</p>
            <p className="mt-1 text-sm text-fg-muted">{translate('pammMgr.noActivityHint')}</p>
          </div>
        ) : (
          <div className="flex min-w-0 gap-3">
            <div aria-hidden="true" className="relative mb-6 h-72 w-12 shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums lg:h-80">
              {lineKeys.length > 0 &&
                yTicks.map((tick) => (
                  <span key={tick} style={{ top: `${toY(tick)}%` }} className="absolute right-0 -translate-y-1/2 leading-none">
                    {axisMoney(tick)}
                  </span>
                ))}
              {showBars && (
                <>
                  <span style={{ top: `${BAND_TOP}%` }} className="absolute right-0 leading-none">
                    {axisMoney(plMax)}
                  </span>
                  <span style={{ top: `${bandMid}%` }} className="absolute right-0 -translate-y-1/2 leading-none">
                    $0
                  </span>
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div
                ref={plotRef}
                role="img"
                aria-label={translate('pammMgr.performance')}
                onPointerMove={handlePointerMove}
                onPointerLeave={() => setHoverIndex(null)}
                className="relative h-72 touch-none lg:h-80"
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                  <defs>
                    <clipPath id={clipId}>
                      <rect key={period} x="0" y="-5" width="100" height="110" className="origin-left animate-grow [transform-box:fill-box] motion-reduce:animate-none" />
                    </clipPath>
                    <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: 'var(--orbit-violet)', stopOpacity: 0.24 }} />
                      <stop offset="100%" style={{ stopColor: 'var(--orbit-violet)', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>

                  {lineKeys.length > 0 &&
                    yTicks.map((tick) => (
                      <line key={tick} x1="0" x2="100" y1={toY(tick)} y2={toY(tick)} vectorEffect="non-scaling-stroke" className="stroke-line" strokeWidth="1" />
                    ))}
                  {chartWindow.ticks.map((tick) => (
                    <line key={tick} y1="0" y2="100" x1={toX(tick)} x2={toX(tick)} vectorEffect="non-scaling-stroke" className="stroke-line/60" strokeWidth="1" strokeDasharray="2 4" />
                  ))}
                  {showBars && (
                    <>
                      <rect x="0" y={BAND_TOP - 2} width="100" height={102 - BAND_TOP} className="fill-surface-2/50" />
                      <line x1="0" x2="100" y1={bandMid} y2={bandMid} vectorEffect="non-scaling-stroke" className="stroke-line-strong" strokeWidth="1" />
                    </>
                  )}

                  <g clipPath={`url(#${clipId})`}>
                    {isOn('aum') && (
                      <>
                        <path d={`${linePath('aum')} L100,${MAIN_BOTTOM} L0,${MAIN_BOTTOM} Z`} fill={`url(#${areaId})`} />
                        <path d={linePath('aum')} fill="none" stroke="var(--orbit-violet)" strokeWidth="1.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      </>
                    )}
                    {isOn('netEquity') && (
                      <path d={linePath('netEquity')} fill="none" stroke="var(--brand-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    )}
                    {showBars &&
                      points.map((point, index) => {
                        const value = point.values.netPl;
                        return (
                          <rect
                            key={point.time}
                            x={toX(point.time) - barWidth / 2}
                            y={Math.min(toBarY(value), bandMid)}
                            width={barWidth}
                            height={Math.max(0.4, Math.abs(toBarY(value) - bandMid))}
                            className={cx(value >= 0 ? 'fill-emerald-400' : 'fill-red-400', hoverIndex !== null && hoverIndex !== index && 'opacity-40')}
                          />
                        );
                      })}
                  </g>
                </svg>

                {lineKeys.map((key) => (
                  <span
                    key={key}
                    aria-hidden="true"
                    style={{ left: `${hoverPoint ? hoverX : 100}%`, top: `${toY(readPoint.values[key])}%`, borderColor: key === 'aum' ? 'var(--orbit-violet)' : 'var(--brand-primary)' }}
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface"
                  />
                ))}
                {hoverPoint && <span aria-hidden="true" style={{ left: `${hoverX}%` }} className="pointer-events-none absolute inset-y-0 w-px bg-primary/60" />}
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
                        !isFirst && !isLast && (index === 1 ? 'hidden' : index % 2 === 1 ? 'max-2xl:hidden' : 'max-md:hidden'),
                      )}
                    >
                      {axisStamp(tick)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────── Investors / plans / payouts ───────────── */

const HEALTH_RADIUS = 42;
const HEALTH_CIRCUMFERENCE = 2 * Math.PI * HEALTH_RADIUS;
// Space left between neighbouring arcs so each investor group reads as its own segment.
const HEALTH_GAP = 3;

interface HealthArc {
  labelKey: MessageKey;
  count: number;
  stroke: string;
  offset: number;
  length: number;
}

function InvestorHealth({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { active, pending, inactive, newInWindow, churned, avgAgeDays, retentionPercent } = data.investors;
  const total = active + pending + inactive;
  const groups: { labelKey: MessageKey; count: number; dot: string; stroke: string }[] = [
    { labelKey: 'pammMgr.active', count: active, dot: 'bg-emerald-500', stroke: 'text-emerald-500' },
    { labelKey: 'pammMgr.pending', count: pending, dot: 'bg-amber-400', stroke: 'text-amber-400' },
    { labelKey: 'pammMgr.inactive', count: inactive, dot: 'bg-slate-400', stroke: 'text-slate-400' },
  ];
  // Each arc starts where the previous one ended; empty groups get no arc.
  const arcs = groups
    .filter((group) => group.count > 0)
    .reduce<HealthArc[]>((list, group) => {
      const previous = list.at(-1);
      const offset = previous ? previous.offset + previous.length : 0;
      return [...list, { labelKey: group.labelKey, count: group.count, stroke: group.stroke, offset, length: (HEALTH_CIRCUMFERENCE * group.count) / total }];
    }, []);
  const gap = arcs.length > 1 ? HEALTH_GAP : 0;
  const footer = [
    { label: translate('pammMgr.newWindow', { period: periodLabel(period) }), value: String(newInWindow) },
    { label: translate('pammMgr.churned'), value: String(churned) },
    { label: translate('pammMgr.avgAge'), value: `${avgAgeDays}d` },
  ];

  return (
    <section style={riseDelay(3)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="user" title={translate('pammMgr.investorHealth')} />

      <div className="mt-5 flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
            <circle cx="50" cy="50" r={HEALTH_RADIUS} fill="none" stroke="currentColor" strokeWidth="9" className={cx('text-fg/[0.07]', total === 0 && 'animate-pulse motion-reduce:animate-none')} />
            {arcs.map((arc) => (
              <circle
                key={arc.labelKey}
                cx="50"
                cy="50"
                r={HEALTH_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeDasharray={`${Math.max(arc.length - gap, 0.01)} ${HEALTH_CIRCUMFERENCE}`}
                strokeDashoffset={-arc.offset}
                className={arc.stroke}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-xl font-semibold text-emerald-500 tabular-nums">{retentionPercent}%</span>
            <span className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('pammMgr.retention')}</span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2">
          {groups.map((group) => (
            <li key={group.labelKey} className="flex items-center justify-between gap-3 rounded-xl bg-fg/[0.03] px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 truncate text-fg-muted">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', group.dot)} />
                {translate(group.labelKey)}
              </span>
              <span className="font-mono font-semibold text-fg tabular-nums">{group.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-dashed border-line pt-4">
        {footer.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{item.label}</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Leaderboard: plans ranked by ROI, each with a bar scaled against the best one.
function PlanPerformance({ data }: { data: PammManagerDashboard }) {
  const rankedPlans = [...data.plans].sort((first, second) => second.roiPercent - first.roiPercent);
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={riseDelay(4)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="trendUp" title={translate('pammMgr.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center rounded-2xl border-2 border-dashed border-line px-4 pt-4 pb-5 text-center">
          {/* Ghost leaderboard rows waiting to be filled. */}
          <div aria-hidden="true" className="w-full space-y-2 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
            {[0.82, 0.58, 0.36].map((width, index) => (
              <span key={width} className="flex items-center gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[10px] text-fg-subtle">{index + 1}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span style={{ width: `${width * 100}%`, animationDelay: `${index * 200}ms` }} className="block h-full animate-pulse rounded-full bg-primary/25 motion-reduce:animate-none" />
                </span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-fg">{translate('pammMgr.noPlans')}</p>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">{translate('pammMgr.noPlansHint')}</p>
          <CreatePlanLink size="sm" className="mt-4" />
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {rankedPlans.map((plan, index) => (
            <li key={plan.id} className="flex items-center gap-3 rounded-2xl border border-fg/[0.06] bg-fg/[0.025] px-3 py-2.5">
              <span
                className={cx(
                  'grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold',
                  index === 0 ? cx('text-on-primary shadow-[0_0_14px_-4px_var(--brand-primary)]', goldFill) : 'bg-surface-2 text-fg-muted ring-1 ring-line',
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold text-fg">{plan.name}</span>
                  <span className={cx('font-mono font-semibold tabular-nums', plan.roiPercent >= 0 ? 'text-emerald-500' : 'text-red-500')}>{signedPercent(plan.roiPercent)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span style={{ width: `${(Math.abs(plan.roiPercent) / topRoi) * 100}%` }} className={cx('block h-full origin-left animate-grow rounded-full motion-reduce:animate-none', goldFill)} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Payouts: earned headline over a split bar showing how much is paid versus still pending.
function Payouts({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { earned, pending } = data.payouts;
  const payoutTotal = earned + pending;
  const earnedShare = payoutTotal > 0 ? (earned / payoutTotal) * 100 : 0;
  const pendingShare = payoutTotal > 0 ? 100 - earnedShare : 0;

  return (
    <section style={riseDelay(5)} className={cx(cardClass, 'relative isolate flex animate-rise flex-col overflow-hidden p-5 motion-reduce:animate-none')}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-6 -z-10 text-primary/[0.07]">
        <Icon name="crypto" size={120} />
      </span>
      <CardHead icon="crypto" title={translate('pammMgr.payouts')} aside={<ViewAllButton hasItems={payoutTotal > 0} />} />

      <p className={cx(eyebrow, 'mt-5 text-fg-subtle')}>{translate('pammMgr.earnedWindow', { period: periodLabel(period) })}</p>
      <p className="mt-1 truncate font-mono text-3xl font-semibold text-fg tabular-nums">{formatMoney(earned, data.currency)}</p>

      <div aria-hidden="true" className="mt-4 flex h-2.5 gap-1 overflow-hidden rounded-full bg-fg/[0.06]">
        {earnedShare > 0 && <span style={{ width: `${earnedShare}%` }} className={cx('h-full rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />}
        {pendingShare > 0 && <span style={{ width: `${pendingShare}%` }} className="h-full rounded-full bg-amber-400/70" />}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
        <span className={cx(eyebrow, 'flex items-center gap-1.5 text-amber-500')}>
          <Icon name="clock" size={11} />
          {translate('pammMgr.pending')}
        </span>
        <span className="font-mono text-lg font-semibold text-amber-500 tabular-nums">{formatMoney(pending, data.currency)}</span>
      </div>
    </section>
  );
}

/* ───────────── Trades terminal ───────────── */

function RecentTrades({ data }: { data: PammManagerDashboard }) {
  const cycle = { '--cycle': `${data.autoRefreshSeconds}s` } as CSSProperties;
  return (
    <section style={riseDelay(6)} className={cx('flex animate-rise flex-col overflow-hidden text-fg motion-reduce:animate-none', graphite)}>
      {/* Terminal window chrome: traffic lights, title and the refresh cadence. */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-fg/[0.03] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-danger/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-success/70" />
          </span>
          <h2 className="flex items-center gap-2 truncate text-sm font-semibold">
            <Icon name="bolt" size={14} className="text-primary" />
            {translate('pammMgr.recentTrades')}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-surface-2/60 px-2.5 py-1 font-mono text-[10.5px] text-fg-muted">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
          {translate('pammMgr.autoRefresh', { seconds: String(data.autoRefreshSeconds) })}
        </span>
      </div>

      {/* Refresh fuse: drains across the full width once per cycle. */}
      <svg aria-hidden="true" viewBox="0 0 100 2" preserveAspectRatio="none" className="block h-0.5 w-full">
        <line x1="0" y1="1" x2="100" y2="1" strokeWidth="2" className="stroke-line" />
        <line
          x1="0"
          y1="1"
          x2="100"
          y2="1"
          strokeWidth="2"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ ...cycle, stroke: 'var(--brand-primary)' }}
          className="[animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
        />
      </svg>

      {data.trades.length === 0 ? (
        <p className="px-5 py-7 font-mono text-sm text-fg-muted">
          <span aria-hidden="true" className="mr-2 text-primary">&gt;</span>
          {translate('pammMgr.noTrades')}
          <span aria-hidden="true" className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-primary motion-reduce:animate-none" />
        </p>
      ) : (
        <ul className="divide-y divide-line font-mono">
          {data.trades.map((trade) => (
            <li key={trade.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={cx('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', trade.side === 'buy' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{trade.side}</span>
                <span className="font-semibold">{trade.symbol}</span>
                <span className="truncate text-xs text-fg-muted">{trade.plan}</span>
              </span>
              <span className={cx('font-semibold tabular-nums', trade.profit >= 0 ? 'text-success' : 'text-danger')}>{signedMoney(trade.profit, data.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───────────── Page ───────────── */

export default function PammManagerDashboardPage() {
  const { data } = usePammManager();
  const [chosenPeriod, setChosenPeriod] = useState<PammPeriod | null>(null);

  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-80 rounded-[28px]" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-96 rounded-[28px]" />
          <Skeleton className="h-96 rounded-[28px]" />
        </div>
      </div>
    );
  }

  const period = chosenPeriod ?? data.defaultPeriod;
  const chartWindow = buildWindow(data, period);

  return (
    <div className="flex flex-col gap-5">
      <CommandDeck data={data} period={period} onPeriod={setChosenPeriod} window={chartWindow} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <PerformancePanel data={data} window={chartWindow} period={period} />
        <div className="grid content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <InvestorHealth data={data} period={period} />
          <Payouts data={data} period={period} />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <PlanPerformance data={data} />
        <RecentTrades data={data} />
      </div>
    </div>
  );
}
