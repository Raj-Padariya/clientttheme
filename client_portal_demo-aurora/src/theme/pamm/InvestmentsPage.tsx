'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUp, LiveDot, staggerStyle } from './motion';
import '../promotion/market.css';
import './desk.css';

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

// Three empty position rows in the blotter; purely decorative until the first subscription exists.
const BLOTTER_ROWS = [0, 1, 2];
// Split meter: one tick per slot, coloured by the invested / P&L share.
const SPLIT_TICKS = 32;

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-lg bg-fg/[0.04] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'grid shrink-0 place-items-center rounded-xl bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const gridLinesClass = '[background-image:linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] [background-size:100%_25%]';

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function ClayDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

/* ───────────── Title ───────────── */

// Depth chart sides: cumulative size stepping down toward the mid price (bids) and back up away from it (asks).
const BID_STEPS = [70, 62, 54, 49, 40, 33, 24, 16];
const ASK_STEPS = [14, 22, 29, 38, 44, 53, 60, 68];
const DEPTH_WIDTH = 240;
const DEPTH_BASE = 86;
const DEPTH_MID = DEPTH_WIDTH / 2;
const DEPTH_STEP = (DEPTH_MID - 6) / BID_STEPS.length;

function depthArea(levels: number[], startX: number, direction: 1 | -1): string {
  let path = `M${startX} ${DEPTH_BASE}`;
  levels.forEach((level, index) => {
    const x = startX + direction * index * DEPTH_STEP;
    path += ` V${DEPTH_BASE - level} H${x + direction * DEPTH_STEP}`;
  });
  return `${path} V${DEPTH_BASE} Z`;
}

/** Order-book depth chart: sage bids and clay asks breathe either side of a pulsing mid-price marker. */
function DepthChart() {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${DEPTH_WIDTH} 96`} className="w-full max-w-xs shrink-0 overflow-visible">
      {[30, 58].map((y) => (
        <line key={y} x1={0} x2={DEPTH_WIDTH} y1={y} y2={y} strokeDasharray="2 5" className="stroke-fg/10" />
      ))}
      <g className="desk-breathe">
        <path d={depthArea(BID_STEPS, 0, 1)} strokeWidth={1.5} strokeLinejoin="round" className="fill-(--hero-buy)/20 stroke-(--hero-buy)" />
      </g>
      <g className="desk-breathe" style={{ '--breathe-delay': '1.2s' } as CSSProperties}>
        <path d={depthArea(ASK_STEPS, DEPTH_WIDTH, -1)} strokeWidth={1.5} strokeLinejoin="round" className="fill-(--aurora-cta-from)/20 stroke-(--aurora-cta-from)" />
      </g>
      <line x1={DEPTH_MID} x2={DEPTH_MID} y1={6} y2={DEPTH_BASE} strokeDasharray="3 3" className="mkt-march stroke-fg/50" />
      <line x1={0} x2={DEPTH_WIDTH} y1={DEPTH_BASE} y2={DEPTH_BASE} className="stroke-line-strong" />
      <circle cx={DEPTH_MID} cy={8} r={6} className="animate-ping-soft fill-fg/40 [transform-box:fill-box] origin-center motion-reduce:hidden" />
      <circle cx={DEPTH_MID} cy={8} r={4} className="fill-fg" />
    </svg>
  );
}

function PageTitle() {
  return (
    <header className="zenith-tile flex flex-col gap-6 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <ClayDot className="size-1.5" />
          {translate('nav.pamm')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammInvestments')}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={chipClass}>
            <LiveDot />
            {translate('pamm.invest.snapshot')}
          </span>
          <span className={cx(chipClass, 'py-1 pl-1')}>
            <span className="grid h-6 min-w-6 place-items-center rounded-md bg-(--hero-buy) px-1.5 font-mono text-[#062520] tabular-nums">{activePlans.format(activePlans.value)}</span>
            <Icon name={activePlans.icon} size={13} />
            {translate(activePlans.labelKey)}
          </span>
        </div>
      </div>
      <DepthChart />
    </header>
  );
}

/* ───────────── Snapshot: P&L waterfall ───────────── */

interface WaterfallBar {
  stat: PortfolioStat;
  bottom: number;
  height: number;
  fill: string;
}

// Bar geometry in percent of the plot. With no money in yet, ghost bars keep the waterfall's shape readable.
function waterfallBars(): { bars: WaterfallBar[]; isGhost: boolean } {
  const afterPnl = invested.value + pnl.value;
  const scale = Math.max(Math.abs(invested.value), Math.abs(afterPnl), Math.abs(balance.value));
  const pnlFill = pnl.value < 0 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)/70';
  if (scale === 0) {
    return {
      isGhost: true,
      bars: [
        { stat: invested, bottom: 0, height: 55, fill: '' },
        { stat: pnl, bottom: 55, height: 22, fill: '' },
        { stat: balance, bottom: 0, height: 77, fill: '' },
      ],
    };
  }
  const toPercent = (value: number) => (Math.max(value, 0) / scale) * 92;
  return {
    isGhost: false,
    bars: [
      { stat: invested, bottom: 0, height: toPercent(invested.value), fill: 'bg-(--hero-buy)' },
      { stat: pnl, bottom: toPercent(Math.min(invested.value, afterPnl)), height: (Math.abs(pnl.value) / scale) * 92, fill: pnlFill },
      { stat: balance, bottom: 0, height: toPercent(balance.value), fill: 'bg-fg' },
    ],
  };
}

// The connector between two columns: a dashed level line carrying the operator.
function OperatorGutter({ symbol, level, isTotal = false }: { symbol: string; level: number; isTotal?: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex items-center justify-center md:h-40 md:w-12 md:items-start">
      <span style={{ bottom: `${level}%` }} className="absolute inset-x-0 hidden border-t-2 border-dashed border-line-strong md:block" />
      <span
        style={{ bottom: `${level}%` }}
        className={cx(
          'relative grid size-9 place-items-center rounded-lg font-mono text-base font-black md:absolute md:left-1/2 md:-translate-x-1/2 md:translate-y-1/2',
          isTotal ? 'bg-(--aurora-cta-from) text-[#062520]' : 'bg-app text-fg ring-1 ring-line-strong',
        )}
      >
        {symbol}
      </span>
    </span>
  );
}

// One waterfall column: the bar in its plot, then its index, icon, counting value, label and caption.
function WaterfallColumn({ bar, index, isGhost, isTotal }: { bar: WaterfallBar; index: number; isGhost: boolean; isTotal: boolean }) {
  const { stat } = bar;
  return (
    <div style={staggerStyle(index, 250)} className="group/col zenith-tile flex min-w-0 flex-col gap-4">
      <span aria-hidden="true" className={cx('relative block h-40 overflow-hidden rounded-xl bg-fg/[0.03] ring-1 ring-line', gridLinesClass)}>
        <span
          style={{ bottom: `${bar.bottom}%`, height: `${bar.height}%`, '--candle-delay': `${300 + index * 220}ms` } as CSSProperties}
          className={cx(
            'mkt-candle absolute inset-x-[22%] overflow-hidden rounded-md transition-[inset] duration-300 group-hover/col:inset-x-[18%] motion-reduce:transition-none',
            isGhost ? 'border-2 border-dashed border-line-strong bg-fg/[0.04]' : bar.fill,
          )}
        >
          <span className={cx('mkt-sweep absolute inset-y-0 w-8 -skew-x-12', isGhost ? 'bg-fg/10' : 'bg-white/25')} style={{ animationDelay: `${index * 0.8}s` }} />
        </span>
      </span>
      <div className={cx('flex flex-col gap-3 rounded-xl p-3', isTotal ? 'bg-fg text-app' : 'bg-fg/[0.03] ring-1 ring-line')}>
        <div className="flex items-center justify-between">
          <span aria-hidden="true" className={cx('font-mono text-[10px]', isTotal ? 'opacity-60' : 'text-fg-subtle')}>
            {stepNumber(index)}
          </span>
          <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-lg', isTotal ? 'bg-app text-fg' : beadClass)}>
            <Icon name={stat.icon} size={15} className={isTotal ? 'animate-rim-spin [animation-duration:6s] motion-reduce:animate-none' : undefined} />
          </span>
        </div>
        <p className={cx('truncate font-mono text-2xl font-black tracking-tight tabular-nums', !isTotal && 'text-fg')}>
          <CountUp value={stat.value} format={stat.format} />
        </p>
        <div className="min-w-0">
          <p className={cx('truncate text-sm font-semibold', !isTotal && 'text-fg')}>{translate(stat.labelKey)}</p>
          <p className={cx('mt-0.5 truncate text-[10.5px] font-semibold tracking-[0.14em] uppercase', isTotal ? 'opacity-70' : 'text-fg-subtle')}>{translate(stat.captionKey)}</p>
        </div>
      </div>
    </div>
  );
}

function PortfolioWaterfall() {
  const total = Math.abs(invested.value) + Math.abs(pnl.value);
  const investedTicks = total === 0 ? 0 : Math.round((Math.abs(invested.value) / total) * SPLIT_TICKS);
  const { bars, isGhost } = waterfallBars();
  const [investedBar, pnlBar, balanceBar] = bars;

  return (
    <section aria-label={translate('pamm.invest.snapshot')} style={staggerStyle(1, 150)} className={cx(panelClass, 'zenith-tile flex flex-col gap-8 p-6 sm:p-8')}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="pieChart" size={14} />
            </span>
            {translate('pamm.invest.snapshot')}
            <LiveDot />
          </h2>
          <p className="mt-4 truncate font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
            <CountUp value={balance.value} format={balance.format} />
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
            <span className="font-semibold text-fg">{translate(balance.labelKey)}</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-fg/30" />
            <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase">{translate(balance.captionKey)}</span>
          </p>
        </div>

        {/* Capital split as a tick meter: invested ticks in sage, P&L ticks in clay; idle ticks pump while both are zero. */}
        <div aria-hidden="true" className="w-full max-w-sm">
          <div className="flex items-center justify-between text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-(--hero-buy)" />
              {translate(invested.labelKey)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-(--aurora-cta-from)" />
              {translate(pnl.labelKey)}
            </span>
          </div>
          <span className="mt-2 flex h-8 items-end gap-[3px] rounded-lg bg-fg/[0.04] p-1.5 ring-1 ring-line">
            {Array.from({ length: SPLIT_TICKS }, (_, index) => {
              if (total === 0) {
                return <span key={index} style={{ height: '100%', '--vol-delay': `${(index % 8) * 0.11}s` } as CSSProperties} className="mkt-vol flex-1 rounded-[2px] bg-fg/15" />;
              }
              const isInvested = index < investedTicks;
              return (
                <span
                  key={index}
                  style={{ '--candle-delay': `${index * 25}ms` } as CSSProperties}
                  className={cx('mkt-candle h-full flex-1 rounded-[2px]', isInvested ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')}
                />
              );
            })}
          </span>
        </div>
      </div>

      {/* The sum as a waterfall: Invested, then P&L floating on top of it, settling into the Net balance bar. */}
      <div className="flex flex-col gap-3">
        <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.15fr)] md:gap-0">
          <WaterfallColumn bar={investedBar} index={0} isGhost={isGhost} isTotal={false} />
          <OperatorGutter symbol="+" level={investedBar.height} />
          <WaterfallColumn bar={pnlBar} index={1} isGhost={isGhost} isTotal={false} />
          <OperatorGutter symbol="=" level={pnlBar.bottom + pnlBar.height} isTotal />
          <WaterfallColumn bar={balanceBar} index={2} isGhost={isGhost} isTotal />
        </div>

        {/* Settlement double rule drawn left to right under the sum. */}
        <div aria-hidden="true" className="flex flex-col gap-1">
          <span className="h-px origin-left animate-grow bg-(--hero-buy)/60 [animation-delay:600ms] motion-reduce:animate-none" />
          <span className="h-px origin-left animate-grow bg-(--hero-buy)/60 [animation-delay:750ms] motion-reduce:animate-none" />
        </div>
      </div>
    </section>
  );
}

/* ───────────── Positions blotter ───────────── */

/**
 * Empty positions blotter: the active-plan count on top, then three dashed position rows with skeleton cells and a
 * blinking clay "awaiting" dot each, while a sage scan line runs down them waiting for the first plan.
 */
function PositionsBlotter() {
  return (
    <div className="flex w-full max-w-72 shrink-0 flex-col gap-3 rounded-2xl bg-black/20 p-4 text-fg ring-1 ring-line light:bg-fg/[0.03]">
      <div className="flex w-full items-center justify-between">
        <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
          <Icon name={activePlans.icon} size={14} />
        </span>
        <span className="rounded-md px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.12em] text-fg-muted uppercase ring-1 ring-line-strong">
          {translate(activePlans.captionKey)}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-7xl leading-none font-black tracking-tighter tabular-nums">
          <CountUp value={activePlans.value} format={activePlans.format} />
        </p>
        <p className="pb-1 text-right text-xs font-semibold text-fg-muted">{translate(activePlans.labelKey)}</p>
      </div>

      <div aria-hidden="true" className="relative mt-1 flex flex-col gap-2 font-mono">
        {/* Column header as skeleton cells: index · plan · P&L. */}
        <span className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 border-b border-line px-2 pb-2">
          <span className="h-1.5 w-3 rounded-full bg-fg/20" />
          <span className="h-1.5 w-12 rounded-full bg-fg/20" />
          <span className="h-1.5 w-full rounded-full bg-fg/20" />
        </span>
        {BLOTTER_ROWS.map((row) => (
          <span key={row} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 overflow-hidden rounded-lg border border-dashed border-line-strong bg-fg/[0.02] px-2 py-2.5">
            <span className="text-[9px] font-bold text-fg-subtle">{stepNumber(row)}</span>
            <span className="flex flex-col gap-1">
              <span style={{ width: `${row === 1 ? 60 : 80}%` }} className="h-1.5 rounded-full bg-fg/15" />
              <span style={{ width: `${row === 1 ? 35 : 50}%` }} className="h-1 rounded-full bg-fg/10" />
            </span>
            <span className="flex items-center justify-end gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-fg/15" />
              <span style={{ animationDelay: `${row * 0.35}s` }} className="mkt-blink size-2 rounded-full bg-(--aurora-cta-from)" />
            </span>
            <span style={{ animationDelay: `${row * 1.1}s` }} className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-(--hero-buy)/10" />
          </span>
        ))}
        <span className="desk-scan-y pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-(--hero-buy) shadow-[0_0_0_3px_color-mix(in_oklab,var(--hero-buy)_20%,transparent)]" />
      </div>
    </div>
  );
}

// Faint candles bleeding in from the right edge of the empty-state panel.
const BACKDROP_CANDLES = Array.from({ length: 18 }, (_, index) => {
  const mid = 50 + Math.sin(index * 0.9) * 18 - index * 0.8;
  const body = 8 + ((index * 5) % 12);
  return { x: 6 + index * 11, top: mid - body / 2, body, isUp: index % 3 !== 1 };
});

/* ───────────── Empty state ───────────── */

function PortfolioEmpty() {
  return (
    <section style={staggerStyle(2, 150)} className={cx(panelClass, 'zenith-tile p-6 sm:p-8')}>
      <svg
        aria-hidden="true"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-2/3 [mask-image:linear-gradient(to_left,#000,transparent)]"
      >
        {BACKDROP_CANDLES.map((candle, index) => (
          <g key={candle.x} className="mkt-candle" style={{ '--candle-delay': `${index * 70}ms` } as CSSProperties}>
            <line x1={candle.x} x2={candle.x} y1={candle.top - 6} y2={candle.top + candle.body + 6} strokeWidth={0.8} className={candle.isUp ? 'stroke-(--hero-buy)/25' : 'stroke-(--aurora-cta-from)/25'} />
            <rect x={candle.x - 3} y={candle.top} width={6} height={candle.body} rx={1} className={candle.isUp ? 'fill-(--hero-buy)/20' : 'fill-(--aurora-cta-from)/20'} />
          </g>
        ))}
      </svg>
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
            className="group/browse relative mt-2 inline-flex h-12 items-center gap-3 overflow-hidden rounded-full bg-(--hero-buy) pr-1.5 pl-6 text-sm font-bold text-[#062520] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgb(0_0_0/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/40" />
            <span className="relative">{translate('pamm.invest.browse')}</span>
            <span
              aria-hidden="true"
              className="relative grid size-9 place-items-center rounded-full bg-(--aurora-cta-from) text-[#062520] transition-transform duration-300 group-hover/browse:-rotate-45 motion-reduce:transition-none"
            >
              <Icon name="arrowRight" size={15} />
            </span>
          </Link>
        </div>
        <PositionsBlotter />
      </div>
    </section>
  );
}

export default function InvestmentsPage() {
  // Skeleton: header with the depth chart, the waterfall snapshot panel, then the empty state with the positions blotter.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle />
      <PortfolioWaterfall />
      <PortfolioEmpty />
    </div>
  );
}
