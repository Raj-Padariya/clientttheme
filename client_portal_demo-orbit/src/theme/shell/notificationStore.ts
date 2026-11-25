'use client';

import { useSyncExternalStore } from 'react';
import { mockNotifications, type AppNotification, type AppNotificationKind } from '@/core/mock/notifications';
import type { IconName } from '../ui/Icon';

export interface StoredNotification extends Omit<AppNotification, 'ageSeconds'> {
  /** Epoch ms. */
  createdAt: number;
}

export const notificationKindMeta: Record<AppNotificationKind, { icon: IconName; tile: string }> = {
  scratch: { icon: 'scratchCard', tile: 'bg-primary/12 text-primary ring-primary/30' },
  account: { icon: 'accounts', tile: 'bg-sky-500/12 text-sky-500 ring-sky-500/30' },
};

// There is no backend: read state lives in memory so the bell and the notifications page agree while
// navigating, and a reload resets it (same approach as promotion/contestEnrollment.ts).
const loadedAt = Date.now();
let items: StoredNotification[] = mockNotifications.map(({ ageSeconds, ...rest }) => ({ ...rest, createdAt: loadedAt - ageSeconds * 1000 }));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readItems = () => items;

export function useNotifications(): StoredNotification[] {
  return useSyncExternalStore(subscribe, readItems, readItems);
}

export function markNotificationRead(id: string) {
  if (!items.some((item) => item.id === id && !item.read)) return;
  items = items.map((item) => (item.id === id ? { ...item, read: true } : item));
  emit();
}

export function markAllNotificationsRead() {
  if (items.every((item) => item.read)) return;
  items = items.map((item) => ({ ...item, read: true }));
  emit();
}

/* ───────────── Shared clock for "x ago" labels ───────────── */

const TICK_MS = 15_000;
let now = loadedAt;
let timer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  now = Date.now();
  timer ??= setInterval(() => {
    now = Date.now();
    clockListeners.forEach((notify) => notify());
  }, TICK_MS);
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const readNow = () => now;

export function useNow(): number {
  return useSyncExternalStore(subscribeClock, readNow, readNow);
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

export function timeAgo(createdAt: number, current: number): string {
  const seconds = Math.max(0, Math.round((current - createdAt) / 1000));
  if (seconds < 60) return relative.format(-seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  return relative.format(-Math.floor(hours / 24), 'day');
}

export type DayGroup = 'today' | 'yesterday' | 'earlier';

export function dayGroupOf(createdAt: number, current: number): DayGroup {
  const startOfToday = new Date(current).setHours(0, 0, 0, 0);
  if (createdAt >= startOfToday) return 'today';
  if (createdAt >= startOfToday - 86_400_000) return 'yesterday';
  return 'earlier';
}
