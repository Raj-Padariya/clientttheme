'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useDeposit } from '@/core/pages/useDeposit';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { durationLabel, FeeChip, limitsText, MethodBadge, PaymentStepHeader, paymentStepKeys } from '../payment/PaymentParts';
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

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

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

  // Zenith deposit details: method bar and amount stage, a sideways rail of account tiles, reference and proof side by
  // side, and the receipt on the right as an ember "you pay" capsule over a flow timeline with the submit.
  const youPay = validAmount + fee;
  const cardTitleClass = 'flex items-center gap-3 text-base font-semibold text-fg';
  const cardIconClass = 'grid size-9 shrink-0 place-items-center rounded-full bg-fg/[0.07] text-fg ring-1 ring-fg/10';
  const receiptRows = [
    { label: translate('payment.methodsLabel'), value: method.name },
    { label: translate('deposit.account'), value: account.login },
    { label: translate('payment.averageTime'), value: durationLabel(method.averageMinutes) },
    { label: translate('deposit.youReceive'), value: formatMoney(validAmount, method.currency) },
    { label: translate('payment.fee'), value: formatMoney(fee, method.currency) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PaymentStepHeader
        title={translate('deposit.detailsTitle')}
        description={translate('deposit.detailsText')}
        current={1}
        stepsLabel={translate('deposit.stepsLabel')}
      />

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label={translate('deposit.amount')} className={cx(boardCard, 'zenith-tile relative isolate flex flex-col gap-6 overflow-hidden p-5 sm:p-6')}>
            <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-fg/[0.04] p-2.5 ring-1 ring-fg/[0.08]">
              <MethodBadge method={method} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('deposit.selectedMethod')}</p>
                <p className="truncate text-base font-semibold text-fg">{method.name}</p>
                <p className="truncate text-xs text-fg-muted">
                  {durationLabel(method.averageMinutes)} · {translate('payment.upTo')} {durationLabel(method.maxMinutes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                  {translate('deposit.changeMethod')}
                </button>
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
                className="text-3xl font-light tracking-[-0.03em] tabular-nums"
                rightSlot={<span className="pr-4 text-sm font-semibold text-(--hero-buy)">{method.currency}</span>}
              />
            </Field>

            {presets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-fg-muted">{translate('deposit.quickAmounts')}</span>
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
                        'animate-pop-in rounded-full px-4 py-2 text-sm font-semibold tabular-nums transition-[color,background-color,translate] duration-300 motion-reduce:animate-none motion-reduce:transition-none',
                        focusRing,
                        isActive ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.05] text-fg-muted ring-1 ring-fg/10 hover:-translate-y-0.5 hover:text-fg',
                      )}
                    >
                      {formatMoney(value, method.currency)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="deposit-account-label" className="min-w-0">
            <p id="deposit-account-label" className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
              {translate('deposit.account')}
            </p>
            <div role="group" aria-labelledby="deposit-account-label" className="mt-3 grid snap-x auto-cols-[minmax(210px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
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
                      'zenith-tile relative isolate snap-start overflow-hidden rounded-[22px] p-4 text-left transition-[translate,background-color,box-shadow] duration-300 motion-reduce:transition-none',
                      focusRing,
                      isActive ? 'bg-fg/[0.07] ring-2 ring-(--hero-buy)' : 'bg-surface ring-1 ring-fg/[0.08] hover:-translate-y-0.5 hover:ring-fg/20',
                    )}
                  >
                    <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500', isActive ? 'opacity-100' : 'opacity-0')}>
                      <WaveLines color="var(--hero-buy)" opacity={0.3} />
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm font-semibold tracking-wider text-fg">{item.login}</span>
                      <span
                        aria-hidden="true"
                        className={cx(
                          'grid size-6 shrink-0 place-items-center rounded-full transition-all duration-300',
                          isActive ? 'scale-100 bg-(--hero-buy) text-[#160904]' : 'scale-90 text-transparent ring-1 ring-fg/20',
                        )}
                      >
                        <Icon name="check" size={12} />
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-fg-muted">{item.group}</span>
                    <span className="mt-4 block truncate text-xl font-light tracking-[-0.02em] text-fg tabular-nums">{formatMoney(item.balance, item.currency)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-2">
            <section aria-labelledby="deposit-reference" className={cx(boardCard, 'zenith-tile flex flex-col gap-4 p-5 [animation-delay:80ms]')}>
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
                    className="w-full resize-y rounded-2xl border border-fg/12 bg-fg/[0.03] px-3.5 py-3 pb-7 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-fg/25 focus:border-(--hero-buy) focus:ring-3 focus:ring-(--hero-buy)/20"
                  />
                  <span className="pointer-events-none absolute right-3 bottom-2.5 flex items-center gap-2 text-[11px] text-fg-subtle tabular-nums">
                    <span aria-hidden="true" className="h-1 w-14 overflow-hidden rounded-full bg-fg/10">
                      <span
                        className={cx('block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', note.length >= NOTE_MAX ? 'bg-danger' : 'bg-(--hero-buy)')}
                        style={{ width: `${(note.length / NOTE_MAX) * 100}%` }}
                      />
                    </span>
                    {translate('deposit.noteCount', { count: note.length, max: NOTE_MAX })}
                  </span>
                </div>
              </Field>
            </section>

            <section aria-labelledby="deposit-proof-title" className={cx(boardCard, 'zenith-tile flex flex-col gap-4 p-5 [animation-delay:140ms]')}>
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
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24">
          <section aria-labelledby="deposit-summary" className={cx(boardCard, 'zenith-tile overflow-hidden [animation-delay:120ms]')}>
            <div className="relative isolate overflow-hidden bg-(--hero-buy) p-5 text-[#160904]">
              <WaveLines color="white" opacity={0.45} />
              <h2 id="deposit-summary" className="text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">
                {translate('deposit.summary')}
              </h2>
              <p className="mt-4 text-xs font-medium opacity-75">{translate('deposit.youPay')}</p>
              <p key={youPay} className="mt-0.5 animate-pop-in truncate text-4xl font-semibold tracking-[-0.03em] tabular-nums motion-reduce:animate-none">
                {formatMoney(youPay, method.currency)}
              </p>
              <p className="mt-3 truncate text-xs font-medium opacity-80">
                {method.name} · {account.login}
              </p>
            </div>

            <ol className="relative flex flex-col gap-4 p-5">
              <span aria-hidden="true" className="absolute top-7 bottom-7 left-[26px] border-l border-dashed border-fg/20" />
              {receiptRows.map((row, index) => (
                <li key={row.label} className="relative flex min-w-0 items-center gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="relative z-10 size-3 shrink-0 animate-pop-in rounded-full bg-surface ring-2 ring-(--hero-buy) motion-reduce:animate-none"
                    style={{ animationDelay: `${300 + index * 90}ms` }}
                  />
                  <span className="shrink-0 text-fg-muted">{row.label}</span>
                  <span className="ml-auto truncate font-semibold text-fg tabular-nums">{row.value}</span>
                </li>
              ))}
            </ol>

            <div className="px-5 pb-5">
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className={cx(
                  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fg text-sm font-bold text-surface transition-transform duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none',
                  focusRing,
                )}
              >
                <Icon name={isSubmitting ? 'refresh' : 'deposit'} size={16} className={cx(isSubmitting && 'animate-spin motion-reduce:animate-none')} />
                {translate('deposit.submit')}
              </button>
            </div>
          </section>
          <NeedHelpCard />
        </aside>
      </form>

      <DepositNotice />
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
