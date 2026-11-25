'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { getMasterDetail, masterDetailCopy as copy, masterPlans, minInvestmentLabel, type MasterDetail, type MasterOrder, type MasterPlan } from './mastersData';
import { StartCopyModal } from './StartCopyModal';

type RangeId = '7D' | '2W' | '1M' | '3M' | '6M' | 'ALL';
type OrdersTab = 'closed' | 'open';

const RANGES: { id: RangeId; days: number | null }[] = [
  { id: '7D', days: 7 },
  { id: '2W', days: 14 },
  { id: '1M', days: 30 },
  { id: '3M', days: 90 },
  { id: '6M', days: 180 },
  { id: 'ALL', days: null },
];

/** Demo "today", matching the rest of the portal's Oct 28 data. */
const REFERENCE_DATE = new Date(2026, 9, 28, 23, 59);
const DAY_MS = 86_400_000;
const RISK_LEVELS = 5;
const REACTOR_TICKS = 72;

const CHART = { width: 760, height: 370, left: 46, right: 58, top: 34, bottom: 60 };
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const symbolTone: Record<string, string> = {
  XAUUSD: 'bg-primary-soft text-primary ring-primary/30',
  XAGUSD: 'bg-surface-2 text-fg ring-line-strong',
  EURUSD: 'bg-info-soft text-info ring-info/30',
};
const symbolBar: Record<string, string> = { XAUUSD: 'bg-primary', XAGUSD: 'bg-fg-muted', EURUSD: 'bg-info' };

/** Matches the screenshot's P&L style: "+$0.09" for gains, "$-0.15" for losses. */
function pnlLabel(value: number) {
  return value >= 0 ? `+${formatMoney(value, 'USD')}` : `$${value.toFixed(2)}`;
}

function signedMoney(value: number) {
  return `${value >= 0 ? '+' : ''}${formatMoney(value, 'USD')}`;
}

function runningTotals(trades: MasterOrder[]) {
  return trades.reduce<number[]>((sums, trade) => [...sums, (sums.at(-1) ?? 0) + trade.pnl], []);
}

function chronological(orders: MasterOrder[]) {
  return [...orders].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
}

function riskTone(risk: number) {
  if (risk <= 2) return 'bg-success';
  if (risk === 3) return 'bg-warning';
  return 'bg-danger';
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

function niceRange(min: number, max: number, step: number) {
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step };
}

function ticks(min: number, max: number, step: number) {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, index) => Number((min + index * step).toFixed(2)));
}

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold', className)}>{children}</span>;
}

/** Card with a soft gold light that follows the pointer. */
function SpotlightCard({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }

  return (
    <div onPointerMove={trackPointer} style={style} className={cx('group/spot relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card', className)}>
      <span
        aria-hidden="true"
        style={{ background: 'radial-gradient(280px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--brand-primary) 20%, transparent), transparent 70%)' }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100 motion-reduce:hidden"
      />
      {children}
    </div>
  );
}

function SlidingTabs<T extends string>({ label, items, value, onChange, renderLabel }: { label: string; items: readonly T[]; value: T; onChange: (item: T) => void; renderLabel: (item: T) => ReactNode }) {
  const index = items.indexOf(value);
  return (
    <div role="tablist" aria-label={label} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} className="relative grid rounded-full bg-surface-2 p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 8px) / ${items.length})`, transform: `translateX(${index * 100}%)` }}
        className="absolute top-1 bottom-1 left-1 rounded-full bg-primary shadow-[0_6px_18px_-6px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none"
      />
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === value}
          onClick={() => onChange(item)}
          className={cx('relative rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring', item === value ? 'text-on-primary' : 'text-fg-muted hover:text-fg')}
        >
          {renderLabel(item)}
        </button>
      ))}
    </div>
  );
}

function OrbitAvatar({ name }: { name: string }) {
  return (
    <span className="relative grid size-24 shrink-0 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/50 motion-reduce:hidden" />
      <span aria-hidden="true" className="absolute inset-0 animate-[orbit_10s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_35%,transparent_65%,var(--brand-primary))] motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute -inset-2 animate-[orbit_6s_linear_infinite_reverse] motion-reduce:hidden">
        <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_2px_var(--brand-primary)]" />
      </span>
      <span className="relative grid size-[86px] place-items-center rounded-full bg-elevated text-4xl font-bold text-primary">{name.charAt(0)}</span>
    </span>
  );
}

/** Total gain in the centre; the lit tick ring is the master's win rate. */
function GainReactor({ gainPercent, trades }: { gainPercent: number; trades: MasterOrder[] }) {
  const isMounted = useMounted();
  const arcId = useSvgId();
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const winRate = trades.length === 0 ? 0 : wins / trades.length;
  const litTicks = Math.round(winRate * REACTOR_TICKS);
  const view = { transformBox: 'view-box', transformOrigin: '110px 110px' } as const;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-60">
        <svg viewBox="0 0 220 220" className="size-full" aria-hidden="true">
          <defs>
            <linearGradient id={arcId} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--brand-primary)" />
            </linearGradient>
          </defs>
          {Array.from({ length: REACTOR_TICKS }, (_, index) => {
            const isLit = index < litTicks;
            return (
              <line
                key={index}
                x1="110"
                y1="6"
                x2="110"
                y2={index % 6 === 0 ? 20 : 15}
                strokeWidth={index % 6 === 0 ? 2.5 : 1.6}
                strokeLinecap="round"
                transform={`rotate(${index * (360 / REACTOR_TICKS)} 110 110)`}
                className={isLit ? 'stroke-primary' : 'stroke-line-strong'}
                style={{ opacity: isMounted || !isLit ? 1 : 0.15, transition: `opacity 260ms ease ${index * 18}ms` }}
              />
            );
          })}
          <circle cx="110" cy="110" r="82" fill="none" strokeWidth="1" className="stroke-line" />
          <g style={view} className="animate-[orbit_3.2s_linear_infinite] motion-reduce:animate-none">
            <circle cx="110" cy="110" r="82" fill="none" stroke={`url(#${arcId})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="120 400" />
          </g>
          <g style={view} className="animate-[orbit_24s_linear_infinite_reverse] motion-reduce:animate-none">
            <circle cx="110" cy="110" r="68" fill="none" strokeWidth="1.2" strokeDasharray="2 7" className="stroke-primary/60" />
          </g>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-fg-subtle uppercase">{copy.totalGain}</p>
            <p className="text-4xl font-semibold tracking-tight tabular-nums text-success drop-shadow-[0_0_18px_color-mix(in_srgb,var(--color-success)_45%,transparent)]">
              <CountUp value={gainPercent} format={formatPercent} />
            </p>
            <span className="mt-1 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted uppercase ring-1 ring-line">{copy.allTime}</span>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <span className="h-3 w-1 rounded-full bg-primary" />
        {copy.winRate} <span className="font-semibold tabular-nums text-fg">{Math.round(winRate * 100)}%</span>
        <span className="text-fg-subtle">·</span>
        <span className="tabular-nums text-success">
          {wins} {copy.wins}
        </span>
        <span className="tabular-nums text-danger">
          {trades.length - wins} {copy.losses}
        </span>
      </p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const isMounted = useMounted();
  if (values.length < 2) return null;
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 120},${34 - ((value - min) / (max - min)) * 30}`);
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-full" aria-hidden="true">
      <polyline
        points={points.join(' ')}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        className="stroke-success"
        style={{ strokeDashoffset: isMounted ? 0 : 1, transition: 'stroke-dashoffset 1400ms cubic-bezier(.4,0,.2,1) 300ms' }}
      />
    </svg>
  );
}

function RiskSegments({ risk }: { risk: number }) {
  return (
    <div className="flex h-9 items-end gap-1" aria-hidden="true">
      {Array.from({ length: RISK_LEVELS }, (_, index) => (
        <span
          key={index}
          style={{ height: `${30 + index * 17}%`, animationDelay: `${300 + index * 90}ms` }}
          className={cx('w-full origin-bottom animate-bar-rise rounded-sm motion-reduce:animate-none', index < risk ? riskTone(risk) : 'bg-surface-2')}
        />
      ))}
    </div>
  );
}

function CopierDots({ count, limit }: { count: number; limit: string }) {
  return (
    <div className="flex h-9 items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: Math.min(Math.max(count, 1), 6) }, (_, index) => (
        <span key={index} className="relative grid size-6 place-items-center">
          {index < count && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:hidden" style={{ animationDelay: `${index * 300}ms` }} />}
          <span className={cx('relative size-3.5 rounded-full', index < count ? 'bg-primary' : 'bg-surface-2 ring-1 ring-line')} />
        </span>
      ))}
      <span className="ml-auto text-xs tabular-nums text-fg-subtle">/ {limit}</span>
    </div>
  );
}

function LiquidBar() {
  return (
    <div className="relative h-9 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-line" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-primary/25">
        <svg viewBox="0 0 240 12" preserveAspectRatio="none" className="absolute -top-2.5 left-0 h-3 w-[200%] animate-liquid-wave fill-primary/25 motion-reduce:animate-none">
          <path d="M0 6 Q15 0 30 6 T60 6 T90 6 T120 6 T150 6 T180 6 T210 6 T240 6 V12 H0 Z" />
        </svg>
      </div>
    </div>
  );
}

function CoinStack() {
  return (
    <div className="flex h-9 items-end gap-1.5" aria-hidden="true">
      {[3, 5, 4, 6].map((height, column) => (
        <span key={column} className="flex flex-col-reverse gap-0.5">
          {Array.from({ length: height }, (_, row) => (
            <span
              key={row}
              style={{ animationDelay: `${column * 120 + row * 60}ms` }}
              className="h-1 w-5 animate-rise rounded-full bg-linear-to-r from-primary/60 via-primary to-primary/60 motion-reduce:animate-none"
            />
          ))}
        </span>
      ))}
    </div>
  );
}

interface Capsule {
  key: string;
  icon: IconName;
  label: string;
  caption: string;
  value: number;
  format: (value: number) => string;
  tone: string;
  viz: ReactNode;
  isLive?: boolean;
}

function MetricCapsules({ capsules }: { capsules: Capsule[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {capsules.map((capsule, index) => (
        <li key={capsule.key} style={staggerStyle(index, 110)} className="animate-rise motion-reduce:animate-none">
          <SpotlightCard className="flex h-full flex-col gap-3 p-4 transition-transform duration-300 hover:-translate-y-1">
            <div className="relative flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary transition-transform duration-300 group-hover/spot:rotate-[-8deg]">
                <Icon name={capsule.icon} size={15} />
              </span>
              <p className="min-w-0 flex-1 truncate text-xs text-fg-muted">{capsule.label}</p>
              {capsule.isLive && <LiveDot />}
            </div>
            <p className={cx('relative text-2xl font-semibold tracking-tight tabular-nums', capsule.tone)}>
              <CountUp value={capsule.value} format={capsule.format} />
            </p>
            <div className="relative">{capsule.viz}</div>
            <span className="relative self-start text-[10px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">{capsule.caption}</span>
          </SpotlightCard>
        </li>
      ))}
    </ul>
  );
}

function PerformanceChart({ trades }: { trades: MasterOrder[] }) {
  const uid = useSvgId();
  const isMounted = useMounted();
  const [hovered, setHovered] = useState<number | null>(null);
  const ids = {
    gainArea: `${uid}ga`,
    lossArea: `${uid}la`,
    line: `${uid}ln`,
    glow: `${uid}gl`,
    soft: `${uid}sf`,
    gainBar: `${uid}gb`,
    lossBar: `${uid}lb`,
    above: `${uid}ab`,
    below: `${uid}bl`,
    path: `${uid}pa`,
    column: `${uid}co`,
  };

  const cumulative = runningTotals(trades);
  const pnls = trades.map((trade) => trade.pnl);
  const left = niceRange(Math.min(-1, ...cumulative), Math.max(1, ...cumulative), 1);
  // The per-trade axis is scaled so its $0 sits on the cumulative $0 gridline: bars and line share one baseline.
  const barScale = Math.max(Math.max(0, ...pnls) / left.max, Math.min(0, ...pnls) / left.min, 0.01) * 1.15;
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const plotBottom = CHART.top + plotHeight;
  const slot = plotWidth / trades.length;
  const barWidth = Math.min(14, slot * 0.36);
  const xAt = (index: number) => CHART.left + slot * (index + 0.5);
  const yAt = (value: number) => CHART.top + ((left.max - value) / (left.max - left.min)) * plotHeight;
  const yBar = (pnl: number) => yAt(pnl / barScale);
  const zeroY = yAt(0);
  const zeroOffset = (zeroY - CHART.top) / plotHeight;

  const points = cumulative.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C${midX},${previous.y} ${midX},${point.y} ${point.x},${point.y}`;
  }, '');
  const areaPath = `${linePath} L${points.at(-1)?.x},${zeroY} L${points[0]?.x},${zeroY} Z`;

  const highWater = cumulative.reduce<number[]>((marks, value) => [...marks, Math.max(marks.at(-1) ?? 0, value)], []);
  const hwmPath = highWater.reduce((path, value, index) => (index === 0 ? `M${xAt(0)},${yAt(value)}` : `${path} H${xAt(index)} V${yAt(value)}`), '');
  const isNewHigh = (index: number) => cumulative[index] > 0 && cumulative[index] > (highWater[index - 1] ?? 0);
  const bestIndex = pnls.indexOf(Math.max(...pnls));

  const lastTotal = cumulative.at(-1) ?? 0;
  const last = points.at(-1);
  const peak = Math.max(0, ...cumulative);
  const trough = Math.min(0, ...cumulative);
  const longestStreak = pnls.reduce((streak, pnl) => {
    const run = pnl > 0 ? streak.run + 1 : 0;
    return { run, best: Math.max(streak.best, run) };
  }, { run: 0, best: 0 }).best;

  const lineDelay = 300;
  const lineDuration = 1800;
  const drawnAt = (index: number) => lineDelay + (lineDuration * (index + 1)) / points.length;
  const settled = lineDelay + lineDuration;

  const stats = [
    { key: 'net', label: copy.chartNet, value: lastTotal, format: signedMoney, tone: lastTotal >= 0 ? 'text-success' : 'text-danger' },
    { key: 'peak', label: copy.chartPeak, value: peak, format: signedMoney, tone: 'text-primary' },
    { key: 'trough', label: copy.chartTrough, value: trough, format: signedMoney, tone: 'text-danger' },
    { key: 'trades', label: copy.chartTrades, value: trades.length, format: (value: number) => String(Math.round(value)), tone: 'text-fg' },
    { key: 'streak', label: copy.bestStreak, value: longestStreak, format: (value: number) => `${Math.round(value)}W`, tone: 'text-success' },
  ];

  const active = hovered === null ? null : { index: hovered, trade: trades[hovered], total: cumulative[hovered], point: points[hovered] };
  const tooltipLeft = active ? Math.min(84, Math.max(16, (active.point.x / CHART.width) * 100)) : 0;
  const tooltipBelow = active ? active.point.y / CHART.height < 0.4 : false;

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map((stat, index) => (
          <li key={stat.key} style={staggerStyle(index, 80)} className="relative animate-rise overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2 ring-1 ring-line motion-reduce:animate-none">
            <span aria-hidden="true" className="absolute inset-x-3 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
            <p className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{stat.label}</p>
            <p className={cx('mt-0.5 text-base font-semibold tabular-nums', stat.tone)}>
              <CountUp value={stat.value} format={stat.format} />
            </p>
          </li>
        ))}
      </ul>

      <div className="relative">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="h-auto w-full min-w-[580px]" role="img" aria-label={`${copy.cumulative}: ${signedMoney(lastTotal)}`} onPointerLeave={() => setHovered(null)}>
            <defs>
              <linearGradient id={ids.line} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={CHART.top} y2={plotBottom}>
                <stop offset="0" stopColor="var(--brand-primary)" />
                <stop offset={zeroOffset} stopColor="var(--brand-primary)" />
                <stop offset={zeroOffset} stopColor="var(--color-danger)" />
                <stop offset="1" stopColor="var(--color-danger)" />
              </linearGradient>
              <linearGradient id={ids.gainArea} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={CHART.top} y2={zeroY}>
                <stop offset="0" stopColor="var(--brand-primary)" stopOpacity="0.5" />
                <stop offset="1" stopColor="var(--brand-primary)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id={ids.lossArea} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={zeroY} y2={plotBottom}>
                <stop offset="0" stopColor="var(--color-danger)" stopOpacity="0.04" />
                <stop offset="1" stopColor="var(--color-danger)" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={ids.gainBar} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--color-success)" />
                <stop offset="1" stopColor="var(--color-success)" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id={ids.lossBar} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--color-danger)" stopOpacity="0.45" />
                <stop offset="1" stopColor="var(--color-danger)" />
              </linearGradient>
              <linearGradient id={ids.column} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--brand-primary)" stopOpacity="0" />
                <stop offset="0.5" stopColor="var(--brand-primary)" stopOpacity="0.14" />
                <stop offset="1" stopColor="var(--brand-primary)" stopOpacity="0" />
              </linearGradient>
              <filter id={ids.glow} x="-10%" y="-40%" width="120%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={ids.soft} x="-100%" y="-20%" width="300%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id={ids.above}>
                <rect x={CHART.left} y={CHART.top} width={plotWidth} height={zeroY - CHART.top} />
              </clipPath>
              <clipPath id={ids.below}>
                <rect x={CHART.left} y={zeroY} width={plotWidth} height={plotBottom - zeroY} />
              </clipPath>
            </defs>

            <rect x={CHART.left} y={CHART.top} width={plotWidth} height={zeroY - CHART.top} className="fill-primary/[0.03]" />
            <rect x={CHART.left} y={zeroY} width={plotWidth} height={plotBottom - zeroY} className="fill-danger/[0.05]" />

            {ticks(left.min, left.max, 1).map((tick) => {
              const perTrade = Number((tick * barScale).toFixed(2));
              return (
                <g key={tick}>
                  <line x1={CHART.left} x2={CHART.width - CHART.right} y1={yAt(tick)} y2={yAt(tick)} className={tick === 0 ? 'stroke-line-strong' : 'stroke-line/50'} strokeDasharray={tick === 0 ? undefined : '2 6'} />
                  <text x={CHART.left - 8} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" className="fill-fg-subtle text-[10px] tabular-nums">
                    ${tick}
                  </text>
                  <text x={CHART.width - CHART.right + 8} y={yAt(tick)} dominantBaseline="middle" className="fill-fg-subtle text-[10px] tabular-nums">
                    ${perTrade}
                  </text>
                </g>
              );
            })}
            <text transform={`translate(12 ${CHART.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {copy.cumulative}
            </text>
            <text transform={`translate(${CHART.width - 6} ${CHART.top + plotHeight / 2}) rotate(90)`} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {copy.perTrade}
            </text>

            {active && <rect x={active.point.x - slot / 2} y={CHART.top} width={slot} height={plotHeight} fill={`url(#${ids.column})`} pointerEvents="none" />}

            <g filter={`url(#${ids.soft})`}>
              {trades.map((trade, index) => {
                const isGain = trade.pnl >= 0;
                const end = yBar(trade.pnl);
                const height = Math.max(3, Math.abs(end - zeroY));
                const y = isGain ? zeroY - height : zeroY;
                return (
                  <g
                    key={trade.id}
                    style={{
                      transform: `scaleY(${isMounted ? 1 : 0})`,
                      transformBox: 'fill-box',
                      transformOrigin: isGain ? 'bottom' : 'top',
                      transition: `transform 800ms cubic-bezier(.2,.9,.3,1.35) ${index * 70}ms, opacity 200ms`,
                      opacity: hovered !== null && hovered !== index ? 0.28 : 1,
                    }}
                  >
                    <rect x={xAt(index) - barWidth / 2} y={y} width={barWidth} height={height} rx={Math.min(barWidth / 2, height / 2)} fill={`url(#${isGain ? ids.gainBar : ids.lossBar})`} />
                    <rect x={xAt(index) - barWidth / 2 + 3} y={isGain ? y + 2 : y + height - 4} width={barWidth - 6} height={2} rx={1} className="fill-white/50" />
                  </g>
                );
              })}
            </g>

            {pnls[bestIndex] > 0 && (
              <g pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${trades.length * 70 + 500}ms` }}>
                <circle cx={xAt(bestIndex)} cy={yBar(pnls[bestIndex]) - 14} r="9" className="fill-primary" />
                <text x={xAt(bestIndex)} y={yBar(pnls[bestIndex]) - 13.5} textAnchor="middle" dominantBaseline="middle" className="fill-on-primary text-[10px] font-bold">
                  ★
                </text>
              </g>
            )}

            <path d={hwmPath} fill="none" strokeWidth={1.2} strokeDasharray="4 4" className="stroke-primary/50" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${settled}ms` }} />

            <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 1000ms ease ${lineDelay + lineDuration / 2}ms` }}>
              <path d={areaPath} fill={`url(#${ids.gainArea})`} clipPath={`url(#${ids.above})`} />
              <path d={areaPath} fill={`url(#${ids.lossArea})`} clipPath={`url(#${ids.below})`} />
            </g>

            <path
              d={linePath}
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeWidth={10}
              strokeLinecap="round"
              stroke={`url(#${ids.line})`}
              opacity={0.14}
              style={{ strokeDashoffset: isMounted ? 0 : 1, transition: `stroke-dashoffset ${lineDuration}ms cubic-bezier(.4,0,.2,1) ${lineDelay}ms` }}
            />
            <path
              id={ids.path}
              d={linePath}
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeWidth={3}
              strokeLinecap="round"
              stroke={`url(#${ids.line})`}
              filter={`url(#${ids.glow})`}
              style={{ strokeDashoffset: isMounted ? 0 : 1, transition: `stroke-dashoffset ${lineDuration}ms cubic-bezier(.4,0,.2,1) ${lineDelay}ms` }}
            />

            {points.map((point, index) =>
              isNewHigh(index) ? (
                <rect
                  key={`hw${trades[index].id}`}
                  x={point.x - 3.5}
                  y={point.y - 17}
                  width={7}
                  height={7}
                  transform={`rotate(45 ${point.x} ${point.y - 13.5})`}
                  className="fill-primary"
                  style={{ opacity: isMounted ? 0.9 : 0, transition: `opacity 300ms ease ${drawnAt(index)}ms` }}
                />
              ) : null,
            )}

            {points.map((point, index) => (
              <circle
                key={`pt${trades[index].id}`}
                cx={point.x}
                cy={point.y}
                r={hovered === index ? 6.5 : 3.5}
                strokeWidth={2}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${drawnAt(index)}ms` }}
                className={cx('animate-dot-pop fill-elevated transition-[r] motion-reduce:animate-none', cumulative[index] < 0 ? 'stroke-danger' : 'stroke-primary')}
              />
            ))}

            <g pointerEvents="none" className="motion-reduce:hidden" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 500ms ease ${settled}ms` }}>
              {[
                { r: 5, begin: '0s', opacity: 1 },
                { r: 3.5, begin: '0.07s', opacity: 0.55 },
                { r: 2.5, begin: '0.14s', opacity: 0.3 },
              ].map((spark) => (
                <circle key={spark.begin} r={spark.r} opacity={spark.opacity} className="fill-primary" filter={`url(#${ids.glow})`}>
                  <animateMotion dur="3.6s" begin={spark.begin} repeatCount="indefinite">
                    <mpath href={`#${ids.path}`} />
                  </animateMotion>
                </circle>
              ))}
            </g>

            {last && (
              <g pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${settled}ms` }}>
                <circle cx={last.x} cy={last.y} r="6" className="fill-primary/40 motion-reduce:hidden">
                  <animate attributeName="r" values="6;20" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx={last.x} cy={last.y} r="5.5" className="fill-primary" />
                <g transform={`translate(${Math.min(last.x - 36, CHART.width - CHART.right - 72)} ${Math.max(last.y - 34, 2)})`}>
                  <rect width="72" height="22" rx="11" className="fill-primary" filter={`url(#${ids.glow})`} />
                  <text x="36" y="11.5" textAnchor="middle" dominantBaseline="middle" className="fill-on-primary text-[11px] font-bold tabular-nums">
                    {signedMoney(lastTotal)}
                  </text>
                </g>
              </g>
            )}

            {trades.map((trade, index) => (
              <g key={`x${trade.id}`}>
                <rect
                  x={xAt(index) - slot * 0.32}
                  y={plotBottom + 9}
                  width={slot * 0.64}
                  height={hovered === index ? 8 : 5}
                  rx={2.5}
                  className={cx(trade.pnl > 0 ? 'fill-success' : 'fill-danger', 'transition-[height]')}
                  style={{ opacity: isMounted ? (hovered === null || hovered === index ? 0.9 : 0.35) : 0, transition: `opacity 300ms ease ${isMounted && hovered === null ? index * 60 + 400 : 0}ms` }}
                />
                {index % 2 === 0 && (
                  <text x={xAt(index)} y={plotBottom + 34} textAnchor="middle" className="fill-fg-subtle text-[10px]">
                    {shortDate.format(trade.closedAt)}
                  </text>
                )}
                <rect x={xAt(index) - slot / 2} y={CHART.top} width={slot} height={plotHeight + 20} fill="transparent" onPointerEnter={() => setHovered(index)} />
              </g>
            ))}

            {active && (
              <g pointerEvents="none">
                <line x1={active.point.x} x2={active.point.x} y1={CHART.top} y2={plotBottom} className="stroke-primary/60" strokeDasharray="3 4" />
                <line x1={CHART.left} x2={active.point.x} y1={active.point.y} y2={active.point.y} className="stroke-primary/35" strokeDasharray="3 4" />
                <rect x={2} y={active.point.y - 9} width={CHART.left - 6} height={18} rx={9} className="fill-primary" />
                <text x={(CHART.left - 2) / 2} y={active.point.y + 0.5} textAnchor="middle" dominantBaseline="middle" className="fill-on-primary text-[9px] font-bold tabular-nums">
                  {active.total.toFixed(2)}
                </text>
              </g>
            )}
          </svg>
        </div>

        {active && (
          <div
            role="status"
            style={{ left: `${tooltipLeft}%`, top: `${(active.point.y / CHART.height) * 100}%` }}
            className={cx(
              'pointer-events-none absolute z-10 w-60 -translate-x-1/2 animate-fade-quick overflow-hidden rounded-xl border border-primary/30 bg-elevated/90 text-xs shadow-pop backdrop-blur-md motion-reduce:animate-none',
              tooltipBelow ? 'translate-y-4' : '-translate-y-[calc(100%+16px)]',
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line bg-primary-soft/60 px-3 py-2">
              <span className="flex items-center gap-1.5 font-semibold text-fg">
                <span className="rounded bg-primary px-1 text-[10px] font-bold text-on-primary tabular-nums">#{active.index + 1}</span>
                {active.trade.symbol}
              </span>
              <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold', active.trade.direction === 'BUY' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                {active.trade.direction === 'BUY' ? '▲' : '▼'} {active.trade.direction}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 p-3">
              <p className="flex justify-between gap-3 text-fg-muted">
                <span className="whitespace-nowrap">{copy.volume}</span>
                <span className="tabular-nums text-fg">{active.trade.volume}</span>
              </p>
              <p className="flex justify-between gap-3 text-fg-muted">
                <span className="whitespace-nowrap">
                  {copy.openPrice} → {copy.closePrice}
                </span>
                <span className="whitespace-nowrap tabular-nums text-fg">
                  {active.trade.openPrice} → {active.trade.closePrice}
                </span>
              </p>
              <p className="flex justify-between gap-3 text-fg-muted">
                <span className="whitespace-nowrap">{copy.tradePnl}</span>
                <span className={cx('font-semibold tabular-nums', active.trade.pnl >= 0 ? 'text-success' : 'text-danger')}>{pnlLabel(active.trade.pnl)}</span>
              </p>
              <p className="flex justify-between gap-3 text-fg-muted">
                <span className="whitespace-nowrap">{copy.cumulative}</span>
                <span className="font-semibold tabular-nums text-primary">{signedMoney(active.total)}</span>
              </p>
              <span className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                <span style={{ width: `${peak > 0 ? Math.max(0, active.total / peak) * 100 : 0}%` }} className="block h-full rounded-full bg-primary transition-[width] duration-300" />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeDna({ trades }: { trades: MasterOrder[] }) {
  const best = trades.reduce((top, trade) => (trade.pnl > top.pnl ? trade : top), trades[0]);
  const worst = trades.reduce((low, trade) => (trade.pnl < low.pnl ? trade : low), trades[0]);
  const buys = trades.filter((trade) => trade.direction === 'BUY').length;
  const symbols = Object.entries(
    trades.reduce<Record<string, number>>((counts, trade) => ({ ...counts, [trade.symbol]: (counts[trade.symbol] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);

  const extremes = [
    { key: 'best', label: copy.bestTrade, trade: best, icon: 'trophy' as const, tone: 'bg-success-soft text-success', badge: 'bg-success text-on-primary' },
    { key: 'worst', label: copy.worstTrade, trade: worst, icon: 'trendDown' as const, tone: 'bg-danger-soft text-danger', badge: 'bg-danger text-on-primary' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {extremes.map((item, index) => (
        <div key={item.key} style={staggerStyle(index, 120)} className={cx('flex animate-rise items-center gap-3 rounded-xl p-3 motion-reduce:animate-none', item.tone)}>
          <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', item.badge)}>
            <Icon name={item.icon} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] opacity-80">{item.label}</p>
            <p className="truncate text-sm font-semibold text-fg">
              {item.trade.symbol} · {item.trade.direction}
            </p>
          </div>
          <span className="text-sm font-bold tabular-nums">{pnlLabel(item.trade.pnl)}</span>
        </div>
      ))}

      <div>
        <p className="mb-2 flex justify-between text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">
          {copy.buySell}
          <span className="tabular-nums normal-case">
            <span className="text-success">{buys}</span> / <span className="text-danger">{trades.length - buys}</span>
          </span>
        </p>
        <div className="flex h-2.5 gap-1 overflow-hidden rounded-full">
          <span style={{ width: `${(buys / trades.length) * 100}%` }} className="origin-left animate-grow rounded-full bg-success motion-reduce:animate-none" />
          <span className="flex-1 origin-right animate-grow rounded-full bg-danger motion-reduce:animate-none" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">{copy.symbolMix}</p>
        <div className="flex h-2.5 gap-1 overflow-hidden rounded-full">
          {symbols.map(([symbol, count], index) => (
            <span
              key={symbol}
              style={{ width: `${(count / trades.length) * 100}%`, animationDelay: `${index * 150}ms` }}
              className={cx('origin-left animate-grow rounded-full motion-reduce:animate-none', symbolBar[symbol] ?? 'bg-fg-subtle')}
            />
          ))}
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {symbols.map(([symbol, count]) => (
            <li key={symbol} className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className={cx('size-2 rounded-full', symbolBar[symbol] ?? 'bg-fg-subtle')} />
              {symbol}
              <span className="font-semibold tabular-nums text-fg">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanTicket({ plan, detail, onSubscribe }: { plan: MasterPlan; detail: MasterDetail; onSubscribe: () => void }) {
  const stubs = [
    { label: copy.minCapital, value: minInvestmentLabel(plan) },
    { label: copy.copiers, value: `${detail.activeCopiers} / ${detail.copierLimit}` },
    { label: copy.server, value: detail.server },
  ];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/25 via-surface-2 to-surface-2 ring-1 ring-primary/30 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_var(--brand-primary)]">
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      <div className="relative flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-fg-subtle uppercase">{copy.plan}</p>
          <p className="mt-0.5 truncate text-lg font-semibold text-fg">{plan.name}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            <span className="text-fg-subtle">{copy.commission}:</span> {detail.commission}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-fg-subtle uppercase">{copy.status}</p>
          <Chip className="mt-1 bg-success-soft text-success">
            <LiveDot />
            {detail.planStatus}
          </Chip>
        </div>
      </div>

      <div aria-hidden="true" className="relative mx-4 border-t-2 border-dashed border-line-strong">
        <span className="absolute top-0 -left-7 size-6 -translate-y-1/2 rounded-full bg-surface" />
        <span className="absolute top-0 -right-7 size-6 -translate-y-1/2 rounded-full bg-surface" />
      </div>

      <dl className="relative grid grid-cols-3 gap-2 p-4">
        {stubs.map((stub) => (
          <div key={stub.label}>
            <dt className="text-[10px] tracking-wide text-fg-subtle uppercase">{stub.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{stub.value}</dd>
          </div>
        ))}
      </dl>
      <div className="relative px-4 pb-4">
        <Button fullWidth aria-haspopup="dialog" onClick={onSubscribe}>
          {copy.subscribe}
          <Icon name="arrowRight" size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}

function Panel({ title, aside, delayIndex, className, children }: { title: ReactNode; aside?: ReactNode; delayIndex: number; className?: string; children: ReactNode }) {
  return (
    <section style={staggerStyle(delayIndex, 140)} className={cx('animate-rise rounded-2xl border border-line bg-surface shadow-card motion-reduce:animate-none', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
          <span aria-hidden="true" className="h-4 w-1 rounded-full bg-primary" />
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

function PriceTrack({ order }: { order: MasterOrder }) {
  const isUp = Number(order.closePrice) >= Number(order.openPrice);
  return (
    <div className="flex items-center gap-2 text-xs tabular-nums">
      <span className="text-fg-muted">{order.openPrice}</span>
      <span className="relative h-1 min-w-10 flex-1 rounded-full bg-surface-2">
        <span className={cx('absolute inset-0 origin-left animate-grow rounded-full motion-reduce:animate-none', isUp ? 'bg-linear-to-r from-success/10 to-success' : 'bg-linear-to-r from-danger/10 to-danger')} />
        <span className={cx('absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface', isUp ? 'bg-success' : 'bg-danger')} />
      </span>
      <span className="font-semibold text-fg">{order.closePrice}</span>
    </div>
  );
}

function TradeTape({ orders }: { orders: MasterOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="grid size-12 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
          <Icon name="inbox" size={20} />
        </span>
        <p className="text-sm text-fg-muted">{copy.noOrders}</p>
      </div>
    );
  }

  const maxAbs = Math.max(...orders.map((order) => Math.abs(order.pnl)));
  const grid = 'md:grid-cols-[minmax(0,1fr)_96px_80px_minmax(0,1.7fr)_120px]';
  const headClass = 'text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase';

  return (
    <div className="flex flex-col gap-2">
      <div className={cx('hidden gap-4 px-4 md:grid', grid)}>
        <span className={headClass}>{copy.symbol}</span>
        <span className={headClass}>{copy.direction}</span>
        <span className={headClass}>{copy.volume}</span>
        <span className={headClass}>
          {copy.openPrice} → {copy.closePrice}
        </span>
        <span className={cx(headClass, 'text-right')}>{copy.pnl}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {orders.map((order, index) => {
          const isGain = order.pnl >= 0;
          const isBuy = order.direction === 'BUY';
          return (
            <li
              key={order.id}
              style={staggerStyle(index, 45)}
              className={cx(
                'group relative grid animate-feed-in grid-cols-2 items-center gap-x-4 gap-y-3 overflow-hidden rounded-xl bg-surface-2/50 px-4 py-3 ring-1 ring-line transition-[translate,background-color,box-shadow] duration-200 hover:translate-x-1 hover:bg-hover hover:ring-primary/40 motion-reduce:animate-none',
                grid,
              )}
            >
              <span aria-hidden="true" className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full opacity-0 transition-opacity group-hover:opacity-100', isGain ? 'bg-success' : 'bg-danger')} />
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg text-[10px] font-bold ring-1', symbolTone[order.symbol] ?? 'bg-surface-2 text-fg ring-line')}>{order.symbol.slice(0, 3)}</span>
                <span className="truncate font-semibold text-fg">{order.symbol}</span>
              </div>
              <div className="justify-self-end md:justify-self-start">
                <Chip className={isBuy ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}>
                  <Icon name={isBuy ? 'trendUp' : 'trendDown'} size={12} />
                  {order.direction}
                </Chip>
              </div>
              <p className="text-sm tabular-nums text-fg-muted">
                <span className="text-[10px] text-fg-subtle uppercase md:hidden">{copy.volume} </span>
                {order.volume}
              </p>
              <div className="col-span-2 md:col-span-1">
                <PriceTrack order={order} />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                <span className="hidden h-6 w-10 items-end gap-0.5 sm:flex" aria-hidden="true">
                  <span style={{ height: `${Math.max(12, (Math.abs(order.pnl) / maxAbs) * 100)}%` }} className={cx('w-full origin-bottom animate-bar-rise rounded-sm motion-reduce:animate-none', isGain ? 'bg-success/70' : 'bg-danger/70')} />
                </span>
                <span className={cx('min-w-16 rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums', isGain ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{pnlLabel(order.pnl)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MasterDashboard({ plan, detail }: { plan: MasterPlan; detail: MasterDetail }) {
  const [range, setRange] = useState<RangeId>('3M');
  const [replayCount, setReplayCount] = useState(0);
  const [ordersTab, setOrdersTab] = useState<OrdersTab>('closed');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);

  const allTrades = useMemo(() => chronological(detail.closedOrders), [detail.closedOrders]);
  const chartTrades = useMemo(() => {
    const days = RANGES.find((item) => item.id === range)?.days ?? null;
    const since = days === null ? 0 : REFERENCE_DATE.getTime() - days * DAY_MS;
    return allTrades.filter((order) => order.closedAt.getTime() >= since);
  }, [range, allTrades]);

  const tabOrders = ordersTab === 'closed' ? detail.closedOrders : detail.openOrders;
  const tabSymbols = ['all', ...new Set(tabOrders.map((order) => order.symbol))];
  const visibleOrders = symbolFilter === 'all' ? tabOrders : tabOrders.filter((order) => order.symbol === symbolFilter);

  const capsules: Capsule[] = [
    { key: 'pnl', icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: detail.totalPnl, format: signedMoney, tone: 'text-success', viz: <Sparkline values={runningTotals(allTrades)} /> },
    { key: 'drawdown', icon: 'trendDown', label: copy.maxDrawdown, caption: copy.riskMetric, value: detail.maxDrawdownPercent, format: (value) => `${value.toFixed(2)}%`, tone: 'text-danger', viz: <RiskSegments risk={plan.risk} /> },
    { key: 'copiers', icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: detail.activeCopiers, format: (value) => String(Math.round(value)), tone: 'text-fg', viz: <CopierDots count={detail.activeCopiers} limit={detail.copierLimit} />, isLive: true },
    ...(detail.equity === null
      ? []
      : [{ key: 'equity', icon: 'wallet' as const, label: copy.masterEquity, caption: copy.current, value: detail.equity, format: (value: number) => formatMoney(value, 'USD'), tone: 'text-fg', viz: <LiquidBar /> }]),
    { key: 'min', icon: 'bank', label: copy.minInvestment, caption: copy.entryCapital, value: plan.minInvestment, format: () => minInvestmentLabel(plan), tone: 'text-primary', viz: <CoinStack /> },
  ];

  const playbook = [
    { key: 'strategy', icon: 'compass' as const, label: copy.strategy, text: detail.strategy, tone: 'text-primary' },
    { key: 'risk', icon: 'alert' as const, label: copy.riskInformation, text: detail.riskInfo, tone: 'text-warning' },
  ].filter((item) => item.text);

  return (
    <>
      <section className="kpi-card relative animate-rise overflow-hidden rounded-2xl motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-24 size-96 animate-drift rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-40 size-96 animate-drift rounded-full bg-success/15 blur-3xl [animation-delay:-8s] motion-reduce:animate-none" />
        {[
          'top-[18%] left-[42%]',
          'top-[62%] left-[30%]',
          'top-[28%] right-[34%]',
          'bottom-[30%] right-[8%]',
          'top-[10%] right-[12%]',
        ].map((position, index) => (
          <span key={position} aria-hidden="true" style={{ animationDelay: `${index * 0.6}s` }} className={cx('pointer-events-none absolute size-1 animate-twinkle rounded-full bg-primary motion-reduce:hidden', position)} />
        ))}

        <div className="relative grid items-center gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:p-8">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-center gap-5">
              <OrbitAvatar name={plan.name} />
              <div className="flex min-w-0 flex-col gap-2">
                <h2 className="animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-3xl font-bold tracking-tight text-transparent motion-reduce:animate-none sm:text-4xl">{plan.name}</h2>
                <p className="text-sm text-fg-muted">
                  {copy.by} <span className="font-semibold text-fg">{plan.master}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip className="bg-warning-soft text-warning">
                    {copy.risk} {plan.risk}
                  </Chip>
                  {detail.code && <Chip className="bg-surface-2 font-mono text-fg-muted ring-1 ring-line">{detail.code}</Chip>}
                  <Chip className="bg-surface-2 text-fg-muted ring-1 ring-line">
                    <LiveDot />
                    {copy.active} {plan.activeDays}D
                  </Chip>
                </div>
              </div>
            </div>

            {playbook.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-fg-subtle uppercase">{copy.disclosure}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {playbook.map((item, index) => (
                    <div key={item.key} style={staggerStyle(index + 2, 150)} className="flex animate-rise gap-3 rounded-xl bg-surface/60 p-3 ring-1 ring-line backdrop-blur motion-reduce:animate-none">
                      <Icon name={item.icon} size={18} className={cx('mt-0.5 shrink-0', item.tone)} />
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">{item.label}</p>
                        <p className="mt-0.5 text-sm text-fg">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button aria-haspopup="dialog" onClick={() => setIsSubscribeOpen(true)} className="group/sub relative self-start overflow-hidden">
              <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
              <Icon name="checkCircle" size={16} className="relative transition-transform duration-300 group-hover/sub:rotate-[360deg]" />
              <span className="relative">{copy.subscribeToPlan}</span>
            </Button>
          </div>

          <GainReactor gainPercent={detail.totalGainPercent} trades={allTrades} />
        </div>


      </section>

      <MetricCapsules capsules={capsules} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          delayIndex={1}
          title={copy.performance}
          aside={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReplayCount((count) => count + 1)}
                className="group/replay inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span aria-hidden="true" className="inline-block transition-transform duration-500 group-hover/replay:-rotate-180">
                  ↻
                </span>
                {copy.replay}
              </button>
              <SlidingTabs label={copy.performance} items={RANGES.map((item) => item.id)} value={range} onChange={setRange} renderLabel={(item) => item} />
            </div>
          }
        >
          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="text-fg-muted">{copy.performanceNote}</p>
              <div className="flex items-center gap-4 text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
                  {copy.cumulative}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-1.5 rounded-full bg-success" />
                  {copy.tradePnl}
                </span>
              </div>
            </div>
            {chartTrades.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <span className="grid size-12 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
                  <Icon name="trendUp" size={20} />
                </span>
                <p className="text-sm text-fg-muted">{copy.noTrades}</p>
              </div>
            ) : (
              <PerformanceChart key={`${range}-${replayCount}`} trades={chartTrades} />
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          {chartTrades.length > 0 && (
            <Panel delayIndex={2} title={copy.tradeDna}>
              <div className="p-5">
                <TradeDna key={range} trades={chartTrades} />
              </div>
            </Panel>
          )}
          <Panel delayIndex={3} title={copy.availablePlans(1)}>
            <div className="p-5">
              <PlanTicket plan={plan} detail={detail} onSubscribe={() => setIsSubscribeOpen(true)} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        delayIndex={4}
        title={copy.orders}
        aside={
          <SlidingTabs
            label={copy.orders}
            items={['closed', 'open'] as const}
            value={ordersTab}
            onChange={(tab) => {
              setOrdersTab(tab);
              setSymbolFilter('all');
            }}
            renderLabel={(tab) => (tab === 'closed' ? copy.closed(detail.closedOrders.length) : copy.open(detail.openOrders.length))}
          />
        }
      >
        <div className="flex flex-col gap-4 p-5">
          {tabOrders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tabSymbols.map((symbol) => {
                const isSelected = symbolFilter === symbol;
                const count = symbol === 'all' ? tabOrders.length : tabOrders.filter((order) => order.symbol === symbol).length;
                return (
                  <button
                    key={symbol}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSymbolFilter(symbol)}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-[background-color,color,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring',
                      isSelected ? 'bg-primary-soft text-primary ring-primary/50' : 'text-fg-muted ring-line hover:text-fg',
                    )}
                  >
                    {symbol === 'all' ? copy.allSymbols : symbol}
                    <span className="rounded-full bg-surface-2 px-1.5 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          <TradeTape key={`${ordersTab}-${symbolFilter}`} orders={visibleOrders} />
        </div>
      </Panel>

      {isSubscribeOpen && (
        <StartCopyModal
          plan={{ name: plan.name, feePercent: plan.feePercent, minInvestment: plan.minInvestment, minInvestmentLabel: minInvestmentLabel(plan) }}
          onClose={() => setIsSubscribeOpen(false)}
        />
      )}
    </>
  );
}

export default function MasterDetailPage({ masterId }: { masterId: string }) {
  const plan = masterPlans.find((item) => item.id === masterId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={plan?.name ?? copy.notFound} />
      <Link
        href="/copy-trading/masters"
        className="group inline-flex items-center gap-2 self-start rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="arrowRight" size={15} className="rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
        {copy.back}
      </Link>
      {plan ? (
        <MasterDashboard plan={plan} detail={getMasterDetail(plan)} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-card">
          <span className="grid size-14 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
            <Icon name="search" size={24} />
          </span>
          <p className="text-base font-semibold text-fg">{copy.notFound}</p>
          <p className="text-sm text-fg-muted">{copy.notFoundHint}</p>
        </div>
      )}
    </div>
  );
}
