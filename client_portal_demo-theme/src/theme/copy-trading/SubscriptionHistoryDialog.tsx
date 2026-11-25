'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import {
  copierSubscriptions,
  subscriptionHistoryCopy as copy,
  type CopierSubscriptionHistory,
  type CopierSubscriptionPeriod,
  type CopierTrade,
  type MasterCopierRow,
} from './myPlansData';

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

/** Lifetime statement: P&L with the commission share drawn as a gold slice of the same bar. */
function LifetimeStatement({ history }: { history: CopierSubscriptionHistory }) {
  const commissionShare = history.lifetimePnl > 0 ? Math.min(100, (history.lifetimeCommission / history.lifetimePnl) * 100) : 0;

  return (
    <section className="rounded-xl border border-line bg-surface-2/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{copy.lifetimePnl}</p>
          <p className={cx('mt-1 font-mono text-2xl font-semibold tabular-nums', toneOf(history.lifetimePnl))}>{formatUsd(history.lifetimePnl)}</p>
        </div>
        <div className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center">
          <p className="font-mono text-xl leading-none font-bold text-primary tabular-nums">{history.totalSubscriptions}</p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.1em] text-fg-muted uppercase">{copy.totalSubscriptions}</p>
        </div>
      </div>

      <div aria-hidden="true" className="mt-4 flex h-2 overflow-hidden rounded-full bg-fg/[0.06]">
        <span className="h-full bg-success/50" style={{ width: `${100 - commissionShare}%` }} />
        <span className="h-full bg-primary" style={{ width: `${commissionShare}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-fg-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          {copy.lifetimeCommission}
        </span>
        <span className="font-mono font-semibold text-fg tabular-nums">{formatUsd(history.lifetimeCommission)}</span>
      </div>
    </section>
  );
}

function TradesList({ trades }: { trades: CopierTrade[] }) {
  const maxAbsProfit = Math.max(...trades.map((trade) => Math.abs(trade.profit)), 1);

  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-line">
      <table className="w-full min-w-[600px] text-xs">
        <thead className="sticky top-0 z-10 bg-elevated">
          <tr className="text-left text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
            {[copy.symbol, copy.side, copy.volume, copy.open, copy.close, copy.profit, copy.closedAt].map((header) => (
              <th key={header} scope="col" className="border-b border-line px-3 py-2.5 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {trades.map((trade, index) => (
            <tr key={index} className="odd:bg-fg/[0.015] hover:bg-primary/[0.06]">
              <td className="px-3 py-2 font-semibold text-fg">{trade.symbol}</td>
              <td className={cx('px-3 py-2 font-bold tracking-wide', trade.side === 'BUY' ? 'text-success' : 'text-danger')}>{trade.side}</td>
              <td className="px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.volume.toFixed(2)}</td>
              <td className="px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.open}</td>
              <td className="px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.close}</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-fg/[0.06]">
                    <span
                      className={cx('block h-full rounded-full', trade.profit < 0 ? 'bg-danger/70' : 'bg-success/70')}
                      style={{ width: `${(Math.abs(trade.profit) / maxAbsProfit) * 100}%` }}
                    />
                  </span>
                  <span className={cx('font-mono font-semibold tabular-nums', toneOf(trade.profit))}>{formatUsd(trade.profit)}</span>
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-fg-muted">{trade.closedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One subscription period as a ticket: numbered stub on the left, perforation, details on the right. */
function PeriodTicket({ period }: { period: CopierSubscriptionPeriod }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isSubscribed = period.status === 'subscribed';
  const metrics = [
    { label: copy.equityAtSubscribe, value: formatUsd(period.equityAtSubscribe), tone: 'text-fg' },
    { label: copy.periodPnl, value: formatUsd(period.periodPnl), tone: toneOf(period.periodPnl) },
    { label: copy.commission, value: formatUsd(period.commission), tone: 'text-primary' },
    { label: copy.trades, value: String(period.tradeCount), tone: 'text-fg' },
  ];

  return (
    <li className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col sm:flex-row">
        <div className="relative flex shrink-0 items-center gap-3 border-b border-dashed border-line bg-primary/[0.06] px-4 py-3 sm:w-28 sm:flex-col sm:justify-center sm:border-r sm:border-b-0 sm:py-5">
          <span aria-hidden="true" className="absolute -top-2 -right-2 hidden size-4 rounded-full bg-elevated ring-1 ring-line sm:block" />
          <span aria-hidden="true" className="absolute -right-2 -bottom-2 hidden size-4 rounded-full bg-elevated ring-1 ring-line sm:block" />
          <span className="font-mono text-3xl leading-none font-bold text-primary">#{period.index}</span>
          <span
            className={cx(
              'rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1',
              isSubscribed ? 'bg-success/12 text-success ring-success/30' : 'bg-fg/[0.06] text-fg-muted ring-line',
            )}
          >
            {isSubscribed ? copy.subscribed : copy.unsubscribed}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center gap-2 text-[11px] text-fg-muted">
            <time className="shrink-0">{period.start}</time>
            <span aria-hidden="true" className="relative h-px flex-1 border-t border-dashed border-primary/40">
              <span className="absolute -top-[3px] left-0 size-1.5 rounded-full bg-primary" />
              <span className="absolute -top-[3px] right-0 size-1.5 rounded-full bg-primary" />
            </span>
            <time className="shrink-0">{period.end}</time>
          </div>
          <p className="mt-1 text-center">
            <span title={`${period.durationDays}d`} className="inline-flex items-center gap-1 font-mono text-[10.5px] text-fg-subtle tabular-nums">
              <Icon name="clock" size={11} />
              {period.durationDays.toFixed(2)}d
            </span>
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 border-l-2 border-primary/30 pl-2.5">
                <dt className="truncate text-[10px] font-semibold tracking-[0.1em] text-fg-subtle uppercase">{metric.label}</dt>
                <dd className={cx('mt-0.5 font-mono text-[15px] font-semibold tabular-nums', metric.tone)}>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-center gap-2 border-t border-line text-sm font-medium text-fg-muted transition-colors hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        {open ? copy.hideTrades(period.tradeCount) : copy.showTrades(period.tradeCount)}
        <Icon name="chevronDown" size={15} className={cx('transition-transform duration-300 motion-reduce:transition-none', open && 'rotate-180')} />
      </button>

      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden" inert={!open}>
          <div className="border-t border-line p-3">
            <TradesList trades={period.trades} />
            {period.trades.length < period.tradeCount && (
              <p className="mt-2 text-right text-[11px] text-fg-subtle tabular-nums">{copy.loaded(period.trades.length, period.tradeCount)}</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function SubscriptionHistoryDialog({ copier, onClose }: { copier: MasterCopierRow | null; onClose: () => void }) {
  const history = copier ? copierSubscriptions[copier.id] : undefined;

  return (
    <Modal
      open={copier !== null}
      onClose={onClose}
      size="lg"
      title={copy.title}
      description={
        copier && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{copier.name}</span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span>{copier.planName}</span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span className="font-mono">{copier.account}</span>
          </span>
        )
      }
      footer={
        copier && (
          <>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copy.closeDialog}
            </button>
            <Link
              href={`/copy-trading/my-plans/${copier.planId}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copy.openPlan}
              <Icon name="arrowRight" size={15} />
            </Link>
          </>
        )
      }
    >
      {history ? (
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <LifetimeStatement history={history} />
          <ol className="flex flex-col gap-3">
            {history.periods.map((period) => (
              <PeriodTicket key={period.index} period={period} />
            ))}
          </ol>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-fg-muted">{copy.noHistory}</p>
      )}
    </Modal>
  );
}
