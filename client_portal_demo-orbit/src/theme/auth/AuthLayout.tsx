'use client';

import type { ReactNode } from 'react';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { useLiveMarket } from '@/core/market/useLiveMarket';
import { BrandLogo } from '../ui/BrandLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AssetOrbit } from './AssetOrbit';
import './assetOrbit.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

// Mirrored split, locked to one viewport: the asset orbit fills the left, and the calm form column on the
// right is the only part that scrolls on very short screens.
export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  const { quotes, featured } = useLiveMarket();

  return (
    <div className="grid h-dvh overflow-hidden bg-app text-fg lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <aside className="hidden min-h-0 p-4 lg:block">
        <AssetOrbit quotes={quotes} featured={featured} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-2 sm:px-10 lg:px-14">
          <BrandLogo href="/login" height={32} />
          <ThemeToggle variant="switch" />
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 sm:px-10 lg:px-14">
          <div className="orb-auth-rise m-auto w-full max-w-[26rem] py-6 short:py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-primary tiny:hidden">{translate('auth.portalBadge')}</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl short:text-4xl">{title}</h1>
            {subtitle && <p className="mt-3 text-sm text-fg-muted sm:text-base short:mt-2 short:text-sm">{subtitle}</p>}
            <div className="mt-8 short:mt-6">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-fg-muted short:mt-4">{footer}</div>}
          </div>
        </main>

        <footer className="shrink-0 px-5 py-4 text-[11px] leading-snug text-fg-subtle sm:px-10 lg:px-14">
          <p>{brandConfig.legalText}</p>
          <p>{brandConfig.footerCopyright}</p>
        </footer>
      </div>
    </div>
  );
}
