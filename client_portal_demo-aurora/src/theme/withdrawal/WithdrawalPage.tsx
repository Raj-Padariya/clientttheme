'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useWithdrawal } from '@/core/pages/useWithdrawal';
import type { PaymentMethod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { durationLabel, FeeChip, limitsText, MethodBadge, PaymentStepHeader, paymentStepKeys } from '../payment/PaymentParts';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { FlightArc, ticketShell, WithdrawalMethodGates } from './WithdrawalMethodGates';

type Step = 'method' | 'details';

// Quick picks as a share of what can actually be withdrawn; 1 is the "Max" button.
const AMOUNT_SHARES = [0.25, 0.5, 0.75, 1];
const RUNWAY_LIGHTS = 24;
const BARCODE_BARS = 44;

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function validateAmount(amount: number, method: PaymentMethod, account: TradingAccount): MessageKey | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'withdrawal.amountRequired';
  if (amount > account.freeMargin) return 'withdrawal.amountExceedsBalance';
  if (amount < method.minAmount || amount > method.maxAmount) return 'withdrawal.amountOutOfRange';
  return null;
}

function roundDownToCents(value: number): number {
  return Math.floor(value * 100) / 100;
}

const TOTAL_COUNT_MS = 600;
const NOTICE_KEYS: MessageKey[] = ['withdrawal.notice1', 'withdrawal.notice2', 'withdrawal.notice3'];

/** Counts up to the new figure whenever the amount changes, so the total visibly reacts to typing. */
function AnimatedMoney({ value, currency }: { value: number; currency: string }) {
  const shown = useAnimatedNumber(value, TOTAL_COUNT_MS);
  return <>{formatMoney(shown, currency)}</>;
}

// The three payout rules as a gate announcement: a pulsing beacon, then the notes split by dashed perforations.
function WithdrawalNotice() {
  return (
    <section aria-labelledby="withdrawal-notice-title" className={cx(boardCard, 'zenith-tile p-5 [animation-delay:320ms] sm:p-6')}>
      <h2 id="withdrawal-notice-title" className="flex items-center gap-2.5 border-b border-dashed border-fg/15 pb-4 text-base font-semibold text-fg">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="info" size={16} className="relative" />
        </span>
        {translate('withdrawal.noticeTitle')}
      </h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3 md:gap-0 md:divide-x-2 md:divide-dashed md:divide-fg/10">
        {NOTICE_KEYS.map((key, index) => (
          <li
            key={key}
            style={{ animationDelay: `${420 + index * 110}ms` }}
            className="zenith-tile flex gap-3 md:px-5 md:first:pl-0 md:last:pr-0"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-warning-soft font-mono text-xs font-bold text-warning tabular-nums ring-1 ring-warning/30">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="pt-1.5 text-sm leading-relaxed text-fg-muted">{translate(key)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function WithdrawalPage() {
  const { data, isLoading, isSubmitting, submitted, submit, reset } = useWithdrawal();
  const [step, setStep] = useState<Step>('method');
  const [methodId, setMethodId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<MessageKey | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5 sm:gap-6" aria-busy="true" aria-label={translate('common.loading')}>
        <Skeleton className="h-28 w-full rounded-[28px]" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-[22px]" />
          ))}
        </div>
      </div>
    );
  }

  if (data.accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          title={translate('withdrawal.noAccountsTitle')}
          description={translate('withdrawal.noAccountsText')}
          action={<LinkButton href="/accounts">{translate('nav.accounts')}</LinkButton>}
        />
      </Card>
    );
  }

  if (submitted) {
    function startOver() {
      setAmountInput('');
      setAmountError(null);
      setStep('method');
      reset();
    }

    return (
      <div className="flex flex-col gap-5 sm:gap-6">
        <PaymentStepHeader
          title={translate('withdrawal.successTitle')}
          description={translate('withdrawal.successText')}
          current={paymentStepKeys.length}
          stepsLabel={translate('withdrawal.stepsLabel')}
        />
        <Card>
          <EmptyState
            icon="checkCircle"
            title={translate('withdrawal.successTitle')}
            description={translate('withdrawal.successText')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={startOver}>{translate('withdrawal.another')}</Button>
                <LinkButton href="/history" variant="outline">
                  {translate('withdrawal.viewHistory')}
                </LinkButton>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  function chooseMethod(id: string) {
    setMethodId(id);
    setAmountError(null);
    setStep('details');
  }

  if (step === 'method') {
    return (
      <div className="flex flex-col gap-5 sm:gap-6">
        <PaymentStepHeader
          title={translate('withdrawal.chooseTitle')}
          description={translate('withdrawal.subtitle')}
          current={0}
          stepsLabel={translate('withdrawal.stepsLabel')}
        />
        <WithdrawalMethodGates methods={data.methods} onChoose={chooseMethod} />
      </div>
    );
  }

  const method = data.methods.find((item) => item.id === methodId) ?? data.methods[0];
  const account = data.accounts.find((item) => item.id === accountId) ?? data.accounts[0];
  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const fee = (validAmount * method.feePercent) / 100;
  const received = Math.max(0, validAmount - fee);
  const withdrawable = roundDownToCents(Math.max(0, Math.min(account.freeMargin, method.maxAmount)));
  const canWithdraw = withdrawable >= method.minAmount;
  const usedShare = account.freeMargin > 0 ? Math.min(validAmount / account.freeMargin, 1) : 0;

  function setAmount(value: string) {
    setAmountInput(value);
    setAmountError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateAmount(amount, method, account);
    setAmountError(error);
    if (error) return;
    await submit({ methodId: method.id, accountId: account.id, amount });
  }

  // Aurora withdrawal details: origin tags and the amount runway on the left, the live boarding pass (receipt + submit) on the right.
  const isOverBalance = validAmount > account.freeMargin;
  const usedPercent = Math.round(usedShare * 100);
  const litLights = Math.round(usedShare * RUNWAY_LIGHTS);
  const meterTone = isOverBalance ? 'bg-(--zenith-red)' : 'bg-(--hero-buy)';
  const labelClass = 'text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase';
  const receiptRows = [
    { label: translate('payment.methodsLabel'), value: method.name },
    { label: translate('withdrawal.account'), value: account.login },
    { label: translate('withdrawal.toAccount'), value: method.name },
    { label: translate('payment.averageTime'), value: durationLabel(method.averageMinutes) },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PaymentStepHeader
        title={translate('withdrawal.detailsTitle')}
        description={translate('withdrawal.detailsText')}
        current={1}
        stepsLabel={translate('withdrawal.stepsLabel')}
      />

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-6 [perspective:1200px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Each account is a luggage tag: the punched hole fills with a check once it is the origin of the payout. */}
          <section aria-labelledby="withdrawal-from-label" className={cx(boardCard, 'zenith-tile p-5 sm:p-6')}>
            <p id="withdrawal-from-label" className={labelClass}>
              {translate('withdrawal.account')}
            </p>
            <div role="group" aria-labelledby="withdrawal-from-label" className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.accounts.map((item, index) => {
                const isActive = item.id === account.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setAccountId(item.id);
                      setAmountError(null);
                    }}
                    style={{ animationDelay: `${120 + index * 80}ms` }}
                    className={cx(
                      'aurora-ticket relative isolate flex min-w-0 items-center gap-3 overflow-hidden rounded-[20px] py-3.5 pr-4 pl-3 text-left transition-[translate,background-color,box-shadow] duration-300 motion-reduce:transition-none',
                      focusRing,
                      isActive ? 'bg-fg/[0.07] ring-2 ring-(--hero-buy)' : 'bg-fg/[0.03] ring-1 ring-fg/[0.08] hover:-translate-y-0.5 hover:ring-fg/20',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        'grid size-9 shrink-0 place-items-center rounded-full transition-all duration-300 motion-reduce:transition-none',
                        isActive ? 'scale-105 bg-(--aurora-cta-from) text-(--aurora-cta-fg)' : 'bg-app text-transparent ring-1 ring-fg/15',
                      )}
                    >
                      <Icon name="check" size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm font-semibold tracking-wider text-fg">{item.login}</span>
                      <span className="block truncate text-xs text-fg-muted">{item.group}</span>
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="block text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('withdrawal.available')}</span>
                      <span className="block truncate text-base font-light tracking-[-0.01em] text-fg tabular-nums">{formatMoney(item.freeMargin, item.currency)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="withdrawal-amount-title" className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-6 p-5 [animation-delay:80ms] sm:p-6')}>
            <h2 id="withdrawal-amount-title" className="sr-only">
              {translate('withdrawal.amount')}
            </h2>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-fg-muted">{translate('withdrawal.available')}</p>
                <p className="mt-1 truncate text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">{formatMoney(account.freeMargin, account.currency)}</p>
              </div>
              <div className="text-right">
                <p className={cx('text-3xl font-semibold tabular-nums', isOverBalance ? 'text-(--zenith-red)' : 'text-(--hero-buy)')}>{usedPercent}%</p>
                {validAmount > 0 && (
                  <p className={cx('text-xs font-semibold tabular-nums', isOverBalance ? 'text-(--zenith-red)' : 'text-fg-muted')}>
                    {translate('withdrawal.usingShare', { percent: usedPercent })}
                  </p>
                )}
              </div>
            </div>

            {/* Free margin as a runway: edge lights up to the share being withdrawn, and the marker taxis to that point. */}
            <div aria-hidden="true" className="relative h-16 overflow-hidden rounded-2xl bg-fg/[0.04] ring-1 ring-fg/10">
              <span className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-fg/15" />
              {['top-2.5', 'bottom-2.5'].map((edge) => (
                <span key={edge} className={cx('absolute inset-x-6 flex justify-between', edge)}>
                  {Array.from({ length: RUNWAY_LIGHTS }, (_, light) => {
                    const isLit = light < litLights;
                    return (
                      <span
                        key={light}
                        style={isLit ? { animationDelay: `${light * 60}ms` } : undefined}
                        className={cx('size-1.5 rounded-full transition-colors duration-300 motion-reduce:transition-none', isLit ? cx('aurora-runway-lit', meterTone) : 'bg-fg/15')}
                      />
                    );
                  })}
                </span>
              ))}
              <span className="absolute inset-x-6 inset-y-0">
                <span
                  style={{ left: `${usedShare * 100}%` }}
                  className={cx(
                    'absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[0_6px_16px_-6px_rgb(0_0_0/0.5)] transition-[left,background-color] duration-500 ease-out motion-reduce:transition-none',
                    isOverBalance ? 'bg-(--zenith-red) text-surface' : 'bg-(--aurora-cta-from) text-(--aurora-cta-fg)',
                  )}
                >
                  <Icon name="withdrawal" size={15} />
                </span>
              </span>
            </div>

            <Field
              label={translate('withdrawal.amount')}
              htmlFor="withdrawal-amount"
              hint={`${translate('payment.limits')}: ${limitsText(method)}`}
              error={amountError ? translate(amountError) : undefined}
            >
              <Input
                id="withdrawal-amount"
                type="number"
                inputMode="decimal"
                min={method.minAmount}
                max={withdrawable}
                step="0.01"
                placeholder="0.00"
                value={amountInput}
                invalid={Boolean(amountError)}
                onChange={(event) => setAmount(event.target.value)}
                className="text-3xl font-light tracking-[-0.03em] tabular-nums"
                rightSlot={<span className="pr-4 text-sm font-semibold text-(--hero-buy)">{method.currency}</span>}
              />
            </Field>

            {canWithdraw && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AMOUNT_SHARES.map((share, index) => {
                  const value = roundDownToCents(withdrawable * share);
                  const isActive = validAmount === value;
                  const isMax = share === 1;
                  return (
                    <button
                      key={share}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${isMax ? translate('withdrawal.max') : `${share * 100}%`} · ${formatMoney(value, method.currency)}`}
                      disabled={value < method.minAmount}
                      onClick={() => setAmount(String(value))}
                      style={{ animationDelay: `${200 + index * 60}ms` }}
                      className={cx(
                        'animate-pop-in flex min-w-0 flex-col items-start gap-0.5 rounded-2xl px-3.5 py-3 text-left transition-[translate,background-color,box-shadow] duration-300 disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                        focusRing,
                        isActive ? 'bg-(--aurora-cta-from) text-(--aurora-cta-fg)' : 'bg-fg/[0.03] text-fg ring-1 ring-fg/10 hover:-translate-y-0.5 hover:ring-fg/25',
                      )}
                    >
                      <span className="text-sm font-bold">{isMax ? translate('withdrawal.max') : `${share * 100}%`}</span>
                      <span className={cx('w-full truncate text-[11px] tabular-nums', isActive ? 'opacity-75' : 'text-fg-muted')}>{formatMoney(value, method.currency)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* The payout as a live boarding pass: origin → destination on the sage header, receipt below, tear-off stub with the submit. */}
        <aside className="min-w-0 lg:sticky lg:top-24">
          <section aria-labelledby="withdrawal-summary" className={cx(ticketShell, 'aurora-ticket [animation-delay:160ms]')}>
            <span aria-hidden="true" className="aurora-ticket-shine pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-linear-to-r from-transparent via-white/[0.14] to-transparent" />

            <header className="relative isolate overflow-hidden bg-(--aurora-cta-from) p-5 text-(--aurora-cta-fg)">
              <WaveLines color="white" opacity={0.4} />
              <div className="flex items-center justify-between gap-3">
                <h2 id="withdrawal-summary" className="text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-75">
                  {translate('withdrawal.summary')}
                </h2>
                <button
                  type="button"
                  onClick={() => setStep('method')}
                  className={cx(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-(--aurora-cta-fg)/10 px-3 text-xs font-semibold ring-1 ring-(--aurora-cta-fg)/20 transition-[background-color,translate] hover:-translate-x-0.5 hover:bg-(--aurora-cta-fg)/15 motion-reduce:transition-none',
                    focusRing,
                  )}
                >
                  <Icon name="arrowLeft" size={12} />
                  {translate('withdrawal.changeMethod')}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold tracking-[0.12em] uppercase opacity-70">{translate('withdrawal.account')}</p>
                  <p className="mt-0.5 truncate font-mono text-lg font-bold tracking-wider">{account.login}</p>
                  <p className="truncate text-xs opacity-75">{account.group}</p>
                </div>
                <FlightArc tone="ink" />
                <div className="min-w-0 text-right">
                  <p className="truncate text-[10px] font-semibold tracking-[0.12em] uppercase opacity-70">{translate('withdrawal.toAccount')}</p>
                  <p className="mt-0.5 truncate text-lg font-bold">{method.name}</p>
                  <p className="truncate font-mono text-xs opacity-75">({method.id})</p>
                </div>
              </div>
            </header>

            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-fg/[0.03] p-3 ring-1 ring-fg/[0.08]">
                <MethodBadge method={method} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className={labelClass}>{translate('withdrawal.selectedMethod')}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-fg">
                    {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)}
                  </p>
                </div>
                <FeeChip method={method} />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-fg-muted">{translate('withdrawal.total')}</p>
                <p className="mt-0.5 truncate text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">
                  <AnimatedMoney value={validAmount} currency={method.currency} />
                </p>
              </div>

              <dl className="flex flex-col gap-3">
                {receiptRows.map((row) => (
                  <div key={row.label} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-fg-muted">{row.label}</dt>
                    <dd className="truncate font-semibold text-fg tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative flex flex-col gap-4 border-t-2 border-dashed border-fg/15 p-5">
              <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full bg-app ring-1 ring-fg/10" />
              <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full bg-app ring-1 ring-fg/10" />

              {/* The payout as a subtraction: debited, minus the fee, equals what arrives. */}
              <dl className="flex flex-col gap-2 font-mono text-sm tabular-nums">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <dt className="truncate font-sans text-fg-muted">{translate('withdrawal.debited')}</dt>
                  <dd className="shrink-0 font-semibold text-fg">{formatMoney(validAmount, method.currency)}</dd>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <dt className="flex min-w-0 items-center gap-2 font-sans text-fg-muted">
                    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-fg/[0.07] font-mono text-xs text-fg">
                      −
                    </span>
                    <span className="truncate">{translate('payment.fee')}</span>
                  </dt>
                  <dd className="shrink-0 font-semibold text-fg">{formatMoney(fee, method.currency)}</dd>
                </div>
                <div className="mt-2 flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-(--hero-buy)/10 py-3 pr-4 pl-3 ring-1 ring-(--hero-buy)/40">
                  <dt className="flex min-w-0 items-center gap-2 font-sans font-semibold text-fg">
                    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-(--aurora-cta-from) font-mono text-xs text-(--aurora-cta-fg)">
                      =
                    </span>
                    <span className="truncate">{translate('withdrawal.youReceive')}</span>
                  </dt>
                  <dd className="shrink-0 text-lg font-bold text-(--hero-buy)">{formatMoney(received, method.currency)}</dd>
                </div>
              </dl>

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className={cx(
                  'relative isolate inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-fg text-sm font-bold text-surface transition-transform duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none',
                  focusRing,
                )}
              >
                <span aria-hidden="true" className="aurora-ticket-shine pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />
                <Icon name={isSubmitting ? 'refresh' : 'withdrawal'} size={16} className={cx(isSubmitting && 'animate-spin motion-reduce:animate-none')} />
                {translate('withdrawal.submit')}
              </button>

              <TicketBarcode seed={`${account.login}${method.id}`} />
            </div>
          </section>
        </aside>
      </form>

      <WithdrawalNotice />
    </div>
  );
}

/** Decorative barcode on the stub, derived from the account + method so it changes with the pass. */
function TicketBarcode({ seed }: { seed: string }) {
  const bars = Array.from(seed.repeat(4).slice(0, BARCODE_BARS), (char) => (char.charCodeAt(0) % 3) + 1);
  return (
    <span aria-hidden="true" className="flex h-8 items-stretch justify-center gap-[2px] opacity-60">
      {bars.map((width, index) => (
        <span key={index} className="rounded-[1px] bg-fg" style={{ width }} />
      ))}
    </span>
  );
}

function WaveLines({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[200%]">
      {WAVE_PATHS.map((path) => (
        <path key={path} d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
