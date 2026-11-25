'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { useEnrolledContestIds } from './contestEnrollment';
import { prefersReducedMotion, useAnimatedNumber } from './ScratchExperience';

/*
 * Zenith demo contests as a season board: an open header with split-flap counters, the contests as lanes on one
 * season timeline (each a capsule spanning its dates), the chosen contest's prize on an open stage with a medal orbit,
 * and its dates as a week-column pixel calendar beside an inverted itinerary rail with the join action.
 */
type ListFilter = 'all' | 'enrolled';

const RED = 'var(--zenith-red)';
const DAY_MS = 86_400_000;
const FLAP_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DIGIT_CHARSET = '0123456789';
// Each letter spins through random glyphs, then settles left-to-right like a split-flap board.
const SCRAMBLE_SETTLE_MS = 650;
const SCRAMBLE_STAGGER_MS = 40;
const SCRAMBLE_TICK_MS = 60;
const ROW_STAGGER_MS = 160;
const RANGE_STAGGER_MS = 18;
const MAX_COUNTER_DOTS = 16;
const MIN_LANE_WIDTH_PCT = 3;
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL_SIZE = '1.75rem';

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

const longDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthTitleFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthShortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

const statusChipClass: Record<ContestStatus, string> = {
  active: 'bg-success/12 text-success ring-success/30',
  upcoming: 'bg-fg/[0.06] text-fg ring-line-strong',
  completed: 'bg-fg/[0.04] text-fg-muted ring-line',
};

function statusLabel(status: ContestStatus): string {
  switch (status) {
    case 'active':
      return translate('contest.statusActive');
    case 'upcoming':
      return translate('contest.statusUpcoming');
    case 'completed':
      return translate('contest.statusCompleted');
  }
}

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function contestDays(contest: DemoContest): number {
  return Math.round((Date.parse(contest.endsAt) - Date.parse(contest.startsAt)) / DAY_MS);
}

function wholeMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function utcDay(iso: string): number {
  const date = new Date(Date.parse(iso));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

interface WeekGrid {
  weeks: number;
  /** One UTC day per cell, column by column (Sunday-first); null pads before day 1 and after the last day. */
  cells: (number | null)[];
  months: { start: number; column: number }[];
}

// Every calendar month the contest touches, laid out as week columns like a contribution graph.
function buildWeekGrid(startsAt: string, endsAt: string): WeekGrid {
  const first = new Date(Date.parse(startsAt));
  const last = new Date(Date.parse(endsAt));
  const gridStart = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const gridEnd = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0);
  const leading = new Date(gridStart).getUTCDay();
  const dayCount = Math.round((gridEnd - gridStart) / DAY_MS) + 1;
  const weeks = Math.ceil((leading + dayCount) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, index) => {
    const offset = index - leading;
    return offset >= 0 && offset < dayCount ? gridStart + offset * DAY_MS : null;
  });

  const months: WeekGrid['months'] = [];
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth();
  while (year < last.getUTCFullYear() || (year === last.getUTCFullYear() && month <= last.getUTCMonth())) {
    const start = Date.UTC(year, month, 1);
    months.push({ start, column: Math.floor((leading + Math.round((start - gridStart) / DAY_MS)) / 7) });
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return { weeks, cells, months };
}

interface SeasonTick {
  time: number;
  left: number;
}

// A tick at every month start inside the season, plus one at the season start for its partial month.
function buildSeasonTicks(seasonStart: number, seasonEnd: number): SeasonTick[] {
  const span = Math.max(seasonEnd - seasonStart, DAY_MS);
  const startDate = new Date(seasonStart);
  const ticks: SeasonTick[] = [{ time: seasonStart, left: 0 }];
  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth() + 1;
  for (;;) {
    if (month === 12) {
      month = 0;
      year += 1;
    }
    const time = Date.UTC(year, month, 1);
    if (time > seasonEnd) break;
    ticks.push({ time, left: ((time - seasonStart) / span) * 100 });
    month += 1;
  }
  return ticks;
}

function useScramble(text: string, delayMs: number, charset = FLAP_CHARSET): string {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    let frame = 0;
    let startedAt: number | null = null;
    let lastTick = -Infinity;

    function step(now: number) {
      if (prefersReducedMotion()) {
        setShown(text);
        return;
      }
      startedAt ??= now;
      const elapsed = now - startedAt - delayMs;
      const isSettled = elapsed >= SCRAMBLE_SETTLE_MS + text.length * SCRAMBLE_STAGGER_MS;
      if (isSettled) {
        setShown(text);
        return;
      }
      if (now - lastTick >= SCRAMBLE_TICK_MS) {
        lastTick = now;
        setShown(
          text
            .split('')
            .map((char, index) => {
              if (char === ' ' || elapsed >= SCRAMBLE_SETTLE_MS + index * SCRAMBLE_STAGGER_MS) return char;
              return charset[Math.floor(Math.random() * charset.length)];
            })
            .join(''),
        );
      }
      frame = window.requestAnimationFrame(step);
    }

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [text, delayMs, charset]);

  return shown;
}

// Plain readable text that briefly scrambles in, so names keep the board's flip feel.
function ScrambleText({ text, delayMs, className }: { text: string; delayMs: number; className: string }) {
  const shown = useScramble(text, delayMs);
  return (
    <span aria-hidden="true" className={className}>
      {shown}
    </span>
  );
}

function StatusLight({ status }: { status: ContestStatus }) {
  if (status === 'active') {
    return (
      <span aria-hidden="true" className="relative flex size-2 shrink-0">
        <span className="absolute inset-0 animate-ping-soft rounded-[2px] bg-success motion-reduce:hidden" />
        <span className="relative size-2 rounded-[2px] bg-success" />
      </span>
    );
  }
  return <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-[2px]', status === 'upcoming' ? 'border border-current' : 'bg-current opacity-40')} />;
}

/* ───────────── Header: open title, season line, split-flap counters ───────────── */

function FlapCounter({ label, value, total, icon, order, isLive = false }: { label: string; value: number; total: number; icon: IconName; order: number; isLive?: boolean }) {
  const shown = useScramble(String(value).padStart(2, '0'), 200 + order * 140, DIGIT_CHARSET);
  const dotCount = Math.min(total, MAX_COUNTER_DOTS);

  return (
    <div style={stagger(order, 90, 100)} className="zenith-tile flex min-w-0 flex-col gap-2.5">
      <dt className={cx(captionClass, 'flex items-center gap-1.5 text-fg-subtle')}>
        <Icon name={icon} size={12} />
        <span className="truncate">{label}</span>
        {isLive && (
          <span aria-hidden="true" className="relative flex size-2 shrink-0">
            <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[2px] motion-reduce:hidden" />
            <span style={{ background: RED }} className="relative size-2 rounded-[2px]" />
          </span>
        )}
      </dt>
      <dd className="flex gap-1">
        <span className="sr-only">{value}</span>
        {shown.split('').map((char, index) => (
          <span
            key={index}
            aria-hidden="true"
            style={isLive ? { background: RED } : undefined}
            className={cx(
              'relative grid h-14 w-10 place-items-center overflow-hidden rounded-[10px] font-mono text-3xl font-black tabular-nums',
              isLive ? 'text-white' : 'bg-fg text-app',
            )}
          >
            {char}
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
            <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-app" />
            <span className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 rounded-full bg-app" />
          </span>
        ))}
      </dd>
      <span aria-hidden="true" className="flex flex-wrap gap-1">
        {Array.from({ length: dotCount }, (_, dot) => (
          <span
            key={dot}
            style={{ ...stagger(dot, 50, 300 + order * 120), ...(dot < value && isLive ? { background: RED } : {}) }}
            className={cx('zenith-pixel size-1.5 rounded-[2px]', dot < value ? !isLive && 'bg-fg' : 'bg-fg/15')}
          />
        ))}
      </span>
    </div>
  );
}

function SeasonHeader({ contests, enrolledCount }: { contests: DemoContest[]; enrolledCount: number }) {
  const activeCount = contests.filter((contest) => contest.status === 'active').length;
  const upcomingCount = contests.filter((contest) => contest.status === 'upcoming').length;
  const firstStart = Math.min(...contests.map((contest) => Date.parse(contest.startsAt)));
  const lastEnd = Math.max(...contests.map((contest) => Date.parse(contest.endsAt)));
  const seasonRange = translate('contest.seasonRange', {
    from: monthYearFormatter.format(firstStart),
    to: monthYearFormatter.format(lastEnd),
  });
  const timezone = contests[0]?.timezoneLabel;

  return (
    <header className="zenith-tile grid gap-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2 text-fg-subtle')}>
          <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
          {translate('nav.promotion')}
        </p>
        <h1 className="mt-2 text-5xl leading-[0.9] font-black tracking-[-0.05em] text-fg sm:text-6xl">{translate('contest.title')}</h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" size={14} />
            {seasonRange}
          </span>
          {timezone && (
            <>
              <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />
              <span className="inline-flex items-center gap-1.5">
                <Icon name="globe" size={14} />
                {timezone}
              </span>
            </>
          )}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-7 gap-y-5 sm:grid-cols-4">
        <FlapCounter label={translate('contest.available')} value={contests.length} total={contests.length} icon="trophy" order={0} />
        <FlapCounter label={translate('contest.myEnrollments')} value={enrolledCount} total={contests.length} icon="checkCircle" order={1} />
        <FlapCounter label={translate('contest.activeNow')} value={activeCount} total={contests.length} icon="bolt" order={2} isLive />
        <FlapCounter label={translate('contest.upcoming')} value={upcomingCount} total={contests.length} icon="calendar" order={3} />
      </dl>
    </header>
  );
}

/* ───────────── Season timeline: one lane per contest, a capsule across its dates ───────────── */

const laneGridClass = 'lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_9rem]';

function laneBarClass(status: ContestStatus, isSelected: boolean): string {
  if (isSelected) return '';
  if (status === 'active') return 'bg-fg';
  if (status === 'upcoming') return 'border-2 border-dashed border-fg/50';
  return 'bg-fg/25';
}

function ContestLane({ contest, currency, order, isSelected, onSelect, seasonStart, seasonSpan, ticks }: {
  contest: DemoContest;
  currency: string;
  order: number;
  isSelected: boolean;
  onSelect: () => void;
  seasonStart: number;
  seasonSpan: number;
  ticks: SeasonTick[];
}) {
  const startTime = Date.parse(contest.startsAt);
  const endTime = Date.parse(contest.endsAt);
  const left = Math.min(((startTime - seasonStart) / seasonSpan) * 100, 100 - MIN_LANE_WIDTH_PCT);
  const width = Math.max(((endTime - startTime) / seasonSpan) * 100, MIN_LANE_WIDTH_PCT);

  return (
    <li style={stagger(order, 90, 150)} className="zenith-tile">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cx(
          'group relative grid w-full gap-4 overflow-hidden rounded-[24px] px-4 py-4 text-left transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:items-center lg:gap-6',
          laneGridClass,
          isSelected ? 'bg-fg/[0.05] ring-1 ring-line-strong' : 'hover:bg-fg/[0.03]',
        )}
      >
        {isSelected && <span aria-hidden="true" style={{ background: RED }} className="absolute inset-y-4 left-0 w-1 rounded-r-full" />}

        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[11px] font-semibold text-fg-muted">
            <StatusLight status={contest.status} />
            {statusLabel(contest.status)}
            <span className="ml-auto font-mono text-[10px] text-fg-subtle">#{contest.id}</span>
          </span>
          <span className="sr-only">{contest.name}</span>
          <ScrambleText text={contest.name} delayMs={200 + order * ROW_STAGGER_MS} className="mt-1 block truncate text-lg font-black tracking-[-0.02em] text-fg capitalize" />
          <span className="block truncate text-xs text-fg-subtle">{contest.description}</span>
        </span>

        <span className="flex min-w-0 flex-col gap-2">
          <span aria-hidden="true" className="relative block h-8">
            <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-line-strong" />
            {ticks.map((tick) => (
              <span key={tick.time} style={{ left: `${tick.left}%` }} className="absolute inset-y-0 border-l border-dotted border-line" />
            ))}
            <span
              style={{ left: `${left}%`, width: `${width}%`, ...stagger(order, 120, 250), ...(isSelected ? { background: RED } : {}) }}
              className={cx('zenith-reveal absolute top-1/2 h-3 -translate-y-1/2 rounded-full', laneBarClass(contest.status, isSelected))}
            >
              {contest.status === 'active' && (
                <span className="absolute inset-y-0 right-1.5 left-1.5">
                  <span className="zenith-route absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-app motion-reduce:hidden" />
                </span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[11px] text-fg-muted tabular-nums">
            <span className="whitespace-nowrap">
              <span className="sr-only">{translate('contest.starts')} </span>
              {shortDateFormatter.format(startTime)}
            </span>
            <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dashed border-line-strong" />
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-fg">{translate('contest.days', { count: contestDays(contest) })}</span>
            <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dashed border-line-strong" />
            <span className="whitespace-nowrap">
              <span className="sr-only">{translate('contest.ends')} </span>
              {shortDateFormatter.format(endTime)}
            </span>
          </span>
        </span>

        <span className="flex items-center gap-2 border-t border-dashed border-line-strong pt-3 lg:flex-col lg:items-end lg:gap-0.5 lg:border-t-0 lg:pt-0 lg:text-right">
          <span className={cx(captionClass, 'inline-flex items-center gap-1.5 text-fg-subtle')}>
            <Icon name="trophy" size={11} />
            {translate('contest.topPrize')}
          </span>
          <span className="ml-auto font-mono text-lg leading-tight font-black text-fg tabular-nums lg:ml-0">{wholeMoney(contest.topPrize, currency)}</span>
          {contest.topPrizePercent !== undefined && <span className="text-[10px] font-medium text-fg-subtle">({contest.topPrizePercent}%)</span>}
        </span>
      </button>
    </li>
  );
}

function SeasonTimeline({
  contests,
  visible,
  currency,
  enrolledCount,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
}: {
  contests: DemoContest[];
  visible: DemoContest[];
  currency: string;
  enrolledCount: number;
  filter: ListFilter;
  onFilterChange: (next: ListFilter) => void;
  selectedId: string | undefined;
  onSelect: (contest: DemoContest) => void;
}) {
  const filters: { value: ListFilter; label: string; count: number }[] = [
    { value: 'all', label: translate('contest.allContests'), count: contests.length },
    { value: 'enrolled', label: translate('contest.myEnrollments'), count: enrolledCount },
  ];
  const seasonStart = Math.min(...contests.map((contest) => Date.parse(contest.startsAt)));
  const seasonEnd = Math.max(...contests.map((contest) => Date.parse(contest.endsAt)));
  const seasonSpan = Math.max(seasonEnd - seasonStart, DAY_MS);
  const ticks = buildSeasonTicks(seasonStart, seasonEnd);

  return (
    <section style={{ animationDelay: '120ms' }} className="zenith-tile flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={translate('contest.listFilter')} className="relative grid grid-cols-2 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
          <span
            aria-hidden="true"
            style={{ background: RED }}
            className={cx(
              'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none',
              filter === 'enrolled' && 'translate-x-full',
            )}
          />
          {filters.map((item) => {
            const isActive = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onFilterChange(item.value)}
                className={cx(
                  'relative z-10 flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-bold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'text-white' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
                <span className={cx('grid h-5 min-w-5 place-items-center rounded-[6px] px-1 font-mono text-[10px] font-black tabular-nums', isActive ? 'bg-white/20' : 'bg-fg/10 text-fg')}>{item.count}</span>
              </button>
            );
          })}
        </div>
        {visible.length > 0 && (
          <p className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <Icon name="info" size={13} />
            {translate('contest.boardHint')}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[32px] border border-dashed border-line-strong px-6 py-12 text-center">
          <span aria-hidden="true" className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-[3px]" />
            </span>
            <span className="grid size-12 place-items-center rounded-[16px] bg-fg text-app">
              <Icon name="trophy" size={18} />
            </span>
          </span>
          <p className="text-base font-black text-fg">{translate('contest.noEnrollments')}</p>
          <p className="max-w-sm text-sm text-fg-muted">{translate('contest.noEnrollmentsText')}</p>
        </div>
      ) : (
        <div className="rounded-[32px] bg-fg/[0.02] p-2 ring-1 ring-line sm:p-3">
          <div aria-hidden="true" className={cx('hidden gap-6 px-4 pt-1 pb-2 lg:grid', laneGridClass)}>
            <span />
            <span className="relative block h-5">
              {ticks.map((tick) => (
                <span key={tick.time} style={{ left: `${tick.left}%` }} className={cx(captionClass, 'absolute top-0 flex items-center gap-1 whitespace-nowrap text-fg-subtle')}>
                  <span className="h-3 border-l border-line-strong" />
                  {monthShortFormatter.format(tick.time)}
                </span>
              ))}
            </span>
            <span />
          </div>
          <ul className="flex flex-col gap-1">
            {visible.map((contest, index) => (
              <ContestLane
                key={contest.id}
                contest={contest}
                currency={currency}
                order={index}
                isSelected={contest.id === selectedId}
                onSelect={() => onSelect(contest)}
                seasonStart={seasonStart}
                seasonSpan={seasonSpan}
                ticks={ticks}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ───────────── Prize stage: open prize figure, rule keys, medal orbit ───────────── */

function MedalOrbit({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div aria-hidden="true" className="relative mx-auto grid size-56 place-items-center">
      <span className="absolute inset-0 rounded-full border-2 border-dashed border-fg/20" />
      <span className="absolute inset-8 animate-ring-ripple rounded-full ring-2 ring-fg/10 motion-reduce:hidden" />
      {/* Second and third place ride the orbit; their numbers counter-spin so they stay upright. */}
      <span className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
        <span className="absolute top-0 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-app ring-2 ring-fg/25">
          <span className="inline-block animate-rim-spin font-mono text-base font-black text-fg [animation-direction:reverse] [animation-duration:4s] motion-reduce:animate-none">2</span>
        </span>
        <span className="absolute bottom-0 left-1/2 grid size-10 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full bg-app ring-2 ring-fg/20">
          <span className="inline-block animate-rim-spin font-mono text-sm font-black text-fg [animation-direction:reverse] [animation-duration:4s] motion-reduce:animate-none">3</span>
        </span>
        <span style={{ background: RED }} className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px]" />
        <span style={{ background: RED }} className="absolute top-1/2 right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-[2px]" />
      </span>
      <span className={cx('relative grid size-28 animate-float place-items-center rounded-full motion-reduce:animate-none', isCompleted ? 'bg-fg/40 text-app' : 'bg-fg text-app')}>
        <Icon name="trophy" size={38} strokeWidth={1.6} />
        <span style={{ background: RED }} className="absolute -top-1 -right-1 grid size-8 place-items-center rounded-full font-mono text-xs font-black text-white ring-4 ring-app">
          1
        </span>
      </span>
    </div>
  );
}

function PrizeStage({ contest, currency }: { contest: DemoContest; currency: string }) {
  const prize = useAnimatedNumber(contest.topPrize, 1100);

  const rules: { label: string; value: string; icon: IconName; highlight: boolean }[] = [
    { label: translate('contest.startingBalance'), value: wholeMoney(contest.startingBalance, currency), icon: 'wallet', highlight: false },
    { label: translate('contest.maxLeverage'), value: `1:${contest.maxLeverage}`, icon: 'bolt', highlight: false },
    {
      label: translate('contest.entryFee'),
      value: contest.entryFee > 0 ? formatMoney(contest.entryFee, currency) : translate('contest.free'),
      icon: 'bank',
      highlight: contest.entryFee === 0,
    },
  ];

  return (
    <section className="zenith-tile relative grid gap-8 overflow-hidden rounded-[36px] p-6 ring-1 ring-line sm:p-8 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:14px_14px] text-fg/[0.12] [mask-image:linear-gradient(270deg,#000,transparent_65%)]"
      />

      <div className="relative flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', statusChipClass[contest.status])}>
            <StatusLight status={contest.status} />
            {statusLabel(contest.status)}
          </span>
          <span className="rounded-full bg-fg/[0.05] px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.14em] text-fg-muted ring-1 ring-line">#{contest.id}</span>
        </div>

        <div className="min-w-0">
          <h2 className="text-3xl leading-tight font-black tracking-[-0.03em] text-fg capitalize sm:text-4xl">{contest.name}</h2>
          <p className="mt-1 text-sm text-fg-muted">{contest.description}</p>
        </div>

        <div>
          <p className={cx(captionClass, 'flex items-center gap-2 text-fg-subtle')}>
            <span aria-hidden="true" style={{ background: RED }} className="h-0.5 w-6 rounded-full" />
            {translate('contest.topPrize')}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="relative inline-block overflow-hidden font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
              {formatMoney(prize, currency)}
              <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-app/50 to-transparent" />
            </span>
            {contest.topPrizePercent !== undefined && (
              <span style={{ background: RED }} className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                ({contest.topPrizePercent}%)
              </span>
            )}
          </p>
        </div>

        <dl className="flex flex-wrap gap-2">
          {rules.map((rule, index) => (
            <div key={rule.label} style={stagger(index, 90, 200)} className="zenith-tile flex h-14 items-center gap-3 rounded-full bg-fg/[0.03] py-1 pr-5 pl-1 ring-1 ring-line">
              <span aria-hidden="true" className={cx('grid size-11 shrink-0 place-items-center rounded-full', rule.highlight ? 'bg-success/15 text-success' : 'bg-fg text-app')}>
                <Icon name={rule.icon} size={15} />
              </span>
              <span className="min-w-0">
                <dt className="text-[10.5px] font-semibold text-fg-subtle">{rule.label}</dt>
                <dd className={cx('font-mono text-base leading-tight font-black tabular-nums', rule.highlight ? 'text-success' : 'text-fg')}>{rule.value}</dd>
              </span>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative py-6">
        <MedalOrbit isCompleted={contest.status === 'completed'} />
      </div>
    </section>
  );
}

/* ───────────── Details: week-column pixel calendar + inverted itinerary rail ───────────── */

type DayKind = 'edge' | 'day' | 'off';

function dayClass(kind: DayKind, status: ContestStatus): string {
  if (kind === 'edge') return status === 'completed' ? 'bg-fg/40 text-app font-black' : 'text-white font-black';
  if (kind === 'off') return 'bg-fg/[0.03] text-fg-subtle';
  if (status === 'active') return 'bg-fg/20 text-fg';
  if (status === 'upcoming') return 'border border-dashed border-fg/45 text-fg';
  return 'bg-fg/10 text-fg-muted';
}

function dayStyle(kind: DayKind, status: ContestStatus): CSSProperties | undefined {
  return kind === 'edge' && status !== 'completed' ? { background: RED } : undefined;
}

function WeekCalendar({ contest }: { contest: DemoContest }) {
  const grid = buildWeekGrid(contest.startsAt, contest.endsAt);
  const rangeStart = utcDay(contest.startsAt);
  const rangeEnd = utcDay(contest.endsAt);
  const columns = `repeat(${grid.weeks}, ${CELL_SIZE})`;

  return (
    <div aria-hidden="true" className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="grid w-fit grid-cols-[auto_auto] gap-x-2 gap-y-2">
        <span />
        <div className="grid gap-1" style={{ gridTemplateColumns: columns }}>
          {grid.months.map((month) => (
            <span key={month.start} style={{ gridColumn: `${month.column + 1} / span 4` }} className="text-xs font-bold whitespace-nowrap text-fg">
              {monthTitleFormatter.format(month.start)}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-7 gap-1">
          {WEEKDAY_LETTERS.map((letter, index) => (
            <span key={index} className="grid size-7 place-items-center text-[10px] font-semibold text-fg-subtle">
              {letter}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: CELL_SIZE }}>
          {grid.cells.map((time, index) => {
            if (time === null) return <span key={`pad-${index}`} className="size-7" />;
            const isInRange = time >= rangeStart && time <= rangeEnd;
            const isEdge = time === rangeStart || time === rangeEnd;
            let kind: DayKind = 'off';
            if (isEdge) kind = 'edge';
            else if (isInRange) kind = 'day';
            const offset = Math.round((time - rangeStart) / DAY_MS);
            return (
              <span
                key={time}
                style={{ ...(isInRange ? { animationDelay: `${offset * RANGE_STAGGER_MS}ms` } : {}), ...dayStyle(kind, contest.status) }}
                className={cx('grid size-7 place-items-center rounded-[8px] font-mono text-[10px] tabular-nums', isInRange && 'zenith-pixel', dayClass(kind, contest.status))}
              >
                {new Date(time).getUTCDate()}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContestDetails({ contest, isEnrolled }: { contest: DemoContest; isEnrolled: boolean }) {
  const days = contestDays(contest);

  const itinerary: { icon: IconName; label: string; value: string }[] = [
    { icon: 'calendar', label: translate('contest.starts'), value: longDateFormatter.format(Date.parse(contest.startsAt)) },
    { icon: 'calendar', label: translate('contest.ends'), value: longDateFormatter.format(Date.parse(contest.endsAt)) },
    { icon: 'globe', label: translate('contest.timezone'), value: contest.timezoneLabel },
  ];

  let action: ReactNode;
  if (isEnrolled) {
    action = (
      <button type="button" disabled className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-success/15 text-sm font-bold text-success ring-1 ring-success/40">
        <Icon name="checkCircle" size={16} />
        {translate('contest.enrolled')}
      </button>
    );
  } else if (!contest.registrationOpen) {
    action = (
      <Link
        href={`/promotion/demo-contest/${contest.id}`}
        className="group/closed inline-flex h-12 w-full items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-bold text-app/70 ring-1 ring-app/20 transition-[color,box-shadow] duration-300 hover:text-app hover:ring-app/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Icon name="lock" size={15} className="transition-transform duration-300 group-hover/closed:-rotate-12" />
        <span className="flex-1">{translate('contest.registrationClosed')}</span>
        <span className="grid size-9 place-items-center rounded-full bg-app/10">
          <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover/closed:translate-x-0.5" />
        </span>
      </Link>
    );
  } else {
    action = (
      <Link
        href={`/promotion/demo-contest/${contest.id}`}
        style={{ background: RED }}
        className="group/enroll relative inline-flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-full py-1.5 pr-1.5 pl-5 text-sm font-bold text-white transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/30" />
        <Icon name="user" size={15} className="relative transition-transform duration-300 group-hover/enroll:scale-110" />
        <span className="relative flex-1">{translate('contest.join')}</span>
        <span className="relative grid size-9 place-items-center rounded-full bg-white/20">
          <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover/enroll:translate-x-0.5" />
        </span>
      </Link>
    );
  }

  return (
    <section style={{ animationDelay: '80ms' }} className="zenith-tile grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-5 rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={cx(captionClass, 'text-fg-subtle')}>{translate('contest.details')}</p>
            <h2 className="mt-0.5 truncate text-2xl font-black tracking-[-0.03em] text-fg capitalize">{contest.name}</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3.5 pl-1 text-sm font-bold text-app tabular-nums">
            <span style={{ background: RED }} className="grid size-7 place-items-center rounded-full text-white">
              <Icon name="calendar" size={13} />
            </span>
            {translate('contest.days', { count: days })}
          </span>
        </header>

        <div className="flex items-center gap-3">
          <p className={cx(captionClass, 'shrink-0 text-fg-subtle')}>{translate('contest.calendar')}</p>
          <span aria-hidden="true" className="flex-1 border-t border-dashed border-line-strong" />
        </div>
        <WeekCalendar contest={contest} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={dayStyle('edge', contest.status)} className={cx('size-3.5 rounded-[4px]', dayClass('edge', contest.status))} />
            {translate('contest.legendEdge')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3.5 rounded-[4px]', dayClass('day', contest.status))} />
            {translate('contest.legendDay')}
          </span>
          <span className="text-fg-subtle">{translate('contest.calendarHint')}</span>
        </div>
      </div>

      <aside className="relative flex flex-col gap-5 overflow-hidden rounded-[32px] bg-fg p-5 text-app sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:12px_12px] text-app/[0.12] [mask-image:linear-gradient(160deg,#000,transparent_60%)]"
        />
        <dl className="relative flex items-start gap-3">
          <span aria-hidden="true" style={{ background: RED }} className="grid size-11 shrink-0 place-items-center rounded-full text-white">
            <Icon name="trendUp" size={16} />
          </span>
          <div className="min-w-0">
            <dt className={cx(captionClass, 'text-app/55')}>{translate('contest.winCriteria')}</dt>
            <dd className="mt-1 text-lg leading-snug font-black">{contest.winCriteria}</dd>
          </div>
        </dl>

        <dl className="relative flex flex-col gap-4 border-t border-dashed border-app/20 pt-5">
          <span aria-hidden="true" className="absolute top-7 bottom-3 left-[5px] border-l-2 border-dashed border-app/25" />
          {itinerary.map((item, index) => (
            <div key={item.label} style={stagger(index, 90, 200)} className="zenith-tile relative flex gap-3">
              <span
                aria-hidden="true"
                style={index === 0 ? { background: RED } : undefined}
                className={cx('relative mt-1 size-3 shrink-0 rounded-[3px] ring-4 ring-fg', index === 0 ? 'zenith-blink' : 'bg-app')}
              />
              <div className="min-w-0">
                <dt className={cx(captionClass, 'flex items-center gap-1.5 text-app/55')}>
                  <Icon name={item.icon} size={11} />
                  {item.label}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-bold">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="relative mt-auto pt-2">{action}</div>
      </aside>
    </section>
  );
}

export default function DemoContestPage() {
  const { data, isLoading } = useDemoContest();
  const [filter, setFilter] = useState<ListFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const joinedIds = useEnrolledContestIds();

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Skeleton className="h-28 w-80 rounded-[28px]" />
          <Skeleton className="h-24 w-96 rounded-[28px]" />
        </div>
        <Skeleton className="h-12 w-72 rounded-full" />
        <Skeleton className="h-72 rounded-[32px]" />
        <Skeleton className="h-80 rounded-[36px]" />
      </div>
    );
  }

  if (data.contests.length === 0) return null;

  const enrolledIds = [...data.enrolledIds, ...joinedIds];
  const canEnroll = (contest: DemoContest) => contest.registrationOpen && !enrolledIds.includes(contest.id);
  // Contests the client can still enroll in lead the list; closed ones keep their original order after them.
  const orderedContests = [...data.contests.filter(canEnroll), ...data.contests.filter((contest) => !canEnroll(contest))];
  const enrolledContests = orderedContests.filter((contest) => enrolledIds.includes(contest.id));
  const visible = filter === 'all' ? orderedContests : enrolledContests;
  // Falls back to the first visible contest when nothing is chosen or the choice is filtered out.
  const selected = visible.find((contest) => contest.id === selectedId) ?? visible[0];

  return (
    <div className="flex flex-col gap-7">
      <SeasonHeader contests={data.contests} enrolledCount={enrolledContests.length} />
      <SeasonTimeline
        contests={data.contests}
        visible={visible}
        currency={data.currency}
        enrolledCount={enrolledContests.length}
        filter={filter}
        onFilterChange={setFilter}
        selectedId={selected?.id}
        onSelect={(contest) => setSelectedId(contest.id)}
      />
      {selected && (
        <>
          <PrizeStage key={`prize-${selected.id}`} contest={selected} currency={data.currency} />
          <ContestDetails key={`details-${selected.id}`} contest={selected} isEnrolled={enrolledIds.includes(selected.id)} />
        </>
      )}
    </div>
  );
}
