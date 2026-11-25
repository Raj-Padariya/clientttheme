'use client';

import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { DatePicker } from '../ui/DatePicker';
import { Dropdown, type DropdownOption } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { directClientsCopy as copy, type DirectClient, type DirectPeriod } from './ibDirectClientsData';

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;
const LINK_PIXELS = 10;
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const lotsFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/*
 * Zenith direct clients (Vaulto language): an open total beside a capsule skyline (one capsule per client, height =
 * commission, lit = active, red pixel = new) with a red wave rolling across it, KPI capsule tracks, a capsule command
 * dock, client ledger rows, a dashed totals strip with a deposit/withdrawal flow track, and a pixel pager.
 */
const RED = 'var(--zenith-red)';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] ring-1 ring-line';
const openClass = 'relative rounded-[32px] border border-dashed border-line-strong';
const captionClass = 'text-[10px] font-semibold tracking-[0.14em] uppercase';

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
  if (/approv|verif|active|funded/i.test(value)) return 'bg-success/12 text-success ring-success/30';
  return 'bg-fg/[0.05] text-fg-muted ring-line';
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0;
}

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

/* ───────────── Header controls: period capsule dock + scope capsule switch ───────────── */

export function PeriodDial({ period, customFrom, customTo, onPeriod, onCustomFrom, onCustomTo, only, customLabel, layout = 'row' }: {
  /** Restrict the presets (e.g. the member overview has no Custom). Defaults to all of them. */
  only?: DirectPeriod[];
  customLabel?: string;
  /** `rail` packs the pills into a 3-column grid for a narrow side panel. */
  layout?: 'row' | 'rail';
  period: DirectPeriod;
  customFrom: string;
  customTo: string;
  onPeriod: (period: DirectPeriod) => void;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
}) {
  const fieldId = useId();
  const periods = only ? copy.periods.filter((option) => only.includes(option.id)) : copy.periods;
  const isRail = layout === 'rail';

  return (
    <div className={cx('flex flex-col gap-3', !isRail && 'items-stretch sm:items-end')}>
      <div
        role="radiogroup"
        aria-label={copy.title}
        className={cx('bg-fg/[0.03] p-1 ring-1 ring-line', isRail ? 'grid grid-cols-3 gap-1 rounded-[22px]' : 'flex flex-wrap gap-1 rounded-[24px] sm:rounded-full')}
      >
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
                'group/period relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-bold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
              )}
            >
              <span
                aria-hidden="true"
                style={isActive ? { background: RED } : undefined}
                className={cx('size-1.5 shrink-0 rounded-[2px] transition-colors', isActive ? 'zenith-blink' : 'bg-fg/25 group-hover/period:bg-fg/60')}
              />
              {option.id === 'custom' && customLabel ? customLabel : option.label}
            </button>
          );
        })}
      </div>
      {period === 'custom' && (
        <div className={cx('flex animate-feed-in gap-2 motion-reduce:animate-none', isRail ? 'flex-col' : 'flex-col sm:flex-row')}>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`${fieldId}-from`} className={cx(captionClass, 'text-fg-subtle')}>
              {copy.customFrom}
            </label>
            <DatePicker id={`${fieldId}-from`} value={customFrom} max={customTo || undefined} onChange={onCustomFrom} />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`${fieldId}-to`} className={cx(captionClass, 'text-fg-subtle')}>
              {copy.customTo}
            </label>
            <DatePicker id={`${fieldId}-to`} value={customTo} onChange={onCustomTo} />
          </div>
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
    const isMove = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key);
    if (!isMove) return;
    event.preventDefault();
    const next = scope === 'direct' ? 'network' : 'direct';
    onChange(next);
    document.getElementById(`ib-scope-${next}`)?.focus();
  }

  return (
    <div role="tablist" onKeyDown={handleKeyDown} className="grid grid-cols-2 gap-1 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
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
              'group relative flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-1.5 pl-1 text-left text-sm font-bold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            <span
              style={isActive ? { background: RED } : undefined}
              className={cx(
                'grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none',
                isActive ? 'text-white' : 'bg-fg/[0.06] text-fg',
              )}
            >
              <Icon name={item.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span
              key={item.count}
              className={cx(
                'grid h-7 min-w-7 animate-dot-pop place-items-center rounded-full px-2 font-mono text-xs font-black tabular-nums motion-reduce:animate-none',
                isActive ? 'bg-app/15' : 'bg-fg/[0.06] text-fg',
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

/* ───────────── Client skyline: one capsule per client, height = commission ───────────── */

function KpiTrack({ label, hint, value, icon, percent, index }: { label: string; hint: string; value: string; icon: IconName; percent: number | null; index: number }) {
  return (
    <li style={stagger(index, 90, 350)} className="group/kpi flex min-w-0 animate-feed-in flex-col gap-2.5 motion-reduce:animate-none">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-app transition-transform duration-300 group-hover/kpi:-rotate-12 motion-reduce:transition-none">
            <Icon name={icon} size={14} />
          </span>
          <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
        </span>
        {percent !== null && <span className="shrink-0 font-mono text-[11px] font-black text-fg-subtle tabular-nums">{Math.round(percent)}%</span>}
      </span>
      <span className="truncate font-mono text-3xl font-black tracking-tight text-fg tabular-nums">{value}</span>
      {percent === null ? (
        <span aria-hidden="true" className="relative h-2.5 overflow-hidden rounded-full border border-dashed border-fg/30">
          <span className="zenith-scan-x absolute inset-y-0 w-8 bg-fg/25 motion-reduce:hidden" />
        </span>
      ) : (
        <span aria-hidden="true" className="relative h-2.5 overflow-hidden rounded-full bg-fg/10">
          <span style={{ width: `${Math.max(percent, percent > 0 ? 4 : 0)}%` }} className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-fg motion-reduce:animate-none">
            {percent > 0 && <span style={{ background: RED }} className="absolute inset-y-0 right-0 w-2.5 rounded-full" />}
          </span>
        </span>
      )}
      <span className="text-[11px] text-fg-subtle">{hint}</span>
    </li>
  );
}

function ClientSkyline({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
  const total = clients.length;
  const active = clients.filter((client) => isInRange(client.lastTradeAt, range)).length;
  const joined = clients.filter((client) => isInRange(client.joinedAt, range)).length;
  const commission = clients.reduce((sum, client) => sum + client.commission, 0);
  const topCommission = Math.max(0, ...clients.map((client) => client.commission));

  const tracks: { label: string; hint: string; value: string; icon: IconName; percent: number | null }[] = [
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(active), icon: 'history', percent: share(active, total) },
    { label: copy.kpiNew, hint: copy.kpiNewHint, value: String(joined), icon: 'user', percent: share(joined, total) },
    { label: copy.kpiCommission, hint: copy.kpiCommissionHint, value: formatMoney(commission, currency), icon: 'trophy', percent: null },
  ];

  return (
    <section className={cx(panelClass, 'zenith-tile flex flex-col gap-6 p-5 sm:p-6')}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-end">
        <div className="flex min-w-0 flex-col gap-3">
          <p className={cx(captionClass, 'flex items-center gap-2 text-fg-subtle')}>
            <span aria-hidden="true" className="relative flex size-2.5">
              <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
              <span style={{ background: RED }} className="relative size-2.5 rounded-full" />
            </span>
            {copy.kpiTotal}
          </p>
          <p className="font-mono text-7xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums">{total}</p>
          <p className="text-sm text-fg-muted">{copy.kpiTotalHint}</p>
        </div>

        {/* Skyline: every capsule is one real client; its height is the commission it brought. */}
        <div className="flex min-w-0 flex-col gap-3">
          <div aria-hidden="true" className="relative flex h-40 items-end gap-1 border-b border-dashed border-line-strong pb-1">
            {clients.map((client, index) => {
              const isActive = isInRange(client.lastTradeAt, range);
              const isNew = isInRange(client.joinedAt, range);
              const height = topCommission > 0 ? Math.max(10, (client.commission / topCommission) * 100) : 10;
              return (
                <span key={client.id} title={client.name} className="relative flex h-full min-w-1 max-w-4 flex-1 flex-col items-center justify-end gap-1">
                  {isNew && <span style={{ ...stagger(index, 30, 700), background: RED }} className="zenith-pixel size-2 shrink-0 rounded-[2px]" />}
                  <span
                    style={{ ...stagger(index, 30, 150), height: `${height}%` }}
                    className={cx('zenith-rise relative w-full overflow-hidden rounded-full', isActive ? 'bg-fg' : 'bg-fg/15')}
                  >
                    <span className="absolute inset-0 opacity-60">
                      <span style={{ background: RED, animationDelay: `${index * 0.07}s` }} className="zenith-wave block size-full motion-reduce:hidden" />
                    </span>
                  </span>
                </span>
              );
            })}
          </div>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-3 w-1.5 rounded-full bg-fg" />
              {copy.kpiActive}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" style={{ background: RED }} className="size-2 rounded-[2px]" />
              {copy.kpiNew}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="trophy" size={11} />
              {copy.kpiCommission}
            </span>
          </span>
        </div>
      </div>

      <ul className="grid gap-5 border-t border-dashed border-line-strong pt-5 sm:grid-cols-3">
        {tracks.map((track, index) => (
          <KpiTrack key={track.label} {...track} index={index} />
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Command dock: search, filter dropdowns, link meter, export ───────────── */

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const items: DropdownOption<string>[] = [{ value: '', label: copy.all }, ...options.map((option) => ({ value: option, label: option }))];
  return <Dropdown label={label} icon="sliders" value={value} options={items} onChange={onChange} className="min-w-44 flex-1 sm:flex-none" />;
}

function LinkMeter({ count, total }: { count: number; total: number }) {
  const lit = Math.round((share(count, total) / 100) * LINK_PIXELS);
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full bg-fg/[0.03] py-1.5 pr-3.5 pl-2.5 text-xs text-fg-muted ring-1 ring-line">
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: LINK_PIXELS }, (_, pixel) => (
          <span
            key={pixel}
            style={pixel === lit - 1 ? { background: RED } : undefined}
            className={cx('size-2 rounded-[2px] transition-colors duration-300', pixel < lit ? 'bg-fg' : 'bg-fg/12')}
          />
        ))}
      </span>
      {copy.cameFromLink(count, total)}
    </span>
  );
}

/* ───────────── Client ledger row: identity, money columns, capsule timeline, standing chips ───────────── */

function MoneyCell({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 border-l-2 border-dashed border-line-strong pl-3">
      <dt className="truncate text-[10.5px] text-fg-subtle">{label}</dt>
      <dd className={cx('truncate font-mono text-sm font-black tabular-nums', emphasis ? 'text-success' : 'text-fg')}>{value}</dd>
    </div>
  );
}

function ClientRow({ client, serial, currency, index }: { client: DirectClient; serial: number; currency: string; index: number }) {
  const net = client.deposits - client.withdrawals;
  const timeline: { label: string; value: string | null }[] = [
    { label: copy.columns.lastLogin, value: client.lastLogin },
    { label: copy.columns.lastDeposit, value: client.lastDeposit },
    { label: copy.columns.lastWithdrawal, value: client.lastWithdrawal },
  ];

  return (
    <li
      style={stagger(index, 60)}
      className="group zenith-tile relative grid min-w-0 gap-4 rounded-[28px] bg-fg/[0.02] p-4 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:bg-fg/[0.04] hover:ring-line-strong motion-reduce:transition-none sm:p-5 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-12 shrink-0 place-items-center">
            <span
              className={cx(
                'grid size-12 place-items-center rounded-[16px] text-sm font-black transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
                client.isIb ? 'bg-fg text-app' : 'bg-fg/[0.06] text-fg ring-1 ring-line',
              )}
            >
              {initials(client.name)}
            </span>
            {client.isIb && <span aria-hidden="true" style={{ background: RED }} className="absolute -top-1 -right-1 size-3 rounded-[3px] ring-2 ring-app" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-black text-fg">
              <span className="truncate">{client.name}</span>
              {client.isIb && <span className="shrink-0 rounded-full bg-fg px-1.5 py-0.5 text-[9px] font-black tracking-[0.14em] text-app uppercase">{copy.ibTag}</span>}
            </p>
            <p className="truncate text-xs text-fg-subtle">{client.email}</p>
          </div>
          <span className="shrink-0 self-start rounded-full bg-fg/[0.05] px-2 py-1 font-mono text-[10.5px] font-black text-fg-muted tabular-nums" aria-label={copy.columns.serial}>
            #{String(serial).padStart(2, '0')}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-1.5">
          <div className="min-w-0 rounded-full bg-fg/[0.03] px-3 py-1.5 ring-1 ring-line">
            <dt className="flex items-center gap-1 text-[10px] text-fg-subtle">
              <Icon name="user" size={10} />
              {copy.columns.phone}
            </dt>
            <dd className="truncate font-mono text-xs font-bold text-fg">{client.phone}</dd>
          </div>
          <div className="min-w-0 rounded-full bg-fg/[0.03] px-3 py-1.5 ring-1 ring-line">
            <dt className="flex items-center gap-1 text-[10px] text-fg-subtle">
              <Icon name="accounts" size={10} />
              {copy.columns.tradingAccount}
            </dt>
            <dd className="truncate font-mono text-xs font-bold text-fg">{client.tradingAccount ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 2xl:grid-cols-6">
          <MoneyCell label={copy.columns.deposits} value={formatMoney(client.deposits, currency)} />
          <MoneyCell label={copy.columns.withdrawals} value={formatMoney(client.withdrawals, currency)} />
          <MoneyCell label={copy.columns.netDeposit} value={formatMoney(net, currency)} />
          <MoneyCell label={copy.columns.lots} value={lotsFormat.format(client.lots)} />
          <MoneyCell label={copy.columns.commission} value={formatMoney(client.commission, currency)} emphasis />
          <MoneyCell label={copy.columns.equity} value={formatMoney(client.equity, currency)} />
        </dl>

        <div className="flex flex-col gap-3 border-t border-dashed border-line-strong pt-3 lg:flex-row lg:items-end">
          {/* Activity: three capsule segments; a solid segment means the event has happened. */}
          <ol className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
            {timeline.map((step) => (
              <li key={step.label} className="flex min-w-0 flex-col gap-1">
                <span aria-hidden="true" className={cx('h-1.5 rounded-full', step.value ? 'bg-fg' : 'border border-dashed border-fg/30')} />
                <span className="truncate text-[10px] text-fg-subtle">{step.label}</span>
                <span className="truncate font-mono text-[11px] font-bold text-fg">{formatDay(step.value)}</span>
              </li>
            ))}
          </ol>

          <dl className="flex shrink-0 flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full bg-fg py-1 pr-2.5 pl-1 text-[11px] text-app">
              <dt className="sr-only">{copy.columns.referralSource}</dt>
              <span aria-hidden="true" style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-white">
                <Icon name="accounts" size={10} />
              </span>
              <dd className="font-bold">{client.referralSource}</dd>
            </div>
            <div className={cx('rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', badgeTone(client.accountStatus))}>
              <dt className="sr-only">{copy.columns.accountStatus}</dt>
              <dd>{client.accountStatus}</dd>
            </div>
            <div className={cx('rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', badgeTone(client.kyc))}>
              <dt className="sr-only">{copy.columns.kyc}</dt>
              <dd>{client.kyc}</dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
}

/* ───────────── Totals strip: page sums + a deposits-vs-withdrawals flow track ───────────── */

function TotalsStrip({ rows, currency }: { rows: DirectClient[]; currency: string }) {
  const sum = (pick: (client: DirectClient) => number) => rows.reduce((total, client) => total + pick(client), 0);
  const deposits = sum((client) => client.deposits);
  const withdrawals = sum((client) => client.withdrawals);
  const depositShare = share(deposits, deposits + withdrawals);
  const figures: { label: string; value: string; emphasis?: boolean }[] = [
    { label: copy.columns.deposits, value: formatMoney(deposits, currency) },
    { label: copy.columns.withdrawals, value: formatMoney(withdrawals, currency) },
    { label: copy.columns.netDeposit, value: formatMoney(deposits - withdrawals, currency) },
    { label: copy.columns.lots, value: lotsFormat.format(sum((client) => client.lots)) },
    { label: copy.columns.commission, value: formatMoney(sum((client) => client.commission), currency), emphasis: true },
    { label: copy.columns.equity, value: formatMoney(sum((client) => client.equity), currency) },
  ];

  return (
    <div className={cx(openClass, 'flex flex-col gap-4 p-5 sm:p-6')}>
      <p className="flex items-center gap-2 text-sm font-black text-fg">
        <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-2 rounded-[2px]" />
        {copy.total} <span className="font-normal text-fg-subtle">· {copy.thisPage}</span>
      </p>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 2xl:grid-cols-6">
        {figures.map((figure) => (
          <MoneyCell key={figure.label} label={figure.label} value={figure.value} emphasis={figure.emphasis} />
        ))}
      </dl>
      {/* Flow track: deposits (solid) against withdrawals (red) on this page. */}
      <div className="flex flex-col gap-1.5">
        <span aria-hidden="true" className="flex h-3 gap-1 overflow-hidden rounded-full">
          <span style={{ width: `${depositShare}%` }} className="relative origin-left animate-grow overflow-hidden rounded-full bg-fg motion-reduce:animate-none">
            <span className="zenith-scan-x absolute inset-y-0 w-10 bg-app/30 motion-reduce:hidden" />
          </span>
          <span style={{ background: RED }} className="min-w-0 flex-1 rounded-full" />
        </span>
        <span className="flex justify-between gap-3 text-[11px] text-fg-subtle">
          <span>{copy.columns.deposits}</span>
          <span>{copy.columns.withdrawals}</span>
        </span>
      </div>
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
      className="grid size-10 place-items-center rounded-full bg-fg text-app transition-[translate,opacity] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-25"
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
    <div className="flex flex-col gap-5">
      <ClientSkyline clients={clients} range={range} currency={currency} />

      <section style={{ animationDelay: '120ms' }} className="zenith-tile flex min-w-0 flex-col gap-5">
        <div className={cx(panelClass, 'flex flex-col gap-3 p-3 sm:p-4')}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="group flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-fg/[0.03] py-1 pr-2 pl-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-app">
                <Icon name="search" size={15} />
              </span>
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => withReset(setQuery)(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button type="button" onClick={() => withReset(setQuery)('')} aria-label={copy.all} className="grid size-8 place-items-center rounded-full bg-fg/[0.06] text-fg-muted transition-colors hover:bg-fg hover:text-app">
                  <Icon name="close" size={13} />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              className="group/export relative inline-flex h-12 shrink-0 items-center justify-between gap-3 overflow-hidden rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 w-10 bg-app/20 motion-reduce:hidden" />
              <span className="relative">{copy.exportCsv}</span>
              <span style={{ background: RED }} className="relative grid size-10 place-items-center rounded-full text-white">
                <Icon name="history" size={15} className="transition-transform duration-500 group-hover/export:-rotate-[360deg] motion-reduce:transition-none" />
              </span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown label={copy.status} value={status} options={distinct(clients.map((client) => client.accountStatus))} onChange={withReset(setStatus)} />
            <FilterDropdown label={copy.kyc} value={kyc} options={distinct(clients.map((client) => client.kyc))} onChange={withReset(setKyc)} />
            <FilterDropdown label={copy.referralSource} value={source} options={distinct(clients.map((client) => client.referralSource))} onChange={withReset(setSource)} />
            <span className="ml-auto" aria-live="polite">
              <LinkMeter count={fromLink} total={filtered.length} />
            </span>
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className={cx(openClass, 'flex flex-col items-center gap-4 px-6 py-12 text-center')}>
            <span aria-hidden="true" className="relative grid place-items-center">
              <span className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }, (_, pixel) => (
                  <span
                    key={pixel}
                    style={{ animationDelay: `${(pixel % 7) * 0.15}s`, background: pixel === 24 ? RED : undefined }}
                    className={cx('zenith-blink size-2 rounded-[2px]', pixel !== 24 && 'bg-fg/20')}
                  />
                ))}
              </span>
              <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
                <Icon name="search" size={20} />
              </span>
            </span>
            <p className="text-sm text-fg-muted">{copy.empty}</p>
          </div>
        ) : (
          <ol key={`${currentPage}-${filtered.length}`} className="flex flex-col gap-3">
            {pageRows.map((client, index) => (
              <ClientRow key={client.id} client={client} serial={firstIndex + index + 1} currency={currency} index={index} />
            ))}
          </ol>
        )}

        <TotalsStrip rows={pageRows} currency={currency} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono font-black text-fg">—</span>
            {copy.legendNoAccount}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono font-black text-fg">{formatMoney(0, currency)}</span>
            {copy.legendNoActivity}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line-strong pt-4">
          <p className="text-xs text-fg-muted">{copy.showing(filtered.length === 0 ? 0 : firstIndex + 1, firstIndex + pageRows.length, filtered.length)}</p>
          {pageCount > 1 && (
            <div className="flex items-center gap-3">
              <PagerButton label={copy.previous} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <Icon name="chevronRight" size={14} className="rotate-180" />
              </PagerButton>
              <span aria-hidden="true" className="flex items-center gap-1">
                {Array.from({ length: pageCount }, (_, pixel) => {
                  const isCurrent = pixel + 1 === currentPage;
                  return (
                    <span
                      key={pixel}
                      style={isCurrent ? { background: RED } : undefined}
                      className={cx('h-2 rounded-[3px] transition-[width,background-color] duration-300', isCurrent ? 'w-6' : 'w-2 bg-fg/15')}
                    />
                  );
                })}
              </span>
              <span className="font-mono text-xs font-bold text-fg-muted tabular-nums">
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
