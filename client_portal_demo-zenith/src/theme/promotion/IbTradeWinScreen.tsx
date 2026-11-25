'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RewardCategory, TradeWinLeader, TradeWinOverview, TradeWinReward } from '@/core/pages/useTradeWin';
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
const STAGE_PIXELS = 64;

/*
 * Zenith IB Trade & Win (Vaulto language): an open lot header with a capsule tick track beside two ink win
 * capsules, the store with a capsule filter bar, square pixel-window shelf and an open dashed spec sheet, then
 * claim tickets beside a capsule-column podium. Red (--zenith-red) marks the live / head / selected spots only.
 */
const RED = 'var(--zenith-red)';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6';
const openClass = 'relative rounded-[30px] border border-dashed border-line-strong p-5 sm:p-6';
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0b0b0c] text-white ring-1 ring-white/10';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const pixelBackdrop =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--color-fg)_10%,transparent)_1.2px,transparent_1.4px)] bg-[size:12px_12px]';

const pastWinText = {
  submitted: 'SUBMITTED',
  reference: 'Reference',
  processing: 'We are currently processing your reward',
  submittedOn: 'Submitted',
};

function Eyebrow({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className={cx('flex items-center gap-2 text-fg-subtle', captionClass)}>
      <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-fg text-app">
        <Icon name={icon} size={13} />
        <span aria-hidden="true" style={{ background: RED }} className="absolute -top-0.5 -right-0.5 size-2 rounded-[2px]" />
      </span>
      {children}
    </p>
  );
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

function PixelEmpty({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-line-strong px-6 py-12 text-center">
      <span aria-hidden="true" className="relative grid place-items-center">
        <span className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, cell) => (
            <span key={cell} style={{ animationDelay: `${((cell * 3) % 35) * 70}ms` }} className="zenith-twinkle size-2.5 rounded-[3px] bg-fg/15" />
          ))}
        </span>
        <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app ring-4 ring-app">
          <Icon name={icon} size={20} />
        </span>
      </span>
      <div>
        <p className="text-sm font-black text-fg">{title}</p>
        <p className="mt-1 text-xs text-fg-muted">{text}</p>
      </div>
    </div>
  );
}

/* ───────────── Lot header (open): spendable lots + downline volume as a capsule tick track ───────────── */

function LotWallet({ availableLots, tradedLots, spentLots }: { availableLots: number; tradedLots: number; spentLots: number }) {
  const lots = useAnimatedNumber(availableLots, 1200);
  const volume = Math.max(tradedLots, availableLots + spentLots);
  const hasVolume = volume > 0;
  const availableBeads = hasVolume ? Math.round((availableLots / volume) * WALLET_BEADS) : 0;
  const spentBeads = hasVolume ? Math.min(WALLET_BEADS - availableBeads, Math.round((spentLots / volume) * WALLET_BEADS)) : 0;

  return (
    <section className="zenith-tile flex min-w-0 flex-col gap-6 lg:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Eyebrow icon="pieChart">{translate('tradeWin.availableIbLots')}</Eyebrow>
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
          </span>
          <span className="grid size-9 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
            <Icon name="gift" size={15} />
          </span>
        </span>
      </div>

      <p className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-7xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums sm:text-8xl">{formatLots(lots)}</span>
        <span style={{ color: RED }} className="text-sm font-black tracking-[0.16em] uppercase">
          {translate('tradeWin.lots')}
        </span>
      </p>

      {/* Tick track: tall ticks are still spendable, mid ticks were already spent on rewards; the red head blinks. */}
      <span aria-hidden="true" className="flex h-16 items-end gap-[3px] rounded-full bg-fg/[0.03] px-4 py-2.5 ring-1 ring-line">
        {Array.from({ length: WALLET_BEADS }, (_, bead) => {
          const isAvailable = bead < availableBeads;
          const isHead = isAvailable && bead === availableBeads - 1;
          const isSpent = !isAvailable && bead < availableBeads + spentBeads;
          return (
            <span
              key={bead}
              style={{ animationDelay: `${bead * 30}ms`, ...(isHead ? { background: RED } : {}) }}
              className={cx(
                'min-w-0 flex-1 rounded-full',
                isHead && 'zenith-blink h-full',
                isAvailable && !isHead && 'zenith-bar h-full bg-fg',
                isSpent && 'zenith-bar h-3/5 bg-fg/35',
                !isAvailable && !isSpent && 'zenith-bar h-1/4 bg-fg/10',
              )}
            />
          );
        })}
      </span>

      <p className="inline-flex items-center gap-2 self-start rounded-full bg-fg/[0.04] px-4 py-2 text-sm text-fg-muted ring-1 ring-line">
        <span aria-hidden="true" style={{ background: RED }} className="size-2 shrink-0 rounded-[2px]" />
        {translate('tradeWin.downlineSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
      </p>
      <RedRule />
    </section>
  );
}

/* ───────────── Wins: two ink capsules (wins + value won) ───────────── */

function WinsCard({ pastWins, valueWon, currency }: { pastWins: number; valueWon: number; currency: string }) {
  const wins = useAnimatedNumber(pastWins, 900);
  const won = useAnimatedNumber(valueWon, 1200);
  const stats: { key: string; icon: IconName; label: string; hint: string; value: string }[] = [
    { key: 'wins', icon: 'checkCircle', label: translate('tradeWin.pastWins'), hint: translate('tradeWin.totalRedemptions'), value: String(Math.round(wins)) },
    { key: 'won', icon: 'wallet', label: translate('tradeWin.valueWon'), hint: translate('tradeWin.totalPrizeValue'), value: formatMoney(won, currency) },
  ];

  return (
    <section style={{ animationDelay: '100ms' }} className="flex min-w-0 animate-rise motion-reduce:animate-none lg:col-span-4">
      <dl className="flex flex-1 flex-col gap-3">
        {stats.map((stat, index) => {
          const isLead = index === 0;
          return (
            <div
              key={stat.key}
              style={{ animationDelay: `${200 + index * 120}ms` }}
              className={cx(inkClass, 'group/stat flex flex-1 animate-feed-in items-center gap-4 p-5 motion-reduce:animate-none')}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(rgb(255_255_255/0.1)_1px,transparent_1.2px)] bg-[size:8px_8px] [mask-image:linear-gradient(90deg,transparent,#000)]" />
              <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
                {isLead && <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                <span
                  style={isLead ? { background: RED } : undefined}
                  className={cx(
                    'grid size-11 place-items-center rounded-full transition-transform duration-300 group-hover/stat:scale-110 motion-reduce:transition-none',
                    isLead ? 'text-white' : 'bg-white text-[#0b0b0c]',
                  )}
                >
                  <Icon name={stat.icon} size={17} />
                </span>
              </span>
              <div className="relative min-w-0 flex-1">
                <dt className={cx(captionClass, 'truncate text-white/55')}>{stat.label}</dt>
                <dd className="mt-1 truncate font-mono text-3xl font-black tracking-tight tabular-nums">{stat.value}</dd>
                <dd className="truncate text-[11px] text-white/45">{stat.hint}</dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/* ───────────── Store: capsule filter bar ───────────── */

function RailButton({ isActive, onClick, icon, children }: { isActive: boolean; onClick: () => void; icon: IconName; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cx(
        'group/rail flex h-11 shrink-0 items-center gap-2.5 rounded-full py-1 pr-4 pl-1 text-xs font-semibold transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      <span
        style={isActive ? { background: RED } : undefined}
        className={cx(
          'grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/rail:rotate-12 motion-reduce:transition-none',
          isActive ? 'text-white' : 'bg-fg/10 text-fg',
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
        'flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-4 text-left transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      <Icon name={icon} size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{children}</span>
      <span
        key={count}
        style={isActive ? { background: RED } : undefined}
        className={cx(
          'grid h-8 min-w-8 animate-dot-pop place-items-center rounded-full px-2 font-mono text-sm font-black tabular-nums motion-reduce:animate-none',
          isActive ? 'text-white' : 'bg-fg/10 text-fg',
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ───────────── Store: square pixel-window shelf tile ───────────── */

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
        'zenith-tile group relative flex w-52 shrink-0 snap-start flex-col gap-3 rounded-[28px] p-2.5 pb-4 text-left transition-[translate,background-color,box-shadow] duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isSelected ? 'bg-fg text-app' : 'bg-fg/[0.02] text-fg ring-1 ring-line hover:ring-line-strong',
      )}
    >
      {/* Window: the product in a square frame over a pixel grid; it zooms in on hover. */}
      <span className={cx('relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[22px]', isSelected ? 'bg-app/10' : 'bg-fg/[0.05]')}>
        <span aria-hidden="true" className={cx(pixelBackdrop, isSelected && 'opacity-60')} />
        {reward.image ? (
          <Image
            src={reward.image}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            sizes="208px"
            className="object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none"
          />
        ) : (
          <Icon name={categoryIcon[reward.category]} size={32} className={cx('relative transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none', isSelected ? 'text-app' : 'text-fg')} />
        )}
        <span className={cx('absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.14em] uppercase', isSelected ? 'bg-app text-fg' : 'bg-fg text-app')}>
          {categoryTag(reward.category)}
        </span>
        <span
          aria-hidden="true"
          style={{ background: RED }}
          className={cx(
            'absolute top-2 right-2 grid size-6 place-items-center rounded-full text-white transition-[opacity,scale] duration-300 motion-reduce:transition-none',
            isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        >
          <Icon name="check" size={12} strokeWidth={2.5} />
        </span>
      </span>

      <span className="w-full min-w-0 px-1.5">
        <span className="block truncate text-sm font-black">{reward.name}</span>
        <span className={cx('mt-0.5 block font-mono text-lg font-black tracking-tight tabular-nums', isSelected ? 'text-app' : 'text-fg')}>{formatMoney(reward.value, currency)}</span>
      </span>

      <span className="flex w-full items-center justify-between gap-2 px-1.5 text-[10.5px]">
        <span className={cx('inline-flex min-w-0 items-center gap-1 truncate rounded-full px-2 py-0.5', isSelected ? 'bg-app/10 text-app/75' : 'bg-fg/[0.06] text-fg-subtle')}>
          <Icon name="pieChart" size={11} className="shrink-0" />
          {translate('tradeWin.lotsValue', { lots: reward.lotRequirement })}
        </span>
        <span className={cx('inline-flex shrink-0 items-center gap-1 font-semibold', isReady ? 'text-success' : isSelected ? 'text-app/60' : 'text-fg-subtle')}>
          <span aria-hidden="true" className={cx('size-1.5 rounded-[2px]', isReady ? 'zenith-blink bg-success' : 'bg-current opacity-40')} />
          {translate('tradeWin.stockLeft', { count: stockLeft })}
        </span>
      </span>
    </button>
  );
}

/* ───────────── Store: open spec sheet for the chosen reward ───────────── */

function QuantityCapsule({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'grid size-9 place-items-center rounded-full bg-fg text-app transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-25';

  return (
    <div className="flex items-center gap-3">
      <span className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.quantity')}</span>
      <div className="flex items-center gap-1 rounded-full bg-fg/[0.04] p-1 ring-1 ring-line">
        <button type="button" aria-label={translate('tradeWin.decrease')} disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepClass}>
          <span aria-hidden="true" className="text-base leading-none">−</span>
        </button>
        <span key={value} aria-live="polite" className="w-9 animate-dot-pop text-center font-mono text-base font-black text-fg tabular-nums motion-reduce:animate-none">
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
      <div className={cx(openClass, 'zenith-reveal grid grid-cols-1 gap-7 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center')}>
        {/* Stage: the product in an ink window over a twinkling pixel field; a pixel burst plays on redeem. */}
        <div className="relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center">
          <span aria-hidden="true" className="absolute inset-0 grid grid-cols-8 gap-1.5">
            {Array.from({ length: STAGE_PIXELS }, (_, cell) => (
              <span key={cell} style={{ animationDelay: `${((cell * 5) % STAGE_PIXELS) * 45}ms` }} className="zenith-twinkle rounded-[3px] bg-fg/10" />
            ))}
          </span>
          <span className="relative grid size-[74%] place-items-center overflow-hidden rounded-[30px] bg-[#0b0b0c] ring-4 ring-app">
            {reward.image ? (
              <Image src={reward.image} alt={reward.name} fill unoptimized sizes="(min-width: 768px) 240px, 70vw" className="object-cover" />
            ) : (
              <span className="grid animate-float place-items-center text-white motion-reduce:animate-none">
                <Icon name={categoryIcon[reward.category]} size={52} strokeWidth={1.5} />
              </span>
            )}
            {isCelebrating && (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[#0b0b0c]/75 backdrop-blur-sm">
                {Array.from({ length: BURST_DOTS }, (_, dot) => {
                  const angle = (dot / BURST_DOTS) * 2 * Math.PI;
                  return (
                    <span
                      key={dot}
                      style={{
                        left: `${(50 + 36 * Math.cos(angle)).toFixed(2)}%`,
                        top: `${(50 + 36 * Math.sin(angle)).toFixed(2)}%`,
                        animationDelay: `${dot * 40}ms`,
                        ...(dot % 3 === 0 ? { background: RED } : {}),
                      }}
                      className={cx('absolute size-2.5 -translate-x-1/2 -translate-y-1/2 animate-dot-pop rounded-[3px] motion-reduce:animate-none', dot % 3 !== 0 && 'bg-white')}
                    />
                  );
                })}
                <span className="grid size-16 animate-pop-in place-items-center rounded-full bg-success text-white motion-reduce:animate-none">
                  <Icon name="check" size={30} strokeWidth={2.5} />
                </span>
              </span>
            )}
          </span>
          <span className="absolute top-2 left-0 inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-1 text-[10px] font-black tracking-[0.14em] text-app uppercase">
            <Icon name={categoryIcon[reward.category]} size={12} />
            {categoryTag(reward.category)}
          </span>
          <span style={{ background: RED }} className="absolute right-0 bottom-3 flex flex-col rounded-[18px] px-3.5 py-2 text-white">
            <span className="text-[9.5px] tracking-[0.14em] text-white/75 uppercase">{translate('tradeWin.value')}</span>
            <span className="font-mono text-lg font-black tabular-nums">{formatMoney(reward.value, currency)}</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <header>
            <h3 className="text-3xl font-black tracking-[-0.03em] text-fg">{reward.name}</h3>
            <p className="mt-1 border-l-2 border-[var(--zenith-red)] pl-3 text-sm text-fg-muted">{reward.description}</p>
          </header>

          {/* Lot meter: capsule tick track of how much of the requirement the partner already holds. */}
          <div className="flex flex-col gap-3 rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.lotRequirement')}</p>
                <p className="mt-1 font-mono text-2xl font-black text-fg tabular-nums">
                  {reward.lotRequirement} <span className="font-sans text-sm font-semibold text-fg-muted">{translate('tradeWin.lots')}</span>
                </p>
              </div>
              {reward.closedTradesOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold text-app">
                  <Icon name="checkCircle" size={12} />
                  {translate('tradeWin.closedTradesOnly')}
                </span>
              )}
            </div>
            <div
              role="progressbar"
              aria-label={translate('tradeWin.requirementProgress')}
              aria-valuenow={requirementShare}
              aria-valuemin={0}
              aria-valuemax={100}
              className="flex items-center gap-3"
            >
              <span aria-hidden="true" className="flex h-8 flex-1 items-end gap-[3px] rounded-full bg-fg/[0.04] px-2.5 py-1.5">
                {Array.from({ length: LOT_METER_DOTS }, (_, dot) => {
                  const isLit = dot < litMeterDots;
                  const isHead = isLit && dot === litMeterDots - 1;
                  return (
                    <span
                      key={dot}
                      style={isHead ? { background: RED } : undefined}
                      className={cx('min-w-0 flex-1 rounded-full transition-[height,background-color] duration-200', isHead ? 'h-full' : isLit ? 'h-full bg-fg' : 'h-2/5 bg-fg/12')}
                    />
                  );
                })}
              </span>
              <span className="w-12 text-right font-mono text-sm font-black text-fg tabular-nums">{Math.round(meterShare)}%</span>
            </div>
          </div>

          <dl className="flex flex-col gap-2.5">
            {facts.map((fact, index) => (
              <div key={fact.key} style={{ animationDelay: `${index * 70}ms` }} className="flex animate-feed-in items-center gap-2 motion-reduce:animate-none">
                <dt className="flex shrink-0 items-center gap-1.5 text-xs text-fg-muted">
                  <Icon name={fact.icon} size={12} />
                  {fact.label}
                </dt>
                <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-line" />
                <dd className={cx('max-w-[55%] truncate font-mono text-sm font-black tabular-nums', fact.highlight ? 'text-success' : 'text-fg')}>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {/* Inventory: solid pixels are still in stock (red when low), dashed pixels were already claimed. */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <span className={cx('inline-flex items-center gap-1.5', isLowStock ? 'text-danger' : 'text-fg-muted')}>
                <Icon name="inbox" size={13} />
                {translate('tradeWin.stock')}
                <span className="font-black">{translate('tradeWin.stockLeft', { count: stockLeft })}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-fg-muted">
                <Icon name="history" size={13} />
                {translate('tradeWin.claimed')}
                <span className="font-black text-fg">{translate('tradeWin.claimedTimes', { count: claimed })}</span>
              </span>
            </div>
            <span aria-hidden="true" className="flex flex-wrap gap-1.5">
              {Array.from({ length: stockBeadCount }, (_, bead) => {
                const isInStock = bead < litStockBeads;
                return (
                  <span
                    key={bead}
                    style={{ animationDelay: `${bead * 35}ms`, ...(isInStock && isLowStock ? { background: RED } : {}) }}
                    className={cx('zenith-pixel size-3.5 rounded-[3px]', isInStock ? (isLowStock ? 'zenith-blink' : 'bg-fg') : 'border-2 border-dashed border-fg/30')}
                  />
                );
              })}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <QuantityCapsule value={safeQuantity} max={Math.max(stockLeft, 1)} onChange={setQuantity} />
            <button
              type="button"
              disabled={!canRedeem && !isCelebrating}
              onClick={handleRedeem}
              className={cx(
                'group/redeem relative inline-flex h-12 min-w-48 flex-1 items-center justify-between gap-3 overflow-hidden rounded-full py-1 pr-1 pl-5 text-sm font-bold transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none sm:flex-none',
                isCelebrating ? 'bg-success text-white' : 'bg-fg text-app',
              )}
            >
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/redeem:translate-x-full motion-reduce:hidden" />
              <span className="relative">{buttonLabel}</span>
              <span style={isCelebrating ? undefined : { background: RED }} className={cx('relative grid size-10 place-items-center rounded-full text-white', isCelebrating && 'bg-white/20')}>
                <Icon name={isCelebrating ? 'checkCircle' : 'gift'} size={16} />
              </span>
            </button>
          </div>
        </div>
      </div>
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
    <section style={{ animationDelay: '180ms' }} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-6 motion-reduce:animate-none lg:col-span-12')}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Eyebrow icon="gift">{translate('tradeWin.storeEyebrow')}</Eyebrow>
          <h2 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{translate('tradeWin.storeTitle')}</h2>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3.5 pl-1.5 text-xs font-semibold text-app">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
            <span style={{ background: RED }} className="relative size-2.5 rounded-full" />
          </span>
          {translate('tradeWin.productsAvailable', { count: visible.length })}
        </p>
      </header>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1">
          <RailButton isActive={category === 'all'} onClick={() => setCategory('all')} icon="gift">
            {translate('tradeWin.filterAll')}
          </RailButton>
          {CATEGORIES.map((item) => (
            <RailButton key={item} isActive={category === item} onClick={() => setCategory(item)} icon={categoryIcon[item]}>
              {categoryLabel(item)}
            </RailButton>
          ))}
        </div>
        <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex gap-2 xl:w-[24rem] xl:shrink-0">
          <StatusTile isActive={status === 'all'} onClick={() => setStatus('all')} count={rewards.length} icon="inbox">
            {translate('tradeWin.filterAll')}
          </StatusTile>
          <StatusTile isActive={status === 'ready'} onClick={() => setStatus('ready')} count={readyCount} icon="bolt">
            {translate('tradeWin.readyToRedeem')}
          </StatusTile>
        </div>
      </div>
      <RedRule />

      {!selected ? (
        <PixelEmpty icon="inbox" title={translate('tradeWin.noProducts')} text={translate('tradeWin.noProductsText')} />
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          <div role="tablist" aria-label={translate('tradeWin.productTabs')} onKeyDown={handleTabKeyDown} className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-2">
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
    </section>
  );
}

/* ───────────── Leaderboard: capsule-column podium + tick-track chaser rows ───────────── */

function PodiumColumn({ leader, topLots, order }: { leader: TradeWinLeader; topLots: number; order: number }) {
  const isChampion = leader.rank === 1;
  const litRows = topLots > 0 ? Math.max(1, Math.round((leader.closedLots / topLots) * PODIUM_ROWS)) : 1;

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-3">
      <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
      <span aria-hidden="true" className={cx('relative grid place-items-center', isChampion ? 'mt-7 size-16' : 'size-12')}>
        {isChampion && (
          <>
            <span style={{ color: RED }} className="absolute -top-8 animate-float motion-reduce:animate-none">
              <Icon name="trophy" size={22} />
            </span>
            <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
          </>
        )}
        <span className={cx('absolute inset-0 rounded-full border-2 border-dashed', isChampion ? 'animate-rim-spin border-fg/35 motion-reduce:animate-none' : 'border-fg/15')} />
        <span className={cx('grid place-items-center rounded-full font-black', isChampion ? 'size-12 bg-fg text-lg text-app' : 'size-9 bg-fg/10 text-sm text-fg')}>
          {leader.name.charAt(0)}
        </span>
      </span>

      {/* Capsule column: ticks rise to the trader's share of the top total; it re-plays on every refresh. */}
      <span aria-hidden="true" className={cx('flex flex-col-reverse gap-[3px] rounded-full bg-fg/[0.03] p-1.5 ring-1 ring-line', isChampion ? 'w-12' : 'w-10')}>
        {Array.from({ length: PODIUM_ROWS }, (_, rowFromBottom) => {
          const isLit = rowFromBottom < litRows;
          const isHead = isChampion && rowFromBottom === litRows - 1;
          return (
            <span
              key={rowFromBottom}
              style={isLit ? { animationDelay: `${order * 150 + rowFromBottom * 55}ms`, ...(isHead ? { background: RED } : {}) } : undefined}
              className={cx(
                'h-2.5 w-full rounded-full',
                isLit ? cx('animate-dot-pop motion-reduce:animate-none', !isHead && (isChampion ? 'bg-fg' : 'bg-fg/50')) : 'bg-fg/8',
              )}
            />
          );
        })}
      </span>

      <span
        style={isChampion ? { background: RED } : undefined}
        className={cx('grid size-7 place-items-center rounded-full font-mono text-[11px] font-black', isChampion ? 'text-white' : 'text-fg ring-1 ring-line-strong')}
      >
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
    <li
      style={{ animationDelay: `${order * 70}ms` }}
      className="group/row flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.02] py-1.5 pr-4 pl-1.5 ring-1 ring-line transition-colors duration-300 hover:ring-line-strong motion-reduce:animate-none"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg font-mono text-[11px] font-black text-app">{leader.rank}</span>
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-fg/10 text-[11px] font-black text-fg">
        {leader.name.charAt(0)}
      </span>
      <span className="w-24 min-w-0 shrink truncate text-xs text-fg-muted transition-colors group-hover/row:text-fg sm:w-32">{leader.name}</span>
      <span aria-hidden="true" className="flex h-4 flex-1 items-end gap-[3px]">
        {Array.from({ length: CHASER_DOTS }, (_, dot) => (
          <span key={dot} style={{ animationDelay: `${dot * 30}ms` }} className={cx('zenith-bar min-w-0 flex-1 rounded-full', dot < litDots ? 'h-full bg-fg/70' : 'h-1/3 bg-fg/10')} />
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
  // Chaser ticks run against the lead chaser, so the gaps between them stay visible next to the champion's total.
  const leadChaserLots = Math.max(0, ...chasers.map((leader) => leader.closedLots));

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section style={{ animationDelay: '300ms' }} className={cx(panelClass, 'min-w-0 animate-rise motion-reduce:animate-none lg:col-span-7 lg:self-start')}>
      <header className="flex items-center gap-3">
        <Eyebrow icon="trophy">{translate('tradeWin.leaderboardTitle')}</Eyebrow>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg py-0.5 pr-2.5 pl-1.5 font-mono text-[10px] font-black tracking-[0.14em] text-app uppercase">
          <span aria-hidden="true" className="relative flex size-2">
            <span style={{ background: RED }} className="absolute inset-0 animate-ping rounded-full motion-reduce:hidden" />
            <span style={{ background: RED }} className="relative size-2 rounded-full" />
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
        <div className="relative overflow-hidden rounded-[28px] border border-dashed border-line-strong">
          <span aria-hidden="true" className={cx(pixelBackdrop, '[mask-image:linear-gradient(180deg,#000,transparent_85%)]')} />
          <ol className="relative flex items-end justify-center gap-6 px-3 pt-5 pb-4 sm:gap-12">
            {podiumOrder.map((leader, index) => (
              <PodiumColumn key={leader.rank} leader={leader} topLots={topLots} order={index} />
            ))}
          </ol>
        </div>

        {chasers.length > 0 && (
          <div>
            <div className="flex items-center gap-3 px-2 pb-2">
              <span className={cx(captionClass, 'w-8 text-fg-subtle')}>{translate('tradeWin.rank')}</span>
              <span className={cx(captionClass, 'flex-1 text-fg-subtle')}>{translate('tradeWin.trader')}</span>
              <span className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.closedLots')}</span>
            </div>
            <RedRule />
            <ol start={PODIUM_SIZE + 1} className="mt-3 flex flex-col gap-2">
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

/* ───────────── Past wins: stub tickets ───────────── */

function ClaimTicket({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';

  return (
    <li
      style={{ animationDelay: `${index * 80}ms` }}
      className="group flex animate-feed-in overflow-hidden rounded-[26px] bg-fg/[0.02] ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-line-strong motion-reduce:animate-none"
    >
      {/* Stub: ink strip with the category bead; a dashed perforation separates it from the ticket body. */}
      <span aria-hidden="true" className="relative grid w-16 shrink-0 place-items-center bg-fg text-app">
        <span className="grid size-10 place-items-center rounded-full bg-app/10 transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
          <Icon name={icon} size={16} />
        </span>
        <span style={{ background: RED }} className="absolute top-3 left-3 size-1.5 rounded-[2px]" />
      </span>
      <span aria-hidden="true" className="w-0 shrink-0 border-l-2 border-dashed border-line-strong" />

      <div className="min-w-0 flex-1 p-3.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-fg">
              {entry.rewardName} {entry.quantity > 1 && <span className="font-semibold text-fg-subtle">× {entry.quantity}</span>}
            </p>
            <p className="truncate text-xs text-fg-muted">{entry.category ? categoryTag(entry.category) : formatDate(entry.redeemedAt)}</p>
          </div>
          {entry.reference ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-fg py-0.5 pr-2.5 pl-1.5 text-[9.5px] font-black tracking-[0.16em] text-app">
              <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-2 rounded-[2px]" />
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
                  <span key={dot} style={{ animationDelay: `${dot * 0.25}s` }} className="zenith-blink size-1.5 rounded-[2px] bg-fg/60" />
                ))}
              </span>
              {pastWinText.processing}
            </p>
            <dl className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">{pastWinText.reference}:</dt>
                <dd className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono font-black tracking-wider text-fg">{entry.reference}</dd>
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
    <section style={{ animationDelay: '240ms' }} className={cx(openClass, 'min-w-0 animate-rise motion-reduce:animate-none lg:col-span-5 lg:self-start')}>
      <header className="flex items-center gap-3">
        <Eyebrow icon="checkCircle">{translate('tradeWin.pastWinsTitle')}</Eyebrow>
        {entries.length > 0 && (
          <span
            key={entries.length}
            style={{ background: RED }}
            className="ml-auto grid h-8 min-w-8 animate-dot-pop place-items-center rounded-full px-2 font-mono text-xs font-black text-white motion-reduce:animate-none"
          >
            {entries.length}
          </span>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="mt-5">
          <PixelEmpty icon="trophy" title={translate('tradeWin.noRedemptions')} text={translate('tradeWin.keepTrading')} />
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

/** IB Trade & Win: open lot header + ink win capsules, the full-width store, then claim tickets beside the podium. */
export function IbTradeWinScreen({ data, isLoading }: { data: TradeWinOverview | undefined; isLoading: boolean }) {
  const [redemptions, setRedemptions] = useState<PastWin[]>([]);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-72 rounded-[32px] lg:col-span-8" />
        <Skeleton className="h-72 rounded-[30px] lg:col-span-4" />
        <Skeleton className="h-[40rem] rounded-[32px] lg:col-span-12" />
        <Skeleton className="h-[26rem] rounded-[30px] lg:col-span-5" />
        <Skeleton className="h-[26rem] rounded-[32px] lg:col-span-7" />
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
      <ClaimTickets entries={pastWins} currency={currency} />
      <PodiumBoard leaders={data.leaders} />
    </div>
  );
}
