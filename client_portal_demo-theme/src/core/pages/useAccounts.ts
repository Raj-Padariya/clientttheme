'use client';

import { useMockQuery } from '../lib/mock';
import { mockAccounts } from '../mock/data';
import type { TradingAccount } from '../types';

function loadAccounts(): TradingAccount[] {
  return mockAccounts;
}

export function useAccounts() {
  return useMockQuery(loadAccounts);
}
