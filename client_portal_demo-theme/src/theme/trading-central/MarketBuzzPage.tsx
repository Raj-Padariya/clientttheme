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

const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const formatUsd = (value: number) => usd.format(value);

const PREVIEW_CARD_COUNT = 6;

function LockRing() {
  const progressLength = (UNLOCK_PROGRESS / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative grid size-56 place-items-center">
      <span aria-hidden="true" className="absolute inset-4 animate-ring-ripple rounded-full ring-2 ring-primary/40 motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-primary/30 motion-reduce:animate-none" />
      <svg viewBox="0 0 160 160" className="absolute inset-3 -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={RING_RADIUS} fill="none" strokeWidth="8" className="stroke-surface-2" />
        <circle
          cx="80"
          cy="80"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(progressLength, 4)} ${RING_CIRCUMFERENCE}`}
          className="stroke-primary drop-shadow-[0_0_6px_var(--brand-primary)]"
        />
      </svg>

      <div className="relative flex flex-col items-center gap-1">
        <span className="grid size-16 animate-float place-items-center rounded-2xl bg-primary text-on-primary shadow-[0_0_40px_-6px_var(--brand-primary)] motion-reduce:animate-none">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            <circle cx="12" cy="16" r="1.4" className="fill-current" />
          </svg>
        </span>
        <span className="mt-1 text-2xl font-semibold tabular-nums text-fg">
          <CountUp value={UNLOCK_PROGRESS} format={(current) => `${current.toFixed(1)}%`} />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{translate('tc.mb.progress')}</span>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone, index }: { label: string; value: number; tone: 'primary' | 'muted' | 'strong'; index: number }) {
  return (
    <div
      style={staggerStyle(index, 120)}
      className={cx(
        'flex animate-rise flex-col gap-1 rounded-xl p-4 ring-1 motion-reduce:animate-none',
        tone === 'primary' && 'bg-primary-soft ring-primary/40',
        tone === 'muted' && 'bg-surface-2 ring-line',
        tone === 'strong' && 'bg-surface ring-line-strong',
      )}
    >
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={cx('text-lg font-semibold tabular-nums', tone === 'primary' ? 'text-primary' : 'text-fg')}>
        <CountUp value={value} format={formatUsd} />
      </span>
    </div>
  );
}

function UnlockTrack() {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-3 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
        <span
          style={{ width: `${Math.max(UNLOCK_PROGRESS, 1.5)}%` }}
          className="block h-full animate-progress-fill rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)] motion-reduce:animate-none"
        />
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      </div>
      <div className="flex items-center justify-between text-[11px] tabular-nums text-fg-subtle">
        <span className="flex items-center gap-1.5 font-medium text-primary">
          <span className="size-2 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none" />
          {translate('tc.mb.you')} · {formatUsd(DEPOSITED_AMOUNT)}
        </span>
        <span>{formatUsd(UNLOCK_THRESHOLD)}</span>
      </div>
    </div>
  );
}

function LockedPreview() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid select-none grid-cols-2 gap-4 p-6 opacity-60 blur-[6px] lg:grid-cols-3">
      {Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4 ring-1 ring-line">
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

      <section className="relative min-h-[560px] overflow-hidden rounded-xl bg-surface shadow-card">
        <LockedPreview />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-surface/40 via-surface/80 to-surface" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 size-[28rem] -translate-x-1/2 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none"
        />

        <div className="relative mx-auto flex max-w-2xl animate-rise flex-col items-center gap-6 px-5 py-12 text-center motion-reduce:animate-none">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
            <Icon name="clock" size={13} />
            {translate('tc.mb.preview')}
          </span>

          <LockRing />

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              {translate('tc.mb.title')} <span className="text-primary">{formatUsd(UNLOCK_THRESHOLD)}</span>
            </h2>
            <p className="text-sm leading-relaxed text-fg-muted">
              {translate('tc.mb.depositedPrefix')} <span className="font-semibold text-fg">{formatUsd(DEPOSITED_AMOUNT)}</span>{' '}
              {translate('tc.mb.depositedMiddle')} <span className="font-semibold text-fg">{formatUsd(REMAINING_AMOUNT)}</span>{' '}
              {translate('tc.mb.depositedSuffix')}
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <StatTile index={1} label={translate('tc.mb.deposited')} value={DEPOSITED_AMOUNT} tone="primary" />
            <StatTile index={2} label={translate('tc.mb.remaining')} value={REMAINING_AMOUNT} tone="strong" />
            <StatTile index={3} label={translate('tc.mb.unlockAt')} value={UNLOCK_THRESHOLD} tone="muted" />
          </div>

          <div className="w-full">
            <UnlockTrack />
          </div>

          <LinkButton href="/deposit" size="lg" className="group shadow-[0_14px_30px_-14px_var(--brand-primary)]">
            <Icon name="deposit" size={18} />
            {translate('tc.mb.depositNow')}
            <Icon name="chevronRight" size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
