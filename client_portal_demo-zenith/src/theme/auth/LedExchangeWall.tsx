'use client';

import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import type { MarketQuote } from '@/core/types';

function formatPrice(quote: MarketQuote) {
  return quote.price.toFixed(quote.digits);
}

function formatChange(changePercent: number) {
  return `${changePercent >= 0 ? '▲' : '▼'} ${Math.abs(changePercent).toFixed(2)}%`;
}

function changeColor(changePercent: number) {
  return changePercent >= 0 ? 'text-(--led-green)' : 'text-(--led-red)';
}

/** Each character is keyed by position + value, so only the digits that changed remount and flip. */
function FlipDigits({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      {value.split('').map((char, index) => (
        <span key={`${index}-${char}`} className="zen-auth-flip">
          {char}
        </span>
      ))}
    </span>
  );
}

function TickerRow({ quotes, className }: { quotes: MarketQuote[]; className: string }) {
  // Rendered twice so a -50% slide loops seamlessly.
  const loop = [...quotes, ...quotes];
  return (
    <div className="overflow-hidden">
      <div className={`flex w-max gap-10 whitespace-nowrap ${className}`}>
        {loop.map((quote, index) => (
          <span key={`${quote.symbol}-${index}`} className="flex items-baseline gap-3">
            <span>{quote.symbol}</span>
            <span className="text-white/90 tabular-nums">{formatPrice(quote)}</span>
            <span className={changeColor(quote.changePercent)}>{formatChange(quote.changePercent)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Slim one-row LED tape for screens where the full wall is hidden. */
export function LedTickerStrip({ quotes }: { quotes: MarketQuote[] }) {
  return (
    <div className="zen-auth-board zen-auth-grid rounded-full px-4 py-2 font-mono text-xs" aria-hidden="true">
      <TickerRow quotes={quotes} className="zen-auth-scroll" />
    </div>
  );
}

interface LedExchangeWallProps {
  quotes: MarketQuote[];
  featured: MarketQuote;
}

export function LedExchangeWall({ quotes, featured }: LedExchangeWallProps) {
  return (
    <section className="zen-auth-board zen-auth-grid relative flex h-full flex-col overflow-hidden rounded-2xl font-mono">
      <div aria-hidden="true" className="zen-auth-scan pointer-events-none absolute inset-0" />

      <header className="relative flex items-center justify-between gap-4 border-b border-white/10 px-8 py-4 text-xs uppercase tracking-[0.3em]">
        <span className="flex items-center gap-2.5">
          <span className="zen-auth-blink size-2 rounded-full bg-(--led-red)" aria-hidden="true" />
          {translate('auth.liveMarkets')}
        </span>
        <span className="text-(--led-dim)">{brandConfig.brandName}</span>
      </header>

      <div className="relative px-8 pt-7 short:pt-5">
        <p className="text-xs uppercase tracking-[0.25em] text-(--led-dim)">
          {featured.symbol} · {featured.name}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="zen-auth-led text-[clamp(3.5rem,6.5vw,6rem)] leading-none font-bold">
            <FlipDigits value={formatPrice(featured)} />
          </p>
          <p className={`zen-auth-led pb-2 text-3xl font-bold ${changeColor(featured.changePercent)}`}>{formatChange(featured.changePercent)}</p>
        </div>
      </div>

      <div className="relative mt-7 flex flex-col gap-3 border-y border-dashed border-white/12 py-4 text-xl font-bold short:mt-5 short:py-3" aria-hidden="true">
        <TickerRow quotes={quotes} className="zen-auth-led zen-auth-scroll" />
        <TickerRow quotes={quotes} className="zen-auth-led zen-auth-scroll-slow text-white/80" />
      </div>

      <ul className="relative min-h-0 flex-1 overflow-hidden px-8 py-4 text-sm">
        {quotes.map((quote) => (
          <li
            key={quote.symbol}
            className="grid grid-cols-[minmax(0,1fr)_auto_6.5rem] items-baseline gap-4 border-b border-white/6 py-2.5 last:border-0 short:py-1.5 tiny:py-1"
          >
            <span className="truncate">
              {quote.symbol}
              <span className="ml-3 text-xs text-(--led-dim) max-xl:hidden">{quote.name}</span>
            </span>
            <FlipDigits value={formatPrice(quote)} className="text-white/90" />
            <span className={`text-right ${changeColor(quote.changePercent)}`}>{formatChange(quote.changePercent)}</span>
          </li>
        ))}
      </ul>

      <footer className="relative border-t border-white/10 px-8 py-5 short:py-4">
        <p className="font-display text-2xl leading-tight tracking-tight text-balance text-white xl:text-3xl">{brandConfig.promoHeadline}</p>
        <p className="mt-2 max-w-lg font-sans text-sm text-(--led-dim) tiny:hidden">{brandConfig.promoDescription}</p>
      </footer>
    </section>
  );
}
