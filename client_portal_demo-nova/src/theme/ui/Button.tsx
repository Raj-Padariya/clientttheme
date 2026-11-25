import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';
import { cx } from '../lib/cx';
import { Spinner } from './Feedback';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const variantClass: Record<ButtonVariant, string> = {
  // Orbit: primary is the cyan→violet brand gradient with a glow that lifts on hover.
  primary:
    'bg-(image:--brand-gradient) text-on-primary shadow-[0_10px_28px_-12px_var(--brand-primary)] hover:-translate-y-px hover:brightness-110 hover:shadow-[0_14px_34px_-12px_var(--brand-primary)] active:translate-y-0',
  secondary: 'bg-primary-soft text-primary ring-1 ring-inset ring-primary/25 hover:ring-primary/50',
  outline: 'border border-line-strong bg-surface/60 text-fg backdrop-blur hover:border-primary/50 hover:text-primary',
  ghost: 'text-fg-muted hover:bg-hover hover:text-fg',
  danger: 'bg-danger-soft text-danger ring-1 ring-inset ring-danger/25 hover:ring-danger/50',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

const iconSize: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function buttonClass({ variant = 'primary', size = 'md', fullWidth = false }: ButtonStyleOptions = {}) {
  return cx(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[color,background-color,border-color,box-shadow,transform,filter] duration-200 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
    focusRing,
    variantClass[variant],
    sizeClass[size],
    fullWidth && 'w-full',
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
}

export function Button({
  variant,
  size = 'md',
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClass({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading ? (
        <Spinner size={iconSize[size]} />
      ) : (
        leftIcon && <Icon name={leftIcon} size={iconSize[size]} />
      )}
      {children}
      {rightIcon && !loading && <Icon name={rightIcon} size={iconSize[size]} />}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> &
  ButtonStyleOptions & {
    leftIcon?: IconName;
    rightIcon?: IconName;
  };

export function LinkButton({
  variant,
  size = 'md',
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={cx(buttonClass({ variant, size, fullWidth }), className)} {...rest}>
      {leftIcon && <Icon name={leftIcon} size={iconSize[size]} />}
      {children}
      {rightIcon && <Icon name={rightIcon} size={iconSize[size]} />}
    </Link>
  );
}

export const iconButtonClass = cx(
  'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-primary-soft hover:text-primary',
  focusRing,
);

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
}

export function IconButton({ icon, label, type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx(iconButtonClass, className)} {...rest}>
      <Icon name={icon} size={18} />
    </button>
  );
}
