'use client';

import { useState, type FormEvent } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useWalletHistory } from '@/core/pages/useWalletHistory';
import type { RequestStatus, Transaction, TransactionType } from '@/core/types';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { DateRangePicker } from '../ui/DateRangePicker';
import { Dropdown } from '../ui/Dropdown';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { EmptyDash, signedAmount, statusDropdownOptions, typeDropdownOptions, typeTone, ViewButton } from './HistoryPage';
import { LedgerRow, ledgerCaptionClass as captionClass, statusAccent, type Accent } from './Ledger';

const PAGE_SIZE = 10;
const BALANCE_COUNT_MS = 1400;


const rejectionText = {
  title: 'Rejection reason',
  transaction: 'Transaction',
  reasonLabel: 'Reason',
  noReason: 'No reason was provided for this rejection.',
  stamp: 'REJECTED',
  close: 'Close',
};

const flowText = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
};


/** Balance capsule with a turning gold rim and a counting-up figure. */
function BalanceCapsule({ balance, currency }: { balance: number; currency: string }) {
  const shown = useAnimatedNumber(balance, BALANCE_COUNT_MS);
  return (
    <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_14px_32px_-18px_var(--brand-primary)]">
      <span aria-hidden="true" className="absolute top-1/2 left-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 animate-orbit bg-[conic-gradient(var(--brand-primary),transparent_30%,transparent_70%,var(--brand-primary))] [animation-duration:5s] motion-reduce:animate-none" />
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[calc(1rem-1px)] bg-surface py-2 pr-4 pl-2">
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span className="relative flex size-9 shrink-0 animate-float items-center justify-center rounded-xl text-on-primary shadow-[0_0_18px_-6px_var(--brand-primary)] [animation-duration:4s] [background-image:var(--brand-gradient)] motion-reduce:animate-none">
          <Icon name="wallet" size={17} />
        </span>
        <div className="relative min-w-0">
          <p className="text-[10.5px] tracking-[0.1em] text-fg-subtle uppercase">{translate('walletHistory.currentBalance')}</p>
          <p className="text-base font-bold text-fg tabular-nums">{formatMoney(shown, currency)}</p>
        </div>
      </div>
    </div>
  );
}

/** Split bar of approved / pending / rejected amounts across the filtered entries. */
function FlowMeter({ entries }: { entries: Transaction[] }) {
  const sumOf = (accent: Accent) => entries.filter((tx) => statusAccent(tx.status) === accent).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const segments: { accent: Accent; label: string; amount: number; bar: string; dot: string }[] = [
    { accent: 'success', label: flowText.approved, amount: sumOf('success'), bar: 'bg-success', dot: 'bg-success' },
    { accent: 'warning', label: flowText.pending, amount: sumOf('warning'), bar: 'bg-warning', dot: 'bg-warning' },
    { accent: 'danger', label: flowText.rejected, amount: sumOf('danger'), bar: 'bg-danger/70', dot: 'bg-danger' },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const currency = entries[0]?.currency;
  if (total <= 0) return null;

  return (
    <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4 sm:px-6">
      <div aria-hidden="true" className="flex h-2 w-full gap-1 overflow-hidden rounded-full bg-fg/5">
        {segments
          .filter((segment) => segment.amount > 0)
          .map((segment, index) => (
            <span
              key={segment.accent}
              style={{ width: `${(segment.amount / total) * 100}%`, animationDelay: `${0.3 + index * 0.2}s` }}
              className={cx('relative h-full origin-left animate-grow overflow-hidden rounded-full motion-reduce:animate-none', segment.bar)}
            >
              <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
            </span>
          ))}
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {segments.map((segment) => (
          <div key={segment.accent} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-2 rounded-full', segment.dot)} />
            <dt className="text-fg-muted">{segment.label}</dt>
            <dd className="font-semibold text-fg tabular-nums">{currency ? formatMoney(segment.amount, currency) : segment.amount}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface WalletFilters {
  fromDate: string;
  toDate: string;
  type: TransactionType | 'all';
  status: RequestStatus | 'all';
}

const emptyFilters: WalletFilters = { fromDate: '', toDate: '', type: 'all', status: 'all' };

// Dates are compared as YYYY-MM-DD strings, which sort the same way as the dates themselves.
function matchesFilters(tx: Transaction, filters: WalletFilters): boolean {
  const day = tx.createdAt.slice(0, 10);
  if (filters.fromDate && day < filters.fromDate) return false;
  if (filters.toDate && day > filters.toDate) return false;
  if (filters.type !== 'all' && tx.type !== filters.type) return false;
  if (filters.status !== 'all' && tx.status !== filters.status) return false;
  return true;
}

export default function WalletHistoryPage() {
  const { data, isLoading } = useWalletHistory();
  const [draft, setDraft] = useState<WalletFilters>(emptyFilters);
  const [applied, setApplied] = useState<WalletFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Transaction | null>(null);

  const filtered = data?.entries.filter((tx) => matchesFilters(tx, applied));
  const pageCount = Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered?.slice(firstIndex, firstIndex + PAGE_SIZE);

  function updateDraft<K extends keyof WalletFilters>(key: K, value: WalletFilters[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied(draft);
    setPage(1);
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <form
        onSubmit={applyFilters}
        aria-label={translate('history.filtersLabel')}
        className="glass glass-strong relative isolate z-10 animate-rise rounded-[28px] p-4 motion-reduce:animate-none sm:p-5"
      >
        {/* The glow is clipped by its own wrapper so the form itself can let the calendar and dropdown lists overflow. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[28px]">
          <span className="absolute -top-32 -right-24 size-80 rounded-full bg-primary/15 blur-3xl" />
        </span>

        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name="filter" size={15} />
          </span>
          <h2 className="text-base font-semibold text-fg">{translate('history.filtersTitle')}</h2>
        </div>

        <div className="mt-4 grid gap-1 rounded-[22px] border border-line bg-surface/50 p-1.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-center">
          <DateRangePicker
            id="wallet-history-dates"
            className="sm:col-span-2 xl:col-span-1"
            fromLabel={translate('history.fromDate')}
            toLabel={translate('history.toDate')}
            value={{ from: draft.fromDate, to: draft.toDate }}
            onChange={(range) => setDraft((current) => ({ ...current, fromDate: range.from, toDate: range.to }))}
          />
          <Dropdown
            id="wallet-history-type"
            variant="segment"
            icon="transfer"
            label={translate('history.type')}
            value={draft.type}
            options={typeDropdownOptions}
            onChange={(value) => updateDraft('type', value)}
          />
          <Dropdown
            id="wallet-history-status"
            variant="segment"
            icon="checkCircle"
            label={translate('history.status')}
            value={draft.status}
            options={statusDropdownOptions}
            onChange={(value) => updateDraft('status', value)}
          />
          <div className="flex items-center justify-end gap-2 p-1.5 sm:col-span-2 xl:col-span-1">
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              {translate('datePicker.clear')}
            </Button>
            <Button type="submit" size="sm" leftIcon="filter">
              {translate('history.applyFilters')}
            </Button>
          </div>
        </div>
      </form>

      <section aria-labelledby="wallet-history-title" className="glass relative isolate flex min-w-0 animate-rise flex-col overflow-hidden rounded-[28px] motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/3 -z-10 size-[28rem] animate-drift rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl ring-1 ring-primary/40 motion-reduce:hidden" />
              <Icon name="history" size={17} />
            </span>
            <h2 id="wallet-history-title" className="text-base font-semibold text-fg">
              {translate('nav.walletHistory')}
            </h2>
            {filtered && <Badge tone="primary">{filtered.length}</Badge>}
          </div>

          {data ? <BalanceCapsule balance={data.wallet.balance} currency={data.wallet.currency} /> : <Skeleton className="h-14 w-52 rounded-2xl" />}
        </div>

        {filtered && filtered.length > 0 && <FlowMeter entries={filtered} />}

        <div className="px-4 py-4 sm:px-6">
          {isLoading || !pageRows ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="relative mb-4 grid size-16 place-items-center rounded-2xl text-on-primary [background-image:var(--brand-gradient)]">
                <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl ring-2 ring-primary/50 motion-reduce:hidden" />
                <Icon name="wallet" size={26} />
              </span>
              <p className="text-base font-semibold text-fg">{translate('walletHistory.emptyTitle')}</p>
              <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('walletHistory.emptyText')}</p>
            </div>
          ) : (
            <ol aria-label={translate('walletHistory.tableCaption')} className="flex flex-col gap-3">
              {pageRows.map((tx, index) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  serial={firstIndex + index + 1}
                  index={index}
                  isLast={index === pageRows.length - 1}
                  typeBadge={
                    <Badge tone={typeTone[tx.type]} className="uppercase">
                      {translate(`history.type.${tx.type}`)}
                    </Badge>
                  }
                  amount={signedAmount(tx)}
                  meta={[{ key: 'method', icon: 'transfer', label: translate('history.col.method'), value: tx.method }]}
                  actions={
                    // Only rejected entries have something to look into, so the action shows on those alone.
                    tx.status === 'rejected' ? <ViewButton label={translate('history.viewDetails', { reference: tx.reference })} onClick={() => setViewing(tx)} /> : <EmptyDash />
                  }
                />
              ))}
            </ol>
          )}
        </div>

        {filtered && filtered.length > 0 && (
          <nav aria-label={translate('history.pagination')} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
            <p className="text-xs text-fg-muted tabular-nums">
              {translate('walletHistory.showing', { from: firstIndex + 1, to: firstIndex + (pageRows?.length ?? 0), total: filtered.length })}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" leftIcon="arrowLeft" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                {translate('walletHistory.previous')}
              </Button>
              <span className="min-w-20 text-center text-xs font-semibold text-fg tabular-nums">
                {translate('walletHistory.pageOf', { page: currentPage, count: pageCount })}
              </span>
              <Button size="sm" variant="outline" rightIcon="arrowRight" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                {translate('history.next')}
              </Button>
            </div>
          </nav>
        )}
      </section>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={
          <span className="flex items-center gap-3">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger ring-1 ring-danger/30">
              <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl ring-2 ring-danger/50 motion-reduce:hidden" />
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
                <path d="M7 7 17 17" pathLength={1} strokeDasharray={1} style={{ animationDelay: '0.15s', animationDuration: '0.45s' }} className="animate-draw motion-reduce:animate-none" />
                <path d="M17 7 7 17" pathLength={1} strokeDasharray={1} style={{ animationDelay: '0.45s', animationDuration: '0.45s' }} className="animate-draw motion-reduce:animate-none" />
              </svg>
            </span>
            {rejectionText.title}
          </span>
        }
        footer={
          <Button type="button" variant="outline" onClick={() => setViewing(null)}>
            {rejectionText.close}
          </Button>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            {/* Transaction stub with a REJECTED stamp landing on it. */}
            <div className="relative animate-rise overflow-hidden rounded-2xl bg-linear-to-br from-danger/10 via-surface-2 to-surface-2 p-4 ring-1 ring-danger/25 motion-reduce:animate-none">
              <span aria-hidden="true" className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full bg-elevated ring-1 ring-danger/25" />
              <span aria-hidden="true" className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full bg-elevated ring-1 ring-danger/25" />
              <p className={captionClass}>{rejectionText.transaction}</p>
              <p className="mt-1 font-mono text-xl font-black tracking-[0.12em] text-fg">{viewing.reference}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-danger/25 pt-3 text-xs text-fg-muted">
                <span className="font-semibold text-fg-muted tabular-nums line-through decoration-danger/70 decoration-2">{signedAmount(viewing)}</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="calendar" size={11} />
                  {formatDate(viewing.createdAt)}
                </span>
              </div>
              <span
                aria-hidden="true"
                style={{ animationDelay: '0.6s' }}
                className="absolute top-3 right-4 animate-pop-in rounded-md px-2 py-1 text-[10px] font-black tracking-[0.2em] text-danger ring-2 ring-danger/60 [rotate:-10deg] motion-reduce:animate-none"
              >
                {rejectionText.stamp}
              </span>
            </div>

            <figure style={{ animationDelay: '0.25s' }} className="relative animate-rise rounded-2xl bg-surface-2/60 p-4 pl-5 ring-1 ring-line motion-reduce:animate-none">
              <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-full bg-danger/60" />
              <figcaption className={cx(captionClass, 'flex items-center gap-1.5')}>
                <Icon name="info" size={12} className="text-danger" />
                {rejectionText.reasonLabel}
              </figcaption>
              <blockquote className="mt-1.5 text-sm leading-relaxed text-fg">{viewing.rejectionReason ?? rejectionText.noReason}</blockquote>
            </figure>
          </div>
        )}
      </Modal>
    </div>
  );
}
