'use client';

import Link from 'next/link';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbActivity, IbDashboard, IbStats, IbTradeCommission } from '@/core/mock/ib';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { ACCENT, deskClass, stagger } from './ibDashboardKit';

/* ───────────── Ticker tape: every network stat scrolls past like a quote board ───────────── */

export function TickerTape({ stats }: { stats: IbStats }) {
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const quotes: { labelKey: MessageKey; value: string; isAlert?: boolean }[] = [
    { labelKey: 'ibDash.totalClients', value: String(stats.totalClients) },
    { labelKey: 'ibDash.totalDeposited', value: money(stats.totalDeposited) },
    { labelKey: 'ibDash.totalWithdrawal', value: money(stats.totalWithdrawal) },
    { labelKey: 'ibDash.totalEquity', value: money(stats.totalAvailableEquity) },
    { labelKey: 'ibDash.totalLot', value: stats.totalLot.toFixed(2) },
    { labelKey: 'ibDash.totalRebateGen', value: money(stats.totalRebateGenerated) },
    { labelKey: 'ibDash.availableRebate', value: money(stats.availableRebate) },
    { labelKey: 'ibDash.totalWithdrawalRebate', value: money(stats.totalWithdrawalRebate) },
    { labelKey: 'ibDash.marginBelow', value: String(stats.marginLevelBelow100), isAlert: stats.marginLevelBelow100 > 0 },
    { labelKey: 'ibDash.pendingRequests', value: String(stats.pendingRequests) },
  ];

  return (
    <section aria-label={translate('ibDash.title')} className="ibd-tape-wrap relative overflow-hidden rounded-full bg-fg text-app lg:col-span-12">
      <div className="ibd-tape flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
            {quotes.map((quote) => (
              <li key={quote.labelKey} className="flex items-center gap-2.5 border-r border-app/15 px-5 py-2.5 whitespace-nowrap">
                <span className={cx('size-1.5 rounded-full', quote.isAlert ? 'bg-danger' : 'bg-app/40')} />
                <span className="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-app/60 uppercase">{translate(quote.labelKey)}</span>
                <span className={cx('font-mono text-sm font-black tabular-nums', quote.isAlert && 'text-danger')}>{quote.value}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Commission candles: one candle per commission print, height = amount, colour = price move ───────────── */

function isTrade(item: IbActivity): item is IbTradeCommission {
  return item.kind === 'commission';
}

function CommissionCandles({ activity, currency }: { activity: IbActivity[]; currency: string }) {
  const trades = activity.filter(isTrade).slice().reverse();
  const maxAmount = Math.max(...trades.map((trade) => trade.amount), 0.01);

  if (trades.length === 0) return null;

  return (
    <div className="relative flex min-h-56 flex-col rounded-[18px] bg-fg/[0.03] p-4 ring-1 ring-line">
      <div className="flex items-center justify-between gap-2 font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
        <span>{translate('ibDash.commissionEarned')}</span>
        <span className="tabular-nums">{formatMoney(maxAmount, currency)}</span>
      </div>
      <div className="relative mt-3 flex flex-1 items-end gap-2 border-b border-dashed border-line-strong pb-1">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        <span aria-hidden="true" style={{ background: ACCENT }} className="ibd-scan pointer-events-none absolute inset-y-0 w-px opacity-80" />
        {trades.map((trade, index) => {
          const isUp = trade.exit >= trade.entry;
          const bodyPercent = Math.max(10, (trade.amount / maxAmount) * 100);
          const isLatest = index === trades.length - 1;
          return (
            <div key={trade.id} title={`${trade.symbol} · +${formatMoney(trade.amount, currency)}`} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span aria-hidden="true" className={cx('absolute bottom-0 w-px', isUp ? 'bg-success/50' : 'bg-danger/50')} style={{ height: `${Math.min(100, bodyPercent + 12)}%` }} />
              <span
                style={{ ...stagger(index, 110, 250), height: `${bodyPercent}%` }}
                className={cx('ibd-candle relative w-full max-w-7 rounded-[4px]', isUp ? 'bg-success' : 'bg-danger', isLatest && 'zenith-blink')}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {trades.map((trade) => (
          <span key={trade.id} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] text-fg-subtle tabular-nums">
            +{trade.amount}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Quote terminal: rebate as the "last price", partner identity, actions, watchlist dock ───────────── */

const dockLinks: { href: string; labelKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/network', labelKey: 'nav.ibMyNetwork', icon: 'user' },
  { href: '/ib/structure', labelKey: 'nav.ibSubIbStructure', icon: 'pieChart' },
  { href: '/ib/transfer-commission', labelKey: 'nav.ibTransferCommission', icon: 'transfer' },
  { href: '/ib/commission-history', labelKey: 'nav.ibCommissionHistory', icon: 'history' },
];

export function QuoteTerminal({ data }: { data: IbDashboard }) {
  const { stats } = data;
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const generated = stats.totalRebateGenerated;
  const availableShare = generated > 0 ? Math.min(1, stats.availableRebate / generated) : 0;
  const withdrawnShare = generated > 0 ? Math.min(1, stats.totalWithdrawalRebate / generated) : 0;
  const quoteRows: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibDash.totalRebateGen', value: money(generated) },
    { labelKey: 'ibDash.totalWithdrawalRebate', value: `${money(stats.totalWithdrawalRebate)} · ${Math.round(withdrawnShare * 100)}%` },
    { labelKey: 'ibDash.totalLot', value: stats.totalLot.toFixed(2) },
  ];

  return (
    <section className={cx(deskClass, 'animate-rise motion-reduce:animate-none lg:col-span-12')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.14em] text-fg uppercase">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-success" />
          </span>
          {translate('ibDash.badge')}
        </span>
        <button
          type="button"
          className="group/mp inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold text-fg ring-1 ring-line-strong transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {translate('ibDash.managerPortal')}
          <Icon name="arrowUpRight" size={13} className="transition-transform duration-300 group-hover/mp:rotate-45 motion-reduce:transition-none" />
        </button>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <h2 className="text-3xl leading-none font-black tracking-[-0.03em] text-fg sm:text-5xl">{translate('ibDash.title')}</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">{translate('ibDash.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.availableRebate')}</p>
              <p className="mt-1 font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">{money(stats.availableRebate)}</p>
            </div>
            <span className="mb-1 inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-1 font-mono text-xs font-black text-success tabular-nums">
              <Icon name="trendUp" size={12} />
              {Math.round(availableShare * 100)}%
            </span>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-[14px] bg-line ring-1 ring-line sm:grid-cols-3">
            {quoteRows.map((row, index) => (
              <div key={row.labelKey} style={stagger(index, 80, 200)} className="animate-feed-in bg-app px-3 py-2.5 motion-reduce:animate-none">
                <dt className="truncate font-mono text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate(row.labelKey)}</dt>
                <dd className="mt-1 truncate font-mono text-sm font-black text-fg tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>

          <button
            type="button"
            className="group/wd relative inline-flex h-12 items-center justify-center gap-2 self-start overflow-hidden rounded-full bg-success px-7 text-sm font-black text-white transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="ibd-sweep absolute inset-y-0 left-0 w-1/4 bg-white/35" />
            <Icon name="withdrawal" size={16} className="relative transition-transform duration-300 group-hover/wd:-translate-y-0.5 motion-reduce:transition-none" />
            <span className="relative">{translate('ibDash.withdraw')}</span>
          </button>
        </div>

        <CommissionCandles activity={data.activity} currency={stats.currency} />
      </div>

      <nav aria-label={translate('ibDash.title')} className="border-t border-line">
        <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {dockLinks.map((link, index) => (
            <li key={link.href} style={stagger(index, 80, 300)} className="animate-feed-in border-line motion-reduce:animate-none min-[420px]:odd:border-r lg:border-r lg:last:border-r-0">
              <Link
                href={link.href}
                className="group flex h-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-fg/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6"
              >
                <span className="font-mono text-[10px] font-black text-fg-subtle tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <Icon name={link.icon} size={15} className="shrink-0 text-fg-muted transition-colors group-hover:text-fg" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{translate(link.labelKey)}</span>
                <Icon name="arrowRight" size={14} className="shrink-0 text-fg-subtle transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
