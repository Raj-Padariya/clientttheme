'use client';

import { Fragment } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { LinkButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
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

// Net balance is capital plus P&L, so the strip reads as an equation.
const equation: { stat: PortfolioStat; operator: '+' | '=' | null }[] = [
  { stat: invested, operator: '+' },
  { stat: pnl, operator: '=' },
  { stat: balance, operator: null },
];

const DIAL = { size: 260, center: 130, tickOuter: 126, tickInner: 118, tickMajorInner: 111, track: 98 };
const TICK_COUNT = 60;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const ticks = Array.from({ length: TICK_COUNT }, (_, index) => {
  const angle = (index / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
  const isMajor = index % 5 === 0;
  const inner = isMajor ? DIAL.tickMajorInner : DIAL.tickInner;
  return {
    isMajor,
    x1: round2(DIAL.center + Math.cos(angle) * inner),
    y1: round2(DIAL.center + Math.sin(angle) * inner),
    x2: round2(DIAL.center + Math.cos(angle) * DIAL.tickOuter),
    y2: round2(DIAL.center + Math.sin(angle) * DIAL.tickOuter),
  };
});

const trackCircumference = round2(2 * Math.PI * DIAL.track);

/* ───────────── Allocation dial ───────────── */

// An empty allocation dial: the dashed track waits for the first plan, a comet sweeps it, and the core counts active plans.
function AllocationDial() {
  return (
    <div className="relative grid size-64 shrink-0 place-items-center sm:size-[17rem]">
      <span aria-hidden="true" className="absolute inset-10 animate-ring-breathe rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />

      <svg aria-hidden="true" viewBox={`0 0 ${DIAL.size} ${DIAL.size}`} className="absolute inset-0 size-full">
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            strokeLinecap="round"
            strokeWidth={tick.isMajor ? 2 : 1}
            className={tick.isMajor ? 'stroke-primary/60' : 'stroke-fg/15'}
          />
        ))}
        <circle cx={DIAL.center} cy={DIAL.center} r={DIAL.track} fill="none" strokeWidth={14} className="stroke-fg/[0.05]" />
        <circle cx={DIAL.center} cy={DIAL.center} r={DIAL.track} fill="none" strokeWidth={1.5} strokeDasharray="2 7" strokeLinecap="round" className="stroke-primary/45" />
      </svg>

      <svg aria-hidden="true" viewBox={`0 0 ${DIAL.size} ${DIAL.size}`} className="absolute inset-0 size-full animate-orbit-spin motion-reduce:hidden">
        <defs>
          <linearGradient id="invest-comet" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--brand-primary)" />
          </linearGradient>
        </defs>
        <circle
          cx={DIAL.center}
          cy={DIAL.center}
          r={DIAL.track}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          stroke="url(#invest-comet)"
          strokeDasharray={`${round2(trackCircumference * 0.16)} ${trackCircumference}`}
        />
      </svg>

      <div className="relative grid size-40 place-items-center rounded-full border border-primary/30 bg-surface/75 text-center shadow-[inset_0_0_36px_-12px_var(--brand-primary)] backdrop-blur-xl sm:size-44">
        <div className="flex flex-col items-center gap-1 px-3">
          <span className="grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <Icon name={activePlans.icon} size={15} />
          </span>
          <p className="text-5xl font-semibold tracking-tight text-fg tabular-nums">
            <CountUp value={activePlans.value} format={activePlans.format} />
          </p>
          <p className="text-xs font-medium text-fg-muted">{translate(activePlans.labelKey)}</p>
          <p className="rounded-full border border-fg/10 bg-fg/[0.04] px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
            {translate(activePlans.captionKey)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PortfolioStage() {
  return (
    <section className="orbit-card relative isolate grid animate-rise items-center gap-8 overflow-hidden p-6 motion-reduce:animate-none sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14 lg:p-10">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(var(--glass-grid)_1px,transparent_1px),linear-gradient(90deg,var(--glass-grid)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(70%_80%_at_25%_50%,#000,transparent)]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 -z-10 size-80 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -right-40 -bottom-56 -z-10 size-[30rem] animate-orbit-spin-rev motion-reduce:animate-none" />

      <div className="mx-auto">
        <AllocationDial />
      </div>

      <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
          <LiveDot />
          {translate('pamm.invest.snapshot')}
        </p>
        <h2 className="max-w-xl bg-clip-text text-3xl font-semibold tracking-tight text-transparent [background-image:linear-gradient(180deg,var(--orbit-ink-top,#ffffff)_0%,var(--orbit-ink-mid,#e4dcff)_60%,var(--brand-primary)_100%)] sm:text-4xl">
          {translate('pamm.invest.emptyTitle')}
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-fg-muted">{translate('pamm.invest.emptyText')}</p>
        <LinkButton href="/pamm/fund-managers" size="lg" className="group/browse relative mt-2 overflow-hidden">
          <span
            aria-hidden="true"
            className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/browse:translate-x-full motion-reduce:hidden"
          />
          <span className="relative">{translate('pamm.invest.browse')}</span>
          <Icon name="arrowRight" size={20} className="relative transition-transform duration-200 group-hover/browse:translate-x-1 motion-reduce:transition-none" />
        </LinkButton>
      </div>
    </section>
  );
}

/* ───────────── Portfolio equation ───────────── */

function EquationTerm({ stat, isResult, index }: { stat: PortfolioStat; isResult: boolean; index: number }) {
  return (
    <div
      style={staggerStyle(index, 120)}
      className={cx(
        'relative flex min-w-0 animate-rise flex-col gap-4 overflow-hidden rounded-3xl border p-5 motion-reduce:animate-none',
        isResult ? 'border-primary/35 bg-primary/[0.09] shadow-[inset_0_0_40px_-18px_var(--brand-primary)]' : 'border-fg/[0.08] bg-fg/[0.03]',
      )}
    >
      {isResult && <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-16 -right-16 size-40 animate-orbit-spin motion-reduce:animate-none" />}
      <div className="relative flex items-center justify-between gap-3">
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Icon name={stat.icon} size={17} />
        </span>
        <span className="rounded-full border border-fg/10 bg-fg/[0.04] px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
          {translate(stat.captionKey)}
        </span>
      </div>
      <div className="relative">
        <p className="text-sm text-fg-muted">{translate(stat.labelKey)}</p>
        <p className="mt-1 truncate text-3xl font-semibold tracking-tight text-fg tabular-nums">
          <CountUp value={stat.value} format={stat.format} />
        </p>
      </div>
      <span aria-hidden="true" className="relative h-px origin-left animate-grow bg-linear-to-r from-primary/70 to-transparent motion-reduce:animate-none" />
    </div>
  );
}

function OperatorBadge({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden="true"
      className="mx-auto grid size-11 shrink-0 place-items-center rounded-full border border-primary/35 bg-surface font-mono text-xl font-semibold text-primary shadow-[0_0_20px_-6px_var(--brand-primary)]"
    >
      {symbol}
    </span>
  );
}

function PortfolioEquation() {
  return (
    <section aria-label={translate('pamm.invest.snapshot')} style={staggerStyle(1, 150)} className="orbit-card animate-rise p-4 motion-reduce:animate-none sm:p-5">
      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        {equation.map(({ stat, operator }, index) => (
          <Fragment key={stat.key}>
            <EquationTerm stat={stat} isResult={operator === null} index={index} />
            {operator && <OperatorBadge symbol={operator} />}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

export default function InvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.pammInvestments')} />
      <PortfolioStage />
      <PortfolioEquation />
    </div>
  );
}
