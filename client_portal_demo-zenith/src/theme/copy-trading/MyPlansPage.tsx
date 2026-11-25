'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { EditPlanDialog } from './EditPlanDialog';
import { PausePlanDialog } from './PausePlanDialog';
import { myPlans, pausePlanCopy, type MasterPlanRow, type PlanStatus } from './myPlansData';

type StatusFilter = 'all' | PlanStatus;
type SortKey = 'newest' | 'name' | 'aum';

const PAGE_SIZE = 10;
const EMPTY_VALUE = '–';
const STATUS_ORDER: PlanStatus[] = ['approved', 'pending', 'rejected', 'inactive'];
const STATUS_PIXELS = 40;

const RED = 'var(--zenith-red)';
const redSoft = 'bg-[color-mix(in_srgb,var(--zenith-red)_40%,transparent)]';

// White = live, solid red = waiting on review, faded red = rejected, grey = inactive.
const statusMeta: Record<PlanStatus, { labelKey: MessageKey; chip: string; cell: string }> = {
  approved: { labelKey: 'copy.myPlans.approved', chip: 'bg-fg text-app', cell: 'bg-fg' },
  pending: { labelKey: 'copy.myPlans.pendingReview', chip: 'bg-[var(--zenith-red)] text-white', cell: 'bg-[var(--zenith-red)]' },
  rejected: { labelKey: 'copy.myPlans.rejected', chip: 'text-[var(--zenith-red)] ring-1 ring-[var(--zenith-red)]/50', cell: redSoft },
  inactive: { labelKey: 'copy.myPlans.inactive', chip: 'text-fg-subtle ring-1 ring-line-strong', cell: 'bg-fg/25' },
};

const legend: { status: PlanStatus; labelKey: MessageKey; captionKey?: MessageKey }[] = [
  { status: 'approved', labelKey: 'copy.myPlans.activePlans', captionKey: 'copy.myPlans.liveTrading' },
  { status: 'pending', labelKey: 'copy.myPlans.pendingReview', captionKey: 'copy.myPlans.awaitingApproval' },
  { status: 'rejected', labelKey: 'copy.myPlans.rejected' },
  { status: 'inactive', labelKey: 'copy.myPlans.inactive' },
];

const filters: { value: StatusFilter; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'copy.myPlans.filterAll' },
  { value: 'approved', labelKey: 'copy.myPlans.filterActive' },
  { value: 'pending', labelKey: 'copy.myPlans.pendingReview' },
  { value: 'rejected', labelKey: 'copy.myPlans.rejected' },
  { value: 'inactive', labelKey: 'copy.myPlans.inactive' },
];

const comparators: Record<SortKey, (a: MasterPlanRow, b: MasterPlanRow) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  aum: (a, b) => b.aum - a.aum,
};

const createdFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const formatUsd = (amount: number) => formatMoney(amount, 'USD');

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const actionClass =
  'grid size-10 place-items-center rounded-full ring-1 ring-line text-fg-muted transition-[color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0';

function countByStatus(plans: MasterPlanRow[]): Record<PlanStatus, number> {
  const counts: Record<PlanStatus, number> = { approved: 0, pending: 0, rejected: 0, inactive: 0 };
  for (const plan of plans) counts[plan.status] += 1;
  return counts;
}

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

// Capsule track: a translucent tube whose fill grows in from the left.
function CapsuleTrack({ percent, cell, delayMs = 0, scan = false }: { percent: number; cell: string; delayMs?: number; scan?: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-2.5 overflow-hidden rounded-full bg-fg/10">
      <span style={{ width: `${percent}%`, animationDelay: `${delayMs}ms` }} className={cx('zenith-capsule absolute inset-y-0 left-0 origin-left rounded-full', cell)}>
        {scan && <span className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-white/45" />}
      </span>
    </span>
  );
}

/* ───────────── Title ───────────── */

function PageTitle() {
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <RedDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMyPlans')}</h2>
        <p className="mt-2 text-sm text-fg-muted">{translate('copy.myPlans.subtitle')}</p>
      </div>
      <Button type="button" className="group/create shrink-0 self-start rounded-full! pl-1.5! sm:self-auto">
        <span aria-hidden="true" style={{ background: RED }} className="grid size-7 place-items-center rounded-full text-white">
          <Icon name="plus" size={14} className="transition-transform duration-300 group-hover/create:rotate-90 motion-reduce:transition-none" />
        </span>
        {translate('copy.myPlans.createPlan')}
      </Button>
    </header>
  );
}

/* ───────────── Open totals band ───────────── */

function TotalsFrost({ totalAum, totalCopiers }: { totalAum: number; totalCopiers: number }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="wallet" size={14} />
            </span>
            {translate('copy.myPlans.totalAum')}
          </p>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-fg-muted ring-1 ring-line">{translate('copy.myPlans.acrossAllPlans')}</span>
        </div>
        <p className="mt-4 truncate text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
          <CountUp value={totalAum} format={formatUsd} />
        </p>
      </div>

      <div className="flex items-center gap-4 border-t border-line pt-5">
        <span className="relative grid size-11 shrink-0 place-items-center">
          <span aria-hidden="true" style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full opacity-30 motion-reduce:hidden" />
          <span className="relative grid size-11 place-items-center rounded-full bg-fg/10 text-fg ring-1 ring-line-strong">
            <Icon name="user" size={16} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className={captionClass}>{translate('copy.myPlans.totalCopiers')}</p>
          <p className="truncate text-[11px] text-fg-muted">{translate('copy.myPlans.subscribers')}</p>
        </div>
        <p className="shrink-0 text-4xl font-black tracking-tight text-fg tabular-nums">
          <CountUp value={totalCopiers} format={(value) => String(Math.round(value))} />
        </p>
      </div>
    </div>
  );
}

/* ───────────── Status breakdown: pixel matrix + capsule tracks ───────────── */

function StatusBreakdown({ counts, total }: { counts: Record<PlanStatus, number>; total: number }) {
  // Each pixel is 1/40 of all plans; a pixel takes the status whose share covers its midpoint.
  const cells = Array.from({ length: STATUS_PIXELS }, (_, index): PlanStatus | null => {
    if (total === 0) return null;
    const position = ((index + 0.5) / STATUS_PIXELS) * total;
    let reached = 0;
    for (const status of STATUS_ORDER) {
      reached += counts[status];
      if (position < reached) return status;
    }
    return STATUS_ORDER[STATUS_ORDER.length - 1];
  });

  return (
    <section style={staggerStyle(1, 120)} className="zenith-tile flex min-w-0 flex-col gap-5 lg:border-l lg:border-line lg:pl-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <LiveDot />
            {translate('copy.myPlans.totalPlans')}
          </p>
          <p className="mt-2 text-6xl leading-none font-black tracking-tighter text-fg tabular-nums">
            <CountUp value={total} format={(value) => String(Math.round(value))} />
          </p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-semibold text-fg ring-1 ring-line">{translate('copy.myPlans.allPlans')}</span>
      </div>

      <div aria-hidden="true" className="grid grid-cols-20 gap-1">
        {cells.map((status, index) => (
          <span
            key={index}
            style={{ animationDelay: status ? `${index * 22}ms` : `${(index * 137) % 1600}ms` }}
            className={cx('h-3.5 rounded-[3px]', status ? cx('zenith-pixel', statusMeta[status].cell) : 'zenith-twinkle bg-fg/10')}
          />
        ))}
      </div>

      <ul className="grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2">
        {legend.map((row, index) => (
          <li key={row.status} style={staggerStyle(index, 300)} className="flex animate-feed-in flex-col gap-2 motion-reduce:animate-none">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                {stepNumber(index)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{translate(row.labelKey)}</span>
                {row.captionKey && <span className="block truncate text-[11px] text-fg-subtle">{translate(row.captionKey)}</span>}
              </span>
              <span className="font-mono text-lg font-black text-fg tabular-nums">{counts[row.status]}</span>
            </div>
            <CapsuleTrack percent={total === 0 ? 0 : (counts[row.status] / total) * 100} cell={statusMeta[row.status].cell} delayMs={300 + index * 120} scan={row.status === 'approved'} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Plan capsules ───────────── */

function TicketField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={cx(captionClass, 'leading-tight')}>{label}</dt>
      <dd className="mt-1.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

function PairLabel({ topKey, bottomKey }: { topKey: MessageKey; bottomKey: MessageKey }) {
  return (
    <>
      {translate(topKey)}
      <span className="block tracking-[0.1em] text-fg-subtle/70">{translate(bottomKey)}</span>
    </>
  );
}

interface PlanHandlers {
  isPaused: boolean;
  onEdit: () => void;
  onPause: () => void;
  onResume: () => void;
}

function PlanTicket({ plan, index, handlers }: { plan: MasterPlanRow; index: number; handlers: PlanHandlers }) {
  const status = statusMeta[plan.status];
  const seatShare = plan.maxCopiers ? Math.min(100, (plan.copiers / plan.maxCopiers) * 100) : null;

  return (
    <li
      style={staggerStyle(index, 200)}
      className="group/plan relative grid animate-feed-in gap-5 rounded-[30px] bg-fg/[0.03] p-4 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none sm:p-5 xl:grid-cols-[16rem_minmax(0,1fr)_auto] xl:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10 text-base font-black uppercase transition-transform duration-300 group-hover/plan:-rotate-12 motion-reduce:transition-none')}>
            {plan.name.charAt(0)}
          </span>
          {!handlers.isPaused && plan.status === 'approved' && <RedDot className="absolute top-0.5 right-0.5" />}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-bold text-fg">{plan.name}</span>
            <span className="font-mono text-[10px] text-fg-subtle">
              <span className="sr-only">{translate('copy.myPlans.id')} </span>#{plan.id}
            </span>
          </p>
          {handlers.isPaused ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--zenith-red)]">
              <Icon name="pause" size={11} />
              {pausePlanCopy.paused}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span aria-hidden="true" className="size-1.5 animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
              {translate('copy.myPlans.copyingOn')}
            </p>
          )}
          <p className="mt-1.5">
            <span className="sr-only">{translate('copy.myPlans.status')}: </span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', status.chip)}>{translate(status.labelKey)}</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-dashed border-line pt-4 sm:grid-cols-3 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5 2xl:grid-cols-6">
        <TicketField label={translate('copy.myPlans.copiers')}>
          <span className="inline-flex items-center gap-1.5 font-mono font-bold tabular-nums">
            <Icon name="user" size={12} className="text-fg-subtle" />
            {plan.copiers} <span className="text-fg-subtle">/</span> {plan.maxCopiers ?? '∞'}
          </span>
          {seatShare !== null && (
            <span className="mt-1.5 block max-w-28">
              <CapsuleTrack percent={seatShare} cell="bg-fg" delayMs={200 + index * 80} />
            </span>
          )}
        </TicketField>
        <TicketField label={translate('copy.myPlans.aum')}>
          <span className="font-mono text-base font-black tabular-nums">{formatUsd(plan.aum)}</span>
        </TicketField>
        <TicketField label={translate('copy.myPlans.commission')}>
          <span className="block">{translate('copy.myPlans.commissionOnProfit', { percent: String(plan.commissionPercent) })}</span>
          <span className="mt-1 inline-block rounded-full px-2 py-px font-mono text-[10px] text-fg-muted ring-1 ring-line-strong">{plan.commissionBasis}</span>
        </TicketField>
        <TicketField label={<PairLabel topKey="copy.myPlans.subscriptionFee" bottomKey="copy.myPlans.billingPeriod" />}>
          <span className="block font-mono tabular-nums">{plan.subscriptionFee === null ? EMPTY_VALUE : formatUsd(plan.subscriptionFee)}</span>
          <span className="block text-xs text-fg-muted">{plan.billingPeriod ?? EMPTY_VALUE}</span>
        </TicketField>
        <TicketField label={<PairLabel topKey="copy.myPlans.tradingAccount" bottomKey="copy.myPlans.tradingServer" />}>
          <span className="block font-mono">{plan.tradingAccount}</span>
          <span className="block text-xs">
            <span className="font-semibold">{plan.serverName}</span> <span className="font-mono text-fg-muted">{plan.serverType}</span>
          </span>
        </TicketField>
        <TicketField label={translate('copy.myPlans.created')}>
          <span className="text-fg-muted tabular-nums">{createdFormat.format(new Date(`${plan.createdAt}T00:00:00Z`))}</span>
        </TicketField>
      </dl>

      <div role="group" aria-label={translate('copy.myPlans.actions')} className="flex items-center gap-2 xl:justify-end">
        <Link
          href={`/copy-trading/my-plans/${plan.id}`}
          aria-label={translate('copy.myPlans.view')}
          title={translate('copy.myPlans.view')}
          className="group/view relative grid size-10 place-items-center overflow-hidden rounded-full bg-fg text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Icon name="eye" size={15} className="relative" />
        </Link>
        <button type="button" aria-haspopup="dialog" onClick={handlers.onEdit} aria-label={translate('copy.myPlans.edit')} title={translate('copy.myPlans.edit')} className={actionClass}>
          <Icon name="pencil" size={15} />
        </button>
        {handlers.isPaused ? (
          <button
            type="button"
            onClick={handlers.onResume}
            aria-label={pausePlanCopy.resume}
            title={pausePlanCopy.resume}
            style={{ background: RED }}
            className={cx(actionClass, 'text-white ring-0 hover:text-white')}
          >
            <Icon name="play" size={14} />
          </button>
        ) : (
          <button type="button" aria-haspopup="dialog" onClick={handlers.onPause} aria-label={translate('copy.myPlans.pause')} title={translate('copy.myPlans.pause')} className={actionClass}>
            <Icon name="pause" size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

function EmptyPlans() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[30px] border border-dashed border-line-strong py-14 text-center">
      <span aria-hidden="true" className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
        <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
          <Icon name="search" size={17} />
        </span>
      </span>
      <p className="text-sm font-semibold text-fg">{translate('copy.myPlans.noMatch')}</p>
      <p className="text-sm text-fg-muted">{translate('copy.myPlans.subtitle')}</p>
    </div>
  );
}

function PagerButton({ label, icon, disabled, onClick }: { label: string; icon: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {icon}
    </button>
  );
}

/* ───────────── Page ───────────── */

export default function MyPlansPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('aum');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MasterPlanRow | null>(null);
  const [pausing, setPausing] = useState<MasterPlanRow | null>(null);
  const [pausedIds, setPausedIds] = useState<ReadonlySet<number>>(new Set());

  const setPaused = (planId: number, isPaused: boolean) =>
    setPausedIds((current) => {
      const next = new Set(current);
      if (isPaused) next.add(planId);
      else next.delete(planId);
      return next;
    });

  const counts = countByStatus(myPlans);
  const totalAum = myPlans.reduce((sum, plan) => sum + plan.aum, 0);
  const totalCopiers = myPlans.reduce((sum, plan) => sum + plan.copiers, 0);

  const filtered = (filter === 'all' ? myPlans : myPlans.filter((plan) => plan.status === filter)).toSorted(comparators[sortKey]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  function chooseFilter(next: StatusFilter) {
    setFilter(next);
    setPage(1);
  }

  function chooseSort(next: SortKey) {
    setSortKey(next);
    setPage(1);
  }

  // Skeleton: open header, open totals band (AUM + copiers | status matrix), filter rail, capsule list, pager.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div style={staggerStyle(0, 120)} className="zenith-tile">
          <TotalsFrost totalAum={totalAum} totalCopiers={totalCopiers} />
        </div>
        <StatusBreakdown counts={counts} total={myPlans.length} />
      </div>

      <section aria-label={translate('nav.copyMyPlans')} style={staggerStyle(2, 120)} className="zenith-tile flex flex-col gap-4">
        <div className="flex flex-col gap-3 border-y border-line py-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={translate('copy.myPlans.statusFilter')} className="flex flex-wrap gap-1.5">
            {filters.map((option) => {
              const isActive = filter === option.value;
              const count = option.value === 'all' ? myPlans.length : counts[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseFilter(option.value)}
                  className={cx(
                    'flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3.5 text-sm font-semibold transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-fg text-app shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)]' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  {translate(option.labelKey)}
                  <span
                    style={isActive ? { background: RED } : undefined}
                    className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] tabular-nums', isActive ? 'text-white' : 'bg-fg/10 text-fg-subtle')}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <Dropdown
            label={translate('copy.myPlans.sortLabel')}
            value={sortKey}
            options={[
              { value: 'newest', label: translate('copy.myPlans.sortNewest') },
              { value: 'name', label: translate('copy.myPlans.sortName') },
              { value: 'aum', label: translate('copy.myPlans.sortAum') },
            ]}
            onChange={chooseSort}
            icon="arrowsUpDown"
            className="lg:w-56"
          />
        </div>

        {pageItems.length === 0 ? (
          <EmptyPlans />
        ) : (
          <ol key={`${filter}-${sortKey}-${currentPage}`} className="flex flex-col gap-3">
            {pageItems.map((plan, index) => (
              <PlanTicket
                key={plan.id}
                plan={plan}
                index={index}
                handlers={{
                  isPaused: pausedIds.has(plan.id),
                  onEdit: () => setEditing(plan),
                  onPause: () => setPausing(plan),
                  onResume: () => setPaused(plan.id, false),
                }}
              />
            ))}
          </ol>
        )}

        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-fg-muted tabular-nums">
            {translate('copy.myPlans.showing', {
              from: String(filtered.length === 0 ? 0 : firstIndex + 1),
              to: String(firstIndex + pageItems.length),
              total: String(filtered.length),
            })}
          </p>
          <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-line">
            <PagerButton label={translate('pamm.explore.firstPage')} icon="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={translate('pamm.explore.prevPage')} icon="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('copy.myPlans.page')}
              <span className="grid size-7 place-items-center rounded-full bg-fg font-bold text-app tabular-nums">{currentPage}</span>/ {pageCount}
            </span>
            <PagerButton label={translate('pamm.explore.nextPage')} icon="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={translate('pamm.explore.lastPage')} icon="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </section>

      <EditPlanDialog plan={editing} onClose={() => setEditing(null)} />
      <PausePlanDialog
        plan={pausing}
        onClose={() => setPausing(null)}
        onPaused={(plan) => {
          setPaused(plan.id, true);
          setPausing(null);
        }}
      />
    </div>
  );
}
