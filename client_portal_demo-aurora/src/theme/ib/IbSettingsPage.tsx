'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { ibSettingsCopy as copy, mockIbSetup, mockOfferGroups, moveGroup, type IbSetup, type OfferGroup } from './ibSettingsData';
import './ibSettings.css';

/*
 * Aurora IB settings — "listing desk": a session gauge lights one segment per group on offer, the broker-set terms are a
 * stamped confirmation slip with dotted leaders, the offered groups are a priority queue (position numeral, a depth bar
 * that shortens down the queue, a sliding switch), and the client view is a quote board whose active tile flashes as a
 * cursor walks through the groups in the order clients see them.
 */
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const cardClass = 'relative overflow-hidden rounded-[26px] bg-surface ring-1 ring-line';
const PREVIEW_STEP_MS = 1600;

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

function Shine() {
  return (
    <span aria-hidden="true" className="st-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent" />
  );
}

/* ───────────── Hero: title + a session gauge, one segment per group ───────────── */

function SessionGauge({ on, total }: { on: number; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex items-end gap-1.5">
        <span key={on} className="st-pop font-display text-6xl leading-none font-black tracking-[-0.04em] text-primary tabular-nums">
          {on}
        </span>
        <span className="pb-1.5 font-mono text-xl font-bold text-fg-subtle tabular-nums">/{total}</span>
      </div>
      <span aria-hidden="true" className="relative flex h-3 gap-1 overflow-hidden rounded-full">
        {Array.from({ length: total }, (_, segment) => (
          <span
            key={`${segment}-${segment < on}`}
            style={stagger(segment, 90, 200)}
            className={cx('st-segment h-full flex-1 rounded-full', segment < on ? 'bg-primary' : 'bg-fg/[0.08]')}
          />
        ))}
        <span className="st-sweep pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/50 to-transparent" />
      </span>
      <span className={cx(captionClass, 'text-fg-subtle')}>{copy.groupsOn(on, total)}</span>
    </div>
  );
}

/* ───────────── Terms slip: broker-set terms with dotted leaders and a lock stamp ───────────── */

function TermsSlip({ setup }: { setup: IbSetup }) {
  const rows: { label: string; value: string; hint?: string; status?: string }[] = [
    { label: copy.plan, value: setup.planName },
    { label: copy.smallestPayout, value: formatMoney(setup.smallestPayout, setup.currency), hint: copy.smallestPayoutHint },
    { label: copy.wallet, value: setup.currency, status: setup.walletStatus },
  ];

  return (
    <section aria-label={copy.setupTitle} style={stagger(1, 0, 90)} className={cx(cardClass, 'st-rise flex flex-col')}>
      <div className="flex items-start gap-3 border-b border-dashed border-line-strong p-5">
        <span aria-hidden="true" className="st-stamp grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent/15 text-accent ring-1 ring-accent/30">
          <Icon name="lock" size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-fg">{copy.setupTitle}</h2>
          <p className="text-xs leading-snug text-fg-muted">{copy.setupBody}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-4 p-5">
        {rows.map((row, index) => (
          <li key={row.label} style={stagger(index, 90, 260)} className="st-rise">
            <span className="flex items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold text-fg-muted">{row.label}</span>
              <span aria-hidden="true" className="min-w-4 flex-1 border-b-2 border-dotted border-line-strong" />
              <span className="flex shrink-0 items-center gap-2 font-mono text-sm font-black text-fg tabular-nums">
                {row.status && (
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-success/10 px-1.5 py-0.5 font-sans text-[10.5px] font-bold text-success ring-1 ring-success/30">
                    <span aria-hidden="true" className="st-blink size-1.5 rounded-full bg-current" />
                    {row.status}
                  </span>
                )}
                {row.value}
              </span>
            </span>
            {row.hint && <span className="mt-1 block text-[11px] text-fg-subtle">{row.hint}</span>}
          </li>
        ))}
      </ul>
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
        'group/switch inline-flex h-10 shrink-0 items-center gap-3 rounded-[12px] py-1 pr-1 pl-3.5 text-xs font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        isOn ? 'text-danger hover:bg-danger/10' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg',
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cx('relative h-8 w-14 shrink-0 rounded-[10px] transition-colors duration-500', isOn ? 'bg-primary/20 ring-1 ring-primary/50' : 'border-2 border-dashed border-fg/30')}
      >
        <span
          className={cx(
            'absolute top-1/2 left-1 size-6 -translate-y-1/2 rounded-[8px] transition-[translate,background-color] duration-500 ease-out group-hover/switch:scale-110 motion-reduce:transition-none',
            knobOn ? 'translate-x-6 bg-primary' : 'bg-fg/30',
          )}
        />
      </span>
    </button>
  );
}

/* ───────────── Priority queue rows ───────────── */

function QueueRow({ group, index, count, isDragging, onMove, onRemove, onDragStart, onDragEnd, onDrop }: {
  group: OfferGroup;
  index: number;
  count: number;
  isDragging: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const isFirst = index === 0;
  // Depth shortens down the queue: the first group gets the full bar.
  const depth = ((count - index) / count) * 100;

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
        'st-rise relative grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-4 transition-[background-color,opacity] duration-300 hover:bg-fg/[0.02] sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:px-5',
        isDragging && 'opacity-40',
      )}
    >
      <span
        key={index}
        className={cx('st-pop w-12 text-center font-display text-4xl leading-none font-black tabular-nums', isFirst ? 'text-primary' : 'text-fg-subtle')}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <button
        type="button"
        aria-label={copy.moveGroup(group.name)}
        onKeyDown={handleKey}
        className="grid size-10 cursor-grab place-items-center rounded-[12px] text-fg-subtle ring-1 ring-line transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        <Icon name="arrowsUpDown" size={14} />
      </button>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black tracking-[-0.02em] text-fg">{group.name}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
          {isFirst && <span aria-hidden="true" className="st-blink size-1.5 shrink-0 rounded-full bg-primary" />}
          {isFirst ? copy.shownFirst : copy.canPick}
        </span>
        <span aria-hidden="true" className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
          <span
            style={{ width: `${depth}%` }}
            className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none', isFirst ? 'bg-primary' : 'bg-primary/45')}
          />
          {isFirst && <span className="st-sweep absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/60 to-transparent" />}
        </span>
      </span>
      <span className="col-span-full justify-self-end sm:col-auto">
        <SwitchAction isOn label={copy.remove} onClick={onRemove} />
      </span>
    </li>
  );
}

function ParkedRow({ group, index, onAdd }: { group: OfferGroup; index: number; onAdd: () => void }) {
  return (
    <li style={stagger(index, 80, 150)} className="st-rise grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5">
      <span aria-hidden="true" className="grid h-11 w-12 place-items-center rounded-[12px] border-2 border-dashed border-fg/25 text-fg-subtle">
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

/* ───────────── Groups queue ───────────── */

function GroupsQueue({ planName, offered, parked, isDirty, onChange, onUndo, onSave }: {
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
    <section style={stagger(2, 0, 120)} className={cx(cardClass, 'st-rise flex min-w-0 flex-col')}>
      <div className="border-b border-line p-5 sm:p-6">
        <p className={cx(captionClass, 'text-fg-subtle')}>{copy.plan}</p>
        <h2 className="mt-1 font-display text-2xl font-black tracking-[-0.03em] text-fg">{copy.groupsTitle(planName)}</h2>
        <p className="mt-1 max-w-xl text-sm text-fg-muted">{copy.groupsBody}</p>
      </div>

      <ol className="divide-y divide-dashed divide-line">
        {offered.map((group, index) => (
          <QueueRow
            key={group.name}
            group={group}
            index={index}
            count={offered.length}
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
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-success/12 text-success ring-1 ring-success/30">
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

      <div className="flex flex-col gap-4 border-t border-line p-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex min-w-0 items-start gap-3 text-sm text-fg-muted">
          <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[9px] bg-primary/15 text-primary">
            <Icon name="megaphone" size={12} />
          </span>
          <span>
            {copy.notePrefix}
            <span className="font-black text-fg underline decoration-primary decoration-dotted decoration-2 underline-offset-4">{copy.noteLink}</span>
            {copy.noteSuffix}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!isDirty}
            className="inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-bold text-fg ring-1 ring-line-strong transition-[background-color,opacity] hover:bg-fg/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
          >
            <Icon name="refresh" size={14} />
            {copy.undo}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty}
            className="relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-[14px] bg-primary px-4 text-sm font-bold text-on-primary transition-[translate,opacity,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
          >
            {isDirty && <Shine />}
            <Icon name="check" size={14} className="relative" />
            <span className="relative">{copy.save}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Client quote board: the groups a client picks from, cursor walking in order ───────────── */

// Walks through the groups on its own until a group is picked; the pick is held by name so it survives reordering.
function usePreviewCursor(groups: OfferGroup[]) {
  const [step, setStep] = useState(0);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const count = groups.length;
  const pickedIndex = pickedName === null ? -1 : groups.findIndex((group) => group.name === pickedName);
  const isPicked = pickedIndex !== -1;

  useEffect(() => {
    if (isPicked || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % count), PREVIEW_STEP_MS);
    return () => window.clearInterval(timer);
  }, [count, isPicked]);

  // Picking the held group again lets the cursor walk again.
  function togglePick(name: string) {
    if (pickedName === name) {
      setStep(pickedIndex);
      setPickedName(null);
      return;
    }
    setPickedName(name);
  }

  const active = isPicked ? pickedIndex : count === 0 ? 0 : step % count;
  return { active, pickedIndex, togglePick };
}

function ClientBoard({ offered, total }: { offered: OfferGroup[]; total: number }) {
  const { active, pickedIndex, togglePick } = usePreviewCursor(offered);

  return (
    <section aria-label={copy.canPick} style={stagger(3, 0, 180)} className={cx(cardClass, 'st-rise flex flex-col')}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <span className={cx(captionClass, 'inline-flex min-w-0 items-center gap-2 text-fg-subtle')}>
          <Icon name="eye" size={13} />
          <span className="truncate">{copy.canPick}</span>
        </span>
        <span key={offered.length} className="st-pop shrink-0 font-mono text-xs font-bold text-fg tabular-nums">
          {copy.groupsOn(offered.length, total)}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <span className="flex h-11 items-center gap-2.5 rounded-[12px] bg-fg/[0.04] px-1.5 font-mono text-xs text-fg ring-1 ring-line">
          <span className="relative grid size-8 shrink-0 place-items-center rounded-[9px] bg-primary text-on-primary">
            <span aria-hidden="true" className="st-halo absolute inset-0 rounded-[9px] bg-primary" />
            <Icon name="lock" size={12} className="relative" />
          </span>
          <span className="truncate">{copy.noteLink}</span>
        </span>

        {offered.length === 0 ? (
          <span aria-hidden="true" className="grid min-h-28 place-items-center rounded-[14px] border-2 border-dashed border-line-strong">
            <span className="st-blink h-5 w-2.5 rounded-[2px] bg-primary" />
          </span>
        ) : (
          <ol className="grid grid-cols-2 gap-2">
            {offered.map((group, index) => {
              const isActive = index === active;
              const isWide = index === 0 && offered.length % 2 === 1;
              const isPicked = index === pickedIndex;
              return (
                <li key={group.name} style={stagger(index, 90, 250)} className={cx('st-rise', isWide && 'col-span-2')}>
                  <button
                    type="button"
                    aria-pressed={isPicked}
                    onClick={() => togglePick(group.name)}
                    className={cx(
                      'relative flex h-full min-h-20 w-full flex-col justify-between gap-2 overflow-hidden rounded-[14px] p-3 text-left ring-1 transition-[background-color,box-shadow,translate] duration-500 hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                      isActive ? '-translate-y-0.5 bg-primary/15 ring-primary/60' : 'bg-fg/[0.02] ring-line',
                      isPicked && 'ring-2 ring-primary',
                    )}
                  >
                    {isActive && <span key={active} aria-hidden="true" className="st-flash pointer-events-none absolute inset-0 bg-primary/25" />}
                    <span className="relative flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] font-bold text-fg-subtle tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      <span aria-hidden="true" className={cx('grid size-4 place-items-center rounded-full ring-2', isActive ? 'ring-primary' : 'ring-fg/25')}>
                        {isActive && <span className="size-2 rounded-full bg-primary" />}
                      </span>
                    </span>
                    <span className="relative min-w-0">
                      <span className="block truncate text-base font-black text-fg">{group.name}</span>
                      {index === 0 && <span className="block truncate text-[10.5px] text-fg-subtle">{copy.shownFirst}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
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
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <header className={cx(cardClass, 'st-rise grid gap-6 p-6 sm:p-7 2xl:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] 2xl:items-end')}>
          <div className="min-w-0">
            <h1 className="font-display text-5xl leading-[0.9] font-black tracking-[-0.04em] text-fg sm:text-6xl">{copy.title}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
          </div>
          <SessionGauge on={offered.length} total={groups.length} />
        </header>
        <TermsSlip setup={setup} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="min-w-0 xl:order-2">
          <GroupsQueue
            planName={setup.planName}
            offered={offered}
            parked={parked}
            isDirty={isDirty}
            onChange={changeGroups}
            onUndo={() => setGroups(savedGroups)}
            onSave={save}
          />
        </div>
        <aside className="min-w-0 xl:sticky xl:top-24 xl:order-1">
          <ClientBoard offered={offered} total={groups.length} />
        </aside>
      </div>
    </div>
  );
}
