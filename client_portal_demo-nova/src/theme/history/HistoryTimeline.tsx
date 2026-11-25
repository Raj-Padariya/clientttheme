'use client';

import type { ReactNode } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RequestStatus, Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

// Same locale and zone as core formatDate, so the day headers and times agree with every other date shown.
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dayNumberFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' });
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'UTC' });

const ENTRY_STAGGER_MS = 70;
const KEY_STAGGER_MS = 60;

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
  ring: string;
  /** How far the coin's ring is drawn: a full ring once settled either way, partial while still moving. */
  progress: number;
}

const statusStyle: Record<RequestStatus, StatusStyle> = {
  approved: { dot: 'bg-success', text: 'text-success', soft: 'bg-success-soft ring-success/30', ring: 'stroke-success', progress: 100 },
  rejected: { dot: 'bg-danger', text: 'text-danger', soft: 'bg-danger-soft ring-danger/30', ring: 'stroke-danger', progress: 100 },
  pending: { dot: 'bg-warning', text: 'text-warning', soft: 'bg-warning-soft ring-warning/30', ring: 'stroke-warning', progress: 33 },
  processing: { dot: 'bg-info', text: 'text-info', soft: 'bg-info-soft ring-info/30', ring: 'stroke-info', progress: 66 },
};

export interface StatusCount {
  status: RequestStatus;
  count: number;
}

// Small ring of a share (0-100) used on the status keys.
function ShareRing({ share, strokeClass }: { share: number; strokeClass: string }) {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="size-9 shrink-0 -rotate-90">
      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5" className="stroke-current opacity-15" />
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${share} 100`}
        className={cx('transition-[stroke-dasharray] duration-700 motion-reduce:transition-none', strokeClass)}
      />
    </svg>
  );
}

interface StatusKeyProps {
  label: string;
  count: number;
  share: number;
  isActive: boolean;
  disabled?: boolean;
  dotClass: string;
  ringClass: string;
  index: number;
  onClick: () => void;
}

function StatusKey({ label, count, share, isActive, disabled, dotClass, ringClass, index, onClick }: StatusKeyProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: `${80 + index * KEY_STAGGER_MS}ms` }}
      className={cx(
        'group/key relative isolate flex min-w-0 animate-rise items-center justify-between gap-3 overflow-hidden rounded-[20px] p-3.5 text-left transition-[translate,background-color,box-shadow,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
        isActive
          ? 'nova-edge-light bg-linear-to-br from-white to-[#cfdcf0] text-[#0a1220] shadow-[0_14px_30px_-18px_rgb(0_0_0/0.8)]'
          : 'bg-surface text-fg ring-1 ring-line enabled:hover:-translate-y-0.5 enabled:hover:ring-line-strong',
      )}
    >
      {isActive && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}
      <span className="min-w-0">
        <span className={cx('flex items-center gap-1.5 text-[11px] font-semibold', isActive ? 'text-[#4b5a70]' : 'text-fg-muted')}>
          <span aria-hidden="true" className="relative size-2">
            {isActive && <span className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', dotClass)} />}
            <span className={cx('relative block size-2 rounded-full', dotClass)} />
          </span>
          <span className="truncate">{label}</span>
        </span>
        <span className="mt-1 block text-2xl font-bold tracking-[-0.02em] tabular-nums">{String(count).padStart(2, '0')}</span>
      </span>
      <ShareRing share={share} strokeClass={ringClass} />
    </button>
  );
}

/** Status mix of the current results as keys with their share rings plus a split bar; each key filters the list to it (click again for all). */
export function StatusPulse({ counts, active, onSelect }: { counts: StatusCount[]; active: RequestStatus | 'all'; onSelect: (status: RequestStatus | 'all') => void }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const shareOf = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <StatusKey
          label={translate('history.allStatus')}
          count={total}
          share={total > 0 ? 100 : 0}
          isActive={active === 'all'}
          dotClass="bg-fg-subtle"
          ringClass={active === 'all' ? 'stroke-[#0a1220]' : 'stroke-fg'}
          index={0}
          onClick={() => onSelect('all')}
        />
        {counts.map((item, index) => {
          const isActive = active === item.status;
          const style = statusStyle[item.status];
          return (
            <StatusKey
              key={item.status}
              label={translate(`status.${item.status}`)}
              count={item.count}
              share={shareOf(item.count)}
              isActive={isActive}
              disabled={item.count === 0 && !isActive}
              dotClass={style.dot}
              ringClass={style.ring}
              index={index + 1}
              onClick={() => onSelect(isActive ? 'all' : item.status)}
            />
          );
        })}
      </div>

      <div aria-hidden="true" className="flex h-1 gap-1 overflow-hidden rounded-full bg-line">
        {total > 0 &&
          counts
            .filter((item) => item.count > 0)
            .map((item) => (
              <span
                key={item.status}
                className={cx('h-full origin-left animate-grow rounded-full transition-opacity duration-300 motion-reduce:animate-none', statusStyle[item.status].dot, active !== 'all' && active !== item.status && 'opacity-25')}
                style={{ width: `${(item.count / total) * 100}%` }}
              />
            ))}
      </div>
    </div>
  );
}

/** Account endpoints ("TA#…" trading, "WA#…"/"Wallet" wallet) get their account icon and mono type; payment methods a bank icon. */
function RouteStop({ label, caption, isEnd, status }: { label: string; caption: string; isEnd?: boolean; status: RequestStatus }) {
  const isWallet = label.startsWith('WA#') || label === 'Wallet';
  const isTrading = label.startsWith('TA#');
  const icon: IconName = isWallet ? 'wallet' : isTrading ? 'accounts' : 'bank';
  const isMoving = status === 'pending' || status === 'processing';

  return (
    <div className="relative flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
        {isEnd && isMoving && <span className={cx('absolute inset-0 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden', statusStyle[status].dot)} />}
        <span
          className={cx(
            'relative size-2.5 rounded-full',
            isEnd ? (status === 'rejected' ? 'bg-danger' : 'bg-fg') : 'bg-surface ring-2 ring-fg-subtle',
          )}
        />
      </span>
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted ring-1 ring-line transition-colors duration-300 group-hover/tx:text-fg">
        <Icon name={icon} size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{caption}</p>
        <p className={cx('truncate text-sm text-fg', isWallet || isTrading ? 'font-semibold' : 'font-medium', label !== 'Wallet' && (isWallet || isTrading) && 'font-mono text-xs')}>{label}</p>
      </div>
    </div>
  );
}

// Source on top, destination below, joined by a dotted spine; the destination dot pulses while money is still moving.
function RouteSpine({ tx }: { tx: Transaction }) {
  return (
    <div className="relative flex min-w-0 flex-col gap-2">
      <span aria-hidden="true" className="absolute top-5 bottom-5 left-[9.5px] border-l-2 border-dotted border-line-strong" />
      <RouteStop label={tx.source} caption={translate('history.col.source')} status={tx.status} />
      <RouteStop label={tx.destination} caption={translate('history.col.destination')} status={tx.status} isEnd />
    </div>
  );
}

// The type icon inside a status ring: a full ring once settled, a partial one that keeps turning while in progress.
function StatusCoin({ tx }: { tx: Transaction }) {
  const style = statusStyle[tx.status];
  const isMoving = tx.status === 'pending' || tx.status === 'processing';

  return (
    <span className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" aria-hidden="true" className={cx('absolute inset-0 size-full -rotate-90', isMoving && 'animate-orbit-spin motion-reduce:animate-none')}>
        <circle cx="24" cy="24" r="21" fill="none" strokeWidth="2.5" className="stroke-line" />
        <circle cx="24" cy="24" r="21" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength={100} strokeDasharray={`${style.progress} 100`} className={style.ring} />
      </svg>
      <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg transition-transform duration-500 group-hover/tx:-rotate-12 group-hover/tx:scale-105 motion-reduce:transition-none">
        <Icon name={typeIcon[tx.type]} size={16} />
      </span>
    </span>
  );
}

/** Action key in an entry's footer (payment details, proof); rendered as a dashed placeholder when there is nothing to open. */
export function EntryAction({ icon, label, ariaLabel, onClick }: { icon: IconName; label: string; ariaLabel: string; onClick?: () => void }) {
  const keyClass = 'inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold';

  if (!onClick) {
    return (
      <span className={cx(keyClass, 'border border-dashed border-line text-fg-subtle')}>
        <span aria-hidden="true">—</span>
        <span className="truncate">{label}</span>
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
        keyClass,
        'group/action bg-surface-2 text-fg-muted ring-1 ring-line transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
      )}
    >
      <Icon name={icon} size={13} className="shrink-0 transition-transform duration-300 group-hover/action:scale-110 motion-reduce:transition-none" />
      <span className="truncate">{label}</span>
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

// One transaction as a ledger strip: identity with the status coin, the source → destination spine and the
// amount block in one row, then the details and actions along a dashed footer.
function LedgerEntry({ entry, order }: { entry: TimelineEntryData; order: number }) {
  const { tx, serial, typeBadge, amount, meta, actions } = entry;
  const style = statusStyle[tx.status];
  const isRejected = tx.status === 'rejected';
  const isOutgoing = tx.type === 'withdrawal';

  return (
    <li style={{ animationDelay: `${120 + order * ENTRY_STAGGER_MS}ms` }} className="animate-rise motion-reduce:animate-none">
      <article className="group/tx @container relative isolate overflow-hidden rounded-[22px] bg-surface ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-pop hover:ring-line-strong motion-reduce:transition-none">
        <span aria-hidden="true" className={cx('absolute inset-y-5 left-0 w-[3px] rounded-r-full', style.dot)} />
        <span aria-hidden="true" className="nova-edge-light pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/tx:opacity-100 motion-reduce:transition-none" />
        {tx.status === 'approved' && (
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen opacity-0 transition-opacity duration-300 group-hover/tx:opacity-100 motion-reduce:hidden" />
        )}

        <div className="grid gap-4 p-4 sm:p-5 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] @3xl:items-center @3xl:gap-8">
          <div className="flex min-w-0 items-center gap-3.5">
            <StatusCoin tx={tx} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-fg-subtle tabular-nums">
                  <span className="sr-only">{translate('history.col.srNo')} </span>#{String(serial).padStart(2, '0')}
                </span>
                {typeBadge}
              </p>
              <p className="mt-1 truncate font-mono text-base font-semibold tracking-wider text-fg">{tx.reference}</p>
              <time dateTime={tx.createdAt} className="mt-0.5 block font-mono text-[11px] text-fg-subtle tabular-nums">
                {timeFormatter.format(new Date(tx.createdAt))}
              </time>
            </div>
          </div>

          <RouteSpine tx={tx} />

          <div className="flex min-w-0 items-end justify-between gap-3 border-t border-line pt-4 @3xl:flex-col @3xl:items-end @3xl:border-t-0 @3xl:pt-0">
            <p
              className={cx(
                'truncate text-2xl font-bold tracking-[-0.02em] tabular-nums transition-transform duration-300 group-hover/tx:scale-105 motion-reduce:transition-none @3xl:origin-right',
                isRejected && 'text-fg-muted line-through decoration-danger/70 decoration-2',
                !isRejected && isOutgoing && 'text-danger',
                !isRejected && !isOutgoing && 'text-success',
              )}
            >
              <span className="sr-only">{translate('history.col.amount')} </span>
              {amount}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={tx.status} />
              <p className="flex items-center gap-1 text-[11px] text-fg-muted">
                <Icon name="calendar" size={11} />
                {formatDate(tx.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-dashed border-line bg-surface-2/30 px-4 py-3 sm:px-5 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <ul className="flex min-w-0 flex-wrap gap-x-6 gap-y-2">
            {meta.map((item) => (
              <li key={item.key} className="flex min-w-0 items-center gap-2">
                <Icon name={item.icon} size={12} className="shrink-0 text-fg-subtle" />
                <span className="text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap text-fg-subtle uppercase">{item.label}</span>
                <span className="truncate text-xs font-medium text-fg">{item.value}</span>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        </div>
      </article>
    </li>
  );
}

/** Entries grouped per calendar day (UTC, like formatDate), newest first as given; each day has a date rail on the left. */
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
      {days.map((day) => {
        const date = new Date(`${day.key}T00:00:00Z`);
        return (
          <section key={day.key} aria-labelledby={`history-day-${day.key}`} className="grid grid-cols-1 gap-3 md:grid-cols-[92px_minmax(0,1fr)] md:gap-5">
            <div className="md:relative">
              <h3 id={`history-day-${day.key}`} className="flex animate-rise items-center gap-3 motion-reduce:animate-none md:sticky md:top-24 md:flex-col md:items-start md:gap-1">
                <span className="sr-only">{dayFormatter.format(date)}</span>
                <span aria-hidden="true" className="text-3xl leading-none font-bold tracking-[-0.04em] text-fg tabular-nums md:text-5xl">
                  {dayNumberFormatter.format(date)}
                </span>
                <span aria-hidden="true" className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-fg uppercase">{monthYearFormatter.format(date)}</span>
                  <span className="text-[11px] tracking-[0.12em] text-fg-subtle uppercase">{weekdayFormatter.format(date)}</span>
                </span>
                <span className="ml-auto rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-fg-muted ring-1 ring-line tabular-nums md:mt-2 md:ml-0">
                  {String(day.entries.length).padStart(2, '0')}
                </span>
              </h3>
            </div>
            <ol className="relative flex min-w-0 flex-col gap-3 md:border-l md:border-dashed md:border-line md:pl-5">
              {day.entries.map(({ entry, order }) => (
                <LedgerEntry key={entry.tx.id} entry={entry} order={order} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
