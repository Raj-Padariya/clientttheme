'use client';

import Link from 'next/link';
import type { CSSProperties, PointerEvent } from 'react';
import { formatMoney } from '@/core/format';
import { useDemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { contestText as text, getLeaderboard, type LeaderboardEntry } from './contestDetails';
import { useEnrolledContestIds } from './contestEnrollment';
import { useAnimatedNumber } from './ScratchExperience';

const boardText = {
  traders: 'Traders',
  leader: 'Leader',
  topReturn: 'Top Return',
  yourRank: 'Your Rank',
  race: 'Race to the top',
};

const returnFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });
const COUNT_UP_MS = 1400;

/** Stage order: 2nd left, 1st centre, 3rd right. */
const STAGE_ORDER = [2, 1, 3];
const pillarHeight: Record<number, string> = { 1: 'h-40 sm:h-44', 2: 'h-28 sm:h-32', 3: 'h-20 sm:h-24' };
const medalFill: Record<number, string> = {
  1: 'from-primary via-primary/80 to-primary/45',
  2: 'from-fg/70 via-fg/40 to-fg/15',
  3: 'from-primary/60 via-primary/35 to-primary/10',
};

/** Fixed ember positions so server and client render the same sparks. */
const EMBERS = [
  { left: '18%', delay: 0, drift: 14 },
  { left: '27%', delay: 2.4, drift: -10 },
  { left: '38%', delay: 1.1, drift: 8 },
  { left: '46%', delay: 3.6, drift: -16 },
  { left: '52%', delay: 0.6, drift: 12 },
  { left: '61%', delay: 2.9, drift: -6 },
  { left: '70%', delay: 1.7, drift: 18 },
  { left: '80%', delay: 4.2, drift: -12 },
];

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z]/gi, '').charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || '?';
}

function CountMoney({ value, currency }: { value: number; currency: string }) {
  const shown = useAnimatedNumber(value, COUNT_UP_MS);
  return <>{formatMoney(shown, currency)}</>;
}

function ReturnPill({ value }: { value: number }) {
  const isLoss = value < 0;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1', isLoss ? 'bg-danger-soft text-danger ring-danger/30' : 'bg-success-soft text-success ring-success/30')}>
      <Icon name={isLoss ? 'trendDown' : 'trendUp'} size={12} />
      {returnFormat.format(value)}%
    </span>
  );
}

function YouTag() {
  return <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-on-primary shadow-[0_0_12px_-2px_var(--brand-primary)]">{text.you}</span>;
}

/** LIVE chip with a three-bar equaliser instead of a static dot. */
function LiveChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-danger-soft px-3 py-1.5 text-xs font-bold tracking-[0.2em] text-danger ring-1 ring-danger/30">
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0, 0.3, 0.6].map((delay) => (
          <span key={delay} style={{ animationDelay: `${delay}s` }} className="h-full w-[3px] origin-bottom animate-bar-sway rounded-full bg-danger [animation-duration:0.9s] motion-reduce:animate-none" />
        ))}
      </span>
      {text.live}
    </span>
  );
}

function StageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="kpi-texture absolute inset-0 opacity-60" />
      {/* Two spotlights hung from the top edge, swinging out of phase. */}
      <span
        style={{ '--beam-from': '-18deg', '--beam-to': '6deg' } as CSSProperties}
        className="absolute -top-10 left-[28%] h-[130%] w-40 origin-top animate-beam-swing bg-linear-to-b from-primary/35 via-primary/10 to-transparent blur-md [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] motion-reduce:animate-none"
      />
      <span
        style={{ '--beam-from': '16deg', '--beam-to': '-8deg', animationDelay: '-4s' } as CSSProperties}
        className="absolute -top-10 right-[28%] h-[130%] w-40 origin-top animate-beam-swing bg-linear-to-b from-primary/30 via-primary/10 to-transparent blur-md [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] motion-reduce:animate-none"
      />
      <span className="absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 animate-glow rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
      {/* Perspective grid floor under the podium, scrolling toward the viewer. */}
      <div className="absolute inset-x-[-20%] bottom-0 h-40 [perspective:500px]">
        <div className="absolute inset-0 origin-bottom animate-floor-scroll [transform:rotateX(62deg)] bg-[linear-gradient(to_right,color-mix(in_srgb,var(--brand-primary)_22%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--brand-primary)_22%,transparent)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_top,black,transparent)] motion-reduce:animate-none" />
      </div>
      {EMBERS.map((ember) => (
        <span
          key={ember.left}
          style={{ left: ember.left, animationDelay: `${ember.delay}s`, '--ember-x': `${ember.drift}px` } as CSSProperties}
          className="absolute bottom-10 size-1.5 animate-ember rounded-full bg-primary shadow-[0_0_8px_2px_var(--brand-primary)] motion-reduce:hidden"
        />
      ))}
    </div>
  );
}

function StatChip({ icon, label, value, delay }: { icon: IconName; label: string; value: string; delay: number }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="flex animate-rise items-center gap-2.5 rounded-2xl bg-surface/60 px-3 py-2 ring-1 ring-line backdrop-blur-sm motion-reduce:animate-none">
      <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{label}</p>
        <p className="truncate text-sm font-bold tabular-nums text-fg">{value}</p>
      </div>
    </div>
  );
}

function PodiumColumn({ entry, currency, index }: { entry: LeaderboardEntry; currency: string; index: number }) {
  const isChampion = entry.rank === 1;
  const riseDelay = 200 + index * 160;

  return (
    <li className="flex min-w-0 flex-col items-center">
      <div style={{ animationDelay: `${riseDelay + 450}ms` }} className="relative flex animate-rise flex-col items-center gap-2 pb-4 text-center motion-reduce:animate-none">
        {isChampion && (
          <span className="relative mb-1 animate-float text-primary [animation-duration:3s] motion-reduce:animate-none">
            <Icon name="trophy" size={26} className="drop-shadow-[0_0_12px_var(--brand-primary)]" />
            {['-left-3 top-0', '-right-3 top-1', 'left-1/2 -top-3'].map((position, sparkIndex) => (
              <span key={position} aria-hidden="true" style={{ animationDelay: `${sparkIndex * 0.6}s` }} className={cx('absolute size-1 animate-twinkle rounded-full bg-primary motion-reduce:hidden', position)} />
            ))}
          </span>
        )}
        <span className={cx('relative grid place-items-center rounded-full', isChampion ? 'size-20 sm:size-24' : 'size-14 sm:size-16')}>
          {/* Conic halo turning behind the avatar, with a satellite dot riding an outer orbit. */}
          <span aria-hidden="true" className={cx('absolute -inset-1 animate-orbit rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_35%,transparent_65%,var(--brand-primary))] motion-reduce:animate-none', !isChampion && 'opacity-60 [animation-duration:10s]')} />
          <span aria-hidden="true" className="absolute -inset-3 animate-orbit rounded-full [animation-direction:reverse] [animation-duration:5s] motion-reduce:hidden">
            <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_2px_var(--brand-primary)]" />
          </span>
          <span className={cx('relative grid size-full place-items-center rounded-full bg-linear-to-br font-black text-on-primary ring-4 ring-surface', medalFill[entry.rank], isChampion ? 'text-2xl' : 'text-lg')}>
            {initials(entry.trader)}
          </span>
        </span>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-fg sm:text-base">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag />}
        </p>
        <p className="text-xs tabular-nums text-fg-muted sm:text-sm">
          <CountMoney value={entry.equity} currency={currency} />
        </p>
        <ReturnPill value={entry.returnPercent} />
      </div>

      <div
        style={{ animationDelay: `${riseDelay}ms` }}
        className={cx(
          'group relative w-full origin-bottom animate-bar-rise overflow-hidden rounded-t-2xl bg-linear-to-b ring-1 motion-reduce:animate-none',
          pillarHeight[entry.rank],
          isChampion ? 'from-primary/45 via-primary/20 to-primary/5 ring-primary/50' : 'from-fg/15 via-fg/[0.06] to-transparent ring-line',
        )}
      >
        <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-1', isChampion ? 'bg-primary shadow-[0_0_18px_4px_var(--brand-primary)]' : 'bg-fg/30')} />
        <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span className={cx('absolute inset-x-0 top-3 text-center font-black tabular-nums', isChampion ? 'text-6xl text-primary/40 sm:text-7xl' : 'text-5xl text-fg/15 sm:text-6xl')}>{entry.rank}</span>
      </div>
    </li>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const isPodium = rank <= 3;
  return (
    <span
      className={cx(
        'relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-black tabular-nums',
        isPodium ? cx('bg-linear-to-br text-on-primary shadow-[0_8px_20px_-10px_var(--brand-primary)]', medalFill[rank]) : 'bg-surface text-fg-muted ring-1 ring-line',
      )}
    >
      {isPodium && <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />}
      <span className="relative">#{rank}</span>
    </span>
  );
}

/** Race lane: a runner dot dashes from the start line to the trader's share of the best return. */
function RaceLane({ share, isYou }: { share: number; isYou: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-3 w-full">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-fg/20" />
      <span className="absolute top-1/2 left-0 h-1 origin-left -translate-y-1/2 animate-grow rounded-full bg-linear-to-r from-transparent via-primary/50 to-primary [animation-delay:0.4s] motion-reduce:animate-none" style={{ width: `${share}%` }} />
      <span
        style={{ left: `${share}%` }}
        className={cx('absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 animate-lane-run rounded-full ring-2 ring-surface motion-reduce:animate-none', isYou ? 'bg-primary shadow-[0_0_12px_3px_var(--brand-primary)]' : 'bg-success shadow-[0_0_8px_1px_var(--color-success,currentColor)]')}
      />
      <Icon name="trophy" size={12} className="absolute top-1/2 -right-1 -translate-y-1/2 text-primary/60" />
    </span>
  );
}

function trackPointer(event: PointerEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
}

function LeaderRow({ entry, currency, bestReturn, index }: { entry: LeaderboardEntry; currency: string; bestReturn: number; index: number }) {
  // Share of the best return, so the lane shows how close each trader is to the lead (everyone level = all at the finish).
  const share = bestReturn <= 0 ? 92 : Math.max(6, (Math.max(0, entry.returnPercent) / bestReturn) * 92);

  const row = (
    <div
      onPointerMove={trackPointer}
      className={cx(
        'group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 overflow-hidden rounded-2xl p-3.5 transition-[translate] duration-300 hover:translate-x-1 md:grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_7rem]',
        entry.isYou ? 'bg-surface' : 'bg-surface-2/50 ring-1 ring-line',
      )}
    >
      {/* Pointer-following spotlight. */}
      <span
        aria-hidden="true"
        style={{ background: 'radial-gradient(220px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--brand-primary) 16%, transparent), transparent 70%)' }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <RankMedal rank={entry.rank} />
      <div className="relative flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110">{initials(entry.trader)}</span>
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-fg">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag />}
        </p>
      </div>
      <span className="relative hidden pr-4 md:block">
        <RaceLane share={share} isYou={entry.isYou} />
      </span>
      <span className="relative hidden md:block">
        <span className="rounded-lg bg-surface px-2 py-1 font-mono text-xs text-fg-muted ring-1 ring-line transition-colors group-hover:text-fg group-hover:ring-primary/30">{entry.account}</span>
      </span>
      <span className={cx('relative hidden text-sm tabular-nums md:block', entry.isYou ? 'font-bold text-fg' : 'text-fg')}>
        <CountMoney value={entry.equity} currency={currency} />
      </span>
      <span className="relative justify-self-end">
        <ReturnPill value={entry.returnPercent} />
      </span>
      <div className="relative col-span-3 flex flex-col gap-2 md:hidden">
        <RaceLane share={share} isYou={entry.isYou} />
        <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
          <span className="rounded-lg bg-surface px-2 py-1 font-mono ring-1 ring-line">{entry.account}</span>
          <span className="tabular-nums text-fg">
            <CountMoney value={entry.equity} currency={currency} />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <li style={{ animationDelay: `${600 + index * 90}ms` }} className="animate-rise motion-reduce:animate-none">
      {entry.isYou ? (
        // The client's row gets a turning gold border: a spinning conic layer clipped to a 1.5px frame.
        <div className="relative overflow-hidden rounded-2xl p-[1.5px] shadow-[0_14px_36px_-18px_var(--brand-primary)]">
          <span aria-hidden="true" className="absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-orbit bg-[conic-gradient(var(--brand-primary),transparent_30%,transparent_70%,var(--brand-primary))] [animation-duration:5s] motion-reduce:animate-none" />
          <div className="relative rounded-[calc(1rem-1.5px)] bg-surface">{row}</div>
        </div>
      ) : (
        row
      )}
    </li>
  );
}

export default function ContestLeaderboardPage({ contestId }: { contestId: string }) {
  const { data, isLoading } = useDemoContest();
  const enrolledIds = useEnrolledContestIds();

  const backLink = (
    <Link
      href={`/promotion/demo-contest/${contestId}`}
      className="group inline-flex items-center gap-2 self-start rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon name="arrowLeft" size={15} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      {text.backToDashboard}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-[28rem] rounded-[28px]" />
        <Skeleton className="h-80 rounded-[28px]" />
      </div>
    );
  }

  const contest = data.contests.find((item) => item.id === contestId);
  const isEnrolled = contest ? [...data.enrolledIds, ...enrolledIds].includes(contest.id) : false;
  const rows = contest ? getLeaderboard(contest, isEnrolled) : [];
  const stage = STAGE_ORDER.map((rank) => rows.find((entry) => entry.rank === rank)).filter((entry): entry is LeaderboardEntry => entry !== undefined);
  const bestReturn = Math.max(0, ...rows.map((entry) => entry.returnPercent));
  const leader = rows[0];
  const you = rows.find((entry) => entry.isYou);

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <section className="kpi-card relative isolate animate-rise overflow-hidden rounded-[28px] motion-reduce:animate-none">
        <StageBackdrop />

        <div className="relative flex flex-col gap-6 px-5 pt-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.24em] text-primary uppercase">{boardText.race}</p>
              <h1 className="mt-1 animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-3xl font-black tracking-tight text-transparent motion-reduce:animate-none sm:text-4xl">
                {text.leaderboardTitle}
              </h1>
              {contest && <p className="mt-1 text-sm text-fg-muted capitalize">{contest.name}</p>}
            </div>
            <LiveChip />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <StatChip icon="user" label={boardText.traders} value={String(rows.length)} delay={120} />
            {leader && <StatChip icon="trophy" label={boardText.leader} value={leader.trader} delay={180} />}
            {leader && <StatChip icon="trendUp" label={boardText.topReturn} value={`${returnFormat.format(leader.returnPercent)}%`} delay={240} />}
            {you && <StatChip icon="barChart" label={boardText.yourRank} value={`#${you.rank}`} delay={300} />}
          </div>

          {stage.length > 0 && (
            <ol className="mx-auto grid w-full max-w-2xl grid-cols-3 items-end gap-3 pt-4 sm:gap-5">
              {stage.map((entry, index) => (
                <PodiumColumn key={entry.id} entry={entry} currency={data.currency} index={index} />
              ))}
            </ol>
          )}
        </div>
      </section>

      <section style={{ animationDelay: '220ms' }} className="flex animate-rise flex-col gap-3 rounded-[28px] border border-line bg-surface p-4 shadow-card motion-reduce:animate-none sm:p-5">
        <div className="hidden grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_7rem] gap-x-4 px-3.5 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle md:grid">
          <span>{text.rank}</span>
          <span>{text.trader}</span>
          <span aria-hidden="true" />
          <span>{text.account}</span>
          <span>{text.equity}</span>
          <span className="text-right">{text.returnPercent}</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-muted">{text.noTraders}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((entry, index) => (
              <LeaderRow key={entry.id} entry={entry} currency={data.currency} bestReturn={bestReturn} index={index} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
