import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';

export const metadata: Metadata = { title: pageTitles['/tickets'] };

export { default } from '@/theme/tickets/TicketsPage';
