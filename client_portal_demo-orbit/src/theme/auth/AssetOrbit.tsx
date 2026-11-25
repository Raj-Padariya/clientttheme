'use client';

import type { CSSProperties } from 'react';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import type { MarketQuote } from '@/core/types';

interface RingSpec {
  /** Ring diameter as a fraction of the orbit square. */
  size: number;
  speed: string;
  /** Start angle (degrees) of the first planet, so rings don't line up. */
  phase: number;
  from: number;
  to: number;
}

// The featured quote sits in the core; the rest are shared out across three rings.
const RINGS: RingSpec[] = [
  { size: 0.52, speed: '12s', phase: 20, from: 1, to: 3 },
  { size: 0.76, speed: '18s', phase: 75, from: 3, to: 6 },
  { size: 1, speed: '26s', phase: 140, from: 6, to: 10 },
];

function formatPrice(quote: MarketQuote) {
  return quote.price.toFixed(quote.digits);
}

function formatChange(changePercent: number) {
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

function PlanetChip({ quote }: { quote: MarketQuote }) {
  const isUp = quote.changePercent >= 0;
  return (
    <span className="absolute flex -translate-1/2 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-2.5 pl-1 text-[11px] whitespace-nowrap shadow-card">
      <span aria-hidden="true" className={`size-4 rounded-full ${isUp ? 'bg-success/70' : 'bg-danger/70'}`} />
      <span className="font-semibold text-fg">{quote.symbol}</span>
      <span key={quote.price} className={`orb-auth-flip font-mono tabular-nums ${isUp ? 'text-success' : 'text-danger'}`}>
        {formatChange(quote.changePercent)}
      </span>
    </span>
  );
}

function Ring({ spec, quotes }: { spec: RingSpec; quotes: MarketQuote[] }) {
  const inset = `${((1 - spec.size) / 2) * 100}%`;
  return (
    <div
      className="orb-auth-ring absolute rounded-full border border-primary/25"
      style={{ inset, '--ring-speed': spec.speed } as CSSProperties}
    >
      {quotes.map((quote, index) => {
        const angle = ((spec.phase + (index * 360) / quotes.length) * Math.PI) / 180;
        return (
          <span
            key={quote.symbol}
            className="orb-auth-anchor"
            style={{ left: `${50 + 50 * Math.cos(angle)}%`, top: `${50 + 50 * Math.sin(angle)}%` }}
          >
            <PlanetChip quote={quote} />
          </span>
        );
      })}
    </div>
  );
}

interface AssetOrbitProps {
  quotes: MarketQuote[];
  featured: MarketQuote;
}

export function AssetOrbit({ quotes, featured }: AssetOrbitProps) {
  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface/40 px-10 pt-10 xl:px-12 short:pt-7">
      <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.24em] text-fg-subtle">
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70 motion-reduce:hidden" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        {translate('auth.liveMarkets')}
      </p>
      <h2 className="mt-5 max-w-lg font-display text-5xl leading-[1.04] tracking-tight text-balance text-fg xl:text-6xl short:mt-3 short:text-[2.75rem]">
        {brandConfig.promoHeadline}
      </h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-fg-muted short:mt-2 short:text-sm tiny:hidden">{brandConfig.promoDescription}</p>

      <div className="relative min-h-0 flex-1" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 aspect-square w-[min(calc(100%-6rem),40rem)] -translate-1/2">
          <div className="orb-auth-tilt absolute inset-0">
            {RINGS.map((spec) => (
              <Ring key={spec.size} spec={spec} quotes={quotes.slice(spec.from, spec.to)} />
            ))}
          </div>

          <span className="absolute top-1/2 left-1/2 grid size-20 -translate-1/2 place-items-center">
            <span className="orb-auth-pulse absolute inset-0 rounded-full border border-primary/40" />
            <span className="orb-auth-pulse absolute inset-0 rounded-full border border-primary/40 [animation-delay:1.2s]" />
            <span className="relative flex size-full flex-col items-center justify-center rounded-full border border-primary/30 bg-surface shadow-raised">
              <span className="text-[11px] font-semibold text-primary">{featured.symbol}</span>
              <span key={featured.price} className="orb-auth-flip font-mono text-xs text-fg tabular-nums">
                {formatPrice(featured)}
              </span>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
