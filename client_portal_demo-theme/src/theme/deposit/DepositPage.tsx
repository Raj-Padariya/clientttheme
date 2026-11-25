'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useDeposit } from '@/core/pages/useDeposit';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
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
import { DepositNotice, NeedHelpCard, PaymentInstructions, ProofDropzone } from './DepositExtras';

type Step = 'method' | 'details';

const PRESET_AMOUNTS = [100, 250, 500, 1000, 5000];
const MAX_PRESETS = 4;
const NOTE_MAX = 500;

// The demo has no OCR, so a stable id is derived from the file; the real backend reads it off the screenshot.
function demoUtrFrom(file: File): string {
  return `UTR${String(file.lastModified).slice(-10)}`;
}

function validateAmount(amount: number, method: PaymentMethod): MessageKey | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'deposit.amountRequired';
  if (amount < method.minAmount || amount > method.maxAmount) return 'deposit.amountOutOfRange';
  return null;
}

export default function DepositPage() {
  const { data, isLoading, isSubmitting, submitted, submit, reset } = useDeposit();
  const [step, setStep] = useState<Step>('method');
  const [methodId, setMethodId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<MessageKey | null>(null);
  const [utr, setUtr] = useState('');
  const [utrAutoFilled, setUtrAutoFilled] = useState(false);
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const attachProof = useCallback(
    (file: File | null) => {
      setProofFile(file);
      if (file && !utr) {
        setUtr(demoUtrFrom(file));
        setUtrAutoFilled(true);
      }
    },
    [utr],
  );

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
          title={translate('deposit.noAccountsTitle')}
          description={translate('deposit.noAccountsText')}
          action={<LinkButton href="/accounts">{translate('nav.accounts')}</LinkButton>}
        />
      </Card>
    );
  }

  if (submitted) {
    function startOver() {
      setAmountInput('');
      setAmountError(null);
      setUtr('');
      setUtrAutoFilled(false);
      setNote('');
      setProofFile(null);
      setStep('method');
      reset();
    }

    return (
      <div className="flex flex-col gap-5 sm:gap-6">
        <PaymentStepHeader
          title={translate('deposit.successTitle')}
          description={translate('deposit.successText')}
          current={paymentStepKeys.length}
          stepsLabel={translate('deposit.stepsLabel')}
        />
        <Card>
          <EmptyState
            icon="checkCircle"
            title={translate('deposit.successTitle')}
            description={translate('deposit.successText')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={startOver}>{translate('deposit.another')}</Button>
                <LinkButton href="/history" variant="outline">
                  {translate('deposit.viewHistory')}
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
          title={translate('deposit.chooseTitle')}
          description={translate('deposit.subtitle')}
          current={0}
          stepsLabel={translate('deposit.stepsLabel')}
        />
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {data.methods.map((item, index) => (
            <MethodCard
              key={item.id}
              method={item}
              index={index}
              actionLabel={translate('deposit.processFor')}
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
  const presets = PRESET_AMOUNTS.filter((value) => value >= method.minAmount && value <= method.maxAmount).slice(0, MAX_PRESETS);

  function setAmount(value: string) {
    setAmountInput(value);
    setAmountError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateAmount(amount, method);
    setAmountError(error);
    if (error) return;
    await submit({ methodId: method.id, accountId: account.id, amount });
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PaymentStepHeader
        title={translate('deposit.detailsTitle')}
        description={translate('deposit.detailsText')}
        current={1}
        stepsLabel={translate('deposit.stepsLabel')}
      />

      {/* grid-cols-1 = minmax(0,1fr): without it the phone column grows to its widest child (the instructions table) and the page scrolls sideways. */}
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-2">
          <div className="glow-border relative flex animate-rise flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[24px] bg-surface-2/40 p-5 motion-reduce:animate-none light:bg-surface light:shadow-card">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <div className="relative flex min-w-0 items-center gap-4">
              <MethodBadge method={method} size="lg" />
              <div className="min-w-0">
                <p className="text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('deposit.selectedMethod')}</p>
                <p className="mt-0.5 truncate text-lg font-semibold text-fg">{method.name}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)} · {limitsText(method)}
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-3">
              <FeeChip method={method} />
              <Button type="button" size="sm" variant="outline" leftIcon="arrowLeft" onClick={() => setStep('method')}>
                {translate('deposit.changeMethod')}
              </Button>
            </div>
          </div>

          <Card className="flex animate-rise flex-col gap-5 [animation-delay:120ms] motion-reduce:animate-none">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={translate('deposit.account')} htmlFor="deposit-account">
                <Select id="deposit-account" value={account.id} onChange={(event) => setAccountId(event.target.value)}>
                  {data.accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.login} · {item.group} · {formatMoney(item.balance, item.currency)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={translate('deposit.amount')}
                htmlFor="deposit-amount"
                hint={`${translate('payment.limits')}: ${limitsText(method)}`}
                error={amountError ? translate(amountError) : undefined}
              >
                <Input
                  id="deposit-amount"
                  type="number"
                  inputMode="decimal"
                  min={method.minAmount}
                  max={method.maxAmount}
                  step="0.01"
                  placeholder="0.00"
                  value={amountInput}
                  invalid={Boolean(amountError)}
                  onChange={(event) => setAmount(event.target.value)}
                  rightSlot={<span className="pr-3 text-sm text-fg-subtle">{method.currency}</span>}
                />
              </Field>
            </div>

            {presets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-fg-muted">{translate('deposit.quickAmounts')}</span>
                {presets.map((value) => {
                  const isActive = validAmount === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setAmount(String(value))}
                      className={cx(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isActive ? 'border-primary bg-primary-soft text-primary' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      {formatMoney(value, method.currency)}
                    </button>
                  );
                })}
              </div>
            )}

            <Field
              label={translate('deposit.utr')}
              htmlFor="deposit-utr"
              optional
              hint={
                utrAutoFilled ? (
                  <span className="inline-flex animate-rise items-center gap-1.5 text-success motion-reduce:animate-none">
                    <Icon name="checkCircle" size={12} />
                    {translate('deposit.utrAutoFilled')}
                  </span>
                ) : (
                  translate('deposit.utrHint')
                )
              }
            >
              <Input
                id="deposit-utr"
                leftIcon="fileText"
                placeholder={translate('deposit.utrPlaceholder')}
                value={utr}
                onChange={(event) => {
                  setUtr(event.target.value);
                  setUtrAutoFilled(false);
                }}
                className={cx('font-mono transition-shadow duration-500', utrAutoFilled && 'ring-3 ring-success/25')}
              />
            </Field>

            <Field label={translate('deposit.note')} htmlFor="deposit-note" optional>
              <div className="relative">
                <textarea
                  id="deposit-note"
                  rows={3}
                  maxLength={NOTE_MAX}
                  placeholder={translate('deposit.notePlaceholder')}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-3 pb-7 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-fg-subtle focus:border-primary focus:ring-3 focus:ring-ring/25"
                />
                <span className="pointer-events-none absolute right-3 bottom-2.5 flex items-center gap-2 text-[11px] text-fg-subtle tabular-nums">
                  <span aria-hidden="true" className="h-1 w-14 overflow-hidden rounded-full bg-line">
                    <span
                      className={cx('block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', note.length >= NOTE_MAX ? 'bg-danger' : 'bg-primary')}
                      style={{ width: `${(note.length / NOTE_MAX) * 100}%` }}
                    />
                  </span>
                  {translate('deposit.noteCount', { count: note.length, max: NOTE_MAX })}
                </span>
              </div>
            </Field>
          </Card>

          <Card className="flex animate-rise flex-col gap-3 [animation-delay:200ms] motion-reduce:animate-none">
            <label htmlFor="deposit-proof" className="text-sm font-medium text-fg">
              {translate('deposit.proof')}
              <span className="ml-1 font-normal text-fg-subtle">({translate('common.optional')})</span>
            </label>
            <ProofDropzone file={proofFile} onChange={attachProof} />
          </Card>
        </div>

        <div className="flex flex-col gap-5 sm:gap-6">
          <Card className="flex animate-rise flex-col gap-5 [animation-delay:240ms] motion-reduce:animate-none">
            <h2 className="text-base font-semibold text-fg">{translate('deposit.summary')}</h2>
            <dl className="flex flex-col gap-3">
              <SummaryRow label={translate('payment.methodsLabel')} value={method.name} />
              <SummaryRow label={translate('deposit.account')} value={account.login} />
              <SummaryRow label={translate('payment.averageTime')} value={durationLabel(method.averageMinutes)} />
              <SummaryRow label={translate('deposit.youReceive')} value={formatMoney(validAmount, method.currency)} />
              <SummaryRow label={translate('payment.fee')} value={formatMoney(fee, method.currency)} />
              <div className="border-t border-line pt-3">
                <SummaryRow label={translate('deposit.youPay')} value={formatMoney(validAmount + fee, method.currency)} strong />
              </div>
            </dl>
            <Button type="submit" fullWidth loading={isSubmitting} leftIcon="deposit" className="relative overflow-hidden">
              {!isSubmitting && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
              <span className="relative">{translate('deposit.submit')}</span>
            </Button>
          </Card>
          <PaymentInstructions />
          <NeedHelpCard />
        </div>
      </form>

      <DepositNotice />
    </div>
  );
}
