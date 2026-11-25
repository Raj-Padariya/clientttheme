'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useScratchCard, type ScratchCardItem, type ScratchHistoryEntry, type ScratchLeader } from '@/core/pages/useScratchCard';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { ScratchDialog, useAnimatedNumber } from './ScratchExperience';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const COUNT_UP_MS = 1200;
// One tick per second of the current minute on the timer's strip.
const SECOND_TICKS = Array.from({ length: SECONDS_PER_MINUTE }, (_, index) => index);
const GAUGE_MILESTONES = [25, 50, 75];

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
// Frosted silver ticket stock shared by the featured ticket, ready deck cards and the receipt.
const ticketStockClass = 'bg-linear-to-br from-white via-[#e3ebf7] to-[#b7c7de]';
// Iridescent foil: an oversized conic layer that keeps turning, so the colours slide across the ticket.
const holoClass =
  'pointer-events-none absolute -inset-1/2 animate-rim-spin mix-blend-soft-light [background-image:conic-gradient(from_0deg,#ffffff,#a9c7f5,#e4d9ff,#b8f0ff,#ffffff,#9fb8e8,#ffffff)] motion-reduce:animate-none';
const crosshatchClass =
  '[background-image:repeating-linear-gradient(45deg,rgb(10_18_32/0.09)_0_2px,transparent_2px_7px),repeating-linear-gradient(-45deg,rgb(10_18_32/0.09)_0_2px,transparent_2px_7px)]';

// Fixed sparkle spots (percent of the ticket) so the foil renders the same on server and client.
const foilSparkles = [
  { top: 14, left: 12, delay: 0 },
  { top: 22, left: 64, delay: 900 },
  { top: 58, left: 8, delay: 1500 },
  { top: 76, left: 58, delay: 500 },
  { top: 40, left: 88, delay: 1200 },
  { top: 88, left: 30, delay: 1900 },
];


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

/** Starts at 0 and moves to the target after mount, so rings and dots visibly travel into place. */
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

// Bar widths derived from the card id, so every ticket has its own stable barcode.
function barcodeOf(id: string): number[] {
  return Array.from(`${id}${id}`).map((char) => (char.charCodeAt(0) % 3) + 1);
}

type HandCard =
  | { kind: 'ready'; card: ScratchCardItem }
  | { kind: 'revealed'; card: ScratchCardItem; entry: ScratchHistoryEntry }
  | { kind: 'locked'; card: ScratchCardItem };

function Barcode({ id, className }: { id: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cx('flex h-8 items-stretch gap-[2px]', className)}>
      {barcodeOf(id).map((width, index) => (
        <span key={index} style={{ width }} className="rounded-[1px] bg-current" />
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

/** The scratch window of the featured ticket: crosshatched silver while ready, a frozen lock while locked, the result once revealed. */
function TicketWindow({ item, currency }: { item: HandCard; currency: string }) {
  if (item.kind === 'locked') {
    return (
      <div className="relative isolate grid h-full place-items-center overflow-hidden rounded-[22px] bg-[#0a1220]/[0.06] p-5 text-center ring-1 ring-[#0a1220]/10 ring-inset">
        <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(rgb(10_18_32/0.14)_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="flex flex-col items-center gap-3">
          <span className="relative grid size-14 place-items-center rounded-full bg-[#0a1220] text-white">
            <span aria-hidden="true" className="absolute -inset-1.5 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/30 motion-reduce:animate-none" />
            <Icon name="lock" size={20} />
          </span>
          <span className={cx(captionClass, inkMutedClass)}>{translate('scratch.locked')}</span>
          <TicketClock seconds={item.card.unlocksInSeconds} className={cx('text-2xl sm:text-3xl', inkClass)} />
        </div>
      </div>
    );
  }

  if (item.kind === 'revealed') {
    const isWin = item.entry.amount > 0;
    return (
      <div className="relative isolate grid h-full animate-pop-in place-items-center overflow-hidden rounded-[22px] bg-white/70 p-5 text-center ring-1 ring-[#0a1220]/10 ring-inset motion-reduce:animate-none">
        {isWin && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}
        <div className="flex flex-col items-center gap-2">
          <span className={cx('grid size-12 place-items-center rounded-full', isWin ? 'bg-success text-white' : 'bg-[#0a1220]/10 text-[#4b5a70]')}>
            <Icon name={isWin ? 'check' : 'close'} size={20} />
          </span>
          <span className={cx(captionClass, inkMutedClass)}>{translate('scratch.revealedLabel')}</span>
          <span className={cx('text-3xl font-black tracking-[-0.03em] tabular-nums sm:text-4xl', isWin ? inkClass : inkMutedClass)}>
            {isWin ? formatMoney(item.entry.amount, currency) : translate('scratch.statusNoWin')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('relative isolate grid h-full place-items-center overflow-hidden rounded-[22px] bg-linear-to-br from-[#cdd8e8] to-[#9cadc6] p-5 text-center ring-1 ring-white/60 ring-inset', crosshatchClass)}>
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen [animation-duration:3s] motion-reduce:animate-none" />
      {/* A light sweeping down the window like a scanner, hinting where to scratch. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-float bg-linear-to-b from-white/0 via-white/50 to-white/0 [animation-duration:2.6s] motion-reduce:hidden" />
      <div className="flex flex-col items-center gap-3">
        <span className="relative grid size-16 animate-float place-items-center rounded-full bg-[#0a1220] text-white shadow-[0_18px_30px_-14px_rgb(10_18_32/0.8)] [animation-duration:3s] motion-reduce:animate-none">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-[#0a1220]/40 motion-reduce:hidden" />
          <Icon name="gift" size={24} className="relative" />
        </span>
        <span className={cx('rounded-full bg-white/70 px-3 py-1 text-xs font-semibold backdrop-blur', inkClass)}>{translate('scratch.scratchHere')}</span>
      </div>
    </div>
  );
}

/** The selected card as a large holographic ticket that tilts toward the pointer, with a perforated stub and barcode. */
function FeaturedTicket({ item, currency, onOpen }: { item: HandCard; currency: string; onOpen: (card: ScratchCardItem) => void }) {
  const tilt = useTilt<HTMLDivElement>(6);
  const isLocked = item.kind === 'locked';
  const isReady = item.kind === 'ready';

  return (
    <div {...tilt} className="orbit-tilt">
      <article
        key={item.card.id}
        className={cx(
          'nova-edge-light relative isolate grid animate-pop-in overflow-hidden rounded-[30px] shadow-[0_44px_70px_-42px_rgb(0_0_0/0.95)] motion-reduce:animate-none sm:grid-cols-[minmax(0,1fr)_8.5rem]',
          ticketStockClass,
          inkClass,
        )}
      >
        <span aria-hidden="true" className={cx(holoClass, '-z-10', isLocked ? 'opacity-20 grayscale' : 'opacity-70')} />
        {isReady &&
          foilSparkles.map((sparkle) => (
            <span
              key={`${sparkle.top}-${sparkle.left}`}
              aria-hidden="true"
              style={{ top: `${sparkle.top}%`, left: `${sparkle.left}%`, animationDelay: `${sparkle.delay}ms` }}
              className="pointer-events-none absolute size-1.5 animate-twinkle rounded-full bg-white shadow-[0_0_8px_white] motion-reduce:animate-none"
            />
          ))}

        <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className={cx(captionClass, inkMutedClass)}>{translate('scratch.rewardsEyebrow')}</p>
            <span className="rounded-full bg-[#0a1220] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-white">{item.card.id}</span>
          </div>

          <div className="h-52 sm:h-56">
            <TicketWindow item={item} currency={currency} />
          </div>

          {isReady && (
            <button
              type="button"
              onClick={() => onOpen(item.card)}
              aria-label={translate('scratch.openCard')}
              className="group/open relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a1220] px-5 py-3 text-sm font-semibold text-white transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgb(10_18_32/0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen [animation-duration:2.4s] motion-reduce:animate-none" />
              {translate('scratch.tapToScratch')}
              <Icon name="arrowRight" size={15} className="transition-transform duration-300 group-hover/open:translate-x-1 motion-reduce:transition-none" />
            </button>
          )}
        </div>

        <div className="relative flex items-center justify-between gap-3 border-t-2 border-dashed border-[#0a1220]/20 p-4 sm:flex-col sm:border-t-0 sm:border-l-2 sm:py-6">
          <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full bg-app" />
          <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full bg-app sm:top-auto sm:-bottom-3 sm:-left-3 sm:right-auto" />
          <span className={cx('font-mono text-[11px] font-bold tracking-[0.3em] uppercase sm:[writing-mode:vertical-rl]', inkMutedClass)}>{translate('scratch.cardsTitle')}</span>
          <span className="grid size-10 place-items-center rounded-full bg-[#0a1220]/10">
            <Icon name={isLocked ? 'lock' : item.kind === 'revealed' ? 'check' : 'gift'} size={16} />
          </span>
          <Barcode id={item.card.id} className="sm:h-10" />
        </div>
      </article>
    </div>
  );
}

/** One card in the deck rail; picking it puts it on the featured ticket. */
function DeckTicket({ item, currency, isSelected, index, onSelect }: { item: HandCard; currency: string; isSelected: boolean; index: number; onSelect: () => void }) {
  const isReady = item.kind === 'ready';
  const isWin = item.kind === 'revealed' && item.entry.amount > 0;

  return (
    <li style={{ animationDelay: `${200 + index * 90}ms` }} className="shrink-0 animate-rise motion-reduce:animate-none">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={cx(
          'group/deck relative isolate flex h-40 w-32 flex-col justify-between overflow-hidden rounded-[20px] p-3 text-left transition-[translate,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          isReady ? cx(ticketStockClass, inkClass) : 'bg-surface text-fg ring-1 ring-line',
          item.kind === 'locked' && 'border border-dashed border-line-strong ring-0',
          isSelected ? '-translate-y-2 shadow-[0_22px_36px_-22px_rgb(0_0_0/0.9)] outline-2 outline-offset-3 outline-fg' : 'hover:-translate-y-1',
        )}
      >
        {isReady && <span aria-hidden="true" className={cx(holoClass, '-z-10 opacity-60')} />}
        <span className={cx('font-mono text-[10px] font-bold tracking-[0.12em]', isReady ? inkMutedClass : 'text-fg-subtle')}>{item.card.id}</span>

        <span className="flex flex-col gap-1.5">
          {item.kind === 'ready' && (
            <>
              <span className="grid size-9 animate-float place-items-center rounded-full bg-[#0a1220] text-white [animation-duration:3s] motion-reduce:animate-none" style={{ animationDelay: `${index * 300}ms` }}>
                <Icon name="gift" size={15} />
              </span>
              <span className="text-xs font-semibold">{translate('scratch.tapToScratch')}</span>
            </>
          )}
          {item.kind === 'locked' && (
            <>
              <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-fg-muted ring-1 ring-line">
                <Icon name="lock" size={14} />
              </span>
              <span className={captionClass}>{translate('scratch.locked')}</span>
              <TicketClock seconds={item.card.unlocksInSeconds} className="text-xs text-fg" />
            </>
          )}
          {item.kind === 'revealed' && (
            <>
              <span className={cx('grid size-9 place-items-center rounded-full', isWin ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-subtle ring-1 ring-line')}>
                <Icon name={isWin ? 'check' : 'close'} size={14} />
              </span>
              <span className={captionClass}>{translate('scratch.revealedLabel')}</span>
              <span className={cx('truncate text-sm font-bold tabular-nums', isWin ? 'text-fg' : 'text-fg-muted')}>
                {isWin ? formatMoney(item.entry.amount, currency) : translate('scratch.statusNoWin')}
              </span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

/** Total won and history entries as two large counters that count up. */
function Scoreboard({ totalWon, entries, currency }: { totalWon: number; entries: number; currency: string }) {
  const shownWon = useAnimatedNumber(totalWon, COUNT_UP_MS);
  const shownEntries = useAnimatedNumber(entries, COUNT_UP_MS);
  const stats: { key: string; icon: IconName; label: string; value: string; hint: string }[] = [
    { key: 'won', icon: 'wallet', label: translate('scratch.totalWon'), value: formatMoney(shownWon, currency), hint: translate('scratch.allTime') },
    { key: 'entries', icon: 'history', label: translate('scratch.historyEntries'), value: String(Math.round(shownEntries)).padStart(2, '0'), hint: translate('scratch.redemptions') },
  ];

  return (
    <ul className="grid grid-cols-2 gap-6">
      {stats.map((stat, index) => (
        <li key={stat.key} style={{ animationDelay: `${150 + index * 100}ms` }} className="group/stat min-w-0 animate-rise border-l-2 border-line-strong pl-4 motion-reduce:animate-none">
          <p className={cx(captionClass, 'flex items-center gap-1.5')}>
            <Icon name={stat.icon} size={12} className="transition-transform duration-300 group-hover/stat:scale-125 motion-reduce:transition-none" />
            {stat.label}
          </p>
          <p className="mt-1.5 truncate text-3xl font-bold tracking-[-0.03em] text-fg tabular-nums sm:text-4xl">{stat.value}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{stat.hint}</p>
        </li>
      ))}
    </ul>
  );
}

/** Next-card countdown as flip tiles, with a strip of the current minute's seconds draining one tick at a time. */
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
    <div className="flex min-w-0 flex-col gap-4 rounded-[24px] bg-surface p-4 ring-1 ring-line sm:p-5">
      <p className={cx(captionClass, 'flex items-center gap-1.5')}>
        <Icon name="lock" size={12} />
        {translate('scratch.nextCardLabel')}
      </p>
      <p className="sr-only">{translate('scratch.nextCardIn', { time: [hours, minutes, secondsPart].join(':') })}</p>

      <div aria-hidden="true" className="flex items-start gap-2">
        {tiles.map((tile, index) => (
          <div key={tile.key} className="flex items-start gap-2">
            {index > 0 && <span className="animate-blink pt-3 font-mono text-xl font-bold text-fg-subtle motion-reduce:animate-none">:</span>}
            <div className="flex flex-col items-center gap-1.5">
              <span className="nova-gloss relative grid h-14 w-13 place-items-center overflow-hidden rounded-2xl sm:h-16 sm:w-15">
                <span key={tile.value} className="animate-tick-rise font-mono text-2xl font-bold text-fg tabular-nums motion-reduce:animate-none sm:text-3xl">
                  {tile.value}
                </span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-app/60" />
              </span>
              <span className="text-[9px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">{tile.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="flex h-4 items-end justify-between gap-px">
        {SECOND_TICKS.map((tick) => {
          const isLit = tick < secondsLeft;
          const isHead = tick === secondsLeft - 1;
          return (
            <span
              key={tick}
              className={cx(
                'w-[2px] rounded-full transition-[height,background-color] duration-500 motion-reduce:transition-none',
                isHead ? 'h-4 animate-blink bg-fg motion-reduce:animate-none' : isLit ? cx('bg-fg/60', tick % 15 === 0 ? 'h-3.5' : 'h-2.5') : 'h-1.5 bg-line',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Lots accumulated as a thin ring gauge: the arc and its marker travel in on load, milestone ticks every quarter. */
function LotsGauge({ accumulated, target, currency }: { accumulated: number; target: number; currency: string }) {
  const share = target > 0 ? Math.min(100, (accumulated / target) * 100) : 0;
  const shown = useEntrance(share);

  return (
    <div className="flex min-w-0 items-center gap-4 rounded-[24px] bg-surface p-4 ring-1 ring-line sm:p-5">
      <div
        role="progressbar"
        aria-label={translate('scratch.lotsAccumulated')}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative grid size-28 shrink-0 place-items-center"
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="3" className="stroke-line" />
          {GAUGE_MILESTONES.map((milestone) => (
            <line key={milestone} x1="50" y1="2" x2="50" y2="9" transform={`rotate(${milestone * 3.6 + 90} 50 50)`} strokeWidth="1.5" className="stroke-line-strong" />
          ))}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${shown} 100`}
            className="stroke-fg transition-[stroke-dasharray] duration-[1400ms] ease-out motion-reduce:transition-none"
          />
        </svg>
        <span aria-hidden="true" style={{ rotate: `${shown * 3.6}deg` }} className="absolute inset-[6%] transition-[rotate] duration-[1400ms] ease-out motion-reduce:transition-none">
          <span className="absolute top-0 left-1/2 grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-fg/40 motion-reduce:hidden" />
            <span className="relative size-3 rounded-full bg-fg ring-4 ring-surface" />
          </span>
        </span>
        <span className="flex flex-col items-center">
          <span className="grid animate-float place-items-center text-fg-muted [animation-duration:3s] motion-reduce:animate-none">
            <Icon name="gift" size={16} />
          </span>
          <span className="mt-0.5 text-lg font-bold text-fg tabular-nums">{Math.round(share)}%</span>
        </span>
      </div>

      <div className="min-w-0">
        <p className={captionClass}>{translate('scratch.lotsAccumulated')}</p>
        <p className="mt-1 truncate text-xl font-bold text-fg tabular-nums">{formatMoney(accumulated, currency)}</p>
        <p className="truncate text-xs text-fg-subtle tabular-nums">/ {formatMoney(target, currency)}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-fg-muted ring-1 ring-line">
          <Icon name="arrowRight" size={11} />
          {translate('scratch.towardNext')}
        </p>
      </div>
    </div>
  );
}

function PanelHead({ icon, title, description, aside }: { icon: IconName; title: string; description?: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <span className="nova-gloss grid size-10 shrink-0 place-items-center rounded-2xl text-fg">
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

// Ridge geometry (SVG units). The top three sit on one mountain line: #2 left, #1 on the summit, #3 right.
const RIDGE_WIDTH = 300;
const RIDGE_HEIGHT = 120;
const RIDGE_FLOOR = 116;
// x of the 1st, 2nd and 3rd leader.
const RIDGE_X_BY_PLACE = [150, 50, 250];

// A leader's height on the ridge: share of the top amount, kept off the floor so a tiny share still reads as a peak.
function ridgeY(share: number): number {
  return 96 - (share / 100) * 80;
}

interface RidgePoint {
  leader: ScratchLeader;
  share: number;
  /** 0 for the leader, 1 and 2 for the runners-up. */
  place: number;
  x: number;
  y: number;
}

/** One summit marker: a glossy bead on the ridge; the leader gets a floating trophy and a ping ring. */
function RidgePeak({ point }: { point: RidgePoint }) {
  const isFirst = point.place === 0;
  return (
    <div
      role="meter"
      aria-label={translate('scratch.shareOfLeader', { name: point.leader.name })}
      aria-valuenow={Math.round(point.share)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ left: `${(point.x / RIDGE_WIDTH) * 100}%`, top: `${(point.y / RIDGE_HEIGHT) * 100}%`, animationDelay: `${700 + point.place * 160}ms` }}
      className="group/peak absolute grid -translate-x-1/2 -translate-y-1/2 animate-pop-in place-items-center motion-reduce:animate-none"
    >
      {isFirst && (
        <>
          <span aria-hidden="true" className="absolute -top-7 left-1/2 -translate-x-1/2 animate-float text-fg [animation-duration:2.4s] motion-reduce:animate-none">
            <Icon name="trophy" size={17} />
          </span>
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full border-2 border-fg/40 motion-reduce:hidden" />
        </>
      )}
      <span
        aria-hidden="true"
        className={cx(
          'relative grid place-items-center rounded-full font-bold transition-transform duration-300 group-hover/peak:scale-110 motion-reduce:transition-none',
          isFirst ? 'nova-gloss size-14 text-xl text-fg' : cx('nova-edge-light size-10 text-sm shadow-[0_10px_18px_-10px_rgb(0_0_0/0.9)]', ticketStockClass, inkClass),
        )}
      >
        {initialOf(point.leader.name)}
      </span>
    </div>
  );
}


/** Top three as peaks on a ridge line that draws itself in, with a translucent frost fill under it. */
function LeaderRidge({ points, currency }: { points: RidgePoint[]; currency: string }) {
  const drawn = useEntrance(100);
  const gradientId = useId();
  const ordered = [...points].sort((a, b) => a.x - b.x);
  const line = [`M0 ${RIDGE_FLOOR}`, ...ordered.map((point) => `L${point.x} ${point.y}`), `L${RIDGE_WIDTH} ${RIDGE_FLOOR}`].join(' ');

  return (
    <div>
      <div className="relative h-44 sm:h-48">
        <svg viewBox={`0 0 ${RIDGE_WIDTH} ${RIDGE_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-fg)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--color-fg)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${line} Z`}
            fill={`url(#${gradientId})`}
            style={{ opacity: drawn / 100 }}
            className="transition-opacity delay-700 duration-1000 motion-reduce:transition-none"
          />
          {ordered.map((point) => (
            <line
              key={point.leader.rank}
              x1={point.x}
              y1={point.y}
              x2={point.x}
              y2={RIDGE_FLOOR}
              strokeWidth="1"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
              className="stroke-fg/25"
            />
          ))}
          <line x1="0" y1={RIDGE_FLOOR} x2={RIDGE_WIDTH} y2={RIDGE_FLOOR} strokeWidth="1" vectorEffect="non-scaling-stroke" className="stroke-line" />
          <path
            d={line}
            fill="none"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={100 - drawn}
            vectorEffect="non-scaling-stroke"
            className="stroke-fg transition-[stroke-dashoffset] duration-[1600ms] ease-out motion-reduce:transition-none"
          />
        </svg>
        {ordered.map((point) => (
          <RidgePeak key={point.leader.rank} point={point} />
        ))}
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-3">
        {ordered.map((point) => (
          <li
            key={point.leader.rank}
            style={{ animationDelay: `${900 + point.place * 140}ms` }}
            className="flex min-w-0 animate-rise flex-col items-center gap-1 text-center motion-reduce:animate-none"
          >
            <span className={cx('rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums', point.place === 0 ? 'bg-fg text-app' : 'border border-dashed border-line-strong text-fg-subtle')}>
              <span className="sr-only">{translate('scratch.rank', { rank: point.leader.rank })}</span>
              <span aria-hidden="true">#{String(point.leader.rank).padStart(2, '0')}</span>
            </span>
            <p className="mt-1 max-w-full truncate text-sm font-semibold text-fg">{point.leader.name}</p>
            <p className="text-sm font-semibold text-success tabular-nums">{formatMoney(point.leader.amount, currency)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SHARE_RING_RADIUS = 15;
const SHARE_RING_LENGTH = 2 * Math.PI * SHARE_RING_RADIUS;

/** Everyone after the top three: outlined rank numeral, name, a dotted leader line to the amount, and a mini share ring. */
function LeaderStrip({ leader, share, currency, index }: { leader: ScratchLeader; share: number; currency: string; index: number }) {
  const shown = useEntrance(share);

  return (
    <li
      style={{ animationDelay: `${1100 + index * 90}ms` }}
      className="group/row grid animate-rise grid-cols-[2.75rem_2rem_minmax(0,max-content)_minmax(1rem,1fr)_auto_2rem] items-center gap-3 py-3 motion-reduce:animate-none"
    >
      <span className="text-[28px] leading-none font-black text-transparent tabular-nums [-webkit-text-stroke:1px_var(--color-fg-subtle)] transition-colors duration-300 group-hover/row:text-fg/10 motion-reduce:transition-none">
        <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
        <span aria-hidden="true">{String(leader.rank).padStart(2, '0')}</span>
      </span>
      <span aria-hidden="true" className="nova-gloss grid size-8 place-items-center rounded-full text-xs font-bold text-fg">
        {initialOf(leader.name)}
      </span>
      <p className="truncate text-sm font-medium text-fg">{leader.name}</p>
      <span aria-hidden="true" className="h-px border-t-2 border-dotted border-line-strong" />
      <span className="text-sm font-semibold text-success tabular-nums">{formatMoney(leader.amount, currency)}</span>
      <div
        role="meter"
        aria-label={translate('scratch.shareOfLeader', { name: leader.name })}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative size-8"
      >
        <svg viewBox="0 0 36 36" aria-hidden="true" className="size-full -rotate-90">
          <circle cx="18" cy="18" r={SHARE_RING_RADIUS} fill="none" strokeWidth="2.5" className="stroke-line" />
          <circle
            cx="18"
            cy="18"
            r={SHARE_RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={SHARE_RING_LENGTH}
            strokeDashoffset={SHARE_RING_LENGTH * (1 - shown / 100)}
            className="stroke-fg transition-[stroke-dashoffset] duration-[1400ms] ease-out motion-reduce:transition-none"
          />
        </svg>
      </div>
    </li>
  );
}

/** Top three on a summit ridge, everyone after as numbered strips with a mini share ring. */
function LeaderRings({ leaders, currency }: { leaders: ScratchLeader[]; currency: string }) {
  const ranked = [...leaders].sort((a, b) => a.rank - b.rank);
  const top = Math.max(0, ...ranked.map((leader) => leader.amount));
  const shareOf = (leader: ScratchLeader) => (top > 0 ? (leader.amount / top) * 100 : 0);
  const points: RidgePoint[] = ranked.slice(0, 3).map((leader, place) => {
    const share = shareOf(leader);
    return { leader, share, place, x: RIDGE_X_BY_PLACE[place], y: ridgeY(share) };
  });
  const rest = ranked.slice(3);

  return (
    <div className="flex flex-col gap-5 pt-6">
      {points.length > 0 && <LeaderRidge points={points} currency={currency} />}
      {rest.length > 0 && (
        <ol className="flex flex-col divide-y divide-dashed divide-line border-t border-dashed border-line">
          {rest.map((leader, index) => (
            <LeaderStrip key={leader.rank} leader={leader} share={shareOf(leader)} currency={currency} index={index} />
          ))}
        </ol>
      )}
    </div>
  );
}

// Torn edge of the receipt: half-circles cut out in the page colour along one side.
function ReceiptEdge({ side }: { side: 'top' | 'bottom' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute inset-x-0 h-3 bg-repeat-x [background-size:16px_12px]',
        side === 'top' ? 'top-0 [background-image:radial-gradient(circle_at_8px_0,var(--color-app)_6px,transparent_6.5px)]' : 'bottom-0 [background-image:radial-gradient(circle_at_8px_12px,var(--color-app)_6px,transparent_6.5px)]',
      )}
    />
  );
}

/** Scratch results printed as a frosted receipt, newest first, totalled at the bottom; empty, it waits for its first line. */
function ScratchReceipt({ history, totalWon, currency }: { history: ScratchHistoryEntry[]; totalWon: number; currency: string }) {
  return (
    <section aria-labelledby="scratch-history-title" className={cx('relative isolate animate-rise overflow-hidden rounded-[6px] px-5 pt-8 pb-9 [animation-delay:150ms] motion-reduce:animate-none sm:px-6', ticketStockClass, inkClass)}>
      <ReceiptEdge side="top" />
      <ReceiptEdge side="bottom" />
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />

      <header className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-[#0a1220] text-white">
          <Icon name="history" size={17} />
        </span>
        <h2 id="scratch-history-title" className="font-mono text-sm font-bold tracking-[0.24em] uppercase">
          {translate('scratch.historyTitle')}
        </h2>
      </header>

      <div aria-hidden="true" className="my-5 border-t-2 border-dashed border-[#0a1220]/25" />

      {history.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span aria-hidden="true" className="relative mb-4 grid size-16 place-items-center rounded-full bg-[#0a1220]/10">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#0a1220]/10 motion-reduce:hidden" />
            <Icon name="gift" size={22} />
          </span>
          <p className="text-base font-semibold">{translate('scratch.emptyTitle')}</p>
          <p className={cx('mt-1 max-w-xs text-sm', inkMutedClass)}>{translate('scratch.emptyText')}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {history.map((entry, index) => {
            const isWin = entry.amount > 0;
            return (
              <li key={entry.id} style={{ animationDelay: `${300 + index * 110}ms` }} className="group/line animate-feed-in motion-reduce:animate-none">
                <div className="flex items-end gap-2">
                  <span className="font-mono text-xs font-bold tracking-wider">{entry.id}</span>
                  <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-[#0a1220]/25" />
                  <span className={cx('font-mono text-sm font-bold tabular-nums transition-transform duration-300 group-hover/line:scale-110 motion-reduce:transition-none', !isWin && inkMutedClass)}>
                    {formatMoney(entry.amount, currency)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={cx('flex items-center gap-1 text-[11px]', inkMutedClass)}>
                    <Icon name="calendar" size={11} />
                    {formatDate(entry.scratchedAt)}
                  </span>
                  <span
                    className={cx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                      isWin ? 'bg-success/15 text-[#0f7a4a]' : 'bg-[#0a1220]/10 text-[#4b5a70]',
                    )}
                  >
                    <span aria-hidden="true" className={cx('size-1.5 rounded-full', isWin ? 'bg-success' : 'bg-[#4b5a70]')} />
                    {isWin ? translate('scratch.statusCredited') : translate('scratch.statusNoWin')}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div aria-hidden="true" className="mt-6 flex flex-col gap-1">
        <span className="border-t-2 border-[#0a1220]/70" />
        <span className="border-t border-[#0a1220]/70" />
      </div>
      <p className="mt-3 flex items-end justify-between gap-3">
        <span className={cx('font-mono text-[11px] font-bold tracking-[0.2em] uppercase', inkMutedClass)}>{translate('scratch.totalWon')}</span>
        <span className="text-2xl font-black tracking-[-0.02em] tabular-nums">{formatMoney(totalWon, currency)}</span>
      </p>
      <Barcode id={`${history.length}-${totalWon}`} className="mx-auto mt-5 h-10 justify-center" />
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
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[26rem] rounded-[30px]" />
          <Skeleton className="h-[26rem] rounded-[30px]" />
        </div>
        <Skeleton className="h-44 rounded-[28px]" />
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

  // Nova scratch card: a ticket booth — the picked card as a big holographic ticket beside the title, counters and
  // instruments; the whole deck as a rail of tickets below; then ring medals for the leaders and a printed receipt.
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="scratch-title" className="relative isolate grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:items-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-0 -z-10 text-[clamp(5rem,14vw,11rem)] leading-none font-black tracking-[-0.06em] text-transparent opacity-[0.06] select-none [-webkit-text-stroke:1.5px_var(--color-fg)]"
        >
          SCRATCH
        </span>

        <div className="relative order-2 xl:order-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-y-6 inset-x-0 -z-10 opacity-50 [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] sm:-inset-x-6"
          />
          {featured && <FeaturedTicket item={featured} currency={currency} onOpen={setActiveCard} />}
        </div>

        <div className="order-1 flex min-w-0 animate-rise flex-col gap-6 motion-reduce:animate-none xl:order-2">
          <div>
            <p className={cx(captionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className="h-px w-8 bg-fg-subtle" />
              {translate('scratch.rewardsEyebrow')}
            </p>
            <h2 id="scratch-title" className="mt-2 text-4xl font-bold tracking-[-0.04em] text-fg sm:text-5xl">
              {translate('scratch.cardsTitle')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-fg-muted">{translate('scratch.cardsText')}</p>
          </div>

          <Scoreboard totalWon={totalWon} entries={history.length} currency={currency} />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-sm font-semibold text-fg">{translate('scratch.statsTitle')}</h3>
              <p className="text-xs text-fg-muted">{translate('scratch.statsText')}</p>
            </div>
            <div className={cx('grid gap-3', nextLockedCard && 'lg:grid-cols-2')}>
              {nextLockedCard && <NextCardTimer seconds={nextLockedCard.unlocksInSeconds} />}
              <LotsGauge accumulated={data.lotsAccumulated} target={data.lotsTarget} currency={currency} />
            </div>
          </div>
        </div>
      </section>

      <section aria-label={translate('scratch.cardsTitle')} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-fg ring-1 ring-line tabular-nums">
            <Icon name="gift" size={12} />
            {readyCount}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-fg-muted ring-1 ring-line tabular-nums">
            <Icon name="lock" size={12} />
            {lockedCards.length}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent" />
        </div>
        <ul className="-mx-1 flex gap-4 overflow-x-auto px-1 pt-3 pb-4">
          {handCards.map((item, index) => (
            <DeckTicket
              key={item.card.id}
              item={item}
              currency={currency}
              index={index}
              isSelected={featured?.card.id === item.card.id}
              onSelect={() => setSelectedId(item.card.id)}
            />
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
        <section className="nova-edge-light animate-rise rounded-[28px] bg-surface p-5 ring-1 ring-line motion-reduce:animate-none sm:p-6">
          <PanelHead
            icon="trophy"
            title={translate('scratch.leaderboardTitle')}
            description={translate('scratch.leaderboardText')}
            aside={<Badge tone="primary">{translate('scratch.entries', { count: data.leaders.length })}</Badge>}
          />
          <div className="mt-6">
            <LeaderRings leaders={data.leaders} currency={currency} />
          </div>
        </section>

        <ScratchReceipt history={history} totalWon={totalWon} currency={currency} />
      </div>

      <ScratchDialog card={activeCard} currency={currency} onRevealed={handleReveal} onClose={() => setActiveCard(null)} />
    </div>
  );
}
