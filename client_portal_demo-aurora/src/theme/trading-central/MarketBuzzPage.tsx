'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';
import '../promotion/market.css';
import './buzz.css';

const UNLOCK_THRESHOLD = 100_000;
const DEPOSITED_AMOUNT = 1_200;
const REMAINING_AMOUNT = Math.max(0, UNLOCK_THRESHOLD - DEPOSITED_AMOUNT);
const UNLOCK_PROGRESS = Math.min(100, (DEPOSITED_AMOUNT / UNLOCK_THRESHOLD) * 100);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const formatUsd = (value: number) => usd.format(value);

// Unlocking is read as a limit order at the threshold: the deposit is the filled part, the ladder steps in $10k levels.
const LADDER_LEVELS = 10;
const LEVEL_STEP = UNLOCK_THRESHOLD / LADDER_LEVELS;
const ladderRows = Array.from({ length: LADDER_LEVELS }, (_, index) => {
  const level = LADDER_LEVELS - index;
  const floor = (level - 1) * LEVEL_STEP;
  const fill = Math.min(1, Math.max(0, (DEPOSITED_AMOUNT - floor) / LEVEL_STEP));
  return { level, price: level * LEVEL_STEP, fill };
});
const ACTIVE_LEVEL = Math.min(LADDER_LEVELS, Math.floor(DEPOSITED_AMOUNT / LEVEL_STEP) + 1);

// The fill tape splits the threshold into 100 prints; a partly-filled print blinks clay.
const LEDGER_DOTS = 100;
const DOLLARS_PER_DOT = UNLOCK_THRESHOLD / LEDGER_DOTS;
const FULL_DOTS = Math.min(LEDGER_DOTS, Math.floor(DEPOSITED_AMOUNT / DOLLARS_PER_DOT));
const HAS_PARTIAL_DOT = FULL_DOTS < LEDGER_DOTS && DEPOSITED_AMOUNT % DOLLARS_PER_DOT > 0;
const PREVIEW_CARD_COUNT = 6;
const PREVIEW_DOTS = [40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85];

const RED = 'var(--aurora-cta-from)';
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';

/** Square lock key with a clay ripple — the "order pending" marker. */
function LockKey({ size = 'size-12', iconSize = 15 }: { size?: string; iconSize?: number }) {
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center', size)}>
      <span className="absolute inset-0 animate-ring-ripple rounded-lg border-2 border-(--aurora-cta-from)/60 motion-reduce:hidden" />
      <span className={cx(beadClass, 'size-full')}>
        <Icon name="lock" size={iconSize} />
      </span>
    </span>
  );
}

/** Order intro: preview tag, title with the limit price, the fill sentence and the deposit key. */
function IntroCard() {
  return (
    <section className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 sm:p-6 motion-reduce:animate-none')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
      </span>
      <p className="inline-flex w-fit items-center gap-2 rounded-md bg-(--aurora-cta-from)/12 py-1 pr-2.5 pl-1 text-xs font-semibold text-(--aurora-cta-from) ring-1 ring-(--aurora-cta-from)/30">
        <span className="grid size-5 place-items-center rounded bg-(--aurora-cta-from) text-[#062520]">
          <Icon name="clock" size={11} />
        </span>
        {translate('tc.mb.preview')}
      </p>

      <h2 className="text-3xl leading-[1.05] font-black tracking-tight text-fg sm:text-4xl">
        {translate('tc.mb.title')}
        <span className="mt-3 flex w-fit items-center gap-3 rounded-lg bg-fg/[0.04] py-1.5 pr-4 pl-1.5 font-mono text-4xl tracking-tighter ring-1 ring-line sm:text-5xl">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-md bg-(--aurora-cta-from) text-[#062520]">
            <Icon name="lock" size={16} />
          </span>
          {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </h2>
      <p className="max-w-lg border-l-2 border-(--hero-buy) pl-4 text-sm leading-relaxed text-fg-muted">
        {translate('tc.mb.depositedPrefix')} <span className="font-bold text-fg">{formatUsd(DEPOSITED_AMOUNT)}</span> {translate('tc.mb.depositedMiddle')}{' '}
        <span className="font-bold text-fg">{formatUsd(REMAINING_AMOUNT)}</span> {translate('tc.mb.depositedSuffix')}
      </p>

      <div className="mt-auto pt-1">
        <Link
          href="/deposit"
          className="group/ink relative inline-flex h-12 items-center gap-3 overflow-hidden rounded-lg bg-(--hero-buy) py-2 pr-2 pl-2 text-sm font-semibold text-[#062520] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
          <span style={{ background: RED }} className="relative grid size-8 place-items-center rounded-md transition-transform duration-300 group-hover/ink:-rotate-12">
            <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[8px] border-2 motion-reduce:hidden" />
            <Icon name="deposit" size={15} className="relative" />
          </span>
          <span className="relative">{translate('tc.mb.depositNow')}</span>
          <span className="relative grid size-8 place-items-center rounded-md bg-[#062520]/15 transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="chevronRight" size={15} />
          </span>
        </Link>
      </div>
    </section>
  );
}

/** Unlock progress as an order-book ladder: $10k levels from the locked limit on top down to the first level; filled depth sweeps in sage, the working level blinks clay, the rest breathe as ghost depth. */
function UnlockMeter() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
          <CountUp value={UNLOCK_PROGRESS} format={(current) => `${current.toFixed(1)}%`} />
        </span>
        <span className={cx(captionClass, 'pb-1.5')}>{translate('tc.mb.progress')}</span>
      </div>

      <ol aria-hidden="true" className="flex flex-col overflow-hidden rounded-lg ring-1 ring-line">
        {ladderRows.map((row, index) => {
          const isLimit = row.level === LADDER_LEVELS;
          const isActive = row.level === ACTIVE_LEVEL;
          return (
            <li
              key={row.level}
              style={staggerStyle(index, 45)}
              className={cx(
                'relative flex h-7 animate-feed-in items-center gap-2 border-b border-line/60 px-2.5 last:border-b-0 motion-reduce:animate-none',
                isLimit && 'bg-(--aurora-cta-from)/[0.08]',
                isActive && 'ring-1 ring-(--aurora-cta-from) ring-inset',
              )}
            >
              <span className="relative h-full min-w-0 flex-1">
                {row.fill > 0 ? (
                  <span style={{ width: `${Math.max(3, row.fill * 100)}%`, '--mb-delay': `${300 + index * 60}ms` } as CSSProperties} className="mb-fill absolute inset-y-1 left-0 rounded-[2px] bg-(--hero-buy)" />
                ) : (
                  <span
                    style={{ width: `${25 + ((index * 37) % 55)}%`, '--mb-delay': `${(index % 5) * 0.2}s` } as CSSProperties}
                    className={cx('mb-ghost absolute inset-y-1.5 left-0 rounded-[2px]', isLimit ? 'bg-(--aurora-cta-from)/35' : 'bg-fg/10')}
                  />
                )}
                {isActive && <span className="mkt-blink absolute inset-y-0.5 w-1 rounded-[1px] bg-(--aurora-cta-from)" style={{ left: `${Math.max(3, row.fill * 100)}%` }} />}
              </span>
              <span className={cx('w-24 shrink-0 text-right font-mono text-[11px] tabular-nums', isLimit ? 'font-black text-(--aurora-cta-from)' : isActive ? 'font-bold text-fg' : 'text-fg-subtle')}>
                {formatUsd(row.price).replace('.00', '')}
              </span>
              <span className="grid size-4 shrink-0 place-items-center">{isLimit && <Icon name="lock" size={11} className="text-(--aurora-cta-from)" />}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Deposited / remaining / unlock-at as one order ticket with perforated dividers; the filled cell is sage. */
function DepositReceipt() {
  const rows = [
    { label: translate('tc.mb.deposited'), value: DEPOSITED_AMOUNT, highlight: true },
    { label: translate('tc.mb.remaining'), value: REMAINING_AMOUNT, highlight: false },
    { label: translate('tc.mb.unlockAt'), value: UNLOCK_THRESHOLD, highlight: false },
  ];

  return (
    <dl className={cx(panelClass, 'grid sm:grid-cols-3')}>
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <div
            key={row.label}
            style={staggerStyle(index + 1, 120)}
            className={cx(
              'relative flex min-w-0 animate-feed-in flex-col gap-3 border-b-2 border-dashed border-line p-5 last:border-b-0 sm:border-r-2 sm:border-b-0 sm:last:border-r-0 motion-reduce:animate-none',
              row.highlight && 'bg-(--hero-buy)/10',
            )}
          >
            {row.highlight && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-(--hero-buy)" />}
            <dt className="flex items-center gap-2 text-sm text-fg-muted">
              <span
                aria-hidden="true"
                className={cx(
                  'grid size-7 place-items-center rounded-md',
                  row.highlight ? 'bg-(--hero-buy) text-[#062520]' : isLast ? 'bg-(--aurora-cta-from)/15 text-(--aurora-cta-from)' : 'bg-fg/[0.06] text-fg',
                )}
              >
                {isLast ? <Icon name="lock" size={12} /> : <span className="size-2 rounded-[2px] bg-current" />}
              </span>
              {row.label}
            </dt>
            <dd className="truncate font-mono text-2xl font-black tracking-tight text-fg tabular-nums">
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
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 sm:p-6 motion-reduce:animate-none')}>
      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <LiveDot />
          {translate('tc.mb.progress')}
        </p>
        <span className="rounded-md bg-(--hero-buy) px-2.5 py-1 font-mono text-[11px] font-bold text-[#062520] tabular-nums">{UNLOCK_PROGRESS.toFixed(1)}%</span>
      </div>
      <UnlockMeter />
    </section>
  );
}

/** The threshold as a tape of 100 prints: filled prints stand sage, the partly-filled one blinks clay, unfilled ones breathe, the last print is the lock. */
function DepositLedger() {
  return (
    <section style={staggerStyle(2, 140)} className={cx(panelClass, 'flex animate-rise flex-col gap-4 p-5 motion-reduce:animate-none')}>
      <div
        role="img"
        aria-label={`${translate('tc.mb.you')} · ${formatUsd(DEPOSITED_AMOUNT)} / ${formatUsd(UNLOCK_THRESHOLD)}`}
        className="relative flex h-24 items-end gap-[2px] border-b border-dashed border-line-strong"
      >
        {Array.from({ length: LEDGER_DOTS }, (_, dot) => {
          const isFull = dot < FULL_DOTS;
          const isPartial = HAS_PARTIAL_DOT && dot === FULL_DOTS;
          const isLock = dot === LEDGER_DOTS - 1;
          const height = `${28 + ((dot * 37) % 62)}%`;
          if (isLock) {
            return (
              <span key={dot} className="relative h-full min-w-0 flex-1">
                <span className="absolute inset-x-0 top-0 bottom-0 rounded-t-[2px] bg-(--aurora-cta-from)/25" />
                <span className="absolute -top-1 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded bg-(--aurora-cta-from) text-[#062520]">
                  <Icon name="lock" size={10} />
                </span>
              </span>
            );
          }
          if (isFull) return <span key={dot} style={{ height }} className="min-w-0 flex-1 rounded-t-[1px] bg-(--hero-buy)" />;
          if (isPartial) return <span key={dot} style={{ height: '100%' }} className="mkt-blink min-w-0 flex-1 rounded-t-[1px] bg-(--aurora-cta-from)" />;
          return <span key={dot} style={{ height, '--vol-delay': `${(dot % 7) * 0.14}s` } as CSSProperties} className="mkt-vol min-w-0 flex-1 rounded-t-[1px] bg-fg/[0.09]" />;
        })}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed border-(--aurora-cta-from)/50" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-fg-subtle tabular-nums">
        <span className="flex items-center gap-2 rounded-md bg-(--hero-buy)/12 py-1 pr-3 pl-1 font-bold text-fg ring-1 ring-(--hero-buy)/30">
          <span aria-hidden="true" className="mkt-blink size-4 rounded-[3px] bg-(--aurora-cta-from)" />
          {translate('tc.mb.you')} · {formatUsd(DEPOSITED_AMOUNT)}
        </span>
        <span className="flex items-center gap-1.5 rounded-md px-3 py-1 text-(--aurora-cta-from) ring-1 ring-(--aurora-cta-from)/40">
          <Icon name="lock" size={11} />
          {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </div>
    </section>
  );
}

/** Locked feed shown as a halted news terminal: blurred headline rows behind a marching hazard ribbon and the unlock key. */
function LockedPreview() {
  return (
    <section style={staggerStyle(3, 140)} className={cx(panelClass, 'h-64 animate-rise motion-reduce:animate-none')}>
      <div aria-hidden="true" className="pointer-events-none flex select-none flex-col opacity-60 blur-[5px]">
        {Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-dashed border-line px-5 py-2.5">
            <span className="h-6 w-14 shrink-0 rounded bg-fg/30" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="h-2.5 w-4/5 rounded-[2px] bg-line-strong" />
              <span className="h-2 w-3/5 rounded-[2px] bg-line" />
            </span>
            <span className="hidden h-7 w-32 shrink-0 items-end gap-0.5 sm:flex">
              {PREVIEW_DOTS.map((height, dotIndex) => (
                <span
                  key={dotIndex}
                  style={{ height: `${20 + ((height + index * 7) % 100) * 0.8}%` }}
                  className={cx('min-w-0 flex-1 rounded-t-[1px]', (dotIndex + index) % 3 === 0 ? 'bg-(--aurora-cta-from)/60' : 'bg-(--hero-buy)/60')}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-app/10 via-app/60 to-app" />
      <span aria-hidden="true" className="mb-halt pointer-events-none absolute inset-x-0 top-1/2 h-14 -translate-y-1/2 opacity-25" />
      <div className="absolute top-1/2 left-1/2 flex -translate-1/2 flex-col items-center gap-3">
        <LockKey size="size-14" iconSize={18} />
        <span className="inline-flex items-center gap-2 rounded-md bg-surface py-1 pr-3 pl-1 font-mono text-[11px] font-bold whitespace-nowrap text-fg tabular-nums ring-1 ring-(--aurora-cta-from)/50">
          <span className="grid size-5 place-items-center rounded bg-(--aurora-cta-from) text-[#062520]">
            <Icon name="lock" size={10} />
          </span>
          {translate('tc.mb.unlockAt')} {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </div>
    </section>
  );
}

// Skeleton: order title bar → order intro | depth-ladder fill → perforated order ticket → 100-print fill tape → halted news terminal.
export default function MarketBuzzPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className={cx(panelClass, 'flex animate-rise items-center gap-4 p-4 sm:p-5 motion-reduce:animate-none')}>
        <LockKey />
        <h1 className="min-w-0 truncate text-2xl font-black tracking-tight text-fg">{translate('nav.tcMarketBuzz')}</h1>
        <span aria-hidden="true" className="mb-halt ml-auto hidden h-8 w-28 rounded-md opacity-40 sm:block" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <IntroCard />
        <ProgressPanel />
      </div>

      <DepositReceipt />
      <DepositLedger />
      <LockedPreview />
    </div>
  );
}
