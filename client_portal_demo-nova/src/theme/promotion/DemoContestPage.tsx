'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { Badge, Skeleton, type Tone } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { useEnrolledContestIds } from './contestEnrollment';
import { prefersReducedMotion, useAnimatedNumber } from './ScratchExperience';

type ListFilter = 'all' | 'enrolled';

const DAY_MS = 86_400_000;
const FLAP_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Each letter spins through random glyphs, then settles left-to-right like a split-flap board.
const SCRAMBLE_SETTLE_MS = 650;
const SCRAMBLE_STAGGER_MS = 40;
const SCRAMBLE_TICK_MS = 60;
const ROW_STAGGER_MS = 160;
const RANGE_STAGGER_MS = 18;
const MAX_COUNTER_DOTS = 16;
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

const longDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthTitleFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const statusTone: Record<ContestStatus, Tone> = { active: 'success', upcoming: 'info', completed: 'neutral' };

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

function contestDays(contest: DemoContest): number {
  return Math.round((Date.parse(contest.endsAt) - Date.parse(contest.startsAt)) / DAY_MS);
}

function wholeMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

interface CalendarMonth {
  start: number;
  /** Day of month per cell; null pads the first week so day 1 lands on its weekday column. */
  cells: (number | null)[];
}

// Every calendar month the contest touches, in UTC, Sunday-first.
function buildCalendarMonths(startsAt: string, endsAt: string): CalendarMonth[] {
  const first = new Date(Date.parse(startsAt));
  const last = new Date(Date.parse(endsAt));
  const months: CalendarMonth[] = [];
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth();
  while (year < last.getUTCFullYear() || (year === last.getUTCFullYear() && month <= last.getUTCMonth())) {
    const start = Date.UTC(year, month, 1);
    const leading = new Date(start).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: (number | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    months.push({ start, cells });
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

function utcDay(iso: string): number {
  const date = new Date(Date.parse(iso));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function useScramble(text: string, delayMs: number): string {
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
              return FLAP_CHARSET[Math.floor(Math.random() * FLAP_CHARSET.length)];
            })
            .join(''),
        );
      }
      frame = window.requestAnimationFrame(step);
    }

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [text, delayMs]);

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
        <span className="absolute inset-0 animate-ping rounded-full bg-success motion-reduce:animate-none" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
    );
  }
  return <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', status === 'upcoming' ? 'border border-current' : 'bg-current opacity-40')} />;
}

function SeasonCounter({ label, value, total, icon, isLive = false }: { label: string; value: number; total: number; icon: IconName; isLive?: boolean }) {
  const shown = useAnimatedNumber(value, 900);
  const dotCount = Math.min(total, MAX_COUNTER_DOTS);

  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
      <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15">
        <Icon name={icon} size={17} />
        {isLive && (
          <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success motion-reduce:animate-none" />
            <span className="relative size-2.5 rounded-full bg-success ring-2 ring-[#0a1220]" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <dt className={cx(captionClass, 'truncate text-white/55')}>{label}</dt>
        <dd className="font-mono text-2xl leading-none font-black text-white tabular-nums">
          <span aria-hidden="true">{Math.round(shown)}</span>
          <span className="sr-only">{value}</span>
        </dd>
        <span aria-hidden="true" className="flex flex-wrap gap-1">
          {Array.from({ length: dotCount }, (_, dot) => (
            <span key={dot} style={{ animationDelay: `${dot * 60}ms` }} className={cx('size-1.5 animate-dot-pop rounded-full motion-reduce:animate-none', dot < value ? 'bg-white' : 'bg-white/15')} />
          ))}
        </span>
      </div>
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
    <section className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className="nova-gloss grid size-10 place-items-center rounded-full text-fg">
            <Icon name="trophy" size={17} />
          </span>
        </span>
        <div className="min-w-0">
          <p className={cx(captionClass, 'text-fg-subtle')}>{translate('nav.promotion')}</p>
          <h1 className="truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('contest.title')}</h1>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[30px] bg-[#0a1220] text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(90deg,transparent,#000_60%)]" />
        <div className="relative flex flex-wrap items-center gap-2 px-5 pt-4 text-xs text-white/75">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] py-1 pr-3 pl-1 ring-1 ring-white/10">
            <span className="grid size-6 place-items-center rounded-full bg-white/10">
              <Icon name="calendar" size={12} />
            </span>
            {seasonRange}
          </span>
          {timezone && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] py-1 pr-3 pl-1 ring-1 ring-white/10">
              <span className="grid size-6 place-items-center rounded-full bg-white/10">
                <Icon name="globe" size={12} />
              </span>
              {timezone}
            </span>
          )}
        </div>
        <dl className="relative grid grid-cols-1 min-[460px]:grid-cols-2 lg:grid-cols-4 lg:[&>div+div]:border-l lg:[&>div+div]:border-dotted lg:[&>div+div]:border-white/15">
          <SeasonCounter label={translate('contest.available')} value={contests.length} total={contests.length} icon="trophy" />
          <SeasonCounter label={translate('contest.myEnrollments')} value={enrolledCount} total={contests.length} icon="checkCircle" />
          <SeasonCounter label={translate('contest.activeNow')} value={activeCount} total={contests.length} icon="bolt" isLive />
          <SeasonCounter label={translate('contest.upcoming')} value={upcomingCount} total={contests.length} icon="calendar" />
        </dl>
      </div>
    </section>
  );
}

function ContestChip({
  contest,
  currency,
  order,
  isSelected,
  onSelect,
}: {
  contest: DemoContest;
  currency: string;
  order: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <li style={{ animationDelay: `${order * 90}ms` }} className="flex w-[17.5rem] shrink-0 animate-feed-in snap-start motion-reduce:animate-none">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cx(
          'flex w-full flex-col gap-3 rounded-[26px] p-4 text-left transition-[background-color,color,box-shadow,translate] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          isSelected ? 'bg-fg text-app shadow-[0_20px_40px_-26px_rgb(0_0_0/0.9)]' : 'text-fg ring-1 ring-line hover:-translate-y-0.5 hover:ring-line-strong',
        )}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold">
          <StatusLight status={contest.status} />
          {statusLabel(contest.status)}
          <span className="ml-auto font-mono text-[10px] opacity-55">#{contest.id}</span>
        </span>
        <span className="min-w-0">
          <span className="sr-only">{contest.name}</span>
          <ScrambleText text={contest.name} delayMs={200 + order * ROW_STAGGER_MS} className="block truncate text-base font-bold tracking-tight capitalize" />
          <span className="mt-0.5 block truncate text-xs opacity-65">{contest.description}</span>
        </span>
        <span className="flex items-center gap-2 text-[11px] tabular-nums opacity-80">
          <span className="whitespace-nowrap">
            <span className="sr-only">{translate('contest.starts')} </span>
            {shortDateFormatter.format(Date.parse(contest.startsAt))}
          </span>
          <span aria-hidden="true" className="min-w-3 flex-1 border-t-2 border-dotted border-current opacity-30" />
          <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap', isSelected ? 'bg-app/15' : 'bg-fg/[0.06]')}>{translate('contest.days', { count: contestDays(contest) })}</span>
          <span aria-hidden="true" className="min-w-3 flex-1 border-t-2 border-dotted border-current opacity-30" />
          <span className="whitespace-nowrap">
            <span className="sr-only">{translate('contest.ends')} </span>
            {shortDateFormatter.format(Date.parse(contest.endsAt))}
          </span>
        </span>
        <span className={cx('mt-auto flex items-center gap-2.5 border-t border-dotted pt-3', isSelected ? 'border-app/25' : 'border-line-strong')}>
          <span aria-hidden="true" className={cx('grid size-8 shrink-0 place-items-center rounded-full', isSelected ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
            <Icon name="trophy" size={13} />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase opacity-65">{translate('contest.topPrize')}</span>
          <span className="ml-auto text-right">
            <span className="block font-mono text-sm font-black tabular-nums">{wholeMoney(contest.topPrize, currency)}</span>
            {contest.topPrizePercent !== undefined && <span className="block text-[10px] font-medium opacity-65">({contest.topPrizePercent}%)</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function ContestPicker({
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

  return (
    <section className="flex min-w-0 animate-rise flex-col gap-4 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={translate('contest.listFilter')} className="relative grid grid-cols-2 rounded-full p-1 ring-1 ring-line">
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-fg transition-transform duration-500 ease-out motion-reduce:transition-none',
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
                  'relative z-10 flex h-9 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
                <span className={cx('grid size-5 place-items-center rounded-full font-mono text-[10px] font-black tabular-nums', isActive ? 'bg-app text-fg' : 'bg-fg/10 text-fg')}>{item.count}</span>
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
        <div className="flex flex-col items-center gap-3 rounded-[26px] border-2 border-dotted border-line-strong px-6 py-10 text-center">
          <span aria-hidden="true" className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 21 }, (_, dot) => (
              <span key={dot} style={{ animationDelay: `${dot * 35}ms` }} className={cx('size-2 animate-dot-pop rounded-full motion-reduce:animate-none', dot === 10 ? 'bg-fg/60' : 'bg-fg/12')} />
            ))}
          </span>
          <p className="text-sm font-bold text-fg">{translate('contest.noEnrollments')}</p>
          <p className="text-xs text-fg-muted">{translate('contest.noEnrollmentsText')}</p>
        </div>
      ) : (
        <ul className="relative -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-3">
          {visible.map((contest, index) => (
            <ContestChip key={contest.id} contest={contest} currency={currency} order={index} isSelected={contest.id === selectedId} onSelect={() => onSelect(contest)} />
          ))}
        </ul>
      )}
    </section>
  );
}

// Left-to-right reads 2-1-3 like a real podium; the winner's bead is the largest and carries the trophy.
const MEDAL_BEADS = [
  { place: 2, sizeClass: 'size-16', delayMs: 140 },
  { place: 1, sizeClass: 'size-24', delayMs: 0 },
  { place: 3, sizeClass: 'size-14', delayMs: 280 },
];

function PrizeHero({ contest, currency }: { contest: DemoContest; currency: string }) {
  const prize = useAnimatedNumber(contest.topPrize, 1100);
  const isCompleted = contest.status === 'completed';

  const rules = [
    { label: translate('contest.startingBalance'), value: wholeMoney(contest.startingBalance, currency), highlight: false },
    { label: translate('contest.maxLeverage'), value: `1:${contest.maxLeverage}`, highlight: false },
    {
      label: translate('contest.entryFee'),
      value: contest.entryFee > 0 ? formatMoney(contest.entryFee, currency) : translate('contest.free'),
      highlight: contest.entryFee === 0,
    },
  ];

  return (
    <div className="animate-rise motion-reduce:animate-none">
      <FrostCard>
        <div className="grid gap-6 text-[#0a1220] sm:p-2 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[contest.status]} dot>
                {statusLabel(contest.status)}
              </Badge>
              <span className={cx('rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.14em]', frostChipClass)}>#{contest.id}</span>
            </div>

            <div className="min-w-0">
              <h2 className="text-3xl font-black tracking-[-0.03em] capitalize sm:text-4xl">{contest.name}</h2>
              <p className="mt-1 text-sm text-[#3b4658]">{contest.description}</p>
            </div>

            <div>
              <p className={cx(captionClass, 'text-[#3b4658]')}>{translate('contest.topPrize')}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-5xl font-black tracking-tight tabular-nums sm:text-6xl">{formatMoney(prize, currency)}</span>
                {contest.topPrizePercent !== undefined && <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums', frostChipClass)}>({contest.topPrizePercent}%)</span>}
              </p>
            </div>

            <dl className="grid gap-2 sm:grid-cols-3">
              {rules.map((rule) => (
                <div key={rule.label} className={cx('flex flex-col gap-1 rounded-[18px] px-3.5 py-2.5', frostChipClass)}>
                  <dt className="text-[10.5px] font-semibold text-[#3b4658]">{rule.label}</dt>
                  <dd className={cx('font-mono text-base font-black tabular-nums', rule.highlight && 'text-[#0f8a4f]')}>{rule.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div aria-hidden="true" className="relative flex items-end justify-center gap-4 pt-6 pb-2">
            <span className="absolute inset-x-4 bottom-[2.1rem] border-t-2 border-dotted border-[#0a1220]/25" />
            {MEDAL_BEADS.map((bead) => {
              const isWinner = bead.place === 1;
              return (
                <div key={bead.place} style={{ animationDelay: `${bead.delayMs}ms` }} className="relative flex animate-dot-pop flex-col items-center gap-2 motion-reduce:animate-none">
                  <span className={cx('relative grid place-items-center', bead.sizeClass, isWinner && 'animate-float motion-reduce:animate-none')}>
                    {isWinner && <span className="absolute -inset-2 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/35 motion-reduce:animate-none" />}
                    <span
                      className={cx(
                        'grid size-full place-items-center rounded-full shadow-[0_14px_26px_-14px_rgb(10_18_32/0.9)]',
                        isWinner ? (isCompleted ? 'bg-[#0a1220]/40 text-white' : 'bg-[#0a1220] text-white') : 'bg-white text-[#0a1220] ring-1 ring-[#0a1220]/15',
                      )}
                    >
                      {isWinner ? <Icon name="trophy" size={30} strokeWidth={1.6} /> : <span className="font-mono text-lg font-black">{bead.place}</span>}
                    </span>
                  </span>
                  <span className={cx('grid size-6 place-items-center rounded-full font-mono text-[11px] font-black', isWinner ? 'bg-[#0a1220] text-white' : frostChipClass)}>{bead.place}</span>
                </div>
              );
            })}
          </div>
        </div>
      </FrostCard>
    </div>
  );
}

const calendarDayClass: Record<ContestStatus, string> = {
  active: 'bg-fg/15 text-fg',
  upcoming: 'bg-fg/[0.07] text-fg',
  completed: 'bg-fg/10 text-fg-muted',
};
const calendarEdgeClass: Record<ContestStatus, string> = {
  active: 'bg-fg text-app font-black',
  upcoming: 'text-fg font-black ring-2 ring-fg',
  completed: 'bg-fg/40 text-app font-black',
};

/** One month as a dot-matrix calendar: contest days fill in, start/end days are solid beads. */
function DotMonth({ month, rangeStart, rangeEnd, status }: { month: CalendarMonth; rangeStart: number; rangeEnd: number; status: ContestStatus }) {
  const monthDate = new Date(month.start);
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-bold text-fg">{monthTitleFormatter.format(month.start)}</p>
      <div className="grid w-fit grid-cols-7 gap-1.5">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={`weekday-${index}`} className="grid size-7 place-items-center text-[10px] font-semibold text-fg-subtle">
            {letter}
          </span>
        ))}
        {month.cells.map((day, index) => {
          if (day === null) return <span key={`pad-${index}`} className="size-7" />;
          const time = Date.UTC(year, monthIndex, day);
          const isInRange = time >= rangeStart && time <= rangeEnd;
          const isEdge = time === rangeStart || time === rangeEnd;
          const offset = Math.round((time - rangeStart) / DAY_MS);
          let dayClass = 'text-fg-subtle';
          if (isEdge) dayClass = calendarEdgeClass[status];
          else if (isInRange) dayClass = calendarDayClass[status];
          return (
            <span
              key={day}
              style={isInRange ? { animationDelay: `${offset * RANGE_STAGGER_MS}ms` } : undefined}
              className={cx('grid size-7 place-items-center rounded-full font-mono text-[10px] tabular-nums', isInRange && 'animate-dot-pop motion-reduce:animate-none', dayClass)}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ContestDetails({ contest, isEnrolled }: { contest: DemoContest; isEnrolled: boolean }) {
  const days = contestDays(contest);
  const rangeStart = utcDay(contest.startsAt);
  const rangeEnd = utcDay(contest.endsAt);
  const months = buildCalendarMonths(contest.startsAt, contest.endsAt);

  const itinerary: { icon: IconName; label: string; value: string }[] = [
    { icon: 'calendar', label: translate('contest.starts'), value: longDateFormatter.format(Date.parse(contest.startsAt)) },
    { icon: 'calendar', label: translate('contest.ends'), value: longDateFormatter.format(Date.parse(contest.endsAt)) },
    { icon: 'globe', label: translate('contest.timezone'), value: contest.timezoneLabel },
  ];

  let action: ReactNode;
  if (isEnrolled) {
    action = (
      <button type="button" disabled className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-success/10 text-sm font-semibold text-success ring-1 ring-success/35">
        <Icon name="checkCircle" size={16} />
        {translate('contest.enrolled')}
      </button>
    );
  } else if (!contest.registrationOpen) {
    action = (
      <Link
        href={`/promotion/demo-contest/${contest.id}`}
        className="group/closed inline-flex h-12 w-full items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] duration-300 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="lock" size={15} className="transition-transform duration-300 group-hover/closed:-rotate-12" />
        <span className="flex-1">{translate('contest.registrationClosed')}</span>
        <span className="grid size-9 place-items-center rounded-full bg-fg/[0.06]">
          <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover/closed:translate-x-0.5" />
        </span>
      </Link>
    );
  } else {
    action = (
      <Link
        href={`/promotion/demo-contest/${contest.id}`}
        className="group/enroll relative inline-flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-full bg-fg py-1.5 pr-1.5 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/enroll:translate-x-full motion-reduce:hidden" />
        <Icon name="user" size={15} className="relative transition-transform duration-300 group-hover/enroll:scale-110" />
        <span className="relative flex-1">{translate('contest.join')}</span>
        <span className="relative grid size-9 place-items-center rounded-full bg-app text-fg">
          <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover/enroll:translate-x-0.5" />
        </span>
      </Link>
    );
  }

  return (
    <section className="orbit-card nova-edge-light grid animate-rise gap-6 p-5 motion-reduce:animate-none sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={cx(captionClass, 'text-fg-subtle')}>{translate('contest.details')}</p>
            <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-fg capitalize">{contest.name}</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3.5 pl-1 text-sm font-bold text-app tabular-nums">
            <span className="grid size-7 place-items-center rounded-full bg-app text-fg">
              <Icon name="calendar" size={13} />
            </span>
            {translate('contest.days', { count: days })}
          </span>
        </header>

        <div className="flex items-center gap-3">
          <p className={cx(captionClass, 'shrink-0 text-fg-subtle')}>{translate('contest.calendar')}</p>
          <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
        </div>
        <div aria-hidden="true" className="flex flex-wrap gap-x-10 gap-y-6">
          {months.map((month) => (
            <DotMonth key={month.start} month={month} rangeStart={rangeStart} rangeEnd={rangeEnd} status={contest.status} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3.5 rounded-full', calendarEdgeClass[contest.status])} />
            {translate('contest.legendEdge')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('size-3.5 rounded-full', calendarDayClass[contest.status])} />
            {translate('contest.legendDay')}
          </span>
          <span className="text-fg-subtle">{translate('contest.calendarHint')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-dotted border-line-strong pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div className="relative overflow-hidden rounded-[24px] bg-[#0a1220] p-4 text-white ring-1 ring-white/10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(135deg,transparent_30%,#000)]" />
          <dl className="relative flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#0a1220]">
              <Icon name="trendUp" size={16} />
            </span>
            <div className="min-w-0">
              <dt className={cx(captionClass, 'text-white/55')}>{translate('contest.winCriteria')}</dt>
              <dd className="mt-0.5 text-base font-bold">{contest.winCriteria}</dd>
            </div>
          </dl>
        </div>

        <dl className="flex flex-col gap-3">
          {itinerary.map((item) => (
            <div key={item.label} className="flex items-end gap-2">
              <dt className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                <span aria-hidden="true" className="nova-gloss grid size-7 place-items-center rounded-full text-fg">
                  <Icon name={item.icon} size={12} />
                </span>
                {item.label}
              </dt>
              <span aria-hidden="true" className="mb-1.5 min-w-4 flex-1 border-b border-dotted border-line-strong" />
              <dd className="min-w-0 truncate pb-0.5 text-right text-sm font-bold text-fg">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto pt-2">{action}</div>
      </div>
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
        <Skeleton className="h-14 w-72 rounded-full" />
        <Skeleton className="h-36 rounded-[30px]" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-48 w-[17.5rem] shrink-0 rounded-[26px]" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-[28px]" />
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
    <div className="flex flex-col gap-6">
      <SeasonHeader contests={data.contests} enrolledCount={enrolledContests.length} />
      <ContestPicker
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
          <PrizeHero key={`hero-${selected.id}`} contest={selected} currency={data.currency} />
          <ContestDetails key={`details-${selected.id}`} contest={selected} isEnrolled={enrolledIds.includes(selected.id)} />
        </>
      )}
    </div>
  );
}
