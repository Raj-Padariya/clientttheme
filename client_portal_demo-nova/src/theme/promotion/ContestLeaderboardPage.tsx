'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
const METER_DOTS = 20;
const STUB_DOTS = 12;
const ROW_COLUMNS = 'md:grid-cols-[3.5rem_minmax(0,11rem)_minmax(0,1fr)_7rem_7.5rem_6.5rem]';
// Podium reads 2-1-3 left to right, with the winner raised in the middle.
const PODIUM_ORDER = [2, 1, 3];

/** 5×7 dot-matrix glyphs ('#' = lit) for the scoreboard initials and podium numerals. */
const DOT_FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
};

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

function ReturnPill({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isLoss = value < 0;
  let tone = isLoss ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success';
  if (inverted) tone = isLoss ? 'bg-danger/20 text-[#ff8a80]' : 'bg-success/20 text-[#6ee7a8]';
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums', tone)}>
      <Icon name={isLoss ? 'trendDown' : 'trendUp'} size={12} />
      {returnFormat.format(value)}%
    </span>
  );
}

function YouTag({ inverted = false }: { inverted?: boolean }) {
  return <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider', inverted ? 'bg-white text-[#0a1220]' : 'bg-fg text-app')}>{text.you}</span>;
}

/** LIVE chip with a three-bar equaliser instead of a static dot. */
function LiveChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-danger px-3 py-1 text-[11px] font-black tracking-[0.2em] text-white">
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0, 0.3, 0.6].map((delay) => (
          <span key={delay} style={{ animationDelay: `${delay}s` }} className="h-full w-[3px] origin-bottom animate-eq-bar rounded-full bg-white [animation-duration:0.9s] motion-reduce:animate-none" />
        ))}
      </span>
      {text.live}
    </span>
  );
}

/**
 * Text drawn on a dot grid. Lit dots pop in column by column, so the glyphs "type" onto the board;
 * dark dots stay visible so it reads as one LED panel rather than loose letters.
 */
function DotMatrixText({ value, dotClass, litClass, offClass, gapClass, baseDelayMs = 0 }: { value: string; dotClass: string; litClass: string; offClass: string; gapClass: string; baseDelayMs?: number }) {
  const glyphs = value.split('').map((char) => DOT_FONT[char] ?? DOT_FONT['?']);
  return (
    <span aria-hidden="true" className={cx('flex', gapClass)}>
      {glyphs.map((rows, glyphIndex) => (
        <span key={glyphIndex} className={cx('grid grid-cols-5', gapClass)}>
          {rows.flatMap((row, rowIndex) =>
            row.split('').map((cell, colIndex) => {
              const isLit = cell === '#';
              const column = glyphIndex * 6 + colIndex;
              return (
                <span
                  key={`${rowIndex}-${colIndex}`}
                  style={isLit ? { animationDelay: `${baseDelayMs + column * 55 + rowIndex * 12}ms` } : undefined}
                  className={cx('rounded-full', dotClass, isLit ? cx(litClass, 'animate-dot-pop motion-reduce:animate-none') : offClass)}
                />
              );
            }),
          )}
        </span>
      ))}
    </span>
  );
}

function StatBead({ icon, label, value, delay }: { icon: IconName; label: string; value: string; delay: number }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="flex min-w-0 animate-feed-in items-center gap-2.5 motion-reduce:animate-none">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15">
        <Icon name={icon} size={14} />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase">{label}</dt>
        <dd className="truncate font-mono text-base font-black text-white tabular-nums">{value}</dd>
      </div>
    </div>
  );
}

function LedBoard({ leader, currency }: { leader: LeaderboardEntry; currency: string }) {
  return (
    <div className="relative flex flex-col gap-4 rounded-[26px] bg-black/45 p-5 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] text-white/55 uppercase">
          <span className="grid size-6 place-items-center rounded-full bg-white text-[#0a1220]">
            <Icon name="trophy" size={11} />
          </span>
          {boardText.leader}
        </p>
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span key={dot} style={{ animationDelay: `${dot * 0.25}s` }} className="size-1.5 animate-blink rounded-full bg-white/70 motion-reduce:animate-none" />
          ))}
        </span>
      </div>

      <div className="relative grid place-items-center overflow-hidden rounded-[18px] bg-[#05080f] px-6 py-6 ring-1 ring-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:6px_6px]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/4 animate-led-scan bg-linear-to-b from-transparent via-white/10 to-transparent motion-reduce:hidden" />
        <span className="relative animate-led-flicker motion-reduce:animate-none">
          <DotMatrixText value={initials(leader.trader)} dotClass="size-2.5 sm:size-3" litClass="bg-white" offClass="bg-white/[0.07]" gapClass="gap-1" baseDelayMs={250} />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-lg font-black text-white">
          <span className="truncate">{leader.trader}</span>
          {leader.isYou && <YouTag inverted />}
        </p>
        <p className="font-mono text-[11px] text-white/45">{leader.account}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dotted border-white/15 pt-3">
          <span className="font-mono text-xl font-black text-white tabular-nums">
            <CountMoney value={leader.equity} currency={currency} />
          </span>
          <ReturnPill value={leader.returnPercent} inverted />
        </div>
      </div>
    </div>
  );
}

/** Every trader scrolling past like a stadium ticker; the list is doubled so the loop is seamless. */
function Ticker({ rows }: { rows: LeaderboardEntry[] }) {
  const loop = [...rows, ...rows];
  return (
    <div aria-hidden="true" className="relative overflow-hidden border-t border-dotted border-white/15 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max animate-ticker gap-8 py-3 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((entry, index) => (
          <span key={`${entry.id}-${index}`} className="inline-flex items-center gap-2 font-mono text-xs whitespace-nowrap text-white/70">
            <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px] font-black text-white">{entry.rank}</span>
            <span className={cx('font-semibold', entry.isYou ? 'text-white' : 'text-white/80')}>{entry.trader}</span>
            <span className={entry.returnPercent < 0 ? 'text-[#ff8a80]' : 'text-[#6ee7a8]'}>{returnFormat.format(entry.returnPercent)}%</span>
            <span className="size-1 rounded-full bg-white/25" />
          </span>
        ))}
      </div>
    </div>
  );
}

function ShareDots({ share, count, litClass, offClass, isMounted, delayMs }: { share: number; count: number; litClass: string; offClass: string; isMounted: boolean; delayMs: number }) {
  const lit = isMounted ? Math.max(1, Math.round((share / 100) * count)) : 0;
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: count }, (_, dot) => {
        const isHead = dot === lit - 1;
        return (
          <span
            key={dot}
            style={{ transitionDelay: `${delayMs + dot * 35}ms` }}
            className={cx('shrink-0 rounded-full transition-[background-color,width,height] duration-300 motion-reduce:transition-none', isHead ? 'size-3' : 'size-1.5', dot < lit ? litClass : offClass)}
          />
        );
      })}
    </span>
  );
}

function PodiumStub({ entry, currency, share, isMounted, order }: { entry: LeaderboardEntry; currency: string; share: number; isMounted: boolean; order: number }) {
  const isChampion = entry.rank === 1;
  return (
    <li
      style={{ animationDelay: `${200 + order * 140}ms` }}
      className={cx(
        'group relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[28px] p-5 transition-[translate] duration-300 hover:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none',
        isChampion ? 'bg-fg text-app shadow-[0_26px_50px_-30px_rgb(0_0_0/0.9)] sm:-translate-y-4 sm:hover:-translate-y-5' : 'orbit-card nova-edge-light text-fg',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <DotMatrixText
          value={String(entry.rank)}
          dotClass="size-1.5"
          litClass={isChampion ? 'bg-app' : 'bg-fg'}
          offClass={isChampion ? 'bg-app/10' : 'bg-fg/[0.07]'}
          gapClass="gap-[3px]"
          baseDelayMs={300 + order * 140}
        />
        <span className="relative grid size-14 shrink-0 place-items-center">
          <span aria-hidden="true" className={cx('absolute inset-0 rounded-full border-2 border-dashed', isChampion ? 'animate-rim-spin border-app/35 motion-reduce:animate-none' : 'border-fg/20')} />
          <span className={cx('grid size-11 place-items-center rounded-full text-sm font-black', isChampion ? 'bg-app text-fg' : 'nova-gloss text-fg')}>{initials(entry.trader)}</span>
          {isChampion && (
            <span className="absolute -top-2 -right-1 grid size-6 animate-float place-items-center rounded-full bg-app text-fg motion-reduce:animate-none">
              <Icon name="trophy" size={11} />
            </span>
          )}
        </span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-base font-black">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag inverted={isChampion} />}
        </p>
        <p className="font-mono text-[11px] opacity-55">{entry.account}</p>
      </div>
      <div className={cx('mt-auto flex flex-col gap-2.5 border-t border-dotted pt-3', isChampion ? 'border-app/25' : 'border-line-strong')}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-black tabular-nums">
            <CountMoney value={entry.equity} currency={currency} />
          </span>
          <ReturnPill value={entry.returnPercent} inverted={isChampion} />
        </div>
        <ShareDots share={share} count={STUB_DOTS} litClass={isChampion ? 'bg-app' : 'bg-fg/70'} offClass={isChampion ? 'bg-app/15' : 'bg-fg/10'} isMounted={isMounted} delayMs={600 + order * 140} />
      </div>
    </li>
  );
}

function Podium({ rows, currency, shareOf, isMounted }: { rows: LeaderboardEntry[]; currency: string; shareOf: (entry: LeaderboardEntry) => number; isMounted: boolean }) {
  const podium = PODIUM_ORDER.map((rank) => rows.find((entry) => entry.rank === rank)).filter((entry): entry is LeaderboardEntry => entry !== undefined);
  const chasers = rows.filter((entry) => entry.rank > 3);

  return (
    <section aria-hidden="true" className="flex flex-col gap-5">
      <ol className="grid gap-4 pt-4 sm:grid-cols-3 sm:items-end">
        {podium.map((entry, order) => (
          <PodiumStub key={entry.id} entry={entry} currency={currency} share={shareOf(entry)} isMounted={isMounted} order={order} />
        ))}
      </ol>

      {chasers.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 border-t-2 border-dotted border-line-strong" />
          <div className="flex flex-wrap justify-center gap-2.5">
            {chasers.map((entry, index) => (
              <span
                key={entry.id}
                style={{ animationDelay: `${700 + index * 70}ms` }}
                title={entry.trader}
                className="relative grid size-11 animate-dot-pop place-items-center rounded-full text-[11px] font-black text-fg ring-1 ring-line-strong motion-reduce:animate-none"
              >
                {initials(entry.trader)}
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-fg font-mono text-[9px] font-black text-app">{entry.rank}</span>
              </span>
            ))}
          </div>
          <span className="h-px flex-1 border-t-2 border-dotted border-line-strong" />
        </div>
      )}
    </section>
  );
}

/** Rank as a bead: 1st is solid ink with a spinning dashed rim, 2nd/3rd glossy, the rest a plain number. */
function RankBead({ rank }: { rank: number }) {
  if (rank > 3) return <span className="font-mono text-2xl font-black text-fg-subtle tabular-nums">{String(rank).padStart(2, '0')}</span>;
  return (
    <span className={cx('relative grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-black tabular-nums', rank === 1 ? 'bg-fg text-app' : 'nova-gloss text-fg')}>
      {rank === 1 && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />}
      {rank}
    </span>
  );
}

function BoardRow({ entry, currency, share, index, isMounted }: { entry: LeaderboardEntry; currency: string; share: number; index: number; isMounted: boolean }) {
  const delayMs = 500 + index * 140;
  const meter = <ShareDots share={share} count={METER_DOTS} litClass={entry.isYou ? 'bg-fg' : 'bg-fg/55'} offClass="bg-fg/10" isMounted={isMounted} delayMs={delayMs} />;

  return (
    <li
      style={{ animationDelay: `${300 + index * 110}ms` }}
      className={cx(
        'group relative grid animate-feed-in grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-[24px] px-4 py-3 transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:transition-none',
        ROW_COLUMNS,
        entry.isYou ? 'bg-fg/[0.06] ring-2 ring-fg' : 'ring-1 ring-line hover:ring-line-strong',
      )}
    >
      <span className="grid place-items-center justify-self-start">
        <RankBead rank={entry.rank} />
        <span className="sr-only">#{entry.rank}</span>
      </span>

      <div className="flex min-w-0 items-center gap-3">
        <span className="nova-gloss grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-fg">{initials(entry.trader)}</span>
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-fg">
            <span className="truncate">{entry.trader}</span>
            {entry.isYou && <YouTag />}
          </p>
          <p className="font-mono text-[11px] text-fg-subtle md:hidden">{entry.account}</p>
        </div>
      </div>

      <span className="hidden min-w-0 overflow-hidden md:block">{meter}</span>
      <span className="hidden font-mono text-xs text-fg-muted md:block">{entry.account}</span>
      <span className="hidden font-mono text-sm font-bold text-fg tabular-nums md:block">
        <CountMoney value={entry.equity} currency={currency} />
      </span>

      <span className="flex flex-col items-end gap-1 justify-self-end">
        <ReturnPill value={entry.returnPercent} />
        <span className="text-xs text-fg-muted tabular-nums md:hidden">
          <CountMoney value={entry.equity} currency={currency} />
        </span>
      </span>

      <span className="col-span-3 overflow-hidden md:hidden">{meter}</span>
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
      className="group inline-flex items-center gap-2.5 self-start rounded-full py-1 pr-4 pl-1 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="nova-gloss grid size-8 place-items-center rounded-full text-fg">
        <Icon name="arrowLeft" size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {text.backToDashboard}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-[26rem] rounded-[30px]" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-[28px]" />
          ))}
        </div>
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
  // Share of the best return, so each meter shows how close a trader is to the lead (everyone level = all full).
  const shareOf = (entry: LeaderboardEntry) => (bestReturn <= 0 ? 100 : Math.max(6, (Math.max(0, entry.returnPercent) / bestReturn) * 100));

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <section className="relative animate-rise overflow-hidden rounded-[32px] bg-[#0a1220] text-white shadow-[0_28px_60px_-34px_rgb(0_0_0/0.95)] ring-1 ring-white/10 motion-reduce:animate-none">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(110deg,transparent_20%,#000)]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <LiveChip />
                <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">{boardText.race}</p>
              </div>
              <h1 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">{text.leaderboardTitle}</h1>
              {contest && <p className="text-sm text-white/60 capitalize">{contest.name}</p>}
            </div>
            <dl className="mt-auto grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <StatBead icon="user" label={boardText.traders} value={String(rows.length)} delay={120} />
              {leader && <StatBead icon="trophy" label={boardText.leader} value={leader.trader} delay={180} />}
              {leader && <StatBead icon="trendUp" label={boardText.topReturn} value={`${returnFormat.format(leader.returnPercent)}%`} delay={240} />}
              {you && <StatBead icon="barChart" label={boardText.yourRank} value={`#${you.rank}`} delay={300} />}
            </dl>
          </div>

          {leader && <LedBoard leader={leader} currency={data.currency} />}
        </div>

        {rows.length > 0 && <Ticker rows={rows} />}
      </section>

      {rows.length > 0 && <Podium rows={rows} currency={data.currency} shareOf={shareOf} isMounted={isMounted} />}

      <section style={{ animationDelay: '220ms' }} className="orbit-card nova-edge-light flex animate-rise flex-col gap-2.5 p-3 motion-reduce:animate-none sm:p-4">
        <div className={cx('hidden items-center gap-x-4 px-4 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle md:grid', ROW_COLUMNS)}>
          <span>{text.rank}</span>
          <span>{text.trader}</span>
          <span aria-hidden="true" className="flex items-center gap-1">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-1.5 rounded-full bg-fg/30" />
            ))}
          </span>
          <span>{text.account}</span>
          <span>{text.equity}</span>
          <span className="text-right">{text.returnPercent}</span>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span aria-hidden="true" className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 21 }, (_, dot) => (
                <span key={dot} style={{ animationDelay: `${dot * 35}ms` }} className={cx('size-2 animate-dot-pop rounded-full motion-reduce:animate-none', dot === 10 ? 'bg-fg/60' : 'bg-fg/12')} />
              ))}
            </span>
            <p className="text-sm text-fg-muted">{text.noTraders}</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((entry, index) => (
              <BoardRow key={entry.id} entry={entry} currency={data.currency} share={shareOf(entry)} index={index} isMounted={isMounted} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
