'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
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

function StatusTracker({ status }: { status: TicketStatus }) {
  const reached = status === 'closed' ? trackerSteps.length - 1 : trackerSteps.indexOf(status);

  return (
    <ol className="flex items-center gap-1.5" aria-label={translate(`tickets.status.${status}`)}>
      {trackerSteps.map((step, index) => {
        const isDone = index <= reached;
        const isCurrent = index === reached && status !== 'resolved' && status !== 'closed';
        return (
          <li key={step} className="flex flex-1 items-center gap-1.5">
            <span className="relative flex size-2.5 shrink-0">
              {isCurrent && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none" />}
              <span className={cx('relative size-2.5 rounded-full', isDone ? 'bg-primary' : 'bg-line-strong')} />
            </span>
            {index < trackerSteps.length - 1 && (
              <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                {index < reached && <span className="block h-full origin-left animate-grow bg-primary motion-reduce:animate-none" />}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  const style = priorityStyle[ticket.priority];
  const assigneeName = ticket.assignee ?? translate('tickets.unassigned');

  return (
    <article
      style={staggerStyle(index, 200)}
      className="group relative flex animate-rise flex-col overflow-hidden rounded-xl border border-line bg-surface p-5 pl-6 shadow-card transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_44px_-26px_color-mix(in_srgb,var(--brand-primary)_70%,transparent)] motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1 origin-top animate-[grow-y_0.8s_ease-out_both]', style.edge)} />
      <span
        aria-hidden="true"
        className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
      />
      <Link
        href={`/tickets/${ticket.id}`}
        aria-label={`${ticket.subject} #${ticket.id}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-fg-muted">#{ticket.id}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          {ticket.status === 'inProgress' || ticket.status === 'open' ? (
            <LiveDot />
          ) : (
            <Icon name="checkCircle" size={12} />
          )}
          {translate(`tickets.status.${ticket.status}`)}
        </span>
      </div>

      <h3 className="relative mt-3 truncate text-lg font-semibold text-fg">{ticket.subject}</h3>
      <p className="relative mt-1 line-clamp-2 text-sm text-fg-muted">{ticket.message}</p>

      <div className="relative mt-4">
        <StatusTracker status={ticket.status} />
        <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wide text-fg-subtle">
          {trackerSteps.map((step) => (
            <span key={step}>{translate(`tickets.status.${step}`)}</span>
          ))}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-fg-muted">
          <Icon name={categoryIcon[ticket.category]} size={13} />
          {translate(`tickets.category.${ticket.category}`)}
        </span>
        <span className={cx('rounded-md px-2 py-1 font-semibold uppercase tracking-wide', style.chip)}>
          {translate(`tickets.priority.${ticket.priority}`)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-fg-subtle">
          <Icon name="calendar" size={13} />
          {dateFormat.format(ticket.createdAt)}
        </span>
      </div>

      <div className="relative mt-4 flex items-center gap-2.5 border-t border-line pt-4">
        <span className="grid size-8 place-items-center rounded-full border border-dashed border-line-strong text-[11px] font-semibold text-fg-muted">
          {initials(assigneeName)}
        </span>
        <span className="text-sm text-fg-muted">{assigneeName}</span>
        <Icon
          name="arrowRight"
          size={16}
          className="ml-auto text-fg-subtle transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none"
        />
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

      <section className="kpi-card relative animate-rise overflow-hidden rounded-xl p-5 sm:p-6 motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-10 size-72 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
              <LiveDot />
              {translate('tickets.helpdesk')}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-fg">{translate('tickets.heroTitle')}</h2>
          </div>
          <Button
            size="lg"
            leftIcon="plus"
            onClick={() => setIsCreateOpen(true)}
            className="relative overflow-hidden shadow-[0_14px_30px_-14px_var(--brand-primary)]"
          >
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <span className="relative">{translate('tickets.create')}</span>
          </Button>
        </div>

        <div role="group" aria-label={translate('tickets.categoryLabel')} className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {categories.map((category, index) => {
            const isActive = categoryFilter === category.key;
            return (
              <button
                key={category.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(category.key)}
                style={staggerStyle(index, 150)}
                className={cx(
                  'group relative flex animate-rise items-center gap-3 overflow-hidden rounded-lg p-4 text-left transition-[translate,background-color,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                  isActive
                    ? 'bg-primary text-on-primary shadow-[0_14px_30px_-14px_var(--brand-primary)]'
                    : 'glass text-fg hover:bg-hover',
                )}
              >
                <span
                  className={cx(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none',
                    isActive ? 'bg-on-primary/15' : 'bg-primary-soft text-primary',
                  )}
                >
                  <Icon name={category.icon} size={19} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{translate(category.labelKey)}</span>
                <span className="text-2xl font-semibold tabular-nums">
                  <CountUp value={categoryCount(category.key)} format={(current) => String(Math.round(current))} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <Input
            type="search"
            leftIcon="search"
            aria-label={translate('tickets.search')}
            placeholder={translate('tickets.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <Select
            aria-label={translate('tickets.statusLabel')}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | TicketStatus)}
          >
            <option value="all">{translate('tickets.status.all')}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {translate(`tickets.status.${status}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={translate('tickets.priorityLabel')}
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as 'all' | TicketPriority)}
          >
            <option value="all">{translate('tickets.priority.all')}</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {translate(`tickets.priority.${priority}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {visibleTickets.length === 0 ? (
        <Card className="flex animate-rise flex-col items-center gap-3 py-12 text-center motion-reduce:animate-none">
          <span className="flex size-14 animate-float items-center justify-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
            <Icon name="ticket" size={24} />
          </span>
          <p className="text-sm font-medium text-fg">{translate('tickets.emptyTitle')}</p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visibleTickets.map((ticket, index) => (
            <TicketCard key={ticket.id} ticket={ticket} index={index} />
          ))}
        </div>
      )}

      <CreateTicketModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(ticket) => setTickets((current) => [ticket, ...current])}
      />
    </div>
  );
}
