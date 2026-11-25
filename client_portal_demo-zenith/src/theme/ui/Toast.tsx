'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  durationMs: number;
}

interface ToastOptions {
  tone?: ToastTone;
  description?: string;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 4000;
const EXIT_DURATION_MS = 220;
const MAX_VISIBLE = 4;

const toneStyle: Record<ToastTone, { icon: IconName; accent: string; bubble: string }> = {
  success: { icon: 'check', accent: 'bg-success', bubble: 'bg-success/15 text-success ring-success/30' },
  info: { icon: 'bell', accent: 'bg-primary', bubble: 'bg-primary-soft text-primary ring-primary/30' },
  warning: { icon: 'clock', accent: 'bg-warning', bubble: 'bg-warning/15 text-warning ring-warning/30' },
  danger: { icon: 'close', accent: 'bg-danger', bubble: 'bg-danger/15 text-danger ring-danger/30' },
};

// A tiny module-level store so any component can call `toast()` without a context provider.
let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function toast(title: string, { tone = 'success', description, durationMs = DEFAULT_DURATION_MS }: ToastOptions = {}) {
  toasts = [...toasts, { id: nextId++, tone, title, description, durationMs }].slice(-MAX_VISIBLE);
  emit();
}

function ToastCard({ item }: { item: ToastItem }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(item.durationMs);
  const startedAtRef = useRef(0);
  const style = toneStyle[item.tone];

  useEffect(() => {
    if (isPaused || isLeaving) return;
    startedAtRef.current = Date.now();
    const timer = setTimeout(() => setIsLeaving(true), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [isPaused, isLeaving]);

  useEffect(() => {
    if (!isLeaving) return;
    const timer = setTimeout(() => dismissToast(item.id), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isLeaving, item.id]);

  return (
    <li
      role={item.tone === 'danger' ? 'alert' : 'status'}
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      className={cx(
        'pointer-events-auto relative flex w-full animate-toast-in items-start gap-3 overflow-hidden rounded-xl border border-line-strong bg-elevated/95 py-3.5 pr-3 pl-4 shadow-pop backdrop-blur transition-[opacity,transform] duration-200 motion-reduce:animate-none motion-reduce:transition-none',
        isLeaving && 'translate-x-6 opacity-0',
      )}
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', style.accent)} />
      <span className={cx('relative grid size-9 shrink-0 place-items-center rounded-full ring-1', style.bubble)}>
        <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full ring-1 ring-current motion-reduce:hidden" />
        <Icon name={style.icon} size={16} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-fg">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs text-fg-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setIsLeaving(true)}
        className="grid size-7 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="close" size={14} />
      </button>
      <span aria-hidden="true" className="absolute right-0 bottom-0 left-0 h-0.5 bg-line">
        <span
          style={{
            animationDuration: `${item.durationMs}ms`,
            animationTimingFunction: 'linear',
            animationDirection: 'reverse',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
          className={cx('block h-full origin-left animate-grow opacity-70', style.accent)}
        />
      </span>
    </li>
  );
}

/** Mount once (in the app shell). Toasts stack top-right, newest first, and pause their timer while hovered. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);

  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5"
    >
      {[...items].reverse().map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </ol>
  );
}
