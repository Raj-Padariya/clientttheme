'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RewardCategory, TradeWinLeader, TradeWinOverview, TradeWinReward } from '@/core/pages/useTradeWin';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

import { RedeemPrizeModal } from './RedeemPrizeModal';
import { prefersReducedMotion, useAnimatedNumber, useMotion } from './ScratchExperience';
import { FIRST_REFERENCE, allowedText, categoryIcon, categoryLabel, categoryTag, formatLots, type PastWin } from './TradeWinPage';

type StatusFilter = 'all' | 'ready';
type CategoryFilter = 'all' | RewardCategory;

const CATEGORIES: RewardCategory[] = ['travel', 'electronics', 'cash', 'merchandise'];
const PODIUM_SIZE = 3;
const CELEBRATION_MS = 2200;
// Keeps a tiny lots share visible as a sliver instead of disappearing.
const MIN_BAR_SHARE = 4;
const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const captionClass = 'text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase';
const panelClass = 'orbit-card overflow-hidden';

const medalClass: Record<number, string> = {
  1: 'text-on-primary [background-image:var(--brand-gradient)]',
  2: 'bg-fg-muted text-surface',
  3: 'bg-warning text-surface',
};

const FLOAT_KEYFRAMES: Keyframe[] = [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }];
const FLOAT_OPTIONS: KeyframeAnimationOptions = { duration: 4200, iterations: Infinity, easing: 'ease-in-out' };
const SHINE_KEYFRAMES: Keyframe[] = [
  { transform: 'translateX(-120%) skewX(-18deg)' },
  { transform: 'translateX(520%) skewX(-18deg)' },
];
const SHINE_OPTIONS: KeyframeAnimationOptions = { duration: 5200, delay: 600, iterations: Infinity, easing: 'ease-in-out' };
const SPIN_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];

const pastWinText = {
  submitted: 'SUBMITTED',
  reference: 'Reference',
  processing: 'We are currently processing your reward',
  submittedOn: 'Submitted',
};

/** Full-width ledger strip: spendable IB lots with the downline volume split, then wins and value won. */
function PartnerLedger({
  availableLots,
  tradedLots,
  spentLots,
  pastWins,
  valueWon,
  currency,
}: {
  availableLots: number;
  tradedLots: number;
  spentLots: number;
  pastWins: number;
  valueWon: number;
  currency: string;
}) {
  const shineRef = useRef<HTMLSpanElement>(null);
  const lots = useAnimatedNumber(availableLots, 1200);
  const wins = useAnimatedNumber(pastWins, 900);
  const won = useAnimatedNumber(valueWon, 1200);

  useMotion(shineRef, SHINE_KEYFRAMES, SHINE_OPTIONS);

  const volume = Math.max(tradedLots, availableLots + spentLots);
  const availableShare = volume > 0 ? (availableLots / volume) * 100 : 0;
  const spentShare = volume > 0 ? (spentLots / volume) * 100 : 0;
  const hasVolume = volume > 0;

  const stats: { key: string; icon: IconName; label: string; hint: string; value: string }[] = [
    { key: 'wins', icon: 'checkCircle', label: translate('tradeWin.pastWins'), hint: translate('tradeWin.totalRedemptions'), value: String(Math.round(wins)) },
    { key: 'won', icon: 'wallet', label: translate('tradeWin.valueWon'), hint: translate('tradeWin.totalPrizeValue'), value: formatMoney(won, currency) },
  ];

  return (
    <section className={cx(panelClass, 'relative isolate')}>
      <span ref={shineRef} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/5 bg-linear-to-r from-transparent via-white/[0.05] to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-16 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" />

      <div className="grid divide-y divide-line lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <p className={cx(captionClass, 'flex items-center gap-2 text-primary')}>
            <Icon name="pieChart" size={14} />
            {translate('tradeWin.availableIbLots')}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="orbit-text text-5xl font-black tracking-tight tabular-nums">{formatLots(lots)}</span>
            <span className="text-xs font-semibold tracking-[0.16em] text-fg-subtle uppercase">{translate('tradeWin.lots')}</span>
          </p>

          {/* Downline volume split: violet is still spendable, muted is already spent on rewards. */}
          <div aria-hidden="true" className="relative flex h-3 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
            {hasVolume ? (
              <>
                <span style={{ width: `${availableShare}%` }} className="h-full bg-linear-to-r from-primary/50 to-primary transition-[width] duration-1000 motion-reduce:transition-none" />
                <span style={{ width: `${spentShare}%` }} className="h-full bg-fg/20 transition-[width] duration-1000 motion-reduce:transition-none" />
              </>
            ) : (
              <span className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,color-mix(in_oklab,var(--brand-primary)_22%,transparent)_0_5px,transparent_5px_11px)]" />
            )}
          </div>
          <p className="text-sm text-fg-muted">
            {translate('tradeWin.downlineSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
          </p>
        </div>

        {stats.map((stat, index) => (
          <dl key={stat.key} style={{ animationDelay: `${index * 120}ms` }} className="group/stat relative flex min-w-0 animate-rise items-center gap-4 p-5 sm:p-6 motion-reduce:animate-none">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 rounded-full border border-dashed border-primary/40 transition-transform duration-700 group-hover/stat:rotate-90 motion-reduce:transition-none" />
              <span className="absolute inset-2 animate-ring-breathe rounded-full bg-primary/10 motion-reduce:animate-none" />
              <Icon name={stat.icon} size={18} className="relative text-primary" />
            </span>
            <div className="min-w-0">
              <dt className={cx(captionClass, 'truncate')}>{stat.label}</dt>
              <dd className="mt-1 truncate text-2xl font-bold text-fg tabular-nums">{stat.value}</dd>
              <dd className="truncate text-[11px] text-fg-subtle">{stat.hint}</dd>
            </div>
          </dl>
        ))}
      </div>
    </section>
  );
}

function FilterPill({
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
        'group/pill inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition-[background-color,color,box-shadow] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-primary/15 text-fg ring-primary/50 shadow-[0_0_18px_-8px_var(--brand-primary)]' : 'text-fg-muted ring-line hover:text-fg hover:ring-primary/30',
      )}
    >
      {icon && (
        <Icon
          name={icon}
          size={14}
          className={cx('transition-transform duration-300 group-hover/pill:-rotate-12 motion-reduce:transition-none', isActive && 'text-primary')}
        />
      )}
      {children}
      {count !== undefined && (
        <span className={cx('grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-primary text-on-primary' : 'bg-fg/5 text-fg-subtle')}>
          {count}
        </span>
      )}
    </button>
  );
}

/** A reward in the vault grid: product shot on a spotlight, then name, value, lot requirement and live stock. */
function VaultCard({
  reward,
  currency,
  isSelected,
  isReady,
  stockLeft,
  tabId,
  panelId,
  order,
  onSelect,
}: {
  reward: TradeWinReward;
  currency: string;
  isSelected: boolean;
  isReady: boolean;
  stockLeft: number;
  tabId: string;
  panelId: string;
  order: number;
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
      style={{ animationDelay: `${order * 70}ms` }}
      className={cx(
        'group relative flex min-w-0 animate-rise flex-col overflow-hidden rounded-2xl text-left ring-1 transition-[box-shadow,background-color,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
        isSelected ? 'bg-primary/10 ring-primary/50 shadow-[0_18px_40px_-24px_var(--brand-primary)]' : 'bg-surface-2/30 ring-line hover:ring-primary/30',
      )}
    >
      <span className="relative flex h-28 items-center justify-center overflow-hidden border-b border-line bg-black/30 light:bg-surface-2">
        {reward.image ? (
          <>
            {/* Reward art is a full-bleed scene with its own backdrop, so it covers the stage instead of floating as a boxed thumbnail. */}
            <Image
              src={reward.image}
              alt=""
              aria-hidden="true"
              fill
              unoptimized
              sizes="240px"
              className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
            />
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-black/25" />
            <span aria-hidden="true" className="absolute inset-0 bg-primary/10 mix-blend-color" />
          </>
        ) : (
          <>
            <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-12 w-2/3 -translate-x-1/2 rounded-[50%] bg-primary/25 blur-2xl" />
            <Icon name={categoryIcon[reward.category]} size={30} className="relative text-primary" />
          </>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold tracking-[0.14em] text-white uppercase ring-1 ring-white/15 backdrop-blur-md">
          <Icon name={categoryIcon[reward.category]} size={10} />
          {categoryTag(reward.category)}
        </span>
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-on-primary transition-[opacity,transform] duration-300 motion-reduce:transition-none',
            isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        >
          <Icon name="check" size={13} strokeWidth={2.5} />
        </span>
      </span>

      <span className="flex flex-col gap-2 p-3">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-fg">{reward.name}</span>
          <span className="shrink-0 font-mono text-xs font-bold text-primary tabular-nums">{formatMoney(reward.value, currency)}</span>
        </span>
        <span className="flex items-center justify-between gap-2 text-[10.5px]">
          <span className="inline-flex min-w-0 items-center gap-1 truncate text-fg-subtle">
            <Icon name="pieChart" size={11} className="shrink-0" />
            {translate('tradeWin.lotsValue', { lots: reward.lotRequirement })}
          </span>
          <span className={cx('inline-flex shrink-0 items-center gap-1', isReady ? 'text-success' : 'text-fg-subtle')}>
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', isReady ? 'bg-success' : 'bg-fg/30')} />
            {translate('tradeWin.stockLeft', { count: stockLeft })}
          </span>
        </span>
      </span>
    </button>
  );
}

function QuantityDial({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35';

  return (
    <div className="flex items-center gap-2">
      <span className={captionClass}>{translate('tradeWin.quantity')}</span>
      <div className="flex items-center gap-1 rounded-full bg-primary/5 p-1 ring-1 ring-primary/25">
        <button type="button" aria-label={translate('tradeWin.decrease')} disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepClass}>
          <span aria-hidden="true" className="text-base leading-none">−</span>
        </button>
        <span key={value} aria-live="polite" className="w-8 animate-rise text-center text-sm font-bold text-fg tabular-nums motion-reduce:animate-none">
          {value}
        </span>
        <button type="button" aria-label={translate('tradeWin.increase')} disabled={value >= max} onClick={() => onChange(value + 1)} className={stepClass}>
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}

/** The selected reward as a two-part voucher: product stage, perforation, then requirement ring, rules and redeem. */
function RewardVoucher({
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
  const ringShare = useAnimatedNumber(requirementShare, 1100);
  const isLowStock = stockLeft <= 2;
  const inventoryTotal = stockLeft + claimed;
  const stockShare = inventoryTotal > 0 ? (stockLeft / inventoryTotal) * 100 : 0;

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
      <article className="relative grid animate-rise overflow-hidden rounded-3xl bg-surface-2/30 ring-1 ring-line motion-reduce:animate-none md:grid-cols-[minmax(0,0.95fr)_auto_minmax(0,1.05fr)]">
        {/* Product stage: the whole image (contain) over a blurred copy, under a violet spotlight. */}
        <div className="group relative isolate flex min-h-60 items-center justify-center overflow-hidden bg-black/40 px-5 py-8 light:bg-surface-2">
          <span aria-hidden="true" className="absolute -top-10 left-1/2 -z-10 h-40 w-3/4 -translate-x-1/2 rounded-[50%] bg-primary/20 blur-3xl" />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 [background-image:radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
          />

          {reward.image ? (
            <>
              <Image src={reward.image} alt="" aria-hidden="true" fill unoptimized sizes="50vw" className="-z-20 scale-110 object-cover opacity-25 blur-2xl" />
              <div className="relative aspect-[4/3] w-full max-w-sm">
                <Image
                  src={reward.image}
                  alt={reward.name}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-contain drop-shadow-[0_24px_36px_rgba(0,0,0,0.55)] transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
                />
              </div>
            </>
          ) : (
            <div ref={artRef} aria-hidden="true" className="relative grid size-40 place-items-center">
              <span className="absolute inset-2 rounded-full border border-dashed border-primary/35" />
              <span className="absolute inset-7 animate-ring-breathe rounded-full border border-primary/20 motion-reduce:animate-none" />
              <span className="relative grid size-20 place-items-center rounded-full border border-primary/50 bg-primary/15 text-primary shadow-[0_20px_40px_-18px_var(--brand-primary)]">
                <Icon name={categoryIcon[reward.category]} size={36} strokeWidth={1.5} />
              </span>
            </div>
          )}

          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-white uppercase ring-1 ring-white/15 backdrop-blur-md">
            <Icon name={categoryIcon[reward.category]} size={12} />
            {categoryTag(reward.category)}
          </span>
          <span className="absolute bottom-4 left-4 flex flex-col rounded-2xl bg-black/55 px-3.5 py-2 ring-1 ring-primary/40 backdrop-blur-md">
            <span className="text-[9.5px] tracking-[0.14em] text-white/60 uppercase">{translate('tradeWin.value')}</span>
            <span className="text-xl font-bold text-white tabular-nums">{formatMoney(reward.value, currency)}</span>
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

        {/* Perforation between the stage and the stub, with punched notches at both ends. */}
        <div aria-hidden="true" className="relative hidden w-px md:block">
          <span className="absolute inset-y-6 left-0 border-l-2 border-dashed border-line" />
          <span className="absolute -top-3 -left-3 size-6 rounded-full bg-bg ring-1 ring-line" />
          <span className="absolute -bottom-3 -left-3 size-6 rounded-full bg-bg ring-1 ring-line" />
        </div>

        <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <header className="min-w-0">
            <h3 className="text-xl font-semibold text-fg">{reward.name}</h3>
            <p className="mt-0.5 text-sm text-fg-muted">{reward.description}</p>
          </header>

          <div className="flex items-center gap-4">
            <div
              role="progressbar"
              aria-label={translate('tradeWin.requirementProgress')}
              aria-valuenow={requirementShare}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative size-24 shrink-0"
            >
              <svg aria-hidden="true" viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="7" className="stroke-line" />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - ringShare / 100)}
                  className="stroke-primary drop-shadow-[0_0_6px_var(--brand-primary)]"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-bold text-fg tabular-nums">{Math.round(ringShare)}%</span>
              </span>
            </div>
            <div className="min-w-0">
              <p className={captionClass}>{translate('tradeWin.lotRequirement')}</p>
              <p className="mt-1 text-2xl font-semibold text-fg tabular-nums">
                {reward.lotRequirement} <span className="text-sm font-medium text-fg-muted">{translate('tradeWin.lots')}</span>
              </p>
              {reward.closedTradesOnly && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/30">
                  <Icon name="checkCircle" size={12} />
                  {translate('tradeWin.closedTradesOnly')}
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {facts.map((fact) => (
              <div key={fact.key} className="min-w-0 rounded-xl bg-fg/[0.03] p-3 ring-1 ring-line">
                <dt className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
                  <Icon name={fact.icon} size={12} className="shrink-0" />
                  <span className="truncate">{fact.label}</span>
                </dt>
                <dd className={cx('mt-1 truncate text-sm font-semibold tabular-nums', fact.highlight ? 'text-success' : 'text-fg')}>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {/* Inventory meter: what is left in stock against how many times it has been claimed. */}
          <div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className={cx('inline-flex items-center gap-1.5', isLowStock ? 'text-danger' : 'text-fg-muted')}>
                <Icon name="inbox" size={13} />
                {translate('tradeWin.stock')}
                <span className="font-semibold">{translate('tradeWin.stockLeft', { count: stockLeft })}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-fg-muted">
                <Icon name="history" size={13} />
                {translate('tradeWin.claimed')}
                <span className="font-semibold text-fg">{translate('tradeWin.claimedTimes', { count: claimed })}</span>
              </span>
            </div>
            <div aria-hidden="true" className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full">
              <span style={{ width: `${Math.max(stockShare, stockLeft > 0 ? MIN_BAR_SHARE : 0)}%` }} className={cx('h-full rounded-full', isLowStock ? 'bg-danger' : 'bg-primary')} />
              <span className="h-full flex-1 rounded-full bg-fg/15" />
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-fg/10 pt-4">
            <QuantityDial value={safeQuantity} max={Math.max(stockLeft, 1)} onChange={setQuantity} />
            <Button type="button" className="min-w-40 flex-1 sm:flex-none" disabled={!canRedeem && !isCelebrating} onClick={handleRedeem}>
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

function RewardVault({
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
    // The vault is a wrapping grid, so both arrow axes step through it in reading order.
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
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/35">
            <Icon name="gift" size={20} />
          </span>
          <div>
            <p className={cx(captionClass, 'text-primary')}>{translate('tradeWin.storeEyebrow')}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-fg">{translate('tradeWin.storeTitle')}</h2>
          </div>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs text-success ring-1 ring-success/25">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          {translate('tradeWin.productsAvailable', { count: visible.length })}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-fg/[0.03] p-3 ring-1 ring-line lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <FilterPill isActive={category === 'all'} onClick={() => setCategory('all')}>
            {translate('tradeWin.filterAll')}
          </FilterPill>
          {CATEGORIES.map((item) => (
            <FilterPill key={item} isActive={category === item} onClick={() => setCategory(item)} icon={categoryIcon[item]}>
              {categoryLabel(item)}
            </FilterPill>
          ))}
        </div>
        <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex shrink-0 gap-1.5">
          <FilterPill isActive={status === 'all'} onClick={() => setStatus('all')} count={rewards.length}>
            {translate('tradeWin.filterAll')}
          </FilterPill>
          <FilterPill isActive={status === 'ready'} onClick={() => setStatus('ready')} icon="bolt" count={readyCount}>
            {translate('tradeWin.readyToRedeem')}
          </FilterPill>
        </div>
      </div>

      {!selected ? (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <span aria-hidden="true" className="relative mb-4 grid size-16 place-items-center">
            <span className="absolute inset-0 rounded-full border border-dashed border-primary/40" />
            <span className="absolute inset-2 animate-ring-breathe rounded-full bg-primary/10 motion-reduce:animate-none" />
            <Icon name="inbox" size={22} className="relative text-fg-subtle" />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noProducts')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.noProductsText')}</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <div
            role="tablist"
            aria-label={translate('tradeWin.productTabs')}
            onKeyDown={handleTabKeyDown}
            className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3"
          >
            {visible.map((reward, index) => (
              <VaultCard
                key={reward.id}
                reward={reward}
                currency={currency}
                isSelected={reward.id === selected.id}
                isReady={isReady(reward)}
                stockLeft={stockLeftOf(reward)}
                tabId={`${baseId}-tab-${reward.id}`}
                panelId={`${baseId}-panel`}
                order={index}
                onSelect={() => setSelectedId(reward.id)}
              />
            ))}
          </div>

          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${selected.id}`} className="min-w-0">
            <RewardVoucher
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

/** A top-three trader as a medal ribbon; the champion's ribbon is taller and glows. */
function MedalRibbon({ leader, order }: { leader: TradeWinLeader; order: number }) {
  const isChampion = leader.rank === 1;

  return (
    <li
      style={{ animationDelay: `${order * 120}ms` }}
      className={cx(
        'group/medal relative flex animate-rise items-center gap-3 overflow-hidden rounded-2xl ring-1 transition-transform duration-300 hover:translate-x-1 motion-reduce:animate-none motion-reduce:transition-none',
        isChampion ? 'bg-linear-to-r from-primary/25 to-primary/[0.04] p-4 ring-primary/45 shadow-[0_18px_40px_-26px_var(--brand-primary)]' : 'bg-surface-2/40 p-3 ring-line',
      )}
    >
      <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
      <span aria-hidden="true" className={cx('grid shrink-0 place-items-center rounded-full font-bold', isChampion ? 'size-9 text-sm' : 'size-7 text-xs', medalClass[leader.rank])}>
        {leader.rank}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'grid shrink-0 place-items-center rounded-xl font-bold',
          isChampion ? 'size-11 bg-primary/20 text-lg text-primary ring-1 ring-primary/50' : 'size-9 bg-surface-2 text-sm text-fg ring-1 ring-line',
        )}
      >
        {leader.name.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{leader.name}</span>
      <span className="flex shrink-0 items-baseline gap-1">
        <span className={cx('font-bold tabular-nums', isChampion ? 'orbit-text text-2xl' : 'text-base text-fg')}>{leader.closedLots}</span>
        <span className="text-[10px] text-fg-subtle">{translate('tradeWin.lots')}</span>
      </span>
      {isChampion && (
        <span aria-hidden="true" className="absolute -top-1 right-16 animate-float text-primary/40 [animation-duration:3s] motion-reduce:animate-none">
          <Icon name="trophy" size={34} />
        </span>
      )}
    </li>
  );
}

/** One chaser on the ladder: rank, name, dotted leader to their lots, and a bar against the lead chaser. */
function LadderRow({ leader, share, order }: { leader: TradeWinLeader; share: number; order: number }) {
  return (
    <li
      style={{ animationDelay: `${order * 80}ms` }}
      className="group/row animate-rise rounded-xl px-2 py-2 transition-colors duration-300 hover:bg-primary/5 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-7 shrink-0 font-mono text-[11px] font-bold text-fg-subtle tabular-nums">#{leader.rank}</span>
        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-primary ring-1 ring-line">
          {leader.name.charAt(0)}
        </span>
        <span className="min-w-0 truncate text-xs text-fg-muted transition-colors group-hover/row:text-fg">{leader.name}</span>
        <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-fg/20" />
        <span className="shrink-0 text-xs font-bold text-fg tabular-nums">
          {leader.closedLots} <span className="font-normal text-fg-subtle">{translate('tradeWin.lots')}</span>
        </span>
      </div>
      <span aria-hidden="true" className="mt-1.5 ml-[4.25rem] block h-1 overflow-hidden rounded-full bg-line">
        <span style={{ width: `${Math.max(share, MIN_BAR_SHARE)}%` }} className="block h-full rounded-full bg-linear-to-r from-primary/40 to-primary" />
      </span>
    </li>
  );
}

function RaceBoard({ leaders }: { leaders: TradeWinLeader[] }) {
  const [round, setRound] = useState(0);
  const refreshIconRef = useRef<HTMLSpanElement>(null);
  const podium = leaders.filter((leader) => leader.rank <= PODIUM_SIZE).sort((a, b) => a.rank - b.rank);
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);
  // Ladder bars run against the lead chaser, so the gaps between them stay visible next to the champion's total.
  const leadChaserLots = Math.max(0, ...chasers.map((leader) => leader.closedLots));

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate(SPIN_KEYFRAMES, { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section className={cx(panelClass, 'relative isolate p-5')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-primary/10 to-transparent" />

      <header className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/35">
          <Icon name="trophy" size={16} />
        </span>
        <h2 className="text-base font-semibold text-fg">{translate('tradeWin.leaderboardTitle')}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-danger uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-danger motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-danger" />
          </span>
          {translate('tradeWin.live')}
        </span>
        <button
          type="button"
          onClick={refresh}
          aria-label={translate('tradeWin.refresh')}
          className="ml-auto grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span ref={refreshIconRef} className="flex">
            <Icon name="refresh" size={15} />
          </span>
        </button>
      </header>

      <div key={round} className="mt-5 flex flex-col gap-4">
        <ol className="flex flex-col gap-2">
          {podium.map((leader, index) => (
            <MedalRibbon key={leader.rank} leader={leader} order={index} />
          ))}
        </ol>

        {chasers.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 border-b border-dashed border-line px-2 pb-2">
              <span className={cx(captionClass, 'w-7')}>{translate('tradeWin.rank')}</span>
              <span className={cx(captionClass, 'flex-1')}>{translate('tradeWin.trader')}</span>
              <span className={captionClass}>{translate('tradeWin.closedLots')}</span>
            </div>
            <ol start={PODIUM_SIZE + 1} className="mt-1 flex flex-col">
              {chasers.map((leader, index) => (
                <LadderRow
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

/** One claim as a perforated receipt: category stub on the left, claim details and processing status on the right. */
function ClaimReceipt({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';

  return (
    <li
      style={{ animationDelay: `${index * 80}ms` }}
      className="group relative grid animate-rise grid-cols-[3.75rem_minmax(0,1fr)] overflow-hidden rounded-2xl bg-surface-2/40 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-primary/35 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="relative flex items-center justify-center border-r-2 border-dashed border-line bg-primary/10 text-primary">
        <span className="transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none">
          <Icon name={icon} size={20} />
        </span>
        <span className="absolute -top-2 -right-2 size-4 rounded-full bg-bg" />
        <span className="absolute -right-2 -bottom-2 size-4 rounded-full bg-bg" />
      </span>

      <div className="min-w-0 p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">
              {entry.rewardName} {entry.quantity > 1 && <span className="text-fg-subtle">× {entry.quantity}</span>}
            </p>
            <p className="truncate text-xs text-fg-muted">{entry.category ? categoryTag(entry.category) : formatDate(entry.redeemedAt)}</p>
          </div>
          {entry.reference ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning/10 px-2 py-1 text-[9.5px] font-bold tracking-[0.16em] text-warning ring-1 ring-warning/30">
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
            <p className="mt-2 flex items-center gap-2 text-[11px] text-fg-muted">
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
            <dl className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-fg/[0.03] px-2.5 py-1.5 text-[11px]">
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

function ClaimReceipts({ entries, currency }: { entries: PastWin[]; currency: string }) {
  return (
    <section className={cx(panelClass, 'relative isolate p-5')}>
      <header className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
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
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center [background-image:repeating-linear-gradient(135deg,color-mix(in_oklab,var(--brand-primary)_5%,transparent)_0_6px,transparent_6px_14px)]">
          <span aria-hidden="true" className="relative mb-5 grid size-16 place-items-center">
            <span className="absolute inset-0 rounded-full border border-dashed border-primary/45" />
            <span className="absolute inset-0 animate-ring-breathe rounded-full bg-primary/10 blur-md motion-reduce:animate-none" />
            <Icon name="trophy" size={22} className="relative text-primary" />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noRedemptions')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.keepTrading')}</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {entries.map((entry, index) => (
            <ClaimReceipt key={entry.id} entry={entry} currency={currency} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** IB Trade & Win: ledger strip on top, then the race board and claim receipts in a rail beside the reward vault. */
export function IbTradeWinScreen({ data, isLoading }: { data: TradeWinOverview | undefined; isLoading: boolean }) {
  const [redemptions, setRedemptions] = useState<PastWin[]>([]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-44 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-[26rem] rounded-[28px]" />
            <Skeleton className="h-56 rounded-[28px]" />
          </div>
          <Skeleton className="h-[40rem] rounded-[28px]" />
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
      <PartnerLedger
        availableLots={availableLots}
        tradedLots={data.tradedLots}
        spentLots={data.spentLots + sessionLotsSpent}
        pastWins={pastWins.length}
        valueWon={valueWon}
        currency={currency}
      />

      <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 xl:order-last">
          <RewardVault
            rewards={data.rewards}
            currency={currency}
            availableLots={availableLots}
            availableDeposit={data.availableDeposit}
            stockLeftOf={(reward) => Math.max(0, reward.stock - redeemedQuantity(reward))}
            claimedOf={(reward) => reward.claimed + redeemedQuantity(reward)}
            onRedeem={handleRedeem}
          />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <RaceBoard leaders={data.leaders} />
          <ClaimReceipts entries={pastWins} currency={currency} />
        </aside>
      </div>
    </div>
  );
}
