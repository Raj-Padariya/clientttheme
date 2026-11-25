'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbTransferRecord, IbTransferStatus } from '@/core/mock/ibTransferHistory';
import { useIbTransferHistory } from '@/core/pages/useIbTransferHistory';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const graphite = 'bg-[#18181b]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const NEW_TRANSFER_HREF = '/ib/transfer-commission';

type Filter = 'all' | IbTransferStatus;

const statusOrder: IbTransferStatus[] = ['pending', 'completed', 'rejected'];

const statusMeta: Record<IbTransferStatus, { labelKey: MessageKey; hintKey: MessageKey; icon: IconName; tile: string; bar: string; pill: string; edge: string }> = {
  pending: {
    labelKey: 'ibTransferHist.pending',
    hintKey: 'ibTransferHist.pendingHint',
    icon: 'clock',
    tile: 'bg-amber-500/12 text-amber-500 ring-amber-500/30',
    bar: 'bg-amber-500',
    pill: 'bg-amber-500/12 text-amber-600 ring-amber-500/30',
    edge: 'before:bg-amber-500',
  },
  completed: {
    labelKey: 'ibTransferHist.completed',
    hintKey: 'ibTransferHist.completedHint',
    icon: 'check',
    tile: 'bg-emerald-500/12 text-emerald-500 ring-emerald-500/30',
    bar: 'bg-emerald-500',
    pill: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/30',
    edge: 'before:bg-emerald-500',
  },
  rejected: {
    labelKey: 'ibTransferHist.rejected',
    hintKey: 'ibTransferHist.rejectedHint',
    icon: 'xCircle',
    tile: 'bg-red-500/12 text-red-500 ring-red-500/30',
    bar: 'bg-red-500',
    pill: 'bg-red-500/12 text-red-600 ring-red-500/30',
    edge: 'before:bg-red-500',
  },
};

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function filterLabel(filter: Filter): string {
  return translate(filter === 'all' ? 'ibTransferHist.all' : statusMeta[filter].labelKey);
}

/* ───────────── Status console: total on graphite, a stacked share bar, then the three statuses as filter rows ───────────── */

function StatusRow({ status, count, index, isActive, onSelect }: { status: IbTransferStatus; count: number; index: number; isActive: boolean; onSelect: () => void }) {
  const meta = statusMeta[status];
  const shown = Math.round(useAnimatedNumber(count, 900));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      style={riseDelay(index + 1)}
      className={cx(
        'group flex w-full animate-rise items-center gap-3 rounded-2xl px-3 py-3 text-left transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none',
        isActive ? 'bg-surface-2 ring-1 ring-primary/50' : 'hover:bg-surface-2/60',
      )}
    >
      <span className={cx('relative grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none', meta.tile)}>
        {status === 'pending' && count > 0 && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl border border-amber-500 motion-reduce:hidden" />}
        <Icon name={meta.icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{translate(meta.labelKey)}</span>
        <span className="block truncate text-[11px] text-fg-subtle">{translate(meta.hintKey)}</span>
      </span>
      <span className="font-mono text-xl font-semibold text-fg tabular-nums">{shown}</span>
    </button>
  );
}

function StatusConsole({ counts, filter, onFilter }: { counts: Record<Filter, number>; filter: Filter; onFilter: (filter: Filter) => void }) {
  const total = Math.round(useAnimatedNumber(counts.all, 900));
  const isAllActive = filter === 'all';

  return (
    <aside role="group" aria-label={translate('ibTransferHist.filter')} className={cx(cardClass, 'flex animate-rise flex-col overflow-hidden motion-reduce:animate-none lg:sticky lg:top-24')}>
      <button
        type="button"
        onClick={() => onFilter('all')}
        aria-pressed={isAllActive}
        className={cx(
          'relative isolate flex flex-col gap-4 overflow-hidden p-5 text-left text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring',
          graphite,
          isAllActive && 'shadow-[inset_0_-3px_0_var(--brand-gleam)]',
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_28%,transparent),transparent_68%)] motion-reduce:animate-none"
        />
        <span className="flex items-center justify-between gap-3">
          <span className={cx(eyebrow, 'text-white/55')}>{translate('ibTransferHist.total')}</span>
          <span className={cx('grid size-9 place-items-center rounded-xl text-[#18181b]', goldFill)}>
            <Icon name="fileText" size={16} />
          </span>
        </span>
        <span className={cx('font-mono text-5xl leading-none font-semibold tabular-nums', goldText)}>{total}</span>
        <span className="w-fit rounded-md bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">{translate('ibTransferHist.totalHint')}</span>
      </button>

      {/* Share of each status in one stacked bar. */}
      <div aria-hidden="true" className="flex h-1.5 gap-0.5 bg-surface-2">
        {statusOrder.map((status) =>
          counts[status] > 0 ? (
            <span key={status} className={cx('h-full origin-left animate-grow motion-reduce:animate-none', statusMeta[status].bar)} style={{ flexGrow: counts[status] }} />
          ) : null,
        )}
      </div>

      <div className="flex flex-col gap-1 p-2">
        {statusOrder.map((status, index) => (
          <StatusRow key={status} status={status} count={counts[status]} index={index} isActive={filter === status} onSelect={() => onFilter(status)} />
        ))}
      </div>

      <div className="mt-auto border-t border-line p-4">
        <Link
          href={NEW_TRANSFER_HREF}
          className={cx(
            'group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold text-[#18181b] transition-[box-shadow] duration-300 hover:shadow-[0_14px_28px_-14px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            goldFill,
          )}
        >
          <Icon name="plus" size={14} className="transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
          {translate('ibTransferHist.newTransfer')}
        </Link>
      </div>
    </aside>
  );
}

/* ───────────── Records as statement slips with a status edge ───────────── */

function TransferSlip({ record, currency, index }: { record: IbTransferRecord; currency: string; index: number }) {
  const meta = statusMeta[record.status];
  return (
    <li
      style={riseDelay(index)}
      className={cx(
        'group relative grid animate-rise grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 overflow-hidden rounded-2xl border border-line bg-surface py-3.5 pr-4 pl-5 transition-[border-color,transform,box-shadow] duration-300 before:absolute before:inset-y-0 before:left-0 before:w-1 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card motion-reduce:animate-none motion-reduce:transition-none sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]',
        meta.edge,
      )}
    >
      <span className={cx('grid size-10 place-items-center rounded-xl font-mono text-xs font-bold text-(--brand-gleam)', graphite)}>{initials(record.clientName)}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-fg">{record.clientName}</span>
        <span className="block truncate font-mono text-xs text-fg-subtle">{record.accountNumber}</span>
      </span>
      <span className="hidden min-w-0 items-center gap-1.5 truncate text-xs text-fg-muted sm:flex">
        <Icon name="fileText" size={12} className="shrink-0 text-fg-subtle" />
        <span className="truncate">{record.note}</span>
      </span>
      <span className="text-right">
        <span className="block font-mono text-base font-semibold text-fg tabular-nums">{formatMoney(record.amount, currency)}</span>
        <span className="block text-[11px] text-fg-subtle">{formatDate(record.requestedAt)}</span>
      </span>
      <span className={cx('col-start-3 inline-flex items-center gap-1 justify-self-end rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 sm:col-start-auto', meta.pill)}>
        <Icon name={meta.icon} size={11} />
        {translate(meta.labelKey)}
      </span>
    </li>
  );
}

function EmptyLedger() {
  return (
    <div className="relative isolate flex flex-col items-center px-6 py-14 text-center">
      {/* Ghost slips waiting to be filled. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-6 -z-10 space-y-3 opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent_80%)]">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
            <span className="size-8 rounded-xl bg-surface-2" />
            <span className="h-2.5 w-1/4 rounded-full bg-surface-2" />
            <span className="ml-auto h-2.5 w-16 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>

      <span className="relative grid size-28 place-items-center">
        <span aria-hidden="true" className="absolute inset-2 animate-orbit rounded-3xl border-2 border-dashed border-primary/40 [animation-duration:18s] motion-reduce:animate-none" />
        <span className={cx('relative grid size-16 animate-float place-items-center rounded-2xl text-(--brand-gleam) ring-1 ring-primary/50 motion-reduce:animate-none', graphite)}>
          <Icon name="transfer" size={26} />
        </span>
      </span>

      <h2 className="mt-6 text-lg font-semibold tracking-tight text-fg">{translate('ibTransferHist.emptyTitle')}</h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('ibTransferHist.emptyBody')}</p>
      <Link
        href={NEW_TRANSFER_HREF}
        className={cx(
          'group relative mt-6 inline-flex h-11 items-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-semibold text-[#18181b] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          goldFill,
        )}
      >
        <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
        <span className="relative">{translate('ibTransferHist.emptyCta')}</span>
        <Icon name="arrowRight" size={15} className="relative transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
      </Link>
    </div>
  );
}

/* ───────────── Page ───────────── */

export default function IbTransferHistoryPage() {
  const { data } = useIbTransferHistory();
  const [filter, setFilter] = useState<Filter>('all');

  if (!data) {
    return (
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="h-[26rem] rounded-3xl" />
        <Skeleton className="h-[26rem] rounded-3xl" />
      </div>
    );
  }

  const { records, currency } = data;
  const counts: Record<Filter, number> = {
    all: records.length,
    pending: records.filter((record) => record.status === 'pending').length,
    completed: records.filter((record) => record.status === 'completed').length,
    rejected: records.filter((record) => record.status === 'rejected').length,
  };
  const visible = records
    .filter((record) => filter === 'all' || record.status === filter)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <StatusConsole counts={counts} filter={filter} onFilter={setFilter} />

      <section style={riseDelay(2)} className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none')}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/40 px-5 py-4">
          <p aria-live="polite" className="inline-flex items-center gap-2.5 text-sm font-semibold text-fg">
            <span className={cx('grid size-7 place-items-center rounded-lg text-(--brand-gleam)', graphite)}>
              <Icon name="history" size={13} />
            </span>
            {filterLabel(filter)}
            <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] text-fg-muted ring-1 ring-line tabular-nums">{visible.length}</span>
          </p>
          {filter !== 'all' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="close" size={12} />
              {translate('ibTransferHist.all')}
            </button>
          )}
        </header>

        {records.length === 0 ? (
          <EmptyLedger />
        ) : visible.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-fg-muted">{translate('ibTransferHist.emptyFiltered', { status: filterLabel(filter).toLowerCase() })}</p>
        ) : (
          <ol className="flex flex-col gap-2.5 p-4">
            {visible.map((record, index) => (
              <TransferSlip key={record.id} record={record} currency={currency} index={index} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
