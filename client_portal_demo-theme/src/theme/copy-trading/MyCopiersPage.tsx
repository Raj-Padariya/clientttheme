'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { DataTable, type Column } from '../ui/Table';
import { myCopiers, myCopiersCopy as copy, myCopiersTotals, type CopierStatus, type MasterCopierRow } from './myPlansData';
import { SubscriptionHistoryDialog } from './SubscriptionHistoryDialog';

type StatusFilter = 'all' | CopierStatus;

const PAGE_SIZE = 10;
const ALL_PLANS = 'all';
const STATUS_ORDER: CopierStatus[] = ['active', 'pending', 'paused', 'stopped'];

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

const statusMeta: Record<CopierStatus, { label: string; badge: string; dot: string; chip: string }> = {
  active: { label: copy.statusActive, badge: 'bg-success/10 text-success ring-success/25', dot: 'bg-success', chip: 'border-success/50' },
  pending: { label: copy.statusPending, badge: 'bg-warning/10 text-warning ring-warning/25', dot: 'bg-warning', chip: 'border-warning/50' },
  paused: { label: copy.statusPaused, badge: 'bg-primary/10 text-primary ring-primary/25', dot: 'bg-primary', chip: 'border-primary/50' },
  stopped: { label: copy.statusStopped, badge: 'bg-fg/[0.05] text-fg-muted ring-line', dot: 'bg-fg-subtle', chip: 'border-dashed border-line-strong' },
};

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: copy.filterAll },
  { value: 'active', label: copy.filterActive },
  { value: 'pending', label: copy.filterPending },
  { value: 'paused', label: copy.filterPaused },
  { value: 'stopped', label: copy.filterStopped },
];

function countByStatus(rows: MasterCopierRow[]): Record<CopierStatus, number> {
  const counts: Record<CopierStatus, number> = { active: 0, pending: 0, paused: 0, stopped: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

function StatusBadge({ status }: { status: CopierStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', statusMeta[status].badge)}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusMeta[status].dot)} />
      {statusMeta[status].label}
    </span>
  );
}

function PairHeader({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{top}</span>
      <span className="font-normal text-fg-subtle">{bottom}</span>
    </span>
  );
}

/** "You" as the root of a branch list: each copier hangs off the trunk; stopped links are dashed. */
function CopierNetwork({ copiers, counts }: { copiers: MasterCopierRow[]; counts: Record<CopierStatus, number> }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-fg">{copy.network}</p>
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-[11px] font-bold tracking-wider text-primary uppercase">{copy.you}</span>
        <ul className="relative flex min-w-0 flex-1 flex-col gap-2 pt-1 pl-5">
          <span aria-hidden="true" className="absolute top-0 bottom-5 left-0 w-px bg-line-strong" />
          {copiers.map((copier) => (
            <li key={copier.id} className="relative">
              <span aria-hidden="true" className={cx('absolute top-1/2 -left-5 w-5 border-t', copier.status === 'active' ? 'border-primary/60' : 'border-dashed border-fg/25')} />
              <span className={cx('flex items-center gap-2.5 rounded-md border bg-surface px-3 py-2', statusMeta[copier.status].chip)}>
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary uppercase">{copier.name.charAt(0)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{copier.name}</span>
                <StatusBadge status={copier.status} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="rounded-md border border-line px-3 py-2">
            <dt className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span aria-hidden="true" className={cx('size-2 rounded-full', statusMeta[status].dot)} />
              {filters.find((option) => option.value === status)?.label}
            </dt>
            <dd className="font-mono text-lg font-semibold text-fg tabular-nums">{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function buildColumns(onView: (copier: MasterCopierRow) => void): Column<MasterCopierRow>[] {
  return [
    {
      key: 'copier',
      header: copy.copier,
      render: (copier) => (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-md border bg-surface-2 text-xs font-bold text-primary uppercase', statusMeta[copier.status].chip)}>
            {copier.name.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-fg">{copier.name}</span>
            <span className="block truncate text-xs text-fg-muted">{copier.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'account',
      header: <PairHeader top={copy.account} bottom={copy.plan} />,
      render: (copier) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs">{copier.account}</span>
          <Link href={`/copy-trading/my-plans/${copier.planId}`} className="w-fit text-xs text-primary underline-offset-2 hover:underline">
            {copier.planName}
          </Link>
        </span>
      ),
    },
    { key: 'status', header: copy.status, render: (copier) => <StatusBadge status={copier.status} /> },
    {
      key: 'capital',
      header: <PairHeader top={copy.capital} bottom={copy.open} />,
      render: (copier) => (
        <span className="flex flex-col">
          <span className="font-mono tabular-nums">{formatUsd(copier.capital)}</span>
          <span className="font-mono text-xs text-fg-muted tabular-nums">{copier.openTrades}</span>
        </span>
      ),
    },
    {
      key: 'pnl',
      header: <PairHeader top={copy.pnl} bottom={copy.netPnl} />,
      render: (copier) => (
        <span className="flex flex-col font-mono tabular-nums">
          <span className={toneOf(copier.pnl)}>{formatUsd(copier.pnl)}</span>
          <span className={cx('text-xs', toneOf(copier.netPnl))}>{formatUsd(copier.netPnl)}</span>
        </span>
      ),
    },
    {
      key: 'commission',
      header: <PairHeader top={copy.commissionRate} bottom={copy.estimated} />,
      render: (copier) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-primary">{copier.commissionRate}%</span>
          <span className="font-mono text-xs text-fg-muted tabular-nums">{formatUsd(copier.estimatedCommission)}</span>
        </span>
      ),
    },
    { key: 'method', header: copy.method, render: (copier) => <span className="text-xs text-fg-muted">{copier.method}</span> },
    { key: 'updated', header: copy.lastUpdate, render: (copier) => <span className="text-xs text-fg-muted">{copier.lastUpdate}</span> },
    {
      key: 'actions',
      header: copy.actions,
      align: 'right',
      render: (copier) => (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${copy.view}: ${copier.name}`}
          title={copy.view}
          onClick={() => onView(copier)}
          className="inline-grid size-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="eye" size={15} />
        </button>
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
      className="grid size-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {symbol}
    </button>
  );
}

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

  const totals: { icon: IconName; label: string; caption: string; value: string; tone?: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: String(myCopiersTotals.activeCopiers) },
    { icon: 'wallet', label: copy.totalCapital, caption: copy.investedFunds, value: formatUsd(myCopiersTotals.totalCapital) },
    { icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: formatUsd(myCopiersTotals.totalPnl), tone: 'text-success' },
    { icon: 'clock', label: copy.estimatedCommission, caption: copy.projected, value: formatUsd(myCopiersTotals.estimatedCommission) },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settled, value: formatUsd(myCopiersTotals.commissionEarned), tone: 'text-success' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.copyMyCopiers')} description={copy.subtitle} />

      <Card padded={false} className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="p-5 sm:p-6">
          <CopierNetwork copiers={myCopiers} counts={counts} />
        </div>
        <ul className="flex flex-col divide-y divide-line border-t border-line bg-surface-2/40 lg:border-t-0 lg:border-l">
          {totals.map((total) => (
            <li key={total.label} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                <Icon name={total.icon} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{total.label}</span>
                <span className="block text-[11px] text-fg-subtle">{total.caption}</span>
              </span>
              <span className={cx('font-mono text-lg font-semibold tabular-nums', total.tone ?? 'text-fg')}>{total.value}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
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
                    'flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive ? 'border-primary bg-primary text-on-primary' : 'border-line text-fg-muted hover:border-primary/50 hover:text-fg',
                  )}
                >
                  {option.label}
                  <span className={cx('font-mono text-[11px] tabular-nums', isActive ? 'text-on-primary/80' : 'text-fg-subtle')}>{count}</span>
                </button>
              );
            })}
          </div>
          <Dropdown
            label={copy.planFilter}
            icon="filter"
            value={planFilter}
            onChange={(next) => {
              setPlanFilter(next);
              setPage(1);
            }}
            options={[{ value: ALL_PLANS, label: copy.allPlans }, ...plans.map(([id, name]) => ({ value: String(id), label: name }))]}
            className="lg:w-56"
          />
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            columns={buildColumns(setViewing)}
            rows={pageItems}
            rowKey={(copier) => copier.id}
            caption={translate('nav.copyMyCopiers')}
            emptyTitle={copy.noMatch}
            emptyDescription={copy.noMatchText}
          />
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <p className="text-sm text-fg-muted tabular-nums">
            {copy.showing} {filtered.length === 0 ? 0 : firstIndex + 1}–{firstIndex + pageItems.length} {copy.of} {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="px-2 text-sm text-fg-muted tabular-nums">
              {copy.page} <span className="font-semibold text-primary">{currentPage}</span> / {pageCount}
            </span>
            <PagerButton label={copy.nextPage} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={copy.lastPage} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </Card>

      <SubscriptionHistoryDialog copier={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
