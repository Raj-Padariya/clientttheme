'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import type { FundsFlowPeriod, TradingAccount, Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUpMoney, ffText } from './finflowParts';

const MASK = '••••••';
const BAR_LIMIT = 24;
const TICK_COUNT = 24;
const ROW_LIMIT = 4;

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

interface Bar {
  value: number;
  label: string;
}

const barBase =
  'w-full max-w-[6px] min-w-[2px] rounded-t-[2px] transition-[height,background-color] duration-700 ease-out starting:h-0 motion-reduce:transition-none';

/** Thin bar strip after the reference: one bar per period, newest on the right and lit; heights follow the real values. */
function MiniBars({ bars, label, currency }: { bars: Bar[]; label: string; currency: string }) {
  const peak = Math.max(...bars.map((bar) => Math.abs(bar.value)), 1);
  return (
    <div role="img" aria-label={label} className="flex h-12 min-w-0 flex-1 items-end gap-[3px]">
      {bars.map((bar, index) => {
        const isLatest = index === bars.length - 1;
        const height = Math.max((Math.abs(bar.value) / peak) * 100, 8);
        return (
          <span
            key={`${bar.label}-${index}`}
            title={`${bar.label} · ${formatMoney(bar.value, currency)}`}
            style={{ '--h': `${height}%`, transitionDelay: `${index * 25}ms` } as CSSProperties}
            className={cx(
              barBase,
              'h-(--h)',
              isLatest ? 'bg-primary' : bar.value < 0 ? 'bg-(--brand-accent)/45 hover:bg-(--brand-accent)' : 'bg-fg/15 hover:bg-primary/60',
            )}
          />
        );
      })}
    </div>
  );
}

/** Same strip used as a meter: bars light up to the share, the rest stay short and dim. */
function TickMeter({ share, label }: { share: number; label: string }) {
  const lit = Math.round(Math.min(Math.max(share, 0), 1) * TICK_COUNT);
  return (
    <div role="img" aria-label={label} className="flex h-12 min-w-0 flex-1 items-end gap-[3px]">
      {Array.from({ length: TICK_COUNT }, (_, tick) => (
        <span key={tick} style={{ transitionDelay: `${tick * 25}ms` }} className={cx(barBase, tick < lit ? 'h-full bg-primary' : 'h-[40%] bg-fg/12')} />
      ))}
    </div>
  );
}

interface DeckPanelProps {
  label: string;
  chart: ReactNode;
  value: ReactNode;
  caption: ReactNode;
  delay: number;
}

function DeckPanel({ label, chart, value, caption, delay }: DeckPanelProps) {
  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className="group flex min-w-0 animate-rise flex-col gap-2.5 rounded-2xl bg-surface-2/55 p-3.5 ring-1 ring-line transition-[background-color,box-shadow] duration-300 hover:bg-surface-2/85 hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span className="flex min-w-0 items-center gap-2 text-xs text-fg-muted">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-fg-muted transition-colors group-hover:bg-primary" />
        <span className="truncate">{label}</span>
      </span>
      <div className="flex items-end justify-between gap-3">
        {chart}
        <div className="max-w-[58%] min-w-0 shrink-0 text-right">
          <div className="truncate text-xl font-semibold tracking-tight text-fg tabular-nums">{value}</div>
          <div className="mt-0.5 truncate text-[11px] text-fg-muted tabular-nums">{caption}</div>
        </div>
      </div>
    </li>
  );
}

interface DeckCardProps {
  icon: IconName;
  title: string;
  titleId: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  delay: number;
  children: ReactNode;
}

function DeckCard({ icon, title, titleId, subtitle, action, delay, children }: DeckCardProps) {
  return (
    <section
      aria-labelledby={titleId}
      style={{ animationDelay: `${delay}ms` }}
      className="orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-3 p-4 motion-reduce:animate-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-fg">
            <Icon name={icon} size={16} className="shrink-0 text-fg-muted" />
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CornerLink({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="nova-gloss grid size-8 shrink-0 place-items-center rounded-full text-fg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
    >
      <Icon name={icon} size={14} />
    </Link>
  );
}

function PanelSkeletons({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="h-[92px] animate-pulse rounded-2xl bg-surface-2/60" />
      ))}
    </ul>
  );
}

/** Month-on-month change of one side of the flow; more money in is good, more money out is not. */
function ChangeCaption({ value, previous, goodWhenUp }: { value: number; previous?: number; goodWhenUp: boolean }) {
  if (!previous) return <>{ffText.thisMonth}</>;
  const change = ((value - previous) / previous) * 100;
  const isGood = goodWhenUp ? change >= 0 : change <= 0;
  return (
    <span className={isGood ? 'text-success' : 'text-danger'}>
      ({change >= 0 ? '+' : '−'}
      {Math.abs(change).toFixed(2)}%) <span className="text-fg-muted">vs {ffText.lastMonth.toLowerCase()}</span>
    </span>
  );
}

interface OverviewDeckProps {
  monthlyFlows?: FundsFlowPeriod[];
  transactions?: Transaction[];
  currency: string;
}

/** Monthly Financial Overview: net flow, money in and money out, each with its month-by-month bar strip, plus the top spend day. */
export function OverviewDeck({ monthlyFlows, transactions, currency }: OverviewDeckProps) {
  const recent = monthlyFlows?.slice(-BAR_LIMIT);
  const current = recent?.[recent.length - 1];
  const previous = recent?.[recent.length - 2];
  const barsOf = (pick: (period: FundsFlowPeriod) => number): Bar[] =>
    recent?.map((period) => ({ value: pick(period), label: monthFormat.format(new Date(period.start)) })) ?? [];

  const net = current ? current.deposits - current.withdrawals : 0;
  const moved = current ? current.deposits + current.withdrawals : 0;
  const inShare = moved > 0 && current ? Math.round((current.deposits / moved) * 100) : 0;
  const outShare = moved > 0 ? 100 - inShare : 0;
  const topWithdrawal = transactions
    ?.filter((transaction) => transaction.type === 'withdrawal')
    .reduce<Transaction | undefined>((top, transaction) => (!top || transaction.amount > top.amount ? transaction : top), undefined);
  const topDate = topWithdrawal ? new Date(topWithdrawal.createdAt) : undefined;

  return (
    <DeckCard icon="areaChart" title={ffText.overview} titleId="deck-overview-title" action={<CornerLink href="/history" label={ffText.overview} icon="chevronRight" />} delay={120}>
      {current === undefined ? (
        <PanelSkeletons count={3} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          <DeckPanel
            label={`${ffText.savings} · ${monthFormat.format(new Date(current.start))}`}
            chart={<MiniBars bars={barsOf((period) => period.deposits - period.withdrawals)} label={ffText.savings} currency={currency} />}
            value={<CountUpMoney value={net} currency={currency} signed className={net >= 0 ? 'text-success' : 'text-danger'} centsClassName="opacity-50" />}
            caption={`${ffText.moneyIn} ${inShare}% · ${ffText.moneyOut} ${outShare}%`}
            delay={180}
          />
          <DeckPanel
            label={ffText.income}
            chart={<MiniBars bars={barsOf((period) => period.deposits)} label={ffText.income} currency={currency} />}
            value={<CountUpMoney value={current.deposits} currency={currency} centsClassName="text-fg-subtle" />}
            caption={<ChangeCaption value={current.deposits} previous={previous?.deposits} goodWhenUp />}
            delay={240}
          />
          <DeckPanel
            label={ffText.expenses}
            chart={<MiniBars bars={barsOf((period) => period.withdrawals)} label={ffText.expenses} currency={currency} />}
            value={<CountUpMoney value={current.withdrawals} currency={currency} centsClassName="text-fg-subtle" />}
            caption={<ChangeCaption value={current.withdrawals} previous={previous?.withdrawals} goodWhenUp={false} />}
            delay={300}
          />
        </ul>
      )}

      <div className="group mt-auto flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-2.5 transition-colors duration-300 hover:border-danger/40">
        <span aria-hidden="true" className="flex w-11 shrink-0 flex-col overflow-hidden rounded-xl bg-surface-2 text-center ring-1 ring-line transition-transform duration-300 group-hover:-rotate-3">
          <span className="bg-danger/85 py-px text-[8px] font-bold tracking-widest text-white uppercase">{topDate ? weekdayFormat.format(topDate) : '—'}</span>
          <span className="py-1 text-base font-extrabold text-fg tabular-nums">{topDate ? topDate.getDate() : '—'}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-fg-muted">{ffText.topSpend}</span>
          {topWithdrawal ? (
            <span className="block truncate text-sm font-bold text-danger tabular-nums">{formatMoney(topWithdrawal.amount, topWithdrawal.currency)}</span>
          ) : (
            <span className="block truncate text-xs font-medium text-fg-subtle">{ffText.noSpend}</span>
          )}
        </span>
        <Icon name="calendar" size={16} className="shrink-0 text-fg-subtle transition-colors group-hover:text-danger" />
      </div>
    </DeckCard>
  );
}

interface PowerDeckProps {
  accounts?: TradingAccount[];
  balanceHistory?: number[];
  currency: string;
}

/** Trading power of the live accounts: free margin and used margin as meters, equity beside the daily balance strip. */
export function PowerDeck({ accounts, balanceHistory, currency }: PowerDeckProps) {
  const sum = (pick: (account: TradingAccount) => number) => accounts?.reduce((total, account) => total + pick(account), 0);
  const freeMargin = sum((account) => account.freeMargin);
  const equity = sum((account) => account.equity);
  const balance = sum((account) => account.balance);
  const usedMargin = equity !== undefined && freeMargin !== undefined ? Math.max(equity - freeMargin, 0) : undefined;
  const floating = equity !== undefined && balance !== undefined ? equity - balance : undefined;
  const freeShare = equity && freeMargin !== undefined ? Math.min(Math.max(freeMargin / equity, 0), 1) : 0;
  const usedShare = equity && usedMargin !== undefined ? Math.min(usedMargin / equity, 1) : 0;

  const history = balanceHistory?.slice(-BAR_LIMIT) ?? [];
  const historyBars = history.map((value, index) => {
    const daysAgo = history.length - 1 - index;
    return { value, label: daysAgo === 0 ? 'Today' : `${daysAgo}d ago` };
  });

  return (
    <DeckCard
      icon="accounts"
      title={ffText.tradingPower}
      titleId="deck-power-title"
      subtitle={
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          {accounts === undefined ? '—' : `${accounts.length} ${ffText.liveAccounts}`}
        </span>
      }
      action={<CornerLink href="/accounts" label={ffText.tradingAccounts} icon="chevronRight" />}
      delay={180}
    >
      {accounts === undefined ? (
        <PanelSkeletons count={3} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          <DeckPanel
            label={ffText.freeMargin}
            chart={<TickMeter share={freeShare} label={`${Math.round(freeShare * 100)}% ${ffText.available}`} />}
            value={<CountUpMoney value={freeMargin} currency={currency} centsClassName="text-fg-subtle" />}
            caption={<span className="text-primary">{Math.round(freeShare * 100)}% {ffText.available}</span>}
            delay={240}
          />
          <DeckPanel
            label={ffText.equity}
            chart={<MiniBars bars={historyBars} label={ffText.dailyBalance} currency={currency} />}
            value={equity === undefined ? '—' : formatMoney(equity, currency)}
            caption={
              floating === undefined ? (
                '—'
              ) : (
                <span className={floating >= 0 ? 'text-success' : 'text-danger'}>
                  {floating >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(floating), currency)} {ffText.floatingShort}
                </span>
              )
            }
            delay={300}
          />
          <DeckPanel
            label={ffText.usedMargin}
            chart={<TickMeter share={usedShare} label={`${Math.round(usedShare * 100)}% ${ffText.ofEquity}`} />}
            value={usedMargin === undefined ? '—' : formatMoney(usedMargin, currency)}
            caption={`${Math.round(usedShare * 100)}% ${ffText.ofEquity}`}
            delay={360}
          />
        </ul>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Link
          href="/platforms"
          className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-on-primary shadow-[0_10px_22px_-14px_rgb(0_0_0/0.8)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="trendUp" size={14} />
          {ffText.tradeNow}
        </Link>
        <Link
          href="/accounts/new"
          className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-line-strong text-xs font-semibold text-fg transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="plus" size={14} />
          {ffText.openAccount}
        </Link>
      </div>
    </DeckCard>
  );
}

type AccountAction = 'transfer' | 'deposit' | 'withdraw';

const accountActions: { value: AccountAction; label: string; icon: IconName; href: string }[] = [
  { value: 'transfer', label: ffText.transfer, icon: 'transfer', href: '/transfer' },
  { value: 'deposit', label: ffText.deposit, icon: 'deposit', href: '/deposit' },
  { value: 'withdraw', label: ffText.withdraw, icon: 'withdrawal', href: '/withdrawal' },
];

function ShareRing({ percent }: { percent: number }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
          className="transition-[stroke-dasharray] duration-1000 ease-out starting:[stroke-dasharray:0_100] motion-reduce:transition-none"
        />
      </svg>
      <span className="text-[9px] font-bold text-fg tabular-nums">{percent}%</span>
    </span>
  );
}

interface AccountsDeckProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  currency: string;
  hidden: boolean;
}

/** Wallet + trading accounts as one list; the action tabs decide where a row takes you (transfer, deposit or withdraw). */
export function AccountsDeck({ accounts, walletBalance, currency, hidden }: AccountsDeckProps) {
  const [action, setAction] = useState<AccountAction>('transfer');
  const target = accountActions.find((item) => item.value === action) ?? accountActions[0];
  const rows = accounts?.slice(0, ROW_LIMIT);
  const accountsTotal = accounts?.reduce((sum, account) => sum + account.balance, 0) ?? 0;
  const grandTotal = accountsTotal + (walletBalance ?? 0);
  const shareOf = (amount: number) => (grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0);
  const money = (amount: number, code: string) => (hidden ? MASK : formatMoney(amount, code));
  const rowClass =
    'group flex animate-rise items-center gap-3 rounded-2xl bg-surface-2/55 p-2.5 ring-1 ring-line transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-surface-2/85 hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none';

  return (
    <DeckCard icon="wallet" title={ffText.accountsTitle} titleId="deck-accounts-title" action={<CornerLink href="/accounts/new" label={ffText.add} icon="plus" />} delay={240}>
      <div role="tablist" aria-label={ffText.accountActions} className="grid grid-cols-3 gap-1 rounded-full bg-surface-2/70 p-1 ring-1 ring-line">
        {accountActions.map((item) => {
          const isActive = item.value === action;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setAction(item.value)}
              className={cx(
                'flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive ? 'nova-gloss text-fg' : 'text-fg-subtle hover:text-fg',
              )}
            >
              <Icon name={item.icon} size={13} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {rows === undefined ? (
          Array.from({ length: 3 }, (_, index) => <li key={index} className="h-[60px] animate-pulse rounded-2xl bg-surface-2/60" />)
        ) : (
          <>
            {walletBalance !== undefined && (
              <li>
                <Link href={target.href} title={`${target.label} · ${ffText.wallet}`} className={rowClass} style={{ animationDelay: '280ms' }}>
                  <span className="nova-coin grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/30">
                    <Icon name="wallet" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{ffText.wallet}</span>
                    <span className="block truncate text-[11px] text-fg-muted">{ffText.walletBalance}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-fg tabular-nums">{money(walletBalance, currency)}</span>
                    <span className="block text-[11px] font-semibold text-primary tabular-nums">{shareOf(walletBalance)}%</span>
                  </span>
                </Link>
              </li>
            )}
            {rows.map((account, index) => (
              <li key={account.id}>
                <Link
                  href={target.href}
                  title={`${target.label} · ${account.login}`}
                  aria-label={`${target.label} · ${account.platform} ${account.login} · ${formatMoney(account.balance, account.currency)} · ${shareOf(account.balance)}% ${ffText.shareOfTotal}`}
                  className={rowClass}
                  style={{ animationDelay: `${340 + index * 60}ms` }}
                >
                  <ShareRing percent={shareOf(account.balance)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg tabular-nums">{account.login}</span>
                    <span className="block truncate text-[11px] text-fg-muted">
                      {account.platform} · 1:{account.leverage}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-fg tabular-nums">{money(account.balance, account.currency)}</span>
                    <Icon name={target.icon} size={12} className="ml-auto block text-fg-subtle transition-colors group-hover:text-primary" />
                  </span>
                </Link>
              </li>
            ))}
          </>
        )}
      </ul>

      <div className="flex items-center justify-between gap-3 text-[11px] text-fg-muted">
        <span className="tabular-nums">{accounts ? `${ffText.viewing} ${rows?.length ?? 0} ${ffText.of} ${accounts.length}` : '—'}</span>
        <Link href="/accounts" className="font-semibold text-fg underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {ffText.allAccounts}
        </Link>
      </div>
    </DeckCard>
  );
}

interface TransferSideProps {
  label: string;
  amount: string;
  caption?: string;
  chip: ReactNode;
}

function TransferSide({ label, amount, caption, chip }: TransferSideProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-b from-surface-2/90 to-surface-2/40 p-3.5 ring-1 ring-line">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-fg">{label}</span>
        {caption && <span className="truncate text-fg-muted tabular-nums">{caption}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xl font-semibold text-fg tabular-nums">{amount}</span>
        {chip}
      </div>
    </div>
  );
}

interface TransferDeckProps {
  accounts?: TradingAccount[];
  walletBalance?: number;
  currency: string;
  hidden: boolean;
}

/** Exchange-style quick transfer between the wallet and a trading account; picks the pair here, the transfer page does the rest. */
export function TransferDeck({ accounts, walletBalance, currency, hidden }: TransferDeckProps) {
  const [pick, setPick] = useState(0);
  const [toWallet, setToWallet] = useState(false);
  const account = accounts && accounts.length > 0 ? accounts[pick % accounts.length] : undefined;
  const money = (amount: number | undefined, code: string) => (amount === undefined ? '—' : hidden ? MASK : formatMoney(amount, code));
  const chipClass = 'flex shrink-0 items-center gap-1.5 rounded-full bg-surface/80 py-1 pr-2.5 pl-1 text-[11px] font-semibold text-fg ring-1 ring-line-strong';

  const walletSide = (label: string) => (
    <TransferSide
      label={label}
      amount={money(walletBalance, currency)}
      caption={ffText.walletBalance}
      chip={
        <span className={chipClass}>
          <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
            <Icon name="wallet" size={11} />
          </span>
          {ffText.wallet}
        </span>
      }
    />
  );

  const accountSide = (label: string) => (
    <TransferSide
      label={label}
      amount={account ? money(account.balance, account.currency) : '—'}
      caption={account ? `${ffText.freeMargin} ${money(account.freeMargin, account.currency)}` : undefined}
      chip={
        account ? (
          <button
            type="button"
            onClick={() => setPick((value) => value + 1)}
            disabled={!accounts || accounts.length < 2}
            aria-label={`${ffText.nextAccount} · ${account.login}`}
            title={ffText.nextAccount}
            className={cx(chipClass, 'transition-colors enabled:hover:ring-primary/50 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-ring')}
          >
            <span className="grid size-5 place-items-center rounded-full bg-(--brand-accent)/15 text-[8px] font-bold text-(--brand-accent) tabular-nums">{account.login.slice(-2)}</span>
            <span className="tabular-nums">{account.login}</span>
            {accounts && accounts.length > 1 && <Icon name="chevronRight" size={12} className="rotate-90 text-fg-muted" />}
          </button>
        ) : (
          <Link href="/accounts/new" className={chipClass}>
            <Icon name="plus" size={12} />
            {ffText.openAccount}
          </Link>
        )
      }
    />
  );

  return (
    <DeckCard
      icon="transfer"
      title={ffText.transfer}
      titleId="deck-transfer-title"
      action={<CornerLink href="/wallet-history" label={ffText.walletCard} icon="history" />}
      delay={300}
    >
      {accounts === undefined ? (
        <PanelSkeletons count={2} />
      ) : (
        <div className="relative flex flex-col gap-1.5">
          {toWallet ? accountSide(ffText.from) : walletSide(ffText.from)}
          <button
            type="button"
            onClick={() => setToWallet((value) => !value)}
            aria-label={ffText.swapDirection}
            title={ffText.swapDirection}
            aria-pressed={toWallet}
            className="nova-gloss absolute top-1/2 left-1/2 z-10 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-fg ring-4 ring-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="transfer" size={15} className={cx('rotate-90 transition-transform duration-500 motion-reduce:transition-none', toWallet && 'rotate-[270deg]')} />
          </button>
          {toWallet ? walletSide(ffText.to) : accountSide(ffText.to)}
        </div>
      )}

      <dl className="mt-1 flex flex-col gap-1.5 text-[11px]">
        {[
          { label: ffText.platform, value: account?.platform ?? '—' },
          { label: ffText.leverage, value: account ? `1:${account.leverage}` : '—' },
          { label: ffText.equity, value: money(account?.equity, account?.currency ?? currency) },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="text-fg-muted">{row.label}</dt>
            <dd className="font-semibold text-fg tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href="/transfer"
        className="mt-auto flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-on-primary shadow-[0_10px_22px_-14px_rgb(0_0_0/0.8)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <Icon name="transfer" size={15} />
        {ffText.transfer}
      </Link>
    </DeckCard>
  );
}
