'use client';

import type { ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';

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

const RED = 'var(--zenith-red)';
const DOCK_LINK_CELLS = 5;
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/** Install tile: red index + logo ring on top, name + OS + blurb, the action capsule at the bottom. */
function PlatformTile({ platform, index }: { platform: Platform; index: number }) {
  const Logo = platformLogo[platform.key];

  return (
    <article
      style={staggerStyle(index, 140)}
      className={cx(
        'group relative isolate flex min-w-0 animate-rise flex-col gap-5 rounded-[30px] p-5 transition-[translate,box-shadow,background-color] duration-300 hover:-translate-y-1 sm:p-6 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        platform.available ? 'bg-fg/[0.03] ring-1 ring-line hover:bg-fg/[0.05] hover:ring-line-strong' : 'border border-dashed border-line-strong',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span aria-hidden="true" className="relative grid size-24 place-items-center">
          <span
            className={cx(
              'absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed motion-reduce:animate-none',
              platform.available ? 'border-fg/35' : 'border-line-strong [animation-duration:30s]',
            )}
          />
          {platform.available && (
            <>
              <span style={{ animationDelay: `${index * 0.6}s`, borderColor: RED }} className="absolute inset-1.5 animate-ring-ripple rounded-full border motion-reduce:hidden" />
              <span style={{ animationDuration: `${3.5 + index * 0.4}s` }} className="absolute inset-0 animate-rim-spin motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
              </span>
            </>
          )}
          <span
            className={cx(
              'relative grid size-16 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none',
              platform.logoClass,
              !platform.available && 'opacity-60',
            )}
          >
            <Logo />
          </span>
        </span>
        <span aria-hidden="true" className="font-mono text-sm font-black text-[var(--zenith-red)] tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight text-fg">{translate(`platforms.${platform.key}.name`)}</h2>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-fg-muted uppercase ring-1 ring-line-strong">{translate(platform.osKey)}</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{translate(`platforms.${platform.key}.text`)}</p>
      </div>

      <div className="mt-auto">
        {platform.available ? (
          <button
            type="button"
            className="group/download inline-flex h-12 w-full items-center justify-between gap-3 rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto sm:min-w-48 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {translate('platforms.download')}
            <span aria-hidden="true" style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white transition-transform duration-300 group-hover/download:translate-y-0.5 motion-reduce:transition-none">
              <Icon name="deposit" size={15} />
            </span>
          </button>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fg/[0.04] px-5 text-sm font-semibold text-fg-subtle sm:w-auto sm:min-w-48"
          >
            <Icon name="clock" size={15} className="animate-pulse motion-reduce:animate-none" />
            {translate('platforms.comingSoon')}
          </span>
        )}
      </div>
    </article>
  );
}

/** Logo dock: every platform sits on one capsule track joined by twinkling pixel links; a solid square marks the ones you can install now. */
function LogoDock() {
  return (
    <ul className="flex items-start justify-between gap-1 rounded-[32px] bg-fg/[0.03] p-4 ring-1 ring-line sm:rounded-full sm:px-6">
      {platforms.map((platform, index) => {
        const Logo = platformLogo[platform.key];
        const isLast = index === platforms.length - 1;
        return (
          <li key={platform.key} className={cx('flex min-w-0 items-start gap-1', !isLast && 'flex-1')}>
            <span className="flex flex-col items-center gap-2">
              <span
                aria-hidden="true"
                style={{ animationDelay: `${index * 0.35}s` }}
                className={cx('grid size-12 animate-float place-items-center rounded-full [&_svg]:size-6 motion-reduce:animate-none sm:size-14', platform.logoClass, !platform.available && 'opacity-60')}
              >
                <Logo />
              </span>
              <span
                aria-hidden="true"
                style={{ animationDelay: `${300 + index * 120}ms`, ...(platform.available ? {} : { borderColor: RED }) }}
                className={cx('size-2 animate-dot-pop rounded-[2px] motion-reduce:animate-none', platform.available ? 'bg-fg' : 'border border-dashed')}
              />
              <span className="text-[9px] font-bold tracking-[0.12em] text-fg-subtle uppercase">{translate(platform.osKey)}</span>
            </span>
            {!isLast && (
              <span aria-hidden="true" className="mt-5 flex flex-1 items-center justify-center gap-1 sm:mt-6">
                {Array.from({ length: DOCK_LINK_CELLS }, (_, cell) => (
                  <span
                    key={cell}
                    style={{ animationDelay: `${index * 300 + cell * 160}ms` }}
                    className="zenith-twinkle size-1.5 rounded-[2px] bg-fg/25"
                  />
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Skeleton: open title, a hero band (headline left, logo dock right), then the platforms as a 2×2 grid of install tiles.
export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-end gap-4 border-b border-line pb-6">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-10')}>
            <Icon name="monitor" size={16} />
          </span>
          <RedDot className="absolute top-0.5 right-0.5" />
        </span>
        <h1 className="min-w-0 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.platforms')}</h1>
      </header>

      <section className="zenith-tile grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-center">
        <div className="flex flex-col gap-4">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-semibold text-app">
            <LiveDot />
            {translate('platforms.availableCount')}
          </p>
          <h2 className="text-4xl leading-[1.05] font-black tracking-tight text-fg sm:text-5xl">{translate('platforms.title')}</h2>
          <p className="max-w-lg text-sm leading-relaxed text-fg-muted">{translate('platforms.subtitle')}</p>
        </div>
        <div style={staggerStyle(1, 140)} className="animate-rise motion-reduce:animate-none">
          <LogoDock />
        </div>
      </section>

      <div className="grid gap-4 border-t border-line pt-8 md:grid-cols-2">
        {platforms.map((platform, index) => (
          <PlatformTile key={platform.key} platform={platform} index={index} />
        ))}
      </div>
    </div>
  );
}
