import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/accounts'] };

export { default } from '@/theme/accounts/AccountsPage';
