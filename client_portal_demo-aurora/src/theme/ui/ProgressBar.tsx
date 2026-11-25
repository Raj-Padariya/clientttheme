'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cx';

type ProgressSize = 'sm' | 'md';

const sizeClass: Record<ProgressSize, { track: string; fill: string; chip: string }> = {
  sm: { track: 'h-[18px]', fill: 'p-[2px]', chip: 'min-w-[34px] px-1.5 text-[9.5px]' },
  md: { track: 'h-7', fill: 'p-[3px]', chip: 'min-w-[44px] px-2 text-xs' },
};

// One rAF loop drives both the fill width and the chip, so they always move together.
const PROGRESS_INTRO_DELAY_MS = 300;
const PROGRESS_INTRO_DURATION_MS = 1600;
const PROGRESS_INTRO_PEAK_AT = 0.55;

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

// Chip value during the intro: 0 → 100 by the peak, then back down to the real percent.
function introPercent(elapsedMs: number, percent: number): number {
  const progress = Math.min(Math.max((elapsedMs - PROGRESS_INTRO_DELAY_MS) / PROGRESS_INTRO_DURATION_MS, 0), 1);
  if (progress <= PROGRESS_INTRO_PEAK_AT) return 100 * easeOut(progress / PROGRESS_INTRO_PEAK_AT);
  const settle = easeOut((progress - PROGRESS_INTRO_PEAK_AT) / (1 - PROGRESS_INTRO_PEAK_AT));
  return 100 + (percent - 100) * settle;
}

interface ProgressBarProps {
  /** 0–100; values outside are clamped. */
  value: number;
  label: string;
  role?: 'progressbar' | 'meter';
  size?: ProgressSize;
  className?: string;
}

// Gold fill carrying its percentage in a chip at the leading edge; the unfilled part is striped.
// On first mount the fill sweeps to full and settles on its value; later value changes apply directly.
export function ProgressBar({ value, label, role = 'progressbar', size = 'md', className }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 100));
  const styles = sizeClass[size];
  const latestPercent = useRef(percent);
  const [introValue, setIntroValue] = useState<number | null>(0);

  useEffect(() => {
    latestPercent.current = percent;
  }, [percent]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const totalMs = PROGRESS_INTRO_DELAY_MS + PROGRESS_INTRO_DURATION_MS;
    let frame = 0;
    let startedAt: number | null = null;

    function step(now: number) {
      startedAt ??= now;
      const elapsed = now - startedAt;
      if (reduceMotion || elapsed >= totalMs) {
        setIntroValue(null);
        return;
      }
      setIntroValue(introPercent(elapsed, latestPercent.current));
      frame = window.requestAnimationFrame(step);
    }

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const fillPercent = introValue ?? percent;

  return (
    <div
      role={role}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cx('progress-track flex w-full overflow-hidden rounded-full', styles.track, className)}
    >
      <div
        className={cx(
          'flex h-full min-w-fit justify-end rounded-full [background-image:var(--brand-gradient)] shadow-[0_0_14px_-2px_color-mix(in_srgb,var(--brand-primary)_55%,transparent)]',
          styles.fill,
        )}
        style={{ width: `${fillPercent}%` }}
      >
        <span
          aria-hidden="true"
          className={cx(
            'grid h-full place-items-center rounded-full bg-white/25 font-semibold text-on-primary tabular-nums ring-1 ring-white/35 ring-inset',
            styles.chip,
          )}
        >
          {Math.round(fillPercent)}%
        </span>
      </div>
    </div>
  );
}
