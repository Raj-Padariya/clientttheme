'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';
const panelClass = 'orbit-card nova-edge-light relative isolate';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const COMPOSER_RING_RADIUS = 33;
const COMPOSER_RING_LENGTH = 2 * Math.PI * COMPOSER_RING_RADIUS;

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

/** Bead rail: one glossy bead per step on a dotted thread; the thread fills solid up to the current step. */
function StatusJourney({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);

  return (
    <ol className="flex flex-col">
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && (status === 'open' || status === 'inProgress');
        const isLast = index === trackerSteps.length - 1;
        return (
          <li key={step} style={staggerStyle(index, 120)} className="flex animate-feed-in gap-3 motion-reduce:animate-none">
            <span className="flex flex-col items-center">
              <span className="relative grid size-9 place-items-center">
                {isCurrent && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/50 motion-reduce:hidden" />}
                {isCurrent && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'relative grid size-9 place-items-center rounded-full font-mono text-[11px] font-black transition-colors',
                    isDone ? 'bg-fg text-app' : 'border border-dashed border-line-strong text-fg-subtle',
                  )}
                >
                  {isDone && !isCurrent ? <Icon name="checkCircle" size={14} /> : String(index + 1).padStart(2, '0')}
                </span>
              </span>
              {!isLast && (
                <span aria-hidden="true" className="relative my-1 h-7 w-0 border-l border-dotted border-line-strong">
                  <span className={cx('absolute top-0 -left-px w-0.5 rounded-full bg-fg transition-[height] duration-700', index < reached ? 'h-full' : 'h-0')} />
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-2.5">
              <span className={cx('text-xs font-bold tracking-[0.12em] uppercase', isDone ? 'text-fg' : 'text-fg-subtle')}>{translate(`tickets.status.${step}`)}</span>
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
        className="group/manage relative flex h-12 w-full items-center gap-3 overflow-hidden rounded-full bg-fg pr-2 pl-2 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/manage:translate-x-full motion-reduce:hidden" />
        <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-500 group-hover/manage:rotate-90 motion-reduce:transition-none">
          <Icon name="settings" size={15} />
        </span>
        <span className="relative flex-1 text-left">{copy.manageTicket}</span>
        <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-full ring-1 ring-app/20">
          <Icon name="chevronDown" size={15} className={cx('transition-transform duration-300', isOpen && 'rotate-180')} />
        </span>
      </button>
      {isOpen && (
        <ul role="menu" className="absolute inset-x-0 z-30 mt-2 flex animate-feed-in flex-col gap-1 rounded-[22px] border border-line-strong bg-surface p-1.5 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.8)] motion-reduce:animate-none">
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
                <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
                  <Icon name={action.icon} size={14} />
                </span>
                <span className="flex-1">{action.label}</span>
                <Icon name="arrowRight" size={14} className="text-fg-subtle transition-transform duration-200 group-hover/item:translate-x-0.5" />
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
    <span className="inline-flex max-w-full items-center gap-2 rounded-full py-1 pr-2 pl-1 text-xs text-fg-muted ring-1 ring-line-strong">
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

/** Status changes ride a horizontal dotted track: one stop per change, oldest left, newest (rippling) right. */
function StatusGroup({ events }: { events: { item: StatusActivity; index: number }[] }) {
  const latest = events[events.length - 1].item;

  return (
    <li style={staggerStyle(events[0].index, 110)} className="animate-rise py-2 motion-reduce:animate-none">
      <div className="rounded-[26px] bg-fg/[0.025] ring-1 ring-line">
        <p className="flex items-center gap-2.5 px-4 pt-3.5 text-fg-subtle">
          <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
            <Icon name="refresh" size={12} />
          </span>
          <span className="font-mono text-xs font-bold text-fg tabular-nums">{String(events.length).padStart(2, '0')}</span>
          <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
          <StatusChip status={latest.to} isTarget />
        </p>
        <ol className="flex overflow-x-auto px-2 pt-4 pb-4">
          {events.map(({ item, index }, position) => {
            const isLatest = position === events.length - 1;
            return (
              <li key={item.id} style={staggerStyle(index, 110)} className="relative flex min-w-[9rem] flex-1 animate-feed-in flex-col items-center gap-2 px-2 text-center motion-reduce:animate-none">
                {!isLatest && <span aria-hidden="true" className="absolute top-12 left-1/2 w-full border-t border-dotted border-fg/30" />}
                <span className="sr-only">{copy.statusChanged(statusChangeLabel[item.from], statusChangeLabel[item.to])}</span>
                <span aria-hidden="true" className="flex h-6 items-center">
                  <StatusChip status={item.from} isTarget={false} />
                </span>
                <span className="relative grid size-8 place-items-center">
                  {isLatest && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/50 motion-reduce:hidden" />}
                  <span
                    style={{ animationDelay: `${200 + position * 120}ms` }}
                    className={cx('relative grid size-8 animate-dot-pop place-items-center rounded-full text-[9px] font-bold motion-reduce:animate-none', isLatest ? 'bg-fg text-app' : 'nova-gloss text-fg')}
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

/** Chat bubbles: your own replies sit on the right, everyone else's on the left. */
function ThreadItem({ item, isOrigin, index }: { item: MessageActivity; isOrigin: boolean; index: number }) {
  const time = timestampFormat.format(item.at);
  const isMine = item.author === copy.you;

  return (
    <li style={staggerStyle(index, 110)} className={cx('flex animate-rise items-end gap-2.5 py-1 motion-reduce:animate-none', isMine && 'flex-row-reverse')}>
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold', isMine ? 'bg-fg text-app' : 'nova-gloss text-fg')}>{initials(item.author)}</span>
      <div
        className={cx(
          'min-w-0 max-w-[80%] rounded-[22px] px-4 py-3',
          isMine ? 'rounded-br-md bg-fg/[0.08] ring-1 ring-fg/20' : 'rounded-bl-md ring-1 ring-line',
          isOrigin && !isMine && 'ring-0 outline outline-1 outline-dashed outline-line-strong',
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

/** Receipt row: label on the left, dotted leader, value on the right. */
function DetailCell({ icon, label, index, children }: { icon: IconName; label: string; index: number; children: ReactNode }) {
  return (
    <div style={staggerStyle(index, 70)} className="flex min-w-0 animate-feed-in items-center gap-2 py-2.5 motion-reduce:animate-none">
      <dt className={cx(eyebrow, 'flex shrink-0 items-center gap-1.5 text-fg-subtle')}>
        <span className="font-mono text-[9px] text-fg-subtle/70">{String(index + 1).padStart(2, '0')}</span>
        <Icon name={icon} size={12} />
        {label}
      </dt>
      <span aria-hidden="true" className="min-w-4 flex-1 border-t border-dotted border-line-strong" />
      <dd className="min-w-0 truncate text-right text-sm font-semibold text-fg">{children}</dd>
    </div>
  );
}

function TicketNotFound() {
  return (
    <div className={cx(panelClass, 'flex flex-col items-center gap-3 overflow-hidden px-6 py-16 text-center')}>
      <span aria-hidden="true" className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />
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
      <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
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

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-24 xl:order-2">
        <div className="animate-rise motion-reduce:animate-none">
          <FrostCard>
            <div className="flex flex-col gap-4 text-[#0a1220] sm:p-1">
              <div className="flex items-center justify-between gap-3">
                <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
                  <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-[#0a1220]/35 motion-reduce:animate-none" />
                  <span className="grid size-9 place-items-center rounded-full bg-[#0a1220] text-white">
                    <Icon name={categoryIcon[ticket.category]} size={15} />
                  </span>
                </span>
                <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold', frostChipClass)}>
                  {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
                  {translate(`tickets.status.${status}`)}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-4xl leading-tight font-black tracking-[-0.03em]">{ticket.subject}</h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#3b4658]">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name={categoryIcon[ticket.category]} size={13} />
                    {departmentLabel[ticket.category]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Icon name="calendar" size={13} />
                    {dateFormat.format(ticket.createdAt)}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={copyReference}
                  aria-label={`${copy.reference} ${ticket.id}`}
                  className={cx('group/ref inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-3 font-mono text-xs font-semibold transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0', frostChipClass)}
                >
                  #{ticket.id}
                  <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[#0a1220] text-white transition-transform duration-300 group-hover/ref:rotate-12">
                    <Icon name="copy" size={11} />
                  </span>
                </button>
                <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase', style.chip)}>
                  <span aria-hidden="true" className={cx('size-1.5 rounded-full', style.edge)} />
                  {translate(`tickets.priority.${ticket.priority}`)}
                </span>
              </div>
            </div>
          </FrostCard>
        </div>

        {/* Not overflow-hidden: the Manage ticket menu must escape the card; z-20 keeps it above the card below. */}
        <section style={staggerStyle(1, 140)} className={cx(panelClass, 'z-20 flex animate-rise flex-col gap-4 p-5 motion-reduce:animate-none')}>
          <StatusJourney status={status} />
          <ManageMenu status={status} onChange={changeStatus} />
        </section>

        <aside style={staggerStyle(2, 140)} className={cx(panelClass, 'animate-rise overflow-hidden px-5 pt-4 pb-2 motion-reduce:animate-none')}>
          <h2 className="flex items-center gap-2.5 pb-1 text-sm font-bold text-fg">
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="ticket" size={14} />
            </span>
            {copy.ticketDetails}
          </h2>
          <dl className="flex flex-col divide-y divide-dashed divide-line">
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
        </aside>
      </div>

      <section style={staggerStyle(1, 200)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col overflow-hidden xl:order-1 motion-reduce:animate-none')} aria-label={`${copy.ticket} ${ticket.id}`}>
        <div className="flex flex-wrap items-center gap-4 border-b border-dotted border-line-strong p-4 sm:px-5">
          <div role="tablist" aria-label={copy.ticket} className="relative grid w-full grid-cols-2 rounded-full p-1 ring-1 ring-line sm:w-[22rem]">
            <span
              aria-hidden="true"
              style={{ transform: `translateX(${tabIndex * 100}%)` }}
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-fg shadow-[0_10px_22px_-14px_rgb(0_0_0/0.9)] transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
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
                  <span className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[11px] tabular-nums', isSelected ? 'bg-app text-fg' : 'bg-surface-2 text-fg-subtle')}>{item.count}</span>
                </button>
              );
            })}
          </div>
          <p className="ml-auto flex items-center gap-2 font-mono text-[11px] text-fg-subtle">
            <Icon name="ticket" size={12} />#{ticket.id}
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
                <li key={key} style={staggerStyle(index, 80)} className="flex animate-feed-in flex-col gap-2.5 rounded-[22px] border border-dashed border-line-strong p-3 motion-reduce:animate-none">
                  <AttachmentChip file={file} />
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-fg-muted">{author}</span>
                    <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
                    <span className="font-mono text-fg-subtle tabular-nums">{timestampFormat.format(at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={postReply} className="border-t border-dotted border-line-strong p-4 sm:p-5">
          <div className="flex items-end gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <textarea
                aria-label={copy.messagePlaceholder}
                placeholder={copy.messagePlaceholder}
                value={draft}
                maxLength={MESSAGE_MAX_LENGTH}
                rows={3}
                onChange={(event) => setDraft(event.target.value)}
                className="block w-full resize-none rounded-[22px] bg-fg/[0.03] px-4 py-3 text-sm text-fg ring-1 ring-line transition-shadow outline-none placeholder:text-fg-subtle hover:ring-line-strong focus:ring-fg/40"
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
                <span className={cx('ml-auto font-mono text-[11px] tabular-nums', draft.length >= MESSAGE_MAX_LENGTH ? 'text-danger' : 'text-fg-subtle')}>
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
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={COMPOSER_RING_LENGTH}
                    strokeDashoffset={COMPOSER_RING_LENGTH * (1 - draft.length / MESSAGE_MAX_LENGTH)}
                    className={cx('transition-[stroke-dashoffset] duration-300', draft.length >= MESSAGE_MAX_LENGTH ? 'stroke-danger' : 'stroke-fg')}
                  />
                </svg>
                {canPost && <span className="absolute inset-2 animate-ring-ripple rounded-full border border-fg/40 motion-reduce:hidden" />}
                <span className="relative grid size-12 place-items-center rounded-full bg-fg text-app shadow-[0_12px_24px_-12px_rgb(0_0_0/0.9)] transition-transform duration-300 group-enabled/post:group-hover/post:-translate-y-0.5 group-enabled/post:group-hover/post:rotate-45 motion-reduce:transition-none">
                  <Icon name="arrowUpRight" size={18} />
                </span>
              </span>
              {copy.postReply}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const ticket = initialTickets.find((item) => item.id === ticketId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex animate-rise flex-wrap items-center justify-between gap-4 motion-reduce:animate-none">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
            <span className={cx(beadClass, 'size-9')}>
              <Icon name="ticket" size={15} />
            </span>
          </span>
          <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            {copy.ticket} <span className="font-mono text-fg-muted">{ticketId}</span>
          </h1>
        </div>
        <BackLink />
      </header>
      {ticket ? <TicketView ticket={ticket} /> : <TicketNotFound />}
    </div>
  );
}
