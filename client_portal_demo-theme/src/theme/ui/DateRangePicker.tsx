'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from './Button';
import { Icon } from './Icon';

/** Both ends are `YYYY-MM-DD` strings; an empty string means that end is open. */
export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  id?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  fromLabel: string;
  toLabel: string;
  /** Which edge of the trigger the calendar lines up with; use 'end' when the picker sits at the right of its card. */
  align?: 'start' | 'end';
  className?: string;
}

export interface MonthView {
  year: number;
  month: number;
}

export const DAYS_PER_WEEK = 7;
const LAST_COLUMN = DAYS_PER_WEEK - 1;
const captionClass = 'block truncate text-[10.5px] tracking-[0.1em] text-fg-subtle uppercase';
const navButtonClass =
  'flex size-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring';

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const fullDayFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const shortDayFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
// 1 Jan 2024 was a Monday, so these seven dates give the weekday names in Monday-first order.
export const weekdayLabels = Array.from({ length: DAYS_PER_WEEK }, (_, index) => weekdayFormatter.format(new Date(2024, 0, 1 + index)));

export const arrowMoves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -DAYS_PER_WEEK, ArrowDown: DAYS_PER_WEEK };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, days: number): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return toKey(date);
}

export function viewOf(key: string): MonthView {
  const date = fromKey(key);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function shiftView(view: MonthView, delta: number): MonthView {
  const date = new Date(view.year, view.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Day keys for one month laid out Monday-first, padded with `null` to whole weeks. */
export function monthCells(view: MonthView): (string | null)[] {
  const leading = (new Date(view.year, view.month, 1).getDay() + LAST_COLUMN) % DAYS_PER_WEEK;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(toKey(new Date(view.year, view.month, day)));
  while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null);
  return cells;
}

export function formatDateKey(key: string): string {
  return key ? shortDayFormatter.format(fromKey(key)) : '';
}

export function DateRangePicker({ id, value, onChange, fromLabel, toLabel, align = 'start', className }: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [today, setToday] = useState('');
  const [view, setView] = useState<MonthView>({ year: 2026, month: 0 });
  const [focusedDay, setFocusedDay] = useState('');
  const [hoveredDay, setHoveredDay] = useState('');

  const hasValue = Boolean(value.from || value.to);
  const isPickingEnd = Boolean(value.from) && !value.to;
  // While the end is still open, the hovered (or keyboard-focused) day previews where the range would end.
  const previewEnd = isPickingEnd ? hoveredDay : '';
  const otherEnd = value.to || previewEnd || value.from;
  const rangeStart = value.from && otherEnd < value.from ? otherEnd : value.from;
  const rangeEnd = value.from && otherEnd < value.from ? value.from : otherEnd;
  const hasRange = Boolean(rangeStart && rangeEnd && rangeStart !== rangeEnd);

  const cells = monthCells(view);
  const monthTitle = monthFormatter.format(new Date(view.year, view.month, 1));
  const tabbableDay = cells.includes(focusedDay) ? focusedDay : cells.find((cell) => cell !== null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !focusedDay) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedDay}"]`)?.focus();
  }, [isOpen, focusedDay]);

  function open() {
    const todayKey = toKey(new Date());
    const anchor = value.from || todayKey;
    setToday(todayKey);
    setView(viewOf(anchor));
    setFocusedDay(anchor);
    setHoveredDay('');
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function pick(day: string) {
    setFocusedDay(day);
    setHoveredDay('');
    if (!isPickingEnd) {
      onChange({ from: day, to: '' });
      return;
    }
    onChange(day < value.from ? { from: day, to: value.from } : { from: value.from, to: day });
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = (event.target as HTMLElement).dataset.day;
    if (!current || !(event.key in arrowMoves)) return;
    event.preventDefault();
    const next = addDays(current, arrowMoves[event.key]);
    setFocusedDay(next);
    setView(viewOf(next));
    if (isPickingEnd) setHoveredDay(next);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }

  const hint = isPickingEnd
    ? translate('datePicker.selectEnd')
    : value.from && value.to
      ? `${formatDateKey(value.from)} → ${formatDateKey(value.to)}`
      : translate('datePicker.selectStart');

  return (
    <div ref={rootRef} className={cx('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
        className={cx(
          'group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isOpen && 'bg-surface-2/70',
        )}
      >
        <span
          className={cx(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            hasValue ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-fg-muted group-hover:text-fg',
          )}
        >
          <Icon name="calendar" size={15} />
        </span>
        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          {[
            { label: fromLabel, day: value.from },
            { label: toLabel, day: value.to },
          ].map((end, index) => (
            <span key={end.label} className={cx('min-w-0', index === 1 && 'col-start-3')}>
              <span className={captionClass}>{end.label}</span>
              <span className={cx('mt-0.5 block truncate text-sm font-medium', end.day ? 'text-primary' : 'text-fg-muted')}>
                {formatDateKey(end.day) || translate('datePicker.anyDate')}
              </span>
            </span>
          ))}
          <Icon name="arrowRight" size={14} className="col-start-2 row-start-1 mb-0.5 text-fg-subtle" />
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={cx('shrink-0 text-fg-subtle transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-180 text-primary')}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`${fromLabel} – ${toLabel}`}
          onKeyDown={handleDialogKeyDown}
          className={cx(
            'glass glass-strong absolute top-full isolate z-40 mt-2 w-[min(21rem,calc(100vw-2.5rem))] animate-rise overflow-hidden rounded-[26px] border border-fg/10 p-3.5 shadow-pop motion-reduce:animate-none',
            align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          )}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/15 via-transparent to-fg/[0.06]" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-12 -z-10 size-44 rounded-full bg-primary/25 blur-3xl" />

          <div className="flex items-center justify-between gap-2 rounded-full border border-fg/10 bg-fg/[0.06] p-1">
            <button type="button" aria-label={translate('datePicker.prevMonth')} onClick={() => setView((current) => shiftView(current, -1))} className={navButtonClass}>
              <Icon name="chevronRight" size={16} className="rotate-180" />
            </button>
            <p aria-live="polite" className="bg-clip-text text-sm font-semibold text-transparent [background-image:var(--brand-gradient)]">
              {monthTitle}
            </p>
            <button type="button" aria-label={translate('datePicker.nextMonth')} onClick={() => setView((current) => shiftView(current, 1))} className={navButtonClass}>
              <Icon name="chevronRight" size={16} />
            </button>
          </div>

          <div aria-hidden="true" className="mt-3 grid grid-cols-7 text-center text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
            {weekdayLabels.map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            role="group"
            aria-label={monthTitle}
            onKeyDown={handleGridKeyDown}
            onPointerLeave={() => setHoveredDay('')}
            className="mt-1 grid grid-cols-7 gap-y-1"
          >
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} aria-hidden="true" className="h-10" />;

              const column = index % DAYS_PER_WEEK;
              const isStart = day === rangeStart;
              const isEnd = day === rangeEnd;
              const inRange = hasRange && day >= rangeStart && day <= rangeEnd;
              const isEndpoint = day === value.from || day === value.to;
              const isToday = day === today;
              return (
                <div key={day} className="relative flex h-10 items-center justify-center">
                  {inRange && (
                    <span
                      aria-hidden="true"
                      className={cx(
                        'absolute inset-y-0.5 border-y border-fg/10 bg-fg/[0.08]',
                        isStart || column === 0 ? 'left-0.5 rounded-l-full border-l' : 'left-0',
                        isEnd || column === LAST_COLUMN ? 'right-0.5 rounded-r-full border-r' : 'right-0',
                        isPickingEnd && 'border-dashed bg-fg/[0.04]',
                      )}
                    />
                  )}
                  <button
                    type="button"
                    data-day={day}
                    tabIndex={day === tabbableDay ? 0 : -1}
                    aria-label={fullDayFormatter.format(fromKey(day))}
                    aria-pressed={isEndpoint}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => pick(day)}
                    onFocus={() => setFocusedDay(day)}
                    onPointerEnter={() => {
                      if (isPickingEnd) setHoveredDay(day);
                    }}
                    className={cx(
                      'relative flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                      isEndpoint && 'font-semibold text-on-primary shadow-[0_0_18px_-4px_var(--brand-primary)] [background-image:var(--brand-gradient)]',
                      !isEndpoint && inRange && 'font-medium text-fg hover:bg-fg/10',
                      !isEndpoint && !inRange && 'text-fg-muted hover:bg-fg/10 hover:text-fg',
                      !isEndpoint && isToday && 'text-primary ring-1 ring-primary/60',
                    )}
                  >
                    {fromKey(day).getDate()}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-fg/10 pt-3">
            <p aria-live="polite" className="min-w-0 truncate text-xs text-fg-muted">
              {hint}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" disabled={!hasValue} onClick={() => onChange({ from: '', to: '' })}>
                {translate('datePicker.clear')}
              </Button>
              <Button type="button" size="sm" onClick={close}>
                {translate('datePicker.done')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
