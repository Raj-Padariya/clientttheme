'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { FrostCard } from '../dashboard/FrostCard';
import { durationLabel, FeeChip, feeLabel, kindIcon, limitsText } from '../payment/PaymentParts';
import { Icon } from '../ui/Icon';

const TILE_STAGGER_MS = 70;
const MIN_ETA_SHARE = 6;
const DIAL_R = 48;
const DIAL_CX = 60;
const DIAL_CY = 58;
const DIAL_TICKS = [0, 25, 50, 75, 100];

const frostInk = 'text-[#0a1220]';
const frostMuted = 'text-[#4b5a70]';

// One method as a deck tile: hovering or clicking it puts it on the frost stage.
function MethodTile({ method, index, isActive, onPreview }: { method: PaymentMethod; index: number; isActive: boolean; onPreview: () => void }) {
  return (
    <li className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${100 + index * TILE_STAGGER_MS}ms` }}>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onPreview}
        onMouseEnter={onPreview}
        className={cx(
          'group/tile relative isolate flex h-full w-full flex-col overflow-hidden rounded-[22px] p-px text-left transition-[translate,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          isActive ? '-translate-y-1 shadow-pop' : 'hover:-translate-y-1',
        )}
      >
        <span aria-hidden="true" className="absolute inset-0 -z-20 bg-line" />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-0 -z-10 animate-rim-spin transition-opacity duration-500 motion-reduce:animate-none',
            'bg-[conic-gradient(from_var(--wallet-rim),transparent_0%,var(--brand-primary)_12%,transparent_26%,transparent_50%,color-mix(in_srgb,var(--brand-primary)_50%,transparent)_62%,transparent_76%)]',
            isActive ? 'opacity-100' : 'opacity-0 group-hover/tile:opacity-50',
          )}
        />

        <span className={cx('relative isolate flex flex-1 flex-col gap-4 overflow-hidden rounded-[21px] p-4 transition-colors duration-300', isActive ? 'nova-edge-light bg-elevated' : 'bg-surface')}>
          {isActive && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}

          <span className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-[0.15em] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
            <FeeChip method={method} />
          </span>

          <span className="flex min-w-0 items-center gap-3">
            <span
              className={cx(
                'grid size-12 shrink-0 place-items-center rounded-2xl transition-[transform,color] duration-300 group-hover/tile:scale-105 motion-reduce:transition-none',
                isActive ? 'bg-[image:var(--brand-gradient)] text-on-primary' : 'nova-gloss text-primary',
              )}
            >
              <Icon name={kindIcon[method.kind]} size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-fg">{method.name}</span>
              <span className="mt-0.5 block truncate text-xs text-fg-muted">
                {translate(`payment.kind.${method.kind}`)} · {durationLabel(method.averageMinutes)}
              </span>
            </span>
          </span>

          <span className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-line pt-3">
            <span className="min-w-0">
              <span className="block text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('payment.limits')}</span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-fg tabular-nums">{limitsText(method)}</span>
            </span>
            <span
              aria-hidden="true"
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-full ring-1 transition-[background-color,color,rotate] duration-300 motion-reduce:transition-none',
                isActive ? '-rotate-45 bg-primary text-on-primary ring-primary' : 'text-fg-subtle ring-line group-hover/tile:text-fg',
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

function dialPoint(share: number, radius = DIAL_R) {
  const angle = Math.PI * (1 - share / 100);
  return { x: DIAL_CX + radius * Math.cos(angle), y: DIAL_CY - radius * Math.sin(angle) };
}

// Average time against the "up to" ceiling as a half dial: the arc sweeps to average / up-to and draws in per method.
function EtaDial({ method }: { method: PaymentMethod }) {
  const isImmediate = method.averageMinutes <= 0;
  const share = method.maxMinutes > 0 ? Math.max(Math.min((method.averageMinutes / method.maxMinutes) * 100, 100), MIN_ETA_SHARE) : 100;
  const start = dialPoint(0);
  const end = dialPoint(100);
  const tip = dialPoint(share);
  const track = `M${start.x},${start.y} A${DIAL_R},${DIAL_R} 0 0 1 ${end.x},${end.y}`;
  const value = `M${start.x},${start.y} A${DIAL_R},${DIAL_R} 0 0 1 ${tip.x},${tip.y}`;

  return (
    <div className="rounded-2xl bg-white/55 p-4 ring-1 ring-white/80 backdrop-blur-md">
      <div className="relative mx-auto w-full max-w-[240px]">
        <svg viewBox="0 0 120 64" aria-hidden="true" className="block w-full overflow-visible">
          <path d={track} fill="none" stroke="#0a1220" strokeOpacity="0.1" strokeWidth="8" strokeLinecap="round" />
          {DIAL_TICKS.map((tick) => {
            const point = dialPoint(tick, DIAL_R + 9);
            return <circle key={tick} cx={point.x} cy={point.y} r="1.3" fill="#0a1220" fillOpacity="0.3" />;
          })}
          <path d={value} fill="none" stroke="#0a1220" strokeWidth="8" strokeLinecap="round" pathLength={1} className="nova-draw" />
          <circle cx={tip.x} cy={tip.y} r="6" fill="#ffffff" stroke="#0a1220" strokeWidth="3" className="nova-fade" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className={cx('flex items-center justify-center gap-1.5 text-[10px] tracking-[0.12em] uppercase', frostMuted)}>
            <Icon name={isImmediate ? 'bolt' : 'clock'} size={12} />
            {translate('payment.averageTime')}
          </p>
          <p className={cx('mt-0.5 truncate text-xl font-bold', frostInk)}>{durationLabel(method.averageMinutes)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#0a1220]/10 pt-3">
        <span className={cx('text-[10px] tracking-[0.12em] uppercase', frostMuted)}>{translate('payment.upTo')}</span>
        <span className={cx('truncate text-sm font-semibold', frostInk)}>{durationLabel(method.maxMinutes)}</span>
      </div>
    </div>
  );
}

// The previewed method on the frosted stage: method coin, name, ETA dial, limits and the action.
// The inner block is re-keyed per method so switching replays the entrance and the dial draw.
function MethodStage({ method, onChoose }: { method: PaymentMethod; onChoose: () => void }) {
  const isFree = method.feePercent === 0;

  return (
    <FrostCard>
      <div key={method.id} className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-3">
          <span className="relative grid size-16 shrink-0 place-items-center">
            <span
              aria-hidden="true"
              className="absolute -inset-2.5 animate-orbit-spin rounded-full border border-dashed border-[#0a1220]/25 motion-reduce:animate-none"
              style={{ animationDuration: '10s' }}
            >
              <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-[#0a1220]" />
            </span>
            <span className="relative grid size-16 animate-pop-in place-items-center rounded-[20px] bg-[#0a1220] text-white shadow-[0_14px_28px_-14px_rgb(10_18_32/0.9)] motion-reduce:animate-none">
              <Icon name={kindIcon[method.kind]} size={28} />
            </span>
          </span>
          <span
            className={cx(
              'rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white',
              isFree ? 'text-[#146c43]' : frostInk,
            )}
          >
            {feeLabel(method)}
          </span>
        </div>

        <div className="min-w-0">
          <p className={cx('text-[10.5px] tracking-[0.16em] uppercase', frostMuted)}>{translate(`payment.kind.${method.kind}`)}</p>
          <p className={cx('mt-1 truncate text-3xl font-bold tracking-[-0.02em]', frostInk)}>{method.name}</p>
        </div>

        <EtaDial method={method} />

        <div className="flex items-center justify-between gap-3 border-t border-dashed border-[#0a1220]/15 pt-4">
          <span className={cx('text-[10px] tracking-[0.12em] uppercase', frostMuted)}>{translate('payment.limits')}</span>
          <span className={cx('truncate text-sm font-semibold tabular-nums', frostInk)}>{limitsText(method)}</span>
        </div>

        <button
          type="button"
          onClick={onChoose}
          className="group/cta relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a1220] text-sm font-semibold text-white shadow-[0_12px_26px_-14px_rgb(10_18_32/0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span className="relative">{translate('deposit.processFor')}</span>
          <Icon name="arrowRight" size={16} className="relative transition-transform group-hover/cta:translate-x-1 motion-reduce:transition-none" />
        </button>
      </div>
    </FrostCard>
  );
}

// Nova deposit method step: the previewed method on a sticky frost stage, the methods as a tile deck beside it.
export function DepositMethodPicker({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  const [previewId, setPreviewId] = useState(methods[0]?.id);
  const preview = methods.find((method) => method.id === previewId) ?? methods[0];
  if (!preview) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-8">
      <div className="order-2 min-w-0 lg:sticky lg:top-24 lg:order-1">
        <MethodStage method={preview} onChoose={() => onChoose(preview.id)} />
      </div>
      <ul aria-label={translate('payment.methodsLabel')} className="order-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:order-2">
        {methods.map((method, index) => (
          <MethodTile key={method.id} method={method} index={index} isActive={method.id === preview.id} onPreview={() => setPreviewId(method.id)} />
        ))}
      </ul>
    </div>
  );
}
