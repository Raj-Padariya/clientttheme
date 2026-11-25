'use client';

import { useState } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RequestStatus, Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { EmptyState, Skeleton, StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Tabs, type TabItem } from '../ui/Tabs';

type ActivityFilter = 'all' | 'deposit' | 'withdrawal' | 'transfer';

const ROW_STAGGER_MS = 60;
const SKELETON_ROWS = 4;

const filterItems: TabItem<ActivityFilter>[] = [
  { value: 'all', label: translate('history.filterAll') },
  { value: 'deposit', label: translate('txType.deposit') },
  { value: 'withdrawal', label: translate('txType.withdrawal') },
  { value: 'transfer', label: translate('txType.transfer') },
];

const typeStyle: Record<Transaction['type'], { icon: IconName; tile: string; sign: string }> = {
  deposit: { icon: 'deposit', tile: 'bg-success-soft text-success ring-success/30', sign: '+' },
  withdrawal: { icon: 'withdrawal', tile: 'bg-danger-soft text-danger ring-danger/30', sign: '−' },
  transfer: { icon: 'transfer', tile: 'bg-primary-soft text-primary ring-primary/30', sign: '' },
  internal: { icon: 'transfer', tile: 'bg-primary-soft text-primary ring-primary/30', sign: '' },
};

const statusOrder: RequestStatus[] = ['approved', 'processing', 'pending', 'rejected'];

const statusDot: Record<RequestStatus, string> = {
  approved: 'bg-success shadow-[0_0_10px_var(--success)]',
  processing: 'bg-primary shadow-[0_0_10px_var(--brand-primary)]',
  pending: 'bg-warning shadow-[0_0_10px_var(--warning)]',
  rejected: 'bg-danger shadow-[0_0_10px_var(--danger)]',
};

const statusBar: Record<RequestStatus, string> = {
  approved: 'bg-success',
  processing: 'bg-primary',
  pending: 'bg-warning',
  rejected: 'bg-danger',
};

// Internal account-to-account moves are shown under Transfer, since users think of them as transfers.
function matchesFilter(transaction: Transaction, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'transfer') return transaction.type === 'transfer' || transaction.type === 'internal';
  return transaction.type === filter;
}

/** How the visible transactions split by status: one segmented bar plus a legend with counts. */
function StatusMix({ rows }: { rows: Transaction[] }) {
  const present = statusOrder
    .map((status) => ({ status, count: rows.filter((row) => row.status === status).length }))
    .filter((entry) => entry.count > 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div aria-hidden="true" className="flex h-1.5 gap-1 overflow-hidden rounded-full">
        {present.map((entry) => (
          <span
            key={entry.status}
            className={cx('h-full origin-left animate-grow rounded-full motion-reduce:animate-none', statusBar[entry.status])}
            style={{ flexGrow: entry.count }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        {present.map((entry) => (
          <li key={entry.status} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusBar[entry.status])} />
            {translate(`status.${entry.status}`)}
            <span className="font-semibold text-fg tabular-nums">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// `inLastPair`: in the 2-column feed (2xl) the last two rows have nothing below them, so their connector is hidden there.
function ActivityRow({ tx, index, isLast, inLastPair }: { tx: Transaction; index: number; isLast: boolean; inLastPair: boolean }) {
  const style = typeStyle[tx.type];
  const isRejected = tx.status === 'rejected';

  return (
    <li className="relative flex animate-rise gap-3 pl-1 motion-reduce:animate-none sm:gap-4" style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}>
      <span aria-hidden="true" className="relative flex w-3 shrink-0 justify-center">
        {!isLast && <span className={cx('absolute top-6 -bottom-3 w-px bg-linear-to-b from-line-strong to-line/30', inLastPair && '2xl:hidden')} />}
        <span className={cx('relative mt-[22px] size-2.5 rounded-full ring-4 ring-surface', statusDot[tx.status])} />
      </span>

      <div className="group relative flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden rounded-2xl border border-line bg-surface/50 p-3 transition-[translate,border-color,background-color] duration-300 hover:translate-x-1 hover:border-primary/40 hover:bg-surface motion-reduce:transition-none sm:p-3.5">
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 scale-y-0 rounded-full bg-primary transition-transform duration-300 group-hover:scale-y-100" />
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6', style.tile)}>
          <Icon name={style.icon} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{translate(`txType.${tx.type}`)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
            <span>{tx.method}</span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span className="inline-flex items-center gap-1 font-mono text-fg">
              <Icon name="accounts" size={11} className="text-fg-subtle" />
              {tx.accountLogin}
            </span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={11} className="text-fg-subtle" />
              {formatDate(tx.createdAt)}
            </span>
          </p>
        </div>

        <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
          <span
            className={cx(
              'text-base font-semibold tabular-nums',
              isRejected ? 'text-fg-subtle line-through decoration-danger/60' : tx.type === 'deposit' ? 'text-success' : 'text-fg',
            )}
          >
            {style.sign}
            {formatMoney(tx.amount, tx.currency)}
          </span>
          <StatusBadge status={tx.status} />
        </div>
      </div>
    </li>
  );
}

interface ActivityPanelProps {
  transactions?: Transaction[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ActivityPanel({ transactions, isRefreshing = false, onRefresh, className }: ActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const rows = transactions?.filter((transaction) => matchesFilter(transaction, filter));

  let body;
  if (!rows) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={translate('common.loading')}>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-[66px] w-full rounded-2xl" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = <EmptyState icon="inbox" title={translate('home.noTransactions')} />;
  } else {
    body = (
      <>
        <StatusMix key={`mix-${filter}`} rows={rows} />
        <ol key={filter} aria-label={translate('home.recentTransactions')} className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-2 2xl:gap-x-6">
          {rows.map((tx, index) => (
            <ActivityRow key={tx.id} tx={tx} index={index} isLast={index === rows.length - 1} inLastPair={index >= rows.length - 2} />
          ))}
        </ol>
      </>
    );
  }

  return (
    <section aria-labelledby="activity-title" className={cx('glass relative isolate flex min-w-0 flex-col gap-5 overflow-hidden rounded-[28px] p-5 sm:p-6', className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 animate-drift rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="activity-title" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-fg">
          <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/30">
            <Icon name="history" size={15} />
          </span>
          {translate('home.recentTransactions')}
        </h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" leftIcon="refresh" loading={isRefreshing} onClick={onRefresh}>
              {translate('home.refresh')}
            </Button>
          )}
          <LinkButton href="/history" size="sm" rightIcon="arrowRight">
            {translate('home.viewAll')}
          </LinkButton>
        </div>
      </div>

      <Tabs items={filterItems} value={filter} onChange={setFilter} ariaLabel={translate('home.recentTransactions')} />

      {body}
    </section>
  );
}
