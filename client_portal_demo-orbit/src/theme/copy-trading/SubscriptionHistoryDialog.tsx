'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import {
  copierSubscriptions,
  subscriptionHistoryCopy as copy,
  type CopierSubscriptionPeriod,
  type CopierTrade,
  type MasterCopierRow,
} from './myPlansData';

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');

function LifetimeStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pl-0 last:pr-0 max-sm:px-0">
      <dt className="text-[10.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{label}</dt>
      <dd className={cx('mt-1 font-mono text-xl font-semibold tabular-nums', tone ?? 'text-fg')}>{value}</dd>
    </div>
  );
}

function TradesTable({ trades }: { trades: CopierTrade[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] text-xs">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-left text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
            {[copy.symbol, copy.side, copy.volume, copy.open, copy.close, copy.profit, copy.closedAt].map((header) => (
              <th key={header} scope="col" className="border-b border-line px-3 py-2.5 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={index} className="transition-colors hover:bg-primary/[0.05]">
              <td className="border-b border-dashed border-line px-3 py-2 font-semibold text-fg">{trade.symbol}</td>
              <td className="border-b border-dashed border-line px-3 py-2">
                <span
                  className={cx(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[10.5px] font-semibold ring-1',
                    trade.side === 'BUY' ? 'bg-success/10 text-success ring-success/25' : 'bg-danger/10 text-danger ring-danger/25',
                  )}
                >
                  <Icon name={trade.side === 'BUY' ? 'trendUp' : 'trendDown'} size={11} />
                  {trade.side}
                </span>
              </td>
              <td className="border-b border-dashed border-line px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.volume.toFixed(2)}</td>
              <td className="border-b border-dashed border-line px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.open}</td>
              <td className="border-b border-dashed border-line px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.close}</td>
              <td className={cx('border-b border-dashed border-line px-3 py-2 font-mono font-semibold tabular-nums', toneOf(trade.profit))}>{formatUsd(trade.profit)}</td>
              <td className="border-b border-dashed border-line px-3 py-2 whitespace-nowrap text-fg-muted">{trade.closedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One subscription period as a stop on a vertical rail; its trades fold open underneath. */
function PeriodStop({ period, isLast }: { period: CopierSubscriptionPeriod; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isSubscribed = period.status === 'subscribed';
  const metrics = [
    { label: copy.equityAtSubscribe, value: formatUsd(period.equityAtSubscribe), tone: 'text-fg' },
    { label: copy.periodPnl, value: formatUsd(period.periodPnl), tone: toneOf(period.periodPnl) },
    { label: copy.commission, value: formatUsd(period.commission), tone: 'text-fg' },
    { label: copy.trades, value: String(period.tradeCount), tone: 'text-fg' },
  ];

  return (
    <li className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
      <span aria-hidden="true" className="relative flex justify-center">
        {!isLast && <span className="absolute top-10 bottom-0 w-px border-l border-dashed border-line-strong" />}
        <span
          className={cx(
            'relative z-10 grid size-9 place-items-center rounded-full border bg-surface font-mono text-xs font-bold',
            isSubscribed ? 'border-success/50 text-success' : 'border-primary/40 text-primary',
          )}
        >
          #{period.index}
        </span>
      </span>

      <div className="min-w-0 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sr-only">#{period.index}</span>
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
              isSubscribed ? 'bg-success/12 text-success ring-success/30' : 'bg-fg/[0.06] text-fg-muted ring-line',
            )}
          >
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', isSubscribed ? 'bg-success' : 'bg-fg-subtle')} />
            {isSubscribed ? copy.subscribed : copy.unsubscribed}
          </span>
          <span title={`${period.durationDays}d`} className="ml-auto rounded-md border border-line px-1.5 py-px font-mono text-[10.5px] text-fg-subtle tabular-nums">
            {period.durationDays.toFixed(2)}d
          </span>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          <Icon name="calendar" size={13} className="text-primary" />
          <time>{period.start}</time>
          <Icon name="arrowRight" size={12} className="text-fg-subtle" />
          <time>{period.end}</time>
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {metrics.map((metric, index) => (
            <div key={metric.label} style={staggerStyle(index, 60)} className="animate-rise bg-surface px-3.5 py-3 motion-reduce:animate-none">
              <dt className="text-[10px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{metric.label}</dt>
              <dd className={cx('mt-1 font-mono text-base font-semibold tabular-nums', metric.tone)}>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm font-medium text-fg-muted transition-colors hover:border-primary/45 hover:bg-primary/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {open ? copy.hideTrades(period.tradeCount) : copy.showTrades(period.tradeCount)}
          <Icon name="chevronDown" size={15} className={cx('transition-transform duration-300 motion-reduce:transition-none', open && 'rotate-180')} />
        </button>

        <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden" inert={!open}>
            <div className="pt-3">
              <TradesTable trades={period.trades} />
              {period.trades.length < period.tradeCount && (
                <p className="mt-2 text-right text-[11px] text-fg-subtle tabular-nums">{copy.loaded(period.trades.length, period.tradeCount)}</p>
              )}
            </div>
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
      calm
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
            <Button type="button" variant="outline" onClick={onClose}>
              {copy.closeDialog}
            </Button>
            <Link
              href={`/copy-trading/my-plans/${copier.planId}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary-soft px-4 text-sm font-medium text-primary ring-1 ring-primary/25 ring-inset transition-shadow hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copy.openPlan}
              <Icon name="arrowRight" size={15} />
            </Link>
          </>
        )
      }
    >
      {history ? (
        <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
          <dl className="grid grid-cols-1 divide-line border-y border-line sm:grid-cols-3 sm:divide-x">
            <LifetimeStat label={copy.totalSubscriptions} value={String(history.totalSubscriptions)} />
            <LifetimeStat label={copy.lifetimePnl} value={formatUsd(history.lifetimePnl)} tone={toneOf(history.lifetimePnl)} />
            <LifetimeStat label={copy.lifetimeCommission} value={formatUsd(history.lifetimeCommission)} />
          </dl>
          <ol className="flex flex-col gap-4">
            {history.periods.map((period, index) => (
              <PeriodStop key={period.index} period={period} isLast={index === history.periods.length - 1} />
            ))}
          </ol>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-fg-muted">{copy.noHistory}</p>
      )}
    </Modal>
  );
}
