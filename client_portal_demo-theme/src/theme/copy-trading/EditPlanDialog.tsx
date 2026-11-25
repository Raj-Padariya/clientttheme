'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { editPlanCopy as copy, planDetails, SETTLEMENT_CYCLES, type MasterPlanRow } from './myPlansData';

type SettlementCycle = (typeof SETTLEMENT_CYCLES)[number];
type SectionKey = 'details' | 'commission' | 'rules';
type FieldKey = 'name' | 'rate' | 'graceDays' | 'minCapital' | 'maxCopiers';

interface FormState {
  name: string;
  strategy: string;
  risk: string;
  rate: string;
  cycle: SettlementCycle;
  graceDays: string;
  minCapital: string;
  maxCopiers: string;
}

const SAVE_DELAY_MS = 700;

const sections: { key: SectionKey; label: string; fields: FieldKey[] }[] = [
  { key: 'details', label: copy.sectionDetails, fields: ['name'] },
  { key: 'commission', label: copy.sectionCommission, fields: ['rate'] },
  { key: 'rules', label: copy.sectionRules, fields: ['graceDays', 'minCapital', 'maxCopiers'] },
];

function initialForm(plan: MasterPlanRow): FormState {
  const detail = planDetails[plan.id];
  const cycle = SETTLEMENT_CYCLES.find((option) => option === detail?.settlement.cycle) ?? 'Daily';
  return {
    name: plan.name,
    strategy: detail?.strategyDescription ?? '',
    risk: detail?.riskInformation ?? '',
    rate: String(plan.commissionPercent),
    cycle,
    graceDays: String(detail?.noFeeGraceDays ?? 0),
    minCapital: String(detail?.minimumCapital ?? 50),
    maxCopiers: plan.maxCopiers === null ? '' : String(plan.maxCopiers),
  };
}

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

function validate(form: FormState): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const rate = Number(form.rate);
  const minCapital = Number(form.minCapital);
  if (!form.name.trim()) errors.name = copy.nameRequired;
  if (form.rate.trim() === '' || Number.isNaN(rate) || rate < 0 || rate > 100) errors.rate = copy.rateInvalid;
  if (!isWholeNumber(form.graceDays)) errors.graceDays = copy.wholeNumber;
  if (form.minCapital.trim() === '' || Number.isNaN(minCapital) || minCapital <= 0) errors.minCapital = copy.capitalInvalid;
  if (form.maxCopiers.trim() !== '' && !isWholeNumber(form.maxCopiers)) errors.maxCopiers = copy.wholeNumber;
  return errors;
}

function Field({ id, label, required, hint, error, children }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-primary" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> ({copy.required})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs text-danger">
          <Icon name="alert" size={13} />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-relaxed text-fg-subtle">{hint}</p>
      )}
    </div>
  );
}

const textareaClass =
  'min-h-24 w-full resize-y rounded-md border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-primary/40 focus:border-primary focus:outline-none';

function EditPlanForm({ plan, onClose }: { plan: MasterPlanRow; onClose: () => void }) {
  const baseId = useId();
  const [form, setForm] = useState<FormState>(() => initialForm(plan));
  const [section, setSection] = useState<SectionKey>('details');
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) return;
    const timer = window.setTimeout(onClose, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [saving, onClose]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const fieldId = (key: string) => `${baseId}-${key}`;
  const describedBy = (key: FieldKey) => (errors[key] ? `${fieldId(key)}-error` : undefined);

  function save() {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstInvalid = sections.find((entry) => entry.fields.some((field) => nextErrors[field]));
    if (firstInvalid) {
      setSection(firstInvalid.key);
      return;
    }
    setSaving(true);
  }

  const ratePreview = Number(form.rate);
  const previewRate = Number.isNaN(ratePreview) ? form.rate : String(ratePreview);
  const maxLabel = form.maxCopiers.trim() === '' ? '∞' : form.maxCopiers;

  return (
    <>
      <div className="flex flex-col gap-5 px-6 pb-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-line bg-surface-2/60 px-3.5 py-2.5 text-xs text-fg-muted">
          <span className="min-w-0 truncate font-semibold text-fg">{form.name.trim() || plan.name}</span>
          <span className="font-mono text-primary tabular-nums">
            {previewRate}% {copy.commissionPreview}
          </span>
          <span>{form.cycle}</span>
          <span className="font-mono tabular-nums">
            {plan.copiers} / {maxLabel}
          </span>
        </div>

        <div role="tablist" aria-label={copy.title} className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
          {sections.map((entry, index) => {
            const selected = section === entry.key;
            const hasError = entry.fields.some((field) => errors[field]);
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                id={fieldId(`tab-${entry.key}`)}
                aria-selected={selected}
                aria-controls={fieldId(`panel-${entry.key}`)}
                onClick={() => setSection(entry.key)}
                className={cx(
                  'relative flex h-10 items-center justify-center gap-1.5 rounded text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:text-sm',
                  selected ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
                )}
              >
                <span className={cx('font-mono text-[10px]', selected ? 'text-primary' : 'text-fg-subtle')}>0{index + 1}</span>
                <span className="truncate">{entry.label}</span>
                {hasError && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={fieldId(`panel-${section}`)}
          aria-labelledby={fieldId(`tab-${section}`)}
          className="flex min-h-64 flex-col gap-4"
        >
          {section === 'details' && (
            <>
              <Field id={fieldId('name')} label={copy.planName} required error={errors.name}>
                <Input
                  id={fieldId('name')}
                  value={form.name}
                  invalid={Boolean(errors.name)}
                  aria-required="true"
                  aria-describedby={describedBy('name')}
                  onChange={(event) => update('name', event.target.value)}
                />
              </Field>
              <Field id={fieldId('strategy')} label={copy.strategyDescription}>
                <textarea id={fieldId('strategy')} rows={3} value={form.strategy} onChange={(event) => update('strategy', event.target.value)} className={textareaClass} />
              </Field>
              <Field id={fieldId('risk')} label={copy.riskInformation}>
                <textarea id={fieldId('risk')} rows={3} value={form.risk} onChange={(event) => update('risk', event.target.value)} className={textareaClass} />
              </Field>
            </>
          )}

          {section === 'commission' && (
            <>
              <Field id={fieldId('rate')} label={copy.commissionRate} hint={copy.commissionRateHint} error={errors.rate}>
                <Input
                  id={fieldId('rate')}
                  inputMode="decimal"
                  value={form.rate}
                  invalid={Boolean(errors.rate)}
                  aria-describedby={describedBy('rate')}
                  onChange={(event) => update('rate', event.target.value)}
                  rightSlot={<span className="text-sm text-fg-subtle">%</span>}
                />
              </Field>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${Math.min(100, Math.max(0, Number(form.rate) || 0))}%` }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Dropdown
                  id={fieldId('cycle')}
                  label={copy.settlementCycle}
                  value={form.cycle}
                  icon="calendar"
                  options={SETTLEMENT_CYCLES.map((cycle) => ({ value: cycle, label: cycle }))}
                  onChange={(cycle) => update('cycle', cycle)}
                />
                <p className="text-xs leading-relaxed text-fg-subtle">{copy.settlementCycleHint}</p>
              </div>
            </>
          )}

          {section === 'rules' && (
            <>
              <Field id={fieldId('graceDays')} label={copy.graceDays} error={errors.graceDays}>
                <Input
                  id={fieldId('graceDays')}
                  inputMode="numeric"
                  value={form.graceDays}
                  invalid={Boolean(errors.graceDays)}
                  aria-describedby={describedBy('graceDays')}
                  onChange={(event) => update('graceDays', event.target.value)}
                  rightSlot={<span className="text-xs text-fg-subtle">{copy.days}</span>}
                />
              </Field>
              <Field id={fieldId('minCapital')} label={copy.minCapital} error={errors.minCapital}>
                <Input
                  id={fieldId('minCapital')}
                  inputMode="decimal"
                  value={form.minCapital}
                  invalid={Boolean(errors.minCapital)}
                  aria-describedby={describedBy('minCapital')}
                  onChange={(event) => update('minCapital', event.target.value)}
                  rightSlot={<span className="text-xs text-fg-subtle">USD</span>}
                />
              </Field>
              <Field id={fieldId('maxCopiers')} label={copy.maxCopiers} error={errors.maxCopiers}>
                <Input
                  id={fieldId('maxCopiers')}
                  inputMode="numeric"
                  value={form.maxCopiers}
                  placeholder={copy.maxCopiersPlaceholder}
                  invalid={Boolean(errors.maxCopiers)}
                  aria-describedby={describedBy('maxCopiers')}
                  onChange={(event) => update('maxCopiers', event.target.value)}
                  rightSlot={form.maxCopiers.trim() === '' ? <span className="font-mono text-base text-primary">∞</span> : undefined}
                />
              </Field>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {copy.cancel}
        </Button>
        <Button variant="primary" leftIcon="check" loading={saving} onClick={save}>
          {copy.save}
        </Button>
      </div>
    </>
  );
}

export function EditPlanDialog({ plan, onClose }: { plan: MasterPlanRow | null; onClose: () => void }) {
  return (
    <Modal open={plan !== null} onClose={onClose} size="lg" title={copy.title} description={copy.description}>
      {plan && (
        <div className="-mx-6 -mb-6">
          <EditPlanForm key={plan.id} plan={plan} onClose={onClose} />
        </div>
      )}
    </Modal>
  );
}
