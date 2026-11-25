import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/settings'] };

export { default } from '@/theme/settings/SettingsPage';
