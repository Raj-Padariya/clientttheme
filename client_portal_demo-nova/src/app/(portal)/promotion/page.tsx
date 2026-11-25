import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/promotion'] };

export { default } from '@/theme/promotion/PromotionPage';
