'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import type { FundsFlowPeriod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUpMoney, ffText } from './finflowParts';
import { boardCard, ChangeChip, MASK, money, smoothPath, WAVE_PATHS } from './ZenithBoard';

/*
 * Zenith desk row: a transfer "bridge" between two pods, a tick gauge of trading power and a self-drawing goal ring.
 * Same data and actions as the old desk cards, new visual forms.
 */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

interface DeskHeaderProps {
  icon: IconName;
  title: string;
  titleId: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

function DeskHeader({ icon, title, titleId, subtitle, action }: DeskHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg ring-1 ring-fg/10">
          <Icon name={icon} size={17} />
        </span>
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-base font-semibold text-fg">
            {title}
          </h3>
          {subtitle && <div className="mt-0.5 truncate text-xs text-fg-muted">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

function CornerLink({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cx(
        'grid size-9 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-fg/10 transition-[color,background-color,transform] hover:-rotate-12 hover:bg-fg/[0.08] hover:text-fg motion-reduce:transition-none',
        focusRing,
      )}
    >
      <Icon name={icon} size={15} />
    </Link>
  );
}

/** Ember capsule button carrying the same drifting wave lines as the wallet capsules. */
export function WaveButton({ href, icon, label, className }: { href: string; icon: IconName; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        'relative isolate flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-(--hero-buy) text-sm font-bold text-[#160904] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_26px_-14px_var(--hero-buy)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none',
        focusRing,
        className,
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift absolute inset-y-0 left-0 -z-10 h-full w-[200%] opacity-60">
        {WAVE_PATHS.map((path) => (
          <path key={path} d={path} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <Icon name={icon} size={16} />
      {label}
    </Link>
  );
}

function DeskSkeleton() {
  return <section aria-busy="true" className={cx(boardCard, 'h-[440px] animate-pulse')} />;
}

/* ───────────── Transfer bridge ───────────── */

interface RoutePodProps {
  role: string;
  icon: IconName;
  name: string;
  amount: string;
  caption: string;
  isSource: boolean;
  onCycle?: () => void;
}

function RoutePod({ role, icon, name, amount, caption, isSource, onCycle }: RoutePodProps) {
  return (
    <div className="relative z-10 flex min-w-0 flex-1 flex-col items-center rounded-[22px] bg-surface px-3 pt-4 pb-3 text-center ring-1 ring-fg/[0.08]">
      <span className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{role}</span>
      <span
        className={cx(
          'mt-3 grid size-12 place-items-center rounded-full ring-4 transition-colors duration-500',
          isSource ? 'bg-(--hero-buy) text-[#160904] ring-(--hero-buy)/15' : 'bg-fg/[0.1] text-fg ring-fg/[0.05]',
        )}
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="mt-3 w-full truncate text-lg font-bold tracking-[-0.02em] text-fg tabular-nums">{amount}</span>
      {onCycle ? (
        <button
          type="button"
          onClick={onCycle}
          title={ffText.nextAccount}
          aria-label={`${ffText.nextAccount} · ${name}`}
          className={cx('mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-fg-muted ring-1 ring-fg/10 transition-colors hover:text-fg hover:ring-fg/30', focusRing)}
        >
          <span className="truncate">{name}</span>
          <Icon name="chevronRight" size={11} className="shrink-0 rotate-90" />
        </button>
      ) : (
        <span className="mt-1 max-w-full truncate px-2 py-0.5 text-[11px] font-semibold text-fg-muted">{name}</span>
      )}
      <span className="mt-1 w-full truncate text-[10px] text-fg-subtle tabular-nums">{caption}</span>
    </div>
  );
}

interface TransferBridgeProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  currency: string;
  hidden: boolean;
}

/** Wallet and a trading account as two pods joined by an ember bridge; the swap button on the bridge flips direction. */
export function TransferBridge({ accounts, walletBalance, currency, hidden }: TransferBridgeProps) {
  const [pick, setPick] = useState(0);
  const [toWallet, setToWallet] = useState(false);

  if (!accounts) return <DeskSkeleton />;

  const account = accounts.length > 0 ? accounts[pick % accounts.length] : undefined;
  const cycle = accounts.length > 1 ? () => setPick((value) => value + 1) : undefined;

  const walletPod = (role: string, isSource: boolean) => (
    <RoutePod role={role} icon="wallet" name={ffText.wallet} amount={money(walletBalance, currency, hidden)} caption={ffText.walletBalance} isSource={isSource} />
  );
  const accountPod = (role: string, isSource: boolean) =>
    account ? (
      <RoutePod
        role={role}
        icon="accounts"
        name={`${account.platform} · ${account.login}`}
        amount={money(account.balance, account.currency, hidden)}
        caption={`${ffText.freeMargin} ${money(account.freeMargin, account.currency, hidden)}`}
        isSource={isSource}
        onCycle={cycle}
      />
    ) : (
      <Link
        href="/accounts/new"
        className={cx('relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-fg/20 bg-surface p-3 text-xs font-semibold text-fg-muted hover:text-fg', focusRing)}
      >
        <Icon name="plus" size={16} />
        {ffText.openAccount}
      </Link>
    );

  const specs = [
    { label: ffText.platform, value: account?.platform ?? '—' },
    { label: ffText.leverage, value: account ? `1:${account.leverage}` : '—' },
    { label: ffText.equity, value: money(account?.equity, account?.currency ?? currency, hidden) },
  ];

  return (
    <section aria-labelledby="zenith-transfer-title" className={cx(boardCard, 'zenith-tile flex flex-col gap-5 p-5 sm:p-6')} style={{ animationDelay: '200ms' }}>
      <DeskHeader
        icon="transfer"
        title={ffText.transfer}
        titleId="zenith-transfer-title"
        action={<CornerLink href="/wallet-history" label={ffText.walletCard} icon="history" />}
      />

      <div className="relative pt-8">
        <svg aria-hidden="true" viewBox="0 0 100 70" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[70px] w-full overflow-visible">
          <path d="M25,70 Q50,-6 75,70" fill="none" stroke="var(--color-fg)" strokeOpacity={0.12} strokeWidth={6} vectorEffect="non-scaling-stroke" />
          <path
            d="M25,70 Q50,-6 75,70"
            fill="none"
            stroke="var(--hero-buy)"
            strokeWidth={2}
            strokeDasharray="4 9"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="zenith-flow"
            style={{ filter: 'drop-shadow(0 0 4px var(--hero-buy))' }}
          />
        </svg>
        <button
          type="button"
          onClick={() => setToWallet((value) => !value)}
          aria-label={ffText.swapDirection}
          title={ffText.swapDirection}
          aria-pressed={toWallet}
          className={cx(
            'absolute top-[12px] left-1/2 z-20 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-fg text-app shadow-[0_8px_20px_-8px_rgb(0_0_0/0.9)] ring-4 ring-app transition-transform hover:scale-105 motion-reduce:transition-none',
            focusRing,
          )}
        >
          <Icon name="transfer" size={16} className={cx('transition-transform duration-500 motion-reduce:transition-none', toWallet && 'rotate-180')} />
        </button>

        <div className="flex items-stretch gap-3">
          {toWallet ? accountPod(ffText.from, true) : walletPod(ffText.from, true)}
          {toWallet ? walletPod(ffText.to, false) : accountPod(ffText.to, false)}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {specs.map((spec) => (
          <div key={spec.label} className="min-w-0 rounded-2xl bg-fg/[0.04] px-3 py-2 ring-1 ring-fg/[0.07]">
            <dt className="truncate text-[10px] text-fg-subtle">{spec.label}</dt>
            <dd className="mt-0.5 truncate text-xs font-semibold text-fg tabular-nums">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <WaveButton href="/transfer" icon="transfer" label={ffText.transfer} className="mt-auto" />
    </section>
  );
}

/* ───────────── Trading power gauge ───────────── */

const TICKS = 36;
const GAUGE_CX = 100;
const GAUGE_CY = 100;

function polar(radius: number, t: number): [number, number] {
  const angle = Math.PI * (1 - t);
  return [GAUGE_CX + radius * Math.cos(angle), GAUGE_CY - radius * Math.sin(angle)];
}

interface PowerGaugeProps {
  accounts?: TradingAccount[];
  balanceHistory?: number[];
  currency: string;
  hidden: boolean;
}

/**
 * Equity of the live accounts in the middle of a half-circle tick gauge: ember ticks are free margin, red ticks used
 * margin. Ticks light up one by one, then a brightness wave keeps sweeping across them. Daily balance runs underneath.
 */
export function PowerGauge({ accounts, balanceHistory, currency, hidden }: PowerGaugeProps) {
  if (!accounts) return <DeskSkeleton />;

  const sum = (pickValue: (account: TradingAccount) => number) => accounts.reduce((total, account) => total + pickValue(account), 0);
  const freeMargin = sum((account) => account.freeMargin);
  const equity = sum((account) => account.equity);
  const balance = sum((account) => account.balance);
  const usedMargin = Math.max(equity - freeMargin, 0);
  const floating = equity - balance;
  const freeShare = equity ? Math.min(Math.max(freeMargin / equity, 0), 1) : 0;
  const usedShare = equity ? Math.min(usedMargin / equity, 1) : 0;
  const freeTicks = Math.round(freeShare * TICKS);
  const usedTicks = Math.round(usedShare * TICKS);
  const [beadX, beadY] = polar(96, freeShare);

  const history = balanceHistory?.slice(-30) ?? [];
  const low = Math.min(...history);
  const high = Math.max(...history);
  const linePoints = history.map((value, index): [number, number] => [
    (index / Math.max(history.length - 1, 1)) * 300,
    44 - ((value - low) / (high - low || 1)) * 36,
  ]);
  const line = smoothPath(linePoints);
  const lastPoint = linePoints[linePoints.length - 1];

  return (
    <section aria-labelledby="zenith-power-title" className={cx(boardCard, 'zenith-tile flex flex-col gap-5 p-5 sm:p-6')} style={{ animationDelay: '280ms' }}>
      <DeskHeader
        icon="accounts"
        title={ffText.tradingPower}
        titleId="zenith-power-title"
        subtitle={
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-success motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            {accounts.length} {ffText.liveAccounts}
          </span>
        }
        action={<CornerLink href="/accounts" label={ffText.tradingAccounts} icon="chevronRight" />}
      />

      <div className="relative mx-auto w-full max-w-[300px]">
        <svg viewBox="0 0 200 106" aria-hidden="true" className="block w-full overflow-visible">
          {Array.from({ length: TICKS }, (_, index) => {
            const t = index / (TICKS - 1);
            const [x1, y1] = polar(70, t);
            const [x2, y2] = polar(88, t);
            const color =
              index < freeTicks ? 'var(--hero-buy)' : index >= TICKS - usedTicks ? 'var(--zenith-red)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)';
            return (
              <line
                key={index}
                x1={x1.toFixed(2)}
                y1={y1.toFixed(2)}
                x2={x2.toFixed(2)}
                y2={y2.toFixed(2)}
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                className="zenith-tick"
                style={{ animationDelay: `${300 + index * 30}ms, ${1500 + index * 45}ms` }}
              />
            );
          })}
          <circle cx={beadX.toFixed(2)} cy={beadY.toFixed(2)} r={4.5} fill="white" stroke="var(--hero-buy)" strokeWidth={2.5} className="zenith-twinkle" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
          <p className="text-xs text-fg-muted">{ffText.equity}</p>
          <p className="mt-1 text-2xl leading-none font-bold tracking-[-0.02em] text-fg tabular-nums">{money(equity, currency, hidden)}</p>
          <p className={cx('mt-1.5 text-[11px] font-semibold tabular-nums', floating >= 0 ? 'text-success' : 'text-(--zenith-red)')}>
            {hidden ? MASK : `${floating >= 0 ? '+' : '−'}${formatMoney(Math.abs(floating), currency)}`} {ffText.floatingShort}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-2xl bg-fg/[0.04] px-3 py-2.5 ring-1 ring-fg/[0.07]">
          <p className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-(--hero-buy)" />
            {ffText.freeMargin}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-fg tabular-nums">
            {hidden ? MASK : <CountUpMoney value={freeMargin} currency={currency} centsClassName="text-fg-subtle" />}
          </p>
          <p className="truncate text-[10px] text-(--hero-buy)">
            {Math.round(freeShare * 100)}% {ffText.available}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-fg/[0.04] px-3 py-2.5 ring-1 ring-fg/[0.07]">
          <p className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-(--zenith-red)" />
            {ffText.usedMargin}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-fg tabular-nums">{money(usedMargin, currency, hidden)}</p>
          <p className="truncate text-[10px] text-(--zenith-red)">
            {Math.round(usedShare * 100)}% {ffText.ofEquity}
          </p>
        </div>
      </div>

      {history.length > 1 && (
        <div>
          <p className="text-[10px] text-fg-subtle">{ffText.dailyBalance}</p>
          <svg viewBox="0 0 300 48" preserveAspectRatio="none" role="img" aria-label={ffText.dailyBalance} className="mt-1 h-10 w-full overflow-visible">
            <defs>
              <linearGradient id="zenith-power-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--hero-buy)" stopOpacity="0.3" />
                <stop offset="1" stopColor="var(--hero-buy)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L300,48 L0,48 Z`} fill="url(#zenith-power-fill)" />
            <path d={line} fill="none" stroke="var(--hero-buy)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" className="zenith-reveal" />
            {lastPoint && <circle cx={lastPoint[0]} cy={lastPoint[1].toFixed(2)} r={3} fill="var(--hero-buy)" className="zenith-twinkle" />}
          </svg>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2">
        <WaveButton href="/platforms" icon="trendUp" label={ffText.tradeNow} className="h-11 text-xs" />
        <Link
          href="/accounts/new"
          className={cx(
            'flex h-11 items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-fg ring-1 ring-fg/15 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-fg/[0.06] motion-reduce:transition-none',
            focusRing,
          )}
        >
          <Icon name="plus" size={14} />
          {ffText.openAccount}
        </Link>
      </div>
    </section>
  );
}

/* ───────────── Goal ring ───────────── */

interface GoalRingProps {
  monthlyFlows?: FundsFlowPeriod[];
  depositTrend?: number[];
  currency: string;
  hidden: boolean;
}

const RING_R = 50;

/** This month's deposits against last month's as a ring that draws itself, with the deposit trend beside it. */
export function GoalRing({ monthlyFlows, depositTrend, currency, hidden }: GoalRingProps) {
  if (!monthlyFlows) return <DeskSkeleton />;

  const current = monthlyFlows[monthlyFlows.length - 1];
  const previous = monthlyFlows[monthlyFlows.length - 2];
  const earned = current?.deposits ?? 0;
  const goal = Math.max(previous?.deposits ?? 0, earned, 1);
  const earnedShare = current ? Math.min(earned / goal, 1) : 0;
  const percent = Math.round(earnedShare * 100);
  const beadAngle = earnedShare * Math.PI * 2 - Math.PI / 2;

  const trendDelta = depositTrend && depositTrend.length > 1 ? depositTrend[depositTrend.length - 1] - depositTrend[0] : undefined;
  const trendStart = depositTrend?.[0];
  const trendChange = trendDelta !== undefined && trendStart ? (trendDelta / Math.abs(trendStart)) * 100 : undefined;
  const trendLow = depositTrend ? Math.min(...depositTrend) : 0;
  const trendHigh = depositTrend ? Math.max(...depositTrend) : 1;
  const trendLine = depositTrend
    ? smoothPath(depositTrend.map((value, index): [number, number] => [(index / Math.max(depositTrend.length - 1, 1)) * 100, 28 - ((value - trendLow) / (trendHigh - trendLow || 1)) * 24]))
    : '';

  return (
    <section aria-labelledby="zenith-goal-title" className={cx(boardCard, 'zenith-tile flex flex-col gap-5 p-5 sm:p-6')} style={{ animationDelay: '360ms' }}>
      <div className="flex items-start justify-between gap-3">
        <h3 id="zenith-goal-title" className="max-w-[18ch] text-lg leading-snug font-semibold text-fg">
          {ffText.goalsTitle}
        </h3>
        <Link
          href="/deposit"
          aria-label={ffText.addFunds}
          title={ffText.addFunds}
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-full bg-(--hero-buy) text-[#160904] transition-transform hover:rotate-90 motion-reduce:transition-none',
            focusRing,
          )}
        >
          <Icon name="plus" size={18} />
        </Link>
      </div>
      <p className="-mt-2 max-w-[34ch] text-xs leading-relaxed text-fg-muted">{ffText.goalsText}</p>

      <div className="flex items-center gap-5">
        <div
          role="progressbar"
          aria-label={ffText.income}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="relative size-36 shrink-0"
        >
          <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full overflow-visible">
            <circle cx={60} cy={60} r={RING_R} fill="none" stroke="var(--color-fg)" strokeOpacity={0.07} strokeWidth={10} />
            <circle cx={60} cy={60} r={RING_R + 9} fill="none" stroke="var(--color-fg)" strokeOpacity={0.14} strokeWidth={1} strokeDasharray="1 5" className="zenith-orbit" />
            <circle
              cx={60}
              cy={60}
              r={RING_R}
              fill="none"
              stroke="var(--hero-buy)"
              strokeWidth={10}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${percent} 100`}
              transform="rotate(-90 60 60)"
              className="zenith-ring"
              style={{ filter: 'drop-shadow(0 0 6px var(--hero-buy))' }}
            />
            <circle
              cx={(60 + RING_R * Math.cos(beadAngle)).toFixed(2)}
              cy={(60 + RING_R * Math.sin(beadAngle)).toFixed(2)}
              r={6}
              fill="white"
              stroke="var(--hero-buy)"
              strokeWidth={3}
              className="zenith-twinkle"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-3xl leading-none font-bold tracking-[-0.03em] text-fg tabular-nums">{percent}%</span>
            <span className="mt-1 text-[11px] text-fg-muted">{ffText.earned}</span>
          </div>
        </div>

        <dl className="flex min-w-0 flex-1 flex-col gap-3 text-xs">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-fg-muted">
              <span aria-hidden="true" className="size-2 rounded-full bg-success" />
              {ffText.earned}
            </dt>
            <dd className="mt-0.5 truncate text-base font-bold text-success tabular-nums">{money(earned, currency, hidden)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-fg-muted">
              <span aria-hidden="true" className="size-2 rounded-full bg-fg" />
              {ffText.goal}
            </dt>
            <dd className="mt-0.5 truncate text-base font-bold text-fg tabular-nums">{money(goal, currency, hidden)}</dd>
          </div>
          {depositTrend && depositTrend.length > 1 && (
            <div className="min-w-0">
              <dt className="flex items-center justify-between gap-2 text-fg-muted">
                {ffText.deposits}
                <ChangeChip value={trendChange} />
              </dt>
              <dd className="mt-1">
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" className="h-8 w-full overflow-visible">
                  <path d={trendLine} fill="none" stroke="var(--color-fg)" strokeOpacity={0.8} strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="zenith-reveal" />
                </svg>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl bg-fg/[0.04] px-4 py-3 ring-1 ring-fg/[0.07]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{ffText.cashFlow}</p>
          <p className="truncate text-[11px] text-fg-muted tabular-nums">
            {ffText.income}: <span className="font-semibold text-success">{money(earned, currency, hidden)}</span> / {money(goal, currency, hidden)}
          </p>
        </div>
        <CornerLink href="/history" label={ffText.cashFlow} icon="history" />
      </div>
    </section>
  );
}
