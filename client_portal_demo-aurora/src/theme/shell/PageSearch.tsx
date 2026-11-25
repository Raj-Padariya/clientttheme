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
    } else if (event.key === 'Tab') {
      // The field is the palette's only focus stop (options are picked by arrows), so Tab must not leave the dialog.
      event.preventDefault();
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

const OPEN_EVENT = 'page-search:open';

/** Opens the command palette from anywhere in the shell (e.g. the mobile tab bar). */
export function openPageSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
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
    function openFromElsewhere() {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setIsOpen(true);
    }
    window.addEventListener(OPEN_EVENT, openFromElsewhere);
    return () => window.removeEventListener(OPEN_EVENT, openFromElsewhere);
  }, []);

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
        className="group relative hidden h-11 w-full items-center gap-3 overflow-hidden rounded-full bg-fg/[0.06] pr-1.5 pl-4 text-[13px] text-fg-subtle ring-1 ring-fg/10 transition-[background-color,color,box-shadow] duration-200 hover:bg-fg/[0.09] hover:text-fg-muted hover:ring-fg/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex"
      >
        <span aria-hidden="true" className="zenith-shine absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-fg/[0.07] to-transparent" />
        <Icon name="search" size={17} className="shrink-0 text-fg-muted" />
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-fg/15" />
        <span className="flex-1 truncate text-left">{translate('search.placeholder')}</span>
        <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
          <kbd className="grid size-8 place-items-center rounded-full bg-fg/[0.08] font-mono text-[10px] font-semibold text-fg-muted ring-1 ring-fg/10">Ctrl</kbd>
          <kbd className="grid h-8 place-items-center rounded-full bg-fg/[0.08] px-3.5 font-sans text-xs font-medium text-fg-muted ring-1 ring-fg/10">K</kbd>
        </span>
      </button>
      <button
        type="button"
        onClick={open}
        aria-label={translate('search.open')}
        title={translate('search.open')}
        className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/[0.08] hover:text-fg focus-visible:outline-2 focus-visible:outline-ring md:hidden"
      >
        <Icon name="search" size={18} />
      </button>
      {/* Portalled: the top bar's backdrop blur makes `fixed` children size to the bar instead of the viewport. */}
      {isOpen && createPortal(<SearchDialog onClose={close} />, document.body)}
    </>
  );
}
