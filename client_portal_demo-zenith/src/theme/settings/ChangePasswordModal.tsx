'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';

import { Icon } from '../ui/Icon';
import { Field, PasswordInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';

const RED = 'var(--zenith-red)';
const SUBMIT_DELAY_MS = 900;
const FORM_ID = 'change-password-form';

const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

const strengthLevels = [
  { label: 'Too weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-warning', text: 'text-warning' },
  { label: 'Good', bar: 'bg-warning', text: 'text-warning' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success' },
  { label: 'Very strong', bar: 'bg-success', text: 'text-success' },
];

const emptyForm = { current: '', next: '', confirm: '' };

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const passedRules = passwordRules.filter((rule) => rule.test(form.next));
  const strength = strengthLevels[form.next ? passedRules.length : 0];
  const allRulesPass = passedRules.length === passwordRules.length;
  const confirmMatches = form.confirm !== '' && form.confirm === form.next;
  const sameAsCurrent = form.next !== '' && form.next === form.current;

  const errors = {
    current: submitted && form.current === '' ? 'Enter your current password' : undefined,
    next: sameAsCurrent ? 'New password must differ from the current one' : submitted && !allRulesPass ? 'Meet every requirement below' : undefined,
    confirm: form.confirm !== '' && !confirmMatches ? 'Passwords do not match' : submitted && form.confirm === '' ? 'Confirm your new password' : undefined,
  };
  const canSubmit = form.current !== '' && allRulesPass && confirmMatches && !sameAsCurrent;

  function update(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function close() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setForm(emptyForm);
    setSubmitted(false);
    setSaving(false);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!canSubmit) return;
    setSaving(true);
    timerRef.current = setTimeout(() => {
      toast('Password changed', { description: 'Use your new password the next time you sign in.' });
      close();
    }, SUBMIT_DELAY_MS);
  }

  const steps = [
    { id: 'current', done: form.current !== '' },
    { id: 'next', done: allRulesPass && !sameAsCurrent },
    { id: 'confirm', done: confirmMatches },
  ];
  const stepNumber = (index: number) => (
    <span
      aria-hidden="true"
      style={steps[index].done ? undefined : index === steps.findIndex((step) => !step.done) ? { background: RED } : undefined}
      className={cx(
        'relative z-10 grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px] font-black ring-4 ring-elevated transition-colors duration-300',
        steps[index].done ? 'bg-success text-white' : index === steps.findIndex((step) => !step.done) ? 'text-white' : 'bg-fg text-app',
      )}
    >
      {steps[index].done ? <Icon name="check" size={13} /> : index + 1}
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      calm
      title={
        <span className="flex items-center gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-[2px]" />
            </span>
            <span className="grid size-8 place-items-center rounded-full bg-fg text-app">
              <Icon name="lock" size={14} />
            </span>
          </span>
          <span className="flex flex-col">
            Change Password
            <span aria-hidden="true" className="mt-1.5 flex gap-1">
              {steps.map((step) => (
                <span key={step.id} className={cx('h-1.5 w-6 rounded-full transition-colors duration-300', step.done ? 'bg-success' : 'bg-fg/20')} />
              ))}
            </span>
          </span>
        </span>
      }
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-full bg-fg/[0.03] px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            aria-busy={saving}
            className="group/ink inline-flex h-11 items-center gap-2.5 rounded-full bg-fg py-1.5 pr-1.5 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none motion-reduce:transition-none"
          >
            <span>Change Password</span>
            <span style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white">
              <Icon name={saving ? 'refresh' : 'check'} size={14} className={cx(saving && 'animate-spin motion-reduce:animate-none')} />
            </span>
          </button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="relative flex flex-col gap-5">
        <span aria-hidden="true" className="absolute top-4 bottom-4 left-[15px] w-0.5 rounded-full bg-line" />

        <div className="flex gap-3">
          {stepNumber(0)}
          <Field label="Current Password" htmlFor="password-current" error={errors.current} className="min-w-0 flex-1">
            <PasswordInput
              id="password-current"
              autoComplete="current-password"
              placeholder="Enter current password"
              value={form.current}
              invalid={Boolean(errors.current)}
              onChange={(event) => update('current', event.target.value)}
            />
          </Field>
        </div>

        <div className="flex gap-3">
          {stepNumber(1)}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Field label="New Password" htmlFor="password-new" error={errors.next}>
              <PasswordInput
                id="password-new"
                autoComplete="new-password"
                placeholder="Enter new password"
                value={form.next}
                invalid={Boolean(errors.next)}
                onChange={(event) => update('next', event.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-3 rounded-[24px] bg-fg/[0.03] p-3.5 ring-1 ring-line">
              <div className="flex items-end gap-3" aria-live="polite">
                {/* Strength as a segmented capsule: one segment per rule passed, the newest segment red. */}
                <div className="flex flex-1 gap-1 pb-1" aria-hidden="true">
                  {passwordRules.map((rule, index) => {
                    const lit = form.next !== '' && index < passedRules.length;
                    const isHead = lit && index === passedRules.length - 1 && passedRules.length < passwordRules.length;
                    return (
                      <span
                        key={rule.id}
                        style={isHead ? { background: RED } : undefined}
                        className={cx('h-3 min-w-0 flex-1 rounded-full transition-[background-color,height] duration-300 motion-reduce:transition-none', lit ? cx(!isHead && strength.bar, 'h-3') : 'h-2 self-center bg-fg/15')}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-col items-end">
                  <span className={cx('font-mono text-2xl leading-none font-black tracking-tight tabular-nums', form.next ? strength.text : 'text-fg-subtle')}>
                    {form.next ? passedRules.length : 0}/{passwordRules.length}
                  </span>
                  <span className={cx('mt-1 text-[11px] font-semibold', form.next ? strength.text : 'text-fg-subtle')}>{form.next ? strength.label : 'Strength'}</span>
                </div>
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {passwordRules.map((rule) => {
                  const passed = rule.test(form.next);
                  return (
                    <li
                      key={rule.id}
                      className={cx(
                        'flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-[11px] transition-colors duration-200',
                        passed ? 'bg-success/15 text-success' : 'bg-app text-fg-muted ring-1 ring-line',
                      )}
                    >
                      <span aria-hidden="true" className={cx('grid size-5 place-items-center rounded-full', passed ? 'bg-success text-white' : 'border border-dashed border-line-strong')}>
                        {passed && <Icon name="check" size={10} />}
                      </span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {stepNumber(2)}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Field label="Confirm New Password" htmlFor="password-confirm" error={errors.confirm}>
              <PasswordInput
                id="password-confirm"
                autoComplete="new-password"
                placeholder="Confirm New Password"
                value={form.confirm}
                invalid={Boolean(errors.confirm)}
                onChange={(event) => update('confirm', event.target.value)}
              />
            </Field>
            {confirmMatches && (
              <p className="flex animate-rise items-center gap-1.5 text-xs font-medium text-success motion-reduce:animate-none">
                <Icon name="check" size={12} />
                Passwords match
              </p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
