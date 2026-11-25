'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cx';

const STAGGER_MS = 90;

export function staggerStyle(index: number, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * STAGGER_MS}ms` };
}

// Eases a number from 0 to `target`; jumps straight to it when the user prefers reduced motion.
function useCountUp(target: number, durationMs = 1400): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const skip = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

export function CountUp({ value, format }: { value: number; format: (current: number) => string }) {
  const current = useCountUp(value);
  return <>{format(current)}</>;
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
      <span className="relative size-2 rounded-full bg-success" />
    </span>
  );
}
