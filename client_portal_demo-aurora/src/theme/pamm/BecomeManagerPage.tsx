import type { CSSProperties } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import '../promotion/market.css';
import './desk.css';

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

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.16em] text-fg-subtle uppercase';
const gridLinesClass = '[background-image:linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] [background-size:100%_25%]';

// Header staircase: one tread per step, rising left to right.
const STAIR_WIDTH = 320;
const STAIR_TREAD = STAIR_WIDTH / steps.length;
const STAIR_RISE = 16;
const STAIR_BASE = 76;

function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-2 rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

// Status tag: sage "filled" for done steps, clay with a blinking dot for the step under review.
function StatusPill({ status }: { status: StepStatus }) {
  const isDone = status === 'completed';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] font-bold',
        isDone ? 'bg-(--hero-buy)/15 text-(--hero-buy)' : 'bg-(--aurora-cta-from) text-[#062520]',
      )}
    >
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', isDone ? 'bg-(--hero-buy)' : 'mkt-blink bg-[#062520]')} />
      {translate(`pamm.apply.status.${status}`)}
    </span>
  );
}

/** Climbing staircase behind the title: filled treads draw in sage, the open ones march in clay, with a live dot on the current tread. */
function ListingStairs({ completedCount }: { completedCount: number }) {
  const treadY = (index: number) => STAIR_BASE - index * STAIR_RISE;
  const segment = (from: number, to: number) => {
    let path = `M${from * STAIR_TREAD} ${treadY(from)}`;
    for (let index = from; index < to; index += 1) {
      path += ` H${(index + 1) * STAIR_TREAD}`;
      if (index + 1 < steps.length) path += ` V${treadY(index + 1)}`;
    }
    return path;
  };
  const isAllDone = completedCount >= steps.length;
  const liveX = isAllDone ? STAIR_WIDTH : completedCount * STAIR_TREAD + 6;
  const liveY = treadY(Math.min(completedCount, steps.length - 1));

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${STAIR_WIDTH} 84`} className="w-full max-w-sm shrink-0 overflow-visible">
      {[20, 44, 68].map((y) => (
        <line key={y} x1={0} x2={STAIR_WIDTH} y1={y} y2={y} strokeDasharray="2 5" className="stroke-fg/10" />
      ))}
      {completedCount > 0 && <path d={segment(0, completedCount)} pathLength={1} fill="none" strokeWidth={3} strokeLinejoin="round" className="mkt-draw stroke-(--hero-buy)" />}
      {!isAllDone && (
        <path d={segment(completedCount, steps.length)} fill="none" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" className="mkt-march stroke-(--aurora-cta-from)/70" />
      )}
      {steps.map((step, index) => (
        <circle key={step.key} cx={index * STAIR_TREAD + STAIR_TREAD / 2} cy={treadY(index)} r={3} className={index < completedCount ? 'fill-(--hero-buy)' : 'fill-app stroke-(--aurora-cta-from)'} />
      ))}
      <circle cx={liveX} cy={liveY} r={6} className="animate-ping-soft fill-(--aurora-cta-from)/50 [transform-box:fill-box] origin-center motion-reduce:hidden" />
      <circle cx={liveX} cy={liveY} r={4.5} className={isAllDone ? 'fill-(--hero-buy)' : 'fill-(--aurora-cta-from)'} />
    </svg>
  );
}

/*
 * Fill candle: the application as one order. The sage body fills from the bottom to the completed share, the open
 * part above runs clay stripes under a blinking limit line, and the current step's icon waits inside it.
 */
function FillCandle({ current, completedCount }: { current: ApplicationStep | undefined; completedCount: number }) {
  const isWaiting = current !== undefined;
  const fillPercent = (completedCount / steps.length) * 100;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-64 w-32 flex-col items-center">
        <span aria-hidden="true" className="h-4 w-0.5 bg-fg/30" />
        <div className={cx('relative w-24 flex-1 overflow-hidden rounded-xl border-2 border-dashed border-(--aurora-cta-from)/60 bg-fg/[0.03]', gridLinesClass)}>
          {isWaiting && <span aria-hidden="true" className="desk-stripes absolute inset-0 opacity-30" />}
          <span aria-hidden="true" className="mkt-blink absolute inset-x-0 top-0 h-0.5 bg-(--aurora-cta-from)" />
          <span aria-hidden="true" style={{ height: `${fillPercent}%` }} className="mkt-candle absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-t from-(--hero-buy) to-(--hero-buy)/70">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-white/70" />
            <span className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/25" />
          </span>
          <span className="absolute inset-x-0 top-0 grid place-items-center" style={{ bottom: isWaiting ? `${fillPercent}%` : '0%' }}>
            <span className="grid size-12 place-items-center rounded-xl bg-app text-fg ring-1 ring-line-strong shadow-[0_14px_30px_-14px_rgb(0_0_0/0.9)]">
              <Icon name={isWaiting ? current.icon : 'checkCircle'} size={20} className={isWaiting ? 'text-(--aurora-cta-from)' : 'text-(--hero-buy)'} />
            </span>
          </span>
        </div>
        <span aria-hidden="true" className="h-4 w-0.5 bg-fg/30" />
        {/* Fill level tag riding on the right edge of the body. */}
        <span aria-hidden="true" style={{ bottom: `calc(1rem + (100% - 2rem) * ${fillPercent / 100})` }} className="absolute -right-12 flex translate-y-1/2 items-center gap-1">
          <span className="w-3 border-t border-dashed border-(--hero-buy)" />
          <span className="rounded-md bg-(--hero-buy) px-1.5 py-0.5 font-mono text-[10px] font-black text-[#062520] tabular-nums">
            {completedCount}/{steps.length}
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

/** One fill on the ladder: a candle that rises a level higher per step (sage once filled, a striped clay order while under review), then its index, icon, label and status. */
function StepFill({ step, index }: { step: ApplicationStep; index: number }) {
  const isCompleted = step.status === 'completed';
  const level = ((index + 1) / steps.length) * 100;

  return (
    <li style={delay(index * 110)} className="zenith-tile flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-5">
      <span aria-hidden="true" className={cx('relative flex h-20 w-10 shrink-0 items-end justify-center rounded-lg bg-fg/[0.03] ring-1 ring-line lg:h-44 lg:w-full', gridLinesClass)}>
        <span
          style={{ height: `${level}%`, '--candle-delay': `${300 + index * 160}ms` } as CSSProperties}
          className={cx(
            'mkt-candle relative w-4 overflow-hidden rounded-t-md lg:w-16',
            isCompleted ? 'bg-(--hero-buy)' : 'border-2 border-b-0 border-dashed border-(--aurora-cta-from) bg-(--aurora-cta-from)/25',
          )}
        >
          {isCompleted ? <span className="absolute inset-x-0 top-0 h-0.5 bg-white/70" /> : <span className="desk-stripes absolute inset-0" />}
        </span>
        {!isCompleted && <span style={{ bottom: `${level}%` }} className="mkt-blink absolute inset-x-1 border-t-2 border-(--aurora-cta-from)" />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center">
            {!isCompleted && <span className="absolute inset-0 animate-ping-soft rounded-xl bg-(--aurora-cta-from)/40 motion-reduce:hidden" />}
            <span className={cx('relative grid size-10 place-items-center rounded-xl', isCompleted ? 'bg-(--hero-buy) text-[#062520]' : 'bg-(--aurora-cta-from) text-[#062520]')}>
              <Icon name={isCompleted ? 'checkCircle' : step.icon} size={18} />
            </span>
          </span>
          <span className={cx('font-mono text-3xl leading-none font-black tabular-nums', isCompleted ? 'text-fg/20' : 'text-(--aurora-cta-from)')}>{String(index + 1).padStart(2, '0')}</span>
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

  return (
    <div className="flex flex-col gap-8">
      {/* Open header: caption, big title and description beside the climbing staircase of the application. */}
      <header className="zenith-tile flex flex-col gap-6 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <LiveDot className="size-1.5" />
            {translate('nav.pamm')}
          </p>
          <h2 className="text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.pammBecomeManager')}</h2>
          <p className="max-w-2xl text-sm text-fg-muted">{translate('pamm.apply.subtitle')}</p>
        </div>
        <ListingStairs completedCount={completedCount} />
      </header>

      {/* Order panel: the title, the fill count and the per-step fill ladder on the left, the fill candle on the right. */}
      <section className={cx(panelClass, 'zenith-tile grid items-center gap-10 p-6 [animation-delay:80ms] sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto]')}>
        <div className="min-w-0">
          <p className={captionClass}>{translate('nav.pammBecomeManager')}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{translate('pamm.apply.title')}</h2>
          <p className="mt-2 max-w-lg text-sm text-fg-muted">{translate('pamm.apply.subtitle')}</p>

          <div className="mt-8 flex items-end gap-4">
            <p className="flex items-baseline font-mono tabular-nums">
              <span className="text-8xl leading-none font-black tracking-tighter text-fg">{completedCount}</span>
              <span className="text-4xl font-bold text-fg-subtle">/{steps.length}</span>
            </p>
            <p className="mb-2 text-sm text-fg-muted">{translate('pamm.apply.progressLabel')}</p>
          </div>

          {/* Fill tape: one block per step, sage once filled, a striped clay order with a glare while under review. */}
          <div aria-hidden="true" className="mt-5 grid max-w-xl grid-cols-4 gap-1.5 rounded-xl bg-fg/5 p-1.5 ring-1 ring-line">
            {steps.map((step, index) => {
              const isDone = step.status === 'completed';
              return (
                <span key={step.key} className="relative h-5 overflow-hidden rounded-md bg-fg/5">
                  <span
                    style={delay(200 + index * 150)}
                    className={cx('zenith-capsule absolute inset-0 origin-left rounded-md', isDone ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')}
                  >
                    {!isDone && <span className="desk-stripes absolute inset-0" />}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="justify-self-center pr-12">
          <FillCandle current={currentStep} completedCount={completedCount} />
        </div>
      </section>

      {/* Fill ladder: each step a candle one level higher than the last, so the row reads as a climbing chart. */}
      <section className={cx(panelClass, 'p-6 sm:p-8')}>
        <ol className="relative grid gap-5 lg:grid-cols-4">
          {steps.map((step, index) => (
            <StepFill key={step.key} step={step} index={index} />
          ))}
        </ol>
      </section>

      {/* Pending order slip: a striped clay edge, the clock with a live dot, the note and the (disabled) review button. */}
      <section style={delay(240)} className="zenith-tile relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-dashed border-(--aurora-cta-from)/50 bg-(--aurora-cta-from)/[0.05] p-3 pl-6 sm:flex-row sm:items-center sm:justify-between">
        <span aria-hidden="true" className="desk-stripes absolute inset-y-0 left-0 w-2 bg-(--aurora-cta-from)" />
        <div className="flex items-center gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-(--aurora-cta-from)/15 text-(--aurora-cta-from) ring-1 ring-(--aurora-cta-from)/40">
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
