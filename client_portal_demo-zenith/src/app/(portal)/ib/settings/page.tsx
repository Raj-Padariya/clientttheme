import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/ib/settings'] };

export { default } from '@/theme/ib/IbSettingsPage';
