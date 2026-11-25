'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { myCopiers, myCopiersCopy as copy, myCopiersTotals, type CopierStatus, type MasterCopierRow } from './myPlansData';
import { SubscriptionHistoryDialog } from './SubscriptionHistoryDialog';

type StatusFilter = 'all' | CopierStatus;

const PAGE_SIZE = 10;
const ALL_PLANS = 'all';
const STATUS_ORDER: CopierStatus[] = ['active', 'pending', 'paused', 'stopped'];
const CAPITAL_PIXELS = 48;

const RED = 'var(--zenith-red)';
const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

// chip = status pill, dot = small status dot, bead = ring around the initials bead, cell = pixel in the network tracks.
const statusMeta: Record<CopierStatus, { label: string; chip: string; dot: string; bead: string; cell: string }> = {
  active: { label: copy.statusActive, chip: 'bg-fg text-app', dot: 'bg-success', bead: 'ring-success/70', cell: 'bg-fg text-app' },
  pending: {
    label: copy.statusPending,
    chip: 'text-[var(--zenith-red)] ring-1 ring-[var(--zenith-red)]/45',
    dot: 'bg-[var(--zenith-red)]',
    bead: 'ring-[var(--zenith-red)]/70',
    cell: 'bg-[var(--zenith-red)] text-white',
  },
  paused: { label: copy.statusPaused, chip: 'text-fg ring-1 ring-line-strong', dot: 'bg-fg/60', bead: 'ring-fg/40', cell: 'bg-fg/45 text-app' },
  stopped: { label: copy.statusStopped, chip: 'border border-dashed border-line-strong text-fg-muted', dot: 'bg-fg-subtle', bead: 'ring-line-strong opacity-60', cell: 'bg-fg/10 text-fg-muted' },
};

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: copy.filterAll },
  { value: 'active', label: copy.filterActive },
  { value: 'pending', label: copy.filterPending },
  { value: 'paused', label: copy.filterPaused },
  { value: 'stopped', label: copy.filterStopped },
];

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';

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

/** Flips to true one frame after mount so width/colour transitions actually run. */
function useArrived(): boolean {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frameId);
  }, []);
  return arrived;
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

function StatusChip({ status }: { status: CopierStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusMeta[status].chip)}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusMeta[status].dot, status === 'active' && 'animate-ping-soft motion-reduce:animate-none')} />
      {statusMeta[status].label}
    </span>
  );
}

/* ───────────── Title: open heading + active/total pixel capsule ───────────── */

function PageTitle({ active, total }: { active: number; total: number }) {
  const arrived = useArrived();
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <RedDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMyCopiers')}</h2>
        <p className="mt-2 text-sm text-fg-muted">{copy.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-start rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line sm:self-auto">
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="user" size={14} />
        </span>
        <span aria-hidden="true" className="flex gap-1">
          {Array.from({ length: total }, (_, index) => {
            const isLit = arrived && index < active;
            return (
              <span
                key={index}
                style={{ transitionDelay: `${200 + index * 90}ms` }}
                className={cx('h-5 w-2 rounded-[3px] transition-[background-color,transform] duration-300 motion-reduce:transition-none', isLit ? 'scale-100 bg-fg' : 'scale-90 bg-fg/15')}
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

/* ───────────── Network: one capsule track per status, one pixel per copier ───────────── */

function CopierNetwork({ copiers, counts }: { copiers: MasterCopierRow[]; counts: Record<CopierStatus, number> }) {
  const arrived = useArrived();
  const total = Math.max(1, copiers.length);
  return (
    <section aria-label={copy.network} style={staggerStyle(1, 120)} className="zenith-tile flex min-w-0 flex-col border-t border-line pt-5">
      <header className="mb-5 flex items-center gap-3">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:5s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full" />
          </span>
          <span className={cx(beadClass, 'size-9')}>
            <Icon name="trendUp" size={15} />
          </span>
        </span>
        <div className="min-w-0">
          <p className={captionClass}>{copy.you}</p>
          <p className="truncate text-lg font-black tracking-tight text-fg">{copy.network}</p>
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {STATUS_ORDER.map((status, wireIndex) => {
          const beads = copiers.filter((copier) => copier.status === status);
          const share = (counts[status] / total) * 100;
          return (
            <li
              key={status}
              style={staggerStyle(wireIndex, 220)}
              className="flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-4 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-line-strong motion-reduce:animate-none"
            >
              <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[10px] font-bold text-[var(--zenith-red)]">
                {stepNumber(wireIndex)}
              </span>
              <span className="flex w-20 shrink-0 items-center gap-2 text-sm font-semibold text-fg sm:w-24">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', statusMeta[status].dot)} />
                <span className="truncate">{statusMeta[status].label}</span>
              </span>
              <div className="relative flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5 pl-1">
                <span
                  aria-hidden="true"
                  style={{ width: arrived ? `${share}%` : '0%' }}
                  className="absolute inset-y-0 left-0 -z-10 rounded-full bg-fg/[0.07] transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                />
                {beads.length === 0 && <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-line-strong" />}
                {beads.map((copier, index) => (
                  <span
                    key={copier.id}
                    title={`${copier.name} · ${statusMeta[status].label}`}
                    style={{ animationDelay: `${300 + wireIndex * 120 + index * 80}ms` }}
                    className={cx('grid size-8 animate-dot-pop place-items-center rounded-[7px] text-[11px] font-black uppercase motion-reduce:animate-none', statusMeta[status].cell)}
                  >
                    {copier.name.charAt(0)}
                  </span>
                ))}
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-lg font-black text-fg tabular-nums">{counts[status]}</span>
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

/* ───────────── Totals: open capital figure + pixel field + KPI capsules ───────────── */

function TotalsOpen() {
  const cells: { icon: IconName; label: string; caption: string; value: number; isCount?: boolean; tone?: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: myCopiersTotals.activeCopiers, isCount: true },
    { icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: myCopiersTotals.totalPnl, tone: toneOf(myCopiersTotals.totalPnl) },
    { icon: 'clock', label: copy.estimatedCommission, caption: copy.projected, value: myCopiersTotals.estimatedCommission },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settled, value: myCopiersTotals.commissionEarned, tone: toneOf(myCopiersTotals.commissionEarned) },
  ];

  return (
    <section style={staggerStyle(0, 120)} className="zenith-tile flex h-full min-w-0 flex-col gap-5">
      <div>
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {copy.totalCapital}
        </p>
        <p className="mt-4 truncate text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">
          <CountUp value={myCopiersTotals.totalCapital} format={formatUsd} />
        </p>
        <p className="mt-2 text-xs text-fg-muted">{copy.investedFunds}</p>
        {/* Pixel field under the figure: cells twinkle in a scattered order, one red cell blinking. */}
        <div aria-hidden="true" className="mt-4 grid grid-cols-16 gap-1">
          {Array.from({ length: CAPITAL_PIXELS }, (_, index) => (
            <span
              key={index}
              style={{ animationDelay: `${(index * 173) % 2400}ms`, ...(index === 21 ? { background: RED } : {}) }}
              className={cx('h-2.5 rounded-[2px]', index === 21 ? 'animate-pulse' : 'zenith-twinkle bg-fg/15')}
            />
          ))}
        </div>
      </div>

      <dl className="flex flex-col gap-2">
        {cells.map((cell, index) => (
          <div
            key={cell.label}
            style={staggerStyle(index, 250)}
            className="group/cell flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-line-strong motion-reduce:animate-none"
          >
            <span aria-hidden="true" className={cx(beadClass, 'size-9 transition-transform duration-300 group-hover/cell:-rotate-12 motion-reduce:transition-none')}>
              <Icon name={cell.icon} size={13} />
            </span>
            <dt className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-fg">{cell.label}</span>
              <span className="block truncate text-[11px] text-fg-muted">{cell.caption}</span>
            </dt>
            <dd className={cx('shrink-0 font-mono text-base font-black tabular-nums', cell.tone ?? 'text-fg')}>
              <CountUp value={cell.value} format={(current) => (cell.isCount ? String(Math.round(current)) : formatUsd(current))} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Copier capsules ───────────── */

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

const RATE_CELLS = 10;

function RateCells({ rate }: { rate: number }) {
  const lit = Math.round((Math.max(0, Math.min(100, rate)) / 100) * RATE_CELLS);
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: RATE_CELLS }, (_, index) => (
          <span
            key={index}
            style={{ animationDelay: `${index * 60}ms`, ...(index === lit - 1 ? { background: RED } : {}) }}
            className={cx('h-3.5 w-1.5 animate-dot-pop rounded-[2px] motion-reduce:animate-none', index < lit ? 'bg-fg' : 'bg-fg/15')}
          />
        ))}
      </span>
      <span className="font-mono text-xs font-black tabular-nums">{rate}%</span>
    </span>
  );
}

function CopierTicket({ copier, index, onView }: { copier: MasterCopierRow; index: number; onView: () => void }) {
  return (
    <li
      style={staggerStyle(index, 200)}
      className="group/copier grid animate-feed-in gap-4 rounded-[28px] bg-fg/[0.03] p-4 ring-1 ring-line transition-[box-shadow,background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 xl:grid-cols-[15rem_minmax(0,1fr)_auto] xl:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-9 text-sm font-black uppercase ring-2 transition-transform duration-300 group-hover/copier:-rotate-12 motion-reduce:transition-none', statusMeta[copier.status].bead)}>
            {copier.name.charAt(0)}
          </span>
          {copier.status === 'active' && <RedDot className="absolute top-0.5 right-0.5" />}
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
            className="group/plan mt-0.5 inline-flex w-fit items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 text-xs font-semibold text-fg ring-1 ring-line transition-[box-shadow] hover:ring-fg/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" style={{ background: RED }} className="grid size-4 place-items-center rounded-full text-white">
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
          <span className={cx('font-mono font-bold tabular-nums', toneOf(copier.pnl))}>{formatUsd(copier.pnl)}</span>
          <span className={cx('font-mono text-xs tabular-nums', toneOf(copier.netPnl))}>{formatUsd(copier.netPnl)}</span>
        </TicketField>
        <TicketField top={copy.commissionRate} bottom={copy.estimated}>
          <RateCells rate={copier.commissionRate} />
          <span className="mt-0.5 font-mono text-xs text-fg-muted tabular-nums">{formatUsd(copier.estimatedCommission)}</span>
        </TicketField>
        <div className="min-w-0">
          <dt className={captionClass}>{copy.method}</dt>
          <dd className="mt-1 w-fit rounded-full px-2 py-0.5 text-xs text-fg ring-1 ring-line-strong">{copier.method}</dd>
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
          className="group/view inline-flex h-10 items-center gap-2 rounded-full bg-fg py-1 pr-4 pl-1 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white transition-transform duration-300 group-hover/view:rotate-12 motion-reduce:transition-none">
            <Icon name="eye" size={14} />
          </span>
          {copy.view}
        </button>
      </div>
    </li>
  );
}

function EmptyCopiers() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-line-strong py-14 text-center">
      <span aria-hidden="true" className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
        <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
          <Icon name="user" size={17} />
        </span>
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
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
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

  // Skeleton: open title, capital figure beside the status network, then an open copier list with a sticky toolbar.
  return (
    <div className="flex flex-col gap-10">
      <PageTitle active={counts.active} total={myCopiers.length} />

      <div className="grid gap-10 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <TotalsOpen />
        <CopierNetwork copiers={myCopiers} counts={counts} />
      </div>

      <section aria-label={translate('nav.copyMyCopiers')} style={staggerStyle(2, 120)} className="zenith-tile flex min-w-0 flex-col gap-4 border-t border-line pt-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={copy.statusFilter} className="flex flex-wrap gap-1.5 rounded-[26px] bg-fg/[0.03] p-1 ring-1 ring-line sm:rounded-full">
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
                    'flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3.5 text-sm font-semibold transition-[color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                  )}
                >
                  {option.label}
                  <span
                    style={isActive ? { background: RED } : undefined}
                    className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold tabular-nums', isActive ? 'text-white' : 'bg-fg/10 text-fg-subtle')}
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
          <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-line">
            <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {copy.page}
              <span className="grid size-7 place-items-center rounded-full bg-fg font-bold text-app tabular-nums">{currentPage}</span>/ {pageCount}
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
