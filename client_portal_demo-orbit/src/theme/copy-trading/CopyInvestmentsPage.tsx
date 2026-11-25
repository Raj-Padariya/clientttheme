'use client';

import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { LinkButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

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

/* Relay geometry (SVG units). Nodes and the apex badge are HTML laid over the SVG at the same points, as percentages. */
const RELAY = { width: 360, height: 220, fromX: 64, toX: 296, baseY: 160, apexY: 72 };
const relayPath = `M${RELAY.fromX} ${RELAY.baseY} C${RELAY.fromX} ${RELAY.apexY - 30}, ${RELAY.toX} ${RELAY.apexY - 30}, ${RELAY.toX} ${RELAY.baseY}`;
const PACKETS = [
  { r: 4.5, begin: '0s', opacity: 1 },
  { r: 3, begin: '0.12s', opacity: 0.55 },
  { r: 2, begin: '0.24s', opacity: 0.3 },
];
const pct = (value: number, total: number) => `${Math.round((value / total) * 10000) / 100}%`;

function RelayNode({ icon, labelKey, isSource }: { icon: IconName; labelKey: MessageKey; isSource: boolean }) {
  return (
    <span className="flex flex-col items-center gap-2.5">
      <span className="relative grid size-20 place-items-center">
        {isSource ? (
          <span aria-hidden="true" className="absolute inset-0 animate-[spin_10s_linear_infinite] rounded-full border border-dashed border-primary/60 motion-reduce:animate-none" />
        ) : (
          <span aria-hidden="true" className="absolute inset-2 animate-ping-soft rounded-full bg-primary/20 motion-reduce:animate-none" />
        )}
        <span
          className={cx(
            'relative grid size-16 place-items-center rounded-full',
            isSource
              ? 'border border-primary/50 bg-primary/20 text-primary shadow-[0_0_36px_-10px_var(--brand-primary)]'
              : 'border-2 border-dashed border-primary/45 bg-surface text-primary',
          )}
        >
          <Icon name={icon} size={26} />
        </span>
      </span>
      <span className="rounded-md border border-line bg-fg/[0.03] px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">{translate(labelKey)}</span>
    </span>
  );
}

/** Master → you as a bridge: trade packets travel over the arc to the empty "you" slot. */
function RelayBridge() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <svg viewBox={`0 0 ${RELAY.width} ${RELAY.height}`} className="h-auto w-full">
        <line x1={24} x2={RELAY.width - 24} y1={RELAY.baseY + 44} y2={RELAY.baseY + 44} strokeDasharray="1 6" strokeLinecap="round" className="stroke-line-strong" />
        <path d={relayPath} fill="none" strokeWidth={10} className="stroke-primary/[0.08]" />
        <path d={relayPath} fill="none" strokeWidth={1.5} strokeDasharray="5 7" className="stroke-primary/55">
          <animate attributeName="stroke-dashoffset" values="24;0" dur="1.2s" repeatCount="indefinite" />
        </path>
        <g className="motion-reduce:hidden">
          {PACKETS.map((packet) => (
            <circle key={packet.begin} r={packet.r} opacity={packet.opacity} className="fill-primary">
              <animateMotion dur="2.8s" begin={packet.begin} repeatCount="indefinite" path={relayPath} />
            </circle>
          ))}
        </g>
      </svg>

      <span style={{ left: pct(RELAY.fromX, RELAY.width), top: pct(RELAY.baseY, RELAY.height) }} className="absolute -translate-x-1/2 -translate-y-10">
        <RelayNode icon="trophy" labelKey="copy.invest.masterNode" isSource />
      </span>
      <span style={{ left: pct(RELAY.toX, RELAY.width), top: pct(RELAY.baseY, RELAY.height) }} className="absolute -translate-x-1/2 -translate-y-10">
        <RelayNode icon="user" labelKey="copy.invest.youNode" isSource={false} />
      </span>
      <span
        style={{ left: '50%', top: pct(RELAY.apexY - 7, RELAY.height) }}
        className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 animate-float place-items-center rounded-xl border border-primary/35 bg-surface text-primary shadow-card motion-reduce:animate-none"
      >
        <Icon name="copy" size={16} />
      </span>
    </div>
  );
}

/** Split-flap readout: every digit sits in its own hinged cell. */
function FlapValue({ text, delayIndex }: { text: string; delayIndex: number }) {
  return (
    <span aria-label={text} className="flex flex-wrap items-end gap-1">
      {[...text].map((char, index) =>
        /\d/.test(char) ? (
          <span
            key={index}
            aria-hidden="true"
            style={{ animationDelay: `${delayIndex * 160 + index * 70 + 300}ms` }}
            className="relative grid h-10 w-7 origin-bottom animate-tick-rise place-items-center overflow-hidden rounded-md border border-line bg-fg/[0.04] text-xl font-semibold text-fg tabular-nums motion-reduce:animate-none"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-fg/[0.03]" />
            <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-app/70" />
            <span className="relative">{char}</span>
          </span>
        ) : (
          <span key={index} aria-hidden="true" className="pb-1 text-lg font-semibold text-fg-muted">
            {char}
          </span>
        ),
      )}
    </span>
  );
}

function SnapshotBoard() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {snapshotStats.map((stat, index) => (
        <li
          key={stat.key}
          style={staggerStyle(index, 120)}
          className="orbit-card group relative flex animate-rise flex-col gap-4 overflow-hidden p-5 transition-[translate] duration-300 hover:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-300 group-hover:-rotate-8 motion-reduce:transition-none">
              <Icon name={stat.icon} size={16} />
            </span>
            <span className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{translate(stat.captionKey)}</span>
          </div>
          <p className="text-sm text-fg-muted">{translate(stat.labelKey)}</p>
          <FlapValue text={stat.format(stat.value)} delayIndex={index} />
        </li>
      ))}
    </ul>
  );
}

export default function CopyInvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.copyInvestments')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="orbit-card relative isolate flex animate-rise items-center overflow-hidden px-4 pt-10 pb-6 motion-reduce:animate-none">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:16px_16px]" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <RelayBridge />
        </section>

        <section style={staggerStyle(1, 140)} className="orbit-card relative isolate flex animate-rise flex-col justify-center gap-4 overflow-hidden p-6 motion-reduce:animate-none sm:p-10">
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 -z-10 size-80 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-y-8 left-0 w-1 rounded-r-full bg-linear-to-b from-primary/70 via-primary/30 to-transparent" />
          <p className="inline-flex items-center gap-2 self-start rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <LiveDot />
            {translate('copy.invest.leaderboardLive')}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('copy.invest.emptyTitle')}</h2>
          <p className="max-w-md text-sm leading-relaxed text-fg-muted">{translate('copy.invest.emptyText')}</p>
          <LinkButton href="/copy-trading/masters" size="lg" className="group/explore mt-2 self-start shadow-[0_14px_30px_-14px_var(--brand-primary)]">
            {translate('copy.invest.explore')}
            <Icon name="arrowRight" size={20} className="transition-transform duration-200 group-hover/explore:translate-x-1 motion-reduce:transition-none" />
          </LinkButton>
        </section>
      </div>

      <SnapshotBoard />
    </div>
  );
}
