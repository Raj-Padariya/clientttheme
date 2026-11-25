'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { ibNavItems, navItems, type NavItem } from './navItems';

interface PageEntry {
  href: string;
  label: string;
  groupLabel?: string;
  portal: 'client' | 'ib';
  icon: IconName;
}

function collectPages(items: NavItem[], portal: PageEntry['portal']): PageEntry[] {
  return items.flatMap((item): PageEntry[] => {
    if (item.href) return [{ href: item.href, label: translate(item.labelKey), portal, icon: item.icon }];
    const groupLabel = translate(item.labelKey);
    return (item.children ?? []).map((link) => ({ href: link.href, label: translate(link.labelKey), groupLabel, portal, icon: link.icon }));
  });
}

const portalLabelKey: Record<PageEntry['portal'], MessageKey> = { client: 'search.client', ib: 'search.ib' };

function matches(page: PageEntry, needle: string) {
  if (!needle) return true;
  const haystack = `${page.label} ${page.groupLabel ?? ''} ${translate(portalLabelKey[page.portal])}`.toLowerCase();
  // Every typed word must appear somewhere, so "ib trans" finds IB → Transfer Commission.
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const pages = useMemo(() => [...collectPages(navItems, 'client'), ...collectPages(ibNavItems, 'ib')], []);
  const results = pages.filter((page) => matches(page, query.trim().toLowerCase()));

  function openPage(page: PageEntry) {
    onClose();
    router.push(page.href);
  }

  function moveActive(step: number) {
    if (results.length === 0) return;
    const next = (activeIndex + step + results.length) % results.length;
    setActiveIndex(next);
    document.getElementById(`page-search-option-${next}`)?.scrollIntoView({ block: 'nearest' });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      openPage(results[activeIndex]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center px-3 pt-[10vh] sm:pt-[14vh]" role="dialog" aria-modal="true" aria-label={translate('search.open')}>
      <button type="button" tabIndex={-1} aria-label={translate('common.closeMenu')} className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[70vh] w-full max-w-xl animate-rise flex-col overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-line motion-reduce:animate-none">
        <label className="m-3 mb-1 flex shrink-0 items-center gap-3 rounded-xl border border-line-strong bg-surface-2/60 px-4 transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-primary)_22%,transparent)]">
          <Icon name="search" size={18} className="shrink-0 text-primary" />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="page-search-results"
            aria-activedescendant={results[activeIndex] ? `page-search-option-${activeIndex}` : undefined}
            aria-label={translate('search.placeholder')}
            placeholder={translate('search.placeholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
          />
          <kbd className="hidden shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:block">Esc</kbd>
        </label>

        {results.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">{translate('search.empty')}</p>
        ) : (
          <ul id="page-search-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
            {results.map((page, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={`${page.portal}-${page.href}`}
                  id={`page-search-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => openPage(page)}
                  className={cx('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors', isActive ? 'bg-primary-soft' : 'hover:bg-hover')}
                >
                  <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg ring-1', isActive ? 'bg-primary text-on-primary ring-primary' : 'bg-surface-2 text-fg-muted ring-line')}>
                    <Icon name={page.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{page.label}</span>
                    {page.groupLabel && <span className="block truncate text-xs text-fg-muted">{page.groupLabel}</span>}
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-fg-subtle uppercase ring-1 ring-line">
                    {translate(portalLabelKey[page.portal])}
                  </span>
                  <kbd aria-hidden="true" className={cx('hidden shrink-0 font-mono text-xs text-primary sm:block', !isActive && 'invisible')}>
                    ↵
                  </kbd>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/*
 * Top-bar page search: a field-like pill on wide screens, an icon button elsewhere; Ctrl/⌘ + K opens it anywhere.
 * Searches every Client and IB page by name and menu group, and opens the picked one.
 */
export function PageSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function open() {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    returnFocusRef.current?.focus();
  }

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setIsOpen(true);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={translate('search.open')}
        className="group hidden h-11 w-56 items-center gap-2.5 rounded-full border border-line bg-surface-2/60 pr-2 pl-4 text-sm text-fg-subtle transition-[border-color,color] hover:border-primary/40 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring xl:flex 2xl:w-72"
      >
        <Icon name="search" size={16} className="shrink-0 text-primary" />
        <span className="flex-1 truncate text-left">{translate('search.placeholder')}</span>
        <kbd className="shrink-0 rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={open}
        aria-label={translate('search.open')}
        title={translate('search.open')}
        className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2/60 text-fg-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring xl:hidden"
      >
        <Icon name="search" size={17} />
      </button>
      {/* Portalled: the top bar's backdrop blur makes `fixed` children size to the bar instead of the viewport. */}
      {isOpen && createPortal(<SearchDialog onClose={close} />, document.body)}
    </>
  );
}
