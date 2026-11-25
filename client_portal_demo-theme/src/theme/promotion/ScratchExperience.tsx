'use client';

import { useEffect, useId, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { ScratchCardItem } from '@/core/pages/useScratchCard';
import { cx } from '../lib/cx';
import { Button, IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ProgressBar } from '../ui/ProgressBar';

const BRUSH_RADIUS = 20;
// Share of the coating that must be wiped before the card counts as revealed.
const REVEAL_THRESHOLD = 0.6;
// Only every Nth pixel is checked when measuring how much coating is gone.
const SAMPLE_STRIDE = 24;
// Brush edges are anti-aliased, so nearly transparent pixels count as scratched too.
const CLEARED_ALPHA = 32;
// How many brush moves pass between two coverage measurements.
const MEASURE_EVERY = 4;
// Pause between the coating dissolving and the result screen, so the prize is seen on the card first.
const REVEAL_PAUSE_MS = 1100;
const TILT_DEGREES = 6;
const CONFETTI_COUNT = 110;

const captionClass = 'text-[10.5px] tracking-[0.14em] text-fg-subtle uppercase';

interface Point {
  x: number;
  y: number;
}

interface Particle extends Point {
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  gravity: number;
  color: string;
}

type Phase = 'scratch' | 'revealing' | 'result';

const SHINE_KEYFRAMES: Keyframe[] = [{ transform: 'translateX(-120%) skewX(-12deg)' }, { transform: 'translateX(320%) skewX(-12deg)' }];
const SHINE_OPTIONS: KeyframeAnimationOptions = { duration: 2600, iterations: Infinity, easing: 'ease-in-out', delay: 400 };
const SPIN_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
const SPIN_OPTIONS: KeyframeAnimationOptions = { duration: 14000, iterations: Infinity };
const POP_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(0.3) rotate(-25deg)', opacity: 0 },
  { transform: 'scale(1.12) rotate(6deg)', opacity: 1, offset: 0.65 },
  { transform: 'scale(1) rotate(0deg)', opacity: 1 },
];
const POP_OPTIONS: KeyframeAnimationOptions = { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'backwards' };
const WOBBLE_KEYFRAMES: Keyframe[] = [{ transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }];
const WOBBLE_OPTIONS: KeyframeAnimationOptions = { duration: 1400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Plays a Web Animation on the element for as long as it is mounted; skipped when the user prefers reduced motion. */
export function useMotion(ref: RefObject<HTMLElement | null>, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;
    const animation = element.animate(keyframes, options);
    return () => animation.cancel();
  }, [ref, keyframes, options]);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function brandColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function dustAt(origin: Point): Particle[] {
  const colors = [brandColor(), 'rgba(255,255,255,0.85)', brandColor()];
  return Array.from({ length: 3 }, () => ({
    ...origin,
    vx: randomBetween(-1.8, 1.8),
    vy: randomBetween(-2.6, -0.4),
    size: randomBetween(2, 4.5),
    rotation: randomBetween(0, Math.PI),
    spin: randomBetween(-0.25, 0.25),
    life: 0,
    maxLife: randomBetween(35, 60),
    gravity: 0.2,
    color: pick(colors),
  }));
}

function confettiFrom(origin: Point, count: number): Particle[] {
  const colors = [brandColor(), '#ffffff', brandColor(), 'rgba(255,255,255,0.6)'];
  return Array.from({ length: count }, () => ({
    ...origin,
    vx: randomBetween(-7.5, 7.5),
    vy: randomBetween(-12, -4),
    size: randomBetween(5, 10),
    rotation: randomBetween(0, Math.PI),
    spin: randomBetween(-0.3, 0.3),
    life: 0,
    maxLife: randomBetween(90, 150),
    gravity: 0.24,
    color: pick(colors),
  }));
}

/** A tiny particle loop drawn on one canvas; it only runs frames while particles are alive. */
function useParticles(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function tick() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      frame.current = 0;
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    particles.current = particles.current.filter((particle) => particle.life < particle.maxLife);
    for (const particle of particles.current) {
      particle.life += 1;
      particle.vy += particle.gravity;
      particle.vx *= 0.985;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;
      context.save();
      context.globalAlpha = 1 - particle.life / particle.maxLife;
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size * 0.3, particle.size, particle.size * 0.6);
      context.restore();
    }

    frame.current = particles.current.length > 0 ? requestAnimationFrame(tick) : 0;
  }

  return function emit(next: Particle[]) {
    if (prefersReducedMotion()) return;
    particles.current.push(...next);
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  };
}

function paintCoating(context: CanvasRenderingContext2D, width: number, height: number, label: string) {
  context.fillStyle = brandColor();
  context.fillRect(0, 0, width, height);

  const shade = context.createLinearGradient(0, 0, width, height);
  shade.addColorStop(0, 'rgba(255,255,255,0.32)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0.1)');
  shade.addColorStop(1, 'rgba(0,0,0,0.5)');
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  context.beginPath();
  for (let x = -height; x < width; x += 10) {
    context.moveTo(x, 0);
    context.lineTo(x + height, height);
  }
  context.stroke();

  // Fixed pseudo-random positions so the sparkles look the same every time the card opens.
  context.fillStyle = 'rgba(255,255,255,0.5)';
  for (let index = 0; index < 40; index += 1) {
    context.beginPath();
    context.arc((((index * 53) % 97) / 97) * width, (((index * 31) % 89) / 89) * height, 0.8 + (index % 3) * 0.6, 0, Math.PI * 2);
    context.fill();
  }

  context.setLineDash([6, 6]);
  context.strokeStyle = 'rgba(255,255,255,0.35)';
  context.lineWidth = 1.5;
  context.strokeRect(12, 12, width - 24, height - 24);
  context.setLineDash([]);

  const fontSize = Math.max(18, Math.min(40, width / 12));
  const spacing = fontSize * 0.3;
  context.font = `800 ${fontSize}px ${getComputedStyle(context.canvas).fontFamily}`;
  context.textBaseline = 'middle';
  const characters = label.toUpperCase().split('');
  const textWidth = characters.reduce((sum, character) => sum + context.measureText(character).width + spacing, -spacing);
  let x = (width - textWidth) / 2;
  context.shadowColor = 'rgba(0,0,0,0.35)';
  context.shadowBlur = 10;
  context.fillStyle = 'rgba(255,255,255,0.96)';
  for (const character of characters) {
    context.fillText(character, x, height / 2);
    x += context.measureText(character).width + spacing;
  }
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
}

function clearedRatio(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext('2d');
  if (!context) return 0;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let sampled = 0;
  let cleared = 0;
  for (let index = 3; index < data.length; index += 4 * SAMPLE_STRIDE) {
    sampled += 1;
    if (data[index] < CLEARED_ALPHA) cleared += 1;
  }
  return sampled ? cleared / sampled : 0;
}

export function useAnimatedNumber(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const skip = prefersReducedMotion();
    const start = performance.now();
    let frameId = 0;
    const step = (now: number) => {
      const progress = skip ? 1 : Math.min(1, (now - start) / durationMs);
      setValue(target * (1 - (1 - progress) ** 3));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return value;
}

interface ScratchSurfaceProps {
  card: ScratchCardItem;
  currency: string;
  isRevealing: boolean;
  onScratch: (clientX: number, clientY: number) => void;
  onComplete: () => void;
}

function ScratchSurface({ card, currency, isRevealing, onScratch, onComplete }: ScratchSurfaceProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const lastPoint = useRef<Point | null>(null);
  const strokeCount = useRef(0);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const isWin = card.reward > 0;

  useMotion(shineRef, SHINE_KEYFRAMES, SHINE_OPTIONS);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.scale(ratio, ratio);
    paintCoating(context, width, height, translate('scratch.coatingLabel'));
    context.globalCompositeOperation = 'destination-out';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = BRUSH_RADIUS * 2;
  }, []);

  function setTilt(event: PointerEvent<HTMLCanvasElement> | null) {
    const frame = frameRef.current;
    if (!frame) return;
    if (!event || prefersReducedMotion()) {
      frame.style.transform = '';
      return;
    }
    const rect = frame.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    frame.style.transform = `perspective(900px) rotateX(${(-offsetY * TILT_DEGREES).toFixed(2)}deg) rotateY(${(offsetX * TILT_DEGREES).toFixed(2)}deg)`;
  }

  function measure(canvas: HTMLCanvasElement) {
    const ratio = clearedRatio(canvas);
    setProgress(Math.min(100, Math.round(ratio * 100)));
    if (ratio >= REVEAL_THRESHOLD) onComplete();
  }

  function scratchAt(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext('2d');
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const from = lastPoint.current ?? point;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.beginPath();
    context.arc(point.x, point.y, BRUSH_RADIUS, 0, Math.PI * 2);
    context.fill();
    // Ragged bites around the brush so the edge looks scraped rather than cut.
    for (let bite = 0; bite < 6; bite += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = BRUSH_RADIUS * randomBetween(0.7, 1.15);
      context.beginPath();
      context.arc(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, randomBetween(2, 5), 0, Math.PI * 2);
      context.fill();
    }
    lastPoint.current = point;

    strokeCount.current += 1;
    if (strokeCount.current % 2 === 0) onScratch(event.clientX, event.clientY);
    if (event.pointerType === 'touch' && strokeCount.current % 6 === 0) navigator.vibrate?.(6);
    if (strokeCount.current % MEASURE_EVERY === 0) measure(canvas);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (isRevealing) return;
    setTilt(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = null;
    setHasStarted(true);
    scratchAt(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (isRevealing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) scratchAt(event);
    else setTilt(event);
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    lastPoint.current = null;
    if (!isRevealing) measure(event.currentTarget);
  }

  const showPrize = hasStarted || isRevealing;

  return (
    <div>
      <div
        ref={frameRef}
        className={cx(
          'relative aspect-[16/10] w-full overflow-hidden rounded-[22px] border border-primary/40 shadow-[0_26px_50px_-26px_var(--brand-primary)] transition-[transform,box-shadow] duration-300 ease-out',
          isRevealing && 'shadow-[0_0_60px_-10px_var(--brand-primary)]',
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-2 p-4 text-center">
          <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--brand-primary),transparent_65%)] opacity-25" />
          {showPrize && (
            <div
              className={cx(
                'relative flex flex-col items-center gap-1 transition-[transform,opacity] duration-700 ease-out motion-reduce:transition-none',
                isRevealing ? 'scale-100 opacity-100' : 'scale-90 opacity-80',
              )}
            >
              <Icon name={isWin ? 'trophy' : 'history'} size={30} className={isWin ? 'text-primary' : 'text-fg-muted'} />
              {isWin ? (
                <>
                  <span className={captionClass}>{translate('scratch.youWon')}</span>
                  <span className="bg-clip-text text-4xl font-bold text-transparent tabular-nums [background-image:var(--brand-gradient)]">
                    {formatMoney(card.reward, currency)}
                  </span>
                </>
              ) : (
                <span className="text-base font-semibold text-fg-muted">{translate('scratch.loseTitle')}</span>
              )}
            </div>
          )}
        </div>

        <canvas
          ref={canvasRef}
          aria-label={translate('scratch.coatingLabel')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => setTilt(null)}
          className={cx(
            'absolute inset-0 size-full cursor-grab touch-none transition-[opacity,transform,filter] duration-700 ease-out active:cursor-grabbing motion-reduce:transition-none',
            isRevealing && 'pointer-events-none scale-110 opacity-0 blur-sm',
          )}
        />

        <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-300', hasStarted && 'opacity-0')}>
          <span ref={shineRef} className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/30 to-transparent" />
        </span>
      </div>

      <ProgressBar value={isRevealing ? 100 : progress} label={translate('scratch.revealProgress')} size="sm" className="mt-4" />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-fg-muted">{translate('scratch.modalHint')}</p>
        <button
          type="button"
          onClick={onComplete}
          disabled={isRevealing}
          className="shrink-0 rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {translate('scratch.revealButton')}
        </button>
      </div>
    </div>
  );
}

function WinResult({ amount, currency, titleId, onDone }: { amount: number; currency: string; titleId: string; onDone: () => void }) {
  const ringRef = useRef<HTMLSpanElement>(null);
  const medalRef = useRef<HTMLSpanElement>(null);
  const shownAmount = useAnimatedNumber(amount, 1100);

  useMotion(ringRef, SPIN_KEYFRAMES, SPIN_OPTIONS);
  useMotion(medalRef, POP_KEYFRAMES, POP_OPTIONS);

  return (
    <div className="relative px-6 pt-8 pb-6 text-center">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-48 bg-[radial-gradient(ellipse_at_top,var(--brand-primary),transparent_70%)] opacity-30" />

      <div className="relative mx-auto flex size-28 items-center justify-center">
        <span ref={ringRef} aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-dashed border-primary/50" />
        <span aria-hidden="true" className="absolute inset-3 animate-ring-ripple rounded-full bg-primary/20 motion-reduce:animate-none" />
        <span
          ref={medalRef}
          className="relative flex size-[4.5rem] items-center justify-center rounded-full text-on-primary shadow-[0_14px_34px_-8px_var(--brand-primary)] [background-image:var(--brand-gradient)]"
        >
          <Icon name="trophy" size={32} />
        </span>
      </div>

      <h2 id={titleId} className="mt-4 animate-rise bg-clip-text text-3xl font-bold text-transparent [background-image:var(--brand-gradient)] motion-reduce:animate-none">
        {translate('scratch.youWonTitle')}
      </h2>

      <div
        className="relative mx-auto mt-5 max-w-xs animate-rise rounded-2xl border border-primary/30 bg-surface-2/60 px-6 pt-5 pb-4 motion-reduce:animate-none"
        style={{ animationDelay: '120ms' }}
      >
        <span aria-hidden="true" className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full border border-primary/30 bg-elevated" />
        <span aria-hidden="true" className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full border border-primary/30 bg-elevated" />
        <p className="text-4xl font-bold text-fg tabular-nums">
          <span aria-hidden="true">{formatMoney(shownAmount, currency)}</span>
          <span className="sr-only">{formatMoney(amount, currency)}</span>
        </p>
        <p className={cx(captionClass, 'mt-3 border-t border-dashed border-fg/15 pt-2.5')}>{translate('scratch.prizeCaption')}</p>
      </div>

      <p
        role="status"
        className="mt-5 flex animate-rise items-start gap-2.5 rounded-2xl border border-success/25 bg-success-soft px-4 py-3 text-left text-sm text-success motion-reduce:animate-none"
        style={{ animationDelay: '240ms' }}
      >
        <Icon name="checkCircle" size={18} className="mt-px shrink-0" />
        {translate('scratch.creditedTrading')}
      </p>

      <Button type="button" className="mt-5 w-full" onClick={onDone}>
        {translate('scratch.done')}
      </Button>
    </div>
  );
}

function LoseResult({ titleId, onDone }: { titleId: string; onDone: () => void }) {
  const ringRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useMotion(ringRef, SPIN_KEYFRAMES, SPIN_OPTIONS);
  useMotion(iconRef, WOBBLE_KEYFRAMES, WOBBLE_OPTIONS);

  return (
    <div className="relative px-6 pt-8 pb-6 text-center">
      <div className="relative mx-auto flex size-24 items-center justify-center">
        <span ref={ringRef} aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-dashed border-fg/15" />
        <span className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-fg-muted ring-1 ring-fg/10">
          <span ref={iconRef} className="flex">
            <Icon name="history" size={28} />
          </span>
        </span>
      </div>

      <h2 id={titleId} className="mt-5 animate-rise text-2xl font-semibold text-fg motion-reduce:animate-none">
        {translate('scratch.loseTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-xs animate-rise text-sm text-fg-muted motion-reduce:animate-none" style={{ animationDelay: '100ms' }}>
        {translate('scratch.loseText')}
      </p>

      <Button type="button" className="mt-6 w-full" onClick={onDone}>
        {translate('scratch.done')}
      </Button>
    </div>
  );
}

interface ScratchFlowProps {
  card: ScratchCardItem;
  currency: string;
  titleId: string;
  onRevealed: (card: ScratchCardItem) => void;
  onClose: () => void;
}

function ScratchFlow({ card, currency, titleId, onRevealed, onClose }: ScratchFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const isComplete = useRef(false);
  const resultTimer = useRef(0);
  const [phase, setPhase] = useState<Phase>('scratch');
  const emit = useParticles(particleCanvasRef);
  const isWin = card.reward > 0;

  useEffect(() => () => window.clearTimeout(resultTimer.current), []);

  function localPoint(clientX: number, clientY: number): Point | null {
    const rect = particleCanvasRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null;
  }

  function handleScratch(clientX: number, clientY: number) {
    const origin = localPoint(clientX, clientY);
    if (origin) emit(dustAt(origin));
  }

  function handleComplete() {
    if (isComplete.current) return;
    isComplete.current = true;
    setPhase('revealing');
    onRevealed(card);

    const width = containerRef.current?.offsetWidth ?? 0;
    if (isWin) emit(confettiFrom({ x: width / 2, y: 140 }, CONFETTI_COUNT / 2));
    resultTimer.current = window.setTimeout(() => {
      setPhase('result');
      if (isWin) emit([...confettiFrom({ x: width * 0.2, y: 120 }, CONFETTI_COUNT / 2), ...confettiFrom({ x: width * 0.8, y: 120 }, CONFETTI_COUNT / 2)]);
    }, REVEAL_PAUSE_MS);
  }

  return (
    <div ref={containerRef} className="relative isolate">
      <canvas ref={particleCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 size-full" />

      {phase === 'result' ? (
        isWin ? (
          <WinResult amount={card.reward} currency={currency} titleId={titleId} onDone={onClose} />
        ) : (
          <LoseResult titleId={titleId} onDone={onClose} />
        )
      ) : (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-on-primary [background-image:var(--brand-gradient)]">
              <Icon name="gift" size={19} />
            </span>
            <h2 id={titleId} className="min-w-0 flex-1 text-lg font-semibold text-fg">
              {translate('scratch.modalTitle')}
            </h2>
            <IconButton icon="close" label={translate('common.close')} onClick={onClose} />
          </div>
          <ScratchSurface card={card} currency={currency} isRevealing={phase === 'revealing'} onScratch={handleScratch} onComplete={handleComplete} />
        </div>
      )}
    </div>
  );
}

interface ScratchDialogProps {
  card: ScratchCardItem | null;
  currency: string;
  onRevealed: (card: ScratchCardItem) => void;
  onClose: () => void;
}

// Native <dialog> like ui/Modal (focus trap, Esc, top layer), but the flow needs its own header-less result screens.
export function ScratchDialog({ card, currency, onRevealed, onClose }: ScratchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isOpen = card !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg animate-rise overflow-hidden rounded-[28px] border border-fg/10 bg-elevated p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-sm motion-reduce:animate-none"
    >
      {card && <ScratchFlow key={card.id} card={card} currency={currency} titleId={titleId} onRevealed={onRevealed} onClose={onClose} />}
    </dialog>
  );
}
