'use client';

import { useId, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { DatePicker } from '../ui/DatePicker';
import { Icon, type IconName } from '../ui/Icon';
import { directClientsCopy as copy, type DirectPeriod } from './ibDirectClientsData';

const DAY_MS = 86_400_000;

/*
 * Shared My Network controls: the period range helpers, the period selector and the direct/network scope switch.
 * Used by the network page, the cascade book and the member overview page.
 */
const RED = 'var(--zenith-red)';
const captionClass = 'text-[10px] font-semibold tracking-[0.14em] uppercase';

export interface PeriodRange {
  from: number | null;
  to: number | null;
}

export function periodRange(period: DirectPeriod, customFrom: string, customTo: string, now = new Date()): PeriodRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  switch (period) {
    case 'today':
      return { from: Date.UTC(year, month, now.getUTCDate()), to: null };
    case '7d':
      return { from: now.getTime() - 7 * DAY_MS, to: null };
    case '30d':
      return { from: now.getTime() - 30 * DAY_MS, to: null };
    case 'mtd':
      return { from: Date.UTC(year, month, 1), to: null };
    case 'all':
      return { from: null, to: null };
    case 'custom':
      return {
        from: customFrom ? Date.parse(`${customFrom}T00:00:00Z`) : null,
        to: customTo ? Date.parse(`${customTo}T23:59:59Z`) : null,
      };
  }
}

export function isInRange(iso: string | null, range: PeriodRange): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return (range.from === null || time >= range.from) && (range.to === null || time <= range.to);
}

/* ───────────── Header controls: period capsule dock + scope capsule switch ───────────── */

export function PeriodDial({ period, customFrom, customTo, onPeriod, onCustomFrom, onCustomTo, only, customLabel, layout = 'row' }: {
  /** Restrict the presets (e.g. the member overview has no Custom). Defaults to all of them. */
  only?: DirectPeriod[];
  customLabel?: string;
  /** `rail` packs the pills into a 3-column grid for a narrow side panel. */
  layout?: 'row' | 'rail';
  period: DirectPeriod;
  customFrom: string;
  customTo: string;
  onPeriod: (period: DirectPeriod) => void;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
}) {
  const fieldId = useId();
  const periods = only ? copy.periods.filter((option) => only.includes(option.id)) : copy.periods;
  const isRail = layout === 'rail';

  return (
    <div className={cx('flex flex-col gap-3', !isRail && 'items-stretch sm:items-end')}>
      <div
        role="radiogroup"
        aria-label={copy.title}
        className={cx('bg-fg/[0.03] p-1 ring-1 ring-line', isRail ? 'grid grid-cols-3 gap-1 rounded-[22px]' : 'flex flex-wrap gap-1 rounded-[24px] sm:rounded-full')}
      >
        {periods.map((option) => {
          const isActive = option.id === period;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onPeriod(option.id)}
              className={cx(
                'group/period relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-bold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
              )}
            >
              <span
                aria-hidden="true"
                style={isActive ? { background: RED } : undefined}
                className={cx('size-1.5 shrink-0 rounded-[2px] transition-colors', isActive ? 'zenith-blink' : 'bg-fg/25 group-hover/period:bg-fg/60')}
              />
              {option.id === 'custom' && customLabel ? customLabel : option.label}
            </button>
          );
        })}
      </div>
      {period === 'custom' && (
        <div className={cx('flex animate-feed-in gap-2 motion-reduce:animate-none', isRail ? 'flex-col' : 'flex-col sm:flex-row')}>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`${fieldId}-from`} className={cx(captionClass, 'text-fg-subtle')}>
              {copy.customFrom}
            </label>
            <DatePicker id={`${fieldId}-from`} value={customFrom} max={customTo || undefined} onChange={onCustomFrom} />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`${fieldId}-to`} className={cx(captionClass, 'text-fg-subtle')}>
              {copy.customTo}
            </label>
            <DatePicker id={`${fieldId}-to`} value={customTo} onChange={onCustomTo} />
          </div>
        </div>
      )}
    </div>
  );
}

export type NetworkScope = 'direct' | 'network';

export function ScopeSwitch({ scope, directCount, networkCount, onChange }: {
  scope: NetworkScope;
  directCount: number;
  networkCount: number;
  onChange: (scope: NetworkScope) => void;
}) {
  const scopes: { id: NetworkScope; label: string; count: number; icon: IconName }[] = [
    { id: 'direct', label: copy.tabDirect, count: directCount, icon: 'user' },
    { id: 'network', label: copy.tabNetwork, count: networkCount, icon: 'accounts' },
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const isMove = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key);
    if (!isMove) return;
    event.preventDefault();
    const next = scope === 'direct' ? 'network' : 'direct';
    onChange(next);
    document.getElementById(`ib-scope-${next}`)?.focus();
  }

  return (
    <div role="tablist" onKeyDown={handleKeyDown} className="grid grid-cols-2 gap-1 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
      {scopes.map((item) => {
        const isActive = item.id === scope;
        return (
          <button
            key={item.id}
            id={`ib-scope-${item.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cx(
              'group relative flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-1.5 pl-1 text-left text-sm font-bold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            <span
              style={isActive ? { background: RED } : undefined}
              className={cx(
                'grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none',
                isActive ? 'text-white' : 'bg-fg/[0.06] text-fg',
              )}
            >
              <Icon name={item.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span
              key={item.count}
              className={cx(
                'grid h-7 min-w-7 animate-dot-pop place-items-center rounded-full px-2 font-mono text-xs font-black tabular-nums motion-reduce:animate-none',
                isActive ? 'bg-app/15' : 'bg-fg/[0.06] text-fg',
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
