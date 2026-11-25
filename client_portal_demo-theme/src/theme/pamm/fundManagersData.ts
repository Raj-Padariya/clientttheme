import type { InvestPlanOption } from './InvestNowModal';

export interface FundPlan {
  id: string;
  name: string;
  manager: string;
  activeDays: number;
  risk: number;
  totalGain: number;
  maxDrawdown: number;
  totalPnl: number;
  minInvestment: number;
  feePercent: number;
  investors: number;
  /** Name the Invest Now popup and detail page use for this strategy (differs from the card title in the reference). */
  investPlanName: string;
}

export const fundPlans: FundPlan[] = [
  {
    id: 'full-trading-strategy',
    name: 'FULL TRADING STRATEGY',
    manager: 'Test One',
    activeDays: 98,
    risk: 2,
    totalGain: 0.06,
    maxDrawdown: -0.03,
    totalPnl: 121.63,
    minInvestment: 10,
    feePercent: 10,
    investors: 3,
    investPlanName: 'FULL TRADING SETUP',
  },
];

export const investPlanOptions: InvestPlanOption[] = fundPlans.map((plan) => ({
  id: plan.id,
  name: plan.investPlanName,
  commissionPercent: plan.feePercent,
  minInvestment: plan.minInvestment,
}));

export interface FundTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  pnl: number;
  time: Date;
  durationMinutes: number;
}

export interface FundDetail {
  planName: string;
  manager: string;
  memberSince: string;
  risk: number;
  minInvestment: number;
  avgGain: number;
  totalPnl: number;
  totalAum: number;
  investors: number;
  commissionPercent: number;
  floatingProfit: number;
  maxDrawdown: number;
  strategy: string;
  /** Newest first, as the reference lists them. */
  trades: FundTrade[];
}

const fundDetails: Record<string, FundDetail> = {
  'full-trading-strategy': {
    planName: 'FULL TRADING SETUP',
    manager: 'Test One',
    memberSince: '2026-07-22',
    risk: 1,
    minInvestment: 10,
    avgGain: 0.61,
    totalPnl: 1_200,
    totalAum: 202_200,
    investors: 3,
    commissionPercent: 10,
    floatingProfit: 0,
    maxDrawdown: -640,
    strategy: 'VERY RISKY',
    trades: [
      { id: 't3', symbol: 'XAUUSD', type: 'SELL', pnl: 1_130, time: new Date(2026, 6, 22, 13, 40, 45), durationMinutes: 0 },
      { id: 't2', symbol: 'XAUUSD', type: 'BUY', pnl: -640, time: new Date(2026, 6, 22, 13, 37, 8), durationMinutes: 0 },
      { id: 't1', symbol: 'XAUUSD', type: 'SELL', pnl: 750, time: new Date(2026, 6, 22, 12, 42, 10), durationMinutes: 0 },
    ],
  },
};

export function getFundDetail(planId: string): FundDetail | null {
  return fundDetails[planId] ?? null;
}

export const fundDetailText = {
  back: 'Explore Fund Managers',
  by: 'by',
  fundManager: 'FUND MANAGER',
  memberSince: (date: string) => `Member since ${date}`,
  risk: 'RISK',
  investNow: 'INVEST NOW',
  minInvestment: (amount: string) => `MIN INVESTMENT: ${amount}`,
  minInvestmentLabel: 'MIN INVESTMENT',
  avgGain: 'AVG GAIN',
  totalPnl: 'TOTAL P&L',
  totalAum: 'TOTAL AUM',
  investors: 'INVESTORS',
  commission: 'COMMISSION',
  floatingProfit: 'FLOATING PROFIT',
  maxDrawdown: 'MAX DRAWDOWN',
  strategyDescription: 'STRATEGY DESCRIPTION',
  performanceOverview: 'Performance Overview',
  start: 'Start',
  recentTrades: 'Recent Trades',
  tradeCount: (count: number) => `${count} Trades`,
  symbol: 'Symbol',
  type: 'Type',
  pnl: 'P&L',
  time: 'Time',
  duration: 'Duration',
  equity: 'Equity',
  noTrades: 'No trades in this period.',
  notFound: 'Fund manager not found',
  notFoundHint: 'This strategy is no longer listed on Explore Fund Managers.',
};
