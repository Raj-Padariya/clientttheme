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
const METER_DOTS = 12;
const LINK_DOTS = 10;
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const lotsFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/*
 * Nova direct clients: a dark dot-matrix pulse (one dot per client), a command dock with theme dropdowns, client
 * tickets with dotted receipt rows and a bead timeline, then an ink totals card and a bead pager.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden';
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

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

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Header controls: period beads + scope tiles ───────────── */

export function PeriodDial({ period, customFrom, customTo, onPeriod, onCustomFrom, onCustomTo, only, customLabel, layout = 'row' }: {
  /** Restrict the presets (e.g. the member overview has no Custom). Defaults to all of them. */
  only?: DirectPeriod[];
  customLabel?: string;
  /** `rail` packs the beads into a 3-column grid for a narrow side panel. */
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
      <div role="radiogroup" aria-label={copy.title} className={cx(isRail ? 'grid grid-cols-3 gap-2' : 'flex flex-wrap gap-1.5')}>
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
                'group/period relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[11.5px] font-bold transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              <span
                aria-hidden="true"
                className={cx('size-1.5 shrink-0 rounded-full transition-colors', isActive ? 'animate-blink bg-app motion-reduce:animate-none' : 'bg-fg/25 group-hover/period:bg-fg/60')}
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
    <div role="tablist" onKeyDown={handleKeyDown} className="grid grid-cols-2 gap-2 lg:grid-cols-1">
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
              'group relative flex items-center gap-3 overflow-hidden rounded-full py-1.5 pr-1.5 pl-1.5 text-left text-sm font-bold transition-[background-color,color,translate] duration-300 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            <span className="relative grid size-10 shrink-0 place-items-center">
              <span
                aria-hidden="true"
                className={cx(
                  'absolute inset-0 rounded-full border-2 border-dashed',
                  isActive ? 'animate-rim-spin border-app/35 motion-reduce:animate-none' : 'border-fg/15 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none',
                )}
              />
              <span className={cx('grid size-7 place-items-center rounded-full', isActive ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                <Icon name={item.icon} size={14} />
              </span>
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span
              key={item.count}
              className={cx(
                'grid h-8 min-w-8 animate-dot-pop place-items-center rounded-full px-2 font-mono text-xs font-black tabular-nums motion-reduce:animate-none',
                isActive ? 'bg-app text-fg' : 'bg-fg/[0.06] text-fg',
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

/* ───────────── Client pulse: one dot per client — lit when active in the period, ringed when new ───────────── */

function DotMeter({ percent, inverted = false }: { percent: number | null; inverted?: boolean }) {
  const lit = percent === null ? 0 : Math.round((percent / 100) * METER_DOTS);
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: METER_DOTS }, (_, dot) => {
        if (percent === null) return <span key={dot} className={cx('size-1.5 rounded-full border border-dashed', inverted ? 'border-white/30' : 'border-fg/30')} />;
        const isLit = dot < Math.max(lit, percent > 0 ? 1 : 0);
        return (
          <span
            key={dot}
            style={{ transitionDelay: `${dot * 25}ms` }}
            className={cx('size-1.5 rounded-full transition-colors duration-300', isLit ? (inverted ? 'bg-white' : 'bg-fg') : inverted ? 'bg-white/12' : 'bg-fg/12')}
          />
        );
      })}
    </span>
  );
}

function PulseBand({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
  const total = clients.length;
  const active = clients.filter((client) => isInRange(client.lastTradeAt, range)).length;
  const joined = clients.filter((client) => isInRange(client.joinedAt, range)).length;
  const commission = clients.reduce((sum, client) => sum + client.commission, 0);

  const rails: { label: string; hint: string; value: string; icon: IconName; percent: number | null }[] = [
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(active), icon: 'history', percent: share(active, total) },
    { label: copy.kpiNew, hint: copy.kpiNewHint, value: String(joined), icon: 'user', percent: share(joined, total) },
    { label: copy.kpiCommission, hint: copy.kpiCommissionHint, value: formatMoney(commission, currency), icon: 'trophy', percent: null },
  ];

  return (
    <section className={cx(inkClass, 'animate-rise p-5 motion-reduce:animate-none sm:p-6')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(160deg,#000,transparent_70%)]')} />

      <div className="relative grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="relative grid size-20 shrink-0 place-items-center">
            {[0, 1.3].map((delay) => (
              <span key={delay} style={{ animationDelay: `${delay}s` }} className="absolute inset-2 animate-ring-ripple rounded-full ring-2 ring-white/20 motion-reduce:hidden" />
            ))}
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-white/25 motion-reduce:animate-none" />
            <span className="grid size-14 place-items-center rounded-full bg-white font-mono text-2xl font-black text-[#0a1220] tabular-nums">{total}</span>
          </span>
          <div className="min-w-0">
            <p className={cx(captionClass, 'text-white/55')}>{copy.kpiTotal}</p>
            <p className="mt-1 text-sm text-white/70">{copy.kpiTotalHint}</p>
          </div>
        </div>

        {/* Client matrix: every dot is one real client. */}
        <div className="flex min-w-0 flex-col gap-3">
          <span aria-hidden="true" className="flex flex-wrap gap-1.5">
            {clients.map((client, index) => {
              const isActive = isInRange(client.lastTradeAt, range);
              const isNew = isInRange(client.joinedAt, range);
              return (
                <span
                  key={client.id}
                  style={{ animationDelay: `${index * 25}ms` }}
                  className={cx(
                    'size-3.5 animate-dot-pop rounded-full transition-colors duration-500 motion-reduce:animate-none',
                    isActive ? 'bg-white' : 'bg-white/12',
                    isNew && 'ring-2 ring-success ring-offset-2 ring-offset-[#0a1220]',
                  )}
                />
              );
            })}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-white" />
              {copy.kpiActive}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full ring-2 ring-success" />
              {copy.kpiNew}
            </span>
          </span>
        </div>
      </div>

      <ul className="relative mt-6 grid gap-4 border-t-2 border-dotted border-white/15 pt-5 sm:grid-cols-3">
        {rails.map((rail, index) => (
          <li key={rail.label} style={riseDelay(index)} className="group/rail flex min-w-0 animate-feed-in flex-col gap-2 motion-reduce:animate-none">
            <span className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-transform duration-300 group-hover/rail:rotate-12 motion-reduce:transition-none">
                <Icon name={rail.icon} size={14} />
              </span>
              <span className="truncate text-xs font-semibold text-white/70">{rail.label}</span>
            </span>
            <span className="truncate font-mono text-3xl font-black tabular-nums">{rail.value}</span>
            <DotMeter percent={rail.percent} inverted />
            <span className="text-[11px] text-white/45">{rail.hint}</span>
          </li>
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
  const lit = Math.round((share(count, total) / 100) * LINK_DOTS);
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-xs text-fg-muted ring-1 ring-line">
      <span aria-hidden="true" className="flex gap-0.5">
        {Array.from({ length: LINK_DOTS }, (_, dot) => (
          <span key={dot} className={cx('size-1.5 rounded-full transition-colors duration-300', dot < lit ? 'bg-fg' : 'bg-fg/12')} />
        ))}
      </span>
      {copy.cameFromLink(count, total)}
    </span>
  );
}

/* ───────────── Client ticket: identity, dotted money rows, bead timeline, standing chips ───────────── */

function MoneyRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex min-w-0 items-end gap-2">
      <dt className="shrink-0 text-[11px] text-fg-subtle">{label}</dt>
      <span aria-hidden="true" className="mb-1 min-w-3 flex-1 border-b-2 border-dotted border-line-strong" />
      <dd className={cx('min-w-0 truncate font-mono text-xs font-black tabular-nums', emphasis ? 'text-success' : 'text-fg')}>{value}</dd>
    </div>
  );
}

function ClientTicket({ client, serial, currency, index }: { client: DirectClient; serial: number; currency: string; index: number }) {
  const net = client.deposits - client.withdrawals;
  const timeline: { label: string; value: string | null }[] = [
    { label: copy.columns.lastLogin, value: client.lastLogin },
    { label: copy.columns.lastDeposit, value: client.lastDeposit },
    { label: copy.columns.lastWithdrawal, value: client.lastWithdrawal },
  ];

  return (
    <li
      style={riseDelay(index)}
      className="group relative flex min-w-0 animate-feed-in flex-col gap-4 rounded-[26px] p-4 ring-1 ring-line transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 rounded-full border-2 border-dashed',
              client.isIb ? 'animate-rim-spin border-fg/40 motion-reduce:animate-none' : 'border-fg/15 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none',
            )}
          />
          <span className={cx('grid size-9 place-items-center rounded-full text-xs font-black', client.isIb ? 'bg-fg text-app' : 'nova-gloss text-fg')}>{initials(client.name)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-black text-fg">
            <span className="truncate">{client.name}</span>
            {client.isIb && <span className="shrink-0 rounded-full bg-fg px-1.5 py-0.5 text-[9px] font-black tracking-[0.14em] text-app uppercase">{copy.ibTag}</span>}
          </p>
          <p className="truncate text-xs text-fg-subtle">{client.email}</p>
        </div>
        <span className="shrink-0 rounded-full bg-fg/[0.05] px-2 py-1 font-mono text-[10.5px] font-black text-fg-muted tabular-nums" aria-label={copy.columns.serial}>
          #{String(serial).padStart(2, '0')}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-[16px] bg-fg/[0.03] px-3 py-2 ring-1 ring-line">
          <dt className="flex items-center gap-1 text-[10px] text-fg-subtle">
            <Icon name="user" size={10} />
            {copy.columns.phone}
          </dt>
          <dd className="truncate font-mono text-xs font-bold text-fg">{client.phone}</dd>
        </div>
        <div className="min-w-0 rounded-[16px] bg-fg/[0.03] px-3 py-2 ring-1 ring-line">
          <dt className="flex items-center gap-1 text-[10px] text-fg-subtle">
            <Icon name="accounts" size={10} />
            {copy.columns.tradingAccount}
          </dt>
          <dd className="truncate font-mono text-xs font-bold text-fg">{client.tradingAccount ?? '—'}</dd>
        </div>
      </dl>

      <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
        <MoneyRow label={copy.columns.deposits} value={formatMoney(client.deposits, currency)} />
        <MoneyRow label={copy.columns.withdrawals} value={formatMoney(client.withdrawals, currency)} />
        <MoneyRow label={copy.columns.netDeposit} value={formatMoney(net, currency)} />
        <MoneyRow label={copy.columns.lots} value={lotsFormat.format(client.lots)} />
        <MoneyRow label={copy.columns.commission} value={formatMoney(client.commission, currency)} emphasis />
        <MoneyRow label={copy.columns.equity} value={formatMoney(client.equity, currency)} />
      </dl>

      {/* Activity: three beads on a dotted wire; a filled bead means the event has happened. */}
      <ol className="relative grid grid-cols-3 gap-2 rounded-[20px] bg-fg/[0.03] px-3 pt-3 pb-2.5">
        <span aria-hidden="true" className="absolute top-[18px] right-[16%] left-[16%] border-t-2 border-dotted border-line-strong" />
        {timeline.map((step) => (
          <li key={step.label} className="relative flex min-w-0 flex-col items-center gap-1 text-center">
            <span aria-hidden="true" className={cx('size-3 rounded-full ring-4 ring-surface', step.value ? 'bg-fg' : 'border-2 border-dashed border-fg/30 bg-surface')} />
            <span className="w-full truncate text-[10px] text-fg-subtle">{step.label}</span>
            <span className="w-full truncate font-mono text-[11px] font-bold text-fg">{formatDay(step.value)}</span>
          </li>
        ))}
      </ol>

      <dl className="flex flex-wrap items-center gap-1.5 border-t-2 border-dotted border-line-strong pt-3">
        <div className="flex items-center gap-1.5 rounded-full bg-fg py-1 pr-2.5 pl-1 text-[11px] text-app">
          <dt className="sr-only">{copy.columns.referralSource}</dt>
          <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-app text-fg">
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
    </li>
  );
}

function TotalsCard({ rows, currency }: { rows: DirectClient[]; currency: string }) {
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
    <div className={cx(inkClass, 'flex flex-col gap-4 p-5 sm:p-6')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(90deg,#000,transparent_60%)]')} />
      <p className="relative flex items-center gap-2 text-sm font-black">
        <span aria-hidden="true" className="size-2 animate-blink rounded-full bg-white motion-reduce:animate-none" />
        {copy.total} <span className="font-normal text-white/55">· {copy.thisPage}</span>
      </p>
      <dl className="relative grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 2xl:grid-cols-6">
        {figures.map((figure) => (
          <div key={figure.label} className="min-w-0 border-l-2 border-dotted border-white/15 pl-3">
            <dt className="truncate text-[10.5px] text-white/50">{figure.label}</dt>
            <dd className={cx('truncate font-mono text-base font-black tabular-nums', figure.emphasis && 'text-success')}>{figure.value}</dd>
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
      <PulseBand clients={clients} range={range} currency={currency} />

      <section style={{ animationDelay: '120ms' }} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-4 motion-reduce:animate-none sm:p-5')}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="group flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full py-1 pr-2 pl-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg">
              <span className="nova-gloss grid size-10 shrink-0 place-items-center rounded-full text-fg">
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
              className="group/export relative inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-fg py-1 pr-5 pl-1 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/export:translate-x-full motion-reduce:hidden" />
              <span className="relative grid size-10 place-items-center rounded-full bg-app text-fg">
                <Icon name="history" size={15} />
              </span>
              <span className="relative">{copy.exportCsv}</span>
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
          <div className="flex flex-col items-center gap-4 rounded-[26px] px-6 py-12 text-center ring-1 ring-line">
            <span aria-hidden="true" className="relative grid place-items-center">
              <span className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, dot) => (
                  <span key={dot} style={{ animationDelay: `${(dot % 7) * 0.15}s` }} className="size-1.5 animate-blink rounded-full bg-fg/15 motion-reduce:animate-none" />
                ))}
              </span>
              <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
                <Icon name="search" size={20} />
              </span>
            </span>
            <p className="text-sm text-fg-muted">{copy.empty}</p>
          </div>
        ) : (
          <ol key={`${currentPage}-${filtered.length}`} className="grid gap-3 2xl:grid-cols-2">
            {pageRows.map((client, index) => (
              <ClientTicket key={client.id} client={client} serial={firstIndex + index + 1} currency={currency} index={index} />
            ))}
          </ol>
        )}

        <TotalsCard rows={pageRows} currency={currency} />

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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dotted border-line-strong pt-4">
          <p className="text-xs text-fg-muted">{copy.showing(filtered.length === 0 ? 0 : firstIndex + 1, firstIndex + pageRows.length, filtered.length)}</p>
          {pageCount > 1 && (
            <div className="flex items-center gap-3">
              <PagerButton label={copy.previous} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <Icon name="chevronRight" size={14} className="rotate-180" />
              </PagerButton>
              <span aria-hidden="true" className="flex items-center gap-1.5">
                {Array.from({ length: pageCount }, (_, dot) => (
                  <span key={dot} className={cx('rounded-full transition-[width,background-color] duration-300', dot + 1 === currentPage ? 'h-2 w-5 bg-fg' : 'size-2 bg-fg/15')} />
                ))}
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
