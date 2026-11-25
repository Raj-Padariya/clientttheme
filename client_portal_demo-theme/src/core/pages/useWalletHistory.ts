'use client';

import { useMockQuery } from '../lib/mock';
import { mockWallet, mockWalletTransactions } from '../mock/data';
import type { Transaction, Wallet } from '../types';

export interface WalletHistory {
  wallet: Wallet;
  entries: Transaction[];
}

function loadWalletHistory(): WalletHistory {
  return { wallet: mockWallet, entries: mockWalletTransactions };
}

export function useWalletHistory() {
  return useMockQuery(loadWalletHistory);
}
