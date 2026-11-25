import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/pamm/investments'] };

export { default } from '@/theme/pamm/InvestmentsPage';
