'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbTransferSetup } from '@/core/mock/ibTransfer';
import { useIbTransfer } from '@/core/pages/useIbTransfer';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

const cardClass = 'orbit-card';
// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const fieldShell =
  'rounded-2xl bg-surface-2/60 ring-1 ring-line transition-[box-shadow,background-color] duration-300 focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/60 focus-within:shadow-[0_14px_30px_-20px_var(--brand-primary)]';
// The note goes to an admin as plain text, so only letters, digits, spaces and . , - are allowed.
const NOTE_PATTERN = /^[\p{L}\p{N}\s.,-]*$/u;

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

/* ───────────── Route hero: sender → rebate pool → recipient ───────────── */

function RouteNode({ label, name, badge, isEmpty, align }: { label: string; name: string; badge?: string; isEmpty?: boolean; align: 'start' | 'end' }) {
  return (
    <div className={cx('flex min-w-0 items-center gap-3', align === 'end' && 'lg:flex-row-reverse lg:text-right')}>
      <span
        className={cx(
          'grid size-14 shrink-0 place-items-center rounded-2xl font-mono text-base font-bold transition-[background-color,color,border-color] duration-300',
          isEmpty ? 'border-2 border-dashed border-white/20 text-white/40' : cx('text-(--brand-on-primary) shadow-[0_14px_30px_-14px_var(--brand-primary)]', goldFill),
        )}
      >
        {isEmpty ? '?' : initials(name)}
      </span>
      <div className="min-w-0">
        <p className={cx(eyebrow, 'text-white/45')}>{label}</p>
        <p className={cx('mt-0.5 flex items-center gap-1.5 truncate text-base font-semibold', align === 'end' && 'lg:justify-end', isEmpty ? 'text-white/40' : 'text-white')}>
          <span className="truncate">{name}</span>
          {badge && <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-(--brand-gleam) uppercase">{badge}</span>}
        </p>
      </div>
    </div>
  );
}

function RouteLine({ isArmed, withArrow }: { isArmed: boolean; withArrow?: boolean }) {
  return (
    <span aria-hidden="true" className="relative hidden h-8 items-center lg:flex">
      <span
        className={cx(
          'h-0.5 flex-1 rounded-full transition-colors duration-500',
          isArmed ? 'bg-primary/70 shadow-[0_0_10px_var(--brand-primary)]' : 'bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.18)_0_6px,transparent_6px_12px)]',
        )}
      />
      <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full">
        <span className={cx('absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent to-transparent motion-reduce:hidden', isArmed ? 'via-(--brand-gleam)' : 'via-primary/40')} />
      </span>
      {withArrow && (
        <span
          className={cx(
            'relative grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-(--hero-panel) transition-[background-color,color] duration-500',
            isArmed ? cx('text-(--brand-on-primary)', goldFill) : 'bg-white/[0.08] text-white/50',
          )}
        >
          {isArmed && <span className="absolute inset-0 animate-ring-ripple rounded-full border border-primary motion-reduce:hidden" />}
          <Icon name="arrowRight" size={14} />
        </span>
      )}
    </span>
  );
}

function RouteHero({ setup, recipientName, isArmed }: { setup: IbTransferSetup; recipientName: string | null; isArmed: boolean }) {
  const balance = useAnimatedNumber(setup.availableBalance, 1400);

  return (
    <section className={cx('orbit-card relative isolate animate-rise overflow-hidden p-6 text-white motion-reduce:animate-none lg:p-8', graphite)}>
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -bottom-56 left-1/2 -z-10 size-[30rem] -translate-x-1/2 animate-orbit-spin-rev motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute top-8 left-1/3 -z-10 size-1 animate-twinkle rounded-full bg-primary motion-reduce:animate-none" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-28 -z-10 size-80 animate-orbit rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,color-mix(in_oklab,var(--brand-primary)_50%,transparent)_80deg,transparent_150deg)] [animation-duration:12s] [mask-image:radial-gradient(circle,transparent_55%,var(--hero-panel)_57%,var(--hero-panel)_63%,transparent_65%)] motion-reduce:animate-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
      />

      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(2.5rem,0.6fr)_auto_minmax(2.5rem,0.6fr)_minmax(0,1fr)] lg:gap-4">
        <RouteNode label={translate('ibTransfer.from')} name={setup.senderName} badge={translate('ibNet.roleIb')} align="start" />
        <RouteLine isArmed={isArmed} />

        {/* The pool every transfer is drawn from sits on the route itself. */}
        <div className="order-first flex flex-col items-center rounded-3xl bg-white/[0.04] px-8 py-5 text-center ring-1 ring-white/10 backdrop-blur lg:order-none">
          <span className="relative grid size-12 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary [animation-delay:-2.4s] motion-reduce:hidden" />
            <span className="relative grid size-full animate-float place-items-center rounded-2xl bg-primary/20 text-(--brand-gleam) ring-1 ring-primary/50 motion-reduce:animate-none">
              <Icon name="wallet" size={20} />
            </span>
          </span>
          <p className={cx(eyebrow, 'mt-3 text-white/50')}>{translate('ibTransfer.available')}</p>
          <p className={cx('mt-1 font-mono text-4xl font-semibold tracking-tight break-all tabular-nums sm:text-5xl', goldText)}>{formatMoney(balance, setup.currency)}</p>
          <p className="mt-1 text-xs text-white/55">{translate('ibTransfer.availableHint')}</p>
        </div>

        <RouteLine isArmed={isArmed} withArrow />
        <RouteNode label={translate('ibTransfer.to')} name={recipientName ?? '—'} isEmpty={recipientName === null} align="end" />
      </div>
    </section>
  );
}

/* ───────────── Form pieces ───────────── */

function FieldLabel({ htmlFor, required, aside, children }: { htmlFor: string; required?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">
        {children}
        {required && (
          <span aria-hidden="true" className="ml-1 text-primary">
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
    <p id={id} className="mt-2 flex animate-rise items-center gap-1.5 text-xs font-medium text-red-500 motion-reduce:animate-none">
      <Icon name="alert" size={13} />
      {message}
    </p>
  );
}

function CharacterRing({ used, max }: { used: number; max: number }) {
  const share = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const isNearLimit = share >= 90;
  return (
    <span className="flex items-center gap-2 font-mono text-[11px] text-fg-subtle tabular-nums">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 -rotate-90">
        <circle cx={10} cy={10} r={8} fill="none" strokeWidth={2.5} className="stroke-line" />
        <circle
          cx={10}
          cy={10}
          r={8}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${share} 100`}
          className={cx('transition-[stroke-dasharray] duration-300', isNearLimit ? 'stroke-red-500' : 'stroke-primary')}
        />
      </svg>
      {used}/{max}
    </span>
  );
}

/** One numbered stop on the vertical form rail; the badge turns into a check once the step is filled. */
function Step({ index, isDone, children }: { index: number; isDone: boolean; children: ReactNode }) {
  return (
    <li style={{ animationDelay: `${index * 90}ms` }} className="relative grid animate-rise grid-cols-[2.25rem_minmax(0,1fr)] gap-4 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className={cx(
          'relative z-10 grid size-9 place-items-center rounded-full font-mono text-xs font-bold ring-4 ring-surface transition-[background-color,color] duration-300',
          isDone ? cx('text-(--brand-on-primary)', goldFill) : 'bg-surface-2 text-fg-muted',
        )}
      >
        {isDone ? <Icon name="check" size={14} /> : String(index).padStart(2, '0')}
      </span>
      <div className="min-w-0 pt-1.5">{children}</div>
    </li>
  );
}

function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="truncate text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-semibold text-fg">{children}</dd>
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
    <div className="space-y-5">
      <RouteHero setup={setup} recipientName={recipient?.name ?? null} isArmed={isArmed} />

      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section style={{ animationDelay: '120ms' }} className={cx(cardClass, 'relative animate-rise overflow-hidden p-6 motion-reduce:animate-none lg:col-span-7 xl:col-span-8')}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_10%,transparent),transparent_70%)]"
          />
          <div className="relative">
            <span aria-hidden="true" className="absolute top-9 bottom-9 left-[17px] w-px bg-linear-to-b from-primary/50 via-line to-line" />
          <ol className="relative space-y-8">
            <Step index={1} isDone={recipient !== null}>
              <FieldLabel htmlFor={ids.recipient} required>
                {translate('ibTransfer.recipient')}
              </FieldLabel>
              <div className={cx(fieldShell, 'relative flex items-center', errors.recipient && 'ring-red-500/60')}>
                <Icon name="user" size={15} className="pointer-events-none absolute left-4 text-fg-subtle" />
                <select
                  id={ids.recipient}
                  value={recipientId}
                  aria-required="true"
                  aria-invalid={Boolean(errors.recipient)}
                  aria-describedby={errors.recipient ? `${ids.recipient}-error` : undefined}
                  onChange={(event) => {
                    setRecipientId(event.target.value);
                    clearError('recipient');
                  }}
                  className={cx(
                    'h-12 w-full cursor-pointer appearance-none bg-transparent pr-11 pl-11 text-sm focus:outline-none [&>option]:bg-surface [&>option]:text-fg [&>option]:not-italic',
                    recipientId ? 'text-fg' : 'text-fg-subtle italic',
                  )}
                >
                  <option value="">{translate('ibTransfer.recipientPlaceholder', { count: String(setup.clients.length) })}</option>
                  {setup.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} · {client.accountNumber}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={15} className="pointer-events-none absolute right-4 text-fg-muted" />
              </div>
              <FieldError id={`${ids.recipient}-error`} message={errors.recipient} />
            </Step>

            <Step index={2} isDone={isAmountValid}>
              <FieldLabel htmlFor={ids.amount} required>
                {translate('ibTransfer.amount', { currency: setup.currency })}
              </FieldLabel>
              <div className={cx(fieldShell, 'overflow-hidden', errors.amount && 'ring-red-500/60')}>
                <div className="flex items-center gap-3 px-4">
                  <span aria-hidden="true" className={cx('font-mono text-2xl font-semibold', amount ? 'text-primary' : 'text-fg-subtle')}>
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
                    className="h-16 min-w-0 flex-1 bg-transparent font-mono text-3xl font-semibold text-fg tabular-nums placeholder:text-fg-subtle/60 focus:outline-none"
                  />
                  <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold tracking-wider text-fg-muted ring-1 ring-line">{setup.currency}</span>
                </div>
                {/* Draw meter: how much of the available rebate this transfer would use. */}
                <div aria-hidden="true" className="flex items-center gap-3 border-t border-line px-4 py-2.5">
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      style={{ width: `${isOverBalance ? 100 : balanceShare}%` }}
                      className={cx(
                        'absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-300',
                        isOverBalance ? 'bg-red-500/70' : 'bg-linear-to-r from-primary/40 to-primary/80',
                      )}
                    />
                  </span>
                  <span className={cx('shrink-0 font-mono text-[11px] tabular-nums', isOverBalance ? 'text-red-500' : 'text-fg-subtle')}>
                    {formatMoney(setup.availableBalance, setup.currency)}
                  </span>
                </div>
              </div>
              <FieldError id={`${ids.amount}-error`} message={errors.amount} />
            </Step>

            <Step index={3} isDone={note.trim() !== '' && NOTE_PATTERN.test(note)}>
              <FieldLabel htmlFor={ids.note} aside={<CharacterRing used={note.length} max={setup.noteMaxLength} />}>
                {translate('ibTransfer.note')}
              </FieldLabel>
              <div className={cx(fieldShell, errors.note && 'ring-red-500/60')}>
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
            </Step>
          </ol>
          </div>
        </section>

        {/* Live receipt: mirrors the form and carries the submit, with the minimum-transfer stub torn off below. */}
        <aside style={{ animationDelay: '200ms' }} className={cx(cardClass, 'relative animate-rise overflow-visible motion-reduce:animate-none lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4')}>
          <div className="p-6">
            <dl className="divide-y divide-line">
              <ReceiptRow label={translate('ibTransfer.from')}>
                <span className="inline-flex items-center gap-1.5">
                  {setup.senderName}
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase">{translate('ibNet.roleIb')}</span>
                </span>
              </ReceiptRow>
              <ReceiptRow label={translate('ibTransfer.to')}>
                {recipient ? (
                  <>
                    {recipient.name} <span className="font-mono text-xs text-fg-muted">· {recipient.accountNumber}</span>
                  </>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </ReceiptRow>
              <ReceiptRow label={translate('ibTransfer.available')}>
                <span className="font-mono tabular-nums">{formatMoney(setup.availableBalance, setup.currency)}</span>
              </ReceiptRow>
            </dl>

            <div className={cx('mt-4 rounded-2xl p-4 ring-1 transition-colors duration-300', isArmed ? 'bg-primary/10 ring-primary/45' : 'bg-surface-2/60 ring-line')}>
              <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibTransfer.amount', { currency: setup.currency })}</p>
              <p className={cx('mt-1 truncate font-mono text-3xl font-semibold tabular-nums', amount ? goldText : 'text-fg-subtle')}>
                {formatMoney(Number.isFinite(amountValue) ? amountValue : 0, setup.currency)}
              </p>
            </div>

            <button
              type="submit"
              className={cx(
                'group relative mt-5 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-sm font-semibold text-(--brand-on-primary) transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0 motion-reduce:transition-none',
                goldFill,
              )}
            >
              <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
              <span className="relative">{translate('ibTransfer.submit')}</span>
              <Icon name="arrowRight" size={15} className="relative transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>
            {submittedMessage && (
              <p role="status" className="mt-3 flex animate-rise items-center gap-1.5 text-sm font-medium text-emerald-500 motion-reduce:animate-none">
                <Icon name="checkCircle" size={15} className="shrink-0" />
                {submittedMessage}
              </p>
            )}
          </div>

          {/* Perforated tear line with punched notches, like a ticket stub. */}
          <span aria-hidden="true" className="relative block border-t-2 border-dashed border-line">
            <span className="absolute -top-3 -left-3 size-6 rounded-full border border-line bg-app [clip-path:inset(0_0_0_50%)]" />
            <span className="absolute -top-3 -right-3 size-6 rounded-full border border-line bg-app [clip-path:inset(0_50%_0_0)]" />
          </span>
          <div className="group flex items-center gap-4 px-6 py-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/30 transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
              <Icon name="crypto" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibTransfer.smallest')}</p>
              <p className="mt-0.5 font-mono text-xl font-semibold text-fg tabular-nums">{formatMoney(setup.minTransfer, setup.currency)}</p>
            </div>
            <span className={cx(eyebrow, 'rounded-full bg-primary/10 px-2.5 py-1 text-primary ring-1 ring-primary/30')}>{translate('ibTransfer.smallestHint')}</span>
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ───────────── Page ───────────── */

export default function IbTransferPage() {
  const { data } = useIbTransfer();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="animate-rise motion-reduce:animate-none">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{translate('ibTransfer.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">{translate('ibTransfer.subtitle')}</p>
        </div>
        <Link
          href="/ib/commission-history"
          className="group inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-fg shadow-card ring-1 ring-line transition-[box-shadow,color] duration-300 hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="history" size={15} className="transition-transform duration-500 group-hover:-rotate-[360deg] motion-reduce:transition-none" />
          {translate('ibTransfer.history')}
        </Link>
      </div>

      {data ? (
        <TransferForm setup={data} />
      ) : (
        <div className="space-y-5">
          <Skeleton className="h-56 rounded-[28px]" />
          <div className="grid gap-5 lg:grid-cols-12">
            <Skeleton className="h-[30rem] rounded-[28px] lg:col-span-7 xl:col-span-8" />
            <Skeleton className="h-[26rem] rounded-[28px] lg:col-span-5 xl:col-span-4" />
          </div>
        </div>
      )}
    </div>
  );
}
