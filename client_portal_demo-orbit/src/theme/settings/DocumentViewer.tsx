'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { IconButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { StatusStamp } from './SettingsParts';
import { documentGroups, documentStatusLabel, initialProfileValues, type VerificationDocument } from './settingsData';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const QUARTER_TURN = 90;

interface DocumentViewerProps {
  documents: VerificationDocument[];
  /** Index into `documents` of the open document, or `null` when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const profile = initialProfileValues;
const displayDob = profile.dateOfBirth.split('-').reverse().join('.');
const mrzName = `${profile.lastName}<<${profile.firstName}`.toUpperCase().replace(/[^A-Z<]/g, '<');
const MRZ_LENGTH = 30;

function padMrz(value: string) {
  return value.padEnd(MRZ_LENGTH, '<').slice(0, MRZ_LENGTH);
}

function IdentityCard({ side }: { side: 'front' | 'back' }) {
  return (
    <div className="orbit-card aspect-[1.586] w-[26rem] max-w-full overflow-hidden bg-linear-to-br from-surface via-surface-2 to-surface p-5 text-fg shadow-[0_30px_60px_-30px_var(--brand-primary)]">
      {side === 'front' ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <p className="text-[8px] font-bold tracking-[0.25em] text-fg-muted uppercase">Republic of {profile.country}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase">National Identity Card</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name="kyc" size={16} />
            </span>
          </div>
          <div className="mt-3 flex flex-1 gap-4">
            <span className="grid h-24 w-20 shrink-0 place-items-center rounded-md bg-surface-2 text-fg-subtle ring-1 ring-line">
              <Icon name="user" size={40} />
            </span>
            <dl className="grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-1.5 text-[10px]">
              {[
                ['Surname', profile.lastName],
                ['Given names', profile.firstName],
                ['Nationality', profile.nationality],
                ['Date of birth', displayDob],
                ['Sex', profile.gender || '—'],
                ['Document no.', '•••••••'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[7px] font-semibold tracking-wider text-fg-subtle uppercase">{label}</dt>
                  <dd className="font-semibold capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-2 truncate font-mono text-[10px] tracking-[0.18em] text-fg-muted">{padMrz(`IDAGO${mrzName}`)}</p>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between">
          <span className="-mx-5 h-9 bg-surface-2" />
          <div className="flex items-end justify-between gap-4">
            <div className="flex h-10 flex-1 items-end gap-[2px]">
              {Array.from({ length: 38 }, (_, bar) => (
                <span key={bar} className="w-[2px] bg-fg-muted" style={{ height: `${40 + ((bar * 37) % 60)}%` }} />
              ))}
            </div>
            <div className="w-28 border-t border-line-strong pt-1 text-center text-[7px] tracking-wider text-fg-subtle uppercase">Signature</div>
          </div>
          <p className="truncate font-mono text-[10px] tracking-[0.18em] text-fg-muted">{padMrz(mrzName)}</p>
        </div>
      )}
    </div>
  );
}

function AddressPaper({ side }: { side: 'front' | 'back' }) {
  const addressLines = [profile.addressLine1, profile.addressLine2, profile.state, `${profile.country} ${profile.pincode}`].filter(Boolean);

  return (
    <div className="aspect-[1/1.414] w-[21rem] max-w-full overflow-hidden rounded-md bg-[#f7f5ef] p-6 text-[#2a2a2a] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] ring-1 ring-black/10">
      {side === 'front' ? (
        <div className="flex h-full flex-col gap-4 text-[9px]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-[#b8892b] text-white">
                <Icon name="bolt" size={14} />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wide uppercase">Utility Bill</p>
                <p className="text-[#2a2a2a]/55">Monthly statement</p>
              </div>
            </div>
            <span className="rounded bg-[#2a2a2a]/8 px-1.5 py-0.5 font-mono text-[8px] text-[#2a2a2a]/60">Page 1 / 2</span>
          </div>
          <div>
            <p className="text-[7px] font-semibold tracking-wider text-[#2a2a2a]/50 uppercase">Billed to</p>
            <p className="mt-0.5 text-[10px] font-semibold capitalize">
              {profile.firstName} {profile.lastName}
            </p>
            {addressLines.map((line) => (
              <p key={line} className="text-[#2a2a2a]/75">
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 border-y border-[#2a2a2a]/15 py-3">
            {[72, 58, 64, 46].map((width, row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <span className="h-1.5 rounded-full bg-[#2a2a2a]/15" style={{ width: `${width}%` }} />
                <span className="h-1.5 w-8 rounded-full bg-[#2a2a2a]/25" />
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between rounded bg-[#2a2a2a]/6 px-3 py-2">
            <span className="h-1.5 w-16 rounded-full bg-[#2a2a2a]/25" />
            <span className="h-2 w-12 rounded-full bg-[#b8892b]/60" />
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col gap-2.5 text-[9px]">
          <div className="flex justify-end">
            <span className="rounded bg-[#2a2a2a]/8 px-1.5 py-0.5 font-mono text-[8px] text-[#2a2a2a]/60">Page 2 / 2</span>
          </div>
          {[92, 84, 88, 70, 90, 76, 82, 60, 86, 74, 50].map((width, row) => (
            <span key={row} className="h-1.5 rounded-full bg-[#2a2a2a]/12" style={{ width: `${width}%` }} />
          ))}
          <span className="absolute right-4 bottom-6 grid size-20 -rotate-12 place-items-center rounded-full border-2 border-dashed border-[#b8892b]/60 text-center text-[7px] font-bold tracking-wider text-[#b8892b]/80 uppercase">
            Received
          </span>
        </div>
      )}
    </div>
  );
}

function DocumentPreview({ document }: { document: VerificationDocument }) {
  const side = document.id.endsWith('back') ? 'back' : 'front';
  return document.group === 'identity' ? <IdentityCard side={side} /> : <AddressPaper side={side} />;
}

function ToolButton({ icon, label, onClick, disabled = false, iconClassName }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; iconClassName?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-primary/15 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={icon} size={15} className={iconClassName} />
    </button>
  );
}

const VIEWER_SHORTCUTS = [
  { keys: ['←', '→'], label: 'switch' },
  { keys: ['+', '−'], label: 'zoom' },
  { keys: ['R'], label: 'rotate' },
  { keys: ['0'], label: 'reset' },
  { keys: ['Esc'], label: 'close' },
];
const STAGE_CORNERS = ['top-4 left-4 border-t-2 border-l-2', 'top-4 right-4 border-t-2 border-r-2', 'bottom-4 left-4 border-b-2 border-l-2', 'bottom-4 right-4 border-b-2 border-r-2'];

export function DocumentViewer({ documents, index, onIndexChange, onClose }: DocumentViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const isOpen = index !== null;
  const current = isOpen ? documents[index] : undefined;
  const total = documents.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function resetView() {
    setZoom(1);
    setRotation(0);
  }

  function go(step: number) {
    if (index === null || total === 0) return;
    resetView();
    onIndexChange((index + step + total) % total);
  }

  function changeZoom(delta: number) {
    setZoom((value) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value + delta)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => go(-1),
      ArrowRight: () => go(1),
      '+': () => changeZoom(ZOOM_STEP),
      '=': () => changeZoom(ZOOM_STEP),
      '-': () => changeZoom(-ZOOM_STEP),
      r: () => setRotation((value) => value + QUARTER_TURN),
      '0': resetView,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        resetView();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      className="m-auto h-[min(88vh,46rem)] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-3xl border border-line bg-elevated p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-sm"
    >
      {current && index !== null && (
        <div className="flex h-full flex-col md:flex-row">
          <aside className="order-2 flex shrink-0 flex-col gap-3 border-t border-line bg-fg/[0.02] p-3 md:order-1 md:w-60 md:border-t-0 md:border-r">
            <p className="hidden px-1 text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase md:block">Uploaded documents</p>
            <ul className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto">
              {documents.map((document, documentIndex) => {
                const isActive = documentIndex === index;
                const approved = document.status === 'approved';
                return (
                  <li key={document.id} className="shrink-0">
                    <button
                      type="button"
                      aria-current={isActive || undefined}
                      onClick={() => {
                        resetView();
                        onIndexChange(documentIndex);
                      }}
                      className={cx(
                        'relative flex w-full items-center gap-3 rounded-xl border p-2 pr-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                        isActive ? 'border-primary/50 bg-primary/[0.1]' : 'border-transparent hover:bg-hover',
                      )}
                    >
                      <span className={cx('font-mono text-[10px] tabular-nums', isActive ? 'text-primary' : 'text-fg-subtle')}>{String(documentIndex + 1).padStart(2, '0')}</span>
                      <span className="min-w-0">
                        <span className={cx('block truncate text-sm font-medium', isActive ? 'text-fg' : 'text-fg-muted')}>{document.title}</span>
                        <span className={cx('flex items-center gap-1 text-[11px]', approved ? 'text-success' : 'text-warning')}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {documentStatusLabel[document.status]}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <ul className="mt-auto hidden flex-wrap gap-x-3 gap-y-1.5 px-1 text-[10px] text-fg-subtle md:flex">
              {VIEWER_SHORTCUTS.map((shortcut) => (
                <li key={shortcut.label} className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd key={key} className="rounded border border-line-strong bg-surface px-1 font-mono text-[10px] text-fg-muted">
                      {key}
                    </kbd>
                  ))}
                  {shortcut.label}
                </li>
              ))}
            </ul>
          </aside>

          <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col md:order-2">
            <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">{documentGroups[current.group]}</p>
                <h2 id={titleId} className="truncate text-base font-semibold text-fg">
                  {current.title}
                </h2>
              </div>
              <StatusStamp tone={current.status === 'approved' ? 'success' : 'warning'}>{documentStatusLabel[current.status]}</StatusStamp>
              <span className="hidden items-center gap-1 sm:flex" aria-label={`${index + 1} / ${total}`}>
                {documents.map((document, dotIndex) => (
                  <span key={document.id} className={cx('h-1.5 rounded-full transition-[width] duration-300', dotIndex === index ? 'w-4 bg-primary' : 'w-1.5 bg-line-strong')} />
                ))}
              </span>
              <IconButton icon="close" label="Close" onClick={onClose} />
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:28px_28px]">
              {STAGE_CORNERS.map((corner) => (
                <span key={corner} aria-hidden="true" className={cx('pointer-events-none absolute z-10 size-5 rounded-[3px] border-primary/60', corner)} />
              ))}
              <span className="absolute top-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-line bg-surface/85 px-2 py-0.5 text-[10px] font-medium tracking-wide text-fg-muted uppercase backdrop-blur">
                <Icon name="eye" size={11} />
                Sample preview
              </span>

              <div className="absolute inset-0 overflow-auto">
                <div className="grid min-h-full min-w-full place-items-center p-12">
                  <div key={current.id} className="animate-rise motion-reduce:animate-none">
                    <div style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} className="transition-transform duration-300 ease-out motion-reduce:transition-none">
                      <DocumentPreview document={current} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-1/2 right-4 z-10 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-pop backdrop-blur">
                <ToolButton icon="plus" label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => changeZoom(ZOOM_STEP)} />
                <span className="py-1 font-mono text-[10px] text-fg tabular-nums">{Math.round(zoom * 100)}%</span>
                <ToolButton icon="minus" label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => changeZoom(-ZOOM_STEP)} />
                <span aria-hidden="true" className="my-1 h-px w-5 bg-line" />
                <ToolButton icon="refresh" label="Rotate" onClick={() => setRotation((value) => value + QUARTER_TURN)} />
                <ToolButton icon="close" label="Reset view" disabled={zoom === 1 && rotation % 360 === 0} onClick={resetView} iconClassName="rotate-45" />
              </div>
            </div>

            <footer className="flex items-center gap-3 border-t border-line px-4 py-3">
              {total > 1 && (
                <button
                  type="button"
                  aria-label="Previous document"
                  onClick={() => go(-1)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-fg transition-colors hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon name="chevronRight" size={16} className="rotate-180" />
                </button>
              )}
              <p className="min-w-0 flex-1 text-center text-sm text-fg-muted">
                <span className="mr-2 font-mono text-xs text-fg-subtle tabular-nums">
                  {index + 1} / {total}
                </span>
                {current.description}
              </p>
              {total > 1 && (
                <button
                  type="button"
                  aria-label="Next document"
                  onClick={() => go(1)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-fg transition-colors hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon name="chevronRight" size={16} />
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </dialog>
  );
}