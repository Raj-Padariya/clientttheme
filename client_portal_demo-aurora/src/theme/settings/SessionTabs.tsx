'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';

import { Icon } from '../ui/Icon';
import { Select } from '../ui/Input';
import { ChangePasswordModal } from './ChangePasswordModal';
import { StatusStamp } from './SettingsParts';
import {
  accountActivities,
  activitiesCopy,
  activityStatusOptions,
  activityTypeOptions,
  dateRangeOptions,
  securityCopy,
  sessionsCopy,
  type LoginSession,
} from './settingsData';

interface SessionsProps {
  sessions: LoginSession[];
  onRevoke: (id: string) => void;
}

interface ActivityFilters {
  type: (typeof activityTypeOptions)[number];
  days: number;
  status: (typeof activityStatusOptions)[number];
}

const DEFAULT_FILTERS: ActivityFilters = { type: 'All Activities', days: 30, status: 'All Status' };

const RED = 'var(--aurora-cta-from)';
const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';

function CurrentSession({ session }: { session: LoginSession }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[28px] bg-fg p-4 text-app">
      <span className="relative grid size-14 shrink-0 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-app/30 motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
          <span style={{ background: RED }} className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-[2px]" />
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-app text-fg">
          <Icon name="monitor" size={19} />
        </span>
        <span className="absolute right-0 bottom-0 grid size-4 place-items-center rounded-full bg-fg">
          <LiveDot />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-base font-black">
          {session.device}
          <span style={{ background: RED }} className="rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide text-white">
            {sessionsCopy.currentBadge}
          </span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-app/65">
          <span className="flex items-center gap-1">
            <Icon name="globe" size={12} />
            {session.location}
          </span>
          <span className="font-mono text-[11px]">{session.ip}</span>
        </p>
      </div>
      <span className="flex items-center gap-2 rounded-full bg-app/10 py-1 pr-3 pl-1 text-xs font-bold">
        <span aria-hidden="true" className="flex h-4 items-end gap-0.5 rounded-full bg-app px-1.5 py-1">
          {[0, 1, 2].map((bar) => (
            <span key={bar} style={{ animationDelay: `${bar * 150}ms`, background: RED }} className="zenith-bar h-full w-0.5 rounded-full" />
          ))}
        </span>
        {sessionsCopy.activeNow}
      </span>
    </div>
  );
}

function SessionRow({ session, index, onRevoke }: { session: LoginSession; index: number; onRevoke: (id: string) => void }) {
  return (
    <li style={{ animationDelay: `${index * 60}ms` }} className="group flex animate-feed-in flex-wrap items-center gap-x-4 gap-y-2 rounded-[26px] bg-fg/[0.03] p-2 pr-3 ring-1 ring-line transition-[box-shadow,translate] hover:translate-x-0.5 hover:ring-line-strong motion-reduce:animate-none">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-fg/10 text-fg-muted transition-colors duration-300 group-hover:bg-fg group-hover:text-app">
        <Icon name="monitor" size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-fg">{session.device}</p>
        <p className="flex items-center gap-1 truncate text-xs text-fg-muted">
          <Icon name="globe" size={11} className="shrink-0 text-fg-subtle" />
          <span className="truncate">{session.location}</span>
        </p>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-[11px] text-fg-muted">{session.ip}</span>
        <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <Icon name="clock" size={11} />
          {sessionsCopy.lastActivityPrefix} {session.lastActivity}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRevoke(session.id)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97]"
      >
        <Icon name="logout" size={13} />
        {sessionsCopy.logout}
      </button>
    </li>
  );
}

function SessionsPanel({ sessions, onRevoke }: SessionsProps) {
  const current = sessions.find((session) => session.current);
  const others = sessions.filter((session) => !session.current);

  return (
    <section style={staggerStyle(3, 120)} className="flex min-w-0 animate-rise flex-col gap-4 rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6 motion-reduce:animate-none">
      <header className="flex flex-wrap items-end gap-4">
        <span className="font-mono text-5xl leading-[0.8] font-black tracking-tighter text-fg tabular-nums">{sessions.length}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-fg">
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-fg text-app">
              <Icon name="monitor" size={13} />
            </span>
            {sessionsCopy.heading}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">{sessionsCopy.description}</p>
        </div>
        <span aria-hidden="true" className="flex gap-1 pb-1">
          {sessions.map((session) => (
            <span key={session.id} style={session.current ? { background: RED } : undefined} className={cx('h-5 w-2 rounded-full', !session.current && 'bg-fg/25')} />
          ))}
        </span>
      </header>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
        <span className="h-px flex-1 bg-line" />
      </span>
      {current && <CurrentSession session={current} />}
      {others.length > 0 && (
        <ul className="flex flex-col gap-2">
          {others.map((session, index) => (
            <SessionRow key={session.id} session={session} index={index} onRevoke={onRevoke} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterSelect<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className={cx(eyebrow, 'flex items-center gap-1.5 text-fg-subtle')}>
        <span aria-hidden="true" className="size-1.5 rounded-[2px] bg-fg/40" />
        {label}
      </label>
      <Select
        id={id}
        value={String(value)}
        onChange={(event) => {
          const match = options.find((option) => String(option.value) === event.target.value);
          if (match) onChange(match.value);
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ActivitiesTab({ sessions, onRevoke }: SessionsProps) {
  const [draft, setDraft] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(accountActivities[0]?.id ?? null);

  const visibleActivities = accountActivities.filter(
    (activity) =>
      (applied.type === 'All Activities' || activity.title === applied.type) &&
      (applied.status === 'All Status' || activity.status === 'SUCCESS') &&
      activity.daysAgo <= applied.days,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.02em] text-fg">{activitiesCopy.heading}</h2>
          <p className="mt-1 text-sm text-fg-muted">{activitiesCopy.subtitle}</p>
        </div>
        <span className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <StatusStamp tone="success">
            {visibleActivities.length} {activitiesCopy.countSuffix}
          </StatusStamp>
          Showing {visibleActivities.length} of {accountActivities.length} activities
        </span>
      </header>

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start">
        <form
          aria-label={activitiesCopy.filtersHeading}
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(draft);
          }}
          className="flex animate-rise flex-col gap-4 rounded-[30px] border border-dashed border-line-strong p-5 xl:sticky xl:top-24 motion-reduce:animate-none"
        >
          <p className="flex items-center gap-2.5 text-base font-black text-fg">
            <span style={{ background: RED }} className="grid size-9 place-items-center rounded-full text-white">
              <Icon name="filter" size={14} />
            </span>
            {activitiesCopy.filtersHeading}
          </p>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            <span style={{ background: RED }} className="h-0.5 w-6 rounded-full" />
            <span className="h-px flex-1 bg-line" />
          </span>
          <FilterSelect
            id="activity-type"
            label={activitiesCopy.activityType}
            value={draft.type}
            options={activityTypeOptions.map((option) => ({ label: option, value: option }))}
            onChange={(type) => setDraft((current) => ({ ...current, type }))}
          />
          <FilterSelect
            id="activity-range"
            label={activitiesCopy.dateRange}
            value={draft.days}
            options={dateRangeOptions.map((option) => ({ label: option.label, value: option.days }))}
            onChange={(days) => setDraft((current) => ({ ...current, days }))}
          />
          <FilterSelect
            id="activity-status"
            label={activitiesCopy.status}
            value={draft.status}
            options={activityStatusOptions.map((option) => ({ label: option, value: option }))}
            onChange={(status) => setDraft((current) => ({ ...current, status }))}
          />
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-between gap-2 rounded-full bg-fg py-1.5 pr-1.5 pl-4 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none"
            >
              {activitiesCopy.apply}
              <span style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white">
                <Icon name="check" size={14} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(DEFAULT_FILTERS);
                setApplied(DEFAULT_FILTERS);
              }}
              className="inline-flex h-11 items-center rounded-full bg-fg/[0.03] px-4 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
            >
              {activitiesCopy.cancel}
            </button>
          </div>
        </form>

        <section style={staggerStyle(1, 120)} className="flex min-w-0 animate-rise flex-col gap-4 rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6 motion-reduce:animate-none">
          <h3 className="flex items-end gap-3 text-lg font-black tracking-tight text-fg">
            <span className="font-mono text-5xl leading-[0.8] tracking-tighter tabular-nums">{String(visibleActivities.length).padStart(2, '0')}</span>
            <span className="flex items-center gap-2 pb-0.5">
              <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-fg text-app">
                <Icon name="history" size={13} />
              </span>
              {activitiesCopy.recentHeading}
            </span>
          </h3>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
            <span className="h-px flex-1 bg-line" />
          </span>

          {visibleActivities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[26px] border border-dashed border-line-strong px-4 py-8 text-center">
              <span aria-hidden="true" className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, dot) => (
                  <span
                    key={dot}
                    style={{ animationDelay: `${((dot * 3) % 10) * 140}ms`, ...(dot === 7 ? { background: RED } : {}) }}
                    className={cx('zenith-twinkle size-3 rounded-[3px]', dot !== 7 && 'bg-fg/15')}
                  />
                ))}
              </span>
              <p className="text-sm text-fg-muted">Showing 0 of {accountActivities.length} activities</p>
            </div>
          ) : (
            <ol className="relative flex flex-col gap-3">
              <span aria-hidden="true" className="absolute top-5 bottom-5 left-[1.075rem] w-0.5 rounded-full bg-line" />
              {visibleActivities.map((activity, index) => {
                const expanded = expandedId === activity.id;
                return (
                  <li key={activity.id} style={{ animationDelay: `${index * 80}ms` }} className="relative grid animate-feed-in grid-cols-[2.25rem_minmax(0,1fr)] gap-3 motion-reduce:animate-none">
                    <span
                      aria-hidden="true"
                      style={expanded ? { background: RED } : undefined}
                      className={cx('relative z-10 mt-3 grid size-9 place-items-center rounded-full ring-4 ring-app transition-colors duration-300', expanded ? 'text-white' : 'bg-success text-white')}
                    >
                      <Icon name="check" size={13} />
                    </span>
                    <div className={cx('min-w-0 rounded-[26px] ring-1 transition-[background-color,box-shadow] duration-300', expanded ? 'bg-fg/[0.05] ring-line-strong' : 'ring-line hover:ring-line-strong')}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : activity.id)}
                        className="flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-fg">{activity.title}</span>
                          <span className="block truncate text-xs text-fg-muted">{activity.detail}</span>
                        </span>
                        <span className="hidden shrink-0 font-mono text-[11px] text-fg-subtle sm:block">{activity.timeAgo}</span>
                        <span className="hidden sm:block">
                          <StatusStamp tone="success">{activity.status}</StatusStamp>
                        </span>
                        <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-[rotate,box-shadow] duration-300', expanded ? 'rotate-45 text-fg ring-fg/40' : 'text-fg-subtle ring-line')}>
                          <Icon name="plus" size={12} />
                        </span>
                      </button>
                      <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                        <div className="min-h-0 overflow-hidden" inert={!expanded}>
                          <p className="px-4 pb-2 font-mono text-[11px] text-fg-subtle sm:hidden">{activity.timeAgo}</p>
                          <dl className="mx-4 mb-4 flex flex-col gap-2 border-t border-line pt-3">
                            {[
                              { label: activitiesCopy.ipAddress, value: activity.ip, icon: 'globe' as const, mono: true },
                              { label: activitiesCopy.location, value: activity.location, icon: 'compass' as const, mono: false },
                              { label: activitiesCopy.device, value: activity.device, icon: 'monitor' as const, mono: false },
                            ].map((item) => (
                              <div key={item.label} className="flex items-end gap-2">
                                <dt className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                                  <Icon name={item.icon} size={13} className="text-fg-subtle" />
                                  {item.label}
                                </dt>
                                <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b border-dotted border-line-strong" />
                                <dd className={cx('min-w-0 truncate text-xs font-bold text-fg', item.mono && 'font-mono')}>{item.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <SessionsPanel sessions={sessions} onRevoke={onRevoke} />
    </div>
  );
}

const PASSWORD_MASK_LENGTH = 12;

export function SecurityTab({ sessions, onRevoke }: SessionsProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordModal open={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="flex animate-rise flex-col gap-5 rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6 motion-reduce:animate-none">
          <div className="flex w-full items-center justify-between gap-3">
            <p className={cx(eyebrow, 'text-fg-subtle')}>{securityCopy.passwordHeading}</p>
            <StatusStamp tone="success">
              <Icon name="checkCircle" size={11} />
              {securityCopy.verified}
            </StatusStamp>
          </div>

          {/* Password as a capsule of masked pixels that light up one by one, with the lock at the end. */}
          <div aria-hidden="true" className="flex h-16 items-center gap-2 rounded-full bg-fg py-2 pr-2 pl-4">
            <span className="flex min-w-0 flex-1 items-center justify-between gap-1">
              {Array.from({ length: PASSWORD_MASK_LENGTH }, (_, index) => (
                <span
                  key={index}
                  style={{ animationDelay: `${index * 110}ms`, ...(index === PASSWORD_MASK_LENGTH - 1 ? { background: RED } : {}) }}
                  className={cx('zenith-twinkle size-2.5 shrink-0 rounded-[3px] sm:size-3', index !== PASSWORD_MASK_LENGTH - 1 && 'bg-app')}
                />
              ))}
            </span>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success text-white">
              <Icon name="lock" size={20} />
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Icon name="clock" size={12} className="text-fg-subtle" />
            {securityCopy.lastChanged}
          </p>

          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="group/ink mt-auto inline-flex h-12 w-full items-center gap-3 rounded-full bg-fg py-2 pr-2 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="flex-1 text-left">{securityCopy.changePassword}</span>
            <span style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white transition-transform duration-500 group-hover/ink:rotate-180 motion-reduce:transition-none">
              <Icon name="refresh" size={14} />
            </span>
          </button>
        </section>

        <section style={staggerStyle(1, 120)} className="flex min-w-0 animate-rise flex-col gap-4 rounded-[32px] border border-dashed border-line-strong p-5 sm:p-6 motion-reduce:animate-none">
          <header className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-fg text-app">
              <Icon name="bolt" size={14} />
            </span>
            <h2 className="text-xl font-black tracking-tight text-fg">{securityCopy.apiHeading}</h2>
          </header>
          <p className="text-sm leading-relaxed text-fg-muted">
            {securityCopy.apiIntroBefore}{' '}
            <code className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-xs font-semibold text-fg ring-1 ring-line">{securityCopy.apiCodeAccount}</code>{' '}
            {securityCopy.apiIntroMiddle}{' '}
            <code className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-xs font-semibold text-fg ring-1 ring-line">{securityCopy.apiCodeHeader}</code>{' '}
            {securityCopy.apiIntroAfter}
          </p>

          <div className="mt-auto overflow-hidden rounded-[26px] bg-[#0b0b0c] text-white ring-1 ring-white/10">
            <div aria-hidden="true" className="flex items-center gap-1.5 px-4 pt-3.5">
              <span style={{ background: RED }} className="size-2.5 rounded-[3px]" />
              <span className="size-2.5 rounded-[3px] bg-white/25" />
              <span className="size-2.5 rounded-[3px] bg-white/12" />
              <span className="ml-2 h-px flex-1 bg-white/12" />
            </div>
            <div aria-hidden="true" className="flex flex-col gap-1 px-4 py-4 font-mono text-xs blur-[3px] select-none">
              <span>
                <span className="text-white/80">X-API-Key:</span> <span className="text-white/40">tc_live_{'•'.repeat(22)}</span>
              </span>
            </div>
            <div className="mx-3 mb-3 flex items-start gap-3 rounded-[18px] bg-white/[0.05] px-3 py-3 ring-1 ring-white/10">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">
                <Icon name="lock" size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold">{securityCopy.apiDisabledTitle}</p>
                <p className="mt-1 text-xs text-white/60">{securityCopy.apiDisabledBody}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SessionsPanel sessions={sessions} onRevoke={onRevoke} />
    </div>
  );
}
