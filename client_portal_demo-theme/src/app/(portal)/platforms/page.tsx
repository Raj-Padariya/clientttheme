import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/platforms'] };

export { default } from '@/theme/platforms/PlatformsPage';
