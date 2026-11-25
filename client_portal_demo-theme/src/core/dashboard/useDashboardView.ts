'use client';

import { brandConfig } from '../broker/config';
import { useMockQuery } from '../lib/mock';
import {
  mockAccounts,
  mockBalanceHistory,
  mockDashboardStats,
  mockMonthlyFlows,
  mockTransactions,
  mockWallet,
  mockYearlyFlows,
} from '../mock/data';
import type { DashboardStats, FundsFlowPeriod, TradingAccount, Transaction, Wallet } from '../types';

const RECENT_TRANSACTIONS_LIMIT = 5;

export interface DashboardView {
  wallet: Wallet;
  stats: DashboardStats;
  /** Daily total balance, oldest first. */
  balanceHistory: number[];
  /** Oldest first; the last entry is the current month / year. */
  monthlyFlows: FundsFlowPeriod[];
  yearlyFlows: FundsFlowPeriod[];
  liveAccounts: TradingAccount[];
  recentTransactions: Transaction[];
}

function loadDashboard(): DashboardView {
  return {
    wallet: mockWallet,
    stats: mockDashboardStats,
    balanceHistory: mockBalanceHistory,
    monthlyFlows: mockMonthlyFlows,
    yearlyFlows: mockYearlyFlows,
    liveAccounts: mockAccounts.filter((account) => account.type === 'live'),
    recentTransactions: mockTransactions.slice(0, RECENT_TRANSACTIONS_LIMIT),
  };
}

export function useDashboardView() {
  const { data, isLoading, isFetching, refetch } = useMockQuery(loadDashboard);
  return { data, isLoading, isFetching, refetch, flags: brandConfig.dashboard };
}
