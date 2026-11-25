'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useWalletHistory } from '@/core/pages/useWalletHistory';
import type { RequestStatus, Transaction, TransactionType } from '@/core/types';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { ffText } from '../dashboard/finflowParts';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { DateRangePicker } from '../ui/DateRangePicker';
import { Dropdown } from '../ui/Dropdown';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { signedAmount, statusDropdownOptions, typeDropdownOptions, typeTone } from './HistoryPage';
import { EntryAction, HistoryTimeline } from './HistoryTimeline';
import { ledgerCaptionClass as captionClass, statusAccent, type Accent } from './Ledger';

const PAGE_SIZE = 10;
const BALANCE_COUNT_MS = 1400;
const FLOW_STAGGER_MS = 140;

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';


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


function WaveLines({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[200%]">
      {WAVE_PATHS.map((path) => (
        <path key={path} d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** Open wallet balance: counting-up figure, a hide toggle and the wallet's deposit / transfer / withdraw actions. */
function BalanceVault({ balance, currency, entryCount }: { balance: number; currency: string; entryCount?: number }) {
  const shown = useAnimatedNumber(balance, BALANCE_COUNT_MS);
  const [hidden, setHidden] = useState(false);

  return (
    <div className="flex min-w-0 flex-col justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-fg-muted">{translate('walletHistory.currentBalance')}</p>
          <button
            type="button"
            onClick={() => setHidden((value) => !value)}
            aria-pressed={hidden}
            aria-label={hidden ? ffText.showBalance : ffText.hideBalance}
            title={hidden ? ffText.showBalance : ffText.hideBalance}
            className={cx('grid size-8 shrink-0 place-items-center rounded-full bg-fg/[0.05] text-fg-muted ring-1 ring-fg/10 transition-colors hover:text-fg', focusRing)}
          >
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={14} />
          </button>
        </div>
        <p className="mt-3 truncate text-5xl leading-none font-light tracking-[-0.04em] text-fg tabular-nums sm:text-6xl">
          {hidden ? <span className="tracking-[0.12em]">••••••</span> : formatMoney(shown, currency)}
        </p>
        {entryCount !== undefined && (
          <p className="mt-3 text-xs text-fg-muted tabular-nums">
            {translate('walletHistory.tableCaption')} · <span className="font-semibold text-fg">{entryCount}</span> entries
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/deposit"
          className={cx(
            'relative isolate flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-(--hero-buy) text-sm font-bold text-[#160904] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none',
            focusRing,
          )}
        >
          <WaveLines color="white" opacity={0.4} />
          <Icon name="deposit" size={15} />
          {ffText.deposit}
        </Link>
        <Link
          href="/transfer"
          aria-label={ffText.swap}
          title={ffText.swap}
          className={cx('grid size-12 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg ring-1 ring-fg/15 transition-transform duration-500 hover:rotate-180 motion-reduce:transition-none', focusRing)}
        >
          <Icon name="transfer" size={18} />
        </Link>
        <Link
          href="/withdrawal"
          className={cx('flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-fg text-sm font-bold text-surface transition-transform hover:-translate-y-0.5 motion-reduce:transition-none', focusRing)}
        >
          <Icon name="withdrawal" size={15} />
          {ffText.withdraw}
        </Link>
      </div>
    </div>
  );
}

/** Approved / pending / rejected amounts of the filtered entries as capsule tracks, each filled to its share of the total. */
function FlowDial({ entries }: { entries: Transaction[] }) {
  const sumOf = (accent: Accent) => entries.filter((tx) => statusAccent(tx.status) === accent).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const segments: { accent: Accent; label: string; amount: number; fill: string; dot: string }[] = [
    { accent: 'success', label: flowText.approved, amount: sumOf('success'), fill: 'bg-(--hero-buy)', dot: 'bg-(--hero-buy)' },
    { accent: 'warning', label: flowText.pending, amount: sumOf('warning'), fill: 'bg-warning/80', dot: 'bg-warning' },
    { accent: 'danger', label: flowText.rejected, amount: sumOf('danger'), fill: 'bg-danger/75', dot: 'bg-danger' },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const currency = entries[0]?.currency;
  if (total <= 0) return null;

  const approvedShare = Math.round((segments[0].amount / total) * 100);

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.07] sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{flowText.approved}</p>
          <p className="mt-1 text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">
            {approvedShare}
            <span className="text-xl text-fg-subtle">%</span>
          </p>
        </div>
        <p className="truncate text-sm font-semibold text-fg tabular-nums">{currency ? formatMoney(total, currency) : total}</p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {segments.map((segment, index) => {
          const share = (segment.amount / total) * 100;
          return (
            <li key={segment.accent} className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-fg-muted">
                  <span aria-hidden="true" className={cx('size-2 rounded-full', segment.dot)} />
                  {segment.label}
                </span>
                <span className="font-semibold text-fg tabular-nums">{currency ? formatMoney(segment.amount, currency) : segment.amount}</span>
              </div>
              <span aria-hidden="true" className="mt-1.5 block h-7 overflow-hidden rounded-full bg-fg/[0.06]">
                {segment.amount > 0 && (
                  <span
                    className={cx('zenith-capsule relative isolate flex h-full items-center justify-end overflow-hidden rounded-full pr-3 [transform-origin:left]', segment.fill)}
                    style={{ width: `${Math.max(share, 12)}%`, animationDelay: `${200 + index * FLOW_STAGGER_MS}ms` }}
                  >
                    <WaveLines color="white" opacity={0.35} />
                    <span className="text-[10px] font-bold text-[#160904] tabular-nums">{Math.round(share)}%</span>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFilterCount = (Object.keys(emptyFilters) as (keyof WalletFilters)[]).filter((key) => applied[key] !== emptyFilters[key]).length;

  // Zenith wallet history: one board with the open count-up balance and wallet actions on the left and the status
  // flow as capsule tracks on the right, the filter dock on demand, then the entries as day boards of ledger rows.
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section aria-labelledby="wallet-history-title" className={cx(boardCard, 'zenith-tile relative isolate overflow-hidden p-5 sm:p-6')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--hero-buy) text-[#160904]">
              <Icon name="history" size={18} />
            </span>
            <h2 id="wallet-history-title" className="truncate text-xl font-semibold tracking-[-0.02em] text-fg">
              {translate('nav.walletHistory')}
            </h2>
            {filtered && (
              <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 font-mono text-xs font-bold text-fg ring-1 ring-fg/10 tabular-nums">{String(filtered.length).padStart(2, '0')}</span>
            )}
          </div>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="wallet-history-filters"
            onClick={() => setFiltersOpen((open) => !open)}
            className={cx(
              'inline-flex h-10 items-center gap-2 rounded-full pr-2 pl-4 text-sm font-semibold transition-[background-color,color] duration-300 motion-reduce:transition-none',
              focusRing,
              filtersOpen ? 'bg-fg text-surface' : 'bg-fg/[0.05] text-fg ring-1 ring-fg/12 hover:bg-fg/[0.09]',
            )}
          >
            <Icon name="filter" size={14} />
            {translate('history.filtersTitle')}
            <span
              className={cx(
                'grid size-6 place-items-center rounded-full text-[10px] font-bold tabular-nums',
                activeFilterCount > 0 ? 'bg-(--hero-buy) text-[#160904]' : filtersOpen ? 'bg-surface/15' : 'bg-fg/[0.08]',
              )}
            >
              {activeFilterCount > 0 ? activeFilterCount : <Icon name="chevronDown" size={12} className={cx('transition-transform', filtersOpen && 'rotate-180')} />}
            </span>
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
          {data ? (
            <BalanceVault balance={data.wallet.balance} currency={data.wallet.currency} entryCount={filtered?.length} />
          ) : (
            <Skeleton className="h-56 rounded-[28px]" />
          )}
          {filtered && filtered.length > 0 && <FlowDial entries={filtered} />}
        </div>
      </section>

      {filtersOpen && (
        <form
          id="wallet-history-filters"
          onSubmit={applyFilters}
          aria-label={translate('history.filtersLabel')}
          className={cx(boardCard, 'relative z-20 animate-rise p-3 motion-reduce:animate-none sm:p-4')}
        >
          <div className="grid gap-1 rounded-[22px] bg-fg/[0.03] p-1.5 ring-1 ring-fg/[0.08] sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-center">
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
      )}

      <section className="flex min-w-0 flex-col gap-6">
        {isLoading || !pageRows ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-44 rounded-3xl" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <div className={cx(boardCard, 'flex flex-col items-center px-6 py-14 text-center')}>
            <span className="relative mb-4 grid size-16 place-items-center rounded-full bg-(--hero-buy) text-[#160904]">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy)/30 motion-reduce:hidden" />
              <Icon name="wallet" size={26} />
            </span>
            <p className="text-base font-semibold text-fg">{translate('walletHistory.emptyTitle')}</p>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('walletHistory.emptyText')}</p>
          </div>
        ) : (
          <HistoryTimeline
            label={translate('walletHistory.tableCaption')}
            entries={pageRows.map((tx, index) => ({
              tx,
              serial: firstIndex + index + 1,
              typeBadge: (
                <Badge tone={typeTone[tx.type]} className="uppercase">
                  {translate(`history.type.${tx.type}`)}
                </Badge>
              ),
              amount: signedAmount(tx),
              meta: [{ key: 'method', icon: 'transfer', label: translate('history.col.method'), value: tx.method }],
              actions: (
                <EntryAction
                  icon="eye"
                  label={translate('history.col.details')}
                  ariaLabel={translate('history.viewDetails', { reference: tx.reference })}
                  onClick={tx.status === 'rejected' ? () => setViewing(tx) : undefined}
                />
              ),
            }))}
          />
        )}

        {filtered && filtered.length > 0 && (
          <nav aria-label={translate('history.pagination')} className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-fg/[0.04] py-2 pr-2 pl-5 ring-1 ring-fg/10">
            <p className="text-xs text-fg-muted tabular-nums">
              {translate('walletHistory.showing', { from: firstIndex + 1, to: firstIndex + (pageRows?.length ?? 0), total: filtered.length })}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" leftIcon="arrowLeft" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                {translate('walletHistory.previous')}
              </Button>
              <span className="flex min-w-20 items-center justify-center gap-1">
                {Array.from({ length: pageCount }, (_, pageIndex) => (
                  <span
                    key={pageIndex}
                    aria-hidden="true"
                    className={cx('h-2 rounded-full transition-[width,background-color] duration-300', pageIndex + 1 === currentPage ? 'w-6 bg-(--hero-buy)' : 'w-2 bg-fg/15')}
                  />
                ))}
                <span className="ml-1.5 text-xs font-semibold text-fg tabular-nums">{translate('walletHistory.pageOf', { page: currentPage, count: pageCount })}</span>
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
