'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { CountUp, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
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

const captionClass = 'text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';

function LifetimeStat({ icon, label, value, format, tone, index }: { icon: IconName; label: string; value: number; format: (value: number) => string; tone?: string; index: number }) {
  return (
    <div style={staggerStyle(index, 120)} className="flex min-w-0 animate-feed-in items-center gap-3 py-3 motion-reduce:animate-none sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
        <Icon name={icon} size={14} />
      </span>
      <div className="min-w-0">
        <dt className={cx(captionClass, 'truncate')}>{label}</dt>
        <dd className={cx('mt-0.5 font-mono text-xl font-black tabular-nums', tone ?? 'text-fg')}>
          <CountUp value={value} format={format} />
        </dd>
      </div>
    </div>
  );
}

function TradesTable({ trades }: { trades: CopierTrade[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-2xl ring-1 ring-line">
      <table className="w-full min-w-[560px] text-xs">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-left">
            {[copy.symbol, copy.side, copy.volume, copy.open, copy.close, copy.profit, copy.closedAt].map((header) => (
              <th key={header} scope="col" className={cx(captionClass, 'border-b border-dashed border-line-strong px-3 py-2.5 whitespace-nowrap')}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => {
            const isBuy = trade.side === 'BUY';
            return (
              <tr key={index} style={staggerStyle(index, 0)} className="animate-feed-in transition-colors hover:bg-fg/[0.04] motion-reduce:animate-none">
                <td className="border-b border-dotted border-line-strong px-3 py-2 font-bold text-fg">{trade.symbol}</td>
                <td className="border-b border-dotted border-line-strong px-3 py-2">
                  <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-px font-mono text-[10.5px] font-bold ring-1', isBuy ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
                    <Icon name={isBuy ? 'trendUp' : 'trendDown'} size={11} />
                    {trade.side}
                  </span>
                </td>
                <td className="border-b border-dotted border-line-strong px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.volume.toFixed(2)}</td>
                <td className="border-b border-dotted border-line-strong px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.open}</td>
                <td className="border-b border-dotted border-line-strong px-3 py-2 font-mono text-fg-muted tabular-nums">{trade.close}</td>
                <td className={cx('border-b border-dotted border-line-strong px-3 py-2 font-mono font-bold tabular-nums', toneOf(trade.profit))}>{formatUsd(trade.profit)}</td>
                <td className="border-b border-dotted border-line-strong px-3 py-2 whitespace-nowrap text-fg-muted">{trade.closedAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** One subscription period as a numbered bead on a dashed rail; its metrics read as a receipt and its trades fold open underneath. */
function PeriodStop({ period, isLast, index }: { period: CopierSubscriptionPeriod; isLast: boolean; index: number }) {
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
    <li style={staggerStyle(index, 200)} className="relative grid animate-rise grid-cols-[2.5rem_minmax(0,1fr)] gap-3 motion-reduce:animate-none">
      <span aria-hidden="true" className="relative flex justify-center">
        {!isLast && <span className="absolute top-11 bottom-0 origin-top animate-grow border-l border-dashed border-line-strong motion-reduce:animate-none" />}
        <span className="relative grid size-10 place-items-center">
          {isSubscribed && <span className="absolute inset-0 animate-ring-ripple rounded-full border border-success/60 motion-reduce:hidden" />}
          <span className={cx('relative grid size-10 place-items-center rounded-full font-mono text-xs font-black', isSubscribed ? 'bg-fg text-app' : 'nova-gloss text-fg')}>#{period.index}</span>
        </span>
      </span>

      <div className="min-w-0 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sr-only">#{period.index}</span>
          <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', isSubscribed ? 'text-success ring-success/40' : 'text-fg-muted ring-line-strong')}>
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', isSubscribed ? 'animate-ping-soft bg-success motion-reduce:animate-none' : 'bg-fg-subtle')} />
            {isSubscribed ? copy.subscribed : copy.unsubscribed}
          </span>
          <span title={`${period.durationDays}d`} className="ml-auto rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-fg tabular-nums ring-1 ring-line-strong">
            {period.durationDays.toFixed(2)}d
          </span>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          <Icon name="calendar" size={13} className="text-fg-subtle" />
          <time>{period.start}</time>
          <span aria-hidden="true" className="w-6 border-t border-dotted border-line-strong" />
          <Icon name="arrowRight" size={12} className="text-fg-subtle" />
          <time>{period.end}</time>
        </p>

        <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {metrics.map((metric, metricIndex) => (
            <div key={metric.label} style={staggerStyle(metricIndex, 60)} className="flex animate-feed-in items-center gap-2 border-b border-dotted border-line-strong py-2 motion-reduce:animate-none">
              <dt className={cx(captionClass, 'min-w-0 truncate')}>{metric.label}</dt>
              <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-line-strong" />
              <dd className={cx('shrink-0 font-mono text-sm font-black tabular-nums', metric.tone)}>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className={cx(
            'mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            open ? 'border border-transparent bg-fg text-app' : 'border border-dashed border-line-strong text-fg-muted hover:border-fg/40 hover:text-fg',
          )}
        >
          {open ? copy.hideTrades(period.tradeCount) : copy.showTrades(period.tradeCount)}
          <Icon name="chevronDown" size={15} className={cx('transition-transform duration-300 motion-reduce:transition-none', open && 'rotate-180')} />
        </button>

        <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden" inert={!open}>
            <div className="pt-3">
              <TradesTable trades={period.trades} />
              {period.trades.length < period.tradeCount && <p className="mt-2 text-right text-[11px] text-fg-subtle tabular-nums">{copy.loaded(period.trades.length, period.tradeCount)}</p>}
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
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span aria-hidden="true" className={cx(beadClass, 'size-6 text-[10px] font-black uppercase')}>
              {copier.name.charAt(0)}
            </span>
            <span className="font-semibold text-fg">{copier.name}</span>
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
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full!">
              {copy.closeDialog}
            </Button>
            <Link
              href={`/copy-trading/my-plans/${copier.planId}`}
              className="group/open relative inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-full bg-fg px-4 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/open:translate-x-full motion-reduce:hidden" />
              <span className="relative">{copy.openPlan}</span>
              <Icon name="arrowRight" size={15} className="relative transition-transform duration-300 group-hover/open:translate-x-0.5" />
            </Link>
          </>
        )
      }
    >
      {history ? (
        <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
          <dl className="grid grid-cols-1 border-y border-dotted border-line-strong sm:grid-cols-3 sm:divide-x sm:divide-dotted sm:divide-line-strong">
            <LifetimeStat icon="history" label={copy.totalSubscriptions} value={history.totalSubscriptions} format={(value) => String(Math.round(value))} index={0} />
            <LifetimeStat icon="trendUp" label={copy.lifetimePnl} value={history.lifetimePnl} format={formatUsd} tone={toneOf(history.lifetimePnl)} index={1} />
            <LifetimeStat icon="wallet" label={copy.lifetimeCommission} value={history.lifetimeCommission} format={formatUsd} index={2} />
          </dl>
          <ol className="flex flex-col gap-5">
            {history.periods.map((period, index) => (
              <PeriodStop key={period.index} period={period} index={index} isLast={index === history.periods.length - 1} />
            ))}
          </ol>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span aria-hidden="true" className="relative grid size-14 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
            <span className={cx(beadClass, 'size-9 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
              <Icon name="history" size={15} />
            </span>
          </span>
          <p className="text-sm text-fg-muted">{copy.noHistory}</p>
        </div>
      )}
    </Modal>
  );
}
