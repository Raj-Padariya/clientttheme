import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/history'] };

export { default } from '@/theme/history/HistoryPage';
