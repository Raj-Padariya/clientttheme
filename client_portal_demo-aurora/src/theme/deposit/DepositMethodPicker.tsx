'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { boardCard } from '../dashboard/ZenithBoard';
import { durationLabel, FeeChip, feeLabel, kindIcon, limitsText } from '../payment/PaymentParts';
import { Icon } from '../ui/Icon';

const ROW_STAGGER_MS = 60;
const MIN_ETA_SHARE = 6;
const ETA_TICKS = [0, 25, 50, 75, 100];
const FLOW_DOTS = [0, 1, 2, 3, 4, 5];
const INK_ON_PRIMARY = 'text-[#13201a]';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const labelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

// Faster methods stream faster: instant methods run about 1s per pass, multi-day ones slow to about 4s.
function flowSeconds(averageMinutes: number): number {
  return Math.min(4.2, 1.1 + Math.log10(1 + Math.max(averageMinutes, 0)) * 1.1);
}

/** Average time against the "up to" ceiling as a horizontal track with a bead at the average. */
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
 * The money's path: the method coin (with a slowly turning dashed orbit) on the left, a conduit of beads streaming
 * into the wallet vault on the right, which ripples as they land. Stream speed follows the method's average time.
 */
function Conduit({ method }: { method: PaymentMethod }) {
  const seconds = flowSeconds(method.averageMinutes);

  return (
    <div aria-hidden="true" className="flex items-center gap-3 rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.07] sm:gap-4 sm:p-5">
      <span className="relative grid size-16 shrink-0 place-items-center sm:size-20">
        <span className="absolute inset-0 animate-spin rounded-full border border-dashed border-(--hero-buy)/55 [animation-duration:9s] motion-reduce:animate-none" />
        <span
          className={cx(
            'relative grid size-12 animate-pop-in place-items-center rounded-full bg-(--hero-buy) shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] motion-reduce:animate-none sm:size-14',
            INK_ON_PRIMARY,
          )}
        >
          <Icon name={kindIcon[method.kind]} size={24} />
        </span>
      </span>

      <span className="relative h-3 min-w-0 flex-1 rounded-full bg-fg/[0.06] ring-1 ring-fg/[0.08]" style={{ ['--flow-duration' as string]: `${seconds}s` }}>
        <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <line x1="0" y1="2" x2="100" y2="2" stroke="var(--hero-buy)" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" className="aurora-pipe-dash" />
        </svg>
        {FLOW_DOTS.map((dot) => (
          <span
            key={dot}
            className="aurora-flow-dot absolute top-1/2 size-2.5 rounded-full bg-(--hero-buy) shadow-[0_0_6px_var(--hero-buy)]"
            style={{ animationDelay: `${(-seconds * dot) / FLOW_DOTS.length}s` }}
          />
        ))}
      </span>

      <span className="relative grid size-16 shrink-0 place-items-center rounded-[22px] bg-fg/[0.06] text-fg ring-1 ring-fg/12 sm:size-20">
        <span className="absolute inset-0 animate-ping-soft rounded-[22px] ring-2 ring-(--hero-buy)/45 [animation-duration:2.8s] motion-reduce:hidden" />
        <Icon name="wallet" size={24} />
      </span>
    </div>
  );
}

/** The previewed method: name and terms, the flow conduit, the ETA track and the action. Re-keyed per method. */
function MethodStage({ method, onChoose }: { method: PaymentMethod; onChoose: () => void }) {
  const isFree = method.feePercent === 0;

  return (
    <section aria-label={method.name} className={cx(boardCard, 'relative isolate overflow-hidden p-5 sm:p-6 lg:sticky lg:top-24 lg:order-2')}>
      <span aria-hidden="true" className="aurora-drift pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full bg-(--hero-buy) opacity-[0.12] blur-[70px]" />
      <div key={method.id} className="aurora-panel-in flex flex-col gap-6">
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

        <Conduit method={method} />
        <EtaTrack method={method} />

        <button
          type="button"
          onClick={onChoose}
          className={cx(
            'group/cta relative isolate inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-fg px-8 text-sm font-bold text-surface transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
            focusRing,
          )}
        >
          <span aria-hidden="true" className="aurora-deck-sheen pointer-events-none absolute inset-0 -z-10" />
          {translate('deposit.processFor')}
          <span className={cx('grid size-7 place-items-center rounded-full bg-(--hero-buy) transition-transform group-hover/cta:translate-x-1 motion-reduce:transition-none', INK_ON_PRIMARY)}>
            <Icon name="arrowRight" size={15} />
          </span>
        </button>
      </div>
    </section>
  );
}

// One method as a slim row; hovering or clicking puts it on the stage, and the picked row grows a sage edge bar.
function MethodRow({ method, index, isActive, onPreview }: { method: PaymentMethod; index: number; isActive: boolean; onPreview: () => void }) {
  return (
    <li className="zenith-tile min-w-0" style={{ animationDelay: `${100 + index * ROW_STAGGER_MS}ms` }}>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onPreview}
        onMouseEnter={onPreview}
        className={cx(
          'group/row relative isolate flex w-full items-center gap-3 overflow-hidden rounded-[22px] py-3 pr-3 pl-4 text-left transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none sm:gap-4',
          focusRing,
          isActive ? 'bg-fg/[0.07] ring-1 ring-(--hero-buy)/55' : 'bg-surface ring-1 ring-fg/[0.08] hover:bg-fg/[0.04]',
        )}
      >
        <span
          aria-hidden="true"
          className={cx('absolute inset-y-3 left-0 w-1 rounded-r-full bg-(--hero-buy) transition-transform duration-500 motion-reduce:transition-none', isActive ? 'scale-y-100' : 'scale-y-0')}
        />
        {isActive && <span aria-hidden="true" className="aurora-deck-sheen pointer-events-none absolute inset-0 -z-10" />}

        <span className="w-5 shrink-0 font-mono text-[10px] tracking-[0.12em] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
        <span
          className={cx(
            'grid size-11 shrink-0 place-items-center rounded-2xl transition-[translate,scale,background-color,color] duration-300 motion-reduce:transition-none',
            isActive ? cx('translate-x-1 bg-(--hero-buy)', INK_ON_PRIMARY) : 'bg-fg/[0.07] text-fg ring-1 ring-fg/10 group-hover/row:scale-105',
          )}
        >
          <Icon name={kindIcon[method.kind]} size={19} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-fg">{method.name}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">
            {translate(`payment.kind.${method.kind}`)} · {durationLabel(method.averageMinutes)}
          </span>
          <span className="mt-1 block truncate text-[11px]">
            <span className="text-fg-subtle">{translate('payment.limits')}</span> <span className="font-semibold text-fg-muted tabular-nums">{limitsText(method)}</span>
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-2">
          <FeeChip method={method} />
          <span
            aria-hidden="true"
            className={cx(
              'grid size-8 place-items-center rounded-full transition-[background-color,color,rotate] duration-300 motion-reduce:transition-none',
              isActive ? '-rotate-45 bg-fg text-surface' : 'text-fg-subtle ring-1 ring-fg/12 group-hover/row:text-fg',
            )}
          >
            <Icon name="arrowRight" size={14} />
          </span>
        </span>
      </button>
    </li>
  );
}

// Aurora deposit method step: every method as a row list, the previewed one on a sticky flow stage beside it.
export function DepositMethodPicker({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  const [previewId, setPreviewId] = useState(methods[0]?.id);
  const preview = methods.find((method) => method.id === previewId) ?? methods[0];
  if (!preview) return null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <MethodStage method={preview} onChoose={() => onChoose(preview.id)} />
      <ul aria-label={translate('payment.methodsLabel')} className="flex flex-col gap-2.5 lg:order-1">
        {methods.map((method, index) => (
          <MethodRow key={method.id} method={method} index={index} isActive={method.id === preview.id} onPreview={() => setPreviewId(method.id)} />
        ))}
      </ul>
    </div>
  );
}
