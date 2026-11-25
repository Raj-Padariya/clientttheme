'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { ibSettingsCopy as copy, mockIbSetup, mockOfferGroups, moveGroup, type IbSetup, type OfferGroup } from './ibSettingsData';

/*
 * Zenith IB settings as a control desk: a dot-matrix display reads how many groups are on, the broker-set terms sit
 * in one segmented capsule, the groups are a switchboard (order capsule, grip, sliding switch per row), and the client
 * view is a flow tree from the default referral link to each group with a red bead riding the trunk.
 */
const RED = 'var(--zenith-red)';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const PREVIEW_STEP_MS = 1600;
// Flow tree geometry: each branch row is h-14 (56px) with gap-3 (12px) between, below a pt-4 (16px) offset.
const BRANCH_ROW_PX = 56;
const BRANCH_GAP_PX = 12;
const BRANCH_TOP_PX = 16;

// 5×7 dot-matrix glyphs for the on/total display.
const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
};
const BLANK_GLYPH = ['00000', '00000', '00000', '00000', '00000', '00000', '00000'];

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

// Switch knobs start on the opposite side and slide into place after the first paint.
function useSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return settled;
}

/* ───────────── Dot-matrix display: "on/total" drawn in pixels ───────────── */

function MatrixCount({ on, total }: { on: number; total: number }) {
  const onLength = String(on).length;
  const chars = `${on}/${total}`.split('');

  return (
    <span aria-hidden="true" className="relative flex gap-2.5 overflow-hidden py-1">
      {chars.map((char, charIndex) => {
        const isOnPart = charIndex < onLength;
        const rows = GLYPHS[char] ?? BLANK_GLYPH;
        return (
          <span key={charIndex} className="grid grid-cols-5 gap-[3px]">
            {rows.flatMap((row, rowIndex) =>
              row.split('').map((bit, colIndex) => {
                const isLit = bit === '1';
                const delay = charIndex * 140 + (rowIndex + colIndex) * 22;
                return (
                  <span
                    key={`${rowIndex}-${colIndex}`}
                    style={isLit ? { animationDelay: `${delay}ms`, background: isOnPart ? RED : undefined } : undefined}
                    className={cx('size-[7px] rounded-[2px] sm:size-2', isLit ? cx('zenith-pixel', !isOnPart && 'bg-fg') : 'bg-fg/[0.07]')}
                  />
                );
              }),
            )}
          </span>
        );
      })}
      {/* A light bar keeps scanning the display. */}
      <span className="zenith-scan-x pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-app/70 to-transparent" />
    </span>
  );
}

/* ───────────── Setup capsule: broker-set terms in one segmented capsule ───────────── */

function SetupCapsule({ setup }: { setup: IbSetup }) {
  const segments: { label: string; value: string; hint?: string; status?: string }[] = [
    { label: copy.plan, value: setup.planName },
    { label: copy.smallestPayout, value: formatMoney(setup.smallestPayout, setup.currency), hint: copy.smallestPayoutHint },
    { label: copy.wallet, value: setup.currency, status: setup.walletStatus },
  ];

  return (
    <section aria-label={copy.setupTitle} style={{ animationDelay: '90ms' }} className="zenith-tile relative overflow-hidden rounded-[28px] bg-fg/[0.02] ring-1 ring-line lg:rounded-full">
      <span aria-hidden="true" className="zenith-scan-x pointer-events-none absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-fg/[0.12] to-transparent" />
      <div className="relative grid divide-y divide-dashed divide-line-strong lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] lg:divide-x lg:divide-y-0">
        <div className="flex items-center gap-3 p-4 lg:py-3 lg:pr-6 lg:pl-3">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center rounded-full bg-fg text-app">
            <Icon name="lock" size={16} />
            <span style={{ background: RED }} className="absolute -top-0.5 -right-0.5 size-3 rounded-[3px] ring-2 ring-app" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-[-0.02em] text-fg">{copy.setupTitle}</h2>
            <p className="text-xs leading-snug text-fg-muted">{copy.setupBody}</p>
          </div>
        </div>
        {segments.map((segment, index) => (
          <div key={segment.label} style={stagger(index, 90, 200)} className="zenith-tile flex min-w-0 flex-col justify-center gap-1 px-5 py-4 lg:px-6">
            <span className={cx(captionClass, 'truncate text-fg-subtle')}>{segment.label}</span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-2xl leading-none font-black tracking-tighter text-fg tabular-nums">{segment.value}</span>
              {segment.status && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-0.5 text-[10.5px] font-bold text-success ring-1 ring-success/30">
                  <span aria-hidden="true" className="zenith-blink size-1.5 rounded-[2px] bg-current" />
                  {segment.status}
                </span>
              )}
            </span>
            {segment.hint && <span className="text-[11px] text-fg-subtle">{segment.hint}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Switch: the visible Remove / Add back action ───────────── */

function SwitchAction({ isOn, label, onClick }: { isOn: boolean; label: string; onClick: () => void }) {
  const settled = useSettled();
  const knobOn = settled ? isOn : !isOn;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group/switch inline-flex h-10 shrink-0 items-center gap-3 rounded-full py-1 pr-1 pl-4 text-xs font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        isOn ? 'text-danger hover:bg-danger/10' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg',
      )}
    >
      {label}
      <span aria-hidden="true" className={cx('relative h-8 w-14 shrink-0 rounded-full transition-colors duration-500', isOn ? 'bg-fg' : 'border-2 border-dashed border-fg/30')}>
        <span
          style={knobOn ? { background: RED } : undefined}
          className={cx(
            'absolute top-1/2 left-1 size-6 -translate-y-1/2 rounded-full transition-transform duration-500 ease-out group-hover/switch:scale-110 motion-reduce:transition-none',
            knobOn ? 'translate-x-6' : 'bg-fg/30',
          )}
        />
      </span>
    </button>
  );
}

/* ───────────── Switchboard rows ───────────── */

function OfferedRow({ group, index, isDragging, onMove, onRemove, onDragStart, onDragEnd, onDrop }: {
  group: OfferGroup;
  index: number;
  isDragging: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const isFirst = index === 0;

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      onMove(index - 1);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      onMove(index + 1);
    }
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={stagger(index, 80, 150)}
      className={cx(
        'group zenith-tile relative grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 overflow-hidden px-4 py-3 transition-[background-color,opacity] duration-300 hover:bg-fg/[0.03] sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:px-5',
        isDragging && 'opacity-40',
      )}
    >
      {isFirst && (
        <span
          aria-hidden="true"
          style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--zenith-red) 16%, transparent), transparent)' }}
          className="zenith-scan-x pointer-events-none absolute inset-y-0 w-40"
        />
      )}
      <span
        key={index}
        style={isFirst ? { background: RED } : undefined}
        className={cx(
          'relative grid h-14 w-11 animate-dot-pop place-items-center rounded-full font-mono text-sm font-black tabular-nums motion-reduce:animate-none',
          isFirst ? 'text-white' : 'bg-fg text-app',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <button
        type="button"
        aria-label={copy.moveGroup(group.name)}
        onKeyDown={handleKey}
        className="relative grid size-10 cursor-grab place-items-center rounded-full text-fg-subtle ring-1 ring-line transition-[color,background-color,rotate] duration-300 hover:-rotate-12 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing motion-reduce:transition-none"
      >
        <Icon name="arrowsUpDown" size={14} />
      </button>
      <span className="relative min-w-0">
        <span className="block truncate text-lg font-black tracking-[-0.02em] text-fg">{group.name}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
          {isFirst && <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 shrink-0 rounded-[2px]" />}
          {isFirst ? copy.shownFirst : copy.canPick}
        </span>
      </span>
      <span className="relative col-span-full justify-self-end sm:col-auto">
        <SwitchAction isOn label={copy.remove} onClick={onRemove} />
      </span>
    </li>
  );
}

function ParkedRow({ group, index, onAdd }: { group: OfferGroup; index: number; onAdd: () => void }) {
  return (
    <li style={stagger(index, 80, 150)} className="zenith-tile grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5">
      <span aria-hidden="true" className="grid h-14 w-11 place-items-center rounded-full border-2 border-dashed border-fg/25 text-fg-subtle">
        <Icon name="plus" size={14} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black tracking-[-0.02em] text-fg-muted">{group.name}</span>
        <span className="block truncate text-xs text-fg-subtle">{copy.offOffer}</span>
      </span>
      <span className="col-span-full justify-self-end sm:col-auto">
        <SwitchAction isOn={false} label={copy.addBack(group.name)} onClick={onAdd} />
      </span>
    </li>
  );
}

/* ───────────── Groups switchboard ───────────── */

function GroupsBoard({ planName, offered, parked, isDirty, onChange, onUndo, onSave }: {
  planName: string;
  offered: OfferGroup[];
  parked: OfferGroup[];
  isDirty: boolean;
  onChange: (nextOffered: OfferGroup[], nextParked: OfferGroup[]) => void;
  onUndo: () => void;
  onSave: () => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    onChange(moveGroup(offered, from, to), parked);
  }

  function remove(name: string) {
    const group = offered.find((item) => item.name === name);
    if (!group) return;
    onChange(
      offered.filter((item) => item.name !== name),
      [...parked, { ...group, isOffered: false }],
    );
  }

  function addBack(name: string) {
    const group = parked.find((item) => item.name === name);
    if (!group) return;
    onChange(
      [...offered, { ...group, isOffered: true }],
      parked.filter((item) => item.name !== name),
    );
  }

  return (
    <section style={{ animationDelay: '120ms' }} className="zenith-tile flex min-w-0 flex-col gap-4">
      <div className="min-w-0">
        <p className={cx(captionClass, 'text-fg-subtle')}>{copy.plan}</p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-fg">{copy.groupsTitle(planName)}</h2>
        <p className="mt-1 max-w-xl text-sm text-fg-muted">{copy.groupsBody}</p>
      </div>

      <div className="overflow-hidden rounded-[32px] bg-fg/[0.02] ring-1 ring-line">
        <ol className="divide-y divide-dashed divide-line-strong">
          {offered.map((group, index) => (
            <OfferedRow
              key={group.name}
              group={group}
              index={index}
              isDragging={dragIndex === index}
              onMove={(to) => move(index, to)}
              onRemove={() => remove(group.name)}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
              }}
            />
          ))}
        </ol>

        <div className="border-t-2 border-dashed border-line-strong bg-fg/[0.02]">
          {parked.length === 0 ? (
            <p className="flex items-center gap-2.5 px-5 py-4 text-sm text-fg-muted">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-success/12 text-success ring-1 ring-success/30">
                <Icon name="checkCircle" size={13} />
              </span>
              {copy.allOnOffer}
            </p>
          ) : (
            <>
              <p className={cx(captionClass, 'px-5 pt-4 text-fg-subtle')}>{copy.offOffer}</p>
              <ul className="divide-y divide-dashed divide-line">
                {parked.map((group, index) => (
                  <ParkedRow key={group.name} group={group} index={index} onAdd={() => addBack(group.name)} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex min-w-0 items-start gap-3 text-sm text-fg-muted">
          <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-fg text-app">
            <Icon name="megaphone" size={12} />
          </span>
          <span>
            {copy.notePrefix}
            <span className="font-black text-fg underline decoration-dotted decoration-2 underline-offset-4">{copy.noteLink}</span>
            {copy.noteSuffix}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!isDirty}
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-fg ring-1 ring-line transition-[box-shadow,opacity] hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
          >
            <Icon name="refresh" size={14} />
            {copy.undo}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty}
            className="relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full py-1 pr-1 pl-5 text-sm font-bold text-white transition-[translate,opacity] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
            style={{ background: RED }}
          >
            {isDirty && <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/35" />}
            <span className="relative">{copy.save}</span>
            <span className="relative grid size-9 place-items-center rounded-full bg-white/20">
              <Icon name="check" size={13} />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Flow tree: default referral link → the groups clients pick from ───────────── */

function usePreviewCursor(count: number) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % count), PREVIEW_STEP_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  return count === 0 ? 0 : active % count;
}

function FlowPreview({ offered, total }: { offered: OfferGroup[]; total: number }) {
  const active = usePreviewCursor(offered.length);
  const beadTop = BRANCH_TOP_PX + active * (BRANCH_ROW_PX + BRANCH_GAP_PX) + BRANCH_ROW_PX / 2;

  return (
    <section aria-label={copy.canPick} style={{ animationDelay: '180ms' }} className="zenith-tile rounded-[32px] border border-dashed border-line-strong p-5 sm:p-6">
      <p className={cx(captionClass, 'flex items-center justify-between gap-3 text-fg-subtle')}>
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon name="eye" size={13} />
          <span className="truncate">{copy.canPick}</span>
        </span>
        <span key={offered.length} className="shrink-0 animate-dot-pop font-mono text-fg tabular-nums motion-reduce:animate-none">
          {copy.groupsOn(offered.length, total)}
        </span>
      </p>

      <span className="mt-5 flex h-12 items-center gap-2.5 rounded-full bg-fg py-1 pr-4 pl-1 font-mono text-xs text-app">
        <span style={{ background: RED }} className="relative grid size-10 shrink-0 place-items-center rounded-full text-white">
          <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full opacity-50 motion-reduce:hidden" />
          <Icon name="lock" size={13} className="relative" />
        </span>
        <span className="truncate">{copy.noteLink}</span>
      </span>

      {offered.length === 0 ? (
        <span aria-hidden="true" className="relative mx-auto mt-8 mb-2 grid size-16 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span style={{ background: RED }} className="size-2.5 rounded-[3px]" />
        </span>
      ) : (
        <div className="relative">
          <span aria-hidden="true" style={{ bottom: BRANCH_ROW_PX / 2 }} className="absolute top-0 left-[24px] border-l-2 border-dashed border-line-strong" />
          <span
            aria-hidden="true"
            style={{ background: RED, top: beadTop }}
            className="absolute left-[25px] z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-[3px] ring-2 ring-app transition-[top] duration-500 ease-out motion-reduce:transition-none"
          />
          <ol className="flex flex-col gap-3 pt-4 pl-[25px]">
            {offered.map((group, index) => {
              const isActive = index === active;
              return (
                <li key={group.name} style={stagger(index, 90, 250)} className="zenith-tile flex h-14 items-center">
                  <svg viewBox="0 0 28 4" aria-hidden="true" className="h-1 w-7 shrink-0 overflow-visible">
                    <line
                      x1="0"
                      y1="2"
                      x2="28"
                      y2="2"
                      strokeWidth="2"
                      strokeDasharray={isActive ? '6 8' : '2 4'}
                      style={isActive ? { stroke: RED } : { stroke: 'currentColor' }}
                      className={isActive ? 'zenith-flow' : 'text-fg/25'}
                    />
                  </svg>
                  <span
                    className={cx(
                      'flex h-full min-w-0 flex-1 items-center gap-3 rounded-[18px] px-3 transition-[background-color,color,translate] duration-500 motion-reduce:transition-none',
                      isActive ? 'translate-x-1 bg-fg text-app' : 'text-fg ring-1 ring-line',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{group.name}</span>
                      {index === 0 && <span className={cx('block truncate text-[10.5px]', isActive ? 'text-app/60' : 'text-fg-subtle')}>{copy.shownFirst}</span>}
                    </span>
                    <span aria-hidden="true" className={cx('grid size-5 shrink-0 place-items-center rounded-full ring-2', isActive ? 'ring-app' : 'ring-fg/25')}>
                      {isActive && <span style={{ background: RED }} className="size-2.5 animate-dot-pop rounded-full motion-reduce:animate-none" />}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export default function IbSettingsPage() {
  const setup = mockIbSetup;
  const [groups, setGroups] = useState<OfferGroup[]>(mockOfferGroups);
  const [savedGroups, setSavedGroups] = useState<OfferGroup[]>(mockOfferGroups);

  const offered = groups.filter((group) => group.isOffered);
  const parked = groups.filter((group) => !group.isOffered);
  const isDirty = JSON.stringify(groups) !== JSON.stringify(savedGroups);

  // Offered groups always come first, in the order the clients will see them.
  function changeGroups(nextOffered: OfferGroup[], nextParked: OfferGroup[]) {
    setGroups([...nextOffered, ...nextParked]);
  }

  function save() {
    setSavedGroups(groups);
    toast(copy.saved);
  }

  return (
    <div className="space-y-6">
      <header className="zenith-tile grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="text-5xl leading-[0.9] font-black tracking-[-0.05em] text-fg sm:text-6xl">{copy.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
        </div>
        <div className="flex flex-col gap-2.5 self-start rounded-[28px] bg-fg/[0.02] px-5 py-4 ring-1 ring-line lg:items-end">
          <MatrixCount key={`${offered.length}-${groups.length}`} on={offered.length} total={groups.length} />
          <span className={cx(captionClass, 'flex items-center gap-2 text-fg-subtle')}>
            <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
            {copy.groupsOn(offered.length, groups.length)}
          </span>
        </div>
      </header>

      <SetupCapsule setup={setup} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <GroupsBoard
          planName={setup.planName}
          offered={offered}
          parked={parked}
          isDirty={isDirty}
          onChange={changeGroups}
          onUndo={() => setGroups(savedGroups)}
          onSave={save}
        />
        <aside className="min-w-0 xl:sticky xl:top-24">
          <FlowPreview offered={offered} total={groups.length} />
        </aside>
      </div>
    </div>
  );
}
