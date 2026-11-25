'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { Input } from '../ui/Input';
import { masterPlans, minInvestmentLabel, type MasterPlan } from './mastersData';
import { StartCopyModal } from './StartCopyModal';
import '../promotion/market.css';
import '../pamm/desk.css';

type RiskTier = 'all' | 'low' | 'medium' | 'high';
type TrackRecord = 'all' | '30' | '90';
type SortKey = 'gain' | 'drawdown' | 'pnl' | 'copiers' | 'fee';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 9;
const COMMUNITY_AUM = 18_410;
const ENROLLED_COUNT = 0;
const RISK_LEVELS = 5;
const SPARK_POINTS = 24;
const CANDLE_COUNT = 18;
const IDLE_BARS = 16;

const riskTiers: { tier: RiskTier; labelKey: MessageKey; dot: string }[] = [
  { tier: 'all', labelKey: 'copy.explore.risk.all', dot: 'bg-fg' },
  { tier: 'low', labelKey: 'copy.explore.risk.low', dot: 'bg-(--hero-buy)' },
  { tier: 'medium', labelKey: 'copy.explore.risk.medium', dot: 'bg-warning' },
  { tier: 'high', labelKey: 'copy.explore.risk.high', dot: 'bg-(--aurora-cta-from)' },
];

const matchesRiskTier: Record<RiskTier, (risk: number) => boolean> = {
  all: () => true,
  low: (risk) => risk <= 2,
  medium: (risk) => risk === 3,
  high: (risk) => risk >= 4,
};

// Higher is better for every key except drawdown and fee, where the smallest value ranks first.
const sortScore: Record<SortKey, (plan: MasterPlan) => number> = {
  gain: (plan) => plan.totalGain,
  drawdown: (plan) => plan.maxDrawdown,
  pnl: (plan) => plan.totalPnl,
  copiers: (plan) => plan.copiers,
  fee: (plan) => -plan.feePercent,
};

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-xl bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : ''}${formatMoney(amount, 'USD')}`;
}

function drawdownLabel(value: number): string {
  return `-${Math.abs(value)}%`;
}

function riskColor(risk: number): string {
  if (risk <= 2) return 'bg-(--hero-buy)';
  if (risk === 3) return 'bg-warning';
  return 'bg-(--aurora-cta-from)';
}

function rankLabel(rank: number): string {
  return String(rank).padStart(2, '0');
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// The screener symbol: the first four letters or digits of the plan name, upper-cased.
function tickerOf(name: string) {
  return name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
}

/* ───────────── Price series ───────────── */

function seedOf(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// A stable illustrative price path per plan: trends with the sign of its gain, swings wider the deeper its drawdown.
function sparkValues(plan: MasterPlan, count: number): number[] {
  let seed = seedOf(plan.name);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const direction = plan.totalGain >= 0 ? 1 : -1;
  const swing = Math.min(0.45, 0.12 + Math.abs(plan.maxDrawdown) / 60);
  return Array.from({ length: count }, (_, index) => direction * (index / (count - 1)) + (random() - 0.5) * swing);
}

function toCoords(values: number[], width: number, height: number, pad = 4): [number, number][] {
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  return values.map((value, index) => [round1((index / (values.length - 1)) * width), round1(pad + (1 - (value - low) / range) * (height - pad * 2))]);
}

function linePath(coords: [number, number][]) {
  return coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

function Sparkline({ plan, className, delayMs = 0 }: { plan: MasterPlan; className?: string; delayMs?: number }) {
  const coords = toCoords(sparkValues(plan, SPARK_POINTS), 120, 36);
  const path = linePath(coords);
  const isUp = plan.totalGain >= 0;
  const [lastX, lastY] = coords[coords.length - 1];
  return (
    <svg aria-hidden="true" viewBox="0 0 120 36" className={cx('overflow-visible', className)}>
      <path d={`${path} V36 H0 Z`} className={isUp ? 'fill-(--hero-buy)/12' : 'fill-(--aurora-cta-from)/12'} />
      <path
        d={path}
        pathLength={1}
        fill="none"
        strokeWidth={1.75}
        strokeLinejoin="round"
        style={{ '--draw-delay': `${delayMs}ms` } as CSSProperties}
        className={cx('mkt-draw', isUp ? 'stroke-(--hero-buy)' : 'stroke-(--aurora-cta-from)')}
      />
      <circle cx={lastX} cy={lastY} r={2.5} className={cx('mkt-blink', isUp ? 'fill-(--hero-buy)' : 'fill-(--aurora-cta-from)')} />
    </svg>
  );
}

/* ───────────── Shared bits ───────────── */

function ClayDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

/** Risk as a volatility meter: five bars rising in height; the lit ones take the tier colour. */
function RiskBeads({ risk }: { risk: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
        {Array.from({ length: RISK_LEVELS }, (_, level) => {
          const isLit = level < risk;
          return (
            <span
              key={level}
              style={{ height: `${40 + level * 15}%`, ...(isLit ? { '--candle-delay': `${300 + level * 80}ms` } : {}) } as CSSProperties}
              className={cx('w-1.5 rounded-[1px]', isLit ? cx('mkt-candle', riskColor(risk)) : 'bg-fg/15')}
            />
          );
        })}
      </span>
      <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-fg-muted uppercase">
        {translate('copy.explore.risk')} {risk}
      </span>
    </span>
  );
}

function CopyButton({ plan, onCopy, size = 'sm' }: { plan: MasterPlan; onCopy: (plan: MasterPlan) => void; size?: 'sm' | 'lg' }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onCopy(plan)}
      className={cx(
        'group/copy relative z-20 inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-lg bg-(--hero-buy) py-1 pr-4 pl-1 font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'lg' ? 'h-12 text-sm' : 'h-10 text-sm',
      )}
    >
      {size === 'lg' && <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />}
      <span
        aria-hidden="true"
        className={cx(
          'relative grid place-items-center rounded-md bg-(--aurora-cta-from) text-[#062520] transition-transform duration-300 group-hover/copy:-rotate-12 motion-reduce:transition-none',
          size === 'lg' ? 'size-10' : 'size-8',
        )}
      >
        <Icon name="copy" size={14} />
      </span>
      <span className="relative">{translate('copy.explore.copy')}</span>
    </button>
  );
}

function RankBead({ rank, className }: { rank: number; className?: string }) {
  const isLeader = rank === 1;
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center rounded-lg font-mono text-[11px] font-black tabular-nums',
        isLeader ? 'bg-(--aurora-cta-from) text-[#062520]' : 'bg-fg/[0.06] text-fg ring-1 ring-line',
        className ?? 'size-8',
      )}
    >
      {isLeader ? <Icon name="trophy" size={13} /> : rankLabel(rank)}
    </span>
  );
}

// Empty screen: idle volume bars bouncing over a flat dashed axis, the search icon above.
function EmptyBoard({ className }: { className?: string }) {
  return (
    <section className={cx('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong p-10 text-center', className)}>
      <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
        <Icon name="search" size={18} />
      </span>
      <span aria-hidden="true" className="flex h-8 w-44 items-end gap-[3px] border-b border-dashed border-line-strong pb-0.5">
        {Array.from({ length: IDLE_BARS }, (_, index) => (
          <span key={index} style={{ height: `${30 + ((index * 37) % 70)}%`, '--vol-delay': `${(index % 5) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-[1px] bg-fg/15" />
        ))}
      </span>
      <p className="text-sm font-semibold text-fg">{translate('copy.explore.emptyTitle')}</p>
    </section>
  );
}

/* ───────────── Title ───────────── */

function PageTitle() {
  return (
    <header className="zenith-tile border-b border-line pb-6">
      <p className={cx(captionClass, 'flex items-center gap-2')}>
        <ClayDot className="size-1.5" />
        {translate('nav.copyTrading')}
      </p>
      <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMasters')}</h2>
    </header>
  );
}

/* ───────────── Top gainer: the leading master as a live candle chart ───────────── */

function CandleChart({ plan }: { plan: MasterPlan }) {
  const values = sparkValues(plan, CANDLE_COUNT + 1);
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  const toY = (value: number) => round1(6 + (1 - (value - low) / range) * 48);
  const slot = 200 / CANDLE_COUNT;
  const lastY = toY(values[values.length - 1]);

  return (
    <div aria-hidden="true" className="relative">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="h-32 w-full overflow-visible">
        {[15, 30, 45].map((y) => (
          <line key={y} x1={0} x2={200} y1={y} y2={y} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" className="stroke-fg/10" />
        ))}
        <line x1={0} x2={200} y1={lastY} y2={lastY} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="mkt-march stroke-(--hero-buy)/60" />
        {Array.from({ length: CANDLE_COUNT }, (_, index) => {
          const open = values[index];
          const close = values[index + 1];
          const isUp = close >= open;
          const top = toY(Math.max(open, close));
          const bodyHeight = Math.max(1.5, toY(Math.min(open, close)) - top);
          const wick = Math.max(2, bodyHeight * 0.4);
          const x = index * slot + slot / 2;
          const isLast = index === CANDLE_COUNT - 1;
          return (
            <g key={index} style={{ '--candle-delay': `${200 + index * 60}ms` } as CSSProperties} className="mkt-candle origin-bottom [transform-box:fill-box]">
              <line x1={x} x2={x} y1={top - wick} y2={top + bodyHeight + wick} strokeWidth={1} vectorEffect="non-scaling-stroke" className={isUp ? 'stroke-(--hero-buy)' : 'stroke-(--aurora-cta-from)'} />
              <rect
                x={x - slot * 0.3}
                y={top}
                width={slot * 0.6}
                height={bodyHeight}
                rx={0.6}
                className={cx(isUp ? 'fill-(--hero-buy)' : 'fill-(--aurora-cta-from)', isLast && 'mkt-blink')}
              />
            </g>
          );
        })}
      </svg>
      {/* Last price tag riding the dashed close line on the right edge. */}
      <span style={{ top: `${(lastY / 60) * 100}%` }} className="absolute right-0 flex -translate-y-1/2 translate-x-1 items-center">
        <span className="size-0 border-y-[5px] border-r-[6px] border-y-transparent border-r-(--hero-buy)" />
        <span className="rounded-md bg-(--hero-buy) px-1.5 py-0.5 font-mono text-[10px] font-black text-[#062520] tabular-nums">{tickerOf(plan.name)}</span>
      </span>
    </div>
  );
}

function Spotlight({ plan, onCopy }: { plan: MasterPlan | undefined; onCopy: (plan: MasterPlan) => void }) {
  if (!plan) return <EmptyBoard className="zenith-tile h-full" />;

  const metrics: { key: string; icon: IconName; label: string; value: string; tone: string }[] = [
    { key: 'drawdown', icon: 'trendDown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', icon: 'trendUp', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', icon: 'wallet', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
    { key: 'fee', icon: 'sliders', label: translate('copy.explore.fee'), value: `${plan.feePercent}%`, tone: 'text-fg' },
    { key: 'copiers', icon: 'user', label: translate('copy.explore.copiers'), value: String(plan.copiers), tone: 'text-fg' },
  ];

  return (
    <section key={plan.id} style={staggerStyle(0, 150)} className={cx(panelClass, 'group/spot zenith-tile flex h-full min-w-0 flex-col gap-5 p-5 sm:p-6')}>
      <Link href={`/copy-trading/masters/${plan.id}`} aria-label={plan.name} className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring" />
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-(--hero-buy) to-(--hero-buy)/0" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-md bg-(--aurora-cta-from) py-1 pr-3 pl-1 text-[10.5px] font-bold tracking-[0.12em] text-[#062520] uppercase">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded bg-[#062520]/15">
            <Icon name="trophy" size={11} />
          </span>
          {translate('copy.explore.topMaster')}
        </span>
        <RiskBeads risk={plan.risk} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <span className="relative grid shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute -inset-1.5 animate-ring-ripple rounded-[20px] border-2 border-(--hero-buy)/60 motion-reduce:hidden" />
              <Avatar name={plan.name} className="size-18 rounded-2xl! text-2xl ring-2 ring-(--hero-buy) transition-transform duration-500 group-hover/spot:scale-105 motion-reduce:transition-none" />
            </span>
            <div className="min-w-0">
              <span aria-hidden="true" className="inline-flex items-center gap-1 rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] font-black tracking-widest text-(--hero-buy) ring-1 ring-line">
                <Icon name="trendUp" size={10} />
                {tickerOf(plan.name)}
              </span>
              <p className="mt-1 truncate text-3xl font-black tracking-tight text-fg" title={plan.name}>
                {plan.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
                <LiveDot />
                <span className="truncate">
                  {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
                </span>
              </p>
            </div>
          </div>
          <p className={cx(captionClass, 'mt-6')}>{translate('copy.explore.totalGain')}</p>
          <p className="mt-2 font-mono text-6xl leading-none font-black tracking-tighter text-(--hero-buy) tabular-nums">
            <CountUp value={plan.totalGain} format={formatPercent} />
          </p>
        </div>
        <CandleChart plan={plan} />
      </div>

      <div className="mt-auto flex flex-col gap-4 border-t border-dashed border-line pt-4 md:flex-row md:items-end">
        <dl className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric, index) => (
            <div key={metric.key} style={staggerStyle(index, 300)} className="flex min-w-0 animate-feed-in flex-col gap-1 rounded-lg bg-fg/[0.03] p-2.5 ring-1 ring-line motion-reduce:animate-none">
              <dt className={cx(captionClass, 'flex min-w-0 items-center gap-1.5')}>
                <Icon name={metric.icon} size={10} className="shrink-0" />
                <span className="truncate">{metric.label}</span>
              </dt>
              <dd className={cx('truncate font-mono text-sm font-black tabular-nums', metric.tone)}>{metric.value}</dd>
            </div>
          ))}
        </dl>
        <CopyButton plan={plan} onCopy={onCopy} size="lg" />
      </div>
    </section>
  );
}

/* ───────────── Community index ───────────── */

const INDEX_WIDTH = 200;
const INDEX_HEIGHT = 56;

function PulsePanel() {
  const avgGain = masterPlans.reduce((sum, plan) => sum + plan.totalGain, 0) / masterPlans.length;
  const rows: { key: string; icon: IconName; labelKey: MessageKey; captionKey: MessageKey; value: number; format: (current: number) => string; tone: string; strip: string }[] = [
    { key: 'plans', icon: 'dashboard', labelKey: 'copy.explore.availablePlans', captionKey: 'copy.explore.browseAll', value: masterPlans.length, format: (current) => String(Math.round(current)), tone: 'text-fg', strip: 'bg-fg/40' },
    { key: 'gain', icon: 'trendUp', labelKey: 'copy.explore.avgGain', captionKey: 'copy.explore.performance', value: avgGain, format: formatPercent, tone: 'text-success', strip: 'bg-(--hero-buy)' },
    { key: 'enrolled', icon: 'user', labelKey: 'copy.explore.enrolled', captionKey: 'copy.explore.subscribed', value: ENROLLED_COUNT, format: (current) => String(Math.round(current)), tone: 'text-success', strip: 'bg-(--aurora-cta-from)' },
  ];
  // Community index: the average of every master's price path.
  const series = masterPlans.map((plan) => sparkValues(plan, SPARK_POINTS));
  const indexValues = Array.from({ length: SPARK_POINTS }, (_, index) => series.reduce((sum, values) => sum + values[index], 0) / Math.max(1, series.length));
  const indexPath = linePath(toCoords(indexValues, INDEX_WIDTH, INDEX_HEIGHT, 6));

  return (
    <section style={staggerStyle(1, 150)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 sm:p-6')}>
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={13} />
          </span>
          {translate('copy.explore.communityAum')}
          <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-(--hero-buy)" />
        </p>
        <p className="mt-4 truncate font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums">
          <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
        </p>
        <p className={cx(captionClass, 'mt-2')}>{translate('copy.explore.totalLocked')}</p>
      </div>

      {/* Index line drawing in, a sage tick running along it. */}
      <div aria-hidden="true" className="relative overflow-hidden rounded-lg bg-fg/[0.03] p-2 ring-1 ring-line">
        <svg viewBox={`0 0 ${INDEX_WIDTH} ${INDEX_HEIGHT}`} className="h-auto w-full overflow-visible">
          <path d={`${indexPath} V${INDEX_HEIGHT} H0 Z`} className="fill-(--hero-buy)/10" />
          <path d={indexPath} pathLength={1} fill="none" strokeWidth={2} strokeLinejoin="round" className="mkt-draw stroke-(--hero-buy)" />
          <g className="motion-reduce:hidden">
            <circle r={3.5} className="fill-(--aurora-cta-from)">
              <animateMotion dur="4s" repeatCount="indefinite" path={indexPath} />
            </circle>
          </g>
        </svg>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={row.key} style={staggerStyle(index, 250)} className="group/pulse relative flex animate-feed-in items-center gap-3 overflow-hidden rounded-lg bg-fg/[0.03] py-2 pr-4 pl-3 ring-1 ring-line motion-reduce:animate-none">
            <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', row.strip)} />
            <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/pulse:-rotate-12 motion-reduce:transition-none')}>
              <Icon name={row.icon} size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-fg">{translate(row.labelKey)}</span>
              <span className="block truncate text-[11px] text-fg-muted">{translate(row.captionKey)}</span>
            </span>
            <span className={cx('shrink-0 font-mono text-xl font-black tabular-nums', row.tone)}>
              <CountUp value={row.value} format={row.format} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Screener toolbar ───────────── */

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { mode: ViewMode; icon: IconName; labelKey: MessageKey }[] = [
    { mode: 'grid', icon: 'dashboard', labelKey: 'copy.explore.viewGrid' },
    { mode: 'list', icon: 'menu', labelKey: 'copy.explore.viewList' },
  ];

  return (
    <div className="relative grid shrink-0 grid-cols-2 rounded-lg bg-fg/[0.04] p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        className={cx('absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-md bg-(--hero-buy) transition-transform duration-300 ease-out motion-reduce:transition-none', view === 'list' && 'translate-x-full')}
      />
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          aria-label={translate(option.labelKey)}
          title={translate(option.labelKey)}
          aria-pressed={view === option.mode}
          onClick={() => onChange(option.mode)}
          className={cx(
            'relative grid size-9 place-items-center rounded-md transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
            view === option.mode ? 'text-[#062520]' : 'text-fg-muted hover:text-fg',
          )}
        >
          <Icon name={option.icon} size={16} />
        </button>
      ))}
    </div>
  );
}

/* ───────────── Results: quote cards / screener table ───────────── */

function MasterCard({ plan, rank, index, onCopy }: { plan: MasterPlan; rank: number; index: number; onCopy: (plan: MasterPlan) => void }) {
  const isLeader = rank === 1;
  const metrics: { key: string; icon: IconName; label: string; value: string; tone: string }[] = [
    { key: 'drawdown', icon: 'trendDown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', icon: 'trendUp', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', icon: 'wallet', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
  ];

  return (
    <article
      style={staggerStyle(index, 120)}
      className={cx(
        'group/card relative isolate flex animate-rise flex-col overflow-hidden rounded-xl bg-fg/[0.03] p-5 ring-1 transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-fg/[0.05] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        isLeader ? 'ring-(--hero-buy)/50' : 'ring-line hover:ring-line-strong',
      )}
    >
      <Link href={`/copy-trading/masters/${plan.id}`} aria-label={plan.name} className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring" />
      {isLeader && <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-16 -skew-x-12 bg-white/[0.07]" />}

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <RankBead rank={rank} />
          <span aria-hidden="true" className="font-mono text-xs font-black tracking-widest text-fg-muted">
            {tickerOf(plan.name)}
          </span>
        </span>
        {isLeader ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-(--aurora-cta-from) px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-[#062520] uppercase">
            <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-[#062520]" />
            {translate('copy.explore.topMaster')}
          </span>
        ) : (
          <RiskBeads risk={plan.risk} />
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="relative grid shrink-0 place-items-center">
          {isLeader && <span aria-hidden="true" className="absolute -inset-1 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/60 motion-reduce:hidden" />}
          <Avatar name={plan.name} className="size-12 rounded-xl! text-base transition-transform duration-500 group-hover/card:scale-105 motion-reduce:transition-none" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-tight text-fg" title={plan.name}>
            {plan.name}
          </p>
          <p className="flex max-w-full items-center gap-1.5 text-xs text-fg-muted">
            <LiveDot />
            <span className="truncate">
              {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
            </span>
          </p>
          {isLeader && (
            <span className="mt-1.5 block">
              <RiskBeads risk={plan.risk} />
            </span>
          )}
        </div>
      </div>

      {/* Quote: the gain as the price, its sparkline drawing in beside it. */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={captionClass}>{translate('copy.explore.totalGain')}</p>
          <p className={cx('mt-1 font-mono text-3xl leading-none font-black tracking-tighter tabular-nums', plan.totalGain >= 0 ? 'text-(--hero-buy)' : 'text-(--aurora-cta-from)')}>
            <CountUp value={plan.totalGain} format={formatPercent} />
          </p>
        </div>
        <Sparkline plan={plan} delayMs={200 + index * 90} className="h-10 w-28 shrink-0" />
      </div>

      <dl className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-line pt-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2">
            <Icon name={metric.icon} size={11} className="shrink-0 text-fg-subtle" />
            <dt className={cx(captionClass, 'min-w-0 truncate')}>{metric.label}</dt>
            <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
            <dd className={cx('shrink-0 font-mono text-sm font-bold tabular-nums', metric.tone)}>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center gap-3 pt-5">
        <span className="rounded-md px-2 py-1 font-mono text-xs text-fg-muted ring-1 ring-line-strong">
          {translate('copy.explore.fee')}: <span className="font-bold text-fg">{plan.feePercent}%</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-fg-muted" title={translate('copy.explore.copiers')}>
          <Icon name="user" size={14} />
          <span className="font-mono font-bold text-fg tabular-nums">{plan.copiers}</span>
          <span className="sr-only">{translate('copy.explore.copiers')}</span>
        </span>
        <span className="ml-auto">
          <CopyButton plan={plan} onCopy={onCopy} />
        </span>
      </div>
    </article>
  );
}

function RankedList({ items, firstRank, onCopy }: { items: MasterPlan[]; firstRank: number; onCopy: (plan: MasterPlan) => void }) {
  const headClass = cx(captionClass, 'px-3 py-3 text-left whitespace-nowrap');
  const cellClass = 'px-3 py-3 font-mono tabular-nums';

  return (
    <div className={cx(panelClass, 'animate-rise overflow-x-auto p-2 motion-reduce:animate-none')}>
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={headClass}>#</th>
            <th scope="col" className={headClass}>{translate('copy.explore.master')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.totalGain')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.maxDrawdown')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.totalPnl')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.minInvestment')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.fee')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.copiers')}</th>
            <th scope="col" className={headClass}>
              <span className="sr-only">{translate('copy.explore.copy')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-line">
          {items.map((plan, index) => {
            const rank = firstRank + index;
            return (
              <tr key={plan.id} style={staggerStyle(index, 150)} className="group/row animate-feed-in transition-colors hover:bg-fg/[0.04] motion-reduce:animate-none">
                <td className="py-2 pr-3 pl-2">
                  <RankBead rank={rank} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={plan.name} className="size-9 rounded-lg! text-xs" />
                    <div className="min-w-0">
                      <Link
                        href={`/copy-trading/masters/${plan.id}`}
                        className="flex items-center gap-2 truncate font-bold text-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span aria-hidden="true" className="rounded bg-fg/[0.06] px-1 font-mono text-[10px] font-black tracking-widest text-(--hero-buy)">
                          {tickerOf(plan.name)}
                        </span>
                        {plan.name}
                      </Link>
                      <p className="text-xs text-fg-muted">
                        {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D · {translate('copy.explore.risk')} {plan.risk}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cx(cellClass, 'py-2')}>
                  <span className="flex items-center gap-3">
                    <span className={cx('font-black', plan.totalGain >= 0 ? 'text-(--hero-buy)' : 'text-(--aurora-cta-from)')}>{formatPercent(plan.totalGain)}</span>
                    <Sparkline plan={plan} delayMs={200 + index * 80} className="h-7 w-20" />
                  </span>
                </td>
                <td className={cx(cellClass, 'text-danger')}>{drawdownLabel(plan.maxDrawdown)}</td>
                <td className={cx(cellClass, 'text-success')}>{signedMoney(plan.totalPnl)}</td>
                <td className={cx(cellClass, 'text-fg')}>{minInvestmentLabel(plan)}</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.copiers}</td>
                <td className="py-2 pr-2 pl-3 text-right">
                  <CopyButton plan={plan} onCopy={onCopy} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PagerButton({ labelKey, symbol, disabled, onClick }: { labelKey: MessageKey; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={translate(labelKey)}
      title={translate(labelKey)}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md font-mono text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

/* ───────────── Page ───────────── */

export default function MastersPage() {
  const [masterQuery, setMasterQuery] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [riskTier, setRiskTier] = useState<RiskTier>('all');
  const [trackRecord, setTrackRecord] = useState<TrackRecord>('all');
  const [sortKey, setSortKey] = useState<SortKey>('gain');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [copyPlan, setCopyPlan] = useState<MasterPlan | null>(null);

  const filteredPlans = useMemo(() => {
    const masterNeedle = masterQuery.trim().toLowerCase();
    const planNeedle = planQuery.trim().toLowerCase();
    const minDays = trackRecord === 'all' ? 0 : Number(trackRecord);

    return masterPlans
      .filter((plan) => plan.master.toLowerCase().includes(masterNeedle))
      .filter((plan) => plan.name.toLowerCase().includes(planNeedle))
      .filter((plan) => matchesRiskTier[riskTier](plan.risk))
      .filter((plan) => plan.activeDays >= minDays)
      .sort((left, right) => sortScore[sortKey](right) - sortScore[sortKey](left));
  }, [masterQuery, planQuery, riskTier, trackRecord, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredPlans.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredPlans.slice(firstIndex, firstIndex + PAGE_SIZE);
  const rangeStart = filteredPlans.length === 0 ? 0 : firstIndex + 1;
  const rangeEnd = firstIndex + pageItems.length;

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  // Skeleton: title, top-gainer candle card beside the community index, the screener toolbar panel, then quote cards / screener table.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Spotlight plan={filteredPlans[0]} onCopy={setCopyPlan} />
        <PulsePanel />
      </div>

      <section style={staggerStyle(2, 150)} className={cx(panelClass, 'zenith-tile flex flex-col gap-4 p-4 sm:p-5')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-(--hero-buy) py-1 pr-1 pl-3 text-sm font-semibold text-[#062520] lg:self-auto">
            <Icon name="filter" size={13} />
            {translate('copy.explore.filterAll')}
            <span className="grid h-7 min-w-7 place-items-center rounded-md bg-(--aurora-cta-from) px-1.5 font-mono text-[10px] font-bold text-[#062520] tabular-nums">{masterPlans.length}</span>
          </span>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Input
              type="search"
              leftIcon="search"
              aria-label={translate('copy.explore.searchMaster')}
              placeholder={translate('copy.explore.searchMaster')}
              value={masterQuery}
              onChange={(event) => resetPageAnd(setMasterQuery)(event.target.value)}
            />
            <Input
              type="search"
              leftIcon="search"
              aria-label={translate('copy.explore.searchPlan')}
              placeholder={translate('copy.explore.searchPlan')}
              value={planQuery}
              onChange={(event) => resetPageAnd(setPlanQuery)(event.target.value)}
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        <div className="flex flex-col gap-3 border-t border-dashed border-line pt-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Risk tiers as volatility keys: a tier swatch, the label and its count. */}
          <div role="group" aria-label={translate('copy.explore.riskLabel')} className="flex flex-wrap items-center gap-1">
            <span className={cx(captionClass, 'pr-2')}>{translate('copy.explore.riskLabel')}</span>
            {riskTiers.map((option) => {
              const isActive = riskTier === option.tier;
              const tierCount = masterPlans.filter((plan) => matchesRiskTier[option.tier](plan.risk)).length;
              return (
                <button
                  key={option.tier}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => resetPageAnd(setRiskTier)(option.tier)}
                  className={cx(
                    'relative flex h-9 items-center gap-2 rounded-md pr-1.5 pl-3 text-sm font-semibold ring-1 transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-fg/[0.08] text-fg ring-line-strong' : 'text-fg-muted ring-transparent hover:bg-fg/[0.05] hover:text-fg',
                  )}
                >
                  <span aria-hidden="true" className={cx('h-3 w-1 rounded-[1px]', option.dot)} />
                  {translate(option.labelKey)}
                  <span className={cx('grid h-6 min-w-6 place-items-center rounded px-1.5 font-mono text-[10px] font-bold tabular-nums', isActive ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/10 text-fg-subtle')}>
                    {tierCount}
                  </span>
                  {isActive && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-(--hero-buy)" />}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
            <Dropdown
              label={translate('copy.explore.timeLabel')}
              value={trackRecord}
              options={[
                { value: 'all', label: translate('copy.explore.time.all') },
                { value: '30', label: translate('copy.explore.time.30') },
                { value: '90', label: translate('copy.explore.time.90') },
              ]}
              onChange={(value) => resetPageAnd(setTrackRecord)(value as TrackRecord)}
              icon="calendar"
            />
            <Dropdown
              label={translate('copy.explore.sortLabel')}
              value={sortKey}
              options={[
                { value: 'gain', label: translate('copy.explore.sort.gain') },
                { value: 'drawdown', label: translate('copy.explore.sort.drawdown') },
                { value: 'pnl', label: translate('copy.explore.sort.pnl') },
                { value: 'copiers', label: translate('copy.explore.sort.copiers') },
                { value: 'fee', label: translate('copy.explore.sort.fee') },
              ]}
              onChange={(value) => resetPageAnd(setSortKey)(value as SortKey)}
              icon="arrowsUpDown"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        {pageItems.length === 0 ? (
          <EmptyBoard />
        ) : view === 'grid' ? (
          <div key={`grid-${currentPage}`} className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {pageItems.map((plan, index) => (
              <MasterCard key={plan.id} plan={plan} rank={firstIndex + index + 1} index={index} onCopy={setCopyPlan} />
            ))}
          </div>
        ) : (
          <RankedList key={`list-${currentPage}`} items={pageItems} firstRank={firstIndex + 1} onCopy={setCopyPlan} />
        )}

        <div className="flex flex-col items-center gap-3 border-t border-dashed border-line pt-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-fg-muted" aria-live="polite">
            {translate('copy.explore.showing')}{' '}
            <span className="font-semibold text-fg tabular-nums">
              {rangeStart}
              {'\u2013'}
              {rangeEnd}
            </span>{' '}
            {translate('copy.explore.of')} <span className="font-semibold text-fg tabular-nums">{filteredPlans.length}</span>
          </p>
          <div className="flex items-center gap-1 rounded-lg p-1 ring-1 ring-line">
            <PagerButton labelKey="copy.explore.firstPage" symbol={'\u00AB'} disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton labelKey="copy.explore.prevPage" symbol={'\u2039'} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('copy.explore.page')}
              <span className="grid size-7 place-items-center rounded-md bg-(--hero-buy) font-mono font-bold text-[#062520] tabular-nums">{currentPage}</span>/ {pageCount}
            </span>
            <PagerButton labelKey="copy.explore.nextPage" symbol={'\u203A'} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton labelKey="copy.explore.lastPage" symbol={'\u00BB'} disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </div>

      {copyPlan && (
        <StartCopyModal
          key={copyPlan.id}
          plan={{ name: copyPlan.name, feePercent: copyPlan.feePercent, minInvestment: copyPlan.minInvestment, minInvestmentLabel: minInvestmentLabel(copyPlan) }}
          onClose={() => setCopyPlan(null)}
        />
      )}
    </div>
  );
}
