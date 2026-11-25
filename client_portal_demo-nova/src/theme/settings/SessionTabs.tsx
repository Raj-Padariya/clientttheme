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

const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';

function CurrentSession({ session }: { session: LoginSession }) {
  return (
    <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-[24px] bg-fg p-4 text-app">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--color-app)_18%,transparent)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(90deg,transparent,#000)]" />
      <span className="relative grid size-14 shrink-0 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-app/40 motion-reduce:animate-none" />
        <span className="grid size-11 place-items-center rounded-full bg-app text-fg">
          <Icon name="monitor" size={19} />
        </span>
        <span className="absolute right-0 bottom-0 grid size-4 place-items-center rounded-full bg-fg">
          <LiveDot />
        </span>
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {session.device}
          <span className="rounded-full bg-app px-2 py-0.5 text-[9px] font-black tracking-wide text-fg">{sessionsCopy.currentBadge}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs opacity-70">
          <span className="flex items-center gap-1">
            <Icon name="globe" size={12} />
            {session.location}
          </span>
          <span className="font-mono text-[11px]">{session.ip}</span>
        </p>
      </div>
      <span className="relative rounded-full px-3 py-1 text-xs font-bold ring-1 ring-app/25">{sessionsCopy.activeNow}</span>
    </div>
  );
}

function SessionRow({ session, index, onRevoke }: { session: LoginSession; index: number; onRevoke: (id: string) => void }) {
  return (
    <li style={{ animationDelay: `${index * 60}ms` }} className="relative grid animate-feed-in grid-cols-[2.75rem_minmax(0,1fr)] gap-3 motion-reduce:animate-none">
      <span aria-hidden="true" className="nova-gloss relative z-10 mt-2 grid size-11 place-items-center rounded-full text-fg-muted">
        <Icon name="monitor" size={16} />
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] p-3 ring-1 ring-line transition-[box-shadow] hover:ring-line-strong">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{session.device}</p>
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
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="logout" size={13} />
          {sessionsCopy.logout}
        </button>
      </div>
    </li>
  );
}

function SessionsPanel({ sessions, onRevoke }: SessionsProps) {
  const current = sessions.find((session) => session.current);
  const others = sessions.filter((session) => !session.current);

  return (
    <section style={staggerStyle(3, 120)} className="orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-4 p-5 motion-reduce:animate-none">
      <header className="flex flex-wrap items-center gap-3.5">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
          <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
            <Icon name="monitor" size={15} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-fg">{sessionsCopy.heading}</h2>
          <p className="mt-0.5 text-xs text-fg-muted">{sessionsCopy.description}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-full bg-fg font-mono text-sm font-black text-app tabular-nums">{sessions.length}</span>
      </header>
      {current && <CurrentSession session={current} />}
      {others.length > 0 && (
        <ul className="relative flex flex-col gap-2.5">
          <span aria-hidden="true" className="absolute top-4 bottom-4 left-[1.375rem] border-l-2 border-dotted border-line-strong" />
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
        <span aria-hidden="true" className="size-1.5 rounded-full bg-fg/40" />
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
          className="orbit-card nova-edge-light flex animate-rise flex-col gap-4 p-5 xl:sticky xl:top-24 motion-reduce:animate-none"
        >
          <p className="flex items-center gap-2.5 text-sm font-bold text-fg">
            <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
              <Icon name="filter" size={14} />
            </span>
            {activitiesCopy.filtersHeading}
          </p>
          <span aria-hidden="true" className="border-t border-dotted border-line-strong" />
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
          <div className="flex gap-2 border-t border-dotted border-line-strong pt-4">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-fg text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <Icon name="check" size={14} />
              {activitiesCopy.apply}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(DEFAULT_FILTERS);
                setApplied(DEFAULT_FILTERS);
              }}
              className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
            >
              {activitiesCopy.cancel}
            </button>
          </div>
        </form>

        <section style={staggerStyle(1, 120)} className="orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-4 p-5 motion-reduce:animate-none">
          <h3 className="flex items-center gap-2.5 text-base font-bold text-fg">
            <span aria-hidden="true" className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
              <Icon name="history" size={14} />
            </span>
            {activitiesCopy.recentHeading}
          </h3>

          {visibleActivities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[22px] border-2 border-dotted border-line-strong px-4 py-8 text-center">
              <span aria-hidden="true" className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, dot) => (
                  <span key={dot} style={{ animationDelay: `${dot * 50}ms` }} className="size-2 animate-dot-pop rounded-full bg-fg/15 motion-reduce:animate-none" />
                ))}
              </span>
              <p className="text-sm text-fg-muted">Showing 0 of {accountActivities.length} activities</p>
            </div>
          ) : (
            <ol className="relative flex flex-col gap-3">
              <span aria-hidden="true" className="absolute top-5 bottom-5 left-[1.125rem] border-l-2 border-dotted border-line-strong" />
              {visibleActivities.map((activity, index) => {
                const expanded = expandedId === activity.id;
                return (
                  <li key={activity.id} style={{ animationDelay: `${index * 80}ms` }} className="relative grid animate-feed-in grid-cols-[2.25rem_minmax(0,1fr)] gap-3 motion-reduce:animate-none">
                    <span aria-hidden="true" className={cx('relative z-10 mt-3 grid size-9 place-items-center rounded-full transition-colors duration-300', expanded ? 'bg-fg text-app' : 'bg-success/15 text-success ring-4 ring-surface')}>
                      <Icon name="check" size={13} />
                    </span>
                    <div className={cx('min-w-0 rounded-[22px] ring-1 transition-[background-color,box-shadow] duration-300', expanded ? 'bg-fg/[0.04] ring-line-strong' : 'ring-line hover:ring-line-strong')}>
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
                          <dl className="mx-4 mb-4 flex flex-col gap-2 border-t border-dotted border-line-strong pt-3">
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
        <section className="orbit-card nova-edge-light relative isolate flex animate-rise flex-col items-center gap-5 overflow-hidden p-5 text-center motion-reduce:animate-none">
          <div className="flex w-full items-center justify-between gap-3">
            <p className={cx(eyebrow, 'text-fg-subtle')}>{securityCopy.passwordHeading}</p>
            <StatusStamp tone="success">
              <Icon name="checkCircle" size={11} />
              {securityCopy.verified}
            </StatusStamp>
          </div>

          <div aria-hidden="true" className="relative grid aspect-square w-full max-w-[12rem] place-items-center">
            {Array.from({ length: PASSWORD_MASK_LENGTH }, (_, index) => {
              const angle = (index / PASSWORD_MASK_LENGTH) * 2 * Math.PI - Math.PI / 2;
              return (
                <span
                  key={index}
                  style={{ left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%`, animationDelay: `${index * 70}ms` }}
                  className="nova-gloss absolute grid size-6 -translate-x-1/2 -translate-y-1/2 animate-dot-pop place-items-center rounded-full motion-reduce:animate-none"
                >
                  <span className="size-1.5 rounded-full bg-fg" />
                </span>
              );
            })}
            <span className="absolute inset-[24%] animate-rim-spin rounded-full border border-dashed border-success/45 [animation-duration:20s] motion-reduce:animate-none" />
            <span className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
              <Icon name="lock" size={22} />
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Icon name="clock" size={12} className="text-fg-subtle" />
            {securityCopy.lastChanged}
          </p>

          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="group/ink relative mt-auto inline-flex h-12 w-full items-center gap-3 overflow-hidden rounded-full bg-fg py-2 pr-2 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
            <span className="relative flex-1 text-left">{securityCopy.changePassword}</span>
            <span className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-500 group-hover/ink:rotate-180 motion-reduce:transition-none">
              <Icon name="refresh" size={14} />
            </span>
          </button>
        </section>

        <section style={staggerStyle(1, 120)} className="orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-4 p-5 motion-reduce:animate-none">
          <header className="flex items-center gap-3">
            <span aria-hidden="true" className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
              <Icon name="bolt" size={14} />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-fg">{securityCopy.apiHeading}</h2>
          </header>
          <p className="text-sm leading-relaxed text-fg-muted">
            {securityCopy.apiIntroBefore}{' '}
            <code className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-xs font-semibold text-fg ring-1 ring-line">{securityCopy.apiCodeAccount}</code>{' '}
            {securityCopy.apiIntroMiddle}{' '}
            <code className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-xs font-semibold text-fg ring-1 ring-line">{securityCopy.apiCodeHeader}</code>{' '}
            {securityCopy.apiIntroAfter}
          </p>

          <div className="mt-auto overflow-hidden rounded-[24px] bg-[#0a1220] text-white ring-1 ring-white/10">
            <div aria-hidden="true" className="flex items-center gap-2 px-4 pt-3.5">
              <span className="size-2.5 rounded-full bg-white/25" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="ml-2 flex-1 border-t border-dotted border-white/15" />
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
