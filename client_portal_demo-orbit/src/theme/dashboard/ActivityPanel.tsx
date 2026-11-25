'use client';

import { useState } from 'react';
import type { Transaction } from '@/core/types';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

type ActivityFilter = 'all' | 'deposit' | 'withdrawal' | 'transfer';

const SKELETON_ROWS = 6;

const filterItems = [
  { value: 'all' as const, label: 'All' },
  { value: 'deposit' as const, label: translate('txType.deposit') },
  { value: 'withdrawal' as const, label: translate('txType.withdrawal') },
  { value: 'transfer' as const, label: translate('txType.transfer') },
];

function getAvatarBg(accountLogin: string) {
  const colors = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  const hash = accountLogin.charCodeAt(0) + accountLogin.charCodeAt(accountLogin.length - 1);
  return colors[hash % colors.length];
}

function getAvatarInitials(accountLogin: string) {
  return accountLogin.slice(0, 2).toUpperCase();
}

function matchesFilter(tx: Transaction, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  return tx.type === filter;
}

interface ActivityPanelProps {
  transactions?: Transaction[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ActivityPanel({ transactions = [], className }: ActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filtered = transactions.filter((tx) => matchesFilter(tx, filter));
  const isLoading = !transactions;

  return (
    <section className={cx('flex min-w-0 flex-col gap-0 orbit-card animate-rise overflow-hidden motion-reduce:animate-none', className)}>
      {/* Header */}
      <div className="bg-bg-secondary/30 px-6 py-5 border-b border-line/30">
        <h2 className="text-xl font-bold text-fg">{translate('home.recentTransactions')}</h2>
        <p className="text-sm text-fg-muted mt-1">Your most recent activity</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-line/20 px-6 bg-bg-secondary/20">
        {filterItems.map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={cx(
              'px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px',
              filter === item.value
                ? 'border-orbit-violet text-fg'
                : 'border-transparent text-fg-muted hover:text-fg hover:bg-bg-secondary/50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-6">
          <Icon name="inbox" size={40} className="text-fg-muted/40" />
          <div className="text-center">
            <p className="font-medium text-fg">No transactions</p>
            <p className="text-sm text-fg-muted">Try adjusting your filters</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line/20">
          {filtered.map((tx, index) => {
            const createdDate = new Date(tx.createdAt);
            const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const avatarBg = getAvatarBg(tx.accountLogin);
            const initials = getAvatarInitials(tx.accountLogin);
            
            const isApproved = tx.status === 'approved';
            const isRejected = tx.status === 'rejected';
            const statusDot = isApproved ? 'bg-success' : isRejected ? 'bg-danger' : 'bg-warning';
            const statusText = isApproved ? 'Completed' : isRejected ? 'Failed' : 'In Process';

            return (
              <div
                key={tx.id}
                className="group flex items-center gap-4 px-6 py-4 hover:bg-bg-secondary/40 transition-colors"
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 40}ms both`,
                }}
              >
                {/* Avatar */}
                <div className={cx('flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-sm', avatarBg)}>
                  {initials}
                </div>

                {/* Name */}
                <div className="flex-shrink-0 min-w-fit">
                  <p className="font-semibold text-fg">{tx.accountLogin}</p>
                </div>

                {/* Date + Time */}
                <div className="flex-shrink-0 min-w-fit">
                  <p className="text-sm text-fg-muted">
                    {dateStr} {timeStr}
                  </p>
                </div>

                {/* Amount */}
                <div className="flex-shrink-0 min-w-fit">
                  <p className={cx('font-bold tabular-nums', tx.type === 'deposit' ? 'text-success' : 'text-fg')}>
                    {tx.type === 'deposit' ? '+' : '-'}{formatMoney(Math.abs(tx.amount), tx.currency)}
                  </p>
                </div>

                {/* Method */}
                <div className="flex-shrink-0 min-w-fit">
                  <p className="text-sm text-fg-muted">{tx.method}</p>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0 flex items-center gap-2 min-w-fit ml-auto">
                  <div className="flex items-center gap-2">
                    <div className={cx('h-2.5 w-2.5 rounded-full', statusDot)} />
                    <span className="text-sm font-medium text-fg-muted whitespace-nowrap">{statusText}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
