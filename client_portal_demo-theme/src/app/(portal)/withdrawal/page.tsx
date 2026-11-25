import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/withdrawal'] };

export { default } from '@/theme/withdrawal/WithdrawalPage';
