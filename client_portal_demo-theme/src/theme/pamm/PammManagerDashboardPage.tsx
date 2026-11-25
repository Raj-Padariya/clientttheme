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
const WAFFLE_COLUMNS = 10;
const WAFFLE_CELLS = 40;
// Main lines use the top of the plot; Net P&L bars get their own band underneath.
const MAIN_BOTTOM = 66;
const BAND_TOP = 74;
const graphite = 'bg-[#18181b]';
const cardClass = 'rounded-[28px] border border-line bg-surface shadow-card';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
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
  { key: 'aum', labelKey: 'pammMgr.aum', color: '#38bdf8' },
  { key: 'netPl', labelKey: 'pammMgr.netPl', color: '#34d399' },
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
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold text-[#18181b] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
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

/* ───────────── Fund vault + launchpad ───────────── */

function PeriodTabs({ value, onChange }: { value: PammPeriod; onChange: (period: PammPeriod) => void }) {
  const activeIndex = periods.findIndex((period) => period.id === value);
  return (
    <div role="radiogroup" aria-label={translate('pammMgr.range')} className="relative grid w-full max-w-md grid-cols-6 border-b border-line">
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
              'h-10 rounded-t-lg px-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:px-1 sm:text-xs',
              isActive ? 'text-fg' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {period.label}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="pointer-events-none absolute -bottom-px left-0 flex h-0.5 w-1/6 justify-center transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
      >
        <span className={cx('h-full w-3/4 rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />
      </span>
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
      className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-2/70 px-4 text-sm font-semibold text-fg ring-1 ring-line transition-[box-shadow,color] hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
    >
      <Icon name="refresh" size={14} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
      <span aria-live="polite">{translate(isRefreshing ? 'pammMgr.refreshing' : 'pammMgr.refresh')}</span>
    </button>
  );
}

function FundVault({
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
    { icon: 'user', labelKey: 'pammMgr.activeInvestors', value: String(data.activeInvestors) },
    { icon: 'crypto', labelKey: 'pammMgr.commission', value: formatMoney(data.commissionEarned, data.currency) },
    { icon: 'trendUp', labelKey: 'pammMgr.roiWindow', value: signedPercent(data.roiPercent) },
  ];

  return (
    <section className={cx(cardClass, 'relative isolate animate-rise overflow-hidden p-5 sm:p-6 motion-reduce:animate-none')}>
      {/* Vault dial turning slowly behind the balance. */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-32 -z-10 size-80">
        <span className="absolute inset-0 animate-orbit rounded-full border border-dashed border-primary/30 [animation-duration:48s] motion-reduce:animate-none" />
        <span className="absolute inset-10 animate-orbit rounded-full border border-primary/20 [animation-direction:reverse] [animation-duration:26s] motion-reduce:animate-none">
          <span className={cx('absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />
        </span>
        <span className="absolute inset-16 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_16%,transparent),transparent_70%)]" />
      </span>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PeriodTabs value={period} onChange={onPeriod} />
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-subtle tabular-nums">
            <Icon name="calendar" size={13} className="text-primary" />
            {rangeFormatter.format(chartWindow.start)} → {rangeFormatter.format(chartWindow.end)}
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="mt-7">
        <p className={cx(eyebrow, 'flex items-center gap-2 text-fg-subtle')}>
          <span className={cx('grid size-6 place-items-center rounded-lg text-[#18181b]', goldFill)}>
            <Icon name="wallet" size={12} />
          </span>
          {translate('pammMgr.totalAum')}
        </p>
        <p className="mt-2 font-mono text-5xl font-semibold tracking-tight text-fg tabular-nums">{formatMoney(shownAum, data.currency)}</p>
        <p className="mt-1 text-xs text-fg-muted">{translate('pammMgr.noData')}</p>
      </div>

      <dl className="mt-7 grid gap-4 border-t border-line pt-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        {stats.map((stat, index) => (
          <div key={stat.labelKey} style={riseDelay(index + 1)} className="min-w-0 animate-rise sm:px-5 sm:first:pl-0 sm:last:pr-0 motion-reduce:animate-none">
            <dt className={cx(eyebrow, 'flex items-center gap-1.5 truncate text-fg-subtle')}>
              <Icon name={stat.icon} size={12} className="shrink-0 text-primary" />
              {translate(stat.labelKey)}
            </dt>
            <dd className="mt-1 truncate font-mono text-xl font-semibold text-fg tabular-nums">{stat.value}</dd>
            <dd className="text-[11px] text-fg-subtle">{translate('pammMgr.noData')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Launchpad({ approvedPlans }: { approvedPlans: number }) {
  return (
    <section style={riseDelay(1)} className={cx('relative isolate flex animate-rise flex-col overflow-hidden rounded-[28px] p-6 text-white ring-1 ring-white/10 motion-reduce:animate-none', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 -z-10 size-72 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_28%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_bottom,#000,transparent_75%)]" />

      {/* Trail of sparks rising out of the launch disc. */}
      <div aria-hidden="true" className="flex items-end gap-4">
        {/* Everything stays inside this box so nothing reaches the card's rounded corner. */}
        <span className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 rounded-full border border-white/15" />
          <span className="absolute inset-0 animate-orbit [animation-duration:6s] motion-reduce:hidden">
            <span className={cx('absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full shadow-[0_0_8px_var(--brand-primary)]', goldFill)} />
          </span>
          <span className={cx('grid size-12 place-items-center rounded-full text-[#18181b] shadow-[0_10px_24px_-12px_var(--brand-primary)]', goldFill)}>
            <Icon name="plus" size={20} />
          </span>
        </span>
        <span className="mb-2 flex flex-col-reverse gap-1.5">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              style={{ animationDelay: `${index * 180}ms`, opacity: 1 - index * 0.2 }}
              className="size-1.5 animate-pulse rounded-full bg-(--brand-gleam) motion-reduce:animate-none"
            />
          ))}
        </span>
      </div>

      {approvedPlans === 0 && <p className="mt-6 text-lg leading-snug font-semibold text-balance">{translate('pammMgr.noApproved')}</p>}

      <div className="mt-auto pt-6">
        <CreatePlanLink className="w-full" />
      </div>
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

      <div className="mt-5 grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="grid content-start gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-fg-subtle tabular-nums sm:col-span-3 lg:col-span-1">
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
                      <stop offset="0%" style={{ stopColor: '#38bdf8', stopOpacity: 0.24 }} />
                      <stop offset="100%" style={{ stopColor: '#38bdf8', stopOpacity: 0 }} />
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
                        <path d={linePath('aum')} fill="none" stroke="#38bdf8" strokeWidth="1.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
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
                    style={{ left: `${hoverPoint ? hoverX : 100}%`, top: `${toY(readPoint.values[key])}%`, borderColor: key === 'aum' ? '#38bdf8' : 'var(--brand-primary)' }}
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

function InvestorHealth({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { active, pending, inactive, newInWindow, churned, avgAgeDays, retentionPercent } = data.investors;
  const total = active + pending + inactive;
  const groups = [
    { labelKey: 'pammMgr.active' as const, count: active, fill: 'bg-emerald-500' },
    { labelKey: 'pammMgr.pending' as const, count: pending, fill: 'bg-amber-400' },
    { labelKey: 'pammMgr.inactive' as const, count: inactive, fill: 'bg-slate-400' },
  ];
  const activeCells = total ? Math.round((active / total) * WAFFLE_CELLS) : 0;
  const pendingCells = total ? Math.round((pending / total) * WAFFLE_CELLS) : 0;
  const footer = [
    { label: translate('pammMgr.newWindow', { period: periodLabel(period) }), value: String(newInWindow) },
    { label: translate('pammMgr.churned'), value: String(churned) },
    { label: translate('pammMgr.avgAge'), value: `${avgAgeDays}d` },
  ];

  function cellClass(index: number): string {
    if (total === 0) return 'bg-surface-2 ring-1 ring-line animate-pulse motion-reduce:animate-none';
    const fill = index < activeCells ? groups[0].fill : index < activeCells + pendingCells ? groups[1].fill : groups[2].fill;
    // Filled cells pop in along the same diagonal the empty grid ripples on.
    return cx(fill, 'animate-rise transition-transform duration-200 hover:scale-110 motion-reduce:animate-none');
  }

  return (
    <section style={riseDelay(3)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="user" title={translate('pammMgr.investorHealth')} />

      {/* Each cell is a slice of the book; an empty book ripples diagonally. */}
      <div aria-hidden="true" className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${WAFFLE_COLUMNS}, minmax(0, 1fr))` }}>
        {Array.from({ length: WAFFLE_CELLS }, (_, index) => (
          <span
            key={index}
            style={{ animationDelay: `${((index % WAFFLE_COLUMNS) + Math.floor(index / WAFFLE_COLUMNS)) * 90}ms` }}
            className={cx('aspect-square rounded-[5px]', cellClass(index))}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-1.5">
        {groups.map((group) => (
          <li key={group.labelKey} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-fg-muted">
              <span aria-hidden="true" className={cx('size-2.5 rounded-[3px]', group.fill)} />
              {translate(group.labelKey)}
            </span>
            <span className="font-mono font-semibold text-fg tabular-nums">{group.count}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-dashed border-line pt-4 sm:grid-cols-4">
        {footer.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{item.label}</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate('pammMgr.retention')}</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-emerald-500 tabular-nums">{retentionPercent}%</dd>
        </div>
      </dl>
    </section>
  );
}

function PlanPerformance({ data }: { data: PammManagerDashboard }) {
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={riseDelay(4)} className={cx(cardClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none')}>
      <CardHead icon="trendUp" title={translate('pammMgr.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center rounded-2xl border-2 border-dashed border-line px-4 pt-4 pb-5 text-center">
          {/* Ghost plan rows waiting to be filled. */}
          <div aria-hidden="true" className="w-full space-y-2 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
            {[0.82, 0.58, 0.36].map((width, index) => (
              <span key={width} className="flex items-center gap-2">
                <span className="size-5 shrink-0 rounded-md bg-surface-2" />
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

function Payouts({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { earned, pending } = data.payouts;
  return (
    <section style={riseDelay(5)} className={cx(cardClass, 'flex animate-rise flex-col overflow-hidden motion-reduce:animate-none')}>
      <div className="p-5">
        <CardHead icon="crypto" title={translate('pammMgr.payouts')} aside={<ViewAllButton hasItems={earned + pending > 0} />} />
      </div>

      <div className="relative flex-1 px-5 pb-6">
        <span aria-hidden="true" className="pointer-events-none absolute right-5 bottom-4 text-primary/10">
          <Icon name="crypto" size={72} />
        </span>
        <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('pammMgr.earnedWindow', { period: periodLabel(period) })}</p>
        <p className="mt-1 font-mono text-4xl font-semibold text-fg tabular-nums">{formatMoney(earned, data.currency)}</p>
      </div>

      {/* Ticket tear line: notches cut into the card edge with the page background. */}
      <div aria-hidden="true" className="flex items-center">
        <span className="-ml-3 size-6 shrink-0 rounded-full bg-app ring-1 ring-line" />
        <span className="flex-1 border-t-2 border-dashed border-line" />
        <span className="-mr-3 size-6 shrink-0 rounded-full bg-app ring-1 ring-line" />
      </div>

      <div className="flex items-center justify-between gap-3 bg-amber-500/[0.06] px-5 py-4">
        <span className={cx(eyebrow, 'flex items-center gap-1.5 text-amber-600')}>
          <Icon name="clock" size={11} />
          {translate('pammMgr.pending')}
        </span>
        <span className="font-mono text-lg font-semibold text-amber-600 tabular-nums">{formatMoney(pending, data.currency)}</span>
      </div>
    </section>
  );
}

/* ───────────── Trades terminal ───────────── */

function RecentTrades({ data }: { data: PammManagerDashboard }) {
  const cycle = { '--cycle': `${data.autoRefreshSeconds}s` } as CSSProperties;
  return (
    <section style={riseDelay(6)} className={cx('animate-rise overflow-hidden rounded-[28px] text-white ring-1 ring-white/10 motion-reduce:animate-none', graphite)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-xl bg-white/[0.07] text-(--brand-gleam) ring-1 ring-white/10">
            <Icon name="bolt" size={15} />
          </span>
          {translate('pammMgr.recentTrades')}
        </h2>
        <span className="font-mono text-[11px] text-white/55">{translate('pammMgr.autoRefresh', { seconds: String(data.autoRefreshSeconds) })}</span>
      </div>

      {/* Refresh fuse: drains across the full width once per cycle. */}
      <svg aria-hidden="true" viewBox="0 0 100 2" preserveAspectRatio="none" className="block h-0.5 w-full">
        <line x1="0" y1="1" x2="100" y2="1" strokeWidth="2" className="stroke-white/10" />
        <line
          x1="0"
          y1="1"
          x2="100"
          y2="1"
          strokeWidth="2"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ ...cycle, stroke: 'var(--brand-gleam)' }}
          className="[animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
        />
      </svg>

      {data.trades.length === 0 ? (
        <p className="px-5 py-7 font-mono text-sm text-white/70">
          <span aria-hidden="true" className="mr-2 text-(--brand-gleam)">&gt;</span>
          {translate('pammMgr.noTrades')}
          <span aria-hidden="true" className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-(--brand-gleam) motion-reduce:animate-none" />
        </p>
      ) : (
        <ul className="divide-y divide-white/10 font-mono">
          {data.trades.map((trade) => (
            <li key={trade.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={cx('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', trade.side === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>{trade.side}</span>
                <span className="font-semibold">{trade.symbol}</span>
                <span className="truncate text-xs text-white/50">{trade.plan}</span>
              </span>
              <span className={cx('font-semibold tabular-nums', trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>{signedMoney(trade.profit, data.currency)}</span>
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
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Skeleton className="h-80 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
        <Skeleton className="h-96 rounded-[28px]" />
      </div>
    );
  }

  const period = chosenPeriod ?? data.defaultPeriod;
  const chartWindow = buildWindow(data, period);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <FundVault data={data} period={period} onPeriod={setChosenPeriod} window={chartWindow} />
        <Launchpad approvedPlans={data.approvedPlans} />
      </div>
      <PerformancePanel data={data} window={chartWindow} period={period} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <InvestorHealth data={data} period={period} />
        <PlanPerformance data={data} />
        <Payouts data={data} period={period} />
      </div>
      <RecentTrades data={data} />
    </div>
  );
}
