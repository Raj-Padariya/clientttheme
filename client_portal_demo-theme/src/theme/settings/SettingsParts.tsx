import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const fieldControlClass =
  'w-full rounded-lg bg-surface-2 px-3.5 text-sm text-fg ring-1 ring-line transition-[box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:ring-line-strong focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70';

export function Panel({
  icon,
  title,
  subtitle,
  action,
  children,
  className,
  style,
}: {
  icon?: IconName;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section style={style} className={cx('flex min-w-0 animate-rise flex-col gap-5 rounded-xl bg-surface p-5 shadow-card motion-reduce:animate-none', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/30">
              <Icon name={icon} size={18} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatusStamp({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
        tone === 'success' && 'bg-success/10 text-success ring-success/30',
        tone === 'warning' && 'bg-warning/10 text-warning ring-warning/30',
        tone === 'muted' && 'bg-surface-2 text-fg-subtle ring-line',
      )}
    >
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-7 w-12 shrink-0 rounded-full ring-1 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        checked ? 'bg-primary ring-primary shadow-[0_0_16px_-4px_var(--brand-primary)]' : 'bg-surface-2 ring-line-strong',
      )}
    >
      <span
        className={cx(
          'absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-300 ease-out motion-reduce:transition-none',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}
