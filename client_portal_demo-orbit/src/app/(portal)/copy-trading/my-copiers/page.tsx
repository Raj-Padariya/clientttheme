import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';
import MyCopiersPage from '@/theme/copy-trading/MyCopiersPage';

export const metadata: Metadata = { title: pageTitles['/copy-trading/my-copiers'] };

export default function MyCopiersRoute() {
  return <MyCopiersPage />;
}
