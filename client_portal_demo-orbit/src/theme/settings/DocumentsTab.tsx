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

/** A sheet glyph with a folded corner; the corner carries the approval state. */
function SheetGlyph({ approved, required }: { approved: boolean; required: boolean }) {
  return (
    <span className="relative grid h-12 w-10 shrink-0 place-items-center">
      <svg viewBox="0 0 40 48" className="absolute inset-0 size-full" aria-hidden="true">
        <path
          d="M4 2 H28 L36 10 V46 H4 Z"
          strokeWidth="1.2"
          strokeLinejoin="round"
          className={required ? 'fill-primary/10 stroke-primary/45' : 'fill-fg/[0.03] stroke-line-strong'}
        />
        <path d="M28 2 V10 H36" fill="none" strokeWidth="1.2" strokeLinejoin="round" className={required ? 'stroke-primary/45' : 'stroke-line-strong'} />
        {[20, 26, 32].map((lineY) => (
          <line key={lineY} x1="10" x2={lineY === 32 ? 22 : 30} y1={lineY} y2={lineY} strokeWidth="1.6" strokeLinecap="round" className="stroke-line-strong" />
        ))}
      </svg>
      <span
        className={cx(
          'absolute -right-1.5 -bottom-1 grid size-5 place-items-center rounded-md border-2 border-surface',
          approved ? 'bg-success text-white' : 'bg-warning text-white',
        )}
      >
        <Icon name={approved ? 'check' : 'clock'} size={10} />
      </span>
    </span>
  );
}

function DocumentRow({ document, index, onView }: { document: VerificationDocument; index: number; onView: () => void }) {
  const approved = document.status === 'approved';

  return (
    <li
      style={staggerStyle(index + 2, 90)}
      className="group relative flex min-w-0 animate-rise flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-hover sm:flex-nowrap motion-reduce:animate-none"
    >
      <span
        aria-hidden="true"
        className={cx('absolute inset-y-3 left-0 w-0.5 rounded-full', document.required ? (approved ? 'bg-success' : 'bg-warning') : 'bg-line')}
      />
      <SheetGlyph approved={approved} required={document.required} />
      <div className="min-w-0 flex-1">
        <h4 className={cx('text-sm font-semibold', document.required ? 'text-fg' : 'text-fg-muted')}>{document.title}</h4>
        <p className="mt-0.5 text-xs text-fg-muted">{document.description}</p>
      </div>
      <StatusStamp tone={approved ? 'success' : 'warning'}>{documentStatusLabel[document.status]}</StatusStamp>
      {document.required ? (
        <Button size="sm" variant="secondary" leftIcon="eye" onClick={onView}>
          {verificationStatus.view}
        </Button>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-fg-subtle italic">{verificationStatus.notRequired}</span>
          <Button size="sm" variant="ghost" leftIcon="eye" disabled>
            {verificationStatus.view}
          </Button>
        </span>
      )}
    </li>
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
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
      <section className="orbit-card relative isolate flex animate-rise flex-col gap-5 overflow-hidden p-5 xl:sticky xl:top-24 motion-reduce:animate-none">
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 animate-ring-breathe rounded-full bg-warning/10 blur-3xl motion-reduce:animate-none" />
        <p className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{verificationStatus.heading}</p>

        <div className="relative mx-auto grid size-36 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-warning/45 [animation-duration:24s] motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-3 rounded-full border border-warning/30" />
          <div className="relative flex -rotate-6 flex-col items-center gap-1 text-center">
            <Icon name="kyc" size={24} className="text-warning" />
            <span className="text-lg leading-tight font-bold tracking-wide text-warning uppercase">{documentStatusLabel[verificationStatus.status]}</span>
          </div>
        </div>

        <p className="text-center text-sm text-fg-muted">{verificationStatus.message}</p>

        <div className="flex flex-col gap-2" aria-label={`${approvedCount}/${verificationDocuments.length}`}>
          <div className="flex items-center justify-between font-mono text-[11px] text-fg-subtle tabular-nums">
            <span>
              {approvedCount}/{verificationDocuments.length}
            </span>
            <span className="flex gap-1">
              {verificationDocuments.map((document) => (
                <span key={document.id} className={cx('size-1.5 rounded-full', document.status === 'approved' ? 'bg-success' : 'bg-warning')} />
              ))}
            </span>
          </div>
          <div className="flex h-8 items-end gap-1">
            {verificationDocuments.map((document, index) => (
              <span
                key={document.id}
                style={{ animationDelay: `${300 + index * 120}ms`, height: document.status === 'approved' ? '100%' : '45%' }}
                className={cx(
                  'flex-1 origin-bottom animate-[grow-y_0.6s_ease-out_both] rounded-sm motion-reduce:animate-none',
                  document.status === 'approved' ? 'bg-success/70' : 'bg-warning/50',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" leftIcon="refresh" loading={statusRefreshing} onClick={refreshStatus} fullWidth>
            {verificationStatus.refreshStatus}
          </Button>
          <Button leftIcon="refresh" loading={documentsRefreshing} onClick={refreshDocuments} fullWidth>
            {verificationStatus.refreshDocuments}
          </Button>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        {groups.map((group, groupIndex) => {
          const groupDocuments = verificationDocuments.filter((document) => document.group === group);
          return (
            <section key={group} className="flex min-w-0 flex-col">
              <h3 className="relative z-10 -mb-px flex w-fit items-center gap-2 rounded-t-xl border border-b-0 border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg">
                <Icon name="fileText" size={14} className="text-primary" />
                {documentGroups[group]}
                <span className="font-mono text-[10px] text-fg-subtle">{String(groupIndex + 1).padStart(2, '0')}</span>
              </h3>
              <ul className="orbit-card flex flex-col divide-y divide-line overflow-hidden rounded-tl-none!">
                {groupDocuments.map((document, index) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    index={groupIndex * 2 + index}
                    onView={() => setViewerIndex(verificationDocuments.indexOf(document))}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <DocumentViewer documents={verificationDocuments} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
    </div>
  );
}