import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

type StepKey = 'email' | 'mobile' | 'personal' | 'application';
type StepStatus = 'completed' | 'review';

interface ApplicationStep {
  key: StepKey;
  icon: IconName;
  status: StepStatus;
}

const steps: ApplicationStep[] = [
  { key: 'email', icon: 'mail', status: 'completed' },
  { key: 'mobile', icon: 'smartphone', status: 'completed' },
  { key: 'personal', icon: 'user', status: 'completed' },
  { key: 'application', icon: 'bell', status: 'review' },
];

const cardClass = 'orbit-card relative isolate overflow-hidden';
const brandFill = '[background-image:var(--brand-gradient)]';
const eyebrow = 'text-[10.5px] font-semibold tracking-[0.16em] uppercase';

// Beacon: rings around the step the application is waiting on (or a check once every step is done).
function StatusBeacon({ current }: { current: ApplicationStep | undefined }) {
  const isWaiting = current !== undefined;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-44 shrink-0">
        <span aria-hidden="true" className={cx('absolute inset-6 rounded-full blur-2xl animate-ring-breathe motion-reduce:animate-none', isWaiting ? 'bg-warning/25' : 'bg-primary/25')} />
        <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
          <span className={cx('absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_var(--brand-primary)]', brandFill)} />
        </span>
        <span aria-hidden="true" className="absolute inset-5 rounded-full border border-dashed border-fg/15 animate-orbit-spin-rev motion-reduce:animate-none" />
        {isWaiting && <span aria-hidden="true" className="absolute inset-9 rounded-full border border-warning/40 animate-ring-ripple motion-reduce:animate-none" />}
        <span
          className={cx(
            'absolute inset-9 flex items-center justify-center rounded-full border shadow-[inset_0_2px_14px_rgba(0,0,0,0.35)] backdrop-blur-md',
            isWaiting ? 'border-warning/40 bg-warning-soft text-warning' : 'border-primary/40 bg-primary/15 text-primary',
          )}
        >
          <Icon name={isWaiting ? current.icon : 'checkCircle'} size={30} />
        </span>
      </div>
      {isWaiting && (
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm font-semibold text-fg">{translate(`pamm.apply.step.${current.key}`)}</p>
          <Badge tone="warning" dot>
            {translate(`pamm.apply.status.${current.status}`)}
          </Badge>
        </div>
      )}
    </div>
  );
}

function StepStation({ step, index }: { step: ApplicationStep; index: number }) {
  const isCompleted = step.status === 'completed';

  return (
    <li className="relative flex animate-rise flex-col items-center motion-reduce:animate-none" style={{ animationDelay: `${index * 90}ms` }}>
      {/* Station node: sits on the track beam on wide screens. */}
      <span className="relative z-10 flex size-11 items-center justify-center">
        {!isCompleted && <span aria-hidden="true" className="absolute inset-0 rounded-full border border-warning/50 animate-ping motion-reduce:animate-none" />}
        <span
          className={cx(
            'relative flex size-11 items-center justify-center rounded-full ring-4 ring-surface',
            isCompleted ? cx('text-on-primary shadow-[0_0_18px_-4px_var(--brand-primary)]', brandFill) : 'border border-warning/50 bg-warning-soft text-warning',
          )}
        >
          <Icon name={isCompleted ? 'checkCircle' : step.icon} size={19} />
        </span>
      </span>

      <div
        className={cx(
          'mt-4 flex w-full flex-1 flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-colors duration-300 motion-reduce:transition-none',
          isCompleted ? 'border-fg/[0.08] bg-fg/[0.03] hover:border-primary/30' : 'border-warning/40 bg-warning-soft shadow-[0_0_30px_-14px_var(--color-warning)]',
        )}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-mono text-xs text-fg-subtle tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <Icon name={step.icon} size={16} className={isCompleted ? 'text-fg-muted' : 'text-warning'} />
        </div>
        <p className="text-sm font-semibold text-fg">{translate(`pamm.apply.step.${step.key}`)}</p>
        <Badge tone={isCompleted ? 'success' : 'warning'} dot>
          {translate(`pamm.apply.status.${step.status}`)}
        </Badge>
      </div>
    </li>
  );
}

export default function BecomeManagerPage() {
  const completedCount = steps.filter((step) => step.status === 'completed').length;
  const currentStep = steps.find((step) => step.status !== 'completed');
  // The beam runs from the first station to the one being worked on (or the last, once all are done).
  const beamPercent = Math.min(completedCount / (steps.length - 1), 1) * 100;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.pammBecomeManager')} description={translate('pamm.apply.subtitle')} />

      <section className={cx(cardClass, 'animate-rise p-6 motion-reduce:animate-none sm:p-8')}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_0%_0%,color-mix(in_srgb,var(--brand-primary)_16%,transparent),transparent_65%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_left,#000,transparent_60%)]" />

        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className={cx(eyebrow, 'text-primary')}>{translate('nav.pammBecomeManager')}</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{translate('pamm.apply.title')}</h2>
            <p className="mt-2 max-w-lg text-sm text-fg-muted">{translate('pamm.apply.subtitle')}</p>

            <div className="mt-7 flex items-end gap-3">
              <p className="flex items-baseline tabular-nums">
                <span className="bg-clip-text text-6xl leading-none font-bold tracking-tight text-transparent [background-image:linear-gradient(180deg,var(--orbit-ink-top,#ffffff)_0%,var(--orbit-ink-mid,#e4dcff)_55%,var(--brand-primary)_100%)]">
                  {completedCount}
                </span>
                <span className="text-3xl font-semibold text-fg-subtle">/{steps.length}</span>
              </p>
              <p className="mb-1 text-sm text-fg-muted">{translate('pamm.apply.progressLabel')}</p>
            </div>

            <div aria-hidden="true" className="mt-4 flex max-w-md gap-1.5">
              {steps.map((step) => (
                <span
                  key={step.key}
                  className={cx(
                    'h-2 flex-1 rounded-full',
                    step.status === 'completed' ? cx('shadow-[0_0_10px_-2px_var(--brand-primary)]', brandFill) : 'bg-warning/70 animate-pulse motion-reduce:animate-none',
                  )}
                />
              ))}
            </div>
          </div>

          <StatusBeacon current={currentStep} />
        </div>
      </section>

      <section className={cx(cardClass, 'p-6 sm:p-8')}>
        <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Track beam between the first and last station centres; the lit part reaches the current station. */}
          <span aria-hidden="true" className="pointer-events-none absolute top-[21px] right-[12.5%] left-[12.5%] hidden h-0.5 rounded-full bg-fg/10 lg:block">
            <span
              style={{ width: `${beamPercent}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--brand-primary)_0%,#ffffff_50%,var(--brand-primary)_100%)] [background-size:250%_100%] shadow-[0_0_12px_var(--brand-primary)] animate-gold-sheen motion-reduce:animate-none"
            />
          </span>
          {steps.map((step, index) => (
            <StepStation key={step.key} step={step} index={index} />
          ))}
        </ol>
      </section>

      <section className={cx(cardClass, 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6')}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-warning/40 bg-warning-soft text-warning">
            <Icon name="clock" size={18} />
          </span>
          <p className="text-sm text-fg">{translate('pamm.apply.reviewNote')}</p>
        </div>
        <Button variant="secondary" disabled leftIcon="clock" className="shrink-0">
          {translate('pamm.apply.reviewButton')}
        </Button>
      </section>
    </div>
  );
}
