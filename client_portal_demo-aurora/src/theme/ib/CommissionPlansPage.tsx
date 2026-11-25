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
import './ibCommissionPlans.css';

/*
 * Aurora Commission Plans — "order book ladder": a quote-terminal header with a live tape of every plan; each plan is an
 * order book (rate per lot as the bid against the parent cap as the ask, depth bars per instrument, a volume histogram of
 * the sub-IBs on it); the editor is a ladder of group books beside a sticky order ticket.
 */
const currency = 'USD';
const MAX_VOLUME_BARS = 12;
const MIN_TAPE_ITEMS = 6;
const bookClass = 'relative overflow-hidden rounded-[26px] bg-surface ring-1 ring-line';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const bookColumns = 'grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] gap-2';
const textareaClass =
  'min-h-24 w-full resize-y rounded-[14px] bg-fg/[0.03] px-4 py-3 text-sm text-fg ring-1 ring-line-strong transition-shadow placeholder:text-fg-subtle focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-60';
const primaryButton =
  'group/cta relative inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-[14px] bg-primary px-4 text-sm font-bold text-on-primary transition-[translate,opacity,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none';
const ghostButton =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-[14px] px-4 text-sm font-bold text-fg ring-1 ring-line-strong transition-colors hover:bg-fg/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const orderButton =
  'inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3 text-xs font-bold text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const smallButton =
  'inline-flex h-9 items-center gap-1.5 rounded-[11px] px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

type Screen = { kind: 'list' } | { kind: 'new' } | { kind: 'plan'; planId: string };

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

// Flips true on the first frame so depth bars grow from zero instead of appearing full.
function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return grown;
}

function Shine() {
  return (
    <span aria-hidden="true" className="cpl-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent" />
  );
}

function StatusBadge({ status }: { status: CommissionPlan['status'] }) {
  const isActive = status === 'active';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-2 rounded-[8px] px-2 py-1 font-mono text-[11px] font-bold tracking-wider uppercase ring-1',
        isActive ? 'bg-success/10 text-success ring-success/30' : 'bg-fg/[0.04] text-fg-muted ring-line',
      )}
    >
      <span aria-hidden="true" className="relative grid size-2 place-items-center">
        {isActive && <span className="cpl-halo absolute inset-0 rounded-full bg-current" />}
        <span className="relative size-2 rounded-full bg-current" />
      </span>
      {isActive ? copy.active : copy.inactive}
    </span>
  );
}

function TerminalNote({ icon = 'info', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 rounded-[16px] bg-fg/[0.03] px-4 py-3 text-sm leading-relaxed text-fg-muted ring-1 ring-line">
      <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[9px] bg-primary/15 text-primary">
        <Icon name={icon} size={13} />
      </span>
      <span className="pt-0.5">{children}</span>
    </p>
  );
}

// Shown on an assigned plan: a striped "trading halted" band over the read-only notice.
function HaltBanner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="cpl-rise overflow-hidden rounded-[18px] bg-warning/[0.08] ring-1 ring-warning/30">
      <span aria-hidden="true" className="cpl-stripes block h-1.5 w-full text-warning/70" />
      <p className="flex items-start gap-3 px-4 py-3 text-sm leading-relaxed text-fg-muted">
        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-warning/15 text-warning">
          <Icon name="lock" size={13} />
        </span>
        <span className="pt-0.5">{children}</span>
      </p>
    </div>
  );
}

function GhostLadder({ rows, className }: { rows: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cx('block w-full space-y-1.5', className)}>
      {Array.from({ length: rows }, (_, row) => (
        <span key={row} className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-2">
          <span style={{ animationDelay: `${row * 0.3}s` }} className="cpl-ghost h-3 origin-right rounded-[4px] bg-success/25" />
          <span className="h-1.5 rounded-full bg-fg/15" />
          <span style={{ animationDelay: `${row * 0.3 + 0.15}s` }} className="cpl-ghost h-3 origin-left rounded-[4px] bg-accent/25" />
        </span>
      ))}
    </span>
  );
}

/* ───────────── List: quote header + live tape, one order book per plan ───────────── */

function PlanTape({ plans }: { plans: CommissionPlan[] }) {
  if (plans.length === 0) return null;
  const repeats = Math.ceil(MIN_TAPE_ITEMS / plans.length);
  const loop = Array.from({ length: repeats }, () => plans).flat();

  const strip = (copyIndex: number) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10">
      {loop.map((plan, itemIndex) => (
        <li key={`${copyIndex}-${itemIndex}-${plan.id}`} className="flex items-center gap-3 font-mono text-xs whitespace-nowrap tabular-nums">
          <span className="font-bold text-fg">{plan.name}</span>
          <span className={plan.status === 'active' ? 'text-success' : 'text-fg-subtle'}>
            {plan.status === 'active' ? '▲' : '■'} {plan.status === 'active' ? copy.active : copy.inactive}
          </span>
          <span className="text-fg-muted">{copy.subIbsUsing(plan.assignedTo.length)}</span>
          {plan.groups.flatMap((group) =>
            group.rates.map((rate) => (
              <span key={`${group.name}-${rate.instrumentType}`} className="text-fg-muted">
                {rate.instrumentType} <span className="font-bold text-success">{formatMoney(rate.ratePerLot, currency)}</span>
                <span className="text-accent">/{formatMoney(capFor(group.name, rate.instrumentType), currency)}</span>
              </span>
            )),
          )}
        </li>
      ))}
    </ul>
  );

  // Purely decorative: every value on the tape is also in the plan books below.
  return (
    <div aria-hidden="true" className="relative overflow-hidden border-t border-line bg-fg/[0.02] [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div className="cpl-tape flex w-max py-2.5">
        {strip(0)}
        {strip(1)}
      </div>
    </div>
  );
}

function QuoteHeader({ plans, onNew }: { plans: CommissionPlan[]; onNew: () => void }) {
  const activeCount = plans.filter((plan) => plan.status === 'active').length;
  return (
    <header className={cx(bookClass, 'cpl-rise')}>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center rounded-[16px] bg-primary text-on-primary">
            <span className="cpl-pulse absolute inset-0 rounded-[16px] ring-2 ring-primary" />
            <Icon name="sliders" size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl leading-none font-black tracking-[-0.03em] text-fg sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-fg-muted tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                {copy.active} {activeCount}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-fg-subtle" />
                {copy.inactive} {plans.length - activeCount}
              </span>
            </p>
          </div>
        </div>
        <button type="button" onClick={onNew} className={primaryButton}>
          <Shine />
          <Icon name="plus" size={15} className="relative" />
          <span className="relative">{copy.newPlan}</span>
        </button>
      </div>
      <PlanTape plans={plans} />
    </header>
  );
}

function PlanBookRows({ groups, grown }: { groups: PlanGroup[]; grown: boolean }) {
  let rowIndex = 0;
  return (
    <div className="px-3 py-3 sm:px-4">
      <p aria-hidden="true" className={cx(captionClass, bookColumns, 'px-2 pb-1 text-fg-subtle')}>
        <span className="truncate text-right">{copy.yourRate}</span>
        <span className="self-end text-center leading-tight">{copy.instrumentType}</span>
        <span className="truncate">{copy.parentCap}</span>
      </p>
      {groups.map((group) => (
        <div key={group.name}>
          <p className={cx(captionClass, 'flex items-center gap-2 px-2 py-1.5 text-fg-muted')}>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            {group.name}
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </p>
          <ul>
            {group.rates.map((rate) => {
              const cap = capFor(group.name, rate.instrumentType);
              const depth = cap > 0 ? Math.min(rate.ratePerLot / cap, 1) * 100 : 0;
              const row = rowIndex++;
              return (
                <li
                  key={rate.instrumentType}
                  style={{ animationDelay: `${row * 0.45}s` }}
                  className={cx('cpl-flash items-center rounded-[10px] px-2 py-1 font-mono text-xs tabular-nums', bookColumns)}
                >
                  <span className="relative flex h-7 items-center justify-end overflow-hidden rounded-[7px]">
                    <span
                      style={{ width: grown ? `${depth}%` : '0%', transitionDelay: `${200 + row * 120}ms` }}
                      className="absolute inset-y-0 right-0 rounded-[7px] bg-success/20 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                    />
                    <span className="relative pr-2 font-bold text-success">{formatMoney(rate.ratePerLot, currency)}</span>
                  </span>
                  <span className="truncate text-center font-sans font-semibold text-fg">{rate.instrumentType}</span>
                  <span className="relative flex h-7 items-center overflow-hidden rounded-[7px]">
                    <span
                      style={{ width: grown ? '100%' : '0%', transitionDelay: `${260 + row * 120}ms` }}
                      className="absolute inset-y-0 left-0 rounded-[7px] bg-accent/15 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                    />
                    <span className="relative pl-2 font-bold text-accent">{formatMoney(cap, currency)}</span>
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

function PlanBook({ plan, index, onView, onRename, onAssign, onDelete }: {
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
  const volumeBars = Math.min(subIbCount, MAX_VOLUME_BARS);

  return (
    <li style={stagger(index, 90, 120)} className={cx(bookClass, 'cpl-rise flex flex-col transition-shadow duration-300 hover:ring-line-strong')}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary/15 text-primary">
            <Icon name="sliders" size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-tight text-fg">{plan.name}</p>
            {plan.description && <p className="truncate text-xs text-fg-subtle">{plan.description}</p>}
          </div>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      {plan.groups.length > 0 && <PlanBookRows groups={plan.groups} grown={grown} />}

      {/* Sub-IBs on the plan: the count plus one volume bar each (a dashed bar when nobody is on it). */}
      <div className="mt-auto flex items-end justify-between gap-4 border-t border-dashed border-line px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-4xl leading-none font-black tracking-tighter text-fg tabular-nums">{subIbCount}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="user" size={12} />
              {copy.subIbsUsing(subIbCount)}
            </span>
            {isLocked && (
              <span className="inline-flex items-center gap-1.5 text-warning">
                <Icon name="lock" size={12} />
                {copy.lockedOnceAssigned}
              </span>
            )}
          </p>
        </div>
        <span aria-hidden="true" className="flex h-12 shrink-0 items-end gap-1">
          {volumeBars === 0 ? (
            <span className="h-full w-3 rounded-[3px] border-2 border-dashed border-fg/25" />
          ) : (
            Array.from({ length: volumeBars }, (_, bar) => (
              <span
                key={bar}
                style={{ height: `${55 + ((bar * 37) % 45)}%`, animationDelay: `${bar * 0.18}s` }}
                className="cpl-volume w-2.5 origin-bottom rounded-t-[3px] bg-primary"
              />
            ))
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5 border-t border-line bg-fg/[0.02] p-2">
        <button type="button" onClick={onView} className={orderButton}>
          <Icon name="eye" size={14} />
          {copy.view}
        </button>
        <button type="button" onClick={onRename} className={orderButton}>
          <Icon name="pencil" size={14} />
          {copy.rename}
        </button>
        <button
          type="button"
          onClick={onAssign}
          className="group/cta relative inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-[12px] bg-primary px-3.5 text-xs font-bold text-on-primary transition-[translate,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Shine />
          <Icon name="user" size={14} className="relative" />
          <span className="relative">{copy.assign}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isLocked}
          aria-label={copy.delete}
          title={isLocked ? copy.deleteBlocked : copy.delete}
          className="ml-auto grid size-10 shrink-0 place-items-center rounded-[12px] text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Icon name="xCircle" size={15} />
        </button>
      </div>
    </li>
  );
}

function NewPlanSlot({ index, onNew }: { index: number; onNew: () => void }) {
  return (
    <li style={stagger(index, 90, 120)} className="cpl-rise">
      <button
        type="button"
        onClick={onNew}
        className="flex h-full min-h-72 w-full flex-col items-center justify-center gap-5 rounded-[26px] border-2 border-dashed border-line-strong p-6 text-fg-muted transition-colors duration-300 hover:border-primary/60 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <GhostLadder rows={4} className="max-w-56" />
        <span className="inline-flex items-center gap-2 font-mono text-sm font-bold">
          <Icon name="plus" size={14} />
          {copy.newPlan}
          <span aria-hidden="true" className="cpl-caret inline-block h-4 w-2 rounded-[1px] bg-primary" />
        </span>
      </button>
    </li>
  );
}

function EmptyBook() {
  return (
    <div className="cpl-rise flex flex-col items-center gap-4 rounded-[26px] border-2 border-dashed border-line-strong px-4 py-14 text-center">
      <GhostLadder rows={5} className="max-w-64" />
      <p className="text-base font-black text-fg">{copy.emptyTitle}</p>
      <p className="max-w-sm text-sm text-fg-muted">{copy.emptyBody}</p>
    </div>
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
    <div className="space-y-5">
      <QuoteHeader plans={plans} onNew={onNew} />

      {plans.length === 0 ? (
        <EmptyBook />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan, index) => (
            <PlanBook
              key={plan.id}
              plan={plan}
              index={index}
              onView={() => onView(plan)}
              onRename={() => onRename(plan)}
              onAssign={() => onAssign(plan)}
              onDelete={() => onDelete(plan)}
            />
          ))}
          <NewPlanSlot index={plans.length} onNew={onNew} />
        </ul>
      )}
    </div>
  );
}

/* ───────────── Plan editor: a ladder of group books beside a sticky order ticket ───────────── */

function RateRung({ groupName, instrumentType, value, readOnly, onChange }: {
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
    <li className="grid gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[minmax(0,7rem)_8.5rem_minmax(0,1fr)] sm:items-center">
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
        <span aria-hidden="true" className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-[8px] bg-fg/[0.04] ring-1 ring-line">
          <span className="cpl-ticks absolute inset-0" />
          <span
            style={{ width: `${fill}%` }}
            className={cx('absolute inset-y-0 left-0 transition-[width] duration-500 ease-out motion-reduce:transition-none', isOver ? 'bg-danger/35' : 'bg-success/25')}
          />
          <span
            style={{ left: `${fill}%` }}
            className={cx('absolute inset-y-0 w-0.5 -translate-x-1/2 transition-[left] duration-500 ease-out motion-reduce:transition-none', isOver ? 'bg-danger' : 'bg-success')}
          />
        </span>
        <span className="shrink-0 rounded-[8px] bg-accent/15 px-2 py-1 font-mono text-xs font-bold text-accent tabular-nums">{formatMoney(cap, currency)}</span>
      </span>
    </li>
  );
}

function GroupBook({ master, selected, readOnly, index, onAdd, onRemove, onRate }: {
  master: PlanGroup;
  selected: PlanGroup | undefined;
  readOnly: boolean;
  index: number;
  onAdd: () => void;
  onRemove: () => void;
  onRate: (instrumentType: string, value: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(!readOnly);
  const isIncluded = selected !== undefined;
  const showRates = isIncluded && isOpen;

  return (
    <section style={stagger(index, 90, 160)} className={cx(bookClass, 'cpl-rise', isIncluded && 'ring-primary/40')}>
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cx(
              'grid size-7 shrink-0 place-items-center rounded-[8px]',
              isIncluded ? 'bg-primary text-on-primary' : 'border-2 border-dashed border-fg/30',
            )}
          >
            {isIncluded && <Icon name="check" size={13} />}
          </span>
          <span className="truncate text-lg font-black tracking-tight text-fg">{master.name}</span>
          <span className="hidden font-mono text-[11px] text-fg-subtle sm:inline">· {master.rates.length}</span>
        </span>
        {readOnly || isIncluded ? (
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button type="button" onClick={onRemove} className={cx(smallButton, 'text-fg-muted hover:bg-danger/10 hover:text-danger')}>
                {copy.remove}
              </button>
            )}
            {isIncluded && (
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className={cx(smallButton, 'text-fg ring-1 ring-line-strong hover:bg-fg/[0.05]')}
              >
                <Icon name="chevronDown" size={13} className={cx('transition-transform duration-300', isOpen && 'rotate-180')} />
                {copy.setRates}
              </button>
            )}
          </div>
        ) : (
          <button type="button" onClick={onAdd} className={cx(smallButton, 'group/cta relative overflow-hidden bg-primary text-on-primary hover:bg-primary-hover')}>
            <Shine />
            <Icon name="plus" size={13} className="relative" />
            <span className="relative">{copy.add}</span>
          </button>
        )}
      </div>
      {showRates && (
        <div className="animate-rise border-t border-dashed border-line-strong px-4 pb-2 motion-reduce:animate-none sm:px-5">
          <div aria-hidden="true" className={cx(captionClass, 'hidden gap-x-4 pt-3 text-fg-subtle sm:grid sm:grid-cols-[minmax(0,7rem)_8.5rem_minmax(0,1fr)]')}>
            <span>{copy.instrumentType}</span>
            <span>{copy.yourRate}</span>
            <span className="text-right">{copy.parentCap}</span>
          </div>
          <ul className="divide-y divide-dashed divide-line">
            {selected.rates.map((rate) => (
              <RateRung
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
    <div className="space-y-5">
      <header className={cx(bookClass, 'cpl-rise flex flex-wrap items-center gap-4 p-4 sm:p-5')}>
        <button type="button" onClick={onBack} className={ghostButton}>
          <Icon name="arrowLeft" size={14} />
          {copy.back}
        </button>
        <span aria-hidden="true" className="hidden h-8 w-px bg-line sm:block" />
        <h1 className="min-w-0 truncate font-display text-2xl leading-none font-black tracking-[-0.03em] text-fg sm:text-3xl">{isNew ? copy.newPlan : plan.name}</h1>
        {!isNew && <StatusBadge status={plan.status} />}
      </header>

      {readOnly && <HaltBanner>{copy.readOnly}</HaltBanner>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <aside style={stagger(1, 90, 80)} className={cx(bookClass, 'cpl-rise lg:sticky lg:top-24 lg:order-2')}>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-line px-5 py-3.5">
            <span className="flex min-w-0 items-center gap-2 font-mono text-sm font-bold text-fg">
              <Icon name="sliders" size={14} className="shrink-0 text-primary" />
              <span className={cx('truncate', draft.name.trim() === '' && 'text-fg-subtle')}>{draft.name.trim() || copy.planNamePlaceholder}</span>
              {!readOnly && <span aria-hidden="true" className="cpl-caret inline-block h-4 w-1.5 shrink-0 rounded-[1px] bg-primary" />}
            </span>
            <StatusBadge status={draft.status} />
          </div>

          <div className="grid gap-5 p-5">
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
            <TerminalNote>
              {copy.parentCapNote.before}
              <strong className="font-semibold text-fg">{copy.parentCapNote.strong}</strong>
              {copy.parentCapNote.after}
            </TerminalNote>
          </div>

          <div className="flex flex-col gap-3 border-t border-line bg-fg/[0.02] p-4">
            {readOnly ? (
              <button type="button" onClick={onBack} className={cx(primaryButton, 'w-full justify-center')}>
                <Icon name="check" size={15} />
                {copy.close}
              </button>
            ) : (
              <>
                {draft.groups.length === 0 && (
                  <span className="flex items-center gap-2 text-sm text-fg-muted">
                    <span aria-hidden="true" className="cpl-caret size-2 shrink-0 rounded-full bg-warning" />
                    {copy.tickGroups}
                  </span>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={onBack} className={cx(ghostButton, 'justify-center')}>
                    {copy.cancel}
                  </button>
                  <button type="button" disabled={!isDraftValid(draft)} onClick={() => onSave(draft)} className={cx(primaryButton, 'justify-center')}>
                    <Shine />
                    <Icon name="check" size={15} className="relative" />
                    <span className="relative">{isNew ? copy.createPlan : copy.saveChanges}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4 lg:order-1">
          {masterGroupCaps.map((master, index) => (
            <GroupBook
              key={master.name}
              master={master}
              index={index}
              selected={draft.groups.find((group) => group.name === master.name)}
              readOnly={readOnly}
              onAdd={() => addGroup(master)}
              onRemove={() => removeGroup(master.name)}
              onRate={(instrumentType, value) => setRate(master.name, instrumentType, value)}
            />
          ))}
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
        <TerminalNote>{copy.renameNote}</TerminalNote>
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
          'group/row flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring',
          isPicked ? 'bg-primary/10 ring-primary/40' : 'ring-transparent hover:bg-fg/[0.03]',
          isOnPlan && 'cursor-not-allowed',
        )}
      >
        <span
          className={cx(
            'grid size-6 shrink-0 place-items-center rounded-[7px]',
            isChecked ? (isOnPlan ? 'bg-fg text-app' : 'bg-primary text-on-primary') : 'border-2 border-dashed border-fg/30',
          )}
        >
          {isChecked && <Icon name="check" size={12} />}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-fg/[0.06] font-mono text-sm font-black text-fg transition-transform group-hover/row:-rotate-6">
          {option.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-fg">{option.name}</span>
          <span className="block truncate text-xs text-fg-subtle">{option.email}</span>
        </span>
        {isOnPlan && <span className="shrink-0 rounded-[8px] bg-fg/[0.05] px-2 py-0.5 text-[11px] text-fg-subtle ring-1 ring-line">{copy.alreadyOnPlan}</span>}
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
        <TerminalNote>
          {copy.assignNote.before}
          <strong className="font-semibold text-fg">{plan?.name}</strong>
          {copy.assignNote.after}
        </TerminalNote>
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
