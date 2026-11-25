'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const ACCENT = 'var(--zenith-red)';
export const deskClass = 'relative overflow-hidden rounded-[22px] bg-fg/[0.02] ring-1 ring-line';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DAY_MS = 86_400_000;

// "2 months ago" style label; switches to days for anything under a month.
export function formatAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days < 30) return relativeTime.format(-days, 'day');
  return relativeTime.format(-Math.round(days / 30), 'month');
}

export function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

export function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

// Terminal window title bar: icon chip + mono caption on the left, controls on the right.
export function DeskHead({ icon, title, children, className }: { icon: IconName; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5', className)}>
      <p className="flex min-w-0 items-center gap-2 font-mono text-[11px] font-bold tracking-[0.14em] text-fg-muted uppercase">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-fg/[0.07] text-fg">
          <Icon name={icon} size={12} />
        </span>
        <span className="truncate">{title}</span>
        <span aria-hidden="true" style={{ background: ACCENT }} className="ibd-cursor h-3 w-1.5 shrink-0 rounded-[1px]" />
      </p>
      {children}
    </header>
  );
}
