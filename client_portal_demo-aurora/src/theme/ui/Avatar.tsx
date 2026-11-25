import { cx } from '../lib/cx';

const sizeClass = { sm: 'size-8 text-xs', md: 'size-10 text-sm' } as const;

interface AvatarProps {
  name: string;
  size?: keyof typeof sizeClass;
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary',
        sizeClass[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
