'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { DirectClientsDesk, isInRange, PeriodDial, periodRange, ScopeSwitch, type NetworkScope } from './DirectClientsDesk';
import { cascadeCopy, cascadeStats, mockCascade } from './ibCascadeData';
import { directClientsCopy, directClientsCurrency, mockDirectClients, type DirectPeriod } from './ibDirectClientsData';
import { NetworkCascadeDesk } from './NetworkCascadeDesk';

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

/** My Network: a sticky control rail (title, scope, period) beside whichever desk is chosen. */
export default function IbNetworkPage() {
  const [scope, setScope] = useState<NetworkScope>('direct');
  const [period, setPeriod] = useState<DirectPeriod>('mtd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = periodRange(period, customFrom, customTo);
  const cascade = cascadeStats(mockCascade, (member) => isInRange(member.lastTradeAt, range));

  return (
    <div className="grid gap-5 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start">
      <aside className="orbit-card nova-edge-light relative flex animate-rise flex-col gap-5 overflow-hidden p-5 motion-reduce:animate-none lg:sticky lg:top-24">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:linear-gradient(180deg,#000,transparent)]" />

        <header className="relative flex flex-col gap-3">
          <span aria-hidden="true" className="relative grid size-14 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-10 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
              <Icon name="accounts" size={17} />
            </span>
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{directClientsCopy.title}</h1>
            <p key={scope} className="mt-1 animate-feed-in text-sm text-fg-muted motion-reduce:animate-none">
              {scope === 'direct'
                ? directClientsCopy.subtitle(mockDirectClients.length)
                : cascadeCopy.subtitle(cascade.directSubIbs, cascade.cascadeSubIbs, cascade.clients)}
            </p>
          </div>
        </header>

        <ScopeSwitch scope={scope} directCount={mockDirectClients.length} networkCount={cascade.cascadeSubIbs} onChange={setScope} />

        <div className="flex flex-col gap-3 border-t-2 border-dotted border-line-strong pt-4">
          <p className={cx(captionClass, 'flex items-center gap-2 text-fg-subtle')}>
            <Icon name="clock" size={12} />
            {directClientsCopy.periods.find((option) => option.id === period)?.label}
          </p>
          <PeriodDial
            layout="rail"
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={setPeriod}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
        </div>
      </aside>

      {scope === 'direct' ? (
        <div key="direct" className="min-w-0 animate-rise motion-reduce:animate-none">
          <DirectClientsDesk clients={mockDirectClients} range={range} currency={directClientsCurrency} />
        </div>
      ) : (
        <div key="network" className="min-w-0 animate-rise motion-reduce:animate-none">
          <NetworkCascadeDesk root={mockCascade} range={range} currency={directClientsCurrency} />
        </div>
      )}
    </div>
  );
}
