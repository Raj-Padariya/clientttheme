'use client';

import { useState, type ChangeEvent } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import { useKyc } from '@/core/pages/useKyc';
import type { KycDocument, KycDocumentKind } from '@/core/types';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Badge, Skeleton, Spinner, StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const RED = 'var(--zenith-red)';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const METER_TICKS_PER_DOCUMENT = 16;

const statusIcon: Record<KycDocument['status'], IconName> = {
  missing: 'inbox',
  pending: 'info',
  processing: 'info',
  approved: 'checkCircle',
  rejected: 'xCircle',
};

// Static class sets per status so Tailwind can see every class name.
const statusTone: Record<KycDocument['status'], { bead: string; text: string; tick: string }> = {
  approved: { bead: 'bg-success text-white', text: 'text-success', tick: 'bg-success' },
  rejected: { bead: 'bg-danger text-white', text: 'text-danger', tick: 'bg-danger' },
  pending: { bead: 'bg-warning text-white', text: 'text-warning', tick: 'bg-warning' },
  processing: { bead: 'bg-warning text-white', text: 'text-warning', tick: 'bg-warning' },
  missing: { bead: 'bg-fg/10 text-fg-muted', text: 'text-fg-subtle', tick: 'bg-fg/12' },
};

function DocumentStatus({ status }: { status: KycDocument['status'] }) {
  return status === 'missing' ? <Badge dot>{translate('kyc.status.missing')}</Badge> : <StatusBadge status={status} />;
}

function PageTitle() {
  return (
    <header className="zenith-tile flex items-center gap-4">
      <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
        <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
          <span style={{ background: RED }} className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-[2px]" />
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
          <Icon name="kyc" size={15} />
        </span>
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-black tracking-tight text-fg">{translate('nav.kyc')}</h1>
        <p className="mt-0.5 text-sm text-fg-muted">{translate('kyc.subtitle')}</p>
      </div>
      <span aria-hidden="true" className="hidden h-px flex-1 bg-line sm:block" />
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

/** One document as a wide open row: ghost numeral | status bead + copy + file chip + note | upload action or status seal. */
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
          'grid w-full min-w-0 gap-5 rounded-[32px] p-5 transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)_16rem] md:items-center motion-reduce:transition-none',
          document.status === 'rejected' ? 'bg-danger/[0.04] ring-1 ring-danger/35' : canUpload ? 'border border-dashed border-line-strong' : 'bg-fg/[0.02] ring-1 ring-line',
        )}
      >
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
          <span className="font-mono text-6xl leading-[0.8] font-black tracking-tighter text-fg/15 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <span className="relative grid size-12 shrink-0 place-items-center">
            {document.status === 'pending' && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/30 motion-reduce:hidden" />}
            <span className={cx('relative grid size-12 place-items-center rounded-full', tone.bead)}>
              <Icon name={statusIcon[document.status]} size={19} />
            </span>
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-fg">{translate(`kyc.doc.${document.kind}.title`)}</h2>
            <DocumentStatus status={document.status} />
          </div>
          <p className="max-w-xl border-l-2 border-[var(--zenith-red)] pl-3 text-sm text-fg-muted">{translate(`kyc.doc.${document.kind}.text`)}</p>

          {document.fileName && (
            <p className="flex w-fit max-w-full min-w-0 items-center gap-2.5 rounded-full bg-fg/[0.04] py-1 pr-4 pl-1 text-sm ring-1 ring-line">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-app">
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
            <p role="note" className={cx('flex w-fit items-start gap-2.5 rounded-[18px] px-3 py-2.5 text-xs font-medium', document.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info')}>
              <Icon name={document.status === 'rejected' ? 'xCircle' : 'info'} size={14} className="mt-px shrink-0" />
              {translate(document.status === 'rejected' ? 'kyc.rejectedNote' : 'kyc.pendingNote')}
            </p>
          )}
        </div>

        <div className="border-t border-line pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5">
          {canUpload ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor={inputId}
                aria-disabled={disabled || undefined}
                className={cx(
                  'group/up flex cursor-pointer items-center gap-3 rounded-full bg-fg py-1.5 pr-4 pl-1.5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 active:scale-[0.98] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring motion-reduce:transition-none',
                  disabled && 'pointer-events-none opacity-50',
                )}
              >
                <span style={{ background: RED }} className="relative grid size-9 shrink-0 place-items-center rounded-full text-white transition-transform duration-300 group-hover/up:-translate-y-0.5 motion-reduce:transition-none">
                  {!uploading && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                  {uploading ? <Spinner size={15} /> : <Icon name="deposit" size={15} className="relative" />}
                </span>
                <span className="min-w-0 truncate">{translate(uploading ? 'kyc.uploading' : document.status === 'rejected' ? 'kyc.reupload' : 'kyc.upload')}</span>
                <Icon name="arrowRight" size={14} className="ml-auto shrink-0 transition-transform duration-300 group-hover/up:translate-x-0.5 motion-reduce:transition-none" />
                <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} onChange={handleFileChange} className="sr-only" />
              </label>
              <p className={cx('px-2 text-[11px]', fileError ? 'font-medium text-danger' : 'text-fg-subtle')} role={fileError ? 'alert' : undefined}>
                {translate(fileError ? 'kyc.fileTooLarge' : 'kyc.fileHint')}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center">
                <span aria-hidden="true" className={cx('absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed [animation-duration:6s] motion-reduce:animate-none', isApproved ? 'border-success/60' : 'border-warning/60')} />
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

// Skeleton: slim title line → open progress band (huge % | capsule tick meter + document route) → stacked document rows.
export default function KycPage() {
  const { data: documents, isLoading, uploadingKind, upload } = useKyc();

  if (isLoading || !documents) {
    return (
      <div className="flex flex-col gap-10">
        <PageTitle />
        <Skeleton className="h-48 w-full rounded-[32px]" />
        <div className="flex flex-col gap-4" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-[32px]" />
          ))}
        </div>
      </div>
    );
  }

  const approvedCount = documents.filter((document) => document.status === 'approved').length;
  const progressPercent = Math.round((approvedCount / documents.length) * 100);

  return (
    <div className="flex flex-col gap-10">
      <PageTitle />

      <section className="grid animate-rise gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-end motion-reduce:animate-none">
        <div className="flex flex-col gap-3">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-1 text-xs font-semibold text-app">
            <span style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-white">
              <Icon name="kyc" size={11} />
            </span>
            {translate('kyc.progressTitle')}
          </p>
          <span className="font-mono text-7xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-8xl">
            {progressPercent}
            <span className="text-3xl text-fg-subtle">%</span>
          </span>
          <p className="text-sm text-fg-muted">
            <span className="font-mono font-black text-fg tabular-nums">
              {approvedCount}/{documents.length}
            </span>{' '}
            {translate('kyc.progressText')}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Meter: one block of tick columns per document, coloured by that document's status; the first unfinished block's lead tick blinks red. */}
          <div
            role="progressbar"
            aria-label={translate('kyc.progressTitle')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            className="flex h-16 items-center gap-2 rounded-full bg-fg/[0.04] px-3 ring-1 ring-line"
          >
            {documents.map((document, docIndex) => {
              const isLead = docIndex === documents.findIndex((item) => item.status !== 'approved');
              return (
                <span key={document.kind} className="flex h-9 min-w-0 flex-1 items-center gap-[3px]">
                  {Array.from({ length: METER_TICKS_PER_DOCUMENT }, (_, tick) => {
                    const isHead = isLead && tick === 0;
                    return (
                      <span
                        key={tick}
                        style={{ animationDelay: `${(docIndex * METER_TICKS_PER_DOCUMENT + tick) * 30}ms`, ...(isHead ? { background: RED } : {}) }}
                        className={cx(
                          'min-w-0 flex-1 rounded-full',
                          isHead ? 'zenith-blink h-full' : document.status === 'missing' ? 'zenith-twinkle h-1/3 bg-fg/15' : cx('zenith-bar h-3/4', statusTone[document.status].tick),
                        )}
                      />
                    );
                  })}
                </span>
              );
            })}
          </div>

          <ol aria-hidden="true" className="grid gap-2 sm:grid-cols-3">
            {documents.map((document, index) => (
              <li
                key={document.kind}
                style={staggerStyle(index + 1, 90)}
                className={cx(
                  'flex min-w-0 animate-feed-in items-center gap-2.5 rounded-full py-1.5 pr-3 pl-1.5 motion-reduce:animate-none',
                  document.status === 'approved' ? 'bg-fg text-app' : 'bg-fg/[0.03] ring-1 ring-line',
                )}
              >
                <span className="relative grid size-9 shrink-0 place-items-center">
                  {document.status === 'rejected' && <span className="absolute inset-0 animate-ping-soft rounded-full bg-danger/30 motion-reduce:hidden" />}
                  <span className={cx('relative grid size-9 place-items-center rounded-full', statusTone[document.status].bead)}>
                    {document.status === 'approved' ? <Icon name="check" size={15} /> : <span className="font-mono text-[11px] font-black">{String(index + 1).padStart(2, '0')}</span>}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cx('truncate text-xs font-bold', document.status !== 'approved' && 'text-fg')}>{translate(`kyc.doc.${document.kind}.title`)}</span>
                  <span className="w-fit scale-90 origin-left">
                    <DocumentStatus status={document.status} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ol className="flex flex-col gap-4 border-t border-line pt-8">
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
