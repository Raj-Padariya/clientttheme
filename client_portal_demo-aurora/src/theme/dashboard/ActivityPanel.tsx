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
          <span aria-hidden="true" className="aurora-pill grid size-9 shrink-0 place-items-center rounded-xl">
            <Icon name="history" size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-fg">{translate('home.recentTransactions')}</h2>
            <p className="text-xs text-fg-muted">Your most recent activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div role="tablist" aria-label={translate('home.recentTransactions')} className="flex gap-4 border-b border-fg/[0.08]">
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
                    "relative h-9 text-xs font-semibold transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:rounded-full after:bg-(--aurora-ribbon-a) after:transition-transform after:duration-300 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:after:transition-none",
                    isActive ? 'text-fg after:scale-x-100' : 'text-fg-subtle after:scale-x-0 hover:text-fg-muted',
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
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-fg/[0.05] text-fg-muted transition-colors hover:bg-fg/[0.1] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="sliders" size={17} />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
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
        // A timeline: one vertical rail, a dot per transaction in its type colour, newest on top.
        <ol className="relative flex flex-col">
          <span aria-hidden="true" className="absolute top-5 bottom-5 left-[19px] w-px bg-linear-to-b from-fg/20 via-fg/10 to-transparent" />
          {filtered.map((tx, index) => {
            const createdDate = new Date(tx.createdAt);
            const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const style = typeStyle[tx.type];

            const isApproved = tx.status === 'approved';
            const isRejected = tx.status === 'rejected';
            const statusDot = isApproved ? 'bg-success' : isRejected ? 'bg-danger' : 'bg-warning';
            const statusText = isApproved ? 'Completed' : isRejected ? 'Failed' : 'In Process';

            return (
              <li key={tx.id} className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}>
                {/* The whole row opens the payment details, like the old row's action button. */}
                <button
                  type="button"
                  onClick={() => setOpenTx(tx)}
                  aria-label={`${style.label} ${signedAmount(tx)} · ${translate('history.detailsTitle')}`}
                  className="group relative flex w-full items-center gap-3 rounded-2xl py-2.5 pr-3 text-left transition-colors hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span aria-hidden="true" className={cx('relative z-10 grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-app', style.coin)}>
                    <Icon name={style.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-fg">{style.label}</span>
                      <span className="shrink-0 text-[11px] text-fg-subtle tabular-nums">
                        {dateStr} · {timeStr}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-fg-muted">
                      {tx.accountLogin} · {tx.method}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cx('text-sm font-semibold tabular-nums', tx.type === 'deposit' ? 'text-success' : 'text-fg')}>{signedAmount(tx)}</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
                      <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusDot)} />
                      {statusText}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {openTx && <PaymentDetailsModal tx={openTx} amount={signedAmount(openTx)} onClose={() => setOpenTx(null)} />}
    </section>
  );
}
