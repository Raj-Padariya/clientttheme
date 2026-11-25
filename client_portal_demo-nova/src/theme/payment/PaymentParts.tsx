'use client';

import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';

import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';

export function feeLabel(method: PaymentMethod): string {
  return method.feePercent === 0 ? translate('payment.noFee') : `${method.feePercent}%`;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

/** Human duration for payment timings: "Immediate", "10 min", "1 hour", "24 hours", "3 days". */
export function durationLabel(minutes: number): string {
  if (minutes <= 0) return translate('payment.duration.immediate');
  if (minutes < MINUTES_PER_HOUR) return translate('payment.duration.minutes', { count: minutes });
  if (minutes < MINUTES_PER_DAY * 2) {
    const hours = Math.round(minutes / MINUTES_PER_HOUR);
    return hours === 1 ? translate('payment.duration.hour') : translate('payment.duration.hours', { count: hours });
  }
  return translate('payment.duration.days', { count: Math.round(minutes / MINUTES_PER_DAY) });
}

export function limitsText(method: PaymentMethod): string {
  return `${formatMoney(method.minAmount, method.currency)} – ${formatMoney(method.maxAmount, method.currency)}`;
}

const CARD_STAGGER_MS = 60;

export const kindIcon: Record<PaymentMethod['kind'], IconName> = {
  card: 'card',
  bank: 'bank',
  crypto: 'crypto',
  ewallet: 'wallet',
};

export const paymentStepKeys: MessageKey[] = ['payment.step.method', 'payment.step.amount', 'payment.step.done'];

// Steps as a segmented orbit track: one bar per step that fills as the flow advances, label underneath.
function PaymentSteps({ current, label }: { current: number; label: string }) {
  return (
    <ol aria-label={label} className="grid w-full grid-cols-3 gap-2 sm:gap-3">
      {paymentStepKeys.map((key, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={key} aria-current={isCurrent ? 'step' : undefined} className="flex min-w-0 flex-col gap-2">
            <span aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className={cx(
                  'absolute inset-y-0 left-0 rounded-full bg-[image:var(--brand-gradient)] transition-[width] duration-700 motion-reduce:transition-none',
                  isDone ? 'w-full' : isCurrent ? 'w-1/2 shadow-[0_0_12px_var(--brand-primary)]' : 'w-0',
                )}
              />
            </span>
            <span className={cx('flex min-w-0 items-center gap-1.5 text-xs', isDone || isCurrent ? 'text-fg' : 'text-fg-subtle')}>
              <span className={cx('font-mono text-[10px] font-bold', isDone || isCurrent ? 'text-primary' : 'text-fg-subtle')}>
                {isDone ? <Icon name="check" size={12} /> : String(index + 1).padStart(2, '0')}
              </span>
              <span className="truncate">{translate(key)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface PaymentStepHeaderProps {
  title: string;
  description: string;
  /** Index into `paymentStepKeys`; pass its length once the flow is finished. */
  current: number;
  stepsLabel: string;
}

// No card: a flat header band — title on the left, the step track filling the right half.
export function PaymentStepHeader({ title, description, current, stepsLabel }: PaymentStepHeaderProps) {
  return (
    <section className="grid animate-rise items-end gap-4 border-b border-line pb-5 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>
      <PaymentSteps current={current} label={stepsLabel} />
    </section>
  );
}

export function MethodBadge({ method, size = 'md' }: { method: PaymentMethod; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cx(
        'relative flex shrink-0 items-center justify-center rounded-full border border-line bg-surface text-primary transition-colors group-hover/method:border-primary/40',
        size === 'lg' ? 'size-14' : 'size-12',
      )}
    >
      <span aria-hidden="true" className="orbit-ring absolute -inset-1.5 animate-orbit-spin motion-reduce:animate-none">
        <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
      </span>
      <Icon name={kindIcon[method.kind]} size={size === 'lg' ? 24 : 22} />
    </span>
  );
}

export function FeeChip({ method }: { method: PaymentMethod }) {
  const isFree = method.feePercent === 0;
  return (
    <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', isFree ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-muted')}>
      {isFree ? feeLabel(method) : translate('payment.feeChip', { fee: feeLabel(method) })}
    </span>
  );
}

interface MethodCardProps {
  method: PaymentMethod;
  index: number;
  actionLabel: string;
  onChoose: () => void;
}

// Orbit lists payment methods as wide rows (identity · timings · limits · action) rather than a card grid.
export function MethodCard({ method, index, actionLabel, onChoose }: MethodCardProps) {
  const isImmediate = method.averageMinutes <= 0;
  const metrics = [
    { icon: isImmediate ? 'bolt' : 'clock', label: translate('payment.averageTime'), value: durationLabel(method.averageMinutes), highlight: isImmediate },
    { icon: 'clock', label: translate('payment.upTo'), value: durationLabel(method.maxMinutes), highlight: false },
  ] satisfies { icon: IconName; label: string; value: string; highlight: boolean }[];

  return (
    <li
      className="group/method relative isolate grid animate-rise items-center gap-x-6 gap-y-4 overflow-hidden rounded-[22px] border border-line bg-surface/60 p-4 backdrop-blur transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:animate-none motion-reduce:transition-none sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto]"
      style={{ animationDelay: `${index * CARD_STAGGER_MS}ms` }}
    >
      <span aria-hidden="true" className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-line-strong transition-colors group-hover/method:bg-primary" />
      <span aria-hidden="true" className="orbit-spot pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/method:opacity-100 motion-reduce:transition-none" />
      <div className="flex min-w-0 items-center gap-3 pl-2">
        <MethodBadge method={method} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-fg">{method.name}</p>
          <p className="text-xs text-fg-muted">{translate(`payment.kind.${method.kind}`)}</p>
        </div>
        <span className="ml-auto lg:hidden">
          <FeeChip method={method} />
        </span>
      </div>

      <dl className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[10.5px] tracking-[0.08em] text-fg-subtle uppercase">
              <Icon name={metric.icon} size={13} className={cx(metric.highlight && 'text-primary')} />
              {metric.label}
            </dt>
            <dd className={cx('mt-1 truncate text-sm font-semibold', metric.highlight ? 'text-primary' : 'text-fg')}>{metric.value}</dd>
          </div>
        ))}
        <div className="col-span-2 min-w-0 sm:col-span-1 sm:border-l sm:border-line sm:pl-4">
          <dt className="text-[10.5px] tracking-[0.08em] text-fg-subtle uppercase">{translate('payment.limits')}</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-fg tabular-nums">{limitsText(method)}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-3 lg:justify-end">
        <span className="max-lg:hidden">
          <FeeChip method={method} />
        </span>
        <Button onClick={onChoose} className="max-lg:w-full">
          {actionLabel}
          <Icon name="arrowRight" size={16} className="transition-transform group-hover/method:translate-x-0.5" />
        </Button>
      </div>
    </li>
  );
}

// Keeps the average-time marker visible when the average is tiny (or zero) next to the "up to" time.
const MIN_ETA_SHARE = 6;

// Average time vs. the "up to" ceiling on one track: the fill and marker sit at average / up-to.
export function EtaTrack({ method }: { method: PaymentMethod }) {
  const isImmediate = method.averageMinutes <= 0;
  const share = method.maxMinutes > 0 ? Math.max(Math.min((method.averageMinutes / method.maxMinutes) * 100, 100), MIN_ETA_SHARE) : 100;

  return (
    <div className="rounded-2xl bg-surface/60 p-4 ring-1 ring-line">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] text-fg-subtle uppercase">
            <Icon name={isImmediate ? 'bolt' : 'clock'} size={12} className={cx(isImmediate && 'text-primary')} />
            {translate('payment.averageTime')}
          </p>
          <p className={cx('mt-1 truncate text-lg font-semibold', isImmediate ? 'text-primary' : 'text-fg')}>{durationLabel(method.averageMinutes)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('payment.upTo')}</p>
          <p className="mt-1 truncate text-lg font-semibold text-fg">{durationLabel(method.maxMinutes)}</p>
        </div>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-1.5 rounded-full bg-line">
        <span
          className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-linear-to-r from-primary/30 to-primary motion-reduce:animate-none"
          style={{ width: `${share}%` }}
        />
        <span className="absolute top-1/2 grid size-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: `${share}%` }}>
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/50 motion-reduce:animate-none" />
          <span className="relative size-2.5 rounded-full bg-primary ring-2 ring-surface" />
        </span>
        <span className="absolute top-1/2 right-0 h-3 w-px -translate-y-1/2 bg-fg-subtle" />
      </div>
    </div>
  );
}

export function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cx('text-sm', strong ? 'font-medium text-fg' : 'text-fg-muted')}>{label}</dt>
      <dd className={cx('tabular-nums text-fg', strong ? 'text-lg font-semibold' : 'text-sm')}>{value}</dd>
    </div>
  );
}
