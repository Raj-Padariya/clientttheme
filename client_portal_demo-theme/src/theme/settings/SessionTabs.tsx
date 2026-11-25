'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Input';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Panel, StatusStamp } from './SettingsParts';
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

function SessionCard({ session, index, onRevoke }: { session: LoginSession; index: number; onRevoke: (id: string) => void }) {
  return (
    <li
      style={{ animationDelay: `${index * 60}ms` }}
      className={cx(
        'group relative flex animate-feed-in flex-col gap-3 overflow-hidden rounded-xl p-4 ring-1 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:transition-none',
        session.current ? 'glow-border bg-primary-soft ring-primary/50 sm:col-span-2 xl:col-span-3' : 'bg-surface-2 ring-line hover:ring-line-strong',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            'relative grid size-11 shrink-0 place-items-center rounded-xl',
            session.current ? 'bg-primary text-on-primary shadow-[0_0_24px_-6px_var(--brand-primary)]' : 'bg-surface text-fg-muted ring-1 ring-line',
          )}
        >
          <Icon name="monitor" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
            {session.device}
            {session.current && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold tracking-wide text-on-primary">{sessionsCopy.currentBadge}</span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
            <Icon name="globe" size={12} className="shrink-0 text-fg-subtle" />
            <span className="truncate">{session.location}</span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{session.ip}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        {session.current ? (
          <span className="flex items-center gap-2 text-xs font-medium text-primary">
            <LiveDot />
            {sessionsCopy.activeNow}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
            <Icon name="clock" size={12} />
            {sessionsCopy.lastActivityPrefix} {session.lastActivity}
          </span>
        )}
        {!session.current && (
          <Button size="sm" variant="ghost" leftIcon="logout" onClick={() => onRevoke(session.id)} className="text-danger hover:text-danger">
            {sessionsCopy.logout}
          </Button>
        )}
      </div>
    </li>
  );
}

function SessionsPanel({ sessions, onRevoke }: SessionsProps) {
  return (
    <Panel
      icon="monitor"
      title={sessionsCopy.heading}
      subtitle={sessionsCopy.description}
      style={staggerStyle(3, 120)}
      action={<span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums text-fg ring-1 ring-line">{sessions.length}</span>}
    >
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session, index) => (
          <SessionCard key={session.id} session={session} index={index} onRevoke={onRevoke} />
        ))}
      </ul>
    </Panel>
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
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
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
      <section className="kpi-card relative animate-rise overflow-hidden rounded-xl p-5 sm:p-6 motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fg">{activitiesCopy.heading}</h2>
            <p className="mt-1 text-sm text-fg-muted">{activitiesCopy.subtitle}</p>
          </div>

          <form
            aria-label={activitiesCopy.filtersHeading}
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(draft);
            }}
            className="flex flex-col gap-3 rounded-xl bg-surface/70 p-4 ring-1 ring-line backdrop-blur md:flex-row md:items-end"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary md:mb-2.5 md:w-28">
              <Icon name="filter" size={14} />
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
        </div>
      </section>

      <Panel
        icon="history"
        title={activitiesCopy.recentHeading}
        style={staggerStyle(2, 120)}
        action={
          <span className="flex items-center gap-2 text-xs text-fg-muted">
            <StatusStamp tone="success">
              {visibleActivities.length} {activitiesCopy.countSuffix}
            </StatusStamp>
            Showing {visibleActivities.length} of {accountActivities.length} activities
          </span>
        }
      >
        {visibleActivities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">
            Showing 0 of {accountActivities.length} activities
          </p>
        ) : (
          <ol className="relative flex flex-col gap-3 pl-8">
            <span aria-hidden="true" className="absolute top-3 bottom-3 left-[13px] w-px bg-linear-to-b from-success/60 via-line to-line" />
            {visibleActivities.map((activity, index) => {
              const expanded = expandedId === activity.id;
              return (
                <li key={activity.id} style={{ animationDelay: `${index * 80}ms` }} className="relative animate-feed-in motion-reduce:animate-none">
                  <span className="absolute top-3 -left-8 grid size-7 place-items-center rounded-full bg-success text-white ring-4 ring-surface">
                    <Icon name="check" size={13} />
                  </span>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : activity.id)}
                    className={cx(
                      'flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                      expanded ? 'bg-surface-2 ring-line-strong' : 'ring-line hover:bg-hover',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{activity.title}</span>
                      <span className="block text-xs text-fg-muted">{activity.detail}</span>
                    </span>
                    <StatusStamp tone="success">{activity.status}</StatusStamp>
                    <span className="w-24 text-right text-[11px] text-fg-subtle">{activity.timeAgo}</span>
                    <Icon name="chevronDown" size={14} className={cx('text-fg-subtle transition-transform duration-300', expanded && 'rotate-180')} />
                  </button>
                  <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <dl className="grid min-h-0 grid-cols-1 gap-2 overflow-hidden pt-2 sm:grid-cols-3">
                      {[
                        { label: activitiesCopy.ipAddress, value: activity.ip, icon: 'globe' as const, mono: true },
                        { label: activitiesCopy.location, value: activity.location, icon: 'compass' as const, mono: false },
                        { label: activitiesCopy.device, value: activity.device, icon: 'monitor' as const, mono: false },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5">
                          <Icon name={item.icon} size={15} className="shrink-0 text-primary" />
                          <div className="min-w-0">
                            <dt className="text-[10px] font-medium tracking-wide text-fg-subtle">{item.label}</dt>
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
      </Panel>

      <SessionsPanel sessions={sessions} onRevoke={onRevoke} />
    </div>
  );
}

export function SecurityTab({ sessions, onRevoke }: SessionsProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordModal open={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="kpi-card relative flex animate-rise flex-col gap-5 overflow-hidden rounded-xl p-5 motion-reduce:animate-none">
          <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
          <div className="relative flex items-center gap-4">
            <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-success/15 text-success ring-1 ring-success/40">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-2xl bg-success/20 motion-reduce:animate-none" />
              <Icon name="lock" size={24} className="relative" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg">{securityCopy.passwordHeading}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusStamp tone="success">
                  <Icon name="checkCircle" size={11} />
                  {securityCopy.verified}
                </StatusStamp>
                <span className="text-xs text-fg-muted">{securityCopy.lastChanged}</span>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="relative flex gap-1.5">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} style={{ animationDelay: `${index * 70}ms` }} className="size-2.5 animate-dot-pop rounded-full bg-fg/70 motion-reduce:animate-none" />
            ))}
          </div>
          <Button className="relative mt-auto self-start" leftIcon="refresh" onClick={() => setIsPasswordModalOpen(true)}>
            {securityCopy.changePassword}
          </Button>
        </section>

        <Panel icon="bolt" title={securityCopy.apiHeading} style={staggerStyle(1, 120)}>
          <p className="text-sm leading-relaxed text-fg-muted">
            {securityCopy.apiIntroBefore}{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-primary ring-1 ring-line">{securityCopy.apiCodeAccount}</code>{' '}
            {securityCopy.apiIntroMiddle}{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-primary ring-1 ring-line">{securityCopy.apiCodeHeader}</code>{' '}
            {securityCopy.apiIntroAfter}
          </p>
          <div className="relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2 p-4">
            <div aria-hidden="true" className="mb-3 flex items-center gap-2 font-mono text-xs text-fg-subtle blur-[3px] select-none">
              <span className="text-primary">X-API-Key:</span> tc_live_••••••••••••••••••••
            </div>
            <div className="flex items-start gap-3">
              <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-fg">{securityCopy.apiDisabledTitle}</p>
                <p className="mt-1 text-xs text-fg-muted">{securityCopy.apiDisabledBody}</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <SessionsPanel sessions={sessions} onRevoke={onRevoke} />
    </div>
  );
}
