'use client';

import type { CSSProperties, ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';
import '../promotion/market.css';

type PlatformKey = 'appStore' | 'googlePlay' | 'windows' | 'macos';

interface Platform {
  key: PlatformKey;
  osKey: MessageKey;
  available: boolean;
  logoClass: string;
}

const platforms: Platform[] = [
  { key: 'appStore', osKey: 'platforms.os.ios', available: true, logoClass: 'bg-black text-white' },
  { key: 'googlePlay', osKey: 'platforms.os.android', available: true, logoClass: 'bg-white ring-1 ring-line' },
  { key: 'windows', osKey: 'platforms.os.windows', available: true, logoClass: 'bg-sky-100' },
  { key: 'macos', osKey: 'platforms.os.macos', available: false, logoClass: 'bg-surface-2 text-fg' },
];

export function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
      <path d="M16.5 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-4Z" />
      <path d="M14.2 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
    </svg>
  );
}

export function GooglePlayLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d="M4 2.6 13.6 12 4 21.4c-.4-.2-.6-.7-.6-1.2V3.8c0-.5.2-1 .6-1.2Z" fill="#00d7fe" />
      <path d="m16.7 8.9-3.1 3.1L4 2.6l.2-.1c.4-.2.9-.2 1.3 0l11.2 6.4Z" fill="#00f076" />
      <path d="M16.7 15.1 5.5 21.5c-.4.2-.9.2-1.3 0l-.2-.1 9.6-9.4 3.1 3.1Z" fill="#ff3a44" />
      <path d="m20.3 10.8-3.6-1.9-3.1 3.1 3.1 3.1 3.6-2c.9-.5.9-1.8 0-2.3Z" fill="#ffd400" />
    </svg>
  );
}

function WindowsLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#00a4ef" aria-hidden="true">
      <path d="M3 5.2 10.4 4v7.3H3V5.2Zm8.4-1.3L21 2.5v8.8h-9.6V3.9ZM3 12.7h7.4V20L3 18.8v-6.1Zm8.4 0H21v8.8l-9.6-1.4v-7.4Z" />
    </svg>
  );
}

const platformLogo: Record<PlatformKey, () => ReactNode> = {
  appStore: AppleLogo,
  googlePlay: GooglePlayLogo,
  windows: WindowsLogo,
  macos: AppleLogo,
};

const RED = 'var(--aurora-cta-from)';
const SIGNAL_BARS = 5;
const SCREEN_CANDLES = 14;
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';

const isMobile = (key: PlatformKey) => key === 'appStore' || key === 'googlePlay';

// Deterministic candle series per platform so every device screen shows its own chart without hydration drift.
function candleSeries(seed: number) {
  return Array.from({ length: SCREEN_CANDLES }, (_, index) => {
    const wave = Math.sin((index + seed * 3) * 0.9) * 0.5 + 0.5;
    const drift = index / (SCREEN_CANDLES - 1);
    return { height: 18 + Math.round((wave * 0.45 + drift * 0.55) * 72), isUp: (index * 7 + seed) % 3 !== 0 };
  });
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/* ───────────── Device screen: a mini trading terminal running inside the phone / monitor ───────────── */

function TerminalScreen({ platform, index }: { platform: Platform; index: number }) {
  const Logo = platformLogo[platform.key];

  if (!platform.available) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-fg/[0.02]">
        <span className={cx('grid size-11 place-items-center rounded-xl opacity-60 [&_svg]:size-6', platform.logoClass)}>
          <Logo />
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-fg-subtle uppercase">
          <Icon name="clock" size={12} className="animate-pulse motion-reduce:animate-none" />
          {translate('platforms.comingSoon')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col bg-[#0b1512]">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1.5">
        <span className={cx('grid size-4 place-items-center rounded-[4px] [&_svg]:size-2.5', platform.logoClass)}>
          <Logo />
        </span>
        <span className="h-1 w-8 rounded-full bg-white/20" />
        <span className="mkt-blink ml-auto size-1.5 rounded-full bg-(--hero-buy)" />
      </div>
      <div className="relative flex-1 px-2 pt-2 pb-1.5">
        <span className="absolute inset-x-2 top-1/3 border-t border-dashed border-white/10" />
        <span className="mkt-march absolute inset-x-2 top-[42%] border-t border-dashed border-(--hero-buy)/60" />
        <span className="relative flex h-full items-end gap-[2px]">
          {candleSeries(index).map((candle, candleIndex) => {
            const isLast = candleIndex === SCREEN_CANDLES - 1;
            return (
              <span
                key={candleIndex}
                style={{ height: `${candle.height}%`, '--candle-delay': `${300 + index * 120 + candleIndex * 60}ms` } as CSSProperties}
                className={cx('flex-1 rounded-[1px]', isLast ? 'mkt-live' : 'mkt-candle', candle.isUp ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')}
              />
            );
          })}
        </span>
      </div>
    </div>
  );
}

/** Phone or desktop monitor frame around the terminal screen. */
function DeviceFrame({ platform, index }: { platform: Platform; index: number }) {
  if (isMobile(platform.key)) {
    return (
      <span aria-hidden="true" className="relative mx-auto block h-52 w-28 rounded-[22px] bg-fg/[0.08] p-1.5 ring-1 ring-line-strong transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:-rotate-3 motion-reduce:transition-none">
        <span className="absolute top-2.5 left-1/2 z-10 h-1.5 w-8 -translate-x-1/2 rounded-full bg-fg/25" />
        <span className={cx('block size-full overflow-hidden rounded-[17px] pt-3', platform.available ? 'bg-[#0b1512]' : 'border border-dashed border-line-strong')}>
          <TerminalScreen platform={platform} index={index} />
        </span>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="mx-auto flex w-full max-w-60 flex-col items-center transition-transform duration-500 group-hover:-translate-y-1.5 motion-reduce:transition-none">
      <span className="block h-36 w-full rounded-xl bg-fg/[0.08] p-1.5 ring-1 ring-line-strong">
        <span className={cx('block size-full overflow-hidden rounded-lg', platform.available ? 'bg-[#0b1512]' : 'border border-dashed border-line-strong')}>
          <TerminalScreen platform={platform} index={index} />
        </span>
      </span>
      <span className="h-6 w-8 bg-fg/[0.08]" />
      <span className="h-1.5 w-24 rounded-full bg-fg/[0.12]" />
    </span>
  );
}

/* ───────────── Install bay: device on top, name + OS + blurb, the action at the bottom ───────────── */

function PlatformBay({ platform, index }: { platform: Platform; index: number }) {
  return (
    <article
      style={staggerStyle(index + 2, 140)}
      className={cx(
        panelClass,
        'group flex min-w-0 animate-rise flex-col motion-reduce:animate-none',
        !platform.available && 'border border-dashed border-line-strong',
      )}
    >
      <div className="relative flex h-64 items-end justify-center border-b border-dashed border-line bg-fg/[0.02] px-5 pt-6 pb-5">
        <span aria-hidden="true" className="absolute top-3 left-4 font-mono text-[10px] font-black text-fg-subtle tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        {platform.available && <RedDot className="absolute top-3.5 right-4" />}
        <DeviceFrame platform={platform} index={index} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-fg">{translate(`platforms.${platform.key}.name`)}</h2>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-fg-muted uppercase ring-1 ring-line-strong">{translate(platform.osKey)}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{translate(`platforms.${platform.key}.text`)}</p>
        </div>

        <div className="mt-auto">
          {platform.available ? (
            <button
              type="button"
              className="group/download relative inline-flex h-12 w-full items-center justify-between gap-3 overflow-hidden rounded-lg bg-(--hero-buy) py-1 pr-1 pl-5 text-sm font-semibold text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
              <span className="relative">{translate('platforms.download')}</span>
              <span aria-hidden="true" style={{ background: RED }} className="relative grid size-10 place-items-center rounded-md text-[#062520] transition-transform duration-300 group-hover/download:translate-y-0.5 motion-reduce:transition-none">
                <Icon name="deposit" size={15} />
              </span>
            </button>
          ) : (
            <span aria-disabled="true" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-fg/[0.04] px-5 text-sm font-semibold text-fg-subtle ring-1 ring-line">
              <Icon name="clock" size={15} className="animate-pulse motion-reduce:animate-none" />
              {translate('platforms.comingSoon')}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ───────────── Connection board: each platform as a feed with live signal bars ───────────── */

function ConnectionBoard() {
  return (
    <ul style={staggerStyle(1, 140)} className="flex animate-rise flex-col divide-y divide-dashed divide-line rounded-xl bg-fg/[0.03] ring-1 ring-line motion-reduce:animate-none">
      {platforms.map((platform, index) => {
        const Logo = platformLogo[platform.key];
        return (
          <li key={platform.key} className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-5', platform.logoClass, !platform.available && 'opacity-60')}>
              <Logo />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-fg">{translate(`platforms.${platform.key}.name`)}</span>
              <span className={cx(captionClass, 'block truncate')}>{translate(platform.osKey)}</span>
            </span>
            <span aria-hidden="true" className="flex h-5 items-end gap-0.5">
              {Array.from({ length: SIGNAL_BARS }, (_, bar) => (
                <span
                  key={bar}
                  style={{ height: `${30 + bar * 17}%`, '--vol-delay': `${index * 0.2 + bar * 0.12}s` } as CSSProperties}
                  className={cx('w-1 rounded-t-[1px]', platform.available ? 'mkt-vol bg-(--hero-buy)' : 'border border-dashed border-line-strong')}
                />
              ))}
            </span>
            {platform.available ? (
              <span className="flex w-14 justify-end">
                <LiveDot />
              </span>
            ) : (
              <span className="w-14 text-right font-mono text-[9px] font-bold tracking-[0.1em] text-(--aurora-cta-from) uppercase">{translate('platforms.comingSoon')}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Skeleton: launcher hero (headline left, connection board right), then the four install bays as device mockups running a live terminal.
export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
        </span>
        <div className="grid gap-8 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
                <span className="absolute inset-0 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
                <span className="grid size-10 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25">
                  <Icon name="monitor" size={17} />
                </span>
                <RedDot className="absolute -top-0.5 -right-0.5" />
              </span>
              <h1 className="min-w-0 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.platforms')}</h1>
            </div>
            <p className="inline-flex items-center gap-2 self-start rounded-md bg-(--hero-buy)/12 py-1 pr-3 pl-2 text-xs font-semibold text-(--hero-buy) ring-1 ring-(--hero-buy)/30">
              <LiveDot />
              {translate('platforms.availableCount')}
            </p>
            <h2 className="text-3xl leading-[1.05] font-black tracking-tight text-fg sm:text-4xl">{translate('platforms.title')}</h2>
            <p className="max-w-lg text-sm leading-relaxed text-fg-muted">{translate('platforms.subtitle')}</p>
          </div>
          <ConnectionBoard />
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
        {platforms.map((platform, index) => (
          <PlatformBay key={platform.key} platform={platform} index={index} />
        ))}
      </div>
    </div>
  );
}
