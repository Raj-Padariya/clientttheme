'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
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
const tabIcons: Record<CommissionTab, IconName> = { earnings: 'trendUp', payouts: 'wallet', distribute: 'accounts', plan: 'fileText' };
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const priceFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SPLIT_BEADS = 32;
const BALANCE_DOTS = 10;
const CHART_ROWS = 10;

/*
 * Nova My Commission: a frosted wallet (lifetime earnings split into beads: paid out / pending / available) with its
 * payout strip, a dark card for the other balances, a vertical tab rail, and a ledger with a bead balance chart.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden';
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Wallet (frosted): available balance, bead split of lifetime earnings, payout strip ───────────── */

function WalletCard({ wallet, onRequest }: { wallet: CommissionWallet; onRequest: () => void }) {
  const available = useAnimatedNumber(wallet.available, 1200);
  const hasReady = wallet.available > 0;
  const hasOpenRequest = wallet.pending > 0;
  const title = hasReady
    ? copy.ready(formatMoney(wallet.available, wallet.currency))
    : hasOpenRequest
      ? copy.requested(formatMoney(wallet.pending, wallet.currency))
      : copy.nothingReady;

  // Lifetime earnings as one bead string: solid = paid out, ringed = pending, hollow dashed = still available.
  const whole = Math.max(wallet.earnedAllTime, wallet.paidOut + wallet.pending + wallet.available);
  const paidBeads = whole > 0 ? Math.round((wallet.paidOut / whole) * SPLIT_BEADS) : 0;
  const pendingBeads = whole > 0 ? Math.min(SPLIT_BEADS - paidBeads, Math.round((wallet.pending / whole) * SPLIT_BEADS)) : 0;
  const availableBeads = whole > 0 ? Math.min(SPLIT_BEADS - paidBeads - pendingBeads, Math.round((wallet.available / whole) * SPLIT_BEADS)) : 0;

  return (
    <FrostCard className="lg:col-span-7">
      <div className="flex h-full flex-col gap-5 text-[#0a1220]">
        <div className="flex items-center justify-between gap-3">
          <p className={cx('flex items-center gap-2 text-[#3b4658]', captionClass)}>
            <span className="grid size-7 place-items-center rounded-full bg-[#0a1220] text-white">
              <Icon name="wallet" size={13} />
            </span>
            {copy.available}
          </p>
          <span aria-hidden="true" className="relative grid size-12 place-items-center">
            {hasReady && <span className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-[#0a1220]/20 motion-reduce:hidden" />}
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/25 motion-reduce:animate-none" />
            <span className="grid size-8 animate-float place-items-center rounded-full bg-[#0a1220] text-white motion-reduce:animate-none">
              <Icon name="trendUp" size={14} />
            </span>
          </span>
        </div>

        <div>
          <p className="font-mono text-5xl leading-none font-black tracking-tight break-all tabular-nums sm:text-6xl">{formatMoney(available, wallet.currency)}</p>
          <p className="mt-2 text-sm text-[#3b4658]">{copy.availableHint}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span aria-hidden="true" className="relative flex items-center justify-between py-1.5">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-[#0a1220]/20" />
            {Array.from({ length: SPLIT_BEADS }, (_, bead) => {
              const isPaid = bead < paidBeads;
              const isPending = !isPaid && bead < paidBeads + pendingBeads;
              const isAvailable = !isPaid && !isPending && bead < paidBeads + pendingBeads + availableBeads;
              return (
                <span
                  key={bead}
                  style={{ animationDelay: `${bead * 28}ms` }}
                  className={cx(
                    'relative size-3 animate-dot-pop rounded-full motion-reduce:animate-none',
                    isPaid && 'bg-[#0a1220]',
                    isPending && 'bg-white ring-2 ring-[#0a1220]/60',
                    isAvailable && 'animate-blink border-2 border-dashed border-[#0a1220] bg-white',
                    !isPaid && !isPending && !isAvailable && 'bg-[#0a1220]/10',
                  )}
                />
              );
            })}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#3b4658]">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-[#0a1220]" />
              {copy.paidOut}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-white ring-2 ring-[#0a1220]/60" />
              {copy.pending}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-dashed border-[#0a1220] bg-white" />
              {copy.available}
            </span>
          </span>
        </div>

        {/* Payout strip. */}
        <section className={cx('mt-auto flex flex-col gap-3 rounded-[24px] p-3 pl-4 sm:flex-row sm:items-center sm:justify-between', frostChipClass)}>
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="relative grid size-3 shrink-0 place-items-center">
              {hasReady && <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />}
              <span className={cx('relative size-2.5 rounded-full', hasReady ? 'bg-success' : 'bg-[#0a1220]/25')} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black">{title}</p>
              <p className="text-xs text-[#3b4658]">{hasReady || !hasOpenRequest ? copy.readyHint : copy.requestedHint}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={!hasReady}
            onClick={onRequest}
            className="group/pay relative inline-flex h-11 w-fit shrink-0 items-center gap-2 overflow-hidden rounded-full bg-[#0a1220] py-1 pr-1 pl-5 text-sm font-bold text-white transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/pay:translate-x-full motion-reduce:hidden" />
            <span className="relative">{copy.requestPayout}</span>
            <span className="relative grid size-9 place-items-center rounded-full bg-white text-[#0a1220] transition-transform duration-300 group-hover/pay:translate-x-0.5">
              <Icon name="arrowRight" size={14} />
            </span>
          </button>
        </section>
      </div>
    </FrostCard>
  );
}

/* ───────────── Balances (dark): pending, earned all time, paid out ───────────── */

function BalanceRow({ label, hint, value, icon, currency, index }: { label: string; hint: string; value: number; icon: IconName; currency: string; index: number }) {
  const shown = useAnimatedNumber(value, 1100);
  return (
    <div style={{ animationDelay: `${200 + index * 110}ms` }} className="group/bal flex animate-feed-in items-center gap-4 py-4 first:pt-0 last:pb-0 motion-reduce:animate-none">
      <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-white/25 group-hover/bal:animate-rim-spin motion-reduce:group-hover/bal:animate-none" />
        <span className="grid size-9 place-items-center rounded-full bg-white text-[#0a1220]">
          <Icon name={icon} size={15} />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <dt className={cx(captionClass, 'truncate text-white/55')}>{label}</dt>
        <dd className="mt-0.5 truncate font-mono text-2xl font-black tracking-tight tabular-nums">{formatMoney(shown, currency)}</dd>
        <dd className="truncate text-[11px] text-white/45">{hint}</dd>
      </div>
    </div>
  );
}

function BalancesCard({ wallet }: { wallet: CommissionWallet }) {
  const rows: { label: string; hint: string; value: number; icon: IconName }[] = [
    { label: copy.pending, hint: copy.pendingHint, value: wallet.pending, icon: 'clock' },
    { label: copy.earnedAllTime, hint: copy.earnedAllTimeHint, value: wallet.earnedAllTime, icon: 'trendUp' },
    { label: copy.paidOut, hint: copy.paidOutHint, value: wallet.paidOut, icon: 'checkCircle' },
  ];

  return (
    <section style={{ animationDelay: '100ms' }} className={cx(inkClass, 'flex animate-rise flex-col justify-center p-5 motion-reduce:animate-none sm:p-6 lg:col-span-5')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(200deg,#000,transparent_70%)]')} />
      <dl className="relative divide-y-2 divide-dotted divide-white/15">
        {rows.map((row, index) => (
          <BalanceRow key={row.label} {...row} currency={wallet.currency} index={index} />
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Tab rail ───────────── */

function CommissionTabs({ tab, onTab }: { tab: CommissionTab; onTab: (tab: CommissionTab) => void }) {
  return (
    <div role="tablist" aria-label={copy.title} aria-orientation="vertical" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 lg:flex-col lg:overflow-visible">
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
              'group/tab flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-4 pl-1 text-sm font-bold whitespace-nowrap transition-[background-color,color,translate] duration-300 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            <span className="relative grid size-10 shrink-0 place-items-center">
              {isActive && <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-app/35 motion-reduce:animate-none" />}
              <span className={cx('grid size-8 place-items-center rounded-full transition-transform duration-300 group-hover/tab:rotate-12', isActive ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                <Icon name={tabIcons[id]} size={14} />
              </span>
            </span>
            <span className="flex-1 text-left">{copy.tabs[id]}</span>
            {isActive && <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-app motion-reduce:animate-none" />}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Earnings ledger: bead balance chart + movement tickets ───────────── */

// One column per listed movement (same order as the list), stacked to its balance after the move.
function BalanceBeads({ movements, maxBalance }: { movements: WalletMovement[]; maxBalance: number }) {
  return (
    <div aria-hidden="true" className="flex items-end gap-2 overflow-x-auto rounded-[22px] bg-fg/[0.03] px-4 pt-4 pb-3 ring-1 ring-line">
      {movements.map((movement, column) => {
        const lit = maxBalance > 0 ? Math.max(1, Math.round((movement.balanceAfter / maxBalance) * CHART_ROWS)) : 1;
        const isCredit = movement.amount >= 0;
        return (
          <span key={movement.id} className="flex shrink-0 flex-col-reverse items-center gap-1">
            {Array.from({ length: CHART_ROWS }, (_, row) => (
              <span
                key={row}
                style={row < lit ? { animationDelay: `${column * 60 + row * 35}ms` } : undefined}
                className={cx(
                  'size-2 rounded-full',
                  row < lit ? cx('animate-dot-pop motion-reduce:animate-none', row === lit - 1 ? (isCredit ? 'bg-success' : 'bg-danger') : 'bg-fg/70') : 'scale-75 bg-fg/8',
                )}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

function MovementTicket({ movement, currency, maxBalance, index }: { movement: WalletMovement; currency: string; maxBalance: number; index: number }) {
  const isCredit = movement.amount >= 0;
  const lit = maxBalance > 0 ? Math.round((movement.balanceAfter / maxBalance) * BALANCE_DOTS) : 0;

  return (
    <li
      style={riseDelay(index)}
      className="group grid animate-feed-in gap-x-4 gap-y-3 rounded-[24px] p-3 ring-1 ring-line transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:pl-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-fg/20 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
          <span className={cx('grid size-8 place-items-center rounded-full', isCredit ? 'bg-fg text-app' : 'bg-danger text-white')}>
            <Icon name="trendUp" size={14} className={cx(!isCredit && 'rotate-90')} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-fg">{movement.symbol}</span>
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-black tracking-[0.12em] text-fg-muted uppercase">{movement.side}</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-fg-subtle">
              <Icon name="clock" size={11} />
              {movement.when}
            </span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-fg-subtle">
            TA#{movement.account} · {lotsFormat.format(movement.lots)} {copy.lotsSuffix} · {priceFormat.format(movement.openPrice)} → {priceFormat.format(movement.closePrice)}
          </p>
        </div>
      </div>

      <span className={cx('font-mono text-base font-black tabular-nums md:text-right', isCredit ? 'text-success' : 'text-danger')}>
        {isCredit ? '+ ' : '− '}
        {formatMoney(Math.abs(movement.amount), currency)}
      </span>

      <span className="flex items-center gap-3 border-t-2 border-dotted border-line-strong pt-2 md:justify-end md:border-t-0 md:pt-0">
        <span aria-hidden="true" className="flex gap-0.5">
          {Array.from({ length: BALANCE_DOTS }, (_, dot) => (
            <span key={dot} className={cx('size-1.5 rounded-full', dot < lit ? 'bg-fg/70' : 'bg-fg/10')} />
          ))}
        </span>
        <span className="min-w-24 font-mono text-sm font-bold text-fg-muted tabular-nums md:text-right">{formatMoney(movement.balanceAfter, currency)}</span>
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
    <section className={cx(panelClass, 'flex flex-col gap-4 p-4 sm:p-5')}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Dropdown label={copy.filterLabel} value={filter} options={copy.filters} onChange={setFilter} icon="filter" className="sm:w-52" />
          <label className="group flex h-12 min-w-0 items-center gap-3 rounded-full py-1 pr-4 pl-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg sm:w-72">
            <span className="nova-gloss grid size-10 shrink-0 place-items-center rounded-full text-fg">
              <Icon name="search" size={15} />
            </span>
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
        <Link
          href="/ib/commission-history"
          className="group/link inline-flex h-11 w-fit items-center gap-2 rounded-full bg-fg py-1 pr-4 pl-1 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span className="grid size-9 place-items-center rounded-full bg-app text-fg">
            <Icon name="history" size={15} className="transition-transform duration-500 group-hover/link:-rotate-[360deg] motion-reduce:transition-none" />
          </span>
          {copy.commissionHistory}
        </Link>
      </div>

      <p className="flex items-center gap-2 text-xs text-fg-subtle">
        <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-fg/40 motion-reduce:animate-none" />
        {copy.ledgerHint}
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[26px] px-6 py-12 text-center ring-1 ring-line">
          <span aria-hidden="true" className="relative grid place-items-center">
            <span className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, dot) => (
                <span key={dot} style={{ animationDelay: `${(dot % 7) * 0.15}s` }} className="size-1.5 animate-blink rounded-full bg-fg/15 motion-reduce:animate-none" />
              ))}
            </span>
            <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
              <Icon name="inbox" size={20} />
            </span>
          </span>
          <div>
            <p className="text-base font-black text-fg">{copy.emptyTitle}</p>
            <p className="mt-1 text-sm text-fg-muted">{copy.emptyBody}</p>
          </div>
        </div>
      ) : (
        <div key={`${filter}-${query}`} className="flex flex-col gap-3">
          <BalanceBeads movements={rows} maxBalance={maxBalance} />

          <div aria-hidden="true" className="hidden items-center gap-3 border-b-2 border-dotted border-line-strong px-4 pb-2 md:flex">
            <span className={cx(captionClass, 'text-fg-subtle')}>{columns.when}</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-fg/30" />
            <span className={cx(captionClass, 'flex-1 text-fg-subtle')}>{columns.what}</span>
            <span className={cx(captionClass, 'text-fg-subtle')}>{columns.amount}</span>
            <span className={cx(captionClass, 'min-w-44 text-right text-fg-subtle')}>{columns.balanceAfter}</span>
          </div>

          <ul aria-label={copy.tabs.earnings} className="flex flex-col gap-2">
            {rows.map((movement, index) => (
              <MovementTicket key={movement.id} movement={movement} currency={currency} maxBalance={maxBalance} index={index} />
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && <p className="text-xs text-fg-subtle">{copy.showing(1, rows.length, rows.length)}</p>}
    </section>
  );
}

function PendingTab() {
  return (
    <section className={cx(panelClass, 'flex flex-col items-center gap-4 px-4 py-14 text-center')}>
      <span aria-hidden="true" className="relative grid place-items-center">
        <span className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, dot) => (
            <span key={dot} style={{ animationDelay: `${(dot % 7) * 0.15}s` }} className="size-1.5 animate-blink rounded-full bg-fg/15 motion-reduce:animate-none" />
          ))}
        </span>
        <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
          <Icon name="fileText" size={20} />
        </span>
      </span>
      <p className="text-base font-black text-fg">{translate('common.comingSoonTitle')}</p>
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
      <header className="flex animate-feed-in items-center gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="grid size-10 place-items-center rounded-full bg-fg text-app">
            <Icon name="wallet" size={17} />
          </span>
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{copy.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <WalletCard wallet={wallet} onRequest={requestPayout} />
        <BalancesCard wallet={wallet} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <CommissionTabs tab={tab} onTab={setTab} />
        </div>
        <div role="tabpanel" aria-label={copy.tabs[tab]} className="min-w-0 animate-rise motion-reduce:animate-none" key={tab}>
          {tab === 'earnings' ? <EarningsLedger movements={mockWalletMovements} currency={wallet.currency} /> : <PendingTab />}
        </div>
      </div>
    </div>
  );
}
