'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import type { FundsFlowPeriod, TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUpMoney, ffText } from './finflowParts';
import { boardCard, ChangeChip, HOLDING_COLORS, MASK, money, percentChange, smoothPath } from './ZenithBoard';
import { WaveButton } from './ZenithDesk';

/*
 * Aurora dashboard deck: total assets as a treemap, net cashflow as a diverging day strip, trading power as a capacity
 * track, transfer as a vertical route ticket and the monthly goal as a milestone track. Same data and actions as the
 * Zenith cards they replace.
 */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const deckCard = cx(boardCard, 'zenith-tile flex flex-col gap-5 p-5 sm:p-6');

function DeckSkeleton({ height = 'h-[360px]' }: { height?: string }) {
  return <section aria-busy="true" className={cx(boardCard, height, 'animate-pulse')} />;
}

interface DeckTitleProps {
  icon: IconName;
  title: string;
  titleId?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

/** Lime square badge + title, with an optional subtitle line and a trailing action. */
function DeckTitle({ icon, title, titleId, subtitle, action }: DeckTitleProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="aurora-pill grid size-9 shrink-0 place-items-center rounded-xl">
          <Icon name={icon} size={16} />
        </span>
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-[15px] font-semibold text-fg">
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
        'grid size-9 shrink-0 place-items-center rounded-xl bg-fg/[0.05] text-fg-muted transition-colors hover:bg-fg/[0.1] hover:text-fg',
        focusRing,
      )}
    >
      <Icon name={icon} size={15} />
    </Link>
  );
}

function signedMoney(value: number, currency: string, hidden: boolean): string {
  if (hidden) return MASK;
  return `${value < 0 ? '−' : '+'}${formatMoney(Math.abs(value), currency)}`;
}

/* ───────────── Total assets treemap ───────────── */

interface AssetNode {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface TreeCell {
  node: AssetNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Binary treemap: split the nodes where the two halves' weights are closest, cut the longer side of the box in that
 * ratio, recurse. With a handful of holdings this reads as cleanly as a squarified layout.
 */
function layoutTree(nodes: AssetNode[], weights: Map<string, number>, box: Omit<TreeCell, 'node'>, out: TreeCell[]) {
  if (nodes.length === 0) return;
  if (nodes.length === 1) {
    out.push({ node: nodes[0], ...box });
    return;
  }
  const weightOf = (node: AssetNode) => weights.get(node.key) ?? 0;
  const total = nodes.reduce((sum, node) => sum + weightOf(node), 0);
  let split = 1;
  let bestGap = Infinity;
  let running = 0;
  for (let index = 1; index < nodes.length; index++) {
    running += weightOf(nodes[index - 1]);
    const gap = Math.abs(running - total / 2);
    if (gap < bestGap) {
      bestGap = gap;
      split = index;
    }
  }
  const firstWeight = nodes.slice(0, split).reduce((sum, node) => sum + weightOf(node), 0);
  const ratio = total ? firstWeight / total : 0.5;
  const first = nodes.slice(0, split);
  const second = nodes.slice(split);
  if (box.w >= box.h) {
    layoutTree(first, weights, { ...box, w: box.w * ratio }, out);
    layoutTree(second, weights, { ...box, x: box.x + box.w * ratio, w: box.w * (1 - ratio) }, out);
  } else {
    layoutTree(first, weights, { ...box, h: box.h * ratio }, out);
    layoutTree(second, weights, { ...box, y: box.y + box.h * ratio, h: box.h * (1 - ratio) }, out);
  }
}

interface AssetTreemapProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  total?: number;
  currency: string;
  hidden: boolean;
}

/** Wallet and every account as treemap blocks sized by balance, each tinted with its holding colour. */
export function AssetTreemap({ accounts, walletBalance, total, currency, hidden }: AssetTreemapProps) {
  if (!accounts || walletBalance === undefined || total === undefined) return <DeckSkeleton />;

  const nodes: AssetNode[] = [
    { key: 'wallet', label: ffText.wallet, value: walletBalance, color: HOLDING_COLORS[0] },
    ...accounts.map((account, index) => ({
      key: account.id,
      label: `#${account.login}`,
      value: account.balance,
      color: HOLDING_COLORS[(index + 1) % HOLDING_COLORS.length],
    })),
  ].sort((a, b) => b.value - a.value);

  const positiveSum = nodes.reduce((sum, node) => sum + Math.max(0, node.value), 0);
  // A floor keeps empty or tiny holdings visible as a slim block instead of vanishing.
  const floor = (positiveSum || 1) * 0.06;
  const weights = new Map(nodes.map((node) => [node.key, Math.max(node.value, floor)]));
  const cells: TreeCell[] = [];
  layoutTree(nodes, weights, { x: 0, y: 0, w: 100, h: 100 }, cells);

  return (
    <section aria-labelledby="aurora-assets-title" className={deckCard} style={{ animationDelay: '360ms' }}>
      <DeckTitle icon="wallet" title={ffText.totalAssets} titleId="aurora-assets-title" />
      <p className="-mt-2 text-[28px] leading-none font-bold tracking-[-0.02em] text-fg tabular-nums">{money(total, currency, hidden)}</p>

      <ul className="relative h-[240px] min-h-[200px] flex-1">
        {cells.map((cell, index) => {
          const share = positiveSum ? (Math.max(0, cell.node.value) / positiveSum) * 100 : 0;
          const isRoomy = cell.w > 26 && cell.h > 34;
          return (
            <li
              key={cell.node.key}
              className="absolute p-[3px]"
              style={{ left: `${cell.x}%`, top: `${cell.y}%`, width: `${cell.w}%`, height: `${cell.h}%` }}
            >
              <div
                title={`${cell.node.label} · ${money(cell.node.value, currency, hidden)} · ${share.toFixed(1)}%`}
                className="zenith-tile flex size-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-3 transition-[filter] duration-300 hover:brightness-125"
                style={{
                  animationDelay: `${420 + index * 90}ms`,
                  backgroundColor: `color-mix(in oklab, ${cell.node.color} ${index === 0 ? 30 : 18}%, transparent)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${cell.node.color} 40%, transparent)`,
                }}
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cell.node.color }} />
                  <span className="truncate">{cell.node.label}</span>
                </span>
                {isRoomy && (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-fg tabular-nums">{money(cell.node.value, currency, hidden)}</span>
                    <span className="block text-[11px] text-fg-subtle tabular-nums">{share.toFixed(1)}%</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="flex items-center justify-between gap-3 border-t border-fg/[0.08] pt-3 text-xs">
        <span className="text-fg-muted">{ffText.totalBalance}</span>
        <span className="font-semibold text-fg tabular-nums">{money(total, currency, hidden)}</span>
      </p>
    </section>
  );
}

/* ───────────── Net cashflow day strip ───────────── */

const STRIP_DAYS = 42;

interface CashflowStripProps {
  monthly?: FundsFlowPeriod[];
  series?: number[];
  currency: string;
  hidden: boolean;
}

/**
 * This month's net flow over a diverging strip of the last 42 days: up days rise from the centre line in lime, down
 * days hang below it in pink; bar length and strength both scale with the size of the move.
 */
export function CashflowStrip({ monthly, series, currency, hidden }: CashflowStripProps) {
  if (!monthly || monthly.length === 0 || !series || series.length < 2) return <DeckSkeleton />;

  const current = monthly[monthly.length - 1];
  const previous = monthly[monthly.length - 2];
  const net = current.deposits - current.withdrawals;
  const change = previous ? percentChange(previous.deposits - previous.withdrawals, net) : undefined;
  const recent = series.slice(-(STRIP_DAYS + 1));
  const diffs = recent.slice(1).map((value, index) => value - recent[index]);
  const cells = Array.from({ length: STRIP_DAYS }, (_, index) => diffs[index - (STRIP_DAYS - diffs.length)]);
  const maxAbs = Math.max(...diffs.map(Math.abs), 1);
  const biggest = diffs.indexOf(Math.max(...diffs)) + (STRIP_DAYS - diffs.length);

  return (
    <section aria-labelledby="aurora-cashflow-title" className={deckCard} style={{ animationDelay: '440ms' }}>
      <DeckTitle icon="trendUp" title={ffText.netCashflow} titleId="aurora-cashflow-title" action={<ChangeChip value={change} className="mt-1" />} />
      <p className="-mt-2 text-[28px] leading-none font-bold tracking-[-0.02em] text-fg tabular-nums">{signedMoney(net, currency, hidden)}</p>

      <div role="img" aria-label={ffText.dailyChanges} className="relative flex min-h-[200px] flex-1 items-stretch gap-[3px]">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-fg/15" />
        {cells.map((diff, index) => {
          const strength = diff === undefined ? 0 : Math.abs(diff) / maxAbs;
          const isUp = diff !== undefined && diff > 0;
          const isFlat = diff === undefined || diff === 0;
          return (
            <span
              key={index}
              title={diff === undefined ? undefined : signedMoney(diff, currency, hidden)}
              className={cx('relative min-w-0 flex-1', index % 7 === 0 && index > 0 && 'ml-1.5')}
            >
              {isFlat ? (
                <span aria-hidden="true" className="absolute top-1/2 left-1/2 size-1 -translate-1/2 rounded-full bg-fg/25" />
              ) : (
                <span
                  aria-hidden="true"
                  className={cx('zenith-pixel absolute inset-x-0 rounded-full', isUp ? 'bottom-1/2 bg-(--aurora-ribbon-a)' : 'top-1/2 bg-(--zenith-red)')}
                  style={{ height: `${Math.max(4, strength * 48)}%`, opacity: 0.35 + strength * 0.65, animationDelay: `${500 + index * 18}ms` }}
                />
              )}
              {index === biggest && isUp && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 size-2 -translate-x-1/2 animate-ping rounded-full bg-(--aurora-ribbon-a) motion-reduce:animate-none"
                  style={{ bottom: `calc(50% + ${Math.max(4, strength * 48)}% + 4px)` }}
                />
              )}
            </span>
          );
        })}
      </div>

      <p className="flex items-center justify-between gap-3 text-[11px] text-fg-subtle">
        <span>{ffText.dailyChanges}</span>
        <span className="flex items-center gap-1">
          {ffText.less}
          {[0.35, 0.55, 0.8, 1].map((level) => (
            <span key={level} aria-hidden="true" className="h-2.5 w-1.5 rounded-full bg-(--aurora-ribbon-a)" style={{ opacity: level }} />
          ))}
          {ffText.moreActivity}
        </span>
      </p>
    </section>
  );
}

/* ───────────── Trading power capacity track ───────────── */

interface PowerTrackProps {
  accounts?: TradingAccount[];
  balanceHistory?: number[];
  currency: string;
  hidden: boolean;
}

/** Equity on top of one long capacity track split into free (lime) and used (pink) margin, with a 30-day balance line. */
export function PowerTrack({ accounts, balanceHistory, currency, hidden }: PowerTrackProps) {
  if (!accounts) return <DeckSkeleton height="h-[440px]" />;

  const sum = (pickValue: (account: TradingAccount) => number) => accounts.reduce((total, account) => total + pickValue(account), 0);
  const freeMargin = sum((account) => account.freeMargin);
  const equity = sum((account) => account.equity);
  const balance = sum((account) => account.balance);
  const usedMargin = Math.max(equity - freeMargin, 0);
  const floating = equity - balance;
  const freeShare = equity ? Math.min(Math.max(freeMargin / equity, 0), 1) : 0;
  const usedShare = equity ? Math.min(usedMargin / equity, 1 - freeShare) : 0;

  const history = balanceHistory?.slice(-30) ?? [];
  const low = Math.min(...history);
  const high = Math.max(...history);
  const linePoints = history.map((value, index): [number, number] => [
    (index / Math.max(history.length - 1, 1)) * 300,
    44 - ((value - low) / (high - low || 1)) * 40,
  ]);
  const line = smoothPath(linePoints);

  return (
    <section aria-labelledby="aurora-power-title" className={deckCard} style={{ animationDelay: '280ms' }}>
      <DeckTitle
        icon="accounts"
        title={ffText.tradingPower}
        titleId="aurora-power-title"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-(--aurora-ribbon-a)" />
            {accounts.length} {ffText.liveAccounts}
          </span>
        }
        action={<CornerLink href="/accounts" label={ffText.tradingAccounts} icon="chevronRight" />}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">{ffText.equity}</p>
          <p className="mt-1 truncate text-[30px] leading-none font-bold tracking-[-0.02em] text-fg tabular-nums">{money(equity, currency, hidden)}</p>
        </div>
        <p className={cx('text-xs font-semibold tabular-nums', floating >= 0 ? 'text-success' : 'text-(--zenith-red)')}>
          {signedMoney(floating, currency, hidden)} {ffText.floatingShort}
        </p>
      </div>

      <div>
        <div
          role="img"
          aria-label={`${ffText.freeMargin} ${Math.round(freeShare * 100)}%, ${ffText.usedMargin} ${Math.round(usedShare * 100)}%`}
          className="relative flex h-4 overflow-hidden rounded-full bg-fg/[0.07]"
        >
          <span className="aurora-fill h-full bg-linear-to-r from-(--aurora-ribbon-c) to-(--aurora-ribbon-a)" style={{ width: `${freeShare * 100}%` }} />
          <span className="aurora-fill h-full bg-(--zenith-red)" style={{ width: `${usedShare * 100}%`, animationDelay: '200ms' }} />
        </div>
        <div aria-hidden="true" className="mt-1.5 flex justify-between text-[10px] text-fg-subtle tabular-nums">
          {[0, 25, 50, 75, 100].map((mark) => (
            <span key={mark}>{mark}%</span>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-fg/[0.08] rounded-2xl bg-fg/[0.03] py-3">
        <div className="min-w-0 px-4">
          <dt className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-(--aurora-ribbon-a)" />
            {ffText.freeMargin}
          </dt>
          <dd className="mt-1 truncate text-base font-bold text-fg tabular-nums">
            {hidden ? MASK : <CountUpMoney value={freeMargin} currency={currency} centsClassName="text-fg-subtle" />}
          </dd>
          <dd className="text-[11px] text-fg-subtle">
            {Math.round(freeShare * 100)}% {ffText.available}
          </dd>
        </div>
        <div className="min-w-0 px-4">
          <dt className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-(--zenith-red)" />
            {ffText.usedMargin}
          </dt>
          <dd className="mt-1 truncate text-base font-bold text-fg tabular-nums">{money(usedMargin, currency, hidden)}</dd>
          <dd className="text-[11px] text-fg-subtle">
            {Math.round(usedShare * 100)}% {ffText.ofEquity}
          </dd>
        </div>
      </dl>

      {history.length > 1 && (
        <div>
          <p className="text-[10px] text-fg-subtle">{ffText.dailyBalance}</p>
          <svg viewBox="0 0 300 48" preserveAspectRatio="none" role="img" aria-label={ffText.dailyBalance} className="mt-1 h-10 w-full overflow-visible">
            <path d={line} fill="none" stroke="var(--aurora-ribbon-a)" strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2">
        <WaveButton href="/platforms" icon="trendUp" label={ffText.tradeNow} className="h-11 text-xs" />
        <Link
          href="/accounts/new"
          className={cx('flex h-11 items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-fg ring-1 ring-fg/15 transition-colors hover:bg-fg/[0.06]', focusRing)}
        >
          <Icon name="plus" size={14} />
          {ffText.openAccount}
        </Link>
      </div>
    </section>
  );
}

/* ───────────── Transfer route ticket ───────────── */

interface RouteStopProps {
  role: string;
  icon: IconName;
  name: string;
  amount: string;
  caption: string;
  isSource: boolean;
  onCycle?: () => void;
}

function RouteStop({ role, icon, name, amount, caption, isSource, onCycle }: RouteStopProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-fg/[0.03] p-3 ring-1 ring-fg/[0.07]">
      <span
        className={cx(
          'grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-500',
          isSource ? 'aurora-pill' : 'bg-fg/[0.08] text-fg',
        )}
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{role}</p>
        {onCycle ? (
          <button
            type="button"
            onClick={onCycle}
            title={ffText.nextAccount}
            aria-label={`${ffText.nextAccount} · ${name}`}
            className={cx('inline-flex max-w-full items-center gap-1 text-sm font-semibold text-fg hover:text-(--aurora-ribbon-a)', focusRing)}
          >
            <span className="truncate">{name}</span>
            <Icon name="chevronRight" size={12} className="shrink-0 rotate-90" />
          </button>
        ) : (
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
        )}
        <p className="truncate text-[11px] text-fg-subtle tabular-nums">{caption}</p>
      </div>
      <span className="shrink-0 text-base font-bold text-fg tabular-nums">{amount}</span>
    </div>
  );
}

interface TransferRouteProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  currency: string;
  hidden: boolean;
}

/** From and To stacked as a route ticket; the swap button on the dashed connector flips the direction. */
export function TransferRoute({ accounts, walletBalance, currency, hidden }: TransferRouteProps) {
  const [pick, setPick] = useState(0);
  const [toWallet, setToWallet] = useState(false);

  if (!accounts) return <DeckSkeleton height="h-[440px]" />;

  const account = accounts.length > 0 ? accounts[pick % accounts.length] : undefined;
  const cycle = accounts.length > 1 ? () => setPick((value) => value + 1) : undefined;

  const walletStop = (role: string, isSource: boolean) => (
    <RouteStop role={role} icon="wallet" name={ffText.wallet} amount={money(walletBalance, currency, hidden)} caption={ffText.walletBalance} isSource={isSource} />
  );
  const accountStop = (role: string, isSource: boolean) =>
    account ? (
      <RouteStop
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
        className={cx('flex items-center justify-center gap-2 rounded-2xl p-4 text-xs font-semibold text-fg-muted ring-1 ring-fg/15 hover:text-fg', focusRing)}
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
    <section aria-labelledby="aurora-transfer-title" className={deckCard} style={{ animationDelay: '200ms' }}>
      <DeckTitle icon="transfer" title={ffText.transfer} titleId="aurora-transfer-title" action={<CornerLink href="/wallet-history" label={ffText.walletCard} icon="history" />} />

      <div className="relative flex flex-col gap-3">
        {toWallet ? accountStop(ffText.from, true) : walletStop(ffText.from, true)}
        <div aria-hidden="true" className="absolute top-1/2 left-[33px] h-8 -translate-y-1/2 border-l-2 border-dashed border-(--aurora-ribbon-a)/50" />
        <button
          type="button"
          onClick={() => setToWallet((value) => !value)}
          aria-label={ffText.swapDirection}
          title={ffText.swapDirection}
          aria-pressed={toWallet}
          className={cx(
            'absolute top-1/2 right-4 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-fg text-app shadow-[0_8px_20px_-8px_rgb(0_0_0/0.9)] ring-4 ring-app transition-transform hover:scale-105 motion-reduce:transition-none',
            focusRing,
          )}
        >
          <Icon name="transfer" size={15} className={cx('rotate-90 transition-transform duration-500 motion-reduce:transition-none', toWallet && '-rotate-90')} />
        </button>
        {toWallet ? walletStop(ffText.to, false) : accountStop(ffText.to, false)}
      </div>

      <dl className="flex divide-x divide-fg/[0.08]">
        {specs.map((spec) => (
          <div key={spec.label} className="min-w-0 flex-1 px-3 first:pl-0 last:pr-0">
            <dt className="truncate text-[10px] text-fg-subtle">{spec.label}</dt>
            <dd className="mt-0.5 truncate text-xs font-semibold text-fg tabular-nums">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <WaveButton href="/transfer" icon="transfer" label={ffText.transfer} className="mt-auto" />
    </section>
  );
}

/* ───────────── Goal milestone track ───────────── */

const MILESTONES = [25, 50, 75, 100];

interface GoalTrackProps {
  monthlyFlows?: FundsFlowPeriod[];
  depositTrend?: number[];
  currency: string;
  hidden: boolean;
}

/** This month's deposits against last month's as a milestone track: four stops light up as the fill passes them. */
export function GoalTrack({ monthlyFlows, depositTrend, currency, hidden }: GoalTrackProps) {
  if (!monthlyFlows) return <DeckSkeleton height="h-[440px]" />;

  const current = monthlyFlows[monthlyFlows.length - 1];
  const previous = monthlyFlows[monthlyFlows.length - 2];
  const earned = current?.deposits ?? 0;
  const goal = Math.max(previous?.deposits ?? 0, earned, 1);
  const earnedShare = current ? Math.min(earned / goal, 1) : 0;
  const percent = Math.round(earnedShare * 100);

  const trendStart = depositTrend?.[0];
  const trendEnd = depositTrend?.[depositTrend.length - 1];
  const trendChange = trendStart !== undefined && trendEnd !== undefined ? percentChange(trendStart, trendEnd) : undefined;
  const trendLow = depositTrend ? Math.min(...depositTrend) : 0;
  const trendHigh = depositTrend ? Math.max(...depositTrend) : 1;
  const trendLine = depositTrend
    ? smoothPath(depositTrend.map((value, index): [number, number] => [(index / Math.max(depositTrend.length - 1, 1)) * 100, 28 - ((value - trendLow) / (trendHigh - trendLow || 1)) * 24]))
    : '';

  return (
    <section aria-labelledby="aurora-goal-title" className={deckCard} style={{ animationDelay: '360ms' }}>
      <div className="flex items-start justify-between gap-3">
        <h3 id="aurora-goal-title" className="max-w-[18ch] text-[15px] leading-snug font-semibold text-fg">
          {ffText.goalsTitle}
        </h3>
        <Link
          href="/deposit"
          aria-label={ffText.addFunds}
          title={ffText.addFunds}
          className={cx('aurora-pill grid size-9 shrink-0 place-items-center rounded-full transition-transform hover:rotate-90 motion-reduce:transition-none', focusRing)}
        >
          <Icon name="plus" size={16} />
        </Link>
      </div>
      <p className="-mt-2 text-xs leading-relaxed text-fg-muted">{ffText.goalsText}</p>

      <div>
        <p className="flex items-baseline gap-2">
          <span className="text-[40px] leading-none font-bold tracking-[-0.03em] text-fg tabular-nums">{percent}%</span>
          <span className="text-xs text-fg-muted">{ffText.earned}</span>
        </p>
        <div role="img" aria-label={`${percent}% ${ffText.earned}`} className="relative mt-4 h-3">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-fg/[0.07]" />
          <span
            aria-hidden="true"
            className="aurora-fill absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-(--aurora-ribbon-c) to-(--aurora-ribbon-a)"
            style={{ width: `${percent}%` }}
          />
          {MILESTONES.map((mark) => (
            <span
              key={mark}
              aria-hidden="true"
              className={cx(
                'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-app transition-colors',
                percent >= mark ? 'bg-(--aurora-ribbon-a)' : 'bg-surface-2',
              )}
              style={{ left: `${mark === 100 ? 'calc(100% - 8px)' : `${mark}%`}` }}
            />
          ))}
        </div>
        <div aria-hidden="true" className="mt-2 flex justify-between text-[10px] text-fg-subtle tabular-nums">
          <span>0%</span>
          {MILESTONES.map((mark) => (
            <span key={mark}>{mark}%</span>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-success" />
            {ffText.earned}
          </dt>
          <dd className="mt-0.5 truncate text-base font-bold text-success tabular-nums">{money(earned, currency, hidden)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-fg" />
            {ffText.goal}
          </dt>
          <dd className="mt-0.5 truncate text-base font-bold text-fg tabular-nums">{money(goal, currency, hidden)}</dd>
        </div>
      </dl>

      {depositTrend && depositTrend.length > 1 && (
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={ffText.deposits} className="h-8 min-w-0 flex-1 overflow-visible">
            <path d={trendLine} fill="none" stroke="var(--aurora-ribbon-a)" strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <ChangeChip value={trendChange} className="shrink-0" />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-fg/[0.08] pt-3">
        <p className="min-w-0 truncate text-xs text-fg-muted tabular-nums">
          {ffText.income}: <span className="font-semibold text-success">{money(earned, currency, hidden)}</span> / {money(goal, currency, hidden)}
        </p>
        <CornerLink href="/history" label={ffText.cashFlow} icon="history" />
      </div>
    </section>
  );
}
