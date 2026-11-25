'use client';

import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const ACCENT = 'var(--zenith-red)';
export const boardClass = 'relative min-w-0 overflow-hidden rounded-[20px] bg-fg/[0.02] ring-1 ring-line';
export const captionClass = 'font-mono text-[10.5px] font-semibold tracking-[0.12em] uppercase';
export const lotsFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatDay(iso: string | null): string {
  return iso ? dayFormat.format(new Date(iso)) : '—';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function share(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0;
}

export function badgeTone(value: string): string {
  if (/reject|never|fail|block|suspend/i.test(value)) return 'bg-danger/10 text-danger ring-danger/30';
  if (/approv|verif|active|funded/i.test(value)) return 'bg-success/12 text-success ring-success/30';
  return 'bg-fg/[0.05] text-fg-muted ring-line';
}

// Exchange-style board header: square symbol chip, ticker caption, title, optional right slot.
export function BoardHead({ icon, caption, title, children, className }: { icon: IconName; caption: ReactNode; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-fg text-app">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx(captionClass, 'truncate text-fg-subtle')}>{caption}</p>
        <h2 className="truncate text-base leading-tight font-black tracking-tight text-fg">{title}</h2>
      </div>
      {children}
    </header>
  );
}

// Market-style search field used by both books.
export function BookSearch({ value, placeholder, clearLabel, onChange }: { value: string; placeholder: string; clearLabel?: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[12px] bg-fg/[0.03] pr-1.5 pl-3 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg">
      <Icon name="search" size={15} className="shrink-0 text-fg-muted" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && clearLabel && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel}
          className="grid size-8 place-items-center rounded-[9px] text-fg-muted transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </label>
  );
}
