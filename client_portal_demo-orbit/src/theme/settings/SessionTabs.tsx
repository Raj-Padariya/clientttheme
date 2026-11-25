'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
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
    <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-primary/45 bg-primary/[0.08] p-4">
      <span aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 opacity-40" />
      <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-primary/50 bg-primary/25 text-primary shadow-[0_0_24px_-8px_var(--brand-primary)]">
        <Icon name="monitor" size={22} />
        <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-surface">
          <LiveDot />
        </span>
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
          {session.device}
          <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-on-primary">{sessionsCopy.currentBadge}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
          <span className="flex items-center gap-1">
            <Icon name="globe" size={12} className="text-fg-subtle" />
            {session.location}
          </span>
          <span className="font-mono text-[11px] text-fg-subtle">{session.ip}</span>
        </p>
      </div>
      <span className="relative text-xs font-medium text-primary">{sessionsCopy.activeNow}</span>
    </div>
  );
}

function SessionRow({ session, index, onRevoke }: { session: LoginSession; index: number; onRevoke: (id: string) => void }) {
  return (
    <li
      style={{ animationDelay: `${index * 60}ms` }}
      className="grid animate-feed-in grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-hover sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto] motion-reduce:animate-none"
    >
      <span className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted">
        <Icon name="monitor" size={16} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{session.device}</p>
        <p className="flex items-center gap-1 truncate text-xs text-fg-muted">
          <Icon name="globe" size={11} className="shrink-0 text-fg-subtle" />
          <span className="truncate">{session.location}</span>
        </p>
      </div>
      <div className="col-start-2 row-start-2 flex min-w-0 flex-col sm:col-start-auto sm:row-start-auto">
        <span className="truncate font-mono text-[11px] text-fg-muted">{session.ip}</span>
        <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <Icon name="clock" size={11} />
          {sessionsCopy.lastActivityPrefix} {session.lastActivity}
        </span>
      </div>
      <Button size="sm" variant="ghost" leftIcon="logout" onClick={() => onRevoke(session.id)} className="text-danger hover:text-danger">
        {sessionsCopy.logout}
      </Button>
    </li>
  );
}

function SessionsPanel({ sessions, onRevoke }: SessionsProps) {
  const current = sessions.find((session) => session.current);
  const others = sessions.filter((session) => !session.current);

  return (
    <section style={staggerStyle(3, 120)} className="orbit-card flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <Icon name="monitor" size={16} className="text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-fg">{sessionsCopy.heading}</h2>
          <p className="mt-0.5 text-xs text-fg-muted">{sessionsCopy.description}</p>
        </div>
        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs font-semibold text-fg tabular-nums">{sessions.length}</span>
      </header>
      {current && (
        <div className="p-4 pb-0">
          <CurrentSession session={current} />
        </div>
      )}
      <ul className="mt-2 flex flex-col divide-y divide-line">
        {others.map((session, index) => (
          <SessionRow key={session.id} session={session} index={index} onRevoke={onRevoke} />
        ))}
      </ul>
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
      <label htmlFor={id} className={cx(eyebrow, 'text-fg-subtle')}>
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
      <section className="orbit-card relative isolate flex animate-rise flex-col overflow-hidden motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fg">{activitiesCopy.heading}</h2>
            <p className="mt-1 text-sm text-fg-muted">{activitiesCopy.subtitle}</p>
          </div>
          <span className="flex items-center gap-2 text-xs text-fg-muted">
            <StatusStamp tone="success">
              {visibleActivities.length} {activitiesCopy.countSuffix}
            </StatusStamp>
            Showing {visibleActivities.length} of {accountActivities.length} activities
          </span>
        </div>

        <form
          aria-label={activitiesCopy.filtersHeading}
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(draft);
          }}
          className="flex flex-col gap-4 border-t border-line bg-fg/[0.015] px-5 py-4 md:flex-row md:items-end"
        >
          <p className="flex items-center gap-2 text-xs font-semibold text-primary md:mb-2.5">
            <span className="grid size-7 place-items-center rounded-lg border border-primary/35 bg-primary/12">
              <Icon name="filter" size={13} />
            </span>
            {activitiesCopy.filtersHeading}
          </p>
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
          <div className="flex gap-2">
            <Button type="submit" leftIcon="check">
              {activitiesCopy.apply}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(DEFAULT_FILTERS);
                setApplied(DEFAULT_FILTERS);
              }}
            >
              {activitiesCopy.cancel}
            </Button>
          </div>
        </form>

        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          <Icon name="history" size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-fg">{activitiesCopy.recentHeading}</h3>
        </div>

        {visibleActivities.length === 0 ? (
          <p className="mx-5 mb-5 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">
            Showing 0 of {accountActivities.length} activities
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-line border-t border-line">
            {visibleActivities.map((activity, index) => {
              const expanded = expandedId === activity.id;
              return (
                <li key={activity.id} style={{ animationDelay: `${index * 80}ms` }} className={cx('animate-feed-in transition-colors motion-reduce:animate-none', expanded && 'bg-primary/[0.05]')}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : activity.id)}
                    className="grid w-full grid-cols-[5.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="font-mono text-[11px] text-fg-subtle">{activity.timeAgo}</span>
                    <span className="grid size-6 place-items-center rounded-md border border-success/40 bg-success/10 text-success">
                      <Icon name="check" size={12} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-fg">{activity.title}</span>
                      <span className="block truncate text-xs text-fg-muted">{activity.detail}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="hidden sm:block">
                        <StatusStamp tone="success">{activity.status}</StatusStamp>
                      </span>
                      <Icon name="chevronDown" size={14} className={cx('text-fg-subtle transition-transform duration-300', expanded && 'rotate-180')} />
                    </span>
                  </button>
                  <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <dl className="grid min-h-0 grid-cols-1 overflow-hidden sm:grid-cols-3 sm:pl-[calc(5.5rem+1.25rem)]">
                      {[
                        { label: activitiesCopy.ipAddress, value: activity.ip, icon: 'globe' as const, mono: true },
                        { label: activitiesCopy.location, value: activity.location, icon: 'compass' as const, mono: false },
                        { label: activitiesCopy.device, value: activity.device, icon: 'monitor' as const, mono: false },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2.5 px-5 pb-3 sm:px-3">
                          <Icon name={item.icon} size={14} className="shrink-0 text-primary" />
                          <div className="min-w-0">
                            <dt className={cx(eyebrow, 'text-fg-subtle')}>{item.label}</dt>
                            <dd className={cx('truncate text-xs font-medium text-fg', item.mono && 'font-mono')}>{item.value}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

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
        <section className="orbit-card relative isolate flex animate-rise flex-col gap-5 overflow-hidden p-5 motion-reduce:animate-none">
          <div aria-hidden="true" className="pointer-events-none absolute -top-20 -left-16 -z-10 size-56 animate-ring-breathe rounded-full bg-success/10 blur-3xl motion-reduce:animate-none" />
          <div className="flex items-center justify-between gap-3">
            <p className={cx(eyebrow, 'text-fg-subtle')}>{securityCopy.passwordHeading}</p>
            <StatusStamp tone="success">
              <Icon name="checkCircle" size={11} />
              {securityCopy.verified}
            </StatusStamp>
          </div>

          <div className="flex items-center gap-4">
            <span className="relative grid size-16 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-2xl border border-dashed border-success/45 [animation-duration:20s] motion-reduce:animate-none" />
              <span className="grid size-12 place-items-center rounded-xl border border-success/40 bg-success/12 text-success">
                <Icon name="lock" size={22} />
              </span>
            </span>
            <div aria-hidden="true" className="grid flex-1 grid-cols-6 gap-1 sm:grid-cols-12">
              {Array.from({ length: PASSWORD_MASK_LENGTH }, (_, index) => (
                <span key={index} className="grid h-8 place-items-center rounded-md border border-line bg-fg/[0.03]">
                  <span style={{ animationDelay: `${index * 70}ms` }} className="size-2 animate-dot-pop rounded-full bg-fg/70 motion-reduce:animate-none" />
                </span>
              ))}
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Icon name="clock" size={12} className="text-fg-subtle" />
            {securityCopy.lastChanged}
          </p>

          <Button className="mt-auto self-start" leftIcon="refresh" onClick={() => setIsPasswordModalOpen(true)}>
            {securityCopy.changePassword}
          </Button>
        </section>

        <section style={staggerStyle(1, 120)} className="orbit-card flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none">
          <header className="flex items-center gap-2 border-b border-line px-5 py-4">
            <Icon name="bolt" size={16} className="text-primary" />
            <h2 className="text-[15px] font-semibold text-fg">{securityCopy.apiHeading}</h2>
          </header>
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm leading-relaxed text-fg-muted">
              {securityCopy.apiIntroBefore}{' '}
              <code className="rounded-md border border-line bg-fg/[0.04] px-1.5 py-0.5 font-mono text-xs text-primary">{securityCopy.apiCodeAccount}</code>{' '}
              {securityCopy.apiIntroMiddle}{' '}
              <code className="rounded-md border border-line bg-fg/[0.04] px-1.5 py-0.5 font-mono text-xs text-primary">{securityCopy.apiCodeHeader}</code>{' '}
              {securityCopy.apiIntroAfter}
            </p>

            <div className="overflow-hidden rounded-xl border border-line bg-bg/60">
              <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-line px-3 py-2">
                <span className="size-2 rounded-full bg-danger/60" />
                <span className="size-2 rounded-full bg-warning/60" />
                <span className="size-2 rounded-full bg-success/60" />
              </div>
              <div aria-hidden="true" className="flex flex-col gap-1 px-4 py-3 font-mono text-xs blur-[3px] select-none">
                <span>
                  <span className="text-primary">X-API-Key:</span> <span className="text-fg-subtle">tc_live_{'•'.repeat(22)}</span>
                </span>
              </div>
              <div className="flex items-start gap-3 border-t border-dashed border-line-strong px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-warning/40 bg-warning/10 text-warning">
                  <Icon name="lock" size={15} />
                </span>
                <div>
                  <p className="text-sm font-medium text-fg">{securityCopy.apiDisabledTitle}</p>
                  <p className="mt-1 text-xs text-fg-muted">{securityCopy.apiDisabledBody}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SessionsPanel sessions={sessions} onRevoke={onRevoke} />
    </div>
  );
}
