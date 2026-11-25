'use client';

import type { ReactNode } from 'react';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { useLiveMarket } from '@/core/market/useLiveMarket';
import { BrandLogo } from '../ui/BrandLogo';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { TerminalTicker, TicketTerminal } from './TicketTerminal';
import './ticketTerminal.css';

interface TicketProgress {
  filled: number;
  total: number;
}

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  /** Signup passes how many ticket fields are filled; the header then tracks Pending → Filled. */
  progress?: TicketProgress;
  children: ReactNode;
}

function TicketStatus({ progress }: { progress?: TicketProgress }) {
  if (!progress) {
    return (
      <span className="flex items-center gap-2">
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70 motion-reduce:hidden" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        {translate('auth.liveMarkets')}
      </span>
    );
  }
  const complete = progress.filled >= progress.total;
  return (
    <span className={`flex items-center gap-1.5 tabular-nums ${complete ? 'text-success' : 'text-accent'}`}>
      {complete && <Icon name="check" size={13} />}
      {progress.filled}/{progress.total}
    </span>
  );
}

// Locked to one viewport: the terminal window fills the screen and only the ticket pane scrolls.
export function AuthLayout({ title, subtitle, footer, progress, children }: AuthLayoutProps) {
  const { quotes, featured, candles } = useLiveMarket();
  const ratio = progress ? Math.min(progress.filled / progress.total, 1) : 0;

  return (
    <div className="flex h-dvh items-center justify-center overflow-hidden bg-app p-0 text-fg sm:p-4 lg:p-6">
      <div className="aur-term flex size-full max-w-6xl flex-col overflow-hidden border-line bg-surface sm:max-h-[50rem] sm:rounded-xl sm:border">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-4">
          <span className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-accent" />
            <span className="size-2.5 rounded-full bg-primary" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <BrandLogo href="/login" height={28} />
          <div className="hidden min-w-0 flex-1 md:flex">
            <TerminalTicker quotes={quotes} />
          </div>
          <div className="ml-auto md:ml-0">
            <ThemeToggle variant="switch" />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-line bg-surface-2/50 lg:block">
            <TicketTerminal featured={featured} quotes={quotes} candles={candles} />
          </aside>

          <main className="aur-print min-h-0 overflow-y-auto">
            <div className="bg-surface-2 px-6 pt-6 pb-5 sm:px-10 short:pt-4 short:pb-4">
              <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-subtle">
                <span>{translate('auth.portalBadge')}</span>
                <TicketStatus progress={progress} />
              </div>
              <h1 className="mt-4 font-display text-3xl leading-[1.05] tracking-tight text-balance sm:text-4xl short:mt-3 short:text-3xl">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>}
              {progress && (
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div
                    className={`h-full origin-left transition-transform duration-500 motion-reduce:transition-none ${ratio >= 1 ? 'bg-success' : 'bg-accent'}`}
                    style={{ transform: `scaleX(${ratio})` }}
                  />
                </div>
              )}
            </div>
            <div className="aur-perf" aria-hidden="true" />
            <div className="mx-auto w-full max-w-[30rem] px-6 py-6 sm:px-10 short:py-4">
              {children}
              {footer && <div className="mt-6 text-center text-sm text-fg-muted short:mt-4">{footer}</div>}
            </div>
          </main>
        </div>

        <footer className="flex shrink-0 flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-line px-4 py-2 font-mono text-[10px] leading-snug text-fg-subtle">
          <p>{brandConfig.legalText}</p>
          <p>{brandConfig.footerCopyright}</p>
        </footer>
      </div>
    </div>
  );
}
