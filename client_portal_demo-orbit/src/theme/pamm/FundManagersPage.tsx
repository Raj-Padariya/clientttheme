'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Input, Select } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { fundPlans, investPlanOptions, type FundPlan } from './fundManagersData';
import { InvestNowModal } from './InvestNowModal';
import { CountUp, LiveDot, staggerStyle } from './motion';

type SortKey = 'gain' | 'drawdown' | 'pnl' | 'minInvestment';
type SortOrder = 'desc' | 'asc';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 9;
const COMMUNITY_AUM = 202_700;
const eyebrow = 'text-[10.5px] font-semibold uppercase tracking-[0.16em]';
// Gauge geometry: two 270° arcs, gain on the outer ring and drawdown on the inner one.
const DIAL_OUTER = 52;
const DIAL_INNER = 41;
const DIAL_SWEEP = 0.75;

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

/* ───────────── Pulse column ───────────── */

function PulseRow({ icon, label, caption, children }: { icon: IconName; label: string; caption: string; children: ReactNode }) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-colors duration-300 hover:border-primary/25 hover:bg-primary/[0.06] motion-reduce:transition-none">
      <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="truncate text-sm font-medium text-fg">{label}</dt>
        <dd className="truncate text-[10.5px] tracking-wide text-fg-subtle uppercase">{caption}</dd>
      </div>
      <dd className="shrink-0 text-xl font-semibold tracking-tight text-fg tabular-nums">{children}</dd>
    </div>
  );
}

function PulseColumn() {
  const avgGain = average(plans.map((plan) => plan.totalGain));
  const avgCommission = average(plans.map((plan) => plan.feePercent));

  return (
    <section className="orbit-card relative isolate flex min-w-0 animate-rise flex-col overflow-hidden p-5 motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 -z-10 size-64 rounded-full bg-primary/20 blur-3xl animate-ring-breathe motion-reduce:animate-none" />

      <div className="flex items-center justify-between gap-3">
        <p className={cx(eyebrow, 'flex items-center gap-2 text-fg-subtle')}>
          <Icon name="wallet" size={13} className="text-primary" />
          {translate('pamm.explore.communityAum')}
        </p>
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          <LiveDot />
          {translate('pamm.explore.live')}
        </p>
      </div>
      <p className="mt-3 truncate bg-clip-text text-5xl font-semibold tracking-tight text-transparent tabular-nums [background-image:linear-gradient(180deg,var(--orbit-ink-top,#ffffff)_0%,var(--orbit-ink-mid,#e4dcff)_55%,var(--brand-primary)_100%)]">
        <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
      </p>
      <p className="mt-1 text-xs tracking-[0.18em] text-fg-subtle uppercase">{translate('pamm.explore.totalLocked')}</p>

      {/* Pulse line: a heartbeat trace under the headline figure. */}
      <svg aria-hidden="true" viewBox="0 0 200 24" preserveAspectRatio="none" className="mt-4 h-6 w-full">
        <path
          d="M0 12 H70 L78 4 L86 20 L94 8 L100 12 H200"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <dl className="mt-3 -mx-2 flex flex-col gap-1 border-t border-dashed border-line pt-3">
        <PulseRow icon="dashboard" label={translate('pamm.explore.availablePlans')} caption={translate('pamm.explore.browseAll')}>
          <CountUp value={plans.length} format={(current) => String(Math.round(current))} />
        </PulseRow>
        <PulseRow icon="trendUp" label={translate('pamm.explore.avgGain')} caption={translate('pamm.explore.performance')}>
          <span className={toneClass(avgGain)}>
            <CountUp value={avgGain} format={formatPercent} />
          </span>
        </PulseRow>
        <PulseRow icon="pieChart" label={translate('pamm.explore.avgCommission')} caption={translate('pamm.explore.platformAvg')}>
          <CountUp value={avgCommission} format={(current) => `${current.toFixed(2)}%`} />
        </PulseRow>
      </dl>
    </section>
  );
}

/* ───────────── Risk / return map ───────────── */

// Plots each plan by max drawdown (x, further right = deeper drawdown) against total gain (y); bubble size follows investors.
function RiskReturnMap({ items }: { items: FundPlan[] }) {
  const xMax = Math.max(...items.map((plan) => Math.abs(plan.maxDrawdown)), 0) * 1.4 || 1;
  const gains = items.map((plan) => plan.totalGain);
  const yHigh = Math.max(...gains, 0);
  const yLow = Math.min(...gains, 0);
  const yPad = (yHigh - yLow) * 0.25 || 1;
  const top = yHigh + yPad;
  const bottom = yLow - (yLow < 0 ? yPad : 0);
  const maxInvestors = Math.max(1, ...items.map((plan) => plan.investors));
  // Keep bubbles 8% clear of every edge so labels never touch the frame.
  const toX = (plan: FundPlan) => round2(8 + (Math.abs(plan.maxDrawdown) / xMax) * 84);
  const toY = (plan: FundPlan) => round2(8 + ((top - plan.totalGain) / (top - bottom)) * 84);
  const zeroY = round2(8 + (top / (top - bottom)) * 84);

  return (
    <section style={staggerStyle(1, 150)} className="orbit-card relative isolate flex min-w-0 animate-rise flex-col overflow-hidden p-5 motion-reduce:animate-none">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-fg">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon name="trendUp" size={15} />
          </span>
          {translate('pamm.explore.performance')}
        </h2>
        <p className="flex items-center gap-2 text-[11px] text-fg-subtle">
          <span aria-hidden="true" className="flex items-end gap-0.5">
            <span className="size-2 rounded-full border border-primary/60" />
            <span className="size-3 rounded-full border border-primary/60" />
          </span>
          {translate('pamm.explore.investors')}
        </p>
      </header>

      <div className="mt-4 flex min-h-72 flex-1 gap-2">
        <p aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center">
          <span className="-rotate-90 text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap text-success uppercase">
            {translate('pamm.explore.totalGain')} ↑
          </span>
        </p>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative min-h-64 flex-1 overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.02]">
            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(var(--glass-grid)_1px,transparent_1px),linear-gradient(90deg,var(--glass-grid)_1px,transparent_1px)] bg-[size:12.5%_25%]" />
            {/* Sweet spot glow: high gain, shallow drawdown. */}
            <span aria-hidden="true" className="absolute -top-16 -left-16 size-56 rounded-full bg-success/10 blur-3xl" />
            <span aria-hidden="true" style={{ top: `${zeroY}%` }} className="absolute inset-x-0 border-t border-dashed border-fg/25" />
            <span aria-hidden="true" style={{ top: `${zeroY}%` }} className="absolute left-2 -translate-y-full pb-0.5 font-mono text-[10px] text-fg-subtle">
              0%
            </span>

            {items.map((plan, index) => {
              const size = round2(40 + (plan.investors / maxInvestors) * 22);
              const x = toX(plan);
              return (
                <Link
                  key={plan.id}
                  href={`/pamm/fund-managers/${plan.id}`}
                  aria-label={`${plan.name}: ${translate('pamm.explore.totalGain')} ${formatPercent(plan.totalGain)}, ${translate('pamm.explore.maxDrawdown')} ${formatPercent(plan.maxDrawdown)}`}
                  style={{ left: `${x}%`, top: `${toY(plan)}%`, ...staggerStyle(index, 300) }}
                  className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 animate-rise rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:animate-none"
                >
                  <span aria-hidden="true" className="absolute -inset-3 rounded-full border border-primary/40 animate-ring-ripple motion-reduce:hidden" />
                  <span
                    style={{ width: size, height: size }}
                    className={cx(
                      'relative grid place-items-center rounded-full border text-xs font-bold backdrop-blur-md transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none',
                      plan.totalGain >= 0 ? 'border-success/60 bg-success/15 text-success shadow-[0_0_24px_-6px_var(--color-success)]' : 'border-danger/60 bg-danger/15 text-danger',
                    )}
                  >
                    {initials(plan.manager)}
                  </span>
                  <span
                    className={cx(
                      'pointer-events-none absolute top-1/2 w-max max-w-48 -translate-y-1/2 rounded-xl border border-fg/10 bg-surface/90 px-2.5 py-1.5 text-left shadow-pop backdrop-blur-md',
                      x > 60 ? 'right-full mr-3' : 'left-full ml-3',
                    )}
                  >
                    <span className="block truncate text-[11px] font-semibold text-fg uppercase">{plan.name}</span>
                    <span className="block font-mono text-[10.5px] text-fg-muted tabular-nums">
                      <span className={toneClass(plan.totalGain)}>{formatPercent(plan.totalGain)}</span> · {formatPercent(plan.maxDrawdown)} · {plan.investors}
                    </span>
                  </span>
                </Link>
              );
            })}

            {items.length === 0 && (
              <p className="absolute inset-0 grid place-items-center text-sm text-fg-muted">{translate('pamm.explore.emptyTitle')}</p>
            )}
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

/* ───────────── Plan dial card ───────────── */

function ManagerAvatar({ name }: { name: string }) {
  return (
    <span className="relative grid size-13 shrink-0 place-items-center">
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-orbit-spin-fast rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_45%,var(--orbit-violet))] motion-reduce:animate-none"
      />
      <span className="relative grid size-12 place-items-center rounded-full bg-surface">
        <Avatar name={name} />
      </span>
      <LiveDot className="absolute right-0.5 bottom-0.5 ring-2 ring-surface" />
    </span>
  );
}

function DialArc({ radius, share, className }: { radius: number; share: number; className: string }) {
  const circumference = 2 * Math.PI * radius;
  const sweep = circumference * DIAL_SWEEP;
  return (
    <>
      <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="7" strokeLinecap="round" stroke="currentColor" strokeDasharray={`${round2(sweep)} ${round2(circumference)}`} className="text-fg/[0.07]" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={`${round2(Math.max(sweep * share, 0.01))} ${round2(circumference)}`}
        className={className}
      />
    </>
  );
}

function PlanDialCard({ plan, index, onInvest }: { plan: FundPlan; index: number; onInvest: (plan: FundPlan) => void }) {
  const tilt = useTilt<HTMLElement>(5);
  const scale = Math.max(Math.abs(plan.totalGain), Math.abs(plan.maxDrawdown)) || 1;
  const facts = [
    { key: 'min', label: translate('pamm.explore.minInvestment'), value: formatMoney(plan.minInvestment, 'USD') },
    { key: 'fee', label: translate('pamm.explore.fee'), value: `${plan.feePercent}%` },
    { key: 'investors', label: translate('pamm.explore.investors'), value: String(plan.investors) },
  ];

  return (
    <article
      {...tilt}
      style={staggerStyle(index, 250)}
      className="group orbit-tilt relative isolate flex min-w-0 animate-rise flex-col overflow-hidden rounded-[26px] border border-fg/[0.08] bg-fg/[0.03] p-5 transition-colors duration-300 hover:border-primary/35 motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
      <Link
        href={`/pamm/fund-managers/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-[26px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="flex items-center gap-3">
        <ManagerAvatar name={plan.manager} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide text-fg uppercase" title={plan.name}>
            {plan.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {plan.manager} · {translate('pamm.explore.active')} {plan.activeDays}D
          </p>
        </div>
        <Badge tone="info" dot>
          {translate('pamm.explore.risk')} {plan.risk}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-36 shrink-0">
          {/* Rotated so the 270° sweep opens at the bottom like a gauge. */}
          <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full rotate-[135deg]">
            <DialArc radius={DIAL_OUTER} share={Math.abs(plan.totalGain) / scale} className={plan.totalGain >= 0 ? 'text-success' : 'text-danger'} />
            <DialArc radius={DIAL_INNER} share={Math.abs(plan.maxDrawdown) / scale} className="text-danger/80" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={cx('font-mono text-lg font-semibold tabular-nums', toneClass(plan.totalGain))}>{formatPercent(plan.totalGain)}</span>
            <span className="text-[9px] tracking-[0.12em] text-fg-subtle uppercase">{translate('pamm.explore.totalGain')}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('pamm.explore.totalPnl')}</p>
            <p className={cx('truncate text-2xl font-semibold tracking-tight tabular-nums', toneClass(plan.totalPnl))}>
              <CountUp value={plan.totalPnl} format={signedMoney} />
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 text-xs">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span aria-hidden="true" className={cx('h-1 w-3 rounded-full', plan.totalGain >= 0 ? 'bg-success' : 'bg-danger')} />
                {translate('pamm.explore.totalGain')}
              </span>
              <span className={cx('font-mono font-semibold tabular-nums', toneClass(plan.totalGain))}>{formatPercent(plan.totalGain)}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span aria-hidden="true" className="h-1 w-3 rounded-full bg-danger/80" />
                {translate('pamm.explore.maxDrawdown')}
              </span>
              <span className={cx('font-mono font-semibold tabular-nums', toneClass(plan.maxDrawdown))}>{formatPercent(plan.maxDrawdown)}</span>
            </li>
          </ul>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-fg/[0.08] bg-fg/[0.025] py-2.5 text-center">
        {facts.map((item) => (
          <div key={item.key} className="min-w-0 px-2">
            <dt className="truncate text-[10px] tracking-wide text-fg-subtle uppercase">{item.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <Button className="group/invest relative z-20 mt-4 overflow-hidden" fullWidth aria-haspopup="dialog" onClick={() => onInvest(plan)}>
        <span
          aria-hidden="true"
          className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/invest:translate-x-full motion-reduce:hidden"
        />
        {translate('pamm.explore.invest')}
        <Icon name="arrowRight" size={18} className="transition-transform duration-200 group-hover/invest:translate-x-1 motion-reduce:transition-none" />
      </Button>
    </article>
  );
}

/* ───────────── List view ───────────── */

function PlanTable({ items, onInvest }: { items: FundPlan[]; onInvest: (plan: FundPlan) => void }) {
  const headClass = 'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle';
  const cellClass = 'px-4 py-3 tabular-nums';

  return (
    <div className="animate-rise overflow-x-auto rounded-2xl border border-fg/[0.08] motion-reduce:animate-none">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-fg/[0.03]">
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
          {items.map((plan, index) => (
            <tr key={plan.id} style={staggerStyle(index, 150)} className="animate-feed-in transition-colors hover:bg-hover motion-reduce:animate-none">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ManagerAvatar name={plan.manager} />
                  <div className="min-w-0">
                    <Link
                      href={`/pamm/fund-managers/${plan.id}`}
                      className="block truncate font-semibold text-fg uppercase transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {plan.name}
                    </Link>
                    <p className="text-xs text-fg-muted">
                      {plan.manager} · {translate('pamm.explore.active')} {plan.activeDays}D · {translate('pamm.explore.risk')} {plan.risk}
                    </p>
                  </div>
                </div>
              </td>
              <td className={cx(cellClass, 'font-semibold', toneClass(plan.totalGain))}>{formatPercent(plan.totalGain)}</td>
              <td className={cx(cellClass, toneClass(plan.maxDrawdown))}>{formatPercent(plan.maxDrawdown)}</td>
              <td className={cx(cellClass, toneClass(plan.totalPnl))}>{signedMoney(plan.totalPnl)}</td>
              <td className={cx(cellClass, 'text-fg')}>{formatMoney(plan.minInvestment, 'USD')}</td>
              <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
              <td className={cx(cellClass, 'text-fg')}>{plan.investors}</td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" rightIcon="arrowRight" aria-haspopup="dialog" onClick={() => onInvest(plan)}>
                  {translate('pamm.explore.invest')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Console controls ───────────── */

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
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
    <div role="radiogroup" aria-label={label} className="relative grid h-10 auto-cols-fr grid-flow-col rounded-full border border-fg/10 bg-fg/[0.04] p-1">
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute inset-y-1 left-1 rounded-full border border-primary/40 bg-primary/25 transition-transform duration-300 ease-out motion-reduce:transition-none"
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
            value === option.value ? 'text-fg' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {option.icon ? <Icon name={option.icon} size={15} /> : option.label}
        </button>
      ))}
    </div>
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
      <PageHeader title={translate('nav.pammFundManagers')} />

      <div className="grid gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <PulseColumn />
        <RiskReturnMap items={filteredPlans} />
      </div>

      {/* Results console: filters, count, plans and pager live in one panel. */}
      <section aria-label={translate('nav.pammFundManagers')} style={staggerStyle(2, 150)} className="orbit-card flex min-w-0 animate-rise flex-col gap-5 p-4 motion-reduce:animate-none sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Icon name="search" size={15} className="text-primary" />
              {translate('pamm.explore.filters')}
            </h2>
            <button type="button" aria-pressed="true" className="inline-flex h-8 items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-3 text-xs font-semibold text-fg">
              {translate('pamm.explore.filterAll')}
              <span className="rounded-full bg-primary/30 px-1.5 tabular-nums">{plans.length}</span>
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_13rem_auto]">
          <Input
            type="search"
            leftIcon="search"
            aria-label={translate('pamm.explore.searchManager')}
            placeholder={translate('pamm.explore.searchManager')}
            value={managerQuery}
            onChange={(event) => resetPageAnd(setManagerQuery)(event.target.value)}
          />
          <Input
            type="search"
            leftIcon="search"
            aria-label={translate('pamm.explore.searchPlan')}
            placeholder={translate('pamm.explore.searchPlan')}
            value={planQuery}
            onChange={(event) => resetPageAnd(setPlanQuery)(event.target.value)}
          />
          <Select aria-label={translate('pamm.explore.sortLabel')} value={sortKey} onChange={(event) => resetPageAnd(setSortKey)(event.target.value as SortKey)}>
            <option value="gain">{translate('pamm.explore.sort.gain')}</option>
            <option value="drawdown">{translate('pamm.explore.sort.drawdown')}</option>
            <option value="pnl">{translate('pamm.explore.sort.pnl')}</option>
            <option value="minInvestment">{translate('pamm.explore.sort.minInvestment')}</option>
          </Select>
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

        <span aria-hidden="true" className="h-px bg-linear-to-r from-transparent via-line-strong to-transparent" />

        {pageItems.length === 0 ? (
          <div className="flex animate-rise flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line py-12 text-center motion-reduce:animate-none">
            <span className="flex size-14 animate-float items-center justify-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
              <Icon name="search" size={24} />
            </span>
            <p className="text-sm font-medium text-fg">{translate('pamm.explore.emptyTitle')}</p>
          </div>
        ) : view === 'grid' ? (
          <div key="grid" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {pageItems.map((plan, index) => (
              <PlanDialCard key={plan.id} plan={plan} index={index} onInvest={setInvestPlan} />
            ))}
          </div>
        ) : (
          <PlanTable key="list" items={pageItems} onInvest={setInvestPlan} />
        )}

        <div className="flex justify-center sm:justify-end">
          <div className="flex items-center gap-1 rounded-full border border-fg/10 bg-fg/[0.03] p-1">
            <PagerButton label={translate('pamm.explore.firstPage')} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={translate('pamm.explore.prevPage')} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('pamm.explore.page')}
              <span className="flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/25 font-semibold text-fg tabular-nums">
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
