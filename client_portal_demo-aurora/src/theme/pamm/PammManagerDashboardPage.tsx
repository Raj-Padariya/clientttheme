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
import '../promotion/market.css';
import './desk.css';

const CREATE_PLAN_HREF = '/pamm/become-manager';
// One AUM column per sample, so fewer and wider-spaced than a line chart would use.
const CHART_POINTS = 42;
const COLUMN_WIDTH = (100 / CHART_POINTS) * 0.55;

// AUM columns and the equity step line use the top of the plot; Net P&L stems get their own band underneath.
const MAIN_BOTTOM = 66;
const BAND_TOP = 74;
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-xl bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const gridLinesClass = '[background-image:linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] [background-size:100%_25%]';

const rangeFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const periods: { id: PammPeriod; label: string }[] = [
  { id: 'today', label: translate('pammMgr.today') },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: translate('pammMgr.allTime') },
];

type SeriesGlyph = 'step' | 'column' | 'stem';

const seriesConfig: { key: PammSeriesKey; labelKey: MessageKey; color: string; glyph: SeriesGlyph }[] = [
  { key: 'netEquity', labelKey: 'pammMgr.netEquity', color: 'var(--color-fg)', glyph: 'step' },
  { key: 'aum', labelKey: 'pammMgr.aum', color: 'var(--hero-buy)', glyph: 'column' },
  { key: 'netPl', labelKey: 'pammMgr.netPl', color: 'var(--color-success)', glyph: 'stem' },
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

/** Create Plan: a sage pill with a light sweep. */
function CreatePlanLink({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <Link
      href={CREATE_PLAN_HREF}
      className={cx(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-(--hero-buy) font-semibold text-[#062520] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'md' ? 'h-11 px-5 text-sm' : 'h-9 px-4 text-xs',
        className,
      )}
    >
      <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/40" />
      <Icon name="plus" size={size === 'md' ? 15 : 13} className="relative transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
      <span className="relative">{translate('pammMgr.createPlan')}</span>
    </Link>
  );
}

/* ───────────── Page header ───────────── */

// Period keypad: one segmented strip of keys with a sage key sliding under the chosen period.
function PeriodTabs({ value, onChange }: { value: PammPeriod; onChange: (period: PammPeriod) => void }) {
  const activeIndex = Math.max(0, periods.findIndex((period) => period.id === value));
  return (
    <div role="radiogroup" aria-label={translate('pammMgr.range')} className="relative grid w-full auto-cols-fr grid-flow-col rounded-xl bg-fg/5 p-1 ring-1 ring-line sm:w-auto">
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 0.5rem) / ${periods.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        className="desk-slide absolute inset-y-1 left-1 rounded-lg bg-(--hero-buy) shadow-[0_8px_18px_-10px_rgb(0_0_0/0.9)]"
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
              'relative inline-flex h-9 min-w-0 items-center justify-center px-3 font-mono text-xs font-bold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg active:scale-95 motion-reduce:transition-none',
              isActive ? 'text-[#062520]' : 'text-fg-muted hover:text-fg',
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

/** Desk header: a terminal panel with the title and actions, then a session bar with the period keypad and the window dates joined by a running playhead. */
function PageHeader({ period, onPeriod, window: chartWindow }: { period: PammPeriod; onPeriod: (period: PammPeriod) => void; window: PeriodWindow }) {
  return (
    <header className="zenith-tile relative overflow-hidden rounded-[28px] border border-line bg-fg/[0.02]">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--hero-buy)_8%,transparent)_1px,transparent_1px)] [background-size:56px_100%]" />
      <span aria-hidden="true" className="mkt-sweep pointer-events-none absolute inset-y-0 w-28 -skew-x-12 bg-(--hero-buy)/[0.05]" />
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div className="min-w-0">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <span aria-hidden="true" className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy) motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-(--hero-buy)" />
            </span>
            {translate('nav.pamm')}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammManagerDashboard')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton />
          <CreatePlanLink />
        </div>
      </div>
      <div className="relative flex flex-col gap-3 border-t border-line bg-black/15 px-5 py-3 light:bg-fg/[0.03] sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <PeriodTabs value={period} onChange={onPeriod} />
        <p className="inline-flex items-center gap-2.5 font-mono text-xs text-fg-muted tabular-nums">
          <Icon name="calendar" size={13} className="text-(--hero-buy)" />
          {rangeFormatter.format(chartWindow.start)}
          {/* Session track: the playhead keeps running from the window start to its end. */}
          <span aria-hidden="true" className="relative h-1.5 w-16 rounded-full bg-fg/10 sm:w-24">
            <span className="absolute inset-y-0 left-0 w-full rounded-full bg-linear-to-r from-(--hero-buy)/10 to-(--hero-buy)/50" />
            <span className="mkt-flow absolute -top-[3px] size-3 -translate-x-1/2 rounded-full bg-(--hero-buy) ring-2 ring-app" />
          </span>
          {rangeFormatter.format(chartWindow.end)}
        </p>
      </div>
    </header>
  );
}

/* ───────────── AUM capital pool ───────────── */

const POOL_NODES = 12;
const POOL_CENTER = 100;
const POOL_RING = 78;
const POOL_CORE = 32;

/** Capital pool: investor nodes on a turning ring; each live one streams capital along its line into the fund core. */
function CapitalPool({ investors }: { investors: number }) {
  const shownInvestors = useAnimatedNumber(investors, 700);
  const lit = Math.min(investors, POOL_NODES);
  const nodes = Array.from({ length: POOL_NODES }, (_, index) => {
    const angle = (index / POOL_NODES) * Math.PI * 2 - Math.PI / 2;
    return {
      x: POOL_CENTER + Math.cos(angle) * POOL_RING,
      y: POOL_CENTER + Math.sin(angle) * POOL_RING,
      innerX: POOL_CENTER + Math.cos(angle) * (POOL_CORE + 5),
      innerY: POOL_CENTER + Math.sin(angle) * (POOL_CORE + 5),
      isLit: index < lit,
    };
  });

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative size-44 sm:size-52">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="size-full overflow-visible">
          <circle cx={POOL_CENTER} cy={POOL_CENTER} r={95} fill="none" strokeWidth={1.5} strokeDasharray="2 6" className="desk-spin desk-spin-reverse stroke-(--hero-buy)/40" style={{ '--spin': '22s' } as CSSProperties} />
          <g className="desk-spin" style={{ '--spin': '40s' } as CSSProperties}>
            {nodes.map((node, index) => (
              <g key={index}>
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={node.innerX}
                  y2={node.innerY}
                  strokeWidth={node.isLit ? 2 : 1}
                  strokeDasharray={node.isLit ? '4 6' : undefined}
                  className={node.isLit ? 'mkt-march stroke-(--hero-buy)' : 'stroke-fg/10'}
                />
                <circle cx={node.x} cy={node.y} r={7} strokeWidth={1.5} className={node.isLit ? 'fill-(--hero-buy) stroke-(--hero-buy)' : 'fill-app stroke-fg/20'} />
                {node.isLit && <circle cx={node.x} cy={node.y} r={2.5} className="fill-[#062520]" />}
              </g>
            ))}
          </g>
          <circle cx={POOL_CENTER} cy={POOL_CENTER} r={POOL_CORE} className="animate-ping-soft fill-(--hero-buy)/20 [transform-box:fill-box] origin-center motion-reduce:hidden" />
          <circle cx={POOL_CENTER} cy={POOL_CENTER} r={POOL_CORE} strokeWidth={1.5} className="fill-[#0d1714] stroke-(--hero-buy)/70 light:fill-surface" />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-3xl font-black text-fg tabular-nums">{Math.round(shownInvestors)}</span>
      </div>
      <span className={cx(captionClass, 'inline-flex items-center gap-1.5')}>
        <Icon name="user" size={12} />
        {translate('pammMgr.activeInvestors')}
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
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <Icon name="wallet" size={13} />
            {translate('pammMgr.totalAum')}
          </p>
          <p className="mt-3 truncate text-5xl font-black tracking-tight text-fg tabular-nums sm:text-6xl">{formatMoney(shownAum, data.currency)}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('pammMgr.noData')}</p>

          {/* Terminal readouts with a sage rail on the left. */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {stats.map((stat, index) => (
              <div key={stat.labelKey} style={riseDelay(index + 2)} className="zenith-tile relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-line bg-fg/[0.03] py-3 pr-4 pl-4">
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-(--hero-buy)" />
                <span aria-hidden="true" className={cx(beadClass, 'size-10')}>
                  <Icon name={stat.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <dt className={cx(captionClass, 'truncate')}>{translate(stat.labelKey)}</dt>
                  <dd className="truncate font-mono text-lg font-black text-fg tabular-nums">{stat.value}</dd>
                  <dd className="text-[11px] text-fg-subtle">{translate('pammMgr.noData')}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <CapitalPool investors={data.activeInvestors} />
      </div>

      {data.approvedPlans === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-(--aurora-cta-from)/50 bg-(--aurora-cta-from)/[0.06] py-2 pr-2 pl-4">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-fg">
            <span aria-hidden="true" className="relative flex size-2.5">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
              <span className="relative size-2.5 rounded-full bg-(--aurora-cta-from)" />
            </span>
            {translate('pammMgr.noApproved')}
          </p>
          <CreatePlanLink size="sm" />
        </div>
      )}
    </section>
  );
}

/* ───────────── Investor health (book columns) ───────────── */

const RETENTION_MARKS = [25, 50, 75];

function InvestorHealth({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { active, pending, inactive, newInWindow, churned, avgAgeDays, retentionPercent } = data.investors;
  const total = active + pending + inactive;
  const retention = useAnimatedNumber(retentionPercent, 1400);
  const groups: { labelKey: MessageKey; count: number; fill: string }[] = [
    { labelKey: 'pammMgr.active', count: active, fill: 'bg-(--hero-buy)' },
    { labelKey: 'pammMgr.pending', count: pending, fill: 'bg-(--aurora-cta-from)' },
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
        aside={<span className="grid min-w-8 place-items-center rounded-full bg-(--aurora-cta-from) px-2 py-0.5 text-xs font-black text-[#062520] tabular-nums">{total}</span>}
      />

      {/* Book columns: one column per status, printed up to its share of the book; an empty book pumps idle stubs. */}
      <ul className="grid grid-cols-3 gap-3">
        {groups.map((group, index) => {
          const share = total > 0 ? (group.count / total) * 100 : 0;
          return (
            <li key={group.labelKey} className="flex min-w-0 flex-col items-center gap-2">
              <span className="text-xl font-black text-fg tabular-nums">{group.count}</span>
              <span aria-hidden="true" className={cx('relative flex h-28 w-full items-end overflow-hidden rounded-xl bg-fg/[0.04] ring-1 ring-line', gridLinesClass)}>
                {share > 0 ? (
                  <span style={{ height: `${share}%`, '--candle-delay': `${300 + index * 150}ms` } as CSSProperties} className={cx('mkt-candle relative w-full rounded-t-lg', group.fill)}>
                    <span className="mkt-blink absolute inset-x-0 top-0 h-0.5 bg-white/70" />
                  </span>
                ) : (
                  <span style={{ '--vol-delay': `${index * 0.3}s` } as CSSProperties} className="mkt-vol h-1/4 w-full rounded-t-lg bg-fg/10" />
                )}
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 text-xs text-fg-muted">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', group.fill)} />
                <span className="truncate">{translate(group.labelKey)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* Retention as a price track with a diamond price tag riding at the current level. */}
      <div>
        <div className="flex items-end justify-between gap-3">
          <p className={captionClass}>{translate('pammMgr.retention')}</p>
          <p className="font-mono text-2xl font-black text-success tabular-nums">{Math.round(retention)}%</p>
        </div>
        <div
          role="meter"
          aria-label={translate('pammMgr.retention')}
          aria-valuenow={retentionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative mt-3 h-8"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-fg/5 ring-1 ring-line">
            <span style={{ width: `${retention}%` }} className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-success/20 to-success" />
          </span>
          {RETENTION_MARKS.map((mark) => (
            <span key={mark} aria-hidden="true" style={{ left: `${mark}%` }} className="absolute inset-y-1 w-px bg-line-strong" />
          ))}
          <span aria-hidden="true" style={{ left: `${retention}%` }} className="absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success/40 motion-reduce:hidden" />
            <span className="relative size-3.5 rotate-45 rounded-[3px] bg-success ring-2 ring-app" />
          </span>
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2">
        {footer.map((item) => (
          <div key={item.label} className="min-w-0 rounded-xl border border-line bg-fg/[0.03] px-3 py-2.5">
            <dt className="truncate text-[11px] text-fg-muted">{item.label}</dt>
            <dd className="mt-0.5 font-mono text-lg font-black text-fg tabular-nums">{item.value}</dd>
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

const lineColor: Record<'aum' | 'netEquity', string> = { netEquity: 'var(--color-fg)', aum: 'var(--hero-buy)' };

// Stair-step path through the points in the 0-100 plot space: flat until the next sample, then a vertical move.
function stepPath(coords: [number, number][]): string {
  if (coords.length === 0) return '';
  let path = `M${coords[0][0]},${coords[0][1]}`;
  for (let index = 1; index < coords.length; index += 1) {
    path += ` H${coords[index][0]} V${coords[index][1]}`;
  }
  return path;
}

// Small legend glyph for each series: the step line, the columns, or the stems.
function SeriesGlyphIcon({ glyph, color }: { glyph: SeriesGlyph; color: string }) {
  if (glyph === 'step') {
    return (
      <svg viewBox="0 0 20 14" className="w-5">
        <path d="M1 12 H6 V7 H11 V9 H15 V2 H19" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    );
  }
  if (glyph === 'column') {
    return (
      <svg viewBox="0 0 20 14" className="w-5">
        {[
          [2, 6],
          [8, 2],
          [14, 4],
        ].map(([x, y]) => (
          <rect key={x} x={x} y={y} width={4} height={14 - y} rx={1} fill={color} />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 14" className="w-5">
      <line x1={5} x2={5} y1={7} y2={2} stroke={color} strokeWidth={1.5} />
      <circle cx={5} cy={2} r={1.8} fill={color} />
      <line x1={14} x2={14} y1={7} y2={12} stroke={color} strokeWidth={1.5} />
      <circle cx={14} cy={12} r={1.8} fill={color} />
      <line x1={0} x2={20} y1={7} y2={7} stroke={color} strokeWidth={0.8} opacity={0.5} />
    </svg>
  );
}

// Series switch: glyph + label, the value at the read moment, and an on/off knob.
function SeriesToggle({
  label,
  color,
  glyph,
  isOn,
  value,
  valueClass,
  onToggle,
}: {
  label: string;
  color: string;
  glyph: SeriesGlyph;
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
        'group flex min-w-0 items-center gap-3 rounded-2xl border py-2 pr-3 pl-2 text-left transition-[background-color,border-color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg',
        isOn ? 'border-line-strong bg-fg/[0.04] hover:bg-fg/[0.07]' : 'border-dashed border-line opacity-60 hover:opacity-90',
      )}
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-fg/5 ring-1 ring-line">
        <SeriesGlyphIcon glyph={glyph} color={isOn ? color : 'var(--color-line-strong)'} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11px] font-semibold text-fg-muted">{label}</span>
        <span className={cx('truncate font-mono text-lg leading-tight font-black tabular-nums', valueClass)}>{value}</span>
      </span>
      {/* Switch knob: makes the on / off state obvious at a glance. */}
      <span aria-hidden="true" className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', isOn ? 'bg-fg/20' : 'bg-line')}>
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-4 rounded-full transition-transform duration-300 motion-reduce:transition-none',
            isOn ? 'translate-x-4 bg-(--hero-buy)' : 'bg-fg-subtle',
          )}
        />
      </span>
    </button>
  );
}

const AXIS_PILL = 'absolute left-0 -translate-y-1/2 rounded-md bg-app/85 px-1.5 py-px ring-1 ring-line';

/**
 * Desk chart: AUM as sage columns printed one by one, Net Equity as a stair-step line over them, and Net P&L as
 * lollipop stems on their own zero line underneath (up for gains, down for losses).
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
  const showPl = isOn('netPl');
  const hasAnything = lineKeys.length > 0 || showPl;

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
  const plReach = (100 - BAND_TOP) / 2 - 3;

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
        {/* Readout strip above the plot: each series is a switch carrying its value at the read moment. */}
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
                glyph={series.glyph}
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
            <span aria-hidden="true" className="flex h-14 items-end gap-1.5">
              {[40, 75, 55, 100, 65].map((height, index) => (
                <span key={height} style={{ height: `${height}%`, '--vol-delay': `${index * 0.15}s` } as CSSProperties} className="mkt-vol w-3 rounded-t-md bg-(--hero-buy)/40" />
              ))}
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
              className="relative h-80 touch-none overflow-hidden rounded-[24px] bg-black/20 ring-1 ring-line light:bg-fg/[0.02] sm:h-96"
            >
              {/* Inner padding keeps the columns, markers and stems off the frame edges. */}
              <div className="absolute inset-x-5 top-5 bottom-5">
                {lineKeys.length > 0 &&
                  yTicks.map((tick) => <span key={tick} aria-hidden="true" style={{ top: `${toY(tick)}%` }} className="absolute inset-x-0 border-t border-dashed border-line" />)}
                {showPl && <span aria-hidden="true" style={{ top: `${bandMid}%` }} className="absolute inset-x-0 border-t border-line-strong" />}

                {/* AUM columns print left to right whenever the range changes. */}
                {isOn('aum') && (
                  <div key={`aum-${period}`} aria-hidden="true" className="absolute inset-0">
                    {points.map((point, index) => {
                      const top = toY(point.values.aum);
                      const isDimmed = hoverIndex !== null && hoverIndex !== index;
                      return (
                        <span
                          key={point.time}
                          style={{ left: `${toX(point.time)}%`, top: `${top}%`, height: `${MAIN_BOTTOM - top}%`, width: `${COLUMN_WIDTH}%`, '--candle-delay': `${index * 20}ms` } as CSSProperties}
                          className={cx(
                            'mkt-candle absolute -translate-x-1/2 rounded-t-[3px] bg-linear-to-b from-(--hero-buy)/75 to-(--hero-buy)/10 transition-opacity duration-200',
                            isDimmed && 'opacity-40',
                          )}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Net Equity as a stair-step line wiping in over the columns. */}
                {isOn('netEquity') && (
                  <svg key={`eq-${period}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="zenith-reveal absolute inset-0 size-full overflow-visible">
                    <path
                      d={stepPath(points.map((point) => [toX(point.time), toY(point.values.netEquity)]))}
                      fill="none"
                      stroke={lineColor.netEquity}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      className="[filter:drop-shadow(0_0_6px_rgb(255_255_255/0.35))]"
                    />
                  </svg>
                )}

                {/* Net P&L as lollipop stems on their own zero line: up (gain) or down (loss), sized to the biggest move. */}
                {showPl && (
                  <div key={`pl-${period}`} aria-hidden="true" className="absolute inset-0">
                    {points.map((point, index) => {
                      const pl = point.values.netPl;
                      const isGain = pl >= 0;
                      const length = (Math.abs(pl) / plMax) * plReach;
                      const isDimmed = hoverIndex !== null && hoverIndex !== index;
                      return (
                        <span
                          key={point.time}
                          style={
                            {
                              left: `${toX(point.time)}%`,
                              top: `${isGain ? bandMid - length : bandMid}%`,
                              height: `${length}%`,
                              transformOrigin: isGain ? 'center bottom' : 'center top',
                              '--candle-delay': `${index * 25}ms`,
                            } as CSSProperties
                          }
                          className={cx('mkt-candle absolute w-0.5 -translate-x-1/2 transition-opacity duration-200', isGain ? 'bg-success' : 'bg-danger', isDimmed && 'opacity-30')}
                        >
                          {length > 0 && <span className={cx('absolute left-1/2 size-2 -translate-x-1/2 rounded-full ring-2 ring-app', isGain ? '-top-1 bg-success' : '-bottom-1 bg-danger')} />}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Markers on the step line and the column tops at the read moment, joined by a dashed guide while hovering. */}
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

                {/* Axis values as small tags sitting on the guides, inside the plot. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 font-mono text-[9.5px] text-fg-subtle tabular-nums">
                  {lineKeys.length > 0 &&
                    yTicks.map((tick) => (
                      <span key={tick} style={{ top: `${toY(tick)}%` }} className={AXIS_PILL}>
                        {axisMoney(tick)}
                      </span>
                    ))}
                  {showPl && (
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

// ROI ladder: plans ranked by ROI, each a bar running off a centre zero line — right in sage for gains, left in clay for losses.
function PlanPerformance({ data }: { data: PammManagerDashboard }) {
  const rankedPlans = [...data.plans].sort((first, second) => second.roiPercent - first.roiPercent);
  const topRoi = Math.max(1, ...data.plans.map((plan) => Math.abs(plan.roiPercent)));
  return (
    <section style={riseDelay(4)} className={cx(panelClass, 'zenith-tile flex flex-col p-5 sm:p-6')}>
      <PanelHead icon="trendUp" title={translate('pammMgr.planPerformance')} aside={<ViewAllButton hasItems={data.plans.length > 0} />} />
      {data.plans.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center rounded-2xl border border-dashed border-line-strong px-4 py-5 text-center">
          {/* Ghost ladder: idle bars either side of the zero line with a light scanning through. */}
          <div aria-hidden="true" className="relative w-full space-y-2.5 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
            <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
            {[0.7, -0.4, 0.3].map((width, index) => (
              <span key={width} className="relative flex h-6 items-center">
                <span
                  style={{ width: `${Math.abs(width) * 50}%` }}
                  className={cx('absolute inset-y-1 overflow-hidden rounded-sm bg-fg/10', width > 0 ? 'left-1/2' : 'right-1/2')}
                >
                  <span style={{ animationDelay: `${index * 400}ms` }} className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-fg/15" />
                </span>
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-fg">{translate('pammMgr.noPlans')}</p>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">{translate('pammMgr.noPlansHint')}</p>
          <CreatePlanLink size="sm" className="mt-4" />
        </div>
      ) : (
        <ol className="mt-5 flex flex-col gap-1">
          {rankedPlans.map((plan, index) => {
            const share = Math.max(12, (Math.abs(plan.roiPercent) / topRoi) * 100);
            const isGain = plan.roiPercent >= 0;
            return (
              <li
                key={plan.id}
                style={riseDelay(index)}
                className="zenith-tile grid grid-cols-[1.5rem_minmax(0,7rem)_minmax(0,1fr)_4rem] items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-300 hover:bg-fg/[0.04] motion-reduce:transition-none"
              >
                <span className={cx('font-mono text-xs font-bold', index === 0 ? 'text-(--hero-buy)' : 'text-fg-subtle')}>{String(index + 1).padStart(2, '0')}</span>
                <span className="truncate text-sm font-semibold text-fg">{plan.name}</span>
                <span aria-hidden="true" className="relative h-5">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                  <span
                    style={{ width: `${share / 2}%`, animationDelay: `${200 + index * 120}ms` }}
                    className={cx('zenith-capsule absolute inset-y-0.5 rounded-sm', isGain ? 'left-1/2 origin-left bg-(--hero-buy)' : 'right-1/2 origin-right bg-(--aurora-cta-from)')}
                  />
                </span>
                <span className={cx('text-right font-mono text-xs font-black tabular-nums', isGain ? 'text-success' : 'text-danger')}>{signedPercent(plan.roiPercent)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// Payouts: settled and pending as two settlement columns, the pending one running hazard stripes, with the earned amount as the headline.
function Payouts({ data, period }: { data: PammManagerDashboard; period: PammPeriod }) {
  const { earned, pending } = data.payouts;
  const payoutMax = Math.max(earned, pending);
  const shownEarned = useAnimatedNumber(earned, 1100);
  const hasPayouts = earned + pending > 0;
  const columnHeight = (amount: number) => `${payoutMax > 0 ? Math.max(8, (amount / payoutMax) * 100) : 8}%`;

  return (
    <section style={riseDelay(5)} className={cx(panelClass, 'zenith-tile flex flex-col p-5 sm:p-6')}>
      <PanelHead icon="crypto" title={translate('pammMgr.payouts')} aside={<ViewAllButton hasItems={hasPayouts} />} />

      <div className="mt-5">
        <p className={captionClass}>{translate('pammMgr.earnedWindow', { period: periodLabel(period) })}</p>
        <p className="mt-1 truncate font-mono text-4xl font-black tracking-tight text-fg tabular-nums">{formatMoney(shownEarned, data.currency)}</p>
      </div>

      <div aria-hidden="true" className={cx('relative mt-5 flex h-32 items-end gap-3 rounded-2xl bg-fg/[0.03] px-4 pt-4 ring-1 ring-line', gridLinesClass)}>
        {hasPayouts ? (
          <>
            <span style={{ height: columnHeight(earned) }} className="mkt-candle relative flex-1 rounded-t-lg bg-(--hero-buy)" />
            <span style={{ height: columnHeight(pending), '--candle-delay': '0.2s' } as CSSProperties} className="mkt-candle relative flex-1 overflow-hidden rounded-t-lg bg-(--aurora-cta-from)">
              <span className="desk-stripes absolute inset-0" />
            </span>
          </>
        ) : (
          <>
            <span className="relative h-3/5 flex-1 overflow-hidden rounded-t-lg border border-b-0 border-dashed border-line-strong">
              <span className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-fg/10" />
            </span>
            <span className="relative h-1/3 flex-1 overflow-hidden rounded-t-lg border border-b-0 border-dashed border-line-strong">
              <span className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-fg/10 [animation-delay:1s]" />
            </span>
          </>
        )}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-3 px-4 text-fg-subtle">
        <span className="grid flex-1 place-items-center">
          <Icon name="check" size={13} className="text-(--hero-buy)" />
        </span>
        <span className="grid flex-1 place-items-center">
          <Icon name="clock" size={13} className="text-(--aurora-cta-from)" />
        </span>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-line pt-4 text-sm">
        <span aria-hidden="true" className="relative flex size-2.5">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full bg-(--aurora-cta-from)" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-fg-muted">
          <Icon name="clock" size={12} />
          {translate('pammMgr.pending')}
        </span>
        <span aria-hidden="true" className="flex-1 border-t border-dashed border-line-strong" />
        <span className="font-mono text-lg font-black text-fg tabular-nums">{formatMoney(pending, data.currency)}</span>
      </div>
    </section>
  );
}

const FUSE_RADIUS = 8;

// Time & sales tape: one terminal row per fill, flashing sage as it prints.
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
                className="stroke-(--hero-buy) [animation:countdown_var(--cycle)_linear_infinite] motion-reduce:[animation:none]"
              />
            </svg>
            {translate('pammMgr.autoRefresh', { seconds: String(data.autoRefreshSeconds) })}
          </span>
        }
      />

      {data.trades.length === 0 ? (
        <div className="relative mt-5 flex flex-1 flex-col justify-center gap-5 overflow-hidden rounded-2xl bg-black/20 px-5 py-8 font-mono ring-1 ring-line light:bg-fg/5">
          {/* Idle terminal: a glare passes, an order dot runs the empty tape and the cursor waits for the first fill. */}
          <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-16 -skew-x-12 bg-(--hero-buy)/[0.06]" />
          <span aria-hidden="true" className="relative block border-t border-dashed border-(--hero-buy)/40">
            <span className="mkt-flow absolute -top-[4px] size-2 -translate-x-1/2 rounded-full bg-(--hero-buy)" />
          </span>
          <p className="relative text-sm text-fg-muted">
            <span aria-hidden="true" className="text-(--hero-buy)">
              &gt;{' '}
            </span>
            {translate('pammMgr.noTrades')}
            <span aria-hidden="true" className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-(--hero-buy) motion-reduce:animate-none" />
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col overflow-hidden rounded-2xl font-mono ring-1 ring-line">
          {data.trades.map((trade, index) => {
            const isBuy = trade.side === 'buy';
            return (
              <li
                key={trade.id}
                style={{ '--flash-delay': `${index * 140}ms` } as CSSProperties}
                className="desk-flash grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-3 py-2.5 text-sm last:border-b-0 odd:bg-fg/[0.02]"
              >
                <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase', isBuy ? 'bg-(--hero-buy) text-[#062520]' : 'bg-(--aurora-cta-from) text-[#062520]')}>
                  <span aria-hidden="true">{isBuy ? '▲' : '▼'}</span>
                  {trade.side}
                </span>
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-bold text-fg">{trade.symbol}</span>
                  <span className="truncate text-xs text-fg-muted">{trade.plan}</span>
                </span>
                <span className={cx('font-bold tabular-nums', trade.profit >= 0 ? 'text-success' : 'text-danger')}>{signedMoney(trade.profit, data.currency)}</span>
              </li>
            );
          })}
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
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Skeleton className="h-80 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
        <Skeleton className="h-96 rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          <Skeleton className="h-72 rounded-[28px]" />
          <Skeleton className="h-72 rounded-[28px]" />
          <Skeleton className="h-72 rounded-[28px]" />
        </div>
      </div>
    );
  }

  const period = chosenPeriod ?? data.defaultPeriod;
  const chartWindow = buildWindow(data, period);

  // Skeleton: the capital pool beside the investor book, the desk chart full width, then the ROI ladder, settlements and the trade tape in one row.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader period={period} onPeriod={setChosenPeriod} window={chartWindow} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <AumCard data={data} />
        <InvestorHealth data={data} period={period} />
      </div>
      <PerformancePanel data={data} window={chartWindow} period={period} />
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <PlanPerformance data={data} />
        <Payouts data={data} period={period} />
        <RecentTrades data={data} className="lg:col-span-2 2xl:col-span-1" />
      </div>
    </div>
  );
}
