'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { Icon } from './Icon';
import { PHONE_COUNTRIES, type PhoneCountry } from './phoneCountries';
import { useFloatingPosition } from './useFloatingPosition';

interface PhoneFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** ISO 3166-1 alpha-2 code of the selected country. */
  countryIso: string;
  onCountryChange: (iso: string) => void;
  required?: boolean;
  invalid?: boolean;
}

function matchesQuery(country: PhoneCountry, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/[^0-9]/g, '');
  return (
    country.name.toLowerCase().includes(needle) ||
    (country.nativeName?.toLowerCase().includes(needle) ?? false) ||
    country.iso.toLowerCase() === needle ||
    (digits !== '' && country.dialCode.slice(1).startsWith(digits))
  );
}

// Windows has no flag emoji (it shows the two letters), so flags come from flagcdn's SVG set instead.
function flagUrl(iso: string) {
  return `https://flagcdn.com/${iso.toLowerCase()}.svg`;
}

function CountryFlag({ iso, active = false }: { iso: string; active?: boolean }) {
  const [failedIso, setFailedIso] = useState<string | null>(null);
  const frameClass = cx('h-[15px] w-[22px] shrink-0 overflow-hidden rounded-[3px] ring-1 transition-shadow', active ? 'ring-primary ring-2' : 'ring-white/15');

  // Offline or blocked CDN: fall back to the ISO code so the row still identifies the country.
  if (failedIso === iso) {
    return (
      <span aria-hidden="true" className={cx(frameClass, 'grid place-items-center bg-surface-2 font-mono text-[8px] font-bold text-fg-muted')}>
        {iso}
      </span>
    );
  }

  return (
    // `unoptimized`: the SVGs are already tiny, and this skips the image optimizer (no remotePatterns needed).
    <Image src={flagUrl(iso)} alt="" aria-hidden="true" width={22} height={15} unoptimized onError={() => setFailedIso(iso)} className={cx(frameClass, 'object-cover')} />
  );
}

export function PhoneField({ id, value, onChange, countryIso, onCountryChange, required = false, invalid = false }: PhoneFieldProps) {
  const generatedId = useId();
  const listId = `${id}-countries-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const floatingStyle = useFloatingPosition(rootRef, panelRef, isOpen, { matchWidth: true });

  const selected = PHONE_COUNTRIES.find((country) => country.iso === countryIso) ?? PHONE_COUNTRIES[0];
  const results = useMemo(() => PHONE_COUNTRIES.filter((country) => matchesQuery(country, query)), [query]);

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, listId]);

  function open() {
    setQuery('');
    setActiveIndex(Math.max(0, PHONE_COUNTRIES.indexOf(selected)));
    setIsOpen(true);
  }

  function close(focusTarget: 'trigger' | 'phone' = 'trigger') {
    setIsOpen(false);
    (focusTarget === 'phone' ? phoneRef : triggerRef).current?.focus();
  }

  function choose(country: PhoneCountry | undefined) {
    if (!country) return;
    onCountryChange(country.iso);
    close('phone');
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const lastIndex = results.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(lastIndex, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1))));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cx(
          'flex rounded-lg bg-surface ring-1 transition-shadow focus-within:ring-2',
          invalid ? 'ring-danger focus-within:ring-danger' : 'ring-line focus-within:ring-primary',
          isOpen && 'ring-2 ring-primary',
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-label={`Country code: ${selected.name} ${selected.dialCode}`}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              open();
            }
          }}
          className={cx(
            'group flex shrink-0 items-center gap-2 rounded-l-lg border-r border-line px-3 text-sm transition-colors focus-visible:outline-none',
            isOpen ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-fg-muted hover:bg-hover hover:text-fg',
          )}
        >
          <CountryFlag iso={selected.iso} />
          <span className="font-medium tabular-nums">{selected.dialCode}</span>
          <Icon name="chevronDown" size={14} className={cx('transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-180')} />
        </button>
        <input
          ref={phoneRef}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          required={required}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full min-w-0 rounded-r-lg bg-transparent px-3.5 text-sm text-fg tabular-nums focus:outline-none"
        />
      </div>

      {isOpen &&
        createPortal(
        <div
          ref={panelRef}
          style={floatingStyle}
          className="w-72 max-w-[calc(100vw-1rem)] animate-rise overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop motion-reduce:animate-none"
        >
          <div className="border-b border-line p-2">
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 ring-1 ring-line focus-within:ring-primary">
              <Icon name="search" size={15} className="shrink-0 text-fg-subtle" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={results.length > 0 ? `${listId}-${activeIndex}` : undefined}
                aria-label="Search country"
                placeholder="Search country"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="h-9 w-full min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              <span className="shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">{results.length}</span>
            </div>
          </div>

          <ul id={listId} role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto p-1.5">
            {results.length === 0 && (
              <li className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-sm text-fg-muted">
                <Icon name="globe" size={18} className="text-fg-subtle" />
                No country found
              </li>
            )}
            {results.map((country, index) => {
              const isSelected = country.iso === selected.iso;
              const isActive = index === activeIndex;
              return (
                <li
                  key={country.iso}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(country)}
                  className={cx(
                    'relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx('absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary transition-opacity', isSelected ? 'opacity-100' : 'opacity-0')}
                  />
                  <CountryFlag iso={country.iso} active={isSelected} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className={cx('font-medium', isSelected ? 'text-primary' : 'text-fg')}>{country.name}</span>
                    {country.nativeName && <span className="ml-1.5 text-xs text-fg-subtle">({country.nativeName})</span>}
                  </span>
                  <span className={cx('shrink-0 font-mono text-xs tabular-nums', isSelected ? 'text-primary' : 'text-fg-subtle')}>{country.dialCode}</span>
                  {isSelected && <Icon name="check" size={14} className="shrink-0 text-primary" />}
                </li>
              );
            })}
          </ul>
        </div>,
          document.body,
        )}
    </div>
  );
}
