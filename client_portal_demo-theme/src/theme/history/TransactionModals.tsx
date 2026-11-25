'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import type { Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { IconButton } from '../ui/Button';
import { StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { FlowRoute, ledgerCaptionClass, statusAccent, type Accent } from './Ledger';

// Demo data only stores the uploaded file's name, so every proof previews the same sample receipt.
const DEMO_PROOF_SRC = '/demo/proof-receipt.svg';
const COPIED_RESET_MS = 1500;

const proofCorners = [
  'top-2.5 left-2.5 rounded-tl-md border-t-2 border-l-2',
  'top-2.5 right-2.5 rounded-tr-md border-t-2 border-r-2',
  'bottom-2.5 left-2.5 rounded-bl-md border-b-2 border-l-2',
  'bottom-2.5 right-2.5 rounded-br-md border-r-2 border-b-2',
];

const typeIcon: Record<Transaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  internal: 'transfer',
};

const medallionAccent: Record<Accent, string> = {
  success: 'bg-success-soft text-success ring-success/35',
  danger: 'bg-danger-soft text-danger ring-danger/35',
  warning: 'bg-warning-soft text-warning ring-warning/35',
};

const linkButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-fg-muted transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function Tile({ label, icon, wide, children }: { label: string; icon: IconName; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cx('rounded-xl bg-surface-2/50 px-3.5 py-3 ring-1 ring-line', wide && 'col-span-2')}>
      <dt className={cx(ledgerCaptionClass, 'flex items-center gap-1.5')}>
        <Icon name={icon} size={11} className="text-primary" />
        {label}
      </dt>
      <dd className="mt-1 min-w-0 truncate text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

function CopyReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(reference).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={translate('history.detail.copy')}
      className="group/copy inline-flex max-w-full items-center gap-1.5 font-mono text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="truncate">{reference}</span>
      <Icon name={copied ? 'check' : 'copy'} size={12} className="shrink-0 opacity-70 transition-opacity group-hover/copy:opacity-100" />
      <span role="status" className="sr-only">
        {copied ? translate('history.detail.copied') : ''}
      </span>
    </button>
  );
}

/** Receipt view: amount hero, the account route, a tile grid, and a torn-off "Payment Information" stub. */
export function PaymentDetailsModal({ tx, amount, onClose }: { tx: Transaction; amount: string; onClose: () => void }) {
  const accent = statusAccent(tx.status);
  const isRejected = tx.status === 'rejected';
  const routeText = `${tx.source} → ${tx.destination}`;

  return (
    <Modal open onClose={onClose} title={translate('history.detailsTitle')} description={tx.reference}>
      <div className="flex flex-col gap-4">
        <section className="glow-border relative animate-rise overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-surface-2 to-surface-2 p-5 motion-reduce:animate-none">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-10 size-40 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
          <div className="relative flex items-center gap-4">
            <span className={cx('grid size-14 shrink-0 place-items-center rounded-2xl ring-1', medallionAccent[accent])}>
              <Icon name={typeIcon[tx.type]} size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={ledgerCaptionClass}>{translate('history.col.amount')}</p>
              <p
                className={cx(
                  'truncate text-3xl font-black tracking-tight tabular-nums',
                  isRejected ? 'text-fg-muted line-through decoration-danger/70 decoration-2' : 'text-fg',
                )}
              >
                {amount}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className={ledgerCaptionClass}>{translate('history.col.status')}</p>
              <StatusBadge status={tx.status} />
            </div>
          </div>
        </section>

        <section style={{ animationDelay: '80ms' }} className="animate-rise rounded-2xl border border-line bg-surface-2/40 p-4 motion-reduce:animate-none">
          <p className={cx(ledgerCaptionClass, 'mb-2.5 flex items-center gap-1.5')}>
            <Icon name="accounts" size={11} className="text-primary" />
            {translate('history.detail.account')}
          </p>
          <FlowRoute tx={tx} />
        </section>

        <dl style={{ animationDelay: '160ms' }} className="grid animate-rise grid-cols-2 gap-2 motion-reduce:animate-none">
          <Tile label={translate('history.col.type')} icon={typeIcon[tx.type]}>
            {translate(`history.type.${tx.type}`)}
          </Tile>
          <Tile label={translate('history.col.reference')} icon="fileText">
            <CopyReference reference={tx.reference} />
          </Tile>
          <Tile label={translate('history.col.method')} icon="transfer">
            {tx.method}
          </Tile>
          <Tile label={translate('history.col.transactionId')} icon="info">
            {tx.transactionId ?? <span className="text-fg-subtle">—</span>}
          </Tile>
          <Tile label={translate('history.col.date')} icon="calendar">
            {formatDate(tx.createdAt)}
          </Tile>
          <Tile label={translate('history.col.updated')} icon="refresh">
            {formatDate(tx.updatedAt)}
          </Tile>
        </dl>

        {/* Ticket stub: the notches and dashed edge make it read as the part you tear off and keep. */}
        <section style={{ animationDelay: '240ms' }} className="relative animate-rise rounded-2xl bg-primary-soft/40 p-4 pt-5 ring-1 ring-primary/30 motion-reduce:animate-none">
          <span aria-hidden="true" className="absolute inset-x-4 top-0 border-t-2 border-dashed border-primary/40" />
          <span aria-hidden="true" className="absolute top-0 -left-2 size-4 -translate-y-1/2 rounded-full bg-surface ring-1 ring-primary/30" />
          <span aria-hidden="true" className="absolute top-0 -right-2 size-4 -translate-y-1/2 rounded-full bg-surface ring-1 ring-primary/30" />
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="info" size={14} className="text-primary" />
            {translate('history.detail.paymentInfo')}
          </h3>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className={ledgerCaptionClass}>{translate('history.detail.details')}</span>
            <span className="font-mono text-sm font-semibold text-fg">{routeText}</span>
          </div>
        </section>
      </div>
    </Modal>
  );
}

/** Proof viewer: framed dark stage with click-to-zoom, and a file strip with open / download actions. */
export function TransactionProofModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const zoomLabel = translate(zoomed ? 'history.proof.zoomOut' : 'history.proof.zoomIn');

  return (
    <Modal open onClose={onClose} size="lg" title={translate('history.proofTitle')} description={tx.reference}>
      <div className="flex flex-col gap-3">
        <div className="relative animate-rise rounded-2xl bg-linear-to-br from-primary/30 via-line to-primary/10 p-px motion-reduce:animate-none">
          {/* Viewfinder corners sit on the frame, outside the scroll area, so they stay put while a zoomed image pans. */}
          {proofCorners.map((corner) => (
            <span key={corner} aria-hidden="true" className={cx('pointer-events-none absolute z-10 size-4 border-primary/70', corner)} />
          ))}
          <div className="relative flex max-h-[60vh] min-h-64 overflow-auto rounded-[calc(1rem-1px)] bg-black/60 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.06)_1px,transparent_0)] bg-[length:16px_16px] p-6">
            <button
              type="button"
              onClick={() => setZoomed((current) => !current)}
              aria-label={zoomLabel}
              className={cx('m-auto shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring', zoomed ? 'w-[150%] cursor-zoom-out' : 'cursor-zoom-in')}
            >
              <Image
                src={DEMO_PROOF_SRC}
                alt={tx.proofName ?? translate('history.proofTitle')}
                width={600}
                height={800}
                unoptimized
                className={cx(
                  'rounded-lg shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] transition-[width,max-height] duration-300 motion-reduce:transition-none',
                  zoomed ? 'h-auto w-full max-w-none' : 'h-auto max-h-[52vh] w-auto max-w-full',
                )}
              />
            </button>
          </div>
        </div>

        <div style={{ animationDelay: '100ms' }} className="flex animate-rise flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2/50 px-3 py-2.5 ring-1 ring-line motion-reduce:animate-none">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/25">
              <Icon name="fileText" size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-semibold text-fg">{tx.proofName}</p>
              <p className="text-[11px] text-fg-muted">{translate('history.proofUploaded', { date: formatDate(tx.createdAt) })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton icon={zoomed ? 'minus' : 'plus'} label={zoomLabel} onClick={() => setZoomed((current) => !current)} />
            <a href={DEMO_PROOF_SRC} target="_blank" rel="noopener noreferrer" className={linkButtonClass}>
              <Icon name="eye" size={13} />
              {translate('history.proof.open')}
            </a>
            <a href={DEMO_PROOF_SRC} download={tx.proofName} className={linkButtonClass}>
              <Icon name="deposit" size={13} />
              {translate('history.proof.download')}
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
