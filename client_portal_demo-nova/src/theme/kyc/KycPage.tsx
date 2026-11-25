'use client';

import { useState, type ChangeEvent } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import { useKyc } from '@/core/pages/useKyc';
import type { KycDocument, KycDocumentKind } from '@/core/types';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Badge, Skeleton, Spinner, StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const METER_DOTS_PER_DOCUMENT = 12;

const statusIcon: Record<KycDocument['status'], IconName> = {
  missing: 'inbox',
  pending: 'info',
  processing: 'info',
  approved: 'checkCircle',
  rejected: 'xCircle',
};

// Static class sets per status so Tailwind can see every class name.
const statusTone: Record<KycDocument['status'], { bead: string; text: string; dot: string; frostBead: string }> = {
  approved: { bead: 'bg-success text-white', text: 'text-success', dot: 'bg-success', frostBead: 'bg-[#0f8a4f] text-white' },
  rejected: { bead: 'bg-danger text-white', text: 'text-danger', dot: 'bg-danger', frostBead: 'bg-[#c0352b] text-white' },
  pending: { bead: 'bg-warning text-white', text: 'text-warning', dot: 'bg-warning', frostBead: 'bg-[#b7791f] text-white' },
  processing: { bead: 'bg-warning text-white', text: 'text-warning', dot: 'bg-warning', frostBead: 'bg-[#b7791f] text-white' },
  missing: { bead: 'nova-gloss text-fg-muted', text: 'text-fg-subtle', dot: 'bg-fg/15', frostBead: 'bg-white text-[#0a1220] ring-1 ring-[#0a1220]/20' },
};

const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

function DocumentStatus({ status }: { status: KycDocument['status'] }) {
  return status === 'missing' ? <Badge dot>{translate('kyc.status.missing')}</Badge> : <StatusBadge status={status} />;
}

function PageTitle() {
  return (
    <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
      <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
        <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
          <Icon name="kyc" size={15} />
        </span>
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.kyc')}</h1>
        <p className="mt-0.5 text-sm text-fg-muted">{translate('kyc.subtitle')}</p>
      </div>
    </header>
  );
}

interface DocumentCardProps {
  document: KycDocument;
  index: number;
  uploading: boolean;
  disabled: boolean;
  onUpload: (kind: KycDocumentKind, file: File) => void;
}

function DocumentCard({ document, index, uploading, disabled, onUpload }: DocumentCardProps) {
  const [fileError, setFileError] = useState(false);
  const canUpload = document.status === 'missing' || document.status === 'rejected';
  const inputId = `kyc-${document.kind}`;
  const isApproved = document.status === 'approved';
  const tone = statusTone[document.status];

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(true);
      return;
    }
    setFileError(false);
    onUpload(document.kind, file);
  }

  return (
    <li style={staggerStyle(index + 2, 120)} className="flex min-w-0 animate-rise motion-reduce:animate-none">
      <article
        className={cx(
          'orbit-card nova-edge-light relative isolate flex w-full min-w-0 flex-col gap-4 overflow-hidden p-5',
          document.status === 'rejected' && 'ring-1 ring-danger/35',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-4xl leading-none font-black text-fg/15 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <DocumentStatus status={document.status} />
        </div>

        <div className="flex items-start gap-3">
          <span className="relative grid size-12 shrink-0 place-items-center">
            {document.status === 'pending' && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />}
            <span className={cx('relative grid size-12 place-items-center rounded-full', tone.bead)}>
              <Icon name={statusIcon[document.status]} size={19} />
            </span>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-fg">{translate(`kyc.doc.${document.kind}.title`)}</h2>
            <p className="mt-0.5 text-sm text-fg-muted">{translate(`kyc.doc.${document.kind}.text`)}</p>
          </div>
        </div>

        {document.fileName && (
          <p className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-4 pl-1 text-sm ring-1 ring-line">
            <span className="nova-gloss grid size-8 shrink-0 place-items-center rounded-full text-fg">
              <Icon name="fileText" size={13} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-fg">{document.fileName}</span>
              {document.uploadedAt && (
                <span className="block truncate text-[11px] text-fg-subtle">
                  {translate('kyc.uploaded')} {formatDate(document.uploadedAt)}
                </span>
              )}
            </span>
          </p>
        )}

        {(document.status === 'rejected' || document.status === 'pending') && (
          <p role="note" className={cx('flex items-start gap-2.5 rounded-[18px] px-3 py-2.5 text-xs font-medium', document.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info')}>
            <Icon name={document.status === 'rejected' ? 'xCircle' : 'info'} size={14} className="mt-px shrink-0" />
            {translate(document.status === 'rejected' ? 'kyc.rejectedNote' : 'kyc.pendingNote')}
          </p>
        )}

        <div className="mt-auto border-t border-dotted border-line-strong pt-4">
          {canUpload ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor={inputId}
                aria-disabled={disabled || undefined}
                className={cx(
                  'group/up relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-full py-1.5 pr-5 pl-1.5 text-sm font-semibold transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring motion-reduce:transition-none',
                  document.status === 'rejected' ? 'bg-fg text-app' : 'border-2 border-dotted border-line-strong text-fg hover:border-fg/40',
                  disabled && 'pointer-events-none opacity-50',
                )}
              >
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover/up:-translate-y-0.5 motion-reduce:transition-none', document.status === 'rejected' ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                  {uploading ? <Spinner size={15} /> : <Icon name="deposit" size={15} />}
                </span>
                {translate(uploading ? 'kyc.uploading' : document.status === 'rejected' ? 'kyc.reupload' : 'kyc.upload')}
                <Icon name="arrowRight" size={14} className="ml-auto transition-transform duration-300 group-hover/up:translate-x-0.5 motion-reduce:transition-none" />
                <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} onChange={handleFileChange} className="sr-only" />
              </label>
              <p className={cx('px-2 text-[11px]', fileError ? 'font-medium text-danger' : 'text-fg-subtle')} role={fileError ? 'alert' : undefined}>
                {translate(fileError ? 'kyc.fileTooLarge' : 'kyc.fileHint')}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center">
                <span aria-hidden="true" className={cx('absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed [animation-duration:22s] motion-reduce:animate-none', isApproved ? 'border-success/50' : 'border-warning/50')} />
                <Icon name={statusIcon[document.status]} size={18} className={tone.text} />
              </span>
              <DocumentStatus status={document.status} />
            </div>
          )}
        </div>
      </article>
    </li>
  );
}

export default function KycPage() {
  const { data: documents, isLoading, uploadingKind, upload } = useKyc();

  if (isLoading || !documents) {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle />
        <Skeleton className="h-48 w-full rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-[28px]" />
          ))}
        </div>
      </div>
    );
  }

  const approvedCount = documents.filter((document) => document.status === 'approved').length;
  const progressPercent = Math.round((approvedCount / documents.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle />

      <FrostCard>
        <div className="grid gap-6 text-[#0a1220] sm:p-2 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-3">
            <p className={cx('inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', frostChipClass)}>
              <Icon name="kyc" size={13} />
              {translate('kyc.progressTitle')}
            </p>
            <span className="font-mono text-6xl leading-none font-black tracking-tight tabular-nums">
              {progressPercent}
              <span className="text-3xl">%</span>
            </span>
            <p className="text-sm font-medium text-[#3b4658]">
              <span className="font-mono font-black text-[#0a1220] tabular-nums">
                {approvedCount}/{documents.length}
              </span>{' '}
              {translate('kyc.progressText')}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <ol aria-hidden="true" className="relative grid grid-cols-3">
              <span className="absolute top-6 right-[16.66%] left-[16.66%] border-t-2 border-dotted border-[#0a1220]/30" />
              {documents.map((document, index) => (
                <li key={document.kind} className="relative flex flex-col items-center gap-2 text-center">
                  <span className="relative grid size-12 place-items-center">
                    {document.status === 'rejected' && <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#c0352b]/25 motion-reduce:hidden" />}
                    <span className={cx('relative grid size-12 place-items-center rounded-full shadow-[0_10px_20px_-12px_rgb(10_18_32/0.8)]', statusTone[document.status].frostBead)}>
                      {document.status === 'approved' ? <Icon name="check" size={17} /> : <span className="font-mono text-xs font-black">{String(index + 1).padStart(2, '0')}</span>}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-xs font-bold">{translate(`kyc.doc.${document.kind}.title`)}</span>
                  <DocumentStatus status={document.status} />
                </li>
              ))}
            </ol>

            <div
              role="progressbar"
              aria-label={translate('kyc.progressTitle')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className={cx('flex items-center justify-between gap-1 rounded-full px-3 py-2.5', frostChipClass)}
            >
              {documents.flatMap((document, docIndex) =>
                Array.from({ length: METER_DOTS_PER_DOCUMENT }, (_, dot) => {
                  const isMissing = document.status === 'missing';
                  return (
                    <span
                      key={`${document.kind}-${dot}`}
                      style={{ animationDelay: `${200 + (docIndex * METER_DOTS_PER_DOCUMENT + dot) * 25}ms` }}
                      className={cx('size-2 shrink-0 animate-dot-pop rounded-full motion-reduce:animate-none', isMissing ? 'bg-[#0a1220]/15' : statusTone[document.status].dot)}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </FrostCard>

      <ol className="grid gap-6 lg:grid-cols-3">
        {documents.map((document, index) => (
          <DocumentCard
            key={document.kind}
            document={document}
            index={index}
            uploading={uploadingKind === document.kind}
            disabled={uploadingKind !== null}
            onUpload={upload}
          />
        ))}
      </ol>
    </div>
  );
}
