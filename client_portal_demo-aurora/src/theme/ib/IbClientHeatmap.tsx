'use client';

import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { isInRange, type PeriodRange } from './DirectClientsDesk';
import { directClientsCopy as copy, type DirectClient } from './ibDirectClientsData';
import { ACCENT, BoardHead, boardClass, captionClass, initials, share } from './ibNetworkKit';

/*
 * Client heatmap: the direct book drawn like a market heatmap. Every tile is one real client, its width is the
 * commission it brought, green = traded in the period, the clay corner = joined in the period.
 */
export function ClientHeatmap({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
  const total = clients.length;
  const active = clients.filter((client) => isInRange(client.lastTradeAt, range)).length;
  const joined = clients.filter((client) => isInRange(client.joinedAt, range)).length;
  const commission = clients.reduce((sum, client) => sum + client.commission, 0);
  const topCommission = Math.max(0, ...clients.map((client) => client.commission));
  const tiles = [...clients].sort((a, b) => b.commission - a.commission);
  const quotes: { key: string; icon: IconName; label: string; hint: string; value: string; percent: number | null }[] = [
    { key: 'active', icon: 'history', label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(active), percent: share(active, total) },
    { key: 'new', icon: 'user', label: copy.kpiNew, hint: copy.kpiNewHint, value: String(joined), percent: share(joined, total) },
    { key: 'commission', icon: 'trophy', label: copy.kpiCommission, hint: copy.kpiCommissionHint, value: formatMoney(commission, currency), percent: null },
  ];

  return (
    <section className={cx(boardClass, 'animate-rise motion-reduce:animate-none')}>
      <BoardHead icon="pieChart" caption={copy.kpiTotalHint} title={copy.kpiTotal}>
        <p className="flex items-baseline gap-2">
          <span key={total} className="animate-dot-pop font-mono text-4xl leading-none font-black tracking-tighter text-fg tabular-nums motion-reduce:animate-none">
            {total}
          </span>
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-success" />
          </span>
        </p>
      </BoardHead>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div aria-hidden="true" className="flex flex-wrap gap-1">
          {tiles.map((client, index) => {
            const isActive = isInRange(client.lastTradeAt, range);
            const isNew = isInRange(client.joinedAt, range);
            const weight = topCommission > 0 ? client.commission / topCommission : 0;
            return (
              <span
                key={client.id}
                title={`${client.name} · ${formatMoney(client.commission, currency)}`}
                style={{
                  flexGrow: Math.max(1, Math.round(weight * 12)),
                  animationDelay: `${120 + index * 35}ms`,
                  opacity: isActive ? 0.45 + weight * 0.55 : 1,
                }}
                className={cx(
                  'relative flex h-16 min-w-14 basis-14 animate-dot-pop flex-col justify-between overflow-hidden rounded-[8px] p-1.5 transition-transform duration-200 hover:z-10 hover:scale-105 motion-reduce:animate-none motion-reduce:transition-none',
                  isActive ? 'bg-success text-white' : 'bg-fg/[0.07] text-fg-muted',
                )}
              >
                {isNew && <span style={{ background: ACCENT }} className="absolute top-0 right-0 size-3 rounded-bl-[6px]" />}
                <span className="font-mono text-[11px] font-black">{initials(client.name)}</span>
                <span className="truncate font-mono text-[10px] font-bold tabular-nums">{formatMoney(client.commission, currency)}</span>
              </span>
            );
          })}
        </div>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-success" />
            {copy.kpiActive}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={{ background: ACCENT }} className="size-2.5 rounded-[3px]" />
            {copy.kpiNew}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="trophy" size={11} />
            {copy.kpiCommission}
          </span>
        </span>
      </div>

      <dl className="grid border-t border-line sm:grid-cols-3">
        {quotes.map((quote, index) => (
          <div
            key={quote.key}
            style={{ animationDelay: `${300 + index * 90}ms` }}
            className="flex min-w-0 animate-feed-in flex-col gap-2 border-line p-4 not-last:border-b motion-reduce:animate-none sm:p-5 sm:not-last:border-r sm:not-last:border-b-0"
          >
            <dt className="flex items-center justify-between gap-2">
              <span className={cx(captionClass, 'flex min-w-0 items-center gap-1.5 text-fg-muted')}>
                <Icon name={quote.icon} size={12} className="shrink-0" />
                <span className="truncate">{quote.label}</span>
              </span>
              {quote.percent !== null && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-success/15 px-1.5 py-0.5 font-mono text-[10.5px] font-black text-success tabular-nums">
                  <Icon name="trendUp" size={10} />
                  {Math.round(quote.percent)}%
                </span>
              )}
            </dt>
            <dd className={cx('truncate font-mono text-3xl font-black tracking-tight tabular-nums', quote.percent === null ? 'text-success' : 'text-fg')}>{quote.value}</dd>
            <dd aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-fg/[0.07]">
              {quote.percent === null ? (
                <span className="inx-stripes absolute inset-0 bg-success/60" />
              ) : (
                <span style={{ width: `${Math.max(quote.percent, quote.percent > 0 ? 4 : 0)}%`, animationDelay: `${400 + index * 90}ms` }} className="inx-grow absolute inset-y-0 left-0 rounded-full bg-fg" />
              )}
            </dd>
            <dd className="text-[11px] text-fg-subtle">{quote.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
