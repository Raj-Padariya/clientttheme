'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import type { AppNotificationKind } from '@/core/mock/notifications';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
import { Icon } from '../ui/Icon';
import {
  dayGroupOf,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKindMeta,
  timeAgo,
  useNotifications,
  useNow,
  type DayGroup,
  type StoredNotification,
} from '../shell/notificationStore';

const PAGE_SIZE = 5;
const brandFill = '[background-image:var(--brand-gradient)]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const groupLabel: Record<DayGroup, MessageKey> = { today: 'notif.today', yesterday: 'notif.yesterday', earlier: 'notif.earlier' };
const kindLabel: Record<AppNotificationKind, MessageKey> = { scratch: 'notif.typeScratch', account: 'notif.typeAccount' };

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Summary ───────────── */

function SummaryDeck({ items }: { items: StoredNotification[] }) {
  const tilt = useTilt<HTMLElement>(4);
  const unread = items.filter((item) => !item.read).length;
  const kinds = Object.keys(kindLabel) as AppNotificationKind[];
  const readShare = items.length ? (items.length - unread) / items.length : 1;

  return (
    <section {...tilt} className="orbit-tilt orbit-card relative animate-rise overflow-hidden p-5 sm:p-6 motion-reduce:animate-none">
      <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 size-80 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--orbit-violet)_28%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <div className="relative flex flex-wrap items-center gap-5">
        <span className="orbit-pop relative grid size-20 shrink-0 place-items-center">
          <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
          <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute inset-1.5 -rotate-90">
            <circle cx="32" cy="32" r="29" fill="none" strokeWidth="3" className="stroke-line" />
            <circle cx="32" cy="32" r="29" fill="none" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray={`${readShare} 1`} style={{ stroke: 'var(--brand-primary)' }} className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none" />
          </svg>
          {unread > 0 && <span aria-hidden="true" className="absolute inset-4 animate-pulse-ring rounded-full border border-primary motion-reduce:hidden" />}
          <span className={cx('relative grid size-11 place-items-center rounded-full text-on-primary', brandFill)}>
            <Icon name="bell" size={19} className={cx(unread > 0 && 'origin-[50%_12%] animate-bell-ring [animation-iteration-count:2] motion-reduce:animate-none')} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-fg">{translate('notif.pageTitle')}</h2>
          <p aria-live="polite" className="mt-0.5 text-sm text-fg-muted">
            <span className="orbit-text font-mono font-semibold tabular-nums">{unread}</span> {translate('notif.unreadCount', { count: '' }).trim()}
          </p>
        </div>

        <button
          type="button"
          disabled={unread === 0}
          onClick={markAllNotificationsRead}
          className={cx(
            'group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold text-on-primary transition-[box-shadow,filter,transform,opacity] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none',
            brandFill,
          )}
        >
          {unread > 0 && <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />}
          <Icon name="check" size={14} className="relative" />
          <span className="relative">{translate('notif.markAll')}</span>
        </button>
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="min-w-0 rounded-2xl bg-surface-2/60 px-3.5 py-2.5 ring-1 ring-line">
          <dt className={cx(eyebrow, 'text-fg-subtle')}>{translate('notif.all')}</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-fg tabular-nums">{items.length}</dd>
        </div>
        <div className="min-w-0 rounded-2xl bg-surface-2/60 px-3.5 py-2.5 ring-1 ring-line">
          <dt className={cx(eyebrow, 'text-fg-subtle')}>{translate('notif.unread')}</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-primary tabular-nums">{unread}</dd>
        </div>
        {kinds.map((kind) => (
          <div key={kind} className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-surface-2/60 px-3.5 py-2.5 ring-1 ring-line">
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-full ring-1', notificationKindMeta[kind].tile)}>
              <Icon name={notificationKindMeta[kind].icon} size={14} />
            </span>
            <span className="min-w-0">
              <dt className="truncate text-[11px] text-fg-subtle">{translate(kindLabel[kind])}</dt>
              <dd className="font-mono text-lg leading-tight font-semibold text-fg tabular-nums">{items.filter((item) => item.kind === kind).length}</dd>
            </span>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Timeline ───────────── */

function TimelineEntry({ item, now, index }: { item: StoredNotification; now: number; index: number }) {
  const tilt = useTilt<HTMLDivElement>(3);
  const meta = notificationKindMeta[item.kind];
  const isUnread = !item.read;
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cx('text-sm', isUnread ? 'font-semibold text-fg' : 'font-medium text-fg-muted')}>{item.title}</span>
          {isUnread && (
            <span className={cx('rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.12em] text-on-primary', brandFill)}>{translate('notif.new')}</span>
          )}
        </span>
        <span className={cx('mt-1 block text-sm', isUnread ? 'text-fg-muted' : 'text-fg-subtle')}>{item.body}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <span suppressHydrationWarning className="text-xs text-fg-subtle tabular-nums">
          {timeAgo(item.createdAt, now)}
        </span>
        {item.href && (
          <Icon name="arrowRight" size={14} className="text-fg-subtle opacity-0 transition-[opacity,transform,color] duration-300 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        )}
      </span>
    </>
  );
  const cardClass = cx(
    'group flex w-full items-start gap-4 px-4 py-3.5 text-left transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
    isUnread ? 'shadow-[0_16px_36px_-26px_var(--brand-primary)]' : 'opacity-80 hover:opacity-100',
  );

  return (
    <li style={riseDelay(index)} className="relative flex animate-rise gap-4 motion-reduce:animate-none">
      {/* Planet node on the day rail. */}
      <span className="relative z-10 mt-2 grid size-10 shrink-0 place-items-center">
        {isUnread && <span aria-hidden="true" className="absolute inset-0 animate-pulse-ring rounded-full border border-primary motion-reduce:hidden" />}
        <span className={cx('grid size-10 place-items-center rounded-full ring-1', isUnread ? meta.tile : 'bg-surface-2 text-fg-subtle ring-line', isUnread && 'bg-surface')}>
          <Icon name={meta.icon} size={16} />
        </span>
      </span>
      <div {...tilt} className="orbit-tilt orbit-card min-w-0 flex-1 overflow-hidden">
        <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0 opacity-60" />
        {item.href ? (
          <Link href={item.href} onClick={() => markNotificationRead(item.id)} className={cx(cardClass, 'relative')}>
            {body}
          </Link>
        ) : (
          <button type="button" onClick={() => markNotificationRead(item.id)} className={cx(cardClass, 'relative')}>
            {body}
          </button>
        )}
      </div>
    </li>
  );
}

export default function NotificationsPage() {
  const items = useNotifications();
  const now = useNow();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const shown = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const groups = (['today', 'yesterday', 'earlier'] as const)
    .map((group) => ({ group, list: shown.filter((item) => dayGroupOf(item.createdAt, now) === group) }))
    .filter((entry) => entry.list.length > 0);
  let runningIndex = 0;

  return (
    <div className="space-y-6">
      <SummaryDeck items={items} />

      {items.length === 0 ? (
        <div className="orbit-card flex flex-col items-center px-6 py-16 text-center">
          <span className="relative grid size-20 place-items-center">
            <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin-fast motion-reduce:animate-none" />
            <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name="bell" size={20} />
            </span>
          </span>
          <p className="mt-4 text-sm font-medium text-fg-muted">{translate('notif.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((entry) => (
            <section key={entry.group} aria-labelledby={`notif-group-${entry.group}`}>
              <h3 id={`notif-group-${entry.group}`} className={cx(eyebrow, 'mb-3 flex items-center gap-3 text-fg-subtle')}>
                {translate(groupLabel[entry.group])}
                <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line to-transparent" />
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tracking-normal text-fg-muted ring-1 ring-line">{entry.list.length}</span>
              </h3>
              {/* Vertical rail linking the day's entries; a light runs down it. */}
              <ol className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-5 before:w-px before:bg-line [perspective:1200px]">
                <span aria-hidden="true" className="pointer-events-none absolute top-4 bottom-4 left-5 w-px overflow-hidden motion-reduce:hidden">
                  <span className="absolute inset-x-0 h-16 animate-[rail-flow_3.2s_linear_infinite] bg-linear-to-b from-transparent via-primary to-transparent" />
                </span>
                {entry.list.map((item) => (
                  <TimelineEntry key={item.id} item={item} now={now} index={runningIndex++} />
                ))}
              </ol>
            </section>
          ))}

          <div className="flex flex-col items-center gap-3 pt-1">
            <div className="w-full max-w-xs">
              <div className="h-1 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                <span style={{ width: `${(shown.length / items.length) * 100}%` }} className={cx('block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', brandFill)} />
              </div>
              <p className="mt-1.5 text-center text-xs text-fg-subtle tabular-nums">{translate('notif.showing', { shown: String(shown.length), total: String(items.length) })}</p>
            </div>
            {hasMore ? (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="orbit-card group inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-fg transition-[box-shadow,color] duration-300 hover:text-primary hover:shadow-[0_12px_26px_-16px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                {translate('notif.loadMore')}
                <Icon name="chevronDown" size={15} className="transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none" />
              </button>
            ) : (
              <p className="text-xs font-medium text-fg-subtle">{translate('notif.allLoaded')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
