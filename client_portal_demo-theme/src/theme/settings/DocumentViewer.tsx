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
    <div className="aspect-[1.586] w-[26rem] max-w-full overflow-hidden rounded-2xl bg-linear-to-br from-[#eef2f7] via-[#dfe6ef] to-[#c9d3df] p-5 text-[#1b2533] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] ring-1 ring-black/10">
      {side === 'front' ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#1b2533]/15 pb-2">
            <div>
              <p className="text-[8px] font-bold tracking-[0.25em] text-[#1b2533]/60 uppercase">Republic of {profile.country}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase">National Identity Card</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-[#b8892b]/20 text-[#8a6418]">
              <Icon name="kyc" size={16} />
            </span>
          </div>
          <div className="mt-3 flex flex-1 gap-4">
            <span className="grid h-24 w-20 shrink-0 place-items-center rounded-md bg-[#1b2533]/10 text-[#1b2533]/40 ring-1 ring-[#1b2533]/10">
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
                  <dt className="text-[7px] font-semibold tracking-wider text-[#1b2533]/50 uppercase">{label}</dt>
                  <dd className="font-semibold capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-2 truncate font-mono text-[10px] tracking-[0.18em] text-[#1b2533]/70">{padMrz(`IDAGO${mrzName}`)}</p>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between">
          <span className="-mx-5 h-9 bg-[#1b2533]/85" />
          <div className="flex items-end justify-between gap-4">
            <div className="flex h-10 flex-1 items-end gap-[2px]">
              {Array.from({ length: 38 }, (_, bar) => (
                <span key={bar} className="w-[2px] bg-[#1b2533]/70" style={{ height: `${40 + ((bar * 37) % 60)}%` }} />
              ))}
            </div>
            <div className="w-28 border-t border-[#1b2533]/40 pt-1 text-center text-[7px] tracking-wider text-[#1b2533]/50 uppercase">Signature</div>
          </div>
          <p className="truncate font-mono text-[10px] tracking-[0.18em] text-[#1b2533]/70">{padMrz(mrzName)}</p>
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
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={icon} size={15} className={iconClassName} />
    </button>
  );
}

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
      className="m-auto h-[min(88vh,46rem)] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl border border-line bg-elevated p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-sm"
    >
      {current && index !== null && (
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon name="fileText" size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-base font-semibold text-fg">
                {current.title}
              </h2>
              <p className="truncate text-xs text-fg-muted">{documentGroups[current.group]}</p>
            </div>
            <span className="hidden rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs text-fg-muted tabular-nums ring-1 ring-line sm:inline">
              {index + 1} / {total}
            </span>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </header>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle,var(--color-line)_1px,transparent_1px)] [background-size:18px_18px]">
              <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1 text-[10px] font-medium tracking-wide text-fg-muted uppercase ring-1 ring-line backdrop-blur">
                <Icon name="eye" size={11} />
                Sample preview
              </span>

              <div className="absolute inset-0 overflow-auto">
                <div className="grid min-h-full min-w-full place-items-center p-10">
                  <div key={current.id} className="animate-rise motion-reduce:animate-none">
                    <div
                      style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                      className="transition-transform duration-300 ease-out motion-reduce:transition-none"
                    >
                      <DocumentPreview document={current} />
                    </div>
                  </div>
                </div>
              </div>

              {total > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous document"
                    onClick={() => go(-1)}
                    className="absolute top-1/2 left-3 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-fg shadow-card ring-1 ring-line backdrop-blur transition-[transform,background-color] hover:scale-105 hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Icon name="chevronRight" size={18} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next document"
                    onClick={() => go(1)}
                    className="absolute top-1/2 right-3 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-fg shadow-card ring-1 ring-line backdrop-blur transition-[transform,background-color] hover:scale-105 hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Icon name="chevronRight" size={18} />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-surface/90 p-1 shadow-pop ring-1 ring-line backdrop-blur">
                <ToolButton icon="minus" label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => changeZoom(-ZOOM_STEP)} />
                <span className="w-12 text-center font-mono text-xs text-fg tabular-nums">{Math.round(zoom * 100)}%</span>
                <ToolButton icon="plus" label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => changeZoom(ZOOM_STEP)} />
                <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
                <ToolButton icon="refresh" label="Rotate" onClick={() => setRotation((value) => value + QUARTER_TURN)} />
                <ToolButton icon="close" label="Reset view" disabled={zoom === 1 && rotation % 360 === 0} onClick={resetView} iconClassName="rotate-45" />
              </div>
            </div>

            <aside className="flex shrink-0 flex-col gap-4 border-t border-line p-4 md:w-72 md:border-t-0 md:border-l">
              <div className="flex flex-col gap-2">
                <StatusStamp tone={current.status === 'approved' ? 'success' : 'warning'}>{documentStatusLabel[current.status]}</StatusStamp>
                <p className="text-sm text-fg-muted">{current.description}</p>
              </div>

              <div className="flex min-h-0 flex-col gap-2">
                <p className="text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">Uploaded documents</p>
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
                            'relative flex w-full items-center gap-3 rounded-xl p-2 pr-3 text-left ring-1 transition-[background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-ring',
                            isActive ? 'bg-primary-soft ring-primary/50' : 'ring-line hover:bg-hover',
                          )}
                        >
                          <span
                            className={cx(
                              'relative grid h-11 w-9 shrink-0 place-items-center rounded-md ring-1',
                              isActive ? 'bg-primary text-on-primary ring-primary' : 'bg-surface-2 text-fg-subtle ring-line',
                            )}
                          >
                            <Icon name="fileText" size={15} />
                            <span
                              className={cx(
                                'absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full text-white ring-2 ring-elevated',
                                approved ? 'bg-success' : 'bg-warning',
                              )}
                            >
                              <Icon name={approved ? 'check' : 'clock'} size={9} />
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className={cx('block truncate text-sm font-medium', isActive ? 'text-primary' : 'text-fg')}>{document.title}</span>
                            <span className="block truncate text-[11px] text-fg-subtle">{documentStatusLabel[document.status]}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="mt-auto hidden text-[11px] leading-relaxed text-fg-subtle md:block">
                ← → switch · + − zoom · R rotate · 0 reset · Esc close
              </p>
            </aside>
          </div>
        </div>
      )}
    </dialog>
  );
}
