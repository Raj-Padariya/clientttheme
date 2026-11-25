'use client';

import { useState } from 'react';
import { DirectClientsDesk, isInRange, PeriodDial, periodRange, ScopeSwitch, type NetworkScope } from './DirectClientsDesk';
import { cascadeCopy, cascadeStats, mockCascade } from './ibCascadeData';
import { directClientsCopy, directClientsCurrency, mockDirectClients, type DirectPeriod } from './ibDirectClientsData';
import { NetworkCascadeDesk } from './NetworkCascadeDesk';

export default function IbNetworkPage() {
  const [scope, setScope] = useState<NetworkScope>('direct');
  const [period, setPeriod] = useState<DirectPeriod>('mtd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = periodRange(period, customFrom, customTo);
  const cascade = cascadeStats(mockCascade, (member) => isInRange(member.lastTradeAt, range));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fg">{directClientsCopy.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {scope === 'direct'
                ? directClientsCopy.subtitle(mockDirectClients.length)
                : cascadeCopy.subtitle(cascade.directSubIbs, cascade.cascadeSubIbs, cascade.clients)}
            </p>
          </div>
          <PeriodDial
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={setPeriod}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
        </div>
        <ScopeSwitch scope={scope} directCount={mockDirectClients.length} networkCount={cascade.cascadeSubIbs} onChange={setScope} />
      </header>

      {scope === 'direct' ? (
        <div key="direct" className="animate-rise motion-reduce:animate-none">
          <DirectClientsDesk clients={mockDirectClients} range={range} currency={directClientsCurrency} />
        </div>
      ) : (
        <div key="network" className="animate-rise motion-reduce:animate-none">
          <NetworkCascadeDesk root={mockCascade} range={range} currency={directClientsCurrency} />
        </div>
      )}
    </div>
  );
}
