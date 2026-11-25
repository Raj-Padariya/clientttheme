import type { ReactNode } from 'react';
import { translate } from '@/core/i18n';
import type { RequestStatus } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from './Icon';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type AlertTone = Exclude<Tone, 'neutral' | 'primary'>;

const badgeTone: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted ring-line',
  primary: 'bg-primary-soft text-primary ring-primary/20',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeTone[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" aria-hidden="true" />}
      {children}
    </span>
  );
}

const statusTone: Record<RequestStatus, Tone> = {
  pending: 'warning',
  processing: 'info',
  approved: 'success',
  rejected: 'danger',
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  return (
    <Badge tone={statusTone[status]} dot className={className}>
      {translate(`status.${status}`)}
    </Badge>
  );
}

export function Spinner({ size = 16, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cx('animate-spin', className)}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const alertStyle: Record<AlertTone, { icon: IconName; className: string }> = {
  info: { icon: 'info', className: 'bg-info-soft text-info ring-info/20' },
  success: { icon: 'checkCircle', className: 'bg-success-soft text-success ring-success/20' },
  warning: { icon: 'alert', className: 'bg-warning-soft text-warning ring-warning/20' },
  danger: { icon: 'xCircle', className: 'bg-danger-soft text-danger ring-danger/20' },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Alert({ tone = 'info', title, className, children }: AlertProps) {
  const style = alertStyle[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-md px-4 py-3 text-sm ring-1 ring-inset', style.className, className)}
    >
      <Icon name={style.icon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(Boolean(title) && 'mt-0.5', 'text-fg')}>{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-hover', className)} />;
}

interface EmptyStateProps {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center px-4 py-12 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-4 text-base font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
