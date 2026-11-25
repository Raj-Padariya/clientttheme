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
import { Field, Input, Select } from '../ui/Input';
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

interface EndpointCardProps {
  id: string;
  label: string;
  endpoint: TransferEndpoint;
  options: TransferEndpoint[];
  /** Signed change the transfer would make to this side's balance (0 while no amount is typed). */
  delta: number;
  onChange: (id: string) => void;
}

function EndpointCard({ id, label, endpoint, options, delta, onChange }: EndpointCardProps) {
  const after = endpoint.balance + delta;
  return (
    <div className="glow-border flex min-w-0 flex-col gap-3 rounded-[24px] bg-surface-2/40 p-5 light:bg-surface light:shadow-card">
      <Field label={label} htmlFor={id}>
        <Select id={id} value={endpoint.id} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <p className="text-xs text-fg-muted">{translate('transfer.available')}</p>
        <p className="mt-0.5 truncate text-2xl font-light tracking-[-0.02em] text-fg tabular-nums">{formatMoney(endpoint.balance, endpoint.currency)}</p>
      </div>
      <p className="flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <span className="text-fg-subtle">{translate('transfer.afterTransfer')}</span>
        <span
          className={cx(
            'font-semibold tabular-nums',
            delta > 0 && 'text-success',
            delta < 0 && (after < 0 ? 'text-danger' : 'text-fg'),
            delta === 0 && 'text-fg-muted',
          )}
        >
          {formatMoney(after, endpoint.currency)}
        </span>
      </p>
    </div>
  );
}

function ImportantNotice() {
  return (
    <section
      aria-labelledby="transfer-notice-title"
      className="glow-border rounded-[24px] bg-surface-2/40 p-5 [--glow-color:var(--warning)] sm:p-6 light:bg-surface light:shadow-card"
    >
      <h2 id="transfer-notice-title" className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <Icon name="alert" size={16} />
        </span>
        {translate('transfer.notice.title')}
      </h2>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {noticeKeys.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-sm text-fg-muted">
            <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-warning" />
            {translate(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PageIntro() {
  return (
    <section className="glass glass-strong relative isolate animate-rise overflow-hidden rounded-[28px] p-5 motion-reduce:animate-none sm:p-6">
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageIntro />

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-2">
          <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <EndpointCard
              id="transfer-from"
              label={translate('transfer.from')}
              endpoint={source}
              options={endpoints}
              delta={-validAmount}
              onChange={handleSourceChange}
            />
            <button
              type="button"
              onClick={handleSwap}
              aria-label={translate('transfer.swap')}
              title={translate('transfer.swap')}
              className="mx-auto flex size-11 items-center justify-center rounded-full border border-primary/40 bg-surface text-primary shadow-[0_0_18px_-6px_var(--brand-primary)] transition-transform duration-300 hover:rotate-180 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <Icon name="transfer" size={18} className="rotate-90 md:rotate-0" />
            </button>
            <EndpointCard
              id="transfer-to"
              label={translate('transfer.to')}
              endpoint={destination}
              options={destinations}
              delta={validAmount}
              onChange={setToId}
            />
          </div>

          <Card className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
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
                  rightSlot={
                    <span className="mr-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs font-semibold text-fg">{source.currency}</span>
                  }
                />
              </Field>

              <Field label={translate('transfer.description')} htmlFor="transfer-description">
                <Input
                  id="transfer-description"
                  type="text"
                  maxLength={120}
                  placeholder={translate('transfer.descriptionPlaceholder')}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </div>

            {maxAmount > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {AMOUNT_SHARES.map((share) => {
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
                      className={cx(
                        'rounded-xl border py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40',
                        isActive ? 'border-primary bg-primary-soft text-primary' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="flex flex-col gap-5 lg:sticky lg:top-6">
          <div className="glow-border rounded-2xl bg-surface/60 p-4">
            <p className="text-xs text-fg-muted">{translate('transfer.total')}</p>
            <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">{formatMoney(validAmount, source.currency)}</p>
          </div>
          <dl className="flex flex-col gap-3">
            <SummaryRow label={translate('transfer.from')} value={source.label} />
            <SummaryRow label={translate('transfer.to')} value={destination.label} />
            <SummaryRow label={translate('payment.fee')} value={translate('payment.noFee')} />
            <SummaryRow label={translate('payment.averageTime')} value={translate('payment.duration.immediate')} />
          </dl>
          <Button type="submit" fullWidth loading={isSubmitting} disabled={validAmount === 0} leftIcon="transfer">
            {translate('nav.internalTransfer')}
          </Button>
        </Card>
      </form>

      <ImportantNotice />
    </div>
  );
}
