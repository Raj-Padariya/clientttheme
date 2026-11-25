'use client';

import Link from 'next/link';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

/* Thread geometry (SVG units): master bead on the left, your empty seat on the right, copied trades travel along the dotted thread. */
const THREAD = { width: 420, height: 60, fromX: 30, toX: 390, y: 30 };
const threadPath = `M${THREAD.fromX} ${THREAD.y} H${THREAD.toX}`;
const PACKETS = [
  { r: 4.5, begin: '0s' },
  { r: 4.5, begin: '1s' },
  { r: 4.5, begin: '2s' },
];
const EMPTY_SEATS = 5;

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

/* ───────────── Frost ledger: the four snapshot figures ───────────── */

function SnapshotLedger() {
  const [lead, ...rest] = snapshotStats;
  return (
    <FrostCard className="h-full">
      <div className="flex h-full flex-col gap-5 text-[#0a1220] sm:p-1">
        <div className="flex items-center justify-between gap-3">
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name={lead.icon} size={14} />
            </span>
            {translate(lead.labelKey)}
          </p>
          <span className={cx('rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase', frostChipClass)}>{translate(lead.captionKey)}</span>
        </div>
        <p className="text-6xl font-black tracking-tight tabular-nums">
          <CountUp value={lead.value} format={lead.format} />
        </p>

        <dl className="mt-auto flex flex-col border-t border-dotted border-[#0a1220]/25 pt-1">
          {rest.map((stat, index) => (
            <div key={stat.key} style={staggerStyle(index + 1, 120)} className="flex animate-feed-in items-center gap-2.5 border-b border-dotted border-[#0a1220]/25 py-3 last:border-b-0 motion-reduce:animate-none">
              <span aria-hidden="true" className="font-mono text-[10px] text-[#4b5a70]">{stepNumber(index + 1)}</span>
              <span aria-hidden="true" className={cx('grid size-8 shrink-0 place-items-center rounded-full', frostChipClass)}>
                <Icon name={stat.icon} size={13} />
              </span>
              <dt className="min-w-0">
                <span className="block truncate text-sm font-semibold">{translate(stat.labelKey)}</span>
                <span className={cx(inkCaptionClass, 'block')}>{translate(stat.captionKey)}</span>
              </dt>
              <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-[#0a1220]/30" />
              <dd className="font-mono text-lg font-black tabular-nums">
                <CountUp value={stat.value} format={stat.format} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </FrostCard>
  );
}

/* ───────────── Copy thread: master → you, with empty seats ───────────── */

function ThreadBead({ icon, labelKey, isSource }: { icon: IconName; labelKey: MessageKey; isSource: boolean }) {
  return (
    <span className="flex flex-col items-center gap-2">
      <span className="relative grid size-16 place-items-center">
        {isSource ? (
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/35 motion-reduce:animate-none" />
        ) : (
          <span aria-hidden="true" className="absolute inset-1 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden" />
        )}
        <span className={cx('relative grid size-12 place-items-center rounded-full', isSource ? 'bg-fg text-app' : 'border-2 border-dashed border-line-strong bg-surface text-fg-muted')}>
          <Icon name={icon} size={20} />
        </span>
      </span>
      <span className={captionClass}>{translate(labelKey)}</span>
    </span>
  );
}

function CopyThread() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <ThreadBead icon="trophy" labelKey="copy.invest.masterNode" isSource />
        <div className="relative mt-3 min-w-0 flex-1">
          <svg viewBox={`0 0 ${THREAD.width} ${THREAD.height}`} preserveAspectRatio="none" className="h-10 w-full">
            <path d={threadPath} fill="none" strokeWidth={2} strokeDasharray="1 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-fg-subtle" />
          </svg>
          <span className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
            {PACKETS.map((packet) => (
              <span key={packet.begin} className="absolute inset-0">
                <svg viewBox={`0 0 ${THREAD.width} ${THREAD.height}`} preserveAspectRatio="none" className="h-10 w-full">
                  <circle r={packet.r} className="fill-fg">
                    <animateMotion dur="3s" begin={packet.begin} repeatCount="indefinite" path={threadPath} />
                  </circle>
                </svg>
              </span>
            ))}
          </span>
          <span className={cx(beadClass, 'absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2')}>
            <span className="grid animate-float place-items-center [animation-duration:3s] motion-reduce:animate-none">
              <Icon name="copy" size={14} />
            </span>
          </span>
        </div>
        <ThreadBead icon="user" labelKey="copy.invest.youNode" isSource={false} />
      </div>

      <div className="flex items-center gap-3 rounded-full px-3 py-2.5 ring-1 ring-line">
        <span className="flex flex-1 items-center justify-between gap-1.5">
          {Array.from({ length: EMPTY_SEATS }, (_, index) => (
            <span key={index} className="relative grid size-7 place-items-center">
              <span style={{ animationDelay: `${index * 400}ms` }} className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:hidden" />
              <span className="size-5 rounded-full border border-dashed border-line-strong" />
            </span>
          ))}
        </span>
        <span className={cx(beadClass, 'size-7')}>
          <Icon name="copy" size={11} />
        </span>
      </div>
    </div>
  );
}

export default function CopyInvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex animate-rise items-end gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-9')}>
            <Icon name="copy" size={15} />
          </span>
        </span>
        <div className="min-w-0">
          <p className={captionClass}>{translate('nav.copyTrading')}</p>
          <h1 className="mt-1 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.copyInvestments')}</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div style={staggerStyle(1, 140)} className="animate-rise motion-reduce:animate-none">
          <SnapshotLedger />
        </div>

        <section style={staggerStyle(2, 140)} className="orbit-card nova-edge-light relative isolate flex animate-rise flex-col gap-6 overflow-hidden p-6 motion-reduce:animate-none sm:p-8">
          <CopyThread />

          <div className="flex flex-col gap-3 border-t border-dotted border-line-strong pt-6">
            <p className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold text-fg ring-1 ring-line-strong">
              <LiveDot />
              {translate('copy.invest.leaderboardLive')}
            </p>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('copy.invest.emptyTitle')}</h2>
            <p className="max-w-md text-sm leading-relaxed text-fg-muted">{translate('copy.invest.emptyText')}</p>
            <Link
              href="/copy-trading/masters"
              className="group/explore relative mt-2 inline-flex h-12 items-center gap-2 self-start overflow-hidden rounded-full bg-fg pr-2 pl-6 text-sm font-semibold text-app shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/explore:translate-x-full motion-reduce:hidden" />
              <span className="relative">{translate('copy.invest.explore')}</span>
              <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/explore:translate-x-0.5 motion-reduce:transition-none">
                <Icon name="arrowRight" size={15} />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
