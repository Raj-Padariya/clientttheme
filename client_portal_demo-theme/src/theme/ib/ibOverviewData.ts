// Content of the IB Manager Portal dashboard (reference screenshot, 2026-11-03), kept verbatim.

export type IbScope = 'total' | 'network' | 'direct';
export type IbPeriod = 'today' | '7d' | '30d' | 'mtd' | 'all' | 'custom';

export const ibOverviewCopy = {
  title: 'Dashboard',
  subtitle: 'Your IB performance overview',
  scopeLabel: 'Scope',
  periodLabel: 'Period',
  shareHint: 'share this to bring in clients',
  used: 'used',
  snapshot: 'Performance snapshot',
  commissionSummary: 'Commission Summary',
  commissionNote: 'USD · lifetime unless stated',
  totalEarned: 'Total earned',
  paidOut: 'Paid out',
  pending: 'Pending',
  available: 'Available',
  requestPayout: 'Request Payout',
  clientFunnel: 'Client Funnel',
  funnelNote: 'from your referral links',
  subIbPerformance: 'Sub-IB Performance',
  viewAll: 'View all',
  netDeposits: 'Net Deposits',
  commissionEarned: 'Commission Earned',
  client: 'Client',
  activeTraders: 'Active Traders',
  lotsTraded: 'Lots Traded',
  networkFeed: 'Network feed',
} as const;

export const scopeOptions: { value: IbScope; label: string }[] = [
  { value: 'total', label: 'Total' },
  { value: 'network', label: 'Network' },
  { value: 'direct', label: 'Direct' },
];

export const periodOptions: { value: IbPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'mtd', label: 'MTD' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
];

export const ibReferral = {
  link: 'https://app.tenaxcode.com/register?ref=K8JHOF6OCY',
  used: 0,
};

export interface IbSnapshotStat {
  label: string;
  value: string;
  caption?: string;
}

export const ibSnapshot: IbSnapshotStat[] = [
  { label: 'Total Clients', value: '2', caption: '0 new this month' },
  { label: 'Active Traders', value: '0', caption: 'traded this month' },
  { label: 'Sub-IBs', value: '1', caption: '1 direct Sub-IBs' },
  { label: 'Total Deposits', value: '$0.00', caption: '$0.00 net' },
  { label: 'Total Withdrawals', value: '$0.00' },
  { label: 'Client Equity', value: '$9,147.24', caption: 'Current client equity' },
  { label: 'Total Lots', value: '0', caption: '0 trades' },
  { label: 'Earnings this month', value: '$0.00' },
];

export const ibCommissionSummary = {
  totalEarned: 0.75,
  paidOut: 0,
  pending: 0,
  available: 0.75,
};

export const ibFunnel: { label: string; value: number }[] = [
  { label: 'Link clicks', value: 0 },
  { label: 'Unique visitors', value: 0 },
  { label: 'Signed up', value: 0 },
  { label: 'Opened account', value: 0 },
  { label: 'Funded accounts', value: 0 },
];

export interface IbSubIbRow {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  netDeposits: number;
  commissionEarned: number;
  clients: number;
  activeTraders: number;
  lotsTraded: number;
}

export const ibSubIbs: IbSubIbRow[] = [
  { id: 'sib-1', name: 'harry sub ib Ly', status: 'inactive', netDeposits: 0, commissionEarned: 0, clients: 1, activeTraders: 0, lotsTraded: 0 },
];

export interface IbDepositRow {
  id: string;
  name: string;
  account: string;
  status: 'pending' | 'approved';
  amount: number;
  ageDays: number;
}

export interface IbAccountRow {
  id: string;
  name: string;
  account: string;
  ageDays: number;
}

export const ibRecentDeposits: IbDepositRow[] = [
  { id: 'dep-1', name: 'H•••• T•••', account: 'TA#2000001', status: 'pending', amount: 1.04, ageDays: 4 },
  { id: 'dep-2', name: 'H•••• T•••', account: 'TA#2000001', status: 'pending', amount: 1.04, ageDays: 4 },
  { id: 'dep-3', name: 'H•••• T•••', account: 'TA#2000001', status: 'approved', amount: 92086.73, ageDays: 137 },
  { id: 'dep-4', name: 'H•••• T•••', account: 'TA#2000001', status: 'approved', amount: 100, ageDays: 144 },
  { id: 'dep-5', name: 'H•••• T•••', account: 'TA#2000001', status: 'approved', amount: 1000, ageDays: 148 },
];

export const ibNewAccounts: IbAccountRow[] = [
  { id: 'acc-1', name: 'h•••• i•• m•••••', account: 'TA#2000011', ageDays: 5 },
  { id: 'acc-2', name: 'H•••• T•••', account: 'TA#2000010', ageDays: 5 },
  { id: 'acc-3', name: 'H•••• T•••', account: 'TA#2000001', ageDays: 168 },
];

export type IbFeedKey = 'deposits' | 'withdrawals' | 'payouts' | 'accounts' | 'subIbRequests';

// Only the feeds that are empty in the reference carry an empty-state line.
export const ibFeeds: { key: IbFeedKey; title: string; caption: string; empty?: string }[] = [
  { key: 'deposits', title: 'Recent Deposits', caption: 'Pending & Approved' },
  { key: 'withdrawals', title: 'Recent Withdrawals', caption: 'Pending & Approved', empty: 'No withdrawals from your network yet.' },
  { key: 'payouts', title: 'Commission Payouts', caption: 'You & Your Network', empty: 'No payouts taken yet.' },
  { key: 'accounts', title: 'New Trading Accounts', caption: 'Entire Network' },
  { key: 'subIbRequests', title: 'Sub-IB Requests', caption: 'Awaiting Your Approval', empty: 'No pending Sub-IB requests.' },
];
