'use client';

import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { isInRange, type PeriodRange } from './DirectClientsDesk';
import { cascadeCopy as copy, cascadeStats, descendantsOf, type CascadeMember } from './ibCascadeData';
import { ACCENT, BoardHead, boardClass, captionClass } from './ibNetworkKit';

/*
 * Network depth ladder: each downline level is a price row of a DOM ladder. Sub-IBs stack on the bid side
 * (left), clients on the ask side (right), so the shape of the network reads like order-book depth.
 */
export function NetworkDepth({ root, range, currency }: { root: CascadeMember; range: PeriodRange; currency: string }) {
  const stats = cascadeStats(root, (member) => isInRange(member.lastTradeAt, range));
  const members = descendantsOf(root);
  const levels = [...new Set(members.map((member) => member.level))].sort((a, b) => a - b);
  const rows = levels.map((level) => {
    const onLevel = members.filter((member) => member.level === level);
    const subIbs = onLevel.filter((member) => member.kind === 'subIb').length;
    return { level, subIbs, clients: onLevel.length - subIbs };
  });
  const topSide = Math.max(1, ...rows.flatMap((row) => [row.subIbs, row.clients]));
  const quotes: { key: string; icon: IconName; label: string; hint: string; value: string; emphasis?: boolean }[] = [
    { key: 'subs', icon: 'trophy', label: copy.kpiSubIbs, hint: copy.kpiSubIbsHint(stats.directSubIbs), value: String(stats.cascadeSubIbs) },
    { key: 'clients', icon: 'user', label: copy.kpiClients, hint: copy.kpiClientsHint, value: String(stats.clients) },
    { key: 'active', icon: 'history', label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(stats.active) },
    { key: 'earned', icon: 'accounts', label: copy.kpiEarned, hint: copy.kpiEarnedHint, value: formatMoney(stats.earned, currency), emphasis: true },
  ];

  return (
    <section className={cx(boardClass, 'animate-rise motion-reduce:animate-none')}>
      <BoardHead icon="signalBars" caption={copy.legendSubIb} title={copy.kpiSubIbs}>
        <span className="flex items-center gap-3 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-fg" />
            {copy.legendSubIb}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-success" />
            {copy.kpiClients}
          </span>
        </span>
      </BoardHead>

      <div className="p-4 sm:p-5">
        <div aria-hidden="true" className={cx(captionClass, 'mb-2 grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] gap-2 text-fg-subtle')}>
          <span className="text-right">{copy.legendSubIb}</span>
          <span className="text-center">L</span>
          <span>{copy.kpiClients}</span>
        </div>
        <ol className="flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <li key={row.level} style={{ animationDelay: `${150 + index * 110}ms` }} className="grid animate-feed-in grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] items-center gap-2 motion-reduce:animate-none">
              <span className="sr-only">{`L${row.level}: ${copy.legendSubIb} ${row.subIbs}, ${copy.kpiClients} ${row.clients}`}</span>
              <span aria-hidden="true" className="relative flex h-8 items-center justify-end overflow-hidden rounded-l-[8px] bg-fg/[0.04]">
                <span
                  style={{ width: `${(row.subIbs / topSide) * 100}%`, animationDelay: `${250 + index * 110}ms`, transformOrigin: 'right' }}
                  className="inx-grow absolute inset-y-0 right-0 rounded-l-[8px] bg-fg"
                />
                <span className={cx('relative z-10 px-2 font-mono text-xs font-black tabular-nums', row.subIbs > 0 ? 'text-app' : 'text-fg-subtle')}>{row.subIbs}</span>
              </span>
              <span aria-hidden="true" style={index === 0 ? { background: ACCENT } : undefined} className={cx('grid h-8 place-items-center rounded-[8px] font-mono text-xs font-black', index === 0 ? 'text-white' : 'bg-fg/[0.07] text-fg')}>
                L{row.level}
              </span>
              <span aria-hidden="true" className="relative flex h-8 items-center overflow-hidden rounded-r-[8px] bg-fg/[0.04]">
                <span style={{ width: `${(row.clients / topSide) * 100}%`, animationDelay: `${250 + index * 110}ms` }} className="inx-grow inx-stripes absolute inset-y-0 left-0 rounded-r-[8px] bg-success" />
                <span className={cx('relative z-10 px-2 font-mono text-xs font-black tabular-nums', row.clients > 0 ? 'text-white' : 'text-fg-subtle')}>{row.clients}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <dl className="grid grid-cols-2 border-t border-line xl:grid-cols-4">
        {quotes.map((quote, index) => (
          <div
            key={quote.key}
            style={{ animationDelay: `${350 + index * 80}ms` }}
            className={cx(
              'flex min-w-0 animate-feed-in flex-col gap-1 border-line p-4 motion-reduce:animate-none sm:p-5 xl:not-last:border-r',
              index % 2 === 0 && 'border-r',
              index < 2 && 'border-b xl:border-b-0',
            )}
          >
            <dt className={cx(captionClass, 'flex items-center gap-1.5 text-fg-muted')}>
              <Icon name={quote.icon} size={12} className="shrink-0" />
              <span className="truncate">{quote.label}</span>
            </dt>
            <dd className={cx('truncate font-mono text-2xl font-black tracking-tight tabular-nums', quote.emphasis ? 'text-success' : 'text-fg')}>{quote.value}</dd>
            <dd className="text-[11px] text-fg-subtle">{quote.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
