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
  PaymentStepHeader,
  paymentStepKeys,
  SummaryRow,
} from '../payment/PaymentParts';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { DepositNotice, NeedHelpCard, PaymentInstructions, ProofDropzone } from './DepositExtras';
import { DepositMethodPicker } from './DepositMethodPicker';

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
        <DepositMethodPicker methods={data.methods} onChoose={chooseMethod} />
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

  // Orbit deposit details: a full-width amount stage on top (method, big amount, quick picks, account cards),
  // reference and proof as cards below, and a receipt ticket with the submit pinned on the right.
  const youPay = validAmount + fee;
  const cardTitleClass = 'flex items-center gap-3 text-base font-semibold text-fg';
  const cardIconClass = 'grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/30';

  return (
    <div className="flex flex-col gap-6">
      <PaymentStepHeader
        title={translate('deposit.detailsTitle')}
        description={translate('deposit.detailsText')}
        current={1}
        stepsLabel={translate('deposit.stepsLabel')}
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section aria-label={translate('deposit.amount')} className="orbit-card relative isolate animate-rise overflow-hidden p-5 motion-reduce:animate-none sm:p-6">
          <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-40 -right-40 -z-10 size-96 animate-orbit-spin motion-reduce:animate-none" />
          <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-20 -right-20 -z-10 size-60 animate-orbit-spin-rev opacity-60 motion-reduce:animate-none" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-80 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-10">
            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface/70 p-3 ring-1 ring-line backdrop-blur">
                <MethodBadge method={method} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('deposit.selectedMethod')}</p>
                  <p className="truncate text-base font-semibold text-fg">{method.name}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <FeeChip method={method} />
                  <Button type="button" size="sm" variant="outline" leftIcon="arrowLeft" onClick={() => setStep('method')}>
                    {translate('deposit.changeMethod')}
                  </Button>
                </div>
              </div>

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
                  className="text-2xl font-light tracking-[-0.02em] tabular-nums"
                  rightSlot={<span className="pr-4 text-sm font-semibold text-primary">{method.currency}</span>}
                />
              </Field>

              {presets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-fg-muted">{translate('deposit.quickAmounts')}</span>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((value, index) => {
                      const isActive = validAmount === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setAmount(String(value))}
                          style={{ animationDelay: `${200 + index * 60}ms` }}
                          className={cx(
                            'relative animate-pop-in overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold tabular-nums transition-[border-color,color,background-color,translate] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
                            isActive
                              ? 'border-transparent bg-[image:var(--brand-gradient)] text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)]'
                              : 'border-line bg-surface/60 text-fg-muted hover:-translate-y-0.5 hover:border-primary/40 hover:text-fg',
                          )}
                        >
                          {formatMoney(value, method.currency)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <p id="deposit-account-label" className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
                {translate('deposit.account')}
              </p>
              <div role="group" aria-labelledby="deposit-account-label" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.accounts.map((item, index) => {
                  const isActive = item.id === account.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setAccountId(item.id)}
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
                      <span className="mt-3 block truncate text-lg font-light tracking-[-0.01em] text-fg tabular-nums">{formatMoney(item.balance, item.currency)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="deposit-reference" className="orbit-card relative isolate flex animate-rise flex-col gap-4 overflow-hidden p-5 [animation-delay:80ms] motion-reduce:animate-none">
              <h2 id="deposit-reference" className={cardTitleClass}>
                <span className={cardIconClass}>
                  <Icon name="fileText" size={15} />
                </span>
                {translate('deposit.utr')}
              </h2>
              <Field
                label={translate('deposit.utr')}
                htmlFor="deposit-utr"
                optional
                className="[&>label]:sr-only"
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
                    className="w-full resize-y rounded-xl border border-line-strong bg-surface/70 px-3.5 py-3 pb-7 text-sm text-fg outline-none backdrop-blur transition-colors placeholder:text-fg-subtle hover:border-primary/40 focus:border-primary focus:ring-3 focus:ring-ring/25"
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
            </section>

            <section aria-labelledby="deposit-proof-title" className="orbit-card relative isolate flex animate-rise flex-col gap-4 overflow-hidden p-5 [animation-delay:140ms] motion-reduce:animate-none">
              <h2 id="deposit-proof-title" className={cardTitleClass}>
                <span className={cardIconClass}>
                  <Icon name="deposit" size={15} />
                </span>
                <label htmlFor="deposit-proof">
                  {translate('deposit.proof')}
                  <span className="ml-1 font-normal text-fg-subtle">({translate('common.optional')})</span>
                </label>
              </h2>
              <ProofDropzone file={proofFile} onChange={attachProof} />
              <PaymentInstructions />
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24">
            <div className="relative isolate animate-rise rounded-[28px] border border-line bg-surface/85 p-3 shadow-pop backdrop-blur-xl [animation-delay:120ms] motion-reduce:animate-none">
              <div className="relative isolate overflow-hidden rounded-[22px] bg-[image:var(--brand-gradient)] p-5 text-on-primary shadow-[0_24px_48px_-28px_var(--brand-primary)]">
                <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-20 -right-20 -z-10 size-56 animate-orbit-spin opacity-60 motion-reduce:animate-none" />
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                <h2 className="text-[10.5px] font-medium tracking-[0.14em] uppercase opacity-75">{translate('deposit.summary')}</h2>
                <p className="mt-4 text-xs opacity-75">{translate('deposit.youPay')}</p>
                <p key={youPay} className="mt-0.5 animate-pop-in truncate text-4xl font-light tracking-[-0.03em] tabular-nums motion-reduce:animate-none">
                  {formatMoney(youPay, method.currency)}
                </p>
                <p className="mt-3 truncate text-xs opacity-80">
                  {method.name} · {account.login}
                </p>
              </div>

              <div aria-hidden="true" className="relative mx-2 my-1 h-5">
                <span className="absolute inset-x-3 top-1/2 border-t-2 border-dotted border-line-strong" />
              </div>

              <dl className="flex flex-col gap-3 px-3">
                <SummaryRow label={translate('payment.methodsLabel')} value={method.name} />
                <SummaryRow label={translate('deposit.account')} value={account.login} />
                <SummaryRow label={translate('payment.averageTime')} value={durationLabel(method.averageMinutes)} />
                <SummaryRow label={translate('deposit.youReceive')} value={formatMoney(validAmount, method.currency)} />
                <SummaryRow label={translate('payment.fee')} value={formatMoney(fee, method.currency)} />
              </dl>

              <div className="px-3 pt-5 pb-3">
                <Button type="submit" fullWidth loading={isSubmitting} leftIcon="deposit" className="relative overflow-hidden">
                  {!isSubmitting && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
                  <span className="relative">{translate('deposit.submit')}</span>
                </Button>
              </div>
            </div>
            <NeedHelpCard />
          </aside>
        </div>
      </form>

      <DepositNotice />
    </div>
  );
}
