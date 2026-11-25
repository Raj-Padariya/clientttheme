'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';

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

function RefreshPill({ label, refreshing, onClick, ink }: { label: string; refreshing: boolean; onClick: () => void; ink?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      aria-busy={refreshing}
      className={cx(
        'inline-flex h-11 items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none motion-reduce:transition-none',
        ink ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      <span className={cx('grid size-8 place-items-center rounded-full', ink ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
        <Icon name="refresh" size={14} className={cx(refreshing && 'animate-spin motion-reduce:animate-none')} />
      </span>
      {label}
    </button>
  );
}

function DocumentTile({ document, index, onView }: { document: VerificationDocument; index: number; onView: () => void }) {
  const approved = document.status === 'approved';

  return (
    <li
      style={staggerStyle(index + 2, 90)}
      className={cx(
        'group flex min-w-0 animate-feed-in flex-col gap-3 rounded-[22px] p-4 transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:transition-none',
        document.required ? 'ring-1 ring-line hover:ring-line-strong' : 'border border-dashed border-line',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="relative grid size-11 shrink-0 place-items-center">
          <span className={cx('grid size-11 place-items-center rounded-full', document.required ? 'nova-gloss text-fg' : 'text-fg-subtle ring-1 ring-line')}>
            <Icon name="fileText" size={16} />
          </span>
          <span
            aria-hidden="true"
            className={cx('absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full ring-2 ring-surface', approved ? 'bg-success text-white' : 'bg-warning text-white')}
          >
            <Icon name={approved ? 'check' : 'clock'} size={10} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h4 className={cx('text-sm font-bold', document.required ? 'text-fg' : 'text-fg-muted')}>{document.title}</h4>
          <p className="mt-0.5 text-xs text-fg-muted">{document.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-dotted border-line-strong pt-3">
        <StatusStamp tone={approved ? 'success' : 'warning'}>{documentStatusLabel[document.status]}</StatusStamp>
        {!document.required && <span className="text-[11px] text-fg-subtle italic">{verificationStatus.notRequired}</span>}
        <button
          type="button"
          onClick={onView}
          disabled={!document.required}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-xs font-semibold text-fg ring-1 ring-line transition-[background-color,color,box-shadow] duration-300 hover:bg-fg hover:text-app hover:ring-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="nova-gloss grid size-7 place-items-center rounded-full text-fg">
            <Icon name="eye" size={12} />
          </span>
          {verificationStatus.view}
        </button>
      </div>
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
    <div className="flex flex-col gap-6">
      <section className="orbit-card nova-edge-light relative isolate grid animate-rise items-center gap-5 overflow-hidden p-5 md:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto] motion-reduce:animate-none">
        <div className="relative grid size-32 place-items-center justify-self-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-warning/50 [animation-duration:24s] motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-3 rounded-full border border-dotted border-warning/40" />
          <div className="relative flex -rotate-6 flex-col items-center gap-1 text-center">
            <Icon name="kyc" size={22} className="text-warning" />
            <span className="text-base leading-tight font-black tracking-wide text-warning uppercase">{documentStatusLabel[verificationStatus.status]}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{verificationStatus.heading}</p>
          <p className="text-sm text-fg-muted">{verificationStatus.message}</p>
          <div className="flex items-center gap-3" aria-label={`${approvedCount}/${verificationDocuments.length}`}>
            <span className="relative flex items-center gap-2">
              <span aria-hidden="true" className="absolute inset-x-1 top-1/2 border-t border-dotted border-line-strong" />
              {verificationDocuments.map((document, index) => {
                const approved = document.status === 'approved';
                return (
                  <span
                    key={document.id}
                    aria-hidden="true"
                    style={{ animationDelay: `${300 + index * 90}ms` }}
                    className={cx('relative grid size-5 animate-dot-pop place-items-center rounded-full motion-reduce:animate-none', approved ? 'bg-success text-white' : 'border-2 border-warning bg-surface')}
                  >
                    {approved && <Icon name="check" size={10} />}
                  </span>
                );
              })}
            </span>
            <span className="font-mono text-xs font-bold text-fg tabular-nums">
              {approvedCount}/{verificationDocuments.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1 xl:flex-col">
          <RefreshPill label={verificationStatus.refreshStatus} refreshing={statusRefreshing} onClick={refreshStatus} />
          <RefreshPill label={verificationStatus.refreshDocuments} refreshing={documentsRefreshing} onClick={refreshDocuments} ink />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group, groupIndex) => {
          const groupDocuments = verificationDocuments.filter((document) => document.group === group);
          return (
            <section key={group} style={staggerStyle(groupIndex + 1, 140)} className="orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-4 p-5 motion-reduce:animate-none">
              <h3 className="flex items-center gap-3 text-base font-bold text-fg">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-fg font-mono text-xs font-black text-app">{String(groupIndex + 1).padStart(2, '0')}</span>
                {documentGroups[group]}
                <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
                <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{groupDocuments.length}</span>
              </h3>
              <ul className="flex flex-col gap-3">
                {groupDocuments.map((document, index) => (
                  <DocumentTile
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