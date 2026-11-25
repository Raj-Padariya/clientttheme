import type { Metadata } from 'next';
import FundManagerDetailPage from '@/theme/pamm/FundManagerDetailPage';
import { fundDetailText, getFundDetail } from '@/theme/pamm/fundManagersData';

interface FundManagerRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FundManagerRouteProps): Promise<Metadata> {
  const { id } = await params;
  return { title: getFundDetail(id)?.planName ?? fundDetailText.notFound };
}

export default async function FundManagerRoute({ params }: FundManagerRouteProps) {
  const { id } = await params;
  return <FundManagerDetailPage planId={id} />;
}
