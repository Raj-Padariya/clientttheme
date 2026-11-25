'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useTransfer, WALLET_ID, type TransferOptions } from '@/core/pages/useTransfer';
import { cx } from '../lib/cx';
import { SummaryRow } from '../payment/PaymentParts';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Field, Input } from '../ui/Input';
import { Icon } from '../ui/Icon';

interface TransferEndpoint {
  id: string;
  label: string;
  balance: number;
  currency: string;
}

// Quick picks as a share of the source balance; 1 is the "Max" button.
const AMOUNT_SHARES = [0.25, 0.5, 0.75, 1];

const noticeKeys: MessageKey[] = ['transfer.notice.instant', 'transfer.notice.noFee', 'transfer.notice.balance', 'transfer.notice.final'];

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

interface EndpointPodProps {
  side: 'from' | 'to';
  endpoint: TransferEndpoint;
  options: TransferEndpoint[];
  /** Signed change the transfer would make to this side's balance (0 while no amount is typed). */
  delta: number;
  onChange: (id: string) => void;
}

// One side of the bridge: the endpoint picker as chips, its balance, the balance after the transfer and a bar
// splitting what stays from what moves (draining on the source, filling on the destination).
function EndpointPod({ side, endpoint, options, delta, onChange }: EndpointPodProps) {
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
        'relative isolate flex min-w-0 animate-rise flex-col gap-4 overflow-hidden rounded-3xl border bg-surface/70 p-4 backdrop-blur motion-reduce:animate-none sm:p-5',
        isSource ? 'border-line' : 'border-primary/30 [animation-delay:120ms]',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('pointer-events-none absolute -top-16 -z-10 size-48 rounded-full blur-3xl', isSource ? '-left-16 bg-fg-subtle/10' : '-right-16 bg-primary/20')}
      />

      <div className="flex items-center justify-between gap-3">
        <p id={labelId} className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span aria-hidden="true" className={cx('relative grid size-7 place-items-center rounded-full ring-1', isSource ? 'bg-surface-2 text-fg-muted ring-line' : 'bg-primary-soft text-primary ring-primary/30')}>
            {!isSource && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/25 motion-reduce:hidden" />}
            <Icon name={isSource ? 'arrowUpRight' : 'deposit'} size={13} className="relative" />
          </span>
          {translate(isSource ? 'transfer.from' : 'transfer.to')}
        </p>
        {delta !== 0 && (
          <span
            key={delta}
            className={cx(
              'animate-pop-in rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 motion-reduce:animate-none',
              isSource ? (isOverdrawn ? 'bg-danger-soft text-danger ring-danger/30' : 'bg-surface-2 text-fg-muted ring-line') : 'bg-primary-soft text-primary ring-primary/30',
            )}
          >
            {isSource ? '−' : '+'}
            {formatMoney(Math.abs(delta), endpoint.currency)}
          </span>
        )}
      </div>

      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.id === endpoint.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.id)}
              className={cx(
                'flex max-w-full items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition-[border-color,background-color,color,translate] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive
                  ? 'border-primary/60 bg-primary-soft/50 font-semibold text-fg shadow-[0_10px_24px_-16px_var(--brand-primary)]'
                  : 'border-line bg-surface/60 text-fg-muted hover:-translate-y-0.5 hover:border-primary/30 hover:text-fg',
              )}
            >
              <span className={cx('grid size-6 shrink-0 place-items-center rounded-full', isActive ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-subtle')}>
                <Icon name={option.id === WALLET_ID ? 'wallet' : 'accounts'} size={12} />
              </span>
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">{translate('transfer.available')}</p>
          <p className="mt-0.5 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">{formatMoney(endpoint.balance, endpoint.currency)}</p>
        </div>
        <p className="text-right text-xs">
          <span className="block text-fg-subtle">{translate('transfer.afterTransfer')}</span>
          <span className={cx('text-sm font-semibold tabular-nums', isOverdrawn ? 'text-danger' : delta > 0 ? 'text-primary' : delta < 0 ? 'text-fg' : 'text-fg-muted')}>
            {formatMoney(after, endpoint.currency)}
          </span>
        </p>
      </div>

      <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-line">
        <span
          className={cx('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isSource ? 'bg-fg-subtle/70' : 'bg-primary/40')}
          style={{ width: `${keptShare}%` }}
        />
        <span
          className={cx(
            'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
            isOverdrawn ? 'bg-danger' : isSource ? 'bg-[repeating-linear-gradient(135deg,var(--brand-primary)_0_4px,transparent_4px_8px)]' : 'bg-[image:var(--brand-gradient)]',
          )}
          style={{ width: `${movingShare}%` }}
        />
      </div>
    </div>
  );
}

function ImportantNotice() {
  return (
    <section aria-labelledby="transfer-notice-title" className="orbit-card relative isolate overflow-hidden p-5 sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-12 -z-10 size-48 animate-drift rounded-full bg-warning/10 blur-3xl motion-reduce:animate-none" />
      <h2 id="transfer-notice-title" className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="alert" size={16} className="relative" />
        </span>
        {translate('transfer.notice.title')}
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {noticeKeys.map((key, index) => (
          <li
            key={key}
            style={{ animationDelay: `${200 + index * 90}ms` }}
            className="group flex animate-rise flex-col gap-3 rounded-2xl bg-surface/50 p-4 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:ring-warning/40 motion-reduce:animate-none motion-reduce:transition-none"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-warning-soft font-mono text-[11px] font-bold text-warning ring-1 ring-warning/30 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="text-sm leading-relaxed text-fg-muted">{translate(key)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PageIntro() {
  return (
    <section className="orbit-card relative isolate animate-rise overflow-hidden p-5 motion-reduce:animate-none sm:p-6">
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-24 -right-24 -z-10 size-72 animate-orbit-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 -z-10 size-80 rounded-full bg-primary/15 blur-3xl" />
      <h2 className="text-xl font-medium tracking-tight text-fg sm:text-2xl">{translate('nav.internalTransfer')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{translate('transfer.subtitle')}</p>
    </section>
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
      <div className="flex flex-col gap-5 sm:gap-6">
        <PageIntro />
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

  // Orbit transfer as a bridge: the two balances as pods on either side of a live beam with the swap knob in the
  // middle, then an amount desk and a receipt with the submit underneath.
  const hasAmount = validAmount > 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageIntro />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section
          aria-label={translate('nav.internalTransfer')}
          className="orbit-card relative isolate animate-rise overflow-hidden p-4 motion-reduce:animate-none sm:p-6"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(color-mix(in_srgb,var(--brand-primary)_28%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-96 -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none" />

          <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)] lg:gap-0">
            <EndpointPod side="from" endpoint={source} options={endpoints} delta={-validAmount} onChange={handleSourceChange} />

            <div className="relative flex flex-col items-center justify-center gap-2 py-1 lg:py-0">
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 hidden h-[2px] -translate-y-1/2 overflow-hidden rounded-full bg-line lg:block">
                <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary to-transparent motion-reduce:animate-none" />
              </span>
              <span
                key={validAmount}
                aria-hidden="true"
                className={cx(
                  'relative rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold text-on-primary tabular-nums shadow-[0_8px_20px_-10px_var(--brand-primary)] motion-reduce:animate-none',
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
                className="group/swap relative grid size-12 place-items-center rounded-full border border-primary/40 bg-surface text-primary shadow-[0_0_24px_-6px_var(--brand-primary)] transition-[scale,background-color,color] duration-300 hover:scale-110 hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="orbit-ring absolute -inset-2 animate-orbit-spin motion-reduce:animate-none" />
                <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/40 motion-reduce:hidden" />
                <Icon name="transfer" size={18} className="rotate-90 transition-transform duration-500 group-hover/swap:rotate-[270deg] motion-reduce:transition-none lg:rotate-0 lg:group-hover/swap:rotate-180" />
              </button>
              <span className="relative text-center text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{translate('transfer.swap')}</span>
            </div>

            <EndpointPod side="to" endpoint={destination} options={destinations} delta={validAmount} onChange={setToId} />
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <section
            aria-labelledby="transfer-amount-title"
            className="orbit-card relative isolate flex min-w-0 animate-rise flex-col gap-5 overflow-hidden p-5 [animation-delay:80ms] motion-reduce:animate-none sm:p-6"
          >
            <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-24 -right-24 -z-10 size-64 animate-orbit-spin-rev opacity-70 motion-reduce:animate-none" />
            <h2 id="transfer-amount-title" className="sr-only">
              {translate('transfer.amount')}
            </h2>

            <Field label={translate('transfer.amount')} htmlFor="transfer-amount" error={amountError ? translate(amountError) : undefined}>
              <Input
                id="transfer-amount"
                type="number"
                inputMode="decimal"
                min={0}
                max={maxAmount}
                step="0.01"
                placeholder="0.00"
                value={amountInput}
                invalid={Boolean(amountError)}
                onChange={(event) => setAmount(event.target.value)}
                className="text-2xl font-light tracking-[-0.02em] tabular-nums"
                rightSlot={<span className="pr-4 text-sm font-semibold text-primary">{source.currency}</span>}
              />
            </Field>

            {maxAmount > 0 && (
              <div className="grid grid-cols-4 gap-2">
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
                        'flex min-w-0 animate-pop-in flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 transition-[border-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                        isActive
                          ? 'border-transparent bg-[image:var(--brand-gradient)] text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)]'
                          : 'border-line bg-surface/60 text-fg-muted hover:border-primary/40 hover:text-fg',
                      )}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <span className={cx('max-w-full truncate text-[10px] tabular-nums', isActive ? 'opacity-80' : 'text-fg-subtle')}>{formatMoney(value, source.currency)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <Field label={translate('transfer.description')} htmlFor="transfer-description">
              <Input
                id="transfer-description"
                type="text"
                leftIcon="fileText"
                maxLength={120}
                placeholder={translate('transfer.descriptionPlaceholder')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="relative isolate animate-rise rounded-[28px] border border-line bg-surface/85 p-3 shadow-pop backdrop-blur-xl [animation-delay:120ms] motion-reduce:animate-none">
              <div className="relative isolate overflow-hidden rounded-[22px] bg-[image:var(--brand-gradient)] p-5 text-on-primary shadow-[0_24px_48px_-28px_var(--brand-primary)]">
                <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-20 -right-20 -z-10 size-56 animate-orbit-spin opacity-60 motion-reduce:animate-none" />
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase opacity-75">{translate('transfer.total')}</p>
                <p key={validAmount} className="mt-2 animate-pop-in truncate text-4xl font-light tracking-[-0.03em] tabular-nums motion-reduce:animate-none">
                  {formatMoney(validAmount, source.currency)}
                </p>
                <p className="mt-3 flex min-w-0 items-center gap-2 text-xs opacity-85">
                  <span className="truncate">{source.label}</span>
                  <Icon name="arrowRight" size={12} className="shrink-0" />
                  <span className="truncate">{destination.label}</span>
                </p>
              </div>

              <div aria-hidden="true" className="relative mx-2 my-1 h-5">
                <span className="absolute inset-x-3 top-1/2 border-t-2 border-dotted border-line-strong" />
              </div>

              <dl className="flex flex-col gap-3 px-3">
                <SummaryRow label={translate('transfer.from')} value={source.label} />
                <SummaryRow label={translate('transfer.to')} value={destination.label} />
                <SummaryRow label={translate('payment.fee')} value={translate('payment.noFee')} />
                <SummaryRow label={translate('payment.averageTime')} value={translate('payment.duration.immediate')} />
              </dl>

              <div className="px-3 pt-5 pb-3">
                <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={!hasAmount} leftIcon="transfer" className="relative overflow-hidden">
                  {hasAmount && !isSubmitting && (
                    <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                  )}
                  <span className="relative">{translate('nav.internalTransfer')}</span>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>

      <ImportantNotice />
    </div>
  );
}
