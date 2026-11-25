'use client';

import Link from 'next/link';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';

const UNLOCK_THRESHOLD = 100_000;
const DEPOSITED_AMOUNT = 1_200;
const REMAINING_AMOUNT = Math.max(0, UNLOCK_THRESHOLD - DEPOSITED_AMOUNT);
const UNLOCK_PROGRESS = Math.min(100, (DEPOSITED_AMOUNT / UNLOCK_THRESHOLD) * 100);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const formatUsd = (value: number) => usd.format(value);

const RED = 'var(--zenith-red)';
const TRACK_TICKS = 60;
const TRACK_LIT = Math.max(1, Math.round((UNLOCK_PROGRESS / 100) * TRACK_TICKS));
// The ledger splits the threshold into 100 pixels; a partly-funded pixel shows an outline with a red core.
const LEDGER_DOTS = 100;
const DOLLARS_PER_DOT = UNLOCK_THRESHOLD / LEDGER_DOTS;
const FULL_DOTS = Math.min(LEDGER_DOTS, Math.floor(DEPOSITED_AMOUNT / DOLLARS_PER_DOT));
const HAS_PARTIAL_DOT = FULL_DOTS < LEDGER_DOTS && DEPOSITED_AMOUNT % DOLLARS_PER_DOT > 0;
const PREVIEW_CARD_COUNT = 6;
const PREVIEW_DOTS = [40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85];

const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';

/** Lock bead inside a dashed rim, with a red pixel orbiting the rim. */
function SpinBead({ size = 'size-12', inner = 'size-9', iconSize = 15 }: { size?: string; inner?: string; iconSize?: number }) {
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center', size)}>
      <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
        <span style={{ background: RED }} className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-[2px]" />
      </span>
      <span className={cx(beadClass, inner)}>
        <Icon name="lock" size={iconSize} />
      </span>
    </span>
  );
}

function IntroCard() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-1 text-xs font-semibold text-app">
        <span style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-white">
          <Icon name="clock" size={11} />
        </span>
        {translate('tc.mb.preview')}
      </p>

      <h2 className="text-3xl leading-[1.05] font-black tracking-tight text-fg sm:text-4xl">
        {translate('tc.mb.title')}
        <span className="mt-2 block font-mono text-5xl tracking-tighter sm:text-6xl">{formatUsd(UNLOCK_THRESHOLD)}</span>
      </h2>
      <p className="max-w-lg border-l-2 border-[var(--zenith-red)] pl-4 text-sm leading-relaxed text-fg-muted">
        {translate('tc.mb.depositedPrefix')} <span className="font-bold text-fg">{formatUsd(DEPOSITED_AMOUNT)}</span> {translate('tc.mb.depositedMiddle')}{' '}
        <span className="font-bold text-fg">{formatUsd(REMAINING_AMOUNT)}</span> {translate('tc.mb.depositedSuffix')}
      </p>

      <div className="pt-1">
        <Link
          href="/deposit"
          className="group/ink inline-flex h-12 items-center gap-3 rounded-full bg-fg py-2 pr-2 pl-2 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span style={{ background: RED }} className="relative grid size-8 place-items-center rounded-full text-white transition-transform duration-300 group-hover/ink:-rotate-12">
            <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
            <Icon name="deposit" size={15} className="relative" />
          </span>
          <span>{translate('tc.mb.depositNow')}</span>
          <span className="grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="chevronRight" size={15} />
          </span>
        </Link>
      </div>
    </div>
  );
}

/** Unlock progress as a capsule of 60 tick columns: funded ticks solid, the newest one red and tall, the lock waiting at the far end. */
function UnlockMeter() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
          <CountUp value={UNLOCK_PROGRESS} format={(current) => `${current.toFixed(1)}%`} />
        </span>
        <span className={cx(captionClass, 'pb-1.5')}>{translate('tc.mb.progress')}</span>
      </div>

      <div aria-hidden="true" className="flex h-16 items-center gap-2 rounded-full bg-fg/[0.04] py-2 pr-2 pl-4 ring-1 ring-line">
        <span className="flex h-full min-w-0 flex-1 items-center gap-[3px]">
          {Array.from({ length: TRACK_TICKS }, (_, tick) => {
            const isLit = tick < TRACK_LIT;
            const isHead = tick === TRACK_LIT - 1;
            return (
              <span
                key={tick}
                style={{ animationDelay: `${tick * 25}ms`, ...(isHead ? { background: RED } : {}) }}
                className={cx(
                  'min-w-0 flex-1 rounded-full',
                  isHead ? 'zenith-blink h-full' : isLit ? 'h-3/4 bg-fg' : cx('zenith-twinkle', tick % 10 === 9 ? 'h-1/2 bg-fg/25' : 'h-1/4 bg-fg/15'),
                )}
              />
            );
          })}
        </span>
        <span className={cx(beadClass, 'size-12 animate-float motion-reduce:animate-none')}>
          <Icon name="lock" size={18} />
        </span>
      </div>
    </div>
  );
}

/** Deposited / remaining / unlock-at as three numeral tiles; the deposited tile is solid. */
function DepositReceipt() {
  const rows = [
    { label: translate('tc.mb.deposited'), value: DEPOSITED_AMOUNT, highlight: true },
    { label: translate('tc.mb.remaining'), value: REMAINING_AMOUNT, highlight: false },
    { label: translate('tc.mb.unlockAt'), value: UNLOCK_THRESHOLD, highlight: false },
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-3">
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <div
            key={row.label}
            style={staggerStyle(index + 1, 120)}
            className={cx(
              'flex min-w-0 animate-feed-in flex-col gap-3 rounded-[26px] p-4 motion-reduce:animate-none',
              row.highlight ? 'bg-fg text-app' : 'bg-fg/[0.03] ring-1 ring-line',
            )}
          >
            <dt className={cx('flex items-center gap-2 text-sm', row.highlight ? 'text-app/70' : 'text-fg-muted')}>
              <span
                aria-hidden="true"
                style={row.highlight ? { background: RED } : undefined}
                className={cx('grid size-7 place-items-center rounded-full', row.highlight ? 'text-white' : 'bg-fg/10 text-fg')}
              >
                {isLast ? <Icon name="lock" size={12} /> : <span className="size-2 rounded-[2px] bg-current" />}
              </span>
              {row.label}
            </dt>
            <dd className={cx('truncate font-mono text-2xl font-black tracking-tight tabular-nums', !row.highlight && 'text-fg')}>
              <CountUp value={row.value} format={formatUsd} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ProgressPanel() {
  return (
    <section style={staggerStyle(1, 140)} className="flex min-w-0 animate-rise flex-col justify-end gap-5 motion-reduce:animate-none">
      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <LiveDot />
          {translate('tc.mb.progress')}
        </p>
        <span style={{ background: RED }} className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold text-white tabular-nums">
          {UNLOCK_PROGRESS.toFixed(1)}%
        </span>
      </div>
      <UnlockMeter />
    </section>
  );
}

/** The threshold as 100 pixels: funded pixels solid, the partly-funded one outlined with a red core, the last one is the lock. */
function DepositLedger() {
  return (
    <section style={staggerStyle(2, 140)} className="flex animate-rise flex-col gap-4 rounded-[30px] border border-dashed border-line-strong p-5 motion-reduce:animate-none">
      <div
        role="img"
        aria-label={`${translate('tc.mb.you')} · ${formatUsd(DEPOSITED_AMOUNT)} / ${formatUsd(UNLOCK_THRESHOLD)}`}
        className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(20,minmax(0,1fr))] md:grid-cols-[repeat(25,minmax(0,1fr))] xl:grid-cols-[repeat(50,minmax(0,1fr))]"
      >
        {Array.from({ length: LEDGER_DOTS }, (_, dot) => {
          const isFull = dot < FULL_DOTS;
          const isPartial = HAS_PARTIAL_DOT && dot === FULL_DOTS;
          const isLock = dot === LEDGER_DOTS - 1;
          return (
            <span key={dot} style={{ animationDelay: `${dot * 10}ms` }} className="zenith-pixel aspect-square">
              {isLock ? (
                <span className="grid size-full place-items-center rounded-[5px] bg-fg text-app">
                  <Icon name="lock" size={10} />
                </span>
              ) : isFull ? (
                <span className="block size-full rounded-[5px] bg-fg" />
              ) : isPartial ? (
                <span className="grid size-full place-items-center rounded-[5px] border-2 border-fg/70">
                  <span style={{ background: RED }} className="zenith-blink size-1/2 rounded-[2px]" />
                </span>
              ) : (
                <span style={{ animationDelay: `${((dot * 13) % 17) * 140}ms` }} className="zenith-twinkle block size-full rounded-[5px] bg-fg/[0.07]" />
              )}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-fg-subtle tabular-nums">
        <span className="flex items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-1 font-bold text-app">
          <span aria-hidden="true" style={{ background: RED }} className="size-4 rounded-full" />
          {translate('tc.mb.you')} · {formatUsd(DEPOSITED_AMOUNT)}
        </span>
        <span className="flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ring-line">
          <Icon name="lock" size={11} />
          {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </div>
    </section>
  );
}

function LockedPreview() {
  return (
    <section style={staggerStyle(3, 140)} className="relative h-60 animate-rise overflow-hidden rounded-[30px] bg-fg/[0.02] ring-1 ring-line motion-reduce:animate-none">
      <div aria-hidden="true" className="pointer-events-none grid select-none grid-cols-2 gap-3 p-5 opacity-60 blur-[5px] lg:grid-cols-3">
        {Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-[24px] bg-fg/[0.04] p-4">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-full bg-fg/30" />
              <span className="h-3 w-24 rounded-full bg-line-strong" />
            </div>
            <span className="h-2 w-full rounded-full bg-line" />
            <span className="h-2 w-4/5 rounded-full bg-line" />
            <div className="mt-auto flex h-12 items-end gap-1">
              {PREVIEW_DOTS.map((height, dotIndex) => (
                <span key={dotIndex} style={{ height: `${20 + ((height + index * 7) % 100) * 0.8}%` }} className="min-w-0 flex-1 rounded-[2px] bg-fg/50" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-app/10 via-app/60 to-app" />
      <div className="absolute top-1/2 left-1/2 flex -translate-1/2 flex-col items-center gap-3">
        <SpinBead size="size-16" inner="size-12" iconSize={18} />
        <span className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-1 font-mono text-[11px] font-bold whitespace-nowrap text-app tabular-nums">
          <span style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-white">
            <Icon name="lock" size={10} />
          </span>
          {translate('tc.mb.unlockAt')} {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </div>
    </section>
  );
}

// Skeleton: open title → intro (left) | numeral + tick-capsule meter (right) → three receipt tiles → 100-pixel ledger → locked preview.
export default function MarketBuzzPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-center gap-4">
        <SpinBead />
        <h1 className="min-w-0 truncate text-2xl font-black tracking-tight text-fg-muted">{translate('nav.tcMarketBuzz')}</h1>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <IntroCard />
        <ProgressPanel />
      </div>

      <DepositReceipt />
      <DepositLedger />
      <LockedPreview />
    </div>
  );
}
