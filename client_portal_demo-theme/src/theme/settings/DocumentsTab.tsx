'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { DocumentViewer } from './DocumentViewer';
import { StatusStamp } from './SettingsParts';
import { documentGroups, documentStatusLabel, verificationDocuments, verificationStatus, type VerificationDocument } from './settingsData';

const REFRESH_DURATION_MS = 900;

function useRefreshing(onDone: () => void) {
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const trigger = () => {
    setRefreshing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setRefreshing(false);
      onDone();
    }, REFRESH_DURATION_MS);
  };

  return [refreshing, trigger] as const;
}

function DocumentCard({ document, index, onView }: { document: VerificationDocument; index: number; onView: () => void }) {
  const approved = document.status === 'approved';

  return (
    <article
      style={staggerStyle(index + 2, 90)}
      className={cx(
        'group relative flex animate-rise flex-col gap-4 overflow-hidden rounded-xl p-4 ring-1 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none',
        document.required ? 'bg-surface shadow-card ring-line hover:shadow-[0_18px_36px_-22px_var(--brand-primary)]' : 'bg-surface-2/60 ring-line',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('absolute top-0 right-0 size-16 rounded-bl-[2.5rem]', approved ? 'bg-success/10' : 'bg-warning/10')}
      />
      <div className="relative flex items-start gap-3">
        <span
          className={cx(
            'relative grid h-14 w-11 shrink-0 place-items-center rounded-md ring-1',
            document.required ? 'bg-primary-soft text-primary ring-primary/30' : 'bg-surface text-fg-subtle ring-line',
          )}
        >
          <Icon name="fileText" size={20} />
          <span
            className={cx(
              'absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full ring-2 ring-surface',
              approved ? 'bg-success text-white' : 'bg-warning text-white',
            )}
          >
            <Icon name={approved ? 'check' : 'clock'} size={11} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h4 className={cx('text-sm font-semibold', document.required ? 'text-fg' : 'text-fg-muted')}>{document.title}</h4>
          <p className="mt-0.5 text-xs text-fg-muted">{document.description}</p>
        </div>
      </div>

      <div className="relative mt-auto flex items-center justify-between gap-2">
        <StatusStamp tone={approved ? 'success' : 'warning'}>{documentStatusLabel[document.status]}</StatusStamp>
        {document.required ? (
          <Button size="sm" variant="secondary" leftIcon="eye" onClick={onView}>
            {verificationStatus.view}
          </Button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-[11px] italic text-fg-subtle">{verificationStatus.notRequired}</span>
            <Button size="sm" variant="ghost" leftIcon="eye" disabled>
              {verificationStatus.view}
            </Button>
          </span>
        )}
      </div>
    </article>
  );
}

export function DocumentsTab() {
  const approvedCount = verificationDocuments.filter((document) => document.status === 'approved').length;
  const [statusRefreshing, refreshStatus] = useRefreshing(() =>
    toast('Verification status refreshed', {
      tone: 'warning',
      description: `Status: ${documentStatusLabel[verificationStatus.status]}`,
    }),
  );
  const [documentsRefreshing, refreshDocuments] = useRefreshing(() =>
    toast('Documents refreshed', {
      description: `${approvedCount} of ${verificationDocuments.length} documents approved`,
    }),
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const groups = Object.keys(documentGroups) as (keyof typeof documentGroups)[];

  return (
    <div className="flex flex-col gap-6">
      <section className="kpi-card relative animate-rise overflow-hidden rounded-xl p-5 sm:p-6 motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <div className="relative grid size-20 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-warning/50 motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute inset-2 animate-ring-breathe rounded-full bg-warning/15 motion-reduce:animate-none" />
            <Icon name="kyc" size={28} className="relative text-warning" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{verificationStatus.heading}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-warning">{documentStatusLabel[verificationStatus.status]}</p>
            <p className="mt-1 text-sm text-fg-muted">{verificationStatus.message}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <Button variant="outline" leftIcon="refresh" loading={statusRefreshing} onClick={refreshStatus}>
              {verificationStatus.refreshStatus}
            </Button>
            <Button leftIcon="refresh" loading={documentsRefreshing} onClick={refreshDocuments}>
              {verificationStatus.refreshDocuments}
            </Button>
          </div>
        </div>

        <div className="relative mt-6 flex gap-1.5" aria-label={`${approvedCount}/${verificationDocuments.length}`}>
          {verificationDocuments.map((document, index) => (
            <span key={document.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                style={{ animationDelay: `${300 + index * 150}ms` }}
                className={cx(
                  'block h-full w-full origin-left animate-grow rounded-full motion-reduce:animate-none',
                  document.status === 'approved' ? 'bg-success' : 'bg-warning',
                )}
              />
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group, groupIndex) => (
          <section key={group} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <span className="grid size-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-on-primary">{groupIndex + 1}</span>
              {documentGroups[group]}
            </h3>
            <div className="grid gap-3">
              {verificationDocuments
                .filter((document) => document.group === group)
                .map((document, index) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    index={groupIndex * 2 + index}
                    onView={() => setViewerIndex(verificationDocuments.indexOf(document))}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      <DocumentViewer documents={verificationDocuments} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
    </div>
  );
}
