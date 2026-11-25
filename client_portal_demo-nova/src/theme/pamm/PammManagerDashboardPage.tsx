'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { pammSeriesAt, type PammManagerDashboard, type PammPeriod, type PammSeriesKey } from '@/core/mock/pammManager';
import { usePammManager } from '@/core/pages/usePammManager';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { axisMoney, axisStamp, buildPeriodWindow, niceStep, signedPercent, type PeriodWindow } from '../lib/timeWindow';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const CREATE_PLAN_HREF = '/pamm/become-manager';
// One spread column per sample, so fewer and wider-spaced than a line chart would use.
const CHART_POINTS = 42;

// Main lines use the top of the plot; Net P&L bars get their own band underneath.
const MAIN_BOTTOM = 66;
const BAND_TOP = 74;
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const ICE = '#7fa6dc';
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
  { key: 'netEquity', labelKey: 'pammMgr.netEquity', color: 'var(--color-fg)' },
  { key: 'aum', labelKey: 'pammMgr.aum', color: ICE },
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

function PanelHead({ icon, title, aside }: { icon: IconName; title: string; aside?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
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
function ViewAllButton({ hasItems }: { hasItems: boolean }) {
  return (
    <button
      type="button"
      disabled={!hasItems}
      className="group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line transition-colors hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {translate('pammMgr.viewAll')}
      <Icon name="arrowRight" size={12} className="transition-transform duration-300 group-enabled:group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </button>
  );
}

/** Create Plan: a silver pill on the page, or a dark ink pill when it sits on the frosted card. */
function CreatePlanLink({ size = 'md', onFrost = false, className }: { size?: 'sm' | 'md'; onFrost?: boolean; className?: string }) {
  return (
    <Link
      href={CREATE_PLAN_HREF}
      className={cx(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'md' ? 'h-11 px-5 text-sm' : 'h-9 px-4 text-xs',
        onFrost ? 'bg-[#0a1220] text-white' : 'bg-fg text-app',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />
      <Icon name="plus" size={size === 'md' ? 15 : 13} className="relative transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
      <span className="relative">{translate('pammMgr.createPlan')}</span>
    </Link>
  );
}

/* ───────────── Page header ───────────── */

function PeriodTabs({ value, onChange }: { value: PammPeriod; onChange: (period: PammPeriod) => void }) {
  const activeIndex = periods.findIndex((period) => period.id === value);
  return (
    <div role="radiogroup" aria-label={translate('pammMgr.range')} className="relative grid w-full max-w-md grid-cols-6 rounded-full border border-line bg-surface-2/40 p-1 backdrop-blur-xl">
      {/* Silver pill: one sixth of the inner track wide, slid by whole columns. */}
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/6)] rounded-full bg-fg shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1.2)] motion-reduce:transition-none"
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
      className="group inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-fg ring-1 ring-line transition-shadow hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
    >
      <Icon
        name="refresh"
        size={14}
        className={cx('transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none', isRefreshing && 'animate-spin motion-reduce:animate-none')}
      />
      <span aria-live="polite">{translate(isRefreshing ? 'pammMgr.refreshing' : 'pammMgr.refresh')}</span>
    </button>
  );
}

/** Big title and the window dates on the left; range switch, refresh and Create Plan on the right. */
function PageHeader({ period, onPeriod, window: chartWindow }: { period: PammPeriod; onPeriod: (period: PammPeriod) => void; window: PeriodWindow }) {
  return (
    <header className="flex animate-rise flex-col gap-4 motion-reduce:animate-none xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className={captionClass}>{translate('nav.pamm')}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.pammManagerDashboard')}</h2>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg-muted ring-1 ring-line tabular-nums">
          <Icon name="calendar" size={13} className="text-fg" />
          {rangeFormatter.format(chartWindow.start)}
          <span aria-hidden="true" className="w-6 border-t border-dotted border-line-strong" />
          {rangeFormatter.format(chartWindow.end)}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PeriodTabs value={period} onChange={onPeriod} />
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton />
          <CreatePlanLink />
        </div>
      </div>
    </header>
  );
}

/* ───────────── AUM frost card ───────────── */

// Frosted orb with the live investor count: a dashed rim turning one way and a bead circling the other.
function InvestorOrb({ investors }: { investors: number }) {
  const shownInvestors = useAnimatedNumber(investors, 700);
  return (
    <div className="relative grid size-36 shrink-0 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-[#0a1220]/25 motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute inset-3 animate-orbit-spin motion-reduce:animate-none" style={{ animationDuration: '5s' }}>
        <span className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full bg-[#0a1220] ring-2 ring-white" />
      </span>
      <span aria-hidden="true" className="absolute inset-3 rounded-full border border-white/80" />
      <div className={cx('relative grid size-24 place-items-center rounded-full text-center', frostChipClass)}>
        <div>
          <Icon name="user" size={14} className="mx-auto" />
          <span className="block text-3xl leading-tight font-black tabular-nums">{Math.round(shownInvestors)}</span>
          <span className={cx('block px-2 text-[8.5px] leading-tight font-semibold tracking-[0.1em] uppercase', inkMutedClass)}>{translate('pammMgr.activeInvestors')}</span>
        </div>
      </div>
    </div>
  );
}

function AumCard({ data }: { data: PammManagerDashboard }) {
  const shownAum = useAnimatedNumber(data.totalAum, 900);
  const stats: { icon: IconName; labelKey: MessageKey; value: string }[] = [
    { icon: 'crypto', labelKey: 'pammMgr.commission', value: formatMoney(data.commissionEarned, data.currency) },
    { icon: 'trendUp', labelKey: 'pammMgr.roiWindow', value: signedPercent(data.roiPercent) },
  ];

  return (
    <FrostCard className="h-full">
      <div className={cx('flex h-full flex-col justify-between gap-6 sm:p-2', inkClass)}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
                <Icon name="wallet" size={14} />
              </span>
              {translate('pammMgr.totalAum')}
            </p>
            <p className="mt-3 truncate text-5xl font-black tracking-tight tabular-nums sm:text-6xl">{formatMoney(shownAum, data.currency)}</p>
            <p className={cx('mt-1 text-xs', inkMutedClass)}>{translate('pammMgr.noData')}</p>
          </div>
          <InvestorOrb investors={data.activeInvestors} />
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat, index) => (
            <div key={stat.labelKey} style={riseDelay(index + 2)} className="flex min-w-0 animate-rise items-center gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-white/80 backdrop-blur-md motion-reduce:animate-none">
              <span aria-hidden="true" className={cx('grid size-10 shrink-0 place-items-center rounded-full', frostChipClass)}>
                <Icon name={stat.icon} size={16} />
              </span>
              <div className="min-w-0">
                <dt className={cx(inkCaptionClass, 'truncate')}>{translate(stat.labelKey)}</dt>
                <dd className="mt-0.5 truncate text-xl font-black tabular-nums">{stat.value}</dd>
                <dd className={cx('text-[11px]', inkMutedClass)}>{translate('pammMgr.noData')}</dd>
              </div>
            </div>
          ))}
        </dl>

        {data.approvedPlans === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-dashed border-[#0a1220]/25 bg-white/40 py-2 pr-2 pl-4">
            <p className="flex items-center gap-2.5 text-sm font-semibold">
              <span aria-hidden="true" className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#0a1220]/50 motion-reduce:hidden" />
                <span className="relative size-2.5 rounded-full bg-[#0a1220]" />
              </span>
              {translate('pammMgr.noApproved')}
            </p>
            <CreatePlanLink size="sm" onFrost />
          </div>
        )}
      </div>
    </FrostCard>
  );
}

/* ───────────── Investor health (dot matrix) ───────────── */

const MATRIX_COLUMNS = 13;
const RETENTION_MARKS = [25, 50, 75];

function InvestorHealth({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { active, pending, inactive, newInWindow, churned, avgAgeDays, retentionPercent } = data.investors;
  const total = active + pending + inactive;
  const retention = useAnimatedNumber(retentionPercent, 1400);
  const groups: { labelKey: MessageKey; count: number; dot: string }[] = [
    { labelKey: 'pammMgr.active', count: active, dot: 'bg-success' },
    { labelKey: 'pammMgr.pending', count: pending, dot: 'bg-amber-400' },
    { labelKey: 'pammMgr.inactive', count: inactive, dot: 'bg-fg/25' },
  ];
  // One dot per investor, grouped by status; an empty book shows one row of hollow placeholders.
  const dots = groups.flatMap((group) => Array.from({ length: group.count }, () => group.dot));
  const footer = [
    { label: translate('pammMgr.newWindow', { period: periodLabel(period) }), value: String(newInWindow) },
    { label: translate('pammMgr.churned'), value: String(churned) },
    { label: translate('pammMgr.avgAge'), value: `${avgAgeDays}d` },
  ];

  return (
    <section style={riseDelay(2)} className={cx(panelClass, 'flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6')}>
      <PanelHead
        icon="user"
        title={translate('pammMgr.investorHealth')}
        aside={<span className="rounded-full bg-fg px-2.5 py-0.5 text-xs font-bold text-app tabular-nums">{total}</span>}
      />

      {/* Fixed-size dots that wrap, so a wide card doesn't blow them up into big discs. */}
      <div aria-hidden="true" className="flex flex-wrap gap-1.5">
        {total === 0
          ? Array.from({ length: MATRIX_COLUMNS }, (_, index) => (
              <span key={index} style={{ animationDelay: `${index * 120}ms` }} className="size-5 animate-pulse rounded-full ring-1 ring-line-strong motion-reduce:animate-none" />
            ))
          : dots.map((dot, index) => (
              <span key={index} style={{ animationDelay: `${300 + index * 45}ms` }} className={cx('size-5 animate-dot-pop rounded-full motion-reduce:animate-none', dot)} />
            ))}
      </div>

      <ul className="flex flex-col gap-2">
        {groups.map((group) => (
          <li key={group.labelKey} className="flex items-center gap-3 text-sm">
            <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-full', group.dot)} />
            <span className="text-fg-muted">{translate(group.labelKey)}</span>
            <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
            <span className="font-bold text-fg tabular-nums">{group.count}</span>
          </li>
        ))}
      </ul>

      <div>
        <div className="flex items-end justify-between gap-3">
          <p className={captionClass}>{translate('pammMgr.retention')}</p>
          <p className="text-2xl font-black text-success tabular-nums">{Math.round(retention)}%</p>
        </div>
        <div
          role="meter"
          aria-label={translate('pammMgr.retention')}
          aria-valuenow={retentionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative mt-3 h-[3px] rounded-full bg-line"
        >
          <span aria-hidden="true" style={{ width: `${retention}%` }} className="absolute inset-y-0 left-0 rounded-full bg-success" />
          {RETENTION_MARKS.map((mark) => (
            <span key={mark} aria-hidden="true" style={{ left: `${mark}%` }} className="absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-line-strong" />
          ))}
          <span aria-hidden="true" style={{ left: `${retention}%` }} className="absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success/40 motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-success ring-2 ring-surface" />
          </span>
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-dotted border-line-strong pt-4">
        {footer.map((item, index) => (
          <div key={item.label} className="min-w-0">
            <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
            <dt className="truncate text-[11px] text-fg-muted">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-black text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Performance ───────────── */

interface ChartPoint {
  time: number;
  values: Record<PammSeriesKey, number>;
}

// Swatch colours that stay visible on the light frosted tooltip.
const tooltipSwatch: Record<PammSeriesKey, string> = { netEquity: '#0a1220', aum: ICE, netPl: 'var(--color-success)' };

function SeriesToggle({
  label,
  color,
  isPl,
  isOn,
  value,
  valueClass,
  onToggle,
}: {
  label: string;
  color: string;
  isPl: boolean;
  isOn: boolean;
  value: string;
  valueClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={cx(
        'group flex min-w-0 flex-col gap-2 rounded-2xl border p-4 text-left transition-[background-color,border-color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
        isOn ? 'border-line-strong bg-surface-2/40 hover:bg-surface-2/60' : 'border-dashed border-line opacity-60 hover:opacity-90',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-fg-muted">
          <span aria-hidden="true" style={{ background: isOn ? color : undefined }} className={cx('shrink-0 rounded-full', isPl ? 'size-3 opacity-60' : 'size-2.5 ring-2 ring-surface', !isOn && 'bg-line-strong')} />
          <span className="truncate">{label}</span>
        </span>
        {/* Switch knob: makes the on / off state obvious at a glance. */}
        <span aria-hidden="true" className={cx('relative h-4 w-7 shrink-0 rounded-full transition-colors duration-300', isOn ? 'bg-fg' : 'bg-line')}>
          <span className={cx('absolute top-0.5 left-0.5 size-3 rounded-full transition-transform duration-300 motion-reduce:transition-none', isOn ? 'translate-x-3 bg-app' : 'bg-fg-subtle')} />
        </span>
      </span>
      <span className={cx('truncate text-xl font-black tabular-nums', valueClass)}>{value}</span>
    </button>
  );
}

const AXIS_PILL = 'absolute left-0 -translate-y-1/2 rounded-full bg-surface/85 px-1.5 py-px ring-1 ring-line';

// Net P&L bubble diameter in px: area tracks the size of the move, so small days stay small.
function bubbleSize(value: number, max: number): number {
  return 4 + Math.sqrt(Math.abs(value) / max) * 14;
}

/**
 * Spread chart: every sample is a column — a thin track from Net Equity (silver bead) up to AUM (ice bead),
 * with that moment's Net P&L as a bubble resting on the baseline (above when positive, below when negative).
 */
function PerformancePanel({ data, window: chartWindow, period }: { data: PammManagerDashboard; window: PeriodWindow; period: PammPeriod }) {
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
  const showBubbles = isOn('netPl');
  const showTracks = lineKeys.length === 2;
  const hasAnything = lineKeys.length > 0 || showBubbles;

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

  const toX = (time: number) => ((time - chartWindow.start) / span) * 100;
  const toY = (value: number) => ((high - value) / (high - low)) * MAIN_BOTTOM;

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
  // The readouts show the hovered moment, or the latest point when the pointer is away.
  const readPoint = hoverPoint ?? points[points.length - 1];
  const hoverX = hoverPoint ? toX(hoverPoint.time) : 0;

  function seriesValue(key: PammSeriesKey, point: ChartPoint): string {
    const value = point.values[key];
    return key === 'netPl' ? signedMoney(value, data.currency) : formatMoney(value, data.currency);
  }

  return (
    <section style={riseDelay(3)} className={cx(panelClass, 'animate-rise p-5 motion-reduce:animate-none sm:p-6')}>
      <PanelHead
        icon="areaChart"
        title={translate('pammMgr.performance')}
        aside={
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10.5px] text-fg-muted ring-1 ring-line tabular-nums">
            <span aria-hidden="true" className="relative flex size-2">
              {!hoverPoint && <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />}
              <span className={cx('relative size-2 rounded-full', hoverPoint ? 'bg-fg' : 'bg-success')} />
            </span>
            {axisStamp(readPoint.time)}
          </p>
        }
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Readout rail: each series is a switch card carrying its value at the read moment. */}
        <div className="grid content-start gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {seriesConfig.map((series) => {
            const on = isOn(series.key);
            const isPl = series.key === 'netPl';
            const value = readPoint.values[series.key];
            let valueClass = 'text-fg';
            if (!on) valueClass = 'text-fg-subtle';
            else if (isPl) valueClass = value >= 0 ? 'text-success' : 'text-danger';
            return (
              <SeriesToggle
                key={series.key}
                label={translate(series.labelKey)}
                color={series.color}
                isPl={isPl}
                isOn={on}
                value={on ? seriesValue(series.key, readPoint) : '—'}
                valueClass={valueClass}
                onToggle={() => toggle(series.key)}
              />
            );
          })}
        </div>

        {!hasAnything ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-4 text-center">
            <span aria-hidden="true" className="relative grid size-16 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
              <span className={cx(beadClass, 'size-10')}>
                <Icon name="areaChart" size={17} />
              </span>
            </span>
            <p className="mt-3 text-sm font-semibold text-fg">{translate('pammMgr.noActivity')}</p>
            <p className="mt-1 text-sm text-fg-muted">{translate('pammMgr.noActivityHint')}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <div
              ref={plotRef}
              role="img"
              aria-label={translate('pammMgr.performance')}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
              className="relative h-80 touch-none overflow-hidden rounded-2xl bg-surface-2/20 ring-1 ring-line"
            >
              {/* Inner padding keeps beads and bubbles off the frame edges. */}
              <div className="absolute inset-x-5 top-5 bottom-5">
                {lineKeys.length > 0 &&
                  yTicks.map((tick) => <span key={tick} aria-hidden="true" style={{ top: `${toY(tick)}%` }} className="absolute inset-x-0 border-t border-dotted border-line" />)}
                {showBubbles && <span aria-hidden="true" style={{ top: `${bandMid}%` }} className="absolute inset-x-0 border-t border-line-strong" />}

                {/* Columns sweep in left to right whenever the range changes. */}
                <div key={period} aria-hidden="true" className="absolute inset-0">
                  {points.map((point, index) => {
                    const isHovered = hoverIndex === index;
                    const isDimmed = hoverIndex !== null && !isHovered;
                    const isLatest = hoverIndex === null && index === points.length - 1;
                    const aumY = toY(point.values.aum);
                    const equityY = toY(point.values.netEquity);
                    const pl = point.values.netPl;
                    const bubble = bubbleSize(pl, plMax);
                    const beadSize = isHovered ? 'size-3.5' : 'size-2 sm:size-2.5';
                    return (
                      <div
                        key={point.time}
                        style={{ left: `${toX(point.time)}%`, animationDelay: `${index * 28}ms` }}
                        className="absolute inset-y-0 w-0 animate-rise motion-reduce:animate-none"
                      >
                        <div className={cx('absolute inset-0 transition-opacity duration-200', isDimmed && 'opacity-30')}>
                          {isHovered && <span className="absolute -top-3 -bottom-3 left-1/2 w-5 -translate-x-1/2 rounded-full bg-fg/[0.07] ring-1 ring-line" />}

                          {showTracks && (
                            <span
                              style={{ top: `${Math.min(aumY, equityY)}%`, height: `${Math.abs(aumY - equityY)}%` }}
                              className="absolute left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-linear-to-b from-[#7fa6dc]/80 to-fg/25"
                            />
                          )}

                          {lineKeys.map((key) => (
                            <span
                              key={key}
                              style={{ top: `${key === 'aum' ? aumY : equityY}%`, background: key === 'aum' ? ICE : 'var(--color-fg)' }}
                              className={cx('absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-[width,height] duration-200', beadSize)}
                            >
                              {isLatest && <span style={{ background: key === 'aum' ? ICE : 'var(--color-fg)' }} className="absolute -inset-1.5 animate-ping-soft rounded-full opacity-50 motion-reduce:hidden" />}
                            </span>
                          ))}

                          {showBubbles && (
                            <span
                              style={{ top: `${bandMid}%`, width: bubble, height: bubble }}
                              className={cx(
                                'absolute left-1/2 -translate-x-1/2 rounded-full ring-1',
                                pl >= 0 ? '-mt-0.5 -translate-y-full bg-success/45 ring-success' : 'mt-0.5 bg-danger/45 ring-danger',
                                isHovered && 'scale-125',
                              )}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Frosted read-out card riding beside the hovered column; flips to the left past the middle. */}
                {hoverPoint && (
                  <div
                    aria-hidden="true"
                    style={{ left: `${hoverX}%` }}
                    className={cx('pointer-events-none absolute top-0 z-10 w-52 rounded-2xl p-3', frostChipClass, hoverX > 60 ? '-translate-x-[calc(100%+18px)]' : 'translate-x-[18px]')}
                  >
                    <p className={cx('font-mono text-[10px] tabular-nums', inkMutedClass)}>{axisStamp(hoverPoint.time)}</p>
                    <dl className="mt-2 flex flex-col gap-1.5">
                      {seriesConfig.filter((series) => isOn(series.key)).map((series) => (
                        <div key={series.key} className="flex items-center gap-2 text-xs">
                          <span style={{ background: tooltipSwatch[series.key] }} className="size-2 shrink-0 rounded-full" />
                          <dt className={inkMutedClass}>{translate(series.labelKey)}</dt>
                          <span className="flex-1 border-t border-dotted border-[#0a1220]/20" />
                          <dd className={cx('font-bold tabular-nums', inkClass)}>{seriesValue(series.key, hoverPoint)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Axis values as small pills sitting on the guides, inside the plot. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 font-mono text-[9.5px] text-fg-subtle tabular-nums">
                  {lineKeys.length > 0 &&
                    yTicks.map((tick) => (
                      <span key={tick} style={{ top: `${toY(tick)}%` }} className={AXIS_PILL}>
                        {axisMoney(tick)}
                      </span>
                    ))}
                  {showBubbles && (
                    <>
                      <span style={{ top: `${BAND_TOP}%` }} className={AXIS_PILL}>
                        {axisMoney(plMax)}
                      </span>
                      <span style={{ top: `${bandMid}%` }} className={AXIS_PILL}>
                        $0
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div aria-hidden="true" className="relative mx-5 mt-2 h-4 font-mono text-[10px] text-fg-subtle tabular-nums">
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
        )}
      </div>
    </section>
  );
}

/* ───────────── Plans / payouts / trades ───────────── */

// Leaderboard: plans ranked by ROI, each on a thin track scaled against the best one with a bead at its tip.
function PlanPerformance({ data }: { data: PammManagerDashboard }) {
  const rankedPlans = [...data.plans].sort((first, second) => second.roiPercent - first.roiPercent);
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={riseDelay(4)} className={cx(panelClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6')}>
      <PanelHead icon="trendUp" title={translate('pammMgr.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center rounded-2xl border border-dashed border-line-strong px-4 pt-5 pb-5 text-center">
          {/* Ghost leaderboard: empty tracks with a bead scanning along each. */}
          <div aria-hidden="true" className="w-full space-y-4 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
            {[0.82, 0.58, 0.36].map((width, index) => (
              <span key={width} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
                <span className="relative h-[3px] flex-1 rounded-full bg-line">
                  <span style={{ width: `${width * 100}%` }} className="absolute inset-y-0 left-0">
                    <span style={{ animationDelay: `${index * 400}ms` }} className="absolute -top-[3px] size-2 -translate-x-1/2 animate-route-dot rounded-full bg-fg/60 motion-reduce:hidden" />
                  </span>
                </span>
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-fg">{translate('pammMgr.noPlans')}</p>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">{translate('pammMgr.noPlansHint')}</p>
          <CreatePlanLink size="sm" className="mt-4" />
        </div>
      ) : (
        <ol className="mt-5 divide-y divide-dotted divide-line-strong">
          {rankedPlans.map((plan, index) => {
            const share = (Math.abs(plan.roiPercent) / topRoi) * 100;
            return (
              <li key={plan.id} style={riseDelay(index)} className="flex animate-rise items-center gap-3 py-3 motion-reduce:animate-none">
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold', index === 0 ? 'nova-gloss text-fg' : 'text-fg-muted ring-1 ring-line')}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-fg">{plan.name}</span>
                    <span className={cx('font-bold tabular-nums', plan.roiPercent >= 0 ? 'text-success' : 'text-danger')}>{signedPercent(plan.roiPercent)}</span>
                  </div>
                  <div className="relative mt-2 h-[3px] rounded-full bg-line">
                    <span style={{ width: `${share}%` }} className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-fg/60 motion-reduce:animate-none" />
                    <span style={{ left: `${share}%` }} className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-2 ring-surface" />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const PAYOUT_RADIUS = 46;
const PAYOUT_LENGTH = 2 * Math.PI * PAYOUT_RADIUS;

// Payouts: a ring split into paid (silver) and pending (amber), the earned amount in its centre.
function Payouts({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { earned, pending } = data.payouts;
  const payoutTotal = earned + pending;
  const earnedShare = useAnimatedNumber(payoutTotal > 0 ? earned / payoutTotal : 0, 1300);
  const shownEarned = useAnimatedNumber(earned, 1100);
  const earnedArc = PAYOUT_LENGTH * earnedShare;
  const hasPayouts = payoutTotal > 0;

  return (
    <section style={riseDelay(5)} className={cx(panelClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6')}>
      <PanelHead icon="crypto" title={translate('pammMgr.payouts')} aside={<ViewAllButton hasItems={hasPayouts} />} />

      <div className="relative mx-auto mt-5 grid size-48 place-items-center">
        <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="60" cy="60" r={PAYOUT_RADIUS} fill="none" strokeWidth="4" className="stroke-line" />
          {hasPayouts ? (
            <>
              <circle cx="60" cy="60" r={PAYOUT_RADIUS} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${earnedArc} ${PAYOUT_LENGTH}`} className="stroke-fg" />
              <circle
                cx="60"
                cy="60"
                r={PAYOUT_RADIUS}
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${PAYOUT_LENGTH - earnedArc} ${PAYOUT_LENGTH}`}
                strokeDashoffset={-earnedArc}
                className="stroke-amber-400"
              />
            </>
          ) : (
            <circle cx="60" cy="60" r={PAYOUT_RADIUS - 9} fill="none" strokeWidth="1" strokeDasharray="2 5" className="origin-center animate-rim-spin stroke-line-strong [transform-box:fill-box] motion-reduce:animate-none" />
          )}
        </svg>
        <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin motion-reduce:animate-none" style={{ animationDuration: '7s' }}>
          <span className="absolute top-1/2 left-[4%] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
        </span>
        <div className="relative px-6 text-center">
          <p className={captionClass}>{translate('pammMgr.earnedWindow', { period: periodLabel(period) })}</p>
          <p className="mt-1 truncate text-2xl font-black text-fg tabular-nums">{formatMoney(shownEarned, data.currency)}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-dotted border-line-strong pt-4 text-sm">
        <span aria-hidden="true" className="relative flex size-2.5">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-amber-400/60 motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full bg-amber-400" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-fg-muted">
          <Icon name="clock" size={12} />
          {translate('pammMgr.pending')}
        </span>
        <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
        <span className="text-lg font-black text-amber-500 tabular-nums">{formatMoney(pending, data.currency)}</span>
      </div>
    </section>
  );
}

const FUSE_RADIUS = 8;

function RecentTrades({ data, className }: { data: PammManagerDashboard; className?: string }) {
  const cycle = { '--cycle': `${data.autoRefreshSeconds}s` } as CSSProperties;
  return (
    <section style={riseDelay(6)} className={cx(panelClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6', className)}>
      <PanelHead
        icon="bolt"
        title={translate('pammMgr.recentTrades')}
        aside={
          <span className="inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 font-mono text-[10.5px] text-fg-muted ring-1 ring-line">
            {/* Refresh fuse: a ring that drains once per auto-refresh cycle. */}
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 -rotate-90">
              <circle cx="10" cy="10" r={FUSE_RADIUS} fill="none" strokeWidth="2" className="stroke-line" />
              <circle
                cx="10"
                cy="10"
                r={FUSE_RADIUS}
                fill="none"
                strokeWidth="2"
                pathLength={1}
                strokeDasharray="1 1"
                strokeLinecap="round"
                style={cycle}
                className="stroke-fg [animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
              />
            </svg>
            {translate('pammMgr.autoRefresh', { seconds: String(data.autoRefreshSeconds) })}
          </span>
        }
      />

      {data.trades.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span aria-hidden="true" className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:animate-none" />
            <span className="absolute inset-2 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
            <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
              <Icon name="bolt" size={18} />
            </span>
          </span>
          <p className="mt-4 text-sm text-fg-muted">
            {translate('pammMgr.noTrades')}
            <span aria-hidden="true" className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 animate-blink rounded-full bg-fg motion-reduce:animate-none" />
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-dotted divide-line-strong">
          {data.trades.map((trade, index) => (
            <li key={trade.id} style={riseDelay(index)} className="flex animate-rise items-center justify-between gap-3 py-3 text-sm motion-reduce:animate-none">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1', trade.side === 'buy' ? 'bg-success/10 text-success ring-success/30' : 'bg-danger/10 text-danger ring-danger/30')}>
                  {trade.side}
                </span>
                <span className="font-semibold text-fg">{trade.symbol}</span>
                <span className="truncate text-xs text-fg-muted">{trade.plan}</span>
              </span>
              <span className={cx('font-bold tabular-nums', trade.profit >= 0 ? 'text-success' : 'text-danger')}>{signedMoney(trade.profit, data.currency)}</span>
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
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
    <div className="flex flex-col gap-6">
      <PageHeader period={period} onPeriod={setChosenPeriod} window={chartWindow} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <AumCard data={data} />
        <InvestorHealth data={data} period={period} />
      </div>
      <PerformancePanel data={data} window={chartWindow} period={period} />
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <PlanPerformance data={data} />
        <Payouts data={data} period={period} />
        <RecentTrades data={data} className="lg:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
