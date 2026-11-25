'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbContest } from '@/core/mock/ibContests';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Icon } from '../ui/Icon';

// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
// Digits with at most two decimals; an empty string is allowed while typing.
const AMOUNT_PATTERN = /^\d{0,9}(\.\d{0,2})?$/;

interface AddPrizeFundDialogProps {
  contest: IbContest | null;
  currency: string;
  onClose: () => void;
  onFunded: (contest: IbContest, amount: number) => void;
}

function FundForm({ contest, currency, titleId, onClose, onFunded }: Omit<AddPrizeFundDialogProps, 'contest'> & { contest: IbContest; titleId: string }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState('');

  const amount = Number(amountText) || 0;
  const poolAfter = contest.totalPool + amount;
  const shownPool = useAnimatedNumber(poolAfter, 500);
  const hasAmount = amount > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasAmount) {
      setError(translate('ibFund.errAmount'));
      inputRef.current?.focus();
      return;
    }
    onFunded(contest, Math.round(amount * 100) / 100);
  }

  // The tank is sized against the pool after this deposit, so the new layer grows as the amount is typed.
  const currentShare = poolAfter > 0 ? (contest.totalPool / poolAfter) * 100 : 0;
  const addedShare = poolAfter > 0 ? (amount / poolAfter) * 100 : 0;

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* Vault: a glass tank filling up, with the sum written out beside it. */}
      <div className={cx('relative isolate overflow-hidden px-6 pt-5 pb-6 text-white', graphite)}>
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -right-20 -bottom-28 -z-10 size-72 animate-orbit-spin motion-reduce:animate-none" />
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-24 -left-20 -z-10 size-56 animate-orbit-spin-rev motion-reduce:animate-none" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand-primary)_30%,transparent),transparent_68%)] motion-reduce:animate-none"
        />
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <span className="relative grid size-10 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />
              <span className="relative grid size-10 place-items-center rounded-2xl bg-primary/20 text-(--brand-gleam) ring-1 ring-primary/50">
                <Icon name="crypto" size={18} className="animate-float motion-reduce:animate-none" />
              </span>
            </span>
            {translate('ibFund.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={translate('ibFund.close')}
            className="grid size-9 place-items-center rounded-full bg-white/[0.08] text-white/70 ring-1 ring-white/10 transition-[color,transform,background-color] duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-[5rem_minmax(0,1fr)] items-stretch gap-5">
          <div aria-hidden="true" className="relative h-40 overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/15">
            {[25, 50, 75].map((tick) => (
              <span key={tick} style={{ bottom: `${tick}%` }} className="absolute right-0 h-px w-2.5 bg-white/25" />
            ))}
            <span style={{ height: `${currentShare}%` }} className="absolute inset-x-0 bottom-0 bg-white/15 transition-[height] duration-500 motion-reduce:transition-none" />
            <span
              style={{ height: `${addedShare}%`, bottom: `${currentShare}%` }}
              className="absolute inset-x-0 bg-linear-to-t from-primary/35 to-primary/60 transition-[height,bottom] duration-500 motion-reduce:transition-none"
            >
              {hasAmount && (
                <span className="absolute inset-x-0 top-0 h-1 overflow-hidden">
                  <span className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-(--brand-gleam) to-transparent motion-reduce:hidden" />
                </span>
              )}
            </span>
            <span className="absolute inset-y-2 left-2 w-1.5 rounded-full bg-white/10 blur-[1px]" />
          </div>

          <dl className="flex min-w-0 flex-col justify-center gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-center gap-2 text-xs text-white/55">
                <span aria-hidden="true" className="size-2 rounded-sm bg-white/30" />
                {translate('ibFund.currentPool')}
              </dt>
              <dd className="truncate font-mono text-sm font-semibold text-white/80 tabular-nums">{formatMoney(contest.totalPool, currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-center gap-2 text-xs text-white/55">
                <span aria-hidden="true" className="size-2 rounded-sm bg-primary/60" />
                {translate('ibFund.amount')}
              </dt>
              <dd className={cx('truncate font-mono text-sm font-semibold tabular-nums', hasAmount ? 'text-(--brand-gleam)' : 'text-white/35')}>+ {formatMoney(amount, currency)}</dd>
            </div>
            <div className="border-t border-dashed border-white/15 pt-3">
              <dt className={cx(eyebrow, 'text-white/45')}>{translate('ibFund.newPool')}</dt>
              <dd aria-live="polite" className={cx('mt-1 truncate font-mono text-3xl font-semibold tabular-nums', goldText)}>
                {formatMoney(shownPool, currency)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="space-y-5 px-6 pt-5 pb-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
            <Icon name="trophy" size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-fg-subtle">{translate('ibFund.contest')}</p>
            <p className="truncate text-sm font-semibold text-fg">{contest.name}</p>
            <p className="mt-1 text-xs text-fg-muted">{translate('ibFund.note')}</p>
          </div>
        </div>

        <div>
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-fg">
            {translate('ibFund.amount')}
          </label>
          <div
            className={cx(
              'relative flex h-16 items-center gap-3 overflow-hidden rounded-2xl bg-surface-2/60 px-4 ring-1 transition-shadow focus-within:bg-surface focus-within:ring-2',
              error ? 'ring-danger/60 focus-within:ring-danger' : 'ring-line hover:ring-line-strong focus-within:ring-primary/60',
            )}
          >
            <span aria-hidden="true" className={cx('grid size-9 place-items-center rounded-xl font-mono text-lg font-semibold ring-1 transition-colors', hasAmount ? 'bg-primary/15 text-primary ring-primary/40' : 'bg-surface text-fg-subtle ring-line')}>
              $
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amountText}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              onChange={(event) => {
                if (!AMOUNT_PATTERN.test(event.target.value)) return;
                setAmountText(event.target.value);
                setError('');
              }}
              className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-semibold text-fg tabular-nums outline-none placeholder:text-fg-subtle/60"
            />
            <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold tracking-wider text-fg-muted ring-1 ring-line">{currency}</span>
          </div>
          {error && (
            <p id={`${inputId}-error`} className="mt-1.5 flex animate-rise items-center gap-1 text-xs font-medium text-danger motion-reduce:animate-none">
              <Icon name="alert" size={12} />
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full bg-surface-2 px-5 text-sm font-semibold text-fg ring-1 ring-line transition-colors hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {translate('ibFund.cancel')}
          </button>
          <button
            type="submit"
            className={cx(
              'group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold text-(--brand-on-primary) transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              goldFill,
            )}
          >
            <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
            <Icon name="plus" size={15} className="relative transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
            <span className="relative">{translate('ibFund.submit')}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

// Native <dialog> like ui/Modal (focus trap, Esc, top layer), with its own graphite vault header.
export function AddPrizeFundDialog({ contest, currency, onClose, onFunded }: AddPrizeFundDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isOpen = contest !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md animate-rise overflow-hidden rounded-[28px] border border-fg/10 bg-elevated p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-sm motion-reduce:animate-none"
    >
      {contest && <FundForm key={contest.id} contest={contest} currency={currency} titleId={titleId} onClose={onClose} onFunded={onFunded} />}
    </dialog>
  );
}
