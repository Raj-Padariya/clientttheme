'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { isInRange, PeriodDial, periodRange, type PeriodRange } from './DirectClientsDesk';
import { descendantsOf, mockCascade } from './ibCascadeData';
import type { DirectPeriod } from './ibDirectClientsData';
import {
  memberOverviewCopy as copy,
  memberVoiceCopy,
  yourPlans,
  type MemberOverview,
  type MemberPlan,
  type MemberTab,
  type MemberTrade,
  type SymbolCommission,
  type TradeSide,
  type TradingAccount,
} from './ibMemberOverviewData';
import { CascadeTree } from './NetworkCascadeDesk';

const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const RING_RADIUS = 30;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const ALL_ACCOUNTS = 'all';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">{children}</h2>;
}

function IconTile({ icon, className }: { icon: IconName; className?: string }) {
  return (
    <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/30', className)}>
      <Icon name={icon} size={16} />
    </span>
  );
}

function SearchField({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label
      className={cx(
        'group flex h-11 min-w-0 items-center gap-3 rounded-2xl bg-surface-2/60 px-4 ring-1 ring-line transition-shadow focus-within:ring-primary/60',
        className,
      )}
    >
      <Icon name="search" size={16} className="shrink-0 text-fg-subtle group-focus-within:text-primary" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  );
}

/* ───────────── Downline / funding: headcount ring (IB pages) + equity hero, funding flow, volume & share ───────────── */

function Downline({ member }: { member: MemberOverview }) {
  const voice = memberVoiceCopy[member.voice];
  const { currency, downline } = member;
  const net = member.deposits - member.withdrawals;
  const flowTotal = member.deposits + member.withdrawals;

  const flows: { label: string; hint: string; value: number; turn: string; percent: number }[] = [
    { label: copy.deposits, hint: voice.depositsHint, value: member.deposits, turn: 'rotate-90', percent: share(member.deposits, flowTotal) },
    { label: copy.withdrawals, hint: voice.withdrawalsHint, value: member.withdrawals, turn: '-rotate-90', percent: share(member.withdrawals, flowTotal) },
  ];

  return (
    <section className="orbit-card flex flex-col gap-5 p-5 sm:p-6">
      {downline && <SectionLabel>{voice.downlineTitle}</SectionLabel>}

      <div className={cx('grid gap-4', downline && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]')}>
        {downline && (
          <div className="flex items-center gap-5 rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line">
            <div className="relative grid size-20 shrink-0 place-items-center">
              <svg viewBox="0 0 76 76" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                <circle cx="38" cy="38" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="5" className="text-surface-2" />
                <circle
                  cx="38"
                  cy="38"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--brand-primary)"
                  strokeOpacity="0.8"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - share(downline.ownClients, downline.branchClients) / 100)}
                  className="transition-[stroke-dashoffset] duration-700"
                />
              </svg>
              <span className="relative font-mono text-lg font-bold text-fg tabular-nums">
                {downline.ownClients} / {downline.branchClients}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-fg-muted">{copy.clients}</p>
                <p className="text-xs text-fg-subtle">{voice.clientsHint}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <IconTile icon="trophy" className="size-8" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-fg-muted">
                    {copy.subIbs} <span className="ml-1 font-mono text-base font-bold text-fg tabular-nums">{downline.subIbs}</span>
                  </p>
                  <p className="text-xs text-fg-subtle">{voice.subIbsHint}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/35">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-12 size-40 rounded-full border border-dashed border-primary/30 motion-safe:animate-orbit [animation-duration:4s]" />
          <span className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
            <IconTile icon="accounts" className="size-8" />
            {copy.equity}
          </span>
          <span className="font-mono text-3xl font-bold text-fg tabular-nums">{formatMoney(member.equity, currency)}</span>
          <span className="text-xs text-fg-subtle">{copy.equityHint}</span>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl p-1 sm:grid-cols-3">
        {flows.map((flow, index) => (
          <div key={flow.label} style={riseDelay(index)} className="flex animate-rise flex-col gap-2 rounded-2xl bg-surface-2/30 p-4 ring-1 ring-line motion-reduce:animate-none">
            <span className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
              <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
                <Icon name="chevronRight" size={12} className={flow.turn} />
              </span>
              {flow.label}
            </span>
            <span className="font-mono text-xl font-bold text-fg tabular-nums">{formatMoney(flow.value, currency)}</span>
            <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-linear-to-r from-primary/35 to-primary/75" style={{ width: `${Math.max(flow.percent, 2)}%` }} />
            </span>
            <span className="text-xs text-fg-subtle">{flow.hint}</span>
          </div>
        ))}
        <div style={riseDelay(2)} className="flex animate-rise flex-col gap-2 rounded-2xl border border-dashed border-primary/40 p-4 motion-reduce:animate-none">
          <span className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
            <span className="grid size-6 place-items-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">=</span>
            {copy.netFunding}
          </span>
          <span className="font-mono text-xl font-bold text-primary tabular-nums">{formatMoney(net, currency)}</span>
          <span className="text-xs text-fg-subtle">{copy.netFundingHint}</span>
        </div>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-2">
        <div className="flex items-center gap-3 bg-surface p-4">
          <IconTile icon="history" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-semibold text-fg-muted">{copy.lots}</dt>
            <dd className="text-xs text-fg-subtle">{voice.lotsHint}</dd>
          </div>
          <dd className="font-mono text-xl font-bold text-fg tabular-nums">{lotsFormat.format(member.lots)}</dd>
        </div>
        <div className="flex items-center gap-3 bg-surface p-4">
          <IconTile icon="trophy" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-semibold text-fg-muted">{copy.youEarned}</dt>
            <dd className="text-xs text-fg-subtle">{voice.youEarnedHint}</dd>
          </div>
          <dd className="font-mono text-xl font-bold text-primary tabular-nums">{formatMoney(member.earned, currency)}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ───────────── Referral links: one capsule per link ───────────── */

function ReferralLinks({ member, links }: { member: MemberOverview; links: NonNullable<MemberOverview['links']> }) {
  const columns = copy.linkColumns;
  return (
    <section className="orbit-card flex flex-col gap-4 p-5 sm:p-6">
      <SectionLabel>{memberVoiceCopy[member.voice].referralTitle}</SectionLabel>
      <ul className="flex flex-col gap-2">
        {links.map((link, index) => (
          <li
            key={link.id}
            style={riseDelay(index)}
            className="grid animate-rise items-center gap-3 rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line motion-reduce:animate-none sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto] sm:gap-5"
          >
            <div className="min-w-0">
              <p className="text-[10px] text-fg-subtle">{columns.link}</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <span className="truncate">{link.name}</span>
                {link.isDefault && <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-bold text-primary ring-1 ring-primary/40">{copy.defaultTag}</span>}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-fg-subtle">{columns.code}</p>
              <p className="w-fit rounded-lg bg-surface px-2 py-0.5 font-mono text-xs tracking-[0.12em] text-fg-muted ring-1 ring-line">{link.code}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] text-fg-subtle">{columns.signedUp}</p>
              <p className="font-mono text-sm font-semibold text-fg tabular-nums">{link.signedUp}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] text-fg-subtle">{columns.funded}</p>
              <p className="font-mono text-sm font-semibold text-fg tabular-nums">{link.funded}</p>
            </div>
            <div>
              <p className="text-[10px] text-fg-subtle">{columns.status}</p>
              <span
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                  link.isOn ? 'bg-primary/15 text-primary ring-primary/40' : 'bg-surface-2 text-fg-subtle ring-line',
                )}
              >
                <span className={cx('size-1.5 rounded-full', link.isOn ? 'bg-primary motion-safe:animate-pulse' : 'bg-fg-subtle')} />
                {link.isOn ? copy.statusOn : copy.statusOff}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Wallet: deep-space card with the payable balance up top ───────────── */

function Wallet({ member, wallet }: { member: MemberOverview; wallet: NonNullable<MemberOverview['wallet']> }) {
  const voice = memberVoiceCopy[member.voice];
  const { currency } = member;
  const rows: { label: string; hint: string; value: number; emphasis?: boolean }[] = [
    { label: copy.pending, hint: copy.pendingHint, value: wallet.pending },
    { label: copy.earnedAllTime, hint: voice.earnedAllTimeHint, value: wallet.earnedAllTime, emphasis: true },
    { label: copy.paidOut, hint: copy.paidOutHint, value: wallet.paidOut },
  ];

  return (
    <section className={cx('relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl p-6 text-white', graphite)}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full border border-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-48 motion-safe:animate-orbit [animation-duration:4s]">
        <span className="absolute bottom-3 left-1/2 size-2 rounded-full bg-(--brand-gleam) shadow-[0_0_10px_var(--brand-gleam)]" />
      </span>
      <h2 className="relative text-[11px] font-bold tracking-[0.18em] text-(--brand-gleam) uppercase">{voice.walletTitle}</h2>
      <div className="relative">
        <p className="text-xs text-white/60">{copy.available(currency)}</p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{formatMoney(wallet.available, currency)}</p>
        <p className="mt-1 text-xs text-white/55">{voice.availableHint}</p>
      </div>
      <ul className="relative mt-auto flex flex-col divide-y divide-white/10 rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white/80">{row.label}</span>
              <span className="block text-[11px] text-white/45">{row.hint}</span>
            </span>
            <span className={cx('font-mono text-base font-bold tabular-nums', row.emphasis ? 'text-(--brand-gleam)' : 'text-white')}>
              {formatMoney(row.value, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Trading accounts (client pages): one orbit capsule per account ───────────── */

function TradingAccounts({ accounts, onSeeTrades }: { accounts: TradingAccount[]; onSeeTrades: (account: string) => void }) {
  return (
    <section className="orbit-card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{copy.tradingAccounts}</SectionLabel>
        <span className="text-[11px] text-fg-subtle">{copy.accountCount(accounts.length)}</span>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {accounts.map((account, index) => (
          <li key={account.number} style={riseDelay(index)} className="flex animate-rise flex-col gap-3 rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line motion-reduce:animate-none">
            <div className="flex items-center justify-between gap-3">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono font-bold text-fg">#{account.number}</span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-bold text-primary ring-1 ring-primary/40">{account.currency}</span>
                <span className="text-fg-muted">{account.group}</span>
              </p>
              <button
                type="button"
                onClick={() => onSeeTrades(account.number)}
                className="group/see inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/35 transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {copy.seeTrades}
                <Icon name="chevronRight" size={12} className="transition-transform group-hover/see:translate-x-0.5" />
              </button>
            </div>
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line">
              <div className="bg-surface px-3 py-2">
                <dt className="text-[10px] text-fg-subtle">{copy.balance}</dt>
                <dd className="font-mono text-sm font-semibold text-fg tabular-nums">{formatMoney(account.balance, account.currency)}</dd>
              </div>
              <div className="bg-surface px-3 py-2">
                <dt className="text-[10px] text-fg-subtle">{copy.equity}</dt>
                <dd className="font-mono text-sm font-semibold text-fg tabular-nums">{formatMoney(account.equity, account.currency)}</dd>
              </div>
              <div className="bg-surface px-3 py-2">
                <dt className="text-[10px] text-fg-subtle">{copy.lots}</dt>
                <dd className="font-mono text-sm font-semibold text-fg tabular-nums">
                  {lotsFormat.format(account.lots)} {copy.lotsSuffix}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── History: orbit timeline ───────────── */

function OwnTrading({ history, title }: { history: { label: string; date: string }[]; title: string | null }) {
  return (
    <section className="orbit-card flex flex-col gap-4 p-5 sm:p-6">
      {title && <SectionLabel>{title}</SectionLabel>}
      <div className="rounded-2xl bg-surface-2/30 p-4 ring-1 ring-line">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="history" size={15} className="text-primary" />
            {copy.historyTitle}
          </p>
          <span className="text-[11px] text-fg-subtle">{copy.historyOrder}</span>
        </div>
        <ol className="relative flex flex-col gap-3 border-l border-dashed border-primary/40 pl-5">
          {history.map((event, index) => (
            <li key={`${event.label}-${event.date}`} style={riseDelay(index)} className="relative flex animate-rise items-center justify-between gap-3 motion-reduce:animate-none">
              <span aria-hidden="true" className="absolute top-1/2 -left-[25px] size-2.5 -translate-y-1/2 rounded-full bg-primary ring-4 ring-surface" />
              <span className="text-sm font-semibold text-fg">{event.label}</span>
              <span className="font-mono text-xs text-fg-subtle">{event.date}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Trades: account / side / symbol filters over closed trades ───────────── */

function TradeDesk({ trades, accounts, currency, range, account, onAccount }: {
  trades: MemberTrade[];
  accounts: TradingAccount[];
  currency: string;
  range: PeriodRange;
  account: string;
  onAccount: (account: string) => void;
}) {
  const [side, setSide] = useState<TradeSide>('all');
  const [symbol, setSymbol] = useState('');
  const columns = copy.tradeColumns;
  const needle = symbol.trim().toUpperCase();
  const rows = trades.filter(
    (trade) =>
      (account === ALL_ACCOUNTS || trade.account === account) &&
      (side === 'all' || trade.side === side) &&
      (needle === '' || trade.symbol.toUpperCase().includes(needle)) &&
      isInRange(trade.closedAt, range),
  );
  const accountOptions = [
    { value: ALL_ACCOUNTS, label: copy.allAccounts },
    ...accounts.map((item) => ({ value: item.number, label: `#${item.number}` })),
  ];
  const grid = 'grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_repeat(4,minmax(0,1fr))_minmax(0,1fr)] sm:items-center';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Dropdown label={copy.accountLabel} value={account} options={accountOptions} onChange={onAccount} icon="accounts" className="md:w-52" />
        <div role="radiogroup" aria-label={copy.tradeColumns.side} className="inline-flex w-fit rounded-full bg-surface-2/60 p-1 ring-1 ring-line">
          {copy.sides.map((option) => {
            const isActive = option.id === side;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSide(option.id)}
                className={cx(
                  'h-9 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'bg-primary/20 text-fg ring-1 ring-primary/50' : 'text-fg-muted hover:text-fg',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <SearchField value={symbol} onChange={setSymbol} placeholder={copy.tradeSymbol} className="flex-1 md:max-w-xs" />
      </div>

      <section className="orbit-card p-4 sm:p-5">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <span className="relative grid size-14 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-primary/40 motion-safe:animate-orbit [animation-duration:6s]" />
              <Icon name="history" size={22} className="text-primary" />
            </span>
            <p className="text-base font-bold text-fg">{copy.tradesEmptyTitle}</p>
            <p className="max-w-sm text-sm text-fg-muted">{copy.tradesEmptyBody}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className={cx(grid, 'hidden px-4 text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase sm:grid')}>
              <span>{columns.closed}</span>
              <span>{columns.account}</span>
              <span>{columns.side}</span>
              <span>{columns.symbol}</span>
              <span className="text-right">{columns.lots}</span>
              <span className="text-right">{columns.commission}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {rows.map((trade, index) => (
                <li key={trade.id} style={riseDelay(index)} className={cx(grid, 'animate-rise rounded-2xl bg-surface-2/40 p-4 text-sm ring-1 ring-line motion-reduce:animate-none')}>
                  <span className="font-mono text-xs text-fg-muted">{trade.closedAt}</span>
                  <span className="font-mono text-fg">#{trade.account}</span>
                  <span className={cx('w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ring-1', trade.side === 'buy' ? 'text-primary ring-primary/40' : 'text-fg-muted ring-line')}>
                    {trade.side}
                  </span>
                  <span className="font-mono font-semibold text-fg">{trade.symbol}</span>
                  <span className="font-mono text-fg tabular-nums sm:text-right">{lotsFormat.format(trade.lots)}</span>
                  <span className="font-mono font-semibold text-primary tabular-nums sm:text-right">{formatMoney(trade.commission, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/* ───────────── Symbol-wise commission: one capsule per pair, share as a thin track ───────────── */

function SymbolCell({ label, value, emphasis, strong }: { label: string; value: string; emphasis?: boolean; strong?: boolean }) {
  return (
    <span className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
      <span className="text-[10px] text-fg-subtle sm:hidden">{label}</span>
      <span className={cx('font-mono text-sm tabular-nums', strong ? 'font-bold' : 'font-semibold', emphasis ? 'text-primary' : 'text-fg')}>{value}</span>
    </span>
  );
}

function SymbolDesk({ symbols, currency, ownClientsLabel }: { symbols: SymbolCommission[]; currency: string; ownClientsLabel: string }) {
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<DirectPeriod>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const columns = copy.symbolColumns;

  const needle = query.trim().toUpperCase();
  const rows = symbols.filter((row) => needle === '' || row.pair.toUpperCase().includes(needle));
  const totalEarned = rows.reduce((sum, row) => sum + row.earned, 0);
  const totalTrades = rows.reduce((sum, row) => sum + row.trades, 0);
  const totalLots = rows.reduce((sum, row) => sum + row.lots, 0);
  const grid = 'grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,1fr))_minmax(0,1.3fr)] sm:items-center';

  return (
    <section className="orbit-card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField value={query} onChange={setQuery} placeholder={copy.symbolSearch} className="flex-1 lg:max-w-xs" />
        <PeriodDial
          customLabel={copy.symbolDates}
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onPeriod={setPeriod}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
        />
      </div>

      <div className={cx(grid, 'hidden px-4 text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase sm:grid')}>
        <span>{columns.pair}</span>
        <span className="text-right">{columns.trades}</span>
        <span className="text-right">{columns.lots}</span>
        <span className="text-right">{ownClientsLabel}</span>
        <span className="text-right">{columns.subIbs}</span>
        <span className="text-right">{columns.earned}</span>
        <span className="text-right">{columns.share}</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">{copy.symbolEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const percent = totalEarned > 0 ? (row.earned / totalEarned) * 100 : 0;
            return (
              <li key={row.pair} style={riseDelay(index)} className={cx(grid, 'animate-rise rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line motion-reduce:animate-none')}>
                <span className="flex items-center gap-2.5 font-mono text-sm font-bold text-fg">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-[10px] text-primary ring-1 ring-primary/30">{row.pair.slice(0, 2)}</span>
                  {row.pair}
                </span>
                <SymbolCell label={columns.trades} value={String(row.trades)} />
                <SymbolCell label={columns.lots} value={lotsFormat.format(row.lots)} />
                <SymbolCell label={ownClientsLabel} value={formatMoney(row.fromOwnClients, currency)} />
                <SymbolCell label={columns.subIbs} value={formatMoney(row.fromSubIbs, currency)} />
                <SymbolCell label={columns.earned} value={formatMoney(row.earned, currency)} emphasis />
                <span className="flex items-center gap-2 sm:justify-end">
                  <span aria-hidden="true" className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-linear-to-r from-primary/35 to-primary/75" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="font-mono text-xs font-semibold text-fg tabular-nums">{Math.round(percent)}%</span>
                </span>
              </li>
            );
          })}
          <li className={cx(grid, 'rounded-2xl border border-dashed border-primary/40 bg-primary/[0.06] p-4')}>
            <span className="text-sm font-bold text-fg">{copy.symbolTotal(currency)}</span>
            <SymbolCell label={columns.trades} value={String(totalTrades)} strong />
            <SymbolCell label={columns.lots} value={lotsFormat.format(totalLots)} strong />
            <span className="hidden sm:block" />
            <span className="hidden sm:block" />
            <SymbolCell label={columns.earned} value={formatMoney(totalEarned, currency)} emphasis strong />
            <SymbolCell label={columns.share} value={totalEarned > 0 ? '100%' : '0%'} strong />
          </li>
        </ul>
      )}
    </section>
  );
}

/* ───────────── Commission plan: rate groups as collapsible orbit panels + "Change plan" ───────────── */

function MovePlanModal({ open, memberName, currentPlanId, onClose, onMove }: {
  open: boolean;
  memberName: string;
  currentPlanId: string;
  onClose: () => void;
  onMove: (planId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const plans = yourPlans.filter((plan) => needle === '' || plan.name.toLowerCase().includes(needle));
  const canMove = picked !== null && picked !== currentPlanId;

  function close() {
    setQuery('');
    setPicked(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={copy.moveTitle(memberName)} description={copy.moveHint} calm>
      <div className="flex flex-col gap-4">
        <SearchField value={query} onChange={setQuery} placeholder={copy.searchPlans} />
        {plans.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-muted">{copy.noPlanMatch}</p>
        ) : (
          <ul role="radiogroup" aria-label={copy.searchPlans} className="flex flex-col gap-2">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isPicked = plan.id === picked;
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    disabled={isCurrent}
                    onClick={() => setPicked(plan.id)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
                      isPicked ? 'bg-primary/12 ring-primary/50' : 'bg-surface-2/40 ring-line hover:ring-primary/35',
                    )}
                  >
                    <span className={cx('grid size-4 shrink-0 place-items-center rounded-full ring-2', isPicked ? 'ring-primary' : 'ring-line')}>
                      {isPicked && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                        {plan.name}
                        {isCurrent && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-bold text-fg-subtle ring-1 ring-line">{copy.onItNow}</span>}
                      </span>
                      <span className="block text-xs text-fg-subtle">{copy.partnersOnIt(plan.partners)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canMove}
            onClick={() => {
              if (picked === null) return;
              onMove(picked);
              close();
            }}
            className="h-10 rounded-full bg-primary/20 px-5 text-sm font-semibold text-fg ring-1 ring-primary/50 transition-colors hover:bg-primary/30 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.moveThem}
          </button>
          <button
            type="button"
            onClick={close}
            className="h-10 rounded-full px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PlanDesk({ memberName, plan, currency }: { memberName: string; plan: MemberPlan; currency: string }) {
  const [planId, setPlanId] = useState(plan.planId);
  const [isMoving, setIsMoving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(plan.groups.map((group) => group.name)));
  const planName = yourPlans.find((option) => option.id === planId)?.name ?? plan.name;

  function toggle(name: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="orbit-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon="trophy" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-fg">{planName}</p>
            <p className="text-xs text-fg-muted">{copy.planGiven(plan.givenOn, plan.givenBy)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMoving(true)}
          className="group/plan inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/35 transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="chevronRight" size={13} className="transition-transform group-hover/plan:translate-x-0.5" />
          {copy.changePlan}
        </button>
      </section>

      {plan.groups.map((group, index) => {
        const isOpen = openGroups.has(group.name);
        const panelId = `plan-group-${index}`;
        return (
          <section key={group.name} style={riseDelay(index)} className="orbit-card animate-rise overflow-hidden motion-reduce:animate-none">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(group.name)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-primary/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6"
            >
              <span className="text-sm font-bold text-fg">{group.name}</span>
              <span className="flex items-center gap-3">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/40">{copy.rateCount(group.rates.length)}</span>
                <Icon name="chevronRight" size={14} className={cx('text-fg-subtle transition-transform duration-300', isOpen ? '-rotate-90' : 'rotate-90')} />
              </span>
            </button>
            {isOpen && (
              <div id={panelId} className="flex flex-col gap-5 border-t border-line px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3">
                  <SectionLabel>{copy.rebateTitle}</SectionLabel>
                  <div className="flex items-center justify-between px-1 text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
                    <span>{copy.instrumentType}</span>
                    <span>{copy.theirRate}</span>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {group.rates.map((rate) => (
                      <li key={rate.instrumentType} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/40 px-4 py-3 ring-1 ring-line">
                        <span className="text-sm text-fg">{rate.instrumentType}</span>
                        <span className="font-mono text-sm font-bold text-primary tabular-nums">{formatMoney(rate.ratePerLot, currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <SectionLabel>{copy.perSymbolTitle}</SectionLabel>
                  {group.symbolRules.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-fg-muted">{copy.perSymbolEmpty}</p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-3">
                      {group.symbolRules.map((rule) => (
                        <li key={rule.symbol} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/40 px-4 py-3 ring-1 ring-line">
                          <span className="font-mono text-sm text-fg">{rule.symbol}</span>
                          <span className="font-mono text-sm font-bold text-primary tabular-nums">{formatMoney(rule.ratePerLot, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <MovePlanModal open={isMoving} memberName={memberName} currentPlanId={planId} onClose={() => setIsMoving(false)} onMove={setPlanId} />
    </div>
  );
}

/* ───────────── Page ───────────── */

function MemberHeader({ member, period, onPeriod }: { member: MemberOverview; period: DirectPeriod; onPeriod: (period: DirectPeriod) => void }) {
  const facts = [member.email, ...member.facts];
  return (
    <header className="orbit-card relative flex flex-col gap-5 overflow-hidden p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="relative grid size-16 shrink-0 place-items-center rounded-full">
          <span
            aria-hidden="true"
            className="absolute -inset-1 animate-orbit rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_40%,transparent_65%,var(--brand-primary))] [animation-duration:3s] motion-reduce:animate-none"
          />
          <span className="relative grid size-full place-items-center rounded-full bg-primary/25 text-xl font-bold text-primary ring-4 ring-surface">
            {member.name.trim().charAt(0).toUpperCase()}
          </span>
        </span>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-fg">
            {member.name}
            {member.tags.map((tag) => (
              <span
                key={tag.label}
                className={cx(
                  'rounded-md px-2 py-0.5 text-[10px] font-bold ring-1',
                  tag.tone === 'role' ? 'bg-primary/15 text-primary ring-primary/40' : 'bg-surface-2 text-fg-muted ring-line',
                )}
              >
                {tag.label}
              </span>
            ))}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {facts.join(' · ')}
            {member.cameVia && (
              <>
                {' · '}
                {copy.cameVia} <span className="font-semibold text-fg">{member.cameVia}</span>
                {member.cameViaNote && <> {member.cameViaNote}</>}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:items-end">
        {member.upline && (
          <Link
            href={member.upline.href}
            className="group/up inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-surface-2/60 px-3.5 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/35 transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring sm:self-end"
          >
            <Icon name="chevronRight" size={12} className="-rotate-90 transition-transform group-hover/up:-translate-y-0.5" />
            {copy.upline(member.upline.label)}
          </Link>
        )}
        <PeriodDial
          only={copy.periods}
          period={period}
          customFrom=""
          customTo=""
          onPeriod={onPeriod}
          onCustomFrom={() => undefined}
          onCustomTo={() => undefined}
        />
      </div>
    </header>
  );
}

export default function MemberOverviewPage({ member }: { member: MemberOverview }) {
  const [period, setPeriod] = useState<DirectPeriod>('mtd');
  const [tab, setTab] = useState<MemberTab>('overview');
  const [tradeAccount, setTradeAccount] = useState(ALL_ACCOUNTS);
  const voice = memberVoiceCopy[member.voice];
  const networkRoot = member.cascadeId === null ? undefined : [mockCascade, ...descendantsOf(mockCascade)].find((node) => node.id === member.cascadeId);

  function isReady(id: MemberTab): boolean {
    if (id === 'overview') return true;
    if (id === 'network') return networkRoot !== undefined;
    if (id === 'symbols') return member.symbols !== null;
    if (id === 'trades') return member.trades !== null;
    return member.plan !== null;
  }

  function seeTrades(account: string) {
    setTradeAccount(account);
    setTab('trades');
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link href="/ib/network" className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          {copy.breadcrumbRoot}
        </Link>
        {member.trail.map((crumb) => (
          <span key={crumb.href} className="inline-flex items-center gap-1.5">
            <Icon name="chevronRight" size={13} className="text-fg-subtle" />
            <Link href={crumb.href} className="text-fg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
              {crumb.label}
            </Link>
          </span>
        ))}
        <Icon name="chevronRight" size={13} className="text-fg-subtle" />
        <span aria-current="page" className="font-semibold text-fg">
          {member.name}
        </span>
      </nav>

      <MemberHeader member={member} period={period} onPeriod={setPeriod} />

      <div role="tablist" className="flex flex-wrap gap-2">
        {member.tabs.map((id) => {
          const isActive = id === tab;
          const isEnabled = isReady(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!isEnabled}
              disabled={!isEnabled}
              onClick={() => setTab(id)}
              className={cx(
                'relative h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
                isActive ? 'bg-primary/15 text-fg ring-primary/50' : 'text-fg-muted ring-line hover:text-fg',
              )}
            >
              {copy.tabLabels[id]}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="flex animate-rise flex-col gap-6 motion-reduce:animate-none">
          {member.wallet ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
              <Downline member={member} />
              <Wallet member={member} wallet={member.wallet} />
            </div>
          ) : (
            <Downline member={member} />
          )}
          {member.links && <ReferralLinks member={member} links={member.links} />}
          {member.accounts && <TradingAccounts accounts={member.accounts} onSeeTrades={seeTrades} />}
          {member.history ? (
            <OwnTrading history={member.history} title={member.voice === 'client' ? null : copy.ownTradingTitle} />
          ) : (
            <p className="text-sm text-fg-muted">{copy.noOwnTrading}</p>
          )}
        </div>
      )}

      {tab === 'trades' && member.trades && (
        <div className="animate-rise motion-reduce:animate-none">
          <TradeDesk
            trades={member.trades}
            accounts={member.accounts ?? []}
            currency={member.currency}
            range={periodRange(period, '', '')}
            account={tradeAccount}
            onAccount={setTradeAccount}
          />
        </div>
      )}

      {tab === 'network' && networkRoot && (
        <div className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
          <p className="text-sm text-fg-muted">{voice.networkHint}</p>
          <section className="orbit-card p-4 sm:p-5">
            <CascadeTree root={networkRoot} currency={member.currency} />
          </section>
        </div>
      )}

      {tab === 'symbols' && member.symbols && (
        <div className="animate-rise motion-reduce:animate-none">
          <SymbolDesk symbols={member.symbols} currency={member.currency} ownClientsLabel={voice.symbolOwnClients} />
        </div>
      )}

      {tab === 'plan' && member.plan && (
        <div className="animate-rise motion-reduce:animate-none">
          <PlanDesk memberName={member.name} plan={member.plan} currency={member.currency} />
        </div>
      )}
    </div>
  );
}
