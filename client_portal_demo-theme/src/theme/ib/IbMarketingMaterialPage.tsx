'use client';

import { useState } from 'react';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { marketingMaterialCopy as copy, mockMarketingMaterials } from './ibSettingsData';

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';

/* ───────────── Empty shelf: dot-matrix frame with a stack of blank slides ───────────── */

function EmptyShelf() {
  return (
    <div className="relative isolate flex flex-col items-center gap-4 overflow-hidden px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(color-mix(in_srgb,var(--brand-primary)_22%,transparent)_1px,transparent_1.5px)] [background-size:18px_18px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
      />
      <span aria-hidden="true" className="relative h-24 w-32">
        <span className="absolute inset-x-6 top-0 h-16 -rotate-6 rounded-xl border border-dashed border-primary/40 bg-surface" />
        <span className="absolute inset-x-3 top-2 h-16 rotate-3 rounded-xl border border-dashed border-primary/50 bg-surface" />
        <span className="absolute inset-x-0 top-5 grid h-16 animate-float place-items-center rounded-xl bg-[#18181b] text-(--brand-gleam) shadow-card ring-1 ring-primary/30 motion-reduce:animate-none">
          <Icon name="fileText" size={22} />
        </span>
      </span>
      <p className="text-base font-bold text-fg">{copy.emptyTitle}</p>
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1 border-l-4 border-primary pl-4">
          <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
          <p className="text-sm text-fg-muted">{copy.subtitle}</p>
        </div>
        <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 shadow-card transition-colors focus-within:border-primary sm:w-72">
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
      </header>

      <section className={cx(cardClass, 'animate-rise overflow-hidden motion-reduce:animate-none')}>
        {materials.length === 0 ? (
          <EmptyShelf />
        ) : (
          <ul className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-surface-2/50 p-4 ring-1 ring-line">
                <span className="grid size-10 place-items-center rounded-xl bg-[#18181b] text-(--brand-gleam)">
                  <Icon name="fileText" size={16} />
                </span>
                <span className="truncate text-sm font-semibold text-fg">{item.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
