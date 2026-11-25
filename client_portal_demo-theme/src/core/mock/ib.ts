export interface IbStats {
  currency: string;
  totalClients: number;
  totalDeposited: number;
  totalWithdrawal: number;
  totalAvailableEquity: number;
  marginLevelBelow100: number;
  pendingRequests: number;
  totalLot: number;
  totalRebateGenerated: number;
  totalWithdrawalRebate: number;
  availableRebate: number;
}

export type IbCommissionPeriod = 'thisMonth' | 'lastMonth' | 'thisYear';

export interface IbCommission {
  mine: number;
  subIb: number;
}

export interface IbTradeCommission {
  kind: 'commission';
  id: string;
  side: 'buy' | 'sell';
  symbol: string;
  account: string;
  client: string;
  lotSize: number;
  entry: number;
  exit: number;
  amount: number;
  occurredAt: string;
}

export interface IbNetworkEvent {
  kind: 'appApproved' | 'subIbAdded' | 'newClient';
  id: string;
  detail: string;
  occurredAt: string;
}

export type IbActivity = IbTradeCommission | IbNetworkEvent;

export interface IbDashboard {
  referralLink: string;
  referralVisits: number;
  stats: IbStats;
  commission: Record<IbCommissionPeriod, IbCommission>;
  activity: IbActivity[];
}

export const mockIbDashboard: IbDashboard = {
  referralLink: 'https://dev.tenaxcodecrm.com/referral?sponsorcode=IB_018028',
  referralVisits: 0,
  stats: {
    currency: 'USD',
    totalClients: 2,
    totalDeposited: 3100,
    totalWithdrawal: 220,
    totalAvailableEquity: 1732.41,
    marginLevelBelow100: 1,
    pendingRequests: 0,
    totalLot: 2.03,
    totalRebateGenerated: 15.28,
    totalWithdrawalRebate: 0,
    availableRebate: 15.28,
  },
  commission: {
    thisMonth: { mine: 0, subIb: 0 },
    lastMonth: { mine: 0, subIb: 0 },
    thisYear: { mine: 0, subIb: 0 },
  },
  activity: [
    { kind: 'commission', id: 'c1', side: 'buy', symbol: 'XAUUSD', account: '2000000', client: 'demo test', lotSize: 0.01, entry: 4400.78, exit: 4398.99, amount: 0.08, occurredAt: '2026-08-25T10:00:00Z' },
    { kind: 'commission', id: 'c2', side: 'buy', symbol: 'XAUUSD', account: '2000000', client: 'demo test', lotSize: 0.01, entry: 4116.53, exit: 4116.22, amount: 0.1, occurredAt: '2026-07-28T10:00:00Z' },
    { kind: 'commission', id: 'c3', side: 'sell', symbol: 'XAUUSD', account: '2000000', client: 'demo test', lotSize: 0.01, entry: 4116.22, exit: 4116.48, amount: 0.1, occurredAt: '2026-07-28T09:00:00Z' },
    { kind: 'commission', id: 'c4', side: 'buy', symbol: 'XAUUSD', account: '2000002', client: 'star plus', lotSize: 1, entry: 4069.72, exit: 4068.98, amount: 5, occurredAt: '2026-07-26T10:00:00Z' },
    { kind: 'appApproved', id: 'e1', detail: 'demo test IB application approved', occurredAt: '2026-07-25T10:00:00Z' },
    { kind: 'subIbAdded', id: 'e2', detail: 'demo test became your sub-IB', occurredAt: '2026-07-25T09:00:00Z' },
    { kind: 'commission', id: 'c5', side: 'buy', symbol: 'XAUUSD', account: '2000000', client: 'demo test', lotSize: 1, entry: 4073.94, exit: 4073.35, amount: 10, occurredAt: '2026-07-24T10:00:00Z' },
    { kind: 'newClient', id: 'e3', detail: 'demo test joined your network', occurredAt: '2026-07-24T09:00:00Z' },
  ],
};
