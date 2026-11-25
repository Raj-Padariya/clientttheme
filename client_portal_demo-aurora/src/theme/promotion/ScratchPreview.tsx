'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { prefersReducedMotion } from './ScratchExperience';

const SAGE = '#9fc4ae';
const CLAY = '#e0a890';
const FLAKE_COLORS = [SAGE, CLAY, '#2c3d38', '#d4e8dc'];
const BRUSH_RADIUS = 17;
// Zigzag the coin scratches along, in fractions of the tray's width and height.
const COIN_PATH: [number, number][] = [
  [0.08, 0.2],
  [0.92, 0.28],
  [0.12, 0.44],
  [0.88, 0.54],
  [0.14, 0.72],
  [0.86, 0.82],
];
const SCRATCH_MS = 3400;
const HOLD_MS = 1400;
const REFILL_MS = 1000;
const CYCLE_MS = SCRATCH_MS + HOLD_MS + REFILL_MS;
const GROOVES = 9;
const GLITTER = 110;

interface Point {
  x: number;
  y: number;
}

interface Flake extends Point {
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  color: string;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Dark raked-sand coating with sage grooves and clay glitter, drawn over the whole tray. */
function paintCoating(context: CanvasRenderingContext2D, width: number, height: number) {
  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#24342e');
  base.addColorStop(0.55, '#16211c');
  base.addColorStop(1, '#0f1814');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1.2;
  for (let groove = 0; groove < GROOVES; groove += 1) {
    const y = height * (0.07 + groove * 0.107);
    context.strokeStyle = `rgba(159,196,174,${0.16 + (groove % 3) * 0.06})`;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(width * 0.3, y - 6, width * 0.6, y + 6, width, y - 2);
    context.stroke();
  }

  // Fixed pseudo-random glitter so every refill looks the same.
  for (let dot = 0; dot < GLITTER; dot += 1) {
    context.fillStyle = `rgba(224,168,144,${0.12 + (dot % 5) * 0.08})`;
    context.fillRect((((dot * 97) % 101) / 101) * width, (((dot * 61) % 103) / 103) * height, 1.8, 1.8);
  }
}

/** Where the coin is after `progress` (0–1) of the zigzag, measured by distance so it moves at an even speed. */
function pointOnPath(progress: number, width: number, height: number): Point {
  const points = COIN_PATH.map(([x, y]) => ({ x: x * width, y: y * height }));
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let remaining = progress * lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) {
      const share = lengths[index] ? remaining / lengths[index] : 0;
      return { x: points[index].x + (points[index + 1].x - points[index].x) * share, y: points[index].y + (points[index + 1].y - points[index].y) * share };
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

/**
 * A self-playing scratch: a coin zigzags over a dark sand coating and really scrapes it off (flakes fly), the gift
 * underneath lights up, then the coating pours back and the coin goes again. Static coating under reduced motion.
 */
export function ScratchPreview({ children }: { children?: ReactNode }) {
  const trayRef = useRef<HTMLDivElement>(null);
  const coatRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<HTMLCanvasElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const prizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tray = trayRef.current;
    const coat = coatRef.current;
    const flakes = flakesRef.current;
    const coin = coinRef.current;
    const prize = prizeRef.current;
    const coatContext = coat?.getContext('2d');
    const flakeContext = flakes?.getContext('2d');
    if (!tray || !coat || !flakes || !coin || !prize || !coatContext || !flakeContext) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let cycleStart = performance.now();
    let lastPoint: Point | null = null;
    let particles: Flake[] = [];

    const restart = (now: number) => {
      coatContext.globalCompositeOperation = 'source-over';
      coatContext.globalAlpha = 1;
      paintCoating(coatContext, width, height);
      cycleStart = now;
      lastPoint = null;
      prize.dataset.lit = 'false';
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = tray.offsetWidth;
      height = tray.offsetHeight;
      for (const canvas of [coat, flakes]) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      coatContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      flakeContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      restart(performance.now());
    };

    const scrape = (point: Point) => {
      const from = lastPoint ?? point;
      coatContext.globalCompositeOperation = 'destination-out';
      coatContext.lineCap = 'round';
      coatContext.lineWidth = BRUSH_RADIUS * 2;
      coatContext.beginPath();
      coatContext.moveTo(from.x, from.y);
      coatContext.lineTo(point.x, point.y);
      coatContext.stroke();
      // Ragged bites so the edge looks scraped rather than cut.
      for (let bite = 0; bite < 5; bite += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = BRUSH_RADIUS * randomBetween(0.75, 1.15);
        coatContext.beginPath();
        coatContext.arc(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, randomBetween(2, 4.5), 0, Math.PI * 2);
        coatContext.fill();
      }
      coatContext.globalCompositeOperation = 'source-over';

      const dx = point.x - from.x;
      const dy = point.y - from.y;
      for (let flake = 0; flake < 3; flake += 1) {
        particles.push({
          x: point.x + randomBetween(-BRUSH_RADIUS, BRUSH_RADIUS) * 0.6,
          y: point.y + randomBetween(-BRUSH_RADIUS, BRUSH_RADIUS) * 0.6,
          vx: -dx * 0.25 + randomBetween(-1.6, 1.6),
          vy: -dy * 0.25 + randomBetween(-3.2, -1),
          size: randomBetween(2.5, 6),
          rotation: randomBetween(0, Math.PI),
          spin: randomBetween(-0.3, 0.3),
          life: 0,
          maxLife: randomBetween(28, 50),
          color: FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)],
        });
      }

      const lean = Math.max(-28, Math.min(28, dx * 3));
      coin.style.opacity = '1';
      coin.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${lean.toFixed(1)}deg)`;
      lastPoint = point;
    };

    const drawFlakes = () => {
      flakeContext.clearRect(0, 0, width, height);
      particles = particles.filter((particle) => particle.life < particle.maxLife);
      for (const particle of particles) {
        particle.life += 1;
        particle.vy += 0.28;
        particle.vx *= 0.97;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        flakeContext.save();
        flakeContext.globalAlpha = 1 - particle.life / particle.maxLife;
        flakeContext.translate(particle.x, particle.y);
        flakeContext.rotate(particle.rotation);
        flakeContext.fillStyle = particle.color;
        flakeContext.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        flakeContext.restore();
      }
    };

    const tick = (now: number) => {
      const elapsed = now - cycleStart;
      if (elapsed < SCRATCH_MS) {
        scrape(pointOnPath(elapsed / SCRATCH_MS, width, height));
      } else if (elapsed < SCRATCH_MS + HOLD_MS) {
        coin.style.opacity = '0';
        prize.dataset.lit = 'true';
      } else if (elapsed < CYCLE_MS) {
        // The sand pours back: the coating is laid again at low alpha every frame until it is solid.
        coatContext.globalAlpha = 0.12;
        paintCoating(coatContext, width, height);
        coatContext.globalAlpha = 1;
        prize.dataset.lit = 'false';
      } else {
        restart(now);
      }
      drawFlakes();
      frame = requestAnimationFrame(tick);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(tray);
    if (!prefersReducedMotion()) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={trayRef} className="relative isolate h-full overflow-hidden rounded-[24px] bg-linear-to-br from-[#d4e8dc] via-[#9fc4ae] to-[#7aa58d] text-[#062520]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1/2 animate-rim-spin opacity-60 mix-blend-soft-light [background-image:conic-gradient(from_0deg,#ffffff,#d4e8dc,#9fc4ae,#f0d2c4,#ffffff,#e0a890,#ffffff)] motion-reduce:animate-none"
      />
      <div
        ref={prizeRef}
        aria-hidden="true"
        data-lit="false"
        className="group/prize absolute inset-0 grid place-items-center transition-transform duration-500 ease-out data-[lit=true]:scale-110 motion-reduce:transition-none"
      >
        <span className="relative grid size-20 place-items-center rounded-full bg-[#062520] text-(--hero-buy) shadow-[0_18px_30px_-14px_rgb(6_37_32/0.9)]">
          <span className="absolute inset-0 rounded-full border-2 border-[#062520]/40 opacity-0 group-data-[lit=true]/prize:animate-ping-soft group-data-[lit=true]/prize:opacity-100" />
          <Icon name="gift" size={30} />
        </span>
      </div>
      <canvas ref={coatRef} aria-hidden="true" className="absolute inset-0 size-full" />
      <canvas ref={flakesRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <span
        ref={coinRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 grid size-11 place-items-center rounded-full bg-linear-to-br from-[#f0d2c4] via-[#e0a890] to-[#b9785f] opacity-0 shadow-[0_10px_18px_-8px_rgb(0_0_0/0.85)] ring-2 ring-white/60"
      >
        <span className="size-7 rounded-full border-2 border-dashed border-[#062520]/45" />
      </span>
      {children}
    </div>
  );
}
