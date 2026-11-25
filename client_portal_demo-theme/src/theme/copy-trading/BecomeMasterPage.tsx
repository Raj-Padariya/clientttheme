'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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

function StepNode({ step, index }: { step: ApplicationStep; index: number }) {
  const isApproved = step.status === 'approved';
  const isWaiting = step.status !== 'approved';

  return (
    <li style={staggerStyle(index, 150)} className="relative flex animate-rise flex-col items-center gap-3 text-center motion-reduce:animate-none">
      <span className="relative grid size-14 place-items-center">
        {isWaiting && (
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 animate-ping-soft rounded-full motion-reduce:animate-none',
              step.status === 'review' ? 'bg-warning/30' : 'bg-primary/25',
            )}
          />
        )}
        <span
          className={cx(
            'relative grid size-14 place-items-center rounded-full ring-4 ring-surface transition-colors duration-500',
            isApproved && 'bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)]',
            step.status === 'notApplied' && 'border-2 border-dashed border-primary/60 bg-surface text-primary',
            step.status === 'review' && 'bg-warning-soft text-warning ring-warning/30',
          )}
        >
          <Icon name={isApproved ? 'checkCircle' : step.icon} size={24} />
        </span>
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm font-semibold text-fg">{translate(`copy.apply.step.${step.key}`)}</p>
        <Badge tone={statusTone[step.status]} dot>
          {translate(`copy.apply.status.${step.status}`)}
        </Badge>
      </div>
    </li>
  );
}

function StepperRail({ steps }: { steps: ApplicationStep[] }) {
  const approvedCount = steps.filter((step) => step.status === 'approved').length;
  const fillPercent = ((approvedCount - 1) / (steps.length - 1)) * 100;

  return (
    <Card className="kpi-card relative animate-rise overflow-hidden motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-10 size-64 animate-glow rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{translate('copy.apply.title')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{translate('copy.apply.subtitle')}</p>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-fg">
          <CountUp value={approvedCount} format={(current) => String(Math.round(current))} />
          <span className="text-fg-subtle">/{steps.length}</span>
        </p>
      </div>

      <div className="relative mt-8">
        <div aria-hidden="true" className="absolute top-7 right-[12.5%] left-[12.5%] hidden h-1 rounded-full progress-track md:block">
          <span
            style={{ width: `${fillPercent}%` }}
            className="block h-full origin-left animate-grow rounded-full bg-linear-to-r from-primary via-primary to-primary/40 shadow-[0_0_12px_var(--brand-primary)] motion-reduce:animate-none"
          />
        </div>
        <ol className="relative grid grid-cols-2 gap-6 md:grid-cols-4">
          {steps.map((step, index) => (
            <StepNode key={step.key} step={step} index={index} />
          ))}
        </ol>
      </div>
    </Card>
  );
}

function ProfilePreview({ nickname }: { nickname: string }) {
  const displayName = nickname.trim() || translate('copy.apply.previewPlaceholder');
  const hasNickname = nickname.trim().length > 0;

  return (
    <section
      style={staggerStyle(1, 300)}
      className="glow-border relative flex h-full animate-rise flex-col overflow-hidden rounded-xl bg-surface p-6 shadow-card motion-reduce:animate-none"
      aria-label={translate('copy.apply.preview')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-20 size-64 animate-float rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none"
      />
      <p className="relative flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-fg-subtle">
        <LiveDot />
        {translate('copy.apply.preview')}
      </p>

      <div className="relative mt-8 flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="relative grid size-24 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_55%,var(--brand-primary))] motion-reduce:animate-none"
          />
          <span className="relative grid size-[88px] place-items-center rounded-full bg-surface">
            <Avatar name={displayName} className="size-20 text-2xl" />
          </span>
          <span className="absolute -top-1 -right-1 grid size-8 animate-float place-items-center rounded-full bg-primary text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)] motion-reduce:animate-none">
            <Icon name="trophy" size={16} />
          </span>
        </span>

        <p
          key={displayName}
          className={cx(
            'max-w-full animate-feed-in truncate text-2xl font-semibold tracking-tight motion-reduce:animate-none',
            hasNickname ? 'text-fg' : 'text-fg-subtle italic',
          )}
        >
          {displayName}
        </p>
        <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary">
          <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name="copy" size={14} className="relative" />
          <span className="relative">{translate('copy.apply.masterBadge')}</span>
        </span>
        <p className="max-w-xs text-xs text-fg-muted">{translate('copy.apply.nicknameHint')}</p>
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

      <StepperRail steps={steps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <form
          onSubmit={handleSubmit}
          style={staggerStyle(0, 300)}
          className="glow-border flex animate-rise flex-col gap-5 rounded-xl bg-surface p-6 shadow-card motion-reduce:animate-none"
        >
          <Field
            htmlFor="master-name"
            label={
              <>
                {translate('copy.apply.nameLabel')}{' '}
                <span className="font-normal text-fg-subtle">{translate('copy.apply.fromProfile')}</span>
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

          <span aria-hidden="true" className="h-px w-full origin-left animate-grow bg-linear-to-r from-primary/60 via-line to-transparent motion-reduce:animate-none" />

          <Checkbox
            checked={acceptedTerms}
            disabled={isSubmitted}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            label={<span className="font-medium text-fg">{translate('copy.apply.terms')}</span>}
          />

          {isSubmitted && <Alert tone="success">{translate('copy.apply.submitted')}</Alert>}

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            disabled={!canSubmit}
            className="group/submit relative self-start overflow-hidden shadow-[0_14px_30px_-14px_var(--brand-primary)]"
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
        </form>

        <ProfilePreview nickname={nickname} />
      </div>
    </div>
  );
}
