'use client';

import type { Candle, MarketQuote } from '@/core/types';

const DEPTH_WIDTH = 200;
const DEPTH_HEIGHT = 100;
const MID_GAP = 4;
const LADDER_LEVELS = 6;

function formatPrice(quote: MarketQuote) {
  return quote.price.toFixed(quote.digits);
}

function formatChange(changePercent: number) {
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

/** Running totals of candle ranges, used as cumulative depth on each side of the book. */
function cumulativeRanges(candles: Candle[]) {
  let total = 0;
  return candles.map((candle) => (total += candle.high - candle.low));
}

/** Step path for one side of the depth chart, growing outward from the mid-price gap. */
function depthPath(levels: number[], max: number, side: 'bid' | 'ask') {
  const half = DEPTH_WIDTH / 2;
  const start = side === 'bid' ? half - MID_GAP : half + MID_GAP;
  const span = half - MID_GAP;
  const direction = side === 'bid' ? -1 : 1;
  let path = `M${start},${DEPTH_HEIGHT}`;
  levels.forEach((level, index) => {
    const y = DEPTH_HEIGHT - (level / max) * DEPTH_HEIGHT * 0.85;
    const x = start + direction * ((index + 1) / levels.length) * span;
    path += ` V${y.toFixed(2)} H${x.toFixed(2)}`;
  });
  return `${path} V${DEPTH_HEIGHT} Z`;
}

export function DepthMountain({ candles }: { candles: Candle[] }) {
  if (candles.length < 2) return null;
  const middle = Math.floor(candles.length / 2);
  const bids = cumulativeRanges(candles.slice(0, middle).reverse());
  const asks = cumulativeRanges(candles.slice(middle));
  const max = Math.max(bids.at(-1) ?? 0, asks.at(-1) ?? 0) || 1;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]">
      <svg viewBox={`0 0 ${DEPTH_WIDTH} ${DEPTH_HEIGHT}`} preserveAspectRatio="none" className="nova-auth-breathe size-full">
        <path d={depthPath(bids, max, 'bid')} className="fill-success/15 stroke-success/70" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <path d={depthPath(asks, max, 'ask')} className="fill-danger/15 stroke-danger/70" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="nova-auth-beacon absolute inset-y-0 left-1/2 border-l border-dashed border-fg/40" />
    </div>
  );
}

interface OrderLadderProps {
  featured: MarketQuote;
  candles: Candle[];
}

/** Price levels stepped out from the live mid price; bar widths follow recent candle ranges. */
export function OrderLadder({ featured, candles }: OrderLadderProps) {
  const tick = 5 / 10 ** featured.digits;
  const ranges = candles.slice(-LADDER_LEVELS * 2).map((candle) => candle.high - candle.low);
  const maxRange = Math.max(...ranges, 0) || 1;
  const widthAt = (index: number) => `${30 + ((ranges[index % Math.max(ranges.length, 1)] ?? 0) / maxRange) * 70}%`;
  const asks = Array.from({ length: LADDER_LEVELS }, (_, index) => featured.price + (LADDER_LEVELS - index) * tick);
  const bids = Array.from({ length: LADDER_LEVELS }, (_, index) => featured.price - (index + 1) * tick);

  const row = (price: number, index: number, side: 'bid' | 'ask') => (
    <li key={`${side}-${index}`} className="relative flex h-7 items-center justify-end px-3 font-mono text-xs tabular-nums">
      <span
        aria-hidden="true"
        className={`nova-auth-flash absolute inset-y-1 right-0 origin-right rounded-l-md ${side === 'bid' ? 'bg-success/20' : 'bg-danger/20'}`}
        style={{ width: widthAt(index + (side === 'bid' ? LADDER_LEVELS : 0)), animationDelay: `${index * 0.2}s` }}
      />
      <span className={`relative ${side === 'bid' ? 'text-success' : 'text-danger'}`}>{price.toFixed(featured.digits)}</span>
    </li>
  );

  return (
    <div className="flex h-full flex-col justify-center" aria-hidden="true">
      <p className="px-3 pb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-subtle">{featured.symbol}</p>
      <ul>{asks.map((price, index) => row(price, index, 'ask'))}</ul>
      <p key={featured.price} className="nova-auth-tick nova-gloss my-2 rounded-lg px-3 py-2 text-right font-mono text-base font-semibold tabular-nums">
        {formatPrice(featured)}
      </p>
      <ul>{bids.map((price, index) => row(price, index, 'bid'))}</ul>
    </div>
  );
}

const BEAD_LIMIT = 6;

export function QuoteBeads({ quotes }: { quotes: MarketQuote[] }) {
  return (
    <ul className="grid max-w-md grid-cols-2 gap-2.5 xl:grid-cols-3 xl:max-w-xl">
      {quotes.slice(0, BEAD_LIMIT).map((quote) => (
        <li key={`${quote.symbol}-${quote.price}`} className="nova-auth-tick nova-gloss flex min-w-0 items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-xs">
          <span
            aria-hidden="true"
            className={`size-5 shrink-0 rounded-full ${quote.changePercent >= 0 ? 'bg-success/80' : 'bg-danger/80'} shadow-[inset_0_1px_0_rgb(255_255_255/0.5)]`}
          />
          <span className="truncate font-medium">{quote.symbol}</span>
          <span className={`ml-auto font-mono tabular-nums ${quote.changePercent >= 0 ? 'text-success' : 'text-danger'}`}>{formatChange(quote.changePercent)}</span>
        </li>
      ))}
    </ul>
  );
}
