'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
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

const BURST_DOTS = 18;
const SCRAMBLE_STEP_MS = 45;
const SCRAMBLE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
const inkPillClass =
  'group/pill relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-fg px-5 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

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

/** Reference as a string of beads: each character pops into an ink bead when it locks, then the row waves. */
function BeadCode({ text, target, isSettled }: { text: string; target: string; isSettled: boolean }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap justify-center gap-1.5">
      {text.split('').map((char, index) => {
        if (char === '-') return <span key={index} className="size-1.5 self-center rounded-full bg-fg/40" />;
        const isLocked = char === target[index];
        return (
          <span
            key={`${index}-${isLocked}`}
            style={{ animationDelay: `${index * 90}ms` }}
            className={cx(
              'grid size-9 place-items-center rounded-full font-mono text-base font-black transition-colors duration-300',
              isLocked ? 'bg-fg text-app' : 'text-fg/50 ring-1 ring-line',
              isLocked && !isSettled && 'animate-dot-pop motion-reduce:animate-none',
              isSettled && 'animate-flap-wave motion-reduce:animate-none',
            )}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

function SuccessStep({ name, reference }: { name: string; reference: string }) {
  const shownReference = useScrambledText(reference);
  const isSettled = shownReference === reference;
  const titleWords = redeemText.successTitle.split(' ');

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Dot burst: a ring of beads pops in around the check bead, with ripples spreading out. */}
      <div className="relative grid size-40 place-items-center">
        {[0, 1.2].map((delay) => (
          <span key={delay} aria-hidden="true" style={{ animationDelay: `${delay}s` }} className="absolute inset-8 animate-ring-ripple rounded-full ring-2 ring-fg/20 motion-reduce:hidden" />
        ))}
        <span aria-hidden="true" className="absolute inset-3 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
        {Array.from({ length: BURST_DOTS }, (_, dot) => {
          const angle = (dot / BURST_DOTS) * 2 * Math.PI - Math.PI / 2;
          return (
            <span
              key={dot}
              aria-hidden="true"
              style={{ left: `${(50 + 47 * Math.cos(angle)).toFixed(2)}%`, top: `${(50 + 47 * Math.sin(angle)).toFixed(2)}%`, animationDelay: `${200 + dot * 35}ms` }}
              className={cx('absolute -translate-x-1/2 -translate-y-1/2 animate-dot-pop rounded-full motion-reduce:animate-none', dot % 3 === 0 ? 'size-2.5 bg-success' : 'size-2 bg-fg')}
            />
          );
        })}
        <span className="relative grid size-20 animate-pop-in place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
          <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" pathLength={1} strokeDasharray={1} style={{ animationDuration: '0.7s', animationDelay: '0.45s' }} className="animate-draw motion-reduce:animate-none" />
          </svg>
        </span>
      </div>

      <div>
        <h3 className="text-2xl font-black tracking-[-0.02em] text-fg">
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

      <div style={{ animationDelay: '0.7s' }} className="flex w-full animate-rise flex-col items-center gap-3 rounded-[24px] p-4 ring-1 ring-line motion-reduce:animate-none">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.24em] text-fg-subtle">
          {redeemText.reference}
          {isSettled && (
            <span className="inline-flex animate-dot-pop items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-white motion-reduce:animate-none">
              <Icon name="check" size={10} />
              {redeemText.confirmed}
            </span>
          )}
        </p>
        <p className="sr-only">{reference}</p>
        <BeadCode text={shownReference} target={reference} isSettled={isSettled} />
      </div>

      <p style={{ animationDelay: '1s' }} className="animate-rise text-xs leading-relaxed text-fg-muted motion-reduce:animate-none">
        {redeemText.updates}
      </p>
    </div>
  );
}

/** Two beads on a dotted string: the string turns solid once the claim is confirmed. */
function StepString({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.id === step);
  const isFinished = current === STEPS.length - 1;

  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute top-5 right-1/4 left-1/4 -translate-y-1/2 border-t-2 border-dotted border-line-strong" />
      <span
        aria-hidden="true"
        style={{ transform: `translateY(-50%) scaleX(${isFinished ? 1 : 0})` }}
        className="absolute top-5 right-1/4 left-1/4 h-0.5 origin-left rounded-full bg-fg transition-transform duration-700 ease-out motion-reduce:transition-none"
      />

      <ol className="relative grid grid-cols-2">
        {STEPS.map((item, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          return (
            <li key={item.id} aria-current={isCurrent ? 'step' : undefined} className="flex flex-col items-center gap-2">
              <span className="relative grid size-10 place-items-center">
                {isCurrent && <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/35 motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'grid size-8 place-items-center rounded-full text-xs font-black tabular-nums transition-colors duration-500',
                    isDone && 'bg-success text-white',
                    isCurrent && 'bg-fg text-app',
                    !isDone && !isCurrent && 'bg-surface text-fg-subtle ring-1 ring-line',
                  )}
                >
                  {isDone ? <Icon name="check" size={14} /> : index + 1}
                </span>
              </span>
              <span className={cx('text-[10.5px] font-semibold tracking-[0.16em] uppercase', isCurrent ? 'text-fg' : isDone ? 'text-success' : 'text-fg-subtle')}>{item.label}</span>
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
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
        <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
          <Icon name={icon} size={16} />
        </span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] font-black tracking-[0.2em] text-fg-subtle">{redeemText.caption}</span>
        <span className="truncate text-lg font-black text-fg">{name}</span>
      </span>
    </span>
  );

  const footer =
    step === 'confirm' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-colors hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {redeemText.cancel}
        </button>
        <button type="button" onClick={confirm} className={inkPillClass}>
          <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/pill:translate-x-full motion-reduce:hidden" />
          <span className="relative">{redeemText.continue}</span>
          <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/pill:translate-x-1" />
        </button>
      </>
    ) : (
      <button type="button" onClick={onClose} className={cx(inkPillClass, 'w-full')}>
        <span className="relative">{redeemText.done}</span>
      </button>
    );

  return (
    <Modal open calm onClose={onClose} title={title} description={redeemText.value(formatMoney(value, currency))} footer={footer}>
      <div className="flex flex-col gap-6">
        <StepString step={step} />

        {step === 'confirm' ? (
          <div key="confirm" className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
            <h3 className="flex items-center gap-2 text-sm font-black text-fg">
              <span aria-hidden="true" className="size-2 animate-blink rounded-full bg-fg motion-reduce:animate-none" />
              {redeemText.confirmTitle}
            </h3>

            {/* Claim receipt: item on top, quantity on a dotted leader below. */}
            <dl className="flex flex-col gap-4 rounded-[24px] p-4 ring-1 ring-line">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="nova-gloss grid size-11 shrink-0 place-items-center rounded-full text-fg">
                  <Icon name={icon} size={18} />
                </span>
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{redeemText.item}</dt>
                  <dd className="mt-0.5 truncate text-base font-black text-fg">{name}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t-2 border-dotted border-line-strong pt-3">
                <dt className="shrink-0 text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{redeemText.quantity}</dt>
                <span aria-hidden="true" className="min-w-4 flex-1 border-b-2 border-dotted border-line-strong" />
                <dd className="grid size-10 animate-dot-pop place-items-center rounded-full bg-fg font-mono text-lg font-black text-app tabular-nums motion-reduce:animate-none">{quantity}</dd>
              </div>
            </dl>

            <p className="flex items-start gap-3 rounded-[20px] bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning ring-1 ring-warning/30">
              <span aria-hidden="true" className="mt-1 size-2 shrink-0 animate-blink rounded-full bg-warning motion-reduce:animate-none" />
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
