'use client';

import { useEffect, useMemo, useState } from 'react';
import { mockGoldCandles, mockQuotes } from '../mock/data';
import type { Candle, MarketQuote } from '../types';

const TICK_INTERVAL_MS = 2200;

export interface LiveMarket {
  quotes: MarketQuote[];
  featured: MarketQuote;
  candles: Candle[];
}

function nudgeQuote(quote: MarketQuote): MarketQuote {
  const move = (Math.random() - 0.5) * 0.0008;
  return {
    ...quote,
    price: Number((quote.price * (1 + move)).toFixed(quote.digits)),
    changePercent: Number((quote.changePercent + move * 100).toFixed(2)),
  };
}

function withLivePrice(candles: Candle[], price: number): Candle[] {
  const last = candles[candles.length - 1];
  return [
    ...candles.slice(0, -1),
    { ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) },
  ];
}

// Mock price feed: first render matches the server, then prices drift client-side.
export function useLiveMarket(): LiveMarket {
  const [quotes, setQuotes] = useState<MarketQuote[]>(mockQuotes);

  useEffect(() => {
    const timer = window.setInterval(() => setQuotes((current) => current.map(nudgeQuote)), TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const featured = quotes[0];
  const candles = useMemo(() => withLivePrice(mockGoldCandles, featured.price), [featured.price]);

  return { quotes, featured, candles };
}
