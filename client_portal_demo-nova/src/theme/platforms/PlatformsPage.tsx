'use client';

import type { ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

/** Install row: numbered logo bead on the left, name + OS + blurb in the middle, the action pill on the right. */
function PlatformRow({ platform, index }: { platform: Platform; index: number }) {
  const Logo = platformLogo[platform.key];

  return (
    <article
      style={staggerStyle(index, 140)}
      className={cx(
        panelClass,
        'group grid animate-feed-in items-center gap-4 p-4 transition-[translate] duration-300 hover:-translate-y-0.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5 sm:p-5 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        !platform.available && 'opacity-80',
      )}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="font-mono text-xs font-bold text-fg-subtle tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span aria-hidden="true" className="relative grid size-20 place-items-center">
          <span
            className={cx(
              'absolute inset-0 rounded-full border border-dashed transition-colors group-hover:animate-rim-spin motion-reduce:group-hover:animate-none',
              platform.available ? 'border-fg/35' : 'border-line-strong',
            )}
          />
          {platform.available && (
            <span style={{ animationDelay: `${index * 0.6}s` }} className="absolute inset-1 animate-ring-ripple rounded-full border border-fg/30 motion-reduce:hidden" />
          )}
          <span
            className={cx(
              'relative grid size-14 place-items-center rounded-full shadow-[0_14px_26px_-14px_rgb(0_0_0/0.9)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none',
              platform.logoClass,
            )}
          >
            <Logo />
          </span>
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-fg">{translate(`platforms.${platform.key}.name`)}</h2>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-fg-muted uppercase ring-1 ring-line-strong">{translate(platform.osKey)}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{translate(`platforms.${platform.key}.text`)}</p>
      </div>

      {platform.available ? (
        <button
          type="button"
          className="group/download relative inline-flex h-12 items-center justify-between gap-3 overflow-hidden rounded-full bg-fg pr-1.5 pl-5 text-sm font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-w-44 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/download:translate-x-full motion-reduce:hidden" />
          <span className="relative">{translate('platforms.download')}</span>
          <span aria-hidden="true" className="relative grid size-9 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/download:translate-y-0.5 motion-reduce:transition-none">
            <Icon name="deposit" size={15} />
          </span>
        </button>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-line-strong px-5 text-sm font-semibold text-fg-subtle sm:min-w-44"
        >
          <Icon name="clock" size={15} />
          {translate('platforms.comingSoon')}
        </span>
      )}
    </article>
  );
}

/** Logo dock inside the frost card: every platform floats as a bead; a solid dot marks the ones you can install now. */
function LogoDock() {
  return (
    <ul className="grid grid-cols-4 gap-2 rounded-[22px] bg-[#0a1220]/[0.06] p-3 ring-1 ring-[#0a1220]/10">
      {platforms.map((platform, index) => {
        const Logo = platformLogo[platform.key];
        return (
          <li key={platform.key} className="flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              style={{ animationDelay: `${index * 0.35}s` }}
              className={cx(
                'grid size-12 animate-float place-items-center rounded-full shadow-[0_10px_20px_-10px_rgb(10_18_32/0.6)] [&_svg]:size-6 motion-reduce:animate-none',
                platform.logoClass,
                !platform.available && 'opacity-60',
              )}
            >
              <Logo />
            </span>
            <span
              aria-hidden="true"
              style={{ animationDelay: `${300 + index * 120}ms` }}
              className={cx('size-1.5 animate-dot-pop rounded-full motion-reduce:animate-none', platform.available ? 'bg-[#0a1220]' : 'border border-dashed border-[#0a1220]/40')}
            />
            <span className="text-[9px] font-bold tracking-[0.12em] text-[#4b5a70] uppercase">{translate(platform.osKey)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className={cx(beadClass, 'size-9')}>
            <Icon name="monitor" size={15} />
          </span>
        </span>
        <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.platforms')}</h1>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <div className="animate-rise xl:sticky xl:top-24 motion-reduce:animate-none">
          <FrostCard>
            <div className="flex flex-col gap-4 text-[#0a1220] sm:p-1">
              <p className={cx('inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold', frostChipClass)}>
                <LiveDot />
                {translate('platforms.availableCount')}
              </p>
              <h2 className="text-4xl leading-[1.05] font-black tracking-[-0.03em]">{translate('platforms.title')}</h2>
              <p className="text-sm leading-relaxed font-medium text-[#3b4658]">{translate('platforms.subtitle')}</p>
              <LogoDock />
            </div>
          </FrostCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {platforms.map((platform, index) => (
            <PlatformRow key={platform.key} platform={platform} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
