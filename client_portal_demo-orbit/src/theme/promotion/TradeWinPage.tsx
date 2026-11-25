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

import { RedeemPrizeModal } from './RedeemPrizeModal';
import { prefersReducedMotion, useAnimatedNumber, useMotion } from './ScratchExperience';

/** A past win; redemptions made in this session also carry their claim reference and reward category. */
export type PastWin = TradeWinRedemption & { reference?: string; category?: RewardCategory };

// Claim references continue from the reference screenshot's first claim (INDP-1044).
export const FIRST_REFERENCE = 1044;

type StatusFilter = 'all' | 'ready';
type CategoryFilter = 'all' | RewardCategory;

const CATEGORIES: RewardCategory[] = ['travel', 'electronics', 'cash', 'merchandise'];
const PODIUM_SIZE = 3;
const CELEBRATION_MS = 2200;
// Keeps a tiny lots share visible as a sliver instead of disappearing.
const MIN_LANE_SHARE = 4;

const captionClass = 'text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase';
const panelClass = 'orbit-card overflow-hidden';

export const categoryIcon: Record<RewardCategory, IconName> = {
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
// One tick every 7.5° around the lots dial, with a longer tick every sixth.
const DIAL_TICKS = Array.from({ length: 48 }, (_, index) => index);
// Cells in the reward's lot-requirement track.
const REQUIREMENT_CELLS = Array.from({ length: 20 }, (_, index) => index);

export function categoryLabel(category: RewardCategory): string {
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

export function categoryTag(category: RewardCategory): string {
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

export function formatLots(lots: number): string {
  return lots.toFixed(1);
}

export function allowedText(list: string[]): string {
  return list.length === 0 ? translate('tradeWin.all') : list.join(', ');
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

  const gauge = tradedLots > 0 ? Math.min(1, Math.max(0, availableLots / tradedLots)) : 0;
  const litTicks = Math.round(gauge * DIAL_TICKS.length);

  useMotion(shineRef, SHINE_KEYFRAMES, SHINE_OPTIONS);

  return (
    <section className={cx(panelClass, 'relative isolate p-5 sm:p-6')}>
      <span ref={shineRef} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-white/[0.05] to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'text-primary')}>{translate(isIb ? 'tradeWin.availableIbLots' : 'tradeWin.availableLots')}</p>
        <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Icon name="pieChart" size={16} />
        </span>
      </div>

      {/* Tick dial: lit ticks show the share of traded lots still available to spend. */}
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[13rem]">
        <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 size-full">
          {DIAL_TICKS.map((tick) => (
            <line
              key={tick}
              x1="50"
              y1="3"
              x2="50"
              y2={tick % 6 === 0 ? 11 : 9}
              transform={`rotate(${tick * 7.5} 50 50)`}
              strokeWidth={tick % 6 === 0 ? 1.6 : 1.2}
              strokeLinecap="round"
              style={{ transitionDelay: `${tick * 20}ms` }}
              className={cx('transition-colors duration-500 motion-reduce:transition-none', tick < litTicks ? 'stroke-primary' : 'stroke-line-strong')}
            />
          ))}
          <circle cx="50" cy="50" r="33" fill="none" strokeWidth="0.6" strokeDasharray="1 2.5" className="stroke-primary/40" />
        </svg>
        <span aria-hidden="true" className="absolute inset-[26%] animate-ring-breathe rounded-full bg-primary/10 blur-xl motion-reduce:animate-none" />
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="orbit-text text-4xl font-black tracking-tight tabular-nums">{formatLots(lots)}</span>
          <span className="text-[11px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{translate('tradeWin.lots')}</span>
        </span>
      </div>

      <p className="mt-3 text-center text-sm text-fg-muted">
        {translate(isIb ? 'tradeWin.downlineSpent' : 'tradeWin.tradedSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2">
        {[
          { key: 'wins', icon: 'checkCircle' as IconName, label: translate('tradeWin.pastWins'), hint: translate('tradeWin.totalRedemptions'), value: String(Math.round(wins)) },
          { key: 'won', icon: 'wallet' as IconName, label: translate('tradeWin.valueWon'), hint: translate('tradeWin.totalPrizeValue'), value: formatMoney(won, currency) },
        ].map((stat) => (
          <div key={stat.key} className="group/stat relative min-w-0 overflow-hidden rounded-xl border border-line p-3">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-primary/60" />
            <dt className={cx(captionClass, 'flex items-center gap-1.5')}>
              <Icon name={stat.icon} size={13} className="shrink-0 text-primary transition-transform duration-300 group-hover/stat:scale-110 motion-reduce:transition-none" />
              <span className="truncate">{stat.label}</span>
            </dt>
            <dd className="mt-1.5 truncate text-lg font-bold text-fg tabular-nums">{stat.value}</dd>
            <dd className="truncate text-[11px] text-fg-subtle">{stat.hint}</dd>
          </div>
        ))}
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

/** One claim as a node on the claims timeline, with its reference and processing status beside it. */
function PastWinCard({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';

  return (
    <li style={{ animationDelay: `${index * 80}ms` }} className="group relative animate-rise pl-12 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className="absolute top-1 left-0 grid size-9 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none"
      >
        <Icon name={icon} size={15} />
      </span>

      <div className="rounded-xl bg-surface-2/40 p-3 ring-1 ring-line transition-[box-shadow] duration-300 group-hover:ring-primary/30">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">
              {entry.rewardName} {entry.quantity > 1 && <span className="text-fg-subtle">× {entry.quantity}</span>}
            </p>
            <p className="truncate text-xs text-fg-muted">{entry.category ? categoryTag(entry.category) : formatDate(entry.redeemedAt)}</p>
          </div>
          {entry.reference ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-[9.5px] font-bold tracking-[0.16em] text-warning ring-1 ring-warning/30">
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-warning motion-reduce:hidden" />
                <span className="relative size-1.5 rounded-full bg-warning" />
              </span>
              {pastWinText.submitted}
            </span>
          ) : (
            <span className="shrink-0 text-sm font-semibold text-success tabular-nums">{formatMoney(entry.value, currency)}</span>
          )}
        </div>

        {entry.reference && (
          <>
            <p className="mt-2.5 flex items-center gap-2 text-[11px] text-fg-muted">
              <span aria-hidden="true" className="flex gap-0.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    style={{ animationDelay: `${dot * 200}ms` }}
                    className="size-1 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none"
                  />
                ))}
              </span>
              {pastWinText.processing}
            </p>
            <dl className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-fg/10 pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">{pastWinText.reference}:</dt>
                <dd className="font-mono font-bold tracking-wider text-primary">{entry.reference}</dd>
              </div>
              <div className="flex items-center gap-1.5 text-fg-subtle">
                <dt className="flex items-center gap-1">
                  <Icon name="clock" size={11} />
                  {pastWinText.submittedOn}:
                </dt>
                <dd className="tabular-nums">{entry.redeemedAt.slice(0, 10)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </li>
  );
}

function PastWins({ entries, currency }: { entries: PastWin[]; currency: string }) {
  return (
    <section className={cx(panelClass, 'relative isolate flex flex-1 flex-col p-5 sm:p-6')}>
      <header className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Icon name="trophy" size={15} />
        </span>
        <h2 className="text-base font-semibold text-fg">{translate('tradeWin.pastWinsTitle')}</h2>
        {entries.length > 0 && (
          <Badge tone="primary" className="ml-auto">
            {entries.length}
          </Badge>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center [background-image:repeating-linear-gradient(135deg,color-mix(in_oklab,var(--brand-primary)_5%,transparent)_0_6px,transparent_6px_14px)]">
          <span aria-hidden="true" className="relative mb-5 grid size-16 place-items-center">
            <span className="absolute inset-0 rotate-45 rounded-2xl border border-dashed border-primary/45" />
            <span className="absolute inset-0 animate-ring-breathe rounded-2xl bg-primary/10 blur-md motion-reduce:animate-none" />
            <Icon name="trophy" size={22} className="relative text-primary" />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noRedemptions')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.keepTrading')}</p>
        </div>
      ) : (
        <ul className="relative mt-5 flex flex-col gap-3 before:absolute before:top-3 before:bottom-3 before:left-[17px] before:w-px before:bg-line">
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
        'group/chip relative inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-[background-color,color,border-color] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'border-primary/45 bg-primary/10 text-fg' : 'border-transparent text-fg-muted hover:border-line hover:text-fg',
      )}
    >
      {icon ? (
        <Icon
          name={icon}
          size={14}
          className={cx('transition-transform duration-300 group-hover/chip:-rotate-12 motion-reduce:transition-none', isActive && 'text-primary')}
        />
      ) : (
        <span aria-hidden="true" className={cx('size-1.5 rounded-full', isActive ? 'bg-primary shadow-[0_0_8px_var(--brand-primary)]' : 'bg-fg/25')} />
      )}
      {children}
      {count !== undefined && (
        <span className={cx('rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-primary/20 text-primary' : 'bg-fg/5 text-fg-subtle')}>{count}</span>
      )}
    </button>
  );
}

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'flex size-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-35';

  return (
    <div className="flex items-center gap-1 rounded-xl border border-primary/25 bg-primary/5 p-1">
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
  const [quantity, setQuantity] = useState(1);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useMotion(artRef, FLOAT_KEYFRAMES, FLOAT_OPTIONS);

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
  const requirementShare = Math.round(Math.min(100, Math.max(0, requirementPercent)));

  let buttonLabel = translate('tradeWin.redeemNow');
  if (isCelebrating) buttonLabel = translate('tradeWin.redeemed');
  else if (!hasStock) buttonLabel = translate('tradeWin.outOfStock');
  else if (!hasLots) buttonLabel = translate('tradeWin.notEnoughLots');

  const facts: { key: string; icon: IconName; label: string; value: string; highlight: boolean }[] = [
    { key: 'groups', icon: 'accounts', label: translate('tradeWin.allowedGroups'), value: allowedText(reward.allowedGroups), highlight: false },
    { key: 'symbols', icon: 'trendUp', label: translate('tradeWin.allowedSymbols'), value: allowedText(reward.allowedSymbols), highlight: false },
    { key: 'lots', icon: 'pieChart', label: translate('tradeWin.yourLots'), value: formatLots(availableLots), highlight: true },
    { key: 'deposit', icon: 'deposit', label: translate('tradeWin.yourDeposit'), value: formatMoney(availableDeposit, currency), highlight: true },
  ];

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
      <article className="orbit-card relative flex animate-rise flex-col overflow-hidden motion-reduce:animate-none">
        {/* Showcase banner: the whole product image (contain) over a blurred copy, on a faint grid floor. */}
        <div className="group relative isolate flex min-h-56 items-center justify-center overflow-hidden border-b border-line bg-black/40 px-5 py-6 sm:min-h-64 light:bg-surface-2">
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <span aria-hidden="true" className="absolute bottom-0 left-1/2 -z-10 h-24 w-2/3 -translate-x-1/2 rounded-[50%] bg-primary/25 blur-3xl" />

          {reward.image ? (
            <>
              <Image src={reward.image} alt="" aria-hidden="true" fill unoptimized sizes="60vw" className="-z-20 scale-110 object-cover opacity-30 blur-2xl" />
              <div className="relative aspect-[16/9] w-full max-w-lg">
                <Image
                  src={reward.image}
                  alt={reward.name}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-contain drop-shadow-[0_24px_36px_rgba(0,0,0,0.55)] transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                />
              </div>
            </>
          ) : (
            <div ref={artRef} aria-hidden="true" className="relative grid size-40 place-items-center">
              <span className="absolute inset-2 rotate-45 rounded-[28px] border border-dashed border-primary/35" />
              <span className="absolute inset-7 animate-ring-breathe rounded-3xl border border-primary/20 motion-reduce:animate-none" />
              <span className="relative grid size-20 place-items-center rounded-2xl border border-primary/50 bg-primary/15 text-primary shadow-[0_20px_40px_-18px_var(--brand-primary)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none">
                <Icon name={categoryIcon[reward.category]} size={36} strokeWidth={1.5} />
              </span>
            </div>
          )}

          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-white uppercase ring-1 ring-white/15 backdrop-blur-md">
            <Icon name={categoryIcon[reward.category]} size={12} />
            {categoryTag(reward.category)}
          </span>
          <span className="absolute right-4 bottom-4 flex flex-col items-end rounded-xl bg-black/55 px-3 py-2 ring-1 ring-primary/40 backdrop-blur-md">
            <span className="text-[9.5px] tracking-[0.14em] text-white/60 uppercase">{translate('tradeWin.value')}</span>
            <span className="text-lg font-bold text-white tabular-nums">{formatMoney(reward.value, currency)}</span>
          </span>

          {isCelebrating && (
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
              <span className="absolute size-24 animate-ring-ripple rounded-full border-2 border-success/60 motion-reduce:animate-none" />
              <span className="relative flex size-16 animate-rise items-center justify-center rounded-full bg-success text-surface shadow-[0_0_30px_-4px_var(--color-success)] motion-reduce:animate-none">
                <Icon name="check" size={30} strokeWidth={2.5} />
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <header className="min-w-0">
            <h3 className="text-xl font-semibold text-fg">{reward.name}</h3>
            <p className="mt-0.5 text-sm text-fg-muted">{reward.description}</p>
          </header>

          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className={captionClass}>{translate('tradeWin.lotRequirement')}</p>
              <p className="font-mono text-xs font-semibold text-primary tabular-nums">{requirementShare}%</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-fg tabular-nums">
              {reward.lotRequirement} <span className="text-sm font-medium text-fg-muted">{translate('tradeWin.lots')}</span>
            </p>
            <div
              role="progressbar"
              aria-label={translate('tradeWin.requirementProgress')}
              aria-valuenow={requirementShare}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 flex gap-1"
            >
              {REQUIREMENT_CELLS.map((cell) => (
                <span
                  key={cell}
                  aria-hidden="true"
                  style={{ transitionDelay: `${cell * 30}ms` }}
                  className={cx(
                    'h-2 flex-1 rounded-sm transition-colors duration-500 motion-reduce:transition-none',
                    cell < (requirementShare / 100) * REQUIREMENT_CELLS.length ? 'bg-primary' : 'bg-line',
                  )}
                />
              ))}
            </div>
            {reward.closedTradesOnly && <p className="mt-2 text-[11px] text-fg-subtle">{translate('tradeWin.closedTradesOnly')}</p>}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Spec sheet: one dashed-ruled line per allowance and balance. */}
            <dl className="divide-y divide-dashed divide-line rounded-xl ring-1 ring-line">
              {facts.map((fact) => (
                <div key={fact.key} className="flex min-w-0 items-center gap-3 px-3.5 py-2.5">
                  <Icon name={fact.icon} size={14} className="shrink-0 text-fg-subtle" />
                  <dt className="min-w-0 flex-1 truncate text-xs text-fg-muted">{fact.label}</dt>
                  <dd className={cx('max-w-[55%] truncate text-right text-sm font-semibold tabular-nums', fact.highlight ? 'text-success' : 'text-fg')}>
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              <div className="relative overflow-hidden rounded-xl border border-line p-3">
                <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-0.5', stockLeft <= 2 ? 'bg-danger' : 'bg-primary/60')} />
                <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
                  <Icon name="inbox" size={13} />
                  {translate('tradeWin.stock')}
                </p>
                <p className={cx('mt-1 text-sm font-semibold', stockLeft <= 2 ? 'text-danger' : 'text-fg')}>{translate('tradeWin.stockLeft', { count: stockLeft })}</p>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-line p-3">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-primary/60" />
                <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
                  <Icon name="history" size={13} />
                  {translate('tradeWin.claimed')}
                </p>
                <p className="mt-1 text-sm font-semibold text-fg">{translate('tradeWin.claimedTimes', { count: claimed })}</p>
              </div>
            </div>
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

/** A product on the store rail: icon tile, name and tag, then value and live stock on the right. */
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
        'group relative flex w-64 shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:w-full',
        isSelected ? 'bg-primary/10 ring-primary/45' : 'ring-transparent hover:bg-fg/5 hover:ring-line',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary transition-transform duration-300 motion-reduce:transition-none',
          isSelected ? 'scale-y-100' : 'scale-y-0',
        )}
      />
      <span
        aria-hidden="true"
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-lg border transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
          isSelected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-line bg-surface-2 text-fg-subtle group-hover:text-primary',
        )}
      >
        <Icon name={categoryIcon[reward.category]} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{reward.name}</span>
        <span className="block truncate text-[9.5px] tracking-[0.14em] text-fg-subtle uppercase">{categoryTag(reward.category)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-xs font-bold text-primary tabular-nums">{formatMoney(reward.value, currency)}</span>
        <span className={cx('inline-flex items-center gap-1 text-[10px]', isReady ? 'text-success' : 'text-fg-subtle')}>
          <span aria-hidden="true" className={cx('size-1.5 rounded-full', isReady ? 'bg-success' : 'bg-fg/30')} />
          {translate('tradeWin.stockLeft', { count: stockLeft })}
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
    // The rail is a row on small screens and a column on large ones, so both arrow axes move through it.
    const isNext = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const isPrevious = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (isNext) nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    else if (isPrevious) nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;
    else return;

    event.preventDefault();
    const nextReward = visible[nextIndex];
    setSelectedId(nextReward.id);
    document.getElementById(`${baseId}-tab-${nextReward.id}`)?.focus();
  }

  return (
    <section className={cx(panelClass, 'relative isolate p-5 sm:p-6')}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(to_right,var(--color-line)_1px,transparent_1px)] [background-size:56px_100%] [mask-image:linear-gradient(to_bottom,black,transparent_30%)]"
      />

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className={cx(captionClass, 'text-primary')}>{translate('tradeWin.storeEyebrow')}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{translate('tradeWin.storeTitle')}</h2>
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-fg-muted">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            {translate('tradeWin.productsAvailable', { count: visible.length })}
          </p>
        </div>
        <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex gap-1 rounded-xl border border-line p-1">
          <FilterChip isActive={status === 'all'} onClick={() => setStatus('all')} count={rewards.length}>
            {translate('tradeWin.filterAll')}
          </FilterChip>
          <FilterChip isActive={status === 'ready'} onClick={() => setStatus('ready')} icon="bolt" count={readyCount}>
            {translate('tradeWin.readyToRedeem')}
          </FilterChip>
        </div>
      </header>

      <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="mt-4 flex gap-1 overflow-x-auto pb-1">
        <FilterChip isActive={category === 'all'} onClick={() => setCategory('all')}>
          {translate('tradeWin.filterAll')}
        </FilterChip>
        {CATEGORIES.map((item) => (
          <FilterChip key={item} isActive={category === item} onClick={() => setCategory(item)} icon={categoryIcon[item]}>
            {categoryLabel(item)}
          </FilterChip>
        ))}
      </div>

      {!selected ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <span aria-hidden="true" className="mb-4 grid size-14 rotate-45 place-items-center rounded-2xl border border-dashed border-primary/40">
            <Icon name="inbox" size={22} className="-rotate-45 text-fg-subtle" />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noProducts')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.noProductsText')}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
          <div
            role="tablist"
            aria-label={translate('tradeWin.productTabs')}
            aria-orientation="vertical"
            onKeyDown={handleTabKeyDown}
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
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

          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${selected.id}`} className="min-w-0">
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
        </div>
      )}
    </section>
  );
}

// Step heights read 2 · 1 · 3 left to right, champion tallest.
const podiumHeight: Record<number, string> = { 1: 'h-32', 2: 'h-20', 3: 'h-14' };
// Cells in each timing-tower meter.
const TOWER_CELLS = 12;

/** A top-three trader standing on their podium step. */
function PodiumStep({ leader, order }: { leader: TradeWinLeader; order: number }) {
  const isChampion = leader.rank === 1;

  return (
    <li
      style={{ animationDelay: `${order * 120}ms` }}
      className="group/step flex min-w-0 animate-rise flex-col items-center motion-reduce:animate-none"
    >
      <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
      {isChampion && (
        <span
          aria-hidden="true"
          className="mb-2 grid size-8 animate-float place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40 [animation-duration:3s] motion-reduce:animate-none"
        >
          <Icon name="trophy" size={15} />
        </span>
      )}
      <span
        aria-hidden="true"
        className={cx(
          'grid place-items-center rounded-2xl font-bold transition-transform duration-300 group-hover/step:-translate-y-1 motion-reduce:transition-none',
          isChampion
            ? 'size-16 bg-primary/15 text-2xl text-primary ring-2 ring-primary/50 shadow-[0_0_30px_-8px_var(--brand-primary)]'
            : 'size-12 bg-surface-2 text-base text-fg ring-1 ring-line',
        )}
      >
        {leader.name.charAt(0)}
      </span>
      <span className="mt-2 w-full truncate text-center text-xs font-semibold text-fg">{leader.name}</span>
      <span className="flex items-baseline gap-1">
        <span className={cx('font-bold tabular-nums', isChampion ? 'orbit-text text-xl' : 'text-sm text-fg')}>{leader.closedLots}</span>
        <span className="text-[10px] text-fg-subtle">{translate('tradeWin.lots')}</span>
      </span>
      <div
        className={cx(
          'relative mt-3 w-full overflow-hidden rounded-t-2xl border border-b-0 bg-linear-to-b',
          podiumHeight[leader.rank],
          isChampion ? 'border-primary/40 from-primary/20 to-primary/[0.03]' : 'border-line from-surface-2 to-transparent',
        )}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
        <span
          aria-hidden="true"
          className={cx('absolute top-3 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full text-xs font-bold', medalClass[leader.rank])}
        >
          {leader.rank}
        </span>
      </div>
    </li>
  );
}

/** One chaser in the timing tower: a cell meter lit to their share of the lead chaser's lots. */
function TowerRow({ leader, share, order }: { leader: TradeWinLeader; share: number; order: number }) {
  const litCells = Math.round((Math.max(share, MIN_LANE_SHARE) / 100) * TOWER_CELLS);

  return (
    <li
      style={{ animationDelay: `${order * 90}ms` }}
      className="group/row grid animate-rise grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-3 px-3 py-2.5 transition-colors duration-300 hover:bg-primary/5 motion-reduce:animate-none"
    >
      <span className="font-mono text-xs font-bold text-fg-subtle tabular-nums">#{leader.rank}</span>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-bold text-primary ring-1 ring-line transition-transform duration-300 group-hover/row:scale-110 motion-reduce:transition-none"
        >
          {leader.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-fg-muted transition-colors group-hover/row:text-fg">{leader.name}</p>
          <span aria-hidden="true" className="mt-1.5 flex gap-0.5">
            {Array.from({ length: TOWER_CELLS }, (_, cell) => (
              <span
                key={cell}
                style={{ animationDelay: `${300 + cell * 40}ms` }}
                className={cx('h-1.5 flex-1 animate-rise rounded-sm motion-reduce:animate-none', cell < litCells ? 'bg-primary/70' : 'bg-line')}
              />
            ))}
          </span>
        </div>
      </div>
      <span className="text-right">
        <span className="text-sm font-bold text-fg tabular-nums">{leader.closedLots}</span>
        <span className="ml-1 text-[11px] text-fg-subtle">{translate('tradeWin.lots')}</span>
      </span>
    </li>
  );
}

function LiveLeaderboard({ leaders }: { leaders: TradeWinLeader[] }) {
  const [round, setRound] = useState(0);
  const refreshIconRef = useRef<HTMLSpanElement>(null);
  const podium = [2, 1, 3]
    .map((rank) => leaders.find((leader) => leader.rank === rank))
    .filter((leader): leader is TradeWinLeader => leader !== undefined);
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);
  // Tower meters run against the lead chaser, so the gaps between them stay visible next to the champion's total.
  const leadChaserLots = Math.max(0, ...chasers.map((leader) => leader.closedLots));

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate(SPIN_KEYFRAMES, { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section className={cx(panelClass, 'relative isolate p-5 sm:p-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-linear-to-b from-primary/10 to-transparent" />

      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-primary/35 bg-primary/10 text-primary">
          <Icon name="trophy" size={16} />
        </span>
        <h2 className="text-base font-semibold text-fg">{translate('tradeWin.leaderboardTitle')}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.12em] text-danger uppercase">
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
          className="ml-auto flex size-9 items-center justify-center rounded-xl border border-line text-fg-muted transition-colors hover:border-primary/40 hover:text-primary"
        >
          <span ref={refreshIconRef} className="flex">
            <Icon name="refresh" size={15} />
          </span>
        </button>
      </header>

      <div key={round} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
        <ol className="grid grid-cols-3 items-end gap-2 border-b border-line sm:gap-3">
          {podium.map((leader, index) => (
            <PodiumStep key={leader.rank} leader={leader} order={index} />
          ))}
        </ol>

        {chasers.length > 0 && (
          <div className="overflow-hidden rounded-2xl ring-1 ring-line">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] gap-3 border-b border-line bg-surface-2/50 px-3 py-2">
              <span className={captionClass}>{translate('tradeWin.rank')}</span>
              <span className={captionClass}>{translate('tradeWin.trader')}</span>
              <span className={cx(captionClass, 'text-right')}>{translate('tradeWin.closedLots')}</span>
            </div>
            <ol start={PODIUM_SIZE + 1} className="divide-y divide-line">
              {chasers.map((leader, index) => (
                <TowerRow
                  key={leader.rank}
                  leader={leader}
                  share={leadChaserLots > 0 ? (leader.closedLots / leadChaserLots) * 100 : 0}
                  order={index}
                />
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
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-[28px]" />
          <Skeleton className="h-96 rounded-[28px]" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[34rem] rounded-[28px]" />
          <Skeleton className="h-[34rem] rounded-[28px]" />
        </div>
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
      {/* Top deck: the lots dial beside the live race it feeds. */}
      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <LotsWallet
          availableLots={availableLots}
          tradedLots={data.tradedLots}
          spentLots={data.spentLots + sessionLotsSpent}
          pastWins={pastWins.length}
          valueWon={valueWon}
          currency={currency}
          isIb={isIb}
        />
        <LiveLeaderboard leaders={data.leaders} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="min-w-0">
          <RewardStore
            rewards={data.rewards}
            currency={currency}
            availableLots={availableLots}
            availableDeposit={data.availableDeposit}
            stockLeftOf={(reward) => reward.stock - redeemedQuantity(reward)}
            claimedOf={(reward) => reward.claimed + redeemedQuantity(reward)}
            onRedeem={handleRedeem}
          />
        </div>
        <PastWins entries={pastWins} currency={currency} />
      </div>
    </div>
  );
}

export default function TradeWinPage() {
  const { data, isLoading } = useTradeWin();
  return <TradeWinScreen data={data} isLoading={isLoading} isIb={false} />;
}
