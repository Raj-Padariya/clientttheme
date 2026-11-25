'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Field, PasswordInput } from '../ui/Input';
import { Modal } from '../ui/Modal';

const CREATE_DELAY_MS = 900;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 14;

const createText = {
  title: 'Set Trading Account Password',
  masterLabel: 'Master Password',
  masterPlaceholder: 'Enter master password (8-14 chars)',
  masterHint: '8-14 chars with uppercase, lowercase, number and special character (!@#$%^&*). Investor password must be different.',
  investorLabel: 'Investor Password',
  investorPlaceholder: 'Enter investor password (8-14 chars)',
  investorHint: 'Your main password gives full trading access. The investor password is read-only.',
  sameAsMaster: 'Investor password must be different from the master password',
  fullAccess: 'Full access',
  readOnly: 'Read-only',
  cancel: 'Cancel',
  create: 'Create Account',
};

const passwordRules: { label: string; test: (value: string) => boolean }[] = [
  { label: '8-14 chars', test: (value) => value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX },
  { label: 'Uppercase', test: (value) => /[A-Z]/.test(value) },
  { label: 'Lowercase', test: (value) => /[a-z]/.test(value) },
  { label: 'Number', test: (value) => /\d/.test(value) },
  { label: '!@#$%^&*', test: (value) => /[!@#$%^&*]/.test(value) },
];

function isStrongPassword(value: string) {
  return passwordRules.every((rule) => rule.test(value));
}

export interface NewAccountSummary {
  isLive: boolean;
  typeName: string;
  leverage: number;
  amountLabel: string;
  amount: string;
  currency: string;
}

function SummaryTicket({ summary }: { summary: NewAccountSummary }) {
  const facts = [
    { label: 'Leverage', value: `1:${summary.leverage}` },
    { label: summary.amountLabel, value: `${summary.amount} ${summary.currency}` },
  ];
  return (
    <div className="relative isolate flex animate-rise items-center gap-4 overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-r from-primary/15 via-surface-2 to-surface-2 p-4 motion-reduce:animate-none">
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-black text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)]">
        {summary.typeName.charAt(0).toUpperCase()}
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-semibold text-fg">{summary.typeName}</p>
          <Badge tone={summary.isLive ? 'primary' : 'neutral'} dot>
            {summary.isLive ? 'Live' : 'Demo'}
          </Badge>
        </div>
        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-1.5">
              <dt className="text-fg-subtle">{fact.label}</dt>
              <dd className="font-semibold text-fg tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function RuleChips({ value }: { value: string }) {
  const metCount = passwordRules.filter((rule) => rule.test(value)).length;
  const isStrong = metCount === passwordRules.length;
  return (
    <>
      <div aria-hidden="true" className="grid grid-cols-5 gap-1">
        {passwordRules.map((rule, index) => (
          <span key={rule.label} className={cx('h-1 rounded-full transition-colors duration-300', index < metCount ? (isStrong ? 'bg-success' : 'bg-primary') : 'bg-line')} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {passwordRules.map((rule) => {
          const isMet = rule.test(value);
          return (
            <li
              key={rule.label}
              className={cx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors duration-300',
                isMet ? 'bg-success-soft text-success ring-success/30' : 'bg-surface-2 text-fg-subtle ring-line',
              )}
            >
              <Icon name={isMet ? 'check' : 'close'} size={11} />
              {rule.label}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** One password "key slot": access-level icon and tag on the left rail, the field and its live rule check beside it. */
function KeySlot({ icon, access, isDone, delayMs, children }: { icon: IconName; access: string; isDone: boolean; delayMs: number; children: ReactNode }) {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={cx(
        'relative flex animate-rise gap-4 rounded-2xl border p-4 transition-colors duration-500 motion-reduce:animate-none',
        isDone ? 'border-success/40 bg-success-soft/30' : 'border-line bg-surface-2/40',
      )}
    >
      <div className="flex flex-col items-center gap-2 pt-7">
        <span
          className={cx(
            'relative grid size-10 place-items-center rounded-xl ring-1 transition-colors duration-500',
            isDone ? 'bg-success text-on-primary ring-success/40' : 'bg-primary-soft text-primary ring-primary/30',
          )}
        >
          {isDone && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl ring-2 ring-success/50 motion-reduce:hidden" />}
          <Icon name={isDone ? 'check' : icon} size={17} />
        </span>
        <span className="text-[9px] font-semibold tracking-[0.12em] whitespace-nowrap text-fg-subtle uppercase [writing-mode:vertical-rl]">{access}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">{children}</div>
    </div>
  );
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children} <span className="text-danger">*</span>
    </>
  );
}

export function CreateAccountModal({ summary, onClose, onCreated }: { summary: NewAccountSummary; onClose: () => void; onCreated: () => void }) {
  const formId = useId();
  const [master, setMaster] = useState('');
  const [investor, setInvestor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const isMasterStrong = isStrongPassword(master);
  const isInvestorStrong = isStrongPassword(investor);
  const isSameAsMaster = investor.length > 0 && investor === master;
  const canCreate = isMasterStrong && isInvestorStrong && !isSameAsMaster;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    setIsCreating(true);
    timerRef.current = setTimeout(onCreated, CREATE_DELAY_MS);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={createText.title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            {createText.cancel}
          </Button>
          <Button type="submit" form={formId} leftIcon="plus" loading={isCreating} disabled={!canCreate} className="relative overflow-hidden">
            {canCreate && !isCreating && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
            <span className="relative">{createText.create}</span>
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <SummaryTicket summary={summary} />

        <KeySlot icon="lock" access={createText.fullAccess} isDone={isMasterStrong} delayMs={80}>
          <Field label={<RequiredLabel>{createText.masterLabel}</RequiredLabel>} htmlFor={`${formId}-master`} hint={createText.masterHint}>
            <PasswordInput
              id={`${formId}-master`}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              placeholder={createText.masterPlaceholder}
              value={master}
              onChange={(event) => setMaster(event.target.value)}
            />
          </Field>
          <RuleChips value={master} />
        </KeySlot>

        <KeySlot icon="eye" access={createText.readOnly} isDone={isInvestorStrong && !isSameAsMaster} delayMs={160}>
          <Field
            label={<RequiredLabel>{createText.investorLabel}</RequiredLabel>}
            htmlFor={`${formId}-investor`}
            hint={createText.investorHint}
            error={isSameAsMaster ? createText.sameAsMaster : undefined}
          >
            <PasswordInput
              id={`${formId}-investor`}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              placeholder={createText.investorPlaceholder}
              value={investor}
              invalid={isSameAsMaster}
              onChange={(event) => setInvestor(event.target.value)}
            />
          </Field>
          <RuleChips value={investor} />
        </KeySlot>
      </form>
    </Modal>
  );
}
