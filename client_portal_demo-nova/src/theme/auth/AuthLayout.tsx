'use client';

import type { ReactNode } from 'react';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { useLiveMarket } from '@/core/market/useLiveMarket';
import { BrandLogo } from '../ui/BrandLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DepthMountain, OrderLadder, QuoteBeads } from './DepthBook';
import './depthBook.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

// Locked to one viewport: the depth chart sits under everything, and only the floating form panel scrolls.
export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  const { quotes, featured, candles } = useLiveMarket();

  return (
    <div className="relative isolate h-dvh overflow-hidden bg-app text-fg">
      <DepthMountain candles={candles} />

      <div className="relative grid h-full lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,30rem)] xl:grid-cols-[13rem_minmax(0,1fr)_minmax(0,32rem)]">
        <aside className="hidden h-[62%] border-r border-line/60 lg:block">
          <OrderLadder featured={featured} candles={candles} />
        </aside>

        <section className="hidden min-h-0 flex-col px-10 pt-8 lg:flex xl:px-14">
          <BrandLogo href="/login" height={34} />
          <div className="mt-[8vh] max-w-xl short:mt-8">
            <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.24em] text-fg-subtle">
              <span className="relative flex size-1.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              {translate('auth.liveMarkets')}
            </p>
            <h2 className="mt-5 font-display text-5xl leading-[1.04] tracking-tight text-balance xl:text-6xl short:mt-3 short:text-[2.75rem]">
              {brandConfig.promoHeadline}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-fg-muted tiny:hidden">{brandConfig.promoDescription}</p>
            <div className="mt-8 short:mt-5">
              <QuoteBeads quotes={quotes} />
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-col p-3 sm:p-5 lg:py-6 lg:pr-6 lg:pl-0">
          <div className="orbit-card nova-edge-light nova-auth-float-in relative isolate flex min-h-0 flex-1 flex-col overflow-hidden !rounded-3xl">
            <header className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5 sm:px-9">
              <span className="lg:invisible">
                <BrandLogo href="/login" height={30} />
              </span>
              <ThemeToggle variant="switch" />
            </header>

            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 sm:px-9">
              <div className="m-auto w-full max-w-[25rem] py-6 short:py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary tiny:hidden">{translate('auth.portalBadge')}</p>
                <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-balance short:text-3xl">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>}
                <div className="mt-7 short:mt-5">{children}</div>
                {footer && <div className="mt-6 text-center text-sm text-fg-muted short:mt-4">{footer}</div>}
              </div>
            </main>

            <footer className="shrink-0 border-t border-line px-6 py-3 text-[11px] leading-snug text-fg-subtle sm:px-9">
              <p>{brandConfig.legalText}</p>
              <p>{brandConfig.footerCopyright}</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
