'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbContest } from '@/core/mock/ibContests';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Icon } from '../ui/Icon';

const graphite = 'bg-[#18181b]';
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

  // Share of the new pool that this deposit adds, drawn as the gold tail on the pool meter.
  const addedShare = poolAfter > 0 ? (amount / poolAfter) * 100 : 0;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 id={titleId} className="flex items-center gap-3 text-base font-semibold tracking-tight text-fg">
          <span className={cx('grid size-9 place-items-center rounded-xl text-(--brand-gleam) ring-1 ring-primary/40', graphite)}>
            <Icon name="crypto" size={16} />
          </span>
          {translate('ibFund.title')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={translate('ibFund.close')}
          className="grid size-9 place-items-center rounded-xl text-fg-muted ring-1 ring-line transition-[color,transform] duration-300 hover:rotate-90 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      <div className="space-y-5 px-6 pt-5 pb-6">
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-2.5">
          <Icon name="trophy" size={14} className="shrink-0 text-primary" />
          <span className="text-xs text-fg-muted">{translate('ibFund.contest')}</span>
          <span className="ml-auto truncate text-sm font-semibold text-fg">{contest.name}</span>
        </div>

        <div>
          <label htmlFor={inputId} className={cx(eyebrow, 'mb-2 block text-fg-subtle')}>
            {translate('ibFund.amount')}
          </label>
          <div
            className={cx(
              'flex h-16 items-center gap-3 border-b-2 transition-colors',
              error ? 'border-red-500/70' : 'border-line hover:border-line-strong focus-within:border-primary',
            )}
          >
            <span aria-hidden="true" className={cx('font-mono text-3xl font-semibold', hasAmount ? 'text-primary' : 'text-fg-subtle')}>
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
              className="min-w-0 flex-1 bg-transparent font-mono text-3xl font-semibold text-fg tabular-nums outline-none placeholder:text-fg-subtle/60"
            />
            <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-wider text-fg-muted ring-1 ring-line">{currency}</span>
          </div>
          {error && (
            <p id={`${inputId}-error`} className="mt-1.5 flex animate-rise items-center gap-1 text-xs font-medium text-red-500 motion-reduce:animate-none">
              <Icon name="alert" size={12} />
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-fg-muted">{translate('ibFund.note')}</p>
        </div>

        {/* Pool meter: what is in the pool now, and where it lands after this deposit. */}
        <div className="rounded-2xl bg-surface-2/70 p-4 ring-1 ring-line">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibFund.currentPool')}</p>
              <p className="mt-1 truncate font-mono text-base font-semibold text-fg-muted tabular-nums">{formatMoney(contest.totalPool, currency)}</p>
            </div>
            <Icon name="arrowRight" size={14} className={cx('mb-1.5 shrink-0 transition-colors', hasAmount ? 'text-primary' : 'text-fg-subtle')} />
            <div className="min-w-0 text-right">
              <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibFund.newPool')}</p>
              <p aria-live="polite" className={cx('mt-1 truncate font-mono text-2xl font-semibold tabular-nums', goldText)}>
                {formatMoney(shownPool, currency)}
              </p>
            </div>
          </div>
          <div aria-hidden="true" className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface">
            <span className="h-full flex-1 bg-fg/40" />
            <span style={{ width: `${addedShare}%` }} className={cx('h-full transition-[width] duration-500 ease-out motion-reduce:transition-none', goldFill)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-fg ring-1 ring-line transition-colors hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {translate('ibFund.cancel')}
          </button>
          <button
            type="submit"
            className={cx(
              'group inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-(--brand-gleam) ring-1 ring-primary/40 transition-[box-shadow] duration-300 hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              graphite,
            )}
          >
            <Icon name="plus" size={15} className="transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
            {translate('ibFund.submit')}
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
