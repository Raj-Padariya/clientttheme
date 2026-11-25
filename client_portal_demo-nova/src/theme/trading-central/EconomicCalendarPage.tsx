'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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
const RULER_HOURS = Array.from({ length: 25 }, (_, hour) => hour);
const RULER_LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];


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

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const importanceFill: Record<Importance, string> = { high: 'fill-danger', medium: 'fill-warning', low: 'fill-info' };
const SHARE_DOTS = 10;
const SECOND_DOTS = 12;
const DIAL_CENTER = 120;
const DIAL_RADIUS = 92;
const DIAL_LENGTH = 2 * Math.PI * DIAL_RADIUS;

function ImportanceMeter({ importance }: { importance: Importance }) {
  const style = importanceStyle[importance];
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((level) => (
        <span key={level} className={cx('size-1.5 rounded-full', level <= style.level ? style.bar : 'bg-line-strong')} />
      ))}
    </span>
  );
}

function dialPoint(minute: number, radius: number) {
  const angle = (minute / MINUTES_PER_DAY) * 2 * Math.PI - Math.PI / 2;
  return { x: DIAL_CENTER + radius * Math.cos(angle), y: DIAL_CENTER + radius * Math.sin(angle) };
}

/** 24-hour dial: each time slot of the visible events is a bead on the ring (size = top importance); the hand is "now". */
function DayDial({ time, events }: { time: string | null; events: EconomicEvent[] }) {
  const markers = useMemo(
    () =>
      groupByTime(events).flatMap(([slot, group]) => {
        const minute = minuteOfDay(slot);
        if (!Number.isFinite(minute)) return [];
        return [{ slot, minute, importance: topImportance(group), names: group.map((event) => event.name).join(' · ') }];
      }),
    [events],
  );
  const nowMinute = time ? minuteOfDay(time) + Number(time.split(':')[2]) / 60 : null;
  const hand = nowMinute === null ? null : dialPoint(nowMinute, DIAL_RADIUS);

  return (
    <svg viewBox="0 0 240 240" className="size-full overflow-visible">
      <circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={DIAL_RADIUS} fill="none" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" className="stroke-fg/30" />
      {nowMinute !== null && (
        <circle
          cx={DIAL_CENTER}
          cy={DIAL_CENTER}
          r={DIAL_RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${(nowMinute / MINUTES_PER_DAY) * DIAL_LENGTH} ${DIAL_LENGTH}`}
          transform={`rotate(-90 ${DIAL_CENTER} ${DIAL_CENTER})`}
          className="stroke-fg/55"
        />
      )}
      {RULER_HOURS.slice(0, 24).map((hour) => {
        const point = dialPoint(hour * 60, DIAL_RADIUS + 13);
        return <circle key={hour} cx={point.x} cy={point.y} r={hour % 3 === 0 ? 1.8 : 1} className={hour % 3 === 0 ? 'fill-fg/60' : 'fill-fg/25'} />;
      })}
      {RULER_LABEL_HOURS.filter((hour) => hour < 24).map((hour) => {
        const point = dialPoint(hour * 60, DIAL_RADIUS - 17);
        return (
          <text key={hour} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="central" className="fill-fg-subtle font-mono text-[9px]">
            {pad2(hour)}
          </text>
        );
      })}
      {hand && (
        <g>
          <line x1={DIAL_CENTER} y1={DIAL_CENTER} x2={hand.x} y2={hand.y} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" className="stroke-fg/50" />
          <circle cx={hand.x} cy={hand.y} r="4" className="fill-fg">
            <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={hand.x} cy={hand.y} r="4" fill="none" strokeWidth="1" className="stroke-fg motion-reduce:hidden">
            <animate attributeName="r" values="4;14" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {markers.map((marker, index) => {
        const point = dialPoint(marker.minute, DIAL_RADIUS);
        return (
          <circle
            key={marker.slot}
            cx={point.x}
            cy={point.y}
            r={2.5 + importanceStyle[marker.importance].level * 1.8}
            style={{ animationDelay: `${300 + index * 60}ms` }}
            className={cx('origin-center animate-dot-pop stroke-surface [transform-box:fill-box] motion-reduce:animate-none', importanceFill[marker.importance])}
            strokeWidth="1.5"
          >
            <title>{`${marker.slot} · ${marker.names}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

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
    <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <div className="animate-rise motion-reduce:animate-none">
        <FrostCard>
          <div className="flex flex-col gap-5 text-[#0a1220] sm:p-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', frostChipClass)}>
                <LiveDot />
                {translate('tc.calendar.liveFeed')}
              </p>
              <span className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider ring-1 ring-[#0a1220]/15">{TIMEZONE_LABEL}</span>
            </div>

            <div role="timer" aria-label={time ?? undefined} className="flex flex-col gap-3">
              <div aria-hidden="true" className="flex items-center gap-3">
                <span className="font-mono text-6xl leading-none font-black tracking-tight tabular-nums sm:text-7xl">
                  {hours}
                  <span className="animate-pulse text-[#0a1220]/35 motion-reduce:animate-none">:</span>
                  {minutes}
                </span>
                <span className="relative grid size-12 place-items-center rounded-full bg-[#0a1220] font-mono text-base font-bold text-white tabular-nums">
                  <span className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-[#0a1220]/40 motion-reduce:animate-none" />
                  {seconds}
                </span>
              </div>
              <span aria-hidden="true" className="flex gap-1.5">
                {Array.from({ length: SECOND_DOTS }, (_, dot) => (
                  <span key={dot} className={cx('size-2 rounded-full transition-colors duration-500', dot < litSeconds ? 'bg-[#0a1220]' : 'bg-[#0a1220]/15')} />
                ))}
              </span>
            </div>

            <dl className="flex flex-col gap-2 border-t border-dotted border-[#0a1220]/25 pt-4 text-sm">
              <div className="flex items-center gap-2">
                <dt className="font-medium text-[#3b4658]">{translate('tc.calendar.events')}</dt>
                <span aria-hidden="true" className="flex-1 border-t border-dotted border-[#0a1220]/25" />
                <dd className="font-mono text-lg font-black tabular-nums">
                  <CountUp value={TOTAL_EVENTS} format={(current) => String(Math.round(current))} />
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="flex items-center gap-1.5 font-medium text-[#3b4658]">
                  <Icon name="bell" size={14} />
                  {translate('tc.calendar.alertsSet')}
                </dt>
                <span aria-hidden="true" className="flex-1 border-t border-dotted border-[#0a1220]/25" />
                <dd className="font-mono text-lg font-black tabular-nums">{alertCount}</dd>
              </div>
            </dl>
          </div>
        </FrostCard>
      </div>

      <section style={staggerStyle(1, 140)} className={cx(panelClass, 'grid animate-rise items-center gap-6 p-5 sm:grid-cols-[15rem_minmax(0,1fr)] motion-reduce:animate-none')}>
        <div aria-hidden="true" className="relative mx-auto size-60">
          <DayDial time={time} events={visibleEvents} />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-mono text-4xl leading-none font-black text-fg tabular-nums">
                <CountUp value={visibleEvents.length} format={(current) => pad2(Math.round(current))} />
              </p>
              <p className={cx(captionClass, 'mt-1')}>{translate('tc.calendar.shown')}</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <Icon name="signalBars" size={12} />
            {translate('tc.calendar.impactMix')}
          </p>
          <ul className="flex flex-col gap-2.5">
            {counts.map(({ level, count }, index) => {
              const litDots = Math.round((count / total) * SHARE_DOTS);
              return (
                <li key={level} style={staggerStyle(index, 120)} className="flex animate-feed-in items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 ring-1 ring-line motion-reduce:animate-none">
                  <span className={cx(beadClass, 'size-10 font-mono text-sm font-black tabular-nums')}>
                    <CountUp value={count} format={(current) => pad2(Math.round(current))} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <ImportanceMeter importance={level} />
                      <span className="truncate">{translate(`tc.calendar.importance.${level}`)}</span>
                    </span>
                    <span aria-hidden="true" className="flex gap-1">
                      {Array.from({ length: SHARE_DOTS }, (_, dot) => (
                        <span
                          key={dot}
                          style={{ animationDelay: `${400 + dot * 40}ms` }}
                          className={cx('size-1.5 animate-dot-pop rounded-full motion-reduce:animate-none', dot < litDots ? importanceStyle[level].bar : 'bg-line-strong')}
                        />
                      ))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
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
            className="group/story relative inline-flex h-11 flex-1 items-center gap-2.5 overflow-hidden rounded-full bg-fg pr-4 pl-1.5 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/story:translate-x-full motion-reduce:hidden" />
            <span aria-hidden="true" className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-500 group-hover/story:rotate-12 motion-reduce:transition-none">
              <Icon name="bolt" size={15} />
            </span>
            <span className="relative">{translate('tc.calendar.storyteller')}</span>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={calendarStoryCopy.help}
            title={calendarStoryCopy.help}
            onClick={() => setIsFaqOpen(true)}
            className={cx(beadClass, 'size-11 text-sm font-black transition-transform duration-300 hover:-rotate-12 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none')}
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

/** The month as a scrollable string of day beads; published days are glossy, today carries a dot underneath. */
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
        <p className="flex items-center gap-2.5 text-sm font-bold tracking-wide text-fg uppercase">
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="calendar" size={14} />
          </span>
          {monthLabel}
        </p>
        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-fg-muted uppercase ring-1 ring-line-strong">{translate('tc.calendar.custom')}</span>
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
              className="group/day flex w-12 shrink-0 flex-col items-center gap-1.5 rounded-full py-1 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className={cx('text-[9px] font-bold tracking-wider uppercase', isSelected ? 'text-fg' : 'text-fg-subtle')}>{translate(WEEKDAY_KEYS[weekday])}</span>
              <span
                className={cx(
                  'relative grid size-10 place-items-center rounded-full font-mono text-sm font-bold tabular-nums transition-[background-color,color,box-shadow,translate] duration-300 group-hover/day:-translate-y-0.5 motion-reduce:transition-none',
                  isSelected ? 'bg-fg text-app' : inRange ? 'nova-gloss text-fg' : 'text-fg-muted ring-1 ring-line group-hover/day:ring-line-strong',
                )}
              >
                {isSelected && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
                {day}
              </span>
              <span aria-hidden="true" className={cx('size-1 rounded-full', isToday ? 'bg-fg' : 'bg-transparent')} />
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
        'flex w-full items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-4 text-left text-xs font-semibold ring-1 transition-[color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'text-fg ring-line-strong' : 'text-fg-muted ring-line hover:text-fg',
      )}
    >
      {children}
      <span aria-hidden="true" className={cx('relative ml-auto h-7 w-12 shrink-0 rounded-full transition-colors duration-300', active ? 'bg-fg' : 'bg-fg/10')}>
        <span
          className={cx(
            'absolute top-1 size-5 rounded-full transition-[left,background-color] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
            active ? 'left-6 bg-app' : 'nova-gloss left-1',
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

  return (
    <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:order-2 xl:self-start">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="calendar-filters"
        onClick={() => setIsOpen((current) => !current)}
        className={cx(panelClass, 'flex animate-rise items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none xl:hidden')}
      >
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
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
        <h2 className="flex items-center gap-2.5 border-b border-dotted border-line-strong px-4 py-3.5 text-sm font-bold text-fg">
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="filter" size={14} />
          </span>
          {translate('tc.calendar.filters')}
        </h2>

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

          <fieldset>
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
                      'group/type flex flex-col items-start gap-2.5 rounded-[20px] p-3 text-left text-xs font-bold uppercase transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                      isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                    )}
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className={cx('grid size-8 place-items-center rounded-full transition-transform duration-300 group-hover/type:-rotate-12', isActive ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                        <Icon name={EVENT_TYPE_ICON[type]} size={14} />
                      </span>
                      <span aria-hidden="true" className={cx('size-2 rounded-full transition-colors', isActive ? 'bg-app' : 'border border-dashed border-line-strong')} />
                    </span>
                    {translate(`tc.calendar.eventType.${type}`)}
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

/** One group at a time behind a sliding pill; members are round flag chips. */
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
      <div role="tablist" aria-label={translate('tc.calendar.countriesLabel')} className="relative grid grid-cols-3 rounded-full p-1 ring-1 ring-line">
        <span
          aria-hidden="true"
          style={{ transform: `translateX(${groupIndex * 100}%)` }}
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-fg transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
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
                'relative flex flex-col items-center rounded-full px-1 py-1.5 text-xs font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
              )}
            >
              <span className="truncate">{translate(`tc.calendar.countryGroup.${group}`)}</span>
              <span className={cx('font-mono text-[10px] tabular-nums', isActive ? 'text-app/70' : 'text-fg-subtle')}>
                {groupPicked}/{groupMembers.length}
              </span>
            </button>
          );
        })}
      </div>

      <div id="country-panel" role="tabpanel" aria-labelledby={`country-tab-${activeGroup}`} className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <Checkbox checked={pickedCount === members.length} onChange={() => toggleGroup(activeGroup)} label={<span className="font-semibold text-fg">{groupLabel}</span>} />
          <span className={cx('rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums', pickedCount > 0 ? 'bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}>
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
                    'inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs ring-1 transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                    isOn ? 'bg-fg/[0.07] text-fg ring-fg/35' : 'text-fg-subtle ring-line hover:text-fg',
                  )}
                >
                  <span className="grid size-5 place-items-center overflow-hidden rounded-full">
                    <CountryFlag code={code} />
                  </span>
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

/** Receipt row for the secondary figures: label, dotted leader, value (and the revision note under it). */
function ReceiptFigure({ label, value, note }: { label: string; value?: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center gap-2 text-xs">
        <dt className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{label}</dt>
        <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-line-strong" />
        <dd className={cx('font-mono font-bold whitespace-nowrap tabular-nums', value ? 'text-fg' : 'text-fg-subtle')}>{value ?? '—'}</dd>
      </div>
      {note && (
        <dd className="truncate text-right text-[10px] text-fg-subtle" title={note}>
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
      className="group flex min-w-0 animate-feed-in flex-col gap-3.5 rounded-[24px] p-4 ring-1 ring-line transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3">
        <span title={countryNames[event.country] ?? event.country} className="relative grid size-11 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-line-strong transition-colors group-hover:animate-rim-spin group-hover:border-fg/40 motion-reduce:group-hover:animate-none" />
          <span className="grid size-8 place-items-center overflow-hidden rounded-full nova-gloss">
            <CountryFlag code={event.country} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-fg-muted">{event.country}</span>
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
          className={cx(
            'relative grid size-9 shrink-0 place-items-center rounded-full transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
            hasAlert ? 'bg-fg text-app' : 'text-fg-subtle ring-1 ring-line hover:text-fg hover:ring-line-strong',
          )}
        >
          {hasAlert && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/50 motion-reduce:hidden" />}
          <Icon name="bell" size={15} className="relative" />
        </button>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[20px] border border-dashed border-line-strong px-4 py-3">
        <div className="flex flex-col border-r border-dotted border-line-strong pr-4">
          <dt className="text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{translate('tc.calendar.actual')}</dt>
          <dd className={cx('mt-0.5 flex items-center gap-1 font-mono text-2xl font-black whitespace-nowrap tabular-nums', event.actual ? (actualTone ?? 'text-fg') : 'text-fg-subtle')}>
            {result === 'beat' ? <Icon name="trendUp" size={15} /> : result === 'miss' ? <Icon name="trendDown" size={15} /> : null}
            {event.actual ?? '—'}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <ReceiptFigure label={translate('tc.calendar.forecast')} value={event.forecast} />
          <ReceiptFigure label={translate('tc.calendar.previous')} value={event.previous} note={event.revisedFrom ? `${translate('tc.calendar.revisedFrom')} ${event.revisedFrom}` : undefined} />
        </div>
      </dl>

      <div className="flex items-center justify-between gap-1">
        {EVENT_ACTIONS.map((action, actionIndex) => (
          <button
            key={action.id}
            type="button"
            aria-label={`${action.label}: ${event.name}`}
            title={action.label}
            onClick={() => runEventAction(action.id, event)}
            style={{ transitionDelay: `${actionIndex * 25}ms` }}
            className="grid size-9 place-items-center rounded-full text-fg-subtle ring-1 ring-line transition-[color,background-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:bg-fg hover:text-app hover:ring-fg focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name={action.icon} size={15} />
          </button>
        ))}
      </div>
    </li>
  );
}

/** Time slots hang off one dotted spine; the slot bead turns dark (and ripples) when it holds a high-impact release. */
function EventBoard({ events, alerts, onToggleAlert }: { events: EconomicEvent[]; alerts: Set<string>; onToggleAlert: (id: string) => void }) {
  const groups = useMemo(() => groupByTime(events), [events]);
  let cardIndex = 0;

  return (
    <ol className="relative flex flex-col gap-6">
      <span aria-hidden="true" className="absolute top-7 bottom-7 left-7 hidden border-l border-dotted border-line-strong sm:block" />
      {groups.map(([time, groupEvents]) => {
        const hasHigh = groupEvents.some((event) => event.importance === 'high');
        return (
          <li key={time} className="relative grid gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-4">
            <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5">
              <span className={cx('relative grid size-14 shrink-0 place-items-center rounded-full font-mono text-xs font-black tabular-nums', hasHigh ? 'bg-fg text-app' : 'nova-gloss text-fg')}>
                {hasHigh && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-danger/70 motion-reduce:hidden" />}
                {hasHigh ? (
                  <span aria-hidden="true" className="absolute top-0.5 right-0.5 flex size-2.5">
                    <span className="absolute inset-0 animate-ping-soft rounded-full bg-danger motion-reduce:animate-none" />
                    <span className="relative size-2.5 rounded-full bg-danger ring-2 ring-surface" />
                  </span>
                ) : (
                  <Icon name="clock" size={10} className="absolute top-1.5 text-fg-subtle" />
                )}
                {time}
              </span>
              <span className="text-[10px] text-fg-subtle tabular-nums sm:text-center">
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
      <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-9')}>
            <Icon name="calendar" size={15} />
          </span>
        </span>
        <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.tcEconomicCalendar')}</h1>
      </header>

      <CalendarHero visibleEvents={visibleEvents} alertCount={alerts.size} />
      <CommandBar query={query} onQueryChange={setQuery} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <FilterRail
          selectedDay={selectedDay}
          importances={importances}
          onToggleImportance={(value) => setImportances((current) => toggleInSet(current, value))}
          eventTypes={eventTypes}
          onToggleEventType={(value) => setEventTypes((current) => toggleInSet(current, value))}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
        />

        <section style={staggerStyle(3, 200)} className={cx(panelClass, 'min-w-0 animate-rise xl:order-1 motion-reduce:animate-none')} aria-label={translate('nav.tcEconomicCalendar')}>
          <div className="border-b border-dotted border-line-strong p-4 sm:p-5">
            <DayRibbon selectedDay={selectedDay} onSelect={setSelectedDay} />
          </div>

          <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-4 sm:px-5">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
                <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
                <span className="grid size-11 place-items-center rounded-full bg-fg font-mono text-lg font-black text-app tabular-nums">{selectedDay}</span>
              </span>
              <div>
                <p className="text-2xl font-bold tracking-tight text-fg">{heading.date}</p>
                <p className="text-xs text-fg-muted">{heading.weekday}</p>
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

          <div className="px-4 pb-5 sm:px-5">
            {visibleEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-line-strong py-14 text-center">
                <span aria-hidden="true" className="relative grid size-16 place-items-center">
                  <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
                  <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />
                  <span className={cx(beadClass, 'size-10 animate-float motion-reduce:animate-none')}>
                    <Icon name="calendar" size={17} />
                  </span>
                </span>
                <p className="text-sm font-medium text-fg">{translate('tc.calendar.emptyTitle')}</p>
              </div>
            ) : (
              <EventBoard key={selectedDay} events={visibleEvents} alerts={alerts} onToggleAlert={(id) => setAlerts((current) => toggleInSet(current, id))} />
            )}
          </div>
        </section>
      </div>

      <footer className={cx(panelClass, 'flex gap-4 border border-dashed border-line-strong p-5 text-[11px] leading-relaxed text-fg-subtle')}>
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="alert" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-fg-muted">
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
