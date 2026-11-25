'use client';

import { useRef, useState } from 'react';
import { formatDate, formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { TradeWinLeader } from '@/core/pages/useTradeWin';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { prefersReducedMotion } from './ScratchExperience';
import { categoryIcon, categoryTag, type PastWin } from './TradeWinPage';
import { ACCENT, BoardTitle, EmptyBoard, LiveBadge, boardClass, captionClass } from './ibTradeWinKit';

const PODIUM_SIZE = 3;

const pastWinText = {
  submitted: 'SUBMITTED',
  reference: 'Reference',
  processing: 'We are currently processing your reward',
  submittedOn: 'Submitted',
};

/* ───────────── Top volume board: top 3 as quote cards with volume bars, chasers as a ranked volume table ───────────── */

function LeaderCard({ leader, topLots, order }: { leader: TradeWinLeader; topLots: number; order: number }) {
  const isChampion = leader.rank === 1;
  const share = topLots > 0 ? Math.max(6, (leader.closedLots / topLots) * 100) : 6;

  return (
    <li
      style={{ animationDelay: `${order * 120}ms` }}
      className={cx(
        'relative flex min-w-0 animate-feed-in flex-col gap-3 overflow-hidden rounded-[16px] p-4 ring-1 motion-reduce:animate-none',
        isChampion ? 'bg-fg text-app ring-fg sm:col-span-2' : 'bg-fg/[0.02] text-fg ring-line',
      )}
    >
      <span className="sr-only">{translate('scratch.rank', { rank: leader.rank })}</span>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          style={isChampion ? { background: ACCENT } : undefined}
          className={cx('grid size-8 shrink-0 place-items-center rounded-[9px] font-mono text-sm font-black', isChampion ? 'text-white' : 'bg-fg/10')}
        >
          {leader.rank}
        </span>
        <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-full text-sm font-black', isChampion ? 'bg-app/15' : 'bg-fg/[0.07]')}>
          {leader.name.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{leader.name}</span>
        {isChampion && (
          <span aria-hidden="true" style={{ color: ACCENT }} className="twx-tick">
            <Icon name="trophy" size={20} />
          </span>
        )}
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className={cx('font-mono font-black tracking-tight tabular-nums', isChampion ? 'text-4xl' : 'text-2xl')}>{leader.closedLots}</span>
        <span className={cx(captionClass, isChampion ? 'text-app/60' : 'text-fg-subtle')}>{translate('tradeWin.lots')}</span>
      </p>
      <span aria-hidden="true" className={cx('h-2 overflow-hidden rounded-full', isChampion ? 'bg-app/15' : 'bg-fg/[0.07]')}>
        <span
          style={{ width: `${share}%`, animationDelay: `${200 + order * 150}ms`, ...(isChampion ? { background: ACCENT } : {}) }}
          className={cx('twx-grow block h-full rounded-full', isChampion ? 'twx-stripes' : 'bg-fg/60')}
        />
      </span>
    </li>
  );
}

export function VolumeBoard({ leaders }: { leaders: TradeWinLeader[] }) {
  const [round, setRound] = useState(0);
  const refreshIconRef = useRef<HTMLSpanElement>(null);
  const podium = leaders.filter((leader) => leader.rank <= PODIUM_SIZE).sort((a, b) => a.rank - b.rank);
  const topLots = Math.max(0, ...podium.map((leader) => leader.closedLots));
  const chasers = leaders.filter((leader) => leader.rank > PODIUM_SIZE);
  // Chaser bars run against the lead chaser, so the gaps between them stay visible next to the champion's total.
  const leadChaserLots = Math.max(0, ...chasers.map((leader) => leader.closedLots));

  function refresh() {
    setRound((current) => current + 1);
    if (prefersReducedMotion()) return;
    refreshIconRef.current?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
  }

  return (
    <section style={{ animationDelay: '220ms' }} className={cx(boardClass, 'animate-rise motion-reduce:animate-none lg:col-span-7 lg:self-start')}>
      <BoardTitle icon="trophy" symbol={translate('tradeWin.closedLots')} title={translate('tradeWin.leaderboardTitle')}>
        <LiveBadge label={translate('tradeWin.live')} />
        <button
          type="button"
          onClick={refresh}
          aria-label={translate('tradeWin.refresh')}
          className="grid size-9 place-items-center rounded-[10px] text-fg-muted ring-1 ring-line transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span ref={refreshIconRef} className="flex">
            <Icon name="refresh" size={15} />
          </span>
        </button>
      </BoardTitle>

      <div key={round} className="flex flex-col gap-4 p-4 sm:p-5">
        <ol className="grid gap-3 sm:grid-cols-4">
          {podium.map((leader, index) => (
            <LeaderCard key={leader.rank} leader={leader} topLots={topLots} order={index} />
          ))}
        </ol>

        {chasers.length > 0 && (
          <div className="overflow-hidden rounded-[14px] ring-1 ring-line">
            <div className={cx(captionClass, 'grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 bg-fg/[0.03] px-3 py-2 text-fg-subtle')}>
              <span>{translate('tradeWin.rank')}</span>
              <span>{translate('tradeWin.trader')}</span>
              <span>{translate('tradeWin.closedLots')}</span>
            </div>
            <ol start={PODIUM_SIZE + 1} className="divide-y divide-line">
              {chasers.map((leader, index) => {
                const share = leadChaserLots > 0 ? Math.max(4, (leader.closedLots / leadChaserLots) * 100) : 4;
                return (
                  <li
                    key={leader.rank}
                    style={{ animationDelay: `${300 + index * 60}ms` }}
                    className="group grid animate-feed-in grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-fg/[0.03] motion-reduce:animate-none"
                  >
                    <span className="font-mono text-xs font-black text-fg-muted tabular-nums">#{leader.rank}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs font-semibold text-fg sm:w-32">{leader.name}</span>
                      <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.06]">
                        <span style={{ width: `${share}%`, animationDelay: `${350 + index * 60}ms` }} className="twx-grow block h-full rounded-full bg-fg/50 transition-colors group-hover:bg-fg" />
                      </span>
                    </span>
                    <span className="font-mono text-xs font-black text-fg tabular-nums">
                      {leader.closedLots} <span className="font-sans font-normal text-fg-subtle">{translate('tradeWin.lots')}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────── Fills blotter: every redemption as an order confirmation ───────────── */

function FillRow({ entry, currency, index }: { entry: PastWin; currency: string; index: number }) {
  const icon = entry.category ? categoryIcon[entry.category] : 'gift';

  return (
    <li style={{ animationDelay: `${index * 70}ms` }} className={cx('flex animate-feed-in gap-3 px-4 py-3.5 motion-reduce:animate-none sm:px-5', index === 0 && entry.reference && 'twx-flash')}>
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-fg/[0.06] text-fg">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-fg">
              {entry.rewardName} {entry.quantity > 1 && <span className="font-semibold text-fg-subtle">× {entry.quantity}</span>}
            </p>
            <p className="truncate text-xs text-fg-muted">{entry.category ? categoryTag(entry.category) : formatDate(entry.redeemedAt)}</p>
          </div>
          {entry.reference ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-success/15 px-2 py-0.5 font-mono text-[10px] font-black tracking-[0.14em] text-success">
              <span aria-hidden="true" className="zenith-blink size-1.5 rounded-full bg-success" />
              {pastWinText.submitted}
            </span>
          ) : (
            <span className="shrink-0 font-mono text-sm font-black text-success tabular-nums">{formatMoney(entry.value, currency)}</span>
          )}
        </div>

        {entry.reference && (
          <>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-fg-muted">
              <span aria-hidden="true" className="flex gap-0.5">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} style={{ animationDelay: `${dot * 0.25}s` }} className="zenith-blink size-1.5 rounded-full bg-fg/60" />
                ))}
              </span>
              {pastWinText.processing}
            </p>
            <dl className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-line pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-fg-subtle">{pastWinText.reference}:</dt>
                <dd className="rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono font-black tracking-wider text-fg">{entry.reference}</dd>
              </div>
              <div className="flex items-center gap-1.5 text-fg-subtle">
                <dt className="flex items-center gap-1">
                  <Icon name="clock" size={11} />
                  {pastWinText.submittedOn}:
                </dt>
                <dd className="tabular-nums">{entry.redeemedAt.slice(0, 10)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </li>
  );
}

export function FillsBlotter({ entries, currency }: { entries: PastWin[]; currency: string }) {
  return (
    <section style={{ animationDelay: '260ms' }} className={cx(boardClass, 'animate-rise motion-reduce:animate-none lg:col-span-5 lg:self-start')}>
      <BoardTitle icon="checkCircle" symbol={translate('tradeWin.totalRedemptions')} title={translate('tradeWin.pastWinsTitle')}>
        {entries.length > 0 && (
          <span key={entries.length} style={{ background: ACCENT }} className="grid h-8 min-w-8 animate-dot-pop place-items-center rounded-[9px] px-2 font-mono text-xs font-black text-white motion-reduce:animate-none">
            {entries.length}
          </span>
        )}
      </BoardTitle>

      {entries.length === 0 ? (
        <EmptyBoard icon="trophy" title={translate('tradeWin.noRedemptions')} text={translate('tradeWin.keepTrading')} />
      ) : (
        <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
          {entries.map((entry, index) => (
            <FillRow key={entry.id} entry={entry} currency={currency} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}
