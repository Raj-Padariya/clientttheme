'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import type { AppNotificationKind } from '@/core/mock/notifications';
import { cx } from '../lib/cx';
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
const graphite = 'bg-[#18181b]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const groupLabel: Record<DayGroup, MessageKey> = { today: 'notif.today', yesterday: 'notif.yesterday', earlier: 'notif.earlier' };
const kindLabel: Record<AppNotificationKind, MessageKey> = { scratch: 'notif.typeScratch', account: 'notif.typeAccount' };

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Summary ───────────── */

function SummaryDeck({ items }: { items: StoredNotification[] }) {
  const unread = items.filter((item) => !item.read).length;
  const kinds = Object.keys(kindLabel) as AppNotificationKind[];
  const readShare = items.length ? (items.length - unread) / items.length : 1;

  return (
    <section className={cx('relative isolate animate-rise overflow-hidden rounded-[28px] p-5 text-white ring-1 ring-white/10 sm:p-6 motion-reduce:animate-none', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 -z-10 size-80 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_28%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <div className="flex flex-wrap items-center gap-5">
        <span className="relative grid size-16 shrink-0 place-items-center">
          <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
            <circle cx="32" cy="32" r="29" fill="none" strokeWidth="3" className="stroke-white/10" />
            <circle cx="32" cy="32" r="29" fill="none" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray={`${readShare} 1`} style={{ stroke: 'var(--brand-gleam)' }} className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none" />
          </svg>
          {unread > 0 && <span aria-hidden="true" className="absolute inset-2 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />}
          <span className={cx('relative grid size-11 place-items-center rounded-2xl text-[#18181b]', goldFill)}>
            <Icon name="bell" size={19} className={cx(unread > 0 && 'origin-[50%_12%] animate-bell-ring [animation-iteration-count:2] motion-reduce:animate-none')} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{translate('notif.pageTitle')}</h2>
          <p aria-live="polite" className="mt-0.5 text-sm text-white/55">
            <span className={cx('font-mono font-semibold tabular-nums', goldText)}>{unread}</span> {translate('notif.unreadCount', { count: '' }).trim()}
          </p>
        </div>

        <button
          type="button"
          disabled={unread === 0}
          onClick={markAllNotificationsRead}
          className={cx(
            'group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold text-[#18181b] transition-[box-shadow,filter,transform,opacity] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none',
            goldFill,
          )}
        >
          {unread > 0 && <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />}
          <Icon name="check" size={14} className="relative" />
          <span className="relative">{translate('notif.markAll')}</span>
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-white/[0.05] px-3.5 py-2.5 ring-1 ring-white/10">
          <dt className={cx(eyebrow, 'text-white/45')}>{translate('notif.all')}</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{items.length}</dd>
        </div>
        <div className="rounded-2xl bg-white/[0.05] px-3.5 py-2.5 ring-1 ring-white/10">
          <dt className={cx(eyebrow, 'text-white/45')}>{translate('notif.unread')}</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-(--brand-gleam) tabular-nums">{unread}</dd>
        </div>
        {kinds.map((kind) => (
          <div key={kind} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3.5 py-2.5 ring-1 ring-white/10">
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl ring-1', notificationKindMeta[kind].tile)}>
              <Icon name={notificationKindMeta[kind].icon} size={14} />
            </span>
            <span className="min-w-0">
              <dt className="truncate text-[11px] text-white/45">{translate(kindLabel[kind])}</dt>
              <dd className="font-mono text-lg leading-tight font-semibold tabular-nums">{items.filter((item) => item.kind === kind).length}</dd>
            </span>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Timeline ───────────── */

function TimelineEntry({ item, now, index }: { item: StoredNotification; now: number; index: number }) {
  const meta = notificationKindMeta[item.kind];
  const isUnread = !item.read;
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cx('text-sm', isUnread ? 'font-semibold text-fg' : 'font-medium text-fg-muted')}>{item.title}</span>
          {isUnread && (
            <span className={cx('rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.12em] text-[#18181b]', goldFill)}>{translate('notif.new')}</span>
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
    'group flex flex-1 items-start gap-4 rounded-2xl px-4 py-3.5 text-left ring-1 transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
    isUnread ? 'bg-surface ring-primary/25 shadow-card hover:ring-primary/50' : 'bg-surface/60 ring-line hover:bg-surface hover:ring-line-strong',
  );

  return (
    <li style={riseDelay(index)} className="relative flex animate-rise gap-4 motion-reduce:animate-none">
      {/* Node on the day rail. */}
      <span className="relative z-10 mt-2 grid size-10 shrink-0 place-items-center">
        {isUnread && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl border border-primary motion-reduce:hidden" />}
        <span className={cx('grid size-10 place-items-center rounded-xl ring-1', isUnread ? meta.tile : 'bg-surface-2 text-fg-subtle ring-line', isUnread && 'bg-surface')}>
          <Icon name={meta.icon} size={16} />
        </span>
      </span>
      {item.href ? (
        <Link href={item.href} onClick={() => markNotificationRead(item.id)} className={cardClass}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={() => markNotificationRead(item.id)} className={cardClass}>
          {body}
        </button>
      )}
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
        <div className="flex flex-col items-center rounded-[28px] border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
          <span className="relative grid size-20 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border-2 border-dashed border-primary/40 [animation-duration:16s] motion-reduce:animate-none" />
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
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
              <ol className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-5 before:w-px before:bg-line">
                <span aria-hidden="true" className="pointer-events-none absolute top-4 bottom-4 left-5 w-px overflow-hidden motion-reduce:hidden">
                  <span className="absolute inset-x-0 h-16 animate-[rail-flow_3.2s_linear_infinite] bg-linear-to-b from-transparent via-(--brand-gleam) to-transparent" />
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
                <span style={{ width: `${(shown.length / items.length) * 100}%` }} className={cx('block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', goldFill)} />
              </div>
              <p className="mt-1.5 text-center text-xs text-fg-subtle tabular-nums">{translate('notif.showing', { shown: String(shown.length), total: String(items.length) })}</p>
            </div>
            {hasMore ? (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-surface px-6 text-sm font-semibold text-fg ring-1 ring-line transition-[box-shadow,color] duration-300 hover:text-primary hover:ring-primary/50 hover:shadow-[0_12px_26px_-16px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
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
