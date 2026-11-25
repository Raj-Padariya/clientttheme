'use client';

import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Dropdown, type DropdownOption } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import type { PeriodRange } from './DirectClientsDesk';
import { ClientHeatmap } from './IbClientHeatmap';
import { directClientsCopy as copy, type DirectClient } from './ibDirectClientsData';
import { ACCENT, BoardHead, BookSearch, badgeTone, boardClass, captionClass, formatDay, initials, lotsFormat, share } from './ibNetworkKit';

const PAGE_SIZE = 10;

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

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const items: DropdownOption<string>[] = [{ value: '', label: copy.all }, ...options.map((option) => ({ value: option, label: option }))];
  return <Dropdown label={label} icon="sliders" value={value} options={items} onChange={onChange} className="min-w-44 flex-1 sm:flex-none" />;
}

// Share of the filtered clients who came through the referral link, as a small fill gauge.
function LinkGauge({ count, total }: { count: number; total: number }) {
  const percent = share(count, total);
  return (
    <span className="inline-flex items-center gap-2.5 rounded-[10px] bg-fg/[0.03] px-3 py-2 text-xs text-fg-muted ring-1 ring-line">
      <span aria-hidden="true" className="relative h-2 w-20 overflow-hidden rounded-full bg-fg/10">
        <span style={{ width: `${percent}%` }} className="inx-stripes absolute inset-y-0 left-0 rounded-full bg-success transition-[width] duration-500" />
      </span>
      {copy.cameFromLink(count, total)}
    </span>
  );
}

function Cell({ label, value, emphasis, inverted = false }: { label: string; value: string; emphasis?: boolean; inverted?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={cx('truncate text-[10.5px]', inverted ? 'text-app/55' : 'text-fg-subtle')}>{label}</dt>
      <dd className={cx('truncate font-mono text-sm font-black tabular-nums', emphasis ? 'text-success' : inverted ? 'text-app' : 'text-fg')}>{value}</dd>
    </div>
  );
}

/* ───────────── Blotter row: one client as a position line ───────────── */

function PositionRow({ client, serial, currency, index }: { client: DirectClient; serial: number; currency: string; index: number }) {
  const net = client.deposits - client.withdrawals;
  const timeline: { label: string; value: string | null }[] = [
    { label: copy.columns.lastLogin, value: client.lastLogin },
    { label: copy.columns.lastDeposit, value: client.lastDeposit },
    { label: copy.columns.lastWithdrawal, value: client.lastWithdrawal },
  ];

  return (
    <li
      style={{ animationDelay: `${index * 55}ms` }}
      className="group relative grid min-w-0 animate-feed-in gap-4 px-4 py-4 transition-colors hover:bg-fg/[0.03] motion-reduce:animate-none sm:px-5 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,13rem)] xl:items-center"
    >
      <span aria-hidden="true" style={{ background: ACCENT }} className="absolute inset-y-0 left-0 w-0.5 scale-y-0 transition-transform duration-300 group-hover:scale-y-100 motion-reduce:transition-none" />

      <div className="flex min-w-0 items-center gap-3">
        <span className="w-7 shrink-0 font-mono text-[11px] font-black text-fg-subtle tabular-nums" aria-label={copy.columns.serial}>
          {String(serial).padStart(2, '0')}
        </span>
        <span className={cx('relative grid size-10 shrink-0 place-items-center rounded-[11px] text-xs font-black', client.isIb ? 'bg-fg text-app' : 'bg-fg/[0.06] text-fg ring-1 ring-line')}>
          {initials(client.name)}
          {client.isIb && <span aria-hidden="true" style={{ background: ACCENT }} className="absolute -top-1 -right-1 size-2.5 rounded-[3px] ring-2 ring-app" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-black text-fg">
            <span className="truncate">{client.name}</span>
            {client.isIb && <span className="shrink-0 rounded bg-fg px-1.5 py-0.5 font-mono text-[9px] font-black tracking-[0.14em] text-app uppercase">{copy.ibTag}</span>}
          </p>
          <p className="truncate text-xs text-fg-subtle">{client.email}</p>
          <dl className="mt-1 flex flex-wrap gap-x-3 text-[11px]">
            <div className="flex items-center gap-1 text-fg-subtle">
              <dt className="sr-only">{copy.columns.phone}</dt>
              <Icon name="user" size={10} />
              <dd className="font-mono text-fg">{client.phone}</dd>
            </div>
            <div className="flex items-center gap-1 text-fg-subtle">
              <dt className="sr-only">{copy.columns.tradingAccount}</dt>
              <Icon name="accounts" size={10} />
              <dd className="font-mono text-fg">{client.tradingAccount ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 2xl:grid-cols-6">
          <Cell label={copy.columns.deposits} value={formatMoney(client.deposits, currency)} />
          <Cell label={copy.columns.withdrawals} value={formatMoney(client.withdrawals, currency)} />
          <Cell label={copy.columns.netDeposit} value={formatMoney(net, currency)} />
          <Cell label={copy.columns.lots} value={lotsFormat.format(client.lots)} />
          <Cell label={copy.columns.commission} value={formatMoney(client.commission, currency)} emphasis />
          <Cell label={copy.columns.equity} value={formatMoney(client.equity, currency)} />
        </dl>
        {/* Activity ticks: a solid tick means the event happened. */}
        <ol className="grid grid-cols-3 gap-2">
          {timeline.map((step) => (
            <li key={step.label} className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className={cx('h-3 w-1 shrink-0 rounded-full', step.value ? 'bg-success' : 'bg-fg/15')} />
              <span className="min-w-0">
                <span className="block truncate text-[10px] text-fg-subtle">{step.label}</span>
                <span className="block truncate font-mono text-[11px] font-bold text-fg">{formatDay(step.value)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <dl className="flex flex-wrap items-center gap-1.5 xl:flex-col xl:items-end">
        <div className="flex items-center gap-1.5 rounded-md bg-fg px-2 py-1 text-[11px] text-app">
          <dt className="sr-only">{copy.columns.referralSource}</dt>
          <Icon name="accounts" size={11} className="opacity-70" />
          <dd className="font-bold">{client.referralSource}</dd>
        </div>
        <div className={cx('rounded-md px-2 py-1 text-[11px] font-bold ring-1', badgeTone(client.accountStatus))}>
          <dt className="sr-only">{copy.columns.accountStatus}</dt>
          <dd>{client.accountStatus}</dd>
        </div>
        <div className={cx('rounded-md px-2 py-1 text-[11px] font-bold ring-1', badgeTone(client.kyc))}>
          <dt className="sr-only">{copy.columns.kyc}</dt>
          <dd>{client.kyc}</dd>
        </div>
      </dl>
    </li>
  );
}

/* ───────────── Totals bar: page sums as an inverted terminal footer with a deposit/withdrawal flow bar ───────────── */

function TotalsBar({ rows, currency }: { rows: DirectClient[]; currency: string }) {
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
    <div className="flex flex-col gap-3 bg-fg px-4 py-4 text-app sm:px-5">
      <p className="flex items-center gap-2 text-sm font-black">
        <span aria-hidden="true" style={{ background: ACCENT }} className="zenith-blink size-2 rounded-[2px]" />
        {copy.total} <span className="font-normal text-app/55">· {copy.thisPage}</span>
      </p>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 2xl:grid-cols-6">
        {figures.map((figure) => (
          <Cell key={figure.label} label={figure.label} value={figure.value} emphasis={figure.emphasis} inverted />
        ))}
      </dl>
      <div className="flex flex-col gap-1">
        <span aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          <span style={{ width: `${depositShare}%` }} className="inx-grow inx-stripes rounded-l-full bg-success" />
          <span style={{ background: ACCENT }} className="min-w-0 flex-1 rounded-r-full" />
        </span>
        <span className="flex justify-between gap-3 text-[11px] text-app/55">
          <span>{copy.columns.deposits}</span>
          <span>{copy.columns.withdrawals}</span>
        </span>
      </div>
    </div>
  );
}

function PagerButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-[10px] text-fg ring-1 ring-line transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}

/* ───────────── Client book: heatmap + filtered position blotter ───────────── */

export function ClientBook({ clients, range, currency }: { clients: DirectClient[]; range: PeriodRange; currency: string }) {
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
    <div className="flex flex-col gap-4">
      <ClientHeatmap clients={clients} range={range} currency={currency} />

      <section style={{ animationDelay: '120ms' }} className={cx(boardClass, 'animate-rise motion-reduce:animate-none')}>
        <BoardHead icon="user" caption={copy.columns.clientName} title={copy.tabDirect}>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            className="group/export inline-flex h-10 items-center gap-2 rounded-[11px] bg-fg px-4 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="history" size={14} className="transition-transform duration-500 group-hover/export:-rotate-[360deg] motion-reduce:transition-none" />
            {copy.exportCsv}
          </button>
        </BoardHead>

        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5">
          <BookSearch value={query} placeholder={copy.searchPlaceholder} clearLabel={copy.all} onChange={withReset(setQuery)} />
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown label={copy.status} value={status} options={distinct(clients.map((client) => client.accountStatus))} onChange={withReset(setStatus)} />
            <FilterDropdown label={copy.kyc} value={kyc} options={distinct(clients.map((client) => client.kyc))} onChange={withReset(setKyc)} />
            <FilterDropdown label={copy.referralSource} value={source} options={distinct(clients.map((client) => client.referralSource))} onChange={withReset(setSource)} />
            <span className="ml-auto" aria-live="polite">
              <LinkGauge count={fromLink} total={filtered.length} />
            </span>
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span aria-hidden="true" className="flex h-10 items-end gap-1">
              {[40, 70, 30, 90, 55, 75, 45].map((height, bar) => (
                <span key={bar} style={{ height: `${height}%`, animationDelay: `${bar * 0.15}s` }} className="inx-bar w-2 rounded-sm bg-fg/15" />
              ))}
            </span>
            <span className="grid size-11 place-items-center rounded-[12px] bg-fg/[0.06] text-fg">
              <Icon name="search" size={18} />
            </span>
            <p className="text-sm text-fg-muted">{copy.empty}</p>
          </div>
        ) : (
          <ol key={`${currentPage}-${filtered.length}`} className="divide-y divide-line">
            {pageRows.map((client, index) => (
              <PositionRow key={client.id} client={client} serial={firstIndex + index + 1} currency={currency} index={index} />
            ))}
          </ol>
        )}

        <TotalsBar rows={pageRows} currency={currency} />

        <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-2">
              <span className="rounded bg-fg/[0.06] px-2 py-0.5 font-mono font-black text-fg">—</span>
              {copy.legendNoAccount}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="rounded bg-fg/[0.06] px-2 py-0.5 font-mono font-black text-fg">{formatMoney(0, currency)}</span>
              {copy.legendNoActivity}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className={cx(captionClass, 'text-fg-muted normal-case tracking-normal')}>
              {copy.showing(filtered.length === 0 ? 0 : firstIndex + 1, firstIndex + pageRows.length, filtered.length)}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <PagerButton label={copy.previous} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  <Icon name="chevronRight" size={14} className="rotate-180" />
                </PagerButton>
                <span aria-hidden="true" className="flex h-6 items-end gap-0.5">
                  {Array.from({ length: pageCount }, (_, bar) => {
                    const isCurrent = bar + 1 === currentPage;
                    return (
                      <span
                        key={bar}
                        style={isCurrent ? { background: ACCENT } : undefined}
                        className={cx('w-1.5 rounded-sm transition-[height,background-color] duration-300', isCurrent ? 'h-6' : 'h-3 bg-fg/15')}
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
        </div>
      </section>
    </div>
  );
}
