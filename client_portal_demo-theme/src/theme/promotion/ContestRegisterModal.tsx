'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/core/format';
import type { DemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Checkbox } from '../ui/Input';
import { Modal } from '../ui/Modal';
import type { ContestDetail } from './contestDetails';

type Step = 'confirm' | 'tasks' | 'terms';
type TaskState = 'todo' | 'running' | 'done';

const registerText = {
  title: 'Confirm Registration',
  subtitle: 'Ready to join the championship?',
  startingBalance: 'STARTING BALANCE',
  endsOn: 'ENDS ON',
  maxLeverage: 'MAX LEVERAGE',
  entryFee: 'ENTRY FEE',
  free: 'Free',
  tradingRules: 'TRADING RULES',
  minDuration: 'Min Duration',
  maxPositions: 'Max Positions',
  maxLots: 'Max Lots',
  demoNote: 'A virtual demo account will be created for you automatically upon registration.',
  cancel: 'Cancel',
  register: 'Register Me!',
  tasksTitle: 'Complete These Tasks',
  tasksSubtitle: 'Finish all tasks below to continue your enrollment.',
  tasksProgress: (done: number, total: number) => `${done}/${total} done`,
  start: 'Start',
  done: 'Done',
  continue: 'Continue',
  termsTitle: 'Terms & Conditions',
  agree: 'I agree to the Terms & Conditions',
  accept: 'Accept & Continue',
  stepLabels: { confirm: 'Confirm', tasks: 'Tasks', terms: 'Terms' } satisfies Record<Step, string>,
};

const STEPS: Step[] = ['confirm', 'tasks', 'terms'];
// Long enough for the spinner to read as "checking", short enough not to feel like a wait.
const TASK_CHECK_MS = 900;

const TASKS: { id: string; icon: IconName; title: string; text: string }[] = [
  { id: 'instagram', icon: 'smartphone', title: 'Follow us on Instagram', text: 'Open our Instagram page and follow the account.' },
  { id: 'briefing', icon: 'monitor', title: 'Watch the contest briefing', text: 'Watch the short video on how the contest works.' },
];

const TERMS = [
  'One demo account per participant.',
  'Hedging across accounts, arbitrage and copy trading between participants are not allowed.',
  'Rankings are calculated on return percentage at the contest close.',
  'Prizes are credited to the client wallet after results are verified.',
  "The organiser's decision is final.",
];

const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

/** Popup rule label → the contest's trading-rule key it reads its value from. */
const RULES: { key: string; icon: IconName; label: string }[] = [
  { key: 'duration', icon: 'clock', label: registerText.minDuration },
  { key: 'positions', icon: 'barChart', label: registerText.maxPositions },
  { key: 'lots', icon: 'signalBars', label: registerText.maxLots },
];

function StepRail({ step }: { step: Step }) {
  const current = STEPS.indexOf(step);
  return (
    <ol className="relative grid grid-cols-3">
      <span aria-hidden="true" className="absolute top-3.5 right-[16.66%] left-[16.66%] h-0.5 rounded-full bg-fg/10">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }} />
      </span>
      {STEPS.map((item, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={item} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-1.5">
            <span
              className={cx(
                'relative grid size-7 place-items-center rounded-full text-[11px] font-bold tabular-nums ring-4 ring-elevated transition-colors duration-300',
                isDone && 'bg-success text-on-primary',
                isCurrent && 'bg-primary text-on-primary',
                !isDone && !isCurrent && 'bg-surface-2 text-fg-subtle',
              )}
            >
              {isCurrent && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/60 motion-reduce:hidden" />}
              {isDone ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <span className={cx('text-[10px] font-semibold tracking-[0.14em] uppercase', isCurrent ? 'text-primary' : 'text-fg-subtle')}>{registerText.stepLabels[item]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ConfirmStep({ contest, detail, currency }: { contest: DemoContest; detail: ContestDetail; currency: string }) {
  const stats = [
    { key: 'balance', label: registerText.startingBalance, value: formatMoney(contest.startingBalance, currency), tone: 'text-fg' },
    { key: 'ends', label: registerText.endsOn, value: longDate.format(Date.parse(contest.endsAt)), tone: 'text-fg' },
    { key: 'leverage', label: registerText.maxLeverage, value: `1:${contest.maxLeverage}`, tone: 'text-primary' },
    { key: 'fee', label: registerText.entryFee, value: contest.entryFee === 0 ? registerText.free : formatMoney(contest.entryFee, currency), tone: 'text-success' },
  ];
  const rules = RULES.map((rule) => ({ ...rule, value: detail.tradingRules.find((item) => item.key === rule.key)?.value ?? '—' }));

  return (
    <div className="flex flex-col gap-4">
      <section className="relative animate-rise overflow-hidden rounded-2xl bg-linear-to-br from-primary/25 via-surface-2 to-surface-2 ring-1 ring-primary/30 motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-44 animate-drift rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
        <Icon name="trophy" size={120} aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-8 -rotate-12 text-primary/[0.08]" />

        <div className="relative flex items-center gap-3 p-4">
          <span className="grid size-11 shrink-0 animate-float place-items-center rounded-xl bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)] motion-reduce:animate-none">
            <Icon name="trophy" size={20} />
          </span>
          <h3 className="min-w-0 truncate text-xl font-bold tracking-tight text-fg capitalize">{contest.name}</h3>
        </div>

        <dl className="relative grid grid-cols-2 gap-px bg-line/60">
          {stats.map((stat, index) => (
            <div key={stat.key} style={{ animationDelay: `${120 + index * 80}ms` }} className="animate-rise bg-surface-2/90 px-4 py-3 motion-reduce:animate-none">
              <dt className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle">{stat.label}</dt>
              <dd className={cx('mt-0.5 text-sm font-semibold tabular-nums', stat.tone)}>{stat.value}</dd>
            </div>
          ))}
        </dl>

        {/* Ticket perforation: two notches with a dashed tear line between them. */}
        <div aria-hidden="true" className="relative flex items-center">
          <span className="-ml-2.5 size-5 shrink-0 rounded-full bg-elevated ring-1 ring-primary/30" />
          <span className="mx-1 h-px flex-1 border-t border-dashed border-primary/40" />
          <span className="-mr-2.5 size-5 shrink-0 rounded-full bg-elevated ring-1 ring-primary/30" />
        </div>

        <div className="relative px-4 pt-1 pb-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-primary">
            <Icon name="fileText" size={13} />
            {registerText.tradingRules}
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {rules.map((rule, index) => (
              <li
                key={rule.key}
                style={{ animationDelay: `${420 + index * 90}ms` }}
                className="group flex animate-rise flex-col items-center gap-1.5 rounded-xl bg-surface/70 px-2 py-3 text-center ring-1 ring-line transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:ring-primary/40 motion-reduce:animate-none"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary transition-transform duration-300 group-hover:-rotate-12">
                  <Icon name={rule.icon} size={15} />
                </span>
                <span className="text-base font-bold tabular-nums text-fg">{rule.value}</span>
                <span className="text-[10px] text-fg-muted">{rule.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div style={{ animationDelay: '700ms' }} className="flex animate-rise items-center gap-3 rounded-xl bg-primary-soft/50 p-3.5 ring-1 ring-primary/25 motion-reduce:animate-none">
        <span className="relative grid size-9 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/50 motion-reduce:hidden" />
          <span className="relative grid size-9 place-items-center rounded-full bg-primary text-on-primary">
            <Icon name="info" size={16} />
          </span>
        </span>
        <p className="text-xs leading-relaxed text-fg-muted">{registerText.demoNote}</p>
      </div>
    </div>
  );
}

function TasksStep({ tasks, onStart }: { tasks: Record<string, TaskState>; onStart: (id: string) => void }) {
  const doneCount = TASKS.filter((task) => tasks[task.id] === 'done').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{registerText.tasksSubtitle}</p>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/30">{registerText.tasksProgress(doneCount, TASKS.length)}</span>
      </div>
      <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-fg/10">
        <span className="block h-full rounded-full bg-linear-to-r from-primary to-success transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${(doneCount / TASKS.length) * 100}%` }} />
      </span>

      <ol className="flex flex-col gap-3">
        {TASKS.map((task, index) => {
          const state = tasks[task.id];
          const isDone = state === 'done';
          return (
            <li
              key={task.id}
              style={{ animationDelay: `${index * 110}ms` }}
              className={cx(
                'relative flex animate-rise items-center gap-3 overflow-hidden rounded-2xl p-4 ring-1 transition-[background-color,box-shadow] duration-300 motion-reduce:animate-none',
                isDone ? 'bg-success-soft/40 ring-success/40' : 'bg-surface-2/60 ring-line',
              )}
            >
              <span className={cx('relative grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-300', isDone ? 'bg-success text-on-primary' : 'bg-primary-soft text-primary')}>
                <Icon name={isDone ? 'check' : task.icon} size={18} className={cx(isDone && 'animate-dot-pop motion-reduce:animate-none')} />
                <span className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-elevated text-[10px] font-bold tabular-nums text-fg-muted ring-1 ring-line">{index + 1}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{task.title}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{task.text}</p>
              </div>
              {isDone ? (
                <span className="inline-flex shrink-0 animate-fade-quick items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-on-primary motion-reduce:animate-none">
                  <Icon name="check" size={13} />
                  {registerText.done}
                </span>
              ) : (
                <Button type="button" size="sm" variant="outline" disabled={state === 'running'} onClick={() => onStart(task.id)} className="shrink-0">
                  {state === 'running' ? <Spinner size={14} /> : <Icon name="arrowUpRight" size={14} />}
                  {registerText.start}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TermsStep({ hasAgreed, onAgreeChange }: { hasAgreed: boolean; onAgreeChange: (value: boolean) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-2xl bg-surface-2/60 p-3 ring-1 ring-line">
        {TERMS.map((term, index) => (
          <li key={term} style={{ animationDelay: `${index * 80}ms` }} className="flex animate-feed-in items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-hover motion-reduce:animate-none">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-[11px] font-bold tabular-nums text-primary ring-1 ring-primary/30">{index + 1}</span>
            <p className="text-sm leading-relaxed text-fg">{term}</p>
          </li>
        ))}
      </ol>
      <div className={cx('rounded-xl p-3.5 ring-1 transition-colors duration-300', hasAgreed ? 'bg-success-soft/40 ring-success/40' : 'bg-surface-2/60 ring-line')}>
        <Checkbox label={registerText.agree} checked={hasAgreed} onChange={(event) => onAgreeChange(event.target.checked)} className={cx(hasAgreed && 'text-fg')} />
      </div>
    </div>
  );
}

export function ContestRegisterModal({
  contest,
  detail,
  currency,
  onConfirm,
  onClose,
}: {
  contest: DemoContest;
  detail: ContestDetail;
  currency: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('confirm');
  const [tasks, setTasks] = useState<Record<string, TaskState>>(() => Object.fromEntries(TASKS.map((task) => [task.id, 'todo' as TaskState])));
  const [hasAgreed, setHasAgreed] = useState(false);

  const runningTask = TASKS.find((task) => tasks[task.id] === 'running')?.id;
  useEffect(() => {
    if (!runningTask) return;
    const timer = window.setTimeout(() => setTasks((current) => ({ ...current, [runningTask]: 'done' })), TASK_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [runningTask]);

  const allTasksDone = TASKS.every((task) => tasks[task.id] === 'done');
  const startTask = (id: string) => setTasks((current) => ({ ...current, [id]: 'running' }));

  const headings: Record<Step, { title: string; description?: string }> = {
    confirm: { title: registerText.title, description: registerText.subtitle },
    tasks: { title: registerText.tasksTitle },
    terms: { title: registerText.termsTitle },
  };

  const primaryAction: Record<Step, { label: string; disabled: boolean; onClick: () => void }> = {
    confirm: { label: registerText.register, disabled: false, onClick: () => setStep('tasks') },
    tasks: { label: registerText.continue, disabled: !allTasksDone, onClick: () => setStep('terms') },
    terms: { label: registerText.accept, disabled: !hasAgreed, onClick: onConfirm },
  };
  const action = primaryAction[step];

  return (
    <Modal
      open
      onClose={onClose}
      title={headings[step].title}
      description={headings[step].description}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {registerText.cancel}
          </Button>
          <Button type="button" disabled={action.disabled} onClick={action.onClick} className="group/reg relative overflow-hidden">
            {!action.disabled && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
            <span className="relative font-semibold">{action.label}</span>
            <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/reg:translate-x-1" />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepRail step={step} />
        {/* Keyed so each step replays its entrance animation when it appears. */}
        <div key={step}>
          {step === 'confirm' && <ConfirmStep contest={contest} detail={detail} currency={currency} />}
          {step === 'tasks' && <TasksStep tasks={tasks} onStart={startTask} />}
          {step === 'terms' && <TermsStep hasAgreed={hasAgreed} onAgreeChange={setHasAgreed} />}
        </div>
      </div>
    </Modal>
  );
}
