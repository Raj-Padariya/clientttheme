'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { DirectClientsDesk, isInRange, PeriodDial, periodRange, ScopeSwitch, type NetworkScope } from './DirectClientsDesk';
import { cascadeCopy, cascadeStats, mockCascade } from './ibCascadeData';
import { directClientsCopy, directClientsCurrency, mockDirectClients, type DirectPeriod } from './ibDirectClientsData';
import { NetworkCascadeDesk } from './NetworkCascadeDesk';

const RED = 'var(--zenith-red)';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

/** My Network (Zenith): an open header with the scope capsule switch, a period dock, then whichever desk is chosen. */
export default function IbNetworkPage() {
  const [scope, setScope] = useState<NetworkScope>('direct');
  const [period, setPeriod] = useState<DirectPeriod>('mtd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = periodRange(period, customFrom, customTo);
  const cascade = cascadeStats(mockCascade, (member) => isInRange(member.lastTradeAt, range));

  return (
    <div className="space-y-6">
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
              </span>
              <span className="grid size-11 place-items-center rounded-full bg-fg text-app">
                <Icon name="accounts" size={17} />
              </span>
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

        <div className="flex flex-col gap-3 border-t border-dashed border-line-strong pt-4 sm:flex-row sm:items-start sm:justify-between">
          <p className={cx(captionClass, 'flex h-11 items-center gap-2 text-fg-subtle')}>
            <span className="grid size-7 place-items-center rounded-full bg-fg text-app">
              <Icon name="clock" size={12} />
            </span>
            {directClientsCopy.periods.find((option) => option.id === period)?.label}
          </p>
          <PeriodDial
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={setPeriod}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
        </div>
      </header>

      {scope === 'direct' ? (
        <div key="direct" className="min-w-0">
          <DirectClientsDesk clients={mockDirectClients} range={range} currency={directClientsCurrency} />
        </div>
      ) : (
        <div key="network" className="min-w-0">
          <NetworkCascadeDesk root={mockCascade} range={range} currency={directClientsCurrency} />
        </div>
      )}
    </div>
  );
}
