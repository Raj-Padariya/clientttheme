'use client';

import type { ReactNode } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RequestStatus, Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
import { StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

// Same locale and zone as core formatDate, so the day headers and times agree with every other date shown.
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'UTC' });

const ENTRY_STAGGER_MS = 70;

const typeIcon: Record<Transaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

interface StatusStyle {
  dot: string;
  text: string;
  soft: string;
  halo: string;
  /** Gradient start for the ticket stub. */
  stub: string;
  stroke: string;
  /** Stroke of the light running along the arc while money moves. */
  comet: string;
}

const statusStyle: Record<RequestStatus, StatusStyle> = {
  approved: { dot: 'bg-success', text: 'text-success', soft: 'bg-success-soft ring-success/30', halo: 'bg-success/10', stub: 'from-success/10', stroke: 'stroke-primary/60', comet: 'stroke-primary' },
  rejected: { dot: 'bg-danger', text: 'text-danger', soft: 'bg-danger-soft ring-danger/30', halo: 'bg-danger/10', stub: 'from-danger/10', stroke: 'stroke-danger/60', comet: '' },
  pending: { dot: 'bg-warning', text: 'text-warning', soft: 'bg-warning-soft ring-warning/30', halo: 'bg-warning/10', stub: 'from-warning/10', stroke: 'stroke-warning/60', comet: 'stroke-warning' },
  processing: { dot: 'bg-info', text: 'text-info', soft: 'bg-info-soft ring-info/30', halo: 'bg-info/10', stub: 'from-info/10', stroke: 'stroke-info/60', comet: 'stroke-info' },
};

export interface StatusCount {
  status: RequestStatus;
  count: number;
}

/** Status mix of the current results as one split bar; each status pill filters the list to it (click again for all). */
export function StatusPulse({ counts, active, onSelect }: { counts: StatusCount[]; active: RequestStatus | 'all'; onSelect: (status: RequestStatus | 'all') => void }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex h-2 gap-1 overflow-hidden rounded-full bg-line">
        {total > 0 &&
          counts
            .filter((item) => item.count > 0)
            .map((item) => (
              <span
                key={item.status}
                className={cx('h-full origin-left animate-grow rounded-full transition-opacity duration-300 motion-reduce:animate-none', statusStyle[item.status].dot, active !== 'all' && active !== item.status && 'opacity-30')}
                style={{ width: `${(item.count / total) * 100}%` }}
              />
            ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={active === 'all'}
          onClick={() => onSelect('all')}
          className={cx(
            'inline-flex items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-3 text-xs font-semibold transition-[border-color,background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
            active === 'all' ? 'border-primary/60 bg-primary-soft text-primary' : 'border-line bg-surface/60 text-fg-muted hover:border-primary/30 hover:text-fg',
          )}
        >
          {translate('history.allStatus')}
          <span className="grid min-w-6 place-items-center rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg tabular-nums">{total}</span>
        </button>
        {counts.map((item) => {
          const isActive = active === item.status;
          const style = statusStyle[item.status];
          return (
            <button
              key={item.status}
              type="button"
              aria-pressed={isActive}
              disabled={item.count === 0 && !isActive}
              onClick={() => onSelect(isActive ? 'all' : item.status)}
              className={cx(
                'inline-flex items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-2.5 text-xs font-semibold transition-[border-color,background-color,color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 motion-reduce:transition-none',
                isActive ? cx('border-transparent ring-1', style.soft, style.text) : 'border-line bg-surface/60 text-fg-muted enabled:hover:border-primary/30 enabled:hover:text-fg',
              )}
            >
              <span aria-hidden="true" className="relative size-2">
                {isActive && <span className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', style.dot)} />}
                <span className={cx('relative block size-2 rounded-full', style.dot)} />
              </span>
              {translate(`status.${item.status}`)}
              <span className="grid min-w-6 place-items-center rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg tabular-nums">{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Account endpoints ("TA#…" trading, "WA#…"/"Wallet" wallet) get their account icon and mono type; payment methods a bank icon. */
function RouteNode({ label, caption, alignEnd }: { label: string; caption: string; alignEnd?: boolean }) {
  const isWallet = label.startsWith('WA#') || label === 'Wallet';
  const isTrading = label.startsWith('TA#');
  const icon: IconName = isWallet ? 'wallet' : isTrading ? 'accounts' : 'bank';

  return (
    <div className={cx('flex min-w-0 items-center gap-2.5', alignEnd && 'flex-row-reverse text-right')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-primary ring-1 ring-line transition-colors duration-300 group-hover/tx:ring-primary/40">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{caption}</p>
        <p className={cx('truncate text-sm', isWallet || isTrading ? 'font-semibold text-primary' : 'font-medium text-fg', label !== 'Wallet' && (isWallet || isTrading) && 'font-mono text-xs')}>
          {label}
        </p>
      </div>
    </div>
  );
}

// Source and destination joined by an arc; the orb on its crest tells the outcome — a check once settled, a cross
// when rejected, a pulsing status dot while it is still on its way.
function RouteHop({ tx }: { tx: Transaction }) {
  const style = statusStyle[tx.status];
  const isRejected = tx.status === 'rejected';
  const isSettled = tx.status === 'approved';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(4rem,0.8fr)_minmax(0,1fr)] items-center gap-2">
      <RouteNode label={tx.source} caption={translate('history.col.source')} />
      <div aria-hidden="true" className="relative h-12">
        <svg viewBox="0 0 120 40" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <path d="M2 34 Q60 -10 118 34" fill="none" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className={style.stroke} />
          {!isRejected && (
            <path
              d="M2 34 Q60 -10 118 34"
              pathLength={100}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="14 186"
              className={cx('animate-arc-run drop-shadow-[0_0_4px_var(--brand-primary)] motion-reduce:hidden', style.comet)}
            />
          )}
        </svg>
        <span className="absolute top-[30%] left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center">
          {isSettled && (
            <>
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:hidden" />
              <span className="relative grid size-6 place-items-center rounded-full bg-primary text-on-primary shadow-[0_0_14px_var(--brand-primary)] transition-transform duration-300 group-hover/tx:scale-110 motion-reduce:transition-none">
                <Icon name="check" size={12} />
              </span>
            </>
          )}
          {isRejected && (
            <span className="grid size-6 place-items-center rounded-full bg-danger-soft text-danger ring-1 ring-danger/40">
              <Icon name="close" size={11} />
            </span>
          )}
          {!isSettled && !isRejected && (
            <>
              <span className={cx('absolute inset-0 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden', style.dot)} />
              <span className={cx('relative size-2.5 rounded-full', style.dot)} />
            </>
          )}
        </span>
        <Icon name="chevronRight" size={12} className={cx('absolute right-0 bottom-[8%] rotate-45', isRejected ? 'text-danger/60' : 'text-primary')} />
      </div>
      <RouteNode label={tx.destination} caption={translate('history.col.destination')} alignEnd />
    </div>
  );
}

/** Action tile on the ticket stub (payment details, proof); rendered as a dashed placeholder when there is nothing to open. */
export function EntryAction({ icon, label, ariaLabel, onClick }: { icon: IconName; label: string; ariaLabel: string; onClick?: () => void }) {
  const tileClass = 'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase';

  if (!onClick) {
    return (
      <span className={cx(tileClass, 'border border-dashed border-line text-fg-subtle')}>
        <span aria-hidden="true" className="text-sm leading-[14px]">—</span>
        <span className="max-w-full truncate">{label}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cx(
        tileClass,
        'group/action border border-line bg-surface/60 text-fg-muted transition-[border-color,background-color,color,translate] duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
      )}
    >
      <Icon name={icon} size={14} className="transition-transform duration-300 group-hover/action:scale-110 motion-reduce:transition-none" />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

export interface TimelineMeta {
  key: string;
  icon: IconName;
  label: string;
  value: ReactNode;
}

export interface TimelineEntryData {
  tx: Transaction;
  serial: number;
  typeBadge: ReactNode;
  amount: string;
  meta: TimelineMeta[];
  actions: ReactNode;
}

// One transaction as a ticket: the body (identity, the source → destination hop, details) and a status-tinted
// stub torn off along a perforation (time, status, amount, actions).
function TimelineEntry({ entry, order, isLast }: { entry: TimelineEntryData; order: number; isLast: boolean }) {
  const { tx, serial, typeBadge, amount, meta, actions } = entry;
  const style = statusStyle[tx.status];
  const isRejected = tx.status === 'rejected';
  const isOutgoing = tx.type === 'withdrawal';
  const tilt = useTilt<HTMLDivElement>(3);

  return (
    <li style={{ animationDelay: `${120 + order * ENTRY_STAGGER_MS}ms` }} className="relative animate-rise pl-9 motion-reduce:animate-none sm:pl-12">
      {!isLast && <span aria-hidden="true" className="absolute top-12 -bottom-4 left-[11px] w-px bg-linear-to-b from-primary/40 to-line sm:left-[17px]" />}
      <span aria-hidden="true" className="absolute top-8 left-0 grid size-6 place-items-center sm:left-1.5">
        <span className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
        <span className={cx('relative size-2.5 rounded-full ring-4 ring-surface', style.dot)} />
      </span>

      {/* Tilt lives on a wrapper: orbit-tilt owns `transition`, so the card keeps its own border/shadow/lift transition. */}
      <div {...tilt} className="orbit-tilt">
      <article className="group/tx relative isolate grid min-w-0 overflow-hidden rounded-3xl border border-line bg-surface/70 backdrop-blur transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_48px_-32px_var(--brand-primary)] motion-reduce:transition-none md:grid-cols-[minmax(0,1fr)_230px]">
        <div className="relative isolate flex min-w-0 flex-col gap-5 p-4 sm:p-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-2/3 opacity-50 [background-image:radial-gradient(color-mix(in_srgb,var(--brand-primary)_26%,transparent)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_right,black,transparent)]"
          />
          <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/tx:opacity-100 motion-reduce:transition-none" />

          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/25 transition-transform duration-500 group-hover/tx:rotate-[-20deg] group-hover/tx:scale-110 motion-reduce:transition-none">
              <span aria-hidden="true" className="orbit-ring absolute -inset-1.5 animate-orbit-spin-fast motion-reduce:animate-none" />
              <Icon name={typeIcon[tx.type]} size={18} />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-fg-subtle tabular-nums">
                  <span className="sr-only">{translate('history.col.srNo')} </span>#{String(serial).padStart(2, '0')}
                </span>
                {typeBadge}
              </p>
              <p className="mt-1 truncate font-mono text-base font-semibold tracking-wider text-fg">{tx.reference}</p>
            </div>
          </div>

          <RouteHop tx={tx} />

          <ul className="grid grid-cols-1 gap-3 border-t border-dashed border-line pt-4 sm:grid-cols-3">
            {meta.map((item) => (
              <li key={item.key} className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                  <Icon name={item.icon} size={11} className="shrink-0 text-primary" />
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-fg">{item.value}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative isolate flex flex-col gap-4 border-t-2 border-dashed border-line-strong p-4 sm:p-5 md:border-t-0 md:border-l-2">
          <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 -z-10 bg-linear-to-b to-transparent', style.stub)} />
          <span aria-hidden="true" className={cx('pointer-events-none absolute -right-12 -bottom-12 -z-10 size-40 rounded-full blur-3xl', style.halo)} />
          {tx.status === 'approved' && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}

          <div className="flex items-center justify-between gap-2">
            <time dateTime={tx.createdAt} className="font-mono text-xs font-semibold text-fg-muted tabular-nums">
              {timeFormatter.format(new Date(tx.createdAt))}
            </time>
            <StatusBadge status={tx.status} />
          </div>

          <div className="min-w-0">
            <p
              className={cx(
                'truncate text-3xl font-black tracking-[-0.02em] tabular-nums transition-transform duration-300 group-hover/tx:scale-105 motion-reduce:transition-none',
                isRejected && 'text-fg-muted line-through decoration-danger/70 decoration-2',
                !isRejected && isOutgoing && 'text-danger',
                !isRejected && !isOutgoing && 'orbit-text',
              )}
            >
              <span className="sr-only">{translate('history.col.amount')} </span>
              {amount}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-muted">
              <Icon name="calendar" size={11} />
              {formatDate(tx.createdAt)}
            </p>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">{actions}</div>
        </div>
      </article>
      </div>
    </li>
  );
}

/** Entries grouped under a header per calendar day (UTC, like formatDate), newest first as given. */
export function HistoryTimeline({ entries, label }: { entries: TimelineEntryData[]; label: string }) {
  // Each entry keeps its overall position so the entrance stagger runs straight down the page across days.
  const days: { key: string; entries: { entry: TimelineEntryData; order: number }[] }[] = [];
  entries.forEach((entry, order) => {
    const key = entry.tx.createdAt.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.key === key) last.entries.push({ entry, order });
    else days.push({ key, entries: [{ entry, order }] });
  });

  return (
    <div aria-label={label} role="region" className="flex flex-col gap-8">
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`history-day-${day.key}`} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h3
              id={`history-day-${day.key}`}
              className="inline-flex items-center gap-2 rounded-full bg-surface-2/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-fg uppercase ring-1 ring-line"
            >
              <Icon name="calendar" size={12} className="text-primary" />
              {dayFormatter.format(new Date(`${day.key}T00:00:00Z`))}
            </h3>
            <span className="grid min-w-6 place-items-center rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">{day.entries.length}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent" />
          </div>
          <ol className="flex flex-col gap-4">
            {day.entries.map(({ entry, order }, index) => (
              <TimelineEntry key={entry.tx.id} entry={entry} order={order} isLast={index === day.entries.length - 1} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
