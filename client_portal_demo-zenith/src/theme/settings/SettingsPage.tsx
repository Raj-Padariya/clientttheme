'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';
import { DocumentsTab } from './DocumentsTab';
import { EmailPreferencesTab, WithdrawalMethodsTab } from './PreferenceTabs';
import { ProfileTab } from './ProfileTab';
import { ActivitiesTab, SecurityTab } from './SessionTabs';
import {
  accountIdentity,
  documentStatusLabel,
  loginSessions,
  securityCopy,
  sessionsCopy,
  settingsTabs,
  verificationStatus,
  type SettingsTabId,
} from './settingsData';

const RED = 'var(--zenith-red)';
const pad2 = (value: number) => String(value).padStart(2, '0');

/** Open identity band: big monogram + name on the left, the complete-profile capsule, and three status tiles on the right. */
function IdentityCard({ sessionCount, onCompleteProfile }: { sessionCount: number; onCompleteProfile: () => void }) {
  const facts = [
    { icon: 'kyc' as const, label: verificationStatus.heading, value: documentStatusLabel[verificationStatus.status], dot: 'bg-warning' },
    { icon: 'lock' as const, label: securityCopy.passwordHeading, value: securityCopy.verified, dot: 'bg-success' },
    { icon: 'monitor' as const, label: sessionsCopy.heading, value: String(sessionCount), dot: '' },
  ];

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-4">
          <span className="relative grid size-20 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
            </span>
            <span className="grid size-16 place-items-center rounded-full bg-fg font-mono text-xl font-black text-app">{accountIdentity.initials}</span>
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-4xl leading-none font-black tracking-tighter text-fg capitalize sm:text-5xl">{accountIdentity.name}</h2>
            <p className="mt-2 flex items-center gap-2 truncate font-mono text-xs text-fg-muted">
              <span aria-hidden="true" style={{ background: RED }} className="size-1.5 shrink-0 rounded-[2px]" />
              {accountIdentity.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCompleteProfile}
          className="group/ink inline-flex h-12 w-fit items-center gap-3 rounded-full bg-fg py-2 pr-2 pl-2 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span style={{ background: RED }} className="relative grid size-8 place-items-center rounded-full text-white">
            <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
            <Icon name="alert" size={14} className="relative" />
          </span>
          <span>{accountIdentity.completeCta}</span>
          <span className="grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={13} />
          </span>
        </button>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        {facts.map((fact, index) => (
          <div key={fact.label} style={staggerStyle(index + 1, 120)} className="flex min-w-0 animate-feed-in flex-col gap-3 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-line motion-reduce:animate-none">
            <span className="flex items-center justify-between gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fg/10 text-fg">
                <Icon name={fact.icon} size={15} />
              </span>
              <span aria-hidden="true" style={fact.dot ? undefined : { background: RED }} className={cx('zenith-blink size-2 rounded-[2px]', fact.dot)} />
            </span>
            <div className="min-w-0">
              <dt className="truncate text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{fact.label}</dt>
              <dd className="mt-1 truncate text-lg font-black text-fg tabular-nums">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Sections as a vertical stack of capsules beside the panel; a segmented track above shows where you are. */
function SectionDial({ value, onChange }: { value: SettingsTabId; onChange: (value: SettingsTabId) => void }) {
  const activeIndex = settingsTabs.findIndex((tab) => tab.id === value);
  const activeTab = settingsTabs[activeIndex];

  return (
    <nav aria-label={translate('nav.settings')} style={staggerStyle(1, 140)} className="flex min-w-0 animate-rise flex-col gap-4 lg:sticky lg:top-24 lg:self-start motion-reduce:animate-none">
      <div className="flex flex-col gap-2.5 rounded-[28px] border border-dashed border-line-strong p-4">
        <div className="flex items-end justify-between gap-3">
          <div key={activeTab.id} className="min-w-0 animate-rise motion-reduce:animate-none">
            <p className="flex items-center gap-1 text-[10px] text-fg-subtle">
              {translate('nav.settings')}
              <Icon name="chevronRight" size={10} />
            </p>
            <p className="truncate text-base leading-tight font-black text-fg">{activeTab.label}</p>
          </div>
          <p className="shrink-0 font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">
            {pad2(activeIndex + 1)}
            <span className="text-sm text-fg-subtle">/{pad2(settingsTabs.length)}</span>
          </p>
        </div>
        <span aria-hidden="true" className="flex gap-1">
          {settingsTabs.map((tab, index) => (
            <span
              key={tab.id}
              style={index === activeIndex ? { background: RED } : undefined}
              className={cx('h-2 min-w-0 flex-1 rounded-full transition-colors duration-500', index !== activeIndex && (index < activeIndex ? 'bg-fg' : 'bg-fg/12'))}
            />
          ))}
        </span>
      </div>

      <div role="tablist" aria-orientation="vertical" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:p-0">
        {settingsTabs.map((tab, index) => {
          const isActive = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              style={staggerStyle(index, 60)}
              className={cx(
                'group flex shrink-0 animate-feed-in items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-left text-sm font-bold whitespace-nowrap transition-[background-color,color,translate,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:animate-none lg:hover:translate-x-1 motion-reduce:lg:hover:translate-x-0',
                isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              <span
                style={isActive ? { background: RED } : undefined}
                className={cx(
                  'relative grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:-rotate-12',
                  isActive ? 'text-white' : 'bg-fg/10 text-fg',
                )}
              >
                {isActive && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                <Icon name={tab.icon} size={15} className="relative" />
              </span>
              <span className="min-w-0 flex-1 truncate">{tab.label}</span>
              <span className={cx('font-mono text-[10px] tabular-nums', isActive ? 'text-app/60' : 'text-fg-subtle')}>{pad2(index + 1)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Skeleton: slim title line → open identity band (name | status tiles) → capsule section rail beside the active panel.
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile');
  const [sessions, setSessions] = useState(loginSessions);

  const revokeSession = (id: string) => setSessions((current) => current.filter((session) => session.current || session.id !== id));
  const sessionProps = { sessions, onRevoke: revokeSession };

  return (
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-center gap-4">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-fg text-app">
          <Icon name="settings" size={16} className="animate-rim-spin [animation-duration:8s] motion-reduce:animate-none" />
        </span>
        <h1 className="min-w-0 truncate text-2xl font-black tracking-tight text-fg-muted">{translate('nav.settings')}</h1>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </header>

      <IdentityCard sessionCount={sessions.length} onCompleteProfile={() => setActiveTab('profile')} />

      <div className="grid items-start gap-8 border-t border-line pt-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <SectionDial value={activeTab} onChange={setActiveTab} />

        <div key={activeTab} id={`settings-panel-${activeTab}`} role="tabpanel" className="min-w-0 animate-rise motion-reduce:animate-none">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'withdrawal' && <WithdrawalMethodsTab />}
          {activeTab === 'activities' && <ActivitiesTab {...sessionProps} />}
          {activeTab === 'security' && <SecurityTab {...sessionProps} />}
          {activeTab === 'email' && <EmailPreferencesTab />}
        </div>
      </div>
    </div>
  );
}
