'use client';

import { useEffect, useState } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';

const PAIR = 'EUR/USD';
const POINTS = 40;
// The lines stop short of the right edge so the value pills have room.
const NOW_X = 87.3;
const PLOT_MIN = 30;
const PLOT_MAX = 70;
const PILL_GAP = 9;
const TICK_MS = 1600;
const OPEN_PRICE = 1.08542;
const PIP = 0.0001;

type Side = 'buy' | 'sell';

interface MarketState {
  buy: number[];
  sell: number[];
  price: number;
  priceDirection: 'up' | 'down';
  tick: number;
  leadChanges: number;
  flash: { id: number; side: Side } | null;
}

// Seeded generator so the server render and the first client render draw the same lines.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Random walk pulled back towards 50, so neither side runs off the chart.
function nextPressure(previous: number, random: number): number {
  const next = previous + (random - 0.5) * 4 + (50 - previous) * 0.08;
  return Math.min(66, Math.max(34, next));
}

function initialSeries(seed: number, start: number): number[] {
  const random = seededRandom(seed);
  const series = [start];
  while (series.length < POINTS) series.push(nextPressure(series[series.length - 1], random()));
  return series;
}

function leaderOf(buy: number, sell: number): Side {
  return buy >= sell ? 'buy' : 'sell';
}

function createInitialState(): MarketState {
  return {
    buy: initialSeries(11, 48),
    sell: initialSeries(29, 52),
    price: OPEN_PRICE,
    priceDirection: 'up',
    tick: 0,
    leadChanges: 0,
    flash: null,
  };
}

function advance(state: MarketState): MarketState {
  const buy = [...state.buy.slice(1), nextPressure(state.buy[POINTS - 1], Math.random())];
  const sell = [...state.sell.slice(1), nextPressure(state.sell[POINTS - 1], Math.random())];
  const previousLeader = leaderOf(state.buy[POINTS - 1], state.sell[POINTS - 1]);
  const leader = leaderOf(buy[POINTS - 1], sell[POINTS - 1]);
  const leadChanged = previousLeader !== leader;
  const priceStep = (Math.random() - 0.5) * 1.6 * PIP;

  return {
    buy,
    sell,
    price: state.price + priceStep,
    priceDirection: priceStep >= 0 ? 'up' : 'down',
    tick: state.tick + 1,
    leadChanges: state.leadChanges + (leadChanged ? 1 : 0),
    flash: leadChanged ? { id: state.tick + 1, side: leader } : state.flash,
  };
}

function plotHeight(value: number): number {
  return ((value - PLOT_MIN) / (PLOT_MAX - PLOT_MIN)) * 100;
}

function linePoints(series: number[]): string[] {
  return series.map((value, index) => `${((index / (POINTS - 1)) * NOW_X).toFixed(2)},${(100 - plotHeight(value)).toFixed(2)}`);
}

// Keeps the two value pills from overlapping when the lines are close together.
function separatedPills(buyHeight: number, sellHeight: number): { buy: number; sell: number } {
  if (Math.abs(buyHeight - sellHeight) >= PILL_GAP) return { buy: buyHeight, sell: sellHeight };
  const middle = (buyHeight + sellHeight) / 2;
  const half = PILL_GAP / 2;
  return buyHeight >= sellHeight ? { buy: middle + half, sell: middle - half } : { buy: middle - half, sell: middle + half };
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const sideStyle: Record<Side, { text: string; bg: string; lead: string; avatar: string; avatarClass: string }> = {
  buy: {
    text: 'text-hero-buy',
    bg: 'bg-hero-buy',
    lead: 'border-hero-buy/50 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--hero-buy)_14%,transparent),transparent_80%)] shadow-[0_0_22px_-8px_color-mix(in_srgb,var(--hero-buy)_60%,transparent)]',
    avatar: 'B',
    avatarClass: 'bg-hero-buy text-on-hero-btn',
  },
  sell: {
    text: 'text-hero-sell',
    bg: 'bg-hero-sell',
    lead: 'border-hero-sell/50 bg-[linear-gradient(270deg,color-mix(in_srgb,var(--hero-sell)_14%,transparent),transparent_80%)] shadow-[0_0_22px_-8px_color-mix(in_srgb,var(--hero-sell)_60%,transparent)]',
    avatar: 'S',
    avatarClass: 'bg-hero-avatar-sell text-white',
  },
};

interface SideTileProps {
  side: Side;
  share: number;
  isLeading: boolean;
}

function SideTile({ side, share, isLeading }: SideTileProps) {
  const style = sideStyle[side];
  const isSell = side === 'sell';
  const label = translate(isSell ? 'pulse.sellers' : 'pulse.buyers');

  return (
    <div
      className={cx(
        'relative flex min-w-0 items-center gap-2.5 rounded-xl border border-hero-line bg-hero-tile px-2.5 py-2 transition-[border-color,box-shadow,background] duration-400 motion-reduce:transition-none',
        isSell && 'flex-row-reverse text-right',
        isLeading && style.lead,
      )}
    >
      {isLeading && (
        <span className={cx('absolute -top-2 rounded-full px-[7px] py-px text-[9px] font-bold uppercase tracking-[0.1em] text-on-hero-btn', style.bg, isSell ? 'right-2.5' : 'left-2.5')}>
          {translate('pulse.leading')}
        </span>
      )}
      <span aria-hidden="true" className={cx('grid size-[30px] shrink-0 place-items-center rounded-full text-[13px] font-bold', style.avatarClass)}>
        {style.avatar}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <small className="text-[10px] uppercase tracking-[0.08em] text-hero-mute">{translate(isSell ? 'pulse.short' : 'pulse.long')}</small>
        <b className="truncate text-[13px] font-semibold text-hero-txt">{label}</b>
      </span>
      <strong className={cx('text-lg font-semibold whitespace-nowrap tabular-nums', style.text, isSell ? 'mr-auto' : 'ml-auto')}>{share.toFixed(1)}%</strong>
    </div>
  );
}

export function MarketPulse({ className }: { className?: string }) {
  const [market, setMarket] = useState(createInitialState);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const marketTimer = window.setInterval(() => setMarket(advance), TICK_MS);
    const clockTimer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => {
      window.clearInterval(marketTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const latestBuy = market.buy[POINTS - 1];
  const latestSell = market.sell[POINTS - 1];
  const buyShare = (latestBuy / (latestBuy + latestSell)) * 100;
  const sellShare = 100 - buyShare;
  const leader = leaderOf(latestBuy, latestSell);
  const buyPoints = linePoints(market.buy);
  const sellPoints = linePoints(market.sell);
  const buyHeight = plotHeight(latestBuy);
  const sellHeight = plotHeight(latestSell);
  const pills = separatedPills(buyHeight, sellHeight);
  const pipsMoved = (market.price - OPEN_PRICE) / PIP;
  const buyShareMoved = buyShare - (market.buy[POINTS - 2] / (market.buy[POINTS - 2] + market.sell[POINTS - 2])) * 100;
  const leaderShareMoved = leader === 'buy' ? buyShareMoved : -buyShareMoved;

  return (
    <figure
      aria-label={translate('pulse.summary', { pair: PAIR, buyers: `${buyShare.toFixed(1)}%`, sellers: `${sellShare.toFixed(1)}%` })}
      className={cx(
        'relative m-0 flex min-h-60 flex-col overflow-hidden rounded-[14px] border border-hero-line bg-hero-panel px-5 pt-[18px] shadow-[inset_0_1px_0_var(--hero-ring)]',
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-2.5">
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-[7px] text-xs text-hero-mute">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-hero-up" />
            {PAIR} · {translate('pulse.title')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hero-live/30 bg-hero-live/10 py-0.5 pr-2 pl-[7px] text-[10px] font-bold uppercase tracking-[0.12em] text-hero-live">
            <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-hero-live motion-reduce:animate-none" />
            {translate('pulse.live')}
            <b className="ml-0.5 border-l border-hero-live/30 pl-[7px] font-medium tracking-[0.02em] text-hero-txt tabular-nums">{formatClock(elapsed)}</b>
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-hero-mute tabular-nums">{translate('pulse.leadChanges', { count: market.leadChanges })}</span>
      </figcaption>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5 text-[28px] leading-tight font-normal tracking-[-0.02em] text-hero-txt tabular-nums">
        <span
          key={market.tick}
          className={cx('rounded-md motion-reduce:animate-none', market.tick > 0 && (market.priceDirection === 'up' ? 'animate-tick-up' : 'animate-tick-down'))}
        >
          {market.price.toFixed(5)}
        </span>
        <em className={cx('self-center text-xs font-medium not-italic', pipsMoved >= 0 ? 'text-hero-up' : 'text-hero-down')}>
          {pipsMoved >= 0 ? '+' : ''}
          {pipsMoved.toFixed(1)} pips
        </em>
      </p>

      <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
        <SideTile side="buy" share={buyShare} isLeading={leader === 'buy'} />
        <span
          aria-hidden="true"
          className="grid size-[34px] animate-vs-pulse place-items-center rounded-full border border-hero-line-hi bg-hero-tile text-[11px] font-extrabold tracking-[0.06em] text-hero-txt motion-reduce:animate-none"
        >
          {translate('pulse.vs')}
        </span>
        <SideTile side="sell" share={sellShare} isLeading={leader === 'sell'} />
      </div>

      <div aria-hidden="true" className="relative mt-2.5 h-[5px] rounded-full bg-hero-sell shadow-[0_0_10px_color-mix(in_srgb,var(--hero-sell)_35%,transparent)]">
        <span
          className="relative block h-full rounded-l-full bg-hero-buy shadow-[0_0_10px_color-mix(in_srgb,var(--hero-buy)_45%,transparent)] transition-[width] duration-600 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
          style={{ width: `${buyShare}%` }}
        >
          <span className="absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgb(255_255_255/0.15),0_0_12px_rgb(255_255_255/0.8)]" />
        </span>
      </div>

      <div
        aria-hidden="true"
        className="relative -mx-5 mt-3 min-h-[140px] flex-1 bg-[radial-gradient(var(--hero-dots)_0.8px,transparent_1.1px)] bg-size-[7px_7px] bg-position-[3px_3px] [mask-image:linear-gradient(transparent,black_14%)]"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <line x1="0" x2="100" y1="50" y2="50" stroke="var(--hero-line-hi)" strokeWidth="1" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
          <polygon
            points={[...buyPoints, ...[...sellPoints].reverse()].join(' ')}
            className={cx('transition-[fill] duration-400', leader === 'buy' ? 'fill-hero-buy/10' : 'fill-hero-sell/10')}
          />
          <polyline
            points={sellPoints.join(' ')}
            fill="none"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-hero-sell drop-shadow-[0_0_3px_color-mix(in_srgb,var(--hero-sell)_75%,transparent)]"
          />
          <polyline
            points={buyPoints.join(' ')}
            fill="none"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-hero-buy drop-shadow-[0_0_3px_color-mix(in_srgb,var(--hero-buy)_75%,transparent)]"
          />
        </svg>

        <span className="absolute inset-y-0 w-px bg-hero-line-hi" style={{ left: `${NOW_X}%` }} />
        <span
          className="absolute z-[1] size-2 -translate-x-1/2 translate-y-1/2 animate-ping-soft rounded-full bg-hero-sell text-hero-sell transition-[bottom] duration-500 ease-out [animation-delay:0.7s] motion-reduce:animate-none motion-reduce:transition-none"
          style={{ left: `${NOW_X}%`, bottom: `${sellHeight}%` }}
        />
        <span
          className="absolute z-[1] size-2 -translate-x-1/2 translate-y-1/2 animate-ping-soft rounded-full bg-hero-buy text-hero-buy transition-[bottom] duration-500 ease-out motion-reduce:animate-none motion-reduce:transition-none"
          style={{ left: `${NOW_X}%`, bottom: `${buyHeight}%` }}
        />
        <span
          className="absolute right-0.5 translate-y-1/2 rounded bg-hero-sell px-1.5 py-0.5 text-[10px] font-bold text-on-hero-btn tabular-nums transition-[bottom] duration-500 ease-out motion-reduce:transition-none"
          style={{ bottom: `${pills.sell}%` }}
        >
          {sellShare.toFixed(1)}%
        </span>
        <span
          className="absolute right-0.5 translate-y-1/2 rounded bg-hero-buy px-1.5 py-0.5 text-[10px] font-bold text-on-hero-btn tabular-nums transition-[bottom] duration-500 ease-out motion-reduce:transition-none"
          style={{ bottom: `${pills.buy}%` }}
        >
          {buyShare.toFixed(1)}%
        </span>

        {market.flash && (
          <span
            key={market.flash.id}
            className={cx(
              'absolute top-[16%] left-1/2 z-[2] animate-flash rounded-full px-3 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap text-on-hero-btn opacity-0 motion-reduce:hidden',
              sideStyle[market.flash.side].bg,
            )}
          >
            {translate('pulse.takeLead', { side: translate(market.flash.side === 'buy' ? 'pulse.buyers' : 'pulse.sellers') })}
          </span>
        )}
      </div>

      <p key={market.tick} className="flex items-center gap-2 py-3 text-xs text-hero-mute animate-feed-in motion-reduce:animate-none">
        <span aria-hidden="true" className={cx('size-1.5 rounded-full', sideStyle[leader].bg)} />
        <b className="font-semibold text-hero-txt">{translate(leader === 'buy' ? 'pulse.buyers' : 'pulse.sellers')}</b>
        <span className={leaderShareMoved >= 0 ? 'text-hero-up' : 'text-hero-down'}>
          {leaderShareMoved >= 0 ? '+' : ''}
          {leaderShareMoved.toFixed(2)}%
        </span>
        <span>
          {translate('pulse.price')} {market.price.toFixed(5)}
        </span>
      </p>
    </figure>
  );
}
