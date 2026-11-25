'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { useFloatingPosition } from '../ui/useFloatingPosition';
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
} from './notificationStore';

type Filter = 'all' | 'unread';

export const NOTIFICATIONS_HREF = '/notifications';
const PANEL_LIMIT = 6;
const graphite = 'bg-[#18181b]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const groupLabel: Record<DayGroup, MessageKey> = { today: 'notif.today', yesterday: 'notif.yesterday', earlier: 'notif.earlier' };

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 50}ms` };
}

function NotificationItem({ item, now, index, onOpen }: { item: StoredNotification; now: number; index: number; onOpen: (item: StoredNotification) => void }) {
  const meta = notificationKindMeta[item.kind];
  const className = cx(
    'group relative flex w-full animate-rise items-start gap-3 rounded-2xl p-3 text-left transition-colors duration-200 hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
    !item.read && 'bg-primary/[0.05]',
  );
  const content = (
    <>
      <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none', meta.tile)}>
        <Icon name={meta.icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cx('text-sm leading-snug', item.read ? 'font-medium text-fg-muted' : 'font-semibold text-fg')}>{item.title}</span>
          <span suppressHydrationWarning className="shrink-0 pt-0.5 text-[10.5px] text-fg-subtle tabular-nums">
            {timeAgo(item.createdAt, now)}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-fg-muted">{item.body}</span>
      </span>
      {!item.read && <span aria-hidden="true" className="absolute top-3.5 left-1.5 size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />}
    </>
  );

  return (
    <li style={riseDelay(index)}>
      {item.href ? (
        <Link href={item.href} onClick={() => onOpen(item)} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={() => onOpen(item)} className={className}>
          {content}
        </button>
      )}
    </li>
  );
}

export function NotificationBell() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = useNotifications();
  const now = useNow();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const floatingStyle = useFloatingPosition(triggerRef, panelRef, isOpen);

  const unread = items.filter((item) => !item.read).length;
  const visible = (filter === 'unread' ? items.filter((item) => !item.read) : items).slice(0, PANEL_LIMIT);
  const groups = (['today', 'yesterday', 'earlier'] as const)
    .map((group) => ({ group, list: visible.filter((item) => dayGroupOf(item.createdAt, now) === group) }))
    .filter((entry) => entry.list.length > 0);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  function open() {
    setIsOpen(true);
    requestAnimationFrame(() => panelRef.current?.focus());
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleOpenItem(item: StoredNotification) {
    markNotificationRead(item.id);
    if (item.href) setIsOpen(false);
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={translate('notif.bellLabel', { count: String(unread) })}
        onClick={() => (isOpen ? close() : open())}
        className={cx(
          'relative grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring [&_svg]:origin-[50%_12%] hover:[&_svg]:animate-bell-ring motion-reduce:hover:[&_svg]:animate-none',
          isOpen && 'bg-hover text-primary',
        )}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 grid">
            <span className="col-start-1 row-start-1 size-[18px] animate-ping rounded-full bg-primary/40 [animation-duration:2.4s] motion-reduce:hidden" />
            <span className={cx('col-start-1 row-start-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 font-mono text-[10px] font-bold text-[#18181b] ring-2 ring-surface-2 tabular-nums', goldFill)}>
              {unread > 9 ? '9+' : unread}
            </span>
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={translate('notif.title')}
            tabIndex={-1}
            onKeyDown={handlePanelKeyDown}
            style={floatingStyle}
            className="w-[23rem] max-w-[calc(100vw-1rem)] animate-rise overflow-hidden rounded-[24px] border border-line-strong bg-surface shadow-pop outline-none motion-reduce:animate-none"
          >
            <div className={cx('relative isolate overflow-hidden px-4 pt-4 pb-3 text-white', graphite)}>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-10 -z-10 size-44 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_30%,transparent),transparent_68%)] motion-reduce:animate-none"
              />
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center">
                  {unread > 0 && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />}
                  <span className={cx('relative grid size-10 place-items-center rounded-2xl text-[#18181b]', goldFill)}>
                    <Icon name="bell" size={17} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{translate('notif.title')}</span>
                  <span aria-live="polite" className="block text-xs text-white/55">
                    {translate('notif.unreadCount', { count: String(unread) })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label={translate('notif.close')}
                  className="grid size-8 place-items-center rounded-full bg-white/[0.08] text-white/70 ring-1 ring-white/10 transition-[color,transform,background-color] duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div role="radiogroup" aria-label={translate('notif.filter')} className="relative grid grid-cols-2 rounded-full bg-white/[0.07] p-0.5 ring-1 ring-white/10">
                  <span
                    aria-hidden="true"
                    style={{ transform: filter === 'unread' ? 'translateX(100%)' : undefined }}
                    className={cx('absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none', goldFill)}
                  />
                  {(['all', 'unread'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={filter === option}
                      onClick={() => setFilter(option)}
                      className={cx(
                        'relative z-10 h-7 rounded-full px-3.5 text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                        filter === option ? 'text-[#18181b]' : 'text-white/65 hover:text-white',
                      )}
                    >
                      {translate(option === 'all' ? 'notif.all' : 'notif.unread')}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={unread === 0}
                  onClick={markAllNotificationsRead}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-(--brand-gleam) transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
                >
                  <Icon name="check" size={12} />
                  {translate('notif.markAll')}
                </button>
              </div>
            </div>

            <div key={filter} className="max-h-[min(24rem,calc(100vh-13rem))] overflow-y-auto overscroll-contain p-2">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="relative grid size-16 place-items-center">
                    <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border-2 border-dashed border-primary/40 [animation-duration:14s] motion-reduce:animate-none" />
                    <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon name="check" size={17} />
                    </span>
                  </span>
                  <p className="mt-3 text-sm font-medium text-fg-muted">{translate(filter === 'unread' ? 'notif.caughtUp' : 'notif.empty')}</p>
                </div>
              ) : (
                groups.map((entry) => (
                  <section key={entry.group} className="pb-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.16em] text-fg-subtle uppercase">{translate(groupLabel[entry.group])}</p>
                    <ul className="space-y-0.5">
                      {entry.list.map((item, index) => (
                        <NotificationItem key={item.id} item={item} now={now} index={index} onOpen={handleOpenItem} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>

            <Link
              href={NOTIFICATIONS_HREF}
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {translate('notif.viewAll')}
              <Icon name="arrowRight" size={14} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
