'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
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

const categories: { key: CategoryFilter; icon: IconName; labelKey: MessageKey }[] = [
  { key: 'all', icon: 'ticket', labelKey: 'tickets.category.all' },
  { key: 'sales', icon: 'card', labelKey: 'tickets.category.sales' },
  { key: 'account', icon: 'user', labelKey: 'tickets.category.account' },
  { key: 'support', icon: 'inbox', labelKey: 'tickets.category.support' },
];

function createTicketId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: TICKET_ID_LENGTH }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

/** Segmented capsule: one cell per step, filled up to the ticket's current step. */
function StatusTracker({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);

  return (
    <ol className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-fg/[0.02] p-1" aria-label={translate(`tickets.status.${status}`)}>
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && status !== 'resolved' && status !== 'closed';
        return (
          <li
            key={step}
            style={staggerStyle(index, 120)}
            className={cx(
              'flex min-w-0 animate-rise items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold tracking-wide uppercase motion-reduce:animate-none',
              isDone ? 'bg-primary/15 text-primary' : 'text-fg-subtle',
              isCurrent && 'ring-1 ring-primary/40',
            )}
          >
            <span className="relative flex size-2 shrink-0">
              {isCurrent && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none" />}
              <span className={cx('relative size-2 rounded-full', isDone ? 'bg-primary' : 'border border-line-strong')} />
            </span>
            <span className="truncate">{translate(`tickets.status.${step}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** A real ticket stub: category + reference on the tear-off, details on the body, perforated in between. */
function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  const style = priorityStyle[ticket.priority];
  const assigneeName = ticket.assignee ?? translate('tickets.unassigned');
  const tilt = useTilt<HTMLElement>(3);
  const isActive = ticket.status === 'inProgress' || ticket.status === 'open';

  return (
    <article
      {...tilt}
      style={staggerStyle(index, 160)}
      className="orbit-card orbit-tilt group relative grid min-w-0 animate-rise overflow-hidden motion-reduce:animate-none sm:grid-cols-[8.5rem_minmax(0,1fr)]"
    >
      <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
      <Link
        href={`/tickets/${ticket.id}`}
        aria-label={`${ticket.subject} #${ticket.id}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="relative flex items-center gap-3 border-b border-dashed border-line-strong bg-primary/[0.06] p-4 sm:flex-col sm:justify-center sm:border-r sm:border-b-0 sm:text-center">
        <span aria-hidden="true" className={cx('absolute top-0 left-4 h-1 w-10 rounded-b-full sm:left-1/2 sm:-translate-x-1/2', style.edge)} />
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
          <Icon name={categoryIcon[ticket.category]} size={20} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-fg-muted">{translate(`tickets.category.${ticket.category}`)}</span>
          <span className="block font-mono text-[11px] text-fg-subtle">#{ticket.id}</span>
        </span>
      </div>

      {/* Punched notches where the stub tears off. */}
      <span aria-hidden="true" className="absolute top-0 left-[8.5rem] hidden size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-app sm:block" />
      <span aria-hidden="true" className="absolute bottom-0 left-[8.5rem] hidden size-5 -translate-x-1/2 translate-y-1/2 rounded-full border border-line bg-app sm:block" />

      <div className="relative flex min-w-0 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-fg">{ticket.subject}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{ticket.message}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {isActive ? <LiveDot /> : <Icon name="checkCircle" size={12} />}
            {translate(`tickets.status.${ticket.status}`)}
          </span>
        </div>

        <StatusTracker status={ticket.status} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3.5 text-xs">
          <span className={cx('rounded-md px-2 py-1 font-semibold tracking-wide uppercase', style.chip)}>{translate(`tickets.priority.${ticket.priority}`)}</span>
          <span className="inline-flex items-center gap-1.5 text-fg-subtle">
            <Icon name="calendar" size={13} />
            {dateFormat.format(ticket.createdAt)}
          </span>
          <span className="inline-flex items-center gap-2 text-fg-muted">
            <span className="grid size-6 place-items-center rounded-full border border-dashed border-line-strong text-[10px] font-semibold">{initials(assigneeName)}</span>
            {assigneeName}
          </span>
          <span className="ml-auto grid size-8 place-items-center rounded-lg border border-line text-fg-subtle transition-[translate,color,border-color] duration-200 group-hover:translate-x-1 group-hover:border-primary/40 group-hover:text-primary motion-reduce:transition-none">
            <Icon name="arrowRight" size={15} />
          </span>
        </div>
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

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={createTicketCopy.title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            {createTicketCopy.cancel}
          </Button>
          <Button type="submit" form={CREATE_FORM_ID} leftIcon="plus">
            {createTicketCopy.submit}
          </Button>
        </>
      }
    >
      <form id={CREATE_FORM_ID} noValidate onSubmit={handleSubmit} onPaste={handlePaste} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="ticket-department" label={<RequiredLabel>{createTicketCopy.department}</RequiredLabel>} error={requiredError(!department)}>
            <Select id="ticket-department" value={department} onChange={(event) => setDepartment(event.target.value as TicketCategory)}>
              <option value="">{createTicketCopy.selectDepartment}</option>
              {(Object.keys(departmentLabel) as TicketCategory[]).map((option) => (
                <option key={option} value={option}>
                  {departmentLabel[option]}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="ticket-priority" label={<RequiredLabel>{createTicketCopy.priority}</RequiredLabel>} error={requiredError(!priority)}>
            <Select id="ticket-priority" value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>
              <option value="">{createTicketCopy.selectPriority}</option>
              {priorities.map((option) => (
                <option key={option} value={option}>
                  {translate(`tickets.priority.${option}`)}
                </option>
              ))}
            </Select>
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
              className="block w-full resize-y rounded-md border border-line-strong bg-surface px-3 py-2.5 pb-7 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-fg-subtle focus:border-primary focus:ring-3 focus:ring-ring/25"
            />
            <span className={cx('pointer-events-none absolute right-3 bottom-2 text-[11px] tabular-nums', description.length >= MESSAGE_MAX_LENGTH ? 'text-danger' : 'text-fg-subtle')}>
              {description.length} / {MESSAGE_MAX_LENGTH}
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
              'relative flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-[border-color,background-color,scale] duration-200',
              isDragging ? 'scale-[1.01] border-primary bg-primary-soft' : 'border-line-strong bg-surface-2/50 hover:border-primary/50',
            )}
          >
            <span className={cx('grid size-11 place-items-center rounded-full bg-primary-soft text-primary transition-transform duration-300', isDragging && '-translate-y-1 animate-float motion-reduce:animate-none')}>
              <Icon name="fileText" size={20} />
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
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              {createTicketCopy.browseFiles}
            </Button>
            <p className="text-sm text-fg-muted">{createTicketCopy.dropHint}</p>
          </div>
        </Field>

        {files.length > 0 && (
          <ul className="-mt-2 flex flex-wrap gap-2">
            {files.map((file) => (
              <li key={file.name} className="inline-flex max-w-full animate-rise items-center gap-2 rounded-lg bg-surface-2 py-1.5 pr-2 pl-2.5 text-xs text-fg-muted ring-1 ring-line motion-reduce:animate-none">
                <Icon name="fileText" size={14} className="shrink-0 text-primary" />
                <span className="truncate text-fg">{file.name}</span>
                <span className="shrink-0 tabular-nums">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((current) => current.filter((existing) => existing.name !== file.name))}
                  className="grid size-5 shrink-0 place-items-center rounded-full transition-colors hover:bg-hover hover:text-danger"
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

  const categoryCount = (key: CategoryFilter) =>
    key === 'all' ? tickets.length : tickets.filter((ticket) => ticket.category === key).length;

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.tickets')} />

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="orbit-card relative isolate flex animate-rise flex-col gap-5 overflow-hidden p-4 motion-reduce:animate-none lg:sticky lg:top-24">
          <span aria-hidden="true" className="pointer-events-none absolute -top-20 -left-16 -z-10 size-56 rounded-full bg-primary/15 blur-3xl" />

          <div role="group" aria-label={translate('tickets.categoryLabel')} className="flex flex-col gap-1.5">
            <p className="flex items-center gap-2 px-2 pb-1 text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">
              <Icon name="ticket" size={13} className="text-primary" />
              {translate('tickets.categoryLabel')}
            </p>
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
                    'group relative flex animate-rise flex-col gap-2 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none',
                    isActive ? 'border-primary/40 bg-primary/12' : 'border-transparent hover:border-line hover:bg-fg/[0.03]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-opacity', isActive ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="flex items-center gap-3">
                    <span
                      className={cx(
                        'grid size-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
                        isActive ? 'bg-primary/25 text-primary' : 'bg-fg/[0.05] text-fg-muted',
                      )}
                    >
                      <Icon name={category.icon} size={16} />
                    </span>
                    <span className={cx('min-w-0 flex-1 truncate text-sm font-medium', isActive ? 'text-fg' : 'text-fg-muted')}>{translate(category.labelKey)}</span>
                    <span className={cx('font-mono text-lg font-semibold tabular-nums', isActive ? 'text-primary' : 'text-fg')}>
                      <CountUp value={count} format={(current) => String(Math.round(current)).padStart(2, '0')} />
                    </span>
                  </span>
                  <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-fg/[0.06]">
                    <span style={{ width: `${share}%` }} className={cx('block h-full rounded-full transition-[width] duration-500', isActive ? 'bg-primary' : 'bg-primary/40')} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <Select className="w-full" aria-label={translate('tickets.statusLabel')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | TicketStatus)}>
              <option value="all">{translate('tickets.status.all')}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {translate(`tickets.status.${status}`)}
                </option>
              ))}
            </Select>
            <Select className="w-full" aria-label={translate('tickets.priorityLabel')} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | TicketPriority)}>
              <option value="all">{translate('tickets.priority.all')}</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {translate(`tickets.priority.${priority}`)}
                </option>
              ))}
            </Select>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <section style={staggerStyle(1, 120)} className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:linear-gradient(to_left,#000,transparent_70%)]" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-28 right-10 -z-10 size-72 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

            <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
                  <span className="absolute inset-0 animate-[spin_12s_linear_infinite] rounded-2xl border border-dashed border-primary/50 motion-reduce:animate-none" />
                  <span className="grid size-11 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary">
                    <Icon name="ticket" size={20} />
                  </span>
                </span>
                <div>
                  <p className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <LiveDot />
                    {translate('tickets.helpdesk')}
                  </p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">{translate('tickets.heroTitle')}</h2>
                </div>
              </div>
              <Button size="lg" leftIcon="plus" onClick={() => setIsCreateOpen(true)} className="shadow-[0_14px_30px_-14px_var(--brand-primary)]">
                {translate('tickets.create')}
              </Button>
            </div>

            <div className="border-t border-line bg-fg/[0.02] p-3 sm:px-6">
              <Input
                type="search"
                leftIcon="search"
                aria-label={translate('tickets.search')}
                placeholder={translate('tickets.search')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </section>

          {visibleTickets.length === 0 ? (
            <Card className="flex animate-rise flex-col items-center gap-3 py-12 text-center motion-reduce:animate-none">
              <span className="flex size-14 animate-float items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
                <Icon name="ticket" size={24} />
              </span>
              <p className="text-sm font-medium text-fg">{translate('tickets.emptyTitle')}</p>
            </Card>
          ) : (
            <div className="grid gap-4 2xl:grid-cols-2">
              {visibleTickets.map((ticket, index) => (
                <TicketCard key={ticket.id} ticket={ticket} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateTicketModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(ticket) => setTickets((current) => [ticket, ...current])}
      />
    </div>
  );
}
