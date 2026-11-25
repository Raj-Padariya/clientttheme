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

/*
 * Zenith contest leaderboard as a race: a champion stage (2-1-3) with the leader on an LED scoreboard card,
 * a live ticker, and the full standings as race lanes — every trader's token runs toward the finish flag
 * as far as their return has carried them relative to the leader.
 */
const boardText = {
  traders: 'Traders',
  leader: 'Leader',
  topReturn: 'Top Return',
  yourRank: 'Your Rank',
  race: 'Race to the top',
};

const RED = 'var(--zenith-red)';
const returnFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });
const COUNT_UP_MS = 1400;
const RACE_MS = 1600;
const ROW_COLUMNS = 'md:grid-cols-[3.5rem_minmax(0,13rem)_minmax(0,1fr)_8rem_6.5rem]';
// Stage reads 2-1-3 left to right, with the champion in the middle.
const PODIUM_ORDER = [2, 1, 3];

/** 5×7 dot-matrix glyphs ('#' = lit) for the scoreboard initials and stage numerals. */
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

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function CountMoney({ value, currency }: { value: number; currency: string }) {
  const shown = useAnimatedNumber(value, COUNT_UP_MS);
  return <>{formatMoney(shown, currency)}</>;
}

function ReturnPill({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isLoss = value < 0;
  let tone = isLoss ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success';
  if (inverted) tone = isLoss ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success';
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums', tone)}>
      <Icon name={isLoss ? 'trendDown' : 'trendUp'} size={12} />
      {returnFormat.format(value)}%
    </span>
  );
}

function YouTag({ inverted = false }: { inverted?: boolean }) {
  return (
    <span style={inverted ? undefined : { background: RED }} className={cx('rounded-[6px] px-1.5 py-0.5 text-[10px] font-black tracking-wider', inverted ? 'bg-app text-fg' : 'text-white')}>
      {text.you}
    </span>
  );
}

/** LIVE chip with a three-bar equaliser instead of a static dot. */
function LiveChip() {
  return (
    <span style={{ background: RED }} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.2em] text-white">
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
function DotMatrixText({
  value,
  dotClass,
  litClass,
  offClass,
  gapClass,
  litStyle,
  baseDelayMs = 0,
}: {
  value: string;
  dotClass: string;
  litClass: string;
  offClass: string;
  gapClass: string;
  litStyle?: CSSProperties;
  baseDelayMs?: number;
}) {
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
                  style={isLit ? { animationDelay: `${baseDelayMs + column * 55 + rowIndex * 12}ms`, ...litStyle } : undefined}
                  className={cx('rounded-[2px]', dotClass, isLit ? cx(litClass, 'animate-dot-pop motion-reduce:animate-none') : offClass)}
                />
              );
            }),
          )}
        </span>
      ))}
    </span>
  );
}

/* ───────────── Header ───────────── */

function StatColumn({ icon, label, value, order }: { icon: IconName; label: string; value: string; order: number }) {
  return (
    <div style={stagger(order, 90, 120)} className="zenith-tile flex min-w-0 flex-col gap-1.5 border-l-2 border-dashed border-line-strong pl-3.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
        <Icon name={icon} size={12} />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="truncate font-mono text-xl leading-tight font-black text-fg tabular-nums">{value}</dd>
    </div>
  );
}

/** Every trader scrolling past like a stadium ticker; the list is doubled so the loop is seamless. */
function Ticker({ rows }: { rows: LeaderboardEntry[] }) {
  const loop = [...rows, ...rows];
  return (
    <div aria-hidden="true" className="relative overflow-hidden border-y border-dashed border-line-strong [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max animate-ticker gap-8 py-3 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((entry, index) => (
          <span key={`${entry.id}-${index}`} className="inline-flex items-center gap-2 font-mono text-xs whitespace-nowrap text-fg-muted">
            <span
              style={entry.rank === 1 ? { background: RED } : undefined}
              className={cx('grid size-5 place-items-center rounded-[6px] text-[10px] font-black', entry.rank === 1 ? 'text-white' : 'bg-fg/10 text-fg')}
            >
              {entry.rank}
            </span>
            <span className={cx('font-semibold', entry.isYou ? 'text-fg' : 'text-fg-muted')}>{entry.trader}</span>
            <span className={entry.returnPercent < 0 ? 'text-danger' : 'text-success'}>{returnFormat.format(entry.returnPercent)}%</span>
            <span style={{ background: RED }} className="size-1 rounded-[1px]" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Champion stage: 2-1-3, the leader on an LED scoreboard card ───────────── */

function ChampionCard({ entry, currency }: { entry: LeaderboardEntry; currency: string }) {
  return (
    <li style={stagger(0, 0, 150)} className="zenith-tile relative order-first flex flex-col gap-4 overflow-hidden rounded-[32px] bg-fg p-5 text-app sm:order-none sm:-mt-6 sm:p-6">
      <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-app/15 to-transparent" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] text-app/60 uppercase">
          <span style={{ background: RED }} className="grid size-7 animate-float place-items-center rounded-full text-white motion-reduce:animate-none">
            <Icon name="trophy" size={13} />
          </span>
          {boardText.leader}
        </p>
        <DotMatrixText value="1" dotClass="size-1.5" litClass="" litStyle={{ background: RED }} offClass="bg-app/10" gapClass="gap-[3px]" baseDelayMs={200} />
      </div>

      <div className="relative grid place-items-center overflow-hidden rounded-[22px] bg-app/[0.07] px-6 py-6 ring-1 ring-app/10">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-led-scan bg-linear-to-b from-transparent via-app/20 to-transparent motion-reduce:hidden" />
        <span className="relative animate-led-flicker motion-reduce:animate-none">
          <DotMatrixText value={initials(entry.trader)} dotClass="size-2.5 sm:size-3" litClass="" litStyle={{ background: RED }} offClass="bg-app/[0.08]" gapClass="gap-1" baseDelayMs={300} />
        </span>
      </div>

      <div className="relative flex flex-col gap-1 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xl font-black">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag inverted />}
        </p>
        <p className="font-mono text-[11px] text-app/50">{entry.account}</p>
      </div>

      <div className="relative mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-app/20 pt-4">
        <span className="font-mono text-2xl font-black tabular-nums">
          <CountMoney value={entry.equity} currency={currency} />
        </span>
        <ReturnPill value={entry.returnPercent} inverted />
      </div>
    </li>
  );
}

function RunnerUpCard({ entry, currency, share, isMounted, order }: { entry: LeaderboardEntry; currency: string; share: number; isMounted: boolean; order: number }) {
  const isSecond = entry.rank === 2;
  return (
    <li style={stagger(order, 160, 300)} className="zenith-tile flex flex-col gap-4 rounded-[28px] bg-fg/[0.03] p-5 ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <DotMatrixText
          value={String(entry.rank)}
          dotClass="size-1.5"
          litClass={isSecond ? 'bg-fg' : 'bg-fg/55'}
          offClass="bg-fg/[0.07]"
          gapClass="gap-[3px]"
          baseDelayMs={350 + order * 160}
        />
        <span className="relative grid size-16 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className={cx('absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed motion-reduce:animate-none', isSecond ? 'border-fg/40 [animation-duration:3s]' : 'border-fg/25 [animation-duration:4s]')}
          />
          <span className={cx('grid size-12 place-items-center rounded-full text-sm font-black', isSecond ? 'bg-fg text-app' : 'bg-fg/15 text-fg')}>{initials(entry.trader)}</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-base font-black text-fg">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag />}
        </p>
        <p className="font-mono text-[11px] text-fg-subtle">{entry.account}</p>
      </div>
      <div className="mt-auto flex flex-col gap-3 border-t border-dashed border-line-strong pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-base font-black text-fg tabular-nums">
            <CountMoney value={entry.equity} currency={currency} />
          </span>
          <ReturnPill value={entry.returnPercent} />
        </div>
        <span aria-hidden="true" className="relative block h-1.5 rounded-full bg-fg/10">
          <span
            style={{ width: `${isMounted ? share : 0}%`, transition: `width ${RACE_MS}ms cubic-bezier(.2,.7,.2,1) ${500 + order * 160}ms` }}
            className={cx('absolute inset-y-0 left-0 rounded-full', isSecond ? 'bg-fg' : 'bg-fg/55')}
          />
        </span>
      </div>
    </li>
  );
}

function ChampionStage({ rows, currency, shareOf, isMounted }: { rows: LeaderboardEntry[]; currency: string; shareOf: (entry: LeaderboardEntry) => number; isMounted: boolean }) {
  const podium = PODIUM_ORDER.map((rank) => rows.find((entry) => entry.rank === rank)).filter((entry): entry is LeaderboardEntry => entry !== undefined);

  return (
    <section aria-hidden="true">
      <ol className="grid gap-4 pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:items-end">
        {podium.map((entry, order) =>
          entry.rank === 1 ? (
            <ChampionCard key={entry.id} entry={entry} currency={currency} />
          ) : (
            <RunnerUpCard key={entry.id} entry={entry} currency={currency} share={shareOf(entry)} isMounted={isMounted} order={order} />
          ),
        )}
      </ol>
    </section>
  );
}

/* ───────────── Standings: one race lane per trader ───────────── */

function RankTile({ rank }: { rank: number }) {
  if (rank > 3) return <span className="font-mono text-2xl font-black text-fg-subtle tabular-nums">{String(rank).padStart(2, '0')}</span>;
  return (
    <span
      style={rank === 1 ? { background: RED } : undefined}
      className={cx('grid size-10 shrink-0 place-items-center rounded-[12px] font-mono text-sm font-black tabular-nums', rank === 1 ? 'text-white' : 'bg-fg text-app', rank === 3 && 'opacity-60')}
    >
      {rank}
    </span>
  );
}

/** Checkered finish flag at the end of every lane. */
function FinishFlag() {
  return (
    <span aria-hidden="true" className="grid h-8 w-3 shrink-0 grid-cols-2 grid-rows-5 overflow-hidden rounded-[3px] ring-1 ring-line-strong">
      {Array.from({ length: 10 }, (_, cell) => {
        const isDark = (Math.floor(cell / 2) + (cell % 2)) % 2 === 0;
        return <span key={cell} className={isDark ? 'bg-fg' : 'bg-fg/10'} />;
      })}
    </span>
  );
}

/** A token runs from the start line to its share of the leader's return, leaving a fading trail. */
function RaceLane({ entry, share, isMounted, delayMs }: { entry: LeaderboardEntry; share: number; isMounted: boolean; delayMs: number }) {
  const isLeader = entry.rank === 1;
  const isHot = isLeader || entry.isYou;
  const position = isMounted ? share : 0;
  const motion = `${RACE_MS}ms cubic-bezier(.2,.7,.2,1) ${delayMs}ms`;
  const trailStyle: CSSProperties = isHot ? { background: `linear-gradient(90deg, transparent, ${RED})` } : {};

  return (
    <span aria-hidden="true" className="flex min-w-0 items-center gap-3">
      <span className="h-8 w-0.5 shrink-0 rounded-full bg-fg/25" />
      <span className="relative h-9 min-w-0 flex-1">
        <svg viewBox="0 0 100 2" preserveAspectRatio="none" className="absolute inset-x-0 top-1/2 h-0.5 w-full -translate-y-1/2">
          <line x1="0" y1="1" x2="100" y2="1" strokeWidth="2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="stroke-fg/20">
            <animate attributeName="stroke-dashoffset" values="0;-12" dur="0.8s" repeatCount="indefinite" />
          </line>
        </svg>
        <span
          style={{ width: `${position}%`, transition: `width ${motion}`, ...trailStyle }}
          className={cx('absolute top-1/2 left-0 h-1 -translate-y-1/2 overflow-hidden rounded-full', !isHot && 'bg-linear-to-r from-transparent to-fg/45')}
        >
          <span className="zenith-shine absolute inset-y-0 left-0 w-1/3 bg-white/50" />
        </span>
        <span
          style={{ left: `${position}%`, transition: `left ${motion}`, ...(isHot ? { background: RED } : {}) }}
          className={cx(
            'absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] font-black ring-4 ring-app',
            isHot ? 'text-white' : 'bg-fg text-app',
          )}
        >
          {isLeader && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />}
          <span className="relative">{initials(entry.trader)}</span>
        </span>
      </span>
      <FinishFlag />
    </span>
  );
}

function BoardRow({ entry, currency, share, index, isMounted }: { entry: LeaderboardEntry; currency: string; share: number; index: number; isMounted: boolean }) {
  const lane = <RaceLane entry={entry} share={share} isMounted={isMounted} delayMs={400 + index * 120} />;

  return (
    <li
      style={stagger(index, 100, 300)}
      className={cx(
        'zenith-tile relative grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 overflow-hidden rounded-[22px] px-4 py-3 transition-colors duration-300',
        ROW_COLUMNS,
        entry.isYou ? 'bg-fg/[0.06] ring-1 ring-line-strong' : 'hover:bg-fg/[0.03]',
      )}
    >
      {entry.isYou && <span aria-hidden="true" style={{ background: RED }} className="absolute inset-y-3 left-0 w-1 rounded-r-full" />}
      <span className="grid place-items-center justify-self-start">
        <RankTile rank={entry.rank} />
        <span className="sr-only">#{entry.rank}</span>
      </span>

      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-fg">
          <span className="truncate">{entry.trader}</span>
          {entry.isYou && <YouTag />}
        </p>
        <p className="truncate font-mono text-[11px] text-fg-subtle">{entry.account}</p>
      </div>

      <span className="hidden min-w-0 md:block">{lane}</span>
      <span className="hidden text-right font-mono text-sm font-bold text-fg tabular-nums md:block">
        <CountMoney value={entry.equity} currency={currency} />
      </span>

      <span className="flex flex-col items-end gap-1 justify-self-end">
        <ReturnPill value={entry.returnPercent} />
        <span className="text-xs text-fg-muted tabular-nums md:hidden">
          <CountMoney value={entry.equity} currency={currency} />
        </span>
      </span>

      <span className="col-span-3 md:hidden">{lane}</span>
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
      <span className="grid size-8 place-items-center rounded-full bg-fg text-app">
        <Icon name="arrowLeft" size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {text.backToDashboard}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-36 rounded-[32px]" />
        <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr_1fr] sm:items-end">
          <Skeleton className="h-60 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[32px]" />
          <Skeleton className="h-60 rounded-[28px]" />
        </div>
        <Skeleton className="h-96 rounded-[32px]" />
      </div>
    );
  }

  const contest = data.contests.find((item) => item.id === contestId);
  const isEnrolled = contest ? [...data.enrolledIds, ...enrolledIds].includes(contest.id) : false;
  const rows = contest ? getLeaderboard(contest, isEnrolled) : [];
  const bestReturn = Math.max(0, ...rows.map((entry) => entry.returnPercent));
  const leader = rows[0];
  const you = rows.find((entry) => entry.isYou);
  // Share of the best return, so each lane shows how close a trader is to the lead (everyone level = all at the flag).
  const shareOf = (entry: LeaderboardEntry) => (bestReturn <= 0 ? 100 : Math.max(6, (Math.max(0, entry.returnPercent) / bestReturn) * 100));

  return (
    <div className="flex flex-col gap-7">
      {backLink}

      <header className="zenith-tile grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <LiveChip />
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-fg-subtle uppercase">
              <span aria-hidden="true" style={{ background: RED }} className="h-0.5 w-6 rounded-full" />
              {boardText.race}
            </p>
          </div>
          <h1 className="text-5xl leading-[0.9] font-black tracking-[-0.05em] text-fg sm:text-6xl">{text.leaderboardTitle}</h1>
          {contest && <p className="text-sm text-fg-muted capitalize">{contest.name}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <StatColumn icon="user" label={boardText.traders} value={String(rows.length)} order={0} />
          {leader && <StatColumn icon="trophy" label={boardText.leader} value={leader.trader} order={1} />}
          {leader && <StatColumn icon="trendUp" label={boardText.topReturn} value={`${returnFormat.format(leader.returnPercent)}%`} order={2} />}
          {you && <StatColumn icon="barChart" label={boardText.yourRank} value={`#${you.rank}`} order={3} />}
        </dl>
      </header>

      {rows.length > 0 && <Ticker rows={rows} />}

      {rows.length > 0 && <ChampionStage rows={rows} currency={data.currency} shareOf={shareOf} isMounted={isMounted} />}

      <section style={stagger(0, 0, 220)} className="zenith-tile flex flex-col gap-1.5 rounded-[32px] bg-fg/[0.02] p-3 ring-1 ring-line sm:p-4">
        <div className={cx('hidden items-center gap-x-4 px-4 pt-1 pb-2 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase md:grid', ROW_COLUMNS)}>
          <span>{text.rank}</span>
          <span>
            {text.trader} · {text.account}
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />
            {boardText.race}
            <span aria-hidden="true" className="flex-1 border-t border-dashed border-line-strong" />
            <Icon name="trophy" size={12} />
          </span>
          <span className="text-right">{text.equity}</span>
          <span className="text-right">{text.returnPercent}</span>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span aria-hidden="true" className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-[3px]" />
              </span>
              <span className="grid size-12 place-items-center rounded-[16px] bg-fg text-app">
                <Icon name="barChart" size={18} />
              </span>
            </span>
            <p className="text-sm text-fg-muted">{text.noTraders}</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-1">
            {rows.map((entry, index) => (
              <BoardRow key={entry.id} entry={entry} currency={data.currency} share={shareOf(entry)} index={index} isMounted={isMounted} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
