'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { addDays, arrowMoves, fromKey, monthCells, shiftView, toKey, viewOf, weekdayLabels, type MonthView } from './DateRangePicker';
import { Icon } from './Icon';
import { useFloatingPosition } from './useFloatingPosition';

interface DateTimePickerProps {
  id: string;
  /** `YYYY-MM-DDTHH:mm` (the `datetime-local` format), or an empty string when nothing is picked. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}

type Period = 'AM' | 'PM';

interface TimeParts {
  hour: number;
  minute: number;
}

interface ColumnItem<T> {
  value: T;
  label: string;
}

const triggerFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long' });
const fullDayFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const navButtonClass =
  'grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring';

const pad = (value: number) => String(value).padStart(2, '0');
const hourItems: ColumnItem<number>[] = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: pad(index + 1) }));
const minuteItems: ColumnItem<number>[] = Array.from({ length: 60 }, (_, index) => ({ value: index, label: pad(index) }));
const periodItems: ColumnItem<Period>[] = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function nowParts(): TimeParts {
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}

function parseValue(value: string): { dateKey: string; time: TimeParts } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return { dateKey: match[1], time: { hour: Number(match[2]), minute: Number(match[3]) } };
}

function toValue(dateKey: string, time: TimeParts): string {
  return `${dateKey}T${pad(time.hour)}:${pad(time.minute)}`;
}

function to12Hour(hour: number): { hour12: number; period: Period } {
  return { hour12: hour % 12 || 12, period: hour >= 12 ? 'PM' : 'AM' };
}

function to24Hour(hour12: number, period: Period): number {
  return (hour12 % 12) + (period === 'PM' ? 12 : 0);
}

function TimeColumn<T extends string | number>({
  label,
  items,
  selected,
  onSelect,
  columnRef,
}: {
  label: string;
  items: ColumnItem<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  columnRef: (element: HTMLDivElement | null) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const current = items.findIndex((item) => item.value === selected);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = items[(Math.max(current, 0) + step + items.length) % items.length];
    onSelect(next.value);
    const option = event.currentTarget.querySelector<HTMLElement>(`[data-value="${next.value}"]`);
    option?.focus({ preventScroll: true });
    option?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <div
      ref={columnRef}
      role="listbox"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="relative h-full w-14 overflow-y-auto overscroll-contain scroll-smooth py-1 [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const isSelected = item.value === selected;
        return (
          <button
            key={item.value}
            type="button"
            role="option"
            data-value={item.value}
            aria-selected={isSelected}
            tabIndex={isSelected || (selected === null && item === items[0]) ? 0 : -1}
            onClick={() => onSelect(item.value)}
            className={cx(
              'mx-auto my-0.5 grid h-9 w-12 place-items-center rounded-lg font-mono text-sm tabular-nums transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
              isSelected
                ? 'scale-105 bg-primary font-semibold text-on-primary shadow-[0_0_18px_-4px_var(--brand-primary)]'
                : 'text-fg-muted hover:bg-hover hover:text-fg',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function DateTimePicker({ id, value, onChange, invalid = false, describedBy, placeholder = 'Select date & time' }: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState<MonthView>(() => viewOf(parseValue(value)?.dateKey ?? toKey(new Date())));
  const [focusedKey, setFocusedKey] = useState(() => parseValue(value)?.dateKey ?? toKey(new Date()));
  const floatingStyle = useFloatingPosition(triggerRef, panelRef, isOpen);

  const parsed = parseValue(value);
  const selectedKey = parsed?.dateKey ?? null;
  const clock = parsed ? to12Hour(parsed.time.hour) : null;

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  function open() {
    const start = parsed?.dateKey ?? toKey(new Date());
    setMonth(viewOf(start));
    setFocusedKey(start);
    setIsOpen(true);
    // After the panel mounts: focus the day and centre each time column on its picked value.
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(`[data-day="${start}"]`)?.focus({ preventScroll: true });
      for (const column of columnRefs.current) {
        const option = column?.querySelector<HTMLElement>('[aria-selected="true"]');
        if (column && option) column.scrollTop = option.offsetTop - column.clientHeight / 2 + option.offsetHeight / 2;
      }
    });
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function chooseDay(key: string) {
    setFocusedKey(key);
    onChange(toValue(key, parsed?.time ?? nowParts()));
  }

  function chooseTime(time: TimeParts) {
    onChange(toValue(selectedKey ?? focusedKey, time));
  }

  function chooseHour(hour12: number) {
    chooseTime({ hour: to24Hour(hour12, clock?.period ?? 'AM'), minute: parsed?.time.minute ?? 0 });
  }

  function chooseMinute(minute: number) {
    chooseTime({ hour: parsed?.time.hour ?? 0, minute });
  }

  function choosePeriod(period: Period) {
    chooseTime({ hour: to24Hour(clock?.hour12 ?? 12, period), minute: parsed?.time.minute ?? 0 });
  }

  function jumpToToday() {
    const today = toKey(new Date());
    setMonth(viewOf(today));
    chooseDay(today);
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.key in arrowMoves)) return;
    event.preventDefault();
    const next = addDays(focusedKey, arrowMoves[event.key]);
    setFocusedKey(next);
    setMonth(viewOf(next));
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus({ preventScroll: true }));
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }

  const today = toKey(new Date());
  const headerLabel = `${monthFormatter.format(new Date(month.year, month.month, 1))} ${month.year}`;
  const clockLabel = parsed && clock ? `${pad(clock.hour12)}:${pad(parsed.time.minute)} ${clock.period}` : '--:-- --';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={describedBy}
        onClick={() => (isOpen ? close() : open())}
        className={cx(
          'group flex h-11 w-full items-center gap-3 rounded-lg bg-surface px-3.5 text-left text-sm ring-1 transition-shadow focus-visible:outline-none focus-visible:ring-2',
          invalid ? 'ring-warning/60 focus-visible:ring-warning' : 'ring-line hover:ring-line-strong focus-visible:ring-primary',
          isOpen && 'ring-2 ring-primary',
        )}
      >
        <span className={cx('grid size-7 shrink-0 place-items-center rounded-md transition-colors', isOpen || value ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-fg-subtle')}>
          <Icon name="calendar" size={14} />
        </span>
        <span className={cx('min-w-0 flex-1 truncate tabular-nums', value ? 'text-fg' : 'text-fg-subtle')}>
          {parsed ? triggerFormatter.format(new Date(fromKey(parsed.dateKey).setHours(parsed.time.hour, parsed.time.minute))) : placeholder}
        </span>
        <Icon name="chevronDown" size={15} className={cx('shrink-0 text-fg-subtle transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-180 text-primary')} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={placeholder}
            onKeyDown={handlePanelKeyDown}
            style={floatingStyle}
            className="max-w-[calc(100vw-1rem)] animate-rise overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop motion-reduce:animate-none"
          >
            <div className="flex flex-col sm:flex-row">
              {/* Calendar */}
              <div className="w-[19rem] max-w-full">
                <div className="flex items-center gap-1 border-b border-line px-2 py-2">
                  <span className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-sm font-semibold text-fg">{headerLabel}</span>
                  <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => shiftView(current, -1))} className={navButtonClass}>
                    <Icon name="chevronRight" size={16} className="rotate-180" />
                  </button>
                  <button type="button" aria-label="Next month" onClick={() => setMonth((current) => shiftView(current, 1))} className={navButtonClass}>
                    <Icon name="chevronRight" size={16} />
                  </button>
                </div>
                <div key={`${month.year}-${month.month}`} role="grid" aria-label={headerLabel} onKeyDown={handleDayKeyDown} className="animate-feed-in p-3 motion-reduce:animate-none">
                  <div role="row" className="mb-1 grid grid-cols-7">
                    {weekdayLabels.map((label) => (
                      <span key={label} role="columnheader" className="py-1 text-center text-[10.5px] font-medium tracking-wide text-fg-subtle uppercase">
                        {label.slice(0, 2)}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {monthCells(month).map((key, index) => {
                      if (!key) return <span key={`blank-${index}`} aria-hidden="true" />;
                      const isSelected = key === selectedKey;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="gridcell"
                          data-day={key}
                          tabIndex={key === focusedKey ? 0 : -1}
                          aria-selected={isSelected}
                          aria-label={fullDayFormatter.format(fromKey(key))}
                          onClick={() => chooseDay(key)}
                          onFocus={() => setFocusedKey(key)}
                          className={cx(
                            'mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                            isSelected ? 'scale-105 bg-primary font-semibold text-on-primary shadow-[0_0_18px_-4px_var(--brand-primary)]' : 'text-fg hover:bg-hover',
                            !isSelected && key === today && 'text-primary ring-1 ring-primary/60',
                          )}
                        >
                          {fromKey(key).getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex flex-col border-t border-line sm:border-t-0 sm:border-l">
                <div className="flex items-center gap-2 border-b border-line px-3 py-3.5">
                  <Icon name="clock" size={14} className="text-primary" />
                  <span aria-live="polite" className="font-mono text-sm font-semibold text-fg tabular-nums">
                    {clockLabel}
                  </span>
                </div>
                {/* Fixed height so the 60-minute list scrolls inside instead of stretching the panel to its full length. */}
                <div className="flex h-48 gap-1 px-1 sm:h-[17.5rem]">
                  <TimeColumn label="Hour" items={hourItems} selected={clock?.hour12 ?? null} onSelect={chooseHour} columnRef={(element) => (columnRefs.current[0] = element)} />
                  <TimeColumn label="Minute" items={minuteItems} selected={parsed?.time.minute ?? null} onSelect={chooseMinute} columnRef={(element) => (columnRefs.current[1] = element)} />
                  <TimeColumn label="AM / PM" items={periodItems} selected={clock?.period ?? null} onSelect={choosePeriod} columnRef={(element) => (columnRefs.current[2] = element)} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  close();
                }}
                className="rounded-md px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-hover hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
              >
                Clear
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
