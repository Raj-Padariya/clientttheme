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

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const graphite = 'bg-[#18181b]';
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

/* ───────────── Transfer band: balance, live route and the minimum stub across one graphite strip ───────────── */

function BalanceCell({ setup }: { setup: IbTransferSetup }) {
  const balance = useAnimatedNumber(setup.availableBalance, 1400);

  return (
    <div className="flex items-start gap-4 p-6">
      <span className="relative grid size-12 shrink-0 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl border border-primary motion-reduce:hidden" />
        <span className={cx('relative grid size-full animate-float place-items-center rounded-xl text-[#18181b] motion-reduce:animate-none', goldFill)}>
          <Icon name="wallet" size={20} />
        </span>
      </span>
      <div className="min-w-0">
        <p className={cx(eyebrow, 'text-white/50')}>{translate('ibTransfer.available')}</p>
        <p className={cx('mt-2 font-mono text-3xl font-semibold tracking-tight break-all tabular-nums sm:text-4xl', goldText)}>{formatMoney(balance, setup.currency)}</p>
        <p className="mt-1.5 text-xs text-white/55">{translate('ibTransfer.availableHint')}</p>
      </div>
    </div>
  );
}

function RouteNode({ label, name, badge, isEmpty }: { label: string; name: string; badge?: string; isEmpty?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span
        className={cx(
          'grid size-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-bold transition-[background-color,color,border-color] duration-300',
          isEmpty ? 'border-2 border-dashed border-white/25 text-white/40' : cx('text-[#18181b] shadow-[0_10px_22px_-12px_var(--brand-primary)]', goldFill),
        )}
      >
        {isEmpty ? '?' : initials(name)}
      </span>
      <div className="min-w-0">
        <p className={cx(eyebrow, 'text-white/45')}>{label}</p>
        <p className={cx('flex max-w-full items-center justify-center gap-1.5 truncate text-sm font-semibold', isEmpty ? 'text-white/40' : 'text-white')}>
          <span className="truncate">{name}</span>
          {badge && <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-(--brand-gleam) uppercase">{badge}</span>}
        </p>
      </div>
    </div>
  );
}

function RouteCell({ senderName, recipientName, isArmed }: { senderName: string; recipientName: string | null; isArmed: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(3rem,1fr)_minmax(0,1fr)] items-center gap-2 p-6">
      <RouteNode label={translate('ibTransfer.from')} name={senderName} badge={translate('ibNet.roleIb')} />
      <span aria-hidden="true" className="relative flex h-12 items-center">
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <path
            d="M0 12 Q50 -6 100 12"
            fill="none"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={isArmed ? undefined : '4 5'}
            className={cx('transition-colors duration-500', isArmed ? 'stroke-primary/70' : 'stroke-white/25')}
          />
          {isArmed && (
            <path d="M0 12 Q50 -6 100 12" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" vectorEffect="non-scaling-stroke" className="animate-ribbon-flow stroke-(--brand-gleam) motion-reduce:hidden" />
          )}
        </svg>
        <span
          className={cx(
            'absolute top-0 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full ring-4 ring-[#18181b] transition-[background-color,color] duration-500',
            isArmed ? cx('text-[#18181b]', goldFill) : 'bg-white/10 text-white/50',
          )}
        >
          {isArmed && <span className="absolute inset-0 animate-ring-ripple rounded-full border border-primary motion-reduce:hidden" />}
          <Icon name="arrowRight" size={13} />
        </span>
      </span>
      <RouteNode label={translate('ibTransfer.to')} name={recipientName ?? '—'} isEmpty={recipientName === null} />
    </div>
  );
}

function MinimumCell({ setup }: { setup: IbTransferSetup }) {
  return (
    <div className="group flex items-center gap-4 p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-(--brand-gleam) ring-1 ring-white/10 transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
        <Icon name="crypto" size={20} />
      </span>
      <div className="min-w-0">
        <p className={cx(eyebrow, 'text-white/50')}>{translate('ibTransfer.smallest')}</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">{formatMoney(setup.minTransfer, setup.currency)}</p>
        <p className={cx(eyebrow, 'mt-1.5 leading-relaxed text-(--brand-gleam)')}>{translate('ibTransfer.smallestHint')}</p>
      </div>
    </div>
  );
}

function TransferBand({ setup, recipientName, isArmed }: { setup: IbTransferSetup; recipientName: string | null; isArmed: boolean }) {
  return (
    <section className={cx('relative isolate animate-rise overflow-hidden rounded-[2rem] text-white ring-1 ring-primary/30 motion-reduce:animate-none', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-[28rem] -translate-x-1/2 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_18%,transparent),transparent_66%)] motion-reduce:animate-none"
      />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <span className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-(--brand-gleam) to-transparent motion-reduce:hidden" />
      </span>
      <div className="grid divide-y divide-white/10 lg:grid-cols-[1.2fr_1.3fr_1fr] lg:divide-x lg:divide-y-0">
        <BalanceCell setup={setup} />
        <RouteCell senderName={setup.senderName} recipientName={recipientName} isArmed={isArmed} />
        <MinimumCell setup={setup} />
      </div>
    </section>
  );
}

/* ───────────── Form pieces ───────────── */

function StepLabel({ step, htmlFor, required, aside, children }: { step: number; htmlFor?: string; required?: boolean; aside?: ReactNode; children: ReactNode }) {
  const LabelTag = htmlFor ? 'label' : 'p';
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className={cx('grid size-6 place-items-center rounded-md font-mono text-[11px] font-bold text-(--brand-gleam)', graphite)}>
          {step}
        </span>
        <LabelTag {...(htmlFor ? { htmlFor } : {})} className="text-sm font-semibold text-fg">
          {children}
          {required && (
            <span aria-hidden="true" className="ml-1 text-primary">
              *
            </span>
          )}
        </LabelTag>
      </span>
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

/* ───────────── Form: recipient deck on the left, amount + note + send on the right ───────────── */

function TransferDesk({ setup }: { setup: IbTransferSetup }) {
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
  const isArmed = recipient !== null && amountValue >= setup.minTransfer && amountValue <= setup.availableBalance;

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
      <TransferBand setup={setup} recipientName={recipient?.name ?? null} isArmed={isArmed} />

      <form noValidate onSubmit={handleSubmit} style={{ animationDelay: '120ms' }} className={cx(cardClass, 'grid animate-rise overflow-hidden motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]')}>
        <fieldset className="min-w-0 border-b border-line bg-surface-2/40 p-6 lg:border-r lg:border-b-0">
          <StepLabel step={1} required>
            {translate('ibTransfer.recipient')}
          </StepLabel>
          <p className="mb-3 text-xs text-fg-muted">{translate('ibTransfer.recipientPlaceholder', { count: String(setup.clients.length) })}</p>
          <div
            id={ids.recipient}
            role="radiogroup"
            tabIndex={-1}
            aria-label={translate('ibTransfer.recipient')}
            aria-required="true"
            aria-invalid={Boolean(errors.recipient)}
            aria-describedby={errors.recipient ? `${ids.recipient}-error` : undefined}
            className={cx('flex max-h-80 flex-col gap-2 overflow-y-auto rounded-2xl p-1 focus:outline-none', errors.recipient && 'ring-2 ring-red-500/50')}
          >
            {setup.clients.map((client, index) => {
              const isSelected = client.id === recipientId;
              return (
                <button
                  key={client.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => {
                    setRecipientId(isSelected ? '' : client.id);
                    clearError('recipient');
                  }}
                  className={cx(
                    'group flex animate-rise items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none',
                    isSelected ? cx('text-white shadow-[0_14px_28px_-18px_var(--brand-primary)] ring-primary/50', graphite) : 'bg-surface ring-line hover:ring-primary/40',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold',
                      isSelected ? cx('text-[#18181b]', goldFill) : 'bg-primary/10 text-primary',
                    )}
                  >
                    {initials(client.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate text-sm font-semibold', isSelected ? 'text-white' : 'text-fg')}>{client.name}</span>
                    <span className={cx('block truncate font-mono text-[11px]', isSelected ? 'text-white/55' : 'text-fg-subtle')}>{client.accountNumber}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cx(
                      'grid size-5 shrink-0 place-items-center rounded-full ring-1 transition-colors',
                      isSelected ? cx('text-[#18181b] ring-transparent', goldFill) : 'text-transparent ring-line',
                    )}
                  >
                    <Icon name="check" size={11} />
                  </span>
                </button>
              );
            })}
          </div>
          <FieldError id={`${ids.recipient}-error`} message={errors.recipient} />
        </fieldset>

        <div className="flex min-w-0 flex-col gap-6 p-6">
          <div>
            <StepLabel step={2} htmlFor={ids.amount} required>
              {translate('ibTransfer.amount', { currency: setup.currency })}
            </StepLabel>
            <div className={cx(fieldShell, 'flex items-center gap-3 px-4', errors.amount && 'ring-red-500/60')}>
              <span aria-hidden="true" className={cx('font-mono text-3xl font-semibold', amount ? 'text-primary' : 'text-fg-subtle')}>
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
                className="h-20 min-w-0 flex-1 bg-transparent font-mono text-4xl font-semibold text-fg tabular-nums placeholder:text-fg-subtle/60 focus:outline-none"
              />
              <span className={cx('rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wider text-(--brand-gleam)', graphite)}>{setup.currency}</span>
            </div>
            <FieldError id={`${ids.amount}-error`} message={errors.amount} />
          </div>

          <div>
            <StepLabel step={3} htmlFor={ids.note} aside={<CharacterRing used={note.length} max={setup.noteMaxLength} />}>
              {translate('ibTransfer.note')}
            </StepLabel>
            <div className={cx(fieldShell, errors.note && 'ring-red-500/60')}>
              <textarea
                id={ids.note}
                rows={3}
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
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-dashed border-line pt-5">
            <button
              type="submit"
              className={cx(
                'group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 text-sm font-semibold text-[#18181b] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0 motion-reduce:transition-none',
                goldFill,
              )}
            >
              <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
              <span className="relative">{translate('ibTransfer.submit')}</span>
              <Icon name="arrowRight" size={15} className="relative transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>
            {submittedMessage && (
              <p role="status" className="flex animate-rise items-center gap-1.5 text-sm font-medium text-emerald-500 motion-reduce:animate-none">
                <Icon name="checkCircle" size={15} />
                {submittedMessage}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/* ───────────── Page ───────────── */

export default function IbTransferPage() {
  const { data } = useIbTransfer();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="animate-rise motion-reduce:animate-none">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{translate('ibTransfer.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">{translate('ibTransfer.subtitle')}</p>
        </div>
        <Link
          href="/ib/commission-history"
          className={cx(
            'group inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-(--brand-gleam) shadow-card transition-[box-shadow] duration-300 hover:shadow-[0_12px_24px_-14px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            graphite,
          )}
        >
          <Icon name="history" size={15} className="transition-transform duration-500 group-hover:-rotate-[360deg] motion-reduce:transition-none" />
          {translate('ibTransfer.history')}
        </Link>
      </div>

      {data ? (
        <TransferDesk setup={data} />
      ) : (
        <div className="space-y-5">
          <Skeleton className="h-44 rounded-[2rem]" />
          <Skeleton className="h-[28rem] rounded-3xl" />
        </div>
      )}
    </div>
  );
}
