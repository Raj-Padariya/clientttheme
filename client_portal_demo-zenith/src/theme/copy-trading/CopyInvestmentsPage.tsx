'use client';

import Link from 'next/link';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';

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

const RED = 'var(--zenith-red)';
const LEAD_PIXELS = 48;
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';

/* Pixel track geometry (SVG units): square cells from the master to your seat; copied trades travel along it as square packets. */
const TRACK = { width: 420, height: 40, fromX: 8, toX: 412, y: 20, cell: 5, gap: 12 };
const trackPath = `M${TRACK.fromX} ${TRACK.y} H${TRACK.toX}`;
const TRACK_CELLS = Math.floor((TRACK.toX - TRACK.fromX) / TRACK.gap) + 1;
const PACKETS = [
  { begin: '0s', isRed: true },
  { begin: '0.9s', isRed: false },
  { begin: '1.8s', isRed: false },
];
const EMPTY_SEATS = 5;

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/* ───────────── Snapshot strip: open lead figure + three open columns ───────────── */

function SnapshotStrip() {
  const [lead, ...rest] = snapshotStats;
  return (
    <section style={staggerStyle(1, 140)} className="zenith-tile grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:items-end">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name={lead.icon} size={14} />
            </span>
            {translate(lead.labelKey)}
          </p>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-fg uppercase ring-1 ring-line-strong">{translate(lead.captionKey)}</span>
        </div>
        <p className="mt-4 truncate text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
          <CountUp value={lead.value} format={lead.format} />
        </p>
        {/* Pixel field under the figure: cells twinkle in a scattered order, one red cell blinking. */}
        <div aria-hidden="true" className="mt-5 grid grid-cols-16 gap-1">
          {Array.from({ length: LEAD_PIXELS }, (_, index) => (
            <span
              key={index}
              style={{ animationDelay: `${(index * 173) % 2400}ms`, ...(index === 26 ? { background: RED } : {}) }}
              className={cx('h-2.5 rounded-[2px]', index === 26 ? 'animate-pulse' : 'zenith-twinkle bg-fg/15')}
            />
          ))}
        </div>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3 sm:gap-0">
        {rest.map((stat, index) => (
          <div
            key={stat.key}
            style={staggerStyle(index + 1, 160)}
            className="group/stat flex min-w-0 animate-feed-in flex-col gap-3 rounded-[22px] bg-fg/[0.03] p-4 ring-1 ring-line motion-reduce:animate-none sm:rounded-none sm:bg-transparent sm:py-1 sm:ring-0 sm:not-first:border-l sm:not-first:border-line sm:first:pl-0"
          >
            <dt className="flex items-center gap-2">
              <span aria-hidden="true" className="w-5 font-mono text-[10px] font-bold text-[var(--zenith-red)]">
                {stepNumber(index + 1)}
              </span>
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

/* ───────────── Copy route: master → pixel track → you, with empty seats ───────────── */

function RouteBead({ icon, labelKey, isSource }: { icon: IconName; labelKey: MessageKey; isSource: boolean }) {
  return (
    <span className="flex flex-col items-center gap-2">
      <span className="relative grid size-18 place-items-center">
        {isSource ? (
          <>
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/35 motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
            </span>
          </>
        ) : (
          <span aria-hidden="true" style={{ borderColor: RED }} className="absolute inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
        )}
        <span className={cx('relative grid size-13 place-items-center rounded-full', isSource ? 'bg-fg text-app' : 'border-2 border-dashed border-line-strong bg-surface text-fg-muted')}>
          <Icon name={icon} size={20} />
        </span>
      </span>
      <span className={captionClass}>{translate(labelKey)}</span>
    </span>
  );
}

function CopyRoute() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <RouteBead icon="trophy" labelKey="copy.invest.masterNode" isSource />
        <div className="relative mt-5 min-w-0 flex-1">
          <svg viewBox={`0 0 ${TRACK.width} ${TRACK.height}`} className="h-auto w-full">
            {Array.from({ length: TRACK_CELLS }, (_, index) => (
              <rect
                key={index}
                x={TRACK.fromX + index * TRACK.gap - TRACK.cell / 2}
                y={TRACK.y - TRACK.cell / 2}
                width={TRACK.cell}
                height={TRACK.cell}
                rx="1"
                className="fill-line-strong"
              />
            ))}
            <g className="motion-reduce:hidden">
              {PACKETS.map((packet) => (
                <rect key={packet.begin} x="-6" y="-6" width="12" height="12" rx="2.5" style={packet.isRed ? { fill: RED } : undefined} className={packet.isRed ? undefined : 'fill-fg'}>
                  <animateMotion dur="2.7s" begin={packet.begin} repeatCount="indefinite" path={trackPath} />
                </rect>
              ))}
            </g>
          </svg>
          <span className={cx(beadClass, 'absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 ring-4 ring-app')}>
            <span className="grid animate-float place-items-center [animation-duration:3s] motion-reduce:animate-none">
              <Icon name="copy" size={15} />
            </span>
          </span>
        </div>
        <RouteBead icon="user" labelKey="copy.invest.youNode" isSource={false} />
      </div>

      <div className="flex items-center gap-3 rounded-full bg-fg/[0.03] py-2 pr-2 pl-4 ring-1 ring-line">
        <span className="flex flex-1 items-center justify-between gap-1.5">
          {Array.from({ length: EMPTY_SEATS }, (_, index) => (
            <span key={index} className="relative grid size-8 place-items-center">
              <span style={{ animationDelay: `${index * 400}ms` }} className="absolute inset-0 animate-ring-ripple rounded-[9px] border border-line-strong motion-reduce:hidden" />
              <span className="size-5 rounded-[5px] border border-dashed border-line-strong" />
            </span>
          ))}
        </span>
        <span style={{ background: RED }} className="grid size-8 shrink-0 place-items-center rounded-full text-white">
          <Icon name="copy" size={12} />
        </span>
      </div>
    </div>
  );
}

// Skeleton: open title, full-width snapshot strip, then the empty-state call to action beside the copy route.
export default function CopyInvestmentsPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-end gap-4 border-b border-line pb-6">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="copy" size={16} />
          </span>
          <RedDot className="absolute top-0.5 right-0.5" />
        </span>
        <div className="min-w-0">
          <p className={captionClass}>{translate('nav.copyTrading')}</p>
          <h1 className="mt-1 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyInvestments')}</h1>
        </div>
      </header>

      <SnapshotStrip />

      <section style={staggerStyle(2, 140)} className="zenith-tile grid gap-10 border-t border-line pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-semibold text-app">
            <LiveDot />
            {translate('copy.invest.leaderboardLive')}
          </p>
          <h2 className="text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('copy.invest.emptyTitle')}</h2>
          <p className="max-w-md text-sm leading-relaxed text-fg-muted">{translate('copy.invest.emptyText')}</p>
          <Link
            href="/copy-trading/masters"
            className="group/explore mt-2 inline-flex h-12 items-center gap-3 self-start rounded-full bg-fg py-1 pr-1 pl-6 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {translate('copy.invest.explore')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white transition-transform duration-300 group-hover/explore:translate-x-0.5 motion-reduce:transition-none">
              <Icon name="arrowRight" size={15} />
            </span>
          </Link>
        </div>

        <CopyRoute />
      </section>
    </div>
  );
}
