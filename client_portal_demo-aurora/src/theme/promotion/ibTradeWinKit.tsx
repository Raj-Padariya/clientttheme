'use client';

import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const ACCENT = 'var(--zenith-red)';
export const boardClass = 'relative min-w-0 overflow-hidden rounded-[20px] bg-fg/[0.02] ring-1 ring-line';
export const captionClass = 'font-mono text-[10.5px] font-semibold tracking-[0.12em] uppercase';

// Exchange-style section title: a square symbol chip, a ticker-like caption and an optional right slot.
export function BoardTitle({ icon, symbol, title, children, className }: { icon: IconName; symbol: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-fg text-app">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx(captionClass, 'text-fg-subtle')}>{symbol}</p>
        <h2 className="truncate text-base leading-tight font-black tracking-tight text-fg">{title}</h2>
      </div>
      {children}
    </header>
  );
}

export function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-2 py-1 font-mono text-[10px] font-black tracking-[0.14em] text-success uppercase">
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-success motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      {label}
    </span>
  );
}

export function EmptyBoard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span aria-hidden="true" className="flex h-10 items-end gap-1">
        {[40, 70, 30, 90, 55, 75, 45].map((height, bar) => (
          <span key={bar} style={{ height: `${height}%`, animationDelay: `${bar * 0.15}s` }} className="twx-tick w-2 rounded-sm bg-fg/15" />
        ))}
      </span>
      <span className="grid size-11 place-items-center rounded-[12px] bg-fg/[0.06] text-fg">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <p className="text-sm font-black text-fg">{title}</p>
        <p className="mt-1 text-xs text-fg-muted">{text}</p>
      </div>
    </div>
  );
}
