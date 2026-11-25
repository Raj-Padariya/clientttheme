'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

const statusMeta: Record<CopierStatus, { label: string; chip: string; dot: string; bead: string }> = {
  active: { label: copy.statusActive, chip: 'text-success ring-success/40', dot: 'bg-success', bead: 'ring-success/70' },
  pending: { label: copy.statusPending, chip: 'text-warning ring-warning/40', dot: 'bg-warning', bead: 'ring-warning/70' },
  paused: { label: copy.statusPaused, chip: 'text-info ring-info/40', dot: 'bg-info', bead: 'ring-info/70' },
  stopped: { label: copy.statusStopped, chip: 'text-fg-muted ring-line-strong', dot: 'bg-fg-subtle', bead: 'ring-line-strong opacity-60' },
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
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const inkToneOf = (amount: number) => (amount > 0 ? 'text-[#13784a]' : amount < 0 ? 'text-[#b4233c]' : 'text-[#0a1220]');

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

function StatusChip({ status }: { status: CopierStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', statusMeta[status].chip)}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusMeta[status].dot, status === 'active' && 'animate-ping-soft motion-reduce:animate-none')} />
      {statusMeta[status].label}
    </span>
  );
}

/* ───────────── Title ───────────── */

function PageTitle({ active, total }: { active: number; total: number }) {
  return (
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={captionClass}>{translate('nav.copyTrading')}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.copyMyCopiers')}</h2>
        <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line sm:self-auto">
        <LiveDot />
        <span className="tabular-nums">
          {active}
          <span className="text-fg-subtle">/{total}</span>
        </span>
        {copy.statusActive}
      </span>
    </header>
  );
}

/* ───────────── Copier abacus: one wire per status, one bead per copier ───────────── */

function CopierAbacus({ copiers, counts }: { copiers: MasterCopierRow[]; counts: Record<CopierStatus, number> }) {
  return (
    <section aria-label={copy.network} style={staggerStyle(1, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6')}>
      <div className="flex items-center gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />
          <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
            <Icon name="trendUp" size={15} />
          </span>
        </span>
        <div className="min-w-0">
          <p className={captionClass}>{copy.you}</p>
          <p className="truncate text-base font-bold tracking-tight text-fg">{copy.network}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {STATUS_ORDER.map((status, wireIndex) => {
          const beads = copiers.filter((copier) => copier.status === status);
          return (
            <li key={status} style={staggerStyle(wireIndex, 220)} className="flex animate-feed-in items-center gap-3 py-2 motion-reduce:animate-none">
              <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[10px] text-fg-subtle">{stepNumber(wireIndex)}</span>
              <span className="flex w-20 shrink-0 items-center gap-2 text-sm font-semibold text-fg sm:w-24">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', statusMeta[status].dot)} />
                <span className="truncate">{statusMeta[status].label}</span>
              </span>
              <div className="relative flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <span aria-hidden="true" className={cx('absolute inset-x-0 top-1/2 -z-10 border-t-2', status === 'active' ? 'border-fg/50' : 'border-dashed border-line-strong')} />
                {beads.map((copier, index) => (
                  <span
                    key={copier.id}
                    title={`${copier.name} · ${statusMeta[status].label}`}
                    style={{ animationDelay: `${300 + wireIndex * 120 + index * 80}ms` }}
                    className={cx(beadClass, 'size-9 animate-dot-pop text-xs font-black uppercase ring-2 motion-reduce:animate-none', statusMeta[status].bead)}
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

/* ───────────── Frost totals ───────────── */

function TotalsFrost() {
  const cells: { icon: IconName; label: string; caption: string; value: number; isCount?: boolean; tone?: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: myCopiersTotals.activeCopiers, isCount: true },
    { icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: myCopiersTotals.totalPnl, tone: inkToneOf(myCopiersTotals.totalPnl) },
    { icon: 'clock', label: copy.estimatedCommission, caption: copy.projected, value: myCopiersTotals.estimatedCommission },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settled, value: myCopiersTotals.commissionEarned, tone: inkToneOf(myCopiersTotals.commissionEarned) },
  ];

  return (
    <FrostCard className="h-full">
      <div className={cx('flex h-full flex-col gap-5 sm:p-1', inkClass)}>
        <div>
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name="wallet" size={14} />
            </span>
            {copy.totalCapital}
          </p>
          <p className="mt-3 truncate text-4xl font-black tracking-tight tabular-nums sm:text-5xl">
            <CountUp value={myCopiersTotals.totalCapital} format={formatUsd} />
          </p>
          <p className={cx('mt-1 text-xs', inkMutedClass)}>{copy.investedFunds}</p>
        </div>

        <dl className="mt-auto grid grid-cols-2 gap-2.5">
          {cells.map((cell, index) => (
            <div key={cell.label} style={staggerStyle(index, 250)} className="group/cell min-w-0 animate-feed-in rounded-2xl bg-white/50 p-3 ring-1 ring-white/80 backdrop-blur-md motion-reduce:animate-none">
              <dt className="flex items-center gap-2">
                <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover/cell:-rotate-12', frostChipClass)}>
                  <Icon name={cell.icon} size={12} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{cell.label}</span>
                  <span className={cx('block truncate text-[10.5px]', inkMutedClass)}>{cell.caption}</span>
                </span>
              </dt>
              <dd className={cx('mt-2 truncate text-xl font-black tabular-nums', cell.tone)}>
                <CountUp value={cell.value} format={(current) => (cell.isCount ? String(Math.round(current)) : formatUsd(current))} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </FrostCard>
  );
}

/* ───────────── Copier tickets ───────────── */

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

function CopierTicket({ copier, index, onView }: { copier: MasterCopierRow; index: number; onView: () => void }) {
  return (
    <li
      style={staggerStyle(index, 200)}
      className="group/copier grid animate-feed-in gap-4 border-b border-dotted border-line-strong py-5 last:border-b-0 motion-reduce:animate-none xl:grid-cols-[15rem_minmax(0,1fr)_auto] xl:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-9 text-sm font-black uppercase ring-2 transition-transform duration-300 group-hover/copier:-rotate-12 motion-reduce:transition-none', statusMeta[copier.status].bead)}>
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

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 2xl:grid-cols-6">
        <TicketField top={copy.account} bottom={copy.plan}>
          <span className="font-mono text-xs">{copier.account}</span>
          <Link href={`/copy-trading/my-plans/${copier.planId}`} className="group/plan inline-flex w-fit items-center gap-1 text-xs font-semibold text-fg underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-ring">
            {copier.planName}
            <Icon name="arrowRight" size={11} className="transition-transform duration-300 group-hover/plan:translate-x-0.5" />
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
          <span className="w-fit rounded-full px-2 py-px font-mono text-xs font-bold ring-1 ring-line-strong">{copier.commissionRate}%</span>
          <span className="mt-0.5 font-mono text-xs text-fg-muted tabular-nums">{formatUsd(copier.estimatedCommission)}</span>
        </TicketField>
        <div className="min-w-0">
          <dt className={captionClass}>{copy.method}</dt>
          <dd className="mt-1 text-xs text-fg-muted">{copier.method}</dd>
        </div>
        <div className="min-w-0">
          <dt className={captionClass}>{copy.lastUpdate}</dt>
          <dd className="mt-1 text-xs text-fg-muted">{copier.lastUpdate}</dd>
        </div>
      </dl>

      <div role="group" aria-label={copy.actions} className="flex xl:justify-end">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${copy.view}: ${copier.name}`}
          title={copy.view}
          onClick={onView}
          className="group/view relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-fg px-3.5 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/view:translate-x-full motion-reduce:hidden" />
          <Icon name="eye" size={15} className="relative" />
          <span className="relative">{copy.view}</span>
        </button>
      </div>
    </li>
  );
}

function EmptyCopiers() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <span aria-hidden="true" className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle active={counts.active} total={myCopiers.length} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div style={staggerStyle(0, 120)} className="animate-rise motion-reduce:animate-none">
          <TotalsFrost />
        </div>
        <CopierAbacus copiers={myCopiers} counts={counts} />
      </div>

      <section aria-label={translate('nav.copyMyCopiers')} style={staggerStyle(2, 120)} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
        <div className="flex flex-col gap-3 border-b border-dotted border-line-strong p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
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
                    'flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3.5 text-sm font-semibold transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-fg text-app shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)]' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  {option.label}
                  <span className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-app text-fg' : 'bg-surface-2 text-fg-subtle')}>{count}</span>
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

        <div className="px-4 sm:px-6">
          {pageItems.length === 0 ? (
            <EmptyCopiers />
          ) : (
            <ol key={`${filter}-${planFilter}-${currentPage}`} className="flex flex-col">
              {pageItems.map((copier, index) => (
                <CopierTicket key={copier.id} copier={copier} index={index} onView={() => setViewing(copier)} />
              ))}
            </ol>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-dotted border-line-strong px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
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
