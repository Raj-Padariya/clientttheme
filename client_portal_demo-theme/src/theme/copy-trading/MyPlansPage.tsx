'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { DataTable, type Column } from '../ui/Table';
import { EditPlanDialog } from './EditPlanDialog';
import { myPlans, pausePlanCopy, planDetailCopy, type MasterPlanRow, type PlanStatus } from './myPlansData';
import { PausePlanDialog } from './PausePlanDialog';

type StatusFilter = 'all' | PlanStatus;
type SortKey = 'newest' | 'name' | 'aum';

const PAGE_SIZE = 10;
const EMPTY_VALUE = '–';
const STATUS_ORDER: PlanStatus[] = ['approved', 'pending', 'rejected', 'inactive'];

const statusMeta: Record<PlanStatus, { labelKey: MessageKey; badge: string; bar: string }> = {
  approved: { labelKey: 'copy.myPlans.approved', badge: 'bg-success/10 text-success ring-success/25', bar: 'bg-primary' },
  pending: { labelKey: 'copy.myPlans.pendingReview', badge: 'bg-primary/10 text-primary ring-primary/25', bar: 'bg-primary/50' },
  rejected: { labelKey: 'copy.myPlans.rejected', badge: 'bg-danger/10 text-danger ring-danger/25', bar: 'bg-danger/50' },
  inactive: { labelKey: 'copy.myPlans.inactive', badge: 'bg-fg/[0.05] text-fg-subtle ring-line', bar: 'bg-fg/20' },
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

function StatusBadge({ status }: { status: PlanStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', statusMeta[status].badge)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {translate(statusMeta[status].labelKey)}
    </span>
  );
}

/** Two stacked header labels for columns that show two values. */
function PairHeader({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{top}</span>
      <span className="font-normal text-fg-subtle">{bottom}</span>
    </span>
  );
}

function SummaryFigure({ icon, label, caption, value }: { icon: IconName; label: string; caption: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface-2/50 p-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-fg-muted">{label}</p>
        <p className="truncate text-[11px] text-fg-subtle">{caption}</p>
      </div>
      <span className="font-mono text-lg font-semibold text-fg tabular-nums">{value}</span>
    </div>
  );
}

interface RowHandlers {
  pausedIds: ReadonlySet<number>;
  onEdit: (plan: MasterPlanRow) => void;
  onPause: (plan: MasterPlanRow) => void;
  onResume: (plan: MasterPlanRow) => void;
}

const actionClass =
  'inline-grid size-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function buildPlanColumns(handlers: RowHandlers): Column<MasterPlanRow>[] {
  return [
    {
      key: 'plan',
      header: translate('copy.myPlans.plan'),
      render: (plan) => (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary">
            {plan.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-fg">{plan.name}</span>
              <span className="font-mono text-[10px] text-fg-subtle">
                <span className="sr-only">{translate('copy.myPlans.id')} </span>#{plan.id}
              </span>
            </span>
            {handlers.pausedIds.has(plan.id) ? (
              <span className="flex items-center gap-1 text-xs text-warning">
                <Icon name="pause" size={11} />
                {pausePlanCopy.paused}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                {translate('copy.myPlans.copyingOn')}
              </span>
            )}
          </span>
        </span>
      ),
    },
    { key: 'status', header: translate('copy.myPlans.status'), render: (plan) => <StatusBadge status={plan.status} /> },
    {
      key: 'copiers',
      header: translate('copy.myPlans.copiers'),
      render: (plan) => (
        <span className="font-mono tabular-nums">
          {plan.copiers} <span className="text-fg-subtle">/</span> {plan.maxCopiers ?? '∞'}
        </span>
      ),
    },
    { key: 'aum', header: translate('copy.myPlans.aum'), render: (plan) => <span className="font-mono font-semibold tabular-nums">{formatUsd(plan.aum)}</span> },
    {
      key: 'commission',
      header: translate('copy.myPlans.commission'),
      render: (plan) => (
        <span className="flex flex-col">
          <span className="text-sm text-fg">{translate('copy.myPlans.commissionOnProfit', { percent: plan.commissionPercent })}</span>
          <span className="w-fit font-mono text-[10px] text-primary uppercase">{plan.commissionBasis}</span>
        </span>
      ),
    },
    {
      key: 'fee',
      header: <PairHeader top={translate('copy.myPlans.subscriptionFee')} bottom={translate('copy.myPlans.billingPeriod')} />,
      render: (plan) => (
        <span className="flex flex-col">
          <span className="font-mono tabular-nums">{plan.subscriptionFee === null ? EMPTY_VALUE : formatUsd(plan.subscriptionFee)}</span>
          <span className="text-xs text-fg-muted">{plan.billingPeriod ?? EMPTY_VALUE}</span>
        </span>
      ),
    },
    {
      key: 'account',
      header: <PairHeader top={translate('copy.myPlans.tradingAccount')} bottom={translate('copy.myPlans.tradingServer')} />,
      render: (plan) => (
        <span className="flex flex-col">
          <span className="font-mono text-sm">{plan.tradingAccount}</span>
          <span className="text-xs text-fg-muted">
            {plan.serverName} · <span className="font-mono">{plan.serverType}</span>
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
      render: (plan) => {
        const isPaused = handlers.pausedIds.has(plan.id);
        return (
          <span className="inline-flex items-center gap-1.5">
            <Link href={`/copy-trading/my-plans/${plan.id}`} aria-label={translate('copy.myPlans.view')} title={translate('copy.myPlans.view')} className={actionClass}>
              <Icon name="eye" size={15} />
            </Link>
            <button type="button" aria-haspopup="dialog" aria-label={translate('copy.myPlans.edit')} title={translate('copy.myPlans.edit')} onClick={() => handlers.onEdit(plan)} className={actionClass}>
              <Icon name="edit" size={15} />
            </button>
            {isPaused ? (
              <button type="button" aria-label={pausePlanCopy.resume} title={pausePlanCopy.resume} onClick={() => handlers.onResume(plan)} className={cx(actionClass, 'border-warning/40 text-warning')}>
                <Icon name="refresh" size={15} />
              </button>
            ) : (
              <button type="button" aria-haspopup="dialog" aria-label={translate('copy.myPlans.pause')} title={translate('copy.myPlans.pause')} onClick={() => handlers.onPause(plan)} className={actionClass}>
                <Icon name="pause" size={15} />
              </button>
            )}
          </span>
        );
      },
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
      className="grid size-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {symbol}
    </button>
  );
}

export default function MyPlansPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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

  const filtered = myPlans.filter((plan) => statusFilter === 'all' || plan.status === statusFilter).sort(comparators[sortKey]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  const columns = buildPlanColumns({
    pausedIds,
    onEdit: setEditing,
    onPause: setPausing,
    onResume: (plan) => setPaused(plan.id, false),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={translate('nav.copyMyPlans')}
        description={translate('copy.myPlans.subtitle')}
        actions={
          <Button leftIcon="plus">{translate('copy.myPlans.createPlan')}</Button>
        }
      />

      <Card className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col justify-between gap-5 rounded-md border border-primary/25 bg-primary/[0.06] p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-fg-muted">
              <Icon name="wallet" size={16} className="text-primary" />
              {translate('copy.myPlans.totalAum')}
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-fg tabular-nums sm:text-4xl">{formatUsd(totalAum)}</p>
            <p className="mt-1 text-xs text-fg-subtle">{translate('copy.myPlans.acrossAllPlans')}</p>
          </div>
          <div>
            <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-fg/[0.06]">
              {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
                <span key={status} className={cx('h-full', statusMeta[status].bar)} style={{ width: `${(counts[status] / Math.max(1, myPlans.length)) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
              {STATUS_ORDER.map((status) => (
                <li key={status} className="flex items-center gap-1.5 text-fg-muted">
                  <span aria-hidden="true" className={cx('size-2 rounded-full', statusMeta[status].bar)} />
                  {translate(statusMeta[status].labelKey)}
                  <span className="font-mono font-semibold text-fg tabular-nums">{counts[status]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryFigure icon="pieChart" label={translate('copy.myPlans.totalPlans')} caption={translate('copy.myPlans.allPlans')} value={String(myPlans.length)} />
          <SummaryFigure icon="signalBars" label={translate('copy.myPlans.activePlans')} caption={translate('copy.myPlans.liveTrading')} value={String(counts.approved)} />
          <SummaryFigure icon="clock" label={translate('copy.myPlans.pendingReview')} caption={translate('copy.myPlans.awaitingApproval')} value={String(counts.pending)} />
          <SummaryFigure icon="user" label={translate('copy.myPlans.totalCopiers')} caption={translate('copy.myPlans.subscribers')} value={String(totalCopiers)} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={translate('copy.myPlans.statusFilter')} className="flex flex-wrap gap-1.5">
            {filters.map((filter) => {
              const isActive = statusFilter === filter.value;
              const count = filter.value === 'all' ? myPlans.length : counts[filter.value];
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  className={cx(
                    'flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive ? 'border-primary bg-primary text-on-primary' : 'border-line text-fg-muted hover:border-primary/50 hover:text-fg',
                  )}
                >
                  {translate(filter.labelKey)}
                  <span className={cx('font-mono text-[11px] tabular-nums', isActive ? 'text-on-primary/80' : 'text-fg-subtle')}>{count}</span>
                </button>
              );
            })}
          </div>
          <Dropdown<SortKey>
            label={translate('copy.myPlans.sortLabel')}
            icon="arrowsUpDown"
            value={sortKey}
            onChange={(next) => {
              setSortKey(next);
              setPage(1);
            }}
            options={[
              { value: 'aum', label: translate('copy.myPlans.sortAum') },
              { value: 'newest', label: translate('copy.myPlans.sortNewest') },
              { value: 'name', label: translate('copy.myPlans.sortName') },
            ]}
            className="lg:w-56"
          />
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            columns={columns}
            rows={pageItems}
            rowKey={(plan) => String(plan.id)}
            caption={translate('nav.copyMyPlans')}
            emptyTitle={translate('copy.myPlans.noMatch')}
            emptyDescription=""
          />
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <p className="text-sm text-fg-muted tabular-nums">
            {translate('copy.myPlans.showing', {
              from: filtered.length === 0 ? 0 : firstIndex + 1,
              to: firstIndex + pageItems.length,
              total: filtered.length,
            })}
          </p>
          <div className="flex items-center gap-1.5">
            <PagerButton label={planDetailCopy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={planDetailCopy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="px-2 text-sm text-fg-muted tabular-nums">
              {translate('copy.myPlans.page')} <span className="font-semibold text-primary">{currentPage}</span> / {pageCount}
            </span>
            <PagerButton label={planDetailCopy.nextPage} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={planDetailCopy.lastPage} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </Card>

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
