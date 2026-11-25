'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { addDays, arrowMoves, fromKey, monthCells, shiftView, toKey, viewOf, weekdayLabels, type MonthView } from './DateRangePicker';
import { Icon } from './Icon';
import { useFloatingPosition } from './useFloatingPosition';

interface DatePickerProps {
  id: string;
  /** `YYYY-MM-DD`, or an empty string when nothing is picked. */
  value: string;
  onChange: (value: string) => void;
  /** Latest selectable day (`YYYY-MM-DD`); later days are shown but disabled. */
  max?: string;
  invalid?: boolean;
  placeholder?: string;
}

type PickerView = 'days' | 'months' | 'years';

const YEARS_SHOWN = 100;
const triggerFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long' });
const shortMonthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
const fullDayFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const navButtonClass =
  'grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ring';

export function DatePicker({ id, value, onChange, max, invalid = false, placeholder = 'Select date' }: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PickerView>('days');
  const [month, setMonth] = useState<MonthView>(() => viewOf(value || max || toKey(new Date())));
  const [focusedKey, setFocusedKey] = useState(value || max || toKey(new Date()));
  const floatingStyle = useFloatingPosition(triggerRef, panelRef, isOpen);

  const maxView = max ? viewOf(max) : null;
  const isAfterMax = (key: string) => Boolean(max && key > max);
  const canGoForward = !maxView || month.year < maxView.year || (month.year === maxView.year && month.month < maxView.month);
  const lastYear = maxView?.year ?? new Date().getFullYear();
  const years = Array.from({ length: YEARS_SHOWN }, (_, index) => lastYear - index);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const target = view === 'days' ? `[data-day="${focusedKey}"]` : view === 'years' ? `[data-year="${month.year}"]` : `[data-month="${month.month}"]`;
    const element = panelRef.current?.querySelector<HTMLElement>(target);
    if (view === 'years') element?.scrollIntoView({ block: 'center' });
    element?.focus({ preventScroll: true });
  }, [isOpen, view, focusedKey, month]);

  function open() {
    const start = value || max || toKey(new Date());
    setMonth(viewOf(start));
    setFocusedKey(start);
    setView('days');
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function choose(key: string) {
    if (isAfterMax(key)) return;
    onChange(key);
    close();
  }

  function pickYear(year: number) {
    setMonth((current) => ({ ...current, year }));
    setView('months');
  }

  function pickMonth(monthIndex: number) {
    const next = { year: month.year, month: monthIndex };
    setMonth(next);
    const day = Math.min(fromKey(focusedKey).getDate(), new Date(next.year, monthIndex + 1, 0).getDate());
    setFocusedKey(toKey(new Date(next.year, monthIndex, day)));
    setView('days');
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key in arrowMoves) {
      event.preventDefault();
      const next = addDays(focusedKey, arrowMoves[event.key]);
      setFocusedKey(next);
      setMonth(viewOf(next));
    }
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (view === 'days') close();
    else setView('days');
  }

  const today = toKey(new Date());
  const headerLabel = `${monthFormatter.format(new Date(month.year, month.month, 1))} ${month.year}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
        className={cx(
          'group flex h-11 w-full items-center gap-3 rounded-lg bg-surface px-3.5 text-left text-sm ring-1 transition-shadow focus-visible:outline-none focus-visible:ring-2',
          invalid ? 'ring-warning/60 focus-visible:ring-warning' : 'ring-line hover:ring-line-strong focus-visible:ring-primary',
          isOpen && 'ring-2 ring-primary',
        )}
      >
        <span
          className={cx(
            'grid size-7 shrink-0 place-items-center rounded-md transition-colors',
            isOpen || value ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-fg-subtle',
          )}
        >
          <Icon name="calendar" size={14} />
        </span>
        <span className={cx('min-w-0 flex-1 truncate tabular-nums', value ? 'text-fg' : 'text-fg-subtle')}>
          {value ? triggerFormatter.format(fromKey(value)) : placeholder}
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
          className="w-[19rem] max-w-[calc(100vw-1rem)] animate-rise overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop motion-reduce:animate-none"
        >
          <div className="flex items-center gap-1 border-b border-line px-2 py-2">
            <button
              type="button"
              aria-label={view === 'days' ? 'Choose month and year' : 'Back to days'}
              onClick={() => setView(view === 'days' ? 'years' : 'days')}
              className="group flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-fg transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="truncate">{view === 'days' ? headerLabel : view === 'months' ? month.year : 'Select year'}</span>
              <Icon name="chevronDown" size={14} className={cx('shrink-0 text-primary transition-transform duration-200', view !== 'days' && 'rotate-180')} />
            </button>
            {view === 'days' && (
              <>
                <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => shiftView(current, -1))} className={navButtonClass}>
                  <Icon name="chevronRight" size={16} className="rotate-180" />
                </button>
                <button type="button" aria-label="Next month" disabled={!canGoForward} onClick={() => setMonth((current) => shiftView(current, 1))} className={navButtonClass}>
                  <Icon name="chevronRight" size={16} />
                </button>
              </>
            )}
          </div>

          <div key={view} className="animate-feed-in p-3 motion-reduce:animate-none">
            {view === 'days' && (
              <div role="grid" aria-label={headerLabel} onKeyDown={handleDayKeyDown}>
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
                    const isSelected = key === value;
                    const isToday = key === today;
                    const isDisabled = isAfterMax(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="gridcell"
                        data-day={key}
                        tabIndex={key === focusedKey ? 0 : -1}
                        disabled={isDisabled}
                        aria-selected={isSelected}
                        aria-label={fullDayFormatter.format(fromKey(key))}
                        onClick={() => choose(key)}
                        onFocus={() => setFocusedKey(key)}
                        className={cx(
                          'mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                          isSelected
                            ? 'scale-105 bg-primary font-semibold text-on-primary shadow-[0_0_18px_-4px_var(--brand-primary)]'
                            : 'text-fg hover:bg-hover',
                          !isSelected && isToday && 'ring-1 ring-primary/60 text-primary',
                          isDisabled && 'cursor-not-allowed text-fg-subtle/40 hover:bg-transparent',
                        )}
                      >
                        {fromKey(key).getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'months' && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const isDisabled = Boolean(maxView && (month.year > maxView.year || (month.year === maxView.year && monthIndex > maxView.month)));
                  const isCurrent = monthIndex === month.month;
                  return (
                    <button
                      key={monthIndex}
                      type="button"
                      data-month={monthIndex}
                      disabled={isDisabled}
                      onClick={() => pickMonth(monthIndex)}
                      className={cx(
                        'rounded-lg py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-30',
                        isCurrent ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-muted hover:bg-hover hover:text-fg',
                      )}
                    >
                      {shortMonthFormatter.format(new Date(2024, monthIndex, 1))}
                    </button>
                  );
                })}
              </div>
            )}

            {view === 'years' && (
              <div className="grid max-h-60 grid-cols-4 gap-2 overflow-y-auto pr-1">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    data-year={year}
                    onClick={() => pickYear(year)}
                    className={cx(
                      'rounded-lg py-2 text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                      year === month.year ? 'bg-primary text-on-primary' : 'text-fg-muted hover:bg-hover hover:text-fg',
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
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
            <span className="truncate text-xs text-fg-subtle tabular-nums">{value ? fullDayFormatter.format(fromKey(value)) : placeholder}</span>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
