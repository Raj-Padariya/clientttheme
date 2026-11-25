'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
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

const RING_SEGMENT = 100 / passwordRules.length;
const RING_GAP = 4;

function isStrongPassword(value: string) {
  return passwordRules.every((rule) => rule.test(value));
}

function metRuleCount(value: string) {
  return passwordRules.filter((rule) => rule.test(value)).length;
}

export interface NewAccountSummary {
  isLive: boolean;
  typeName: string;
  leverage: number;
  amountLabel: string;
  amount: string;
  currency: string;
}

// The account being created, as a slim gradient pass (same language as the Open Account spec ticket).
function AccountStrip({ summary }: { summary: NewAccountSummary }) {
  const facts = [
    { label: 'Leverage', value: `1:${summary.leverage}` },
    { label: summary.amountLabel, value: `${summary.amount} ${summary.currency}` },
  ];
  return (
    <div className="relative isolate flex animate-rise items-center gap-4 overflow-hidden rounded-2xl bg-[image:var(--brand-gradient)] p-4 text-on-primary shadow-[0_20px_40px_-26px_var(--brand-primary)] motion-reduce:animate-none">
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-16 -right-14 -z-10 size-40 animate-orbit-spin opacity-60 motion-reduce:animate-none" />
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15 text-xl font-black ring-1 ring-white/30">
        {summary.typeName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-semibold">{summary.typeName}</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-white/25">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
            {summary.isLive ? 'Live' : 'Demo'}
          </span>
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          {facts.map((fact) => (
            <li key={fact.label} className="flex gap-1.5">
              <span className="opacity-75">{fact.label}</span>
              <span className="font-semibold tabular-nums">{fact.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Five arc segments, one per rule; met rules light up (green once all are met).
function StrengthRing({ met, isDone }: { met: number; isDone: boolean }) {
  return (
    <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
        {passwordRules.map((rule, index) => (
          <circle
            key={rule.label}
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${RING_SEGMENT - RING_GAP} ${100 - RING_SEGMENT + RING_GAP}`}
            strokeDashoffset={-index * RING_SEGMENT}
            className={cx('transition-colors duration-300', index < met ? (isDone ? 'stroke-success' : 'stroke-primary') : 'stroke-line')}
          />
        ))}
      </svg>
      <span className={cx('font-mono text-[10px] font-bold tabular-nums', isDone ? 'text-success' : 'text-fg-muted')}>
        {met}/{passwordRules.length}
      </span>
    </span>
  );
}

function RuleGrid({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
      {passwordRules.map((rule) => {
        const isMet = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cx(
              'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[10.5px] font-medium ring-1 transition-colors duration-300',
              isMet ? 'bg-success-soft text-success ring-success/30' : 'bg-surface-2/60 text-fg-subtle ring-line',
            )}
          >
            <span
              className={cx(
                'grid size-5 place-items-center rounded-full transition-transform duration-300 motion-reduce:transition-none',
                isMet ? 'scale-100 bg-success text-on-primary' : 'scale-90 bg-line text-fg-subtle',
              )}
            >
              <Icon name={isMet ? 'check' : 'close'} size={11} />
            </span>
            <span className="max-w-full truncate">{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One password "key": numbered header with its access level and a strength ring, a fill rail on the left edge,
 *  then the field and its rule grid. */
function KeySection({
  step,
  icon,
  access,
  met,
  isDone,
  delayMs,
  children,
}: {
  step: number;
  icon: IconName;
  access: string;
  met: number;
  isDone: boolean;
  delayMs: number;
  children: ReactNode;
}) {
  return (
    <section
      style={{ animationDelay: `${delayMs}ms` }}
      className={cx(
        'relative isolate animate-rise overflow-hidden rounded-2xl border bg-surface-2/40 p-4 pl-5 transition-colors duration-500 motion-reduce:animate-none',
        isDone ? 'border-success/40' : 'border-line',
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-line">
        <span
          className={cx('absolute inset-x-0 bottom-0 transition-[height] duration-500 motion-reduce:transition-none', isDone ? 'bg-success' : 'bg-primary')}
          style={{ height: `${(met / passwordRules.length) * 100}%` }}
        />
      </span>
      {isDone && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cx(
              'relative grid size-9 place-items-center rounded-xl font-mono text-xs font-bold ring-1 transition-colors duration-500',
              isDone ? 'bg-success text-on-primary ring-success/40' : 'bg-primary-soft text-primary ring-primary/30',
            )}
          >
            {isDone && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-xl ring-2 ring-success/50 motion-reduce:hidden" />}
            {isDone ? <Icon name="check" size={15} /> : String(step).padStart(2, '0')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
            <Icon name={icon} size={12} />
            {access}
          </span>
        </div>
        <StrengthRing met={met} isDone={isDone} />
      </div>

      <div className="flex flex-col gap-3">{children}</div>
    </section>
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
  const isInvestorDone = isInvestorStrong && !isSameAsMaster;
  const canCreate = isMasterStrong && isInvestorDone;

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
            {canCreate && !isCreating && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-white/30 to-transparent motion-reduce:animate-none" />}
            <span className="relative">{createText.create}</span>
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <AccountStrip summary={summary} />

        <KeySection step={1} icon="lock" access={createText.fullAccess} met={metRuleCount(master)} isDone={isMasterStrong} delayMs={80}>
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
          <RuleGrid value={master} />
        </KeySection>

        <KeySection step={2} icon="eye" access={createText.readOnly} met={metRuleCount(investor)} isDone={isInvestorDone} delayMs={160}>
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
          <RuleGrid value={investor} />
        </KeySection>
      </form>
    </Modal>
  );
}
