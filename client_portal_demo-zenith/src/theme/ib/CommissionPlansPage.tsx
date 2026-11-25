'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import {
  capFor,
  commissionPlansCopy as copy,
  emptyDraft,
  isDraftValid,
  masterGroupCaps,
  matchesSubIb,
  mockCommissionPlans,
  mockSubIbOptions,
  statusOptions,
  type CommissionPlan,
  type PlanDraft,
  type PlanGroup,
  type SubIbOption,
} from './ibCommissionPlansData';

/*
 * Zenith Commission Plans (Vaulto language): an open header, plans as textured tiles (sub-IB count as a pixel block,
 * each rate as a capsule track against the parent cap) closed by a dashed "New Plan" tile; the editor splits into a
 * details column and a group column whose rate rows are capsule tracks with a red cap pixel.
 */
const RED = 'var(--zenith-red)';
const currency = 'USD';
const MAX_COUNT_PIXELS = 12;
const panelClass = 'relative rounded-[30px] bg-fg/[0.02] ring-1 ring-line';
const textureClass =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:10px_10px] text-fg/[0.14] [mask-image:linear-gradient(160deg,#000,transparent_60%)]';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const textareaClass =
  'min-h-24 w-full resize-y rounded-[18px] bg-fg/[0.03] px-4 py-3 text-sm text-fg ring-1 ring-line-strong transition-shadow placeholder:text-fg-subtle focus:ring-2 focus:ring-fg focus:outline-none disabled:opacity-60';
const ghostPill =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-bold text-fg ring-1 ring-line-strong transition-[background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';
const solidPill =
  'group/solid relative inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-bold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 motion-reduce:transition-none';

type Screen = { kind: 'list' } | { kind: 'new' } | { kind: 'plan'; planId: string };

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

// Flips true on the first frame so capsule fills grow from zero instead of appearing full.
function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return grown;
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

function RedDisc({ icon, size = 'size-9' }: { icon: IconName; size?: string }) {
  return (
    <span style={{ background: RED }} className={cx('relative grid shrink-0 place-items-center rounded-full text-white transition-transform duration-300 group-hover/solid:translate-x-0.5', size)}>
      <Icon name={icon} size={14} />
    </span>
  );
}

function StatusBadge({ status }: { status: CommissionPlan['status'] }) {
  const isActive = status === 'active';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1',
        isActive ? 'bg-success/12 text-success ring-success/30' : 'bg-fg/[0.05] text-fg-muted ring-line',
      )}
    >
      <span aria-hidden="true" className={cx('size-1.5 rounded-[2px] bg-current', isActive && 'zenith-blink')} />
      {isActive ? copy.active : copy.inactive}
    </span>
  );
}

function InfoNote({ icon = 'info', children }: { icon?: 'info' | 'lock'; children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 rounded-[22px] border border-dashed border-line-strong px-4 py-3 text-sm leading-relaxed text-fg-muted">
      <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center rounded-[10px] bg-fg text-app">
        <Icon name={icon} size={14} />
        <span style={{ background: RED }} className="zenith-blink absolute -top-1 -right-1 size-2 rounded-[2px] ring-2 ring-app" />
      </span>
      <span className="pt-1">{children}</span>
    </p>
  );
}

function PixelEmpty({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="relative flex flex-col items-center gap-4 rounded-[30px] border border-dashed border-line-strong px-4 py-14 text-center">
      <span aria-hidden="true" className="relative grid place-items-center">
        <span className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, pixel) => (
            <span
              key={pixel}
              style={{ animationDelay: `${(pixel % 7) * 0.15}s`, background: pixel === 24 ? RED : undefined }}
              className={cx('zenith-blink size-2 rounded-[2px]', pixel !== 24 && 'bg-fg/20')}
            />
          ))}
        </span>
        <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
          <Icon name={icon} size={20} />
        </span>
      </span>
      <p className="text-base font-black text-fg">{title}</p>
      <p className="max-w-sm text-sm text-fg-muted">{body}</p>
    </div>
  );
}

/* ───────────── List: textured plan tiles + a dashed New Plan tile ───────────── */

function RateTracks({ groups, grown }: { groups: PlanGroup[]; grown: boolean }) {
  return (
    <div className="relative flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col gap-2">
          <p className={cx(captionClass, 'flex items-center justify-between gap-3 text-fg-subtle')}>
            <span className="truncate">{group.name}</span>
            <span className="truncate">
              {copy.yourRate} / {copy.parentCap}
            </span>
          </p>
          <ul className="flex flex-col gap-2">
            {group.rates.map((rate, rateIndex) => {
              const cap = capFor(group.name, rate.instrumentType);
              const fill = cap > 0 ? Math.min(rate.ratePerLot / cap, 1) * 100 : 0;
              return (
                <li key={rate.instrumentType} className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 text-xs">
                  <span className="truncate font-semibold text-fg-muted">{rate.instrumentType}</span>
                  <span aria-hidden="true" className="relative h-2.5 overflow-hidden rounded-full bg-fg/[0.07]">
                    <span
                      style={{ width: grown ? `${fill}%` : '0%', transitionDelay: `${200 + rateIndex * 120}ms` }}
                      className="absolute inset-y-0 left-0 rounded-full bg-fg transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                    />
                    <span style={{ background: RED }} className="absolute top-1/2 right-0.5 size-1.5 -translate-y-1/2 rounded-[2px]" />
                  </span>
                  <span className="font-mono font-bold whitespace-nowrap text-fg tabular-nums">
                    {formatMoney(rate.ratePerLot, currency)}
                    <span className="font-medium text-fg-subtle"> / {formatMoney(cap, currency)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PlanTile({ plan, index, onView, onRename, onAssign, onDelete }: {
  plan: CommissionPlan;
  index: number;
  onView: () => void;
  onRename: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const grown = useGrown();
  const subIbCount = plan.assignedTo.length;
  const isLocked = subIbCount > 0;
  const pixels = Math.min(subIbCount, MAX_COUNT_PIXELS);
  const dockButton =
    'inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

  return (
    <li
      style={stagger(index, 90, 120)}
      className="group/plan zenith-tile relative flex flex-col gap-5 overflow-hidden rounded-[30px] bg-fg/[0.02] p-5 ring-1 ring-line transition-[background-color,box-shadow] duration-300 hover:bg-fg/[0.04] hover:ring-line-strong motion-reduce:transition-none"
    >
      <span aria-hidden="true" className={textureClass} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-fg text-app transition-transform duration-300 group-hover/plan:-rotate-6 motion-reduce:transition-none">
            <Icon name="sliders" size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-tight text-fg">{plan.name}</p>
            {plan.description && <p className="truncate text-xs text-fg-subtle">{plan.description}</p>}
          </div>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      {/* Sub-IBs on the plan: big count + one pixel each (dashed pixel when nobody is on it). */}
      <div className="relative flex items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums">{subIbCount}</span>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="user" size={12} />
              {copy.subIbsUsing(subIbCount)}
            </span>
            {isLocked && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="lock" size={12} />
                {copy.lockedOnceAssigned}
              </span>
            )}
          </p>
        </div>
        <span aria-hidden="true" className="grid w-24 shrink-0 grid-cols-6 gap-1">
          {pixels === 0 ? (
            <span className="aspect-square rounded-[3px] border-2 border-dashed border-fg/25" />
          ) : (
            Array.from({ length: pixels }, (_, pixel) => (
              <span key={pixel} style={{ ...stagger(pixel, 60, 300 + index * 120), background: RED }} className="zenith-pixel zenith-twinkle aspect-square rounded-[3px]" />
            ))
          )}
        </span>
      </div>

      {plan.groups.length > 0 && <RateTracks groups={plan.groups} grown={grown} />}

      <div className="relative mt-auto flex items-center gap-1 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
        <button type="button" onClick={onView} className={dockButton}>
          <Icon name="eye" size={14} />
          {copy.view}
        </button>
        <button type="button" onClick={onRename} className={dockButton}>
          <Icon name="pencil" size={14} />
          {copy.rename}
        </button>
        <button
          type="button"
          onClick={onAssign}
          className="group/solid inline-flex h-10 items-center gap-1.5 rounded-full bg-fg py-1 pr-3 pl-1 text-xs font-bold text-app transition-[translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <RedDisc icon="user" size="size-8" />
          {copy.assign}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isLocked}
          aria-label={copy.delete}
          title={isLocked ? copy.deleteBlocked : copy.delete}
          className="ml-auto grid size-10 shrink-0 place-items-center rounded-full text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Icon name="xCircle" size={15} />
        </button>
      </div>
    </li>
  );
}

function NewPlanTile({ index, onNew }: { index: number; onNew: () => void }) {
  return (
    <li style={stagger(index, 90, 120)} className="zenith-tile">
      <button
        type="button"
        onClick={onNew}
        className="group/add flex h-full min-h-64 w-full flex-col items-center justify-center gap-3 rounded-[30px] border-2 border-dashed border-line-strong text-fg-muted transition-colors duration-300 hover:border-fg/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="relative grid size-14 place-items-center">
          <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden" />
          <span style={{ background: RED }} className="relative grid size-14 place-items-center rounded-full text-white transition-transform duration-300 group-hover/add:rotate-90 motion-reduce:transition-none">
            <Icon name="plus" size={20} />
          </span>
        </span>
        <span className="text-sm font-bold">{copy.newPlan}</span>
      </button>
    </li>
  );
}

function PlanList({ plans, onNew, onView, onRename, onAssign, onDelete }: {
  plans: CommissionPlan[];
  onNew: () => void;
  onView: (plan: CommissionPlan) => void;
  onRename: (plan: CommissionPlan) => void;
  onAssign: (plan: CommissionPlan) => void;
  onDelete: (plan: CommissionPlan) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
              </span>
              <span className="grid size-11 place-items-center rounded-full bg-fg text-app">
                <Icon name="sliders" size={17} />
              </span>
            </span>
            <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{copy.title}</h1>
          </div>
          <button type="button" onClick={onNew} className={solidPill}>
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/solid:translate-x-full motion-reduce:hidden" />
            <span className="relative">{copy.newPlan}</span>
            <RedDisc icon="plus" />
          </button>
        </div>
        <RedRule />
      </header>

      {plans.length === 0 ? (
        <PixelEmpty icon="sliders" title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <PlanTile
              key={plan.id}
              plan={plan}
              index={index}
              onView={() => onView(plan)}
              onRename={() => onRename(plan)}
              onAssign={() => onAssign(plan)}
              onDelete={() => onDelete(plan)}
            />
          ))}
          <NewPlanTile index={plans.length} onNew={onNew} />
        </ul>
      )}
    </div>
  );
}

/* ───────────── Plan editor: details column + group column with capsule rate rows ───────────── */

function RateRow({ groupName, instrumentType, value, readOnly, onChange }: {
  groupName: string;
  instrumentType: string;
  value: number;
  readOnly: boolean;
  onChange: (value: number) => void;
}) {
  const cap = capFor(groupName, instrumentType);
  const isOver = value > cap;
  const fill = cap > 0 ? Math.min(value / cap, 1) * 100 : 0;
  const inputId = `rate-${groupName}-${instrumentType}`;

  return (
    <li className="grid gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[minmax(0,8rem)_9rem_minmax(0,1fr)] sm:items-center">
      <label htmlFor={inputId} className="text-sm font-bold text-fg">
        {instrumentType}
      </label>
      <span className="flex flex-col gap-1">
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          max={cap}
          step={0.01}
          value={value}
          disabled={readOnly}
          invalid={isOver}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {isOver && <span className="text-xs text-danger">{copy.overCap(formatMoney(cap, currency))}</span>}
      </span>
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
          <span
            style={{ width: `${fill}%` }}
            className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none', isOver ? 'bg-danger' : 'bg-fg')}
          />
          <span style={{ background: RED }} className="absolute top-1/2 right-0.5 size-1.5 -translate-y-1/2 rounded-[2px]" />
        </span>
        <span className="font-mono text-sm font-bold text-fg-muted tabular-nums">{formatMoney(cap, currency)}</span>
      </span>
    </li>
  );
}

function GroupPanel({ master, selected, readOnly, onAdd, onRemove, onRate }: {
  master: PlanGroup;
  selected: PlanGroup | undefined;
  readOnly: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onRate: (instrumentType: string, value: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(!readOnly);
  const isIncluded = selected !== undefined;
  const showRates = isIncluded && isOpen;
  const smallPill =
    'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

  return (
    <section className={cx(panelClass, 'zenith-tile overflow-hidden', isIncluded && 'ring-line-strong')}>
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span
            style={isIncluded ? { background: RED } : undefined}
            className={cx('grid size-6 shrink-0 place-items-center rounded-[6px]', isIncluded ? 'text-white' : 'border-2 border-dashed border-fg/30')}
          >
            {isIncluded && <Icon name="check" size={13} />}
          </span>
          <span className="truncate text-lg font-black tracking-tight text-fg">{master.name}</span>
          <span className="hidden font-mono text-[11px] text-fg-subtle sm:inline">· {master.rates.length}</span>
        </span>
        {readOnly || isIncluded ? (
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button type="button" onClick={onRemove} className={cx(smallPill, 'text-fg-muted hover:bg-danger/10 hover:text-danger')}>
                {copy.remove}
              </button>
            )}
            {isIncluded && (
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className={cx(smallPill, 'text-fg ring-1 ring-line-strong hover:bg-fg/[0.05]')}
              >
                <Icon name="chevronDown" size={13} className={cx('transition-transform duration-300', isOpen && 'rotate-180')} />
                {copy.setRates}
              </button>
            )}
          </div>
        ) : (
          <button type="button" onClick={onAdd} className={cx(smallPill, 'group/solid bg-fg pl-1 text-app hover:-translate-y-0.5')}>
            <RedDisc icon="plus" size="size-7" />
            {copy.add}
          </button>
        )}
      </div>
      {showRates && (
        <div className="animate-rise border-t border-dashed border-line-strong px-4 pb-2 motion-reduce:animate-none sm:px-5">
          <div aria-hidden="true" className={cx(captionClass, 'hidden gap-x-4 pt-3 text-fg-subtle sm:grid sm:grid-cols-[minmax(0,8rem)_9rem_minmax(0,1fr)]')}>
            <span>{copy.instrumentType}</span>
            <span>{copy.yourRate}</span>
            <span className="text-right">{copy.parentCap}</span>
          </div>
          <ul className="divide-y divide-dashed divide-line">
            {selected.rates.map((rate) => (
              <RateRow
                key={rate.instrumentType}
                groupName={master.name}
                instrumentType={rate.instrumentType}
                value={rate.ratePerLot}
                readOnly={readOnly}
                onChange={(value) => onRate(rate.instrumentType, value)}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PlanEditor({ plan, onBack, onSave }: { plan: CommissionPlan | null; onBack: () => void; onSave: (draft: PlanDraft) => void }) {
  const [draft, setDraft] = useState<PlanDraft>(() =>
    plan ? { name: plan.name, description: plan.description, status: plan.status, groups: plan.groups } : emptyDraft(),
  );
  const isNew = plan === null;
  const readOnly = plan !== null && plan.assignedTo.length > 0;
  const statusLabel = statusOptions.find((option) => option.value === draft.status)?.label ?? '';

  function addGroup(master: PlanGroup) {
    const rates = master.rates.map((rate) => ({ instrumentType: rate.instrumentType, ratePerLot: 0 }));
    setDraft((current) => ({ ...current, groups: [...current.groups, { name: master.name, rates }] }));
  }

  function removeGroup(name: string) {
    setDraft((current) => ({ ...current, groups: current.groups.filter((group) => group.name !== name) }));
  }

  function setRate(groupName: string, instrumentType: string, value: number) {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.name !== groupName
          ? group
          : { ...group, rates: group.rates.map((rate) => (rate.instrumentType === instrumentType ? { ...rate, ratePerLot: value } : rate)) },
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={onBack} className={ghostPill}>
            <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
              <Icon name="arrowLeft" size={14} />
            </span>
            {copy.back}
          </button>
          <h1 className="min-w-0 truncate text-3xl leading-none font-black tracking-[-0.04em] text-fg sm:text-4xl">{isNew ? copy.newPlan : plan.name}</h1>
          {!isNew && <StatusBadge status={plan.status} />}
        </div>
        <RedRule />
      </header>

      {readOnly && <InfoNote icon="lock">{copy.readOnly}</InfoNote>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section className={cx(panelClass, 'zenith-tile overflow-hidden p-5 sm:p-6')}>
            <span aria-hidden="true" className={textureClass} />
            <div className="relative grid gap-5">
              <Field label={<>{copy.planName} <span className="text-danger">*</span></>} htmlFor="plan-name">
                <Input
                  id="plan-name"
                  value={draft.name}
                  placeholder={copy.planNamePlaceholder}
                  disabled={readOnly}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </Field>
              <Field label={copy.description} htmlFor="plan-description">
                <textarea
                  id="plan-description"
                  value={draft.description}
                  placeholder={copy.descriptionPlaceholder}
                  disabled={readOnly}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  className={textareaClass}
                />
              </Field>
              {readOnly ? (
                <Field label={copy.status} htmlFor="plan-status">
                  <Input id="plan-status" value={statusLabel} disabled readOnly />
                </Field>
              ) : (
                <Dropdown label={copy.status} value={draft.status} options={statusOptions} onChange={(status) => setDraft((current) => ({ ...current, status }))} />
              )}
            </div>
          </section>

          <InfoNote>
            {copy.parentCapNote.before}
            <strong className="font-semibold text-fg">{copy.parentCapNote.strong}</strong>
            {copy.parentCapNote.after}
          </InfoNote>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {masterGroupCaps.map((master) => (
            <GroupPanel
              key={master.name}
              master={master}
              selected={draft.groups.find((group) => group.name === master.name)}
              readOnly={readOnly}
              onAdd={() => addGroup(master)}
              onRemove={() => removeGroup(master.name)}
              onRate={(instrumentType, value) => setRate(master.name, instrumentType, value)}
            />
          ))}

          <div className="flex flex-wrap items-center justify-end gap-3 rounded-full border border-dashed border-line-strong p-1.5 pl-5">
            {readOnly ? (
              <button type="button" onClick={onBack} className={solidPill}>
                <span className="relative">{copy.close}</span>
                <RedDisc icon="check" />
              </button>
            ) : (
              <>
                {draft.groups.length === 0 && (
                  <span className="mr-auto flex items-center gap-2 text-sm text-fg-muted">
                    <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-2 rounded-[2px]" />
                    {copy.tickGroups}
                  </span>
                )}
                <button type="button" onClick={onBack} className={cx(ghostPill, 'pl-4')}>
                  {copy.cancel}
                </button>
                <button type="button" disabled={!isDraftValid(draft)} onClick={() => onSave(draft)} className={solidPill}>
                  <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/solid:translate-x-full motion-reduce:hidden" />
                  <span className="relative">{isNew ? copy.createPlan : copy.saveChanges}</span>
                  <RedDisc icon="check" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Rename popup ───────────── */

function RenameModal({ plan, onClose, onSave }: { plan: CommissionPlan | null; onClose: () => void; onSave: (name: string, description: string) => void }) {
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');

  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={copy.renameTitle}
      calm
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button disabled={name.trim() === ''} onClick={() => onSave(name.trim(), description)}>
            {copy.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={<>{copy.planName} <span className="text-danger">*</span></>} htmlFor="rename-name">
          <Input id="rename-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label={copy.description} htmlFor="rename-description">
          <textarea
            id="rename-description"
            value={description}
            placeholder={copy.descriptionPlaceholder}
            onChange={(event) => setDescription(event.target.value)}
            className={textareaClass}
          />
        </Field>
        <InfoNote>{copy.renameNote}</InfoNote>
      </div>
    </Modal>
  );
}

/* ───────────── Assign popup ───────────── */

function SubIbRow({ option, isOnPlan, isPicked, onPick }: { option: SubIbOption; isOnPlan: boolean; isPicked: boolean; onPick: () => void }) {
  const isChecked = isOnPlan || isPicked;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={isOnPlan}
        onClick={onPick}
        className={cx(
          'group/row flex w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring',
          isPicked ? 'bg-fg/[0.05] ring-line-strong' : 'ring-transparent hover:bg-fg/[0.03]',
          isOnPlan && 'cursor-not-allowed',
        )}
      >
        <span
          style={isChecked && !isOnPlan ? { background: RED } : undefined}
          className={cx(
            'grid size-6 shrink-0 place-items-center rounded-[6px]',
            isChecked ? (isOnPlan ? 'bg-fg text-app' : 'text-white') : 'border-2 border-dashed border-fg/30',
          )}
        >
          {isChecked && <Icon name="check" size={12} />}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-fg/[0.06] text-sm font-black text-fg transition-transform group-hover/row:-rotate-6">
          {option.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-fg">{option.name}</span>
          <span className="block truncate text-xs text-fg-subtle">{option.email}</span>
        </span>
        {isOnPlan && <span className="shrink-0 rounded-full bg-fg/[0.05] px-2 py-0.5 text-[11px] text-fg-subtle ring-1 ring-line">{copy.alreadyOnPlan}</span>}
      </button>
    </li>
  );
}

function AssignModal({ plan, onClose, onAssign }: { plan: CommissionPlan | null; onClose: () => void; onAssign: (subIbIds: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const rows = mockSubIbOptions.filter((option) => matchesSubIb(option, query));

  function togglePick(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={copy.assignTitle(plan?.name ?? '')}
      calm
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button leftIcon="user" disabled={picked.length === 0} onClick={() => onAssign(picked)}>
            {copy.assign}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <InfoNote>
          {copy.assignNote.before}
          <strong className="font-semibold text-fg">{plan?.name}</strong>
          {copy.assignNote.after}
        </InfoNote>
        <Input leftIcon="search" type="search" value={query} placeholder={copy.searchSubIb} aria-label={copy.searchSubIb} onChange={(event) => setQuery(event.target.value)} />
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-muted">{copy.noSubIbMatch}</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {rows.map((option) => (
              <SubIbRow
                key={option.id}
                option={option}
                isOnPlan={plan?.assignedTo.includes(option.id) ?? false}
                isPicked={picked.includes(option.id)}
                onPick={() => togglePick(option.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export default function CommissionPlansPage() {
  const [plans, setPlans] = useState<CommissionPlan[]>(mockCommissionPlans);
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [renaming, setRenaming] = useState<CommissionPlan | null>(null);
  const [assigning, setAssigning] = useState<CommissionPlan | null>(null);
  const openPlan = screen.kind === 'plan' ? (plans.find((plan) => plan.id === screen.planId) ?? null) : null;

  function savePlan(draft: PlanDraft) {
    const details = { ...draft, name: draft.name.trim() };
    if (openPlan) {
      setPlans((current) => current.map((plan) => (plan.id === openPlan.id ? { ...plan, ...details } : plan)));
    } else {
      setPlans((current) => [...current, { id: `PL-${Date.now()}`, ...details, assignedTo: [] }]);
    }
    setScreen({ kind: 'list' });
  }

  function renamePlan(name: string, description: string) {
    if (!renaming) return;
    setPlans((current) => current.map((plan) => (plan.id === renaming.id ? { ...plan, name, description } : plan)));
    setRenaming(null);
  }

  function assignPlan(subIbIds: string[]) {
    if (!assigning) return;
    setPlans((current) => current.map((plan) => (plan.id === assigning.id ? { ...plan, assignedTo: [...plan.assignedTo, ...subIbIds] } : plan)));
    setAssigning(null);
  }

  if (screen.kind !== 'list') {
    return <PlanEditor key={screen.kind === 'plan' ? screen.planId : 'new'} plan={openPlan} onBack={() => setScreen({ kind: 'list' })} onSave={savePlan} />;
  }

  return (
    <>
      <PlanList
        plans={plans}
        onNew={() => setScreen({ kind: 'new' })}
        onView={(plan) => setScreen({ kind: 'plan', planId: plan.id })}
        onRename={setRenaming}
        onAssign={setAssigning}
        onDelete={(plan) => setPlans((current) => current.filter((item) => item.id !== plan.id))}
      />
      <RenameModal key={`rename-${renaming?.id ?? 'none'}`} plan={renaming} onClose={() => setRenaming(null)} onSave={renamePlan} />
      <AssignModal key={`assign-${assigning?.id ?? 'none'}`} plan={assigning} onClose={() => setAssigning(null)} onAssign={assignPlan} />
    </>
  );
}
