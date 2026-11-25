'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, PasswordInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';

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
      className={cx(
        'relative z-10 grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[11px] font-semibold transition-colors duration-300',
        steps[index].done ? 'border-success/50 bg-success/15 text-success' : 'border-primary/40 bg-elevated text-primary',
      )}
    >
      {steps[index].done ? <Icon name="check" size={12} /> : String(index + 1).padStart(2, '0')}
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/12 text-primary">
            <Icon name="lock" size={18} />
          </span>
          <span className="flex flex-col">
            Change Password
            <span aria-hidden="true" className="mt-1 flex gap-1">
              {steps.map((step) => (
                <span key={step.id} className={cx('h-1 w-6 rounded-full transition-colors duration-300', step.done ? 'bg-success' : 'bg-line-strong')} />
              ))}
            </span>
          </span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check" loading={saving}>
            Change Password
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="relative flex flex-col gap-5">
        <span aria-hidden="true" className="absolute top-3.5 bottom-3.5 left-3.5 w-px bg-linear-to-b from-primary/50 via-line-strong to-line" />

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

            <div className="flex flex-col gap-3 rounded-xl border border-line bg-fg/[0.02] p-3">
              <div className="flex items-end gap-3" aria-live="polite">
                <div className="flex h-9 flex-1 items-end gap-1" aria-hidden="true">
                  {passwordRules.map((rule, index) => {
                    const lit = form.next !== '' && index < passedRules.length;
                    return (
                      <span key={rule.id} style={{ height: `${40 + index * 15}%` }} className="flex-1 overflow-hidden rounded-sm bg-line">
                        <span
                          className={cx(
                            'block size-full origin-bottom rounded-sm transition-[transform,background-color] duration-300 motion-reduce:transition-none',
                            strength.bar,
                            lit ? 'scale-y-100' : 'scale-y-0',
                          )}
                        />
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-col items-end">
                  <span className={cx('font-mono text-lg leading-none font-semibold tabular-nums', form.next ? strength.text : 'text-fg-subtle')}>
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
                        'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors duration-200',
                        passed ? 'border-success/40 bg-success/10 text-success' : 'border-line text-fg-muted',
                      )}
                    >
                      {passed ? <Icon name="check" size={10} /> : <span className="size-1.5 rounded-full bg-current opacity-50" />}
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
