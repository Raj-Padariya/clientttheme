import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {/* Orbit mark: a planet with a satellite circling it. */}
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          <span className="orbit-ring absolute inset-0 animate-orbit-spin-fast motion-reduce:animate-none">
            <span className="absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
          </span>
          <span className="size-4 rounded-full bg-(image:--brand-gradient) shadow-[0_0_16px_-2px_var(--brand-primary)]" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
