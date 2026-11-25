'use client';

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useScratchCard, type ScratchCardItem, type ScratchHistoryEntry, type ScratchLeader } from '@/core/pages/useScratchCard';
import { cx } from '../lib/cx';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { ScratchDialog, useAnimatedNumber } from './ScratchExperience';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const HOURS_PER_DAY = 24;
// One tick mark per minute of the dial face.
const DIAL_TICKS = Array.from({ length: 60 }, (_, index) => index);
const COUNT_UP_MS = 1200;
// Each card in the hand turns this much further from the centre and sits this much lower, like a fanned hand.
const FAN_STEP_DEG = 9;
const FAN_DROP_PX = 18;
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const cardSizeClass = 'relative aspect-[3/4] w-28 overflow-hidden rounded-[22px] sm:w-40 lg:w-48';

// Fixed sparkle spots (percent of the card) so the foil renders the same on server and client.
const foilSparkles = [
  { top: 14, left: 20, delay: 0 },
  { top: 26, left: 78, delay: 900 },
  { top: 56, left: 12, delay: 1500 },
  { top: 70, left: 84, delay: 500 },
  { top: 90, left: 44, delay: 1200 },
];

const medalClass: Record<number, string> = {
  1: 'text-on-primary [background-image:var(--brand-gradient)]',
  2: 'bg-fg-muted text-surface',
  3: 'bg-warning text-surface',
};

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

function initialOf(name: string): string {
  return name.charAt(0).toUpperCase();
}

type HandCard =
  | { kind: 'ready'; card: ScratchCardItem }
  | { kind: 'revealed'; card: ScratchCardItem; entry: ScratchHistoryEntry }
  | { kind: 'locked'; card: ScratchCardItem };

/** Unscratched card: violet foil with drifting stripes, a sheen, twinkling sparkles and a gift that winks on hover. */
function ReadyFace({ card, onOpen }: { card: ScratchCardItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={translate('scratch.openCard')}
      className={cx(
        cardSizeClass,
        'group/card flex flex-col items-center justify-between p-3 text-on-primary shadow-[0_28px_50px_-24px_var(--brand-primary)] ring-1 ring-white/25 [background-image:var(--brand-gradient)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-4',
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.2)_0_2px,transparent_2px_12px)]" />
      <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
      {foilSparkles.map((sparkle) => (
        <span
          key={`${sparkle.top}-${sparkle.left}`}
          aria-hidden="true"
          style={{ top: `${sparkle.top}%`, left: `${sparkle.left}%`, animationDelay: `${sparkle.delay}ms` }}
          className="absolute size-1 animate-twinkle rounded-full bg-white shadow-[0_0_6px_white] motion-reduce:animate-none"
        />
      ))}

      <span className="relative self-start font-mono text-[10px] font-semibold tracking-[0.12em] opacity-80">{card.id}</span>

      <span className="relative grid size-14 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur transition-transform duration-500 group-hover/card:scale-110 group-hover/card:rotate-12 motion-reduce:transition-none sm:size-16">
        <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-white/25 motion-reduce:hidden" />
        <Icon name="gift" size={24} />
      </span>

      <span className="relative flex w-full flex-col items-center gap-2">
        <span className="hidden rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium tracking-wide sm:inline">{translate('scratch.scratchHere')}</span>
        <span className="flex w-full items-center justify-center gap-1 rounded-full bg-white/90 py-1.5 text-[11px] font-semibold text-primary transition-colors group-hover/card:bg-white sm:text-xs">
          {translate('scratch.tapToScratch')}
          <Icon name="arrowRight" size={12} className="transition-transform duration-300 group-hover/card:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </span>
    </button>
  );
}

/** Locked card: frosted dot-grid face with a ring that drains as the unlock nears and a satellite circling the lock. */
function LockedFace({ card }: { card: ScratchCardItem }) {
  const remaining = useCountdown(card.unlocksInSeconds);
  const [hours, minutes, seconds] = clockParts(remaining);
  const fraction = card.unlocksInSeconds > 0 ? remaining / card.unlocksInSeconds : 0;

  return (
    <div className={cx(cardSizeClass, 'flex flex-col items-center justify-between border border-dashed border-line-strong bg-surface-2/80 p-3 backdrop-blur sm:p-4')}>
      <span aria-hidden="true" className="absolute inset-0 opacity-60 [background-image:radial-gradient(color-mix(in_srgb,var(--brand-primary)_22%,transparent)_1px,transparent_1px)] [background-size:12px_12px]" />
      <span className="relative self-start font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-subtle">{card.id}</span>

      <span aria-hidden="true" className="relative grid size-16 place-items-center sm:size-20">
        <svg viewBox="0 0 72 72" className="absolute inset-0 size-full -rotate-90">
          <circle cx="36" cy="36" r={RING_RADIUS} fill="none" strokeWidth="3" className="stroke-line" />
          <circle
            cx="36"
            cy="36"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
            className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 animate-orbit-spin-fast motion-reduce:animate-none">
          <span className="absolute top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
        </span>
        <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary sm:size-11">
          <Icon name="lock" size={17} />
        </span>
      </span>

      <span className="relative flex flex-col items-center gap-1.5">
        <span className={cx(captionClass, 'flex items-center gap-1.5')}>
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
          {translate('scratch.locked')}
        </span>
        <span className="sr-only"> {translate('scratch.nextCardIn', { time: [hours, minutes, seconds].join(':') })}</span>
        <span
          aria-hidden="true"
          className="inline-flex items-center rounded-full bg-primary-soft px-2 py-1 font-mono text-[11px] font-bold text-fg tabular-nums ring-1 ring-primary/30 shadow-[0_0_16px_-6px_var(--brand-primary)] backdrop-blur sm:px-2.5 sm:text-xs"
        >
          {hours}
          <span className="animate-blink px-px text-primary motion-reduce:animate-none">:</span>
          {minutes}
          <span className="animate-blink px-px text-primary motion-reduce:animate-none">:</span>
          <span key={seconds} className="inline-block animate-tick-rise text-primary motion-reduce:animate-none">
            {seconds}
          </span>
        </span>
      </span>
    </div>
  );
}

/** A card scratched this session: a glowing rim spins round it, the result sits in the middle. */
function RevealedFace({ card, entry, currency }: { card: ScratchCardItem; entry: ScratchHistoryEntry; currency: string }) {
  const isWin = entry.amount > 0;

  return (
    <div className={cx(cardSizeClass, 'animate-pop-in motion-reduce:animate-none', isWin && 'shadow-[0_0_44px_-14px_var(--brand-primary)]')}>
      <span
        aria-hidden="true"
        className={cx(
          'absolute -inset-1/2 animate-orbit-spin-fast motion-reduce:animate-none',
          isWin ? '[background-image:conic-gradient(var(--brand-primary),transparent_35%,var(--orbit-violet)_65%,transparent)]' : 'bg-line',
        )}
      />
      <div className="absolute inset-[2px] flex flex-col items-center justify-center gap-2 rounded-[20px] bg-surface p-3 text-center">
        <span className="absolute top-3 left-3 font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-subtle">{card.id}</span>
        <span className={cx('grid size-11 place-items-center rounded-full', isWin ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-fg-subtle ring-1 ring-line')}>
          <Icon name={isWin ? 'check' : 'close'} size={18} />
        </span>
        <span className={captionClass}>{translate('scratch.revealedLabel')}</span>
        <span className={cx('text-lg font-black tabular-nums sm:text-2xl', isWin ? 'orbit-text' : 'text-fg-muted')}>
          {isWin ? formatMoney(entry.amount, currency) : translate('scratch.statusNoWin')}
        </span>
      </div>
    </div>
  );
}

/** All cards as one fanned hand on a lit table; hovering a card straightens and lifts it out of the fan. */
function CardHand({ cards, currency, onOpen }: { cards: HandCard[]; currency: string; onOpen: (card: ScratchCardItem) => void }) {
  const middle = (cards.length - 1) / 2;

  return (
    <div className="relative flex justify-center pt-4 pb-10">
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute bottom-3 left-1/2 h-20 w-[min(36rem,92%)] -translate-x-1/2 [border-radius:100%]" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-16 w-[min(30rem,80%)] -translate-x-1/2 rounded-[100%] bg-primary/20 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-1/2 h-20 w-[min(36rem,92%)] -translate-x-1/2 overflow-hidden [border-radius:100%]">
        <span className="absolute top-1/2 left-0 h-px w-1/4 -translate-y-1/2 animate-comet bg-linear-to-r from-transparent via-primary to-transparent motion-reduce:hidden" />
      </span>

      <ul aria-label={translate('scratch.cardsTitle')} className="relative flex items-end">
        {cards.map((item, index) => {
          const offset = index - middle;
          const fan = { '--fan': `${offset * FAN_STEP_DEG}deg`, '--drop': `${Math.abs(offset) * FAN_DROP_PX}px` } as CSSProperties;
          return (
            <li key={item.card.id} style={{ animationDelay: `${150 + index * 120}ms` }} className="group/slot relative -mx-3 animate-rise hover:z-10 focus-within:z-10 motion-reduce:animate-none sm:-mx-4">
              <div
                style={fan}
                className="transition-transform duration-500 ease-out [transform:translateY(var(--drop))_rotate(var(--fan))] group-hover/slot:[transform:translateY(-16px)_rotate(0deg)_scale(1.05)] group-focus-within/slot:[transform:translateY(-16px)_rotate(0deg)_scale(1.05)] motion-reduce:transition-none"
              >
                {item.kind === 'ready' && (
                  <div style={{ animationDelay: `${index * 400}ms` }} className="animate-float [animation-duration:4s] motion-reduce:animate-none">
                    <ReadyFace card={item.card} onOpen={() => onOpen(item.card)} />
                  </div>
                )}
                {item.kind === 'revealed' && <RevealedFace card={item.card} entry={item.entry} currency={currency} />}
                {item.kind === 'locked' && <LockedFace card={item.card} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Total won and history entries side by side, both counting up. */
function Scoreboard({ totalWon, entries, currency }: { totalWon: number; entries: number; currency: string }) {
  const shownWon = useAnimatedNumber(totalWon, COUNT_UP_MS);
  const shownEntries = useAnimatedNumber(entries, COUNT_UP_MS);
  const stats: { key: string; icon: IconName; label: string; value: string; hint: string; isPrimary: boolean }[] = [
    { key: 'won', icon: 'wallet', label: translate('scratch.totalWon'), value: formatMoney(shownWon, currency), hint: translate('scratch.allTime'), isPrimary: true },
    { key: 'entries', icon: 'history', label: translate('scratch.historyEntries'), value: String(Math.round(shownEntries)), hint: translate('scratch.redemptions'), isPrimary: false },
  ];

  return (
    <ul className="grid grid-cols-2 divide-x divide-line overflow-hidden rounded-3xl bg-surface-2/50 ring-1 ring-line">
      {stats.map((stat) => (
        <li key={stat.key} className="group/stat relative flex min-w-0 items-center gap-3 p-4">
          <span
            className={cx(
              'grid size-10 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover/stat:-rotate-6 group-hover/stat:scale-110 motion-reduce:transition-none',
              stat.isPrimary ? 'text-on-primary shadow-[0_0_20px_-6px_var(--brand-primary)] [background-image:var(--brand-gradient)]' : 'bg-primary-soft text-primary',
            )}
          >
            <Icon name={stat.icon} size={17} />
          </span>
          <div className="min-w-0">
            <p className={captionClass}>{stat.label}</p>
            <p className={cx('truncate text-xl font-black tabular-nums sm:text-2xl', stat.isPrimary ? 'orbit-text' : 'text-fg')}>{stat.value}</p>
            <p className="text-[11px] text-fg-muted">{stat.hint}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Next-card countdown as split-flap tiles: each digit rolls in when it changes, the separators blink. */
function NextCardTimer({ seconds }: { seconds: number }) {
  const remaining = useCountdown(seconds);
  const [hours, minutes, secondsPart] = clockParts(remaining);
  const gradientId = useId();
  const rings = [
    { key: 'hours', radius: 34, width: 5, share: Math.min(1, Number(hours) / HOURS_PER_DAY), stroke: 'stroke-primary/60' },
    { key: 'minutes', radius: 45, width: 5, share: Number(minutes) / SECONDS_PER_MINUTE, stroke: '' },
    { key: 'seconds', radius: 55, width: 1.5, share: Number(secondsPart) / SECONDS_PER_MINUTE, stroke: 'stroke-fg/40' },
  ];
  const legend = [
    { key: 'hours', label: translate('scratch.hours'), value: hours, dot: 'bg-primary/60' },
    { key: 'minutes', label: translate('scratch.minutes'), value: minutes, dot: '[background-image:var(--brand-gradient)]' },
  ];

  return (
    <div className="shrink-0">
      <p className={cx(captionClass, 'flex items-center gap-1.5')}>
        <Icon name="lock" size={12} />
        {translate('scratch.nextCardLabel')}
      </p>
      <p className="sr-only">{translate('scratch.nextCardIn', { time: [hours, minutes, secondsPart].join(':') })}</p>

      <div aria-hidden="true" className="mt-3 flex items-center gap-4">
        <div className="relative grid size-32 shrink-0 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--brand-primary)' }} />
                <stop offset="100%" style={{ stopColor: 'var(--orbit-violet)' }} />
              </linearGradient>
            </defs>
            {DIAL_TICKS.map((tick) => (
              <line
                key={tick}
                x1="60"
                y1="1.5"
                x2="60"
                y2={tick % 15 === 0 ? 6 : 3.5}
                transform={`rotate(${tick * 6} 60 60)`}
                strokeWidth={tick % 15 === 0 ? 1.5 : 1}
                className={tick % 15 === 0 ? 'stroke-primary' : 'stroke-line-strong'}
              />
            ))}
            {rings.map((ring) => (
              <g key={ring.key}>
                <circle cx="60" cy="60" r={ring.radius} fill="none" strokeWidth={ring.width} className="stroke-line" />
                <circle
                  cx="60"
                  cy="60"
                  r={ring.radius}
                  fill="none"
                  strokeWidth={ring.width}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  strokeDashoffset={100 - ring.share * 100}
                  stroke={ring.key === 'minutes' ? `url(#${gradientId})` : undefined}
                  className={cx('transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none', ring.stroke)}
                />
              </g>
            ))}
          </svg>
          {/* The comet runs backwards one step per second, so it drains the dial the same way the time does. */}
          <span style={{ rotate: `${-remaining * 6}deg` }} className="absolute inset-[3px] transition-[rotate] duration-1000 ease-linear motion-reduce:transition-none">
            <span className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_var(--brand-primary),0_0_4px_white]" />
          </span>

          <span className="relative flex flex-col items-center leading-none">
            <span className="flex items-baseline font-mono text-xl font-black text-fg tabular-nums">
              <span key={`h-${hours}`} className="animate-tick-rise motion-reduce:animate-none">{hours}</span>
              <span className="animate-blink px-px text-primary motion-reduce:animate-none">:</span>
              <span key={`m-${minutes}`} className="animate-tick-rise motion-reduce:animate-none">{minutes}</span>
            </span>
            <span key={`s-${secondsPart}`} className="mt-1 animate-tick-rise font-mono text-xs font-bold text-primary tabular-nums motion-reduce:animate-none">
              {secondsPart}
            </span>
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {legend.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 rounded-xl bg-surface/60 px-3 py-1.5 ring-1 ring-line">
              <span className={cx('h-5 w-1 rounded-full', item.dot)} />
              <span className="font-mono text-base font-bold text-fg tabular-nums">{item.value}</span>
              <span className="text-[9px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Lots accumulated as a milestone road: a gradient fill with a glowing marker, ending at the next card. */
function LotsTrack({ accumulated, target, currency }: { accumulated: number; target: number; currency: string }) {
  const share = target > 0 ? Math.min(100, (accumulated / target) * 100) : 0;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={captionClass}>{translate('scratch.lotsAccumulated')}</p>
        <span className="text-xs text-fg-muted">{translate('scratch.towardNext')}</span>
      </div>
      <p className="mt-1 text-xl font-semibold text-fg tabular-nums">
        {formatMoney(accumulated, currency)}
        <span className="text-sm font-medium text-fg-subtle"> / {formatMoney(target, currency)}</span>
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={translate('scratch.lotsAccumulated')}
          aria-valuenow={Math.round(share)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-2.5 min-w-0 flex-1 rounded-full bg-surface ring-1 ring-line"
        >
          <span aria-hidden="true" className="absolute inset-0 rounded-full opacity-70 [background-image:repeating-linear-gradient(90deg,transparent_0_calc(10%-1px),var(--color-line-strong)_calc(10%-1px)_10%)]" />
          <span aria-hidden="true" style={{ width: `${share}%` }} className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full [background-image:var(--brand-gradient)] motion-reduce:animate-none" />
          <span
            aria-hidden="true"
            style={{ left: `clamp(0.5rem, ${share}%, calc(100% - 0.5rem))` }}
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)] ring-4 ring-primary/25"
          >
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary motion-reduce:hidden" />
          </span>
        </div>

        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          <span className="orbit-ring absolute inset-0 animate-orbit-spin-fast motion-reduce:animate-none">
            <span className="absolute top-1/2 -right-1 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
          </span>
          <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/40 shadow-[0_0_18px_-6px_var(--brand-primary)]">
            <span className="grid animate-float place-items-center [animation-duration:3s] motion-reduce:animate-none">
              <Icon name="gift" size={14} />
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}

function PanelHead({ icon, title, description, aside }: { icon: IconName; title: string; description?: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <span aria-hidden="true" className="orbit-ring absolute -inset-1 animate-orbit-spin-fast motion-reduce:animate-none" />
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {aside}
    </header>
  );
}

/** Leaders as race lanes: each puck runs out to its share of the leader's amount, with a chequered finish line. */
function LeaderLanes({ leaders, currency }: { leaders: ScratchLeader[]; currency: string }) {
  const ranked = [...leaders].sort((a, b) => a.rank - b.rank);
  const top = Math.max(0, ...ranked.map((leader) => leader.amount));

  return (
    <ol className="flex flex-col gap-4">
      {ranked.map((leader, index) => {
        const share = top > 0 ? (leader.amount / top) * 100 : 0;
        const isFirst = leader.rank === 1;
        const reach = `max(2.5rem, ${share}%)`;
        return (
          <li key={leader.rank} style={{ animationDelay: `${150 + index * 110}ms` }} className="group/lane grid animate-rise grid-cols-[2.25rem_minmax(0,1fr)] items-end gap-3 motion-reduce:animate-none">
            <span className={cx('pb-1.5 font-mono text-lg font-black tabular-nums', isFirst ? 'orbit-text' : 'text-fg-subtle')}>
              <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
              <span aria-hidden="true">{String(leader.rank).padStart(2, '0')}</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
                  {isFirst && <Icon name="trophy" size={13} className="shrink-0 text-primary" />}
                  <span className="truncate">{leader.name}</span>
                </span>
                <span className="text-sm font-semibold text-success tabular-nums">{formatMoney(leader.amount, currency)}</span>
              </div>
              <div
                role="meter"
                aria-label={translate('scratch.shareOfLeader', { name: leader.name })}
                aria-valuenow={Math.round(share)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative mt-2 h-10 rounded-full bg-surface-2/60 ring-1 ring-line transition-[box-shadow] duration-300 group-hover/lane:ring-primary/40 motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="absolute inset-x-5 top-1/2 border-t border-dashed border-line-strong" />
                <span aria-hidden="true" className="absolute inset-y-1.5 right-2 w-2 rounded-sm opacity-60 [background-image:repeating-linear-gradient(180deg,var(--color-fg)_0_3px,transparent_3px_6px)]" />
                <span
                  aria-hidden="true"
                  style={{ width: reach, animationDelay: `${250 + index * 110}ms` }}
                  className={cx('absolute inset-y-0 left-0 origin-left animate-grow rounded-full motion-reduce:animate-none', isFirst ? 'bg-primary/25' : 'bg-primary/10')}
                />
                <span
                  aria-hidden="true"
                  style={{ left: `calc(${reach} - 2.25rem)`, animationDelay: `${700 + index * 110}ms` }}
                  className={cx(
                    'absolute top-1/2 grid size-8 -translate-y-1/2 animate-pop-in place-items-center rounded-full text-xs font-bold shadow-lg transition-transform duration-300 group-hover/lane:scale-110 motion-reduce:animate-none motion-reduce:transition-none',
                    medalClass[leader.rank] ?? 'bg-surface text-fg-muted ring-1 ring-line',
                  )}
                >
                  {isFirst && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:hidden" />}
                  <span className="relative">{initialOf(leader.name)}</span>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Scratch results newest first; with none yet, an empty orbit waits for its first gift. */
function ScratchLog({ history, currency }: { history: ScratchHistoryEntry[]; currency: string }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <div aria-hidden="true" className="relative mb-6 grid size-36 place-items-center">
          <span className="orbit-ring absolute inset-0 animate-orbit-spin-rev motion-reduce:animate-none" />
          <span className="orbit-ring absolute inset-5 animate-orbit-spin-fast motion-reduce:animate-none">
            <span className="absolute top-1/2 -right-3 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-primary text-on-primary shadow-[0_0_14px_var(--brand-primary)]">
              <Icon name="gift" size={12} />
            </span>
          </span>
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary ring-1 ring-primary/30">
            <Icon name="history" size={22} />
          </span>
        </div>
        <p className="text-base font-semibold text-fg">{translate('scratch.emptyTitle')}</p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('scratch.emptyText')}</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {history.map((entry, index) => {
        const isWin = entry.amount > 0;
        return (
          <li
            key={entry.id}
            style={{ animationDelay: `${index * 80}ms` }}
            className="group/entry flex animate-rise items-center gap-3 rounded-2xl bg-surface-2/50 px-3.5 py-3 ring-1 ring-line transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:ring-primary/40 motion-reduce:animate-none motion-reduce:transition-none"
          >
            <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', isWin ? 'text-on-primary [background-image:var(--brand-gradient)]' : 'bg-surface text-fg-subtle ring-1 ring-line')}>
              <Icon name="gift" size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs font-semibold tracking-wider text-fg">{entry.id}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
                <Icon name="calendar" size={11} />
                {formatDate(entry.scratchedAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cx('text-sm font-black tabular-nums', isWin ? 'orbit-text' : 'text-fg-muted')}>{formatMoney(entry.amount, currency)}</span>
              {isWin ? (
                <Badge tone="success" dot>
                  {translate('scratch.statusCredited')}
                </Badge>
              ) : (
                <Badge dot>{translate('scratch.statusNoWin')}</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ScratchCardPage() {
  const { data, isLoading } = useScratchCard();
  const [sessionWins, setSessionWins] = useState<ScratchHistoryEntry[]>([]);
  const [activeCard, setActiveCard] = useState<ScratchCardItem | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[34rem] rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-[28px]" />
          <Skeleton className="h-72 rounded-[28px]" />
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
  const nextLockedCard = lockedCards.reduce<ScratchCardItem | undefined>(
    (soonest, card) => (!soonest || card.unlocksInSeconds < soonest.unlocksInSeconds ? card : soonest),
    undefined,
  );

  function handleReveal(card: ScratchCardItem) {
    setSessionWins((current) => [{ id: card.id, scratchedAt: new Date().toISOString(), amount: card.reward }, ...current]);
  }

  // Orbit scratch card: a card-table stage (title + scoreboard, the whole deck as a fanned hand, then the timer and
  // the lots road), with the leaderboard lanes and the scratch log below.
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="scratch-title" className="orbit-card relative isolate animate-rise overflow-hidden p-5 motion-reduce:animate-none sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -top-40 -right-32 -z-10 size-[30rem] animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_50%_55%,black,transparent_70%)]"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
          <div className="min-w-0">
            <p className={cx(captionClass, 'flex items-center gap-2 text-primary')}>
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              {translate('scratch.rewardsEyebrow')}
            </p>
            <h2 id="scratch-title" className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              {translate('scratch.cardsTitle')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-fg-muted">{translate('scratch.cardsText')}</p>
          </div>
          <Scoreboard totalWon={totalWon} entries={history.length} currency={currency} />
        </div>

        <div className="mt-6">
          <CardHand cards={handCards} currency={currency} onOpen={setActiveCard} />
        </div>

        <div className="mt-2 rounded-3xl bg-surface-2/40 p-4 ring-1 ring-line sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-semibold text-fg">{translate('scratch.statsTitle')}</h3>
            <p className="text-xs text-fg-muted">{translate('scratch.statsText')}</p>
          </div>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
            {nextLockedCard && (
              <>
                <NextCardTimer seconds={nextLockedCard.unlocksInSeconds} />
                <span aria-hidden="true" className="hidden w-px self-stretch bg-line md:block" />
              </>
            )}
            <LotsTrack accumulated={data.lotsAccumulated} target={data.lotsTarget} currency={currency} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="orbit-card animate-rise p-5 motion-reduce:animate-none sm:p-6">
          <PanelHead
            icon="trophy"
            title={translate('scratch.leaderboardTitle')}
            description={translate('scratch.leaderboardText')}
            aside={<Badge tone="primary">{translate('scratch.entries', { count: data.leaders.length })}</Badge>}
          />
          <div className="mt-6">
            <LeaderLanes leaders={data.leaders} currency={currency} />
          </div>
        </section>

        <section className="orbit-card animate-rise p-5 motion-reduce:animate-none sm:p-6">
          <PanelHead
            icon="history"
            title={translate('scratch.historyTitle')}
            aside={
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs">
                <span className="tracking-[0.1em] text-fg-subtle uppercase">{translate('scratch.totalWon')}</span>
                <span className="font-semibold text-primary tabular-nums">{formatMoney(totalWon, currency)}</span>
              </span>
            }
          />
          <div className="mt-5">
            <ScratchLog history={history} currency={currency} />
          </div>
        </section>
      </div>

      <ScratchDialog card={activeCard} currency={currency} onRevealed={handleReveal} onClose={() => setActiveCard(null)} />
    </div>
  );
}
