'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbContest } from '@/core/mock/ibContests';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

const cardClass = 'orbit-card';
// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const whenFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface InsightProps {
  contests: IbContest[];
  selectedId: string;
  onSelect: (id: string) => void;
  currency: string;
}

const journey: { labelKey: MessageKey; icon: IconName }[] = [
  { labelKey: 'ibInsight.stepCreated', icon: 'plus' },
  { labelKey: 'ibInsight.stepApproval', icon: 'clock' },
  { labelKey: 'ibInsight.stepRegistration', icon: 'user' },
  { labelKey: 'ibInsight.stepLive', icon: 'areaChart' },
  { labelKey: 'ibInsight.stepResults', icon: 'trophy' },
];

// Draft = sent to admin (waiting on approval); active = approved and running; ended = results.
const journeyIndex: Record<IbContest['status'], number> = { draft: 1, active: 3, ended: 4 };

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 90}ms` };
}

function formatWhen(value: string): string {
  return value ? whenFormatter.format(new Date(value)) : translate('ibInsight.notSet');
}

function orNotSet(value: string): string {
  return value || translate('ibInsight.notSet');
}

/* ───────────── Shared ───────────── */

const statusDot: Record<IbContest['status'], string> = {
  draft: 'bg-white/60',
  active: 'bg-success',
  ended: 'bg-fg-subtle',
};

// Contest picker as a row of small entry passes rather than pills.
function ContestSwitcher({ contests, selectedId, onSelect }: Omit<InsightProps, 'currency'>) {
  return (
    <div role="radiogroup" aria-label={translate('ibInsight.pickContest')} className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {contests.map((contest, index) => {
        const isActive = contest.id === selectedId;
        return (
          <button
            key={contest.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect(contest.id)}
            className={cx(
              'group relative flex w-48 shrink-0 flex-col gap-2 overflow-hidden rounded-2xl p-3.5 text-left ring-1 transition-[background-color,box-shadow,color,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? cx(graphite, 'text-white ring-primary/60 shadow-[0_16px_32px_-20px_var(--brand-primary)]') : 'bg-surface text-fg ring-line hover:ring-primary/40',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={cx('font-mono text-[11px] font-semibold tabular-nums', isActive ? 'text-white/45' : 'text-fg-subtle')}>#{String(index + 1).padStart(2, '0')}</span>
              <span className={cx('grid size-7 place-items-center rounded-lg transition-colors', isActive ? 'bg-primary/25 text-(--brand-gleam)' : 'bg-surface-2 text-fg-subtle group-hover:text-primary')}>
                <Icon name="trophy" size={13} />
              </span>
            </span>
            <span className="truncate text-sm font-semibold">{contest.name}</span>
            <span className={cx('flex items-center gap-2 text-[11px]', isActive ? 'text-white/55' : 'text-fg-muted')}>
              <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusDot[contest.status])} />
              <Icon name="user" size={11} />
              <span className="font-mono tabular-nums">{contest.participants}</span>
            </span>
            {/* Floodlit edge on the selected pass. */}
            <span aria-hidden="true" className={cx('absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)] transition-opacity duration-300', isActive ? 'opacity-100' : 'opacity-0')} />
          </button>
        );
      })}
    </div>
  );
}

// Radar sweep: the panel is "scanning" for data that has not arrived yet.
function WaitingState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="relative grid size-32 place-items-center overflow-hidden rounded-full ring-1 ring-primary/25">
        <span aria-hidden="true" className="absolute inset-4 rounded-full border border-dashed border-primary/25" />
        <span aria-hidden="true" className="absolute inset-9 rounded-full border border-primary/20" />
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-primary/15" />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-primary/15" />
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-orbit rounded-full bg-[conic-gradient(from_0deg,color-mix(in_srgb,var(--brand-primary)_35%,transparent),transparent_70deg,transparent)] [animation-duration:3.5s] motion-reduce:animate-none"
        />
        <span aria-hidden="true" className="absolute top-6 right-8 size-1.5 animate-twinkle rounded-full bg-primary motion-reduce:animate-none" />
        <span className={cx('relative grid size-12 place-items-center rounded-2xl text-(--brand-gleam) ring-1 ring-primary/50', graphite)}>
          <Icon name={icon} size={20} />
        </span>
      </span>
      <p className="mt-5 text-sm font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{body}</p>
    </div>
  );
}

function PanelHeader({ icon, title, aside }: { icon: IconName; title: string; aside?: ReactNode }) {
  return (
    <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <span aria-hidden="true" className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-fg">
        <span className={cx('grid size-8 place-items-center rounded-xl text-(--brand-gleam) ring-1 ring-primary/40', graphite)}>
          <Icon name={icon} size={15} />
        </span>
        {title}
      </h3>
      {aside}
    </header>
  );
}

/* ───────────── Enrollments ───────────── */

// Five laps of a race track: each stage owns a thin track segment that fills as the contest moves on.
function JourneyStepper({ contest }: { contest: IbContest }) {
  const current = journeyIndex[contest.status];
  return (
    <section className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <div className="flex items-center justify-between gap-3">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibInsight.journey')}</p>
        <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
          {String(current + 1).padStart(2, '0')}/{String(journey.length).padStart(2, '0')}
        </span>
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-2">
        {journey.map((step, index) => {
          const isDone = index < current;
          const isNow = index === current;
          return (
            <li key={step.labelKey} style={riseDelay(index)} className="flex min-w-0 animate-rise flex-col gap-2.5 motion-reduce:animate-none">
              <span
                className={cx(
                  'relative grid size-9 place-items-center rounded-xl ring-1 transition-colors',
                  isDone && 'bg-primary/15 text-primary ring-primary/35',
                  isNow && cx(graphite, 'text-(--brand-gleam) ring-primary/70 shadow-[0_10px_24px_-14px_var(--brand-primary)]'),
                  !isDone && !isNow && 'bg-surface-2 text-fg-subtle ring-line',
                )}
              >
                {isNow && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl border border-primary motion-reduce:hidden" />}
                <Icon name={isDone ? 'check' : step.icon} size={15} />
              </span>
              <span aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                {isDone && <span className="absolute inset-0 rounded-full bg-linear-to-r from-primary/40 to-primary/75" />}
                {isNow && (
                  <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden rounded-full bg-primary/40">
                    <span className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-(--brand-gleam) to-transparent motion-reduce:hidden" />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className={cx('block truncate text-xs font-semibold', isNow ? 'text-fg' : isDone ? 'text-fg-muted' : 'text-fg-subtle')}>{translate(step.labelKey)}</span>
                {(isDone || isNow) && (
                  <span className={cx('mt-0.5 block text-[10px] font-bold tracking-wide uppercase', isNow ? 'text-primary' : 'text-fg-subtle')}>
                    {translate(isNow ? 'ibInsight.stepNow' : 'ibInsight.stepDone')}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const SEAT_CELLS = 40;

// Stadium seat map: 40 seats each standing for an equal slice of capacity; the seat where the minimum is reached is outlined.
function SeatsRing({ contest }: { contest: IbContest }) {
  const { maxParticipants, minParticipants } = contest.details;
  const filled = maxParticipants > 0 ? Math.min(1, contest.participants / maxParticipants) : 0;
  const filledCells = Math.round(filled * SEAT_CELLS);
  const minCell = maxParticipants > 0 ? Math.max(0, Math.ceil((Math.min(minParticipants, maxParticipants) / maxParticipants) * SEAT_CELLS) - 1) : -1;
  return (
    <section className={cx('relative isolate flex animate-rise flex-col overflow-hidden rounded-[28px] p-5 text-white ring-1 ring-white/10 motion-reduce:animate-none', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-16 -z-10 size-56 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_26%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <p className={cx(eyebrow, 'text-white/50')}>{translate('ibInsight.capacity')}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className={cx('font-mono text-4xl leading-none font-semibold tabular-nums', goldText)}>{contest.participants}</span>
        <span className="text-right text-xs text-white/55">{translate('ibInsight.capacityOf', { count: String(contest.participants), max: String(maxParticipants) })}</span>
      </div>
      {/* Curved like a stand: the outer rows are pushed down a little. */}
      <div aria-hidden="true" className="mt-5 grid grid-cols-10 gap-1.5 [perspective:400px]">
        {Array.from({ length: SEAT_CELLS }, (_, cell) => {
          const isFilled = cell < filledCells;
          const isMin = cell === minCell;
          return (
            <span
              key={cell}
              style={{ animationDelay: `${cell * 18}ms` }}
              className={cx(
                'aspect-square animate-rise rounded-t-md rounded-b-sm motion-reduce:animate-none',
                isFilled ? 'bg-primary/70 shadow-[0_0_8px_-2px_var(--brand-primary)]' : 'bg-white/[0.08]',
                isMin && 'ring-2 ring-white/80 ring-offset-1 ring-offset-transparent',
              )}
            />
          );
        })}
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
        <span aria-hidden="true" className="size-2.5 rounded-sm ring-2 ring-white/80" />
        {translate('ibInsight.minToRun', { min: String(minParticipants) })}
      </span>
    </section>
  );
}

const dayFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });

// Each date is a tear-off calendar leaf next to its full timestamp.
function ScheduleCard({ contest }: { contest: IbContest }) {
  const { registrationCloses, startDate, endDate } = contest.details;
  const rows: { labelKey: MessageKey; value: string; icon: IconName }[] = [
    { labelKey: 'ibInsight.regCloses', value: registrationCloses, icon: 'user' },
    { labelKey: 'ibInsight.starts', value: startDate, icon: 'clock' },
    { labelKey: 'ibInsight.ends', value: endDate, icon: 'trophy' },
  ];
  return (
    <section style={riseDelay(1)} className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibInsight.schedule')}</p>
      <ol className="mt-4 space-y-2.5">
        {rows.map((row) => {
          const date = row.value ? new Date(row.value) : null;
          return (
            <li key={row.labelKey} className="flex items-center gap-3 rounded-2xl bg-surface-2/50 p-2 pr-3 ring-1 ring-line">
              <span className="w-12 shrink-0 overflow-hidden rounded-xl text-center ring-1 ring-primary/30">
                <span className="flex items-center justify-center gap-1 bg-primary/15 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase">
                  <Icon name={row.icon} size={9} />
                  {date ? monthFormatter.format(date) : '—'}
                </span>
                <span className={cx('block bg-surface py-1 font-mono text-lg leading-tight font-semibold tabular-nums', date ? 'text-fg' : 'text-fg-subtle')}>
                  {date ? dayFormatter.format(date) : '··'}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-fg-subtle">{translate(row.labelKey)}</span>
                <span className={cx('block truncate font-mono text-sm tabular-nums', row.value ? 'font-semibold text-fg' : 'text-fg-subtle')}>{formatWhen(row.value)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Rule sheet with dotted leaders between each rule and its value.
function JoinRules({ contest }: { contest: IbContest }) {
  const { details } = contest;
  const rules: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibCreate.whoCanRegister', value: details.whoCanRegister },
    { labelKey: 'ibCreate.enrollmentType', value: details.enrollmentType },
    { labelKey: 'ibCreate.kycRequired', value: details.kycRequired },
    { labelKey: 'ibCreate.realAccount', value: details.realAccountRequired },
    { labelKey: 'ibCreate.multiParticipation', value: details.multipleParticipation },
    { labelKey: 'ibInsight.excluded', value: details.excludedCountries.length ? details.excludedCountries.join(', ') : translate('ibInsight.none') },
  ];
  return (
    <section style={riseDelay(2)} className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibInsight.rules')}</p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rules.map((rule, index) => (
          <div key={rule.labelKey} className="flex min-w-0 items-baseline gap-2">
            <span aria-hidden="true" className="font-mono text-[10px] text-primary tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <dt className="shrink-0 text-xs text-fg-muted">{translate(rule.labelKey)}</dt>
            <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-line" />
            <dd className={cx('max-w-[55%] truncate text-right text-sm', rule.value ? 'font-semibold text-fg' : 'text-fg-subtle')}>{orNotSet(rule.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function waitingBody(contest: IbContest): string {
  if (contest.status === 'draft') return translate('ibInsight.waitApproval');
  if (contest.status === 'ended') return translate('ibInsight.ended');
  return translate('ibInsight.waitClients');
}

export function EnrollmentsPanel({ contests, selectedId, onSelect }: InsightProps) {
  const contest = contests.find((item) => item.id === selectedId) ?? contests[0];
  if (!contest) return null;
  return (
    <div className="space-y-5">
      <ContestSwitcher contests={contests} selectedId={contest.id} onSelect={onSelect} />
      {/* Bento: the seat map anchors the left; journey, schedule and rules stack on the right. */}
      <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:row-span-2">
          <SeatsRing contest={contest} />
        </div>
        <JourneyStepper key={`journey-${contest.id}`} contest={contest} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <ScheduleCard contest={contest} />
          <JoinRules contest={contest} />
        </div>
      </div>
      <section style={riseDelay(3)} className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none')}>
        <PanelHeader
          icon="user"
          title={translate('ibInsight.participants')}
          aside={<span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-fg-muted ring-1 ring-line tabular-nums">{contest.participants}</span>}
        />
        <WaitingState icon="user" title={translate('ibContest.enrollmentsEmpty')} body={waitingBody(contest)} />
      </section>
    </div>
  );
}

/* ───────────── Leaderboard ───────────── */

const medal: Record<number, string> = {
  1: goldFill,
  2: '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-primary))]',
  3: '[background-image:linear-gradient(135deg,var(--orbit-violet),var(--brand-deep))]',
};

// Pool-split ring: one arc per prize plus the admin cut, so the whole pool reads at a glance.
const ringRadius = 64;
const ringCircumference = 2 * Math.PI * ringRadius;
const ringColor: Record<number, string> = {
  1: 'var(--brand-gleam)',
  2: 'var(--brand-primary)',
  3: 'var(--orbit-violet)',
};
const ringFallback = 'color-mix(in srgb, var(--brand-primary) 45%, transparent)';
const adminRingColor = 'rgb(255 255 255 / 0.28)';

interface PoolArc {
  id: string;
  label: string;
  color: string;
  percent: number;
  start: number;
}

function buildPoolArcs(segments: Omit<PoolArc, 'start'>[]): PoolArc[] {
  return segments.reduce<PoolArc[]>((arcs, segment) => {
    const previous = arcs[arcs.length - 1];
    const start = previous ? previous.start + previous.percent : 0;
    // Clamp so a mis-configured contest (>100%) never wraps past the ring.
    const percent = Math.max(0, Math.min(segment.percent, 100 - start));
    return [...arcs, { ...segment, start, percent }];
  }, []);
}

export function LeaderboardPanel({ contests, selectedId, onSelect, currency }: InsightProps) {
  const contest = contests.find((item) => item.id === selectedId) ?? contests[0];
  if (!contest) return null;
  const prizes = [...contest.details.prizes].sort((a, b) => a.rank - b.rank);
  const topPercent = Math.max(1, ...prizes.map((prize) => prize.percentage));
  const metric = orNotSet(contest.details.rankingBy);
  const adminPercent = Number(contest.details.adminSharePercent) || 0;
  const adminLabel = `${translate('ibInsight.adminCut')} (${adminPercent}%)`;
  const arcs = buildPoolArcs([
    ...prizes.map((prize) => ({
      id: prize.id,
      label: translate('ibInsight.place', { rank: String(prize.rank) }),
      color: ringColor[prize.rank] ?? ringFallback,
      percent: prize.percentage,
    })),
    { id: 'admin', label: translate('ibInsight.adminCut'), color: adminRingColor, percent: adminPercent },
  ]);
  const arcGap = arcs.filter((arc) => arc.percent > 0).length > 1 ? 3 : 0;

  return (
    <div className="space-y-5">
      <ContestSwitcher contests={contests} selectedId={contest.id} onSelect={onSelect} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className={cx('relative isolate animate-rise overflow-hidden rounded-[28px] p-5 text-white ring-1 ring-white/10 motion-reduce:animate-none', graphite)}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 -z-10 size-64 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
          />
          <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 -z-10 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-gleam)_14%,transparent),transparent_70%)]" />

          <div className="flex items-center justify-between gap-3">
            <p className={cx(eyebrow, 'text-white/50')}>{translate('ibInsight.prizeLadder')}</p>
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">{translate('ibInsight.rankedBy', { metric })}</span>
          </div>

          <div className="mt-5 grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="relative mx-auto size-40 animate-rise motion-reduce:animate-none">
              <svg aria-hidden="true" viewBox="0 0 160 160" className="size-full -rotate-90">
                <circle cx="80" cy="80" r={ringRadius} fill="none" strokeWidth="12" className="stroke-white/[0.07]" />
                {arcs.map((arc) => {
                  const length = (arc.percent / 100) * ringCircumference;
                  if (length <= 0) return null;
                  return (
                    <circle
                      key={arc.id}
                      cx="80"
                      cy="80"
                      r={ringRadius}
                      fill="none"
                      strokeWidth="12"
                      stroke={arc.color}
                      strokeOpacity={0.85}
                      strokeDasharray={`${Math.max(0, length - arcGap)} ${ringCircumference}`}
                      strokeDashoffset={-(arc.start / 100) * ringCircumference}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 grid place-content-center justify-items-center px-6 text-center">
                <Icon name="trophy" size={15} className="mb-1 animate-float text-(--brand-gleam) motion-reduce:animate-none" />
                <p className={cx('max-w-full truncate font-mono text-lg leading-tight font-semibold tabular-nums', goldText)}>{formatMoney(contest.totalPool, currency)}</p>
                <p className="text-[11px] text-white/45">{translate('ibContest.totalPool')}</p>
              </div>
            </div>

            <ul className="space-y-2">
              {arcs.map((arc, index) => (
                <li key={arc.id} style={riseDelay(index + 1)} className="flex animate-rise items-center gap-2.5 text-xs motion-reduce:animate-none">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: arc.color }} />
                  <span className="min-w-0 flex-1 truncate text-white/70">{arc.label}</span>
                  <span className="font-mono font-semibold text-white/85 tabular-nums">{arc.percent}%</span>
                </li>
              ))}
            </ul>
          </div>

          <ol className="relative mt-5 border-t border-white/10 pt-2">
            <span aria-hidden="true" className="absolute top-6 bottom-6 left-[13px] w-px bg-linear-to-b from-primary/60 via-primary/25 to-white/10" />
            {prizes.map((prize, index) => (
              <li key={prize.id} style={riseDelay(index + 1)} className="relative flex animate-rise items-start gap-3 py-3 motion-reduce:animate-none">
                <span className={cx('relative z-10 grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold text-(--brand-on-primary) shadow-[0_0_0_4px_rgb(0_0_0_/_0.25)]', medal[prize.rank] ?? 'bg-white/15 text-white')}>
                  {prize.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{translate('ibInsight.place', { rank: String(prize.rank) })}</span>
                    <span className="font-mono text-sm font-semibold text-(--brand-gleam) tabular-nums">{formatMoney((contest.totalPool * prize.percentage) / 100, currency)}</span>
                  </span>
                  <span className="mt-0.5 flex justify-between gap-2 text-[11px] text-white/45">
                    <span className="truncate">
                      {prize.type}
                      {prize.condition ? ` · ${prize.condition}` : ''}
                    </span>
                    <span className="shrink-0">{translate('ibInsight.ofPool', { percent: String(prize.percentage) })}</span>
                  </span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <span
                      style={{ width: `${(prize.percentage / topPercent) * 100}%`, animationDelay: `${index * 120}ms` }}
                      className="block h-full origin-left animate-grow rounded-full bg-linear-to-r from-primary/35 to-primary/75 motion-reduce:animate-none"
                    />
                  </span>
                </span>
              </li>
            ))}
            <li className="relative flex items-center gap-3 pt-3 text-xs text-white/55">
              <span aria-hidden="true" className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-white/30 bg-black/30 text-[10px] font-bold text-white/60">
                %
              </span>
              <span className="min-w-0 flex-1 truncate">{adminLabel}</span>
              <span className="font-mono font-semibold text-white/80 tabular-nums">{formatMoney(contest.adminShare, currency)}</span>
            </li>
          </ol>
        </section>

        <section style={riseDelay(1)} className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none')}>
          <PanelHeader icon="areaChart" title={translate('ibInsight.standings')} />
          <WaitingState
            icon="areaChart"
            title={translate('ibContest.leaderboardEmpty')}
            body={contest.status === 'draft' ? translate('ibInsight.waitApproval') : contest.status === 'ended' ? translate('ibInsight.ended') : translate('ibInsight.standingsWait')}
          />
        </section>
      </div>
    </div>
  );
}
