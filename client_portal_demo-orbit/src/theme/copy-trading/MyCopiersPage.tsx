'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, staggerStyle } from '../pamm/motion';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';

import { PageHeader } from '../ui/PageHeader';
import { DataTable, type Column } from '../ui/Table';
import { myCopiers, myCopiersCopy as copy, myCopiersTotals, type CopierStatus, type MasterCopierRow } from './myPlansData';
import { SubscriptionHistoryDialog } from './SubscriptionHistoryDialog';

type StatusFilter = 'all' | CopierStatus;

const PAGE_SIZE = 10;
const ALL_PLANS = 'all';
const NETWORK = { size: 240, inner: 58, outer: 96 } as const;

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

const statusMeta: Record<CopierStatus, { label: string; badge: string; dot: string; node: string }> = {
  active: { label: copy.statusActive, badge: 'bg-success/12 text-success ring-success/30', dot: 'bg-success', node: 'border-success/60 text-success' },
  pending: { label: copy.statusPending, badge: 'bg-warning/12 text-warning ring-warning/30', dot: 'bg-warning', node: 'border-warning/60 text-warning' },
  paused: { label: copy.statusPaused, badge: 'bg-info/12 text-info ring-info/30', dot: 'bg-info', node: 'border-info/60 text-info' },
  stopped: { label: copy.statusStopped, badge: 'bg-fg/[0.06] text-fg-muted ring-line', dot: 'bg-fg-subtle', node: 'border-dashed border-fg/25 text-fg-subtle' },
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
  rows.forEach((row) => {
    counts[row.status] += 1;
  });
  return counts;
}

function StatusBadge({ status }: { status: CopierStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', statusMeta[status].badge)}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusMeta[status].dot, status === 'active' && 'animate-pulse motion-reduce:animate-none')} />
      {statusMeta[status].label}
    </span>
  );
}

/** You at the centre, every copier as a node on the outer orbit; live links are solid, cut links dashed. */
function CopierNetwork({ copiers }: { copiers: MasterCopierRow[] }) {
  const center = NETWORK.size / 2;
  const nodes = copiers.map((copier, index) => {
    const angle = ((-90 + (index * 360) / Math.max(1, copiers.length)) * Math.PI) / 180;
    return { copier, x: center + NETWORK.outer * Math.cos(angle), y: center + NETWORK.outer * Math.sin(angle) };
  });
  const pct = (value: number) => `${(value / NETWORK.size) * 100}%`;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-60 shrink-0">
      <svg aria-hidden="true" viewBox={`0 0 ${NETWORK.size} ${NETWORK.size}`} className="absolute inset-0 size-full">
        <circle cx={center} cy={center} r={NETWORK.outer} fill="none" strokeWidth={1} strokeDasharray="2 6" className="stroke-primary/30" />
        <circle cx={center} cy={center} r={NETWORK.inner} fill="none" strokeWidth={1} className="stroke-fg/[0.08]" />
        {nodes.map(({ copier, x, y }) => (
          <line
            key={copier.id}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            strokeWidth={1.5}
            strokeDasharray={copier.status === 'active' ? undefined : '3 5'}
            className={copier.status === 'active' ? 'stroke-primary/60' : 'stroke-fg/20'}
          />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute animate-orbit-spin-fast motion-reduce:animate-none" style={{ inset: pct(center - NETWORK.outer) }}>
        <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
      </span>

      <span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
        <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/10 motion-reduce:animate-none" />
        <span className="relative text-center">
          <Icon name="trendUp" size={16} className="mx-auto text-primary" />
          <span className="block text-[10px] font-semibold tracking-[0.12em] text-fg-muted uppercase">{copy.you}</span>
        </span>
      </span>

      {nodes.map(({ copier, x, y }, index) => (
        <span
          key={copier.id}
          title={`${copier.name} · ${statusMeta[copier.status].label}`}
          style={{ left: pct(x), top: pct(y), ...staggerStyle(index, 300) }}
          className={cx(
            'absolute grid size-10 -translate-x-1/2 -translate-y-1/2 animate-rise place-items-center rounded-full border-2 bg-surface text-xs font-bold uppercase motion-reduce:animate-none',
            statusMeta[copier.status].node,
          )}
        >
          {copier.name.charAt(0)}
          <span aria-hidden="true" className={cx('absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface', statusMeta[copier.status].dot)} />
        </span>
      ))}
      <span className="sr-only">
        {copy.network}: {copiers.map((copier) => `${copier.name} (${statusMeta[copier.status].label})`).join(', ')}
      </span>
    </div>
  );
}

function TotalRow({ icon, label, caption, value, tone, index }: { icon: IconName; label: string; caption: string; value: number; tone?: string; index: number }) {
  const isCount = icon === 'user';
  return (
    <li
      style={staggerStyle(index, 120)}
      className="group/total flex animate-rise items-center gap-3.5 border-b border-dashed border-line py-3 last:border-b-0 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover/total:-rotate-12">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="text-[11px] text-fg-subtle">{caption}</span>
      </span>
      <span className={cx('font-mono text-lg font-semibold tabular-nums', tone ?? 'text-fg')}>
        <CountUp value={value} format={(current) => (isCount ? String(Math.round(current)) : formatUsd(current))} />
      </span>
    </li>
  );
}

function PairHeader({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{top}</span>
      <span className="font-medium tracking-[0.1em] text-fg-subtle/70">{bottom}</span>
    </span>
  );
}

function buildColumns(onView: (copier: MasterCopierRow) => void): Column<MasterCopierRow>[] {
  return [
    {
      key: 'copier',
      header: copy.copier,
      render: (copier) => (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-full border-2 bg-surface text-xs font-bold uppercase', statusMeta[copier.status].node)}>
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
          <span className="w-fit rounded-md bg-primary/12 px-1.5 py-px font-mono text-xs text-primary ring-1 ring-primary/25">{copier.commissionRate}%</span>
          <span className="mt-0.5 font-mono text-xs text-fg-muted tabular-nums">{formatUsd(copier.estimatedCommission)}</span>
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
          className="inline-grid size-8 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-primary/15 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
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

  const totals: { icon: IconName; label: string; caption: string; value: number; tone?: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: myCopiersTotals.activeCopiers },
    { icon: 'wallet', label: copy.totalCapital, caption: copy.investedFunds, value: myCopiersTotals.totalCapital },
    { icon: 'trendUp', label: copy.totalPnl, caption: copy.realized, value: myCopiersTotals.totalPnl, tone: 'text-success' },
    { icon: 'clock', label: copy.estimatedCommission, caption: copy.projected, value: myCopiersTotals.estimatedCommission },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settled, value: myCopiersTotals.commissionEarned, tone: 'text-success' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.copyMyCopiers')} description={copy.subtitle} />

      <section className="relative isolate grid animate-rise gap-6 overflow-hidden rounded-[26px] border border-line bg-surface/70 p-5 backdrop-blur-xl motion-reduce:animate-none sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-16 -z-10 size-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <CopierNetwork copiers={myCopiers} />
          <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-1">
            {filters.slice(1).map((option) => {
              const status = option.value as CopierStatus;
              return (
                <li key={status} className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm">
                  <span aria-hidden="true" className={cx('size-2.5 rounded-full', statusMeta[status].dot)} />
                  <span className="flex-1 text-fg-muted">{option.label}</span>
                  <span className="font-mono font-semibold text-fg tabular-nums">{counts[status]}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <ul className="flex flex-col lg:border-l lg:border-line lg:pl-6">
          {totals.map((total, index) => (
            <TotalRow key={total.label} index={index} {...total} />
          ))}
        </ul>
      </section>

      <section className="relative isolate animate-rise overflow-hidden rounded-[26px] border border-line bg-surface/70 backdrop-blur-xl [animation-delay:160ms] motion-reduce:animate-none">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={copy.statusFilter} className="flex flex-wrap gap-1 rounded-2xl border border-line bg-fg/[0.03] p-1">
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
                    'flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-[color,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-primary/20 text-fg ring-1 ring-primary/45' : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg',
                  )}
                >
                  {option.label}
                  <span className={cx('min-w-5 rounded-md px-1.5 py-0.5 text-center font-mono text-[10px] tabular-nums', isActive ? 'bg-primary text-on-primary' : 'bg-fg/[0.06] text-fg-subtle')}>
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

        <div className="p-3 sm:px-4">
          <DataTable
            variant="cards"
            caption={translate('nav.copyMyCopiers')}
            columns={buildColumns(setViewing)}
            rows={pageItems}
            rowKey={(copier) => copier.id}
            emptyTitle={copy.noMatch}
            emptyDescription={copy.noMatchText}
          />
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-line px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <p className="text-sm text-fg-muted tabular-nums">
            {copy.showing} {filtered.length === 0 ? 0 : firstIndex + 1}–{firstIndex + pageItems.length} {copy.of} {filtered.length}
          </p>
          <div className="flex items-center gap-1 rounded-full border border-fg/10 bg-fg/[0.03] p-1">
            <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {copy.page}
              <span className="flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/25 font-semibold text-fg tabular-nums">{currentPage}</span>/ {pageCount}
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
