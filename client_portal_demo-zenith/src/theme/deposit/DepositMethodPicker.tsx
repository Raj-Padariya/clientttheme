'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { durationLabel, FeeChip, feeLabel, kindIcon, limitsText } from '../payment/PaymentParts';
import { Icon } from '../ui/Icon';

const TILE_STAGGER_MS = 70;
const MIN_ETA_SHARE = 6;
const ETA_TICKS = [0, 25, 50, 75, 100];

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const labelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

function WaveLines({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[200%]">
      {WAVE_PATHS.map((path) => (
        <path key={path} d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** Average time against the "up to" ceiling as a horizontal ember track with a bead at the average. */
function EtaTrack({ method }: { method: PaymentMethod }) {
  const isImmediate = method.averageMinutes <= 0;
  const share = method.maxMinutes > 0 ? Math.max(Math.min((method.averageMinutes / method.maxMinutes) * 100, 100), MIN_ETA_SHARE) : 100;

  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cx(labelClass, 'flex items-center gap-1.5')}>
            <Icon name={isImmediate ? 'bolt' : 'clock'} size={12} />
            {translate('payment.averageTime')}
          </p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-[-0.02em] text-fg">{durationLabel(method.averageMinutes)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className={labelClass}>{translate('payment.upTo')}</p>
          <p className="mt-1 truncate text-sm font-semibold text-fg-muted">{durationLabel(method.maxMinutes)}</p>
        </div>
      </div>
      <div aria-hidden="true" className="relative mt-4 h-2.5 rounded-full bg-fg/[0.07]">
        {ETA_TICKS.map((tick) => (
          <span key={tick} className="absolute -bottom-2.5 size-1 -translate-x-1/2 rounded-full bg-fg/25" style={{ left: `${tick}%` }} />
        ))}
        <span className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-(--hero-buy) motion-reduce:animate-none" style={{ width: `${share}%` }} />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 animate-pop-in rounded-full border-[3px] border-(--hero-buy) bg-white [animation-delay:600ms] motion-reduce:animate-none"
          style={{ left: `${share}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The previewed method as a wide stage across the top: method coin and name, the ETA track, limits and the action.
 * Re-keyed per method so switching replays the entrance and the track draw.
 */
function MethodStage({ method, onChoose }: { method: PaymentMethod; onChoose: () => void }) {
  const isFree = method.feePercent === 0;

  return (
    <section aria-label={method.name} className={cx(boardCard, 'relative isolate overflow-hidden p-5 sm:p-6')}>
      <div
        key={method.id}
        className="grid animate-rise items-center gap-6 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto]"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative isolate grid size-16 shrink-0 animate-pop-in place-items-center overflow-hidden rounded-[20px] bg-(--hero-buy) text-[#160904] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] motion-reduce:animate-none">
            <WaveLines color="white" opacity={0.45} />
            <Icon name={kindIcon[method.kind]} size={28} />
          </span>
          <div className="min-w-0">
            <p className={labelClass}>{translate(`payment.kind.${method.kind}`)}</p>
            <p className="mt-1 truncate text-3xl font-semibold tracking-[-0.02em] text-fg">{method.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', isFree ? 'bg-success/10 text-success ring-success/30' : 'bg-fg/[0.06] text-fg ring-fg/10')}>
                {feeLabel(method)}
              </span>
              <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 text-[11px] ring-1 ring-fg/10">
                <span className="text-fg-subtle">{translate('payment.limits')}</span> <span className="font-semibold text-fg tabular-nums">{limitsText(method)}</span>
              </span>
            </div>
          </div>
        </div>

        <EtaTrack method={method} />

        <button
          type="button"
          onClick={onChoose}
          className={cx(
            'group/cta relative isolate inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-fg px-8 text-sm font-bold text-surface transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none lg:col-span-2 xl:col-span-1 xl:w-auto',
            focusRing,
          )}
        >
          {translate('deposit.processFor')}
          <span className="grid size-7 place-items-center rounded-full bg-(--hero-buy) text-[#160904] transition-transform group-hover/cta:translate-x-1 motion-reduce:transition-none">
            <Icon name="arrowRight" size={15} />
          </span>
        </button>
      </div>
    </section>
  );
}

// One method as a compact tile in the grid below the stage; hovering or clicking puts it on the stage.
function MethodTile({ method, index, isActive, onPreview }: { method: PaymentMethod; index: number; isActive: boolean; onPreview: () => void }) {
  return (
    <li className="zenith-tile min-w-0" style={{ animationDelay: `${100 + index * TILE_STAGGER_MS}ms` }}>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onPreview}
        onMouseEnter={onPreview}
        className={cx(
          'group/tile relative isolate flex h-full w-full flex-col gap-4 overflow-hidden rounded-[24px] p-4 text-left transition-[translate,background-color,box-shadow] duration-300 motion-reduce:transition-none',
          focusRing,
          isActive ? '-translate-y-1 bg-fg/[0.07] ring-2 ring-(--hero-buy)' : 'bg-surface ring-1 ring-fg/[0.08] hover:-translate-y-1 hover:ring-fg/20',
        )}
      >
        <span aria-hidden="true" className={cx('pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 overflow-hidden transition-opacity duration-500', isActive ? 'opacity-100' : 'opacity-0')}>
          <WaveLines color="var(--hero-buy)" opacity={0.4} />
        </span>

        <span className="flex items-center justify-between gap-2">
          <span
            className={cx(
              'grid size-11 shrink-0 place-items-center rounded-2xl transition-[transform,background-color,color] duration-300 group-hover/tile:scale-105 motion-reduce:transition-none',
              isActive ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.07] text-fg ring-1 ring-fg/10',
            )}
          >
            <Icon name={kindIcon[method.kind]} size={19} />
          </span>
          <FeeChip method={method} />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-fg">{method.name}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">
            {translate(`payment.kind.${method.kind}`)} · {durationLabel(method.averageMinutes)}
          </span>
        </span>

        <span className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-fg/12 pt-3">
          <span className="min-w-0">
            <span className="block text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('payment.limits')}</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-fg tabular-nums">{limitsText(method)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.15em] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
            <span
              aria-hidden="true"
              className={cx(
                'grid size-8 place-items-center rounded-full transition-[background-color,color,rotate] duration-300 motion-reduce:transition-none',
                isActive ? '-rotate-45 bg-fg text-surface' : 'text-fg-subtle ring-1 ring-fg/12 group-hover/tile:text-fg',
              )}
            >
              <Icon name="arrowRight" size={14} />
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

// Zenith deposit method step: the previewed method as a wide stage on top, every method as a tile grid beneath it.
export function DepositMethodPicker({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  const [previewId, setPreviewId] = useState(methods[0]?.id);
  const preview = methods.find((method) => method.id === previewId) ?? methods[0];
  if (!preview) return null;

  return (
    <div className="flex flex-col gap-5">
      <MethodStage method={preview} onChoose={() => onChoose(preview.id)} />
      <ul aria-label={translate('payment.methodsLabel')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {methods.map((method, index) => (
          <MethodTile key={method.id} method={method} index={index} isActive={method.id === preview.id} onPreview={() => setPreviewId(method.id)} />
        ))}
      </ul>
    </div>
  );
}
