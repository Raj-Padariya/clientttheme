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
import { WithdrawalMethodGates } from './WithdrawalMethodGates';

type Step = 'method' | 'details';

// Quick picks as a share of what can actually be withdrawn; 1 is the "Max" button.
const AMOUNT_SHARES = [0.25, 0.5, 0.75, 1];
const METER_PIXELS = 40;

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

// The three payout rules as a horizontal strip of numbered notes under a warning heading.
function WithdrawalNotice() {
  return (
    <section aria-labelledby="withdrawal-notice-title" className={cx(boardCard, 'zenith-tile p-5 [animation-delay:320ms] sm:p-6')}>
      <h2 id="withdrawal-notice-title" className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="info" size={16} className="relative" />
        </span>
        {translate('withdrawal.noticeTitle')}
      </h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {NOTICE_KEYS.map((key, index) => (
          <li
            key={key}
            style={{ animationDelay: `${420 + index * 110}ms` }}
            className="zenith-tile flex flex-col gap-3 rounded-[20px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.08] transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-warning/40 motion-reduce:transition-none"
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-2xl font-light text-warning tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-warning/40 to-transparent" />
            </span>
            <p className="text-sm leading-relaxed text-fg-muted">{translate(key)}</p>
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

  // Zenith withdrawal details: a route card on top (from-account picker → running bead → the method's own destination),
  // then the amount desk with a pixel meter of free margin, and a subtraction receipt with the submit on the right.
  const isOverBalance = validAmount > account.freeMargin;
  const usedPercent = Math.round(usedShare * 100);
  const litPixels = Math.round(usedShare * METER_PIXELS);
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

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className={cx(boardCard, 'zenith-tile relative isolate overflow-hidden p-5 sm:p-6')}>
          <div className="grid grid-cols-1 items-center gap-5 xl:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)]">
            <div className="min-w-0">
              <p id="withdrawal-from-label" className={labelClass}>
                {translate('withdrawal.account')}
              </p>
              <div role="group" aria-labelledby="withdrawal-from-label" className="mt-3 flex flex-col gap-2">
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
                      style={{ animationDelay: `${120 + index * 70}ms` }}
                      className={cx(
                        'zenith-tile relative isolate flex min-w-0 items-center gap-3 overflow-hidden rounded-full py-2.5 pr-5 pl-2.5 text-left transition-[translate,background-color,box-shadow] duration-300 motion-reduce:transition-none',
                        focusRing,
                        isActive ? 'bg-fg/[0.07] ring-2 ring-(--hero-buy)' : 'bg-fg/[0.03] ring-1 ring-fg/[0.08] hover:translate-x-0.5 hover:ring-fg/20',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'grid size-9 shrink-0 place-items-center rounded-full transition-all duration-300',
                          isActive ? 'bg-(--hero-buy) text-[#160904]' : 'text-transparent ring-1 ring-fg/20',
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
            </div>

            <span aria-hidden="true" className="relative mx-auto flex h-10 w-full items-center justify-center max-xl:w-24 max-xl:rotate-90">
              <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-fg/25" />
              <span className="zenith-route absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hero-buy)" />
              <span className="relative grid size-10 place-items-center rounded-full bg-surface text-(--hero-buy) ring-1 ring-fg/15">
                <Icon name="arrowRight" size={16} />
              </span>
            </span>

            <div className="min-w-0">
              <p className={labelClass}>{translate('withdrawal.toAccount')}</p>
              {/* Payouts go back to the method's own destination, so it is shown rather than chosen. */}
              <div className="relative isolate mt-3 flex items-center gap-4 overflow-hidden rounded-[22px] bg-(--hero-buy) p-4 text-[#160904]">
                <WaveLines color="white" opacity={0.4} />
                <MethodBadge method={method} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase opacity-70">{translate('withdrawal.selectedMethod')}</p>
                  <p className="mt-0.5 truncate text-lg font-semibold">
                    {method.name} <span className="font-mono text-xs font-normal opacity-70">({method.id})</span>
                  </p>
                  <p className="truncate text-xs font-medium opacity-80">
                    {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <FeeChip method={method} />
                <button
                  type="button"
                  onClick={() => setStep('method')}
                  className={cx(
                    'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-fg ring-1 ring-fg/15 transition-[background-color,transform] hover:-translate-x-0.5 hover:bg-fg/[0.06] motion-reduce:transition-none',
                    focusRing,
                  )}
                >
                  <Icon name="arrowLeft" size={13} />
                  {translate('withdrawal.changeMethod')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <section aria-labelledby="withdrawal-amount-title" className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-6 p-5 [animation-delay:80ms] sm:p-6')}>
            <h2 id="withdrawal-amount-title" className="sr-only">
              {translate('withdrawal.amount')}
            </h2>

            {/* Free margin as a pixel meter: lit pixels are the share of free margin the typed amount would take out. */}
            <div className="flex flex-col gap-4">
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
              <span aria-hidden="true" className="grid h-10 grid-cols-[repeat(40,minmax(0,1fr))] gap-[3px]">
                {Array.from({ length: METER_PIXELS }, (_, pixel) => (
                  <span
                    key={pixel}
                    style={{ transitionDelay: `${pixel * 12}ms` }}
                    className={cx(
                      'rounded-[3px] transition-colors duration-300 motion-reduce:transition-none',
                      pixel < litPixels ? (isOverBalance ? 'bg-(--zenith-red)' : 'bg-(--hero-buy)') : 'bg-fg/[0.07]',
                    )}
                  />
                ))}
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
              <div className="grid grid-cols-4 gap-1 rounded-full bg-fg/[0.05] p-1 ring-1 ring-fg/10">
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
                        'animate-pop-in rounded-full py-2.5 text-xs font-semibold transition-[color,background-color] duration-300 disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                        focusRing,
                        isActive ? 'bg-fg text-surface' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                      )}
                    >
                      {isMax ? translate('withdrawal.max') : `${share * 100}%`}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <section aria-labelledby="withdrawal-summary" className={cx(boardCard, 'zenith-tile flex flex-col gap-5 p-5 [animation-delay:120ms]')}>
              <div className="min-w-0">
                <h2 id="withdrawal-summary" className={labelClass}>
                  {translate('withdrawal.summary')}
                </h2>
                <p className="mt-4 text-xs text-fg-muted">{translate('withdrawal.total')}</p>
                <p className="mt-0.5 truncate text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">
                  <AnimatedMoney value={validAmount} currency={method.currency} />
                </p>
                <p className="mt-2 flex min-w-0 items-center gap-2 text-xs text-fg-muted">
                  <span className="truncate font-mono">{account.login}</span>
                  <Icon name="arrowRight" size={12} className="shrink-0 text-(--hero-buy)" />
                  <span className="truncate">{method.name}</span>
                </p>
              </div>

              <dl className="flex flex-col gap-3 border-y border-dashed border-fg/12 py-4">
                {receiptRows.map((row) => (
                  <div key={row.label} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-fg-muted">{row.label}</dt>
                    <dd className="truncate font-semibold text-fg tabular-nums">{row.value}</dd>
                  </div>
                ))}
              </dl>

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
                <div className="relative isolate mt-2 flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-full bg-(--hero-buy) py-3 pr-5 pl-4 text-[#160904]">
                  <WaveLines color="white" opacity={0.4} />
                  <dt className="flex min-w-0 items-center gap-2 font-sans font-semibold">
                    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-[#160904] font-mono text-xs text-(--hero-buy)">
                      =
                    </span>
                    <span className="truncate">{translate('withdrawal.youReceive')}</span>
                  </dt>
                  <dd className="shrink-0 text-base font-bold">{formatMoney(received, method.currency)}</dd>
                </div>
              </dl>

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className={cx(
                  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fg text-sm font-bold text-surface transition-transform duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none',
                  focusRing,
                )}
              >
                <Icon name={isSubmitting ? 'refresh' : 'withdrawal'} size={16} className={cx(isSubmitting && 'animate-spin motion-reduce:animate-none')} />
                {translate('withdrawal.submit')}
              </button>
            </section>
          </aside>
        </div>
      </form>

      <WithdrawalNotice />
    </div>
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
