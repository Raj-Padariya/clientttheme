'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useScratchCard, type ScratchCardItem, type ScratchHistoryEntry, type ScratchLeader } from '@/core/pages/useScratchCard';
import { cx } from '../lib/cx';
import { DotNumber } from '../ui/DotMatrix';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { ProgressBar } from '../ui/ProgressBar';
import { prefersReducedMotion, ScratchDialog, useAnimatedNumber, useMotion } from './ScratchExperience';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
// At most this many locked cards peek out from behind the featured card.
const DECK_DEPTH = 2;

const captionClass = 'text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase';
const panelClass = 'relative isolate overflow-hidden rounded-[28px] border border-line bg-surface shadow-card';
const cardFrameClass = 'relative aspect-[3/4] w-full overflow-hidden rounded-[24px]';
const deckOffsetClass = ['translate-x-7 rotate-[7deg]', '-translate-x-7 -rotate-[7deg]'];

const FLOAT_KEYFRAMES: Keyframe[] = [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }];
const FLOAT_OPTIONS: KeyframeAnimationOptions = { duration: 3200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };
const COVER_SHINE_KEYFRAMES: Keyframe[] = [{ transform: 'translateX(-150%) skewX(-12deg)' }, { transform: 'translateX(350%) skewX(-12deg)' }];
const COVER_SHINE_OPTIONS: KeyframeAnimationOptions = { duration: 3000, iterations: Infinity, easing: 'ease-in-out', delay: 600 };
const COVER_TILT_DEGREES = 10;
// Fixed sparkle spots (percent of the card) so the cover renders the same on server and client.
const coverSparkles = [
  { top: 12, left: 18, delay: 0 },
  { top: 22, left: 78, delay: 700 },
  { top: 48, left: 10, delay: 1300 },
  { top: 66, left: 84, delay: 400 },
  { top: 82, left: 30, delay: 1000 },
  { top: 36, left: 62, delay: 1600 },
  { top: 90, left: 70, delay: 200 },
];

const BORDER_SPIN_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
const BORDER_SPIN_OPTIONS: KeyframeAnimationOptions = { duration: 4500, iterations: Infinity };
// The lock rests most of the loop and only rattles at the end, so it reads as "tried, still locked".
const LOCK_SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(0deg)', offset: 0.78 },
  { transform: 'rotate(-14deg)', offset: 0.83 },
  { transform: 'rotate(12deg)', offset: 0.88 },
  { transform: 'rotate(-7deg)', offset: 0.93 },
  { transform: 'rotate(3deg)', offset: 0.97 },
  { transform: 'rotate(0deg)' },
];
const LOCK_SHAKE_OPTIONS: KeyframeAnimationOptions = { duration: 3200, iterations: Infinity };
const DECK_SWAY_KEYFRAMES: Keyframe[][] = [
  [{ transform: 'rotate(0deg) translateY(0)' }, { transform: 'rotate(2.5deg) translateY(-5px)' }],
  [{ transform: 'rotate(0deg) translateY(0)' }, { transform: 'rotate(-2.5deg) translateY(-5px)' }],
];
const DECK_SWAY_OPTIONS: KeyframeAnimationOptions = { duration: 3600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };
const ORBIT_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
const ORBIT_REVERSE_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(360deg)' }, { transform: 'rotate(0deg)' }];
const ORBIT_OPTIONS: KeyframeAnimationOptions = { duration: 9000, iterations: Infinity };
const ORBIT_SLOW_OPTIONS: KeyframeAnimationOptions = { duration: 14000, iterations: Infinity };
const TRAY_POP_KEYFRAMES: Keyframe[] = [
  { transform: 'translateY(-28px) scale(0.4) rotate(-30deg)', opacity: 0 },
  { transform: 'translateY(4px) scale(1.12) rotate(4deg)', opacity: 1, offset: 0.7 },
  { transform: 'none', opacity: 1 },
];
const TRAY_POP_OPTIONS: KeyframeAnimationOptions = { duration: 650, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'backwards' };
const TRAY_LIMIT = 5;
const trayTiltClass = ['-rotate-6', 'rotate-3', '-rotate-2', 'rotate-6', '-rotate-3'];

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

function Panel({
  icon,
  title,
  description,
  aside,
  children,
}: {
  icon: IconName;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cx(panelClass, 'p-5 sm:p-6')}>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon name={icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const PANEL_TILT_DEGREES = 8;

function CountdownClock({ seconds }: { seconds: number }) {
  const remaining = useCountdown(seconds);
  const [hours, minutes, secondsPart] = clockParts(remaining);
  const sweepRef = useRef<HTMLSpanElement>(null);
  // Seconds already gone in the current minute; the glyph strip fills left to right as the minute runs out.
  const elapsedInMinute = (SECONDS_PER_MINUTE - (remaining % SECONDS_PER_MINUTE)) % SECONDS_PER_MINUTE;

  useMotion(sweepRef, COVER_SHINE_KEYFRAMES, COVER_SHINE_OPTIONS);

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.transform = `perspective(900px) rotateX(${(-y * PANEL_TILT_DEGREES).toFixed(2)}deg) rotateY(${(x * PANEL_TILT_DEGREES).toFixed(2)}deg)`;
  }

  function resetTilt(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.transform = '';
  }

  return (
    <div
      role="timer"
      aria-label={translate('scratch.nextCardIn', { time: [hours, minutes, secondsPart].join(':') })}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      className="relative w-full max-w-[15rem] transition-transform duration-300 ease-out motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="absolute -inset-2 -z-10 rounded-[26px] bg-primary/10 blur-2xl animate-ring-breathe motion-reduce:animate-none" />

      <div
        aria-hidden="true"
        className="glass relative overflow-hidden rounded-[20px] border border-white/10 bg-linear-to-br from-white/[0.08] via-white/[0.02] to-transparent p-3.5 shadow-[0_20px_40px_-22px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl"
      >
        {/* Transparent-back look: faint internal strips and screws seen through the glass. */}
        <span className="pointer-events-none absolute inset-y-0 right-[22%] w-px bg-white/[0.06]" />
        <span className="pointer-events-none absolute inset-x-0 top-[58%] h-px bg-white/[0.05]" />
        <span className="pointer-events-none absolute top-2.5 right-2.5 size-1.5 rounded-full border border-white/15" />
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 size-1.5 rounded-full border border-white/15" />
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
        <span ref={sweepRef} className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/[0.07] to-transparent" />

        <span className="relative flex items-center gap-1 pt-1">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)] animate-pulse motion-reduce:animate-none" />
          <span className="size-1 rounded-full bg-fg/25" />
          <span className="size-1 rounded-full bg-fg/25" />
        </span>

        <div className="relative mt-3 flex items-start gap-2">
          <span className="flex flex-col gap-1.5">
            <DotNumber value={hours} />
            <span className="font-mono text-[8px] tracking-[0.2em] text-fg-subtle uppercase">{translate('scratch.hours')}</span>
          </span>
          <span className="mt-3 flex flex-col gap-2 animate-pulse motion-reduce:animate-none">
            <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
            <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
          </span>
          <span className="flex flex-col gap-1.5">
            <DotNumber value={minutes} />
            <span className="font-mono text-[8px] tracking-[0.2em] text-fg-subtle uppercase">{translate('scratch.minutes')}</span>
          </span>
          {/* Seconds sit beside the minutes, bottom-aligned with the big digits (40px tall vs the ~32px pill). */}
          <span className="mt-2 ml-1 flex items-center rounded-full border border-white/10 bg-black/30 px-2 py-1 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
            <DotNumber value={secondsPart} small />
          </span>
        </div>

        {/* Glyph strip: one segment per second of the current minute, the head segment glows. */}
        <div className="relative mt-3 flex h-1.5 gap-px">
          {Array.from({ length: SECONDS_PER_MINUTE }, (_, index) => (
            <span
              key={index}
              className={cx(
                'flex-1 rounded-full transition-[background-color,box-shadow] duration-500 motion-reduce:transition-none',
                index === elapsedInMinute
                  ? 'bg-primary shadow-[0_0_8px_1px_var(--brand-primary)]'
                  : index < elapsedInMinute
                    ? 'bg-primary/45'
                    : 'bg-fg/[0.07]',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LockedFace() {
  const floatRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLSpanElement>(null);
  const lockRef = useRef<HTMLSpanElement>(null);

  useMotion(floatRef, FLOAT_KEYFRAMES, FLOAT_OPTIONS);
  useMotion(spinRef, BORDER_SPIN_KEYFRAMES, BORDER_SPIN_OPTIONS);
  useMotion(lockRef, LOCK_SHAKE_KEYFRAMES, LOCK_SHAKE_OPTIONS);

  return (
    <div ref={floatRef} className="relative z-10">
      <div className={cx(cardFrameClass, 'bg-fg/10 shadow-[0_30px_60px_-34px_var(--brand-primary)]')}>
        <span
          ref={spinRef}
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-[180%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,var(--brand-primary)_320deg,transparent_360deg)]"
        />
        <div className="absolute inset-[1.5px] flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[22.5px] bg-surface-2">
          <span aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.03)_0_1px,transparent_1px_10px)]" />
          {coverSparkles.map((spot) => (
            <span
              key={`${spot.top}-${spot.left}`}
              aria-hidden="true"
              className="absolute size-1 animate-pulse rounded-full bg-white/70 motion-reduce:animate-none"
              style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}ms` }}
            />
          ))}
          <span className="relative flex size-16 items-center justify-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-primary/20 animate-ring-ripple motion-reduce:animate-none" />
            <span ref={lockRef} className="glass relative flex size-14 items-center justify-center rounded-full border border-primary/30 text-primary">
              <Icon name="lock" size={22} />
            </span>
          </span>
          <span className={cx(captionClass, 'relative')}>{translate('scratch.locked')}</span>
        </div>
      </div>
    </div>
  );
}

function DeckGhost({ card, index }: { card: ScratchCardItem; index: number }) {
  const swayRef = useRef<HTMLDivElement>(null);
  useMotion(swayRef, DECK_SWAY_KEYFRAMES[index % DECK_SWAY_KEYFRAMES.length], DECK_SWAY_OPTIONS);

  return (
    <div
      ref={swayRef}
      aria-hidden="true"
      className={cx(
        'absolute inset-x-0 top-0 aspect-[3/4] overflow-hidden rounded-[24px] border border-fg/10 shadow-card',
        card.state === 'ready' ? 'opacity-70 [background-image:var(--brand-gradient)]' : 'bg-surface-2/80',
        deckOffsetClass[index],
      )}
    >
      <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-surface text-fg-muted ring-1 ring-fg/10">
        <Icon name={card.state === 'ready' ? 'gift' : 'lock'} size={13} />
      </span>
    </div>
  );
}

function OrbitDot({ sizeClass, reverse }: { sizeClass: string; reverse: boolean }) {
  const orbitRef = useRef<HTMLSpanElement>(null);
  useMotion(orbitRef, reverse ? ORBIT_REVERSE_KEYFRAMES : ORBIT_KEYFRAMES, reverse ? ORBIT_SLOW_OPTIONS : ORBIT_OPTIONS);

  return (
    <span ref={orbitRef} aria-hidden="true" className={cx('pointer-events-none absolute rounded-full', sizeClass)}>
      <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_14px_var(--brand-primary)]" />
    </span>
  );
}

function MiniRevealedCard({ entry, currency, tiltClass }: { entry: ScratchHistoryEntry; currency: string; tiltClass: string }) {
  const popRef = useRef<HTMLLIElement>(null);
  useMotion(popRef, TRAY_POP_KEYFRAMES, TRAY_POP_OPTIONS);

  const isWin = entry.amount > 0;
  const label = isWin ? formatMoney(entry.amount, currency) : translate('scratch.statusNoWin');

  return (
    <li ref={popRef} className="-ml-2.5 transition-transform duration-200 first:ml-0 hover:z-10 hover:-translate-y-1.5">
      <span
        title={`${entry.id} · ${label}`}
        className={cx(
          'flex h-14 w-11 flex-col items-center justify-center gap-1 rounded-lg border shadow-card',
          tiltClass,
          isWin ? 'border-primary/50 text-on-primary [background-image:var(--brand-gradient)]' : 'border-dashed border-fg/20 bg-surface-2 text-fg-subtle',
        )}
      >
        <Icon name={isWin ? 'trophy' : 'history'} size={13} />
        <span aria-hidden="true" className="text-[9px] leading-none font-bold tabular-nums">
          {isWin ? formatMoney(entry.amount, currency) : '—'}
        </span>
        <span className="sr-only">{label}</span>
      </span>
    </li>
  );
}

function RevealedTray({ entries, currency }: { entries: ScratchHistoryEntry[]; currency: string }) {
  if (entries.length === 0) return null;

  const shown = entries.slice(0, TRAY_LIMIT);
  const hiddenCount = entries.length - shown.length;

  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-3 sm:top-5 sm:left-5">
      <ul aria-label={translate('scratch.revealedLabel')} className="flex items-center">
        {shown.map((entry, index) => (
          <MiniRevealedCard key={entry.id} entry={entry} currency={currency} tiltClass={trayTiltClass[index % trayTiltClass.length]} />
        ))}
      </ul>
      <div aria-hidden="true" className="leading-tight">
        <p className={captionClass}>{translate('scratch.revealedLabel')}</p>
        <p className="text-sm font-semibold text-fg tabular-nums">
          {entries.length}
          {hiddenCount > 0 && <span className="ml-1 text-xs font-medium text-fg-subtle">+{hiddenCount}</span>}
        </p>
      </div>
    </div>
  );
}

function CardCover({ onOpen }: { onOpen: () => void }) {
  const floatRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);

  useMotion(floatRef, FLOAT_KEYFRAMES, FLOAT_OPTIONS);
  useMotion(shineRef, COVER_SHINE_KEYFRAMES, COVER_SHINE_OPTIONS);

  function tilt(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.transform = `perspective(900px) rotateX(${(-y * COVER_TILT_DEGREES).toFixed(2)}deg) rotateY(${(x * COVER_TILT_DEGREES).toFixed(2)}deg) scale(1.02)`;
  }

  function resetTilt(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.transform = '';
  }

  return (
    <div ref={floatRef} className="relative z-10">
      <button
        type="button"
        onClick={onOpen}
        onPointerMove={tilt}
        onPointerLeave={resetTilt}
        aria-label={translate('scratch.openCard')}
        className={cx(
          cardFrameClass,
          'group block border border-primary/40 shadow-[0_30px_60px_-28px_var(--brand-primary)] transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none',
        )}
      >
        <span aria-hidden="true" className="absolute inset-0 [background-image:var(--brand-gradient)]" />
        <span aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_9px)]" />
        <span aria-hidden="true" className="absolute inset-0 bg-linear-to-br from-white/25 via-transparent to-black/45" />
        {coverSparkles.map((spot) => (
          <span
            key={`${spot.top}-${spot.left}`}
            aria-hidden="true"
            className="absolute size-1 animate-pulse rounded-full bg-black/60 motion-reduce:animate-none"
            style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}ms` }}
          />
        ))}
        <span ref={shineRef} aria-hidden="true" className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/35 to-transparent" />

        <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex size-20 items-center justify-center rounded-full bg-black/15 text-on-primary ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-8 motion-reduce:transition-none">
            <Icon name="gift" size={40} strokeWidth={1.4} />
          </span>
          <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium tracking-wide text-on-primary">{translate('scratch.scratchHere')}</span>
        </span>

        <span
          aria-hidden="true"
          className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-1.5 rounded-full bg-black/30 py-2 text-xs font-semibold tracking-wide text-on-primary backdrop-blur-sm"
        >
          {translate('scratch.tapToScratch')}
          <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </button>
    </div>
  );
}

const STAT_FLOAT_KEYFRAMES: Keyframe[] = [{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }];
const STAT_FLOAT_OPTIONS: KeyframeAnimationOptions = { duration: 2800, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };
// Offset so the two stat cards bob out of step with each other.
const STAT_FLOAT_DELAYED_OPTIONS: KeyframeAnimationOptions = { ...STAT_FLOAT_OPTIONS, delay: 1400 };
const STAT_SHINE_OPTIONS: KeyframeAnimationOptions = { ...COVER_SHINE_OPTIONS, duration: 3600 };
const STAT_COUNT_MS = 1100;
const STAT_TILT_DEGREES = 8;
const statSparkles = [
  { top: 18, left: 72, delay: 0 },
  { top: 70, left: 88, delay: 900 },
  { top: 40, left: 94, delay: 1700 },
];

interface StatCardProps {
  variant: 'gold' | 'glass';
  icon: IconName;
  label: string;
  hint: string;
  value: number;
  format: (value: number) => string;
  delayed: boolean;
}

function StatCard({ variant, icon, label, hint, value, format, delayed }: StatCardProps) {
  const floatRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const spinRef = useRef<HTMLSpanElement>(null);
  const shownValue = useAnimatedNumber(value, STAT_COUNT_MS);
  const isGold = variant === 'gold';

  useMotion(floatRef, STAT_FLOAT_KEYFRAMES, delayed ? STAT_FLOAT_DELAYED_OPTIONS : STAT_FLOAT_OPTIONS);
  useMotion(shineRef, COVER_SHINE_KEYFRAMES, STAT_SHINE_OPTIONS);
  useMotion(spinRef, BORDER_SPIN_KEYFRAMES, BORDER_SPIN_OPTIONS);

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.transform = `perspective(700px) rotateX(${(-y * STAT_TILT_DEGREES).toFixed(2)}deg) rotateY(${(x * STAT_TILT_DEGREES).toFixed(2)}deg) scale(1.03)`;
  }

  function resetTilt(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.transform = '';
  }

  return (
    <div ref={floatRef} className="min-w-0">
      <div
        onPointerMove={tilt}
        onPointerLeave={resetTilt}
        className={cx(
          'group relative isolate overflow-hidden rounded-[20px] shadow-[0_20px_40px_-26px_var(--brand-primary)] transition-transform duration-200 ease-out motion-reduce:transition-none',
          isGold && 'border border-primary/40',
        )}
      >
        {isGold ? (
          <>
            <span aria-hidden="true" className="absolute inset-0 -z-10 [background-image:var(--brand-gradient)]" />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_9px)]" />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-br from-white/25 via-transparent to-black/45" />
          </>
        ) : (
          <>
            <span
              ref={spinRef}
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -z-20 size-[260%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,var(--brand-primary)_320deg,transparent_360deg)]"
            />
            <span aria-hidden="true" className="absolute inset-[1.5px] -z-10 rounded-[18.5px] bg-surface-2" />
          </>
        )}
        {statSparkles.map((spot) => (
          <span
            key={`${spot.top}-${spot.left}`}
            aria-hidden="true"
            className={cx('absolute size-1 animate-pulse rounded-full motion-reduce:animate-none', isGold ? 'bg-black/60' : 'bg-white/70')}
            style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}ms` }}
          />
        ))}
        <span ref={shineRef} aria-hidden="true" className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />

        <div className="relative flex items-center gap-3 px-4 py-3">
          <span
            className={cx(
              'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-8 motion-reduce:transition-none',
              isGold
                ? 'bg-black/20 text-on-primary ring-1 ring-white/25'
                : 'text-on-primary shadow-[0_8px_20px_-10px_var(--brand-primary)] [background-image:var(--brand-gradient)]',
            )}
          >
            <Icon name={icon} size={18} />
          </span>
          <div className="min-w-0">
            <dt className={cx('truncate text-[10px] tracking-[0.14em] uppercase', isGold ? 'text-on-primary/75' : 'text-fg-subtle')}>{label}</dt>
            <dd className={cx('text-xl leading-tight font-bold tabular-nums', isGold ? 'text-on-primary' : 'text-fg')}>
              <span aria-hidden="true">{format(shownValue)}</span>
              <span className="sr-only">{format(value)}</span>
            </dd>
            <dd className={cx('text-[11px]', isGold ? 'text-on-primary/70' : 'text-fg-subtle')}>{hint}</dd>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryTimeline({ history, currency }: { history: ScratchHistoryEntry[]; currency: string }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-surface-2/25 px-6 py-12 text-center">
        <div aria-hidden="true" className="relative mb-6 h-20 w-32">
          <span className="absolute inset-0 translate-x-4 rotate-[8deg] rounded-2xl border border-dashed border-fg/20 bg-surface-2/50" />
          <span className="absolute inset-0 -rotate-[4deg] rounded-2xl opacity-85 shadow-[0_16px_30px_-18px_var(--brand-primary)] [background-image:var(--brand-gradient)]" />
          <Icon name="scratchCard" size={30} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] text-on-primary" />
        </div>
        <p className="text-base font-semibold text-fg">{translate('scratch.emptyTitle')}</p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">{translate('scratch.emptyText')}</p>
      </div>
    );
  }

  return (
    <ol className="relative ml-2 flex flex-col gap-3 border-l border-dashed border-fg/15 pl-6">
      {history.map((entry, index) => (
        <li key={`${entry.id}-${entry.scratchedAt}`} className="relative animate-rise motion-reduce:animate-none">
          <span aria-hidden="true" className="absolute top-1/2 -left-[31px] size-3 -translate-y-1/2 rounded-full bg-primary ring-4 ring-surface" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface-2/35 px-4 py-3">
            <span className="text-xs text-fg-subtle tabular-nums">#{history.length - index}</span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-primary">{entry.id}</p>
              <p className="text-xs text-fg-muted">{formatDate(entry.scratchedAt)}</p>
            </div>
            {entry.amount > 0 ? (
              <>
                <span className="font-semibold text-success tabular-nums">+{formatMoney(entry.amount, currency)}</span>
                <Badge tone="success" dot>
                  {translate('scratch.statusCredited')}
                </Badge>
              </>
            ) : (
              <Badge dot>{translate('scratch.statusNoWin')}</Badge>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

const PODIUM_RISE_KEYFRAMES: Keyframe[] = [
  { transform: 'scaleY(0)', opacity: 0 },
  { transform: 'scaleY(1.06)', opacity: 1, offset: 0.75 },
  { transform: 'scaleY(1)', opacity: 1 },
];
// Stable per-rank objects: useMotion restarts whenever its options object changes identity.
const PODIUM_RISE_OPTIONS: Record<number, KeyframeAnimationOptions> = {
  1: { duration: 800, delay: 380, easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'backwards' },
  2: { duration: 800, delay: 160, easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'backwards' },
  3: { duration: 800, delay: 560, easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'backwards' },
};
// DOM order stays 1-2-3 for screen readers; CSS order puts the champion in the middle.
const podiumStyle: Record<number, { order: string; pedestal: string; avatar: string }> = {
  1: { order: 'order-2', pedestal: 'h-28', avatar: 'size-16 text-lg' },
  2: { order: 'order-1', pedestal: 'h-20', avatar: 'size-12 text-sm' },
  3: { order: 'order-3', pedestal: 'h-14', avatar: 'size-12 text-sm' },
};
const PODIUM_SIZE = 3;

function initialOf(name: string): string {
  return name.charAt(0).toUpperCase();
}

function PodiumSpot({ leader, currency }: { leader: ScratchLeader; currency: string }) {
  const pedestalRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const isChampion = leader.rank === 1;
  const style = podiumStyle[leader.rank];

  // Refs stay unattached for non-champions, so these animations simply skip them.
  useMotion(pedestalRef, PODIUM_RISE_KEYFRAMES, PODIUM_RISE_OPTIONS[leader.rank]);
  useMotion(floatRef, FLOAT_KEYFRAMES, FLOAT_OPTIONS);
  useMotion(ringRef, BORDER_SPIN_KEYFRAMES, BORDER_SPIN_OPTIONS);
  useMotion(shineRef, COVER_SHINE_KEYFRAMES, COVER_SHINE_OPTIONS);

  return (
    <li className={cx('group flex min-w-0 flex-1 flex-col items-center', style.order)}>
      <div ref={isChampion ? floatRef : undefined} className="flex flex-col items-center">
        {isChampion && <Icon name="trophy" size={18} className="mb-1.5 text-primary drop-shadow-[0_0_8px_var(--brand-primary)]" />}
        <span className={cx('relative flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none', style.avatar)}>
          <span
            ref={isChampion ? ringRef : undefined}
            aria-hidden="true"
            className={cx(
              'absolute -inset-1 rounded-full',
              isChampion
                ? 'bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_35%,var(--brand-primary)_65%,transparent)] shadow-[0_0_24px_-4px_var(--brand-primary)]'
                : 'bg-fg/10',
            )}
          />
          <span aria-hidden="true" className={cx('relative flex size-full items-center justify-center rounded-full font-bold ring-2 ring-surface', medalClass[leader.rank])}>
            {initialOf(leader.name)}
          </span>
        </span>
      </div>

      <p className="mt-2.5 max-w-full truncate px-1 text-xs font-medium text-fg">{leader.name}</p>
      <p className={cx('text-sm font-semibold tabular-nums', isChampion ? 'text-primary' : 'text-success')}>{formatMoney(leader.amount, currency)}</p>

      <div
        ref={pedestalRef}
        className={cx(
          'relative mt-3 w-full origin-bottom overflow-hidden rounded-t-2xl border border-b-0',
          style.pedestal,
          isChampion
            ? 'border-primary/40 bg-linear-to-b from-primary/30 via-primary/10 to-transparent shadow-[0_-14px_40px_-18px_var(--brand-primary)]'
            : 'border-fg/10 bg-linear-to-b from-fg/[0.09] to-transparent',
        )}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
        {isChampion && (
          <span ref={shineRef} aria-hidden="true" className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/20 to-transparent" />
        )}
        <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-x-0 top-2 text-center text-3xl font-black tabular-nums',
            isChampion ? 'bg-clip-text text-transparent [background-image:var(--brand-gradient)]' : 'text-fg/20',
          )}
        >
          {leader.rank}
        </span>
      </div>
    </li>
  );
}

function LeaderRace({ leaders, currency }: { leaders: ScratchLeader[]; currency: string }) {
  const topAmount = Math.max(0, ...leaders.map((leader) => leader.amount));
  const podium = leaders.filter((leader) => leader.rank <= PODIUM_SIZE);
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2/25 px-3 pt-6 sm:px-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-48 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-ring-breathe motion-reduce:animate-none"
        />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
        <ol className="relative flex items-end gap-2 sm:gap-3">
          {podium.map((leader) => (
            <PodiumSpot key={leader.rank} leader={leader} currency={currency} />
          ))}
        </ol>
      </div>

      {chasers.length > 0 && (
        <ol start={PODIUM_SIZE + 1} className="flex flex-col gap-2">
          {chasers.map((leader) => {
            const share = topAmount > 0 ? (leader.amount / topAmount) * 100 : 0;
            return (
              <li
                key={leader.rank}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/30 px-3.5 py-3 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 motion-reduce:transition-none"
              >
                <span className="w-7 shrink-0 text-center text-xs font-semibold text-fg-subtle tabular-nums">#{leader.rank}</span>
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-fg-muted ring-1 ring-line">
                  {initialOf(leader.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-fg">{leader.name}</span>
                    <span className="text-sm font-semibold text-success tabular-nums">{formatMoney(leader.amount, currency)}</span>
                  </div>
                  <ProgressBar value={share} label={translate('scratch.shareOfLeader', { name: leader.name })} size="sm" className="mt-2.5" />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function ScratchCardPage() {
  const { data, isLoading } = useScratchCard();
  const [sessionWins, setSessionWins] = useState<ScratchHistoryEntry[]>([]);
  const [activeCard, setActiveCard] = useState<ScratchCardItem | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[26rem] rounded-[28px]" />
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

  const scratchedIds = new Set(sessionWins.map((entry) => entry.id));
  const readyCards = data.cards.filter((card) => card.state === 'ready' && !scratchedIds.has(card.id));
  const featuredCard = readyCards[0];
  const lockedCards = data.cards.filter((card) => card.state === 'locked');
  const deckCards = [...readyCards.slice(1), ...lockedCards];
  const nextLockedCard = lockedCards.reduce<ScratchCardItem | undefined>(
    (soonest, card) => (!soonest || card.unlocksInSeconds < soonest.unlocksInSeconds ? card : soonest),
    undefined,
  );

  function handleReveal(card: ScratchCardItem) {
    setSessionWins((current) => [{ id: card.id, scratchedAt: new Date().toISOString(), amount: card.reward }, ...current]);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={panelClass}>
        <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 -z-10 size-96 rounded-full bg-primary/15 blur-3xl" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_right,black,transparent_70%)]"
        />

        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <RevealedTray entries={sessionWins} currency={currency} />

          <div className="relative flex items-center justify-center py-6">
            <span aria-hidden="true" className="absolute size-72 rounded-full border border-primary/15 animate-ring-breathe motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute size-56 rounded-full border border-dashed border-primary/20" />
            <OrbitDot sizeClass="size-72" reverse={false} />
            <OrbitDot sizeClass="size-56" reverse />
            <div className="relative w-full max-w-[15rem]">
              {deckCards.slice(0, DECK_DEPTH).map((card, index) => (
                <DeckGhost key={card.id} card={card} index={index} />
              ))}
              {featuredCard ? <CardCover key={featuredCard.id} onOpen={() => setActiveCard(featuredCard)} /> : <LockedFace />}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] xl:items-start">
              <div className="flex min-w-0 flex-col gap-6">
                <div>
                  <p className={cx(captionClass, 'text-primary')}>{translate('scratch.rewardsEyebrow')}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{translate('scratch.cardsTitle')}</h2>
                  <p className="mt-2 max-w-md text-sm text-fg-muted">{translate('scratch.cardsText')}</p>
                </div>

                {nextLockedCard && (
                  <div>
                    <p className={cx(captionClass, 'mb-2.5 flex items-center gap-1.5')}>
                      <Icon name="lock" size={12} />
                      {translate('scratch.nextCardLabel')}
                    </p>
                    <CountdownClock seconds={nextLockedCard.unlocksInSeconds} />
                  </div>
                )}
              </div>

              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard
                  variant="gold"
                  icon="wallet"
                  label={translate('scratch.totalWon')}
                  hint={translate('scratch.allTime')}
                  value={totalWon}
                  format={(amount) => formatMoney(amount, currency)}
                  delayed={false}
                />
                <StatCard
                  variant="glass"
                  icon="history"
                  label={translate('scratch.historyEntries')}
                  hint={translate('scratch.redemptions')}
                  value={history.length}
                  format={(count) => String(Math.round(count))}
                  delayed
                />
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">{translate('scratch.statsTitle')}</h3>
              <p className="mt-0.5 text-xs text-fg-muted">{translate('scratch.statsText')}</p>

              <div className="mt-3 rounded-2xl border border-fg/10 bg-surface-2/40 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={captionClass}>{translate('scratch.lotsAccumulated')}</p>
                  <span className="text-xs text-fg-muted">{translate('scratch.towardNext')}</span>
                </div>
                <p className="mt-1 text-xl font-semibold text-fg tabular-nums">
                  {formatMoney(data.lotsAccumulated, currency)}
                  <span className="text-sm font-medium text-fg-subtle"> / {formatMoney(data.lotsTarget, currency)}</span>
                </p>

              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Panel
          icon="history"
          title={translate('scratch.historyTitle')}
          aside={
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs">
              <span className="tracking-[0.1em] text-fg-subtle uppercase">{translate('scratch.totalWon')}</span>
              <span className="font-semibold text-primary tabular-nums">{formatMoney(totalWon, currency)}</span>
            </span>
          }
        >
          <HistoryTimeline history={history} currency={currency} />
        </Panel>

        <Panel
          icon="trophy"
          title={translate('scratch.leaderboardTitle')}
          description={translate('scratch.leaderboardText')}
          aside={<Badge tone="primary">{translate('scratch.entries', { count: data.leaders.length })}</Badge>}
        >
          <LeaderRace leaders={data.leaders} currency={currency} />
        </Panel>
      </div>

      <ScratchDialog card={activeCard} currency={currency} onRevealed={handleReveal} onClose={() => setActiveCard(null)} />
    </div>
  );
}
