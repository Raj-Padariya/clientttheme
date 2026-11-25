'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import type { DemoContest } from '@/core/pages/useDemoContest';
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

const RED = 'var(--zenith-red)';
const STEPS: Step[] = ['confirm', 'tasks', 'terms'];
// Long enough for the spinner to read as "checking", short enough not to feel like a wait.
const TASK_CHECK_MS = 900;
const RULE_PIXELS = 12;

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

const captionClass = 'text-[10px] font-semibold tracking-[0.16em] uppercase';

/** Popup rule label → the contest's trading-rule key it reads its value from. */
const RULES: { key: string; icon: IconName; label: string }[] = [
  { key: 'duration', icon: 'clock', label: registerText.minDuration },
  { key: 'positions', icon: 'barChart', label: registerText.maxPositions },
  { key: 'lots', icon: 'signalBars', label: registerText.maxLots },
];

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

/** The three steps as capsule segments: done ones solid, the current one red with a running sweep. */
function StepTrack({ step }: { step: Step }) {
  const current = STEPS.indexOf(step);
  return (
    <ol className="grid grid-cols-3 gap-2">
      {STEPS.map((item, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={item} aria-current={isCurrent ? 'step' : undefined} className="flex min-w-0 flex-col gap-1.5">
            <span
              aria-hidden="true"
              style={isCurrent ? { background: RED } : undefined}
              className={cx(
                'relative block h-2 overflow-hidden rounded-full transition-colors duration-500 motion-reduce:transition-none',
                isDone && 'bg-fg',
                !isDone && !isCurrent && 'border border-dashed border-line-strong',
              )}
            >
              {isCurrent && <span className="zenith-shine absolute inset-y-0 left-0 w-1/3 bg-white/40" />}
            </span>
            <span className={cx(captionClass, 'flex items-center gap-1.5 truncate', isCurrent ? 'text-fg' : 'text-fg-subtle')}>
              <span className="font-mono">{isDone ? <Icon name="check" size={11} className="inline" /> : String(index + 1).padStart(2, '0')}</span>
              {registerText.stepLabels[item]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ConfirmStep({ contest, detail, currency }: { contest: DemoContest; detail: ContestDetail; currency: string }) {
  const stats = [
    { key: 'balance', icon: 'wallet' as IconName, label: registerText.startingBalance, value: formatMoney(contest.startingBalance, currency), isFree: false },
    { key: 'ends', icon: 'calendar' as IconName, label: registerText.endsOn, value: longDate.format(Date.parse(contest.endsAt)), isFree: false },
    { key: 'leverage', icon: 'bolt' as IconName, label: registerText.maxLeverage, value: `1:${contest.maxLeverage}`, isFree: false },
    {
      key: 'fee',
      icon: 'bank' as IconName,
      label: registerText.entryFee,
      value: contest.entryFee === 0 ? registerText.free : formatMoney(contest.entryFee, currency),
      isFree: contest.entryFee === 0,
    },
  ];
  const rules = RULES.map((rule) => ({ ...rule, value: detail.tradingRules.find((item) => item.key === rule.key)?.value ?? '—' }));

  return (
    <div className="flex flex-col gap-4">
      <div className="zenith-tile flex items-center gap-3">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px]" />
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
            <Icon name="trophy" size={15} />
          </span>
        </span>
        <h3 className="min-w-0 truncate text-2xl font-black tracking-[-0.03em] text-fg capitalize">{contest.name}</h3>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {stats.map((stat, index) => (
          <div key={stat.key} style={stagger(index, 70, 100)} className="zenith-tile flex flex-col gap-1.5 rounded-[18px] bg-fg/[0.03] p-3 ring-1 ring-line">
            <dt className={cx(captionClass, 'flex items-center gap-1.5 text-fg-subtle')}>
              <Icon name={stat.icon} size={11} />
              <span className="truncate">{stat.label}</span>
            </dt>
            <dd className={cx('truncate font-mono text-base leading-tight font-black tabular-nums', stat.isFree ? 'text-success' : 'text-fg')}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <p className={cx(captionClass, 'flex shrink-0 items-center gap-1.5 text-fg-subtle')}>
            <Icon name="fileText" size={12} />
            {registerText.tradingRules}
          </p>
          <span aria-hidden="true" className="flex-1 border-t border-dashed border-line-strong" />
        </div>
        <ul className="flex flex-col gap-2">
          {rules.map((rule, index) => (
            <li key={rule.key} style={stagger(index, 90, 380)} className="zenith-tile flex h-12 items-center gap-3 rounded-full bg-fg/[0.03] py-1 pr-4 pl-1 ring-1 ring-line">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-app">
                <Icon name={rule.icon} size={14} />
              </span>
              <span className="min-w-0 shrink-0 text-xs font-semibold text-fg-muted">{rule.label}</span>
              <span aria-hidden="true" className="flex min-w-0 flex-1 justify-end gap-1 overflow-hidden">
                {Array.from({ length: RULE_PIXELS }, (_, dot) => (
                  <span
                    key={dot}
                    style={{ ...stagger(dot, 35, 450 + index * 120), ...(dot === RULE_PIXELS - 1 ? { background: RED } : {}) }}
                    className={cx('zenith-pixel size-1.5 shrink-0 rounded-[2px]', dot !== RULE_PIXELS - 1 && 'bg-fg/15')}
                  />
                ))}
              </span>
              <span className="shrink-0 font-mono text-base font-black text-fg tabular-nums">{rule.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={stagger(0, 0, 700)} className="zenith-tile flex items-start gap-3 rounded-[18px] border border-dashed border-line-strong px-3.5 py-3">
        <span aria-hidden="true" style={{ background: RED }} className="zenith-blink mt-1.5 size-2 shrink-0 rounded-[2px]" />
        <Icon name="info" size={15} className="mt-0.5 shrink-0 text-fg-muted" />
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
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-fg/[0.05] py-1 pr-3 pl-2 text-xs font-bold text-fg tabular-nums ring-1 ring-line">
          <span aria-hidden="true" className="flex gap-1">
            {TASKS.map((task) => (
              <span
                key={task.id}
                style={tasks[task.id] === 'done' ? { background: RED } : undefined}
                className={cx('size-2 rounded-[2px] transition-colors duration-300', tasks[task.id] !== 'done' && 'bg-fg/20')}
              />
            ))}
          </span>
          {registerText.tasksProgress(doneCount, TASKS.length)}
        </span>
      </div>

      <ol className="flex flex-col gap-2.5">
        {TASKS.map((task, index) => {
          const state = tasks[task.id];
          const isDone = state === 'done';
          return (
            <li
              key={task.id}
              style={stagger(index, 110)}
              className={cx(
                'zenith-tile relative flex items-center gap-3 overflow-hidden rounded-[22px] p-3 ring-1 transition-colors duration-300',
                isDone ? 'bg-success/[0.07] ring-success/30' : 'bg-fg/[0.02] ring-line',
              )}
            >
              <span aria-hidden="true" className={cx('relative grid size-12 shrink-0 place-items-center rounded-[14px] transition-colors duration-300', isDone ? 'bg-success text-white' : 'bg-fg text-app')}>
                <Icon name={isDone ? 'check' : task.icon} size={17} className={cx(isDone && 'animate-dot-pop motion-reduce:animate-none')} />
                <span style={{ background: RED }} className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-[6px] font-mono text-[10px] font-black text-white">
                  {index + 1}
                </span>
              </span>
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
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-fg ring-1 ring-line-strong transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60"
                >
                  {state === 'running' ? <Spinner size={14} /> : <Icon name="arrowUpRight" size={14} />}
                  {registerText.start}
                </button>
              )}
              {state === 'running' && (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
                  <span style={{ background: RED }} className="zenith-shine absolute inset-y-0 left-0 w-1/3" />
                </span>
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
      <ol className="relative flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        <span aria-hidden="true" className="absolute top-3 bottom-3 left-[13px] border-l-2 border-dashed border-line-strong" />
        {TERMS.map((term, index) => (
          <li key={term} style={stagger(index, 80)} className="zenith-tile relative flex items-start gap-3">
            <span
              style={index === 0 ? { background: RED } : undefined}
              className={cx('relative grid size-7 shrink-0 place-items-center rounded-[8px] font-mono text-[11px] font-black tabular-nums ring-4 ring-elevated', index === 0 ? 'text-white' : 'bg-fg text-app')}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="flex-1 pt-1 text-sm leading-relaxed text-fg">{term}</p>
          </li>
        ))}
      </ol>
      <div className={cx('rounded-full px-4 py-3 ring-1 transition-colors duration-300', hasAgreed ? 'bg-success/[0.08] ring-success/40' : 'border border-dashed border-line-strong ring-transparent')}>
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
            style={{ background: RED }}
            className="group/reg relative inline-flex h-11 items-center gap-2.5 overflow-hidden rounded-full py-1 pr-1 pl-5 text-sm font-bold text-white transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
          >
            {!action.disabled && <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/25" />}
            <span className="relative">{action.label}</span>
            <span className="relative grid size-9 place-items-center rounded-full bg-white/20">
              <Icon name="arrowRight" size={15} className="transition-transform duration-200 group-hover/reg:translate-x-0.5" />
            </span>
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepTrack step={step} />
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
