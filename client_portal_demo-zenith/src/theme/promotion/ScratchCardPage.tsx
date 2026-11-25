'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useScratchCard, type ScratchCardItem, type ScratchHistoryEntry, type ScratchLeader } from '@/core/pages/useScratchCard';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { ScratchDialog, useAnimatedNumber } from './ScratchExperience';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const COUNT_UP_MS = 1200;
// One capsule per second of the current minute on the timer's track.
const SECOND_TICKS = Array.from({ length: SECONDS_PER_MINUTE }, (_, index) => index);
const GAUGE_MILESTONES = [25, 50, 75];

// Lots gauge: a semicircle of ticks from 180° (left) to 0° (right) round the centre (100, 100).
const GAUGE_TICKS = 40;
const GAUGE_CENTER = 100;
const GAUGE_INNER = 70;
const GAUGE_OUTER = 88;
const GAUGE_MILESTONE_INNER = 62;

// Scratch window coating: a dot matrix that blinks out of step, delays fixed so server and client render the same.
const COATING_COLUMNS = 14;
const COATING_ROWS = 6;
const COATING_DOTS = Array.from({ length: COATING_COLUMNS * COATING_ROWS }, (_, index) => ({ index, delay: (index * 137) % 1800 }));

// Top three stand as capsules: #2 left, #1 in the middle, #3 right; a tiny share still shows a visible fill.
const PODIUM_ORDER = [1, 0, 2];
const MIN_COLUMN_FILL = 18;
const MIN_TRACK_FILL = 6;

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const emberInk = 'text-[#160904]';
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

function WaveLines({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[200%]">
      {WAVE_PATHS.map((path) => (
        <path key={path} d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
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
      <span className={cx('grid size-10 shrink-0 place-items-center rounded-full bg-(--hero-buy)', emberInk)}>
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {aside}
    </header>
  );
}

/** The scratch window of the featured card: a blinking dot-matrix coating while ready, a lock while locked, the result once revealed. */
function ScratchWindow({ item, currency }: { item: HandCard; currency: string }) {
  if (item.kind === 'locked') {
    return (
      <div className="relative isolate grid h-full place-items-center overflow-hidden rounded-[24px] bg-fg/[0.04] p-5 text-center ring-1 ring-fg/10 ring-inset">
        <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(var(--color-line-strong)_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="flex flex-col items-center gap-3">
          <span className="relative grid size-14 place-items-center rounded-full bg-fg/[0.08] text-fg ring-1 ring-fg/15">
            <span aria-hidden="true" className="absolute -inset-1.5 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
            <Icon name="lock" size={20} />
          </span>
          <span className={captionClass}>{translate('scratch.locked')}</span>
          <TicketClock seconds={item.card.unlocksInSeconds} className="text-2xl text-fg sm:text-3xl" />
        </div>
      </div>
    );
  }

  if (item.kind === 'revealed') {
    const isWin = item.entry.amount > 0;
    return (
      <div className="relative isolate grid h-full animate-pop-in place-items-center overflow-hidden rounded-[24px] bg-[#160904]/85 p-5 text-center motion-reduce:animate-none">
        <div className="flex flex-col items-center gap-2">
          <span className={cx('grid size-12 place-items-center rounded-full', isWin ? cx('bg-(--hero-buy)', emberInk) : 'bg-white/10 text-white/60')}>
            <Icon name={isWin ? 'check' : 'close'} size={20} />
          </span>
          <span className="text-[10.5px] font-semibold tracking-[0.14em] text-white/55 uppercase">{translate('scratch.revealedLabel')}</span>
          <span className={cx('text-4xl font-light tracking-[-0.04em] tabular-nums', isWin ? 'text-white' : 'text-white/60')}>
            {isWin ? formatMoney(item.entry.amount, currency) : translate('scratch.statusNoWin')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate grid h-full place-items-center overflow-hidden rounded-[24px] bg-[#160904]/90 p-4 text-center">
      <span
        aria-hidden="true"
        className="absolute inset-3 -z-10 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${COATING_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${COATING_ROWS}, minmax(0, 1fr))` }}
      >
        {COATING_DOTS.map((dot) => (
          <span key={dot.index} className="zenith-blink m-auto size-1.5 rounded-full bg-(--hero-buy)" style={{ animationDelay: `${dot.delay}ms` }} />
        ))}
      </span>
      {/* A light bar scanning across the coating, hinting where to scratch. */}
      <span aria-hidden="true" className="zenith-scan-x pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/4 bg-linear-to-r from-transparent via-white/15 to-transparent" />
      <div className="flex flex-col items-center gap-3">
        <span className={cx('relative grid size-16 animate-float place-items-center rounded-full bg-(--hero-buy) [animation-duration:3s] motion-reduce:animate-none', emberInk)}>
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy)/40 motion-reduce:hidden" />
          <Icon name="gift" size={24} className="relative" />
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">{translate('scratch.scratchHere')}</span>
      </div>
    </div>
  );
}

/** The selected card: an ember card (graphite while locked) with drifting waves, its id, the scratch window and the open action. */
function FeaturedCard({ item, currency, onOpen }: { item: HandCard; currency: string; onOpen: (card: ScratchCardItem) => void }) {
  const isLocked = item.kind === 'locked';

  return (
    <article
      key={item.card.id}
      className={cx(
        'relative isolate flex animate-pop-in flex-col gap-4 overflow-hidden rounded-[30px] p-4 motion-reduce:animate-none sm:p-5',
        isLocked ? 'bg-fg/[0.04] text-fg ring-1 ring-fg/10' : cx('bg-(--hero-buy)', emberInk),
      )}
    >
      {!isLocked && <WaveLines color="white" opacity={0.4} />}
      <div className="flex items-center justify-between gap-3">
        <p className={cx('text-[10.5px] font-semibold tracking-[0.14em] uppercase', isLocked ? 'text-fg-subtle' : 'opacity-70')}>{translate('scratch.rewardsEyebrow')}</p>
        <span className={cx('rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em]', isLocked ? 'bg-fg/[0.08] text-fg' : 'bg-[#160904] text-(--hero-buy)')}>{item.card.id}</span>
      </div>

      <div className="h-56 sm:h-60">
        <ScratchWindow item={item} currency={currency} />
      </div>

      {item.kind === 'ready' && (
        <button
          type="button"
          onClick={() => onOpen(item.card)}
          aria-label={translate('scratch.openCard')}
          className="group/open inline-flex h-12 items-center justify-between gap-2 rounded-full bg-[#160904] pr-2 pl-6 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#160904] motion-reduce:transition-none"
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

/** Total won and history entries as two open counters that count up. */
function Scoreboard({ totalWon, entries, currency }: { totalWon: number; entries: number; currency: string }) {
  const shownWon = useAnimatedNumber(totalWon, COUNT_UP_MS);
  const shownEntries = useAnimatedNumber(entries, COUNT_UP_MS);

  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-1.5')}>
          <Icon name="wallet" size={12} />
          {translate('scratch.totalWon')}
        </p>
        <p className="mt-2 truncate text-5xl leading-none font-light tracking-[-0.04em] text-fg tabular-nums sm:text-6xl">{formatMoney(shownWon, currency)}</p>
        <p className="mt-2 text-xs text-fg-muted">{translate('scratch.allTime')}</p>
      </div>
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-1.5')}>
          <Icon name="history" size={12} />
          {translate('scratch.historyEntries')}
        </p>
        <p className="mt-2 text-3xl leading-none font-light tracking-[-0.03em] text-fg tabular-nums">
          {String(Math.round(shownEntries)).padStart(2, '0')}
        </p>
        <p className="mt-2 text-xs text-fg-muted">{translate('scratch.redemptions')}</p>
      </div>
    </div>
  );
}

/** The whole deck as a pixel row: ember = ready, white = won, dim = no win, dashed = locked; picking a pixel's card features it. */
function DeckTile({ item, currency, isSelected, index, onSelect }: { item: HandCard; currency: string; isSelected: boolean; index: number; onSelect: () => void }) {
  const isWin = item.kind === 'revealed' && item.entry.amount > 0;

  return (
    <li style={{ animationDelay: `${200 + index * 80}ms` }} className="zenith-tile shrink-0">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={cx(
          'group/deck relative isolate flex h-36 w-28 flex-col justify-between overflow-hidden rounded-[22px] p-3 text-left transition-[translate,box-shadow] duration-300 motion-reduce:transition-none',
          focusRing,
          item.kind === 'ready' && cx('bg-(--hero-buy)', emberInk),
          item.kind === 'revealed' && 'bg-fg/[0.05] text-fg ring-1 ring-fg/10',
          item.kind === 'locked' && 'border border-dashed border-fg/20 text-fg',
          isSelected ? '-translate-y-2 ring-2 ring-fg ring-offset-2 ring-offset-(--color-app)' : 'hover:-translate-y-1',
        )}
      >
        {item.kind === 'ready' && <WaveLines color="white" opacity={0.35} />}
        <span className={cx('font-mono text-[10px] font-bold tracking-[0.12em]', item.kind === 'ready' ? 'opacity-70' : 'text-fg-subtle')}>{item.card.id}</span>

        <span className="flex flex-col gap-1.5">
          {item.kind === 'ready' && (
            <>
              <span
                className="grid size-9 animate-float place-items-center rounded-full bg-[#160904] text-(--hero-buy) [animation-duration:3s] motion-reduce:animate-none"
                style={{ animationDelay: `${index * 300}ms` }}
              >
                <Icon name="gift" size={15} />
              </span>
              <span className="text-xs font-bold">{translate('scratch.tapToScratch')}</span>
            </>
          )}
          {item.kind === 'locked' && (
            <>
              <span className="grid size-9 place-items-center rounded-full bg-fg/[0.06] text-fg-muted ring-1 ring-fg/10">
                <Icon name="lock" size={14} />
              </span>
              <span className={captionClass}>{translate('scratch.locked')}</span>
              <TicketClock seconds={item.card.unlocksInSeconds} className="text-xs text-fg" />
            </>
          )}
          {item.kind === 'revealed' && (
            <>
              <span className={cx('grid size-9 place-items-center rounded-full', isWin ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/[0.06] text-fg-subtle ring-1 ring-fg/10')}>
                <Icon name={isWin ? 'check' : 'close'} size={14} />
              </span>
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

/** Next-card countdown as three capsule digits, with a track of the current minute's seconds draining one capsule at a time. */
function NextCardTimer({ seconds }: { seconds: number }) {
  const remaining = useCountdown(seconds);
  const [hours, minutes, secondsPart] = clockParts(remaining);
  const secondsLeft = Number(secondsPart);
  const tiles = [
    { key: 'hours', value: hours, label: translate('scratch.hours') },
    { key: 'minutes', value: minutes, label: translate('scratch.minutes') },
    { key: 'seconds', value: secondsPart, label: translate('scratch.seconds') },
  ];

  return (
    <div className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 [animation-delay:120ms]')}>
      <p className={cx(captionClass, 'flex items-center gap-1.5')}>
        <Icon name="lock" size={12} />
        {translate('scratch.nextCardLabel')}
      </p>
      <p className="sr-only">{translate('scratch.nextCardIn', { time: [hours, minutes, secondsPart].join(':') })}</p>

      <div aria-hidden="true" className="grid grid-cols-3 gap-2">
        {tiles.map((tile, index) => (
          <div key={tile.key} className="flex min-w-0 flex-col items-center gap-2">
            <span
              className={cx(
                'relative grid h-16 w-full place-items-center overflow-hidden rounded-full',
                index === tiles.length - 1 ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/[0.06] text-fg ring-1 ring-fg/10',
              )}
            >
              <span key={tile.value} className="animate-tick-rise font-mono text-3xl font-bold tabular-nums motion-reduce:animate-none">
                {tile.value}
              </span>
            </span>
            <span className="text-[9px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">{tile.label}</span>
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="flex h-7 items-end gap-[2px]">
        {SECOND_TICKS.map((tick) => {
          const isLit = tick < secondsLeft;
          const isHead = tick === secondsLeft - 1;
          return (
            <span
              key={tick}
              className={cx(
                'flex-1 rounded-full transition-[height,background-color] duration-500 motion-reduce:transition-none',
                isHead ? 'h-7 animate-blink bg-fg motion-reduce:animate-none' : isLit ? cx('bg-(--hero-buy)', tick % 15 === 0 ? 'h-6' : 'h-4') : 'h-2 bg-fg/[0.08]',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Lots accumulated as a semicircle tick gauge: ticks light up to the share, longer ticks mark each quarter. */
function LotsGauge({ accumulated, target, currency }: { accumulated: number; target: number; currency: string }) {
  const share = target > 0 ? Math.min(100, (accumulated / target) * 100) : 0;
  const shown = useEntrance(share);
  const litTicks = Math.round((shown / 100) * GAUGE_TICKS);
  const milestoneTicks = new Set(GAUGE_MILESTONES.map((milestone) => Math.round((milestone / 100) * (GAUGE_TICKS - 1))));

  return (
    <div className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-3 p-5 [animation-delay:200ms]')}>
      <p className={cx(captionClass, 'flex items-center gap-1.5')}>
        <Icon name="gift" size={12} />
        {translate('scratch.lotsAccumulated')}
      </p>
      <div
        role="progressbar"
        aria-label={translate('scratch.lotsAccumulated')}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative mx-auto w-full max-w-[260px]"
      >
        <svg viewBox="0 0 200 110" aria-hidden="true" className="w-full overflow-visible">
          {Array.from({ length: GAUGE_TICKS }, (_, tick) => {
            const angle = Math.PI - (tick / (GAUGE_TICKS - 1)) * Math.PI;
            const inner = milestoneTicks.has(tick) ? GAUGE_MILESTONE_INNER : GAUGE_INNER;
            const isLit = tick < litTicks;
            return (
              <line
                key={tick}
                x1={GAUGE_CENTER + inner * Math.cos(angle)}
                y1={GAUGE_CENTER - inner * Math.sin(angle)}
                x2={GAUGE_CENTER + GAUGE_OUTER * Math.cos(angle)}
                y2={GAUGE_CENTER - GAUGE_OUTER * Math.sin(angle)}
                strokeWidth={3}
                strokeLinecap="round"
                style={{ animationDelay: `${tick * 25}ms`, transitionDelay: `${tick * 20}ms` }}
                className={cx('zenith-tick transition-[stroke] duration-300', isLit ? 'stroke-(--hero-buy)' : 'stroke-fg/12')}
              />
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-3xl font-light tracking-[-0.03em] text-fg tabular-nums">{Math.round(share)}%</span>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-fg tabular-nums">{formatMoney(accumulated, currency)}</p>
          <p className="truncate text-xs text-fg-subtle tabular-nums">/ {formatMoney(target, currency)}</p>
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-2.5 py-1 text-[11px] text-fg-muted ring-1 ring-fg/10">
          <Icon name="arrowRight" size={11} />
          {translate('scratch.towardNext')}
        </p>
      </div>
    </div>
  );
}

/** One of the top three as a vertical capsule filled to its share of the leader, with the initial riding on the fill. */
function LeaderColumn({ leader, share, place, currency }: { leader: ScratchLeader; share: number; place: number; currency: string }) {
  const isFirst = place === 0;
  const fill = Math.max(share, MIN_COLUMN_FILL);

  return (
    <li className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        role="meter"
        aria-label={translate('scratch.shareOfLeader', { name: leader.name })}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cx('relative flex w-full max-w-[92px] items-end rounded-full bg-fg/[0.05] p-1.5 ring-1 ring-fg/[0.08]', isFirst ? 'h-60' : 'h-52')}
      >
        {isFirst && (
          <span aria-hidden="true" className="absolute -top-8 left-1/2 -translate-x-1/2 animate-float text-(--hero-buy) [animation-duration:2.4s] motion-reduce:animate-none">
            <Icon name="trophy" size={20} />
          </span>
        )}
        <span
          aria-hidden="true"
          style={{ height: `${fill}%`, animationDelay: `${300 + place * 160}ms` }}
          className={cx(
            'zenith-rise relative isolate flex w-full flex-col items-center overflow-hidden rounded-full pt-1.5',
            isFirst ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/20 text-fg',
          )}
        >
          {isFirst && <WaveLines color="white" opacity={0.4} />}
          <span className={cx('grid size-11 shrink-0 place-items-center rounded-full text-base font-bold', isFirst ? 'bg-[#160904] text-(--hero-buy)' : 'bg-surface text-fg ring-1 ring-fg/15')}>
            {initialOf(leader.name)}
          </span>
          <span className="mt-auto pb-3 font-mono text-[11px] font-bold tabular-nums">{Math.round(share)}%</span>
        </span>
      </div>
      <span className={cx('mt-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums', isFirst ? cx('bg-(--hero-buy)', emberInk) : 'border border-dashed border-fg/20 text-fg-subtle')}>
        <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
        <span aria-hidden="true">#{String(leader.rank).padStart(2, '0')}</span>
      </span>
      <p className="max-w-full truncate text-sm font-semibold text-fg">{leader.name}</p>
      <p className="text-sm font-semibold text-success tabular-nums">{formatMoney(leader.amount, currency)}</p>
    </li>
  );
}

/** Everyone after the top three: rank, initial, name and amount over a capsule track filled to their share of the leader. */
function LeaderTrack({ leader, share, currency, index }: { leader: ScratchLeader; share: number; currency: string; index: number }) {
  const shown = useEntrance(share);

  return (
    <li style={{ animationDelay: `${700 + index * 90}ms` }} className="zenith-tile flex min-w-0 flex-col gap-2 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-7 shrink-0 font-mono text-sm font-bold text-fg-subtle tabular-nums">
          <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
          <span aria-hidden="true">{String(leader.rank).padStart(2, '0')}</span>
        </span>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-xs font-bold text-fg ring-1 ring-fg/10">
          {initialOf(leader.name)}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{leader.name}</p>
        <span className="shrink-0 text-sm font-semibold text-success tabular-nums">{formatMoney(leader.amount, currency)}</span>
      </div>
      <div
        role="meter"
        aria-label={translate('scratch.shareOfLeader', { name: leader.name })}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="ml-10 h-2 overflow-hidden rounded-full bg-fg/[0.07]"
      >
        <span
          className="block h-full rounded-full bg-(--hero-buy)/60 transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
          style={{ width: `${shown > 0 ? Math.max(shown, MIN_TRACK_FILL) : 0}%` }}
        />
      </div>
    </li>
  );
}

/** Top three as rising capsules (#1 in the middle), everyone after as capsule tracks. */
function Leaderboard({ leaders, currency }: { leaders: ScratchLeader[]; currency: string }) {
  const ranked = [...leaders].sort((a, b) => a.rank - b.rank);
  const top = Math.max(0, ...ranked.map((leader) => leader.amount));
  const shareOf = (leader: ScratchLeader) => (top > 0 ? (leader.amount / top) * 100 : 0);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="flex flex-col gap-5 pt-8">
      {podium.length > 0 && (
        <ol className="grid grid-cols-3 items-end gap-3 sm:gap-5">
          {PODIUM_ORDER.filter((place) => place < podium.length).map((place) => (
            <LeaderColumn key={podium[place].rank} leader={podium[place]} share={shareOf(podium[place])} place={place} currency={currency} />
          ))}
        </ol>
      )}
      {rest.length > 0 && (
        <ol className="flex flex-col divide-y divide-dashed divide-fg/10 border-t border-dashed border-fg/10">
          {rest.map((leader, index) => (
            <LeaderTrack key={leader.rank} leader={leader} share={shareOf(leader)} currency={currency} index={index} />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Scratch results as a ledger, newest first, totalled in an ember capsule at the bottom; empty, it waits for its first line. */
function ScratchHistory({ history, totalWon, currency }: { history: ScratchHistoryEntry[]; totalWon: number; currency: string }) {
  return (
    <section aria-labelledby="scratch-history-title" className={cx(boardCard, 'zenith-tile flex flex-col gap-5 p-5 [animation-delay:150ms] sm:p-6')}>
      <header className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg ring-1 ring-fg/10">
          <Icon name="history" size={17} />
        </span>
        <h2 id="scratch-history-title" className="min-w-0 flex-1 truncate text-base font-semibold text-fg">
          {translate('scratch.historyTitle')}
        </h2>
        <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 font-mono text-xs font-bold text-fg ring-1 ring-fg/10 tabular-nums">{String(history.length).padStart(2, '0')}</span>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-col items-center rounded-[22px] border border-dashed border-fg/15 px-4 py-10 text-center">
          <span aria-hidden="true" className={cx('relative mb-4 grid size-16 place-items-center rounded-full bg-(--hero-buy)', emberInk)}>
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy)/30 motion-reduce:hidden" />
            <Icon name="gift" size={22} className="relative" />
          </span>
          <p className="text-base font-semibold text-fg">{translate('scratch.emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">{translate('scratch.emptyText')}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {history.map((entry, index) => {
            const isWin = entry.amount > 0;
            return (
              <li
                key={entry.id}
                style={{ animationDelay: `${300 + index * 110}ms` }}
                className="group/line flex min-w-0 animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-2 pr-4 pl-2 ring-1 ring-fg/[0.07] transition-colors hover:bg-fg/[0.06] motion-reduce:animate-none"
              >
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', isWin ? cx('bg-(--hero-buy)', emberInk) : 'bg-fg/[0.06] text-fg-subtle')}>
                  <Icon name={isWin ? 'gift' : 'close'} size={14} />
                </span>
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

      <p className={cx('relative isolate mt-auto flex items-center justify-between gap-3 overflow-hidden rounded-full bg-(--hero-buy) py-3 pr-5 pl-5', emberInk)}>
        <WaveLines color="white" opacity={0.4} />
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

  // Zenith scratch card: one stage board (open totals + the whole deck on the left, the picked card on the right),
  // the timer and lots gauge as instruments, then rising leader capsules beside the history ledger.
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section aria-labelledby="scratch-title" className={cx(boardCard, 'zenith-tile relative isolate overflow-hidden p-5 sm:p-7')}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:items-center">
          <div className="flex min-w-0 flex-col gap-7">
            <div>
              <p className={cx(captionClass, 'flex items-center gap-2')}>
                <span aria-hidden="true" className="h-px w-8 bg-(--hero-buy)" />
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
              <ul aria-label={translate('scratch.cardsTitle')} className="-mx-1 flex gap-3 overflow-x-auto px-1 pt-3 pb-3">
                {handCards.map((item, index) => (
                  <DeckTile
                    key={item.card.id}
                    item={item}
                    currency={currency}
                    index={index}
                    isSelected={featured?.card.id === item.card.id}
                    onSelect={() => setSelectedId(item.card.id)}
                  />
                ))}
              </ul>
            </div>
          </div>

          {featured && <FeaturedCard item={featured} currency={currency} onOpen={setActiveCard} />}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:items-stretch">
        <section className={cx(boardCard, 'zenith-tile p-5 [animation-delay:100ms] sm:p-6')}>
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
