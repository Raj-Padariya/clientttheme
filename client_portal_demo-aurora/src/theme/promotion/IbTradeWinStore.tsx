'use client';

import Image from 'next/image';
import { useId, useState, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { RewardCategory, TradeWinReward } from '@/core/pages/useTradeWin';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { categoryIcon, categoryLabel, categoryTag } from './TradeWinPage';
import { OrderTicket } from './IbTradeWinTicket';
import { ACCENT, BoardTitle, EmptyBoard, LiveBadge, boardClass, captionClass } from './ibTradeWinKit';

type StatusFilter = 'all' | 'ready';
type CategoryFilter = 'all' | RewardCategory;

const CATEGORIES: RewardCategory[] = ['travel', 'electronics', 'cash', 'merchandise'];

/* ───────────── Watchlist row: one reward quoted like a symbol (price = lots, value, stock) ───────────── */

function WatchRow({
  reward,
  currency,
  isSelected,
  isReady,
  stockLeft,
  tabId,
  panelId,
  order,
  onSelect,
}: {
  reward: TradeWinReward;
  currency: string;
  isSelected: boolean;
  isReady: boolean;
  stockLeft: number;
  tabId: string;
  panelId: string;
  order: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      onClick={onSelect}
      style={{ animationDelay: `${order * 60}ms` }}
      className={cx(
        'group relative grid w-full animate-feed-in grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none sm:px-5',
        isSelected ? 'twx-flash bg-fg/[0.06]' : 'hover:bg-fg/[0.03]',
      )}
    >
      {isSelected && <span aria-hidden="true" style={{ background: ACCENT }} className="absolute inset-y-0 left-0 w-1" />}
      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-fg/[0.06] text-fg ring-1 ring-line">
        {reward.image ? (
          <Image src={reward.image} alt="" aria-hidden="true" fill unoptimized sizes="44px" className="object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none" />
        ) : (
          <Icon name={categoryIcon[reward.category]} size={18} />
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-black text-fg">{reward.name}</span>
          <span className="shrink-0 rounded bg-fg/[0.07] px-1.5 py-0.5 font-mono text-[9.5px] font-black tracking-[0.12em] text-fg-subtle uppercase">{categoryTag(reward.category)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-3 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="pieChart" size={11} />
            {translate('tradeWin.lotsValue', { lots: reward.lotRequirement })}
          </span>
          <span className={cx('inline-flex items-center gap-1 font-semibold', isReady ? 'text-success' : 'text-fg-subtle')}>
            <span aria-hidden="true" className={cx('size-1.5 rounded-full', isReady ? 'zenith-blink bg-success' : 'bg-current opacity-50')} />
            {translate('tradeWin.stockLeft', { count: stockLeft })}
          </span>
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="font-mono text-sm font-black text-fg tabular-nums">{formatMoney(reward.value, currency)}</span>
        <Icon name={isReady ? 'trendUp' : 'clock'} size={13} className={cx(isReady ? 'twx-tick text-success' : 'text-fg-subtle')} />
      </span>
    </button>
  );
}

/* ───────────── Rewards exchange: market tabs + status filter, watchlist on the left, order ticket on the right ───────────── */

export function RewardExchange({
  rewards,
  currency,
  availableLots,
  availableDeposit,
  stockLeftOf,
  claimedOf,
  onRedeem,
}: {
  rewards: TradeWinReward[];
  currency: string;
  availableLots: number;
  availableDeposit: number;
  stockLeftOf: (reward: TradeWinReward) => number;
  claimedOf: (reward: TradeWinReward) => number;
  onRedeem: (reward: TradeWinReward, quantity: number) => string;
}) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const baseId = useId();

  const isReady = (reward: TradeWinReward) => stockLeftOf(reward) > 0 && availableLots >= reward.lotRequirement;
  const readyCount = rewards.filter(isReady).length;
  const visible = rewards.filter((reward) => (status === 'all' || isReady(reward)) && (category === 'all' || reward.category === category));
  // Falls back to the first visible reward when the chosen one is filtered out (or nothing is chosen yet).
  const selected = visible.find((reward) => reward.id === selectedId) ?? visible[0];
  const marketTabs: { id: CategoryFilter; label: string }[] = [{ id: 'all', label: translate('tradeWin.filterAll') }, ...CATEGORIES.map((item) => ({ id: item, label: categoryLabel(item) }))];
  const statusTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: translate('tradeWin.filterAll'), count: rewards.length },
    { id: 'ready', label: translate('tradeWin.readyToRedeem'), count: readyCount },
  ];

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;
    const lastIndex = visible.length - 1;
    const currentIndex = visible.findIndex((reward) => reward.id === selected.id);
    let nextIndex: number;
    const isNext = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const isPrevious = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (isNext) nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    else if (isPrevious) nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;
    else return;

    event.preventDefault();
    const nextReward = visible[nextIndex];
    setSelectedId(nextReward.id);
    document.getElementById(`${baseId}-tab-${nextReward.id}`)?.focus();
  }

  return (
    <section style={{ animationDelay: '140ms' }} className={cx(boardClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-12')}>
      <BoardTitle icon="gift" symbol={translate('tradeWin.storeEyebrow')} title={translate('tradeWin.storeTitle')}>
        <LiveBadge label={translate('tradeWin.productsAvailable', { count: visible.length })} />
      </BoardTitle>

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label={translate('tradeWin.categoryFilter')} className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
          {marketTabs.map((tab) => {
            const isActive = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategory(tab.id)}
                className={cx(
                  'relative inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {tab.id !== 'all' && <Icon name={categoryIcon[tab.id]} size={13} />}
                {tab.label}
                <span aria-hidden="true" style={isActive ? { background: ACCENT } : undefined} className={cx('absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
              </button>
            );
          })}
        </div>
        <div role="group" aria-label={translate('tradeWin.statusFilter')} className="flex gap-1 rounded-[12px] bg-fg/[0.04] p-1 ring-1 ring-line">
          {statusTabs.map((tab) => {
            const isActive = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatus(tab.id)}
                className={cx(
                  'inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-[9px] px-3 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'bg-fg text-app' : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon name={tab.id === 'all' ? 'inbox' : 'bolt'} size={13} />
                {tab.label}
                <span key={tab.count} className={cx('animate-dot-pop rounded px-1.5 font-mono text-[11px] font-black tabular-nums motion-reduce:animate-none', isActive ? 'bg-app/15' : 'bg-fg/10')}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!selected ? (
        <EmptyBoard icon="inbox" title={translate('tradeWin.noProducts')} text={translate('tradeWin.noProductsText')} />
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 border-b border-line lg:border-r lg:border-b-0">
            <div className={cx(captionClass, 'grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-line px-4 py-2 text-fg-subtle sm:px-5')}>
              <span>{translate('tradeWin.storeTitle')}</span>
              <span>{translate('tradeWin.value')}</span>
            </div>
            <div role="tablist" aria-orientation="vertical" aria-label={translate('tradeWin.productTabs')} onKeyDown={handleTabKeyDown} className="flex max-h-[34rem] flex-col divide-y divide-line overflow-y-auto">
              {visible.map((reward, index) => (
                <WatchRow
                  key={reward.id}
                  reward={reward}
                  currency={currency}
                  isSelected={reward.id === selected.id}
                  isReady={isReady(reward)}
                  stockLeft={stockLeftOf(reward)}
                  tabId={`${baseId}-tab-${reward.id}`}
                  panelId={`${baseId}-panel`}
                  order={index}
                  onSelect={() => setSelectedId(reward.id)}
                />
              ))}
            </div>
          </div>

          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${selected.id}`} className="min-w-0">
            <OrderTicket
              key={selected.id}
              reward={selected}
              currency={currency}
              availableLots={availableLots}
              availableDeposit={availableDeposit}
              stockLeft={stockLeftOf(selected)}
              claimed={claimedOf(selected)}
              onRedeem={onRedeem}
            />
          </div>
        </div>
      )}
    </section>
  );
}
