'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
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
// One spread column per sample, so fewer and wider-spaced than a line chart would use.
const CHART_POINTS = 42;

// Main lines use the top of the plot; Net P&L bars get their own band underneath.
const MAIN_BOTTOM = 66;
const BAND_TOP = 74;
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';


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
  { key: 'aum', labelKey: 'pammMgr.aum', color: 'var(--zenith-red)' },
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

// Day pills: separate capsules, the active one solid white with a red live dot.
function PeriodTabs({ value, onChange }: { value: PammPeriod; onChange: (period: PammPeriod) => void }) {
  return (
    <div role="radiogroup" aria-label={translate('pammMgr.range')} className="flex flex-wrap gap-1.5">
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
              'relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-[background-color,color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg active:scale-95 motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'bg-fg/5 text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            {isActive && (
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)] motion-reduce:hidden" />
                <span className="relative size-1.5 rounded-full bg-[var(--zenith-red)]" />
              </span>
            )}
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
      className="group inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-fg ring-1 ring-line transition-shadow hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
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

/** Open header: caption + big title with the actions on the right, then a hairline strip with the day pills and the window dates. */
function PageHeader({ period, onPeriod, window: chartWindow }: { period: PammPeriod; onPeriod: (period: PammPeriod) => void; window: PeriodWindow }) {
  return (
    <header className="zenith-tile flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--zenith-red)]" />
            {translate('nav.pamm')}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammManagerDashboard')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton />
          <CreatePlanLink />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-y border-line py-3 lg:flex-row lg:items-center lg:justify-between">
        <PeriodTabs value={period} onChange={onPeriod} />
        <p className="inline-flex items-center gap-2 font-mono text-xs text-fg-muted tabular-nums">
          <Icon name="calendar" size={13} className="text-fg" />
          {rangeFormatter.format(chartWindow.start)}
          <span aria-hidden="true" className="relative w-10 border-t-2 border-dashed border-line-strong">
            <span className="zenith-route absolute -top-[5px] size-2 -translate-x-1/2 rounded-full bg-[var(--zenith-red)]" />
          </span>
          {rangeFormatter.format(chartWindow.end)}
        </p>
      </div>
    </header>
  );
}

/* ───────────── AUM open balance ───────────── */

const INVESTOR_PIXELS = 40;

// Investor pixel grid: one lit pixel per active investor (capped at the grid), lit ones twinkle out of step.
function InvestorPixels({ investors }: { investors: number }) {
  const shownInvestors = useAnimatedNumber(investors, 700);
  const lit = Math.min(investors, INVESTOR_PIXELS);
  return (
    <div className="flex shrink-0 flex-col items-end gap-3">
      <p className="text-right">
        <span className="block text-4xl leading-none font-black text-fg tabular-nums">{Math.round(shownInvestors)}</span>
        <span className={cx(captionClass, 'mt-1 inline-flex items-center gap-1.5')}>
          <Icon name="user" size={12} />
          {translate('pammMgr.activeInvestors')}
        </span>
      </p>
      <span aria-hidden="true" className="grid grid-cols-10 gap-1">
        {Array.from({ length: INVESTOR_PIXELS }, (_, index) => {
          const isLit = index < lit;
          return (
            <span
              key={index}
              style={{ animationDelay: isLit ? `${index * 25}ms, ${(index * 370) % 1600}ms` : `${index * 25}ms` }}
              className={cx(
                'size-2.5 rounded-[3px]',
                isLit
                  ? 'bg-fg [animation:zenith-pixel_0.45s_cubic-bezier(0.2,0.9,0.25,1.3)_both,zenith-twinkle_1.6s_ease-in-out_infinite] motion-reduce:[animation:none]'
                  : 'zenith-pixel bg-fg/10',
              )}
            />
          );
        })}
      </span>
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
    <section style={riseDelay(1)} className={cx(panelClass, 'zenith-tile flex h-full flex-col justify-between gap-6 p-5 sm:p-7')}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <Icon name="wallet" size={13} />
            {translate('pammMgr.totalAum')}
          </p>
          <p className="mt-3 truncate text-5xl font-black tracking-tight text-fg tabular-nums sm:text-6xl">{formatMoney(shownAum, data.currency)}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('pammMgr.noData')}</p>
        </div>
        <InvestorPixels investors={data.activeInvestors} />
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {stats.map((stat, index) => (
          <div key={stat.labelKey} style={riseDelay(index + 2)} className="zenith-tile flex min-w-0 items-center gap-3 rounded-full border border-line bg-fg/[0.03] py-2 pr-5 pl-2">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-fg text-app">
              <Icon name={stat.icon} size={16} />
            </span>
            <div className="min-w-0">
              <dt className={cx(captionClass, 'truncate')}>{translate(stat.labelKey)}</dt>
              <dd className="truncate text-lg font-black text-fg tabular-nums">{stat.value}</dd>
              <dd className="text-[11px] text-fg-subtle">{translate('pammMgr.noData')}</dd>
            </div>
          </div>
        ))}
      </dl>

      {data.approvedPlans === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-dashed border-line-strong py-2 pr-2 pl-4">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-fg">
            <span aria-hidden="true" className="relative flex size-2.5">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)] motion-reduce:hidden" />
              <span className="relative size-2.5 rounded-full bg-[var(--zenith-red)]" />
            </span>
            {translate('pammMgr.noApproved')}
          </p>
          <CreatePlanLink size="sm" />
        </div>
      )}
    </section>
  );
}

/* ───────────── Investor health (capsule tracks) ───────────── */

const RETENTION_MARKS = [25, 50, 75];

function InvestorHealth({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { active, pending, inactive, newInWindow, churned, avgAgeDays, retentionPercent } = data.investors;
  const total = active + pending + inactive;
  const retention = useAnimatedNumber(retentionPercent, 1400);
  const groups: { labelKey: MessageKey; count: number; fill: string }[] = [
    { labelKey: 'pammMgr.active', count: active, fill: 'bg-fg' },
    { labelKey: 'pammMgr.pending', count: pending, fill: 'bg-[var(--zenith-red)]' },
    { labelKey: 'pammMgr.inactive', count: inactive, fill: 'bg-fg/25' },
  ];
  const footer = [
    { label: translate('pammMgr.newWindow', { period: periodLabel(period) }), value: String(newInWindow) },
    { label: translate('pammMgr.churned'), value: String(churned) },
    { label: translate('pammMgr.avgAge'), value: `${avgAgeDays}d` },
  ];

  return (
    <section style={riseDelay(2)} className={cx(panelClass, 'zenith-tile flex flex-col gap-5 p-5 sm:p-6')}>
      <PanelHead
        icon="user"
        title={translate('pammMgr.investorHealth')}
        aside={<span className="grid min-w-8 place-items-center rounded-full bg-[var(--zenith-red)] px-2 py-0.5 text-xs font-black text-white tabular-nums">{total}</span>}
      />

      {/* One capsule per status: a track filled to its share of the book; an empty book shows idle tracks with a scanning light. */}
      <ul className="flex flex-col gap-3.5">
        {groups.map((group, index) => {
          const share = total > 0 ? (group.count / total) * 100 : 0;
          return (
            <li key={group.labelKey} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-fg-muted">
                  <span aria-hidden="true" className={cx('size-2.5 rounded-full', group.fill)} />
                  {translate(group.labelKey)}
                </span>
                <span className="font-bold text-fg tabular-nums">{group.count}</span>
              </div>
              <span aria-hidden="true" className="relative h-3 overflow-hidden rounded-full bg-fg/5 ring-1 ring-line">
                {share > 0 ? (
                  <span style={{ width: `${share}%`, animationDelay: `${300 + index * 150}ms` }} className={cx('zenith-capsule absolute inset-y-0 left-0 origin-left rounded-full', group.fill)} />
                ) : (
                  <span style={{ animationDelay: `${index * 500}ms` }} className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-fg/15" />
                )}
              </span>
            </li>
          );
        })}
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
          className="relative mt-3 h-6 rounded-full bg-fg/5 p-1 ring-1 ring-line"
        >
          {RETENTION_MARKS.map((mark) => (
            <span key={mark} aria-hidden="true" style={{ left: `${mark}%` }} className="absolute inset-y-2 w-px bg-line-strong" />
          ))}
          <span aria-hidden="true" style={{ width: `${retention}%` }} className="relative block h-full overflow-hidden rounded-full bg-success">
            <span className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-white/40" />
          </span>
          <span aria-hidden="true" style={{ left: `${retention}%` }} className="absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success/40 motion-reduce:hidden" />
            <span className="relative size-3 rounded-full bg-fg ring-2 ring-success" />
          </span>
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2">
        {footer.map((item) => (
          <div key={item.label} className="min-w-0 rounded-2xl border border-line bg-fg/[0.03] px-3 py-2.5">
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

const lineColor: Record<'aum' | 'netEquity', string> = { netEquity: 'var(--color-fg)', aum: 'var(--zenith-red)' };

// Smooth curve through the points (Catmull-Rom converted to cubic Béziers), in the 0-100 plot space.
function curvePath(coords: [number, number][]): string {
  if (coords.length === 0) return '';
  let path = `M${coords[0][0]},${coords[0][1]}`;
  for (let index = 0; index < coords.length - 1; index += 1) {
    const previous = coords[index - 1] ?? coords[index];
    const current = coords[index];
    const next = coords[index + 1];
    const after = coords[index + 2] ?? next;
    const control1 = [current[0] + (next[0] - previous[0]) / 6, current[1] + (next[1] - previous[1]) / 6];
    const control2 = [next[0] - (after[0] - current[0]) / 6, next[1] - (after[1] - current[1]) / 6];
    path += ` C${control1[0]},${control1[1]} ${control2[0]},${control2[1]} ${next[0]},${next[1]}`;
  }
  return path;
}

// Net P&L pixels per sample: 1-4 scaled to the biggest move, none for a flat sample.
function plPixels(value: number, max: number): number {
  if (value === 0) return 0;
  return Math.max(1, Math.round((Math.abs(value) / max) * 4));
}

// Series switch as a capsule: swatch + label, the value at the read moment, and an on/off knob.
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
        'group flex min-w-0 items-center gap-3 rounded-full border py-2 pr-3 pl-2 text-left transition-[background-color,border-color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg',
        isOn ? 'border-line-strong bg-fg/[0.04] hover:bg-fg/[0.07]' : 'border-dashed border-line opacity-60 hover:opacity-90',
      )}
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/5 ring-1 ring-line">
        {isPl ? (
          <span className="grid grid-cols-2 gap-[2px]">
            {[0, 1, 2, 3].map((pixel) => (
              <span key={pixel} style={{ background: isOn ? color : undefined }} className={cx('size-1.5 rounded-[2px]', !isOn && 'bg-line-strong')} />
            ))}
          </span>
        ) : (
          <span style={{ background: isOn ? color : undefined }} className={cx('h-1 w-5 rounded-full', !isOn && 'bg-line-strong')} />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11px] font-semibold text-fg-muted">{label}</span>
        <span className={cx('truncate text-lg leading-tight font-black tabular-nums', valueClass)}>{value}</span>
      </span>
      {/* Switch knob: makes the on / off state obvious at a glance. */}
      <span aria-hidden="true" className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', isOn ? 'bg-fg' : 'bg-line')}>
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-4 rounded-full transition-transform duration-300 motion-reduce:transition-none',
            isOn ? 'translate-x-4 bg-[var(--zenith-red)]' : 'bg-fg-subtle',
          )}
        />
      </span>
    </button>
  );
}

const AXIS_PILL = 'absolute left-0 -translate-y-1/2 rounded-full bg-app/85 px-1.5 py-px ring-1 ring-line';

/**
 * Two-curve chart: Net Equity (white) and AUM (Zenith red) as glowing curves with live markers at the read moment,
 * and Net P&L as a pixel strip on its own baseline underneath (stacked up for gains, down for losses).
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
    <section style={riseDelay(3)} className={cx(panelClass, 'zenith-tile p-5 sm:p-6')}>
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

      <div className="mt-5 flex flex-col gap-5">
        {/* Readout strip above the plot: each series is a capsule switch carrying its value at the read moment. */}
        <div className="grid gap-3 sm:grid-cols-3">
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
              <span className="grid size-10 place-items-center rounded-full bg-fg text-app">
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
              className="relative h-80 touch-none overflow-hidden rounded-[28px] bg-fg/[0.02] ring-1 ring-line [background-image:radial-gradient(color-mix(in_srgb,var(--color-fg)_10%,transparent)_1px,transparent_1.3px)] [background-size:8px_8px] sm:h-96"
            >
              {/* Inner padding keeps the curves, markers and pixels off the frame edges. */}
              <div className="absolute inset-x-5 top-5 bottom-5">
                {lineKeys.length > 0 &&
                  yTicks.map((tick) => <span key={tick} aria-hidden="true" style={{ top: `${toY(tick)}%` }} className="absolute inset-x-0 border-t border-dotted border-line" />)}
                {showBubbles && <span aria-hidden="true" style={{ top: `${bandMid}%` }} className="absolute inset-x-0 border-t border-line-strong" />}

                {/* Two curves wipe in left to right whenever the range changes: Net Equity in white, AUM in Zenith red. */}
                <svg key={period} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="zenith-reveal absolute inset-0 size-full overflow-visible">
                  {lineKeys.map((key) => (
                    <path
                      key={key}
                      d={curvePath(points.map((point) => [toX(point.time), toY(point.values[key])]))}
                      fill="none"
                      stroke={lineColor[key]}
                      strokeWidth={key === 'netEquity' ? 2.5 : 2}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className={key === 'aum' ? '[filter:drop-shadow(0_0_6px_rgb(255_74_61/0.65))]' : '[filter:drop-shadow(0_0_6px_rgb(255_255_255/0.35))]'}
                    />
                  ))}
                </svg>

                {/* Net P&L as a pixel strip on its own baseline: up to four pixels per sample, stacked up (gain) or down (loss). */}
                {showBubbles && (
                  <div key={`pl-${period}`} aria-hidden="true" className="absolute inset-0">
                    {points.map((point, index) => {
                      const pl = point.values.netPl;
                      const isGain = pl >= 0;
                      const isDimmed = hoverIndex !== null && hoverIndex !== index;
                      return (
                        <span
                          key={point.time}
                          style={{ left: `${toX(point.time)}%`, top: `${bandMid}%` }}
                          className={cx(
                            'absolute flex -translate-x-1/2 gap-[2px] transition-opacity duration-200',
                            isGain ? '-mt-[3px] -translate-y-full flex-col-reverse' : 'mt-[3px] flex-col',
                            isDimmed && 'opacity-30',
                          )}
                        >
                          {Array.from({ length: plPixels(pl, plMax) }, (_, pixel) => (
                            <span
                              key={pixel}
                              style={{ animationDelay: `${index * 25 + pixel * 60}ms` }}
                              className={cx('zenith-pixel size-1.5 rounded-[2px] sm:size-2', isGain ? 'bg-success' : 'bg-danger')}
                            />
                          ))}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Glowing markers on each curve at the read moment, joined by a dashed guide while hovering. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  {hoverPoint && <span style={{ left: `${hoverX}%` }} className="absolute -top-5 -bottom-5 border-l border-dashed border-line-strong" />}
                  {lineKeys.map((key) => (
                    <span
                      key={key}
                      style={{ left: `${toX(readPoint.time)}%`, top: `${toY(readPoint.values[key])}%` }}
                      className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center"
                    >
                      <span style={{ background: lineColor[key] }} className="absolute inset-0 animate-ping-soft rounded-full opacity-60 motion-reduce:hidden" />
                      <span style={{ background: lineColor[key] }} className="relative size-3 rounded-full ring-2 ring-app" />
                    </span>
                  ))}
                </div>

                {/* Read-out card riding beside the hovered column; flips to the left past the middle. */}
                {hoverPoint && (
                  <div
                    aria-hidden="true"
                    style={{ left: `${hoverX}%` }}
                    className={cx(
                      'pointer-events-none absolute top-0 z-10 w-52 rounded-2xl border border-line-strong bg-app/90 p-3 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl',
                      hoverX > 60 ? '-translate-x-[calc(100%+18px)]' : 'translate-x-[18px]',
                    )}
                  >
                    <p className="font-mono text-[10px] text-fg-subtle tabular-nums">{axisStamp(hoverPoint.time)}</p>
                    <dl className="mt-2 flex flex-col gap-1.5">
                      {seriesConfig.filter((series) => isOn(series.key)).map((series) => (
                        <div key={series.key} className="flex items-center gap-2 text-xs">
                          <span style={{ background: series.color }} className="size-2 shrink-0 rounded-full" />
                          <dt className="text-fg-muted">{translate(series.labelKey)}</dt>
                          <span className="flex-1 border-t border-dotted border-line-strong" />
                          <dd className="font-bold text-fg tabular-nums">{seriesValue(series.key, hoverPoint)}</dd>
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

// Leaderboard: plans ranked by ROI, each a fat capsule filled against the best one with its ROI riding inside.
function PlanPerformance({ data }: { data: PammManagerDashboard }) {
  const rankedPlans = [...data.plans].sort((first, second) => second.roiPercent - first.roiPercent);
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={riseDelay(4)} className={cx(panelClass, 'zenith-tile flex flex-col p-5 sm:p-6')}>
      <PanelHead icon="trendUp" title={translate('pammMgr.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center rounded-[28px] border border-dashed border-line-strong px-4 py-5 text-center">
          {/* Ghost leaderboard: idle capsules with a light scanning through each. */}
          <div aria-hidden="true" className="w-full space-y-2.5 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
            {[0.82, 0.58, 0.36].map((width, index) => (
              <span key={width} className="flex items-center gap-3">
                <span className="w-6 font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
                <span className="relative h-7 flex-1 overflow-hidden rounded-full bg-fg/5 ring-1 ring-line">
                  <span style={{ width: `${width * 100}%` }} className="absolute inset-y-1 left-1 rounded-full bg-fg/10" />
                  <span style={{ animationDelay: `${index * 400}ms` }} className="zenith-scan-x absolute inset-y-0 left-0 w-10 bg-fg/15" />
                </span>
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-fg">{translate('pammMgr.noPlans')}</p>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">{translate('pammMgr.noPlansHint')}</p>
          <CreatePlanLink size="sm" className="mt-4" />
        </div>
      ) : (
        <ol className="mt-5 flex flex-col gap-2.5">
          {rankedPlans.map((plan, index) => {
            const share = Math.max(12, (Math.abs(plan.roiPercent) / topRoi) * 100);
            const isGain = plan.roiPercent >= 0;
            return (
              <li key={plan.id} style={riseDelay(index)} className="zenith-tile flex items-center gap-3">
                <span className={cx('w-6 font-mono text-xs font-bold', index === 0 ? 'text-[var(--zenith-red)]' : 'text-fg-subtle')}>{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm font-semibold text-fg">{plan.name}</span>
                  <span className="relative mt-1.5 block h-7 overflow-hidden rounded-full bg-fg/5 ring-1 ring-line">
                    <span
                      style={{ width: `${share}%`, animationDelay: `${200 + index * 120}ms` }}
                      className={cx('zenith-capsule absolute inset-y-1 left-1 flex items-center justify-end rounded-full pr-2.5', index === 0 ? 'bg-fg text-app' : 'bg-fg/20 text-fg')}
                    >
                      <span className={cx('text-[11px] font-black tabular-nums', !isGain && 'text-danger')}>{signedPercent(plan.roiPercent)}</span>
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// Payouts: one split capsule — paid (white) then pending (red) — with the earned amount as the headline.
function Payouts({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { earned, pending } = data.payouts;
  const payoutTotal = earned + pending;
  const earnedShare = useAnimatedNumber(payoutTotal > 0 ? earned / payoutTotal : 0, 1300);
  const shownEarned = useAnimatedNumber(earned, 1100);
  const hasPayouts = payoutTotal > 0;

  return (
    <section style={riseDelay(5)} className={cx(panelClass, 'zenith-tile flex flex-col p-5 sm:p-6')}>
      <PanelHead icon="crypto" title={translate('pammMgr.payouts')} aside={<ViewAllButton hasItems={hasPayouts} />} />

      <div className="mt-5">
        <p className={captionClass}>{translate('pammMgr.earnedWindow', { period: periodLabel(period) })}</p>
        <p className="mt-1 truncate text-4xl font-black tracking-tight text-fg tabular-nums">{formatMoney(shownEarned, data.currency)}</p>
      </div>

      <div aria-hidden="true" className="relative mt-5 flex h-10 gap-1 overflow-hidden rounded-full bg-fg/5 p-1 ring-1 ring-line">
        {hasPayouts ? (
          <>
            <span style={{ width: `${earnedShare * 100}%` }} className="zenith-capsule h-full rounded-full bg-fg" />
            <span className="relative h-full flex-1 overflow-hidden rounded-full bg-[var(--zenith-red)]">
              <span className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-white/35" />
            </span>
          </>
        ) : (
          <span className="relative h-full flex-1 overflow-hidden rounded-full border border-dashed border-line-strong">
            <span className="zenith-scan-x absolute inset-y-0 left-0 w-12 bg-fg/15" />
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-line pt-4 text-sm">
        <span aria-hidden="true" className="relative flex size-2.5">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)] motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full bg-[var(--zenith-red)]" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-fg-muted">
          <Icon name="clock" size={12} />
          {translate('pammMgr.pending')}
        </span>
        <span aria-hidden="true" className="flex-1 border-t border-dashed border-line-strong" />
        <span className="text-lg font-black text-fg tabular-nums">{formatMoney(pending, data.currency)}</span>
      </div>
    </section>
  );
}

const FUSE_RADIUS = 8;

function RecentTrades({ data, className }: { data: PammManagerDashboard; className?: string }) {
  const cycle = { '--cycle': `${data.autoRefreshSeconds}s` } as CSSProperties;
  return (
    <section style={riseDelay(6)} className={cx(panelClass, 'zenith-tile flex flex-col p-5 sm:p-6', className)}>
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
                className="stroke-[var(--zenith-red)] [animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
              />
            </svg>
            {translate('pammMgr.autoRefresh', { seconds: String(data.autoRefreshSeconds) })}
          </span>
        }
      />

      {data.trades.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-line-strong px-4 py-8 text-center">
          {/* Idle tape: a dashed wire with a red bead running along it, waiting for the first fill. */}
          <span aria-hidden="true" className="relative flex w-full max-w-xs items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-fg text-app">
              <Icon name="bolt" size={18} />
            </span>
            <span className="relative flex-1 border-t-2 border-dashed border-line-strong">
              <span className="zenith-route absolute -top-[5px] size-2 -translate-x-1/2 rounded-full bg-[var(--zenith-red)]" />
            </span>
          </span>
          <p className="text-sm text-fg-muted">
            {translate('pammMgr.noTrades')}
            <span aria-hidden="true" className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 animate-blink rounded-full bg-[var(--zenith-red)] motion-reduce:animate-none" />
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {data.trades.map((trade, index) => (
            <li key={trade.id} style={riseDelay(index)} className="zenith-tile flex items-center justify-between gap-3 rounded-full border border-line bg-fg/[0.03] py-1.5 pr-4 pl-1.5 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-black uppercase', trade.side === 'buy' ? 'bg-fg text-app' : 'bg-[var(--zenith-red)] text-white')}>
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
        <Skeleton className="h-28 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-64 rounded-[28px]" />
            <Skeleton className="h-96 rounded-[28px]" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-96 rounded-[28px]" />
            <Skeleton className="h-64 rounded-[28px]" />
          </div>
        </div>
        <Skeleton className="h-72 rounded-[28px]" />
      </div>
    );
  }

  const period = chosenPeriod ?? data.defaultPeriod;
  const chartWindow = buildWindow(data, period);

  // Skeleton: balance + chart as a wide main column, a narrow side rail (investors, payouts), then plans and the trade tape side by side.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader period={period} onPeriod={setChosenPeriod} window={chartWindow} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <AumCard data={data} />
          <PerformancePanel data={data} window={chartWindow} period={period} />
        </div>
        <aside className="grid gap-6 md:grid-cols-2 xl:flex xl:flex-col">
          <InvestorHealth data={data} period={period} />
          <Payouts data={data} period={period} />
        </aside>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <PlanPerformance data={data} />
        <RecentTrades data={data} />
      </div>
    </div>
  );
}
