'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import {
  ibCommissionSummary,
  ibFeeds,
  ibFunnel,
  ibNewAccounts,
  ibOverviewCopy as copy,
  ibRecentDeposits,
  ibSnapshot,
  ibSubIbs,
  periodOptions,
  scopeOptions,
  type IbFeedKey,
  type IbPeriod,
  type IbScope,
} from './ibOverviewData';

const cardClass = 'rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6';
const graphite = 'bg-[#18181b]';
const usd = (amount: number) => formatMoney(amount, 'USD');

function SectionHead({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {action ?? (note && <span className="text-xs text-fg-subtle">{note}</span>)}
    </header>
  );
}

function Segment<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (next: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-line bg-surface-2/60 p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-8 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isActive ? 'bg-primary text-on-primary' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Title strip with the scope and period switches ───────────── */

export function IbOverviewControls() {
  const [scope, setScope] = useState<IbScope>('total');
  const [period, setPeriod] = useState<IbPeriod>('mtd');

  return (
    <section className={cx(cardClass, 'flex flex-col gap-4 lg:col-span-12 lg:flex-row lg:items-center lg:justify-between')}>
      <div>
        <h2 className="text-xl font-semibold text-fg">{copy.title}</h2>
        <p className="mt-0.5 text-sm text-fg-muted">{copy.subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segment label={copy.scopeLabel} options={scopeOptions} value={scope} onChange={setScope} />
        <Segment label={copy.periodLabel} options={periodOptions} value={period} onChange={setPeriod} />
      </div>
    </section>
  );
}

/* ───────────── Snapshot: the eight headline figures as a two-column ledger ───────────── */

const snapshotIcons: IconName[] = ['user', 'trendUp', 'pieChart', 'wallet', 'transfer', 'wallet', 'history', 'checkCircle'];

export function IbSnapshotLedger() {
  return (
    <section className={cx(cardClass, 'lg:col-span-8')}>
      <SectionHead title={copy.snapshot} />
      <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
        {ibSnapshot.map((stat, index) => (
          <div key={stat.label} className="flex items-center gap-3 border-b border-dashed border-line py-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
            <span className="w-5 font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon name={snapshotIcons[index]} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <dt className="truncate text-sm text-fg-muted">{stat.label}</dt>
              {stat.caption && <span className="block truncate text-[11px] text-fg-subtle">{stat.caption}</span>}
            </span>
            <dd className="font-mono text-base font-semibold text-fg tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Commission summary: earned split into paid / pending / available ───────────── */

export function IbCommissionSummary() {
  const { totalEarned, paidOut, pending, available } = ibCommissionSummary;
  const share = (amount: number) => (totalEarned > 0 ? `${(amount / totalEarned) * 100}%` : '0%');
  const parts = [
    { label: copy.paidOut, amount: paidOut, bar: 'bg-fg-subtle', tone: 'text-fg' },
    { label: copy.pending, amount: pending, bar: 'bg-warning', tone: 'text-warning' },
    { label: copy.available, amount: available, bar: 'bg-success', tone: 'text-success' },
  ];

  return (
    <section className={cx('flex flex-col overflow-hidden rounded-3xl border border-line shadow-card lg:col-span-4')}>
      <div className={cx('p-5 text-white sm:p-6', graphite)}>
        <p className="text-sm font-semibold">{copy.commissionSummary}</p>
        <p className="text-[11px] text-white/50">{copy.commissionNote}</p>
        <p className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">{copy.totalEarned}</p>
        <p className="font-mono text-3xl font-semibold text-(--brand-gleam) tabular-nums">{usd(totalEarned)}</p>
        <div aria-hidden="true" className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/10">
          {parts.map((part) => (
            <span key={part.label} className={part.bar} style={{ width: share(part.amount) }} />
          ))}
        </div>
      </div>
      <ul className="flex flex-1 flex-col divide-y divide-line bg-surface px-5 sm:px-6">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center gap-3 py-3">
            <span aria-hidden="true" className={cx('size-2 rounded-full', part.bar)} />
            <span className="flex-1 text-sm text-fg-muted">{part.label}</span>
            <span className={cx('font-mono text-sm font-semibold tabular-nums', part.tone)}>{usd(part.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="bg-surface px-5 pb-5 sm:px-6 sm:pb-6">
        <Link
          href="/ib/transfer-commission"
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {copy.requestPayout}
          <Icon name="arrowUpRight" size={15} />
        </Link>
      </div>
    </section>
  );
}

/* ───────────── Client funnel: five numbered steps with step-to-step conversion ───────────── */

export function IbClientFunnel() {
  return (
    <section className={cx(cardClass, 'lg:col-span-7')}>
      <SectionHead title={copy.clientFunnel} note={copy.funnelNote} />
      <ol className="mt-4 flex flex-col gap-2">
        {ibFunnel.map((step, index) => {
          const previous = index > 0 ? ibFunnel[index - 1].value : null;
          const conversion = previous ? `${Math.round((step.value / previous) * 100)}%` : '—';
          return (
            <li key={step.label} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5" style={{ marginLeft: `${index * 4}%` }}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-[11px] font-bold text-primary">{index + 1}</span>
              <span className="flex-1 text-sm font-medium text-fg">{step.label}</span>
              {index > 0 && <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{conversion}</span>}
              <span className="w-10 text-right font-mono text-base font-semibold text-fg tabular-nums">{step.value}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ───────────── Sub-IB performance ───────────── */

export function IbSubIbPerformance() {
  return (
    <section className={cx(cardClass, 'lg:col-span-5')}>
      <SectionHead
        title={copy.subIbPerformance}
        action={
          <Link href="/ib/structure" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
            {copy.viewAll}
          </Link>
        }
      />
      <ul className="mt-4 flex flex-col gap-3">
        {ibSubIbs.map((subIb) => (
          <li key={subIb.id} className="rounded-2xl border border-line p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-(--brand-gleam) uppercase', graphite)}>
                {subIb.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-fg">{subIb.name}</span>
              <span
                className={cx(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1',
                  subIb.status === 'active' ? 'bg-success/10 text-success ring-success/25' : 'bg-danger/10 text-danger ring-danger/25',
                )}
              >
                {subIb.status}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 divide-x divide-line rounded-xl bg-surface-2/60 py-2.5">
              <div className="px-3">
                <dt className="text-[11px] text-fg-subtle">{copy.netDeposits}</dt>
                <dd className="font-mono font-semibold text-fg tabular-nums">{usd(subIb.netDeposits)}</dd>
              </div>
              <div className="px-3">
                <dt className="text-[11px] text-fg-subtle">{copy.commissionEarned}</dt>
                <dd className="font-mono font-semibold text-fg tabular-nums">{usd(subIb.commissionEarned)}</dd>
              </div>
            </dl>
            <p className="mt-2.5 text-xs text-fg-muted">
              {subIb.clients} {copy.client} · {subIb.activeTraders} {copy.activeTraders} · {subIb.lotsTraded} {copy.lotsTraded}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Network feed: the five network lists behind one tab strip ───────────── */

const feedIcons: Record<IbFeedKey, IconName> = { deposits: 'wallet', withdrawals: 'transfer', payouts: 'checkCircle', accounts: 'user', subIbRequests: 'clock' };

const feedRows: Record<IbFeedKey, number> = {
  deposits: ibRecentDeposits.length,
  withdrawals: 0,
  payouts: 0,
  accounts: ibNewAccounts.length,
  subIbRequests: 0,
};

function FeedRow({ name, account, badge, badgeTone, amount, ageDays }: { name: string; account: string; badge: string; badgeTone: string; amount?: number; ageDays: number }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg">{name}</span>
          <span className={cx('rounded-full px-2 py-px text-[10px] font-semibold ring-1', badgeTone)}>{badge}</span>
        </span>
        <span className="block font-mono text-xs text-fg-subtle">{account}</span>
      </span>
      <span className="text-right">
        {amount !== undefined && <span className="block font-mono text-sm font-semibold text-success tabular-nums">+ {usd(amount)}</span>}
        <span className="block text-[11px] text-fg-subtle">{ageDays}d ago</span>
      </span>
    </li>
  );
}

export function IbNetworkFeed() {
  const [active, setActive] = useState<IbFeedKey>('deposits');
  const feed = ibFeeds.find((item) => item.key === active) ?? ibFeeds[0];

  return (
    <section className={cx(cardClass, 'lg:col-span-12')}>
      <SectionHead title={copy.networkFeed} note={feed.caption} />
      <div role="tablist" aria-label={copy.networkFeed} className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {ibFeeds.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`ib-feed-tab-${item.key}`}
              aria-selected={isActive}
              aria-controls="ib-feed-panel"
              onClick={() => setActive(item.key)}
              className={cx(
                'flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive ? cx('border-transparent text-white', graphite) : 'border-line text-fg-muted hover:border-primary/50 hover:text-fg',
              )}
            >
              <Icon name={feedIcons[item.key]} size={15} className={isActive ? 'text-(--brand-gleam)' : undefined} />
              {item.title}
              <span className={cx('font-mono text-[11px] tabular-nums', isActive ? 'text-white/60' : 'text-fg-subtle')}>{feedRows[item.key]}</span>
            </button>
          );
        })}
      </div>

      <div id="ib-feed-panel" role="tabpanel" aria-labelledby={`ib-feed-tab-${active}`} className="mt-3">
        {active === 'deposits' && (
          <ul className="divide-y divide-line">
            {ibRecentDeposits.map((row) => (
              <FeedRow
                key={row.id}
                name={row.name}
                account={row.account}
                badge={row.status === 'pending' ? 'Pending' : 'Approved'}
                badgeTone={row.status === 'pending' ? 'bg-warning/10 text-warning ring-warning/25' : 'bg-success/10 text-success ring-success/25'}
                amount={row.amount}
                ageDays={row.ageDays}
              />
            ))}
          </ul>
        )}
        {active === 'accounts' && (
          <ul className="divide-y divide-line">
            {ibNewAccounts.map((row) => (
              <FeedRow key={row.id} name={row.name} account={row.account} badge="Opened" badgeTone="bg-primary/10 text-primary ring-primary/25" ageDays={row.ageDays} />
            ))}
          </ul>
        )}
        {feed.empty && (
          <p className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-10 text-center text-sm text-fg-muted">
            <Icon name={feedIcons[feed.key]} size={22} className="text-fg-subtle" />
            {feed.empty}
          </p>
        )}
      </div>
    </section>
  );
}
