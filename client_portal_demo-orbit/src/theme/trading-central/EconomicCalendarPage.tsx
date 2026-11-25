'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { CountryFlag } from '../ui/CountryFlag';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox, Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { toast } from '../ui/Toast';
import { CalendarFaqModal } from './CalendarFaqModal';
import { CalendarStorytellerPanel } from './CalendarStorytellerPanel';
import { calendarStoryCopy } from './calendarStoryteller';
import {
  CALENDAR_MONTH_INDEX,
  CALENDAR_YEAR,
  RANGE_END_DAY,
  SELECTED_DAY,
  TIMEZONE,
  TIMEZONE_LABEL,
  TODAY,
  TOTAL_EVENTS,
  countryGroups,
  countryNames,
  disclaimerParagraphs,
  economicEvents,
  type CountryGroup,
  type EconomicEvent,
  type EventType,
  type Importance,
} from './economicEvents';

const IMPORTANCE_LEVELS: Importance[] = ['low', 'medium', 'high'];
const EVENT_TYPES: EventType[] = ['holiday', 'economic'];
const COUNTRY_GROUPS: CountryGroup[] = ['g7', 'eu', 'all'];
const ALL_COUNTRY_CODES = [...new Set([...Object.keys(countryNames), ...economicEvents.map((event) => event.country)])];
const byCountryName = (a: string, b: string) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b);
const COUNTRY_GROUP_MEMBERS: Record<CountryGroup, string[]> = {
  g7: [...countryGroups.g7].sort(byCountryName),
  eu: [...countryGroups.eu].sort(byCountryName),
  all: [...ALL_COUNTRY_CODES].sort(byCountryName),
};
const WEEKDAY_KEYS: MessageKey[] = [
  'tc.calendar.weekday.sun',
  'tc.calendar.weekday.mon',
  'tc.calendar.weekday.tue',
  'tc.calendar.weekday.wed',
  'tc.calendar.weekday.thu',
  'tc.calendar.weekday.fri',
  'tc.calendar.weekday.sat',
];
const EVENT_TYPE_ICON: Record<EventType, IconName> = { holiday: 'calendar', economic: 'barChart' };
const ROW_STAGGER_MS = 35;
const ROW_STAGGER_CAP_MS = 1200;
const MINUTES_PER_DAY = 24 * 60;
const RULER_HOURS = Array.from({ length: 25 }, (_, hour) => hour);
const RULER_LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';

type EventActionId = 'calendar' | 'history' | 'chart' | 'impact' | 'markets';

const EVENT_ACTIONS: { id: EventActionId; icon: IconName; label: string }[] = [
  { id: 'calendar', icon: 'calendarEdit', label: 'Add to calendar' },
  { id: 'history', icon: 'barChart', label: 'Historical data' },
  { id: 'chart', icon: 'areaChart', label: 'Chart' },
  { id: 'impact', icon: 'signalBars', label: 'Market impact' },
  { id: 'markets', icon: 'arrowsUpDown', label: 'Related markets' },
];

const pad2 = (value: number | string) => String(value).padStart(2, '0');
const escapeIcsText = (value: string) => value.replace(/([,;\\])/g, '\\$1');

function downloadCalendarFile(event: EconomicEvent) {
  const [hours, minutes] = event.time.split(':');
  const start = `${CALENDAR_YEAR}${pad2(CALENDAR_MONTH_INDEX + 1)}${pad2(SELECTED_DAY)}T${pad2(hours)}${pad2(minutes)}00`;
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Client Portal//Economic Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@economic-calendar`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TIMEZONE}:${start}`,
    'DURATION:PT30M',
    `SUMMARY:${escapeIcsText(`${event.country} · ${event.name}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function runEventAction(id: EventActionId, event: EconomicEvent) {
  if (id === 'calendar') {
    downloadCalendarFile(event);
    toast('Added to calendar', { description: `${event.name} · ${event.time}` });
    return;
  }
  const label = EVENT_ACTIONS.find((action) => action.id === id)?.label ?? '';
  toast(label, { tone: 'info', description: `${label} for ${event.name} is on the way.` });
}

const importanceStyle: Record<Importance, { bar: string; chip: string; level: number }> = {
  high: { bar: 'bg-danger', chip: 'bg-danger-soft text-danger ring-danger/30', level: 3 },
  medium: { bar: 'bg-warning', chip: 'bg-warning-soft text-warning ring-warning/30', level: 2 },
  low: { bar: 'bg-info', chip: 'bg-info-soft text-info ring-info/30', level: 1 },
};

const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
  new Date(Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH_INDEX, 1)),
);

function dayHeading(day: number): { date: string; weekday: string } {
  const value = new Date(Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH_INDEX, day));
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(value),
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(value),
  };
}

function parseFigure(value?: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}

// Beat/miss only makes sense when both sides were published in the same unit, which the feed guarantees per row.
function surprise(event: EconomicEvent): 'beat' | 'miss' | 'inline' | null {
  const actual = parseFigure(event.actual);
  const forecast = parseFigure(event.forecast);
  if (actual === null || forecast === null) return null;
  if (actual === forecast) return 'inline';
  return actual > forecast ? 'beat' : 'miss';
}

function toggleInSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function minuteOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function groupByTime(events: EconomicEvent[]): [string, EconomicEvent[]][] {
  const byTime = new Map<string, EconomicEvent[]>();
  for (const event of events) byTime.set(event.time, [...(byTime.get(event.time) ?? []), event]);
  return [...byTime.entries()];
}

function topImportance(events: EconomicEvent[]): Importance {
  return events.reduce<Importance>((best, event) => (importanceStyle[event.importance].level > importanceStyle[best].level ? event.importance : best), 'low');
}

// Renders on the client only so the server HTML never disagrees with the ticking time.
function useLiveClock(): string | null {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TIMEZONE });
    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return time;
}

function ImportanceMeter({ importance }: { importance: Importance }) {
  const style = importanceStyle[importance];
  return (
    <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((level) => (
        <span key={level} style={{ height: `${level * 33}%` }} className={cx('w-1 rounded-full', level <= style.level ? style.bar : 'bg-line-strong')} />
      ))}
    </span>
  );
}

/** 24-hour ruler: every time slot of the visible events is a bar (height = top importance), the needle is "now". */
function DayRuler({ time, events }: { time: string | null; events: EconomicEvent[] }) {
  const markers = useMemo(
    () =>
      groupByTime(events).flatMap(([slot, group]) => {
        const minute = minuteOfDay(slot);
        if (!Number.isFinite(minute)) return [];
        return [{ slot, minute, importance: topImportance(group), names: group.map((event) => event.name).join(' · ') }];
      }),
    [events],
  );
  const nowShare = time ? ((minuteOfDay(time) + Number(time.split(':')[2]) / 60) / MINUTES_PER_DAY) * 100 : null;

  return (
    <div aria-hidden="true">
      <div className="relative h-24 overflow-hidden rounded-xl border border-line bg-fg/[0.02]">
        {nowShare !== null && <span style={{ width: `${nowShare}%` }} className="absolute inset-y-0 left-0 bg-linear-to-r from-transparent to-primary/[0.08]" />}
        {RULER_HOURS.map((hour) => (
          <span
            key={hour}
            style={{ left: `${(hour / 24) * 100}%` }}
            className={cx('absolute bottom-0 w-px', hour % 3 === 0 ? 'h-3 bg-line-strong' : 'h-1.5 bg-line')}
          />
        ))}
        {markers.map((marker, index) => (
          <span
            key={marker.slot}
            title={`${marker.slot} · ${marker.names}`}
            style={{ left: `${(marker.minute / MINUTES_PER_DAY) * 100}%`, height: `${20 + importanceStyle[marker.importance].level * 18}%`, ...staggerStyle(index, 50) }}
            className={cx(
              'absolute bottom-3 w-1.5 -translate-x-1/2 origin-bottom animate-[grow-y_0.8s_ease-out_both] rounded-full opacity-85 transition-opacity hover:opacity-100 motion-reduce:animate-none',
              importanceStyle[marker.importance].bar,
            )}
          />
        ))}
        {nowShare !== null && (
          <span style={{ left: `${nowShare}%` }} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_14px_var(--brand-primary)]">
            <span className="absolute top-1.5 left-1/2 size-2.5 -translate-x-1/2 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none" />
            <span className="absolute top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-primary" />
          </span>
        )}
      </div>
      <div className="relative mt-1.5 h-4">
        {RULER_LABEL_HOURS.map((hour) => (
          <span
            key={hour}
            style={{ left: `${(hour / 24) * 100}%` }}
            className={cx(
              'absolute font-mono text-[10px] text-fg-subtle tabular-nums',
              hour === 0 ? 'translate-x-0' : hour === 24 ? '-translate-x-full' : '-translate-x-1/2',
            )}
          >
            {pad2(hour)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DayRulerHero({ visibleEvents, alertCount }: { visibleEvents: EconomicEvent[]; alertCount: number }) {
  const time = useLiveClock();
  const [hours, minutes, seconds] = (time ?? '--:--:--').split(':');
  const secondsElapsed = time ? Number(seconds) : 0;
  const counts = IMPORTANCE_LEVELS.map((level) => ({
    level,
    count: visibleEvents.filter((event) => event.importance === level).length,
  })).reverse();
  const total = Math.max(1, visibleEvents.length);

  return (
    <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/3 -z-10 size-96 animate-drift rounded-full bg-primary/12 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <LiveDot />
              {translate('tc.calendar.liveFeed')}
            </p>
            <span className="rounded-lg border border-line bg-fg/[0.03] px-2 py-1 font-mono text-[10px] tracking-wider text-fg-muted">{TIMEZONE_LABEL}</span>
            <span className="ml-auto flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span className="font-semibold text-fg tabular-nums">
                <CountUp value={TOTAL_EVENTS} format={(current) => String(Math.round(current))} />
              </span>
              {translate('tc.calendar.events')}
              <span aria-hidden="true" className="text-fg-subtle">
                /
              </span>
              <Icon name="bell" size={14} className="text-primary" />
              <span className="tabular-nums">{alertCount}</span> {translate('tc.calendar.alertsSet')}
            </span>
          </div>

          <div role="timer" aria-label={time ?? undefined} className="flex flex-col gap-2">
            <div aria-hidden="true" className="flex items-end gap-3">
              <span className="font-mono text-6xl leading-none font-semibold tracking-tight text-fg tabular-nums sm:text-7xl">
                {hours}
                <span className="animate-pulse text-primary motion-reduce:animate-none">:</span>
                {minutes}
              </span>
              <span className="mb-1.5 rounded-lg border border-primary/35 bg-primary/12 px-2 py-1 font-mono text-lg leading-none font-semibold text-primary tabular-nums">{seconds}</span>
            </div>
            <span aria-hidden="true" className="h-0.5 w-full max-w-xs overflow-hidden rounded-full bg-fg/[0.07]">
              <span
                style={{ width: `${(secondsElapsed / 60) * 100}%` }}
                className={cx('block h-full rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]', secondsElapsed > 0 && 'transition-[width] duration-1000 ease-linear motion-reduce:transition-none')}
              />
            </span>
          </div>

          <DayRuler time={time} events={visibleEvents} />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-fg/[0.02] p-4">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span className={cx(eyebrow, 'text-fg-subtle')}>{translate('tc.calendar.impactMix')}</span>
            <span className="tabular-nums">
              {visibleEvents.length} {translate('tc.calendar.shown')}
            </span>
          </div>
          <ul className="grid flex-1 grid-cols-3 gap-3">
            {counts.map(({ level, count }, index) => (
              <li key={level} className="flex flex-col gap-2">
                <span aria-hidden="true" className="relative min-h-28 flex-1 overflow-hidden rounded-xl bg-fg/[0.04]">
                  <span
                    style={{ height: `${(count / total) * 100}%`, ...staggerStyle(index, 200) }}
                    className={cx('absolute inset-x-0 bottom-0 origin-bottom animate-[grow-y_0.9s_ease-out_both] rounded-xl opacity-80 transition-[height] duration-500 motion-reduce:animate-none', importanceStyle[level].bar)}
                  />
                </span>
                <span className="font-mono text-xl font-semibold text-fg tabular-nums">
                  <CountUp value={count} format={(current) => pad2(Math.round(current))} />
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                  <ImportanceMeter importance={level} />
                  <span className="truncate">{translate(`tc.calendar.importance.${level}`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CommandBar({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const closeStory = useCallback(() => setIsStoryOpen(false), []);
  const closeFaq = useCallback(() => setIsFaqOpen(false), []);

  return (
    <div style={staggerStyle(1, 120)} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
      <div className="orbit-card flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <Input
            type="search"
            leftIcon="search"
            aria-label={translate('tc.calendar.search')}
            placeholder={translate('tc.calendar.search')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button aria-haspopup="dialog" onClick={() => setIsStoryOpen(true)} className="flex-1 sm:flex-none">
            <Icon name="bolt" size={16} />
            {translate('tc.calendar.storyteller')}
          </Button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={calendarStoryCopy.help}
            title={calendarStoryCopy.help}
            onClick={() => setIsFaqOpen(true)}
            className="grid size-10 shrink-0 place-items-center self-center rounded-xl border border-line bg-fg/[0.03] text-sm font-bold text-fg-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            ?
          </button>
        </div>
      </div>
      {isStoryOpen && <CalendarStorytellerPanel onClose={closeStory} />}
      {isFaqOpen && <CalendarFaqModal onClose={closeFaq} />}
    </div>
  );
}

/** The month as one scrollable ribbon of day pills; the published range is tinted, today carries a dot. */
function DayRibbon({ selectedDay, onSelect }: { selectedDay: number; onSelect: (day: number) => void }) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const daysInMonth = new Date(Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH_INDEX + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  useEffect(() => {
    const ribbon = ribbonRef.current;
    const active = ribbon?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!ribbon || !active) return;
    ribbon.scrollTo({ left: active.offsetLeft - ribbon.clientWidth / 2 + active.offsetWidth / 2, behavior: 'smooth' });
  }, [selectedDay]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-fg uppercase">
          <Icon name="calendar" size={15} className="text-primary" />
          {monthLabel}
        </p>
        <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase">{translate('tc.calendar.custom')}</span>
      </div>
      <div ref={ribbonRef} role="group" aria-label={monthLabel} className="relative -mx-1 flex gap-1.5 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
        {days.map((day) => {
          const inRange = day >= SELECTED_DAY && day <= RANGE_END_DAY;
          const isSelected = day === selectedDay;
          const isToday = day === TODAY;
          const weekday = new Date(Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH_INDEX, day)).getUTCDay();
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              aria-label={dayHeading(day).date}
              onClick={() => onSelect(day)}
              className={cx(
                'flex w-12 shrink-0 flex-col items-center gap-1 rounded-xl border py-2 transition-[background-color,border-color,color,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isSelected
                  ? 'border-primary/55 bg-primary/22 text-fg shadow-[0_10px_24px_-14px_var(--brand-primary)]'
                  : inRange
                    ? 'border-primary/20 bg-primary/[0.07] text-fg'
                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              <span className={cx('text-[9px] font-semibold tracking-wider uppercase', isSelected ? 'text-primary' : 'text-fg-subtle')}>{translate(WEEKDAY_KEYS[weekday])}</span>
              <span className="text-base leading-none font-semibold tabular-nums">{day}</span>
              <span aria-hidden="true" className={cx('size-1 rounded-full', isToday ? 'bg-primary shadow-[0_0_6px_var(--brand-primary)]' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <Icon name="globe" size={14} className="text-primary" />({TIMEZONE_LABEL}) · {translate('tc.calendar.timezoneHint')}
      </p>
    </div>
  );
}

function SwitchRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-[background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'border-primary/30 bg-primary/[0.08] text-fg' : 'border-line text-fg-muted hover:text-fg',
      )}
    >
      {children}
      <span aria-hidden="true" className={cx('relative ml-auto h-5 w-9 shrink-0 rounded-full transition-colors duration-200', active ? 'bg-primary/70' : 'bg-fg/10')}>
        <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-200 motion-reduce:transition-none', active ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

function FilterRail({
  selectedDay,
  importances,
  onToggleImportance,
  eventTypes,
  onToggleEventType,
  selectedCountries,
  onCountriesChange,
}: {
  selectedDay: number;
  importances: Set<Importance>;
  onToggleImportance: (value: Importance) => void;
  eventTypes: Set<EventType>;
  onToggleEventType: (value: EventType) => void;
  selectedCountries: Set<string>;
  onCountriesChange: (next: Set<string>) => void;
}) {
  // Below lg the filters fold behind one bar so the events stay right under the hero; from lg up it's a sticky rail.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="calendar-filters"
        onClick={() => setIsOpen((current) => !current)}
        className="orbit-card flex animate-rise items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none lg:hidden"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Icon name="filter" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{translate('tc.calendar.filters')}</span>
          <span className="block truncate text-xs text-fg-muted">
            {dayHeading(selectedDay).date} · {TIMEZONE_LABEL}
          </span>
        </span>
        <Icon name="chevronDown" size={16} className={cx('shrink-0 text-fg-subtle transition-transform duration-300 motion-reduce:transition-none', isOpen && 'rotate-180 text-primary')} />
      </button>

      <div
        id="calendar-filters"
        style={staggerStyle(2, 120)}
        className={cx('orbit-card animate-rise flex-col overflow-hidden motion-reduce:animate-none lg:flex', isOpen ? 'flex' : 'hidden')}
      >
        <h2 className="flex items-center gap-2.5 border-b border-line px-4 py-3.5 text-sm font-semibold text-fg">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/12 text-primary">
            <Icon name="filter" size={14} />
          </span>
          {translate('tc.calendar.filters')}
        </h2>

        <div className="flex flex-col gap-5 p-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className={cx(eyebrow, 'mb-2 text-fg-subtle')}>{translate('tc.calendar.importanceLabel')}</legend>
            {[...IMPORTANCE_LEVELS].reverse().map((level) => (
              <SwitchRow key={level} active={importances.has(level)} onClick={() => onToggleImportance(level)}>
                <ImportanceMeter importance={level} />
                {translate(`tc.calendar.importance.${level}`)}
              </SwitchRow>
            ))}
          </fieldset>

          <fieldset>
            <legend className={cx(eyebrow, 'mb-2 text-fg-subtle')}>{translate('tc.calendar.eventTypeLabel')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((type) => {
                const isActive = eventTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleEventType(type)}
                    className={cx(
                      'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-xs font-medium uppercase transition-[background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                      isActive ? 'border-primary/40 bg-primary/[0.1] text-fg' : 'border-line text-fg-muted hover:text-fg',
                    )}
                  >
                    <span className={cx('grid size-7 place-items-center rounded-lg', isActive ? 'bg-primary/20 text-primary' : 'bg-fg/[0.05]')}>
                      <Icon name={EVENT_TYPE_ICON[type]} size={14} />
                    </span>
                    {translate(`tc.calendar.eventType.${type}`)}
                    <span aria-hidden="true" className={cx('absolute top-2.5 right-2.5 size-2 rounded-full transition-colors', isActive ? 'bg-primary shadow-[0_0_6px_var(--brand-primary)]' : 'border border-line-strong')} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <CountryFilter selected={selectedCountries} onChange={onCountriesChange} />
        </div>
      </div>
    </aside>
  );
}

/** One group at a time behind tabs; members are flag chips instead of a checkbox list. */
function CountryFilter({ selected, onChange }: { selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [activeGroup, setActiveGroup] = useState<CountryGroup>('g7');
  const members = COUNTRY_GROUP_MEMBERS[activeGroup];
  const pickedCount = members.filter((code) => selected.has(code)).length;
  const groupLabel = translate(`tc.calendar.countryGroup.${activeGroup}`);

  const toggleGroup = (group: CountryGroup) => {
    const groupMembers = COUNTRY_GROUP_MEMBERS[group];
    const isFull = groupMembers.every((code) => selected.has(code));
    const next = new Set(selected);
    for (const code of groupMembers) {
      if (isFull) next.delete(code);
      else next.add(code);
    }
    onChange(next);
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={cx(eyebrow, 'mb-2 text-fg-subtle')}>{translate('tc.calendar.countriesLabel')}</legend>
      <div role="tablist" aria-label={translate('tc.calendar.countriesLabel')} className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-fg/[0.02] p-1">
        {COUNTRY_GROUPS.map((group) => {
          const isActive = group === activeGroup;
          const groupMembers = COUNTRY_GROUP_MEMBERS[group];
          const groupPicked = groupMembers.filter((code) => selected.has(code)).length;
          return (
            <button
              key={group}
              type="button"
              role="tab"
              id={`country-tab-${group}`}
              aria-selected={isActive}
              aria-controls="country-panel"
              onClick={() => setActiveGroup(group)}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'bg-primary/20 text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              <span className="truncate">{translate(`tc.calendar.countryGroup.${group}`)}</span>
              <span className={cx('font-mono text-[10px] tabular-nums', isActive ? 'text-primary' : 'text-fg-subtle')}>
                {groupPicked}/{groupMembers.length}
              </span>
            </button>
          );
        })}
      </div>

      <div id="country-panel" role="tabpanel" aria-labelledby={`country-tab-${activeGroup}`} className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <Checkbox checked={pickedCount === members.length} onChange={() => toggleGroup(activeGroup)} label={<span className="font-semibold text-fg">{groupLabel}</span>} />
          <span className={cx('rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums', pickedCount > 0 ? 'border-primary/30 bg-primary/10 text-primary' : 'border-line text-fg-subtle')}>
            {pickedCount}/{members.length}
          </span>
        </div>
        <ul key={activeGroup} className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {members.map((code, index) => {
            const isOn = selected.has(code);
            return (
              <li key={code} style={{ animationDelay: `${index * 25}ms` }} className="animate-feed-in motion-reduce:animate-none">
                <button
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => onChange(toggleInSet(selected, code))}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-[background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                    isOn ? 'border-primary/40 bg-primary/12 text-fg' : 'border-line text-fg-subtle hover:text-fg',
                  )}
                >
                  <CountryFlag code={code} />
                  {countryNames[code] ?? code}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </fieldset>
  );
}

function FigureCell({ label, value, tone, note, icon, emphasis = false }: { label: string; value?: string; tone?: string; note?: string; icon?: ReactNode; emphasis?: boolean }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-0.5 px-3 py-2.5', emphasis && 'bg-primary/[0.07]')}>
      <dt className="text-[9px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{label}</dt>
      <dd className={cx('flex items-center gap-1 text-sm font-semibold whitespace-nowrap tabular-nums', value ? (tone ?? 'text-fg') : 'text-fg-subtle')}>
        {icon}
        {value ?? '—'}
      </dd>
      {note && (
        <dd className="truncate text-[10px] text-fg-subtle" title={note}>
          {note}
        </dd>
      )}
    </div>
  );
}

function EventCard({ event, index, hasAlert, onToggleAlert }: { event: EconomicEvent; index: number; hasAlert: boolean; onToggleAlert: () => void }) {
  const result = surprise(event);
  const actualTone = result === 'beat' ? 'text-success' : result === 'miss' ? 'text-danger' : undefined;
  const style = importanceStyle[event.importance];

  return (
    <li
      style={{ animationDelay: `${Math.min(index * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS)}ms` }}
      className="group relative flex min-w-0 animate-feed-in flex-col overflow-hidden rounded-2xl border border-line bg-fg/[0.025] transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_36px_-24px_var(--brand-primary)] motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-0.5 opacity-80', style.bar)} />

      <div className="flex items-start gap-3 p-4 pb-3">
        <span title={countryNames[event.country] ?? event.country} className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-line bg-surface px-2 py-1.5">
          <CountryFlag code={event.country} />
          <span className="text-[10px] font-bold tracking-wide text-fg">{event.country}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-fg" title={event.name}>
            {event.name}
          </p>
          <span className={cx('mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1', style.chip)}>
            <ImportanceMeter importance={event.importance} />
            {translate(`tc.calendar.importance.${event.importance}`)}
          </span>
        </div>
        <button
          type="button"
          aria-pressed={hasAlert}
          aria-label={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          title={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          onClick={onToggleAlert}
          className={cx(
            'relative grid size-8 shrink-0 place-items-center rounded-xl border transition-[color,background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
            hasAlert ? 'border-primary/50 bg-primary/25 text-primary shadow-[0_0_14px_-4px_var(--brand-primary)]' : 'border-line text-fg-subtle hover:border-primary/40 hover:text-primary',
          )}
        >
          {hasAlert && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-xl bg-primary/30 motion-reduce:animate-none" />}
          <Icon name="bell" size={15} className="relative" />
        </button>
      </div>

      <dl className="mx-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line">
        <FigureCell
          label={translate('tc.calendar.actual')}
          value={event.actual}
          tone={actualTone}
          emphasis
          icon={result === 'beat' ? <Icon name="trendUp" size={13} /> : result === 'miss' ? <Icon name="trendDown" size={13} /> : undefined}
        />
        <FigureCell label={translate('tc.calendar.forecast')} value={event.forecast} />
        <FigureCell
          label={translate('tc.calendar.previous')}
          value={event.previous}
          note={event.revisedFrom ? `${translate('tc.calendar.revisedFrom')} ${event.revisedFrom}` : undefined}
        />
      </dl>

      <div className="mt-3 flex items-center gap-0.5 border-t border-line px-2.5 py-1.5">
        {EVENT_ACTIONS.map((action, actionIndex) => (
          <button
            key={action.id}
            type="button"
            aria-label={`${action.label}: ${event.name}`}
            title={action.label}
            onClick={() => runEventAction(action.id, event)}
            style={{ transitionDelay: `${actionIndex * 25}ms` }}
            className="grid size-8 flex-1 place-items-center rounded-lg text-fg-subtle transition-[color,background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring group-hover:text-primary/80 motion-reduce:transition-none"
          >
            <Icon name={action.icon} size={15} />
          </button>
        ))}
      </div>
    </li>
  );
}

function EventBoard({ events, alerts, onToggleAlert }: { events: EconomicEvent[]; alerts: Set<string>; onToggleAlert: (id: string) => void }) {
  const groups = useMemo(() => groupByTime(events), [events]);
  let cardIndex = 0;

  return (
    <ol className="flex flex-col gap-6">
      {groups.map(([time, groupEvents]) => {
        const hasHigh = groupEvents.some((event) => event.importance === 'high');
        return (
          <li key={time} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums',
                  hasHigh ? 'border-danger/40 bg-danger-soft text-danger' : 'border-primary/35 bg-primary/10 text-primary',
                )}
              >
                {hasHigh ? (
                  <span aria-hidden="true" className="relative flex size-2">
                    <span className="absolute inset-0 animate-ping-soft rounded-full bg-danger motion-reduce:animate-none" />
                    <span className="relative size-2 rounded-full bg-danger" />
                  </span>
                ) : (
                  <Icon name="clock" size={14} />
                )}
                {time}
              </span>
              <span className="text-xs text-fg-subtle tabular-nums">
                {groupEvents.length} {translate('tc.calendar.events')}
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent" />
            </div>
            <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {groupEvents.map((event) => {
                const index = cardIndex++;
                return <EventCard key={event.id} event={event} index={index} hasAlert={alerts.has(event.id)} onToggleAlert={() => onToggleAlert(event.id)} />;
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export default function EconomicCalendarPage() {
  const [query, setQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState(SELECTED_DAY);
  const [importances, setImportances] = useState<Set<Importance>>(() => new Set(IMPORTANCE_LEVELS));
  const [eventTypes, setEventTypes] = useState<Set<EventType>>(() => new Set(EVENT_TYPES));
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => new Set(ALL_COUNTRY_CODES));
  const [alerts, setAlerts] = useState<Set<string>>(() => new Set());

  const visibleEvents = useMemo(() => {
    if (selectedDay !== SELECTED_DAY) return [];
    const needle = query.trim().toLowerCase();

    return economicEvents.filter((event) => {
      const countryName = (countryNames[event.country] ?? '').toLowerCase();
      const matchesQuery = event.name.toLowerCase().includes(needle) || event.country.toLowerCase().includes(needle) || countryName.includes(needle);
      const matchesCountry = selectedCountries.has(event.country);
      return matchesQuery && importances.has(event.importance) && eventTypes.has(event.type) && matchesCountry;
    });
  }, [query, selectedDay, importances, eventTypes, selectedCountries]);

  const heading = dayHeading(selectedDay);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.tcEconomicCalendar')} />

      <DayRulerHero visibleEvents={visibleEvents} alertCount={alerts.size} />
      <CommandBar query={query} onQueryChange={setQuery} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <FilterRail
          selectedDay={selectedDay}
          importances={importances}
          onToggleImportance={(value) => setImportances((current) => toggleInSet(current, value))}
          eventTypes={eventTypes}
          onToggleEventType={(value) => setEventTypes((current) => toggleInSet(current, value))}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
        />

        <section style={staggerStyle(2, 200)} className="orbit-card min-w-0 animate-rise overflow-hidden motion-reduce:animate-none" aria-label={translate('nav.tcEconomicCalendar')}>
          <div className="border-b border-line p-4 sm:p-5">
            <DayRibbon selectedDay={selectedDay} onSelect={setSelectedDay} />
          </div>

          <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-4 sm:px-5">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="flex w-14 flex-col overflow-hidden rounded-xl border border-primary/40 text-center shadow-[0_10px_24px_-14px_var(--brand-primary)]">
                <span className="bg-primary/30 py-0.5">
                  <Icon name="calendar" size={11} className="mx-auto text-primary" />
                </span>
                <span className="bg-primary/[0.08] py-1.5 text-2xl leading-none font-semibold text-fg tabular-nums">{selectedDay}</span>
              </span>
              <div>
                <p className="text-lg font-semibold text-fg">{heading.date}</p>
                <p className="text-xs text-fg-muted">{heading.weekday}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-fg/[0.03] px-2 py-1">
                <Icon name="trendUp" size={13} className="text-success" />
                {translate('tc.calendar.beat')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-fg/[0.03] px-2 py-1">
                <Icon name="trendDown" size={13} className="text-danger" />
                {translate('tc.calendar.miss')}
              </span>
            </div>
          </header>

          <div className="px-4 pb-5 sm:px-5">
            {visibleEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong py-14 text-center">
                <span className="flex size-14 animate-float items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
                  <Icon name="calendar" size={24} />
                </span>
                <p className="text-sm font-medium text-fg">{translate('tc.calendar.emptyTitle')}</p>
              </div>
            ) : (
              <EventBoard key={selectedDay} events={visibleEvents} alerts={alerts} onToggleAlert={(id) => setAlerts((current) => toggleInSet(current, id))} />
            )}
          </div>
        </section>
      </div>

      <footer className="orbit-card flex gap-4 p-5 text-[11px] leading-relaxed text-fg-subtle">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-fg/[0.03] text-fg-muted">
          <Icon name="alert" size={16} />
        </span>
        <div className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </footer>
    </div>
  );
}
