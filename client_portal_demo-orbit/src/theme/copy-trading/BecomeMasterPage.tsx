'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Alert, Badge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox, Field, Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';

type StepKey = 'email' | 'mobile' | 'personal' | 'application';
type StepStatus = 'approved' | 'notApplied' | 'review';

interface ApplicationStep {
  key: StepKey;
  icon: IconName;
  status: StepStatus;
}

const PROFILE_NAME = 'demo ib';
const NICKNAME_MAX = 32;
const SUBMIT_DELAY_MS = 900;

const verificationSteps: ApplicationStep[] = [
  { key: 'email', icon: 'mail', status: 'approved' },
  { key: 'mobile', icon: 'smartphone', status: 'approved' },
  { key: 'personal', icon: 'user', status: 'approved' },
];

const statusTone = { approved: 'success', notApplied: 'neutral', review: 'warning' } as const;

/* ───────────── Journey column: progress ring + vertical step list ───────────── */

function ProgressRing({ approved, total }: { approved: number; total: number }) {
  return (
    <span className="relative grid size-24 shrink-0 place-items-center">
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 overflow-visible">
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="6" className="stroke-fg/[0.07]" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${approved / total} 1`}
          className="stroke-primary transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
        />
        {Array.from({ length: total }, (_, index) => (
          <line
            key={index}
            x1="50"
            y1="2"
            x2="50"
            y2="10"
            transform={`rotate(${round2((360 / total) * index)} 50 50)`}
            strokeWidth="2"
            className="stroke-surface"
          />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute inset-4 animate-orbit rounded-full border border-dashed border-primary/30 [animation-duration:24s] motion-reduce:animate-none" />
      <span className="relative text-2xl font-semibold tabular-nums text-fg">
        <CountUp value={approved} format={(current) => String(Math.round(current))} />
        <span className="text-lg text-fg-subtle">/{total}</span>
      </span>
    </span>
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function JourneyStep({ step, index, nextStatus, isCurrent }: { step: ApplicationStep; index: number; nextStatus?: StepStatus; isCurrent: boolean }) {
  const isApproved = step.status === 'approved';

  return (
    <li style={staggerStyle(index, 120)} className="relative flex-1 animate-rise pb-3 last:flex-none last:pb-0 motion-reduce:animate-none">
      {/* Connector to the next step: solid once that step is approved, dashed while it is still open.
          It runs from the bottom of this tile to the top of the next one (row padding 0.625rem + 1px border). */}
      {nextStatus && (
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-[calc(0.625rem+1px+2.75rem)] -bottom-[calc(0.625rem+1px)] left-[calc(0.625rem+1px+1.375rem-1px)] w-0',
            nextStatus === 'approved' ? 'border-l-2 border-primary shadow-[0_0_10px_var(--brand-primary)]' : 'border-l-2 border-dashed border-primary/35',
          )}
        />
      )}
      <div
        className={cx(
          'relative flex items-center gap-4 rounded-2xl border p-2.5 transition-colors duration-300',
          isCurrent ? 'border-primary/40 bg-primary/[0.08] shadow-[0_10px_30px_-18px_var(--brand-primary)]' : 'border-transparent',
        )}
      >
        <span className="relative grid size-11 shrink-0 place-items-center">
          {!isApproved && (
            <span
              aria-hidden="true"
              className={cx('absolute inset-0 animate-ping-soft rounded-xl motion-reduce:animate-none', step.status === 'review' ? 'bg-warning/25' : 'bg-primary/20')}
            />
          )}
          <span
            className={cx(
              'relative grid size-11 place-items-center rounded-xl border',
              isApproved && 'border-primary/50 bg-primary/15 text-primary',
              step.status === 'notApplied' && 'border-dashed border-primary/60 bg-surface text-primary',
              step.status === 'review' && 'border-warning/40 bg-warning-soft text-warning',
            )}
          >
            <Icon name={isApproved ? 'checkCircle' : step.icon} size={20} />
          </span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-fg-subtle tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            <span className="truncate text-sm font-semibold text-fg">{translate(`copy.apply.step.${step.key}`)}</span>
          </span>
          <span>
            <Badge tone={statusTone[step.status]} dot>
              {translate(`copy.apply.status.${step.status}`)}
            </Badge>
          </span>
        </div>
      </div>
    </li>
  );
}

function JourneyColumn({ steps }: { steps: ApplicationStep[] }) {
  const approvedCount = steps.filter((step) => step.status === 'approved').length;
  const currentIndex = steps.findIndex((step) => step.status !== 'approved');

  return (
    <aside className="orbit-card relative isolate flex animate-rise flex-col overflow-hidden p-6 motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 -z-10 size-64 animate-float rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

      <div className="flex items-center gap-4">
        <ProgressRing approved={approvedCount} total={steps.length} />
        <div className="min-w-0">
          <h2 className="text-base leading-snug font-semibold tracking-tight text-fg">{translate('copy.apply.title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('copy.apply.subtitle')}</p>
        </div>
      </div>

      <span aria-hidden="true" className="my-5 h-px w-full bg-linear-to-r from-primary/50 via-line to-transparent" />

      <ol className="flex flex-1 flex-col">
        {steps.map((step, index) => (
          <JourneyStep key={step.key} step={step} index={index} nextStatus={steps[index + 1]?.status} isCurrent={index === currentIndex} />
        ))}
      </ol>
    </aside>
  );
}

/* ───────────── Studio: live profile banner on top, form below ───────────── */

function ProfileBanner({ nickname }: { nickname: string }) {
  const displayName = nickname.trim() || translate('copy.apply.previewPlaceholder');
  const hasNickname = nickname.trim().length > 0;

  return (
    <section aria-label={translate('copy.apply.preview')} className="relative isolate overflow-hidden rounded-t-[inherit] border-b border-line p-6 sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_left,#000,transparent_75%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-16 -z-10 size-80 animate-float rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -right-28 -bottom-40 -z-10 size-96 animate-orbit-spin motion-reduce:animate-none" />

      <p className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-fg-subtle uppercase">
        <LiveDot />
        {translate('copy.apply.preview')}
      </p>

      <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <span className="relative grid size-28 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-[2rem] bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_55%,var(--brand-primary))] motion-reduce:animate-none"
          />
          <span className="relative grid size-[104px] place-items-center rounded-[1.8rem] bg-surface">
            <Avatar name={displayName} className="size-24 rounded-[1.6rem]! text-3xl" />
          </span>
          <span className="absolute -right-2 -bottom-2 grid size-9 animate-float place-items-center rounded-xl border border-primary/50 bg-surface text-primary shadow-[0_6px_16px_-6px_var(--brand-primary)] motion-reduce:animate-none">
            <Icon name="trophy" size={16} />
          </span>
        </span>

        <div className="flex min-w-0 flex-col items-start gap-3">
          <p
            key={displayName}
            className={cx(
              'max-w-full animate-feed-in truncate text-3xl font-semibold tracking-tight motion-reduce:animate-none sm:text-4xl',
              hasNickname ? 'orbit-text' : 'text-fg-subtle italic',
            )}
          >
            {displayName}
          </p>
          <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-fg">
            <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <Icon name="copy" size={14} className="relative text-primary" />
            <span className="relative">{translate('copy.apply.masterBadge')}</span>
          </span>
          <p className="max-w-sm text-xs text-fg-muted">{translate('copy.apply.nicknameHint')}</p>
        </div>
      </div>
    </section>
  );
}

export default function BecomeMasterPage() {
  const [nickname, setNickname] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<StepStatus>('notApplied');

  const isSubmitted = applicationStatus === 'review';
  const canSubmit = nickname.trim().length > 0 && acceptedTerms && !isSubmitted;
  const steps: ApplicationStep[] = [...verificationSteps, { key: 'application', icon: 'bell', status: applicationStatus }];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));
    setIsSubmitting(false);
    setApplicationStatus('review');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.copyBecomeMaster')} description={translate('copy.apply.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <JourneyColumn steps={steps} />

        <div style={staggerStyle(1, 200)} className="orbit-card flex min-w-0 animate-rise flex-col motion-reduce:animate-none">
          <ProfileBanner nickname={nickname} />

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                htmlFor="master-name"
                label={
                  <>
                    {translate('copy.apply.nameLabel')} <span className="font-normal text-fg-subtle">{translate('copy.apply.fromProfile')}</span>
                  </>
                }
                hint={translate('copy.apply.nameHint')}
              >
                <Input id="master-name" value={PROFILE_NAME} readOnly leftIcon="user" className="bg-surface-2" />
              </Field>

              <Field
                htmlFor="master-nickname"
                label={
                  <>
                    {translate('copy.apply.nicknameLabel')} <span aria-hidden="true" className="text-danger">*</span>
                  </>
                }
                hint={translate('copy.apply.nicknameHint')}
              >
                <Input
                  id="master-nickname"
                  leftIcon="trophy"
                  required
                  maxLength={NICKNAME_MAX}
                  disabled={isSubmitted}
                  placeholder={translate('copy.apply.nicknamePlaceholder')}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  rightSlot={
                    <span className="pr-3 text-[11px] tabular-nums text-fg-subtle">
                      {nickname.length}/{NICKNAME_MAX}
                    </span>
                  }
                />
              </Field>
            </div>

            <div
              className={cx(
                'rounded-2xl border p-4 transition-colors duration-300',
                acceptedTerms ? 'border-primary/40 bg-primary/[0.07]' : 'border-dashed border-fg/15 bg-fg/[0.02]',
              )}
            >
              <Checkbox
                checked={acceptedTerms}
                disabled={isSubmitted}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                label={<span className="font-medium text-fg">{translate('copy.apply.terms')}</span>}
              />
            </div>

            {isSubmitted && <Alert tone="success">{translate('copy.apply.submitted')}</Alert>}

            <div className="mt-auto flex justify-end border-t border-line pt-5">
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                disabled={!canSubmit}
                className="group/submit relative w-full overflow-hidden shadow-[0_14px_30px_-14px_var(--brand-primary)] sm:w-auto"
              >
                {canSubmit && (
                  <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                )}
                <span className="relative">{translate('copy.apply.submit')}</span>
                <Icon
                  name="arrowRight"
                  size={20}
                  className="relative transition-transform duration-200 group-hover/submit:translate-x-1 motion-reduce:transition-none"
                />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
