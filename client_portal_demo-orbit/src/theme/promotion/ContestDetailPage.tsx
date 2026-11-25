'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { contestText as text, getContestDetail, getLeaderboard, type ContestDetail, type ContestPrize, type ContestRule, type LeaderboardEntry } from './contestDetails';
import { enrollInContest, useEnrolledContestIds } from './contestEnrollment';
import { ContestRegisterModal } from './ContestRegisterModal';

type RulebookTab = 'eligibility' | 'trading';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const SEAT_CELLS = 24;

const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const clockTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

const statusChip: Record<ContestStatus, string> = {
  active: 'border-success/40 bg-success/12 text-success',
  upcoming: 'border-info/40 bg-info/12 text-info',
  completed: 'border-line-strong bg-fg/[0.06] text-fg-muted',
};
const statusKey = { active: 'contest.statusActive', upcoming: 'contest.statusUpcoming', completed: 'contest.statusCompleted' } as const satisfies Record<ContestStatus, string>;

/** Each lower place is a slightly shorter step, so the list reads as a staircase down from 1st. */
const ladderWidth = ['w-full', 'w-[92%]', 'w-[84%]'];

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, '0');
}

function timeLabel(iso: string, timezone: string) {
  return `${clockTime.format(Date.parse(iso))} (${timezone})`;
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-[10px] font-semibold tracking-[0.18em] text-fg-subtle uppercase', className)}>{children}</p>;
}

function SectionHead({ icon, title, hint, aside }: { icon: IconName; title: string; hint: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3.5">
        <span className="grid size-9 shrink-0 rotate-45 place-items-center rounded-lg border border-primary/45 bg-primary/12 text-primary">
          <Icon name={icon} size={15} className="-rotate-45" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <p className="text-xs text-fg-muted">{hint}</p>
        </div>
      </div>
      {aside}
    </header>
  );
}

/** Flat ECG trace: one heartbeat sweeps through, then the line rests — the contest's clock has stopped. */
function Flatline() {
  return (
    <svg viewBox="0 0 140 36" className="h-9 w-full" aria-hidden="true">
      <path d="M0 18 H140" strokeWidth="1" className="stroke-fg/15" />
      <path d="M0 18 H44 L50 6 L57 30 L63 12 L68 18 H140" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="0.25 1" className="stroke-danger">
        <animate attributeName="stroke-dashoffset" values="0.25;-1" dur="2.6s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** Seats as a row of cells; any participant lights at least one so a started contest never looks empty. */
function SeatMeter({ participants, max, filledPercent }: { participants: number; max: number; filledPercent: number }) {
  const isMounted = useMounted();
  const share = max === 0 ? 0 : participants / max;
  const litCells = participants > 0 ? Math.max(1, Math.round(share * SEAT_CELLS)) : 0;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Caption>{text.participants}</Caption>
      <p className="flex items-baseline gap-1.5 tabular-nums">
        <span className="text-2xl font-semibold text-fg">{participants}</span>
        <span className="text-sm text-fg-subtle">/ {max}</span>
      </p>
      <div aria-hidden="true" className="flex h-2.5 gap-[3px]">
        {Array.from({ length: SEAT_CELLS }, (_, index) => (
          <span
            key={index}
            style={{ transitionDelay: `${300 + index * 30}ms` }}
            className={cx(
              'flex-1 rounded-[2px] transition-colors duration-500 motion-reduce:transition-none',
              isMounted && index < litCells ? 'bg-primary shadow-[0_0_8px_-1px_var(--brand-primary)]' : 'bg-fg/[0.08]',
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-fg-muted">{text.filled(filledPercent)}</p>
    </div>
  );
}

function CountdownCell({ value, label, isLead = false }: { value: string; label: string; isLead?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-3 sm:px-4">
      <span className={cx('font-mono text-4xl leading-none font-semibold tabular-nums sm:text-5xl', isLead ? 'text-primary' : 'text-fg')}>{value}</span>
      <span className="text-[9.5px] font-semibold tracking-[0.16em] text-fg-subtle">{label}</span>
    </div>
  );
}

function ContestHero({
  contest,
  detail,
  currency,
  now,
  isEnrolled,
  onEnroll,
}: {
  contest: DemoContest;
  detail: ContestDetail;
  currency: string;
  now: number;
  isEnrolled: boolean;
  onEnroll: () => void;
}) {
  const endsAt = Date.parse(contest.endsAt);
  const remaining = Math.max(0, endsAt - now);
  const hasEnded = remaining === 0;
  const filledPercent = detail.maxParticipants === 0 ? 0 : Math.round((detail.participants / detail.maxParticipants) * 100);
  const timer = [
    { label: text.hrs, value: Math.floor((remaining % DAY_MS) / HOUR_MS) },
    { label: text.min, value: Math.floor((remaining % HOUR_MS) / MINUTE_MS) },
    { label: text.sec, value: Math.floor((remaining % MINUTE_MS) / 1000) },
  ];

  let heroAction: ReactNode;
  if (isEnrolled) {
    heroAction = (
      <span className="inline-flex items-center gap-2 rounded-xl border border-success/35 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
        <Icon name="checkCircle" size={15} />
        {text.enrolled}
      </span>
    );
  } else if (contest.registrationOpen) {
    heroAction = (
      <Button type="button" onClick={onEnroll} className="group/join relative overflow-hidden">
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-ring-breathe rounded-[inherit] ring-2 ring-primary/50 motion-reduce:hidden" />
        <Icon name="user" size={15} className="relative transition-transform duration-300 group-hover/join:scale-110" />
        <span className="relative">{text.joinContest}</span>
      </Button>
    );
  } else {
    heroAction = (
      <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-fg/[0.04] px-4 py-2.5 text-sm font-semibold text-fg-subtle">
        <Icon name="lock" size={15} />
        {text.registrationClosed}
      </span>
    );
  }

  return (
    <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -right-24 -z-10 size-[26rem] rounded-full bg-primary/12 blur-3xl animate-ring-breathe motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -right-36 -bottom-44 -z-10 size-[26rem] animate-orbit-spin motion-reduce:animate-none">
        <span className="absolute -top-1 left-1/2 size-2.5 rounded-full bg-primary shadow-[0_0_14px_var(--brand-primary)]" />
      </span>
      {['top-[18%] left-[42%]', 'top-[64%] left-[8%]', 'top-[12%] left-[70%]'].map((position, index) => (
        <span key={position} aria-hidden="true" style={{ animationDelay: `${index * 0.8}s` }} className={cx('pointer-events-none absolute size-1 animate-twinkle rounded-full bg-primary motion-reduce:hidden', position)} />
      ))}

      <div className="grid gap-8 p-6 lg:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold tracking-wider uppercase', statusChip[contest.status])}>
              {contest.status === 'active' && <span className="size-1.5 animate-blink rounded-full bg-success motion-reduce:animate-none" />}
              {translate(statusKey[contest.status])}
            </span>
            {contest.registrationOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 px-2 py-1 text-[11px] font-semibold text-success">
                <span className="relative grid size-2 place-items-center">
                  <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-success/50 motion-reduce:hidden" />
                  <span className="relative size-1.5 rounded-full bg-success" />
                </span>
                {text.registrationOpen}
              </span>
            )}
            <span className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle">#{contest.id}</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-fg capitalize sm:text-5xl">{contest.name}</h2>
          <p className="text-sm text-fg-muted">{contest.description}</p>
          <p className="inline-flex items-center gap-2 text-xs text-fg-muted">
            <Icon name="calendar" size={13} className="text-primary" />
            {longDate.format(Date.parse(contest.startsAt))}
            <span aria-hidden="true" className="h-px w-6 bg-fg/25" />
            {longDate.format(endsAt)}
          </p>
          <div className="pt-1">{heroAction}</div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-6 px-1">
            <Caption>{text.daysLeft}</Caption>
            <Caption className="flex items-center gap-1.5">
              <span className={cx('size-1.5 rounded-full animate-blink motion-reduce:animate-none', hasEnded ? 'bg-danger' : 'bg-success')} />
              {text.liveTimer}
            </Caption>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] rounded-2xl border border-line bg-fg/[0.03]">
            <div className="border-r border-dashed border-line-strong">
              <CountdownCell value={pad(Math.floor(remaining / DAY_MS))} label={text.daysRemaining} isLead />
            </div>
            {hasEnded ? (
              <div className="flex min-w-48 flex-col items-center justify-center gap-1 px-4">
                <Flatline />
                <p className="flex items-center gap-1.5 text-lg font-bold text-danger">
                  <span className="size-2 animate-blink rounded-full bg-danger motion-reduce:animate-none" />
                  {text.ended}
                </p>
              </div>
            ) : (
              <div role="timer" aria-label={timer.map((unit) => `${pad(unit.value)} ${unit.label}`).join(' ')} className="grid grid-cols-3 divide-x divide-line">
                {timer.map((unit) => (
                  <CountdownCell key={unit.label} value={pad(unit.value)} label={unit.label} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 border-t border-line px-6 py-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:px-8">
        <SeatMeter participants={detail.participants} max={detail.maxParticipants} filledPercent={filledPercent} />
        <div className="flex items-center gap-4 sm:border-l sm:border-line sm:pl-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
            <Icon name="trophy" size={20} className="animate-float motion-reduce:animate-none" />
          </span>
          <div className="min-w-0">
            <Caption>{text.prizePool}</Caption>
            <p className="text-2xl font-semibold tracking-tight text-fg tabular-nums">{formatMoney(detail.prizePool, currency)}</p>
            <p className="text-[11px] text-fg-muted">{text.totalPrizePool}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RuleRows({ rules }: { rules: ContestRule[] }) {
  return (
    <dl className="overflow-hidden rounded-2xl border border-line">
      {rules.map((rule, index) => (
        <div
          key={rule.key}
          style={{ animationDelay: `${index * 60}ms` }}
          className="group flex animate-rise items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 odd:bg-fg/[0.02] hover:bg-primary/[0.05] motion-reduce:animate-none"
        >
          <Icon name={rule.icon} size={15} className="shrink-0 text-primary/80 transition-colors group-hover:text-primary" />
          <dt className="min-w-0 flex-1 text-sm text-fg-muted">{rule.label}</dt>
          <dd className="text-right text-sm font-semibold text-fg">
            {rule.isPill ? (
              <span className="inline-block rounded-md border border-primary/35 bg-primary/12 px-2 py-0.5 text-xs text-primary">{rule.value}</span>
            ) : (
              <>
                {rule.value}
                {rule.hint && (
                  <span title={rule.hint} className="ml-1.5 inline-grid size-4 cursor-help place-items-center align-middle text-primary">
                    <Icon name="info" size={14} />
                    <span className="sr-only">{rule.hint}</span>
                  </span>
                )}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Rulebook({ detail }: { detail: ContestDetail }) {
  const [tab, setTab] = useState<RulebookTab>('eligibility');
  const tabs: { id: RulebookTab; label: string; hint: string; icon: IconName; rules: ContestRule[] }[] = [
    { id: 'eligibility', label: text.eligibilityTitle, hint: text.eligibilityHint, icon: 'kyc', rules: detail.eligibility },
    { id: 'trading', label: text.tradingTitle, hint: text.tradingHint, icon: 'settings', rules: detail.tradingRules },
  ];
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <section style={{ animationDelay: '120ms' }} className="orbit-card flex animate-rise flex-col gap-4 p-5 motion-reduce:animate-none sm:p-6">
      <div role="tablist" aria-label={text.eligibilityTitle} className="flex gap-1 border-b border-line">
        {tabs.map((item) => {
          const isActive = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={cx(
                'relative -mb-px flex min-w-0 items-center gap-2 rounded-t-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'border-line border-b-surface bg-surface text-primary' : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              <Icon name={item.icon} size={15} className="shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <span aria-hidden="true" className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-fg-muted">{active.hint}</p>
      <RuleRows key={active.id} rules={active.rules} />
    </section>
  );
}

function TradingRulesPanel({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '200ms' }} className="orbit-card flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6">
      <SectionHead icon="settings" title={text.tradingTitle} hint={text.tradingHint} />
      <RuleRows rules={detail.tradingRules} />
    </section>
  );
}

function PrizeLadder({ prizes, footer }: { prizes: ContestPrize[]; footer?: ReactNode }) {
  const ordered = [...prizes].sort((a, b) => a.place - b.place);

  return (
    <section style={{ animationDelay: '200ms' }} className="orbit-card flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6">
      <SectionHead icon="trophy" title={text.prizeTitle} hint={text.prizeHint} />
      <ol className="flex flex-col gap-2">
        {ordered.map((prize, index) => {
          const isFirst = prize.place === 1;
          return (
            <li
              key={prize.place}
              style={{ animationDelay: `${300 + index * 120}ms` }}
              className={cx(
                'group flex animate-rise items-center gap-3 rounded-xl border px-3 py-3 transition-colors motion-reduce:animate-none',
                ladderWidth[index] ?? 'w-[80%]',
                isFirst ? 'border-primary/45 bg-primary/[0.1] shadow-[0_16px_32px_-24px_var(--brand-primary)]' : 'border-line bg-fg/[0.02] hover:border-primary/30',
              )}
            >
              <span
                className={cx(
                  'relative grid size-10 shrink-0 place-items-center rounded-full border font-mono text-sm font-bold tabular-nums',
                  isFirst ? 'border-primary/60 text-primary' : 'border-line-strong text-fg-muted',
                )}
              >
                {isFirst && <span aria-hidden="true" className="absolute -inset-1 rounded-full border border-dashed border-primary/40 animate-orbit-spin motion-reduce:animate-none" />}
                {pad(prize.place)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                  {prize.label}
                  {isFirst && <Icon name="trophy" size={13} className="text-primary" />}
                </p>
                <span className="text-[9.5px] font-bold tracking-[0.18em] text-fg-subtle">{prize.kind}</span>
              </div>
              <span className={cx('font-semibold tracking-tight tabular-nums', isFirst ? 'text-xl text-primary' : 'text-base text-fg')}>{prize.amount}</span>
            </li>
          );
        })}
      </ol>
      {footer && <div className="mt-auto">{footer}</div>}
    </section>
  );
}

function NotesList({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '280ms' }} className="orbit-card flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6">
      <SectionHead icon="info" title={text.notesTitle} hint={text.notesHint} />
      <ol className="flex flex-col">
        {detail.notes.map((note, index) => (
          <li
            key={note.key}
            style={{ animationDelay: `${360 + index * 80}ms` }}
            className="group grid animate-rise grid-cols-[2.5rem_1.5rem_minmax(0,1fr)] items-start gap-3 border-t border-dashed border-line py-3.5 first:border-t-0 first:pt-0 motion-reduce:animate-none"
          >
            <span aria-hidden="true" className="font-mono text-xl leading-none font-semibold text-fg/20 tabular-nums transition-colors group-hover:text-primary">
              {pad(index + 1)}
            </span>
            <Icon name={note.icon} size={16} className="mt-0.5 text-primary" />
            <p className="text-sm text-fg">{note.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EntryConsole({
  contest,
  detail,
  currency,
  now,
  isEnrolled,
  onEnroll,
}: {
  contest: DemoContest;
  detail: ContestDetail;
  currency: string;
  now: number;
  isEnrolled: boolean;
  onEnroll: () => void;
}) {
  const isMounted = useMounted();
  const isOpen = contest.registrationOpen;
  const start = Date.parse(contest.startsAt);
  const end = Date.parse(contest.endsAt);
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const milestones = [
    { key: 'start', icon: 'calendar' as const, label: text.contestStarts, iso: contest.startsAt },
    { key: 'reg', icon: 'user' as const, label: text.registrationCloses, iso: detail.registrationClosesAt },
    { key: 'end', icon: 'calendarEdit' as const, label: text.contestEnds, iso: contest.endsAt },
  ];

  return (
    <aside style={{ animationDelay: '160ms' }} className="orbit-card flex animate-rise flex-col overflow-hidden motion-reduce:animate-none xl:sticky xl:top-24">
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-line p-5">
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-primary/45 bg-primary/12 text-primary">
          <Icon name="wallet" size={18} />
        </span>
        <div className="relative min-w-0">
          <p className="text-xs text-fg-muted">{text.startingBalance}</p>
          <p className="text-xl font-semibold text-fg tabular-nums">{formatMoney(contest.startingBalance, currency)}</p>
          <p className="text-[11px] text-fg-subtle">{detail.startingBalanceNote}</p>
        </div>
      </div>

      <ol className="relative flex flex-col gap-5 border-b border-line p-5">
        <span aria-hidden="true" className="absolute top-7 bottom-7 left-[33px] w-0.5 overflow-hidden rounded-full bg-fg/10">
          <span
            className="absolute inset-x-0 top-0 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]"
            style={{ height: isMounted ? `${progress * 100}%` : '0%', transition: 'height 1600ms cubic-bezier(.2,.7,.2,1) 300ms' }}
          />
        </span>
        {milestones.map((milestone, index) => {
          const isPassed = now >= Date.parse(milestone.iso);
          return (
            <li key={milestone.key} style={{ animationDelay: `${240 + index * 120}ms` }} className="relative flex animate-rise items-start gap-3 motion-reduce:animate-none">
              <span
                className={cx(
                  'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border ring-4 ring-surface',
                  isPassed ? 'border-primary bg-primary/20 text-primary' : 'border-line-strong bg-surface text-fg-subtle',
                )}
              >
                {isPassed && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-primary/30 motion-reduce:hidden" style={{ animationDelay: `${index * 0.8}s` }} />}
                <Icon name={milestone.icon} size={13} className="relative" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-fg-muted">{milestone.label}</p>
                <p className="text-sm font-semibold text-fg">{longDate.format(Date.parse(milestone.iso))}</p>
                <p className="text-[11px] text-fg-subtle">{timeLabel(milestone.iso, contest.timezoneLabel)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-fg">{text.statusTitle}</p>
          <p className="text-xs text-fg-muted">{text.statusHint}</p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {detail.steps.map((step, index) => {
            const isDone = step.state === 'done';
            return (
              <li
                key={step.key}
                style={{ animationDelay: `${400 + index * 140}ms` }}
                className={cx('flex animate-rise items-start gap-3 border-l-2 py-1 pl-3 motion-reduce:animate-none', isDone ? 'border-success' : 'border-danger')}
              >
                <span className={cx('relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', isDone ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
                  {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-danger/30 motion-reduce:hidden" />}
                  <Icon name={isDone ? 'check' : 'close'} size={12} className="relative" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{step.title}</p>
                  <p className="text-xs text-fg-muted">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <Button type="button" fullWidth disabled={!isOpen || isEnrolled} onClick={onEnroll} className="group/reg relative overflow-hidden">
          {isOpen && !isEnrolled && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/reg:translate-x-full motion-reduce:hidden" />}
          <Icon name={isEnrolled ? 'checkCircle' : isOpen ? 'user' : 'lock'} size={15} className="relative" />
          <span className="relative">{isEnrolled ? text.enrolled : text.register}</span>
        </Button>
      </div>
    </aside>
  );
}

const returnFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });

function ScoreSegment({ icon, caption, value, hint, tone, delay }: { icon: IconName; caption: string; value: string; hint: string; tone: string; delay: number }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="flex animate-rise flex-col gap-1 border-b border-line px-5 py-4 motion-reduce:animate-none md:border-r md:border-b-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
        <Icon name={icon} size={13} className="text-primary" />
        {caption}
      </p>
      <p className={cx('font-mono text-3xl font-semibold tracking-tight tabular-nums', tone)}>{value}</p>
      <p className="text-xs text-fg-muted">{hint}</p>
    </div>
  );
}

function PlayerScorecard({ entry }: { entry: LeaderboardEntry }) {
  const returnTone = entry.returnPercent < 0 ? 'text-danger' : 'text-success';
  return (
    <section className="orbit-card grid animate-rise overflow-hidden motion-reduce:animate-none md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.15fr)]">
      <ScoreSegment icon="trophy" caption={text.yourRank} value={`#${entry.rank}`} hint={text.currentStanding} tone="text-fg" delay={80} />
      <ScoreSegment icon={entry.returnPercent < 0 ? 'trendDown' : 'trendUp'} caption={text.yourReturn} value={`${returnFormat.format(entry.returnPercent)}%`} hint={text.performance} tone={returnTone} delay={140} />
      <ScoreSegment icon="wallet" caption={text.yourEquity} value={formatMoney(entry.equity, 'USD')} hint={text.totalAccountValue} tone="text-fg" delay={200} />
      <Link
        href="/platforms"
        className="group/trade relative flex items-center gap-4 overflow-hidden bg-primary/[0.1] p-5 transition-colors duration-300 hover:bg-primary/[0.16] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-primary/50 text-primary">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-xl border border-primary/40 motion-reduce:hidden" />
          <Icon name="trendUp" size={18} />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-base font-semibold text-fg">{text.startTrading}</p>
          <p className="text-xs text-fg-muted">{text.startTradingHint}</p>
        </div>
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-primary/50 text-primary transition-transform duration-300 group-hover/trade:translate-x-1 group-hover/trade:-rotate-45">
          <Icon name="arrowRight" size={16} />
        </span>
      </Link>
    </section>
  );
}

export default function ContestDetailPage({ contestId }: { contestId: string }) {
  const { data, isLoading } = useDemoContest();
  const now = useNow(1000);
  const enrolledIds = useEnrolledContestIds();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const backLink = (
    <Link
      href="/promotion/demo-contest"
      className="group inline-flex items-center gap-2 self-start text-sm font-medium text-fg-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="grid size-8 place-items-center rounded-lg border border-line transition-colors group-hover:border-primary/45">
        <Icon name="arrowLeft" size={15} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {text.back}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-[22rem] rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-80 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
      </div>
    );
  }

  const contest = data.contests.find((item) => item.id === contestId);
  if (!contest) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <div className="orbit-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-14 animate-float place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary motion-reduce:animate-none">
            <Icon name="search" size={24} />
          </span>
          <p className="text-base font-semibold text-fg">{text.notFound}</p>
          <p className="text-sm text-fg-muted">{text.notFoundHint}</p>
        </div>
      </div>
    );
  }

  const detail = getContestDetail(contest, data.currency, now);
  const isEnrolled = enrolledIds.includes(contest.id);
  const handleEnroll = () => setIsRegisterOpen(true);
  const confirmRegistration = () => {
    enrollInContest(contest.id);
    setIsRegisterOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(text.registered);
  };

  const hero = <ContestHero contest={contest} detail={detail} currency={data.currency} now={now} isEnrolled={isEnrolled} onEnroll={handleEnroll} />;

  if (isEnrolled) {
    const you = getLeaderboard(contest, true).find((entry) => entry.isYou);
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {hero}
        {you && <PlayerScorecard entry={you} />}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <TradingRulesPanel detail={detail} />
          <PrizeLadder
            prizes={detail.prizes}
            footer={
              <LinkButton href={`/promotion/demo-contest/${contest.id}/leaderboard`} className="group/board relative w-full overflow-hidden">
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                <Icon name="barChart" size={15} className="relative" />
                <span className="relative">{text.viewLeaderboard}</span>
                <Icon name="arrowRight" size={15} className="relative transition-transform duration-200 group-hover/board:translate-x-1" />
              </LinkButton>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Rulebook detail={detail} />
          <div className="grid gap-6 lg:grid-cols-2">
            <PrizeLadder prizes={detail.prizes} />
            <NotesList detail={detail} />
          </div>
        </div>
        <EntryConsole contest={contest} detail={detail} currency={data.currency} now={now} isEnrolled={isEnrolled} onEnroll={handleEnroll} />
      </div>
      {isRegisterOpen && (
        <ContestRegisterModal contest={contest} detail={detail} currency={data.currency} onConfirm={confirmRegistration} onClose={() => setIsRegisterOpen(false)} />
      )}
    </div>
  );
}
