'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbTransferSetup } from '@/core/mock/ibTransfer';
import { useIbTransfer } from '@/core/pages/useIbTransfer';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Dropdown, type DropdownOption } from '../ui/Dropdown';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

/*
 * Nova IB transfer: a frosted route card (sender → rebate pool → recipient strung on a vertical bead line), a form of
 * bead-numbered steps with dot-matrix meters, and a dark receipt that carries the submit.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden p-5 sm:p-6';
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] p-5 text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 sm:p-6';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const fieldShell = 'rounded-[22px] bg-fg/[0.02] ring-1 ring-line transition-[box-shadow,background-color] duration-300 focus-within:bg-surface focus-within:ring-2 focus-within:ring-fg';
// The note goes to an admin as plain text, so only letters, digits, spaces and . , - are allowed.
const NOTE_PATTERN = /^[\p{L}\p{N}\s.,-]*$/u;
const AMOUNT_DOTS = 24;
const NOTE_DOTS = 10;
const ROUTE_DOTS = 6;

type FieldName = 'recipient' | 'amount' | 'note';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Keeps digits and a single decimal point with at most two decimals.
function sanitizeAmount(raw: string): string {
  const [whole, ...fraction] = raw.replace(/[^\d.]/g, '').split('.');
  return fraction.length === 0 ? whole : `${whole}.${fraction.join('').slice(0, 2)}`;
}

/* ───────────── Route card (frosted, vertical) ───────────── */

function RouteStop({ label, name, badge, isEmpty = false }: { label: string; name: string; badge?: string; isEmpty?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative grid size-14 shrink-0 place-items-center">
        <span
          aria-hidden="true"
          className={cx('absolute inset-0 rounded-full border-2 border-dashed', isEmpty ? 'border-[#0a1220]/25' : 'animate-rim-spin border-[#0a1220]/30 motion-reduce:animate-none')}
        />
        <span
          key={isEmpty ? 'empty' : name}
          className={cx(
            'grid size-11 place-items-center rounded-full font-mono text-sm font-black',
            isEmpty ? 'bg-white/70 text-[#0a1220]/40' : 'animate-dot-pop bg-[#0a1220] text-white motion-reduce:animate-none',
          )}
        >
          {isEmpty ? '?' : initials(name)}
        </span>
      </span>
      <div className="min-w-0">
        <p className={cx(captionClass, 'text-[#3b4658]')}>{label}</p>
        <p className={cx('mt-0.5 flex items-center gap-1.5 text-base font-black', isEmpty && 'text-[#0a1220]/40')}>
          <span className="truncate">{name}</span>
          {badge && <span className="shrink-0 rounded-full bg-[#0a1220] px-2 py-0.5 text-[9px] font-black tracking-wider text-white uppercase">{badge}</span>}
        </p>
      </div>
    </div>
  );
}

// Vertical bead string between stops: dark beads blink downwards once the transfer is ready to go.
function RouteString({ isArmed, withArrow = false }: { isArmed: boolean; withArrow?: boolean }) {
  return (
    <span aria-hidden="true" className="flex w-14 flex-col items-center gap-1.5 py-1">
      {Array.from({ length: ROUTE_DOTS }, (_, dot) => (
        <span
          key={dot}
          style={isArmed ? { animationDelay: `${dot * 0.15}s` } : undefined}
          className={cx('size-1.5 rounded-full transition-colors duration-300', isArmed ? 'animate-blink bg-[#0a1220] motion-reduce:animate-none' : 'bg-[#0a1220]/15')}
        />
      ))}
      {withArrow && (
        <span className={cx('mt-0.5 grid size-6 place-items-center rounded-full transition-colors duration-300', isArmed ? 'bg-[#0a1220] text-white' : 'bg-[#0a1220]/10 text-[#0a1220]/40')}>
          <Icon name="chevronDown" size={12} />
        </span>
      )}
    </span>
  );
}

function RouteCard({ setup, recipientName, isArmed }: { setup: IbTransferSetup; recipientName: string | null; isArmed: boolean }) {
  const balance = useAnimatedNumber(setup.availableBalance, 1400);

  return (
    <FrostCard className="lg:col-span-5 lg:row-span-2">
      <div className="flex h-full flex-col text-[#0a1220]">
        <RouteStop label={translate('ibTransfer.from')} name={setup.senderName} badge={translate('ibNet.roleIb')} />
        <RouteString isArmed={isArmed} />

        {/* The pool every transfer is drawn from sits on the route itself. */}
        <div className={cx('flex flex-col gap-2 rounded-[26px] p-5', frostChipClass)}>
          <div className="flex items-center justify-between gap-3">
            <p className={cx(captionClass, 'text-[#3b4658]')}>{translate('ibTransfer.available')}</p>
            <span aria-hidden="true" className="relative grid size-11 place-items-center">
              {[0, 1.4].map((delay) => (
                <span key={delay} style={{ animationDelay: `${delay}s` }} className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-[#0a1220]/20 motion-reduce:hidden" />
              ))}
              <span className="relative grid size-11 animate-float place-items-center rounded-full bg-[#0a1220] text-white motion-reduce:animate-none">
                <Icon name="wallet" size={17} />
              </span>
            </span>
          </div>
          <p className="font-mono text-4xl leading-none font-black tracking-tight break-all tabular-nums sm:text-5xl">{formatMoney(balance, setup.currency)}</p>
          <p className="text-xs text-[#3b4658]">{translate('ibTransfer.availableHint')}</p>
        </div>

        <RouteString isArmed={isArmed} withArrow />
        <RouteStop label={translate('ibTransfer.to')} name={recipientName ?? '—'} isEmpty={recipientName === null} />

        {/* Minimum-transfer stub. */}
        <div className="group mt-auto flex items-center gap-3 rounded-full bg-[#0a1220] py-1.5 pr-2 pl-1.5 text-white max-lg:mt-6 lg:mt-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#0a1220] transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none">
            <Icon name="crypto" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9.5px] font-semibold tracking-[0.14em] text-white/55 uppercase">{translate('ibTransfer.smallest')}</p>
            <p className="font-mono text-base font-black tabular-nums">{formatMoney(setup.minTransfer, setup.currency)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/12 px-2.5 py-1 text-[9.5px] font-black tracking-[0.14em] uppercase">{translate('ibTransfer.smallestHint')}</span>
        </div>
      </div>
    </FrostCard>
  );
}

/* ───────────── Form pieces ───────────── */

function FieldLabel({ htmlFor, required, aside, children }: { htmlFor: string; required?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-black text-fg">
        {children}
        {required && (
          <span aria-hidden="true" className="ml-1 text-fg-subtle">
            *
          </span>
        )}
      </label>
      {aside}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex animate-feed-in items-center gap-1.5 text-xs font-semibold text-danger motion-reduce:animate-none">
      <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-danger motion-reduce:animate-none" />
      {message}
    </p>
  );
}

function NoteCounter({ used, max }: { used: number; max: number }) {
  const share = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const isNearLimit = share >= 90;
  const litDots = Math.round((share / 100) * NOTE_DOTS);
  return (
    <span className={cx('flex items-center gap-2 font-mono text-[11px] tabular-nums', isNearLimit ? 'text-danger' : 'text-fg-subtle')}>
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: NOTE_DOTS }, (_, dot) => (
          <span key={dot} className={cx('size-1.5 rounded-full transition-colors duration-200', dot < litDots ? (isNearLimit ? 'bg-danger' : 'bg-fg') : 'bg-fg/12')} />
        ))}
      </span>
      {used}/{max}
    </span>
  );
}

/** One bead-numbered step; the bead fills with a check once the step is complete. */
function StepBlock({ index, isDone, children }: { index: number; isDone: boolean; children: ReactNode }) {
  return (
    <li style={{ animationDelay: `${index * 90}ms` }} className="flex animate-feed-in gap-4 border-t-2 border-dotted border-line-strong pt-5 first:border-t-0 first:pt-0 motion-reduce:animate-none">
      <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
        <span className={cx('absolute inset-0 rounded-full border-2 border-dashed', isDone ? 'border-fg/35' : 'animate-rim-spin border-fg/20 motion-reduce:animate-none')} />
        <span
          key={String(isDone)}
          className={cx(
            'grid size-8 place-items-center rounded-full font-mono text-xs font-black',
            isDone ? 'animate-dot-pop bg-fg text-app motion-reduce:animate-none' : 'nova-gloss text-fg-muted',
          )}
        >
          {isDone ? <Icon name="check" size={14} /> : String(index).padStart(2, '0')}
        </span>
      </span>
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </li>
  );
}

function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <dt className="shrink-0 text-xs text-white/55">{label}</dt>
      <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-white/15" />
      <dd className="min-w-0 truncate text-right text-sm font-bold">{children}</dd>
    </div>
  );
}

/* ───────────── Form ───────────── */

function TransferForm({ setup }: { setup: IbTransferSetup }) {
  const fieldId = useId();
  const ids = {
    recipient: `${fieldId}-recipient`,
    amount: `${fieldId}-amount`,
    note: `${fieldId}-note`,
  };
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submittedMessage, setSubmittedMessage] = useState('');

  const recipient = setup.clients.find((client) => client.id === recipientId) ?? null;
  const amountValue = Number(amount);
  const isAmountValid = amountValue >= setup.minTransfer && amountValue <= setup.availableBalance;
  const isArmed = recipient !== null && isAmountValid;
  const isOverBalance = amountValue > setup.availableBalance;
  const balanceShare = setup.availableBalance > 0 ? Math.min(100, (amountValue / setup.availableBalance) * 100) : 0;
  const litAmountDots = isOverBalance ? AMOUNT_DOTS : Math.round((balanceShare / 100) * AMOUNT_DOTS);
  const recipientIcon: IconName = 'user';
  const recipientOptions: DropdownOption<string>[] = [
    { value: '', label: translate('ibTransfer.recipientPlaceholder', { count: String(setup.clients.length) }) },
    ...setup.clients.map((client) => ({ value: client.id, label: `${client.name} · ${client.accountNumber}` })),
  ];

  function clearError(field: FieldName) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmittedMessage('');
  }

  function validate(): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    if (!recipient) found.recipient = translate('ibTransfer.errRecipient');
    if (amount === '' || !(amountValue >= setup.minTransfer)) {
      found.amount = translate('ibTransfer.errAmountMin', { amount: formatMoney(setup.minTransfer, setup.currency) });
    } else if (amountValue > setup.availableBalance) {
      found.amount = translate('ibTransfer.errAmountMax');
    }
    if (!NOTE_PATTERN.test(note)) found.note = translate('ibTransfer.errNote');
    return found;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const firstInvalid = (Object.keys(ids) as FieldName[]).find((field) => found[field]);
    if (firstInvalid || !recipient) {
      if (firstInvalid) document.getElementById(ids[firstInvalid])?.focus();
      return;
    }
    setSubmittedMessage(translate('ibTransfer.submitted', { amount: formatMoney(amountValue, setup.currency), name: recipient.name }));
    setRecipientId('');
    setAmount('');
    setNote('');
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <RouteCard setup={setup} recipientName={recipient?.name ?? null} isArmed={isArmed} />

      <section style={{ animationDelay: '120ms' }} className={cx(panelClass, 'animate-rise motion-reduce:animate-none lg:col-span-7')}>
        <ol className="flex flex-col gap-5">
          <StepBlock index={1} isDone={recipient !== null}>
            <FieldLabel htmlFor={ids.recipient} required>
              {translate('ibTransfer.recipient')}
            </FieldLabel>
            <div
              aria-invalid={Boolean(errors.recipient)}
              aria-describedby={errors.recipient ? `${ids.recipient}-error` : undefined}
              className={cx('rounded-2xl', errors.recipient && 'ring-2 ring-danger/60')}
            >
              <Dropdown
                id={ids.recipient}
                label={translate('ibTransfer.recipient')}
                icon={recipientIcon}
                value={recipientId}
                options={recipientOptions}
                onChange={(value) => {
                  setRecipientId(value);
                  clearError('recipient');
                }}
              />
            </div>
            <FieldError id={`${ids.recipient}-error`} message={errors.recipient} />
          </StepBlock>

          <StepBlock index={2} isDone={isAmountValid}>
            <FieldLabel htmlFor={ids.amount} required>
              {translate('ibTransfer.amount', { currency: setup.currency })}
            </FieldLabel>
            <div className={cx(fieldShell, 'overflow-hidden', errors.amount && 'ring-2 ring-danger/60')}>
              <div className="flex items-center gap-3 px-4">
                <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-full font-mono text-base font-black transition-colors', amount ? 'bg-fg text-app' : 'bg-fg/[0.06] text-fg-subtle')}>
                  $
                </span>
                <input
                  id={ids.amount}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  placeholder="0.00"
                  aria-required="true"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? `${ids.amount}-error` : undefined}
                  onChange={(event) => {
                    setAmount(sanitizeAmount(event.target.value));
                    clearError('amount');
                  }}
                  className="h-16 min-w-0 flex-1 bg-transparent font-mono text-3xl font-black text-fg tabular-nums placeholder:text-fg-subtle/60 focus:outline-none"
                />
                <span className="rounded-full bg-fg/[0.06] px-3 py-1 text-[11px] font-black tracking-wider text-fg-muted">{setup.currency}</span>
              </div>
              {/* Draw meter: how much of the available rebate this transfer would use, one dot per slice. */}
              <div aria-hidden="true" className="flex items-center gap-3 border-t-2 border-dotted border-line-strong px-4 py-3">
                <span className="flex flex-1 items-center justify-between gap-0.5">
                  {Array.from({ length: AMOUNT_DOTS }, (_, dot) => (
                    <span
                      key={dot}
                      style={{ transitionDelay: `${dot * 12}ms` }}
                      className={cx('size-2 rounded-full transition-[background-color,scale] duration-200', dot < litAmountDots ? (isOverBalance ? 'bg-danger' : 'bg-fg') : 'scale-75 bg-fg/12')}
                    />
                  ))}
                </span>
                <span className={cx('shrink-0 font-mono text-[11px] font-bold tabular-nums', isOverBalance ? 'text-danger' : 'text-fg-subtle')}>
                  {formatMoney(setup.availableBalance, setup.currency)}
                </span>
              </div>
            </div>
            <FieldError id={`${ids.amount}-error`} message={errors.amount} />
          </StepBlock>

          <StepBlock index={3} isDone={note.trim() !== '' && NOTE_PATTERN.test(note)}>
            <FieldLabel htmlFor={ids.note} aside={<NoteCounter used={note.length} max={setup.noteMaxLength} />}>
              {translate('ibTransfer.note')}
            </FieldLabel>
            <div className={cx(fieldShell, errors.note && 'ring-2 ring-danger/60')}>
              <textarea
                id={ids.note}
                rows={4}
                value={note}
                maxLength={setup.noteMaxLength}
                placeholder={translate('ibTransfer.notePlaceholder')}
                aria-invalid={Boolean(errors.note)}
                aria-describedby={errors.note ? `${ids.note}-error` : undefined}
                onChange={(event) => {
                  setNote(event.target.value);
                  clearError('note');
                }}
                className="block w-full resize-y bg-transparent px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
              />
            </div>
            <FieldError id={`${ids.note}-error`} message={errors.note} />
          </StepBlock>
        </ol>
      </section>

      {/* Live receipt: mirrors the form and carries the submit. */}
      <aside style={{ animationDelay: '200ms' }} className={cx(inkClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-7')}>
        <span aria-hidden="true" className={cx(inkDots, '[mask-image:radial-gradient(circle_at_90%_10%,#000,transparent_65%)]')} />

        <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <dl className="flex flex-col gap-3">
            <ReceiptRow label={translate('ibTransfer.from')}>
              <span className="inline-flex items-center gap-1.5">
                {setup.senderName}
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black tracking-wider text-[#0a1220] uppercase">{translate('ibNet.roleIb')}</span>
              </span>
            </ReceiptRow>
            <ReceiptRow label={translate('ibTransfer.to')}>
              {recipient ? (
                <>
                  {recipient.name} <span className="font-mono text-xs font-normal text-white/55">· {recipient.accountNumber}</span>
                </>
              ) : (
                <span className="text-white/40">—</span>
              )}
            </ReceiptRow>
            <ReceiptRow label={translate('ibTransfer.available')}>
              <span className="font-mono tabular-nums">{formatMoney(setup.availableBalance, setup.currency)}</span>
            </ReceiptRow>
          </dl>

          <div className={cx('rounded-[22px] p-4 ring-1 transition-colors duration-300', isArmed ? 'bg-white text-[#0a1220] ring-white' : 'bg-white/[0.05] ring-white/10')}>
            <p className={cx(captionClass, isArmed ? 'text-[#3b4658]' : 'text-white/50')}>{translate('ibTransfer.amount', { currency: setup.currency })}</p>
            <p className={cx('mt-1 truncate font-mono text-3xl font-black tabular-nums', !amount && 'text-white/35')}>
              {formatMoney(Number.isFinite(amountValue) ? amountValue : 0, setup.currency)}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col gap-3">
          <button
            type="submit"
            className="group/send relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 text-sm font-black text-[#0a1220] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-[#0a1220]/15 to-transparent transition-transform duration-700 group-hover/send:translate-x-full motion-reduce:hidden" />
            <span className="relative">{translate('ibTransfer.submit')}</span>
            <span className="relative grid size-7 place-items-center rounded-full bg-[#0a1220] text-white transition-transform duration-300 group-hover/send:translate-x-1 motion-reduce:transition-none">
              <Icon name="arrowRight" size={13} />
            </span>
          </button>
          {submittedMessage && (
            <p role="status" className="flex animate-feed-in items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-sm font-semibold text-success ring-1 ring-success/35 motion-reduce:animate-none">
              <Icon name="checkCircle" size={15} className="shrink-0" />
              {submittedMessage}
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}

/* ───────────── Page ───────────── */

export default function IbTransferPage() {
  const { data } = useIbTransfer();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex animate-feed-in items-center gap-4 motion-reduce:animate-none">
          <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-10 place-items-center rounded-full bg-fg text-app">
              <Icon name="transfer" size={17} />
            </span>
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{translate('ibTransfer.title')}</h1>
            <p className="mt-1 text-sm text-fg-muted">{translate('ibTransfer.subtitle')}</p>
          </div>
        </div>
        <Link
          href="/ib/commission-history"
          className="group inline-flex h-11 items-center gap-2 rounded-full bg-fg py-1 pr-4 pl-1 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span className="grid size-9 place-items-center rounded-full bg-app text-fg">
            <Icon name="history" size={15} className="transition-transform duration-500 group-hover:-rotate-[360deg] motion-reduce:transition-none" />
          </span>
          {translate('ibTransfer.history')}
        </Link>
      </div>

      {data ? (
        <TransferForm setup={data} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-[34rem] rounded-[28px] lg:col-span-5 lg:row-span-2" />
          <Skeleton className="h-[26rem] rounded-[28px] lg:col-span-7" />
          <Skeleton className="h-48 rounded-[30px] lg:col-span-7" />
        </div>
      )}
    </div>
  );
}
