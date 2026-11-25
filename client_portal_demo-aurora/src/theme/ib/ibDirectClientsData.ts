// Content of the IB Manager Portal "My Network" screen (reference screenshot, 2026-11-04), kept verbatim.

export type DirectPeriod = 'today' | '7d' | '30d' | 'mtd' | 'all' | 'custom';

export interface DirectClient {
  id: string;
  name: string;
  email: string;
  isIb: boolean;
  phone: string;
  /** `null` when the client has not opened a trading account yet. */
  tradingAccount: string | null;
  deposits: number;
  withdrawals: number;
  lots: number;
  commission: number;
  equity: number;
  joinedAt: string;
  /** Last closed trade; `null` = never traded. Drives the "Active" count per period. */
  lastTradeAt: string | null;
  lastLogin: string | null;
  lastDeposit: string | null;
  lastWithdrawal: string | null;
  referralSource: string;
  /** True when the client signed up through one of the IB's referral links. */
  cameFromLink: boolean;
  accountStatus: string;
  kyc: string;
}

export const directClientsCopy = {
  title: 'My Network',
  subtitle: (count: number) => `${count} client${count === 1 ? '' : 's'} assigned straight to you`,
  periods: [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: 'mtd', label: 'MTD' },
    { id: 'all', label: 'All' },
    { id: 'custom', label: 'Custom' },
  ] as { id: DirectPeriod; label: string }[],
  customFrom: 'From',
  customTo: 'To',
  tabDirect: 'Direct Clients',
  tabNetwork: 'Network',
  kpiTotal: 'Total Clients',
  kpiTotalHint: 'assigned straight to you',
  kpiActive: 'Active',
  kpiActiveHint: 'traded this period',
  kpiNew: 'New',
  kpiNewHint: 'joined this period',
  kpiCommission: 'Commission Earned',
  kpiCommissionHint: 'from these clients',
  searchPlaceholder: 'Search name, email or phone',
  status: 'Status',
  kyc: 'KYC',
  referralSource: 'Referral Source',
  all: 'All',
  cameFromLink: (count: number, total: number) => `${count} of ${total} came from a link`,
  exportCsv: 'Export CSV',
  columns: {
    serial: '#',
    clientName: 'Client Name',
    phone: 'Phone',
    tradingAccount: 'Trading Account',
    deposits: 'Deposits',
    withdrawals: 'Withdrawals',
    netDeposit: 'Net Deposit',
    lots: 'Lots',
    commission: 'Commission',
    equity: 'Equity',
    lastLogin: 'Last login',
    lastDeposit: 'Last deposit',
    lastWithdrawal: 'Last withdrawal',
    referralSource: 'Referral Source',
    accountStatus: 'Account Status',
    kyc: 'KYC',
  },
  ibTag: 'IB',
  total: 'Total',
  thisPage: 'this page',
  legendNoAccount: 'No trading account yet',
  legendNoActivity: 'Account opened, no activity yet',
  showing: (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
  empty: 'No clients match these filters.',
  previous: 'Previous',
  next: 'Next',
};

export const directClientsCurrency = 'USD';

export const mockDirectClients: DirectClient[] = [
  {
    id: 'DIR-1',
    name: 'harry sub ib Ly',
    email: 'harrysubib@gmail.com',
    isIb: true,
    phone: '+91 9112345678',
    tradingAccount: null,
    deposits: 0,
    withdrawals: 0,
    lots: 0,
    commission: 0,
    equity: 0,
    // The reference shows "New 0" for MTD, so the sign-up predates this month.
    joinedAt: '2026-10-28T00:00:00Z',
    lastTradeAt: null,
    lastLogin: '2026-11-03T00:00:00Z',
    lastDeposit: null,
    lastWithdrawal: null,
    referralSource: 'My referral link',
    cameFromLink: true,
    accountStatus: 'Never Deposited',
    kyc: 'KYC Rejected',
  },
];
