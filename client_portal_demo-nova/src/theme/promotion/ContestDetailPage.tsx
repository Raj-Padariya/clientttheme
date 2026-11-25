'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useDemoContest, type ContestStatus, type DemoContest } from '@/core/pages/useDemoContest';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
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
const SEAT_CELLS = 30;
const DIAL_DOTS = 60;

const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const clockTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const inkPillClass =
  'group/ink relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full py-1.5 pr-1.5 pl-5 text-sm font-semibold transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none';

const statusChip: Record<ContestStatus, string> = {
  active: 'bg-[#0f8a4f] text-white',
  upcoming: 'bg-[#1f5fbf] text-white',
  completed: 'bg-[#0a1220]/45 text-white',
};
const statusKey = { active: 'contest.statusActive', upcoming: 'contest.statusUpcoming', completed: 'contest.statusCompleted' } as const satisfies Record<ContestStatus, string>;

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
  return <p className={cx('text-[10.5px] font-semibold tracking-[0.14em] uppercase', className)}>{children}</p>;
}

function ShineSweep() {
  return <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />;
}

function SectionHead({ icon, title, hint, aside }: { icon: IconName; title: string; hint: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
          <span className="nova-gloss grid size-8 place-items-center rounded-full text-fg">
            <Icon name={icon} size={14} />
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-fg">{title}</h2>
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
    <svg viewBox="0 0 140 36" className="h-9 w-32" aria-hidden="true">
      <path d="M0 18 H140" strokeWidth="1" className="stroke-white/15" />
      <path d="M0 18 H44 L50 6 L57 30 L63 12 L68 18 H140" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="0.25 1" className="stroke-danger">
        <animate attributeName="stroke-dashoffset" values="0.25;-1" dur="2.6s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** Seats as a dot matrix; any participant lights at least one dot so a started contest never looks empty. */
function SeatMatrix({ participants, max, filledPercent }: { participants: number; max: number; filledPercent: number }) {
  const isMounted = useMounted();
  const share = max === 0 ? 0 : participants / max;
  const litCells = participants > 0 ? Math.max(1, Math.round(share * SEAT_CELLS)) : 0;

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Caption className="text-[#3b4658]">{text.participants}</Caption>
          <p className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-mono text-3xl font-black">{participants}</span>
            <span className="text-sm font-semibold text-[#3b4658]">/ {max}</span>
          </p>
        </div>
        <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-bold', frostChipClass)}>{text.filled(filledPercent)}</span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
        {Array.from({ length: SEAT_CELLS }, (_, index) => (
          <span
            key={index}
            style={{ transitionDelay: `${300 + index * 30}ms` }}
            className={cx('aspect-square rounded-full transition-colors duration-500 motion-reduce:transition-none', isMounted && index < litCells ? 'bg-[#0a1220]' : 'bg-[#0a1220]/12')}
          />
        ))}
      </div>
    </div>
  );
}

function CountdownDial({ remaining }: { remaining: number }) {
  const hasEnded = remaining === 0;
  const seconds = Math.floor((remaining % MINUTE_MS) / 1000);
  const timer = [
    { label: text.hrs, value: Math.floor((remaining % DAY_MS) / HOUR_MS) },
    { label: text.min, value: Math.floor((remaining % HOUR_MS) / MINUTE_MS) },
    { label: text.sec, value: seconds },
  ];

  return (
    <section className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[30px] bg-[#0a1220] p-5 text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 motion-reduce:animate-none">
      <div className="flex items-center justify-between gap-4">
        <Caption className="text-white/55">{text.daysLeft}</Caption>
        <Caption className="flex items-center gap-1.5 text-white/55">
          <span className={cx('size-1.5 animate-blink rounded-full motion-reduce:animate-none', hasEnded ? 'bg-danger' : 'bg-success')} />
          {text.liveTimer}
        </Caption>
      </div>

      <div className="relative mx-auto grid aspect-square w-full max-w-[14rem] place-items-center">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90">
          {Array.from({ length: DIAL_DOTS }, (_, index) => {
            const angle = (index / DIAL_DOTS) * 2 * Math.PI;
            const isMajor = index % 5 === 0;
            const isLit = !hasEnded && index < seconds;
            return (
              <circle
                key={index}
                cx={100 + 90 * Math.cos(angle)}
                cy={100 + 90 * Math.sin(angle)}
                r={isMajor ? 3.2 : 2}
                className={cx('transition-[fill] duration-300', isLit ? 'fill-white' : 'fill-white/15')}
              />
            );
          })}
        </svg>
        <span aria-hidden="true" className="absolute inset-[18%] rounded-full border border-dashed border-white/15" />
        <div className="relative flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-6xl leading-none font-black tabular-nums">{pad(Math.floor(remaining / DAY_MS))}</span>
          <span className="text-[10px] font-semibold tracking-[0.14em] text-white/55">{text.daysRemaining}</span>
        </div>
      </div>

      {hasEnded ? (
        <div className="flex flex-col items-center gap-1">
          <Flatline />
          <p className="flex items-center gap-1.5 text-lg font-bold text-danger">
            <span className="size-2 animate-blink rounded-full bg-danger motion-reduce:animate-none" />
            {text.ended}
          </p>
        </div>
      ) : (
        <div role="timer" aria-label={timer.map((unit) => `${pad(unit.value)} ${unit.label}`).join(' ')} className="grid grid-cols-3 gap-2">
          {timer.map((unit) => (
            <div key={unit.label} className="flex flex-col items-center gap-1 rounded-full bg-white/[0.06] py-2.5 ring-1 ring-white/10">
              <span className="font-mono text-2xl leading-none font-black tabular-nums">{pad(unit.value)}</span>
              <span className="text-[9.5px] font-semibold tracking-[0.14em] text-white/50">{unit.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
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
  const filledPercent = detail.maxParticipants === 0 ? 0 : Math.round((detail.participants / detail.maxParticipants) * 100);

  let heroAction: ReactNode;
  if (isEnrolled) {
    heroAction = (
      <span className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0f8a4f] px-5 text-sm font-semibold text-white">
        <Icon name="checkCircle" size={15} />
        {text.enrolled}
      </span>
    );
  } else if (contest.registrationOpen) {
    heroAction = (
      <button type="button" onClick={onEnroll} className={cx(inkPillClass, 'bg-[#0a1220] text-white')}>
        <ShineSweep />
        <span className="relative">{text.joinContest}</span>
        <span className="relative grid size-9 place-items-center rounded-full bg-white text-[#0a1220] transition-transform duration-300 group-hover/ink:scale-110 motion-reduce:transition-none">
          <Icon name="user" size={15} />
        </span>
      </button>
    );
  } else {
    heroAction = (
      <span className={cx('inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold', frostChipClass)}>
        <Icon name="lock" size={15} />
        {text.registrationClosed}
      </span>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-stretch">
      <div className="flex min-w-0 animate-rise motion-reduce:animate-none [&>*]:w-full">
        <FrostCard>
          <div className="flex h-full flex-col gap-6 text-[#0a1220] sm:p-2">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase', statusChip[contest.status])}>
                  {contest.status === 'active' && <span className="size-1.5 animate-blink rounded-full bg-white motion-reduce:animate-none" />}
                  {translate(statusKey[contest.status])}
                </span>
                {contest.registrationOpen && (
                  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', frostChipClass)}>
                    <span className="relative grid size-2 place-items-center">
                      <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-[#0f8a4f]/50 motion-reduce:hidden" />
                      <span className="relative size-1.5 rounded-full bg-[#0f8a4f]" />
                    </span>
                    {text.registrationOpen}
                  </span>
                )}
                <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#3b4658]">#{contest.id}</span>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-[-0.03em] capitalize sm:text-5xl">{contest.name}</h1>
                <p className="mt-1 text-sm text-[#3b4658]">{contest.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className={cx('inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-xs font-semibold', frostChipClass)}>
                  <span className="grid size-6 place-items-center rounded-full bg-[#0a1220] text-white">
                    <Icon name="calendar" size={11} />
                  </span>
                  {longDate.format(Date.parse(contest.startsAt))}
                  <span aria-hidden="true" className="w-6 border-t-2 border-dotted border-[#0a1220]/35" />
                  {longDate.format(endsAt)}
                </p>
                {heroAction}
              </div>
            </div>

            <div className="mt-auto grid gap-5 border-t-2 border-dotted border-[#0a1220]/15 pt-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:items-end">
              <SeatMatrix participants={detail.participants} max={detail.maxParticipants} filledPercent={filledPercent} />
              <div className="flex items-center gap-3.5">
                <span className="relative grid size-14 shrink-0 place-items-center">
                  <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/30 motion-reduce:animate-none" />
                  <span className="grid size-10 place-items-center rounded-full bg-[#0a1220] text-white">
                    <Icon name="trophy" size={17} className="animate-float motion-reduce:animate-none" />
                  </span>
                </span>
                <div className="min-w-0">
                  <Caption className="text-[#3b4658]">{text.prizePool}</Caption>
                  <p className="font-mono text-2xl font-black tracking-tight tabular-nums">{formatMoney(detail.prizePool, currency)}</p>
                  <p className="text-[11px] font-medium text-[#3b4658]">{text.totalPrizePool}</p>
                </div>
              </div>
            </div>
          </div>
        </FrostCard>
      </div>

      <CountdownDial remaining={remaining} />
    </div>
  );
}

function RuleTiles({ rules }: { rules: ContestRule[] }) {
  return (
    <dl className="grid gap-2.5 sm:grid-cols-2">
      {rules.map((rule, index) => (
        <div
          key={rule.key}
          style={{ animationDelay: `${index * 60}ms` }}
          className="group flex animate-feed-in items-center gap-3 rounded-[22px] p-3 ring-1 ring-line transition-[box-shadow] hover:ring-line-strong motion-reduce:animate-none"
        >
          <span aria-hidden="true" className="nova-gloss grid size-10 shrink-0 place-items-center rounded-full text-fg transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
            <Icon name={rule.icon} size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="truncate text-xs text-fg-muted">{rule.label}</dt>
            <dd className="mt-0.5 text-sm font-bold text-fg">
              {rule.isPill ? (
                <span className="inline-block rounded-full bg-fg px-2.5 py-0.5 text-xs text-app">{rule.value}</span>
              ) : (
                <>
                  {rule.value}
                  {rule.hint && (
                    <span title={rule.hint} className="ml-1.5 inline-grid size-4 cursor-help place-items-center align-middle text-fg-subtle hover:text-fg">
                      <Icon name="info" size={14} />
                      <span className="sr-only">{rule.hint}</span>
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
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
  const activeIndex = tabs.indexOf(active);

  return (
    <section style={{ animationDelay: '120ms' }} className="orbit-card nova-edge-light flex animate-rise flex-col gap-4 p-5 motion-reduce:animate-none sm:p-6">
      <div role="tablist" aria-label={text.eligibilityTitle} className="relative grid w-full grid-cols-2 rounded-full p-1 ring-1 ring-line sm:w-fit">
        <span
          aria-hidden="true"
          className={cx('absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-fg transition-transform duration-500 ease-out motion-reduce:transition-none', activeIndex === 1 && 'translate-x-full')}
        />
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
                'relative z-10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Icon name={item.icon} size={14} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-fg/40" />
        {active.hint}
      </p>
      <RuleTiles key={active.id} rules={active.rules} />
    </section>
  );
}

function TradingRulesPanel({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '200ms' }} className="orbit-card nova-edge-light flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6">
      <SectionHead icon="settings" title={text.tradingTitle} hint={text.tradingHint} />
      <RuleTiles rules={detail.tradingRules} />
    </section>
  );
}

function PrizeReceipt({ prizes, footer }: { prizes: ContestPrize[]; footer?: ReactNode }) {
  const ordered = [...prizes].sort((a, b) => a.place - b.place);

  return (
    <section style={{ animationDelay: '200ms' }} className="orbit-card nova-edge-light flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6">
      <SectionHead icon="trophy" title={text.prizeTitle} hint={text.prizeHint} />
      <ol className="flex flex-col gap-3.5">
        {ordered.map((prize, index) => {
          const isFirst = prize.place === 1;
          return (
            <li key={prize.place} style={{ animationDelay: `${300 + index * 120}ms` }} className="flex animate-feed-in items-center gap-3 motion-reduce:animate-none">
              <span className={cx('relative grid shrink-0 place-items-center', isFirst ? 'size-12' : 'size-10')}>
                {isFirst && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
                <span className={cx('grid size-full place-items-center rounded-full font-mono text-sm font-black tabular-nums', isFirst ? 'bg-fg text-app' : 'nova-gloss text-fg')}>{pad(prize.place)}</span>
              </span>
              <div className="min-w-0 shrink-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-fg">
                  {prize.label}
                  {isFirst && <Icon name="trophy" size={13} className="text-fg-muted" />}
                </p>
                <span className="text-[9.5px] font-bold tracking-[0.18em] text-fg-subtle">{prize.kind}</span>
              </div>
              <span aria-hidden="true" className="min-w-4 flex-1 border-b-2 border-dotted border-line-strong" />
              <span className={cx('font-mono font-black tracking-tight tabular-nums', isFirst ? 'text-xl text-fg' : 'text-base text-fg')}>{prize.amount}</span>
            </li>
          );
        })}
      </ol>
      {footer && <div className="mt-auto border-t border-dotted border-line-strong pt-4">{footer}</div>}
    </section>
  );
}

function NotesSpine({ detail }: { detail: ContestDetail }) {
  return (
    <section style={{ animationDelay: '280ms' }} className="orbit-card nova-edge-light flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6">
      <SectionHead icon="info" title={text.notesTitle} hint={text.notesHint} />
      <ol className="relative flex flex-col gap-3">
        <span aria-hidden="true" className="absolute top-4 bottom-4 left-4 border-l-2 border-dotted border-line-strong" />
        {detail.notes.map((note, index) => (
          <li key={note.key} style={{ animationDelay: `${360 + index * 80}ms` }} className="relative flex animate-feed-in items-start gap-3 motion-reduce:animate-none">
            <span aria-hidden="true" className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-fg font-mono text-[11px] font-black text-app ring-4 ring-surface">
              {pad(index + 1)}
            </span>
            <div className="flex min-w-0 flex-1 items-start gap-2.5 rounded-[18px] px-3.5 py-2.5 ring-1 ring-line">
              <Icon name={note.icon} size={15} className="mt-0.5 shrink-0 text-fg-muted" />
              <p className="text-sm text-fg">{note.text}</p>
            </div>
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
    <aside style={{ animationDelay: '160ms' }} className="orbit-card nova-edge-light flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none xl:sticky xl:top-24">
      <div className="relative overflow-hidden rounded-[24px] bg-[#0a1220] p-4 text-white ring-1 ring-white/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(135deg,transparent_35%,#000)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#0a1220]">
            <Icon name="wallet" size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-white/60">{text.startingBalance}</p>
            <p className="font-mono text-2xl font-black tabular-nums">{formatMoney(contest.startingBalance, currency)}</p>
            <p className="text-[11px] text-white/50">{detail.startingBalanceNote}</p>
          </div>
        </div>
      </div>

      <ol className="relative flex flex-col gap-5">
        <span aria-hidden="true" className="absolute top-4 bottom-4 left-4 border-l-2 border-dotted border-line-strong" />
        <span
          aria-hidden="true"
          className="absolute top-4 left-4 border-l-2 border-fg"
          style={{ height: isMounted ? `calc((100% - 2rem) * ${progress})` : '0px', transition: 'height 1600ms cubic-bezier(.2,.7,.2,1) 300ms' }}
        />
        {milestones.map((milestone, index) => {
          const isPassed = now >= Date.parse(milestone.iso);
          return (
            <li key={milestone.key} style={{ animationDelay: `${240 + index * 120}ms` }} className="relative flex animate-feed-in items-start gap-3 motion-reduce:animate-none">
              <span className={cx('relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-surface', isPassed ? 'bg-fg text-app' : 'nova-gloss text-fg-subtle')}>
                {isPassed && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-fg/25 motion-reduce:hidden" style={{ animationDelay: `${index * 0.8}s` }} />}
                <Icon name={milestone.icon} size={13} className="relative" />
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

      <div className="flex flex-col gap-3 border-t border-dotted border-line-strong pt-4">
        <div>
          <p className="text-sm font-bold text-fg">{text.statusTitle}</p>
          <p className="text-xs text-fg-muted">{text.statusHint}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {detail.steps.map((step, index) => {
            const isDone = step.state === 'done';
            return (
              <li
                key={step.key}
                style={{ animationDelay: `${400 + index * 140}ms` }}
                className={cx('flex animate-feed-in items-start gap-3 rounded-[18px] p-2.5 motion-reduce:animate-none', isDone ? 'bg-success/[0.07]' : 'bg-danger/[0.07]')}
              >
                <span className={cx('relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white', isDone ? 'bg-success' : 'bg-danger')}>
                  {!isDone && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-danger/40 motion-reduce:hidden" />}
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
        <button type="button" disabled={!isOpen || isEnrolled} onClick={onEnroll} className={cx(inkPillClass, 'mt-1 w-full bg-fg text-app')}>
          {isOpen && !isEnrolled && <ShineSweep />}
          <span className="relative flex-1 text-left">{isEnrolled ? text.enrolled : text.register}</span>
          <span className="relative grid size-9 place-items-center rounded-full bg-app text-fg">
            <Icon name={isEnrolled ? 'checkCircle' : isOpen ? 'user' : 'lock'} size={15} />
          </span>
        </button>
      </div>
    </aside>
  );
}

const returnFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });

function ScoreBead({ icon, caption, value, hint, tone, delay }: { icon: IconName; caption: string; value: string; hint: string; tone: string; delay: number }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="orbit-card nova-edge-light flex animate-rise items-center gap-3.5 p-4 motion-reduce:animate-none">
      <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
        <span className="nova-gloss grid size-10 place-items-center rounded-full text-fg">
          <Icon name={icon} size={16} />
        </span>
      </span>
      <div className="min-w-0">
        <Caption className="text-fg-subtle">{caption}</Caption>
        <p className={cx('truncate font-mono text-2xl font-black tracking-tight tabular-nums', tone)}>{value}</p>
        <p className="truncate text-xs text-fg-muted">{hint}</p>
      </div>
    </div>
  );
}

function PlayerScorecard({ entry }: { entry: LeaderboardEntry }) {
  const returnTone = entry.returnPercent < 0 ? 'text-danger' : 'text-success';
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ScoreBead icon="trophy" caption={text.yourRank} value={`#${entry.rank}`} hint={text.currentStanding} tone="text-fg" delay={80} />
      <ScoreBead icon={entry.returnPercent < 0 ? 'trendDown' : 'trendUp'} caption={text.yourReturn} value={`${returnFormat.format(entry.returnPercent)}%`} hint={text.performance} tone={returnTone} delay={140} />
      <ScoreBead icon="wallet" caption={text.yourEquity} value={formatMoney(entry.equity, 'USD')} hint={text.totalAccountValue} tone="text-fg" delay={200} />
      <Link
        href="/platforms"
        style={{ animationDelay: '260ms' }}
        className="group/trade relative flex animate-rise items-center gap-3.5 overflow-hidden rounded-[28px] bg-[#0a1220] p-4 text-white ring-1 ring-white/10 transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(90deg,transparent,#000)]" />
        <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#0a1220]">
          <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-white/30 motion-reduce:hidden" />
          <Icon name="trendUp" size={18} className="relative" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-base font-bold">{text.startTrading}</p>
          <p className="text-xs text-white/60">{text.startTradingHint}</p>
        </div>
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-white/25 transition-transform duration-300 group-hover/trade:translate-x-1 group-hover/trade:-rotate-45 motion-reduce:transition-none">
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
      className="group inline-flex items-center gap-2.5 self-start rounded-full py-1 pr-4 pl-1 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="nova-gloss grid size-8 place-items-center rounded-full text-fg">
        <Icon name="arrowLeft" size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {text.back}
    </Link>
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-[24rem] rounded-[30px]" />
          <Skeleton className="h-[24rem] rounded-[30px]" />
        </div>
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
        <div className="orbit-card nova-edge-light flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span aria-hidden="true" className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 15 }, (_, dot) => (
              <span key={dot} style={{ animationDelay: `${dot * 40}ms` }} className={cx('size-2 animate-dot-pop rounded-full motion-reduce:animate-none', dot === 7 ? 'bg-fg/60' : 'bg-fg/12')} />
            ))}
          </span>
          <span className="nova-gloss grid size-12 animate-float place-items-center rounded-full text-fg motion-reduce:animate-none">
            <Icon name="search" size={20} />
          </span>
          <p className="text-base font-bold text-fg">{text.notFound}</p>
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
          <PrizeReceipt
            prizes={detail.prizes}
            footer={
              <Link href={`/promotion/demo-contest/${contest.id}/leaderboard`} className={cx(inkPillClass, 'w-full bg-fg text-app')}>
                <ShineSweep />
                <Icon name="barChart" size={15} className="relative" />
                <span className="relative flex-1">{text.viewLeaderboard}</span>
                <span className="relative grid size-9 place-items-center rounded-full bg-app text-fg">
                  <Icon name="arrowRight" size={14} className="transition-transform duration-200 group-hover/ink:translate-x-0.5" />
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
      {backLink}
      {hero}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Rulebook detail={detail} />
          <div className="grid gap-6 lg:grid-cols-2">
            <PrizeReceipt prizes={detail.prizes} />
            <NotesSpine detail={detail} />
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
