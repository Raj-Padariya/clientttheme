'use client';

import { useEffect, useId, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { ScratchCardItem } from '@/core/pages/useScratchCard';
import { cx } from '../lib/cx';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

const BRUSH_RADIUS = 22;
// Share of the coating that must be wiped before the card counts as revealed.
const REVEAL_THRESHOLD = 0.6;
// Only every Nth pixel is checked when measuring how much coating is gone.
const SAMPLE_STRIDE = 24;
// Brush edges are anti-aliased, so nearly transparent pixels count as scratched too.
const CLEARED_ALPHA = 32;
// How many brush moves pass between two coverage measurements.
const MEASURE_EVERY = 4;
// Pause between the sand blowing away and the result screen, so the prize stone is seen on the card first.
const REVEAL_PAUSE_MS = 1500;
const TILT_DEGREES = 6;
const CONFETTI_COUNT = 110;
// The leftover sand lifts off as a grid of jittered clumps when the card is revealed.
const SHARD_COLS = 10;
const SHARD_ROWS = 6;
// Raked sand: distance between groove rows, and how many rings circle each stone.
const RAKE_SPACING = 11;
const RAKE_RINGS = 4;
// Rake teeth either side of the finger, in px from the stroke's centre line.
const RAKE_TEETH = [-(BRUSH_RADIUS + 10), -(BRUSH_RADIUS + 4), BRUSH_RADIUS + 4, BRUSH_RADIUS + 10];
const SAGE = '#9fc4ae';
const SAND_COLORS = ['#ecdfc5', '#d8c39f', '#c0a780', '#a88f68'];
// Frames the rake grooves keep fading after the last stroke (~0.9s at 60fps).
const TRAIL_FADE_FRAMES = 54;
// A short jolt of the card on every few strokes, like a coin catching the surface.
const JOLT_KEYFRAMES: Keyframe[] = [
  { translate: '0 0' },
  { translate: '1.5px -1px' },
  { translate: '-1.5px 1px' },
  { translate: '0 0' },
];
const CONFETTI_COLORS = ['#9fc4ae', '#e0a890', '#d4e8dc', '#ffffff', '#f0d2c4'];
// Reveal meter: 20 cells of 5% each, so the 60% threshold falls on a cell edge.
const PROGRESS_CELLS = Array.from({ length: 20 }, (_, index) => index);

const inkClass = 'text-[#13201a]';
const inkMutedClass = 'text-[#13201a]/65';
// Sage plate under the coating and on the prize slip.
const ticketStockClass = 'bg-linear-to-br from-[#d4e8dc] via-[#9fc4ae] to-[#7aa58d]';
// Soft sheen: an oversized conic layer that keeps turning, so light slides across the sage plate.
const holoClass =
  'pointer-events-none absolute -inset-1/2 animate-rim-spin mix-blend-soft-light [background-image:conic-gradient(from_0deg,#ffffff,#d4e8dc,#9fc4ae,#f0d2c4,#ffffff,#e0a890,#ffffff)] motion-reduce:animate-none';

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
  shape: 'flake' | 'strip' | 'grain' | 'dust';
}

interface Shatter {
  image: string;
  /** Where the last stroke ended, in percent of the card — the sand blows away from here. */
  origin: Point;
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

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Sand pushed aside by a stroke: fine grains sprayed off both sides of the rake that pour down fast, plus a couple of
 * dust puffs that hang in the air — so every move visibly shifts the sand.
 */
function sandSprayAt(origin: Point, direction: Point): Particle[] {
  const length = Math.hypot(direction.x, direction.y) || 1;
  const backX = -direction.x / length;
  const backY = -direction.y / length;
  return Array.from({ length: 12 }, (_, index) => {
    const isGrain = index < 10;
    const side = index % 2 === 0 ? 1 : -1;
    const speed = isGrain ? randomBetween(1.4, 3.6) : randomBetween(0.3, 0.8);
    return {
      ...origin,
      vx: -backY * side * speed + backX * randomBetween(0.4, 1.4) + randomBetween(-0.6, 0.6),
      vy: backX * side * speed + backY * randomBetween(0.4, 1.4) + randomBetween(-2.2, -0.6),
      size: isGrain ? randomBetween(1.6, 3.4) : randomBetween(8, 14),
      rotation: 0,
      spin: 0,
      life: 0,
      maxLife: isGrain ? randomBetween(28, 48) : randomBetween(40, 70),
      gravity: isGrain ? 0.28 : 0.01,
      color: isGrain ? pick(SAND_COLORS) : '#efe3cc',
      shape: isGrain ? 'grain' : 'dust',
    };
  });
}

function confettiFrom(origin: Point, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    ...origin,
    vx: randomBetween(-7.5, 7.5),
    vy: randomBetween(-12, -4),
    size: randomBetween(5, 11),
    rotation: randomBetween(0, Math.PI),
    spin: randomBetween(-0.3, 0.3),
    life: 0,
    maxLife: randomBetween(90, 150),
    gravity: 0.22,
    color: pick(CONFETTI_COLORS),
    shape: Math.random() < 0.45 ? 'flake' : 'strip',
  }));
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

function drawStrip(context: CanvasRenderingContext2D, size: number) {
  context.beginPath();
  context.moveTo(-size / 2, 0);
  context.quadraticCurveTo(0, -size * 0.55, size / 2, 0);
  context.lineWidth = Math.max(1.4, size * 0.28);
  context.lineCap = 'round';
  context.strokeStyle = context.fillStyle;
  context.stroke();
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
      const fade = 1 - particle.life / particle.maxLife;
      context.globalAlpha = particle.shape === 'dust' ? fade * 0.35 : fade;
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      if (particle.shape === 'flake') drawSparkle(context, 0, 0, particle.size / 2);
      else if (particle.shape === 'strip') drawStrip(context, particle.size);
      else {
        context.beginPath();
        context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        context.fill();
      }
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

/** Fixed-seed generator, so the sand grain pattern is the same on every paint. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function strokeGroove(context: CanvasRenderingContext2D, path: Path2D) {
  context.strokeStyle = 'rgba(118,90,56,0.4)';
  context.lineWidth = 2;
  context.stroke(path);
  context.save();
  context.translate(0, 1.6);
  context.strokeStyle = 'rgba(255,248,232,0.6)';
  context.lineWidth = 1;
  context.stroke(path);
  context.restore();
}

/**
 * Zen garden sand: a warm sand bed with fine grain, two moss-dark stones each circled by raked rings, wavy raked rows
 * everywhere else, and a slate plaque with the label in the middle.
 */
function paintCoating(context: CanvasRenderingContext2D, width: number, height: number, label: string) {
  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#ecdfc5');
  base.addColorStop(0.55, '#d8c39f');
  base.addColorStop(1, '#c0a780');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  const random = seededRandom(7);
  const grainCount = Math.round((width * height) / 26);
  for (let grain = 0; grain < grainCount; grain += 1) {
    context.fillStyle = random() < 0.5 ? 'rgba(255,250,238,0.55)' : 'rgba(110,84,52,0.32)';
    context.fillRect(random() * width, random() * height, 1.2, 1.2);
  }

  const shortSide = Math.min(width, height);
  const stones = [
    { x: width * 0.16, y: height * 0.3, radius: shortSide * 0.085 },
    { x: width * 0.85, y: height * 0.72, radius: shortSide * 0.11 },
  ];
  const ringReach = (stone: { radius: number }) => stone.radius + RAKE_RINGS * RAKE_SPACING;

  // Raked rows everywhere except the ring zones round the stones.
  context.save();
  const outside = new Path2D();
  outside.rect(0, 0, width, height);
  for (const stone of stones) {
    outside.moveTo(stone.x + ringReach(stone), stone.y);
    outside.arc(stone.x, stone.y, ringReach(stone), 0, Math.PI * 2);
  }
  context.clip(outside, 'evenodd');
  for (let rowY = RAKE_SPACING * 0.8; rowY < height; rowY += RAKE_SPACING) {
    const row = new Path2D();
    row.moveTo(0, rowY);
    for (let x = 6; x <= width + 6; x += 6) row.lineTo(x, rowY + Math.sin(x / 42 + rowY / 55) * 2.6);
    strokeGroove(context, row);
  }
  context.restore();

  for (const stone of stones) {
    for (let ring = 1; ring <= RAKE_RINGS; ring += 1) {
      const circle = new Path2D();
      circle.arc(stone.x, stone.y, stone.radius + ring * RAKE_SPACING - 2, 0, Math.PI * 2);
      strokeGroove(context, circle);
    }
    context.fillStyle = 'rgba(70,52,30,0.35)';
    context.beginPath();
    context.ellipse(stone.x + 3, stone.y + 4, stone.radius * 1.12, stone.radius * 0.84, 0.3, 0, Math.PI * 2);
    context.fill();
    const body = context.createRadialGradient(stone.x - stone.radius * 0.35, stone.y - stone.radius * 0.4, stone.radius * 0.1, stone.x, stone.y, stone.radius * 1.2);
    body.addColorStop(0, '#9aaea4');
    body.addColorStop(0.55, '#5d6f67');
    body.addColorStop(1, '#33423c');
    context.fillStyle = body;
    context.beginPath();
    context.ellipse(stone.x, stone.y, stone.radius * 1.12, stone.radius * 0.84, 0.3, 0, Math.PI * 2);
    context.fill();
  }

  const fontSize = Math.max(12, Math.min(17, width / 28));
  const spacing = fontSize * 0.42;
  context.font = `800 ${fontSize}px ${getComputedStyle(context.canvas).fontFamily}`;
  context.textBaseline = 'middle';
  const characters = label.toUpperCase().split('');
  const textWidth = characters.reduce((sum, character) => sum + context.measureText(character).width + spacing, -spacing);
  const capsuleWidth = textWidth + fontSize * 3.6;
  const capsuleHeight = fontSize * 2.6;
  const capsuleLeft = (width - capsuleWidth) / 2;
  context.beginPath();
  context.roundRect(capsuleLeft, (height - capsuleHeight) / 2, capsuleWidth, capsuleHeight, capsuleHeight / 2);
  context.fillStyle = 'rgba(31,45,41,0.9)';
  context.fill();

  context.fillStyle = SAGE;
  drawSparkle(context, capsuleLeft + fontSize * 1.1, height / 2, fontSize * 0.45);
  drawSparkle(context, capsuleLeft + capsuleWidth - fontSize * 1.1, height / 2, fontSize * 0.45);

  context.fillStyle = '#efe3cc';
  let x = (width - textWidth) / 2;
  for (const character of characters) {
    context.fillText(character, x, height / 2);
    x += context.measureText(character).width + spacing;
  }
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

// Grid corners in percent; interior corners are nudged so the shards look broken rather than tiled.
function shardVertex(col: number, row: number): Point {
  const jitter = ((col * 7 + row * 13) % 5) - 2;
  const isEdgeX = col === 0 || col === SHARD_COLS;
  const isEdgeY = row === 0 || row === SHARD_ROWS;
  return { x: (col / SHARD_COLS) * 100 + (isEdgeX ? 0 : jitter * 2.6), y: (row / SHARD_ROWS) * 100 + (isEdgeY ? 0 : jitter * -2.6) };
}

const SHARDS: Point[][] = Array.from({ length: SHARD_ROWS * SHARD_COLS }, (_, cell) => {
  const col = cell % SHARD_COLS;
  const row = Math.floor(cell / SHARD_COLS);
  const [topLeft, topRight, bottomRight, bottomLeft] = [shardVertex(col, row), shardVertex(col + 1, row), shardVertex(col + 1, row + 1), shardVertex(col, row + 1)];
  return (col + row) % 2 === 0
    ? [
        [topLeft, topRight, bottomRight],
        [topLeft, bottomRight, bottomLeft],
      ]
    : [
        [topLeft, topRight, bottomLeft],
        [topRight, bottomRight, bottomLeft],
      ];
}).flat();

function centroidOf(shard: Point[]): Point {
  return { x: shard.reduce((sum, point) => sum + point.x, 0) / shard.length, y: shard.reduce((sum, point) => sum + point.y, 0) / shard.length };
}

/** The leftover sand blows away: a dust puff, then every clump lifts off from the last touch and drifts away on the wind, blurring as it goes. */
function ShatterLayer({ shatter }: { shatter: Shatter }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const { origin } = shatter;
    const animations = Array.from(layer.children).flatMap((child, index) => {
      if (!(child instanceof HTMLElement)) return [];
      const center = centroidOf(SHARDS[index]);
      const dx = center.x - origin.x;
      const dy = center.y - origin.y;
      const wind = 30 + ((index * 37) % 45);
      const lift = -12 - ((index * 23) % 30);
      return [
        child.animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 1, filter: 'blur(0px)' },
            { transform: `translate(${dx * 0.06}%, ${dy * 0.06 - 2}%) scale(1.02)`, opacity: 1, filter: 'blur(0.4px)', offset: 0.18 },
            { transform: `translate(${dx * 0.35 + wind}%, ${dy * 0.25 + lift}%) scale(0.35)`, opacity: 0, filter: 'blur(4px)' },
          ],
          { duration: 1300 + (index % 7) * 90, delay: Math.hypot(dx, dy) * 5, easing: 'cubic-bezier(.4,.05,.55,1)', fill: 'forwards' },
        ),
      ];
    });
    const flash = flashRef.current?.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    return () => {
      animations.forEach((animation) => animation.cancel());
      flash?.cancel();
    };
  }, [shatter]);

  return (
    <>
      <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        {SHARDS.map((shard, index) => {
          const center = centroidOf(shard);
          return (
            <span
              key={index}
              style={{
                backgroundImage: `url(${shatter.image})`,
                backgroundSize: '100% 100%',
                clipPath: `polygon(${shard.map((point) => `${point.x}% ${point.y}%`).join(', ')})`,
                transformOrigin: `${center.x}% ${center.y}%`,
              }}
              className="absolute inset-0"
            />
          );
        })}
      </div>
      <span ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[#efe3cc] opacity-0" />
    </>
  );
}

interface ScratchSurfaceProps {
  card: ScratchCardItem;
  currency: string;
  isRevealing: boolean;
  /** Fired on every brush move with the pointer position and the stroke's direction, for the shavings. */
  onScratch: (clientX: number, clientY: number, direction: Point) => void;
  onComplete: () => void;
}

/**
 * Zen sand tray: raked sand with two stones over a sage stone plate holding the prize. A coin follows the pointer and
 * tilts with the stroke, every move sprays sand grains, drags rake grooves that settle and jolts the tray slightly;
 * on reveal the remaining sand blows away on the wind from the last touch.
 */
function ScratchSurface({ card, currency, isRevealing, onScratch, onComplete }: ScratchSurfaceProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const lastPoint = useRef<Point | null>(null);
  const origin = useRef<Point>({ x: 50, y: 50 });
  const strokeCount = useRef(0);
  const trailFrame = useRef(0);
  const trailFramesLeft = useRef(0);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [shatter, setShatter] = useState<Shatter | null>(null);
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
    trailFramesLeft.current -= 1;
    if (trailFramesLeft.current <= 0) {
      context.clearRect(0, 0, trail.offsetWidth, trail.offsetHeight);
      trailFrame.current = 0;
      return;
    }
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgba(0,0,0,0.1)';
    context.fillRect(0, 0, trail.offsetWidth, trail.offsetHeight);
    trailFrame.current = requestAnimationFrame(fadeTrail);
  }

  /** A rake drags beside the finger: parallel grooves either side of the stroke, each a shadow line with a lit lip, then they settle. */
  function drawTrail(from: Point, to: Point) {
    const context = trailRef.current?.getContext('2d');
    if (!context || prefersReducedMotion()) return;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.5) return;
    const normalX = -dy / length;
    const normalY = dx / length;
    context.globalCompositeOperation = 'source-over';
    context.lineCap = 'round';

    for (const offset of RAKE_TEETH) {
      const shiftX = normalX * offset;
      const shiftY = normalY * offset;
      context.strokeStyle = 'rgba(92,68,40,0.6)';
      context.lineWidth = 2.4;
      context.beginPath();
      context.moveTo(from.x + shiftX, from.y + shiftY);
      context.lineTo(to.x + shiftX, to.y + shiftY);
      context.stroke();
      context.strokeStyle = 'rgba(255,247,230,0.75)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(from.x + shiftX + normalX * 1.6, from.y + shiftY + normalY * 1.6);
      context.lineTo(to.x + shiftX + normalX * 1.6, to.y + shiftY + normalY * 1.6);
      context.stroke();
    }
    if (Math.random() < 0.3) {
      context.fillStyle = '#fff7e6';
      drawSparkle(context, to.x + randomBetween(-BRUSH_RADIUS, BRUSH_RADIUS), to.y + randomBetween(-BRUSH_RADIUS, BRUSH_RADIUS), randomBetween(2.5, 5));
    }

    trailFramesLeft.current = TRAIL_FADE_FRAMES;
    if (!trailFrame.current) trailFrame.current = requestAnimationFrame(fadeTrail);
  }

  function complete() {
    if (isRevealing) return;
    const canvas = canvasRef.current;
    if (canvas && !shatter && !prefersReducedMotion()) setShatter({ image: canvas.toDataURL(), origin: origin.current });
    onComplete();
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
    if (ratio >= REVEAL_THRESHOLD) complete();
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
    origin.current = { x: (point.x / rect.width) * 100, y: (point.y / rect.height) * 100 };
    const direction = { x: point.x - from.x, y: point.y - from.y };

    const head = headRef.current;
    if (head) {
      head.style.transform = `translate(${point.x}px, ${point.y}px)`;
      head.style.opacity = '1';
    }
    // The coin leans into the stroke, so it reads as scraping rather than hovering.
    const coin = coinRef.current;
    if (coin && Math.hypot(direction.x, direction.y) > 1.5) {
      const lean = Math.max(-28, Math.min(28, direction.x * 2.2));
      coin.style.rotate = `${lean.toFixed(1)}deg`;
    }

    strokeCount.current += 1;
    onScratch(event.clientX, event.clientY, direction);
    if (strokeCount.current % 3 === 0 && !prefersReducedMotion()) frameRef.current?.animate(JOLT_KEYFRAMES, { duration: 140, easing: 'linear' });
    if (event.pointerType === 'touch' && strokeCount.current % 6 === 0) navigator.vibrate?.(6);
    if (strokeCount.current % MEASURE_EVERY === 0) measure(canvas);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (isRevealing) return;
    setTilt(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = null;
    setHasStarted(true);
    setIsScratching(true);
    scratchAt(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (isRevealing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) scratchAt(event);
    else setTilt(event);
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    lastPoint.current = null;
    setIsScratching(false);
    if (headRef.current) headRef.current.style.opacity = '0';
    if (coinRef.current) coinRef.current.style.rotate = '';
    if (!isRevealing) measure(event.currentTarget);
  }

  const showPrize = hasStarted || isRevealing;
  const shownProgress = isRevealing ? 100 : progress;
  const thresholdPercent = REVEAL_THRESHOLD * 100;

  return (
    <div>
      <div className="relative rounded-[24px] p-[1.5px]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
          <span
            className={cx(
              'absolute -inset-[60%] animate-rim-spin [background-image:conic-gradient(#9fc4ae,transparent_22%,#e0a890_50%,transparent_72%,#9fc4ae)] motion-reduce:animate-none',
              isScratching && '[animation-duration:1.1s]',
            )}
          />
        </span>

        <div
          ref={frameRef}
          className={cx(
            'relative isolate aspect-[16/10] w-full overflow-hidden rounded-[22.5px] bg-[#0f0b09] shadow-[0_30px_50px_-30px_rgb(0_0_0/0.9)] transition-[transform,scale] duration-300 ease-out',
            isScratching && 'scale-[0.985]',
          )}
        >
          <div className={cx('absolute inset-0 grid place-items-center overflow-hidden p-4 text-center', ticketStockClass, inkClass)}>
            <span aria-hidden="true" className={cx(holoClass, 'opacity-60')} />
            <span
              aria-hidden="true"
              className="absolute -inset-1/2 animate-orbit-spin opacity-60 [background-image:repeating-conic-gradient(rgb(255_255_255/0.75)_0deg_4deg,transparent_4deg_16deg)] [mask-image:radial-gradient(circle,black,transparent_55%)] motion-reduce:animate-none"
            />
            {isRevealing && (
              <>
                <span aria-hidden="true" className="absolute size-[34%] animate-ping-soft rounded-full border-2 border-[#062520]/30 motion-reduce:hidden" />
                <span aria-hidden="true" className="absolute size-[54%] animate-ping-soft rounded-full border border-[#062520]/20 [animation-delay:300ms] motion-reduce:hidden" />
              </>
            )}

            {showPrize && (
              <div
                className={cx(
                  'relative flex flex-col items-center gap-1.5 transition-transform duration-700 ease-out motion-reduce:transition-none',
                  isRevealing ? 'scale-110' : 'scale-95',
                )}
              >
                <span className={cx('relative grid size-13 place-items-center rounded-full', isWin ? 'bg-[#13201a] text-[#9fc4ae] shadow-[0_16px_28px_-14px_rgb(19_32_26/0.9)]' : 'bg-[#13201a]/10 text-[#13201a]/65')}>
                  {isWin && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-[#13201a]/30 motion-reduce:hidden" />}
                  <Icon name={isWin ? 'trophy' : 'history'} size={22} className="relative" />
                </span>
                {isWin ? (
                  <>
                    <span className={cx('text-[10.5px] font-semibold tracking-[0.18em] uppercase', inkMutedClass)}>{translate('scratch.youWon')}</span>
                    <span className="text-4xl font-black tracking-[-0.03em] tabular-nums sm:text-5xl">{formatMoney(card.reward, currency)}</span>
                  </>
                ) : (
                  <span className={cx('text-base font-semibold', inkMutedClass)}>{translate('scratch.loseTitle')}</span>
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
              'absolute inset-0 size-full touch-none transition-opacity duration-700 motion-reduce:transition-none',
              isScratching ? 'cursor-none' : 'cursor-crosshair',
              isRevealing && 'pointer-events-none opacity-0',
              shatter && 'duration-0',
            )}
          />
          <canvas
            ref={trailRef}
            aria-hidden="true"
            className={cx('pointer-events-none absolute inset-0 size-full transition-opacity duration-300', isRevealing && 'opacity-0')}
          />
          {shatter && <ShatterLayer shatter={shatter} />}

          <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500', (hasStarted || isRevealing) && 'opacity-0')}>
            <span className={cx(holoClass, 'opacity-50')} />
            <span ref={glintRef} className="absolute inset-0 mix-blend-overlay [background-image:radial-gradient(circle_at_var(--gx,30%)_var(--gy,30%),rgb(255_255_255/0.75),transparent_40%)]" />
            <span ref={shineRef} className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent" />
          </span>

          <span
            ref={headRef}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-30 -mt-[26px] -ml-[26px] grid size-[52px] place-items-center opacity-0 transition-opacity duration-200"
          >
            <span className="absolute inset-0 animate-ping-soft rounded-full border-2 border-white/60 motion-reduce:hidden" />
            <span
              ref={coinRef}
              className={cx(
                'nova-edge-light relative grid size-10 place-items-center overflow-hidden rounded-full shadow-[0_10px_18px_-8px_rgb(0_0_0/0.85)] ring-2 ring-white/80 transition-[rotate] duration-150 ease-out',
                ticketStockClass,
                inkClass,
              )}
            >
              <span aria-hidden="true" className={cx(holoClass, 'opacity-70')} />
              <span className="absolute inset-1 rounded-full border border-dashed border-[#062520]/35" />
              <Icon name="gift" size={15} className="relative" />
            </span>
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
          className="relative flex h-6 flex-1 items-center gap-[3px]"
        >
          {PROGRESS_CELLS.map((cell) => {
            const cellStart = (cell / PROGRESS_CELLS.length) * 100;
            const isLit = cellStart < shownProgress;
            const isHead = isLit && cellStart + 100 / PROGRESS_CELLS.length >= shownProgress && shownProgress < 100;
            const isThreshold = cellStart === thresholdPercent;
            return (
              <span
                key={cell}
                aria-hidden="true"
                style={{ transitionDelay: `${cell * 15}ms` }}
                className={cx(
                  'relative flex-1 rounded-full transition-[height,background-color] duration-300 motion-reduce:transition-none',
                  isLit ? 'h-5 bg-[#9fc4ae]' : 'h-2.5 bg-fg/[0.09]',
                  isHead && 'animate-blink motion-reduce:animate-none',
                  isThreshold && 'before:absolute before:-top-2 before:left-[-3px] before:h-[calc(100%+16px)] before:w-px before:bg-fg/40',
                )}
              />
            );
          })}
        </div>
        <span key={shownProgress} className="w-11 animate-tick-rise text-right font-mono text-sm font-bold text-fg tabular-nums motion-reduce:animate-none">
          {shownProgress}%
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-fg-muted">{translate('scratch.modalHint')}</p>
        <button
          type="button"
          onClick={complete}
          disabled={isRevealing}
          className="group/reveal relative isolate inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-full bg-[#9fc4ae] pr-1.5 pl-4 text-xs font-bold text-[#13201a] transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen [animation-duration:2.4s] motion-reduce:animate-none" />
          {translate('scratch.revealButton')}
          <span className="grid size-7 place-items-center rounded-full bg-[#13201a] text-[#9fc4ae] transition-transform group-hover/reveal:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={12} />
          </span>
        </button>
      </div>
    </div>
  );
}

const ROUTE_KEYFRAMES: Keyframe[] = [
  { left: '0%', opacity: 0 },
  { opacity: 1, offset: 0.15 },
  { opacity: 1, offset: 0.85 },
  { left: '100%', opacity: 0 },
];
const ROUTE_OPTIONS: KeyframeAnimationOptions = { duration: 1700, iterations: Infinity, easing: 'cubic-bezier(.5,0,.5,1)', delay: 500 };
const PERFORATION_DOTS = 22;

/** Result header shared by both outcomes: a glossy bead with a turning dashed ring, the title, and the card's ID chip. */
function ResultHeader({ icon, title, titleId, cardId, iconRef }: { icon: 'trophy' | 'history'; title: string; titleId: string; cardId: string; iconRef: RefObject<HTMLSpanElement | null> }) {
  const ringRef = useRef<HTMLSpanElement>(null);

  useMotion(ringRef, SPIN_KEYFRAMES, SPIN_OPTIONS);

  return (
    <div className="flex items-center gap-3.5">
      <span className="relative grid size-14 shrink-0 place-items-center">
        <span ref={ringRef} aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-[#9fc4ae]/50" />
        <span ref={iconRef} className="relative grid size-11 place-items-center rounded-full bg-[#9fc4ae] text-[#13201a]">
          <Icon name={icon} size={20} />
        </span>
      </span>
      <h2 id={titleId} className="min-w-0 flex-1 animate-rise text-2xl font-bold tracking-[-0.03em] text-fg motion-reduce:animate-none sm:text-[28px]">
        {title}
      </h2>
      <span className="shrink-0 rounded-full bg-fg/[0.06] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-fg-muted ring-1 ring-fg/10">{cardId}</span>
    </div>
  );
}

function CornerTicks({ className }: { className: string }) {
  return (
    <>
      {(['top-3 left-3 border-t-2 border-l-2 rounded-tl-md', 'top-3 right-3 border-t-2 border-r-2 rounded-tr-md', 'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md', 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-md'] as const).map(
        (corner) => (
          <span key={corner} aria-hidden="true" className={cx('absolute size-4', corner, className)} />
        ),
      )}
    </>
  );
}

/**
 * Prize slip: the amount drops in character by character on a silver holo plate, a perforation line lights up dot by
 * dot, and a packet runs from the card to the trading account to show where the reward went.
 */
function WinResult({ amount, currency, cardId, titleId, onDone }: { amount: number; currency: string; cardId: string; titleId: string; onDone: () => void }) {
  const beadRef = useRef<HTMLSpanElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const formatted = formatMoney(amount, currency);

  useMotion(beadRef, POP_KEYFRAMES, POP_OPTIONS);
  useMotion(packetRef, ROUTE_KEYFRAMES, ROUTE_OPTIONS);

  return (
    <div className="relative px-5 pt-6 pb-5 sm:px-6">
      <ResultHeader icon="trophy" title={translate('scratch.youWonTitle')} titleId={titleId} cardId={cardId} iconRef={beadRef} />

      <div
        style={{ animationDelay: '120ms' }}
        className={cx('relative isolate mt-5 animate-pop-in overflow-hidden rounded-[24px] px-6 pt-6 pb-5 motion-reduce:animate-none', ticketStockClass, inkClass)}
      >
        <span aria-hidden="true" className={cx(holoClass, '-z-10 opacity-70')} />
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen [animation-duration:2.6s] motion-reduce:animate-none" />
        <CornerTicks className="border-[#062520]/40" />

        <p className={cx('text-[10.5px] font-semibold tracking-[0.18em] uppercase', inkMutedClass)}>{translate('scratch.prizeCaption')}</p>
        <p className="mt-2 flex items-baseline overflow-hidden text-5xl font-black tracking-[-0.04em] tabular-nums sm:text-6xl">
          <span aria-hidden="true" className="flex">
            {formatted.split('').map((character, index) => (
              <span key={index} style={{ animationDelay: `${260 + index * 70}ms` }} className="inline-block animate-tick-rise motion-reduce:animate-none">
                {character}
              </span>
            ))}
          </span>
          <span className="sr-only">{formatted}</span>
        </p>

        <div aria-hidden="true" className="mt-5 flex items-center justify-between">
          {Array.from({ length: PERFORATION_DOTS }, (_, index) => (
            <span
              key={index}
              style={{ animationDelay: `${700 + index * 40}ms` }}
              className="size-1.5 animate-dot-pop rounded-full bg-[#062520]/40 motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex animate-rise items-center gap-3 motion-reduce:animate-none" style={{ animationDelay: '360ms' }}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg ring-1 ring-fg/10">
          <Icon name="gift" size={17} />
        </span>
        <span aria-hidden="true" className="relative h-px flex-1 border-t-2 border-dashed border-[#9fc4ae]/40">
          <span ref={packetRef} className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0a890] ring-4 ring-[#e0a890]/20" />
        </span>
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#9fc4ae] text-[#13201a]">
          <Icon name="wallet" size={17} />
          <span
            style={{ animationDelay: '1200ms' }}
            className="absolute -top-1.5 -right-1.5 grid size-5 animate-pop-in place-items-center rounded-full bg-success text-white ring-2 ring-elevated motion-reduce:animate-none"
          >
            <Icon name="check" size={11} />
          </span>
        </span>
      </div>
      <p role="status" className="mt-3 animate-rise text-sm text-fg-muted motion-reduce:animate-none" style={{ animationDelay: '460ms' }}>
        {translate('scratch.creditedTrading')}
      </p>

      <DoneButton onDone={onDone} />
    </div>
  );
}

function DoneButton({ onDone }: { onDone: () => void }) {
  return (
    <button
      type="button"
      onClick={onDone}
      className="group/done relative isolate mt-5 flex h-12 w-full items-center justify-between overflow-hidden rounded-full bg-[#9fc4ae] pr-2 pl-6 text-sm font-bold text-[#13201a] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen [animation-duration:2.8s] motion-reduce:animate-none" />
      {translate('scratch.done')}
      <span className="grid size-8 place-items-center rounded-full bg-[#13201a] text-[#9fc4ae] transition-transform duration-300 group-hover/done:translate-x-0.5 motion-reduce:transition-none">
        <Icon name="arrowRight" size={14} />
      </span>
    </button>
  );
}

function LoseResult({ cardId, titleId, onDone }: { cardId: string; titleId: string; onDone: () => void }) {
  const iconRef = useRef<HTMLSpanElement>(null);

  useMotion(iconRef, WOBBLE_KEYFRAMES, WOBBLE_OPTIONS);

  return (
    <div className="relative px-5 pt-6 pb-5 sm:px-6">
      <ResultHeader icon="history" title={translate('scratch.loseTitle')} titleId={titleId} cardId={cardId} iconRef={iconRef} />

      <div
        style={{ animationDelay: '120ms' }}
        className="relative mt-5 animate-pop-in rounded-[24px] border-2 border-dashed border-fg/15 bg-fg/[0.03] px-6 py-7 motion-reduce:animate-none"
      >
        <CornerTicks className="border-[#9fc4ae]/50" />
        <p className="max-w-xs text-sm text-fg-muted">{translate('scratch.loseText')}</p>
      </div>

      <DoneButton onDone={onDone} />
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

  function handleScratch(clientX: number, clientY: number, direction: Point) {
    const origin = localPoint(clientX, clientY);
    if (origin) emit(sandSprayAt(origin, direction));
  }

  function handleComplete() {
    if (isComplete.current) return;
    isComplete.current = true;
    setPhase('revealing');
    onRevealed(card);

    const width = containerRef.current?.offsetWidth ?? 0;
    if (isWin) emit(confettiFrom({ x: width / 2, y: 160 }, CONFETTI_COUNT / 2));
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
          <WinResult amount={card.reward} currency={currency} cardId={card.id} titleId={titleId} onDone={onClose} />
        ) : (
          <LoseResult cardId={card.id} titleId={titleId} onDone={onClose} />
        )
      ) : (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#9fc4ae] text-[#13201a]">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-[#9fc4ae]/35 motion-reduce:hidden" />
              <Icon name="gift" size={18} className="relative" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-lg font-semibold text-fg">
                {translate('scratch.modalTitle')}
              </h2>
              <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-fg-subtle">{card.id}</p>
            </div>
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
      className="m-auto w-[calc(100%-2rem)] max-w-lg animate-pop-in overflow-hidden rounded-[30px] border border-fg/10 bg-[#141010] p-0 text-fg shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)] backdrop:bg-overlay backdrop:backdrop-blur-md motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <span className="zenith-scan-x absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-[#9fc4ae] to-transparent" />
      </span>
      {card && <ScratchFlow key={card.id} card={card} currency={currency} titleId={titleId} onRevealed={onRevealed} onClose={onClose} />}
    </dialog>
  );
}
