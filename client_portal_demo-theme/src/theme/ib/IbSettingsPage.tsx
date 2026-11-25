'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { ibSettingsCopy as copy, mockIbSetup, mockOfferGroups, moveGroup, type OfferGroup } from './ibSettingsData';

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/* ───────────── Offer ring: how many of the plan's groups are on offer ───────────── */

function OfferRing({ on, total }: { on: number; total: number }) {
  const share = total > 0 ? on / total : 0;
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="4" className="stroke-white/10" />
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${RING_LENGTH * share} ${RING_LENGTH}`}
          className="stroke-(--brand-gleam) transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="font-mono text-sm font-semibold text-white tabular-nums">
        {on}/{total}
      </span>
    </span>
  );
}

/* ───────────── One offered group: numbered slot, drag handle, remove ───────────── */

function GroupSlot({ group, index, count, onMove, onRemove, onDragStart, onDrop }: {
  group: OfferGroup;
  index: number;
  count: number;
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
        'group relative flex animate-rise items-center gap-3 overflow-hidden rounded-2xl py-3 pr-3 pl-4 ring-1 transition-colors motion-reduce:animate-none',
        isFirst ? 'bg-primary/[0.07] ring-primary/40' : 'bg-surface-2/50 ring-line hover:ring-primary/30',
      )}
    >
      {isFirst && <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', goldFill)} />}
      <span className={cx('font-mono text-xs font-semibold tabular-nums', isFirst ? 'text-primary' : 'text-fg-subtle')}>{String(index + 1).padStart(2, '0')}</span>
      <button
        type="button"
        aria-label={copy.moveGroup(group.name)}
        aria-disabled={count < 2}
        onKeyDown={handleKey}
        className="grid size-7 cursor-grab place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        <Icon name="arrowsUpDown" size={13} />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-fg">{group.name}</span>
        <span className={cx('block truncate text-xs', isFirst ? 'text-primary' : 'text-fg-subtle')}>{isFirst ? copy.shownFirst : copy.canPick}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon name="xCircle" size={13} />
        {copy.remove}
      </button>
    </li>
  );
}

/* ───────────── Groups on plan: graphite header with the ring, offered slots, parked groups ───────────── */

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
    <section className={cx(cardClass, 'flex animate-rise flex-col overflow-hidden motion-reduce:animate-none')}>
      <header className="relative isolate flex items-center gap-4 overflow-hidden bg-[#18181b] p-5 text-white">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 -z-10 size-56 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
        />
        <OfferRing on={offered.length} total={groups.length} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{copy.groupsTitle(planName)}</h2>
          <p className="mt-1 text-sm text-white/55">{copy.groupsBody}</p>
        </div>
        <span className="hidden shrink-0 rounded-md bg-emerald-400/15 px-2 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 sm:inline">
          {copy.groupsOn(offered.length, groups.length)}
        </span>
      </header>

      <div className="flex flex-col gap-4 p-5">
        <p className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-3 text-sm text-fg-muted">
          <Icon name="globe" size={15} className="mt-0.5 shrink-0 text-primary" />
          <span>
            {copy.notePrefix}
            <span className="font-semibold text-fg">{copy.noteLink}</span>
            {copy.noteSuffix}
          </span>
        </p>

        <ol className="flex flex-col gap-2">
          {offered.map((group, index) => (
            <GroupSlot
              key={group.name}
              group={group}
              index={index}
              count={offered.length}
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
          <p className="flex items-center gap-2 text-xs text-fg-subtle">
            <Icon name="checkCircle" size={13} className="text-success" />
            {copy.allOnOffer}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.16em] text-fg-subtle uppercase">{copy.offOffer}</span>
            {parked.map((group) => (
              <button
                key={group.name}
                type="button"
                onClick={() => addBack(group.name)}
                aria-label={copy.addBack(group.name)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line px-3 text-xs font-semibold text-fg-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon name="plus" size={12} />
                {group.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t border-line pt-4">
          <Button leftIcon="check" onClick={save} disabled={!isDirty}>
            {copy.save}
          </Button>
          <Button variant="outline" leftIcon="history" onClick={() => setGroups(savedGroups)} disabled={!isDirty}>
            {copy.undo}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Your setup: graphite spec sheet, one line per broker-set value ───────────── */

function SetupSheet() {
  const setup = mockIbSetup;
  const specs: { label: string; value: string; hint?: string; icon: IconName; tone?: 'good' }[] = [
    { label: copy.plan, value: setup.planName, icon: 'sliders' },
    { label: copy.smallestPayout, value: formatMoney(setup.smallestPayout, setup.currency), hint: copy.smallestPayoutHint, icon: 'wallet' },
    { label: copy.wallet, value: setup.walletStatus, icon: 'checkCircle', tone: 'good' },
  ];

  return (
    <section className="relative isolate flex animate-rise flex-col overflow-hidden rounded-3xl bg-[#18181b] p-5 text-white ring-1 ring-primary/30 [animation-delay:120ms] motion-reduce:animate-none">
      <Icon name="lock" size={120} className="pointer-events-none absolute -right-8 -bottom-8 -z-10 text-white/[0.04]" />
      <h2 className="flex items-center gap-2.5 text-base font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-white/[0.06] text-(--brand-gleam)">
          <Icon name="lock" size={14} />
        </span>
        {copy.setupTitle}
      </h2>
      <p className="mt-2 text-sm text-white/55">{copy.setupBody}</p>

      <dl className="mt-5 flex flex-col divide-y divide-dashed divide-white/10">
        {specs.map((spec, index) => (
          <div key={spec.label} style={riseDelay(index + 2)} className="flex animate-rise items-start gap-3 py-4 first:pt-0 last:pb-0 motion-reduce:animate-none">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white/60">
              <Icon name={spec.icon} size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-white/50">{spec.label}</dt>
              <dd className={cx('mt-0.5 font-mono text-lg font-semibold tabular-nums', spec.tone === 'good' ? 'text-emerald-300' : 'text-(--brand-gleam)')}>
                {spec.tone === 'good' && <span aria-hidden="true" className="mr-2 inline-block size-2 animate-twinkle rounded-full bg-emerald-400 align-middle motion-reduce:animate-none" />}
                {spec.value}
              </dd>
              {spec.hint && <dd className="mt-0.5 text-xs text-white/45">{spec.hint}</dd>}
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function IbSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 border-l-4 border-primary pl-4">
        <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
        <p className="text-sm text-fg-muted">{copy.subtitle}</p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <GroupsPanel planName={mockIbSetup.planName} />
        <SetupSheet />
      </div>
    </div>
  );
}
