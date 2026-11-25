'use client';

import Link from 'next/link';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';

const UNLOCK_THRESHOLD = 100_000;
const DEPOSITED_AMOUNT = 1_200;
const REMAINING_AMOUNT = Math.max(0, UNLOCK_THRESHOLD - DEPOSITED_AMOUNT);
const UNLOCK_PROGRESS = Math.min(100, (DEPOSITED_AMOUNT / UNLOCK_THRESHOLD) * 100);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const formatUsd = (value: number) => usd.format(value);

const RING_DOTS = 60;
const RING_LIT = Math.max(1, Math.round((UNLOCK_PROGRESS / 100) * RING_DOTS));
// The ledger splits the threshold into 100 dots; a partly-funded dot shows as a ring with a small core.
const LEDGER_DOTS = 100;
const DOLLARS_PER_DOT = UNLOCK_THRESHOLD / LEDGER_DOTS;
const FULL_DOTS = Math.min(LEDGER_DOTS, Math.floor(DEPOSITED_AMOUNT / DOLLARS_PER_DOT));
const HAS_PARTIAL_DOT = FULL_DOTS < LEDGER_DOTS && DEPOSITED_AMOUNT % DOLLARS_PER_DOT > 0;
const PREVIEW_CARD_COUNT = 6;
const PREVIEW_DOTS = [40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85];

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

function SpinBead({ size = 'size-12', inner = 'size-9', iconSize = 15 }: { size?: string; inner?: string; iconSize?: number }) {
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center', size)}>
      <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
      <span className={cx(beadClass, inner)}>
        <Icon name="lock" size={iconSize} />
      </span>
    </span>
  );
}

function IntroCard() {
  return (
    <FrostCard className="h-full">
      <div className="flex h-full flex-col gap-5 text-[#0a1220] sm:p-2">
        <p className={cx('inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', frostChipClass)}>
          <Icon name="clock" size={13} />
          {translate('tc.mb.preview')}
        </p>

        <h2 className="mt-auto text-3xl leading-[1.08] font-black tracking-[-0.03em] sm:text-[2.6rem]">
          {translate('tc.mb.title')} <span className="block font-mono tracking-tight">{formatUsd(UNLOCK_THRESHOLD)}</span>
        </h2>
        <p className="max-w-lg text-sm leading-relaxed font-medium text-[#3b4658]">
          {translate('tc.mb.depositedPrefix')} <span className="font-bold text-[#0a1220]">{formatUsd(DEPOSITED_AMOUNT)}</span> {translate('tc.mb.depositedMiddle')}{' '}
          <span className="font-bold text-[#0a1220]">{formatUsd(REMAINING_AMOUNT)}</span> {translate('tc.mb.depositedSuffix')}
        </p>

        <div className="mt-auto border-t border-dotted border-[#0a1220]/25 pt-5">
          <Link
            href="/deposit"
            className="group/ink relative inline-flex h-12 items-center gap-3 overflow-hidden rounded-full bg-[#0a1220] py-2 pr-2 pl-2 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgb(10_18_32/0.9)] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
            <span className="relative grid size-8 place-items-center rounded-full bg-white text-[#0a1220]">
              <Icon name="deposit" size={15} />
            </span>
            <span className="relative">{translate('tc.mb.depositNow')}</span>
            <span className="relative grid size-8 place-items-center rounded-full ring-1 ring-white/30 transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
              <Icon name="chevronRight" size={15} />
            </span>
          </Link>
        </div>
      </div>
    </FrostCard>
  );
}

/** Unlock progress as a ring of dots around a lock bead; one lit dot per 1/60th of the threshold. */
function UnlockMeter() {
  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[15rem] place-items-center">
      <span aria-hidden="true" className="absolute inset-0">
        {Array.from({ length: RING_DOTS }, (_, dot) => {
          const angle = (dot / RING_DOTS) * 2 * Math.PI - Math.PI / 2;
          const isLit = dot < RING_LIT;
          const isMajor = dot % 5 === 0;
          return (
            <span
              key={dot}
              style={{ left: `${50 + 47 * Math.cos(angle)}%`, top: `${50 + 47 * Math.sin(angle)}%`, animationDelay: `${dot * 12}ms` }}
              className={cx(
                'absolute -translate-x-1/2 -translate-y-1/2 animate-dot-pop rounded-full motion-reduce:animate-none',
                isLit ? 'size-2.5 bg-fg' : isMajor ? 'size-1.5 bg-fg/35' : 'size-1 bg-fg/15',
              )}
            />
          );
        })}
      </span>
      <span aria-hidden="true" className="absolute top-[3%] left-1/2 size-4 -translate-x-1/2 animate-ping-soft rounded-full bg-fg/30 motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute inset-[16%] animate-rim-spin rounded-full border border-dashed border-line-strong [animation-duration:24s] motion-reduce:animate-none" />

      <div className="relative flex flex-col items-center gap-1.5 text-center">
        <span className={cx(beadClass, 'size-12 animate-float motion-reduce:animate-none')}>
          <Icon name="lock" size={18} />
        </span>
        <span className="font-mono text-3xl leading-none font-black text-fg tabular-nums">
          <CountUp value={UNLOCK_PROGRESS} format={(current) => `${current.toFixed(1)}%`} />
        </span>
        <span className={captionClass}>{translate('tc.mb.progress')}</span>
      </div>
    </div>
  );
}

function DepositReceipt() {
  const rows = [
    { label: translate('tc.mb.deposited'), value: DEPOSITED_AMOUNT, highlight: true },
    { label: translate('tc.mb.remaining'), value: REMAINING_AMOUNT, highlight: false },
    { label: translate('tc.mb.unlockAt'), value: UNLOCK_THRESHOLD, highlight: false },
  ];

  return (
    <dl className="flex flex-col gap-1">
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <div
            key={row.label}
            style={staggerStyle(index + 1, 120)}
            className={cx('flex animate-feed-in items-end gap-2.5 rounded-full py-2 pr-4 pl-2 motion-reduce:animate-none', row.highlight && 'bg-fg/[0.06]')}
          >
            <dt className="flex shrink-0 items-center gap-2 text-sm text-fg-muted">
              <span aria-hidden="true" className={cx('grid size-6 place-items-center rounded-full', row.highlight ? 'bg-fg text-app' : 'nova-gloss text-fg')}>
                {isLast ? <Icon name="lock" size={11} /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              {row.label}
            </dt>
            <span aria-hidden="true" className="mb-1.5 min-w-4 flex-1 border-b border-dotted border-line-strong" />
            <dd className={cx('shrink-0 font-mono font-black tabular-nums', row.highlight ? 'text-base text-fg' : 'text-sm text-fg')}>
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
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none')}>
      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <LiveDot />
          {translate('tc.mb.progress')}
        </p>
        <span className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold text-fg tabular-nums ring-1 ring-line">{UNLOCK_PROGRESS.toFixed(1)}%</span>
      </div>
      <UnlockMeter />
      <div className="border-t border-dotted border-line-strong pt-4">
        <DepositReceipt />
      </div>
    </section>
  );
}

/** The threshold as 100 dots: funded dots are solid, the partly-funded one is a ring with a core, the last one is the lock. */
function DepositLedger() {
  return (
    <section style={staggerStyle(2, 140)} className={cx(panelClass, 'flex animate-rise flex-col gap-4 p-5 motion-reduce:animate-none')}>
      <div
        role="img"
        aria-label={`${translate('tc.mb.you')} · ${formatUsd(DEPOSITED_AMOUNT)} / ${formatUsd(UNLOCK_THRESHOLD)}`}
        className="grid grid-cols-[repeat(20,minmax(0,1fr))] justify-items-center gap-y-3 md:grid-cols-[repeat(25,minmax(0,1fr))] xl:grid-cols-[repeat(50,minmax(0,1fr))]"
      >
        {Array.from({ length: LEDGER_DOTS }, (_, dot) => {
          const isFull = dot < FULL_DOTS;
          const isPartial = HAS_PARTIAL_DOT && dot === FULL_DOTS;
          const isLock = dot === LEDGER_DOTS - 1;
          return (
            <span key={dot} style={{ animationDelay: `${dot * 8}ms` }} className="grid size-4 animate-dot-pop place-items-center motion-reduce:animate-none">
              {isLock ? (
                <span className="grid size-4 place-items-center rounded-full bg-fg/10 text-fg-muted">
                  <Icon name="lock" size={9} />
                </span>
              ) : isFull ? (
                <span className="relative grid size-3 place-items-center">
                  <span className="absolute inset-0 animate-ping-soft rounded-full bg-fg/40 motion-reduce:animate-none" />
                  <span className="relative size-3 rounded-full bg-fg" />
                </span>
              ) : isPartial ? (
                <span className="grid size-3 place-items-center rounded-full border border-fg/70">
                  <span className="size-1 rounded-full bg-fg" />
                </span>
              ) : (
                <span className="size-1.5 rounded-full bg-fg/15" />
              )}
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dotted border-line-strong pt-3 font-mono text-[11px] text-fg-subtle tabular-nums">
        <span className="flex items-center gap-2 font-bold text-fg">
          <span aria-hidden="true" className="size-2 rounded-full bg-fg" />
          {translate('tc.mb.you')} · {formatUsd(DEPOSITED_AMOUNT)}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="lock" size={11} />
          {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </div>
    </section>
  );
}

function LockedPreview() {
  return (
    <section style={staggerStyle(3, 140)} className={cx(panelClass, 'relative h-56 animate-rise motion-reduce:animate-none')}>
      <div aria-hidden="true" className="pointer-events-none grid select-none grid-cols-2 gap-4 p-5 opacity-60 blur-[5px] lg:grid-cols-3">
        {Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-[22px] p-4 ring-1 ring-line">
            <div className="flex items-center gap-2">
              <span className="nova-gloss size-8 rounded-full" />
              <span className="h-3 w-24 rounded-full bg-line-strong" />
            </div>
            <span className="h-2 w-full rounded-full bg-line" />
            <span className="h-2 w-4/5 rounded-full bg-line" />
            <div className="mt-auto flex h-12 items-end justify-between">
              {PREVIEW_DOTS.map((height, dotIndex) => (
                <span key={dotIndex} style={{ marginBottom: `${((height + index * 7) % 100) * 0.4}px` }} className="size-1.5 rounded-full bg-fg/50" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-surface/20 via-surface/60 to-surface" />
      <span className="absolute top-1/2 left-1/2 -translate-1/2">
        <SpinBead size="size-16" inner="size-12" iconSize={18} />
      </span>
    </section>
  );
}

export default function MarketBuzzPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
        <SpinBead />
        <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.tcMarketBuzz')}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <IntroCard />
        <ProgressPanel />
      </div>

      <DepositLedger />
      <LockedPreview />
    </div>
  );
}
