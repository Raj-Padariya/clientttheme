'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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
const RING_RADIUS = 42;

const verificationSteps: ApplicationStep[] = [
  { key: 'email', icon: 'mail', status: 'approved' },
  { key: 'mobile', icon: 'smartphone', status: 'approved' },
  { key: 'personal', icon: 'user', status: 'approved' },
];

const statusChip: Record<StepStatus, string> = {
  approved: 'text-success ring-success/40',
  notApplied: 'text-fg-muted ring-line-strong',
  review: 'text-warning ring-warning/40',
};
const statusDot: Record<StepStatus, string> = { approved: 'bg-success', notApplied: 'bg-fg-subtle', review: 'bg-warning' };

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

/* ───────────── Title ───────────── */

function PageTitle({ approved, total }: { approved: number; total: number }) {
  return (
    <header className="flex animate-rise flex-col gap-3 motion-reduce:animate-none lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className={captionClass}>{translate('nav.copyTrading')}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.copyBecomeMaster')}</h2>
        <p className="mt-1 text-sm text-fg-muted">{translate('copy.apply.subtitle')}</p>
      </div>
      <span className={cx(chipClass, 'shrink-0 self-start lg:self-auto')}>
        <LiveDot />
        <span className="tabular-nums">
          {approved}
          <span className="text-fg-subtle">/{total}</span>
        </span>
        {translate('copy.apply.status.approved')}
      </span>
    </header>
  );
}

/* ───────────── Step rail: progress ring + horizontal bead track ───────────── */

function ProgressRing({ approved, total }: { approved: number; total: number }) {
  const isMounted = useMounted();
  const circumference = 2 * Math.PI * RING_RADIUS;
  const share = isMounted ? approved / total : 0;

  return (
    <span className="relative grid size-24 shrink-0 place-items-center">
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-line" />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={round2(circumference)}
          style={{ strokeDashoffset: round2(circumference * (1 - share)), transition: 'stroke-dashoffset 1200ms cubic-bezier(.2,.8,.2,1) 300ms' }}
          className="stroke-fg"
        />
        {Array.from({ length: total }, (_, index) => (
          <line key={index} x1="50" y1="3" x2="50" y2="12" transform={`rotate(${round2((360 / total) * index)} 50 50)`} strokeWidth="2.5" className="stroke-app" />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute inset-4 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
      <span className={cx(beadClass, 'size-14 text-xl font-black tabular-nums')}>
        <span>
          <CountUp value={approved} format={(current) => String(Math.round(current))} />
          <span className="text-sm text-fg-subtle">/{total}</span>
        </span>
      </span>
    </span>
  );
}

function RailStep({ step, index, nextStatus, isCurrent }: { step: ApplicationStep; index: number; nextStatus?: StepStatus; isCurrent: boolean }) {
  const isApproved = step.status === 'approved';
  const isNextApproved = nextStatus === 'approved';

  return (
    <li style={staggerStyle(index, 160)} className="relative flex flex-1 animate-rise gap-4 pb-6 last:pb-0 motion-reduce:animate-none md:flex-col md:pr-4 md:pb-0">
      {/* Connector to the next bead: drawn solid once that step is approved, dashed while it is still open. */}
      {nextStatus && (
        <>
          <span
            aria-hidden="true"
            className={cx('absolute top-14 bottom-0 left-6 w-0 md:hidden', isNextApproved ? 'border-l-2 border-fg/70' : 'border-l-2 border-dashed border-line-strong')}
          />
          <span
            aria-hidden="true"
            style={{ animationDelay: `${400 + index * 200}ms` }}
            className={cx(
              'absolute top-6 right-2 left-16 hidden h-0 origin-left animate-grow motion-reduce:animate-none md:block',
              isNextApproved ? 'border-t-2 border-fg/70' : 'border-t-2 border-dashed border-line-strong',
            )}
          />
        </>
      )}

      <span className="relative grid size-12 shrink-0 place-items-center">
        {isCurrent && <span aria-hidden="true" className="absolute -inset-1.5 animate-rim-spin rounded-full border border-dashed border-fg/50 motion-reduce:animate-none" />}
        {!isApproved && <span aria-hidden="true" className={cx('absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden', step.status === 'review' ? 'bg-warning/25' : 'bg-fg/15')} />}
        <span
          className={cx(
            'relative grid size-12 place-items-center rounded-full',
            isApproved ? 'bg-fg text-app' : step.status === 'review' ? 'bg-warning text-app' : 'nova-gloss text-fg',
          )}
        >
          <Icon name={isApproved ? 'check' : step.icon} size={18} />
        </span>
      </span>

      <div className="flex min-w-0 flex-col gap-1.5 pt-1 md:pt-0">
        <p className="flex items-center gap-2">
          <span aria-hidden="true" className="font-mono text-[10px] font-bold text-fg-subtle tabular-nums">{stepNumber(index)}</span>
          <span className="truncate text-sm font-semibold text-fg">{translate(`copy.apply.step.${step.key}`)}</span>
        </p>
        <span className={cx('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', statusChip[step.status])}>
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
    <section style={staggerStyle(1, 120)} className={cx(panelClass, 'grid animate-rise gap-6 p-5 motion-reduce:animate-none sm:p-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-center')}>
      <div className="flex items-center gap-4 lg:border-r lg:border-dotted lg:border-line-strong lg:pr-6">
        <ProgressRing approved={approvedCount} total={steps.length} />
        <div className="min-w-0">
          <h2 className="text-base leading-snug font-bold tracking-tight text-fg">{translate('copy.apply.title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('copy.apply.subtitle')}</p>
        </div>
      </div>

      <ol className="flex flex-col md:flex-row">
        {steps.map((step, index) => (
          <RailStep key={step.key} step={step} index={index} nextStatus={steps[index + 1]?.status} isCurrent={index === currentIndex} />
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Frosted public profile preview ───────────── */

function ProfilePreview({ nickname }: { nickname: string }) {
  const displayName = nickname.trim() || translate('copy.apply.previewPlaceholder');
  const hasNickname = nickname.trim().length > 0;

  return (
    <FrostCard className="h-full">
      <section aria-label={translate('copy.apply.preview')} className={cx('flex h-full flex-col items-center gap-5 text-center sm:p-1', inkClass)}>
        <p className={cx(inkCaptionClass, 'inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5', frostChipClass)}>
          <LiveDot />
          {translate('copy.apply.preview')}
        </p>

        <span className="relative mt-2 grid size-36 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/30 motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-3 animate-rim-spin rounded-full border border-[#0a1220]/20 [animation-direction:reverse] motion-reduce:animate-none" />
          <Avatar name={displayName} className="size-24 rounded-full! text-3xl shadow-[0_14px_30px_-14px_rgb(10_18_32/0.8)]" />
          <span className={cx('absolute right-1 bottom-1 grid size-10 animate-float place-items-center rounded-full motion-reduce:animate-none', frostChipClass)}>
            <Icon name="trophy" size={16} />
          </span>
        </span>

        <p
          key={displayName}
          className={cx('max-w-full animate-feed-in truncate text-3xl font-black tracking-[-0.03em] motion-reduce:animate-none sm:text-4xl', !hasNickname && 'italic opacity-45')}
        >
          {displayName}
        </p>

        <span className={cx('relative inline-flex items-center gap-2 overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-bold', frostChipClass)}>
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-[#0a1220]/10 to-transparent motion-reduce:hidden" />
          <Icon name="copy" size={14} className="relative" />
          <span className="relative">{translate('copy.apply.masterBadge')}</span>
        </span>

        {/* Dot meter of the nickname length: one dot per allowed character. */}
        <div className="mt-auto flex w-full flex-col gap-2 border-t border-dotted border-[#0a1220]/25 pt-4">
          <div aria-hidden="true" className="grid grid-cols-16 gap-1">
            {Array.from({ length: NICKNAME_MAX }, (_, index) => (
              <span
                key={index}
                className={cx('aspect-square rounded-full transition-[background-color,transform] duration-300 motion-reduce:transition-none', index < nickname.length ? 'scale-100 bg-[#0a1220]' : 'scale-75 bg-[#0a1220]/15')}
              />
            ))}
          </div>
          <p className={cx('flex items-center justify-between gap-3 text-[11px]', inkMutedClass)}>
            <span className="truncate text-left">{translate('copy.apply.nicknameHint')}</span>
            <span className="shrink-0 font-mono font-bold text-[#0a1220] tabular-nums">
              {nickname.length}/{NICKNAME_MAX}
            </span>
          </p>
        </div>
      </section>
    </FrostCard>
  );
}

/* ───────────── Application form ───────────── */

function FormStep({ index, isDone, children }: { index: number; isDone: boolean; children: ReactNode }) {
  return (
    <div style={staggerStyle(index, 250)} className="flex animate-feed-in gap-4 border-b border-dotted border-line-strong py-5 first:pt-0 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className={cx(
          'grid size-9 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold tabular-nums transition-colors duration-300',
          isDone ? 'bg-fg text-app' : 'nova-gloss text-fg',
        )}
      >
        {isDone ? <Icon name="check" size={14} /> : stepNumber(index)}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle approved={approvedCount} total={steps.length} />
      <StepRail steps={steps} />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-stretch">
        <div style={staggerStyle(2, 120)} className="animate-rise motion-reduce:animate-none">
          <ProfilePreview nickname={nickname} />
        </div>

        <form onSubmit={handleSubmit} style={staggerStyle(3, 120)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6')}>
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
                  <span className="pr-3 text-[11px] text-fg-subtle tabular-nums">
                    {nickname.length}/{NICKNAME_MAX}
                  </span>
                }
              />
            </Field>
          </FormStep>

          <FormStep index={2} isDone={acceptedTerms}>
            <div className={cx('rounded-2xl p-4 transition-[box-shadow,background-color] duration-300', acceptedTerms ? 'bg-success/[0.06] ring-1 ring-success/40' : 'border border-dashed border-line-strong')}>
              <Checkbox
                checked={acceptedTerms}
                disabled={isSubmitted}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                label={<span className="font-medium text-fg">{translate('copy.apply.terms')}</span>}
              />
            </div>
          </FormStep>

          {isSubmitted && (
            <div className="mt-5 animate-rise motion-reduce:animate-none">
              <Alert tone="success">{translate('copy.apply.submitted')}</Alert>
            </div>
          )}

          <div className="mt-auto flex justify-end pt-5">
            <Button type="submit" size="lg" loading={isSubmitting} disabled={!canSubmit} className="group/submit relative w-full overflow-hidden rounded-full! sm:w-auto">
              {canSubmit && <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/25 to-transparent motion-reduce:hidden" />}
              <span className="relative">{translate('copy.apply.submit')}</span>
              <Icon name="arrowRight" size={20} className="relative transition-transform duration-200 group-hover/submit:translate-x-1 motion-reduce:transition-none" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
