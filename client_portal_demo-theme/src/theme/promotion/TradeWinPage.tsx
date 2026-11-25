'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import {
  useTradeWin,
  type RewardCategory,
  type TradeWinOverview,
  type TradeWinLeader,
  type TradeWinRedemption,
  type TradeWinReward,
} from '@/core/pages/useTradeWin';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { ProgressBar } from '../ui/ProgressBar';
import { RedeemPrizeModal } from './RedeemPrizeModal';
import { prefersReducedMotion, useAnimatedNumber, useMotion } from './ScratchExperience';

/** A past win; redemptions made in this session also carry their claim reference and reward category. */
type PastWin = TradeWinRedemption & { reference?: string; category?: RewardCategory };

// Claim references continue from the reference screenshot's first claim (INDP-1044).
const FIRST_REFERENCE = 1044;

type StatusFilter = 'all' | 'ready';
type CategoryFilter = 'all' | RewardCategory;

const CATEGORIES: RewardCategory[] = ['travel', 'electronics', 'cash', 'merchandise'];
const PODIUM_SIZE = 3;
const CELEBRATION_MS = 2200;
// Keeps a tiny lots share visible as a sliver instead of disappearing.
const MIN_LANE_SHARE = 4;

const captionClass = 'text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase';
const panelClass = 'relative isolate overflow-hidden rounded-[28px] border border-line bg-surface shadow-card';

const categoryIcon: Record<RewardCategory, IconName> = {
  travel: 'globe',
  electronics: 'monitor',
  cash: 'wallet',
  merchandise: 'gift',
};

const medalClass: Record<number, string> = {
  1: 'text-on-primary [background-image:var(--brand-gradient)]',
  2: 'bg-fg-muted text-surface',
  3: 'bg-warning text-surface',
};

const FLOAT_KEYFRAMES: Keyframe[] = [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }];
const FLOAT_OPTIONS: KeyframeAnimationOptions = { duration: 4200, iterations: Infinity, easing: 'ease-in-out' };
const SHINE_KEYFRAMES: Keyframe[] = [
  { transform: 'translateX(-120%) skewX(-18deg)' },
  { transform: 'translateX(420%) skewX(-18deg)' },
];
const SHINE_OPTIONS: KeyframeAnimationOptions = { duration: 4200, delay: 600, iterations: Infinity, easing: 'ease-in-out' };
const SPIN_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];

function categoryLabel(category: RewardCategory): string {
  switch (category) {
    case 'travel':
      return translate('tradeWin.catTravel');
    case 'electronics':
      return translate('tradeWin.catElectronics');
    case 'cash':
      return translate('tradeWin.catCash');
    case 'merchandise':
      return translate('tradeWin.catMerchandise');
  }
}

function categoryTag(category: RewardCategory): string {
  switch (category) {
    case 'travel':
      return translate('tradeWin.tagTravel');
    case 'electronics':
      return translate('tradeWin.tagElectronics');
    case 'cash':
      return translate('tradeWin.tagCash');
    case 'merchandise':
      return translate('tradeWin.tagMerchandise');
  }
}

function formatLots(lots: number): string {
  return lots.toFixed(1);
}

function allowedText(list: string[]): string {
  return list.length === 0 ? translate('tradeWin.all') : list.join(', ');
}

function MiniStat({ icon, label, hint, children }: { icon: IconName; label: string; hint: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-fg/10 bg-surface-2/50 p-3.5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name={icon} size={15} />
      </span>
      <dt className={cx(captionClass, 'mt-3')}>{label}</dt>
      <dd className="text-xl font-semibold text-fg tabular-nums">{children}</dd>
      <dd className="text-[11px] text-fg-subtle">{hint}</dd>
    </div>
  );
}

function LotsWallet({
  availableLots,
  tradedLots,
  spentLots,
  pastWins,
  valueWon,
  currency,
  isIb,
}: {
  availableLots: number;
  tradedLots: number;
  spentLots: number;
  pastWins: number;
  valueWon: number;
  currency: string;
  /** IB lots are earned from the downline's trading, not the IB's own. */
  isIb: boolean;
}) {
  const shineRef = useRef<HTMLSpanElement>(null);
  const lots = useAnimatedNumber(availableLots, 1200);
  const wins = useAnimatedNumber(pastWins, 900);
  const won = useAnimatedNumber(valueWon, 1200);

  useMotion(shineRef, SHINE_KEYFRAMES, SHINE_OPTIONS);

  return (
    <section className={cx(panelClass, 'border-primary/25 p-5 sm:p-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 rounded-full bg-primary/20 blur-3xl animate-ring-breathe motion-reduce:animate-none" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -bottom-12 -z-10 size-44 rounded-full border border-dashed border-primary/25 animate-[spin_28s_linear_infinite] motion-reduce:animate-none"
      />
      <span ref={shineRef} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'text-primary')}>{translate(isIb ? 'tradeWin.availableIbLots' : 'tradeWin.availableLots')}</p>
        <span className="flex size-10 items-center justify-center rounded-2xl text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
          <Icon name="pieChart" size={18} />
        </span>
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="bg-clip-text text-5xl font-semibold tracking-tight text-transparent tabular-nums [background-image:var(--brand-gradient)]">{formatLots(lots)}</span>
        <span className="text-sm text-fg-muted">{translate('tradeWin.lots')}</span>
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        {translate(isIb ? 'tradeWin.downlineSpent' : 'tradeWin.tradedSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat icon="checkCircle" label={translate('tradeWin.pastWins')} hint={translate('tradeWin.totalRedemptions')}>
          {Math.round(wins)}
        </MiniStat>
        <MiniStat icon="wallet" label={translate('tradeWin.valueWon')} hint={translate('tradeWin.totalPrizeValue')}>
          {formatMoney(won, currency)}
        </MiniStat>
      </dl>
    </section>
  );
}

const pastWinText = {
  submitted: 'SUBMITTED',
  reference: 'Reference',
  processing: 'We are currently processing your reward',
  submittedOn: 'Submitted',
};

/** One claim: a ticket stub with its reference, a live "processing" status and the submitted date. */
function PastWinCard({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';
  return (
    <li
      style={{ animationDelay: `${index * 80}ms` }}
      className="group relative animate-rise overflow-hidden rounded-2xl border border-line bg-surface-2/35 transition-[translate,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 [background-image:var(--brand-gradient)]" />
      <div className="flex items-center gap-3 py-3 pr-3.5 pl-4">
        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-on-primary shadow-[0_10px_22px_-12px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
          <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name={icon} size={18} className="relative transition-transform duration-300 group-hover:scale-110" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">
            {entry.rewardName} {entry.quantity > 1 && <span className="text-fg-subtle">× {entry.quantity}</span>}
          </p>
          {entry.category ? (
            <p className="text-xs text-fg-muted">{categoryTag(entry.category)}</p>
          ) : (
            <p className="text-xs text-fg-muted">{formatDate(entry.redeemedAt)}</p>
          )}
        </div>
        {entry.reference ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-warning ring-1 ring-warning/30">
            <Icon name="clock" size={12} className="animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
            {pastWinText.submitted}
          </span>
        ) : (
          <span className="text-sm font-semibold text-success tabular-nums">{formatMoney(entry.value, currency)}</span>
        )}
      </div>

      {entry.reference && (
        <>
          <div className="mx-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface/70 px-3 py-2 text-xs ring-1 ring-line">
            <span className="text-fg-muted">{pastWinText.reference}:</span>
            <span className="font-mono font-bold tracking-wider text-primary">{entry.reference}</span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              {pastWinText.processing}
              <span aria-hidden="true" className="flex gap-0.5">
                {[0, 0.2, 0.4].map((delay) => (
                  <span key={delay} style={{ animationDelay: `${delay}s` }} className="size-1 animate-twinkle rounded-full bg-primary motion-reduce:animate-none" />
                ))}
              </span>
            </span>
          </div>
          {/* Indeterminate progress: a light band running along the claim while it is processed. */}
          <div aria-hidden="true" className="relative mx-3.5 mt-2 h-0.5 overflow-hidden rounded-full bg-fg/10">
            <span className="absolute inset-y-0 w-1/3 animate-sweep rounded-full bg-linear-to-r from-transparent via-primary to-transparent [animation-iteration-count:infinite] [animation-delay:0s] motion-reduce:hidden" />
          </div>
          <p className="flex items-center gap-1.5 border-t border-dashed border-fg/10 px-4 pt-2.5 pb-3 mt-3 text-[11px] text-fg-subtle">
            <Icon name="clock" size={12} />
            {pastWinText.submittedOn}: {entry.redeemedAt.slice(0, 10)}
          </p>
        </>
      )}
    </li>
  );
}

function PastWins({ entries, currency }: { entries: PastWin[]; currency: string }) {
  return (
    <section className={cx(panelClass, 'flex flex-1 flex-col p-5 sm:p-6')}>
      <header className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon name="trophy" size={18} />
        </span>
        <h2 className="text-base font-semibold text-fg">{translate('tradeWin.pastWinsTitle')}</h2>
        {entries.length > 0 && (
          <Badge tone="primary" className="ml-auto">
            {entries.length}
          </Badge>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-fg/10 bg-surface-2/25 px-6 py-10 text-center">
          <div aria-hidden="true" className="relative mb-5 flex size-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-primary/30 animate-ring-ripple motion-reduce:animate-none" />
            <span className="absolute inset-2 rounded-full border border-dashed border-primary/25 animate-[spin_18s_linear_infinite] motion-reduce:animate-none" />
            <span className="relative flex size-12 items-center justify-center rounded-full text-on-primary shadow-[0_12px_28px_-12px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
              <Icon name="trophy" size={22} />
            </span>
          </div>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noRedemptions')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.keepTrading')}</p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {entries.map((entry, index) => (
            <PastWinCard key={entry.id} entry={entry} currency={currency} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterChip({
  isActive,
  onClick,
  icon,
  count,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  icon?: IconName;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-95 motion-reduce:transition-none',
        isActive
          ? 'border-transparent text-on-primary shadow-[0_10px_24px_-14px_var(--brand-primary)] [background-image:var(--brand-gradient)]'
          : 'border-fg/10 bg-surface-2/40 text-fg-muted hover:border-primary/30 hover:text-fg',
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
      {count !== undefined && (
        <span className={cx('rounded-full px-1.5 text-[10px] tabular-nums', isActive ? 'bg-black/20' : 'bg-fg/10')}>{count}</span>
      )}
    </button>
  );
}

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'flex size-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg disabled:pointer-events-none disabled:opacity-35';

  return (
    <div className="flex items-center rounded-full border border-fg/10 bg-surface-2/60 p-1">
      <span className="pr-1 pl-2.5 text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('tradeWin.quantity')}</span>
      <button type="button" aria-label={translate('tradeWin.decrease')} disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepClass}>
        <span aria-hidden="true" className="text-base leading-none">−</span>
      </button>
      <span key={value} aria-live="polite" className="w-7 animate-rise text-center text-sm font-semibold text-fg tabular-nums motion-reduce:animate-none">
        {value}
      </span>
      <button type="button" aria-label={translate('tradeWin.increase')} disabled={value >= max} onClick={() => onChange(value + 1)} className={stepClass}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

function Fact({ icon, label, value, highlight }: { icon: IconName; label: string; value: string; highlight: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface-2/40 px-3 py-2.5">
      <Icon name={icon} size={14} className="shrink-0 text-fg-subtle" />
      <div className="min-w-0">
        <dt className="truncate text-[11px] text-fg-subtle">{label}</dt>
        <dd className={cx('truncate text-sm font-semibold tabular-nums', highlight ? 'text-success' : 'text-fg')}>{value}</dd>
      </div>
    </div>
  );
}

function RewardTicket({
  reward,
  currency,
  availableLots,
  availableDeposit,
  stockLeft,
  claimed,
  onRedeem,
}: {
  reward: TradeWinReward;
  currency: string;
  availableLots: number;
  availableDeposit: number;
  stockLeft: number;
  claimed: number;
  onRedeem: (reward: TradeWinReward, quantity: number) => string;
}) {
  const artRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useMotion(artRef, FLOAT_KEYFRAMES, FLOAT_OPTIONS);
  useMotion(shineRef, SHINE_KEYFRAMES, SHINE_OPTIONS);

  useEffect(() => {
    if (!isCelebrating) return;
    const timer = window.setTimeout(() => setIsCelebrating(false), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [isCelebrating]);

  const safeQuantity = Math.min(quantity, Math.max(stockLeft, 1));
  const hasStock = stockLeft > 0;
  const hasLots = availableLots >= reward.lotRequirement * safeQuantity;
  const canRedeem = hasStock && hasLots && !isCelebrating;
  const requirementPercent = reward.lotRequirement > 0 ? (availableLots / reward.lotRequirement) * 100 : 100;

  let buttonLabel = translate('tradeWin.redeemNow');
  if (isCelebrating) buttonLabel = translate('tradeWin.redeemed');
  else if (!hasStock) buttonLabel = translate('tradeWin.outOfStock');
  else if (!hasLots) buttonLabel = translate('tradeWin.notEnoughLots');

  function handleRedeem() {
    if (!canRedeem) return;
    setIsConfirming(true);
  }

  function confirmRedeem(): string {
    const reference = onRedeem(reward, safeQuantity);
    setIsCelebrating(true);
    return reference;
  }

  function closeRedeem() {
    setIsConfirming(false);
    setQuantity(1);
  }

  return (
    <>
    <article className="group relative grid animate-rise overflow-hidden rounded-[24px] border border-line bg-surface-2/30 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_50px_-32px_var(--brand-primary)] motion-reduce:animate-none motion-reduce:transition-none md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Ticket perforation notches sit on the seam between the art and the details (45% = 0.9 / 2.0 fr). */}
      <span aria-hidden="true" className="absolute -top-3 left-[45%] z-10 hidden size-6 -translate-x-1/2 rounded-full border border-line bg-surface md:block" />
      <span aria-hidden="true" className="absolute -bottom-3 left-[45%] z-10 hidden size-6 -translate-x-1/2 rounded-full border border-line bg-surface md:block" />

      <div className="relative isolate flex min-h-60 items-center justify-center overflow-hidden border-b border-dashed border-fg/15 bg-black/40 md:border-r md:border-b-0 light:bg-surface-2">
        {reward.image && (
          <>
            <Image
              src={reward.image}
              alt={reward.name}
              fill
              unoptimized
              sizes="(min-width: 768px) 45vw, 100vw"
              className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
            />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/45 via-transparent to-black/20" />
          </>
        )}
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,var(--brand-primary),transparent_62%)] opacity-25 transition-opacity duration-500 group-hover:opacity-40" />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:18px_18px]"
        />
        {[
          { top: 18, left: 22, delay: 0 },
          { top: 28, left: 78, delay: 700 },
          { top: 70, left: 16, delay: 1400 },
          { top: 78, left: 70, delay: 2100 },
          { top: 48, left: 88, delay: 400 },
        ].map((spot) => (
          <span
            key={`${spot.top}-${spot.left}`}
            aria-hidden="true"
            className="absolute size-1 rounded-full bg-primary animate-twinkle motion-reduce:animate-none"
            style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}ms` }}
          />
        ))}
        <span ref={shineRef} aria-hidden="true" className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/10 to-transparent" />

        <span className="absolute top-4 left-4 rounded-full border border-primary/40 bg-black/40 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-primary uppercase backdrop-blur-sm">
          {categoryTag(reward.category)}
        </span>

        <div ref={artRef} aria-hidden="true" className={cx('relative flex items-center justify-center', reward.image && 'hidden')}>
          <span className="absolute size-36 rounded-full border border-primary/20 animate-ring-breathe motion-reduce:animate-none" />
          <span className="absolute size-28 rounded-full border border-dashed border-primary/30 animate-[spin_20s_linear_infinite] motion-reduce:animate-none" />
          <span className="relative flex size-20 items-center justify-center rounded-[22px] text-on-primary shadow-[0_24px_40px_-18px_var(--brand-primary)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none [background-image:var(--brand-gradient)]">
            <Icon name={categoryIcon[reward.category]} size={36} strokeWidth={1.5} />
          </span>
        </div>

        {isCelebrating && (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
            <span className="absolute size-24 rounded-full border-2 border-success/60 animate-ring-ripple motion-reduce:animate-none" />
            <span className="relative flex size-16 animate-rise items-center justify-center rounded-full bg-success text-surface shadow-[0_0_30px_-4px_var(--color-success)] motion-reduce:animate-none">
              <Icon name="check" size={30} strokeWidth={2.5} />
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4 p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-fg">{reward.name}</h3>
            <p className="text-sm text-fg-muted">{reward.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={captionClass}>{translate('tradeWin.value')}</p>
            <p className="bg-clip-text text-xl font-semibold text-transparent tabular-nums [background-image:var(--brand-gradient)]">
              {formatMoney(reward.value, currency)}
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className={captionClass}>{translate('tradeWin.lotRequirement')}</p>
            {reward.closedTradesOnly && <p className="text-[11px] text-fg-subtle">{translate('tradeWin.closedTradesOnly')}</p>}
          </div>
          <p className="mt-1 text-2xl font-semibold text-fg tabular-nums">
            {reward.lotRequirement} <span className="text-sm font-medium text-fg-muted">{translate('tradeWin.lots')}</span>
          </p>
          <ProgressBar value={requirementPercent} label={translate('tradeWin.requirementProgress')} size="sm" className="mt-3" />
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <Fact icon="accounts" label={translate('tradeWin.allowedGroups')} value={allowedText(reward.allowedGroups)} highlight={false} />
          <Fact icon="trendUp" label={translate('tradeWin.allowedSymbols')} value={allowedText(reward.allowedSymbols)} highlight={false} />
          <Fact icon="pieChart" label={translate('tradeWin.yourLots')} value={formatLots(availableLots)} highlight />
          <Fact icon="deposit" label={translate('tradeWin.yourDeposit')} value={formatMoney(availableDeposit, currency)} highlight />
        </dl>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 px-3 py-1.5 text-fg-muted">
            <Icon name="inbox" size={13} />
            {translate('tradeWin.stock')}:
            <strong className={cx('font-semibold', stockLeft <= 2 ? 'text-danger' : 'text-fg')}>{translate('tradeWin.stockLeft', { count: stockLeft })}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 px-3 py-1.5 text-fg-muted">
            <Icon name="history" size={13} />
            {translate('tradeWin.claimed')}:
            <strong className="font-semibold text-fg">{translate('tradeWin.claimedTimes', { count: claimed })}</strong>
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-dashed border-fg/10 pt-4">
          <QuantityStepper value={safeQuantity} max={Math.max(stockLeft, 1)} onChange={setQuantity} />
          <Button type="button" className="min-w-40 flex-1" disabled={!canRedeem && !isCelebrating} onClick={handleRedeem}>
            <Icon name={isCelebrating ? 'checkCircle' : 'gift'} size={16} />
            {buttonLabel}
          </Button>
        </div>
      </div>
    </article>
      {/* Outside the article: the card's hover transform would otherwise trap the fixed overlay. */}
      {isConfirming && (
        <RedeemPrizeModal
          name={reward.name}
          icon={categoryIcon[reward.category]}
          value={reward.value}
          quantity={safeQuantity}
          currency={currency}
          onConfirm={confirmRedeem}
          onClose={closeRedeem}
        />
      )}
    </>
  );
}

function ProductTab({
  reward,
  currency,
  isSelected,
  isReady,
  stockLeft,
  tabId,
  panelId,
  onSelect,
}: {
  reward: TradeWinReward;
  currency: string;
  isSelected: boolean;
  isReady: boolean;
  stockLeft: number;
  tabId: string;
  panelId: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      onClick={onSelect}
      className={cx(
        'group relative flex w-60 shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isSelected
          ? 'border-primary/50 bg-primary-soft/40 shadow-[0_16px_30px_-22px_var(--brand-primary)]'
          : 'border-fg/10 bg-surface-2/30 hover:-translate-y-0.5 hover:border-primary/25',
      )}
    >
      {isSelected && (
        <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-0.5 animate-rise rounded-full motion-reduce:animate-none [background-image:var(--brand-gradient)]" />
      )}
      <span
        aria-hidden="true"
        className={cx(
          'flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6 motion-reduce:transition-none',
          isSelected ? 'text-on-primary shadow-[0_10px_20px_-12px_var(--brand-primary)] [background-image:var(--brand-gradient)]' : 'bg-surface-2 text-primary ring-1 ring-fg/10',
        )}
      >
        <Icon name={categoryIcon[reward.category]} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{reward.name}</span>
        <span className="block truncate text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{categoryTag(reward.category)}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-primary tabular-nums">{formatMoney(reward.value, currency)}</span>
          <span aria-hidden="true" className="text-fg-subtle">·</span>
          <span className={cx('inline-flex items-center gap-1', isReady ? 'text-success' : 'text-fg-subtle')}>
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', isReady ? 'bg-success' : 'bg-fg/30')} />
            {translate('tradeWin.stockLeft', { count: stockLeft })}
          </span>
        </span>
      </span>
    </button>
  );
}

function RewardStore({
  rewards,
  currency,
  availableLots,
  availableDeposit,
  stockLeftOf,
  claimedOf,
  onRedeem,
}: {
  rewards: TradeWinReward[];
  currency: string;
  availableLots: number;
  availableDeposit: number;
  stockLeftOf: (reward: TradeWinReward) => number;
  claimedOf: (reward: TradeWinReward) => number;
  onRedeem: (reward: TradeWinReward, quantity: number) => string;
}) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const baseId = useId();

  const isReady = (reward: TradeWinReward) => stockLeftOf(reward) > 0 && availableLots >= reward.lotRequirement;
  const readyCount = rewards.filter(isReady).length;
  const visible = rewards.filter(
    (reward) => (status === 'all' || isReady(reward)) && (category === 'all' || reward.category === category),
  );
  // Falls back to the first visible reward when the chosen one is filtered out (or nothing is chosen yet).
  const selected = visible.find((reward) => reward.id === selectedId) ?? visible[0];

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;
    const lastIndex = visible.length - 1;
    const currentIndex = visible.findIndex((reward) => reward.id === selected.id);
    let nextIndex: number;
    if (event.key === 'ArrowRight') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    else if (event.key === 'ArrowLeft') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;
    else return;

    event.preventDefault();
    const nextReward = visible[nextIndex];
    setSelectedId(nextReward.id);
    document.getElementById(`${baseId}-tab-${nextReward.id}`)?.focus();
  }

  return (
    <section className={cx(panelClass, 'p-5 sm:p-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-32 -z-10 size-96 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={cx(captionClass, 'text-primary')}>{translate('tradeWin.storeEyebrow')}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{translate('tradeWin.storeTitle')}</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-fg/10 bg-surface-2/50 px-3 py-1.5 text-xs text-fg-muted">
          <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)] animate-pulse motion-reduce:animate-none" />
          {translate('tradeWin.productsAvailable', { count: visible.length })}
        </span>
      </header>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-fg/10 bg-surface-2/30 p-2.5 lg:flex-row lg:items-center">
        <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex gap-1.5 rounded-full bg-black/25 p-1">
          <FilterChip isActive={status === 'all'} onClick={() => setStatus('all')} count={rewards.length}>
            {translate('tradeWin.filterAll')}
          </FilterChip>
          <FilterChip isActive={status === 'ready'} onClick={() => setStatus('ready')} icon="bolt" count={readyCount}>
            {translate('tradeWin.readyToRedeem')}
          </FilterChip>
        </div>
        <span aria-hidden="true" className="hidden h-6 w-px bg-fg/10 lg:block" />
        <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <FilterChip isActive={category === 'all'} onClick={() => setCategory('all')}>
            {translate('tradeWin.filterAll')}
          </FilterChip>
          {CATEGORIES.map((item) => (
            <FilterChip key={item} isActive={category === item} onClick={() => setCategory(item)} icon={categoryIcon[item]}>
              {categoryLabel(item)}
            </FilterChip>
          ))}
        </div>
      </div>

      {!selected ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-fg/10 px-6 py-14 text-center">
          <Icon name="inbox" size={28} className="mb-3 text-fg-subtle" />
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noProducts')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.noProductsText')}</p>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label={translate('tradeWin.productTabs')}
            aria-orientation="horizontal"
            onKeyDown={handleTabKeyDown}
            className="mt-5 flex snap-x gap-3 overflow-x-auto px-0.5 pt-0.5 pb-2"
          >
            {visible.map((reward) => (
              <ProductTab
                key={reward.id}
                reward={reward}
                currency={currency}
                isSelected={reward.id === selected.id}
                isReady={isReady(reward)}
                stockLeft={stockLeftOf(reward)}
                tabId={`${baseId}-tab-${reward.id}`}
                panelId={`${baseId}-panel`}
                onSelect={() => setSelectedId(reward.id)}
              />
            ))}
          </div>

          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${selected.id}`} className="mt-3">
            <RewardTicket
              key={selected.id}
              reward={selected}
              currency={currency}
              availableLots={availableLots}
              availableDeposit={availableDeposit}
              stockLeft={stockLeftOf(selected)}
              claimed={claimedOf(selected)}
              onRedeem={onRedeem}
            />
          </div>
        </>
      )}
    </section>
  );
}

function TopTraderLane({ leader, share, order }: { leader: TradeWinLeader; share: number; order: number }) {
  const isChampion = leader.rank === 1;

  return (
    <li
      className={cx(
        'relative isolate flex animate-rise items-center gap-3 overflow-hidden rounded-2xl border p-3.5 motion-reduce:animate-none',
        isChampion ? 'border-primary/40 shadow-[0_18px_40px_-28px_var(--brand-primary)]' : 'border-line',
      )}
      style={{ animationDelay: `${order * 120}ms` }}
    >
      <span
        aria-hidden="true"
        className={cx('absolute inset-y-0 left-0 -z-10 animate-progress-fill motion-reduce:animate-none', isChampion ? 'bg-primary/20' : 'bg-fg/[0.06]')}
        style={{ width: `${Math.max(share, MIN_LANE_SHARE)}%` }}
      />
      <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold', medalClass[leader.rank])}>
        <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
        <span aria-hidden="true">{leader.rank}</span>
      </span>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-fg-muted ring-1 ring-line">
        {leader.name.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{leader.name}</span>
      {isChampion && <Icon name="trophy" size={16} className="shrink-0 text-primary" />}
      <span className="text-right">
        <span className={cx('text-lg font-semibold tabular-nums', isChampion ? 'text-primary' : 'text-fg')}>{leader.closedLots}</span>
        <span className="ml-1 text-xs text-fg-subtle">{translate('tradeWin.lots')}</span>
      </span>
    </li>
  );
}

function LiveLeaderboard({ leaders }: { leaders: TradeWinLeader[] }) {
  const [round, setRound] = useState(0);
  const refreshIconRef = useRef<HTMLSpanElement>(null);
  const topLots = Math.max(0, ...leaders.map((leader) => leader.closedLots));
  const podium = leaders.filter((leader) => leader.rank <= PODIUM_SIZE);
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate(SPIN_KEYFRAMES, { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section className={cx(panelClass, 'p-5 sm:p-6')}>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon name="trophy" size={18} />
        </span>
        <h2 className="text-base font-semibold text-fg">{translate('tradeWin.leaderboardTitle')}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.12em] text-danger uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-danger animate-ping motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-danger" />
          </span>
          {translate('tradeWin.live')}
        </span>
        <button
          type="button"
          onClick={refresh}
          aria-label={translate('tradeWin.refresh')}
          className="ml-auto flex size-9 items-center justify-center rounded-full border border-fg/10 text-fg-muted transition-colors hover:border-primary/30 hover:text-primary"
        >
          <span ref={refreshIconRef} className="flex">
            <Icon name="refresh" size={15} />
          </span>
        </button>
      </header>

      <div key={round} className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ol className="flex flex-col gap-3">
          {podium.map((leader, index) => (
            <TopTraderLane key={leader.rank} leader={leader} share={topLots > 0 ? (leader.closedLots / topLots) * 100 : 0} order={index} />
          ))}
        </ol>

        {chasers.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface-2/25">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 border-b border-line px-4 py-2.5">
              <span className={captionClass}>{translate('tradeWin.rank')}</span>
              <span className={captionClass}>{translate('tradeWin.trader')}</span>
              <span className={cx(captionClass, 'text-right')}>{translate('tradeWin.closedLots')}</span>
            </div>
            <ol start={PODIUM_SIZE + 1} className="grid sm:grid-cols-2">
              {chasers.map((leader, index) => (
                <li
                  key={leader.rank}
                  className="grid animate-rise grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-fg/[0.03] motion-reduce:animate-none sm:odd:border-r"
                  style={{ animationDelay: `${(PODIUM_SIZE + index) * 90}ms` }}
                >
                  <span className="text-xs font-semibold text-fg-subtle tabular-nums">#{leader.rank}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-fg-muted ring-1 ring-line">
                      {leader.name.charAt(0)}
                    </span>
                    <span className="truncate text-sm text-fg">{leader.name}</span>
                  </span>
                  <span className="text-right text-sm font-semibold text-fg tabular-nums">
                    {leader.closedLots}
                    <span className="ml-1 text-[11px] font-normal text-fg-subtle">{translate('tradeWin.lots')}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

export function TradeWinScreen({ data, isLoading, isIb }: { data: TradeWinOverview | undefined; isLoading: boolean; isIb: boolean }) {
  const [redemptions, setRedemptions] = useState<PastWin[]>([]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[34rem] rounded-[28px]" />
          <Skeleton className="h-[34rem] rounded-[28px]" />
        </div>
        <Skeleton className="h-80 rounded-[28px]" />
      </div>
    );
  }

  const { currency } = data;
  const pastWins = [...redemptions, ...data.pastWins];
  const valueWon = pastWins.reduce((sum, entry) => sum + entry.value, 0);
  const sessionLotsSpent = redemptions.reduce((sum, entry) => sum + entry.lotsSpent, 0);
  const availableLots = data.availableLots - sessionLotsSpent;

  function redeemedQuantity(reward: TradeWinReward): number {
    return redemptions.filter((entry) => entry.rewardId === reward.id).reduce((sum, entry) => sum + entry.quantity, 0);
  }

  function handleRedeem(reward: TradeWinReward, quantity: number): string {
    // New claims continue after any reference already on record.
    const reference = `INDP-${FIRST_REFERENCE + pastWins.length}`;
    const entry: PastWin = {
      id: `${reward.id}-${redemptions.length + 1}`,
      rewardId: reward.id,
      rewardName: reward.name,
      redeemedAt: new Date().toISOString(),
      quantity,
      value: reward.value * quantity,
      lotsSpent: reward.lotRequirement * quantity,
      reference,
      category: reward.category,
    };
    setRedemptions((current) => [entry, ...current]);
    return reference;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <RewardStore
          rewards={data.rewards}
          currency={currency}
          availableLots={availableLots}
          availableDeposit={data.availableDeposit}
          stockLeftOf={(reward) => reward.stock - redeemedQuantity(reward)}
          claimedOf={(reward) => reward.claimed + redeemedQuantity(reward)}
          onRedeem={handleRedeem}
        />

        <aside className="flex flex-col gap-6">
          <LotsWallet
            availableLots={availableLots}
            tradedLots={data.tradedLots}
            spentLots={data.spentLots + sessionLotsSpent}
            pastWins={pastWins.length}
            valueWon={valueWon}
            currency={currency}
            isIb={isIb}
          />
          <PastWins entries={pastWins} currency={currency} />
        </aside>
      </div>

      <LiveLeaderboard leaders={data.leaders} />
    </div>
  );
}

export default function TradeWinPage() {
  const { data, isLoading } = useTradeWin();
  return <TradeWinScreen data={data} isLoading={isLoading} isIb={false} />;
}
