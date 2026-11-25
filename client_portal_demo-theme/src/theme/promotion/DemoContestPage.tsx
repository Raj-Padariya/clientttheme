'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
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
type FlapSize = 'md' | 'lg';

const DAY_MS = 86_400_000;
const FLAP_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Each tile spins through random glyphs, then settles left-to-right like a split-flap board.
const SCRAMBLE_SETTLE_MS = 650;
const SCRAMBLE_STAGGER_MS = 40;
const SCRAMBLE_TICK_MS = 60;
const ROW_STAGGER_MS = 160;
const RANGE_STAGGER_MS = 12;
const MAX_TILT_DEG = 9;

const captionClass = 'text-[10.5px] tracking-[0.14em] uppercase';

const longDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' });
const monthTitleFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
// 4 Jan 1970 was a Sunday, so these come out Sunday-first to match getUTCDay().
const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, day) => weekdayFormatter.format(Date.UTC(1970, 0, 4 + day)));

const statusTone: Record<ContestStatus, Tone> = { active: 'success', upcoming: 'info', completed: 'neutral' };
const rangeBandClass: Record<ContestStatus, string> = {
  active: 'bg-primary/15',
  upcoming: 'bg-primary/10',
  completed: 'bg-fg/[0.08]',
};
const rangeEdgeClass: Record<ContestStatus, string> = {
  active: 'font-semibold text-on-primary shadow-[0_8px_18px_-8px_var(--brand-primary)] [background-image:var(--brand-gradient)]',
  upcoming: 'border border-dashed border-primary font-semibold text-primary',
  completed: 'bg-fg/30 font-semibold text-fg',
};

// Perspective lives on the wrapper; the pointer handlers only move these custom properties.
const TILT_STYLE: CSSProperties = { transform: 'rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))' };
const GLARE_STYLE: CSSProperties = {
  backgroundImage: 'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 20%), rgba(255,255,255,0.18), transparent 45%)',
};
const FOIL_STYLE: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(115deg, transparent 0 14px, rgba(255,255,255,0.035) 14px 16px)',
};
const SCANLINE_STYLE: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px)',
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

function FlapText({ text, delayMs, toneClass, size = 'md' }: { text: string; delayMs: number; toneClass: string; size?: FlapSize }) {
  const shown = useScramble(text, delayMs);

  return (
    <span aria-hidden="true" className="flex flex-wrap gap-[2px]">
      {shown.split('').map((char, index) => (
        <span
          key={index}
          className={cx(
            'relative flex items-center justify-center overflow-hidden bg-[#18181b] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.7)] light:bg-surface-2 light:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(10,10,10,0.12)]',
            size === 'lg' ? 'h-14 w-11 rounded-lg text-3xl tabular-nums' : 'h-7 w-[19px] rounded-[3px] font-mono text-sm',
            toneClass,
          )}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.035]" />
          {char === ' ' ? '\u00a0' : char}
          <span className="absolute inset-x-0 top-1/2 h-px bg-black/80" />
        </span>
      ))}
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
      className={cx('size-2 shrink-0 rounded-full', status === 'upcoming' ? 'border border-primary' : 'bg-white/25')}
    />
  );
}

function FlapCounter({
  label,
  value,
  order,
  icon,
  toneClass,
  chipClass,
  isLive = false,
}: {
  label: string;
  value: number;
  order: number;
  icon: IconName;
  toneClass: string;
  chipClass: string;
  isLive?: boolean;
}) {
  return (
    <div className="relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors duration-300 hover:border-white/20">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
      <dt className="flex items-start justify-between gap-3">
        <span className={cx(captionClass, 'leading-snug text-white/55')}>{label}</span>
        <span aria-hidden="true" className={cx('relative flex size-7 shrink-0 items-center justify-center rounded-lg', chipClass)}>
          <Icon name={icon} size={14} />
          {isLive && (
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inset-0 rounded-full bg-success animate-ping motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
          )}
        </span>
      </dt>
      <dd>
        <span className="sr-only">{value}</span>
        <FlapText text={String(value)} delayMs={order * 120} toneClass={toneClass} size="lg" />
      </dd>
    </div>
  );
}

function BoardField({ label, align = 'start', children }: { label: string; align?: 'start' | 'end'; children: ReactNode }) {
  return (
    <span className={cx('flex flex-col gap-1', align === 'end' && 'items-end text-right')}>
      <span className="text-[10px] tracking-[0.14em] text-white/45 uppercase">{label}</span>
      <span className="text-sm font-semibold whitespace-nowrap text-white tabular-nums">{children}</span>
    </span>
  );
}

function BoardRow({
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
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cx(
        'group relative flex w-full animate-rise flex-col gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
        isSelected ? 'border-primary/45 bg-white/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
      )}
      style={{ animationDelay: `${order * 90}ms` }}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-x-5 top-0 h-[2px] rounded-full transition-opacity duration-300 [background-image:var(--brand-gradient)]',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
        )}
      />

      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <StatusLight status={contest.status} />
          <Badge tone={statusTone[contest.status]} dot>
            {statusLabel(contest.status)}
          </Badge>
        </span>
        <span
          aria-hidden="true"
          className={cx(
            'flex size-8 items-center justify-center rounded-full border transition-colors duration-300',
            isSelected ? 'border-primary/50 text-primary' : 'border-white/10 text-white/45 group-hover:text-white',
          )}
        >
          <Icon name="chevronDown" size={15} />
        </span>
      </span>

      <span className="min-w-0">
        <span className="sr-only">{contest.name}</span>
        <ScrambleText
          text={contest.name}
          delayMs={200 + order * ROW_STAGGER_MS}
          className="block truncate text-lg font-semibold tracking-tight text-white capitalize"
        />
        <span className="mt-0.5 block truncate text-xs text-white/55">{contest.description}</span>
      </span>

      <span className="flex flex-col gap-1">
        <span className="text-[10px] tracking-[0.14em] text-white/45 uppercase">{translate('contest.topPrize')}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-primary tabular-nums">{formatMoney(contest.topPrize, currency)}</span>
          {contest.topPrizePercent !== undefined && <span className="text-xs font-medium text-white/55">({contest.topPrizePercent}%)</span>}
        </span>
      </span>

      <span className="mt-auto flex items-center gap-3 border-t border-dashed border-white/10 pt-3">
        <BoardField label={translate('contest.starts')}>{shortDateFormatter.format(Date.parse(contest.startsAt))}</BoardField>
        <span aria-hidden="true" className="relative h-px min-w-10 flex-1 bg-white/15">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#141416] px-2 py-0.5 text-[10px] whitespace-nowrap text-white/65 light:bg-surface">
            {translate('contest.days', { count: contestDays(contest) })}
          </span>
        </span>
        <BoardField label={translate('contest.ends')} align="end">
          {shortDateFormatter.format(Date.parse(contest.endsAt))}
        </BoardField>
      </span>
    </button>
  );
}

function ContestBoard({
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
  const activeCount = contests.filter((contest) => contest.status === 'active').length;
  const upcomingCount = contests.filter((contest) => contest.status === 'upcoming').length;
  const firstStart = Math.min(...contests.map((contest) => Date.parse(contest.startsAt)));
  const lastEnd = Math.max(...contests.map((contest) => Date.parse(contest.endsAt)));
  const seasonRange = translate('contest.seasonRange', {
    from: monthYearFormatter.format(firstStart),
    to: monthYearFormatter.format(lastEnd),
  });
  const timezone = contests[0]?.timezoneLabel;

  const filters: { value: ListFilter; label: string; count: number }[] = [
    { value: 'all', label: translate('contest.allContests'), count: contests.length },
    { value: 'enrolled', label: translate('contest.myEnrollments'), count: enrolledCount },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0d] p-5 text-white shadow-card sm:p-7 light:bg-surface">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={SCANLINE_STYLE} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 -z-10 h-px [background-image:var(--brand-gradient)] opacity-70" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/3 -z-10 size-96 rounded-full bg-primary/15 blur-3xl animate-ring-breathe motion-reduce:animate-none" />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className={cx(captionClass, 'flex items-center gap-2 text-primary')}>
            <Icon name="trophy" size={13} />
            {translate('nav.promotion')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{translate('contest.title')}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={13} />
              {seasonRange}
            </span>
            {timezone && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="globe" size={13} />
                {timezone}
              </span>
            )}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[38rem]">
          <FlapCounter label={translate('contest.available')} value={contests.length} order={0} icon="trophy" toneClass="text-primary" chipClass="bg-primary/15 text-primary" />
          <FlapCounter label={translate('contest.myEnrollments')} value={enrolledCount} order={1} icon="checkCircle" toneClass="text-white" chipClass="bg-white/10 text-white/75" />
          <FlapCounter label={translate('contest.activeNow')} value={activeCount} order={2} icon="bolt" toneClass="text-success" chipClass="bg-success/15 text-success" isLive />
          <FlapCounter
            label={translate('contest.upcoming')}
            value={upcomingCount}
            order={3}
            icon="calendar"
            toneClass="text-white"
            chipClass="border border-dashed border-primary/50 text-primary"
          />
        </dl>
      </div>

      <div className="mt-7 rounded-2xl border border-white/[0.07] bg-black/40 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={translate('contest.listFilter')} className="flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => onFilterChange(item.value)}
                className={cx(
                  'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-[background-color,color,transform] duration-200 active:scale-95 motion-reduce:transition-none',
                  filter === item.value
                    ? 'text-on-primary shadow-[0_10px_24px_-14px_var(--brand-primary)] [background-image:var(--brand-gradient)]'
                    : 'text-white/60 hover:text-white',
                )}
              >
                {item.label}
                <span className={cx('rounded-full px-1.5 text-[10px] tabular-nums', filter === item.value ? 'bg-black/20' : 'bg-white/10')}>{item.count}</span>
              </button>
            ))}
          </div>
          {visible.length > 0 && (
            <p className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <Icon name="info" size={13} />
              {translate('contest.boardHint')}
            </p>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <Icon name="trophy" size={22} className="mb-3 text-primary" />
            <p className="text-sm font-semibold">{translate('contest.noEnrollments')}</p>
            <p className="mt-1 text-xs text-white/55">{translate('contest.noEnrollmentsText')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

            {visible.map((contest, index) => (
              <BoardRow
                key={contest.id}
                contest={contest}
                currency={currency}
                order={index}
                isSelected={contest.id === selectedId}
                onSelect={() => onSelect(contest)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HoloCard({ contest, currency }: { contest: DemoContest; currency: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prize = useAnimatedNumber(contest.topPrize, 1100);
  const isCompleted = contest.status === 'completed';

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--tilt-x', `${(0.5 - y) * MAX_TILT_DEG * 2}deg`);
    card.style.setProperty('--tilt-y', `${(x - 0.5) * MAX_TILT_DEG * 2}deg`);
    card.style.setProperty('--glare-x', `${x * 100}%`);
    card.style.setProperty('--glare-y', `${y * 100}%`);
  }

  function resetTilt() {
    const card = cardRef.current;
    if (!card) return;
    for (const property of ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y']) card.style.removeProperty(property);
  }

  return (
    <div className="flex animate-rise justify-center [perspective:1000px] motion-reduce:animate-none">
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        className="relative w-full max-w-sm rounded-[30px] p-[1.5px] shadow-[0_40px_80px_-44px_var(--brand-primary)] transition-transform duration-300 ease-out [background-image:var(--brand-gradient)] motion-reduce:transition-none"
        style={TILT_STYLE}
      >
        <div className="keep-dark relative isolate flex h-full flex-col overflow-hidden rounded-[29px] bg-[#0d0d10] p-6 text-white">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={FOIL_STYLE} />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 mix-blend-screen" style={GLARE_STYLE} />
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          {[
            { top: 14, left: 18, delay: 0 },
            { top: 24, left: 82, delay: 900 },
            { top: 46, left: 10, delay: 1700 },
            { top: 40, left: 90, delay: 500 },
          ].map((spot) => (
            <span
              key={`${spot.top}-${spot.left}`}
              aria-hidden="true"
              className="absolute size-1 rounded-full bg-primary animate-twinkle motion-reduce:animate-none"
              style={{ top: `${spot.top}%`, left: `${spot.left}%`, animationDelay: `${spot.delay}ms` }}
            />
          ))}

          <header className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] tracking-[0.2em] text-white/45">#{contest.id}</span>
            <Badge tone={statusTone[contest.status]} dot>
              {statusLabel(contest.status)}
            </Badge>
          </header>

          <div aria-hidden="true" className="relative mx-auto mt-6 flex size-36 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-primary/25 animate-ring-breathe motion-reduce:animate-none" />
            <span className="absolute inset-4 rounded-full border border-dashed border-primary/35 animate-[spin_22s_linear_infinite] motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-orbit motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
            </span>
            <span
              className={cx(
                'relative flex size-20 items-center justify-center rounded-[24px] shadow-[0_20px_40px_-18px_var(--brand-primary)]',
                isCompleted ? 'bg-white/10 text-white/60' : 'text-on-primary [background-image:var(--brand-gradient)]',
              )}
            >
              <Icon name="trophy" size={36} strokeWidth={1.5} />
            </span>
          </div>

          <h2 className="mt-5 text-center text-2xl font-semibold tracking-tight capitalize">{contest.name}</h2>
          <p className="mt-1 text-center text-sm text-white/55">{contest.description}</p>

          <div className="mt-5 text-center">
            <p className={cx(captionClass, 'text-white/45')}>{translate('contest.topPrize')}</p>
            <p className="mt-1 flex flex-wrap items-baseline justify-center gap-2">
              <span className="bg-clip-text text-4xl font-semibold tracking-tight text-transparent tabular-nums [background-image:var(--brand-gradient)]">
                {formatMoney(prize, currency)}
              </span>
              {contest.topPrizePercent !== undefined && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">({contest.topPrizePercent}%)</span>
              )}
            </p>
          </div>

          <div className="mt-auto pt-6">
            <dl className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-center">
              <div className="px-2">
                <dt className="text-[9.5px] tracking-[0.12em] text-white/40 uppercase">{translate('contest.startingBalance')}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{wholeMoney(contest.startingBalance, currency)}</dd>
              </div>
              <div className="px-2">
                <dt className="text-[9.5px] tracking-[0.12em] text-white/40 uppercase">{translate('contest.maxLeverage')}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">1:{contest.maxLeverage}</dd>
              </div>
              <div className="px-2">
                <dt className="text-[9.5px] tracking-[0.12em] text-white/40 uppercase">{translate('contest.entryFee')}</dt>
                <dd className={cx('mt-1 text-sm font-semibold', contest.entryFee === 0 ? 'text-success' : 'text-white')}>
                  {contest.entryFee > 0 ? formatMoney(contest.entryFee, currency) : translate('contest.free')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarMonthGrid({
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
  const daysInMonth = month.cells.filter((day) => day !== null).length;
  const isSingleDay = rangeStart === rangeEnd;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-fg">{monthTitleFormatter.format(month.start)}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={`weekday-${index}`} className="pb-1.5 text-[10px] font-medium tracking-[0.1em] text-fg-subtle uppercase">
            {label}
          </span>
        ))}

        {month.cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;

          const time = Date.UTC(year, monthIndex, day);
          const isInRange = time >= rangeStart && time <= rangeEnd;
          const isStart = time === rangeStart;
          const isEnd = time === rangeEnd;
          const isEdge = isStart || isEnd;
          const column = index % 7;
          const animationDelay = `${Math.round((time - rangeStart) / DAY_MS) * RANGE_STAGGER_MS}ms`;

          // The band runs from the start dot's centre to the end dot's centre and rounds off at week / month edges.
          let bandPosition = 'inset-x-0';
          if (isStart) bandPosition = 'left-1/2 right-0';
          else if (isEnd) bandPosition = 'left-0 right-1/2';
          const roundsLeft = !isStart && (column === 0 || day === 1);
          const roundsRight = !isEnd && (column === 6 || day === daysInMonth);

          let dayClass = 'text-fg-subtle opacity-60';
          if (isEdge) dayClass = cx(rangeEdgeClass[status], 'animate-dot-pop motion-reduce:animate-none');
          else if (isInRange) dayClass = 'font-medium text-fg';

          return (
            <span key={day} className="relative flex h-9 items-center justify-center">
              {isInRange && !isSingleDay && (
                <span
                  className={cx(
                    'absolute inset-y-1 animate-rise motion-reduce:animate-none',
                    rangeBandClass[status],
                    bandPosition,
                    roundsLeft && 'rounded-l-full',
                    roundsRight && 'rounded-r-full',
                  )}
                  style={{ animationDelay }}
                />
              )}
              <span
                className={cx('relative flex size-8 items-center justify-center rounded-full text-xs tabular-nums', dayClass)}
                style={isEdge ? { animationDelay } : undefined}
              >
                {day}
              </span>
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
    <section className="relative isolate flex animate-rise flex-col gap-5 overflow-hidden rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-24 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={cx(captionClass, 'text-primary')}>{translate('contest.details')}</p>
          <h2 className="mt-1 text-xl font-semibold text-fg capitalize">{contest.name}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft/40 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
          <Icon name="calendar" size={13} />
          {translate('contest.days', { count: days })}
        </span>
      </header>

      <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-col rounded-2xl border border-line bg-surface-2/30 p-4 sm:p-5">
          <p className={cx(captionClass, 'text-fg-subtle')}>{translate('contest.calendar')}</p>

          <div aria-hidden="true" className={cx('mt-4 grid gap-x-8 gap-y-6', months.length > 1 ? 'sm:grid-cols-2' : 'mx-auto w-full max-w-sm')}>
            {months.map((month) => (
              <CalendarMonthGrid key={month.start} month={month} rangeStart={rangeStart} rangeEnd={rangeEnd} status={contest.status} />
            ))}
          </div>

          <div className="mt-auto pt-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-line pt-3 text-[11px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cx('size-3.5 rounded-full', rangeEdgeClass[contest.status])} />
                {translate('contest.legendEdge')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cx('h-3 w-8 rounded-full', rangeBandClass[contest.status])} />
                {translate('contest.legendDay')}
              </span>
              <span className="text-fg-subtle">{translate('contest.calendarHint')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <DetailTile icon="trendUp" label={translate('contest.winCriteria')} value={contest.winCriteria} highlight />
            <DetailTile icon="calendar" label={translate('contest.starts')} value={longDateFormatter.format(Date.parse(contest.startsAt))} />
            <DetailTile icon="calendar" label={translate('contest.ends')} value={longDateFormatter.format(Date.parse(contest.endsAt))} />
            <DetailTile icon="globe" label={translate('contest.timezone')} value={contest.timezoneLabel} />
          </dl>
          <div className="mt-auto pt-2">{action}</div>
        </div>
      </div>
    </section>
  );
}

function DetailTile({ icon, label, value, highlight = false }: { icon: IconName; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl border p-3', highlight ? 'border-primary/25 bg-primary-soft/40' : 'border-line bg-surface-2/30')}>
      <span
        className={cx(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          highlight ? 'text-on-primary [background-image:var(--brand-gradient)]' : 'bg-primary-soft text-primary',
        )}
      >
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <dt className={cx(captionClass, 'text-fg-subtle')}>{label}</dt>
        <dd className={cx('truncate font-semibold text-fg', highlight ? 'text-lg' : 'text-sm')}>{value}</dd>
      </div>
    </div>
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
    <div className="light-ink flex flex-col gap-6">
      <ContestBoard
        contests={orderedContests}
        visible={visible}
        currency={data.currency}
        enrolledCount={enrolledContests.length}
        filter={filter}
        onFilterChange={setFilter}
        selectedId={selected?.id}
        onSelect={(contest) => setSelectedId(contest.id)}
      />

      {selected && (
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <HoloCard key={`card-${selected.id}`} contest={selected} currency={data.currency} />
          <ContestDetails
            key={`details-${selected.id}`}
            contest={selected}
            isEnrolled={enrolledIds.includes(selected.id)}
          />
        </div>
      )}
    </div>
  );
}
