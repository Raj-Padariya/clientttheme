'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { myCopiers, myCopiersCopy as copy, myCopiersTotals, type CopierStatus, type MasterCopierRow } from './myPlansData';
import { SubscriptionHistoryDialog } from './SubscriptionHistoryDialog';
import '../promotion/market.css';
import '../pamm/desk.css';

type StatusFilter = 'all' | CopierStatus;

const PAGE_SIZE = 10;
const ALL_PLANS = 'all';
const STATUS_ORDER: CopierStatus[] = ['active', 'pending', 'paused', 'stopped'];
const RATE_TICKS = 10;
const EMPTY_LEVELS = 5;

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

// Capital curve under the total: a climbing equity line drawn in on load.
const CAPITAL_PATH = 'M0 34 L20 30 L34 32 L52 24 L70 26 L88 18 L106 20 L124 12 L142 15 L160 8 L180 10 L200 4';

// chip = status tag, dot = status dot, rail = left edge of a position row, order = an order block in the depth ladder, depth = the depth bar.
const statusMeta: Record<CopierStatus, { label: string; chip: string; dot: string; rail: string; order: string; depth: string }> = {
  active: {
    label: copy.statusActive,
    chip: 'bg-(--hero-buy)/15 text-(--hero-buy)',
    dot: 'bg-(--hero-buy)',
    rail: 'bg-(--hero-buy)',
    order: 'bg-(--hero-buy) text-[#062520]',
    depth: 'bg-(--hero-buy)/15',
  },
  pending: {
    label: copy.statusPending,
    chip: 'bg-(--aurora-cta-from) text-[#062520]',
    dot: 'bg-(--aurora-cta-from)',
    rail: 'desk-stripes bg-(--aurora-cta-from)',
    order: 'bg-(--aurora-cta-from) text-[#062520]',
    depth: 'bg-(--aurora-cta-from)/12',
  },
  paused: { label: copy.statusPaused, chip: 'text-fg ring-1 ring-line-strong', dot: 'bg-fg/60', rail: 'bg-fg/40', order: 'bg-fg/45 text-app', depth: 'bg-fg/[0.07]' },
  stopped: {
    label: copy.statusStopped,
    chip: 'border border-dashed border-line-strong text-fg-muted',
    dot: 'bg-fg-subtle',
    rail: 'bg-fg/15',
    order: 'border border-dashed border-line-strong bg-fg/10 text-fg-muted',
    depth: 'bg-fg/[0.04]',
  },
};

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: copy.filterAll },
  { value: 'active', label: copy.filterActive },
  { value: 'pending', label: copy.filterPending },
  { value: 'paused', label: copy.filterPaused },
  { value: 'stopped', label: copy.filterStopped },
];

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-xl bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';

function countByStatus(rows: MasterCopierRow[]): Record<CopierStatus, number> {
  const counts: Record<CopierStatus, number> = { active: 0, pending: 0, paused: 0, stopped: 0 };
  rows.forEach((row) => {
    counts[row.status] += 1;
  });
  return counts;
}

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

/** Flips to true one frame after mount so width transitions actually run. */
function useArrived(): boolean {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frameId);
  }, []);
  return arrived;
}

function ClayDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

function StatusChip({ status }: { status: CopierStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold', statusMeta[status].chip)}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusMeta[status].dot, status === 'active' && 'mkt-blink')} />
      {statusMeta[status].label}
    </span>
  );
}

/* ───────────── Title: active copiers as a volume meter ───────────── */

function PageTitle({ active, total }: { active: number; total: number }) {
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <ClayDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMyCopiers')}</h2>
        <p className="mt-2 text-sm text-fg-muted">{copy.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-start rounded-xl bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line sm:self-auto">
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="user" size={14} />
        </span>
        {/* One volume bar per copier: active bars rise in sage, the rest keep bouncing like idle volume. */}
        <span aria-hidden="true" className="flex h-7 items-end gap-[3px]">
          {Array.from({ length: total }, (_, index) => {
            const isActive = index < active;
            const height = 35 + ((index * 37) % 65);
            const motion = isActive ? { '--candle-delay': `${200 + index * 80}ms` } : { '--vol-delay': `${(index % 4) * 0.15}s` };
            return (
              <span
                key={index}
                style={{ height: `${height}%`, ...motion } as CSSProperties}
                className={cx('w-1.5 rounded-[1px]', isActive ? 'mkt-candle bg-(--hero-buy)' : 'mkt-vol bg-fg/15')}
              />
            );
          })}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <LiveDot />
          <span className="font-mono font-black tabular-nums">
            {active}
            <span className="text-fg-subtle">/{total}</span>
          </span>
          {copy.statusActive}
        </span>
      </div>
    </header>
  );
}

/* ───────────── Depth ladder: one order-book level per status, each copier an order block ───────────── */

function CopierNetwork({ copiers, counts }: { copiers: MasterCopierRow[]; counts: Record<CopierStatus, number> }) {
  const arrived = useArrived();
  const total = Math.max(1, copiers.length);
  return (
    <section aria-label={copy.network} style={staggerStyle(1, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5 sm:p-6')}>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
            <span className="absolute -inset-1 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/60 motion-reduce:hidden" />
            <span className={cx(beadClass, 'relative size-11')}>
              <Icon name="trendUp" size={16} />
            </span>
          </span>
          <div className="min-w-0">
            <p className={captionClass}>{copy.you}</p>
            <p className="truncate text-lg font-black tracking-tight text-fg">{copy.network}</p>
          </div>
        </div>
        <span aria-hidden="true" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-bold text-fg-muted ring-1 ring-line">
          <span className="mkt-blink size-1.5 rounded-full bg-(--hero-buy)" />
          L2
        </span>
      </header>

      <ul className="flex flex-col divide-y divide-dashed divide-line rounded-xl ring-1 ring-line">
        {STATUS_ORDER.map((status, levelIndex) => {
          const orders = copiers.filter((copier) => copier.status === status);
          const share = (counts[status] / total) * 100;
          return (
            <li key={status} style={staggerStyle(levelIndex, 220)} className="relative flex animate-feed-in items-center gap-3 overflow-hidden px-3 py-2 motion-reduce:animate-none sm:px-4">
              {/* Depth bar grows in from the right like a book level, a glare running over the deepest one. */}
              <span
                aria-hidden="true"
                style={{ width: arrived ? `${share}%` : '0%', transitionDelay: `${200 + levelIndex * 120}ms` }}
                className={cx('absolute inset-y-0 right-0 -z-10 transition-[width] duration-1000 ease-out motion-reduce:transition-none', statusMeta[status].depth)}
              />
              <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[10px] font-bold text-fg-subtle">
                {stepNumber(levelIndex)}
              </span>
              <span className="flex w-20 shrink-0 items-center gap-2 text-sm font-semibold text-fg sm:w-24">
                <span aria-hidden="true" className={cx('h-4 w-1 shrink-0 rounded-full', statusMeta[status].dot)} />
                <span className="truncate">{statusMeta[status].label}</span>
              </span>
              <div className="relative flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5">
                {orders.length === 0 && (
                  <span aria-hidden="true" className="relative h-0 flex-1 border-t-2 border-dashed border-line-strong">
                    <span className="mkt-flow absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-fg/40 motion-reduce:hidden" />
                  </span>
                )}
                {orders.map((copier, index) => (
                  <span
                    key={copier.id}
                    title={`${copier.name} · ${statusMeta[status].label}`}
                    style={{ animationDelay: `${300 + levelIndex * 120 + index * 80}ms` }}
                    className={cx('grid h-8 min-w-8 animate-dot-pop place-items-center rounded-md px-1 font-mono text-[11px] font-black uppercase motion-reduce:animate-none', statusMeta[status].order)}
                  >
                    {copier.name.charAt(0)}
                  </span>
                ))}
              </div>
              <span className="w-12 shrink-0 text-right">
                <span className="block font-mono text-lg leading-none font-black text-fg tabular-nums">{counts[status]}</span>
                <span className="block font-mono text-[9.5px] text-fg-subtle tabular-nums">{Math.round((counts[status] / total) * 100)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
      <span className="sr-only">
        {copy.network}: {copiers.map((copier) => `${copier.name} (${statusMeta[copier.status].label})`).join(', ')}
      </span>
    </section>
  );
}

/* ───────────── Capital account: total with an equity curve + quote cells ───────────── */

function TotalsOpen() {
  const cells: { icon: IconName; label: string; caption: string; value: number; isCount?: boolean; tone?: string; strip: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: myCopiersTotals.activeCopiers, isCount: true, strip: 'bg-(--hero-buy)' },
    { icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: myCopiersTotals.totalPnl, tone: toneOf(myCopiersTotals.totalPnl), strip: 'bg-fg/50' },
    { icon: 'clock', label: copy.estimatedCommission, caption: copy.projected, value: myCopiersTotals.estimatedCommission, strip: 'desk-stripes bg-(--aurora-cta-from)' },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settled, value: myCopiersTotals.commissionEarned, tone: toneOf(myCopiersTotals.commissionEarned), strip: 'bg-(--aurora-cta-from)' },
  ];

  return (
    <section style={staggerStyle(0, 120)} className={cx(panelClass, 'zenith-tile flex h-full min-w-0 flex-col gap-5 p-5 sm:p-6')}>
      <div>
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {copy.totalCapital}
        </p>
        <p className="mt-4 truncate font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums">
          <CountUp value={myCopiersTotals.totalCapital} format={formatUsd} />
        </p>
        <p className="mt-2 text-xs text-fg-muted">{copy.investedFunds}</p>
        <div aria-hidden="true" className="relative mt-4 overflow-hidden rounded-lg bg-fg/[0.03] p-1.5 ring-1 ring-line">
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="h-14 w-full overflow-visible">
            <path d={`${CAPITAL_PATH} V40 H0 Z`} className="fill-(--hero-buy)/10" />
            <path d={CAPITAL_PATH} pathLength={1} fill="none" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="mkt-draw stroke-(--hero-buy)" />
          </svg>
          <span className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/10" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {cells.map((cell, index) => (
          <div key={cell.label} style={staggerStyle(index, 250)} className="group/cell relative flex animate-feed-in flex-col gap-1.5 overflow-hidden rounded-lg bg-fg/[0.03] p-3 pt-3.5 ring-1 ring-line motion-reduce:animate-none">
            <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-1', cell.strip)} />
            <dt className="flex min-w-0 items-start gap-2">
              <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-md bg-fg/10 text-fg transition-transform duration-300 group-hover/cell:-rotate-12 motion-reduce:transition-none">
                <Icon name={cell.icon} size={11} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-fg">{cell.label}</span>
                <span className="block truncate text-[10.5px] text-fg-muted">{cell.caption}</span>
              </span>
            </dt>
            <dd className={cx('truncate font-mono text-base font-black tabular-nums', cell.tone ?? 'text-fg')}>
              <CountUp value={cell.value} format={(current) => (cell.isCount ? String(Math.round(current)) : formatUsd(current))} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Position rows ───────────── */

function TicketField({ top, bottom, children }: { top: string; bottom: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={cx(captionClass, 'leading-tight')}>
        {top}
        <span className="block tracking-[0.1em] text-fg-subtle/70">{bottom}</span>
      </dt>
      <dd className="mt-1 flex flex-col text-sm text-fg">{children}</dd>
    </div>
  );
}

// Commission rate as a tick strip: ticks rise in sage up to the rate, the last lit tick in clay.
function RateCells({ rate }: { rate: number }) {
  const lit = Math.round((Math.max(0, Math.min(100, rate)) / 100) * RATE_TICKS);
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
        {Array.from({ length: RATE_TICKS }, (_, index) => {
          const isLit = index < lit;
          return (
            <span
              key={index}
              style={{ height: `${40 + index * 6}%`, ...(isLit ? { '--candle-delay': `${index * 50}ms` } : {}) } as CSSProperties}
              className={cx('w-1.5 rounded-[1px]', isLit ? cx('mkt-candle', index === lit - 1 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)') : 'bg-fg/15')}
            />
          );
        })}
      </span>
      <span className="font-mono text-xs font-black tabular-nums">{rate}%</span>
    </span>
  );
}

// P&L as one small candle: sage body up for profit, clay body down for loss.
function PnlCandle({ value }: { value: number }) {
  const isUp = value >= 0;
  return (
    <span aria-hidden="true" className="relative mr-1 inline-flex h-5 w-2 shrink-0 justify-center">
      <span className="absolute inset-y-0 w-px bg-fg/30" />
      <span
        style={{ '--candle-delay': '300ms' } as CSSProperties}
        className={cx('mkt-candle absolute inset-x-0 h-2.5 rounded-[1px]', isUp ? 'top-1 bg-(--hero-buy)' : 'bottom-1 bg-(--aurora-cta-from)')}
      />
    </span>
  );
}

function CopierTicket({ copier, index, onView }: { copier: MasterCopierRow; index: number; onView: () => void }) {
  return (
    <li
      style={staggerStyle(index, 200)}
      className="group/copier relative grid animate-feed-in gap-4 overflow-hidden rounded-xl bg-fg/[0.03] p-4 pl-5 ring-1 ring-line transition-[box-shadow,background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 sm:pl-6 xl:grid-cols-[15rem_minmax(0,1fr)_auto] xl:items-center"
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1.5', statusMeta[copier.status].rail)} />

      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          {copier.status === 'active' && <span className="absolute -inset-1 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/60 motion-reduce:hidden" />}
          <span
            className={cx(
              'grid size-11 place-items-center rounded-xl font-mono text-sm font-black uppercase transition-transform duration-300 group-hover/copier:-rotate-6 motion-reduce:transition-none',
              statusMeta[copier.status].order,
            )}
          >
            {copier.name.charAt(0)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-fg">{copier.name}</p>
          <p className="truncate text-xs text-fg-muted">{copier.email}</p>
          <p className="mt-1.5">
            <span className="sr-only">{copy.status}: </span>
            <StatusChip status={copier.status} />
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-dashed border-line pt-4 sm:grid-cols-3 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5 2xl:grid-cols-6">
        <TicketField top={copy.account} bottom={copy.plan}>
          <span className="font-mono text-xs">{copier.account}</span>
          <Link
            href={`/copy-trading/my-plans/${copier.planId}`}
            className="group/plan mt-0.5 inline-flex w-fit items-center gap-1 rounded-md py-0.5 pr-2 pl-0.5 text-xs font-semibold text-fg ring-1 ring-line transition-[box-shadow] hover:ring-(--hero-buy)/60 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="grid size-4 place-items-center rounded bg-(--hero-buy) text-[#062520]">
              <Icon name="arrowRight" size={9} className="transition-transform duration-300 group-hover/plan:translate-x-0.5" />
            </span>
            {copier.planName}
          </Link>
        </TicketField>
        <TicketField top={copy.capital} bottom={copy.open}>
          <span className="font-mono font-black tabular-nums">{formatUsd(copier.capital)}</span>
          <span className="font-mono text-xs text-fg-muted tabular-nums">{copier.openTrades}</span>
        </TicketField>
        <TicketField top={copy.pnl} bottom={copy.netPnl}>
          <span className={cx('inline-flex items-center font-mono font-bold tabular-nums', toneOf(copier.pnl))}>
            <PnlCandle value={copier.pnl} />
            {formatUsd(copier.pnl)}
          </span>
          <span className={cx('font-mono text-xs tabular-nums', toneOf(copier.netPnl))}>{formatUsd(copier.netPnl)}</span>
        </TicketField>
        <TicketField top={copy.commissionRate} bottom={copy.estimated}>
          <RateCells rate={copier.commissionRate} />
          <span className="mt-0.5 font-mono text-xs text-fg-muted tabular-nums">{formatUsd(copier.estimatedCommission)}</span>
        </TicketField>
        <div className="min-w-0">
          <dt className={captionClass}>{copy.method}</dt>
          <dd className="mt-1 w-fit rounded-md px-2 py-0.5 font-mono text-xs text-fg ring-1 ring-line-strong">{copier.method}</dd>
        </div>
        <div className="min-w-0">
          <dt className={captionClass}>{copy.lastUpdate}</dt>
          <dd className="mt-1 font-mono text-xs text-fg-muted">{copier.lastUpdate}</dd>
        </div>
      </dl>

      <div role="group" aria-label={copy.actions} className="flex xl:justify-end">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${copy.view}: ${copier.name}`}
          title={copy.view}
          onClick={onView}
          className="group/view relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg bg-(--hero-buy) py-1 pr-4 pl-1 text-sm font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/30" />
          <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-md bg-(--aurora-cta-from) text-[#062520] transition-transform duration-300 group-hover/view:rotate-12 motion-reduce:transition-none">
            <Icon name="eye" size={14} />
          </span>
          <span className="relative">{copy.view}</span>
        </button>
      </div>
    </li>
  );
}

// Empty book: dashed price levels with a scan line passing down over them.
function EmptyCopiers() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong py-12 text-center">
      <span aria-hidden="true" className="relative flex w-40 flex-col gap-1.5 overflow-hidden rounded-lg p-2 ring-1 ring-line">
        {Array.from({ length: EMPTY_LEVELS }, (_, index) => (
          <span key={index} className="flex items-center gap-2">
            <span className="h-1.5 w-6 rounded-full bg-fg/15" />
            <span style={{ width: `${40 + ((index * 23) % 55)}%` }} className="h-0 border-t-2 border-dashed border-line-strong" />
          </span>
        ))}
        <span className="desk-scan-y absolute inset-x-0 top-0 h-4 bg-linear-to-b from-transparent via-(--hero-buy)/25 to-transparent" />
      </span>
      <p className="text-sm font-semibold text-fg">{copy.noMatch}</p>
      <p className="text-sm text-fg-muted">{copy.noMatchText}</p>
    </div>
  );
}

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md font-mono text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {symbol}
    </button>
  );
}

/* ───────────── Page ───────────── */

export default function MyCopiersPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState(ALL_PLANS);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<MasterCopierRow | null>(null);

  const counts = countByStatus(myCopiers);
  const plans = [...new Map(myCopiers.map((copier) => [copier.planId, copier.planName])).entries()];
  const filtered = myCopiers.filter((copier) => (filter === 'all' || copier.status === filter) && (planFilter === ALL_PLANS || String(copier.planId) === planFilter));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  // Skeleton: title, depth ladder beside the capital account, then the position list with its toolbar.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle active={counts.active} total={myCopiers.length} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <CopierNetwork copiers={myCopiers} counts={counts} />
        <TotalsOpen />
      </div>

      <section aria-label={translate('nav.copyMyCopiers')} style={staggerStyle(2, 120)} className="zenith-tile flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status filters as order-type keys: a status dot, the label and its count. */}
          <div role="group" aria-label={copy.statusFilter} className="flex flex-wrap gap-1.5">
            {filters.map((option) => {
              const isActive = filter === option.value;
              const count = option.value === 'all' ? myCopiers.length : counts[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setFilter(option.value);
                    setPage(1);
                  }}
                  className={cx(
                    'flex h-9 items-center gap-2 rounded-lg pr-1.5 pl-3 text-sm font-semibold ring-1 transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-(--hero-buy) text-[#062520] ring-(--hero-buy)' : 'text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  {option.value !== 'all' && <span aria-hidden="true" className={cx('size-1.5 rounded-full', isActive ? 'bg-[#062520]' : statusMeta[option.value].dot)} />}
                  {option.label}
                  <span
                    className={cx(
                      'grid h-6 min-w-6 place-items-center rounded-md px-1.5 font-mono text-[10px] font-bold tabular-nums',
                      isActive ? 'bg-(--aurora-cta-from) text-[#062520]' : 'bg-fg/10 text-fg-subtle',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <Dropdown
            label={copy.planFilter}
            value={planFilter}
            options={[{ value: ALL_PLANS, label: copy.allPlans }, ...plans.map(([id, name]) => ({ value: String(id), label: name }))]}
            onChange={(value) => {
              setPlanFilter(value);
              setPage(1);
            }}
            icon="filter"
            className="lg:w-56"
          />
        </div>

        {pageItems.length === 0 ? (
          <EmptyCopiers />
        ) : (
          <ol key={`${filter}-${planFilter}-${currentPage}`} className="flex flex-col gap-3">
            {pageItems.map((copier, index) => (
              <CopierTicket key={copier.id} copier={copier} index={index} onView={() => setViewing(copier)} />
            ))}
          </ol>
        )}

        <div className="flex flex-col items-center gap-3 border-t border-dashed border-line pt-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-fg-muted tabular-nums">
            {copy.showing} {filtered.length === 0 ? 0 : firstIndex + 1}–{firstIndex + pageItems.length} {copy.of} {filtered.length}
          </p>
          <div className="flex items-center gap-1 rounded-lg p-1 ring-1 ring-line">
            <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {copy.page}
              <span className="grid size-7 place-items-center rounded-md bg-(--hero-buy) font-mono font-bold text-[#062520] tabular-nums">{currentPage}</span>/ {pageCount}
            </span>
            <PagerButton label={copy.nextPage} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={copy.lastPage} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </section>

      <SubscriptionHistoryDialog copier={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
