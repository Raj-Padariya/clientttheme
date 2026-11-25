'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Transaction } from '@/core/types';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { PaymentDetailsModal } from '../history/TransactionModals';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

type ActivityFilter = 'all' | 'deposit' | 'withdrawal' | 'transfer';

const SKELETON_ROWS = 6;
const ROW_STAGGER_MS = 45;

const filterItems = [
  { value: 'all' as const, label: 'All' },
  { value: 'deposit' as const, label: translate('txType.deposit') },
  { value: 'withdrawal' as const, label: translate('txType.withdrawal') },
  { value: 'transfer' as const, label: translate('txType.transfer') },
];


// Each type gets a coin-style icon in its own tint, and a matching pill in the Type column.
const typeStyle: Record<Transaction['type'], { icon: IconName; coin: string; pill: string; label: string }> = {
  deposit: { icon: 'deposit', coin: 'bg-primary/12 text-primary ring-primary/30', pill: 'bg-primary/12 text-primary ring-primary/25', label: translate('txType.deposit') },
  withdrawal: {
    icon: 'withdrawal',
    coin: 'bg-(--brand-accent)/12 text-(--brand-accent) ring-(--brand-accent)/30',
    pill: 'bg-(--brand-accent)/12 text-(--brand-accent) ring-(--brand-accent)/25',
    label: translate('txType.withdrawal'),
  },
  transfer: { icon: 'transfer', coin: 'bg-info-soft text-info ring-info/30', pill: 'bg-info-soft text-info ring-info/25', label: translate('txType.transfer') },
  internal: { icon: 'transfer', coin: 'bg-warning-soft text-warning ring-warning/30', pill: 'bg-warning-soft text-warning ring-warning/25', label: translate('txType.internal') },
};

function matchesFilter(tx: Transaction, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  return tx.type === filter;
}

function signedAmount(tx: Transaction): string {
  return `${tx.type === 'deposit' ? '+' : '-'}${formatMoney(Math.abs(tx.amount), tx.currency)}`;
}

interface ActivityPanelProps {
  transactions?: Transaction[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

/** Recent transactions as a tile grid: coin + type + time, account · method, signed amount and status; a tile opens its details. */
export function ActivityPanel({ transactions = [], className }: ActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [openTx, setOpenTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter((tx) => matchesFilter(tx, filter));
  const isLoading = !transactions;

  return (
    <section className={cx('orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-5 overflow-hidden p-5 motion-reduce:animate-none sm:p-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
            <Icon name="history" size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-fg">{translate('home.recentTransactions')}</h2>
            <p className="text-xs text-fg-muted">Your most recent activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div role="tablist" aria-label={translate('home.recentTransactions')} className="flex gap-1 rounded-full bg-surface-2/70 p-1 ring-1 ring-line">
            {filterItems.map((item) => {
              const isActive = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilter(item.value)}
                  className={cx(
                    'h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive
                      ? 'bg-primary text-on-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.4),inset_0_-2px_4px_rgb(0_0_0/0.18),0_6px_14px_-6px_var(--brand-primary)]'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <Link
            href="/history"
            aria-label={translate('nav.history')}
            title={translate('nav.history')}
            className="nova-gloss grid size-10 shrink-0 place-items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="sliders" size={17} />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[22px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
          <Icon name="inbox" size={40} className="text-fg-muted/40" />
          <div className="text-center">
            <p className="font-medium text-fg">No transactions</p>
            <p className="text-sm text-fg-muted">Try adjusting your filters</p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tx, index) => {
            const createdDate = new Date(tx.createdAt);
            const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const style = typeStyle[tx.type];

            const isApproved = tx.status === 'approved';
            const isRejected = tx.status === 'rejected';
            const statusTone = isApproved ? 'bg-success-soft text-success' : isRejected ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning';
            const statusText = isApproved ? 'Completed' : isRejected ? 'Failed' : 'In Process';

            return (
              <li key={tx.id} className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}>
                {/* The whole tile opens the payment details, like the old row's action button. */}
                <button
                  type="button"
                  onClick={() => setOpenTx(tx)}
                  aria-label={`${style.label} ${signedAmount(tx)} · ${translate('history.detailsTitle')}`}
                  className="group flex h-full w-full flex-col gap-4 rounded-[22px] bg-surface-2/55 p-4 text-left ring-1 ring-line transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-surface-2/85 hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'nova-coin grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none',
                        style.coin,
                      )}
                    >
                      <Icon name={style.icon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-base font-semibold text-fg">{style.label}</span>
                      <span className="mt-0.5 block text-[11px] text-fg-subtle tabular-nums">
                        {dateStr} · {timeStr}
                      </span>
                    </span>
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-medium tracking-wide text-fg-muted uppercase">
                      {tx.accountLogin} · {tx.method}
                    </span>
                    <span className="mt-1.5 flex items-end justify-between gap-2">
                      <span className={cx('truncate text-2xl font-semibold tracking-tight tabular-nums', tx.type === 'deposit' ? 'text-success' : 'text-fg')}>
                        {signedAmount(tx)}
                      </span>
                      <span className={cx('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', statusTone)}>{statusText}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openTx && <PaymentDetailsModal tx={openTx} amount={signedAmount(openTx)} onClose={() => setOpenTx(null)} />}
    </section>
  );
}
