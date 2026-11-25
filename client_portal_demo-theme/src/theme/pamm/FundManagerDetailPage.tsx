'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState, type PointerEvent, type ReactNode } from 'react';
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
const CHART = { width: 760, height: 330, left: 58, right: 28, top: 48, bottom: 34 };

const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const tradeTime = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });

function signedMoney(value: number) {
  return `${value > 0 ? '+' : ''}${formatMoney(value, 'USD')}`;
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

function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
}

function Spotlight() {
  return (
    <span
      aria-hidden="true"
      style={{ background: 'radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--brand-primary) 18%, transparent), transparent 70%)' }}
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
    />
  );
}

function RangePills({ value, onChange }: { value: RangeId; onChange: (range: RangeId) => void }) {
  const index = RANGES.findIndex((range) => range.id === value);
  return (
    <div role="tablist" aria-label={text.performanceOverview} className="relative grid grid-cols-6 rounded-full bg-surface-2 p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 8px) / ${RANGES.length})`, transform: `translateX(${index * 100}%)` }}
        className="absolute top-1 bottom-1 left-1 rounded-full bg-primary shadow-[0_6px_18px_-6px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none"
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
            range.id === value ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
          )}
        >
          {range.id}
        </button>
      ))}
    </div>
  );
}

function ManagerMonogram({ name }: { name: string }) {
  return (
    <span className="relative grid size-24 shrink-0 place-items-center">
      <span aria-hidden="true" className="absolute -inset-1.5 animate-ring-breathe rounded-[30px] bg-primary/15 blur-md motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute inset-0 rotate-45 animate-[orbit_14s_linear_infinite] rounded-[26px] ring-1 ring-primary/40 motion-reduce:animate-none" />
      <span className="relative grid size-20 place-items-center rounded-3xl bg-linear-to-br from-primary/30 via-elevated to-elevated text-3xl font-bold tracking-tight text-primary ring-1 ring-primary/40">
        {initials(name)}
      </span>
      <span className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full bg-primary text-on-primary ring-4 ring-surface">
        <Icon name="checkCircle" size={14} />
      </span>
    </span>
  );
}

function RiskBars({ risk }: { risk: number }) {
  return (
    <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
      {Array.from({ length: RISK_LEVELS }, (_, index) => (
        <span
          key={index}
          style={{ height: `${36 + index * 16}%`, animationDelay: `${400 + index * 90}ms` }}
          className={cx('w-1.5 origin-bottom animate-bar-rise rounded-sm motion-reduce:animate-none', index < risk ? 'bg-success' : 'bg-fg/15')}
        />
      ))}
    </span>
  );
}

function FundHero({ detail, onInvest }: { detail: FundDetail; onInvest: () => void }) {
  return (
    <section className="kpi-card relative animate-rise overflow-hidden rounded-2xl motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/3 size-96 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-20 size-80 animate-glow rounded-full bg-warning/10 blur-3xl motion-reduce:animate-none" />

      <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-5">
            <ManagerMonogram name={detail.manager} />
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-3xl font-bold tracking-tight text-transparent motion-reduce:animate-none sm:text-4xl">
                {detail.planName}
              </h2>
              <p className="text-sm text-fg-muted">
                {text.by} <span className="font-semibold text-fg">{detail.manager}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-primary px-2 py-0.5 font-bold tracking-wider text-on-primary">{text.fundManager}</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-fg-muted ring-1 ring-line">
                  <LiveDot />
                  {text.memberSince(detail.memberSince)}
                </span>
              </div>
            </div>
          </div>

          <div style={staggerStyle(2, 150)} className="relative flex animate-rise items-center gap-4 overflow-hidden rounded-xl bg-warning-soft/60 p-4 ring-1 ring-warning/30 motion-reduce:animate-none">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-warning" />
            <span className="relative grid size-10 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
              <span className="relative grid size-10 place-items-center rounded-full bg-warning text-on-primary">
                <Icon name="alert" size={18} />
              </span>
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-fg-subtle">{text.strategyDescription}</p>
              <p className="mt-0.5 text-lg font-bold tracking-wide text-warning">{detail.strategy}</p>
            </div>
          </div>
        </div>

        <div style={staggerStyle(1, 150)} className="glow-border relative flex animate-rise flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-surface/70 p-5 backdrop-blur motion-reduce:animate-none">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-bold tracking-wider text-success">
              <RiskBars risk={detail.risk} />
              {text.risk} {detail.risk}
            </span>
            <span className="text-[11px] tabular-nums text-fg-subtle">
              {detail.risk}/{RISK_LEVELS}
            </span>
          </div>
          <div className="relative">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle">{text.minInvestmentLabel}</p>
            <p className="text-4xl font-semibold tracking-tight tabular-nums text-fg">
              <CountUp value={detail.minInvestment} format={(value) => compactUsd.format(Math.round(value))} />
            </p>
          </div>
          <div className="relative flex flex-col gap-2">
            <Button fullWidth aria-haspopup="dialog" onClick={onInvest} className="group/invest relative overflow-hidden">
              <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/invest:translate-x-full motion-reduce:hidden" />
              <span className="relative font-bold tracking-wider">{text.investNow}</span>
              <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/invest:translate-x-1" />
            </Button>
            <p className="text-center text-[11px] tracking-wide text-fg-subtle">{text.minInvestment(compactUsd.format(detail.minInvestment))}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface LedgerItem {
  key: string;
  icon: IconName;
  label: string;
  value: number;
  format: (value: number) => string;
  tone: string;
  isLive?: boolean;
}

function FundLedger({ detail }: { detail: FundDetail }) {
  const items: LedgerItem[] = [
    { key: 'gain', icon: 'trendUp', label: text.avgGain, value: detail.avgGain, format: formatPercent, tone: 'text-success' },
    { key: 'pnl', icon: 'pieChart', label: text.totalPnl, value: detail.totalPnl, format: (value) => compactUsd.format(value), tone: 'text-fg' },
    { key: 'investors', icon: 'user', label: text.investors, value: detail.investors, format: (value) => String(Math.round(value)), tone: 'text-fg' },
    { key: 'commission', icon: 'card', label: text.commission, value: detail.commissionPercent, format: (value) => `${Math.round(value)}%`, tone: 'text-primary' },
    { key: 'floating', icon: 'wallet', label: text.floatingProfit, value: detail.floatingProfit, format: (value) => compactUsd.format(value), tone: 'text-success', isLive: true },
    { key: 'drawdown', icon: 'trendDown', label: text.maxDrawdown, value: detail.maxDrawdown, format: (value) => formatMoney(value, 'USD'), tone: 'text-danger' },
  ];

  return (
    <aside style={staggerStyle(2, 140)} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
      <div onPointerMove={trackSpotlight} className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/25 via-surface to-surface p-5 ring-1 ring-primary/30 shadow-card">
        <Spotlight />
        <span aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-8 text-[120px] leading-none font-black text-primary/[0.07] select-none">$</span>
        <p className="relative flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-fg-subtle">
          <Icon name="bank" size={14} className="text-primary" />
          {text.totalAum}
        </p>
        <p className="relative mt-1 animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-4xl font-semibold tracking-tight tabular-nums text-transparent motion-reduce:animate-none">
          <CountUp value={detail.totalAum} format={(value) => compactUsd.format(value)} />
        </p>
        <span aria-hidden="true" className="relative mt-3 block h-px origin-left animate-grow bg-linear-to-r from-primary to-transparent motion-reduce:animate-none" />
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {items.map((item, index) => (
          <li
            key={item.key}
            onPointerMove={trackSpotlight}
            style={staggerStyle(index + 3, 90)}
            className="group relative animate-rise overflow-hidden rounded-xl border border-line bg-surface p-3.5 shadow-card transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:animate-none"
          >
            <Spotlight />
            <div className="relative flex items-center justify-between">
              <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary transition-transform duration-300 group-hover:-rotate-12">
                <Icon name={item.icon} size={14} />
              </span>
              {item.isLive && <LiveDot />}
            </div>
            <p className="relative mt-2.5 truncate text-[10px] font-semibold tracking-[0.14em] text-fg-subtle">{item.label}</p>
            <p className={cx('relative text-lg font-semibold tracking-tight tabular-nums', item.tone)}>
              <CountUp value={item.value} format={item.format} />
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function EquityChart({ trades }: { trades: FundTrade[] }) {
  const uid = useSvgId();
  const isMounted = useMounted();
  const [hovered, setHovered] = useState<number | null>(null);
  const ids = { area: `${uid}a`, line: `${uid}l`, glow: `${uid}g`, band: `${uid}b` };

  const equity = [0, ...runningTotals(trades)];
  const yMax = Math.max(Y_STEP, Math.ceil(Math.max(...equity) / Y_STEP) * Y_STEP);
  const yMin = Math.min(0, Math.floor(Math.min(...equity) / Y_STEP) * Y_STEP);
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const xAt = (index: number) => CHART.left + (index / (equity.length - 1)) * plotWidth;
  const yAt = (value: number) => CHART.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const yTicks = Array.from({ length: (yMax - yMin) / Y_STEP + 1 }, (_, index) => yMin + index * Y_STEP);

  const points = equity.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C${midX},${previous.y} ${midX},${point.y} ${point.x},${point.y}`;
  }, '');
  const zeroY = yAt(0);
  const areaPath = `${linePath} L${points.at(-1)?.x},${zeroY} L${points[0].x},${zeroY} Z`;
  const drawdown = deepestDrawdown(equity);
  const last = points.at(-1);
  const drawMs = 1500;
  const nodeDelay = (index: number) => 200 + (drawMs * index) / Math.max(1, points.length - 1);

  const active = hovered === null ? null : { index: hovered, point: points[hovered], value: equity[hovered], trade: hovered === 0 ? null : trades[hovered - 1] };
  const tooltipLeft = active ? Math.min(84, Math.max(16, (active.point.x / CHART.width) * 100)) : 0;
  const tooltipBelow = active ? active.point.y / CHART.height < 0.35 : false;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={`${text.equity}: ${formatMoney(equity.at(-1) ?? 0, 'USD')}`} onPointerLeave={() => setHovered(null)}>
          <defs>
            <linearGradient id={ids.area} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.42" />
              <stop offset="70%" stopColor="var(--brand-primary)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={ids.line} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--brand-primary)" />
            </linearGradient>
            <linearGradient id={ids.band} x1="0" x2="0" y1="0" y2="1" className="text-danger">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.02" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
            </linearGradient>
            <filter id={ids.glow} x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={CHART.left} x2={CHART.width - CHART.right} y1={yAt(tick)} y2={yAt(tick)} className={tick === 0 ? 'stroke-line-strong' : 'stroke-line/50'} strokeDasharray={tick === 0 ? undefined : '1 6'} strokeLinecap="round" />
              <text x={CHART.left - 10} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" className="fill-fg-subtle text-[10px] tabular-nums">
                ${tick}
              </text>
            </g>
          ))}

          {drawdown && (
            <g style={{ opacity: isMounted ? 1 : 0, transition: `opacity 600ms ease ${200 + drawMs}ms` }}>
              <rect
                x={xAt(drawdown.peak)}
                y={yAt(equity[drawdown.peak])}
                width={xAt(drawdown.trough) - xAt(drawdown.peak)}
                height={yAt(equity[drawdown.trough]) - yAt(equity[drawdown.peak])}
                fill={`url(#${ids.band})`}
              />
              <line x1={xAt(drawdown.peak)} x2={xAt(drawdown.trough)} y1={yAt(equity[drawdown.peak])} y2={yAt(equity[drawdown.peak])} strokeDasharray="4 4" className="stroke-danger/60" />
              <line x1={xAt(drawdown.peak)} x2={xAt(drawdown.peak)} y1={yAt(equity[drawdown.peak])} y2={yAt(equity[drawdown.trough])} strokeWidth="1.5" className="stroke-danger/70" />
              <line x1={xAt(drawdown.peak) - 5} x2={xAt(drawdown.peak) + 5} y1={yAt(equity[drawdown.trough])} y2={yAt(equity[drawdown.trough])} strokeWidth="1.5" className="stroke-danger/70" />
              <text x={xAt(drawdown.peak) + 12} y={yAt(equity[drawdown.trough]) - 22} className="fill-danger/80 text-[9px] font-semibold tracking-[0.14em]">
                {text.maxDrawdown}
              </text>
              <text x={xAt(drawdown.peak) + 12} y={yAt(equity[drawdown.trough]) - 8} className="fill-danger text-[13px] font-bold tabular-nums">
                {formatMoney(drawdown.amount, 'USD')}
              </text>
            </g>
          )}

          <path d={areaPath} fill={`url(#${ids.area})`} style={{ opacity: isMounted ? 1 : 0, transition: `opacity 1000ms ease ${200 + drawMs / 2}ms` }} />
          <path
            d={linePath}
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeWidth={3.5}
            strokeLinecap="round"
            stroke={`url(#${ids.line})`}
            filter={`url(#${ids.glow})`}
            style={{ strokeDashoffset: isMounted ? 0 : 1, transition: `stroke-dashoffset ${drawMs}ms cubic-bezier(.4,0,.2,1) 200ms` }}
          />
          {/* A short bright dash running along the curve; the long gap keeps only one dash on screen. */}
          <path d={linePath} fill="none" pathLength={1} strokeDasharray="0.07 2" strokeWidth={5} strokeLinecap="round" className="stroke-fg/80 motion-reduce:hidden" strokeDashoffset={0.07}>
            <animate attributeName="stroke-dashoffset" values="0.07;-1" dur="3.2s" begin="2s" repeatCount="indefinite" />
          </path>

          {points.map((point, index) => {
            const trade = index === 0 ? null : trades[index - 1];
            const isHovered = hovered === index;
            const label = trade ? signedMoney(trade.pnl) : null;
            const pillWidth = label ? label.length * 6.6 + 18 : 0;
            return (
              <g key={trade?.id ?? 'start'}>
                {trade && label && (
                  <g style={{ opacity: isMounted ? 1 : 0, transform: `translateY(${isMounted ? 0 : 8}px)`, transition: `opacity 400ms ease ${nodeDelay(index)}ms, transform 500ms cubic-bezier(.2,.9,.3,1.4) ${nodeDelay(index)}ms` }}>
                    <line x1={point.x} x2={point.x} y1={point.y - 8} y2={point.y - 18} className={trade.pnl >= 0 ? 'stroke-success/60' : 'stroke-danger/60'} />
                    <rect x={point.x - pillWidth / 2} y={point.y - 40} width={pillWidth} height={22} rx={11} className={cx(trade.pnl >= 0 ? 'fill-success-soft stroke-success/50' : 'fill-danger-soft stroke-danger/50', isHovered && 'stroke-2')} />
                    <text x={point.x} y={point.y - 28.5} textAnchor="middle" dominantBaseline="middle" className={cx('text-[11px] font-bold tabular-nums', trade.pnl >= 0 ? 'fill-success' : 'fill-danger')}>
                      {label}
                    </text>
                  </g>
                )}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 8 : 5.5}
                  strokeWidth={2.5}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${nodeDelay(index)}ms` }}
                  className="animate-dot-pop fill-elevated stroke-primary transition-[r] motion-reduce:animate-none"
                />
              </g>
            );
          })}

          {last && (
            <g pointerEvents="none" className="motion-reduce:hidden">
              <circle cx={last.x} cy={last.y} r="6" className="fill-primary/40">
                <animate attributeName="r" values="6;22" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {points.map((point, index) => (
            <g key={`x${index}`}>
              <text x={point.x} y={CHART.height - 10} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="fill-fg-subtle text-[10px]">
                {index === 0 ? text.start : shortDate.format(trades[index - 1].time)}
              </text>
              <rect
                x={index === 0 ? CHART.left : (points[index - 1].x + point.x) / 2}
                y={CHART.top - 40}
                width={(index === points.length - 1 ? CHART.width - CHART.right : (point.x + points[index + 1].x) / 2) - (index === 0 ? CHART.left : (points[index - 1].x + point.x) / 2)}
                height={plotHeight + 40}
                fill="transparent"
                onPointerEnter={() => setHovered(index)}
              />
            </g>
          ))}

          {active && (
            <g pointerEvents="none">
              <line x1={active.point.x} x2={active.point.x} y1={CHART.top} y2={zeroY} className="stroke-primary/60" strokeDasharray="3 4" />
              <line x1={CHART.left} x2={active.point.x} y1={active.point.y} y2={active.point.y} className="stroke-primary/30" strokeDasharray="3 4" />
              <rect x={2} y={active.point.y - 10} width={CHART.left - 6} height={20} rx={6} className="fill-primary" />
              <text x={(CHART.left - 4) / 2 + 2} y={active.point.y} textAnchor="middle" dominantBaseline="middle" className="fill-on-primary text-[10px] font-bold tabular-nums">
                {compactUsd.format(active.value)}
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
            'pointer-events-none absolute z-10 w-56 -translate-x-1/2 animate-fade-quick rounded-xl border border-primary/30 bg-elevated/90 p-3 text-xs shadow-pop backdrop-blur-md motion-reduce:animate-none',
            tooltipBelow ? 'translate-y-5' : '-translate-y-[calc(100%+56px)]',
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
            <span className="font-semibold tabular-nums text-primary">{formatMoney(active.value, 'USD')}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function Panel({ title, aside, delayIndex, children }: { title: string; aside?: ReactNode; delayIndex: number; children: ReactNode }) {
  return (
    <section style={staggerStyle(delayIndex, 140)} className="animate-rise rounded-2xl border border-line bg-surface shadow-card motion-reduce:animate-none">
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

function TradeTimeline({ trades }: { trades: FundTrade[] }) {
  const totals = runningTotals(trades);
  return (
    <ol className="relative grid gap-4 p-5 md:grid-cols-3">
      <span aria-hidden="true" className="absolute top-[38px] right-[16%] left-[16%] hidden h-0.5 origin-left animate-grow bg-linear-to-r from-primary/20 via-primary to-primary/20 motion-reduce:animate-none md:block" />
      {trades.map((trade, index) => {
        const isGain = trade.pnl >= 0;
        const fields = [
          { label: text.time, value: tradeTime.format(trade.time) },
          { label: text.duration, value: `${trade.durationMinutes}m` },
        ];
        return (
          <li key={trade.id} style={staggerStyle(index, 160)} className="relative flex animate-rise flex-col items-center gap-3 motion-reduce:animate-none">
            <span className="relative z-10 grid size-9 place-items-center rounded-full bg-elevated text-xs font-bold tabular-nums text-primary ring-2 ring-primary shadow-[0_0_18px_-4px_var(--brand-primary)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <article
              onPointerMove={trackSpotlight}
              className={cx(
                'group relative w-full overflow-hidden rounded-2xl bg-surface-2/60 p-4 ring-1 transition-[translate,box-shadow] duration-300 hover:-translate-y-1',
                isGain ? 'ring-success/25 hover:shadow-[0_22px_40px_-26px_var(--color-success)]' : 'ring-danger/25 hover:shadow-[0_22px_40px_-26px_var(--color-danger)]',
              )}
            >
              <Spotlight />
              <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-0.5', isGain ? 'bg-success' : 'bg-danger')} />
              <div className="relative flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] tracking-wide text-fg-subtle uppercase">{text.symbol}</p>
                  <p className="font-semibold text-fg">{trade.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] tracking-wide text-fg-subtle uppercase">{text.type}</p>
                  <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold', trade.type === 'BUY' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    <Icon name={trade.type === 'BUY' ? 'trendUp' : 'trendDown'} size={12} />
                    {trade.type}
                  </span>
                </div>
              </div>
              <p className="relative mt-3 text-[10px] tracking-wide text-fg-subtle uppercase">{text.pnl}</p>
              <p className={cx('relative text-3xl font-semibold tracking-tight tabular-nums', isGain ? 'text-success' : 'text-danger')}>
                <CountUp value={trade.pnl} format={signedMoney} />
              </p>
              <p className="relative mt-1 text-xs text-fg-muted">
                {text.equity} <span className="font-semibold tabular-nums text-primary">{formatMoney(totals[index], 'USD')}</span>
              </p>
              <dl className="relative mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-dashed border-line-strong pt-3">
                {fields.map((field) => (
                  <div key={field.label} className="last:text-right">
                    <dt className="text-[10px] tracking-wide text-fg-subtle uppercase">{field.label}</dt>
                    <dd className="mt-0.5 text-xs font-medium tabular-nums text-fg">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

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
      <FundHero detail={detail} onInvest={() => setIsInvestOpen(true)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel delayIndex={1} title={text.performanceOverview} aside={<RangePills value={range} onChange={setRange} />}>
          <div className="p-5 pt-3">
            {chartTrades.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <span className="grid size-12 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
                  <Icon name="trendUp" size={20} />
                </span>
                <p className="text-sm text-fg-muted">{text.noTrades}</p>
              </div>
            ) : (
              <EquityChart key={range} trades={chartTrades} />
            )}
          </div>
        </Panel>
        <FundLedger detail={detail} />
      </div>

      <Panel
        delayIndex={3}
        title={text.recentTrades}
        aside={<span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/30">{text.tradeCount(detail.trades.length)}</span>}
      >
        <TradeTimeline trades={chronological} />
      </Panel>

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
        className="group inline-flex items-center gap-2 self-start rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="arrowRight" size={15} className="rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
        {text.back}
      </Link>
      {plan && detail ? (
        <FundDashboard planId={plan.id} detail={detail} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-card">
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
