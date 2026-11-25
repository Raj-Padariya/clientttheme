'use client';

import type { ReactNode } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useTilt } from '../lib/useTilt';
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

type DeviceKind = 'phone' | 'desktop';

const platformDevice: Record<PlatformKey, DeviceKind> = {
  appStore: 'phone',
  googlePlay: 'phone',
  windows: 'desktop',
  macos: 'desktop',
};

const screenGrid = 'bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:12px_12px]';

const stageLine = 'M0 96 L30 84 L60 90 L90 62 L120 70 L150 44 L180 52 L210 28 L240 34';
const stageBars = [40, 62, 48, 78, 58, 90];
const stageSparks = [
  { className: 'top-4 left-[72%] size-1', delay: '0s' },
  { className: 'top-16 right-1 size-1.5', delay: '1.2s' },
  { className: 'bottom-16 left-2 size-1', delay: '2.1s' },
  { className: 'top-1 left-[30%] size-1', delay: '0.6s' },
];

/**
 * Hero stage: the desktop chart draws itself with a glowing head riding the line while a scan beam sweeps the
 * screen; the phone in front runs a live equaliser and pulses. All loops stop under reduced motion.
 */
function DeviceStage() {
  return (
    <div aria-hidden="true" className="relative h-60 w-80 shrink-0">
      <span className="absolute inset-x-6 bottom-2 h-10 animate-twinkle rounded-full bg-primary/25 blur-2xl motion-reduce:animate-none" />
      {stageSparks.map((spark) => (
        <span
          key={spark.className}
          style={{ animationDelay: spark.delay }}
          className={cx('absolute animate-twinkle rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)] motion-reduce:animate-none', spark.className)}
        />
      ))}

      <div className="absolute top-0 left-0 flex w-64 animate-orbit-bob flex-col items-center [animation-duration:7s] motion-reduce:animate-none">
        <div className="w-full overflow-hidden rounded-xl border border-line-strong bg-surface-2/80 shadow-card">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-danger/70" />
            <span className="size-1.5 rounded-full bg-warning/70" />
            <span className="size-1.5 rounded-full bg-success/70" />
            <Icon name="monitor" size={12} className="ml-auto text-primary" />
          </div>
          <div className={cx('relative h-32 overflow-hidden', screenGrid)}>
            <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary/15 to-transparent [animation-duration:5s] motion-reduce:hidden" />
            <svg viewBox="0 0 240 120" className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="platforms-stage-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${stageLine} L240 120 L0 120 Z`} fill="url(#platforms-stage-fill)" className="animate-fill-breathe motion-reduce:animate-none" />
              <path
                d={stageLine}
                pathLength={100}
                strokeDasharray="100"
                fill="none"
                stroke="var(--brand-primary)"
                strokeWidth="7"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.25"
                vectorEffect="non-scaling-stroke"
                className="animate-line-draw blur-[3px] motion-reduce:animate-none"
              />
              <path
                d={stageLine}
                pathLength={100}
                strokeDasharray="100"
                fill="none"
                stroke="var(--brand-primary)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="animate-line-draw motion-reduce:animate-none"
              />
              <g className="motion-reduce:hidden">
                <circle r="9" fill="var(--brand-primary)" opacity="0.25">
                  <animateMotion dur="5s" repeatCount="indefinite" path={stageLine} keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="linear" />
                </circle>
                <circle r="3.5" fill="var(--brand-primary)" stroke="white" strokeWidth="1.5">
                  <animateMotion dur="5s" repeatCount="indefinite" path={stageLine} keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="linear" />
                </circle>
              </g>
              <circle cx="240" cy="34" r="3.5" fill="var(--brand-primary)" className="hidden motion-reduce:inline" />
            </svg>
          </div>
        </div>
        <span className="h-5 w-8 bg-linear-to-b from-line-strong to-line" />
        <span className="h-1.5 w-28 rounded-full bg-line-strong" />
      </div>

      {/* Phone in front: a mini trading-app screen (balance skeleton, sparkline card, equaliser, buy / sell pills). */}
      <div className="absolute right-0 bottom-0 w-28 animate-float motion-reduce:animate-none">
        <span className="absolute -inset-1.5 animate-pulse-ring rounded-[1.9rem] border border-primary/30 motion-reduce:hidden" />
        <div className="relative rounded-[1.6rem] bg-linear-to-b from-surface to-surface-2 p-1.5 shadow-[0_24px_44px_-20px_var(--brand-primary)] ring-1 ring-primary/30 light:ring-primary/20">
          <div className={cx('relative flex h-40 flex-col gap-2 overflow-hidden rounded-[1.2rem] bg-linear-to-b from-primary/[0.12] via-surface-2/80 to-surface-2 p-2', screenGrid)}>
            <span className="mx-auto flex h-3 w-12 items-center justify-end rounded-full bg-fg/85 pr-1 light:bg-fg/80">
              <LiveDot />
            </span>

            <span className="flex items-center gap-1.5">
              <span className="size-4 shrink-0 rounded-full bg-primary/25 ring-1 ring-primary/30" />
              <span className="flex flex-1 flex-col gap-1">
                <span className="h-1 w-3/4 rounded-full bg-fg/25" />
                <span className="h-1 w-1/2 rounded-full bg-fg/12" />
              </span>
            </span>

            <span className="relative block h-10 overflow-hidden rounded-lg bg-surface/80 ring-1 ring-line">
              <svg viewBox="0 0 240 120" preserveAspectRatio="none" className="absolute inset-0 size-full">
                <path d={`${stageLine} L240 120 L0 120 Z`} fill="var(--brand-primary)" fillOpacity="0.14" />
                <path d={stageLine} fill="none" stroke="var(--brand-primary)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </span>

            <span className="flex h-9 items-end justify-between gap-1 px-0.5">
              {stageBars.map((height, index) => (
                <span
                  key={height}
                  style={{ height: `${height}%`, animationDelay: `${index * 0.18}s` }}
                  className="w-1.5 origin-bottom animate-eq-bar rounded-full bg-linear-to-t from-primary/35 to-primary/75 motion-reduce:animate-none"
                />
              ))}
            </span>

            <span className="mt-auto grid grid-cols-2 gap-1">
              <span className="h-3.5 rounded-md bg-success/20 ring-1 ring-success/30" />
              <span className="h-3.5 rounded-md bg-danger/15 ring-1 ring-danger/25" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small device mockup that frames the platform logo on each tile. */
function DeviceMock({ platform }: { platform: Platform }) {
  const Logo = platformLogo[platform.key];
  const logoTile = (
    <span className={cx('grid size-14 place-items-center rounded-2xl shadow-card transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none', platform.logoClass, !platform.available && 'opacity-70')}>
      <Logo />
    </span>
  );

  if (platformDevice[platform.key] === 'phone') {
    return (
      <div className={cx('w-24 rounded-[1.4rem] border-2 bg-app p-1.5', platform.available ? 'border-primary/40' : 'border-dashed border-line-strong')}>
        <span className="mx-auto mb-1 block h-1 w-8 rounded-full bg-line-strong" />
        <div className={cx('grid h-32 place-items-center rounded-[1rem] bg-surface-2/70', screenGrid)}>{logoTile}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className={cx('w-44 rounded-xl border-2 bg-app p-1.5', platform.available ? 'border-primary/40' : 'border-dashed border-line-strong')}>
        <div className={cx('grid h-24 place-items-center rounded-lg bg-surface-2/70', screenGrid)}>{logoTile}</div>
      </div>
      <span className="h-3 w-6 bg-line-strong" />
      <span className="h-1.5 w-20 rounded-full bg-line-strong" />
    </div>
  );
}

function PlatformTile({ platform, index }: { platform: Platform; index: number }) {
  const tilt = useTilt<HTMLElement>(5);

  return (
    <article
      {...tilt}
      style={staggerStyle(index, 160)}
      className={cx(
        'orbit-tilt orbit-card group relative flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none',
        platform.available ? 'hover:shadow-[0_26px_46px_-26px_var(--brand-primary)]' : 'opacity-85',
      )}
    >
      <div className="relative isolate grid h-52 place-items-center border-b border-line">
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_70%,color-mix(in_oklab,var(--brand-primary)_22%,transparent),transparent_65%)]" />
        <span aria-hidden="true" className="absolute top-3 left-3 font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
        <span className="absolute top-3 right-3 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
          {translate(platform.osKey)}
        </span>
        <div className="transition-transform duration-500 group-hover:-translate-y-1.5 motion-reduce:transition-none">
          <DeviceMock platform={platform} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-fg">{translate(`platforms.${platform.key}.name`)}</h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{translate(`platforms.${platform.key}.text`)}</p>
        </div>

        {platform.available ? (
          <Button fullWidth className="group/download">
            <span>{translate('platforms.download')}</span>
            <Icon name="deposit" size={17} className="transition-transform duration-200 group-hover/download:translate-y-0.5 motion-reduce:transition-none" />
          </Button>
        ) : (
          <Button fullWidth disabled>
            <Icon name="clock" size={17} />
            <span>{translate('platforms.comingSoon')}</span>
          </Button>
        )}
      </div>
    </article>
  );
}

export default function PlatformsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.platforms')} />

      <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
        <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_left,#000,transparent_60%)]', screenGrid)} />
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 right-24 -z-10 size-80 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

        <div className="flex flex-col items-center gap-10 p-6 sm:p-10 lg:flex-row lg:justify-between">
          <div className="flex max-w-xl min-w-0 flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <LiveDot />
              {translate('platforms.availableCount')}
            </p>
            <h2 className="orbit-text text-3xl font-semibold tracking-tight sm:text-4xl">{translate('platforms.title')}</h2>
            <p className="text-sm leading-relaxed text-fg-muted">{translate('platforms.subtitle')}</p>

            <div aria-hidden="true" className="mt-3 flex items-end gap-3 rounded-2xl border border-line bg-fg/[0.03] px-4 pt-3 pb-2 backdrop-blur-sm">
              {platforms.map((platform, index) => {
                const Logo = platformLogo[platform.key];
                return (
                  <span key={platform.key} style={staggerStyle(index, 110)} className="flex animate-rise flex-col items-center gap-1.5 motion-reduce:animate-none">
                    <span
                      className={cx(
                        'grid size-11 place-items-center rounded-xl shadow-card transition-transform duration-200 hover:-translate-y-1.5 motion-reduce:transition-none [&_svg]:size-6',
                        platform.logoClass,
                        !platform.available && 'opacity-60',
                      )}
                    >
                      <Logo />
                    </span>
                    <span className={cx('size-1 rounded-full', platform.available ? 'bg-primary' : 'bg-line-strong')} />
                  </span>
                );
              })}
            </div>
          </div>
          <DeviceStage />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
        {platforms.map((platform, index) => (
          <PlatformTile key={platform.key} platform={platform} index={index} />
        ))}
      </div>
    </div>
  );
}
