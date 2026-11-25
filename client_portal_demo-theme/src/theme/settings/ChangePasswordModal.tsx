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

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/30">
            <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-xl ring-1 ring-primary/40 motion-reduce:hidden" />
            <Icon name="lock" size={18} />
          </span>
          Change Password
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
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Current Password" htmlFor="password-current" error={errors.current}>
          <PasswordInput
            id="password-current"
            autoComplete="current-password"
            placeholder="Enter current password"
            value={form.current}
            invalid={Boolean(errors.current)}
            onChange={(event) => update('current', event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-3 rounded-xl bg-surface-2/60 p-4 ring-1 ring-line">
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

          <div className="flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1" aria-hidden="true">
              {passwordRules.map((rule, index) => (
                <span key={rule.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={cx(
                      'block h-full origin-left rounded-full transition-[transform,background-color] duration-300 motion-reduce:transition-none',
                      strength.bar,
                      index < passedRules.length && form.next ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </span>
              ))}
            </div>
            <span className={cx('w-20 text-right text-xs font-semibold', form.next ? strength.text : 'text-fg-subtle')}>{form.next ? strength.label : 'Strength'}</span>
          </div>

          <ul className="grid gap-1.5 sm:grid-cols-2">
            {passwordRules.map((rule) => {
              const passed = rule.test(form.next);
              return (
                <li key={rule.id} className={cx('flex items-center gap-2 text-xs transition-colors duration-200', passed ? 'text-success' : 'text-fg-muted')}>
                  <span
                    className={cx(
                      'grid size-4 shrink-0 place-items-center rounded-full ring-1 transition-[background-color,transform] duration-200 motion-reduce:transition-none',
                      passed ? 'scale-110 bg-success text-white ring-success' : 'ring-line-strong',
                    )}
                  >
                    {passed && <Icon name="check" size={10} />}
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

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
          <p className="-mt-2 flex animate-rise items-center gap-1.5 text-xs font-medium text-success motion-reduce:animate-none">
            <Icon name="check" size={12} />
            Passwords match
          </p>
        )}
      </form>
    </Modal>
  );
}
