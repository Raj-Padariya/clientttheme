import type { CSSProperties } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';

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

const panelClass = 'orbit-card relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.16em] text-fg-subtle uppercase';
const RED = 'var(--zenith-red)';
// Status pixel matrix: 10 × 10 cells, lit in reading order up to the completed share.
const MATRIX_SIDE = 10;
const MATRIX_CELLS = MATRIX_SIDE * MATRIX_SIDE;

function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-2 rounded-full" />
    </span>
  );
}

// Status pill: white for done, Zenith red (with a live dot) for the step under review.
function StatusPill({ status }: { status: StepStatus }) {
  const isDone = status === 'completed';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
        isDone ? 'bg-fg/10 text-fg' : 'bg-[var(--zenith-red)] text-white',
      )}
    >
<span aria-hidden="true" className="zenith-blink size-1.5 rounded-full bg-white" />
      {translate(`pamm.apply.status.${status}`)}
    </span>
  );
}

/*
 * Status matrix: a pixel grid lit in order up to the completed share (white), the next band blinking red for the
 * step under review, the rest idle. The current step's icon sits in a black capsule over its centre.
 */
function StatusMatrix({ current, completedCount }: { current: ApplicationStep | undefined; completedCount: number }) {
  const isWaiting = current !== undefined;
  const litCells = Math.round((completedCount / steps.length) * MATRIX_CELLS);
  const reviewCells = isWaiting ? Math.round(MATRIX_CELLS / steps.length) : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <span aria-hidden="true" className="grid grid-cols-10 gap-1 sm:gap-1.5">
          {Array.from({ length: MATRIX_CELLS }, (_, index) => {
            const isLit = index < litCells;
            const isReview = !isLit && index < litCells + reviewCells;
            return (
              <span
                key={index}
                style={isReview ? { ...delay((index * 137) % 1400), background: RED } : delay(index * 12)}
                className={cx(
                  'size-2.5 rounded-[3px] sm:size-3',
                  isLit && 'zenith-pixel bg-fg',
                  isReview && 'zenith-twinkle',
                  !isLit && !isReview && 'zenith-pixel bg-fg/10',
                )}
              />
            );
          })}
        </span>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-app text-fg ring-1 ring-line-strong shadow-[0_14px_30px_-14px_rgb(0_0_0/0.9)]">
            <Icon name={isWaiting ? current.icon : 'checkCircle'} size={24} className={isWaiting ? 'text-[var(--zenith-red)]' : undefined} />
          </span>
        </span>
      </div>
      {isWaiting && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-fg">{translate(`pamm.apply.step.${current.key}`)}</p>
          <StatusPill status={current.status} />
        </div>
      )}
    </div>
  );
}

// One stop on the route: a big index, an icon bead (check once done), the label and its status pill.
function StepStop({ step, index }: { step: ApplicationStep; index: number }) {
  const isCompleted = step.status === 'completed';

  return (
    <li style={delay(index * 110)} className="zenith-tile relative flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
      <span className="relative z-10 grid size-14 shrink-0 place-items-center">
        {!isCompleted && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden" />}
        <span
          className={cx(
            'relative grid size-14 place-items-center rounded-full ring-4 ring-app',
            isCompleted ? 'bg-fg text-app' : 'bg-[var(--zenith-red)] text-white',
          )}
        >
          <Icon name={isCompleted ? 'checkCircle' : step.icon} size={22} />
        </span>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-center gap-2">
          <span className={cx('font-mono text-3xl leading-none font-black tabular-nums', isCompleted ? 'text-fg/20' : 'text-[var(--zenith-red)]')}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <Icon name={step.icon} size={15} className="text-fg-muted" />
        </span>
        <p className="text-base font-bold text-fg">{translate(`pamm.apply.step.${step.key}`)}</p>
        <span>
          <StatusPill status={step.status} />
        </span>
      </div>
    </li>
  );
}

export default function BecomeManagerPage() {
  const completedCount = steps.filter((step) => step.status === 'completed').length;
  const currentStep = steps.find((step) => step.status !== 'completed');
  // The route runs from the first stop to the one being worked on (or the last, once all are done).
  const beamPercent = Math.min(completedCount / (steps.length - 1), 1) * 100;

  return (
    <div className="flex flex-col gap-8">
      {/* Open header: caption, big title and the description, no card. */}
      <header className="zenith-tile flex flex-col gap-3 border-b border-line pb-6">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <LiveDot className="size-1.5" />
          {translate('nav.pamm')}
        </p>
        <h2 className="text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammBecomeManager')}</h2>
        <p className="max-w-2xl text-sm text-fg-muted">{translate('pamm.apply.subtitle')}</p>
      </header>

      {/* Progress: open figure + capsule segments on the left, the status pixel matrix on the right. */}
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div style={delay(80)} className="zenith-tile min-w-0">
          <p className={captionClass}>{translate('nav.pammBecomeManager')}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{translate('pamm.apply.title')}</h2>
          <p className="mt-2 max-w-lg text-sm text-fg-muted">{translate('pamm.apply.subtitle')}</p>

          <div className="mt-8 flex items-end gap-4">
            <p className="flex items-baseline tabular-nums">
              <span className="text-8xl leading-none font-black tracking-tighter text-fg">{completedCount}</span>
              <span className="text-4xl font-bold text-fg-subtle">/{steps.length}</span>
            </p>
            <p className="mb-2 text-sm text-fg-muted">{translate('pamm.apply.progressLabel')}</p>
          </div>

          {/* One capsule per step: white once done, red with a scanning light while under review. */}
          <div aria-hidden="true" className="mt-5 flex max-w-xl gap-2 rounded-full bg-fg/5 p-1.5 ring-1 ring-line">
            {steps.map((step, index) => {
              const isDone = step.status === 'completed';
              return (
                <span key={step.key} className="relative h-4 flex-1 overflow-hidden rounded-full bg-fg/5">
                  <span
                    style={{ ...delay(200 + index * 150), background: isDone ? undefined : RED }}
                    className={cx('zenith-capsule absolute inset-0 origin-left rounded-full', isDone && 'bg-fg')}
                  />
                  {!isDone && <span className="zenith-scan-x absolute inset-y-0 left-0 w-8 bg-white/40" />}
                </span>
              );
            })}
          </div>
        </div>

        <div style={delay(160)} className="zenith-tile">
          <StatusMatrix current={currentStep} completedCount={completedCount} />
        </div>
      </section>

      {/* Route: the stops sit on one dashed line; the lit capsule reaches the current stop with a bead running ahead. */}
      <section className={cx(panelClass, 'p-6 sm:p-8')}>
        <ol className="relative grid gap-7 lg:grid-cols-4 lg:gap-5">
          {/* Spans bead centre to bead centre: the last column is (100% − 3 gaps) / 4 wide, its bead centre 1.75rem in. */}
          <span aria-hidden="true" className="pointer-events-none absolute top-7 right-[calc(25%-2.6875rem)] left-7 hidden h-1.5 -translate-y-1/2 rounded-full border border-dashed border-line-strong lg:block">
            <span style={{ width: `${beamPercent}%` }} className="zenith-capsule absolute -inset-y-px left-0 origin-left rounded-full bg-fg">
              <span style={{ background: RED }} className="zenith-route absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-app" />
            </span>
          </span>
          {/* Phones / tablets: the same route runs down the left edge. */}
          <span aria-hidden="true" className="pointer-events-none absolute top-7 bottom-7 left-7 w-0 -translate-x-1/2 border-l-2 border-dashed border-line-strong lg:hidden" />
          {steps.map((step, index) => (
            <StepStop key={step.key} step={step} index={index} />
          ))}
        </ol>
      </section>

      {/* Review strip: one capsule carrying the note and the (disabled) review button. */}
      <section
        style={delay(240)}
        className="zenith-tile flex flex-col gap-4 rounded-[28px] border border-line bg-fg/[0.03] p-3 pl-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-full"
      >
        <div className="flex items-center gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-fg text-app">
            <Icon name="clock" size={18} />
            <LiveDot className="absolute -top-0.5 -right-0.5" />
          </span>
          <p className="text-sm text-fg">{translate('pamm.apply.reviewNote')}</p>
        </div>
        <Button variant="secondary" disabled leftIcon="clock" className="shrink-0 rounded-full">
          {translate('pamm.apply.reviewButton')}
        </Button>
      </section>
    </div>
  );
}
