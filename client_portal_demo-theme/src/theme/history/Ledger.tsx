'use client';

import type { PointerEvent, ReactNode } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RequestStatus, Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

export const ledgerCaptionClass = 'text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';

export type Accent = 'success' | 'danger' | 'warning';

export function statusAccent(status: RequestStatus): Accent {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

const accentNode: Record<Accent, string> = {
  success: 'bg-success text-success',
  danger: 'bg-danger text-danger',
  warning: 'bg-warning text-warning',
};

const typeIcon: Record<Transaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

function trackPointer(event: PointerEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
}

/** Account endpoints ("TA#…" trading, "WA#…"/"Wallet" wallet) get an icon and mono type; payment methods stay plain. */
function Endpoint({ label, caption, alignEnd }: { label: string; caption: string; alignEnd: boolean }) {
  const isWallet = label.startsWith('WA#') || label === 'Wallet';
  const isTrading = label.startsWith('TA#');
  const icon: IconName | null = isWallet ? 'wallet' : isTrading ? 'accounts' : null;
  return (
    <div className={cx('min-w-0', alignEnd && 'text-right')}>
      <p className={ledgerCaptionClass}>{caption}</p>
      <p className={cx('inline-flex max-w-full items-center gap-1.5 text-sm', icon ? 'font-semibold text-primary' : 'font-medium text-fg', (isWallet || isTrading) && label !== 'Wallet' && 'font-mono text-xs')}>
        {icon && <Icon name={icon} size={14} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
    </div>
  );
}

/** Source → destination route: live money flows along it, rejected money stops at a cross. */
export function FlowRoute({ tx }: { tx: Transaction }) {
  const isRejected = tx.status === 'rejected';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Endpoint label={tx.source} caption={translate('history.col.source')} alignEnd={false} />
      <div aria-hidden="true" className="relative h-6 min-w-12 flex-1">
        <span
          className={cx(
            'absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[length:12px_2px] bg-repeat-x',
            isRejected
              ? 'bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-danger,#ef4444)_45%,transparent)_50%,transparent_50%)] opacity-60'
              : 'animate-dash-flow bg-[linear-gradient(90deg,color-mix(in_srgb,var(--brand-primary)_70%,transparent)_50%,transparent_50%)] motion-reduce:animate-none',
          )}
        />
        {isRejected ? (
          <span className="absolute top-1/2 left-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-danger-soft text-danger ring-1 ring-danger/40">
            <Icon name="close" size={10} />
          </span>
        ) : (
          <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 animate-route-dot rounded-full bg-primary shadow-[0_0_10px_2px_var(--brand-primary)] motion-reduce:hidden" />
        )}
        <Icon name="chevronRight" size={12} className={cx('absolute top-1/2 -right-1 -translate-y-1/2', isRejected ? 'text-danger/50' : 'text-primary')} />
      </div>
      <Endpoint label={tx.destination} caption={translate('history.col.destination')} alignEnd />
    </div>
  );
}

export interface LedgerMeta {
  key: string;
  icon: IconName;
  label: string;
  value: ReactNode;
}

interface LedgerRowProps {
  tx: Transaction;
  serial: number;
  index: number;
  isLast: boolean;
  typeBadge: ReactNode;
  amount: string;
  /** Small chips under the route (payment method, transaction id, last update…). */
  meta: LedgerMeta[];
  actions: ReactNode;
}

/** One transaction as a timeline card: identity, animated route, meta chips, amount + status and actions. */
export function LedgerRow({ tx, serial, index, isLast, typeBadge, amount, meta, actions }: LedgerRowProps) {
  const accent = statusAccent(tx.status);
  const isRejected = tx.status === 'rejected';
  const isApproved = tx.status === 'approved';
  const isOutgoing = tx.type === 'withdrawal';

  return (
    <li style={{ animationDelay: `${150 + index * 90}ms` }} className="relative animate-rise pl-9 motion-reduce:animate-none sm:pl-11">
      {/* Timeline spine joining this entry to the next, with a status node level with the card's first line. */}
      {!isLast && <span aria-hidden="true" className="absolute top-9 -bottom-3 left-[11px] w-px bg-linear-to-b from-fg/25 to-fg/5 sm:left-[15px]" />}
      <span aria-hidden="true" className={cx('absolute top-7 left-1 size-4 rounded-full ring-4 ring-surface sm:left-2', accentNode[accent])}>
        {!isRejected && <span className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />}
      </span>

      <div
        onPointerMove={trackPointer}
        className={cx(
          'group relative overflow-hidden rounded-2xl border bg-surface-2/40 transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
          isApproved ? 'border-primary/35 shadow-[0_18px_40px_-28px_var(--brand-primary)] hover:border-primary/60' : 'border-line hover:border-fg/20',
        )}
      >
        <span
          aria-hidden="true"
          style={{ background: 'radial-gradient(260px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--brand-primary) 14%, transparent), transparent 70%)' }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', isApproved ? '[background-image:var(--brand-gradient)]' : isRejected ? 'bg-danger/50' : 'bg-warning/60')} />
        {isApproved && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
        <span aria-hidden="true" className="pointer-events-none absolute -right-2 -bottom-6 text-7xl font-black text-fg/[0.04] tabular-nums">
          {serial}
        </span>

        <div className="relative grid gap-4 p-4 pl-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,0.8fr)_auto] lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6">
              <Icon name={typeIcon[tx.type]} size={18} />
              <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-surface px-1 text-[10px] font-bold text-fg-muted ring-1 ring-line tabular-nums">
                <span className="sr-only">{translate('history.col.srNo')} </span>
                {serial}
              </span>
            </span>
            <div className="min-w-0">
              {typeBadge}
              <p className="mt-1 truncate font-mono text-xs font-semibold tracking-wider text-primary">{tx.reference}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
                <Icon name="calendar" size={11} />
                {formatDate(tx.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2.5">
            <FlowRoute tx={tx} />
            <div className="flex flex-wrap gap-1.5">
              {meta.map((item) => (
                <span key={item.key} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] text-fg-muted ring-1 ring-line">
                  <Icon name={item.icon} size={11} className="shrink-0 text-primary" />
                  {item.label}: <span className="truncate font-medium text-fg">{item.value}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-center">
            <span
              className={cx(
                'text-lg font-black tabular-nums',
                isRejected && 'text-fg-muted line-through decoration-danger/70 decoration-2',
                !isRejected && isOutgoing && 'text-danger',
                !isRejected &&
                  !isOutgoing &&
                  'animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-transparent motion-reduce:animate-none',
              )}
            >
              <span className="sr-only">{translate('history.col.amount')} </span>
              {amount}
            </span>
            <StatusBadge status={tx.status} />
          </div>

          <div className="flex items-center gap-2 justify-self-end">{actions}</div>
        </div>
      </div>
    </li>
  );
}
