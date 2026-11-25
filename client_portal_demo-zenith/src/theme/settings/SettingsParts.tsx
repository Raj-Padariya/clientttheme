import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

const RED = 'var(--zenith-red)';

export const fieldControlClass =
  'w-full rounded-full bg-fg/[0.03] px-5 text-sm text-fg ring-1 ring-line transition-[box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:ring-line-strong focus:bg-app focus:ring-2 focus:ring-[var(--zenith-red)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70';

/** Open section: big title with a red-orbit bead, a hairline rule, then content — no card chrome. */
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
    <section style={style} className={cx('relative flex min-w-0 animate-rise flex-col rounded-[32px] bg-fg/[0.02] ring-1 ring-line motion-reduce:animate-none', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && (
            <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-[2px]" />
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
                <Icon name={icon} size={15} />
              </span>
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <span aria-hidden="true" className="mx-5 flex items-center gap-1.5 sm:mx-6">
        <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
        <span className="h-px flex-1 bg-line" />
      </span>
      <div className="flex flex-col gap-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatusStamp({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1 text-[10px] font-bold tracking-wide uppercase',
        tone === 'success' && 'bg-success text-white',
        tone === 'warning' && 'bg-warning/15 text-warning ring-1 ring-warning/40',
        tone === 'muted' && 'bg-fg/[0.04] text-fg-subtle ring-1 ring-line',
      )}
    >
      <span aria-hidden="true" className="relative grid size-4 place-items-center">
        {tone === 'warning' && <span className="absolute inset-0 animate-ping-soft rounded-[4px] bg-warning/50 motion-reduce:animate-none" />}
        <span className={cx('relative size-2 rounded-[2px]', tone === 'success' && 'bg-white', tone === 'warning' && 'bg-warning', tone === 'muted' && 'bg-fg-subtle')} />
      </span>
      {children}
    </span>
  );
}

/** Capsule switch: the knob slides over and turns red when on. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-8 w-14 shrink-0 rounded-full transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none',
        checked ? 'bg-fg' : 'bg-fg/[0.06] ring-1 ring-line-strong',
      )}
    >
      <span aria-hidden="true" className={cx('absolute top-1/2 left-2.5 flex -translate-y-1/2 gap-0.5 transition-opacity duration-300', checked ? 'opacity-40' : 'opacity-0')}>
        <span className="h-2.5 w-0.5 rounded-full bg-app" />
        <span className="h-2.5 w-0.5 rounded-full bg-app" />
      </span>
      <span
        aria-hidden="true"
        style={checked ? { background: RED } : undefined}
        className={cx(
          'absolute top-1 left-1 grid size-6 place-items-center rounded-full transition-[translate,background-color] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
          checked ? 'translate-x-6' : 'bg-fg/25',
        )}
      >
        <span className={cx('size-2 rounded-[2px] transition-colors', checked ? 'bg-white' : 'bg-app')} />
      </span>
    </button>
  );
}
