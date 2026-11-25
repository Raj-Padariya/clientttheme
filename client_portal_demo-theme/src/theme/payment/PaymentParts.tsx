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

const kindIcon: Record<PaymentMethod['kind'], IconName> = {
  card: 'card',
  bank: 'bank',
  crypto: 'crypto',
  ewallet: 'wallet',
};

export const paymentStepKeys: MessageKey[] = ['payment.step.method', 'payment.step.amount', 'payment.step.done'];

function PaymentSteps({ current, label }: { current: number; label: string }) {
  return (
    <ol aria-label={label} className="flex items-center gap-2 sm:gap-3">
      {paymentStepKeys.map((key, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={key} aria-current={isCurrent ? 'step' : undefined} className="flex items-center gap-2 sm:gap-3">
            {index > 0 && <span aria-hidden="true" className={cx('h-px w-6 sm:w-10', index <= current ? 'bg-primary/60' : 'bg-line-strong')} />}
            <span
              className={cx(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                isDone && 'bg-primary text-on-primary',
                isCurrent && 'border border-primary text-primary shadow-[0_0_14px_-4px_var(--brand-primary)]',
                !isDone && !isCurrent && 'border border-line-strong text-fg-subtle',
              )}
            >
              {isDone ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className={cx('hidden text-sm sm:inline', isDone || isCurrent ? 'text-fg' : 'text-fg-subtle')}>{translate(key)}</span>
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

export function PaymentStepHeader({ title, description, current, stepsLabel }: PaymentStepHeaderProps) {
  return (
    <section className="glass glass-strong relative isolate flex animate-rise flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[28px] p-5 motion-reduce:animate-none sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 -z-10 size-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="min-w-0">
        <h2 className="text-xl font-medium tracking-tight text-fg sm:text-2xl">{title}</h2>
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
        'flex shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-primary transition-colors group-hover/method:border-primary/40',
        size === 'lg' ? 'size-14' : 'size-12',
      )}
    >
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

export function MethodCard({ method, index, actionLabel, onChoose }: MethodCardProps) {
  const isImmediate = method.averageMinutes <= 0;
  const metrics = [
    { icon: isImmediate ? 'bolt' : 'clock', label: translate('payment.averageTime'), value: durationLabel(method.averageMinutes), highlight: isImmediate },
    { icon: 'clock', label: translate('payment.upTo'), value: durationLabel(method.maxMinutes), highlight: false },
  ] satisfies { icon: IconName; label: string; value: string; highlight: boolean }[];

  return (
    <li
      className="glow-border group/method flex animate-rise flex-col gap-5 rounded-[24px] bg-surface-2/40 p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-pop motion-reduce:animate-none motion-reduce:transition-none light:bg-surface"
      style={{ animationDelay: `${index * CARD_STAGGER_MS}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MethodBadge method={method} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-fg">{method.name}</p>
            <p className="text-xs text-fg-muted">{translate(`payment.kind.${method.kind}`)}</p>
          </div>
        </div>
        <FeeChip method={method} />
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 bg-surface/70 p-3">
            <dt className="flex items-center gap-1.5 text-[10.5px] tracking-[0.08em] text-fg-subtle uppercase">
              <Icon name={metric.icon} size={13} className={cx(metric.highlight && 'text-primary')} />
              {metric.label}
            </dt>
            <dd className={cx('mt-1 truncate text-sm font-semibold', metric.highlight ? 'text-primary' : 'text-fg')}>{metric.value}</dd>
          </div>
        ))}
        <div className="col-span-2 min-w-0 bg-surface/70 p-3">
          <dt className="text-[10.5px] tracking-[0.08em] text-fg-subtle uppercase">{translate('payment.limits')}</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-fg tabular-nums">{limitsText(method)}</dd>
        </div>
      </dl>

      <Button fullWidth onClick={onChoose} className="mt-auto">
        {actionLabel}
        <Icon name="arrowRight" size={16} className="transition-transform group-hover/method:translate-x-0.5" />
      </Button>
    </li>
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
