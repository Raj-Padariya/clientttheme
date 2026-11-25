'use client';

import Link from 'next/link';
import { useSyncExternalStore, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { RequestStatus, User, Wallet } from '@/core/types';
import { cx } from '../lib/cx';
import { StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { HeroWalletCard, useCountUp } from './HeroWalletCard';

const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

const CHIP_STAGGER_MS = 90;
const RING_RADIUS = 16;

const verificationProgress: Record<RequestStatus, number> = {
  rejected: 10,
  pending: 34,
  processing: 67,
  approved: 100,
};

const verificationStroke: Record<RequestStatus, string> = {
  rejected: 'stroke-danger',
  pending: 'stroke-hero-buy',
  processing: 'stroke-hero-buy',
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

// Slow gold aurora behind the hero: two drifting blurred glows, a fine grain and a gold hairline on top.
function HeroAurora() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      <span className="absolute -top-40 left-[38%] size-[420px] animate-drift rounded-full bg-hero-buy/14 blur-3xl light:bg-(--brand-gleam)/55 motion-reduce:animate-none" />
      <span className="absolute -bottom-48 -left-24 size-[360px] animate-drift rounded-full bg-hero-buy/8 blur-3xl [animation-delay:-6s] [animation-direction:reverse] light:bg-(--brand-gleam)/35 motion-reduce:animate-none" />
      <span className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.014)_0_1px,transparent_1px_4px)] light:bg-[repeating-linear-gradient(115deg,rgb(92_69_25/0.035)_0_1px,transparent_1px_4px)]" />
      <span className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-hero-buy/60 to-transparent" />
    </span>
  );
}

// Splits "$1,090.00" so the decimals can be drawn dimmer, as in the reference.
function MoneyValue({ amount, currency }: { amount: number; currency: string }) {
  const formatted = formatMoney(amount, currency);
  const decimalIndex = formatted.lastIndexOf('.');
  if (decimalIndex === -1) return <>{formatted}</>;
  return (
    <>
      {formatted.slice(0, decimalIndex)}
      <span className="text-hero-dim">{formatted.slice(decimalIndex)}</span>
    </>
  );
}

function CountingMoney({ amount, currency }: { amount: number; currency: string }) {
  const displayed = useCountUp(amount);
  return <MoneyValue amount={displayed} currency={currency} />;
}

function VerificationRing({ status }: { status: RequestStatus }) {
  const progress = verificationProgress[status];
  return (
    <span className="relative grid size-11 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r={RING_RADIUS} fill="none" strokeWidth="3.5" className="stroke-hero-line-hi" />
        <circle
          cx="20"
          cy="20"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${progress} 100`}
          className={cx('drop-shadow-[0_0_4px_var(--wallet-gold)]', verificationStroke[status])}
        />
      </svg>
      <span className="relative text-[10px] font-semibold text-hero-txt tabular-nums">{progress}%</span>
    </span>
  );
}

function StatChip({ icon, label, index, children }: { icon: IconName; label: string; index: number; children: ReactNode }) {
  return (
    <li
      style={{ animationDelay: `${240 + index * CHIP_STAGGER_MS}ms` }}
      className="group relative flex min-w-0 animate-rise items-center gap-3 overflow-hidden rounded-2xl border border-hero-line bg-hero-tile/80 p-3 backdrop-blur-md transition-[translate,border-color] duration-300 hover:-translate-y-0.5 hover:border-hero-buy/40 motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px scale-x-0 bg-linear-to-r from-transparent via-hero-buy to-transparent transition-transform duration-500 group-hover:scale-x-100" />
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hero-buy/12 text-hero-buy ring-1 ring-hero-buy/25">
        <Icon name={icon} size={17} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <small className="truncate text-[11px] tracking-[0.08em] text-hero-mute uppercase">{label}</small>
        {children}
      </span>
    </li>
  );
}

interface GreetingBarProps {
  user: User;
  wallet: Wallet;
  /** Wallet plus live trading-account balances; undefined while loading. */
  totalBalance?: number;
  liveAccountCount?: number;
  currency: string;
}

export function GreetingBar({ user, wallet, totalBalance, liveAccountCount, currency }: GreetingBarProps) {
  const moment = useSyncExternalStore<Moment | null>(subscribeNever, readMoment, readServerMoment);
  const title = moment ? translate(moment.greetingKey, { name: user.firstName }) : translate('home.welcome', { name: user.firstName });
  const statValueClass = 'truncate text-lg leading-[1.1] font-medium tracking-[-0.02em] text-hero-txt tabular-nums';

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate grid animate-rise gap-7 overflow-hidden rounded-[28px] border border-hero-line p-5 shadow-[inset_0_1px_0_var(--hero-ring),0_40px_80px_-50px_var(--wallet-gold)] [background:var(--hero-bg)] motion-reduce:animate-none sm:p-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] light:shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_2px_rgb(92_69_25/0.06),0_28px_60px_-34px_rgb(92_69_25/0.4)]"
    >
      <HeroAurora />

      <div className="relative z-[1] flex min-w-0 flex-col self-center">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-hero-line-hi bg-hero-tile/80 px-3 py-1 text-xs font-medium text-hero-mute backdrop-blur-md">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-hero-up/60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-hero-up" />
          </span>
          <span className="min-h-4">{moment ? `${moment.date} · ${translate('home.marketsOpen')}` : translate('home.marketsOpen')}</span>
        </p>

        <h1
          id="hero-title"
          className="bg-linear-to-r from-hero-txt via-hero-txt to-hero-buy bg-clip-text text-[clamp(26px,2.8vw,38px)] leading-[1.06] font-semibold tracking-[-0.015em] text-balance text-transparent uppercase [overflow-wrap:anywhere]"
        >
          {title}
        </h1>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-hero-mute">{translate('home.heroText')}</p>

        {/* Phones: two equal halves side by side across the full width, so the pill never wraps into a second row. */}
        <div className="mt-6 grid w-full grid-cols-2 gap-1.5 rounded-full border border-hero-line-hi bg-hero-tile/70 p-1.5 backdrop-blur-md sm:flex sm:w-fit">
          <Link
            href="/deposit"
            className="group/dock relative inline-flex h-11 min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-hero-btn px-3 text-sm font-semibold whitespace-nowrap text-on-hero-btn shadow-[0_10px_26px_-12px_var(--wallet-gold)] transition-colors hover:bg-hero-btn-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-[22px]"
          >
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <Icon name="plus" size={17} className="relative shrink-0 transition-transform duration-300 group-hover/dock:rotate-90" />
            <span className="relative truncate">{translate('home.depositFunds')}</span>
          </Link>
          <Link
            href="/withdrawal"
            className="group/dock inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-hero-txt transition-colors hover:bg-hero-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-[22px]"
          >
            <Icon name="withdrawal" size={17} className="shrink-0 transition-transform duration-300 group-hover/dock:-translate-y-0.5" />
            <span className="truncate">{translate('home.withdrawFunds')}</span>
          </Link>
        </div>

        <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
          <StatChip icon="wallet" label={translate('home.totalBalance')} index={0}>
            {totalBalance === undefined ? (
              <span className="h-5 w-24 animate-pulse rounded bg-hero-line-hi" />
            ) : (
              <b className={statValueClass}>
                <CountingMoney amount={totalBalance} currency={currency} />
              </b>
            )}
          </StatChip>
          <StatChip icon="accounts" label={translate('home.liveAccounts')} index={1}>
            <b className={statValueClass}>
              {liveAccountCount ?? '—'}
              <em className="ml-[5px] text-xs font-normal not-italic text-hero-dim">{translate('home.accountsActive')}</em>
            </b>
          </StatChip>
          <li
            style={{ animationDelay: `${240 + 2 * CHIP_STAGGER_MS}ms` }}
            className="flex min-w-0 animate-rise items-center gap-3 rounded-2xl border border-hero-line bg-hero-tile/80 p-3 backdrop-blur-md motion-reduce:animate-none"
          >
            <VerificationRing status={user.kycStatus} />
            <span className="flex min-w-0 flex-col gap-1">
              <small className="truncate text-[11px] tracking-[0.08em] text-hero-mute uppercase">{translate('home.verification')}</small>
              <Link href="/kyc" className="w-fit rounded-full focus-visible:outline-2 focus-visible:outline-ring">
                <StatusBadge status={user.kycStatus} />
              </Link>
            </span>
          </li>
        </ul>
      </div>

      <HeroWalletCard wallet={wallet} holderName={`${user.firstName} ${user.lastName}`} className="z-[1] self-center xl:justify-self-end" />
    </section>
  );
}
