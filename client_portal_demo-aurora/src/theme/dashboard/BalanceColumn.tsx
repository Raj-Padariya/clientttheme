'use client';

import Link from 'next/link';
import { useState, type PointerEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { FundsFlowPeriod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { CountUpMoney, KebabLink, Sparkline, ffText } from './finflowParts';


const MASK = '••••••';
const TREND_DAYS = 30;

const vaultIconButton =
  'grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-(--hero-txt) ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--hero-buy)';

const vaultGhostAction =
  'inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-sm font-semibold text-(--hero-txt) ring-1 ring-white/10 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--hero-buy) motion-reduce:transition-none';

function getChangePct(values: number[]): number | undefined {
  const first = values[0];
  if (values.length < 2 || !first) return undefined;
  return ((values[values.length - 1] - first) / first) * 100;
}

interface EmberBarsProps {
  values: number[];
  currency: string;
  hidden: boolean;
}

/**
 * Last 30 days of total balance as graphite capsules. The latest day (or the one under the pointer) lights up in
 * ember with a white bead, a spark above it and its value in a tag. Capsules rise in one after another on load.
 */
function EmberBars({ values, currency, hidden }: EmberBarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const count = values.length;
  const active = hovered ?? count - 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const heights = values.map((value) => 18 + ((value - min) / span) * 70);
  const tagLeft = Math.min(90, Math.max(10, ((active + 0.5) / count) * 100));

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * count);
    setHovered(Math.min(count - 1, Math.max(0, index)));
  };

  return (
    <div
      role="img"
      aria-label={`${ffText.dailyBalance}: ${hidden ? MASK : formatMoney(values[count - 1], currency)}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHovered(null)}
      className="relative h-[180px] touch-pan-y sm:h-[220px]"
    >
      <span aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
        {[0, 1, 2, 3].map((line) => (
          <span key={line} className="border-t border-dashed border-white/[0.06]" />
        ))}
      </span>

      <div aria-hidden="true" className="relative flex h-full items-end gap-[3px] sm:gap-[5px]">
        {heights.map((height, index) => {
          const isActive = index === active;
          return (
            <span
              key={index}
              className="zenith-bar relative flex-1 rounded-t-[10px] rounded-b-[3px] bg-linear-to-b from-white/[0.14] to-white/[0.02] ring-1 ring-white/[0.05] ring-inset"
              style={{ height: `${height}%`, animationDelay: `${index * 28}ms` }}
            >
              <span
                className="zenith-wave absolute inset-x-0 top-0 h-3/4 rounded-[inherit] bg-linear-to-b from-white/35 to-transparent"
                style={{ animationDelay: `${index * 70}ms` }}
              />
              <span
                className={cx(
                  'absolute inset-0 rounded-[inherit] bg-linear-to-b from-[#ffe2cf] via-(--hero-buy) to-transparent transition-opacity duration-300',
                  isActive ? 'zenith-ember opacity-100' : 'opacity-0',
                )}
              >
                {isActive && (
                  <>
                    <span className="absolute top-1.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_3px_rgb(255_255_255/0.7)]">
                      <span className="absolute inset-0 animate-ping rounded-full bg-white motion-reduce:hidden" />
                    </span>
                    <span className="zenith-spark absolute bottom-full left-1/2 mb-1 h-8 w-0.5 -translate-x-1/2 rounded-full bg-linear-to-t from-white to-transparent">
                      <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgb(255_255_255/0.8)]" />
                    </span>
                  </>
                )}
              </span>
            </span>
          );
        })}
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-[#1d1d20] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-(--hero-txt) tabular-nums ring-1 ring-white/10 shadow-[0_10px_20px_-10px_rgb(0_0_0/0.9)] transition-[left,bottom] duration-300 motion-reduce:transition-none"
        style={{ left: `${tagLeft}%`, bottom: `calc(${heights[active]}% + 26px)` }}
      >
        {hidden ? MASK : formatMoney(values[active], currency)}
      </span>
    </div>
  );
}

function EmberBarsSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-[180px] items-end gap-[3px] sm:h-[220px] sm:gap-[5px]">
      {Array.from({ length: TREND_DAYS }, (_, index) => (
        <span key={index} className="flex-1 animate-pulse rounded-t-[10px] rounded-b-[3px] bg-white/[0.05]" style={{ height: `${30 + ((index * 37) % 50)}%` }} />
      ))}
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

/**
 * Zenith "vault" wallet: an open graphite stage. Left: greeting, total balance with its 30-day change, the
 * wallet / accounts split, this month's deposits and the money actions. Right: 30 days of balance as ember capsules.
 */
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
  const accountsBalance = total !== undefined && walletBalance !== undefined ? total - walletBalance : undefined;
  const recent = balanceHistory?.slice(-TREND_DAYS) ?? [];
  const changePct = getChangePct(recent);
  const isUp = (changePct ?? 0) >= 0;
  const showMoney = (value: number | undefined) => (value === undefined ? '—' : hidden ? MASK : formatMoney(value, currency));

  return (
    <section
      aria-label={ffText.totalBalance}
      className={cx(
        'wallet-card nova-edge-light relative isolate min-w-0 overflow-hidden rounded-[28px] text-(--hero-txt) ring-1 ring-(--hero-line) [background:var(--hero-bg)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1.3px)] [background-size:5px_5px] [mask-image:radial-gradient(75%_85%_at_100%_0,#000,transparent)]"
      />
      <span
        aria-hidden="true"
        className="zenith-spot pointer-events-none absolute -top-48 left-[8%] -z-10 h-96 w-[55%] rounded-full bg-white/[0.13] blur-[90px]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="zenith-sweep absolute inset-y-0 left-0 w-[18%] bg-[linear-gradient(105deg,transparent_20%,rgb(255_255_255/0.12)_50%,transparent_80%)]" />
      </span>

      <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-lg font-bold">
                {ffText.greeting} {firstName}
                <span aria-hidden="true" className="inline-block origin-[70%_70%] animate-[wave_2.4s_ease-in-out_1s_3] motion-reduce:animate-none">
                  👋
                </span>
              </p>
              <p className="mt-0.5 text-xs text-(--hero-mute)">{ffText.welcome}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onToggleHidden}
                aria-pressed={hidden}
                aria-label={hidden ? ffText.showBalance : ffText.hideBalance}
                title={hidden ? ffText.showBalance : ffText.hideBalance}
                className={vaultIconButton}
              >
                <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} />
              </button>
              <button type="button" onClick={onRefresh} aria-label={ffText.refresh} title={ffText.refresh} className={vaultIconButton}>
                <Icon name="refresh" size={16} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
              </button>
            </div>
          </div>

          <p className="mt-7 text-sm font-medium text-(--hero-mute)">{ffText.totalBalance}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-[40px] leading-none font-extrabold tracking-[-0.03em] tabular-nums sm:text-[52px]">
              {hidden ? (
                <span className="tracking-[0.12em]" aria-label={ffText.hideBalance}>
                  {MASK}
                </span>
              ) : (
                <CountUpMoney value={total} currency={currency} />
              )}
            </p>
            {changePct !== undefined && (
              <span
                className={cx(
                  'inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-xs font-semibold tabular-nums ring-1 ring-white/10',
                  isUp ? 'text-(--hero-up)' : 'text-(--hero-down)',
                )}
              >
                <Icon name={isUp ? 'trendUp' : 'trendDown'} size={13} />
                {isUp ? '+' : '−'}
                {Math.abs(changePct).toFixed(1)}%
              </span>
            )}
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-(--hero-mute) tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="wallet" size={14} />
              {ffText.wallet}: <span className="font-semibold text-(--hero-txt)">{showMoney(walletBalance)}</span>
              {walletShare !== undefined && <span className="text-(--hero-silk)">({hidden ? '••' : walletShare}%)</span>}
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-white/15" />
            <span className="inline-flex items-center gap-1.5">
              <Icon name="accounts" size={14} />
              {ffText.tradingAccounts}: <span className="font-semibold text-(--hero-txt)">{showMoney(accountsBalance)}</span>
            </span>
          </p>
          {current && (
            <p className="mt-2 text-xs text-(--hero-mute) tabular-nums">
              <span className="font-semibold text-(--hero-up)">+{hidden ? MASK : formatMoney(current.deposits, currency)}</span> {ffText.moneyIn} · {ffText.thisMonth}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href="/deposit"
                className="relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-(--aurora-cta-from) to-(--aurora-cta-to) px-5 text-sm font-bold text-(--aurora-cta-fg) shadow-[0_10px_22px_-12px_var(--aurora-cta-to)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="zenith-shine absolute inset-y-0 left-0 -z-10 w-10 bg-white/45 blur-[2px]" />
              <Icon name="plus" size={16} />
              {ffText.deposit}
            </Link>
            <Link href="/withdrawal" className={vaultGhostAction}>
              <Icon name="arrowUpRight" size={16} />
              {ffText.withdraw}
            </Link>
            <Link href="/transfer" title={ffText.swap} className={cx(vaultGhostAction, 'group')}>
              <Icon name="transfer" size={16} className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none" />
              {translate('nav.transfer')}
            </Link>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-dashed border-white/10 pt-4 max-lg:mt-6 lg:pt-5">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.14em] text-(--hero-mute) uppercase">{ffText.tradingAccounts}</p>
              <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{accounts ? `${accounts.length} ${ffText.liveAccounts}` : '—'}</p>
            </div>
            <Link
              href="/accounts"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-(--hero-silk) transition-[gap,color] hover:gap-2.5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--hero-buy)"
            >
              {ffText.viewDetails}
              <Icon name="chevronRight" size={14} />
            </Link>
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-[22px] bg-black/30 p-4 ring-1 ring-white/[0.06] sm:p-5">
          <p className="flex items-center justify-between gap-2 text-xs font-medium text-(--hero-mute)">
            <span className="inline-flex items-center gap-2">
              <Icon name="barChart" size={14} />
              {ffText.dailyBalance}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 tracking-[0.12em] uppercase ring-1 ring-white/10">{TREND_DAYS}D</span>
          </p>
          <div className="mt-auto pt-10">
            {recent.length > 1 ? <EmberBars values={recent} currency={currency} hidden={hidden} /> : <EmberBarsSkeleton />}
          </div>
        </div>
      </div>
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
