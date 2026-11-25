import type { Metadata } from 'next';
import ContestLeaderboardPage from '@/theme/promotion/ContestLeaderboardPage';
import { contestText } from '@/theme/promotion/contestDetails';

export const metadata: Metadata = { title: contestText.leaderboardTitle };

interface LeaderboardRouteProps {
  params: Promise<{ id: string }>;
}

export default async function LeaderboardRoute({ params }: LeaderboardRouteProps) {
  const { id } = await params;
  return <ContestLeaderboardPage contestId={id} />;
}
