import type { Metadata } from 'next';
import PlanDetailPage from '@/theme/copy-trading/PlanDetailPage';
import { myPlans, planDetailCopy } from '@/theme/copy-trading/myPlansData';

interface PlanRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PlanRouteProps): Promise<Metadata> {
  const { id } = await params;
  return { title: myPlans.find((plan) => String(plan.id) === id)?.name ?? planDetailCopy.notFound };
}

export default async function PlanRoute({ params }: PlanRouteProps) {
  const { id } = await params;
  return <PlanDetailPage planId={Number(id)} />;
}
