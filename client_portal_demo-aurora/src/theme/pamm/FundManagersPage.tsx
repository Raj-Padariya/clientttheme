'use client';

import Link from 'next/link';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
import { Avatar } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';

import { fundPlans, investPlanOptions, type FundPlan } from './fundManagersData';
import { InvestNowModal } from './InvestNowModal';
import { CountUp, LiveDot, staggerStyle } from './motion';

type SortKey = 'gain' | 'drawdown' | 'pnl' | 'minInvestment';
type SortOrder = 'desc' | 'asc';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 9;
const COMMUNITY_AUM = 202_700;
const HEARTBEAT_PATH = 'M0 14 H58 L64 6 L70 22 L77 3 L84 25 L90 14 H130 L134 10 L138 18 L142 14 H200';
const RED = 'var(--zenith-red)';

const panelClass = 'orbit-card relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-fg/[0.04] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const darkPillClass =
  'group/pill relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-fg font-semibold text-app transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0';
// Plan labels floating over the risk field: a dark chip that reads on both themes.
const fieldChipClass = 'bg-app/90 text-fg ring-1 ring-line-strong shadow-[0_10px_24px_-14px_rgb(0_0_0/0.9)] backdrop-blur-md';

const plans = fundPlans;

const sortValue: Record<SortKey, (plan: FundPlan) => number> = {
  gain: (plan) => plan.totalGain,
  drawdown: (plan) => plan.maxDrawdown,
  pnl: (plan) => plan.totalPnl,
  minInvestment: (plan) => plan.minInvestment,
};

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function signedMoney(amount: number): string {
  return `${amount > 0 ? '+' : ''}${formatMoney(amount, 'USD')}`;
}

function toneClass(value: number): string {
  return value >= 0 ? 'text-success' : 'text-danger';
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function percentOf(value: number, max: number): number {
  return max <= 0 ? 0 : Math.min(100, Math.max(4, (Math.abs(value) / max) * 100));
}

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

/* ───────────── Title ───────────── */

function PageTitle() {
  return (
    <header className="zenith-tile flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <RedDot className="size-1.5" />
          {translate('nav.pamm')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammFundManagers')}</h2>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className={chipClass}>
          <LiveDot />
          {translate('pamm.explore.live')}
        </span>
        <span className={cx(chipClass, 'py-1 pl-1')}>
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-fg px-1.5 text-app tabular-nums">{plans.length}</span>
          {translate('pamm.explore.availablePlans')}
        </span>
      </div>
    </header>
  );
}

/* ───────────── Community balance (open band) ───────────── */

// Heartbeat trace: a faint line with a red pulse running along it, left to right.
function Heartbeat() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 28" preserveAspectRatio="none" className="mt-5 h-8 w-full max-w-md text-fg">
      <path d={HEARTBEAT_PATH} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path
        d={HEARTBEAT_PATH}
        fill="none"
        stroke={RED}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.16 0.84"
        vectorEffect="non-scaling-stroke"
        className="[animation:countdown_2.6s_linear_infinite_reverse] motion-reduce:[animation:none]"
      />
    </svg>
  );
}

function CommunityCard() {
  const avgGain = average(plans.map((plan) => plan.totalGain));
  const avgCommission = average(plans.map((plan) => plan.feePercent));
  const maxGain = Math.max(0, ...plans.map((plan) => Math.abs(plan.totalGain)));
  const maxFee = Math.max(0, ...plans.map((plan) => plan.feePercent));
  const stats: { icon: IconName; label: string; caption: string; value: ReactNode; meter: ReactNode }[] = [
    {
      icon: 'dashboard',
      label: translate('pamm.explore.availablePlans'),
      caption: translate('pamm.explore.browseAll'),
      value: <CountUp value={plans.length} format={(current) => String(Math.round(current))} />,
      // One pixel per plan.
      meter: (
        <span aria-hidden="true" className="flex flex-wrap gap-1">
          {plans.map((plan, index) => (
            <span key={plan.id} style={{ animationDelay: `${300 + index * 60}ms` }} className="zenith-pixel size-3 rounded-[3px] bg-fg" />
          ))}
        </span>
      ),
    },
    {
      icon: 'trendUp',
      label: translate('pamm.explore.avgGain'),
      caption: translate('pamm.explore.performance'),
      value: (
        <span className={toneClass(avgGain)}>
          <CountUp value={avgGain} format={formatPercent} />
        </span>
      ),
      // Average gain against the best plan's gain.
      meter: <CapsuleTrack percent={percentOf(avgGain, maxGain)} red={avgGain < 0} scan delayMs={350} />,
    },
    {
      icon: 'pieChart',
      label: translate('pamm.explore.avgCommission'),
      caption: translate('pamm.explore.platformAvg'),
      value: <CountUp value={avgCommission} format={(current) => `${current.toFixed(2)}%`} />,
      // Average commission against the highest plan fee.
      meter: <CapsuleTrack percent={percentOf(avgCommission, maxFee)} red delayMs={450} />,
    },
  ];

  return (
    <section style={staggerStyle(0, 150)} className="zenith-tile grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {translate('pamm.explore.communityAum')}
        </p>
        <p className="mt-4 truncate text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
          <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
        </p>
        <p className="mt-2 text-xs tracking-[0.18em] text-fg-muted uppercase">{translate('pamm.explore.totalLocked')}</p>
        <Heartbeat />
      </div>

      <dl className="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        {stats.map((stat, index) => (
          <div key={stat.label} style={staggerStyle(index, 300)} className="group/stat zenith-tile flex min-w-0 flex-col gap-3 sm:px-5 sm:first:pl-0 sm:last:pr-0">
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                {stepNumber(index)}
              </span>
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-fg/10 text-fg ring-1 ring-line transition-transform duration-300 group-hover/stat:-rotate-12">
                <Icon name={stat.icon} size={14} />
              </span>
            </div>
            <div className="min-w-0">
              <dd className="truncate text-3xl font-black tracking-tight text-fg tabular-nums">{stat.value}</dd>
              <dt className="truncate text-sm font-semibold text-fg">{stat.label}</dt>
              <dd className="truncate text-[10.5px] tracking-wide text-fg-muted uppercase">{stat.caption}</dd>
            </div>
            {stat.meter}
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Risk / return field ───────────── */

const FIELD_RINGS = ['w-[45%]', 'w-[90%]', 'w-[135%]'];

/**
 * Risk field: a pixel grid where the top-left corner is the sweet spot (high gain, no drawdown). A white sweep turns
 * around it, dashed rings spread from it, and each plan is a solid bead (white = gain, red = loss) with crosshairs.
 */
function RiskSonar({ items }: { items: FundPlan[] }) {
  const xMax = Math.max(...items.map((plan) => Math.abs(plan.maxDrawdown)), 0) * 1.4 || 1;
  const gains = items.map((plan) => plan.totalGain);
  const yHigh = Math.max(...gains, 0);
  const yLow = Math.min(...gains, 0);
  const yPad = (yHigh - yLow) * 0.25 || 1;
  const top = yHigh + yPad;
  const bottom = yLow - (yLow < 0 ? yPad : 0);
  const maxInvestors = Math.max(1, ...items.map((plan) => plan.investors));
  // Keep beads 8% clear of every edge so labels never touch the frame.
  const toX = (plan: FundPlan) => round2(8 + (Math.abs(plan.maxDrawdown) / xMax) * 84);
  const toY = (plan: FundPlan) => round2(8 + ((top - plan.totalGain) / (top - bottom)) * 84);
  const zeroY = round2(8 + (top / (top - bottom)) * 84);

  return (
    <section style={staggerStyle(1, 150)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5 sm:p-6')}>
      <PanelHead
        icon="trendUp"
        title={translate('pamm.explore.performance')}
        aside={
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-fg-muted ring-1 ring-line">
            <span aria-hidden="true" className="flex items-end gap-0.5">
              <span className="size-2 rounded-full bg-fg" />
              <span className="size-3 rounded-full bg-fg" />
            </span>
            {translate('pamm.explore.investors')}
          </p>
        }
      />

      <div className="mt-5 flex min-h-72 flex-1 gap-2">
        <p aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center">
          <span className="-rotate-90 text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap text-success uppercase">{translate('pamm.explore.totalGain')} ↑</span>
        </p>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative min-h-64 flex-1 overflow-hidden rounded-[22px] bg-fg/[0.02] ring-1 ring-line">
            {/* Pixel grid, fading out away from the sweet spot. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(circle_at_0%_0%,black,transparent_90%)]"
            />
            {FIELD_RINGS.map((width) => (
              <span key={width} aria-hidden="true" className={cx('pointer-events-none absolute top-0 left-0 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line-strong', width)} />
            ))}
            {/* The sweep: a white wedge turning around the sweet-spot corner. */}
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 size-0 motion-reduce:hidden">
              <span className="absolute -top-[600px] -left-[600px] size-[1200px] animate-rim-spin rounded-full bg-[conic-gradient(from_0deg,rgb(255_255_255/0.16),transparent_12%,transparent)]" />
            </span>
            <RedDot className="absolute top-3 left-3 size-3" />

            <span aria-hidden="true" style={{ top: `${zeroY}%` }} className="absolute inset-x-0 border-t border-line-strong" />
            <span aria-hidden="true" style={{ top: `${zeroY}%` }} className="absolute right-2 -translate-y-full pb-0.5 font-mono text-[10px] text-fg-subtle">
              0%
            </span>

            {items.map((plan, index) => {
              const size = round2(40 + (plan.investors / maxInvestors) * 22);
              const x = toX(plan);
              const y = toY(plan);
              const isGain = plan.totalGain >= 0;
              return (
                <div key={plan.id}>
                  {/* Crosshairs dropped from the bead to the gain axis and the drawdown axis. */}
                  <span aria-hidden="true" style={{ top: `${y}%`, width: `${x}%`, ...staggerStyle(index, 500) }} className="absolute left-0 origin-left animate-grow border-t border-dashed border-fg/30 motion-reduce:animate-none" />
                  <span aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, ...staggerStyle(index, 500) }} className="absolute bottom-0 animate-rise border-l border-dashed border-fg/30 motion-reduce:animate-none" />

                  <Link
                    href={`/pamm/fund-managers/${plan.id}`}
                    aria-label={`${plan.name}: ${translate('pamm.explore.totalGain')} ${formatPercent(plan.totalGain)}, ${translate('pamm.explore.maxDrawdown')} ${formatPercent(plan.maxDrawdown)}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  >
                    <span style={staggerStyle(index, 300)} className="relative block animate-dot-pop motion-reduce:animate-none">
                      <span
                        aria-hidden="true"
                        style={isGain ? undefined : { borderColor: RED }}
                        className="absolute -inset-3 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden"
                      />
                      <span
                        style={{ width: size, height: size, background: isGain ? undefined : RED }}
                        className={cx(
                          'relative grid place-items-center rounded-full text-xs font-black ring-4 ring-app transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none',
                          isGain ? 'bg-fg text-app' : 'text-white',
                        )}
                      >
                        {initials(plan.manager)}
                      </span>
                    </span>
                    <span
                      className={cx(
                        'pointer-events-none absolute top-1/2 w-max max-w-48 -translate-y-1/2 rounded-2xl px-3 py-2 text-left',
                        fieldChipClass,
                        x > 60 ? 'right-full mr-4' : 'left-full ml-4',
                      )}
                    >
                      <span className="block truncate text-[11px] font-bold uppercase">{plan.name}</span>
                      <span className="block font-mono text-[10.5px] text-fg-muted tabular-nums">
                        <span className={toneClass(plan.totalGain)}>{formatPercent(plan.totalGain)}</span> · {formatPercent(plan.maxDrawdown)} · {plan.investors}
                      </span>
                    </span>
                  </Link>
                </div>
              );
            })}

            {items.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-fg-muted">{translate('pamm.explore.emptyTitle')}</p>}
          </div>
          <div aria-hidden="true" className="flex items-center justify-between font-mono text-[10px] text-fg-subtle">
            <span>0%</span>
            <span className="font-sans font-semibold tracking-[0.16em] text-danger uppercase">{translate('pamm.explore.maxDrawdown')} →</span>
            <span>-{formatPercent(xMax).replace(/^[+-]/, '')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Plan tile ───────────── */

function ManagerAvatar({ name }: { name: string }) {
  return (
    <span className="relative grid size-13 shrink-0 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />
      <span className="relative grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line">
        <Avatar name={name} />
      </span>
      <LiveDot className="absolute right-0 bottom-0 rounded-full ring-2 ring-surface" />
    </span>
  );
}

// White capsule with a scanning light and a red arrow bead at its end.
function InvestButton({ size = 'md', onClick }: { size?: 'sm' | 'md'; onClick: () => void }) {
  const isMedium = size === 'md';
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className={cx(darkPillClass, 'relative z-20', isMedium ? 'h-12 w-full justify-between pr-1.5 pl-5 text-sm' : 'h-9 pr-1 pl-4 text-xs')}
    >
      <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-10 bg-white/40 motion-reduce:hidden" />
      <span className="relative">{translate('pamm.explore.invest')}</span>
      <span
        aria-hidden="true"
        style={{ background: RED }}
        className={cx('relative grid place-items-center rounded-full text-white', isMedium ? 'size-9' : 'size-7')}
      >
        <Icon name="arrowRight" size={isMedium ? 16 : 13} className="transition-transform duration-200 group-hover/pill:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </button>
  );
}

/**
 * Risk capsules: total gain and max drawdown as two capsule tracks on one scale (the larger of the two), gain in
 * white with a scanning light (red when negative), drawdown in Zenith red.
 */
function BalanceBeam({ plan }: { plan: FundPlan }) {
  const scale = Math.max(Math.abs(plan.totalGain), Math.abs(plan.maxDrawdown)) || 1;
  const rows = [
    { key: 'gain', label: translate('pamm.explore.totalGain'), value: plan.totalGain, red: plan.totalGain < 0, scan: true },
    { key: 'drawdown', label: translate('pamm.explore.maxDrawdown'), value: plan.maxDrawdown, red: true, scan: false },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, rowIndex) => (
        <div key={row.key} className="flex flex-col gap-1.5">
          <p className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-fg-muted">{row.label}</span>
            <span className={cx('font-bold tabular-nums', toneClass(row.value))}>{formatPercent(row.value)}</span>
          </p>
          <CapsuleTrack percent={percentOf(row.value, scale)} red={row.red} scan={row.scan} delayMs={200 + rowIndex * 150} />
        </div>
      ))}
    </div>
  );
}

function PlanTicket({ plan, index, onInvest }: { plan: FundPlan; index: number; onInvest: (plan: FundPlan) => void }) {
  const tilt = useTilt<HTMLElement>(5);
  const facts = [
    { key: 'min', label: translate('pamm.explore.minInvestment'), value: formatMoney(plan.minInvestment, 'USD') },
    { key: 'fee', label: translate('pamm.explore.fee'), value: `${plan.feePercent}%` },
    { key: 'investors', label: translate('pamm.explore.investors'), value: String(plan.investors) },
  ];

  return (
    // Rise lives on the wrapper so the tilt keeps control of the card's transform.
    <div style={staggerStyle(index, 250)} className="zenith-tile">
      <article {...tilt} className={cx(panelClass, 'group orbit-tilt flex h-full min-w-0 flex-col gap-5 p-5 transition-shadow duration-300 hover:ring-1 hover:ring-line-strong')}>
        <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
        <Link
          href={`/pamm/fund-managers/${plan.id}`}
          aria-label={plan.name}
          className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        />

        <div className="flex items-center gap-3">
          <ManagerAvatar name={plan.manager} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-wide text-fg uppercase" title={plan.name}>
              {plan.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-fg-muted">
              {plan.manager} · {translate('pamm.explore.active')} {plan.activeDays}D
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-fg/[0.06] px-2.5 py-1 text-[11px] font-semibold text-fg ring-1 ring-line-strong">
            <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-full" />
            {translate('pamm.explore.risk')} {plan.risk}
          </span>
        </div>

        <div className="flex flex-col gap-4 rounded-[22px] bg-fg/[0.03] p-4 ring-1 ring-line">
          <div>
            <p className={captionClass}>{translate('pamm.explore.totalPnl')}</p>
            <p className={cx('mt-1 truncate text-3xl font-black tracking-tight tabular-nums', toneClass(plan.totalPnl))}>
              <CountUp value={plan.totalPnl} format={signedMoney} />
            </p>
          </div>
          <BalanceBeam plan={plan} />
        </div>

        {/* Facts as three open columns split by hairlines. */}
        <dl className="grid grid-cols-3 divide-x divide-line">
          {facts.map((item, factIndex) => (
            <div key={item.key} className="flex min-w-0 flex-col gap-1 px-3 first:pl-0 last:pr-0">
              <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                {stepNumber(factIndex)}
              </span>
              <dd className="truncate text-sm font-bold text-fg tabular-nums">{item.value}</dd>
              <dt className="truncate text-[11px] text-fg-muted">{item.label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-auto">
          <InvestButton onClick={() => onInvest(plan)} />
        </div>
      </article>
    </div>
  );
}

/* ───────────── List view ───────────── */

function PlanTable({ items, onInvest }: { items: FundPlan[]; onInvest: (plan: FundPlan) => void }) {
  const headClass = 'px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-subtle';
  const cellClass = 'px-4 py-3.5 tabular-nums';

  return (
    <div className={cx(panelClass, 'zenith-tile overflow-x-auto')}>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-line bg-fg/[0.03]">
          <tr>
            <th scope="col" className={headClass}>{translate('pamm.explore.plan')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.totalGain')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.maxDrawdown')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.totalPnl')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.minInvestment')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.fee')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.investors')}</th>
            <th scope="col" className={headClass}>
              <span className="sr-only">{translate('pamm.explore.invest')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((plan, index) => {
            const scale = Math.max(Math.abs(plan.totalGain), Math.abs(plan.maxDrawdown)) || 1;
            return (
              <tr key={plan.id} style={staggerStyle(index, 150)} className="animate-feed-in transition-colors hover:bg-fg/[0.04] motion-reduce:animate-none">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                      {stepNumber(index)}
                    </span>
                    <ManagerAvatar name={plan.manager} />
                    <div className="min-w-0">
                      <Link
                        href={`/pamm/fund-managers/${plan.id}`}
                        className="block truncate font-bold text-fg uppercase underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {plan.name}
                      </Link>
                      <p className="text-xs text-fg-muted">
                        {plan.manager} · {translate('pamm.explore.active')} {plan.activeDays}D · {translate('pamm.explore.risk')} {plan.risk}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cx(cellClass, 'font-bold', toneClass(plan.totalGain))}>
                  <span className="flex min-w-24 flex-col gap-1.5">
                    {formatPercent(plan.totalGain)}
                    <CapsuleTrack percent={percentOf(plan.totalGain, scale)} red={plan.totalGain < 0} />
                  </span>
                </td>
                <td className={cx(cellClass, toneClass(plan.maxDrawdown))}>
                  <span className="flex min-w-24 flex-col gap-1.5">
                    {formatPercent(plan.maxDrawdown)}
                    <CapsuleTrack percent={percentOf(plan.maxDrawdown, scale)} red />
                  </span>
                </td>
                <td className={cx(cellClass, 'font-bold', toneClass(plan.totalPnl))}>{signedMoney(plan.totalPnl)}</td>
                <td className={cx(cellClass, 'text-fg')}>{formatMoney(plan.minInvestment, 'USD')}</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.investors}</td>
                <td className="px-4 py-3.5 text-right">
                  <InvestButton size="sm" onClick={() => onInvest(plan)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Controls ───────────── */

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

// Day-pill switch: separate capsules, the active one solid white with a red dot.
function SlidingToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.icon ? option.label : undefined}
            title={option.icon ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={cx(
              'relative inline-flex h-9 items-center justify-center gap-2 rounded-full text-xs font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
              option.icon ? 'w-10' : 'px-3.5',
              isActive ? 'bg-fg text-app shadow-[0_10px_20px_-12px_rgb(0_0_0/0.9)]' : 'text-fg-subtle ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            {option.icon ? <Icon name={option.icon} size={15} /> : option.label}
            {isActive && (
              <span aria-hidden="true" style={{ background: RED }} className={cx('size-1.5 rounded-full', option.icon && 'absolute top-1 right-1')} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Search capsule: a white bead that spins when the field takes focus, a numbered caption, and a red line that draws
 * itself under the field while it is focused.
 */
function SearchCapsule({ index, label, value, onChange }: { index: number; label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="group/search relative flex h-14 min-w-0 cursor-text items-center gap-3 rounded-full bg-fg/[0.04] pr-4 pl-2 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:ring-line-strong focus-within:bg-fg/[0.07] focus-within:ring-fg/40"
    >
      <span aria-hidden="true" className={cx(beadClass, 'size-10 transition-transform duration-700 group-focus-within/search:rotate-[360deg] motion-reduce:transition-none')}>
        <Icon name="search" size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span aria-hidden="true" className="font-mono text-[10px] leading-none text-fg-subtle">
          {stepNumber(index)}
        </span>
        <input
          id={id}
          type="search"
          value={value}
          aria-label={label}
          placeholder={label}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full min-w-0 bg-transparent text-sm font-semibold text-fg outline-none placeholder:font-medium placeholder:text-fg-subtle"
        />
      </span>
      {value && <span aria-hidden="true" style={{ background: RED }} className="size-2 shrink-0 animate-dot-pop rounded-full motion-reduce:animate-none" />}
      <span
        aria-hidden="true"
        style={{ background: RED }}
        className="pointer-events-none absolute inset-x-10 -bottom-px h-0.5 origin-center scale-x-0 rounded-full transition-transform duration-500 group-focus-within/search:scale-x-100 motion-reduce:transition-none"
      />
    </label>
  );
}

/* ───────────── Page ───────────── */

export default function FundManagersPage() {
  const [managerQuery, setManagerQuery] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [investPlan, setInvestPlan] = useState<FundPlan | null>(null);

  const filteredPlans = useMemo(() => {
    const managerNeedle = managerQuery.trim().toLowerCase();
    const planNeedle = planQuery.trim().toLowerCase();
    const direction = sortOrder === 'desc' ? -1 : 1;

    return plans
      .filter((plan) => plan.manager.toLowerCase().includes(managerNeedle))
      .filter((plan) => plan.name.toLowerCase().includes(planNeedle))
      .sort((left, right) => direction * (sortValue[sortKey](left) - sortValue[sortKey](right)));
  }, [managerQuery, planQuery, sortKey, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredPlans.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredPlans.slice(firstIndex, firstIndex + PAGE_SIZE);
  const rangeStart = filteredPlans.length === 0 ? 0 : firstIndex + 1;
  const rangeEnd = firstIndex + pageItems.length;

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  // Skeleton: open header, open community balance band, then the risk field beside a vertical filter dock, then the listing.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle />
      <CommunityCard />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <RiskSonar items={filteredPlans} />

        {/* Filter dock: the two searches, then sort and order as day-pill rows. */}
        <div style={staggerStyle(2, 150)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 sm:p-6')}>
          <PanelHead
            icon="search"
            title={translate('pamm.explore.filters')}
            aside={
              <button type="button" aria-pressed="true" className="inline-flex h-8 items-center gap-2 rounded-full bg-fg py-1 pr-1 pl-3 text-xs font-semibold text-app">
                {translate('pamm.explore.filterAll')}
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[var(--zenith-red)] px-1.5 text-white tabular-nums">{plans.length}</span>
              </button>
            }
          />
          <div className="flex flex-col gap-3">
            <SearchCapsule index={0} label={translate('pamm.explore.searchManager')} value={managerQuery} onChange={resetPageAnd(setManagerQuery)} />
            <SearchCapsule index={1} label={translate('pamm.explore.searchPlan')} value={planQuery} onChange={resetPageAnd(setPlanQuery)} />
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <p className={cx(captionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className="font-mono text-fg-subtle">03</span>
              {translate('pamm.explore.sortLabel')}
            </p>
            <SlidingToggle
              label={translate('pamm.explore.sortLabel')}
              value={sortKey}
              onChange={resetPageAnd(setSortKey)}
              options={[
                { value: 'gain', label: translate('pamm.explore.totalGain') },
                { value: 'drawdown', label: translate('pamm.explore.maxDrawdown') },
                { value: 'pnl', label: translate('pamm.explore.totalPnl') },
                { value: 'minInvestment', label: translate('pamm.explore.minInvestment') },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <p className={cx(captionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className="font-mono text-fg-subtle">04</span>
              {translate('pamm.explore.orderLabel')}
            </p>
            <SlidingToggle
              label={translate('pamm.explore.orderLabel')}
              value={sortOrder}
              onChange={resetPageAnd(setSortOrder)}
              options={[
                { value: 'desc', label: translate('pamm.explore.order.desc') },
                { value: 'asc', label: translate('pamm.explore.order.asc') },
              ]}
            />
          </div>
        </div>
      </div>

      <section aria-label={translate('nav.pammFundManagers')} style={staggerStyle(3, 150)} className="zenith-tile flex min-w-0 flex-col gap-5">
        {/* Listing bar: the visible range on the left, grid / list switch on the right, on one hairline. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <p className="inline-flex items-center gap-2 text-sm text-fg-muted" aria-live="polite">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--zenith-red)]" />
            {translate('pamm.explore.showing')}{' '}
            <span className="font-semibold text-fg tabular-nums">
              {rangeStart}–{rangeEnd}
            </span>{' '}
            {translate('pamm.explore.of')} <span className="font-semibold text-fg tabular-nums">{filteredPlans.length}</span>
          </p>
          <SlidingToggle
            label={translate('pamm.explore.viewGrid')}
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: translate('pamm.explore.viewGrid'), icon: 'dashboard' },
              { value: 'list', label: translate('pamm.explore.viewList'), icon: 'menu' },
            ]}
          />
        </div>

        {pageItems.length === 0 ? (
          <div className="flex animate-rise flex-col items-center gap-3 rounded-[28px] border border-dashed border-line-strong py-12 text-center motion-reduce:animate-none">
            <span aria-hidden="true" className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:animate-none" />
              <span className="absolute inset-2 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
              <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
                <Icon name="search" size={18} />
              </span>
            </span>
            <p className="text-sm font-medium text-fg">{translate('pamm.explore.emptyTitle')}</p>
          </div>
        ) : view === 'grid' ? (
          <div key="grid" className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {pageItems.map((plan, index) => (
              <PlanTicket key={plan.id} plan={plan} index={index} onInvest={setInvestPlan} />
            ))}
          </div>
        ) : (
          <PlanTable key="list" items={pageItems} onInvest={setInvestPlan} />
        )}

        {/* Pager capsule: arrows on the ends, the page counter in the middle with one pixel per page (current one red). */}
        <div className="flex justify-center sm:justify-end">
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-fg/[0.03] p-1.5">
            <PagerButton label={translate('pamm.explore.firstPage')} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={translate('pamm.explore.prevPage')} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-2 px-2 text-sm text-fg-muted">
              {translate('pamm.explore.page')}
              <span key={currentPage} className="grid size-9 animate-dot-pop place-items-center rounded-full bg-fg font-bold text-app tabular-nums motion-reduce:animate-none">
                {currentPage}
              </span>
              / {pageCount}
              <span aria-hidden="true" className="ml-1 hidden gap-1 sm:flex">
                {Array.from({ length: Math.min(pageCount, 8) }, (_, pixel) => (
                  <span key={pixel} className={cx('size-2 rounded-[2px]', pixel + 1 === currentPage ? 'bg-[var(--zenith-red)]' : 'bg-fg/20')} />
                ))}
              </span>
            </span>
            <PagerButton label={translate('pamm.explore.nextPage')} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={translate('pamm.explore.lastPage')} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </section>

      {investPlan && <InvestNowModal key={investPlan.id} plans={investPlanOptions} initialPlanId={investPlan.id} onClose={() => setInvestPlan(null)} />}
    </div>
  );
}
