import type { Metadata } from 'next';
import MasterDetailPage from '@/theme/copy-trading/MasterDetailPage';
import { masterDetailCopy, masterPlans } from '@/theme/copy-trading/mastersData';

interface MasterRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MasterRouteProps): Promise<Metadata> {
  const { id } = await params;
  return { title: masterPlans.find((plan) => plan.id === id)?.name ?? masterDetailCopy.notFound };
}

export default async function MasterRoute({ params }: MasterRouteProps) {
  const { id } = await params;
  return <MasterDetailPage masterId={id} />;
}
