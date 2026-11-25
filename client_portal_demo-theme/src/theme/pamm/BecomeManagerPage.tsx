import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ done, total }: { done: number; total: number }) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - done / total);

  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-surface-2" />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="stroke-primary"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-fg">
          {done}
          <span className="text-fg-subtle">/{total}</span>
        </span>
        <span className="text-xs text-fg-muted">{translate('pamm.apply.progressLabel')}</span>
      </div>
    </div>
  );
}

function StepRow({ step, index, isLast }: { step: ApplicationStep; index: number; isLast: boolean }) {
  const isCompleted = step.status === 'completed';

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className={cx('absolute top-11 bottom-0 left-[21px] w-px', isCompleted ? 'bg-primary/50' : 'bg-line')}
        />
      )}
      <span
        className={cx(
          'relative flex size-11 shrink-0 items-center justify-center rounded-full ring-1',
          isCompleted ? 'bg-primary text-on-primary ring-primary' : 'bg-warning-soft text-warning ring-warning/40',
        )}
      >
        <Icon name={isCompleted ? 'checkCircle' : step.icon} size={20} />
      </span>
      <div
        className={cx(
          'flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3',
          isCompleted ? 'border-line bg-surface-2' : 'border-warning/40 bg-warning-soft',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Icon name={step.icon} size={18} className="shrink-0 text-fg-muted" />
          <div className="min-w-0">
            <p className="text-xs tabular-nums text-fg-subtle">{String(index + 1).padStart(2, '0')}</p>
            <p className="truncate text-sm font-semibold text-fg">{translate(`pamm.apply.step.${step.key}`)}</p>
          </div>
        </div>
        <Badge tone={isCompleted ? 'success' : 'warning'} dot>
          {translate(`pamm.apply.status.${step.status}`)}
        </Badge>
      </div>
    </li>
  );
}

export default function BecomeManagerPage() {
  const completedCount = steps.filter((step) => step.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.pammBecomeManager')} description={translate('pamm.apply.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="flex flex-col items-center gap-5 text-center">
          <ProgressRing done={completedCount} total={steps.length} />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-fg">{translate('pamm.apply.title')}</h2>
            <p className="text-sm text-fg-muted">{translate('pamm.apply.subtitle')}</p>
          </div>
          <div className="flex w-full items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4 text-left">
            <Icon name="clock" size={20} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-sm text-fg">{translate('pamm.apply.reviewNote')}</p>
          </div>
          <Button variant="secondary" fullWidth disabled leftIcon="clock" className="mt-auto">
            {translate('pamm.apply.reviewButton')}
          </Button>
        </Card>

        <Card>
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <StepRow key={step.key} step={step} index={index} isLast={index === steps.length - 1} />
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
