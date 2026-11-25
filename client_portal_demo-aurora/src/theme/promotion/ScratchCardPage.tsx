'use client';

import { useEffect, useId, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useScratchCard, type ScratchCardItem, type ScratchHistoryEntry, type ScratchLeader } from '@/core/pages/useScratchCard';
import { boardCard } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { ScratchDialog, useAnimatedNumber } from './ScratchExperience';
import { ScratchPreview } from './ScratchPreview';
import './zen.css';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const COUNT_UP_MS = 1200;
const GAUGE_MILESTONES = [25, 50, 75];

// Raked sand: groove baselines in the 0–100 viewBox height.
const RAKE_ROWS = Array.from({ length: 9 }, (_, index) => 6 + index * 11);

// Leaves falling through the garden card: fixed values so server and client render the same.
const FALLING_LEAVES = [
  { left: '4%', size: 18, duration: 9, delay: 0, sway: 50, tone: 'clay' },
  { left: '22%', size: 13, duration: 11, delay: 3.5, sway: -40, tone: 'sage' },
  { left: '41%', size: 16, duration: 8, delay: 1.5, sway: 36, tone: 'clay' },
  { left: '58%', size: 12, duration: 12, delay: 6, sway: -55, tone: 'sage' },
  { left: '73%', size: 17, duration: 10, delay: 2.5, sway: 44, tone: 'clay' },
  { left: '90%', size: 14, duration: 9.5, delay: 5, sway: -38, tone: 'sage' },
];
// Organic stone outlines for the deck, timer digits and cairn; pixel radii so content near the edges never clips.
const CAIRN_SHAPES = [
  'rounded-[30px_40px_28px_44px/28px_34px_30px_36px]',
  'rounded-[40px_28px_42px_30px/32px_28px_36px_30px]',
  'rounded-[34px_44px_30px_38px/30px_36px_28px_32px]',
];
// The smallest cairn stone still spans this share of the width, so names stay readable.
const CAIRN_MIN_WIDTH = 55;
const MIN_TRACK_FILL = 6;

// Lots dish: raked rings from the centre stone outward (viewBox 200×200).
const DISH_RINGS = Array.from({ length: 8 }, (_, index) => 22 + index * 10);

// Hourglass geometry (viewBox 80×120): sand runs from y 8 to 58 in the top bulb and piles from 112 up to 62.
const HOURGLASS_TOP = 8;
const HOURGLASS_BOTTOM = 112;
const HOURGLASS_BULB = 50;
const HOURGLASS_GRAINS = [0, 300, 600];

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const emberInk = 'text-[#062520]';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function clockParts(totalSeconds: number): string[] {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0'));
}

function useCountdown(seconds: number): number {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  return remaining;
}

/** Starts at 0 and moves to the target after mount, so gauges and tracks visibly travel into place. */
function useEntrance(target: number): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(target));
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

function initialOf(name: string): string {
  return name.charAt(0).toUpperCase();
}

type HandCard =
  | { kind: 'ready'; card: ScratchCardItem }
  | { kind: 'revealed'; card: ScratchCardItem; entry: ScratchHistoryEntry }
  | { kind: 'locked'; card: ScratchCardItem };

/** Raked sand grooves in currentColor, drawn twice as wide as the box and sliding by half so the drift loops; `still` stops it. */
function RakedSand({ className, opacity, still = false }: { className?: string; opacity: number; still?: boolean }) {
  return (
    <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className={cx('absolute inset-y-0 left-0 h-full w-[200%]', !still && 'zen-rake-drift')}>
        {RAKE_ROWS.map((y) => (
          <path
            key={y}
            d={`M0 ${y} Q 50 ${y - 4} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity={opacity}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </span>
  );
}

/** A span shaped like a smooth river pebble rather than a circle. */
function Pebble({ className, ...props }: ComponentProps<'span'>) {
  return <span {...props} className={cx('rounded-[48%_52%_45%_55%/55%_48%_52%_45%]', className)} />;
}

/** An ensō brush circle in currentColor that paints itself, holds, fades and paints again. */
function Enso({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className={cx('pointer-events-none overflow-visible', className)}>
      <path d="M58 7 A44 44 0 1 1 28 13" pathLength={100} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" className="zen-enso" />
      <path d="M58 7 A44 44 0 1 1 28 13" pathLength={100} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={9} strokeLinecap="round" className="zen-enso [animation-delay:60ms]" />
    </svg>
  );
}

/** Leaves drifting down through the garden card, each on its own speed, sway and delay. */
function FallingLeaves() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {FALLING_LEAVES.map((leaf) => (
        <span
          key={leaf.left}
          className={cx('zen-leaf absolute top-[-8%] block', leaf.tone === 'clay' ? 'text-(--aurora-cta-from)' : 'text-(--hero-buy)')}
          style={{ left: leaf.left, width: leaf.size, height: leaf.size, '--leaf-duration': `${leaf.duration}s`, '--leaf-delay': `${leaf.delay}s`, '--leaf-sway': `${leaf.sway}px` } as CSSProperties}
        >
          <svg viewBox="0 0 24 24" className="size-full">
            <path d="M3 21 C3 10 10 3 21 3 C21 14 14 21 3 21 Z" fill="currentColor" />
            <path d="M3 21 L16 8" fill="none" stroke="rgb(0 0 0 / 0.25)" strokeWidth={1.2} strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </span>
  );
}

/** HH:MM:SS where each part rolls in when it changes and the separators blink. */
function TicketClock({ seconds, className }: { seconds: number; className?: string }) {
  const remaining = useCountdown(seconds);
  const [hours, minutes, secondsPart] = clockParts(remaining);

  return (
    <>
      <span className="sr-only">{translate('scratch.nextCardIn', { time: [hours, minutes, secondsPart].join(':') })}</span>
      <span aria-hidden="true" className={cx('inline-flex items-baseline font-mono font-bold tabular-nums', className)}>
        <span key={`h-${hours}`} className="animate-tick-rise motion-reduce:animate-none">{hours}</span>
        <span className="animate-blink px-0.5 opacity-60 motion-reduce:animate-none">:</span>
        <span key={`m-${minutes}`} className="animate-tick-rise motion-reduce:animate-none">{minutes}</span>
        <span className="animate-blink px-0.5 opacity-60 motion-reduce:animate-none">:</span>
        <span key={`s-${secondsPart}`} className="animate-tick-rise motion-reduce:animate-none">{secondsPart}</span>
      </span>
    </>
  );
}

function PanelHead({ icon, title, description, aside }: { icon: IconName; title: string; description?: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <span className="relative grid size-12 shrink-0 place-items-center">
        <Enso className="absolute inset-0 size-12 text-(--hero-buy)" />
        <Pebble className={cx('grid size-9 place-items-center bg-(--aurora-cta-from)', emberInk)}>
          <Icon name={icon} size={16} />
        </Pebble>
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {aside}
    </header>
  );
}

/** The featured card's sand tray: drifting raked sand with bobbing stones while ready, a still tray while locked, an engraved stone once revealed. */
function ScratchWindow({ item, currency }: { item: HandCard; currency: string }) {
  if (item.kind === 'locked') {
    return (
      <div className="zen-sand relative isolate grid h-full place-items-center overflow-hidden rounded-[24px] p-5 text-center ring-1 ring-fg/10 ring-inset">
        <RakedSand className="text-fg" opacity={0.12} still />
        <div className="flex flex-col items-center gap-3">
          <Pebble className="relative grid size-14 place-items-center bg-fg/[0.08] text-fg ring-1 ring-fg/15">
            <span aria-hidden="true" className="absolute -inset-2 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
            <Icon name="lock" size={20} />
          </Pebble>
          <span className={captionClass}>{translate('scratch.locked')}</span>
          <TicketClock seconds={item.card.unlocksInSeconds} className="text-2xl text-fg sm:text-3xl" />
        </div>
      </div>
    );
  }

  if (item.kind === 'revealed') {
    const isWin = item.entry.amount > 0;
    return (
      <div className="zen-glint relative isolate grid h-full animate-pop-in place-items-center rounded-[24px] bg-[#13201a] p-5 text-center motion-reduce:animate-none">
        <RakedSand className="text-(--hero-buy)" opacity={0.18} still />
        <div className="flex flex-col items-center gap-2">
          <Pebble className={cx('grid size-12 place-items-center', isWin ? cx('bg-(--hero-buy)', emberInk) : 'bg-white/10 text-white/60')}>
            <Icon name={isWin ? 'check' : 'close'} size={20} />
          </Pebble>
          <span className="text-[10.5px] font-semibold tracking-[0.14em] text-white/55 uppercase">{translate('scratch.revealedLabel')}</span>
          <span className={cx('text-4xl font-light tracking-[-0.04em] tabular-nums', isWin ? 'text-white' : 'text-white/60')}>
            {isWin ? formatMoney(item.entry.amount, currency) : translate('scratch.statusNoWin')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <ScratchPreview>
      <span className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#062520]/85 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white ring-1 ring-white/15">
        <Icon name="gift" size={12} />
        {translate('scratch.scratchHere')}
      </span>
    </ScratchPreview>
  );
}

/** The selected card: a sage stone frame (sand-grey while locked) with drifting rake lines, its id, the tray and the open action. */
function FeaturedCard({ item, currency, onOpen }: { item: HandCard; currency: string; onOpen: (card: ScratchCardItem) => void }) {
  const isLocked = item.kind === 'locked';

  return (
    <article
      key={item.card.id}
      className={cx(
        'relative isolate flex animate-pop-in flex-col gap-4 overflow-hidden rounded-[34px_28px_36px_30px] p-4 motion-reduce:animate-none sm:p-5',
        isLocked ? 'bg-fg/[0.04] text-fg ring-1 ring-fg/10' : cx('bg-(--hero-buy)', emberInk),
      )}
    >
      {!isLocked && <RakedSand className="text-white" opacity={0.3} />}
      <div className="flex items-center justify-between gap-3">
        <p className={cx('text-[10.5px] font-semibold tracking-[0.14em] uppercase', isLocked ? 'text-fg-subtle' : 'opacity-70')}>{translate('scratch.rewardsEyebrow')}</p>
        <span className={cx('rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em]', isLocked ? 'bg-fg/[0.08] text-fg' : 'bg-[#062520] text-(--hero-buy)')}>{item.card.id}</span>
      </div>

      <div className="h-56 sm:h-60">
        <ScratchWindow item={item} currency={currency} />
      </div>

      {item.kind === 'ready' && (
        <button
          type="button"
          onClick={() => onOpen(item.card)}
          aria-label={translate('scratch.openCard')}
          className="group/open inline-flex h-12 items-center justify-between gap-2 rounded-full bg-[#062520] pr-2 pl-6 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#062520] motion-reduce:transition-none"
        >
          {translate('scratch.tapToScratch')}
          <span className={cx('grid size-8 place-items-center rounded-full bg-(--hero-buy) transition-transform duration-300 group-hover/open:translate-x-0.5 motion-reduce:transition-none', emberInk)}>
            <Icon name="arrowRight" size={15} />
          </span>
        </button>
      )}
    </article>
  );
}

/** Total won and history entries engraved on two stone plaques that count up while light glances across them. */
function Scoreboard({ totalWon, entries, currency }: { totalWon: number; entries: number; currency: string }) {
  const shownWon = useAnimatedNumber(totalWon, COUNT_UP_MS);
  const shownEntries = useAnimatedNumber(entries, COUNT_UP_MS);

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="zen-glint zen-sand min-w-0 rounded-[26px_20px_30px_22px] p-4 ring-1 ring-fg/10">
        <p className={cx(captionClass, 'flex items-center gap-1.5')}>
          <Icon name="wallet" size={12} />
          {translate('scratch.totalWon')}
        </p>
        <p className="mt-2 truncate text-4xl leading-none font-light tracking-[-0.04em] text-fg tabular-nums sm:text-5xl">{formatMoney(shownWon, currency)}</p>
        <p className="mt-2 text-xs text-fg-muted">{translate('scratch.allTime')}</p>
      </div>
      <div className="zen-glint min-w-0 rounded-[20px_28px_22px_30px] bg-fg/[0.05] p-4 ring-1 ring-fg/10 [&::after]:[animation-delay:1.4s]">
        <p className={cx(captionClass, 'flex items-center gap-1.5')}>
          <Icon name="history" size={12} />
          {translate('scratch.historyEntries')}
        </p>
        <p className="mt-2 text-3xl leading-none font-light tracking-[-0.03em] text-fg tabular-nums sm:text-4xl">
          {String(Math.round(shownEntries)).padStart(2, '0')}
        </p>
        <p className="mt-2 text-xs text-fg-muted">{translate('scratch.redemptions')}</p>
      </div>
    </div>
  );
}

/** The deck as stepping stones joined by a flowing path: sage = ready, pale = revealed, dashed outline = locked; picking one features it. */
function DeckTile({ item, currency, isSelected, isLast, index, onSelect }: { item: HandCard; currency: string; isSelected: boolean; isLast: boolean; index: number; onSelect: () => void }) {
  const isWin = item.kind === 'revealed' && item.entry.amount > 0;

  return (
    <li style={{ animationDelay: `${200 + index * 80}ms` }} className="zen-rise relative shrink-0">
      {!isLast && (
        <svg aria-hidden="true" viewBox="0 0 20 4" className="absolute top-1/2 left-full h-1 w-5 -translate-y-1/2">
          <line x1={0} y1={2} x2={20} y2={2} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" className="zen-path stroke-(--hero-buy)/60" />
        </svg>
      )}
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={cx(
          'group/deck relative isolate flex h-36 w-28 flex-col justify-between overflow-hidden p-3 text-left transition-[translate,box-shadow] duration-300 motion-reduce:transition-none',
          CAIRN_SHAPES[index % CAIRN_SHAPES.length],
          focusRing,
          item.kind === 'ready' && cx('bg-(--hero-buy)', emberInk),
          item.kind === 'revealed' && 'bg-fg/[0.07] text-fg ring-1 ring-fg/10',
          item.kind === 'locked' && 'border-2 border-dashed border-fg/20 text-fg',
          isSelected ? '-translate-y-2 shadow-[0_18px_26px_-16px_rgb(0_0_0/0.9)] ring-2 ring-fg ring-offset-2 ring-offset-(--color-app)' : 'hover:-translate-y-1',
        )}
      >
        {item.kind === 'ready' && <RakedSand className="text-white" opacity={0.3} />}
        <span className={cx('font-mono text-[10px] font-bold tracking-[0.12em]', item.kind === 'ready' ? 'opacity-70' : 'text-fg-subtle')}>{item.card.id}</span>

        <span className="flex flex-col gap-1.5">
          {item.kind === 'ready' && (
            <>
              <Pebble className="zen-bob grid size-9 place-items-center bg-[#062520] text-(--hero-buy)" style={{ animationDelay: `${index * 300}ms` }}>
                <Icon name="gift" size={15} />
              </Pebble>
              <span className="text-xs font-bold">{translate('scratch.tapToScratch')}</span>
            </>
          )}
          {item.kind === 'locked' && (
            <>
              <Pebble className="grid size-9 place-items-center bg-fg/[0.06] text-fg-muted ring-1 ring-fg/10">
                <Icon name="lock" size={14} />
              </Pebble>
              <span className={captionClass}>{translate('scratch.locked')}</span>
              <TicketClock seconds={item.card.unlocksInSeconds} className="text-xs text-fg" />
            </>
          )}
          {item.kind === 'revealed' && (
            <>
              <Pebble className={cx('grid size-9 place-items-center', isWin ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/[0.06] text-fg-subtle ring-1 ring-fg/10')}>
                <Icon name={isWin ? 'check' : 'close'} size={14} />
              </Pebble>
              <span className={captionClass}>{translate('scratch.revealedLabel')}</span>
              <span className={cx('truncate text-sm font-semibold tabular-nums', isWin ? 'text-fg' : 'text-fg-muted')}>
                {isWin ? formatMoney(item.entry.amount, currency) : translate('scratch.statusNoWin')}
              </span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

/** Next-card countdown: an hourglass pouring the current minute (top bulb = seconds left), beside three stone digits. */
function NextCardTimer({ seconds }: { seconds: number }) {
  const remaining = useCountdown(seconds);
  const [hours, minutes, secondsPart] = clockParts(remaining);
  // useId contains characters (":" or "«»") that break url(#…) references, so keep only safe ones.
  const clipId = `hourglass-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const minuteLeft = Number(secondsPart) / SECONDS_PER_MINUTE;
  const topY = HOURGLASS_TOP + (1 - minuteLeft) * HOURGLASS_BULB;
  const pileY = HOURGLASS_BOTTOM - Math.max(0.08, 1 - minuteLeft) * HOURGLASS_BULB;
  const tiles = [
    { key: 'hours', value: hours, label: translate('scratch.hours') },
    { key: 'minutes', value: minutes, label: translate('scratch.minutes') },
    { key: 'seconds', value: secondsPart, label: translate('scratch.seconds') },
  ];

  return (
    <div className={cx(boardCard, 'zen-rise flex min-w-0 flex-col gap-4 p-5 [animation-delay:120ms]')}>
      <p className={cx(captionClass, 'flex items-center gap-1.5')}>
        <Icon name="lock" size={12} />
        {translate('scratch.nextCardLabel')}
      </p>
      <p className="sr-only">{translate('scratch.nextCardIn', { time: [hours, minutes, secondsPart].join(':') })}</p>

      <div aria-hidden="true" className="flex min-w-0 items-center gap-5">
        <svg viewBox="0 0 80 120" className="h-36 w-24 shrink-0 overflow-visible">
          <defs>
            <clipPath id={`${clipId}-top`}>
              <path d="M15 8 H65 C65 40 44 50 40 58 C36 50 15 40 15 8 Z" />
            </clipPath>
            <clipPath id={`${clipId}-bottom`}>
              <path d="M40 62 C36 70 15 80 15 112 H65 C65 80 44 70 40 62 Z" />
            </clipPath>
          </defs>
          <rect x={0} y={topY} width={80} height={60} clipPath={`url(#${clipId}-top)`} className="fill-(--hero-buy) transition-[y] duration-700 ease-out motion-reduce:transition-none" />
          <rect x={0} y={pileY} width={80} height={60} clipPath={`url(#${clipId}-bottom)`} className="fill-(--hero-buy)/80 transition-[y] duration-700 ease-out motion-reduce:transition-none" />
          {minuteLeft > 0 && <line x1={40} y1={56} x2={40} y2={pileY} strokeWidth={1.6} strokeDasharray="3 2" className="zen-pour stroke-(--hero-buy)" />}
          {minuteLeft > 0 &&
            HOURGLASS_GRAINS.map((delay, grain) => (
              <circle key={delay} cx={39 + grain} cy={64} r={1.2} style={{ animationDelay: `${delay}ms` }} className="zen-grain fill-(--hero-buy)" />
            ))}
          <path d="M15 8 C15 40 36 50 38 60 C36 70 15 80 15 112 M65 8 C65 40 44 50 42 60 C44 70 65 80 65 112" fill="none" strokeWidth={2} className="stroke-fg/35" />
          <rect x={8} y={2} width={64} height={6} rx={3} className="fill-(--aurora-cta-from)" />
          <rect x={8} y={112} width={64} height={6} rx={3} className="fill-(--aurora-cta-from)" />
        </svg>

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          {tiles.map((tile, index) => (
            <div key={tile.key} className="flex min-w-0 flex-col items-center gap-2">
              <span
                className={cx(
                  'relative grid h-16 w-full place-items-center overflow-hidden',
                  CAIRN_SHAPES[index],
                  index === tiles.length - 1 ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/[0.07] text-fg ring-1 ring-fg/10',
                )}
              >
                <span key={tile.value} className="animate-tick-rise font-mono text-2xl font-bold tabular-nums motion-reduce:animate-none sm:text-3xl">
                  {tile.value}
                </span>
              </span>
              <span className="text-[9px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">{tile.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Lots accumulated as a raked sand dish: rings are raked outward from the centre stone up to the share, quarters are marked. */
function LotsGauge({ accumulated, target, currency }: { accumulated: number; target: number; currency: string }) {
  const share = target > 0 ? Math.min(100, (accumulated / target) * 100) : 0;
  const shown = useEntrance(share);
  const litRings = Math.round((shown / 100) * DISH_RINGS.length);
  const milestoneRings = new Set(GAUGE_MILESTONES.map((milestone) => Math.round((milestone / 100) * DISH_RINGS.length) - 1));
  const edgeRadius = litRings > 0 ? DISH_RINGS[litRings - 1] : DISH_RINGS[0];

  return (
    <div className={cx(boardCard, 'zen-rise flex min-w-0 flex-col gap-4 p-5 [animation-delay:200ms] sm:flex-row sm:items-center sm:gap-6')}>
      <div
        role="progressbar"
        aria-label={translate('scratch.lotsAccumulated')}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="zen-sand relative mx-auto aspect-square w-full max-w-[220px] shrink-0 rounded-full"
      >
        <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          <circle cx={100} cy={100} r={97} fill="none" strokeWidth={1.5} strokeDasharray="2 7" className="animate-rim-spin origin-center stroke-fg/25 [transform-box:fill-box] motion-reduce:animate-none" />
          {DISH_RINGS.map((radius, ring) => {
            const isLit = ring < litRings;
            const isMilestone = milestoneRings.has(ring);
            return (
              <circle
                key={radius}
                cx={100}
                cy={100}
                r={radius}
                fill="none"
                strokeWidth={isLit ? 3.5 : 2}
                strokeDasharray={!isLit && isMilestone ? '3 6' : undefined}
                style={{ transitionDelay: `${ring * 140}ms` }}
                className={cx(
                  'transition-[stroke,stroke-width] duration-500',
                  isLit ? 'stroke-(--hero-buy)' : isMilestone ? 'stroke-(--aurora-cta-from)/70' : 'stroke-fg/10',
                )}
              />
            );
          })}
          {litRings > 0 && <circle cx={100} cy={100} r={edgeRadius} fill="none" strokeWidth={2.5} className="zen-ripple stroke-(--hero-buy)" />}
          {/* Shishi-odoshi: a bamboo spout on a post that dips, tips and drips into the dish. */}
          <line x1={182} y1={22} x2={182} y2={48} strokeWidth={5} strokeLinecap="round" className="stroke-[#c9a27a]" />
          <g className="zen-bamboo" style={{ transformOrigin: '182px 20px' }}>
            <rect x={136} y={14} width={70} height={12} rx={6} className="fill-(--hero-buy)" />
            <line x1={160} y1={14} x2={160} y2={26} strokeWidth={1.5} className="stroke-[#062520]/40" />
            <line x1={186} y1={14} x2={186} y2={26} strokeWidth={1.5} className="stroke-[#062520]/40" />
            <ellipse cx={137} cy={20} rx={2.5} ry={6} className="fill-[#062520]/60" />
          </g>
          <circle cx={138} cy={32} r={3.2} className="zen-drip fill-(--hero-buy)" />
          <ellipse cx={138} cy={72} rx={12} ry={4.5} fill="none" strokeWidth={2} className="zen-splash stroke-(--hero-buy)" />
        </svg>
        <span className={cx('absolute top-1/2 left-1/2 grid size-[34%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[48%_52%_45%_55%/55%_48%_52%_45%] bg-(--hero-buy) shadow-[0_10px_20px_-10px_rgb(0_0_0/0.8)]', emberInk)}>
          <span className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">{Math.round(share)}%</span>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className={cx(captionClass, 'flex items-center gap-1.5')}>
          <Icon name="gift" size={12} />
          {translate('scratch.lotsAccumulated')}
        </p>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold text-fg tabular-nums">{formatMoney(accumulated, currency)}</p>
          <p className="truncate text-xs text-fg-subtle tabular-nums">/ {formatMoney(target, currency)}</p>
        </div>
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-fg/[0.05] px-2.5 py-1 text-[11px] text-fg-muted ring-1 ring-fg/10">
          <Icon name="arrowRight" size={11} />
          {translate('scratch.towardNext')}
        </p>
      </div>
    </div>
  );
}

/** One of the top three as a balanced cairn stone, as wide as its share of the leader; the leader is the base stone. */
function CairnStone({ leader, share, place, currency }: { leader: ScratchLeader; share: number; place: number; currency: string }) {
  const isFirst = place === 0;
  const width = CAIRN_MIN_WIDTH + (Math.max(share, 0) / 100) * (100 - CAIRN_MIN_WIDTH);

  return (
    <li
      role="meter"
      aria-label={translate('scratch.shareOfLeader', { name: leader.name })}
      aria-valuenow={Math.round(share)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ width: `${width}%`, animationDelay: `${250 + place * 260}ms` }}
      className={cx(
        'zen-drop relative isolate mx-auto flex min-w-0 items-center gap-3 overflow-hidden px-4 shadow-[0_14px_24px_-18px_rgb(0_0_0/0.8)]',
        CAIRN_SHAPES[place],
        isFirst ? cx('h-20 bg-(--hero-buy)', emberInk) : place === 1 ? 'h-16 bg-fg/[0.13] text-fg' : 'h-14 bg-fg/[0.08] text-fg',
      )}
    >
      <RakedSand className={isFirst ? 'text-white' : 'text-fg'} opacity={isFirst ? 0.3 : 0.12} />
      <span
        aria-hidden="true"
        className={cx('grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold', isFirst ? 'bg-[#062520] text-(--hero-buy)' : 'bg-surface text-fg ring-1 ring-fg/15')}
      >
        {isFirst ? <Icon name="trophy" size={16} /> : initialOf(leader.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cx('shrink-0 font-mono text-[10px] font-bold tabular-nums', isFirst ? 'opacity-70' : 'text-fg-subtle')}>
            <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
            <span aria-hidden="true">#{String(leader.rank).padStart(2, '0')}</span>
          </span>
          <span className="truncate text-sm font-semibold">{leader.name}</span>
        </span>
        <span className={cx('block truncate text-sm font-semibold tabular-nums', isFirst ? '' : 'text-success')}>{formatMoney(leader.amount, currency)}</span>
      </span>
      <span className={cx('hidden shrink-0 font-mono text-[11px] font-bold tabular-nums sm:inline', isFirst ? 'opacity-70' : 'text-fg-subtle')}>{Math.round(share)}%</span>
    </li>
  );
}

/** Everyone after the top three: rank, initial, name and amount over a raked groove, with a pebble rolled to their share. */
function LeaderTrack({ leader, share, currency, index }: { leader: ScratchLeader; share: number; currency: string; index: number }) {
  const shown = useEntrance(share);
  const position = shown > 0 ? Math.max(shown, MIN_TRACK_FILL) : 0;

  return (
    <li style={{ animationDelay: `${1000 + index * 90}ms` }} className="zen-rise flex min-w-0 flex-col gap-2.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-7 shrink-0 font-mono text-sm font-bold text-fg-subtle tabular-nums">
          <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
          <span aria-hidden="true">{String(leader.rank).padStart(2, '0')}</span>
        </span>
        <Pebble aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-fg/[0.07] text-xs font-bold text-fg ring-1 ring-fg/10">
          {initialOf(leader.name)}
        </Pebble>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{leader.name}</p>
        <span className="shrink-0 text-sm font-semibold text-success tabular-nums">{formatMoney(leader.amount, currency)}</span>
      </div>
      <div
        role="meter"
        aria-label={translate('scratch.shareOfLeader', { name: leader.name })}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative ml-10 h-3"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0.5 border-t border-dashed border-fg/20" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0.5 border-t border-dashed border-fg/20" />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full bg-(--hero-buy)/60 transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
          style={{ width: `${position}%` }}
        />
        <Pebble
          aria-hidden="true"
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 bg-(--hero-buy) transition-[left] duration-[1400ms] ease-out motion-reduce:transition-none"
          style={{ left: `${position}%` }}
        />
      </div>
    </li>
  );
}

/** Top three as a swaying cairn (the leader as the base stone), everyone after as raked grooves. */
function Leaderboard({ leaders, currency }: { leaders: ScratchLeader[]; currency: string }) {
  const ranked = [...leaders].sort((a, b) => a.rank - b.rank);
  const top = Math.max(0, ...ranked.map((leader) => leader.amount));
  const shareOf = (leader: ScratchLeader) => (top > 0 ? (leader.amount / top) * 100 : 0);
  const cairn = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="flex flex-col gap-5 pt-6">
      {cairn.length > 0 && (
        <div className="zen-sand relative isolate overflow-hidden rounded-[24px] px-3 pt-6 pb-4">
          <RakedSand className="text-(--hero-buy)" opacity={0.16} />
          <ol className="zen-sway flex flex-col-reverse gap-1.5">
            {cairn.map((leader, place) => (
              <CairnStone key={leader.rank} leader={leader} share={shareOf(leader)} place={place} currency={currency} />
            ))}
          </ol>
          <span aria-hidden="true" className="mx-auto mt-1 block h-1.5 w-4/5 rounded-full bg-fg/10 blur-[2px]" />
        </div>
      )}
      {rest.length > 0 && (
        <ol className="flex flex-col divide-y divide-dashed divide-fg/10">
          {rest.map((leader, index) => (
            <LeaderTrack key={leader.rank} leader={leader} share={shareOf(leader)} currency={currency} index={index} />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Scratch results as pebbles laid along raked grooves, newest first, totalled on an engraved stone; empty, a lone stone ripples. */
function ScratchHistory({ history, totalWon, currency }: { history: ScratchHistoryEntry[]; totalWon: number; currency: string }) {
  return (
    <section aria-labelledby="scratch-history-title" className={cx(boardCard, 'zen-rise flex flex-col gap-5 p-5 [animation-delay:150ms] sm:p-6')}>
      <header className="flex items-center gap-3">
        <Pebble className="grid size-10 shrink-0 place-items-center bg-fg/[0.07] text-fg ring-1 ring-fg/10">
          <Icon name="history" size={17} />
        </Pebble>
        <h2 id="scratch-history-title" className="min-w-0 flex-1 truncate text-base font-semibold text-fg">
          {translate('scratch.historyTitle')}
        </h2>
        <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 font-mono text-xs font-bold text-fg ring-1 ring-fg/10 tabular-nums">{String(history.length).padStart(2, '0')}</span>
      </header>

      {history.length === 0 ? (
        <div className="zen-sand relative isolate flex flex-col items-center overflow-hidden rounded-[22px] px-4 py-10 text-center">
          <RakedSand className="text-(--hero-buy)" opacity={0.18} />
          <span aria-hidden="true" className="relative mb-4 grid size-16 place-items-center">
            <span className="zen-ripple absolute inset-0 rounded-full border-2 border-(--hero-buy)/50" />
            <span className="zen-ripple absolute inset-0 rounded-full border border-(--hero-buy)/40 [animation-delay:1.2s]" />
            <Pebble className={cx('zen-bob relative grid size-14 place-items-center bg-(--hero-buy)', emberInk)}>
              <Icon name="gift" size={22} />
            </Pebble>
          </span>
          <p className="text-base font-semibold text-fg">{translate('scratch.emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">{translate('scratch.emptyText')}</p>
        </div>
      ) : (
        <ol className="flex flex-col">
          {history.map((entry, index) => {
            const isWin = entry.amount > 0;
            return (
              <li
                key={entry.id}
                style={{ animationDelay: `${300 + index * 110}ms` }}
                className="zen-rise group/line relative flex min-w-0 items-center gap-3 border-dashed border-fg/12 py-3 not-first:border-t"
              >
                <Pebble
                  className={cx(
                    'grid size-10 shrink-0 place-items-center transition-transform duration-300 group-hover/line:-rotate-12 motion-reduce:transition-none',
                    isWin ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/[0.06] text-fg-subtle ring-1 ring-fg/10',
                  )}
                >
                  <Icon name={isWin ? 'gift' : 'close'} size={14} />
                </Pebble>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-bold tracking-wider text-fg">{entry.id}</p>
                  <p className="flex items-center gap-1 truncate text-[11px] text-fg-subtle">
                    <Icon name="calendar" size={11} className="shrink-0" />
                    {formatDate(entry.scratchedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cx('text-sm font-semibold tabular-nums', isWin ? 'text-fg' : 'text-fg-muted')}>{formatMoney(entry.amount, currency)}</span>
                  <span
                    className={cx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1',
                      isWin ? 'bg-success-soft text-success ring-success/30' : 'bg-fg/[0.05] text-fg-subtle ring-fg/10',
                    )}
                  >
                    <span aria-hidden="true" className={cx('size-1.5 rounded-full', isWin ? 'bg-success' : 'bg-fg-subtle')} />
                    {isWin ? translate('scratch.statusCredited') : translate('scratch.statusNoWin')}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className={cx('zen-glint relative isolate mt-auto flex items-center justify-between gap-3 rounded-[20px_26px_22px_28px] bg-(--hero-buy) px-5 py-3.5', emberInk)}>
        <RakedSand className="text-white" opacity={0.3} />
        <span className="text-[11px] font-bold tracking-[0.16em] uppercase">{translate('scratch.totalWon')}</span>
        <span className="text-xl font-bold tracking-[-0.02em] tabular-nums">{formatMoney(totalWon, currency)}</span>
      </p>
    </section>
  );
}

export default function ScratchCardPage() {
  const { data, isLoading } = useScratchCard();
  const [sessionWins, setSessionWins] = useState<ScratchHistoryEntry[]>([]);
  const [activeCard, setActiveCard] = useState<ScratchCardItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[26rem] rounded-[30px]" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-[28px]" />
          <Skeleton className="h-56 rounded-[28px]" />
        </div>
      </div>
    );
  }

  const { currency } = data;
  const history = [...sessionWins, ...data.history];
  const totalWon = data.totalWon + sessionWins.reduce((sum, entry) => sum + entry.amount, 0);

  const sessionById = new Map(sessionWins.map((entry) => [entry.id, entry]));
  const lockedCards = data.cards.filter((card) => card.state === 'locked');
  const handCards: HandCard[] = [
    ...data.cards.filter((card) => card.state === 'ready' && !sessionById.has(card.id)).map((card): HandCard => ({ kind: 'ready', card })),
    ...data.cards.flatMap((card): HandCard[] => {
      const entry = sessionById.get(card.id);
      return entry ? [{ kind: 'revealed', card, entry }] : [];
    }),
    ...lockedCards.map((card): HandCard => ({ kind: 'locked', card })),
  ];
  const featured = handCards.find((item) => item.card.id === selectedId) ?? handCards[0];
  const readyCount = handCards.filter((item) => item.kind === 'ready').length;
  const nextLockedCard = lockedCards.reduce<ScratchCardItem | undefined>(
    (soonest, card) => (!soonest || card.unlocksInSeconds < soonest.unlocksInSeconds ? card : soonest),
    undefined,
  );

  function handleReveal(card: ScratchCardItem) {
    setSessionWins((current) => [{ id: card.id, scratchedAt: new Date().toISOString(), amount: card.reward }, ...current]);
  }

  // Aurora scratch card "zen sand garden": the picked card as a raked sand tray on the left, the title, stone plaques
  // and the deck as a stepping-stone path on the right; an hourglass and a raked dish as instruments; then a cairn of
  // leaders beside the pebble ledger.
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section aria-labelledby="scratch-title" className={cx(boardCard, 'zen-rise relative isolate overflow-hidden p-5 sm:p-7')}>
        <FallingLeaves />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-center">
          {featured && <FeaturedCard item={featured} currency={currency} onOpen={setActiveCard} />}

          <div className="flex min-w-0 flex-col gap-7">
            <div>
              <p className={cx(captionClass, 'flex items-center gap-2')}>
                <Pebble className="size-2.5 bg-(--hero-buy)" />
                {translate('scratch.rewardsEyebrow')}
              </p>
              <h2 id="scratch-title" className="mt-2 text-4xl font-light tracking-[-0.04em] text-fg sm:text-5xl">
                {translate('scratch.cardsTitle')}
              </h2>
              <p className="mt-2 max-w-md text-sm text-fg-muted">{translate('scratch.cardsText')}</p>
            </div>

            <Scoreboard totalWon={totalWon} entries={history.length} currency={currency} />

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-(--hero-buy) px-3 py-1 text-xs font-bold tabular-nums', emberInk)}>
                  <Icon name="gift" size={12} />
                  {readyCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-3 py-1 text-xs font-semibold text-fg-muted ring-1 ring-fg/10 tabular-nums">
                  <Icon name="lock" size={12} />
                  {lockedCards.length}
                </span>
                <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-fg/12" />
              </div>
              <ul aria-label={translate('scratch.cardsTitle')} className="-mx-1 flex gap-5 overflow-x-auto px-1 pt-3 pb-3">
                {handCards.map((item, index) => (
                  <DeckTile
                    key={item.card.id}
                    item={item}
                    currency={currency}
                    index={index}
                    isLast={index === handCards.length - 1}
                    isSelected={featured?.card.id === item.card.id}
                    onSelect={() => setSelectedId(item.card.id)}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="scratch-stats-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id="scratch-stats-title" className="text-sm font-semibold text-fg">
            {translate('scratch.statsTitle')}
          </h3>
          <p className="text-xs text-fg-muted">{translate('scratch.statsText')}</p>
        </div>
        <div className={cx('grid gap-4', nextLockedCard && 'lg:grid-cols-2')}>
          {nextLockedCard && <NextCardTimer seconds={nextLockedCard.unlocksInSeconds} />}
          <LotsGauge accumulated={data.lotsAccumulated} target={data.lotsTarget} currency={currency} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-stretch">
        <section className={cx(boardCard, 'zen-rise p-5 [animation-delay:100ms] sm:p-6')}>
          <PanelHead
            icon="trophy"
            title={translate('scratch.leaderboardTitle')}
            description={translate('scratch.leaderboardText')}
            aside={
              <span className="rounded-full bg-fg/[0.06] px-2.5 py-1 text-xs font-semibold text-fg ring-1 ring-fg/10">{translate('scratch.entries', { count: data.leaders.length })}</span>
            }
          />
          <Leaderboard leaders={data.leaders} currency={currency} />
        </section>

        <ScratchHistory history={history} totalWon={totalWon} currency={currency} />
      </div>

      <ScratchDialog card={activeCard} currency={currency} onRevealed={handleReveal} onClose={() => setActiveCard(null)} />
    </div>
  );
}
