'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { useTransfer, WALLET_ID, type TransferOptions } from '@/core/pages/useTransfer';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

interface TransferEndpoint {
  id: string;
  label: string;
  balance: number;
  currency: string;
}

// Quick picks as a share of the source balance; 1 is the "Max" button.
const AMOUNT_SHARES = [0.25, 0.5, 0.75, 1];
const ROW_STAGGER_MS = 60;

const noticeItems: { key: MessageKey; icon: IconName }[] = [
  { key: 'transfer.notice.instant', icon: 'bolt' },
  { key: 'transfer.notice.noFee', icon: 'checkCircle' },
  { key: 'transfer.notice.balance', icon: 'wallet' },
  { key: 'transfer.notice.final', icon: 'alert' },
];

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const labelClass = 'block text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase';

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

function WaveLines({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[200%]">
      {WAVE_PATHS.map((path) => (
        <path key={path} d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

interface EndpointColumnProps {
  side: 'from' | 'to';
  endpoint: TransferEndpoint;
  options: TransferEndpoint[];
  /** Signed change the transfer would make to this side's balance (0 while no amount is typed). */
  delta: number;
  onChange: (id: string) => void;
}

/**
 * One end of the route: a balance pod (graphite for the source, ember for the destination) with the balance after the
 * transfer and a capsule splitting what stays from what moves, then the endpoints as a pill picker underneath.
 */
function EndpointColumn({ side, endpoint, options, delta, onChange }: EndpointColumnProps) {
  const labelId = `transfer-${side}-label`;
  const isSource = side === 'from';
  const after = endpoint.balance + delta;
  const isOverdrawn = after < 0;
  const scale = Math.max(endpoint.balance, after);
  const keptShare = scale > 0 ? (Math.max(Math.min(endpoint.balance, after), 0) / scale) * 100 : 0;
  const movingShare = scale > 0 ? 100 - keptShare : 0;

  return (
    <div className={cx('zenith-tile flex min-w-0 flex-col gap-4', !isSource && '[animation-delay:120ms]')}>
      <div className="flex items-center justify-between gap-3">
        <p id={labelId} className="flex items-center gap-2.5 text-sm font-semibold text-fg">
          <span
            aria-hidden="true"
            className={cx('grid size-8 place-items-center rounded-full', isSource ? 'bg-fg/[0.07] text-fg-muted ring-1 ring-fg/10' : 'bg-(--hero-buy) text-[#160904]')}
          >
            <Icon name={isSource ? 'arrowUpRight' : 'deposit'} size={14} />
          </span>
          {translate(isSource ? 'transfer.from' : 'transfer.to')}
        </p>
        {delta !== 0 && (
          <span
            key={delta}
            className={cx(
              'animate-pop-in rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 motion-reduce:animate-none',
              isSource ? (isOverdrawn ? 'bg-danger-soft text-danger ring-danger/30' : 'bg-fg/[0.06] text-fg-muted ring-fg/10') : 'bg-success-soft text-success ring-success/30',
            )}
          >
            {isSource ? '−' : '+'}
            {formatMoney(Math.abs(delta), endpoint.currency)}
          </span>
        )}
      </div>

      <div
        className={cx(
          'relative isolate flex flex-col gap-3 overflow-hidden rounded-[26px] p-5',
          isSource ? 'bg-fg/[0.04] ring-1 ring-fg/[0.08]' : 'bg-(--hero-buy) text-[#160904]',
        )}
      >
        {!isSource && <WaveLines color="white" opacity={0.4} />}
        <p className={cx('truncate text-xs font-semibold', isSource ? 'text-fg-muted' : 'opacity-75')}>{endpoint.label}</p>
        <div className="min-w-0">
          <p className={cx('text-xs', isSource ? 'text-fg-subtle' : 'opacity-70')}>{translate('transfer.available')}</p>
          <p key={endpoint.id} className={cx('mt-0.5 animate-pop-in truncate text-3xl tracking-[-0.03em] tabular-nums motion-reduce:animate-none', isSource ? 'font-light text-fg' : 'font-semibold')}>
            {formatMoney(endpoint.balance, endpoint.currency)}
          </p>
        </div>
        <div aria-hidden="true" className={cx('flex h-2 gap-0.5 overflow-hidden rounded-full', isSource ? 'bg-fg/[0.08]' : 'bg-[#160904]/15')}>
          <span
            className={cx('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isSource ? 'bg-fg/45' : 'bg-[#160904]/60')}
            style={{ width: `${keptShare}%` }}
          />
          <span
            className={cx(
              'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
              isOverdrawn ? 'bg-danger' : isSource ? 'bg-(--hero-buy)' : 'bg-white',
            )}
            style={{ width: `${movingShare}%` }}
          />
        </div>
        <p className="flex items-center justify-between gap-3 text-xs">
          <span className={isSource ? 'text-fg-subtle' : 'opacity-70'}>{translate('transfer.afterTransfer')}</span>
          <span
            className={cx(
              'text-sm font-semibold tabular-nums',
              isSource ? (isOverdrawn ? 'text-danger' : delta < 0 ? 'text-fg' : 'text-fg-muted') : 'font-bold',
            )}
          >
            {formatMoney(after, endpoint.currency)}
          </span>
        </p>
      </div>

      <ul role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
        {options.map((option, index) => {
          const isActive = option.id === endpoint.id;
          return (
            <li key={option.id} className="zenith-tile" style={{ animationDelay: `${150 + index * ROW_STAGGER_MS}ms` }}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(option.id)}
                className={cx(
                  'group/opt flex w-full min-w-0 items-center gap-3 rounded-full py-2 pr-4 pl-2 text-left transition-[background-color,translate,box-shadow] duration-300 motion-reduce:transition-none',
                  focusRing,
                  isActive ? 'bg-fg/[0.07] ring-1 ring-(--hero-buy)/70' : 'ring-1 ring-transparent hover:translate-x-0.5 hover:bg-fg/[0.04]',
                )}
              >
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', isActive ? 'bg-fg text-surface' : 'bg-fg/[0.06] text-fg-subtle ring-1 ring-fg/10')}>
                  <Icon name={option.id === WALLET_ID ? 'wallet' : 'accounts'} size={14} />
                </span>
                <span className={cx('min-w-0 flex-1 truncate text-sm', isActive ? 'font-semibold text-fg' : 'text-fg-muted group-hover/opt:text-fg')}>{option.label}</span>
                <span className="shrink-0 text-xs text-fg-subtle tabular-nums">{formatMoney(option.balance, option.currency)}</span>
                <span aria-hidden="true" className={cx('grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-colors', isActive ? 'ring-(--hero-buy)' : 'ring-fg/25')}>
                  <span className={cx('size-2 rounded-full bg-(--hero-buy) transition-transform duration-300 motion-reduce:transition-none', isActive ? 'scale-100' : 'scale-0')} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The seam between the two ends: the moving amount, a bead running along the route and the swap knob. */
function RouteHub({ amount, currency, onSwap }: { amount: number; currency: string; onSwap: () => void }) {
  const hasAmount = amount > 0;

  return (
    <div className="flex flex-col items-center justify-center gap-3 xl:pt-24">
      <span
        key={amount}
        aria-hidden="true"
        className={cx(
          'rounded-full bg-fg px-3 py-1 text-xs font-semibold text-surface tabular-nums motion-reduce:animate-none',
          hasAmount ? 'animate-pop-in' : 'invisible',
        )}
      >
        {formatMoney(amount, currency)}
      </span>
      <div className="relative flex w-full max-w-[220px] items-center justify-center">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-dashed border-fg/25" />
        <span aria-hidden="true" className="zenith-route absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hero-buy)" />
        <button
          type="button"
          onClick={onSwap}
          aria-label={translate('transfer.swap')}
          title={translate('transfer.swap')}
          className={cx(
            'group/swap relative grid size-14 place-items-center rounded-full bg-surface text-fg ring-1 ring-fg/15 transition-[scale,background-color,color] duration-300 hover:scale-105 hover:bg-(--hero-buy) hover:text-[#160904] motion-reduce:transition-none',
            focusRing,
          )}
        >
          <span aria-hidden="true" className="absolute -inset-2 animate-orbit-spin rounded-full border border-dashed border-fg/20 motion-reduce:animate-none" style={{ animationDuration: '12s' }} />
          <Icon name="transfer" size={20} className="rotate-90 transition-transform duration-500 group-hover/swap:rotate-[270deg] motion-reduce:transition-none xl:rotate-0 xl:group-hover/swap:rotate-180" />
        </button>
      </div>
      <span className="text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{translate('transfer.swap')}</span>
    </div>
  );
}

// The notice as four small cards, each led by an icon for what the rule is about.
function ImportantNotice() {
  return (
    <section aria-labelledby="transfer-notice-title" className={cx(boardCard, 'zenith-tile p-5 [animation-delay:200ms] sm:p-6')}>
      <h2 id="transfer-notice-title" className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="relative grid size-8 place-items-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="alert" size={15} className="relative" />
        </span>
        {translate('transfer.notice.title')}
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {noticeItems.map((item, index) => (
          <li
            key={item.key}
            style={{ animationDelay: `${260 + index * 90}ms` }}
            className="zenith-tile flex gap-3 rounded-[20px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.08] transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-warning/40 motion-reduce:transition-none"
          >
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-warning ring-1 ring-fg/10">
              <Icon name={item.icon} size={15} />
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-warning font-mono text-[9px] font-bold text-[#160904]">{index + 1}</span>
            </span>
            <p className="text-sm leading-relaxed text-fg-muted">{translate(item.key)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Open title with the transfer's fee and timing as chips beside it.
function PageTitle() {
  return (
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-4xl font-light tracking-[-0.04em] text-fg sm:text-5xl">{translate('nav.internalTransfer')}</h2>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('transfer.subtitle')}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-fg/10">
          <Icon name="bolt" size={13} className="text-(--hero-buy)" />
          {translate('payment.duration.immediate')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-fg/10">
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

  // Zenith transfer: one route card with From and To side by side (graphite source pod, ember destination pod) and the
  // swap hub on the seam, then the amount desk and an ember receipt with the submit underneath.
  const hasAmount = validAmount > 0;
  const shareOfAvailable = maxAmount > 0 ? Math.min(validAmount / maxAmount, 1) * 100 : 0;
  const isOverBalance = validAmount > source.balance;
  const receiptRows = [
    { label: translate('transfer.from'), value: source.label },
    { label: translate('transfer.to'), value: destination.label },
    { label: translate('payment.fee'), value: translate('payment.noFee') },
    { label: translate('payment.averageTime'), value: translate('payment.duration.immediate') },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageTitle />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section aria-label={translate('nav.internalTransfer')} className={cx(boardCard, 'p-5 sm:p-6')}>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)] xl:gap-4">
            <EndpointColumn side="from" endpoint={source} options={endpoints} delta={-validAmount} onChange={handleSourceChange} />
            <RouteHub amount={validAmount} currency={source.currency} onSwap={handleSwap} />
            <EndpointColumn side="to" endpoint={destination} options={destinations} delta={validAmount} onChange={setToId} />
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <section aria-labelledby="transfer-amount-label" className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-6 p-5 [animation-delay:80ms] sm:p-6')}>
            <div>
              <label id="transfer-amount-label" htmlFor="transfer-amount" className={labelClass}>
                {translate('transfer.amount')}
              </label>
              <div
                className={cx(
                  'mt-2 flex items-baseline gap-2 border-b-2 pb-2 transition-colors duration-300',
                  amountError ? 'border-danger' : 'border-fg/12 focus-within:border-(--hero-buy)',
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
                  className="min-w-0 flex-1 [appearance:textfield] bg-transparent text-5xl font-light tracking-[-0.04em] text-fg tabular-nums outline-none placeholder:text-fg/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="shrink-0 text-sm font-semibold text-(--hero-buy)">{source.currency}</span>
              </div>
              {amountError && (
                <p id="transfer-amount-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                  {translate(amountError)}
                </p>
              )}
            </div>

            {maxAmount > 0 && (
              <div>
                <div className="grid grid-cols-4 gap-1 rounded-[22px] bg-fg/[0.05] p-1 ring-1 ring-fg/10">
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
                          'flex min-w-0 animate-pop-in flex-col items-center gap-0.5 rounded-[18px] px-1.5 py-2 transition-[background-color,color] duration-300 disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                          focusRing,
                          isActive ? 'bg-fg text-surface' : 'text-fg hover:bg-fg/[0.06]',
                        )}
                      >
                        <span className="text-xs font-semibold">{label}</span>
                        <span className={cx('max-w-full truncate text-[10px] tabular-nums', isActive ? 'text-surface/70' : 'text-fg-subtle')}>{formatMoney(value, source.currency)}</span>
                      </button>
                    );
                  })}
                </div>
                <span aria-hidden="true" className="mt-3 block h-1.5 overflow-hidden rounded-full bg-fg/[0.08]">
                  <span
                    className={cx('block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isOverBalance ? 'bg-danger' : 'bg-(--hero-buy)')}
                    style={{ width: `${isOverBalance ? 100 : shareOfAvailable}%` }}
                  />
                </span>
              </div>
            )}

            <div>
              <label htmlFor="transfer-description" className={labelClass}>
                {translate('transfer.description')}
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-full bg-fg/[0.04] px-4 ring-1 ring-fg/12 transition-shadow focus-within:ring-(--hero-buy)/60">
                <Icon name="fileText" size={15} className="shrink-0 text-fg-subtle" />
                <input
                  id="transfer-description"
                  type="text"
                  maxLength={120}
                  placeholder={translate('transfer.descriptionPlaceholder')}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
                />
              </div>
            </div>
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <section aria-labelledby="transfer-total-label" className={cx(boardCard, 'zenith-tile overflow-hidden [animation-delay:120ms]')}>
              <div className="relative isolate overflow-hidden bg-(--hero-buy) p-5 text-[#160904]">
                <WaveLines color="white" opacity={0.45} />
                <p id="transfer-total-label" className="text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">
                  {translate('transfer.total')}
                </p>
                <p key={validAmount} className="mt-3 animate-pop-in truncate text-4xl font-semibold tracking-[-0.03em] tabular-nums motion-reduce:animate-none">
                  {formatMoney(validAmount, source.currency)}
                </p>
              </div>

              <dl className="flex flex-col gap-3 p-5">
                {receiptRows.map((row) => (
                  <div key={row.label} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-fg-muted">{row.label}</dt>
                    <dd className="truncate font-semibold text-fg">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="px-5 pb-5">
                <button
                  type="submit"
                  disabled={!hasAmount || isSubmitting}
                  aria-busy={isSubmitting}
                  className={cx(
                    'group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fg text-sm font-bold text-surface transition-[translate,opacity] duration-300 enabled:hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none',
                    focusRing,
                  )}
                >
                  {isSubmitting ? (
                    <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface" />
                  ) : (
                    <Icon name="transfer" size={16} className="transition-transform duration-500 group-hover/cta:rotate-180 motion-reduce:transition-none" />
                  )}
                  {translate('nav.internalTransfer')}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </form>

      <ImportantNotice />
    </div>
  );
}
