'use client';

import Link from 'next/link';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const darkPillClass =
  'group/pill relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-fg font-semibold text-app transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

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
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={captionClass}>{translate('nav.pamm')}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.pammFundManagers')}</h2>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className={chipClass}>
          <LiveDot />
          {translate('pamm.explore.live')}
        </span>
        <span className={chipClass}>
          <Icon name="dashboard" size={13} />
          <span className="tabular-nums">{plans.length}</span>
          {translate('pamm.explore.availablePlans')}
        </span>
      </div>
    </header>
  );
}

/* ───────────── Community frost card ───────────── */

// Heartbeat trace: a faint line with a bright pulse running along it, left to right.
function Heartbeat() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 28" preserveAspectRatio="none" className="mt-5 h-7 w-full">
      <path d={HEARTBEAT_PATH} fill="none" stroke="#0a1220" strokeOpacity="0.18" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path
        d={HEARTBEAT_PATH}
        fill="none"
        stroke="#0a1220"
        strokeWidth="2.25"
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
  const stats: { icon: IconName; label: string; caption: string; value: ReactNode }[] = [
    {
      icon: 'dashboard',
      label: translate('pamm.explore.availablePlans'),
      caption: translate('pamm.explore.browseAll'),
      value: <CountUp value={plans.length} format={(current) => String(Math.round(current))} />,
    },
    {
      icon: 'trendUp',
      label: translate('pamm.explore.avgGain'),
      caption: translate('pamm.explore.performance'),
      value: (
        <span className={avgGain >= 0 ? 'text-[#13784a]' : 'text-[#b4233c]'}>
          <CountUp value={avgGain} format={formatPercent} />
        </span>
      ),
    },
    {
      icon: 'pieChart',
      label: translate('pamm.explore.avgCommission'),
      caption: translate('pamm.explore.platformAvg'),
      value: <CountUp value={avgCommission} format={(current) => `${current.toFixed(2)}%`} />,
    },
  ];

  return (
    <FrostCard className="h-full">
      <div className={cx('flex h-full flex-col justify-between gap-6 sm:p-2', inkClass)}>
        <div>
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name="wallet" size={14} />
            </span>
            {translate('pamm.explore.communityAum')}
          </p>
          <p className="mt-3 truncate text-5xl font-black tracking-tight tabular-nums sm:text-6xl">
            <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
          </p>
          <p className={cx('mt-1 text-xs tracking-[0.18em] uppercase', inkMutedClass)}>{translate('pamm.explore.totalLocked')}</p>
          <Heartbeat />
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={staggerStyle(index, 300)}
              className="group/stat flex min-w-0 animate-rise flex-col gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-white/80 backdrop-blur-md transition-colors hover:bg-white/70 motion-reduce:animate-none"
            >
              <div className="flex items-center justify-between">
                <span aria-hidden="true" className={cx('font-mono text-[10px]', inkMutedClass)}>
                  {stepNumber(index)}
                </span>
                <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full transition-transform duration-300 group-hover/stat:-rotate-12', frostChipClass)}>
                  <Icon name={stat.icon} size={14} />
                </span>
              </div>
              <div className="min-w-0">
                <dd className="truncate text-2xl font-black tabular-nums">{stat.value}</dd>
                <dt className="truncate text-sm font-semibold">{stat.label}</dt>
                <dd className={cx('truncate text-[10.5px] tracking-wide uppercase', inkMutedClass)}>{stat.caption}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </FrostCard>
  );
}

/* ───────────── Risk / return sonar ───────────── */

const SONAR_RINGS = ['w-[45%]', 'w-[90%]', 'w-[135%]'];

/**
 * Sonar map: the top-left corner is the sweet spot (high gain, no drawdown). A sweep turns around it, distance
 * rings spread out from it, and each plan is a glossy bead with crosshairs dropped to both axes.
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
    <section style={staggerStyle(1, 150)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6')}>
      <PanelHead
        icon="trendUp"
        title={translate('pamm.explore.performance')}
        aside={
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-fg-muted ring-1 ring-line">
            <span aria-hidden="true" className="flex items-end gap-0.5">
              <span className="nova-gloss size-2 rounded-full" />
              <span className="nova-gloss size-3 rounded-full" />
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
          <div className="relative min-h-64 flex-1 overflow-hidden rounded-2xl bg-surface-2/20 ring-1 ring-line">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(var(--color-line-strong)_1px,transparent_1.5px)] [background-size:16px_16px] [mask-image:radial-gradient(circle_at_0%_0%,black,transparent_85%)]"
            />
            {SONAR_RINGS.map((width) => (
              <span key={width} aria-hidden="true" className={cx('pointer-events-none absolute top-0 left-0 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line-strong', width)} />
            ))}
            {/* The sweep: a soft ice wedge turning around the sweet-spot corner. */}
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 size-0 motion-reduce:hidden">
              <span className="absolute -top-[600px] -left-[600px] size-[1200px] animate-rim-spin rounded-full bg-[conic-gradient(from_0deg,rgb(127_166_220/0.28),transparent_14%,transparent)]" />
            </span>
            <span aria-hidden="true" className="absolute top-3 left-3 flex size-3">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-success/60 motion-reduce:hidden" />
              <span className="relative size-3 rounded-full bg-success ring-2 ring-surface" />
            </span>

            <span aria-hidden="true" style={{ top: `${zeroY}%` }} className="absolute inset-x-0 border-t border-line-strong" />
            <span aria-hidden="true" style={{ top: `${zeroY}%` }} className="absolute right-2 -translate-y-full pb-0.5 font-mono text-[10px] text-fg-subtle">
              0%
            </span>

            {items.map((plan, index) => {
              const size = round2(40 + (plan.investors / maxInvestors) * 22);
              const x = toX(plan);
              const y = toY(plan);
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
                      <span aria-hidden="true" className="absolute -inset-3 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden" />
                      <span
                        style={{ width: size, height: size }}
                        className={cx(
                          'nova-gloss relative grid place-items-center rounded-full text-xs font-black text-fg ring-2 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none',
                          plan.totalGain >= 0 ? 'ring-success/70' : 'ring-danger/70',
                        )}
                      >
                        {initials(plan.manager)}
                      </span>
                    </span>
                    <span
                      className={cx(
                        'pointer-events-none absolute top-1/2 w-max max-w-48 -translate-y-1/2 rounded-2xl px-3 py-2 text-left',
                        frostChipClass,
                        x > 60 ? 'right-full mr-4' : 'left-full ml-4',
                      )}
                    >
                      <span className="block truncate text-[11px] font-bold uppercase">{plan.name}</span>
                      <span className={cx('block font-mono text-[10.5px] tabular-nums', inkMutedClass)}>
                        <span className={plan.totalGain >= 0 ? 'text-[#13784a]' : 'text-[#b4233c]'}>{formatPercent(plan.totalGain)}</span> · {formatPercent(plan.maxDrawdown)} · {plan.investors}
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

/* ───────────── Plan ticket ───────────── */

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

function InvestButton({ size = 'md', onClick }: { size?: 'sm' | 'md'; onClick: () => void }) {
  return (
    <button type="button" aria-haspopup="dialog" onClick={onClick} className={cx(darkPillClass, 'relative z-20', size === 'md' ? 'h-11 w-full px-5 text-sm' : 'h-9 px-4 text-xs')}>
      <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />
      <span className="relative">{translate('pamm.explore.invest')}</span>
      <Icon name="arrowRight" size={size === 'md' ? 16 : 13} className="relative transition-transform duration-200 group-hover/pill:translate-x-1 motion-reduce:transition-none" />
    </button>
  );
}

/**
 * Balance beam: zero in the middle, drawdown pulls a red bead left and total gain pushes a bead right, both scaled
 * against the larger of the two. Tracks use top offsets, not translate, so the grow animation can own `transform`.
 */
function BalanceBeam({ plan }: { plan: FundPlan }) {
  const scale = Math.max(Math.abs(plan.totalGain), Math.abs(plan.maxDrawdown)) || 1;
  const gainShare = (Math.abs(plan.totalGain) / scale) * 46;
  const drawdownShare = (Math.abs(plan.maxDrawdown) / scale) * 46;
  const gainColor = plan.totalGain >= 0 ? 'bg-success' : 'bg-danger';

  return (
    <div>
      <div aria-hidden="true" className="relative h-8">
        <span className="absolute inset-x-0 top-[calc(50%-1.5px)] h-[3px] rounded-full bg-line" />
        <span className="absolute top-[calc(50%-8px)] left-1/2 h-4 w-px bg-line-strong" />
        <span style={{ width: `${drawdownShare}%` }} className="absolute top-[calc(50%-1.5px)] right-1/2 h-[3px] origin-right animate-grow rounded-full bg-danger/80 motion-reduce:animate-none" />
        <span style={{ width: `${gainShare}%` }} className={cx('absolute top-[calc(50%-1.5px)] left-1/2 h-[3px] origin-left animate-grow rounded-full motion-reduce:animate-none', gainColor)} />
        <span style={{ left: `calc(${50 - drawdownShare}% - 6px)` }} className="absolute top-[calc(50%-6px)] size-3 rounded-full bg-danger ring-2 ring-surface" />
        <span style={{ left: `calc(${50 + gainShare}% - 6px)` }} className="absolute top-[calc(50%-6px)] size-3">
          <span className={cx('absolute inset-0 animate-ping-soft rounded-full opacity-60 motion-reduce:hidden', gainColor)} />
          <span className={cx('absolute inset-0 rounded-full ring-2 ring-surface', gainColor)} />
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 text-xs">
        <p className="min-w-0">
          <span className="block truncate text-fg-muted">{translate('pamm.explore.maxDrawdown')}</span>
          <span className={cx('font-bold tabular-nums', toneClass(plan.maxDrawdown))}>{formatPercent(plan.maxDrawdown)}</span>
        </p>
        <p className="min-w-0 text-right">
          <span className="block truncate text-fg-muted">{translate('pamm.explore.totalGain')}</span>
          <span className={cx('font-bold tabular-nums', toneClass(plan.totalGain))}>{formatPercent(plan.totalGain)}</span>
        </p>
      </div>
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
    <div style={staggerStyle(index, 250)} className="animate-rise motion-reduce:animate-none">
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
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-fg ring-1 ring-line-strong">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-fg" />
            {translate('pamm.explore.risk')} {plan.risk}
          </span>
        </div>

        <div className="relative border-y border-dotted border-line-strong py-4">
          {/* Ticket notches punched into both edges along the lower perforation. */}
          <span aria-hidden="true" className="absolute -bottom-3 -left-8 size-6 rounded-full bg-app ring-1 ring-line" />
          <span aria-hidden="true" className="absolute -right-8 -bottom-3 size-6 rounded-full bg-app ring-1 ring-line" />
          <p className={captionClass}>{translate('pamm.explore.totalPnl')}</p>
          <p className={cx('mt-1 truncate text-3xl font-black tracking-tight tabular-nums', toneClass(plan.totalPnl))}>
            <CountUp value={plan.totalPnl} format={signedMoney} />
          </p>
          <div className="mt-3">
            <BalanceBeam plan={plan} />
          </div>
        </div>

        <dl className="flex flex-col gap-2.5">
          {facts.map((item, factIndex) => (
            <div key={item.key} className="flex items-center gap-3 text-sm">
              <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                {stepNumber(factIndex)}
              </span>
              <dt className="text-fg-muted">{item.label}</dt>
              <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
              <dd className="font-bold text-fg tabular-nums">{item.value}</dd>
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
    <div className={cx(panelClass, 'animate-rise overflow-x-auto motion-reduce:animate-none')}>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-dotted border-line-strong">
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
        <tbody className="divide-y divide-dotted divide-line-strong">
          {items.map((plan, index) => (
            <tr key={plan.id} style={staggerStyle(index, 150)} className="animate-feed-in transition-colors hover:bg-surface-2/40 motion-reduce:animate-none">
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
              <td className={cx(cellClass, 'font-bold', toneClass(plan.totalGain))}>{formatPercent(plan.totalGain)}</td>
              <td className={cx(cellClass, toneClass(plan.maxDrawdown))}>{formatPercent(plan.maxDrawdown)}</td>
              <td className={cx(cellClass, 'font-bold', toneClass(plan.totalPnl))}>{signedMoney(plan.totalPnl)}</td>
              <td className={cx(cellClass, 'text-fg')}>{formatMoney(plan.minInvestment, 'USD')}</td>
              <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
              <td className={cx(cellClass, 'text-fg')}>{plan.investors}</td>
              <td className="px-4 py-3.5 text-right">
                <InvestButton size="sm" onClick={() => onInvest(plan)} />
              </td>
            </tr>
          ))}
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
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative grid h-10 auto-cols-fr grid-flow-col rounded-full border border-line bg-surface-2/40 p-1 backdrop-blur-xl">
      {/* Silver pill sliding with a small overshoot. */}
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute inset-y-1 left-1 rounded-full bg-fg shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1.2)] motion-reduce:transition-none"
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.icon ? option.label : undefined}
          title={option.icon ? option.label : undefined}
          onClick={() => onChange(option.value)}
          className={cx(
            'relative flex items-center justify-center rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
            value === option.value ? 'text-app' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {option.icon ? <Icon name={option.icon} size={15} /> : option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Search capsule: a glossy bead that spins when the field takes focus, a numbered caption, and a silver line that
 * draws itself under the field while it is focused.
 */
function SearchCapsule({ index, label, value, onChange }: { index: number; label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="group/search relative flex h-14 min-w-0 cursor-text items-center gap-3 rounded-full bg-surface-2/40 pr-4 pl-2 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:ring-line-strong focus-within:bg-surface-2/70 focus-within:ring-fg/40"
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
      {value && <span aria-hidden="true" className="size-2 shrink-0 animate-dot-pop rounded-full bg-success motion-reduce:animate-none" />}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 -bottom-px h-px origin-center scale-x-0 bg-fg transition-transform duration-500 group-focus-within/search:scale-x-100 motion-reduce:transition-none"
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <CommunityCard />
        <RiskSonar items={filteredPlans} />
      </div>

      <section aria-label={translate('nav.pammFundManagers')} style={staggerStyle(2, 150)} className="flex min-w-0 animate-rise flex-col gap-5 motion-reduce:animate-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-fg">
              <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
                <Icon name="search" size={15} />
              </span>
              {translate('pamm.explore.filters')}
            </h2>
            <button type="button" aria-pressed="true" className="inline-flex h-8 items-center gap-2 rounded-full bg-fg py-1 pr-1 pl-3 text-xs font-semibold text-app">
              {translate('pamm.explore.filterAll')}
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-app px-1.5 text-fg tabular-nums">{plans.length}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-fg-muted" aria-live="polite">
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
        </div>

        {/* Filter dock: two search capsules on top, then the sort switch and order switch on a dotted rail. */}
        <div className={cx(panelClass, 'flex flex-col gap-4 p-4 sm:p-5')}>
          <div className="grid gap-3 md:grid-cols-2">
            <SearchCapsule index={0} label={translate('pamm.explore.searchManager')} value={managerQuery} onChange={resetPageAnd(setManagerQuery)} />
            <SearchCapsule index={1} label={translate('pamm.explore.searchPlan')} value={planQuery} onChange={resetPageAnd(setPlanQuery)} />
          </div>

          <div className="flex flex-col gap-3 border-t border-dotted border-line-strong pt-4 lg:flex-row lg:items-center">
            <p className={cx(captionClass, 'flex shrink-0 items-center gap-2')}>
              <span aria-hidden="true" className="font-mono text-fg-subtle">03</span>
              {translate('pamm.explore.sortLabel')}
            </p>
            <div className="min-w-0 overflow-x-auto">
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
            <span aria-hidden="true" className="hidden flex-1 border-t border-dotted border-line-strong lg:block" />
            <p className={cx(captionClass, 'flex shrink-0 items-center gap-2')}>
              <span aria-hidden="true" className="font-mono text-fg-subtle">04</span>
              {translate('pamm.explore.orderLabel')}
            </p>
            <div className="shrink-0">
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

        <div className="flex justify-center sm:justify-end">
          <div className="flex items-center gap-1.5">
            <PagerButton label={translate('pamm.explore.firstPage')} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={translate('pamm.explore.prevPage')} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-2 px-2 text-sm text-fg-muted">
              {translate('pamm.explore.page')}
              <span key={currentPage} className="grid size-9 animate-dot-pop place-items-center rounded-full bg-fg font-bold text-app tabular-nums motion-reduce:animate-none">
                {currentPage}
              </span>
              / {pageCount}
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
