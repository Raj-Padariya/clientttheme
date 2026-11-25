'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Badge, Skeleton, type Tone } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { useEnrolledContestIds } from './contestEnrollment';
import { prefersReducedMotion, useAnimatedNumber } from './ScratchExperience';

type ListFilter = 'all' | 'enrolled';

const DAY_MS = 86_400_000;
const FLAP_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Each tile spins through random glyphs, then settles left-to-right like a split-flap board.
const SCRAMBLE_SETTLE_MS = 650;
const SCRAMBLE_STAGGER_MS = 40;
const SCRAMBLE_TICK_MS = 60;
const ROW_STAGGER_MS = 160;
const RANGE_STAGGER_MS = 12;

const captionClass = 'text-[10.5px] tracking-[0.14em] uppercase';

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

// Plain readable text that briefly scrambles in, so names keep the board's flip feel without tiles.
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
        <span className="absolute inset-0 rounded-full bg-success animate-ping motion-reduce:animate-none" />
        <span className="relative size-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx('size-2 shrink-0 rounded-full', status === 'upcoming' ? 'border border-primary' : 'bg-fg/25')}
    />
  );
}

type MeterTone = 'primary' | 'neutral' | 'success' | 'upcoming';
const meterTone: Record<MeterTone, { stroke: string; text: string; chip: string }> = {
  primary: { stroke: 'stroke-primary', text: 'text-primary', chip: 'border-primary/40 bg-primary/15 text-primary' },
  neutral: { stroke: 'stroke-fg/60', text: 'text-fg', chip: 'border-line-strong bg-fg/[0.05] text-fg-muted' },
  success: { stroke: 'stroke-success', text: 'text-success', chip: 'border-success/40 bg-success/12 text-success' },
  upcoming: { stroke: 'stroke-primary/60', text: 'text-fg', chip: 'border-dashed border-primary/50 text-primary' },
};

/** A count shown as a ring filled by its share of all contests; the number counts up on mount. */
function RingMeter({ label, value, total, icon, tone, isLive = false }: { label: string; value: number; total: number; icon: IconName; tone: MeterTone; isLive?: boolean }) {
  const shown = useAnimatedNumber(value, 900);
  const share = total > 0 ? Math.min(1, shown / total) : 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-fg/[0.02] p-3">
      <span className="relative grid size-16 shrink-0 place-items-center">
        <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
          <circle cx="32" cy="32" r="27" fill="none" strokeWidth="4" strokeDasharray={tone === 'upcoming' ? '3 4' : undefined} className="stroke-fg/[0.08]" />
          <circle cx="32" cy="32" r="27" fill="none" strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={`${share.toFixed(3)} 1`} className={meterTone[tone].stroke} />
        </svg>
        <span className={cx('relative font-mono text-xl font-semibold tabular-nums', meterTone[tone].text)}>{Math.round(shown)}</span>
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <dt className={cx(captionClass, 'leading-snug text-fg-muted')}>{label}</dt>
        <dd className="sr-only">{value}</dd>
        <span aria-hidden="true" className={cx('relative grid size-7 place-items-center rounded-lg border', meterTone[tone].chip)}>
          <Icon name={icon} size={13} />
          {isLive && (
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inset-0 rounded-full bg-success animate-ping motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
          )}
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
    <section className="orbit-card relative isolate animate-rise overflow-hidden text-fg motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-24 -z-10 size-96 rounded-full bg-primary/12 blur-3xl animate-ring-breathe motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute top-1/2 -left-28 -z-10 size-72 -translate-y-1/2 animate-orbit-spin motion-reduce:animate-none">
        <span className="absolute top-1/2 -right-1 size-2.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_var(--brand-primary)]" />
      </span>

      <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex items-start gap-4">
          <span className="hidden size-14 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/12 text-primary shadow-[0_16px_32px_-20px_var(--brand-primary)] sm:grid">
            <Icon name="trophy" size={26} strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className={cx(captionClass, 'text-primary')}>{translate('nav.promotion')}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{translate('contest.title')}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1">
                <Icon name="calendar" size={13} className="text-primary" />
                {seasonRange}
              </span>
              {timezone && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1">
                  <Icon name="globe" size={13} className="text-primary" />
                  {timezone}
                </span>
              )}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4 xl:min-w-[44rem]">
          <RingMeter label={translate('contest.available')} value={contests.length} total={contests.length} icon="trophy" tone="primary" />
          <RingMeter label={translate('contest.myEnrollments')} value={enrolledCount} total={contests.length} icon="checkCircle" tone="neutral" />
          <RingMeter label={translate('contest.activeNow')} value={activeCount} total={contests.length} icon="bolt" tone="success" isLive />
          <RingMeter label={translate('contest.upcoming')} value={upcomingCount} total={contests.length} icon="calendar" tone="upcoming" />
        </dl>
      </div>
    </section>
  );
}

function TicketStub({
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
    <li style={{ animationDelay: `${order * 90}ms` }} className="animate-rise motion-reduce:animate-none">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cx(
          'group relative grid w-full grid-cols-[minmax(0,1fr)_6.5rem] overflow-hidden rounded-2xl border text-left transition-[border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          isSelected ? 'border-primary/55 bg-primary/[0.08] shadow-[0_18px_36px_-26px_var(--brand-primary)]' : 'border-line bg-fg/[0.02] hover:border-primary/35',
        )}
      >
        <span aria-hidden="true" className={cx('absolute inset-y-4 left-0 w-0.5 rounded-full bg-primary transition-opacity duration-300', isSelected ? 'opacity-100' : 'opacity-0')} />

        <span className="flex min-w-0 flex-col gap-2.5 p-4">
          <span className="flex items-center gap-2">
            <StatusLight status={contest.status} />
            <Badge tone={statusTone[contest.status]} dot>
              {statusLabel(contest.status)}
            </Badge>
            <span className="ml-auto font-mono text-[10px] text-fg-subtle">#{contest.id}</span>
          </span>
          <span className="min-w-0">
            <span className="sr-only">{contest.name}</span>
            <ScrambleText
              text={contest.name}
              delayMs={200 + order * ROW_STAGGER_MS}
              className="block truncate text-base font-semibold tracking-tight text-fg capitalize"
            />
            <span className="mt-0.5 block truncate text-xs text-fg-muted">{contest.description}</span>
          </span>
          <span className="flex items-center gap-2 text-[11px] text-fg-muted tabular-nums">
            <span className="whitespace-nowrap">
              <span className="sr-only">{translate('contest.starts')} </span>
              {shortDateFormatter.format(Date.parse(contest.startsAt))}
            </span>
            <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_3px,transparent_3px_6px)]" />
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] whitespace-nowrap">{translate('contest.days', { count: contestDays(contest) })}</span>
            <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_3px,transparent_3px_6px)]" />
            <span className="whitespace-nowrap">
              <span className="sr-only">{translate('contest.ends')} </span>
              {shortDateFormatter.format(Date.parse(contest.endsAt))}
            </span>
          </span>
        </span>

        <span className="relative flex flex-col items-center justify-center gap-1 border-l border-dashed border-line-strong px-2 py-4 text-center">
          <Icon name="trophy" size={16} className={cx('transition-colors', isSelected ? 'text-primary' : 'text-fg-subtle group-hover:text-primary')} />
          <span className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('contest.topPrize')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">{wholeMoney(contest.topPrize, currency)}</span>
          {contest.topPrizePercent !== undefined && <span className="text-[10px] font-medium text-fg-muted">({contest.topPrizePercent}%)</span>}
        </span>
      </button>
    </li>
  );
}

function ContestRail({
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
    <section className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24">
      <div role="group" aria-label={translate('contest.listFilter')} className="grid grid-cols-2 border-b border-line">
        {filters.map((item) => {
          const isActive = filter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onFilterChange(item.value)}
              className={cx(
                'relative flex items-center justify-center gap-2 px-3 pt-1 pb-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {item.label}
              <span className={cx('rounded-md border px-1.5 font-mono text-[10px] tabular-nums', isActive ? 'border-primary/50 text-primary' : 'border-line')}>{item.count}</span>
              <span aria-hidden="true" className={cx('absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary transition-opacity duration-300', isActive ? 'opacity-100' : 'opacity-0')} />
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

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
          <span className="mb-3 grid size-12 place-items-center rounded-2xl border border-primary/35 bg-primary/10 text-primary">
            <Icon name="trophy" size={20} />
          </span>
          <p className="text-sm font-semibold text-fg">{translate('contest.noEnrollments')}</p>
          <p className="mt-1 text-xs text-fg-muted">{translate('contest.noEnrollmentsText')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {visible.map((contest, index) => (
            <TicketStub
              key={contest.id}
              contest={contest}
              currency={currency}
              order={index}
              isSelected={contest.id === selectedId}
              onSelect={() => onSelect(contest)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

const GROW_Y_CLASS = 'origin-bottom animate-[grow-y_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none';

// Left-to-right reads 2-1-3 like a real podium; the winner's step is tallest and carries the trophy.
const PODIUM_STEPS = [
  { place: 2, heightClass: 'h-20', delayMs: 140 },
  { place: 1, heightClass: 'h-28', delayMs: 0 },
  { place: 3, heightClass: 'h-14', delayMs: 280 },
];

function PrizeStage({ contest, currency }: { contest: DemoContest; currency: string }) {
  const prize = useAnimatedNumber(contest.topPrize, 1100);
  const isCompleted = contest.status === 'completed';

  const rules = [
    { label: translate('contest.startingBalance'), value: wholeMoney(contest.startingBalance, currency), tone: 'text-fg' },
    { label: translate('contest.maxLeverage'), value: `1:${contest.maxLeverage}`, tone: 'text-fg' },
    {
      label: translate('contest.entryFee'),
      value: contest.entryFee > 0 ? formatMoney(contest.entryFee, currency) : translate('contest.free'),
      tone: contest.entryFee === 0 ? 'text-success' : 'text-fg',
    },
  ];

  return (
    <section className="orbit-card relative isolate grid animate-rise overflow-hidden text-fg motion-reduce:animate-none md:grid-cols-[minmax(0,1fr)_15rem]">
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-80 rounded-full bg-primary/10 blur-3xl" />

      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-7">
        <header className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone[contest.status]} dot>
            {statusLabel(contest.status)}
          </Badge>
          <span className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle">#{contest.id}</span>
        </header>

        <div className="min-w-0">
          <h2 className="text-3xl font-semibold tracking-tight capitalize">{contest.name}</h2>
          <p className="mt-1 text-sm text-fg-muted">{contest.description}</p>
        </div>

        <div>
          <p className={cx(captionClass, 'text-fg-subtle')}>{translate('contest.topPrize')}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight text-fg tabular-nums sm:text-6xl">{formatMoney(prize, currency)}</span>
            {contest.topPrizePercent !== undefined && (
              <span className="rounded-md border border-primary/35 bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">({contest.topPrizePercent}%)</span>
            )}
          </p>
        </div>

        <dl className="mt-auto flex flex-col gap-2.5 border-t border-line pt-4">
          {rules.map((rule) => (
            <div key={rule.label} className="flex items-baseline gap-3 text-sm">
              <dt className="text-fg-muted">{rule.label}</dt>
              <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1 border-b border-dotted border-line-strong" />
              <dd className={cx('font-mono font-semibold tabular-nums', rule.tone)}>{rule.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden="true" className="relative flex min-h-64 items-end overflow-hidden border-t border-line px-5 pt-8 md:border-t-0 md:border-l">
        <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/25 via-primary/[0.06] to-transparent [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]" />
        {[
          { top: 12, left: 18, delay: 0 },
          { top: 28, left: 82, delay: 900 },
          { top: 46, left: 12, delay: 1700 },
          { top: 8, left: 70, delay: 500 },
        ].map((spot) => (
          <span
            key={`${spot.top}-${spot.left}`}
            className="absolute size-1 rounded-full bg-primary animate-twinkle motion-reduce:animate-none"
            style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}ms` }}
          />
        ))}

        <div className="relative flex w-full items-end gap-1.5">
          {PODIUM_STEPS.map((step) => {
            const isWinner = step.place === 1;
            return (
              <div key={step.place} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                {isWinner && (
                  <span
                    className={cx(
                      'grid size-14 place-items-center rounded-full border animate-orbit-bob motion-reduce:animate-none',
                      isCompleted ? 'border-line-strong bg-fg/10 text-fg-muted' : 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_28px_-6px_var(--brand-primary)]',
                    )}
                  >
                    <Icon name="trophy" size={24} strokeWidth={1.6} />
                  </span>
                )}
                <span
                  className={cx(
                    'flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-2 font-mono text-lg font-semibold',
                    GROW_Y_CLASS,
                    step.heightClass,
                    isWinner ? 'border-primary/50 bg-primary/20 text-primary' : 'border-line-strong bg-fg/[0.05] text-fg-subtle',
                  )}
                  style={{ animationDelay: `${step.delayMs}ms` }}
                >
                  {step.place}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const runwayDayClass: Record<ContestStatus, string> = {
  active: 'bg-primary/40',
  upcoming: 'bg-primary/20',
  completed: 'bg-fg/20',
};
const runwayEdgeClass: Record<ContestStatus, string> = {
  active: 'bg-primary shadow-[0_0_14px_-2px_var(--brand-primary)]',
  upcoming: 'border border-dashed border-primary bg-primary/15',
  completed: 'bg-fg/45',
};

/** One month as a strip of day bars: off-days stay low, contest days rise, start/end days stand tallest. */
function RunwayMonth({
  month,
  rangeStart,
  rangeEnd,
  status,
}: {
  month: CalendarMonth;
  rangeStart: number;
  rangeEnd: number;
  status: ContestStatus;
}) {
  const monthDate = new Date(month.start);
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();
  const days = month.cells.filter((day): day is number => day !== null);
  const lastDay = days.length;

  const dayInfo = days.map((day) => {
    const time = Date.UTC(year, monthIndex, day);
    const isInRange = time >= rangeStart && time <= rangeEnd;
    const isEdge = time === rangeStart || time === rangeEnd;
    const offset = Math.round((time - rangeStart) / DAY_MS);
    return { day, isInRange, isEdge, offset };
  });

  return (
    <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-end">
      <p className="text-sm font-semibold text-fg sm:pb-6">{monthTitleFormatter.format(month.start)}</p>
      <div className="min-w-0">
        <div className="flex h-14 items-end gap-[3px]">
          {dayInfo.map(({ day, isInRange, isEdge, offset }) => {
            let barClass = 'h-3 bg-fg/[0.07]';
            if (isEdge) barClass = cx('h-14', runwayEdgeClass[status]);
            else if (isInRange) barClass = cx('h-9', runwayDayClass[status]);
            return (
              <span
                key={day}
                className={cx('min-w-0 flex-1 rounded-[3px]', isInRange && GROW_Y_CLASS, barClass)}
                style={isInRange ? { animationDelay: `${offset * RANGE_STAGGER_MS}ms` } : undefined}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[3px]">
          {dayInfo.map(({ day, isEdge }) => (
            <span key={day} className={cx('flex min-w-0 flex-1 justify-center text-[10px] tabular-nums', isEdge ? 'font-semibold text-primary' : 'text-fg-subtle')}>
              {isEdge || day === 1 || day === lastDay ? day : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContestDetails({ contest, isEnrolled }: { contest: DemoContest; isEnrolled: boolean }) {
  const days = contestDays(contest);
  const rangeStart = utcDay(contest.startsAt);
  const rangeEnd = utcDay(contest.endsAt);
  const months = buildCalendarMonths(contest.startsAt, contest.endsAt);

  const itinerary: { icon: IconName; label: string; value: string; highlight?: boolean }[] = [
    { icon: 'trendUp', label: translate('contest.winCriteria'), value: contest.winCriteria, highlight: true },
    { icon: 'calendar', label: translate('contest.starts'), value: longDateFormatter.format(Date.parse(contest.startsAt)) },
    { icon: 'calendar', label: translate('contest.ends'), value: longDateFormatter.format(Date.parse(contest.endsAt)) },
    { icon: 'globe', label: translate('contest.timezone'), value: contest.timezoneLabel },
  ];

  let action: ReactNode;
  if (isEnrolled) {
    action = (
      <Button type="button" variant="outline" className="w-full" disabled>
        <Icon name="checkCircle" size={16} />
        {translate('contest.enrolled')}
      </Button>
    );
  } else if (!contest.registrationOpen) {
    action = (
      <LinkButton href={`/promotion/demo-contest/${contest.id}`} variant="secondary" className="group/closed w-full">
        <Icon name="lock" size={15} className="transition-transform duration-300 group-hover/closed:-rotate-12" />
        {translate('contest.registrationClosed')}
        <Icon name="arrowRight" size={15} className="transition-transform duration-200 group-hover/closed:translate-x-1" />
      </LinkButton>
    );
  } else {
    action = (
      <LinkButton href={`/promotion/demo-contest/${contest.id}`} className="group/enroll relative w-full overflow-hidden">
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-ring-breathe rounded-[inherit] ring-2 ring-primary/50 motion-reduce:hidden" />
        <Icon name="user" size={15} className="relative transition-transform duration-300 group-hover/enroll:scale-110" />
        <span className="relative">{translate('contest.join')}</span>
        <Icon name="arrowRight" size={15} className="relative transition-transform duration-200 group-hover/enroll:translate-x-1" />
      </LinkButton>
    );
  }

  return (
    <section className="orbit-card flex animate-rise flex-col overflow-hidden motion-reduce:animate-none">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <p className={cx(captionClass, 'text-primary')}>{translate('contest.details')}</p>
          <h2 className="mt-0.5 text-lg font-semibold text-fg capitalize">{contest.name}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 border-l-2 border-primary pl-3 text-sm font-semibold text-fg tabular-nums">
          <Icon name="calendar" size={14} className="text-primary" />
          {translate('contest.days', { count: days })}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-7">
        <p className={cx(captionClass, 'text-fg-subtle')}>{translate('contest.calendar')}</p>
        <div aria-hidden="true" className="flex flex-col gap-6">
          {months.map((month) => (
            <RunwayMonth key={month.start} month={month} rangeStart={rangeStart} rangeEnd={rangeEnd} status={contest.status} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fg-muted">
          <span className="inline-flex items-end gap-1.5">
            <span aria-hidden="true" className={cx('h-4 w-1.5 rounded-[2px]', runwayEdgeClass[contest.status])} />
            {translate('contest.legendEdge')}
          </span>
          <span className="inline-flex items-end gap-1.5">
            <span aria-hidden="true" className={cx('h-2.5 w-1.5 rounded-[2px]', runwayDayClass[contest.status])} />
            {translate('contest.legendDay')}
          </span>
          <span className="text-fg-subtle">{translate('contest.calendarHint')}</span>
        </div>
      </div>

      <div className="grid gap-5 border-t border-dashed border-line-strong px-5 py-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {itinerary.map((item) => (
            <div key={item.label} className="flex min-w-0 items-center gap-3">
              <span
                className={cx(
                  'grid size-8 shrink-0 rotate-45 place-items-center rounded-lg border',
                  item.highlight ? 'border-primary/60 bg-primary/15 text-primary' : 'border-line-strong text-fg-muted',
                )}
              >
                <Icon name={item.icon} size={14} className="-rotate-45" />
              </span>
              <div className="min-w-0">
                <dt className={cx(captionClass, 'text-fg-subtle')}>{item.label}</dt>
                <dd className={cx('truncate font-semibold', item.highlight ? 'text-base text-primary' : 'text-sm text-fg')}>{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {action}
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
        <Skeleton className="h-[26rem] rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <Skeleton className="h-[34rem] rounded-[30px]" />
          <Skeleton className="h-[34rem] rounded-[28px]" />
        </div>
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
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)] xl:items-start">
        <ContestRail
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
          <div className="flex min-w-0 flex-col gap-6">
            <PrizeStage key={`stage-${selected.id}`} contest={selected} currency={data.currency} />
            <ContestDetails key={`details-${selected.id}`} contest={selected} isEnrolled={enrolledIds.includes(selected.id)} />
          </div>
        )}
      </div>
    </div>
  );
}
