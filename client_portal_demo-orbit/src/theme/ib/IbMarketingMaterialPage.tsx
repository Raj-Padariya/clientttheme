'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { marketingMaterialCopy as copy, mockMarketingMaterials } from './ibSettingsData';

/* ───────────── Empty state: a document planet with two rings and a satellite circling it ───────────── */

function EmptyOrbit() {
  return (
    <div className="relative isolate flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span aria-hidden="true" className="pointer-events-none absolute top-6 left-1/2 -z-10 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <span aria-hidden="true" className="relative grid size-36 place-items-center">
        <span className="absolute inset-0 rounded-full border border-dashed border-primary/30 motion-safe:animate-orbit [animation-duration:10s]" />
        <span className="absolute inset-0 animate-orbit motion-reduce:animate-none [animation-duration:3.5s]">
          <span className="absolute top-0 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)]" />
        </span>
        <span className="absolute inset-5 rounded-full border border-primary/20 motion-safe:animate-ring-breathe" />
        <span className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40">
          <Icon name="fileText" size={26} />
        </span>
      </span>
      <p className="text-lg font-bold text-fg">{copy.emptyTitle}</p>
      <p className="max-w-md text-sm text-fg-muted">{copy.emptyBody}</p>
    </div>
  );
}

export default function IbMarketingMaterialPage() {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const materials = mockMarketingMaterials.filter((item) => item.name.toLowerCase().includes(needle));

  return (
    <div className="flex flex-col gap-6">
      <section className="orbit-card relative isolate overflow-hidden">
        <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 -z-10 size-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="orbit-text text-2xl font-bold">{copy.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
          </div>
          <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-full bg-surface-2/50 px-4 ring-1 ring-line transition-shadow focus-within:ring-primary/60 md:w-72">
            <Icon name="search" size={15} className="shrink-0 text-fg-subtle" />
            <span className="sr-only">{copy.search}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
        </div>

        <div className="border-t border-line">
          {materials.length === 0 ? (
            <EmptyOrbit />
          ) : (
            <ul className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {materials.map((item) => (
                <li key={item.id} className={cx('flex items-center gap-3 rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line')}>
                  <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
                    <Icon name="fileText" size={16} />
                  </span>
                  <span className="truncate text-sm font-semibold text-fg">{item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
