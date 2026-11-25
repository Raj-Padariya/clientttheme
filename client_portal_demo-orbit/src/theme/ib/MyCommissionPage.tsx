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

const tabOrder: CommissionTab[] = ['earnings', 'payouts', 'distribute', 'plan'];
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const priceFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Wallet tiles: four balances, each with its own orbit ring ───────────── */

function WalletTiles({ wallet }: { wallet: CommissionWallet }) {
  const tiles: { label: string; hint: string; value: number; icon: IconName; isLive?: boolean }[] = [
    { label: copy.available, hint: copy.availableHint, value: wallet.available, icon: 'wallet', isLive: true },
    { label: copy.pending, hint: copy.pendingHint, value: wallet.pending, icon: 'clock' },
    { label: copy.earnedAllTime, hint: copy.earnedAllTimeHint, value: wallet.earnedAllTime, icon: 'trendUp' },
    { label: copy.paidOut, hint: copy.paidOutHint, value: wallet.paidOut, icon: 'checkCircle' },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile, index) => (
        <li key={tile.label} style={riseDelay(index)} className="orbit-card flex animate-rise items-center gap-4 p-4 motion-reduce:animate-none">
          <span className="relative grid size-12 shrink-0 place-items-center">
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-0 rounded-full border border-dashed',
                tile.isLive ? 'border-primary/60 motion-safe:animate-orbit [animation-duration:5s]' : 'border-primary/25',
              )}
            />
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Icon name={tile.icon} size={16} />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-fg-subtle">{tile.label}</span>
            <span className={cx('block font-mono text-2xl leading-tight font-bold tabular-nums', tile.isLive ? 'text-primary' : 'text-fg')}>
              {formatMoney(tile.value, wallet.currency)}
            </span>
            <span className="block text-sm text-fg-muted">{tile.hint}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ───────────── Payout bar ───────────── */

function PayoutBar({ wallet, onRequest }: { wallet: CommissionWallet; onRequest: () => void }) {
  const hasReady = wallet.available > 0;
  const hasOpenRequest = wallet.pending > 0;
  const title = hasReady
    ? copy.ready(formatMoney(wallet.available, wallet.currency))
    : hasOpenRequest
      ? copy.requested(formatMoney(wallet.pending, wallet.currency))
      : copy.nothingReady;

  return (
    <section className="orbit-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="relative grid size-3 place-items-center">
          {hasReady && <span className="absolute inset-0 animate-ping rounded-full bg-primary/40 [animation-duration:2.4s] motion-reduce:hidden" />}
          <span className={cx('size-2 rounded-full', hasReady ? 'bg-primary' : 'bg-line-strong')} />
        </span>
        <div>
          <p className="text-base font-bold text-fg">{title}</p>
          <p className="text-xs text-fg-subtle">{hasReady || !hasOpenRequest ? copy.readyHint : copy.requestedHint}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={!hasReady}
        onClick={onRequest}
        className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-xl bg-primary/20 px-5 text-sm font-semibold text-fg ring-1 ring-primary/50 transition-colors hover:bg-primary/30 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
      >
        {copy.requestPayout}
        <Icon name="arrowRight" size={14} className="text-primary" />
      </button>
    </section>
  );
}

/* ───────────── Tabs ───────────── */

function CommissionTabs({ tab, onTab }: { tab: CommissionTab; onTab: (tab: CommissionTab) => void }) {
  return (
    <div role="tablist" aria-label={copy.title} className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-surface-2/40 p-1 ring-1 ring-line sm:w-fit">
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
              'shrink-0 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-primary/20 text-fg ring-1 ring-primary/50' : 'text-fg-muted hover:text-fg',
            )}
          >
            {copy.tabs[id]}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Earnings: wallet movements on a timeline, running balance as a thin track ───────────── */

function MovementRow({ movement, currency, maxBalance, index }: { movement: WalletMovement; currency: string; maxBalance: number; index: number }) {
  const fill = maxBalance > 0 ? (movement.balanceAfter / maxBalance) * 100 : 0;
  const isCredit = movement.amount >= 0;

  return (
    <li
      style={riseDelay(index)}
      className="relative grid animate-rise gap-x-4 gap-y-2 py-4 pl-8 motion-reduce:animate-none md:grid-cols-[10rem_minmax(0,1fr)_7rem_11rem] md:items-center"
    >
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-[7px] border-l border-dashed border-primary/25" />
      <span aria-hidden="true" className="absolute top-1/2 left-0.5 size-3 -translate-y-1/2 rounded-full bg-surface ring-2 ring-primary/60" />
      <span className="font-mono text-xs text-fg-subtle">{movement.when}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-fg">{movement.symbol}</span>
          <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[10px] font-bold text-danger uppercase ring-1 ring-danger/30">{movement.side}</span>
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-fg-subtle">
          TA#{movement.account} · {lotsFormat.format(movement.lots)} {copy.lotsSuffix} · {priceFormat.format(movement.openPrice)} → {priceFormat.format(movement.closePrice)}
        </span>
      </span>
      <span className={cx('font-mono text-sm font-bold tabular-nums md:text-right', isCredit ? 'text-success' : 'text-danger')}>
        {isCredit ? '+ ' : '− '}
        {formatMoney(Math.abs(movement.amount), currency)}
      </span>
      <span className="flex items-center gap-3 md:justify-end">
        <span aria-hidden="true" className="h-1 w-16 overflow-hidden rounded-full bg-primary/10">
          <span className="block h-full rounded-full bg-primary/60" style={{ width: `${fill}%` }} />
        </span>
        <span className="font-mono text-sm text-fg-muted tabular-nums">{formatMoney(movement.balanceAfter, currency)}</span>
      </span>
    </li>
  );
}

function EarningsLedger({ movements, currency }: { movements: WalletMovement[]; currency: string }) {
  const [filter, setFilter] = useState<MovementFilter>('everything');
  const [query, setQuery] = useState('');
  const rows = filterMovements(movements, filter, query);
  const maxBalance = Math.max(0, ...movements.map((movement) => movement.balanceAfter));
  const columns = copy.columns;

  return (
    <section className="orbit-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Dropdown label={copy.filterLabel} value={filter} options={copy.filters} onChange={setFilter} icon="filter" className="sm:w-48" />
          <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl bg-surface/70 px-3.5 ring-1 ring-line-strong transition-colors focus-within:ring-primary sm:w-64">
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
          <span className="text-xs text-fg-subtle">{copy.ledgerHint}</span>
          <Link
            href="/ib/commission-history"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary/12 px-4 text-sm font-semibold text-fg ring-1 ring-primary/40 transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="history" size={15} className="text-primary" />
            {copy.commissionHistory}
          </Link>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden gap-x-4 border-b border-line pb-2 pl-8 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase md:grid md:grid-cols-[10rem_minmax(0,1fr)_7rem_11rem]"
      >
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
        <ul key={`${filter}-${query}`} aria-label={copy.tabs.earnings} className="flex flex-col divide-y divide-line/60">
          {rows.map((movement, index) => (
            <MovementRow key={movement.id} movement={movement} currency={currency} maxBalance={maxBalance} index={index} />
          ))}
        </ul>
      )}

      {rows.length > 0 && <p className="text-xs text-fg-subtle">{copy.showing(1, rows.length, rows.length)}</p>}
    </section>
  );
}

function PendingTab() {
  return (
    <section className="orbit-card flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="relative grid size-14 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-primary/40 motion-safe:animate-orbit [animation-duration:6s]" />
        <Icon name="fileText" size={20} className="text-primary" />
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
      <PayoutBar wallet={wallet} onRequest={requestPayout} />
      <CommissionTabs tab={tab} onTab={setTab} />

      <div role="tabpanel" aria-label={copy.tabs[tab]} className="animate-rise motion-reduce:animate-none" key={tab}>
        {tab === 'earnings' ? <EarningsLedger movements={mockWalletMovements} currency={wallet.currency} /> : <PendingTab />}
      </div>
    </div>
  );
}
