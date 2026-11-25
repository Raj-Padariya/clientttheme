'use client';

import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useThemeMode } from '../lib/themeMode';
import { iconButtonClass } from './Button';
import { Icon } from './Icon';

interface ThemeToggleProps {
  className?: string;
  /** `icon` is a compact icon button; `switch` is an iOS-style sliding switch (on = dark). */
  variant?: 'icon' | 'switch';
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { mode, toggle, canToggle } = useThemeMode();
  if (!canToggle) return null;

  const isDark = mode === 'dark';

  if (variant === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={translate('common.darkMode')}
        onClick={toggle}
        className={cx(
          'relative inline-flex h-8 w-[60px] shrink-0 items-center rounded-full border border-line p-0.5 transition-colors duration-300',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]',
          isDark ? 'bg-primary-soft' : 'bg-hover',
          className,
        )}
      >
        <Icon name="sun" size={13} className="absolute left-2 text-fg-subtle" />
        <Icon name="moon" size={13} className="absolute right-2 text-fg-subtle" />
        <span
          className={cx(
            'relative flex size-[26px] items-center justify-center rounded-full bg-surface text-primary shadow-raised',
            'transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)] motion-reduce:transition-none',
            isDark ? 'translate-x-7' : 'translate-x-0',
          )}
        >
          <Icon name={isDark ? 'moon' : 'sun'} size={14} />
        </span>
      </button>
    );
  }

  const label = translate(isDark ? 'common.lightMode' : 'common.darkMode');

  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={cx(iconButtonClass, className)}>
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
