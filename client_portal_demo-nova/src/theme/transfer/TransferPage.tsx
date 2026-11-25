'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useTransfer, WALLET_ID, type TransferOptions } from '@/core/pages/useTransfer';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

interface TransferEndpoint {
  id: string;
  label: string;
  balance: number;
  currency: string;
}

// Quick picks as a share of the source balance; 1 is the "Max" button.
const AMOUNT_SHARES = [0.25, 0.5, 0.75, 1];
const ROW_STAGGER_MS = 60;

const noticeKeys: MessageKey[] = ['transfer.notice.instant', 'transfer.notice.noFee', 'transfer.notice.balance', 'transfer.notice.final'];

const frostInk = 'text-[#0a1220]';
const frostMuted = 'text-[#4b5a70]';
const frostLabelClass = 'block text-[10px] tracking-[0.14em] text-[#4b5a70] uppercase';

function buildEndpoints({ wallet, accounts }: TransferOptions): TransferEndpoint[] {
  return [
    { id: WALLET_ID, label: translate('transfer.wallet'), balance: wallet.balance, currency: wallet.currency },
    ...accounts.map((account) => ({
      id: account.id,
      label: `${account.login} · ${account.group}`,
      balance: account.freeMargin,
      currency: account.currency,
    })),
  ];
}

function validateAmount(amount: number, source: TransferEndpoint): MessageKey | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'transfer.amountRequired';
  if (amount > source.balance) return 'transfer.amountExceedsBalance';
  return null;
}

function roundDownToCents(value: number): number {
  return Math.floor(value * 100) / 100;
}

function FrostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cx('text-xs', frostMuted)}>{label}</dt>
      <dd className={cx('truncate text-sm font-semibold', frostInk)}>{value}</dd>
    </div>
  );
}

interface EndpointPanelProps {
  side: 'from' | 'to';
  endpoint: TransferEndpoint;
  options: TransferEndpoint[];
  /** Signed change the transfer would make to this side's balance (0 while no amount is typed). */
  delta: number;
  onChange: (id: string) => void;
}

// One end of the route: the endpoints as a radio-style list with each one's balance, then the picked one's
// balance, the balance after the transfer and a bar splitting what stays from what moves.
function EndpointPanel({ side, endpoint, options, delta, onChange }: EndpointPanelProps) {
  const labelId = `transfer-${side}-label`;
  const isSource = side === 'from';
  const after = endpoint.balance + delta;
  const isOverdrawn = after < 0;
  const scale = Math.max(endpoint.balance, after);
  const keptShare = scale > 0 ? (Math.max(Math.min(endpoint.balance, after), 0) / scale) * 100 : 0;
  const movingShare = scale > 0 ? 100 - keptShare : 0;

  return (
    <div
      className={cx(
        'orbit-card relative isolate flex min-w-0 animate-rise flex-col gap-4 overflow-hidden p-4 motion-reduce:animate-none sm:p-5',
        isSource ? 'pb-8 sm:pb-9' : 'nova-edge-light pt-8 [animation-delay:120ms] sm:pt-9',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -z-10 font-black leading-none text-transparent opacity-[0.07] select-none [-webkit-text-stroke:1.5px_var(--color-fg)] text-[150px]',
          isSource ? '-right-4 -bottom-14' : '-right-4 -top-10',
        )}
      >
        {isSource ? 'A' : 'B'}
      </span>

      <div className="flex items-center justify-between gap-3">
        <p id={labelId} className="flex items-center gap-2.5 text-sm font-semibold text-fg">
          <span
            aria-hidden="true"
            className={cx('relative grid size-8 place-items-center rounded-xl', isSource ? 'nova-gloss text-fg-muted' : 'bg-linear-to-br from-white to-[#cfdcf0] text-[#0a1220]')}
          >
            {!isSource && <span className="absolute inset-0 animate-ping-soft rounded-xl bg-white/30 motion-reduce:hidden" />}
            <Icon name={isSource ? 'arrowUpRight' : 'deposit'} size={14} className="relative" />
          </span>
          {translate(isSource ? 'transfer.from' : 'transfer.to')}
        </p>
        {delta !== 0 && (
          <span
            key={delta}
            className={cx(
              'animate-pop-in rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 motion-reduce:animate-none',
              isSource ? (isOverdrawn ? 'bg-danger-soft text-danger ring-danger/30' : 'bg-surface-2 text-fg-muted ring-line') : 'bg-success-soft text-success ring-success/30',
            )}
          >
            {isSource ? '−' : '+'}
            {formatMoney(Math.abs(delta), endpoint.currency)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-end">
        <ul role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
          {options.map((option, index) => {
            const isActive = option.id === endpoint.id;
            return (
              <li key={option.id} className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${150 + index * ROW_STAGGER_MS}ms` }}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange(option.id)}
                  className={cx(
                    'group/opt flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,translate] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                    isActive ? 'bg-surface-2 ring-1 ring-line-strong' : 'hover:translate-x-1 hover:bg-surface-2/60',
                  )}
                >
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', isActive ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-subtle ring-1 ring-line')}>
                    <Icon name={option.id === WALLET_ID ? 'wallet' : 'accounts'} size={14} />
                  </span>
                  <span className={cx('min-w-0 flex-1 truncate text-sm', isActive ? 'font-semibold text-fg' : 'text-fg-muted group-hover/opt:text-fg')}>{option.label}</span>
                  <span className="shrink-0 text-xs text-fg-subtle tabular-nums">{formatMoney(option.balance, option.currency)}</span>
                  <span aria-hidden="true" className={cx('grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-colors', isActive ? 'ring-fg' : 'ring-line-strong')}>
                    <span className={cx('size-2 rounded-full bg-fg transition-transform duration-300 motion-reduce:transition-none', isActive ? 'scale-100' : 'scale-0')} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3 rounded-2xl bg-surface-2/50 p-4 ring-1 ring-line">
          <div className="min-w-0">
            <p className="text-xs text-fg-muted">{translate('transfer.available')}</p>
            <p key={endpoint.id} className="mt-0.5 animate-pop-in truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums motion-reduce:animate-none">
              {formatMoney(endpoint.balance, endpoint.currency)}
            </p>
          </div>
          <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-line">
            <span className={cx('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isSource ? 'bg-fg-subtle/70' : 'bg-fg/50')} style={{ width: `${keptShare}%` }} />
            <span
              className={cx(
                'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                isOverdrawn ? 'bg-danger' : isSource ? 'bg-[repeating-linear-gradient(135deg,var(--color-fg)_0_4px,transparent_4px_8px)]' : 'bg-success',
              )}
              style={{ width: `${movingShare}%` }}
            />
          </div>
          <p className="flex items-center justify-between gap-3 text-xs">
            <span className="text-fg-subtle">{translate('transfer.afterTransfer')}</span>
            <span className={cx('text-sm font-semibold tabular-nums', isOverdrawn ? 'text-danger' : delta > 0 ? 'text-success' : delta < 0 ? 'text-fg' : 'text-fg-muted')}>
              {formatMoney(after, endpoint.currency)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// The notice as one rail: numbered beads joined by a line, each with its text underneath.
function ImportantNotice() {
  return (
    <section aria-labelledby="transfer-notice-title" className="relative isolate animate-rise overflow-hidden rounded-[24px] border-l-2 border-warning/70 bg-surface p-5 ring-1 ring-line [animation-delay:200ms] motion-reduce:animate-none sm:p-6">
      <h2 id="transfer-notice-title" className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="relative grid size-8 place-items-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="alert" size={15} className="relative" />
        </span>
        {translate('transfer.notice.title')}
      </h2>
      <ol className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
        {noticeKeys.map((key, index) => (
          <li key={key} style={{ animationDelay: `${260 + index * 90}ms` }} className="group relative flex animate-rise flex-col gap-3 motion-reduce:animate-none xl:pr-6">
            <span className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[10px] font-bold text-warning ring-1 ring-warning/40 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                {String(index + 1).padStart(2, '0')}
              </span>
              {index < noticeKeys.length - 1 && <span aria-hidden="true" className="hidden h-px flex-1 border-t border-dashed border-line-strong xl:block" />}
            </span>
            <p className="text-sm leading-relaxed text-fg-muted">{translate(key)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Open title instead of a header card, with the transfer's fee and timing as chips on the right.
function PageTitle() {
  return (
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.internalTransfer')}</h2>
        <p className="mt-1.5 max-w-xl text-sm text-fg-muted">{translate('transfer.subtitle')}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line">
          <Icon name="bolt" size={13} className="text-success" />
          {translate('payment.duration.immediate')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line">
          <Icon name="checkCircle" size={13} className="text-success" />
          {translate('payment.noFee')}
        </span>
      </div>
    </header>
  );
}

export default function TransferPage() {
  const { data, isLoading, isSubmitting, submitted, submit, reset } = useTransfer();
  const [fromId, setFromId] = useState(WALLET_ID);
  const [toId, setToId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [amountError, setAmountError] = useState<MessageKey | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5 sm:gap-6" aria-busy="true" aria-label={translate('common.loading')}>
        <Skeleton className="h-24 w-full rounded-[28px]" />
        <Skeleton className="h-96 w-full rounded-[24px]" />
      </div>
    );
  }

  if (data.accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          title={translate('transfer.noAccountsTitle')}
          description={translate('transfer.noAccountsText')}
          action={<LinkButton href="/accounts">{translate('nav.accounts')}</LinkButton>}
        />
      </Card>
    );
  }

  if (submitted) {
    function startOver() {
      setAmountInput('');
      setDescription('');
      setAmountError(null);
      reset();
    }

    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <PageTitle />
        <Card>
          <EmptyState
            icon="checkCircle"
            title={translate('transfer.successTitle')}
            description={translate('transfer.successText')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={startOver}>{translate('transfer.another')}</Button>
                <LinkButton href="/history" variant="outline">
                  {translate('transfer.viewHistory')}
                </LinkButton>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  const endpoints = buildEndpoints(data);
  const source = endpoints.find((endpoint) => endpoint.id === fromId) ?? endpoints[0];
  const destinations = endpoints.filter((endpoint) => endpoint.id !== source.id);
  const destination = destinations.find((endpoint) => endpoint.id === toId) ?? destinations[0];
  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const maxAmount = roundDownToCents(Math.max(0, source.balance));

  function setAmount(value: string) {
    setAmountInput(value);
    setAmountError(null);
  }

  function handleSourceChange(nextFromId: string) {
    setFromId(nextFromId);
    setAmountError(null);
    if (nextFromId === destination.id) setToId(source.id);
  }

  function handleSwap() {
    setFromId(destination.id);
    setToId(source.id);
    setAmountError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateAmount(amount, source);
    setAmountError(error);
    if (error) return;
    const note = description.trim();
    await submit({ fromId: source.id, toId: destination.id, amount, description: note || undefined });
  }

  // Nova transfer as a route: From and To stacked in one column with the swap knob sitting on the seam between
  // them, and the amount entered straight on the frosted card that also carries the receipt and the submit.
  const hasAmount = validAmount > 0;
  const shareOfAvailable = maxAmount > 0 ? Math.min(validAmount / maxAmount, 1) * 100 : 0;
  const isOverBalance = validAmount > source.balance;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageTitle />

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section aria-label={translate('nav.internalTransfer')} className="flex min-w-0 flex-col">
          <EndpointPanel side="from" endpoint={source} options={endpoints} delta={-validAmount} onChange={handleSourceChange} />

          <div className="relative z-10 -my-5 flex items-center justify-center gap-2.5">
            <span
              key={validAmount}
              aria-hidden="true"
              className={cx(
                'rounded-full bg-linear-to-br from-white to-[#cfdcf0] px-3 py-1 text-xs font-semibold text-[#0a1220] tabular-nums shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)] motion-reduce:animate-none',
                hasAmount ? 'animate-pop-in' : 'invisible',
              )}
            >
              {formatMoney(validAmount, source.currency)}
            </span>
            <button
              type="button"
              onClick={handleSwap}
              aria-label={translate('transfer.swap')}
              title={translate('transfer.swap')}
              className="group/swap relative grid size-12 place-items-center rounded-2xl bg-elevated text-fg ring-4 ring-[var(--bg)] shadow-pop transition-[scale,rotate,background-color,color] duration-300 hover:scale-105 hover:rotate-6 hover:bg-fg hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="absolute -inset-1.5 animate-orbit-spin rounded-[20px] border border-dashed border-line-strong motion-reduce:animate-none" style={{ animationDuration: '12s' }} />
              <Icon name="transfer" size={18} className="rotate-90 transition-transform duration-500 group-hover/swap:rotate-[270deg] motion-reduce:transition-none" />
            </button>
            <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase ring-1 ring-line">{translate('transfer.swap')}</span>
          </div>

          <EndpointPanel side="to" endpoint={destination} options={destinations} delta={validAmount} onChange={setToId} />
        </section>

        <aside className="min-w-0 animate-rise [animation-delay:120ms] motion-reduce:animate-none lg:sticky lg:top-24">
          <FrostCard>
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="transfer-amount" className={frostLabelClass}>
                  {translate('transfer.amount')}
                </label>
                <div
                  className={cx(
                    'mt-2 flex items-baseline gap-2 border-b-2 pb-2 transition-colors duration-300',
                    amountError ? 'border-[#b42318]' : 'border-[#0a1220]/15 focus-within:border-[#0a1220]',
                  )}
                >
                  <input
                    id="transfer-amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={maxAmount}
                    step="0.01"
                    placeholder="0.00"
                    value={amountInput}
                    aria-invalid={Boolean(amountError)}
                    aria-describedby={amountError ? 'transfer-amount-error' : undefined}
                    onChange={(event) => setAmount(event.target.value)}
                    className="min-w-0 flex-1 [appearance:textfield] bg-transparent text-5xl font-bold tracking-[-0.03em] text-[#0a1220] tabular-nums outline-none placeholder:text-[#0a1220]/25 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className={cx('shrink-0 text-sm font-semibold', frostMuted)}>{source.currency}</span>
                </div>
                {amountError && (
                  <p id="transfer-amount-error" role="alert" className="mt-1.5 text-xs font-medium text-[#b42318]">
                    {translate(amountError)}
                  </p>
                )}
              </div>

              {maxAmount > 0 && (
                <div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {AMOUNT_SHARES.map((share, index) => {
                      const value = roundDownToCents(maxAmount * share);
                      const isMax = share === 1;
                      const isActive = validAmount === value;
                      const label = isMax ? translate('transfer.max') : `${share * 100}%`;
                      return (
                        <button
                          key={share}
                          type="button"
                          aria-pressed={isActive}
                          aria-label={`${label} · ${formatMoney(value, source.currency)}`}
                          disabled={value <= 0}
                          onClick={() => setAmount(String(value))}
                          style={{ animationDelay: `${200 + index * 60}ms` }}
                          className={cx(
                            'flex min-w-0 animate-pop-in flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                            isActive ? 'bg-[#0a1220] text-white' : 'bg-white/60 text-[#0a1220] ring-1 ring-white/80 hover:bg-white/90',
                          )}
                        >
                          <span className="text-xs font-semibold">{label}</span>
                          <span className={cx('max-w-full truncate text-[10px] tabular-nums', isActive ? 'text-white/70' : frostMuted)}>{formatMoney(value, source.currency)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span aria-hidden="true" className="mt-2.5 block h-1 overflow-hidden rounded-full bg-[#0a1220]/10">
                    <span
                      className={cx('block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isOverBalance ? 'bg-[#b42318]' : 'bg-[#0a1220]')}
                      style={{ width: `${isOverBalance ? 100 : shareOfAvailable}%` }}
                    />
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="transfer-description" className={frostLabelClass}>
                  {translate('transfer.description')}
                </label>
                <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-white/60 px-3 ring-1 ring-white/80 transition-shadow focus-within:ring-[#0a1220]/40">
                  <Icon name="fileText" size={15} className={cx('shrink-0', frostMuted)} />
                  <input
                    id="transfer-description"
                    type="text"
                    maxLength={120}
                    placeholder={translate('transfer.descriptionPlaceholder')}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#0a1220] outline-none placeholder:text-[#4b5a70]/70"
                  />
                </div>
              </div>

              <div aria-hidden="true" className="relative h-2">
                <span className="absolute inset-x-0 top-1/2 border-t-2 border-dotted border-[#0a1220]/20" />
              </div>

              <dl className="flex flex-col gap-2.5 rounded-2xl bg-white/55 p-4 ring-1 ring-white/80 backdrop-blur-md">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className={frostLabelClass}>{translate('transfer.total')}</dt>
                  <dd key={validAmount} className={cx('animate-pop-in truncate text-lg font-bold tabular-nums motion-reduce:animate-none', frostInk)}>
                    {formatMoney(validAmount, source.currency)}
                  </dd>
                </div>
                <FrostRow label={translate('transfer.from')} value={source.label} />
                <FrostRow label={translate('transfer.to')} value={destination.label} />
                <FrostRow label={translate('payment.fee')} value={translate('payment.noFee')} />
                <FrostRow label={translate('payment.averageTime')} value={translate('payment.duration.immediate')} />
              </dl>

              <button
                type="submit"
                disabled={!hasAmount || isSubmitting}
                aria-busy={isSubmitting}
                className="group/cta relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a1220] text-sm font-semibold text-white shadow-[0_12px_26px_-14px_rgb(10_18_32/0.9)] transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none"
              >
                {hasAmount && !isSubmitting && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
                {isSubmitting ? (
                  <span aria-hidden="true" className="relative size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Icon name="transfer" size={16} className="relative transition-transform duration-500 group-hover/cta:rotate-180 motion-reduce:transition-none" />
                )}
                <span className="relative">{translate('nav.internalTransfer')}</span>
              </button>
            </div>
          </FrostCard>
        </aside>
      </form>

      <ImportantNotice />
    </div>
  );
}
