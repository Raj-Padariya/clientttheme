// Content of the IB Manager Portal "Sub-IB Requests" page (reference screenshots, 2026-11-04), kept verbatim.

export type RequestStage = 'waiting' | 'broker' | 'approved' | 'declined';
export type RequestTab = RequestStage | 'all';

export interface SubIbRequest {
  id: string;
  /** Cascade id of the member, used to open their page once they are a partner. */
  memberId: string;
  name: string;
  email: string;
  stage: RequestStage;
  askedAgo: string;
  decidedOn: string | null;
  plan: string | null;
}

export const stageOrder: RequestStage[] = ['waiting', 'broker', 'approved', 'declined'];

export const subIbRequestsCopy = {
  title: 'Sub-IB Requests',
  subtitle: 'People asking to work as partners under you',
  all: 'All',
  stages: {
    waiting: {
      label: 'Waiting on you',
      hint: 'needs your decision',
      badge: 'Waiting on you',
      emptyTitle: 'Nothing waiting on you',
      emptyBody: 'When one of your clients asks to become a partner, it lands here for your decision.',
    },
    broker: {
      label: 'With the broker',
      hint: 'you said yes, they sign off',
      badge: 'With the broker',
      emptyTitle: 'Nothing with the broker',
      emptyBody: 'Requests you said yes to wait here until the broker signs off.',
    },
    approved: {
      label: 'Approved',
      hint: 'now partners under you',
      badge: 'Approved',
      emptyTitle: 'No approved requests yet',
      emptyBody: 'Once the broker signs off, the new partner shows here.',
    },
    declined: {
      label: 'Declined',
      hint: 'they can ask again',
      badge: 'Declined',
      emptyTitle: 'Nothing declined',
      emptyBody: 'Requests that were turned down show here — they can ask again.',
    },
  } as Record<RequestStage, { label: string; hint: string; badge: string; emptyTitle: string; emptyBody: string }>,
  allEmptyTitle: 'No requests yet',
  allEmptyBody: 'When one of your clients asks to become a partner, it lands here for your decision.',
  asked: (ago: string) => `asked ${ago}`,
  decided: (date: string) => `decided ${date}`,
  onThePlan: 'on the plan',
  openPage: 'Open their page',
};

export const mockSubIbRequests: SubIbRequest[] = [
  {
    id: 'SR-1',
    memberId: 'CM-1',
    name: 'harry sub ib Ly',
    email: 'harrysubib@gmail.com',
    stage: 'approved',
    askedAgo: '4 days ago',
    decidedOn: '30 Oct 2026',
    plan: 'hhhhn',
  },
];

export function countByStage(requests: SubIbRequest[]): Record<RequestStage, number> {
  const counts: Record<RequestStage, number> = { waiting: 0, broker: 0, approved: 0, declined: 0 };
  for (const request of requests) counts[request.stage] += 1;
  return counts;
}
