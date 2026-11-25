'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useWithdrawal } from '@/core/pages/useWithdrawal';
import type { PaymentMethod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import {
  durationLabel,
  FeeChip,
  limitsText,
  MethodBadge,

  PaymentStepHeader,
  paymentStepKeys,
  SummaryRow,
} from '../payment/PaymentParts';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { WithdrawalMethodGates } from './WithdrawalMethodGates';

type Step = 'method' | 'details';

// Quick picks as a share of what can actually be withdrawn; 1 is the "Max" button.
const AMOUNT_SHARES = [0.25, 0.5, 0.75, 1];

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

function WithdrawalNotice() {
  return (
    <section
      aria-labelledby="withdrawal-notice-title"
      className="orbit-card relative animate-rise overflow-hidden p-5 [animation-delay:320ms] motion-reduce:animate-none sm:p-6"
    >
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -right-16 -bottom-20 -z-10 size-52 animate-orbit-spin-rev motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-12 size-48 animate-drift rounded-full bg-warning/10 blur-3xl motion-reduce:animate-none" />
      <h2 id="withdrawal-notice-title" className="relative flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="info" size={16} className="relative" />
        </span>
        {translate('withdrawal.noticeTitle')}
      </h2>
      <ol className="relative mt-4 grid gap-2.5">
        {NOTICE_KEYS.map((key, index) => (
          <li
            key={key}
            style={{ animationDelay: `${420 + index * 110}ms` }}
            className="group flex animate-rise gap-3 rounded-2xl bg-surface/50 p-3 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:translate-x-1 hover:ring-warning/40 motion-reduce:animate-none motion-reduce:transition-none"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-warning-soft font-mono text-[11px] font-bold text-warning ring-1 ring-warning/30 transition-transform duration-300 group-hover:scale-110">
              {String(index + 1).padStart(2, '0')}
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

  // Orbit withdrawal details: a payout route band on top (from: account cards → beam → to: the method's own
  // destination), then the amount desk with an available-funds gauge, and a payout receipt with the submit.
  const isOverBalance = validAmount > account.freeMargin;
  const usedPercent = Math.round(usedShare * 100);
  const labelClass = 'text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase';

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PaymentStepHeader
        title={translate('withdrawal.detailsTitle')}
        description={translate('withdrawal.detailsText')}
        current={1}
        stepsLabel={translate('withdrawal.stepsLabel')}
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className="orbit-card relative isolate animate-rise overflow-hidden p-5 motion-reduce:animate-none sm:p-6">
          <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -bottom-40 -left-40 -z-10 size-96 animate-orbit-spin-rev motion-reduce:animate-none" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 -z-10 size-80 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

          <div className="grid grid-cols-1 items-center gap-5 xl:grid-cols-[minmax(0,1.4fr)_96px_minmax(0,1fr)]">
            <div className="min-w-0">
              <p id="withdrawal-from-label" className={labelClass}>
                {translate('withdrawal.account')}
              </p>
              <div role="group" aria-labelledby="withdrawal-from-label" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        'relative isolate animate-rise overflow-hidden rounded-2xl border p-4 text-left transition-[translate,border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                        isActive
                          ? 'border-primary/60 bg-primary-soft/40 shadow-[0_18px_36px_-24px_var(--brand-primary)]'
                          : 'border-line bg-surface/60 hover:-translate-y-0.5 hover:border-primary/30',
                      )}
                    >
                      {isActive && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-sm font-semibold tracking-wider text-fg">{item.login}</span>
                        <span
                          aria-hidden="true"
                          className={cx(
                            'grid size-6 shrink-0 place-items-center rounded-full border transition-all duration-300',
                            isActive ? 'scale-100 border-primary bg-primary text-on-primary' : 'scale-90 border-line-strong text-transparent',
                          )}
                        >
                          <Icon name="check" size={12} />
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-fg-muted">{item.group}</span>
                      <span className="mt-3 block text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('withdrawal.available')}</span>
                      <span className="mt-0.5 block truncate text-lg font-light tracking-[-0.01em] text-fg tabular-nums">{formatMoney(item.freeMargin, item.currency)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <span aria-hidden="true" className="relative mx-auto flex items-center justify-center xl:h-6 xl:w-full">
              <span className="absolute inset-x-0 top-1/2 hidden h-[2px] -translate-y-1/2 overflow-hidden rounded-full bg-line xl:block">
                <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary to-transparent motion-reduce:animate-none" />
              </span>
              <span className="relative grid size-10 rotate-90 place-items-center rounded-full border border-primary/40 bg-surface text-primary shadow-[0_0_20px_-6px_var(--brand-primary)] xl:rotate-0">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/20 motion-reduce:hidden" />
                <Icon name="arrowRight" size={16} className="relative" />
              </span>
            </span>

            <div className="min-w-0">
              <p className={labelClass}>{translate('withdrawal.toAccount')}</p>
              {/* Payouts go back to the method's own destination, so it is shown rather than chosen. */}
              <div className="relative isolate mt-3 flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/40 bg-primary-soft/30 p-4">
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />
                <MethodBadge method={method} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('withdrawal.selectedMethod')}</p>
                  <p className="mt-0.5 truncate text-lg font-semibold text-fg">
                    {method.name} <span className="font-mono text-xs font-normal text-fg-subtle">({method.id})</span>
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <FeeChip method={method} />
                <Button type="button" size="sm" variant="outline" leftIcon="arrowLeft" onClick={() => setStep('method')}>
                  {translate('withdrawal.changeMethod')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <section
            aria-labelledby="withdrawal-amount-title"
            className="orbit-card relative isolate flex min-w-0 animate-rise flex-col gap-5 overflow-hidden p-5 [animation-delay:80ms] motion-reduce:animate-none sm:p-6"
          >
            <h2 id="withdrawal-amount-title" className="sr-only">
              {translate('withdrawal.amount')}
            </h2>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 opacity-60 [background-image:radial-gradient(color-mix(in_srgb,var(--brand-primary)_30%,transparent)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
            />

            {/* Available funds as a ring: the arc is the share of free margin the typed amount would take out. */}
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <span aria-hidden="true" className="relative grid size-32 shrink-0 place-items-center">
                <span className="orbit-ring absolute -inset-2 animate-orbit-spin opacity-60 motion-reduce:animate-none" />
                <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-line" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={`${usedShare * 100} 100`}
                    className={cx('transition-[stroke-dasharray] duration-500 motion-reduce:transition-none', isOverBalance ? 'stroke-danger' : 'stroke-primary')}
                  />
                </svg>
                <span className={cx('text-2xl font-semibold tabular-nums', isOverBalance ? 'text-danger' : 'text-fg')}>{usedPercent}%</span>
              </span>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs text-fg-muted">{translate('withdrawal.available')}</p>
                <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">{formatMoney(account.freeMargin, account.currency)}</p>
                {validAmount > 0 && (
                  <p className={cx('mt-1 text-xs font-semibold tabular-nums', isOverBalance ? 'text-danger' : 'text-fg-muted')}>
                    {translate('withdrawal.usingShare', { percent: usedPercent })}
                  </p>
                )}
              </div>
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
                className="text-2xl font-light tracking-[-0.02em] tabular-nums"
                rightSlot={<span className="pr-4 text-sm font-semibold text-primary">{method.currency}</span>}
              />
            </Field>

            {canWithdraw && (
              <div className="grid grid-cols-4 gap-2">
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
                        'animate-pop-in rounded-full border py-2.5 text-xs font-semibold transition-[border-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                        isActive
                          ? 'border-transparent bg-[image:var(--brand-gradient)] text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)]'
                          : 'border-line bg-surface/60 text-fg-muted hover:border-primary/40 hover:text-fg',
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
            <div className="relative isolate animate-rise rounded-[28px] border border-line bg-surface/85 p-3 shadow-pop backdrop-blur-xl [animation-delay:120ms] motion-reduce:animate-none">
              <div className="relative isolate overflow-hidden rounded-[22px] bg-[image:var(--brand-gradient)] p-5 text-on-primary shadow-[0_24px_48px_-28px_var(--brand-primary)]">
                <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-20 -right-20 -z-10 size-56 animate-orbit-spin-rev opacity-60 motion-reduce:animate-none" />
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                <h2 className="text-[10.5px] font-medium tracking-[0.14em] uppercase opacity-75">{translate('withdrawal.summary')}</h2>
                <p className="mt-4 text-xs opacity-75">{translate('withdrawal.total')}</p>
                <p className="mt-0.5 truncate text-4xl font-light tracking-[-0.03em] tabular-nums">
                  <AnimatedMoney value={validAmount} currency={method.currency} />
                </p>
                <p className="mt-3 truncate text-xs opacity-80">
                  {account.login} → {method.name}
                </p>
              </div>

              <div aria-hidden="true" className="relative mx-2 my-1 h-5">
                <span className="absolute inset-x-3 top-1/2 border-t-2 border-dotted border-line-strong" />
              </div>

              <dl className="flex flex-col gap-3 px-3">
                <SummaryRow label={translate('payment.methodsLabel')} value={method.name} />
                <SummaryRow label={translate('withdrawal.account')} value={account.login} />
                <SummaryRow label={translate('withdrawal.toAccount')} value={method.name} />
                <SummaryRow label={translate('payment.averageTime')} value={durationLabel(method.averageMinutes)} />
                <SummaryRow label={translate('withdrawal.debited')} value={formatMoney(validAmount, method.currency)} />
                <SummaryRow label={translate('payment.fee')} value={formatMoney(fee, method.currency)} />
                <div className="rounded-2xl border border-primary/30 bg-primary-soft px-3.5 py-3">
                  <SummaryRow label={translate('withdrawal.youReceive')} value={formatMoney(received, method.currency)} strong />
                </div>
              </dl>

              <div className="px-3 pt-5 pb-3">
                <Button type="submit" size="lg" fullWidth loading={isSubmitting} leftIcon="withdrawal" className="relative overflow-hidden">
                  {!isSubmitting && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
                  <span className="relative">{translate('withdrawal.submit')}</span>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>

      <WithdrawalNotice />
    </div>
  );
}
