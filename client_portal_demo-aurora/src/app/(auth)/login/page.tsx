import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/login'] };

export { default } from '@/theme/auth/LoginPage';
