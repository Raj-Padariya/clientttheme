'use client';

import Link from 'next/link';
import { useId } from 'react';
import { formatMoney } from '@/core/format';
import type { FundsFlowPeriod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { CountUpMoney, KebabLink, Sparkline, ffText } from './finflowParts';
import { smoothPath, useMeasuredWidth } from './chartGeometry';
import { FrostCard, frostButton } from './FrostCard';

const MASK = '••••••';
const TREND_DAYS = 30;
const TREND_HEIGHT = 110;
const TREND_PAD = 12;

/**
 * Last 30 days of total balance drawn in ink on the frost: the line draws itself in, a white glint keeps running
 * along it, and the latest day pulses at the end. Drawn in real pixels (measured width) because the draw and glint
 * animations rely on `pathLength`, which a stretched viewBox with non-scaling strokes breaks.
 */
function FrostTrend({ values }: { values: number[] }) {
  const id = useId().replace(/:/g, '');
  const [frameRef, width] = useMeasuredWidth<HTMLDivElement>(300);
  const recent = values.slice(-TREND_DAYS);
  const count = recent.length;
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const span = max - min || 1;
  const points = recent.map((value, index) => ({
    x: (index / (count - 1)) * width,
    y: TREND_PAD + (1 - (value - min) / span) * (TREND_HEIGHT - TREND_PAD * 2),
  }));
  const line = smoothPath(points);
  const area = `${line} L${width},${TREND_HEIGHT} L0,${TREND_HEIGHT} Z`;
  const end = points[count - 1];
  const first = recent[0];
  const changePct = first ? ((recent[count - 1] - first) / first) * 100 : undefined;
  const isUp = (changePct ?? 0) >= 0;

  return (
    <div className="relative mt-4 flex min-h-[140px] flex-1 flex-col justify-end gap-2">
      <p className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#4b5a70]">
        <span>{ffText.dailyBalance}</span>
        {changePct !== undefined && (
          <span className={cx('rounded-full bg-white/70 px-2 py-0.5 font-semibold tabular-nums', isUp ? 'text-[#146c43]' : 'text-[#b42318]')}>
            {isUp ? '+' : '−'}
            {Math.abs(changePct).toFixed(1)}%
          </span>
        )}
      </p>
      <div
        ref={frameRef}
        role="img"
        aria-label={`${ffText.dailyBalance} ${isUp ? '+' : '−'}${Math.abs(changePct ?? 0).toFixed(1)}%`}
        className="relative"
        style={{ height: TREND_HEIGHT }}
      >
        {/* Keyed on width so a resize redraws the line instead of leaving a half-drawn dash. */}
        <svg key={width} aria-hidden="true" width={width} height={TREND_HEIGHT} viewBox={`0 0 ${width} ${TREND_HEIGHT}`} className="absolute inset-0 overflow-visible">
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0a1220" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0a1220" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id}-fill)`} className="nova-fade" />
          <path d={line} fill="none" stroke="#0a1220" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" pathLength={1} className="nova-draw" />
          <path d={line} fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" pathLength={1} className="nova-frost-trace" />
        </svg>
        <span
          aria-hidden="true"
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0a1220] ring-4 ring-white/80"
          style={{ left: end.x, top: end.y }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#0a1220]/50 motion-reduce:hidden" />
        </span>
      </div>
    </div>
  );
}

interface BalanceHeroProps {
  total?: number;
  walletBalance?: number;
  currency: string;
  accounts?: TradingAccount[];
  holderName: string;
  monthlyFlows?: FundsFlowPeriod[];
  balanceHistory?: number[];
  isRefreshing: boolean;
  onRefresh: () => void;
  hidden: boolean;
  onToggleHidden: () => void;
  className?: string;
}

/** Frosted total-balance card: greeting, count-up total, wallet share, this month's deposits and the money actions. */
export function BalanceHero({
  total,
  walletBalance,
  currency,
  accounts,
  holderName,
  monthlyFlows,
  balanceHistory,
  isRefreshing,
  onRefresh,
  hidden,
  onToggleHidden,
  className,
}: BalanceHeroProps) {
  const firstName = holderName.split(/\s+/)[0] ?? holderName;
  const current = monthlyFlows?.[monthlyFlows.length - 1];
  const walletShare = total && walletBalance !== undefined ? ((walletBalance / total) * 100).toFixed(2) : undefined;

  return (
    <section aria-label={ffText.totalBalance} className={cx('min-w-0', className)}>
      <FrostCard className="h-full [&>div]:flex [&>div]:h-full [&>div]:flex-col">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-lg font-bold text-[#0a1220]">
              {ffText.greeting} {firstName}
              <span aria-hidden="true" className="inline-block origin-[70%_70%] animate-[wave_2.4s_ease-in-out_1s_3] motion-reduce:animate-none">
                👋
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[#4b5a70]">{ffText.welcome}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? ffText.showBalance : ffText.hideBalance}
              title={hidden ? ffText.showBalance : ffText.hideBalance}
              className={frostButton}
            >
              <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} />
            </button>
            <button type="button" onClick={onRefresh} aria-label={ffText.refresh} title={ffText.refresh} className={frostButton}>
              <Icon name="refresh" size={16} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
            </button>
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[#4b5a70]">{ffText.totalBalance}</p>
          {walletShare !== undefined && (
            <span className="rounded-full bg-[#0a1220] px-3 py-1 text-xs font-semibold text-[#cfe0f7] tabular-nums shadow-[0_8px_18px_-10px_rgb(10_18_32/0.8)]">
              {hidden ? '••' : walletShare}% {ffText.wallet}
            </span>
          )}
        </div>
        <p className="relative mt-1.5 text-[40px] leading-none font-extrabold tracking-[-0.03em] text-[#0a1220]">
          {hidden ? (
            <span className="tracking-[0.12em]" aria-label={ffText.hideBalance}>
              {MASK}
            </span>
          ) : (
            <CountUpMoney value={total} currency={currency} />
          )}
        </p>
        {current && (
          <p className="relative mt-2 text-xs font-medium text-[#4b5a70] tabular-nums">
            <span className="font-semibold text-[#146c43]">+{hidden ? MASK : formatMoney(current.deposits, currency)}</span> {ffText.moneyIn} · {ffText.thisMonth}
          </p>
        )}

        {/* The trend takes the spare height when the card stretches to the charts, so the actions sit on the bottom edge. */}
        {balanceHistory && balanceHistory.length > 1 ? <FrostTrend values={balanceHistory} /> : <div aria-hidden="true" className="min-h-5 flex-1" />}

        <div aria-hidden="true" className="h-4 shrink-0" />

        <div className="relative flex items-end justify-between gap-3 border-t border-dashed border-[#0a1220]/15 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.14em] text-[#4b5a70] uppercase">{ffText.tradingAccounts}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[#0a1220] tabular-nums">{accounts ? `${accounts.length} ${ffText.liveAccounts}` : '—'}</p>
          </div>
          <Link
            href="/accounts"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] transition-[background-color,gap] hover:gap-2.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220]"
          >
            {ffText.viewDetails}
            <Icon name="chevronRight" size={14} />
          </Link>
        </div>

        <div className="relative mt-5 flex items-center gap-2.5">
          <Link
            href="/deposit"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#0a1220] shadow-[0_10px_24px_-12px_rgb(10_18_32/0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
          >
            {ffText.deposit}
          </Link>
          <Link
            href="/transfer"
            aria-label={ffText.swap}
            title={ffText.swap}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-white/85 text-[#0a1220] ring-1 ring-white transition-transform duration-500 hover:rotate-180 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
          >
            <Icon name="transfer" size={18} />
          </Link>
          <Link
            href="/withdrawal"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#0a1220] text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(10_18_32/0.9)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
          >
            {ffText.withdraw}
          </Link>
        </div>
      </FrostCard>
    </section>
  );
}

interface GoalsCardProps {
  monthlyFlows?: FundsFlowPeriod[];
  depositTrend?: number[];
  currency: string;
  className?: string;
}

/** Goals blurb with the deposit sparkline, then this month's deposits measured against last month's. */
export function GoalsCard({ monthlyFlows, depositTrend, currency, className }: GoalsCardProps) {
  const current = monthlyFlows?.[monthlyFlows.length - 1];
  const previous = monthlyFlows?.[monthlyFlows.length - 2];
  const earned = current?.deposits ?? 0;
  const goal = Math.max(previous?.deposits ?? 0, earned, 1);
  const earnedShare = current ? Math.min(earned / goal, 1) : 0;

  const trendDelta = depositTrend && depositTrend.length > 1 ? depositTrend[depositTrend.length - 1] - depositTrend[0] : undefined;
  const trendLabel =
    trendDelta === undefined ? undefined : `${trendDelta >= 0 ? '+' : '−'}${formatMoney(Math.abs(trendDelta), currency).replace(/\.00$/, '')}`;

  return (
    <div className={cx('orbit-card nova-edge-light relative flex min-w-0 animate-rise flex-col gap-6 p-5 [animation-delay:520ms] motion-reduce:animate-none', className)}>
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
          <span className="block h-full origin-left animate-grow rounded-full bg-linear-to-r from-success/70 to-success motion-reduce:animate-none" style={{ width: `${earnedShare * 100}%` }} />
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
  );
}
