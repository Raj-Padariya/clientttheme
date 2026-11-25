import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/transfer'] };

export { default } from '@/theme/transfer/TransferPage';
