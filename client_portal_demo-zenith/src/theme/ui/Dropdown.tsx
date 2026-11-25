'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from './Icon';

export interface DropdownOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  /** Colour class for a small dot before the label, e.g. `bg-success` for a status. */
  dotClassName?: string;
}

interface DropdownProps<V extends string> {
  id?: string;
  /** Caption shown inside the trigger, above the selected value; also names the list for screen readers. */
  label: string;
  value: V;
  /** The first option is treated as the neutral default ("All …"); any other choice is highlighted. */
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
  icon?: IconName;
  /** `segment` drops the border so the trigger can sit inside a shared bar. */
  variant?: 'field' | 'segment';
  className?: string;
}

export function Dropdown<V extends string>({ id, label, value, options, onChange, icon, variant = 'field', className }: DropdownProps<V>) {
  const generatedId = useId();
  const triggerId = id ?? `dropdown-${generatedId}`;
  const listId = `${triggerId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];
  const isDefault = selectedIndex === 0;

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, listId]);

  function open() {
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function choose(index: number) {
    onChange(options[index].value);
    close();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const lastIndex = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(activeIndex + 1, lastIndex),
      ArrowUp: Math.max(activeIndex - 1, 0),
      Home: 0,
      End: lastIndex,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActiveIndex(moves[event.key]);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
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
    <div ref={rootRef} className={cx('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className={cx(
          'group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          variant === 'field' && 'border border-line bg-surface/60 hover:border-line-strong',
          variant === 'segment' && 'hover:bg-surface-2/60',
          isOpen && 'bg-surface-2/70',
        )}
      >
        {icon && (
          <span
            className={cx(
              'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
              isDefault ? 'bg-surface-2 text-fg-muted group-hover:text-fg' : 'bg-primary-soft text-primary',
            )}
          >
            <Icon name={icon} size={15} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10.5px] tracking-[0.1em] text-fg-subtle uppercase">{label}</span>
          <span className={cx('mt-0.5 flex items-center gap-1.5 text-sm font-medium', isDefault ? 'text-fg' : 'text-primary')}>
            {selected?.dotClassName && <span aria-hidden="true" className={cx('size-1.5 shrink-0 rounded-full', selected.dotClassName)} />}
            <span className="truncate">{selected?.label}</span>
          </span>
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={cx('shrink-0 text-fg-subtle transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-180 text-primary')}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={handleListKeyDown}
          className="absolute top-full left-0 z-40 mt-2 max-h-72 w-full min-w-56 origin-top animate-rise overflow-y-auto rounded-2xl border border-line-strong bg-surface p-1.5 shadow-pop outline-none motion-reduce:animate-none"
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                  isSelected && 'font-semibold text-primary',
                )}
              >
                {option.icon && (
                  <span
                    className={cx(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      isSelected ? 'border-primary/40 bg-primary-soft text-primary' : 'border-line text-fg-subtle',
                    )}
                  >
                    <Icon name={option.icon} size={14} />
                  </span>
                )}
                {option.dotClassName && <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', option.dotClassName)} />}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <Icon name="check" size={15} className="shrink-0 text-primary" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
