import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/deposit'] };

export { default } from '@/theme/deposit/DepositPage';
