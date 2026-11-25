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
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

import { RedeemPrizeModal } from './RedeemPrizeModal';
import { prefersReducedMotion, useAnimatedNumber } from './ScratchExperience';

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

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const panelClass = cx(boardCard, 'zenith-tile relative isolate overflow-hidden');
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg ring-1 ring-fg/10';
// Dark glass chips that sit on product images and over the cover-flow stage.
const frostChipClass = 'bg-[#160904]/75 text-white ring-1 ring-white/10 backdrop-blur-md';

export const categoryIcon: Record<RewardCategory, IconName> = {
  travel: 'globe',
  electronics: 'monitor',
  cash: 'wallet',
  merchandise: 'gift',
};

const SPIN_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
// Lots matrix: one pixel per share step of traded lots; the still-available share lights ember.
const LOT_PIXEL_COLUMNS = 16;
const LOT_PIXELS = Array.from({ length: LOT_PIXEL_COLUMNS * 4 }, (_, index) => index);
// Pixel cells in each chaser's share track.
const CHASER_CELLS = Array.from({ length: 18 }, (_, index) => index);
// Quarter marks on the lots-requirement meter, drawn as taller cells.
const RULER_MARKS = [25, 50, 75];
const REQUIREMENT_CELLS = Array.from({ length: 24 }, (_, index) => index);
// How many products stay visible on each side of the cover-flow centre.
const COVER_RANGE = 2;

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
 * Lots board: the open available-lots figure with traded / spent beside it, a pixel matrix of traded lots where the
 * still-available share glows ember, and the win stats as two ember / graphite capsules.
 */
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
  const lots = useAnimatedNumber(availableLots, 1200);
  const wins = useAnimatedNumber(pastWins, 900);
  const won = useAnimatedNumber(valueWon, 1200);

  // Share of traded lots still available to spend.
  const gauge = tradedLots > 0 ? Math.min(1, Math.max(0, availableLots / tradedLots)) : 0;
  const sweep = useAnimatedNumber(gauge * 100, 1600);
  const litPixels = Math.round((sweep / 100) * LOT_PIXELS.length);
  const spentShare = tradedLots > 0 ? Math.min(100, (spentLots / tradedLots) * 100) : 0;

  return (
    <section className={cx(boardCard, 'zenith-tile relative isolate overflow-hidden p-5 sm:p-7')}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="min-w-0">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span className="grid size-8 place-items-center rounded-full bg-(--hero-buy) text-[#160904]">
              <Icon name="pieChart" size={14} />
            </span>
            {translate(isIb ? 'tradeWin.availableIbLots' : 'tradeWin.availableLots')}
          </p>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-6xl leading-none font-light tracking-[-0.05em] text-fg tabular-nums sm:text-7xl">{formatLots(lots)}</span>
            <span className={captionClass}>{translate('tradeWin.lots')}</span>
          </p>
          <p className="mt-3 text-sm text-fg-muted">
            {translate(isIb ? 'tradeWin.downlineSpent' : 'tradeWin.tradedSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <li className="relative isolate flex min-w-0 items-center gap-3 overflow-hidden rounded-full bg-(--hero-buy) py-2 pr-5 pl-2 text-[#160904]">
              <WaveLines color="white" opacity={0.4} />
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#160904] text-(--hero-buy)">
                <Icon name="checkCircle" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-bold tracking-[0.14em] uppercase opacity-75">{translate('tradeWin.pastWins')}</span>
                <span className="block truncate text-[11px] opacity-75">{translate('tradeWin.totalRedemptions')}</span>
              </span>
              <span className="shrink-0 text-2xl font-semibold tabular-nums">{Math.round(wins)}</span>
            </li>
            <li className="flex min-w-0 items-center gap-3 rounded-full bg-fg/[0.05] py-2 pr-5 pl-2 ring-1 ring-fg/10">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.08] text-fg">
                <Icon name="wallet" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-bold tracking-[0.14em] text-fg-subtle uppercase">{translate('tradeWin.valueWon')}</span>
                <span className="block truncate text-[11px] text-fg-muted">{translate('tradeWin.totalPrizeValue')}</span>
              </span>
              <span className="shrink-0 text-lg font-semibold text-fg tabular-nums">{formatMoney(won, currency)}</span>
            </li>
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-4 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.07] sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <p className={captionClass}>{translate('tradeWin.lots')}</p>
            <p className="text-3xl font-light tracking-[-0.03em] text-fg tabular-nums">
              {Math.round(sweep)}
              <span className="text-lg text-fg-subtle">%</span>
            </p>
          </div>
          <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${LOT_PIXEL_COLUMNS}, minmax(0, 1fr))` }}>
            {LOT_PIXELS.map((pixel) => {
              const isLit = pixel < litPixels;
              return (
                <span
                  key={pixel}
                  style={{ animationDelay: `${(pixel % LOT_PIXEL_COLUMNS) * 30 + Math.floor(pixel / LOT_PIXEL_COLUMNS) * 60}ms` }}
                  className={cx(
                    'zenith-pixel aspect-square rounded-[5px] transition-colors duration-500',
                    isLit ? 'bg-(--hero-buy)' : 'bg-fg/[0.07]',
                    !isLit && pixel % 7 === 3 && 'zenith-blink bg-fg/[0.14]',
                  )}
                />
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <span aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-fg/[0.07]">
              <span className="h-full rounded-full bg-(--hero-buy) transition-[width] duration-700" style={{ width: `${sweep}%` }} />
              <span className="ml-0.5 h-full rounded-full bg-fg/25 transition-[width] duration-700" style={{ width: `${Math.min(spentShare, 100 - sweep)}%` }} />
            </span>
            <span className="flex flex-wrap justify-between gap-2 font-mono text-[10px] text-fg-subtle tabular-nums">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-(--hero-buy)" />
                {formatLots(availableLots)}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-fg/25" />
                {formatLots(spentLots)} / {formatLots(tradedLots)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const pastWinText = {
  submitted: 'SUBMITTED',
  reference: 'Reference',
  processing: 'We are currently processing your reward',
  submittedOn: 'Submitted',
};

/** One claim as a bead on the dotted claims thread, with its reference and processing status beside it. */
function PastWinCard({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';

  return (
    <li style={{ animationDelay: `${index * 80}ms` }} className="group relative animate-rise pl-12 motion-reduce:animate-none">
      <span aria-hidden="true" className={cx(beadClass, 'absolute top-1 left-0 size-9 transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none')}>
        <Icon name={icon} size={15} />
      </span>

      <div className="rounded-[22px] bg-fg/[0.04] p-3 ring-1 ring-fg/[0.08] transition-colors duration-300 group-hover:bg-fg/[0.07] motion-reduce:transition-none">
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
            <p className="mt-2.5 flex items-center gap-2 text-[11px] text-fg-muted">
              <span aria-hidden="true" className="flex gap-0.5">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} style={{ animationDelay: `${dot * 200}ms` }} className="size-1 animate-ping-soft rounded-full bg-fg motion-reduce:animate-none" />
                ))}
              </span>
              {pastWinText.processing}
            </p>
            <dl className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dotted border-line-strong pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">{pastWinText.reference}:</dt>
                <dd className="font-mono font-bold tracking-wider text-fg">{entry.reference}</dd>
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
    <section className={cx(panelClass, 'flex flex-col p-5')}>
      <header className="flex items-center gap-3">
        <span className={cx(beadClass, 'size-10')}>
          <Icon name="trophy" size={16} />
        </span>
        <h2 className="text-base font-semibold text-fg">{translate('tradeWin.pastWinsTitle')}</h2>
        {entries.length > 0 && (
          <span className="ml-auto rounded-full bg-(--hero-buy) px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#160904] tabular-nums">{entries.length}</span>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
          <span aria-hidden="true" className="relative mb-5 grid size-16 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
            <span className="absolute inset-2 animate-ring-breathe rounded-full bg-fg/5 motion-reduce:animate-none" />
            <Icon name="trophy" size={22} className="relative animate-float text-fg [animation-duration:2.6s] motion-reduce:animate-none" />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noRedemptions')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.keepTrading')}</p>
        </div>
      ) : (
        <ul className="relative mt-5 flex flex-col gap-3 before:absolute before:top-4 before:bottom-4 before:left-[17px] before:border-l-2 before:border-dashed before:border-(--hero-buy)/40">
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
        'group/chip relative inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-300 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-(--hero-buy) text-[#160904]' : 'text-fg-muted ring-1 ring-fg/10 hover:bg-fg/5 hover:text-fg',
      )}
    >
      {icon ? (
        <Icon name={icon} size={14} className="transition-transform duration-300 group-hover/chip:-rotate-12 motion-reduce:transition-none" />
      ) : (
        <span aria-hidden="true" className={cx('size-1.5 rounded-full', isActive ? 'bg-[#160904]' : 'bg-fg/30')} />
      )}
      {children}
      {count !== undefined && (
        <span className={cx('rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-[#160904]/15 text-[#160904]' : 'bg-fg/5 text-fg-subtle')}>{count}</span>
      )}
    </button>
  );
}

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg disabled:pointer-events-none disabled:opacity-35';

  return (
    <div className="flex items-center gap-1">
      <span className="pr-1 pl-3 text-[10.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{translate('tradeWin.quantity')}</span>
      <button type="button" aria-label={translate('tradeWin.decrease')} disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepClass}>
        <span aria-hidden="true" className="text-base leading-none">−</span>
      </button>
      <span key={value} aria-live="polite" className="w-7 animate-pop-in text-center text-sm font-bold text-fg tabular-nums motion-reduce:animate-none">
        {value}
      </span>
      <button type="button" aria-label={translate('tradeWin.increase')} disabled={value >= max} onClick={() => onChange(value + 1)} className={stepClass}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

/** Lots requirement as a thin ruler: the fill and a pulsing bead travel to the share your lots already cover. */
function RequirementMeter({ requirement, share, closedTradesOnly }: { requirement: number; share: number; closedTradesOnly: boolean }) {
  const shown = useAnimatedNumber(share, 1300);
  const isMet = share >= 100;

  return (
    <div className="rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.08]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={captionClass}>{translate('tradeWin.lotRequirement')}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-fg tabular-nums">
            {requirement} <span className="text-sm font-medium text-fg-muted">{translate('tradeWin.lots')}</span>
          </p>
        </div>
        <span className={cx('rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums ring-1', isMet ? 'bg-(--hero-buy) text-[#160904] ring-transparent' : 'bg-fg/5 text-fg ring-fg/10')}>
          {Math.round(shown)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={translate('tradeWin.requirementProgress')}
        aria-valuenow={share}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-5 flex h-7 items-end gap-[3px]"
      >
        {REQUIREMENT_CELLS.map((cell) => {
          const cellStart = (cell / REQUIREMENT_CELLS.length) * 100;
          const isLit = cellStart < shown;
          const isQuarter = RULER_MARKS.includes(cellStart);
          return (
            <span
              key={cell}
              aria-hidden="true"
              style={{ transitionDelay: `${cell * 25}ms` }}
              className={cx(
                'flex-1 rounded-full transition-[height,background-color] duration-500 motion-reduce:transition-none',
                isLit ? cx('bg-(--hero-buy)', isQuarter ? 'h-7' : 'h-5') : cx('bg-fg/[0.08]', isQuarter ? 'h-4' : 'h-2.5'),
              )}
            />
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex justify-between font-mono text-[10px] text-fg-subtle tabular-nums">
        <span>0</span>
        <span>{requirement}</span>
      </div>
      {closedTradesOnly && <p className="mt-2 text-[11px] text-fg-subtle">{translate('tradeWin.closedTradesOnly')}</p>}
    </div>
  );
}

/** The product picture: whole image (contain) over a blurred copy, or a glossy category bead when there is none. */
function CoverArt({ reward, isCenter }: { reward: TradeWinReward; isCenter: boolean }) {
  if (reward.image) {
    return (
      <>
        <Image src={reward.image} alt="" aria-hidden="true" fill unoptimized sizes="30vw" className="-z-20 scale-110 object-cover opacity-30 blur-2xl" />
        <Image
          src={reward.image}
          alt={isCenter ? reward.name : ''}
          fill
          unoptimized
          sizes="(min-width: 1024px) 34vw, 70vw"
          className="object-contain p-5 drop-shadow-[0_24px_36px_rgba(0,0,0,0.55)]"
        />
      </>
    );
  }

  return (
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
      <span className={cx('relative grid size-36 place-items-center', isCenter && 'animate-float [animation-duration:4s] motion-reduce:animate-none')}>
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span className="absolute inset-6 animate-ring-breathe rounded-full border border-fg/15 motion-reduce:animate-none" />
        <span className="relative grid size-20 place-items-center rounded-full bg-(--hero-buy) text-[#160904]">
          <Icon name={categoryIcon[reward.category]} size={34} strokeWidth={1.5} />
        </span>
      </span>
    </span>
  );
}

/**
 * Cover-flow showcase: the chosen product faces front with its tag and swinging price tag; its neighbours turn away
 * in 3D on either side and slide into the middle when picked.
 */
function CoverflowStage({
  rewards,
  selectedIndex,
  currency,
  isCelebrating,
  onSelect,
}: {
  rewards: TradeWinReward[];
  selectedIndex: number;
  currency: string;
  isCelebrating: boolean;
  onSelect: (id: string) => void;
}) {
  const previous = rewards[(selectedIndex - 1 + rewards.length) % rewards.length];
  const next = rewards[(selectedIndex + 1) % rewards.length];
  const hasNeighbours = rewards.length > 1;
  const arrowClass = cx('absolute top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95 motion-reduce:transition-none', frostChipClass);

  return (
    <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0f0b09] ring-1 ring-fg/[0.07] light:bg-surface-2">
      <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(rgb(255_107_44/0.35)_1.2px,transparent_1.6px)] [background-size:16px_16px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <span aria-hidden="true" className="absolute bottom-6 left-1/2 -z-10 h-10 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl light:bg-black/15" />

      <div className="relative h-72 [perspective:1200px] sm:h-80">
        {rewards.map((reward, index) => {
          const offset = index - selectedIndex;
          const distance = Math.abs(offset);
          const isCenter = offset === 0;
          const isShown = distance <= COVER_RANGE;
          const scale = isCenter ? 1 : 0.78 - (distance - 1) * 0.1;
          const opacity = !isShown ? 0 : isCenter ? 1 : 0.55 - (distance - 1) * 0.25;

          return (
            <button
              key={reward.id}
              type="button"
              tabIndex={-1}
              aria-hidden={!isCenter}
              disabled={isCenter}
              onClick={() => onSelect(reward.id)}
              style={{
                transform: `translate(calc(-50% + ${offset * 58}%), -50%) rotateY(${offset * -32}deg) scale(${scale})`,
                zIndex: 10 - distance,
                opacity,
              }}
              className={cx(
                'absolute top-1/2 left-1/2 isolate aspect-[4/3] w-[min(26rem,68%)] overflow-hidden rounded-[24px] bg-surface text-left ring-1 transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
                isCenter ? 'ring-line-strong shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]' : 'cursor-pointer ring-line blur-[1px] hover:blur-none',
                !isShown && 'pointer-events-none',
              )}
            >
              <CoverArt reward={reward} isCenter={isCenter} />

              {isCenter && (
                <>
                  <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                  <span className={cx('absolute top-3.5 left-3.5 inline-flex animate-pop-in items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] uppercase motion-reduce:animate-none', frostChipClass)}>
                    <Icon name={categoryIcon[reward.category]} size={12} />
                    {categoryTag(reward.category)}
                  </span>
                  {/* Price tag: notched left edge with a punched hole, hung at an angle. */}
                  <span className="absolute top-3.5 right-3.5 animate-pop-in [animation-delay:150ms] motion-reduce:animate-none">
                    <span className="flex rotate-6 items-center gap-2.5 rounded-l-md rounded-r-2xl bg-(--hero-buy) py-1.5 pr-3.5 pl-2.5 text-[#160904]">
                      <span aria-hidden="true" className="size-2 rounded-full bg-[#160904]/30 ring-1 ring-[#160904]/40" />
                      <span className="flex flex-col">
                        <span className="text-[9px] font-semibold tracking-[0.14em] uppercase opacity-70">{translate('tradeWin.value')}</span>
                        <span className="text-base leading-tight font-black tabular-nums">{formatMoney(reward.value, currency)}</span>
                      </span>
                    </span>
                  </span>
                </>
              )}

              {isCenter && isCelebrating && (
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                  <span className="absolute size-24 animate-ring-ripple rounded-full border-2 border-success/60 motion-reduce:animate-none" />
                  <span className="relative flex size-16 animate-pop-in items-center justify-center rounded-full bg-success text-surface motion-reduce:animate-none">
                    <Icon name="check" size={30} strokeWidth={2.5} />
                  </span>
                </span>
              )}
            </button>
          );
        })}

        {hasNeighbours && (
          <>
            <button type="button" aria-label={previous.name} onClick={() => onSelect(previous.id)} className={cx(arrowClass, 'left-3')}>
              <Icon name="chevronDown" size={16} className="rotate-90" />
            </button>
            <button type="button" aria-label={next.name} onClick={() => onSelect(next.id)} className={cx(arrowClass, 'right-3')}>
              <Icon name="chevronDown" size={16} className="-rotate-90" />
            </button>
          </>
        )}
      </div>

      <p aria-hidden="true" className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[11px] font-bold tracking-[0.2em] text-fg-subtle tabular-nums">
        <span className="text-fg">{String(selectedIndex + 1).padStart(2, '0')}</span> / {String(rewards.length).padStart(2, '0')}
      </p>
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
  isCelebrating,
  onCelebrate,
  onRedeem,
}: {
  reward: TradeWinReward;
  currency: string;
  availableLots: number;
  availableDeposit: number;
  stockLeft: number;
  claimed: number;
  isCelebrating: boolean;
  onCelebrate: () => void;
  onRedeem: (reward: TradeWinReward, quantity: number) => string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);

  const safeQuantity = Math.min(quantity, Math.max(stockLeft, 1));
  const hasStock = stockLeft > 0;
  const hasLots = availableLots >= reward.lotRequirement * safeQuantity;
  const canRedeem = hasStock && hasLots && !isCelebrating;
  const requirementPercent = reward.lotRequirement > 0 ? (availableLots / reward.lotRequirement) * 100 : 100;
  const requirementShare = Math.round(Math.min(100, Math.max(0, requirementPercent)));
  const isLowStock = stockLeft <= 2;

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
    onCelebrate();
    return reference;
  }

  function closeRedeem() {
    setIsConfirming(false);
    setQuantity(1);
  }

  return (
    <>
      <article className="animate-rise motion-reduce:animate-none">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <header className="min-w-0">
              <h3 className="text-3xl font-black tracking-tight text-fg">{reward.name}</h3>
              <p className="mt-1 text-sm text-fg-muted">{reward.description}</p>
            </header>
            <div className="flex flex-wrap gap-2">
              <p className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1', isLowStock ? 'bg-danger/10 text-danger ring-danger/30' : 'text-fg-muted ring-line')}>
                <Icon name="inbox" size={13} />
                <span className="text-fg-subtle">{translate('tradeWin.stock')}</span>
                <span className="font-semibold">{translate('tradeWin.stockLeft', { count: stockLeft })}</span>
              </p>
              <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-fg-muted ring-1 ring-line">
                <Icon name="history" size={13} />
                <span className="text-fg-subtle">{translate('tradeWin.claimed')}</span>
                <span className="font-semibold text-fg">{translate('tradeWin.claimedTimes', { count: claimed })}</span>
              </p>
            </div>
            <RequirementMeter requirement={reward.lotRequirement} share={requirementShare} closedTradesOnly={reward.closedTradesOnly} />
          </div>

          {/* Spec tiles: one frosted cell per allowance and balance. */}
          <dl className="grid content-start gap-2 sm:grid-cols-2">
            {facts.map((fact, index) => (
              <div
                key={fact.key}
                style={{ animationDelay: `${150 + index * 80}ms` }}
                className="group/fact min-w-0 animate-rise rounded-[22px] bg-fg/[0.04] p-3.5 ring-1 ring-fg/[0.08] transition-colors duration-300 hover:bg-fg/[0.07] motion-reduce:animate-none"
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'grid size-8 place-items-center rounded-full transition-transform duration-300 group-hover/fact:-rotate-12 motion-reduce:transition-none',
                    fact.highlight ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.07] text-fg-muted ring-1 ring-fg/10',
                  )}
                >
                  <Icon name={fact.icon} size={14} />
                </span>
                <dt className="mt-3 truncate text-[11px] text-fg-subtle">{fact.label}</dt>
                <dd className={cx('mt-0.5 truncate text-lg font-bold tabular-nums', fact.highlight ? 'text-success' : 'text-fg')}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Redeem capsule: quantity on the left, the action on the right, in one rounded bar. */}
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[28px] bg-fg/[0.04] p-1.5 ring-1 ring-fg/10 sm:flex-nowrap sm:rounded-full">
          <QuantityStepper value={safeQuantity} max={Math.max(stockLeft, 1)} onChange={setQuantity} />
          <span aria-hidden="true" className="relative hidden h-px flex-1 overflow-hidden border-t border-dashed border-fg/15 sm:block">
            <span className="zenith-route absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-(--hero-buy)" />
          </span>
          <Button type="button" className="min-w-40 flex-1 rounded-full sm:flex-none" disabled={!canRedeem && !isCelebrating} onClick={handleRedeem}>
            <Icon name={isCelebrating ? 'checkCircle' : 'gift'} size={16} />
            {buttonLabel}
          </Button>
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

/** A product in the dock: glossy icon bead with a stock dot, then name, tag, value and stock left. */
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
      className="group relative flex w-28 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl px-1 pt-1 pb-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="relative mb-1">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-12 place-items-center rounded-full transition-[translate,scale,color] duration-300 ease-out motion-reduce:transition-none',
            isSelected ? '-translate-y-1.5 scale-110 bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.05] text-fg-subtle ring-1 ring-fg/10 group-hover:-translate-y-1 group-hover:text-fg',
          )}
        >
          <Icon name={categoryIcon[reward.category]} size={19} />
        </span>
        <span aria-hidden="true" className={cx('absolute -top-1 -right-0.5 size-3 rounded-full ring-2 ring-surface', isReady ? 'bg-success' : 'bg-fg/30')} />
      </span>
      <span className={cx('w-full truncate text-xs font-semibold', isSelected ? 'text-fg' : 'text-fg-muted')}>{reward.name}</span>
      <span className="w-full truncate text-[9px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{categoryTag(reward.category)}</span>
      <span className="font-mono text-[11px] font-bold text-fg tabular-nums">{formatMoney(reward.value, currency)}</span>
      <span className={cx('text-[10px]', isReady ? 'text-success' : 'text-fg-subtle')}>{translate('tradeWin.stockLeft', { count: stockLeft })}</span>
      <span
        aria-hidden="true"
        className={cx('absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-(--hero-buy) transition-transform duration-300 motion-reduce:transition-none', isSelected ? 'scale-x-100' : 'scale-x-0')}
      />
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
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const baseId = useId();

  useEffect(() => {
    if (!celebratingId) return;
    const timer = window.setTimeout(() => setCelebratingId(null), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [celebratingId]);

  const isReady = (reward: TradeWinReward) => stockLeftOf(reward) > 0 && availableLots >= reward.lotRequirement;
  const readyCount = rewards.filter(isReady).length;
  const visible = rewards.filter((reward) => (status === 'all' || isReady(reward)) && (category === 'all' || reward.category === category));
  // Falls back to the first visible reward when the chosen one is filtered out (or nothing is chosen yet).
  const selected = visible.find((reward) => reward.id === selectedId) ?? visible[0];
  const selectedIndex = selected ? visible.indexOf(selected) : -1;

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;
    const lastIndex = visible.length - 1;
    let nextIndex: number;
    const isNext = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const isPrevious = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (isNext) nextIndex = selectedIndex === lastIndex ? 0 : selectedIndex + 1;
    else if (isPrevious) nextIndex = selectedIndex === 0 ? lastIndex : selectedIndex - 1;
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={captionClass}>{translate('tradeWin.storeEyebrow')}</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-fg">{translate('tradeWin.storeTitle')}</h2>
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-fg-muted">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy) motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-(--hero-buy)" />
            </span>
            {translate('tradeWin.productsAvailable', { count: visible.length })}
          </p>
        </div>
        <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex gap-1 rounded-full bg-fg/[0.04] p-1 ring-1 ring-fg/10">
          <FilterChip isActive={status === 'all'} onClick={() => setStatus('all')} count={rewards.length}>
            {translate('tradeWin.filterAll')}
          </FilterChip>
          <FilterChip isActive={status === 'ready'} onClick={() => setStatus('ready')} icon="bolt" count={readyCount}>
            {translate('tradeWin.readyToRedeem')}
          </FilterChip>
        </div>
      </header>

      <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="mt-5 flex gap-2 overflow-x-auto border-y border-fg/[0.07] py-3">
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
          <span aria-hidden="true" className="relative mb-4 grid size-14 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
            <Icon name="inbox" size={22} className="text-fg-subtle" />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('tradeWin.noProducts')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('tradeWin.noProductsText')}</p>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <CoverflowStage
              rewards={visible}
              selectedIndex={selectedIndex}
              currency={currency}
              isCelebrating={celebratingId === selected.id}
              onSelect={setSelectedId}
            />
          </div>

          <div
            role="tablist"
            aria-label={translate('tradeWin.productTabs')}
            aria-orientation="horizontal"
            onKeyDown={handleTabKeyDown}
            className="relative z-10 mx-auto -mt-6 flex w-fit max-w-full snap-x gap-1 overflow-x-auto rounded-[28px] bg-[#141010]/95 px-2 pt-3 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.9)] ring-1 ring-fg/10 backdrop-blur-md"
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

          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${selected.id}`} className="mt-6 min-w-0">
            <RewardTicket
              key={selected.id}
              reward={selected}
              currency={currency}
              availableLots={availableLots}
              availableDeposit={availableDeposit}
              stockLeft={stockLeftOf(selected)}
              claimed={claimedOf(selected)}
              isCelebrating={celebratingId === selected.id}
              onCelebrate={() => setCelebratingId(selected.id)}
              onRedeem={onRedeem}
            />
          </div>
        </>
      )}
    </section>
  );
}

/** One podium trader as a capsule track filled to their share of the champion's lots, with the trader's bead riding the tip. */
function PodiumTrack({ leader, share, place }: { leader: TradeWinLeader; share: number; place: number }) {
  const sweep = useAnimatedNumber(Math.max(share, MIN_LANE_SHARE * 3), 1400 + place * 250);
  const isChampion = place === 0;

  return (
    <li style={{ animationDelay: `${200 + place * 120}ms` }} className="group/podium animate-rise motion-reduce:animate-none">
      <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
      <div className="mb-1.5 flex items-baseline gap-2 px-1">
        <span aria-hidden="true" className={cx('font-mono text-[10px] font-bold tabular-nums', isChampion ? 'text-(--hero-buy)' : 'text-fg-subtle')}>
          #{String(leader.rank).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{leader.name}</span>
        <span className="flex items-baseline gap-1">
          <span className={cx('font-semibold text-fg tabular-nums', isChampion ? 'text-lg' : 'text-sm')}>{leader.closedLots}</span>
          <span className="text-[10px] text-fg-subtle">{translate('tradeWin.lots')}</span>
        </span>
      </div>
      <span aria-hidden="true" className="relative block h-11 overflow-hidden rounded-full bg-fg/[0.05] ring-1 ring-fg/[0.07]">
        <span
          style={{ width: `${sweep}%` }}
          className={cx('absolute inset-y-1 left-1 isolate flex items-center justify-end overflow-hidden rounded-full pr-1', isChampion ? 'bg-(--hero-buy)' : 'bg-fg/[0.14]')}
        >
          {isChampion && <WaveLines color="white" opacity={0.35} />}
          <span
            className={cx(
              'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-transform duration-300 group-hover/podium:scale-110 motion-reduce:transition-none',
              isChampion ? 'bg-[#160904] text-(--hero-buy)' : 'bg-fg/15 text-fg',
            )}
          >
            {leader.name.charAt(0)}
          </span>
        </span>
      </span>
    </li>
  );
}

/** One chaser: rank, initial, a row of pixel cells lit to their share, and closed lots. */
function ChaserRow({ leader, share, order }: { leader: TradeWinLeader; share: number; order: number }) {
  const shown = useAnimatedNumber(Math.max(share, MIN_LANE_SHARE), 1300 + order * 120);
  const litCells = Math.max(1, Math.round((shown / 100) * CHASER_CELLS.length));

  return (
    <li
      style={{ animationDelay: `${600 + order * 90}ms` }}
      className="group/row grid animate-rise grid-cols-[2.25rem_minmax(0,1fr)_4.5rem] items-center gap-3 py-2.5 motion-reduce:animate-none"
    >
      <span className="font-mono text-xs font-bold text-fg-subtle tabular-nums">#{leader.rank}</span>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-[11px] font-bold text-fg ring-1 ring-fg/10 transition-transform duration-300 group-hover/row:scale-110 motion-reduce:transition-none"
        >
          {leader.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-fg-muted transition-colors group-hover/row:text-fg">{leader.name}</p>
          <span aria-hidden="true" className="mt-1.5 flex gap-[2px]">
            {CHASER_CELLS.map((cell) => (
              <span key={cell} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', cell < litCells ? 'bg-(--hero-buy)/80' : 'bg-fg/[0.07]')} />
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
  const podium = [...leaders].sort((a, b) => a.rank - b.rank).filter((leader) => leader.rank <= PODIUM_SIZE);
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);
  const championLots = Math.max(0, ...podium.map((leader) => leader.closedLots));
  // Chaser tracks run against the lead chaser, so the gaps between them stay visible next to the champion's total.
  const leadChaserLots = Math.max(0, ...chasers.map((leader) => leader.closedLots));

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate(SPIN_KEYFRAMES, { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section className={cx(panelClass, 'p-5 sm:p-6')}>
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--hero-buy) text-[#160904]">
          <Icon name="trophy" size={16} />
        </span>
        <h2 className="text-lg font-semibold text-fg">{translate('tradeWin.leaderboardTitle')}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--hero-buy)/12 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-[0.12em] text-(--hero-buy) uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-(--hero-buy) motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-(--hero-buy)" />
          </span>
          {translate('tradeWin.live')}
        </span>
        <button
          type="button"
          onClick={refresh}
          aria-label={translate('tradeWin.refresh')}
          className="ml-auto grid size-10 place-items-center rounded-full bg-fg/[0.05] text-fg-muted ring-1 ring-fg/10 transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span ref={refreshIconRef} className="flex">
            <Icon name="refresh" size={15} />
          </span>
        </button>
      </header>

      <div key={round} className="mt-5 flex flex-col gap-5">
        {podium.length > 0 && (
          <ol className="flex flex-col gap-3.5">
            {podium.map((leader, place) => (
              <PodiumTrack key={leader.rank} leader={leader} share={championLots > 0 ? (leader.closedLots / championLots) * 100 : 0} place={place} />
            ))}
          </ol>
        )}

        {chasers.length > 0 && (
          <div className="rounded-[22px] bg-fg/[0.03] px-3.5 py-2 ring-1 ring-fg/[0.07]">
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_4.5rem] gap-3 border-b border-fg/[0.07] pt-1 pb-2">
              <span className={captionClass}>{translate('tradeWin.rank')}</span>
              <span className={captionClass}>{translate('tradeWin.trader')}</span>
              <span className={cx(captionClass, 'text-right')}>{translate('tradeWin.closedLots')}</span>
            </div>
            <ol start={PODIUM_SIZE + 1} className="divide-y divide-fg/[0.05]">
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

export function TradeWinScreen({ data, isLoading, isIb }: { data: TradeWinOverview | undefined; isLoading: boolean; isIb: boolean }) {
  const [redemptions, setRedemptions] = useState<PastWin[]>([]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-72 rounded-[28px]" />
        <Skeleton className="h-[40rem] rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Skeleton className="h-[26rem] rounded-[28px]" />
          <Skeleton className="h-64 rounded-[28px]" />
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
      <LotsWallet
        availableLots={availableLots}
        tradedLots={data.tradedLots}
        spentLots={data.spentLots + sessionLotsSpent}
        pastWins={pastWins.length}
        valueWon={valueWon}
        currency={currency}
        isIb={isIb}
      />

      <RewardStore
        rewards={data.rewards}
        currency={currency}
        availableLots={availableLots}
        availableDeposit={data.availableDeposit}
        stockLeftOf={(reward) => reward.stock - redeemedQuantity(reward)}
        claimedOf={(reward) => reward.claimed + redeemedQuantity(reward)}
        onRedeem={handleRedeem}
      />

      {/* The live race and the claims thread share the row under the store. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <LiveLeaderboard leaders={data.leaders} />
        <PastWins entries={pastWins} currency={currency} />
      </div>
    </div>
  );
}

export default function TradeWinPage() {
  const { data, isLoading } = useTradeWin();
  return <TradeWinScreen data={data} isLoading={isLoading} isIb={false} />;
}
