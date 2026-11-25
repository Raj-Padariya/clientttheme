'use client';

import type { ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

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

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
      <path d="M16.5 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-4Z" />
      <path d="M14.2 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
    </svg>
  );
}

function GooglePlayLogo() {
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

// Each logo sits at a fixed point on the orbit and counter-rotates so it stays upright while the ring turns.
const orbitPositions = ['top-0 left-1/2', 'top-1/2 left-full', 'top-full left-1/2', 'top-1/2 left-0'];

function PlatformOrbit() {
  return (
    <div aria-hidden="true" className="relative size-56 shrink-0">
      <span className="absolute inset-0 rounded-full border border-dashed border-primary/30" />
      <span className="absolute inset-10 animate-ring-breathe rounded-full border border-primary/20 motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-[spin_24s_linear_infinite] motion-reduce:animate-none">
        {platforms.map((platform, index) => {
          const Logo = platformLogo[platform.key];
          return (
            <span
              key={platform.key}
              className={cx('absolute -translate-x-1/2 -translate-y-1/2', orbitPositions[index])}
            >
              <span
                className={cx(
                  'grid size-12 animate-[spin_24s_linear_infinite_reverse] place-items-center rounded-xl shadow-card motion-reduce:animate-none',
                  platform.logoClass,
                )}
              >
                <Logo />
              </span>
            </span>
          );
        })}
      </span>
      <span className="absolute inset-[72px] grid animate-float place-items-center overflow-hidden rounded-2xl bg-primary text-on-primary shadow-[0_0_44px_-6px_var(--brand-primary)] motion-reduce:animate-none">
        <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <Icon name="monitor" size={30} className="relative" />
      </span>
    </div>
  );
}

function PlatformCard({ platform, index }: { platform: Platform; index: number }) {
  const Logo = platformLogo[platform.key];

  return (
    <article
      style={staggerStyle(index, 250)}
      className={cx(
        'group relative flex animate-rise flex-col gap-5 overflow-hidden rounded-xl bg-surface p-5 transition-[translate,box-shadow] duration-300 sm:flex-row sm:items-center motion-reduce:animate-none motion-reduce:transition-none',
        platform.available
          ? 'glow-border shadow-card hover:-translate-y-1 hover:shadow-[0_26px_46px_-26px_color-mix(in_srgb,var(--brand-primary)_75%,transparent)]'
          : 'border border-dashed border-line-strong',
      )}
    >
      {platform.available && (
        <span
          aria-hidden="true"
          className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
        />
      )}

      <span
        className={cx(
          'relative grid size-16 shrink-0 place-items-center rounded-2xl shadow-card transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none',
          platform.logoClass,
          !platform.available && 'opacity-70',
        )}
      >
        <Logo />
      </span>

      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-fg">{translate(`platforms.${platform.key}.name`)}</h2>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
            {translate(platform.osKey)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{translate(`platforms.${platform.key}.text`)}</p>
      </div>

      {platform.available ? (
        <Button className="group/download relative shrink-0 overflow-hidden">
          <span
            aria-hidden="true"
            className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/download:translate-x-full motion-reduce:hidden"
          />
          <span className="relative">{translate('platforms.download')}</span>
          <Icon
            name="deposit"
            size={17}
            className="relative transition-transform duration-200 group-hover/download:translate-y-0.5 motion-reduce:transition-none"
          />
        </Button>
      ) : (
        <Button disabled className="relative shrink-0 overflow-hidden">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name="clock" size={17} className="relative" />
          <span className="relative">{translate('platforms.comingSoon')}</span>
        </Button>
      )}
    </article>
  );
}

export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.platforms')} />

      <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 size-80 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
        />
        <div className="relative flex flex-col items-center gap-8 p-6 sm:p-10 lg:flex-row lg:justify-between">
          <div className="flex max-w-xl flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
              <LiveDot />
              {translate('platforms.availableCount')}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('platforms.title')}</h2>
            <p className="text-sm leading-relaxed text-fg-muted">{translate('platforms.subtitle')}</p>
          </div>
          <PlatformOrbit />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {platforms.map((platform, index) => (
          <PlatformCard key={platform.key} platform={platform} index={index} />
        ))}
      </div>
    </div>
  );
}
