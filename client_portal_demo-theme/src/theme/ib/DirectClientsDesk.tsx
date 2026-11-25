'use client';

import { useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { directClientsCopy as copy, type DirectClient, type DirectPeriod } from './ibDirectClientsData';

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;
const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
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
  if (/reject|never|fail|block|suspend/i.test(value)) return 'border-danger/40 text-danger';
  if (/approv|verif|active|funded/i.test(value)) return 'border-primary/50 text-primary';
  return 'border-line text-fg-muted';
}

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

/* ───────────── Header controls: period ticker + scope tabs ───────────── */

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
  const dateField = 'h-9 rounded-full border border-line bg-surface px-3 font-mono text-xs text-fg focus:border-primary focus:outline-none';

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div role="radiogroup" aria-label={copy.title} className="flex items-center gap-1 border-b border-line">
        {copy.periods.filter((option) => !only || only.includes(option.id)).map((option) => {
          const isActive = option.id === period;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onPeriod(option.id)}
              className={cx(
                'relative -mb-px px-3 pt-1 pb-2.5 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'text-primary' : 'text-fg-muted hover:text-fg',
              )}
            >
              {option.id === 'custom' && customLabel ? customLabel : option.label}
              <span
                aria-hidden="true"
                className={cx(
                  'absolute inset-x-2 bottom-0 h-0.5 origin-center rounded-full bg-primary transition-transform duration-300',
                  isActive ? 'scale-x-100' : 'scale-x-0',
                )}
              />
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
  const scopes: { id: NetworkScope; label: string; count: number }[] = [
    { id: 'direct', label: copy.tabDirect, count: directCount },
    { id: 'network', label: copy.tabNetwork, count: networkCount },
  ];

  return (
    <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-surface p-1 shadow-card ring-1 ring-line">
      {scopes.map((item) => {
        const isActive = item.id === scope;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cx(
              'flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-[#18181b] text-white' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
            <span
              className={cx(
                'grid min-w-6 place-items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                isActive ? 'bg-primary text-on-primary' : 'bg-surface-2 ring-1 ring-line',
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Ledger head: commission tile on graphite, three count tiles with share tracks ───────────── */

function ShareTrack({ value, total }: { value: number; total: number }) {
  const share = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-surface-2">
      <span style={{ width: `${share}%` }} className="block h-full origin-left animate-grow rounded-full bg-primary motion-reduce:animate-none" />
    </span>
  );
}

function LedgerHead({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
  const total = clients.length;
  const active = clients.filter((client) => isInRange(client.lastTradeAt, range)).length;
  const joined = clients.filter((client) => isInRange(client.joinedAt, range)).length;
  const commission = clients.reduce((sum, client) => sum + client.commission, 0);

  const counts: { label: string; hint: string; value: number; icon: IconName }[] = [
    { label: copy.kpiTotal, hint: copy.kpiTotalHint, value: total, icon: 'accounts' },
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: active, icon: 'history' },
    { label: copy.kpiNew, hint: copy.kpiNewHint, value: joined, icon: 'user' },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
      <div className="relative isolate flex animate-rise flex-col gap-2 overflow-hidden rounded-3xl bg-[#18181b] p-5 text-white ring-1 ring-primary/30 motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-16 -z-10 size-48 rounded-full bg-(--brand-gleam)/10 blur-3xl" />
        <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-white/50 uppercase">
          <Icon name="trophy" size={13} className="text-(--brand-gleam)" />
          {copy.kpiCommission}
        </span>
        <span className="truncate font-mono text-3xl font-semibold text-(--brand-gleam) tabular-nums">{formatMoney(commission, currency)}</span>
        <span className="mt-auto text-xs text-white/55">{copy.kpiCommissionHint}</span>
      </div>
      {counts.map((figure, index) => (
        <div key={figure.label} style={riseDelay(index + 1)} className="flex animate-rise flex-col gap-2 rounded-3xl border border-line bg-surface p-5 shadow-card motion-reduce:animate-none">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold tracking-[0.16em] text-fg-subtle uppercase">{figure.label}</span>
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon name={figure.icon} size={13} />
            </span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-semibold text-fg tabular-nums">{figure.value}</span>
            {index > 0 && <span className="font-mono text-xs text-fg-subtle tabular-nums">/ {total}</span>}
          </span>
          <ShareTrack value={figure.value} total={total} />
          <span className="text-xs text-fg-muted">{figure.hint}</span>
        </div>
      ))}
    </section>
  );
}

/* ───────────── Toolbar ───────────── */

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className={cx('relative flex h-10 items-center rounded-xl border pr-8 pl-3 transition-colors', value ? 'border-primary bg-primary/10' : 'border-line bg-surface hover:border-primary/50')}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cx('h-full cursor-pointer appearance-none bg-transparent text-xs font-semibold focus:outline-none [&>option]:bg-surface [&>option]:text-fg', value ? 'text-primary' : 'text-fg')}
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

/* ───────────── Banded ledger: columns grouped into Identity · Money · Activity · Standing ───────────── */

const th = 'px-3 py-2.5 text-left text-[10.5px] font-semibold whitespace-nowrap text-fg-subtle';
const td = 'px-3 py-3.5 whitespace-nowrap';
const num = 'text-right font-mono tabular-nums';

function BandedLedger({ rows, firstSerial, currency }: { rows: DirectClient[]; firstSerial: number; currency: string }) {
  const columns = copy.columns;
  const sum = (pick: (client: DirectClient) => number) => rows.reduce((total, client) => total + pick(client), 0);
  const deposits = sum((client) => client.deposits);
  const withdrawals = sum((client) => client.withdrawals);
  const bands: { label: string; span: number }[] = [
    { label: columns.clientName, span: 4 },
    { label: columns.deposits, span: 6 },
    { label: columns.lastLogin, span: 3 },
    { label: columns.accountStatus, span: 3 },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1480px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr aria-hidden="true">
            {bands.map((band, index) => (
              <th key={band.label} colSpan={band.span} className="px-3 pt-3 pb-1 text-left">
                <span className={cx('block h-0.5 rounded-full', index % 2 === 0 ? 'bg-primary/70' : 'bg-primary/30')} />
              </th>
            ))}
          </tr>
          <tr className="border-b border-line">
            <th className={cx(th, 'sticky left-0 z-10 bg-surface')}>{columns.serial}</th>
            <th className={cx(th, 'sticky left-10 z-10 bg-surface')}>{columns.clientName}</th>
            <th className={th}>{columns.phone}</th>
            <th className={th}>{columns.tradingAccount}</th>
            <th className={cx(th, 'text-right')}>{columns.deposits}</th>
            <th className={cx(th, 'text-right')}>{columns.withdrawals}</th>
            <th className={cx(th, 'text-right')}>{columns.netDeposit}</th>
            <th className={cx(th, 'text-right')}>{columns.lots}</th>
            <th className={cx(th, 'text-right')}>{columns.commission}</th>
            <th className={cx(th, 'text-right')}>{columns.equity}</th>
            <th className={th}>{columns.lastLogin}</th>
            <th className={th}>{columns.lastDeposit}</th>
            <th className={th}>{columns.lastWithdrawal}</th>
            <th className={th}>{columns.referralSource}</th>
            <th className={th}>{columns.accountStatus}</th>
            <th className={th}>{columns.kyc}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((client, index) => (
            <tr key={client.id} style={riseDelay(index)} className="group animate-rise motion-reduce:animate-none [&>td]:border-t [&>td]:border-line [&>td]:transition-colors hover:[&>td]:bg-primary/[0.04]">
              <td className={cx(td, 'sticky left-0 z-10 bg-surface font-mono text-xs text-fg-subtle')}>{String(firstSerial + index).padStart(2, '0')}</td>
              <td className={cx(td, 'sticky left-10 z-10 bg-surface')}>
                <span className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#18181b] text-[11px] font-bold text-(--brand-gleam)">{initials(client.name)}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-semibold text-fg">
                      {client.name}
                      {client.isIb && (
                        <span className="rounded border border-primary/50 px-1 text-[9px] font-bold tracking-[0.14em] text-primary uppercase">{copy.ibTag}</span>
                      )}
                    </span>
                    <span className="block text-xs text-fg-subtle">{client.email}</span>
                  </span>
                </span>
              </td>
              <td className={cx(td, 'font-mono text-xs text-fg')}>{client.phone}</td>
              <td className={cx(td, 'font-mono text-xs text-fg-muted')}>{client.tradingAccount ?? '—'}</td>
              <td className={cx(td, num, 'text-fg')}>{formatMoney(client.deposits, currency)}</td>
              <td className={cx(td, num, 'text-fg')}>{formatMoney(client.withdrawals, currency)}</td>
              <td className={cx(td, num, 'text-fg')}>{formatMoney(client.deposits - client.withdrawals, currency)}</td>
              <td className={cx(td, num, 'text-fg')}>{lotsFormat.format(client.lots)}</td>
              <td className={cx(td, num, 'font-semibold text-primary')}>{formatMoney(client.commission, currency)}</td>
              <td className={cx(td, num, 'text-fg')}>{formatMoney(client.equity, currency)}</td>
              <td className={cx(td, 'font-mono text-xs text-fg')}>{formatDay(client.lastLogin)}</td>
              <td className={cx(td, 'font-mono text-xs text-fg-muted')}>{formatDay(client.lastDeposit)}</td>
              <td className={cx(td, 'font-mono text-xs text-fg-muted')}>{formatDay(client.lastWithdrawal)}</td>
              <td className={cx(td, 'text-xs text-fg')}>{client.referralSource}</td>
              <td className={td}>
                <span className={cx('rounded-full border px-2.5 py-1 text-[11px] font-semibold', badgeTone(client.accountStatus))}>{client.accountStatus}</span>
              </td>
              <td className={td}>
                <span className={cx('rounded-full border px-2.5 py-1 text-[11px] font-semibold', badgeTone(client.kyc))}>{client.kyc}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="[&>td]:border-t-2 [&>td]:border-primary/40 [&>td]:bg-primary/[0.06]">
            <td className={cx(td, 'sticky left-0 z-10')} />
            <td className={cx(td, 'sticky left-10 z-10 font-semibold text-fg')}>
              {copy.total} <span className="font-normal text-primary">· {copy.thisPage}</span>
            </td>
            <td className={td} colSpan={2} />
            <td className={cx(td, num, 'font-bold text-fg')}>{formatMoney(deposits, currency)}</td>
            <td className={cx(td, num, 'font-bold text-fg')}>{formatMoney(withdrawals, currency)}</td>
            <td className={cx(td, num, 'font-bold text-fg')}>{formatMoney(deposits - withdrawals, currency)}</td>
            <td className={cx(td, num, 'font-bold text-fg')}>{lotsFormat.format(sum((client) => client.lots))}</td>
            <td className={cx(td, num, 'font-bold text-primary')}>{formatMoney(sum((client) => client.commission), currency)}</td>
            <td className={cx(td, num, 'font-bold text-fg')}>{formatMoney(sum((client) => client.equity), currency)}</td>
            <td className={td} colSpan={6} />
          </tr>
        </tfoot>
      </table>
    </div>
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

  const pagerButton =
    'grid size-9 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="flex flex-col gap-6">
      <LedgerHead clients={clients} range={range} currency={currency} />

      <section className={cx(cardClass, 'min-w-0 overflow-hidden')}>
        <div className="flex flex-col gap-3 p-4 sm:p-6 lg:flex-row lg:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 transition-colors focus-within:border-primary lg:max-w-sm">
            <Icon name="search" size={15} className="shrink-0 text-fg-subtle" />
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => withReset(setQuery)(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label={copy.status} value={status} options={distinct(clients.map((client) => client.accountStatus))} onChange={withReset(setStatus)} />
            <FilterSelect label={copy.kyc} value={kyc} options={distinct(clients.map((client) => client.kyc))} onChange={withReset(setKyc)} />
            <FilterSelect label={copy.referralSource} value={source} options={distinct(clients.map((client) => client.referralSource))} onChange={withReset(setSource)} />
          </div>
          <span className="text-xs text-fg-subtle lg:ml-auto" aria-live="polite">
            {copy.cameFromLink(fromLink, filtered.length)}
          </span>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="history" size={15} />
            {copy.exportCsv}
          </button>
        </div>

        {pageRows.length === 0 ? (
          <p className="border-t border-line px-6 py-12 text-center text-sm text-fg-muted">{copy.empty}</p>
        ) : (
          <BandedLedger rows={pageRows} firstSerial={firstIndex + 1} currency={currency} />
        )}

        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-2">
              <span className="font-mono font-bold text-fg">—</span>
              {copy.legendNoAccount}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="font-mono font-bold text-fg">{formatMoney(0, currency)}</span>
              {copy.legendNoActivity}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-fg-muted">
              {copy.showing(filtered.length === 0 ? 0 : firstIndex + 1, firstIndex + pageRows.length, filtered.length)}
            </p>
            {pageCount > 1 && (
              <>
                <button type="button" aria-label={copy.previous} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={pagerButton}>
                  <Icon name="chevronRight" size={14} className="rotate-180" />
                </button>
                <button type="button" aria-label={copy.next} disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className={pagerButton}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
