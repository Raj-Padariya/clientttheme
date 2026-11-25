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
  children?: ReactNode;
}

// Native <dialog> gives focus trapping, Esc handling and top-layer stacking for free.
export function Modal({ open, onClose, title, description, footer, size = 'md', children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cx(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-elevated p-0 text-fg shadow-pop backdrop:bg-overlay',
        sizeClass[size],
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
          </div>
          <IconButton icon="close" label={translate('common.close')} onClick={onClose} className="-mr-2 -mt-2" />
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
}
