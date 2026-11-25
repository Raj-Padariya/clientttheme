'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import type { RequestStatus, Transaction } from '@/core/types';
import { boardCard } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import './receipt.css';

// Same locale and zone as core formatDate, so the receipt headers and times agree with every other date shown.
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dayNumberFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' });
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'UTC' });

const DAY_STAGGER_MS = 240;
const LINE_OFFSET_MS = 320;
const LINE_STAGGER_MS = 120;
const STAMP_OFFSET_MS = 380;
const TALLY_STAGGER_MS = 80;
const TEAR_MS = 460;
const STATUS_STEPS = 3;
const BARCODE_BARS = 34;

const typeIcon: Record<Transaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

interface StatusStyle {
  dot: string;
  text: string;
  /** How many of the three step marks are inked: one while pending, two while processing, all three once settled. */
  steps: number;
}

const statusStyle: Record<RequestStatus, StatusStyle> = {
  pending: { dot: 'bg-warning', text: 'text-warning', steps: 1 },
  processing: { dot: 'bg-info', text: 'text-info', steps: 2 },
  approved: { dot: 'bg-success', text: 'text-success', steps: 3 },
  rejected: { dot: 'bg-danger', text: 'text-danger', steps: 3 },
};

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export interface StatusCount {
  status: RequestStatus;
  count: number;
}

/**
 * Status mix as a till tally: the total with one barcode bar per entry, then each status as a dotted-leader line with
 * its count, share and a thin track. Every line filters the tape to that status (click again for all).
 */
export function StatusTally({ counts, active, onSelect }: { counts: StatusCount[]; active: RequestStatus | 'all'; onSelect: (status: RequestStatus | 'all') => void }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const isAllActive = active === 'all';

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-pressed={isAllActive}
        onClick={() => onSelect('all')}
        className={cx(
          'flex min-w-0 flex-col gap-3 rounded-[18px] px-4 py-3 text-left transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none',
          focusRing,
          isAllActive ? 'bg-(--aurora-cta-from) text-(--aurora-cta-fg)' : 'bg-fg/[0.04] text-fg ring-1 ring-fg/[0.08] hover:ring-fg/20',
        )}
      >
        <span className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase">
          <Icon name="filter" size={12} className="shrink-0 self-center" />
          <span className={cx('truncate', !isAllActive && 'text-fg-muted')}>{translate('history.allStatus')}</span>
          <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-current opacity-35" />
          <span className="text-3xl font-light tracking-[-0.04em] tabular-nums">{pad(total)}</span>
        </span>
        <span aria-hidden="true" className="flex flex-wrap gap-[3px]">
          {counts.flatMap((item) =>
            Array.from({ length: item.count }, (_, bar) => (
              <span
                key={`${item.status}-${bar}`}
                className={cx('zenith-pixel h-6 w-[3px] rounded-[1px]', isAllActive ? 'bg-(--aurora-cta-fg)/70' : statusStyle[item.status].dot)}
                style={{ animationDelay: `${bar * 30}ms` }}
              />
            )),
          )}
        </span>
      </button>

      <ul className="flex flex-col">
        {counts.map((item, index) => {
          const isActive = active === item.status;
          const style = statusStyle[item.status];
          const share = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <li key={item.status} className="zenith-tile min-w-0" style={{ animationDelay: `${100 + index * TALLY_STAGGER_MS}ms` }}>
              <button
                type="button"
                aria-pressed={isActive}
                disabled={item.count === 0 && !isActive}
                onClick={() => onSelect(isActive ? 'all' : item.status)}
                className={cx(
                  'flex w-full min-w-0 flex-col gap-2 rounded-[14px] px-4 py-2.5 text-left font-mono transition-[background-color,box-shadow,opacity] duration-300 disabled:opacity-40 motion-reduce:transition-none',
                  focusRing,
                  isActive ? 'bg-fg/[0.07] ring-1 ring-(--hero-buy)/70' : 'enabled:hover:bg-fg/[0.04]',
                )}
              >
                <span className="flex min-w-0 items-baseline gap-2 text-xs">
                  <span aria-hidden="true" className="relative size-2 shrink-0 self-center">
                    {isActive && <span className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', style.dot)} />}
                    <span className={cx('relative block size-2 rounded-full', style.dot)} />
                  </span>
                  <span className="truncate font-semibold tracking-[0.08em] text-fg-muted uppercase">{translate(`status.${item.status}`)}</span>
                  <span aria-hidden="true" className="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-fg/25" />
                  <span className="text-sm font-semibold text-fg tabular-nums">{pad(item.count)}</span>
                  <span className="w-9 shrink-0 text-right text-[11px] text-fg-subtle tabular-nums">{Math.round(share)}%</span>
                </span>
                <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-fg/[0.07]">
                  <span
                    className={cx('zenith-capsule block h-full rounded-full [transform-origin:left]', isActive ? 'bg-(--hero-buy)' : style.dot)}
                    style={{ width: `${Math.max(share, item.count > 0 ? 4 : 0)}%`, animationDelay: `${200 + index * TALLY_STAGGER_MS}ms` }}
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

/** The printer the tape comes out of: a ready LED, the slot with its sweeping print head, and a readout on the right. */
export function ReceiptPrinter({ children }: { children: ReactNode }) {
  return (
    <div className={cx(boardCard, 'relative z-10 flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-5')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-fg/[0.06] text-fg ring-1 ring-fg/10">
            <Icon name="fileText" size={16} />
          </span>
          <span aria-hidden="true" className="receipt-led size-2 rounded-full bg-(--hero-buy)" />
        </span>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-fg-muted tabular-nums">{children}</div>
      </div>
      <div aria-hidden="true" className="relative h-3 overflow-hidden rounded-full bg-app shadow-[inset_0_2px_4px_rgb(0_0_0/0.45)] ring-1 ring-fg/10">
        <span className="receipt-scan absolute inset-y-0.5 w-16 rounded-full bg-(--hero-buy)/80 blur-[1px]" />
      </div>
    </div>
  );
}

/** A blank receipt for the loading and empty states, so the tape keeps its shape. */
export function ReceiptBlank({ children }: { children: ReactNode }) {
  return (
    <div className="receipt-sheet">
      <div className="receipt-paper receipt-feed bg-surface px-4 pt-5 sm:px-6">{children}</div>
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
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg/[0.05] text-fg-muted ring-1 ring-fg/10 transition-colors duration-300 group-hover/tx:text-fg">
        <Icon name={icon} size={14} />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{caption}</p>
        <p className={cx('truncate text-sm font-semibold text-fg', isAccountCode && 'font-mono text-xs')}>{label}</p>
      </div>
    </div>
  );
}

// Source → destination on one line: a dotted route with a bead running along it while the money is still moving.
function RouteLine({ tx }: { tx: Transaction }) {
  const isMoving = tx.status === 'pending' || tx.status === 'processing';
  const isRejected = tx.status === 'rejected';

  return (
    <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] sm:gap-3">
      <Endpoint label={tx.source} caption={translate('history.col.source')} />
      <span aria-hidden="true" className="relative ml-4 h-4 w-px sm:ml-0 sm:h-4 sm:w-full">
        <span className={cx('absolute border-dotted max-sm:inset-y-0 max-sm:left-0 max-sm:border-l-2 sm:inset-x-0 sm:top-1/2 sm:border-t-2', isRejected ? 'border-danger/50' : 'border-fg/25')} />
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

// Status as an ink stamp, with three step marks beside it inked up to where the request has got to.
function StatusStamp({ status, delay }: { status: RequestStatus; delay: number }) {
  const style = statusStyle[status];
  const isMoving = status === 'pending' || status === 'processing';

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cx('receipt-stamp inline-flex items-center gap-1.5 rounded-md border-2 border-current px-2.5 py-1 font-mono text-[11px] font-black tracking-[0.2em] uppercase', style.text)}
        style={{ animationDelay: `${delay}ms` }}
      >
        <span aria-hidden="true" className="relative size-1.5">
          {isMoving && <span className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', style.dot)} />}
          <span className={cx('relative block size-1.5 rounded-full', style.dot)} />
        </span>
        {translate(`status.${status}`)}
      </span>
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: STATUS_STEPS }, (_, step) => (
          <span key={step} className={cx('size-2 rounded-[2px] transition-colors duration-500', step < style.steps ? style.dot : 'bg-fg/[0.1]')} />
        ))}
      </span>
    </div>
  );
}

/** Action key on a receipt line (payment details, proof); rendered as a dashed placeholder when there is nothing to open. */
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
        'group/action bg-fg/[0.05] text-fg ring-1 ring-fg/10 transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 hover:bg-(--aurora-cta-from) hover:text-(--aurora-cta-fg) hover:ring-transparent motion-reduce:transition-none',
        focusRing,
      )}
    >
      <Icon name={icon} size={13} className="shrink-0 transition-transform duration-300 group-hover/action:scale-110 motion-reduce:transition-none" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export interface ReceiptMeta {
  key: string;
  icon: IconName;
  label: string;
  value: string;
}

export interface ReceiptEntryData {
  tx: Transaction;
  serial: number;
  typeBadge: ReactNode;
  amount: string;
  meta: ReceiptMeta[];
  onDetails: () => void;
  /** Absent when the entry has no proof file. */
  onProof?: () => void;
}

// One entry as a printed receipt line: type tile, badge, serial and time over the reference with the amount at the far
// end; the route; method / ID / updated as dotted-leader fields; then the status stamp and the actions.
function ReceiptLine({ entry, delay, isTearing, onTear }: { entry: ReceiptEntryData; delay: number; isTearing: boolean; onTear: (open: () => void) => void }) {
  const { tx, onDetails, onProof } = entry;
  const isOut = tx.type === 'withdrawal';

  return (
    <li
      className={cx('receipt-line relative border-b border-dashed border-fg/15 py-4 last:border-b-0', isTearing && 'receipt-tear z-10')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <article className="group/tx flex min-w-0 flex-col gap-3.5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cx(
                'grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-500 group-hover/tx:-rotate-6 motion-reduce:transition-none',
                isOut ? 'bg-fg/[0.07] text-fg ring-1 ring-fg/10' : 'bg-(--aurora-cta-from) text-(--aurora-cta-fg)',
              )}
            >
              <Icon name={typeIcon[tx.type]} size={17} />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {entry.typeBadge}
                <span className="font-mono text-[10px] tracking-[0.15em] text-fg-subtle">#{pad(entry.serial)}</span>
                <span className="font-mono text-[10px] text-fg-subtle tabular-nums">{timeFormatter.format(new Date(tx.createdAt))}</span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-fg-muted">{tx.reference}</p>
            </div>
          </div>
          <p className={cx('font-mono text-xl font-semibold tracking-[-0.02em] tabular-nums sm:text-2xl', isOut ? 'text-fg' : 'text-(--hero-buy)')}>{entry.amount}</p>
        </div>

        <RouteLine tx={tx} />

        <dl className="grid min-w-0 gap-x-6 gap-y-1.5 font-mono text-[11px] sm:grid-cols-3">
          {entry.meta.map((item) => (
            <div key={item.key} className="flex min-w-0 items-baseline gap-2">
              <dt className="flex min-w-0 flex-1 items-baseline gap-1.5 tracking-[0.08em] text-fg-subtle uppercase after:min-w-3 after:flex-1 after:-translate-y-[3px] after:border-b after:border-dotted after:border-fg/20 after:content-['']">
                <Icon name={item.icon} size={11} className="shrink-0 self-center" />
                <span className="shrink-0">{item.label}</span>
              </dt>
              <dd className="max-w-[60%] truncate font-semibold text-fg">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <StatusStamp status={tx.status} delay={delay + STAMP_OFFSET_MS} />
          <div className="flex shrink-0 flex-wrap gap-2">
            <EntryAction
              icon="eye"
              label={translate('history.col.details')}
              ariaLabel={translate('history.viewDetails', { reference: tx.reference })}
              onClick={() => onTear(onDetails)}
            />
            <EntryAction
              icon="fileText"
              label={translate('history.col.proof')}
              ariaLabel={translate('history.viewProof', { reference: tx.reference })}
              onClick={onProof ? () => onTear(onProof) : undefined}
            />
          </div>
        </div>
      </article>
    </li>
  );
}

// Decorative barcode under each receipt; bar widths come from the day's references so it stays the same per render.
function barcodeWidths(seed: string): number[] {
  return Array.from({ length: BARCODE_BARS }, (_, bar) => ((seed.charCodeAt(bar % seed.length) + bar * 7) % 3) + 1);
}

/**
 * Entries grouped by the day they were created, each day printed as its own receipt: big day number, the lines, then
 * a barcode above the torn edge. Opening an entry tears its line off before the modal comes up.
 */
export function ReceiptTape({ label, entries }: { label: string; entries: ReceiptEntryData[] }) {
  const [tearingId, setTearingId] = useState<string | null>(null);
  const tearTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (tearTimer.current !== null) window.clearTimeout(tearTimer.current);
    },
    [],
  );

  function tearOff(id: string, open: () => void) {
    if (tearTimer.current !== null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      open();
      return;
    }
    setTearingId(id);
    tearTimer.current = window.setTimeout(() => {
      tearTimer.current = null;
      setTearingId(null);
      open();
    }, TEAR_MS);
  }

  const days: { key: string; date: Date; entries: ReceiptEntryData[] }[] = [];
  for (const entry of entries) {
    const key = entry.tx.createdAt.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, date: new Date(entry.tx.createdAt), entries: [entry] });
  }

  return (
    <div aria-label={label} role="region" className="flex flex-col gap-6">
      {days.map((day, dayIndex) => {
        const dayDelay = dayIndex * DAY_STAGGER_MS;
        const bars = barcodeWidths(day.entries.map((entry) => entry.tx.reference).join(''));
        return (
          // Keyed by the first entry too, so a new page reprints a day even when it shares the date.
          <section key={`${day.key}-${day.entries[0].tx.id}`} aria-label={dayFormatter.format(day.date)} className="receipt-sheet">
            <div className="receipt-paper receipt-feed bg-surface px-4 pt-5 sm:px-6" style={{ animationDelay: `${dayDelay}ms` }}>
              <header className="flex items-end justify-between gap-4 border-b-2 border-dashed border-fg/15 pb-4">
                <div className="flex min-w-0 items-end gap-3">
                  <span className="text-5xl leading-none font-semibold tracking-[-0.05em] text-fg tabular-nums">{dayNumberFormatter.format(day.date)}</span>
                  <div className="min-w-0 pb-0.5 font-mono">
                    <p className="truncate text-[10px] tracking-[0.3em] text-fg-subtle uppercase">{weekdayFormatter.format(day.date)}</p>
                    <p className="truncate text-xs font-semibold text-fg">{monthFormatter.format(day.date)}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-fg/[0.06] px-2.5 py-1 font-mono text-[11px] font-semibold text-fg-muted tabular-nums">× {pad(day.entries.length)}</span>
              </header>

              <ol className="flex flex-col">
                {day.entries.map((entry, lineIndex) => (
                  <ReceiptLine
                    key={entry.tx.id}
                    entry={entry}
                    delay={dayDelay + LINE_OFFSET_MS + lineIndex * LINE_STAGGER_MS}
                    isTearing={tearingId === entry.tx.id}
                    onTear={(open) => tearOff(entry.tx.id, open)}
                  />
                ))}
              </ol>

              <footer aria-hidden="true" className="mt-1 flex flex-col items-center gap-2 border-t-2 border-dashed border-fg/15 pt-4">
                <span className="flex h-9 items-stretch gap-[2px]">
                  {bars.map((width, bar) => (
                    <span key={bar} className="rounded-[1px] bg-fg/70" style={{ width }} />
                  ))}
                </span>
                <span className="font-mono text-[10px] tracking-[0.4em] text-fg-subtle">{day.key.split('-').join('')}</span>
              </footer>
            </div>
          </section>
        );
      })}
    </div>
  );
}
