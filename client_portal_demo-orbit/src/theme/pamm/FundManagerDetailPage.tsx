'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { fundDetailText as text, fundPlans, getFundDetail, investPlanOptions, type FundDetail, type FundTrade } from './fundManagersData';
import { InvestNowModal } from './InvestNowModal';
import { CountUp, LiveDot, staggerStyle } from './motion';

const RANGES = [
  { id: '1W', days: 7 },
  { id: '1M', days: 30 },
  { id: '3M', days: 90 },
  { id: '6M', days: 180 },
  { id: '1Y', days: 365 },
  { id: 'All', days: null },
] as const;
type RangeId = (typeof RANGES)[number]['id'];

const DAY_MS = 86_400_000;
const RISK_LEVELS = 5;
const Y_STEP = 200;
const CHART = { width: 760, height: 340, left: 58, right: 20, top: 40, bottom: 34 };

const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const tradeTime = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });

function signedMoney(value: number) {
  return `${value > 0 ? '+' : ''}${formatMoney(value, 'USD')}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function runningTotals(trades: FundTrade[]) {
  return trades.reduce<number[]>((sums, trade) => [...sums, (sums.at(-1) ?? 0) + trade.pnl], []);
}

/** Largest peak-to-trough fall on the equity curve, as point indexes. */
function deepestDrawdown(values: number[]) {
  let peakIndex = 0;
  let deepest = { peak: 0, trough: 0, amount: 0 };
  for (const [index, value] of values.entries()) {
    if (value > values[peakIndex]) peakIndex = index;
    const amount = value - values[peakIndex];
    if (amount < deepest.amount) deepest = { peak: peakIndex, trough: index, amount };
  }
  return deepest.amount < 0 ? deepest : null;
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

/** SVG ids must be plain tokens; React's useId can contain characters url(#…) rejects. */
function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '');
}

function RangePills({ value, onChange }: { value: RangeId; onChange: (range: RangeId) => void }) {
  const index = RANGES.findIndex((range) => range.id === value);
  return (
    <div role="tablist" aria-label={text.performanceOverview} className="relative grid grid-cols-6 rounded-full border border-fg/10 bg-fg/[0.04] p-1">
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 8px) / ${RANGES.length})`, transform: `translateX(${index * 100}%)` }}
        className="absolute top-1 bottom-1 left-1 rounded-full border border-primary/40 bg-primary/25 transition-transform duration-300 ease-out motion-reduce:transition-none"
      />
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          role="tab"
          aria-selected={range.id === value}
          onClick={() => onChange(range.id)}
          className={cx(
            'relative rounded-full px-1.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:px-3',
            range.id === value ? 'text-fg' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {range.id}
        </button>
      ))}
    </div>
  );
}

/* ───────────── Orbit hero ───────────── */

function RiskMeter({ risk }: { risk: number }) {
  return (
    <div className="flex min-w-44 flex-col justify-center gap-2 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3">
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="font-semibold tracking-[0.16em] text-fg-subtle uppercase">{text.risk}</span>
        <span className="font-mono font-semibold text-fg tabular-nums">
          {risk}
          <span className="text-fg-subtle">/{RISK_LEVELS}</span>
        </span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-5 gap-1">
        {Array.from({ length: RISK_LEVELS }, (_, index) => (
          <span
            key={index}
            style={{ animationDelay: `${400 + index * 90}ms` }}
            className={cx('h-1.5 origin-left animate-grow rounded-full motion-reduce:animate-none', index < risk ? 'bg-success shadow-[0_0_8px_-1px_var(--color-success)]' : 'bg-fg/10')}
          />
        ))}
      </div>
    </div>
  );
}

interface Satellite {
  key: string;
  icon: IconName;
  label: string;
  value: number;
  format: (value: number) => string;
  tone: string;
  isLive?: boolean;
}

// A metric "satellite": on wide screens it sits beside the core with a connector line pointing at it.
function SatelliteChip({ item, side, index }: { item: Satellite; side: 'left' | 'right'; index: number }) {
  // The outer two chips lean toward the core so each column traces an arc around it.
  const isOuter = index !== 1;
  return (
    <li style={staggerStyle(index + (side === 'left' ? 2 : 5), 90)} className={cx('flex animate-rise motion-reduce:animate-none', side === 'left' ? 'lg:justify-end' : 'lg:justify-start')}>
      <div
        className={cx(
          'group relative flex w-full items-center gap-3 rounded-full border border-fg/[0.08] bg-fg/[0.03] py-2 pr-4 pl-2 backdrop-blur-md transition-colors duration-300 hover:border-primary/40 hover:bg-primary/[0.06] motion-reduce:transition-none lg:w-64',
          side === 'right' && 'lg:flex-row-reverse lg:pr-2 lg:pl-4 lg:text-right',
          isOuter && (side === 'left' ? 'lg:translate-x-10' : 'lg:-translate-x-10'),
        )}
      >
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
          <Icon name={item.icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx('flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase', side === 'right' && 'lg:justify-end')}>
            <span className="truncate">{item.label}</span>
            {item.isLive && <LiveDot />}
          </p>
          <p className={cx('truncate text-lg font-semibold tracking-tight tabular-nums', item.tone)}>
            <CountUp value={item.value} format={item.format} />
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-1/2 hidden h-px w-10 lg:block',
            side === 'left' ? 'left-full bg-linear-to-r from-primary/60 to-transparent' : 'right-full bg-linear-to-l from-primary/60 to-transparent',
          )}
        />
      </div>
    </li>
  );
}

function AumCore({ totalAum }: { totalAum: number }) {
  return (
    <div className="relative order-first mx-auto grid size-64 place-items-center sm:size-72 lg:order-none">
      <span aria-hidden="true" className="absolute inset-8 animate-ring-breathe rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute inset-5 animate-orbit-spin-rev rounded-full border border-dashed border-primary/30 motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin-fast motion-reduce:hidden">
        <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)]" />
      </span>
      <div className="relative grid size-44 place-items-center rounded-full border border-primary/30 bg-surface/70 text-center shadow-[inset_0_0_40px_-12px_var(--brand-primary)] backdrop-blur-xl sm:size-48">
        <div className="flex flex-col items-center gap-1 px-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">
            <Icon name="bank" size={12} className="text-primary" />
            {text.totalAum}
          </p>
          <p className="animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-4xl font-semibold tracking-tight text-transparent tabular-nums motion-reduce:animate-none">
            <CountUp value={totalAum} format={(value) => compactUsd.format(value)} />
          </p>
        </div>
      </div>
    </div>
  );
}

function FundOrbitHero({ detail, onInvest }: { detail: FundDetail; onInvest: () => void }) {
  const satellites: Satellite[] = [
    { key: 'gain', icon: 'trendUp', label: text.avgGain, value: detail.avgGain, format: formatPercent, tone: 'text-success' },
    { key: 'pnl', icon: 'pieChart', label: text.totalPnl, value: detail.totalPnl, format: (value) => compactUsd.format(value), tone: 'text-fg' },
    { key: 'investors', icon: 'user', label: text.investors, value: detail.investors, format: (value) => String(Math.round(value)), tone: 'text-fg' },
    { key: 'commission', icon: 'card', label: text.commission, value: detail.commissionPercent, format: (value) => `${Math.round(value)}%`, tone: 'text-primary' },
    { key: 'floating', icon: 'wallet', label: text.floatingProfit, value: detail.floatingProfit, format: (value) => compactUsd.format(value), tone: 'text-success', isLive: true },
    { key: 'drawdown', icon: 'trendDown', label: text.maxDrawdown, value: detail.maxDrawdown, format: (value) => formatMoney(value, 'USD'), tone: 'text-danger' },
  ];

  return (
    <section className="orbit-card relative isolate flex animate-rise flex-col gap-8 overflow-hidden p-5 motion-reduce:animate-none lg:p-7">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:radial-gradient(60%_70%_at_50%_55%,#000,transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-96 -translate-x-1/2 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />

      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative grid size-16 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin-fast rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_45%,var(--orbit-violet))] motion-reduce:animate-none" />
            <span className="relative grid size-[3.6rem] place-items-center rounded-full bg-surface text-xl font-bold tracking-tight text-primary">{initials(detail.manager)}</span>
            <span className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full bg-primary text-on-primary ring-4 ring-surface">
              <Icon name="checkCircle" size={12} />
            </span>
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate bg-clip-text text-2xl font-bold tracking-tight text-transparent [background-image:linear-gradient(180deg,var(--orbit-ink-top,#ffffff)_0%,var(--orbit-ink-mid,#e4dcff)_60%,var(--brand-primary)_100%)] sm:text-3xl">
              {detail.planName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-fg-muted">
                {text.by} <span className="font-semibold text-fg">{detail.manager}</span>
              </span>
              <span className="rounded-full border border-primary/40 bg-primary/20 px-2.5 py-0.5 font-bold tracking-wider text-fg">{text.fundManager}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-fg/[0.04] px-2.5 py-0.5 text-fg-muted">
                <LiveDot />
                {text.memberSince(detail.memberSince)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft/50 px-4 py-3">
            <span className="relative grid size-8 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
              <span className="relative grid size-8 place-items-center rounded-full bg-warning text-on-primary">
                <Icon name="alert" size={14} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-fg-subtle">{text.strategyDescription}</p>
              <p className="truncate text-sm font-bold tracking-wide text-warning">{detail.strategy}</p>
            </div>
          </div>
          <RiskMeter risk={detail.risk} />
        </div>
      </header>

      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-10">
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {satellites.slice(0, 3).map((item, index) => (
            <SatelliteChip key={item.key} item={item} side="left" index={index} />
          ))}
        </ul>
        <AumCore totalAum={detail.totalAum} />
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {satellites.slice(3).map((item, index) => (
            <SatelliteChip key={item.key} item={item} side="right" index={index} />
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-primary/25 bg-primary/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:pl-5">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
            <Icon name="wallet" size={18} />
          </span>
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.18em] text-fg-subtle">{text.minInvestmentLabel}</p>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-2xl font-semibold tracking-tight text-fg tabular-nums">
                <CountUp value={detail.minInvestment} format={(value) => compactUsd.format(Math.round(value))} />
              </span>
              <span className="text-[11px] tracking-wide text-fg-subtle">{text.minInvestment(compactUsd.format(detail.minInvestment))}</span>
            </p>
          </div>
        </div>
        <Button aria-haspopup="dialog" onClick={onInvest} className="group/invest relative w-full overflow-hidden sm:w-auto sm:min-w-56">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/invest:translate-x-full motion-reduce:hidden" />
          <span className="relative font-bold tracking-wider">{text.investNow}</span>
          <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/invest:translate-x-1 motion-reduce:transition-none" />
        </Button>
      </div>
    </section>
  );
}

/* ───────────── P&L bars + equity step chart ───────────── */

// Each trade is a P&L bar rising or falling from zero; the equity step line shows the balance after each trade.
function PnlChart({ trades }: { trades: FundTrade[] }) {
  const uid = useSvgId();
  const isMounted = useMounted();
  const [hovered, setHovered] = useState<number | null>(null);
  const ids = { area: `${uid}a`, band: `${uid}b` };

  const equity = [0, ...runningTotals(trades)];
  const extremes = [...equity, ...trades.map((trade) => trade.pnl)];
  const yMax = Math.max(Y_STEP, Math.ceil(Math.max(...extremes) / Y_STEP) * Y_STEP);
  const yMin = Math.min(0, Math.floor(Math.min(...extremes) / Y_STEP) * Y_STEP);
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const slot = plotWidth / equity.length;
  const xAt = (index: number) => round2(CHART.left + slot * (index + 0.5));
  const yAt = (value: number) => round2(CHART.top + ((yMax - value) / (yMax - yMin)) * plotHeight);
  const yTicks = Array.from({ length: (yMax - yMin) / Y_STEP + 1 }, (_, index) => yMin + index * Y_STEP);
  const zeroY = yAt(0);
  const barWidth = round2(Math.min(44, slot * 0.4));
  const drawMs = 1300;

  const points = equity.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const stepPath = points.reduce((path, point, index) => (index === 0 ? `M${point.x},${point.y}` : `${path} H${point.x} V${point.y}`), '');
  const areaPath = `${stepPath} V${zeroY} H${points[0].x} Z`;
  const drawdown = deepestDrawdown(equity);
  const last = points.at(-1);

  const active = hovered === null ? null : { index: hovered, point: points[hovered], value: equity[hovered], trade: hovered === 0 ? null : trades[hovered - 1] };
  const tooltipLeft = active ? Math.min(84, Math.max(16, (active.point.x / CHART.width) * 100)) : 0;
  const tooltipBelow = active ? active.point.y / CHART.height < 0.4 : false;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={`${text.equity}: ${formatMoney(equity.at(-1) ?? 0, 'USD')}`} onPointerLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id={ids.area} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={ids.band} x1="0" x2="0" y1="0" y2="1" className="text-danger">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.04" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.22" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={CHART.left} x2={CHART.width - CHART.right} y1={yAt(tick)} y2={yAt(tick)} className={tick === 0 ? 'stroke-line-strong' : 'stroke-line/50'} strokeDasharray={tick === 0 ? undefined : '1 6'} strokeLinecap="round" />
              <text x={CHART.left - 10} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" className="fill-fg-subtle text-[10px] tabular-nums">
                ${tick}
              </text>
            </g>
          ))}

          {active && <rect x={round2(CHART.left + slot * active.index)} y={CHART.top} width={round2(slot)} height={plotHeight} rx={10} className="fill-primary/[0.07]" pointerEvents="none" />}

          {drawdown && (
            <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${200 + drawMs}ms` }}>
              <rect
                x={xAt(drawdown.peak)}
                y={yAt(equity[drawdown.peak])}
                width={round2(xAt(drawdown.trough) - xAt(drawdown.peak))}
                height={round2(yAt(equity[drawdown.trough]) - yAt(equity[drawdown.peak]))}
                fill={`url(#${ids.band})`}
              />
              <text x={xAt(drawdown.peak) + 8} y={yAt(equity[drawdown.peak]) - 20} className="fill-danger/80 text-[9px] font-semibold tracking-[0.14em]">
                {text.maxDrawdown}
              </text>
              <text x={xAt(drawdown.peak) + 8} y={yAt(equity[drawdown.peak]) - 7} className="fill-danger text-[12px] font-bold tabular-nums">
                {formatMoney(drawdown.amount, 'USD')}
              </text>
            </g>
          )}

          {trades.map((trade, tradeIndex) => {
            const index = tradeIndex + 1;
            const isGain = trade.pnl >= 0;
            const barTop = isGain ? yAt(trade.pnl) : zeroY;
            const barHeight = round2(Math.max(2, Math.abs(yAt(trade.pnl) - zeroY)));
            const delay = 200 + tradeIndex * 110;
            return (
              <g key={trade.id} pointerEvents="none">
                <rect
                  x={round2(xAt(index) - barWidth / 2)}
                  y={barTop}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  strokeWidth={hovered === index ? 2 : 1.25}
                  style={{ transformBox: 'fill-box', transformOrigin: isGain ? 'bottom' : 'top', transform: `scaleY(${isMounted ? 1 : 0})`, transition: `transform 700ms cubic-bezier(.2,.9,.3,1.15) ${delay}ms` }}
                  className={isGain ? 'fill-success/20 stroke-success/70' : 'fill-danger/20 stroke-danger/70'}
                />
                <text
                  x={xAt(index)}
                  y={isGain ? barTop - 8 : round2(barTop + barHeight + 14)}
                  textAnchor="middle"
                  style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${delay + 500}ms` }}
                  className={cx('text-[10.5px] font-bold tabular-nums', isGain ? 'fill-success' : 'fill-danger')}
                >
                  {signedMoney(trade.pnl)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${ids.area})`} pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 900ms ease ${200 + drawMs / 2}ms` }} />
          <path
            d={stepPath}
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            pointerEvents="none"
            className="stroke-primary"
            style={{ strokeDashoffset: isMounted ? 0 : 1, transition: `stroke-dashoffset ${drawMs}ms cubic-bezier(.4,0,.2,1) 200ms` }}
          />

          {points.map((point, index) => (
            <rect
              key={`n${index}`}
              x={round2(point.x - 5)}
              y={round2(point.y - 5)}
              width={10}
              height={10}
              rx={2}
              strokeWidth={2}
              pointerEvents="none"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${200 + (drawMs * index) / Math.max(1, points.length - 1)}ms` }}
              className={cx('animate-dot-pop fill-elevated stroke-primary motion-reduce:animate-none', hovered === index && 'fill-primary')}
              transform={`rotate(45 ${point.x} ${point.y})`}
            />
          ))}

          {last && (
            <g pointerEvents="none" className="motion-reduce:hidden">
              <circle cx={last.x} cy={last.y} r="6" className="fill-primary/40">
                <animate attributeName="r" values="6;20" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {points.map((point, index) => (
            <g key={`x${index}`}>
              <text x={point.x} y={CHART.height - 10} textAnchor="middle" className="fill-fg-subtle text-[10px]">
                {index === 0 ? text.start : shortDate.format(trades[index - 1].time)}
              </text>
              <rect x={round2(CHART.left + slot * index)} y={CHART.top - 30} width={round2(slot)} height={plotHeight + 30} fill="transparent" onPointerEnter={() => setHovered(index)} />
            </g>
          ))}

          {active && (
            <g pointerEvents="none">
              <line x1={CHART.left} x2={active.point.x} y1={active.point.y} y2={active.point.y} className="stroke-primary/40" strokeDasharray="3 4" />
              <rect x={2} y={active.point.y - 10} width={CHART.left - 6} height={20} rx={6} className="fill-primary" />
              <text x={(CHART.left - 4) / 2 + 2} y={active.point.y} textAnchor="middle" dominantBaseline="middle" className="fill-on-primary text-[10px] font-bold tabular-nums">
                {compactUsd.format(active.value)}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm border border-success/70 bg-success/20" />
          {text.pnl}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-primary" />
          {text.equity}
        </span>
        {drawdown && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-danger/25" />
            {text.maxDrawdown}
          </span>
        )}
      </div>

      {active && (
        <div
          role="status"
          style={{ left: `${tooltipLeft}%`, top: `${(active.point.y / CHART.height) * 100}%` }}
          className={cx(
            'pointer-events-none absolute z-10 w-56 -translate-x-1/2 animate-fade-quick rounded-xl border border-primary/30 bg-elevated/90 p-3 text-xs shadow-pop backdrop-blur-md motion-reduce:animate-none',
            tooltipBelow ? 'translate-y-5' : '-translate-y-[calc(100%+20px)]',
          )}
        >
          {active.trade ? (
            <>
              <p className="flex items-center justify-between font-semibold text-fg">
                {active.trade.symbol}
                <span className={cx('rounded px-1.5 text-[10px]', active.trade.type === 'BUY' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{active.trade.type}</span>
              </p>
              <p className="mt-1 text-[11px] text-fg-subtle tabular-nums">{tradeTime.format(active.trade.time)}</p>
              <p className="mt-2 flex justify-between text-fg-muted">
                {text.pnl}
                <span className={cx('font-semibold tabular-nums', active.trade.pnl >= 0 ? 'text-success' : 'text-danger')}>{signedMoney(active.trade.pnl)}</span>
              </p>
            </>
          ) : (
            <p className="font-semibold text-fg">{text.start}</p>
          )}
          <p className="mt-0.5 flex justify-between text-fg-muted">
            {text.equity}
            <span className="font-semibold text-primary tabular-nums">{formatMoney(active.value, 'USD')}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Panel({ icon, title, aside, delayIndex, children }: { icon: IconName; title: string; aside?: ReactNode; delayIndex: number; children: ReactNode }) {
  return (
    <section style={staggerStyle(delayIndex, 140)} className="orbit-card min-w-0 animate-rise overflow-hidden motion-reduce:animate-none">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-fg">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Icon name={icon} size={15} />
          </span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ───────────── Trade tape ───────────── */

// Each trade's P&L is drawn as a bar leaving a centre zero line: right for gains, left for losses, scaled to the largest trade.
function TradeTape({ trades }: { trades: FundTrade[] }) {
  const totals = runningTotals(trades);
  const largest = Math.max(1, ...trades.map((trade) => Math.abs(trade.pnl)));

  return (
    <ol className="flex flex-col gap-2.5 p-4">
      {trades.map((trade, index) => {
        const isGain = trade.pnl >= 0;
        const share = round2((Math.abs(trade.pnl) / largest) * 50);
        return (
          <li
            key={trade.id}
            style={staggerStyle(index, 120)}
            className="animate-feed-in rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-3.5 transition-colors duration-300 hover:border-primary/30 motion-reduce:animate-none motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  'grid size-9 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold tabular-nums ring-1',
                  isGain ? 'bg-success/10 text-success ring-success/40' : 'bg-danger/10 text-danger ring-danger/40',
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="sr-only">{text.symbol}</span>
                  <span className="truncate font-semibold text-fg">{trade.symbol}</span>
                  <span className="sr-only">{text.type}</span>
                  <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold', trade.type === 'BUY' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    <Icon name={trade.type === 'BUY' ? 'trendUp' : 'trendDown'} size={11} />
                    {trade.type}
                  </span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-fg-subtle tabular-nums">
                  <span className="sr-only">{text.time}</span>
                  {tradeTime.format(trade.time)}
                  <span aria-hidden="true">·</span>
                  <Icon name="clock" size={10} />
                  <span className="sr-only">{text.duration}</span>
                  {trade.durationMinutes}m
                </p>
              </div>
              <p className={cx('shrink-0 text-lg font-semibold tracking-tight tabular-nums', isGain ? 'text-success' : 'text-danger')}>
                <span className="sr-only">{text.pnl} </span>
                <CountUp value={trade.pnl} format={signedMoney} />
              </p>
            </div>

            <div aria-hidden="true" className="relative mt-3 h-1.5 rounded-full bg-fg/[0.06]">
              <span className="absolute -inset-y-1 left-1/2 w-px bg-fg/30" />
              <span
                style={{ width: `${share}%`, animationDelay: `${300 + index * 120}ms` }}
                className={cx(
                  'absolute inset-y-0 animate-grow rounded-full motion-reduce:animate-none',
                  isGain ? 'left-1/2 origin-left bg-success shadow-[0_0_10px_-2px_var(--color-success)]' : 'right-1/2 origin-right bg-danger shadow-[0_0_10px_-2px_var(--color-danger)]',
                )}
              />
            </div>

            <p className="mt-2 text-right text-[11px] text-fg-muted">
              {text.equity} <span className="font-semibold text-primary tabular-nums">{formatMoney(totals[index], 'USD')}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Page ───────────── */

function FundDashboard({ planId, detail }: { planId: string; detail: FundDetail }) {
  const [range, setRange] = useState<RangeId>('1M');
  const [isInvestOpen, setIsInvestOpen] = useState(false);

  const chronological = useMemo(() => [...detail.trades].sort((a, b) => a.time.getTime() - b.time.getTime()), [detail.trades]);
  const chartTrades = useMemo(() => {
    const days = RANGES.find((item) => item.id === range)?.days ?? null;
    const latest = chronological.at(-1)?.time.getTime() ?? 0;
    // Ranges count back from the fund's latest trade so a quiet fund still shows its history.
    return days === null ? chronological : chronological.filter((trade) => trade.time.getTime() >= latest - days * DAY_MS);
  }, [range, chronological]);

  return (
    <>
      <FundOrbitHero detail={detail} onInvest={() => setIsInvestOpen(true)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <Panel icon="trendUp" delayIndex={1} title={text.performanceOverview} aside={<RangePills value={range} onChange={setRange} />}>
          <div className="p-5 pt-3">
            {chartTrades.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <span className="grid size-12 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
                  <Icon name="trendUp" size={20} />
                </span>
                <p className="text-sm text-fg-muted">{text.noTrades}</p>
              </div>
            ) : (
              <PnlChart key={range} trades={chartTrades} />
            )}
          </div>
        </Panel>

        <Panel
          icon="pieChart"
          delayIndex={2}
          title={text.recentTrades}
          aside={<span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">{text.tradeCount(detail.trades.length)}</span>}
        >
          <TradeTape trades={chronological} />
        </Panel>
      </div>

      {isInvestOpen && <InvestNowModal plans={investPlanOptions} initialPlanId={planId} onClose={() => setIsInvestOpen(false)} />}
    </>
  );
}

export default function FundManagerDetailPage({ planId }: { planId: string }) {
  const plan = fundPlans.find((item) => item.id === planId);
  const detail = plan ? getFundDetail(plan.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={detail?.manager ?? text.notFound} />
      <Link
        href="/pamm/fund-managers"
        className="group inline-flex items-center gap-2 self-start rounded-full border border-fg/10 bg-fg/[0.04] px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="arrowRight" size={15} className="rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
        {text.back}
      </Link>
      {plan && detail ? (
        <FundDashboard planId={plan.id} detail={detail} />
      ) : (
        <div className="orbit-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-14 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
            <Icon name="search" size={24} />
          </span>
          <p className="text-base font-semibold text-fg">{text.notFound}</p>
          <p className="text-sm text-fg-muted">{text.notFoundHint}</p>
        </div>
      )}
    </div>
  );
}
