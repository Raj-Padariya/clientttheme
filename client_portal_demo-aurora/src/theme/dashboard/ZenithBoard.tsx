'use client';

import Link from 'next/link';
import { useId, useMemo, useState, type PointerEvent, type ReactNode } from 'react';
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
const RED = 'var(--zenith-red)';

export const boardCard =
  'relative isolate min-w-0 overflow-hidden rounded-[24px] bg-linear-to-b from-fg/[0.06] to-fg/[0.015] ring-1 ring-fg/[0.08]';

const pillButton =
  'inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Text tab with a lime bar that grows in underneath when active (callers add `after:scale-x-100`). */
const underlineTab =
  "relative h-8 text-xs font-semibold transition-colors after:absolute after:inset-x-0 after:bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-(--aurora-ribbon-a) after:transition-transform after:duration-300 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:after:transition-none";

export function money(value: number | undefined, currency: string, hidden: boolean): string {
  if (value === undefined) return '—';
  return hidden ? MASK : formatMoney(value, currency);
}

export function percentChange(from: number, to: number): number | undefined {
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

export const headerIconButton =
  'grid size-10 place-items-center rounded-full bg-fg/[0.06] text-fg-muted ring-1 ring-fg/10 transition-colors hover:bg-fg/[0.12] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Two periods of each wave across 200 units, so drifting the layer by half its width loops seamlessly. */
function wavePath(line: number): string {
  const base = 4 + line * 9;
  let path = `M0,${base + 12}`;
  for (let x = 5; x <= 200; x += 5) {
    path += ` L${x},${(base + 12 + Math.sin((x / 100) * Math.PI * 2 + line * 0.5) * 10).toFixed(2)}`;
  }
  return path;
}

/** Decorative wave lines drawn inside the lime CTAs and panels across the portal. */
export const WAVE_PATHS = [0, 1, 2, 3, 4, 5].map(wavePath);

/** Wallet first, then each account — ring segments and holding rows share these colours. */
export const HOLDING_COLORS = ['var(--aurora-ribbon-a)', 'var(--aurora-ribbon-c)', 'var(--aurora-ribbon-b)', 'var(--zenith-red)', '#7dd3fc'];

interface Holding {
  key: string;
  label: string;
  caption: string;
  value: number;
  currency: string;
  color: string;
}

function buildHoldings(walletBalance: number | undefined, accounts: TradingAccount[] | undefined, currency: string, hidden: boolean): Holding[] | undefined {
  if (walletBalance === undefined || !accounts) return undefined;
  return [
    { key: 'wallet', label: ffText.wallet, caption: ffText.walletBalance, value: walletBalance, currency, color: HOLDING_COLORS[0] },
    ...accounts.map((account, index) => ({
      key: account.id,
      label: `${account.platform} · ${account.login}`,
      caption: `${ffText.equity} ${money(account.equity, account.currency, hidden)} · 1:${account.leverage}`,
      value: account.balance,
      currency: account.currency,
      color: HOLDING_COLORS[(index + 1) % HOLDING_COLORS.length],
    })),
  ];
}

const RING_R = 44;
const RING_TICKS = Array.from({ length: 60 }, (_, index) => index);
// Two wave periods across 200 units, so drifting the layer by half its width loops seamlessly.
const LIQUID_PATH = 'M0,10 Q25,0 50,10 T100,10 T150,10 T200,10 V40 H0 Z';

export interface RingItem {
  key: string;
  value: number;
  color: string;
}

interface GlassRingProps {
  /** undefined while loading (pulsing placeholder); an empty list draws just the track. */
  items?: RingItem[];
  /** When set, every other segment fades back so this one stands out. */
  activeKey?: string | null;
  label?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Glass ring shared by the dashboard wallet and the accounts page: segments (length = share) sweep in one after
 * another over a breathing glow, a light radar keeps turning over the track, a tick dial counter-rotates outside
 * it, a comet with a fading tail laps the dashed outer orbit, and liquid sloshes at the base of the centre disc.
 */
export function GlassRing({ items, activeKey, label, className, children }: GlassRingProps) {
  const glowId = `ring-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const sum = items?.reduce((acc, item) => acc + Math.max(0, item.value), 0) ?? 0;
  const gap = items && items.length > 1 ? 1.8 : 0;
  const segments = (items ?? []).reduce<(RingItem & { start: number; length: number })[]>((list, item) => {
    const previous = list[list.length - 1];
    const start = previous ? previous.start + previous.length + gap : 0;
    const length = sum > 0 ? Math.max(1.5, (Math.max(0, item.value) / sum) * 100 - gap) : 0;
    return [...list, { ...item, start, length }];
  }, []);

  const renderSegments = (width: number, animated: boolean) =>
    segments.map((segment, index) => (
      <circle
        key={segment.key}
        cx="50"
        cy="50"
        r={RING_R}
        fill="none"
        stroke={segment.color}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${segment.length.toFixed(2)} ${(100 - segment.length).toFixed(2)}`}
        strokeDashoffset={-segment.start}
        className={cx('transition-opacity duration-300', animated && 'aurora-ring-draw')}
        style={{ opacity: activeKey && activeKey !== segment.key ? 0.25 : 1, animationDelay: animated ? `${150 + index * 220}ms` : undefined }}
      />
    ));

  return (
    <div role={label ? 'img' : undefined} aria-label={label} className={cx('relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center', className)}>
      <span aria-hidden="true" className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--aurora-ribbon-c)_20%,transparent),transparent_70%)]" />

      <svg viewBox="0 0 100 100" aria-hidden="true" className="aurora-dial absolute inset-0 size-full">
        {RING_TICKS.map((tick) => (
          <line
            key={tick}
            x1="50"
            y1="3.2"
            x2="50"
            y2={tick % 5 === 0 ? 6.2 : 4.6}
            stroke="var(--color-fg)"
            strokeOpacity={tick % 5 === 0 ? 0.35 : 0.14}
            strokeWidth={tick % 5 === 0 ? 0.6 : 0.4}
            strokeLinecap="round"
            transform={`rotate(${tick * 6} 50 50)`}
          />
        ))}
      </svg>

      <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-fg/20 [animation:orbit-spin_9s_linear_infinite] motion-reduce:[animation:none]">
        <span className="aurora-comet-tail absolute -inset-px rounded-full" />
        <span className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full bg-(--aurora-ribbon-a) shadow-[0_0_14px_2px_var(--aurora-ribbon-a)] ring-4 ring-(--aurora-ribbon-a)/25" />
      </span>

      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-[5%] size-[90%] -rotate-90 overflow-visible">
        <defs>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--color-fg)" strokeOpacity={0.07} strokeWidth={7} />
        {items === undefined ? (
          <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--color-fg)" strokeOpacity={0.14} strokeWidth={7} pathLength={100} strokeDasharray="20 80" className="animate-pulse" />
        ) : (
          <>
            <g filter={`url(#${glowId})`} className="aurora-ring-glow">
              {renderSegments(9, false)}
            </g>
            {renderSegments(7, true)}
          </>
        )}
        <circle cx="50" cy="50" r={RING_R} fill="none" stroke="white" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" pathLength={100} strokeDasharray="7 93" className="aurora-streak" />
        <circle cx="50" cy="50" r={RING_R + 4.2} fill="none" stroke="white" strokeOpacity={0.22} strokeWidth={0.4} />
        <circle cx="50" cy="50" r={RING_R - 4.2} fill="none" stroke="white" strokeOpacity={0.14} strokeWidth={0.4} />
      </svg>

      <span aria-hidden="true" className="aurora-radar absolute inset-0 rounded-full" />
      <span aria-hidden="true" className="absolute inset-[17%] animate-ping-soft rounded-full border border-(--aurora-ribbon-a)/40 [animation-duration:2.8s] motion-reduce:hidden" />

      <div className="aurora-chip absolute inset-[17%] grid place-items-center overflow-hidden rounded-full px-3 text-center">
        <span aria-hidden="true" className="aurora-liquid-rise pointer-events-none absolute inset-x-0 bottom-0 h-[36%]">
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="aurora-liquid-alt absolute bottom-0 left-0 h-full w-[200%]">
            <path d={LIQUID_PATH} fill="var(--aurora-ribbon-c)" fillOpacity={0.16} />
          </svg>
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="aurora-liquid absolute bottom-0 left-0 h-[85%] w-[200%]">
            <path d={LIQUID_PATH} fill="var(--aurora-ribbon-a)" fillOpacity={0.22} />
          </svg>
        </span>
        <span aria-hidden="true" className="aurora-disc-sheen pointer-events-none absolute -inset-1/2" />
        <div className="relative min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Dashboard wallet ring: wallet + each account as segments, the total in the disc. */
function BalanceRing({ holdings, total, currency, hidden, change }: { holdings?: Holding[]; total?: number; currency: string; hidden: boolean; change?: number }) {
  return (
    <GlassRing items={holdings}>
      <p className="font-display text-sm font-semibold text-fg-muted">{ffText.myWallet}</p>
      <p className="mt-1.5 text-[24px] leading-none font-semibold tracking-[-0.03em] text-fg tabular-nums sm:text-[28px]">
        {hidden ? <span className="tracking-[0.1em]">{MASK}</span> : <CountUpMoney value={total} currency={currency} />}
      </p>
      {change !== undefined && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-fg/[0.06] px-2.5 py-1 text-[11px] text-fg-subtle">
          <ChangeChip value={change} />
          30d
        </p>
      )}
    </GlassRing>
  );
}

/** One holding: colour dot, name + caption, amount, and a thin share track that fills in on load. */
function HoldingRow({ holding, total, hidden, index }: { holding: Holding; total?: number; hidden: boolean; index: number }) {
  const share = total ? Math.max(0, Math.min(100, (holding.value / total) * 100)) : 0;
  return (
    <li className="flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors hover:bg-fg/[0.04]">
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: holding.color, boxShadow: `0 0 0 4px color-mix(in srgb, ${holding.color} 20%, transparent)` }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-fg">{holding.label}</p>
          <p className="shrink-0 text-sm font-semibold text-fg tabular-nums">{money(holding.value, holding.currency, hidden)}</p>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-fg/[0.08]">
            <span className="aurora-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${share}%`, background: holding.color, animationDelay: `${200 + index * 120}ms` }} />
          </span>
          <span className="w-11 shrink-0 text-right text-[11px] text-fg-subtle tabular-nums">{share.toFixed(1)}%</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{holding.caption}</p>
      </div>
    </li>
  );
}

/** Wallet on top, then the trading accounts as a dashed tree under their subtotal. */
function HoldingsTree({ holdings, accountsBalance, total, currency, hidden }: { holdings?: Holding[]; accountsBalance?: number; total?: number; currency: string; hidden: boolean }) {
  if (!holdings) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} className="block h-14 animate-pulse rounded-2xl bg-fg/[0.06]" />
        ))}
      </div>
    );
  }
  const [wallet, ...accounts] = holdings;
  return (
    <div>
      <ul>
        <HoldingRow holding={wallet} total={total} hidden={hidden} index={0} />
      </ul>
      <p className="mt-3 flex items-baseline justify-between gap-3 px-2.5 text-[11px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
        <span className="truncate">{ffText.tradingAccounts}</span>
        <span className="shrink-0 text-xs tracking-normal text-(--hero-buy) normal-case tabular-nums">{money(accountsBalance, currency, hidden)}</span>
      </p>
      <ul className="mt-1 ml-3.5 border-l border-dashed border-fg/20 pl-2">
        {accounts.map((holding, index) => (
          <HoldingRow key={holding.key} holding={holding} total={total} hidden={hidden} index={index + 1} />
        ))}
      </ul>
    </div>
  );
}

/** This month as a thin track: filled up to today with a pulsing bead, "day / days" at the end. */
function MonthTrack() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const progress = (now.getDate() / daysInMonth) * 100;

  return (
    <div aria-hidden="true" className="flex items-center gap-3 px-2.5 text-[11px] text-fg-subtle tabular-nums">
      <span>{now.toLocaleDateString(undefined, { month: 'short' })}</span>
      <div className="relative h-1.5 flex-1 rounded-full bg-fg/[0.07]">
        <span className="aurora-pill absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%` }} />
        <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2" style={{ left: `${progress}%` }}>
          <span className="absolute inset-0 animate-ping rounded-full bg-(--aurora-ribbon-a) motion-reduce:hidden" />
          <span className="absolute inset-0 rounded-full bg-white ring-2 ring-(--aurora-ribbon-a)" />
        </span>
      </div>
      <span>
        {now.getDate()}/{daysInMonth}
      </span>
    </div>
  );
}

const actionTile =
  'group flex min-h-[92px] flex-col justify-between gap-3 rounded-[22px] p-3.5 text-sm font-semibold transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

export function ActionTile({ href, icon, label, title, primary }: { href: string; icon: IconName; label: string; title?: string; primary?: boolean }) {
  return (
    <Link href={href} title={title} className={cx(actionTile, primary ? 'aurora-cta' : 'aurora-chip text-fg')}>
      <span className="flex items-center justify-between">
        <span className={cx('grid size-10 place-items-center rounded-full', primary ? 'bg-[#13201a] text-[#9fc4ae]' : 'bg-fg/[0.08] ring-1 ring-fg/10')}>
          <Icon name={icon} size={17} className={cx(icon === 'transfer' && 'transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none')} />
        </span>
        <Icon name="arrowUpRight" size={14} className="opacity-50 transition-transform duration-300 group-hover:rotate-45 motion-reduce:transition-none" />
      </span>
      {label}
    </Link>
  );
}

/**
 * Aurora wallet panel: greeting bar on top, then three columns — the balance ring (total inside, holdings as
 * segments), the holdings tree with share tracks and the month track, and the money actions as glass tiles.
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
  const holdings = buildHoldings(walletBalance, accounts, currency, hidden);

  return (
    <section aria-label={ffText.totalBalance} className="aurora-banner zenith-tile relative isolate overflow-hidden rounded-[30px]">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="aurora-drift absolute -top-32 -left-24 size-96 rounded-full bg-(--aurora-ribbon-c) opacity-[0.12] blur-[90px]" />
        <span className="aurora-drift-alt absolute -right-24 -bottom-32 size-96 rounded-full bg-(--aurora-ribbon-b) opacity-[0.14] blur-[90px]" />
        <span className="absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent" />
      </span>

      <div className="flex items-center justify-between gap-3 border-b border-fg/[0.07] px-5 py-3.5 sm:px-7">
        <p className="truncate text-sm text-fg-muted">
          {ffText.greeting} <span className="font-semibold text-fg">{firstName}</span>, {ffText.welcome.toLowerCase()}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/accounts"
            className="aurora-chip inline-flex h-10 items-center gap-1.5 rounded-full pr-1.5 pl-4 text-xs font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {ffText.view}
            <span className="grid size-7 place-items-center rounded-full bg-fg/[0.08]">
              <Icon name="arrowUpRight" size={12} />
            </span>
          </Link>
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

      <div className="grid items-center gap-6 p-5 sm:p-7 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_180px] xl:gap-8">
        <BalanceRing holdings={holdings} total={total} currency={currency} hidden={hidden} change={change} />

        <div className="min-w-0 space-y-4">
          <HoldingsTree holdings={holdings} accountsBalance={accountsBalance} total={total} currency={currency} hidden={hidden} />
          <MonthTrack />
        </div>

        <div className="grid grid-cols-3 gap-2.5 md:col-span-2 xl:col-span-1 xl:grid-cols-1">
          <ActionTile href="/deposit" icon="plus" label={ffText.addFunds} primary />
          <ActionTile href="/withdrawal" icon="arrowUpRight" label={ffText.withdraw} />
          <ActionTile href="/transfer" icon="transfer" label={ffText.transfer} title={ffText.swap} />
        </div>
      </div>
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
  /** This holding's share of the total balance, drawn as a ring; omitted while the total is unknown. */
  share?: number;
  color: string;
  index: number;
}

const SHARE_RING_R = 15;
const SHARE_RING_C = 2 * Math.PI * SHARE_RING_R;

function ShareRing({ share, color }: { share: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, share));
  return (
    <span className="relative grid size-10 shrink-0 place-items-center" title={`${clamped.toFixed(1)}% ${ffText.shareOfTotal}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r={SHARE_RING_R} fill="none" stroke="currentColor" strokeWidth={3} className="text-fg/[0.08]" />
        <circle
          cx="20"
          cy="20"
          r={SHARE_RING_R}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * SHARE_RING_C} ${SHARE_RING_C}`}
        />
      </svg>
      <span className="text-[9px] font-bold text-fg tabular-nums">{Math.round(clamped)}%</span>
    </span>
  );
}

/** One holding as a row: colour bar on the left, name + caption, balance + change, and its share-of-total ring. */
function AccountTile({ icon, label, value, change, caption, share, color, index }: TileProps) {
  return (
    <li
      className="zenith-tile relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-fg/[0.03] py-3 pr-3 pl-4 ring-1 ring-fg/[0.07] transition-colors hover:bg-fg/[0.06]"
      style={{ animationDelay: `${120 + index * 90}ms` }}
    >
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ backgroundColor: color }} />
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-fg/[0.06]" style={{ color }}>
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-fg-subtle">{caption}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-bold text-fg tabular-nums">{value}</span>
        <ChangeChip value={change} />
      </span>
      {share !== undefined && <ShareRing share={share} color={color} />}
    </li>
  );
}

interface AccountTilesProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  total?: number;
  currency: string;
  hidden: boolean;
}

/** Wallet + every live account as a vertical holdings list in one panel, ending in an "open another account" row. */
export function AccountTiles({ accounts, walletBalance, total, currency, hidden }: AccountTilesProps) {
  const shareOf = (value: number | undefined) => (total && value !== undefined ? (value / total) * 100 : undefined);
  const walletShare = shareOf(walletBalance);

  return (
    <section aria-labelledby="aurora-accounts-title" className={cx(boardCard, 'zenith-tile flex flex-col gap-4 p-5 sm:p-6')} style={{ animationDelay: '120ms' }}>
      <div className="flex items-center justify-between gap-3">
        <h3 id="aurora-accounts-title" className="text-[15px] font-semibold text-fg">
          {ffText.accountsTitle}
        </h3>
        <span className="text-xs text-fg-subtle tabular-nums">{accounts ? accounts.length + 1 : '—'}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {!accounts ? (
          Array.from({ length: 3 }, (_, index) => <li key={index} className="h-[66px] animate-pulse rounded-2xl bg-fg/[0.05]" />)
        ) : (
          <>
            <AccountTile
              index={0}
              icon="wallet"
              label={ffText.wallet}
              value={money(walletBalance, currency, hidden)}
              caption={walletShare === undefined ? ffText.walletBalance : `${walletShare.toFixed(1)}% ${ffText.shareOfTotal}`}
              share={walletShare}
              color={HOLDING_COLORS[0]}
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
                share={shareOf(account.balance)}
                color={HOLDING_COLORS[(index + 1) % HOLDING_COLORS.length]}
              />
            ))}
          </>
        )}
      </ul>
      <Link
        href="/accounts"
        className="group mt-auto flex items-center gap-3 rounded-2xl border border-dashed border-fg/15 p-3 text-xs text-fg-subtle transition-colors hover:border-(--aurora-ribbon-a)/50 hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="aurora-pill grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none">
          <Icon name="plus" size={16} />
        </span>
        <span className="leading-snug">
          {ffText.addAccountTitle} <span className="font-semibold text-fg">{ffText.openAccount.toLowerCase()}</span> — {ffText.addAccountText}
        </span>
      </Link>
    </section>
  );
}

/* ───────────── Balance area chart ───────────── */

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
 * Daily balance as a lime area: a sharp day-by-day line over a gradient fading into the card, with the 7-day average
 * as a dashed guide. The pointer or a date tick picks a day; a floating card above the point shows its values.
 */
export function BalanceWaveChart({ series, currency, hidden }: BalanceWaveChartProps) {
  const [range, setRange] = useState<ChartRange>(21);
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();

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
  const linePath = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const avgPath = smoothPath(averages.map((value, index) => [toX(index), toY(value)]));
  const markerLeft = (toX(active) / CHART_W) * 100;
  const markerTop = (toY(values[active]) / CHART_H) * 100;
  // Near the top edge the value card would cover the header, so it drops below the point instead.
  const cardBelow = markerTop < 40;
  // Near either side the card hangs off the point towards the middle, so it never leaves a narrow chart.
  const cardAlign = markerLeft > 66 ? '-translate-x-full' : markerLeft < 34 ? 'translate-x-0' : '-translate-x-1/2';
  const activeDate = dayDate(count - 1 - active);
  const dateLabel = activeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // Every day stays a clickable tick; only every Nth one (counted back from today) carries its date number.
  const labelEvery = count > 21 ? 5 : count > 7 ? 3 : 1;

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
          <div role="group" aria-label={ffText.balanceMovement} className="flex shrink-0 gap-3">
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={range === option}
                onClick={() => {
                  setRange(option);
                  setPicked(null);
                }}
                className={cx(underlineTab, range === option ? 'text-fg after:scale-x-100' : 'text-fg-subtle hover:text-fg-muted')}
              >
                {option}D
              </button>
            ))}
          </div>
        }
      />

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-4 rounded-[3px] bg-linear-to-b from-(--aurora-ribbon-a)/70 to-(--aurora-ribbon-a)/10" />
          {ffText.dailyBalanceLine}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="w-4 border-t-[1.5px] border-dashed border-fg/50" />
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
        {[25, 50, 75].map((line) => (
          <span key={line} aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-fg/[0.07]" style={{ top: `${line}%` }} />
        ))}
        <svg key={range} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true" className="zenith-reveal absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--aurora-ribbon-a)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--aurora-ribbon-a)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={avgPath} fill="none" stroke="var(--color-fg)" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          <path d={linePath} fill="none" stroke="var(--aurora-ribbon-a)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        <span aria-hidden="true" className="absolute inset-y-0 w-px -translate-x-1/2 bg-fg/25 transition-[left] duration-200 motion-reduce:transition-none" style={{ left: `${markerLeft}%` }} />
        <span
          aria-hidden="true"
          className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--aurora-ribbon-a) ring-4 ring-app transition-[left,top] duration-200 motion-reduce:transition-none"
          style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
        />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute z-10 rounded-2xl bg-fg px-4 py-2.5 text-center whitespace-nowrap text-app shadow-[0_16px_32px_-16px_rgb(0_0_0/0.8)] transition-[left,top] duration-200 motion-reduce:transition-none',
            cardAlign,
            cardBelow ? 'translate-y-[18px]' : '-translate-y-[calc(100%+18px)]',
          )}
          style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
        >
          <span className="block text-lg leading-tight font-bold tabular-nums">{money(values[active], currency, hidden)}</span>
          <span className="block text-[11px] opacity-60">{dateLabel}</span>
          <span className="mt-1 block text-[11px] tabular-nums opacity-80">
            {ffText.weekAverage}: {money(averages[active], currency, hidden)}
          </span>
        </span>
      </div>

      <div role="group" aria-label={ffText.selectDay} className="mt-4 flex border-t border-fg/[0.08]">
        {values.map((_, index) => {
          const date = dayDate(count - 1 - index);
          const isActive = index === active;
          const hasLabel = (count - 1 - index) % labelEvery === 0;
          return (
            <button
              key={index}
              type="button"
              aria-pressed={isActive}
              aria-label={`${ffText.selectDay} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              onClick={() => setPicked(index)}
              className="group/tick relative flex h-9 min-w-0 flex-1 flex-col items-center justify-start gap-1.5 pt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className={cx('w-px transition-[height,background-color]', isActive ? 'h-2.5 bg-(--aurora-ribbon-a)' : 'h-1.5 bg-fg/20 group-hover/tick:bg-fg/50')} />
              {(hasLabel || isActive) && (
                <span className={cx('text-[11px] leading-none tabular-nums', isActive ? 'font-semibold text-fg' : 'text-fg-subtle group-hover/tick:text-fg-muted')}>
                  {date.getDate()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Money flow waves ───────────── */

type FlowKind = 'deposits' | 'withdrawals';
type FlowPeriod = 'month' | 'year';

interface FlowTracksProps {
  monthly?: FundsFlowPeriod[];
  yearly?: FundsFlowPeriod[];
  currency: string;
  hidden: boolean;
}

const WAVE_W = 420;
const WAVE_H = 220;

/**
 * Money in and money out as two interwoven curves across the last seven months (or years): the picked side is a bold
 * lime curve, the other a thin grey one. The hovered (or latest) period drops a stem with its value in a dark pill.
 */
export function FlowTracks({ monthly, yearly, currency, hidden }: FlowTracksProps) {
  const [kind, setKind] = useState<FlowKind>('deposits');
  const [period, setPeriod] = useState<FlowPeriod>('month');
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();
  const source = (period === 'month' ? monthly : yearly)?.slice(-7);

  if (!source || source.length === 0) {
    return <section aria-busy="true" className={cx(boardCard, 'h-[420px] animate-pulse')} />;
  }

  const otherKind: FlowKind = kind === 'deposits' ? 'withdrawals' : 'deposits';
  const values = source.map((flow) => flow[kind]);
  const others = source.map((flow) => flow[otherKind]);
  const max = Math.max(...values, ...others, 1);
  const last = values.length - 1;
  const active = hovered ?? last;
  const change = values.length > 1 ? percentChange(values[last - 1], values[last]) : undefined;
  const label = (flow: FundsFlowPeriod) =>
    new Date(flow.start).toLocaleDateString('en-US', period === 'month' ? { month: 'short' } : { year: 'numeric' });

  const toX = (index: number) => ((index + 0.5) / values.length) * WAVE_W;
  const toY = (value: number) => WAVE_H - 20 - (value / max) * (WAVE_H - 60);
  // The curves run edge to edge: the first and last values are carried out to the card sides.
  const curve = (series: number[]) => {
    const points: [number, number][] = [[0, toY(series[0])], ...series.map((value, index): [number, number] => [toX(index), toY(value)]), [WAVE_W, toY(series[last])]];
    return smoothPath(points);
  };
  const markerLeft = (toX(active) / WAVE_W) * 100;
  const markerTop = (toY(values[active]) / WAVE_H) * 100;
  const pillOnLeft = markerLeft > 40;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * values.length);
    setHovered(Math.min(last, Math.max(0, index)));
  };

  return (
    <section aria-label={ffText.moneyFlow} className={cx(boardCard, 'zenith-tile flex flex-col p-5 sm:p-6')} style={{ animationDelay: '280ms' }}>
      <CardHeader
        title={`${ffText.moneyFlow} · ${kind === 'deposits' ? ffText.deposits : ffText.expenses}`}
        value={money(values[active], currency, hidden)}
        aside={
          <div className="flex shrink-0 gap-3">
            {(['month', 'year'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => {
                  setPeriod(option);
                  setHovered(null);
                }}
                className={cx(underlineTab, period === option ? 'text-fg after:scale-x-100' : 'text-fg-subtle hover:text-fg-muted')}
              >
                {option === 'month' ? ffText.months : ffText.years}
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-fg-subtle">
          <ChangeChip value={change} /> {ffText.vsLastPeriod}
        </span>
        <div className="flex gap-1">
          {(['deposits', 'withdrawals'] as const).map((option) => {
            const isPicked = kind === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isPicked}
                onClick={() => setKind(option)}
                className={cx(pillButton, 'h-7 gap-1.5 px-2.5', isPicked ? 'bg-fg/[0.07] text-fg' : 'text-fg-subtle hover:text-fg-muted')}
              >
                <span aria-hidden="true" className={cx('w-3.5 rounded-full', isPicked ? 'h-[3px] bg-(--aurora-ribbon-a)' : 'h-px bg-fg/40')} />
                {option === 'deposits' ? ffText.moneyIn : ffText.moneyOut}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col" onPointerMove={handlePointerMove} onPointerLeave={() => setHovered(null)}>
        <div
          role="img"
          aria-label={`${ffText.moneyFlow}, ${label(source[active])}: ${money(values[active], currency, hidden)}`}
          className="relative min-h-[200px] flex-1 touch-pan-y"
        >
          <svg
            key={`${period}-${kind}`}
            viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="zenith-reveal absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--aurora-ribbon-c)" />
                <stop offset="100%" stopColor="var(--aurora-ribbon-a)" />
              </linearGradient>
            </defs>
            <path d={curve(others)} fill="none" stroke="var(--color-fg)" strokeOpacity={0.3} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <path d={curve(values)} fill="none" stroke={`url(#${gradientId})`} strokeWidth={2.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          <span
            aria-hidden="true"
            className="absolute bottom-0 w-px -translate-x-1/2 bg-fg/60 transition-[left,top] duration-300 motion-reduce:transition-none"
            style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--aurora-ribbon-a) ring-[3px] ring-app transition-[left,top] duration-300 motion-reduce:transition-none"
            style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
          />
          <span
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute z-10 -translate-y-[calc(100%+6px)] rounded-full bg-[#03140f] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white tabular-nums shadow-[0_10px_24px_-12px_rgb(0_0_0/0.8)] ring-1 ring-white/10 transition-[left,top] duration-300 motion-reduce:transition-none',
              pillOnLeft ? '-translate-x-[calc(100%+10px)]' : 'translate-x-[10px]',
            )}
            style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
          >
            {money(values[active], currency, hidden)}
          </span>
        </div>

        <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${source.length}, minmax(0, 1fr))` }}>
          {source.map((flow, index) => (
            <span
              key={flow.start}
              className={cx('truncate text-center text-xs tabular-nums transition-colors', index === active ? 'font-semibold text-fg' : 'text-fg-subtle')}
            >
              {label(flow)}
            </span>
          ))}
        </div>
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
