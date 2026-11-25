'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { ibSettingsCopy as copy, mockIbSetup, mockOfferGroups, moveGroup, type OfferGroup } from './ibSettingsData';

const captionClass = 'text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase';
const ORBIT_SIZE = 220;
const ORBIT_RADIUS = 84;

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Plan orbit: the plan is the core, every group on offer is a planet around it ───────────── */

function PlanOrbit({ planName, offered, total }: { planName: string; offered: OfferGroup[]; total: number }) {
  return (
    <div className="relative mx-auto shrink-0" style={{ width: ORBIT_SIZE, height: ORBIT_SIZE }}>
      <span aria-hidden="true" className="absolute inset-[18px] rounded-full border border-dashed border-primary/35 motion-safe:animate-orbit [animation-duration:12s]" />
      <span
        aria-hidden="true"
        className="absolute inset-[18px] animate-orbit rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--brand-primary)_40deg,transparent_80deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-2px),black_calc(100%-1px))] [animation-duration:3.5s] motion-reduce:animate-none"
      />
      <span aria-hidden="true" className="absolute inset-[62px] rounded-full bg-primary/10 ring-1 ring-primary/30 motion-safe:animate-ring-breathe" />

      <span className="absolute inset-0 grid place-items-center text-center">
        <span>
          <span className={cx(captionClass, 'block')}>{copy.plan}</span>
          <span className="block text-lg font-bold text-fg">{planName}</span>
          <span className="mt-0.5 block font-mono text-xs text-primary">{copy.groupsOn(offered.length, total)}</span>
        </span>
      </span>

      {offered.map((group, index) => {
        const angle = (index / Math.max(1, offered.length)) * 2 * Math.PI - Math.PI / 2;
        const left = ORBIT_SIZE / 2 + ORBIT_RADIUS * Math.cos(angle);
        const top = ORBIT_SIZE / 2 + ORBIT_RADIUS * Math.sin(angle);
        return (
          <span
            key={group.name}
            style={{ left, top, animationDelay: `${index * 120}ms` }}
            className={cx(
              'absolute -translate-x-1/2 -translate-y-1/2 animate-rise rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ring-1 backdrop-blur motion-reduce:animate-none',
              index === 0 ? 'bg-primary/25 text-fg ring-primary/60' : 'bg-surface/80 text-fg-muted ring-line',
            )}
          >
            {group.name}
          </span>
        );
      })}
    </div>
  );
}

/* ───────────── Group row: order chip, grip, name + role, remove ───────────── */

function GroupRow({ group, index, onMove, onRemove, onDragStart, onDrop }: {
  group: OfferGroup;
  index: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
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
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={riseDelay(index)}
      className={cx(
        'flex animate-rise items-center gap-3 rounded-full py-1.5 pr-2 pl-1.5 ring-1 transition-colors motion-reduce:animate-none',
        isFirst ? 'bg-primary/12 ring-primary/45' : 'bg-surface-2/40 ring-line hover:ring-primary/30',
      )}
    >
      <span className={cx('grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold', isFirst ? 'bg-primary/25 text-primary' : 'bg-surface text-fg-subtle ring-1 ring-line')}>
        {index + 1}
      </span>
      <button
        type="button"
        aria-label={copy.moveGroup(group.name)}
        onKeyDown={handleKey}
        className="grid size-7 cursor-grab place-items-center rounded-full text-fg-subtle transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        <Icon name="arrowsUpDown" size={13} />
      </button>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-bold text-fg">{group.name}</span>
        <span className={cx('ml-2 text-xs', isFirst ? 'text-primary' : 'text-fg-subtle')}>{isFirst ? copy.shownFirst : copy.canPick}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="h-8 rounded-full px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {copy.remove}
      </button>
    </li>
  );
}

/* ───────────── Groups on plan: orbit visual on the left, ordered list + actions on the right ───────────── */

function GroupsPanel({ planName }: { planName: string }) {
  const [groups, setGroups] = useState<OfferGroup[]>(mockOfferGroups);
  const [savedGroups, setSavedGroups] = useState<OfferGroup[]>(mockOfferGroups);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const offered = groups.filter((group) => group.isOffered);
  const parked = groups.filter((group) => !group.isOffered);
  const isDirty = JSON.stringify(groups) !== JSON.stringify(savedGroups);

  // Offered groups always come first, in the order the clients will see them.
  function setOffered(nextOffered: OfferGroup[], nextParked: OfferGroup[]) {
    setGroups([...nextOffered, ...nextParked]);
  }

  function move(from: number, to: number) {
    setOffered(moveGroup(offered, from, to), parked);
  }

  function remove(name: string) {
    const group = offered.find((item) => item.name === name);
    if (!group) return;
    setOffered(
      offered.filter((item) => item.name !== name),
      [...parked, { ...group, isOffered: false }],
    );
  }

  function addBack(name: string) {
    const group = parked.find((item) => item.name === name);
    if (!group) return;
    setOffered(
      [...offered, { ...group, isOffered: true }],
      parked.filter((item) => item.name !== name),
    );
  }

  function save() {
    setSavedGroups(groups);
    toast(copy.saved);
  }

  return (
    <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-20 -z-10 size-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-center">
        <PlanOrbit planName={planName} offered={offered} total={groups.length} />

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cx(captionClass, 'text-primary')}>{copy.title}</p>
              <h2 className="mt-1 text-lg font-bold text-fg">{copy.groupsTitle(planName)}</h2>
              <p className="mt-1 max-w-xl text-sm text-fg-muted">{copy.groupsBody}</p>
            </div>
            <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success ring-1 ring-success/30">
              {copy.groupsOn(offered.length, groups.length)}
            </span>
          </div>

          <p className="rounded-2xl bg-primary/[0.07] px-4 py-3 text-sm text-fg-muted ring-1 ring-primary/20">
            {copy.notePrefix}
            <span className="font-semibold text-primary">{copy.noteLink}</span>
            {copy.noteSuffix}
          </p>

          <ol className="flex flex-col gap-2">
            {offered.map((group, index) => (
              <GroupRow
                key={group.name}
                group={group}
                index={index}
                onMove={(to) => move(index, to)}
                onRemove={() => remove(group.name)}
                onDragStart={() => setDragIndex(index)}
                onDrop={() => {
                  if (dragIndex !== null) move(dragIndex, index);
                  setDragIndex(null);
                }}
              />
            ))}
          </ol>

          {parked.length === 0 ? (
            <p className="text-xs text-fg-subtle">{copy.allOnOffer}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className={captionClass}>{copy.offOffer}</span>
              {parked.map((group) => (
                <button
                  key={group.name}
                  type="button"
                  onClick={() => addBack(group.name)}
                  aria-label={copy.addBack(group.name)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-primary/40 px-3 text-xs font-semibold text-fg-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon name="plus" size={12} />
                  {group.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={save} disabled={!isDirty}>
              {copy.save}
            </Button>
            <Button variant="outline" onClick={() => setGroups(savedGroups)} disabled={!isDirty}>
              {copy.undo}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Your setup: three glass satellites, each with a spinning ring around its icon ───────────── */

function SetupSatellites() {
  const setup = mockIbSetup;
  const specs: { label: string; value: string; hint?: string; icon: IconName; isLive?: boolean }[] = [
    { label: copy.plan, value: setup.planName, icon: 'sliders' },
    { label: copy.smallestPayout, value: formatMoney(setup.smallestPayout, setup.currency), hint: copy.smallestPayoutHint, icon: 'wallet' },
    { label: copy.wallet, value: setup.walletStatus, icon: 'checkCircle', isLive: true },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-px w-8 bg-(image:--brand-gradient)" />
        <div>
          <h2 className="text-base font-bold text-fg">{copy.setupTitle}</h2>
          <p className="text-sm text-fg-muted">{copy.setupBody}</p>
        </div>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {specs.map((spec, index) => (
          <li key={spec.label} style={riseDelay(index + 2)} className="orbit-card group/spec flex animate-rise items-center gap-4 p-4 motion-reduce:animate-none">
            <span className="relative grid size-12 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-primary/45 motion-safe:animate-orbit [animation-duration:4s]" />
              <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
                <Icon name={spec.icon} size={16} />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-fg-subtle">{spec.label}</span>
              <span className={cx('flex items-center gap-2 text-xl font-bold tabular-nums', spec.isLive ? 'text-success' : 'text-fg')}>
                {spec.isLive && (
                  <span aria-hidden="true" className="relative flex size-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
                    <span className="relative size-2 rounded-full bg-success" />
                  </span>
                )}
                {spec.value}
              </span>
              {spec.hint && <span className="block text-xs text-fg-subtle">{spec.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function IbSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="orbit-text text-2xl font-bold">{copy.title}</h1>
        <p className="text-sm text-fg-muted">{copy.subtitle}</p>
      </header>

      <GroupsPanel planName={mockIbSetup.planName} />
      <SetupSatellites />
    </div>
  );
}
