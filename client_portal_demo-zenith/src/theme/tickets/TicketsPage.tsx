'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  MESSAGE_MAX_LENGTH,
  categoryIcon,
  createTicketCopy,
  dateFormat,
  departmentLabel,
  formatFileSize,
  initialTickets,
  initials,
  priorities,
  priorityStyle,
  statuses,
  trackerSteps,
  type Ticket,
  type TicketAttachment,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from './ticketsData';

type CategoryFilter = 'all' | TicketCategory;

const CREATE_FORM_ID = 'create-ticket-form';
const TICKET_ID_LENGTH = 8;
const SHARE_DOTS = 10;

const categories: { key: CategoryFilter; icon: IconName; labelKey: MessageKey }[] = [
  { key: 'all', icon: 'ticket', labelKey: 'tickets.category.all' },
  { key: 'sales', icon: 'card', labelKey: 'tickets.category.sales' },
  { key: 'account', icon: 'user', labelKey: 'tickets.category.account' },
  { key: 'support', icon: 'inbox', labelKey: 'tickets.category.support' },
];

const RED = 'var(--zenith-red)';
const COUNTER_CELLS = 12;
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';

function createTicketId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: TICKET_ID_LENGTH }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/** Square pixel per step joined by capsule tracks that fill up to the ticket's current step; the live step is red. */
function StatusTracker({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);

  return (
    <ol className="flex items-start" aria-label={translate(`tickets.status.${status}`)}>
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && status !== 'resolved' && status !== 'closed';
        const isLast = index === trackerSteps.length - 1;
        return (
          <li key={step} className={cx('flex min-w-0 flex-col gap-1.5', !isLast && 'flex-1')}>
            <span className="flex items-center">
              <span className="relative grid size-6 shrink-0 place-items-center">
                {isCurrent && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-0.5 animate-ring-ripple rounded-[8px] border-2 motion-reduce:hidden" />}
                <span
                  style={{ animationDelay: `${200 + index * 140}ms`, ...(isCurrent ? { background: RED } : {}) }}
                  className={cx(
                    'relative grid size-6 animate-dot-pop place-items-center rounded-[7px] motion-reduce:animate-none',
                    isCurrent ? 'text-white' : isDone ? 'bg-fg text-app' : 'border border-dashed border-line-strong text-fg-subtle',
                  )}
                >
                  {isDone && !isCurrent ? <Icon name="check" size={11} /> : <span className={cx('size-1.5 rounded-[2px]', isCurrent ? 'bg-white' : 'bg-line-strong')} />}
                </span>
              </span>
              {!isLast && (
                <span aria-hidden="true" className="relative mx-1.5 h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10">
                  <span
                    style={{ transitionDelay: `${300 + index * 160}ms` }}
                    className={cx('absolute inset-y-0 left-0 rounded-full bg-fg transition-[width] duration-700 motion-reduce:transition-none', index < reached ? 'w-full' : 'w-0')}
                  />
                </span>
              )}
            </span>
            <span className={cx('truncate text-[10px] font-semibold tracking-[0.12em] uppercase', isCurrent ? 'text-[var(--zenith-red)]' : isDone ? 'text-fg' : 'text-fg-subtle')}>
              {translate(`tickets.status.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  const style = priorityStyle[ticket.priority];
  const assigneeName = ticket.assignee ?? translate('tickets.unassigned');
  const isActive = ticket.status === 'inProgress' || ticket.status === 'open';

  return (
    <article
      style={staggerStyle(index, 160)}
      className="group relative isolate flex min-w-0 animate-rise flex-col gap-4 rounded-[28px] bg-fg/[0.03] p-5 ring-1 ring-line transition-[translate,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <Link
        href={`/tickets/${ticket.id}`}
        aria-label={`${ticket.subject} #${ticket.id}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong transition-colors group-hover:border-fg/50 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-8')}>
            <Icon name={categoryIcon[ticket.category]} size={14} />
          </span>
          {isActive && <RedDot className="absolute top-0.5 right-0.5" />}
        </span>
        <p className="min-w-0 flex-1 truncate">
          <span className="text-xs font-bold text-fg">{translate(`tickets.category.${ticket.category}`)}</span>
          <span className="ml-2 font-mono text-[11px] text-fg-subtle">#{ticket.id}</span>
        </p>
        <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', isActive ? 'bg-fg text-app' : 'text-fg ring-1 ring-line-strong')}>
          {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
          {translate(`tickets.status.${ticket.status}`)}
        </span>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-2xl font-black tracking-tight text-fg">{ticket.subject}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{ticket.message}</p>
      </div>

      <div className="rounded-[20px] bg-fg/[0.03] p-3 ring-1 ring-line">
        <StatusTracker status={ticket.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold tracking-wide uppercase', style.chip)}>
          <span aria-hidden="true" className={cx('size-1.5 rounded-[2px]', style.edge)} />
          {translate(`tickets.priority.${ticket.priority}`)}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-fg-subtle">
          <Icon name="calendar" size={13} />
          {dateFormat.format(ticket.createdAt)}
        </span>
        <span className="inline-flex items-center gap-2 text-fg-muted">
          <span className={cx(beadClass, 'size-6 text-[10px] font-bold')}>{initials(assigneeName)}</span>
          {assigneeName}
        </span>
        <span
          aria-hidden="true"
          style={{ background: RED }}
          className="ml-auto grid size-9 place-items-center rounded-full text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:-rotate-12 motion-reduce:transition-none"
        >
          <Icon name="arrowRight" size={15} />
        </span>
      </div>
    </article>
  );
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-danger">*</span>
    </>
  );
}

function isAllowedAttachment(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return file.type.startsWith('image/') || ATTACHMENT_EXTENSIONS.includes(extension);
}

function CreateTicketModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (ticket: Ticket) => void }) {
  const [department, setDepartment] = useState<TicketCategory | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<TicketAttachment[]>([]);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(picked: File[]) {
    const accepted = picked.filter((file) => isAllowedAttachment(file) && file.size <= ATTACHMENT_MAX_BYTES);
    setFileError(accepted.length < picked.length ? createTicketCopy.attachmentRejected : '');
    setFiles((current) => [
      ...current,
      ...accepted.filter((file) => !current.some((existing) => existing.name === file.name)).map((file) => ({ name: file.name, size: file.size })),
    ]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const pasted = Array.from(event.clipboardData.files);
    if (pasted.length === 0) return;
    event.preventDefault();
    addFiles(pasted);
  }

  function close() {
    setDepartment('');
    setPriority('');
    setSubject('');
    setDescription('');
    setFiles([]);
    setFileError('');
    setShowErrors(false);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!department || !priority || !subject.trim() || !description.trim()) {
      setShowErrors(true);
      return;
    }
    onCreate({
      id: createTicketId(),
      subject: subject.trim(),
      message: description.trim(),
      category: department,
      priority,
      status: 'open',
      createdAt: new Date(),
      assignee: null,
    });
    toast(createTicketCopy.created);
    close();
  }

  const requiredError = (isMissing: boolean) => (showErrors && isMissing ? createTicketCopy.required : undefined);
  const departmentOptions = [
    { value: '' as const, label: createTicketCopy.selectDepartment },
    ...(Object.keys(departmentLabel) as TicketCategory[]).map((option) => ({ value: option, label: departmentLabel[option], icon: categoryIcon[option] })),
  ];
  const priorityOptions = [
    { value: '' as const, label: createTicketCopy.selectPriority },
    ...priorities.map((option) => ({ value: option, label: translate(`tickets.priority.${option}`), dotClassName: priorityStyle[option].edge })),
  ];

  return (
    <Modal
      open={open}
      onClose={close}
      calm
      size="lg"
      title={createTicketCopy.title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} className="rounded-full!">
            {createTicketCopy.cancel}
          </Button>
          <Button type="submit" form={CREATE_FORM_ID} leftIcon="plus" className="rounded-full!">
            {createTicketCopy.submit}
          </Button>
        </>
      }
    >
      <form id={CREATE_FORM_ID} noValidate onSubmit={handleSubmit} onPaste={handlePaste} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="ticket-department" label={<RequiredLabel>{createTicketCopy.department}</RequiredLabel>} error={requiredError(!department)}>
            <Dropdown id="ticket-department" label={createTicketCopy.department} value={department} options={departmentOptions} onChange={setDepartment} icon="ticket" />
          </Field>
          <Field htmlFor="ticket-priority" label={<RequiredLabel>{createTicketCopy.priority}</RequiredLabel>} error={requiredError(!priority)}>
            <Dropdown id="ticket-priority" label={createTicketCopy.priority} value={priority} options={priorityOptions} onChange={setPriority} icon="alert" />
          </Field>
        </div>

        <Field htmlFor="ticket-subject" label={<RequiredLabel>{createTicketCopy.subject}</RequiredLabel>} error={requiredError(!subject.trim())}>
          <Input id="ticket-subject" placeholder={createTicketCopy.subjectPlaceholder} value={subject} onChange={(event) => setSubject(event.target.value)} />
        </Field>

        <Field htmlFor="ticket-description" label={<RequiredLabel>{createTicketCopy.description}</RequiredLabel>} error={requiredError(!description.trim())}>
          <div className="relative">
            <textarea
              id="ticket-description"
              rows={5}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder={createTicketCopy.descriptionPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="block w-full resize-y rounded-[18px] border border-line-strong bg-surface px-4 py-3 pb-8 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-fg-subtle focus:border-fg/60"
            />
            <span className="pointer-events-none absolute right-3 bottom-2.5 flex items-center gap-2">
              <span aria-hidden="true" className="flex gap-0.5">
                {Array.from({ length: COUNTER_CELLS }, (_, cell) => {
                  const isFull = description.length >= MESSAGE_MAX_LENGTH;
                  const isLit = cell < Math.ceil((description.length / MESSAGE_MAX_LENGTH) * COUNTER_CELLS);
                  return (
                    <span
                      key={cell}
                      style={isLit && isFull ? { background: RED } : undefined}
                      className={cx('h-2.5 w-1 rounded-[1px] transition-colors duration-200', isLit ? 'bg-fg' : 'bg-fg/15')}
                    />
                  );
                })}
              </span>
              <span className={cx('font-mono text-[11px] tabular-nums', description.length >= MESSAGE_MAX_LENGTH ? 'text-danger' : 'text-fg-subtle')}>
                {description.length} / {MESSAGE_MAX_LENGTH}
              </span>
            </span>
          </div>
        </Field>

        <Field htmlFor="ticket-attachment" label={createTicketCopy.attachment} hint={createTicketCopy.supportedFormats} error={fileError || undefined}>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cx(
              'relative flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed px-4 py-6 text-center transition-[border-color,background-color,scale] duration-200',
              isDragging ? 'scale-[1.01] border-fg/60 bg-fg/[0.05]' : 'border-line-strong hover:border-fg/40',
            )}
          >
            <span aria-hidden="true" className="relative grid size-14 place-items-center">
              <span className={cx('absolute inset-0 rounded-full border border-dashed border-fg/35', isDragging ? 'animate-rim-spin motion-reduce:animate-none' : '')} />
              {isDragging && <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
              <span className={cx(beadClass, 'size-10', isDragging && 'animate-float motion-reduce:animate-none')}>
                <Icon name="fileText" size={17} />
              </span>
            </span>
            <input
              ref={fileInputRef}
              id="ticket-attachment"
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
              className="sr-only"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full!">
              {createTicketCopy.browseFiles}
            </Button>
            <p className="text-sm text-fg-muted">{createTicketCopy.dropHint}</p>
          </div>
        </Field>

        {files.length > 0 && (
          <ul className="-mt-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <li
                key={file.name}
                style={staggerStyle(index, 60)}
                className="inline-flex max-w-full animate-feed-in items-center gap-2 rounded-full py-1 pr-1 pl-1 text-xs text-fg-muted ring-1 ring-line-strong motion-reduce:animate-none"
              >
                <span aria-hidden="true" className={cx(beadClass, 'size-6')}>
                  <Icon name="fileText" size={11} />
                </span>
                <span className="truncate text-fg">{file.name}</span>
                <span className="shrink-0 font-mono tabular-nums">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((current) => current.filter((existing) => existing.name !== file.name))}
                  className="grid size-6 shrink-0 place-items-center rounded-full transition-colors hover:bg-hover hover:text-danger"
                >
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
    </Modal>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const categoryCount = (key: CategoryFilter) => (key === 'all' ? tickets.length : tickets.filter((ticket) => ticket.category === key).length);

  const visibleTickets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter(
      (ticket) =>
        (categoryFilter === 'all' || ticket.category === categoryFilter) &&
        (statusFilter === 'all' || ticket.status === statusFilter) &&
        (priorityFilter === 'all' || ticket.priority === priorityFilter) &&
        [ticket.id, ticket.subject, ticket.message].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [tickets, categoryFilter, statusFilter, priorityFilter, query]);

  const statusOptions = [{ value: 'all' as const, label: translate('tickets.status.all') }, ...statuses.map((status) => ({ value: status, label: translate(`tickets.status.${status}`) }))];
  const priorityOptions = [
    { value: 'all' as const, label: translate('tickets.priority.all') },
    ...priorities.map((priority) => ({ value: priority, label: translate(`tickets.priority.${priority}`), dotClassName: priorityStyle[priority].edge })),
  ];

  // Skeleton: open helpdesk hero (title + create) beside the category pixel counters, a single filter strip, then the ticket grid.
  return (
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-end gap-4 border-b border-line pb-6">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="ticket" size={16} />
          </span>
          <RedDot className="absolute top-0.5 right-0.5" />
        </span>
        <h1 className="min-w-0 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.tickets')}</h1>
      </header>

      <section className="grid gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] xl:items-end">
        <div style={staggerStyle(0, 140)} className="zenith-tile flex flex-col gap-4">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-semibold text-app">
            <LiveDot />
            {translate('tickets.helpdesk')}
          </p>
          <h2 className="text-4xl leading-tight font-black tracking-tight text-fg sm:text-5xl">{translate('tickets.heroTitle')}</h2>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-haspopup="dialog"
            className="group/create mt-1 inline-flex h-12 items-center gap-3 self-start rounded-full bg-fg py-1 pr-1 pl-6 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {translate('tickets.create')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white transition-transform duration-500 group-hover/create:rotate-90 motion-reduce:transition-none">
              <Icon name="plus" size={16} />
            </span>
          </button>
        </div>

        <div role="group" aria-label={translate('tickets.categoryLabel')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category, index) => {
            const isActive = categoryFilter === category.key;
            const count = categoryCount(category.key);
            const litDots = tickets.length === 0 ? 0 : Math.round((count / tickets.length) * SHARE_DOTS);
            return (
              <button
                key={category.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(category.key)}
                style={staggerStyle(index, 90)}
                className={cx(
                  'group/cat relative flex animate-feed-in flex-col gap-4 rounded-[26px] p-4 text-left transition-[background-color,color,box-shadow,translate] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                  isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg ring-1 ring-line hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:hover:translate-y-0',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    style={isActive ? { background: RED } : undefined}
                    className={cx('grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/cat:-rotate-12 motion-reduce:transition-none', isActive ? 'text-white' : 'bg-fg text-app')}
                  >
                    <Icon name={category.icon} size={15} />
                  </span>
                  <span aria-hidden="true" className={cx('font-mono text-[10px] font-bold', isActive ? 'text-app/60' : 'text-[var(--zenith-red)]')}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </span>
                <span className="font-mono text-4xl leading-none font-black tracking-tighter tabular-nums">
                  <CountUp value={count} format={(current) => String(Math.round(current)).padStart(2, '0')} />
                </span>
                <span className={cx('truncate text-sm font-semibold', isActive ? 'text-app' : 'text-fg-muted')}>{translate(category.labelKey)}</span>
                <span aria-hidden="true" className="grid grid-cols-10 gap-0.5">
                  {Array.from({ length: SHARE_DOTS }, (_, dot) => {
                    const isLit = dot < litDots;
                    const isEdge = dot === litDots - 1;
                    return (
                      <span
                        key={dot}
                        style={{ animationDelay: `${300 + index * 90 + dot * 50}ms`, ...(isEdge ? { background: RED } : {}) }}
                        className={cx(
                          'h-3 animate-dot-pop rounded-[2px] transition-colors duration-300 motion-reduce:animate-none',
                          isLit ? (isActive ? 'bg-app' : 'bg-fg') : isActive ? 'bg-app/20' : 'bg-fg/12',
                        )}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={staggerStyle(2, 120)} className="zenith-tile flex flex-col gap-5 border-t border-line pt-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <p className={cx(captionClass, 'flex shrink-0 items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
              <Icon name="filter" size={12} />
            </span>
            {translate('tickets.statusLabel')} · {translate('tickets.priorityLabel')}
          </p>
          <div className="min-w-0 flex-1 [&_input]:rounded-full">
            <Input type="search" leftIcon="search" aria-label={translate('tickets.search')} placeholder={translate('tickets.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
            <Dropdown label={translate('tickets.statusLabel')} value={statusFilter} options={statusOptions} onChange={setStatusFilter} icon="checkCircle" />
            <Dropdown label={translate('tickets.priorityLabel')} value={priorityFilter} options={priorityOptions} onChange={setPriorityFilter} icon="alert" />
          </div>
        </div>

        {visibleTickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-line-strong py-14 text-center">
            <span aria-hidden="true" className="relative grid size-16 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
              <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
              <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
                <Icon name="ticket" size={17} />
              </span>
            </span>
            <p className="text-sm font-medium text-fg">{translate('tickets.emptyTitle')}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleTickets.map((ticket, index) => (
              <TicketCard key={ticket.id} ticket={ticket} index={index} />
            ))}
          </div>
        )}
      </section>

      <CreateTicketModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={(ticket) => setTickets((current) => [ticket, ...current])} />
    </div>
  );
}
