'use client';

import { translate } from '@/core/i18n';
import type { Candle, MarketQuote } from '@/core/types';

const CANDLE_STEP = 10;
const CANDLE_BODY = 6;
const CHART_TOP = 4;
const CHART_HEIGHT = 92;
const CANDLE_STAGGER_S = 0.14;

// Edgeless dark pool behind the desk panels so the candles never run through their text.
const DESK_SCRIM = '-z-10 absolute -inset-x-20 -inset-y-24 bg-[radial-gradient(closest-side,var(--color-app)_70%,transparent)]';

function formatChange(changePercent: number) {
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

/** Left desk panel: the featured spot price, big, with its session range from the candles. */
export function SpotBoard({ featured, candles }: { featured: MarketQuote; candles: Candle[] }) {
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));
  const position = Math.min(Math.max((featured.price - low) / (high - low || 1), 0), 1) * 100;
  const isUp = featured.changePercent >= 0;

  return (
    <div className="relative w-full max-w-sm">
      <div aria-hidden="true" className={DESK_SCRIM} />
      <p className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.24em] text-primary">
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70 motion-reduce:hidden" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        {translate('auth.liveMarkets')}
      </p>
      <p className="mt-6 text-sm text-fg-muted">
        <span className="font-semibold text-fg">{featured.symbol}</span> · {featured.name}
      </p>
      <p className="mt-2 font-display text-6xl leading-none tracking-tight text-fg tabular-nums 2xl:text-7xl">
        <span key={featured.price} className="bd-auth-flip">
          {featured.price.toFixed(featured.digits)}
        </span>
      </p>
      <p className={`mt-3 font-mono text-sm tabular-nums ${isUp ? 'text-success' : 'text-danger'}`}>
        {isUp ? '▲' : '▼'} {formatChange(featured.changePercent)}
      </p>

      <div className="mt-8">
        <div className="relative h-1 rounded-full bg-line" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 rounded-full bg-primary/60 transition-[width] duration-700" style={{ width: `${position}%` }} />
          <span
            className="absolute top-1/2 size-2.5 -translate-1/2 rotate-45 bg-primary shadow-[0_0_0_3px_var(--color-app)] transition-[left] duration-700"
            style={{ left: `${position}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs tabular-nums text-fg-muted">
          <span>
            {translate('home.chartLow')} <span className="text-fg">{low.toFixed(featured.digits)}</span>
          </span>
          <span>
            {translate('home.chartHigh')} <span className="text-fg">{high.toFixed(featured.digits)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Right desk panel: the rest of the live quotes as a board; each price flips when it ticks. */
export function BullionBoard({ quotes }: { quotes: MarketQuote[] }) {
  return (
    <div className="relative w-full max-w-xs">
    <div aria-hidden="true" className={DESK_SCRIM} />
    <ul className="border-t border-primary/25">
      {quotes.map((quote) => {
        const isUp = quote.changePercent >= 0;
        return (
          <li key={quote.symbol} className="flex items-center gap-3 border-b border-line/70 py-2.5">
            <span aria-hidden="true" className="size-1.5 shrink-0 rotate-45 bg-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">{quote.symbol}</span>
              <span className="block truncate text-xs text-fg-subtle">{quote.name}</span>
            </span>
            <span className="text-right font-mono text-sm tabular-nums">
              <span key={quote.price} className="bd-auth-flip block text-fg">
                {quote.price.toFixed(quote.digits)}
              </span>
              <span className={`block text-xs ${isUp ? 'text-success' : 'text-danger'}`}>{formatChange(quote.changePercent)}</span>
            </span>
          </li>
        );
      })}
    </ul>
    </div>
  );
}

/** Scrolling gold quote tape across the top of the page. The list is doubled so the -50% loop is seamless. */
export function GoldTape({ quotes }: { quotes: MarketQuote[] }) {
  const loop = [...quotes, ...quotes];
  return (
    <div className="bd-auth-tape-wrap relative shrink-0 overflow-hidden border-b border-primary/25 bg-surface/60 backdrop-blur-sm">
      <ul className="bd-auth-tape flex w-max items-center py-2" aria-label="Live market prices">
        {loop.map((quote, index) => {
          const isUp = quote.changePercent >= 0;
          return (
            <li
              key={`${quote.symbol}-${index}`}
              aria-hidden={index >= quotes.length}
              className="flex items-center gap-2 border-r border-primary/15 px-5 text-xs whitespace-nowrap"
            >
              <span aria-hidden="true" className="size-1.5 rotate-45 bg-primary" />
              <span className="font-semibold tracking-wide text-fg">{quote.symbol}</span>
              <span key={quote.price} className="bd-auth-flip font-mono text-fg-muted tabular-nums">
                {quote.price.toFixed(quote.digits)}
              </span>
              <span className={`font-mono tabular-nums ${isUp ? 'text-success' : 'text-danger'}`}>{formatChange(quote.changePercent)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Gold candles that build left to right behind the card, hold, then rebuild. Up candles are solid, down candles hollow. */
export function CandleBuild({ candles }: { candles: Candle[] }) {
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));
  const range = high - low || 1;
  const toY = (value: number) => CHART_TOP + ((high - value) / range) * CHART_HEIGHT;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${candles.length * CANDLE_STEP} 100`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] w-full opacity-50 [mask-image:linear-gradient(to_top,black_35%,transparent)]"
    >
      {candles.map((candle, index) => {
        const isUp = candle.close >= candle.open;
        const bodyTop = toY(Math.max(candle.open, candle.close));
        const bodyHeight = Math.max(Math.abs(toY(candle.open) - toY(candle.close)), 0.8);
        const centerX = index * CANDLE_STEP + CANDLE_STEP / 2;
        return (
          <g key={index} className="bd-auth-candle" style={{ animationDelay: `${index * CANDLE_STAGGER_S}s` }}>
            <line
              x1={centerX}
              x2={centerX}
              y1={toY(candle.high)}
              y2={toY(candle.low)}
              className="stroke-primary"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={centerX - CANDLE_BODY / 2}
              y={bodyTop}
              width={CANDLE_BODY}
              height={bodyHeight}
              className={isUp ? 'fill-primary' : 'fill-app stroke-primary'}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}
