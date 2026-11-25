'use client';

import type { ReactNode } from 'react';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { useLiveMarket } from '@/core/market/useLiveMarket';
import { BrandLogo } from '../ui/BrandLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LedExchangeWall, LedTickerStrip } from './LedExchangeWall';
import './ledWall.css';

interface FormProgress {
  filled: number;
  total: number;
}

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  /** Signup passes how many fields are filled; a capsule track lights up one capsule per field. */
  progress?: FormProgress;
  children: ReactNode;
}

function CapsuleTrack({ filled, total }: FormProgress) {
  const complete = filled >= total;
  return (
    <div className="mt-5 flex items-center gap-3" aria-hidden="true">
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          const isFilled = index < filled;
          const isNext = index === filled;
          let capsuleClass = 'bg-line';
          if (isFilled) capsuleClass = complete ? 'bg-success' : 'bg-(--zenith-red)';
          else if (isNext) capsuleClass = 'zen-auth-breathe bg-(--zenith-red)/40';
          return <span key={index} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${capsuleClass}`} />;
        })}
      </div>
      <span className={`font-mono text-xs tabular-nums ${complete ? 'text-success' : 'text-fg-muted'}`}>
        {filled}/{total}
      </span>
    </div>
  );
}

// Locked to one viewport: the LED wall fills the left, and only the form column scrolls if it must.
export function AuthLayout({ title, subtitle, footer, progress, children }: AuthLayoutProps) {
  const { quotes, featured } = useLiveMarket();

  return (
    <div className="grid h-dvh overflow-hidden bg-app text-fg lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <aside className="hidden min-h-0 p-3 lg:block">
        <LedExchangeWall quotes={quotes} featured={featured} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-10">
          <BrandLogo href="/login" height={32} />
          <ThemeToggle variant="switch" />
        </header>
        <div className="shrink-0 px-5 sm:px-10 lg:hidden">
          <LedTickerStrip quotes={quotes} />
        </div>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 sm:px-10">
          <div className="zen-auth-in m-auto w-full max-w-[26rem] py-6 short:py-4">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-fg-subtle tiny:hidden">
              <span className="zen-auth-blink size-1.5 rounded-full bg-(--zenith-red)" aria-hidden="true" />
              {translate('auth.portalBadge')}
            </p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl short:text-4xl">{title}</h1>
            {subtitle && <p className="mt-3 text-sm text-fg-muted sm:text-base short:mt-2 short:text-sm">{subtitle}</p>}
            {progress && <CapsuleTrack filled={progress.filled} total={progress.total} />}
            <div className="mt-8 short:mt-6">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-fg-muted short:mt-4">{footer}</div>}
          </div>
        </main>

        <footer className="flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 border-t border-line px-5 py-3 text-[11px] leading-snug text-fg-subtle sm:px-10">
          <p>{brandConfig.legalText}</p>
          <p>{brandConfig.footerCopyright}</p>
        </footer>
      </div>
    </div>
  );
}
