'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { RequestStatus, User } from '@/core/types';
import { cx } from '../lib/cx';
import { StatusBadge } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { useCountUp } from './HeroWalletCard';

const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

const RING_RADIUS = 16;

const verificationProgress: Record<RequestStatus, number> = {
  rejected: 10,
  pending: 34,
  processing: 67,
  approved: 100,
};

const verificationStroke: Record<RequestStatus, string> = {
  rejected: 'stroke-danger',
  pending: 'stroke-warning',
  processing: 'stroke-primary',
  approved: 'stroke-success',
};

interface Moment {
  greetingKey: MessageKey;
  date: string;
}

let cachedMoment: Moment | null = null;

function greetingKeyFor(hour: number): MessageKey {
  if (hour < 12) return 'home.greetingMorning';
  if (hour < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

// The page is prerendered, so the clock is read only on the client to avoid a hydration mismatch.
function readMoment(): Moment {
  const now = new Date();
  const greetingKey = greetingKeyFor(now.getHours());
  const date = dateFormat.format(now);
  if (cachedMoment?.greetingKey !== greetingKey || cachedMoment.date !== date) {
    cachedMoment = { greetingKey, date };
  }
  return cachedMoment;
}

function subscribeNever() {
  return () => {};
}

function readServerMoment(): Moment | null {
  return null;
}

// "$1,090.00" → "$1,090" + dim ".00".
function CountingMoney({ amount, currency }: { amount: number; currency: string }) {
  const formatted = formatMoney(useCountUp(amount), currency);
  const decimalIndex = formatted.lastIndexOf('.');
  if (decimalIndex === -1) return <>{formatted}</>;
  return (
    <>
      {formatted.slice(0, decimalIndex)}
      <span className="text-fg-subtle">{formatted.slice(decimalIndex)}</span>
    </>
  );
}

function VerificationRing({ status }: { status: RequestStatus }) {
  const progress = verificationProgress[status];
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r={RING_RADIUS} fill="none" strokeWidth="3.5" className="stroke-line" />
        <circle
          cx="20"
          cy="20"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${progress} 100`}
          className={verificationStroke[status]}
        />
      </svg>
      <span className="relative text-[9.5px] font-semibold text-fg tabular-nums">{progress}%</span>
    </span>
  );
}

interface CommandStripProps {
  user: User;
  /** Wallet plus live trading-account balances; undefined while loading. */
  totalBalance?: number;
  liveAccountCount?: number;
  currency: string;
}

/*
 * One horizontal band over the dashboard: greeting on the left, the total balance inside a small orbit in the
 * middle with the account count and verification beside it, and the two money actions on the right.
 */
export function CommandStrip({ user, totalBalance, liveAccountCount, currency }: CommandStripProps) {
  const moment = useSyncExternalStore<Moment | null>(subscribeNever, readMoment, readServerMoment);
  const greeting = moment ? translate(moment.greetingKey, { name: user.firstName }) : translate('home.welcome', { name: user.firstName });

  return (
    <section
      aria-labelledby="strip-greeting"
      className="orbit-card grid animate-rise items-center gap-5 overflow-hidden p-4 motion-reduce:animate-none sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto]"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <span className="absolute -top-24 left-1/3 size-72 animate-drift rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none" />
        <span className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
      </span>

      <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
        <p className="inline-flex items-center gap-2 text-xs text-fg-muted">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success/60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          <span className="min-h-4">{moment ? `${moment.date} · ${translate('home.marketsOpen')}` : translate('home.marketsOpen')}</span>
        </p>
        <h2 id="strip-greeting" className="mt-1.5 truncate text-lg font-semibold tracking-tight text-fg sm:text-xl">
          {greeting}
        </h2>
        <p className="mt-1 line-clamp-2 max-w-[60ch] text-[13px] leading-relaxed text-fg-muted">{translate('home.heroText')}</p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4 rounded-[20px] border border-line bg-surface-2/50 p-3 sm:p-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
            <span className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_2px_var(--brand-primary)]" />
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/30">
              <Icon name="wallet" size={17} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('home.totalBalance')}</p>
            {totalBalance === undefined ? (
              <span className="mt-1.5 block h-7 w-36 animate-pulse rounded bg-line" />
            ) : (
              <p className="mt-0.5 truncate text-[28px] leading-tight font-light tracking-[-0.02em] text-fg tabular-nums">
                <CountingMoney amount={totalBalance} currency={currency} />
              </p>
            )}
          </div>
        </div>

        <dl className="flex shrink-0 items-center gap-5">
          <div className="min-w-0">
            <dt className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('home.liveAccounts')}</dt>
            <dd className="mt-1 text-lg leading-none font-semibold text-fg tabular-nums">
              {liveAccountCount ?? '—'}
              <span className="ml-1.5 text-xs font-normal text-fg-subtle">{translate('home.accountsActive')}</span>
            </dd>
          </div>
          <span aria-hidden="true" className="h-9 w-px bg-line" />
          <div className="flex items-center gap-2.5">
            <VerificationRing status={user.kycStatus} />
            <div>
              <dt className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('home.verification')}</dt>
              <dd className="mt-1">
                <Link href="/kyc" className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-ring">
                  <StatusBadge status={user.kycStatus} />
                </Link>
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col 2xl:flex-col">
        <Link
          href="/deposit"
          className={cx(
            'group/act relative inline-flex h-11 min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-[image:var(--brand-gradient)] px-5 text-sm font-semibold whitespace-nowrap text-on-primary shadow-[0_10px_26px_-12px_var(--brand-primary)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name="plus" size={17} className="relative shrink-0 transition-transform duration-300 group-hover/act:rotate-90 motion-reduce:transition-none" />
          <span className="relative truncate">{translate('home.depositFunds')}</span>
        </Link>
        <Link
          href="/withdrawal"
          className="group/act inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold whitespace-nowrap text-fg transition-colors hover:border-primary/50 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="withdrawal" size={17} className="shrink-0 transition-transform duration-300 group-hover/act:-translate-y-0.5 motion-reduce:transition-none" />
          <span className="truncate">{translate('home.withdrawFunds')}</span>
        </Link>
      </div>
    </section>
  );
}
