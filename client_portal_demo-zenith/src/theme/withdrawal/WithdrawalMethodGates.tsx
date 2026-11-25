'use client';

import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { boardCard } from '../dashboard/ZenithBoard';
import { durationLabel, FeeChip, kindIcon, limitsText } from '../payment/PaymentParts';
import { Icon } from '../ui/Icon';

const LANE_STAGGER_MS = 90;
const MIN_ETA_SHARE = 6;

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const labelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

/** Wallet → method as a short dashed route with a bead running toward the method coin. */
function PayoutRoute({ method }: { method: PaymentMethod }) {
  return (
    <span aria-hidden="true" className="flex min-w-0 items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg-muted ring-1 ring-fg/10">
        <Icon name="wallet" size={18} />
      </span>
      <span className="relative mx-2 h-4 w-14 shrink-0 sm:w-20">
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-fg/25" />
        <span className="zenith-route absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hero-buy)" />
      </span>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-(--hero-buy) text-[#160904] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-300 group-hover/lane:scale-105 motion-reduce:transition-none">
        <Icon name={kindIcon[method.kind]} size={20} />
      </span>
    </span>
  );
}

/** Average time as an ember capsule inside the "up to" track. */
function EtaCapsule({ method }: { method: PaymentMethod }) {
  const isImmediate = method.averageMinutes <= 0;
  const share = method.maxMinutes > 0 ? Math.max(Math.min((method.averageMinutes / method.maxMinutes) * 100, 100), MIN_ETA_SHARE) : 100;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className={cx(labelClass, 'flex items-center gap-1.5')}>
          <Icon name={isImmediate ? 'bolt' : 'clock'} size={11} />
          {translate('payment.averageTime')}
        </span>
        <span className="truncate text-[11px] text-fg-subtle">
          {translate('payment.upTo')} <span className="font-semibold text-fg-muted">{durationLabel(method.maxMinutes)}</span>
        </span>
      </div>
      <p className="mt-1 truncate text-lg font-semibold tracking-[-0.01em] text-fg">{durationLabel(method.averageMinutes)}</p>
      <span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded-full bg-fg/[0.07]">
        <span className="zenith-capsule block h-full rounded-full bg-(--hero-buy) [transform-origin:left]" style={{ width: `${share}%` }} />
      </span>
    </div>
  );
}

// One payout method as a full-width lane: route + identity, ETA capsule, limits, then the action at the far end.
function PayoutLane({ method, index, total, onChoose }: { method: PaymentMethod; index: number; total: number; onChoose: () => void }) {
  return (
    <li className="zenith-tile" style={{ animationDelay: `${120 + index * LANE_STAGGER_MS}ms` }}>
      <article
        className={cx(
          boardCard,
          'group/lane relative isolate grid items-center gap-5 overflow-hidden p-4 transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-fg/20 motion-reduce:transition-none sm:p-5',
          'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:gap-7',
        )}
      >
        <span aria-hidden="true" className="absolute inset-y-5 left-0 w-[3px] origin-center scale-y-0 rounded-full bg-(--hero-buy) transition-transform duration-300 group-hover/lane:scale-y-100 motion-reduce:transition-none" />

        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <PayoutRoute method={method} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-xl font-semibold tracking-[-0.02em] text-fg">{method.name}</p>
              <span className="shrink-0 font-mono text-[10px] tracking-[0.15em] text-fg-subtle">
                {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-fg-muted">{translate(`payment.kind.${method.kind}`)}</p>
          </div>
        </div>

        <EtaCapsule method={method} />

        <div className="flex min-w-0 items-end justify-between gap-3 lg:flex-col lg:items-start">
          <div className="min-w-0">
            <span className={labelClass}>{translate('payment.limits')}</span>
            <span className="mt-1 block truncate text-sm font-semibold text-fg tabular-nums">{limitsText(method)}</span>
          </div>
          <FeeChip method={method} />
        </div>

        <button
          type="button"
          onClick={onChoose}
          className={cx(
            'group/cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fg pr-2 pl-6 text-sm font-bold text-surface transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none lg:w-auto',
            focusRing,
          )}
        >
          {translate('withdrawal.proceedTo')}
          <span className="grid size-8 place-items-center rounded-full bg-(--hero-buy) text-[#160904] transition-transform group-hover/cta:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={15} />
          </span>
        </button>
      </article>
    </li>
  );
}

// Zenith withdrawal method step: every payout method as a stacked lane so routes, timings and limits read down a column.
export function WithdrawalMethodGates({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  return (
    <ul aria-label={translate('payment.methodsLabel')} className="flex flex-col gap-3">
      {methods.map((method, index) => (
        <PayoutLane key={method.id} method={method} index={index} total={methods.length} onChoose={() => onChoose(method.id)} />
      ))}
    </ul>
  );
}
