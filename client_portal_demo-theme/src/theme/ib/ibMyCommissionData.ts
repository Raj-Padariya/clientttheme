// Content of the IB Manager Portal "My Commission" page (reference screenshot, 2026-11-04), kept verbatim.

export type CommissionTab = 'earnings' | 'payouts' | 'distribute' | 'plan';
export type MovementKind = 'commission' | 'payout' | 'distribution';
export type MovementFilter = MovementKind | 'everything';

export interface WalletMovement {
  id: string;
  when: string;
  kind: MovementKind;
  symbol: string;
  side: 'buy' | 'sell';
  account: string;
  lots: number;
  openPrice: number;
  closePrice: number;
  amount: number;
  balanceAfter: number;
}

export interface CommissionWallet {
  currency: string;
  available: number;
  pending: number;
  earnedAllTime: number;
  paidOut: number;
}

export const myCommissionCopy = {
  title: 'My Commission',
  subtitle: 'What you have earned, what you have been paid, and what you are paid on',
  available: 'Available now',
  availableHint: 'ready to request',
  pending: 'Pending payout',
  pendingHint: 'locked in an open request',
  earnedAllTime: 'Earned all time',
  earnedAllTimeHint: 'your share, since day one',
  paidOut: 'Paid out',
  paidOutHint: 'settled to you',
  ready: (amount: string) => `${amount} ready`,
  readyHint: 'Ask for it whenever you like.',
  requestPayout: 'Request payout',
  requested: (amount: string) => `${amount} requested`,
  requestedHint: 'Locked in an open request until it is settled to you.',
  nothingReady: 'Nothing ready yet',
  tabs: {
    earnings: 'Earnings',
    payouts: 'Payouts',
    distribute: 'Distribute to Client',
    plan: 'My Commission Plan',
  } as Record<CommissionTab, string>,
  filterLabel: 'Show',
  filters: [
    { value: 'everything', label: 'Everything' },
    { value: 'commission', label: 'Commission' },
    { value: 'payout', label: 'Payouts' },
    { value: 'distribution', label: 'Sent to clients' },
  ] as { value: MovementFilter; label: string }[],
  search: 'Search symbol or account',
  commissionHistory: 'Commission history',
  ledgerHint: 'Every line is one movement of this wallet.',
  columns: { when: 'When', what: 'What', amount: 'Amount', balanceAfter: 'Balance after' },
  lotsSuffix: 'lots',
  showing: (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
  emptyTitle: 'No movements match',
  emptyBody: 'Try another filter or search.',
};

export const mockCommissionWallet: CommissionWallet = {
  currency: 'USD',
  available: 0.75,
  pending: 0,
  earnedAllTime: 0.75,
  paidOut: 0,
};

const xauSell = { kind: 'commission', symbol: 'XAUUSD', side: 'sell', account: '2000001' } as const;

export const mockWalletMovements: WalletMovement[] = [
  { id: 'WM-7', when: '30 Oct 2026 19:21', ...xauSell, lots: 0.04, openPrice: 3924.98, closePrice: 3919.02, amount: 0.12, balanceAfter: 0.75 },
  { id: 'WM-6', when: '30 Oct 2026 19:21', ...xauSell, lots: 0.04, openPrice: 3924.81, closePrice: 3919.11, amount: 0.12, balanceAfter: 0.63 },
  { id: 'WM-5', when: '30 Oct 2026 19:21', ...xauSell, lots: 0.04, openPrice: 3924.72, closePrice: 3919.11, amount: 0.12, balanceAfter: 0.51 },
  { id: 'WM-4', when: '30 Oct 2026 19:21', ...xauSell, lots: 0.04, openPrice: 3924.72, closePrice: 3919.11, amount: 0.12, balanceAfter: 0.39 },
  { id: 'WM-3', when: '30 Oct 2026 19:21', ...xauSell, lots: 0.04, openPrice: 3925.02, closePrice: 3919.11, amount: 0.12, balanceAfter: 0.27 },
  { id: 'WM-2', when: '30 Oct 2026 19:21', ...xauSell, lots: 0.04, openPrice: 3925.04, closePrice: 3919.11, amount: 0.12, balanceAfter: 0.15 },
  { id: 'WM-1', when: '30 Oct 2026 16:28', ...xauSell, lots: 0.01, openPrice: 3975.87, closePrice: 3978.59, amount: 0.03, balanceAfter: 0.03 },
];

export function filterMovements(movements: WalletMovement[], filter: MovementFilter, query: string): WalletMovement[] {
  const needle = query.trim().toUpperCase();
  return movements.filter(
    (movement) =>
      (filter === 'everything' || movement.kind === filter) &&
      (needle === '' || movement.symbol.includes(needle) || movement.account.includes(needle) || `TA#${movement.account}`.includes(needle)),
  );
}
