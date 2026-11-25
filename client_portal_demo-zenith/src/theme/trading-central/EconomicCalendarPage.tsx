'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { CountryFlag } from '../ui/CountryFlag';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox, Input } from '../ui/Input';
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
const RULER_LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const TIMELINE_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIMELINE_ROWS = 6;


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

const RED = 'var(--zenith-red)';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const SHARE_DOTS = 10;
const SECOND_DOTS = 12;

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/** Importance as three rising square pixels; the lit ones take the importance colour. */
function ImportanceMeter({ importance }: { importance: Importance }) {
  const style = importanceStyle[importance];
  return (
    <span className="flex items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((level) => (
        <span key={level} style={{ height: `${4 + level * 2}px` }} className={cx('w-1.5 rounded-[1.5px]', level <= style.level ? style.bar : 'bg-fg/15')} />
      ))}
    </span>
  );
}

/** 24-hour pixel timeline: one column per hour, one square per event stacked by importance; a red scanning cursor marks "now". */
function DayTimeline({ time, events }: { time: string | null; events: EconomicEvent[] }) {
  const eventsByHour = useMemo(
    () =>
      TIMELINE_HOURS.map((hour) =>
        events
          .filter((event) => Math.floor(minuteOfDay(event.time) / 60) === hour)
          .sort((a, b) => importanceStyle[b.importance].level - importanceStyle[a.importance].level),
      ),
    [events],
  );
  const nowMinute = time ? minuteOfDay(time) + Number(time.split(':')[2]) / 60 : null;
  const nowHour = nowMinute === null ? null : Math.floor(nowMinute / 60);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${TIMELINE_HOURS.length}, minmax(0, 1fr))` }}>
          {eventsByHour.map((hourEvents, hour) => {
            const hiddenCount = hourEvents.length - (TIMELINE_ROWS - 1);
            const hasOverflow = hourEvents.length > TIMELINE_ROWS;
            const isPast = nowHour !== null && hour < nowHour;
            return (
              <div
                key={hour}
                title={hourEvents.map((event) => `${event.time} · ${event.name}`).join('\n') || undefined}
                className={cx('flex flex-col-reverse gap-[3px] transition-opacity duration-700', isPast && 'opacity-40')}
              >
                {Array.from({ length: TIMELINE_ROWS }, (_, row) => {
                  const event = hourEvents[row];
                  const isOverflowCell = hasOverflow && row === TIMELINE_ROWS - 1;
                  const delay = { animationDelay: `${200 + hour * 35 + row * 45}ms` };
                  if (isOverflowCell) {
                    return (
                      <span key={row} style={delay} className="grid aspect-square w-full animate-dot-pop place-items-center rounded-[3px] bg-fg font-mono text-[7px] font-black text-app motion-reduce:animate-none sm:text-[8px]">
                        +{hiddenCount}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={row}
                      style={event ? delay : { animationDelay: `${(hour * 7 + row * 13) * 90}ms` }}
                      className={cx('aspect-square w-full rounded-[3px]', event ? cx('animate-dot-pop motion-reduce:animate-none', importanceStyle[event.importance].bar) : 'zenith-twinkle bg-fg/[0.07]')}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {nowMinute !== null && (
          <span
            style={{ left: `${(nowMinute / MINUTES_PER_DAY) * 100}%`, background: RED }}
            className="absolute -top-3 -bottom-1 w-0.5 -translate-x-1/2 rounded-full transition-[left] duration-1000 ease-linear"
          >
            <span style={{ background: RED }} className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
            <span style={{ background: RED }} className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 animate-ping-soft rounded-full motion-reduce:hidden" />
          </span>
        )}
      </div>

      <div className="relative h-4">
        {RULER_LABEL_HOURS.map((hour) => {
          const isHot = nowHour !== null && hour === nowHour - (nowHour % 3);
          return (
            <span
              key={hour}
              style={{ left: `${(hour / 24) * 100}%` }}
              className={cx(
                'absolute font-mono text-[9px] font-bold tabular-nums',
                hour === 0 ? '' : hour === 24 ? '-translate-x-full' : '-translate-x-1/2',
                isHot ? 'text-[var(--zenith-red)]' : 'text-fg-subtle',
              )}
            >
              {pad2(hour)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Open hero band: live clock on the left, shown count + 24h pixel timeline + impact capsules on the right, split by a hairline.
function CalendarHero({ visibleEvents, alertCount }: { visibleEvents: EconomicEvent[]; alertCount: number }) {
  const time = useLiveClock();
  const [hours, minutes, seconds] = (time ?? '--:--:--').split(':');
  const litSeconds = time ? Math.floor(Number(seconds) / 5) + 1 : 0;
  const counts = IMPORTANCE_LEVELS.map((level) => ({
    level,
    count: visibleEvents.filter((event) => event.importance === level).length,
  })).reverse();
  const total = Math.max(1, visibleEvents.length);

  return (
    <section className="zenith-tile grid gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] xl:items-center">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-semibold text-app">
            <LiveDot />
            {translate('tc.calendar.liveFeed')}
          </p>
          <span className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-fg ring-1 ring-line-strong">{TIMEZONE_LABEL}</span>
        </div>

        <div role="timer" aria-label={time ?? undefined} className="flex flex-col gap-4">
          <div aria-hidden="true" className="flex items-center gap-4">
            <span className="font-mono text-7xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-8xl">
              {hours}
              <span className="animate-pulse text-[var(--zenith-red)] motion-reduce:animate-none">:</span>
              {minutes}
            </span>
            <span className="relative grid size-14 place-items-center rounded-full font-mono text-lg font-bold text-white tabular-nums" style={{ background: RED }}>
              <span className="absolute -inset-1.5 animate-rim-spin rounded-full border-2 border-dashed border-fg/35 motion-reduce:animate-none" />
              {seconds}
            </span>
          </div>
          <span aria-hidden="true" className="grid grid-cols-12 gap-1">
            {Array.from({ length: SECOND_DOTS }, (_, dot) => {
              const isHead = dot === litSeconds - 1;
              return (
                <span
                  key={dot}
                  style={isHead ? { background: RED } : undefined}
                  className={cx('h-3 rounded-[3px] transition-colors duration-500', isHead ? '' : dot < litSeconds ? 'bg-fg' : 'bg-fg/12')}
                />
              );
            })}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line">
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="calendar" size={13} />
            </span>
            <dt className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">{translate('tc.calendar.events')}</dt>
            <dd className="font-mono text-lg font-black text-fg tabular-nums">
              <CountUp value={TOTAL_EVENTS} format={(current) => String(Math.round(current))} />
            </dd>
          </div>
          <div className="flex items-center gap-2.5 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line">
            <span aria-hidden="true" style={alertCount > 0 ? { background: RED } : undefined} className={cx('grid size-8 shrink-0 place-items-center rounded-full', alertCount > 0 ? 'text-white' : 'bg-fg text-app')}>
              <Icon name="bell" size={13} className={alertCount > 0 ? 'animate-pulse motion-reduce:animate-none' : undefined} />
            </span>
            <dt className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">{translate('tc.calendar.alertsSet')}</dt>
            <dd className="font-mono text-lg font-black text-fg tabular-nums">{alertCount}</dd>
          </div>
        </dl>
      </div>

      <div style={staggerStyle(1, 140)} className="flex min-w-0 animate-rise flex-col gap-6 border-t border-line pt-8 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-10 motion-reduce:animate-none">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-3">
            <p className="font-mono text-7xl leading-[0.8] font-black tracking-tighter text-fg tabular-nums">
              <CountUp value={visibleEvents.length} format={(current) => pad2(Math.round(current))} />
            </p>
            <p className={captionClass}>{translate('tc.calendar.shown')}</p>
          </div>
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <RedDot className="size-1.5" />
            {translate('tc.calendar.impactMix')}
          </p>
        </div>

        <div aria-hidden="true">
          <DayTimeline time={time} events={visibleEvents} />
        </div>

        <ul className="grid grid-cols-3 gap-2">
          {counts.map(({ level, count }, index) => {
            const litDots = Math.round((count / total) * SHARE_DOTS);
            return (
              <li key={level} style={staggerStyle(index, 120)} className="flex min-w-0 animate-feed-in flex-col gap-2.5 rounded-[22px] bg-fg/[0.03] p-3 ring-1 ring-line motion-reduce:animate-none">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-fg-muted">
                  <ImportanceMeter importance={level} />
                  <span className="truncate">{translate(`tc.calendar.importance.${level}`)}</span>
                </span>
                <span className="font-mono text-3xl leading-none font-black text-fg tabular-nums">
                  <CountUp value={count} format={(current) => pad2(Math.round(current))} />
                </span>
                <span aria-hidden="true" className="grid grid-cols-10 gap-0.5">
                  {Array.from({ length: SHARE_DOTS }, (_, dot) => (
                    <span
                      key={dot}
                      style={{ animationDelay: `${400 + index * 120 + dot * 40}ms` }}
                      className={cx('h-1.5 animate-dot-pop rounded-[1.5px] motion-reduce:animate-none', dot < litDots ? importanceStyle[level].bar : 'bg-fg/12')}
                    />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
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
    <div style={staggerStyle(2, 120)} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1 [&_input]:rounded-full">
          <Input type="search" leftIcon="search" aria-label={translate('tc.calendar.search')} placeholder={translate('tc.calendar.search')} value={query} onChange={(event) => onQueryChange(event.target.value)} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsStoryOpen(true)}
            className="group/story inline-flex h-12 flex-1 items-center gap-2.5 rounded-full bg-fg py-1 pr-5 pl-1 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white transition-transform duration-500 group-hover/story:rotate-12 motion-reduce:transition-none">
              <Icon name="bolt" size={15} className="animate-pulse motion-reduce:animate-none" />
            </span>
            {translate('tc.calendar.storyteller')}
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={calendarStoryCopy.help}
            title={calendarStoryCopy.help}
            onClick={() => setIsFaqOpen(true)}
            className="grid size-12 shrink-0 place-items-center rounded-full font-black text-fg ring-1 ring-line-strong transition-[transform,background-color] duration-300 hover:-rotate-12 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
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

/** The month as a scrollable row of square day pixels; the published range sits on a capsule track, today carries a red dot. */
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
        <p className="flex items-center gap-2.5 text-sm font-black tracking-wide text-fg uppercase">
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="calendar" size={14} />
          </span>
          {monthLabel}
        </p>
        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-fg-muted uppercase ring-1 ring-line-strong">{translate('tc.calendar.custom')}</span>
      </div>
      <div ref={ribbonRef} role="group" aria-label={monthLabel} className="relative -mx-1 flex overflow-x-auto px-1 pt-2 pb-2 [scrollbar-width:thin]">
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
                'group/day flex w-12 shrink-0 flex-col items-center gap-1.5 py-1 focus-visible:outline-2 focus-visible:outline-ring',
                inRange && 'bg-fg/[0.05]',
                day === SELECTED_DAY && 'rounded-l-[18px]',
                day === RANGE_END_DAY && 'rounded-r-[18px]',
              )}
            >
              <span className={cx('text-[9px] font-bold tracking-wider uppercase', isSelected ? 'text-fg' : 'text-fg-subtle')}>{translate(WEEKDAY_KEYS[weekday])}</span>
              <span
                className={cx(
                  'relative grid size-10 place-items-center rounded-[12px] font-mono text-sm font-bold tabular-nums transition-[background-color,color,box-shadow,translate] duration-300 group-hover/day:-translate-y-0.5 motion-reduce:transition-none',
                  isSelected ? 'bg-fg text-app' : inRange ? 'text-fg ring-1 ring-line-strong' : 'text-fg-muted group-hover:bg-fg/[0.05]',
                )}
              >
                {isSelected && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[14px] border-2 motion-reduce:hidden" />}
                {day}
              </span>
              <span aria-hidden="true" style={isToday ? { background: RED } : undefined} className={cx('size-1.5 rounded-[2px]', isToday ? 'animate-pulse motion-reduce:animate-none' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <Icon name="globe" size={14} />({TIMEZONE_LABEL}) · {translate('tc.calendar.timezoneHint')}
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
        'flex w-full items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-4 text-left text-xs font-semibold transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'bg-fg/[0.05] text-fg ring-1 ring-line-strong' : 'text-fg-muted ring-1 ring-line hover:text-fg',
      )}
    >
      {children}
      <span aria-hidden="true" className={cx('relative ml-auto h-7 w-12 shrink-0 rounded-full transition-colors duration-300', active ? 'bg-fg' : 'bg-fg/10')}>
        <span
          style={active ? { background: RED } : undefined}
          className={cx(
            'absolute top-1 size-5 rounded-[7px] transition-[left,background-color,border-radius] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
            active ? 'left-6 rounded-full' : 'left-1 bg-fg/40',
          )}
        />
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
  // Below xl the filters fold behind one bar so the events stay right under the hero; from xl up it's a sticky rail.
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = importances.size + eventTypes.size;

  return (
    <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:order-2 xl:self-start">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="calendar-filters"
        onClick={() => setIsOpen((current) => !current)}
        className="flex animate-rise items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 text-left ring-1 ring-line focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none xl:hidden"
      >
        <span aria-hidden="true" style={isOpen ? { background: RED } : undefined} className={cx('grid size-10 shrink-0 place-items-center rounded-full transition-colors', isOpen ? 'text-white' : 'bg-fg text-app')}>
          <Icon name="filter" size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-fg">{translate('tc.calendar.filters')}</span>
          <span className="block truncate font-mono text-xs text-fg-muted">
            {dayHeading(selectedDay).date} · {TIMEZONE_LABEL}
          </span>
        </span>
        <Icon name="chevronDown" size={16} className={cx('shrink-0 text-fg-subtle transition-transform duration-300 motion-reduce:transition-none', isOpen && 'rotate-180 text-fg')} />
      </button>

      <div id="calendar-filters" style={staggerStyle(3, 120)} className={cx('animate-rise flex-col gap-6 rounded-[30px] border border-dashed border-line-strong p-5 motion-reduce:animate-none xl:flex', isOpen ? 'flex' : 'hidden')}>
        <h2 className="flex items-center gap-2.5 text-sm font-black text-fg">
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="filter" size={14} />
          </span>
          {translate('tc.calendar.filters')}
          <span aria-hidden="true" className="ml-auto flex gap-1">
            {Array.from({ length: IMPORTANCE_LEVELS.length + EVENT_TYPES.length }, (_, cell) => (
              <span key={cell} style={cell < activeCount ? { background: RED } : undefined} className={cx('size-2 rounded-[2px] transition-colors duration-300', cell >= activeCount && 'bg-fg/15')} />
            ))}
          </span>
        </h2>

        <fieldset className="flex flex-col gap-2">
          <legend className={cx(captionClass, 'mb-2')}>{translate('tc.calendar.importanceLabel')}</legend>
          {[...IMPORTANCE_LEVELS].reverse().map((level) => (
            <SwitchRow key={level} active={importances.has(level)} onClick={() => onToggleImportance(level)}>
              <ImportanceMeter importance={level} />
              {translate(`tc.calendar.importance.${level}`)}
            </SwitchRow>
          ))}
        </fieldset>

        <fieldset className="border-t border-line pt-5">
          <legend className={cx(captionClass, 'mb-2')}>{translate('tc.calendar.eventTypeLabel')}</legend>
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
                    'group/type flex flex-col items-start gap-3 rounded-[22px] p-3 text-left text-xs font-bold uppercase transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0',
                    isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span
                      style={isActive ? { background: RED } : undefined}
                      className={cx('grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/type:-rotate-12', isActive ? 'text-white' : 'bg-fg text-app')}
                    >
                      <Icon name={EVENT_TYPE_ICON[type]} size={14} />
                    </span>
                    <span aria-hidden="true" className={cx('size-2.5 rounded-[3px] transition-colors', isActive ? 'bg-app' : 'border border-dashed border-line-strong')} />
                  </span>
                  {translate(`tc.calendar.eventType.${type}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="border-t border-line pt-5">
          <CountryFilter selected={selectedCountries} onChange={onCountriesChange} />
        </div>
      </div>
    </aside>
  );
}

/** Groups stack as full-width capsule rows behind a vertical sliding pill (long names never collide); members are flag chips. */
function CountryFilter({ selected, onChange }: { selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [activeGroup, setActiveGroup] = useState<CountryGroup>('g7');
  const members = COUNTRY_GROUP_MEMBERS[activeGroup];
  const pickedCount = members.filter((code) => selected.has(code)).length;
  const groupLabel = translate(`tc.calendar.countryGroup.${activeGroup}`);
  const groupIndex = COUNTRY_GROUPS.indexOf(activeGroup);

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
      <legend className={cx(captionClass, 'mb-2')}>{translate('tc.calendar.countriesLabel')}</legend>
      <div role="tablist" aria-label={translate('tc.calendar.countriesLabel')} aria-orientation="vertical" className="relative flex flex-col rounded-[24px] bg-fg/[0.03] p-1 ring-1 ring-line">
        <span
          aria-hidden="true"
          style={{ transform: `translateY(${groupIndex * 100}%)` }}
          className="absolute inset-x-1 top-1 h-10 rounded-full bg-fg transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
        />
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
                'relative flex h-10 min-w-0 items-center gap-2.5 rounded-full pr-1.5 pl-4 text-left text-xs font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{translate(`tc.calendar.countryGroup.${group}`)}</span>
              <span
                style={isActive && groupPicked > 0 ? { background: RED } : undefined}
                className={cx(
                  'grid h-7 min-w-11 place-items-center rounded-full px-2 font-mono text-[10px] font-bold tabular-nums transition-colors duration-300',
                  isActive ? (groupPicked > 0 ? 'text-white' : 'bg-app/15 text-app') : 'bg-fg/[0.06] text-fg-subtle',
                )}
              >
                {groupPicked}/{groupMembers.length}
              </span>
            </button>
          );
        })}
      </div>

      <div id="country-panel" role="tabpanel" aria-labelledby={`country-tab-${activeGroup}`} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Checkbox checked={pickedCount === members.length} onChange={() => toggleGroup(activeGroup)} label={<span className="font-semibold text-fg">{groupLabel}</span>} />
          <span className="font-mono text-[11px] font-bold text-fg-muted tabular-nums">
            <span className="text-[var(--zenith-red)]">{pickedCount}</span>/{members.length}
          </span>
        </div>
        {/* One pixel per member of the group; picked members light red. */}
        <span aria-hidden="true" className="flex gap-0.5">
          {members.map((code, index) => (
            <span
              key={code}
              style={{ transitionDelay: `${index * 15}ms` }}
              className={cx('h-1.5 min-w-0 flex-1 rounded-[1.5px] transition-colors duration-300', selected.has(code) ? 'bg-[var(--zenith-red)]' : 'bg-fg/12')}
            />
          ))}
        </span>
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
                    'inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs font-medium ring-1 transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring active:scale-95',
                    isOn ? 'bg-fg/[0.08] text-fg ring-line-strong' : 'text-fg-subtle ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  <span className={cx('grid size-5 place-items-center overflow-hidden rounded-full transition-[filter,opacity] duration-200', !isOn && 'opacity-50 grayscale')}>
                    <CountryFlag code={code} />
                  </span>
                  {countryNames[code] ?? code}
                  <span
                    aria-hidden="true"
                    className={cx('size-1.5 rounded-[2px] transition-colors duration-200', isOn ? 'animate-dot-pop bg-[var(--zenith-red)] motion-reduce:animate-none' : 'border border-dashed border-line-strong')}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </fieldset>
  );
}

/** Capsule row for the secondary figures: label left, value right (and the revision note under it). */
function ReceiptFigure({ label, value, note }: { label: string; value?: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-2 rounded-full bg-fg/[0.04] px-3 py-1.5 text-xs">
        <dt className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{label}</dt>
        <dd className={cx('ml-auto font-mono font-bold whitespace-nowrap tabular-nums', value ? 'text-fg' : 'text-fg-subtle')}>{value ?? '—'}</dd>
      </div>
      {note && (
        <dd className="truncate px-3 text-right text-[10px] text-fg-subtle" title={note}>
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
      className={cx(
        'group relative flex min-w-0 animate-feed-in flex-col gap-4 overflow-hidden rounded-[28px] bg-fg/[0.03] p-4 ring-1 transition-[box-shadow,translate,background-color] duration-300 hover:-translate-y-1 hover:bg-fg/[0.05] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        hasAlert ? 'ring-[var(--zenith-red)]/50' : 'ring-line hover:ring-line-strong',
      )}
    >
      <span aria-hidden="true" className={cx('absolute inset-x-6 top-0 h-[3px] rounded-b-full', style.bar)} />
      <div className="flex items-start gap-3">
        <span title={countryNames[event.country] ?? event.country} className="relative grid size-12 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-[16px] border-2 border-dashed border-line-strong transition-colors group-hover:animate-rim-spin group-hover:border-fg/40 motion-reduce:group-hover:animate-none" />
          <span className="grid size-9 place-items-center overflow-hidden rounded-[12px] bg-fg/10">
            <CountryFlag code={event.country} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-black text-fg">{event.country}</span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1', style.chip)}>
              <ImportanceMeter importance={event.importance} />
              {translate(`tc.calendar.importance.${event.importance}`)}
            </span>
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-fg" title={event.name}>
            {event.name}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={hasAlert}
          aria-label={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          title={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          onClick={onToggleAlert}
          style={hasAlert ? { background: RED } : undefined}
          className={cx(
            'relative grid size-10 shrink-0 place-items-center rounded-full transition-[color,background-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-90 motion-reduce:transition-none',
            hasAlert ? 'text-white' : 'text-fg-subtle ring-1 ring-line hover:bg-fg hover:text-app hover:ring-fg',
          )}
        >
          {hasAlert && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-0.5 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
          <Icon name="bell" size={15} className={cx('relative', hasAlert && 'animate-pulse motion-reduce:animate-none')} />
        </button>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <div className="flex flex-col">
          <dt className="text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{translate('tc.calendar.actual')}</dt>
          <dd className={cx('mt-0.5 flex items-center gap-1 font-mono text-3xl font-black tracking-tight whitespace-nowrap tabular-nums', event.actual ? (actualTone ?? 'text-fg') : 'text-fg-subtle')}>
            {result === 'beat' ? <Icon name="trendUp" size={16} /> : result === 'miss' ? <Icon name="trendDown" size={16} /> : null}
            {event.actual ?? '—'}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <ReceiptFigure label={translate('tc.calendar.forecast')} value={event.forecast} />
          <ReceiptFigure label={translate('tc.calendar.previous')} value={event.previous} note={event.revisedFrom ? `${translate('tc.calendar.revisedFrom')} ${event.revisedFrom}` : undefined} />
        </div>
      </dl>

      <div className="flex items-center justify-between gap-1 rounded-full bg-fg/[0.04] p-1 ring-1 ring-line">
        {EVENT_ACTIONS.map((action, actionIndex) => (
          <button
            key={action.id}
            type="button"
            aria-label={`${action.label}: ${event.name}`}
            title={action.label}
            onClick={() => runEventAction(action.id, event)}
            style={{ transitionDelay: `${actionIndex * 25}ms` }}
            className={cx(
              'group/action grid h-9 flex-1 place-items-center rounded-full text-fg-muted transition-[color,background-color,translate] duration-200 hover:-translate-y-0.5 hover:text-white focus-visible:outline-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none',
              'hover:bg-[var(--zenith-red)]',
            )}
          >
            <Icon name={action.icon} size={15} className="transition-transform duration-300 group-hover/action:scale-110" />
          </button>
        ))}
      </div>
    </li>
  );
}

/** Each time slot is an open capsule header (time pill, pixel run, count) with its cards beneath; high-impact slots go red. */
function EventBoard({ events, alerts, onToggleAlert }: { events: EconomicEvent[]; alerts: Set<string>; onToggleAlert: (id: string) => void }) {
  const groups = useMemo(() => groupByTime(events), [events]);
  let cardIndex = 0;

  return (
    <ol className="flex flex-col gap-8">
      {groups.map(([time, groupEvents], groupIndex) => {
        const hasHigh = groupEvents.some((event) => event.importance === 'high');
        return (
          <li key={time} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                style={hasHigh ? { background: RED } : undefined}
                className={cx('relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full pr-4 pl-1 font-mono text-sm font-black tabular-nums', hasHigh ? 'text-white' : 'bg-fg text-app')}
              >
                {hasHigh && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-full', hasHigh ? 'bg-white/20' : 'bg-app/15')}>
                  <Icon name={hasHigh ? 'bolt' : 'clock'} size={13} className={hasHigh ? 'animate-pulse motion-reduce:animate-none' : undefined} />
                </span>
                {time}
              </span>
              <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                {Array.from({ length: 16 }, (_, cell) => (
                  <span
                    key={cell}
                    style={{ animationDelay: `${groupIndex * 200 + cell * 120}ms` }}
                    className={cx('zenith-twinkle h-1.5 min-w-1.5 flex-1 rounded-[2px]', hasHigh && cell < 3 ? 'bg-[var(--zenith-red)]/60' : 'bg-fg/15')}
                  />
                ))}
              </span>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-fg-muted tabular-nums ring-1 ring-line">
                {groupEvents.length} {translate('tc.calendar.events')}
              </span>
            </div>
            <ul className="grid gap-3 lg:grid-cols-2">
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

// Skeleton: open title → hero band (clock | dial) → command capsule → events (ribbon + date + board) beside a dashed filter rail → disclaimer.
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
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-end gap-4 border-b border-line pb-6">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="calendar" size={16} />
          </span>
          <RedDot className="absolute top-0.5 right-0.5" />
        </span>
        <h1 className="min-w-0 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.tcEconomicCalendar')}</h1>
      </header>

      <CalendarHero visibleEvents={visibleEvents} alertCount={alerts.size} />

      <div className="border-t border-line pt-8">
        <CommandBar query={query} onQueryChange={setQuery} />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <FilterRail
          selectedDay={selectedDay}
          importances={importances}
          onToggleImportance={(value) => setImportances((current) => toggleInSet(current, value))}
          eventTypes={eventTypes}
          onToggleEventType={(value) => setEventTypes((current) => toggleInSet(current, value))}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
        />

        <section style={staggerStyle(3, 200)} className="flex min-w-0 animate-rise flex-col gap-6 xl:order-1 motion-reduce:animate-none" aria-label={translate('nav.tcEconomicCalendar')}>
          <div className="rounded-[30px] bg-fg/[0.03] p-4 ring-1 ring-line sm:p-5">
            <DayRibbon selectedDay={selectedDay} onSelect={setSelectedDay} />
          </div>

          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div className="flex items-end gap-4">
              <span className="font-mono text-6xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums sm:text-7xl">{pad2(selectedDay)}</span>
              <div className="pb-1">
                <p className="text-2xl font-black tracking-tight text-fg">{heading.date}</p>
                <p className="flex items-center gap-2 text-xs text-fg-muted">
                  <RedDot className="size-1.5" />
                  {heading.weekday}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 ring-1 ring-line">
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-success/15 text-success">
                  <Icon name="trendUp" size={12} />
                </span>
                {translate('tc.calendar.beat')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 ring-1 ring-line">
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-danger/15 text-danger">
                  <Icon name="trendDown" size={12} />
                </span>
                {translate('tc.calendar.miss')}
              </span>
            </div>
          </header>

          {visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[30px] border border-dashed border-line-strong py-16 text-center">
              <span aria-hidden="true" className="relative grid size-20 place-items-center">
                <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-line-strong motion-reduce:animate-none" />
                <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
                <span className={cx(beadClass, 'size-12 animate-float motion-reduce:animate-none')}>
                  <Icon name="calendar" size={18} />
                </span>
              </span>
              <p className="text-sm font-semibold text-fg">{translate('tc.calendar.emptyTitle')}</p>
              <span aria-hidden="true" className="flex gap-1">
                {Array.from({ length: 7 }, (_, cell) => (
                  <span key={cell} style={{ animationDelay: `${cell * 180}ms` }} className="zenith-twinkle size-2 rounded-[2px] bg-fg/20" />
                ))}
              </span>
            </div>
          ) : (
            <EventBoard key={selectedDay} events={visibleEvents} alerts={alerts} onToggleAlert={(id) => setAlerts((current) => toggleInSet(current, id))} />
          )}
        </section>
      </div>

      <footer className="flex gap-4 rounded-[30px] border border-dashed border-line-strong p-5 text-[11px] leading-relaxed text-fg-subtle">
        <span aria-hidden="true" style={{ background: RED }} className="grid size-9 shrink-0 place-items-center rounded-full text-white">
          <Icon name="alert" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-[var(--zenith-red)]">
                {pad2(index + 1)}
              </span>
              <p>{paragraph}</p>
            </li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
