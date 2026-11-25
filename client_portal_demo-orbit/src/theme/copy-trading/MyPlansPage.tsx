'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { DataTable, type Column } from '../ui/Table';
import { EditPlanDialog } from './EditPlanDialog';
import { PausePlanDialog } from './PausePlanDialog';
import { myPlans, pausePlanCopy, type MasterPlanRow, type PlanStatus } from './myPlansData';

type StatusFilter = 'all' | PlanStatus;
type SortKey = 'newest' | 'name' | 'aum';

const PAGE_SIZE = 10;
const EMPTY_VALUE = '–';
const STATUS_ORDER: PlanStatus[] = ['approved', 'pending', 'rejected', 'inactive'];

const statusMeta: Record<PlanStatus, { labelKey: MessageKey; badge: string; stroke: string; dot: string }> = {
  approved: { labelKey: 'copy.myPlans.approved', badge: 'bg-success/10 text-success ring-success/25', stroke: 'stroke-primary', dot: 'bg-primary' },
  pending: { labelKey: 'copy.myPlans.pendingReview', badge: 'bg-primary/10 text-primary ring-primary/25', stroke: 'stroke-primary/50', dot: 'bg-primary/50' },
  rejected: { labelKey: 'copy.myPlans.rejected', badge: 'bg-fg/[0.06] text-fg-muted ring-line-strong', stroke: 'stroke-fg/35', dot: 'bg-fg/35' },
  inactive: { labelKey: 'copy.myPlans.inactive', badge: 'bg-fg/[0.04] text-fg-subtle ring-line', stroke: 'stroke-fg/15', dot: 'bg-fg/15' },
};

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

function countByStatus(plans: MasterPlanRow[]): Record<PlanStatus, number> {
  const counts: Record<PlanStatus, number> = { approved: 0, pending: 0, rejected: 0, inactive: 0 };
  for (const plan of plans) counts[plan.status] += 1;
  return counts;
}

/* Status ring geometry (SVG units). */
const RING = { size: 168, radius: 70, stroke: 6, gap: 5 };
const RING_CIRCUMFERENCE = 2 * Math.PI * RING.radius;

interface RingSegment {
  status: PlanStatus;
  length: number;
  offset: number;
}

function buildSegments(counts: Record<PlanStatus, number>, total: number): RingSegment[] {
  if (total === 0) return [];
  const present = STATUS_ORDER.filter((status) => counts[status] > 0);
  const gap = present.length > 1 ? RING.gap : 0;
  return present.reduce<RingSegment[]>((segments, status) => {
    const previous = segments.at(-1);
    const offset = previous ? previous.offset + previous.length + gap : 0;
    segments.push({ status, offset, length: (counts[status] / total) * RING_CIRCUMFERENCE - gap });
    return segments;
  }, []);
}

/** Plan statuses as one thin ring with the total in the centre; a comet runs the outer orbit. */
function StatusRing({ counts, total }: { counts: Record<PlanStatus, number>; total: number }) {
  const center = RING.size / 2;
  return (
    <div className="relative size-42 shrink-0">
      <svg aria-hidden="true" viewBox={`0 0 ${RING.size} ${RING.size}`} className="size-full -rotate-90">
        <circle cx={center} cy={center} r={RING.radius + 12} fill="none" strokeWidth={1} strokeDasharray="2 6" className="stroke-primary/30" />
        <circle cx={center} cy={center} r={RING.radius} fill="none" strokeWidth={RING.stroke} className="stroke-fg/[0.07]" />
        {buildSegments(counts, total).map((segment) => (
          <circle
            key={segment.status}
            cx={center}
            cy={center}
            r={RING.radius}
            fill="none"
            strokeWidth={RING.stroke}
            strokeLinecap="round"
            strokeDasharray={`${segment.length} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={-segment.offset}
            className={cx('drop-shadow-[0_0_6px_var(--brand-primary)]', statusMeta[segment.status].stroke)}
          />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin-fast motion-reduce:animate-none">
        <span className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 translate-y-[0.3rem] rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)]" />
      </span>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{translate('copy.myPlans.totalPlans')}</span>
        <span className="font-mono text-4xl leading-tight font-semibold text-fg tabular-nums">{total}</span>
        <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/25">{translate('copy.myPlans.allPlans')}</span>
      </span>
    </div>
  );
}

function LegendRow({ status, count, labelKey, captionKey }: { status: PlanStatus; count: number; labelKey: MessageKey; captionKey?: MessageKey }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-fg/[0.03]">
      <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-full', statusMeta[status].dot)} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{translate(labelKey)}</span>
        {captionKey && <span className="block text-xs text-fg-subtle">{translate(captionKey)}</span>}
      </span>
      <span className="font-mono text-lg font-semibold text-fg tabular-nums">{count}</span>
    </li>
  );
}

function Readout({ icon, labelKey, captionKey, value }: { icon: IconName; labelKey: MessageKey; captionKey: MessageKey; value: string }) {
  return (
    <div className="relative isolate flex items-center gap-4 overflow-hidden rounded-[22px] border border-line bg-surface/70 p-4 backdrop-blur-xl sm:p-5">
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-12 -z-10 size-36 rounded-full border border-dashed border-primary/25" />
      <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-ping-soft rounded-2xl bg-primary/15 motion-reduce:animate-none" />
        <span className="relative grid size-12 place-items-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
          <Icon name={icon} size={20} />
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-fg-muted">{translate(labelKey)}</p>
        <p className="mt-0.5 font-mono text-2xl font-semibold text-fg tabular-nums">{value}</p>
      </div>
      <span className="ml-auto self-start rounded-md border border-line bg-fg/[0.03] px-2 py-0.5 text-[11px] text-fg-subtle">{translate(captionKey)}</span>
    </div>
  );
}

/** Header holding two related fields, one per line, so the table stays readable as plans pile up. */
function PairHeader({ topKey, bottomKey }: { topKey: MessageKey; bottomKey: MessageKey }) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{translate(topKey)}</span>
      <span className="font-medium tracking-[0.1em] text-fg-subtle/70">{translate(bottomKey)}</span>
    </span>
  );
}

interface PlanRowHandlers {
  pausedIds: ReadonlySet<number>;
  onEdit: (plan: MasterPlanRow) => void;
  onPause: (plan: MasterPlanRow) => void;
  onResume: (plan: MasterPlanRow) => void;
}

const actionButtonClass =
  'grid size-8 place-items-center rounded-xl border border-line bg-fg/[0.03] text-fg-muted transition-colors hover:border-primary/45 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function buildPlanColumns(handlers: PlanRowHandlers): Column<MasterPlanRow>[] {
  return [
    {
      key: 'plan',
      header: translate('copy.myPlans.plan'),
      render: (plan) => (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-orbit-spin-fast rounded-full border border-dashed border-primary/45 motion-reduce:animate-none" />
            <span className="grid size-8 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary uppercase ring-1 ring-primary/40">{plan.name.charAt(0)}</span>
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-fg">{plan.name}</span>
              <span className="rounded-md border border-line px-1.5 py-px font-mono text-[10px] text-fg-subtle">
                <span className="sr-only">{translate('copy.myPlans.id')} </span>#{plan.id}
              </span>
            </span>
            {handlers.pausedIds.has(plan.id) ? (
              <span className="flex items-center gap-1.5 text-xs text-warning">
                <Icon name="pause" size={11} />
                {pausePlanCopy.paused}
              </span>
            ) : (
              <span className="block text-xs text-fg-muted">{translate('copy.myPlans.copyingOn')}</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: translate('copy.myPlans.status'),
      render: (plan) => (
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', statusMeta[plan.status].badge)}>
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
          {translate(statusMeta[plan.status].labelKey)}
        </span>
      ),
    },
    {
      key: 'copiers',
      header: translate('copy.myPlans.copiers'),
      render: (plan) => (
        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
          <Icon name="user" size={13} className="text-primary" />
          {plan.copiers} <span className="text-fg-subtle">/</span> {plan.maxCopiers ?? '∞'}
        </span>
      ),
    },
    {
      key: 'aum',
      header: translate('copy.myPlans.aum'),
      render: (plan) => <span className="font-mono font-semibold tabular-nums">{formatUsd(plan.aum)}</span>,
    },
    {
      key: 'commission',
      header: translate('copy.myPlans.commission'),
      render: (plan) => (
        <span className="flex flex-col items-start gap-1">
          <span>{translate('copy.myPlans.commissionOnProfit', { percent: String(plan.commissionPercent) })}</span>
          <span className="rounded-md bg-primary/12 px-1.5 py-px font-mono text-[10px] font-medium text-primary ring-1 ring-primary/25">{plan.commissionBasis}</span>
        </span>
      ),
    },
    {
      key: 'billing',
      header: <PairHeader topKey="copy.myPlans.subscriptionFee" bottomKey="copy.myPlans.billingPeriod" />,
      render: (plan) => (
        <span className="flex flex-col">
          <span className="font-mono tabular-nums">{plan.subscriptionFee === null ? EMPTY_VALUE : formatUsd(plan.subscriptionFee)}</span>
          <span className="text-xs text-fg-muted">{plan.billingPeriod ?? EMPTY_VALUE}</span>
        </span>
      ),
    },
    {
      key: 'account',
      header: <PairHeader topKey="copy.myPlans.tradingAccount" bottomKey="copy.myPlans.tradingServer" />,
      render: (plan) => (
        <span className="flex flex-col">
          <span className="font-mono">{plan.tradingAccount}</span>
          <span className="text-xs">
            <span className="font-semibold text-fg">{plan.serverName}</span> <span className="font-mono text-primary">{plan.serverType}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'created',
      header: translate('copy.myPlans.created'),
      render: (plan) => <span className="text-fg-muted">{createdFormat.format(new Date(`${plan.createdAt}T00:00:00Z`))}</span>,
    },
    {
      key: 'actions',
      header: translate('copy.myPlans.actions'),
      align: 'right',
      render: (plan) => (
        <span role="group" aria-label={translate('copy.myPlans.actions')} className="inline-flex items-center gap-1.5">
          <Link
            href={`/copy-trading/my-plans/${plan.id}`}
            aria-label={translate('copy.myPlans.view')}
            title={translate('copy.myPlans.view')}
            className="grid size-8 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="eye" size={15} />
          </Link>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => handlers.onEdit(plan)}
            aria-label={translate('copy.myPlans.edit')}
            title={translate('copy.myPlans.edit')}
            className={actionButtonClass}
          >
            <Icon name="pencil" size={15} />
          </button>
          {handlers.pausedIds.has(plan.id) ? (
            <button
              type="button"
              onClick={() => handlers.onResume(plan)}
              aria-label={pausePlanCopy.resume}
              title={pausePlanCopy.resume}
              className="grid size-8 place-items-center rounded-xl border border-warning/40 bg-warning/10 text-warning transition-colors hover:bg-warning/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Icon name="play" size={14} />
            </button>
          ) : (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => handlers.onPause(plan)}
              aria-label={translate('copy.myPlans.pause')}
              title={translate('copy.myPlans.pause')}
              className={actionButtonClass}
            >
              <Icon name="pause" size={15} />
            </button>
          )}
        </span>
      ),
    },
  ];
}

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-primary/15 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {symbol}
    </button>
  );
}

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={translate('nav.copyMyPlans')}
        description={translate('copy.myPlans.subtitle')}
        actions={
          <Button type="button">
            <Icon name="plus" size={15} />
            {translate('copy.myPlans.createPlan')}
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative isolate flex animate-rise flex-col items-center gap-5 overflow-hidden rounded-[26px] border border-line bg-surface/70 p-5 backdrop-blur-xl motion-reduce:animate-none sm:flex-row sm:p-6">
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-20 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" />
          <StatusRing counts={counts} total={myPlans.length} />
          <ul className="flex w-full min-w-0 flex-1 flex-col gap-1">
            <LegendRow status="approved" count={counts.approved} labelKey="copy.myPlans.activePlans" captionKey="copy.myPlans.liveTrading" />
            <LegendRow status="pending" count={counts.pending} labelKey="copy.myPlans.pendingReview" captionKey="copy.myPlans.awaitingApproval" />
            <LegendRow status="rejected" count={counts.rejected} labelKey="copy.myPlans.rejected" />
            <LegendRow status="inactive" count={counts.inactive} labelKey="copy.myPlans.inactive" />
          </ul>
        </div>

        <div className="grid animate-rise gap-4 [animation-delay:90ms] motion-reduce:animate-none">
          <Readout icon="wallet" labelKey="copy.myPlans.totalAum" captionKey="copy.myPlans.acrossAllPlans" value={formatUsd(totalAum)} />
          <Readout icon="user" labelKey="copy.myPlans.totalCopiers" captionKey="copy.myPlans.subscribers" value={String(totalCopiers)} />
        </div>
      </section>

      {/* One glass console: status tabs + sort on top, the plans as floating table rows, pager at the foot. */}
      <section className="relative isolate animate-rise overflow-hidden rounded-[26px] border border-line bg-surface/70 backdrop-blur-xl [animation-delay:160ms] motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute -top-28 right-10 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={translate('copy.myPlans.statusFilter')} className="flex flex-wrap gap-1 rounded-2xl border border-line bg-fg/[0.03] p-1">
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
                    'flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-primary/20 text-fg shadow-[0_8px_18px_-12px_var(--brand-primary)] ring-1 ring-primary/45' : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg',
                  )}
                >
                  {translate(option.labelKey)}
                  <span
                    className={cx(
                      'min-w-5 rounded-md px-1.5 py-0.5 text-center font-mono text-[10px] tabular-nums',
                      isActive ? 'bg-primary text-on-primary' : 'bg-fg/[0.06] text-fg-subtle',
                    )}
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

        <div className="p-3 sm:px-4">
          <DataTable
            variant="cards"
            caption={translate('nav.copyMyPlans')}
            columns={buildPlanColumns({
              pausedIds,
              onEdit: setEditing,
              onPause: setPausing,
              onResume: (plan) => setPaused(plan.id, false),
            })}
            rows={pageItems}
            rowKey={(plan) => String(plan.id)}
            emptyTitle={translate('copy.myPlans.noMatch')}
            emptyDescription={translate('copy.myPlans.subtitle')}
          />
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <p className="text-sm text-fg-muted tabular-nums">
            {translate('copy.myPlans.showing', {
              from: String(filtered.length === 0 ? 0 : firstIndex + 1),
              to: String(firstIndex + pageItems.length),
              total: String(filtered.length),
            })}
          </p>
          <div className="flex items-center gap-1 rounded-full border border-fg/10 bg-fg/[0.03] p-1">
            <PagerButton label={translate('pamm.explore.firstPage')} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={translate('pamm.explore.prevPage')} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('copy.myPlans.page')}
              <span className="flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/25 font-semibold text-fg tabular-nums">{currentPage}</span>/ {pageCount}
            </span>
            <PagerButton label={translate('pamm.explore.nextPage')} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={translate('pamm.explore.lastPage')} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
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
