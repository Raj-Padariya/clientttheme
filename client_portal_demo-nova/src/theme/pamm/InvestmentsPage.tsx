'use client';

import Link from 'next/link';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

// Net balance is capital plus P&L, so the receipt reads as a sum.
const terms: { stat: PortfolioStat; operator: '+' | null }[] = [
  { stat: invested, operator: null },
  { stat: pnl, operator: '+' },
];

// Three empty plan slots drawn in the instrument; purely decorative until the first subscription exists.
const SLOT_ROWS = [16, 66, 116];

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

/* ───────────── Title ───────────── */

function PageTitle() {
  return (
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={captionClass}>{translate('nav.pamm')}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.pammInvestments')}</h2>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className={chipClass}>
          <LiveDot />
          {translate('pamm.invest.snapshot')}
        </span>
        <span className={chipClass}>
          <Icon name={activePlans.icon} size={13} />
          <span className="tabular-nums">{activePlans.format(activePlans.value)}</span>
          {translate(activePlans.labelKey)}
        </span>
      </div>
    </header>
  );
}

/* ───────────── Plan slots instrument ───────────── */

/**
 * Empty plan rack: dashed slots with marching borders and a scanner sweeping down them, waiting for the first plan.
 * The active-plan count sits on top of the rack.
 */
function PlanSlots() {
  return (
    <div className={cx('flex w-full max-w-60 shrink-0 flex-col items-center gap-3 rounded-[24px] bg-white/45 p-4 ring-1 ring-white/80 backdrop-blur-md', inkClass)}>
      <div className="flex w-full items-center justify-between">
        <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
          <Icon name={activePlans.icon} size={14} />
        </span>
        <span className={cx('rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.12em] uppercase ring-1 ring-[#0a1220]/15', inkMutedClass)}>
          {translate(activePlans.captionKey)}
        </span>
      </div>
      <p className="text-6xl leading-none font-black tracking-tight tabular-nums">
        <CountUp value={activePlans.value} format={activePlans.format} />
      </p>
      <p className={cx('-mt-1 text-xs font-semibold', inkMutedClass)}>{translate(activePlans.labelKey)}</p>

      <svg aria-hidden="true" viewBox="0 0 200 168" className="w-full">
        <defs>
          <linearGradient id="nova-slot-scan" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0a1220" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a1220" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        {SLOT_ROWS.map((y, index) => (
          <g key={y}>
            <rect x="4" y={y} width="192" height="38" rx="19" fill="#ffffff" fillOpacity="0.45" stroke="#0a1220" strokeOpacity="0.35" strokeWidth="1.25" strokeDasharray="5 5">
              <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.4s" repeatCount="indefinite" />
            </rect>
            <circle cx="23" cy={y + 19} r="10" fill="none" stroke="#0a1220" strokeOpacity="0.3" strokeDasharray="3 3" />
            <text x="23" y={y + 19} textAnchor="middle" dominantBaseline="middle" className="fill-[#4b5a70] font-mono text-[8px] font-bold">
              {stepNumber(index)}
            </text>
            <rect x="42" y={y + 12} width={index === 1 ? 90 : 110} height="5" rx="2.5" fill="#0a1220" fillOpacity="0.12" />
            <rect x="42" y={y + 22} width={index === 1 ? 54 : 70} height="4" rx="2" fill="#0a1220" fillOpacity="0.08" />
            <circle cx="178" cy={y + 19} r="5" fill="#0a1220" fillOpacity="0.15">
              <animate attributeName="fill-opacity" values="0.1;0.45;0.1" dur="1.8s" begin={`${index * 0.45}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        <g className="motion-reduce:hidden">
          <rect x="0" y="0" width="200" height="26" fill="url(#nova-slot-scan)">
            <animate attributeName="y" values="4;140;4" dur="3.6s" repeatCount="indefinite" />
          </rect>
          <rect x="0" y="0" width="200" height="1.5" fill="#0a1220" fillOpacity="0.55">
            <animate attributeName="y" values="30;166;30" dur="3.6s" repeatCount="indefinite" />
          </rect>
        </g>
      </svg>
    </div>
  );
}

/* ───────────── Empty-state frost card ───────────── */

function PortfolioFrost() {
  return (
    <FrostCard className="h-full">
      <div className={cx('flex h-full flex-col items-center gap-8 sm:p-2 md:flex-row md:items-center md:justify-between', inkClass)}>
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <p className={cx(inkCaptionClass, 'inline-flex items-center gap-2 rounded-full px-3 py-1.5', frostChipClass)}>
            <LiveDot />
            {translate('pamm.invest.snapshot')}
          </p>
          <h2 className="max-w-md text-3xl font-black tracking-[-0.03em] sm:text-4xl">{translate('pamm.invest.emptyTitle')}</h2>
          <p className={cx('max-w-md text-sm leading-relaxed', inkMutedClass)}>{translate('pamm.invest.emptyText')}</p>
          <Link
            href="/pamm/fund-managers"
            className="group/browse relative mt-2 inline-flex h-12 items-center gap-2 overflow-hidden rounded-full bg-[#0a1220] pr-2 pl-6 text-sm font-bold text-white transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgb(10_18_32/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/25 to-transparent motion-reduce:hidden" />
            <span className="relative">{translate('pamm.invest.browse')}</span>
            <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-full bg-white text-[#0a1220] transition-transform duration-300 group-hover/browse:-rotate-45 motion-reduce:transition-none">
              <Icon name="arrowRight" size={15} />
            </span>
          </Link>
        </div>
        <PlanSlots />
      </div>
    </FrostCard>
  );
}

/* ───────────── Portfolio receipt ───────────── */

function ReceiptRow({ stat, operator, index }: { stat: PortfolioStat; operator: '+' | null; index: number }) {
  return (
    <div style={staggerStyle(index, 250)} className="group/row flex animate-feed-in items-center gap-3 py-4 motion-reduce:animate-none">
      <span aria-hidden="true" className="w-4 text-center font-mono text-lg font-bold text-fg-subtle">
        {operator}
      </span>
      <span aria-hidden="true" className={cx(beadClass, 'size-10 transition-transform duration-300 group-hover/row:-rotate-12 motion-reduce:transition-none')}>
        <Icon name={stat.icon} size={16} />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2">
          <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</span>
          <span className="truncate text-sm font-semibold text-fg">{translate(stat.labelKey)}</span>
        </p>
        <p className={cx(captionClass, 'mt-0.5 truncate')}>{translate(stat.captionKey)}</p>
      </div>
      <span aria-hidden="true" className="min-w-4 flex-1 border-t border-dotted border-line-strong" />
      <p className="shrink-0 text-xl font-black tracking-tight text-fg tabular-nums">
        <CountUp value={stat.value} format={stat.format} />
      </p>
    </div>
  );
}

function PortfolioReceipt() {
  return (
    <section
      aria-label={translate('pamm.invest.snapshot')}
      style={staggerStyle(1, 150)}
      // Scalloped bottom edge, like a torn-off till receipt.
      className={cx(panelClass, 'flex animate-rise flex-col px-5 pt-5 pb-8 motion-reduce:animate-none sm:px-6 [mask:radial-gradient(circle_at_8px_100%,transparent_6px,#000_6.5px)_0_0/16px_100%_no-repeat_repeat-x,linear-gradient(#000,#000)_0_0/100%_calc(100%-8px)_no-repeat]')}
    >
      <header className="flex items-center justify-between gap-3 border-b border-dashed border-line-strong pb-4">
        <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-fg">
          <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
            <Icon name="pieChart" size={15} />
          </span>
          {translate('pamm.invest.snapshot')}
        </h2>
        <LiveDot />
      </header>

      <div className="flex flex-col divide-y divide-dotted divide-line-strong">
        {terms.map(({ stat, operator }, index) => (
          <ReceiptRow key={stat.key} stat={stat} operator={operator} index={index} />
        ))}
      </div>

      {/* Double rule drawn left to right, then the total. */}
      <div aria-hidden="true" className="flex flex-col gap-1">
        <span className="h-px origin-left animate-grow bg-fg/60 [animation-delay:600ms] motion-reduce:animate-none" />
        <span className="h-px origin-left animate-grow bg-fg/60 [animation-delay:750ms] motion-reduce:animate-none" />
      </div>

      <div style={staggerStyle(2, 400)} className="mt-4 flex animate-rise items-center gap-3 rounded-[22px] bg-fg p-4 text-app motion-reduce:animate-none">
        <span aria-hidden="true" className="w-4 text-center font-mono text-lg font-bold opacity-70">
          =
        </span>
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-app text-fg">
          <Icon name={balance.icon} size={16} className="animate-rim-spin [animation-duration:6s] motion-reduce:animate-none" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{translate(balance.labelKey)}</p>
          <p className="truncate text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">{translate(balance.captionKey)}</p>
        </div>
        <p className="shrink-0 text-2xl font-black tracking-tight tabular-nums">
          <CountUp value={balance.value} format={balance.format} />
        </p>
      </div>
    </section>
  );
}

export default function InvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:items-start">
        <PortfolioFrost />
        <PortfolioReceipt />
      </div>
    </div>
  );
}
