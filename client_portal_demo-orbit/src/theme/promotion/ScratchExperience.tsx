'use client';

import { useEffect, useId, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { ScratchCardItem } from '@/core/pages/useScratchCard';
import { cx } from '../lib/cx';
import { Button, IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

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
// The glowing etch left by a stroke fades out over this long after the last move.
// Frames a scratch glow keeps fading after the last stroke (~1.4s at 60fps) before the trail canvas is cleared.
const TRAIL_FADE_FRAMES = 84;
const CHARGE_SEGMENTS = 24;
const PORTAL_RINGS = ['w-[30%]', 'w-[52%]', 'w-[74%]'];
// Used only when the brand token cannot be parsed by canvas (canvas has no access to CSS variables).
const FALLBACK_PRIMARY = '#8b5cf6';
const NEBULA_CLOUDS = [
  { x: 0.18, y: 0.2, radius: 0.5, color: '#ffffff', alpha: 0.3 },
  { x: 0.78, y: 0.12, radius: 0.38, color: 'violet', alpha: 0.7 },
  { x: 0.9, y: 0.95, radius: 0.6, color: '#07040f', alpha: 0.55 },
];
const CONSTELLATIONS: { x: number; y: number }[][] = [
  [
    { x: 0.07, y: 0.62 },
    { x: 0.14, y: 0.74 },
    { x: 0.24, y: 0.7 },
    { x: 0.3, y: 0.84 },
    { x: 0.2, y: 0.9 },
  ],
  [
    { x: 0.7, y: 0.18 },
    { x: 0.79, y: 0.28 },
    { x: 0.88, y: 0.2 },
    { x: 0.93, y: 0.34 },
  ],
];
const CORNER_SIGNS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

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

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function brandColor(): string {
  return cssVar('--brand-primary');
}

/** Canvas silently ignores colours it cannot parse, so resolve the token against a known fallback first. */
function canvasColor(context: CanvasRenderingContext2D, value: string, fallback: string): string {
  context.fillStyle = fallback;
  if (value) context.fillStyle = value;
  return String(context.fillStyle);
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

function drawSparkle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.moveTo(x, y - radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.quadraticCurveTo(x, y, x, y + radius);
  context.quadraticCurveTo(x, y, x - radius, y);
  context.quadraticCurveTo(x, y, x, y - radius);
  context.fill();
}

/** Holographic nebula foil: violet space, a dotted orbit system, two constellations and a glass label capsule. */
function paintCoating(context: CanvasRenderingContext2D, width: number, height: number, label: string) {
  const primary = canvasColor(context, brandColor(), FALLBACK_PRIMARY);
  const violet = canvasColor(context, cssVar('--orbit-violet'), primary);

  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, violet);
  base.addColorStop(0.5, primary);
  base.addColorStop(1, '#140c2a');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  for (const cloud of NEBULA_CLOUDS) {
    const glow = context.createRadialGradient(cloud.x * width, cloud.y * height, 0, cloud.x * width, cloud.y * height, cloud.radius * width);
    glow.addColorStop(0, cloud.color === 'violet' ? violet : cloud.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = cloud.alpha;
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }
  context.globalAlpha = 1;

  const holo = context.createLinearGradient(0, height, width, 0);
  holo.addColorStop(0, 'rgba(255,255,255,0)');
  holo.addColorStop(0.32, 'rgba(255,255,255,0.2)');
  holo.addColorStop(0.38, 'rgba(255,255,255,0)');
  holo.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  holo.addColorStop(0.66, 'rgba(255,255,255,0)');
  context.fillStyle = holo;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255,255,255,0.07)';
  for (let x = 4; x < width; x += 8) {
    for (let y = 4; y < height; y += 8) context.fillRect(x, y, 1, 1);
  }

  // Fixed pseudo-random positions so the star field looks the same every time the card opens.
  for (let index = 0; index < 45; index += 1) {
    context.fillStyle = `rgba(255,255,255,${0.25 + (index % 4) * 0.15})`;
    context.beginPath();
    context.arc((((index * 37) % 101) / 101) * width, (((index * 59) % 97) / 97) * height, 0.6 + (index % 3) * 0.5, 0, Math.PI * 2);
    context.fill();
  }

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-0.22);
  context.lineWidth = 1;
  context.setLineDash([3, 6]);
  context.strokeStyle = 'rgba(255,255,255,0.3)';
  context.beginPath();
  context.ellipse(0, 0, width * 0.44, height * 0.34, 0, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = 'rgba(255,255,255,0.14)';
  context.beginPath();
  context.ellipse(0, 0, width * 0.3, height * 0.44, 0.9, 0, Math.PI * 2);
  context.stroke();
  context.shadowColor = '#ffffff';
  context.shadowBlur = 12;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(width * 0.44 * Math.cos(2.5), height * 0.34 * Math.sin(2.5), 4, 0, Math.PI * 2);
  context.fill();
  context.rotate(0.9);
  context.fillStyle = 'rgba(255,255,255,0.8)';
  context.beginPath();
  context.arc(width * 0.3 * Math.cos(5.3), height * 0.44 * Math.sin(5.3), 2.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.shadowBlur = 0;

  for (const constellation of CONSTELLATIONS) {
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 0.8;
    context.beginPath();
    constellation.forEach((star, index) => {
      if (index === 0) context.moveTo(star.x * width, star.y * height);
      else context.lineTo(star.x * width, star.y * height);
    });
    context.stroke();
    context.shadowColor = '#ffffff';
    context.shadowBlur = 6;
    context.fillStyle = '#ffffff';
    for (const star of constellation) drawSparkle(context, star.x * width, star.y * height, 3.5);
    context.shadowBlur = 0;
  }

  const inset = 14;
  const arm = 18;
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 2;
  context.lineCap = 'round';
  for (const [signX, signY] of CORNER_SIGNS) {
    const cornerX = signX > 0 ? inset : width - inset;
    const cornerY = signY > 0 ? inset : height - inset;
    context.beginPath();
    context.moveTo(cornerX, cornerY + signY * arm);
    context.lineTo(cornerX, cornerY);
    context.lineTo(cornerX + signX * arm, cornerY);
    context.stroke();
  }

  const fontSize = Math.max(13, Math.min(20, width / 24));
  const spacing = fontSize * 0.42;
  context.font = `800 ${fontSize}px ${getComputedStyle(context.canvas).fontFamily}`;
  context.textBaseline = 'middle';
  const characters = label.toUpperCase().split('');
  const textWidth = characters.reduce((sum, character) => sum + context.measureText(character).width + spacing, -spacing);
  const capsuleWidth = textWidth + fontSize * 3.6;
  const capsuleHeight = fontSize * 2.5;
  const capsuleLeft = (width - capsuleWidth) / 2;
  context.beginPath();
  context.roundRect(capsuleLeft, (height - capsuleHeight) / 2, capsuleWidth, capsuleHeight, capsuleHeight / 2);
  context.fillStyle = 'rgba(8,4,20,0.38)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.5)';
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = '#ffffff';
  drawSparkle(context, capsuleLeft + fontSize * 1.1, height / 2, fontSize * 0.45);
  drawSparkle(context, capsuleLeft + capsuleWidth - fontSize * 1.1, height / 2, fontSize * 0.45);

  let x = (width - textWidth) / 2;
  context.shadowColor = primary;
  context.shadowBlur = 12;
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

/**
 * Nebula vault: a holographic star-foil coating over a portal that charges up as it is scratched. Each stroke leaves a
 * glowing etch that cools down, and on reveal the foil collapses into the last touch point like a black hole.
 */
function ScratchSurface({ card, currency, isRevealing, onScratch, onComplete }: ScratchSurfaceProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const lastPoint = useRef<Point | null>(null);
  const strokeCount = useRef(0);
  const trailFrame = useRef(0);
  const trailFramesLeft = useRef(0);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [collapseAt, setCollapseAt] = useState('50% 50%');
  const isWin = card.reward > 0;

  useMotion(shineRef, SHINE_KEYFRAMES, SHINE_OPTIONS);
  useEffect(() => () => cancelAnimationFrame(trailFrame.current), []);

  // The surface mounts before the dialog has laid out, so the canvas can still be 0×0 here. Paint the coating once
  // it has a real size, and repaint on resize only until the first stroke so scratched progress is never wiped.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    function paint(target: HTMLCanvasElement, targetContext: CanvasRenderingContext2D) {
      const width = target.offsetWidth;
      const height = target.offsetHeight;
      if (width === 0 || height === 0 || strokeCount.current > 0) return;
      const ratio = window.devicePixelRatio || 1;
      target.width = Math.round(width * ratio);
      target.height = Math.round(height * ratio);
      targetContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      targetContext.globalCompositeOperation = 'source-over';
      paintCoating(targetContext, width, height, translate('scratch.coatingLabel'));
      targetContext.globalCompositeOperation = 'destination-out';
      targetContext.lineCap = 'round';
      targetContext.lineJoin = 'round';
      targetContext.lineWidth = BRUSH_RADIUS * 2;

      const trail = trailRef.current;
      if (trail) {
        trail.width = target.width;
        trail.height = target.height;
        trail.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
    }

    paint(canvas, context);
    const observer = new ResizeObserver(() => paint(canvas, context));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function fadeTrail() {
    const trail = trailRef.current;
    const context = trail?.getContext('2d');
    if (!trail || !context) {
      trailFrame.current = 0;
      return;
    }
    const width = trail.offsetWidth;
    const height = trail.offsetHeight;
    trailFramesLeft.current -= 1;
    if (trailFramesLeft.current <= 0) {
      context.clearRect(0, 0, width, height);
      trailFrame.current = 0;
      return;
    }
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgba(0,0,0,0.07)';
    context.fillRect(0, 0, width, height);
    trailFrame.current = requestAnimationFrame(fadeTrail);
  }

  /** Freshly scratched channel glows like a laser etch, then cools down so the portal shows through. */
  function drawTrail(from: Point, to: Point) {
    const context = trailRef.current?.getContext('2d');
    if (!context || prefersReducedMotion()) return;
    const glow = canvasColor(context, brandColor(), FALLBACK_PRIMARY);
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.globalAlpha = 0.35;
    context.shadowColor = glow;
    context.shadowBlur = 18;
    context.strokeStyle = glow;
    context.lineWidth = BRUSH_RADIUS * 2;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    context.globalAlpha = 0.9;
    context.shadowBlur = 8;
    context.strokeStyle = 'rgba(255,255,255,0.95)';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    context.globalAlpha = 1;
    context.shadowBlur = 0;
    trailFramesLeft.current = TRAIL_FADE_FRAMES;
    if (!trailFrame.current) trailFrame.current = requestAnimationFrame(fadeTrail);
  }

  function setTilt(event: PointerEvent<HTMLCanvasElement> | null) {
    const frame = frameRef.current;
    const glint = glintRef.current;
    if (!frame) return;
    if (!event || prefersReducedMotion()) {
      frame.style.transform = '';
      glint?.style.removeProperty('--gx');
      glint?.style.removeProperty('--gy');
      return;
    }
    const rect = frame.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    frame.style.transform = `perspective(900px) rotateX(${(-offsetY * TILT_DEGREES).toFixed(2)}deg) rotateY(${(offsetX * TILT_DEGREES).toFixed(2)}deg)`;
    glint?.style.setProperty('--gx', `${((offsetX + 0.5) * 100).toFixed(1)}%`);
    glint?.style.setProperty('--gy', `${((offsetY + 0.5) * 100).toFixed(1)}%`);
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
    drawTrail(from, point);
    lastPoint.current = point;

    const head = headRef.current;
    if (head) {
      head.style.transform = `translate(${point.x}px, ${point.y}px)`;
      head.style.opacity = '1';
    }

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
    const point = lastPoint.current;
    if (point) setCollapseAt(`${Math.round(point.x)}px ${Math.round(point.y)}px`);
    lastPoint.current = null;
    if (headRef.current) headRef.current.style.opacity = '0';
    if (!isRevealing) measure(event.currentTarget);
  }

  const showPrize = hasStarted || isRevealing;
  const shownProgress = isRevealing ? 100 : progress;
  const charge = shownProgress / 100;
  const litSegments = Math.round(charge * CHARGE_SEGMENTS);
  const collapseStyle = { clipPath: `circle(${isRevealing ? '0%' : '150%'} at ${collapseAt})` };

  return (
    <div>
      <div className="relative rounded-[24px] p-[1.5px]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
          <span className="absolute -inset-[60%] animate-orbit-spin-fast [background-image:conic-gradient(var(--brand-primary),transparent_25%,var(--orbit-violet)_50%,transparent_75%,var(--brand-primary))] motion-reduce:animate-none" />
        </span>

        <div
          ref={frameRef}
          className={cx(
            'relative isolate aspect-[16/10] w-full overflow-hidden rounded-[22.5px] bg-surface transition-[transform,box-shadow] duration-300 ease-out',
            isRevealing ? 'shadow-[0_0_70px_-8px_var(--brand-primary)]' : 'shadow-[0_26px_50px_-26px_var(--brand-primary)]',
          )}
        >
          <div className="absolute inset-0 grid place-items-center overflow-hidden bg-surface-2 p-4 text-center">
            <span
              aria-hidden="true"
              className="absolute -inset-1/2 animate-orbit-spin opacity-40 [background-image:repeating-conic-gradient(color-mix(in_srgb,var(--brand-primary)_45%,transparent)_0deg_6deg,transparent_6deg_18deg)] [mask-image:radial-gradient(circle,black,transparent_55%)] motion-reduce:animate-none"
            />
            <span aria-hidden="true" style={{ opacity: 0.15 + charge * 0.5 }} className="absolute size-[45%] rounded-full bg-primary blur-3xl transition-opacity duration-500" />
            {PORTAL_RINGS.map((sizeClass, index) => (
              <span
                key={sizeClass}
                aria-hidden="true"
                style={{ opacity: Math.min(1, 0.15 + charge * (1.1 - index * 0.25)), scale: String(0.85 + charge * 0.15) }}
                className={cx('orbit-ring absolute aspect-square transition-[opacity,scale] duration-500 ease-out', sizeClass, index === 1 ? 'animate-orbit-spin-rev' : 'animate-orbit-spin-fast', 'motion-reduce:animate-none')}
              >
                {index === 1 && <span className="absolute -top-1 left-1/2 size-2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />}
              </span>
            ))}
            {isRevealing && <span aria-hidden="true" className="absolute size-[30%] animate-pulse-ring rounded-full border-2 border-primary motion-reduce:hidden" />}

            {showPrize && (
              <div
                className={cx(
                  'relative flex flex-col items-center gap-1.5 transition-[transform,opacity] duration-700 ease-out motion-reduce:transition-none',
                  isRevealing ? 'scale-110 opacity-100' : 'scale-90 opacity-75',
                )}
              >
                <span
                  className={cx(
                    'grid size-12 place-items-center rounded-full',
                    isWin ? 'text-on-primary shadow-[0_0_28px_-4px_var(--brand-primary)] [background-image:var(--brand-gradient)]' : 'bg-surface text-fg-muted ring-1 ring-line',
                  )}
                >
                  <Icon name={isWin ? 'trophy' : 'history'} size={22} />
                </span>
                {isWin ? (
                  <>
                    <span className={captionClass}>{translate('scratch.youWon')}</span>
                    <span className="orbit-text text-4xl font-black tabular-nums">{formatMoney(card.reward, currency)}</span>
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
            style={collapseStyle}
            className={cx(
              'absolute inset-0 size-full cursor-crosshair touch-none transition-[clip-path,rotate] duration-[900ms] ease-in motion-reduce:transition-none',
              isRevealing && 'pointer-events-none rotate-12',
            )}
          />
          <canvas
            ref={trailRef}
            aria-hidden="true"
            className={cx('pointer-events-none absolute inset-0 size-full transition-opacity duration-500', isRevealing && 'opacity-0')}
          />

          <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500', hasStarted && 'opacity-0')}>
            <span className="absolute -inset-1/2 animate-orbit-spin-fast opacity-35 mix-blend-soft-light [background-image:conic-gradient(transparent,rgb(255_255_255/0.6),transparent_30%,var(--orbit-violet),transparent_60%,rgb(255_255_255/0.45),transparent)] motion-reduce:animate-none" />
            <span ref={glintRef} className="absolute inset-0 mix-blend-overlay [background-image:radial-gradient(circle_at_var(--gx,30%)_var(--gy,30%),rgb(255_255_255/0.6),transparent_40%)]" />
            <span ref={shineRef} className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />
          </span>

          <span
            ref={headRef}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 -mt-5 -ml-5 grid size-10 place-items-center rounded-full opacity-0 ring-2 ring-white/70 shadow-[0_0_24px_var(--brand-primary)] transition-opacity duration-200"
          >
            <span className="size-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={translate('scratch.revealProgress')}
          aria-valuenow={shownProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="flex h-3.5 flex-1 items-center gap-[3px]"
        >
          {Array.from({ length: CHARGE_SEGMENTS }, (_, index) => {
            const isLit = index < litSegments;
            const isTip = isLit && index === litSegments - 1 && !isRevealing;
            return (
              <span
                key={index}
                style={isLit ? { opacity: 0.45 + (index / CHARGE_SEGMENTS) * 0.55 } : undefined}
                className={cx(
                  'flex-1 rounded-full transition-[height,background-color,box-shadow] duration-300 motion-reduce:transition-none',
                  isLit ? 'h-3.5 bg-primary shadow-[0_0_8px_var(--brand-primary)]' : 'h-2 bg-line',
                  isTip && 'animate-pulse motion-reduce:animate-none',
                )}
              />
            );
          })}
        </div>
        <span className="w-11 text-right font-mono text-sm font-bold text-fg tabular-nums">{shownProgress}%</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-fg-muted">{translate('scratch.modalHint')}</p>
        <button
          type="button"
          onClick={onComplete}
          disabled={isRevealing}
          className="group/reveal inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {translate('scratch.revealButton')}
          <Icon name="arrowRight" size={12} className="transition-transform group-hover/reveal:translate-x-0.5 motion-reduce:transition-none" />
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
        <span ref={ringRef} aria-hidden="true" className="orbit-ring absolute inset-0 border-2">
          <span className="absolute -top-1.5 left-1/2 size-3 rounded-full bg-[var(--orbit-violet)] shadow-[0_0_12px_var(--orbit-violet)]" />
        </span>
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
        className="orbit-card relative mx-auto mt-5 max-w-xs animate-rise px-6 pt-5 pb-4 motion-reduce:animate-none"
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
