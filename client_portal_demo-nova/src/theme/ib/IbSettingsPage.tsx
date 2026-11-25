'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { ibSettingsCopy as copy, mockIbSetup, mockOfferGroups, moveGroup, type IbSetup, type OfferGroup } from './ibSettingsData';

/*
 * Nova IB settings: the editor on the left (offered groups as a numbered queue on a dotted rail, groups off offer as
 * dashed slots, a save dock) and a sticky right column with a live phone preview of what clients pick from, plus a
 * perforated receipt of the broker-set terms.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const PREVIEW_STEP_MS = 1800;
const PERFORATIONS = 14;

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Phone preview: a cursor walks through the groups clients can pick ───────────── */

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

function ClientPreview({ offered, total }: { offered: OfferGroup[]; total: number }) {
  const active = usePreviewCursor(offered.length);

  return (
    <section aria-label={copy.canPick} className={cx(panelClass, 'flex animate-rise flex-col items-center gap-4 p-5 motion-reduce:animate-none')}>
      <p className={cx(captionClass, 'flex w-full items-center justify-between gap-3 text-fg-subtle')}>
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon name="eye" size={13} />
          <span className="truncate">{copy.canPick}</span>
        </span>
        <span className="shrink-0 font-mono text-fg tabular-nums">{copy.groupsOn(offered.length, total)}</span>
      </p>

      <div className="relative w-full max-w-[17rem] rounded-[38px] bg-[#0a1220] p-2.5 shadow-[0_28px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
        <span aria-hidden="true" className="absolute top-4 left-1/2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/15" />
        <div className="flex min-h-[19rem] flex-col gap-3 rounded-[30px] bg-white/[0.04] px-3 pt-9 pb-4 text-white ring-1 ring-white/[0.06]">
          <span className="flex h-8 items-center gap-2 rounded-full bg-white/[0.07] px-3 font-mono text-[10.5px] text-white/60">
            <Icon name="lock" size={11} />
            <span className="truncate">{copy.noteLink}</span>
          </span>

          {offered.length === 0 ? (
            <span aria-hidden="true" className="m-auto size-10 rounded-full border-2 border-dashed border-white/25" />
          ) : (
            <ul className="flex flex-col gap-2">
              {offered.map((group, index) => {
                const isActive = index === active;
                return (
                  <li
                    key={group.name}
                    style={riseDelay(index)}
                    className={cx(
                      'relative flex animate-feed-in items-center gap-3 rounded-2xl px-3 py-2.5 transition-[background-color,translate,box-shadow] duration-500 motion-reduce:animate-none motion-reduce:transition-none',
                      isActive ? 'translate-x-1 bg-white text-[#0a1220] shadow-[0_10px_22px_-14px_rgb(0_0_0/0.9)]' : 'bg-white/[0.05] text-white ring-1 ring-white/10',
                    )}
                  >
                    <span aria-hidden="true" className={cx('grid size-4 shrink-0 place-items-center rounded-full ring-2', isActive ? 'ring-[#0a1220]' : 'ring-white/35')}>
                      {isActive && <span className="size-1.5 rounded-full bg-[#0a1220]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{group.name}</span>
                      {index === 0 && <span className={cx('block truncate text-[10px]', isActive ? 'text-[#3b4658]' : 'text-white/50')}>{copy.shownFirst}</span>}
                    </span>
                    {isActive && (
                      <span aria-hidden="true" className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-ring-ripple rounded-full ring-2 ring-[#0a1220]/30 motion-reduce:hidden" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Setup receipt: broker-set terms with dotted leaders ───────────── */

interface ReceiptRow {
  label: string;
  value: string;
  hint?: string;
  status?: string;
}

function SetupReceipt({ setup }: { setup: IbSetup }) {
  const rows: ReceiptRow[] = [
    { label: copy.plan, value: setup.planName },
    { label: copy.smallestPayout, value: formatMoney(setup.smallestPayout, setup.currency), hint: copy.smallestPayoutHint },
    { label: copy.wallet, value: setup.currency, status: setup.walletStatus },
  ];

  return (
    <section style={{ animationDelay: '120ms' }} className={cx(panelClass, 'animate-rise motion-reduce:animate-none')}>
      <span aria-hidden="true" className="absolute inset-x-4 top-0 flex -translate-y-1/2 justify-between">
        {Array.from({ length: PERFORATIONS }, (_, hole) => (
          <span key={hole} className="size-3 rounded-full bg-app ring-1 ring-line" />
        ))}
      </span>

      <div className="flex flex-col gap-4 p-5 pt-7">
        <header className="flex items-start gap-3">
          <span aria-hidden="true" className="nova-gloss grid size-10 shrink-0 place-items-center rounded-full text-fg">
            <Icon name="lock" size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-[-0.02em] text-fg">{copy.setupTitle}</h2>
            <p className="mt-0.5 text-xs text-fg-muted">{copy.setupBody}</p>
          </div>
        </header>

        <dl className="flex flex-col gap-3.5 border-t-2 border-dashed border-line-strong pt-4">
          {rows.map((row, index) => (
            <div key={row.label} style={riseDelay(index + 2)} className="animate-feed-in motion-reduce:animate-none">
              <div className="flex items-baseline gap-2">
                <dt className="flex min-w-0 flex-1 items-baseline gap-2 text-xs text-fg-subtle">
                  <span className="shrink-0">{row.label}</span>
                  <span aria-hidden="true" className="min-w-4 flex-1 border-b-2 border-dotted border-line" />
                </dt>
                <dd className="flex shrink-0 items-center gap-2 font-mono text-sm font-black text-fg tabular-nums">
                  {row.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 font-sans text-[10.5px] font-bold text-success ring-1 ring-success/30">
                      <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-success motion-reduce:animate-none" />
                      {row.status}
                    </span>
                  )}
                  {row.value}
                </dd>
              </div>
              {row.hint && <p className="mt-1 text-[11px] text-fg-subtle">{row.hint}</p>}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────── Queue row: order bead on the rail, grip, name + role, remove ───────────── */

function QueueRow({ group, index, isDragging, onMove, onRemove, onDragStart, onDragEnd, onDrop }: {
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
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onMove(index - 1);
    }
    if (event.key === 'ArrowDown') {
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
      style={riseDelay(index)}
      className={cx('group relative flex animate-feed-in items-center gap-4 transition-opacity motion-reduce:animate-none', isDragging && 'opacity-40')}
    >
      <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-surface">
        <span
          aria-hidden="true"
          className={cx('absolute inset-0 rounded-full border-2 border-dashed', isFirst ? 'animate-rim-spin border-fg/40 motion-reduce:animate-none' : 'border-fg/15')}
        />
        <span className={cx('grid size-8 place-items-center rounded-full font-mono text-xs font-black', isFirst ? 'bg-fg text-app' : 'nova-gloss text-fg')}>{index + 1}</span>
      </span>

      <div
        className={cx(
          'flex min-w-0 flex-1 items-center gap-3 rounded-[22px] p-2 ring-1 transition-[translate,box-shadow,background-color] duration-300 group-hover:translate-x-1 motion-reduce:transition-none',
          isFirst ? 'bg-fg/[0.05] ring-line-strong' : 'ring-line group-hover:ring-line-strong',
        )}
      >
        <button
          type="button"
          aria-label={copy.moveGroup(group.name)}
          onKeyDown={handleKey}
          className="grid size-9 shrink-0 cursor-grab place-items-center rounded-full text-fg-subtle transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
        >
          <Icon name="arrowsUpDown" size={13} />
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-fg">{group.name}</span>
          <span className="block truncate text-xs text-fg-subtle">{isFirst ? copy.shownFirst : copy.canPick}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="h-9 shrink-0 rounded-full px-3.5 text-xs font-bold text-danger ring-1 ring-danger/25 transition-colors hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
        >
          {copy.remove}
        </button>
      </div>
    </li>
  );
}

/* ───────────── Groups editor ───────────── */

function GroupsEditor({ planName, groups, offered, parked, isDirty, onChange, onUndo, onSave }: {
  planName: string;
  groups: OfferGroup[];
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
    <section style={{ animationDelay: '70ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={cx(captionClass, 'text-fg-subtle')}>{copy.plan}</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-fg">{copy.groupsTitle(planName)}</h2>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">{copy.groupsBody}</p>
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <span aria-hidden="true" className="flex gap-1">
            {groups.map((group, index) => (
              <span key={group.name} className={cx('h-2 w-6 rounded-full transition-colors duration-300', index < offered.length ? 'bg-fg' : 'bg-fg/12')} />
            ))}
          </span>
          <span key={offered.length} className="animate-dot-pop font-mono text-xs font-black text-fg tabular-nums motion-reduce:animate-none">
            {copy.groupsOn(offered.length, groups.length)}
          </span>
        </span>
      </div>

      <ol className="relative flex flex-col gap-3">
        {offered.length > 1 && <span aria-hidden="true" className="absolute top-6 bottom-6 left-[21px] border-l-2 border-dotted border-line-strong" />}
        {offered.map((group, index) => (
          <QueueRow
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

      <div className="flex flex-col gap-3 border-t-2 border-dotted border-line-strong pt-4">
        {parked.length === 0 ? (
          <p className="flex items-center gap-2.5 text-sm text-fg-muted">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-success/10 text-success ring-1 ring-success/30">
              <Icon name="checkCircle" size={13} />
            </span>
            {copy.allOnOffer}
          </p>
        ) : (
          <>
            <p className={cx(captionClass, 'text-fg-subtle')}>{copy.offOffer}</p>
            <ul className="flex flex-wrap gap-2">
              {parked.map((group, index) => (
                <li key={group.name} style={riseDelay(index)} className="animate-dot-pop motion-reduce:animate-none">
                  <button
                    type="button"
                    onClick={() => addBack(group.name)}
                    className="group/add inline-flex h-11 items-center gap-2.5 rounded-full border-2 border-dashed border-line-strong py-1 pr-4 pl-1 text-sm font-bold text-fg-muted transition-[color,border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-fg/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                  >
                    <span className="nova-gloss grid size-8 place-items-center rounded-full text-fg transition-transform duration-300 group-hover/add:rotate-90 motion-reduce:transition-none">
                      <Icon name="plus" size={13} />
                    </span>
                    {copy.addBack(group.name)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="flex items-start gap-3 rounded-[22px] bg-fg/[0.03] px-4 py-3 text-sm text-fg-muted ring-1 ring-line">
        <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-fg text-app">
          <Icon name="megaphone" size={11} />
        </span>
        <span>
          {copy.notePrefix}
          <span className="font-black text-fg underline decoration-dotted decoration-2 underline-offset-4">{copy.noteLink}</span>
          {copy.noteSuffix}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!isDirty}
          className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-fg ring-1 ring-line transition-[color,box-shadow,opacity] hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
        >
          <Icon name="refresh" size={14} />
          {copy.undo}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-bold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none"
        >
          {isDirty && <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-app motion-reduce:animate-none" />}
          {copy.save}
        </button>
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
          <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-10 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
              <Icon name="settings" size={17} />
            </span>
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{copy.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
          </div>
        </header>

        <GroupsEditor
          planName={setup.planName}
          groups={groups}
          offered={offered}
          parked={parked}
          isDirty={isDirty}
          onChange={changeGroups}
          onUndo={() => setGroups(savedGroups)}
          onSave={save}
        />
      </div>

      <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-24">
        <ClientPreview offered={offered} total={groups.length} />
        <SetupReceipt setup={setup} />
      </aside>
    </div>
  );
}
