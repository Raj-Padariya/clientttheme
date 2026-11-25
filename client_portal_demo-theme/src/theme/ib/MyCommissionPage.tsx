'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import {
  filterMovements,
  mockCommissionWallet,
  mockWalletMovements,
  myCommissionCopy as copy,
  type CommissionTab,
  type CommissionWallet,
  type MovementFilter,
  type WalletMovement,
} from './ibMyCommissionData';

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const tabOrder: CommissionTab[] = ['earnings', 'payouts', 'distribute', 'plan'];
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const priceFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

/* ───────────── Wallet: available balance in a graphite vault, the other three as a stacked ledger ───────────── */

function WalletTiles({ wallet }: { wallet: CommissionWallet }) {
  const [lead, ...rest]: { label: string; hint: string; value: number; icon: IconName }[] = [
    { label: copy.available, hint: copy.availableHint, value: wallet.available, icon: 'wallet' },
    { label: copy.pending, hint: copy.pendingHint, value: wallet.pending, icon: 'clock' },
    { label: copy.earnedAllTime, hint: copy.earnedAllTimeHint, value: wallet.earnedAllTime, icon: 'trendUp' },
    { label: copy.paidOut, hint: copy.paidOutHint, value: wallet.paidOut, icon: 'checkCircle' },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="relative isolate flex animate-rise flex-col gap-2 overflow-hidden rounded-3xl bg-[#18181b] p-6 text-white ring-1 ring-primary/30 motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-20 -z-10 size-64 rounded-full bg-(--brand-gleam)/10 blur-3xl" />
        <Icon name={lead.icon} size={120} className="pointer-events-none absolute -top-6 -right-6 -z-10 text-white/[0.04]" />
        <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-(--brand-gleam) uppercase">
          <Icon name={lead.icon} size={13} />
          {lead.label}
        </span>
        <span className="mt-3 truncate font-mono text-4xl font-semibold text-(--brand-gleam) tabular-nums sm:text-5xl">{formatMoney(lead.value, wallet.currency)}</span>
        <span className="mt-auto pt-4 text-sm text-white/60">{lead.hint}</span>
      </div>

      <ul className={cx(cardClass, 'flex flex-col divide-y divide-line overflow-hidden')}>
        {rest.map((tile, index) => (
          <li key={tile.label} style={riseDelay(index + 1)} className="flex animate-rise items-center gap-4 px-5 py-4 motion-reduce:animate-none">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon name={tile.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">{tile.label}</span>
              <span className="block truncate text-xs text-fg-muted">{tile.hint}</span>
            </span>
            <span className="shrink-0 font-mono text-xl font-semibold text-fg tabular-nums">{formatMoney(tile.value, wallet.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Payout strip: dashed slip with the status line and one action ───────────── */

function PayoutStrip({ wallet, onRequest }: { wallet: CommissionWallet; onRequest: () => void }) {
  const hasReady = wallet.available > 0;
  const hasOpenRequest = wallet.pending > 0;
  const title = hasReady
    ? copy.ready(formatMoney(wallet.available, wallet.currency))
    : hasOpenRequest
      ? copy.requested(formatMoney(wallet.pending, wallet.currency))
      : copy.nothingReady;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border-2 border-dashed border-primary/35 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', hasReady ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-fg-muted ring-1 ring-line')}>
          <Icon name={hasReady ? 'wallet' : hasOpenRequest ? 'clock' : 'inbox'} size={16} />
        </span>
        <div>
          <p className="font-mono text-lg font-bold text-fg">{title}</p>
          <p className="text-sm text-fg-muted">{hasReady || !hasOpenRequest ? copy.readyHint : copy.requestedHint}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={!hasReady}
        onClick={onRequest}
        className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-xl bg-[#18181b] px-5 text-sm font-bold text-(--brand-gleam) ring-1 ring-primary/40 transition-[box-shadow] hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Icon name="wallet" size={15} />
        {copy.requestPayout}
      </button>
    </section>
  );
}

/* ───────────── Tabs: segmented pill bar ───────────── */

function CommissionTabs({ tab, onTab }: { tab: CommissionTab; onTab: (tab: CommissionTab) => void }) {
  return (
    <div role="tablist" aria-label={copy.title} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface p-1 shadow-card ring-1 ring-line">
      {tabOrder.map((id) => {
        const isActive = id === tab;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTab(id)}
            className={cx(
              'h-10 shrink-0 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-[#18181b] text-white' : 'text-fg-muted hover:text-fg',
            )}
          >
            {copy.tabs[id]}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Earnings ledger: dated entries, amount stamped in gold, balance carried on the right ───────────── */

function MovementEntry({ movement, currency, index }: { movement: WalletMovement; currency: string; index: number }) {
  const isCredit = movement.amount >= 0;
  const [day, time] = [movement.when.slice(0, -6), movement.when.slice(-5)];

  return (
    <li style={riseDelay(index)} className="grid animate-rise items-center gap-x-4 gap-y-2 py-4 motion-reduce:animate-none md:grid-cols-[8.5rem_minmax(0,1fr)_7rem_8rem]">
      <span className="flex items-baseline gap-2 md:flex-col md:gap-0">
        <span className="text-sm font-semibold text-fg">{day}</span>
        <span className="font-mono text-xs text-fg-subtle">{time}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#18181b] font-mono text-[10px] font-bold text-(--brand-gleam)">
          {movement.symbol.slice(0, 3)}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-fg">{movement.symbol}</span>
            <span className="rounded border border-danger/40 px-1.5 text-[10px] font-bold text-danger uppercase">{movement.side}</span>
          </span>
          <span className="block truncate font-mono text-[11px] text-fg-subtle">
            TA#{movement.account} · {lotsFormat.format(movement.lots)} {copy.lotsSuffix} · {priceFormat.format(movement.openPrice)} → {priceFormat.format(movement.closePrice)}
          </span>
        </span>
      </span>
      <span className={cx('font-mono text-sm font-bold tabular-nums md:text-right', isCredit ? 'text-success' : 'text-danger')}>
        {isCredit ? '+ ' : '− '}
        {formatMoney(Math.abs(movement.amount), currency)}
      </span>
      <span className="font-mono text-sm text-fg-muted tabular-nums md:text-right">{formatMoney(movement.balanceAfter, currency)}</span>
    </li>
  );
}

function EarningsLedger({ movements, currency }: { movements: WalletMovement[]; currency: string }) {
  const [filter, setFilter] = useState<MovementFilter>('everything');
  const [query, setQuery] = useState('');
  const rows = filterMovements(movements, filter, query);
  const columns = copy.columns;

  return (
    <section className={cx(cardClass, 'flex flex-col gap-4 p-5 sm:p-6')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Dropdown label={copy.filterLabel} value={filter} options={copy.filters} onChange={setFilter} icon="filter" className="sm:w-48" />
          <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 transition-colors focus-within:border-primary sm:w-64">
            <Icon name="search" size={15} className="shrink-0 text-fg-subtle" />
            <span className="sr-only">{copy.search}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-fg-subtle italic">{copy.ledgerHint}</span>
          <Link
            href="/ib/commission-history"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/50 px-4 text-sm font-semibold text-fg transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="history" size={15} className="text-primary" />
            {copy.commissionHistory}
          </Link>
        </div>
      </div>

      <div aria-hidden="true" className="hidden gap-x-4 border-b-2 border-primary/60 pb-2 text-[11px] font-bold text-fg-subtle uppercase md:grid md:grid-cols-[8.5rem_minmax(0,1fr)_7rem_8rem]">
        <span>{columns.when}</span>
        <span>{columns.what}</span>
        <span className="text-right">{columns.amount}</span>
        <span className="text-right">{columns.balanceAfter}</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Icon name="inbox" size={22} className="text-primary" />
          <p className="text-base font-bold text-fg">{copy.emptyTitle}</p>
          <p className="text-sm text-fg-muted">{copy.emptyBody}</p>
        </div>
      ) : (
        <ul key={`${filter}-${query}`} aria-label={copy.tabs.earnings} className="flex flex-col divide-y divide-line">
          {rows.map((movement, index) => (
            <MovementEntry key={movement.id} movement={movement} currency={currency} index={index} />
          ))}
        </ul>
      )}

      {rows.length > 0 && <p className="border-t border-line pt-3 text-xs text-fg-subtle">{copy.showing(1, rows.length, rows.length)}</p>}
    </section>
  );
}

function PendingTab() {
  return (
    <section className={cx(cardClass, 'flex flex-col items-center gap-3 px-4 py-14 text-center')}>
      <span className="grid size-12 place-items-center rounded-2xl bg-[#18181b] text-(--brand-gleam)">
        <Icon name="fileText" size={20} />
      </span>
      <p className="text-base font-bold text-fg">{translate('common.comingSoonTitle')}</p>
      <p className="max-w-sm text-sm text-fg-muted">{translate('common.comingSoonText')}</p>
    </section>
  );
}

export default function MyCommissionPage() {
  const [tab, setTab] = useState<CommissionTab>('earnings');
  const [wallet, setWallet] = useState<CommissionWallet>(mockCommissionWallet);

  function requestPayout() {
    setWallet((current) => ({ ...current, pending: current.pending + current.available, available: 0 }));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
        <p className="text-sm text-fg-muted">{copy.subtitle}</p>
      </header>

      <WalletTiles wallet={wallet} />
      <PayoutStrip wallet={wallet} onRequest={requestPayout} />
      <CommissionTabs tab={tab} onTab={setTab} />

      <div role="tabpanel" aria-label={copy.tabs[tab]} className="animate-rise motion-reduce:animate-none" key={tab}>
        {tab === 'earnings' ? <EarningsLedger movements={mockWalletMovements} currency={wallet.currency} /> : <PendingTab />}
      </div>
    </div>
  );
}
