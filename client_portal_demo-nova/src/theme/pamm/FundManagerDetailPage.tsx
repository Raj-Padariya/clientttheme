'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
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
const CHART = { width: 760, height: 340, left: 58, right: 24, top: 48, bottom: 34 };
const RING_RADIUS = 18;

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

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

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
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

/** Smooth curve with horizontal control handles, so it never overshoots past a point the way Catmull-Rom can. */
function smoothPath(points: { x: number; y: number }[]) {
  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    const previous = points[index - 1];
    const handle = round2((point.x - previous.x) / 2);
    return `${path} C${round2(previous.x + handle)},${previous.y} ${round2(point.x - handle)},${point.y} ${point.x},${point.y}`;
  }, '');
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
    <div role="tablist" aria-label={text.performanceOverview} className="relative grid grid-cols-6 rounded-full border border-line bg-surface-2/40 p-1 backdrop-blur-xl">
      {/* Silver pill sliding with a small overshoot. */}
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 8px) / ${RANGES.length})`, transform: `translateX(${index * 100}%)` }}
        className="absolute top-1 bottom-1 left-1 rounded-full bg-fg shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1.2)] motion-reduce:transition-none"
      />
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          role="tab"
          aria-selected={range.id === value}
          onClick={() => onChange(range.id)}
          className={cx(
            'relative rounded-full px-1.5 py-1 text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring sm:px-3',
            range.id === value ? 'text-app' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {range.id}
        </button>
      ))}
    </div>
  );
}

function Panel({ icon, title, aside, delayIndex, children }: { icon: IconName; title: string; aside?: ReactNode; delayIndex: number; children: ReactNode }) {
  return (
    <section style={staggerStyle(delayIndex, 140)} className={cx(panelClass, 'min-w-0 animate-rise motion-reduce:animate-none')}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-fg">
          <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
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

/* ───────────── Title ───────────── */

function BackLink() {
  return (
    <Link
      href="/pamm/fund-managers"
      className="group inline-flex items-center gap-2 self-start text-sm font-semibold text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover:-translate-x-1 motion-reduce:transition-none')}>
        <Icon name="arrowRight" size={14} className="rotate-180" />
      </span>
      {text.back}
    </Link>
  );
}

function RiskBeads({ risk }: { risk: number }) {
  return (
    <span className={chipClass}>
      {text.risk}
      <span aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: RISK_LEVELS }, (_, index) => (
          <span
            key={index}
            style={staggerStyle(index, 400)}
            className={cx('size-2.5 animate-dot-pop rounded-full motion-reduce:animate-none', index < risk ? 'bg-success ring-2 ring-success/25' : 'ring-1 ring-line-strong')}
          />
        ))}
      </span>
      <span className="font-mono tabular-nums">
        {risk}
        <span className="text-fg-subtle">/{RISK_LEVELS}</span>
      </span>
    </span>
  );
}

function FundTitle({ detail }: { detail: FundDetail }) {
  return (
    <header className="flex animate-rise flex-col gap-4 motion-reduce:animate-none lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="relative grid size-18 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-15 text-xl font-black tracking-tight')}>{initials(detail.manager)}</span>
          <span className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full bg-fg text-app ring-4 ring-app">
            <Icon name="checkCircle" size={12} />
          </span>
        </span>
        <div className="min-w-0">
          <p className={captionClass}>
            {text.by} <span className="text-fg">{detail.manager}</span> · {text.fundManager}
          </p>
          <h2 className="mt-1 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{detail.planName}</h2>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className={chipClass}>
          <LiveDot />
          {text.memberSince(detail.memberSince)}
        </span>
        <RiskBeads risk={detail.risk} />
      </div>
    </header>
  );
}

/* ───────────── Sticky frost ticket ───────────── */

function InvestTicket({ detail, onInvest }: { detail: FundDetail; onInvest: () => void }) {
  return (
    <FrostCard>
      <div className={cx('flex flex-col gap-5 sm:p-1', inkClass)}>
        <div className="relative">
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name="bank" size={14} />
            </span>
            {text.totalAum}
          </p>
          <p className="mt-3 truncate text-5xl font-black tracking-tight tabular-nums">
            <CountUp value={detail.totalAum} format={(value) => compactUsd.format(value)} />
          </p>
          {/* Two counter-turning rings in the corner keep the ticket alive without a halo. */}
          <span aria-hidden="true" className="pointer-events-none absolute -top-2 right-0 size-16 motion-reduce:hidden">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-[#0a1220]/30" />
            <span className="absolute inset-3 animate-rim-spin rounded-full border border-[#0a1220]/20 [animation-direction:reverse]" />
            <span className="absolute inset-[26px] rounded-full bg-[#0a1220]/70" />
          </span>
        </div>

        <dl className="flex flex-col gap-3 border-y border-dotted border-[#0a1220]/25 py-4 text-sm">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className={cx('font-mono text-[10px]', inkMutedClass)}>01</span>
            <dt className={inkMutedClass}>{text.minInvestmentLabel}</dt>
            <span aria-hidden="true" className="flex-1 border-t border-dotted border-[#0a1220]/25" />
            <dd className="font-black tabular-nums">
              <CountUp value={detail.minInvestment} format={(value) => compactUsd.format(Math.round(value))} />
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className={cx('font-mono text-[10px]', inkMutedClass)}>02</span>
            <dt className={inkMutedClass}>{text.commission}</dt>
            <span aria-hidden="true" className="flex-1 border-t border-dotted border-[#0a1220]/25" />
            <dd className="font-black tabular-nums">{detail.commissionPercent}%</dd>
          </div>
          <p className={cx('text-[10.5px] tracking-wide', inkMutedClass)}>{text.minInvestment(compactUsd.format(detail.minInvestment))}</p>
        </dl>

        <div className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/80 backdrop-blur-md">
          <span className="relative grid size-9 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-[#c77d12]/30 motion-reduce:hidden" />
            <span className="relative grid size-9 place-items-center rounded-full bg-[#c77d12] text-white">
              <Icon name="alert" size={15} />
            </span>
          </span>
          <div className="min-w-0">
            <p className={inkCaptionClass}>{text.strategyDescription}</p>
            <p className="truncate text-sm font-black tracking-wide text-[#9a5c06]">{detail.strategy}</p>
          </div>
        </div>

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onInvest}
          className="group/invest relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a1220] text-sm font-bold tracking-wider text-white transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgb(10_18_32/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/25 to-transparent motion-reduce:hidden" />
          <span className="relative">{text.investNow}</span>
          <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/invest:translate-x-1 motion-reduce:transition-none" />
        </button>
      </div>
    </FrostCard>
  );
}

/* ───────────── Vitals grid ───────────── */

interface Vital {
  key: string;
  icon: IconName;
  label: string;
  value: number;
  format: (value: number) => string;
  tone: string;
  isLive?: boolean;
}

function FundVitals({ detail }: { detail: FundDetail }) {
  const vitals: Vital[] = [
    { key: 'gain', icon: 'trendUp', label: text.avgGain, value: detail.avgGain, format: formatPercent, tone: 'text-success' },
    { key: 'pnl', icon: 'pieChart', label: text.totalPnl, value: detail.totalPnl, format: (value) => compactUsd.format(value), tone: 'text-fg' },
    { key: 'investors', icon: 'user', label: text.investors, value: detail.investors, format: (value) => String(Math.round(value)), tone: 'text-fg' },
    { key: 'commission', icon: 'card', label: text.commission, value: detail.commissionPercent, format: (value) => `${Math.round(value)}%`, tone: 'text-fg' },
    { key: 'floating', icon: 'wallet', label: text.floatingProfit, value: detail.floatingProfit, format: (value) => compactUsd.format(value), tone: 'text-success', isLive: true },
    { key: 'drawdown', icon: 'trendDown', label: text.maxDrawdown, value: detail.maxDrawdown, format: (value) => formatMoney(value, 'USD'), tone: 'text-danger' },
  ];

  return (
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
      {/* Every cell draws its right and bottom rule; the -1px margins push the outer ones under the clipped panel edge. */}
      <dl className="-mr-px -mb-px grid sm:grid-cols-2 lg:grid-cols-3">
        {vitals.map((vital, index) => (
          <div
            key={vital.key}
            style={staggerStyle(index, 250)}
            className="group/vital relative flex min-w-0 animate-rise items-center gap-4 border-r border-b border-dotted border-line-strong p-5 motion-reduce:animate-none"
          >
            <span className="relative grid size-12 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-line-strong transition-transform duration-700 group-hover/vital:rotate-180 motion-reduce:transition-none" />
              <span aria-hidden="true" className={cx(beadClass, 'size-9 transition-transform duration-300 group-hover/vital:-rotate-12 motion-reduce:transition-none')}>
                <Icon name={vital.icon} size={15} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <dt className={cx(captionClass, 'flex items-center gap-1.5')}>
                <span aria-hidden="true" className="font-mono">{stepNumber(index)}</span>
                <span className="truncate">{vital.label}</span>
                {vital.isLive && <LiveDot />}
              </dt>
              <dd className={cx('mt-1 truncate text-2xl font-black tracking-tight tabular-nums', vital.tone)}>
                <CountUp value={vital.value} format={vital.format} />
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Pearl-string equity chart ───────────── */

/**
 * Equity runs as a smooth string; each trade is a pearl on it, sized by the size of the trade and ringed green or red,
 * with a dashed stem showing the jump from the previous balance. A bright bead travels the string on a loop.
 */
function PearlChart({ trades }: { trades: FundTrade[] }) {
  const uid = useSvgId();
  const isMounted = useMounted();
  const [hovered, setHovered] = useState<number | null>(null);
  const ids = { area: `${uid}a`, hatch: `${uid}h` };

  const equity = [0, ...runningTotals(trades)];
  const yMax = Math.max(Y_STEP, Math.ceil(Math.max(...equity) / Y_STEP) * Y_STEP);
  const yMin = Math.min(0, Math.floor(Math.min(...equity) / Y_STEP) * Y_STEP);
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const slot = plotWidth / equity.length;
  const xAt = (index: number) => round2(CHART.left + slot * (index + 0.5));
  const yAt = (value: number) => round2(CHART.top + ((yMax - value) / (yMax - yMin)) * plotHeight);
  const yTicks = Array.from({ length: (yMax - yMin) / Y_STEP + 1 }, (_, index) => yMin + index * Y_STEP);
  const zeroY = yAt(0);
  const largest = Math.max(1, ...trades.map((trade) => Math.abs(trade.pnl)));
  const drawMs = 1300;

  const points = equity.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const curvePath = smoothPath(points);
  const areaPath = `${curvePath} V${zeroY} H${points[0].x} Z`;
  const drawdown = deepestDrawdown(equity);

  const active = hovered === null ? null : { index: hovered, point: points[hovered], value: equity[hovered], trade: hovered === 0 ? null : trades[hovered - 1] };
  const tooltipLeft = active ? Math.min(84, Math.max(16, (active.point.x / CHART.width) * 100)) : 0;
  const tooltipBelow = active ? active.point.y / CHART.height < 0.4 : false;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={`${text.equity}: ${formatMoney(equity.at(-1) ?? 0, 'USD')}`} onPointerLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id={ids.area} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
            </linearGradient>
            <pattern id={ids.hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" strokeWidth="2" className="stroke-danger/35" />
            </pattern>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={CHART.left} x2={CHART.width - CHART.right} y1={yAt(tick)} y2={yAt(tick)} className={tick === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeDasharray={tick === 0 ? undefined : '1 6'} strokeLinecap="round" />
              <text x={CHART.left - 10} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" className="fill-fg-subtle text-[10px] tabular-nums">
                ${tick}
              </text>
            </g>
          ))}

          {active && <line x1={active.point.x} x2={active.point.x} y1={CHART.top - 20} y2={CHART.top + plotHeight} className="stroke-fg/30" strokeDasharray="2 5" pointerEvents="none" />}

          {drawdown && (
            <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${200 + drawMs}ms` }} pointerEvents="none">
              <rect
                x={xAt(drawdown.peak)}
                y={yAt(equity[drawdown.peak])}
                width={round2(xAt(drawdown.trough) - xAt(drawdown.peak))}
                height={round2(yAt(equity[drawdown.trough]) - yAt(equity[drawdown.peak]))}
                rx={10}
                fill={`url(#${ids.hatch})`}
                className="stroke-danger/40"
                strokeDasharray="3 4"
              />
              <text x={xAt(drawdown.peak) + 8} y={yAt(equity[drawdown.peak]) - 22} className="fill-danger/80 text-[9px] font-semibold tracking-[0.14em]">
                {text.maxDrawdown}
              </text>
              <text x={xAt(drawdown.peak) + 8} y={yAt(equity[drawdown.peak]) - 9} className="fill-danger text-[12px] font-bold tabular-nums">
                {formatMoney(drawdown.amount, 'USD')}
              </text>
            </g>
          )}

          <path d={areaPath} fill={`url(#${ids.area})`} pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 900ms ease ${200 + drawMs / 2}ms` }} />
          <path
            d={curvePath}
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeWidth={2.5}
            strokeLinecap="round"
            pointerEvents="none"
            className="stroke-primary"
            style={{ strokeDashoffset: isMounted ? 0 : 1, transition: `stroke-dashoffset ${drawMs}ms cubic-bezier(.4,0,.2,1) 200ms` }}
          />

          {/* Travelling bead: starts once the string has drawn. */}
          {isMounted && (
            <g pointerEvents="none" className="motion-reduce:hidden">
              <circle r="4.5" className="fill-fg">
                <animateMotion dur="3.2s" begin="1.5s" repeatCount="indefinite" path={curvePath} />
              </circle>
            </g>
          )}

          {trades.map((trade, tradeIndex) => {
            const index = tradeIndex + 1;
            const isGain = trade.pnl >= 0;
            const point = points[index];
            const previousY = points[index - 1].y;
            const radius = round2(7 + (Math.abs(trade.pnl) / largest) * 11);
            const delay = 200 + (drawMs * index) / Math.max(1, points.length - 1);
            const labelY = isGain ? point.y - radius - 9 : round2(point.y + radius + 16);
            return (
              <g key={trade.id} pointerEvents="none">
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={previousY}
                  y2={point.y}
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                  className={isGain ? 'stroke-success/70' : 'stroke-danger/70'}
                  style={{ opacity: isMounted ? 1 : 0, transition: `opacity 500ms ease ${delay}ms` }}
                />
                <circle cx={point.x} cy={previousY} r={3} className="fill-app stroke-fg-subtle" strokeWidth={1.5} style={{ opacity: isMounted ? 1 : 0, transition: `opacity 500ms ease ${delay}ms` }} />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  strokeWidth={hovered === index ? 3.5 : 2.5}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${delay}ms` }}
                  className={cx('animate-dot-pop fill-surface motion-reduce:animate-none', isGain ? 'stroke-success' : 'stroke-danger')}
                />
                <circle cx={round2(point.x - radius * 0.35)} cy={round2(point.y - radius * 0.35)} r={round2(radius * 0.28)} className="fill-fg/25" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${delay + 200}ms` }} />
                <text
                  x={point.x}
                  y={labelY}
                  textAnchor="middle"
                  style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${delay + 300}ms` }}
                  className={cx('text-[10.5px] font-bold tabular-nums', isGain ? 'fill-success' : 'fill-danger')}
                >
                  {signedMoney(trade.pnl)}
                </text>
              </g>
            );
          })}

          <circle cx={points[0].x} cy={points[0].y} r={5} className="fill-app stroke-fg" strokeWidth={2} pointerEvents="none" />

          {points.map((point, index) => (
            <g key={`x${index}`}>
              <text x={point.x} y={CHART.height - 10} textAnchor="middle" className={cx('text-[10px]', hovered === index ? 'fill-fg font-bold' : 'fill-fg-subtle')}>
                {index === 0 ? text.start : shortDate.format(trades[index - 1].time)}
              </text>
              <rect x={round2(CHART.left + slot * index)} y={CHART.top - 30} width={round2(slot)} height={plotHeight + 30} fill="transparent" onPointerEnter={() => setHovered(index)} />
            </g>
          ))}

          {active && (
            <g pointerEvents="none">
              <line x1={CHART.left} x2={active.point.x} y1={active.point.y} y2={active.point.y} className="stroke-fg/30" strokeDasharray="3 4" />
              <rect x={2} y={active.point.y - 10} width={CHART.left - 6} height={20} rx={10} className="fill-fg" />
              <text x={(CHART.left - 4) / 2 + 2} y={active.point.y} textAnchor="middle" dominantBaseline="middle" className="fill-app text-[10px] font-bold tabular-nums">
                {compactUsd.format(active.value)}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-full border-2 border-success bg-surface" />
          {text.pnl}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-primary" />
          {text.equity}
        </span>
        {drawdown && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-danger/60 bg-[repeating-linear-gradient(45deg,var(--color-danger)_0_1.5px,transparent_1.5px_4px)] opacity-70" />
            {text.maxDrawdown}
          </span>
        )}
      </div>

      {active && (
        <div
          role="status"
          style={{ left: `${tooltipLeft}%`, top: `${(active.point.y / CHART.height) * 100}%` }}
          className={cx(
            'pointer-events-none absolute z-10 w-56 -translate-x-1/2 animate-fade-quick rounded-2xl p-3 text-xs motion-reduce:animate-none',
            frostChipClass,
            tooltipBelow ? 'translate-y-6' : '-translate-y-[calc(100%+24px)]',
          )}
        >
          {active.trade ? (
            <>
              <p className="flex items-center justify-between font-bold">
                {active.trade.symbol}
                <span className={cx('rounded-full px-2 text-[10px] font-bold text-white', active.trade.type === 'BUY' ? 'bg-[#13784a]' : 'bg-[#b4233c]')}>{active.trade.type}</span>
              </p>
              <p className={cx('mt-1 text-[11px] tabular-nums', inkMutedClass)}>{tradeTime.format(active.trade.time)}</p>
              <p className={cx('mt-2 flex justify-between border-t border-dotted border-[#0a1220]/25 pt-2', inkMutedClass)}>
                {text.pnl}
                <span className={cx('font-bold tabular-nums', active.trade.pnl >= 0 ? 'text-[#13784a]' : 'text-[#b4233c]')}>{signedMoney(active.trade.pnl)}</span>
              </p>
            </>
          ) : (
            <p className="font-bold">{text.start}</p>
          )}
          <p className={cx('mt-0.5 flex justify-between', inkMutedClass)}>
            {text.equity}
            <span className="font-bold text-[#0a1220] tabular-nums">{formatMoney(active.value, 'USD')}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────── Trade receipts ───────────── */

// Each trade carries a ring showing its size against the largest trade, filled clockwise in green or red.
function TradeRing({ share, isGain, delayMs }: { share: number; isGain: boolean; delayMs: number }) {
  const isMounted = useMounted();
  const circumference = 2 * Math.PI * RING_RADIUS;
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className="size-11 shrink-0 -rotate-90">
      <circle cx="22" cy="22" r={RING_RADIUS} fill="none" strokeWidth="3" className="stroke-line" />
      <circle
        cx="22"
        cy="22"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={round2(circumference)}
        style={{ strokeDashoffset: round2(circumference * (1 - (isMounted ? share : 0))), transition: `stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1) ${delayMs}ms` }}
        className={isGain ? 'stroke-success' : 'stroke-danger'}
      />
    </svg>
  );
}

function TradeReceipts({ trades }: { trades: FundTrade[] }) {
  const totals = runningTotals(trades);
  const largest = Math.max(1, ...trades.map((trade) => Math.abs(trade.pnl)));

  return (
    <ol className="flex flex-col px-5 pt-3 pb-5 sm:px-6">
      {trades.map((trade, index) => {
        const isGain = trade.pnl >= 0;
        return (
          <li
            key={trade.id}
            style={staggerStyle(index, 120)}
            className="group/trade flex animate-feed-in flex-col gap-3 border-b border-dotted border-line-strong py-4 last:border-b-0 motion-reduce:animate-none"
          >
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 shrink-0 place-items-center">
                <TradeRing share={Math.abs(trade.pnl) / largest} isGain={isGain} delayMs={300 + index * 140} />
                <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-bold text-fg tabular-nums">{stepNumber(index)}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="sr-only">{text.symbol}</span>
                  <span className="truncate font-bold text-fg">{trade.symbol}</span>
                  <span className="sr-only">{text.type}</span>
                  <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', trade.type === 'BUY' ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
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
              <p className={cx('shrink-0 text-lg font-black tracking-tight tabular-nums transition-transform duration-300 group-hover/trade:-translate-x-1 motion-reduce:transition-none', isGain ? 'text-success' : 'text-danger')}>
                <span className="sr-only">{text.pnl} </span>
                <CountUp value={trade.pnl} format={signedMoney} />
              </p>
            </div>

            <p className="flex items-center gap-3 pl-14 text-[11px] text-fg-muted">
              {text.equity}
              <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
              <span className="font-bold text-fg tabular-nums">{formatMoney(totals[index], 'USD')}</span>
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
      <FundTitle detail={detail} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <FundVitals detail={detail} />

          <Panel icon="trendUp" delayIndex={2} title={text.performanceOverview} aside={<RangePills value={range} onChange={setRange} />}>
            <div className="p-5 pt-3 sm:px-6">
              {chartTrades.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <span aria-hidden="true" className="relative grid size-16 place-items-center">
                    <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
                    <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
                      <Icon name="trendUp" size={18} />
                    </span>
                  </span>
                  <p className="text-sm text-fg-muted">{text.noTrades}</p>
                </div>
              ) : (
                <PearlChart key={range} trades={chartTrades} />
              )}
            </div>
          </Panel>

          <Panel
            icon="pieChart"
            delayIndex={3}
            title={text.recentTrades}
            aside={<span className="rounded-full bg-fg px-3 py-1 text-xs font-bold text-app tabular-nums">{text.tradeCount(detail.trades.length)}</span>}
          >
            <TradeReceipts trades={chronological} />
          </Panel>
        </div>

        <div style={staggerStyle(1, 200)} className="animate-rise motion-reduce:animate-none xl:sticky xl:top-6">
          <InvestTicket detail={detail} onInvest={() => setIsInvestOpen(true)} />
        </div>
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
      <BackLink />
      {plan && detail ? (
        <FundDashboard planId={plan.id} detail={detail} />
      ) : (
        <div className={cx(panelClass, 'flex flex-col items-center gap-3 px-6 py-16 text-center')}>
          <span aria-hidden="true" className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:animate-none" />
            <span className={cx(beadClass, 'size-12 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
              <Icon name="search" size={22} />
            </span>
          </span>
          <h2 className="text-base font-semibold text-fg">{text.notFound}</h2>
          <p className="text-sm text-fg-muted">{text.notFoundHint}</p>
        </div>
      )}
    </div>
  );
}
