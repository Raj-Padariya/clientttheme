'use client';

import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { directClientsCopy as copy, type DirectClient, type DirectPeriod } from './ibDirectClientsData';

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const lotsFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface PeriodRange {
  from: number | null;
  to: number | null;
}

export function periodRange(period: DirectPeriod, customFrom: string, customTo: string, now = new Date()): PeriodRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  switch (period) {
    case 'today':
      return { from: Date.UTC(year, month, now.getUTCDate()), to: null };
    case '7d':
      return { from: now.getTime() - 7 * DAY_MS, to: null };
    case '30d':
      return { from: now.getTime() - 30 * DAY_MS, to: null };
    case 'mtd':
      return { from: Date.UTC(year, month, 1), to: null };
    case 'all':
      return { from: null, to: null };
    case 'custom':
      return {
        from: customFrom ? Date.parse(`${customFrom}T00:00:00Z`) : null,
        to: customTo ? Date.parse(`${customTo}T23:59:59Z`) : null,
      };
  }
}

export function isInRange(iso: string | null, range: PeriodRange): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return (range.from === null || time >= range.from) && (range.to === null || time <= range.to);
}

function formatDay(iso: string | null): string {
  return iso ? dayFormat.format(new Date(iso)) : '—';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function badgeTone(value: string): string {
  if (/reject|never|fail|block|suspend/i.test(value)) return 'bg-danger/10 text-danger ring-danger/30';
  if (/approv|verif|active|funded/i.test(value)) return 'bg-primary/12 text-primary ring-primary/35';
  return 'bg-surface-2 text-fg-muted ring-line';
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0;
}

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Header controls: period dial + scope switch ───────────── */

export function PeriodDial({ period, customFrom, customTo, onPeriod, onCustomFrom, onCustomTo, only, customLabel }: {
  /** Restrict the presets (e.g. the member overview has no Custom). Defaults to all of them. */
  only?: DirectPeriod[];
  customLabel?: string;
  period: DirectPeriod;
  customFrom: string;
  customTo: string;
  onPeriod: (period: DirectPeriod) => void;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
}) {
  const periods = only ? copy.periods.filter((option) => only.includes(option.id)) : copy.periods;
  const activeIndex = periods.findIndex((option) => option.id === period);
  const dateField =
    'h-9 min-w-0 rounded-xl bg-surface-2/60 px-3 font-mono text-xs text-fg ring-1 ring-line [color-scheme:dark] focus:outline-none focus:ring-primary/60';

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div
        role="radiogroup"
        aria-label={copy.title}
        className="relative grid rounded-full bg-surface-2/60 p-1 ring-1 ring-line"
        style={{ gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-full bg-primary/20 ring-1 ring-primary/50 transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none"
          style={{ width: `calc((100% - 0.5rem) / ${periods.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {periods.map((option) => {
          const isActive = option.id === period;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onPeriod(option.id)}
              className={cx(
                'relative h-8 min-w-12 rounded-full px-2.5 text-[11.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {option.id === 'custom' && customLabel ? customLabel : option.label}
            </button>
          );
        })}
      </div>
      {period === 'custom' && (
        <div className="flex animate-rise items-center gap-2 motion-reduce:animate-none">
          <label className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
            {copy.customFrom}
            <input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => onCustomFrom(event.target.value)} className={dateField} />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
            {copy.customTo}
            <input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => onCustomTo(event.target.value)} className={dateField} />
          </label>
        </div>
      )}
    </div>
  );
}

export type NetworkScope = 'direct' | 'network';

export function ScopeSwitch({ scope, directCount, networkCount, onChange }: {
  scope: NetworkScope;
  directCount: number;
  networkCount: number;
  onChange: (scope: NetworkScope) => void;
}) {
  const scopes: { id: NetworkScope; label: string; count: number; icon: IconName }[] = [
    { id: 'direct', label: copy.tabDirect, count: directCount, icon: 'user' },
    { id: 'network', label: copy.tabNetwork, count: networkCount, icon: 'accounts' },
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = scope === 'direct' ? 'network' : 'direct';
    onChange(next);
    document.getElementById(`ib-scope-${next}`)?.focus();
  }

  return (
    <div role="tablist" onKeyDown={handleKeyDown} className="flex flex-wrap gap-2">
      {scopes.map((item) => {
        const isActive = item.id === scope;
        return (
          <button
            key={item.id}
            id={`ib-scope-${item.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cx(
              'group relative flex h-12 items-center gap-3 overflow-hidden rounded-2xl pr-4 pl-1.5 text-sm font-semibold ring-1 transition-[background-color,box-shadow,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-primary/15 text-fg ring-primary/50' : 'bg-surface-2/40 text-fg-muted ring-line hover:text-fg',
            )}
          >
            <span
              className={cx(
                'grid size-9 place-items-center rounded-xl transition-colors',
                isActive ? 'bg-primary/25 text-primary' : 'bg-surface text-fg-subtle group-hover:text-primary',
              )}
            >
              <Icon name={item.icon} size={16} />
            </span>
            {item.label}
            <span
              className={cx(
                'rounded-full px-2 py-0.5 font-mono text-[10.5px] tabular-nums',
                isActive ? 'bg-primary text-on-primary' : 'bg-surface ring-1 ring-line',
              )}
            >
              {item.count}
            </span>
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-linear-to-r from-transparent via-primary to-transparent motion-safe:animate-pulse"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Pulse band: featured ring for the client base, metric rails for the period ───────────── */

const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function PulseBand({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
  const total = clients.length;
  const active = clients.filter((client) => isInRange(client.lastTradeAt, range)).length;
  const joined = clients.filter((client) => isInRange(client.joinedAt, range)).length;
  const commission = clients.reduce((sum, client) => sum + client.commission, 0);
  const activeShare = share(active, total);

  const rails: { label: string; hint: string; value: string; icon: IconName; percent: number | null }[] = [
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(active), icon: 'history', percent: share(active, total) },
    { label: copy.kpiNew, hint: copy.kpiNewHint, value: String(joined), icon: 'user', percent: share(joined, total) },
    { label: copy.kpiCommission, hint: copy.kpiCommissionHint, value: formatMoney(commission, currency), icon: 'trophy', percent: null },
  ];

  return (
    <section className="orbit-card grid overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)]">
      <div className="relative flex items-center gap-5 overflow-hidden border-b border-line p-5 sm:p-6 lg:border-r lg:border-b-0">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid size-32 shrink-0 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="6" className="text-surface-2" />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--brand-primary)"
              strokeOpacity="0.75"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - activeShare / 100)}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <span aria-hidden="true" className="absolute inset-0 animate-orbit [animation-duration:4s] motion-reduce:animate-none">
            <span className="absolute top-[7px] left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
          </span>
          <span className="relative text-center">
            <span className="block font-mono text-4xl font-bold text-fg tabular-nums">{total}</span>
          </span>
        </div>
        <div className="relative min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{copy.kpiTotal}</p>
          <p className="mt-1 text-sm text-fg-muted">{copy.kpiTotalHint}</p>
        </div>
      </div>

      <ul className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {rails.map((rail, index) => (
          <li key={rail.label} style={riseDelay(index)} className="flex animate-rise flex-col justify-between gap-4 p-5 motion-reduce:animate-none sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/30">
                <Icon name={rail.icon} size={15} />
              </span>
              <span className="text-xs font-semibold text-fg-muted">{rail.label}</span>
            </div>
            <p className="font-mono text-3xl font-bold text-fg tabular-nums">{rail.value}</p>
            <div className="flex flex-col gap-2">
              {rail.percent === null ? (
                <span aria-hidden="true" className="h-1.5 rounded-full bg-[repeating-linear-gradient(90deg,var(--brand-primary)_0_6px,transparent_6px_12px)] opacity-30" />
              ) : (
                <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-linear-to-r from-primary/35 to-primary/75 transition-[width] duration-700"
                    style={{ width: `${Math.max(rail.percent, 2)}%` }}
                  />
                </span>
              )}
              <span className="text-xs text-fg-subtle">{rail.hint}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Command dock: search, filter pills, link meter, export ───────────── */

function FilterPill({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label
      className={cx(
        'relative flex h-10 items-center gap-2 rounded-full pr-8 pl-3.5 ring-1 transition-colors focus-within:ring-primary/60',
        value ? 'bg-primary/12 ring-primary/40' : 'bg-surface-2/50 ring-line hover:bg-surface-2',
      )}
    >
      <Icon name="sliders" size={12} className={cx('shrink-0', value ? 'text-primary' : 'text-fg-subtle')} />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cx(
          'h-full cursor-pointer appearance-none bg-transparent text-xs font-semibold focus:outline-none [&>option]:bg-surface [&>option]:text-fg',
          value ? 'text-primary' : 'text-fg',
        )}
      >
        <option value="">
          {label}: {copy.all}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {label}: {option}
          </option>
        ))}
      </select>
      <Icon name="chevronRight" size={11} className="pointer-events-none absolute right-3 rotate-90 text-fg-subtle" />
    </label>
  );
}

function LinkMeter({ count, total }: { count: number; total: number }) {
  const percent = share(count, total);
  return (
    <span className="inline-flex items-center gap-2 text-xs text-fg-muted">
      <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-2" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="2.5"
          strokeDasharray={2 * Math.PI * 8}
          strokeDashoffset={2 * Math.PI * 8 * (1 - percent / 100)}
        />
      </svg>
      {copy.cameFromLink(count, total)}
    </span>
  );
}

/* ───────────── Client dossier: identity, money ribbon, activity timeline, standing badges ───────────── */

function MoneyCell({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2/40 px-3 py-2 ring-1 ring-line">
      <p className="truncate text-[10px] text-fg-subtle">{label}</p>
      <p className={cx('truncate font-mono text-sm font-semibold tabular-nums', emphasis ? 'text-primary' : 'text-fg')}>{value}</p>
    </div>
  );
}

function ClientDossier({ client, serial, currency, index }: { client: DirectClient; serial: number; currency: string; index: number }) {
  const net = client.deposits - client.withdrawals;
  const timeline: { label: string; value: string | null }[] = [
    { label: copy.columns.lastLogin, value: client.lastLogin },
    { label: copy.columns.lastDeposit, value: client.lastDeposit },
    { label: copy.columns.lastWithdrawal, value: client.lastWithdrawal },
  ];

  return (
    <li style={riseDelay(index)} className="group relative grid animate-rise gap-5 px-4 py-5 transition-colors hover:bg-surface-2/30 motion-reduce:animate-none sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
      <span aria-hidden="true" className="absolute inset-y-4 left-0 w-1 origin-center scale-y-0 rounded-r-full bg-primary/70 transition-transform duration-300 group-hover:scale-y-100" />

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="w-6 shrink-0 font-mono text-[11px] text-fg-subtle tabular-nums" aria-label={copy.columns.serial}>
            {String(serial).padStart(2, '0')}
          </span>
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full">
            {client.isIb && (
              <span
                aria-hidden="true"
                className="absolute -inset-0.5 animate-orbit rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_40%,transparent_65%,var(--brand-primary))] [animation-duration:4s] motion-reduce:animate-none"
              />
            )}
            <span className="relative grid size-full place-items-center rounded-full bg-surface-2 text-xs font-bold text-primary ring-2 ring-surface">{initials(client.name)}</span>
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
              <span className="truncate">{client.name}</span>
              {client.isIb && (
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-primary uppercase ring-1 ring-primary/40">{copy.ibTag}</span>
              )}
            </p>
            <p className="truncate text-xs text-fg-subtle">{client.email}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="min-w-0">
            <dt className="text-[10px] text-fg-subtle">{copy.columns.phone}</dt>
            <dd className="truncate font-mono text-fg">{client.phone}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] text-fg-subtle">{copy.columns.tradingAccount}</dt>
            <dd className="truncate font-mono text-fg">{client.tradingAccount ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MoneyCell label={copy.columns.deposits} value={formatMoney(client.deposits, currency)} />
          <MoneyCell label={copy.columns.withdrawals} value={formatMoney(client.withdrawals, currency)} />
          <MoneyCell label={copy.columns.netDeposit} value={formatMoney(net, currency)} />
          <MoneyCell label={copy.columns.lots} value={lotsFormat.format(client.lots)} />
          <MoneyCell label={copy.columns.commission} value={formatMoney(client.commission, currency)} emphasis />
          <MoneyCell label={copy.columns.equity} value={formatMoney(client.equity, currency)} />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ol className="relative flex min-w-0 flex-1 items-start gap-4">
            <span aria-hidden="true" className="absolute top-[5px] right-6 left-1 h-px bg-[repeating-linear-gradient(90deg,var(--color-line)_0_4px,transparent_4px_8px)]" />
            {timeline.map((step) => (
              <li key={step.label} className="relative flex min-w-0 flex-1 flex-col gap-1">
                <span
                  aria-hidden="true"
                  className={cx('size-2.5 rounded-full ring-2 ring-surface', step.value ? 'bg-primary' : 'bg-surface-2 outline outline-1 outline-line')}
                />
                <span className="truncate text-[10px] text-fg-subtle">{step.label}</span>
                <span className="truncate font-mono text-xs text-fg">{formatDay(step.value)}</span>
              </li>
            ))}
          </ol>
          <dl className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full bg-surface-2/50 py-1 pr-2.5 pl-2 text-[11px] ring-1 ring-line">
              <dt className="sr-only">{copy.columns.referralSource}</dt>
              <Icon name="accounts" size={11} className="text-primary" />
              <dd className="font-semibold text-fg">{client.referralSource}</dd>
            </div>
            <div className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', badgeTone(client.accountStatus))}>
              <dt className="sr-only">{copy.columns.accountStatus}</dt>
              <dd>{client.accountStatus}</dd>
            </div>
            <div className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', badgeTone(client.kyc))}>
              <dt className="sr-only">{copy.columns.kyc}</dt>
              <dd>{client.kyc}</dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
}

function TotalsStrip({ rows, currency }: { rows: DirectClient[]; currency: string }) {
  const sum = (pick: (client: DirectClient) => number) => rows.reduce((total, client) => total + pick(client), 0);
  const deposits = sum((client) => client.deposits);
  const withdrawals = sum((client) => client.withdrawals);
  const figures: { label: string; value: string; emphasis?: boolean }[] = [
    { label: copy.columns.deposits, value: formatMoney(deposits, currency) },
    { label: copy.columns.withdrawals, value: formatMoney(withdrawals, currency) },
    { label: copy.columns.netDeposit, value: formatMoney(deposits - withdrawals, currency) },
    { label: copy.columns.lots, value: lotsFormat.format(sum((client) => client.lots)) },
    { label: copy.columns.commission, value: formatMoney(sum((client) => client.commission), currency), emphasis: true },
    { label: copy.columns.equity, value: formatMoney(sum((client) => client.equity), currency) },
  ];

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-primary/[0.05] px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
      <p className="shrink-0 text-sm font-bold text-fg lg:w-48">
        {copy.total} <span className="font-normal text-primary">· {copy.thisPage}</span>
      </p>
      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        {figures.map((figure) => (
          <div key={figure.label} className="min-w-0">
            <dt className="truncate text-[10px] text-fg-subtle">{figure.label}</dt>
            <dd className={cx('truncate font-mono text-sm font-bold tabular-nums', figure.emphasis ? 'text-primary' : 'text-fg')}>{figure.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: DirectClient[]) {
  const columns = copy.columns;
  const header = [
    columns.serial, columns.clientName, 'Email', columns.phone, columns.tradingAccount, columns.deposits, columns.withdrawals, columns.netDeposit,
    columns.lots, columns.commission, columns.equity, columns.lastLogin, columns.lastDeposit, columns.lastWithdrawal, columns.referralSource,
    columns.accountStatus, columns.kyc,
  ];
  const lines = rows.map((client, index) => [
    index + 1, client.name, client.email, client.phone, client.tradingAccount ?? '', client.deposits.toFixed(2), client.withdrawals.toFixed(2),
    (client.deposits - client.withdrawals).toFixed(2), client.lots.toFixed(2), client.commission.toFixed(2), client.equity.toFixed(2),
    client.lastLogin ? formatDay(client.lastLogin) : '', client.lastDeposit ? formatDay(client.lastDeposit) : '',
    client.lastWithdrawal ? formatDay(client.lastWithdrawal) : '', client.referralSource, client.accountStatus, client.kyc,
  ]);
  const csv = [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'my-network-direct-clients.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function PagerButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-xl text-fg-muted ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function DirectClientsDesk({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [kyc, setKyc] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);

  const distinct = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const needle = query.trim().toLowerCase();
  const filtered = clients.filter(
    (client) =>
      (needle === '' || [client.name, client.email, client.phone].some((field) => field.toLowerCase().includes(needle))) &&
      (status === '' || client.accountStatus === status) &&
      (kyc === '' || client.kyc === kyc) &&
      (source === '' || client.referralSource === source),
  );
  const fromLink = filtered.filter((client) => client.cameFromLink).length;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  function withReset(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <PulseBand clients={clients} range={range} currency={currency} />

      <section className="orbit-card min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="group flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface-2/60 px-4 ring-1 ring-line transition-shadow focus-within:ring-primary/60">
              <Icon name="search" size={16} className="shrink-0 text-fg-subtle group-focus-within:text-primary" />
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => withReset(setQuery)(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button type="button" onClick={() => withReset(setQuery)('')} aria-label={copy.all} className="grid size-7 place-items-center rounded-lg text-fg-muted hover:text-fg">
                  <Icon name="close" size={13} />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary/15 px-4 text-sm font-semibold text-primary ring-1 ring-primary/40 transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="history" size={15} />
              {copy.exportCsv}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill label={copy.status} value={status} options={distinct(clients.map((client) => client.accountStatus))} onChange={withReset(setStatus)} />
            <FilterPill label={copy.kyc} value={kyc} options={distinct(clients.map((client) => client.kyc))} onChange={withReset(setKyc)} />
            <FilterPill label={copy.referralSource} value={source} options={distinct(clients.map((client) => client.referralSource))} onChange={withReset(setSource)} />
            <span className="ml-auto" aria-live="polite">
              <LinkMeter count={fromLink} total={filtered.length} />
            </span>
          </div>
        </div>

        {pageRows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-fg-muted">{copy.empty}</p>
        ) : (
          <ol className="divide-y divide-line">
            {pageRows.map((client, index) => (
              <ClientDossier key={client.id} client={client} serial={firstIndex + index + 1} currency={currency} index={index} />
            ))}
          </ol>
        )}

        <TotalsStrip rows={pageRows} currency={currency} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-xs text-fg-subtle sm:px-6">
          <span className="inline-flex items-center gap-2">
            <span className="font-mono font-bold text-fg">—</span>
            {copy.legendNoAccount}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="font-mono font-bold text-fg">{formatMoney(0, currency)}</span>
            {copy.legendNoActivity}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
          <p className="text-xs text-fg-muted">
            {copy.showing(filtered.length === 0 ? 0 : firstIndex + 1, firstIndex + pageRows.length, filtered.length)}
          </p>
          {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <PagerButton label={copy.previous} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <Icon name="chevronRight" size={14} className="rotate-180" />
            </PagerButton>
            <span className="font-mono text-xs text-fg-muted tabular-nums">
              {currentPage}/{pageCount}
            </span>
            <PagerButton label={copy.next} disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
              <Icon name="chevronRight" size={14} />
            </PagerButton>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
