import { formatMoney } from '@/core/format';

export interface MasterPlan {
  id: string;
  name: string;
  master: string;
  activeDays: number;
  risk: number;
  totalGain: number;
  maxDrawdown: number;
  totalPnl: number;
  minInvestment: number;
  isCentAccount: boolean;
  feePercent: number;
  copiers: number;
}

export type OrderDirection = 'BUY' | 'SELL';

export interface MasterOrder {
  id: string;
  symbol: string;
  direction: OrderDirection;
  volume: number;
  /** Kept as strings so prices show exactly as the platform reports them (e.g. 4076.9, 1.12041). */
  openPrice: string;
  closePrice: string;
  pnl: number;
  closedAt: Date;
}

export interface MasterDetail {
  code: string | null;
  totalGainPercent: number;
  totalPnl: number;
  maxDrawdownPercent: number;
  activeCopiers: number;
  equity: number | null;
  commission: string;
  copierLimit: string;
  server: string;
  planStatus: string;
  strategy: string | null;
  riskInfo: string | null;
  /** Newest first, as the orders table lists them. */
  closedOrders: MasterOrder[];
  openOrders: MasterOrder[];
}

export const masterPlans: MasterPlan[] = [
  {
    id: 'ippo-steady-growth',
    name: 'Ippo Steady Growth',
    master: 'IppoMasterPro',
    activeDays: 5,
    risk: 3,
    totalGain: 2.18,
    maxDrawdown: -100,
    totalPnl: 2.18,
    minInvestment: 10,
    isCentAccount: false,
    feePercent: 25,
    copiers: 1,
  },
  {
    id: 'cent-wave',
    name: 'Cent Wave',
    master: 'Cent Wave',
    activeDays: 87,
    risk: 3,
    totalGain: 0.03,
    maxDrawdown: 0,
    totalPnl: 3.13,
    minInvestment: 10,
    isCentAccount: true,
    feePercent: 10,
    copiers: 0,
  },
  {
    id: 'knight-rider',
    name: 'Knight Rider',
    master: 'Knight Rider',
    activeDays: 97,
    risk: 3,
    totalGain: 0,
    maxDrawdown: 0,
    totalPnl: 0,
    minInvestment: 10,
    isCentAccount: false,
    feePercent: 10,
    copiers: 2,
  },
];

export function minInvestmentLabel(plan: MasterPlan): string {
  return plan.isCentAccount ? `¢${plan.minInvestment}` : formatMoney(plan.minInvestment, 'USD');
}

type OrderRow = [symbol: string, direction: OrderDirection, volume: number, openPrice: string, closePrice: string, pnl: number];

/** Closed orders copied from the master detail screenshot, newest first. All closed on Oct 22. */
const ippoClosedRows: OrderRow[] = [
  ['XAUUSD', 'BUY', 0.01, '4015.39', '4015.48', 0.09],
  ['XAUUSD', 'BUY', 0.05, '4076.79', '4077.02', 1.15],
  ['XAUUSD', 'BUY', 0.05, '4076.9', '4077.02', 0.6],
  ['XAUUSD', 'SELL', 0.05, '4076.23', '4075.97', 1.3],
  ['XAUUSD', 'SELL', 0.05, '4076.26', '4076.21', 0.25],
  ['XAUUSD', 'BUY', 0.01, '4082.09', '4083.76', 1.67],
  ['XAGUSD', 'BUY', 0.1, '55.768', '55.75', -0.15],
  ['XAGUSD', 'SELL', 0.01, '55.741', '55.78', -0.04],
  ['EURUSD', 'BUY', 0.01, '1.12041', '1.12036', -0.05],
  ['EURUSD', 'BUY', 0.01, '1.12053', '1.12041', -0.12],
  ['XAUUSD', 'BUY', 0.01, '4091.12', '4091.21', 0.09],
  ['XAUUSD', 'BUY', 0.01, '4091.12', '4091.14', 0.02],
];

// The screenshot only shows the date; times are spread across the session so the chart keeps the right order.
const ippoClosedOrders: MasterOrder[] = ippoClosedRows.map(([symbol, direction, volume, openPrice, closePrice, pnl], index) => ({
  id: `ippo-${index}`,
  symbol,
  direction,
  volume,
  openPrice,
  closePrice,
  pnl,
  closedAt: new Date(2026, 9, 22, 20 - index, 15),
}));

const exactDetails: Partial<Record<string, MasterDetail>> = {
  'ippo-steady-growth': {
    code: 'CT-D11D5',
    totalGainPercent: 4.81,
    totalPnl: 4.81,
    maxDrawdownPercent: -0.36,
    activeCopiers: 1,
    equity: 104.81,
    commission: '25% commission on profit',
    copierLimit: '∞',
    server: 'Tenax',
    planStatus: 'Open',
    strategy: 'Trend following on major forex pairs',
    riskInfo: 'Max drawdown 20 percent leverage 1:100',
    closedOrders: ippoClosedOrders,
    openOrders: [],
  },
};

/** Masters without a detail screenshot fall back to their leaderboard figures and no trade history. */
export function getMasterDetail(plan: MasterPlan): MasterDetail {
  return (
    exactDetails[plan.id] ?? {
      code: null,
      totalGainPercent: plan.totalGain,
      totalPnl: plan.totalPnl,
      maxDrawdownPercent: plan.maxDrawdown,
      activeCopiers: plan.copiers,
      equity: null,
      commission: `${plan.feePercent}% commission on profit`,
      copierLimit: '∞',
      server: 'Tenax',
      planStatus: 'Open',
      strategy: null,
      riskInfo: null,
      closedOrders: [],
      openOrders: [],
    }
  );
}

export const masterDetailCopy = {
  back: 'Back to Explore Masters',
  by: 'by',
  risk: 'RISK',
  active: 'Active',
  subscribeToPlan: 'Subscribe to a plan',
  subscribe: 'Subscribe',
  totalGain: 'Total Gain',
  allTime: 'All Time',
  totalPnl: 'Total P&L',
  realized: 'Realized',
  maxDrawdown: 'Max drawdown',
  riskMetric: 'Risk metric',
  activeCopiers: 'Active Copiers',
  currentlyLive: 'Currently live',
  masterEquity: 'Master equity',
  current: 'Current',
  minInvestment: 'Min Investment',
  entryCapital: 'Entry capital',
  performance: 'Performance',
  performanceNote: "From the master's own closed trades on their MT account — not copier mirrors.",
  cumulative: 'Cumulative master P&L',
  tradePnl: 'Trade P&L',
  perTrade: 'Per trade',
  noTrades: 'No closed trades in this period.',
  availablePlans: (count: number) => `Available plans (${count})`,
  plan: 'Plan',
  commission: 'Commission',
  minCapital: 'Min capital',
  copiers: 'Copiers',
  server: 'Server',
  status: 'Status',
  orders: 'Orders',
  closed: (count: number) => `Closed (${count})`,
  open: (count: number) => `Open (${count})`,
  symbol: 'Symbol',
  direction: 'Direction',
  volume: 'Volume (lot)',
  openPrice: 'Open price',
  closePrice: 'Close price',
  pnl: 'P&L',
  noOrders: 'No orders to show.',
  disclosure: 'Strategy & risk disclosure',
  strategy: 'Strategy',
  riskInformation: 'Risk information',
  winRate: 'Win rate',
  bestTrade: 'Best trade',
  wins: 'wins',
  losses: 'losses',
  notFound: 'Master not found',
  notFoundHint: 'This master is no longer listed on Explore Masters.',
  replay: 'Replay',
  allSymbols: 'All',
  tradeDna: 'Trade DNA',
  worstTrade: 'Worst trade',
  buySell: 'Buy / Sell',
  symbolMix: 'Symbol mix',

  highWater: 'High-water mark',
  chartNet: 'Net',
  chartPeak: 'Peak',
  chartTrough: 'Trough',
  chartTrades: 'Trades',
  bestStreak: 'Best streak',
};
