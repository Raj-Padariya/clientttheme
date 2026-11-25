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
import { EntryAction } from './HistoryTimeline';
import { ledgerCaptionClass as captionClass, statusAccent, type Accent } from './Ledger';
import './reservoir.css';

const PAGE_SIZE = 10;
const BALANCE_COUNT_MS = 1400;
const VIAL_STAGGER_MS = 160;
const ENTRY_STAGGER_MS = 70;

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

// Two wave periods per 100 units, drawn twice as wide as the tank so shifting it by half loops seamlessly.
const WAVE_SURFACE = 'M0 8 Q12.5 0 25 8 T50 8 T75 8 T100 8 T125 8 T150 8 T175 8 T200 8 V16 H0 Z';

const BUBBLES = [
  { left: '12%', size: 6, delay: 0 },
  { left: '29%', size: 4, delay: 1.2 },
  { left: '47%', size: 7, delay: 0.5 },
  { left: '64%', size: 5, delay: 2 },
  { left: '81%', size: 4, delay: 2.7 },
];

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' });

const accentChip: Record<Accent, string> = {
  success: 'bg-(--hero-buy)/12 text-(--hero-buy) ring-(--hero-buy)/30',
  warning: 'bg-warning/12 text-warning ring-warning/30',
  danger: 'bg-danger/12 text-danger ring-danger/30',
};

const accentDot: Record<Accent, string> = {
  success: 'bg-(--hero-buy)',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const accentLiquid: Record<Accent, string> = {
  success: 'bg-(--hero-buy)',
  warning: 'bg-warning/80',
  danger: 'bg-danger/75',
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

interface FlowSegment {
  accent: Accent;
  label: string;
  amount: number;
}

function flowSegments(entries: Transaction[]): FlowSegment[] {
  const sumOf = (accent: Accent) => entries.filter((tx) => statusAccent(tx.status) === accent).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  return [
    { accent: 'success', label: flowText.approved, amount: sumOf('success') },
    { accent: 'warning', label: flowText.pending, amount: sumOf('warning') },
    { accent: 'danger', label: flowText.rejected, amount: sumOf('danger') },
  ];
}

/** Glass tank filled to the approved share of the filtered entries, then one vial per status filled to its share. */
function Reservoir({ entries }: { entries: Transaction[] }) {
  const segments = flowSegments(entries);
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const currency = entries[0]?.currency;
  if (total <= 0) return null;

  const approvedShare = Math.round((segments[0].amount / total) * 100);
  // Keep a sliver of liquid when nothing is approved, and room for the waves when everything is.
  const liquidLevel = Math.min(90, Math.max(6, approvedShare));
  const money = (amount: number) => (currency ? formatMoney(amount, currency) : amount);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{flowText.approved}</p>
          <p className="mt-1 text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">
            {approvedShare}
            <span className="text-xl text-fg-subtle">%</span>
          </p>
        </div>
        <p className="truncate text-sm font-semibold text-fg tabular-nums">{money(total)}</p>
      </div>

      <div aria-hidden="true" className="reservoir-glass relative isolate h-40 overflow-hidden rounded-[28px] ring-1 ring-fg/12">
        <div className="reservoir-liquid absolute inset-x-0 bottom-0" style={{ height: `${liquidLevel}%` }}>
          <svg viewBox="0 0 200 16" preserveAspectRatio="none" className="reservoir-wave-back absolute bottom-[calc(100%-1px)] left-0 h-4 w-[200%]">
            <path d={WAVE_SURFACE} className="fill-(--hero-buy)/30" />
          </svg>
          <svg viewBox="0 0 200 16" preserveAspectRatio="none" className="reservoir-wave absolute bottom-[calc(100%-1px)] left-0 h-3 w-[200%]">
            <path d={WAVE_SURFACE} className="fill-(--hero-buy)/70" />
          </svg>
          <div className="absolute inset-0 bg-linear-to-b from-(--hero-buy)/70 to-(--hero-buy)/30" />
          {BUBBLES.map((bubble) => (
            <span
              key={bubble.left}
              className="reservoir-bubble absolute bottom-2 rounded-full bg-white/45 ring-1 ring-white/40"
              style={{ left: bubble.left, width: bubble.size, height: bubble.size, animationDelay: `${bubble.delay}s` }}
            />
          ))}
        </div>

        <span className="absolute inset-y-4 right-3 z-10 flex flex-col justify-between">
          {[100, 75, 50, 25, 0].map((tick) => (
            <span key={tick} className="flex items-center justify-end gap-1.5 text-[9px] font-semibold text-fg-subtle tabular-nums">
              {tick}
              <span className="h-px w-2.5 bg-fg/25" />
            </span>
          ))}
        </span>

        <span
          className="stream-valve absolute left-4 z-10 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-fg shadow-sm ring-1 ring-fg/10 tabular-nums"
          style={{ bottom: `calc(${liquidLevel}% + 10px)`, animationDelay: '1.3s' }}
        >
          {approvedShare}%
        </span>
      </div>

      <ul className="grid grid-cols-3 gap-2.5">
        {segments.map((segment, index) => {
          const share = (segment.amount / total) * 100;
          return (
            <li key={segment.accent} className="flex min-w-0 flex-col items-center gap-2 rounded-[20px] bg-fg/[0.03] px-2 py-3 ring-1 ring-fg/[0.07]">
              <span aria-hidden="true" className="reservoir-glass relative h-24 w-9 overflow-hidden rounded-full ring-1 ring-fg/12">
                {segment.amount > 0 && (
                  <span
                    className={cx('reservoir-vial absolute inset-x-0 bottom-0', accentLiquid[segment.accent])}
                    style={{ height: `${Math.max(share, 10)}%`, animationDelay: `${300 + index * VIAL_STAGGER_MS}ms` }}
                  >
                    <span className="absolute inset-x-1.5 top-1 h-1 rounded-full bg-white/40" />
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-fg tabular-nums">{Math.round(share)}%</span>
              <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                <span aria-hidden="true" className={cx('size-2 rounded-full', accentDot[segment.accent])} />
                {segment.label}
              </span>
              <span className="w-full truncate text-center text-xs font-semibold text-fg tabular-nums">{money(segment.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Wallet card: counting-up balance with a hide toggle, the status reservoir, then the deposit / transfer / withdraw actions. */
function WalletReservoir({ balance, currency, entries }: { balance: number; currency: string; entries?: Transaction[] }) {
  const shown = useAnimatedNumber(balance, BALANCE_COUNT_MS);
  const [hidden, setHidden] = useState(false);

  return (
    <aside aria-label={translate('walletHistory.currentBalance')} className={cx(boardCard, 'relative isolate flex min-w-0 flex-col gap-6 overflow-hidden p-5 sm:p-6')}>
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
        <p className="mt-3 truncate text-5xl leading-none font-light tracking-[-0.04em] text-fg tabular-nums">
          {hidden ? <span className="tracking-[0.12em]">••••••</span> : formatMoney(shown, currency)}
        </p>
        {entries && (
          <p className="mt-3 text-xs text-fg-muted tabular-nums">
            {translate('walletHistory.tableCaption')} · <span className="font-semibold text-fg">{entries.length}</span> entries
          </p>
        )}
      </div>

      {entries && entries.length > 0 && <Reservoir entries={entries} />}

      <div className="flex items-center gap-2.5">
        <Link
          href="/deposit"
          className={cx(
            'relative isolate flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-(--aurora-cta-from) to-(--aurora-cta-to) text-sm font-bold text-(--aurora-cta-fg) transition-transform hover:-translate-y-0.5 motion-reduce:transition-none',
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
    </aside>
  );
}

interface StreamDay {
  day: string;
  label: string;
  items: { tx: Transaction; serial: number }[];
}

function groupByDay(rows: Transaction[], firstSerial: number): StreamDay[] {
  const days: StreamDay[] = [];
  rows.forEach((tx, index) => {
    const day = tx.createdAt.slice(0, 10);
    let group = days.find((candidate) => candidate.day === day);
    if (!group) {
      group = { day, label: formatDate(tx.createdAt), items: [] };
      days.push(group);
    }
    group.items.push({ tx, serial: firstSerial + index });
  });
  return days;
}

/** Entries as a stream: a pipe with a running drop, a gate per day, and a valve per entry that every card hangs off. */
function WalletStream({ rows, firstSerial, onViewRejection }: { rows: Transaction[]; firstSerial: number; onViewRejection: (tx: Transaction) => void }) {
  const days = groupByDay(rows, firstSerial);
  let order = 0;

  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute inset-y-3 left-0 flex w-12 justify-center">
        <span className="relative h-full w-2.5 overflow-hidden rounded-full bg-fg/[0.06] ring-1 ring-fg/10">
          <span className="absolute inset-0 bg-linear-to-b from-(--hero-buy)/40 via-(--hero-buy)/12 to-transparent" />
          <span className="stream-drop absolute left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-full bg-(--hero-buy)" />
          <span className="stream-drop absolute left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-full bg-(--hero-buy)" style={{ animationDelay: '1.3s' }} />
        </span>
      </span>

      <ol aria-label={translate('walletHistory.tableCaption')} className="relative flex flex-col gap-6">
        {days.map((group) => (
          <li key={group.day} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-3">
              <span aria-hidden="true" className="flex w-12 shrink-0 justify-center">
                <span className="h-3 w-8 rounded-full bg-fg ring-4 ring-app" />
              </span>
              <span className="text-sm font-semibold text-fg">{group.label}</span>
              <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-bold text-fg-muted ring-1 ring-fg/10 tabular-nums">{group.items.length}</span>
            </h3>

            <ol className="flex flex-col gap-3">
              {group.items.map(({ tx, serial }) => {
                const accent = statusAccent(tx.status);
                const isOutflow = tx.type === 'withdrawal';
                const delay = `${order++ * ENTRY_STAGGER_MS}ms`;
                return (
                  <li key={tx.reference} className="stream-entry flex gap-3" style={{ animationDelay: delay }}>
                    <span className="flex w-12 shrink-0 justify-center pt-4">
                      <span
                        className={cx(
                          'stream-valve relative grid size-9 place-items-center rounded-full ring-4 ring-app',
                          isOutflow ? 'bg-elevated text-(--zenith-red) shadow-[inset_0_0_0_1.5px_var(--zenith-red)]' : 'bg-linear-to-br from-(--aurora-cta-from) to-(--aurora-cta-to) text-(--aurora-cta-fg)',
                        )}
                        style={{ animationDelay: delay }}
                      >
                        {accent === 'warning' && <span aria-hidden="true" className="stream-ripple absolute inset-0 rounded-full ring-2 ring-warning/60" />}
                        <Icon name={isOutflow ? 'withdrawal' : 'deposit'} size={15} />
                      </span>
                    </span>

                    <article className={cx(boardCard, 'min-w-0 flex-1 p-4 sm:p-5')}>
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={typeTone[tx.type]} className="uppercase">
                              {translate(`history.type.${tx.type}`)}
                            </Badge>
                            <span className="font-mono text-[11px] text-fg-subtle tabular-nums">#{String(serial).padStart(2, '0')}</span>
                          </div>
                          <p className="mt-2 truncate font-mono text-sm font-bold tracking-[0.06em] text-fg">{tx.reference}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <p className={cx('text-xl font-semibold tracking-[-0.02em] tabular-nums', isOutflow ? 'text-(--zenith-red)' : 'text-(--hero-buy)')}>{signedAmount(tx)}</p>
                          <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', accentChip[accent])}>
                            <span aria-hidden="true" className={cx('size-1.5 rounded-full', accentDot[accent])} />
                            {translate(`status.${tx.status}`)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-fg/10 pt-3">
                        <dl className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                          <div className="flex items-center gap-1.5">
                            <dt className="sr-only">{translate('history.col.method')}</dt>
                            <Icon name="transfer" size={12} />
                            <dd className="truncate font-medium text-fg">{tx.method}</dd>
                          </div>
                          <div className="flex items-center gap-1.5 tabular-nums">
                            <Icon name="calendar" size={12} />
                            <time dateTime={tx.createdAt}>{timeFormatter.format(new Date(tx.createdAt))}</time>
                          </div>
                        </dl>
                        <EntryAction
                          icon="eye"
                          label={translate('history.col.details')}
                          ariaLabel={translate('history.viewDetails', { reference: tx.reference })}
                          onClick={tx.status === 'rejected' ? () => onViewRejection(tx) : undefined}
                        />
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
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

  // Aurora wallet history: a plain title row with the filter toggle, the filter dock on demand, then the wallet
  // reservoir (balance, status tank + vials, actions) beside the entry stream.
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="reservoir-glass relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl text-fg ring-1 ring-fg/12">
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-(--hero-buy)/35" />
            <Icon name="history" size={18} className="relative" />
          </span>
          <h2 id="wallet-history-title" className="truncate font-display text-2xl font-semibold tracking-[-0.02em] text-fg">
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
                activeFilterCount > 0 ? 'bg-(--hero-buy) text-(--aurora-cta-fg)' : filtersOpen ? 'bg-surface/15' : 'bg-fg/[0.08]',
              )}
            >
              {activeFilterCount > 0 ? activeFilterCount : <Icon name="chevronDown" size={12} className={cx('transition-transform', filtersOpen && 'rotate-180')} />}
            </span>
          </button>
      </header>

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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-6">
        {data ? (
          <WalletReservoir balance={data.wallet.balance} currency={data.wallet.currency} entries={filtered} />
        ) : (
          <Skeleton className="h-[34rem] rounded-[28px]" />
        )}

      <section aria-labelledby="wallet-history-title" className="flex min-w-0 flex-col gap-6">
        {isLoading || !pageRows ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-44 rounded-3xl" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <div className={cx(boardCard, 'flex flex-col items-center px-6 py-14 text-center')}>
            <span className="reservoir-glass relative mb-4 grid size-16 place-items-center overflow-hidden rounded-full text-fg ring-1 ring-fg/12">
              <span aria-hidden="true" className="reservoir-liquid absolute inset-x-0 bottom-0 h-1/4 bg-(--hero-buy)/40" />
              <Icon name="wallet" size={26} className="relative" />
            </span>
            <p className="text-base font-semibold text-fg">{translate('walletHistory.emptyTitle')}</p>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('walletHistory.emptyText')}</p>
          </div>
        ) : (
          <WalletStream rows={pageRows} firstSerial={firstIndex + 1} onViewRejection={setViewing} />
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
              <span className="flex min-w-20 items-end justify-center gap-1">
                {Array.from({ length: pageCount }, (_, pageIndex) => (
                  <span
                    key={pageIndex}
                    aria-hidden="true"
                    className={cx('w-2 rounded-full transition-[height,background-color] duration-300', pageIndex + 1 === currentPage ? 'h-4 bg-(--hero-buy)' : 'h-2.5 bg-fg/15')}
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
      </div>

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
