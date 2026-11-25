'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';

import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { DocumentViewer } from './DocumentViewer';
import { StatusStamp } from './SettingsParts';
import { documentGroups, documentStatusLabel, verificationDocuments, verificationStatus, type VerificationDocument } from './settingsData';

const RED = 'var(--zenith-red)';
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
        'group inline-flex h-11 items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none motion-reduce:transition-none',
        ink ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      <span style={ink ? { background: RED } : undefined} className={cx('grid size-8 place-items-center rounded-full', ink ? 'text-white' : 'bg-fg/10 text-fg')}>
        <Icon name="refresh" size={14} className={cx('transition-transform duration-500 group-hover:rotate-180', refreshing && 'animate-spin motion-reduce:animate-none')} />
      </span>
      {label}
    </button>
  );
}

/** One document as an open row: file bead with status corner, title + description, stamp and the View capsule. */
function DocumentTile({ document, index, onView }: { document: VerificationDocument; index: number; onView: () => void }) {
  const approved = document.status === 'approved';

  return (
    <li
      style={staggerStyle(index + 2, 90)}
      className={cx(
        'group flex min-w-0 animate-feed-in flex-col gap-3 rounded-[26px] p-4 transition-[box-shadow,translate,background-color] duration-300 hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:transition-none',
        document.required ? 'bg-fg/[0.03] ring-1 ring-line hover:ring-line-strong' : 'border border-dashed border-line',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="relative grid size-11 shrink-0 place-items-center">
          <span className={cx('grid size-11 place-items-center rounded-full transition-transform duration-300 group-hover:-rotate-6', document.required ? 'bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}>
            <Icon name="fileText" size={16} />
          </span>
          <span
            aria-hidden="true"
            className={cx('absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-[6px] ring-2 ring-app', approved ? 'bg-success text-white' : 'bg-warning text-white')}
          >
            <Icon name={approved ? 'check' : 'clock'} size={10} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h4 className={cx('text-sm font-black', document.required ? 'text-fg' : 'text-fg-muted')}>{document.title}</h4>
          <p className="mt-0.5 text-xs text-fg-muted">{document.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusStamp tone={approved ? 'success' : 'warning'}>{documentStatusLabel[document.status]}</StatusStamp>
        {!document.required && <span className="text-[11px] text-fg-subtle italic">{verificationStatus.notRequired}</span>}
        <button
          type="button"
          onClick={onView}
          disabled={!document.required}
          className="group/view ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-fg py-1 pr-3.5 pl-1 text-xs font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:bg-fg/10 disabled:text-fg-subtle"
        >
          <span style={document.required ? { background: RED } : undefined} className="grid size-7 place-items-center rounded-full text-white transition-transform duration-300 group-hover/view:scale-110">
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
    <div className="flex flex-col gap-8">
      {/* Verification status: open band — big status word, message, one capsule segment per document, refresh actions. */}
      <section className="flex animate-rise flex-col gap-5 rounded-[32px] border border-dashed border-line-strong p-5 sm:p-6 motion-reduce:animate-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
              <span aria-hidden="true" className="relative grid size-4 place-items-center">
                <span className="absolute inset-0 animate-ping-soft rounded-[4px] bg-warning/50 motion-reduce:animate-none" />
                <span className="relative size-2 rounded-[2px] bg-warning" />
              </span>
              {verificationStatus.heading}
            </p>
            <p className="flex items-center gap-3 text-4xl leading-none font-black tracking-tighter text-warning uppercase sm:text-5xl">
              <Icon name="kyc" size={30} className="shrink-0" />
              {documentStatusLabel[verificationStatus.status]}
            </p>
            <p className="max-w-xl border-l-2 border-[var(--zenith-red)] pl-3 text-sm text-fg-muted">{verificationStatus.message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RefreshPill label={verificationStatus.refreshStatus} refreshing={statusRefreshing} onClick={refreshStatus} />
            <RefreshPill label={verificationStatus.refreshDocuments} refreshing={documentsRefreshing} onClick={refreshDocuments} ink />
          </div>
        </div>

        <div className="flex items-center gap-3" aria-label={`${approvedCount}/${verificationDocuments.length}`}>
          <span aria-hidden="true" className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-fg/[0.04] p-1.5 ring-1 ring-line">
            {verificationDocuments.map((document, index) => {
              const approved = document.status === 'approved';
              return (
                <span
                  key={document.id}
                  style={{ animationDelay: `${300 + index * 90}ms` }}
                  className={cx(
                    'grid h-full min-w-0 flex-1 animate-dot-pop place-items-center rounded-full motion-reduce:animate-none',
                    approved ? 'bg-success text-white' : 'zenith-blink border-2 border-dashed border-warning',
                  )}
                >
                  {approved && <Icon name="check" size={12} />}
                </span>
              );
            })}
          </span>
          <span className="font-mono text-2xl leading-none font-black tracking-tight text-fg tabular-nums">
            {approvedCount}
            <span className="text-sm text-fg-subtle">/{verificationDocuments.length}</span>
          </span>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {groups.map((group, groupIndex) => {
          const groupDocuments = verificationDocuments.filter((document) => document.group === group);
          return (
            <section key={group} style={staggerStyle(groupIndex + 1, 140)} className="flex min-w-0 animate-rise flex-col gap-4 motion-reduce:animate-none">
              <h3 className="flex items-end gap-3 text-lg font-black tracking-tight text-fg">
                <span aria-hidden="true" className="font-mono text-4xl leading-[0.85] tracking-tighter text-fg/15 tabular-nums">{String(groupIndex + 1).padStart(2, '0')}</span>
                <span className="pb-0.5">{documentGroups[group]}</span>
                <span aria-hidden="true" className="mb-2 flex flex-1 items-center gap-1.5">
                  <span style={{ background: RED }} className="h-0.5 w-6 rounded-full" />
                  <span className="h-px flex-1 bg-line" />
                </span>
                <span className="mb-0.5 rounded-full bg-fg px-2 py-0.5 font-mono text-[11px] text-app tabular-nums">{groupDocuments.length}</span>
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