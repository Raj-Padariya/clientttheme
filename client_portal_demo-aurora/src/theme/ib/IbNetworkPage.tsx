'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { isInRange, PeriodDial, periodRange, ScopeSwitch, type NetworkScope } from './DirectClientsDesk';
import { ClientBook } from './IbClientBook';
import { cascadeCopy, cascadeStats, mockCascade } from './ibCascadeData';
import { directClientsCopy, directClientsCurrency, mockDirectClients, type DirectPeriod } from './ibDirectClientsData';
import { NetworkCascadeDesk } from './NetworkCascadeDesk';
import './ibNetwork.css';

const ACCENT = 'var(--zenith-red)';
const captionClass = 'font-mono text-[10.5px] font-semibold tracking-[0.12em] uppercase';
const SESSION_BARS = [45, 70, 35, 90, 60, 80, 50, 95, 40, 75];

/*
 * My Network (Aurora) as a partner book: a session bar (title, live subtitle, book switch), a timeframe row
 * and a ticker tape of the book's head counts, then whichever book is open.
 */
export default function IbNetworkPage() {
  const [scope, setScope] = useState<NetworkScope>('direct');
  const [period, setPeriod] = useState<DirectPeriod>('mtd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = periodRange(period, customFrom, customTo);
  const cascade = cascadeStats(mockCascade, (member) => isInRange(member.lastTradeAt, range));
  const periodLabel = directClientsCopy.periods.find((option) => option.id === period)?.label;
  const tickers: { key: string; icon: IconName; label: string; value: string }[] = [
    { key: 'direct', icon: 'user', label: cascadeCopy.legendOwnClient, value: String(mockDirectClients.length) },
    { key: 'subs', icon: 'trophy', label: cascadeCopy.kpiSubIbs, value: String(cascade.cascadeSubIbs) },
    { key: 'clients', icon: 'accounts', label: cascadeCopy.kpiClients, value: String(cascade.clients) },
    { key: 'active', icon: 'history', label: cascadeCopy.kpiActive, value: String(cascade.active) },
  ];

  return (
    <div className="space-y-5">
      <header className="relative animate-rise overflow-hidden rounded-[20px] bg-fg/[0.02] ring-1 ring-line motion-reduce:animate-none">
        <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            {/* Session volume glyph: bars breathe like live volume on an open market. */}
            <span aria-hidden="true" className="flex h-14 w-16 shrink-0 items-end gap-[3px] rounded-[14px] bg-fg p-2.5">
              {SESSION_BARS.map((height, bar) => (
                <span
                  key={bar}
                  style={{ height: `${height}%`, animationDelay: `${bar * 0.12}s`, background: bar === SESSION_BARS.length - 3 ? ACCENT : undefined }}
                  className={cx('inx-bar flex-1 rounded-[1px]', bar !== SESSION_BARS.length - 3 && 'bg-app/70')}
                />
              ))}
            </span>
            <div className="min-w-0">
              <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{directClientsCopy.title}</h1>
              <p key={scope} className="mt-2 max-w-xl animate-feed-in text-sm leading-relaxed text-fg-muted motion-reduce:animate-none">
                {scope === 'direct'
                  ? directClientsCopy.subtitle(mockDirectClients.length)
                  : cascadeCopy.subtitle(cascade.directSubIbs, cascade.cascadeSubIbs, cascade.clients)}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[22rem]">
            <ScopeSwitch scope={scope} directCount={mockDirectClients.length} networkCount={cascade.cascadeSubIbs} onChange={setScope} />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line bg-fg/[0.02] px-5 py-3 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <p className={cx(captionClass, 'flex h-11 shrink-0 items-center gap-2 text-fg-muted')}>
            <span style={{ background: ACCENT }} className="grid size-7 place-items-center rounded-[8px] text-white">
              <Icon name="clock" size={12} />
            </span>
            <span key={period} className="animate-dot-pop motion-reduce:animate-none">
              {periodLabel}
            </span>
          </p>
          <PeriodDial period={period} customFrom={customFrom} customTo={customTo} onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />
        </div>

        {/* Ticker tape of the book's head counts; the list is doubled so the loop is seamless. */}
        <div className="relative overflow-hidden border-t border-line bg-fg text-app">
          <ul aria-hidden="true" className="inx-ticker flex w-max">
            {[...tickers, ...tickers, ...tickers, ...tickers].map((ticker, index) => (
              <li key={`${ticker.key}-${index}`} className="flex items-center gap-2 border-r border-app/10 px-5 py-2">
                <Icon name={ticker.icon} size={12} className="opacity-60" />
                <span className={cx(captionClass, 'opacity-60')}>{ticker.label}</span>
                <span className="font-mono text-xs font-black tabular-nums">{ticker.value}</span>
                <Icon name="trendUp" size={11} className="text-success" />
              </li>
            ))}
          </ul>
          <dl className="sr-only">
            {tickers.map((ticker) => (
              <div key={ticker.key}>
                <dt>{ticker.label}</dt>
                <dd>{ticker.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {scope === 'direct' ? (
        <div key="direct" className="min-w-0">
          <ClientBook clients={mockDirectClients} range={range} currency={directClientsCurrency} />
        </div>
      ) : (
        <div key="network" className="min-w-0">
          <NetworkCascadeDesk root={mockCascade} range={range} currency={directClientsCurrency} />
        </div>
      )}
    </div>
  );
}
