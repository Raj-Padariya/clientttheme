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

const cardClass = 'orbit-card';
// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const NEW_TRANSFER_HREF = '/ib/transfer-commission';

type Filter = 'all' | IbTransferStatus;

const statusMeta: Record<IbTransferStatus, { labelKey: MessageKey; hintKey: MessageKey; icon: IconName; tile: string; count: string; pill: string }> = {
  pending: {
    labelKey: 'ibTransferHist.pending',
    hintKey: 'ibTransferHist.pendingHint',
    icon: 'clock',
    tile: 'bg-warning/12 text-warning ring-warning/30',
    count: 'text-fg',
    pill: 'bg-warning/12 text-warning ring-warning/30',
  },
  completed: {
    labelKey: 'ibTransferHist.completed',
    hintKey: 'ibTransferHist.completedHint',
    icon: 'check',
    tile: 'bg-success/12 text-success ring-success/30',
    count: 'text-success',
    pill: 'bg-success/12 text-success ring-success/30',
  },
  rejected: {
    labelKey: 'ibTransferHist.rejected',
    hintKey: 'ibTransferHist.rejectedHint',
    icon: 'xCircle',
    tile: 'bg-danger/12 text-danger ring-danger/30',
    count: 'text-danger',
    pill: 'bg-danger/12 text-danger ring-danger/30',
  },
};

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 90}ms` };
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

/* ───────────── Status orbit: ring breakdown + vertical filter list ───────────── */

const STATUSES: IbTransferStatus[] = ['completed', 'pending', 'rejected'];
const ringStroke: Record<IbTransferStatus, string> = {
  completed: 'stroke-success',
  pending: 'stroke-warning',
  rejected: 'stroke-danger',
};
const shareBar: Record<Filter, string> = {
  all: 'bg-linear-to-r from-primary/40 to-primary/80',
  completed: 'bg-success/70',
  pending: 'bg-warning/70',
  rejected: 'bg-danger/70',
};

function StatusRing({ counts }: { counts: Record<Filter, number> }) {
  const total = Math.round(useAnimatedNumber(counts.all, 900));
  let offset = 0;
  const segments = STATUSES.filter((status) => counts[status] > 0).map((status) => {
    const share = (counts[status] / counts.all) * 100;
    // A hairline gap between arcs keeps neighbouring statuses readable.
    const segment = { status, length: Math.max(share - (share < 100 ? 1.2 : 0), 0.5), offset };
    offset += share;
    return segment;
  });

  return (
    <div className="relative mx-auto size-52">
      <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full -rotate-90">
        <circle cx={60} cy={60} r={48} fill="none" strokeWidth={10} className="stroke-white/[0.07]" />
        {counts.all === 0 && <circle cx={60} cy={60} r={48} fill="none" strokeWidth={1} strokeDasharray="2 4" className="stroke-white/25" />}
        {segments.map((segment) => (
          <circle
            key={segment.status}
            cx={60}
            cy={60}
            r={48}
            fill="none"
            strokeWidth={10}
            pathLength={100}
            strokeDasharray={`${segment.length} 100`}
            strokeDashoffset={-segment.offset}
            className={cx('transition-[stroke-dasharray] duration-700 motion-reduce:transition-none', ringStroke[segment.status])}
          />
        ))}
      </svg>
      {/* One light circling the ring, like a request in transit. */}
      <span aria-hidden="true" className="absolute inset-[14px] animate-orbit [animation-duration:6s] motion-reduce:hidden">
        <span className={cx('absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />
      </span>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cx('relative grid size-10 place-items-center rounded-xl text-(--brand-on-primary)', goldFill)}>
          <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl border border-primary motion-reduce:hidden" />
          <Icon name="fileText" size={17} />
        </span>
        <span className={cx('mt-2 block font-mono text-4xl leading-none font-semibold tabular-nums', goldText)}>{total}</span>
        <span className={cx(eyebrow, 'mt-1.5 block max-w-[8rem] text-white/50')}>{translate('ibTransferHist.total')}</span>
      </div>
    </div>
  );
}

function FilterRow({ filter, count, total, index, isActive, onSelect }: { filter: Filter; count: number; total: number; index: number; isActive: boolean; onSelect: () => void }) {
  const shown = Math.round(useAnimatedNumber(count, 900));
  const isAll = filter === 'all';
  const meta = isAll ? null : statusMeta[filter];
  const share = total > 0 ? (count / total) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      style={riseDelay(index)}
      className={cx(
        'group relative flex w-full animate-rise flex-col gap-2.5 rounded-2xl p-3.5 text-left ring-1 transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
        isActive ? 'bg-primary/[0.12] shadow-[0_18px_36px_-26px_var(--brand-primary)] ring-primary/60' : 'bg-white/[0.03] ring-white/10 hover:bg-white/[0.06] hover:ring-primary/40',
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className={cx(
            'relative grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none',
            meta ? meta.tile : 'bg-primary/15 text-(--brand-gleam) ring-primary/40',
          )}
        >
          {filter === 'pending' && count > 0 && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl border border-warning motion-reduce:hidden" />}
          <Icon name={meta ? meta.icon : 'fileText'} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{filterLabel(filter)}</span>
          <span className="block truncate text-[11px] text-white/50">{translate(meta ? meta.hintKey : 'ibTransferHist.totalHint')}</span>
        </span>
        <span className={cx('font-mono text-2xl font-semibold tabular-nums', meta ? meta.count : goldText, meta && meta.count === 'text-fg' && 'text-white')}>{shown}</span>
      </span>
      <span aria-hidden="true" className="relative h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <span style={{ width: `${isAll ? (total > 0 ? 100 : 0) : share}%` }} className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 motion-reduce:transition-none', shareBar[filter])} />
      </span>
    </button>
  );
}

function StatusOrbit({ counts, filter, onFilter }: { counts: Record<Filter, number>; filter: Filter; onFilter: (filter: Filter) => void }) {
  const filters: Filter[] = ['all', 'pending', 'completed', 'rejected'];
  return (
    <aside
      role="group"
      aria-label={translate('ibTransferHist.filter')}
      className={cx('orbit-card relative isolate flex animate-rise flex-col gap-5 overflow-hidden p-5 text-white motion-reduce:animate-none lg:sticky lg:top-24 lg:col-span-4', graphite)}
    >
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-40 -right-40 -z-10 size-[26rem] animate-orbit-spin motion-reduce:animate-none" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-80 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <StatusRing counts={counts} />
      <div className="flex flex-col gap-2.5">
        {filters.map((item, index) => (
          <FilterRow key={item} filter={item} count={counts[item]} total={counts.all} index={index + 1} isActive={filter === item} onSelect={() => onFilter(item)} />
        ))}
      </div>
    </aside>
  );
}

/* ───────────── Records: a timeline with one status node per request ───────────── */

function TransferRow({ record, currency, index }: { record: IbTransferRecord; currency: string; index: number }) {
  const meta = statusMeta[record.status];
  return (
    <li style={riseDelay(index)} className="group grid animate-rise grid-cols-[2.5rem_minmax(0,1fr)] gap-4 motion-reduce:animate-none">
      <span className={cx('relative z-10 mt-3 grid size-10 place-items-center rounded-full ring-1 ring-offset-4 ring-offset-surface', meta.tile)}>
        <Icon name={meta.icon} size={15} />
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line transition-[background-color,box-shadow] duration-300 group-hover:bg-surface-2/70 group-hover:ring-primary/40">
        <span className="flex min-w-[10rem] flex-1 items-center gap-3">
          <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold text-(--brand-on-primary)', goldFill)}>{initials(record.clientName)}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg">{record.clientName}</span>
            <span className="block truncate font-mono text-xs text-fg-subtle">{record.accountNumber}</span>
          </span>
        </span>
        {record.note && <span className="hidden max-w-[14rem] min-w-0 flex-1 truncate rounded-xl bg-surface px-3 py-1.5 text-xs text-fg-muted ring-1 ring-line md:block">{record.note}</span>}
        <span className="ml-auto flex items-center gap-4">
          <span className="text-right">
            <span className="block font-mono text-base font-semibold text-fg tabular-nums">{formatMoney(record.amount, currency)}</span>
            <span className="block text-[11px] text-fg-subtle">{formatDate(record.requestedAt)}</span>
          </span>
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', meta.pill)}>
            <Icon name={meta.icon} size={11} />
            {translate(meta.labelKey)}
          </span>
        </span>
      </div>
    </li>
  );
}

function EmptyLedger() {
  return (
    <div className="relative isolate flex flex-col items-center px-6 py-14 text-center">
      {/* Ghost rows waiting to be filled. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-6 -z-10 space-y-3 opacity-60 [mask-image:linear-gradient(to_bottom,var(--hero-panel),transparent_80%)]">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
            <span className="size-8 rounded-full bg-surface-2" />
            <span className="h-2.5 w-1/4 rounded-full bg-surface-2" />
            <span className="ml-auto h-2.5 w-16 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>

      <span className="relative grid size-28 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border-2 border-dashed border-primary/40 [animation-duration:18s] motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-orbit [animation-duration:4s] motion-reduce:hidden">
          <span className={cx('absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full shadow-[0_0_12px_var(--brand-primary)]', goldFill)} />
        </span>
        <span className={cx('relative grid size-16 animate-float place-items-center rounded-2xl text-(--brand-gleam) ring-1 ring-primary/50 motion-reduce:animate-none', graphite)}>
          <Icon name="transfer" size={26} />
        </span>
      </span>

      <h2 className="mt-6 text-lg font-semibold tracking-tight text-fg">{translate('ibTransferHist.emptyTitle')}</h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('ibTransferHist.emptyBody')}</p>
      <Link
        href={NEW_TRANSFER_HREF}
        className={cx(
          'group relative mt-6 inline-flex h-11 items-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold text-(--brand-on-primary) transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
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
      <div className="grid items-start gap-5 lg:grid-cols-12">
        <Skeleton className="h-[34rem] rounded-[28px] lg:col-span-4" />
        <Skeleton className="h-[28rem] rounded-[28px] lg:col-span-8" />
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
    <div className="grid items-start gap-5 lg:grid-cols-12">
      <StatusOrbit counts={counts} filter={filter} onFilter={setFilter} />

      <section style={riseDelay(2)} className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none lg:col-span-8')}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <p aria-live="polite" className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
            <span className={cx('size-2 rounded-full', goldFill)} />
            {filterLabel(filter)}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted ring-1 ring-line tabular-nums">{visible.length}</span>
          </p>
          <Link
            href={NEW_TRANSFER_HREF}
            className="group inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-fg shadow-card ring-1 ring-line transition-[box-shadow,color] duration-300 hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="plus" size={14} className="transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
            {translate('ibTransferHist.newTransfer')}
          </Link>
        </header>

        {records.length === 0 ? (
          <EmptyLedger />
        ) : visible.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-fg-muted">{translate('ibTransferHist.emptyFiltered', { status: filterLabel(filter).toLowerCase() })}</p>
        ) : (
          <div className="relative p-5">
            <span aria-hidden="true" className="absolute top-8 bottom-8 left-[2.4rem] w-px bg-linear-to-b from-primary/50 via-line to-transparent" />
            <ol className="relative space-y-3">
              {visible.map((record, index) => (
                <TransferRow key={record.id} record={record} currency={currency} index={index} />
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
