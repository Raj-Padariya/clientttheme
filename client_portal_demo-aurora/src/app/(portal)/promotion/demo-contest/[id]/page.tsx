import type { Metadata } from 'next';
import { pageTitles } from '@/theme/meta';
import ContestDetailPage from '@/theme/promotion/ContestDetailPage';

export const metadata: Metadata = { title: pageTitles['/promotion/demo-contest'] };

interface ContestRouteProps {
  params: Promise<{ id: string }>;
}

export default async function ContestRoute({ params }: ContestRouteProps) {
  const { id } = await params;
  return <ContestDetailPage contestId={id} />;
}
