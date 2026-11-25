'use client';

import { useState, type ChangeEvent } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import { useKyc } from '@/core/pages/useKyc';
import type { KycDocument, KycDocumentKind } from '@/core/types';
import { cx } from '../lib/cx';
import { Alert, Badge, Skeleton, Spinner, StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const statusIcon: Record<KycDocument['status'], IconName> = {
  missing: 'inbox',
  pending: 'info',
  processing: 'info',
  approved: 'checkCircle',
  rejected: 'xCircle',
};

// Static class sets per status so Tailwind can see every class name.
const statusTone: Record<KycDocument['status'], { node: string; text: string; segment: string; rail: string }> = {
  approved: { node: 'border-success/50 bg-success/15 text-success', text: 'text-success', segment: 'bg-success', rail: 'from-success/60' },
  rejected: { node: 'border-danger/50 bg-danger/12 text-danger', text: 'text-danger', segment: 'bg-danger/80', rail: 'from-danger/50' },
  pending: { node: 'border-warning/50 bg-warning/12 text-warning', text: 'text-warning', segment: 'bg-warning/70', rail: 'from-warning/50' },
  processing: { node: 'border-warning/50 bg-warning/12 text-warning', text: 'text-warning', segment: 'bg-warning/70', rail: 'from-warning/50' },
  missing: { node: 'border-line-strong bg-surface text-fg-subtle', text: 'text-fg-subtle', segment: 'bg-line-strong', rail: 'from-line-strong' },
};

function DocumentStatus({ status }: { status: KycDocument['status'] }) {
  return status === 'missing' ? <Badge dot>{translate('kyc.status.missing')}</Badge> : <StatusBadge status={status} />;
}

/** A diamond checkpoint marker; the content stays upright inside the rotated frame. */
function CheckpointNode({ status, index, size = 'md' }: { status: KycDocument['status']; index: number; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('relative grid shrink-0 place-items-center', size === 'md' ? 'size-12' : 'size-10')}>
      <span aria-hidden="true" className={cx('absolute inset-1.5 rotate-45 rounded-lg border-2 transition-colors duration-500', statusTone[status].node)} />
      {status === 'pending' && <span aria-hidden="true" className="absolute inset-1.5 rotate-45 animate-pulse-ring rounded-lg border border-warning motion-reduce:hidden" />}
      <span className={cx('relative', statusTone[status].text)}>
        {status === 'approved' ? <Icon name="check" size={size === 'md' ? 16 : 13} /> : <span className="font-mono text-[11px] font-bold">{String(index + 1).padStart(2, '0')}</span>}
      </span>
    </span>
  );
}

interface DocumentStageProps {
  document: KycDocument;
  index: number;
  uploading: boolean;
  disabled: boolean;
  onUpload: (kind: KycDocumentKind, file: File) => void;
}

function DocumentStage({ document, index, uploading, disabled, onUpload }: DocumentStageProps) {
  const [fileError, setFileError] = useState(false);
  const canUpload = document.status === 'missing' || document.status === 'rejected';
  const inputId = `kyc-${document.kind}`;
  const isApproved = document.status === 'approved';

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
    <li style={{ animationDelay: `${index * 110}ms` }} className="relative grid animate-rise grid-cols-[3rem_minmax(0,1fr)] gap-x-4 motion-reduce:animate-none">
      <div className="relative flex justify-center">
        <span aria-hidden="true" className={cx('absolute top-12 -bottom-6 w-px bg-linear-to-b to-transparent', statusTone[document.status].rail)} />
        <CheckpointNode status={document.status} index={index} />
      </div>

      <article
        className={cx(
          'orbit-card relative isolate grid min-w-0 overflow-hidden transition-colors md:grid-cols-[minmax(0,1fr)_16rem]',
          document.status === 'rejected' && 'border-danger/35',
          isApproved && 'border-success/25',
        )}
      >
        {isApproved && <span aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 -z-10 opacity-30" />}

        <div className="flex min-w-0 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Icon name={statusIcon[document.status]} size={17} className={statusTone[document.status].text} />
            <h2 className="text-base font-semibold text-fg">{translate(`kyc.doc.${document.kind}.title`)}</h2>
            <DocumentStatus status={document.status} />
          </div>
          <p className="text-sm text-fg-muted">{translate(`kyc.doc.${document.kind}.text`)}</p>

          {document.fileName && (
            <p className="flex w-fit max-w-full min-w-0 items-center gap-2.5 rounded-xl border border-line bg-fg/[0.03] py-1.5 pr-3 pl-1.5 text-sm">
              <span className="grid h-8 w-7 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/12 text-primary">
                <Icon name="fileText" size={14} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{document.fileName}</span>
                {document.uploadedAt && (
                  <span className="block truncate text-[11px] text-fg-subtle">
                    {translate('kyc.uploaded')} {formatDate(document.uploadedAt)}
                  </span>
                )}
              </span>
            </p>
          )}

          {document.status === 'rejected' && <Alert tone="danger">{translate('kyc.rejectedNote')}</Alert>}
          {document.status === 'pending' && <Alert tone="info">{translate('kyc.pendingNote')}</Alert>}
        </div>

        <div className="flex flex-col justify-center gap-2 border-t border-line p-4 md:border-t-0 md:border-l md:border-dashed md:border-line-strong">
          {canUpload ? (
            <>
              <label
                htmlFor={inputId}
                aria-disabled={disabled || undefined}
                className={cx(
                  'group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-5 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                  document.status === 'rejected' ? 'border-primary/55 bg-primary/[0.1] hover:bg-primary/15' : 'border-line-strong hover:border-primary/50 hover:bg-primary/[0.06]',
                  disabled && 'pointer-events-none opacity-50',
                )}
              >
                <span className="grid size-10 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
                  {uploading ? <Spinner size={16} /> : <Icon name="deposit" size={17} />}
                </span>
                <span className="text-sm font-semibold text-fg">
                  {translate(uploading ? 'kyc.uploading' : document.status === 'rejected' ? 'kyc.reupload' : 'kyc.upload')}
                </span>
                <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} onChange={handleFileChange} className="sr-only" />
              </label>
              <p className={cx('text-center text-[11px]', fileError ? 'font-medium text-danger' : 'text-fg-subtle')} role={fileError ? 'alert' : undefined}>
                {translate(fileError ? 'kyc.fileTooLarge' : 'kyc.fileHint')}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <span className="relative grid size-20 place-items-center">
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed [animation-duration:22s] motion-reduce:animate-none',
                    isApproved ? 'border-success/45' : 'border-warning/45',
                  )}
                />
                <span className={cx('grid size-14 -rotate-6 place-items-center rounded-full border', statusTone[document.status].node)}>
                  <Icon name={statusIcon[document.status]} size={24} />
                </span>
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

  const header = <PageHeader title={translate('nav.kyc')} description={translate('kyc.subtitle')} />;

  if (isLoading || !documents) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-36 w-full" />
        <div className="flex flex-col gap-6" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const approvedCount = documents.filter((document) => document.status === 'approved').length;
  const progressPercent = Math.round((approvedCount / documents.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      {header}

      <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-20 -z-10 size-64 animate-ring-breathe rounded-full bg-primary/12 blur-3xl motion-reduce:animate-none" />

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-4">
              <span className="font-mono text-5xl leading-none font-semibold text-fg tabular-nums">
                {progressPercent}
                <span className="text-2xl text-primary">%</span>
              </span>
              <div className="min-w-0 pb-1">
                <h2 className="text-sm font-semibold text-fg">{translate('kyc.progressTitle')}</h2>
                <p className="text-xs text-fg-muted">
                  <span className="font-mono font-semibold text-fg tabular-nums">
                    {approvedCount}/{documents.length}
                  </span>{' '}
                  {translate('kyc.progressText')}
                </p>
              </div>
            </div>
            <div
              role="progressbar"
              aria-label={translate('kyc.progressTitle')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="flex h-2.5 gap-1"
            >
              {documents.map((document, index) => (
                <span key={document.kind} className="flex-1 overflow-hidden rounded-sm bg-fg/[0.06]">
                  <span
                    style={{ animationDelay: `${200 + index * 140}ms` }}
                    className={cx('block size-full origin-left animate-grow rounded-sm motion-reduce:animate-none', statusTone[document.status].segment)}
                  />
                </span>
              ))}
            </div>
          </div>

          <ol aria-hidden="true" className="grid grid-cols-3 gap-2">
            {documents.map((document, index) => (
              <li key={document.kind} className="relative flex flex-col items-center gap-2 text-center">
                {index > 0 && (
                  <span
                    className={cx(
                      'absolute top-6 right-[calc(50%+1.75rem)] h-px w-[calc(100%-3rem)]',
                      documents[index - 1].status === 'approved' ? 'bg-success/60' : 'bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_4px,transparent_4px_8px)]',
                    )}
                  />
                )}
                <CheckpointNode status={document.status} index={index} />
                <span className="line-clamp-2 text-xs font-medium text-fg">{translate(`kyc.doc.${document.kind}.title`)}</span>
                <DocumentStatus status={document.status} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ol className="flex flex-col gap-6">
        {documents.map((document, index) => (
          <DocumentStage
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