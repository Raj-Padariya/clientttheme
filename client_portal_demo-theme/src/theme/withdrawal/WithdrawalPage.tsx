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
  MethodCard,
  PaymentStepHeader,
  paymentStepKeys,
  SummaryRow,
} from '../payment/PaymentParts';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Field, Input, Select } from '../ui/Input';

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
      className="glow-border relative animate-rise overflow-hidden rounded-[24px] bg-surface-2/40 p-5 [--glow-color:var(--warning)] [animation-delay:320ms] motion-reduce:animate-none sm:p-6 light:bg-surface light:shadow-card"
    >
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
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-[24px]" />
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
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {data.methods.map((item, index) => (
            <MethodCard
              key={item.id}
              method={item}
              index={index}
              actionLabel={translate('withdrawal.proceedTo')}
              onChoose={() => chooseMethod(item.id)}
            />
          ))}
        </ul>
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PaymentStepHeader
        title={translate('withdrawal.detailsTitle')}
        description={translate('withdrawal.detailsText')}
        current={1}
        stepsLabel={translate('withdrawal.stepsLabel')}
      />

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-2">
          <div className="glow-border relative flex animate-rise flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[24px] bg-surface-2/40 p-5 motion-reduce:animate-none">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <div className="relative flex min-w-0 items-center gap-4">
              <MethodBadge method={method} size="lg" />
              <div className="min-w-0">
                <p className="text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('withdrawal.selectedMethod')}</p>
                <p className="mt-0.5 truncate text-lg font-semibold text-fg">
                  {method.name} <span className="font-mono text-xs font-normal text-fg-subtle">({method.id})</span>
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)} · {limitsText(method)}
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-3">
              <FeeChip method={method} />
              <Button type="button" size="sm" variant="outline" leftIcon="arrowLeft" onClick={() => setStep('method')}>
                {translate('withdrawal.changeMethod')}
              </Button>
            </div>
          </div>

          <Card className="flex animate-rise flex-col gap-5 [animation-delay:120ms] motion-reduce:animate-none">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={translate('withdrawal.account')} htmlFor="withdrawal-account">
                <Select
                  id="withdrawal-account"
                  value={account.id}
                  onChange={(event) => {
                    setAccountId(event.target.value);
                    setAmountError(null);
                  }}
                >
                  {data.accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.login} · {item.group}
                    </option>
                  ))}
                </Select>
              </Field>
              {/* Payouts go back to the method's own destination, so it is the only choice here. */}
              <Field label={translate('withdrawal.toAccount')} htmlFor="withdrawal-to-account">
                <Select id="withdrawal-to-account" value={method.id} onChange={() => undefined}>
                  <option value={method.id}>{method.name}</option>
                </Select>
              </Field>
            </div>

            {/* Available funds, with a bar showing how much of it the typed amount would take out. */}
            <div className="glow-border rounded-2xl bg-surface/60 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs text-fg-muted">{translate('withdrawal.available')}</p>
                {validAmount > 0 && (
                  <p className={cx('text-xs font-semibold tabular-nums', validAmount > account.freeMargin ? 'text-danger' : 'text-fg-muted')}>
                    {translate('withdrawal.usingShare', { percent: Math.round(usedShare * 100) })}
                  </p>
                )}
              </div>
              <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">
                {formatMoney(account.freeMargin, account.currency)}
              </p>
              <div aria-hidden="true" className="progress-track mt-3 h-1.5 overflow-hidden rounded-full">
                <span
                  className={cx(
                    'block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none',
                    validAmount > account.freeMargin ? 'bg-danger' : '[background-image:var(--brand-gradient)]',
                  )}
                  style={{ width: `${usedShare * 100}%` }}
                />
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
                rightSlot={<span className="pr-3 text-sm text-fg-subtle">{method.currency}</span>}
              />
            </Field>

            {canWithdraw && (
              <div className="grid grid-cols-4 gap-2">
                {AMOUNT_SHARES.map((share) => {
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
                      className={cx(
                        'rounded-xl border py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40',
                        isActive ? 'border-primary bg-primary-soft text-primary' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      {isMax ? translate('withdrawal.max') : `${share * 100}%`}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="flex animate-rise flex-col gap-5 [animation-delay:240ms] motion-reduce:animate-none lg:sticky lg:top-6">
          <h2 className="text-base font-semibold text-fg">{translate('withdrawal.summary')}</h2>

          <div className="glow-border relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-surface-2 to-surface-2 p-4 text-center">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-8 size-32 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
            <p className="relative text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('withdrawal.total')}</p>
            <p className="relative mt-1 truncate text-2xl font-bold tracking-tight text-fg tabular-nums">
              <AnimatedMoney value={validAmount} currency={method.currency} />
            </p>
          </div>

          <dl className="flex flex-col gap-3">
            <SummaryRow label={translate('payment.methodsLabel')} value={method.name} />
            <SummaryRow label={translate('withdrawal.account')} value={account.login} />
            <SummaryRow label={translate('withdrawal.toAccount')} value={method.name} />
            <SummaryRow label={translate('payment.averageTime')} value={durationLabel(method.averageMinutes)} />
            <SummaryRow label={translate('withdrawal.debited')} value={formatMoney(validAmount, method.currency)} />
            <SummaryRow label={translate('payment.fee')} value={formatMoney(fee, method.currency)} />
            <div className="border-t border-line pt-3">
              <SummaryRow label={translate('withdrawal.youReceive')} value={formatMoney(received, method.currency)} strong />
            </div>
          </dl>
          <Button type="submit" fullWidth loading={isSubmitting} leftIcon="withdrawal" className="relative overflow-hidden">
            {!isSubmitting && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
            <span className="relative">{translate('withdrawal.submit')}</span>
          </Button>
        </Card>
      </form>

      <WithdrawalNotice />
    </div>
  );
}
