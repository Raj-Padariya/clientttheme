'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';
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
const WIN_BEADS = 20;
const PEAK_BEADS = 12;

const CHART = { width: 760, height: 330, left: 52, right: 24, top: 36, bottom: 58 };
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const ARROW = '\u2192';
const UP = '\u25B2';
const DOWN = '\u25BC';

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

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
  if (risk <= 2) return 'bg-success';
  if (risk === 3) return 'bg-warning';
  return 'bg-danger';
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
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', className)}>{children}</span>;
}

/** Pill tabs with a dark pill that slides under the active item. */
function RangeRail<T extends string>({ label, items, value, onChange }: { label: string; items: readonly T[]; value: T; onChange: (item: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 md:flex-col">
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
              'relative grid size-11 shrink-0 animate-feed-in place-items-center rounded-full font-mono text-[11px] font-black transition-[background-color,color,box-shadow,translate] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
              isActive ? 'bg-fg text-app shadow-[0_10px_22px_-12px_rgb(0_0_0/0.9)]' : 'nova-gloss text-fg-muted hover:-translate-y-0.5 hover:text-fg motion-reduce:hover:translate-y-0',
            )}
          >
            {isActive && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
            {item}
          </button>
        );
      })}
    </div>
  );
}

/** Two counter tiles; the active tile turns dark ink. */
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
              'flex items-center gap-3 rounded-[22px] p-2.5 text-left transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-fg text-app shadow-[0_14px_28px_-18px_rgb(0_0_0/0.9)]' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            <span className={cx('grid size-10 shrink-0 place-items-center rounded-full font-mono text-base font-black tabular-nums', isActive ? 'bg-app text-fg' : 'nova-gloss text-fg')}>{item.count}</span>
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
      <header className="flex items-center gap-3 border-b border-dashed border-line-strong px-5 py-4">
        <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-8')}>
            <Icon name={icon} size={14} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</p>
          <h2 className="truncate text-lg font-bold tracking-tight text-fg">{title}</h2>
        </div>
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
        'group/ink relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-fg font-semibold text-app shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'lg' ? 'h-12 px-6 text-sm' : 'h-10 px-4 text-sm',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
      <Icon name={icon} size={16} className="relative transition-transform duration-500 group-hover/ink:rotate-[360deg] motion-reduce:transition-none" />
      <span className="relative">{children}</span>
    </button>
  );
}

const MATRIX_COLUMNS = 28;
const MATRIX_ROWS = 5;

/** Empty state as a dim dot-matrix with a pulse wave running along its flatline. */
function EmptyBead({ icon, text }: { icon: IconName; text: string }) {
  const midRow = Math.floor(MATRIX_ROWS / 2);
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div aria-hidden="true" className="relative w-full max-w-md">
        <div style={{ gridTemplateColumns: `repeat(${MATRIX_COLUMNS}, minmax(0, 1fr))` }} className="grid gap-y-2">
          {Array.from({ length: MATRIX_COLUMNS * MATRIX_ROWS }, (_, index) => {
            const column = index % MATRIX_COLUMNS;
            const isFlatline = Math.floor(index / MATRIX_COLUMNS) === midRow;
            return (
              <span
                key={index}
                style={isFlatline ? { animationDelay: `${column * 90}ms` } : undefined}
                className={cx('mx-auto size-1.5 rounded-full', isFlatline ? 'animate-ping-soft bg-fg-muted motion-reduce:animate-none' : 'bg-line')}
              />
            );
          })}
        </div>
        <span className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name={icon} size={17} />
          </span>
        </span>
      </div>
      <p className="text-sm text-fg-muted">{text}</p>
    </div>
  );
}

/* ───────────── Header: identity ───────────── */

function IdentityHeader({ plan, detail, onSubscribe }: { plan: MasterPlan; detail: MasterDetail; onSubscribe: () => void }) {
  return (
    <header className="flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-5">
        <span className="relative grid size-24 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-2.5 animate-rim-spin rounded-full border border-line-strong [animation-direction:reverse] motion-reduce:animate-none" />
          <Avatar name={plan.name} className="size-16 text-2xl" />
          <span className="absolute right-1 bottom-1 grid size-6 place-items-center rounded-full bg-surface ring-1 ring-line">
            <LiveDot />
          </span>
        </span>
        <div className="min-w-0">
          <p className={captionClass}>{translate('nav.copyTrading')}</p>
          <h2 className="mt-1 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{plan.name}</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {copy.by} <span className="font-semibold text-fg">{plan.master}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Chip className="text-fg ring-line-strong">
              {copy.risk} {plan.risk}
              <span aria-hidden="true" className="flex items-center gap-0.5">
                {Array.from({ length: RISK_LEVELS }, (_, level) => (
                  <span key={level} style={{ animationDelay: `${300 + level * 80}ms` }} className={cx('size-1.5 animate-dot-pop rounded-full motion-reduce:animate-none', level < plan.risk ? riskTone(plan.risk) : 'bg-line-strong')} />
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
      </div>
      <InkButton onClick={onSubscribe} icon="checkCircle" size="lg" className="w-full sm:w-auto sm:self-start lg:self-center">
        {copy.subscribeToPlan}
      </InkButton>
    </header>
  );
}

/* ───────────── Frost gain card: total gain + trade beads + win meter ───────────── */

function GainFrost({ gainPercent, trades }: { gainPercent: number; trades: MasterOrder[] }) {
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const winRate = trades.length === 0 ? 0 : wins / trades.length;
  const litBeads = Math.round(winRate * WIN_BEADS);
  const maxAbs = Math.max(0.01, ...trades.map((trade) => Math.abs(trade.pnl)));

  return (
    <FrostCard className="h-full">
      <div className={cx('flex h-full flex-col gap-5 sm:p-1', inkClass)}>
        <div className="flex items-center justify-between gap-3">
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name="trendUp" size={14} />
            </span>
            {copy.totalGain}
          </p>
          <span className={cx('rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase', frostChipClass)}>{copy.allTime}</span>
        </div>
        <p className="text-6xl font-black tracking-tight text-[#13784a] tabular-nums">
          <CountUp value={gainPercent} format={formatPercent} />
        </p>

        {trades.length > 0 && (
          <div aria-hidden="true" className="flex min-h-10 flex-wrap items-center gap-1.5">
            {trades.map((trade, index) => {
              const size = 8 + (Math.abs(trade.pnl) / maxAbs) * 14;
              return (
                <span
                  key={trade.id}
                  style={{ width: size, height: size, animationDelay: `${300 + index * 60}ms` }}
                  className={cx('animate-dot-pop rounded-full ring-1 ring-white motion-reduce:animate-none', trade.pnl > 0 ? 'bg-[#13784a]/75' : 'bg-[#b4233c]/70')}
                />
              );
            })}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 border-t border-dotted border-[#0a1220]/25 pt-4">
          <span aria-hidden="true" className="flex flex-wrap gap-1">
            {Array.from({ length: WIN_BEADS }, (_, index) => (
              <span
                key={index}
                style={{ animationDelay: `${500 + index * 40}ms` }}
                className={cx('size-2.5 animate-dot-pop rounded-full motion-reduce:animate-none', index < litBeads ? 'bg-[#13784a]' : trades.length > 0 ? 'bg-[#b4233c]/30' : 'bg-[#0a1220]/12')}
              />
            ))}
          </span>
          <p className={cx('flex flex-wrap items-center gap-x-2 text-xs', inkMutedClass)}>
            {copy.winRate} <span className="font-black text-[#0a1220] tabular-nums">{Math.round(winRate * 100)}%</span>
            <span>·</span>
            <span className="font-semibold text-[#13784a] tabular-nums">
              {wins} {copy.wins}
            </span>
            <span className="font-semibold text-[#b4233c] tabular-nums">
              {trades.length - wins} {copy.losses}
            </span>
          </p>
        </div>
      </div>
    </FrostCard>
  );
}

/* ───────────── Metric strip + its bead visuals ───────────── */

/** Running P&L as columns of dots; taller columns = higher running total. */
function DotSpark({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1);
  return (
    <span aria-hidden="true" className="flex h-12 items-end gap-1">
      {values.map((value, index) => {
        const dots = Math.max(1, Math.round(((value - min) / (max - min)) * 6));
        return (
          <span key={index} className="flex flex-col-reverse gap-0.5">
            {Array.from({ length: dots }, (_, dot) => (
              <span key={dot} style={{ animationDelay: `${300 + index * 50 + dot * 30}ms` }} className={cx('size-1.5 animate-dot-pop rounded-full motion-reduce:animate-none', value >= 0 ? 'bg-success/80' : 'bg-danger/80')} />
            ))}
          </span>
        );
      })}
    </span>
  );
}

/** Five numbered beads; the master's level is the big ringed one. */
function RiskBeadScale({ risk }: { risk: number }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-2">
      {Array.from({ length: RISK_LEVELS }, (_, level) => {
        const isLevel = level + 1 === risk;
        return (
          <span key={level} className="flex flex-col items-center gap-1">
            <span
              style={{ animationDelay: `${300 + level * 80}ms` }}
              className={cx(
                'animate-dot-pop rounded-full motion-reduce:animate-none',
                isLevel ? cx('size-4 ring-2 ring-fg/60 ring-offset-2 ring-offset-surface', riskTone(risk)) : cx('size-2.5', level < risk ? riskTone(risk) : 'bg-line-strong'),
              )}
            />
            <span className={cx('font-mono text-[9px] tabular-nums', isLevel ? 'font-black text-fg' : 'text-fg-subtle')}>{level + 1}</span>
          </span>
        );
      })}
    </span>
  );
}

function SeatBeads({ count, limit }: { count: number; limit: string }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-2">
      <span className="flex -space-x-2">
        {Array.from({ length: Math.min(count, 5) }, (_, index) => (
          <span key={index} className={cx(beadClass, 'size-7 ring-2 ring-surface')}>
            <Icon name="user" size={11} />
          </span>
        ))}
        <span className="relative grid size-7 place-items-center rounded-full border border-dashed border-line-strong bg-surface text-xs text-fg-muted">
          <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />+
        </span>
      </span>
      <span className="font-mono text-xs text-fg-subtle tabular-nums">/ {limit}</span>
    </span>
  );
}

function PulseBead() {
  return (
    <span aria-hidden="true" className="relative grid size-9 place-items-center">
      <span className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden" />
      <span className={cx(beadClass, 'size-7')}>
        <Icon name="wallet" size={12} />
      </span>
    </span>
  );
}

function BeadStacks() {
  return (
    <span aria-hidden="true" className="flex items-end gap-1.5">
      {[2, 3, 4, 5].map((height, column) => (
        <span key={column} className="flex flex-col-reverse gap-0.5">
          {Array.from({ length: height }, (_, row) => (
            <span key={row} style={{ animationDelay: `${column * 120 + row * 60}ms` }} className="h-1.5 w-6 animate-rise rounded-full bg-fg/25 ring-1 ring-fg/30 motion-reduce:animate-none" />
          ))}
        </span>
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

function MetricStrip({ capsules }: { capsules: Capsule[] }) {
  return (
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
      <ul className="grid sm:grid-cols-2">
        {capsules.map((capsule, index) => {
          const isLead = index === 0;
          return (
            <li
              key={capsule.key}
              style={staggerStyle(index, 120)}
              className={cx(
                'group/metric flex min-w-0 animate-feed-in flex-col gap-3 border-dotted border-line-strong p-5 motion-reduce:animate-none',
                isLead ? 'border-b sm:col-span-2 sm:flex-row sm:items-end sm:justify-between' : 'border-b sm:odd:border-l',
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">{stepNumber(index)}</span>
                  <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/metric:-rotate-12 motion-reduce:transition-none')}>
                    <Icon name={capsule.icon} size={13} />
                  </span>
                  <p className="min-w-0 truncate text-sm font-semibold text-fg">{capsule.label}</p>
                  {capsule.isLive && <LiveDot />}
                </div>
                <p className={cx('mt-3 font-black tracking-tight tabular-nums', isLead ? 'text-5xl' : 'text-2xl', capsule.tone)}>
                  <CountUp value={capsule.value} format={capsule.format} />
                </p>
                <p className={cx(captionClass, 'mt-1')}>{capsule.caption}</p>
              </div>
              <div className={cx(isLead && 'sm:max-w-[55%]')}>{capsule.viz}</div>
            </li>
          );
        })}
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

              <path d={hwmPath} fill="none" strokeWidth={1.2} strokeDasharray="2 5" strokeLinecap="round" className="stroke-fg/45" style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${settled}ms` }} />

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
                    <rect
                      x={r2(x - capsuleWidth / 2)}
                      y={r2(top)}
                      width={r2(capsuleWidth)}
                      height={r2(height)}
                      rx={r2(Math.min(capsuleWidth / 2, height / 2))}
                      strokeWidth={1.4}
                      className={isGain ? 'fill-success/30 stroke-success' : 'fill-danger/30 stroke-danger'}
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

  const extremes = [
    { key: 'best', label: copy.bestTrade, trade: best, icon: 'trophy' as const, text: 'text-success', bead: 'bg-fg text-app' },
    { key: 'worst', label: copy.worstTrade, trade: worst, icon: 'trendDown' as const, text: 'text-danger', bead: 'nova-gloss text-danger' },
  ];

  return (
    <div className="flex flex-col gap-5 p-5">
      <ul className="flex flex-col">
        {extremes.map((item, index) => (
          <li key={item.key} style={staggerStyle(index, 120)} className="flex animate-feed-in items-center gap-3 border-b border-dotted border-line-strong py-3 first:pt-0 motion-reduce:animate-none">
            <span aria-hidden="true" className={cx('grid size-10 shrink-0 place-items-center rounded-full', item.bead)}>
              <Icon name={item.icon} size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx(captionClass, 'block')}>{item.label}</span>
              <span className="block truncate text-xs text-fg-muted">
                {item.trade.symbol} · {item.trade.direction}
              </span>
            </span>
            <span className={cx('font-mono text-xl font-black tabular-nums', item.text)}>{pnlLabel(item.trade.pnl)}</span>
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
        <span aria-hidden="true" className="flex flex-wrap gap-1.5">
          {trades.map((trade, index) => (
            <span
              key={trade.id}
              style={{ animationDelay: `${200 + index * 50}ms` }}
              className={cx('grid size-5 animate-dot-pop place-items-center rounded-full text-[8px] font-black text-white motion-reduce:animate-none', trade.direction === 'BUY' ? 'bg-success/80' : 'bg-danger/75')}
            >
              {trade.direction === 'BUY' ? UP : DOWN}
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
        <ul className="flex flex-col">
          {symbols.map(([symbol, count], rowIndex) => (
            <li key={symbol} className="flex items-center gap-2.5 border-b border-dotted border-line-strong py-2 last:border-b-0">
              <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', symbolDot[symbol] ?? 'bg-fg-subtle')} />
              <span className="w-16 shrink-0 text-xs font-semibold text-fg">{symbol}</span>
              <span aria-hidden="true" className="flex flex-1 flex-wrap gap-1">
                {Array.from({ length: count }, (_, index) => (
                  <span key={index} style={{ animationDelay: `${300 + rowIndex * 120 + index * 40}ms` }} className={cx('size-2.5 animate-dot-pop rounded-full motion-reduce:animate-none', symbolDot[symbol] ?? 'bg-fg-subtle')} />
                ))}
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
            <li key={order.id} style={staggerStyle(index, 45)} className="group/order grid animate-feed-in grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 border-b border-dotted border-line-strong py-3 last:border-b-0 motion-reduce:animate-none">
              <span aria-hidden="true" className={cx('grid size-9 place-items-center rounded-full font-mono text-[10px] font-black transition-transform duration-300 group-hover/order:-rotate-12', isGain ? 'bg-fg text-app' : 'nova-gloss text-danger')}>
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
                  <span aria-hidden="true" className="hidden gap-0.5 sm:flex">
                    {Array.from({ length: 5 }, (_, dot) => (
                      <span key={dot} className={cx('size-1.5 rounded-full', dot < litDots ? (isGain ? 'bg-success' : 'bg-danger') : 'bg-line-strong')} />
                    ))}
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

  return (
    <>
      <IdentityHeader plan={plan} detail={detail} onSubscribe={() => setIsSubscribeOpen(true)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div style={staggerStyle(0, 140)} className="animate-rise motion-reduce:animate-none">
          <GainFrost gainPercent={detail.totalGainPercent} trades={allTrades} />
        </div>
        <MetricStrip capsules={capsules} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section style={staggerStyle(2, 140)} className={cx(panelClass, 'grid min-w-0 animate-rise motion-reduce:animate-none md:grid-cols-[5.5rem_minmax(0,1fr)]')}>
            <div className="flex items-center gap-3 overflow-x-auto border-b border-dashed border-line-strong p-4 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:py-6">
              <RangeRail label={copy.performance} items={RANGES.map((item) => item.id)} value={range} onChange={setRange} />
              <button
                type="button"
                onClick={() => setReplayCount((count) => count + 1)}
                className="group/replay flex shrink-0 flex-col items-center gap-1 rounded-full text-[10px] font-semibold text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-ring md:mt-auto"
              >
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-dashed border-line-strong text-base transition-transform duration-500 group-hover/replay:-rotate-180 motion-reduce:transition-none">
                  {'\u21BB'}
                </span>
                {copy.replay}
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-4 p-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-mono text-[10px] text-fg-subtle">
                  <Icon name="trendUp" size={12} />
                  01 · {range}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">{copy.performance}</h2>
                <p className="mt-1 text-xs text-fg-muted">{copy.performanceNote}</p>
              </div>
              {chartTrades.length === 0 ? <EmptyBead icon="trendUp" text={copy.noTrades} /> : <PerformanceChart key={`${range}-${replayCount}`} trades={chartTrades} />}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dotted border-line-strong pt-4 text-xs text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-fg ring-2 ring-surface" />
                  {copy.cumulative}
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-3.5 w-2 rounded-full bg-success/30 ring-1 ring-success" />
                  {copy.tradePnl} <span className="text-fg-subtle">({copy.perTrade})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="w-4 border-t border-dashed border-fg/50" />
                  {copy.highWater}
                </span>
              </div>
            </div>
          </section>

          <section style={staggerStyle(3, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 motion-reduce:animate-none')}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                        'inline-flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3 text-xs font-semibold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                        isSelected ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                      )}
                    >
                      {symbol !== 'all' && <span aria-hidden="true" className={cx('size-2 rounded-full', symbolDot[symbol] ?? 'bg-fg-subtle')} />}
                      {symbol === 'all' ? copy.allSymbols : symbol}
                      <span className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] tabular-nums', isSelected ? 'bg-app text-fg' : 'bg-surface-2 text-fg-subtle')}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <OrderLedger key={`${ordersTab}-${symbolFilter}`} orders={visibleOrders} />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <PlanCard plan={plan} detail={detail} onSubscribe={() => setIsSubscribeOpen(true)} />
          {chartTrades.length > 0 && (
            <Section index={3} delayIndex={4} icon="compass" title={copy.tradeDna}>
              <TradeDna key={range} trades={chartTrades} />
            </Section>
          )}
          {playbook.length > 0 && (
            <Section index={4} delayIndex={5} icon="alert" title={copy.disclosure}>
              <ol className="flex flex-col gap-3 p-5">
                {playbook.map((item, index) => (
                  <li key={item.key} style={staggerStyle(index, 120)} className="flex animate-rise gap-3 rounded-[22px] border border-dashed border-line-strong p-4 motion-reduce:animate-none">
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
        </aside>
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
