'use client';

import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, staggerStyle } from '../pamm/motion';
import { LinkButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

const UNLOCK_THRESHOLD = 100_000;
const DEPOSITED_AMOUNT = 1_200;
const REMAINING_AMOUNT = Math.max(0, UNLOCK_THRESHOLD - DEPOSITED_AMOUNT);
const UNLOCK_PROGRESS = Math.min(100, (DEPOSITED_AMOUNT / UNLOCK_THRESHOLD) * 100);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const formatUsd = (value: number) => usd.format(value);

const PREVIEW_CARD_COUNT = 6;
const DIAL_TICKS = Array.from({ length: 60 }, (_, index) => {
  const angle = (index / 60) * Math.PI * 2;
  const inner = index % 5 === 0 ? 72 : 78;
  return {
    index,
    x1: (100 + Math.sin(angle) * inner).toFixed(2),
    y1: (100 - Math.cos(angle) * inner).toFixed(2),
    x2: (100 + Math.sin(angle) * 84).toFixed(2),
    y2: (100 - Math.cos(angle) * 84).toFixed(2),
    major: index % 5 === 0,
  };
});
const TRACK_TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const DOOR_RIVETS = ['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'];
const DOOR_BOLTS = [
  'top-[7%] left-1/2 h-6 w-2.5 -translate-x-1/2',
  'bottom-[7%] left-1/2 h-6 w-2.5 -translate-x-1/2',
  'top-1/2 left-[7%] h-2.5 w-6 -translate-y-1/2',
  'top-1/2 right-[7%] h-2.5 w-6 -translate-y-1/2',
];

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.4" className="fill-current" />
    </svg>
  );
}

/** A vault door: engaged bolts, a combination dial that keeps turning, and the unlock progress as the dial's rim. */
function VaultDoor() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
      <span aria-hidden="true" className="absolute inset-6 -z-10 animate-ring-breathe rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
      <div aria-hidden="true" className="absolute inset-0 rounded-[2.25rem] border border-line-strong bg-fg/[0.03] shadow-card" />
      <span aria-hidden="true" className="absolute top-[18%] -left-1.5 h-[16%] w-3 rounded-full border border-line-strong bg-surface-2" />
      <span aria-hidden="true" className="absolute bottom-[18%] -left-1.5 h-[16%] w-3 rounded-full border border-line-strong bg-surface-2" />
      {DOOR_RIVETS.map((position) => (
        <span key={position} aria-hidden="true" className={cx('absolute size-2 rounded-full bg-line-strong', position)} />
      ))}
      {DOOR_BOLTS.map((position) => (
        <span key={position} aria-hidden="true" className={cx('absolute rounded-full border border-primary/45 bg-primary/25', position)} />
      ))}

      <svg viewBox="0 0 200 200" className="absolute inset-[13%] overflow-visible" aria-hidden="true">
        <circle cx="100" cy="100" r="92" fill="none" strokeWidth="4" className="stroke-line" />
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - Math.max(UNLOCK_PROGRESS, 1.5)}
          transform="rotate(-90 100 100)"
          stroke="var(--brand-primary)"
          className="drop-shadow-[0_0_6px_var(--brand-primary)]"
        />
        <g className="origin-center animate-orbit-spin [animation-duration:40s] [transform-box:fill-box] motion-reduce:animate-none">
          {DIAL_TICKS.map((tick) => (
            <line
              key={tick.index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              strokeWidth={tick.major ? 2 : 1}
              strokeLinecap="round"
              className={tick.major ? 'stroke-primary/70' : 'stroke-line-strong'}
            />
          ))}
        </g>
        <circle cx="100" cy="100" r="64" strokeWidth="1" className="fill-surface stroke-line" />
      </svg>
      <span aria-hidden="true" className="absolute top-[10%] left-1/2 -translate-x-1/2 border-x-[6px] border-t-[9px] border-x-transparent border-t-primary" />

      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-1">
          <span className="grid size-14 animate-orbit-bob place-items-center rounded-2xl border border-primary/40 bg-primary/15 text-primary shadow-[0_0_30px_-8px_var(--brand-primary)] motion-reduce:animate-none">
            <LockGlyph />
          </span>
          <span className="mt-1 font-mono text-2xl font-semibold text-fg tabular-nums">
            <CountUp value={UNLOCK_PROGRESS} format={(current) => `${current.toFixed(1)}%`} />
          </span>
          <span className="text-[10px] font-medium tracking-wide text-fg-subtle uppercase">{translate('tc.mb.progress')}</span>
        </div>
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
    <dl className="flex flex-col gap-0.5 rounded-2xl border border-line bg-fg/[0.02] p-1">
      {rows.map((row, index) => (
        <div
          key={row.label}
          style={staggerStyle(index + 1, 120)}
          className={cx('flex animate-rise items-baseline gap-3 rounded-xl px-4 py-3 motion-reduce:animate-none', row.highlight && 'bg-primary/[0.08]')}
        >
          <dt className="flex shrink-0 items-center gap-2 text-sm text-fg-muted">
            {index === rows.length - 1 && <Icon name="lock" size={14} className="text-primary" />}
            {row.label}
          </dt>
          <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b border-dotted border-line-strong" />
          <dd className={cx('font-mono text-base font-semibold tabular-nums', row.highlight ? 'text-primary' : 'text-fg')}>
            <CountUp value={row.value} format={formatUsd} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function UnlockTrack() {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-4 overflow-hidden rounded-lg border border-line bg-fg/[0.03]">
        <span
          style={{ width: `${Math.max(UNLOCK_PROGRESS, 1.5)}%` }}
          className="block h-full animate-progress-fill rounded-lg bg-primary/75 shadow-[0_0_12px_var(--brand-primary)] motion-reduce:animate-none"
        />
        {TRACK_TICKS.map((tick) => (
          <span key={tick} aria-hidden="true" style={{ left: `${tick}%` }} className="absolute inset-y-1 w-px bg-line-strong" />
        ))}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/5 animate-comet bg-linear-to-r from-transparent via-primary/15 to-transparent [animation-duration:6s] motion-reduce:hidden" />
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] text-fg-subtle tabular-nums">
        <span className="flex items-center gap-1.5 font-medium text-primary">
          <span className="size-2 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none" />
          {translate('tc.mb.you')} · {formatUsd(DEPOSITED_AMOUNT)}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="lock" size={11} />
          {formatUsd(UNLOCK_THRESHOLD)}
        </span>
      </div>
    </div>
  );
}

function LockedPreview() {
  return (
    <div aria-hidden="true" className="pointer-events-none grid select-none grid-cols-2 gap-4 p-5 opacity-60 blur-[5px] lg:grid-cols-3">
      {Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => (
        <div key={index} className="orbit-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-full bg-primary/30" />
            <span className="h-3 w-24 rounded-full bg-line-strong" />
          </div>
          <span className="h-2 w-full rounded-full bg-line" />
          <span className="h-2 w-4/5 rounded-full bg-line" />
          <div className="mt-auto flex h-12 items-end gap-1">
            {[40, 65, 30, 80, 55, 70, 45, 90].map((height, barIndex) => (
              <span key={barIndex} style={{ height: `${(height + index * 7) % 100}%` }} className="flex-1 rounded-sm bg-primary/40" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MarketBuzzPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.tcMarketBuzz')} />

      <section className="orbit-card relative isolate overflow-hidden">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-[10%] -z-10 size-[28rem] animate-drift rounded-full bg-primary/12 blur-3xl motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute top-14 right-[12%] size-1.5 animate-twinkle rounded-full bg-primary motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute right-[30%] bottom-56 size-1 animate-twinkle rounded-full bg-(--orbit-violet) [animation-delay:1.2s] motion-reduce:animate-none" />

        <div className="grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12 xl:px-12">
          <VaultDoor />

          <div className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Icon name="clock" size={13} />
              {translate('tc.mb.preview')}
            </span>

            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                {translate('tc.mb.title')} <span className="font-mono text-primary">{formatUsd(UNLOCK_THRESHOLD)}</span>
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
                {translate('tc.mb.depositedPrefix')} <span className="font-semibold text-fg">{formatUsd(DEPOSITED_AMOUNT)}</span>{' '}
                {translate('tc.mb.depositedMiddle')} <span className="font-semibold text-fg">{formatUsd(REMAINING_AMOUNT)}</span>{' '}
                {translate('tc.mb.depositedSuffix')}
              </p>
            </div>

            <DepositReceipt />
            <UnlockTrack />

            <LinkButton href="/deposit" size="lg" className="group w-fit shadow-[0_14px_30px_-14px_var(--brand-primary)]">
              <Icon name="deposit" size={18} />
              {translate('tc.mb.depositNow')}
              <Icon name="chevronRight" size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </LinkButton>
          </div>
        </div>

        <div className="relative h-48 overflow-hidden border-t border-line">
          <LockedPreview />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-surface/30 via-surface/70 to-surface" />
          <span aria-hidden="true" className="absolute top-1/2 left-1/2 grid size-11 -translate-1/2 place-items-center rounded-2xl border border-line-strong bg-surface/80 text-fg-muted backdrop-blur">
            <Icon name="lock" size={18} />
          </span>
        </div>
      </section>
    </div>
  );
}
