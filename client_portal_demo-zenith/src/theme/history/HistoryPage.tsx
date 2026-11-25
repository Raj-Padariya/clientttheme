'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useHistory } from '@/core/pages/useHistory';
import type { RequestStatus, Transaction, TransactionType } from '@/core/types';
import { boardCard } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Badge, EmptyState, Skeleton, type Tone } from '../ui/Feedback';
import { DateRangePicker, formatDateKey } from '../ui/DateRangePicker';
import { Dropdown, type DropdownOption } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { EntryAction, HistoryTimeline, StatusPulse, type StatusCount } from './HistoryTimeline';
import { PaymentDetailsModal, TransactionProofModal } from './TransactionModals';

const PAGE_SIZE = 10;
const TRADING_PREFIX = 'TA#';
const WALLET_PREFIX = 'WA#';

type AccountType = 'trading' | 'wallet';

interface HistoryFilters {
  fromDate: string;
  toDate: string;
  type: TransactionType | 'all';
  status: RequestStatus | 'all';
  accountType: AccountType | 'all';
  account: string;
}

const emptyFilters: HistoryFilters = { fromDate: '', toDate: '', type: 'all', status: 'all', accountType: 'all', account: 'all' };

export const typeTone: Record<TransactionType, Tone> = {
  deposit: 'success',
  withdrawal: 'warning',
  transfer: 'info',
  internal: 'info',
};

const typeOptions: TransactionType[] = ['deposit', 'withdrawal', 'internal'];
const statusOptions: RequestStatus[] = ['pending', 'processing', 'approved', 'rejected'];
const accountPrefix: Record<AccountType, string> = { trading: TRADING_PREFIX, wallet: WALLET_PREFIX };


const typeOptionIcon: Record<TransactionType, IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

const statusDot: Record<RequestStatus, string> = {
  pending: 'bg-warning',
  processing: 'bg-info',
  approved: 'bg-success',
  rejected: 'bg-danger',
};

export const typeDropdownOptions: DropdownOption<HistoryFilters['type']>[] = [
  { value: 'all', label: translate('history.allTypes'), icon: 'filter' },
  ...typeOptions.map((type): DropdownOption<HistoryFilters['type']> => ({ value: type, label: translate(`history.type.${type}`), icon: typeOptionIcon[type] })),
];

export const statusDropdownOptions: DropdownOption<HistoryFilters['status']>[] = [
  { value: 'all', label: translate('history.allStatus'), dotClassName: 'bg-fg-subtle' },
  ...statusOptions.map((status): DropdownOption<HistoryFilters['status']> => ({ value: status, label: translate(`status.${status}`), dotClassName: statusDot[status] })),
];

const accountTypeDropdownOptions: DropdownOption<HistoryFilters['accountType']>[] = [
  { value: 'all', label: translate('history.allAccounts'), icon: 'globe' },
  { value: 'trading', label: translate('history.tradingAccount'), icon: 'accounts' },
  { value: 'wallet', label: translate('history.walletAccount'), icon: 'wallet' },
];

const filterLabelKey: Record<keyof HistoryFilters, MessageKey> = {
  fromDate: 'history.fromDate',
  toDate: 'history.toDate',
  type: 'history.type',
  status: 'history.status',
  accountType: 'history.accountType',
  account: 'history.account',
};

function optionLabel<V extends string>(options: DropdownOption<V>[], value: V): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function endpointsOf(tx: Transaction): string[] {
  return [tx.source, tx.destination];
}

function isAccountEndpoint(label: string): boolean {
  return label.startsWith(TRADING_PREFIX) || label.startsWith(WALLET_PREFIX);
}

// Dates are compared as YYYY-MM-DD strings, which sort the same way as the dates themselves.
function matchesFilters(tx: Transaction, filters: HistoryFilters): boolean {
  const day = tx.createdAt.slice(0, 10);
  if (filters.fromDate && day < filters.fromDate) return false;
  if (filters.toDate && day > filters.toDate) return false;
  if (filters.type !== 'all' && tx.type !== filters.type) return false;
  if (filters.status !== 'all' && tx.status !== filters.status) return false;
  if (filters.accountType !== 'all' && !endpointsOf(tx).some((label) => label.startsWith(accountPrefix[filters.accountType as AccountType]))) {
    return false;
  }
  if (filters.account !== 'all' && !endpointsOf(tx).includes(filters.account)) return false;
  return true;
}

export function signedAmount(tx: Transaction): string {
  const sign = tx.type === 'withdrawal' ? '-' : '+';
  return `${sign}${formatMoney(tx.amount, tx.currency)}`;
}

export function EmptyDash() {
  return <span className="text-fg-subtle">—</span>;
}

export function ViewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon name="eye" size={15} />
    </button>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

type Viewing = { tx: Transaction; view: 'details' | 'proof' } | null;

export default function HistoryPage() {
  const { data: transactions, isLoading } = useHistory();
  const [draft, setDraft] = useState<HistoryFilters>(emptyFilters);
  const [applied, setApplied] = useState<HistoryFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Viewing>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const accountOptions = Array.from(new Set((transactions ?? []).flatMap(endpointsOf).filter(isAccountEndpoint))).sort();
  const filtered = transactions?.filter((tx) => matchesFilters(tx, applied));
  const pageCount = Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered?.slice(firstIndex, firstIndex + PAGE_SIZE);
  const isFiltered = JSON.stringify(applied) !== JSON.stringify(emptyFilters);

  function updateDraft<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) {
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

  function removeFilter(key: keyof HistoryFilters) {
    setDraft((current) => ({ ...current, [key]: emptyFilters[key] }));
    setApplied((current) => ({ ...current, [key]: emptyFilters[key] }));
    setPage(1);
  }

  const accountDropdownOptions: DropdownOption<string>[] = [
    { value: 'all', label: translate('history.all'), icon: 'globe' },
    ...accountOptions.map((account): DropdownOption<string> => ({ value: account, label: account, icon: account.startsWith(WALLET_PREFIX) ? 'wallet' : 'accounts' })),
  ];

  const chipValue: Record<keyof HistoryFilters, string> = {
    fromDate: formatDateKey(applied.fromDate),
    toDate: formatDateKey(applied.toDate),
    type: optionLabel(typeDropdownOptions, applied.type),
    status: optionLabel(statusDropdownOptions, applied.status),
    accountType: optionLabel(accountTypeDropdownOptions, applied.accountType),
    account: optionLabel(accountDropdownOptions, applied.account),
  };
  const activeChips = (Object.keys(emptyFilters) as (keyof HistoryFilters)[])
    .filter((key) => applied[key] !== emptyFilters[key])
    .map((key) => ({ key, label: translate(filterLabelKey[key]), value: chipValue[key] }));

  // The status pulse counts what the other applied filters leave, so its pills show what each status would give.
  const statusBase = (transactions ?? []).filter((tx) => matchesFilters(tx, { ...applied, status: 'all' }));
  const statusCounts: StatusCount[] = statusOptions.map((status) => ({ status, count: statusBase.filter((tx) => tx.status === status).length }));

  function selectStatus(status: HistoryFilters['status']) {
    setDraft((current) => ({ ...current, status }));
    setApplied((current) => ({ ...current, status }));
    setPage(1);
  }

  // Zenith history: an open light title with the count and filter toggle, the status board (total + capsule tracks),
  // active chips, the filter dock on demand, then the entries as day boards of ledger rows.
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section aria-labelledby="history-title" className="flex flex-col gap-5">
        <div className="flex animate-rise flex-wrap items-end justify-between gap-4 motion-reduce:animate-none">
          <div className="flex min-w-0 items-end gap-3">
            <h2 id="history-title" className="text-4xl font-light tracking-[-0.04em] text-fg sm:text-5xl">
              {translate('nav.transactionHistory')}
            </h2>
            {filtered && (
              <span className="mb-1.5 rounded-full bg-(--hero-buy) px-2.5 py-1 font-mono text-xs font-bold text-[#160904] tabular-nums">{String(filtered.length).padStart(2, '0')}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isFiltered && (
              <button type="button" onClick={clearFilters} className="px-2 text-xs font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                {translate('history.clearFilters')}
              </button>
            )}
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="history-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className={cx(
                'inline-flex h-10 items-center gap-2 rounded-full pr-2 pl-4 text-sm font-semibold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                filtersOpen ? 'bg-fg text-surface' : 'bg-fg/[0.05] text-fg ring-1 ring-fg/12 hover:bg-fg/[0.09]',
              )}
            >
              <Icon name="filter" size={14} />
              {translate('history.filtersTitle')}
              <span
                className={cx(
                  'grid size-6 place-items-center rounded-full text-[10px] font-bold tabular-nums',
                  activeChips.length > 0 ? 'bg-(--hero-buy) text-[#160904]' : filtersOpen ? 'bg-surface/15' : 'bg-fg/[0.08]',
                )}
              >
                {activeChips.length > 0 ? activeChips.length : <Icon name="chevronDown" size={12} className={cx('transition-transform', filtersOpen && 'rotate-180')} />}
              </span>
            </button>
          </div>
        </div>

        <StatusPulse counts={statusCounts} active={applied.status} onSelect={selectStatus} />

        {activeChips.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => removeFilter(chip.key)}
                  aria-label={translate('history.removeFilter', { name: `${chip.label}: ${chip.value}` })}
                  className="group inline-flex animate-pop-in items-center gap-1.5 rounded-full bg-surface py-1 pr-1.5 pl-3 text-xs ring-1 ring-line-strong transition-colors hover:ring-fg/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
                >
                  <span className="text-fg-muted">{chip.label}:</span>
                  <span className="font-semibold text-fg">{chip.value}</span>
                  <span className="flex size-4 items-center justify-center rounded-full text-fg-subtle transition-colors group-hover:bg-fg group-hover:text-app">
                    <Icon name="close" size={10} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {filtersOpen && (
        <form
          id="history-filters"
          onSubmit={applyFilters}
          aria-label={translate('history.filtersLabel')}
          className={cx(boardCard, 'relative z-20 animate-rise p-3 motion-reduce:animate-none sm:p-4')}
        >
          <div className="grid gap-1 rounded-[22px] bg-fg/[0.03] p-1.5 ring-1 ring-fg/[0.08] sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,1fr))_auto] 2xl:items-center">
            <DateRangePicker
              id="history-dates"
              className="sm:col-span-2 lg:col-span-4 2xl:col-span-1"
              fromLabel={translate('history.fromDate')}
              toLabel={translate('history.toDate')}
              value={{ from: draft.fromDate, to: draft.toDate }}
              onChange={(range) => setDraft((current) => ({ ...current, fromDate: range.from, toDate: range.to }))}
            />

            <Dropdown
              id="history-type"
              variant="segment"
              icon="transfer"
              label={translate('history.type')}
              value={draft.type}
              options={typeDropdownOptions}
              onChange={(value) => updateDraft('type', value)}
            />
            <Dropdown
              id="history-status"
              variant="segment"
              icon="checkCircle"
              label={translate('history.status')}
              value={draft.status}
              options={statusDropdownOptions}
              onChange={(value) => updateDraft('status', value)}
            />
            <Dropdown
              id="history-account-type"
              variant="segment"
              icon="wallet"
              label={translate('history.accountType')}
              value={draft.accountType}
              options={accountTypeDropdownOptions}
              onChange={(value) => updateDraft('accountType', value)}
            />
            <Dropdown
              id="history-account"
              variant="segment"
              icon="user"
              label={translate('history.account')}
              value={draft.account}
              options={accountDropdownOptions}
              onChange={(value) => updateDraft('account', value)}
            />

            <div className="flex items-center justify-end gap-2 p-1.5 sm:col-span-2 lg:col-span-4 2xl:col-span-1">
              <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                {translate('common.cancel')}
              </Button>
              <Button type="submit" size="sm" leftIcon="filter">
                {translate('history.applyFilters')}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="flex min-w-0 flex-col gap-6">
        {isLoading || !pageRows ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-40 rounded-[22px]" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <div className={cx(boardCard, 'p-5')}>
            <EmptyState title={translate('history.emptyTitle')} description={translate('history.emptyText')} />
          </div>
        ) : (
          <HistoryTimeline
            label={translate('history.tableCaption')}
            entries={pageRows.map((tx, index) => ({
              tx,
              serial: firstIndex + index + 1,
              typeBadge: (
                <Badge tone={typeTone[tx.type]} className="tracking-wide uppercase">
                  {translate(`history.type.${tx.type}`)}
                </Badge>
              ),
              amount: signedAmount(tx),
              meta: [
                { key: 'method', icon: 'transfer', label: translate('history.col.method'), value: tx.method },
                { key: 'txId', icon: 'info', label: translate('history.col.transactionId'), value: tx.transactionId ?? '—' },
                { key: 'updated', icon: 'refresh', label: translate('history.col.updated'), value: formatDate(tx.updatedAt) },
              ],
              actions: (
                <>
                  <EntryAction
                    icon="eye"
                    label={translate('history.col.details')}
                    ariaLabel={translate('history.viewDetails', { reference: tx.reference })}
                    onClick={() => setViewing({ tx, view: 'details' })}
                  />
                  <EntryAction
                    icon="fileText"
                    label={translate('history.col.proof')}
                    ariaLabel={translate('history.viewProof', { reference: tx.reference })}
                    onClick={tx.proofName ? () => setViewing({ tx, view: 'proof' }) : undefined}
                  />
                </>
              ),
            }))}
          />
        )}

        {filtered && filtered.length > 0 && (
          <nav
            aria-label={translate('history.pagination')}
            className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-fg/[0.04] py-2 pr-2 pl-5 ring-1 ring-fg/10"
          >
            <p className="text-xs text-fg-muted tabular-nums">
              {translate('history.range', { from: firstIndex + 1, to: firstIndex + (pageRows?.length ?? 0), total: filtered.length })}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" leftIcon="arrowLeft" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                {translate('history.prev')}
              </Button>
              <span className="flex min-w-12 items-center justify-center gap-1">
                {Array.from({ length: pageCount }, (_, pageIndex) => (
                  <span
                    key={pageIndex}
                    aria-hidden="true"
                    className={cx('h-2 rounded-full transition-[width,background-color] duration-300', pageIndex + 1 === currentPage ? 'w-6 bg-(--hero-buy)' : 'w-2 bg-fg/15')}
                  />
                ))}
                <span className="ml-1.5 text-xs font-semibold text-fg tabular-nums">
                  {currentPage} / {pageCount}
                </span>
              </span>
              <Button size="sm" variant="outline" rightIcon="arrowRight" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                {translate('history.next')}
              </Button>
            </div>
          </nav>
        )}
      </div>

      {viewing?.view === 'details' && <PaymentDetailsModal tx={viewing.tx} amount={signedAmount(viewing.tx)} onClose={() => setViewing(null)} />}
      {viewing?.view === 'proof' && <TransactionProofModal tx={viewing.tx} onClose={() => setViewing(null)} />}
    </div>
  );
}
