import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MemberOverviewPage from '@/theme/ib/MemberOverviewPage';
import { getMember, memberOverviewCopy } from '@/theme/ib/ibMemberOverviewData';

interface MemberRouteProps {
  params: Promise<{ memberId: string }>;
}

export async function generateMetadata({ params }: MemberRouteProps): Promise<Metadata> {
  const { memberId } = await params;
  return { title: getMember(decodeURIComponent(memberId))?.name ?? memberOverviewCopy.notFound };
}

export default async function MemberRoute({ params }: MemberRouteProps) {
  const { memberId } = await params;
  const member = getMember(decodeURIComponent(memberId));
  if (!member) notFound();
  return <MemberOverviewPage member={member} />;
}
