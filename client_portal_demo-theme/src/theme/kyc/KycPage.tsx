'use client';

import { useState, type ChangeEvent } from 'react';
import { formatDate } from '@/core/format';
import { translate } from '@/core/i18n';
import { useKyc } from '@/core/pages/useKyc';
import type { KycDocument, KycDocumentKind } from '@/core/types';
import { cx } from '../lib/cx';
import { buttonClass } from '../ui/Button';
import { Card } from '../ui/Card';
import { Alert, Badge, Skeleton, Spinner, StatusBadge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { ProgressBar } from '../ui/ProgressBar';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const statusIcon: Record<KycDocument['status'], IconName> = {
  missing: 'inbox',
  pending: 'info',
  processing: 'info',
  approved: 'checkCircle',
  rejected: 'xCircle',
};

interface DocumentCardProps {
  document: KycDocument;
  uploading: boolean;
  disabled: boolean;
  onUpload: (kind: KycDocumentKind, file: File) => void;
}

function DocumentCard({ document, uploading, disabled, onUpload }: DocumentCardProps) {
  const [fileError, setFileError] = useState(false);
  const canUpload = document.status === 'missing' || document.status === 'rejected';
  const inputId = `kyc-${document.kind}`;

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
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon name={statusIcon[document.status]} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-fg">{translate(`kyc.doc.${document.kind}.title`)}</h2>
            {document.status === 'missing' ? (
              <Badge dot>{translate('kyc.status.missing')}</Badge>
            ) : (
              <StatusBadge status={document.status} />
            )}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{translate(`kyc.doc.${document.kind}.text`)}</p>
        </div>
      </div>

      {document.fileName && (
        <p className="flex min-w-0 items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
          <span className="truncate font-medium text-fg">{document.fileName}</span>
          {document.uploadedAt && (
            <span className="shrink-0 text-fg-subtle">
              · {translate('kyc.uploaded')} {formatDate(document.uploadedAt)}
            </span>
          )}
        </p>
      )}

      {document.status === 'rejected' && <Alert tone="danger">{translate('kyc.rejectedNote')}</Alert>}
      {document.status === 'pending' && <Alert tone="info">{translate('kyc.pendingNote')}</Alert>}

      {canUpload && (
        <div className="mt-auto flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            aria-disabled={disabled || undefined}
            className={cx(
              buttonClass({ variant: document.status === 'rejected' ? 'primary' : 'outline', size: 'sm' }),
              'cursor-pointer self-start has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            {uploading ? <Spinner size={16} /> : <Icon name="deposit" size={16} />}
            {translate(uploading ? 'kyc.uploading' : document.status === 'rejected' ? 'kyc.reupload' : 'kyc.upload')}
            <input
              id={inputId}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={disabled}
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          <p className={cx('text-xs', fileError ? 'font-medium text-danger' : 'text-fg-subtle')} role={fileError ? 'alert' : undefined}>
            {translate(fileError ? 'kyc.fileTooLarge' : 'kyc.fileHint')}
          </p>
        </div>
      )}
    </Card>
  );
}

export default function KycPage() {
  const { data: documents, isLoading, uploadingKind, upload } = useKyc();

  const header = <PageHeader title={translate('nav.kyc')} description={translate('kyc.subtitle')} />;

  if (isLoading || !documents) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
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

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-fg">{translate('kyc.progressTitle')}</h2>
          <p className="text-sm text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">
              {approvedCount}/{documents.length}
            </span>{' '}
            {translate('kyc.progressText')}
          </p>
        </div>
        <ProgressBar value={progressPercent} label={translate('kyc.progressTitle')} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <DocumentCard
            key={document.kind}
            document={document}
            uploading={uploadingKind === document.kind}
            disabled={uploadingKind !== null}
            onUpload={upload}
          />
        ))}
      </div>
    </div>
  );
}
