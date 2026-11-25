'use client';

import Link from 'next/link';
import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbTransferSetup } from '@/core/mock/ibTransfer';
import { useIbTransfer } from '@/core/pages/useIbTransfer';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Dropdown, type DropdownOption } from '../ui/Dropdown';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

/*
 * Zenith IB transfer (Vaulto language): an open header, an open balance strip whose pixel block fills as the
 * amount draws on the rebate, a horizontal route track with a running red bead, capsule-tracked steps, and a
 * perforated ticket receipt that carries the submit.
 */
const RED = 'var(--zenith-red)';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6';
const openClass = 'relative rounded-[32px] border border-dashed border-line-strong p-5 sm:p-6';
const captionClass = 'text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const fieldShell =
  'rounded-[24px] bg-fg/[0.03] ring-1 ring-line transition-[box-shadow,background-color] duration-300 focus-within:bg-surface focus-within:ring-2 focus-within:ring-fg';
// The note goes to an admin as plain text, so only letters, digits, spaces and . , - are allowed.
const NOTE_PATTERN = /^[\p{L}\p{N}\s.,-]*$/u;
const DRAW_ROWS = 3;
const DRAW_COLS = 18;
const NOTE_PIXELS = 12;
const TRACK_TICKS = 22;
const PERFORATION = 26;

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

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function Eyebrow({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">
      <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-fg text-app">
        <Icon name={icon} size={13} />
        <span aria-hidden="true" style={{ background: RED }} className="absolute -top-0.5 -right-0.5 size-2 rounded-[2px]" />
      </span>
      {children}
    </p>
  );
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

/* ───────────── Balance strip: open balance + pixel draw block + minimum capsule ───────────── */

function BalanceStrip({ setup, drawAmount, isOverBalance }: { setup: IbTransferSetup; drawAmount: number; isOverBalance: boolean }) {
  const balance = useAnimatedNumber(setup.availableBalance, 1400);
  const totalPixels = DRAW_ROWS * DRAW_COLS;
  const share = setup.availableBalance > 0 ? drawAmount / setup.availableBalance : 0;
  const litPixels = isOverBalance ? totalPixels : Math.round(Math.min(1, share) * totalPixels);
  const percent = Math.round(share * 100);

  return (
    <section style={stagger(0, 0, 80)} className={cx(openClass, 'zenith-tile grid gap-6 lg:col-span-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center')}>
      <div className="flex min-w-0 flex-col gap-4">
        <Eyebrow icon="wallet">{translate('ibTransfer.available')}</Eyebrow>
        <div>
          <p className="font-mono text-5xl leading-[0.9] font-black tracking-tighter break-all text-fg tabular-nums sm:text-6xl">{formatMoney(balance, setup.currency)}</p>
          <p className="mt-2 text-sm text-fg-muted">{translate('ibTransfer.availableHint')}</p>
        </div>

        {/* Minimum-transfer capsule. */}
        <div className="group flex max-w-md items-center gap-3 rounded-full bg-fg py-1.5 pr-2 pl-1.5 text-app">
          <span style={{ background: RED }} className="grid size-10 shrink-0 place-items-center rounded-full text-white transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none">
            <Icon name="crypto" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9.5px] font-semibold tracking-[0.14em] uppercase opacity-60">{translate('ibTransfer.smallest')}</p>
            <p className="font-mono text-base font-black tabular-nums">{formatMoney(setup.minTransfer, setup.currency)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-app/15 px-2.5 py-1 text-[9.5px] font-black tracking-[0.14em] uppercase">{translate('ibTransfer.smallestHint')}</span>
        </div>
      </div>

      {/* Draw block: one pixel per slice of the available rebate this transfer would use; all red once it exceeds it. */}
      <div className="flex min-w-0 flex-col gap-3 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-line sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className={captionClass}>{translate('ibTransfer.amount', { currency: setup.currency })}</p>
          <span
            style={isOverBalance ? { background: RED } : undefined}
            className={cx('rounded-full px-2.5 py-0.5 font-mono text-xs font-black tabular-nums transition-colors duration-300', isOverBalance ? 'zenith-blink text-white' : 'bg-fg text-app')}
          >
            {percent}%
          </span>
        </div>
        <span aria-hidden="true" className="grid w-full auto-cols-fr grid-flow-col grid-rows-3 gap-1">
          {Array.from({ length: totalPixels }, (_, cell) => {
            const isLit = cell < litPixels;
            return (
              <span
                key={cell}
                style={{ ...stagger(cell, 14, 250), transitionDelay: `${cell * 10}ms`, background: isLit && isOverBalance ? RED : undefined }}
                className={cx(
                  'zenith-pixel aspect-square rounded-[3px] transition-[background-color,scale] duration-300 motion-reduce:transition-none',
                  isLit ? (isOverBalance ? 'zenith-blink' : 'bg-fg') : 'scale-75 bg-fg/12',
                )}
              />
            );
          })}
        </span>
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] font-bold text-fg-subtle tabular-nums">
          <span>{formatMoney(0, setup.currency)}</span>
          <span className={cx(isOverBalance && 'text-(--zenith-red)')}>{formatMoney(setup.availableBalance, setup.currency)}</span>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Route track: sender → (bead runs) → recipient ───────────── */

function PartyDisc({ name, isEmpty }: { name: string; isEmpty: boolean }) {
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      <span
        aria-hidden="true"
        className={cx('absolute inset-0 rounded-full border-2 border-dashed', isEmpty ? 'border-fg/20' : 'animate-rim-spin border-fg/30 motion-reduce:animate-none')}
      />
      <span
        key={isEmpty ? 'empty' : name}
        className={cx(
          'grid size-11 place-items-center rounded-full font-mono text-sm font-black',
          isEmpty ? 'bg-fg/[0.06] text-fg-subtle' : 'animate-dot-pop bg-fg text-app motion-reduce:animate-none',
        )}
      >
        {isEmpty ? '?' : initials(name)}
      </span>
      {!isEmpty && <span aria-hidden="true" style={{ background: RED }} className="absolute top-0.5 right-0.5 size-2.5 rounded-[3px] ring-2 ring-app" />}
    </span>
  );
}

function Party({ label, name, badge, isEmpty = false, alignEnd = false }: { label: string; name: string; badge?: string; isEmpty?: boolean; alignEnd?: boolean }) {
  return (
    <div className={cx('flex min-w-0 items-center gap-3', alignEnd && 'md:flex-row-reverse md:text-right')}>
      <PartyDisc name={name} isEmpty={isEmpty} />
      <div className="min-w-0">
        <p className={captionClass}>{label}</p>
        <p className={cx('mt-0.5 flex items-center gap-1.5 text-base font-black', alignEnd && 'md:justify-end', isEmpty ? 'text-fg-subtle' : 'text-fg')}>
          <span className="truncate">{name}</span>
          {badge && <span className="shrink-0 rounded-full bg-fg px-2 py-0.5 text-[9px] font-black tracking-wider text-app uppercase">{badge}</span>}
        </p>
      </div>
    </div>
  );
}

function RouteTrack({ setup, recipientName, amountLabel, isArmed }: { setup: IbTransferSetup; recipientName: string | null; amountLabel: string; isArmed: boolean }) {
  return (
    <section style={stagger(1, 0, 160)} className={cx(panelClass, 'zenith-tile lg:col-span-12')}>
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] md:gap-6">
        <Party label={translate('ibTransfer.from')} name={setup.senderName} badge={translate('ibNet.roleIb')} />

        <div aria-hidden="true" className="relative h-14 min-w-0">
          <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-line-strong" />
          <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {Array.from({ length: TRACK_TICKS }, (_, tick) => (
              <span
                key={tick}
                style={isArmed ? { animationDelay: `${tick * 0.08}s` } : undefined}
                className={cx('size-1.5 rounded-[2px] transition-colors duration-300', isArmed ? 'zenith-blink bg-fg' : 'bg-fg/15')}
              />
            ))}
          </span>
          {/* Two red beads run the route once the transfer is ready to go. */}
          {isArmed &&
            [0, 1.2].map((delay) => (
              <span
                key={delay}
                style={{ background: RED, animationDelay: `${delay}s`, boxShadow: `0 0 14px 2px ${RED}` }}
                className="zenith-route absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-[3px] motion-reduce:hidden"
              />
            ))}
          <span
            className={cx(
              'absolute top-1/2 left-1/2 inline-flex max-w-[80%] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full py-1 pr-3 pl-1 ring-1 transition-colors duration-300',
              isArmed ? 'bg-fg text-app ring-fg' : 'bg-app text-fg-subtle ring-line',
            )}
          >
            <span style={isArmed ? { background: RED } : undefined} className={cx('grid size-6 shrink-0 place-items-center rounded-full', isArmed ? 'text-white' : 'bg-fg/[0.06]')}>
              <Icon name="arrowRight" size={12} />
            </span>
            <span className="truncate font-mono text-xs font-black tabular-nums">{amountLabel}</span>
          </span>
        </div>

        <Party label={translate('ibTransfer.to')} name={recipientName ?? '—'} isEmpty={recipientName === null} alignEnd />
      </div>
    </section>
  );
}

/* ───────────── Form pieces ───────────── */

function FieldLabel({ htmlFor, required, aside, children }: { htmlFor: string; required?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-black text-fg">
        {children}
        {required && (
          <span aria-hidden="true" style={{ color: RED }} className="ml-1">
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
      <span aria-hidden="true" className="zenith-blink size-1.5 rounded-[2px] bg-danger" />
      {message}
    </p>
  );
}

function NoteCounter({ used, max }: { used: number; max: number }) {
  const share = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const isNearLimit = share >= 90;
  const litPixels = Math.round((share / 100) * NOTE_PIXELS);
  return (
    <span className={cx('flex items-center gap-2 font-mono text-[11px] tabular-nums', isNearLimit ? 'text-danger' : 'text-fg-subtle')}>
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: NOTE_PIXELS }, (_, pixel) => (
          <span key={pixel} className={cx('size-1.5 rounded-[2px] transition-colors duration-200', pixel < litPixels ? (isNearLimit ? 'bg-danger' : 'bg-fg') : 'bg-fg/12')} />
        ))}
      </span>
      {used}/{max}
    </span>
  );
}

type StepState = 'done' | 'active' | 'idle';

/** One step row: a square index pixel (red and pulsing while it is the next one to fill, solid with a check once done). */
function StepRow({ index, state, isLast, children }: { index: number; state: StepState; isLast: boolean; children: ReactNode }) {
  return (
    <li style={stagger(index, 90, 200)} className="relative flex animate-feed-in gap-4 motion-reduce:animate-none">
      {!isLast && <span aria-hidden="true" className="absolute top-12 bottom-0 left-5 border-l-2 border-dashed border-line-strong" />}
      <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center">
        {state === 'active' && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[12px] motion-reduce:hidden" />}
        <span
          key={state}
          style={state === 'active' ? { background: RED } : undefined}
          className={cx(
            'relative grid size-10 animate-dot-pop place-items-center rounded-[12px] font-mono text-xs font-black motion-reduce:animate-none',
            state === 'done' && 'bg-fg text-app',
            state === 'active' && 'text-white',
            state === 'idle' && 'bg-fg/[0.04] text-fg-subtle ring-1 ring-line',
          )}
        >
          {state === 'done' ? <Icon name="check" size={15} /> : String(index).padStart(2, '0')}
        </span>
      </span>
      <div className={cx('min-w-0 flex-1 pt-1.5', !isLast && 'pb-6')}>{children}</div>
    </li>
  );
}

function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <dt className="shrink-0 text-xs text-fg-subtle">{label}</dt>
      <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-line-strong" />
      <dd className="min-w-0 truncate text-right text-sm font-bold text-fg">{children}</dd>
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
  const drawAmount = Number.isFinite(amountValue) ? amountValue : 0;
  const isAmountValid = amountValue >= setup.minTransfer && amountValue <= setup.availableBalance;
  const isArmed = recipient !== null && isAmountValid;
  const isOverBalance = amountValue > setup.availableBalance;
  const isNoteDone = note.trim() !== '' && NOTE_PATTERN.test(note);
  const stepDone = [recipient !== null, isAmountValid, isNoteDone];
  const activeStep = stepDone.findIndex((done) => !done);
  const stepState = (step: number): StepState => (stepDone[step] ? 'done' : step === activeStep ? 'active' : 'idle');
  const doneCount = stepDone.filter(Boolean).length;
  const amountLabel = formatMoney(drawAmount, setup.currency);
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
      <BalanceStrip setup={setup} drawAmount={drawAmount} isOverBalance={isOverBalance} />
      <RouteTrack setup={setup} recipientName={recipient?.name ?? null} amountLabel={amountLabel} isArmed={isArmed} />

      <section style={stagger(2, 0, 240)} className={cx(panelClass, 'zenith-tile flex flex-col gap-6 lg:col-span-7')}>
        {/* Capsule track: one segment per step, red on the step being filled. */}
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex flex-1 gap-1.5">
            {stepDone.map((done, step) => (
              <span
                key={step}
                style={!done && step === activeStep ? { background: RED } : undefined}
                className={cx('h-1.5 flex-1 rounded-full transition-colors duration-300', done ? 'bg-fg' : step === activeStep ? 'zenith-blink' : 'bg-fg/12')}
              />
            ))}
          </span>
          <span className="font-mono text-[11px] font-black text-fg-subtle tabular-nums">
            {doneCount}/{stepDone.length}
          </span>
        </div>

        <ol className="flex flex-col">
          <StepRow index={1} state={stepState(0)} isLast={false}>
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
          </StepRow>

          <StepRow index={2} state={stepState(1)} isLast={false}>
            <FieldLabel htmlFor={ids.amount} required>
              {translate('ibTransfer.amount', { currency: setup.currency })}
            </FieldLabel>
            <div className={cx(fieldShell, 'flex items-center gap-3 px-3', errors.amount && 'ring-2 ring-danger/60')}>
              <span
                aria-hidden="true"
                style={amount ? { background: RED } : undefined}
                className={cx('grid size-10 shrink-0 place-items-center rounded-full font-mono text-base font-black transition-colors', amount ? 'text-white' : 'bg-fg/[0.06] text-fg-subtle')}
              >
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
              <span className="rounded-full bg-fg px-3 py-1 text-[11px] font-black tracking-wider text-app">{setup.currency}</span>
            </div>
            <FieldError id={`${ids.amount}-error`} message={errors.amount} />
          </StepRow>

          <StepRow index={3} state={stepState(2)} isLast>
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
          </StepRow>
        </ol>
      </section>

      {/* Ticket receipt: mirrors the form and carries the submit. */}
      <aside style={stagger(3, 0, 320)} className={cx(panelClass, 'zenith-tile flex flex-col gap-5 lg:col-span-5')}>
        <div className="flex items-center justify-between gap-3">
          <Eyebrow icon="transfer">{translate('ibTransfer.title')}</Eyebrow>
          <span aria-hidden="true" className="flex gap-1">
            {[0, 1, 2].map((dot) => (
              <span key={dot} style={{ animationDelay: `${dot * 0.3}s`, background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
            ))}
          </span>
        </div>

        <dl className="flex flex-col gap-3">
          <ReceiptRow label={translate('ibTransfer.from')}>
            <span className="inline-flex items-center gap-1.5">
              {setup.senderName}
              <span className="rounded-full bg-fg px-1.5 py-0.5 text-[9px] font-black tracking-wider text-app uppercase">{translate('ibNet.roleIb')}</span>
            </span>
          </ReceiptRow>
          <ReceiptRow label={translate('ibTransfer.to')}>
            {recipient ? (
              <>
                {recipient.name} <span className="font-mono text-xs font-normal text-fg-subtle">· {recipient.accountNumber}</span>
              </>
            ) : (
              <span className="text-fg-subtle">—</span>
            )}
          </ReceiptRow>
          <ReceiptRow label={translate('ibTransfer.available')}>
            <span className="font-mono tabular-nums">{formatMoney(setup.availableBalance, setup.currency)}</span>
          </ReceiptRow>
        </dl>

        {/* Perforation between the stub and the amount. */}
        <span aria-hidden="true" className="-mx-5 flex items-center justify-between gap-1 sm:-mx-6">
          <span className="size-4 shrink-0 -translate-x-1/2 rounded-full bg-app ring-1 ring-line" />
          {Array.from({ length: PERFORATION }, (_, hole) => (
            <span key={hole} className="size-1 shrink-0 rounded-[1px] bg-fg/20" />
          ))}
          <span className="size-4 shrink-0 translate-x-1/2 rounded-full bg-app ring-1 ring-line" />
        </span>

        <div className={cx('rounded-[24px] p-4 ring-1 transition-colors duration-300', isArmed ? 'bg-fg text-app ring-fg' : 'bg-fg/[0.03] text-fg ring-line')}>
          <p className={cx('text-[10px] font-semibold tracking-[0.14em] uppercase', isArmed ? 'opacity-60' : 'text-fg-subtle')}>
            {translate('ibTransfer.amount', { currency: setup.currency })}
          </p>
          <p className={cx('mt-1 truncate font-mono text-4xl font-black tracking-tight tabular-nums', !amount && 'opacity-35')}>{amountLabel}</p>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button
            type="submit"
            className="group/send relative inline-flex h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-full bg-fg py-1.5 pr-1.5 pl-6 text-sm font-black text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0 motion-reduce:transition-none"
          >
            {isArmed && <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 w-12 bg-app/25 motion-reduce:hidden" />}
            <span className="relative">{translate('ibTransfer.submit')}</span>
            <span style={{ background: RED }} className="relative grid size-11 place-items-center rounded-full text-white">
              <Icon name="arrowRight" size={15} className="transition-transform duration-300 group-hover/send:translate-x-0.5 motion-reduce:transition-none" />
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
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
              </span>
              <span className="grid size-11 place-items-center rounded-full bg-fg text-app">
                <Icon name="transfer" size={17} />
              </span>
            </span>
            <div className="min-w-0">
              <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{translate('ibTransfer.title')}</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">{translate('ibTransfer.subtitle')}</p>
            </div>
          </div>
          <Link
            href="/ib/commission-history"
            className="group inline-flex h-12 items-center gap-3 rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none"
          >
            {translate('ibTransfer.history')}
            <span style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white">
              <Icon name="history" size={15} className="transition-transform duration-500 group-hover:-rotate-[360deg] motion-reduce:transition-none" />
            </span>
          </Link>
        </div>
        <RedRule />
      </header>

      {data ? (
        <TransferForm setup={data} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-[32px] lg:col-span-12" />
          <Skeleton className="h-24 rounded-[32px] lg:col-span-12" />
          <Skeleton className="h-[30rem] rounded-[32px] lg:col-span-7" />
          <Skeleton className="h-[30rem] rounded-[32px] lg:col-span-5" />
        </div>
      )}
    </div>
  );
}
