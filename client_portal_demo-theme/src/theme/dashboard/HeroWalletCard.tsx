'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { brandConfig } from '@/core/broker/config';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { Wallet } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

const COUNT_UP_MS = 1200;
const ROSETTE_PETALS = 18;
const TILT_DEG = 8;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Eases from 0 to target on mount. The state starts at the final value (what the server renders);
// the first frames are covered by the hero's rise-in, so the reset to 0 is not seen.
export function useCountUp(target: number): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const duration = prefersReducedMotion() ? 0 : COUNT_UP_MS;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

// "$1,090.00" → "$1,090" + a smaller, dimmer ".00", as on the reference card.
function CardAmount({ amount, currency }: { amount: number; currency: string }) {
  const formatted = formatMoney(amount, currency);
  const decimalIndex = formatted.lastIndexOf('.');
  if (decimalIndex === -1) return <>{formatted}</>;
  return (
    <>
      {formatted.slice(0, decimalIndex)}
      <span className="text-[0.55em] text-hero-dim">{formatted.slice(decimalIndex)}</span>
    </>
  );
}

const cardText = {
  title: 'Client Wallet',
  active: 'Active',
  details: 'Wallet details',
  holder: 'Holder',
  currency: 'Currency',
  status: 'Status',
  balance: 'Balance',
  showBalance: 'Show balance',
  hideBalance: 'Hide balance',
  flipToDetails: 'Show wallet details',
  flipToFront: 'Back to balance',
  flip: 'Flip',
  back: 'Back',
};

const MASKED_BALANCE = '••••••';

// Fixed twinkle positions (percent of the card) so server and client render the same sky.
const sparkles = [
  { top: 18, left: 38, size: 6, delay: 0 },
  { top: 30, left: 62, size: 4, delay: 900 },
  { top: 12, left: 74, size: 5, delay: 1800 },
  { top: 52, left: 54, size: 3, delay: 2600 },
  { top: 70, left: 46, size: 4, delay: 1300 },
  { top: 40, left: 84, size: 5, delay: 3200 },
];

const quickActions: { href: string; icon: IconName; label: string }[] = [
  { href: '/deposit', icon: 'deposit', label: translate('nav.deposit') },
  { href: '/withdrawal', icon: 'withdrawal', label: translate('nav.withdrawal') },
  { href: '/wallet-history', icon: 'history', label: translate('nav.walletHistory') },
];

const faceClass =
  'wallet-card relative isolate flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] p-6 text-hero-txt shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9),0_18px_40px_-28px_var(--wallet-gold)] [backface-visibility:hidden] [grid-area:1/1] sm:p-7';

// Banknote-style guilloche rosette: fine gold ellipses turned around one centre, spinning very slowly,
// with a glowing dot orbiting its outer ring and one soft ripple leaving it.
function RosetteBackdrop({ className = '-right-20 -bottom-24' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('pointer-events-none absolute -z-10 size-[260px] sm:size-[300px]', className)}>
      <span className="wallet-ring-band absolute -inset-6 rounded-full opacity-50 animate-ring-breathe motion-reduce:animate-none" />
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full animate-[orbit_90s_linear_infinite] opacity-45 motion-reduce:animate-none">
        <g fill="none" stroke="var(--wallet-gold)" strokeWidth="0.45">
          {Array.from({ length: ROSETTE_PETALS }, (_, petal) => (
            <ellipse key={petal} cx="100" cy="100" rx="92" ry="34" transform={`rotate(${(180 / ROSETTE_PETALS) * petal} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r="98" strokeWidth="1.1" />
          <circle cx="100" cy="100" r="34" strokeWidth="0.8" />
        </g>
      </svg>
      <span className="absolute inset-0 rounded-full border border-hero-buy/50 opacity-0 animate-ring-ripple motion-reduce:hidden" />
      <span className="absolute inset-[1%] rounded-full animate-orbit motion-reduce:animate-none">
        <span className="wallet-orbit-tail absolute inset-0 rounded-full" />
        <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hero-buy shadow-[0_0_14px_4px_color-mix(in_srgb,var(--wallet-gold)_70%,transparent)]" />
      </span>
    </span>
  );
}

// Shared light layers: brushed grain, sweeping sheen, cursor-following foil and glare, spinning gold rim.
function CardSurface() {
  return (
    <>
      <span aria-hidden="true" className="wallet-glow pointer-events-none absolute -top-24 -left-20 -z-10 size-64 animate-drift rounded-full opacity-60 motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.018)_0_1px,transparent_1px_3px)]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <span className="wallet-sheen absolute inset-0 animate-wallet-shine motion-reduce:hidden" />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-color-dodge transition-opacity duration-500 group-hover:opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(115deg, transparent 30%, rgb(255 214 140 / 0.7) 42%, rgb(196 150 255 / 0.45) 50%, rgb(120 225 210 / 0.45) 57%, transparent 70%)',
          backgroundSize: '260% 260%',
          backgroundPosition: 'var(--mx, 40%) var(--my, 40%)',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(320px circle at var(--mx, 50%) var(--my, 0%), rgb(255 240 210 / 0.14), transparent 65%)' }}
      />
      <span aria-hidden="true" className="wallet-rim pointer-events-none absolute inset-0 rounded-[inherit] animate-rim-spin motion-reduce:animate-none" />
    </>
  );
}

// Four-point gold stars that twinkle in turn.
function Stardust() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {sparkles.map((star) => (
        <span
          key={`${star.top}-${star.left}`}
          className="absolute animate-ping-soft motion-reduce:hidden"
          style={{ top: `${star.top}%`, left: `${star.left}%`, width: star.size, height: star.size, animationDelay: `${star.delay}ms`, animationDuration: '3.6s' }}
        >
          <span className="absolute inset-0 rotate-45 bg-hero-buy [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)] shadow-[0_0_8px_var(--wallet-gold)]" />
        </span>
      ))}
    </span>
  );
}

function ActiveDot() {
  return (
    <span aria-hidden="true" className="relative size-1.5">
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-hero-up/60 motion-reduce:hidden" />
      <span className="absolute inset-0 rounded-full bg-hero-up" />
    </span>
  );
}

interface HeroWalletCardProps {
  wallet: Wallet;
  holderName: string;
  className?: string;
}

export function HeroWalletCard({ wallet, holderName, className }: HeroWalletCardProps) {
  const displayedBalance = useCountUp(wallet.balance);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  // Until the first flip, the card peeks once on load and the flip button pulses, so users learn it turns over.
  const [hasFlipped, setHasFlipped] = useState(false);
  const frontTab = isFlipped ? -1 : 0;
  const backTab = isFlipped ? 0 : -1;

  // Written straight to CSS variables so following the cursor never re-renders the card.
  function tilt(event: PointerEvent<HTMLDivElement>) {
    const card = tiltRef.current;
    if (!card || event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
    card.style.setProperty('--rx', `${(0.5 - y) * TILT_DEG}deg`);
    card.style.setProperty('--ry', `${(x - 0.5) * TILT_DEG}deg`);
  }

  function untilt() {
    tiltRef.current?.style.setProperty('--rx', '0deg');
    tiltRef.current?.style.setProperty('--ry', '0deg');
  }

  const eyeButton = (tabIndex: number) => (
    <button
      type="button"
      tabIndex={tabIndex}
      aria-pressed={isHidden}
      aria-label={isHidden ? cardText.showBalance : cardText.hideBalance}
      title={isHidden ? cardText.showBalance : cardText.hideBalance}
      onClick={() => setIsHidden((hidden) => !hidden)}
      className="grid size-7 place-items-center rounded-full text-hero-mute transition-colors hover:bg-hero-tile hover:text-hero-buy focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon name={isHidden ? 'eyeOff' : 'eye'} size={15} />
    </button>
  );

  return (
    <div className={cx('w-full max-w-[560px] [perspective:1200px]', className)}>
      <div
        ref={tiltRef}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className="group relative w-full transition-transform duration-300 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] motion-reduce:transition-none"
      >
        <div
          className={cx(
            'grid min-h-[210px] w-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] sm:aspect-[1.75] motion-reduce:transition-none',
            isFlipped && '[transform:rotateY(180deg)]',
            !hasFlipped && 'animate-card-peek motion-reduce:animate-none',
          )}
        >
          <div aria-hidden={isFlipped} className={faceClass}>
            <CardSurface />
            <RosetteBackdrop />
            <Stardust />

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
                  <span className="absolute inset-0 animate-ping-soft rounded-[12px] bg-hero-buy/25 [animation-duration:3s] motion-reduce:hidden" />
                  <span className="wallet-chip relative grid size-11 place-items-center rounded-[12px] text-black/65 shadow-[0_2px_8px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.45)]">
                    <Icon name="wallet" size={22} />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-hero-txt">{cardText.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-hero-up">
                    <ActiveDot />
                    {cardText.active}
                  </span>
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex items-center gap-2 truncate text-[12px] font-semibold tracking-[0.22em] text-hero-mute uppercase">
                  <span aria-hidden="true" className="size-1.5 rotate-45 bg-hero-buy shadow-[0_0_8px_var(--wallet-gold)]" />
                  {brandConfig.brandName}
                </span>
                <button
                  type="button"
                  tabIndex={frontTab}
                  aria-label={cardText.flipToDetails}
                  title={cardText.flipToDetails}
                  onClick={() => {
                    setIsFlipped(true);
                    setHasFlipped(true);
                  }}
                  className="group/flip relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-hero-buy/40 bg-hero-buy/10 pr-3.5 pl-2.5 text-[11px] font-semibold tracking-[0.14em] text-hero-buy uppercase backdrop-blur transition-[background-color,border-color] duration-300 hover:border-hero-buy/70 hover:bg-hero-buy/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {!hasFlipped && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full border border-hero-buy/60 [animation-duration:2.4s] motion-reduce:hidden" />}
                  <Icon name="refresh" size={14} className="transition-transform duration-500 group-hover/flip:rotate-180 motion-reduce:transition-none" />
                  {cardText.flip}
                </button>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-1.5">
              <p className="text-[11px] tracking-[0.18em] text-hero-mute uppercase">{translate('wallet.availableBalance')}</p>
              {eyeButton(frontTab)}
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-hero-buy/12 px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.16em] text-hero-buy ring-1 ring-hero-buy/30">
                <span aria-hidden="true" className="size-1 rounded-full bg-hero-buy shadow-[0_0_6px_var(--wallet-gold)]" />
                {wallet.currency}
              </span>
            </div>
            <p className="mt-1 truncate text-[clamp(38px,4vw,54px)] leading-[1.05] font-medium tracking-tight tabular-nums drop-shadow-[0_2px_10px_color-mix(in_srgb,var(--wallet-gold)_25%,transparent)]">
              {isHidden ? (
                <span key="masked" className="inline-block animate-pop-in tracking-[0.12em] text-hero-mute motion-reduce:animate-none">
                  {MASKED_BALANCE}
                </span>
              ) : (
                <span key="amount" className="inline-block animate-pop-in bg-linear-to-b from-hero-txt via-hero-txt to-hero-buy/70 bg-clip-text text-transparent motion-reduce:animate-none">
                  <CardAmount amount={displayedBalance} currency={wallet.currency} />
                </span>
              )}
            </p>

            {/* The bottom-right corner is left empty on purpose: it belongs to the rosette. */}
            <p className="mt-5 truncate font-mono text-[13px] font-semibold tracking-[0.18em] text-hero-mute uppercase [text-shadow:0_1px_0_rgb(255_255_255/0.08)]">{holderName}</p>
          </div>

          <div aria-hidden={!isFlipped} className={cx(faceClass, '[transform:rotateY(180deg)]')}>
            <CardSurface />
            <RosetteBackdrop className="-top-28 -left-24" />

            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.22em] text-hero-mute uppercase">
                <Icon name="wallet" size={14} className="text-hero-buy" />
                {cardText.details}
              </p>
              <button
                type="button"
                tabIndex={backTab}
                aria-label={cardText.flipToFront}
                title={cardText.flipToFront}
                onClick={() => setIsFlipped(false)}
                className="group/flip inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-hero-line-hi bg-hero-tile/70 pr-3.5 pl-2.5 text-[11px] font-semibold tracking-[0.14em] text-hero-mute uppercase backdrop-blur transition-[color,border-color] duration-300 hover:border-hero-buy/60 hover:text-hero-buy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon name="refresh" size={14} className="transition-transform duration-500 group-hover/flip:-rotate-180 motion-reduce:transition-none" />
                {cardText.back}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hero-line bg-hero-line">
              {[
                { label: cardText.holder, value: <span className="font-mono tracking-[0.08em] uppercase">{holderName}</span> },
                { label: cardText.currency, value: wallet.currency },
                {
                  label: cardText.status,
                  value: (
                    <span className="inline-flex items-center gap-1.5 text-hero-up">
                      <ActiveDot />
                      {cardText.active}
                    </span>
                  ),
                },
                {
                  label: cardText.balance,
                  value: (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      {isHidden ? MASKED_BALANCE : formatMoney(wallet.balance, wallet.currency)}
                      {eyeButton(backTab)}
                    </span>
                  ),
                },
              ].map((fact) => (
                <div key={fact.label} className="min-w-0 bg-hero-tile/80 px-3 py-2 backdrop-blur">
                  <dt className="text-[10px] tracking-[0.14em] text-hero-mute uppercase">{fact.label}</dt>
                  <dd className="mt-0.5 flex h-7 items-center truncate text-sm font-semibold text-hero-txt">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <nav aria-label={cardText.details} className="mt-auto grid grid-cols-3 gap-2 pt-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  tabIndex={backTab}
                  className="group/action flex flex-col items-center gap-1.5 rounded-2xl border border-hero-line bg-hero-tile/60 px-2 py-2.5 text-[11px] font-semibold text-hero-mute backdrop-blur transition-[color,border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-hero-buy/50 hover:text-hero-txt focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-hero-buy/15 text-hero-buy ring-1 ring-hero-buy/30 transition-transform duration-300 group-hover/action:scale-110">
                    <Icon name={action.icon} size={15} />
                  </span>
                  <span className="truncate">{action.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
