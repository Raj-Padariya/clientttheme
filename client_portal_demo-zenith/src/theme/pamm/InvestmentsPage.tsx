'use client';

import Link from 'next/link';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUp, LiveDot, staggerStyle } from './motion';

interface PortfolioStat {
  key: string;
  icon: IconName;
  labelKey: MessageKey;
  captionKey: MessageKey;
  value: number;
  format: (current: number) => string;
}

const formatUsd = (amount: number) => formatMoney(amount, 'USD');

const invested: PortfolioStat = { key: 'invested', icon: 'wallet', labelKey: 'pamm.invest.totalInvested', captionKey: 'pamm.invest.yourCapital', value: 0, format: formatUsd };
const pnl: PortfolioStat = { key: 'pnl', icon: 'trendUp', labelKey: 'pamm.invest.totalPnl', captionKey: 'pamm.invest.allTime', value: 0, format: formatUsd };
const balance: PortfolioStat = { key: 'balance', icon: 'pieChart', labelKey: 'pamm.invest.netBalance', captionKey: 'pamm.invest.currentValue', value: 0, format: formatUsd };
const activePlans: PortfolioStat = {
  key: 'plans',
  icon: 'checkCircle',
  labelKey: 'pamm.invest.activePlans',
  captionKey: 'pamm.invest.liveSubscriptions',
  value: 0,
  format: (current) => String(Math.round(current)),
};

// Net balance is capital plus P&L, so the snapshot reads as a sum.
const terms: { stat: PortfolioStat; operator: '+' | null }[] = [
  { stat: invested, operator: null },
  { stat: pnl, operator: '+' },
];

// Three empty plan slots drawn in the rack; purely decorative until the first subscription exists.
const SLOT_ROWS = [16, 66, 116];

const RED = 'var(--zenith-red)';
const panelClass = 'orbit-card relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-fg/[0.04] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
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
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammInvestments')}</h2>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className={chipClass}>
          <LiveDot />
          {translate('pamm.invest.snapshot')}
        </span>
        <span className={cx(chipClass, 'py-1 pl-1')}>
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-fg px-1.5 text-app tabular-nums">{activePlans.format(activePlans.value)}</span>
          <Icon name={activePlans.icon} size={13} />
          {translate(activePlans.labelKey)}
        </span>
      </div>
    </header>
  );
}

/* ───────────── Snapshot: open balance + equation ───────────── */

// One term of the equation: a capsule tile with its index, icon bead, label, caption and value.
function TermTile({ stat, index }: { stat: PortfolioStat; index: number }) {
  return (
    <div style={staggerStyle(index, 250)} className="group/row zenith-tile flex min-w-0 flex-col gap-4 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-line transition-colors duration-300 hover:ring-line-strong">
      <div className="flex items-center justify-between">
        <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
          {stepNumber(index)}
        </span>
        <span aria-hidden="true" className={cx(beadClass, 'size-10 transition-transform duration-300 group-hover/row:-rotate-12 motion-reduce:transition-none')}>
          <Icon name={stat.icon} size={16} />
        </span>
      </div>
      <p className="truncate text-2xl font-black tracking-tight text-fg tabular-nums">
        <CountUp value={stat.value} format={stat.format} />
      </p>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{translate(stat.labelKey)}</p>
        <p className={cx(captionClass, 'mt-0.5 truncate')}>{translate(stat.captionKey)}</p>
      </div>
    </div>
  );
}

function OperatorBead({ symbol, red = false }: { symbol: string; red?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={red ? { background: RED } : undefined}
      className={cx('grid size-10 shrink-0 place-items-center self-center rounded-full font-mono text-lg font-black', red ? 'text-white' : 'text-fg ring-1 ring-line-strong')}
    >
      {symbol}
    </span>
  );
}

function PortfolioReceipt() {
  const total = Math.abs(invested.value) + Math.abs(pnl.value);
  const investedShare = total === 0 ? 0 : (Math.abs(invested.value) / total) * 100;

  return (
    <section aria-label={translate('pamm.invest.snapshot')} style={staggerStyle(1, 150)} className="zenith-tile flex flex-col gap-8">
      {/* Open balance: the net figure stands on its own, no card. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="pieChart" size={14} />
            </span>
            {translate('pamm.invest.snapshot')}
            <LiveDot />
          </h2>
          <p className="mt-4 truncate text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
            <CountUp value={balance.value} format={balance.format} />
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
            <span className="font-semibold text-fg">{translate(balance.labelKey)}</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-fg/30" />
            <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase">{translate(balance.captionKey)}</span>
          </p>
        </div>

        {/* Capital split capsule: invested in white, P&L in red; idle with a scanning light while both are zero. */}
        <div aria-hidden="true" className="w-full max-w-sm">
          <div className="flex items-center justify-between text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-fg" />
              {translate(invested.labelKey)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span style={{ background: RED }} className="size-2 rounded-full" />
              {translate(pnl.labelKey)}
            </span>
          </div>
          <span className="relative mt-2 flex h-4 overflow-hidden rounded-full bg-fg/10 p-0.5">
            {total > 0 ? (
              <>
                <span style={{ width: `${investedShare}%` }} className="zenith-capsule h-full origin-left rounded-full bg-fg" />
                <span style={{ width: `${100 - investedShare}%`, background: RED, animationDelay: '200ms' }} className="zenith-capsule ml-0.5 h-full origin-left rounded-full" />
              </>
            ) : (
              <span className="zenith-scan-x absolute inset-y-0 left-0 w-12 bg-white/30" />
            )}
          </span>
        </div>
      </div>

      {/* The sum: Invested + P&L = Net balance, as capsule tiles on one line. */}
      <div className="flex flex-col gap-3">
        <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.15fr)]">
          {terms.map(({ stat, operator }, index) => (
            <div key={stat.key} className="contents">
              {operator && <OperatorBead symbol={operator} />}
              <TermTile stat={stat} index={index} />
            </div>
          ))}
          <OperatorBead symbol="=" red />
          <div style={staggerStyle(2, 400)} className="zenith-tile flex min-w-0 flex-col gap-4 rounded-[26px] bg-fg p-4 text-app">
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="font-mono text-[10px] opacity-60">
                {stepNumber(terms.length)}
              </span>
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-app text-fg">
                <Icon name={balance.icon} size={16} className="animate-rim-spin [animation-duration:6s] motion-reduce:animate-none" />
              </span>
            </div>
            <p className="truncate text-2xl font-black tracking-tight tabular-nums">
              <CountUp value={balance.value} format={balance.format} />
            </p>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{translate(balance.labelKey)}</p>
              <p className="truncate text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">{translate(balance.captionKey)}</p>
            </div>
          </div>
        </div>

        {/* Double rule drawn left to right under the sum. */}
        <div aria-hidden="true" className="flex flex-col gap-1">
          <span className="h-px origin-left animate-grow bg-fg/50 [animation-delay:600ms] motion-reduce:animate-none" />
          <span className="h-px origin-left animate-grow bg-fg/50 [animation-delay:750ms] motion-reduce:animate-none" />
        </div>
      </div>
    </section>
  );
}

/* ───────────── Plan slots rack ───────────── */

/**
 * Empty plan rack: dashed capsule slots with marching borders, a red scan line sweeping down them and a blinking red
 * bead per slot, waiting for the first plan. The active-plan count sits on top of the rack.
 */
function PlanSlots() {
  return (
    <div className="flex w-full max-w-64 shrink-0 flex-col items-center gap-3 rounded-[28px] bg-fg/[0.03] p-4 text-fg ring-1 ring-line">
      <div className="flex w-full items-center justify-between">
        <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
          <Icon name={activePlans.icon} size={14} />
        </span>
        <span className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.12em] text-fg-muted uppercase ring-1 ring-line-strong">
          {translate(activePlans.captionKey)}
        </span>
      </div>
      <p className="text-7xl leading-none font-black tracking-tighter tabular-nums">
        <CountUp value={activePlans.value} format={activePlans.format} />
      </p>
      <p className="-mt-1 text-xs font-semibold text-fg-muted">{translate(activePlans.labelKey)}</p>

      <svg aria-hidden="true" viewBox="0 0 200 168" className="w-full">
        <defs>
          <linearGradient id="zenith-slot-scan" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff4a3d" stopOpacity="0" />
            <stop offset="100%" stopColor="#ff4a3d" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {SLOT_ROWS.map((y, index) => (
          <g key={y}>
            <rect x="4" y={y} width="192" height="38" rx="19" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.25" strokeDasharray="5 5">
              <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.4s" repeatCount="indefinite" />
            </rect>
            <circle cx="23" cy={y + 19} r="11" fill="currentColor" fillOpacity="0.1" />
            <text x="23" y={y + 19} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fillOpacity="0.6" className="font-mono text-[8px] font-bold">
              {stepNumber(index)}
            </text>
            {/* Skeleton text as pixel rows. */}
            {Array.from({ length: index === 1 ? 9 : 11 }, (_, cell) => (
              <rect key={cell} x={42 + cell * 10} y={y + 11} width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.14" />
            ))}
            {Array.from({ length: index === 1 ? 5 : 7 }, (_, cell) => (
              <rect key={`s${cell}`} x={42 + cell * 10} y={y + 22} width="7" height="5" rx="1.5" fill="currentColor" fillOpacity="0.08" />
            ))}
            <circle cx="178" cy={y + 19} r="5" fill="#ff4a3d" fillOpacity="0.2">
              <animate attributeName="fill-opacity" values="0.15;0.95;0.15" dur="1.8s" begin={`${index * 0.45}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        <g className="motion-reduce:hidden">
          <rect x="0" y="0" width="200" height="26" fill="url(#zenith-slot-scan)">
            <animate attributeName="y" values="4;140;4" dur="3.6s" repeatCount="indefinite" />
          </rect>
          <rect x="0" y="0" width="200" height="2" rx="1" fill="#ff4a3d" fillOpacity="0.85">
            <animate attributeName="y" values="30;166;30" dur="3.6s" repeatCount="indefinite" />
          </rect>
        </g>
      </svg>
    </div>
  );
}

/* ───────────── Empty state ───────────── */

function PortfolioFrost() {
  return (
    <section style={staggerStyle(2, 150)} className={cx(panelClass, 'zenith-tile p-6 sm:p-8')}>
      {/* Pixel matrix bleeding in from the right edge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--color-line-strong)_1.4px,transparent_1.6px)] [background-size:12px_12px] [mask-image:linear-gradient(to_left,#000,transparent_55%)]"
      />
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <p className={cx(chipClass, 'text-[10.5px] tracking-[0.14em] uppercase')}>
            <LiveDot />
            {translate('pamm.invest.snapshot')}
          </p>
          <h2 className="max-w-md text-3xl font-black tracking-tight text-fg sm:text-4xl">{translate('pamm.invest.emptyTitle')}</h2>
          <p className="max-w-md text-sm leading-relaxed text-fg-muted">{translate('pamm.invest.emptyText')}</p>
          <Link
            href="/pamm/fund-managers"
            className="group/browse relative mt-2 inline-flex h-12 items-center gap-3 overflow-hidden rounded-full bg-fg pr-1.5 pl-6 text-sm font-bold text-app transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgb(0_0_0/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-10 bg-white/40 motion-reduce:hidden" />
            <span className="relative">{translate('pamm.invest.browse')}</span>
            <span
              aria-hidden="true"
              style={{ background: RED }}
              className="relative grid size-9 place-items-center rounded-full text-white transition-transform duration-300 group-hover/browse:-rotate-45 motion-reduce:transition-none"
            >
              <Icon name="arrowRight" size={15} />
            </span>
          </Link>
        </div>
        <PlanSlots />
      </div>
    </section>
  );
}

export default function InvestmentsPage() {
  // Skeleton: open header, open snapshot band (balance + sum), then the empty-state panel with the plan rack.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle />
      <PortfolioReceipt />
      <PortfolioFrost />
    </div>
  );
}
