'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const pad2 = (value: number) => String(value).padStart(2, '0');
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const DIAL_RADIUS = 40;

/** Identity on the frosted card: ink monogram, contact, the complete-profile pill and three status chips. */
function IdentityCard({ sessionCount, onCompleteProfile }: { sessionCount: number; onCompleteProfile: () => void }) {
  const facts = [
    { icon: 'kyc' as const, label: verificationStatus.heading, value: documentStatusLabel[verificationStatus.status], dot: 'bg-warning' },
    { icon: 'lock' as const, label: securityCopy.passwordHeading, value: securityCopy.verified, dot: 'bg-success' },
    { icon: 'monitor' as const, label: sessionsCopy.heading, value: String(sessionCount), dot: 'bg-[#0a1220]' },
  ];

  return (
    <FrostCard className="h-full">
      <div className="flex h-full flex-col gap-5 text-[#0a1220] sm:p-2">
        <div className="flex items-center gap-4">
          <span className="relative grid size-20 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-[#0a1220]/40 motion-reduce:animate-none" />
            <span className="grid size-16 place-items-center rounded-full bg-[#0a1220] font-mono text-xl font-black text-white shadow-[0_14px_28px_-14px_rgb(10_18_32/0.9)]">
              {accountIdentity.initials}
            </span>
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-3xl leading-tight font-black tracking-[-0.03em] capitalize">{accountIdentity.name}</h2>
            <p className="truncate font-mono text-xs font-medium text-[#3b4658]">{accountIdentity.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCompleteProfile}
          className="group/ink relative inline-flex h-11 w-fit items-center gap-2.5 overflow-hidden rounded-full bg-[#0a1220] py-1.5 pr-1.5 pl-4 text-sm font-semibold text-white transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
          <Icon name="alert" size={14} className="relative text-warning" />
          <span className="relative">{accountIdentity.completeCta}</span>
          <span className="relative grid size-8 place-items-center rounded-full bg-white text-[#0a1220] transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={13} />
          </span>
        </button>

        <dl className="mt-auto grid gap-2 border-t border-dotted border-[#0a1220]/25 pt-4 sm:grid-cols-3">
          {facts.map((fact, index) => (
            <div key={fact.label} style={staggerStyle(index + 1, 120)} className={cx('flex min-w-0 animate-feed-in items-center gap-2.5 rounded-[18px] p-2.5 motion-reduce:animate-none', frostChipClass)}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0a1220]/[0.07]">
                <Icon name={fact.icon} size={14} />
              </span>
              <div className="min-w-0">
                <dt className="truncate text-[10px] font-semibold tracking-wide text-[#3b4658] uppercase">{fact.label}</dt>
                <dd className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
                  <span aria-hidden="true" className={cx('size-1.5 rounded-full', fact.dot)} />
                  {fact.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </FrostCard>
  );
}

/** Sections as beads on a round dial; a dotted needle points at the open one and the hub names it. */
function SectionDial({ value, onChange }: { value: SettingsTabId; onChange: (value: SettingsTabId) => void }) {
  const activeIndex = settingsTabs.findIndex((tab) => tab.id === value);
  const activeTab = settingsTabs[activeIndex];
  const angleFor = (index: number) => -90 + (index * 360) / settingsTabs.length;

  return (
    <nav aria-label={translate('nav.settings')} style={staggerStyle(1, 140)} className="orbit-card nova-edge-light relative isolate animate-rise overflow-hidden p-5 motion-reduce:animate-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(circle,#000_20%,transparent_75%)]" />

      <div role="tablist" className="relative mx-auto hidden aspect-square w-full max-w-[22rem] sm:block">
        <span aria-hidden="true" style={{ inset: `${50 - DIAL_RADIUS}%` }} className="absolute rounded-full border border-dotted border-line-strong" />
        <span aria-hidden="true" className="absolute inset-[26%] animate-rim-spin rounded-full border border-dashed border-line [animation-duration:30s] motion-reduce:animate-none" />
        <span
          aria-hidden="true"
          style={{ rotate: `${angleFor(activeIndex)}deg`, width: `${DIAL_RADIUS - 12}%` }}
          className="absolute top-1/2 left-1/2 flex origin-left items-center transition-[rotate] duration-700 ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none"
        >
          <span className="flex-1 border-t-2 border-dotted border-fg/60" />
          <span className="size-2 rounded-full bg-fg" />
        </span>

        <div className="absolute inset-[30%] grid place-items-center rounded-full bg-surface text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ring-1 ring-line">
          <div key={activeTab.id} className="flex animate-rise flex-col items-center gap-1 px-2 motion-reduce:animate-none">
            <span className="nova-gloss grid size-10 place-items-center rounded-full text-fg">
              <Icon name={activeTab.icon} size={17} />
            </span>
            <p className="flex items-center gap-1 text-[10px] text-fg-subtle">
              {translate('nav.settings')}
              <Icon name="chevronRight" size={10} />
            </p>
            <p className="max-w-[7rem] text-sm leading-tight font-bold text-fg">{activeTab.label}</p>
            <p className="font-mono text-[10px] text-fg-muted tabular-nums">
              {pad2(activeIndex + 1)}/{pad2(settingsTabs.length)}
            </p>
          </div>
        </div>

        {settingsTabs.map((tab, index) => {
          const isActive = tab.id === value;
          const radians = (angleFor(index) * Math.PI) / 180;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              style={{ left: `${50 + DIAL_RADIUS * Math.cos(radians)}%`, top: `${50 + DIAL_RADIUS * Math.sin(radians)}%` }}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="relative grid size-12 place-items-center rounded-full bg-surface">
                {isActive && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'grid size-11 place-items-center rounded-full transition-[background-color,color,scale] duration-300 group-hover:scale-105 motion-reduce:transition-none',
                    isActive ? 'bg-fg text-app' : 'nova-gloss text-fg-muted group-hover:text-fg',
                  )}
                >
                  <Icon name={tab.icon} size={16} />
                </span>
              </span>
              <span className={cx('max-w-[6.5rem] rounded-full bg-surface px-1.5 text-center text-[11px] leading-tight font-semibold', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tablist" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 sm:hidden">
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
                'flex shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line',
              )}
            >
              <span className={cx('grid size-7 place-items-center rounded-full', isActive ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                <Icon name={tab.icon} size={13} />
              </span>
              <span className="font-mono text-[10px] opacity-60">{pad2(index + 1)}</span>
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
      <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
          <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
            <Icon name="settings" size={15} />
          </span>
        </span>
        <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.settings')}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <IdentityCard sessionCount={sessions.length} onCompleteProfile={() => setActiveTab('profile')} />
        <SectionDial value={activeTab} onChange={setActiveTab} />
      </div>

      <div key={activeTab} id={`settings-panel-${activeTab}`} role="tabpanel" className="min-w-0 animate-rise motion-reduce:animate-none">
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