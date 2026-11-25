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

function StatusJourney({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);
  const fill = (reached / (trackerSteps.length - 1)) * 100;

  return (
    <div className="relative pt-1">
      <div className="absolute top-[13px] right-4 left-4 h-1 overflow-hidden rounded-full bg-line">
        <span style={{ width: `${fill}%` }} className="block h-full origin-left animate-grow rounded-full bg-primary transition-[width] duration-700 motion-reduce:animate-none" />
      </div>
      <ol className="relative flex justify-between">
        {trackerSteps.map((step, index) => {
          const isDone = index <= reached;
          const isCurrent = index === reached && (status === 'open' || status === 'inProgress');
          return (
            <li key={step} className="flex flex-col items-center gap-2">
              <span className="relative grid size-7 place-items-center">
                {isCurrent && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'relative grid size-7 place-items-center rounded-full text-[11px] font-bold ring-4 ring-surface transition-colors',
                    isDone ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-subtle',
                  )}
                >
                  {isDone && !isCurrent ? <Icon name="checkCircle" size={14} /> : index + 1}
                </span>
              </span>
              <span className={cx('text-[11px] font-medium tracking-wide uppercase', isDone ? 'text-fg' : 'text-fg-subtle')}>{translate(`tickets.status.${step}`)}</span>
            </li>
          );
        })}
      </ol>
    </div>
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
      <Button aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="w-full sm:w-auto">
        <Icon name="settings" size={16} />
        {copy.manageTicket}
        <Icon name="chevronDown" size={16} className={cx('transition-transform duration-200', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <ul role="menu" className="absolute right-0 z-20 mt-2 w-56 animate-rise overflow-hidden rounded-xl bg-elevated p-1.5 shadow-pop ring-1 ring-line-strong motion-reduce:animate-none">
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
                <Icon name={action.icon} size={15} className="text-primary" />
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
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-surface-2 py-1.5 pr-2 pl-2.5 text-xs text-fg-muted ring-1 ring-line">
      <Icon name="fileText" size={14} className="shrink-0 text-primary" />
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

function ThreadItem({ item, isOrigin, index }: { item: TicketActivity; isOrigin: boolean; index: number }) {
  const time = timestampFormat.format(item.at);

  if (item.kind === 'status') {
    return (
      <li style={staggerStyle(index, 120)} className="relative flex animate-rise items-start gap-3 py-2 pl-1 motion-reduce:animate-none">
        <span className="relative z-[1] mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-semibold text-fg-muted ring-1 ring-line">{initials(item.author)}</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2">
          <span className="text-sm font-semibold text-fg">{item.author}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
            <Icon name="refresh" size={13} className="text-primary" />
            {copy.statusChanged(statusChangeLabel[item.from], statusChangeLabel[item.to])}
          </span>
          <time dateTime={item.at.toISOString()} className="ml-auto text-xs text-fg-subtle tabular-nums">
            {time}
          </time>
        </div>
      </li>
    );
  }

  return (
    <li style={staggerStyle(index, 120)} className="relative flex animate-rise items-start gap-3 py-2 pl-1 motion-reduce:animate-none">
      <span className="relative z-[1] mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]">
        {initials(item.author)}
      </span>
      <div className={cx('min-w-0 flex-1 rounded-xl rounded-tl-sm px-4 py-3 ring-1', isOrigin ? 'glow-border bg-primary-soft ring-primary/30' : 'bg-surface-2 ring-line')}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-fg">{item.author}</span>
          <time dateTime={item.at.toISOString()} className="ml-auto text-xs text-fg-subtle tabular-nums">
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

function DetailRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-muted">
        <Icon name={icon} size={15} />
      </span>
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="ml-auto text-right text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

function TicketNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-16 text-center shadow-card">
      <span className="grid size-14 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
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
      className="group inline-flex items-center gap-2 self-start rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
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

  return (
    <>
      {/* Not overflow-hidden: the Manage ticket menu must escape the card; z-20 keeps it above the sections below. */}
      <section className="kpi-card relative z-20 animate-rise rounded-xl motion-reduce:animate-none">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div className="kpi-texture absolute inset-0" />
          <span className={cx('absolute inset-y-0 left-0 w-1.5 origin-top animate-[grow-y_0.8s_ease-out_both]', style.edge)} />
          <div className="absolute -top-24 -right-10 size-72 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
        </div>

        <div className="relative grid gap-6 p-5 pl-7 sm:p-6 sm:pl-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyReference}
                aria-label={`${copy.reference} ${ticket.id}`}
                className="group inline-flex items-center gap-1.5 rounded-md bg-surface/70 px-2 py-1 font-mono text-xs text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40"
              >
                #{ticket.id}
                <Icon name="copy" size={12} className="opacity-60 group-hover:opacity-100" />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
                {translate(`tickets.status.${status}`)}
              </span>
              <span className={cx('rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide uppercase', style.chip)}>{translate(`tickets.priority.${ticket.priority}`)}</span>
            </div>
            <h2 className="truncate text-3xl font-semibold tracking-tight text-fg">{ticket.subject}</h2>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icon name={categoryIcon[ticket.category]} size={14} />
                {departmentLabel[ticket.category]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={14} />
                {dateFormat.format(ticket.createdAt)}
              </span>
            </p>
          </div>

          <div className="glass flex flex-col gap-4 rounded-lg p-4">
            <StatusJourney status={status} />
            <ManageMenu status={status} onChange={changeStatus} />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section style={staggerStyle(1, 200)} className="flex min-w-0 animate-rise flex-col rounded-xl border border-line bg-surface shadow-card motion-reduce:animate-none" aria-label={`${copy.ticket} ${ticket.id}`}>
          <div role="tablist" aria-label={copy.ticket} className="flex gap-1 border-b border-line px-4 pt-3">
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
                    'relative flex items-center gap-2 px-3 pt-1 pb-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    isSelected ? 'text-primary' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {item.label}
                  <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', isSelected ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-subtle')}>{item.count}</span>
                  {isSelected && <span className="absolute inset-x-2 -bottom-px h-0.5 origin-left animate-grow rounded-full bg-primary motion-reduce:animate-none" />}
                </button>
              );
            })}
          </div>

          <div id="ticket-thread-panel" role="tabpanel" aria-labelledby={`ticket-tab-${tab}`} className="max-h-[560px] overflow-y-auto px-4 py-4">
            {tab === 'all' ? (
              <ol className="relative flex flex-col before:absolute before:top-4 before:bottom-4 before:left-[20px] before:w-px before:bg-line">
                {thread.map((item, index) => (
                  <ThreadItem key={item.id} item={item} isOrigin={index === 0} index={index} />
                ))}
                <li ref={threadEndRef} aria-hidden="true" />
              </ol>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid size-12 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
                  <Icon name="fileText" size={20} />
                </span>
                <p className="text-sm text-fg-muted">{copy.noAttachments}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {attachments.map(({ file, author, at, key }) => (
                  <li key={key} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5 ring-1 ring-line">
                    <AttachmentChip file={file} />
                    <span className="text-xs text-fg-muted">{author}</span>
                    <span className="ml-auto text-xs text-fg-subtle tabular-nums">{timestampFormat.format(at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={postReply} className="flex flex-col gap-3 border-t border-line bg-surface-2/50 p-4">
            <div className="relative">
              <textarea
                aria-label={copy.messagePlaceholder}
                placeholder={copy.messagePlaceholder}
                value={draft}
                maxLength={MESSAGE_MAX_LENGTH}
                rows={3}
                onChange={(event) => setDraft(event.target.value)}
                className="block w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-3 pb-7 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className={cx('pointer-events-none absolute right-3 bottom-2 text-[11px] tabular-nums', draft.length >= MESSAGE_MAX_LENGTH ? 'text-danger' : 'text-fg-subtle')}>
                {draft.length} / {MESSAGE_MAX_LENGTH}
              </span>
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <AttachmentChip key={file.name} file={file} onRemove={() => setFiles((current) => current.filter((existing) => existing.name !== file.name))} />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <input ref={fileInputRef} type="file" multiple onChange={addFiles} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon name="fileText" size={15} />
                {copy.attachFiles}
              </button>
              <Button type="submit" disabled={!canPost}>
                <Icon name="arrowUpRight" size={16} />
                {copy.postReply}
              </Button>
            </div>
          </form>
        </section>

        <aside style={staggerStyle(2, 200)} className="animate-rise rounded-xl border border-line bg-surface shadow-card motion-reduce:animate-none lg:sticky lg:top-4">
          <h2 className="border-b border-line px-5 py-4 text-sm font-semibold text-fg">{copy.ticketDetails}</h2>
          <dl className="divide-y divide-line px-5">
            <DetailRow icon="ticket" label={copy.reference}>
              <span className="font-mono">{ticket.id}</span>
            </DetailRow>
            <DetailRow icon="refresh" label={copy.status}>
              <span className="uppercase">{translate(`tickets.status.${status}`)}</span>
            </DetailRow>
            <DetailRow icon={categoryIcon[ticket.category]} label={copy.department}>
              {departmentLabel[ticket.category]}
            </DetailRow>
            <DetailRow icon="calendar" label={copy.created}>
              <span className="italic">{dateFormat.format(ticket.createdAt)}</span>
            </DetailRow>
            <DetailRow icon="alert" label={copy.priority}>
              <span className={cx('rounded-md px-2 py-0.5 text-xs font-semibold uppercase', style.chip)}>{translate(`tickets.priority.${ticket.priority}`)}</span>
            </DetailRow>
            <DetailRow icon="user" label={copy.assignee}>
              {copy.assigned}
            </DetailRow>
          </dl>
        </aside>
      </div>
    </>
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
