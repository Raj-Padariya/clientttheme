'use client';

import type { ReactNode } from 'react';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { useLiveMarket } from '@/core/market/useLiveMarket';
import { BrandLogo } from '../ui/BrandLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { BullionBoard, CandleBuild, GoldTape, SpotBoard } from './BullionDesk';
import './bullionDesk.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

// Bullion desk, locked to one viewport: gold tape on top, candles building behind, one centred card with a
// gold line circling its edge. Only the card area scrolls on very short screens.
export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  const { quotes, featured, candles } = useLiveMarket();
  const isFeaturedUp = featured.changePercent >= 0;
  const boardQuotes = quotes.filter((quote) => quote.symbol !== featured.symbol).slice(0, 6);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-app text-fg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aura opacity-40" />
      <CandleBuild candles={candles} />
      <GoldTape quotes={quotes} />

      <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 sm:px-6 xl:px-12">
        <div className="m-auto flex w-full max-w-[90rem] items-center justify-center gap-12 2xl:gap-20">
        <aside className="bd-auth-rise hidden flex-1 justify-end xl:flex" aria-label={translate('auth.liveMarkets')}>
          <SpotBoard featured={featured} candles={candles} />
        </aside>
        <div className="bd-auth-rise w-full max-w-[30rem] shrink-0 py-6 short:py-4">
          <div className="bd-auth-frame rounded-[28px] bg-line p-px shadow-raised">
            <div className="rounded-[27px] bg-surface px-6 py-7 sm:px-9 sm:py-8 short:py-6">
              <div className="flex items-center justify-between gap-3">
                <BrandLogo href="/login" height={32} />
                <ThemeToggle variant="switch" />
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-y border-primary/20 py-2.5 text-[11px] short:mt-4 tiny:hidden">
                <span className="min-w-0 truncate font-medium uppercase tracking-[0.16em] text-primary sm:tracking-[0.24em]">
                  {translate('auth.portalBadge')}
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-semibold text-fg">{featured.symbol}</span>
                  <span key={featured.price} className="bd-auth-flip font-mono text-fg-muted tabular-nums">
                    {featured.price.toFixed(featured.digits)}
                  </span>
                  <span className={`font-mono tabular-nums ${isFeaturedUp ? 'text-success' : 'text-danger'}`}>
                    {isFeaturedUp ? '▲' : '▼'}
                  </span>
                </span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-normal leading-[1.05] tracking-tight text-balance text-fg sm:text-5xl short:mt-4 short:text-4xl">
                {title}
              </h1>
              {subtitle && <p className="mt-3 text-sm text-fg-muted sm:text-base short:mt-2 short:text-sm">{subtitle}</p>}
              <div className="mt-7 short:mt-5">{children}</div>
              {footer && <div className="mt-6 text-center text-sm text-fg-muted short:mt-4">{footer}</div>}
            </div>
          </div>
        </div>
        <aside className="bd-auth-rise hidden flex-1 justify-start xl:flex" aria-hidden="true">
          <BullionBoard quotes={boardQuotes} />
        </aside>
        </div>
      </main>

      <footer className="relative flex shrink-0 flex-wrap justify-center gap-x-2 gap-y-0.5 px-5 py-3 text-center text-[11px] leading-snug text-fg-subtle">
        <p>{brandConfig.legalText}</p>
        <p>{brandConfig.footerCopyright}</p>
      </footer>
    </div>
  );
}
