'use client';

import { useState, type CSSProperties } from 'react';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { marketingMaterialCopy as copy, mockMarketingMaterials } from './ibSettingsData';

/*
 * Nova marketing material: a sticky side rail (title, search capsule, one dot per material) beside a grid of folded
 * document tiles; when nothing matches, a blinking dot matrix with a document bead.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden';
const MATRIX_DOTS = 35;

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

function EmptyMatrix() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-16 text-center">
      <span aria-hidden="true" className="relative grid place-items-center">
        <span className="grid grid-cols-7 gap-2.5">
          {Array.from({ length: MATRIX_DOTS }, (_, dot) => (
            <span key={dot} style={{ animationDelay: `${(dot % 7) * 0.15 + Math.floor(dot / 7) * 0.08}s` }} className="size-2 animate-blink rounded-full bg-fg/15 motion-reduce:animate-none" />
          ))}
        </span>
        <span className="absolute grid size-20 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="absolute inset-1 animate-ring-ripple rounded-full ring-2 ring-fg/10 motion-reduce:hidden" />
          <span className="grid size-14 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
            <Icon name="fileText" size={22} />
          </span>
        </span>
      </span>
      <div>
        <p className="text-lg font-black text-fg">{copy.emptyTitle}</p>
        <p className="mt-1 max-w-md text-sm text-fg-muted">{copy.emptyBody}</p>
      </div>
    </div>
  );
}

export default function IbMarketingMaterialPage() {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const materials = mockMarketingMaterials.filter((item) => item.name.toLowerCase().includes(needle));

  return (
    <div className="grid gap-5 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start">
      <aside className={cx(panelClass, 'flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none lg:sticky lg:top-24')}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:linear-gradient(180deg,#000,transparent)]" />

        <header className="relative flex flex-col gap-3">
          <span aria-hidden="true" className="relative grid size-14 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-10 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
              <Icon name="fileText" size={17} />
            </span>
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{copy.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
          </div>
        </header>

        <label className="group relative flex h-12 min-w-0 items-center gap-3 rounded-full py-1 pr-4 pl-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg">
          <span className="nova-gloss grid size-10 shrink-0 place-items-center rounded-full text-fg">
            <Icon name="search" size={15} />
          </span>
          <span className="sr-only">{copy.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </label>

        {/* One dot per material: lit when it matches the search. */}
        <div className="relative flex flex-col gap-2 border-t-2 border-dotted border-line-strong pt-4">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{copy.title}</span>
            <span key={materials.length} className="animate-dot-pop font-mono text-2xl font-black text-fg tabular-nums motion-reduce:animate-none">
              {materials.length}
              <span className="text-sm text-fg-subtle">/{mockMarketingMaterials.length}</span>
            </span>
          </p>
          <span aria-hidden="true" className="flex min-h-2.5 flex-wrap gap-1.5">
            {mockMarketingMaterials.length === 0 ? (
              <span className="size-2.5 rounded-full border-2 border-dashed border-fg/25" />
            ) : (
              mockMarketingMaterials.map((item) => (
                <span key={item.id} className={cx('size-2.5 rounded-full transition-colors duration-300', materials.includes(item) ? 'bg-fg' : 'bg-fg/12')} />
              ))
            )}
          </span>
        </div>
      </aside>

      <section style={{ animationDelay: '120ms' }} className={cx(panelClass, 'min-w-0 animate-rise p-4 motion-reduce:animate-none sm:p-5')}>
        {materials.length === 0 ? (
          <EmptyMatrix />
        ) : (
          <ul key={needle} className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {materials.map((item, index) => (
              <li
                key={item.id}
                style={riseDelay(index)}
                className="group relative flex animate-feed-in flex-col gap-4 overflow-hidden rounded-[26px] p-4 ring-1 ring-line transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none"
              >
                {/* Folded corner. */}
                <span aria-hidden="true" className="absolute top-0 right-0 size-8 rounded-bl-[14px] bg-fg/[0.06] ring-1 ring-line" />
                <span aria-hidden="true" className="relative grid size-12 place-items-center">
                  <span className="absolute inset-0 rounded-full border-2 border-dashed border-fg/20 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
                  <span className="grid size-9 place-items-center rounded-full bg-fg text-app transition-transform duration-300 group-hover:rotate-12">
                    <Icon name="fileText" size={15} />
                  </span>
                </span>
                <span aria-hidden="true" className="flex flex-col gap-1.5">
                  <span className="h-1.5 w-4/5 rounded-full bg-fg/10" />
                  <span className="h-1.5 w-3/5 rounded-full bg-fg/[0.07]" />
                </span>
                <span className="truncate border-t-2 border-dotted border-line-strong pt-3 text-sm font-black text-fg">{item.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
