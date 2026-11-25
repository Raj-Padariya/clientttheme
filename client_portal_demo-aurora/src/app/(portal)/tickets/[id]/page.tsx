import type { Metadata } from 'next';
import TicketDetailPage from '@/theme/tickets/TicketDetailPage';
import { ticketDetailCopy } from '@/theme/tickets/ticketsData';

interface TicketRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TicketRouteProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `${ticketDetailCopy.ticket} ${id}` };
}

export default async function TicketRoute({ params }: TicketRouteProps) {
  const { id } = await params;
  return <TicketDetailPage ticketId={id} />;
}
