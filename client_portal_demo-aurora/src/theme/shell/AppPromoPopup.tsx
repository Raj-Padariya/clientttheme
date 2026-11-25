'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { LiveDot } from '../pamm/motion';
import { AppleLogo, GooglePlayLogo } from '../platforms/PlatformsPage';
import { Icon } from '../ui/Icon';

// Session-scoped so a dismissed popup stays away while browsing, and greets the user again next visit.
const DISMISS_KEY = 'orbit-app-promo-dismissed';
const SHOW_DELAY_MS = 1200;
const STORE_SWAP_MS = 3600;

const stores: { nameKey: MessageKey; osKey: MessageKey; Logo: () => ReactNode }[] = [
  { nameKey: 'platforms.googlePlay.name', osKey: 'platforms.os.android', Logo: GooglePlayLogo },
  { nameKey: 'platforms.appStore.name', osKey: 'platforms.os.ios', Logo: AppleLogo },
];

// Four-point sparkles blinking around the card edge, staggered so one is always lit.
const sparks = [
  { className: '-top-2 left-8 size-3', delay: '0s' },
  { className: 'top-1/3 -left-2 size-2.5', delay: '0.55s' },
  { className: '-bottom-2 right-16 size-3', delay: '1.1s' },
  { className: 'top-1/2 -right-2 size-2', delay: '1.65s' },
];

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * Floating "get the app" card: rises in after a beat, a violet comet runs round its border, the store header
 * alternates Google Play / App Store, and the Install button shows a soft tap ripple. Closable for the session.
 */
export function AppPromoPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [storeIndex, setStoreIndex] = useState(0);

  useEffect(() => {
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;
    const timer = window.setTimeout(() => setIsVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setStoreIndex((index) => (index + 1) % stores.length), STORE_SWAP_MS);
    return () => window.clearInterval(timer);
  }, [isVisible]);

  function dismiss() {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
    setIsVisible(false);
  }

  if (!isVisible) return null;
  const store = stores[storeIndex];

  return (
    <aside
      aria-label={translate('nav.appTitle')}
      className="fixed inset-x-4 bottom-4 z-30 animate-popup-in motion-reduce:animate-none sm:right-5 sm:bottom-5 sm:left-auto sm:w-[18.5rem]"
    >
      {/* Whole card floats gently; a violet halo breathes behind it and sparkles blink around the edge. */}
      <div className="relative animate-popup-bob motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute -inset-3 -z-10 animate-popup-glow rounded-[34px] bg-primary/35 blur-2xl motion-reduce:animate-none" />
        {sparks.map((spark) => (
          <span
            key={spark.className}
            aria-hidden="true"
            style={{ animationDelay: spark.delay }}
            className={cx('pointer-events-none absolute z-10 animate-popup-spark text-primary motion-reduce:hidden', spark.className)}
          >
            <svg viewBox="0 0 12 12" className="size-full" fill="currentColor">
              <path d="M6 0 7.3 4.7 12 6 7.3 7.3 6 12 4.7 7.3 0 6 4.7 4.7Z" />
            </svg>
          </span>
        ))}

        <button
          type="button"
          onClick={dismiss}
          aria-label={translate('common.close')}
          title={translate('common.close')}
          className="absolute -top-3 -right-2 z-20 grid size-8 place-items-center rounded-full bg-[#062520] text-white shadow-pop ring-2 ring-surface transition-transform duration-200 hover:rotate-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="close" size={15} />
        </button>

        {/* Comet border: two bright arcs race round a 3px frame. */}
        <div className="relative isolate overflow-hidden rounded-[26px] p-[3px] shadow-[0_28px_60px_-24px_var(--brand-primary)]">
          <span aria-hidden="true" className="absolute inset-0 -z-20 bg-primary/25" />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -z-10 aspect-square w-[220%] -translate-1/2 animate-popup-comet bg-[conic-gradient(from_0deg,transparent_0deg,var(--brand-primary)_45deg,var(--brand-gleam)_80deg,white_90deg,transparent_120deg,transparent_180deg,var(--brand-primary)_225deg,var(--brand-gleam)_260deg,white_270deg,transparent_300deg)] motion-reduce:animate-none"
          />
          <div className="relative overflow-hidden rounded-[23px] bg-surface">
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-14 size-44 animate-popup-glow rounded-full bg-primary/20 blur-2xl motion-reduce:animate-none" />
            <div className="relative p-4">
              <div className="flex items-center justify-between gap-3">
                <span key={store.nameKey} className="flex animate-rise items-center gap-2 text-sm font-semibold text-fg-muted motion-reduce:animate-none">
                  <span className="grid size-6 place-items-center [&_svg]:size-5">
                    <store.Logo />
                  </span>
                  {translate(store.nameKey)}
                </span>
                <span className="flex items-center rounded-full bg-success/10 px-2 py-1 ring-1 ring-success/25">
                  <LiveDot />
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span aria-hidden="true" className="relative size-14 shrink-0">
                  <span className="absolute -inset-1 animate-pulse-ring rounded-[1.2rem] border-2 border-primary/50 motion-reduce:hidden" />
                  <span className="relative grid size-full place-items-center overflow-hidden rounded-2xl text-on-primary shadow-[0_14px_28px_-14px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-popup-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
                    <span className="relative animate-popup-wiggle motion-reduce:animate-none">
                      <Icon name="smartphone" size={24} />
                    </span>
                    <span className="absolute right-1.5 bottom-1.5 size-2.5 rounded-full bg-(--brand-gleam) ring-2 ring-surface" />
                  </span>
                </span>

                <div className="min-w-0">
                  <p className="text-base leading-tight font-semibold text-fg">{translate('nav.appTitle')}</p>
                  <p className="mt-1 text-xs leading-snug text-fg-muted">{translate('nav.appText')}</p>
                </div>
              </div>

              <ul className="mt-4 grid grid-cols-2 divide-x divide-line rounded-xl bg-surface-2 py-2 ring-1 ring-line">
                {stores.map((item) => {
                  const isActive = item.nameKey === store.nameKey;
                  return (
                    <li
                      key={item.osKey}
                      className={cx(
                        'flex items-center justify-center gap-1.5 text-xs font-semibold transition-[color,transform] duration-300',
                        isActive ? 'scale-110 text-primary' : 'text-fg-subtle',
                      )}
                    >
                      <span aria-hidden="true" className="grid size-4 place-items-center [&_svg]:size-4">
                        <item.Logo />
                      </span>
                      {translate(item.osKey)}
                    </li>
                  );
                })}
              </ul>

              <div className="relative mt-4">
                <Link
                  href="/platforms"
                  onClick={dismiss}
                  className="group relative flex h-11 animate-popup-press items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold text-on-primary shadow-[0_12px_26px_-12px_var(--brand-primary)] [background-image:var(--brand-gradient)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
                >
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-popup-shine bg-linear-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />
                  <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -mt-8 -ml-8 size-16 animate-popup-ripple rounded-full bg-white/40 motion-reduce:hidden" />
                  <Icon name="smartphone" size={16} className="relative" />
                  <span className="relative">{translate('nav.appInstall')}</span>
                  <Icon name="arrowRight" size={15} className="relative transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </Link>
                {/* Looping cursor that taps the button, as in an install ad. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute top-1/2 left-1/2 size-7 animate-popup-cursor drop-shadow-[0_3px_6px_rgb(0_0_0/0.4)] motion-reduce:hidden"
                >
                  <path d="M5 2.5 19 13l-6.2 1.1 3.6 6.4-2.6 1.4-3.6-6.5L5 19.2Z" fill="white" stroke="#062520" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
