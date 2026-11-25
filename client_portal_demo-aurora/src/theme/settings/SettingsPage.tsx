'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Icon } from '../ui/Icon';
import '../promotion/market.css';
import './settings.css';
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

const RED = 'var(--aurora-cta-from)';
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const pad2 = (value: number) => String(value).padStart(2, '0');

/** Trader ID window: monogram as a ticker key with a scan line, name + email with a blinking caret, the complete-profile key, and a status board with LEDs over a scrolling status tape. */
function IdentityCard({ sessionCount, onCompleteProfile }: { sessionCount: number; onCompleteProfile: () => void }) {
  const facts = [
    { icon: 'kyc' as const, label: verificationStatus.heading, value: documentStatusLabel[verificationStatus.status], led: 'bg-warning text-warning' },
    { icon: 'lock' as const, label: securityCopy.passwordHeading, value: securityCopy.verified, led: 'bg-(--hero-buy) text-(--hero-buy)' },
    { icon: 'monitor' as const, label: sessionsCopy.heading, value: String(sessionCount), led: 'bg-(--aurora-cta-from) text-(--aurora-cta-from)' },
  ];
  const tapeItems = [...facts, ...facts];

  return (
    <section className={cx(panelClass, 'grid animate-rise lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] motion-reduce:animate-none')}>
      <div className="flex min-w-0 flex-col gap-5 border-b border-dashed border-line p-5 sm:p-6 lg:border-r lg:border-b-0">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
        </span>
        <div className="flex items-center gap-4">
          <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-(--hero-buy)/12 ring-1 ring-(--hero-buy)/30">
            <span aria-hidden="true" className="st-scan absolute inset-x-0 h-0.5 bg-(--hero-buy)" />
            <span className="font-mono text-2xl font-black tracking-tight text-(--hero-buy)">{accountIdentity.initials}</span>
            <span aria-hidden="true" className="absolute right-1 bottom-1 size-2 rounded-[2px] bg-(--aurora-cta-from)" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-4xl leading-none font-black tracking-tighter text-fg capitalize sm:text-5xl">{accountIdentity.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 truncate font-mono text-xs text-fg-muted">
              <span aria-hidden="true" className="text-(--hero-buy)">&gt;</span>
              {accountIdentity.email}
              <span aria-hidden="true" className="st-caret h-3.5 w-1.5 shrink-0 bg-(--aurora-cta-from)" />
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCompleteProfile}
          className="group/ink relative mt-auto inline-flex h-12 w-fit items-center gap-3 overflow-hidden rounded-lg bg-(--hero-buy) py-2 pr-2 pl-2 text-sm font-semibold text-[#062520] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
          <span style={{ background: RED }} className="relative grid size-8 place-items-center rounded-md">
            <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[8px] border-2 motion-reduce:hidden" />
            <Icon name="alert" size={14} className="relative" />
          </span>
          <span className="relative">{accountIdentity.completeCta}</span>
          <span className="relative grid size-8 place-items-center rounded-md bg-[#062520]/15 transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={13} />
          </span>
        </button>
      </div>

      <div className="flex min-w-0 flex-col">
        <dl className="flex flex-1 flex-col">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              style={staggerStyle(index + 1, 120)}
              className="flex min-w-0 flex-1 animate-feed-in items-center gap-3 border-b border-line/60 px-5 py-3.5 motion-reduce:animate-none sm:px-6"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fg/[0.05] text-fg ring-1 ring-line">
                <Icon name={fact.icon} size={15} />
              </span>
              <dt className="min-w-0 flex-1 truncate text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{fact.label}</dt>
              <dd className="shrink-0 truncate font-mono text-base font-black text-fg tabular-nums">{fact.value}</dd>
              <span aria-hidden="true" style={{ animationDelay: `${index * 0.3}s` }} className={cx('st-led size-2.5 shrink-0 rounded-[3px]', fact.led)} />
            </div>
          ))}
        </dl>
        <div aria-hidden="true" className="overflow-hidden bg-fg/[0.03] py-2">
          <div className="st-tape flex w-max gap-8 font-mono text-[11px] whitespace-nowrap text-fg-muted">
            {tapeItems.map((fact, index) => (
              <span key={index} className="flex items-center gap-2">
                <span className={cx('size-1.5 rounded-[2px]', fact.led)} />
                <span className="uppercase">{fact.label}</span>
                <span className="font-bold text-fg">{fact.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Sections as a row of terminal function keys (F1–F6) under a command line that names the active section; a segment track marks position. */
function SectionDial({ value, onChange }: { value: SettingsTabId; onChange: (value: SettingsTabId) => void }) {
  const activeIndex = settingsTabs.findIndex((tab) => tab.id === value);
  const activeTab = settingsTabs[activeIndex];

  return (
    <nav aria-label={translate('nav.settings')} style={staggerStyle(1, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
      <div className="flex flex-wrap items-center gap-3 border-b border-dashed border-line px-4 py-3 sm:px-5">
        <div key={activeTab.id} className="flex min-w-0 flex-1 animate-rise items-center gap-1.5 font-mono text-xs motion-reduce:animate-none">
          <span aria-hidden="true" className="text-(--hero-buy)">&gt;</span>
          <span className="text-fg-subtle">{translate('nav.settings')}</span>
          <Icon name="chevronRight" size={11} className="shrink-0 text-fg-subtle" />
          <span className="truncate font-bold text-fg">{activeTab.label}</span>
          <span aria-hidden="true" className="st-caret h-3.5 w-1.5 shrink-0 bg-(--aurora-cta-from)" />
        </div>
        <span aria-hidden="true" className="flex w-28 gap-1">
          {settingsTabs.map((tab, index) => (
            <span
              key={tab.id}
              className={cx(
                'h-2 min-w-0 flex-1 rounded-[2px] transition-colors duration-500',
                index === activeIndex ? 'bg-(--aurora-cta-from)' : index < activeIndex ? 'bg-(--hero-buy)' : 'bg-fg/12',
              )}
            />
          ))}
        </span>
        <p className="shrink-0 font-mono text-2xl leading-none font-black tracking-tighter text-fg tabular-nums">
          {pad2(activeIndex + 1)}
          <span className="text-sm text-fg-subtle">/{pad2(settingsTabs.length)}</span>
        </p>
      </div>

      <div role="tablist" className="flex overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
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
                'group relative flex min-w-36 shrink-0 animate-feed-in flex-col gap-3 border-r border-b border-dashed border-line px-4 py-3.5 text-left transition-[background-color] duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:animate-none sm:min-w-0',
                isActive ? 'bg-(--hero-buy)/10' : 'hover:bg-fg/[0.03]',
              )}
            >
              <span aria-hidden="true" className={cx('absolute inset-x-0 bottom-0 h-0.5 overflow-hidden', isActive ? 'bg-(--hero-buy)' : 'bg-transparent')}>
                {isActive && <span className="mkt-sweep absolute inset-y-0 w-10 bg-white/60" />}
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className={cx('rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ring-1', isActive ? 'bg-(--hero-buy) text-[#062520] ring-(--hero-buy)' : 'text-fg-subtle ring-line')}>
                  F{index + 1}
                </span>
                <span aria-hidden="true" className={cx('size-2 rounded-[2px]', isActive ? 'st-led bg-(--aurora-cta-from) text-(--aurora-cta-from)' : 'bg-fg/15')} />
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-md transition-transform duration-300 group-hover:-rotate-6',
                    isActive ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/[0.06] text-fg',
                  )}
                >
                  <Icon name={tab.icon} size={15} />
                </span>
                <span className={cx('min-w-0 flex-1 truncate text-sm font-bold', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Skeleton: terminal title bar → trader ID window (identity | status board + tape) → function-key bar → full-width active panel.
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile');
  const [sessions, setSessions] = useState(loginSessions);

  const revokeSession = (id: string) => setSessions((current) => current.filter((session) => session.current || session.id !== id));
  const sessionProps = { sessions, onRevoke: revokeSession };

  return (
    <div className="flex flex-col gap-6">
      <header className={cx(panelClass, 'flex animate-rise items-center gap-4 p-4 sm:p-5 motion-reduce:animate-none')}>
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25">
          <Icon name="settings" size={16} className="animate-rim-spin [animation-duration:8s] motion-reduce:animate-none" />
        </span>
        <h1 className="min-w-0 truncate text-2xl font-black tracking-tight text-fg">{translate('nav.settings')}</h1>
        <span aria-hidden="true" className="ml-auto hidden items-center gap-1.5 sm:flex">
          {settingsTabs.map((tab, index) => (
            <span key={tab.id} style={{ animationDelay: `${index * 0.2}s` }} className="st-led size-2 rounded-[2px] bg-(--hero-buy) text-(--hero-buy)" />
          ))}
        </span>
      </header>

      <IdentityCard sessionCount={sessions.length} onCompleteProfile={() => setActiveTab('profile')} />

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
  );
}
