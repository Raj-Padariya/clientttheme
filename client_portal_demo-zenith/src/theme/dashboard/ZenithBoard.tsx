'use client';

import Link from 'next/link';
import { useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import type { FundsFlowPeriod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUpMoney, ffText } from './finflowParts';

/*
 * Zenith dashboard board: an open balance header, a row of textured account tiles, a two-line balance chart with
 * day pills, monthly flow capsules, an asset flow diagram and a pixel grid of daily cash movement.
 */

export const MASK = '••••••';
const RED = '#ff4a3d';

export const boardCard =
  'relative isolate min-w-0 overflow-hidden rounded-[24px] bg-linear-to-b from-fg/[0.06] to-fg/[0.015] ring-1 ring-fg/[0.08]';

const pillButton =
  'inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function money(value: number | undefined, currency: string, hidden: boolean): string {
  if (value === undefined) return '—';
  return hidden ? MASK : formatMoney(value, currency);
}

function percentChange(from: number, to: number): number | undefined {
  if (!from) return undefined;
  return ((to - from) / Math.abs(from)) * 100;
}

export function ChangeChip({ value, className }: { value: number | undefined; className?: string }) {
  if (value === undefined) return null;
  const isUp = value >= 0;
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', isUp ? 'text-success' : 'text-(--zenith-red)', className)}>
      <Icon name="arrowUpRight" size={13} className={cx(!isUp && 'rotate-90')} />
      {isUp ? '+' : '−'}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function CardHeader({ title, value, aside }: { title: string; value: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-fg-muted">{title}</p>
        <p className="mt-1.5 truncate text-[28px] leading-none font-bold tracking-[-0.02em] text-fg tabular-nums">{value}</p>
      </div>
      {aside}
    </div>
  );
}

/** Smooth curve through the points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return '';
  let path = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return path;
}

function dayDate(daysAgo: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/* ───────────── Balance header ───────────── */

interface BalanceHeaderProps {
  holderName: string;
  total?: number;
  walletBalance?: number;
  accounts?: TradingAccount[];
  currency: string;
  balanceHistory?: number[];
  hidden: boolean;
  onToggleHidden: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const headerIconButton =
  'grid size-10 place-items-center rounded-full bg-fg/[0.06] text-fg-muted ring-1 ring-fg/10 transition-colors hover:bg-fg/[0.12] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const ghostAction =
  'group inline-flex h-11 items-center gap-2 rounded-full bg-fg/[0.06] px-4 text-sm font-semibold text-fg ring-1 ring-fg/10 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-fg/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

const CAPSULE_COLORS = ['var(--zenith-red)', '#ece7df', 'var(--hero-buy)'];

/** Two periods of each wave across 200 units, so drifting the layer by half its width loops seamlessly. */
function wavePath(line: number): string {
  const base = 4 + line * 9;
  let path = `M0,${base + 12}`;
  for (let x = 5; x <= 200; x += 5) {
    path += ` L${x},${(base + 12 + Math.sin((x / 100) * Math.PI * 2 + line * 0.5) * 10).toFixed(2)}`;
  }
  return path;
}

export const WAVE_PATHS = [0, 1, 2, 3, 4, 5].map(wavePath);

/** A filled capsule carrying a slowly drifting pattern of white wave lines. */
function WaveCapsule({ color, label, grow, delay }: { color: string; label: string; grow: number; delay: number }) {
  return (
    <span
      title={label}
      className="zenith-capsule relative h-full min-w-11 overflow-hidden rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_8px_20px_-12px_rgb(0_0_0/0.8)]"
      style={{ flexGrow: grow, flexBasis: 0, background: color, animationDelay: `${delay}ms` }}
    >
      <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift absolute inset-y-0 left-0 h-full w-[200%]">
        {WAVE_PATHS.map((path) => (
          <path key={path} d={path} fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </span>
  );
}

/** "Label /amount" over a track; the coloured capsules sit at the track's right end, sized by their share of total. */
function SplitTrack({ label, amount, share, children }: { label: string; amount: string; share: number | undefined; children: ReactNode }) {
  const width = Math.min(100, Math.max(34, share ?? 34));
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] text-fg-muted">
        {label} <span className="ml-1 font-semibold text-(--hero-buy) tabular-nums">/{amount}</span>
      </p>
      <div className="mt-2 flex h-16 justify-end rounded-full bg-fg/[0.06] p-1 ring-1 ring-fg/[0.08]">
        <span className="flex h-full gap-1.5" style={{ width: `${width}%` }}>
          {children}
        </span>
      </div>
    </div>
  );
}

const ARC_CX = 200;
const ARC_CY = 206;
const ARC_R = 190;

/** The arc stops short of the baseline on both sides, so its ends never meet the dome's bottom edge. */
const ARC_INSET = 0.09;

function arcPoint(t: number): [number, number] {
  const angle = Math.PI * (ARC_INSET + (1 - ARC_INSET * 2) * t);
  return [ARC_CX - ARC_R * Math.cos(angle), ARC_CY - ARC_R * Math.sin(angle)];
}

/**
 * The total balance under a glowing dome. The arc above it is this month: solid up to today (a pulsing ember bead),
 * dashed for the days still to come, with a dot at each weekly checkpoint.
 */
function BalanceDome({ total, change, currency, hidden }: { total?: number; change?: number; currency: string; hidden: boolean }) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const progress = now.getDate() / daysInMonth;
  const [todayX, todayY] = arcPoint(progress);
  const [startX, startY] = arcPoint(0);
  const [endX, endY] = arcPoint(1);
  const checkpoints = [1, 8, 15, 22, daysInMonth].map((day) => day / daysInMonth);

  return (
    <div className="relative mx-auto aspect-[400/212] w-full max-w-[560px]">
      <span
        aria-hidden="true"
        className="absolute inset-x-[7%] bottom-0 aspect-[2/1] overflow-hidden rounded-t-full bg-[radial-gradient(110%_100%_at_50%_0%,color-mix(in_srgb,var(--hero-buy)_42%,transparent),color-mix(in_srgb,var(--zenith-red)_14%,transparent)_55%,transparent_92%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28)] [mask-image:linear-gradient(to_bottom,#000_40%,transparent_96%)]"
      >
        <span className="zenith-spot absolute -top-1/3 left-1/4 h-2/3 w-1/2 rounded-full bg-white/20 blur-3xl" />
        <svg viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift absolute inset-x-0 bottom-0 h-1/3 w-[200%] opacity-40">
          {WAVE_PATHS.slice(0, 4).map((path) => (
            <path key={path} d={path} fill="none" stroke="white" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </span>

      <svg viewBox="0 0 400 212" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
        <path
          d={`M${startX},${startY} A${ARC_R},${ARC_R} 0 0 1 ${todayX.toFixed(2)},${todayY.toFixed(2)}`}
          fill="none"
          stroke="var(--hero-buy)"
          strokeWidth={1.6}
          className="zenith-reveal"
          style={{ filter: 'drop-shadow(0 0 6px var(--hero-buy))' }}
        />
        <path
          d={`M${todayX.toFixed(2)},${todayY.toFixed(2)} A${ARC_R},${ARC_R} 0 0 1 ${endX},${endY}`}
          fill="none"
          stroke="var(--color-fg)"
          strokeOpacity={0.3}
          strokeWidth={1.4}
          strokeDasharray="6 10"
          className="zenith-flow"
        />
      </svg>

      {checkpoints.map((t) => {
        const [x, y] = arcPoint(t);
        const isPast = t <= progress;
        return (
          <span
            key={t}
            aria-hidden="true"
            className={cx('absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full', isPast ? 'bg-(--hero-buy) ring-4 ring-(--hero-buy)/20' : 'bg-fg/25 ring-4 ring-fg/[0.06]')}
            style={{ left: `${((x / 400) * 100).toFixed(2)}%`, top: `${((y / 212) * 100).toFixed(2)}%` }}
          />
        );
      })}
      <span
        aria-hidden="true"
        className="absolute size-4 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${((todayX / 400) * 100).toFixed(2)}%`, top: `${((todayY / 212) * 100).toFixed(2)}%` }}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-(--hero-buy) motion-reduce:hidden" />
        <span className="absolute inset-0 rounded-full bg-white shadow-[0_0_16px_4px_var(--hero-buy)] ring-4 ring-(--hero-buy)" />
      </span>

      <div className="absolute inset-x-0 bottom-[6%] flex flex-col items-center text-center">
        <p className="text-sm text-fg-muted">{ffText.totalBalance}</p>
        <p className="mt-1 text-[32px] leading-none font-semibold tracking-[-0.03em] text-fg tabular-nums sm:text-[44px]">
          {hidden ? <span className="tracking-[0.1em]">{MASK}</span> : <CountUpMoney value={total} currency={currency} />}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {change !== undefined && (
            <span className="rounded-full bg-fg/[0.07] px-2.5 py-1 ring-1 ring-fg/10">
              <ChangeChip value={change} />
            </span>
          )}
          <Link
            href="/accounts"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-fg px-3.5 text-xs font-semibold text-app transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            {ffText.view}
            <Icon name="arrowUpRight" size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Open wallet header, no card. Left: greeting, a large light title, the wallet / trading accounts split as wave
 * capsules on two tracks, and the money actions. Right: the total balance under the month-progress dome.
 */
export function BalanceHeader({
  holderName,
  total,
  walletBalance,
  accounts,
  currency,
  balanceHistory,
  hidden,
  onToggleHidden,
  isRefreshing,
  onRefresh,
}: BalanceHeaderProps) {
  const firstName = holderName.split(/\s+/)[0] ?? holderName;
  const recent = balanceHistory?.slice(-30) ?? [];
  const change = recent.length > 1 ? percentChange(recent[0], recent[recent.length - 1]) : undefined;
  const accountsBalance = total !== undefined && walletBalance !== undefined ? total - walletBalance : undefined;
  const shareOf = (value: number | undefined) => (total && value !== undefined ? (value / total) * 100 : undefined);

  return (
    <section aria-label={ffText.totalBalance} className="zenith-tile grid items-end gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-fg-muted">
            {ffText.greeting} <span className="font-semibold text-fg">{firstName}</span>, {ffText.welcome.toLowerCase()}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? ffText.showBalance : ffText.hideBalance}
              title={hidden ? ffText.showBalance : ffText.hideBalance}
              className={headerIconButton}
            >
              <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} />
            </button>
            <button type="button" onClick={onRefresh} aria-label={ffText.refresh} title={ffText.refresh} className={headerIconButton}>
              <Icon name="refresh" size={16} className={cx(isRefreshing && 'animate-spin motion-reduce:animate-none')} />
            </button>
          </div>
        </div>

        <h2 className="mt-3 text-[46px] leading-none font-light tracking-[-0.04em] text-fg sm:text-[64px]">{ffText.myWallet}</h2>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <SplitTrack label={ffText.wallet} amount={money(walletBalance, currency, hidden)} share={shareOf(walletBalance)}>
            <WaveCapsule color="var(--hero-buy)" label={`${ffText.wallet}: ${money(walletBalance, currency, hidden)}`} grow={1} delay={250} />
          </SplitTrack>
          <SplitTrack label={ffText.tradingAccounts} amount={money(accountsBalance, currency, hidden)} share={shareOf(accountsBalance)}>
            {accounts && accounts.length > 0 ? (
              accounts.map((account, index) => (
                <WaveCapsule
                  key={account.id}
                  color={CAPSULE_COLORS[index % CAPSULE_COLORS.length]}
                  label={`${account.platform} · ${account.login}: ${money(account.balance, account.currency, hidden)}`}
                  grow={Math.max(account.balance, 1)}
                  delay={350 + index * 120}
                />
              ))
            ) : (
              <span className="h-full flex-1 animate-pulse rounded-full bg-fg/[0.08]" />
            )}
          </SplitTrack>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <Link
            href="/deposit"
            className="relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-full bg-(--hero-buy) px-5 text-sm font-bold text-[#160904] shadow-[0_10px_24px_-10px_var(--hero-buy)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="zenith-shine absolute inset-y-0 left-0 -z-10 w-1/3 bg-white/45 blur-[2px]" />
            <Icon name="plus" size={16} />
            {ffText.addFunds}
          </Link>
          <Link href="/withdrawal" className={ghostAction}>
            <Icon name="arrowUpRight" size={16} />
            {ffText.withdraw}
          </Link>
          <Link href="/transfer" title={ffText.swap} className={ghostAction}>
            <Icon name="transfer" size={16} className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none" />
            {ffText.transfer}
          </Link>
        </div>
      </div>

      <BalanceDome total={total} change={change} currency={currency} hidden={hidden} />
    </section>
  );
}

/* ───────────── Account tiles ───────────── */

interface TileProps {
  icon: IconName;
  label: string;
  value: string;
  change?: number;
  caption: string;
  index: number;
}

function AccountTile({ icon, label, value, change, caption, index }: TileProps) {
  return (
    <div
      className={cx(boardCard, 'zenith-tile flex h-[138px] w-[228px] shrink-0 snap-start flex-col justify-between p-4 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none')}
      style={{ animationDelay: `${120 + index * 90}ms` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/4 [background-image:radial-gradient(color-mix(in_srgb,var(--color-fg)_22%,transparent)_1px,transparent_1.2px)] [background-size:4px_4px] [mask-image:radial-gradient(80%_90%_at_100%_0,#000,transparent)]"
      />
      <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg/[0.08] ring-1 ring-fg/15">
          <Icon name={icon} size={14} />
        </span>
        <span className="truncate">{label}</span>
      </p>
      <div>
        <p className="flex items-baseline gap-2">
          <span className="truncate text-2xl font-bold tracking-[-0.02em] text-fg tabular-nums">{value}</span>
          <ChangeChip value={change} className="shrink-0" />
        </p>
        <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{caption}</p>
      </div>
    </div>
  );
}

interface AccountTilesProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  total?: number;
  currency: string;
  hidden: boolean;
}

/** Wallet + every live account as textured tiles, ending in a dashed "open another account" tile. Scrolls sideways. */
export function AccountTiles({ accounts, walletBalance, total, currency, hidden }: AccountTilesProps) {
  const walletShare = total && walletBalance !== undefined ? (walletBalance / total) * 100 : undefined;

  return (
    <section aria-label={ffText.accountsTitle} className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-2">
      {!accounts ? (
        Array.from({ length: 3 }, (_, index) => <div key={index} className={cx(boardCard, 'h-[138px] w-[228px] shrink-0 animate-pulse')} />)
      ) : (
        <>
          <AccountTile
            index={0}
            icon="wallet"
            label={ffText.wallet}
            value={money(walletBalance, currency, hidden)}
            caption={walletShare === undefined ? ffText.walletBalance : `${walletShare.toFixed(1)}% ${ffText.shareOfTotal}`}
          />
          {accounts.map((account, index) => (
            <AccountTile
              key={account.id}
              index={index + 1}
              icon="accounts"
              label={`${account.platform} · ${account.login}`}
              value={money(account.balance, account.currency, hidden)}
              change={percentChange(account.balance, account.equity)}
              caption={`${ffText.equity} ${money(account.equity, account.currency, hidden)} · 1:${account.leverage}`}
            />
          ))}
        </>
      )}
      <Link
        href="/accounts"
        className="zenith-tile group flex h-[138px] w-[228px] shrink-0 snap-start flex-col justify-between rounded-[24px] border border-dashed border-fg/20 p-4 text-fg-subtle transition-colors hover:border-fg/40 hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ animationDelay: `${120 + ((accounts?.length ?? 2) + 1) * 90}ms` }}
      >
        <span className="grid size-8 place-items-center rounded-full ring-1 ring-fg/20 transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none">
          <Icon name="plus" size={15} />
        </span>
        <span className="text-sm leading-snug">
          {ffText.addAccountTitle} <span className="font-semibold text-fg">{ffText.openAccount.toLowerCase()}</span> — {ffText.addAccountText}
        </span>
      </Link>
    </section>
  );
}

/* ───────────── Two-line balance chart ───────────── */

const CHART_W = 640;
const CHART_H = 240;
const RANGES = [7, 21, 30] as const;
type ChartRange = (typeof RANGES)[number];

interface BalanceWaveChartProps {
  series?: number[];
  currency: string;
  hidden: boolean;
}

/**
 * Daily balance (white) against its 7-day average (red) as two smooth curves over a fine grid. A day pill or the
 * pointer picks a day: a glowing marker sits on the red line with the day's values in a tag.
 */
export function BalanceWaveChart({ series, currency, hidden }: BalanceWaveChartProps) {
  const [range, setRange] = useState<ChartRange>(21);
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const average = useMemo(
    () =>
      (series ?? []).map((_, index, all) => {
        const window = all.slice(Math.max(0, index - 6), index + 1);
        return window.reduce((sum, value) => sum + value, 0) / window.length;
      }),
    [series],
  );

  if (!series || series.length < 2) {
    return <section aria-busy="true" className={cx(boardCard, 'h-[420px] animate-pulse')} />;
  }

  const count = Math.min(range, series.length);
  const values = series.slice(-count);
  const averages = average.slice(-count);
  const active = hovered ?? (picked !== null && picked < count ? picked : count - 1);
  const low = Math.min(...values, ...averages);
  const high = Math.max(...values, ...averages);
  const pad = (high - low || 1) * 0.18;
  const toY = (value: number) => CHART_H - ((value - (low - pad)) / (high - low + pad * 2)) * CHART_H;
  const toX = (index: number) => (index / (count - 1)) * CHART_W;
  const linePath = smoothPath(values.map((value, index) => [toX(index), toY(value)]));
  const avgPath = smoothPath(averages.map((value, index) => [toX(index), toY(value)]));
  const markerLeft = (toX(active) / CHART_W) * 100;
  const markerTop = (toY(averages[active]) / CHART_H) * 100;
  const activeDate = dayDate(count - 1 - active);
  const dateLabel = activeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.round(((event.clientX - rect.left) / rect.width) * (count - 1));
    setHovered(Math.min(count - 1, Math.max(0, index)));
  };

  return (
    <section aria-label={ffText.balanceMovement} className={cx(boardCard, 'zenith-tile flex flex-col p-5 sm:p-6')} style={{ animationDelay: '200ms' }}>
      <CardHeader
        title={ffText.balanceMovement}
        value={money(values[active], currency, hidden)}
        aside={
          <div role="group" aria-label={ffText.balanceMovement} className="flex shrink-0 gap-1 rounded-full bg-fg/[0.05] p-1 ring-1 ring-fg/10">
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={range === option}
                onClick={() => {
                  setRange(option);
                  setPicked(null);
                }}
                className={cx(pillButton, 'h-7 px-2.5', range === option ? 'bg-fg text-app' : 'text-fg-muted hover:text-fg')}
              >
                {option}D
              </button>
            ))}
          </div>
        }
      />

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-fg" />
          {ffText.dailyBalanceLine}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: RED }} />
          {ffText.weekAverage}
        </span>
      </p>

      <div
        role="img"
        aria-label={`${ffText.balanceMovement}, ${dateLabel}: ${money(values[active], currency, hidden)}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
        className="relative mt-6 h-[200px] touch-pan-y sm:h-[240px]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 [background-image:linear-gradient(color-mix(in_srgb,var(--color-fg)_6%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--color-fg)_6%,transparent)_1px,transparent_1px)] [background-size:100%_25%,calc(100%/12)_100%] [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]"
        />
        <svg key={range} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true" className="zenith-reveal absolute inset-0 size-full overflow-visible">
          <path d={avgPath} fill="none" stroke={RED} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 6px ${RED}88)` }} />
          <path d={linePath} fill="none" stroke="var(--color-fg)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.92} />
        </svg>

        <span aria-hidden="true" className="absolute inset-y-0 w-px border-l border-dashed border-fg/25 transition-[left] duration-200 motion-reduce:transition-none" style={{ left: `${markerLeft}%` }} />
        <span aria-hidden="true" className="absolute size-4 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-200 motion-reduce:transition-none" style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}>
          <span className="absolute inset-0 animate-ping rounded-full motion-reduce:hidden" style={{ background: RED }} />
          <span className="absolute inset-0 rounded-full ring-4 ring-app" style={{ background: RED, boxShadow: `0 0 18px 4px ${RED}aa` }} />
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-xl bg-[#1b1b1d]/95 px-3 py-2 text-[11px] whitespace-nowrap text-white/70 shadow-[0_12px_28px_-12px_rgb(0_0_0/0.9)] ring-1 ring-white/10 backdrop-blur transition-[left,top] duration-200 motion-reduce:transition-none"
          style={{ left: `${Math.min(84, Math.max(16, markerLeft))}%`, top: `${markerTop}%` }}
        >
          <span className="block">{dateLabel}</span>
          <span className="block font-semibold text-white tabular-nums">
            {ffText.dailyBalanceLine}: {money(values[active], currency, hidden)}
          </span>
          <span className="block tabular-nums" style={{ color: RED }}>
            {ffText.weekAverage}: {money(averages[active], currency, hidden)}
          </span>
        </span>
      </div>

      <div role="group" aria-label={ffText.selectDay} className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {values.map((_, index) => {
          const date = dayDate(count - 1 - index);
          const isActive = index === active;
          return (
            <button
              key={index}
              type="button"
              aria-pressed={isActive}
              aria-label={`${ffText.selectDay} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              onClick={() => setPicked(index)}
              className={cx(
                'grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive ? 'bg-fg text-app ring-fg' : 'text-fg-subtle ring-fg/10 hover:text-fg hover:ring-fg/25',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Monthly flow capsules ───────────── */

type FlowKind = 'deposits' | 'withdrawals';
type FlowPeriod = 'month' | 'year';

interface FlowTracksProps {
  monthly?: FundsFlowPeriod[];
  yearly?: FundsFlowPeriod[];
  currency: string;
  hidden: boolean;
}

/** Tall capsule tracks per month (or year); the current period fills in ember-red, the rest in graphite. */
export function FlowTracks({ monthly, yearly, currency, hidden }: FlowTracksProps) {
  const [kind, setKind] = useState<FlowKind>('deposits');
  const [period, setPeriod] = useState<FlowPeriod>('month');
  const [hovered, setHovered] = useState<number | null>(null);
  const source = (period === 'month' ? monthly : yearly)?.slice(-7);

  if (!source || source.length === 0) {
    return <section aria-busy="true" className={cx(boardCard, 'h-[420px] animate-pulse')} />;
  }

  const values = source.map((flow) => flow[kind]);
  const max = Math.max(...values, 1);
  const last = values.length - 1;
  const active = hovered ?? last;
  const change = values.length > 1 ? percentChange(values[last - 1], values[last]) : undefined;
  const label = (flow: FundsFlowPeriod) =>
    new Date(flow.start).toLocaleDateString('en-US', period === 'month' ? { month: 'short' } : { year: 'numeric' });

  return (
    <section aria-label={ffText.moneyFlow} className={cx(boardCard, 'zenith-tile flex flex-col p-5 sm:p-6')} style={{ animationDelay: '280ms' }}>
      <CardHeader
        title={`${ffText.moneyFlow} · ${kind === 'deposits' ? ffText.deposits : ffText.expenses}`}
        value={money(values[active], currency, hidden)}
        aside={
          <div className="flex shrink-0 gap-1 rounded-full bg-fg/[0.05] p-1 ring-1 ring-fg/10">
            {(['month', 'year'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
                className={cx(pillButton, 'h-7 px-2.5', period === option ? 'bg-fg text-app' : 'text-fg-muted hover:text-fg')}
              >
                {option === 'month' ? ffText.months : ffText.years}
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-fg-subtle">
          <ChangeChip value={change} /> {ffText.vsLastPeriod}
        </span>
        <div className="flex gap-1">
          {(['deposits', 'withdrawals'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
              className={cx(pillButton, 'h-7 px-2.5 ring-1', kind === option ? 'text-fg ring-fg/30' : 'text-fg-subtle ring-transparent hover:text-fg-muted')}
            >
              {option === 'deposits' ? ffText.moneyIn : ffText.moneyOut}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex flex-1 items-stretch gap-3 sm:gap-4" onPointerLeave={() => setHovered(null)}>
        {source.map((flow, index) => {
          const isCurrent = index === last;
          const isActive = index === active;
          const height = Math.max(6, (values[index] / max) * 100);
          return (
            <div key={flow.start} className="flex min-w-0 flex-1 flex-col items-center gap-2.5" onPointerEnter={() => setHovered(index)}>
              <div className="relative h-[220px] w-full max-w-[42px] rounded-full bg-fg/[0.04] ring-1 ring-fg/[0.07] ring-inset">
                <span aria-hidden="true" className="absolute inset-x-1/2 inset-y-3 w-px -translate-x-1/2 border-l border-dashed border-fg/10" />
                <span
                  aria-hidden="true"
                  className={cx(
                    'zenith-bar absolute inset-x-[3px] bottom-[3px] rounded-full',
                    isCurrent
                      ? 'bg-linear-to-b from-[#ff6a4d] via-(--zenith-red) to-[#5a0f0a] shadow-[0_0_24px_-4px_var(--zenith-red)]'
                      : 'bg-linear-to-b from-fg/40 to-fg/[0.08]',
                    isActive && !isCurrent && 'from-fg/70',
                  )}
                  style={{ height: `calc(${height}% - 6px)`, animationDelay: `${300 + index * 80}ms` }}
                >
                  {isCurrent && <span className="zenith-wave absolute inset-x-0 top-0 h-1/2 rounded-full bg-linear-to-b from-white/50 to-transparent" />}
                </span>
                {isActive && (
                  <span className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg bg-[#1b1b1d] px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-white tabular-nums ring-1 ring-white/10" style={{ bottom: `${height}%` }}>
                    {money(values[index], currency, hidden)}
                  </span>
                )}
              </div>
              <span className={cx('text-xs tabular-nums', isActive ? 'font-semibold text-fg' : 'text-fg-subtle')}>{label(flow)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Total assets flow ───────────── */

interface AssetNode {
  key: string;
  label: string;
  value: number;
}

interface AssetFlowProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  total?: number;
  currency: string;
  hidden: boolean;
}

const FLOW_W = 300;
const FLOW_H = 240;
const FLOW_LEFT = 100;
const FLOW_RIGHT = 196;

/** Wallet and accounts on the left feed ribbons (thickness = share) into the ember Total tile on the right. */
export function AssetFlow({ accounts, walletBalance, total, currency, hidden }: AssetFlowProps) {
  if (!accounts || walletBalance === undefined || total === undefined) {
    return <section aria-busy="true" className={cx(boardCard, 'h-[360px] animate-pulse')} />;
  }

  const sorted = [...accounts].sort((a, b) => b.balance - a.balance);
  const nodes: AssetNode[] = [{ key: 'wallet', label: ffText.wallet, value: walletBalance }];
  sorted.slice(0, 3).forEach((account) => nodes.push({ key: account.id, label: `#${account.login}`, value: account.balance }));
  const rest = sorted.slice(3).reduce((sum, account) => sum + account.balance, 0);
  if (rest > 0) nodes.push({ key: 'rest', label: ffText.otherAccounts, value: rest });

  const sum = nodes.reduce((acc, node) => acc + Math.max(0, node.value), 0) || 1;
  const bandTotal = FLOW_H * 0.42;
  let stack = FLOW_H / 2 - bandTotal / 2;
  const ribbons = nodes.map((node, index) => {
    const thickness = Math.max(4, (Math.max(0, node.value) / sum) * bandTotal);
    const leftY = ((index + 0.5) / nodes.length) * FLOW_H;
    const rightTop = stack;
    stack += thickness;
    const mid = (FLOW_LEFT + FLOW_RIGHT) / 2;
    const top = `M${FLOW_LEFT},${leftY - thickness / 2} C${mid},${leftY - thickness / 2} ${mid},${rightTop} ${FLOW_RIGHT},${rightTop}`;
    const bottom = `L${FLOW_RIGHT},${rightTop + thickness} C${mid},${rightTop + thickness} ${mid},${leftY + thickness / 2} ${FLOW_LEFT},${leftY + thickness / 2} Z`;
    const center = `M${FLOW_LEFT},${leftY} C${mid},${leftY} ${mid},${rightTop + thickness / 2} ${FLOW_RIGHT},${rightTop + thickness / 2}`;
    return { key: node.key, band: `${top} ${bottom}`, center, index };
  });

  return (
    <section aria-label={ffText.totalAssets} className={cx(boardCard, 'zenith-tile flex flex-col p-5 sm:p-6')} style={{ animationDelay: '360ms' }}>
      <CardHeader title={ffText.totalAssets} value={money(total, currency, hidden)} />
      <div className="relative mt-6 h-[240px]">
        <svg viewBox={`0 0 ${FLOW_W} ${FLOW_H}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="zenith-ribbon" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--color-fg)" stopOpacity="0.1" />
              <stop offset="1" stopColor={RED} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {ribbons.map((ribbon) => (
            <g key={ribbon.key}>
              <path d={ribbon.band} fill="url(#zenith-ribbon)" className="zenith-reveal" style={{ animationDelay: `${400 + ribbon.index * 120}ms` }} />
              <path
                d={ribbon.center}
                fill="none"
                stroke="var(--color-fg)"
                strokeOpacity={0.45}
                strokeWidth={1.2}
                strokeDasharray="2 12"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="zenith-flow"
              />
            </g>
          ))}
        </svg>

        <ul className="absolute inset-y-0 left-0 flex w-[33%] flex-col justify-around">
          {nodes.map((node) => (
            <li key={node.key} className="rounded-xl bg-fg/[0.06] px-2.5 py-1.5 ring-1 ring-fg/10 backdrop-blur-sm">
              <p className="truncate text-[11px] text-fg-muted">{node.label}</p>
              <p className="truncate text-xs font-semibold text-fg tabular-nums">{money(node.value, currency, hidden)}</p>
            </li>
          ))}
        </ul>

        <div className="absolute top-1/2 right-0 w-[35%] -translate-y-1/2 overflow-hidden rounded-xl bg-linear-to-b from-[#ff5a45] to-[#b3170e] px-3 py-3 text-white shadow-[0_14px_30px_-12px_var(--zenith-red)]">
          <span aria-hidden="true" className="zenith-shine absolute inset-y-0 left-0 w-1/3 bg-white/25 blur-[2px]" />
          <p className="relative text-[11px] font-semibold text-white/80">{ffText.totalBalance}</p>
          <p className="relative truncate text-sm font-bold tabular-nums">{money(total, currency, hidden)}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Net cashflow pixels ───────────── */

interface CashflowPixelsProps {
  monthly?: FundsFlowPeriod[];
  series?: number[];
  currency: string;
  hidden: boolean;
}

const PIXEL_DAYS = 42;

/** This month's net flow, over a 7×6 pixel grid of daily balance changes: bright = up days, red = down days. */
export function CashflowPixels({ monthly, series, currency, hidden }: CashflowPixelsProps) {
  if (!monthly || monthly.length === 0 || !series || series.length < 2) {
    return <section aria-busy="true" className={cx(boardCard, 'h-[360px] animate-pulse')} />;
  }

  const current = monthly[monthly.length - 1];
  const previous = monthly[monthly.length - 2];
  const net = current.deposits - current.withdrawals;
  const change = previous ? percentChange(previous.deposits - previous.withdrawals, net) : undefined;
  const recent = series.slice(-(PIXEL_DAYS + 1));
  const diffs = recent.slice(1).map((value, index) => value - recent[index]);
  const cells = Array.from({ length: PIXEL_DAYS }, (_, index) => diffs[index - (PIXEL_DAYS - diffs.length)]);
  const maxAbs = Math.max(...diffs.map(Math.abs), 1);
  const brightest = diffs.indexOf(Math.max(...diffs)) + (PIXEL_DAYS - diffs.length);

  return (
    <section aria-label={ffText.netCashflow} className={cx(boardCard, 'zenith-tile flex flex-col p-5 sm:p-6')} style={{ animationDelay: '440ms' }}>
      <CardHeader
        title={ffText.netCashflow}
        value={hidden ? MASK : `${net < 0 ? '−' : '+'}${formatMoney(Math.abs(net), currency)}`}
        aside={<ChangeChip value={change} className="mt-1" />}
      />
      <div role="img" aria-label={ffText.dailyChanges} className="mt-6 grid flex-1 grid-cols-7 content-center gap-1.5">
        {cells.map((diff, index) => {
          const strength = diff === undefined ? 0 : Math.abs(diff) / maxAbs;
          const style =
            diff === undefined || diff === 0
              ? undefined
              : diff > 0
                ? { backgroundColor: `color-mix(in srgb, var(--color-fg) ${Math.round(18 + strength * 82)}%, transparent)` }
                : { backgroundColor: `color-mix(in srgb, ${RED} ${Math.round(25 + strength * 75)}%, transparent)` };
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cx('zenith-pixel aspect-square rounded-[4px] bg-fg/[0.05]', index === brightest && 'zenith-twinkle')}
              style={{ ...style, animationDelay: index === brightest ? undefined : `${500 + index * 18}ms` }}
            />
          );
        })}
      </div>
      <p className="mt-4 flex items-center justify-between text-[11px] text-fg-subtle">
        <span>{ffText.dailyChanges}</span>
        <span className="flex items-center gap-1">
          {ffText.less}
          {[10, 35, 65, 100].map((level) => (
            <span key={level} aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: `color-mix(in srgb, var(--color-fg) ${level}%, transparent)` }} />
          ))}
          {ffText.moreActivity}
        </span>
      </p>
    </section>
  );
}
