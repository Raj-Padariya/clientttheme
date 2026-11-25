import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const fieldControlClass =
  'w-full rounded-[16px] bg-fg/[0.03] px-4 text-sm text-fg ring-1 ring-line transition-[box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:ring-line-strong focus:bg-fg/[0.05] focus:ring-fg/45 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70';

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
    <section style={style} className={cx('orbit-card nova-edge-light relative flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && (
            <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
              <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
                <Icon name={icon} size={15} />
              </span>
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <span aria-hidden="true" className="mx-5 border-t border-dotted border-line-strong" />
      <div className="flex flex-col gap-5 p-5">{children}</div>
    </section>
  );
}

export function StatusStamp({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1 text-[10px] font-bold tracking-wide uppercase',
        tone === 'success' && 'bg-success/12 text-success',
        tone === 'warning' && 'bg-warning/12 text-warning',
        tone === 'muted' && 'text-fg-subtle ring-1 ring-line',
      )}
    >
      <span aria-hidden="true" className="relative grid size-4 place-items-center">
        {tone === 'warning' && <span className="absolute inset-0 animate-ping-soft rounded-full bg-warning/40 motion-reduce:animate-none" />}
        <span className={cx('relative size-1.5 rounded-full', tone === 'success' && 'bg-success', tone === 'warning' && 'bg-warning', tone === 'muted' && 'bg-fg-subtle')} />
      </span>
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
        'relative h-7 w-12 shrink-0 rounded-full transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        checked ? 'bg-fg' : 'bg-fg/[0.05] ring-1 ring-line-strong',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1 left-1 grid size-5 place-items-center rounded-full transition-[translate,background-color] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
          checked ? 'translate-x-5 bg-app' : 'nova-gloss',
        )}
      >
        <span className={cx('size-1.5 rounded-full transition-colors', checked ? 'bg-fg' : 'bg-fg/30')} />
      </span>
    </button>
  );
}
