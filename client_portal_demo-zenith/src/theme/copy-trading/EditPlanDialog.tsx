'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { editPlanCopy as copy, planDetails, SETTLEMENT_CYCLES, type MasterPlanRow } from './myPlansData';

const SAVE_DELAY_MS = 900;

interface EditPlanDialogProps {
  /** The plan being edited; `null` keeps the dialog closed. */
  plan: MasterPlanRow | null;
  onClose: () => void;
}

const textareaClass =
  'min-h-24 w-full resize-y rounded-[18px] border border-line-strong bg-surface/70 px-3.5 py-3 text-sm text-fg outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:border-fg/40 focus:border-fg/60 focus:bg-surface focus:ring-2 focus:ring-fg/10 motion-reduce:transition-none';

const parseNumber = (raw: string) => (raw.trim() === '' ? Number.NaN : Number(raw));

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span aria-hidden="true" className="ml-1 text-[var(--zenith-red)]">
        *
      </span>
      <span className="sr-only"> ({copy.required})</span>
    </>
  );
}

/** One numbered step of the form, hung on the dashed route that runs down the left edge. */
function Step({ index, icon, title, children }: { index: number; icon: IconName; title: string; children: ReactNode }) {
  return (
    <fieldset style={{ animationDelay: `${120 + index * 110}ms` }} className="relative animate-rise pl-12 motion-reduce:animate-none">
      <span aria-hidden="true" className="absolute top-0 left-0 grid size-9 place-items-center rounded-full bg-fg text-app">
        <Icon name={icon} size={15} />
      </span>
      <legend className="mb-4 flex items-baseline gap-2 pt-2">
        <span className="font-mono text-[10.5px] font-bold text-[var(--zenith-red)]">0{index + 1}</span>
        <span className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{title}</span>
      </legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

const RATE_PIXELS = 10;

// Commission rate as a column of pixel cells (10% each) with the percentage underneath.
function RateRing({ rate }: { rate: number }) {
  const share = Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) / 100 : 0;
  const litCells = Math.round(share * RATE_PIXELS);
  return (
    <span aria-hidden="true" className="flex shrink-0 flex-col items-center gap-1">
      <span className="grid grid-cols-5 gap-0.5">
        {Array.from({ length: RATE_PIXELS }, (_, index) => {
          const isLit = index < litCells;
          const isEdge = index === litCells - 1;
          return (
            <span
              key={index}
              style={isEdge ? { background: 'var(--zenith-red)' } : undefined}
              className={cx('size-2.5 rounded-[2px] transition-colors duration-300 motion-reduce:transition-none', isLit ? 'bg-fg' : 'bg-fg/10')}
            />
          );
        })}
      </span>
      <span className="font-mono text-[10px] font-semibold text-fg tabular-nums">{Math.round(share * 100)}%</span>
    </span>
  );
}

function EditPlanForm({ plan, formId, onSaved, onSavingChange }: { plan: MasterPlanRow; formId: string; onSaved: () => void; onSavingChange: (saving: boolean) => void }) {
  const detail = planDetails[plan.id];
  const [name, setName] = useState(plan.name);
  const [strategy, setStrategy] = useState(detail?.strategyDescription ?? '');
  const [risk, setRisk] = useState(detail?.riskInformation ?? '');
  const [rate, setRate] = useState(String(plan.commissionPercent));
  const [cycle, setCycle] = useState<string>(detail?.settlement.cycle ?? SETTLEMENT_CYCLES[0]);
  const [graceDays, setGraceDays] = useState(String(detail?.noFeeGraceDays ?? 0));
  const [minCapital, setMinCapital] = useState(String(detail?.minimumCapital ?? ''));
  const [maxCopiers, setMaxCopiers] = useState(plan.maxCopiers === null ? '' : String(plan.maxCopiers));
  const [showErrors, setShowErrors] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const rateValue = parseNumber(rate);
  const isWholeOrEmpty = (raw: string) => raw.trim() === '' || (Number.isInteger(Number(raw)) && Number(raw) >= 0);
  const errors = {
    name: name.trim() === '' ? copy.nameRequired : undefined,
    rate: Number.isFinite(rateValue) && rateValue >= 0 && rateValue <= 100 ? undefined : copy.rateInvalid,
    minCapital: parseNumber(minCapital) > 0 ? undefined : copy.capitalInvalid,
    graceDays: isWholeOrEmpty(graceDays) ? undefined : copy.wholeNumber,
    maxCopiers: isWholeOrEmpty(maxCopiers) ? undefined : copy.wholeNumber,
  };
  const visibleError = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);
  const ids = {
    name: `${formId}-name`,
    strategy: `${formId}-strategy`,
    risk: `${formId}-risk`,
    rate: `${formId}-rate`,
    cycle: `${formId}-cycle`,
    grace: `${formId}-grace`,
    capital: `${formId}-capital`,
    max: `${formId}-max`,
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) return;
    // No backend yet: mimic the round trip, then close.
    onSavingChange(true);
    saveTimer.current = window.setTimeout(() => {
      onSavingChange(false);
      onSaved();
    }, SAVE_DELAY_MS);
  }

  const previewName = name.trim() || plan.name;

  return (
    <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Live preview: how the plan reads to copiers while the master types. */}
      <div className="relative isolate flex animate-rise items-center gap-3.5 overflow-hidden rounded-[24px] bg-fg/[0.03] p-3.5 ring-1 ring-line motion-reduce:animate-none">
        <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 -z-10 w-16 bg-fg/[0.06] motion-reduce:hidden" />
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-orbit-spin-fast rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span style={{ background: 'var(--zenith-red)' }} className="absolute top-0 right-0 size-2 animate-ping-soft rounded-full motion-reduce:animate-none" />
          <span className="grid size-9 place-items-center rounded-full bg-fg text-sm font-black text-app uppercase">{previewName.charAt(0)}</span>
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="truncate font-semibold text-fg">{previewName}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            <span style={{ background: 'var(--zenith-red)' }} className="rounded-full px-2 py-0.5 font-semibold text-white">
              {Number.isFinite(rateValue) ? rateValue : 0}% {copy.commissionPreview}
            </span>
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-fg-muted">{cycle}</span>
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-fg-muted">
              {copy.minCapital}: ${minCapital || '0'}
            </span>
          </p>
        </div>
      </div>

      <div className="relative flex flex-col gap-7">
        <span aria-hidden="true" className="absolute top-10 bottom-2 left-[17px] origin-top animate-grow border-l-2 border-dashed border-line-strong motion-reduce:animate-none" />

        <Step index={0} icon="fileText" title={copy.sectionDetails}>
          <Field label={<RequiredLabel>{copy.planName}</RequiredLabel>} htmlFor={ids.name} error={visibleError('name')}>
            <Input id={ids.name} value={name} invalid={Boolean(visibleError('name'))} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          </Field>
          <Field label={copy.strategyDescription} htmlFor={ids.strategy}>
            <textarea id={ids.strategy} value={strategy} onChange={(event) => setStrategy(event.target.value)} className={textareaClass} />
          </Field>
          <Field label={copy.riskInformation} htmlFor={ids.risk}>
            <textarea id={ids.risk} value={risk} onChange={(event) => setRisk(event.target.value)} className={cx(textareaClass, 'min-h-20')} />
          </Field>
        </Step>

        <Step index={1} icon="pieChart" title={copy.sectionCommission}>
          <Field label={<RequiredLabel>{copy.commissionRate}</RequiredLabel>} htmlFor={ids.rate} hint={copy.commissionRateHint} error={visibleError('rate')}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  id={ids.rate}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="any"
                  value={rate}
                  invalid={Boolean(visibleError('rate'))}
                  onChange={(event) => setRate(event.target.value)}
                  rightSlot={<span className="px-3 text-sm text-fg-subtle">%</span>}
                />
              </div>
              <RateRing rate={rateValue} />
            </div>
          </Field>
          <Field label={copy.settlementCycle} htmlFor={ids.cycle} hint={copy.settlementCycleHint}>
            <Select id={ids.cycle} value={cycle} onChange={(event) => setCycle(event.target.value)}>
              {SETTLEMENT_CYCLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </Step>

        <Step index={2} icon="lock" title={copy.sectionRules}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.graceDays} htmlFor={ids.grace} error={visibleError('graceDays')}>
              <Input
                id={ids.grace}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={graceDays}
                invalid={Boolean(visibleError('graceDays'))}
                onChange={(event) => setGraceDays(event.target.value)}
                rightSlot={<span className="px-3 text-xs text-fg-subtle">{copy.days}</span>}
              />
            </Field>
            <Field label={<RequiredLabel>{copy.minCapital}</RequiredLabel>} htmlFor={ids.capital} error={visibleError('minCapital')}>
              <Input
                id={ids.capital}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                leftIcon="wallet"
                value={minCapital}
                invalid={Boolean(visibleError('minCapital'))}
                onChange={(event) => setMinCapital(event.target.value)}
              />
            </Field>
          </div>
          <Field label={copy.maxCopiers} htmlFor={ids.max} error={visibleError('maxCopiers')}>
            <Input
              id={ids.max}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              leftIcon="user"
              placeholder={copy.maxCopiersPlaceholder}
              value={maxCopiers}
              invalid={Boolean(visibleError('maxCopiers'))}
              onChange={(event) => setMaxCopiers(event.target.value)}
              rightSlot={maxCopiers.trim() === '' ? <span className="px-3 text-base font-bold text-[var(--zenith-red)]">∞</span> : undefined}
            />
          </Field>
        </Step>
      </div>
    </form>
  );
}

export function EditPlanDialog({ plan, onClose }: EditPlanDialogProps) {
  const formId = useId();
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      size="lg"
      calm
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {copy.cancel}
          </Button>
          <Button type="submit" form={formId} variant="secondary" leftIcon="check" loading={saving} className="min-w-32">
            {copy.save}
          </Button>
        </>
      }
    >
      {plan && (
        <div className="-mx-6 max-h-[62vh] overflow-y-auto px-6 pb-1">
          <EditPlanForm key={plan.id} plan={plan} formId={formId} onSaved={onClose} onSavingChange={setSaving} />
        </div>
      )}
    </Modal>
  );
}
