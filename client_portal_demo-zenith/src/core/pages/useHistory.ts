'use client';

import { useMockQuery } from '../lib/mock';
import { mockTransactions } from '../mock/data';
import type { Transaction } from '../types';

function loadHistory(): Transaction[] {
  return mockTransactions;
}

export function useHistory() {
  return useMockQuery(loadHistory);
}
