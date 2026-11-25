'use client';

import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export const ACCENT = 'var(--zenith-red)';
export const boardClass = 'relative min-w-0 overflow-hidden rounded-[20px] bg-fg/[0.02] ring-1 ring-line';
export const captionClass = 'font-mono text-[10.5px] font-semibold tracking-[0.12em] uppercase';
export const fieldShell =
  'rounded-[14px] bg-fg/[0.03] ring-1 ring-line transition-[box-shadow,background-color] duration-300 focus-within:bg-surface focus-within:ring-2 focus-within:ring-fg';
// The note goes to an admin as plain text, so only letters, digits, spaces and . , - are allowed.
export const NOTE_PATTERN = /^[\p{L}\p{N}\s.,-]*$/u;

export type FieldName = 'recipient' | 'amount' | 'note';
export type StepState = 'done' | 'active' | 'idle';

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Keeps digits and a single decimal point with at most two decimals.
export function sanitizeAmount(raw: string): string {
  const [whole, ...fraction] = raw.replace(/[^\d.]/g, '').split('.');
  return fraction.length === 0 ? whole : `${whole}.${fraction.join('').slice(0, 2)}`;
}

export function FieldLabel({ htmlFor, required, aside, children }: { htmlFor: string; required?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-black text-fg">
        {children}
        {required && (
          <span aria-hidden="true" style={{ color: ACCENT }} className="ml-1">
            *
          </span>
        )}
      </label>
      {aside}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex animate-feed-in items-center gap-1.5 text-xs font-semibold text-danger motion-reduce:animate-none">
      <span aria-hidden="true" className="zenith-blink size-1.5 rounded-full bg-danger" />
      {message}
    </p>
  );
}

// Note length as a thin depth bar that turns danger near the limit.
export function NoteCounter({ used, max }: { used: number; max: number }) {
  const share = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const isNearLimit = share >= 90;
  return (
    <span className={cx('flex items-center gap-2 font-mono text-[11px] tabular-nums', isNearLimit ? 'text-danger' : 'text-fg-subtle')}>
      <span aria-hidden="true" className="h-1.5 w-16 overflow-hidden rounded-full bg-fg/10">
        <span style={{ width: `${share}%` }} className={cx('block h-full rounded-full transition-[width] duration-200', isNearLimit ? 'bg-danger' : 'bg-fg/70')} />
      </span>
      {used}/{max}
    </span>
  );
}

export function Monogram({ name, isEmpty, isLive }: { name: string; isEmpty: boolean; isLive: boolean }) {
  return (
    <span className="relative grid size-12 shrink-0 place-items-center">
      {isLive && <span aria-hidden="true" style={{ background: ACCENT }} className="itx-halo absolute inset-0 rounded-[14px]" />}
      <span
        key={isEmpty ? 'empty' : name}
        className={cx(
          'relative grid size-12 place-items-center rounded-[14px] font-mono text-sm font-black',
          isEmpty ? 'border-2 border-dashed border-line-strong text-fg-subtle' : 'animate-dot-pop bg-fg text-app motion-reduce:animate-none',
        )}
      >
        {isEmpty ? '?' : initials(name)}
      </span>
    </span>
  );
}
