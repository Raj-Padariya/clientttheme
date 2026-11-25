'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbContest } from '@/core/mock/ibContests';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

const cardClass = 'rounded-[28px] border border-line bg-surface shadow-card';
const graphite = 'bg-[#18181b]';
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

function ContestSwitcher({ contests, selectedId, onSelect }: Omit<InsightProps, 'currency'>) {
  return (
    <div className={cx(cardClass, 'p-2')}>
      <p className={cx(eyebrow, 'px-3 pt-2 pb-2 text-fg-subtle')}>{translate('ibInsight.pickContest')}</p>
      <div role="radiogroup" aria-label={translate('ibInsight.pickContest')} className="flex gap-1.5 overflow-x-auto [scrollbar-width:thin] xl:flex-col xl:overflow-visible">
        {contests.map((contest) => {
          const isActive = contest.id === selectedId;
          return (
            <button
              key={contest.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(contest.id)}
              className={cx(
                'group flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-2 text-left text-sm font-semibold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? cx(graphite, 'text-white') : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              <span className={cx('grid size-7 shrink-0 place-items-center rounded-lg transition-colors', isActive ? cx(goldFill, 'text-[#18181b]') : 'bg-surface-2 text-fg-subtle group-hover:text-primary')}>
                <Icon name="trophy" size={13} />
              </span>
              <span className="max-w-40 min-w-0 flex-1 truncate">{contest.name}</span>
              {isActive && <Icon name="chevronRight" size={14} className="hidden shrink-0 text-(--brand-gleam) xl:block" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WaitingState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="relative isolate flex flex-col items-center px-6 py-12 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-5 -z-10 space-y-2.5 opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
            <span className="size-7 rounded-full bg-surface-2" />
            <span className="h-2 w-1/4 rounded-full bg-surface-2" />
            <span className="ml-auto h-2 w-14 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
      <span className="relative grid size-20 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border-2 border-dashed border-primary/40 [animation-duration:16s] motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-orbit [animation-duration:4s] motion-reduce:hidden">
          <span className={cx('absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />
        </span>
        <span className={cx('grid size-12 animate-float place-items-center rounded-2xl text-(--brand-gleam) ring-1 ring-primary/50 motion-reduce:animate-none', graphite)}>
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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-fg">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon name={icon} size={15} />
        </span>
        {title}
      </h3>
      {aside}
    </header>
  );
}

/* ───────────── Enrollments ───────────── */

// Journey as a row of segments: gold for finished steps, a graphite pill for the current one.
function JourneyStepper({ contest }: { contest: IbContest }) {
  const current = journeyIndex[contest.status];
  return (
    <section className={cx(cardClass, 'animate-rise p-5 motion-reduce:animate-none')}>
      <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibInsight.journey')}</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
        {journey.map((step, index) => {
          const isDone = index < current;
          const isNow = index === current;
          return (
            <li
              key={step.labelKey}
              style={riseDelay(index)}
              className={cx(
                'relative flex animate-rise items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2.5 ring-1 motion-reduce:animate-none sm:flex-col sm:items-start',
                isNow ? cx(graphite, 'text-white ring-primary/50') : isDone ? 'bg-primary/[0.07] ring-primary/25' : 'bg-surface-2/50 ring-line',
              )}
            >
              <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-0.5', isDone || isNow ? goldFill : 'bg-transparent')} />
              <span
                className={cx(
                  'relative grid size-8 shrink-0 place-items-center rounded-lg',
                  isDone && cx(goldFill, 'text-[#18181b]'),
                  isNow && 'bg-white/[0.08] text-(--brand-gleam)',
                  !isDone && !isNow && 'bg-surface text-fg-subtle ring-1 ring-line',
                )}
              >
                {isNow && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-lg border border-primary motion-reduce:hidden" />}
                <Icon name={isDone ? 'check' : step.icon} size={14} />
              </span>
              <span className="min-w-0">
                <span className={cx('block truncate text-xs font-semibold', isNow ? 'text-white' : isDone ? 'text-fg' : 'text-fg-subtle')}>{translate(step.labelKey)}</span>
                {(isDone || isNow) && (
                  <span className={cx('block text-[10px] font-bold tracking-wide uppercase', isNow ? 'text-(--brand-gleam)' : 'text-fg-subtle')}>
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

function SeatsRing({ contest }: { contest: IbContest }) {
  const { maxParticipants, minParticipants } = contest.details;
  const filled = maxParticipants > 0 ? Math.min(1, contest.participants / maxParticipants) : 0;
  const minAngle = maxParticipants > 0 ? (Math.min(minParticipants, maxParticipants) / maxParticipants) * 360 : 0;
  return (
    <section className={cx('relative isolate flex animate-rise flex-col items-center overflow-hidden rounded-[28px] p-5 text-white ring-1 ring-white/10 motion-reduce:animate-none', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-16 -z-10 size-56 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_26%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <p className={cx(eyebrow, 'self-start text-white/50')}>{translate('ibInsight.capacity')}</p>
      <div className="relative mt-3 grid size-40 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-orbit rounded-full border border-dashed border-white/15 [animation-duration:24s] motion-reduce:animate-none" />
        <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-3 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" className="stroke-white/10" />
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray={`${filled} 1`} style={{ stroke: 'var(--brand-gleam)' }} />
        </svg>
        {/* Minimum-to-run marker on the ring. */}
        <span aria-hidden="true" style={{ transform: `rotate(${minAngle}deg)` }} className="absolute inset-3">
          <span className="absolute -top-1 left-1/2 h-3.5 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_var(--brand-primary)]" />
        </span>
        <span className="relative text-center">
          <span className={cx('block font-mono text-4xl font-semibold tabular-nums', goldText)}>{contest.participants}</span>
          <span className="block text-xs text-white/55">{translate('ibInsight.capacityOf', { count: String(contest.participants), max: String(maxParticipants) })}</span>
        </span>
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
        <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-white" />
        {translate('ibInsight.minToRun', { min: String(minParticipants) })}
      </span>
    </section>
  );
}

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
      <ol className="relative mt-4 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
        {rows.map((row) => (
          <li key={row.labelKey} className="relative flex items-center gap-3">
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-surface text-primary ring-1 ring-primary/40">
              <Icon name={row.icon} size={13} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-fg-subtle">{translate(row.labelKey)}</span>
              <span className={cx('block truncate font-mono text-sm tabular-nums', row.value ? 'font-semibold text-fg' : 'text-fg-subtle')}>{formatWhen(row.value)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

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
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {rules.map((rule) => (
          <div key={rule.labelKey} className="min-w-0 rounded-2xl bg-surface-2/60 px-3.5 py-2.5 ring-1 ring-line">
            <dt className="truncate text-[11px] text-fg-subtle">{translate(rule.labelKey)}</dt>
            <dd className={cx('mt-0.5 truncate text-sm', rule.value ? 'font-semibold text-fg' : 'text-fg-subtle')}>{orNotSet(rule.value)}</dd>
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
    <div className="grid items-start gap-5 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-5">
        <ContestSwitcher contests={contests} selectedId={contest.id} onSelect={onSelect} />
        <SeatsRing contest={contest} />
      </div>
      <div className="min-w-0 space-y-5">
        <JourneyStepper key={`journey-${contest.id}`} contest={contest} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <ScheduleCard contest={contest} />
          <JoinRules contest={contest} />
        </div>
        <section style={riseDelay(3)} className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none')}>
          <PanelHeader
            icon="user"
            title={translate('ibInsight.participants')}
            aside={<span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg-muted ring-1 ring-line tabular-nums">{contest.participants}</span>}
          />
          <WaitingState icon="user" title={translate('ibContest.enrollmentsEmpty')} body={waitingBody(contest)} />
        </section>
      </div>
    </div>
  );
}

/* ───────────── Leaderboard ───────────── */

const medal: Record<number, string> = {
  1: goldFill,
  2: '[background-image:linear-gradient(135deg,#f4f4f5,#a1a1aa)]',
  3: '[background-image:linear-gradient(135deg,#f0b98a,#b45309)]',
};

export function LeaderboardPanel({ contests, selectedId, onSelect, currency }: InsightProps) {
  const contest = contests.find((item) => item.id === selectedId) ?? contests[0];
  if (!contest) return null;
  const prizes = [...contest.details.prizes].sort((a, b) => a.rank - b.rank);
  const topPercent = Math.max(1, ...prizes.map((prize) => prize.percentage));
  const metric = orNotSet(contest.details.rankingBy);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <ContestSwitcher contests={contests} selectedId={contest.id} onSelect={onSelect} />
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Prize ladder: one row per rank, medal badge, share track and payout. */}
        <section className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none')}>
          <div className={cx('relative isolate overflow-hidden px-5 py-4 text-white', graphite)}>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-16 -z-10 size-56 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cx(eyebrow, 'text-white/50')}>{translate('ibInsight.prizeLadder')}</p>
              <span className="rounded-md bg-white/[0.07] px-2 py-0.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">{translate('ibInsight.rankedBy', { metric })}</span>
            </div>
            <p className={cx('mt-2 font-mono text-3xl font-semibold tabular-nums', goldText)}>{formatMoney(contest.totalPool, currency)}</p>
            <p className="text-xs text-white/45">{translate('ibContest.totalPool')}</p>
          </div>

          <ol className="divide-y divide-line">
            {prizes.map((prize, index) => (
              <li key={prize.id} style={riseDelay(index + 1)} className="grid animate-rise grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 motion-reduce:animate-none">
                <span className={cx('grid size-9 place-items-center rounded-xl font-mono text-sm font-bold text-[#18181b]', medal[prize.rank] ?? 'bg-surface-2 text-fg-muted ring-1 ring-line')}>{prize.rank}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{translate('ibInsight.place', { rank: String(prize.rank) })}</span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      style={{ width: `${(prize.percentage / topPercent) * 100}%`, animationDelay: `${index * 120}ms` }}
                      className={cx('block h-full origin-left animate-grow rounded-full motion-reduce:animate-none', medal[prize.rank] ?? 'bg-fg/40')}
                    />
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-fg-subtle">
                    {translate('ibInsight.ofPool', { percent: String(prize.percentage) })} · {prize.type}
                    {prize.condition ? ` · ${prize.condition}` : ''}
                  </span>
                </span>
                <span className="font-mono text-sm font-semibold text-primary tabular-nums">{formatMoney((contest.totalPool * prize.percentage) / 100, currency)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 bg-surface-2/50 px-5 py-3 text-xs text-fg-muted">
              <span>
                {translate('ibInsight.adminCut')} ({contest.details.adminSharePercent}%)
              </span>
              <span className="font-mono font-semibold text-fg tabular-nums">{formatMoney(contest.adminShare, currency)}</span>
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
