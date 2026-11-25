import { Fragment } from 'react';
import { brandConfig } from '@/core/broker/config';
import type { Candle, MarketQuote } from '@/core/types';

const CHART_HEIGHT = 40;
const CHART_PAD = 4;
const LINE_END_X = 84;
const WORD_STAGGER_MS = 80;
// Where along the line the fill markers pop, as a share of the candle count.
const MARKER_STOPS = [0.18, 0.42, 0.66, 1];

function formatPrice(quote: MarketQuote) {
  return quote.price.toFixed(quote.digits);
}

function formatChange(changePercent: number) {
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

export function TerminalTicker({ quotes }: { quotes: MarketQuote[] }) {
  // Rendered twice so the -50% loop joins seamlessly.
  const tape = [...quotes, ...quotes];
  return (
    <div className="aur-tape-mask min-w-0 flex-1 overflow-hidden" aria-hidden="true">
      <div className="aur-tape flex w-max gap-6 font-mono text-[11px] whitespace-nowrap">
        {tape.map((quote, index) => (
          <span key={`${quote.symbol}-${index}`} className="flex items-center gap-2">
            <span className="text-fg-muted">{quote.symbol}</span>
            <span className="text-fg">{formatPrice(quote)}</span>
            <span className={quote.changePercent >= 0 ? 'text-success' : 'text-danger'}>{formatChange(quote.changePercent)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface TicketTerminalProps {
  featured: MarketQuote;
  quotes: MarketQuote[];
  candles: Candle[];
}

export function TicketTerminal({ featured, quotes, candles }: TicketTerminalProps) {
  const closes = candles.map((candle) => candle.close);
  const low = Math.min(...closes);
  const range = Math.max(...closes) - low || 1;
  // The line stops short of the right edge so the last-price tag and its pulse sit fully inside the frame.
  const points = closes.map((close, index) => ({
    x: closes.length > 1 ? (index / (closes.length - 1)) * LINE_END_X : LINE_END_X / 2,
    y: CHART_PAD + (1 - (close - low) / range) * (CHART_HEIGHT - CHART_PAD * 2),
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const area = `${line} L${LINE_END_X},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;
  const markers = points.length > 1 ? MARKER_STOPS.map((stop) => points[Math.round(stop * (points.length - 1))]) : [];
  const last = points.at(-1);
  const headlineWords = brandConfig.promoHeadline.split(' ');

  return (
    <div className="flex h-full min-h-0 flex-col p-8 xl:p-10 short:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-subtle">
            {featured.symbol} · {featured.name}
          </p>
          <p key={featured.price} className="aur-flash mt-1 font-mono text-3xl text-fg tabular-nums">
            {formatPrice(featured)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-xs ${
            featured.changePercent >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
          }`}
        >
          {formatChange(featured.changePercent)}
        </span>
      </div>

      <h2 className="mt-6 max-w-md font-display text-4xl leading-[1.05] tracking-tight text-balance text-fg xl:text-5xl short:mt-4 short:text-3xl">
        {headlineWords.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <span className="inline-block animate-word motion-reduce:animate-none" style={{ animationDelay: `${120 + index * WORD_STAGGER_MS}ms` }}>
              {word}
            </span>{' '}
          </Fragment>
        ))}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted tiny:hidden">{brandConfig.promoDescription}</p>

      <div className="relative mt-6 min-h-32 flex-1 overflow-hidden rounded-lg border border-line bg-surface short:mt-4" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px)] bg-[size:100%_25%] opacity-60" />
        <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="aur-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#aur-area)" />
          <path d={line} pathLength={1} className="aur-draw stroke-primary" fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="aur-sweep absolute inset-0">
          <span className="absolute inset-y-0 right-0 w-px bg-accent/70" />
        </div>

        {markers.map((point, index) => (
          <span
            key={index}
            className={`aur-pop absolute size-3 rounded-full border-2 border-surface ${index % 2 === 0 ? 'bg-success' : 'bg-accent'}`}
            style={{ left: `${point.x}%`, top: `${(point.y / CHART_HEIGHT) * 100}%`, animationDelay: `${index * 0.6}s` }}
          />
        ))}

        {last && (
          <>
            <span className="aur-ring absolute size-3 rounded-full bg-primary" style={{ left: `${last.x}%`, top: `${(last.y / CHART_HEIGHT) * 100}%` }} />
            <span className="absolute -translate-y-1/2 border-t border-dashed border-primary/60" style={{ left: `${last.x}%`, right: 0, top: `${(last.y / CHART_HEIGHT) * 100}%` }} />
            <span
              className="absolute right-2 -translate-y-1/2 rounded bg-primary px-1.5 py-0.5 font-mono text-[11px] text-on-primary tabular-nums"
              style={{ top: `clamp(12px, ${(last.y / CHART_HEIGHT) * 100}%, calc(100% - 12px))` }}
            >
              {formatPrice(featured)}
            </span>
          </>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4 tiny:hidden">
        {quotes.slice(0, 4).map((quote) => (
          <li key={quote.symbol} className="bg-surface px-3 py-2.5">
            <p className="font-mono text-[11px] text-fg-subtle">{quote.symbol}</p>
            <p key={quote.price} className="aur-flash font-mono text-sm text-fg tabular-nums">
              {formatPrice(quote)}
            </p>
            <p className={`font-mono text-[11px] ${quote.changePercent >= 0 ? 'text-success' : 'text-danger'}`}>{formatChange(quote.changePercent)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
