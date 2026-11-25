'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
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

function IdentityHero({ sessionCount, onCompleteProfile }: { sessionCount: number; onCompleteProfile: () => void }) {
  const facts = [
    { icon: 'kyc' as const, label: verificationStatus.heading, value: documentStatusLabel[verificationStatus.status], tone: 'text-warning' },
    { icon: 'lock' as const, label: securityCopy.passwordHeading, value: securityCopy.verified, tone: 'text-success' },
    { icon: 'monitor' as const, label: sessionsCopy.heading, value: String(sessionCount), tone: 'text-fg' },
  ];

  return (
    <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -left-20 size-80 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="relative grid size-16 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full bg-[conic-gradient(var(--brand-primary),transparent_60%,var(--brand-primary))] motion-reduce:animate-none" />
            <span className="relative grid size-14 place-items-center rounded-full bg-surface text-lg font-bold text-primary">{accountIdentity.initials}</span>
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold capitalize tracking-tight text-fg">{accountIdentity.name}</h2>
            <p className="truncate text-sm text-fg-muted">{accountIdentity.email}</p>
            <button
              type="button"
              onClick={onCompleteProfile}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning ring-1 ring-warning/40 transition-colors hover:bg-warning/20 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="alert" size={13} />
              {accountIdentity.completeCta}
              <Icon name="arrowRight" size={12} />
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[34rem]">
          {facts.map((fact, index) => (
            <div key={fact.label} style={staggerStyle(index + 1, 120)} className="glass flex animate-rise items-center gap-3 rounded-xl px-4 py-3 motion-reduce:animate-none">
              <Icon name={fact.icon} size={18} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="truncate text-[11px] text-fg-muted">{fact.label}</dt>
                <dd className={cx('truncate text-sm font-semibold tabular-nums', fact.tone)}>{fact.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function TabRail({ value, onChange }: { value: SettingsTabId; onChange: (value: SettingsTabId) => void }) {
  return (
    <nav aria-label={translate('nav.settings')} className="sticky top-16 z-20 -mx-1 overflow-x-auto px-1 py-1">
      <div role="tablist" className="flex w-max min-w-full gap-1 rounded-2xl bg-surface p-1.5 shadow-card ring-1 ring-line">
        {settingsTabs.map((tab) => {
          const isActive = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={cx(
                'group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? 'bg-primary text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)]' : 'text-fg-muted hover:bg-hover hover:text-fg',
              )}
            >
              <Icon name={tab.icon} size={16} className={cx('transition-transform duration-300', !isActive && 'group-hover:-translate-y-0.5')} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile');
  const [sessions, setSessions] = useState(loginSessions);

  const revokeSession = (id: string) => setSessions((current) => current.filter((session) => session.current || session.id !== id));
  const sessionProps = { sessions, onRevoke: revokeSession };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.settings')} />

      <IdentityHero sessionCount={sessions.length} onCompleteProfile={() => setActiveTab('profile')} />

      <TabRail value={activeTab} onChange={setActiveTab} />

      <div key={activeTab} id={`settings-panel-${activeTab}`} role="tabpanel" className="animate-rise motion-reduce:animate-none">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'withdrawal' && <WithdrawalMethodsTab />}
        {activeTab === 'activities' && <ActivitiesTab {...sessionProps} />}
        {activeTab === 'security' && <SecurityTab {...sessionProps} />}
        {activeTab === 'email' && <EmailPreferencesTab />}
      </div>
    </div>
  );
}
