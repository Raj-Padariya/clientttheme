import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/dashboard'] };

export { default } from '@/theme/dashboard/DashboardPage';
