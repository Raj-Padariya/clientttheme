'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type OptionHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Icon, type IconName } from './Icon';
import { useFloatingPosition } from './useFloatingPosition';

function controlClass(invalid?: boolean) {
  return cx(
    'w-full rounded-md border bg-surface text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60',
    invalid
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-line-strong hover:border-fg-subtle focus:border-primary focus:ring-ring/25',
  );
}

export function fieldErrorId(id: string) {
  return `${id}-error`;
}

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, optional = false, className, children }: FieldProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
        {optional && <span className="ml-1 font-normal text-fg-subtle">({translate('common.optional')})</span>}
      </label>
      {children}
      {error ? (
        <p id={fieldErrorId(htmlFor)} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-fg-subtle">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: IconName;
  rightSlot?: ReactNode;
}

export function Input({ invalid = false, leftIcon, rightSlot, className, id, ...rest }: InputProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
          <Icon name={leftIcon} size={18} />
        </span>
      )}
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && id ? fieldErrorId(id) : undefined}
        className={cx(controlClass(invalid), 'h-11 px-3.5', leftIcon && 'pl-10', Boolean(rightSlot) && 'pr-12', className)}
        {...rest}
      />
      {rightSlot && <span className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</span>}
    </div>
  );
}

export function PasswordInput(props: Omit<InputProps, 'type' | 'rightSlot'>) {
  const [visible, setVisible] = useState(false);
  const label = translate(visible ? 'common.hidePassword' : 'common.showPassword');

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={label}
          aria-pressed={visible}
          title={label}
          className="flex size-9 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      }
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

function readOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== 'option') return [];
    const label = Children.toArray(child.props.children).join('');
    return [{ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) }];
  });
}

// The real <select> stays in the DOM (hidden) so form submission, `name`, `required` and every caller's
// `onChange(event)` keep working; the custom list writes to it and fires a native change event.
function commitNativeValue(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export function Select({ invalid = false, className, id, children, value, defaultValue, disabled, 'aria-describedby': describedBy, ...rest }: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listId = `${triggerId}-list`;
  const options = readOptions(children);
  const isControlled = value !== undefined;

  const rootRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ''));
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const floatingStyle = useFloatingPosition(triggerRef, listRef, isOpen, { matchWidth: true });

  const currentValue = isControlled ? String(value) : uncontrolledValue;
  const selectedIndex = options.findIndex((option) => option.value === currentValue);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const isPlaceholder = !selected || selected.value === '';

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, listId]);

  function open() {
    if (disabled) return;
    setActiveIndex(Math.max(0, selectedIndex));
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (!isControlled) setUncontrolledValue(option.value);
    if (nativeRef.current && option.value !== currentValue) commitNativeValue(nativeRef.current, option.value);
    close();
  }

  function moveActive(step: number) {
    const count = options.length;
    if (count === 0) return;
    let next = activeIndex;
    for (let tries = 0; tries < count; tries += 1) {
      next = Math.min(count - 1, Math.max(0, next + step));
      if (!options[next].disabled) break;
    }
    setActiveIndex(next);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
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
    <div ref={rootRef} className={cx('relative', className)}>
      <select
        ref={nativeRef}
        tabIndex={-1}
        aria-hidden="true"
        value={isControlled ? value : uncontrolledValue}
        onChange={rest.onChange ?? (() => undefined)}
        disabled={disabled}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        {...rest}
      >
        {children}
      </select>

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-describedby={describedBy ?? (invalid && id ? fieldErrorId(id) : undefined)}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className={cx(
          controlClass(invalid),
          'group relative flex h-11 w-full cursor-pointer items-center gap-2 pr-10 pl-3.5 text-left',
          isOpen && 'border-primary ring-2 ring-primary/25',
        )}
      >
        <span className={cx('min-w-0 flex-1 truncate', isPlaceholder ? 'text-fg-subtle' : 'text-fg')}>{selected?.label ?? options[0]?.label}</span>
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg transition-[background-color,color,transform] duration-200 motion-reduce:transition-none',
            isOpen ? 'rotate-180 bg-primary-soft text-primary' : 'text-fg-subtle group-hover:bg-surface-2 group-hover:text-fg',
          )}
        >
          <Icon name="chevronDown" size={16} />
        </span>
      </button>

      {isOpen &&
        createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={triggerId}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={handleListKeyDown}
          style={floatingStyle}
          className="max-h-72 max-w-[calc(100vw-1rem)] min-w-48 animate-rise overflow-y-auto rounded-xl border border-line-strong bg-surface p-1.5 shadow-pop outline-none motion-reduce:animate-none"
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isActive = index === activeIndex;
            return (
              <li
                key={`${option.value}-${index}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                onClick={() => choose(index)}
                style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
                className={cx(
                  'relative flex animate-feed-in items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors motion-reduce:animate-none',
                  option.disabled ? 'cursor-not-allowed text-fg-subtle opacity-60' : 'cursor-pointer',
                  !option.disabled && (isActive ? 'bg-surface-2 text-fg' : 'text-fg-muted'),
                  isSelected && 'font-semibold text-primary',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx('absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary transition-opacity', isSelected ? 'opacity-100' : 'opacity-0')}
                />
                <span className={cx('min-w-0 flex-1 truncate', option.value === '' && !isSelected && 'text-fg-subtle')}>{option.label}</span>
                {isSelected && <Icon name="check" size={15} className="shrink-0 text-primary" />}
              </li>
            );
          })}
        </ul>,
          document.body,
        )}
    </div>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('inline-flex cursor-pointer items-start gap-2.5 text-sm text-fg-muted', className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary" {...rest} />
      <span>{label}</span>
    </label>
  );
}
