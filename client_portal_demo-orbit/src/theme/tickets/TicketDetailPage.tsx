'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
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

/** Vertical stepper: square nodes joined by segments that light up as the ticket moves along. */
function StatusJourney({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);

  return (
    <ol className="flex flex-col">
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && (status === 'open' || status === 'inProgress');
        const isLast = index === trackerSteps.length - 1;
        return (
          <li key={step} style={staggerStyle(index, 120)} className="flex animate-rise gap-3 motion-reduce:animate-none">
            <span className="flex flex-col items-center">
              <span className="relative grid size-8 place-items-center">
                {isCurrent && <span className="absolute inset-0 animate-ping-soft rounded-lg bg-primary/35 motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'relative grid size-8 place-items-center rounded-lg border text-[11px] font-bold transition-colors',
                    isDone ? 'border-primary/50 bg-primary/20 text-primary' : 'border-dashed border-line-strong text-fg-subtle',
                  )}
                >
                  {isDone && !isCurrent ? <Icon name="checkCircle" size={14} /> : index + 1}
                </span>
              </span>
              {!isLast && <span className={cx('my-1 h-6 w-0.5 rounded-full', index < reached ? 'bg-primary/70' : 'bg-line')} />}
            </span>
            <span className={cx('pt-1.5 text-xs font-semibold tracking-wide uppercase', isDone ? 'text-fg' : 'text-fg-subtle')}>{translate(`tickets.status.${step}`)}</span>
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
      <Button fullWidth aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <Icon name="settings" size={16} />
        {copy.manageTicket}
        <Icon name="chevronDown" size={16} className={cx('transition-transform duration-200', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <ul role="menu" className="absolute inset-x-0 z-30 mt-2 animate-rise overflow-hidden rounded-xl border border-line-strong bg-elevated p-1.5 shadow-pop motion-reduce:animate-none">
          {statusActions(status).map((action) => (
            <li key={action.to} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onChange(action.to);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-fg transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
              >
                <span className="grid size-7 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Icon name={action.icon} size={14} />
                </span>
                {action.label}
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
    <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-fg/[0.03] py-1.5 pr-2 pl-1.5 text-xs text-fg-muted">
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
        <Icon name="fileText" size={13} />
      </span>
      <span className="truncate text-fg">{file.name}</span>
      <span className="shrink-0 tabular-nums">{formatFileSize(file.size)}</span>
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
    <span className={cx('rounded-md border px-1.5 py-0.5 text-[11px] font-semibold', isTarget ? 'border-primary/35 bg-primary/15 text-primary' : 'border-line text-fg-muted')}>
      {statusChangeLabel[status]}
    </span>
  );
}

function StatusGroup({ events }: { events: { item: StatusActivity; index: number }[] }) {
  return (
    <li style={staggerStyle(events[0].index, 110)} className="animate-rise py-1 motion-reduce:animate-none">
      <ol className="relative rounded-2xl border border-line bg-surface/70 p-1.5 backdrop-blur-sm">
        {events.length > 1 && <span aria-hidden="true" className="absolute top-6 bottom-6 left-[1.75rem] w-px -translate-x-1/2 bg-linear-to-b from-primary/50 via-line-strong to-primary/50" />}
        {events.map(({ item, index }) => (
          <li key={item.id} style={staggerStyle(index, 90)} className="relative grid animate-rise grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-fg/[0.03] motion-reduce:animate-none">
            <span className="relative grid size-6 place-items-center rounded-lg border border-primary/40 bg-surface text-[9px] font-bold text-primary">{initials(item.author)}</span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span className="font-semibold text-fg">{item.author}</span>
              <span className="sr-only">{copy.statusChanged(statusChangeLabel[item.from], statusChangeLabel[item.to])}</span>
              <span aria-hidden="true" className="flex items-center gap-1.5">
                <Icon name="refresh" size={12} className="text-primary" />
                <StatusChip status={item.from} isTarget={false} />
                <span className="text-fg-subtle">{'\u2192'}</span>
                <StatusChip status={item.to} isTarget />
              </span>
              <time dateTime={item.at.toISOString()} className="ml-auto text-[11px] whitespace-nowrap text-fg-subtle tabular-nums">
                {timestampFormat.format(item.at)}
              </time>
            </span>
          </li>
        ))}
      </ol>
    </li>
  );
}

/** Chat bubbles: your own replies sit on the right, everyone else's on the left. */
function ThreadItem({ item, isOrigin, index }: { item: MessageActivity; isOrigin: boolean; index: number }) {
  const time = timestampFormat.format(item.at);
  const isMine = item.author === copy.you;

  return (
    <li style={staggerStyle(index, 110)} className={cx('flex animate-rise items-end gap-2.5 py-1 motion-reduce:animate-none', isMine && 'flex-row-reverse')}>
      <span
        className={cx(
          'grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-semibold',
          isMine ? 'border border-primary/45 bg-primary/25 text-primary' : 'border border-line-strong bg-surface-2 text-fg',
        )}
      >
        {initials(item.author)}
      </span>
      <div
        className={cx(
          'min-w-0 max-w-[80%] rounded-2xl border px-4 py-3',
          isMine ? 'rounded-br-md border-primary/35 bg-primary/12' : 'rounded-bl-md border-line bg-fg/[0.03]',
          isOrigin && !isMine && 'border-primary/30 bg-primary/[0.07]',
        )}
      >
        <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1', isMine && 'flex-row-reverse')}>
          <span className="text-sm font-semibold text-fg">{item.author}</span>
          <time dateTime={item.at.toISOString()} className="text-[11px] text-fg-subtle tabular-nums">
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

function DetailCell({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-surface p-3.5">
      <dt className={cx(eyebrow, 'flex items-center gap-1.5 text-fg-subtle')}>
        <Icon name={icon} size={12} className="text-primary" />
        {label}
      </dt>
      <dd className="truncate text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

function TicketNotFound() {
  return (
    <div className="orbit-card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-14 animate-float place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
        <Icon name="ticket" size={24} />
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
      className="group inline-flex items-center gap-2 self-start rounded-xl border border-line bg-fg/[0.03] px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon name="arrowRight" size={15} className="rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5" />
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

  const tabs: { id: ThreadTab; label: string; count: number }[] = [
    { id: 'all', label: copy.all, count: thread.length },
    { id: 'attachments', label: copy.attachments, count: attachments.length },
  ];
  const tabIndex = tabs.findIndex((item) => item.id === tab);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        {/* Not overflow-hidden: the Manage ticket menu must escape the card; z-20 keeps it above the card below. */}
        <section className="orbit-card relative z-20 animate-rise motion-reduce:animate-none">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <span className="absolute -top-24 -right-16 size-64 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
            <span className="absolute inset-0 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" />
          </div>
          <span aria-hidden="true" className={cx('absolute top-0 left-6 h-1 w-12 rounded-b-full', style.edge)} />

          <div className="relative flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl border border-primary/35 bg-primary/12 text-primary">
                <Icon name={categoryIcon[ticket.category]} size={20} />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
                {translate(`tickets.status.${status}`)}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-3xl font-semibold tracking-tight text-fg">{ticket.subject}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name={categoryIcon[ticket.category]} size={13} />
                  {departmentLabel[ticket.category]}
                </span>
                <span className="inline-flex items-center gap-1.5">
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
                className="group inline-flex items-center gap-1.5 rounded-lg border border-line bg-fg/[0.03] px-2 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-primary/40 hover:text-primary"
              >
                #{ticket.id}
                <Icon name="copy" size={12} className="opacity-60 group-hover:opacity-100" />
              </button>
              <span className={cx('rounded-lg px-2 py-1 text-[11px] font-semibold tracking-wide uppercase', style.chip)}>{translate(`tickets.priority.${ticket.priority}`)}</span>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-5 border-t border-dashed border-line-strong">
            <span className="absolute top-0 -left-[1.875rem] size-5 -translate-y-1/2 rounded-full border border-line bg-app" />
            <span className="absolute top-0 -right-[1.875rem] size-5 -translate-y-1/2 rounded-full border border-line bg-app" />
          </div>

          <div className="relative flex flex-col gap-5 p-5">
            <StatusJourney status={status} />
            <ManageMenu status={status} onChange={changeStatus} />
          </div>
        </section>

        <aside style={staggerStyle(1, 160)} className="orbit-card animate-rise overflow-hidden motion-reduce:animate-none">
          <h2 className="flex items-center gap-2.5 px-5 pt-4 pb-3 text-sm font-semibold text-fg">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/12 text-primary">
              <Icon name="ticket" size={14} />
            </span>
            {copy.ticketDetails}
          </h2>
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line">
            <DetailCell icon="ticket" label={copy.reference}>
              <span className="font-mono">{ticket.id}</span>
            </DetailCell>
            <DetailCell icon="refresh" label={copy.status}>
              <span className="uppercase">{translate(`tickets.status.${status}`)}</span>
            </DetailCell>
            <DetailCell icon={categoryIcon[ticket.category]} label={copy.department}>
              {departmentLabel[ticket.category]}
            </DetailCell>
            <DetailCell icon="calendar" label={copy.created}>
              <span className="italic">{dateFormat.format(ticket.createdAt)}</span>
            </DetailCell>
            <DetailCell icon="alert" label={copy.priority}>
              <span className={cx('rounded-md px-2 py-0.5 text-xs font-semibold uppercase', style.chip)}>{translate(`tickets.priority.${ticket.priority}`)}</span>
            </DetailCell>
            <DetailCell icon="user" label={copy.assignee}>
              {copy.assigned}
            </DetailCell>
          </dl>
        </aside>
      </div>

      <section style={staggerStyle(1, 200)} className="orbit-card relative flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none" aria-label={`${copy.ticket} ${ticket.id}`}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
        <div className="flex flex-wrap items-center gap-4 px-5 pt-4">
          <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Icon name="inbox" size={16} />
          </span>
          <div role="tablist" aria-label={copy.ticket} className="relative grid grid-cols-2 border-b border-line">
            <span
              aria-hidden="true"
              style={{ transform: `translateX(${tabIndex * 100}%)` }}
              className="absolute -bottom-px left-0 h-0.5 w-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-transform duration-300 motion-reduce:transition-none"
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
                    'flex items-center justify-center gap-2 px-4 pt-1 pb-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    isSelected ? 'text-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {item.label}
                  <span className={cx('rounded-md px-1.5 font-mono text-[11px] tabular-nums', isSelected ? 'bg-primary/20 text-primary' : 'bg-surface-2 text-fg-subtle')}>{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="ticket-thread-panel"
          role="tabpanel"
          aria-labelledby={`ticket-tab-${tab}`}
          className="relative isolate max-h-[620px] min-h-80 overflow-y-auto px-5 py-5"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:20px_20px] opacity-60" />
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
              <span className="grid size-12 animate-float place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
                <Icon name="fileText" size={20} />
              </span>
              <p className="text-sm text-fg-muted">{copy.noAttachments}</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {attachments.map(({ file, author, at, key }) => (
                <li key={key} className="flex flex-col gap-2 rounded-2xl border border-line bg-fg/[0.03] p-3">
                  <AttachmentChip file={file} />
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-fg-muted">{author}</span>
                    <span className="text-fg-subtle tabular-nums">{timestampFormat.format(at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={postReply} className="border-t border-line p-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-fg/[0.03] p-2 transition-colors focus-within:border-primary/50">
            <textarea
              aria-label={copy.messagePlaceholder}
              placeholder={copy.messagePlaceholder}
              value={draft}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              className="block w-full resize-none rounded-xl bg-transparent px-2.5 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {files.map((file) => (
                  <AttachmentChip key={file.name} file={file} onRemove={() => setFiles((current) => current.filter((existing) => existing.name !== file.name))} />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2">
              <input ref={fileInputRef} type="file" multiple onChange={addFiles} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon name="fileText" size={15} />
                {copy.attachFiles}
              </button>
              <span className={cx('ml-auto text-[11px] tabular-nums', draft.length >= MESSAGE_MAX_LENGTH ? 'text-danger' : 'text-fg-subtle')}>
                {draft.length} / {MESSAGE_MAX_LENGTH}
              </span>
              <Button type="submit" disabled={!canPost}>
                <Icon name="arrowUpRight" size={16} />
                {copy.postReply}
              </Button>
            </div>
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
      <PageHeader title={`${copy.ticket} ${ticketId}`} />
      <BackLink />
      {ticket ? <TicketView ticket={ticket} /> : <TicketNotFound />}
    </div>
  );
}
