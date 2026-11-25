import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';

export const fieldControlClass =
  'w-full rounded-lg bg-fg/[0.03] px-4 text-sm text-fg ring-1 ring-line transition-[box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:ring-line-strong focus:bg-app focus:ring-2 focus:ring-(--hero-buy) focus:outline-none disabled:cursor-not-allowed disabled:opacity-70';

/** Terminal window: title bar with a sage key and a pulsing LED, a ruled line with a sweeping sage segment, then content. */
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
    <section style={style} className={cx('orbit-card nova-edge-light relative isolate flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 bg-fg/[0.025] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && (
            <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ring-ripple rounded-lg border-2 border-(--hero-buy)/45 motion-reduce:hidden" />
              <span className="grid size-full place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25">
                <Icon name={icon} size={15} />
              </span>
            </span>
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-fg">
              {title}
              <span aria-hidden="true" className="st-led size-2 shrink-0 rounded-[2px] bg-(--aurora-cta-from) text-(--aurora-cta-from)" />
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <span aria-hidden="true" className="relative h-px overflow-hidden bg-line">
        <span className="mkt-sweep absolute inset-y-0 w-24 bg-(--hero-buy)" />
      </span>
      <div className="flex flex-col gap-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatusStamp({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md py-0.5 pr-2.5 pl-1 text-[10px] font-bold tracking-wide uppercase',
        tone === 'success' && 'bg-(--hero-buy) text-[#062520]',
        tone === 'warning' && 'bg-warning/15 text-warning ring-1 ring-warning/40',
        tone === 'muted' && 'bg-fg/[0.04] text-fg-subtle ring-1 ring-line',
      )}
    >
      <span aria-hidden="true" className="relative grid size-4 place-items-center">
        {tone === 'warning' && <span className="absolute inset-0 animate-ping-soft rounded-[4px] bg-warning/50 motion-reduce:animate-none" />}
        <span className={cx('relative size-2 rounded-[2px]', tone === 'success' && 'bg-[#062520]', tone === 'warning' && 'bg-warning', tone === 'muted' && 'bg-fg-subtle')} />
      </span>
      {children}
    </span>
  );
}

/** Order-switch: a square knob slides across a ruled track and lights sage when on. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-8 w-14 shrink-0 rounded-lg ring-1 transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none',
        checked ? 'bg-(--hero-buy)/20 ring-(--hero-buy)/50' : 'bg-fg/[0.06] ring-line-strong',
      )}
    >
      <span aria-hidden="true" className={cx('absolute top-1/2 left-2.5 flex -translate-y-1/2 gap-0.5 transition-opacity duration-300', checked ? 'opacity-60' : 'opacity-0')}>
        <span className="h-2.5 w-0.5 rounded-full bg-(--hero-buy)" />
        <span className="h-2.5 w-0.5 rounded-full bg-(--hero-buy)" />
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1 left-1 grid size-6 place-items-center rounded-md transition-[translate,background-color] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none',
          checked ? 'translate-x-6 bg-(--hero-buy)' : 'bg-fg/25',
        )}
      >
        <span className={cx('size-2 rounded-[2px] transition-colors', checked ? 'bg-[#062520]' : 'bg-app')} />
      </span>
    </button>
  );
}
