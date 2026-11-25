import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/register'] };

export { default } from '@/theme/auth/RegisterPage';
