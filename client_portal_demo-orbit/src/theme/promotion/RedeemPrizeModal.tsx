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

const CONFETTI_COUNT = 26;
const CONFETTI_TONES = ['bg-primary', 'bg-[var(--orbit-violet)]', 'bg-fg', 'bg-success', 'bg-primary'];
const SCRAMBLE_STEP_MS = 45;
const SCRAMBLE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
// Width of the claim pass's tear-off quantity stub; the perforation notches sit on its edge.
const STUB_WIDTH = '6.5rem';

/** Confetti flight paths, spread round the full circle with deterministic jitter (no Math.random, so renders are stable). */
const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, index) => {
  const angle = ((index * 360) / CONFETTI_COUNT + ((index * 37) % 17)) * (Math.PI / 180);
  const distance = 100 + ((index * 53) % 60);
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

/** Three orbits around the success planet, each with its own satellite and direction. */
const SUCCESS_ORBITS = [
  { inset: 'inset-0', spin: 'animate-orbit-spin', dot: 'top-1/2 -left-1 size-2.5 -translate-y-1/2 bg-primary shadow-[0_0_10px_var(--brand-primary)]', delay: '0s' },
  { inset: 'inset-[14px]', spin: 'animate-orbit-spin-rev', dot: '-top-1 left-1/2 size-2 -translate-x-1/2 bg-[var(--orbit-violet)] shadow-[0_0_8px_var(--orbit-violet)]', delay: '0.12s' },
  { inset: 'inset-[28px]', spin: 'animate-orbit-spin-fast', dot: '-bottom-1 left-1/2 size-1.5 -translate-x-1/2 bg-success shadow-[0_0_8px_var(--color-success)]', delay: '0.24s' },
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

/**
 * Split-flap board: every character drops onto its own hinged tile while the scramble runs, a tile punches
 * when it locks on its final character, and once the whole code is in, the characters hop in a slow wave.
 */
function FlapBoard({ text, target, isSettled }: { text: string; target: string; isSettled: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex flex-wrap justify-center gap-1">
      {text.split('').map((char, index) => {
        if (char === '-') return <span key={index} className="mx-0.5 h-1 w-2.5 self-center rounded-full bg-primary/60" />;
        const isLocked = char === target[index];
        return (
          <span
            key={`${index}-${isLocked}`}
            className={cx(
              'relative grid h-11 w-8 place-items-center overflow-hidden rounded-lg font-mono text-xl font-black ring-1 transition-[color,background-color,box-shadow] duration-300',
              isLocked ? 'animate-flap-lock bg-primary-soft text-primary ring-primary/40 shadow-[0_0_14px_-4px_var(--brand-primary)] motion-reduce:animate-none' : 'bg-surface-2 text-fg/60 ring-line',
            )}
          >
            <span className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.04]" />
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
            <span style={{ animationDelay: `${index * 90}ms` }} className={cx('relative', isSettled && 'animate-flap-wave motion-reduce:animate-none')}>
              <span key={char} className="block animate-flap-flip motion-reduce:animate-none">
                {char}
              </span>
            </span>
          </span>
        );
      })}
      {isSettled && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          <span className="absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 animate-sweep bg-linear-to-r from-transparent via-white/25 to-transparent [animation-duration:3.2s] [animation-iteration-count:infinite] motion-reduce:hidden" />
        </span>
      )}
    </span>
  );
}

function SuccessStep({ name, reference }: { name: string; reference: string }) {
  const shownReference = useScrambledText(reference);
  const isSettled = shownReference === reference;
  const titleWords = redeemText.successTitle.split(' ');

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Orbital lock: three orbits close in on the prize planet, satellites keep circling after the burst. */}
      <div className="relative grid size-40 place-items-center">
        <span aria-hidden="true" className="absolute inset-6 animate-pulse-ring rounded-full bg-primary/20 blur-2xl motion-reduce:animate-none" />
        {SUCCESS_ORBITS.map((orbit) => (
          <span key={orbit.inset} aria-hidden="true" style={{ animationDelay: orbit.delay }} className={cx('absolute animate-pop-in motion-reduce:animate-none', orbit.inset)}>
            <span className={cx('orbit-ring absolute inset-0 motion-reduce:animate-none', orbit.spin)}>
              <span className={cx('absolute rounded-full', orbit.dot)} />
            </span>
          </span>
        ))}

        {CONFETTI.map((piece) => (
          <span
            key={piece.id}
            aria-hidden="true"
            style={{ '--dx': `${piece.dx}px`, '--dy': `${piece.dy}px`, '--rot': `${piece.rotate}deg`, animationDelay: `${piece.delay}ms` } as CSSProperties}
            className={cx('absolute top-1/2 left-1/2 animate-confetti-burst motion-reduce:hidden', piece.tone, piece.shape)}
          />
        ))}

        <span className="relative grid size-20 animate-pop-in place-items-center rounded-full text-on-primary shadow-[0_18px_44px_-12px_var(--brand-primary)] [background-image:var(--brand-gradient)] motion-reduce:animate-none">
          <span aria-hidden="true" className="absolute inset-1 rounded-full ring-1 ring-white/30" />
          <span aria-hidden="true" className="absolute inset-x-3 top-2 h-1/3 rounded-full bg-white/15 blur-sm" />
          <svg viewBox="0 0 24 24" className="relative size-10" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" pathLength={1} strokeDasharray={1} style={{ animationDuration: '0.7s', animationDelay: '0.45s' }} className="animate-draw motion-reduce:animate-none" />
          </svg>
        </span>
      </div>

      <div>
        <h3 className="orbit-text text-2xl font-black">
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

      <div style={{ animationDelay: '0.7s' }} className="flex w-full animate-rise flex-col items-center gap-2.5 motion-reduce:animate-none">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.24em] text-fg-subtle">
          {redeemText.reference}
          {isSettled && (
            <span className="inline-flex animate-pop-in items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[9px] font-black tracking-[0.18em] text-success ring-1 ring-success/40 motion-reduce:animate-none">
              <Icon name="check" size={10} />
              {redeemText.confirmed}
            </span>
          )}
        </p>
        <p className="sr-only">{reference}</p>
        <FlapBoard text={shownReference} target={reference} isSettled={isSettled} />
      </div>

      <p style={{ animationDelay: '1s' }} className="animate-rise text-xs leading-relaxed text-fg-muted motion-reduce:animate-none">
        {redeemText.updates}
      </p>
    </div>
  );
}

/** Two stations on one orbit path: the link fills with the brand gradient once the claim is confirmed. */
function StepTrack({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.id === step);
  const isFinished = current === STEPS.length - 1;

  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute top-4 right-1/4 left-1/4 h-0.5 -translate-y-1/2 rounded-full bg-line" />
      <span
        aria-hidden="true"
        style={{ transform: `translateY(-50%) scaleX(${isFinished ? 1 : 0})` }}
        className="absolute top-4 right-1/4 left-1/4 h-0.5 origin-left rounded-full transition-transform duration-700 ease-out [background-image:var(--brand-gradient)] motion-reduce:transition-none"
      />
      {!isFinished && (
        <span aria-hidden="true" className="absolute top-4 right-1/4 left-1/4 h-0.5 -translate-y-1/2 overflow-hidden rounded-full">
          <span className="absolute inset-y-0 w-1/3 animate-sweep bg-linear-to-r from-transparent via-primary to-transparent [animation-iteration-count:infinite] motion-reduce:hidden" />
        </span>
      )}

      <ol className="relative grid grid-cols-2">
        {STEPS.map((item, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          return (
            <li key={item.id} aria-current={isCurrent ? 'step' : undefined} className="flex flex-col items-center gap-2">
              <span
                className={cx(
                  'relative grid size-8 place-items-center rounded-full text-xs font-bold tabular-nums transition-colors duration-500',
                  isDone && 'bg-success text-surface',
                  isCurrent && 'text-on-primary shadow-[0_0_16px_-2px_var(--brand-primary)] [background-image:var(--brand-gradient)]',
                  !isDone && !isCurrent && 'bg-surface-2 text-fg-subtle ring-1 ring-line',
                )}
              >
                {isCurrent && (
                  <span aria-hidden="true" className="orbit-ring absolute -inset-1.5 animate-orbit-spin-fast motion-reduce:animate-none">
                    <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
                  </span>
                )}
                {isDone ? <Icon name="check" size={14} /> : index + 1}
              </span>
              <span className={cx('text-[10.5px] font-semibold tracking-[0.16em] uppercase', isCurrent ? 'text-primary' : isDone ? 'text-success' : 'text-fg-subtle')}>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
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
      <span className="relative grid size-12 shrink-0 place-items-center">
        <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
          <span className="absolute top-1/2 -right-1 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
        </span>
        <span className="grid size-9 place-items-center rounded-full text-on-primary shadow-[0_8px_20px_-8px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
          <Icon name={icon} size={17} />
        </span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] font-bold tracking-[0.2em] text-primary">{redeemText.caption}</span>
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
      <div className="flex flex-col gap-6">
        <StepTrack step={step} />

        {step === 'confirm' ? (
          <div key="confirm" className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
            <h3 className="flex items-center gap-2 text-sm font-bold text-fg">
              <span aria-hidden="true" className="h-4 w-1 rounded-full [background-image:var(--brand-gradient)]" />
              {redeemText.confirmTitle}
            </h3>

            {/* Claim pass: the item on the main body, the quantity on a tear-off stub behind a perforated edge. */}
            <div className="relative rounded-2xl bg-surface-2/50 ring-1 ring-primary/25">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 rounded-t-2xl [background-image:var(--brand-gradient)]" />
              <span aria-hidden="true" style={{ right: STUB_WIDTH }} className="absolute -top-2.5 size-5 translate-x-1/2 rounded-full bg-elevated ring-1 ring-primary/25" />
              <span aria-hidden="true" style={{ right: STUB_WIDTH }} className="absolute -bottom-2.5 size-5 translate-x-1/2 rounded-full bg-elevated ring-1 ring-primary/25" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <span className="orbit-ring absolute -bottom-16 -left-10 size-36 animate-orbit-spin motion-reduce:animate-none" />
              </span>

              <span aria-hidden="true" className="absolute top-[calc(50%+2px)] left-4 grid size-10 -translate-y-1/2 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/30">
                <Icon name={icon} size={18} />
              </span>

              <dl style={{ gridTemplateColumns: `minmax(0,1fr) ${STUB_WIDTH}` }} className="relative grid">
                <div className="flex min-w-0 flex-col justify-center pt-5 pr-4 pb-4 pl-[4.25rem]">
                  <dt className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{redeemText.item}</dt>
                  <dd className="mt-0.5 truncate text-base font-bold text-fg">{name}</dd>
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 border-l border-dashed border-fg/15 px-3 pt-5 pb-4">
                  <dt className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{redeemText.quantity}</dt>
                  <dd className="grid size-11 place-items-center rounded-full bg-primary-soft font-mono text-xl font-black text-primary tabular-nums ring-1 ring-primary/40">
                    {quantity}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="flex items-start gap-3 rounded-r-xl border-l-2 border-warning bg-warning/[0.07] px-3.5 py-3 text-xs leading-relaxed text-warning">
              <span aria-hidden="true" className="relative mt-1 flex size-2 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-warning/70 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-warning" />
              </span>
              {redeemText.warning}
            </p>
          </div>
        ) : (
          <SuccessStep key="done" name={name} reference={reference} />
        )}
      </div>
    </Modal>
  );
}
