'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { cx } from '../lib/cx';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { toast } from '../ui/Toast';
import { contestText as text, getContestDetail, getLeaderboard, type ContestDetail, type ContestPrize, type ContestRule, type LeaderboardEntry } from './contestDetails';
import { enrollInContest, useEnrolledContestIds } from './contestEnrollment';
import { ContestRegisterModal } from './ContestRegisterModal';

/*
 * Zenith contest detail as race control: an open hero, a mission clock (big digital countdown, a seconds tick strip and
 * the contest's lifetime as a ruler with milestone markers and a running "now" needle), a readout row (seat ring
 * gauge, prize pool, starting balance), a rule ledger, a notes ledger, an inverted prize ladder and an entry checklist.
 */
type RulebookTab = 'eligibility' | 'trading';

const RED = 'var(--zenith-red)';
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const SECOND_TICKS = 60;
const MAX_RULER_TICKS = 60;
const GAUGE_RADIUS = 40;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const clockTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
const returnFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] ring-1 ring-line';
const pillClass =
  'group/pill relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full py-1.5 pr-1.5 pl-5 text-sm font-bold transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none';

const statusChip: Record<ContestStatus, string> = {
  active: 'bg-success/12 text-success ring-success/30',
  upcoming: 'bg-fg/[0.06] text-fg ring-line-strong',
  completed: 'bg-fg/[0.04] text-fg-muted ring-line',
};
const statusKey = { active: 'contest.statusActive', upcoming: 'contest.statusUpcoming', completed: 'contest.statusCompleted' } as const satisfies Record<ContestStatus, string>;

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, '0');
}

function timeLabel(iso: string, timezone: string) {
  return `${clockTime.format(Date.parse(iso))} (${timezone})`;
}

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
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
  return <p className={cx(captionClass, className)}>{children}</p>;
}

// Looping shine across the main call to action.
function Shine() {
  return <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/30" />;
}

function SectionHead({ icon, title, hint, aside, inverted = false }: { icon: IconName; title: string; hint: string; aside?: ReactNode; inverted?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className={cx('grid size-10 shrink-0 place-items-center rounded-[12px]', inverted ? 'bg-app text-fg' : 'bg-fg text-app')}>
          <Icon name={icon} size={15} />
        </span>
        <div className="min-w-0">
          <h2 className={cx('text-lg font-black tracking-[-0.02em]', inverted ? 'text-app' : 'text-fg')}>{title}</h2>
          <p className={cx('text-xs', inverted ? 'text-app/60' : 'text-fg-muted')}>{hint}</p>
        </div>
      </div>
      {aside}
    </header>
  );
}

/* ───────────── Hero ───────────── */

function HeroAction({ contest, isEnrolled, onEnroll }: { contest: DemoContest; isEnrolled: boolean; onEnroll: () => void }) {
  if (isEnrolled) {
    return (
      <span className="inline-flex h-12 items-center gap-2 rounded-full bg-success/12 px-5 text-sm font-bold text-success ring-1 ring-success/35">
        <Icon name="checkCircle" size={15} />
        {text.enrolled}
      </span>
    );
  }
  if (contest.registrationOpen) {
    return (
      <button type="button" onClick={onEnroll} style={{ background: RED }} className={cx(pillClass, 'text-white')}>
        <Shine />
        <span className="relative">{text.joinContest}</span>
        <span className="relative grid size-9 place-items-center rounded-full bg-white/20 transition-transform duration-300 group-hover/pill:scale-110 motion-reduce:transition-none">
          <Icon name="user" size={15} />
        </span>
      </button>
    );
  }
  return (
    <span className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-fg-muted ring-1 ring-line">
      <Icon name="lock" size={15} />
      {text.registrationClosed}
    </span>
  );
}

function ContestHero({ contest, isEnrolled, onEnroll }: { contest: DemoContest; isEnrolled: boolean; onEnroll: () => void }) {
  return (
    <header className="zenith-tile flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase ring-1', statusChip[contest.status])}>
          {contest.status === 'active' && <span aria-hidden="true" className="zenith-blink size-1.5 rounded-[2px] bg-current" />}
          {translate(statusKey[contest.status])}
        </span>
        {contest.registrationOpen && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.04] px-2.5 py-1 text-[11px] font-semibold text-fg ring-1 ring-line">
            <span className="relative grid size-2 place-items-center">
              <span aria-hidden="true" style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[2px] motion-reduce:hidden" />
              <span style={{ background: RED }} className="relative size-1.5 rounded-[2px]" />
            </span>
            {text.registrationOpen}
          </span>
        )}
        <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-fg-subtle">#{contest.id}</span>
      </div>
      <div className="min-w-0">
        <h1 className="text-5xl leading-[0.92] font-black tracking-[-0.05em] text-fg capitalize sm:text-6xl">{contest.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">{contest.description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="inline-flex flex-wrap items-center gap-3 text-sm font-semibold text-fg">
          <Icon name="calendar" size={15} className="text-fg-subtle" />
          {longDate.format(Date.parse(contest.startsAt))}
          <span aria-hidden="true" className="flex items-center gap-1">
            <span style={{ background: RED }} className="size-1.5 rounded-[2px]" />
            <span className="w-10 border-t-2 border-dashed border-line-strong" />
            <span className="size-1.5 rounded-[2px] bg-fg" />
          </span>
          {longDate.format(Date.parse(contest.endsAt))}
        </p>
        <HeroAction contest={contest} isEnrolled={isEnrolled} onEnroll={onEnroll} />
      </div>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
        <span className="h-px flex-1 bg-line" />
      </span>
    </header>
  );
}

/* ───────────── Mission clock: digital countdown, seconds strip, lifetime ruler ───────────── */

/** Flat ECG trace: one heartbeat sweeps through, then the line rests — the contest's clock has stopped. */
function Flatline() {
  return (
    <svg viewBox="0 0 140 36" className="h-10 w-40" aria-hidden="true">
      <path d="M0 18 H140" strokeWidth="1" className="stroke-fg/15" />
      <path d="M0 18 H44 L50 6 L57 30 L63 12 L68 18 H140" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="0.25 1" style={{ stroke: RED }}>
        <animate attributeName="stroke-dashoffset" values="0.25;-1" dur="2.2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function DigitGroup({ value, label, isAccent = false }: { value: string; label: string; isAccent?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        key={value}
        style={isAccent ? { color: RED } : undefined}
        className={cx('animate-dot-pop font-mono text-5xl leading-none font-black tracking-tighter tabular-nums motion-reduce:animate-none sm:text-7xl', !isAccent && 'text-fg')}
      >
        {value}
      </span>
      <span className={cx(captionClass, 'text-fg-subtle')}>{label}</span>
    </div>
  );
}

function Colon() {
  return (
    <span aria-hidden="true" className="flex flex-col gap-2 pt-3 sm:pt-5">
      <span className="zenith-blink size-2 rounded-[2px] bg-fg/50" />
      <span className="zenith-blink size-2 rounded-[2px] bg-fg/50" />
    </span>
  );
}

function MissionClock({ contest, detail, now }: { contest: DemoContest; detail: ContestDetail; now: number }) {
  const isMounted = useMounted();
  const start = Date.parse(contest.startsAt);
  const end = Date.parse(contest.endsAt);
  const remaining = Math.max(0, end - now);
  const hasEnded = remaining === 0;
  const seconds = Math.floor((remaining % MINUTE_MS) / 1000);
  const timer = [
    { label: text.hrs, value: Math.floor((remaining % DAY_MS) / HOUR_MS) },
    { label: text.min, value: Math.floor((remaining % HOUR_MS) / MINUTE_MS) },
    { label: text.sec, value: seconds },
  ];

  const span = Math.max(end - start, 1);
  const progress = Math.min(1, Math.max(0, (now - start) / span));
  const totalDays = Math.max(1, Math.round(span / DAY_MS));
  const tickStep = Math.ceil(totalDays / MAX_RULER_TICKS);
  const ticks = Array.from({ length: Math.floor(totalDays / tickStep) + 1 }, (_, index) => index * tickStep);
  const milestones = [
    { key: 'start', icon: 'calendar' as const, label: text.contestStarts, iso: contest.startsAt },
    { key: 'reg', icon: 'user' as const, label: text.registrationCloses, iso: detail.registrationClosesAt },
    { key: 'end', icon: 'calendarEdit' as const, label: text.contestEnds, iso: contest.endsAt },
  ];

  return (
    <section style={{ animationDelay: '80ms' }} className={cx(panelClass, 'zenith-tile flex flex-col gap-7 overflow-hidden p-5 sm:p-7')}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:14px_14px] text-fg/[0.1] [mask-image:linear-gradient(200deg,#000,transparent_55%)]"
      />

      <div className="relative flex items-center justify-between gap-4">
        <Caption className="text-fg-subtle">{text.daysLeft}</Caption>
        <Caption className="flex items-center gap-1.5 text-fg-subtle">
          <span aria-hidden="true" style={hasEnded ? { background: RED } : undefined} className={cx('zenith-blink size-1.5 rounded-[2px]', !hasEnded && 'bg-success')} />
          {text.liveTimer}
        </Caption>
      </div>

      <div className="relative flex flex-wrap items-start gap-x-4 gap-y-5 sm:gap-x-6">
        <DigitGroup value={pad(Math.floor(remaining / DAY_MS))} label={text.daysRemaining} />
        {hasEnded ? (
          <div className="flex flex-col items-start gap-1 border-l border-dashed border-line-strong pl-5">
            <Flatline />
            <p style={{ color: RED }} className="flex items-center gap-1.5 text-lg font-black">
              <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-2 rounded-[2px]" />
              {text.ended}
            </p>
          </div>
        ) : (
          <div role="timer" aria-label={timer.map((unit) => `${pad(unit.value)} ${unit.label}`).join(' ')} className="flex items-start gap-x-4 sm:gap-x-6">
            {timer.map((unit, index) => (
              <span key={unit.label} className="flex items-start gap-x-4 sm:gap-x-6">
                <Colon />
                <DigitGroup value={pad(unit.value)} label={unit.label} isAccent={index === timer.length - 1} />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Seconds strip: one tick per second of the current minute, lit as it runs down. */}
      {!hasEnded && (
        <span aria-hidden="true" className="relative flex h-5 items-end gap-[3px]">
          {Array.from({ length: SECOND_TICKS }, (_, index) => {
            const isLit = index < seconds;
            const isMajor = index % 5 === 0;
            return (
              <span
                key={index}
                style={isLit ? { background: RED } : undefined}
                className={cx('w-full max-w-[5px] rounded-full transition-[background-color] duration-300', isMajor ? 'h-5' : 'h-3', !isLit && 'bg-fg/12')}
              />
            );
          })}
        </span>
      )}

      {/* The contest's lifetime as a ruler: days as ticks, milestones as markers, a needle at now. */}
      <div className="relative flex flex-col gap-4 border-t border-dashed border-line-strong pt-6">
        <div aria-hidden="true" className="relative mx-2 h-14">
          <span className="absolute inset-x-0 top-6 h-2 rounded-full bg-fg/[0.07]" />
          <span
            style={{ background: RED, width: isMounted ? `${progress * 100}%` : '0%' }}
            className="absolute top-6 left-0 h-2 rounded-full transition-[width] duration-[1600ms] ease-out motion-reduce:transition-none"
          />
          {ticks.map((day) => (
            <span
              key={day}
              style={{ left: `${(day / totalDays) * 100}%` }}
              className={cx('absolute top-10 border-l border-line-strong', day % 7 === 0 ? 'h-3' : 'h-1.5')}
            />
          ))}
          {milestones.map((milestone) => {
            const left = Math.min(100, Math.max(0, ((Date.parse(milestone.iso) - start) / span) * 100));
            const isPassed = now >= Date.parse(milestone.iso);
            return (
              <span
                key={milestone.key}
                style={{ left: `${left}%` }}
                className={cx(
                  'absolute top-7 size-4 -translate-x-1/2 -translate-y-1/2 rounded-[5px] ring-4 ring-app',
                  isPassed ? 'bg-fg' : 'border-2 border-dashed border-fg/40 bg-app',
                )}
              />
            );
          })}
          {progress > 0 && progress < 1 && (
            <span style={{ left: isMounted ? `${progress * 100}%` : '0%' }} className="absolute top-0 bottom-3 transition-[left] duration-[1600ms] ease-out motion-reduce:transition-none">
              <span style={{ background: RED }} className="absolute top-1 bottom-0 left-0 w-0.5 -translate-x-1/2" />
              <span style={{ background: RED }} className="absolute top-0 left-0 size-2.5 -translate-x-1/2 animate-ping-soft rounded-[3px] motion-reduce:hidden" />
              <span style={{ background: RED }} className="absolute top-0 left-0 size-2.5 -translate-x-1/2 rounded-[3px]" />
            </span>
          )}
        </div>

        <ol className="grid gap-4 sm:grid-cols-3">
          {milestones.map((milestone, index) => {
            const isPassed = now >= Date.parse(milestone.iso);
            return (
              <li key={milestone.key} style={stagger(index, 110, 300)} className="zenith-tile flex items-start gap-3">
                <span className={cx('relative grid size-9 shrink-0 place-items-center rounded-[11px]', isPassed ? 'bg-fg text-app' : 'border-2 border-dashed border-fg/30 text-fg-subtle')}>
                  {isPassed && <span aria-hidden="true" style={{ animationDelay: `${index * 0.6}s` }} className="absolute inset-0 animate-ping-soft rounded-[11px] bg-fg/20 motion-reduce:hidden" />}
                  <Icon name={milestone.icon} size={14} className="relative" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-fg-muted">{milestone.label}</p>
                  <p className="text-sm font-bold text-fg">{longDate.format(Date.parse(milestone.iso))}</p>
                  <p className="text-[11px] text-fg-subtle">{timeLabel(milestone.iso, contest.timezoneLabel)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Readouts: seat ring gauge, prize pool, starting balance ───────────── */

function SeatGauge({ participants, max }: { participants: number; max: number }) {
  const isMounted = useMounted();
  const share = max === 0 ? 0 : Math.min(1, participants / max);
  const filledPercent = Math.round(share * 100);

  return (
    <div className="flex items-center gap-4 p-5">
      <span className="relative grid size-24 shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r={GAUGE_RADIUS} fill="none" strokeWidth="6" strokeDasharray="2 4" stroke="currentColor" className="text-line-strong" />
          <circle
            cx="50"
            cy="50"
            r={GAUGE_RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${isMounted ? share * GAUGE_CIRCUMFERENCE : 0} ${GAUGE_CIRCUMFERENCE}`}
            style={{ stroke: RED }}
            className="transition-[stroke-dasharray] duration-[1400ms] ease-out motion-reduce:transition-none"
          />
        </svg>
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
          <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px] bg-fg" />
        </span>
        <span className="font-mono text-2xl font-black text-fg tabular-nums">{participants}</span>
      </span>
      <div className="min-w-0">
        <Caption className="text-fg-subtle">{text.participants}</Caption>
        <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
          <span className="font-mono text-3xl font-black text-fg">{participants}</span>
          <span className="text-sm font-semibold text-fg-muted">/ {max}</span>
        </p>
        <span className="mt-1.5 inline-block rounded-full bg-fg/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-fg ring-1 ring-line">{text.filled(filledPercent)}</span>
      </div>
    </div>
  );
}

function Readouts({ contest, detail, currency }: { contest: DemoContest; detail: ContestDetail; currency: string }) {
  return (
    <section style={{ animationDelay: '140ms' }} className={cx(panelClass, 'zenith-tile grid divide-y divide-dashed divide-line-strong overflow-hidden md:grid-cols-3 md:divide-x md:divide-y-0')}>
      <SeatGauge participants={detail.participants} max={detail.maxParticipants} />

      <div className="relative flex items-center gap-4 p-5">
        <span style={{ background: RED }} className="grid size-14 shrink-0 animate-float place-items-center rounded-[18px] text-white motion-reduce:animate-none">
          <Icon name="trophy" size={22} />
        </span>
        <div className="min-w-0">
          <Caption className="text-fg-subtle">{text.prizePool}</Caption>
          <p className="relative mt-1 inline-block overflow-hidden font-mono text-3xl font-black tracking-tight text-fg tabular-nums">
            {formatMoney(detail.prizePool, currency)}
            <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-app/60 to-transparent" />
          </p>
          <p className="text-[11px] font-medium text-fg-muted">{text.totalPrizePool}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-fg text-app">
          <Icon name="wallet" size={22} />
        </span>
        <div className="min-w-0">
          <Caption className="text-fg-subtle">{text.startingBalance}</Caption>
          <p className="mt-1 font-mono text-3xl font-black text-fg tabular-nums">{formatMoney(contest.startingBalance, currency)}</p>
          <p className="text-[11px] text-fg-muted">{detail.startingBalanceNote}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Rule ledger ───────────── */

function RuleLedger({ rules }: { rules: ContestRule[] }) {
  return (
    <dl className="divide-y divide-dashed divide-line-strong">
      {rules.map((rule, index) => (
        <div key={rule.key} style={stagger(index, 60)} className="group zenith-tile relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5">
          <span aria-hidden="true" style={{ background: RED }} className="absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 scale-y-0 rounded-full transition-transform duration-300 group-hover:scale-y-100 motion-reduce:transition-none" />
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-fg/[0.06] text-fg transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none">
            <Icon name={rule.icon} size={14} />
          </span>
          <dt className="min-w-0 truncate text-sm text-fg-muted">{rule.label}</dt>
          <dd className="text-right text-sm font-black text-fg">
            {rule.isPill ? (
              <span className="inline-block rounded-full bg-fg px-2.5 py-0.5 text-xs text-app">{rule.value}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                {rule.value}
                {rule.hint && (
                  <span title={rule.hint} className="inline-grid size-4 cursor-help place-items-center text-fg-subtle hover:text-fg">
                    <Icon name="info" size={14} />
                    <span className="sr-only">{rule.hint}</span>
                  </span>
                )}
              </span>
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
    <section style={{ animationDelay: '120ms' }} className={cx(panelClass, 'zenith-tile flex flex-col gap-4 p-5 sm:p-6')}>
      <div role="tablist" aria-label={text.eligibilityTitle} className="grid grid-cols-2 gap-2">
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
                'group/tab relative flex min-w-0 items-center gap-3 rounded-[20px] p-3 text-left transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg',
              )}
            >
              <span
                style={isActive ? { background: RED } : undefined}
                className={cx('grid size-10 shrink-0 place-items-center rounded-[12px] transition-transform duration-300 group-hover/tab:-rotate-12', isActive ? 'text-white' : 'bg-fg/[0.06] text-fg')}
              >
                <Icon name={item.icon} size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-black">{item.label}</span>
              <span className={cx('grid h-6 min-w-6 place-items-center rounded-[8px] px-1.5 font-mono text-[11px] font-black', isActive ? 'bg-app/15' : 'bg-fg/[0.06] text-fg')}>{item.rules.length}</span>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
        {active.hint}
      </p>
      <div className="px-3">
        <RuleLedger key={active.id} rules={active.rules} />
      </div>
    </section>
  );
}

function TradingRulesPanel({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '200ms' }} className={cx(panelClass, 'zenith-tile flex flex-col gap-4 p-5 sm:p-6')}>
      <SectionHead icon="settings" title={text.tradingTitle} hint={text.tradingHint} />
      <div className="px-3">
        <RuleLedger rules={detail.tradingRules} />
      </div>
    </section>
  );
}

/* ───────────── Prize ladder (inverted) ───────────── */

function PrizeLadder({ prizes, footer }: { prizes: ContestPrize[]; footer?: ReactNode }) {
  const ordered = [...prizes].sort((a, b) => a.place - b.place);

  return (
    <section style={{ animationDelay: '200ms' }} className="zenith-tile relative flex flex-col gap-5 overflow-hidden rounded-[32px] bg-fg p-5 text-app sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:12px_12px] text-app/[0.12] [mask-image:linear-gradient(160deg,#000,transparent_60%)]"
      />
      <div className="relative">
        <SectionHead icon="trophy" title={text.prizeTitle} hint={text.prizeHint} inverted />
      </div>
      <ol className="relative flex flex-col gap-3">
        {ordered.map((prize, index) => {
          const isFirst = prize.place === 1;
          return (
            <li key={prize.place} style={stagger(index, 110, 300)} className="zenith-tile flex items-center gap-3">
              <span className={cx('relative grid shrink-0 place-items-center', isFirst ? 'size-12' : 'size-10')}>
                {isFirst && <span aria-hidden="true" style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[14px] opacity-50 motion-reduce:hidden" />}
                <span
                  style={isFirst ? { background: RED } : undefined}
                  className={cx('relative grid size-full place-items-center rounded-[14px] font-mono text-sm font-black tabular-nums', isFirst ? 'text-white' : 'text-app ring-1 ring-app/25')}
                >
                  {pad(prize.place)}
                </span>
              </span>
              <div className="min-w-0 shrink-0">
                <p className="flex items-center gap-1.5 text-sm font-black">
                  {prize.label}
                  {isFirst && <Icon name="trophy" size={13} className="text-app/60" />}
                </p>
                <span className="text-[9.5px] font-bold tracking-[0.18em] text-app/50">{prize.kind}</span>
              </div>
              <span aria-hidden="true" className="min-w-4 flex-1 border-b-2 border-dashed border-app/20" />
              <span className={cx('font-mono font-black tracking-tight tabular-nums', isFirst ? 'text-2xl' : 'text-base')}>{prize.amount}</span>
            </li>
          );
        })}
      </ol>
      {footer && <div className="relative mt-auto border-t border-dashed border-app/20 pt-4">{footer}</div>}
    </section>
  );
}

/* ───────────── Notes ledger ───────────── */

function NotesLedger({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '260ms' }} className={cx(panelClass, 'zenith-tile flex flex-col gap-4 p-5 sm:p-6')}>
      <SectionHead icon="info" title={text.notesTitle} hint={text.notesHint} />
      <ol className="divide-y divide-dashed divide-line-strong">
        {detail.notes.map((note, index) => (
          <li key={note.key} style={stagger(index, 80, 320)} className="group zenith-tile flex items-start gap-4 py-3.5">
            <span aria-hidden="true" className="w-10 shrink-0 font-mono text-3xl leading-none font-black tracking-tighter text-fg/15 transition-colors duration-300 group-hover:text-fg/40">
              {pad(index + 1)}
            </span>
            <Icon name={note.icon} size={15} className="mt-0.5 shrink-0 text-fg-muted" />
            <p className="min-w-0 text-sm text-fg">{note.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Entry checklist + register ───────────── */

function EntryChecklist({ contest, detail, isEnrolled, onEnroll }: { contest: DemoContest; detail: ContestDetail; isEnrolled: boolean; onEnroll: () => void }) {
  const isOpen = contest.registrationOpen;
  const canRegister = isOpen && !isEnrolled;

  return (
    <section style={{ animationDelay: '260ms' }} className={cx(panelClass, 'zenith-tile flex flex-col gap-4 p-5')}>
      <div>
        <p className="text-base font-black text-fg">{text.statusTitle}</p>
        <p className="text-xs text-fg-muted">{text.statusHint}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {detail.steps.map((step, index) => {
          const isDone = step.state === 'done';
          return (
            <li key={step.key} style={stagger(index, 120, 380)} className="zenith-tile flex items-start gap-3 rounded-[18px] p-2.5 ring-1 ring-line">
              <span className={cx('relative mt-0.5 grid size-7 shrink-0 place-items-center rounded-[9px] text-white', isDone ? 'bg-success' : 'bg-danger')}>
                {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-[9px] bg-danger/40 motion-reduce:hidden" />}
                <Icon name={isDone ? 'check' : 'close'} size={12} className="relative" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg">{step.title}</p>
                <p className="text-xs text-fg-muted">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={!canRegister}
        onClick={onEnroll}
        style={canRegister ? { background: RED } : undefined}
        className={cx(pillClass, 'mt-1 w-full', canRegister ? 'text-white' : 'bg-fg text-app')}
      >
        {canRegister && <Shine />}
        <span className="relative flex-1 text-left">{isEnrolled ? text.enrolled : text.register}</span>
        <span className={cx('relative grid size-9 place-items-center rounded-full', canRegister ? 'bg-white/20' : 'bg-app text-fg')}>
          <Icon name={isEnrolled ? 'checkCircle' : isOpen ? 'user' : 'lock'} size={15} />
        </span>
      </button>
    </section>
  );
}

/* ───────────── Enrolled: player scoreline ───────────── */

function PlayerScoreline({ entry }: { entry: LeaderboardEntry }) {
  const isDown = entry.returnPercent < 0;
  const segments: { icon: IconName; caption: string; value: string; hint: string; tone: string }[] = [
    { icon: 'trophy', caption: text.yourRank, value: `#${entry.rank}`, hint: text.currentStanding, tone: 'text-fg' },
    { icon: isDown ? 'trendDown' : 'trendUp', caption: text.yourReturn, value: `${returnFormat.format(entry.returnPercent)}%`, hint: text.performance, tone: isDown ? 'text-danger' : 'text-success' },
    { icon: 'wallet', caption: text.yourEquity, value: formatMoney(entry.equity, 'USD'), hint: text.totalAccountValue, tone: 'text-fg' },
  ];

  return (
    <section style={{ animationDelay: '160ms' }} className="zenith-tile grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
      <dl className={cx(panelClass, 'grid divide-y divide-dashed divide-line-strong overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:rounded-full')}>
        {segments.map((segment, index) => (
          <div key={segment.caption} style={stagger(index, 90, 220)} className="zenith-tile flex items-center gap-3 px-5 py-4 lg:px-6">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg">
              <Icon name={segment.icon} size={15} />
            </span>
            <div className="min-w-0">
              <dt className={cx(captionClass, 'truncate text-fg-subtle')}>{segment.caption}</dt>
              <dd className={cx('truncate font-mono text-2xl leading-tight font-black tracking-tight tabular-nums', segment.tone)}>{segment.value}</dd>
              <p className="truncate text-[11px] text-fg-muted">{segment.hint}</p>
            </div>
          </div>
        ))}
      </dl>
      <Link
        href="/platforms"
        style={{ background: RED }}
        className="group/trade relative flex items-center gap-3.5 overflow-hidden rounded-[28px] p-4 pr-5 text-white transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:rounded-full lg:pl-2"
      >
        <Shine />
        <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-white/20">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-white/25 motion-reduce:hidden" />
          <Icon name="trendUp" size={18} className="relative" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-base font-black">{text.startTrading}</p>
          <p className="text-xs text-white/75">{text.startTradingHint}</p>
        </div>
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-white/35 transition-transform duration-300 group-hover/trade:translate-x-1 group-hover/trade:-rotate-45 motion-reduce:transition-none">
          <Icon name="arrowRight" size={15} />
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
      className="group inline-flex items-center gap-2.5 self-start rounded-full py-1 pr-4 pl-1 text-sm font-bold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="grid size-8 place-items-center rounded-full bg-fg text-app">
        <Icon name="arrowLeft" size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {text.back}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-40 w-full max-w-2xl rounded-[28px]" />
        <Skeleton className="h-[22rem] rounded-[32px]" />
        <Skeleton className="h-32 rounded-[32px]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Skeleton className="h-80 rounded-[32px]" />
          <Skeleton className="h-80 rounded-[32px]" />
        </div>
      </div>
    );
  }

  const contest = data.contests.find((item) => item.id === contestId);
  if (!contest) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <div className="flex flex-col items-center gap-4 rounded-[32px] border border-dashed border-line-strong px-6 py-16 text-center">
          <span aria-hidden="true" className="relative grid size-24 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-[3px]" />
            </span>
            <span className="grid size-14 place-items-center rounded-[18px] bg-fg text-app">
              <Icon name="search" size={20} />
            </span>
          </span>
          <p className="text-base font-black text-fg">{text.notFound}</p>
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

  const top = (
    <>
      {backLink}
      <ContestHero contest={contest} isEnrolled={isEnrolled} onEnroll={handleEnroll} />
      <MissionClock contest={contest} detail={detail} now={now} />
      <Readouts contest={contest} detail={detail} currency={data.currency} />
    </>
  );

  if (isEnrolled) {
    const you = getLeaderboard(contest, true).find((entry) => entry.isYou);
    return (
      <div className="flex flex-col gap-6">
        {top}
        {you && <PlayerScoreline entry={you} />}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <TradingRulesPanel detail={detail} />
          <PrizeLadder
            prizes={detail.prizes}
            footer={
              <Link href={`/promotion/demo-contest/${contest.id}/leaderboard`} className={cx(pillClass, 'w-full bg-app text-fg')}>
                <Icon name="barChart" size={15} className="relative" />
                <span className="relative flex-1">{text.viewLeaderboard}</span>
                <span style={{ background: RED }} className="relative grid size-9 place-items-center rounded-full text-white">
                  <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover/pill:translate-x-0.5" />
                </span>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {top}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Rulebook detail={detail} />
          <NotesLedger detail={detail} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-24">
          <PrizeLadder prizes={detail.prizes} />
          <EntryChecklist contest={contest} detail={detail} isEnrolled={isEnrolled} onEnroll={handleEnroll} />
        </div>
      </div>
      {isRegisterOpen && (
        <ContestRegisterModal contest={contest} detail={detail} currency={data.currency} onConfirm={confirmRegistration} onClose={() => setIsRegisterOpen(false)} />
      )}
    </div>
  );
}
