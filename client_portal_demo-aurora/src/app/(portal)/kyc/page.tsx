import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/kyc'] };

export { default } from '@/theme/kyc/KycPage';
