'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DotNumber } from '../ui/DotMatrix';
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
// Header and every row are separate grids, so all tracks except the event name must be fixed widths to line up.
const EVENT_COLUMNS = 'md:grid-cols-[64px_minmax(0,1fr)_96px_96px_120px_184px]';
const ROW_STAGGER_MS = 35;
const ROW_STAGGER_CAP_MS = 1200;

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
        <span
          key={level}
          style={{ height: `${level * 33}%` }}
          className={cx('w-1 rounded-full', level <= style.level ? style.bar : 'bg-line-strong')}
        />
      ))}
    </span>
  );
}

const SECONDS_PER_MINUTE = 60;

function MatrixClock({ time }: { time: string | null }) {
  const [hours, minutes, seconds] = (time ?? '--:--:--').split(':');
  const elapsedInMinute = time ? Number(seconds) : -1;

  return (
    <div role="timer" aria-label={time ?? undefined} className="group relative w-full max-w-sm">
      <span aria-hidden="true" className="absolute -inset-2 -z-10 animate-ring-breathe rounded-[26px] bg-primary/10 blur-2xl motion-reduce:animate-none" />

      <div className="glass relative overflow-hidden rounded-[20px] border border-white/10 bg-linear-to-br from-white/[0.08] via-white/[0.02] to-transparent p-4 shadow-[0_20px_40px_-22px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
        {/* Transparent-back look: faint internal strips and screws seen through the glass. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[22%] w-px bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[58%] h-px bg-white/[0.05]" />
        <span aria-hidden="true" className="pointer-events-none absolute top-2.5 right-2.5 size-1.5 rounded-full border border-white/15" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-2.5 size-1.5 rounded-full border border-white/15" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />

        <div className="relative flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/30">
            <LiveDot />
            {translate('tc.calendar.liveFeed')}
          </p>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[10px] tracking-wider text-fg-muted">{TIMEZONE_LABEL}</span>
        </div>

        <div aria-hidden="true" className="relative mt-4 flex items-start gap-2">
          <DotNumber value={hours} />
          <span className="mt-3 flex flex-col gap-2 animate-pulse motion-reduce:animate-none">
            <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
            <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
          </span>
          <DotNumber value={minutes} />
          <span className="mt-2 ml-1 flex items-center rounded-full border border-white/10 bg-black/30 px-2 py-1 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
            <DotNumber value={seconds} small />
          </span>
        </div>

        {/* Glyph strip: one segment per second of the current minute, the head segment glows. */}
        <div aria-hidden="true" className="relative mt-4 flex h-1.5 gap-px">
          {Array.from({ length: SECONDS_PER_MINUTE }, (_, index) => (
            <span
              key={index}
              className={cx(
                'flex-1 rounded-full transition-[background-color,box-shadow] duration-500 motion-reduce:transition-none',
                index === elapsedInMinute
                  ? 'bg-primary shadow-[0_0_8px_1px_var(--brand-primary)]'
                  : index < elapsedInMinute
                    ? 'bg-primary/45'
                    : 'bg-fg/[0.07]',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClockHero({
  query,
  onQueryChange,
  visibleEvents,
  alertCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  visibleEvents: EconomicEvent[];
  alertCount: number;
}) {
  const time = useLiveClock();
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const closeStory = useCallback(() => setIsStoryOpen(false), []);
  const closeFaq = useCallback(() => setIsFaqOpen(false), []);
  const counts = IMPORTANCE_LEVELS.map((level) => ({
    level,
    count: visibleEvents.filter((event) => event.importance === level).length,
  })).reverse();
  const total = Math.max(1, visibleEvents.length);

  return (
    <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-10 size-80 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
      />

      <div className="relative grid grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-center">
        <div className="flex flex-col gap-3">
          <MatrixClock time={time} />
          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">
              <CountUp value={TOTAL_EVENTS} format={(current) => String(Math.round(current))} />
            </span>
            {translate('tc.calendar.events')}
            <span aria-hidden="true">·</span>
            <Icon name="bell" size={14} className="text-primary" />
            <span className="tabular-nums">{alertCount}</span> {translate('tc.calendar.alertsSet')}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="search"
              leftIcon="search"
              aria-label={translate('tc.calendar.search')}
              placeholder={translate('tc.calendar.search')}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="sm:flex-1"
            />
            <div className="flex shrink-0 gap-2">
              <Button aria-haspopup="dialog" onClick={() => setIsStoryOpen(true)} className="group/story relative flex-1 overflow-hidden sm:flex-none">
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                <Icon name="bolt" size={16} className="relative" />
                <span className="relative">{translate('tc.calendar.storyteller')}</span>
              </Button>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={calendarStoryCopy.help}
                title={calendarStoryCopy.help}
                onClick={() => setIsFaqOpen(true)}
                className="grid size-10 shrink-0 place-items-center self-center rounded-full bg-surface text-sm font-bold text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                ?
              </button>
            </div>
          </div>
          {isStoryOpen && <CalendarStorytellerPanel onClose={closeStory} />}
          {isFaqOpen && <CalendarFaqModal onClose={closeFaq} />}

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>{translate('tc.calendar.impactMix')}</span>
              <span className="tabular-nums">
                {visibleEvents.length} {translate('tc.calendar.shown')}
              </span>
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
              {counts.map(({ level, count }, index) => (
                <span
                  key={level}
                  style={{ width: `${(count / total) * 100}%`, ...staggerStyle(index, 300) }}
                  className={cx('h-full origin-left animate-grow motion-reduce:animate-none', importanceStyle[level].bar)}
                />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {counts.map(({ level, count }) => (
                <li key={level} className="flex items-center gap-2 text-xs text-fg-muted">
                  <ImportanceMeter importance={level} />
                  <span className="truncate">{translate(`tc.calendar.importance.${level}`)}</span>
                  <span className="ml-auto font-semibold tabular-nums text-fg">
                    <CountUp value={count} format={(current) => String(Math.round(current))} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniCalendar({ selectedDay, onSelect }: { selectedDay: number; onSelect: (day: number) => void }) {
  const firstWeekday = new Date(Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH_INDEX, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH_INDEX + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-fg">{monthLabel}</p>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          {translate('tc.calendar.custom')}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {WEEKDAY_KEYS.map((key) => (
          <span key={key} className="py-1 font-medium text-fg-subtle">
            {translate(key)}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const inRange = day >= SELECTED_DAY && day <= RANGE_END_DAY;
          const isSelected = day === selectedDay;
          const isToday = day === TODAY;
          return (
            <span key={day} className={cx('flex justify-center', inRange && 'bg-primary-soft', day === SELECTED_DAY && 'rounded-l-full', day === RANGE_END_DAY && 'rounded-r-full')}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={dayHeading(day).date}
                onClick={() => onSelect(day)}
                className={cx(
                  'relative grid size-8 place-items-center rounded-full tabular-nums transition-[background-color,color,transform] duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                  isSelected ? 'bg-primary font-semibold text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]' : 'text-fg hover:bg-hover',
                )}
              >
                {day}
                {isToday && !isSelected && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-primary" />}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ChipToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
        active ? 'bg-primary text-on-primary ring-primary shadow-[0_6px_16px_-8px_var(--brand-primary)]' : 'bg-surface text-fg-muted ring-line hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}

function FilterPanel({
  selectedDay,
  onSelectDay,
  importances,
  onToggleImportance,
  eventTypes,
  onToggleEventType,
  selectedCountries,
  onCountriesChange,
}: {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  importances: Set<Importance>;
  onToggleImportance: (value: Importance) => void;
  eventTypes: Set<EventType>;
  onToggleEventType: (value: EventType) => void;
  selectedCountries: Set<string>;
  onCountriesChange: (next: Set<string>) => void;
}) {
  // Below lg the calendar + filters fold behind one bar, so the events list is right under the hero instead of
  // ~800px of filters further down. From lg up they're the always-open sticky side column.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="calendar-filters"
        onClick={() => setIsOpen((current) => !current)}
        className="glow-border flex animate-rise items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none lg:hidden"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
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
        className={cx('gap-4 lg:flex lg:flex-col', isOpen ? 'flex flex-col md:grid md:grid-cols-2 md:items-start' : 'hidden')}
      >
      <Card style={staggerStyle(0, 200)} className="glow-border animate-rise motion-reduce:animate-none">
        <MiniCalendar selectedDay={selectedDay} onSelect={onSelectDay} />
        <p className="mt-4 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-xs text-fg-muted">
          <Icon name="globe" size={14} className="text-primary" />
          ({TIMEZONE_LABEL}) · {translate('tc.calendar.timezoneHint')}
        </p>
      </Card>

      <Card style={staggerStyle(1, 200)} className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon name="filter" size={16} className="text-primary" />
          {translate('tc.calendar.filters')}
        </h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-fg-subtle">{translate('tc.calendar.importanceLabel')}</legend>
          <div className="flex flex-wrap gap-2">
            {IMPORTANCE_LEVELS.map((level) => (
              <ChipToggle
                key={level}
                active={importances.has(level)}
                label={translate(`tc.calendar.importance.${level}`)}
                onClick={() => onToggleImportance(level)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-fg-subtle">{translate('tc.calendar.eventTypeLabel')}</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <ChipToggle key={type} active={eventTypes.has(type)} label={translate(`tc.calendar.eventType.${type}`)} onClick={() => onToggleEventType(type)} />
            ))}
          </div>
        </fieldset>

        <CountryFilter selected={selectedCountries} onChange={onCountriesChange} />
      </Card>
      </div>
    </aside>
  );
}

function CountryFilter({ selected, onChange }: { selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [openGroups, setOpenGroups] = useState<Set<CountryGroup>>(() => new Set<CountryGroup>(['g7']));

  const toggleGroup = (group: CountryGroup) => {
    const members = COUNTRY_GROUP_MEMBERS[group];
    const isFull = members.every((code) => selected.has(code));
    const next = new Set(selected);
    for (const code of members) {
      if (isFull) next.delete(code);
      else next.add(code);
    }
    onChange(next);
  };

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-2 text-xs font-medium text-fg-subtle">{translate('tc.calendar.countriesLabel')}</legend>
      {COUNTRY_GROUPS.map((group) => {
        const members = COUNTRY_GROUP_MEMBERS[group];
        const pickedCount = members.filter((code) => selected.has(code)).length;
        const isOpen = openGroups.has(group);
        const panelId = `country-group-${group}`;
        const groupLabel = translate(`tc.calendar.countryGroup.${group}`);
        return (
          <div key={group} className={cx('overflow-hidden rounded-lg ring-1 transition-colors duration-200', isOpen ? 'bg-surface-2 ring-line-strong' : 'ring-line')}>
            <div className="flex items-center gap-2 pr-1.5">
              <Checkbox
                checked={pickedCount === members.length}
                onChange={() => toggleGroup(group)}
                label={<span className="font-semibold text-fg">{groupLabel}</span>}
                className="flex-1 px-3 py-2.5"
              />
              <span className={cx('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1', pickedCount > 0 ? 'bg-primary-soft text-primary ring-primary/30' : 'text-fg-subtle ring-line')}>
                {pickedCount}/{members.length}
              </span>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={groupLabel}
                onClick={() => setOpenGroups((current) => toggleInSet(current, group))}
                className="grid size-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon name="chevronDown" size={15} className={cx('transition-transform duration-300', isOpen && 'rotate-180 text-primary')} />
              </button>
            </div>
            <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden" inert={!isOpen}>
                <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto border-t border-line p-1.5">
                  {members.map((code, index) => (
                    <li key={code} style={{ animationDelay: `${index * 30}ms` }} className={cx(isOpen && 'animate-feed-in motion-reduce:animate-none')}>
                      <Checkbox
                        checked={selected.has(code)}
                        onChange={() => onChange(toggleInSet(selected, code))}
                        label={
                          <span className="flex items-center gap-2">
                            <CountryFlag code={code} />
                            {countryNames[code] ?? code}
                          </span>
                        }
                        className="w-full rounded-md px-2.5 py-1.5 transition-colors hover:bg-hover hover:text-fg"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

function Figure({ label, value, tone, note }: { label: string; value?: string; tone?: string; note?: string }) {
  return (
    <div className="min-w-0 text-right">
      <p className="text-[10px] uppercase tracking-wide text-fg-subtle md:hidden">{label}</p>
      <p className={cx('whitespace-nowrap text-sm font-semibold tabular-nums', value ? (tone ?? 'text-fg') : 'text-fg-subtle')}>{value ?? '—'}</p>
      {note && <p className="text-[10px] text-fg-subtle">{note}</p>}
    </div>
  );
}

function EventRow({ event, index, hasAlert, onToggleAlert }: { event: EconomicEvent; index: number; hasAlert: boolean; onToggleAlert: () => void }) {
  const result = surprise(event);
  const actualTone = result === 'beat' ? 'text-success' : result === 'miss' ? 'text-danger' : undefined;

  return (
    <li
      style={{ animationDelay: `${Math.min(index * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS)}ms` }}
      className={cx(
        'group relative grid animate-feed-in grid-cols-[52px_minmax(0,1fr)_32px] items-center gap-x-2 gap-y-2 rounded-lg px-2 py-2.5 transition-colors duration-200 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity hover:bg-hover hover:before:opacity-100 sm:gap-x-3 sm:px-3 motion-reduce:animate-none motion-reduce:transition-none',
        EVENT_COLUMNS,
      )}
    >
      <span
        title={countryNames[event.country] ?? event.country}
        className="flex h-7 items-center justify-center gap-1.5 justify-self-center rounded-md bg-surface-2 px-1.5 text-[11px] font-bold tracking-wide text-fg ring-1 ring-line"
      >
        <CountryFlag code={event.country} />
        {event.country}
      </span>

      <div className="min-w-0">
        {/* Phones get two lines for the name; a single truncated line left most names unreadable. */}
        <p className="line-clamp-2 text-sm font-medium text-fg md:truncate" title={event.name}>
          {event.name}
        </p>
        <span className={cx('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', importanceStyle[event.importance].chip)}>
          <ImportanceMeter importance={event.importance} />
          {translate(`tc.calendar.importance.${event.importance}`)}
        </span>
      </div>

      <div className="col-span-3 col-start-1 row-start-2 grid grid-cols-3 gap-2 md:col-span-1 md:col-start-auto md:row-start-auto md:contents">
        <div className="flex items-center justify-end gap-1">
          {result === 'beat' && <Icon name="trendUp" size={13} className="text-success" />}
          {result === 'miss' && <Icon name="trendDown" size={13} className="text-danger" />}
          <Figure label={translate('tc.calendar.actual')} value={event.actual} tone={actualTone} />
        </div>
        <Figure label={translate('tc.calendar.forecast')} value={event.forecast} />
        <Figure
          label={translate('tc.calendar.previous')}
          value={event.previous}
          note={event.revisedFrom ? `${translate('tc.calendar.revisedFrom')} ${event.revisedFrom}` : undefined}
        />
      </div>

      <div className="col-start-3 row-start-1 flex items-center justify-end gap-0.5 md:col-start-auto md:row-start-auto">
        <div className="hidden items-center gap-0.5 md:flex">
          {EVENT_ACTIONS.map((action, actionIndex) => (
            <button
              key={action.id}
              type="button"
              aria-label={`${action.label}: ${event.name}`}
              title={action.label}
              onClick={() => runEventAction(action.id, event)}
              style={{ transitionDelay: `${actionIndex * 25}ms` }}
              className="grid size-7 place-items-center rounded-md text-primary/55 transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-ring group-hover:text-primary/85 motion-reduce:transition-none"
            >
              <Icon name={action.icon} size={15} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={hasAlert}
          aria-label={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          title={translate(hasAlert ? 'tc.calendar.removeAlert' : 'tc.calendar.setAlert')}
          onClick={onToggleAlert}
          className={cx(
            'relative grid size-8 place-items-center rounded-full transition-[color,background-color,transform] duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
            hasAlert ? 'bg-primary text-on-primary' : 'text-fg-subtle hover:bg-primary-soft hover:text-primary',
          )}
        >
          {hasAlert && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:animate-none" />}
          <Icon name="bell" size={15} className="relative" />
        </button>
      </div>
    </li>
  );
}

function EventTimeline({ events, alerts, onToggleAlert }: { events: EconomicEvent[]; alerts: Set<string>; onToggleAlert: (id: string) => void }) {
  const groups = useMemo(() => {
    const byTime = new Map<string, EconomicEvent[]>();
    for (const event of events) byTime.set(event.time, [...(byTime.get(event.time) ?? []), event]);
    return [...byTime.entries()];
  }, [events]);

  let rowIndex = 0;

  return (
    <ol className="relative flex flex-col gap-1">
      <span aria-hidden="true" className="absolute top-2 bottom-2 left-[21px] w-px bg-linear-to-b from-primary/60 via-line to-transparent sm:left-[27px]" />
      {groups.map(([time, groupEvents]) => {
        const hasHigh = groupEvents.some((event) => event.importance === 'high');
        return (
          <li key={time} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-1.5 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-2">
            <div className="flex flex-col items-center pt-3">
              <span className="relative grid size-3 place-items-center">
                {hasHigh && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-danger/50 motion-reduce:animate-none" />}
                <span className={cx('relative size-3 rounded-full ring-4 ring-surface', hasHigh ? 'bg-danger' : 'bg-primary')} />
              </span>
              <span className="mt-1.5 font-mono text-xs font-semibold tabular-nums text-fg">{time}</span>
            </div>
            <ul className="flex flex-col">
              {groupEvents.map((event) => {
                const index = rowIndex++;
                return <EventRow key={event.id} event={event} index={index} hasAlert={alerts.has(event.id)} onToggleAlert={() => onToggleAlert(event.id)} />;
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
  const columnHeadClass = 'text-right text-[11px] font-medium uppercase tracking-wide text-fg-subtle';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.tcEconomicCalendar')} />

      <ClockHero query={query} onQueryChange={setQuery} visibleEvents={visibleEvents} alertCount={alerts.size} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <FilterPanel
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          importances={importances}
          onToggleImportance={(value) => setImportances((current) => toggleInSet(current, value))}
          eventTypes={eventTypes}
          onToggleEventType={(value) => setEventTypes((current) => toggleInSet(current, value))}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
        />

        <section
          style={staggerStyle(1, 250)}
          className="glow-border min-w-0 animate-rise rounded-xl bg-surface shadow-card lg:order-1 motion-reduce:animate-none"
          aria-label={translate('nav.tcEconomicCalendar')}
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-primary text-on-primary shadow-[0_8px_20px_-8px_var(--brand-primary)]">
                <Icon name="calendar" size={20} />
              </span>
              <div>
                <p className="text-base font-semibold text-fg">{heading.date}</p>
                <p className="text-xs text-fg-muted">{heading.weekday}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-fg-muted">
              <span className="flex items-center gap-1">
                <Icon name="trendUp" size={13} className="text-success" />
                {translate('tc.calendar.beat')}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="trendDown" size={13} className="text-danger" />
                {translate('tc.calendar.miss')}
              </span>
            </div>
          </header>

          <div className="hidden grid-cols-[56px_minmax(0,1fr)] gap-2 px-3 pt-3 md:grid">
            <span className="text-center text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{translate('tc.calendar.time')}</span>
            <div className={cx('grid items-center gap-x-3 border-b border-line px-3 pb-2', EVENT_COLUMNS)}>
              <span className="text-center text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{translate('tc.calendar.country')}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{translate('tc.calendar.event')}</span>
              <span className={columnHeadClass}>{translate('tc.calendar.actual')}</span>
              <span className={columnHeadClass}>{translate('tc.calendar.forecast')}</span>
              <span className={columnHeadClass}>{translate('tc.calendar.previous')}</span>
              <span />
            </div>
          </div>

          <div className="p-3">
            {visibleEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <span className="flex size-14 animate-float items-center justify-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
                  <Icon name="calendar" size={24} />
                </span>
                <p className="text-sm font-medium text-fg">{translate('tc.calendar.emptyTitle')}</p>
              </div>
            ) : (
              <EventTimeline
                key={selectedDay}
                events={visibleEvents}
                alerts={alerts}
                onToggleAlert={(id) => setAlerts((current) => toggleInSet(current, id))}
              />
            )}
          </div>
        </section>
      </div>

      <footer className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-5 text-[11px] leading-relaxed text-fg-subtle">
        {disclaimerParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </footer>
    </div>
  );
}
