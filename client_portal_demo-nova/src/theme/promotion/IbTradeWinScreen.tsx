'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RewardCategory, TradeWinLeader, TradeWinOverview, TradeWinReward } from '@/core/pages/useTradeWin';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

import { RedeemPrizeModal } from './RedeemPrizeModal';
import { prefersReducedMotion, useAnimatedNumber } from './ScratchExperience';
import { FIRST_REFERENCE, allowedText, categoryIcon, categoryLabel, categoryTag, formatLots, type PastWin } from './TradeWinPage';

type StatusFilter = 'all' | 'ready';
type CategoryFilter = 'all' | RewardCategory;

const CATEGORIES: RewardCategory[] = ['travel', 'electronics', 'cash', 'merchandise'];
const PODIUM_SIZE = 3;
const PODIUM_ROWS = 12;
const CELEBRATION_MS = 2200;
const WALLET_BEADS = 30;
const LOT_METER_DOTS = 20;
const STOCK_BEADS = 20;
const CHASER_DOTS = 12;
const BURST_DOTS = 14;

/*
 * Nova IB Trade & Win: a frosted lot wallet beside a dark wins card, a full-width store (filter rail, porthole
 * shelf, frosted spec sheet), then a dot-matrix podium next to the claim tickets. Every meter is drawn in dots or beads.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden p-5 sm:p-6';
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] p-5 text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 sm:p-6';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

const pastWinText = {
  submitted: 'SUBMITTED',
  reference: 'Reference',
  processing: 'We are currently processing your reward',
  submittedOn: 'Submitted',
};

function Eyebrow({ icon, children, inverted = false }: { icon: IconName; children: ReactNode; inverted?: boolean }) {
  return (
    <p className={cx('flex items-center gap-2', captionClass, inverted ? 'text-white/55' : 'text-fg-subtle')}>
      <span className={cx('grid size-7 shrink-0 place-items-center rounded-full', inverted ? 'bg-white text-[#0a1220]' : 'bg-fg text-app')}>
        <Icon name={icon} size={13} />
      </span>
      {children}
    </p>
  );
}

/* ───────────── Lot wallet (frosted): spendable lots + downline volume as a bead string ───────────── */

function LotWallet({ availableLots, tradedLots, spentLots }: { availableLots: number; tradedLots: number; spentLots: number }) {
  const lots = useAnimatedNumber(availableLots, 1200);
  const volume = Math.max(tradedLots, availableLots + spentLots);
  const hasVolume = volume > 0;
  const availableBeads = hasVolume ? Math.round((availableLots / volume) * WALLET_BEADS) : 0;
  const spentBeads = hasVolume ? Math.min(WALLET_BEADS - availableBeads, Math.round((spentLots / volume) * WALLET_BEADS)) : 0;

  return (
    <FrostCard className="lg:col-span-7">
      <div className="flex h-full flex-col gap-5 text-[#0a1220]">
        <div className="flex items-center justify-between gap-3">
          <p className={cx('flex items-center gap-2 text-[#3b4658]', captionClass)}>
            <span className="grid size-7 place-items-center rounded-full bg-[#0a1220] text-white">
              <Icon name="pieChart" size={13} />
            </span>
            {translate('tradeWin.availableIbLots')}
          </p>
          <span aria-hidden="true" className="relative grid size-12 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/25 motion-reduce:animate-none" />
            <span className="grid size-8 animate-float place-items-center rounded-full bg-[#0a1220] text-white motion-reduce:animate-none">
              <Icon name="gift" size={14} />
            </span>
          </span>
        </div>

        <p className="flex items-baseline gap-2">
          <span className="font-mono text-6xl leading-none font-black tracking-tight tabular-nums">{formatLots(lots)}</span>
          <span className="text-xs font-bold tracking-[0.16em] text-[#3b4658] uppercase">{translate('tradeWin.lots')}</span>
        </p>

        {/* Downline volume: ink beads are still spendable, hollow beads were already spent on rewards. */}
        <span aria-hidden="true" className="relative flex items-center justify-between py-2">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-[#0a1220]/20" />
          {Array.from({ length: WALLET_BEADS }, (_, bead) => {
            const isAvailable = bead < availableBeads;
            const isSpent = !isAvailable && bead < availableBeads + spentBeads;
            return (
              <span
                key={bead}
                style={{ animationDelay: `${bead * 30}ms` }}
                className={cx(
                  'relative size-3 animate-dot-pop rounded-full motion-reduce:animate-none',
                  isAvailable && 'bg-[#0a1220]',
                  isSpent && 'bg-white ring-2 ring-[#0a1220]/40',
                  !isAvailable && !isSpent && (hasVolume ? 'bg-[#0a1220]/10' : 'border border-dashed border-[#0a1220]/30'),
                )}
              />
            );
          })}
        </span>

        <p className={cx('mt-auto self-start rounded-full px-4 py-2 text-sm text-[#3b4658]', frostChipClass)}>
          {translate('tradeWin.downlineSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
        </p>
      </div>
    </FrostCard>
  );
}

/* ───────────── Wins card (dark): wins + value won ───────────── */

function WinsCard({ pastWins, valueWon, currency }: { pastWins: number; valueWon: number; currency: string }) {
  const wins = useAnimatedNumber(pastWins, 900);
  const won = useAnimatedNumber(valueWon, 1200);
  const stats: { key: string; icon: IconName; label: string; hint: string; value: string }[] = [
    { key: 'wins', icon: 'checkCircle', label: translate('tradeWin.pastWins'), hint: translate('tradeWin.totalRedemptions'), value: String(Math.round(wins)) },
    { key: 'won', icon: 'wallet', label: translate('tradeWin.valueWon'), hint: translate('tradeWin.totalPrizeValue'), value: formatMoney(won, currency) },
  ];

  return (
    <section style={{ animationDelay: '100ms' }} className={cx(inkClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-5')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(200deg,#000,transparent_70%)]')} />
      <dl className="relative flex flex-1 flex-col justify-center divide-y-2 divide-dotted divide-white/15">
        {stats.map((stat, index) => (
          <div key={stat.key} style={{ animationDelay: `${200 + index * 120}ms` }} className="group/stat flex animate-feed-in items-center gap-4 py-5 first:pt-0 last:pb-0 motion-reduce:animate-none">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 rounded-full border-2 border-dashed border-white/25 group-hover/stat:animate-rim-spin motion-reduce:group-hover/stat:animate-none" />
              {index === 0 && <span className="absolute inset-1.5 animate-ring-ripple rounded-full ring-2 ring-white/25 motion-reduce:hidden" />}
              <span className="grid size-10 place-items-center rounded-full bg-white text-[#0a1220]">
                <Icon name={stat.icon} size={17} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <dt className={cx(captionClass, 'truncate text-white/55')}>{stat.label}</dt>
              <dd className="mt-1 truncate font-mono text-3xl font-black tracking-tight tabular-nums">{stat.value}</dd>
              <dd className="truncate text-[11px] text-white/45">{stat.hint}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Store: filter rail ───────────── */

function RailButton({ isActive, onClick, icon, children }: { isActive: boolean; onClick: () => void; icon: IconName; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cx(
        'group/rail flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-4 pl-1 text-xs font-semibold transition-[background-color,color,translate] duration-300 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      <span
        className={cx(
          'grid size-8 place-items-center rounded-full transition-transform duration-300 group-hover/rail:rotate-12 motion-reduce:transition-none',
          isActive ? 'bg-app text-fg' : 'nova-gloss text-fg',
        )}
      >
        <Icon name={icon} size={14} />
      </span>
      {children}
    </button>
  );
}

function StatusTile({ isActive, onClick, count, icon, children }: { isActive: boolean; onClick: () => void; count: number; icon: IconName; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cx(
        'flex min-w-0 flex-1 flex-col gap-2 rounded-[22px] p-3 text-left transition-[box-shadow,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-fg/[0.05] ring-2 ring-fg' : 'ring-1 ring-line hover:ring-line-strong',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <Icon name={icon} size={14} className={isActive ? 'text-fg' : 'text-fg-subtle'} />
        <span key={count} className="animate-dot-pop font-mono text-xl font-black text-fg tabular-nums motion-reduce:animate-none">
          {count}
        </span>
      </span>
      <span className="truncate text-[11px] font-semibold text-fg-muted">{children}</span>
    </button>
  );
}

/* ───────────── Store: porthole shelf card ───────────── */

function ShelfCard({
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
        'group relative flex w-52 shrink-0 animate-dot-pop snap-start flex-col items-center gap-3 rounded-[28px] p-4 text-center transition-[translate,background-color,box-shadow] duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
        isSelected ? 'bg-fg text-app shadow-[0_20px_36px_-24px_rgb(0_0_0/0.9)]' : 'text-fg ring-1 ring-line hover:ring-line-strong',
      )}
    >
      <span className={cx('absolute top-3 left-3 rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.14em] uppercase', isSelected ? 'bg-app/15 text-app' : 'bg-fg/[0.06] text-fg-muted')}>
        {categoryTag(reward.category)}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-app text-fg transition-[opacity,scale] duration-300 motion-reduce:transition-none',
          isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      >
        <Icon name="check" size={12} strokeWidth={2.5} />
      </span>

      {/* Porthole: the product framed in a round window; its dashed rim turns while the card is chosen. */}
      <span className="relative mt-5 grid size-28 place-items-center">
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-0 rounded-full border-2 border-dashed motion-reduce:animate-none',
            isSelected ? 'animate-rim-spin border-app/40' : 'border-fg/20 group-hover:animate-rim-spin',
          )}
        />
        <span className="relative grid size-24 place-items-center overflow-hidden rounded-full bg-fg/[0.06]">
          {reward.image ? (
            <Image
              src={reward.image}
              alt=""
              aria-hidden="true"
              fill
              unoptimized
              sizes="96px"
              className="object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none"
            />
          ) : (
            <Icon name={categoryIcon[reward.category]} size={30} className={isSelected ? 'text-app' : 'text-fg'} />
          )}
        </span>
      </span>

      <span className="w-full min-w-0">
        <span className="block truncate text-sm font-black">{reward.name}</span>
        <span className={cx('mt-0.5 block font-mono text-xs font-bold tabular-nums', isSelected ? 'text-app/75' : 'text-fg-muted')}>{formatMoney(reward.value, currency)}</span>
      </span>

      <span className={cx('flex w-full items-center justify-between gap-2 border-t-2 border-dotted pt-2.5 text-[10.5px]', isSelected ? 'border-app/20' : 'border-line-strong')}>
        <span className={cx('inline-flex min-w-0 items-center gap-1 truncate', isSelected ? 'text-app/70' : 'text-fg-subtle')}>
          <Icon name="pieChart" size={11} className="shrink-0" />
          {translate('tradeWin.lotsValue', { lots: reward.lotRequirement })}
        </span>
        <span className={cx('inline-flex shrink-0 items-center gap-1 font-semibold', isReady ? 'text-success' : isSelected ? 'text-app/60' : 'text-fg-subtle')}>
          <span aria-hidden="true" className={cx('size-1.5 rounded-full', isReady ? 'animate-blink bg-success motion-reduce:animate-none' : 'bg-current opacity-40')} />
          {translate('tradeWin.stockLeft', { count: stockLeft })}
        </span>
      </span>
    </button>
  );
}

/* ───────────── Store: frosted spec sheet for the chosen reward ───────────── */

function QuantityCapsule({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'grid size-9 place-items-center rounded-full bg-[#0a1220] text-white transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] disabled:pointer-events-none disabled:opacity-25';

  return (
    <div className="flex items-center gap-3">
      <span className={cx(captionClass, 'text-[#3b4658]')}>{translate('tradeWin.quantity')}</span>
      <div className={cx('flex items-center gap-1 rounded-full p-1', frostChipClass)}>
        <button type="button" aria-label={translate('tradeWin.decrease')} disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepClass}>
          <span aria-hidden="true" className="text-base leading-none">−</span>
        </button>
        <span key={value} aria-live="polite" className="w-9 animate-dot-pop text-center font-mono text-base font-black tabular-nums motion-reduce:animate-none">
          {value}
        </span>
        <button type="button" aria-label={translate('tradeWin.increase')} disabled={value >= max} onClick={() => onChange(value + 1)} className={stepClass}>
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}

function SpecSheet({
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
  const [quantity, setQuantity] = useState(1);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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
  const meterShare = useAnimatedNumber(requirementShare, 1100);
  const litMeterDots = Math.round((meterShare / 100) * LOT_METER_DOTS);
  const isLowStock = stockLeft <= 2;
  const inventoryTotal = stockLeft + claimed;
  const stockBeadCount = Math.min(inventoryTotal, STOCK_BEADS);
  const litStockBeads = inventoryTotal > 0 ? Math.round((stockLeft / inventoryTotal) * stockBeadCount) : 0;

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
      <FrostCard>
        <div className="grid grid-cols-1 gap-7 text-[#0a1220] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center">
          {/* Stage: a big porthole with the product, a turning dashed rim and soft ripples. */}
          <div className="relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/25 motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute inset-4 animate-ring-ripple rounded-full ring-2 ring-[#0a1220]/10 motion-reduce:hidden" />
            <span className="relative grid size-[82%] place-items-center overflow-hidden rounded-full bg-[#0a1220] shadow-[0_24px_40px_-24px_rgb(10_18_32/0.9)]">
              {reward.image ? (
                <Image src={reward.image} alt={reward.name} fill unoptimized sizes="(min-width: 768px) 300px, 80vw" className="object-cover" />
              ) : (
                <span className="grid animate-float place-items-center text-white motion-reduce:animate-none">
                  <Icon name={categoryIcon[reward.category]} size={52} strokeWidth={1.5} />
                </span>
              )}
              {isCelebrating && (
                <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[#0a1220]/70 backdrop-blur-sm">
                  {Array.from({ length: BURST_DOTS }, (_, dot) => {
                    const angle = (dot / BURST_DOTS) * 2 * Math.PI;
                    return (
                      <span
                        key={dot}
                        style={{ left: `${(50 + 36 * Math.cos(angle)).toFixed(2)}%`, top: `${(50 + 36 * Math.sin(angle)).toFixed(2)}%`, animationDelay: `${dot * 40}ms` }}
                        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 animate-dot-pop rounded-full bg-white motion-reduce:animate-none"
                      />
                    );
                  })}
                  <span className="grid size-16 animate-pop-in place-items-center rounded-full bg-success text-white motion-reduce:animate-none">
                    <Icon name="check" size={30} strokeWidth={2.5} />
                  </span>
                </span>
              )}
            </span>
            <span className={cx('absolute top-2 left-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.14em] uppercase', frostChipClass)}>
              <Icon name={categoryIcon[reward.category]} size={12} />
              {categoryTag(reward.category)}
            </span>
            <span className="absolute right-0 bottom-3 flex flex-col rounded-[18px] bg-[#0a1220] px-3.5 py-2 text-white">
              <span className="text-[9.5px] tracking-[0.14em] text-white/60 uppercase">{translate('tradeWin.value')}</span>
              <span className="font-mono text-lg font-black tabular-nums">{formatMoney(reward.value, currency)}</span>
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <header>
              <h3 className="text-2xl font-black tracking-[-0.02em]">{reward.name}</h3>
              <p className="mt-1 text-sm text-[#3b4658]">{reward.description}</p>
            </header>

            {/* Lot meter: dot-matrix fill of how much of the requirement the partner already holds. */}
            <div className={cx('flex flex-wrap items-center gap-4 rounded-[24px] p-4', frostChipClass)}>
              <div
                role="progressbar"
                aria-label={translate('tradeWin.requirementProgress')}
                aria-valuenow={requirementShare}
                aria-valuemin={0}
                aria-valuemax={100}
                className="flex flex-col gap-2"
              >
                <span aria-hidden="true" className="grid grid-cols-10 gap-1">
                  {Array.from({ length: LOT_METER_DOTS }, (_, dot) => (
                    <span key={dot} className={cx('size-2.5 rounded-full transition-colors duration-200', dot < litMeterDots ? 'bg-[#0a1220]' : 'bg-[#0a1220]/10')} />
                  ))}
                </span>
                <span className="font-mono text-sm font-black tabular-nums">{Math.round(meterShare)}%</span>
              </div>
              <div className="min-w-0">
                <p className={cx(captionClass, 'text-[#3b4658]')}>{translate('tradeWin.lotRequirement')}</p>
                <p className="mt-1 font-mono text-2xl font-black tabular-nums">
                  {reward.lotRequirement} <span className="font-sans text-sm font-semibold text-[#3b4658]">{translate('tradeWin.lots')}</span>
                </p>
                {reward.closedTradesOnly && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#0a1220] px-2.5 py-1 text-[11px] font-semibold text-white">
                    <Icon name="checkCircle" size={12} />
                    {translate('tradeWin.closedTradesOnly')}
                  </span>
                )}
              </div>
            </div>

            <dl className="flex flex-col gap-2.5">
              {facts.map((fact, index) => (
                <div key={fact.key} style={{ animationDelay: `${index * 70}ms` }} className="flex animate-feed-in items-end gap-2 motion-reduce:animate-none">
                  <dt className="flex shrink-0 items-center gap-1.5 text-xs text-[#3b4658]">
                    <Icon name={fact.icon} size={12} />
                    {fact.label}
                  </dt>
                  <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-[#0a1220]/20" />
                  <dd className={cx('max-w-[55%] truncate font-mono text-sm font-black tabular-nums', fact.highlight ? 'text-[#0f8a4f]' : 'text-[#0a1220]')}>{fact.value}</dd>
                </div>
              ))}
            </dl>

            {/* Inventory: filled beads still in stock, hollow beads already claimed. */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <span className={cx('inline-flex items-center gap-1.5', isLowStock ? 'text-[#c0362c]' : 'text-[#3b4658]')}>
                  <Icon name="inbox" size={13} />
                  {translate('tradeWin.stock')}
                  <span className="font-black">{translate('tradeWin.stockLeft', { count: stockLeft })}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#3b4658]">
                  <Icon name="history" size={13} />
                  {translate('tradeWin.claimed')}
                  <span className="font-black text-[#0a1220]">{translate('tradeWin.claimedTimes', { count: claimed })}</span>
                </span>
              </div>
              <span aria-hidden="true" className="flex flex-wrap gap-1.5">
                {Array.from({ length: stockBeadCount }, (_, bead) => (
                  <span
                    key={bead}
                    style={{ animationDelay: `${bead * 35}ms` }}
                    className={cx(
                      'size-3 animate-dot-pop rounded-full motion-reduce:animate-none',
                      bead < litStockBeads ? (isLowStock ? 'bg-[#c0362c]' : 'bg-[#0a1220]') : 'bg-white ring-2 ring-[#0a1220]/25',
                    )}
                  />
                ))}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dotted border-[#0a1220]/15 pt-4">
              <QuantityCapsule value={safeQuantity} max={Math.max(stockLeft, 1)} onChange={setQuantity} />
              <button
                type="button"
                disabled={!canRedeem && !isCelebrating}
                onClick={handleRedeem}
                className={cx(
                  'group/redeem relative inline-flex h-12 min-w-44 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-bold text-white transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none sm:flex-none',
                  isCelebrating ? 'bg-[#0f8a4f]' : 'bg-[#0a1220]',
                )}
              >
                <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/redeem:translate-x-full motion-reduce:hidden" />
                <Icon name={isCelebrating ? 'checkCircle' : 'gift'} size={16} className="relative" />
                <span className="relative">{buttonLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </FrostCard>
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
  const visible = rewards.filter((reward) => (status === 'all' || isReady(reward)) && (category === 'all' || reward.category === category));
  // Falls back to the first visible reward when the chosen one is filtered out (or nothing is chosen yet).
  const selected = visible.find((reward) => reward.id === selectedId) ?? visible[0];

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;
    const lastIndex = visible.length - 1;
    const currentIndex = visible.findIndex((reward) => reward.id === selected.id);
    let nextIndex: number;
    // The shelf scrolls sideways, but both arrow axes step through it in order.
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
    <section style={{ animationDelay: '180ms' }} className={cx(panelClass, 'animate-rise motion-reduce:animate-none lg:col-span-12')}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow icon="gift">{translate('tradeWin.storeEyebrow')}</Eyebrow>
          <h2 className="text-3xl font-black tracking-[-0.03em] text-fg">{translate('tradeWin.storeTitle')}</h2>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3.5 pl-1.5 text-xs font-semibold text-app">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-success" />
          </span>
          {translate('tradeWin.productsAvailable', { count: visible.length })}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            <RailButton isActive={category === 'all'} onClick={() => setCategory('all')} icon="gift">
              {translate('tradeWin.filterAll')}
            </RailButton>
            {CATEGORIES.map((item) => (
              <RailButton key={item} isActive={category === item} onClick={() => setCategory(item)} icon={categoryIcon[item]}>
                {categoryLabel(item)}
              </RailButton>
            ))}
          </div>
          <span aria-hidden="true" className="hidden border-t-2 border-dotted border-line-strong lg:block" />
          <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex gap-2">
            <StatusTile isActive={status === 'all'} onClick={() => setStatus('all')} count={rewards.length} icon="inbox">
              {translate('tradeWin.filterAll')}
            </StatusTile>
            <StatusTile isActive={status === 'ready'} onClick={() => setStatus('ready')} count={readyCount} icon="bolt">
              {translate('tradeWin.readyToRedeem')}
            </StatusTile>
          </div>
        </aside>

        {!selected ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] px-6 py-14 text-center ring-1 ring-line">
            <span aria-hidden="true" className="relative grid place-items-center">
              <span className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, dot) => (
                  <span key={dot} className="size-1.5 rounded-full bg-fg/12" />
                ))}
              </span>
              <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
                <Icon name="inbox" size={20} />
              </span>
            </span>
            <div>
              <p className="text-sm font-black text-fg">{translate('tradeWin.noProducts')}</p>
              <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.noProductsText')}</p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-5">
            <div
              role="tablist"
              aria-label={translate('tradeWin.productTabs')}
              onKeyDown={handleTabKeyDown}
              className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-2"
            >
              {visible.map((reward, index) => (
                <ShelfCard
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
              <SpecSheet
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
      </div>
    </section>
  );
}

/* ───────────── Leaderboard: dot-matrix podium + chaser rows ───────────── */

function PodiumColumn({ leader, topLots, order }: { leader: TradeWinLeader; topLots: number; order: number }) {
  const isChampion = leader.rank === 1;
  const litRows = topLots > 0 ? Math.max(1, Math.round((leader.closedLots / topLots) * PODIUM_ROWS)) : 1;

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-3">
      <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
      <span aria-hidden="true" className={cx('relative grid place-items-center', isChampion ? 'mt-7 size-16' : 'size-12')}>
        {isChampion && (
          <>
            <span className="absolute -top-8 animate-float text-fg motion-reduce:animate-none">
              <Icon name="trophy" size={22} />
            </span>
            <span className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-fg/25 motion-reduce:hidden" />
          </>
        )}
        <span className={cx('absolute inset-0 rounded-full border-2 border-dashed', isChampion ? 'animate-rim-spin border-fg/35 motion-reduce:animate-none' : 'border-fg/15')} />
        <span className={cx('grid place-items-center rounded-full font-black', isChampion ? 'size-12 bg-fg text-lg text-app' : 'nova-gloss size-9 text-sm text-fg')}>
          {leader.name.charAt(0)}
        </span>
      </span>

      {/* Column of dots rising to the trader's share of the top total; it re-plays on every refresh. */}
      <span aria-hidden="true" className="grid grid-cols-3 gap-1">
        {Array.from({ length: PODIUM_ROWS * 3 }, (_, cell) => {
          const rowFromBottom = PODIUM_ROWS - 1 - Math.floor(cell / 3);
          const isLit = rowFromBottom < litRows;
          return (
            <span
              key={cell}
              style={isLit ? { animationDelay: `${order * 150 + rowFromBottom * 55}ms` } : undefined}
              className={cx('size-2 rounded-full', isLit ? cx('animate-dot-pop motion-reduce:animate-none', isChampion ? 'bg-fg' : 'bg-fg/50') : 'scale-75 bg-fg/8')}
            />
          );
        })}
      </span>

      <span className={cx('grid size-7 place-items-center rounded-full font-mono text-[11px] font-black', isChampion ? 'bg-fg text-app' : 'ring-1 ring-line-strong text-fg')}>
        {leader.rank}
      </span>
      <span className="w-full min-w-0 text-center">
        <span className="block truncate text-xs font-semibold text-fg">{leader.name}</span>
        <span className="mt-0.5 flex items-baseline justify-center gap-1">
          <span className={cx('font-mono font-black text-fg tabular-nums', isChampion ? 'text-2xl' : 'text-base')}>{leader.closedLots}</span>
          <span className="text-[10px] text-fg-subtle">{translate('tradeWin.lots')}</span>
        </span>
      </span>
    </li>
  );
}

function ChaserRow({ leader, share, order }: { leader: TradeWinLeader; share: number; order: number }) {
  const litDots = Math.max(1, Math.round((share / 100) * CHASER_DOTS));
  return (
    <li style={{ animationDelay: `${order * 70}ms` }} className="group/row flex animate-feed-in items-center gap-3 rounded-full py-1.5 pr-3 pl-1.5 transition-colors duration-300 hover:bg-fg/[0.04] motion-reduce:animate-none">
      <span className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px] font-black text-fg ring-1 ring-line-strong">{leader.rank}</span>
      <span aria-hidden="true" className="nova-gloss grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-fg">
        {leader.name.charAt(0)}
      </span>
      <span className="w-24 min-w-0 shrink truncate text-xs text-fg-muted transition-colors group-hover/row:text-fg sm:w-32">{leader.name}</span>
      <span aria-hidden="true" className="flex flex-1 items-center justify-between gap-0.5">
        {Array.from({ length: CHASER_DOTS }, (_, dot) => (
          <span key={dot} className={cx('size-1.5 rounded-full', dot < litDots ? 'bg-fg/70' : 'bg-fg/10')} />
        ))}
      </span>
      <span className="shrink-0 font-mono text-xs font-black text-fg tabular-nums">
        {leader.closedLots} <span className="font-sans font-normal text-fg-subtle">{translate('tradeWin.lots')}</span>
      </span>
    </li>
  );
}

function PodiumBoard({ leaders }: { leaders: TradeWinLeader[] }) {
  const [round, setRound] = useState(0);
  const refreshIconRef = useRef<HTMLSpanElement>(null);
  const podium = leaders.filter((leader) => leader.rank <= PODIUM_SIZE);
  // Classic podium order: runner-up left, champion centre, third right.
  const podiumOrder = [2, 1, 3].map((rank) => podium.find((leader) => leader.rank === rank)).filter((leader): leader is TradeWinLeader => Boolean(leader));
  const topLots = Math.max(0, ...podium.map((leader) => leader.closedLots));
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);
  // Chaser dots run against the lead chaser, so the gaps between them stay visible next to the champion's total.
  const leadChaserLots = Math.max(0, ...chasers.map((leader) => leader.closedLots));

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section style={{ animationDelay: '240ms' }} className={cx(panelClass, 'animate-rise motion-reduce:animate-none lg:col-span-7 lg:self-start')}>
      <header className="flex items-center gap-3">
        <Eyebrow icon="trophy">{translate('tradeWin.leaderboardTitle')}</Eyebrow>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg py-0.5 pr-2.5 pl-1.5 font-mono text-[10px] font-black tracking-[0.14em] text-app uppercase">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-danger motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-danger" />
          </span>
          {translate('tradeWin.live')}
        </span>
        <button
          type="button"
          onClick={refresh}
          aria-label={translate('tradeWin.refresh')}
          className="ml-auto grid size-10 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span ref={refreshIconRef} className="flex">
            <Icon name="refresh" size={15} />
          </span>
        </button>
      </header>

      <div key={round} className="mt-6 flex flex-col gap-6">
        <ol className="flex items-end justify-center gap-4 rounded-[26px] bg-fg/[0.03] px-3 pt-5 pb-4 ring-1 ring-line sm:gap-8">
          {podiumOrder.map((leader, index) => (
            <PodiumColumn key={leader.rank} leader={leader} topLots={topLots} order={index} />
          ))}
        </ol>

        {chasers.length > 0 && (
          <div>
            <div className="flex items-center gap-3 border-b-2 border-dotted border-line-strong px-2 pb-2">
              <span className={cx(captionClass, 'w-8 text-fg-subtle')}>{translate('tradeWin.rank')}</span>
              <span className={cx(captionClass, 'flex-1 text-fg-subtle')}>{translate('tradeWin.trader')}</span>
              <span className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.closedLots')}</span>
            </div>
            <ol start={PODIUM_SIZE + 1} className="mt-2 flex flex-col gap-1">
              {chasers.map((leader, index) => (
                <ChaserRow key={leader.rank} leader={leader} share={leadChaserLots > 0 ? (leader.closedLots / leadChaserLots) * 100 : 0} order={index} />
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────── Past wins: claim tickets ───────────── */

function ClaimTicket({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';

  return (
    <li style={{ animationDelay: `${index * 80}ms` }} className="group flex animate-feed-in gap-3 rounded-[24px] p-3 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-line-strong motion-reduce:animate-none">
      <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-fg/20 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
        <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
          <Icon name={icon} size={16} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-fg">
              {entry.rewardName} {entry.quantity > 1 && <span className="font-semibold text-fg-subtle">× {entry.quantity}</span>}
            </p>
            <p className="truncate text-xs text-fg-muted">{entry.category ? categoryTag(entry.category) : formatDate(entry.redeemedAt)}</p>
          </div>
          {entry.reference ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-fg py-0.5 pr-2.5 pl-1.5 text-[9.5px] font-black tracking-[0.16em] text-app">
              <span aria-hidden="true" className="size-2 animate-blink rounded-full bg-warning motion-reduce:animate-none" />
              {pastWinText.submitted}
            </span>
          ) : (
            <span className="shrink-0 font-mono text-sm font-black text-success tabular-nums">{formatMoney(entry.value, currency)}</span>
          )}
        </div>

        {entry.reference && (
          <>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-fg-muted">
              <span aria-hidden="true" className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} style={{ animationDelay: `${dot * 0.25}s` }} className="size-1.5 animate-blink rounded-full bg-fg/60 motion-reduce:animate-none" />
                ))}
              </span>
              {pastWinText.processing}
            </p>
            <dl className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t-2 border-dotted border-line-strong pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">{pastWinText.reference}:</dt>
                <dd className="font-mono font-black tracking-wider text-fg">{entry.reference}</dd>
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

function ClaimTickets({ entries, currency }: { entries: PastWin[]; currency: string }) {
  return (
    <section style={{ animationDelay: '300ms' }} className={cx(panelClass, 'animate-rise motion-reduce:animate-none lg:col-span-5 lg:self-start')}>
      <header className="flex items-center gap-3">
        <Eyebrow icon="checkCircle">{translate('tradeWin.pastWinsTitle')}</Eyebrow>
        {entries.length > 0 && (
          <span key={entries.length} className="ml-auto grid size-8 animate-dot-pop place-items-center rounded-full bg-fg font-mono text-xs font-black text-app motion-reduce:animate-none">
            {entries.length}
          </span>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-4 rounded-[26px] px-6 py-10 text-center ring-1 ring-line">
          <span aria-hidden="true" className="relative grid place-items-center">
            <span className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, dot) => (
                <span key={dot} style={{ animationDelay: `${(dot % 7) * 0.15}s` }} className="size-1.5 animate-blink rounded-full bg-fg/15 motion-reduce:animate-none" />
              ))}
            </span>
            <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
              <Icon name="trophy" size={20} />
            </span>
          </span>
          <div>
            <p className="text-sm font-black text-fg">{translate('tradeWin.noRedemptions')}</p>
            <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.keepTrading')}</p>
          </div>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {entries.map((entry, index) => (
            <ClaimTicket key={entry.id} entry={entry} currency={currency} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** IB Trade & Win: lot wallet + wins on top, the full-width store, then the podium beside the claim tickets. */
export function IbTradeWinScreen({ data, isLoading }: { data: TradeWinOverview | undefined; isLoading: boolean }) {
  const [redemptions, setRedemptions] = useState<PastWin[]>([]);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-64 rounded-[28px] lg:col-span-7" />
        <Skeleton className="h-64 rounded-[30px] lg:col-span-5" />
        <Skeleton className="h-[40rem] rounded-[28px] lg:col-span-12" />
        <Skeleton className="h-[26rem] rounded-[28px] lg:col-span-7" />
        <Skeleton className="h-[26rem] rounded-[28px] lg:col-span-5" />
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <LotWallet availableLots={availableLots} tradedLots={data.tradedLots} spentLots={data.spentLots + sessionLotsSpent} />
      <WinsCard pastWins={pastWins.length} valueWon={valueWon} currency={currency} />
      <RewardStore
        rewards={data.rewards}
        currency={currency}
        availableLots={availableLots}
        availableDeposit={data.availableDeposit}
        stockLeftOf={(reward) => Math.max(0, reward.stock - redeemedQuantity(reward))}
        claimedOf={(reward) => reward.claimed + redeemedQuantity(reward)}
        onRedeem={handleRedeem}
      />
      <PodiumBoard leaders={data.leaders} />
      <ClaimTickets entries={pastWins} currency={currency} />
    </div>
  );
}
