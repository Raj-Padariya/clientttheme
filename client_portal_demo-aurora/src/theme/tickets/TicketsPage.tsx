'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type ClipboardEvent, type CSSProperties, type DragEvent, type FormEvent } from 'react';
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
import '../promotion/market.css';

type CategoryFilter = 'all' | TicketCategory;

const CREATE_FORM_ID = 'create-ticket-form';
const TICKET_ID_LENGTH = 8;
const IDLE_BARS = 24;

const categories: { key: CategoryFilter; icon: IconName; labelKey: MessageKey }[] = [
  { key: 'all', icon: 'ticket', labelKey: 'tickets.category.all' },
  { key: 'sales', icon: 'card', labelKey: 'tickets.category.sales' },
  { key: 'account', icon: 'user', labelKey: 'tickets.category.account' },
  { key: 'support', icon: 'inbox', labelKey: 'tickets.category.support' },
];

// Accent for live / alert marks: Aurora's clay (the name stays because the create modal shares it).
const RED = 'var(--aurora-cta-from)';
const COUNTER_CELLS = 12;
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';

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

/** Each step is a rising candle: reached steps print sage, the live step blinks clay, steps ahead stay as dashed outlines. */
function StatusTracker({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);
  const lastIndex = Math.max(1, trackerSteps.length - 1);

  return (
    <ol className="flex items-end gap-1.5" aria-label={translate(`tickets.status.${status}`)}>
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && status !== 'resolved' && status !== 'closed';
        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span aria-hidden="true" className="flex h-9 items-end">
              <span
                style={{ height: `${35 + (index / lastIndex) * 65}%`, '--candle-delay': `${200 + index * 140}ms`, ...(isCurrent ? { background: RED } : {}) } as CSSProperties}
                className={cx(
                  'relative w-full rounded-[2px]',
                  isDone ? 'mkt-candle' : 'border border-dashed border-line-strong',
                  isCurrent ? 'mkt-blink' : isDone && 'bg-(--hero-buy)',
                )}
              >
                {isDone && <span className="absolute -top-1.5 left-1/2 h-1.5 w-px -translate-x-1/2 bg-current text-fg/40" />}
              </span>
            </span>
            <span className={cx('truncate text-[9.5px] font-semibold tracking-[0.1em] uppercase', isCurrent ? 'text-(--aurora-cta-from)' : isDone ? 'text-fg' : 'text-fg-subtle')}>
              {translate(`tickets.status.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One ticket as a blotter row: priority rail, identity + subject, the candle tracker, then status / priority / date / assignee. */
function TicketRow({ ticket, index }: { ticket: Ticket; index: number }) {
  const style = priorityStyle[ticket.priority];
  const assigneeName = ticket.assignee ?? translate('tickets.unassigned');
  const isActive = ticket.status === 'inProgress' || ticket.status === 'open';

  return (
    <li
      style={staggerStyle(index, 120)}
      className="group relative isolate grid animate-feed-in gap-4 border-b border-dashed border-line px-5 py-5 pl-6 transition-colors duration-300 last:border-b-0 hover:bg-fg/[0.03] motion-reduce:animate-none motion-reduce:transition-none lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_13rem] lg:items-center"
    >
      <Link
        href={`/tickets/${ticket.id}`}
        aria-label={`${ticket.subject} #${ticket.id}`}
        className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />
      <span aria-hidden="true" className={cx('absolute inset-y-4 left-0 w-1 rounded-r-full transition-[inset] duration-300 group-hover:inset-y-2', style.edge)} />

      <div className="flex min-w-0 gap-3">
        <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center">
          <span className={cx(beadClass, 'size-10 transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none')}>
            <Icon name={categoryIcon[ticket.category]} size={15} />
          </span>
          {isActive && <RedDot className="absolute -top-0.5 -right-0.5" />}
        </span>
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[11px] font-bold text-fg-muted">#{ticket.id}</span>
            <span className="truncate text-xs font-bold text-fg-subtle">{translate(`tickets.category.${ticket.category}`)}</span>
          </p>
          <h3 className="mt-1 truncate text-lg font-black tracking-tight text-fg">{ticket.subject}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{ticket.message}</p>
        </div>
      </div>

      <div className="min-w-0 rounded-lg bg-fg/[0.03] px-3 pt-3 pb-2 ring-1 ring-line">
        <StatusTracker status={ticket.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs lg:flex-col lg:items-end">
        <span className="flex items-center gap-2">
          <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold', isActive ? 'bg-(--hero-buy) text-[#062520]' : 'text-fg ring-1 ring-line-strong')}>
            {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
            {translate(`tickets.status.${ticket.status}`)}
          </span>
          <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase', style.chip)}>
            <span aria-hidden="true" className={cx('size-1.5 rounded-[2px]', style.edge)} />
            {translate(`tickets.priority.${ticket.priority}`)}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-fg-subtle">
          <Icon name="calendar" size={13} />
          {dateFormat.format(ticket.createdAt)}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-fg-muted">
            <span className={cx(beadClass, 'size-6 text-[10px] font-bold')}>{initials(assigneeName)}</span>
            {assigneeName}
          </span>
          <span
            aria-hidden="true"
            style={{ background: RED }}
            className="grid size-8 place-items-center rounded-md text-[#062520] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          >
            <Icon name="arrowRight" size={14} />
          </span>
        </span>
      </div>
    </li>
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

  // Skeleton: order-desk header (title + hero line + create order), a category depth ladder on the left, and the ticket blotter with its filter toolbar on the right.
  return (
    <div className="flex flex-col gap-8">
      <header className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
        </span>
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
              <span className={cx(beadClass, 'size-11')}>
                <Icon name="ticket" size={18} />
              </span>
              <RedDot className="absolute -top-0.5 -right-0.5" />
            </span>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-md bg-(--hero-buy)/12 py-0.5 pr-2.5 pl-1.5 text-xs font-semibold text-(--hero-buy) ring-1 ring-(--hero-buy)/30">
                <LiveDot />
                {translate('tickets.helpdesk')}
              </p>
              <h1 className="mt-1.5 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.tickets')}</h1>
              <h2 className="mt-1 text-sm font-medium text-fg-muted sm:text-base">{translate('tickets.heroTitle')}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-haspopup="dialog"
            className="group/create relative inline-flex h-12 shrink-0 items-center gap-3 self-start overflow-hidden rounded-lg bg-(--hero-buy) py-1 pr-1 pl-5 text-sm font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:self-center"
          >
            <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
            <span className="relative">{translate('tickets.create')}</span>
            <span aria-hidden="true" style={{ background: RED }} className="relative grid size-10 place-items-center rounded-md text-[#062520] transition-transform duration-500 group-hover/create:rotate-90 motion-reduce:transition-none">
              <Icon name="plus" size={16} />
            </span>
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start">
        <aside style={staggerStyle(1, 140)} className={cx(panelClass, 'animate-rise p-3 motion-reduce:animate-none')}>
          <p className={cx(captionClass, 'flex items-center gap-2 px-2 pt-1 pb-3')}>
            <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
              {[45, 80, 60, 100].map((height, bar) => (
                <span key={bar} style={{ height: `${height}%`, '--vol-delay': `${bar * 0.15}s` } as CSSProperties} className="mkt-vol w-1 rounded-t-[1px] bg-(--hero-buy)" />
              ))}
            </span>
            {translate('tickets.categoryLabel')}
          </p>
          <div role="group" aria-label={translate('tickets.categoryLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1">
            {categories.map((category, index) => {
              const isActive = categoryFilter === category.key;
              const count = categoryCount(category.key);
              const share = tickets.length === 0 ? 0 : (count / tickets.length) * 100;
              return (
                <button
                  key={category.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCategoryFilter(category.key)}
                  style={staggerStyle(index, 90)}
                  className={cx(
                    'group/cat relative flex animate-feed-in flex-col gap-3 overflow-hidden rounded-lg p-3 text-left ring-1 transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                    isActive ? 'bg-(--hero-buy)/10 ring-(--hero-buy)/50' : 'bg-fg/[0.02] ring-line hover:ring-line-strong',
                  )}
                >
                  {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-(--hero-buy)" />}
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/cat:-rotate-12 motion-reduce:transition-none', isActive && 'bg-(--hero-buy) text-[#062520]')}>
                      <Icon name={category.icon} size={14} />
                    </span>
                    <span className={cx('min-w-0 flex-1 truncate text-sm font-semibold', isActive ? 'text-fg' : 'text-fg-muted')}>{translate(category.labelKey)}</span>
                    <span className="font-mono text-xl leading-none font-black tracking-tighter text-fg tabular-nums">
                      <CountUp value={count} format={(current) => String(Math.round(current)).padStart(2, '0')} />
                    </span>
                  </span>
                  {/* Depth bar: the category's share of all tickets, filled like an order-book level. */}
                  <span aria-hidden="true" className="relative h-2 overflow-hidden rounded-[2px] bg-fg/10">
                    <span
                      style={{ width: `${share}%`, transitionDelay: `${200 + index * 120}ms` }}
                      className={cx('absolute inset-y-0 left-0 overflow-hidden rounded-[2px] transition-[width] duration-700 motion-reduce:transition-none', isActive ? 'bg-(--hero-buy)' : 'bg-(--hero-buy)/50')}
                    >
                      <span className="mkt-sweep absolute inset-y-0 w-6 -skew-x-12 bg-white/40" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={staggerStyle(2, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
          <div className="flex flex-col gap-3 border-b border-dashed border-line p-4 sm:p-5 lg:flex-row lg:items-center">
            <p className={cx(captionClass, 'flex shrink-0 items-center gap-2')}>
              <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
                <Icon name="filter" size={12} />
              </span>
              {translate('tickets.statusLabel')} · {translate('tickets.priorityLabel')}
            </p>
            <div className="min-w-0 flex-1 [&_input]:rounded-lg">
              <Input type="search" leftIcon="search" aria-label={translate('tickets.search')} placeholder={translate('tickets.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem]">
              <Dropdown label={translate('tickets.statusLabel')} value={statusFilter} options={statusOptions} onChange={setStatusFilter} icon="checkCircle" />
              <Dropdown label={translate('tickets.priorityLabel')} value={priorityFilter} options={priorityOptions} onChange={setPriorityFilter} icon="alert" />
            </div>
          </div>

          {visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-5 py-14 text-center">
              <span aria-hidden="true" className="relative grid size-14 place-items-center">
                <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-xl border motion-reduce:hidden" />
                <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
                  <Icon name="ticket" size={17} />
                </span>
              </span>
              <span aria-hidden="true" className="flex h-8 w-full max-w-sm items-end gap-[3px] border-b border-dashed border-line-strong pb-0.5">
                {Array.from({ length: IDLE_BARS }, (_, bar) => (
                  <span key={bar} style={{ height: `${25 + ((bar * 37) % 75)}%`, '--vol-delay': `${(bar % 6) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-t-[1px] bg-fg/15" />
                ))}
              </span>
              <p className="text-sm font-medium text-fg">{translate('tickets.emptyTitle')}</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {visibleTickets.map((ticket, index) => (
                <TicketRow key={ticket.id} ticket={ticket} index={index} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <CreateTicketModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={(ticket) => setTickets((current) => [ticket, ...current])} />
    </div>
  );
}
