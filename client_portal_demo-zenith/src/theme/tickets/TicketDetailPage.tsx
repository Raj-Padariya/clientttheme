'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { translate } from '@/core/i18n';

import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';
import { toast } from '../ui/Toast';
import {
  MESSAGE_MAX_LENGTH,
  categoryIcon,
  dateFormat,
  departmentLabel,
  formatFileSize,
  initialTickets,
  initials,
  priorityStyle,
  statusChangeLabel,
  ticketActivity,
  ticketDetailCopy as copy,
  timestampFormat,
  trackerSteps,
  type Ticket,
  type TicketActivity,
  type TicketAttachment,
  type TicketStatus,
} from './ticketsData';

type ThreadTab = 'all' | 'attachments';

interface StatusAction {
  to: TicketStatus;
  label: string;
  icon: IconName;
}

const RED = 'var(--zenith-red)';
const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const COMPOSER_RING_RADIUS = 33;
const COMPOSER_RING_LENGTH = 2 * Math.PI * COMPOSER_RING_RADIUS;

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

function statusActions(status: TicketStatus): StatusAction[] {
  if (status === 'resolved' || status === 'closed') return [{ to: 'open', label: copy.reopenTicket, icon: 'refresh' }];
  return [
    { to: 'resolved', label: copy.markResolved, icon: 'checkCircle' },
    { to: 'closed', label: copy.closeTicket, icon: 'xCircle' },
  ];
}

function initialThread(ticket: Ticket): TicketActivity[] {
  return ticketActivity[ticket.id] ?? [{ kind: 'message', id: 'm1', author: copy.you, body: ticket.message, at: ticket.createdAt, attachments: [] }];
}

/** Horizontal capsule journey: one square pixel per step, tracks fill up to the current step, the live step is red. */
function StatusJourney({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);

  return (
    <ol className="flex items-start">
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && (status === 'open' || status === 'inProgress');
        const isLast = index === trackerSteps.length - 1;
        return (
          <li key={step} style={staggerStyle(index, 120)} className={cx('flex min-w-0 animate-feed-in flex-col gap-2 motion-reduce:animate-none', !isLast && 'flex-1')}>
            <span className="flex items-center">
              <span className="relative grid size-10 shrink-0 place-items-center">
                {isCurrent && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[14px] border-2 motion-reduce:hidden" />}
                <span
                  style={isCurrent ? { background: RED } : undefined}
                  className={cx(
                    'relative grid size-10 place-items-center rounded-[12px] font-mono text-[11px] font-black transition-colors',
                    isCurrent ? 'text-white' : isDone ? 'bg-fg text-app' : 'border border-dashed border-line-strong text-fg-subtle',
                  )}
                >
                  {isDone && !isCurrent ? <Icon name="check" size={15} /> : String(index + 1).padStart(2, '0')}
                </span>
              </span>
              {!isLast && (
                <span aria-hidden="true" className="relative mx-1.5 h-2 flex-1 overflow-hidden rounded-full bg-fg/10">
                  <span
                    style={{ transitionDelay: `${300 + index * 160}ms` }}
                    className={cx('absolute inset-y-0 left-0 rounded-full bg-fg transition-[width] duration-700 motion-reduce:transition-none', index < reached ? 'w-full' : 'w-0')}
                  />
                </span>
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cx('truncate text-[10px] font-bold tracking-[0.12em] uppercase', isCurrent ? 'text-[var(--zenith-red)]' : isDone ? 'text-fg' : 'text-fg-subtle')}>
                {translate(`tickets.status.${step}`)}
              </span>
              {isCurrent && <LiveDot />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ManageMenu({ status, onChange }: { status: TicketStatus; onChange: (to: TicketStatus) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="group/manage relative flex h-12 w-full items-center gap-3 rounded-full bg-fg pr-2 pl-1 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span aria-hidden="true" style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white transition-transform duration-500 group-hover/manage:rotate-90 motion-reduce:transition-none">
          <Icon name="settings" size={16} />
        </span>
        <span className="flex-1 text-left">{copy.manageTicket}</span>
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full ring-1 ring-app/20">
          <Icon name="chevronDown" size={15} className={cx('transition-transform duration-300', isOpen && 'rotate-180')} />
        </span>
      </button>
      {isOpen && (
        <ul role="menu" className="absolute inset-x-0 z-30 mt-2 flex animate-feed-in flex-col gap-1 rounded-[24px] border border-line-strong bg-surface p-1.5 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.6)] motion-reduce:animate-none">
          {statusActions(status).map((action, index) => (
            <li key={action.to} role="none" style={staggerStyle(index, 70)} className="animate-feed-in motion-reduce:animate-none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onChange(action.to);
                }}
                className="group/item flex w-full items-center gap-3 rounded-full py-1.5 pr-3 pl-1.5 text-left text-sm font-medium text-fg transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
              >
                <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/item:-rotate-12')}>
                  <Icon name={action.icon} size={14} />
                </span>
                <span className="flex-1">{action.label}</span>
                <Icon name="arrowRight" size={14} className="text-[var(--zenith-red)] transition-transform duration-200 group-hover/item:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttachmentChip({ file, onRemove }: { file: TicketAttachment; onRemove?: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-fg/[0.03] py-1 pr-2 pl-1 text-xs text-fg-muted ring-1 ring-line-strong">
      <span aria-hidden="true" className={cx(beadClass, 'size-6')}>
        <Icon name="fileText" size={11} />
      </span>
      <span className="truncate text-fg">{file.name}</span>
      <span className="shrink-0 font-mono tabular-nums">{formatFileSize(file.size)}</span>
      {onRemove && (
        <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove} className="grid size-5 shrink-0 place-items-center rounded-full transition-colors hover:bg-hover hover:text-danger">
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}

type MessageActivity = Extract<TicketActivity, { kind: 'message' }>;
type StatusActivity = Extract<TicketActivity, { kind: 'status' }>;
type ThreadBlock = { kind: 'message'; item: MessageActivity; index: number } | { kind: 'status'; events: { item: StatusActivity; index: number }[] };

/** Back-to-back status changes collapse into one timeline block so the chat is not a stack of loose pills. */
function groupThread(thread: TicketActivity[]): ThreadBlock[] {
  return thread.reduce<ThreadBlock[]>((blocks, item, index) => {
    const last = blocks.at(-1);
    if (item.kind === 'message') return [...blocks, { kind: 'message', item, index }];
    if (last?.kind === 'status') return [...blocks.slice(0, -1), { kind: 'status', events: [...last.events, { item, index }] }];
    return [...blocks, { kind: 'status', events: [{ item, index }] }];
  }, []);
}

function StatusChip({ status, isTarget }: { status: TicketStatus; isTarget: boolean }) {
  return (
    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', isTarget ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line-strong')}>
      {statusChangeLabel[status]}
    </span>
  );
}

/** Status changes ride a horizontal pixel track: one stop per change, oldest left, newest (red, rippling) right. */
function StatusGroup({ events }: { events: { item: StatusActivity; index: number }[] }) {
  const latest = events[events.length - 1].item;

  return (
    <li style={staggerStyle(events[0].index, 110)} className="animate-rise py-2 motion-reduce:animate-none">
      <div className="rounded-[28px] border border-dashed border-line-strong">
        <p className="flex items-center gap-2.5 px-4 pt-3.5 text-fg-subtle">
          <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
            <Icon name="refresh" size={12} />
          </span>
          <span className="font-mono text-xs font-bold text-[var(--zenith-red)] tabular-nums">{String(events.length).padStart(2, '0')}</span>
          <span aria-hidden="true" className="flex flex-1 items-center gap-1">
            {Array.from({ length: 8 }, (_, cell) => (
              <span key={cell} style={{ animationDelay: `${cell * 220}ms` }} className="zenith-twinkle h-1.5 flex-1 rounded-[2px] bg-fg/15" />
            ))}
          </span>
          <StatusChip status={latest.to} isTarget />
        </p>
        <ol className="flex overflow-x-auto px-2 pt-4 pb-4">
          {events.map(({ item, index }, position) => {
            const isLatest = position === events.length - 1;
            return (
              <li key={item.id} style={staggerStyle(index, 110)} className="relative flex min-w-[9rem] flex-1 animate-feed-in flex-col items-center gap-2 px-2 text-center motion-reduce:animate-none">
                {!isLatest && <span aria-hidden="true" className="absolute top-[3.25rem] left-1/2 h-1 w-full rounded-full bg-fg/15" />}
                <span className="sr-only">{copy.statusChanged(statusChangeLabel[item.from], statusChangeLabel[item.to])}</span>
                <span aria-hidden="true" className="flex h-6 items-center">
                  <StatusChip status={item.from} isTarget={false} />
                </span>
                <span className="relative grid size-8 place-items-center">
                  {isLatest && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-0.5 animate-ring-ripple rounded-[11px] border-2 motion-reduce:hidden" />}
                  <span
                    style={{ animationDelay: `${200 + position * 120}ms`, ...(isLatest ? { background: RED } : {}) }}
                    className={cx('relative grid size-8 animate-dot-pop place-items-center rounded-[10px] text-[9px] font-bold motion-reduce:animate-none', isLatest ? 'text-white' : 'bg-fg text-app')}
                  >
                    {initials(item.author)}
                  </span>
                </span>
                <span aria-hidden="true">
                  <StatusChip status={item.to} isTarget />
                </span>
                <span className="text-xs font-semibold text-fg">{item.author}</span>
                <time dateTime={item.at.toISOString()} className="font-mono text-[10px] leading-snug text-fg-subtle tabular-nums">
                  {timestampFormat.format(item.at)}
                </time>
              </li>
            );
          })}
        </ol>
      </div>
    </li>
  );
}

/** Chat capsules: your own replies sit on the right (solid), everyone else's on the left (open); the opening message is dashed. */
function ThreadItem({ item, isOrigin, index }: { item: MessageActivity; isOrigin: boolean; index: number }) {
  const time = timestampFormat.format(item.at);
  const isMine = item.author === copy.you;

  return (
    <li style={staggerStyle(index, 110)} className={cx('flex animate-rise items-end gap-2.5 py-1 motion-reduce:animate-none', isMine && 'flex-row-reverse')}>
      <span
        style={isMine ? { background: RED } : undefined}
        className={cx('grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold', isMine ? 'text-white' : 'bg-fg text-app')}
      >
        {initials(item.author)}
      </span>
      <div
        className={cx(
          'min-w-0 max-w-[80%] rounded-[24px] px-4 py-3',
          isMine ? 'rounded-br-md bg-fg/[0.07] ring-1 ring-line-strong' : 'rounded-bl-md bg-fg/[0.03] ring-1 ring-line',
          isOrigin && !isMine && 'bg-transparent ring-0 outline outline-1 outline-dashed outline-line-strong',
        )}
      >
        <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1', isMine && 'flex-row-reverse')}>
          <span className="text-sm font-bold text-fg">{item.author}</span>
          <time dateTime={item.at.toISOString()} className="font-mono text-[11px] text-fg-subtle tabular-nums">
            {time}
          </time>
        </div>
        {item.body && <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-fg-muted">{item.body}</p>}
        {item.attachments.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {item.attachments.map((file) => (
              <AttachmentChip key={file.name} file={file} />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

/** Capsule row: numbered icon bead + label on the left, value on the right. */
function DetailCell({ icon, label, index, children }: { icon: IconName; label: string; index: number; children: ReactNode }) {
  return (
    <div style={staggerStyle(index, 70)} className="group/cell flex min-w-0 animate-feed-in items-center gap-2.5 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line transition-[box-shadow] hover:ring-line-strong motion-reduce:animate-none">
      <dt className={cx(eyebrow, 'flex min-w-0 shrink-0 items-center gap-2 text-fg-subtle')}>
        <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/cell:-rotate-12 motion-reduce:transition-none')}>
          <Icon name={icon} size={13} />
        </span>
        <span className="font-mono text-[9px] text-[var(--zenith-red)]">{String(index + 1).padStart(2, '0')}</span>
        {label}
      </dt>
      <dd className="ml-auto min-w-0 truncate text-right text-sm font-bold text-fg">{children}</dd>
    </div>
  );
}

function TicketNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-line-strong px-6 py-16 text-center">
      <span aria-hidden="true" className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
        <span className={cx(beadClass, 'size-10 animate-float motion-reduce:animate-none')}>
          <Icon name="ticket" size={17} />
        </span>
      </span>
      <p className="text-base font-semibold text-fg">{copy.notFoundTitle}</p>
      <p className="text-sm text-fg-muted">{copy.notFoundHint}</p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/tickets"
      className="group inline-flex items-center gap-2 self-start rounded-full py-1 pr-4 pl-1 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span aria-hidden="true" style={{ background: RED }} className="grid size-8 shrink-0 place-items-center rounded-full text-white">
        <Icon name="arrowRight" size={14} className="rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {copy.backToTickets}
    </Link>
  );
}

function TicketView({ ticket }: { ticket: Ticket }) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [thread, setThread] = useState<TicketActivity[]>(() => initialThread(ticket));
  const [tab, setTab] = useState<ThreadTab>('all');
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<TicketAttachment[]>([]);
  const threadEndRef = useRef<HTMLLIElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const style = priorityStyle[ticket.priority];
  const isActive = status === 'open' || status === 'inProgress';
  const attachments = thread.flatMap((item) => (item.kind === 'message' ? item.attachments.map((file) => ({ file, author: item.author, at: item.at, key: `${item.id}-${file.name}` })) : []));
  const canPost = draft.trim().length > 0 || files.length > 0;

  function appendActivity(item: TicketActivity) {
    setThread((current) => [...current, item]);
    setTab('all');
    requestAnimationFrame(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  function changeStatus(to: TicketStatus) {
    appendActivity({ kind: 'status', id: `s${Date.now()}`, author: copy.you, from: status, to, at: new Date() });
    setStatus(to);
    toast(copy.statusUpdated);
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [], (file) => ({ name: file.name, size: file.size }));
    setFiles((current) => [...current, ...picked.filter((file) => !current.some((existing) => existing.name === file.name))]);
    event.target.value = '';
  }

  function postReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPost) return;
    appendActivity({ kind: 'message', id: `m${Date.now()}`, author: copy.you, body: draft.trim(), at: new Date(), attachments: files });
    setDraft('');
    setFiles([]);
    toast(copy.replyPosted);
  }

  async function copyReference() {
    await navigator.clipboard.writeText(ticket.id);
    toast(copy.copied);
  }

  const tabs: { id: ThreadTab; label: string; count: number; icon: IconName }[] = [
    { id: 'all', label: copy.all, count: thread.length, icon: 'inbox' },
    { id: 'attachments', label: copy.attachments, count: attachments.length, icon: 'fileText' },
  ];
  const tabIndex = tabs.findIndex((item) => item.id === tab);

  // Skeleton: open ticket hero (subject + journey + manage) across the top, then the conversation beside a sticky details rail.
  return (
    <div className="flex flex-col gap-10">
      <section className="zenith-tile relative z-20 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-end">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full" />
              </span>
              <span className={cx(beadClass, 'size-10')}>
                <Icon name={categoryIcon[ticket.category]} size={16} />
              </span>
            </span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold', isActive ? 'bg-fg text-app' : 'text-fg ring-1 ring-line-strong')}>
              {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
              {translate(`tickets.status.${status}`)}
            </span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase', style.chip)}>
              <span aria-hidden="true" className={cx('size-1.5 rounded-[2px]', style.edge)} />
              {translate(`tickets.priority.${ticket.priority}`)}
            </span>
          </div>
          <h2 className="text-4xl leading-tight font-black tracking-tight text-fg sm:text-5xl">{ticket.subject}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name={categoryIcon[ticket.category]} size={13} />
              {departmentLabel[ticket.category]}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Icon name="calendar" size={13} />
              {dateFormat.format(ticket.createdAt)}
            </span>
            <button
              type="button"
              onClick={copyReference}
              aria-label={`${copy.reference} ${ticket.id}`}
              className="group/ref inline-flex items-center gap-1.5 rounded-full bg-fg/[0.04] py-1 pr-1 pl-3 font-mono text-xs font-semibold text-fg ring-1 ring-line-strong transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
            >
              #{ticket.id}
              <span aria-hidden="true" style={{ background: RED }} className="grid size-6 place-items-center rounded-full text-white transition-transform duration-300 group-hover/ref:rotate-12">
                <Icon name="copy" size={11} />
              </span>
            </button>
          </div>
        </div>

        {/* Not overflow-hidden: the Manage ticket menu must escape this block. */}
        <div style={staggerStyle(1, 140)} className="flex min-w-0 flex-col gap-5 border-t border-line pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
          <StatusJourney status={status} />
          <ManageMenu status={status} onChange={changeStatus} />
        </div>
      </section>

      <div className="grid items-start gap-8 border-t border-line pt-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section style={staggerStyle(1, 200)} className="flex min-w-0 animate-rise flex-col overflow-hidden rounded-[30px] ring-1 ring-line motion-reduce:animate-none" aria-label={`${copy.ticket} ${ticket.id}`}>
          <div className="flex flex-wrap items-center gap-4 border-b border-dashed border-line-strong p-4 sm:px-5">
            <div role="tablist" aria-label={copy.ticket} className="relative grid w-full grid-cols-2 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line sm:w-[22rem]">
              <span
                aria-hidden="true"
                style={{ transform: `translateX(${tabIndex * 100}%)` }}
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-fg transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
              />
              {tabs.map((item) => {
                const isSelected = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`ticket-tab-${item.id}`}
                    aria-selected={isSelected}
                    aria-controls="ticket-thread-panel"
                    onClick={() => setTab(item.id)}
                    className={cx(
                      'relative flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                      isSelected ? 'text-app' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    <Icon name={item.icon} size={14} />
                    {item.label}
                    <span
                      style={isSelected ? { background: RED } : undefined}
                      className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[11px] font-bold tabular-nums', isSelected ? 'text-white' : 'bg-fg/10 text-fg-subtle')}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="ml-auto flex items-center gap-2 font-mono text-[11px] text-fg-subtle">
              <RedDot className="size-1.5" />#{ticket.id}
            </p>
          </div>

          <div id="ticket-thread-panel" role="tabpanel" aria-labelledby={`ticket-tab-${tab}`} className="relative isolate max-h-[620px] min-h-80 overflow-y-auto px-5 py-5">
            {tab === 'all' ? (
              <ol className="flex flex-col gap-2">
                {groupThread(thread).map((block) =>
                  block.kind === 'status' ? (
                    <StatusGroup key={block.events[0].item.id} events={block.events} />
                  ) : (
                    <ThreadItem key={block.item.id} item={block.item} isOrigin={block.index === 0} index={block.index} />
                  ),
                )}
                <li ref={threadEndRef} aria-hidden="true" />
              </ol>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <span aria-hidden="true" className="relative grid size-16 place-items-center">
                  <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
                  <span className={cx(beadClass, 'size-10 animate-float motion-reduce:animate-none')}>
                    <Icon name="fileText" size={17} />
                  </span>
                </span>
                <p className="text-sm text-fg-muted">{copy.noAttachments}</p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {attachments.map(({ file, author, at, key }, index) => (
                  <li key={key} style={staggerStyle(index, 80)} className="flex animate-feed-in flex-col gap-2.5 rounded-[24px] bg-fg/[0.03] p-3 ring-1 ring-line motion-reduce:animate-none">
                    <AttachmentChip file={file} />
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-fg-muted">{author}</span>
                      <span aria-hidden="true" className="flex-1 border-t border-dashed border-line-strong" />
                      <span className="font-mono text-fg-subtle tabular-nums">{timestampFormat.format(at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={postReply} className="border-t border-dashed border-line-strong p-4 sm:p-5">
            <div className="flex items-end gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <textarea
                  aria-label={copy.messagePlaceholder}
                  placeholder={copy.messagePlaceholder}
                  value={draft}
                  maxLength={MESSAGE_MAX_LENGTH}
                  rows={3}
                  onChange={(event) => setDraft(event.target.value)}
                  className="block w-full resize-none rounded-[24px] bg-fg/[0.03] px-4 py-3 text-sm text-fg ring-1 ring-line transition-shadow outline-none placeholder:text-fg-subtle hover:ring-line-strong focus:ring-fg/40"
                />

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((file) => (
                      <AttachmentChip key={file.name} file={file} onRemove={() => setFiles((current) => current.filter((existing) => existing.name !== file.name))} />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <input ref={fileInputRef} type="file" multiple onChange={addFiles} className="sr-only" tabIndex={-1} aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group/attach inline-flex items-center gap-2 rounded-full border border-dashed border-line-strong py-1 pr-3.5 pl-1 text-xs font-semibold text-fg-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span aria-hidden="true" className={cx(beadClass, 'size-7 transition-transform duration-300 group-hover/attach:-rotate-12')}>
                      <Icon name="fileText" size={12} />
                    </span>
                    {copy.attachFiles}
                  </button>
                  <span className={cx('ml-auto font-mono text-[11px] tabular-nums', draft.length >= MESSAGE_MAX_LENGTH ? 'text-[var(--zenith-red)]' : 'text-fg-subtle')}>
                    {draft.length} / {MESSAGE_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canPost}
                className="group/post flex shrink-0 flex-col items-center gap-1.5 rounded-full pb-1 text-xs font-semibold text-fg transition-opacity duration-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span aria-hidden="true" className="relative grid size-[4.5rem] place-items-center">
                  <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
                    <circle cx="36" cy="36" r={COMPOSER_RING_RADIUS} fill="none" strokeWidth="2" strokeDasharray="2 4" className="stroke-line-strong" />
                    <circle
                      cx="36"
                      cy="36"
                      r={COMPOSER_RING_RADIUS}
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={COMPOSER_RING_LENGTH}
                      strokeDashoffset={COMPOSER_RING_LENGTH * (1 - draft.length / MESSAGE_MAX_LENGTH)}
                      style={{ stroke: RED }}
                      className="transition-[stroke-dashoffset] duration-300"
                    />
                  </svg>
                  {canPost && <span style={{ borderColor: RED }} className="absolute inset-2 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                  <span className="relative grid size-12 place-items-center rounded-full bg-fg text-app transition-transform duration-300 group-enabled/post:group-hover/post:-translate-y-0.5 group-enabled/post:group-hover/post:rotate-45 motion-reduce:transition-none">
                    <Icon name="arrowUpRight" size={18} />
                  </span>
                </span>
                {copy.postReply}
              </button>
            </div>
          </form>
        </section>

        <aside style={staggerStyle(2, 140)} className="flex min-w-0 animate-rise flex-col gap-3 xl:sticky xl:top-24 motion-reduce:animate-none">
          <h2 className="flex items-center gap-2.5 text-sm font-bold text-fg">
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="ticket" size={14} />
            </span>
            {copy.ticketDetails}
          </h2>
          <dl className="flex flex-col gap-2">
            <DetailCell index={0} icon="ticket" label={copy.reference}>
              <span className="font-mono">{ticket.id}</span>
            </DetailCell>
            <DetailCell index={1} icon="refresh" label={copy.status}>
              <span className="uppercase">{translate(`tickets.status.${status}`)}</span>
            </DetailCell>
            <DetailCell index={2} icon={categoryIcon[ticket.category]} label={copy.department}>
              {departmentLabel[ticket.category]}
            </DetailCell>
            <DetailCell index={3} icon="calendar" label={copy.created}>
              <span className="font-mono">{dateFormat.format(ticket.createdAt)}</span>
            </DetailCell>
            <DetailCell index={4} icon="alert" label={copy.priority}>
              <span className={cx('rounded-full px-2 py-0.5 text-xs font-bold uppercase', style.chip)}>{translate(`tickets.priority.${ticket.priority}`)}</span>
            </DetailCell>
            <DetailCell index={5} icon="user" label={copy.assignee}>
              {copy.assigned}
            </DetailCell>
          </dl>
          {/* Pixel strip: thread size as lit cells (one per activity, capped), newest cell red. */}
          <div aria-hidden="true" className="mt-2 grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, cell) => {
              const litCount = Math.min(thread.length, 24);
              const isLit = cell < litCount;
              const isNewest = cell === litCount - 1;
              return (
                <span
                  key={cell}
                  style={{ animationDelay: `${(cell * 173) % 2400}ms`, ...(isNewest ? { background: RED } : {}) }}
                  className={cx('h-2.5 rounded-[2px]', isNewest ? 'animate-pulse' : isLit ? 'bg-fg' : 'zenith-twinkle bg-fg/15')}
                />
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const ticket = initialTickets.find((item) => item.id === ticketId);

  return (
    <div className="flex flex-col gap-8">
      <header className="zenith-tile flex flex-col gap-4 border-b border-line pb-6">
        <BackLink />
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
            <span className={cx(beadClass, 'size-9')}>
              <Icon name="ticket" size={15} />
            </span>
            <RedDot className="absolute top-0 right-0" />
          </span>
          <h1 className="min-w-0 truncate text-3xl font-black tracking-tight text-fg sm:text-4xl">
            {copy.ticket} <span className="font-mono text-fg-muted">{ticketId}</span>
          </h1>
        </div>
      </header>
      {ticket ? <TicketView ticket={ticket} /> : <TicketNotFound />}
    </div>
  );
}
