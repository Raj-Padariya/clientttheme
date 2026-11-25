'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';
import { getMasterDetail, masterDetailCopy as copy, masterPlans, minInvestmentLabel, type MasterDetail, type MasterOrder, type MasterPlan } from './mastersData';
import { StartCopyModal } from './StartCopyModal';
import '../promotion/market.css';

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
const WIN_BEADS = 20;
const PEAK_BEADS = 12;

const CHART = { width: 760, height: 330, left: 52, right: 24, top: 36, bottom: 58 };
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const ARROW = '\u2192';
const UP = '\u25B2';
const DOWN = '\u25BC';

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkMutedClass = 'text-[#4b5a70]';

const symbolDot: Record<string, string> = { XAUUSD: 'bg-warning', XAGUSD: 'bg-fg-muted', EURUSD: 'bg-info' };

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
  if (risk <= 2) return 'bg-(--hero-buy)';
  if (risk === 3) return 'bg-warning';
  return 'bg-(--aurora-cta-from)';
}

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
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
  return <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ring-1', className)}>{children}</span>;
}

/** Timeframe keys: the active one fills sage, a clay tick blinking in its corner and a glare passing over it. */
function RangeRail<T extends string>({ label, items, value, onChange }: { label: string; items: readonly T[]; value: T; onChange: (item: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1.5">
      {items.map((item, index) => {
        const isActive = item === value;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item)}
            style={staggerStyle(index, 60)}
            className={cx(
              'relative grid h-10 w-12 shrink-0 animate-feed-in place-items-center overflow-hidden rounded-md font-mono text-[11px] font-black ring-1 transition-[background-color,color,box-shadow,translate] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
              isActive ? 'bg-(--hero-buy) text-[#062520] ring-(--hero-buy)' : 'bg-fg/[0.03] text-fg-muted ring-line hover:-translate-y-0.5 hover:text-fg hover:ring-line-strong motion-reduce:hover:translate-y-0',
            )}
          >
            {isActive && <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-5 -skew-x-12 bg-white/30" />}
            {isActive && <span aria-hidden="true" className="mkt-blink absolute top-1 right-1 size-1.5 rounded-full bg-(--aurora-cta-from)" />}
            <span className="relative">{item}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Two counter keys; the active one tints sage with an underline. */
function CountTabs<T extends string>({ label, items, value, onChange }: { label: string; items: { id: T; text: string; count: number; icon: IconName }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cx(
              'relative flex items-center gap-3 overflow-hidden rounded-lg p-2.5 text-left ring-1 transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-(--hero-buy)/12 text-fg ring-(--hero-buy)/50' : 'text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            {isActive && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-(--hero-buy)" />}
            <span className={cx('grid size-10 shrink-0 place-items-center rounded-md font-mono text-base font-black tabular-nums', isActive ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg')}>{item.count}</span>
            <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold">
              <Icon name={item.icon} size={13} />
              {item.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Section({ index, title, icon, delayIndex, className, children }: { index: number; title: ReactNode; icon: IconName; delayIndex: number; className?: string; children: ReactNode }) {
  return (
    <section style={staggerStyle(delayIndex, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none', className)}>
      <header className="relative flex items-center gap-3 border-b border-dashed border-line-strong px-5 py-4">
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-(--hero-buy)" />
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name={icon} size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</p>
          <h2 className="truncate text-lg font-bold tracking-tight text-fg">{title}</h2>
        </div>
        <span aria-hidden="true" className="mkt-blink size-1.5 shrink-0 rounded-full bg-(--hero-buy)" />
      </header>
      {children}
    </section>
  );
}

function InkButton({ onClick, icon, children, className, size = 'md' }: { onClick: () => void; icon: IconName; children: ReactNode; className?: string; size?: 'md' | 'lg' }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className={cx(
        'group/ink relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-(--hero-buy) font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'lg' ? 'h-12 px-6 text-sm' : 'h-10 px-4 text-sm',
        className,
      )}
    >
      <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
      <Icon name={icon} size={16} className="relative transition-transform duration-500 group-hover/ink:rotate-[360deg] motion-reduce:transition-none" />
      <span className="relative">{children}</span>
    </button>
  );
}

const IDLE_BARS = 24;

/** Empty state: idle volume bars bouncing over a flat dashed axis, the icon above. */
function EmptyBead({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
        <Icon name={icon} size={18} />
      </span>
      <span aria-hidden="true" className="flex h-10 w-full max-w-md items-end gap-[3px] border-b border-dashed border-line-strong pb-0.5">
        {Array.from({ length: IDLE_BARS }, (_, index) => (
          <span key={index} style={{ height: `${25 + ((index * 37) % 75)}%`, '--vol-delay': `${(index % 6) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-[1px] bg-fg/15" />
        ))}
      </span>
      <p className="text-sm text-fg-muted">{text}</p>
    </div>
  );
}

/* ───────────── Header: identity ───────────── */

const QUOTE_IDLE_BARS = 28;

// The quote symbol: the first four letters or digits of the plan name, upper-cased.
function tickerOf(name: string) {
  return name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
}

/** The master listed like an instrument: symbol + identity on the left, the gain quoted as its price on the right, a scrolling info tape and the order button below. */
function QuoteHeader({ plan, detail, trades, onSubscribe }: { plan: MasterPlan; detail: MasterDetail; trades: MasterOrder[]; onSubscribe: () => void }) {
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const winRate = trades.length === 0 ? 0 : wins / trades.length;
  const litBeads = Math.round(winRate * WIN_BEADS);
  const maxAbs = Math.max(0.01, ...trades.map((trade) => Math.abs(trade.pnl)));
  const isUp = detail.totalGainPercent >= 0;
  const tapeItems = [
    `${copy.risk} ${plan.risk}`,
    `${copy.active} ${plan.activeDays}D`,
    ...(detail.code ? [detail.code] : []),
    `${copy.status} · ${detail.planStatus}`,
    `${copy.commission} · ${detail.commission}`,
    `${copy.copiers} · ${detail.activeCopiers} / ${detail.copierLimit}`,
    `${copy.server} · ${detail.server}`,
  ];

  return (
    <header className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {[25, 50, 75].map((top) => (
          <span key={top} style={{ top: `${top}%` }} className="absolute inset-x-0 border-t border-dashed border-fg/[0.06]" />
        ))}
        <span className="mkt-sweep absolute inset-y-0 w-28 -skew-x-12 bg-white/[0.04]" />
      </span>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="relative grid shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute -inset-1.5 animate-ring-ripple rounded-[18px] border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
              <Avatar name={plan.name} className="size-14 rounded-xl! text-xl ring-2 ring-(--hero-buy)" />
            </span>
            <span className="flex min-w-0 flex-col gap-1.5">
              <span aria-hidden="true" className="self-start rounded-md bg-(--hero-buy) px-2 py-0.5 font-mono text-xs font-black tracking-[0.2em] text-[#062520]">
                {tickerOf(plan.name)}
              </span>
              <span className={cx(captionClass, 'flex items-center gap-1.5')}>
                <LiveDot />
                {translate('nav.copyTrading')}
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-4xl font-black tracking-[-0.03em] text-fg sm:text-5xl" title={plan.name}>
              {plan.name}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {copy.by} <span className="font-semibold text-fg">{plan.master}</span>
            </p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Chip className="text-fg ring-line-strong">
              {copy.risk} {plan.risk}
              <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
                {Array.from({ length: RISK_LEVELS }, (_, level) => (
                  <span
                    key={level}
                    style={{ height: `${40 + level * 15}%`, '--candle-delay': `${300 + level * 80}ms` } as CSSProperties}
                    className={cx('mkt-candle w-1 rounded-[1px]', level < plan.risk ? riskTone(plan.risk) : 'bg-fg/15')}
                  />
                ))}
              </span>
            </Chip>
            {detail.code && <Chip className="font-mono text-fg-muted ring-line">{detail.code}</Chip>}
            <Chip className="text-fg-muted ring-line">
              <LiveDot />
              {copy.active} {plan.activeDays}D
            </Chip>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-fg/[0.03] p-4 ring-1 ring-line">
          <div className="flex items-center justify-between gap-3">
            <p className={cx(captionClass, 'flex items-center gap-2')}>
              <Icon name="trendUp" size={12} />
              {copy.totalGain}
            </p>
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] uppercase ring-1',
                isUp ? 'text-(--hero-buy) ring-(--hero-buy)/40' : 'text-(--aurora-cta-from) ring-(--aurora-cta-from)/40',
              )}
            >
              <span aria-hidden="true">{isUp ? UP : DOWN}</span>
              {copy.allTime}
            </span>
          </div>
          <p className={cx('font-mono text-6xl leading-none font-black tracking-tighter tabular-nums', isUp ? 'text-(--hero-buy)' : 'text-(--aurora-cta-from)')}>
            <CountUp value={detail.totalGainPercent} format={formatPercent} />
          </p>

          {/* Each closed trade prints as a candle; with no trades yet the volume bars idle on a flat axis. */}
          <div aria-hidden="true" className="flex h-14 items-end gap-[3px] border-b border-dashed border-line-strong pb-0.5">
            {trades.length > 0
              ? trades.map((trade, index) => (
                  <span
                    key={trade.id}
                    style={{ height: `${25 + (Math.abs(trade.pnl) / maxAbs) * 75}%`, '--candle-delay': `${300 + index * 60}ms` } as CSSProperties}
                    className={cx('mkt-candle max-w-3 flex-1 rounded-[1px]', trade.pnl > 0 ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')}
                  />
                ))
              : Array.from({ length: QUOTE_IDLE_BARS }, (_, index) => (
                  <span key={index} style={{ height: `${25 + ((index * 41) % 75)}%`, '--vol-delay': `${(index % 6) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-[1px] bg-fg/15" />
                ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <span aria-hidden="true" className="flex h-3 gap-0.5">
              {Array.from({ length: WIN_BEADS }, (_, index) => (
                <span
                  key={index}
                  style={{ '--candle-delay': `${500 + index * 40}ms` } as CSSProperties}
                  className={cx('mkt-candle flex-1 rounded-[1px]', index < litBeads ? 'bg-(--hero-buy)' : trades.length > 0 ? 'bg-(--aurora-cta-from)/30' : 'bg-fg/10')}
                />
              ))}
            </span>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
              {copy.winRate} <span className="font-mono font-black text-fg tabular-nums">{Math.round(winRate * 100)}%</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-success tabular-nums">
                {wins} {copy.wins}
              </span>
              <span className="font-semibold text-danger tabular-nums">
                {trades.length - wins} {copy.losses}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-dashed border-line px-5 py-3 sm:flex-row sm:items-center sm:px-6">
        <div aria-hidden="true" className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div style={{ '--tape-duration': '28s' } as CSSProperties} className="mkt-tape flex w-max">
            {[0, 1].map((loop) => (
              <span key={loop} className="flex shrink-0 items-center">
                {tapeItems.map((item, index) => (
                  <span key={`${loop}-${index}`} className="flex items-center gap-2 px-4 font-mono text-[11px] font-bold tracking-[0.08em] whitespace-nowrap text-fg-muted uppercase">
                    <span className={cx('size-1.5 rounded-[1px]', index % 2 === 0 ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')} />
                    {item}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <InkButton onClick={onSubscribe} icon="checkCircle" size="lg" className="w-full shrink-0 sm:w-auto">
          {copy.subscribeToPlan}
        </InkButton>
      </div>
    </header>
  );
}

/* ───────────── Metric strip + its market visuals ───────────── */

/** Running P&L as a mini candle run: each trade a candle from the previous total to the new one. */
function DotSpark({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1);
  const toPercent = (value: number) => ((value - min) / (max - min)) * 100;
  return (
    <span aria-hidden="true" className="flex h-12 items-stretch gap-1">
      {values.map((value, index) => {
        const from = index === 0 ? 0 : values[index - 1];
        const low = toPercent(Math.min(from, value));
        const high = toPercent(Math.max(from, value));
        return (
          <span key={index} className="relative w-2">
            <span
              style={{ bottom: `${low}%`, height: `${Math.max(6, high - low)}%`, '--candle-delay': `${300 + index * 50}ms` } as CSSProperties}
              className={cx('mkt-candle absolute inset-x-0 rounded-[1px]', value >= from ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')}
            />
          </span>
        );
      })}
    </span>
  );
}

/** Risk as a volatility meter: five rising bars, the master's level ringed. */
function RiskBeadScale({ risk }: { risk: number }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-1.5">
      {Array.from({ length: RISK_LEVELS }, (_, level) => {
        const isLevel = level + 1 === risk;
        const isLit = level < risk;
        return (
          <span key={level} className="flex flex-col items-center gap-1">
            <span className="flex h-8 items-end">
              <span
                style={{ height: `${30 + level * 17}%`, ...(isLit ? { '--candle-delay': `${300 + level * 80}ms` } : {}) } as CSSProperties}
                className={cx('w-2.5 rounded-[2px]', isLit ? cx('mkt-candle', riskTone(risk)) : 'bg-line-strong', isLevel && 'ring-2 ring-fg/50 ring-offset-2 ring-offset-surface')}
              />
            </span>
            <span className={cx('font-mono text-[9px] tabular-nums', isLevel ? 'font-black text-fg' : 'text-fg-subtle')}>{level + 1}</span>
          </span>
        );
      })}
    </span>
  );
}

/** Filled seats as sage bars printing in, the next open seat blinking clay. */
function SeatBeads({ count, limit }: { count: number; limit: string }) {
  const seats = Math.min(Math.max(count, 0), 12);
  return (
    <span aria-hidden="true" className="flex items-center gap-2">
      <span className="flex h-6 items-end gap-0.5">
        {Array.from({ length: seats }, (_, index) => (
          <span key={index} style={{ '--candle-delay': `${300 + index * 60}ms` } as CSSProperties} className="mkt-candle h-full w-1.5 rounded-[1px] bg-(--hero-buy)" />
        ))}
        <span className="relative h-full w-1.5 overflow-hidden rounded-[1px] border border-dashed border-line-strong">
          <span className="mkt-blink absolute inset-0 bg-(--aurora-cta-from)/60" />
        </span>
      </span>
      <span className="font-mono text-xs text-fg-subtle tabular-nums">/ {limit}</span>
    </span>
  );
}

function PulseBead() {
  return (
    <span aria-hidden="true" className="relative grid size-9 place-items-center">
      <span className="absolute -inset-0.5 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
      <span className={cx(beadClass, 'size-8')}>
        <Icon name="wallet" size={12} />
      </span>
    </span>
  );
}

/** Entry capital as a bid ladder: four levels stepping out from the left. */
function BeadStacks() {
  return (
    <span aria-hidden="true" className="flex flex-col gap-0.5">
      {[0, 1, 2, 3].map((row) => (
        <span key={row} style={{ width: `${14 + row * 9}px`, animationDelay: `${200 + row * 120}ms` }} className="zenith-capsule h-1.5 origin-left rounded-[1px] bg-(--hero-buy)/60" />
      ))}
    </span>
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

/** Key statistics as one full-width exchange row: each cell has a lit top rule, the figure and its own mini market visual. */
function MetricStrip({ capsules }: { capsules: Capsule[] }) {
  return (
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
      <ul className={cx('grid sm:grid-cols-2', capsules.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
        {capsules.map((capsule, index) => (
          <li
            key={capsule.key}
            style={staggerStyle(index, 120)}
            className="group/metric relative flex min-w-0 animate-feed-in flex-col gap-2 border-b border-dashed border-line p-5 motion-reduce:animate-none lg:border-b-0 lg:border-l lg:first:border-l-0"
          >
            <span aria-hidden="true" className={cx('absolute inset-x-5 top-0 h-0.5 rounded-full', index === 0 ? 'bg-(--hero-buy)' : 'bg-fg/10 transition-colors duration-300 group-hover/metric:bg-(--aurora-cta-from)')} />
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className={cx(beadClass, 'size-7 transition-transform duration-300 group-hover/metric:-rotate-12 motion-reduce:transition-none')}>
                <Icon name={capsule.icon} size={12} />
              </span>
              <p className="min-w-0 truncate text-xs font-semibold text-fg-muted">{capsule.label}</p>
              {capsule.isLive && <LiveDot />}
            </div>
            <p className={cx('truncate font-mono text-2xl font-black tracking-tight tabular-nums', capsule.tone)}>
              <CountUp value={capsule.value} format={capsule.format} />
            </p>
            <p className={captionClass}>{capsule.caption}</p>
            <div className="mt-auto flex min-h-12 items-end pt-2">{capsule.viz}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Performance: capsule waterfall + docked readout ───────────── */

function ReadoutField({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-[10px] tracking-[0.12em] whitespace-nowrap text-fg-subtle uppercase">{label}</span>
      <span className={cx('font-mono font-bold whitespace-nowrap tabular-nums', tone ?? 'text-fg')}>{value}</span>
    </span>
  );
}

/** Each trade is a capsule that steps the running total from its previous level to its new one; beads mark the levels. */
function PerformanceChart({ trades }: { trades: MasterOrder[] }) {
  const isMounted = useMounted();
  const [hovered, setHovered] = useState<number | null>(null);

  const cumulative = runningTotals(trades);
  const pnls = trades.map((trade) => trade.pnl);
  const range = niceRange(Math.min(-1, ...cumulative), Math.max(1, ...cumulative), 1);
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const plotBottom = CHART.top + plotHeight;
  const slot = plotWidth / trades.length;
  const capsuleWidth = Math.min(18, Math.max(6, slot * 0.42));
  const xAt = (index: number) => CHART.left + slot * (index + 0.5);
  const edgeAt = (index: number) => CHART.left + slot * index;
  const yAt = (value: number) => CHART.top + ((range.max - value) / (range.max - range.min)) * plotHeight;
  const zeroY = yAt(0);
  const endX = CHART.left + plotWidth;

  const highWater = cumulative.reduce<number[]>((marks, value) => [...marks, Math.max(marks.at(-1) ?? 0, value)], []);
  const hwmPath = highWater.reduce((path, level, index) => `${path} V${r2(yAt(level))} H${r2(edgeAt(index + 1))}`, `M${r2(CHART.left)},${r2(zeroY)}`);
  const bestIndex = pnls.indexOf(Math.max(...pnls));

  const lastTotal = cumulative.at(-1) ?? 0;
  const peak = Math.max(0, ...cumulative);
  const trough = Math.min(0, ...cumulative);
  const longestStreak = pnls.reduce(
    (streak, pnl) => {
      const run = pnl > 0 ? streak.run + 1 : 0;
      return { run, best: Math.max(streak.best, run) };
    },
    { run: 0, best: 0 },
  ).best;
  const settled = trades.length * 70 + 700;

  const stats = [
    { key: 'net', label: copy.chartNet, value: lastTotal, format: signedMoney, tone: lastTotal >= 0 ? 'text-success' : 'text-danger' },
    { key: 'peak', label: copy.chartPeak, value: peak, format: signedMoney, tone: 'text-fg' },
    { key: 'trough', label: copy.chartTrough, value: trough, format: signedMoney, tone: 'text-danger' },
    { key: 'trades', label: copy.chartTrades, value: trades.length, format: (value: number) => String(Math.round(value)), tone: 'text-fg' },
    { key: 'streak', label: copy.bestStreak, value: longestStreak, format: (value: number) => `${Math.round(value)}W`, tone: 'text-success' },
  ];

  // The readout shows the hovered trade, or the latest one while nothing is hovered.
  const focusIndex = hovered ?? trades.length - 1;
  const focusTrade = trades[focusIndex];
  const focusTotal = cumulative[focusIndex];
  const peakBeads = peak > 0 ? Math.round(Math.max(0, Math.min(1, focusTotal / peak)) * PEAK_BEADS) : 0;
  const lastY = yAt(lastTotal);

  return (
    <div className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[22px] px-4 py-3 text-xs ring-1 ring-line">
        <span className="flex items-center gap-2 text-sm font-bold text-fg">
          {hovered === null ? <LiveDot /> : <span className="grid size-7 place-items-center rounded-full bg-fg font-mono text-[10px] text-app tabular-nums">#{focusIndex + 1}</span>}
          {focusTrade.symbol}
          <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', focusTrade.direction === 'BUY' ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
            {focusTrade.direction === 'BUY' ? UP : DOWN} {focusTrade.direction}
          </span>
        </span>
        <ReadoutField label={copy.volume} value={focusTrade.volume} />
        <ReadoutField label={`${copy.openPrice} ${ARROW} ${copy.closePrice}`} value={`${focusTrade.openPrice} ${ARROW} ${focusTrade.closePrice}`} />
        <ReadoutField label={copy.tradePnl} value={pnlLabel(focusTrade.pnl)} tone={focusTrade.pnl >= 0 ? 'text-success' : 'text-danger'} />
        <ReadoutField label={copy.cumulative} value={signedMoney(focusTotal)} />
        <span aria-hidden="true" className="flex min-w-20 flex-1 flex-wrap gap-1">
          {Array.from({ length: PEAK_BEADS }, (_, index) => (
            <span key={index} className={cx('size-2 rounded-full transition-colors duration-300', index < peakBeads ? 'bg-fg' : 'bg-line-strong')} />
          ))}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="relative min-w-0">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className="h-auto w-full min-w-[580px]"
              role="img"
              aria-label={`${copy.cumulative}: ${signedMoney(lastTotal)}`}
              onPointerLeave={() => setHovered(null)}
            >
              {ticks(range.min, range.max, 1).map((tick) => {
                const y = r2(yAt(tick));
                return (
                  <g key={tick}>
                    <line x1={CHART.left} x2={endX} y1={y} y2={y} className={tick === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeDasharray={tick === 0 ? undefined : '1 6'} strokeLinecap="round" />
                    <rect x={4} y={y - 8} width={CHART.left - 12} height={16} rx={8} className={tick === 0 ? 'fill-fg/12' : 'fill-fg/[0.05]'} />
                    <text x={(CHART.left - 4) / 2} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" className="fill-fg-subtle text-[9px] tabular-nums">
                      ${tick}
                    </text>
                  </g>
                );
              })}

              {hovered !== null && <rect x={r2(edgeAt(hovered))} y={CHART.top} width={r2(slot)} height={plotHeight} rx={10} className="fill-fg/[0.06]" pointerEvents="none" />}

              {/* Gap between the high-water mark and the running total = drawdown from the running peak. */}
              <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${settled}ms` }}>
                {cumulative.map((value, index) => {
                  const top = yAt(highWater[index]);
                  const height = yAt(value) - top;
                  return height > 0.5 ? <rect key={`dd${trades[index].id}`} x={r2(edgeAt(index))} y={r2(top)} width={r2(slot)} height={r2(height)} className="fill-danger/[0.1]" /> : null;
                })}
              </g>

              <path d={hwmPath} fill="none" strokeWidth={1.2} strokeDasharray="3 3" strokeLinecap="round" className="mkt-march stroke-(--aurora-cta-from)/70" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${settled}ms` }} />

              {trades.map((trade, index) => {
                const from = index === 0 ? 0 : cumulative[index - 1];
                const to = cumulative[index];
                const top = Math.min(yAt(from), yAt(to));
                const height = Math.max(3, Math.abs(yAt(to) - yAt(from)));
                const isGain = trade.pnl >= 0;
                const x = xAt(index);
                const isDimmed = hovered !== null && hovered !== index;
                return (
                  <g key={trade.id} pointerEvents="none" style={{ opacity: isDimmed ? 0.3 : 1, transition: 'opacity 200ms' }}>
                    {index > 0 && (
                      <line x1={r2(xAt(index - 1))} x2={r2(x)} y1={r2(yAt(from))} y2={r2(yAt(from))} strokeDasharray="1 4" strokeLinecap="round" className="stroke-fg-subtle" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 300ms ease ${index * 70 + 300}ms` }} />
                    )}
                    <line
                      x1={r2(x)}
                      x2={r2(x)}
                      y1={r2(top - 5)}
                      y2={r2(top + height + 5)}
                      strokeWidth={1.2}
                      className={isGain ? 'stroke-(--hero-buy)' : 'stroke-(--aurora-cta-from)'}
                      style={{ opacity: isMounted ? 1 : 0, transition: `opacity 300ms ease ${index * 70 + 400}ms` }}
                    />
                    <rect
                      x={r2(x - capsuleWidth / 2)}
                      y={r2(top)}
                      width={r2(capsuleWidth)}
                      height={r2(height)}
                      rx={1.5}
                      strokeWidth={1.2}
                      className={isGain ? 'fill-(--hero-buy)/70 stroke-(--hero-buy)' : 'fill-(--aurora-cta-from)/70 stroke-(--aurora-cta-from)'}
                      style={{
                        transform: `scaleY(${isMounted ? 1 : 0})`,
                        transformBox: 'fill-box',
                        transformOrigin: isGain ? 'bottom' : 'top',
                        transition: `transform 700ms cubic-bezier(.2,.9,.3,1.2) ${index * 70}ms`,
                      }}
                    />
                    <circle
                      cx={r2(x)}
                      cy={r2(yAt(to))}
                      r={hovered === index ? 6.5 : 4.5}
                      strokeWidth={2}
                      className="fill-fg stroke-surface transition-[r]"
                      style={{ opacity: isMounted ? 1 : 0, transition: `opacity 300ms ease ${index * 70 + 500}ms` }}
                    />
                  </g>
                );
              })}

              {pnls[bestIndex] > 0 && (
                <g pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${settled}ms` }}>
                  <circle cx={r2(xAt(bestIndex))} cy={r2(Math.min(yAt(cumulative[bestIndex]), yAt(cumulative[bestIndex] - pnls[bestIndex])) - 16)} r={8} className="fill-fg" />
                  <text x={r2(xAt(bestIndex))} y={r2(Math.min(yAt(cumulative[bestIndex]), yAt(cumulative[bestIndex] - pnls[bestIndex])) - 15.5)} textAnchor="middle" dominantBaseline="middle" className="fill-app text-[9px] font-bold">
                    {'\u2605'}
                  </text>
                </g>
              )}

              <g pointerEvents="none" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 400ms ease ${settled}ms` }}>
                <circle cx={r2(xAt(trades.length - 1))} cy={r2(lastY)} r="5" className="fill-fg/40 motion-reduce:hidden">
                  <animate attributeName="r" values="5;16" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <g transform={`translate(${r2(Math.min(xAt(trades.length - 1) - 37, endX - 74))} ${r2(Math.max(lastY - 34, 2))})`}>
                  <rect width="74" height="22" rx="11" className="fill-fg" />
                  <text x="37" y="11.5" textAnchor="middle" dominantBaseline="middle" className="fill-app text-[11px] font-bold tabular-nums">
                    {signedMoney(lastTotal)}
                  </text>
                </g>
              </g>

              {trades.map((trade, index) => (
                <g key={`x${trade.id}`}>
                  <circle
                    cx={r2(xAt(index))}
                    cy={plotBottom + 14}
                    r={3.5}
                    className={trade.pnl > 0 ? 'fill-success' : 'fill-danger'}
                    style={{ opacity: isMounted ? (hovered === null || hovered === index ? 0.9 : 0.3) : 0, transition: `opacity 300ms ease ${isMounted && hovered === null ? index * 60 + 400 : 0}ms` }}
                  />
                  {index % 2 === 0 && (
                    <text x={r2(xAt(index))} y={plotBottom + 38} textAnchor="middle" className="fill-fg-subtle text-[10px]">
                      {shortDate.format(trade.closedAt)}
                    </text>
                  )}
                  <rect x={r2(edgeAt(index))} y={CHART.top} width={r2(slot)} height={plotHeight + 24} fill="transparent" onPointerEnter={() => setHovered(index)} />
                </g>
              ))}

              {hovered !== null && (
                <g pointerEvents="none">
                  <line x1={CHART.left} x2={r2(xAt(hovered))} y1={r2(yAt(cumulative[hovered]))} y2={r2(yAt(cumulative[hovered]))} className="stroke-fg/40" strokeDasharray="3 4" />
                  <rect x={4} y={r2(yAt(cumulative[hovered]) - 9)} width={CHART.left - 12} height={18} rx={9} className="fill-fg" />
                  <text x={(CHART.left - 4) / 2} y={r2(yAt(cumulative[hovered]) + 0.5)} textAnchor="middle" dominantBaseline="middle" className="fill-app text-[9px] font-bold tabular-nums">
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
                'pointer-events-none absolute z-10 w-48 -translate-x-1/2 animate-fade-quick rounded-2xl bg-white/85 px-3 py-2.5 text-xs text-[#0a1220] shadow-[0_18px_36px_-18px_rgb(0_0_0/0.8)] ring-1 ring-white backdrop-blur-md motion-reduce:animate-none',
                yAt(cumulative[hovered]) / CHART.height < 0.4 ? 'translate-y-4' : '-translate-y-[calc(100%+16px)]',
              )}
            >
              <p className="flex items-center justify-between gap-2 font-bold">
                <span>
                  #{hovered + 1} {trades[hovered].symbol}
                </span>
                <span className={cx('text-[10px] font-bold', trades[hovered].direction === 'BUY' ? 'text-[#13784a]' : 'text-[#b4233c]')}>
                  {trades[hovered].direction === 'BUY' ? UP : DOWN} {trades[hovered].direction}
                </span>
              </p>
              <p className={cx('mt-1.5 flex justify-between gap-3', inkMutedClass)}>
                {copy.tradePnl}
                <span className={cx('font-bold tabular-nums', trades[hovered].pnl >= 0 ? 'text-[#13784a]' : 'text-[#b4233c]')}>{pnlLabel(trades[hovered].pnl)}</span>
              </p>
              <p className={cx('mt-1 flex justify-between gap-3', inkMutedClass)}>
                {copy.cumulative}
                <span className="font-bold text-[#0a1220] tabular-nums">{signedMoney(cumulative[hovered])}</span>
              </p>
            </div>
          )}
        </div>

        <ul className="flex flex-col self-start">
          {stats.map((stat, index) => (
            <li key={stat.key} style={staggerStyle(index, 80)} className="flex animate-feed-in items-center gap-2 border-b border-dotted border-line-strong py-2.5 last:border-b-0 motion-reduce:animate-none">
              <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</span>
              <span className={cx(captionClass, 'min-w-0 truncate')}>{stat.label}</span>
              <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-line-strong" />
              <span className={cx('font-mono text-base font-black tabular-nums', stat.tone)}>
                <CountUp value={stat.value} format={stat.format} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Trade DNA: best vs worst, direction beads, symbol bead rows ───────────── */

function TradeDna({ trades }: { trades: MasterOrder[] }) {
  const best = trades.reduce((top, trade) => (trade.pnl > top.pnl ? trade : top), trades[0]);
  const worst = trades.reduce((low, trade) => (trade.pnl < low.pnl ? trade : low), trades[0]);
  const buys = trades.filter((trade) => trade.direction === 'BUY').length;
  const symbols = Object.entries(trades.reduce<Record<string, number>>((counts, trade) => ({ ...counts, [trade.symbol]: (counts[trade.symbol] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const buyShare = (buys / trades.length) * 100;
  const topSymbolCount = symbols[0]?.[1] ?? 1;

  const extremes = [
    { key: 'best', label: copy.bestTrade, trade: best, icon: 'trophy' as const, text: 'text-success', rail: 'bg-(--hero-buy)', bead: 'bg-(--hero-buy) text-[#062520]' },
    { key: 'worst', label: copy.worstTrade, trade: worst, icon: 'trendDown' as const, text: 'text-danger', rail: 'bg-(--aurora-cta-from)', bead: 'bg-(--aurora-cta-from)/15 text-(--aurora-cta-from) ring-1 ring-(--aurora-cta-from)/40' },
  ];

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Best and worst fills as two order tickets side by side. */}
      <ul className="grid grid-cols-2 gap-2">
        {extremes.map((item, index) => (
          <li key={item.key} style={staggerStyle(index, 120)} className="relative flex min-w-0 animate-feed-in flex-col gap-2 overflow-hidden rounded-lg bg-fg/[0.03] p-3 pt-3.5 ring-1 ring-line motion-reduce:animate-none">
            <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-1', item.rail)} />
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-md', item.bead)}>
                <Icon name={item.icon} size={12} />
              </span>
              <span className={cx(captionClass, 'min-w-0 truncate')}>{item.label}</span>
            </span>
            <span className={cx('font-mono text-xl font-black tabular-nums', item.text)}>{pnlLabel(item.trade.pnl)}</span>
            <span className="truncate font-mono text-[11px] text-fg-muted">
              {item.trade.symbol} · {item.trade.direction}
            </span>
          </li>
        ))}
      </ul>

      <div>
        <p className={cx(captionClass, 'mb-2.5 flex justify-between')}>
          {copy.buySell}
          <span className="tabular-nums normal-case">
            <span className="text-success">{buys}</span> / <span className="text-danger">{trades.length - buys}</span>
          </span>
        </p>
        {/* Order-flow bar: buy share in sage against sell share in clay, a glare sweeping across. */}
        <span aria-hidden="true" className="relative mb-2.5 flex h-2.5 overflow-hidden rounded-[3px] bg-(--aurora-cta-from)/70">
          <span style={{ width: `${buyShare}%` }} className="zenith-capsule h-full origin-left bg-(--hero-buy)" />
          <span className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/25" />
        </span>
        <span aria-hidden="true" className="flex flex-wrap gap-1">
          {trades.map((trade, index) => (
            <span
              key={trade.id}
              style={{ animationDelay: `${200 + index * 50}ms` }}
              className={cx(
                'grid h-5 min-w-5 animate-dot-pop place-items-center rounded-[3px] px-0.5 font-mono text-[9px] font-black text-[#062520] motion-reduce:animate-none',
                trade.direction === 'BUY' ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)',
              )}
            >
              {trade.direction === 'BUY' ? 'B' : 'S'}
            </span>
          ))}
        </span>
        <div aria-hidden="true" className="mt-1.5 flex justify-between text-[10px] font-bold tracking-wide">
          <span className="text-success">BUY</span>
          <span className="text-danger">SELL</span>
        </div>
      </div>

      <div>
        <p className={cx(captionClass, 'mb-2')}>{copy.symbolMix}</p>
        {/* Symbol mix as volume bars, each growing in from the left. */}
        <ul className="flex flex-col">
          {symbols.map(([symbol, count], rowIndex) => (
            <li key={symbol} className="flex items-center gap-2.5 border-b border-dotted border-line-strong py-2 last:border-b-0">
              <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-[2px]', symbolDot[symbol] ?? 'bg-fg-subtle')} />
              <span className="w-16 shrink-0 font-mono text-xs font-semibold text-fg">{symbol}</span>
              <span aria-hidden="true" className="relative h-2 flex-1 overflow-hidden rounded-[2px] bg-fg/[0.06]">
                <span
                  style={{ width: `${(count / topSymbolCount) * 100}%`, animationDelay: `${300 + rowIndex * 120}ms` }}
                  className={cx('zenith-capsule absolute inset-y-0 left-0 origin-left rounded-[2px]', symbolDot[symbol] ?? 'bg-fg-subtle')}
                />
              </span>
              <span className="font-mono text-sm font-black text-fg tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Plan receipt ───────────── */

/** The plan as a ticket: details on top, a perforated tear line, then the rows and the Subscribe stub. */
function PlanCard({ plan, detail, onSubscribe }: { plan: MasterPlan; detail: MasterDetail; onSubscribe: () => void }) {
  const rows = [
    { label: copy.minCapital, value: minInvestmentLabel(plan) },
    { label: copy.copiers, value: `${detail.activeCopiers} / ${detail.copierLimit}` },
    { label: copy.server, value: detail.server },
  ];

  return (
    <section style={staggerStyle(3, 140)} className={cx(panelClass, 'flex animate-rise flex-col motion-reduce:animate-none')}>
      <div className="flex flex-col gap-4 p-5">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
            <Icon name="wallet" size={12} />
          </span>
          {copy.availablePlans(1)}
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={captionClass}>{copy.plan}</p>
            <p className="mt-0.5 truncate text-2xl font-bold tracking-tight text-fg">{plan.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={captionClass}>{copy.status}</p>
            <Chip className="mt-1 text-success ring-success/40">
              <LiveDot />
              {detail.planStatus}
            </Chip>
          </div>
        </div>
        <p className="text-xs text-fg-muted">
          <span className="text-fg-subtle">{copy.commission}:</span> <span className="font-bold text-fg">{detail.commission}</span>
        </p>
      </div>

      <div aria-hidden="true" className="relative h-6">
        <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-app ring-1 ring-line" />
        <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-app ring-1 ring-line" />
        <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-line-strong" />
      </div>

      <dl className="flex flex-col px-5">
        {rows.map((row, index) => (
          <div key={row.label} className="flex items-center gap-2 border-b border-dotted border-line-strong py-2.5 text-sm last:border-b-0">
            <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</span>
            <dt className="shrink-0 text-fg-muted">{row.label}</dt>
            <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-line-strong" />
            <dd className="font-mono font-bold text-fg tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="p-5 pt-3">
        <InkButton onClick={onSubscribe} icon="arrowRight" className="w-full">
          {copy.subscribe}
        </InkButton>
      </div>
    </section>
  );
}

/* ───────────── Orders: ticket rows ───────────── */

function PriceMove({ order }: { order: MasterOrder }) {
  const isUp = Number(order.closePrice) >= Number(order.openPrice);
  return (
    <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
      <span className="rounded-full px-2 py-0.5 text-fg-muted ring-1 ring-line">{order.openPrice}</span>
      <span aria-hidden="true" className="relative min-w-8 flex-1 border-t border-dotted border-line-strong">
        <span className={cx('absolute top-1/2 right-0 -translate-y-1/2 text-[9px] leading-none', isUp ? 'text-success' : 'text-danger')}>{isUp ? UP : DOWN}</span>
      </span>
      <span className={cx('rounded-full px-2 py-0.5 font-bold ring-1', isUp ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>{order.closePrice}</span>
    </div>
  );
}

function OrderLedger({ orders }: { orders: MasterOrder[] }) {
  if (orders.length === 0) return <EmptyBead icon="inbox" text={copy.noOrders} />;

  const maxAbs = Math.max(...orders.map((order) => Math.abs(order.pnl)));
  const grid = 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.5fr)_8.5rem]';

  return (
    <div className="flex flex-col">
      <div className={cx('hidden gap-4 border-b border-dashed border-line-strong pb-2.5 pl-12 md:grid', grid)}>
        <span className={captionClass}>{copy.symbol}</span>
        <span className={captionClass}>
          {copy.direction} · {copy.volume}
        </span>
        <span className={captionClass}>
          {copy.openPrice} {ARROW} {copy.closePrice}
        </span>
        <span className={cx(captionClass, 'text-right')}>{copy.pnl}</span>
      </div>

      <ol className="flex flex-col">
        {orders.map((order, index) => {
          const isGain = order.pnl >= 0;
          const isBuy = order.direction === 'BUY';
          const litDots = Math.max(1, Math.round((Math.abs(order.pnl) / Math.max(0.01, maxAbs)) * 5));
          return (
            <li key={order.id} style={staggerStyle(index, 45)} className="group/order relative grid animate-feed-in grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 border-b border-dotted border-line-strong py-3 pl-3 last:border-b-0 motion-reduce:animate-none">
              <span aria-hidden="true" className={cx('absolute inset-y-2 left-0 w-1 rounded-full', isGain ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')} />
              <span
                aria-hidden="true"
                className={cx(
                  'grid size-9 place-items-center rounded-lg font-mono text-[10px] font-black ring-1 transition-transform duration-300 group-hover/order:-rotate-6',
                  isGain ? 'bg-(--hero-buy)/15 text-(--hero-buy) ring-(--hero-buy)/30' : 'bg-(--aurora-cta-from)/15 text-(--aurora-cta-from) ring-(--aurora-cta-from)/30',
                )}
              >
                {stepNumber(index)}
              </span>
              <div className={cx('grid grid-cols-2 items-center gap-x-4 gap-y-2.5', grid)}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cx(beadClass, 'relative size-9 text-[10px] font-black')}>
                    {order.symbol.slice(0, 3)}
                    <span aria-hidden="true" className={cx('absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface', symbolDot[order.symbol] ?? 'bg-fg-subtle')} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-fg">{order.symbol}</span>
                    <span className="block text-[11px] text-fg-subtle">{shortDate.format(order.closedAt)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-self-end md:justify-self-start">
                  <Chip className={isBuy ? 'text-success ring-success/40' : 'text-danger ring-danger/40'}>
                    {isBuy ? UP : DOWN} {order.direction}
                  </Chip>
                  <span className="font-mono text-xs text-fg-muted tabular-nums">
                    <span className="text-fg-subtle md:hidden">{copy.volume} </span>
                    {order.volume}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <PriceMove order={order} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2.5 md:col-span-1">
                  <span aria-hidden="true" className="hidden h-4 items-end gap-0.5 sm:flex">
                    {Array.from({ length: 5 }, (_, dot) => {
                      const isLit = dot < litDots;
                      return (
                        <span
                          key={dot}
                          style={{ height: `${40 + dot * 15}%`, ...(isLit ? { '--candle-delay': `${200 + index * 45 + dot * 50}ms` } : {}) } as CSSProperties}
                          className={cx('w-1.5 rounded-[1px]', isLit ? cx('mkt-candle', isGain ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)') : 'bg-line-strong')}
                        />
                      );
                    })}
                  </span>
                  <span className={cx('font-mono text-sm font-black tabular-nums', isGain ? 'text-success' : 'text-danger')}>{pnlLabel(order.pnl)}</span>
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
  const openSubscribe = () => setIsSubscribeOpen(true);

  const capsules: Capsule[] = [
    { key: 'pnl', icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: detail.totalPnl, format: signedMoney, tone: 'text-success', viz: <DotSpark values={runningTotals(allTrades)} /> },
    { key: 'drawdown', icon: 'trendDown', label: copy.maxDrawdown, caption: copy.riskMetric, value: detail.maxDrawdownPercent, format: (value) => `${value.toFixed(2)}%`, tone: 'text-danger', viz: <RiskBeadScale risk={plan.risk} /> },
    { key: 'copiers', icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: detail.activeCopiers, format: (value) => String(Math.round(value)), tone: 'text-fg', viz: <SeatBeads count={detail.activeCopiers} limit={detail.copierLimit} />, isLive: true },
    ...(detail.equity === null
      ? []
      : [{ key: 'equity', icon: 'wallet' as const, label: copy.masterEquity, caption: copy.current, value: detail.equity, format: (value: number) => formatMoney(value, 'USD'), tone: 'text-fg', viz: <PulseBead /> }]),
    { key: 'min', icon: 'bank', label: copy.minInvestment, caption: copy.entryCapital, value: plan.minInvestment, format: () => minInvestmentLabel(plan), tone: 'text-fg', viz: <BeadStacks /> },
  ];

  const playbook = [
    { key: 'strategy', icon: 'compass' as const, label: copy.strategy, text: detail.strategy },
    { key: 'risk', icon: 'alert' as const, label: copy.riskInformation, text: detail.riskInfo },
  ].filter((item) => item.text);

  // Skeleton: instrument quote terminal, key-stats row, chart terminal + order ticket, then the orders tape + disclosure.
  return (
    <>
      <QuoteHeader plan={plan} detail={detail} trades={allTrades} onSubscribe={openSubscribe} />
      <MetricStrip capsules={capsules} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section style={staggerStyle(2, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
          <div className="flex flex-col gap-4 border-b border-dashed border-line px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] text-fg-subtle">
                <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-(--hero-buy)" />
                01 · {range}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">{copy.performance}</h2>
              <p className="mt-1 text-xs text-fg-muted">{copy.performanceNote}</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto rounded-lg bg-fg/[0.03] p-1.5 ring-1 ring-line">
              <RangeRail label={copy.performance} items={RANGES.map((item) => item.id)} value={range} onChange={setRange} />
              <span aria-hidden="true" className="h-8 w-px shrink-0 bg-line-strong" />
              <button
                type="button"
                onClick={() => setReplayCount((count) => count + 1)}
                className="group/replay inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span aria-hidden="true" className="text-base transition-transform duration-500 group-hover/replay:-rotate-180 motion-reduce:transition-none">
                  {'\u21BB'}
                </span>
                {copy.replay}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4 p-5">
            {chartTrades.length === 0 ? <EmptyBead icon="trendUp" text={copy.noTrades} /> : <PerformanceChart key={`${range}-${replayCount}`} trades={chartTrades} />}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-line pt-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-fg ring-2 ring-surface" />
                {copy.cumulative}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
                  <span className="h-full w-1.5 rounded-[1px] bg-(--hero-buy)" />
                  <span className="h-2/3 w-1.5 rounded-[1px] bg-(--aurora-cta-from)" />
                </span>
                {copy.tradePnl} <span className="text-fg-subtle">({copy.perTrade})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 border-t border-dashed border-fg/50" />
                {copy.highWater}
              </span>
            </div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <PlanCard plan={plan} detail={detail} onSubscribe={openSubscribe} />
          {chartTrades.length > 0 && (
            <Section index={3} delayIndex={4} icon="compass" title={copy.tradeDna}>
              <TradeDna key={range} trades={chartTrades} />
            </Section>
          )}
        </aside>
      </div>

      <div className={cx('grid gap-6', playbook.length > 0 && 'xl:grid-cols-[minmax(0,1fr)_22rem]')}>
        <section style={staggerStyle(4, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
          <div className="flex flex-col gap-4 border-b border-dashed border-line px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] text-fg-subtle">
                <Icon name="menu" size={12} />
                02
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">{copy.orders}</h2>
            </div>
            <div className="lg:w-[26rem]">
              <CountTabs
                label={copy.orders}
                value={ordersTab}
                items={[
                  { id: 'closed', text: copy.closed(detail.closedOrders.length), count: detail.closedOrders.length, icon: 'history' },
                  { id: 'open', text: copy.open(detail.openOrders.length), count: detail.openOrders.length, icon: 'trendUp' },
                ]}
                onChange={(tab) => {
                  setOrdersTab(tab);
                  setSymbolFilter('all');
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-5 p-5">
            {tabOrders.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
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
                        'relative inline-flex h-9 items-center gap-2 rounded-md pr-1.5 pl-3 font-mono text-xs font-bold ring-1 transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                        isSelected ? 'bg-fg/[0.08] text-fg ring-line-strong' : 'text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
                      )}
                    >
                      {symbol !== 'all' && <span aria-hidden="true" className={cx('h-3 w-1 rounded-[1px]', symbolDot[symbol] ?? 'bg-fg-subtle')} />}
                      {symbol === 'all' ? copy.allSymbols : symbol}
                      <span className={cx('grid h-6 min-w-6 place-items-center rounded px-1.5 text-[10px] tabular-nums', isSelected ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/10 text-fg-subtle')}>{count}</span>
                      {isSelected && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-(--hero-buy)" />}
                    </button>
                  );
                })}
              </div>
            )}
            <OrderLedger key={`${ordersTab}-${symbolFilter}`} orders={visibleOrders} />
          </div>
        </section>

        {playbook.length > 0 && (
          <Section index={4} delayIndex={5} icon="alert" title={copy.disclosure} className="self-start">
            <ol className="flex flex-col gap-3 p-5">
              {playbook.map((item, index) => (
                <li key={item.key} style={staggerStyle(index, 120)} className="relative flex animate-rise gap-3 overflow-hidden rounded-lg bg-fg/[0.03] p-4 pl-5 ring-1 ring-line motion-reduce:animate-none">
                  <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', index === 0 ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')} />
                  <span aria-hidden="true" className={cx(beadClass, 'size-9 font-mono text-[10px] font-black')}>
                    {stepNumber(index)}
                  </span>
                  <div className="min-w-0">
                    <p className={cx(captionClass, 'flex items-center gap-1.5')}>
                      <Icon name={item.icon} size={12} />
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-fg">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>

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
      <Link
        href="/copy-trading/masters"
        className="group/back inline-flex h-10 items-center gap-2 self-start rounded-full pr-4 pl-1.5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-colors hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
          <Icon name="arrowRight" size={13} className="rotate-180 transition-transform duration-200 group-hover/back:-translate-x-0.5 motion-reduce:transition-none" />
        </span>
        {copy.back}
      </Link>
      {plan ? (
        <MasterDashboard plan={plan} detail={getMasterDetail(plan)} />
      ) : (
        <>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{copy.notFound}</h2>
          <section className={cx(panelClass, 'flex flex-col items-center gap-3 px-6 py-16 text-center')}>
            <span aria-hidden="true" className="relative grid size-16 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />
              <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
                <Icon name="search" size={17} />
              </span>
            </span>
            <p className="text-base font-semibold text-fg">{copy.notFound}</p>
            <p className="text-sm text-fg-muted">{copy.notFoundHint}</p>
          </section>
        </>
      )}
    </div>
  );
}
