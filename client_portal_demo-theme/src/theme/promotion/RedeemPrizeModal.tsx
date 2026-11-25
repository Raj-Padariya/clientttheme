'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { prefersReducedMotion } from './ScratchExperience';

type Step = 'confirm' | 'done';

const redeemText = {
  caption: 'REDEEM PRIZE',
  value: (amount: string) => `${amount} value`,
  stepConfirm: 'Confirm',
  stepDone: 'Done',
  confirmTitle: 'Step 1: Confirm Redemption',
  item: 'Item',
  quantity: 'Quantity',
  warning: 'Once redeemed, this claim will be processed and your stock will be adjusted.',
  cancel: 'Cancel',
  continue: 'Yes, Continue',
  successTitle: 'Redemption Successful!',
  processing: (name: string) => `Your ${name} is being processed.`,
  reference: 'REFERENCE NUMBER',
  updates: 'You will receive status updates via email and the "Past Wins" section.',
  done: 'Done',
  confirmed: 'CONFIRMED',
};

const STEPS: { id: Step; label: string }[] = [
  { id: 'confirm', label: redeemText.stepConfirm },
  { id: 'done', label: redeemText.stepDone },
];

const CONFETTI_COUNT = 30;
const CONFETTI_TONES = ['bg-primary', 'bg-success', 'bg-fg', 'bg-warning', 'bg-primary'];
const SCRAMBLE_STEP_MS = 45;
const SCRAMBLE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

/** Confetti flight paths, spread round the full circle with deterministic jitter (no Math.random, so renders are stable). */
const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, index) => {
  const angle = ((index * 360) / CONFETTI_COUNT + ((index * 37) % 17)) * (Math.PI / 180);
  const distance = 95 + ((index * 53) % 70);
  return {
    id: index,
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance * 0.8 - 20),
    rotate: ((index * 97) % 540) - 270,
    delay: (index % 6) * 25,
    tone: CONFETTI_TONES[index % CONFETTI_TONES.length],
    shape: index % 3 === 0 ? 'size-2 rounded-full' : index % 3 === 1 ? 'h-3 w-1.5 rounded-[2px]' : 'size-1.5 rotate-45 rounded-[1px]',
  };
});

/** Twinkling stars that keep sparkling round the badge after the burst. */
const STARS = [
  { position: 'top-1 left-6', delay: 0.9 },
  { position: 'top-6 right-2', delay: 1.4 },
  { position: 'bottom-3 left-1', delay: 1.9 },
  { position: 'bottom-0 right-8', delay: 1.1 },
];

/** Slot-machine reveal: every character spins through random glyphs, then locks in from left to right. */
function useScrambledText(target: string) {
  const [shown, setShown] = useState(target);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      // The first 8 ticks are pure spin; after that one more character locks every other tick.
      const locked = Math.max(0, Math.floor((tick - 8) / 2));
      setShown(
        target
          .split('')
          .map((char, index) => (index < locked || char === '-' ? char : SCRAMBLE_GLYPHS[(tick * 7 + index * 13) % SCRAMBLE_GLYPHS.length]))
          .join(''),
      );
      if (locked >= target.length) window.clearInterval(timer);
    }, SCRAMBLE_STEP_MS);
    return () => window.clearInterval(timer);
  }, [target]);
  return shown;
}

function SuccessStep({ name, reference }: { name: string; reference: string }) {
  const shownReference = useScrambledText(reference);
  const isSettled = shownReference === reference;
  const titleWords = redeemText.successTitle.split(' ');

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative grid size-36 place-items-center">
        {/* Soft success glow pulsing behind everything. */}
        <span aria-hidden="true" className="absolute inset-0 animate-glow rounded-full bg-success/20 blur-2xl motion-reduce:animate-none" />
        {/* Two shockwaves leaving the badge as it lands. */}
        {[0, 0.6].map((delay) => (
          <span key={delay} aria-hidden="true" style={{ animationDelay: `${delay}s` }} className="absolute inset-4 animate-ring-ripple rounded-full ring-2 ring-success/60 [animation-duration:2.4s] motion-reduce:hidden" />
        ))}
        {/* Turning dashed halo + a conic light sweep. */}
        <span aria-hidden="true" className="absolute inset-1 animate-orbit rounded-full border-2 border-dashed border-success/30 [animation-duration:14s] motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-3 animate-orbit rounded-full bg-[conic-gradient(from_0deg,transparent,color-mix(in_srgb,var(--color-success,#22c55e)_55%,transparent),transparent_40%)] [animation-duration:2.8s] [mask-image:radial-gradient(circle,transparent_58%,black_60%)] motion-reduce:hidden" />

        {CONFETTI.map((piece) => (
          <span
            key={piece.id}
            aria-hidden="true"
            style={{ '--dx': `${piece.dx}px`, '--dy': `${piece.dy}px`, '--rot': `${piece.rotate}deg`, animationDelay: `${piece.delay}ms` } as CSSProperties}
            className={cx('absolute top-1/2 left-1/2 animate-confetti-burst motion-reduce:hidden', piece.tone, piece.shape)}
          />
        ))}
        {/* Four-point stars drawn with clip-path (the icon set has no sparkle glyph). */}
        {STARS.map((star) => (
          <span
            key={star.position}
            aria-hidden="true"
            style={{ animationDelay: `${star.delay}s` }}
            className={cx('absolute size-3.5 animate-twinkle bg-primary [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)] motion-reduce:hidden', star.position)}
          />
        ))}

        <span className="relative grid size-24 animate-pop-in place-items-center rounded-full bg-linear-to-br from-success to-success/60 text-on-primary shadow-[0_18px_40px_-12px_var(--color-success,#22c55e)] ring-4 ring-success/25 motion-reduce:animate-none">
          <span aria-hidden="true" className="absolute inset-1.5 rounded-full ring-1 ring-on-primary/30" />
          <svg viewBox="0 0 24 24" className="relative size-12" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" pathLength={1} strokeDasharray={1} style={{ animationDuration: '0.7s', animationDelay: '0.45s' }} className="animate-draw motion-reduce:animate-none" />
          </svg>
        </span>
      </div>

      <div>
        <h3 className="text-2xl font-black text-success">
          {titleWords.map((word, index) => (
            <span key={word} style={{ animationDelay: `${0.5 + index * 0.12}s` }} className="inline-block animate-word motion-reduce:animate-none">
              {word}
              {index < titleWords.length - 1 && '\u00a0'}
            </span>
          ))}
        </h3>
        <p style={{ animationDelay: '0.85s' }} className="mt-1 animate-rise text-sm text-fg-muted motion-reduce:animate-none">
          {redeemText.processing(name)}
        </p>
      </div>

      {/* Reference ticket: perforated stub, scanning beam, and a stamp that lands once the code locks in. */}
      <div style={{ animationDelay: '0.7s' }} className="relative w-full animate-rise motion-reduce:animate-none">
        <div className={cx('relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/15 via-surface-2 to-surface-2 px-4 py-4 ring-1 transition-[box-shadow] duration-500', isSettled ? 'shadow-[0_0_30px_-8px_var(--brand-primary)] ring-primary/50' : 'ring-primary/25')}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-sweep bg-linear-to-r from-transparent via-primary/25 to-transparent [animation-iteration-count:infinite] [animation-duration:2.6s] motion-reduce:hidden" />
          <span aria-hidden="true" className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full bg-elevated ring-1 ring-primary/25" />
          <span aria-hidden="true" className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full bg-elevated ring-1 ring-primary/25" />
          <p className="relative text-[10px] font-semibold tracking-[0.24em] text-fg-subtle">{redeemText.reference}</p>
          <p aria-live="polite" aria-label={reference} className={cx('relative mt-1 font-mono text-3xl font-black tracking-[0.14em] tabular-nums transition-colors duration-300', isSettled ? 'text-primary drop-shadow-[0_0_12px_var(--brand-primary)]' : 'text-fg/70')}>
            {shownReference}
          </p>
          {isSettled && (
            <span className="absolute top-2 right-3 inline-flex animate-pop-in items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[9px] font-black tracking-[0.18em] text-success ring-1 ring-success/40 [rotate:-8deg] motion-reduce:animate-none">
              <Icon name="check" size={10} />
              {redeemText.confirmed}
            </span>
          )}
        </div>
      </div>

      <p style={{ animationDelay: '1s' }} className="animate-rise text-xs leading-relaxed text-fg-muted motion-reduce:animate-none">
        {redeemText.updates}
      </p>
    </div>
  );
}

function StepTrack({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.id === step);
  return (
    <ol className="relative grid grid-cols-2 gap-3">
      {STEPS.map((item, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={item.id}
            aria-current={isCurrent ? 'step' : undefined}
            className={cx(
              'relative flex items-center gap-2.5 overflow-hidden rounded-2xl px-3 py-2.5 ring-1 transition-colors duration-500',
              isDone && 'bg-success-soft/50 ring-success/40',
              isCurrent && 'bg-primary-soft ring-primary/40',
              !isDone && !isCurrent && 'bg-surface-2/60 ring-line',
            )}
          >
            {isCurrent && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
            <span
              className={cx(
                'relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums',
                isDone ? 'bg-success text-on-primary' : isCurrent ? 'bg-primary text-on-primary' : 'bg-surface text-fg-subtle ring-1 ring-line',
              )}
            >
              {isCurrent && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/60 motion-reduce:hidden" />}
              {isDone ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <span className={cx('relative text-xs font-semibold tracking-[0.12em] uppercase', isCurrent ? 'text-primary' : isDone ? 'text-success' : 'text-fg-subtle')}>{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RedeemPrizeModal({
  name,
  icon,
  value,
  quantity,
  currency,
  onConfirm,
  onClose,
}: {
  name: string;
  icon: IconName;
  value: number;
  quantity: number;
  currency: string;
  /** Records the redemption and returns its reference number. */
  onConfirm: () => string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('confirm');
  const [reference, setReference] = useState('');

  function confirm() {
    setReference(onConfirm());
    setStep('done');
  }

  const title = (
    <span className="flex items-center gap-3">
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
        <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <Icon name={icon} size={20} className="relative" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] font-bold tracking-[0.2em] text-fg-subtle">{redeemText.caption}</span>
        <span className="truncate text-lg font-bold text-fg">{name}</span>
      </span>
    </span>
  );

  const footer =
    step === 'confirm' ? (
      <>
        <Button type="button" variant="outline" onClick={onClose}>
          {redeemText.cancel}
        </Button>
        <Button type="button" onClick={confirm} className="group/redeem relative overflow-hidden">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span className="relative font-semibold">{redeemText.continue}</span>
          <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/redeem:translate-x-1" />
        </Button>
      </>
    ) : (
      <Button type="button" fullWidth onClick={onClose}>
        {redeemText.done}
      </Button>
    );

  return (
    <Modal open onClose={onClose} title={title} description={redeemText.value(formatMoney(value, currency))} footer={footer}>
      <div className="flex flex-col gap-5">
        <StepTrack step={step} />

        {step === 'confirm' ? (
          <div key="confirm" className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
            <h3 className="text-base font-bold text-primary">{redeemText.confirmTitle}</h3>

            {/* Claim slip: item and quantity on a ticket with a torn edge. */}
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/15 via-surface-2 to-surface-2 ring-1 ring-primary/25">
              <Icon name={icon} size={110} aria-hidden="true" className="pointer-events-none absolute -right-5 -bottom-6 -rotate-12 text-primary/[0.08]" />
              <dl className="relative grid grid-cols-[minmax(0,1fr)_auto]">
                <div className="px-4 py-3.5">
                  <dt className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{redeemText.item}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-fg">{name}</dd>
                </div>
                <div className="border-l border-dashed border-primary/30 px-5 py-3.5 text-center">
                  <dt className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{redeemText.quantity}</dt>
                  <dd className="mt-0.5 text-2xl leading-none font-black tabular-nums text-primary">{quantity}</dd>
                </div>
              </dl>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-3.5 ring-1 ring-warning/30">
              <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-warning text-surface">
                <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full text-warning motion-reduce:hidden" />
                <Icon name="info" size={14} className="relative" />
              </span>
              <p className="text-xs leading-relaxed text-warning">{redeemText.warning}</p>
            </div>
          </div>
        ) : (
          <SuccessStep key="done" name={name} reference={reference} />
        )}
      </div>
    </Modal>
  );
}
