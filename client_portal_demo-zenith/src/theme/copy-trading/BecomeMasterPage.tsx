'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox, Field, Input } from '../ui/Input';

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
const PIXELS_PER_STEP = 6;

const verificationSteps: ApplicationStep[] = [
  { key: 'email', icon: 'mail', status: 'approved' },
  { key: 'mobile', icon: 'smartphone', status: 'approved' },
  { key: 'personal', icon: 'user', status: 'approved' },
];

const RED = 'var(--zenith-red)';
// Approved reads solid white, under review solid red, not applied as a muted outline.
const statusChip: Record<StepStatus, string> = {
  approved: 'bg-fg text-app',
  notApplied: 'text-fg-muted ring-1 ring-line-strong',
  review: 'bg-[var(--zenith-red)] text-white',
};
const statusDot: Record<StepStatus, string> = { approved: 'bg-[var(--zenith-red)]', notApplied: 'bg-fg-subtle', review: 'bg-white' };

const panelClass = 'orbit-card relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-fg/[0.04] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/* ───────────── Title ───────────── */

function PageTitle({ approved, total }: { approved: number; total: number }) {
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <RedDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyBecomeMaster')}</h2>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('copy.apply.subtitle')}</p>
      </div>
      <span className={cx(chipClass, 'shrink-0 self-start py-1 pl-1 lg:self-auto')}>
        <span className="inline-flex h-6 items-center rounded-full bg-fg px-2 text-app tabular-nums">
          {approved}
          <span className="opacity-60">/{total}</span>
        </span>
        <LiveDot />
        {translate('copy.apply.status.approved')}
      </span>
    </header>
  );
}

/* ───────────── Step rail: open progress figure + pixel strip + capsule steps on a route ───────────── */

// One pixel group per step: approved groups light up white, the step under review blinks red, open steps twinkle.
function ProgressMeter({ steps, approved }: { steps: ApplicationStep[]; approved: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
        <CountUp value={approved} format={(current) => String(Math.round(current))} />
        <span className="text-3xl text-fg-subtle">/{steps.length}</span>
      </p>
      <span aria-hidden="true" className="flex gap-2">
        {steps.map((step, stepIndex) => (
          <span key={step.key} className="grid flex-1 grid-cols-3 gap-1">
            {Array.from({ length: PIXELS_PER_STEP }, (_, index) => {
              const cell = stepIndex * PIXELS_PER_STEP + index;
              const isApproved = step.status === 'approved';
              const isReview = step.status === 'review';
              return (
                <span
                  key={index}
                  style={{ animationDelay: isApproved ? `${300 + cell * 35}ms` : `${(cell * 173) % 1600}ms`, background: isReview ? RED : undefined }}
                  className={cx('h-3 rounded-[3px]', isApproved ? 'zenith-pixel bg-fg' : cx('zenith-twinkle', !isReview && 'bg-fg/15'))}
                />
              );
            })}
          </span>
        ))}
      </span>
    </div>
  );
}

function RailStep({ step, index, nextStatus, isCurrent }: { step: ApplicationStep; index: number; nextStatus?: StepStatus; isCurrent: boolean }) {
  const isApproved = step.status === 'approved';
  const isReview = step.status === 'review';
  const isNextApproved = nextStatus === 'approved';

  return (
    <li style={staggerStyle(index, 160)} className="zenith-tile relative flex min-w-0 flex-col gap-3 lg:pr-3">
      <div className="flex items-center gap-2">
        <span className="relative grid size-11 shrink-0 place-items-center">
          {isCurrent && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1.5 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
          {!isApproved && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-fg/15 motion-reduce:hidden" />}
          <span
            style={isReview ? { background: RED } : undefined}
            className={cx('relative grid size-11 place-items-center rounded-full', isApproved ? 'bg-fg text-app' : isReview ? 'text-white' : 'border border-dashed border-line-strong bg-app text-fg')}
          >
            <Icon name={isApproved ? 'check' : step.icon} size={17} />
          </span>
        </span>
        {/* Route to the next step: solid once that step is approved, dashed with a red bead running while it is open. */}
        {nextStatus && (
          <span aria-hidden="true" className={cx('relative hidden h-0 flex-1 lg:block', isNextApproved ? 'border-t-2 border-fg/70' : 'border-t-2 border-dashed border-line-strong')}>
            {!isNextApproved && <span style={{ background: RED }} className="zenith-route absolute top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2 rounded-[22px] bg-fg/[0.03] p-3.5 ring-1 ring-line">
        <p className="flex items-center gap-2">
          <span aria-hidden="true" className="font-mono text-[10px] font-bold text-fg-subtle tabular-nums">
            {stepNumber(index)}
          </span>
          <span className="truncate text-sm font-semibold text-fg">{translate(`copy.apply.step.${step.key}`)}</span>
        </p>
        <span className={cx('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusChip[step.status])}>
          <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusDot[step.status])} />
          {translate(`copy.apply.status.${step.status}`)}
        </span>
      </div>
    </li>
  );
}

function StepRail({ steps }: { steps: ApplicationStep[] }) {
  const approvedCount = steps.filter((step) => step.status === 'approved').length;
  const currentIndex = steps.findIndex((step) => step.status !== 'approved');

  return (
    <section style={staggerStyle(1, 120)} className="zenith-tile grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-5">
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-bold tracking-tight text-fg">{translate('copy.apply.title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('copy.apply.subtitle')}</p>
        </div>
        <ProgressMeter steps={steps} approved={approvedCount} />
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
        {steps.map((step, index) => (
          <RailStep key={step.key} step={step} index={index} nextStatus={steps[index + 1]?.status} isCurrent={index === currentIndex} />
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Public profile preview ───────────── */

const AVATAR_DOTS = 36;

function ProfilePreview({ nickname }: { nickname: string }) {
  const displayName = nickname.trim() || translate('copy.apply.previewPlaceholder');
  const hasNickname = nickname.trim().length > 0;

  return (
    <section aria-label={translate('copy.apply.preview')} className={cx(panelClass, 'flex h-full flex-col items-center gap-5 p-5 text-center sm:p-6')}>
      {/* Pixel matrix fading down from the top edge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--color-line-strong)_1.4px,transparent_1.6px)] [background-size:12px_12px] [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]"
      />
      <p className={cx(chipClass, 'self-start text-[10.5px] tracking-[0.14em] uppercase')}>
        <LiveDot />
        {translate('copy.apply.preview')}
      </p>

      {/* Avatar inside a ring of dots that light up white one by one, with a red bead orbiting. */}
      <span className="relative mt-2 grid size-40 place-items-center">
        <svg aria-hidden="true" viewBox="0 0 160 160" className="absolute inset-0 size-full text-fg">
          {Array.from({ length: AVATAR_DOTS }, (_, index) => {
            const angle = (index / AVATAR_DOTS) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle key={index} cx={80 + Math.cos(angle) * 74} cy={80 + Math.sin(angle) * 74} r="2.2" fill="currentColor" fillOpacity="0.15">
                <animate attributeName="fill-opacity" values="0.15;0.9;0.15" dur="3.6s" begin={`${(index / AVATAR_DOTS) * 3.6}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
        </svg>
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:6s] motion-reduce:animate-none">
          <span style={{ background: RED }} className="absolute top-[3px] left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
        </span>
        <span aria-hidden="true" className="absolute inset-5 rounded-full border border-dashed border-line-strong" />
        <Avatar name={displayName} className="size-24 rounded-full! text-3xl shadow-[0_14px_30px_-14px_rgb(0_0_0/0.9)]" />
        <span style={{ background: RED }} className="absolute right-3 bottom-3 grid size-10 animate-float place-items-center rounded-full text-white ring-4 ring-app motion-reduce:animate-none">
          <Icon name="trophy" size={16} />
        </span>
      </span>

      <p
        key={displayName}
        className={cx('max-w-full animate-feed-in truncate text-3xl font-black tracking-tight text-fg motion-reduce:animate-none sm:text-4xl', !hasNickname && 'italic opacity-45')}
      >
        {displayName}
      </p>

      <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-fg py-1 pr-3.5 pl-1 text-xs font-bold text-app">
        <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-white/40 motion-reduce:hidden" />
        <span style={{ background: RED }} className="relative grid size-6 place-items-center rounded-full text-white">
          <Icon name="copy" size={12} />
        </span>
        <span className="relative">{translate('copy.apply.masterBadge')}</span>
      </span>

      {/* Pixel meter of the nickname length: one cell per allowed character, the newest typed cell in red. */}
      <div className="mt-auto flex w-full flex-col gap-2 border-t border-line pt-4">
        <div aria-hidden="true" className="grid grid-cols-16 gap-1">
          {Array.from({ length: NICKNAME_MAX }, (_, index) => {
            const isFilled = index < nickname.length;
            const isNewest = index === nickname.length - 1;
            return (
              <span
                key={index}
                style={isNewest ? { background: RED } : undefined}
                className={cx('h-3 rounded-[3px] transition-[background-color,transform] duration-300 motion-reduce:transition-none', isFilled ? 'scale-100 bg-fg' : 'scale-90 bg-fg/10')}
              />
            );
          })}
        </div>
        <p className="flex items-center justify-between gap-3 text-[11px] text-fg-muted">
          <span className="truncate text-left">{translate('copy.apply.nicknameHint')}</span>
          <span className="shrink-0 font-mono font-bold text-fg tabular-nums">
            {nickname.length}/{NICKNAME_MAX}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ───────────── Application form ───────────── */

// Each form step hangs on one dashed route: a white bead once done, its number while open.
function FormStep({ index, isDone, isLast = false, children }: { index: number; isDone: boolean; isLast?: boolean; children: ReactNode }) {
  return (
    <div style={staggerStyle(index, 250)} className="relative flex animate-feed-in gap-4 pb-7 motion-reduce:animate-none">
      {!isLast && <span aria-hidden="true" className={cx('absolute top-11 bottom-1 left-[19px] border-l-2', isDone ? 'border-fg/60' : 'border-dashed border-line-strong')} />}
      <span
        aria-hidden="true"
        className={cx(
          'relative grid size-10 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold tabular-nums transition-colors duration-300',
          isDone ? 'bg-fg text-app' : 'border border-dashed border-line-strong bg-app text-fg',
        )}
      >
        {isDone ? <Icon name="check" size={14} /> : stepNumber(index)}
        {!isDone && <span style={{ background: RED }} className="absolute -top-0.5 -right-0.5 size-2.5 animate-ping-soft rounded-full motion-reduce:animate-none" />}
      </span>
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </div>
  );
}

export default function BecomeMasterPage() {
  const [nickname, setNickname] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<StepStatus>('notApplied');

  const isSubmitted = applicationStatus === 'review';
  const hasNickname = nickname.trim().length > 0;
  const canSubmit = hasNickname && acceptedTerms && !isSubmitted;
  const steps: ApplicationStep[] = [...verificationSteps, { key: 'application', icon: 'bell', status: applicationStatus }];
  const approvedCount = steps.filter((step) => step.status === 'approved').length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));
    setIsSubmitting(false);
    setApplicationStatus('review');
  }

  // Skeleton: open header, open step rail, then the form on the left with the live preview in a side column.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle approved={approvedCount} total={steps.length} />
      <StepRail steps={steps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
        <form onSubmit={handleSubmit} style={staggerStyle(2, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5 sm:p-7')}>
          <FormStep index={0} isDone>
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
          </FormStep>

          <FormStep index={1} isDone={hasNickname}>
            <Field
              htmlFor="master-nickname"
              label={
                <>
                  {translate('copy.apply.nicknameLabel')} <span aria-hidden="true" className="text-[var(--zenith-red)]">*</span>
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
                  <span className="pr-3 text-[11px] text-fg-subtle tabular-nums">
                    {nickname.length}/{NICKNAME_MAX}
                  </span>
                }
              />
            </Field>
          </FormStep>

          <FormStep index={2} isDone={acceptedTerms} isLast>
            <div
              className={cx(
                'rounded-[22px] p-4 transition-[box-shadow,background-color] duration-300',
                acceptedTerms ? 'bg-fg/[0.06] ring-1 ring-fg/40' : 'border border-dashed border-line-strong',
              )}
            >
              <Checkbox
                checked={acceptedTerms}
                disabled={isSubmitted}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                label={<span className="font-medium text-fg">{translate('copy.apply.terms')}</span>}
              />
            </div>
          </FormStep>

          {isSubmitted && (
            <div className="animate-rise motion-reduce:animate-none">
              <Alert tone="success">{translate('copy.apply.submitted')}</Alert>
            </div>
          )}

          <div className="mt-auto flex justify-end border-t border-line pt-5">
            <Button type="submit" size="lg" loading={isSubmitting} disabled={!canSubmit} className="group/submit relative w-full overflow-hidden rounded-full! sm:w-auto">
              {canSubmit && <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-10 bg-white/35 motion-reduce:hidden" />}
              <span className="relative">{translate('copy.apply.submit')}</span>
              <Icon name="arrowRight" size={20} className="relative transition-transform duration-200 group-hover/submit:translate-x-1 motion-reduce:transition-none" />
            </Button>
          </div>
        </form>

        <div style={staggerStyle(3, 120)} className="zenith-tile">
          <ProfilePreview nickname={nickname} />
        </div>
      </div>
    </div>
  );
}
