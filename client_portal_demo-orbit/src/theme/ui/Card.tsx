import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Skeleton } from './Feedback';
import { Icon, type IconName } from './Icon';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx('orbit-card', padded && 'p-5 sm:p-6', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  trend?: 'up' | 'down';
  loading?: boolean;
}

export function StatCard({ label, value, icon, hint, trend, loading = false }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        {icon && (
          <span className="relative grid size-10 shrink-0 place-items-center">
            <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
            <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name={icon} size={15} />
            </span>
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <span className="truncate text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</span>
        // Orbit: a comet streak under the value
      )}
      {hint && !loading && (
        <span
          className={cx(
            'inline-flex items-center gap-1 text-xs font-medium',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-danger',
            !trend && 'text-fg-subtle',
          )}
        >
          {trend && <Icon name={trend === 'up' ? 'trendUp' : 'trendDown'} size={14} />}
          {hint}
        </span>
      )}
    </Card>
  );
}
