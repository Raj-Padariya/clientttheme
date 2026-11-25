'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { CountryFlag } from '../ui/CountryFlag';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox, Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import '../promotion/market.css';
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

// Accent for live / alert marks: Aurora's clay. Name kept because every block of this page shares it.
const RED = 'var(--aurora-cta-from)';
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const SECOND_SEGMENTS = 12;

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/** Importance as three rising bars; the lit ones take the importance colour. */
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

/** 24-hour volume histogram: one stacked candle per hour (segments coloured by importance), past hours dimmed, a clay cursor with a time tag marks "now". */
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
  const maxCount = Math.max(1, ...eventsByHour.map((hourEvents) => hourEvents.length));
  const nowMinute = time ? minuteOfDay(time) + Number(time.split(':')[2]) / 60 : null;
  const nowHour = nowMinute === null ? null : Math.floor(nowMinute / 60);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-36 rounded-lg bg-fg/[0.03] px-1.5 pt-6 ring-1 ring-line">
        {[33, 66].map((top) => (
          <span key={top} style={{ top: `${top}%` }} className="absolute inset-x-1.5 border-t border-dashed border-fg/[0.07]" />
        ))}
        <div className="relative grid h-full items-end gap-[3px]" style={{ gridTemplateColumns: `repeat(${TIMELINE_HOURS.length}, minmax(0, 1fr))` }}>
          {eventsByHour.map((hourEvents, hour) => {
            const isPast = nowHour !== null && hour < nowHour;
            const hasHigh = hourEvents.some((event) => event.importance === 'high');
            return (
              <div
                key={hour}
                title={hourEvents.map((event) => `${event.time} · ${event.name}`).join('\n') || undefined}
                className={cx('relative flex h-full flex-col justify-end transition-opacity duration-700', isPast && 'opacity-40')}
              >
                {hourEvents.length === 0 ? (
                  <span style={{ '--vol-delay': `${(hour % 6) * 0.15}s` } as CSSProperties} className="mkt-vol h-1.5 w-full rounded-t-[1px] bg-fg/10" />
                ) : (
                  <span
                    style={{ height: `${Math.max(12, (hourEvents.length / maxCount) * 100)}%`, '--candle-delay': `${200 + hour * 35}ms` } as CSSProperties}
                    className="mkt-candle flex w-full flex-col-reverse gap-px overflow-hidden rounded-t-[2px]"
                  >
                    {hourEvents.map((event) => (
                      <span key={event.id} className={cx('min-h-px flex-1', importanceStyle[event.importance].bar)} />
                    ))}
                  </span>
                )}
                {hasHigh && <span aria-hidden="true" style={{ background: RED }} className="mkt-blink absolute -top-2 left-1/2 size-1 -translate-x-1/2 rounded-full" />}
              </div>
            );
          })}
        </div>

        {nowMinute !== null && (
          <span
            style={{ left: `calc(0.375rem + (100% - 0.75rem) * ${nowMinute / MINUTES_PER_DAY})`, background: RED }}
            className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 transition-[left] duration-1000 ease-linear"
          >
            <span style={{ background: RED }} className="absolute top-1 left-1/2 -translate-x-1/2 rounded px-1 py-px font-mono text-[9px] font-black whitespace-nowrap text-[#062520] tabular-nums">
              {time?.slice(0, 5)}
            </span>
            <span style={{ background: RED }} className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 animate-ping-soft rounded-full motion-reduce:hidden" />
          </span>
        )}
      </div>

      <div className="relative mx-1.5 h-4">
        {RULER_LABEL_HOURS.map((hour) => {
          const isHot = nowHour !== null && hour === nowHour - (nowHour % 3);
          return (
            <span
              key={hour}
              style={{ left: `${(hour / 24) * 100}%` }}
              className={cx(
                'absolute font-mono text-[9px] font-bold tabular-nums',
                hour === 0 ? '' : hour === 24 ? '-translate-x-full' : '-translate-x-1/2',
                isHot ? 'text-(--aurora-cta-from)' : 'text-fg-subtle',
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

// Session tape: live clock tile | shown count + hourly volume histogram | impact book (one depth level per importance).
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
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'grid animate-rise motion-reduce:animate-none xl:grid-cols-[17rem_minmax(0,1fr)_16rem]')}>
      <div className="flex min-w-0 flex-col gap-5 border-b border-dashed border-line p-5 xl:border-r xl:border-b-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-2 rounded-md bg-(--hero-buy)/12 py-1 pr-2.5 pl-1.5 text-xs font-semibold text-(--hero-buy) ring-1 ring-(--hero-buy)/30">
            <LiveDot />
            {translate('tc.calendar.liveFeed')}
          </p>
          <span className="rounded-md px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-fg ring-1 ring-line-strong">{TIMEZONE_LABEL}</span>
        </div>

        <div role="timer" aria-label={time ?? undefined} className="flex flex-col gap-3">
          <div aria-hidden="true" className="flex items-baseline gap-2">
            <span className="font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums">
              {hours}
              <span className="mkt-blink text-(--aurora-cta-from)">:</span>
              {minutes}
            </span>
            <span className="rounded-md bg-(--hero-buy) px-1.5 py-0.5 font-mono text-base font-black text-[#062520] tabular-nums">{seconds}</span>
          </div>
          <span aria-hidden="true" className="flex h-2 gap-0.5">
            {Array.from({ length: SECOND_SEGMENTS }, (_, segment) => {
              const isHead = segment === litSeconds - 1;
              return (
                <span
                  key={segment}
                  style={isHead ? { background: RED } : undefined}
                  className={cx('flex-1 rounded-[1px] transition-colors duration-500', isHead ? '' : segment < litSeconds ? 'bg-(--hero-buy)' : 'bg-fg/12')}
                />
              );
            })}
          </span>
        </div>

        <dl className="mt-auto grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-line">
            <dt className={cx(captionClass, 'flex items-center gap-1.5')}>
              <Icon name="calendar" size={12} />
              <span className="truncate">{translate('tc.calendar.events')}</span>
            </dt>
            <dd className="font-mono text-2xl font-black text-fg tabular-nums">
              <CountUp value={TOTAL_EVENTS} format={(current) => String(Math.round(current))} />
            </dd>
          </div>
          <div className={cx('flex flex-col gap-1 rounded-lg p-3 ring-1', alertCount > 0 ? 'bg-(--aurora-cta-from)/10 ring-(--aurora-cta-from)/40' : 'bg-fg/[0.03] ring-line')}>
            <dt className={cx(captionClass, 'flex items-center gap-1.5')}>
              <Icon name="bell" size={12} className={alertCount > 0 ? 'animate-pulse text-(--aurora-cta-from) motion-reduce:animate-none' : undefined} />
              <span className="truncate">{translate('tc.calendar.alertsSet')}</span>
            </dt>
            <dd className="font-mono text-2xl font-black text-fg tabular-nums">{alertCount}</dd>
          </div>
        </dl>
      </div>

      <div className="flex min-w-0 flex-col gap-4 border-b border-dashed border-line p-5 xl:border-b-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-3">
            <p className="font-mono text-6xl leading-[0.8] font-black tracking-tighter text-fg tabular-nums">
              <CountUp value={visibleEvents.length} format={(current) => pad2(Math.round(current))} />
            </p>
            <p className={captionClass}>{translate('tc.calendar.shown')}</p>
          </div>
          <span aria-hidden="true" className="flex items-center gap-3 text-[10px] font-semibold text-fg-subtle">
            {[...IMPORTANCE_LEVELS].reverse().map((level) => (
              <span key={level} className="flex items-center gap-1">
                <span className={cx('size-2 rounded-[2px]', importanceStyle[level].bar)} />
                {translate(`tc.calendar.importance.${level}`)}
              </span>
            ))}
          </span>
        </div>
        <div aria-hidden="true">
          <DayTimeline time={time} events={visibleEvents} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 p-5 xl:border-l xl:border-dashed xl:border-line">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <RedDot className="size-1.5" />
          {translate('tc.calendar.impactMix')}
        </p>
        <ul className="flex flex-1 flex-col justify-center gap-2">
          {counts.map(({ level, count }, index) => {
            const share = (count / total) * 100;
            return (
              <li key={level} style={staggerStyle(index, 120)} className="relative flex min-w-0 animate-feed-in flex-col gap-2 overflow-hidden rounded-lg bg-fg/[0.03] p-3 ring-1 ring-line motion-reduce:animate-none">
                {/* Depth fill behind the level, like an order-book row sized by its share. */}
                <span
                  aria-hidden="true"
                  style={{ width: `${share}%`, transitionDelay: `${300 + index * 120}ms` }}
                  className={cx('absolute inset-y-0 right-0 opacity-15 transition-[width] duration-700 motion-reduce:transition-none', importanceStyle[level].bar)}
                />
                <span className="relative flex min-w-0 items-center gap-1.5 text-xs font-bold text-fg-muted">
                  <ImportanceMeter importance={level} />
                  <span className="truncate">{translate(`tc.calendar.importance.${level}`)}</span>
                  <span className="ml-auto font-mono text-2xl leading-none font-black text-fg tabular-nums">
                    <CountUp value={count} format={(current) => pad2(Math.round(current))} />
                  </span>
                </span>
                <span aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-[2px] bg-fg/10">
                  <span
                    style={{ width: `${share}%`, transitionDelay: `${300 + index * 120}ms` }}
                    className={cx('absolute inset-y-0 left-0 overflow-hidden rounded-[2px] transition-[width] duration-700 motion-reduce:transition-none', importanceStyle[level].bar)}
                  >
                    <span className="mkt-sweep absolute inset-y-0 w-5 -skew-x-12 bg-white/40" />
                  </span>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:flex-1 [&_input]:rounded-lg">
        <Input type="search" leftIcon="search" aria-label={translate('tc.calendar.search')} placeholder={translate('tc.calendar.search')} value={query} onChange={(event) => onQueryChange(event.target.value)} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setIsStoryOpen(true)}
          className="group/story relative inline-flex h-12 flex-1 items-center gap-2.5 overflow-hidden rounded-lg bg-(--hero-buy) py-1 pr-5 pl-1 text-sm font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
          <span aria-hidden="true" style={{ background: RED }} className="relative grid size-10 place-items-center rounded-md transition-transform duration-500 group-hover/story:rotate-12 motion-reduce:transition-none">
            <Icon name="bolt" size={15} className="animate-pulse motion-reduce:animate-none" />
          </span>
          <span className="relative">{translate('tc.calendar.storyteller')}</span>
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={calendarStoryCopy.help}
          title={calendarStoryCopy.help}
          onClick={() => setIsFaqOpen(true)}
          className="grid size-12 shrink-0 place-items-center rounded-lg font-mono font-black text-fg ring-1 ring-line-strong transition-[transform,background-color,color] duration-300 hover:-rotate-6 hover:bg-(--hero-buy)/12 hover:text-(--hero-buy) focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          ?
        </button>
      </div>
      {isStoryOpen && <CalendarStorytellerPanel onClose={closeStory} />}
      {isFaqOpen && <CalendarFaqModal onClose={closeFaq} />}
    </div>
  );
}

/** The month as a date tape: each day a key with a volume tick; the published range carries live sage ticks, today a blinking clay mark. */
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
        <span className="rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-fg-muted uppercase ring-1 ring-line-strong">{translate('tc.calendar.custom')}</span>
      </div>
      <div ref={ribbonRef} role="group" aria-label={monthLabel} className="relative -mx-1 flex gap-1 overflow-x-auto px-1 pt-2 pb-2 [scrollbar-width:thin]">
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
                'group/day relative flex w-12 shrink-0 flex-col items-center gap-1.5 rounded-lg py-2 ring-1 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                isSelected ? 'bg-(--hero-buy) text-[#062520] ring-(--hero-buy)' : inRange ? 'bg-(--hero-buy)/[0.06] ring-(--hero-buy)/25' : 'ring-transparent hover:bg-fg/[0.04] hover:ring-line',
              )}
            >
              {isSelected && <span aria-hidden="true" className="absolute -inset-1 animate-ring-ripple rounded-[10px] border-2 border-(--hero-buy) motion-reduce:hidden" />}
              <span className={cx('text-[9px] font-bold tracking-wider uppercase', isSelected ? 'text-[#062520]/70' : 'text-fg-subtle')}>{translate(WEEKDAY_KEYS[weekday])}</span>
              <span className={cx('font-mono text-base font-black tabular-nums', isSelected ? 'text-[#062520]' : inRange ? 'text-fg' : 'text-fg-muted')}>{pad2(day)}</span>
              <span aria-hidden="true" className="flex h-3 items-end">
                {isToday ? (
                  <span style={{ background: RED }} className="mkt-blink h-full w-1.5 rounded-[1px]" />
                ) : (
                  <span
                    style={inRange ? ({ '--vol-delay': `${(day % 5) * 0.15}s` } as CSSProperties) : undefined}
                    className={cx('w-1.5 rounded-[1px]', inRange ? cx('mkt-vol h-full', isSelected ? 'bg-[#062520]/50' : 'bg-(--hero-buy)') : 'h-1 bg-fg/15')}
                  />
                )}
              </span>
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

/** Toggle row styled as an order-ticket key: label left, a square switch right whose knob prints sage when on. */
function SwitchRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-md py-1.5 pr-1.5 pl-3 text-left text-xs font-semibold ring-1 transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'bg-(--hero-buy)/10 text-fg ring-(--hero-buy)/40' : 'text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      {children}
      <span aria-hidden="true" className={cx('relative ml-auto h-7 w-12 shrink-0 rounded-md transition-colors duration-300', active ? 'bg-(--hero-buy)/25' : 'bg-fg/10')}>
        <span
          className={cx(
            'absolute top-1 size-5 rounded-[4px] transition-[left,background-color] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
            active ? 'left-6 bg-(--hero-buy)' : 'left-1 bg-fg/40',
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
  // Below xl the filters fold behind one bar so the events stay right under the hero; from xl up it's a sticky ticket on the left.
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = importances.size + eventTypes.size;
  const totalKeys = IMPORTANCE_LEVELS.length + EVENT_TYPES.length;

  return (
    <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="calendar-filters"
        onClick={() => setIsOpen((current) => !current)}
        className={cx(panelClass, 'flex animate-rise items-center gap-3 py-2 pr-4 pl-2 text-left focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none xl:hidden')}
      >
        <span aria-hidden="true" className={cx('grid size-10 shrink-0 place-items-center rounded-lg transition-colors', isOpen ? 'bg-(--hero-buy) text-[#062520]' : beadClass)}>
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

      <div id="calendar-filters" style={staggerStyle(3, 120)} className={cx(panelClass, 'animate-rise flex-col motion-reduce:animate-none xl:flex', isOpen ? 'flex' : 'hidden')}>
        <div className="flex flex-col gap-3 border-b border-dashed border-line p-4">
          <h2 className="flex items-center gap-2.5 text-sm font-black text-fg">
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="filter" size={14} />
            </span>
            {translate('tc.calendar.filters')}
            <span className="ml-auto font-mono text-[11px] font-bold text-fg-muted tabular-nums">
              <span className="text-(--hero-buy)">{activeCount}</span>/{totalKeys}
            </span>
          </h2>
          <span aria-hidden="true" className="flex h-1.5 gap-0.5">
            {Array.from({ length: totalKeys }, (_, cell) => (
              <span key={cell} className={cx('flex-1 rounded-[1px] transition-colors duration-300', cell < activeCount ? 'bg-(--hero-buy)' : 'bg-fg/12')} />
            ))}
          </span>
        </div>

        <div className="flex flex-col gap-5 p-4">
          <fieldset className="flex flex-col gap-2">
            <legend className={cx(captionClass, 'mb-2')}>{translate('tc.calendar.importanceLabel')}</legend>
            {[...IMPORTANCE_LEVELS].reverse().map((level) => (
              <SwitchRow key={level} active={importances.has(level)} onClick={() => onToggleImportance(level)}>
                <ImportanceMeter importance={level} />
                {translate(`tc.calendar.importance.${level}`)}
              </SwitchRow>
            ))}
          </fieldset>

          <fieldset className="border-t border-dashed border-line pt-5">
            <legend className={cx(captionClass, 'mb-2')}>{translate('tc.calendar.eventTypeLabel')}</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-fg/[0.03] p-1 ring-1 ring-line">
              {EVENT_TYPES.map((type) => {
                const isActive = eventTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleEventType(type)}
                    className={cx(
                      'group/type relative flex items-center gap-2 overflow-hidden rounded-md p-2 text-left text-[11px] font-bold uppercase transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                      isActive ? 'bg-(--hero-buy) text-[#062520]' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg',
                    )}
                  >
                    {isActive && <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/30" />}
                    <span className={cx('relative grid size-7 shrink-0 place-items-center rounded transition-transform duration-300 group-hover/type:-rotate-12 motion-reduce:transition-none', isActive ? 'bg-[#062520]/15' : 'bg-fg/[0.06]')}>
                      <Icon name={EVENT_TYPE_ICON[type]} size={13} />
                    </span>
                    <span className="relative min-w-0 truncate">{translate(`tc.calendar.eventType.${type}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="border-t border-dashed border-line pt-5">
            <CountryFilter selected={selectedCountries} onChange={onCountriesChange} />
          </div>
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
      <div role="tablist" aria-label={translate('tc.calendar.countriesLabel')} aria-orientation="vertical" className="relative flex flex-col rounded-lg bg-fg/[0.03] p-1 ring-1 ring-line">
        <span
          aria-hidden="true"
          style={{ transform: `translateY(${groupIndex * 100}%)` }}
          className="absolute inset-x-1 top-1 h-10 overflow-hidden rounded-md bg-(--hero-buy) transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
        >
          <span className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/30" />
        </span>
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
                'relative flex h-10 min-w-0 items-center gap-2.5 rounded-md pr-1.5 pl-4 text-left text-xs font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-[#062520]' : 'text-fg-muted hover:text-fg',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{translate(`tc.calendar.countryGroup.${group}`)}</span>
              <span
                style={isActive && groupPicked > 0 ? { background: RED } : undefined}
                className={cx(
                  'grid h-7 min-w-11 place-items-center rounded px-2 font-mono text-[10px] font-bold tabular-nums transition-colors duration-300',
                  isActive ? 'text-[#062520]' : 'bg-fg/[0.06] text-fg-subtle',
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
            <span className="text-(--hero-buy)">{pickedCount}</span>/{members.length}
          </span>
        </div>
        {/* Depth strip: one bar per member of the group; picked members print sage. */}
        <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
          {members.map((code, index) => (
            <span
              key={code}
              style={{ transitionDelay: `${index * 15}ms` }}
              className={cx('min-w-0 flex-1 rounded-t-[1.5px] transition-[height,background-color] duration-300', selected.has(code) ? 'h-full bg-(--hero-buy)' : 'h-1/3 bg-fg/12')}
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
                    'inline-flex items-center gap-1.5 rounded-md py-1 pr-2.5 pl-1 text-xs font-medium ring-1 transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring active:scale-95',
                    isOn ? 'bg-(--hero-buy)/10 text-fg ring-(--hero-buy)/40' : 'text-fg-subtle ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  <span className={cx('grid size-5 place-items-center overflow-hidden rounded transition-[filter,opacity] duration-200', !isOn && 'opacity-50 grayscale')}>
                    <CountryFlag code={code} />
                  </span>
                  {countryNames[code] ?? code}
                  <span
                    aria-hidden="true"
                    className={cx('size-1.5 rounded-[2px] transition-colors duration-200', isOn ? 'animate-dot-pop bg-(--hero-buy) motion-reduce:animate-none' : 'border border-dashed border-line-strong')}
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

/** Actual / forecast / previous printed as three candles on one baseline so the surprise reads at a glance. */
function FigureCandles({ event }: { event: EconomicEvent }) {
  const result = surprise(event);
  const figures = [
    { key: 'actual', label: translate('tc.calendar.actual'), value: event.actual, tone: result === 'beat' ? 'bg-(--hero-buy)' : result === 'miss' ? 'bg-(--aurora-cta-from)' : 'bg-fg/50', text: result === 'beat' ? 'text-success' : result === 'miss' ? 'text-danger' : 'text-fg' },
    { key: 'forecast', label: translate('tc.calendar.forecast'), value: event.forecast, tone: 'bg-fg/25', text: 'text-fg' },
    { key: 'previous', label: translate('tc.calendar.previous'), value: event.previous, tone: 'bg-fg/12', text: 'text-fg-muted' },
  ];
  const maxAbs = Math.max(0.0001, ...figures.map((figure) => Math.abs(parseFigure(figure.value) ?? 0)));

  return (
    <dl className="grid grid-cols-3 gap-2">
      {figures.map((figure, figureIndex) => {
        const numeric = parseFigure(figure.value);
        const isActual = figure.key === 'actual';
        return (
          <div key={figure.key} className="flex min-w-0 flex-col gap-1.5">
            <span aria-hidden="true" className="flex h-10 items-end border-b border-dashed border-line-strong">
              {numeric === null ? (
                <span className="h-1/4 w-full rounded-t-[2px] border border-b-0 border-dashed border-line-strong" />
              ) : (
                <span
                  style={{ height: `${20 + (Math.abs(numeric) / maxAbs) * 80}%`, '--candle-delay': `${200 + figureIndex * 120}ms` } as CSSProperties}
                  className={cx('mkt-candle w-full rounded-t-[2px]', figure.tone, isActual && result === 'miss' && 'mkt-blink')}
                />
              )}
            </span>
            <dt className="truncate text-[9.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{figure.label}</dt>
            <dd className={cx('flex items-center gap-1 truncate font-mono font-black tabular-nums', isActual ? 'text-lg' : 'text-sm', figure.value ? figure.text : 'text-fg-subtle')}>
              {isActual && result === 'beat' && <Icon name="trendUp" size={13} />}
              {isActual && result === 'miss' && <Icon name="trendDown" size={13} />}
              {figure.value ?? '—'}
            </dd>
            {figure.key === 'previous' && event.revisedFrom && (
              <dd className="truncate text-[10px] text-fg-subtle" title={`${translate('tc.calendar.revisedFrom')} ${event.revisedFrom}`}>
                {translate('tc.calendar.revisedFrom')} {event.revisedFrom}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

/** One release as a blotter row: importance rail, flag + name, the figure candles, then the alert and the action keys. */
function EventCard({ event, index, hasAlert, onToggleAlert }: { event: EconomicEvent; index: number; hasAlert: boolean; onToggleAlert: () => void }) {
  const style = importanceStyle[event.importance];

  return (
    <li
      style={{ animationDelay: `${Math.min(index * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS)}ms` }}
      className={cx(
        'group relative grid min-w-0 animate-feed-in gap-4 border-b border-dashed border-line py-4 pr-4 pl-6 transition-colors duration-300 last:border-b-0 hover:bg-fg/[0.03] motion-reduce:animate-none motion-reduce:transition-none lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center',
        hasAlert && 'bg-(--aurora-cta-from)/[0.06]',
      )}
    >
      <span aria-hidden="true" className={cx('absolute inset-y-3 left-0 w-1 rounded-r-full transition-[inset] duration-300 group-hover:inset-y-1.5', style.bar)} />

      <div className="flex min-w-0 items-start gap-3">
        <span title={countryNames[event.country] ?? event.country} className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-fg/10 ring-1 ring-line transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
          <CountryFlag code={event.country} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[11px] font-black text-fg">{event.country}</span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1', style.chip)}>
              <ImportanceMeter importance={event.importance} />
              {translate(`tc.calendar.importance.${event.importance}`)}
            </span>
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-fg" title={event.name}>
            {event.name}
          </p>
        </div>
      </div>

      <FigureCandles event={event} />

      <div className="flex items-center gap-2 lg:flex-col lg:items-end">
        <button
          type="button"
          aria-pressed={hasAlert}
          aria-label={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          title={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          onClick={onToggleAlert}
          style={hasAlert ? { background: RED } : undefined}
          className={cx(
            'relative grid size-10 shrink-0 place-items-center rounded-lg transition-[color,background-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-90 motion-reduce:transition-none',
            hasAlert ? 'text-[#062520]' : 'text-fg-subtle ring-1 ring-line hover:bg-(--hero-buy)/12 hover:text-(--hero-buy) hover:ring-(--hero-buy)/40',
          )}
        >
          {hasAlert && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-0.5 animate-ring-ripple rounded-lg border-2 motion-reduce:hidden" />}
          <Icon name="bell" size={15} className={cx('relative', hasAlert && 'animate-pulse motion-reduce:animate-none')} />
        </button>
        <div className="flex flex-1 items-center gap-0.5 rounded-lg bg-fg/[0.04] p-0.5 ring-1 ring-line lg:flex-none">
          {EVENT_ACTIONS.map((action, actionIndex) => (
            <button
              key={action.id}
              type="button"
              aria-label={`${action.label}: ${event.name}`}
              title={action.label}
              onClick={() => runEventAction(action.id, event)}
              style={{ transitionDelay: `${actionIndex * 25}ms` }}
              className="group/action grid h-8 flex-1 place-items-center rounded-md px-2 text-fg-muted transition-[color,background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-(--hero-buy) hover:text-[#062520] focus-visible:outline-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
            >
              <Icon name={action.icon} size={14} className="transition-transform duration-300 group-hover/action:scale-110" />
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

/** Each time slot is a session block: a time column on the left (clay + blinking when high impact) and its release rows on the right. */
function EventBoard({ events, alerts, onToggleAlert }: { events: EconomicEvent[]; alerts: Set<string>; onToggleAlert: (id: string) => void }) {
  const groups = useMemo(() => groupByTime(events), [events]);
  let cardIndex = 0;

  return (
    <ol className="flex flex-col gap-4">
      {groups.map(([time, groupEvents], groupIndex) => {
        const hasHigh = groupEvents.some((event) => event.importance === 'high');
        return (
          <li
            key={time}
            style={{ animationDelay: `${Math.min(groupIndex * 90, ROW_STAGGER_CAP_MS)}ms` }}
            className={cx(panelClass, 'grid animate-rise motion-reduce:animate-none md:grid-cols-[7rem_minmax(0,1fr)]')}
          >
            <div className="flex items-center gap-3 border-b border-dashed border-line bg-fg/[0.02] p-4 md:flex-col md:items-start md:border-r md:border-b-0">
              <span
                aria-hidden="true"
                style={hasHigh ? { background: RED } : undefined}
                className={cx('relative grid size-9 shrink-0 place-items-center rounded-lg', hasHigh ? 'text-[#062520]' : beadClass)}
              >
                {hasHigh && <span style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[10px] border-2 motion-reduce:hidden" />}
                <Icon name={hasHigh ? 'bolt' : 'clock'} size={14} className={hasHigh ? 'animate-pulse motion-reduce:animate-none' : undefined} />
              </span>
              <span className="font-mono text-2xl leading-none font-black tracking-tight text-fg tabular-nums">{time}</span>
              <span className="ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold text-fg-muted tabular-nums ring-1 ring-line md:ml-0">
                {groupEvents.length} {translate('tc.calendar.events')}
              </span>
              <span aria-hidden="true" className="hidden h-6 w-full items-end gap-0.5 md:flex">
                {groupEvents.map((event, bar) => (
                  <span
                    key={event.id}
                    style={{ height: `${35 + importanceStyle[event.importance].level * 20}%`, '--vol-delay': `${(bar % 5) * 0.15}s` } as CSSProperties}
                    className={cx('mkt-vol max-w-2 flex-1 rounded-t-[1px]', importanceStyle[event.importance].bar)}
                  />
                ))}
              </span>
            </div>
            <ul className="flex min-w-0 flex-col">
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

// Skeleton: terminal header (title + command bar) → session tape (clock | hourly volume | impact book) → date tape → filter ticket on the left beside the release blotter → disclaimer.
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
      <header className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
        </span>
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
              <span className={cx(beadClass, 'size-11')}>
                <Icon name="calendar" size={18} />
              </span>
              <RedDot className="absolute -top-0.5 -right-0.5" />
            </span>
            <h1 className="min-w-0 truncate text-3xl font-black tracking-tight text-fg sm:text-4xl">{translate('nav.tcEconomicCalendar')}</h1>
          </div>
          <div className="min-w-0 xl:w-[36rem]">
            <CommandBar query={query} onQueryChange={setQuery} />
          </div>
        </div>
      </header>

      <CalendarHero visibleEvents={visibleEvents} alertCount={alerts.size} />

      <section style={staggerStyle(2, 140)} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-line p-5">
          <div className="flex items-end gap-4">
            <span className="rounded-lg bg-(--hero-buy) px-2.5 py-1 font-mono text-5xl leading-none font-black tracking-tighter text-[#062520] tabular-nums">{pad2(selectedDay)}</span>
            <div>
              <p className="text-xl font-black tracking-tight text-fg sm:text-2xl">{heading.date}</p>
              <p className="flex items-center gap-2 text-xs text-fg-muted">
                <RedDot className="size-1.5" />
                {heading.weekday}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
            <span className="inline-flex items-center gap-1.5 rounded-md py-1 pr-3 pl-1 ring-1 ring-line">
              <span aria-hidden="true" className="grid size-6 place-items-center rounded bg-(--hero-buy)/15 text-success">
                <Icon name="trendUp" size={12} />
              </span>
              {translate('tc.calendar.beat')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md py-1 pr-3 pl-1 ring-1 ring-line">
              <span aria-hidden="true" className="grid size-6 place-items-center rounded bg-(--aurora-cta-from)/15 text-danger">
                <Icon name="trendDown" size={12} />
              </span>
              {translate('tc.calendar.miss')}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <DayRibbon selectedDay={selectedDay} onSelect={setSelectedDay} />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <FilterRail
          selectedDay={selectedDay}
          importances={importances}
          onToggleImportance={(value) => setImportances((current) => toggleInSet(current, value))}
          eventTypes={eventTypes}
          onToggleEventType={(value) => setEventTypes((current) => toggleInSet(current, value))}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
        />

        <section style={staggerStyle(3, 200)} className="flex min-w-0 animate-rise flex-col gap-4 motion-reduce:animate-none" aria-label={translate('nav.tcEconomicCalendar')}>
          {visibleEvents.length === 0 ? (
            <div className={cx(panelClass, 'flex flex-col items-center gap-4 px-5 py-16 text-center')}>
              <span aria-hidden="true" className="relative grid size-16 place-items-center">
                <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-xl border motion-reduce:hidden" />
                <span className={cx(beadClass, 'size-12 animate-float motion-reduce:animate-none')}>
                  <Icon name="calendar" size={18} />
                </span>
              </span>
              <span aria-hidden="true" className="flex h-8 w-full max-w-sm items-end gap-[3px] border-b border-dashed border-line-strong pb-0.5">
                {Array.from({ length: 24 }, (_, bar) => (
                  <span key={bar} style={{ height: `${25 + ((bar * 37) % 75)}%`, '--vol-delay': `${(bar % 6) * 0.15}s` } as CSSProperties} className="mkt-vol flex-1 rounded-t-[1px] bg-fg/15" />
                ))}
              </span>
              <p className="text-sm font-semibold text-fg">{translate('tc.calendar.emptyTitle')}</p>
            </div>
          ) : (
            <EventBoard key={selectedDay} events={visibleEvents} alerts={alerts} onToggleAlert={(id) => setAlerts((current) => toggleInSet(current, id))} />
          )}
        </section>
      </div>

      <footer className={cx(panelClass, 'flex gap-4 p-5 text-[11px] leading-relaxed text-fg-subtle')}>
        <span aria-hidden="true" style={{ background: RED }} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#062520]">
          <Icon name="alert" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-(--aurora-cta-from)">
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
