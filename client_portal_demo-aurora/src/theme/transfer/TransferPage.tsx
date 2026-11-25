'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
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

// Hourglass geometry (viewBox 200×300): the top chamber floors at y=148, the bottom one at y=278, each 126 high.
const GLASS_PATH = 'M30 22 H170 C170 92 112 122 106 150 C112 178 170 208 170 278 H30 C30 208 88 178 94 150 C88 122 30 92 30 22 Z';
const GLASS_CLIP_ID = 'aurora-transfer-glass';
const CHAMBER_HEIGHT = 126;
const TOP_CHAMBER_Y = 22;
const BOTTOM_CHAMBER_Y = 152;
const BOTTOM_FLOOR = 278;
const NECK_Y = 152;
const GRAIN_COUNT = 6;
const GRAIN_STAGGER_MS = 180;

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

/**
 * One end of the transfer above / below the glass: balance now, balance after, and a capsule splitting what stays from
 * what moves. The source is a plain pod, the destination a sage pod.
 */
function GlassReadout({ side, endpoint, delta }: { side: 'from' | 'to'; endpoint: TransferEndpoint; delta: number }) {
  const isSource = side === 'from';
  const after = endpoint.balance + delta;
  const isOverdrawn = after < 0;
  const scale = Math.max(endpoint.balance, after);
  const keptShare = scale > 0 ? (Math.max(Math.min(endpoint.balance, after), 0) / scale) * 100 : 0;
  const movingShare = scale > 0 ? 100 - keptShare : 0;

  return (
    <div
      className={cx(
        'relative isolate flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-[22px] p-4',
        isSource ? 'bg-fg/[0.04] ring-1 ring-fg/[0.08]' : 'bg-(--aurora-cta-from) text-(--aurora-cta-fg)',
      )}
    >
      {!isSource && <WaveLines color="white" opacity={0.4} />}
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
          <span
            aria-hidden="true"
            className={cx('grid size-7 place-items-center rounded-full', isSource ? 'bg-fg/[0.07] text-fg-muted ring-1 ring-fg/10' : 'bg-(--aurora-cta-fg)/12 ring-1 ring-(--aurora-cta-fg)/20')}
          >
            <Icon name={isSource ? 'arrowUpRight' : 'deposit'} size={13} />
          </span>
          <span className={isSource ? 'text-fg' : undefined}>{translate(isSource ? 'transfer.from' : 'transfer.to')}</span>
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

      <p className={cx('truncate text-xs font-semibold', isSource ? 'text-fg-muted' : 'opacity-75')}>{endpoint.label}</p>

      <div className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cx('text-[11px]', isSource ? 'text-fg-subtle' : 'opacity-70')}>{translate('transfer.available')}</p>
          <p
            key={endpoint.id}
            className={cx('mt-0.5 animate-pop-in truncate text-2xl tracking-[-0.03em] tabular-nums motion-reduce:animate-none', isSource ? 'font-light text-fg' : 'font-semibold')}
          >
            {formatMoney(endpoint.balance, endpoint.currency)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className={cx('text-[11px]', isSource ? 'text-fg-subtle' : 'opacity-70')}>{translate('transfer.afterTransfer')}</p>
          <p
            className={cx(
              'mt-0.5 truncate text-sm font-semibold tabular-nums',
              isSource ? (isOverdrawn ? 'text-danger' : delta < 0 ? 'text-fg' : 'text-fg-muted') : 'font-bold',
            )}
          >
            {formatMoney(after, endpoint.currency)}
          </p>
        </div>
      </div>

      <div aria-hidden="true" className={cx('flex h-1.5 gap-0.5 overflow-hidden rounded-full', isSource ? 'bg-fg/[0.08]' : 'bg-(--aurora-cta-fg)/15')}>
        <span
          className={cx('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isSource ? 'bg-fg/45' : 'bg-(--aurora-cta-fg)/60')}
          style={{ width: `${keptShare}%` }}
        />
        <span
          className={cx('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isOverdrawn ? 'bg-danger' : isSource ? 'bg-(--zenith-red)' : 'bg-white')}
          style={{ width: `${movingShare}%` }}
        />
      </div>
    </div>
  );
}

/** A chamber's sand as a full-height rect scaled from its floor, so level changes animate as a transform. */
function SandRect({ top, level, className }: { top: number; level: number; className: string }) {
  return (
    <rect
      x={30}
      y={top}
      width={140}
      height={CHAMBER_HEIGHT}
      style={{ transform: `scaleY(${level})` }}
      className={cx('transition-transform duration-700 ease-out [transform-box:fill-box] [transform-origin:bottom] motion-reduce:transition-none', className)}
    />
  );
}

interface HourglassProps {
  source: TransferEndpoint;
  destination: TransferEndpoint;
  amount: number;
  /** Number of swaps so far; each one remounts the glass so the flip animation replays. */
  flips: number;
  onSwap: () => void;
}

/**
 * The transfer as an hourglass: the top chamber is the source, the bottom the destination, both on one scale. The clay
 * slice in the top is what leaves, grains fall through the neck, and the clay slice in the bottom is what arrives.
 */
function Hourglass({ source, destination, amount, flips, onSwap }: HourglassProps) {
  const hasAmount = amount > 0;
  const isOverdrawn = amount > source.balance;
  const scale = Math.max(source.balance, destination.balance + amount, 1);
  const level = (value: number) => Math.min(Math.max(value / scale, 0), 1);
  const arrivalSurface = BOTTOM_FLOOR - level(destination.balance + amount) * CHAMBER_HEIGHT;
  const fallDistance = Math.max(arrivalSurface - NECK_Y, 0);

  return (
    <section aria-label={translate('nav.internalTransfer')} className={cx(boardCard, 'zenith-tile relative isolate flex flex-col gap-3 overflow-hidden p-4 sm:p-5')}>
      <GlassReadout side="from" endpoint={source} delta={-amount} />

      <div className="relative flex items-center justify-center py-1">
        <div className="absolute top-1/2 left-0 flex -translate-y-1/2 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onSwap}
            aria-label={translate('transfer.swap')}
            title={translate('transfer.swap')}
            className={cx(
              'group/swap relative grid size-14 place-items-center rounded-full bg-surface text-fg ring-1 ring-fg/15 transition-[scale,background-color,color] duration-300 hover:scale-105 hover:bg-(--aurora-cta-from) hover:text-(--aurora-cta-fg) motion-reduce:transition-none',
              focusRing,
            )}
          >
            <span aria-hidden="true" className="absolute -inset-2 animate-orbit-spin rounded-full border border-dashed border-fg/25 motion-reduce:animate-none" style={{ animationDuration: '4s' }} />
            <Icon name="transfer" size={20} className="rotate-90 transition-transform duration-500 group-hover/swap:rotate-[270deg] motion-reduce:transition-none" />
          </button>
          <span className="text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{translate('transfer.swap')}</span>
        </div>

        <div key={flips} className={cx(flips > 0 && 'aurora-flip')}>
          <svg aria-hidden="true" viewBox="0 0 200 300" className="h-52 w-auto">
            <defs>
              <clipPath id={GLASS_CLIP_ID}>
                <path d={GLASS_PATH} />
              </clipPath>
            </defs>
            <rect x={22} y={14} width={6} height={272} rx={3} className="fill-fg/15" />
            <rect x={172} y={14} width={6} height={272} rx={3} className="fill-fg/15" />
            <path d={GLASS_PATH} className="fill-fg/[0.04]" />
            <g clipPath={`url(#${GLASS_CLIP_ID})`}>
              <SandRect top={TOP_CHAMBER_Y} level={level(source.balance)} className={isOverdrawn ? 'fill-danger/45' : 'fill-(--zenith-red)/40'} />
              <SandRect top={TOP_CHAMBER_Y} level={level(source.balance - amount)} className="fill-(--hero-buy)" />
              <SandRect top={BOTTOM_CHAMBER_Y} level={level(destination.balance + amount)} className="fill-(--zenith-red)" />
              <SandRect top={BOTTOM_CHAMBER_Y} level={level(destination.balance)} className="fill-(--hero-buy)" />
              {hasAmount && !isOverdrawn && (
                <g>
                  <line x1={100} y1={NECK_Y - 6} x2={100} y2={arrivalSurface} strokeWidth={1.5} className="aurora-dash stroke-(--zenith-red)" />
                  {Array.from({ length: GRAIN_COUNT }, (_, grain) => (
                    <circle
                      key={grain}
                      cx={grain % 2 === 0 ? 99 : 101}
                      cy={NECK_Y - 4}
                      r={2.2}
                      className="aurora-grain fill-(--zenith-red)"
                      style={{ animationDelay: `${grain * GRAIN_STAGGER_MS}ms`, '--fall': `${fallDistance}px` } as CSSProperties}
                    />
                  ))}
                </g>
              )}
            </g>
            <path d={GLASS_PATH} fill="none" strokeWidth={2} className="stroke-fg/30" />
            <path d="M44 32 C44 80 78 112 90 140" fill="none" strokeWidth={3} strokeLinecap="round" className="aurora-glint stroke-white" />
            <path d="M44 268 C44 220 78 188 90 160" fill="none" strokeWidth={3} strokeLinecap="round" className="aurora-glint stroke-white [animation-delay:1.2s]" />
            <rect x={12} y={6} width={176} height={16} rx={8} className="fill-(--aurora-cta-from)" />
            <rect x={12} y={278} width={176} height={16} rx={8} className="fill-(--aurora-cta-from)" />
          </svg>
        </div>

        <span
          key={amount}
          aria-hidden="true"
          className={cx(
            'absolute top-1/2 right-0 -translate-y-1/2 rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-surface tabular-nums motion-reduce:animate-none',
            hasAmount ? 'animate-pop-in' : 'invisible',
          )}
        >
          {formatMoney(amount, source.currency)}
        </span>
      </div>

      <GlassReadout side="to" endpoint={destination} delta={amount} />
    </section>
  );
}

interface EndpointPickerProps {
  side: 'from' | 'to';
  endpoint: TransferEndpoint;
  options: TransferEndpoint[];
  /** Largest balance across every endpoint, so each option's vial fills on the same scale. */
  maxBalance: number;
  onChange: (id: string) => void;
}

// The endpoints as tiles, each with a small vial showing how full that balance is next to the others.
function EndpointPicker({ side, endpoint, options, maxBalance, onChange }: EndpointPickerProps) {
  const labelId = `transfer-${side}-label`;
  const isSource = side === 'from';

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p id={labelId} className={cx(labelClass, 'flex items-center gap-2')}>
        <Icon name={isSource ? 'arrowUpRight' : 'deposit'} size={12} />
        {translate(isSource ? 'transfer.from' : 'transfer.to')}
      </p>
      <ul role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
        {options.map((option, index) => {
          const isActive = option.id === endpoint.id;
          const fill = maxBalance > 0 ? (Math.max(option.balance, 0) / maxBalance) * 100 : 0;
          return (
            <li key={option.id} className="aurora-ticket" style={{ animationDelay: `${150 + index * ROW_STAGGER_MS}ms` }}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(option.id)}
                className={cx(
                  'group/opt flex w-full min-w-0 items-center gap-3 rounded-2xl py-2.5 pr-3.5 pl-2.5 text-left transition-[background-color,translate,box-shadow] duration-300 motion-reduce:transition-none',
                  focusRing,
                  isActive ? 'bg-fg/[0.07] ring-2 ring-(--hero-buy)' : 'bg-fg/[0.02] ring-1 ring-fg/[0.08] hover:-translate-y-0.5 hover:ring-fg/20',
                )}
              >
                <span aria-hidden="true" className="relative h-10 w-2.5 shrink-0 overflow-hidden rounded-full bg-fg/[0.07] ring-1 ring-fg/10">
                  <span
                    className={cx('absolute inset-x-0 bottom-0 rounded-full transition-[height,background-color] duration-500 motion-reduce:transition-none', isActive ? 'bg-(--hero-buy)' : 'bg-fg/30')}
                    style={{ height: `${fill}%` }}
                  />
                </span>
                <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', isActive ? 'bg-fg text-surface' : 'bg-fg/[0.06] text-fg-subtle ring-1 ring-fg/10')}>
                  <Icon name={option.id === WALLET_ID ? 'wallet' : 'accounts'} size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block truncate text-sm', isActive ? 'font-semibold text-fg' : 'text-fg-muted group-hover/opt:text-fg')}>{option.label}</span>
                  <span className="block truncate text-xs text-fg-subtle tabular-nums">{formatMoney(option.balance, option.currency)}</span>
                </span>
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

// The notice as four stations on one dashed line, each led by an icon for what the rule is about.
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
      <div className="relative mt-5">
        <span aria-hidden="true" className="absolute top-[18px] right-[12.5%] left-[12.5%] hidden border-t-2 border-dashed border-fg/12 xl:block" />
        <ol className="relative grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {noticeItems.map((item, index) => (
            <li key={item.key} style={{ animationDelay: `${260 + index * 90}ms` }} className="zenith-tile flex gap-3 xl:flex-col xl:items-center xl:text-center">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-warning ring-1 ring-warning/35 transition-transform duration-300 hover:scale-110 motion-reduce:transition-none">
                <Icon name={item.icon} size={15} />
              </span>
              <div className="min-w-0">
                <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-warning tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{translate(item.key)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
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
  const [flips, setFlips] = useState(0);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5 sm:gap-6" aria-busy="true" aria-label={translate('common.loading')}>
        <Skeleton className="h-24 w-full rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Skeleton className="h-[560px] w-full rounded-[24px]" />
          <Skeleton className="h-96 w-full rounded-[24px]" />
        </div>
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
  const maxBalance = Math.max(...endpoints.map((endpoint) => endpoint.balance), 0);

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
    setFlips((count) => count + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateAmount(amount, source);
    setAmountError(error);
    if (error) return;
    const note = description.trim();
    await submit({ fromId: source.id, toId: destination.id, amount, description: note || undefined });
  }

  // Aurora transfer: the hourglass (source on top, destination below, swap flips it) sticks on the left; the right
  // column runs pickers → amount desk → a wide receipt slip with the submit.
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

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-6 [perspective:1200px] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-24">
          <Hourglass source={source} destination={destination} amount={validAmount} flips={flips} onSwap={handleSwap} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <div className={cx(boardCard, 'zenith-tile grid gap-6 p-5 [animation-delay:60ms] sm:grid-cols-2 sm:p-6')}>
            <EndpointPicker side="from" endpoint={source} options={endpoints} maxBalance={maxBalance} onChange={handleSourceChange} />
            <EndpointPicker side="to" endpoint={destination} options={destinations} maxBalance={maxBalance} onChange={setToId} />
          </div>

          <section aria-labelledby="transfer-amount-label" className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 [animation-delay:100ms] sm:p-6')}>
            <div
              className={cx(
                'rounded-[22px] bg-fg/[0.03] p-4 ring-1 transition-shadow duration-300',
                amountError ? 'ring-danger' : 'ring-fg/10 focus-within:ring-2 focus-within:ring-(--hero-buy)',
              )}
            >
              <label id="transfer-amount-label" htmlFor="transfer-amount" className={labelClass}>
                {translate('transfer.amount')}
              </label>
              <div className="mt-2 flex items-center gap-3">
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
                <span className="shrink-0 rounded-full bg-(--aurora-cta-from) px-3 py-1 text-sm font-semibold text-(--aurora-cta-fg)">{source.currency}</span>
              </div>
            </div>
            {amountError && (
              <p id="transfer-amount-error" role="alert" className="-mt-3 text-xs font-medium text-danger">
                {translate(amountError)}
              </p>
            )}

            {maxAmount > 0 && (
              <div className="flex flex-col gap-3">
                {/* Share of the source balance as a bar of flowing sand. */}
                <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-fg/[0.07]">
                  <span
                    className={cx('aurora-sand-flow block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', isOverBalance ? 'bg-danger' : 'bg-(--zenith-red)')}
                    style={{ width: `${isOverBalance ? 100 : shareOfAvailable}%` }}
                  />
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                          'flex min-w-0 animate-pop-in flex-col items-start gap-0.5 rounded-2xl px-3.5 py-3 text-left transition-[translate,background-color,box-shadow] duration-300 disabled:pointer-events-none disabled:opacity-40 motion-reduce:animate-none motion-reduce:transition-none',
                          focusRing,
                          isActive ? 'bg-fg text-surface' : 'bg-fg/[0.03] text-fg ring-1 ring-fg/10 hover:-translate-y-0.5 hover:ring-fg/25',
                        )}
                      >
                        <span className="text-sm font-bold">{label}</span>
                        <span className={cx('w-full truncate text-[11px] tabular-nums', isActive ? 'text-surface/70' : 'text-fg-subtle')}>{formatMoney(value, source.currency)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="transfer-description" className={labelClass}>
                {translate('transfer.description')}
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-fg/[0.04] px-4 ring-1 ring-fg/12 transition-shadow focus-within:ring-2 focus-within:ring-(--hero-buy)/70">
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

          {/* Receipt slip: the total on a sage block, the route details beside it, submit along the bottom. */}
          <section aria-labelledby="transfer-total-label" className={cx(boardCard, 'zenith-tile overflow-hidden [animation-delay:140ms]')}>
            <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
              <div className="relative isolate flex flex-col justify-between gap-4 overflow-hidden bg-(--aurora-cta-from) p-5 text-(--aurora-cta-fg)">
                <WaveLines color="white" opacity={0.45} />
                <p id="transfer-total-label" className="text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-70">
                  {translate('transfer.total')}
                </p>
                <p key={validAmount} className="animate-pop-in truncate text-4xl font-semibold tracking-[-0.03em] tabular-nums motion-reduce:animate-none">
                  {formatMoney(validAmount, source.currency)}
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-5 p-5">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {receiptRows.map((row) => (
                    <div key={row.label} className="min-w-0 border-l-2 border-fg/10 pl-3">
                      <dt className="text-xs text-fg-muted">{row.label}</dt>
                      <dd className="mt-0.5 truncate text-sm font-semibold text-fg">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <button
                  type="submit"
                  disabled={!hasAmount || isSubmitting}
                  aria-busy={isSubmitting}
                  className={cx(
                    'group/cta relative isolate inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-fg text-sm font-bold text-surface transition-[translate,opacity] duration-300 enabled:hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none',
                    focusRing,
                  )}
                >
                  <span aria-hidden="true" className="aurora-ticket-shine pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />
                  {isSubmitting ? (
                    <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface" />
                  ) : (
                    <Icon name="transfer" size={16} className="transition-transform duration-500 group-hover/cta:rotate-180 motion-reduce:transition-none" />
                  )}
                  {translate('nav.internalTransfer')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </form>

      <ImportantNotice />
    </div>
  );
}
