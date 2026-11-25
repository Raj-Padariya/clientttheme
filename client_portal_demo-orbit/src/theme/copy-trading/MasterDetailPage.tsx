'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
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

const CHART = { width: 760, height: 340, left: 52, right: 56, top: 30, bottom: 62 };
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';
const ARROW = '\u2192';
const UP = '\u25B2';
const DOWN = '\u25BC';

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

function r2(value: number) {
  return Math.round(value * 100) / 100;
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

/* ───────────── Small shared pieces ───────────── */

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold', className)}>{children}</span>;
}

/** Text tabs with a glowing underline that slides to the active item. */
function UnderlineTabs<T extends string>({ label, items, value, onChange, renderLabel }: { label: string; items: readonly T[]; value: T; onChange: (item: T) => void; renderLabel: (item: T) => ReactNode }) {
  const index = items.indexOf(value);
  return (
    <div role="tablist" aria-label={label} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} className="relative grid border-b border-line">
      <span
        aria-hidden="true"
        style={{ width: `${100 / items.length}%`, transform: `translateX(${index * 100}%)` }}
        className="absolute -bottom-px left-0 h-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none"
      />
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === value}
          onClick={() => onChange(item)}
          className={cx(
            'px-3 pt-1 pb-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
            item === value ? 'text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          {renderLabel(item)}
        </button>
      ))}
    </div>
  );
}

function Section({ title, icon, aside, delayIndex, className, children }: { title: ReactNode; icon: IconName; aside?: ReactNode; delayIndex: number; className?: string; children: ReactNode }) {
  return (
    <section style={staggerStyle(delayIndex, 140)} className={cx('orbit-card relative flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none', className)}>
      <header className="flex flex-wrap items-center gap-3 px-5 pt-5">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon name={icon} size={14} />
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-fg uppercase">{title}</h2>
        <span aria-hidden="true" className="hidden h-px min-w-8 flex-1 bg-linear-to-r from-primary/40 to-transparent sm:block" />
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ───────────── Hero: identity + gain console ───────────── */

function Monogram({ name }: { name: string }) {
  return (
    <span className="relative grid size-20 shrink-0 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 animate-[spin_9s_linear_infinite] rounded-[1.6rem] border border-dashed border-primary/50 motion-reduce:animate-none" />
      <span className="relative grid size-16 place-items-center rounded-[1.25rem] border border-primary/40 bg-primary/15 text-3xl font-bold text-primary shadow-[0_12px_30px_-14px_var(--brand-primary)]">
        {name.charAt(0)}
      </span>
      <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-lg border border-line bg-surface">
        <LiveDot />
      </span>
    </span>
  );
}

/** Total gain over a "barcode" of every trade (bar height = size of the P&L), with the win/loss split below. */
function GainConsole({ gainPercent, trades }: { gainPercent: number; trades: MasterOrder[] }) {
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const winRate = trades.length === 0 ? 0 : wins / trades.length;
  const maxAbs = Math.max(0.01, ...trades.map((trade) => Math.abs(trade.pnl)));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{copy.totalGain}</p>
        <span className="rounded-lg border border-line bg-fg/[0.03] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted uppercase">{copy.allTime}</span>
      </div>
      <p className="text-6xl font-semibold tracking-tight text-success tabular-nums">
        <CountUp value={gainPercent} format={formatPercent} />
      </p>

      {trades.length > 0 && (
        <div aria-hidden="true" className="flex h-16 items-end gap-1 border-b border-line pb-px">
          {trades.map((trade, index) => (
            <span
              key={trade.id}
              style={{ height: `${Math.max(12, (Math.abs(trade.pnl) / maxAbs) * 100)}%`, ...staggerStyle(index, 50) }}
              className={cx('min-w-0 flex-1 origin-bottom animate-tick-rise rounded-t-[3px] motion-reduce:animate-none', trade.pnl > 0 ? 'bg-success/70' : 'bg-danger/60')}
            />
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-fg/[0.06]">
          <span style={{ width: `${winRate * 100}%` }} className="rounded-full bg-success" />
          {trades.length > 0 && <span className="flex-1 rounded-full bg-danger/70" />}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          {copy.winRate} <span className="font-semibold text-fg tabular-nums">{Math.round(winRate * 100)}%</span>
          <span className="text-fg-subtle">·</span>
          <span className="text-success tabular-nums">
            {wins} {copy.wins}
          </span>
          <span className="text-danger tabular-nums">
            {trades.length - wins} {copy.losses}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ───────────── Metric bento + its mini visuals ───────────── */

function AreaSpark({ values, tall }: { values: number[]; tall?: boolean }) {
  const gradientId = useSvgId();
  const isMounted = useMounted();
  if (values.length < 2) return null;

  const width = 200;
  const height = tall ? 80 : 36;
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1);
  const points = values.map((value, index) => `${r2((index / (values.length - 1)) * width)},${r2(height - 2 - ((value - min) / (max - min)) * (height - 6))}`);
  const line = `M${points.join(' L')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cx('w-full', tall ? 'h-28' : 'h-9')} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-success)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--color-success)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g style={{ transform: `scaleX(${isMounted ? 1 : 0})`, transformBox: 'fill-box', transformOrigin: 'left', transition: 'transform 1200ms cubic-bezier(.4,0,.2,1) 300ms' }}>
        <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-success" />
      </g>
    </svg>
  );
}

/** Low → high risk track with a knob on the master's level. */
function RiskScale({ risk }: { risk: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      <div className="relative h-2 rounded-full bg-linear-to-r from-success/40 via-warning/40 to-danger/45">
        {[1, 2, 3, 4].map((notch) => (
          <span key={notch} style={{ left: `${(notch / RISK_LEVELS) * 100}%` }} className="absolute inset-y-0 w-px bg-surface" />
        ))}
        <span
          style={{ left: `${((risk - 0.5) / RISK_LEVELS) * 100}%` }}
          className={cx('absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-card', riskTone(risk))}
        />
      </div>
      <div className="flex justify-between px-1 text-[9px] text-fg-subtle tabular-nums">
        {Array.from({ length: RISK_LEVELS }, (_, level) => (
          <span key={level} className={cx(level + 1 === risk && 'font-bold text-fg')}>
            {level + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function CopierStack({ count, limit }: { count: number; limit: string }) {
  return (
    <div className="flex h-9 items-center" aria-hidden="true">
      <span className="flex -space-x-2">
        {Array.from({ length: Math.min(count, 5) }, (_, index) => (
          <span key={index} className="grid size-7 place-items-center rounded-full border-2 border-surface bg-primary/25 text-primary">
            <Icon name="user" size={12} />
          </span>
        ))}
        <span className="grid size-7 place-items-center rounded-full border-2 border-dashed border-primary/40 bg-surface text-xs text-primary">+</span>
      </span>
      <span className="ml-auto text-xs text-fg-subtle tabular-nums">/ {limit}</span>
    </div>
  );
}

function PulseLine() {
  return (
    <svg viewBox="0 0 200 36" preserveAspectRatio="none" className="h-9 w-full" aria-hidden="true">
      <path
        d="M0 18 H44 L52 6 L60 30 L68 12 L74 18 H124 L132 8 L140 28 L146 18 H200"
        fill="none"
        strokeWidth="1.8"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-primary/70"
      />
    </svg>
  );
}

function CoinStacks() {
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-auto" aria-hidden="true">
      {[2, 3, 4, 5].map((height, column) =>
        Array.from({ length: height }, (_, row) => (
          <ellipse
            key={`${column}-${row}`}
            cx={14 + column * 30}
            cy={31 - row * 5}
            rx="11"
            ry="3.5"
            strokeWidth="1"
            style={{ animationDelay: `${column * 120 + row * 60}ms` }}
            className="animate-rise fill-primary/25 stroke-primary/70 motion-reduce:animate-none"
          />
        )),
      )}
    </svg>
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

/** The first metric gets the big 2×2 tile; an odd tail tile stretches so the grid never leaves a hole. */
function MetricBento({ capsules }: { capsules: Capsule[] }) {
  const smallCount = capsules.length - 1;

  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {capsules.map((capsule, index) => {
        const isFeatured = index === 0;
        const isWide = !isFeatured && index === capsules.length - 1 && smallCount % 2 === 1;
        return (
          <li
            key={capsule.key}
            style={staggerStyle(index, 100)}
            className={cx(
              'orbit-card group relative isolate flex min-w-0 animate-rise flex-col gap-3 overflow-hidden p-5 transition-[translate] duration-300 hover:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none',
              isFeatured && 'col-span-2 lg:row-span-2',
              isWide && 'col-span-2',
            )}
          >
            {isFeatured && (
              <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 -z-10 size-64 rounded-full bg-success/10 blur-3xl" />
            )}
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">{capsule.label}</p>
              {capsule.isLive && <LiveDot />}
              <span className="grid size-8 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-300 group-hover:-rotate-8 motion-reduce:transition-none">
                <Icon name={capsule.icon} size={15} />
              </span>
            </div>
            <p className={cx('font-semibold tracking-tight tabular-nums', isFeatured ? 'text-5xl' : 'text-2xl', capsule.tone)}>
              <CountUp value={capsule.value} format={capsule.format} />
            </p>
            <div className="mt-auto">{capsule.viz}</div>
            <span className={cx(eyebrow, 'text-fg-subtle')}>{capsule.caption}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── Performance: stepped equity + lollipop trades + docked readout ───────────── */

function ReadoutField({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-[10px] tracking-wide whitespace-nowrap text-fg-subtle uppercase">{label}</span>
      <span className={cx('font-semibold whitespace-nowrap tabular-nums', tone ?? 'text-fg')}>{value}</span>
    </span>
  );
}

function PerformanceChart({ trades }: { trades: MasterOrder[] }) {
  const uid = useSvgId();
  const isMounted = useMounted();
  const [hovered, setHovered] = useState<number | null>(null);
  const ids = { gainArea: `${uid}ga`, lossArea: `${uid}la`, line: `${uid}ln`, above: `${uid}ab`, below: `${uid}bl`, path: `${uid}pa` };

  const cumulative = runningTotals(trades);
  const pnls = trades.map((trade) => trade.pnl);
  const left = niceRange(Math.min(-1, ...cumulative), Math.max(1, ...cumulative), 1);
  // The per-trade axis is scaled so its $0 sits on the cumulative $0 line: lollipops and the equity step share one baseline.
  const barScale = Math.max(Math.max(0, ...pnls) / left.max, Math.min(0, ...pnls) / left.min, 0.01) * 1.15;
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const plotBottom = CHART.top + plotHeight;
  const slot = plotWidth / trades.length;
  const xAt = (index: number) => CHART.left + slot * (index + 0.5);
  const edgeAt = (index: number) => CHART.left + slot * index;
  const yAt = (value: number) => CHART.top + ((left.max - value) / (left.max - left.min)) * plotHeight;
  const yBar = (pnl: number) => yAt(pnl / barScale);
  const zeroY = yAt(0);
  const zeroOffset = (zeroY - CHART.top) / plotHeight;

  // Equity steps up/down at the start of each trade's slot and holds flat across it.
  const stepPath = (levels: number[]) => levels.reduce((path, level, index) => `${path} V${r2(yAt(level))} H${r2(edgeAt(index + 1))}`, `M${r2(CHART.left)},${r2(zeroY)}`);
  const highWater = cumulative.reduce<number[]>((marks, value) => [...marks, Math.max(marks.at(-1) ?? 0, value)], []);
  const linePath = stepPath(cumulative);
  const areaPath = `${linePath} V${r2(zeroY)} Z`;
  const hwmPath = stepPath(highWater);
  const isNewHigh = (index: number) => cumulative[index] > 0 && cumulative[index] > (highWater[index - 1] ?? 0);
  const bestIndex = pnls.indexOf(Math.max(...pnls));

  const lastTotal = cumulative.at(-1) ?? 0;
  const peak = Math.max(0, ...cumulative);
  const trough = Math.min(0, ...cumulative);
  const longestStreak = pnls.reduce((streak, pnl) => {
    const run = pnl > 0 ? streak.run + 1 : 0;
    return { run, best: Math.max(streak.best, run) };
  }, { run: 0, best: 0 }).best;

  const lineDelay = 300;
  const lineDuration = 1800;
  const drawnAt = (index: number) => lineDelay + (lineDuration * (index + 1)) / trades.length;
  const settled = lineDelay + lineDuration;

  const stats = [
    { key: 'net', label: copy.chartNet, value: lastTotal, format: signedMoney, tone: lastTotal >= 0 ? 'text-success' : 'text-danger' },
    { key: 'peak', label: copy.chartPeak, value: peak, format: signedMoney, tone: 'text-primary' },
    { key: 'trough', label: copy.chartTrough, value: trough, format: signedMoney, tone: 'text-danger' },
    { key: 'trades', label: copy.chartTrades, value: trades.length, format: (value: number) => String(Math.round(value)), tone: 'text-fg' },
    { key: 'streak', label: copy.bestStreak, value: longestStreak, format: (value: number) => `${Math.round(value)}W`, tone: 'text-success' },
  ];

  // The readout shows the hovered trade, or the latest one while nothing is hovered.
  const focusIndex = hovered ?? trades.length - 1;
  const focusTrade = trades[focusIndex];
  const focusTotal = cumulative[focusIndex];
  const lastY = yAt(lastTotal);
  const endX = CHART.left + plotWidth;

  return (
    <div className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-xs">
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          {hovered === null ? <LiveDot /> : <span className="rounded-md bg-primary/20 px-1.5 font-mono text-[10px] text-primary tabular-nums">#{focusIndex + 1}</span>}
          {focusTrade.symbol}
          <span className={cx('rounded-md px-1.5 py-0.5 text-[10px] font-bold', focusTrade.direction === 'BUY' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {focusTrade.direction === 'BUY' ? UP : DOWN} {focusTrade.direction}
          </span>
        </span>
        <ReadoutField label={copy.volume} value={focusTrade.volume} />
        <ReadoutField label={`${copy.openPrice} ${ARROW} ${copy.closePrice}`} value={`${focusTrade.openPrice} ${ARROW} ${focusTrade.closePrice}`} />
        <ReadoutField label={copy.tradePnl} value={pnlLabel(focusTrade.pnl)} tone={focusTrade.pnl >= 0 ? 'text-success' : 'text-danger'} />
        <ReadoutField label={copy.cumulative} value={signedMoney(focusTotal)} tone="text-primary" />
        <span aria-hidden="true" className="h-1 min-w-20 flex-1 overflow-hidden rounded-full bg-fg/[0.08]">
          <span style={{ width: `${peak > 0 ? Math.max(0, focusTotal / peak) * 100 : 0}%` }} className="block h-full rounded-full bg-primary transition-[width] duration-300" />
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_10.5rem]">
        <div className="relative min-w-0">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            className="h-auto w-full min-w-[580px]"
            role="img"
            aria-label={`${copy.cumulative}: ${signedMoney(lastTotal)}`}
            onPointerLeave={() => setHovered(null)}
          >
            <defs>
              <linearGradient id={ids.line} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={CHART.top} y2={plotBottom}>
                <stop offset="0" stopColor="var(--brand-primary)" />
                <stop offset={zeroOffset} stopColor="var(--brand-primary)" />
                <stop offset={zeroOffset} stopColor="var(--color-danger)" />
                <stop offset="1" stopColor="var(--color-danger)" />
              </linearGradient>
              <linearGradient id={ids.gainArea} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={CHART.top} y2={zeroY}>
                <stop offset="0" stopColor="var(--brand-primary)" stopOpacity="0.24" />
                <stop offset="1" stopColor="var(--brand-primary)" stopOpacity="0.03" />
              </linearGradient>
              <linearGradient id={ids.lossArea} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={zeroY} y2={plotBottom}>
                <stop offset="0" stopColor="var(--color-danger)" stopOpacity="0.03" />
                <stop offset="1" stopColor="var(--color-danger)" stopOpacity="0.24" />
              </linearGradient>
              <clipPath id={ids.above}>
                <rect x={CHART.left} y={CHART.top} width={plotWidth} height={r2(zeroY - CHART.top)} />
              </clipPath>
              <clipPath id={ids.below}>
                <rect x={CHART.left} y={r2(zeroY)} width={plotWidth} height={r2(plotBottom - zeroY)} />
              </clipPath>
            </defs>

            {ticks(left.min, left.max, 1).map((tick) => {
              const perTrade = Number((tick * barScale).toFixed(2));
              const y = r2(yAt(tick));
              return (
                <g key={tick}>
                  {tick === 0 ? (
                    <line x1={CHART.left} x2={endX} y1={y} y2={y} className="stroke-line-strong" />
                  ) : (
                    <line x1={CHART.left} x2={endX} y1={y} y2={y} className="stroke-line/40" strokeDasharray="1 7" strokeLinecap="round" />
                  )}
                  <rect x={4} y={y - 8} width={CHART.left - 12} height={16} rx={8} className={tick === 0 ? 'fill-fg/10' : 'fill-fg/[0.04]'} />
                  <text x={(CHART.left - 4) / 2} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" className="fill-fg-subtle text-[9px] tabular-nums">
                    ${tick}
                  </text>
                  <text x={endX + 8} y={y} dominantBaseline="middle" className="fill-fg-subtle text-[10px] tabular-nums">
                    ${perTrade}
                  </text>
                </g>
              );
            })}
            <text transform={`translate(${CHART.width - 6} ${r2(CHART.top + plotHeight / 2)}) rotate(90)`} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {copy.perTrade}
            </text>

            {hovered !== null && <rect x={r2(edgeAt(hovered))} y={CHART.top} width={r2(slot)} height={plotHeight} rx={6} className="fill-primary/[0.07]" pointerEvents="none" />}

            {/* Gap between the high-water mark and the equity step = drawdown from the running peak. */}
            <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${settled}ms` }}>
              {cumulative.map((value, index) => {
                const top = yAt(highWater[index]);
                const height = yAt(value) - top;
                return height > 0.5 ? (
                  <rect key={`dd${trades[index].id}`} x={r2(edgeAt(index))} y={r2(top)} width={r2(slot)} height={r2(height)} className="fill-danger/[0.12]" />
                ) : null;
              })}
            </g>

            <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 1000ms ease ${lineDelay + lineDuration / 2}ms` }}>
              <path d={areaPath} fill={`url(#${ids.gainArea})`} clipPath={`url(#${ids.above})`} />
              <path d={areaPath} fill={`url(#${ids.lossArea})`} clipPath={`url(#${ids.below})`} />
            </g>

            <path d={hwmPath} fill="none" strokeWidth={1.2} strokeDasharray="4 4" className="stroke-primary/50" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${settled}ms` }} />

            {trades.map((trade, index) => {
              const isGain = trade.pnl >= 0;
              const x = r2(xAt(index));
              const headY = r2(yBar(trade.pnl));
              const isDimmed = hovered !== null && hovered !== index;
              return (
                <g key={trade.id} pointerEvents="none" style={{ opacity: isDimmed ? 0.25 : 1, transition: 'opacity 200ms' }}>
                  <line
                    x1={x}
                    x2={x}
                    y1={r2(zeroY)}
                    y2={headY}
                    strokeWidth={2}
                    className={isGain ? 'stroke-success/70' : 'stroke-danger/70'}
                    style={{
                      transform: `scaleY(${isMounted ? 1 : 0})`,
                      transformBox: 'fill-box',
                      transformOrigin: isGain ? 'bottom' : 'top',
                      transition: `transform 700ms cubic-bezier(.2,.9,.3,1.2) ${index * 60}ms`,
                    }}
                  />
                  <circle
                    cx={x}
                    cy={headY}
                    r={hovered === index ? 6 : 4.5}
                    strokeWidth={2}
                    className={cx('fill-surface transition-[r]', isGain ? 'stroke-success' : 'stroke-danger')}
                    style={{ opacity: isMounted ? 1 : 0, transition: `opacity 300ms ease ${index * 60 + 500}ms` }}
                  />
                </g>
              );
            })}

            {pnls[bestIndex] > 0 && (
              <g pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${trades.length * 60 + 600}ms` }}>
                <rect x={r2(xAt(bestIndex) - 9)} y={r2(yBar(pnls[bestIndex]) - 26)} width={18} height={16} rx={5} className="fill-primary/20 stroke-primary/60" strokeWidth={1} />
                <text x={r2(xAt(bestIndex))} y={r2(yBar(pnls[bestIndex]) - 17.5)} textAnchor="middle" dominantBaseline="middle" className="fill-primary text-[10px] font-bold">
                  {'\u2605'}
                </text>
              </g>
            )}

            <path
              id={ids.path}
              d={linePath}
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeWidth={2.5}
              strokeLinejoin="round"
              stroke={`url(#${ids.line})`}
              style={{ strokeDashoffset: isMounted ? 0 : 1, transition: `stroke-dashoffset ${lineDuration}ms cubic-bezier(.4,0,.2,1) ${lineDelay}ms` }}
            />

            {cumulative.map((value, index) => {
              const x = r2(edgeAt(index));
              const y = r2(yAt(value));
              const size = hovered === index ? 9 : 6;
              return (
                <rect
                  key={`st${trades[index].id}`}
                  x={x - size / 2}
                  y={y - size / 2}
                  width={size}
                  height={size}
                  rx={1.5}
                  strokeWidth={1.6}
                  pointerEvents="none"
                  className={cx(isNewHigh(index) ? 'fill-primary stroke-primary' : 'fill-surface', value < 0 ? 'stroke-danger' : 'stroke-primary')}
                  style={{ opacity: isMounted ? 1 : 0, transition: `opacity 300ms ease ${drawnAt(index)}ms` }}
                />
              );
            })}

            <circle r={3.5} className="fill-primary motion-reduce:hidden" pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 500ms ease ${settled}ms` }}>
              <animateMotion dur="4.2s" repeatCount="indefinite">
                <mpath href={`#${ids.path}`} />
              </animateMotion>
            </circle>

            <g pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${settled}ms` }}>
              <circle cx={endX} cy={r2(lastY)} r="5" className="fill-primary/40 motion-reduce:hidden">
                <animate attributeName="r" values="5;16" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={endX} cy={r2(lastY)} r="4.5" className="fill-primary" />
              <g transform={`translate(${r2(endX - 80)} ${r2(Math.max(lastY - 32, 2))})`}>
                <rect width="74" height="22" rx="7" strokeWidth="1" className="fill-surface stroke-primary/60" />
                <text x="37" y="11.5" textAnchor="middle" dominantBaseline="middle" className="fill-primary text-[11px] font-bold tabular-nums">
                  {signedMoney(lastTotal)}
                </text>
              </g>
            </g>

            {trades.map((trade, index) => (
              <g key={`x${trade.id}`}>
                <rect
                  x={r2(xAt(index) - 4)}
                  y={plotBottom + 10}
                  width={8}
                  height={8}
                  rx={2}
                  className={trade.pnl > 0 ? 'fill-success' : 'fill-danger'}
                  style={{ opacity: isMounted ? (hovered === null || hovered === index ? 0.9 : 0.3) : 0, transition: `opacity 300ms ease ${isMounted && hovered === null ? index * 60 + 400 : 0}ms` }}
                />
                {index % 2 === 0 && (
                  <text x={r2(xAt(index))} y={plotBottom + 36} textAnchor="middle" className="fill-fg-subtle text-[10px]">
                    {shortDate.format(trade.closedAt)}
                  </text>
                )}
                <rect x={r2(edgeAt(index))} y={CHART.top} width={r2(slot)} height={plotHeight + 24} fill="transparent" onPointerEnter={() => setHovered(index)} />
              </g>
            ))}

            {hovered !== null && (
              <g pointerEvents="none">
                <line x1={CHART.left} x2={r2(xAt(hovered))} y1={r2(yAt(cumulative[hovered]))} y2={r2(yAt(cumulative[hovered]))} className="stroke-primary/40" strokeDasharray="3 4" />
                <rect x={4} y={r2(yAt(cumulative[hovered]) - 9)} width={CHART.left - 12} height={18} rx={9} strokeWidth={1} className="fill-surface stroke-primary" />
                <text x={(CHART.left - 4) / 2} y={r2(yAt(cumulative[hovered]) + 0.5)} textAnchor="middle" dominantBaseline="middle" className="fill-primary text-[9px] font-bold tabular-nums">
                  {cumulative[hovered].toFixed(2)}
                </text>
              </g>
            )}
          </svg>
        </div>

        {hovered !== null && (
          <div
            role="tooltip"
            style={{
              left: `${Math.min(84, Math.max(16, (xAt(hovered) / CHART.width) * 100))}%`,
              top: `${(yAt(cumulative[hovered]) / CHART.height) * 100}%`,
            }}
            className={cx(
              'pointer-events-none absolute z-10 w-48 -translate-x-1/2 animate-fade-quick rounded-xl border border-primary/30 bg-elevated/90 px-3 py-2.5 text-xs shadow-pop backdrop-blur-md motion-reduce:animate-none',
              yAt(cumulative[hovered]) / CHART.height < 0.4 ? 'translate-y-4' : '-translate-y-[calc(100%+16px)]',
            )}
          >
            <p className="flex items-center justify-between gap-2 font-semibold text-fg">
              <span>
                #{hovered + 1} {trades[hovered].symbol}
              </span>
              <span className={cx('text-[10px] font-bold', trades[hovered].direction === 'BUY' ? 'text-success' : 'text-danger')}>
                {trades[hovered].direction === 'BUY' ? UP : DOWN} {trades[hovered].direction}
              </span>
            </p>
            <p className="mt-1.5 flex justify-between gap-3 text-fg-muted">
              {copy.tradePnl}
              <span className={cx('font-semibold tabular-nums', trades[hovered].pnl >= 0 ? 'text-success' : 'text-danger')}>{pnlLabel(trades[hovered].pnl)}</span>
            </p>
            <p className="mt-1 flex justify-between gap-3 text-fg-muted">
              {copy.cumulative}
              <span className="font-semibold text-primary tabular-nums">{signedMoney(cumulative[hovered])}</span>
            </p>
          </div>
        )}
        </div>

        <ul className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-5 xl:grid-cols-1">
          {stats.map((stat, index) => (
            <li key={stat.key} style={staggerStyle(index, 80)} className="animate-rise bg-surface px-3.5 py-3 motion-reduce:animate-none">
              <p className={cx(eyebrow, 'text-fg-subtle')}>{stat.label}</p>
              <p className={cx('mt-0.5 text-lg font-semibold tabular-nums', stat.tone)}>
                <CountUp value={stat.value} format={stat.format} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Trade DNA: best vs worst, tug-of-war, symbol waffle ───────────── */

function TradeDna({ trades }: { trades: MasterOrder[] }) {
  const best = trades.reduce((top, trade) => (trade.pnl > top.pnl ? trade : top), trades[0]);
  const worst = trades.reduce((low, trade) => (trade.pnl < low.pnl ? trade : low), trades[0]);
  const buys = trades.filter((trade) => trade.direction === 'BUY').length;
  const buyShare = (buys / trades.length) * 100;
  const symbols = Object.entries(
    trades.reduce<Record<string, number>>((counts, trade) => ({ ...counts, [trade.symbol]: (counts[trade.symbol] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const waffle = symbols.flatMap(([symbol, count]) => Array.from({ length: count }, () => symbol));

  const extremes = [
    { key: 'best', label: copy.bestTrade, trade: best, icon: 'trophy' as const, frame: 'border-success/30 bg-success/[0.06]', text: 'text-success' },
    { key: 'worst', label: copy.worstTrade, trade: worst, icon: 'trendDown' as const, frame: 'border-danger/30 bg-danger/[0.06]', text: 'text-danger' },
  ];

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="grid grid-cols-2 gap-3">
        {extremes.map((item, index) => (
          <div key={item.key} style={staggerStyle(index, 120)} className={cx('min-w-0 animate-rise rounded-2xl border p-3.5 motion-reduce:animate-none', item.frame)}>
            <p className={cx(eyebrow, 'flex items-center gap-1.5 text-fg-subtle')}>
              <Icon name={item.icon} size={13} className={item.text} />
              {item.label}
            </p>
            <p className={cx('mt-2 text-xl font-semibold tabular-nums', item.text)}>{pnlLabel(item.trade.pnl)}</p>
            <p className="mt-0.5 truncate text-xs text-fg-muted">
              {item.trade.symbol} · {item.trade.direction}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className={cx(eyebrow, 'mb-2.5 flex justify-between text-fg-subtle')}>
          {copy.buySell}
          <span className="tabular-nums normal-case">
            <span className="text-success">{buys}</span> / <span className="text-danger">{trades.length - buys}</span>
          </span>
        </p>
        <div aria-hidden="true" className="relative h-2.5 rounded-full bg-danger/35">
          <span style={{ width: `${buyShare}%` }} className="absolute inset-y-0 left-0 rounded-full bg-success/75" />
          <span style={{ left: `${buyShare}%` }} className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-fg shadow-card" />
        </div>
        <div aria-hidden="true" className="mt-1.5 flex justify-between text-[10px] font-bold tracking-wide">
          <span className="text-success">BUY</span>
          <span className="text-danger">SELL</span>
        </div>
      </div>

      <div>
        <p className={cx(eyebrow, 'mb-2.5 text-fg-subtle')}>{copy.symbolMix}</p>
        <div aria-hidden="true" className="grid grid-cols-12 gap-1">
          {waffle.map((symbol, index) => (
            <span key={index} style={staggerStyle(index, 40)} className={cx('aspect-square animate-rise rounded-[4px] motion-reduce:animate-none', symbolBar[symbol] ?? 'bg-fg-subtle')} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {symbols.map(([symbol, count]) => (
            <li key={symbol} className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className={cx('size-2 rounded-[3px]', symbolBar[symbol] ?? 'bg-fg-subtle')} />
              {symbol}
              <span className="font-semibold text-fg tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Plan card (receipt with dotted leaders) ───────────── */

function PlanCard({ plan, detail, onSubscribe }: { plan: MasterPlan; detail: MasterDetail; onSubscribe: () => void }) {
  const rows = [
    { label: copy.minCapital, value: minInvestmentLabel(plan) },
    { label: copy.copiers, value: `${detail.activeCopiers} / ${detail.copierLimit}` },
    { label: copy.server, value: detail.server },
  ];

  return (
    <div className="group flex flex-1 flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cx(eyebrow, 'text-fg-subtle')}>{copy.plan}</p>
          <p className="mt-0.5 truncate text-xl font-semibold text-fg">{plan.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cx(eyebrow, 'text-fg-subtle')}>{copy.status}</p>
          <Chip className="mt-1 border border-success/30 bg-success-soft text-success">
            <LiveDot />
            {detail.planStatus}
          </Chip>
        </div>
      </div>

      <p className="rounded-xl border border-primary/25 bg-primary/[0.07] px-3 py-2 text-xs text-fg-muted">
        <span className="text-fg-subtle">{copy.commission}:</span> <span className="font-semibold text-fg">{detail.commission}</span>
      </p>

      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-2 text-sm">
            <dt className="flex flex-1 items-baseline gap-2 text-fg-muted">
              {row.label}
              <span aria-hidden="true" className="flex-1 border-b border-dotted border-line-strong" />
            </dt>
            <dd className="font-semibold text-fg tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      <Button fullWidth aria-haspopup="dialog" onClick={onSubscribe} className="mt-auto">
        {copy.subscribe}
        <Icon name="arrowRight" size={15} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
      </Button>
    </div>
  );
}

/* ───────────── Orders: timeline ledger ───────────── */

function PriceMove({ order }: { order: MasterOrder }) {
  const isUp = Number(order.closePrice) >= Number(order.openPrice);
  return (
    <div className="flex items-center gap-2 text-xs tabular-nums">
      <span className="rounded-md bg-fg/[0.05] px-1.5 py-0.5 text-fg-muted">{order.openPrice}</span>
      <span aria-hidden="true" className="relative min-w-8 flex-1 border-t border-dashed border-line-strong">
        <span className={cx('absolute top-1/2 right-0 -translate-y-1/2 text-[9px] leading-none', isUp ? 'text-success' : 'text-danger')}>{isUp ? UP : DOWN}</span>
      </span>
      <span className={cx('rounded-md px-1.5 py-0.5 font-semibold', isUp ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{order.closePrice}</span>
    </div>
  );
}

function OrderLedger({ orders }: { orders: MasterOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="grid size-12 animate-float place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
          <Icon name="inbox" size={20} />
        </span>
        <p className="text-sm text-fg-muted">{copy.noOrders}</p>
      </div>
    );
  }

  const maxAbs = Math.max(...orders.map((order) => Math.abs(order.pnl)));
  const grid = 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.5fr)_8rem]';

  return (
    <div className="flex flex-col gap-2">
      <div className={cx('hidden gap-4 pr-4 pl-[3.75rem] md:grid', grid)}>
        <span className={cx(eyebrow, 'text-fg-subtle')}>{copy.symbol}</span>
        <span className={cx(eyebrow, 'text-fg-subtle')}>
          {copy.direction} · {copy.volume}
        </span>
        <span className={cx(eyebrow, 'text-fg-subtle')}>
          {copy.openPrice} {ARROW} {copy.closePrice}
        </span>
        <span className={cx(eyebrow, 'text-right text-fg-subtle')}>{copy.pnl}</span>
      </div>

      <ol className="relative flex flex-col gap-2">
        <span aria-hidden="true" className="absolute top-5 bottom-5 left-[1.125rem] border-l border-dashed border-primary/30" />
        {orders.map((order, index) => {
          const isGain = order.pnl >= 0;
          const isBuy = order.direction === 'BUY';
          return (
            <li key={order.id} style={staggerStyle(index, 45)} className="relative grid animate-feed-in grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 motion-reduce:animate-none">
              <span
                aria-hidden="true"
                className={cx('relative grid size-9 place-items-center rounded-xl border bg-surface', isGain ? 'border-success/40 text-success' : 'border-danger/40 text-danger')}
              >
                <Icon name={isGain ? 'trendUp' : 'trendDown'} size={15} />
              </span>
              <div
                className={cx(
                  'grid grid-cols-2 items-center gap-x-4 gap-y-2.5 rounded-2xl border border-line bg-fg/[0.02] px-4 py-3 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/[0.05]',
                  grid,
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg text-[10px] font-bold ring-1', symbolTone[order.symbol] ?? 'bg-surface-2 text-fg ring-line')}>
                    {order.symbol.slice(0, 3)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-fg">{order.symbol}</span>
                    <span className="block text-[11px] text-fg-subtle">{shortDate.format(order.closedAt)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-self-end md:justify-self-start">
                  <Chip className={isBuy ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}>
                    {isBuy ? UP : DOWN} {order.direction}
                  </Chip>
                  <span className="text-xs text-fg-muted tabular-nums">
                    <span className="text-fg-subtle md:hidden">{copy.volume} </span>
                    {order.volume}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <PriceMove order={order} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2.5 md:col-span-1">
                  <span aria-hidden="true" className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-fg/[0.06] sm:block">
                    <span
                      style={{ width: `${Math.max(10, (Math.abs(order.pnl) / maxAbs) * 100)}%` }}
                      className={cx('block h-full rounded-full', isGain ? 'bg-success/70' : 'bg-danger/70')}
                    />
                  </span>
                  <span className={cx('text-sm font-bold tabular-nums', isGain ? 'text-success' : 'text-danger')}>{pnlLabel(order.pnl)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────────── Page ───────────── */

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
    { key: 'pnl', icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: detail.totalPnl, format: signedMoney, tone: 'text-success', viz: <AreaSpark values={runningTotals(allTrades)} tall /> },
    { key: 'drawdown', icon: 'trendDown', label: copy.maxDrawdown, caption: copy.riskMetric, value: detail.maxDrawdownPercent, format: (value) => `${value.toFixed(2)}%`, tone: 'text-danger', viz: <RiskScale risk={plan.risk} /> },
    { key: 'copiers', icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: detail.activeCopiers, format: (value) => String(Math.round(value)), tone: 'text-fg', viz: <CopierStack count={detail.activeCopiers} limit={detail.copierLimit} />, isLive: true },
    ...(detail.equity === null
      ? []
      : [{ key: 'equity', icon: 'wallet' as const, label: copy.masterEquity, caption: copy.current, value: detail.equity, format: (value: number) => formatMoney(value, 'USD'), tone: 'text-fg', viz: <PulseLine /> }]),
    { key: 'min', icon: 'bank', label: copy.minInvestment, caption: copy.entryCapital, value: plan.minInvestment, format: () => minInvestmentLabel(plan), tone: 'text-primary', viz: <CoinStacks /> },
  ];

  const playbook = [
    { key: 'strategy', icon: 'compass' as const, label: copy.strategy, text: detail.strategy, tone: 'text-primary', bar: 'bg-primary' },
    { key: 'risk', icon: 'alert' as const, label: copy.riskInformation, text: detail.riskInfo, tone: 'text-warning', bar: 'bg-warning' },
  ].filter((item) => item.text);

  return (
    <>
      <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:linear-gradient(to_right,#000,transparent_60%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-20 -z-10 size-96 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            <div className="flex items-start gap-5">
              <Monogram name={plan.name} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-sm text-fg-muted">
                  {copy.by} <span className="font-semibold text-fg">{plan.master}</span>
                </p>
                <h2 className="truncate text-3xl font-bold tracking-tight text-fg sm:text-4xl">{plan.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Chip className="border border-warning/30 bg-warning-soft text-warning">
                    {copy.risk} {plan.risk}
                    <span aria-hidden="true" className="flex items-end gap-0.5">
                      {Array.from({ length: RISK_LEVELS }, (_, level) => (
                        <span key={level} style={{ height: `${5 + level * 2}px` }} className={cx('w-1 rounded-full', level < plan.risk ? riskTone(plan.risk) : 'bg-fg/15')} />
                      ))}
                    </span>
                  </Chip>
                  {detail.code && <Chip className="border border-line bg-fg/[0.03] font-mono text-fg-muted">{detail.code}</Chip>}
                  <Chip className="border border-line bg-fg/[0.03] text-fg-muted">
                    <LiveDot />
                    {copy.active} {plan.activeDays}D
                  </Chip>
                </div>
              </div>
            </div>

            <Button size="lg" aria-haspopup="dialog" onClick={() => setIsSubscribeOpen(true)} className="group/sub relative mt-auto w-full overflow-hidden shadow-[0_14px_30px_-14px_var(--brand-primary)] sm:w-auto sm:self-start">

              <Icon name="checkCircle" size={16} className="relative transition-transform duration-300 group-hover/sub:rotate-[360deg] motion-reduce:transition-none" />
              <span className="relative">{copy.subscribeToPlan}</span>
            </Button>
          </div>

          <div className="border-t border-line bg-primary/[0.05] p-6 lg:border-t-0 lg:border-l lg:p-8">
            <GainConsole gainPercent={detail.totalGainPercent} trades={allTrades} />
          </div>
        </div>
      </section>

      <MetricBento capsules={capsules} />

      <Section
        delayIndex={1}
        icon="trendUp"
        title={copy.performance}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setReplayCount((count) => count + 1)}
              className="group/replay inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-fg-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className="inline-block transition-transform duration-500 group-hover/replay:-rotate-180 motion-reduce:transition-none">
                {'\u21BB'}
              </span>
              {copy.replay}
            </button>
            <UnderlineTabs label={copy.performance} items={RANGES.map((item) => item.id)} value={range} onChange={setRange} renderLabel={(item) => item} />
          </div>
        }
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-fg-muted">{copy.performanceNote}</p>
            <div className="flex flex-wrap items-center gap-3 text-fg-muted">
              <span className="flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="0 0 16 10" className="h-2.5 w-4">
                  <path d="M0 9 H5 V4 H11 V1 H16" fill="none" strokeWidth="1.8" className="stroke-primary" />
                </svg>
                {copy.cumulative}
              </span>
              <span className="flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="0 0 10 12" className="h-3 w-2.5">
                  <line x1="5" x2="5" y1="12" y2="4" strokeWidth="1.6" className="stroke-success" />
                  <circle cx="5" cy="3.5" r="2.5" strokeWidth="1.4" className="fill-surface stroke-success" />
                </svg>
                {copy.tradePnl}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 border-t border-dashed border-primary/60" />
                {copy.highWater}
              </span>
            </div>
          </div>
          {chartTrades.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="grid size-12 animate-float place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
                <Icon name="trendUp" size={20} />
              </span>
              <p className="text-sm text-fg-muted">{copy.noTrades}</p>
            </div>
          ) : (
            <PerformanceChart key={`${range}-${replayCount}`} trades={chartTrades} />
          )}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {chartTrades.length > 0 && (
          <Section delayIndex={2} icon="compass" title={copy.tradeDna}>
            <TradeDna key={range} trades={chartTrades} />
          </Section>
        )}
        <Section delayIndex={3} icon="wallet" title={copy.availablePlans(1)}>
          <PlanCard plan={plan} detail={detail} onSubscribe={() => setIsSubscribeOpen(true)} />
        </Section>
        {playbook.length > 0 && (
          <Section delayIndex={4} icon="alert" title={copy.disclosure}>
            <ol className="flex flex-col gap-3 p-5">
              {playbook.map((item, index) => (
                <li key={item.key} style={staggerStyle(index, 120)} className="relative flex animate-rise gap-3 overflow-hidden rounded-2xl border border-line bg-fg/[0.02] p-4 pl-5 motion-reduce:animate-none">
                  <span aria-hidden="true" className={cx('absolute inset-y-3 left-0 w-1 rounded-r-full', item.bar)} />
                  <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl bg-fg/[0.04]', item.tone)}>
                    <Icon name={item.icon} size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className={cx(eyebrow, 'text-fg-subtle')}>{item.label}</p>
                    <p className="mt-1 text-sm text-fg">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>

      <Section
        delayIndex={5}
        icon="menu"
        title={copy.orders}
        aside={
          <UnderlineTabs
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
                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-[background-color,color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                      isSelected ? 'border-primary/45 bg-primary/12 text-fg' : 'border-line text-fg-muted hover:border-primary/30 hover:text-fg',
                    )}
                  >
                    {symbol === 'all' ? copy.allSymbols : symbol}
                    <span className={cx('rounded-md px-1.5 tabular-nums', isSelected ? 'bg-primary/25' : 'bg-surface-2')}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          <OrderLedger key={`${ordersTab}-${symbolFilter}`} orders={visibleOrders} />
        </div>
      </Section>

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
        className="group inline-flex items-center gap-2 self-start rounded-xl border border-line bg-fg/[0.03] px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="arrowRight" size={15} className="rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
        {copy.back}
      </Link>
      {plan ? (
        <MasterDashboard plan={plan} detail={getMasterDetail(plan)} />
      ) : (
        <div className="orbit-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-14 animate-float place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
            <Icon name="search" size={24} />
          </span>
          <p className="text-base font-semibold text-fg">{copy.notFound}</p>
          <p className="text-sm text-fg-muted">{copy.notFoundHint}</p>
        </div>
      )}
    </div>
  );
}
