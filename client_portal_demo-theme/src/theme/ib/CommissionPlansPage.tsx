'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
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

const currency = 'USD';
const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const textareaClass =
  'min-h-24 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors placeholder:text-fg-subtle focus:border-primary focus:outline-none disabled:opacity-60';

type Screen = { kind: 'list' } | { kind: 'new' } | { kind: 'plan'; planId: string };

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

function StatusTag({ status, onDark }: { status: CommissionPlan['status']; onDark?: boolean }) {
  const isActive = status === 'active';
  const inactiveTone = onDark ? 'border border-white/20 text-white/60' : 'border border-line text-fg-muted';
  return (
    <span className={cx('rounded px-2 py-0.5 text-[10px] font-bold uppercase', isActive ? 'bg-primary text-primary-fg' : inactiveTone)}>
      {isActive ? copy.active : copy.inactive}
    </span>
  );
}

function GoldNote({ icon = 'info', children }: { icon?: 'info' | 'lock'; children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 border-l-2 border-primary bg-primary/[0.05] py-3 pr-4 pl-4 text-sm leading-relaxed text-fg-muted">
      <Icon name={icon} size={15} className="mt-0.5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

/* ───────────── List: plan cards in a grid — graphite face with the sub-IB count, actions on a footer bar ───────────── */

function PlanEntry({ plan, index, onView, onRename, onAssign, onDelete }: {
  plan: CommissionPlan;
  index: number;
  onView: () => void;
  onRename: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const subIbCount = plan.assignedTo.length;
  const isLocked = subIbCount > 0;
  const footButton =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring';

  return (
    <li style={riseDelay(index)} className={cx(cardClass, 'group flex animate-rise flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-primary/50 motion-reduce:animate-none')}>
      <div className="relative isolate overflow-hidden bg-[#18181b] p-5 text-white">
        <Icon name="sliders" size={96} className="pointer-events-none absolute -right-4 -bottom-6 -z-10 text-white/[0.04] transition-transform duration-700 group-hover:rotate-12 motion-reduce:transition-none" />
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold">{plan.name}</span>
            <span className="mt-1.5 inline-block">
              <StatusTag status={plan.status} onDark />
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-mono text-3xl leading-none font-semibold text-(--brand-gleam) tabular-nums">{subIbCount}</span>
            <span className="mt-1 text-[9px] font-semibold tracking-wider text-white/50 uppercase">sub-IB</span>
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-5 py-4 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="user" size={13} />
          {copy.subIbsUsing(subIbCount)}
        </span>
        {isLocked && (
          <span className="inline-flex items-center gap-1.5 text-primary">
            <Icon name="lock" size={13} />
            {copy.lockedOnceAssigned}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 border-t border-line px-3 py-2">
        <button type="button" onClick={onView} className={footButton}>
          <Icon name="eye" size={14} />
          {copy.view}
        </button>
        <button type="button" onClick={onRename} className={footButton}>
          <Icon name="edit" size={14} />
          {copy.rename}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isLocked}
          aria-label={copy.delete}
          title={isLocked ? copy.deleteBlocked : copy.delete}
          className="grid size-9 place-items-center rounded-lg text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <Icon name="xCircle" size={15} />
        </button>
        <button
          type="button"
          onClick={onAssign}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="user" size={14} />
          {copy.assign}
        </button>
      </div>
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-primary pl-4">
        <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
        <Button leftIcon="plus" onClick={onNew}>
          {copy.newPlan}
        </Button>
      </header>
      {plans.length === 0 ? (
        <section className={cx(cardClass, 'flex flex-col items-center gap-2 border-dashed px-4 py-14 text-center')}>
          <span className="grid size-12 place-items-center rounded-xl bg-[#18181b] text-(--brand-gleam) ring-1 ring-primary/30">
            <Icon name="sliders" size={20} />
          </span>
          <p className="text-base font-bold text-fg">{copy.emptyTitle}</p>
          <p className="max-w-sm text-sm text-fg-muted">{copy.emptyBody}</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <PlanEntry
              key={plan.id}
              plan={plan}
              index={index}
              onView={() => onView(plan)}
              onRename={() => onRename(plan)}
              onAssign={() => onAssign(plan)}
              onDelete={() => onDelete(plan)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Plan editor ───────────── */

function RateRow({ groupName, instrumentType, value, readOnly, onChange }: {
  groupName: string;
  instrumentType: string;
  value: number;
  readOnly: boolean;
  onChange: (value: number) => void;
}) {
  const cap = capFor(groupName, instrumentType);
  const isOver = value > cap;
  const inputId = `rate-${groupName}-${instrumentType}`;

  return (
    <li className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_8rem] sm:items-center">
      <label htmlFor={inputId} className="text-sm font-semibold text-fg">
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
      <span className="font-mono text-sm font-semibold text-primary tabular-nums sm:text-right">{formatMoney(cap, currency)}</span>
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
  const smallButton = 'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors';

  return (
    <section className={cx(cardClass, 'overflow-hidden', isIncluded && 'border-l-4 border-l-primary')}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="flex items-center gap-3">
          <span className={cx('grid size-5 place-items-center rounded', isIncluded ? 'bg-primary text-primary-fg' : 'border border-line')}>
            {isIncluded && <Icon name="check" size={12} />}
          </span>
          <span className="text-base font-bold text-fg">{master.name}</span>
        </span>
        {readOnly || isIncluded ? (
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button type="button" onClick={onRemove} className="h-8 px-2 text-xs font-semibold text-fg-muted hover:text-danger">
                {copy.remove}
              </button>
            )}
            {isIncluded && (
              <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className={cx(smallButton, 'border-line text-fg hover:border-primary')}>
                <Icon name="chevronDown" size={13} className={cx('transition-transform', isOpen && 'rotate-180')} />
                {copy.setRates}
              </button>
            )}
          </div>
        ) : (
          <button type="button" onClick={onAdd} className={cx(smallButton, 'border-primary text-primary hover:bg-primary hover:text-primary-fg')}>
            <Icon name="plus" size={13} />
            {copy.add}
          </button>
        )}
      </div>
      {showRates && (
        <div className="animate-rise border-t border-line bg-surface-2/40 px-5 pb-2 motion-reduce:animate-none">
          <div aria-hidden="true" className="hidden gap-x-4 pt-3 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_8rem]">
            <span>{copy.instrumentType}</span>
            <span>{copy.yourRate}</span>
            <span className="text-right">{copy.parentCap}</span>
          </div>
          <ul className="divide-y divide-line">
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
    <div className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
      <Button variant="outline" size="sm" leftIcon="arrowLeft" onClick={onBack} className="w-fit">
        {copy.back}
      </Button>

      {readOnly && <GoldNote icon="lock">{copy.readOnly}</GoldNote>}

      <section className={cx(cardClass, 'grid gap-6 p-6 lg:grid-cols-[14rem_minmax(0,1fr)]')}>
        <div className="flex flex-col gap-2 rounded-2xl bg-[#18181b] p-5">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-white/55 uppercase">{copy.planName}</span>
          <span className="truncate text-xl font-bold text-(--brand-gleam)">{draft.name.trim() || '—'}</span>
          <span className="mt-auto pt-4 text-xs text-white/60">{statusLabel}</span>
        </div>
        <div className="grid max-w-xl gap-5">
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
          <div className="sm:w-56">
            {readOnly ? (
              <Field label={copy.status} htmlFor="plan-status">
                <Input id="plan-status" value={statusLabel} disabled readOnly />
              </Field>
            ) : (
              <Dropdown label={copy.status} value={draft.status} options={statusOptions} onChange={(status) => setDraft((current) => ({ ...current, status }))} />
            )}
          </div>
        </div>
      </section>

      <GoldNote>
        {copy.parentCapNote.before}
        <strong className="font-semibold text-fg">{copy.parentCapNote.strong}</strong>
        {copy.parentCapNote.after}
      </GoldNote>

      <div className="flex flex-col gap-3">
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
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        {readOnly ? (
          <Button onClick={onBack}>{copy.close}</Button>
        ) : (
          <>
            {draft.groups.length === 0 && <span className="text-sm text-fg-muted">{copy.tickGroups}</span>}
            <Button variant="outline" onClick={onBack}>
              {copy.cancel}
            </Button>
            <Button disabled={!isDraftValid(draft)} onClick={() => onSave(draft)}>
              {isNew ? copy.createPlan : copy.saveChanges}
            </Button>
          </>
        )}
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
        <GoldNote>{copy.renameNote}</GoldNote>
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
          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring',
          isPicked ? 'border-primary bg-primary/[0.06]' : 'border-transparent hover:border-line',
          isOnPlan && 'cursor-not-allowed',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#18181b] font-mono text-sm font-bold text-(--brand-gleam)">
          {option.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{option.name}</span>
          <span className="block truncate text-xs text-fg-subtle">{option.email}</span>
        </span>
        {isOnPlan && <span className="shrink-0 text-[11px] text-fg-subtle">{copy.alreadyOnPlan}</span>}
        <span className={cx('grid size-5 shrink-0 place-items-center rounded', isChecked ? 'bg-primary text-primary-fg' : 'border border-line')}>
          {isChecked && <Icon name="check" size={11} />}
        </span>
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
        <GoldNote>
          {copy.assignNote.before}
          <strong className="font-semibold text-fg">{plan?.name}</strong>
          {copy.assignNote.after}
        </GoldNote>
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
