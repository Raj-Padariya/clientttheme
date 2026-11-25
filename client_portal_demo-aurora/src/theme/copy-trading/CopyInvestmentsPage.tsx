'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';
import '../promotion/market.css';

interface SnapshotStat {
  key: string;
  icon: IconName;
  labelKey: MessageKey;
  captionKey: MessageKey;
  value: number;
  format: (current: number) => string;
}

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const formatCount = (current: number) => String(Math.round(current));

const snapshotStats: SnapshotStat[] = [
  { key: 'copied', icon: 'wallet', labelKey: 'copy.invest.totalCopied', captionKey: 'copy.invest.yourCapital', value: 0, format: formatUsd },
  { key: 'pnl', icon: 'trendUp', labelKey: 'copy.invest.totalPnl', captionKey: 'copy.invest.allTime', value: 0, format: formatUsd },
  { key: 'balance', icon: 'pieChart', labelKey: 'copy.invest.netBalance', captionKey: 'copy.invest.currentValue', value: 0, format: formatUsd },
  { key: 'masters', icon: 'copy', labelKey: 'copy.invest.activeCopies', captionKey: 'copy.invest.mastersFollowed', value: 0, format: formatCount },
];

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';

const HEADER_BARS = 14;
const VOLUME_BARS = 36;
const EMPTY_SEATS = 5;
const GHOST_ROWS = 4;

/* Vertical order route (SVG units): square cells from the master down to your seat; copied trades travel down it as packets. */
const ROUTE = { width: 56, height: 220, x: 28, fromY: 8, toY: 212, cell: 5, gap: 12 };
const routePath = `M${ROUTE.x} ${ROUTE.fromY} V${ROUTE.toY}`;
const ROUTE_CELLS = Math.floor((ROUTE.toY - ROUTE.fromY) / ROUTE.gap) + 1;
const PACKETS = [
  { begin: '0s', isClay: true },
  { begin: '0.9s', isClay: false },
  { begin: '1.8s', isClay: false },
];

const blotterGrid = 'grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-4';
const blotterColumns: MessageKey[] = ['copy.invest.masterNode', 'copy.invest.totalCopied', 'copy.invest.totalPnl', 'copy.invest.netBalance'];

/* ───────────── Portfolio value: net balance on a flat equity line awaiting its first fill ───────────── */

function PortfolioPanel() {
  const [copied, pnl, balance, masters] = snapshotStats;

  return (
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name={balance.icon} size={14} />
            </span>
            {translate(balance.labelKey)}
          </p>
          <p className="mt-4 truncate font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
            <CountUp value={balance.value} format={balance.format} />
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-(--hero-buy) uppercase ring-1 ring-(--hero-buy)/40">
          <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-(--hero-buy)" />
          {translate(balance.captionKey)}
        </span>
      </div>

      {/* Equity window: a flat marching baseline, a scan cursor sweeping across it and idle volume underneath. */}
      <div aria-hidden="true" className="relative mx-5 h-40 overflow-hidden rounded-lg bg-fg/[0.03] ring-1 ring-line sm:mx-6">
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-0 size-full">
          {[24, 96].map((y) => (
            <line key={y} x1={0} x2={400} y1={y} y2={y} strokeDasharray="2 6" vectorEffect="non-scaling-stroke" className="stroke-fg/10" />
          ))}
          <line x1={0} x2={400} y1={60} y2={60} strokeDasharray="6 6" strokeWidth={2} vectorEffect="non-scaling-stroke" className="mkt-march stroke-(--hero-buy)/70" />
        </svg>
        <span className="mkt-flow absolute inset-y-0 w-px bg-(--hero-buy)/50">
          <span className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hero-buy) ring-4 ring-(--hero-buy)/20" />
        </span>
        <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-(--hero-buy) px-1.5 py-0.5 font-mono text-[10px] font-black text-[#062520] tabular-nums">
          {formatUsd(balance.value)}
        </span>
        <span className="absolute inset-x-1 bottom-0 flex h-7 items-end gap-[2px]">
          {Array.from({ length: VOLUME_BARS }, (_, index) => (
            <span key={index} style={{ height: `${25 + ((index * 41) % 75)}%`, '--vol-delay': `${(index % 6) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-t-[1px] bg-fg/10" />
          ))}
        </span>
      </div>

      <dl className="mt-5 grid border-t border-dashed border-line sm:grid-cols-3">
        {[copied, pnl, masters].map((stat, index) => (
          <div
            key={stat.key}
            style={staggerStyle(index, 160)}
            className="group/stat flex min-w-0 animate-feed-in flex-col gap-2 border-b border-dashed border-line p-5 last:border-b-0 motion-reduce:animate-none sm:border-b-0 sm:not-first:border-l"
          >
            <dt className="flex items-center gap-2">
              <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/stat:-rotate-12 motion-reduce:transition-none')}>
                <Icon name={stat.icon} size={13} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-fg">{translate(stat.labelKey)}</span>
                <span className={cx(captionClass, 'block truncate')}>{translate(stat.captionKey)}</span>
              </span>
            </dt>
            <dd className="truncate font-mono text-3xl font-black tracking-tight text-fg tabular-nums">
              <CountUp value={stat.value} format={stat.format} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Order route: master → vertical route → you, with the empty copy seats ───────────── */

function RouteNode({ icon, labelKey, isSource }: { icon: IconName; labelKey: MessageKey; isSource: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="relative grid size-14 shrink-0 place-items-center">
        {isSource ? (
          <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
        ) : (
          <span className="absolute inset-0 rounded-xl border-2 border-dashed border-(--aurora-cta-from)/60" />
        )}
        <span className={cx('relative grid size-11 place-items-center rounded-lg', isSource ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.04] text-fg-muted ring-1 ring-line-strong')}>
          <Icon name={icon} size={18} />
        </span>
      </span>
      <span className={cx(captionClass, 'text-fg')}>{translate(labelKey)}</span>
    </span>
  );
}

function RoutePanel() {
  return (
    <section aria-hidden="true" style={staggerStyle(2, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-3 p-5 motion-reduce:animate-none sm:p-6')}>
      <RouteNode icon="trophy" labelKey="copy.invest.masterNode" isSource />

      <div className="flex items-stretch gap-5">
        <span className="relative w-14 shrink-0">
          <svg viewBox={`0 0 ${ROUTE.width} ${ROUTE.height}`} className="h-48 w-14">
            {Array.from({ length: ROUTE_CELLS }, (_, index) => (
              <rect
                key={index}
                x={ROUTE.x - ROUTE.cell / 2}
                y={ROUTE.fromY + index * ROUTE.gap - ROUTE.cell / 2}
                width={ROUTE.cell}
                height={ROUTE.cell}
                rx="1"
                className="fill-line-strong"
              />
            ))}
            <g className="motion-reduce:hidden">
              {PACKETS.map((packet) => (
                <rect key={packet.begin} x="-6" y="-6" width="12" height="12" rx="2.5" className={packet.isClay ? 'fill-(--aurora-cta-from)' : 'fill-(--hero-buy)'}>
                  <animateMotion dur="2.7s" begin={packet.begin} repeatCount="indefinite" path={routePath} />
                </rect>
              ))}
            </g>
          </svg>
          <span className={cx(beadClass, 'absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 bg-surface ring-4 ring-surface')}>
            <span className="grid animate-float place-items-center [animation-duration:3s] motion-reduce:animate-none">
              <Icon name="copy" size={15} />
            </span>
          </span>
        </span>

        {/* Copy seats: empty slots waiting for a master, each with its own ripple. */}
        <span className="flex flex-1 flex-col justify-center gap-2 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-line">
          {Array.from({ length: EMPTY_SEATS }, (_, index) => (
            <span key={index} className="flex items-center gap-3">
              <span className="relative grid size-7 shrink-0 place-items-center">
                <span style={{ animationDelay: `${index * 400}ms` }} className="absolute inset-0 animate-ring-ripple rounded-md border border-line-strong motion-reduce:hidden" />
                <span className="size-4 rounded-[4px] border border-dashed border-line-strong" />
              </span>
              <span className="h-px flex-1 border-t border-dashed border-line-strong" />
            </span>
          ))}
          <span className="mt-1 grid size-8 place-items-center self-end rounded-md bg-(--aurora-cta-from) text-[#062520]">
            <Icon name="copy" size={12} />
          </span>
        </span>
      </div>

      <RouteNode icon="user" labelKey="copy.invest.youNode" isSource={false} />
    </section>
  );
}

/* ───────────── Holdings blotter: ghost rows under the empty-state call to action ───────────── */

function HoldingsBlotter() {
  return (
    <section style={staggerStyle(3, 140)} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
      <div aria-hidden="true" className={cx(blotterGrid, 'border-b border-dashed border-line px-5 py-3 sm:px-6')}>
        {blotterColumns.map((key, index) => (
          <span key={key} className={cx(captionClass, 'truncate', index > 0 && 'text-right')}>
            {translate(key)}
          </span>
        ))}
      </div>

      <div className="grid">
        <ul aria-hidden="true" className="col-start-1 row-start-1 flex flex-col">
          {Array.from({ length: GHOST_ROWS }, (_, row) => (
            <li key={row} style={{ opacity: 1 - row * 0.2 }} className={cx(blotterGrid, 'border-b border-dashed border-line px-5 py-5 last:border-b-0 sm:px-6')}>
              <span className="flex items-center gap-3">
                <span className="size-9 shrink-0 rounded-lg bg-fg/[0.06]" />
                <span className="h-2.5 w-28 max-w-full rounded-full bg-fg/[0.08]" />
              </span>
              {[0, 1, 2].map((cell) => (
                <span key={cell} className="ml-auto h-2.5 w-16 max-w-full rounded-full bg-fg/[0.06]" />
              ))}
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className="pointer-events-none relative col-start-1 row-start-1 block overflow-hidden">
          <span className="mkt-sweep absolute inset-y-0 w-24 -skew-x-12 bg-white/[0.05]" />
        </span>

        <div className="relative z-10 col-start-1 row-start-1 grid place-items-center p-5">
          <div className="flex max-w-lg flex-col items-center gap-3 rounded-xl bg-surface/90 px-6 py-8 text-center ring-1 ring-line backdrop-blur-sm">
            <p className="inline-flex items-center gap-2 rounded-md bg-(--hero-buy) py-1 pr-3 pl-2 text-xs font-semibold text-[#062520]">
              <LiveDot />
              {translate('copy.invest.leaderboardLive')}
            </p>
            <h2 className="text-3xl font-black tracking-tight text-fg sm:text-4xl">{translate('copy.invest.emptyTitle')}</h2>
            <p className="max-w-md text-sm leading-relaxed text-fg-muted">{translate('copy.invest.emptyText')}</p>
            <Link
              href="/copy-trading/masters"
              className="group/explore relative mt-2 inline-flex h-12 items-center gap-3 overflow-hidden rounded-lg bg-(--hero-buy) py-1 pr-1 pl-5 text-sm font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
              <span className="relative">{translate('copy.invest.explore')}</span>
              <span aria-hidden="true" className="relative grid size-10 place-items-center rounded-md bg-(--aurora-cta-from) text-[#062520] transition-transform duration-300 group-hover/explore:translate-x-0.5 motion-reduce:transition-none">
                <Icon name="arrowRight" size={15} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Skeleton: title with live volume, portfolio value terminal beside the vertical order route, then the holdings blotter with its call to action.
export default function CopyInvestmentsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="min-w-0">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-(--aurora-cta-from)" />
            {translate('nav.copyTrading')}
          </p>
          <h1 className="mt-2 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyInvestments')}</h1>
        </div>
        <span aria-hidden="true" className="flex h-10 items-end gap-[3px]">
          {Array.from({ length: HEADER_BARS }, (_, index) => (
            <span
              key={index}
              style={{ height: `${30 + ((index * 29) % 70)}%`, '--vol-delay': `${(index % 5) * 0.18}s` } as CSSProperties}
              className={cx('mkt-vol w-1.5 rounded-t-[1px]', index % 4 === 3 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)/70')}
            />
          ))}
        </span>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <PortfolioPanel />
        <RoutePanel />
      </div>

      <HoldingsBlotter />
    </div>
  );
}
