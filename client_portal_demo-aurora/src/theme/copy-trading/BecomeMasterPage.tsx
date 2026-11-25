'use client';

import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox, Field, Input } from '../ui/Input';
import '../promotion/market.css';
import '../pamm/desk.css';

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
const TICKS_PER_STEP = 8;

const verificationSteps: ApplicationStep[] = [
  { key: 'email', icon: 'mail', status: 'approved' },
  { key: 'mobile', icon: 'smartphone', status: 'approved' },
  { key: 'personal', icon: 'user', status: 'approved' },
];

// Approved reads as a sage "filled" tag, under review as a clay order, not applied as a muted outline.
const statusChip: Record<StepStatus, string> = {
  approved: 'bg-(--hero-buy)/15 text-(--hero-buy)',
  notApplied: 'text-fg-muted ring-1 ring-line-strong',
  review: 'bg-(--aurora-cta-from) text-[#062520]',
};
const statusDot: Record<StepStatus, string> = { approved: 'bg-(--hero-buy)', notApplied: 'bg-fg-subtle', review: 'mkt-blink bg-[#062520]' };

// Watchlist sparklines: approved rows trend up, the row under review hovers flat at its limit, open rows are a dashed baseline.
const sparkPaths: Record<StepStatus, string> = {
  approved: 'M0 20 L10 17 L18 19 L28 12 L36 14 L46 7 L56 9 L64 3',
  review: 'M0 12 L10 10 L18 13 L28 11 L36 12 L46 10 L56 12 L64 11',
  notApplied: 'M0 12 H64',
};

// Quote card chart: a climbing line with a pullback, drawn in on load.
const QUOTE_PATH = 'M0 62 L18 56 L32 60 L50 44 L66 48 L84 34 L100 38 L120 22 L138 28 L156 14 L176 18 L200 6';
const QUOTE_AREA = `${QUOTE_PATH} V80 H0 Z`;

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const chipClass = 'inline-flex items-center gap-1.5 rounded-lg bg-fg/[0.04] px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-line';

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

// The listing symbol: the first four letters or digits of the name, upper-cased.
function tickerOf(name: string) {
  return name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
}

function ClayDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

/* ───────────── Title ───────────── */

function PageTitle({ approved, total }: { approved: number; total: number }) {
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <ClayDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyBecomeMaster')}</h2>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('copy.apply.subtitle')}</p>
      </div>
      {/* Quote chip: the approved count as a price with a mini chart drawing in beside it. */}
      <span className={cx(chipClass, 'shrink-0 self-start py-1 pl-1 lg:self-auto')}>
        <span className="inline-flex h-7 items-center rounded-md bg-(--hero-buy) px-2 font-mono text-[#062520] tabular-nums">
          <Icon name="trendUp" size={12} className="mr-1" />
          {approved}
          <span className="opacity-60">/{total}</span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 64 24" className="h-5 w-12">
          <path d={sparkPaths.approved} pathLength={1} fill="none" strokeWidth={2} strokeLinejoin="round" className="mkt-draw stroke-(--hero-buy)" />
        </svg>
        <LiveDot />
        {translate('copy.apply.status.approved')}
      </span>
    </header>
  );
}

/* ───────────── Listing watchlist: tick tape progress + one quote row per step ───────────── */

// One group of ticks per step: approved ticks rise in sage, the step under review blinks clay, open steps bounce like idle volume.
function ProgressMeter({ steps, approved }: { steps: ApplicationStep[]; approved: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
        <CountUp value={approved} format={(current) => String(Math.round(current))} />
        <span className="text-3xl text-fg-subtle">/{steps.length}</span>
      </p>
      <span aria-hidden="true" className="flex h-10 items-end gap-2 rounded-lg bg-fg/[0.03] p-1.5 ring-1 ring-line">
        {steps.map((step, stepIndex) => (
          <span key={step.key} className="flex h-full flex-1 items-end gap-[2px]">
            {Array.from({ length: TICKS_PER_STEP }, (_, index) => {
              const cell = stepIndex * TICKS_PER_STEP + index;
              const height = 30 + ((cell * 29) % 70);
              const motion: CSSProperties =
                step.status === 'approved' ? ({ '--candle-delay': `${300 + cell * 30}ms` } as CSSProperties) : ({ '--vol-delay': `${(index % 4) * 0.14}s` } as CSSProperties);
              return (
                <span
                  key={index}
                  style={{ height: `${height}%`, ...motion }}
                  className={cx(
                    'flex-1 rounded-[2px]',
                    step.status === 'approved' && 'mkt-candle bg-(--hero-buy)',
                    step.status === 'review' && 'mkt-blink bg-(--aurora-cta-from)',
                    step.status === 'notApplied' && 'mkt-vol bg-fg/15',
                  )}
                />
              );
            })}
          </span>
        ))}
      </span>
    </div>
  );
}

function WatchRow({ step, index, isCurrent }: { step: ApplicationStep; index: number; isCurrent: boolean }) {
  const isApproved = step.status === 'approved';
  const isReview = step.status === 'review';

  return (
    <li
      style={staggerStyle(index, 160)}
      className={cx(
        'zenith-tile relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_4.5rem_auto] sm:px-4',
        isCurrent && 'bg-(--aurora-cta-from)/[0.06]',
      )}
    >
      {isCurrent && <span aria-hidden="true" className="desk-stripes absolute inset-y-0 left-0 w-1 bg-(--aurora-cta-from)" />}
      <span className="relative grid size-10 shrink-0 place-items-center">
        {isCurrent && <span aria-hidden="true" className="absolute -inset-1 animate-ring-ripple rounded-xl border-2 border-(--aurora-cta-from) motion-reduce:hidden" />}
        <span
          className={cx(
            'relative grid size-10 place-items-center rounded-xl',
            isApproved && 'bg-(--hero-buy) text-[#062520]',
            isReview && 'bg-(--aurora-cta-from) text-[#062520]',
            !isApproved && !isReview && 'border border-dashed border-line-strong bg-app text-fg',
          )}
        >
          <Icon name={isApproved ? 'check' : step.icon} size={16} />
        </span>
      </span>

      <p className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="font-mono text-[10px] font-bold text-fg-subtle tabular-nums">
          {stepNumber(index)}
        </span>
        <span className="truncate text-sm font-semibold text-fg">{translate(`copy.apply.step.${step.key}`)}</span>
      </p>

      <svg aria-hidden="true" viewBox="0 0 64 24" className="hidden h-6 w-full overflow-visible sm:block">
        <path
          d={sparkPaths[step.status]}
          pathLength={isApproved ? 1 : undefined}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeDasharray={isApproved ? undefined : '3 3'}
          className={cx(isApproved && 'mkt-draw stroke-(--hero-buy)', isReview && 'mkt-march stroke-(--aurora-cta-from)', !isApproved && !isReview && 'stroke-fg/25')}
        />
        {isReview && <circle cx={64} cy={11} r={3} className="mkt-blink fill-(--aurora-cta-from)" />}
      </svg>

      <span className={cx('inline-flex items-center gap-1.5 justify-self-end rounded-md px-2 py-1 font-mono text-[11px] font-bold whitespace-nowrap', statusChip[step.status])}>
        <span aria-hidden="true" className={cx('size-1.5 rounded-full', statusDot[step.status])} />
        {translate(`copy.apply.status.${step.status}`)}
      </span>
    </li>
  );
}

function StepRail({ steps }: { steps: ApplicationStep[] }) {
  const approvedCount = steps.filter((step) => step.status === 'approved').length;
  const currentIndex = steps.findIndex((step) => step.status !== 'approved');

  return (
    <section style={staggerStyle(1, 120)} className={cx(panelClass, 'zenith-tile grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center')}>
      <div className="flex flex-col gap-5">
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-bold tracking-tight text-fg">{translate('copy.apply.title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('copy.apply.subtitle')}</p>
        </div>
        <ProgressMeter steps={steps} approved={approvedCount} />
      </div>

      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-fg/[0.02] ring-1 ring-line">
        {steps.map((step, index) => (
          <WatchRow key={step.key} step={step} index={index} isCurrent={index === currentIndex} />
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Public profile preview: live quote card ───────────── */

function ProfilePreview({ nickname }: { nickname: string }) {
  const displayName = nickname.trim() || translate('copy.apply.previewPlaceholder');
  const hasNickname = nickname.trim().length > 0;
  const ticker = tickerOf(displayName);

  return (
    <section aria-label={translate('copy.apply.preview')} className={cx(panelClass, 'flex h-full flex-col gap-5 p-5 sm:p-6')}>
      <p className={cx(chipClass, 'self-start text-[10.5px] tracking-[0.14em] uppercase')}>
        <LiveDot />
        {translate('copy.apply.preview')}
      </p>

      {/* Quote head: avatar tile, the listing symbol and the name. */}
      <div className="flex items-center gap-4">
        <span className="relative grid shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute -inset-1.5 animate-ring-ripple rounded-[22px] border-2 border-(--hero-buy)/70 motion-reduce:hidden" />
          <Avatar name={displayName} className="size-20 rounded-2xl! text-2xl ring-2 ring-(--hero-buy) shadow-[0_14px_30px_-14px_rgb(0_0_0/0.9)]" />
          <span className="absolute -right-2 -bottom-2 grid size-8 animate-float place-items-center rounded-lg bg-(--aurora-cta-from) text-[#062520] ring-4 ring-app motion-reduce:animate-none">
            <Icon name="trophy" size={14} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <span aria-hidden="true" className="inline-flex items-center gap-1 rounded-md bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[11px] font-black tracking-widest text-(--hero-buy) ring-1 ring-line">
            <Icon name="trendUp" size={11} />
            {ticker}
          </span>
          <p
            key={displayName}
            className={cx('mt-1.5 max-w-full animate-feed-in truncate text-2xl font-black tracking-tight text-fg motion-reduce:animate-none sm:text-3xl', !hasNickname && 'italic opacity-45')}
          >
            {displayName}
          </p>
        </div>
      </div>

      {/* Quote chart: a climbing line drawing in over a sage wash, the newest price pulsing at its end. */}
      <div aria-hidden="true" className="relative overflow-hidden rounded-xl bg-fg/[0.03] p-2 ring-1 ring-line">
        <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="h-24 w-full overflow-visible">
          {[20, 40, 60].map((y) => (
            <line key={y} x1={0} x2={200} y1={y} y2={y} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" className="stroke-fg/10" />
          ))}
          <path d={QUOTE_AREA} className="fill-(--hero-buy)/10" />
          <path d={QUOTE_PATH} pathLength={1} fill="none" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="mkt-draw stroke-(--hero-buy)" />
        </svg>
        <span className="absolute top-[calc(0.5rem+7.5%-6px)] right-[calc(0.5rem-6px)] grid size-3 place-items-center">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy) motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full bg-(--hero-buy) ring-2 ring-app" />
        </span>
        <span className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/10" />
      </div>

      <span className="relative inline-flex items-center gap-2 self-start overflow-hidden rounded-full bg-(--hero-buy) py-1 pr-3.5 pl-1 text-xs font-bold text-[#062520]">
        <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/40" />
        <span className="relative grid size-6 place-items-center rounded-full bg-(--aurora-cta-from) text-[#062520]">
          <Icon name="copy" size={12} />
        </span>
        <span className="relative">{translate('copy.apply.masterBadge')}</span>
      </span>

      {/* Nickname length as a volume strip: one bar per allowed character, the newest typed bar in clay. */}
      <div className="mt-auto flex w-full flex-col gap-2 border-t border-line pt-4">
        <div aria-hidden="true" className="flex h-6 items-end gap-[2px]">
          {Array.from({ length: NICKNAME_MAX }, (_, index) => {
            const isFilled = index < nickname.length;
            const isNewest = index === nickname.length - 1;
            const height = 35 + ((index * 41) % 65);
            return (
              <span
                key={index}
                style={{ height: isFilled ? `${height}%` : '20%' }}
                className={cx(
                  'flex-1 rounded-[1.5px] transition-[height,background-color] duration-300 motion-reduce:transition-none',
                  isNewest ? 'bg-(--aurora-cta-from)' : isFilled ? 'bg-(--hero-buy)' : 'bg-fg/10',
                )}
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

/* ───────────── Application form: order ticket ───────────── */

// Each ticket line hangs on one tick rail: a sage check tile once done, its number with a blinking clay dot while open.
function FormStep({ index, isDone, isLast = false, children }: { index: number; isDone: boolean; isLast?: boolean; children: ReactNode }) {
  return (
    <div style={staggerStyle(index, 250)} className="relative flex animate-feed-in gap-4 pb-7 motion-reduce:animate-none">
      {!isLast && (
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-11 bottom-1 left-[19px] w-0.5',
            isDone ? 'bg-(--hero-buy)/60' : '[background-image:repeating-linear-gradient(to_bottom,var(--color-line-strong)_0_4px,transparent_4px_8px)]',
          )}
        />
      )}
      <span
        aria-hidden="true"
        className={cx(
          'relative grid size-10 shrink-0 place-items-center rounded-xl font-mono text-[11px] font-bold tabular-nums transition-colors duration-300',
          isDone ? 'bg-(--hero-buy) text-[#062520]' : 'border border-dashed border-line-strong bg-app text-fg',
        )}
      >
        {isDone ? <Icon name="check" size={14} /> : stepNumber(index)}
        {!isDone && <span className="mkt-blink absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-(--aurora-cta-from)" />}
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

  // Skeleton: open header, the listing watchlist panel, then the order ticket on the left with the live quote card beside it.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle approved={approvedCount} total={steps.length} />
      <StepRail steps={steps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
        <form onSubmit={handleSubmit} style={staggerStyle(2, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col p-5 sm:p-7')}>
          {/* Ticket perforation along the top edge. */}
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 [background-image:repeating-linear-gradient(90deg,var(--hero-buy)_0_10px,transparent_10px_16px)] opacity-60" />
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
                  {translate('copy.apply.nicknameLabel')} <span aria-hidden="true" className="text-(--aurora-cta-from)">*</span>
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
                'rounded-xl p-4 transition-[box-shadow,background-color] duration-300',
                acceptedTerms ? 'bg-(--hero-buy)/[0.08] ring-1 ring-(--hero-buy)/50' : 'border border-dashed border-line-strong',
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

          <div className="mt-auto flex justify-end border-t border-dashed border-line-strong pt-5">
            <Button type="submit" size="lg" loading={isSubmitting} disabled={!canSubmit} className="group/submit relative w-full overflow-hidden rounded-full! sm:w-auto">
              {canSubmit && <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/35" />}
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
