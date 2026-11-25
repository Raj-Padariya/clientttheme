'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { DotNumber } from '../ui/DotMatrix';
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
const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const clockTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

const statusChip: Record<ContestStatus, string> = {
  active: 'bg-success text-on-primary',
  upcoming: 'bg-info text-on-primary',
  completed: 'bg-fg/20 text-fg',
};
const statusKey = { active: 'contest.statusActive', upcoming: 'contest.statusUpcoming', completed: 'contest.statusCompleted' } as const satisfies Record<ContestStatus, string>;

/** Podium columns: 2nd on the left, 1st in the middle, 3rd on the right. */
const PODIUM_ORDER = [2, 1, 3];
const podiumHeight: Record<number, string> = { 1: 'h-36', 2: 'h-24', 3: 'h-16' };

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

function PanelHead({ icon, title, hint, aside }: { icon: IconName; title: string; hint: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/30">
          <Icon name={icon} size={18} />
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

function FillRing({ participants, max }: { participants: number; max: number }) {
  const isMounted = useMounted();
  const share = max === 0 ? 0 : participants / max;
  // A tiny share would draw nothing; keep a visible sliver so the ring still reads as "started".
  const visibleShare = participants > 0 ? Math.max(share, 0.03) : 0;

  return (
    <div className="relative size-24">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="6" className="stroke-fg/10" />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          className="stroke-primary drop-shadow-[0_0_6px_var(--brand-primary)]"
          style={{ strokeDashoffset: isMounted ? RING_LENGTH * (1 - visibleShare) : RING_LENGTH, transition: 'stroke-dashoffset 1400ms cubic-bezier(.2,.7,.2,1) 400ms' }}
        />
        <circle cx="40" cy="40" r="26" fill="none" strokeWidth="1" strokeDasharray="1.5 4" className="stroke-primary/40" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <p className="text-lg leading-none font-bold tabular-nums text-fg">
          {participants}
          <span className="block text-[10px] font-medium text-fg-subtle">/ {max}</span>
        </p>
      </div>
    </div>
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

function ScoreTile({ caption, footer, delay, children }: { caption: string; footer?: ReactNode; delay: number; children: ReactNode }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="relative flex animate-rise flex-col items-center gap-2 rounded-2xl bg-surface/60 p-4 text-center ring-1 ring-line backdrop-blur motion-reduce:animate-none">
      <Caption>{caption}</Caption>
      <div className="grid min-h-24 w-full place-items-center">{children}</div>
      {footer && <p className="text-[11px] text-fg-muted">{footer}</p>}
    </div>
  );
}

function TimerUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span className="rounded-lg bg-fg/[0.06] px-1.5 py-1.5 ring-1 ring-line">
        <DotNumber value={pad(value)} small />
      </span>
      <span className="text-[9px] font-semibold tracking-[0.16em] text-fg-subtle">{label}</span>
    </span>
  );
}

/** The dot-matrix font has no colon glyph, so the separators are two blinking dots. */
function TimerColon() {
  return (
    <span aria-hidden="true" className="flex flex-col gap-1 pb-5">
      <span className="size-1 animate-blink rounded-full bg-primary motion-reduce:animate-none" />
      <span className="size-1 animate-blink rounded-full bg-primary motion-reduce:animate-none" />
    </span>
  );
}

function ArenaHero({
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
      <span className="inline-flex items-center gap-2 self-start rounded-xl bg-success-soft px-4 py-2.5 text-sm font-semibold text-success ring-1 ring-success/30">
        <Icon name="checkCircle" size={15} />
        {text.enrolled}
      </span>
    );
  } else if (contest.registrationOpen) {
    heroAction = (
      <Button type="button" onClick={onEnroll} className="group/join relative self-start overflow-hidden">
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-ring-breathe rounded-[inherit] ring-2 ring-primary/50 motion-reduce:hidden" />
        <Icon name="user" size={15} className="relative transition-transform duration-300 group-hover/join:scale-110" />
        <span className="relative">{text.joinContest}</span>
      </Button>
    );
  } else {
    heroAction = (
      <span className="inline-flex items-center gap-2 self-start rounded-xl bg-fg/5 px-4 py-2.5 text-sm font-semibold text-fg-subtle ring-1 ring-line">
        <Icon name="lock" size={15} />
        {text.registrationClosed}
      </span>
    );
  }

  return (
    <section className="kpi-card relative animate-rise overflow-hidden rounded-[28px] motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-20 size-[28rem] animate-drift rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-40 size-96 animate-glow rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
      <Icon name="trophy" size={260} aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-[38%] -rotate-12 text-primary/[0.06]" />
      {['top-[14%] left-[30%]', 'top-[70%] left-[12%]', 'top-[22%] left-[52%]', 'bottom-[18%] left-[46%]'].map((position, index) => (
        <span key={position} aria-hidden="true" style={{ animationDelay: `${index * 0.7}s` }} className={cx('pointer-events-none absolute size-1 animate-twinkle rounded-full bg-primary motion-reduce:hidden', position)} />
      ))}

      <div className="relative grid gap-8 p-6 lg:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase', statusChip[contest.status])}>
              {contest.status === 'active' && <span className="size-1.5 animate-blink rounded-full bg-on-primary motion-reduce:animate-none" />}
              {translate(statusKey[contest.status])}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-2.5 py-1 text-[11px] font-semibold text-fg-muted ring-1 ring-line">
              <Icon name="calendar" size={12} />
              {longDate.format(Date.parse(contest.startsAt))} - {longDate.format(endsAt)}
            </span>
            {contest.registrationOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success ring-1 ring-success/30">
                <span className="relative grid size-2 place-items-center">
                  <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-success/50 motion-reduce:hidden" />
                  <span className="relative size-1.5 rounded-full bg-success" />
                </span>
                {text.registrationOpen}
              </span>
            )}
          </div>
          <h2 className="animate-gold-sheen bg-linear-to-r from-fg via-primary to-fg bg-[length:250%_100%] bg-clip-text text-4xl font-black tracking-tight text-transparent capitalize motion-reduce:animate-none sm:text-5xl">
            {contest.name}
          </h2>
          <p className="text-sm text-fg-muted">{contest.description}</p>
          {heroAction}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ScoreTile caption={text.participants} footer={text.filled(filledPercent)} delay={120}>
            <FillRing participants={detail.participants} max={detail.maxParticipants} />
          </ScoreTile>
          <ScoreTile caption={text.prizePool} footer={text.totalPrizePool} delay={200}>
            <div className="flex flex-col items-center gap-2">
              <Icon name="trophy" size={26} className="animate-float text-primary drop-shadow-[0_0_10px_var(--brand-primary)] motion-reduce:animate-none" />
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-fg">{formatMoney(detail.prizePool, currency)}</p>
            </div>
          </ScoreTile>
          <ScoreTile caption={text.daysLeft} footer={text.daysRemaining} delay={280}>
            <DotNumber value={pad(Math.floor(remaining / DAY_MS))} />
          </ScoreTile>
          <ScoreTile caption={text.liveTimer} delay={360}>
            {hasEnded ? (
              <div className="flex w-full flex-col items-center gap-1">
                <Flatline />
                <p className="flex items-center gap-1.5 text-lg font-bold text-danger">
                  <span className="size-2 animate-blink rounded-full bg-danger motion-reduce:animate-none" />
                  {text.ended}
                </p>
              </div>
            ) : (
              <div role="timer" aria-label={timer.map((unit) => `${pad(unit.value)} ${unit.label}`).join(' ')} className="flex items-center gap-1.5">
                {timer.map((unit, index) => (
                  <span key={unit.label} className="flex items-center gap-1.5">
                    {index > 0 && <TimerColon />}
                    <TimerUnit value={unit.value} label={unit.label} />
                  </span>
                ))}
              </div>
            )}
          </ScoreTile>
        </div>
      </div>
    </section>
  );
}

function JourneyTrack({ contest, detail, currency, now }: { contest: DemoContest; detail: ContestDetail; currency: string; now: number }) {
  const isMounted = useMounted();
  const start = Date.parse(contest.startsAt);
  const end = Date.parse(contest.endsAt);
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const milestones = [
    { key: 'start', icon: 'calendar' as const, label: text.contestStarts, iso: contest.startsAt },
    { key: 'reg', icon: 'user' as const, label: text.registrationCloses, iso: detail.registrationClosesAt },
    { key: 'end', icon: 'calendarEdit' as const, label: text.contestEnds, iso: contest.endsAt },
  ];

  return (
    <section style={{ animationDelay: '120ms' }} className="grid animate-rise gap-4 rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-center">
      <div className="relative">
        <div aria-hidden="true" className="absolute top-5 right-[16.66%] left-[16.66%] hidden h-1 rounded-full bg-fg/10 md:block">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-primary/40 to-primary shadow-[0_0_12px_var(--brand-primary)]"
            style={{ width: isMounted ? `${progress * 100}%` : '0%', transition: 'width 1600ms cubic-bezier(.2,.7,.2,1) 300ms' }}
          />
        </div>
        <ol className="relative grid gap-4 md:grid-cols-3">
          {milestones.map((milestone, index) => {
            const isPassed = now >= Date.parse(milestone.iso);
            return (
              <li key={milestone.key} style={{ animationDelay: `${200 + index * 140}ms` }} className="flex animate-rise flex-row items-center gap-3 motion-reduce:animate-none md:flex-col md:text-center">
                <span className={cx('relative grid size-11 shrink-0 place-items-center rounded-full ring-4 ring-surface', isPassed ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-muted')}>
                  {isPassed && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/60 motion-reduce:hidden" style={{ animationDelay: `${index * 0.8}s` }} />}
                  <Icon name={milestone.icon} size={17} />
                </span>
                <div>
                  <p className="text-xs text-fg-muted">{milestone.label}</p>
                  <p className="text-base font-semibold text-fg">{longDate.format(Date.parse(milestone.iso))}</p>
                  <p className="text-[11px] text-fg-subtle">{timeLabel(milestone.iso, contest.timezoneLabel)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/30 via-surface-2 to-surface-2 p-4 ring-1 ring-primary/30">
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute -right-4 -bottom-6 text-[88px] leading-none font-black text-primary/10 select-none">$</span>
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary transition-transform duration-300 group-hover:-rotate-12">
            <Icon name="wallet" size={18} />
          </span>
          <div>
            <p className="text-xs text-fg-muted">{text.startingBalance}</p>
            <p className="text-xl font-semibold tabular-nums text-fg">{formatMoney(contest.startingBalance, currency)}</p>
            <p className="text-[11px] text-fg-subtle">{detail.startingBalanceNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Podium({ prizes, footer }: { prizes: ContestPrize[]; footer?: ReactNode }) {
  const columns = PODIUM_ORDER.map((place) => prizes.find((prize) => prize.place === place)).filter((prize): prize is ContestPrize => prize !== undefined);

  return (
    <section style={{ animationDelay: '200ms' }} className="flex animate-rise flex-col gap-6 rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6">
      <PanelHead icon="trophy" title={text.prizeTitle} hint={text.prizeHint} />
      <div className="mt-auto grid grid-cols-3 items-end gap-3">
        {columns.map((prize, index) => {
          const isFirst = prize.place === 1;
          return (
            <div key={prize.place} className="group flex flex-col items-center gap-3 text-center">
              <div style={{ animationDelay: `${600 + index * 150}ms` }} className="flex animate-rise flex-col items-center gap-1 motion-reduce:animate-none">
                {isFirst && <Icon name="trophy" size={20} className="animate-float text-primary drop-shadow-[0_0_10px_var(--brand-primary)] motion-reduce:animate-none" />}
                <p className={cx('font-semibold tracking-tight tabular-nums', isFirst ? 'text-xl text-primary' : 'text-base text-fg')}>{prize.amount}</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] text-fg-subtle ring-1 ring-line">{prize.kind}</span>
              </div>
              <div
                style={{ animationDelay: `${300 + index * 150}ms` }}
                className={cx(
                  'relative flex w-full origin-bottom animate-bar-rise flex-col items-center justify-start gap-1 overflow-hidden rounded-t-2xl pt-3 transition-[filter] duration-300 group-hover:brightness-125 motion-reduce:animate-none',
                  podiumHeight[prize.place],
                  isFirst ? 'bg-linear-to-b from-primary to-primary/30 text-on-primary shadow-[0_-10px_40px_-12px_var(--brand-primary)]' : 'bg-linear-to-b from-fg/15 to-fg/[0.03] text-fg',
                )}
              >
                {isFirst && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
                <span className={cx('relative grid size-9 place-items-center rounded-full text-sm font-black tabular-nums', isFirst ? 'bg-on-primary/15' : 'bg-surface ring-1 ring-line')}>{pad(prize.place)}</span>
                <span className="relative text-[11px] font-semibold">{prize.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      {footer}
    </section>
  );
}

function RuleTile({ rule, index }: { rule: ContestRule; index: number }) {
  return (
    <li style={{ animationDelay: `${index * 60}ms` }} className="group relative flex animate-feed-in items-center gap-3 rounded-xl bg-surface-2/60 p-3.5 ring-1 ring-line transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:ring-primary/40 motion-reduce:animate-none">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
        <Icon name={rule.icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-fg-muted">{rule.label}</p>
        {rule.isPill ? (
          <span className="mt-0.5 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/30">{rule.value}</span>
        ) : (
          <p className="text-sm font-semibold text-fg">
            {rule.value}
            {rule.hint && (
              <span title={rule.hint} className="ml-1.5 inline-grid size-4 cursor-help place-items-center align-middle text-primary">
                <Icon name="info" size={14} />
                <span className="sr-only">{rule.hint}</span>
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

function Rulebook({ detail }: { detail: ContestDetail }) {
  const [tab, setTab] = useState<RulebookTab>('eligibility');
  const tabs: { id: RulebookTab; label: string; hint: string; icon: IconName; rules: ContestRule[] }[] = [
    { id: 'eligibility', label: text.eligibilityTitle, hint: text.eligibilityHint, icon: 'kyc', rules: detail.eligibility },
    { id: 'trading', label: text.tradingTitle, hint: text.tradingHint, icon: 'settings', rules: detail.tradingRules },
  ];
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];
  const activeIndex = tabs.indexOf(active);

  return (
    <section style={{ animationDelay: '260ms' }} className="flex animate-rise flex-col gap-5 rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6">
      <div role="tablist" aria-label={text.eligibilityTitle} className="relative grid grid-cols-2 rounded-2xl bg-surface-2 p-1 ring-1 ring-line">
        <span
          aria-hidden="true"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl bg-primary shadow-[0_8px_20px_-8px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none"
        />
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === tab}
            onClick={() => setTab(item.id)}
            className={cx(
              'relative flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              item.id === tab ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={15} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-fg-muted">{active.hint}</p>
      <ul key={active.id} className="grid gap-3 sm:grid-cols-2">
        {active.rules.map((rule, index) => (
          <RuleTile key={rule.key} rule={rule} index={index} />
        ))}
      </ul>
    </section>
  );
}

function StatusStepper({ detail, isOpen, isEnrolled, onEnroll }: { detail: ContestDetail; isOpen: boolean; isEnrolled: boolean; onEnroll: () => void }) {
  return (
    <section style={{ animationDelay: '320ms' }} className="flex animate-rise flex-col gap-5 rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6">
      <PanelHead icon="user" title={text.statusTitle} hint={text.statusHint} />
      <ol className="relative flex flex-col gap-4 pl-2">
        <span aria-hidden="true" className={cx('absolute top-5 bottom-5 left-[25px] w-0.5 origin-top animate-grow bg-linear-to-b from-success via-fg/20 motion-reduce:animate-none', isOpen ? 'to-success' : 'to-danger')} />
        {detail.steps.map((step, index) => {
          const isDone = step.state === 'done';
          return (
            <li key={step.key} style={{ animationDelay: `${400 + index * 160}ms` }} className="relative flex animate-rise items-start gap-4 motion-reduce:animate-none">
              <span className={cx('relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-surface', isDone ? 'bg-success text-on-primary' : 'bg-danger text-on-primary')}>
                {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-danger/40 motion-reduce:hidden" />}
                <Icon name={isDone ? 'check' : 'close'} size={16} className="relative" />
              </span>
              <div className={cx('flex-1 rounded-xl p-3.5 ring-1', isDone ? 'bg-success-soft/50 ring-success/25' : 'bg-danger-soft/50 ring-danger/25')}>
                <p className="text-sm font-semibold text-fg">{step.title}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <Button type="button" fullWidth disabled={!isOpen || isEnrolled} onClick={onEnroll} className="group/reg relative mt-auto overflow-hidden">
        {isOpen && !isEnrolled && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/reg:translate-x-full motion-reduce:hidden" />}
        <Icon name={isEnrolled ? 'checkCircle' : isOpen ? 'user' : 'lock'} size={15} className="relative" />
        <span className="relative">{isEnrolled ? text.enrolled : text.register}</span>
      </Button>
    </section>
  );
}

const returnFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });

function PlayerStat({ icon, caption, value, hint, tone, delay }: { icon: IconName; caption: string; value: string; hint: string; tone: string; delay: number }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group relative flex animate-rise items-center gap-4 overflow-hidden rounded-[22px] border border-line bg-surface p-4 shadow-card transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-60" />
      <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:-rotate-6">
        <Icon name={icon} size={20} />
      </span>
      <div className="relative min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{caption}</p>
        <p className={cx('text-2xl font-bold tracking-tight tabular-nums', tone)}>{value}</p>
        <p className="text-xs text-fg-muted">{hint}</p>
      </div>
    </div>
  );
}

function PlayerStrip({ entry }: { entry: LeaderboardEntry }) {
  const returnTone = entry.returnPercent < 0 ? 'text-danger' : 'text-success';
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PlayerStat icon="trophy" caption={text.yourRank} value={`#${entry.rank}`} hint={text.currentStanding} tone="text-fg" delay={80} />
      <PlayerStat icon={entry.returnPercent < 0 ? 'trendDown' : 'trendUp'} caption={text.yourReturn} value={`${returnFormat.format(entry.returnPercent)}%`} hint={text.performance} tone={returnTone} delay={140} />
      <PlayerStat icon="wallet" caption={text.yourEquity} value={formatMoney(entry.equity, 'USD')} hint={text.totalAccountValue} tone="text-fg" delay={200} />
      <Link
        href="/platforms"
        style={{ animationDelay: '260ms' }}
        className="group/trade relative flex animate-rise items-center gap-4 overflow-hidden rounded-[22px] bg-linear-to-br from-primary via-primary/85 to-primary/60 p-4 text-on-primary shadow-[0_18px_40px_-18px_var(--brand-primary)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
      >
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-10 size-32 animate-glow rounded-full bg-on-primary/15 blur-2xl motion-reduce:animate-none" />
        <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-on-primary/15 ring-1 ring-on-primary/30">
          <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl ring-2 ring-on-primary/40 motion-reduce:hidden" />
          <Icon name="trendUp" size={20} />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-lg font-bold">{text.startTrading}</p>
          <p className="text-xs text-on-primary/75">{text.startTradingHint}</p>
        </div>
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-on-primary text-primary transition-transform duration-300 group-hover/trade:translate-x-1 group-hover/trade:-rotate-45">
          <Icon name="arrowRight" size={16} />
        </span>
      </Link>
    </div>
  );
}

function TradingRulesPanel({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '260ms' }} className="flex animate-rise flex-col gap-5 rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6">
      <PanelHead icon="settings" title={text.tradingTitle} hint={text.tradingHint} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {detail.tradingRules.map((rule, index) => (
          <RuleTile key={rule.key} rule={rule} index={index} />
        ))}
      </ul>
    </section>
  );
}

function NotesBoard({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '380ms' }} className="flex animate-rise flex-col gap-5 rounded-[28px] border border-line bg-surface p-5 shadow-card motion-reduce:animate-none sm:p-6">
      <PanelHead icon="info" title={text.notesTitle} hint={text.notesHint} />
      <ol className="grid gap-3 sm:grid-cols-2">
        {detail.notes.map((note, index) => (
          <li
            key={note.key}
            style={{ animationDelay: `${450 + index * 90}ms` }}
            className="group relative flex animate-rise flex-col gap-3 overflow-hidden rounded-2xl bg-surface-2/60 p-4 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:ring-primary/40 motion-reduce:animate-none"
          >
            <span aria-hidden="true" className="absolute -top-3 -right-1 text-6xl leading-none font-black text-fg/[0.05] tabular-nums transition-colors duration-300 group-hover:text-primary/15">
              {pad(index + 1)}
            </span>
            <span className="relative grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon name={note.icon} size={16} />
            </span>
            <p className="relative text-sm text-fg">{note.text}</p>
          </li>
        ))}
      </ol>
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
      className="group inline-flex items-center gap-2 self-start rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon name="arrowLeft" size={15} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      {text.back}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-[22rem] rounded-[28px]" />
        <Skeleton className="h-40 rounded-[28px]" />
      </div>
    );
  }

  const contest = data.contests.find((item) => item.id === contestId);
  if (!contest) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface px-6 py-16 text-center shadow-card">
          <span className="grid size-14 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
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

  const hero = <ArenaHero contest={contest} detail={detail} currency={data.currency} now={now} isEnrolled={isEnrolled} onEnroll={handleEnroll} />;

  if (isEnrolled) {
    const you = getLeaderboard(contest, true).find((entry) => entry.isYou);
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {hero}
        {you && <PlayerStrip entry={you} />}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <TradingRulesPanel detail={detail} />
          <Podium
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
      <JourneyTrack contest={contest} detail={detail} currency={data.currency} now={now} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Podium prizes={detail.prizes} />
        <Rulebook detail={detail} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <StatusStepper detail={detail} isOpen={contest.registrationOpen} isEnrolled={isEnrolled} onEnroll={handleEnroll} />
        {isRegisterOpen && (
          <ContestRegisterModal contest={contest} detail={detail} currency={data.currency} onConfirm={confirmRegistration} onClose={() => setIsRegisterOpen(false)} />
        )}
        <NotesBoard detail={detail} />
      </div>
    </div>
  );
}
