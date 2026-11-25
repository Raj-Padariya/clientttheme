'use client';

import { useState, type CSSProperties } from 'react';
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
const textareaClass =
  'min-h-24 w-full resize-y rounded-xl bg-surface/70 px-3.5 py-2.5 text-sm text-fg ring-1 ring-line-strong transition-colors placeholder:text-fg-subtle focus:ring-primary focus:outline-none disabled:opacity-60';

type Screen = { kind: 'list' } | { kind: 'new' } | { kind: 'plan'; planId: string };

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

function StatusBadge({ status }: { status: CommissionPlan['status'] }) {
  const isActive = status === 'active';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
        isActive ? 'bg-success/10 text-success ring-success/30' : 'bg-fg/5 text-fg-muted ring-line',
      )}
    >
      <span className={cx('size-1.5 rounded-full', isActive ? 'bg-success' : 'bg-fg-subtle')} />
      {isActive ? copy.active : copy.inactive}
    </span>
  );
}

function InfoNote({ icon = 'info', children }: { icon?: 'info' | 'lock'; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-2xl bg-primary/[0.06] px-4 py-3 text-sm leading-relaxed text-fg-muted ring-1 ring-primary/15">
      <Icon name={icon} size={15} className="mt-0.5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

/* ───────────── List: each plan is an orbit card — dashed ring holds the sub-IB count ───────────── */

function PlanCard({ plan, index, onView, onRename, onAssign, onDelete }: {
  plan: CommissionPlan;
  index: number;
  onView: () => void;
  onRename: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const subIbCount = plan.assignedTo.length;
  const isLocked = subIbCount > 0;
  const actionClass =
    'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-fg ring-1 ring-line-strong transition-colors hover:ring-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring';

  return (
    <li style={riseDelay(index)} className="orbit-card flex animate-rise flex-col gap-4 p-4 motion-reduce:animate-none sm:p-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="relative grid size-14 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className={cx('absolute inset-0 rounded-full border border-dashed', isLocked ? 'border-primary/55 motion-safe:animate-orbit-spin' : 'border-primary/25')}
          />
          <span className="grid size-10 place-items-center rounded-full bg-primary/12 font-mono text-base font-bold text-primary">{subIbCount}</span>
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-lg font-bold text-fg">{plan.name}</span>
            <StatusBadge status={plan.status} />
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="user" size={13} />
              {copy.subIbsUsing(subIbCount)}
            </span>
            {isLocked && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="lock" size={13} />
                {copy.lockedOnceAssigned}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onView} className={actionClass}>
          <Icon name="eye" size={14} />
          {copy.view}
        </button>
        <button type="button" onClick={onRename} className={actionClass}>
          <Icon name="pencil" size={14} />
          {copy.rename}
        </button>
        <button type="button" onClick={onAssign} className={cx(actionClass, 'bg-primary/12 ring-primary/40')}>
          <Icon name="user" size={14} className="text-primary" />
          {copy.assign}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isLocked}
          aria-label={copy.delete}
          title={isLocked ? copy.deleteBlocked : copy.delete}
          className="grid size-9 place-items-center rounded-xl text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Icon name="xCircle" size={15} />
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
        <Button leftIcon="plus" onClick={onNew}>
          {copy.newPlan}
        </Button>
      </header>
      {plans.length === 0 ? (
        <section className="orbit-card flex flex-col items-center gap-2 px-4 py-14 text-center">
          <Icon name="sliders" size={22} className="text-primary" />
          <p className="text-base font-bold text-fg">{copy.emptyTitle}</p>
          <p className="max-w-sm text-sm text-fg-muted">{copy.emptyBody}</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan, index) => (
            <PlanCard
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

/* ───────────── Plan editor: details panel, cap note, then one collapsible panel per master group ───────────── */

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
    <li className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem] sm:items-center">
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
      <span className="flex items-center gap-3 sm:justify-end">
        <span aria-hidden="true" className="h-1 w-14 overflow-hidden rounded-full bg-primary/10">
          <span className={cx('block h-full rounded-full', isOver ? 'bg-danger/70' : 'bg-primary/60')} style={{ width: `${fill}%` }} />
        </span>
        <span className="font-mono text-sm text-fg-muted tabular-nums">{formatMoney(cap, currency)}</span>
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

  return (
    <section className={cx('orbit-card overflow-hidden', isIncluded && 'ring-1 ring-primary/30')}>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <span className="flex items-center gap-3">
          <span className={cx('grid size-5 place-items-center rounded-md ring-1', isIncluded ? 'bg-primary/20 text-primary ring-primary/50' : 'ring-line-strong')}>
            {isIncluded && <Icon name="check" size={12} />}
          </span>
          <span className="text-base font-bold text-fg">{master.name}</span>
        </span>
        {readOnly || isIncluded ? (
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button type="button" onClick={onRemove} className="h-8 rounded-lg px-3 text-xs font-semibold text-fg-muted hover:text-danger">
                {copy.remove}
              </button>
            )}
            {isIncluded && (
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-fg ring-1 ring-line-strong hover:ring-primary/50"
              >
                <Icon name="chevronDown" size={13} className={cx('transition-transform', isOpen && 'rotate-180')} />
                {copy.setRates}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-fg ring-1 ring-primary/40 hover:bg-primary/10"
          >
            <Icon name="plus" size={13} className="text-primary" />
            {copy.add}
          </button>
        )}
      </div>
      {showRates && (
        <div className="animate-rise border-t border-line px-4 pb-2 motion-reduce:animate-none sm:px-5">
          <div aria-hidden="true" className="hidden gap-x-4 pt-3 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_9rem]">
            <span>{copy.instrumentType}</span>
            <span>{copy.yourRate}</span>
            <span className="text-right">{copy.parentCap}</span>
          </div>
          <ul className="divide-y divide-line/60">
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

      {readOnly && <InfoNote icon="lock">{copy.readOnly}</InfoNote>}

      <section className="orbit-card relative isolate overflow-hidden p-5 sm:p-6">
        <span aria-hidden="true" className="absolute -top-16 -right-16 -z-10 size-48 rounded-full border border-dashed border-primary/20" />
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

      <InfoNote>
        {copy.parentCapNote.before}
        <strong className="font-semibold text-fg">{copy.parentCapNote.strong}</strong>
        {copy.parentCapNote.after}
      </InfoNote>

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

      <div className="flex flex-wrap items-center justify-end gap-3">
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
          'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring',
          isPicked ? 'bg-primary/12 ring-1 ring-primary/40' : 'hover:bg-fg/[0.03]',
          isOnPlan && 'cursor-not-allowed',
        )}
      >
        <span className={cx('grid size-5 shrink-0 place-items-center rounded-full ring-1', isChecked ? 'bg-primary/25 text-primary ring-primary/50' : 'ring-line-strong')}>
          {isChecked && <Icon name="check" size={11} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{option.name}</span>
          <span className="block truncate text-xs text-fg-subtle">{option.email}</span>
        </span>
        {isOnPlan && <span className="shrink-0 text-[11px] text-fg-subtle">{copy.alreadyOnPlan}</span>}
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
