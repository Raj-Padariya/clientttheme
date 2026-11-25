'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/core/format';
import type { DemoContest } from '@/core/pages/useDemoContest';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
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

const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

/** Popup rule label → the contest's trading-rule key it reads its value from. */
const RULES: { key: string; icon: IconName; label: string }[] = [
  { key: 'duration', icon: 'clock', label: registerText.minDuration },
  { key: 'positions', icon: 'barChart', label: registerText.maxPositions },
  { key: 'lots', icon: 'signalBars', label: registerText.maxLots },
];

function StepBeads({ step }: { step: Step }) {
  const current = STEPS.indexOf(step);
  return (
    <ol className="relative grid grid-cols-3">
      <span aria-hidden="true" className="absolute top-4 right-[16.66%] left-[16.66%] border-t-2 border-dotted border-line-strong" />
      <span
        aria-hidden="true"
        className="absolute top-4 left-[16.66%] border-t-2 border-fg transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${(current / (STEPS.length - 1)) * 66.68}%` }}
      />
      {STEPS.map((item, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={item} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-1.5">
            <span
              className={cx(
                'relative grid size-8 place-items-center rounded-full font-mono text-[11px] font-black tabular-nums ring-4 ring-elevated transition-colors duration-300',
                isDone && 'bg-success text-white',
                isCurrent && 'bg-fg text-app',
                !isDone && !isCurrent && 'nova-gloss text-fg-subtle',
              )}
            >
              {isCurrent && <span aria-hidden="true" className="absolute -inset-1.5 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />}
              {isDone ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <span className={cx('text-[10px] font-semibold tracking-[0.14em] uppercase', isCurrent ? 'text-fg' : 'text-fg-subtle')}>{registerText.stepLabels[item]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ConfirmStep({ contest, detail, currency }: { contest: DemoContest; detail: ContestDetail; currency: string }) {
  const stats = [
    { key: 'balance', label: registerText.startingBalance, value: formatMoney(contest.startingBalance, currency), tone: '' },
    { key: 'ends', label: registerText.endsOn, value: longDate.format(Date.parse(contest.endsAt)), tone: '' },
    { key: 'leverage', label: registerText.maxLeverage, value: `1:${contest.maxLeverage}`, tone: '' },
    { key: 'fee', label: registerText.entryFee, value: contest.entryFee === 0 ? registerText.free : formatMoney(contest.entryFee, currency), tone: 'text-[#0f8a4f]' },
  ];
  const rules = RULES.map((rule) => ({ ...rule, value: detail.tradingRules.find((item) => item.key === rule.key)?.value ?? '—' }));

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-rise motion-reduce:animate-none">
        <FrostCard>
          <div className="flex flex-col gap-4 text-[#0a1220]">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
                <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/30 motion-reduce:animate-none" />
                <span className="grid size-9 animate-float place-items-center rounded-full bg-[#0a1220] text-white motion-reduce:animate-none">
                  <Icon name="trophy" size={16} />
                </span>
              </span>
              <h3 className="min-w-0 truncate text-xl font-black tracking-tight capitalize">{contest.name}</h3>
            </div>

            <dl className="flex flex-col gap-2">
              {stats.map((stat, index) => (
                <div key={stat.key} style={{ animationDelay: `${120 + index * 80}ms` }} className="flex animate-feed-in items-end gap-2 motion-reduce:animate-none">
                  <dt className="shrink-0 text-[10px] font-semibold tracking-[0.14em] text-[#3b4658]">{stat.label}</dt>
                  <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-[#0a1220]/20" />
                  <dd className={cx('font-mono text-sm font-black tabular-nums', stat.tone)}>{stat.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-2.5 border-t-2 border-dotted border-[#0a1220]/15 pt-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-[#3b4658]">
                <Icon name="fileText" size={13} />
                {registerText.tradingRules}
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {rules.map((rule, index) => (
                  <li
                    key={rule.key}
                    style={{ animationDelay: `${420 + index * 90}ms` }}
                    className={cx('group flex animate-dot-pop flex-col items-center gap-1 rounded-[20px] px-2 py-3 text-center motion-reduce:animate-none', frostChipClass)}
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-[#0a1220] text-white transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none">
                      <Icon name={rule.icon} size={14} />
                    </span>
                    <span className="font-mono text-base font-black tabular-nums">{rule.value}</span>
                    <span className="text-[10px] font-medium text-[#3b4658]">{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FrostCard>
      </div>

      <div style={{ animationDelay: '700ms' }} className="flex animate-rise items-center gap-3 rounded-full bg-[#0a1220] py-2 pr-4 pl-2 text-white ring-1 ring-white/10 motion-reduce:animate-none">
        <span className="relative grid size-9 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-white/25 motion-reduce:hidden" />
          <span className="relative grid size-9 place-items-center rounded-full bg-white text-[#0a1220]">
            <Icon name="info" size={15} />
          </span>
        </span>
        <p className="text-xs leading-relaxed text-white/75">{registerText.demoNote}</p>
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
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-bold text-app tabular-nums">
          <span aria-hidden="true" className="flex gap-1">
            {TASKS.map((task) => (
              <span key={task.id} className={cx('size-2 rounded-full transition-colors duration-300', tasks[task.id] === 'done' ? 'bg-success' : 'bg-app/30')} />
            ))}
          </span>
          {registerText.tasksProgress(doneCount, TASKS.length)}
        </span>
      </div>

      <ol className="relative flex flex-col gap-3">
        <span aria-hidden="true" className="absolute top-6 bottom-6 left-6 border-l-2 border-dotted border-line-strong" />
        {TASKS.map((task, index) => {
          const state = tasks[task.id];
          const isDone = state === 'done';
          return (
            <li key={task.id} style={{ animationDelay: `${index * 110}ms` }} className="relative flex animate-feed-in items-center gap-3 motion-reduce:animate-none">
              <span className={cx('relative z-10 grid size-12 shrink-0 place-items-center rounded-full ring-4 ring-elevated transition-colors duration-300', isDone ? 'bg-success text-white' : 'nova-gloss text-fg')}>
                <Icon name={isDone ? 'check' : task.icon} size={17} className={cx(isDone && 'animate-dot-pop motion-reduce:animate-none')} />
                <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-fg font-mono text-[10px] font-black text-app">{index + 1}</span>
              </span>
              <div className={cx('flex min-w-0 flex-1 items-center gap-3 rounded-[22px] p-3.5 ring-1 transition-colors duration-300', isDone ? 'bg-success/[0.07] ring-success/30' : 'ring-line')}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">{task.title}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{task.text}</p>
                </div>
                {isDone ? (
                  <span className="inline-flex shrink-0 animate-fade-quick items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-white motion-reduce:animate-none">
                    <Icon name="check" size={13} />
                    {registerText.done}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={state === 'running'}
                    onClick={() => onStart(task.id)}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-fg ring-1 ring-line-strong transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60"
                  >
                    {state === 'running' ? <Spinner size={14} /> : <Icon name="arrowUpRight" size={14} />}
                    {registerText.start}
                  </button>
                )}
              </div>
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
      <ol className="flex max-h-72 flex-col gap-2.5 overflow-y-auto pr-1">
        {TERMS.map((term, index) => (
          <li key={term} style={{ animationDelay: `${index * 80}ms` }} className="flex animate-feed-in items-start gap-3 motion-reduce:animate-none">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg font-mono text-[11px] font-black text-app tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            <p className="flex-1 border-b border-dotted border-line-strong pt-1 pb-2.5 text-sm leading-relaxed text-fg">{term}</p>
          </li>
        ))}
      </ol>
      <div className={cx('rounded-full px-4 py-3 ring-1 transition-colors duration-300', hasAgreed ? 'bg-success/[0.08] ring-success/40' : 'ring-line')}>
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
      calm
      onClose={onClose}
      title={headings[step].title}
      description={headings[step].description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
          >
            {registerText.cancel}
          </button>
          <button
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className="group/reg relative inline-flex h-11 items-center gap-2.5 overflow-hidden rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-semibold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
          >
            {!action.disabled && (
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/reg:translate-x-full motion-reduce:hidden" />
            )}
            <span className="relative">{action.label}</span>
            <span className="relative grid size-9 place-items-center rounded-full bg-app text-fg">
              <Icon name="arrowRight" size={15} className="transition-transform duration-200 group-hover/reg:translate-x-0.5" />
            </span>
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepBeads step={step} />
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
