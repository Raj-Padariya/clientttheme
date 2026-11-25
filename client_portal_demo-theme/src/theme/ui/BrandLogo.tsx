import Image from 'next/image';
import Link from 'next/link';
import { brandConfig } from '@/core/broker/config';
import type { LogoAsset } from '@/core/broker/types';
import { cx } from '../lib/cx';

interface BrandLogoProps {
  href?: string;
  height?: number;
  className?: string;
}

// Both variants are rendered and CSS picks one, so the right logo shows before hydration.
export function BrandLogo({ href = '/dashboard', height = 32, className }: BrandLogoProps) {
  const widthFor = (asset: LogoAsset) => Math.round((asset.width * height) / asset.height);
  const { light, dark } = brandConfig.logo;

  return (
    <Link
      href={href}
      aria-label={brandConfig.brandName}
      className={cx(
        'inline-flex shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
        className,
      )}
    >
      <Image src={light.src} alt="" width={widthFor(light)} height={height} loading="eager" unoptimized className="dark:hidden" />
      <Image src={dark.src} alt="" width={widthFor(dark)} height={height} loading="eager" unoptimized className="hidden dark:block" />
    </Link>
  );
}
