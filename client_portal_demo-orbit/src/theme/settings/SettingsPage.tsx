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

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Identity as a clipped member pass: lanyard slot, square monogram, and status rows. */
function MemberPass({ sessionCount, onCompleteProfile }: { sessionCount: number; onCompleteProfile: () => void }) {
  const facts = [
    { icon: 'kyc' as const, label: verificationStatus.heading, value: documentStatusLabel[verificationStatus.status], dot: 'bg-warning', tone: 'text-warning' },
    { icon: 'lock' as const, label: securityCopy.passwordHeading, value: securityCopy.verified, dot: 'bg-success', tone: 'text-success' },
    { icon: 'monitor' as const, label: sessionsCopy.heading, value: String(sessionCount), dot: 'bg-primary', tone: 'text-fg' },
  ];

  return (
    <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 -z-10 size-48 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full border border-line-strong bg-surface" />

      <div className="flex flex-col items-center gap-3 px-5 pt-9 pb-5 text-center">
        <span className="relative grid size-20 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin rounded-[1.6rem] border border-dashed border-primary/40 [animation-duration:18s] motion-reduce:animate-none" />
          <span className="grid size-16 place-items-center rounded-2xl border border-primary/40 bg-primary/15 font-mono text-xl font-bold text-primary shadow-[0_0_28px_-8px_var(--brand-primary)]">
            {accountIdentity.initials}
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-fg capitalize">{accountIdentity.name}</h2>
          <p className="truncate font-mono text-xs text-fg-muted">{accountIdentity.email}</p>
        </div>
        <button
          type="button"
          onClick={onCompleteProfile}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/20 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="alert" size={13} />
          {accountIdentity.completeCta}
          <Icon name="arrowRight" size={12} />
        </button>
      </div>

      <div aria-hidden="true" className="relative flex items-center">
        <span className="absolute -left-2.5 size-5 rounded-full border border-line bg-bg" />
        <span className="mx-4 flex-1 border-t border-dashed border-line-strong" />
        <span className="absolute -right-2.5 size-5 rounded-full border border-line bg-bg" />
      </div>

      <dl className="flex flex-col gap-1 p-3">
        {facts.map((fact, index) => (
          <div key={fact.label} style={staggerStyle(index + 1, 120)} className="flex min-w-0 animate-rise items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-hover motion-reduce:animate-none">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-fg/[0.03] text-primary">
              <Icon name={fact.icon} size={15} />
            </span>
            <dt className="min-w-0 flex-1 truncate text-xs text-fg-muted">{fact.label}</dt>
            <dd className={cx('flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums', fact.tone)}>
              <span aria-hidden="true" className={cx('size-1.5 rounded-full', fact.dot)} />
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Vertical numbered index on desktop, horizontal scroller on small screens. */
function SectionIndex({ value, onChange }: { value: SettingsTabId; onChange: (value: SettingsTabId) => void }) {
  return (
    <nav aria-label={translate('nav.settings')} className="-mx-1 overflow-x-auto px-1 py-1 lg:mx-0 lg:overflow-visible lg:p-0">
      <div role="tablist" aria-orientation="vertical" className="orbit-card flex w-max min-w-full gap-1 p-1.5 lg:w-full lg:flex-col">
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
              className={cx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? 'bg-primary/[0.12] text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg',
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-opacity duration-200 lg:block',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className={cx('font-mono text-[10px] tabular-nums', isActive ? 'text-primary' : 'text-fg-subtle')}>{pad2(index + 1)}</span>
              <span
                className={cx(
                  'grid size-7 shrink-0 place-items-center rounded-lg border transition-colors duration-200',
                  isActive ? 'border-primary/45 bg-primary/20 text-primary' : 'border-line text-fg-muted group-hover:text-fg',
                )}
              >
                <Icon name={tab.icon} size={14} />
              </span>
              <span className="lg:flex-1">{tab.label}</span>
              <Icon
                name="chevronRight"
                size={14}
                className={cx('hidden transition-[opacity,translate] duration-200 lg:block motion-reduce:transition-none', isActive ? 'text-primary opacity-100' : 'opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60')}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SectionBanner({ tabId }: { tabId: SettingsTabId }) {
  const index = settingsTabs.findIndex((tab) => tab.id === tabId);
  const tab = settingsTabs[index];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-fg/[0.02] px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/35 bg-primary/12 text-primary">
        <Icon name={tab.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
          {translate('nav.settings')}
          <Icon name="chevronRight" size={11} />
        </p>
        <h2 className="truncate text-lg font-semibold tracking-tight text-fg">{tab.label}</h2>
      </div>
      <div aria-hidden="true" className="hidden items-center gap-1 sm:flex">
        {settingsTabs.map((item, dotIndex) => (
          <span
            key={item.id}
            className={cx('h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none', dotIndex === index ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong')}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-fg-muted tabular-nums">
        {pad2(index + 1)}/{pad2(settingsTabs.length)}
      </span>
    </div>
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

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
          <MemberPass sessionCount={sessions.length} onCompleteProfile={() => setActiveTab('profile')} />
          <SectionIndex value={activeTab} onChange={setActiveTab} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <SectionBanner tabId={activeTab} />
          <div key={activeTab} id={`settings-panel-${activeTab}`} role="tabpanel" className="animate-rise motion-reduce:animate-none">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'documents' && <DocumentsTab />}
            {activeTab === 'withdrawal' && <WithdrawalMethodsTab />}
            {activeTab === 'activities' && <ActivitiesTab {...sessionProps} />}
            {activeTab === 'security' && <SecurityTab {...sessionProps} />}
            {activeTab === 'email' && <EmailPreferencesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
