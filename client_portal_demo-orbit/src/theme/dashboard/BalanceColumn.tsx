'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { formatMoney } from '@/core/format';
import type { FundsFlowPeriod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { CountUpMoney, KebabLink, Sparkline, ffText } from './finflowParts';

const MASK = '••••••';

/** Flowing ribbons that sweep behind the hero, each drifting on its own clock. */
function Ribbons() {
  const id = useId();
  return (
    <svg aria-hidden="true" viewBox="0 0 320 300" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-0 -z-10 size-full">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-gleam)" stopOpacity="0" />
          <stop offset="45%" stopColor="var(--brand-primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand-deep)" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="animate-drift motion-reduce:animate-none" style={{ animationDuration: '18s' }}>
        <path d="M230 -20 C160 70 300 130 236 210 C196 262 252 300 262 330" fill="none" stroke={`url(#${id}-a)`} strokeWidth="26" strokeLinecap="round" />
      </g>
      <g className="animate-drift motion-reduce:animate-none" style={{ animationDuration: '26s', animationDirection: 'alternate-reverse' }}>
        <path d="M282 -20 C330 80 186 132 250 214 C282 256 238 300 222 330" fill="none" stroke={`url(#${id}-b)`} strokeWidth="16" strokeLinecap="round" />
      </g>
      <g className="animate-drift motion-reduce:animate-none" style={{ animationDuration: '32s' }}>
        <path d="M188 -20 C248 54 150 146 204 230" fill="none" stroke={`url(#${id}-c)`} strokeWidth="12" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Sparkle({ className, delay }: { className: string; delay: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cx('absolute animate-twinkle text-white motion-reduce:animate-none', className)} style={{ animationDelay: delay }}>
      <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="currentColor" />
    </svg>
  );
}

/** Illustrated money bag with a coin stack, bobbing gently; drawn in brand tokens so it follows the palette. */
function MoneyBag() {
  const id = useId();
  return (
    // Anchored from the top, beside the balance, so it always clears the Deposit / Withdraw row below.
    <div aria-hidden="true" className="pointer-events-none absolute top-16 right-1 h-32 w-28 sm:w-32">
      <Sparkle className="top-0 right-3 size-4" delay="0s" />
      <Sparkle className="top-7 right-0 size-2.5" delay="0.9s" />
      <Sparkle className="top-2 left-2 size-2" delay="1.6s" />
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full animate-float drop-shadow-[0_18px_24px_rgb(0_0_0/0.45)] motion-reduce:animate-none">
        <defs>
          <radialGradient id={`${id}-bag`} cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="var(--brand-gleam)" />
            <stop offset="55%" stopColor="var(--brand-primary)" />
            <stop offset="100%" stopColor="var(--brand-deep)" />
          </radialGradient>
          <linearGradient id={`${id}-coin`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffe9b0" />
            <stop offset="100%" stopColor="var(--brand-accent)" />
          </linearGradient>
        </defs>
        <path d="M58 56 C50 40 56 28 67 35 C71 24 89 24 93 35 C104 28 110 40 102 56 Z" fill={`url(#${id}-bag)`} />
        <path d="M52 64 C30 82 22 114 34 134 C44 150 116 150 126 134 C138 114 130 82 108 64 Z" fill={`url(#${id}-bag)`} />
        <rect x="55" y="52" width="50" height="11" rx="5.5" fill="var(--brand-accent)" />
        <ellipse cx="56" cy="98" rx="9" ry="20" fill="#ffffff" opacity="0.18" transform="rotate(18 56 98)" />
        <text x="80" y="124" textAnchor="middle" fontSize="46" fontWeight="800" fill="#ffffff" fontFamily="inherit">
          $
        </text>
      </svg>
      {/* Coin stack sits still while the bag floats, so the two separate visually. */}
      <svg viewBox="0 0 60 44" className="absolute bottom-0 -left-2 w-12">
        {[30, 22, 14].map((y) => (
          <g key={y}>
            <ellipse cx="28" cy={y + 4} rx="20" ry="7" fill="var(--brand-accent)" />
            <ellipse cx="28" cy={y} rx="20" ry="7" fill={`url(#${id}-coin)`} />
          </g>
        ))}
      </svg>
      <svg viewBox="0 0 40 40" className="absolute bottom-1 left-8 w-6 animate-float motion-reduce:animate-none" style={{ animationDelay: '-3s', animationDuration: '5s' }}>
        <circle cx="20" cy="20" r="16" fill={`url(#${id}-coin)`} />
        <circle cx="20" cy="20" r="11" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" />
      </svg>
    </div>
  );
}

interface AccountDonutCardProps {
  account: TradingAccount;
  share: number;
  active: boolean;
  hidden: boolean;
  index: number;
  onSelect: () => void;
}

// One trading account as a compact dark tile: donut = its share of all live balances, chip = leverage.
function AccountDonutCard({ account, share, active, hidden, index, onSelect }: AccountDonutCardProps) {
  const percent = Math.round(share * 100);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`${account.platform} ${account.login} · ${formatMoney(account.balance, account.currency)} · ${percent}% ${ffText.shareOfTotal}`}
      style={{ animationDelay: `${260 + index * 110}ms` }}
      className={cx(
        'group relative flex w-full animate-rise items-center gap-4 overflow-hidden rounded-[22px] border p-3.5 text-left transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none',
        active
          ? 'border-primary/45 bg-surface/90 shadow-[0_18px_40px_-24px_var(--brand-primary)]'
          : 'border-line bg-surface/60 hover:border-line-strong',
      )}
    >
      <span className="relative grid size-14 shrink-0 place-items-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="28" cy="28" r="23" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="28"
            cy="28"
            r="23"
            fill="none"
            stroke={active ? 'var(--brand-primary)' : 'color-mix(in oklab, var(--brand-primary) 55%, transparent)'}
            strokeWidth="6"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${percent} 100`}
            className="transition-[stroke-dasharray,stroke] duration-1000 ease-out starting:[stroke-dasharray:0_100] motion-reduce:transition-none"
          />
        </svg>
        <span className="text-[11px] font-bold text-fg tabular-nums">{percent}%</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-fg-muted">
          {account.platform} · •••• {account.login.slice(-4)}
        </span>
        <span className="mt-0.5 block truncate text-lg font-bold text-fg tabular-nums">{hidden ? MASK : formatMoney(account.balance, account.currency)}</span>
      </span>
      <span
        className={cx(
          'grid h-9 min-w-14 shrink-0 place-items-center rounded-xl px-2 text-xs font-bold tabular-nums transition-colors',
          active ? 'bg-primary text-on-primary' : 'bg-primary-soft text-primary',
        )}
      >
        1:{account.leverage}
      </span>
    </button>
  );
}

function WalletSquiggle({ walletBalance, currency, hidden }: { walletBalance?: number; currency: string; hidden: boolean }) {
  return (
    <Link
      href="/wallet-history"
      className="group relative flex animate-rise items-center gap-3 overflow-hidden rounded-[22px] border border-primary/30 bg-linear-to-r from-primary/35 via-primary/15 to-primary/5 p-3.5 [animation-delay:480ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring light:border-primary/20 light:from-primary/15 light:via-primary/[0.06] light:to-surface light:shadow-card motion-reduce:animate-none"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-fg ring-1 ring-white/20 transition-transform duration-300 group-hover:-rotate-6 light:bg-primary/12 light:text-primary light:ring-primary/25">
        <Icon name="wallet" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-bold text-fg tabular-nums">
          {hidden ? MASK : walletBalance === undefined ? '—' : formatMoney(walletBalance, currency)}
        </span>
        <span className="block text-[11px] text-fg-muted">{ffText.walletBalance}</span>
      </span>
      {/* White reads on the dark violet glass; on the light card the curve switches to the brand violet. */}
      <svg aria-hidden="true" viewBox="0 0 90 44" className="h-11 w-24 shrink-0 overflow-visible">
        <path
          d="M4 38 C18 38 22 8 36 14 C50 20 40 40 56 34 C72 28 66 6 86 6"
          pathLength={1}
          strokeDasharray={1}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="animate-draw stroke-white/85 light:stroke-primary motion-reduce:animate-none"
        />
        <circle cx="86" cy="6" r="3" className="animate-ping-soft fill-white light:fill-primary motion-reduce:animate-none" />
      </svg>
    </Link>
  );
}

interface BalanceColumnProps {
  total?: number;
  walletBalance?: number;
  currency: string;
  accounts?: TradingAccount[];
  holderName: string;
  monthlyFlows?: FundsFlowPeriod[];
  depositTrend?: number[];
  isRefreshing: boolean;
  onRefresh: () => void;
  className?: string;
}

export function BalanceColumn({
  total,
  walletBalance,
  currency,
  accounts,
  holderName,
  monthlyFlows,
  depositTrend,
  isRefreshing,
  onRefresh,
  className,
}: BalanceColumnProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const cards = accounts?.slice(0, 2);
  const accountsTotal = accounts?.reduce((sum, account) => sum + account.balance, 0) ?? 0;
  const firstName = holderName.split(/\s+/)[0] ?? holderName;

  const current = monthlyFlows?.[monthlyFlows.length - 1];
  const previous = monthlyFlows?.[monthlyFlows.length - 2];
  const earned = current?.deposits ?? 0;
  const goal = Math.max(previous?.deposits ?? 0, earned, 1);
  const earnedShare = current ? Math.min(earned / goal, 1) : 0;

  const trendDelta = depositTrend && depositTrend.length > 1 ? depositTrend[depositTrend.length - 1] - depositTrend[0] : undefined;
  const trendLabel =
    trendDelta === undefined ? undefined : `${trendDelta >= 0 ? '+' : '−'}${formatMoney(Math.abs(trendDelta), currency).replace(/\.00$/, '')}`;

  const roundButton =
    'grid size-10 place-items-center rounded-full bg-white/10 text-fg ring-1 ring-white/15 backdrop-blur-md transition-[background-color,color,transform] hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

  return (
    <section aria-label={ffText.totalBalance} className={cx('flex min-w-0 flex-col gap-3', className)}>
      <div className="group/hero relative isolate animate-rise overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-br from-primary/30 via-surface-2 to-surface p-5 shadow-[0_30px_60px_-36px_var(--brand-primary)] motion-reduce:animate-none">
        <Ribbons />
        {/* Frosted veil over the ribbons on the text side, like the reference's glass card. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-2/3 bg-linear-to-r from-surface/70 via-surface/35 to-transparent backdrop-blur-[2px]" />
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />
        <MoneyBag />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xl font-bold text-fg">
              {ffText.greeting} {firstName}
              <span aria-hidden="true" className="inline-block origin-[70%_70%] animate-[wave_2.4s_ease-in-out_1s_3] motion-reduce:animate-none">
                👋
              </span>
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">{ffText.welcome}</p>
          </div>
          <button type="button" onClick={onRefresh} aria-label={ffText.refresh} title={ffText.refresh} className={roundButton}>
            <Icon name="refresh" size={16} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
          </button>
        </div>

        <div className="relative mt-6 max-w-[70%]">
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            {ffText.totalBalance}
            <button
              type="button"
              onClick={() => setHidden((value) => !value)}
              aria-pressed={hidden}
              aria-label={hidden ? ffText.showBalance : ffText.hideBalance}
              title={hidden ? ffText.showBalance : ffText.hideBalance}
              className="grid size-7 place-items-center rounded-full text-fg-muted transition-colors hover:bg-white/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name={hidden ? 'eyeOff' : 'eye'} size={15} />
            </button>
          </p>
          <p className="mt-1 text-[38px] leading-none font-extrabold tracking-[-0.03em] text-fg">
            {hidden ? (
              <span className="tracking-[0.12em]" aria-label={ffText.hideBalance}>
                {MASK}
              </span>
            ) : (
              <CountUpMoney value={total} currency={currency} />
            )}
          </p>
          <Link
            href="/accounts"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-fg ring-1 ring-white/15 backdrop-blur-md transition-[background-color,gap] hover:gap-2.5 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {ffText.viewDetails}
            <Icon name="chevronRight" size={14} />
          </Link>
        </div>

        <div className="relative mt-5 flex items-center gap-2.5">
          <Link
            href="/deposit"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-black/85 shadow-[0_10px_24px_-12px_rgb(255_255_255/0.6)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            {ffText.deposit}
          </Link>
          <Link
            href="/transfer"
            aria-label={ffText.swap}
            title={ffText.swap}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-white/90 text-black/80 transition-transform duration-500 hover:rotate-180 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="transfer" size={18} />
          </Link>
          <Link
            href="/withdrawal"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-black/70 text-sm font-semibold text-white ring-1 ring-white/15 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            {ffText.withdraw}
          </Link>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {cards === undefined
          ? Array.from({ length: 2 }, (_, index) => <li key={index} className="h-[84px] animate-pulse rounded-[22px] bg-surface-2" />)
          : cards.map((account, index) => (
              <li key={account.id}>
                <AccountDonutCard
                  account={account}
                  share={accountsTotal > 0 ? account.balance / accountsTotal : 0}
                  hidden={hidden}
                  index={index}
                  active={index === activeIndex}
                  onSelect={() => setActiveIndex(index)}
                />
              </li>
            ))}
      </ul>

      <WalletSquiggle walletBalance={walletBalance} currency={currency} hidden={hidden} />

      <div className="orbit-card relative mt-2 flex flex-1 animate-rise flex-col gap-6 p-5 [animation-delay:520ms] motion-reduce:animate-none">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="max-w-[16ch] text-lg leading-snug font-bold text-fg">{ffText.goalsTitle}</h3>
            <Link
              href="/deposit"
              aria-label={ffText.addFunds}
              title={ffText.addFunds}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg ring-1 ring-line transition-[transform,color] hover:rotate-90 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <Icon name="plus" size={18} />
            </Link>
          </div>
          <div className="mt-2 flex items-end gap-3">
            <p className="max-w-[24ch] flex-1 text-xs leading-relaxed text-fg-muted">{ffText.goalsText}</p>
            {depositTrend && <Sparkline values={depositTrend} endLabel={trendLabel} className="h-14 w-32 shrink-0" />}
          </div>
        </div>

        <div className="mt-auto border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-fg">{ffText.cashFlow}</h3>
            <KebabLink href="/history" />
          </div>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-fg">{ffText.income}</span>
            <span className="tabular-nums">
              <span className="font-semibold text-success">{formatMoney(earned, currency)}</span>
              <span className="text-fg-muted"> / </span>
              <span className="font-semibold text-fg">{formatMoney(goal, currency)}</span>
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={ffText.income}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(earnedShare * 100)}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
          >
            <span
              className="block h-full origin-left animate-grow rounded-full bg-linear-to-r from-success/70 to-success shadow-[0_0_12px_var(--success)] motion-reduce:animate-none"
              style={{ width: `${earnedShare * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-success" />
              {ffText.earned}
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-fg" />
              {ffText.goal}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
