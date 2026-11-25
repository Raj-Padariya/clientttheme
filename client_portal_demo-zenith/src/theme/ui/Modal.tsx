'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { IconButton } from './Button';

const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizeClass;
  /** Plain surface for long, dense forms: no top wash, lighter shadow. */
  calm?: boolean;
  children?: ReactNode;
}

// Native <dialog> gives focus trapping, Esc handling and top-layer stacking for free.
export function Modal({ open, onClose, title, description, footer, size = 'md', calm = false, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Nova popup: a dark panel on a blurred backdrop with a neutral drop shadow (no coloured halo), the white
  // top-edge light, a faint teal wash behind the title, and a glossy close bead. Below sm it docks to the bottom
  // as a sheet. The panel re-runs its rise each time it opens, because the dialog goes from display:none back to visible.
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cx(
        'm-auto w-[calc(100%-2rem)] overflow-hidden rounded-[26px] border p-0 text-fg backdrop:bg-overlay backdrop:backdrop-blur-md',
        calm ? 'border-line bg-surface shadow-[0_30px_60px_-25px_rgb(0_0_0/0.55)]' : 'border-line bg-elevated shadow-[0_30px_70px_-24px_rgb(0_0_0/0.8)]',
        'max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none',
        sizeClass[size],
      )}
    >
      <div className="nova-edge-light relative isolate animate-rise motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(90%_100%_at_15%_0%,color-mix(in_oklab,var(--brand-primary)_7%,transparent),transparent_70%)]" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(180deg,black,transparent)]"
        />
        <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-fg/15 sm:hidden" />

        <div className="p-6 max-sm:pt-4">
          <div className="flex items-start gap-3.5">
            <span aria-hidden="true" className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/25">
              <span className="absolute inset-1.5 rounded-full border border-dashed border-primary/35" />
              <span className="absolute -inset-px animate-orbit-spin motion-reduce:animate-none">
                <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
              </span>
              <span className="size-2 rounded-full bg-primary shadow-[0_0_6px_var(--brand-primary)]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg leading-snug font-semibold tracking-tight text-fg">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{description}</p>}
            </div>
            <IconButton
              icon="close"
              label={translate('common.close')}
              onClick={onClose}
              className="nova-gloss -mt-1 -mr-1 shrink-0 rounded-full transition-[rotate,transform,box-shadow] duration-200 hover:rotate-90 motion-reduce:transition-none"
            />
          </div>
          {children && <div className="mt-5">{children}</div>}
        </div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-primary/10 bg-linear-to-b from-primary/[0.05] to-transparent px-6 py-4 max-sm:[&>*]:flex-1">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
