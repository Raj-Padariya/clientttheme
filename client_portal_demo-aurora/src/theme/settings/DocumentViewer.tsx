'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';

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
    <div className="orbit-card aspect-[1.586] w-[26rem] max-w-full overflow-hidden rounded-[22px]! bg-linear-to-br from-surface via-surface-2 to-surface p-5 text-fg shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]">
      {side === 'front' ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <p className="text-[8px] font-bold tracking-[0.25em] text-fg-muted uppercase">Republic of {profile.country}</p>
              <p className="text-[11px] font-bold tracking-wider uppercase">National Identity Card</p>
            </div>
            <span className="nova-gloss grid size-8 place-items-center rounded-full text-fg">
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
      className="grid size-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white hover:text-[#0a1220] focus-visible:outline-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={icon} size={15} className={iconClassName} />
    </button>
  );
}

function StepBead({ label, onClick, flip }: { label: string; onClick: () => void; flip?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group grid size-11 shrink-0 place-items-center rounded-lg bg-(--hero-buy) text-[#062520] transition-[scale,background-color] duration-300 hover:scale-105 hover:bg-(--aurora-cta-from) focus-visible:outline-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
    >
      <Icon name="chevronRight" size={16} className={cx('transition-transform duration-300', flip ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5')} />
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
      className="m-auto h-[min(90vh,48rem)] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-[32px] bg-elevated p-0 text-fg shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] ring-1 ring-line-strong backdrop:bg-overlay backdrop:backdrop-blur-sm"
    >
      {current && index !== null && (
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-3 px-5 pt-5 pb-4">
            <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
<span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-[2px] bg-(--aurora-cta-from)" />
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
                <Icon name="fileText" size={15} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{documentGroups[current.group]}</p>
              <h2 id={titleId} className="truncate text-xl font-black tracking-tight text-fg">
                {current.title}
              </h2>
            </div>
            <StatusStamp tone={current.status === 'approved' ? 'success' : 'warning'}>{documentStatusLabel[current.status]}</StatusStamp>
            <span className="hidden rounded-full bg-fg px-2.5 py-1 font-mono text-[11px] font-bold text-app tabular-nums sm:inline" aria-label={`${index + 1} / ${total}`}>
              {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="group grid size-9 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[background-color,color,box-shadow] duration-300 hover:bg-[var(--zenith-red)] hover:text-white hover:ring-[var(--zenith-red)] focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="close" size={15} className="transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </header>

          <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-[26px] bg-fg/[0.02] bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:18px_18px] ring-1 ring-line">
            <span className="absolute top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-fg py-1 pr-3 pl-1 text-[10px] font-semibold tracking-wide text-app uppercase">
              <span className="grid size-5 place-items-center rounded-full bg-[var(--zenith-red)] text-white">
                <Icon name="eye" size={10} />
              </span>
              Sample preview
            </span>

            <div className="absolute inset-0 overflow-auto">
              <div className="grid min-h-full min-w-full place-items-center px-12 pt-14 pb-20">
                <div key={current.id} className="animate-rise motion-reduce:animate-none">
                  <div style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} className="transition-transform duration-300 ease-out motion-reduce:transition-none">
                    <DocumentPreview document={current} />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[#0b0b0c]/92 p-1 shadow-[0_16px_30px_-16px_rgb(0_0_0/0.9)] ring-1 ring-white/10 backdrop-blur">
              <ToolButton icon="minus" label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => changeZoom(-ZOOM_STEP)} />
              <span className="w-12 text-center font-mono text-[11px] font-bold text-white tabular-nums">{Math.round(zoom * 100)}%</span>
              <ToolButton icon="plus" label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => changeZoom(ZOOM_STEP)} />
              <span aria-hidden="true" className="mx-1 h-5 w-0.5 rounded-full bg-[var(--zenith-red)]" />
              <ToolButton icon="refresh" label="Rotate" onClick={() => setRotation((value) => value + QUARTER_TURN)} />
              <ToolButton icon="close" label="Reset view" disabled={zoom === 1 && rotation % 360 === 0} onClick={resetView} iconClassName="rotate-45" />
            </div>
          </div>

          <footer className="flex flex-col gap-3 px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              {total > 1 && <StepBead label="Previous document" onClick={() => go(-1)} flip />}
              <div className="min-w-0 flex-1">
                <p className="hidden px-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase md:block">Uploaded documents</p>
                <ul className="flex gap-2 overflow-x-auto pb-1">
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
                            'flex items-center gap-2.5 rounded-full py-1 pr-3.5 pl-1 text-left transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                            isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                          )}
                        >
                          <span className={cx('grid size-8 shrink-0 place-items-center rounded-full font-mono text-[10px] font-black tabular-nums', isActive ? 'bg-[var(--zenith-red)] text-white' : 'bg-fg/10 text-fg')}>
                            {String(documentIndex + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[11rem] truncate text-xs font-semibold">{document.title}</span>
                            <span className={cx('flex items-center gap-1 text-[10px] font-semibold', approved ? 'text-success' : 'text-warning')}>
                              <span className="size-1.5 rounded-[2px] bg-current" />
                              {documentStatusLabel[document.status]}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {total > 1 && <StepBead label="Next document" onClick={() => go(1)} />}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
              <p className="min-w-0 flex-1 text-sm text-fg-muted">
                <span className="mr-2 font-mono text-xs text-fg-subtle tabular-nums">
                  {index + 1} / {total}
                </span>
                {current.description}
              </p>
              <ul className="hidden flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-fg-subtle md:flex">
                {VIEWER_SHORTCUTS.map((shortcut) => (
                  <li key={shortcut.label} className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd key={key} className="grid h-5 min-w-5 place-items-center rounded-[6px] bg-fg/[0.06] px-1.5 font-mono text-[10px] text-fg ring-1 ring-line-strong">
                        {key}
                      </kbd>
                    ))}
                    {shortcut.label}
                  </li>
                ))}
              </ul>
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
}