'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';

/*
 * Dashboard copy that has no key in the shared (frozen) core i18n. Kept in one place so it can move into
 * the message catalogue later without hunting through components.
 */
export const ffText = {
  totalBalance: 'Total Balance',
  walletHold: 'Wallet',
  refresh: 'Refresh balances',
  goalsTitle: 'Stay on Track with Your Goals',
  goalsText: 'Visualize your progress toward savings, investments, or debt repayment goals.',
  addFunds: 'Add funds',
  cashFlow: 'Cash Flow',
  income: 'Income',
  earned: 'Earned',
  goal: 'Goal',
  equity: 'Equity',
  overview: 'Monthly Financial Overview',
  expenses: 'Withdrawals',
  savings: 'Net Flow',
  topSpend: 'Top Spend Day',
  walletCard: 'Wallet Balance',
  floating: 'Floating P/L',
  sendTo: 'Send to',
  recipients: 'Your trading accounts',
  add: 'Add',
  wallet: 'Wallet',
  more: 'More options',
  layout: 'Accounts overview',
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  transfer: 'Transfer',
  freeMargin: 'Free Margin',
  tradingAccounts: 'Trading Accounts',
  greeting: 'Hi',
  welcome: 'Welcome back to your account',
  viewDetails: 'View account details',
  hideBalance: 'Hide balances',
  showBalance: 'Show balances',
  walletBalance: 'Wallet balance',
  shareOfTotal: 'of total',
  swap: 'Transfer between wallet and accounts',
  tradingPower: 'Trading Power',
  liveAccounts: 'live accounts',
  available: 'of equity available',
  usedMargin: 'Used Margin',
  tradeNow: 'Trade now',
  openAccount: 'Open account',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  moneyIn: 'In',
  moneyOut: 'Out',
  noSpend: 'No withdrawals this month',
  from: 'From',
  to: 'To',
  accountsTitle: 'Accounts',
  allAccounts: 'All accounts',
  viewing: 'Viewing',
  of: 'of',
  ofEquity: 'of equity',
  floatingShort: 'floating',
  dailyBalance: 'Daily total balance',
  swapDirection: 'Swap direction',
  nextAccount: 'Next account',
  leverage: 'Leverage',
  platform: 'Platform',
  accountActions: 'Account action',
  balanceMovement: 'Balance Movement',
  dailyBalanceLine: 'Daily balance',
  weekAverage: '7-day average',
  moneyFlow: 'Money Flow',
  deposits: 'Deposits',
  months: 'Months',
  years: 'Years',
  vsLastPeriod: 'vs last period',
  totalAssets: 'Total Assets',
  otherAccounts: 'Other accounts',
  netCashflow: 'Net Cashflow',
  dailyChanges: 'Daily balance changes, last 42 days',
  less: 'Less',
  moreActivity: 'More',
  addAccountTitle: 'Open another',
  addAccountText: 'trading account and fund it from your wallet.',
  days: 'days',
  selectDay: 'Show day',
  myWallet: 'My Wallet',
  view: 'View',
} as const;

export function currencySymbol(currency: string): string {
  return formatMoney(0, currency).replace(/[\d.,\s]/g, '') || currency;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Eases from the last shown value to `target`; jumps straight there when reduced motion is on. */
export function useCountUp(target: number | undefined, duration = 1400): number {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (target === undefined) return;
    const end = target;
    const from = shownRef.current;
    const instant = prefersReducedMotion();
    const startedAt = performance.now();
    let frame = 0;

    function step(now: number) {
      const progress = instant ? 1 : Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (end - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}

interface MoneyProps {
  value?: number;
  currency: string;
  className?: string;
  /** The cents part is dimmed, like the reference's "$8,890.00". */
  centsClassName?: string;
  signed?: boolean;
}

export function CountUpMoney({ value, currency, className, centsClassName = 'text-fg-subtle', signed = false }: MoneyProps) {
  const shown = useCountUp(value);
  if (value === undefined) {
    return <span aria-hidden="true" className={cx('inline-block h-[0.8em] w-[5ch] animate-pulse rounded-md bg-surface-2 align-middle', className)} />;
  }
  const text = formatMoney(Math.abs(shown), currency);
  const dot = text.lastIndexOf('.');
  const main = dot === -1 ? text : text.slice(0, dot);
  const cents = dot === -1 ? '' : text.slice(dot);
  const sign = signed ? (value >= 0 ? '+' : '−') : value < 0 ? '−' : '';
  return (
    <span className={cx('tabular-nums', className)} aria-label={`${sign}${formatMoney(Math.abs(value), currency)}`}>
      <span aria-hidden="true">
        {sign}
        {main}
        <span className={centsClassName}>{cents}</span>
      </span>
    </span>
  );
}

export function KebabLink({ href, label = ffText.more, className }: { href: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cx(
        'grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted ring-1 ring-line transition-[color,background-color,transform] hover:-translate-y-0.5 hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        className,
      )}
    >
      <span aria-hidden="true" className="flex flex-col items-center gap-[3px]">
        <span className="size-[3.5px] rounded-full bg-current" />
        <span className="size-[3.5px] rounded-full bg-current" />
        <span className="size-[3.5px] rounded-full bg-current" />
      </span>
    </Link>
  );
}

/** Decorative orbit ellipses that sweep across the cards in the reference. */
export function CardOrbits({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 120" preserveAspectRatio="none" className={cx('pointer-events-none absolute inset-0 size-full', className)}>
      <ellipse cx="150" cy="70" rx="120" ry="44" transform="rotate(-14 150 70)" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="190" cy="40" rx="110" ry="36" transform="rotate(18 190 40)" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

interface SparklineProps {
  values: number[];
  className?: string;
  /** Text pinned above the end dot, e.g. "+$324". */
  endLabel?: string;
}

export function Sparkline({ values, className, endLabel }: SparklineProps) {
  const gradientId = useId();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 100,
    y: 6 + (1 - (value - min) / span) * 30,
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <div className={cx('relative', className)}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={line}
          pathLength={1}
          strokeDasharray={1}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="animate-draw motion-reduce:animate-none"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_2px_var(--brand-primary)]"
        style={{ left: `${last.x}%`, top: `${(last.y / 40) * 100}%` }}
      />
      {endLabel && (
        <span className="absolute right-3 -top-1 text-[11px] font-semibold text-primary tabular-nums" style={{ top: `${(last.y / 40) * 100 - 22}%` }}>
          {endLabel}
        </span>
      )}
    </div>
  );
}
