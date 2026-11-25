'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { LinkButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

const PROOF_ACCEPT = 'image/*,application/pdf';
const BYTES_PER_KB = 1024;

function fileSizeLabel(bytes: number): string {
  const kb = bytes / BYTES_PER_KB;
  return kb < BYTES_PER_KB ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / BYTES_PER_KB).toFixed(1)} MB`;
}

/** Drop zone for the payment screenshot: browse, drag & drop, or paste an image anywhere on the page. */
export function ProofDropzone({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewUrl = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    function takePastedImage(event: ClipboardEvent) {
      const pasted = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
      if (pasted) onChange(pasted);
    }
    window.addEventListener('paste', takePastedImage);
    return () => window.removeEventListener('paste', takePastedImage);
  }, [onChange]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
    event.target.value = '';
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={drop}
      className={cx(
        'group relative overflow-hidden rounded-[var(--r-xl)] border-2 border-dashed p-5 transition-[border-color,background-color,transform] duration-300 motion-reduce:transition-none',
        isDragging ? 'scale-[1.01] border-primary bg-primary-soft' : 'border-line-strong bg-surface/40 hover:border-primary/50',
      )}
    >
      <input id="deposit-proof" ref={inputRef} type="file" accept={PROOF_ACCEPT} onChange={pick} className="sr-only" />

      {file ? (
        <div key={file.name} className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
          <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-primary ring-1 ring-primary/30">
            {previewUrl ? (
              // A local blob preview of the user's own file; next/image cannot optimise object URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <Icon name="fileText" size={24} />
            )}
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl ring-2 ring-success/50 motion-reduce:hidden" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-semibold text-fg">{file.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-success">
              <Icon name="checkCircle" size={13} />
              {fileSizeLabel(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={translate('deposit.proofRemove')}
            title={translate('deposit.proofRemove')}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-danger/50 hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <span className="relative grid size-14 animate-orbit-bob place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/30 motion-reduce:animate-none">
            <span aria-hidden="true" className="orbit-ring absolute -inset-2 animate-orbit-spin motion-reduce:animate-none">
              <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
            </span>
            <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/20 motion-reduce:hidden" />
            <Icon name="deposit" size={24} className="relative rotate-180" />
          </span>
          <p className="text-sm font-medium text-fg">{isDragging ? translate('deposit.proofDrop') : translate('deposit.proofHint')}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative overflow-hidden rounded-full border border-primary/40 bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary/25 to-transparent motion-reduce:hidden" />
            <span className="relative">{translate('deposit.proofBrowse')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

type OrderStatus = 'Completed' | 'Pending' | 'Canceled';

// The method's own instructions as configured in the back office (demo content, shown as provided).
const instructionRows: { orderId: string; customer: string; product: string; amount: string; status: OrderStatus }[] = [
  { orderId: '#1024', customer: 'Jane Doe', product: 'Wireless Headphones', amount: '$99.00', status: 'Completed' },
  { orderId: '#1025', customer: 'John Smith', product: 'Ergonomic Keyboard', amount: '$145.50', status: 'Pending' },
  { orderId: '#1026', customer: 'Sarah Connor', product: 'Smart Fitness Watch', amount: '$199.99', status: 'Completed' },
  { orderId: '#1027', customer: 'Michael Brown', product: 'USB-C Hub Multiport', amount: '$49.00', status: 'Canceled' },
  { orderId: '#1028', customer: 'Emily Davis', product: 'Ultra-Wide Monitor', amount: '$389.00', status: 'Pending' },
];

const orderStatusClass: Record<OrderStatus, string> = {
  Completed: 'bg-success-soft text-success ring-success/30',
  Pending: 'bg-warning-soft text-warning ring-warning/30',
  Canceled: 'bg-danger-soft text-danger ring-danger/30',
};

const instructionHeaders: MessageKey[] = ['deposit.col.orderId', 'deposit.col.customer', 'deposit.col.product', 'deposit.col.amount', 'deposit.col.status'];

export function PaymentInstructions() {
  return (
    <section className="orbit-card relative animate-rise overflow-hidden p-5 [animation-delay:320ms] motion-reduce:animate-none">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon name="bank" size={15} />
        </span>
        {translate('deposit.instructions')}
      </h2>
      <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-surface-2/60">
            <tr>
              {instructionHeaders.map((key) => (
                <th key={key} scope="col" className="px-3 py-2.5 text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap text-fg-subtle uppercase">
                  {translate(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {instructionRows.map((row, index) => (
              <tr
                key={row.orderId}
                style={{ animationDelay: `${420 + index * 80}ms` }}
                className="animate-rise transition-colors hover:bg-primary-soft/40 motion-reduce:animate-none"
              >
                <td className="px-3 py-2.5 font-mono font-semibold text-primary">{row.orderId}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-fg">{row.customer}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-fg-muted">{row.product}</td>
                <td className="px-3 py-2.5 font-semibold text-fg tabular-nums">{row.amount}</td>
                <td className="px-3 py-2.5">
                  <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', orderStatusClass[row.status])}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function NeedHelpCard() {
  return (
    <section className="orbit-card relative animate-rise overflow-hidden bg-linear-to-br from-primary/15 via-surface-2/60 to-surface-2/60 p-5 [animation-delay:400ms] motion-reduce:animate-none">
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-12 -right-12 size-36 animate-orbit-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-12 size-40 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
      <div className="relative flex items-start gap-4">
        <span className="relative grid size-12 shrink-0 animate-float place-items-center rounded-2xl bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)] [animation-duration:5s] motion-reduce:animate-none">
          <Icon name="ticket" size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">{translate('deposit.helpTitle')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{translate('deposit.helpText')}</p>
          <LinkButton href="/tickets" size="sm" leftIcon="mail" className="group/help relative mt-3 overflow-hidden">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/help:translate-x-full motion-reduce:hidden" />
            <span className="relative">{translate('deposit.contactSupport')}</span>
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

const NOTICE_KEYS: MessageKey[] = ['deposit.notice1', 'deposit.notice2', 'deposit.notice3', 'deposit.notice4', 'deposit.notice5', 'deposit.notice6'];

/** The six notes as numbered cards that rise in one after another. */
export function DepositNotice() {
  return (
    <section
      aria-labelledby="deposit-notice-title"
      className="orbit-card relative animate-rise overflow-hidden p-5 [animation-delay:480ms] motion-reduce:animate-none sm:p-6"
    >
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -bottom-24 -left-20 -z-10 size-64 animate-orbit-spin-rev motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-52 animate-drift rounded-full bg-warning/10 blur-3xl motion-reduce:animate-none" />
      <h2 id="deposit-notice-title" className="relative flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-warning-soft text-warning">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />
          <Icon name="alert" size={16} className="relative" />
        </span>
        {translate('deposit.noticeTitle')}
      </h2>
      <ol className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {NOTICE_KEYS.map((key, index) => (
          <li
            key={key}
            style={{ animationDelay: `${560 + index * 90}ms` }}
            className="group relative flex animate-rise gap-3 rounded-2xl bg-surface/50 p-3.5 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-warning/40 motion-reduce:animate-none motion-reduce:transition-none"
          >
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-warning-soft font-mono text-[11px] font-bold text-warning ring-1 ring-warning/30 transition-transform duration-300 group-hover:scale-110">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="self-center text-sm leading-relaxed text-fg-muted">{translate(key)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
