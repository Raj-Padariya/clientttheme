'use client';

import type { ReactNode } from 'react';
import { translate } from '@/core/i18n';
import type { RequestStatus, Transaction } from '@/core/types';
import { boardCard } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

// Same locale and zone as core formatDate, so the day headers and times agree with every other date shown.
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dayNumberFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'UTC' });

const ENTRY_STAGGER_MS = 70;
const TRACK_STAGGER_MS = 80;
const STATUS_STEPS = 3;

const typeIcon: Record<Transaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

interface StatusStyle {
  dot: string;
  text: string;
  chip: string;
  /** How many of the three step capsules are lit: one while pending, two while processing, all three once settled. */
  steps: number;
}

const statusStyle: Record<RequestStatus, StatusStyle> = {
  pending: { dot: 'bg-warning', text: 'text-warning', chip: 'bg-warning-soft text-warning ring-warning/30', steps: 1 },
  processing: { dot: 'bg-info', text: 'text-info', chip: 'bg-info-soft text-info ring-info/30', steps: 2 },
  approved: { dot: 'bg-success', text: 'text-success', chip: 'bg-success-soft text-success ring-success/30', steps: 3 },
  rejected: { dot: 'bg-danger', text: 'text-danger', chip: 'bg-danger-soft text-danger ring-danger/30', steps: 3 },
};

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export interface StatusCount {
  status: RequestStatus;
  count: number;
}

/**
 * Status mix of the current results: the overall count as a big key on the left, and each status as a capsule track
 * filled to its share. Every key filters the list to that status (click again for all).
 */
export function StatusPulse({ counts, active, onSelect }: { counts: StatusCount[]; active: RequestStatus | 'all'; onSelect: (status: RequestStatus | 'all') => void }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const isAllActive = active === 'all';

  return (
    <div className={cx(boardCard, 'zenith-tile grid gap-4 p-4 sm:p-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6')}>
      <button
        type="button"
        aria-pressed={isAllActive}
        onClick={() => onSelect('all')}
        className={cx(
          'relative isolate flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-[22px] p-4 text-left transition-[background-color,box-shadow,translate] duration-300 motion-reduce:transition-none',
          focusRing,
          isAllActive ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.04] text-fg ring-1 ring-fg/[0.08] hover:-translate-y-0.5 hover:ring-fg/20',
        )}
      >
        <span className={cx('flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase', isAllActive ? 'opacity-75' : 'text-fg-muted')}>
          <Icon name="filter" size={13} />
          {translate('history.allStatus')}
        </span>
        <span className="text-5xl font-light tracking-[-0.04em] tabular-nums">{String(total).padStart(2, '0')}</span>
        {/* Pixel strip of the whole mix: one pixel per entry, coloured by its status. */}
        <span aria-hidden="true" className="flex flex-wrap gap-[3px]">
          {counts.flatMap((item) =>
            Array.from({ length: item.count }, (_, pixel) => (
              <span
                key={`${item.status}-${pixel}`}
                className={cx('zenith-pixel size-2 rounded-[2px]', isAllActive ? 'bg-[#160904]/70' : statusStyle[item.status].dot)}
                style={{ animationDelay: `${pixel * 30}ms` }}
              />
            )),
          )}
        </span>
      </button>

      <ul className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {counts.map((item, index) => {
          const isActive = active === item.status;
          const style = statusStyle[item.status];
          const share = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <li key={item.status} className="zenith-tile min-w-0" style={{ animationDelay: `${100 + index * TRACK_STAGGER_MS}ms` }}>
              <button
                type="button"
                aria-pressed={isActive}
                disabled={item.count === 0 && !isActive}
                onClick={() => onSelect(isActive ? 'all' : item.status)}
                className={cx(
                  'group/track flex w-full min-w-0 flex-col gap-2.5 rounded-[20px] px-4 py-3 text-left transition-[background-color,box-shadow,opacity] duration-300 disabled:opacity-40 motion-reduce:transition-none',
                  focusRing,
                  isActive ? 'bg-fg/[0.07] ring-1 ring-(--hero-buy)/70' : 'ring-1 ring-fg/[0.06] enabled:hover:bg-fg/[0.04]',
                )}
              >
                <span className="flex min-w-0 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-fg-muted">
                    <span aria-hidden="true" className="relative size-2 shrink-0">
                      {isActive && <span className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', style.dot)} />}
                      <span className={cx('relative block size-2 rounded-full', style.dot)} />
                    </span>
                    <span className="truncate">{translate(`status.${item.status}`)}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                    <span className="text-xl font-semibold text-fg">{String(item.count).padStart(2, '0')}</span>
                    <span className="text-[11px] text-fg-subtle">{Math.round(share)}%</span>
                  </span>
                </span>
                <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-fg/[0.07]">
                  <span
                    className={cx('zenith-capsule block h-full rounded-full [transform-origin:left]', isActive ? 'bg-(--hero-buy)' : style.dot)}
                    style={{ width: `${Math.max(share, item.count > 0 ? 4 : 0)}%`, animationDelay: `${200 + index * TRACK_STAGGER_MS}ms` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Account endpoints ("TA#…" trading, "WA#…"/"Wallet" wallet) get their account icon and mono type; payment methods a bank icon. */
function Endpoint({ label, caption, align = 'left' }: { label: string; caption: string; align?: 'left' | 'right' }) {
  const isWallet = label.startsWith('WA#') || label === 'Wallet';
  const isTrading = label.startsWith('TA#');
  const icon: IconName = isWallet ? 'wallet' : isTrading ? 'accounts' : 'bank';
  const isAccountCode = (isWallet || isTrading) && label !== 'Wallet';

  return (
    <div className={cx('flex min-w-0 items-center gap-2.5', align === 'right' && 'sm:flex-row-reverse sm:text-right')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fg/[0.05] text-fg-muted ring-1 ring-fg/10 transition-colors duration-300 group-hover/tx:text-fg">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{caption}</p>
        <p className={cx('truncate text-sm font-semibold text-fg', isAccountCode && 'font-mono text-xs')}>{label}</p>
      </div>
    </div>
  );
}

// Source → destination on one line: a dashed route with a bead running along it while the money is still moving.
function RouteLine({ tx }: { tx: Transaction }) {
  const isMoving = tx.status === 'pending' || tx.status === 'processing';
  const isRejected = tx.status === 'rejected';

  return (
    <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] sm:gap-3">
      <Endpoint label={tx.source} caption={translate('history.col.source')} />
      <span aria-hidden="true" className="relative ml-[18px] h-5 w-px sm:ml-0 sm:h-4 sm:w-full">
        <span className={cx('absolute border-dashed max-sm:inset-y-0 max-sm:left-0 max-sm:border-l sm:inset-x-0 sm:top-1/2 sm:border-t', isRejected ? 'border-danger/50' : 'border-fg/25')} />
        {isMoving && <span className="zenith-route absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hero-buy) max-sm:hidden" />}
        <span
          className={cx(
            'absolute top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-surface ring-1 max-sm:hidden sm:right-0 sm:translate-x-1/2',
            isRejected ? 'text-danger ring-danger/40' : 'text-(--hero-buy) ring-fg/15',
          )}
        >
          <Icon name={isRejected ? 'close' : 'chevronRight'} size={11} />
        </span>
      </span>
      <Endpoint label={tx.destination} caption={translate('history.col.destination')} align="right" />
    </div>
  );
}

// Status as a chip with three step capsules underneath: lit up to where the request has got to.
function StatusSteps({ status }: { status: RequestStatus }) {
  const style = statusStyle[status];
  const isMoving = status === 'pending' || status === 'processing';

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', style.chip)}>
        <span aria-hidden="true" className="relative size-1.5">
          {isMoving && <span className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', style.dot)} />}
          <span className={cx('relative block size-1.5 rounded-full', style.dot)} />
        </span>
        {translate(`status.${status}`)}
      </span>
      <span aria-hidden="true" className="flex w-24 gap-1">
        {Array.from({ length: STATUS_STEPS }, (_, step) => (
          <span key={step} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', step < style.steps ? style.dot : 'bg-fg/[0.08]')} />
        ))}
      </span>
    </div>
  );
}

/** Action key in an entry's footer (payment details, proof); rendered as a dashed placeholder when there is nothing to open. */
export function EntryAction({ icon, label, ariaLabel, onClick }: { icon: IconName; label: string; ariaLabel: string; onClick?: () => void }) {
  const keyClass = 'inline-flex min-w-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold';

  if (!onClick) {
    return (
      <span className={cx(keyClass, 'border border-dashed border-fg/15 text-fg-subtle')}>
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
        'group/action bg-fg/[0.05] text-fg ring-1 ring-fg/10 transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 hover:bg-(--hero-buy) hover:text-[#160904] hover:ring-transparent motion-reduce:transition-none',
        focusRing,
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
  value: string;
}

export interface TimelineEntryData {
  tx: Transaction;
  serial: number;
  typeBadge: ReactNode;
  amount: string;
  meta: TimelineMeta[];
  actions: ReactNode;
}

// One entry as a ledger row: type tile + reference, the route on one line, status steps, then the amount at the far end;
// method / ID / updated and the actions sit on a dashed footer under it.
function LedgerRow({ entry, index }: { entry: TimelineEntryData; index: number }) {
  const { tx } = entry;
  const isOut = tx.type === 'withdrawal';

  return (
    <li className="zenith-tile" style={{ animationDelay: `${120 + index * ENTRY_STAGGER_MS}ms` }}>
      <article className="group/tx relative rounded-[22px] bg-fg/[0.025] p-4 ring-1 ring-fg/[0.07] transition-[background-color,box-shadow] duration-300 hover:bg-fg/[0.045] hover:ring-fg/15 motion-reduce:transition-none sm:p-5">
        <span aria-hidden="true" className="absolute inset-y-5 left-0 w-[3px] origin-center scale-y-0 rounded-full bg-(--hero-buy) transition-transform duration-300 group-hover/tx:scale-y-100 motion-reduce:transition-none" />

        <div className="grid min-w-0 items-center gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_auto_minmax(0,0.7fr)] xl:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cx(
                'grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-500 group-hover/tx:-rotate-6 motion-reduce:transition-none',
                isOut ? 'bg-fg/[0.07] text-fg ring-1 ring-fg/10' : 'bg-(--hero-buy) text-[#160904]',
              )}
            >
              <Icon name={typeIcon[tx.type]} size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {entry.typeBadge}
                <span className="font-mono text-[10px] tracking-[0.15em] text-fg-subtle">#{String(entry.serial).padStart(2, '0')}</span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-fg-muted">{tx.reference}</p>
            </div>
          </div>

          <RouteLine tx={tx} />

          <StatusSteps status={tx.status} />

          <div className="min-w-0 xl:text-right">
            <p className={cx('truncate text-2xl font-light tracking-[-0.03em] tabular-nums', isOut ? 'text-fg' : 'text-(--hero-buy)')}>{entry.amount}</p>
            <p className="mt-0.5 text-[11px] text-fg-subtle tabular-nums">{timeFormatter.format(new Date(tx.createdAt))}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-fg/10 pt-3 lg:flex-row lg:items-center lg:justify-between">
          <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2">
            {entry.meta.map((item) => (
              <div key={item.key} className="flex min-w-0 items-center gap-1.5 text-xs">
                <Icon name={item.icon} size={12} className="shrink-0 text-fg-subtle" />
                <dt className="shrink-0 text-fg-subtle">{item.label}</dt>
                <dd className="truncate font-semibold text-fg">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex shrink-0 flex-wrap gap-2">{entry.actions}</div>
        </div>
      </article>
    </li>
  );
}

/** Entries grouped by the day they were created, each day as a board with a big day number and its count. */
export function HistoryTimeline({ label, entries }: { label: string; entries: TimelineEntryData[] }) {
  const days: { key: string; date: Date; entries: TimelineEntryData[] }[] = [];
  for (const entry of entries) {
    const key = entry.tx.createdAt.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, date: new Date(entry.tx.createdAt), entries: [entry] });
  }

  let rowIndex = 0;
  return (
    <div aria-label={label} role="region" className="flex flex-col gap-5">
      {days.map((day, dayIndex) => (
        <section key={day.key} aria-label={dayFormatter.format(day.date)} className={cx(boardCard, 'zenith-tile p-4 sm:p-5')} style={{ animationDelay: `${dayIndex * 90}ms` }}>
          <header className="mb-4 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-fg text-lg font-semibold text-surface tabular-nums">{dayNumberFormatter.format(day.date)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{dayFormatter.format(day.date)}</p>
              <p className="text-[11px] text-fg-subtle tabular-nums">{String(day.entries.length).padStart(2, '0')}</p>
            </div>
            <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-fg/12" />
          </header>
          <ol className="flex flex-col gap-2.5">
            {day.entries.map((entry) => (
              <LedgerRow key={entry.tx.id} entry={entry} index={rowIndex++} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
