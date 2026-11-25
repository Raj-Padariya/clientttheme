import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const fieldControlClass =
  'w-full rounded-xl border border-line bg-fg/[0.03] px-3.5 text-sm text-fg transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:border-line-strong focus:border-primary/60 focus:bg-primary/[0.04] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-primary)_18%,transparent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70';

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
    <section style={style} className={cx('orbit-card relative flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none', className)}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-fg/[0.015] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/35 bg-primary/12 text-primary">
              <Icon name={icon} size={16} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-5 p-5">{children}</div>
    </section>
  );
}

export function StatusStamp({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        tone === 'success' && 'border-success/35 bg-success/10 text-success',
        tone === 'warning' && 'border-warning/35 bg-warning/10 text-warning',
        tone === 'muted' && 'border-line bg-fg/[0.03] text-fg-subtle',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('size-1.5 rounded-full', tone === 'success' && 'bg-success', tone === 'warning' && 'bg-warning', tone === 'muted' && 'bg-fg-subtle')}
      />
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
        'relative h-7 w-12 shrink-0 rounded-lg border transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        checked ? 'border-primary/60 bg-primary/35 shadow-[0_0_16px_-4px_var(--brand-primary)]' : 'border-line-strong bg-fg/[0.04]',
      )}
    >
      <span
        className={cx(
          'absolute top-[3px] left-[3px] grid size-5 place-items-center rounded-md shadow transition-[translate,background-color] duration-300 ease-out motion-reduce:transition-none',
          checked ? 'translate-x-5 bg-white' : 'bg-fg-subtle',
        )}
      >
        <span aria-hidden="true" className={cx('h-2.5 w-px rounded-full', checked ? 'bg-primary' : 'bg-surface')} />
      </span>
    </button>
  );
}
