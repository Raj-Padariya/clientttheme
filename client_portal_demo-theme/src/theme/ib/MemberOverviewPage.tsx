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

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const ALL_ACCOUNTS = 'all';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[11px] font-bold tracking-[0.2em] text-fg-subtle uppercase">
      <span aria-hidden="true" className="h-px w-6 bg-primary" />
      {children}
    </h2>
  );
}

function SearchField({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cx('flex h-10 min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 transition-colors focus-within:border-primary', className)}>
      <Icon name="search" size={15} className="shrink-0 text-fg-subtle" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
      />
    </label>
  );
}

/* ───────────── Wallet strip: available balance on a graphite vault, the other three as a flow ───────────── */

function WalletStrip({ member, wallet }: { member: MemberOverview; wallet: NonNullable<MemberOverview['wallet']> }) {
  const voice = memberVoiceCopy[member.voice];
  const { currency } = member;
  const figures: { label: string; hint: string; value: number; icon: IconName; emphasis?: boolean }[] = [
    { label: copy.pending, hint: copy.pendingHint, value: wallet.pending, icon: 'clock' },
    { label: copy.earnedAllTime, hint: voice.earnedAllTimeHint, value: wallet.earnedAllTime, icon: 'trophy', emphasis: true },
    { label: copy.paidOut, hint: copy.paidOutHint, value: wallet.paidOut, icon: 'checkCircle' },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="relative isolate flex flex-col overflow-hidden rounded-3xl bg-[#18181b] p-6 text-white ring-1 ring-primary/30">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-20 -z-10 size-64 rounded-full bg-(--brand-gleam)/10 blur-3xl" />
        <span aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-(--brand-gleam) to-transparent" />
        <p className="text-[10px] font-bold tracking-[0.2em] text-(--brand-gleam) uppercase">{voice.walletTitle}</p>
        <p className="mt-4 text-xs text-white/55">{copy.available(currency)}</p>
        <p className="truncate font-mono text-4xl font-semibold text-(--brand-gleam) tabular-nums">{formatMoney(wallet.available, currency)}</p>
        <p className="mt-auto pt-3 text-xs text-white/50">{voice.availableHint}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {figures.map((figure, index) => (
          <li
            key={figure.label}
            style={riseDelay(index)}
            className={cx(
              'relative flex animate-rise flex-col gap-1 overflow-hidden rounded-3xl border bg-surface p-5 shadow-card motion-reduce:animate-none',
              figure.emphasis ? 'border-primary/40' : 'border-line',
            )}
          >
            {figure.emphasis && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
            <span className={cx('mb-2 grid size-8 place-items-center rounded-lg', figure.emphasis ? 'bg-primary/15 text-primary' : 'bg-surface-2 text-fg-muted')}>
              <Icon name={figure.icon} size={14} />
            </span>
            <span className="text-xs font-semibold text-fg-muted">{figure.label}</span>
            <span className={cx('truncate font-mono text-2xl font-semibold tabular-nums', figure.emphasis ? 'text-primary' : 'text-fg')}>{formatMoney(figure.value, currency)}</span>
            <span className="text-xs text-fg-subtle">{figure.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Downline / funding statement: headcount (IB pages), funding sum, standing ───────────── */

function StatementLine({ label, hint, value, sign, strong }: { label: string; hint: string; value: string; sign?: string; strong?: boolean }) {
  return (
    <div className={cx('flex items-baseline justify-between gap-4 py-3', strong && 'border-t-2 border-primary/50')}>
      <span className="min-w-0">
        <span className={cx('block text-sm text-fg', strong ? 'font-bold' : 'font-medium')}>{label}</span>
        <span className="block text-xs text-fg-subtle">{hint}</span>
      </span>
      <span className={cx('shrink-0 font-mono tabular-nums', strong ? 'text-xl font-bold text-primary' : 'text-lg font-semibold text-fg')}>
        {sign && <span className="mr-1 text-fg-subtle">{sign}</span>}
        {value}
      </span>
    </div>
  );
}

function DownlineStatement({ member }: { member: MemberOverview }) {
  const voice = memberVoiceCopy[member.voice];
  const { currency, downline } = member;

  return (
    <section className={cx(cardClass, 'flex flex-col gap-5 p-6')}>
      {downline && <SectionTitle>{voice.downlineTitle}</SectionTitle>}

      <div className={cx('grid gap-6', downline ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        {downline && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="font-mono text-4xl font-bold text-fg tabular-nums">
                {downline.ownClients}
                <span className="text-fg-subtle"> / {downline.branchClients}</span>
              </p>
              <p className="text-sm font-semibold text-fg">{copy.clients}</p>
              <p className="text-xs text-fg-subtle">{voice.clientsHint}</p>
            </div>
            <div>
              <p className="font-mono text-4xl font-bold text-fg tabular-nums">{downline.subIbs}</p>
              <p className="text-sm font-semibold text-fg">{copy.subIbs}</p>
              <p className="text-xs text-fg-subtle">{voice.subIbsHint}</p>
            </div>
          </div>
        )}

        <div className={cx('flex flex-col', downline ? 'md:border-x md:border-line md:px-6' : 'md:border-r md:border-line md:pr-6')}>
          <StatementLine label={copy.deposits} hint={voice.depositsHint} value={formatMoney(member.deposits, currency)} sign="+" />
          <StatementLine label={copy.withdrawals} hint={voice.withdrawalsHint} value={formatMoney(member.withdrawals, currency)} sign="−" />
          <StatementLine label={copy.netFunding} hint={copy.netFundingHint} value={formatMoney(member.deposits - member.withdrawals, currency)} strong />
        </div>

        <div className="flex flex-col divide-y divide-line">
          <StatementLine label={copy.equity} hint={copy.equityHint} value={formatMoney(member.equity, currency)} />
          <StatementLine label={copy.lots} hint={voice.lotsHint} value={lotsFormat.format(member.lots)} />
          <div className="flex items-baseline justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{copy.youEarned}</span>
              <span className="block text-xs text-fg-subtle">{voice.youEarnedHint}</span>
            </span>
            <span className="shrink-0 font-mono text-lg font-semibold text-primary tabular-nums">{formatMoney(member.earned, currency)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Referral links: compact cards ───────────── */

function ReferralLinks({ member, links }: { member: MemberOverview; links: NonNullable<MemberOverview['links']> }) {
  const columns = copy.linkColumns;
  return (
    <section className={cx(cardClass, 'flex flex-col gap-4 p-6')}>
      <SectionTitle>{memberVoiceCopy[member.voice].referralTitle}</SectionTitle>
      <ul className="grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <li key={link.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-fg-subtle">{columns.link}</p>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                  <span className="truncate">{link.name}</span>
                  {link.isDefault && <span className="rounded border border-primary/50 px-1.5 text-[9.5px] font-bold text-primary">{copy.defaultTag}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-fg-subtle">{columns.status}</p>
                <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', link.isOn ? 'text-primary' : 'text-fg-subtle')}>
                  <span className={cx('size-2 rounded-full', link.isOn ? 'bg-primary' : 'bg-line')} />
                  {link.isOn ? copy.statusOn : copy.statusOff}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-fg-subtle">{columns.code}</p>
              <p className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-center font-mono text-sm tracking-[0.25em] text-fg">{link.code}</p>
            </div>
            <dl className="grid grid-cols-2 divide-x divide-line rounded-xl bg-surface-2">
              <div className="px-3 py-2">
                <dt className="text-[10px] text-fg-subtle">{columns.signedUp}</dt>
                <dd className="font-mono text-base font-bold text-fg tabular-nums">{link.signedUp}</dd>
              </div>
              <div className="px-3 py-2">
                <dt className="text-[10px] text-fg-subtle">{columns.funded}</dt>
                <dd className="font-mono text-base font-bold text-fg tabular-nums">{link.funded}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Trading accounts (client pages): ledger rows with a gold edge ───────────── */

function TradingAccounts({ accounts, onSeeTrades }: { accounts: TradingAccount[]; onSeeTrades: (account: string) => void }) {
  return (
    <section className={cx(cardClass, 'flex flex-col gap-4 p-6')}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{copy.tradingAccounts}</SectionTitle>
        <span className="text-xs text-fg-subtle">{copy.accountCount(accounts.length)}</span>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {accounts.map((account, index) => (
          <li key={account.number} style={riseDelay(index)} className="flex animate-rise flex-col gap-3 py-4 motion-reduce:animate-none sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span aria-hidden="true" className="h-10 w-1 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono font-bold text-fg">#{account.number}</span>
                  <span className="rounded border border-primary/50 px-1.5 text-[9.5px] font-bold text-primary">{account.currency}</span>
                  <span className="text-fg-muted">{account.group}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-fg-subtle">
                  <span>
                    {copy.balance} <span className="font-mono font-semibold text-fg">{formatMoney(account.balance, account.currency)}</span>
                  </span>
                  <span>
                    {copy.equity} <span className="font-mono font-semibold text-fg">{formatMoney(account.equity, account.currency)}</span>
                  </span>
                  <span className="font-mono">
                    {lotsFormat.format(account.lots)} {copy.lotsSuffix}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSeeTrades(account.number)}
              className="inline-flex w-fit shrink-0 items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {copy.seeTrades}
              <Icon name="chevronRight" size={12} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── History ───────────── */

function HistoryCard({ history, title }: { history: { label: string; date: string }[]; title: string | null }) {
  return (
    <section className={cx(cardClass, 'flex flex-col gap-4 p-6')}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-fg">{copy.historyTitle}</p>
        <span className="text-xs text-fg-subtle">{copy.historyOrder}</span>
      </div>
      <ol className="flex flex-col divide-y divide-line">
        {history.map((event) => (
          <li key={`${event.label}-${event.date}`} className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3 text-sm font-semibold text-fg">
              <span aria-hidden="true" className="size-2 rotate-45 bg-primary" />
              {event.label}
            </span>
            <span className="font-mono text-xs text-fg-subtle">{event.date}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Trades: account / side / symbol filters over a closed-trade ledger ───────────── */

function TradeLedger({ trades, accounts, currency, range, account, onAccount }: {
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

  return (
    <section className={cx(cardClass, 'flex flex-col overflow-hidden')}>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-6 md:flex-row md:items-center">
        <Dropdown label={copy.accountLabel} value={account} options={accountOptions} onChange={onAccount} icon="accounts" className="md:w-52" />
        <div role="radiogroup" aria-label={columns.side} className="inline-flex w-fit overflow-hidden rounded-xl border border-line">
          {copy.sides.map((option, index) => {
            const isActive = option.id === side;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSide(option.id)}
                className={cx(
                  'h-10 px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  index > 0 && 'border-l border-line',
                  isActive ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <SearchField value={symbol} onChange={setSymbol} placeholder={copy.tradeSymbol} className="flex-1 md:max-w-xs" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-dashed border-primary/50 text-primary">
            <Icon name="history" size={20} />
          </span>
          <p className="text-base font-bold text-fg">{copy.tradesEmptyTitle}</p>
          <p className="max-w-sm text-sm text-fg-muted">{copy.tradesEmptyBody}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                <th scope="col" className="px-4 py-3 text-left">{columns.closed}</th>
                <th scope="col" className="px-4 py-3 text-left">{columns.account}</th>
                <th scope="col" className="px-4 py-3 text-left">{columns.side}</th>
                <th scope="col" className="px-4 py-3 text-left">{columns.symbol}</th>
                <th scope="col" className="px-4 py-3 text-right">{columns.lots}</th>
                <th scope="col" className="px-4 py-3 text-right">{columns.commission}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-4 py-3.5 font-mono text-xs text-fg-muted">{trade.closedAt}</td>
                  <td className="px-4 py-3.5 font-mono text-fg">#{trade.account}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-fg uppercase">{trade.side}</td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-fg">{trade.symbol}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-fg tabular-nums">{lotsFormat.format(trade.lots)}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-primary tabular-nums">{formatMoney(trade.commission, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ───────────── Symbol-wise commission: ledger with a graphite total line ───────────── */

function SymbolLedger({ symbols, currency, ownClientsLabel }: { symbols: SymbolCommission[]; currency: string; ownClientsLabel: string }) {
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
  const cell = 'px-4 py-3.5 text-right font-mono tabular-nums';

  return (
    <section className={cx(cardClass, 'flex flex-col overflow-hidden')}>
      <div className="flex flex-col gap-3 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-y border-line text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
              <th scope="col" className="px-4 py-3 text-left">{columns.pair}</th>
              <th scope="col" className="px-4 py-3 text-right">{columns.trades}</th>
              <th scope="col" className="px-4 py-3 text-right">{columns.lots}</th>
              <th scope="col" className="px-4 py-3 text-right">{ownClientsLabel}</th>
              <th scope="col" className="px-4 py-3 text-right">{columns.subIbs}</th>
              <th scope="col" className="px-4 py-3 text-right">{columns.earned}</th>
              <th scope="col" className="w-48 px-4 py-3 text-left">{columns.share}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-fg-muted">
                  {copy.symbolEmpty}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const percent = totalEarned > 0 ? (row.earned / totalEarned) * 100 : 0;
              return (
                <tr key={row.pair}>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-3 font-mono font-bold text-fg">
                      <span aria-hidden="true" className="h-6 w-1 rounded-full bg-primary" />
                      {row.pair}
                    </span>
                  </td>
                  <td className={cx(cell, 'text-fg')}>{row.trades}</td>
                  <td className={cx(cell, 'text-fg')}>{lotsFormat.format(row.lots)}</td>
                  <td className={cx(cell, 'text-fg')}>{formatMoney(row.fromOwnClients, currency)}</td>
                  <td className={cx(cell, 'text-fg')}>{formatMoney(row.fromSubIbs, currency)}</td>
                  <td className={cx(cell, 'font-semibold text-primary')}>{formatMoney(row.earned, currency)}</td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </span>
                      <span className="font-mono text-xs font-semibold text-fg tabular-nums">{Math.round(percent)}%</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-[#18181b] text-white">
                <th scope="row" className="px-4 py-3.5 text-left text-sm font-bold">{copy.symbolTotal(currency)}</th>
                <td className={cx(cell, 'font-bold')}>{totalTrades}</td>
                <td className={cx(cell, 'font-bold')}>{lotsFormat.format(totalLots)}</td>
                <td />
                <td />
                <td className={cx(cell, 'font-bold text-(--brand-gleam)')}>{formatMoney(totalEarned, currency)}</td>
                <td className="px-4 py-3.5 font-mono font-bold tabular-nums">{totalEarned > 0 ? '100%' : '0%'}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

/* ───────────── Commission plan: rate sheet per group + "Change plan" ───────────── */

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
    <Modal
      open={open}
      onClose={close}
      title={copy.moveTitle(memberName)}
      description={copy.moveHint}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canMove}
            onClick={() => {
              if (picked === null) return;
              onMove(picked);
              close();
            }}
            className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.moveThem}
          </button>
          <button
            type="button"
            onClick={close}
            className="h-10 rounded-xl border border-line px-5 text-sm font-semibold text-fg transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            {copy.cancel}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <SearchField value={query} onChange={setQuery} placeholder={copy.searchPlans} />
        {plans.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-muted">{copy.noPlanMatch}</p>
        ) : (
          <ul role="radiogroup" aria-label={copy.searchPlans} className="flex flex-col divide-y divide-line rounded-2xl border border-line">
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
                      'flex w-full items-center gap-3 p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
                      isPicked ? 'bg-primary/10' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className={cx('grid size-4 shrink-0 place-items-center rounded-full border-2', isPicked ? 'border-primary' : 'border-line')}>
                      {isPicked && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                        {plan.name}
                        {isCurrent && <span className="rounded border border-line px-1.5 text-[9.5px] font-bold text-fg-subtle">{copy.onItNow}</span>}
                      </span>
                      <span className="block text-xs text-fg-subtle">{copy.partnersOnIt(plan.partners)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function PlanSheet({ memberName, plan, currency }: { memberName: string; plan: MemberPlan; currency: string }) {
  const [planId, setPlanId] = useState(plan.planId);
  const [isMoving, setIsMoving] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => new Set());
  const planName = yourPlans.find((option) => option.id === planId)?.name ?? plan.name;

  function toggle(name: string) {
    setClosedGroups((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-bold text-fg">
            <span aria-hidden="true" className="size-2.5 rotate-45 bg-primary" />
            {planName}
          </p>
          <p className="mt-1 text-xs text-fg-muted">{copy.planGiven(plan.givenOn, plan.givenBy)}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsMoving(true)}
          className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xl border border-primary/60 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          {copy.changePlan}
          <Icon name="chevronRight" size={12} />
        </button>
      </div>

      {plan.groups.map((group, index) => {
        const isOpen = !closedGroups.has(group.name);
        const panelId = `plan-group-${index}`;
        return (
          <section key={group.name} className={cx(cardClass, 'overflow-hidden')}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(group.name)}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="text-sm font-bold text-fg">{group.name}</span>
              <span className="flex items-center gap-3">
                <span className="rounded border border-primary/50 px-2 py-0.5 text-[11px] font-semibold text-primary">{copy.rateCount(group.rates.length)}</span>
                <Icon name="chevronRight" size={14} className={cx('text-fg-subtle transition-transform duration-300', isOpen ? '-rotate-90' : 'rotate-90')} />
              </span>
            </button>
            {isOpen && (
              <div id={panelId} className="flex flex-col gap-5 border-t border-line p-6">
                <div className="flex flex-col gap-3">
                  <SectionTitle>{copy.rebateTitle}</SectionTitle>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                        <th scope="col" className="py-2.5 text-left">{copy.instrumentType}</th>
                        <th scope="col" className="py-2.5 text-right">{copy.theirRate}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {group.rates.map((rate) => (
                        <tr key={rate.instrumentType}>
                          <td className="py-3 text-fg">{rate.instrumentType}</td>
                          <td className="py-3 text-right font-mono font-bold text-primary tabular-nums">{formatMoney(rate.ratePerLot, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2">
                  <SectionTitle>{copy.perSymbolTitle}</SectionTitle>
                  {group.symbolRules.length === 0 ? (
                    <p className="text-sm text-fg-muted">{copy.perSymbolEmpty}</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-line">
                      {group.symbolRules.map((rule) => (
                        <li key={rule.symbol} className="flex items-center justify-between gap-3 py-3 text-sm">
                          <span className="font-mono text-fg">{rule.symbol}</span>
                          <span className="font-mono font-bold text-primary tabular-nums">{formatMoney(rule.ratePerLot, currency)}</span>
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

export default function MemberOverviewPage({ member }: { member: MemberOverview }) {
  const [period, setPeriod] = useState<DirectPeriod>('mtd');
  const [tab, setTab] = useState<MemberTab>('overview');
  const [tradeAccount, setTradeAccount] = useState(ALL_ACCOUNTS);
  const voice = memberVoiceCopy[member.voice];
  const networkRoot = member.cascadeId === null ? undefined : [mockCascade, ...descendantsOf(mockCascade)].find((node) => node.id === member.cascadeId);
  const facts = [member.email, ...member.facts];

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

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#18181b] font-mono text-2xl font-bold text-(--brand-gleam) shadow-card">
            {member.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-fg">
              {member.name}
              {member.tags.map((tag) => (
                <span
                  key={tag.label}
                  className={cx(
                    'rounded px-2 py-0.5 text-[10px] font-bold',
                    tag.tone === 'role' ? 'bg-primary text-primary-fg' : 'border border-line text-fg-muted',
                  )}
                >
                  {tag.label}
                </span>
              ))}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
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
        <div className="flex flex-col gap-3 sm:items-end">
          {member.upline && (
            <Link
              href={member.upline.href}
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-line px-3.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="chevronRight" size={12} className="-rotate-90 text-primary" />
              {copy.upline(member.upline.label)}
            </Link>
          )}
          <PeriodDial
            only={copy.periods}
            period={period}
            customFrom=""
            customTo=""
            onPeriod={setPeriod}
            onCustomFrom={() => undefined}
            onCustomTo={() => undefined}
          />
        </div>
      </header>

      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-line">
        {member.tabs.map((id) => {
          const isActive = id === tab;
          const isEnabled = isReady(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!isEnabled}
              onClick={() => setTab(id)}
              className={cx(
                '-mb-px shrink-0 border-b-2 pb-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
                isActive ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {copy.tabLabels[id]}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="flex animate-rise flex-col gap-6 motion-reduce:animate-none">
          {member.wallet && <WalletStrip member={member} wallet={member.wallet} />}
          <DownlineStatement member={member} />
          {member.links && <ReferralLinks member={member} links={member.links} />}
          {member.accounts && <TradingAccounts accounts={member.accounts} onSeeTrades={seeTrades} />}
          {member.history ? (
            <HistoryCard history={member.history} title={member.voice === 'client' ? null : copy.ownTradingTitle} />
          ) : (
            <p className="text-sm text-fg-muted">{copy.noOwnTrading}</p>
          )}
        </div>
      )}

      {tab === 'trades' && member.trades && (
        <div className="animate-rise motion-reduce:animate-none">
          <TradeLedger
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
          <section className={cx(cardClass, 'p-4 sm:p-6')}>
            <CascadeTree root={networkRoot} currency={member.currency} />
          </section>
        </div>
      )}

      {tab === 'symbols' && member.symbols && (
        <div className="animate-rise motion-reduce:animate-none">
          <SymbolLedger symbols={member.symbols} currency={member.currency} ownClientsLabel={voice.symbolOwnClients} />
        </div>
      )}

      {tab === 'plan' && member.plan && (
        <div className="animate-rise motion-reduce:animate-none">
          <PlanSheet memberName={member.name} plan={member.plan} currency={member.currency} />
        </div>
      )}
    </div>
  );
}
