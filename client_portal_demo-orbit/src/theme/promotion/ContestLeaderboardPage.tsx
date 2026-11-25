'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
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
const LANE_COLUMNS = 'md:grid-cols-[3.5rem_minmax(0,10rem)_minmax(0,1fr)_6.5rem_7.5rem_6.5rem]';
const CHECKER_CLASS = 'bg-[repeating-conic-gradient(var(--color-fg)_0_25%,transparent_0_50%)] bg-[length:6px_6px]';

const medalTone: Record<number, { disc: string; ribbon: string; text: string }> = {
  1: { disc: 'fill-primary/25 stroke-primary', ribbon: 'fill-primary/60', text: 'fill-primary' },
  2: { disc: 'fill-fg/10 stroke-fg/50', ribbon: 'fill-fg/35', text: 'fill-fg' },
  3: { disc: 'fill-primary/10 stroke-primary/50', ribbon: 'fill-primary/30', text: 'fill-fg' },
};

/** Fixed confetti so server and client render the same pieces. */
const CONFETTI = [
  { left: 4, delay: 0, drift: 18, spin: 520, tone: 'bg-primary', shape: 'h-2.5 w-1.5 rounded-[1px]' },
  { left: 11, delay: 2.1, drift: -14, spin: -460, tone: 'bg-[var(--orbit-violet)]', shape: 'size-1.5 rounded-full' },
  { left: 19, delay: 0.9, drift: 10, spin: 600, tone: 'bg-fg/60', shape: 'h-2 w-1 rounded-[1px]' },
  { left: 27, delay: 3.4, drift: -20, spin: -540, tone: 'bg-primary', shape: 'size-1.5 rounded-full' },
  { left: 35, delay: 1.6, drift: 14, spin: 480, tone: 'bg-[var(--orbit-violet)]', shape: 'h-2.5 w-1.5 rounded-[1px]' },
  { left: 44, delay: 4.2, drift: -8, spin: -620, tone: 'bg-primary/70', shape: 'h-2 w-1 rounded-[1px]' },
  { left: 52, delay: 0.4, drift: 22, spin: 560, tone: 'bg-fg/50', shape: 'size-1.5 rounded-full' },
  { left: 60, delay: 2.8, drift: -16, spin: -500, tone: 'bg-primary', shape: 'h-2.5 w-1.5 rounded-[1px]' },
  { left: 68, delay: 1.2, drift: 12, spin: 640, tone: 'bg-[var(--orbit-violet)]', shape: 'h-2 w-1 rounded-[1px]' },
  { left: 76, delay: 3.9, drift: -22, spin: -580, tone: 'bg-primary/70', shape: 'size-1.5 rounded-full' },
  { left: 84, delay: 0.7, drift: 16, spin: 470, tone: 'bg-fg/60', shape: 'h-2.5 w-1.5 rounded-[1px]' },
  { left: 92, delay: 2.5, drift: -12, spin: -520, tone: 'bg-primary', shape: 'h-2 w-1 rounded-[1px]' },
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

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

function CountMoney({ value, currency }: { value: number; currency: string }) {
  const shown = useAnimatedNumber(value, COUNT_UP_MS);
  return <>{formatMoney(shown, currency)}</>;
}

function ReturnPill({ value }: { value: number }) {
  const isLoss = value < 0;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums', isLoss ? 'border-danger/35 text-danger' : 'border-success/35 text-success')}>
      <Icon name={isLoss ? 'trendDown' : 'trendUp'} size={12} />
      {returnFormat.format(value)}%
    </span>
  );
}

function YouTag() {
  return <span className="rounded-md border border-primary/50 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary">{text.you}</span>;
}

/** LIVE chip with a three-bar equaliser instead of a static dot. */
function LiveChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-danger/35 bg-danger/[0.06] px-3 py-1.5 text-xs font-bold tracking-[0.2em] text-danger">
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0, 0.3, 0.6].map((delay) => (
          <span key={delay} style={{ animationDelay: `${delay}s` }} className="h-full w-[3px] origin-bottom animate-eq-bar rounded-full bg-danger [animation-duration:0.9s] motion-reduce:animate-none" />
        ))}
      </span>
      {text.live}
    </span>
  );
}

/** A ribboned medal drawn in SVG; the rank sits on the disc. */
function Medal({ rank, size }: { rank: number; size: number }) {
  const tone = medalTone[rank];
  return (
    <svg viewBox="0 0 48 58" width={size} height={Math.round(size * (58 / 48))} aria-hidden="true" className="shrink-0">
      <polygon points="10,0 20,0 29,22 19,22" className={tone.ribbon} />
      <polygon points="38,0 28,0 19,22 29,22" className={cx(tone.ribbon, 'opacity-70')} />
      <circle cx="24" cy="38" r="17" strokeWidth="2" className={tone.disc} />
      <circle cx="24" cy="38" r="12.5" fill="none" strokeWidth="1" strokeDasharray="1.5 2.5" className={tone.disc} />
      <text x="24" y="43.5" textAnchor="middle" className={cx('font-mono text-[15px] font-bold', tone.text)}>
        {rank}
      </text>
    </svg>
  );
}

function ScoreCell({ icon, label, value, delay }: { icon: IconName; label: string; value: string; delay: number }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="relative flex animate-rise flex-col gap-2 overflow-hidden rounded-xl border border-line bg-fg/[0.02] p-3 motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">
        <Icon name={icon} size={13} className="text-primary" />
        {label}
      </dt>
      <dd className="truncate font-mono text-xl font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  );
}


/** 2nd / 3rd place riding the middle ring; the inner wrapper counter-spins so the card stays upright. */
function Satellite({ entry, placement }: { entry: LeaderboardEntry; placement: 'top' | 'bottom' }) {
  return (
    <div className={cx('absolute left-1/2 -translate-x-1/2', placement === 'top' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2')}>
      <div className="flex w-28 animate-ring-ride-counter flex-col items-center gap-1 text-center motion-reduce:animate-none">
        <span className="relative grid size-14 place-items-center rounded-full border border-primary/40 bg-surface text-sm font-bold text-fg shadow-[0_0_24px_-8px_var(--brand-primary)]">
          {initials(entry.trader)}
          <span className="absolute -right-2 -bottom-2">
            <Medal rank={entry.rank} size={22} />
          </span>
        </span>
        <span className="flex max-w-full items-center gap-1 text-xs font-semibold text-fg">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag />}
        </span>
        <ReturnPill value={entry.returnPercent} />
      </div>
    </div>
  );
}

function ChampionOrbit({ rows, currency }: { rows: LeaderboardEntry[]; currency: string }) {
  const champion = rows.find((entry) => entry.rank === 1);
  const second = rows.find((entry) => entry.rank === 2);
  const third = rows.find((entry) => entry.rank === 3);
  const chasers = rows.filter((entry) => entry.rank > 3);

  return (
    <div aria-hidden="true" className="relative mx-auto my-10 aspect-square w-full max-w-[22rem] lg:my-12">
      <span className="absolute inset-0 rounded-full border border-dashed border-primary/20" />
      <span className="absolute inset-[16%] rounded-full border border-primary/25" />
      <span className="absolute inset-[32%] rounded-full border border-primary/35 bg-primary/[0.05]" />
      {[0, 1.2].map((delay) => (
        <span key={delay} style={{ animationDelay: `${delay}s` }} className="absolute inset-[34%] animate-pulse-ring rounded-full border border-primary/50 motion-reduce:hidden" />
      ))}

      {/* Rank 4+ drift on the outer ring. */}
      <div className="absolute inset-0 animate-ring-ride-slow motion-reduce:animate-none">
        {chasers.map((entry, index) => {
          const angle = ((index / Math.max(1, chasers.length)) * 360 + 35) * (Math.PI / 180);
          const position: CSSProperties = {
            left: `${(50 + 50 * Math.cos(angle)).toFixed(2)}%`,
            top: `${(50 + 50 * Math.sin(angle)).toFixed(2)}%`,
          };
          return (
            <span key={entry.id} style={position} className="absolute -translate-x-1/2 -translate-y-1/2">
              <span className="relative grid size-9 animate-ring-ride-slow-counter place-items-center rounded-full border border-fg/20 bg-surface text-[10px] font-bold text-fg-muted motion-reduce:animate-none">
                {initials(entry.trader)}
                <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-fg/15 font-mono text-[9px] text-fg">{entry.rank}</span>
              </span>
            </span>
          );
        })}
      </div>

      {/* 2nd and 3rd ride opposite points of the middle ring. */}
      <div className="absolute inset-[16%] animate-ring-ride motion-reduce:animate-none">
        {second && <Satellite entry={second} placement="top" />}
        {third && <Satellite entry={third} placement="bottom" />}
      </div>

      {champion && (
        <div className="absolute inset-[32%] flex flex-col items-center justify-center gap-1.5 text-center">
          <Icon name="trophy" size={22} className="absolute -top-9 animate-float text-primary drop-shadow-[0_0_10px_var(--brand-primary)] [animation-duration:3s] motion-reduce:animate-none" />
          <span className="relative grid size-16 place-items-center rounded-full">
            <span className="absolute -inset-1 animate-orbit-spin-fast rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_40%,var(--orbit-violet)_70%,var(--brand-primary))] motion-reduce:animate-none" />
            <span className="relative grid size-full place-items-center rounded-full bg-surface text-xl font-bold text-primary ring-4 ring-surface">{initials(champion.trader)}</span>
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-fg">
            <span className="max-w-24 truncate">{champion.trader}</span>
            {champion.isYou && <YouTag />}
          </span>
          <span className="font-mono text-[11px] text-fg-muted tabular-nums">
            <CountMoney value={champion.equity} currency={currency} />
          </span>
        </div>
      )}
    </div>
  );
}

function RaceTrack({ share, isYou, isLeader, delayMs, isMounted }: { share: number; isYou: boolean; isLeader: boolean; delayMs: number; isMounted: boolean }) {
  // Leave room for the finish line so a full share parks the runner just before it.
  const reach = isMounted ? share * 0.9 + 4 : 4;
  const motion = `${1400}ms cubic-bezier(.2,.7,.2,1) ${delayMs}ms`;

  return (
    <span aria-hidden="true" className="relative block h-8">
      <span className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-full border border-line bg-fg/[0.02]" />
      <span className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 animate-lane-dash bg-[repeating-linear-gradient(90deg,color-mix(in_srgb,var(--color-fg)_22%,transparent)_0_12px,transparent_12px_24px)] motion-reduce:animate-none" />
      <span className="absolute inset-y-1 right-2 w-1.5 rounded-sm opacity-40">
        <span className={cx('block size-full rounded-sm', CHECKER_CLASS)} />
      </span>
      <span
        className={cx('absolute top-1/2 left-0 h-6 -translate-y-1/2 overflow-hidden rounded-full bg-linear-to-r from-transparent', isYou ? 'to-primary/45' : 'to-primary/20')}
        style={{ width: `${reach}%`, transition: `width ${motion}` }}
      >
        <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-fg/20 to-transparent motion-reduce:hidden" />
      </span>
      <span
        className={cx(
          'absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform duration-300 group-hover:scale-125',
          isYou ? 'bg-primary text-on-primary shadow-[0_0_16px_2px_var(--brand-primary)]' : 'border border-primary/50 bg-surface text-primary',
        )}
        style={{ left: `${reach}%`, transition: `left ${motion}, transform 300ms` }}
      >
        <Icon name={isLeader ? 'trophy' : 'trendUp'} size={12} />
      </span>
    </span>
  );
}

function LaneRow({ entry, currency, share, index, isMounted }: { entry: LeaderboardEntry; currency: string; share: number; index: number; isMounted: boolean }) {
  const delayMs = 500 + index * 140;
  const isPodium = entry.rank <= 3;
  const track = <RaceTrack share={share} isYou={entry.isYou} isLeader={entry.rank === 1} delayMs={delayMs} isMounted={isMounted} />;

  return (
    <li
      style={{ animationDelay: `${300 + index * 110}ms` }}
      className={cx(
        'group relative grid animate-rise grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 overflow-hidden rounded-2xl border px-4 py-3 transition-[translate,border-color] duration-300 hover:-translate-y-0.5 motion-reduce:animate-none',
        LANE_COLUMNS,
        entry.isYou ? 'border-primary/45 bg-primary/[0.06] shadow-[0_18px_40px_-30px_var(--brand-primary)]' : 'border-line bg-fg/[0.015] hover:border-primary/30',
      )}
    >
      {entry.isYou && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-comet bg-linear-to-r from-transparent via-primary/10 to-transparent [animation-duration:4.5s] motion-reduce:hidden" />}

      <span style={{ animationDelay: `${delayMs}ms` }} className="relative grid animate-rank-pop place-items-center justify-self-start motion-reduce:animate-none">
        {isPodium ? <Medal rank={entry.rank} size={30} /> : <span className="font-mono text-2xl font-semibold text-fg-subtle tabular-nums">{String(entry.rank).padStart(2, '0')}</span>}
        <span className="sr-only">#{entry.rank}</span>
      </span>

      <div className="relative flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-fg/20 text-xs font-bold text-fg-muted transition-colors group-hover:border-primary/45 group-hover:text-primary">{initials(entry.trader)}</span>
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-fg">
            <span className="truncate">{entry.trader}</span>
            {entry.isYou && <YouTag />}
          </p>
          <p className="font-mono text-[11px] text-fg-subtle md:hidden">{entry.account}</p>
        </div>
      </div>

      <span className="relative hidden md:block">{track}</span>
      <span className="relative hidden font-mono text-xs text-fg-muted md:block">{entry.account}</span>
      <span className={cx('relative hidden text-sm tabular-nums md:block', entry.isYou ? 'font-semibold text-fg' : 'text-fg')}>
        <CountMoney value={entry.equity} currency={currency} />
      </span>

      <span className="relative flex flex-col items-end gap-1 justify-self-end">
        <ReturnPill value={entry.returnPercent} />
        <span className="text-xs tabular-nums text-fg-muted md:hidden">
          <CountMoney value={entry.equity} currency={currency} />
        </span>
      </span>

      <span className="relative col-span-3 md:hidden">{track}</span>
    </li>
  );
}

export default function ContestLeaderboardPage({ contestId }: { contestId: string }) {
  const { data, isLoading } = useDemoContest();
  const enrolledIds = useEnrolledContestIds();
  const isMounted = useMounted();

  const backLink = (
    <Link
      href={`/promotion/demo-contest/${contestId}`}
      className="group inline-flex items-center gap-2 self-start text-sm font-medium text-fg-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="grid size-8 place-items-center rounded-lg border border-line transition-colors group-hover:border-primary/45">
        <Icon name="arrowLeft" size={15} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {text.backToDashboard}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-[30rem] rounded-[28px]" />
        <Skeleton className="h-80 rounded-[28px]" />
      </div>
    );
  }

  const contest = data.contests.find((item) => item.id === contestId);
  const isEnrolled = contest ? [...data.enrolledIds, ...enrolledIds].includes(contest.id) : false;
  const rows = contest ? getLeaderboard(contest, isEnrolled) : [];
  const bestReturn = Math.max(0, ...rows.map((entry) => entry.returnPercent));
  const leader = rows[0];
  const you = rows.find((entry) => entry.isYou);
  // Share of the best return, so each runner shows how close a trader is to the lead (everyone level = all at the finish).
  const shareOf = (entry: LeaderboardEntry) => (bestReturn <= 0 ? 100 : Math.max(6, (Math.max(0, entry.returnPercent) / bestReturn) * 100));

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="absolute -top-40 left-1/3 size-[30rem] rounded-full bg-primary/12 blur-3xl" />
          <span className="absolute -right-24 -bottom-40 size-96 rounded-full bg-[color-mix(in_oklab,var(--orbit-violet)_14%,transparent)] blur-3xl" />
          {CONFETTI.map((piece) => (
            <span
              key={piece.left}
              style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}s`, '--confetti-x': `${piece.drift}px`, '--confetti-spin': `${piece.spin}deg` } as CSSProperties}
              className={cx('absolute top-0 animate-confetti opacity-0 motion-reduce:hidden', piece.tone, piece.shape)}
            />
          ))}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

        <div className="grid gap-4 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-semibold tracking-[0.24em] text-primary uppercase">{boardText.race}</p>
              <LiveChip />
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">{text.leaderboardTitle}</h1>
              {contest && <p className="mt-2 text-sm text-fg-muted capitalize">{contest.name}</p>}
            </div>

            {leader && (
              <div className="flex items-center gap-4 rounded-2xl border border-primary/35 bg-primary/[0.07] p-4">
                <Medal rank={1} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{boardText.leader}</p>
                  <p className="flex items-center gap-1.5 text-lg font-semibold text-fg">
                    <span className="truncate">{leader.trader}</span>
                    {leader.isYou && <YouTag />}
                  </p>
                  <p className="font-mono text-[11px] text-fg-subtle">{leader.account}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-sm font-semibold tabular-nums text-fg">
                    <CountMoney value={leader.equity} currency={data.currency} />
                  </span>
                  <ReturnPill value={leader.returnPercent} />
                </div>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <ScoreCell icon="user" label={boardText.traders} value={String(rows.length)} delay={120} />
              {leader && <ScoreCell icon="trophy" label={boardText.leader} value={leader.trader} delay={180} />}
              {leader && <ScoreCell icon="trendUp" label={boardText.topReturn} value={`${returnFormat.format(leader.returnPercent)}%`} delay={240} />}
              {you && <ScoreCell icon="barChart" label={boardText.yourRank} value={`#${you.rank}`} delay={300} />}
            </dl>

          </div>

          {rows.length > 0 && <ChampionOrbit rows={rows} currency={data.currency} />}
        </div>
      </section>

      <section style={{ animationDelay: '220ms' }} className="orbit-card flex animate-rise flex-col gap-2.5 p-3 motion-reduce:animate-none sm:p-4">
        <div className={cx('hidden items-center gap-x-4 px-4 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle md:grid', LANE_COLUMNS)}>
          <span>{text.rank}</span>
          <span>{text.trader}</span>
          <span aria-hidden="true" className="flex items-center justify-end gap-1.5 pr-2">
            <span className={cx('size-3 rounded-[2px] opacity-50', CHECKER_CLASS)} />
          </span>
          <span>{text.account}</span>
          <span>{text.equity}</span>
          <span className="text-right">{text.returnPercent}</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-muted">{text.noTraders}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((entry, index) => (
              <LaneRow key={entry.id} entry={entry} currency={data.currency} share={shareOf(entry)} index={index} isMounted={isMounted} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
